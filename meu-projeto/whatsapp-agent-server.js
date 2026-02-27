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
const whatsappDBVanessa = require('./lib/whatsapp-db-vanessa');
const whatsappDBTorre1 = require('./lib/whatsapp-db-torre1');
const whatsappDBFourcred = require('./lib/whatsapp-db-fourcred');
const whatsappDBProfHumberto = require('./lib/whatsapp-db-prof-humberto');
const accountAnalyzer = require('./lib/account-analyzer');

// NOTA: Static files definidos no final, DEPOIS de todos os endpoints de API

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

app.get('/monitor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'monitor.html'));
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

      const isDraVanessa = instanceName?.toLowerCase().includes('vanessa') ||
                           instanceId === 'vanessa-soares';

      const IsTorre1 = instanceName?.toLowerCase().includes('torre') ||
                       instanceId === 'torre-1';

      const IsFourcred = instanceName?.toLowerCase().includes('fourcred') ||
                        instanceId === 'fourcred';

      const IsProfHumberto = instanceName?.toLowerCase().includes('prof') ||
                            instanceId === 'prof-humberto';

      // Análise da mensagem
      const analysis = accountAnalyzer.analyzeMessage(parsed.text, parsed.type);
      parsed.urgencyScore = analysis.urgencyScore;

      // Salvar no banco correto
      let clientName = 'unknown';
      try {
        if (isDrErico) {
          clientName = 'erico';
          console.log(`   ✅ → Dr. Erico DB`);
          whatsappDBErico.saveMessage(parsed);
          console.log(`   💾 Salvo (urgência: ${analysis.urgencyLevel})`);
        } else if (isDrHumberto) {
          clientName = 'humberto';
          console.log(`   ✅ → Dr. Humberto DB`);
          whatsappDBHumberto.saveMessage(parsed);
          console.log(`   💾 Salvo (urgência: ${analysis.urgencyLevel})`);
        } else if (isDraGabrielle) {
          clientName = 'gabrielle';
          console.log(`   ✅ → Dra Gabrielle DB`);
          whatsappDBGabrielle.saveMessage(parsed);
          console.log(`   💾 Salvo (urgência: ${analysis.urgencyLevel})`);
        } else if (isDraVanessa) {
          clientName = 'vanessa';
          console.log(`   ✅ → Dra. Vanessa DB`);
          whatsappDBVanessa.saveMessage(parsed);
          console.log(`   💾 Salvo (urgência: ${analysis.urgencyLevel})`);
        } else if (IsTorre1) {
          clientName = 'torre1';
          console.log(`   ✅ → Torre 1 DB`);
          whatsappDBTorre1.saveMessage(parsed);
          console.log(`   💾 Salvo (urgência: ${analysis.urgencyLevel})`);
        } else if (IsFourcred) {
          clientName = 'fourcred';
          console.log(`   ✅ → Fourcred DB`);
          whatsappDBFourcred.saveMessage(parsed);
          console.log(`   💾 Salvo (urgência: ${analysis.urgencyLevel})`);
        } else if (IsProfHumberto) {
          clientName = 'prof-humberto';
          console.log(`   ✅ → Prof. Dr. Humberto DB`);
          whatsappDBProfHumberto.saveMessage(parsed);
          console.log(`   💾 Salvo (urgência: ${analysis.urgencyLevel})`);
        } else {
          clientName = 'general';
          console.log(`   ✅ → Banco Geral`);
          whatsappDB.saveMessage(parsed);
          console.log(`   💾 Salvo (urgência: ${analysis.urgencyLevel})`);
        }

        // Broadcast to monitor com análise
        broadcastMonitorEvent({
          client: clientName,
          timestamp: parsed.timestamp,
          pushName: parsed.pushName,
          message: parsed.text?.substring(0, 50) || '[Mensagem]',
          type: parsed.type,
          urgencyScore: analysis.urgencyScore,
          urgencyLevel: analysis.urgencyLevel,
          hasComplaint: analysis.hasNegativeContent,
          status: 'saved'
        });
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
// Monitor SSE Stream (Real-time Activity)
// ============================================================
const monitorClients = [];

app.get('/api/monitor/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  monitorClients.push(res);
  console.log(`📺 Monitor client connected (${monitorClients.length} active)`);

  res.on('close', () => {
    const idx = monitorClients.indexOf(res);
    if (idx !== -1) monitorClients.splice(idx, 1);
    console.log(`📺 Monitor client disconnected (${monitorClients.length} active)`);
  });
});

app.get('/api/monitor/stats', (req, res) => {
  try {
    const ericoCount = whatsappDBErico.getTotalMessages();
    const humbertoCount = whatsappDBHumberto.getTotalMessages?.() || 0;
    const gabrielleCount = whatsappDBGabrielle.getTotalMessages?.() || 0;
    const vanessaCount = whatsappDBVanessa.getTotalMessages?.() || 0;
    const torre1Count = whatsappDBTorre1.getTotalMessages?.() || 0;
    const fourcredCount = whatsappDBFourcred.getTotalMessages?.() || 0;
    const profHumbertoCount = whatsappDBProfHumberto.getTotalMessages?.() || 0;

    const stats = {
      timestamp: new Date().toISOString(),
      clients: {
        erico: { total: ericoCount, lastActivity: getLastActivity(whatsappDBErico) },
        humberto: { total: humbertoCount, lastActivity: getLastActivity(whatsappDBHumberto) },
        gabrielle: { total: gabrielleCount, lastActivity: getLastActivity(whatsappDBGabrielle) },
        vanessa: { total: vanessaCount, lastActivity: getLastActivity(whatsappDBVanessa) },
        torre1: { total: torre1Count, lastActivity: getLastActivity(whatsappDBTorre1) },
        fourcred: { total: fourcredCount, lastActivity: getLastActivity(whatsappDBFourcred) },
        'prof-humberto': { total: profHumbertoCount, lastActivity: getLastActivity(whatsappDBProfHumberto) },
      },
      totalMessages: ericoCount + humbertoCount + gabrielleCount + vanessaCount + torre1Count + fourcredCount + profHumbertoCount,
      healthStatus: 'ok'
    };

    res.json(stats);
  } catch (err) {
    console.error('Monitor stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/monitor/messages', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const messages = {
      timestamp: new Date().toISOString(),
      erico: whatsappDBErico.getAllMessages(limit) || [],
      humberto: whatsappDBHumberto.getAllMessages?.(limit) || [],
      gabrielle: whatsappDBGabrielle.getAllMessages?.(limit) || [],
      vanessa: whatsappDBVanessa.getAllMessages?.(limit) || [],
      torre1: whatsappDBTorre1.getAllMessages?.(limit) || [],
      fourcred: whatsappDBFourcred.getAllMessages?.(limit) || [],
      'prof-humberto': whatsappDBProfHumberto.getAllMessages?.(limit) || [],
      totals: {
        erico: whatsappDBErico.getTotalMessages() || 0,
        humberto: whatsappDBHumberto.getTotalMessages?.() || 0,
        gabrielle: whatsappDBGabrielle.getTotalMessages?.() || 0,
        vanessa: whatsappDBVanessa.getTotalMessages?.() || 0,
        torre1: whatsappDBTorre1.getTotalMessages?.() || 0,
        fourcred: whatsappDBFourcred.getTotalMessages?.() || 0,
        'prof-humberto': whatsappDBProfHumberto.getTotalMessages?.() || 0
      }
    };

    res.json(messages);
  } catch (err) {
    console.error('Monitor messages error:', err);
    res.status(500).json({ error: err.message });
  }
});

function getLastActivity(db) {
  try {
    const result = db.getTotalMessages?.() || 0;
    return new Date().toISOString();
  } catch {
    return null;
  }
}

function broadcastMonitorEvent(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  monitorClients.forEach(client => {
    try {
      client.write(data);
    } catch (err) {
      console.error('Broadcast error:', err.message);
    }
  });
}

// ============================================================
// Analytics Endpoints
// ============================================================
app.get('/api/monitor/analytics/summary', (req, res) => {
  try {
    const allDBs = [
      { name: 'erico', db: whatsappDBErico },
      { name: 'humberto', db: whatsappDBHumberto },
      { name: 'gabrielle', db: whatsappDBGabrielle },
      { name: 'vanessa', db: whatsappDBVanessa },
      { name: 'torre1', db: whatsappDBTorre1 },
      { name: 'fourcred', db: whatsappDBFourcred },
      { name: 'prof-humberto', db: whatsappDBProfHumberto }
    ];

    const analytics = {};
    let totalMessages = 0;
    let criticalCount = 0;
    let complaintCount = 0;

    for (const { name, db } of allDBs) {
      const messages = db.getAllMessages?.(100) || [];
      const stats = accountAnalyzer.generateStats(messages);
      analytics[name] = stats;
      totalMessages += stats.totalMessages;
      criticalCount += stats.criticalCount;
      complaintCount += stats.complaintCount;
    }

    res.json({
      timestamp: new Date().toISOString(),
      summary: {
        totalMessages,
        criticalCount,
        complaintCount,
        avgCriticalityRate: totalMessages > 0 ? ((criticalCount / totalMessages) * 100).toFixed(2) + '%' : '0%'
      },
      clients: analytics
    });
  } catch (err) {
    console.error('Analytics summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/monitor/analytics/urgency', (req, res) => {
  try {
    const allDBs = [
      { name: 'erico', db: whatsappDBErico },
      { name: 'humberto', db: whatsappDBHumberto },
      { name: 'gabrielle', db: whatsappDBGabrielle },
      { name: 'vanessa', db: whatsappDBVanessa },
      { name: 'torre1', db: whatsappDBTorre1 },
      { name: 'fourcred', db: whatsappDBFourcred },
      { name: 'prof-humberto', db: whatsappDBProfHumberto }
    ];

    const urgencyBreakdown = {};

    for (const { name, db } of allDBs) {
      const messages = db.getAllMessages?.(50) || [];
      let critical = 0;
      let high = 0;
      let medium = 0;
      let low = 0;

      for (const msg of messages) {
        const score = msg.urgency_score || 0;
        if (score >= 70) critical++;
        else if (score >= 50) high++;
        else if (score >= 30) medium++;
        else low++;
      }

      urgencyBreakdown[name] = { critical, high, medium, low };
    }

    res.json({
      timestamp: new Date().toISOString(),
      urgencyBreakdown
    });
  } catch (err) {
    console.error('Urgency analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Static Files (Monitor UI) - Deve estar DEPOIS dos endpoints!
// ============================================================
app.use(express.static(path.join(__dirname, 'public')));

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
  whatsappDBVanessa.initDB();
  whatsappDBTorre1.initDB();
  whatsappDBFourcred.initDB();
  whatsappDBProfHumberto.initDB();
});
