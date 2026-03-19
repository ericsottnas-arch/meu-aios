// meu-projeto/lib/prospecting-db.js
// SQLite para métricas de prospecção ativa, tracking, goals
'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '../../../docs/banco-dados-geral/prospecting.db');
let db = null;

function initDB() {
  if (db) return;

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS prospects (
      id TEXT PRIMARY KEY,
      ghl_contact_id TEXT,
      ghl_opportunity_id TEXT,
      name TEXT NOT NULL,
      instagram TEXT,
      followers INTEGER DEFAULT 0,
      procedure_type TEXT,
      stage TEXT DEFAULT 'qualified',
      tags TEXT DEFAULT '[]',
      status TEXT DEFAULT 'open',
      monetary_value REAL DEFAULT 0,
      source TEXT DEFAULT 'manual',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_prospects_stage ON prospects(stage);
    CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
    CREATE INDEX IF NOT EXISTS idx_prospects_ghl ON prospects(ghl_opportunity_id);

    CREATE TABLE IF NOT EXISTS stage_transitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prospect_id TEXT NOT NULL,
      from_stage TEXT,
      to_stage TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prospect_id) REFERENCES prospects(id)
    );
    CREATE INDEX IF NOT EXISTS idx_transitions_prospect ON stage_transitions(prospect_id);

    CREATE TABLE IF NOT EXISTS message_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prospect_id TEXT NOT NULL,
      script_id TEXT NOT NULL,
      stage TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prospect_id) REFERENCES prospects(id)
    );
    CREATE INDEX IF NOT EXISTS idx_usage_prospect ON message_usage(prospect_id);

    CREATE TABLE IF NOT EXISTS weekly_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL,
      goal_prospects INTEGER DEFAULT 15,
      goal_dms INTEGER DEFAULT 10,
      goal_calls INTEGER DEFAULT 5,
      goal_proposals INTEGER DEFAULT 3,
      actual_prospects INTEGER DEFAULT 0,
      actual_dms INTEGER DEFAULT 0,
      actual_calls INTEGER DEFAULT 0,
      actual_proposals INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(week_start)
    );

    CREATE TABLE IF NOT EXISTS prospect_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prospect_id TEXT NOT NULL,
      note TEXT NOT NULL,
      author TEXT DEFAULT 'Eric',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prospect_id) REFERENCES prospects(id)
    );
    CREATE INDEX IF NOT EXISTS idx_notes_prospect ON prospect_notes(prospect_id);
  `);

  console.log(`[prospecting-db] Inicializado em ${DB_PATH}`);
}

// ============================================================
// Prospects
// ============================================================

function upsertProspect(prospect) {
  if (!db) initDB();
  return db.prepare(`
    INSERT INTO prospects (id, ghl_contact_id, ghl_opportunity_id, name, instagram, followers, procedure_type, stage, tags, status, monetary_value, source, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      ghl_contact_id=excluded.ghl_contact_id,
      ghl_opportunity_id=excluded.ghl_opportunity_id,
      name=excluded.name,
      instagram=excluded.instagram,
      followers=excluded.followers,
      procedure_type=excluded.procedure_type,
      stage=excluded.stage,
      tags=excluded.tags,
      status=excluded.status,
      monetary_value=excluded.monetary_value,
      updated_at=CURRENT_TIMESTAMP
  `).run(
    prospect.id,
    prospect.ghl_contact_id || null,
    prospect.ghl_opportunity_id || null,
    prospect.name,
    prospect.instagram || null,
    prospect.followers || 0,
    prospect.procedure_type || null,
    prospect.stage || 'qualified',
    JSON.stringify(prospect.tags || []),
    prospect.status || 'open',
    prospect.monetary_value || 0,
    prospect.source || 'manual',
  );
}

function getProspects(filters = {}) {
  if (!db) initDB();
  let sql = 'SELECT * FROM prospects WHERE 1=1';
  const params = [];

  if (filters.stage) { sql += ' AND stage = ?'; params.push(filters.stage); }
  if (filters.status) { sql += ' AND status = ?'; params.push(filters.status); }
  if (filters.procedure) { sql += ' AND procedure_type = ?'; params.push(filters.procedure); }
  if (filters.search) { sql += ' AND (name LIKE ? OR instagram LIKE ?)'; params.push(`%${filters.search}%`, `%${filters.search}%`); }

  sql += ' ORDER BY updated_at DESC';
  if (filters.limit) { sql += ' LIMIT ?'; params.push(filters.limit); }

  return db.prepare(sql).all(...params);
}

function getProspectById(id) {
  if (!db) initDB();
  return db.prepare('SELECT * FROM prospects WHERE id = ?').get(id) || null;
}

function getProspectCountByStage() {
  if (!db) initDB();
  return db.prepare(`
    SELECT stage, COUNT(*) as count
    FROM prospects
    WHERE status = 'open'
    GROUP BY stage
  `).all();
}

function advanceProspect(id, toStage) {
  if (!db) initDB();
  const prospect = getProspectById(id);
  if (!prospect) return null;

  const fromStage = prospect.stage;

  db.prepare('UPDATE prospects SET stage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(toStage, id);

  db.prepare('INSERT INTO stage_transitions (prospect_id, from_stage, to_stage) VALUES (?, ?, ?)')
    .run(id, fromStage, toStage);

  return { id, fromStage, toStage };
}

// ============================================================
// Stage Transitions
// ============================================================

function getTransitions(prospectId) {
  if (!db) initDB();
  return db.prepare('SELECT * FROM stage_transitions WHERE prospect_id = ? ORDER BY created_at DESC').all(prospectId);
}

// ============================================================
// Message Usage
// ============================================================

function recordMessageUsage(prospectId, scriptId, stage) {
  if (!db) initDB();
  return db.prepare('INSERT INTO message_usage (prospect_id, script_id, stage) VALUES (?, ?, ?)')
    .run(prospectId, scriptId, stage || null);
}

function getMessageUsage(prospectId) {
  if (!db) initDB();
  return db.prepare('SELECT * FROM message_usage WHERE prospect_id = ? ORDER BY created_at DESC').all(prospectId);
}

// ============================================================
// Weekly Goals
// ============================================================

function getWeekStart(date) {
  const d = new Date(date || Date.now());
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function upsertWeeklyGoal(weekStart, goals) {
  if (!db) initDB();
  return db.prepare(`
    INSERT INTO weekly_goals (week_start, goal_prospects, goal_dms, goal_calls, goal_proposals, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(week_start) DO UPDATE SET
      goal_prospects=excluded.goal_prospects,
      goal_dms=excluded.goal_dms,
      goal_calls=excluded.goal_calls,
      goal_proposals=excluded.goal_proposals,
      updated_at=CURRENT_TIMESTAMP
  `).run(
    weekStart,
    goals.prospects || 15,
    goals.dms || 10,
    goals.calls || 5,
    goals.proposals || 3,
  );
}

function getCurrentWeekGoals() {
  if (!db) initDB();
  const weekStart = getWeekStart();
  let goal = db.prepare('SELECT * FROM weekly_goals WHERE week_start = ?').get(weekStart);
  if (!goal) {
    upsertWeeklyGoal(weekStart, {});
    goal = db.prepare('SELECT * FROM weekly_goals WHERE week_start = ?').get(weekStart);
  }
  return goal;
}

function updateWeeklyActuals(weekStart) {
  if (!db) initDB();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const endStr = weekEnd.toISOString().split('T')[0];

  const counts = db.prepare(`
    SELECT
      COUNT(DISTINCT CASE WHEN stage IN ('qualified','warming') THEN id END) as prospects,
      COUNT(DISTINCT CASE WHEN stage IN ('dm_sent','in_conversation','pitch_done','call_scheduled','proposal_sent','won') THEN id END) as dms,
      COUNT(DISTINCT CASE WHEN stage IN ('call_scheduled','proposal_sent','won') THEN id END) as calls,
      COUNT(DISTINCT CASE WHEN stage IN ('proposal_sent','won') THEN id END) as proposals
    FROM prospects
    WHERE created_at >= ? AND created_at < ?
  `).get(weekStart, endStr);

  db.prepare(`
    UPDATE weekly_goals SET
      actual_prospects = ?,
      actual_dms = ?,
      actual_calls = ?,
      actual_proposals = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE week_start = ?
  `).run(counts.prospects, counts.dms, counts.calls, counts.proposals, weekStart);

  return counts;
}

function getWeeklyGoalsHistory(weeks = 8) {
  if (!db) initDB();
  return db.prepare('SELECT * FROM weekly_goals ORDER BY week_start DESC LIMIT ?').all(weeks);
}

// ============================================================
// Notes
// ============================================================

function addNote(prospectId, note, author) {
  if (!db) initDB();
  return db.prepare('INSERT INTO prospect_notes (prospect_id, note, author) VALUES (?, ?, ?)')
    .run(prospectId, note, author || 'Eric');
}

function getNotes(prospectId) {
  if (!db) initDB();
  return db.prepare('SELECT * FROM prospect_notes WHERE prospect_id = ? ORDER BY created_at DESC').all(prospectId);
}

// ============================================================
// Metrics
// ============================================================

function getMetrics() {
  if (!db) initDB();

  const stageCounts = {};
  for (const row of getProspectCountByStage()) {
    stageCounts[row.stage] = row.count;
  }

  const total = Object.values(stageCounts).reduce((a, b) => a + b, 0);
  const dmSent = stageCounts.dm_sent || 0;
  const inConv = stageCounts.in_conversation || 0;
  const pitchDone = stageCounts.pitch_done || 0;
  const callSched = stageCounts.call_scheduled || 0;
  const won = stageCounts.won || 0;

  const responseRate = dmSent + inConv + pitchDone + callSched + won > 0
    ? ((inConv + pitchDone + callSched + won) / (dmSent + inConv + pitchDone + callSched + won)) * 100 : 0;
  const schedulingRate = pitchDone + callSched > 0
    ? ((callSched) / (pitchDone + callSched)) * 100 : 0;
  const conversionRate = callSched + won > 0
    ? (won / (callSched + won)) * 100 : 0;

  const avgDays = db.prepare(`
    SELECT AVG(julianday(t2.created_at) - julianday(t1.created_at)) as avg_days
    FROM stage_transitions t1
    JOIN stage_transitions t2 ON t1.prospect_id = t2.prospect_id
    WHERE t1.to_stage = 'qualified' AND t2.to_stage = 'won'
  `).get();

  return {
    total,
    stageCounts,
    responseRate: Math.round(responseRate * 10) / 10,
    schedulingRate: Math.round(schedulingRate * 10) / 10,
    conversionRate: Math.round(conversionRate * 10) / 10,
    avgCycleDays: avgDays?.avg_days ? Math.round(avgDays.avg_days) : null,
    weeklyGoals: getCurrentWeekGoals(),
  };
}

// ============================================================
// Sync helper
// ============================================================

function getLastSyncTime() {
  if (!db) initDB();
  const row = db.prepare("SELECT MAX(updated_at) as last_sync FROM prospects WHERE source = 'ghl'").get();
  return row?.last_sync || null;
}

module.exports = {
  initDB,
  upsertProspect,
  getProspects,
  getProspectById,
  getProspectCountByStage,
  advanceProspect,
  getTransitions,
  recordMessageUsage,
  getMessageUsage,
  upsertWeeklyGoal,
  getCurrentWeekGoals,
  updateWeeklyActuals,
  getWeeklyGoalsHistory,
  addNote,
  getNotes,
  getMetrics,
  getLastSyncTime,
  getWeekStart,
};
