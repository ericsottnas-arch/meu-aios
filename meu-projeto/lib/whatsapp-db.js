// meu-projeto/lib/whatsapp-db.js
// Módulo SQLite para espelhar conversas do WhatsApp capturadas do Supabase
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '../../../docs/banco-dados-geral/whatsapp-conversations.db');
let db = null;

/**
 * Inicializa banco de dados SQLite com tabelas e índices
 */
function initDB() {
  if (db) return; // Já inicializado

  // Criar pasta data se não existir
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Tabela principal: conversas
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_conversas_chat_jid ON conversas(chat_jid);
    CREATE INDEX IF NOT EXISTS idx_conversas_timestamp ON conversas(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_conversas_sender_jid ON conversas(sender_jid);
    CREATE INDEX IF NOT EXISTS idx_conversas_is_from_me ON conversas(is_from_me);
  `);

  // Tabela virtual FTS5 para busca full-text
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS conversas_fts USING fts5(
      content UNINDEXED,
      chat_jid UNINDEXED,
      message_type UNINDEXED,
      content='conversas',
      content_rowid='rowid'
    );
  `);

  // Triggers para manter FTS5 atualizado
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS conversas_ai AFTER INSERT ON conversas BEGIN
      INSERT INTO conversas_fts(rowid, content, chat_jid, message_type)
      VALUES (new.rowid, new.content, new.chat_jid, new.message_type);
    END;

    CREATE TRIGGER IF NOT EXISTS conversas_ad AFTER DELETE ON conversas BEGIN
      INSERT INTO conversas_fts(conversas_fts, rowid, content, chat_jid, message_type)
      VALUES('delete', old.rowid, old.content, old.chat_jid, old.message_type);
    END;

    CREATE TRIGGER IF NOT EXISTS conversas_au AFTER UPDATE ON conversas BEGIN
      INSERT INTO conversas_fts(conversas_fts, rowid, content, chat_jid, message_type)
      VALUES('delete', old.rowid, old.content, old.chat_jid, old.message_type);
      INSERT INTO conversas_fts(rowid, content, chat_jid, message_type)
      VALUES (new.rowid, new.content, new.chat_jid, new.message_type);
    END;
  `);

  // Tabela de grupos monitorados dinamicamente (via onboarding)
  db.exec(`
    CREATE TABLE IF NOT EXISTS monitored_groups (
      group_jid TEXT PRIMARY KEY,
      client_key TEXT NOT NULL,
      client_name TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log(`✅ WhatsApp DB inicializado em ${DB_PATH}`);
}

/**
 * Salva uma mensagem no banco de dados (idempotente via INSERT OR IGNORE)
 * @param {Object} parsed - Mensagem parseada do webhook
 */
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
    console.error(`❌ Erro ao salvar mensagem no SQLite:`, err);
  }
}

/**
 * Retorna histórico de um chat específico
 * @param {string} chatJid - JID do chat
 * @param {number} limit - Limite de mensagens (padrão 50)
 * @returns {Array} Mensagens ordenadas por timestamp descendente
 */
function getConversation(chatJid, limit = 50) {
  if (!db) initDB();

  const stmt = db.prepare(`
    SELECT * FROM conversas
    WHERE chat_jid = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);

  const rows = stmt.all(chatJid, limit);
  return rows.reverse(); // Retorna em ordem cronológica (antigo → novo)
}

/**
 * Busca em mensagens (LIKE para compatibilidade com SQLite padrão)
 * @param {string} query - Query de busca
 * @param {number} limit - Limite de resultados
 * @returns {Array} Mensagens que batem com a query
 */
function searchMessages(query, limit = 20) {
  if (!db) initDB();

  // Usar LIKE para busca simples (funciona em qualquer SQLite)
  // Para FTS5 avançado, usar: conversas_fts MATCH
  const stmt = db.prepare(`
    SELECT * FROM conversas
    WHERE content LIKE ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);

  // Adicionar wildcards para LIKE
  const searchQuery = `%${query}%`;
  return stmt.all(searchQuery, limit);
}

/**
 * Retorna resumo de estatísticas por cliente (por dia)
 * @param {string} phone - Número de telefone (JID)
 * @returns {Object} Stats diárias e totais
 */
