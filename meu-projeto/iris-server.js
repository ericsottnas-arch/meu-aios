// meu-projeto/iris-server.js
// Iris - Hunter de Prospeccao Automatizada via GHL + Telegram

const fs = require('fs');
const path = require('path');

// Carregamento de .env (parent primeiro, local como override)
if (process.env.NODE_ENV !== 'production') {
  const localEnv = path.resolve(__dirname, '.env');
  const parentEnv = path.resolve(__dirname, '..', '.env');
  // Carregar parent env primeiro (tem todas as vars)
  if (fs.existsSync(parentEnv)) {
    require('dotenv').config({ path: parentEnv });
  }
  // Local env faz override se existir
  if (fs.existsSync(localEnv)) {
    require('dotenv').config({ path: localEnv, override: true });
  }
}

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.IRIS_PORT || 3005;
const APPROVAL_CHAT_ID = process.env.IRIS_APPROVAL_CHAT_ID || '5020990459';

// Modulos Iris
const irisEngine = require('./lib/iris-engine');
const irisTelegram = require('./lib/iris-telegram');
const irisDB = require('./lib/iris-db');
const irisScripts = require('./lib/iris-scripts');
const irisPoller = require('./lib/iris-poller');
const irisLeadScorer = require('./lib/iris-lead-scorer');
const irisPipeline = require('./lib/iris-pipeline');

