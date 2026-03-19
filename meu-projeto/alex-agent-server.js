// meu-projeto/alex-agent-server.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// Em produção (Railway), usa env vars do sistema
// Em dev local, carrega .env local E .env pai (dotenv não sobrescreve vars existentes)
if (process.env.NODE_ENV !== 'production') {
  const localEnv = path.resolve(__dirname, '.env');
  const parentEnv = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(localEnv)) require('dotenv').config({ path: localEnv });
  if (fs.existsSync(parentEnv)) require('dotenv').config({ path: parentEnv });
}

const app = express();
const port = process.env.ALEX_PORT || 3003;
const ALEX_BOT_TOKEN = process.env.ALEX_BOT_TOKEN?.replace(/"/g, '');
const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');
const WEBHOOK_SECRET = process.env.ALEX_WEBHOOK_SECRET;
const ALEX_OWNER_CHAT_ID = process.env.ALEX_OWNER_CHAT_ID;

if (!ALEX_BOT_TOKEN) {
  console.error('ALEX_BOT_TOKEN is not set');
  process.exit(1);
}

app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

// Módulos
const { analyzeTask, detectIntent } = require('./lib/ai-analyzer');
const conversation = require('./lib/conversation');
const { logTaskCreation } = require('./lib/supabase');
const { createTelegramClient, priorityKeyboard, clientKeyboard, dateKeyboard, assigneeKeyboard, PRIORITY_LABELS } = require('./lib/telegram');
const clickup = require('./lib/clickup');
const clickupNotifier = require('./lib/clickup-notifier');
const googleCalendar = require('./lib/google-calendar');
const contactsDb = require('./lib/contacts-db');
const clientOnboarding = require('./lib/client-onboarding');

// Super Alex 2.0 — Inteligencia Conversacional
const alexMemory = require('./lib/alex-memory');
const alexBrain = require('./lib/alex-brain');
const alexContext = require('./lib/alex-context');

// Telegram client do Alex (usa ALEX_BOT_TOKEN, não o default)
const telegram = createTelegramClient(ALEX_BOT_TOKEN);

// Variáveis globais de cache
let CACHED_STATUSES = [];
let CLIENT_OPTIONS = [];

/**
 * Busca email de um contato no banco de dados
 */
function findContactEmail(name) {
  return contactsDb.resolveEmail(name);
}

/**
 * Resolve participantes: converte nomes em emails via banco de dados
 */
function resolveParticipants(participants) {
  const resolved = [];
  const names = [];

  for (const p of participants) {
    if (p.includes('@')) {
      resolved.push(p);
    } else {
      const contact = contactsDb.resolveEmail(p);
      if (contact) {
        resolved.push(contact.email);
        names.push(`${contact.fullName} (${contact.email})`);
      } else {
        names.push(p);
      }
    }
  }

  return { resolved, names };
}

// State para onboarding multi-step
const onboardingState = new Map();

// State para agendamento interativo de reuniões
const schedulingState = new Map();

// Contexto da última interação do bot (para continuidade conversacional)
// Exemplo: { type: 'asked_contact', name: 'Dr. Enio', timestamp: Date.now() }
const lastBotContext = new Map();
const CONTEXT_EXPIRY_MS = 5 * 60 * 1000; // 5 minutos

function setLastBotContext(chatId, context) {
  lastBotContext.set(String(chatId), { ...context, timestamp: Date.now() });
}

function getLastBotContext(chatId) {
  const ctx = lastBotContext.get(String(chatId));
  if (!ctx) return null;
  if (Date.now() - ctx.timestamp > CONTEXT_EXPIRY_MS) {
    lastBotContext.delete(String(chatId));
    return null;
  }
  return ctx;
}

function clearLastBotContext(chatId) {
  lastBotContext.delete(String(chatId));
}

/**
 * Detecta se o texto é sobre agendamento de reunião
 * Precisa de pelo menos 1 keyword + 1 verbo (ou keyword sozinha se forte)
 */
function isSchedulingIntent(text) {
  const norm = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const keywords = ['reuniao', 'meeting', 'call', 'bloquei'];
  const verbs = ['marque', 'marca', 'marcar', 'agende', 'agenda', 'agendar', 'bloqueia', 'bloquei', 'bloquear', 'cria', 'crie', 'criar', 'faz', 'faca', 'fazer', 'bota', 'botar', 'coloca', 'colocar', 'coloque', 'adiciona', 'adicione', 'adicionar'];
  const strongPatterns = ['agenda reuniao', 'agendar reuniao', 'agendar call', 'agendar meeting', 'marca reuniao', 'marcar reuniao', 'cria reuniao', 'criar reuniao', 'crie reuniao', 'crie uma reuniao', 'cria uma call', 'cria uma reuniao', 'cria call', 'crie uma call', 'reuniao recorrente', 'reuniao toda', 'reuniao semanal'];
  // Strong pattern match — dispara sozinho
  if (strongPatterns.some(p => norm.includes(p))) return true;
  // Keyword + verb match
  const hasKeyword = keywords.some(k => norm.includes(k));
  const hasVerb = verbs.some(v => norm.includes(v));
  return hasKeyword && hasVerb;
}

/**
 * Converte recurrence do Groq (weekly/biweekly/monthly/daily) + day (MO/TU/...) em RRULE
 */
function buildRecurrenceRule(recurrence, day) {
  if (!recurrence) return null;
  const dayMap = { MO: 'MO', TU: 'TU', WE: 'WE', TH: 'TH', FR: 'FR', SA: 'SA', SU: 'SU' };
  const byDay = day && dayMap[day] ? `;BYDAY=${dayMap[day]}` : '';

  switch (recurrence) {
    case 'weekly': return `RRULE:FREQ=WEEKLY${byDay}`;
    case 'biweekly': return `RRULE:FREQ=WEEKLY;INTERVAL=2${byDay}`;
    case 'monthly': return 'RRULE:FREQ=MONTHLY';
    case 'daily': return 'RRULE:FREQ=DAILY';
    default: return null;
  }
}

/**
 * Label legível para recorrência
 */
function getRecurrenceLabel(recurrence, day) {
  if (!recurrence) return null;
  const dayNames = { MO: 'segunda', TU: 'terça', WE: 'quarta', TH: 'quinta', FR: 'sexta', SA: 'sábado', SU: 'domingo' };
  const dayLabel = day && dayNames[day] ? ` (toda ${dayNames[day]})` : '';

  switch (recurrence) {
    case 'weekly': return `Semanal${dayLabel}`;
    case 'biweekly': return `Quinzenal${dayLabel}`;
    case 'monthly': return 'Mensal';
    case 'daily': return 'Diário';
    default: return null;
  }
}

// ============================================================
// Sync contatos → CLIENTES-CONFIG.json (bidirecional)
// ============================================================
const CLIENTS_CONFIG_PATH = path.resolve(__dirname, '..', 'docs', 'clientes', 'CLIENTES-CONFIG.json');

function syncContactToConfig(contactName, updates) {
  try {
    if (!fs.existsSync(CLIENTS_CONFIG_PATH)) return;
    const config = JSON.parse(fs.readFileSync(CLIENTS_CONFIG_PATH, 'utf-8'));

    // Buscar cliente pelo nome (fuzzy)
    const norm = contactName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const cleaned = norm.replace(/^(dr|dra|prof)\s*\.?\s*/i, '').trim();

    for (const [key, client] of Object.entries(config.clients || {})) {
      const clientNorm = client.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const clientCleaned = clientNorm.replace(/^(dr|dra|prof)\s*\.?\s*/i, '').trim();

      if (clientCleaned.includes(cleaned) || cleaned.includes(clientCleaned)) {
        if (!client.contact) client.contact = {};
        if (updates.instagram) client.contact.instagram = updates.instagram;
        if (updates.email) client.contact.email = updates.email;
        if (updates.phone) client.contact.phone = updates.phone;

        fs.writeFileSync(CLIENTS_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
        console.log(`📇 Config sync: ${client.name} atualizado (${Object.keys(updates).join(', ')})`);
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('Error syncing contact to config:', err.message);
    return false;
  }
}

// ============================================================
// Health check
// ============================================================
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'alex-project-manager',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// API de Contatos (dashboard em tempo real)
// ============================================================
app.get('/api/contacts', (req, res) => {
  try {
    const contacts = contactsDb.listAll();
    res.json({ contacts, total: contacts.length, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contacts/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ contacts: [] });
    const contacts = contactsDb.findByName(q);
    res.json({ contacts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contacts/client/:clientKey', (req, res) => {
  try {
    const contacts = contactsDb.getClientContacts(req.params.clientKey);
    res.json({ contacts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard de Contatos (HTML)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'alex-dashboard.html'));
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

// ============================================================
// Helpers para formatação
// ============================================================
function formatTask(task) {
  const title = task.name || 'Sem título';
  const status = task.status?.status || 'Desconhecido';
  const priority = getPriorityEmoji(task.priority);
  const dueDateText = task.due_date
    ? new Date(task.due_date).toLocaleDateString('pt-BR')
    : 'Sem prazo';

  return {
    id: task.id,
    title,
    status,
    priority,
    dueDateText,
    dueDate: task.due_date,
    description: task.description ? task.description.substring(0, 100) : '',
  };
}

function getPriorityEmoji(priority) {
  if (!priority) return '⚪';
  if (priority === 1) return '🔴';
  if (priority === 2) return '🟠';
  if (priority === 3) return '🟡';
  if (priority === 4) return '🔵';
  return '⚪';
}

function formatTaskDetail(task) {
  const formatted = formatTask(task);
  let msg = `📌 *${formatted.title}*\n\n`;
  msg += `Status: ${formatted.status}\n`;
  msg += `Prioridade: ${formatted.priority}\n`;
  msg += `Prazo: ${formatted.dueDateText}\n`;

  if (formatted.description) {
    msg += `Descrição: ${formatted.description}...\n`;
  }

  msg += `\n🔗 [Abrir no ClickUp](${task.url || 'https://app.clickup.com'})`;

  return msg;
}

function priorityFromString(str) {
  const map = { urgent: 1, high: 2, normal: 3, low: 4 };
  return map[str] || 3;
}

function parseDate(text) {
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

// ============================================================
// Telegram file & audio helpers
// ============================================================
async function downloadTelegramFile(fileId) {
  const info = await telegram.getFileUrl(fileId);
  if (!info) throw new Error('Failed to get file info');
  const fileRes = await fetch(info.fileUrl);
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
// Agendamento de reuniões — parser de linguagem natural
// ============================================================
function parseScheduleRequest(text) {
  const norm = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const emails = [...new Set(text.match(emailRegex) || [])];

  let durationMinutes = 60;
  if (norm.includes('meia hora')) {
    durationMinutes = 30;
  } else {
    const durH = norm.match(/(?:(?:vai\s+)?durar?|por)\s+(\d+)\s*h(?:ora)?s?(?:\s*(?:e\s*)?(\d+)\s*min(?:uto)?s?)?/);
    const durM = norm.match(/(?:(?:vai\s+)?durar?|por)\s+(\d+)\s*min(?:uto)?s?/);
    if (durH) {
      durationMinutes = parseInt(durH[1]) * 60 + parseInt(durH[2] || 0);
      if (durationMinutes === 0) durationMinutes = 60;
    } else if (durM) {
      durationMinutes = parseInt(durM[1]);
    }
  }

  const now = new Date();
  let targetDate = new Date(now);

  const dateSlash = norm.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dateSlash) {
    const dy = parseInt(dateSlash[1]);
    const mo = parseInt(dateSlash[2]) - 1;
    const yr = dateSlash[3]
      ? parseInt(dateSlash[3].length === 2 ? '20' + dateSlash[3] : dateSlash[3])
      : now.getFullYear();
    targetDate = new Date(yr, mo, dy);
  } else if (norm.includes('amanha')) {
    targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 1);
  } else {
    const weekdays = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
    for (const [name, wd] of Object.entries(weekdays)) {
      if (norm.includes(name)) {
        const diff = ((wd - now.getDay() + 7) % 7) || 7;
        targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + diff);
        break;
      }
    }
  }

  let hours = 14;
  let minutes = 0;
  const timeMatch = norm.match(/as?\s+(\d{1,2})(?:[h:](\d{2}))?h?(?:\s*h(?:oras?)?)?/);
  if (timeMatch) {
    hours = parseInt(timeMatch[1]);
    minutes = parseInt(timeMatch[2] || 0);
  }

  const y = targetDate.getFullYear();
  const M = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  const h = String(hours).padStart(2, '0');
  const mi = String(minutes).padStart(2, '0');
  const startTime = `${y}-${M}-${d}T${h}:${mi}:00-03:00`;

  const titleMatch = text.match(/reuni[aã]o\s+(?:de\s+|sobre\s+)?([^,.\n0-9@]+?)(?=\s+(?:dia\b|as\b|às\b|amanha|amanhã|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|com\s|por\s|que\s|\d{1,2}[\/h]))/i);
  const title = titleMatch ? titleMatch[1].trim() : null;

  return { startTime, durationMinutes, emails, title };
}

// ============================================================
// Agendamento interativo — state machine completa
// ============================================================

function getSchedulingState(chatId) {
  return schedulingState.get(String(chatId));
}

function setSchedulingState(chatId, state) {
  schedulingState.set(String(chatId), { ...state, updatedAt: Date.now() });
}

function clearSchedulingState(chatId) {
  schedulingState.delete(String(chatId));
}

async function startSchedulingFlow(chatId) {
  setSchedulingState(chatId, {
    step: 'CHOOSE_MODE',
    participants: [],
    title: null,
    startTime: null,
    durationMinutes: 60,
  });

  await telegram.sendInlineKeyboard(chatId,
    `📅 *Agendar Reunião*\n\nComo você quer escolher o horário?`,
    [
      [{ text: '📋 Ver horários livres', callback_data: 'sched:mode:slots' }],
      [{ text: '✏️ Escolher data/hora', callback_data: 'sched:mode:custom' }],
      [{ text: '❌ Cancelar', callback_data: 'sched:cancel' }],
    ]
  );
}

async function showAvailableSlots(chatId) {
  await telegram.sendMessage(chatId, '⏳ Buscando horários livres...');

  const slots = await googleCalendar.suggestNextSlots(6);

  if (slots.length === 0) {
    await telegram.sendMessage(chatId, '😕 Não encontrei horários livres nos próximos 14 dias.');
    clearSchedulingState(chatId);
    return;
  }

  const buttons = slots.map(s => ([
    { text: `📅 ${s.label}`, callback_data: `sched:slot:${s.startTime}` },
  ]));
  buttons.push([{ text: '❌ Cancelar', callback_data: 'sched:cancel' }]);

  await telegram.sendInlineKeyboard(chatId,
    '📋 *Próximos horários livres:*\nEscolha um:',
    buttons
  );
}

async function askCustomDate(chatId) {
  setSchedulingState(chatId, { ...getSchedulingState(chatId), step: 'ASK_DATE' });

  await telegram.sendMessage(chatId,
    `✏️ *Digite a data desejada:*\n\n` +
    `Exemplos:\n` +
    `• _15/03_ ou _15/03/2026_\n` +
    `• _amanhã_\n` +
    `• _segunda_, _terça_, _quinta_...\n\n` +
    `/cancel para cancelar`
  );
}

async function showTimeSlotsForDate(chatId, targetDate) {
  await telegram.sendMessage(chatId, '⏳ Verificando horários disponíveis...');

  const slots = await googleCalendar.getSlotsForDate(targetDate);

  if (slots.length === 0) {
    const dateStr = targetDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    await telegram.sendMessage(chatId, `😕 Nenhum horário livre em ${dateStr}. Tente outra data.`);
    await askCustomDate(chatId);
    return;
  }

  const state = getSchedulingState(chatId);
  setSchedulingState(chatId, { ...state, step: 'PICK_TIME', selectedDate: targetDate.toISOString() });

  const buttons = slots.map(s => ([
    { text: `🕐 ${s.time}`, callback_data: `sched:time:${s.startTime}` },
  ]));
  buttons.push([{ text: '❌ Cancelar', callback_data: 'sched:cancel' }]);

  const dateStr = targetDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  await telegram.sendInlineKeyboard(chatId,
    `📅 *Horários livres em ${dateStr}:*`,
    buttons
  );
}

async function askParticipants(chatId) {
  const state = getSchedulingState(chatId);
  setSchedulingState(chatId, { ...state, step: 'ASK_PARTICIPANTS' });

  await telegram.sendInlineKeyboard(chatId,
    `👥 *Participantes*\n\nDeseja adicionar alguém à reunião?`,
    [
      [{ text: '➕ Adicionar participante', callback_data: 'sched:add_participant' }],
      [{ text: '➡️ Sem participantes', callback_data: 'sched:skip_participants' }],
      [{ text: '❌ Cancelar', callback_data: 'sched:cancel' }],
    ]
  );
}

async function askTitle(chatId) {
  const state = getSchedulingState(chatId);
  setSchedulingState(chatId, { ...state, step: 'ASK_TITLE' });

  await telegram.sendInlineKeyboard(chatId,
    `📝 *Qual o assunto desta reunião?*\n\nDigite o título (ex: "Alinhamento de campanha", "Reunião de vendas"):`,
    [
      [{ text: '❌ Cancelar', callback_data: 'sched:cancel' }],
    ]
  );
}

async function askDescription(chatId) {
  const state = getSchedulingState(chatId);
  setSchedulingState(chatId, { ...state, step: 'ASK_DESCRIPTION' });

  await telegram.sendInlineKeyboard(chatId,
    `📋 *O que será tratado nessa reunião?*\n\nDescreva brevemente a pauta (ex: "Revisar resultados da campanha de março"):`,
    [
      [{ text: '⏩ Pular', callback_data: 'sched:skip_description' }],
      [{ text: '❌ Cancelar', callback_data: 'sched:cancel' }],
    ]
  );
}

/**
 * Verifica conflitos antes de mostrar confirmação.
 * Se houver conflito, mostra aviso com opções (remover evento / outro horário).
 */
async function checkConflictsAndConfirm(chatId) {
  const state = getSchedulingState(chatId);
  if (!state || !state.startTime) {
    await showSchedulingConfirmation(chatId);
    return;
  }

  const start = new Date(state.startTime);
  const end = new Date(start.getTime() + (state.durationMinutes || 60) * 60 * 1000);

  const conflicts = await googleCalendar.getEventsInRange(start, end);

  if (conflicts.length === 0) {
    await showSchedulingConfirmation(chatId);
    return;
  }

  // Montar lista de conflitos
  const conflictList = conflicts.map(ev => {
    const evStart = new Date(ev.start.dateTime || ev.start.date);
    const evEnd = new Date(ev.end.dateTime || ev.end.date);
    const startStr = evStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const endStr = evEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `• *${ev.summary || 'Sem título'}* (${startStr} — ${endStr})`;
  }).join('\n');

  const dateStr = start.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  const timeStr = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Salvar IDs dos conflitos no state para poder removê-los
  state.conflictEventIds = conflicts.map(ev => ev.id);
  state.step = 'CONFLICT';
  setSchedulingState(chatId, state);

  let msg = `⚠️ *Conflito de horário!*\n\n`;
  msg += `Você quer agendar em *${dateStr}* às *${timeStr}*, mas já existe(m):\n\n`;
  msg += conflictList;
  msg += `\n\nO que deseja fazer?`;

  const buttons = [
    [{ text: '🗑️ Remover evento(s) existente(s) e agendar', callback_data: 'sched:remove_conflict' }],
    [{ text: '🔄 Escolher outro horário', callback_data: 'sched:other_time' }],
    [{ text: '📅 Agendar mesmo assim (sobrepor)', callback_data: 'sched:force_confirm' }],
    [{ text: '❌ Cancelar', callback_data: 'sched:cancel' }],
  ];

  await telegram.sendInlineKeyboard(chatId, msg, buttons);
}

async function showSchedulingConfirmation(chatId) {
  const state = getSchedulingState(chatId);
  setSchedulingState(chatId, { ...state, step: 'CONFIRM' });

  const start = new Date(state.startTime);
  const end = new Date(start.getTime() + state.durationMinutes * 60 * 1000);

  const dateStr = start.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  const startStr = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const endStr = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const h = Math.floor(state.durationMinutes / 60);
  const m = state.durationMinutes % 60;
  const durStr = h > 0 ? `${h}h${m > 0 ? m + 'min' : ''}` : `${m}min`;

  let msg = `📅 *Confirme a reunião:*\n\n`;
  msg += `📌 Título: *${state.title || 'Reunião'}*\n`;
  if (state.description) {
    msg += `📋 Pauta: _${state.description}_\n`;
  }
  msg += `📅 Data: ${dateStr}\n`;
  msg += `🕐 Horário: ${startStr} — ${endStr}\n`;
  msg += `⏱ Duração: ${durStr}\n`;

  if (state.recurrenceLabel) {
    msg += `🔁 Recorrência: *${state.recurrenceLabel}*\n`;
  }

  if (state.participants.length > 0) {
    msg += `👥 Participantes:\n`;
    state.participants.forEach(p => {
      if (p.includes('@')) {
        msg += `  • ${p} ✉️\n`;
      } else {
        const contact = findContactEmail(p);
        if (contact) {
          msg += `  • ${contact.fullName} (${contact.email}) ✉️\n`;
        } else {
          msg += `  • ${p} _(sem email)_\n`;
        }
      }
    });
  } else {
    msg += `👤 Sem participantes (bloqueio de agenda)\n`;
  }

  await telegram.sendInlineKeyboard(chatId, msg, [
    [{ text: '✅ Confirmar', callback_data: 'sched:confirm' }],
    [{ text: '❌ Cancelar', callback_data: 'sched:cancel' }],
  ]);
}

async function executeScheduling(chatId) {
  const state = getSchedulingState(chatId);
  if (!state) return;

  await telegram.sendMessage(chatId, '⏳ Agendando no Google Calendar...');

  // Resolver participantes: nomes conhecidos → emails, desconhecidos → descrição
  const { resolved: resolvedEmails, names: unresolvedNames } = resolveParticipants(state.participants);

  // Incluir nomes sem email no título
  let eventTitle = state.title || 'Reunião';
  const namesWithoutEmail = state.participants.filter(p => !p.includes('@') && !findContactEmail(p));
  if (namesWithoutEmail.length > 0) {
    eventTitle += ` com ${namesWithoutEmail.join(', ')}`;
  }

  // Descrição: pauta da reunião + participantes sem email
  let eventDescription = '';
  if (state.description) {
    eventDescription = `📋 Pauta: ${state.description}`;
  }
  if (unresolvedNames.length > 0) {
    eventDescription += (eventDescription ? '\n\n' : '') + `Participantes: ${unresolvedNames.join(', ')}`;
  }

  const result = await googleCalendar.createEvent({
    title: eventTitle,
    startTime: state.startTime,
    durationMinutes: state.durationMinutes,
    description: eventDescription || undefined,
    attendees: resolvedEmails.length > 0 ? resolvedEmails : undefined,
    recurrence: state.recurrence || undefined,
  });

  clearSchedulingState(chatId);

  if (result.success) {
    const start = new Date(state.startTime);
    const end = new Date(start.getTime() + state.durationMinutes * 60 * 1000);
    const dateStr = start.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    const startStr = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const endStr = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let msg = `✅ *Reunião agendada!*\n\n`;
    msg += `📌 ${state.title || 'Reunião'}\n`;
    msg += `📅 ${dateStr}\n`;
    msg += `🕐 ${startStr} — ${endStr}\n`;
    if (state.recurrenceLabel) {
      msg += `🔁 ${state.recurrenceLabel}\n`;
    }
    if (state.participants.length > 0) {
      msg += `👥 ${state.participants.join(', ')}\n`;
    }
    if (result.meetLink) {
      msg += `\n📹 [Entrar no Google Meet](${result.meetLink})`;
    }
    if (result.htmlLink) {
      msg += `\n🔗 [Ver no Google Calendar](${result.htmlLink})`;
    }

    await telegram.sendMessage(chatId, msg);
  } else {
    await telegram.sendMessage(chatId, `❌ Erro ao agendar: ${result.error}`);
  }
}

/**
 * Usa Groq para extrair intenção de agendamento e dados estruturados do texto
 */
async function parseScheduleWithAI(text) {
  if (!GROQ_API_KEY) return null;

  try {
    const today = new Date();
    const todayStr = today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

    // Gerar calendário dos próximos 14 dias para evitar erro de cálculo do LLM
    const weekdays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const upcomingDays = [];
    for (let i = 0; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = i === 0 ? 'HOJE' : i === 1 ? 'AMANHÃ' : weekdays[d.getDay()];
      upcomingDays.push(`${label}: ${iso} (${weekdays[d.getDay()]})`);
    }
    const calendarRef = upcomingDays.join('\n');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Você é um parser de agendamento. Hoje é ${todayStr}. Extraia dados de agendamento do texto do usuário. Responda APENAS com JSON válido, sem markdown.

CALENDÁRIO DE REFERÊNCIA (use EXATAMENTE estas datas):
${calendarRef}

Formato:
{
  "is_scheduling": true/false,
  "date": "YYYY-MM-DD" ou null,
  "time": "HH:MM" ou null,
  "duration_minutes": number ou 60,
  "participants": ["email@..." ou "Nome da pessoa"] ou [],
  "title": "string" ou null,
  "recurrence": "weekly" | "biweekly" | "monthly" | "daily" | null,
  "recurrence_day": "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU" | null
}

Regras:
- "amanhã" = dia seguinte a hoje (use o calendário acima)
- "segunda/terça/quarta/quinta/sexta" = use o calendário acima para encontrar a data EXATA
- Se não houver hora, retorne null
- Aceite formatos: "15h", "às 15h", "15:00", "3 da tarde"
- Extraia emails se presentes
- Extraia título se mencionado (ex: "reunião de alinhamento" → "Alinhamento")
- Se o texto NÃO for sobre agendamento, retorne is_scheduling: false
- RECORRÊNCIA: se mencionado "toda semana", "semanal", "toda segunda", "recorrente" → preencha recurrence
  - "toda quinta" → recurrence: "weekly", recurrence_day: "TH"
  - "quinzenal" → recurrence: "biweekly"
  - "mensal" → recurrence: "monthly"
  - "todo dia" → recurrence: "daily"
  - Dias: segunda=MO, terça=TU, quarta=WE, quinta=TH, sexta=FR, sábado=SA, domingo=SU
- Se for recorrente e o dia for especificado (ex: "toda quinta"), date deve ser a PRÓXIMA ocorrência desse dia`
          },
          { role: 'user', content: text }
        ],
        temperature: 0,
        max_tokens: 300,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    return JSON.parse(content);
  } catch (err) {
    console.error('Error parsing schedule with AI:', err.message);
    return null;
  }
}

/**
 * Handler para agendamento via linguagem natural
 * Tenta IA primeiro, fallback para regex
 */
/**
 * Trata correções/complementos a um agendamento já em andamento.
 * Ex: "não, é às 8 da noite" ou "com o Dr. Enio" após já ter iniciado.
 */
async function handleScheduleCorrection(chatId, text, existingState) {
  await telegram.sendMessage(chatId, '🔄 Atualizando agendamento...');

  // Re-parsear a mensagem para extrair novos dados
  let parsed = await parseScheduleWithAI(text);

  if (!parsed || !parsed.is_scheduling) {
    const regexParsed = parseScheduleRequest(text);
    parsed = {
      is_scheduling: true,
      date: null,
      time: null,
      duration_minutes: regexParsed.durationMinutes,
      participants: regexParsed.emails,
      title: regexParsed.title,
    };
    if (regexParsed.startTime) {
      const dt = new Date(regexParsed.startTime);
      if (!isNaN(dt.getTime())) {
        parsed.date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        parsed.time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      }
    }
  }

  // Mesclar: manter dados existentes, sobrescrever apenas o que foi mencionado na correção
  if (parsed.date && parsed.time) {
    const startTime = `${parsed.date}T${parsed.time}:00`;
    const start = new Date(startTime);
    if (start > new Date()) {
      existingState.startTime = start.toISOString();
    } else {
      await telegram.sendMessage(chatId, '⚠️ Esse horário já passou. Escolha um horário futuro.');
      await startSchedulingFlow(chatId);
      return;
    }
  } else if (parsed.date && !parsed.time && existingState.startTime) {
    // Corrigiu só a data, manter o horário existente
    const oldStart = new Date(existingState.startTime);
    const newDate = new Date(parsed.date + 'T12:00:00');
    const corrected = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), oldStart.getHours(), oldStart.getMinutes());
    existingState.startTime = corrected.toISOString();
  } else if (!parsed.date && parsed.time && existingState.startTime) {
    // Corrigiu só o horário, manter a data existente
    const oldStart = new Date(existingState.startTime);
    const [h, m] = parsed.time.split(':').map(Number);
    const corrected = new Date(oldStart.getFullYear(), oldStart.getMonth(), oldStart.getDate(), h, m);
    if (corrected > new Date()) {
      existingState.startTime = corrected.toISOString();
    }
  }

  if (parsed.duration_minutes && parsed.duration_minutes !== 60) {
    existingState.durationMinutes = parsed.duration_minutes;
  }
  if (parsed.participants && parsed.participants.length > 0) {
    existingState.participants = [...new Set([...(existingState.participants || []), ...parsed.participants])];
  }
  if (parsed.title) {
    existingState.title = parsed.title;
  }

  const recurrenceRule = buildRecurrenceRule(parsed.recurrence, parsed.recurrence_day);
  if (recurrenceRule) {
    existingState.recurrence = recurrenceRule;
    existingState.recurrenceLabel = getRecurrenceLabel(parsed.recurrence, parsed.recurrence_day);
  }

  // Se agora temos data+hora → ir pra confirmação (perguntar descrição primeiro se não tem)
  if (existingState.startTime) {
    if (!existingState.title) {
      existingState.step = 'ASK_TITLE';
      setSchedulingState(chatId, existingState);
      await askTitle(chatId);
    } else if (!existingState.description) {
      existingState.step = 'ASK_DESCRIPTION';
      setSchedulingState(chatId, existingState);
      await askDescription(chatId);
    } else {
      existingState.step = 'CONFIRM';
      setSchedulingState(chatId, existingState);
      await checkConflictsAndConfirm(chatId);
    }
    return;
  }

  // Ainda faltam dados → voltar ao fluxo interativo
  setSchedulingState(chatId, existingState);
  await startSchedulingFlow(chatId);
}

async function handleScheduleNLP(chatId, text) {
  // Se já existe um agendamento em andamento, tratar como correção
  const existingState = getSchedulingState(chatId);
  if (existingState) {
    await handleScheduleCorrection(chatId, text, existingState);
    return;
  }

  await telegram.sendMessage(chatId, '📅 Processando agendamento...');

  // Tentar AI parse
  let parsed = await parseScheduleWithAI(text);

  if (!parsed || !parsed.is_scheduling) {
    // Fallback: usar regex parser existente
    const regexParsed = parseScheduleRequest(text);
    parsed = {
      is_scheduling: true,
      date: null,
      time: null,
      duration_minutes: regexParsed.durationMinutes,
      participants: regexParsed.emails,
      title: regexParsed.title,
    };
    // Extrair date/time do startTime do regex
    if (regexParsed.startTime) {
      const dt = new Date(regexParsed.startTime);
      if (!isNaN(dt.getTime())) {
        parsed.date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        parsed.time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      }
    }
  }

  // Se temos data + hora → ir direto pra confirmação
  if (parsed.date && parsed.time) {
    const startTime = `${parsed.date}T${parsed.time}:00`;
    const start = new Date(startTime);

    // Validar que não é no passado
    if (start <= new Date()) {
      await telegram.sendMessage(chatId, '⚠️ Esse horário já passou. Escolha um horário futuro.');
      await startSchedulingFlow(chatId);
      return;
    }

    // Construir RRULE se recorrente
    const recurrenceRule = buildRecurrenceRule(parsed.recurrence, parsed.recurrence_day);

    setSchedulingState(chatId, {
      step: 'ASK_TITLE',
      startTime: start.toISOString(),
      durationMinutes: parsed.duration_minutes || 60,
      participants: parsed.participants || [],
      title: parsed.title || null,
      description: null,
      recurrence: recurrenceRule,
      recurrenceLabel: getRecurrenceLabel(parsed.recurrence, parsed.recurrence_day),
    });

    // Se não tem título → perguntar título
    if (!parsed.title) {
      await askTitle(chatId);
      return;
    }

    // Tem título → perguntar descrição/pauta
    await askDescription(chatId);
    return;
  }

  // Se temos data mas não hora → mostrar slots do dia
  if (parsed.date && !parsed.time) {
    const targetDate = new Date(parsed.date + 'T12:00:00');
    const recurrenceRule = buildRecurrenceRule(parsed.recurrence, parsed.recurrence_day);
    setSchedulingState(chatId, {
      step: 'PICK_TIME',
      durationMinutes: parsed.duration_minutes || 60,
      participants: parsed.participants || [],
      title: parsed.title || null,
      recurrence: recurrenceRule,
      recurrenceLabel: getRecurrenceLabel(parsed.recurrence, parsed.recurrence_day),
    });
    await showTimeSlotsForDate(chatId, targetDate);
    return;
  }

  // Faltam dados → iniciar fluxo interativo
  const recurrenceRule = buildRecurrenceRule(parsed.recurrence, parsed.recurrence_day);
  setSchedulingState(chatId, {
    step: 'CHOOSE_MODE',
    durationMinutes: parsed.duration_minutes || 60,
    participants: parsed.participants || [],
    title: parsed.title || null,
    recurrence: recurrenceRule,
    recurrenceLabel: getRecurrenceLabel(parsed.recurrence, parsed.recurrence_day),
  });
  await startSchedulingFlow(chatId);
}

/**
 * Handler de texto durante fluxo de agendamento
 */
async function handleSchedulingText(chatId, text, state) {
  switch (state.step) {
    case 'ASK_DATE': {
      // Parse da data digitada
      const norm = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      let targetDate = null;
      const now = new Date();

      // Tentar DD/MM ou DD/MM/AAAA
      const dateSlash = norm.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/);
      if (dateSlash) {
        const dy = parseInt(dateSlash[1]);
        const mo = parseInt(dateSlash[2]) - 1;
        const yr = dateSlash[3]
          ? parseInt(dateSlash[3].length === 2 ? '20' + dateSlash[3] : dateSlash[3])
          : now.getFullYear();
        targetDate = new Date(yr, mo, dy);
      } else if (norm === 'amanha' || norm === 'amanhã') {
        targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + 1);
      } else if (norm === 'hoje') {
        targetDate = new Date(now);
      } else {
        const weekdays = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
        for (const [name, wd] of Object.entries(weekdays)) {
          if (norm.includes(name)) {
            const diff = ((wd - now.getDay() + 7) % 7) || 7;
            targetDate = new Date(now);
            targetDate.setDate(targetDate.getDate() + diff);
            break;
          }
        }
      }

      if (!targetDate || isNaN(targetDate.getTime())) {
        await telegram.sendMessage(chatId, '⚠️ Não entendi a data. Use DD/MM, "amanhã" ou o dia da semana (ex: quinta).');
        return;
      }

      await showTimeSlotsForDate(chatId, targetDate);
      break;
    }

    case 'ASK_PARTICIPANTS': {
      // Extrair email(s) do texto
      const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
      const emails = [...new Set(text.match(emailRegex) || [])];

      if (emails.length === 0) {
        await telegram.sendMessage(chatId, '⚠️ Não encontrei email válido. Digite um email (ex: joao@email.com) ou clique "Sem participantes".');
        return;
      }

      state.participants = [...(state.participants || []), ...emails];
      setSchedulingState(chatId, state);

      const participantList = state.participants.map(p => `  • ${p}`).join('\n');
      await telegram.sendInlineKeyboard(chatId,
        `👥 *Participantes:*\n${participantList}\n\nAdicionar mais?`,
        [
          [{ text: '➕ Adicionar mais', callback_data: 'sched:add_participant' }],
          [{ text: '➡️ Continuar', callback_data: 'sched:skip_participants' }],
          [{ text: '❌ Cancelar', callback_data: 'sched:cancel' }],
        ]
      );
      break;
    }

    case 'ASK_TITLE': {
      const title = text.trim();
      if (title.length > 0 && title !== '/cancel') {
        state.title = title;
        setSchedulingState(chatId, state);
      }
      // Após título, perguntar descrição/pauta
      await askDescription(chatId);
      break;
    }

    case 'ASK_DESCRIPTION': {
      const desc = text.trim();
      if (desc.length > 0 && desc !== '/cancel') {
        state.description = desc;
        setSchedulingState(chatId, state);
      }
      await checkConflictsAndConfirm(chatId);
      break;
    }

    default:
      break;
  }
}

/**
 * Handler de callbacks sched:* no handleCallbackQuery
 */
async function handleSchedulingCallback(chatId, queryId, action, value, messageId) {
  const state = getSchedulingState(chatId);

  switch (action) {
    case 'mode': {
      if (value === 'slots') {
        await telegram.answerCallbackQuery(queryId, 'Buscando...');
        await showAvailableSlots(chatId);
      } else if (value === 'custom') {
        await telegram.answerCallbackQuery(queryId);
        await askCustomDate(chatId);
      }
      break;
    }

    case 'slot': {
      // value = ISO startTime do slot
      if (!state) { await telegram.answerCallbackQuery(queryId, 'Sessão expirada.'); return; }
      state.startTime = value;
      setSchedulingState(chatId, state);
      await telegram.answerCallbackQuery(queryId, 'Horário selecionado');
      await askParticipants(chatId);
      break;
    }

    case 'time': {
      // value = ISO startTime
      if (!state) { await telegram.answerCallbackQuery(queryId, 'Sessão expirada.'); return; }
      state.startTime = value;
      setSchedulingState(chatId, state);
      await telegram.answerCallbackQuery(queryId, 'Horário selecionado');
      await askParticipants(chatId);
      break;
    }

    case 'add_participant': {
      if (!state) { await telegram.answerCallbackQuery(queryId, 'Sessão expirada.'); return; }
      state.step = 'ASK_PARTICIPANTS';
      setSchedulingState(chatId, state);
      await telegram.answerCallbackQuery(queryId);
      await telegram.sendMessage(chatId, '📧 Digite o email do participante:');
      break;
    }

    case 'skip_participants': {
      if (!state) { await telegram.answerCallbackQuery(queryId, 'Sessão expirada.'); return; }
      await telegram.answerCallbackQuery(queryId, 'Sem participantes');
      await askTitle(chatId);
      break;
    }

    case 'skip_title': {
      if (!state) { await telegram.answerCallbackQuery(queryId, 'Sessão expirada.'); return; }
      state.title = null;
      setSchedulingState(chatId, state);
      await telegram.answerCallbackQuery(queryId);
      await askDescription(chatId);
      break;
    }

    case 'skip_description': {
      if (!state) { await telegram.answerCallbackQuery(queryId, 'Sessão expirada.'); return; }
      state.description = null;
      setSchedulingState(chatId, state);
      await telegram.answerCallbackQuery(queryId);
      await checkConflictsAndConfirm(chatId);
      break;
    }

    case 'confirm': {
      if (!state) { await telegram.answerCallbackQuery(queryId, 'Sessão expirada.'); return; }
      await telegram.answerCallbackQuery(queryId, 'Agendando...');
      await executeScheduling(chatId);
      break;
    }

    case 'remove_conflict': {
      if (!state) { await telegram.answerCallbackQuery(queryId, 'Sessão expirada.'); return; }
      await telegram.answerCallbackQuery(queryId, 'Removendo...');

      // Deletar eventos conflitantes
      const ids = state.conflictEventIds || [];
      let removed = 0;
      for (const eventId of ids) {
        const res = await googleCalendar.deleteEvent(eventId);
        if (res.success) removed++;
      }

      delete state.conflictEventIds;
      state.step = 'CONFIRM';
      setSchedulingState(chatId, state);

      await telegram.sendMessage(chatId, `🗑️ ${removed} evento(s) removido(s).`);
      await showSchedulingConfirmation(chatId);
      break;
    }

    case 'other_time': {
      if (!state) { await telegram.answerCallbackQuery(queryId, 'Sessão expirada.'); return; }
      await telegram.answerCallbackQuery(queryId);
      // Preservar participantes e título, voltar à seleção de horário
      delete state.startTime;
      delete state.conflictEventIds;
      setSchedulingState(chatId, state);
      await startSchedulingFlow(chatId);
      break;
    }

    case 'force_confirm': {
      if (!state) { await telegram.answerCallbackQuery(queryId, 'Sessão expirada.'); return; }
      await telegram.answerCallbackQuery(queryId);
      delete state.conflictEventIds;
      setSchedulingState(chatId, state);
      await showSchedulingConfirmation(chatId);
      break;
    }

    case 'cancel': {
      clearSchedulingState(chatId);
      await telegram.answerCallbackQuery(queryId, 'Cancelado');
      await telegram.editMessageText(chatId, messageId, '❌ Agendamento cancelado.');
      break;
    }

    default:
      await telegram.answerCallbackQuery(queryId, 'Opção não reconhecida');
  }
}

// ============================================================
// Fluxo interativo: listar tarefas
// ============================================================
async function startListFlow(chatId) {
  try {
    await telegram.sendMessage(chatId, '📋 Carregando tarefas...');

    const statuses = await clickup.getListStatuses();
    CACHED_STATUSES = statuses;

    const buttons = [
      [{ text: 'Todas', callback_data: 'list_filter:all' }],
      [{ text: 'Em andamento', callback_data: 'list_filter:in_progress' }],
      [{ text: 'Na fila', callback_data: 'list_filter:to_do' }],
      [{ text: 'Feitas', callback_data: 'list_filter:done' }],
    ];

    await telegram.sendInlineKeyboard(
      chatId,
      '🔍 Filtrar tarefas por status:',
      buttons
    );
  } catch (err) {
    console.error('Error starting list flow:', err);
    telegram.sendMessage(chatId, `❌ Erro ao listar tarefas: ${err.message}`);
  }
}

async function handleListFilter(chatId, messageId, filterType) {
  try {
    await telegram.sendMessage(chatId, '⏳ Buscando tarefas...');

    const statusMap = {
      all: null,
      in_progress: 'IN PROGRESS',
      to_do: 'TO DO',
      done: 'DONE',
    };

    const filters = {};
    if (statusMap[filterType]) {
      filters.statuses = [statusMap[filterType]];
    }

    const result = await clickup.listTasks(filters);
    const tasks = result.tasks || [];

    if (tasks.length === 0) {
      await telegram.sendMessage(chatId, '📭 Nenhuma tarefa encontrada com este filtro.');
      return;
    }

    const displayTasks = tasks.slice(0, 5);
    const buttons = displayTasks.map((task) => [
      {
        text: `${getPriorityEmoji(task.priority)} ${task.name.substring(0, 40)}`,
        callback_data: `task_select:${task.id}`,
      },
    ]);

    let msg = `📋 *Encontrei ${tasks.length} tarefa(s)*\n\n`;
    msg += `Mostrando as primeiras 5:\n\n`;
    displayTasks.forEach((task, idx) => {
      const status = task.status?.status || 'Desconhecido';
      msg += `${idx + 1}. ${getPriorityEmoji(task.priority)} ${task.name}\n`;
      msg += `   Status: ${status}\n`;
    });

    await telegram.sendInlineKeyboard(chatId, msg, buttons);
  } catch (err) {
    console.error('Error handling list filter:', err);
    telegram.sendMessage(chatId, `❌ Erro: ${err.message}`);
  }
}

async function handleTaskSelect(chatId, taskId) {
  try {
    const allTasks = await clickup.searchTasks(taskId);
    const task = allTasks.find((t) => t.id === taskId);

    if (!task) {
      await telegram.sendMessage(chatId, '❌ Tarefa não encontrada.');
      return;
    }

    const msg = formatTaskDetail(task);
    const buttons = [
      [{ text: '📝 Mudar Status', callback_data: `task_status_select:${taskId}` }],
      [{ text: '🔄 Voltar', callback_data: 'list_filter:all' }],
    ];

    await telegram.sendInlineKeyboard(chatId, msg, buttons);
  } catch (err) {
    console.error('Error handling task select:', err);
    telegram.sendMessage(chatId, `❌ Erro: ${err.message}`);
  }
}

async function handleTaskStatusSelect(chatId, taskId) {
  try {
    const statuses = CACHED_STATUSES || (await clickup.getListStatuses());

    if (statuses.length === 0) {
      await telegram.sendMessage(chatId, '❌ Não foi possível carregar os status disponíveis.');
      return;
    }

    const buttons = statuses.map((s) => [
      {
        text: s.status,
        callback_data: `task_status_change:${taskId}:${s.status}`,
      },
    ]);

    await telegram.sendInlineKeyboard(
      chatId,
      '📝 Selecione o novo status:',
      buttons
    );
  } catch (err) {
    console.error('Error handling task status select:', err);
    telegram.sendMessage(chatId, `❌ Erro: ${err.message}`);
  }
}

async function handleTaskStatusChange(chatId, taskId, newStatus) {
  try {
    await telegram.sendMessage(chatId, `⏳ Atualizando status para "${newStatus}"...`);

    const result = await clickup.updateTaskStatus(taskId, newStatus);

    if (result) {
      await telegram.sendMessage(
        chatId,
        `✅ Status atualizado com sucesso!\n🔄 Novo status: ${result.status}`
      );
      // Notificar grupo WhatsApp do cliente se concluído
      await clickupNotifier.notifyIfCompleted(taskId, newStatus);
    } else {
      await telegram.sendMessage(chatId, '❌ Não foi possível atualizar o status.');
    }
  } catch (err) {
    console.error('Error updating task status:', err);
    telegram.sendMessage(chatId, `❌ Erro: ${err.message}`);
  }
}

// ============================================================
// Handler de atualização de tarefas via conversa (Super Alex 2.0)
// ============================================================

async function handleTaskUpdate(chatId, text, intent) {
  try {
    const taskSearch = intent.taskSearch || intent.details || text;
    const newStatus = intent.newStatus || null;
    const newName = intent.newName || null;

    if (!taskSearch) {
      await telegram.sendMessage(chatId, '🤔 Qual tarefa voce quer atualizar? Me diz o nome ou parte dele.');
      return;
    }

    // Buscar tarefa no ClickUp
    await telegram.sendMessage(chatId, `🔍 Buscando tarefa "${taskSearch}"...`);
    const results = await clickup.searchTasks(taskSearch);

    if (!results || results.length === 0) {
      await telegram.sendMessage(chatId, `❌ Nenhuma tarefa encontrada com "${taskSearch}". Tente com outro nome.`);
      return;
    }

    // Se encontrou mais de uma, filtrar ativos
    const activeTasks = results.filter(t => {
      const status = t.status?.status?.toLowerCase();
      return status !== 'complete' && status !== 'closed';
    });

    const candidates = activeTasks.length > 0 ? activeTasks : results;

    if (candidates.length === 1) {
      // Match unico — executar direto
      const task = candidates[0];
      await executeTaskUpdate(chatId, task, { newStatus, newName });
    } else if (candidates.length <= 5) {
      // Poucas opcoes — mostrar botoes
      const keyboard = candidates.map(t => ([{
        text: `${t.status?.status || '?'} | ${t.name.substring(0, 40)}`,
        callback_data: `taskup:${t.id}:${newStatus || 'ask'}`,
      }]));
      keyboard.push([{ text: '❌ Cancelar', callback_data: 'taskup:cancel' }]);

      await telegram.sendInlineKeyboard(chatId,
        `📋 Encontrei ${candidates.length} tarefas. Qual voce quer atualizar?`,
        keyboard
      );
    } else {
      // Muitas opcoes — pedir especificar
      const topNames = candidates.slice(0, 5).map(t => `  - [${t.status?.status}] ${t.name}`).join('\n');
      await telegram.sendMessage(chatId,
        `📋 Encontrei ${candidates.length} tarefas. Especifique melhor:\n\n${topNames}\n\n... e mais ${candidates.length - 5}. Me diz o nome mais especifico.`
      );
    }
  } catch (err) {
    console.error('Error handling task update:', err.message);
    await telegram.sendMessage(chatId, '⚠️ Erro ao buscar/atualizar tarefa.');
  }
}

async function executeTaskUpdate(chatId, task, { newStatus, newName }) {
  try {
    let msg = '';

    if (newStatus) {
      const result = await clickup.updateTaskStatus(task.id, newStatus);
      if (result) {
        msg += `✅ Tarefa atualizada!\n\n📌 *${task.name}*\n📊 Status: ${task.status?.status} → *${newStatus}*`;
        console.log(`[Alex 2.0] Task update: ${task.name} → ${newStatus}`);
      } else {
        msg += `❌ Erro ao atualizar status da tarefa "${task.name}".`;
      }
    }

    if (newName) {
      await clickup.updateTaskName(task.id, newName);
      msg += msg ? '\n' : '';
      msg += `✏️ Nome atualizado: *${newName}*`;
      console.log(`[Alex 2.0] Task rename: ${task.name} → ${newName}`);
    }

    if (!newStatus && !newName) {
      // Nao especificou acao — perguntar
      const keyboard = [
        [{ text: '✅ Concluir', callback_data: `taskup:${task.id}:complete` }],
        [{ text: '🔄 Em andamento', callback_data: `taskup:${task.id}:andamento` }],
        [{ text: '⏳ Na fila', callback_data: `taskup:${task.id}:na fila` }],
        [{ text: '👁 Revisao', callback_data: `taskup:${task.id}:revisão` }],
        [{ text: '❌ Cancelar', callback_data: 'taskup:cancel' }],
      ];
      await telegram.sendInlineKeyboard(chatId,
        `📌 *${task.name}*\nStatus atual: ${task.status?.status || '?'}\n\nQual o novo status?`,
        keyboard
      );
      return;
    }

    if (msg) {
      await telegram.sendMessage(chatId, msg);
      alexMemory.addMessage(String(chatId), 'assistant', msg, { intent: 'task_update' });
    }
  } catch (err) {
    console.error('Error executing task update:', err.message);
    await telegram.sendMessage(chatId, `⚠️ Erro ao atualizar: ${err.message}`);
  }
}

// ============================================================
// Handlers para perguntas, ações e saudações
// ============================================================

/**
 * Responde perguntas e executa ações (consulta agenda, tarefas, etc.)
 */
async function handleQuestionOrAction(chatId, text, intent) {
  try {
    // Super Alex 2.0: contexto rico + brain hibrido
    const norm = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    // Coletar contexto completo em paralelo
    const context = await alexContext.gatherContext({ chatId: String(chatId), text, intent });

    // Adicionar contexto extra baseado no actionType (contatos, periodo especifico)
    let extraContext = '';

    // Contatos (quando pergunta sobre email, instagram, telefone)
    if (['contact_query', 'contact_list'].includes(intent.actionType) || norm.includes('instagram') || norm.includes('email') || norm.includes('contato') || norm.includes('telefone')) {
      const contactName = intent.clientName || intent.details;
      if (contactName) {
        const contacts = contactsDb.findByName(contactName);
        if (contacts.length > 0) {
          extraContext += '\n📇 CONTATOS ENCONTRADOS:\n';
          contacts.forEach(c => {
            extraContext += `  - ${c.name}`;
            if (c.email) extraContext += ` | Email: ${c.email}`;
            if (c.phone) extraContext += ` | Tel: ${c.phone}`;
            if (c.instagram) extraContext += ` | Instagram: ${c.instagram}`;
            if (c.clients) extraContext += ` | Clientes: ${c.clients}`;
            extraContext += '\n';
          });
        } else {
          extraContext += `\n📇 Nenhum contato encontrado para "${contactName}".\n`;
        }
      } else {
        const all = contactsDb.listAll();
        extraContext += `\n📇 CONTATOS (${all.length} total):\n`;
        all.forEach(c => {
          extraContext += `  - ${c.name}`;
          if (c.email) extraContext += ` | ${c.email}`;
          if (c.instagram) extraContext += ` | ${c.instagram}`;
          extraContext += '\n';
        });
      }
    }

    // Periodo especifico para calendario (semana que vem, mes, etc.)
    if (['schedule_check', 'calendar'].includes(intent.actionType)) {
      let calendarHours = 24;
      let calendarLabel = 'HOJE';
      if (norm.includes('semana que vem') || norm.includes('proxima semana')) {
        calendarHours = 14 * 24; calendarLabel = 'PROXIMAS 2 SEMANAS';
      } else if (norm.includes('semana') || norm.includes('semanal')) {
        calendarHours = 7 * 24; calendarLabel = 'ESTA SEMANA';
      } else if (norm.includes('mes') || norm.includes('mensal')) {
        calendarHours = 30 * 24; calendarLabel = 'ESTE MES';
      } else if (norm.includes('amanha')) {
        calendarHours = 48; calendarLabel = 'HOJE E AMANHA';
      }

      if (calendarHours > 24) {
        const events = await googleCalendar.listUpcoming(calendarHours);
        if (events.length > 0) {
          extraContext += `\n📅 AGENDA ESTENDIDA (${calendarLabel}):\n`;
          events.forEach(ev => {
            const start = new Date(ev.start.dateTime || ev.start.date);
            const dateStr = start.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
            const timeStr = ev.start.dateTime
              ? start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : 'dia inteiro';
            extraContext += `  - ${dateStr} ${timeStr} — ${ev.summary || 'Sem titulo'}\n`;
          });
        }
      }
    }

    // Injetar contexto extra no objeto de contexto para o prompt
    if (extraContext) {
      context._extraContext = extraContext;
    }

    // Chamar brain hibrido (Groq ou Claude)
    const { response: answer, model } = await alexBrain.chat(String(chatId), text, context);

    if (answer) {
      await telegram.sendMessage(chatId, answer);
      // Salvar resposta do bot na memoria
      alexMemory.addMessage(String(chatId), 'assistant', answer, {
        intent: intent.intent,
        metadata: { model, actionType: intent.actionType },
      });
    } else {
      await telegram.sendMessage(chatId, '🤔 Nao consegui processar sua pergunta. Tente reformular.');
    }

    // Gerar resumo async se necessario
    if (alexMemory.shouldGenerateSummary(String(chatId))) {
      alexMemory.generateSummary(String(chatId), GROQ_API_KEY).catch(() => {});
    }
  } catch (err) {
    console.error('Error handling question/action:', err.message);
    await telegram.sendMessage(chatId, '⚠️ Erro ao processar sua mensagem.');
  }
}

/**
 * Responde saudações de forma natural
 */
/**
 * Handler de follow-up conversacional — entende respostas no contexto da última interação
 * @returns {boolean} true se tratou a mensagem, false se deve seguir para routing normal
 */
async function handleFollowUp(chatId, text, ctx) {
  const norm = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  // Detectar se é uma URL de Instagram
  const igMatch = text.match(/(?:instagram\.com\/|@)([a-zA-Z0-9_.]+)/i);

  // Detectar se é um email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);

  // Detectar afirmação/negação
  const isAffirmative = /^(sim|s|pode|ok|isso|exato|correto|positivo|quero|por favor|pf|claro|com certeza)$/i.test(norm);
  const isNegative = /^(nao|n|nope|cancelar|cancela|deixa|esquece)$/i.test(norm);

  // Contexto: bot perguntou sobre um contato que não existe
  if (ctx.type === 'contact_not_found') {
    if (igMatch) {
      const ig = igMatch[0].startsWith('@') ? igMatch[0] : `@${igMatch[1]}`;
      const { id } = contactsDb.addContact({ name: ctx.name, instagram: ig });
      syncContactToConfig(ctx.name, { instagram: ig });
      await telegram.sendMessage(chatId, `✅ Contato salvo!\n\n📇 *${ctx.name}*\n📸 ${ig}`);
      clearLastBotContext(chatId);
      return true;
    }
    if (emailMatch) {
      const email = emailMatch[0].toLowerCase();
      const { id } = contactsDb.addContact({ name: ctx.name, email });
      syncContactToConfig(ctx.name, { email });
      await telegram.sendMessage(chatId, `✅ Contato salvo!\n\n📇 *${ctx.name}*\n✉️ ${email}`);
      clearLastBotContext(chatId);
      return true;
    }
    // Tentar parsing com AI (pode ser "o email dele é xxx" ou "o instagram é @yyy")
    const parsed = await parseContactWithAI(`${ctx.name}: ${text}`);
    if (parsed && (parsed.email || parsed.instagram || parsed.phone)) {
      const { id, created } = contactsDb.addContact({
        name: parsed.name || ctx.name,
        email: parsed.email,
        phone: parsed.phone,
        instagram: parsed.instagram,
      });
      const syncUp = {};
      if (parsed.email) syncUp.email = parsed.email;
      if (parsed.phone) syncUp.phone = parsed.phone;
      if (parsed.instagram) syncUp.instagram = parsed.instagram;
      if (Object.keys(syncUp).length > 0) syncContactToConfig(parsed.name || ctx.name, syncUp);
      let msg = `✅ Contato ${created ? 'salvo' : 'atualizado'}!\n\n📇 *${parsed.name || ctx.name}*`;
      if (parsed.email) msg += `\n✉️ ${parsed.email}`;
      if (parsed.phone) msg += `\n📱 ${parsed.phone}`;
      if (parsed.instagram) msg += `\n📸 ${parsed.instagram}`;
      await telegram.sendMessage(chatId, msg);
      clearLastBotContext(chatId);
      return true;
    }
  }

  // Contexto: bot mostrou info de um contato (o user pode querer atualizar)
  if (ctx.type === 'showed_contact') {
    if (igMatch) {
      const ig = igMatch[0].startsWith('@') ? igMatch[0] : `@${igMatch[1]}`;
      contactsDb.updateInstagram(ctx.name, ig);
      syncContactToConfig(ctx.name, { instagram: ig });
      await telegram.sendMessage(chatId, `✅ Instagram de *${ctx.name}* atualizado!\n📸 ${ig}`);
      clearLastBotContext(chatId);
      return true;
    }
    if (emailMatch) {
      const email = emailMatch[0].toLowerCase();
      const results = contactsDb.findByName(ctx.name);
      if (results.length > 0) {
        contactsDb.addContact({ name: ctx.name, email });
        syncContactToConfig(ctx.name, { email });
        await telegram.sendMessage(chatId, `✅ Email de *${ctx.name}* atualizado!\n✉️ ${email}`);
        clearLastBotContext(chatId);
        return true;
      }
    }
  }

  // Contexto: bot pediu info do contato (awaiting_contact_info)
  if (ctx.type === 'awaiting_contact_info') {
    if (igMatch) {
      const ig = igMatch[0].startsWith('@') ? igMatch[0] : `@${igMatch[1]}`;
      contactsDb.addContact({ name: ctx.name, instagram: ig });
      syncContactToConfig(ctx.name, { instagram: ig });
      await telegram.sendMessage(chatId, `✅ Contato salvo!\n\n📇 *${ctx.name}*\n📸 ${ig}`);
      clearLastBotContext(chatId);
      return true;
    }
    if (emailMatch) {
      const email = emailMatch[0].toLowerCase();
      contactsDb.addContact({ name: ctx.name, email });
      syncContactToConfig(ctx.name, { email });
      await telegram.sendMessage(chatId, `✅ Contato salvo!\n\n📇 *${ctx.name}*\n✉️ ${email}`);
      clearLastBotContext(chatId);
      return true;
    }
    // Tentar parsing com AI
    const parsed = await parseContactWithAI(`Dados do ${ctx.name}: ${text}`);
    if (parsed && (parsed.email || parsed.instagram || parsed.phone)) {
      contactsDb.addContact({
        name: ctx.name,
        email: parsed.email,
        phone: parsed.phone,
        instagram: parsed.instagram,
      });
      const syncUp = {};
      if (parsed.email) syncUp.email = parsed.email;
      if (parsed.phone) syncUp.phone = parsed.phone;
      if (parsed.instagram) syncUp.instagram = parsed.instagram;
      if (Object.keys(syncUp).length > 0) syncContactToConfig(ctx.name, syncUp);
      let msg = `✅ Contato atualizado!\n\n📇 *${ctx.name}*`;
      if (parsed.email) msg += `\n✉️ ${parsed.email}`;
      if (parsed.phone) msg += `\n📱 ${parsed.phone}`;
      if (parsed.instagram) msg += `\n📸 ${parsed.instagram}`;
      await telegram.sendMessage(chatId, msg);
      clearLastBotContext(chatId);
      return true;
    }
  }

  // Afirmação genérica sem contexto específico — não tratar, deixar routing normal
  if (isNegative) {
    await telegram.sendMessage(chatId, '👍 OK, cancelado.');
    clearLastBotContext(chatId);
    return true;
  }

  // Não conseguiu tratar no contexto — retornar false para routing normal
  return false;
}

async function handleGreeting(chatId, text) {
  try {
    const hour = new Date().getHours();
    let greeting;
    if (hour < 12) greeting = 'Bom dia';
    else if (hour < 18) greeting = 'Boa tarde';
    else greeting = 'Boa noite';

    // Super Alex 2.0: saudacao context-aware
    const context = await alexContext.gatherContext({ chatId: String(chatId) });
    const meetingCount = context.calendar?.length || 0;
    const overdueCount = context.overdueTasks?.length || 0;
    const taskCount = context.tasks?.length || 0;

    let msg = `${greeting}, Eric! 👋`;

    // Adicionar contexto relevante
    const highlights = [];
    if (meetingCount > 0) {
      const nextMeeting = context.calendar[0];
      highlights.push(`${meetingCount} reuniao${meetingCount > 1 ? 'es' : ''} hoje (proxima: ${nextMeeting.time} - ${nextMeeting.title})`);
    }
    if (overdueCount > 0) {
      highlights.push(`⚠️ ${overdueCount} tarefa${overdueCount > 1 ? 's' : ''} atrasada${overdueCount > 1 ? 's' : ''}`);
    }
    if (taskCount > 0 && overdueCount === 0) {
      highlights.push(`${taskCount} tarefa${taskCount > 1 ? 's' : ''} ativa${taskCount > 1 ? 's' : ''}`);
    }

    if (highlights.length > 0) {
      msg += '\n\n' + highlights.map(h => `- ${h}`).join('\n');
      msg += '\n\nNo que posso ajudar?';
    } else {
      msg += ' Agenda limpa hoje. No que posso ajudar?';
    }

    await telegram.sendMessage(chatId, msg);

    // Salvar na memoria
    alexMemory.addMessage(String(chatId), 'assistant', msg, { intent: 'greeting' });
  } catch (err) {
    // Fallback simples se contexto falhar
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    await telegram.sendMessage(chatId, `${greeting}! 👋 No que posso ajudar?`);
  }
}

/**
 * Handler inteligente de contatos — usa IA para entender qualquer pedido
 */
async function handleContactIntent(chatId, text, intent) {
  try {
    const actionType = intent.actionType || 'contact_query';

    // === LISTAR ===
    if (actionType === 'contact_list') {
      // Se mencionou um cliente/nome específico → buscar por nome
      const searchName = intent.clientName || intent.details;
      if (searchName) {
        const results = contactsDb.findByName(searchName);
        if (results.length === 0) {
          await telegram.sendMessage(chatId, `📇 Nenhum contato encontrado para "${searchName}".`);
          return;
        }
        let msg = `📇 *Contatos encontrados:*\n\n`;
        for (const c of results) {
          msg += `• *${c.name}*`;
          if (c.email) msg += ` — ${c.email}`;
          if (c.phone) msg += ` | ${c.phone}`;
          if (c.clients) msg += `\n  _${c.clients}_`;
          msg += '\n';
        }
        await telegram.sendMessage(chatId, msg);
        return;
      }

      // Listar todos
      const all = contactsDb.listAll();
      if (all.length === 0) {
        await telegram.sendMessage(chatId, '📇 Nenhum contato salvo ainda.\n\nPara adicionar: _"salva o email do João: joao@email.com"_');
        return;
      }
      let msg = `📇 *Contatos (${all.length}):*\n\n`;
      for (const c of all) {
        msg += `• *${c.name}*`;
        if (c.email) msg += ` — ${c.email}`;
        if (c.clients) msg += ` _(${c.clients})_`;
        msg += '\n';
      }
      await telegram.sendMessage(chatId, msg);
      return;
    }

    // === CONSULTAR EMAIL ===
    if (actionType === 'contact_query') {
      const name = intent.clientName || intent.details;
      if (!name) {
        await telegram.sendMessage(chatId, '❓ De quem você quer o contato?');
        return;
      }
      const results = contactsDb.findByName(name);
      if (results.length > 0) {
        let msg = '';
        for (const c of results) {
          msg += `📇 *${c.name}*\n`;
          if (c.email) msg += `  ✉️ ${c.email}\n`;
          if (c.phone) msg += `  📱 ${c.phone}\n`;
          if (c.instagram) msg += `  📸 ${c.instagram}\n`;
          if (c.clients) msg += `  🏢 ${c.clients}\n`;
          msg += '\n';
        }
        await telegram.sendMessage(chatId, msg.trim());
        setLastBotContext(chatId, { type: 'showed_contact', name: results[0].name, contactId: results[0].id });
      } else {
        await telegram.sendMessage(chatId, `❓ Não encontrei contato para "${name}".\n\nPara adicionar: _"o email do ${name} é fulano@email.com"_\nOu: _"o instagram do ${name} é @perfil"_`);
        setLastBotContext(chatId, { type: 'contact_not_found', name });
      }
      return;
    }

    // === ADICIONAR / ATUALIZAR ===
    if (actionType === 'contact_add' || actionType === 'contact_update') {
      // Extrair email e nome do texto via Groq
      const parsed = await parseContactWithAI(text);
      if (!parsed || !parsed.name) {
        await telegram.sendMessage(chatId, '❓ Não consegui entender. Tente:\n_"o email do João é joao@email.com"_');
        return;
      }

      if (!parsed.email && !parsed.phone && !parsed.instagram) {
        await telegram.sendMessage(chatId, `❓ Qual o email, telefone ou Instagram de *${parsed.name}*?`);
        setLastBotContext(chatId, { type: 'awaiting_contact_info', name: parsed.name });
        return;
      }

      const { id, created } = contactsDb.addContact({
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        instagram: parsed.instagram,
        role: parsed.role || 'contact',
      });

      // Sync → CLIENTES-CONFIG.json
      const syncUpdates = {};
      if (parsed.email) syncUpdates.email = parsed.email;
      if (parsed.phone) syncUpdates.phone = parsed.phone;
      if (parsed.instagram) syncUpdates.instagram = parsed.instagram;
      if (Object.keys(syncUpdates).length > 0) syncContactToConfig(parsed.name, syncUpdates);

      // Vincular a cliente se mencionado
      if (parsed.client) {
        const clientKey = parsed.client.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        contactsDb.linkContactToClient(id, clientKey, parsed.client, parsed.roleAtClient || 'team');
      }

      const action = created ? 'salvo' : 'atualizado';
      let msg = `✅ Contato ${action}!\n\n📇 *${parsed.name}*`;
      if (parsed.email) msg += `\n✉️ ${parsed.email}`;
      if (parsed.phone) msg += `\n📱 ${parsed.phone}`;
      if (parsed.instagram) msg += `\n📸 ${parsed.instagram}`;
      if (parsed.client) msg += `\n🏢 ${parsed.client} (${parsed.roleAtClient || 'equipe'})`;
      await telegram.sendMessage(chatId, msg);
      clearLastBotContext(chatId);
      return;
    }

    // === REMOVER ===
    if (actionType === 'contact_delete') {
      const name = intent.clientName || intent.details;
      if (!name) {
        await telegram.sendMessage(chatId, '❓ Qual contato deseja remover?');
        return;
      }
      const results = contactsDb.findByName(name);
      if (results.length === 0) {
        await telegram.sendMessage(chatId, `❓ Não encontrei contato "${name}".`);
        return;
      }
      // Remover o primeiro match
      contactsDb.removeContact(results[0].id);
      await telegram.sendMessage(chatId, `🗑️ Contato *${results[0].name}* removido.`);
      return;
    }

    // Fallback — tentar interpretar como add
    await telegram.sendMessage(chatId, '❓ Não entendi. Tente:\n• _"salva o email do João: joao@email.com"_\n• _"contatos"_\n• _"email da Vanessa"_');
  } catch (err) {
    console.error('Error handling contact:', err.message);
    await telegram.sendMessage(chatId, '⚠️ Erro ao processar contato.');
  }
}

// ============================================================
// Handler: Atualização de informações de cliente
// ============================================================

/**
 * Salva informações sobre um cliente (localização, especialidade, etc.)
 * Atualiza o README.md do cliente e o CLIENTES-CONFIG.json
 */
async function handleClientUpdate(chatId, text, intent) {
  try {
    const clientName = intent.clientName;
    if (!clientName) {
      await telegram.sendMessage(chatId, '❓ Não identifiquei qual cliente. Pode repetir mencionando o nome?');
      return;
    }

    const info = intent.details || text;

    // Estruturar a informação via Groq
    let structured = null;
    if (GROQ_API_KEY) {
      try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: `Extraia informações estruturadas sobre o cliente a partir do texto.
Responda em JSON:
{
  "specialty": "especialidade/área de atuação ou null",
  "location": "cidade/região principal ou null",
  "locations": ["lista de locais de atendimento"] ou null,
  "clinic_name": "nome da clínica ou null",
  "clinic_address": "endereço ou null",
  "services": ["serviços oferecidos"] ou null,
  "target_audience": "público-alvo ou null",
  "notes": "outras informações relevantes extraídas do texto",
  "summary": "resumo breve de 1 linha do que foi informado"
}
Extraia APENAS o que está no texto. Se não mencionar, use null.`,
              },
              { role: 'user', content: text },
            ],
            temperature: 0.1,
            max_tokens: 500,
            response_format: { type: 'json_object' },
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) structured = JSON.parse(content);
        }
      } catch (e) {
        console.warn('Error structuring client info:', e.message);
      }
    }

    // Encontrar o clientKey no CLIENTES-CONFIG
    const config = JSON.parse(fs.readFileSync(CLIENTS_CONFIG_PATH, 'utf-8'));
    let clientKey = null;
    let clientConfig = null;
    const normClient = clientName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^(dr|dra|prof)\s*\.?\s*/i, '').trim();

    for (const [key, client] of Object.entries(config.clients || {})) {
      const cn = client.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^(dr|dra|prof)\s*\.?\s*/i, '').trim();
      if (cn.includes(normClient) || normClient.includes(cn)) {
        clientKey = key;
        clientConfig = client;
        break;
      }
    }

    if (!clientKey) {
      await telegram.sendMessage(chatId, `❓ Cliente "${clientName}" não encontrado na base. Verifique o nome.`);
      return;
    }

    // Atualizar CLIENTES-CONFIG.json com dados estruturados
    let configUpdated = false;
    if (structured) {
      if (structured.specialty && !clientConfig.specialty) {
        clientConfig.specialty = structured.specialty;
        configUpdated = true;
      }
      if (structured.location && !clientConfig.location) {
        clientConfig.location = structured.location;
        configUpdated = true;
      }
    }
    if (configUpdated) {
      config.clients[clientKey] = clientConfig;
      fs.writeFileSync(CLIENTS_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    }

    // Atualizar o README.md do cliente — adicionar seção de notas
    const readmePath = path.resolve(__dirname, '..', clientConfig.paths?.folder || `docs/clientes/${clientKey}`, 'README.md');

    if (fs.existsSync(readmePath)) {
      let readme = fs.readFileSync(readmePath, 'utf-8');

      // Atualizar campos na tabela de dados se existir
      if (structured) {
        if (structured.specialty && readme.includes('A definir')) {
          readme = readme.replace(/\| \*\*Especialidade\*\* \| A definir \|/, `| **Especialidade** | ${structured.specialty} |`);
        }
        if (structured.location && readme.includes('A definir')) {
          readme = readme.replace(/\| \*\*Localização\*\* \| A definir \|/, `| **Localização** | ${structured.location} |`);
        }
      }

      // Adicionar nota com timestamp
      const timestamp = new Date().toLocaleDateString('pt-BR');
      const noteEntry = `- **[${timestamp}]** ${structured?.summary || info.substring(0, 200)}`;

      if (readme.includes('## Notas e Observações')) {
        // Adicionar à seção existente
        readme = readme.replace('## Notas e Observações\n', `## Notas e Observações\n\n${noteEntry}\n`);
      } else {
        // Criar seção
        readme += `\n\n## Notas e Observações\n\n${noteEntry}\n`;
      }

      // Adicionar locais de atendimento se informados
      if (structured?.locations && structured.locations.length > 0) {
        if (!readme.includes('## Locais de Atendimento')) {
          readme += `\n## Locais de Atendimento\n\n${structured.locations.map(l => `- ${l}`).join('\n')}\n`;
        }
      }

      fs.writeFileSync(readmePath, readme, 'utf-8');
    }

    // Responder confirmando
    let msg = `✅ Informação salva sobre *${clientConfig.name}*!\n\n`;
    if (structured?.summary) msg += `📝 ${structured.summary}\n`;
    if (structured?.specialty) msg += `🏥 Especialidade: ${structured.specialty}\n`;
    if (structured?.location) msg += `📍 Localização: ${structured.location}\n`;
    if (structured?.locations?.length > 0) msg += `📍 Regiões: ${structured.locations.join(', ')}\n`;
    if (structured?.clinic_name) msg += `🏢 Clínica: ${structured.clinic_name}\n`;
    msg += `\n_Dados salvos no perfil do cliente._`;

    await telegram.sendMessage(chatId, msg);
    console.log(`📇 Client update: ${clientConfig.name} — ${structured?.summary || 'info salva'}`);

  } catch (err) {
    console.error('Error handling client update:', err.message);
    await telegram.sendMessage(chatId, '⚠️ Erro ao salvar informação do cliente.');
  }
}

/**
 * Usa Groq para extrair dados de contato do texto em linguagem natural
 */
async function parseContactWithAI(text) {
  if (!GROQ_API_KEY) return null;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Extraia dados de contato do texto. Responda APENAS com JSON:
{
  "name": "Nome completo da pessoa",
  "email": "email@..." ou null,
  "phone": "telefone" ou null,
  "instagram": "@perfil ou URL do Instagram" ou null,
  "role": "client" | "prospect" | "team" | "partner" | "contact",
  "client": "Nome do cliente associado" ou null,
  "roleAtClient": "stakeholder" | "secretária" | "sócio" | "gerente" | "team" ou null
}

Regras:
- PRESERVE Dr./Dra./Prof. no nome (ex: "dr enio leite" → "Dr. Enio Leite", "dra vanessa" → "Dra. Vanessa")
- Se o usuário diz "dr enio", o nome é "Dr. Enio Leite" (complete com conhecimento se possível)
- Normalize email para minúsculas
- Se o texto contém URL de Instagram (instagram.com/...) ou @perfil, extraia em "instagram"
- Se mencionou "equipe/time/cliente do X", preencha client e roleAtClient
- Se não tem contexto de cliente, client = null
- role: "client" se é dono/stakeholder, "prospect" se é lead/prospect, "team" se é da equipe de alguém`
          },
          { role: 'user', content: text }
        ],
        temperature: 0,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    return JSON.parse(content);
  } catch (err) {
    console.error('Error parsing contact with AI:', err.message);
    return null;
  }
}

// ============================================================
// Roteamento inteligente por intenção (áudio/texto → onboarding, churn ou tarefa)
// ============================================================

async function routeByIntent(chatId, text, messageType, extra = {}) {
  // Checar intenção de agendamento ANTES do detectIntent (funciona para áudio também)
  if (isSchedulingIntent(text)) {
    console.log(`🎯 Intent detectado: scheduling (via keywords)`);
    await handleScheduleNLP(chatId, text);
    return;
  }

  const clientNames = CLIENT_OPTIONS.map(c => c.name);
  const intent = await detectIntent(text, clientNames);
  console.log(`🎯 Intent detectado: ${intent.intent}${intent.clientName ? ` (cliente: ${intent.clientName})` : ''}`);

  if (intent.intent === 'onboarding') {
    // Preencher o estado do onboarding com os dados extraídos da IA
    const state = {
      step: intent.phone ? 'awaiting_extra_phones' : 'awaiting_name',
      updatedAt: Date.now(),
    };
    if (intent.clientName) state.clientName = intent.clientName;
    if (intent.phone) {
      state.clientPhone = intent.phone;
      state.step = 'awaiting_extra_phones';
    }
    if (intent.instagram) state.clientInstagram = intent.instagram;

    onboardingState.set(String(chatId), state);

    if (state.clientName && state.clientPhone) {
      // Tem nome + telefone — pular direto pra confirmação ou pedir extras
      state.step = 'confirming';
      state.clientPhones = intent.phones && intent.phones.length > 0
        ? [intent.phone, ...intent.phones]
        : [intent.phone];
      state.clientInstagram = intent.instagram || '';
      onboardingState.set(String(chatId), state);
      await telegram.sendMessage(chatId, `🚀 *Onboarding detectado pelo áudio*`);
      await sendOnboardingConfirmation(chatId, state);
    } else if (state.clientName) {
      // Tem nome mas falta telefone
      state.step = 'awaiting_stakeholder';
      onboardingState.set(String(chatId), state);
      await telegram.sendMessage(chatId,
        `🚀 *Onboarding detectado:* ${state.clientName}\n\n` +
        `Passo 2/4 — Qual o *telefone principal* (stakeholder)?\n` +
        `_Ex: 5531999999999_`
      );
    } else {
      // Sem nome — pedir do início
      await telegram.sendMessage(chatId,
        `🚀 *Onboarding de Novo Cliente*\n\n` +
        `Passo 1/4 — Qual o *nome completo* do cliente?\n` +
        `_Ex: Dra. Bruna Nogueira_`
      );
    }
    return;
  }

  if (intent.intent === 'churn') {
    if (intent.clientName) {
      // IA detectou o cliente — buscar lista e pedir confirmação
      const listId = await clickup.findClientListId(intent.clientName);
      if (listId) {
        await telegram.sendInlineKeyboard(chatId,
          `⚠️ *Churn detectado:* ${intent.clientName}\n\n` +
          `Confirma a desativação? A lista será arquivada no ClickUp (tarefas preservadas).`,
          [
            [{ text: `✅ Confirmar churn`, callback_data: `churn:confirm:${listId}` }],
            [{ text: '❌ Cancelar', callback_data: 'churn:cancel' }],
          ]
        );
        return;
      }
      // Não encontrou lista — mostrar seleção manual
      await telegram.sendMessage(chatId,
        `⚠️ Cliente "${intent.clientName}" não encontrado no ClickUp. Use /churn para selecionar manualmente.`
      );
      return;
    }
    // Churn sem cliente identificado — mostrar lista
    await telegram.sendMessage(chatId, `⚠️ Detectei intenção de churn mas não identifiquei o cliente. Use /churn para selecionar.`);
    return;
  }

  // Client Update → salvar informações sobre um cliente
  if (intent.intent === 'client_update') {
    await handleClientUpdate(chatId, text, intent);
    return;
  }

  // Contact → gerenciamento de contatos via IA
  if (intent.intent === 'contact') {
    await handleContactIntent(chatId, text, intent);
    return;
  }

  // Task Update → alterar tarefa existente no ClickUp
  if (intent.intent === 'task_update') {
    await handleTaskUpdate(chatId, text, intent);
    return;
  }

  // Question / Action → responder com IA
  if (intent.intent === 'question' || intent.intent === 'action') {
    await handleQuestionOrAction(chatId, text, intent);
    return;
  }

  // Greeting → resposta curta
  if (intent.intent === 'greeting') {
    await handleGreeting(chatId, text);
    return;
  }

  // Default: criar tarefa (intent === 'task')
  await startTaskFlow(chatId, text, messageType, extra);
}

// ============================================================
// Fluxo interativo: criação de tarefas
// ============================================================

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

    let summary = `📋 *Entendi a tarefa:*\n\n`;
    summary += `📌 *Título:* ${analysis.title}\n`;
    summary += `📝 *Descrição:* ${analysis.description.substring(0, 200)}${analysis.description.length > 200 ? '...' : ''}\n`;
    if (analysis.subtasks.length > 0) {
      summary += `\n📎 *Subtarefas sugeridas:*\n`;
      analysis.subtasks.forEach((s, i) => { summary += `  ${i + 1}. ${s}\n`; });
    }
    summary += `\n🎯 *Prioridade sugerida:* ${PRIORITY_LABELS[priorityFromString(analysis.suggested_priority)] || '🟡 Normal'}`;
    if (analysis.suggested_due_date) {
      const dueDate = new Date(analysis.suggested_due_date + 'T23:59:59');
      const formatted = `${String(dueDate.getDate()).padStart(2, '0')}/${String(dueDate.getMonth() + 1).padStart(2, '0')}/${dueDate.getFullYear()}`;
      summary += `\n📅 *Prazo detectado:* ${formatted}`;
    }

    await telegram.sendMessage(chatId, summary);

    // Smart skip: auto-apply priority if user explicitly stated it
    if (analysis.priority_explicit) {
      const priority = priorityFromString(analysis.suggested_priority);
      conversation.updateConversation(chatId, { priority, step: 'awaiting_client' });
      await telegram.sendMessage(chatId, `⚡ Prioridade: ${PRIORITY_LABELS[priority]} (detectada do áudio)`);
      await askClient(chatId);
    } else {
      await telegram.sendInlineKeyboard(
        chatId,
        '⚡ Qual a prioridade desta tarefa?',
        priorityKeyboard()
      );
    }
  } catch (err) {
    console.error('Error starting task flow:', err);
    telegram.sendMessage(chatId, `❌ Erro ao analisar mensagem: ${err.message}`);
  }
}

async function askClient(chatId) {
  const state = conversation.getConversation(chatId);

  if (state?.analysis?.detected_client) {
    const detected = state.analysis.detected_client;
    const match = CLIENT_OPTIONS.find(
      (c) => c.name.toLowerCase() === detected.toLowerCase()
    );
    if (match) {
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

  if (CLIENT_OPTIONS.length > 0) {
    await telegram.sendInlineKeyboard(
      chatId,
      '🏢 Qual o cliente?',
      clientKeyboard(CLIENT_OPTIONS)
    );
  } else {
    conversation.updateConversation(chatId, { step: 'awaiting_client' });
    await telegram.sendMessage(chatId, '🏢 Qual o cliente? (digite o nome)');
  }
}

async function askDate(chatId) {
  // Smart skip: auto-apply due date if AI extracted it
  const state = conversation.getConversation(chatId);
  if (state?.analysis?.suggested_due_date) {
    const dueDate = new Date(state.analysis.suggested_due_date + 'T23:59:59');
    if (!isNaN(dueDate.getTime())) {
      const formatted = `${String(dueDate.getDate()).padStart(2, '0')}/${String(dueDate.getMonth() + 1).padStart(2, '0')}/${dueDate.getFullYear()}`;
      conversation.updateConversation(chatId, {
        dueDate: formatted,
        dueDateMs: dueDate.getTime(),
        step: 'awaiting_assignee',
      });
      await telegram.sendMessage(chatId, `📅 Prazo: ${formatted} (detectado do áudio)`);
      await askAssignee(chatId);
      return;
    }
  }

  await telegram.sendInlineKeyboard(
    chatId,
    '📅 Qual a data de entrega?',
    dateKeyboard()
  );
}

async function askAssignee(chatId) {
  const members = await clickup.getTeamMembers();
  if (members.length > 0) {
    await telegram.sendInlineKeyboard(
      chatId,
      '👤 Quem é o responsável?',
      assigneeKeyboard(members)
    );
  } else {
    conversation.updateConversation(chatId, { step: 'creating' });
    await finalizeTask(chatId);
  }
}

async function finalizeTask(chatId) {
  const state = conversation.getConversation(chatId);
  if (!state) return;

  try {
    telegram.sendMessage(chatId, '⏳ Criando tarefa no ClickUp...');

    let fullDescription = state.analysis.description;
    if (state.messageType === 'voice') {
      fullDescription = `🎤 *Transcrito de áudio do Telegram*\n\n${state.originalText}\n\n---\n${state.analysis.description}`;
    }
    if (state.client) {
      fullDescription += `\n\n🏢 Cliente: ${state.client}`;
    }

    // Rotear tarefa para a lista do cliente (se identificado)
    let clientListId = null;
    if (state.client) {
      clientListId = await clickup.findClientListId(state.client);
    }

    let result;
    if (clientListId) {
      // Criar na lista dedicada do cliente
      result = await clickup.createTaskInList(clientListId, {
        title: state.analysis.title,
        description: fullDescription,
        priority: state.priority,
        dueDateMs: state.dueDateMs,
        assignees: state.assigneeId ? [Number(state.assigneeId)] : [],
      });
    } else {
      // Fallback: lista TAREFAS genérica (sem cliente identificado)
      const customFields = [];
      if (state.clientOptionId) {
        customFields.push({
          id: clickup.CLIENT_FIELD_ID,
          value: state.clientOptionId,
        });
      }
      result = await clickup.createTask({
        title: state.analysis.title,
        description: fullDescription,
        priority: state.priority,
        dueDateMs: state.dueDateMs,
        assignees: state.assigneeId ? [Number(state.assigneeId)] : [],
        customFields,
      });
    }

    const taskTitle = state.analysis.title;

    let subtaskInfo = '';
    if (state.analysis.subtasks.length > 0) {
      const targetListId = clientListId || process.env.CLICKUP_LIST_ID;
      const subtasks = clientListId
        ? await clickup.createSubtasksInList(clientListId, result.id, state.analysis.subtasks)
        : await clickup.createSubtasks(result.id, state.analysis.subtasks);
      if (subtasks.length > 0) {
        subtaskInfo = `\n📎 ${subtasks.length} subtarefa(s) criada(s)`;
      }
    }

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

    let msg = `✅ Tarefa criada com sucesso!\n\n`;
    msg += `📌 ${taskTitle}\n`;
    msg += `⚡ Prioridade: ${PRIORITY_LABELS[state.priority] || 'Normal'}\n`;
    if (state.client) msg += `🏢 Cliente: ${state.client}\n`;
    if (state.dueDate) msg += `📅 Prazo: ${state.dueDate}\n`;
    if (state.assigneeName) msg += `👤 Responsável: ${state.assigneeName}\n`;
    msg += subtaskInfo;
    msg += attachmentInfo;
    msg += `\n\n🔗 ${result.url}`;

    await telegram.sendMessage(chatId, msg);

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

async function handleTextDuringConversation(chatId, text, state) {
  switch (state.step) {
    case 'awaiting_description': {
      const attachmentLabel = state.attachments.map(a => {
        if (a.type === 'photo') return '[Foto anexada]';
        if (a.type === 'document') return `[Documento "${a.file_name}" anexado]`;
        if (a.type === 'video') return '[Vídeo anexado]';
        return '[Anexo]';
      }).join(' ');
      const textForAI = `${attachmentLabel} ${text}`;

      const attachments = [...state.attachments];
      conversation.endConversation(chatId);
      await startTaskFlow(chatId, textForAI, state.messageType, { attachments });
      break;
    }
    case 'awaiting_client': {
      const typed = text.trim();
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
      await startTaskFlow(chatId, text, 'text');
  }
}

// ============================================================
// Handler central de mensagens de texto (webhook + polling)
// ============================================================

const START_MSG =
  `📌 Olá! Eu sou o Alex, seu Project Manager.\n\n` +
  `Posso ajudar você a:\n` +
  `  📋 Listar tarefas\n` +
  `  📊 Ver dashboard do dia\n` +
  `  📅 Agendar reuniões\n` +
  `  📝 Criar tarefas no ClickUp\n\n` +
  `Comandos:\n` +
  `/nova — criar nova tarefa\n` +
  `/tarefas — listar tarefas\n` +
  `/dashboard — resumo do dia\n` +
  `/reuniao — agendar reunião\n` +
  `/onboarding — onboarding de novo cliente\n` +
  `/help — menu de ajuda\n` +
  `/cancel — cancelar ação\n\n` +
  `Ou envie qualquer briefing (texto, áudio, foto, documento, vídeo) e eu crio a tarefa.`;

const HELP_MSG =
  `📌 Alex — Project Manager\n\n` +
  `Comandos disponíveis:\n` +
  `/nova — iniciar criação de tarefa\n` +
  `/tarefas — listar e filtrar tarefas\n` +
  `/dashboard — resumo do dia (tarefas em andamento, na fila, feitas)\n` +
  `/reuniao — agendar reunião (interativo com botões)\n` +
  `/onboarding — onboarding automatizado de novo cliente\n` +
  `/churn — desativar cliente (arquivar lista no ClickUp)\n` +
  `/cancel — cancelar ação em andamento\n\n` +
  `*Criar tarefa:*\n` +
  `Envie qualquer briefing: texto, áudio, foto (com/sem legenda), documento ou vídeo.\n\n` +
  `*Agendar reunião por texto livre:*\n` +
  `_"agenda reunião amanhã às 15h"_\n` +
  `_"marca call quinta 14h com joao@email.com"_\n` +
  `_"bloqueia minha agenda segunda 13h-14h"_`;

async function handleTextMessage(chatId, text) {
  // Super Alex 2.0: salvar toda mensagem na memoria
  alexMemory.addMessage(String(chatId), 'user', text);

  // Comandos
  if (text.startsWith('/')) {
    const cmd = text.split(/\s|@/)[0].toLowerCase();
    switch (cmd) {
      case '/start':
        await telegram.sendMessage(chatId, START_MSG);
        return;

      case '/nova':
        await telegram.sendMessage(chatId, '📝 Envie o briefing da tarefa (texto, áudio, foto ou documento).');
        return;

      case '/tarefas':
        await startListFlow(chatId);
        return;

      case '/dashboard':
        await sendDashboard(chatId);
        return;

      case '/help':
        await telegram.sendMessage(chatId, HELP_MSG);
        return;

      case '/cancel':
        if (schedulingState.has(String(chatId))) {
          clearSchedulingState(chatId);
          await telegram.sendMessage(chatId, '🚫 Agendamento cancelado.');
        } else if (onboardingState.has(String(chatId))) {
          onboardingState.delete(String(chatId));
          await telegram.sendMessage(chatId, '🚫 Onboarding cancelado.');
        } else if (conversation.hasActiveConversation(chatId)) {
          conversation.endConversation(chatId);
          await telegram.sendMessage(chatId, '🚫 Criação de tarefa cancelada.');
        } else {
          await telegram.sendMessage(chatId, 'Nenhuma ação em andamento para cancelar.');
        }
        return;

      case '/reuniao':
        await startSchedulingFlow(chatId);
        return;

      case '/onboarding':
        onboardingState.set(String(chatId), { step: 'awaiting_name', updatedAt: Date.now() });
        await telegram.sendMessage(chatId,
          `🚀 *Onboarding de Novo Cliente*\n\n` +
          `Passo 1/3 — Qual o *nome completo* do cliente?\n` +
          `_Ex: Dra. Bruna Nogueira_`
        );
        return;

      case '/churn': {
        try {
          const lists = await clickup.listClientLists();
          const clientLists = lists.filter(l => l.name !== 'TAREFAS');
          if (clientLists.length === 0) {
            await telegram.sendMessage(chatId, '⚠️ Nenhum cliente ativo encontrado no ClickUp.');
            return;
          }
          const keyboard = clientLists.map(l => ([
            { text: `${l.name} (${l.taskCount} tarefas)`, callback_data: `churn:${l.id}:${l.name}` },
          ]));
          keyboard.push([{ text: '❌ Cancelar', callback_data: 'churn:cancel' }]);
          await telegram.sendInlineKeyboard(chatId,
            `⚠️ *Churn — Desativar Cliente*\n\n` +
            `Selecione o cliente que saiu da assessoria.\n` +
            `A lista será arquivada (tarefas preservadas, mas fora da visualização geral).`,
            keyboard
          );
        } catch (err) {
          await telegram.sendMessage(chatId, `❌ Erro: ${err.message}`);
        }
        return;
      }

      default:
        await telegram.sendMessage(
          chatId,
          `📌 Comando não reconhecido.\n/help para ver os comandos disponíveis.`
        );
        return;
    }
  }

  // Agendamento interativo em andamento
  const schedState = getSchedulingState(chatId);
  if (schedState) {
    await handleSchedulingText(chatId, text, schedState);
    return;
  }

  // Onboarding multi-step
  const obState = onboardingState.get(String(chatId));
  if (obState) {
    await handleOnboardingText(chatId, text, obState);
    return;
  }

  // Conversa ativa: input de texto para etapas do fluxo
  if (conversation.hasActiveConversation(chatId)) {
    const state = conversation.getConversation(chatId);
    if (state && (state.step === 'awaiting_description' || state.step === 'awaiting_client' || state.step === 'awaiting_date')) {
      await handleTextDuringConversation(chatId, text, state);
      return;
    }
  }

  // Contexto conversacional: responder baseado na última interação do bot
  const botCtx = getLastBotContext(chatId);
  if (botCtx) {
    const handled = await handleFollowUp(chatId, text, botCtx);
    if (handled) return;
  }

  // Texto livre — detectar intenção de agendamento (IA + regex fallback)
  const isSched = isSchedulingIntent(text);
  if (isSched) {
    await handleScheduleNLP(chatId, text);
    return;
  }

  // Texto livre — detectar intenção (onboarding, churn ou tarefa)
  await routeByIntent(chatId, text, 'text');
}

// ============================================================
// Handler de media (áudio, foto, documento, vídeo)
// ============================================================

async function handleMediaMessage(message) {
  const chatId = message.chat.id;

  // Áudio
  if (message.voice || message.audio) {
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

    // Super Alex 2.0: salvar transcricao na memoria
    alexMemory.addMessage(String(chatId), 'user', transcription, {
      metadata: { source: 'voice', duration: voice.duration },
    });

    // Se há agendamento ativo, tratar áudio como continuação (não como nova conversa)
    const activeSchedState = getSchedulingState(chatId);
    if (activeSchedState) {
      // Se a transcrição parece ser uma correção/complemento ao agendamento ativo
      if (isSchedulingIntent(transcription)) {
        await handleScheduleCorrection(chatId, transcription, activeSchedState);
      } else {
        // Texto livre durante agendamento → tratar como input do step atual
        await handleSchedulingText(chatId, transcription, activeSchedState);
      }
      return;
    }

    // Se há conversa de task ativa, tratar como continuação
    if (conversation.hasActiveConversation(chatId)) {
      const convState = conversation.getConversation(chatId);
      if (convState && (convState.step === 'awaiting_description' || convState.step === 'awaiting_client' || convState.step === 'awaiting_date')) {
        await handleTextDuringConversation(chatId, transcription, convState);
        return;
      }
    }

    await routeByIntent(chatId, transcription, 'voice', {
      voiceMetadata: { audio_duration: voice.duration, transcribe_ms: transcribeMs },
    });
    return;
  }

  // Foto
  if (message.photo) {
    const photo = message.photo[message.photo.length - 1];
    const caption = message.caption || '';
    console.log(`📷 Photo from ${chatId}: ${photo.file_id} caption="${caption}"`);

    const attachment = { type: 'photo', file_id: photo.file_id, file_name: `photo_${Date.now()}.jpg` };

    if (caption) {
      const textForAI = `[Foto anexada] ${caption}`;
      await startTaskFlow(chatId, textForAI, 'photo', { attachments: [attachment] });
    } else {
      conversation.startConversation(chatId, {
        analysis: null,
        originalText: '',
        messageType: 'photo',
        attachments: [attachment],
      });
      conversation.updateConversation(chatId, { step: 'awaiting_description' });
      await telegram.sendMessage(chatId, '📷 Foto recebida! Descreva a tarefa relacionada a essa imagem:');
    }
    return;
  }

  // Documento
  if (message.document) {
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
    return;
  }

  // Vídeo
  if (message.video) {
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
    return;
  }
}

// ============================================================
// Dashboard automático
// ============================================================
async function sendDashboard(chatId) {
  try {
    const inProgress = await clickup.listTasks({ statuses: ['IN PROGRESS'] });
    const pending = await clickup.listTasks({ statuses: ['TO DO'] });
    const done = await clickup.listTasks({ statuses: ['DONE'] });

    let msg = `📊 *Dashboard do Dia*\n\n`;
    msg += `🟠 *Em Andamento*: ${inProgress.total_count} tarefa(s)\n`;
    inProgress.tasks?.slice(0, 3).forEach((t) => {
      msg += `  • ${t.name.substring(0, 40)}\n`;
    });

    msg += `\n🟡 *Na Fila*: ${pending.total_count} tarefa(s)\n`;
    pending.tasks?.slice(0, 3).forEach((t) => {
      msg += `  • ${t.name.substring(0, 40)}\n`;
    });

    msg += `\n✅ *Concluídas*: ${done.total_count} tarefa(s)\n`;

    msg += `\n📈 *Total*: ${inProgress.total_count + pending.total_count + done.total_count} tarefa(s)`;

    await telegram.sendMessage(chatId, msg);
  } catch (err) {
    console.error('Error sending dashboard:', err);
  }
}

// ============================================================
// Callback query handler (botões inline)
// ============================================================
async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const queryId = callbackQuery.id;

  const [type, ...valueParts] = data.split(':');
  const value = valueParts.join(':');

  try {
    switch (type) {
      // --- Fluxo de criação de tarefas ---
      case 'priority': {
        const state = conversation.getConversation(chatId);
        if (!state) {
          await telegram.answerCallbackQuery(queryId, 'Sessão expirada. Envie a tarefa novamente.');
          return;
        }
        const priority = parseInt(value, 10);
        conversation.updateConversation(chatId, { priority, step: 'awaiting_client' });
        await telegram.answerCallbackQuery(queryId, PRIORITY_LABELS[priority]);
        await telegram.editMessageText(chatId, callbackQuery.message.message_id,
          `⚡ Prioridade: ${PRIORITY_LABELS[priority]}`);
        await askClient(chatId);
        break;
      }

      case 'client': {
        const state = conversation.getConversation(chatId);
        if (!state) {
          await telegram.answerCallbackQuery(queryId, 'Sessão expirada.');
          return;
        }
        const [optionId, ...clientNameParts] = value.split(':');
        const clientName = clientNameParts.join(':');
        if (optionId === '__custom__') {
          await telegram.answerCallbackQuery(queryId);
          await telegram.editMessageText(chatId, callbackQuery.message.message_id,
            '🏢 Digite o nome do cliente:');
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
        const state = conversation.getConversation(chatId);
        if (!state) {
          await telegram.answerCallbackQuery(queryId, 'Sessão expirada.');
          return;
        }
        if (value === '__custom__') {
          await telegram.answerCallbackQuery(queryId);
          await telegram.editMessageText(chatId, callbackQuery.message.message_id,
            '📅 Digite a data (DD/MM/AAAA ou DD/MM):');
        } else if (value === '__none__') {
          conversation.updateConversation(chatId, { dueDate: null, dueDateMs: null, step: 'awaiting_assignee' });
          await telegram.answerCallbackQuery(queryId, 'Sem prazo');
          await telegram.editMessageText(chatId, callbackQuery.message.message_id,
            '📅 Prazo: Sem prazo definido');
          await askAssignee(chatId);
        } else {
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
        const state = conversation.getConversation(chatId);
        if (!state) {
          await telegram.answerCallbackQuery(queryId, 'Sessão expirada.');
          return;
        }
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

      // --- Fluxo de listagem/status de tarefas ---
      case 'list_filter': {
        await telegram.answerCallbackQuery(queryId);
        await handleListFilter(chatId, callbackQuery.message.message_id, value);
        break;
      }

      case 'task_select': {
        await telegram.answerCallbackQuery(queryId);
        await handleTaskSelect(chatId, value);
        break;
      }

      case 'task_status_select': {
        await telegram.answerCallbackQuery(queryId);
        await handleTaskStatusSelect(chatId, value);
        break;
      }

      case 'task_status_change': {
        const [taskId, newStatus] = value.split(':');
        await telegram.answerCallbackQuery(queryId, `Atualizando...`);
        await handleTaskStatusChange(chatId, taskId, newStatus);
        break;
      }

      // --- Fluxo de churn (desativação de cliente) ---
      case 'churn': {
        if (value === 'cancel') {
          await telegram.answerCallbackQuery(queryId, 'Cancelado');
          await telegram.editMessageText(chatId, callbackQuery.message.message_id, '❌ Churn cancelado.');
        } else if (value.startsWith('confirm:')) {
          const listId = value.replace('confirm:', '');
          await telegram.answerCallbackQuery(queryId, 'Desativando...');
          try {
            const result = await clickup.deactivateClientList(listId);
            await telegram.editMessageText(chatId, callbackQuery.message.message_id,
              `✅ *Cliente desativado*\n\n${result.message}\n\n_Para reativar no futuro, use a interface do ClickUp ou peça ao Alex._`);
          } catch (err) {
            await telegram.editMessageText(chatId, callbackQuery.message.message_id,
              `❌ Erro ao desativar: ${err.message}`);
          }
        } else {
          // Primeira seleção — pedir confirmação
          const [listId, ...nameParts] = value.split(':');
          const clientName = nameParts.join(':');
          await telegram.answerCallbackQuery(queryId);
          await telegram.editMessageText(chatId, callbackQuery.message.message_id,
            `⚠️ *Confirma o churn de ${clientName}?*\n\n` +
            `A lista será arquivada no ClickUp. Tarefas pendentes ficam preservadas mas não aparecem mais na visualização geral.`,
            {
              replyMarkup: {
                inline_keyboard: [
                  [{ text: `✅ Confirmar churn de ${clientName}`, callback_data: `churn:confirm:${listId}` }],
                  [{ text: '❌ Cancelar', callback_data: 'churn:cancel' }],
                ],
              },
            }
          );
        }
        break;
      }

      // --- Fluxo de agendamento de reuniões ---
      case 'sched': {
        const [schedAction, ...schedValueParts] = value.split(':');
        const schedValue = schedValueParts.join(':');
        await handleSchedulingCallback(chatId, queryId, schedAction, schedValue, callbackQuery.message.message_id);
        break;
      }

      // --- Fluxo de onboarding ---
      case 'onboarding': {
        const obState = onboardingState.get(String(chatId));
        if (value === 'skip_phones') {
          if (obState && obState.step === 'awaiting_extra_phones') {
            obState.step = 'awaiting_instagram';
            onboardingState.set(String(chatId), obState);
            await telegram.answerCallbackQuery(queryId, 'Só stakeholder');
            await telegram.editMessageText(chatId, callbackQuery.message.message_id,
              `📱 Participantes: só o stakeholder (${obState.clientPhone})`);
            await telegram.sendMessage(chatId,
              `Passo 4/4 — Qual o *Instagram*? (ou envie "pular")`,
              {
                replyMarkup: {
                  inline_keyboard: [[
                    { text: '⏭️ Pular', callback_data: 'onboarding:skip_ig' },
                  ]],
                },
              }
            );
          }
        } else if (value === 'skip_ig') {
          if (obState && obState.step === 'awaiting_instagram') {
            obState.clientInstagram = '';
            obState.step = 'confirming';
            onboardingState.set(String(chatId), obState);
            await telegram.answerCallbackQuery(queryId, 'Instagram pulado');
            await telegram.editMessageText(chatId, callbackQuery.message.message_id, '📸 Instagram: N/A');
            await sendOnboardingConfirmation(chatId, obState);
          }
        } else if (value === 'start') {
          if (obState && obState.step === 'confirming') {
            await telegram.answerCallbackQuery(queryId, 'Iniciando onboarding...');
            await telegram.editMessageText(chatId, callbackQuery.message.message_id,
              `🚀 Onboarding de *${obState.clientName}* em andamento...`);
            await executeOnboarding(chatId);
          }
        } else if (value === 'cancel') {
          onboardingState.delete(String(chatId));
          await telegram.answerCallbackQuery(queryId, 'Cancelado');
          await telegram.editMessageText(chatId, callbackQuery.message.message_id, '❌ Onboarding cancelado.');
        }
        break;
      }

      // --- Super Alex 2.0: Task Update via botoes ---
      case 'taskup': {
        if (value === 'cancel') {
          await telegram.answerCallbackQuery(queryId, 'Cancelado');
          await telegram.editMessageText(chatId, callbackQuery.message.message_id, '❌ Atualizacao cancelada.');
          break;
        }

        // formato: taskup:TASK_ID:STATUS
        const [taskId, ...statusParts] = value.split(':');
        const newStatus = statusParts.join(':');

        if (newStatus === 'ask') {
          // Buscar tarefa e mostrar opcoes de status
          try {
            const task = await clickup.getTask(taskId);
            if (task) {
              const keyboard = [
                [{ text: '✅ Concluir', callback_data: `taskup:${taskId}:complete` }],
                [{ text: '🔄 Em andamento', callback_data: `taskup:${taskId}:andamento` }],
                [{ text: '⏳ Na fila', callback_data: `taskup:${taskId}:na fila` }],
                [{ text: '👁 Revisao', callback_data: `taskup:${taskId}:revisão` }],
                [{ text: '❌ Cancelar', callback_data: 'taskup:cancel' }],
              ];
              await telegram.answerCallbackQuery(queryId);
              await telegram.editMessageText(chatId, callbackQuery.message.message_id,
                `📌 *${task.name}*\nStatus: ${task.status?.status || '?'}\n\nQual novo status?`);
              await telegram.sendInlineKeyboard(chatId, 'Selecione:', keyboard);
            }
          } catch (e) {
            await telegram.answerCallbackQuery(queryId, 'Erro ao buscar tarefa');
          }
          break;
        }

        // Executar update
        try {
          const result = await clickup.updateTaskStatus(taskId, newStatus);
          if (result) {
            await telegram.answerCallbackQuery(queryId, `Status: ${newStatus}`);
            await telegram.editMessageText(chatId, callbackQuery.message.message_id,
              `✅ Tarefa atualizada para *${newStatus}*`);
            alexMemory.addMessage(String(chatId), 'assistant',
              `Tarefa ${taskId} atualizada para ${newStatus}`, { intent: 'task_update' });
          } else {
            await telegram.answerCallbackQuery(queryId, 'Erro ao atualizar');
            await telegram.sendMessage(chatId, '❌ Erro ao atualizar status. Verifique se o status existe.');
          }
        } catch (e) {
          await telegram.answerCallbackQuery(queryId, 'Erro');
          await telegram.sendMessage(chatId, `❌ Erro: ${e.message}`);
        }
        break;
      }

      default:
        await telegram.answerCallbackQuery(queryId, 'Opção não reconhecida');
    }
  } catch (err) {
    console.error('Error in callback handler:', err);
    await telegram.answerCallbackQuery(queryId, '❌ Erro ao processar');
  }
}

// ============================================================
// Onboarding multi-step handlers
// ============================================================

/**
 * Extrai números de telefone de um texto (aceita múltiplos separados por espaço, vírgula ou quebra de linha).
 * Remove tudo que não é dígito e valida tamanho mínimo.
 */
function extractPhones(text) {
  return text
    .split(/[\s,;\n]+/)
    .map(p => p.replace(/\D/g, ''))
    .filter(p => p.length >= 10);
}

async function handleOnboardingText(chatId, text, state) {
  const key = String(chatId);
  state.updatedAt = Date.now();

  switch (state.step) {
    case 'awaiting_name':
      state.clientName = text.trim();
      state.step = 'awaiting_stakeholder';
      state.clientPhones = [];
      onboardingState.set(key, state);
      await telegram.sendMessage(chatId,
        `👤 Cliente: *${state.clientName}*\n\n` +
        `Passo 2/4 — Qual o *telefone do stakeholder* (contato principal)?\n` +
        `_Ex: 5531999999999_\n\n` +
        `Este será o administrador do grupo WhatsApp.`
      );
      break;

    case 'awaiting_stakeholder': {
      const phone = text.replace(/\D/g, '');
      if (phone.length < 10) {
        await telegram.sendMessage(chatId, '⚠️ Número inválido. Envie com DDD (ex: 5531999999999).');
        return;
      }
      state.clientPhone = phone; // stakeholder = admin
      state.clientPhones = [phone];
      state.step = 'awaiting_extra_phones';
      onboardingState.set(key, state);
      await telegram.sendMessage(chatId,
        `📱 Stakeholder: *${phone}*\n\n` +
        `Passo 3/4 — Mais alguém para adicionar ao grupo?\n` +
        `Envie os números separados por espaço ou vírgula, ou clique "Pular".`,
        {
          replyMarkup: {
            inline_keyboard: [[
              { text: '⏭️ Só o stakeholder', callback_data: 'onboarding:skip_phones' },
            ]],
          },
        }
      );
      break;
    }

    case 'awaiting_extra_phones': {
      const phones = extractPhones(text);
      if (phones.length === 0) {
        await telegram.sendMessage(chatId, '⚠️ Nenhum número válido encontrado. Envie com DDD ou clique "Pular".');
        return;
      }
      // Adiciona sem duplicar
      for (const p of phones) {
        if (!state.clientPhones.includes(p)) state.clientPhones.push(p);
      }
      state.step = 'awaiting_instagram';
      onboardingState.set(key, state);
      const phoneList = state.clientPhones.map((p, i) => `  ${i === 0 ? '👑' : '👤'} ${p}`).join('\n');
      await telegram.sendMessage(chatId,
        `📱 Participantes:\n${phoneList}\n\n` +
        `Passo 4/4 — Qual o *Instagram*? (ou envie "pular")`,
        {
          replyMarkup: {
            inline_keyboard: [[
              { text: '⏭️ Pular', callback_data: 'onboarding:skip_ig' },
            ]],
          },
        }
      );
      break;
    }

    case 'awaiting_instagram': {
      const ig = text.trim().replace(/^@/, '');
      if (ig.toLowerCase() === 'pular') {
        state.clientInstagram = '';
      } else {
        state.clientInstagram = `@${ig}`;
      }
      state.step = 'confirming';
      onboardingState.set(key, state);
      await sendOnboardingConfirmation(chatId, state);
      break;
    }

    default:
      break;
  }
}

async function sendOnboardingConfirmation(chatId, state) {
  const phoneList = (state.clientPhones || [state.clientPhone])
    .map((p, i) => `  ${i === 0 ? '👑 Stakeholder' : '👤 Participante'}: ${p}`)
    .join('\n');
  await telegram.sendMessage(chatId,
    `📋 *Confirme os dados do onboarding:*\n\n` +
    `👤 Nome: *${state.clientName}*\n` +
    `📱 Telefones:\n${phoneList}\n` +
    `📸 Instagram: *${state.clientInstagram || 'N/A'}*\n\n` +
    `Tudo certo?`,
    {
      replyMarkup: {
        inline_keyboard: [[
          { text: '🚀 Iniciar Onboarding', callback_data: 'onboarding:start' },
          { text: '❌ Cancelar', callback_data: 'onboarding:cancel' },
        ]],
      },
    }
  );
}

async function executeOnboarding(chatId) {
  const key = String(chatId);
  const state = onboardingState.get(key);
  if (!state) return;

  const statusMsg = await telegram.sendMessage(chatId,
    `🚀 *Onboarding: ${state.clientName}*\n⏳ Iniciando...`
  );
  const statusMsgId = statusMsg?.result?.message_id;

  const input = {
    clientName: state.clientName,
    clientPhone: state.clientPhone,
    clientPhones: state.clientPhones || [state.clientPhone],
    clientInstagram: state.clientInstagram || '',
    clientEmail: '',
    specialty: '',
    location: '',
    priority: 'standard',
  };

  const statusLines = [`🚀 *Onboarding: ${state.clientName}*`];

  const { context } = await clientOnboarding.runOnboarding(input, async (idx, total, label, status) => {
    const num = idx + 1;
    if (status === 'done') {
      statusLines.push(`✅ ${num}/${total} ${label}`);
    } else if (status === 'error') {
      statusLines.push(`❌ ${num}/${total} ${label}`);
    } else if (status === 'running') {
      statusLines.push(`⏳ ${num}/${total} ${label}...`);
    }

    // Atualizar mensagem de progresso
    if (statusMsgId) {
      try {
        await telegram.editMessageText(chatId, statusMsgId, statusLines.join('\n'));
      } catch (e) {
        // Ignora erro se mensagem não mudou
      }
    }
  });

  onboardingState.delete(key);

  // Enviar resumo final
  if (context.summary) {
    await telegram.sendMessage(chatId, context.summary);
  }

  // Recarregar mapeamento de grupos no notifier (novo cliente adicionado)
  clickupNotifier.reloadGroups();

  // Registrar grupo no Nico Monitor (salvar todas as mensagens do grupo)
  if (context.groupJid) {
    try {
      const clientId = context.clientId || state.clientName.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const nicoRes = await fetch('http://localhost:3001/api/monitor/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupJid: context.groupJid,
          clientKey: clientId,
          clientName: state.clientName,
        }),
      });
      if (nicoRes.ok) {
        console.log(`📡 Grupo ${state.clientName} registrado no Nico Monitor`);
        await telegram.sendMessage(chatId,
          `📡 Grupo *${state.clientName}* adicionado ao monitor de mensagens do Nico.`
        );
      }
    } catch (err) {
      console.warn('⚠️ Erro ao registrar grupo no Nico:', err.message);
    }
  }
}

// ============================================================
// Webhook endpoint
// ============================================================
app.post('/webhook', verifyWebhookSecret, async (req, res) => {
  res.status(200).send('OK');

  try {
    if (req.body.callback_query) {
      await handleCallbackQuery(req.body.callback_query);
      return;
    }

    const message = req.body.message;
    if (!message) return;

    const chatId = message.chat.id;

    if (message.text) {
      await handleTextMessage(chatId, message.text);
    } else if (message.voice || message.audio || message.photo || message.document || message.video) {
      await handleMediaMessage(message);
    } else {
      console.log(`⚠️ Unsupported message type from ${chatId}`);
      telegram.sendMessage(chatId, '📌 Envie texto, áudio, foto, documento ou vídeo com uma descrição da tarefa.\n/help para mais info.');
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }
});

// ============================================================
// Dashboard automático às 08h (domingo apenas — nos outros dias o morning briefing 2.0 cobre)
// ============================================================
if (ALEX_OWNER_CHAT_ID) {
  cron.schedule('0 8 * * 0', async () => {
    console.log('📊 Enviando dashboard automatico (domingo)...');
    await sendDashboard(Number(ALEX_OWNER_CHAT_ID));
  }, { timezone: 'America/Sao_Paulo' });
}

// Polling de conclusão de tarefas para notificação WhatsApp (a cada 2 min)
cron.schedule('*/2 * * * *', async () => {
  await clickupNotifier.pollForCompletions();
}, { timezone: 'America/Sao_Paulo' });

// ============================================================
// Super Alex 2.0 — Cron Jobs Proativos
// ============================================================

if (ALEX_OWNER_CHAT_ID) {
  const ownerChatId = Number(ALEX_OWNER_CHAT_ID);

  // Morning Briefing Enriquecido (08:00 seg-sab, substitui dashboard basico)
  cron.schedule('0 8 * * 1-6', async () => {
    try {
      if (alexMemory.hasAlertedToday('morning_briefing', 'daily', String(ownerChatId))) return;
      console.log('🌅 [Alex 2.0] Gerando morning briefing...');

      const context = await alexContext.gatherContext({ chatId: String(ownerChatId) });
      const { response } = await alexBrain.chat(
        String(ownerChatId),
        'Gere meu briefing da manha. Inclua: reunioes de hoje, tarefas atrasadas, prioridades do dia, e qualquer alerta importante. Seja conciso e direto.',
        context
      );

      if (response) {
        await telegram.sendMessage(ownerChatId, `🌅 *Briefing da Manha*\n\n${response}`);
        alexMemory.addMessage(String(ownerChatId), 'assistant', response, { intent: 'morning_briefing' });
        alexMemory.logAlert('morning_briefing', 'daily', String(ownerChatId), 'Enviado com sucesso');
      }
    } catch (err) {
      console.error('[Alex 2.0] Erro no morning briefing:', err.message);
    }
  }, { timezone: 'America/Sao_Paulo' });

  // Overdue Check (10,12,14,16,18h seg-sex)
  cron.schedule('0 10,12,14,16,18 * * 1-5', async () => {
    try {
      const overdue = await alexContext.getOverdueTasks();
      if (overdue.length === 0) return;

      const alertKey = `overdue_${overdue.length}`;
      if (alexMemory.hasAlertedToday('overdue_check', alertKey, String(ownerChatId))) return;

      let msg = `⚠️ *${overdue.length} tarefa${overdue.length > 1 ? 's' : ''} atrasada${overdue.length > 1 ? 's' : ''}:*\n`;
      overdue.slice(0, 5).forEach(t => {
        msg += `\n- ${t.name} (prazo: ${t.dueDate})`;
      });
      if (overdue.length > 5) msg += `\n... e mais ${overdue.length - 5}`;

      await telegram.sendMessage(ownerChatId, msg);
      alexMemory.logAlert('overdue_check', alertKey, String(ownerChatId), `${overdue.length} tarefas`);
    } catch (err) {
      console.error('[Alex 2.0] Erro no overdue check:', err.message);
    }
  }, { timezone: 'America/Sao_Paulo' });

  // End-of-Day Summary (18:00 seg-sex)
  cron.schedule('0 18 * * 1-5', async () => {
    try {
      if (alexMemory.hasAlertedToday('eod_summary', 'daily', String(ownerChatId))) return;
      console.log('🌇 [Alex 2.0] Gerando resumo do dia...');

      const context = await alexContext.gatherContext({ chatId: String(ownerChatId) });
      const { response } = await alexBrain.chat(
        String(ownerChatId),
        'Faca um resumo rapido do dia: o que foi feito (tarefas concluidas), o que ficou pendente, e o que tem pra amanha. Maximo 5 frases.',
        context
      );

      if (response) {
        await telegram.sendMessage(ownerChatId, `🌇 *Resumo do Dia*\n\n${response}`);
        alexMemory.addMessage(String(ownerChatId), 'assistant', response, { intent: 'eod_summary' });
        alexMemory.logAlert('eod_summary', 'daily', String(ownerChatId), 'Enviado');
      }
    } catch (err) {
      console.error('[Alex 2.0] Erro no EOD summary:', err.message);
    }
  }, { timezone: 'America/Sao_Paulo' });

  // Deadline Alerts (09:00 seg-sex) — tarefas com prazo em 3 dias, 1 dia, hoje
  cron.schedule('0 9 * * 1-5', async () => {
    try {
      const { active } = await alexContext.getActiveTasks();
      const now = new Date();
      const today = now.toLocaleDateString('pt-BR');
      const alerts = [];

      for (const t of active) {
        if (!t.dueDate) continue;
        // Parse dd/mm/yyyy
        const [d, m, y] = t.dueDate.split('/').map(Number);
        if (!d || !m || !y) continue;
        const due = new Date(y, m - 1, d);
        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) alerts.push(`🔴 *HOJE:* ${t.name}`);
        else if (diffDays === 1) alerts.push(`🟡 *Amanha:* ${t.name}`);
        else if (diffDays <= 3 && diffDays > 0) alerts.push(`🟢 *${diffDays} dias:* ${t.name}`);
      }

      if (alerts.length === 0) return;
      const alertKey = `deadline_${alerts.length}`;
      if (alexMemory.hasAlertedToday('deadline_alert', alertKey, String(ownerChatId))) return;

      let msg = `⏰ *Prazos Proximos:*\n\n${alerts.join('\n')}`;
      await telegram.sendMessage(ownerChatId, msg);
      alexMemory.logAlert('deadline_alert', alertKey, String(ownerChatId), `${alerts.length} alertas`);
    } catch (err) {
      console.error('[Alex 2.0] Erro no deadline alert:', err.message);
    }
  }, { timezone: 'America/Sao_Paulo' });

  // Client Inactivity (segunda 09:30) — clientes sem atividade >7 dias
  cron.schedule('30 9 * * 1', async () => {
    try {
      if (alexMemory.hasAlertedToday('client_inactivity', 'weekly', String(ownerChatId))) return;

      const { active } = await alexContext.getActiveTasks();
      const clients = await alexContext.getClientsConfig();
      const activeClients = clients.filter(c => c.status === 'ativo' || c.status === 'ATIVO');

      // Clientes com tarefas ativas
      const clientsWithTasks = new Set();
      for (const t of active) {
        for (const c of activeClients) {
          if (t.name.toLowerCase().includes(c.name.toLowerCase().split(' ').pop())) {
            clientsWithTasks.add(c.name);
          }
        }
      }

      // Clientes sem tarefas ativas
      const inactive = activeClients.filter(c => !clientsWithTasks.has(c.name));
      if (inactive.length === 0) return;

      let msg = `📊 *Clientes sem tarefas ativas:*\n`;
      inactive.forEach(c => { msg += `\n- ${c.name}`; });
      msg += '\n\n_Considere verificar se ha demandas pendentes._';

      await telegram.sendMessage(ownerChatId, msg);
      alexMemory.logAlert('client_inactivity', 'weekly', String(ownerChatId), `${inactive.length} clientes`);
    } catch (err) {
      console.error('[Alex 2.0] Erro no client inactivity check:', err.message);
    }
  }, { timezone: 'America/Sao_Paulo' });

  console.log('🧠 [Alex 2.0] Crons proativos ativados: briefing 08h, overdue checks, EOD 18h, deadlines 09h, inactivity seg 09:30');
}

// ============================================================
// Polling (getUpdates) para desenvolvimento local
// ============================================================
let lastUpdateId = 0;

async function pollUpdates() {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${ALEX_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`
    );
    const data = await response.json();

    if (!data.ok) {
      console.error(`❌ Telegram API error: ${data.description}`);
      setTimeout(pollUpdates, 1000);
      return;
    }

    if (!data.result || data.result.length === 0) {
      setTimeout(pollUpdates, 100);
      return;
    }

    console.log(`📩 Received ${data.result.length} update(s)`);

    for (const update of data.result) {
      lastUpdateId = update.update_id;
      console.log(`  Processing update ${update.update_id}`);

      try {
        if (update.callback_query) {
          console.log(`    → Callback query: ${update.callback_query.data}`);
          await handleCallbackQuery(update.callback_query);
          console.log(`    ✓ Callback processed`);
        } else if (update.message) {
          const message = update.message;
          const chatId = message.chat.id;

          if (message.text) {
            console.log(`    → Message from ${chatId}: "${message.text}"`);
            await handleTextMessage(chatId, message.text);
            console.log(`    ✓ Message handled`);
          } else if (message.voice || message.audio || message.photo || message.document || message.video) {
            const mediaType = message.voice ? 'voice' : message.audio ? 'audio' : message.photo ? 'photo' : message.document ? 'document' : 'video';
            console.log(`    → Media (${mediaType}) from ${chatId}`);
            await handleMediaMessage(message);
            console.log(`    ✓ Media handled`);
          } else {
            console.log(`    → Unsupported message type from ${chatId}`);
          }
        }
      } catch (updateErr) {
        console.error(`  ❌ Error processing update ${update.update_id}:`, updateErr.message);
      }
    }
  } catch (err) {
    console.error('Polling error:', err.message);
  }

  setTimeout(pollUpdates, 100);
}

// ============================================================
// Lembrete automático de reuniões (30 min antes)
// ============================================================
const _remindedEvents = new Set();

async function checkUpcomingMeetings() {
  try {
    const chatId = ALEX_OWNER_CHAT_ID || process.env.IRIS_APPROVAL_CHAT_ID;
    if (!chatId) return;

    // Buscar eventos nos próximos 35 minutos
    const now = new Date();
    const soon = new Date(now.getTime() + 35 * 60 * 1000);
    const thirtyMin = new Date(now.getTime() + 30 * 60 * 1000);

    const events = await googleCalendar.getEventsInRange(now, soon);

    for (const ev of events) {
      const evStart = new Date(ev.start.dateTime || ev.start.date);
      const minutesUntil = Math.round((evStart.getTime() - now.getTime()) / 60000);

      // Lembrar entre 25-35 min antes (janela de 10 min para não perder)
      if (minutesUntil < 25 || minutesUntil > 35) continue;

      // Já lembrou?
      if (_remindedEvents.has(ev.id)) continue;
      _remindedEvents.add(ev.id);

      // Limpar lembretes antigos (> 2h) para não acumular memória
      if (_remindedEvents.size > 100) _remindedEvents.clear();

      const evEnd = new Date(ev.end.dateTime || ev.end.date);
      const dateStr = evStart.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
      const startStr = evStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const endStr = evEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Extrair link do Meet
      const meetLink = ev.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri;

      let msg = `🔔 *Reunião em ${minutesUntil} minutos!*\n\n`;
      msg += `📌 *${ev.summary || 'Reunião'}*\n`;
      msg += `📅 ${dateStr}\n`;
      msg += `🕐 ${startStr} — ${endStr}\n`;

      if (ev.description) {
        msg += `📝 ${ev.description}\n`;
      }

      if (ev.attendees && ev.attendees.length > 0) {
        const attendeeList = ev.attendees
          .filter(a => !a.self)
          .map(a => a.displayName || a.email)
          .join(', ');
        if (attendeeList) msg += `👥 ${attendeeList}\n`;
      }

      if (meetLink) {
        msg += `\n📹 *Link do Meet:*\n${meetLink}`;
        msg += `\n\n_Copie o link acima e envie para o cliente_`;
      }

      if (ev.htmlLink) {
        msg += `\n🔗 [Ver no Calendar](${ev.htmlLink})`;
      }

      await telegram.sendMessage(Number(chatId), msg);
      console.log(`🔔 Lembrete enviado: ${ev.summary} em ${minutesUntil}min`);
    }
  } catch (err) {
    console.error('Meeting reminder error:', err.message);
  }
}

function startMeetingReminder() {
  console.log('🔔 Meeting Reminder: ativo (a cada 5 min)');
  // Checar a cada 5 minutos
  setInterval(checkUpcomingMeetings, 5 * 60 * 1000);
  // Também checar imediatamente na inicialização
  setTimeout(checkUpcomingMeetings, 10000);
}

// ============================================================
// Startup
// ============================================================
app.listen(port, async () => {
  console.log(`\n🤖 Alex Project Manager 2.0 running on port ${port}`);
  console.log(`📡 Mode: POLLING (getUpdates) — local development`);
  console.log(`🔑 Bot Token: ...${ALEX_BOT_TOKEN.slice(-8)}`);
  console.log(`🎤 Groq Whisper: ${GROQ_API_KEY ? 'Ready' : 'Not configured'}`);
  console.log(`🧠 Claude: ${process.env.ANTHROPIC_API_KEY ? 'Ready' : 'Not configured'}`);
  console.log(`📊 Dashboard Owner: ${ALEX_OWNER_CHAT_ID || 'Not configured'}`);

  // Super Alex 2.0: inicializar memoria
  alexMemory.init();

  // Pre-cache de status e clientes do ClickUp
  CACHED_STATUSES = await clickup.getListStatuses();
  if (CACHED_STATUSES.length > 0) {
    console.log(
      `📋 ClickUp Status: ${CACHED_STATUSES.map((s) => s.status).join(', ')}`
    );
  }

  CLIENT_OPTIONS = await clickup.getClientOptions();
  if (CLIENT_OPTIONS.length > 0) {
    console.log(`🏢 Clientes: ${CLIENT_OPTIONS.map(c => c.name).join(', ')}`);
  } else {
    console.log(`🏢 Clientes: Nenhum (campo "Cliente" não encontrado no ClickUp)`);
  }

  // Carregar/seed banco de contatos para auto-invite em reuniões
  const configPath = path.resolve(__dirname, '..', 'docs', 'clientes', 'CLIENTES-CONFIG.json');
  const seeded = contactsDb.seedFromClientConfig(configPath);
  const allContacts = contactsDb.listAll();
  console.log(`📇 Contatos: ${allContacts.length} no banco (${seeded} importados do config)`);

  const members = await clickup.getTeamMembers();
  if (members.length > 0) {
    console.log(`👥 ClickUp Members: ${members.map(m => m.name).join(', ')}`);
  }

  if (ALEX_OWNER_CHAT_ID) {
    console.log(`⏰ Daily dashboard scheduled: 08:00 (São Paulo time)`);
  }

  // Inicializar notificador WhatsApp (snapshot inicial)
  await clickupNotifier.initialize();

  console.log('✅ Ready to receive messages via polling\n');

  // Iniciar lembrete de reuniões (a cada 5 min, checa próximos 35 min)
  startMeetingReminder();

  console.log('🔄 Starting polling loop...');
  pollUpdates();
});
