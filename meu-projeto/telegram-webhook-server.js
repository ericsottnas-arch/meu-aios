// meu-projeto/telegram-webhook-server.js
// Servidor Telegram do Nico (porta 3000) — Assistente de Agenda
// Cria eventos no Google Calendar via linguagem natural.
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Env vars
if (process.env.NODE_ENV !== 'production') {
  const localEnv = path.resolve(__dirname, '.env');
  const parentEnv = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(localEnv)) require('dotenv').config({ path: localEnv });
  if (fs.existsSync(parentEnv)) require('dotenv').config({ path: parentEnv });
}

const app = express();
const port = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.replace(/"/g, '');
const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const ALLOWED_CHAT_IDS = process.env.TELEGRAM_ALLOWED_CHAT_IDS
  ? process.env.TELEGRAM_ALLOWED_CHAT_IDS.split(',').map(id => id.trim())
  : [];

if (!TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is not set');
  process.exit(1);
}

app.use(bodyParser.json());

// Módulos
const { createTelegramClient } = require('./lib/telegram');
const googleCalendar = require('./lib/google-calendar');

const telegram = createTelegramClient(TELEGRAM_BOT_TOKEN);

// ============================================================
// State management (in-memory, TTL 10min)
// ============================================================
const EXPIRY_MS = 10 * 60 * 1000;
const sessions = new Map();

function getSession(chatId) {
  const key = String(chatId);
  const s = sessions.get(key);
  if (!s) return null;
  if (Date.now() - s.updatedAt > EXPIRY_MS) {
    sessions.delete(key);
    return null;
  }
  s.updatedAt = Date.now();
  return s;
}

function setSession(chatId, data) {
  sessions.set(String(chatId), { ...data, updatedAt: Date.now() });
}

function clearSession(chatId) {
  sessions.delete(String(chatId));
}

// Cleanup periódico
setInterval(() => {
  const now = Date.now();
  for (const [key, s] of sessions.entries()) {
    if (now - s.updatedAt > EXPIRY_MS) sessions.delete(key);
  }
}, 60_000);

// ============================================================
// Groq helpers
// ============================================================
const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function parseCalendarIntent(text) {
  if (!GROQ_API_KEY) return { intent: 'other' };

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const dayNames = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
  const dayOfWeek = dayNames[now.getDay()];

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().split('T')[0];

  const systemPrompt = `Voce e Nico, assistente de agenda da Syra Digital.
Hoje e ${today} (${dayOfWeek}). Timezone: America/Sao_Paulo (UTC-3).

Analise a mensagem e extraia detalhes do evento.
Responda SEMPRE em JSON valido:

{
  "intent": "calendar" ou "other",
  "title": "Titulo do evento (max 60 chars)",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "durationMinutes": 60,
  "attendees": [],
  "description": null
}

Regras:
- "amanha" = ${tomorrowDate}
- Dia da semana = proxima ocorrencia a partir de hoje
- Duracao padrao: 60 minutos
- Horario padrao (se nao especificado): 14:00
- Nomes de pessoas vao no titulo, nao em attendees (a menos que tenham email)
- Se NAO for sobre agendar/marcar/criar evento/reuniao/call/compromisso, intent = "other"
- Exemplos de intent "calendar": "marca reuniao", "agende call", "cria evento", "lembrete", "compromisso amanha"
- Exemplos de intent "other": "ola", "tudo bem?", "obrigado", "qual seu nome"`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.warn(`Groq calendar parse error ${response.status}`);
      return { intent: 'other' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { intent: 'other' };

    const parsed = JSON.parse(content);
    return {
      intent: parsed.intent === 'calendar' ? 'calendar' : 'other',
      title: (parsed.title || '').substring(0, 60),
      date: parsed.date || null,
      time: parsed.time || '14:00',
      durationMinutes: parsed.durationMinutes || 60,
      attendees: Array.isArray(parsed.attendees) ? parsed.attendees : [],
      description: parsed.description || null,
    };
  } catch (err) {
    console.warn('parseCalendarIntent failed:', err.message);
    return { intent: 'other' };
  }
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
    throw new Error(`Groq Whisper error ${response.status}: ${errorText}`);
  }

  return (await response.text()).trim();
}

