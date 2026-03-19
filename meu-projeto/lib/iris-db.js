// meu-projeto/lib/iris-db.js
// Modulo SQLite para estado do funil de prospeccao Iris
// Usa mesmo DB de ghl-db.js com prefixo iris_

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '../../../docs/banco-dados-geral/ghl-conversations.db');
let db = null;

function initDB() {
  if (db) return;

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Tabela: prospects ativos no funil
  db.exec(`
    CREATE TABLE IF NOT EXISTS iris_prospects (
      conversation_id TEXT PRIMARY KEY,
      contact_id TEXT,
      contact_name TEXT,
      current_stage TEXT DEFAULT 'abertura',
      current_variant TEXT,
      scripts_used TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active',
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_inbound_at DATETIME,
      last_outbound_at DATETIME,
      message_count INTEGER DEFAULT 0,
      notes TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_iris_prospects_status ON iris_prospects(status);
    CREATE INDEX IF NOT EXISTS idx_iris_prospects_stage ON iris_prospects(current_stage);
  `);

  // Tabela: aprovacoes pendentes no Telegram
  db.exec(`
    CREATE TABLE IF NOT EXISTS iris_pending_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      chunks TEXT NOT NULL,
      stage TEXT NOT NULL,
      script_id TEXT,
      telegram_message_id INTEGER,
      status TEXT DEFAULT 'pending',
      edited_chunks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY(conversation_id) REFERENCES iris_prospects(conversation_id)
    );

    CREATE INDEX IF NOT EXISTS idx_iris_approvals_status ON iris_pending_approvals(status);
    CREATE INDEX IF NOT EXISTS idx_iris_approvals_conversation ON iris_pending_approvals(conversation_id);
  `);

  // Tabela: log de mensagens enviadas
  db.exec(`
    CREATE TABLE IF NOT EXISTS iris_sent_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      approval_id INTEGER,
      chunk_text TEXT NOT NULL,
      chunk_index INTEGER DEFAULT 0,
      stage TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ghl_response TEXT,
      FOREIGN KEY(conversation_id) REFERENCES iris_prospects(conversation_id),
      FOREIGN KEY(approval_id) REFERENCES iris_pending_approvals(id)
    );

    CREATE INDEX IF NOT EXISTS idx_iris_sent_conversation ON iris_sent_messages(conversation_id);
  `);

  // Tabela: historico completo de mensagens por conversa
  db.exec(`
    CREATE TABLE IF NOT EXISTS iris_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      contact_id TEXT,
      direction TEXT NOT NULL,
      body TEXT,
      is_audio INTEGER DEFAULT 0,
      audio_url TEXT,
      message_type TEXT,
      ghl_message_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_iris_messages_conv ON iris_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_iris_messages_date ON iris_messages(created_at);
  `);

  // Tabela: perfil/contexto do lead (aprendizado)
  db.exec(`
    CREATE TABLE IF NOT EXISTS iris_lead_profiles (
      conversation_id TEXT PRIMARY KEY,
      contact_name TEXT,
      nicho TEXT,
      tempo_atuacao TEXT,
      situacao_clientes TEXT,
      dores TEXT DEFAULT '[]',
      objecoes TEXT DEFAULT '[]',
      nivel_interesse TEXT DEFAULT 'indefinido',
      tem_marketing TEXT,
      pediu_whatsapp INTEGER DEFAULT 0,
      whatsapp TEXT,
      resumo TEXT,
      raw_analysis TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(conversation_id) REFERENCES iris_prospects(conversation_id)
    );
  `);

  // Tabela: feedback de aprovacoes (aprendizado)
  db.exec(`
    CREATE TABLE IF NOT EXISTS iris_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT,
      type TEXT,
      original_text TEXT,
      edited_text TEXT,
      stage TEXT,
      context TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_iris_feedback_stage ON iris_feedback(stage);
    CREATE INDEX IF NOT EXISTS idx_iris_feedback_type ON iris_feedback(type);
  `);

  // Tabela: regras aprendidas automaticamente
  db.exec(`
    CREATE TABLE IF NOT EXISTS iris_learning (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT,
      rule TEXT,
      source TEXT,
      confidence REAL DEFAULT 0.5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_iris_learning_category ON iris_learning(category);
  `);

  // Migracao: adicionar contact_id se tabela ja existe sem essa coluna
  try {
    const cols = db.pragma('table_info(iris_prospects)');
    const hasContactId = cols.some((c) => c.name === 'contact_id');
    if (!hasContactId) {
      db.exec('ALTER TABLE iris_prospects ADD COLUMN contact_id TEXT');
      console.log('✅ Iris DB: migrado - coluna contact_id adicionada');
    }
  } catch (e) {
    // Tabela pode nao existir ainda (CREATE TABLE acima ja tem a coluna)
  }

  console.log('✅ Iris DB inicializado:', DB_PATH);
}