function summarizeByClient(phone) {
  if (!db) initDB();

  const dailyStmt = db.prepare(`
    SELECT
      date(timestamp, 'unixepoch') as data,
      COUNT(*) as total,
      SUM(CASE WHEN is_from_me = 1 THEN 1 ELSE 0 END) as enviadas,
      SUM(CASE WHEN is_from_me = 0 THEN 1 ELSE 0 END) as recebidas
    FROM conversas
    WHERE chat_jid = ?
    GROUP BY data
    ORDER BY data DESC
    LIMIT 30
  `);

  const totalStmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN is_from_me = 1 THEN 1 ELSE 0 END) as enviadas,
      SUM(CASE WHEN is_from_me = 0 THEN 1 ELSE 0 END) as recebidas,
      MIN(timestamp) as primeira_mensagem,
      MAX(timestamp) as ultima_mensagem,
      COUNT(DISTINCT sender_jid) as unicas_pessoas
    FROM conversas
    WHERE chat_jid = ?
  `);

  const daily = dailyStmt.all(phone);
  const total = totalStmt.get(phone) || {
    total: 0,
    enviadas: 0,
    recebidas: 0,
    primeira_mensagem: null,
    ultima_mensagem: null,
    unicas_pessoas: 0,
  };

  return { daily, total };
}

/**
 * Lista todos os chats com última mensagem e totais
 * @returns {Array} Chats com metadados
 */
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
       ORDER BY c2.timestamp DESC LIMIT 1) as ultima_mensagem,
      is_group
    FROM conversas c1
    GROUP BY chat_jid
    ORDER BY MAX(timestamp) DESC
  `);

  return stmt.all();
}

/**
 * Retorna contagem de mensagens
 * @returns {number} Total de mensagens no banco
 */
function getTotalMessages() {
  if (!db) initDB();

  const stmt = db.prepare('SELECT COUNT(*) as count FROM conversas');
  const result = stmt.get();
  return result.count;
}

/**
 * Deleta mensagens antigas (para limpeza)
 * @param {number} daysOld - Quantos dias atrás
 * @returns {number} Número de linhas deletadas
 */
function cleanupOldMessages(daysOld = 90) {
  if (!db) initDB();

  const cutoffTimestamp = Math.floor(Date.now() / 1000) - daysOld * 24 * 60 * 60;
  const stmt = db.prepare('DELETE FROM conversas WHERE timestamp < ?');
  const result = stmt.run(cutoffTimestamp);
  return result.changes;
}

// ============================================================
// Monitored Groups (grupos adicionados dinamicamente)
// ============================================================

/**
 * Registra um grupo para monitoramento
 * @param {string} groupJid - JID do grupo WhatsApp (ex: 120363xxx@g.us)
 * @param {string} clientKey - Chave do cliente (ex: 'dra-bruna-nogueira')
 * @param {string} clientName - Nome do cliente (ex: 'Dra. Bruna Nogueira')
 */
function registerMonitoredGroup(groupJid, clientKey, clientName) {
  if (!db) initDB();
  db.prepare(`
    INSERT OR REPLACE INTO monitored_groups (group_jid, client_key, client_name)
    VALUES (?, ?, ?)
  `).run(groupJid, clientKey, clientName);
}

/**
 * Busca grupo monitorado pelo JID
 * @param {string} groupJid
 * @returns {{ group_jid: string, client_key: string, client_name: string } | null}
 */
function getMonitoredGroup(groupJid) {
  if (!db) initDB();
  return db.prepare('SELECT * FROM monitored_groups WHERE group_jid = ?').get(groupJid) || null;
}

/**
 * Lista todos os grupos monitorados
 * @returns {Array}
 */
function listMonitoredGroups() {
  if (!db) initDB();
  return db.prepare('SELECT * FROM monitored_groups ORDER BY client_name').all();
}

/**
 * Remove um grupo do monitoramento
 * @param {string} groupJid
 */
function removeMonitoredGroup(groupJid) {
  if (!db) initDB();
  db.prepare('DELETE FROM monitored_groups WHERE group_jid = ?').run(groupJid);
}

/**
 * Busca grupo monitorado pelo chatJid de uma mensagem
 * Verifica se a mensagem veio de um grupo registrado
 * @param {string} chatJid
 * @returns {{ client_key: string, client_name: string } | null}
 */
function findMonitoredGroupByChatJid(chatJid) {
  if (!db) initDB();
  return db.prepare('SELECT client_key, client_name FROM monitored_groups WHERE group_jid = ?').get(chatJid) || null;
}

module.exports = {
  initDB,
  saveMessage,
  getConversation,
  searchMessages,
  summarizeByClient,
  listChats,
  getTotalMessages,
  cleanupOldMessages,
  registerMonitoredGroup,
  getMonitoredGroup,
  listMonitoredGroups,
  removeMonitoredGroup,
  findMonitoredGroupByChatJid,
};