// ============================================================
// Formatting helpers
// ============================================================
function formatEventPreview(parsed) {
  const date = parsed.date ? new Date(parsed.date + 'T12:00:00') : null;
  const dayNames = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

  let dateStr = 'Nao definida';
  if (date) {
    const dayName = dayNames[date.getUTCDay()];
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = date.getUTCFullYear();
    dateStr = `${dayName}, ${dd}/${mm}/${yyyy}`;
  }

  const startTime = parsed.time || '14:00';
  const [h, m] = startTime.split(':').map(Number);
  const endMinutes = h * 60 + m + (parsed.durationMinutes || 60);
  const endH = String(Math.floor(endMinutes / 60) % 24).padStart(2, '0');
  const endM = String(endMinutes % 60).padStart(2, '0');
  const durationLabel = parsed.durationMinutes >= 60
    ? `${Math.floor(parsed.durationMinutes / 60)}h${parsed.durationMinutes % 60 > 0 ? parsed.durationMinutes % 60 + 'min' : ''}`
    : `${parsed.durationMinutes}min`;

  const attendeesStr = parsed.attendees?.length > 0
    ? parsed.attendees.join(', ')
    : 'Sem participantes';

  let msg = `Novo evento:\n\n`;
  msg += `${parsed.title || 'Sem titulo'}\n`;
  msg += `${dateStr}\n`;
  msg += `${startTime} - ${endH}:${endM} (${durationLabel})\n`;
  msg += `${attendeesStr}`;

  if (parsed.description) {
    msg += `\n${parsed.description}`;
  }

  return msg;
}

function confirmationKeyboard() {
  return [
    [
      { text: 'Confirmar', callback_data: 'cal_confirm' },
      { text: 'Cancelar', callback_data: 'cal_cancel' },
    ],
    [
      { text: 'Editar', callback_data: 'cal_edit' },
    ],
  ];
}

function editFieldKeyboard() {
  return [
    [
      { text: 'Titulo', callback_data: 'cal_edit_field:title' },
      { text: 'Data', callback_data: 'cal_edit_field:date' },
    ],
    [
      { text: 'Horario', callback_data: 'cal_edit_field:time' },
      { text: 'Duracao', callback_data: 'cal_edit_field:duration' },
    ],
    [
      { text: 'Participantes', callback_data: 'cal_edit_field:attendees' },
      { text: 'Voltar', callback_data: 'cal_edit_back' },
    ],
  ];
}

// ============================================================
// Message handlers
// ============================================================

const WELCOME_MSG = `Oi! Sou o Nico, seu assistente de agenda.

Posso criar eventos no seu Google Calendar por texto ou audio.

Exemplos:
- "Marca reuniao com equipe amanha 10h"
- "Agende call sexta 14h por 30 min"
- "Compromisso com Dr. Erico dia 10/03 as 9h"

Comandos:
/agenda - Agendar evento
/help - Ajuda
/cancel - Cancelar operacao`;

const HELP_MSG = `Nico - Assistente de Agenda

Envie uma mensagem de texto ou audio descrevendo o evento.

Exemplos:
- "Reuniao com cliente amanha 15h"
- "Call com equipe segunda 10h 30min"
- "Compromisso quarta 14h por 2 horas"

Comandos:
/start - Inicio
/agenda - Iniciar agendamento
/help - Esta mensagem
/cancel - Cancelar operacao atual`;

const NOT_CALENDAR_MSG = `Sou o Nico, assistente de agenda da Syra Digital.

Para agendar um evento, me diga algo como:
"Marca reuniao com equipe amanha 10h"

Use /help para ver mais exemplos.`;

async function handleTextMessage(chatId, text) {
  // Comandos
  const cmd = text.split(/\s|@/)[0].toLowerCase();

  if (cmd === '/start') {
    return telegram.sendMessage(chatId, WELCOME_MSG);
  }
  if (cmd === '/help') {
    return telegram.sendMessage(chatId, HELP_MSG);
  }
  if (cmd === '/cancel') {
    const had = !!getSession(chatId);
    clearSession(chatId);
    return telegram.sendMessage(chatId, had ? 'Operacao cancelada.' : 'Nenhuma operacao ativa.');
  }
  if (cmd === '/agenda') {
    return telegram.sendMessage(chatId, 'Me diga o que agendar. Exemplo:\n"Reuniao com cliente amanha 14h"');
  }

  // Conversa ativa? (editando campo)
  const session = getSession(chatId);
  if (session?.step === 'editing_field') {
    return handleFieldEdit(chatId, text, session);
  }

  // Parse intent
  await telegram.sendMessage(chatId, 'Analisando...');

  const parsed = await parseCalendarIntent(text);

  if (parsed.intent !== 'calendar') {
    return telegram.sendMessage(chatId, NOT_CALENDAR_MSG);
  }

  // Salvar no state e mostrar confirmacao
  setSession(chatId, { step: 'confirming', parsed });

  const preview = formatEventPreview(parsed);
  return telegram.sendInlineKeyboard(chatId, preview, confirmationKeyboard());
}

