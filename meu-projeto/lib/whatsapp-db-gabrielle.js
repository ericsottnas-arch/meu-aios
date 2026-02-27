// meu-projeto/lib/whatsapp-db-gabrielle.js
// Banco: Dra Gabrielle Oliveira (instância 5511947937034)

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '../../../docs/clientes/estetica-gabrielleoliveira/banco-dados/conversas.db');
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_chat_jid ON conversas(chat_jid);
    CREATE INDEX IF NOT EXISTS idx_timestamp ON conversas(timestamp DESC);
  `);

  console.log(`✅ Dra Gabrielle DB inicializado em ${DB_PATH}`);
}

function saveMessage(parsed) {
  if (!db) initDB();

  try {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO conversas (
        id, chat_jid, sender_jid, chat_name, push_name, content, message_type,
        is_from_me, is_group, timestamp, audio_url, audio_duration, transcription
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      parsed.messageId || `${Date.now()}-${Math.random()}`,
      parsed.chatJid || parsed.chat_jid || '',
      parsed.senderJid || parsed.sender_jid || '',
      parsed.chatName || parsed.chat_name || '',
      parsed.pushName || parsed.push_name || '',
      parsed.content || '',
      parsed.messageType || 'text',
      parsed.isFromMe ? 1 : 0,
      parsed.isGroup ? 1 : 0,
      parsed.timestamp || Date.now(),
      parsed.audioUrl || null,
      parsed.audioDuration || null,
      parsed.transcription || null
    );
  } catch (err) {
    console.error(`[Gabrielle DB] Erro ao salvar:`, err.message);
  }
}

function getMessages(chatJid, limit = 50) {
  if (!db) initDB();
  try {
    const stmt = db.prepare(`
      SELECT * FROM conversas WHERE chat_jid = ? ORDER BY timestamp DESC LIMIT ?
    `);
    return stmt.all(chatJid, limit);
  } catch (err) {
    console.error(`[Gabrielle DB] Erro ao buscar:`, err.message);
    return [];
  }
}

function getStats() {
  if (!db) initDB();
  try {
    const result = db.prepare(`
      SELECT COUNT(*) as total, COUNT(DISTINCT chat_jid) as chats FROM conversas
    `).get();
    return result;
  } catch (err) {
    return { total: 0, chats: 0 };
  }
}

module.exports = {
  initDB,
  saveMessage,
  getMessages,
  getStats,
};