class IrisDB {
  constructor() {
    initDB();
  }

  // === PROSPECTS ===

  getProspect(conversationId) {
    try {
      const row = db.prepare('SELECT * FROM iris_prospects WHERE conversation_id = ?').get(conversationId);
      if (row) row.scripts_used = JSON.parse(row.scripts_used || '[]');
      return row || null;
    } catch (error) {
      console.error('Iris DB getProspect error:', error.message);
      return null;
    }
  }

  enrollProspect(conversationId, contactName, stage = 'abertura', contactId = null) {
    try {
      db.prepare(`
        INSERT INTO iris_prospects (conversation_id, contact_id, contact_name, current_stage, status)
        VALUES (?, ?, ?, ?, 'active')
        ON CONFLICT(conversation_id) DO UPDATE SET
          contact_id = COALESCE(excluded.contact_id, iris_prospects.contact_id),
          status = 'active',
          current_stage = excluded.current_stage,
          updated_at = CURRENT_TIMESTAMP
      `).run(conversationId, contactId, contactName || 'Desconhecido', stage);
      return { success: true };
    } catch (error) {
      console.error('Iris DB enrollProspect error:', error.message);
      return { success: false, error: error.message };
    }
  }

  updateProspectStage(conversationId, stage, variant, scriptId) {
    try {
      const prospect = this.getProspect(conversationId);
      if (!prospect) return { success: false, error: 'Prospect not found' };

      const scriptsUsed = prospect.scripts_used || [];
      if (scriptId && !scriptsUsed.includes(scriptId)) {
        scriptsUsed.push(scriptId);
      }

      db.prepare(`
        UPDATE iris_prospects
        SET current_stage = ?, current_variant = ?, scripts_used = ?, updated_at = CURRENT_TIMESTAMP
        WHERE conversation_id = ?
      `).run(stage, variant, JSON.stringify(scriptsUsed), conversationId);
      return { success: true };
    } catch (error) {
      console.error('Iris DB updateProspectStage error:', error.message);
      return { success: false, error: error.message };
    }
  }

  updateProspectTimestamp(conversationId, direction) {
    try {
      const col = direction === 'inbound' ? 'last_inbound_at' : 'last_outbound_at';
      db.prepare(`
        UPDATE iris_prospects
        SET ${col} = CURRENT_TIMESTAMP, message_count = message_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE conversation_id = ?
      `).run(conversationId);
      return { success: true };
    } catch (error) {
      console.error('Iris DB updateTimestamp error:', error.message);
      return { success: false, error: error.message };
    }
  }

  setProspectStatus(conversationId, status) {
    try {
      db.prepare(`
        UPDATE iris_prospects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE conversation_id = ?
      `).run(status, conversationId);
      return { success: true };
    } catch (error) {
      console.error('Iris DB setProspectStatus error:', error.message);
      return { success: false, error: error.message };
    }
  }

