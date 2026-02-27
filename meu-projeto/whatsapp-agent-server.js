// meu-projeto/whatsapp-agent-server.js
// Nico - Account Manager Agent para WhatsApp via Stevo.chat
// FUNÇÃO ÚNICA: Salvar mensagens do WhatsApp
const fs = require('fs');
const path = require('path');

// Carregamento de .env
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

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));

const PORT = process.env.WHATSAPP_PORT || 3001;
const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');

// Módulos — WhatsApp Database
const stevo = require('./lib/stevo');
const whatsappDB = require('./lib/whatsapp-db');
const whatsappDBErico = require('./lib/whatsapp-db-erico');
const whatsappDBHumberto = require('./lib/whatsapp-db-humberto');
const whatsappDBGabrielle = require('./lib/whatsapp-db-gabrielle');

// ============================================================
// Health check
// ============================================================
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'nico-whatsapp-message-saver',
    stevo: stevo.isConfigured() ? 'connected' : 'not configured',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Parse mensagem do webhook
// ============================================================
function parseWebhookMessage(body) {
  const data = body.data || body;

  // Formato Stevo: data.Info + data.Message
  if (data.Info) {
    const info = data.Info;
    const message = data.Message || {};

    const id = info.ID || '';
    const chatJid = info.Chat || '';
    const senderJid = info.Sender || info.Chat || '';
    const isGroup = info.IsGroup || chatJid.endsWith('@g.us');
    const isFromMe = info.IsFromMe || false;
    const pushName = info.PushName || 'Desconhecido';
    const timestamp = info.Timestamp
      ? new Date(info.Timestamp).getTime()
      : Date.now();

    const parsed = extractMessageContent(message);

    return {
      id,
      chatJid,
      chatName: info.ChatName || pushName || 'Chat',
      senderJid,
      isGroup,
      isFromMe,
      pushName,
      timestamp,
      ...parsed,
      rawMessage: message,
    };
  }

  // Formato Evolution API
  const items = Array.isArray(data) ? data : [data];
  const item = items[0] || {};
  const key = item.key || {};
  const message = item.message || {};

  const id = key.id || item.ID || '';
  const chatJid = key.remoteJid || item.Chat || '';
  const senderJid = key.participant || key.remoteJid || item.Sender || '';
  const isGroup = chatJid.endsWith('@g.us');
  const isFromMe = key.fromMe || item.IsFromMe || false;
  const pushName = item.pushName || item.PushName || 'Desconhecido';
  const timestamp = item.messageTimestamp
    ? Number(item.messageTimestamp) * 1000
    : Date.now();

  const parsed = extractMessageContent(message);

  return {
    id,
    chatJid,
    senderJid,
    isGroup,
    isFromMe,
    pushName,
    timestamp,
    ...parsed,
    rawMessage: message,
  };
}

function extractMessageContent(message) {
  let text = null;
  let type = 'unknown';
  let mediaUrl = null;
  let caption = null;
  let fileName = null;
  let mimeType = null;
  let audioDuration = null;

  // Texto
  if (message.conversation || message.extendedTextMessage || message.Text || message.Conversation) {
    text = message.conversation || message.Conversation || message.Text || message.extendedTextMessage?.text || '';
    type = 'text';
    if (text.match(/https?:\/\/[^\s]+/)) {
      type = 'link';
    }
  }

  // Imagem
  if (message.imageMessage || message.Image) {
    type = 'image';
    mediaUrl = message.imageMessage?.url || message.Image?.url || null;
    caption = message.imageMessage?.caption || message.Image?.caption || null;
    fileName = mediaUrl ? `image_${Date.now()}.jpg` : null;
    mimeType = 'image/jpeg';
    text = caption || '[Imagem]';
  }

  // Áudio
  if (message.audioMessage || message.Audio) {
    type = 'audio';
    mediaUrl = message.audioMessage?.url || message.Audio?.url || null;
    mimeType = message.audioMessage?.mimetype || message.Audio?.mimeType || 'audio/ogg';
    audioDuration = message.audioMessage?.seconds || message.Audio?.duration || null;
    text = '[Áudio]';
  }

  // Vídeo
  if (message.videoMessage || message.Video) {
    type = 'video';
    mediaUrl = message.videoMessage?.url || message.Video?.url || null;
    caption = message.videoMessage?.caption || message.Video?.caption || null;
    mimeType = 'video/mp4';
    text = caption || '[Vídeo]';
  }

  // Documento
  if (message.documentMessage || message.Document) {
    type = 'document';
    mediaUrl = message.documentMessage?.url || message.Document?.url || null;
    fileName = message.documentMessage?.filename || message.Document?.filename || null;
    mimeType = message.documentMessage?.mimetype || message.Document?.mimeType || null;
    text = `[Documento: ${fileName || 'desconhecido'}]`;
  }

  return {
    text: text || '',
    type,
    mediaUrl,
    caption,
    fileName,
    mimeType,
    audioDuration,
  };
}