async function handleFieldEdit(chatId, text, session) {
  const field = session.editingField;
  const parsed = session.parsed;

  switch (field) {
    case 'title':
      parsed.title = text.substring(0, 60);
      break;
    case 'date': {
      // Aceita DD/MM/YYYY ou YYYY-MM-DD
      const match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        parsed.date = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        parsed.date = text;
      } else {
        return telegram.sendMessage(chatId, 'Formato invalido. Use DD/MM/YYYY ou YYYY-MM-DD.');
      }
      break;
    }
    case 'time': {
      const match = text.match(/(\d{1,2}):?(\d{2})?/);
      if (match) {
        const h = match[1].padStart(2, '0');
        const m = (match[2] || '00').padStart(2, '0');
        parsed.time = `${h}:${m}`;
      } else {
        return telegram.sendMessage(chatId, 'Formato invalido. Use HH:MM (ex: 14:30).');
      }
      break;
    }
    case 'duration': {
      const num = parseInt(text, 10);
      if (num > 0 && num <= 480) {
        parsed.durationMinutes = num;
      } else {
        return telegram.sendMessage(chatId, 'Digite a duracao em minutos (ex: 30, 60, 90).');
      }
      break;
    }
    case 'attendees':
      parsed.attendees = text.split(/[,;\s]+/).filter(e => e.includes('@'));
      if (parsed.attendees.length === 0) {
        return telegram.sendMessage(chatId, 'Digite emails separados por virgula. Ex: joao@email.com, maria@email.com');
      }
      break;
    default:
      break;
  }

  // Voltar para confirmacao
  setSession(chatId, { step: 'confirming', parsed });
  const preview = formatEventPreview(parsed);
  return telegram.sendInlineKeyboard(chatId, preview, confirmationKeyboard());
}

async function handleVoiceMessage(chatId, voice) {
  console.log(`Voice from ${chatId}: ${voice.duration}s`);

  if (!GROQ_API_KEY) {
    return telegram.sendMessage(chatId, 'Transcricao de audio nao disponivel (GROQ_API_KEY nao configurada).');
  }

  try {
    await telegram.sendMessage(chatId, 'Transcrevendo audio...');
    const audioBuffer = await downloadTelegramFile(voice.file_id);
    const transcription = await transcribeAudio(audioBuffer, 'voice.ogg');

    if (!transcription) {
      return telegram.sendMessage(chatId, 'Nao consegui transcrever o audio. Tente novamente ou envie por texto.');
    }

    await telegram.sendMessage(chatId, `Transcricao:\n"${transcription}"`);
    return handleTextMessage(chatId, transcription);
  } catch (err) {
    console.error('Voice processing error:', err);
    return telegram.sendMessage(chatId, 'Erro ao processar audio. Tente enviar por texto.');
  }
}

async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  await telegram.answerCallbackQuery(callbackQuery.id);

  const session = getSession(chatId);

  if (data === 'cal_confirm') {
    if (!session?.parsed) {
      return telegram.sendMessage(chatId, 'Sessao expirada. Envie o evento novamente.');
    }

    const p = session.parsed;
    const startTime = `${p.date}T${p.time}:00`;

    await telegram.sendMessage(chatId, 'Criando evento...');

    const result = await googleCalendar.createEvent({
      title: p.title,
      startTime,
      durationMinutes: p.durationMinutes,
      description: p.description,
      attendees: p.attendees,
    });

    clearSession(chatId);

    if (result.success) {
      let msg = `Evento criado!\n\n"${p.title}"`;
      if (result.htmlLink) {
        msg += `\n\n${result.htmlLink}`;
      }
      return telegram.sendMessage(chatId, msg);
    } else {
      return telegram.sendMessage(chatId, `Erro ao criar evento: ${result.error}\n\nVerifique se o Google Calendar esta configurado corretamente.`);
    }
  }

  if (data === 'cal_cancel') {
    clearSession(chatId);
    return telegram.sendMessage(chatId, 'Cancelado.');
  }

  if (data === 'cal_edit') {
    if (!session?.parsed) {
      return telegram.sendMessage(chatId, 'Sessao expirada. Envie o evento novamente.');
    }
    return telegram.sendInlineKeyboard(chatId, 'Qual campo deseja editar?', editFieldKeyboard());
  }

  if (data === 'cal_edit_back') {
    if (!session?.parsed) {
      return telegram.sendMessage(chatId, 'Sessao expirada. Envie o evento novamente.');
    }
    const preview = formatEventPreview(session.parsed);
    return telegram.sendInlineKeyboard(chatId, preview, confirmationKeyboard());
  }

  if (data.startsWith('cal_edit_field:')) {
    const field = data.split(':')[1];
    if (!session?.parsed) {
      return telegram.sendMessage(chatId, 'Sessao expirada. Envie o evento novamente.');
    }

    setSession(chatId, { ...session, step: 'editing_field', editingField: field });

    const prompts = {
      title: 'Digite o novo titulo:',
      date: 'Digite a nova data (DD/MM/YYYY):',
      time: 'Digite o novo horario (HH:MM):',
      duration: 'Digite a duracao em minutos (ex: 30, 60, 90):',
      attendees: 'Digite os emails dos participantes separados por virgula:',
    };

    return telegram.sendMessage(chatId, prompts[field] || 'Digite o novo valor:');
  }
}

