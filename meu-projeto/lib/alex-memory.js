/**
 * Alex Memory — SQLite para memória persistente de conversas
 * Super Alex 2.0: memória ilimitada com resumos automáticos
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '..', 'alex-conversations.db');

let db;

function getDb() {
  if (db) return db;
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS alex_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      intent TEXT,
      client TEXT,
      metadata TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alex_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      message_count INTEGER DEFAULT 0,
      from_message_id INTEGER,
      to_message_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alex_proactive_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      alert_key TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_messages_chat ON alex_messages(chat_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_summaries_chat ON alex_summaries(chat_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_proactive_dedup ON alex_proactive_log(type, alert_key, chat_id, timestamp);
  `);

  return db;
}

function init() {
  getDb();
  console.log('[alex-memory] SQLite inicializado');
}

/**
 * Salva uma mensagem na memória
 * @param {string} chatId
 * @param {'user'|'assistant'} role
 * @param {string} content
 * @param {{ intent?: string, client?: string, metadata?: object }} opts
 */
function addMessage(chatId, role, content, opts = {}) {
  if (!content || !content.trim()) return;
  const d = getDb();
  d.prepare(`
    INSERT INTO alex_messages (chat_id, role, content, intent, client, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    String(chatId),
    role,
    content.trim(),
    opts.intent || null,
    opts.client || null,
    opts.metadata ? JSON.stringify(opts.metadata) : null
  );
}

/**
 * Retorna as últimas N mensagens de um chat
 * @param {string} chatId
 * @param {number} limit
 * @returns {Array<{ id, role, content, intent, client, timestamp }>}
 */
function getRecentMessages(chatId, limit = 20) {
  const d = getDb();
  return d.prepare(`
    SELECT id, role, content, intent, client, timestamp
    FROM alex_messages
    WHERE chat_id = ?
    ORDER BY id DESC
    LIMIT ?
  `).all(String(chatId), limit).reverse();
}

/**
 * Retorna histórico formatado para LLM (com resumo prepended se existir)
 * @param {string} chatId
 * @param {number} limit
 * @returns {Array<{ role: string, content: string }>}
 */
function getHistoryForLLM(chatId, limit = 20) {
  const messages = [];

  // Prepend resumo se existir
  const summary = getLatestSummary(chatId);
  if (summary) {
    messages.push({
      role: 'system',
      content: `[RESUMO DA CONVERSA ANTERIOR]\n${summary.summary}`,
    });
  }

  // Mensagens recentes
  const recent = getRecentMessages(chatId, limit);
  for (const msg of recent) {
    messages.push({ role: msg.role, content: msg.content });
  }

  return messages;
}

/**
 * Retorna o último resumo de um chat
 * @param {string} chatId
 * @returns {{ summary: string, message_count: number, timestamp: string } | null}
 */
function getLatestSummary(chatId) {
  const d = getDb();
  return d.prepare(`
    SELECT summary, message_count, timestamp
    FROM alex_summaries
    WHERE chat_id = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(String(chatId)) || null;
}

/**
 * Verifica se deve gerar um novo resumo (>50 mensagens desde o último)
 * @param {string} chatId
 * @returns {boolean}
 */
function shouldGenerateSummary(chatId) {
  const d = getDb();
  const lastSummary = d.prepare(`
    SELECT to_message_id FROM alex_summaries
    WHERE chat_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(String(chatId));

  const fromId = lastSummary?.to_message_id || 0;
  const count = d.prepare(`
    SELECT COUNT(*) as cnt FROM alex_messages
    WHERE chat_id = ? AND id > ?
  `).get(String(chatId), fromId);

  return (count?.cnt || 0) > 50;
}

/**
 * Gera um resumo das mensagens recentes via Groq
 * @param {string} chatId
 * @param {string} groqApiKey
 */
async function generateSummary(chatId, groqApiKey) {
  if (!groqApiKey) return;

  const d = getDb();
  const lastSummary = d.prepare(`
    SELECT to_message_id FROM alex_summaries
    WHERE chat_id = ? ORDER BY id DESC LIMIT 1
  `).get(String(chatId));

  const fromId = lastSummary?.to_message_id || 0;
  const messages = d.prepare(`
    SELECT id, role, content FROM alex_messages
    WHERE chat_id = ? AND id > ?
    ORDER BY id ASC
    LIMIT 100
  `).all(String(chatId), fromId);

  if (messages.length < 10) return;

  const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  const lastId = messages[messages.length - 1].id;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Resuma esta conversa em 3-5 frases concisas. Capture:
- Decisoes tomadas
- Tarefas mencionadas/criadas
- Clientes discutidos
- Proximos passos combinados
Responda APENAS com o resumo, sem preambulo.`,
          },
          { role: 'user', content: conversation },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    if (!response.ok) return;

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) return;

    d.prepare(`
      INSERT INTO alex_summaries (chat_id, summary, message_count, from_message_id, to_message_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(String(chatId), summary, messages.length, fromId, lastId);

    console.log(`[alex-memory] Resumo gerado para chat ${chatId} (${messages.length} mensagens)`);
  } catch (err) {
    console.error('[alex-memory] Erro ao gerar resumo:', err.message);
  }
}

/**
 * Verifica se um alerta deste tipo/key já foi enviado hoje
 * @param {string} type
 * @param {string} key
 * @param {string} chatId
 * @returns {boolean}
 */
function hasAlertedToday(type, key, chatId) {
  const d = getDb();
  const today = new Date().toISOString().split('T')[0];
  const row = d.prepare(`
    SELECT id FROM alex_proactive_log
    WHERE type = ? AND alert_key = ? AND chat_id = ?
    AND DATE(timestamp) = ?
    LIMIT 1
  `).get(type, key, String(chatId), today);
  return !!row;
}

/**
 * Registra que um alerta foi enviado
 * @param {string} type
 * @param {string} key
 * @param {string} chatId
 * @param {string} details
 */
function logAlert(type, key, chatId, details = '') {
  const d = getDb();
  d.prepare(`
    INSERT INTO alex_proactive_log (type, alert_key, chat_id, details)
    VALUES (?, ?, ?, ?)
  `).run(type, key, String(chatId), details);
}

/**
 * Conta total de mensagens para um chat
 * @param {string} chatId
 * @returns {number}
 */
function getMessageCount(chatId) {
  const d = getDb();
  const row = d.prepare('SELECT COUNT(*) as cnt FROM alex_messages WHERE chat_id = ?')
    .get(String(chatId));
  return row?.cnt || 0;
}

module.exports = {
  init,
  addMessage,
  getRecentMessages,
  getHistoryForLLM,
  getLatestSummary,
  shouldGenerateSummary,
  generateSummary,
  hasAlertedToday,
  logAlert,
  getMessageCount,
};
