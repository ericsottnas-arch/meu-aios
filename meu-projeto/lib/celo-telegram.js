/**
 * Módulo Telegram dedicado do agente Celo.
 * Usa CELO_BOT_TOKEN (bot separado do Alex/ClickUp).
 */

const CELO_BOT_TOKEN = process.env.CELO_BOT_TOKEN?.replace(/"/g, '');

async function callTelegramAPI(method, body) {
  const url = `https://api.telegram.org/bot${CELO_BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`Celo Telegram API ${method} error:`, data.description);
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

// --- Keyboards do Celo ---

function budgetApprovalKeyboard(requestId) {
  return [
    [
      { text: 'Aprovar', callback_data: `celo:approve:${requestId}` },
      { text: 'Rejeitar', callback_data: `celo:reject:${requestId}` },
    ],
    [
      { text: 'Ver detalhes', callback_data: `celo:details:${requestId}` },
    ],
  ];
}

/**
 * Configura o webhook do bot do Celo.
 * @param {string} url - URL pública do webhook (ex: https://celo.syradigital.com/webhook)
 * @returns {Promise<Object>}
 */
function setWebhook(url) {
  return callTelegramAPI('setWebhook', { url });
}

function deleteWebhook() {
  return callTelegramAPI('deleteWebhook', {});
}

function getMe() {
  return callTelegramAPI('getMe', {});
}

// --- Keyboards de campanhas ---

/**
 * Keyboard com lista de campanhas (1 por linha com emoji de status).
 * @param {Array<{id: string, name: string, status: string}>} campaigns
 * @returns {Array<Array<Object>>}
 */
function campaignListKeyboard(campaigns) {
  const statusEmoji = { ACTIVE: '🟢', PAUSED: '⏸️', DELETED: '🗑️', ARCHIVED: '📦' };
  return campaigns.slice(0, 10).map((c) => [
    { text: `${statusEmoji[c.status] || '⚪'} ${c.name}`, callback_data: `camp:select:${c.id}` },
  ]);
}

/**
 * Keyboard de ações para uma campanha selecionada.
 * @param {string} campaignId
 * @param {string} status - 'ACTIVE' ou 'PAUSED'
 * @returns {Array<Array<Object>>}
 */
function campaignActionKeyboard(campaignId, status) {
  const toggleBtn = status === 'ACTIVE'
    ? { text: '⏸️ Pausar', callback_data: `camp:pause:${campaignId}` }
    : { text: '▶️ Ativar', callback_data: `camp:activate:${campaignId}` };

  return [
    [
      { text: '📊 Métricas', callback_data: `camp:metrics:${campaignId}` },
      toggleBtn,
    ],
    [
      { text: '💰 Escalar', callback_data: `camp:scale:${campaignId}` },
      { text: '📋 Duplicar', callback_data: `camp:duplicate:${campaignId}` },
    ],
  ];
}

/**
 * Obtém URL de download de um arquivo do Telegram.
 * @param {string} fileId - file_id do áudio/voice/document
 * @returns {Promise<string|null>} URL para download
 */
async function getFileUrl(fileId) {
  const data = await callTelegramAPI('getFile', { file_id: fileId });
  if (!data.ok || !data.result?.file_path) return null;
  return `https://api.telegram.org/file/bot${CELO_BOT_TOKEN}/${data.result.file_path}`;
}

module.exports = {
  sendMessage,
  sendInlineKeyboard,
  answerCallbackQuery,
  editMessageText,
  budgetApprovalKeyboard,
  campaignListKeyboard,
  campaignActionKeyboard,
  setWebhook,
  deleteWebhook,
  getMe,
  getFileUrl,
};
