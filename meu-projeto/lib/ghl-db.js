// meu-projeto/lib/ghl-db.js
// Módulo SQLite para espelhar conversas do GHL

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '../../../docs/banco-dados-geral/ghl-conversations.db');
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

  // Tabela principal: conversas GHL
  db.exec(`
    CREATE TABLE IF NOT EXISTS ghl_conversas (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL UNIQUE,
      contact_id TEXT,
      contact_name TEXT,
      status TEXT DEFAULT 'active',
      type TEXT DEFAULT 'sms',
      from_number TEXT,
      to_number TEXT,
      last_message_date INTEGER,
      unread_count INTEGER DEFAULT 0,
      message_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ghl_conversas_conversation_id ON ghl_conversas(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_ghl_conversas_contact_id ON ghl_conversas(contact_id);
    CREATE INDEX IF NOT EXISTS idx_ghl_conversas_timestamp ON ghl_conversas(last_message_date DESC);
    CREATE INDEX IF NOT EXISTS idx_ghl_conversas_status ON ghl_conversas(status);
    CREATE INDEX IF NOT EXISTS idx_ghl_conversas_unread ON ghl_conversas(unread_count) WHERE unread_count > 0;
  `);

  // Tabela: mensagens
  db.exec(`
    CREATE TABLE IF NOT EXISTS ghl_mensagens (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL UNIQUE,
      conversation_id TEXT NOT NULL,
      body TEXT,
      from_number TEXT,
      to_number TEXT,
      direction TEXT DEFAULT 'inbound',
      message_type TEXT DEFAULT 'text',
      attachments TEXT,
      timestamp INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(conversation_id) REFERENCES ghl_conversas(conversation_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ghl_mensagens_conversation_id ON ghl_mensagens(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_ghl_mensagens_timestamp ON ghl_mensagens(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_ghl_mensagens_direction ON ghl_mensagens(direction);
  `);

  // Tabela virtual FTS5 para busca full-text
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS ghl_mensagens_fts USING fts5(
      body UNINDEXED,
      conversation_id UNINDEXED,
      contact_name UNINDEXED,
      from_number UNINDEXED,
      content='ghl_mensagens',
      content_rowid='rowid'
    );
  `);

  // Triggers para manter FTS5 atualizado
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS ghl_mensagens_ai AFTER INSERT ON ghl_mensagens BEGIN
      INSERT INTO ghl_mensagens_fts(rowid, body, conversation_id, contact_name, from_number)
      SELECT NEW.rowid, NEW.body, NEW.conversation_id,
             (SELECT contact_name FROM ghl_conversas WHERE conversation_id = NEW.conversation_id),
             NEW.from_number;
    END;

    CREATE TRIGGER IF NOT EXISTS ghl_mensagens_ad AFTER DELETE ON ghl_mensagens BEGIN
      INSERT INTO ghl_mensagens_fts(ghl_mensagens_fts, rowid, body, conversation_id, contact_name, from_number)
      VALUES('delete', old.rowid, old.body, old.conversation_id,
             (SELECT contact_name FROM ghl_conversas WHERE conversation_id = old.conversation_id),
             old.from_number);
    END;

    CREATE TRIGGER IF NOT EXISTS ghl_mensagens_au AFTER UPDATE ON ghl_mensagens BEGIN
      INSERT INTO ghl_mensagens_fts(ghl_mensagens_fts, rowid, body, conversation_id, contact_name, from_number)
      VALUES('delete', old.rowid, old.body, old.conversation_id,
             (SELECT contact_name FROM ghl_conversas WHERE conversation_id = old.conversation_id),
             old.from_number);
      INSERT INTO ghl_mensagens_fts(rowid, body, conversation_id, contact_name, from_number)
      SELECT NEW.rowid, NEW.body, NEW.conversation_id,
             (SELECT contact_name FROM ghl_conversas WHERE conversation_id = NEW.conversation_id),
             NEW.from_number;
    END;
  `);

  console.log('✅ SQLite inicializado:', DB_PATH);
}

class GHLDB {
  constructor() {
    initDB();
  }

