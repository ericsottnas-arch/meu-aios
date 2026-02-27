/**
 * Helpers para interação avançada com a API do Telegram.
 * Inline keyboards, callback queries, etc.
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.replace(/"/g, '');

async function callTelegramAPI(method, body) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`Telegram API ${method} error:`, data.description);
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

function editMessageText(chatId, messageId, text) {
  return callTelegramAPI('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
  });
}

// --- Keyboards pré-definidos ---

function priorityKeyboard() {
  return [
    [
      { text: '🔴 Urgente', callback_data: 'priority:1' },
      { text: '🟠 Alta', callback_data: 'priority:2' },
    ],
    [
      { text: '🟡 Normal', callback_data: 'priority:3' },
      { text: '🔵 Baixa', callback_data: 'priority:4' },
    ],
  ];
}

/**
 * Cria teclado inline com opções de clientes do ClickUp.
 * @param {Array<{id: string, name: string}>} clients - Opções do campo personalizado
 */
function clientKeyboard(clients) {
  const rows = [];
  for (let i = 0; i < clients.length; i += 2) {
    const c1 = clients[i];
    const row = [{ text: c1.name, callback_data: `client:${c1.id}:${c1.name}` }];
    if (clients[i + 1]) {
      const c2 = clients[i + 1];
      row.push({ text: c2.name, callback_data: `client:${c2.id}:${c2.name}` });
    }
    rows.push(row);
  }
  rows.push([{ text: '✏️ Digitar outro', callback_data: 'client:__custom__:' }]);
  return rows;
}

function dateKeyboard() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const next2Weeks = new Date(today);
  next2Weeks.setDate(next2Weeks.getDate() + 14);

  return [
    [
      { text: `📅 Hoje (${formatDate(today)})`, callback_data: `date:${today.toISOString().split('T')[0]}` },
      { text: `📅 Amanhã (${formatDate(tomorrow)})`, callback_data: `date:${tomorrow.toISOString().split('T')[0]}` },
    ],
    [
      { text: `📅 1 semana (${formatDate(nextWeek)})`, callback_data: `date:${nextWeek.toISOString().split('T')[0]}` },
      { text: `📅 2 semanas (${formatDate(next2Weeks)})`, callback_data: `date:${next2Weeks.toISOString().split('T')[0]}` },
    ],
    [
      { text: '✏️ Digitar data', callback_data: 'date:__custom__' },
      { text: '⏭️ Sem prazo', callback_data: 'date:__none__' },
    ],
  ];
}

function assigneeKeyboard(members) {
  const rows = [];
  for (let i = 0; i < members.length; i += 2) {
    const row = [
      { text: members[i].name, callback_data: `assignee:${members[i].id}:${members[i].name}` },
    ];
    if (members[i + 1]) {
      row.push({ text: members[i + 1].name, callback_data: `assignee:${members[i + 1].id}:${members[i + 1].name}` });
    }
    rows.push(row);
  }
  rows.push([{ text: '⏭️ Sem responsável', callback_data: 'assignee:__none__:' }]);
  return rows;
}

function formatDate(d) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Obtém a URL temporária de download de um arquivo no Telegram.
 * @param {string} fileId
 * @returns {Promise<{filePath: string, fileUrl: string}|null>}
 */
async function getFileUrl(fileId) {
  const data = await callTelegramAPI('getFile', { file_id: fileId });
  if (!data.ok) return null;
  const filePath = data.result.file_path;
  return {
    filePath,
    fileUrl: `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`,
  };
}

const PRIORITY_LABELS = {
  1: '🔴 Urgente',
  2: '🟠 Alta',
  3: '🟡 Normal',
  4: '🔵 Baixa',
};

module.exports = {
  sendMessage,
  sendInlineKeyboard,
  answerCallbackQuery,
  editMessageText,
  getFileUrl,
  priorityKeyboard,
  clientKeyboard,
  dateKeyboard,
  assigneeKeyboard,
  PRIORITY_LABELS,
};
