/**
 * Memória conversacional do Celo.
 * Sliding window de 20 mensagens por chatId, persist em JSON.
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'celo-memory.json');
const MAX_MESSAGES = 20;
const CLEANUP_AGE_MS = 24 * 60 * 60 * 1000; // 24h
const SAVE_DEBOUNCE_MS = 30_000; // 30s

let conversations = {};
let saveTimer = null;
let dirty = false;

// --- Persistência ---

function load() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const raw = fs.readFileSync(DATA_PATH, 'utf8');
      const data = JSON.parse(raw);
      conversations = data.conversations || {};
      console.log(`Memory: ${Object.keys(conversations).length} conversas carregadas.`);
    }
  } catch (err) {
    console.error('Memory: erro ao carregar:', err.message);
    conversations = {};
  }
}

function save() {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify({ conversations }, null, 2));
    dirty = false;
  } catch (err) {
    console.error('Memory: erro ao salvar:', err.message);
  }
}

function scheduleSave() {
  dirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (dirty) save();
  }, SAVE_DEBOUNCE_MS);
}

// --- API ---

/**
 * Adiciona mensagem ao histórico de um chat.
 * @param {string} chatId
 * @param {'user'|'assistant'} role
 * @param {string} content
 * @param {string} [clientId]
 */
function addMessage(chatId, role, content, clientId) {
  if (!conversations[chatId]) {
    conversations[chatId] = { messages: [], lastActivity: Date.now() };
  }
  const conv = conversations[chatId];
  conv.messages.push({
    role,
    content,
    timestamp: Date.now(),
    ...(clientId && { clientId }),
  });
  // Sliding window
  if (conv.messages.length > MAX_MESSAGES) {
    conv.messages = conv.messages.slice(-MAX_MESSAGES);
  }
  conv.lastActivity = Date.now();
  scheduleSave();
}

/**
 * Retorna histórico de mensagens de um chat.
 * @param {string} chatId
 * @param {number} [limit]
 * @returns {Array}
 */
function getHistory(chatId, limit) {
  const conv = conversations[chatId];
  if (!conv) return [];
  const msgs = conv.messages;
  return limit ? msgs.slice(-limit) : msgs;
}

/**
 * Retorna histórico formatado para API do Groq (multi-turn).
 * @param {string} chatId
 * @param {number} [limit]
 * @returns {Array<{role: string, content: string}>}
 */
function getHistoryForLLM(chatId, limit) {
  const msgs = getHistory(chatId, limit);
  return msgs.map(m => ({ role: m.role, content: m.content }));
}

/**
 * Limpa conversas inativas > 24h.
 */
function cleanup() {
  const now = Date.now();
  let removed = 0;
  for (const [id, conv] of Object.entries(conversations)) {
    if (now - conv.lastActivity > CLEANUP_AGE_MS) {
      delete conversations[id];
      removed++;
    }
  }
  if (removed > 0) {
    console.log(`Memory: ${removed} conversas expiradas removidas.`);
    scheduleSave();
  }
}

/**
 * Retorna o último clientId mencionado na conversa.
 * @param {string} chatId
 * @returns {string|null}
 */
function getLastClientId(chatId) {
  const msgs = getHistory(chatId);
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].clientId) return msgs[i].clientId;
  }
  return null;
}

// --- Inicialização ---

function init() {
  load();
  cleanup();
  // Cleanup automático a cada 30min
  setInterval(cleanup, 30 * 60 * 1000).unref();
  // Salvar ao sair
  process.on('beforeExit', () => { if (dirty) save(); });
  process.on('SIGINT', () => { if (dirty) save(); process.exit(0); });
  process.on('SIGTERM', () => { if (dirty) save(); process.exit(0); });
}

module.exports = {
  init,
  addMessage,
  getHistory,
  getHistoryForLLM,
  getLastClientId,
  cleanup,
  save,
};