// ============================================================
// Webhook Handler
// ============================================================
const MESSAGE_EVENTS = new Set(['messages.upsert', 'Messages', 'Message', 'message']);
const IGNORED_EVENTS = new Set(['Receipt', 'receipt', 'ChatPresence', 'chat.presence', 'HistorySync', 'history.sync', 'connection.update']);

function handleStevoWebhook(req, res) {
  // Responder imediatamente
  res.status(200).send('OK');

  (async () => {
    try {
      const event = req.body?.event || req.body?.type || 'unknown';
      const instanceName = req.body?.instanceName || '';

      // Log
      if (!handleStevoWebhook._eventsSeen) handleStevoWebhook._eventsSeen = new Set();
      if (!handleStevoWebhook._eventsSeen.has(event)) {
        handleStevoWebhook._eventsSeen.add(event);
        console.log(`📥 Webhook NOVO evento [${event}] instance=${instanceName}`);
      } else {
        console.log(`📥 Webhook [${event}] instance=${instanceName}`);
      }

      // Ignorar eventos não-message
      if (IGNORED_EVENTS.has(event)) {
        return;
      }

      if (!MESSAGE_EVENTS.has(event) && event !== 'unknown') {
        console.log(`   ↪ Evento não tratado: ${event}`);
        return;
      }

      const parsed = parseWebhookMessage(req.body);

      console.log(`   📝 Tipo: ${parsed.type} | Texto: "${parsed.text?.substring(0, 50) || 'vazio'}"`);

      // Filtrar apenas texto
      if (parsed.type !== 'text' && parsed.type !== 'link') {
        console.log(`   ↪ Ignorado: ${parsed.type} [${parsed.id}]`);
        return;
      }

      // Roteamento por instância Stevo
      const instanceId = req.body.instanceId || req.body.instance || '';
      const botNumber = req.body.data?.Info?.wid?.user || req.body.data?.Data?.wid?.user || '';

      console.log(`[ROTEAMENTO] Instance: ${instanceId} | Name: ${instanceName} | Bot: ${botNumber}`);

      // Identificar cliente
      const isDrErico = instanceId === 'smv2-10' ||
                       instanceName?.toLowerCase().includes('erico') ||
                       botNumber === '553121810819';

      const isDrHumberto = instanceId === 'smv2-7' ||
                          instanceName?.toLowerCase().includes('humberto') ||
                          botNumber === '559681311503';

      const isDraGabrielle = instanceId === 'sm-galo' ||
                            instanceName?.toLowerCase().includes('gabrielle') ||
                            instanceName?.toLowerCase().includes('gab') ||
                            botNumber === '5511947937034';

      // Salvar no banco correto
      try {
        if (isDrErico) {
          console.log(`   ✅ → Dr. Erico DB`);
          whatsappDBErico.saveMessage(parsed);
          console.log(`   💾 Salvo com sucesso`);
        } else if (isDrHumberto) {
          console.log(`   ✅ → Dr. Humberto DB`);
          whatsappDBHumberto.saveMessage(parsed);
          console.log(`   💾 Salvo com sucesso`);
        } else if (isDraGabrielle) {
          console.log(`   ✅ → Dra Gabrielle DB`);
          whatsappDBGabrielle.saveMessage(parsed);
          console.log(`   💾 Salvo com sucesso`);
        } else {
          console.log(`   ✅ → Banco Geral`);
          whatsappDB.saveMessage(parsed);
          console.log(`   💾 Salvo com sucesso`);
        }
      } catch (err) {
        console.error(`   ❌ ERRO ao salvar:`, err.message);
        console.error(`   Stack:`, err.stack);
      }
    } catch (err) {
      console.error('Webhook handler error:', err);
    }
  })();
}

// Registrar webhooks
app.post('/webhook/whatsapp', handleStevoWebhook);
app.post('/webhook', handleStevoWebhook);
app.post('/webhooks', handleStevoWebhook);

// Catch-all para debug
app.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log(`❓ POST desconhecido em ${req.path}:`, JSON.stringify(req.body).substring(0, 200));
    res.status(200).send('OK');
    return;
  }
  next();
});

// ============================================================
// Startup
// ============================================================
app.listen(PORT, () => {
  console.log(`
💬 Nico — WhatsApp Message Saver
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Server: http://localhost:${PORT}
📡 Webhook: POST http://localhost:${PORT}/webhook/whatsapp
🔌 Stevo API: ${stevo.isConfigured() ? '✅ Configurada' : '❌ Não configurada'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Nico está rodando!
  `);

  // Inicializar bancos
  whatsappDB.initDB();
  whatsappDBErico.initDB();
  whatsappDBHumberto.initDB();
  whatsappDBGabrielle.initDB();
});