  getActiveProspects() {
    try {
      const rows = db.prepare(`
        SELECT * FROM iris_prospects WHERE status = 'active' ORDER BY updated_at DESC
      `).all();
      return rows.map((r) => ({ ...r, scripts_used: JSON.parse(r.scripts_used || '[]') }));
    } catch (error) {
      console.error('Iris DB getActiveProspects error:', error.message);
      return [];
    }
  }

  getAllProspects(limit = 50) {
    try {
      const rows = db.prepare(`
        SELECT * FROM iris_prospects ORDER BY updated_at DESC LIMIT ?
      `).all(limit);
      return rows.map((r) => ({ ...r, scripts_used: JSON.parse(r.scripts_used || '[]') }));
    } catch (error) {
      console.error('Iris DB getAllProspects error:', error.message);
      return [];
    }
  }

  // === PENDING APPROVALS ===

  createApproval(conversationId, chunks, stage, scriptId) {
    try {
      const result = db.prepare(`
        INSERT INTO iris_pending_approvals (conversation_id, chunks, stage, script_id, status)
        VALUES (?, ?, ?, ?, 'pending')
      `).run(conversationId, JSON.stringify(chunks), stage, scriptId);
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Iris DB createApproval error:', error.message);
      return { success: false, error: error.message };
    }
  }

  setApprovalTelegramId(approvalId, telegramMessageId) {
    try {
      db.prepare(`
        UPDATE iris_pending_approvals SET telegram_message_id = ? WHERE id = ?
      `).run(telegramMessageId, approvalId);
      return { success: true };
    } catch (error) {
      console.error('Iris DB setApprovalTelegramId error:', error.message);
      return { success: false, error: error.message };
    }
  }