// ============================================================
// Health check
// ============================================================
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'iris-hunter-engine',
    mode: irisEngine.getMode(),
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// API: Prospects
// ============================================================
app.get('/api/prospects', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const prospects = irisDB.getAllProspects(limit);
    res.json({ success: true, data: prospects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/prospects/active', (req, res) => {
  try {
    const prospects = irisDB.getActiveProspects();
    res.json({ success: true, data: prospects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/prospects/enroll', (req, res) => {
  try {
    const { conversationId, contactName, stage } = req.body;
    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId obrigatorio' });
    }
    const result = irisEngine.enrollManual(conversationId, contactName, stage);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/prospects/:conversationId', (req, res) => {
  try {
    const prospect = irisDB.getProspect(req.params.conversationId);
    if (!prospect) {
      return res.status(404).json({ error: 'Prospect nao encontrado' });
    }
    res.json({ success: true, data: prospect });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/prospects/:conversationId/pause', (req, res) => {
  try {
    const result = irisDB.setProspectStatus(req.params.conversationId, 'paused');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/prospects/:conversationId/resume', (req, res) => {
  try {
    const result = irisDB.setProspectStatus(req.params.conversationId, 'active');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// API: Followups
// ============================================================
app.get('/api/followups', (req, res) => {
  try {
    const needFollowup = irisEngine.checkFollowups();
    res.json({ success: true, data: needFollowup });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/followups/execute', async (req, res) => {
  try {
    const results = await irisEngine.executeAllFollowups();
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/followups/:conversationId', async (req, res) => {
  try {
    const result = await irisEngine.executeFollowup(req.params.conversationId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// API: Lead Scoring
// ============================================================
app.get('/api/prospects/scored', (req, res) => {
  try {
    const scored = irisLeadScorer.scoreAllProspects();
    res.json({ success: true, data: scored });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/prospects/hot', (req, res) => {
  try {
    const hot = irisLeadScorer.getHotLeads();
    res.json({ success: true, data: hot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/prospects/cold', (req, res) => {
  try {
    const cold = irisLeadScorer.getColdLeads();
    res.json({ success: true, data: cold });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/followups/priorities', (req, res) => {
  try {
    const priorities = irisLeadScorer.getFollowupPriorities();
    res.json({ success: true, data: priorities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// API: Scan & Intelligence
// ============================================================
app.post('/api/scan', async (req, res) => {
  try {
    const result = await irisEngine.scanAndPrioritize();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scan/ghl', async (req, res) => {
  try {
    const result = await irisEngine.scanGHLConversations();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pipeline/status', (req, res) => {
  res.json({
    configured: irisPipeline.isConfigured(),
    pipelineId: process.env.GHL_PIPELINE_ID || null,
    stageMap: irisPipeline.STAGE_MAP,
  });
});

// ============================================================
// API: Feedback & Learning
// ============================================================
app.get('/api/feedback', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const feedback = irisDB.getAllFeedback(limit);
    res.json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/learning', (req, res) => {
  try {
    const rules = irisDB.getLearningRules(null, 0.3);
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/learning/analyze', async (req, res) => {
  try {
    const result = await irisEngine.analyzeFeedbackPatterns();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// API: Mode control
// ============================================================
app.get('/api/mode', (req, res) => {
  res.json({ mode: irisEngine.getMode() });
});

app.post('/api/mode', (req, res) => {
  const { mode } = req.body;
  const ok = irisEngine.setMode(mode);
  if (ok) {
    res.json({ success: true, mode });
  } else {
    res.status(400).json({ error: 'Modo invalido. Use: hunter ou supervised' });
  }
});

// ============================================================
// API: Approvals, Scripts, Stats
// ============================================================
app.get('/api/approvals/pending', (req, res) => {
  try {
    const approvals = irisDB.getPendingApprovals();
    res.json({ success: true, data: approvals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scripts', (req, res) => {
  res.json({ success: true, stages: irisScripts.getStages(), scripts: irisScripts.scripts });
});

app.get('/api/stats', (req, res) => {
  try {
    const stats = irisDB.getStats();
    res.json({ success: true, mode: irisEngine.getMode(), ...stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// Telegram Polling
// ============================================================
let pollingActive = false;

async function startPolling() {
  await irisTelegram.deleteWebhook();
  const me = await irisTelegram.getMe();
  if (me.ok) {
    console.log(`🤖 Iris Telegram bot: @${me.result.username}`);
  }

  pollingActive = true;
  pollLoop();
}

async function pollLoop() {
  while (pollingActive) {
    try {
      const updates = await irisTelegram.getUpdates(30);

      for (const update of updates) {
        try {
          if (update.callback_query) {
            await handleCallback(update.callback_query);
          } else if (update.message?.text) {
            await handleTextMessage(update.message);
          }
        } catch (err) {
          console.error('🌸 Iris: erro ao processar update:', err.message);
        }
      }
    } catch (err) {
      console.error('🌸 Iris: erro no polling:', err.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

async function handleCallback(callbackQuery) {
  const data = callbackQuery.data;
  if (!data || !data.startsWith('iris:')) return;

  const parts = data.split(':');
  const action = parts[1];
  const approvalId = parseInt(parts[2]);

  const chatId = callbackQuery.message?.chat?.id;
  const messageId = callbackQuery.message?.message_id;

  await irisEngine.handleApprovalCallback(action, approvalId, callbackQuery.id, chatId, messageId);
}

async function handleTextMessage(message) {
  const chatId = message.chat.id;
  const text = message.text;

  // Modo edicao
  if (irisEngine.isEditingMode(chatId)) {
    await irisEngine.handleEditedText(chatId, text);
    return;
  }

  // Comandos
  if (text === '/start' || text === '/help') {
    const mode = irisEngine.getMode();
    await irisTelegram.sendMessage(chatId,
      `🌸 Iris v3 - Prospeccao Inteligente\n` +
      `Modo atual: ${mode === 'hunter' ? '🟢 HUNTER (autonomo)' : '🟡 SUPERVISED'}\n\n` +
      `Comandos:\n` +
      `/status - Stats gerais\n` +
      `/prospects - Prospects ativos\n` +
      `/score - Lead scoring (priorizacao)\n` +
      `/scan - Varredura completa de leads\n` +
      `/scan_ghl - Buscar novos leads no GHL\n` +
      `/summary - Resumo do dia\n` +
      `/pending - Aprovacoes pendentes\n` +
      `/followup - Verificar followups\n` +
      `/followup_all - Executar todos os followups\n` +
      `/reativar - Liga/desliga varredura de reativação (30 min)\n` +
      `/reativar_agora - Executar reativação manualmente\n` +
      `/hunter - Modo autonomo\n` +
      `/supervised - Modo supervisionado\n` +
      `/mode - Ver modo atual\n` +
      `/pipeline - Status da pipeline GHL`
    );

  } else if (text === '/status') {
    const stats = irisDB.getStats();
    const mode = irisEngine.getMode();
    await irisTelegram.sendMessage(chatId,
      `📊 Iris Stats\n\n` +
      `Modo: ${mode === 'hunter' ? '🟢 HUNTER' : '🟡 SUPERVISED'}\n` +
      `Prospects ativos: ${stats.active}\n` +
      `Total prospects: ${stats.total}\n` +
      `Aprovacoes pendentes: ${stats.pending}\n` +
      `Mensagens enviadas: ${stats.sent}`
    );

  } else if (text === '/prospects') {
    const prospects = irisDB.getActiveProspects();
    if (prospects.length === 0) {
      await irisTelegram.sendMessage(chatId, 'Nenhum prospect ativo.');
      return;
    }
    const stageEmoji = { aquecimento: '1️⃣', qualificacao: '2️⃣', rapport: '3️⃣', proposta_reuniao: '4️⃣', agendamento: '5️⃣', followup: '6️⃣', objecoes: '7️⃣' };
    const list = prospects.slice(0, 15).map((p) =>
      `${stageEmoji[p.current_stage] || '⚪'} ${p.contact_name} [${p.current_stage}] (${p.message_count} msgs)`
    ).join('\n');
    await irisTelegram.sendMessage(chatId, `🌸 Prospects ativos (${prospects.length}):\n\n${list}`);

  } else if (text === '/pending') {
    const pending = irisDB.getPendingApprovals();
    if (pending.length === 0) {
      await irisTelegram.sendMessage(chatId, 'Nenhuma aprovacao pendente.');
      return;
    }
    const list = pending.slice(0, 10).map((a) =>
      `#${a.id} - ${a.stage} - ${a.chunks.length} chunks`
    ).join('\n');
    await irisTelegram.sendMessage(chatId, `📋 Aprovacoes pendentes:\n\n${list}`);

  } else if (text === '/followup') {
    const needFollowup = irisEngine.checkFollowups();
    if (needFollowup.length === 0) {
      await irisTelegram.sendMessage(chatId, 'Nenhum prospect precisa de followup agora.');
      return;
    }
    const list = needFollowup.map((p) =>
      `- ${p.contact_name} (${p.silenceDays} dias de silencio) → ${p.suggestedVariant}`
    ).join('\n');
    await irisTelegram.sendInlineKeyboard(chatId,
      `🔔 Precisam de followup (${needFollowup.length}):\n\n${list}`,
      [[{ text: '📤 Enviar todos os followups', callback_data: 'iris:followup_all:0' }]]
    );

  } else if (text === '/followup_all') {
    await irisTelegram.sendMessage(chatId, '🔄 Executando followups...');
    const results = await irisEngine.executeAllFollowups();
    const sent = results.filter((r) => r.success).length;
    await irisTelegram.sendMessage(chatId, `✅ Followups executados: ${sent}/${results.length}`);

  } else if (text === '/hunter') {
    irisEngine.setMode('hunter');
    await irisTelegram.sendMessage(chatId,
      '🟢 Modo HUNTER ativado\n\n' +
      'Iris vai responder automaticamente nas etapas:\n' +
      '- Aquecimento (conexao inicial)\n' +
      '- Qualificacao (entender situacao)\n' +
      '- Followup (re-engajamento)\n\n' +
      'Aprovacao manual para:\n' +
      '- Rapport, Proposta Reuniao, Agendamento, Objecoes'
    );

  } else if (text === '/supervised') {
    irisEngine.setMode('supervised');
    await irisTelegram.sendMessage(chatId,
      '🟡 Modo SUPERVISED ativado\n\n' +
      'Todas as mensagens precisam de aprovacao manual via Telegram.'
    );

  } else if (text === '/score') {
    const scored = irisLeadScorer.scoreAllProspects();
    if (scored.length === 0) {
      await irisTelegram.sendMessage(chatId, 'Nenhum prospect ativo para pontuar.');
      return;
    }
    const list = scored.slice(0, 15).map((l) => {
      const emoji = irisLeadScorer.getTierEmoji(l.tier);
      return `${emoji} ${l.contactName} - Score: ${l.score} [${l.currentStage}]`;
    }).join('\n');
    await irisTelegram.sendMessage(chatId, `🎯 Lead Scoring (${scored.length}):\n\n${list}`);

  } else if (text === '/scan') {
    await irisTelegram.sendMessage(chatId, '🔍 Executando varredura completa...');
    await irisEngine.scanAndPrioritize();

  } else if (text === '/scan_ghl') {
    await irisTelegram.sendMessage(chatId, '🔍 Buscando novos leads no GHL...');
    const result = await irisEngine.scanGHLConversations();
    if (result.enrolled === 0) {
      await irisTelegram.sendMessage(chatId, 'Nenhum novo lead encontrado no GHL.');
    }

  } else if (text === '/summary') {
    await irisEngine.generateDailySummary();

  } else if (text === '/pipeline') {
    const configured = irisPipeline.isConfigured();
    if (!configured) {
      await irisTelegram.sendMessage(chatId, '⚠️ Pipeline nao configurada.\nDefina GHL_PIPELINE_ID no .env');
      return;
    }
    const stages = await irisPipeline.loadStages();
    const stageList = stages ? Object.entries(stages).map(([name, id]) => `  ${name}: ${id}`).join('\n') : 'Erro ao carregar stages';
    await irisTelegram.sendMessage(chatId, `🔗 Pipeline GHL\n\nID: ${process.env.GHL_PIPELINE_ID}\nStages:\n${stageList}`);

  } else if (text === '/reativar') {
    const isActive = irisEngine.isReactivationActive();

    if (isActive) {
      irisEngine.stopReactivationLoop();
      await irisTelegram.sendMessage(chatId,
        '⏹️ Varredura de reativação DESATIVADA\n\n' +
        'Leads inativos não serão mais verificados automaticamente.\n' +
        'Use /reativar para ligar novamente.'
      );
    } else {
      irisEngine.startReactivationLoop();
      await irisTelegram.sendMessage(chatId,
        '🔄 Varredura de reativação ATIVADA\n\n' +
        'A cada 30 minutos, Iris vai:\n' +
        '• Buscar leads que não foram respondidos\n' +
        '• Buscar leads com silêncio mútuo (>3 dias)\n' +
        '• Reativar leads perdidos (<60 dias)\n' +
        '• Gerar mensagem personalizada para cada um\n' +
        '• Enviar para aprovação aqui no Telegram\n\n' +
        'Máximo de 5 reativações por ciclo.\n' +
        'Use /reativar para desligar.'
      );
    }

  } else if (text === '/reativar_agora') {
    await irisTelegram.sendMessage(chatId, '🔄 Executando varredura de reativação...');
    const result = await irisEngine.runReactivationSweep();
    if (result.total === 0) {
      await irisTelegram.sendMessage(chatId, '✅ Nenhum lead inativo encontrado. Todos em dia!');
    }

  } else if (text === '/mode') {
    const mode = irisEngine.getMode();
    const reactivation = irisEngine.isReactivationActive() ? '🟢 Ativa' : '⚪ Inativa';
    await irisTelegram.sendMessage(chatId,
      `Modo atual: ${mode === 'hunter' ? '🟢 HUNTER (autonomo)' : '🟡 SUPERVISED (manual)'}\n` +
      `Reativação: ${reactivation}`
    );
  }
}

// Callback especial para followup_all via botao
const originalHandleCallback = handleCallback;
async function handleCallbackExtended(callbackQuery) {
  const data = callbackQuery.data;
  if (data === 'iris:followup_all:0') {
    const chatId = callbackQuery.message?.chat?.id;
    await irisTelegram.answerCallbackQuery(callbackQuery.id, 'Executando followups...');
    const results = await irisEngine.executeAllFollowups();
    const sent = results.filter((r) => r.success).length;
    await irisTelegram.sendMessage(chatId, `✅ Followups executados: ${sent}/${results.length}`);
    return;
  }
  await originalHandleCallback(callbackQuery);
}
// Substituir handler
handleCallback = handleCallbackExtended;

// ============================================================
// Scheduler Inteligente (9h, 13h, 17h, 21h)
// ============================================================
function scheduleIntelligentCron() {
  const checkInterval = 15 * 60 * 1000; // Check a cada 15min
  const executedHours = new Set();

  // Reset executedHours a cada dia
  let lastDay = new Date().getDate();

  setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDate();

    // Reset no novo dia
    if (day !== lastDay) {
      executedHours.clear();
      lastDay = day;
    }

    // Evitar executar mais de 1x na mesma hora
    if (executedHours.has(hour)) return;

    try {
      // 9h: Scan completo + scoring + followups HOT auto
      if (hour === 9) {
        executedHours.add(hour);
        console.log('🕘 Iris Scheduler: scan matinal (9h)');
        await irisEngine.scanAndPrioritize();

        // Analisar feedbacks a cada 3 dias
        if (day % 3 === 0) {
          await irisEngine.analyzeFeedbackPatterns();
        }
      }

      // 13h: Check rapido - followups WARM pendentes
      if (hour === 13) {
        executedHours.add(hour);
        console.log('🕐 Iris Scheduler: check rapido (13h)');
        const priorities = irisLeadScorer.getFollowupPriorities();
        const warmPending = priorities.filter((f) => f.action === 'approval_followup');

        if (warmPending.length > 0) {
          const list = warmPending.slice(0, 5).map((l) => `  - ${l.contactName} (${l.silenceDays}d, score ${l.score})`).join('\n');
          await irisTelegram.sendMessage(APPROVAL_CHAT_ID,
            `🟡 Followups WARM pendentes (${warmPending.length}):\n\n${list}\n\nUse /followup_all para enviar.`
          );
        }
      }

      // 17h: Scan GHL - novas conversas nao enrolled
      if (hour === 17) {
        executedHours.add(hour);
        console.log('🕔 Iris Scheduler: scan GHL (17h)');
        await irisEngine.scanGHLConversations();
      }

      // 21h: Resumo do dia
      if (hour === 21) {
        executedHours.add(hour);
        console.log('🕘 Iris Scheduler: resumo do dia (21h)');
        await irisEngine.generateDailySummary();
      }
    } catch (error) {
      console.error('🌸 Iris Scheduler: erro:', error.message);
    }
  }, checkInterval);

  console.log('📅 Iris Scheduler: ativo (9h scan, 13h check, 17h GHL, 21h resumo)');
}

// ============================================================
// API: Reativação
// ============================================================
app.get('/api/reactivation/leads', (req, res) => {
  try {
    const leads = irisEngine.findLeadsToReactivate();
    res.json({ success: true, total: leads.length, data: leads });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reactivation/sweep', async (req, res) => {
  try {
    const result = await irisEngine.runReactivationSweep();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reactivation/toggle', (req, res) => {
  const isActive = irisEngine.isReactivationActive();
  if (isActive) {
    irisEngine.stopReactivationLoop();
    res.json({ success: true, active: false });
  } else {
    irisEngine.startReactivationLoop();
    res.json({ success: true, active: true });
  }
});

// ============================================================
// API: WhatsApp (Stevo) Webhook
// ============================================================
app.post('/webhook/stevo', async (req, res) => {
  try {
    const data = req.body;
    // Stevo envia webhooks com dados da mensagem
    // Formato: { event, data: { key: { remoteJid }, message, ... } }
    const event = data.event || data.type;
    const msgData = data.data || data;

    if (event === 'messages.upsert' || event === 'message') {
      const remoteJid = msgData.key?.remoteJid || msgData.from;
      if (!remoteJid || remoteJid.includes('@g.us')) {
        return res.json({ success: true, ignored: true }); // Ignorar grupos
      }

      const phoneNumber = remoteJid.replace('@s.whatsapp.net', '');
      const text = msgData.message?.conversation ||
                   msgData.message?.extendedTextMessage?.text ||
                   msgData.text || '';

      if (!text || msgData.key?.fromMe) {
        return res.json({ success: true, ignored: true }); // Ignorar próprias msgs
      }

      console.log(`📱 Stevo Webhook: msg de ${phoneNumber}: "${text.substring(0, 50)}"`);

      const result = await irisEngine.processWhatsAppInbound(phoneNumber, text);
      res.json({ success: true, ...result });
    } else {
      res.json({ success: true, event });
    }
  } catch (error) {
    console.error('📱 Stevo Webhook: erro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// API: Calendar
// ============================================================
const irisCalendar = require('./lib/iris-calendar');

app.get('/api/calendar/slots', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const slots = await irisCalendar.getAvailableSlots(days);
    res.json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/calendar/schedule', async (req, res) => {
  try {
    const { contactId, startTime, contactName, email } = req.body;
    if (!contactId || !startTime) {
      return res.status(400).json({ error: 'contactId e startTime obrigatórios' });
    }
    const result = await irisCalendar.createMeeting(contactId, startTime, { contactName, email });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// Start server
// ============================================================
app.listen(PORT, () => {
  const mode = irisEngine.getMode();
  const pipelineStatus = irisPipeline.isConfigured() ? 'Conectada' : 'Nao configurada';
  const stevoStatus = require('./lib/stevo').isConfigured() ? 'Conectado' : 'Nao configurado';
  const calendarStatus = irisCalendar.isConfigured() ? 'Ativo' : 'Nao configurado';
  console.log(`
╔════════════════════════════════════════════╗
║   🌸 Iris v3 - Autonomia Total           ║
╠════════════════════════════════════════════╣
║   Port: ${PORT}                              ║
║   Mode: ${mode === 'hunter' ? 'HUNTER (autonomo)    ' : 'SUPERVISED (manual)  '}       ║
║   Pipeline GHL: ${pipelineStatus.padEnd(24)}║
║   WhatsApp Stevo: ${stevoStatus.padEnd(22)}║
║   Calendar: ${calendarStatus.padEnd(29)}║
║   Lead Scoring: Ativo                     ║
║   Scheduler: 9h/13h/17h/21h              ║
║   Feedback Loop: Ativo                    ║
║   API: /api/*                             ║
║   Telegram: Polling mode                  ║
║   GHL: Polling every 15s                  ║
╚════════════════════════════════════════════╝
  `);

  // Iniciar polling do Telegram
  if (process.env.IRIS_BOT_TOKEN) {
    startPolling().catch((err) => {
      console.error('🌸 Iris: falha ao iniciar polling:', err.message);
    });
  } else {
    console.warn('⚠️ IRIS_BOT_TOKEN nao configurado - Telegram desativado');
  }

  // Iniciar polling do GHL (busca novas mensagens inbound a cada 15s)
  if (process.env.GHL_ACCESS_TOKEN && process.env.GHL_LOCATION_ID) {
    irisPoller.startPolling(async (message, conversation) => {
      try {
        await irisEngine.processInboundMessage(message, conversation);
      } catch (err) {
        console.error('🌸 Iris: erro ao processar mensagem do poller:', err.message);
      }
    });
    console.log('🔄 GHL Poller: ativo (15s interval)');
  } else {
    console.warn('⚠️ GHL_ACCESS_TOKEN ou GHL_LOCATION_ID nao configurado - GHL Poller desativado');
  }

  // Agendar scheduler inteligente (9h, 13h, 17h, 21h)
  scheduleIntelligentCron();

  // Stats do DB
  const stats = irisDB.getStats();
  console.log(`📊 DB: ${stats.active} prospects ativos, ${stats.pending} aprovacoes pendentes, ${stats.feedbackCount} feedbacks, ${stats.learningCount} regras`);
  const autoStages = irisScripts.getAutonomousStages().join(', ');
  const approvalStages = irisScripts.getApprovalStages().join(', ');
  console.log(`🎯 Etapas autonomas: ${autoStages}`);
  console.log(`🔒 Etapas com aprovacao: ${approvalStages}`);

  // Carregar pipeline stages se configurado
  if (irisPipeline.isConfigured()) {
    irisPipeline.loadStages().then((stages) => {
      if (stages) console.log(`🔗 Pipeline stages: ${Object.keys(stages).join(', ')}`);
    }).catch(() => {});
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🌸 Iris: encerrando...');
  pollingActive = false;
  irisPoller.stopPolling();
  process.exit(0);
});
