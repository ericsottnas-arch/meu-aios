// meu-projeto/telegram-webhook-server.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Em produção (Railway), usa env vars do sistema
// Em dev local, tenta .env local e depois .env no diretório pai
if (process.env.NODE_ENV !== 'production') {
  const localEnv = path.resolve(__dirname, '.env');
  const parentEnv = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(localEnv)) {
    require('dotenv').config({ path: localEnv });
  } else if (fs.existsSync(parentEnv)) {
    require('dotenv').config({ path: parentEnv });
  } else {
    require('dotenv').config();
  }
}

const app = express();
const port = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.replace(/"/g, '');
const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const ALLOWED_CHAT_IDS = process.env.TELEGRAM_ALLOWED_CHAT_IDS
  ? process.env.TELEGRAM_ALLOWED_CHAT_IDS.split(',').map(id => id.trim())
  : [];
// Clientes carregados do campo personalizado do ClickUp (preenchido no boot)
let CLIENT_OPTIONS = [];

if (!TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is not set');
  process.exit(1);
}

if (!GROQ_API_KEY) {
  console.error('GROQ_API_KEY is not set — needed for audio transcription');
  process.exit(1);
}

if (!WEBHOOK_SECRET) {
  console.warn('⚠️  TELEGRAM_WEBHOOK_SECRET not set — webhook requests will NOT be verified (dev mode)');
}

if (ALLOWED_CHAT_IDS.length === 0) {
  console.warn('⚠️  TELEGRAM_ALLOWED_CHAT_IDS not set — accepting messages from ALL chats');
}

app.use(bodyParser.json());

// Módulos
const { logTaskCreation } = require('./lib/supabase');
const { analyzeTask } = require('./lib/ai-analyzer');
const conversation = require('./lib/conversation');
const telegram = require('./lib/telegram');
const clickup = require('./lib/clickup');


// ============================================================
// Health check
// ============================================================
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'telegram-clickup-bot',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Security middlewares
// ============================================================
function verifyWebhookSecret(req, res, next) {
  if (!WEBHOOK_SECRET) return next();
  const token = req.headers['x-telegram-bot-api-secret-token'];
  if (token !== WEBHOOK_SECRET) {
    console.warn(`🚫 Rejected webhook — invalid secret from ${req.ip}`);
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

function verifyChatId(req, res, next) {
  if (ALLOWED_CHAT_IDS.length === 0) return next();
  // Callback queries e messages têm chat ID em locais diferentes
  const chatId = (
    req.body?.message?.chat?.id ||
    req.body?.callback_query?.message?.chat?.id
  )?.toString();
  if (!chatId || !ALLOWED_CHAT_IDS.includes(chatId)) {
    console.warn(`🚫 Rejected from unauthorized chat: ${chatId}`);
    return res.status(200).send('OK');
  }
  next();
}

// ============================================================
// Telegram file & audio helpers
// ============================================================
async function downloadTelegramFile(fileId) {
  const fileInfoUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
  const fileInfoRes = await fetch(fileInfoUrl);
  const fileInfo = await fileInfoRes.json();
  if (!fileInfo.ok) throw new Error(`Failed to get file info: ${fileInfo.description}`);

  const filePath = fileInfo.result.file_path;
  const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) throw new Error(`Failed to download file: ${fileRes.statusText}`);

  return Buffer.from(await fileRes.arrayBuffer());
}

async function transcribeAudio(audioBuffer, fileName) {
  const blob = new Blob([audioBuffer], { type: 'audio/ogg' });
  const formData = new FormData();
  formData.append('file', blob, fileName || 'audio.ogg');
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'pt');
  formData.append('response_format', 'text');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errorText}`);
  }

  return (await response.text()).trim();
}

// ============================================================
// Fluxo interativo de criação de tarefas
// ============================================================

/**
 * Inicia o fluxo: analisa mensagem com AI e pergunta prioridade.
 * @param {number} chatId
 * @param {string} text
 * @param {string} messageType - 'text'|'voice'|'photo'|'document'|'video'
 * @param {Object} [extra] - { voiceMetadata, attachments }
 */
async function startTaskFlow(chatId, text, messageType, extra = {}) {
  try {
    telegram.sendMessage(chatId, '🧠 Analisando sua mensagem...');

    const clientNames = CLIENT_OPTIONS.map(c => c.name);
    const analysis = await analyzeTask(text, clientNames);
    conversation.startConversation(chatId, {
      analysis,
      originalText: text,
      messageType,
      voiceMetadata: extra.voiceMetadata || null,
      attachments: extra.attachments || [],
    });

    // Mostra o que a AI entendeu
    let summary = `📋 *Entendi a tarefa:*\n\n`;
    summary += `📌 *Título:* ${analysis.title}\n`;
    summary += `📝 *Descrição:* ${analysis.description.substring(0, 200)}${analysis.description.length > 200 ? '...' : ''}\n`;
    if (analysis.subtasks.length > 0) {
      summary += `\n📎 *Subtarefas sugeridas:*\n`;
      analysis.subtasks.forEach((s, i) => { summary += `  ${i + 1}. ${s}\n`; });
    }
    summary += `\n🎯 *Prioridade sugerida:* ${telegram.PRIORITY_LABELS[priorityFromString(analysis.suggested_priority)] || '🟡 Normal'}`;

    await telegram.sendMessage(chatId, summary);

    // Pergunta prioridade
    await telegram.sendInlineKeyboard(
      chatId,
      '⚡ Qual a prioridade desta tarefa?',
      telegram.priorityKeyboard()
    );
  } catch (err) {
    console.error('Error starting task flow:', err);
    telegram.sendMessage(chatId, `❌ Erro ao analisar mensagem: ${err.message}`);
  }
}

/**
 * Pergunta o cliente ou auto-preenche se a AI detectou.
 */
async function askClient(chatId) {
  const state = conversation.getConversation(chatId);

  // Verifica se a AI detectou um cliente
  if (state?.analysis?.detected_client) {
    const detected = state.analysis.detected_client;
    const match = CLIENT_OPTIONS.find(
      (c) => c.name.toLowerCase() === detected.toLowerCase()
    );
    if (match) {
      // Auto-preenche e avança
      conversation.updateConversation(chatId, {
        client: match.name,
        clientOptionId: match.id,
        step: 'awaiting_date',
      });
      await telegram.sendMessage(chatId, `🏢 Cliente detectado: ${match.name}`);
      await askDate(chatId);
      return;
    }
  }

  // Sem detecção — mostra lista do ClickUp
  if (CLIENT_OPTIONS.length > 0) {
    await telegram.sendInlineKeyboard(
      chatId,
      '🏢 Qual o cliente?',
      telegram.clientKeyboard(CLIENT_OPTIONS)
    );
  } else {
    conversation.updateConversation(chatId, { step: 'awaiting_client' });
    await telegram.sendMessage(chatId, '🏢 Qual o cliente? (digite o nome)');
  }
}

/**
 * Pergunta a data de entrega.
 */
async function askDate(chatId) {
  await telegram.sendInlineKeyboard(
    chatId,
    '📅 Qual a data de entrega?',
    telegram.dateKeyboard()
  );
}

/**
 * Pergunta o responsável.
 */
async function askAssignee(chatId) {
  const members = await clickup.getTeamMembers();
  if (members.length > 0) {
    await telegram.sendInlineKeyboard(
      chatId,
      '👤 Quem é o responsável?',
      telegram.assigneeKeyboard(members)
    );
  } else {
    // Sem membros — pula para criação
    conversation.updateConversation(chatId, { step: 'creating' });
    await finalizeTask(chatId);
  }
}

/**
 * Cria a tarefa final no ClickUp com todos os dados coletados.
 */
async function finalizeTask(chatId) {
  const state = conversation.getConversation(chatId);
  if (!state) return;

  try {
    telegram.sendMessage(chatId, '⏳ Criando tarefa no ClickUp...');

    // Monta descrição enriquecida
    let fullDescription = state.analysis.description;
    if (state.messageType === 'voice') {
      fullDescription = `🎤 *Transcrito de áudio do Telegram*\n\n${state.originalText}\n\n---\n${state.analysis.description}`;
    }
    if (state.client) {
      fullDescription += `\n\n🏢 Cliente: ${state.client}`;
    }

    // Custom fields: campo "Cliente" com o option ID
    const customFields = [];
    if (state.clientOptionId) {
      customFields.push({
        id: clickup.CLIENT_FIELD_ID,
        value: state.clientOptionId,
      });
    }

    // Cria a task principal
    const result = await clickup.createTask({
      title: state.analysis.title,
      description: fullDescription,
      priority: state.priority,
      dueDateMs: state.dueDateMs,
      assignees: state.assigneeId ? [Number(state.assigneeId)] : [],
      customFields,
    });

    const taskTitle = state.analysis.title;

    // Cria subtasks se houver
    let subtaskInfo = '';
    if (state.analysis.subtasks.length > 0) {
      const subtasks = await clickup.createSubtasks(result.id, state.analysis.subtasks);
      if (subtasks.length > 0) {
        subtaskInfo = `\n📎 ${subtasks.length} subtarefa(s) criada(s)`;
      }
    }

    // Upload de anexos (fotos, documentos, vídeos)
    let attachmentInfo = '';
    if (state.attachments.length > 0) {
      let uploaded = 0;
      for (const att of state.attachments) {
        try {
          const buffer = await downloadTelegramFile(att.file_id);
          const fileName = att.file_name || `${att.type}_${Date.now()}.${att.type === 'photo' ? 'jpg' : 'bin'}`;
          const uploadResult = await clickup.uploadAttachment(result.id, fileName, buffer);
          if (uploadResult) uploaded++;
        } catch (err) {
          console.warn(`⚠️  Falha ao anexar ${att.type}:`, err.message);
        }
      }
      if (uploaded > 0) {
        attachmentInfo = `\n📎 ${uploaded} anexo(s) incluído(s)`;
      }
    }

    // Monta mensagem de confirmação
    let msg = `✅ Tarefa criada com sucesso!\n\n`;
    msg += `📌 ${taskTitle}\n`;
    msg += `⚡ Prioridade: ${telegram.PRIORITY_LABELS[state.priority] || 'Normal'}\n`;
    if (state.client) msg += `🏢 Cliente: ${state.client}\n`;
    if (state.dueDate) msg += `📅 Prazo: ${state.dueDate}\n`;
    if (state.assigneeName) msg += `👤 Responsável: ${state.assigneeName}\n`;
    msg += subtaskInfo;
    msg += attachmentInfo;
    msg += `\n\n🔗 ${result.url}`;

    await telegram.sendMessage(chatId, msg);

    // Log no Supabase
    await logTaskCreation({
      telegram_chat_id: String(chatId),
      message_type: state.messageType,
      original_text: state.originalText,
      task_title: taskTitle,
      clickup_task_id: result.id,
      clickup_task_url: result.url,
      status: 'success',
      metadata: {
        priority: state.priority,
        client: state.client,
        due_date: state.dueDate,
        assignee: state.assigneeName,
        subtasks_count: state.analysis.subtasks.length,
        ...(state.voiceMetadata || {}),
      },
    });

    console.log(`✅ Task created: ${taskTitle} → ${result.url}`);
  } catch (err) {
    console.error('Error creating task:', err);
    telegram.sendMessage(chatId, `❌ Erro ao criar tarefa: ${err.message}`);

    await logTaskCreation({
      telegram_chat_id: String(chatId),
      message_type: state.messageType,
      original_text: state.originalText,
      task_title: state.analysis.title,
      status: 'error',
      error_message: err.message,
    });
  } finally {
    conversation.endConversation(chatId);
  }
}

// ============================================================
// Callback query handler (botões inline)
// ============================================================
async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const queryId = callbackQuery.id;

  const state = conversation.getConversation(chatId);
  if (!state) {
    await telegram.answerCallbackQuery(queryId, 'Sessão expirada. Envie a tarefa novamente.');
    return;
  }

  // Parse do callback_data: "type:value" ou "type:value:extra"
  const [type, ...valueParts] = data.split(':');
  const value = valueParts.join(':');

  switch (type) {
    case 'priority': {
      const priority = parseInt(value, 10);
      conversation.updateConversation(chatId, { priority, step: 'awaiting_client' });
      await telegram.answerCallbackQuery(queryId, telegram.PRIORITY_LABELS[priority]);
      await telegram.editMessageText(chatId, callbackQuery.message.message_id,
        `⚡ Prioridade: ${telegram.PRIORITY_LABELS[priority]}`);
      await askClient(chatId);
      break;
    }

    case 'client': {
      // callback_data format: client:{optionId}:{name}
      const [optionId, ...clientNameParts] = value.split(':');
      const clientName = clientNameParts.join(':');
      if (optionId === '__custom__') {
        await telegram.answerCallbackQuery(queryId);
        await telegram.editMessageText(chatId, callbackQuery.message.message_id,
          '🏢 Digite o nome do cliente:');
        // step permanece 'awaiting_client' — próximo texto será o nome do cliente
      } else {
        conversation.updateConversation(chatId, {
          client: clientName,
          clientOptionId: optionId,
          step: 'awaiting_date',
        });
        await telegram.answerCallbackQuery(queryId, clientName);
        await telegram.editMessageText(chatId, callbackQuery.message.message_id,
          `🏢 Cliente: ${clientName}`);
        await askDate(chatId);
      }
      break;
    }

    case 'date': {
      if (value === '__custom__') {
        await telegram.answerCallbackQuery(queryId);
        await telegram.editMessageText(chatId, callbackQuery.message.message_id,
          '📅 Digite a data (DD/MM/AAAA ou DD/MM):');
        // step permanece 'awaiting_date'
      } else if (value === '__none__') {
        conversation.updateConversation(chatId, { dueDate: null, dueDateMs: null, step: 'awaiting_assignee' });
        await telegram.answerCallbackQuery(queryId, 'Sem prazo');
        await telegram.editMessageText(chatId, callbackQuery.message.message_id,
          '📅 Prazo: Sem prazo definido');
        await askAssignee(chatId);
      } else {
        // value = YYYY-MM-DD
        const date = new Date(value + 'T23:59:59');
        const formatted = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        conversation.updateConversation(chatId, {
          dueDate: formatted,
          dueDateMs: date.getTime(),
          step: 'awaiting_assignee',
        });
        await telegram.answerCallbackQuery(queryId, formatted);
        await telegram.editMessageText(chatId, callbackQuery.message.message_id,
          `📅 Prazo: ${formatted}`);
        await askAssignee(chatId);
      }
      break;
    }

    case 'assignee': {
      const [assigneeId, ...nameParts] = value.split(':');
      const assigneeName = nameParts.join(':');
      if (assigneeId === '__none__') {
        conversation.updateConversation(chatId, { assigneeId: null, assigneeName: null, step: 'creating' });
        await telegram.answerCallbackQuery(queryId, 'Sem responsável');
        await telegram.editMessageText(chatId, callbackQuery.message.message_id,
          '👤 Responsável: Não atribuído');
      } else {
        conversation.updateConversation(chatId, { assigneeId, assigneeName, step: 'creating' });
        await telegram.answerCallbackQuery(queryId, assigneeName);
        await telegram.editMessageText(chatId, callbackQuery.message.message_id,
          `👤 Responsável: ${assigneeName}`);
      }
      await finalizeTask(chatId);
      break;
    }

    default:
      await telegram.answerCallbackQuery(queryId, 'Opção não reconhecida');
  }
}

// ============================================================
// Text input handler durante conversa ativa
// ============================================================
async function handleTextDuringConversation(chatId, text, state) {
  switch (state.step) {
    case 'awaiting_description': {
      // Usuário mandou foto/doc/vídeo sem legenda — agora descreveu a tarefa
      const attachmentLabel = state.attachments.map(a => {
        if (a.type === 'photo') return '[Foto anexada]';
        if (a.type === 'document') return `[Documento "${a.file_name}" anexado]`;
        if (a.type === 'video') return '[Vídeo anexado]';
        return '[Anexo]';
      }).join(' ');
      const textForAI = `${attachmentLabel} ${text}`;

      // Destrói a conversa parcial e inicia o fluxo completo mantendo anexos
      const attachments = [...state.attachments];
      conversation.endConversation(chatId);
      await startTaskFlow(chatId, textForAI, state.messageType, { attachments });
      break;
    }
    case 'awaiting_client': {
      const typed = text.trim();
      // Tenta match parcial com as opções do ClickUp
      const match = CLIENT_OPTIONS.find(
        (c) => c.name.toLowerCase().includes(typed.toLowerCase())
          || typed.toLowerCase().includes(c.name.toLowerCase().split(' ').pop())
      );
      if (match) {
        conversation.updateConversation(chatId, {
          client: match.name,
          clientOptionId: match.id,
          step: 'awaiting_date',
        });
        await telegram.sendMessage(chatId, `🏢 Cliente: ${match.name}`);
      } else {
        conversation.updateConversation(chatId, { client: typed, step: 'awaiting_date' });
        await telegram.sendMessage(chatId, `🏢 Cliente: ${typed}`);
      }
      await askDate(chatId);
      break;
    }
    case 'awaiting_date': {
      const parsed = parseDate(text.trim());
      if (!parsed) {
        await telegram.sendMessage(chatId, '⚠️ Formato inválido. Use DD/MM/AAAA ou DD/MM.');
        return;
      }
      conversation.updateConversation(chatId, {
        dueDate: parsed.formatted,
        dueDateMs: parsed.timestamp,
        step: 'awaiting_assignee',
      });
      await telegram.sendMessage(chatId, `📅 Prazo: ${parsed.formatted}`);
      await askAssignee(chatId);
      break;
    }
    default:
      // Se recebe texto fora de um step esperado, trata como nova tarefa
      await startTaskFlow(chatId, text, 'text');
  }
}

function parseDate(text) {
  // DD/MM/AAAA ou DD/MM
  const match = text.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{4}))?$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();

  const date = new Date(year, month, day, 23, 59, 59);
  if (isNaN(date.getTime())) return null;

  return {
    formatted: `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`,
    timestamp: date.getTime(),
  };
}

function priorityFromString(str) {
  const map = { urgent: 1, high: 2, normal: 3, low: 4 };
  return map[str] || 3;
}

// ============================================================
// Webhook endpoint
// ============================================================
app.post('/webhook', verifyWebhookSecret, verifyChatId, async (req, res) => {
  // Responde imediatamente para evitar retries do Telegram
  res.status(200).send('OK');

  try {
    // --- Callback Query (botões inline) ---
    if (req.body.callback_query) {
      await handleCallbackQuery(req.body.callback_query);
      return;
    }

    // --- Mensagem normal ---
    const message = req.body.message;
    if (!message) return;

    const chatId = message.chat.id;

    // --- Comandos do bot ---
    if (message.text && message.text.startsWith('/')) {
      const cmd = message.text.split(/\s|@/)[0].toLowerCase();
      switch (cmd) {
        case '/start':
          await telegram.sendMessage(chatId,
            `📌 Olá! Eu sou o Alex, seu Account Manager.\n\n` +
            `Envie qualquer briefing e eu crio a tarefa no ClickUp pra você.\n\n` +
            `Aceito:\n` +
            `  📝 Texto\n` +
            `  🎤 Áudio / voz\n` +
            `  📷 Foto (com legenda descrevendo a tarefa)\n` +
            `  📄 Documento (com legenda)\n` +
            `  🎬 Vídeo (com legenda)\n` +
            `  🔗 Links (no texto)\n\n` +
            `Antes de criar, vou te perguntar: prioridade, cliente, prazo e responsável.\n\n` +
            `Comandos:\n` +
            `/help — o que posso fazer\n` +
            `/cancel — cancelar tarefa em andamento`
          );
          return;
        case '/help':
          await telegram.sendMessage(chatId,
            `📌 Alex — Account Manager\n\n` +
            `Envie um briefing de qualquer forma:\n` +
            `  📝 Texto — descreva a tarefa\n` +
            `  🎤 Áudio — gravo e transcrevo automaticamente\n` +
            `  📷 Foto — mande com legenda descrevendo a tarefa\n` +
            `  📄 Documento — mande com legenda\n` +
            `  🎬 Vídeo — mande com legenda\n\n` +
            `Depois vou perguntar:\n` +
            `  ⚡ Prioridade\n` +
            `  🏢 Cliente\n` +
            `  📅 Data de entrega\n` +
            `  👤 Responsável\n\n` +
            `/cancel — cancela o fluxo atual`
          );
          return;
        case '/cancel':
          if (conversation.hasActiveConversation(chatId)) {
            conversation.endConversation(chatId);
            await telegram.sendMessage(chatId, '🚫 Criação de tarefa cancelada.');
          } else {
            await telegram.sendMessage(chatId, 'Nenhuma tarefa em andamento para cancelar.');
          }
          return;
      }
    }

    // --- Conversa ativa: input de texto para etapas do fluxo ---
    if (message.text && conversation.hasActiveConversation(chatId)) {
      const state = conversation.getConversation(chatId);
      if (state && (state.step === 'awaiting_description' || state.step === 'awaiting_client' || state.step === 'awaiting_date')) {
        await handleTextDuringConversation(chatId, message.text, state);
        return;
      }
    }

    // --- Nova tarefa: TEXTO ---
    if (message.text) {
      console.log(`📨 Text from ${chatId}: "${message.text}"`);
      await startTaskFlow(chatId, message.text, 'text');
    }

    // --- Nova tarefa: ÁUDIO ---
    else if (message.voice || message.audio) {
      const voice = message.voice || message.audio;
      console.log(`🎤 Voice from ${chatId}: ${voice.duration}s`);

      telegram.sendMessage(chatId, '🎤 Recebendo áudio... Transcrevendo...');

      const audioBuffer = await downloadTelegramFile(voice.file_id);
      const transcribeStart = Date.now();
      const transcription = await transcribeAudio(audioBuffer, 'voice.ogg');
      const transcribeMs = Date.now() - transcribeStart;

      console.log(`Transcription (${transcribeMs}ms): "${transcription}"`);

      if (!transcription) {
        telegram.sendMessage(chatId, '⚠️ Não consegui entender o áudio. Tente novamente.');
        return;
      }

      await telegram.sendMessage(chatId, `📝 Transcrição:\n"${transcription}"`);
      await startTaskFlow(chatId, transcription, 'voice', {
        voiceMetadata: { audio_duration: voice.duration, transcribe_ms: transcribeMs },
      });
    }

    // --- Nova tarefa: FOTO ---
    else if (message.photo) {
      // Telegram envia array de tamanhos — pegamos o maior (último)
      const photo = message.photo[message.photo.length - 1];
      const caption = message.caption || '';
      console.log(`📷 Photo from ${chatId}: ${photo.file_id} caption="${caption}"`);

      const attachment = { type: 'photo', file_id: photo.file_id, file_name: `photo_${Date.now()}.jpg` };

      if (caption) {
        // Tem legenda — usa como briefing
        const textForAI = `[Foto anexada] ${caption}`;
        await startTaskFlow(chatId, textForAI, 'photo', { attachments: [attachment] });
      } else {
        // Sem legenda — guarda o anexo e pede descrição
        conversation.startConversation(chatId, {
          analysis: null,
          originalText: '',
          messageType: 'photo',
          attachments: [attachment],
        });
        conversation.updateConversation(chatId, { step: 'awaiting_description' });
        await telegram.sendMessage(chatId, '📷 Foto recebida! Descreva a tarefa relacionada a essa imagem:');
      }
    }

    // --- Nova tarefa: DOCUMENTO ---
    else if (message.document) {
      const doc = message.document;
      const caption = message.caption || '';
      console.log(`📄 Document from ${chatId}: ${doc.file_name} caption="${caption}"`);

      const attachment = {
        type: 'document',
        file_id: doc.file_id,
        file_name: doc.file_name || `document_${Date.now()}`,
        mime_type: doc.mime_type,
      };

      if (caption) {
        const textForAI = `[Documento "${doc.file_name}" anexado] ${caption}`;
        await startTaskFlow(chatId, textForAI, 'document', { attachments: [attachment] });
      } else {
        conversation.startConversation(chatId, {
          analysis: null,
          originalText: '',
          messageType: 'document',
          attachments: [attachment],
        });
        conversation.updateConversation(chatId, { step: 'awaiting_description' });
        await telegram.sendMessage(chatId, `📄 Documento "${doc.file_name}" recebido! Descreva a tarefa:`);
      }
    }

    // --- Nova tarefa: VÍDEO ---
    else if (message.video) {
      const video = message.video;
      const caption = message.caption || '';
      console.log(`🎬 Video from ${chatId}: ${video.duration}s caption="${caption}"`);

      const attachment = {
        type: 'video',
        file_id: video.file_id,
        file_name: video.file_name || `video_${Date.now()}.mp4`,
        mime_type: video.mime_type,
      };

      if (caption) {
        const textForAI = `[Vídeo anexado - ${video.duration}s] ${caption}`;
        await startTaskFlow(chatId, textForAI, 'video', { attachments: [attachment] });
      } else {
        conversation.startConversation(chatId, {
          analysis: null,
          originalText: '',
          messageType: 'video',
          attachments: [attachment],
        });
        conversation.updateConversation(chatId, { step: 'awaiting_description' });
        await telegram.sendMessage(chatId, '🎬 Vídeo recebido! Descreva a tarefa:');
      }
    }

    // --- Tipo não suportado ---
    else {
      console.log(`⚠️ Unsupported message type from ${chatId}`);
      telegram.sendMessage(chatId, '📌 Envie texto, áudio, foto, documento ou vídeo com uma descrição da tarefa.\n/help para mais info.');
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }
});

// ============================================================
// Startup
// ============================================================
app.listen(port, async () => {
  console.log(`\n🤖 Telegram Webhook Server running on port ${port}`);
  console.log(`📡 Webhook URL: POST http://localhost:${port}/webhook`);
  console.log(`🔑 Bot Token: ...${TELEGRAM_BOT_TOKEN.slice(-8)}`);
  console.log(`🎤 Groq Whisper: Ready`);
  console.log(`🧠 AI Analyzer: ${GROQ_API_KEY ? 'Groq LLaMA' : 'Fallback'}`);
  console.log(`🔒 Webhook Secret: ${WEBHOOK_SECRET ? 'Configured' : 'Not set (dev mode)'}`);
  console.log(`👥 Allowed Chats: ${ALLOWED_CHAT_IDS.length > 0 ? ALLOWED_CHAT_IDS.join(', ') : 'All (unrestricted)'}`);
  console.log(`📊 Supabase Logging: ${process.env.SUPABASE_URL ? 'Enabled' : 'Disabled'}`);

  // Pre-cache de membros e clientes do ClickUp
  const members = await clickup.getTeamMembers();
  if (members.length > 0) {
    console.log(`👥 ClickUp Members: ${members.map(m => m.name).join(', ')}`);
  }
  CLIENT_OPTIONS = await clickup.getClientOptions();
  if (CLIENT_OPTIONS.length > 0) {
    console.log(`🏢 Clientes: ${CLIENT_OPTIONS.map(c => c.name).join(', ')}`);
  } else {
    console.log(`🏢 Clientes: Nenhum (campo "Cliente" não encontrado no ClickUp)`);
  }
  console.log('');
});
