// meu-projeto/lib/whatsapp-db-gabriele.js
// Banco separado: apenas Dra Gabriele Oliveira (estética)

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '../../../docs/clientes/dra-gabriele-oliveira/banco-dados/conversas.db');
let db = null;

function initDB() {
  if (db) return;

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS conversas (
      id TEXT PRIMARY KEY,
      chat_jid TEXT NOT NULL,
      sender_jid TEXT,
      chat_name TEXT,
      push_name TEXT,
      content TEXT,
      message_type TEXT,
      is_from_me INTEGER DEFAULT 0,
      is_group INTEGER DEFAULT 0,
      timestamp INTEGER,
      audio_url TEXT,
      audio_duration INTEGER,
      transcription TEXT,
      raw_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_chat_jid ON conversas(chat_jid);
    CREATE INDEX IF NOT EXISTS idx_timestamp ON conversas(timestamp DESC);
  `);

  console.log(`✅ Dra Gabriele DB inicializado em ${DB_PATH}`);
}

function saveMessage(parsed) {
  if (!db) initDB();

  try {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO conversas (
        id, chat_jid, sender_jid, chat_name, push_name, content,
        message_type, is_from_me, is_group, timestamp, audio_url, audio_duration, transcription, raw_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      parsed.id || `${parsed.chatJid}_${parsed.timestamp}`,
      parsed.chatJid,
      parsed.senderJid,
      parsed.chatName,
      parsed.pushName,
      parsed.text || '',
      parsed.type || 'unknown',
      parsed.isFromMe ? 1 : 0,
      parsed.isGroup ? 1 : 0,
      parsed.timestamp,
      parsed.mediaUrl || null,
      parsed.audioDuration || null,
      parsed.transcription || null,
      parsed.rawMessage ? JSON.stringify(parsed.rawMessage) : null
    );
  } catch (err) {
    console.error(`Erro ao salvar no DB Gabriele:`, err);
  }
}

function getConversation(chatJid, limit = 50) {
  if (!db) initDB();
  const stmt = db.prepare(`
    SELECT * FROM conversas
    WHERE chat_jid = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);
  const rows = stmt.all(chatJid, limit);
  return rows.reverse();
}

function listChats() {
  if (!db) initDB();
  const stmt = db.prepare(`
    SELECT
      chat_jid,
      chat_name,
      COUNT(*) as total_mensagens,
      SUM(CASE WHEN is_from_me = 1 THEN 1 ELSE 0 END) as enviadas,
      SUM(CASE WHEN is_from_me = 0 THEN 1 ELSE 0 END) as recebidas,
      MAX(timestamp) as ultima_mensagem_timestamp,
      (SELECT content FROM conversas c2
       WHERE c2.chat_jid = c1.chat_jid
       ORDER BY c2.timestamp DESC LIMIT 1) as ultima_mensagem
    FROM conversas c1
    GROUP BY chat_jid
    ORDER BY MAX(timestamp) DESC
  `);
  return stmt.all();
}

function getTotalMessages() {
  if (!db) initDB();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM conversas');
  return stmt.get().count;
}

function getStats(chatJid) {
  if (!db) initDB();
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN is_from_me = 1 THEN 1 ELSE 0 END) as enviadas,
      SUM(CASE WHEN is_from_me = 0 THEN 1 ELSE 0 END) as recebidas,
      COUNT(DISTINCT sender_jid) as pessoas_unicas
    FROM conversas
    WHERE chat_jid = ?
  `);
  return stmt.get(chatJid);
}

module.exports = {
  initDB,
  saveMessage,
  getConversation,
  listChats,
  getTotalMessages,
  getStats
};
