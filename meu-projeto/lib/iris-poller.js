// meu-projeto/lib/iris-poller.js
// Polling de novas mensagens do GHL para a Iris
// Substitui webhooks: consulta GHL a cada 15s por novas mensagens inbound

const ghlAPI = require('./ghl-api');
const irisDB = require('./iris-db');
const irisTranscriber = require('./iris-transcriber');

const POLL_INTERVAL = 15000; // 15 segundos

let lastPollTimestamp = Date.now();
let pollingActive = false;
let onMessageCallback = null;

/**
 * Inicia polling do GHL
 * @param {Function} onMessage - Callback chamado para cada nova mensagem inbound
 *   Recebe: (message, conversation) onde message tem: conversationId, contactId, body, type, from, timestamp
 */
function startPolling(onMessage) {
  onMessageCallback = onMessage;
  pollingActive = true;
  lastPollTimestamp = Date.now();
  console.log('🔄 Iris Poller: iniciado (intervalo: ' + (POLL_INTERVAL / 1000) + 's)');

  // Varredura inicial: buscar mensagens inbound não respondidas (catch-up após restart)
  catchUpUnresponded().then(() => {
    poll();
  });
}

function stopPolling() {
  pollingActive = false;
  console.log('🔄 Iris Poller: parado');
}

async function poll() {
  while (pollingActive) {
    try {
      const result = await ghlAPI.getRecentInboundConversations(lastPollTimestamp - 60000); // 1min de margem

      if (result.success && result.data.length > 0) {
        for (const conv of result.data) {
          try {
            await processConversation(conv);
          } catch (err) {
            console.error('🔄 Iris Poller: erro ao processar conversa:', err.message);
          }
        }
      }

      lastPollTimestamp = Date.now();
    } catch (err) {
      console.error('🔄 Iris Poller: erro no ciclo:', err.message);
    }

    // Esperar antes do proximo ciclo
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
}

// Set para rastrear mensagens ja processadas (evitar duplicatas)
const processedMessages = new Set();
const MAX_PROCESSED_CACHE = 5000;

async function processConversation(conv) {
  const conversationId = conv.id;
  const contactId = conv.contactId;
  const contactName = conv.contactName || conv.fullName || 'Desconhecido';

  // Buscar ultima mensagem da conversa
  const msgResult = await ghlAPI.getConversationMessages(conversationId, { limit: 3 });
  if (!msgResult.success || msgResult.data.length === 0) return;

  // Pegar a mensagem mais recente que e inbound (texto OU audio)
  const recentInbound = msgResult.data.find(
    (m) => m.direction === 'inbound' && (
      (m.body && m.body.trim().length > 0) ||
      irisTranscriber.extractAudioUrl(m)
    )
  );

  if (!recentInbound) return;

  // Verificar se ja processamos essa mensagem
  const msgId = recentInbound.id;
  if (processedMessages.has(msgId)) return;

  // Marca como processada ANTES, mas remove se der erro (ver catch abaixo)
  processedMessages.add(msgId);

  // Limpar cache se muito grande
  if (processedMessages.size > MAX_PROCESSED_CACHE) {
    const arr = Array.from(processedMessages);
    processedMessages.clear();
    arr.slice(-1000).forEach((id) => processedMessages.add(id));
  }

  // Se for audio, transcrever antes de processar
  let messageBody = recentInbound.body || '';
  let isAudio = false;
  const audioUrl = irisTranscriber.extractAudioUrl(recentInbound);

  if (audioUrl && !messageBody.trim()) {
    isAudio = true;
    console.log(`🔄 Iris Poller: audio detectado de ${contactName}, transcrevendo...`);
    const transcription = await irisTranscriber.transcribeFromUrl(audioUrl);
    if (transcription.success && transcription.text) {
      messageBody = transcription.text;
      console.log(`🔄 Iris Poller: audio transcrito de ${contactName}: "${messageBody.substring(0, 80)}..."`);
    } else {
      console.log(`🔄 Iris Poller: falha na transcricao de audio de ${contactName}`);
      return; // Nao processar se nao conseguiu transcrever
    }
  }

  console.log(`🔄 Iris Poller: nova mensagem de ${contactName}: "${messageBody.substring(0, 50)}..."${isAudio ? ' [AUDIO]' : ''}`);

  // Chamar callback
  if (onMessageCallback) {
    const message = {
      id: msgId,
      conversationId,
      contactId,
      body: messageBody,
      type: 'inbound',
      from: contactName,
      to: 'byericsantos',
      timestamp: recentInbound.dateAdded ? new Date(recentInbound.dateAdded).getTime() / 1000 : Date.now() / 1000,
      messageType: recentInbound.messageType || recentInbound.type || 'TYPE_INSTAGRAM',
      isAudio,
      audioUrl: audioUrl || null,
    };

    const conversation = {
      conversation_id: conversationId,
      contact_id: contactId,
      contact_name: contactName,
      type: conv.type,
    };

    try {
      await onMessageCallback(message, conversation);
    } catch (callbackErr) {
      // Se o processamento falhou (ex: Groq 429), remove do Set pra tentar de novo
      if (callbackErr.message && callbackErr.message.includes('429')) {
        processedMessages.delete(msgId);
        console.warn(`🔄 Iris Poller: rate limit, vai re-tentar ${contactName} no proximo ciclo`);
      }
      throw callbackErr;
    }
  }
}

/**
 * Varredura catch-up: busca conversas com última mensagem inbound que ficaram sem resposta.
 * Roda uma vez ao iniciar o poller para cobrir mensagens perdidas durante downtime/restart.
 */
async function catchUpUnresponded() {
  try {
    console.log('🔄 Iris Poller: catch-up — buscando mensagens não respondidas...');
    const result = await ghlAPI.getConversations({
      limit: 50,
      sortBy: 'last_message_date',
      sortOrder: 'desc',
    });

    if (!result.success || !result.data) {
      console.log('🔄 Iris Poller: catch-up — falha ao buscar conversas');
      return;
    }

    // Filtrar: apenas Instagram com última mensagem inbound
    const unresponded = result.data.filter((c) => {
      const msgType = (c.lastMessageType || '').toUpperCase();
      const convType = (c.type || '').toUpperCase();
      const isIG = convType.includes('INSTAGRAM') || msgType.includes('INSTAGRAM');
      return isIG && c.lastMessageDirection === 'inbound';
    });

    if (unresponded.length === 0) {
      console.log('🔄 Iris Poller: catch-up — nenhuma mensagem pendente');
      return;
    }

    console.log(`🔄 Iris Poller: catch-up — ${unresponded.length} conversas com inbound pendente`);

    for (const conv of unresponded) {
      try {
        await processConversation(conv);
      } catch (err) {
        console.error('🔄 Iris Poller: catch-up erro:', (conv.contactName || '?'), err.message);
      }
    }

    console.log('🔄 Iris Poller: catch-up concluído');
  } catch (err) {
    console.error('🔄 Iris Poller: catch-up erro geral:', err.message);
  }
}

module.exports = {
  startPolling,
  stopPolling,
};