  /**
   * Salvar ou atualizar conversa
   */
  saveConversation(conversationData) {
    try {
      const {
        conversationId,
        contactId,
        contactName,
        status = 'active',
        type = 'sms',
        fromNumber,
        toNumber,
        lastMessageDate,
        unreadCount = 0
      } = conversationData;

      const stmt = db.prepare(`
        INSERT INTO ghl_conversas (
          id, conversation_id, contact_id, contact_name, status, type,
          from_number, to_number, last_message_date, unread_count, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(conversation_id) DO UPDATE SET
          contact_id = excluded.contact_id,
          contact_name = excluded.contact_name,
          status = excluded.status,
          type = excluded.type,
          from_number = excluded.from_number,
          to_number = excluded.to_number,
          last_message_date = excluded.last_message_date,
          unread_count = excluded.unread_count,
          updated_at = CURRENT_TIMESTAMP
      `);

      const id = `ghl-conv-${conversationId}-${Date.now()}`;
      stmt.run(
        id,
        conversationId,
        contactId,
        contactName || 'Desconhecido',
        status,
        type,
        fromNumber,
        toNumber,
        Math.floor((lastMessageDate || Date.now()) / 1000),
        unreadCount
      );

      return { success: true, id };
    } catch (error) {
      console.error('Erro ao salvar conversa:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Salvar mensagem
   */
  saveMessage(messageData) {
    try {
      const {
        messageId,
        conversationId,
        body,
        from,
        to,
        timestamp,
        direction = 'inbound',
        messageType = 'text',
        attachments = []
      } = messageData;

      const stmt = db.prepare(`
        INSERT OR IGNORE INTO ghl_mensagens (
          id, message_id, conversation_id, body, from_number, to_number,
          direction, message_type, attachments, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const id = `ghl-msg-${messageId}-${Date.now()}`;
      const timestampMs = Math.floor(timestamp * 1000);

      stmt.run(
        id,
        messageId,
        conversationId,
        body,
        from,
        to,
        direction,
        messageType,
        JSON.stringify(attachments),
        Math.floor(timestamp)
      );

      return { success: true, id };
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Buscar todas as mensagens de uma conversa
   */
  getMessages(conversationId, limit = 50) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM ghl_mensagens
        WHERE conversation_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      const data = stmt.all(conversationId, limit);
      return {
        success: true,
        data: data.map(msg => ({
          ...msg,
          attachments: JSON.parse(msg.attachments || '[]')
        }))
      };
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Buscar conversa por ID
   */
  getConversation(conversationId) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM ghl_conversas WHERE conversation_id = ?
      `);

      const data = stmt.get(conversationId);
      return { success: !!data, data: data || null };
    } catch (error) {
      console.error('Erro ao buscar conversa:', error.message);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Buscar todas as conversas
   */
  getAllConversations(limit = 50, offset = 0) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM ghl_conversas
        ORDER BY last_message_date DESC
        LIMIT ? OFFSET ?
      `);

      const data = stmt.all(limit, offset);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Erro ao buscar conversas:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Marcar conversa como lida
   */
  markConversationAsRead(conversationId) {
    try {
      const stmt = db.prepare(`
        UPDATE ghl_conversas
        SET unread_count = 0, updated_at = CURRENT_TIMESTAMP
        WHERE conversation_id = ?
      `);

      stmt.run(conversationId);
      return { success: true };
    } catch (error) {
      console.error('Erro ao marcar como lida:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Buscar conversas não lidas
   */
  getUnreadConversations() {
    try {
      const stmt = db.prepare(`
        SELECT * FROM ghl_conversas
        WHERE unread_count > 0
        ORDER BY last_message_date DESC
      `);

      const data = stmt.all();
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Erro ao buscar conversas não lidas:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Deletar conversa
   */
  deleteConversation(conversationId) {
    try {
      const stmt = db.prepare(`
        DELETE FROM ghl_conversas WHERE conversation_id = ?
      `);

      stmt.run(conversationId);
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar conversa:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Buscar com FTS5
   */
  searchMessages(query, limit = 50) {
    try {
      const stmt = db.prepare(`
        SELECT ghl_mensagens.* FROM ghl_mensagens
        JOIN ghl_mensagens_fts ON ghl_mensagens.rowid = ghl_mensagens_fts.rowid
        WHERE ghl_mensagens_fts MATCH ?
        ORDER BY ghl_mensagens.timestamp DESC
        LIMIT ?
      `);

      const data = stmt.all(query, limit);
      return {
        success: true,
        data: data.map(msg => ({
          ...msg,
          attachments: JSON.parse(msg.attachments || '[]')
        }))
      };
    } catch (error) {
      console.error('Erro ao buscar com FTS5:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Buscar conversa por telefone normalizado (só dígitos)
   * Tenta match parcial: se o phone no DB contém os dígitos buscados
   */
  getConversationByPhone(normalizedPhone) {
    try {
      if (!normalizedPhone) return { success: false, data: null };

      // Try exact match on from_number or to_number (stripped to digits)
      const stmt = db.prepare(`
        SELECT * FROM ghl_conversas
        WHERE REPLACE(REPLACE(REPLACE(REPLACE(from_number, '+', ''), '-', ''), '(', ''), ')', '') LIKE ?
           OR REPLACE(REPLACE(REPLACE(REPLACE(to_number, '+', ''), '-', ''), '(', ''), ')', '') LIKE ?
        ORDER BY last_message_date DESC
        LIMIT 1
      `);

      const data = stmt.get(`%${normalizedPhone}`, `%${normalizedPhone}`);
      return { success: !!data, data: data || null };
    } catch (error) {
      console.error('Erro ao buscar conversa por phone:', error.message);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Buscar conversa por contact_id
   */
  getConversationByContactId(contactId) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM ghl_conversas WHERE contact_id = ? LIMIT 1
      `);
      const data = stmt.get(contactId);
      return { success: !!data, data: data || null };
    } catch (error) {
      console.error('Erro ao buscar conversa por contact_id:', error.message);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Buscar mensagens por contact_id (JOIN conversas + mensagens)
   */
  getMessagesByContactId(contactId) {
    try {
      const conv = db.prepare(`
        SELECT conversation_id FROM ghl_conversas WHERE contact_id = ? LIMIT 1
      `).get(contactId);

      if (!conv) return { success: true, data: [] };

      const msgs = db.prepare(`
        SELECT * FROM ghl_mensagens
        WHERE conversation_id = ?
        ORDER BY timestamp ASC
      `).all(conv.conversation_id);

      return {
        success: true,
        data: msgs.map(msg => ({
          ...msg,
          attachments: JSON.parse(msg.attachments || '[]')
        }))
      };
    } catch (error) {
      console.error('Erro ao buscar mensagens por contact_id:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Obter estatísticas
   */
  getStats() {
    try {
      if (!db) {
        throw new Error('SQLite database não inicializado');
      }

      const conversationCount = db
        .prepare('SELECT COUNT(*) as count FROM ghl_conversas')
        .get().count;

      const messageCount = db
        .prepare('SELECT COUNT(*) as count FROM ghl_mensagens')
        .get().count;

      const unreadCount = db
        .prepare('SELECT COUNT(*) as count FROM ghl_conversas WHERE unread_count > 0')
        .get().count;

      return {
        success: true,
        conversations: conversationCount,
        messages: messageCount,
        unread: unreadCount,
        dbPath: DB_PATH
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error.message, error.stack);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new GHLDB();