// ============================================================
// Health check
// ============================================================
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'nico-telegram',
    calendar: googleCalendar.isConfigured() ? 'configured' : 'not configured',
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
    console.warn(`Rejected webhook — invalid secret from ${req.ip}`);
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

function verifyChatId(req, res, next) {
  if (ALLOWED_CHAT_IDS.length === 0) return next();
  const chatId = (
    req.body?.message?.chat?.id ||
    req.body?.callback_query?.message?.chat?.id
  )?.toString();
  if (!chatId || !ALLOWED_CHAT_IDS.includes(chatId)) {
    console.warn(`Rejected from unauthorized chat: ${chatId}`);
    return res.status(200).send('OK');
  }
  next();
}

// ============================================================
// Webhook endpoint
// ============================================================
app.post('/webhook', verifyWebhookSecret, verifyChatId, async (req, res) => {
  res.status(200).send('OK');

  try {
    // Callback queries (botoes inline)
    if (req.body.callback_query) {
      await handleCallbackQuery(req.body.callback_query);
      return;
    }

    const message = req.body.message;
    if (!message) return;

    const chatId = message.chat.id;

    // Voz / audio
    if (message.voice || message.audio) {
      const voice = message.voice || message.audio;
      await handleVoiceMessage(chatId, voice);
      return;
    }

    // Texto
    if (message.text) {
      await handleTextMessage(chatId, message.text);
      return;
    }

    // Outros tipos de mensagem
    await telegram.sendMessage(chatId, 'Envie texto ou audio para agendar um evento. Use /help para mais info.');
  } catch (err) {
    console.error('Webhook handler error:', err);
  }
});

// ============================================================
// Polling mode (dev — quando sem webhook)
// ============================================================
let lastUpdateId = 0;

async function pollUpdates() {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offset: lastUpdateId + 1, timeout: 30 }),
    });

    const data = await res.json();
    if (!data.ok || !data.result?.length) return;

    for (const update of data.result) {
      lastUpdateId = update.update_id;

      // Simular req.body para reusar handler
      const fakeReq = {
        body: update,
        headers: {},
        ip: 'polling',
      };
      const fakeRes = {
        status: () => ({ send: () => {}, json: () => {} }),
      };

      // Callback queries
      if (update.callback_query) {
        try { await handleCallbackQuery(update.callback_query); } catch (err) {
          console.error('Polling callback error:', err);
        }
        continue;
      }

      const message = update.message;
      if (!message) continue;

      const chatId = message.chat.id;

      // Check allowed chats
      if (ALLOWED_CHAT_IDS.length > 0 && !ALLOWED_CHAT_IDS.includes(String(chatId))) {
        continue;
      }

      try {
        if (message.voice || message.audio) {
          await handleVoiceMessage(chatId, message.voice || message.audio);
        } else if (message.text) {
          await handleTextMessage(chatId, message.text);
        } else {
          await telegram.sendMessage(chatId, 'Envie texto ou audio para agendar. Use /help para mais info.');
        }
      } catch (err) {
        console.error('Polling message error:', err);
      }
    }
  } catch (err) {
    if (!err.message?.includes('ECONNRESET')) {
      console.error('Polling error:', err.message);
    }
  }
}

// ============================================================
// Startup
// ============================================================
app.listen(port, () => {
  console.log(`\nNico Telegram (Agenda) running on port ${port}`);
  console.log(`Bot Token: ...${TELEGRAM_BOT_TOKEN.slice(-8)}`);
  console.log(`Webhook Secret: ${WEBHOOK_SECRET ? 'Configured' : 'Not set (dev mode)'}`);
  console.log(`Allowed Chats: ${ALLOWED_CHAT_IDS.length > 0 ? ALLOWED_CHAT_IDS.join(', ') : 'All (unrestricted)'}`);
  console.log(`Calendar: ${googleCalendar.isConfigured() ? 'Service account found' : 'NOT CONFIGURED'}`);

  // Se nao tem webhook secret, usa polling mode
  if (!WEBHOOK_SECRET) {
    console.log('Mode: POLLING (no webhook secret)');
    setInterval(pollUpdates, 1000);
  } else {
    console.log('Mode: WEBHOOK');
  }
  console.log('');
});
