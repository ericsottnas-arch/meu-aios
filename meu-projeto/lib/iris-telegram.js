// meu-projeto/lib/iris-telegram.js
// Modulo Telegram dedicado da Iris - Bot proprio para aprovacoes de prospeccao

const IRIS_BOT_TOKEN = process.env.IRIS_BOT_TOKEN?.replace(/"/g, '');

async function callTelegramAPI(method, body) {
  if (!IRIS_BOT_TOKEN) {
    console.error('IRIS_BOT_TOKEN nao configurado');
    return { ok: false, description: 'Token nao configurado' };
  }

  const url = `https://api.telegram.org/bot${IRIS_BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`Iris Telegram API ${method} error:`, data.description);
  }
  return data;
}

function sendMessage(chatId, text, options = {}) {
  return callTelegramAPI('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: options.parseMode || undefined,
    reply_markup: options.replyMarkup || undefined,
  });
}

function sendInlineKeyboard(chatId, text, buttons) {
  return sendMessage(chatId, text, {
    replyMarkup: { inline_keyboard: buttons },
  });
}

function answerCallbackQuery(callbackQueryId, text) {
  return callTelegramAPI('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text || undefined,
  });
}

function editMessageText(chatId, messageId, text, options = {}) {
  return callTelegramAPI('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: options.replyMarkup || undefined,
  });
}

/**
 * Envia pedido de aprovacao com preview dos chunks
 * @param {string} chatId - Chat ID do Eric
 * @param {object} params
 * @param {number} params.approvalId - ID da aprovacao no DB
 * @param {string} params.contactName - Nome do lead
 * @param {string} params.stage - Etapa atual
 * @param {string[]} params.chunks - Mensagens a enviar
 * @param {string} params.lastMessage - Ultima mensagem do lead
 * @param {string} params.conversationId - ID da conversa GHL
 * @returns {Promise<object>} Resposta do Telegram
 */
async function sendApprovalRequest(chatId, { approvalId, contactName, stage, chunks, lastMessage, conversationId, extraInfo }) {
  const stageEmoji = {
    aquecimento: '1️⃣',
    qualificacao: '2️⃣',
    rapport: '3️⃣',
    proposta_reuniao: '4️⃣',
    agendamento: '5️⃣',
    followup: '🔄',
    objecoes: '⚡',
  };

  const stageLabel = {
    aquecimento: 'AQUECIMENTO',
    qualificacao: 'QUALIFICACAO',
    rapport: 'RAPPORT',
    proposta_reuniao: 'PROPOSTA REUNIAO',
    agendamento: 'AGENDAMENTO',
    followup: 'FOLLOWUP',
    objecoes: 'OBJECOES',
  };

  const emoji = stageEmoji[stage] || '📩';
  const label = stageLabel[stage] || stage.toUpperCase();
  const chunksPreview = chunks.map((c, i) => `  ${i + 1}. "${c}"`).join('\n');

  let text = `${emoji} IRIS - Aprovar mensagem\n\n` +
    `Lead: ${contactName}\n` +
    `Etapa: ${label}\n`;

  if (extraInfo) {
    text += `${extraInfo}\n`;
  }

  text += `\n`;

  if (lastMessage) {
    text += `Ela disse: "${lastMessage.substring(0, 150)}"\n\n`;
  }

  text += `Resposta como Eric:\n${chunksPreview}`;

  const keyboard = [
    [
      { text: '✅ Aprovar', callback_data: `iris:approve:${approvalId}` },
      { text: '✏️ Editar', callback_data: `iris:edit:${approvalId}` },
      { text: '❌ Rejeitar', callback_data: `iris:reject:${approvalId}` },
    ],
    [
      { text: '🚫 Desqualificar Lead', callback_data: `iris:disqualify:${approvalId}` },
    ],
  ];

  return sendInlineKeyboard(chatId, text, keyboard);
}

/**
 * Atualiza mensagem de aprovacao apos acao do Eric
 */
async function updateApprovalMessage(chatId, messageId, status, contactName) {
  const statusText = {
    approved: '✅ APROVADO',
    rejected: '❌ REJEITADO',
    editing: '✏️ EDITANDO - Envie o texto editado',
    sent: '📤 ENVIADO',
  };

  const text = `${statusText[status] || status}\n\nLead: ${contactName}`;
  return editMessageText(chatId, messageId, text);
}

// Polling para receber updates (usado no iris-server.js)
let pollingOffset = 0;

async function getUpdates(timeout = 30) {
  const data = await callTelegramAPI('getUpdates', {
    offset: pollingOffset,
    timeout,
    allowed_updates: ['message', 'callback_query'],
  });

  if (data.ok && data.result && data.result.length > 0) {
    pollingOffset = data.result[data.result.length - 1].update_id + 1;
  }

  return data.ok ? data.result || [] : [];
}

function deleteWebhook() {
  return callTelegramAPI('deleteWebhook', { drop_pending_updates: true });
}

function getMe() {
  return callTelegramAPI('getMe', {});
}

module.exports = {
  sendMessage,
  sendInlineKeyboard,
  answerCallbackQuery,
  editMessageText,
  sendApprovalRequest,
  updateApprovalMessage,
  getUpdates,
  deleteWebhook,
  getMe,
};
