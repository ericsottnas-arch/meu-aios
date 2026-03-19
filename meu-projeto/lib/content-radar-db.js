// meu-projeto/lib/content-radar-db.js
// SQLite para Content Radar — items encontrados, perfis monitorados
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '../content-radar.db');
let db = null;

function initDB() {
  if (db) return;

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS radar_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      source_url TEXT,
      source_username TEXT,
      title TEXT,
      content TEXT,
      relevance_score REAL,
      engagement_rate REAL,
      suggested_angle TEXT,
      suggested_format TEXT,
      status TEXT DEFAULT 'new',
      notified_message_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      used_at DATETIME
    );
    CREATE INDEX IF NOT EXISTS idx_ri_source ON radar_items(source);
    CREATE INDEX IF NOT EXISTS idx_ri_status ON radar_items(status);
    CREATE INDEX IF NOT EXISTS idx_ri_created ON radar_items(created_at);

    CREATE TABLE IF NOT EXISTS radar_profiles (
      username TEXT PRIMARY KEY,
      category TEXT,
      last_checked DATETIME,
      last_post_id TEXT,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS radar_daily_stats (
      date TEXT PRIMARY KEY,
      items_found INTEGER DEFAULT 0,
      items_notified INTEGER DEFAULT 0,
      items_saved INTEGER DEFAULT 0,
      items_used INTEGER DEFAULT 0
    );
  `);
}

// ============================================================
// Radar Items
// ============================================================

function insertItem({ source, source_url, source_username, title, content, relevance_score, engagement_rate, suggested_angle, suggested_format }) {
  initDB();
  const stmt = db.prepare(`
    INSERT INTO radar_items (source, source_url, source_username, title, content, relevance_score, engagement_rate, suggested_angle, suggested_format)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(source, source_url, source_username, title, content, relevance_score, engagement_rate, suggested_angle, suggested_format);
  return result.lastInsertRowid;
}

function getItem(id) {
  initDB();
  return db.prepare('SELECT * FROM radar_items WHERE id = ?').get(id);
}

function updateItemStatus(id, status, extra = {}) {
  initDB();
  const sets = ['status = ?'];
  const vals = [status];
  if (extra.notified_message_id) {
    sets.push('notified_message_id = ?');
    vals.push(extra.notified_message_id);
  }
  if (status === 'used') {
    sets.push('used_at = CURRENT_TIMESTAMP');
  }
  vals.push(id);
  db.prepare(`UPDATE radar_items SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
}

function getItemsByStatus(status, limit = 50) {
  initDB();
  return db.prepare('SELECT * FROM radar_items WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, limit);
}

function getItemsToday() {
  initDB();
  return db.prepare("SELECT * FROM radar_items WHERE date(created_at) = date('now') ORDER BY relevance_score DESC").all();
}

function getNotificationCount() {
  initDB();
  const row = db.prepare("SELECT COUNT(*) as cnt FROM radar_items WHERE status = 'notified' AND date(created_at) = date('now')").get();
  return row?.cnt || 0;
}

function itemExistsByUrl(url) {
  initDB();
  const row = db.prepare('SELECT id FROM radar_items WHERE source_url = ?').get(url);
  return !!row;
}

function getRecentItems(limit = 100) {
  initDB();
  return db.prepare('SELECT * FROM radar_items ORDER BY created_at DESC LIMIT ?').all(limit);
}

function getItemStats() {
  initDB();
  const total = db.prepare('SELECT COUNT(*) as cnt FROM radar_items').get().cnt;
  const today = db.prepare("SELECT COUNT(*) as cnt FROM radar_items WHERE date(created_at) = date('now')").get().cnt;
  const bySource = db.prepare('SELECT source, COUNT(*) as cnt FROM radar_items GROUP BY source').all();
  const byStatus = db.prepare('SELECT status, COUNT(*) as cnt FROM radar_items GROUP BY status').all();
  return { total, today, bySource, byStatus };
}

// ============================================================
// Radar Profiles
// ============================================================

function upsertProfile(username, category) {
  initDB();
  db.prepare(`
    INSERT INTO radar_profiles (username, category) VALUES (?, ?)
    ON CONFLICT(username) DO UPDATE SET category = excluded.category
  `).run(username, category);
}

function updateProfileChecked(username, lastPostId) {
  initDB();
  db.prepare(`
    UPDATE radar_profiles SET last_checked = CURRENT_TIMESTAMP, last_post_id = ? WHERE username = ?
  `).run(lastPostId, username);
}

function getProfile(username) {
  initDB();
  return db.prepare('SELECT * FROM radar_profiles WHERE username = ?').get(username);
}

function getActiveProfiles() {
  initDB();
  return db.prepare('SELECT * FROM radar_profiles WHERE active = 1').all();
}

// ============================================================
// Daily Stats
// ============================================================

function incrementDailyStat(field) {
  initDB();
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`
    INSERT INTO radar_daily_stats (date, ${field}) VALUES (?, 1)
    ON CONFLICT(date) DO UPDATE SET ${field} = ${field} + 1
  `).run(today);
}

function getDailyStats(days = 7) {
  initDB();
  return db.prepare('SELECT * FROM radar_daily_stats ORDER BY date DESC LIMIT ?').all(days);
}

module.exports = {
  initDB,
  insertItem,
  getItem,
  updateItemStatus,
  getItemsByStatus,
  getItemsToday,
  getNotificationCount,
  itemExistsByUrl,
  getRecentItems,
  getItemStats,
  upsertProfile,
  updateProfileChecked,
  getProfile,
  getActiveProfiles,
  incrementDailyStat,
  getDailyStats,
};