  resolveApproval(approvalId, status, editedChunks = null) {
    try {
      db.prepare(`
        UPDATE iris_pending_approvals
        SET status = ?, edited_chunks = ?, resolved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, editedChunks ? JSON.stringify(editedChunks) : null, approvalId);
      return { success: true };
    } catch (error) {
      console.error('Iris DB resolveApproval error:', error.message);
      return { success: false, error: error.message };
    }
  }

  getPendingApproval(approvalId) {
    try {
      const row = db.prepare('SELECT * FROM iris_pending_approvals WHERE id = ?').get(approvalId);
      if (row) {
        row.chunks = JSON.parse(row.chunks || '[]');
        if (row.edited_chunks) row.edited_chunks = JSON.parse(row.edited_chunks);
      }
      return row || null;
    } catch (error) {
      console.error('Iris DB getPendingApproval error:', error.message);
      return null;
    }
  }

  getPendingApprovalByTelegramId(telegramMessageId) {
    try {
      const row = db.prepare(
        'SELECT * FROM iris_pending_approvals WHERE telegram_message_id = ? AND status = ?'
      ).get(telegramMessageId, 'pending');
      if (row) {
        row.chunks = JSON.parse(row.chunks || '[]');
        if (row.edited_chunks) row.edited_chunks = JSON.parse(row.edited_chunks);
      }
      return row || null;
    } catch (error) {
      console.error('Iris DB getPendingApprovalByTelegramId error:', error.message);
      return null;
    }
  }

  getPendingApprovals() {
    try {
      const rows = db.prepare(`
        SELECT * FROM iris_pending_approvals WHERE status = 'pending' ORDER BY created_at DESC
      `).all();
      return rows.map((r) => ({
        ...r,
        chunks: JSON.parse(r.chunks || '[]'),
        edited_chunks: r.edited_chunks ? JSON.parse(r.edited_chunks) : null,
      }));
    } catch (error) {
      console.error('Iris DB getPendingApprovals error:', error.message);
      return [];
    }
  }

  // === SENT MESSAGES LOG ===

  logSentMessage(conversationId, approvalId, chunkText, chunkIndex, stage, ghlResponse) {
    try {
      db.prepare(`
        INSERT INTO iris_sent_messages (conversation_id, approval_id, chunk_text, chunk_index, stage, ghl_response)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(conversationId, approvalId, chunkText, chunkIndex, stage, JSON.stringify(ghlResponse || {}));
      return { success: true };
    } catch (error) {
      console.error('Iris DB logSentMessage error:', error.message);
      return { success: false, error: error.message };
    }
  }

  getSentMessages(conversationId, limit = 20) {
    try {
      return db.prepare(`
        SELECT * FROM iris_sent_messages WHERE conversation_id = ? ORDER BY sent_at DESC LIMIT ?
      `).all(conversationId, limit);
    } catch (error) {
      console.error('Iris DB getSentMessages error:', error.message);
      return [];
    }
  }

  // === MESSAGES MEMORY (historico completo) ===

  saveMessage(conversationId, direction, body, options = {}) {
    try {
      db.prepare(`
        INSERT INTO iris_messages (conversation_id, contact_id, direction, body, is_audio, audio_url, message_type, ghl_message_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        conversationId,
        options.contactId || null,
        direction,
        body,
        options.isAudio ? 1 : 0,
        options.audioUrl || null,
        options.messageType || null,
        options.ghlMessageId || null
      );
      return { success: true };
    } catch (error) {
      console.error('Iris DB saveMessage error:', error.message);
      return { success: false, error: error.message };
    }
  }

  getMessageHistory(conversationId, limit = 30) {
    try {
      return db.prepare(`
        SELECT * FROM iris_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?
      `).all(conversationId, limit);
    } catch (error) {
      console.error('Iris DB getMessageHistory error:', error.message);
      return [];
    }
  }

  getRecentMessages(conversationId, limit = 10) {
    try {
      const rows = db.prepare(`
        SELECT * FROM iris_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?
      `).all(conversationId, limit);
      return rows.reverse();
    } catch (error) {
      console.error('Iris DB getRecentMessages error:', error.message);
      return [];
    }
  }

  isMessageSaved(ghlMessageId) {
    try {
      const row = db.prepare('SELECT id FROM iris_messages WHERE ghl_message_id = ?').get(ghlMessageId);
      return !!row;
    } catch (error) {
      return false;
    }
  }

  // === LEAD PROFILES (aprendizado) ===

  saveLeadProfile(conversationId, profile) {
    try {
      db.prepare(`
        INSERT INTO iris_lead_profiles (conversation_id, contact_name, nicho, tempo_atuacao, situacao_clientes, dores, objecoes, nivel_interesse, tem_marketing, pediu_whatsapp, whatsapp, resumo, raw_analysis)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(conversation_id) DO UPDATE SET
          nicho = COALESCE(excluded.nicho, iris_lead_profiles.nicho),
          tempo_atuacao = COALESCE(excluded.tempo_atuacao, iris_lead_profiles.tempo_atuacao),
          situacao_clientes = COALESCE(excluded.situacao_clientes, iris_lead_profiles.situacao_clientes),
          dores = excluded.dores,
          objecoes = excluded.objecoes,
          nivel_interesse = excluded.nivel_interesse,
          tem_marketing = COALESCE(excluded.tem_marketing, iris_lead_profiles.tem_marketing),
          pediu_whatsapp = excluded.pediu_whatsapp,
          whatsapp = COALESCE(excluded.whatsapp, iris_lead_profiles.whatsapp),
          resumo = excluded.resumo,
          raw_analysis = excluded.raw_analysis,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        conversationId,
        profile.contactName || null,
        profile.nicho || null,
        profile.tempo_atuacao || null,
        profile.situacao_clientes || null,
        JSON.stringify(profile.dores || []),
        JSON.stringify(profile.objecoes || []),
        profile.nivel_interesse || 'indefinido',
        profile.tem_marketing || null,
        profile.pediu_whatsapp ? 1 : 0,
        profile.whatsapp || null,
        profile.resumo || null,
        JSON.stringify(profile)
      );
      return { success: true };
    } catch (error) {
      console.error('Iris DB saveLeadProfile error:', error.message);
      return { success: false, error: error.message };
    }
  }

  getLeadProfile(conversationId) {
    try {
      const row = db.prepare('SELECT * FROM iris_lead_profiles WHERE conversation_id = ?').get(conversationId);
      if (row) {
        row.dores = JSON.parse(row.dores || '[]');
        row.objecoes = JSON.parse(row.objecoes || '[]');
      }
      return row || null;
    } catch (error) {
      console.error('Iris DB getLeadProfile error:', error.message);
      return null;
    }
  }

  // === FEEDBACK (aprendizado) ===

  saveFeedback(conversationId, type, originalText, editedText, stage, context = {}) {
    try {
      db.prepare(`
        INSERT INTO iris_feedback (conversation_id, type, original_text, edited_text, stage, context)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(conversationId, type, originalText, editedText, stage, JSON.stringify(context));
      return { success: true };
    } catch (error) {
      console.error('Iris DB saveFeedback error:', error.message);
      return { success: false, error: error.message };
    }
  }

  getRecentFeedback(stage, limit = 5) {
    try {
      const rows = db.prepare(`
        SELECT * FROM iris_feedback WHERE stage = ? ORDER BY created_at DESC LIMIT ?
      `).all(stage, limit);
      return rows.map((r) => ({ ...r, context: JSON.parse(r.context || '{}') }));
    } catch (error) {
      console.error('Iris DB getRecentFeedback error:', error.message);
      return [];
    }
  }

  getFeedbackCount() {
    try {
      return db.prepare('SELECT COUNT(*) as c FROM iris_feedback').get().c;
    } catch (error) {
      return 0;
    }
  }

  getAllFeedback(limit = 50) {
    try {
      const rows = db.prepare(`
        SELECT * FROM iris_feedback ORDER BY created_at DESC LIMIT ?
      `).all(limit);
      return rows.map((r) => ({ ...r, context: JSON.parse(r.context || '{}') }));
    } catch (error) {
      return [];
    }
  }

  // === LEARNING (regras aprendidas) ===

  saveLearningRule(category, rule, source, confidence = 0.5) {
    try {
      db.prepare(`
        INSERT INTO iris_learning (category, rule, source, confidence)
        VALUES (?, ?, ?, ?)
      `).run(category, rule, source, confidence);
      return { success: true };
    } catch (error) {
      console.error('Iris DB saveLearningRule error:', error.message);
      return { success: false, error: error.message };
    }
  }

  getLearningRules(category = null, minConfidence = 0.3) {
    try {
      if (category) {
        return db.prepare(`
          SELECT * FROM iris_learning WHERE category = ? AND confidence >= ? ORDER BY confidence DESC
        `).all(category, minConfidence);
      }
      return db.prepare(`
        SELECT * FROM iris_learning WHERE confidence >= ? ORDER BY confidence DESC
      `).all(minConfidence);
    } catch (error) {
      console.error('Iris DB getLearningRules error:', error.message);
      return [];
    }
  }

  updateLearningConfidence(id, confidence) {
    try {
      db.prepare(`
        UPDATE iris_learning SET confidence = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(confidence, id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // === STATS ===

  getStats() {
    try {
      const active = db.prepare("SELECT COUNT(*) as c FROM iris_prospects WHERE status = 'active'").get().c;
      const total = db.prepare('SELECT COUNT(*) as c FROM iris_prospects').get().c;
      const pending = db.prepare("SELECT COUNT(*) as c FROM iris_pending_approvals WHERE status = 'pending'").get().c;
      const sent = db.prepare('SELECT COUNT(*) as c FROM iris_sent_messages').get().c;
      const feedbackCount = db.prepare('SELECT COUNT(*) as c FROM iris_feedback').get().c;
      const learningCount = db.prepare('SELECT COUNT(*) as c FROM iris_learning').get().c;
      return { active, total, pending, sent, feedbackCount, learningCount };
    } catch (error) {
      console.error('Iris DB getStats error:', error.message);
      return { active: 0, total: 0, pending: 0, sent: 0 };
    }
  }
}

module.exports = new IrisDB();
