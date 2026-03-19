// meu-projeto/lib/ghl-analytics-db.js
// SQLite para persistir dados de CRM/Pipeline do GoHighLevel
// Padrão: WAL mode, better-sqlite3, upsert — segue ads-db.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '../../../docs/banco-dados-geral/ghl-crm.db');
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
    -- Pipeline stages (reference data)
    CREATE TABLE IF NOT EXISTS pipeline_stages (
      id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      pipeline_id TEXT NOT NULL,
      pipeline_name TEXT,
      name TEXT,
      position INTEGER DEFAULT 0,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id, client_id)
    );
    CREATE INDEX IF NOT EXISTS idx_ps_client ON pipeline_stages(client_id);

    -- Opportunities (core CRM data)
    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      name TEXT,
      contact_id TEXT,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      pipeline_id TEXT,
      pipeline_stage_id TEXT,
      stage_name TEXT,
      status TEXT,
      monetary_value REAL DEFAULT 0,
      source TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      utm_medium TEXT,
      utm_source TEXT,
      tags TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_opp_client ON opportunities(client_id);
    CREATE INDEX IF NOT EXISTS idx_opp_client_status ON opportunities(client_id, status);
    CREATE INDEX IF NOT EXISTS idx_opp_client_created ON opportunities(client_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_opp_source ON opportunities(client_id, source);

    -- Contacts with UTM attribution
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      name TEXT,
      email TEXT,
      phone TEXT,
      source TEXT,
      date_added TEXT,
      tags TEXT,
      utm_campaign TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_content TEXT,
      utm_term TEXT,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_con_client ON contacts(client_id);
    CREATE INDEX IF NOT EXISTS idx_con_client_date ON contacts(client_id, date_added);
    CREATE INDEX IF NOT EXISTS idx_con_utm ON contacts(client_id, utm_campaign);

    -- Daily pipeline snapshot (for trend charts)
    CREATE TABLE IF NOT EXISTS daily_snapshot (
      client_id TEXT NOT NULL,
      date TEXT NOT NULL,
      total_open INTEGER DEFAULT 0,
      total_won INTEGER DEFAULT 0,
      total_lost INTEGER DEFAULT 0,
      won_value REAL DEFAULT 0,
      new_opportunities INTEGER DEFAULT 0,
      new_contacts INTEGER DEFAULT 0,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (client_id, date)
    );

    -- Lead scores (6-dimension scoring)
    CREATE TABLE IF NOT EXISTS lead_scores (
      opportunity_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      contact_id TEXT,
      contact_name TEXT,
      score INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'cold',
      d1_engagement INTEGER DEFAULT 0,
      d2_velocity INTEGER DEFAULT 0,
      d3_pipeline INTEGER DEFAULT 0,
      d4_recency INTEGER DEFAULT 0,
      d5_targeting INTEGER DEFAULT 0,
      d6_attribution INTEGER DEFAULT 0,
      stage_name TEXT,
      status TEXT,
      utm_campaign TEXT,
      scored_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (opportunity_id, client_id)
    );
    CREATE INDEX IF NOT EXISTS idx_ls_client_score ON lead_scores(client_id, score DESC);
    CREATE INDEX IF NOT EXISTS idx_ls_client_tier ON lead_scores(client_id, tier);

    -- Sync log
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      status TEXT NOT NULL,
      opportunities_synced INTEGER DEFAULT 0,
      contacts_synced INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sync_client ON sync_log(client_id, created_at DESC);
  `);

  console.log(`✅ GHL Analytics DB inicializado em ${DB_PATH}`);

  // Migrate: add UTM columns if table existed before this version
  _migrateUtmColumns();
}

function _migrateUtmColumns() {
  if (!db) return;
  const cols = db.prepare('PRAGMA table_info(opportunities)').all().map(c => c.name);
  const toAdd = [
    { name: 'contact_id', type: 'TEXT' },
    { name: 'utm_campaign', type: 'TEXT' },
    { name: 'utm_content', type: 'TEXT' },
    { name: 'utm_medium', type: 'TEXT' },
    { name: 'utm_source', type: 'TEXT' },
  ];
  for (const col of toAdd) {
    if (!cols.includes(col.name)) {
      db.exec(`ALTER TABLE opportunities ADD COLUMN ${col.name} ${col.type}`);
      console.log(`  GHL DB migrated: +opportunities.${col.name}`);
    }
  }
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_opp_utm_campaign ON opportunities(client_id, utm_campaign)');
  } catch { /* ignore if column still missing somehow */ }
}

// ============================================================
// Write functions
// ============================================================

function upsertPipelineStages(clientId, pipelineId, pipelineName, stages) {
  if (!db) initDB();
  const stmt = db.prepare(`
    INSERT INTO pipeline_stages (id, client_id, pipeline_id, pipeline_name, name, position, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id, client_id) DO UPDATE SET
      pipeline_name=excluded.pipeline_name, name=excluded.name,
      position=excluded.position, synced_at=CURRENT_TIMESTAMP
  `);
  const tx = db.transaction((stgs) => {
    for (const s of stgs) {
      stmt.run(s.id, clientId, pipelineId, pipelineName, s.name, s.position || 0);
    }
  });
  tx(stages);
}

function upsertOpportunity(clientId, opp) {
  if (!db) initDB();
  db.prepare(`
    INSERT INTO opportunities (id, client_id, name, contact_id, contact_name, contact_email, contact_phone,
      pipeline_id, pipeline_stage_id, stage_name, status, monetary_value, source,
      utm_campaign, utm_content, utm_medium, utm_source,
      tags, created_at, updated_at, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, contact_id=excluded.contact_id,
      contact_name=excluded.contact_name, contact_email=excluded.contact_email,
      contact_phone=excluded.contact_phone, pipeline_stage_id=excluded.pipeline_stage_id,
      stage_name=excluded.stage_name, status=excluded.status, monetary_value=excluded.monetary_value,
      source=excluded.source, utm_campaign=excluded.utm_campaign, utm_content=excluded.utm_content,
      utm_medium=excluded.utm_medium, utm_source=excluded.utm_source,
      tags=excluded.tags, updated_at=excluded.updated_at,
      synced_at=CURRENT_TIMESTAMP
  `).run(
    opp.id, clientId, opp.name || null, opp.contactId || null, opp.contactName || null,
    opp.contactEmail || null, opp.contactPhone || null,
    opp.pipelineId || null, opp.pipelineStageId || null, opp.stageName || null,
    opp.status || null, opp.monetaryValue || 0, opp.source || null,
    opp.utmCampaign || null, opp.utmContent || null, opp.utmMedium || null, opp.utmSource || null,
    Array.isArray(opp.tags) ? JSON.stringify(opp.tags) : (opp.tags || null),
    opp.createdAt || null, opp.updatedAt || null
  );
}

function upsertOpportunities(clientId, opps) {
  if (!db) initDB();
  const tx = db.transaction((list) => {
    for (const opp of list) upsertOpportunity(clientId, opp);
  });
  tx(opps);
}

function upsertContact(clientId, contact) {
  if (!db) initDB();
  // Prioridade UTM: attributionSource (mais completo) → attributions[0] (legado)
  const attrSrc = contact.attributionSource || {};
  const legacyAttr = (contact.attributions && contact.attributions[0]) || {};
  const utm = {
    utmCampaign: attrSrc.utmCampaign || legacyAttr.utmCampaign || legacyAttr.utm_campaign,
    utmSource: attrSrc.utmSource || legacyAttr.utmSource || legacyAttr.utm_source,
    utmMedium: attrSrc.utmMedium || legacyAttr.utmMedium || legacyAttr.utm_medium,
    utmContent: attrSrc.utmContent || legacyAttr.utmContent || legacyAttr.utm_content,
    utmTerm: attrSrc.utmTerm || legacyAttr.utmTerm || legacyAttr.utm_term,
  };
  db.prepare(`
    INSERT INTO contacts (id, client_id, first_name, last_name, name, email, phone,
      source, date_added, tags, utm_campaign, utm_source, utm_medium, utm_content, utm_term, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      first_name=excluded.first_name, last_name=excluded.last_name, name=excluded.name,
      email=excluded.email, phone=excluded.phone, source=excluded.source,
      tags=excluded.tags, utm_campaign=excluded.utm_campaign, utm_source=excluded.utm_source,
      utm_medium=excluded.utm_medium, utm_content=excluded.utm_content, utm_term=excluded.utm_term,
      synced_at=CURRENT_TIMESTAMP
  `).run(
    contact.id, clientId, contact.firstName || null, contact.lastName || null,
    contact.name || ((contact.firstName || '') + ' ' + (contact.lastName || '')).trim() || null,
    contact.email || null, contact.phone || null,
    contact.source || null, contact.dateAdded || null,
    contact.tags ? JSON.stringify(contact.tags) : null,
    utm.utmCampaign || null,
    utm.utmSource || null,
    utm.utmMedium || null,
    utm.utmContent || null,
    utm.utmTerm || null
  );
}

function upsertContacts(clientId, contacts) {
  if (!db) initDB();
  const tx = db.transaction((list) => {
    for (const c of list) upsertContact(clientId, c);
  });
  tx(contacts);
}

function upsertDailySnapshot(clientId, date, stats) {
  if (!db) initDB();
  db.prepare(`
    INSERT INTO daily_snapshot (client_id, date, total_open, total_won, total_lost,
      won_value, new_opportunities, new_contacts, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(client_id, date) DO UPDATE SET
      total_open=excluded.total_open, total_won=excluded.total_won, total_lost=excluded.total_lost,
      won_value=excluded.won_value, new_opportunities=excluded.new_opportunities,
      new_contacts=excluded.new_contacts, synced_at=CURRENT_TIMESTAMP
  `).run(clientId, date, stats.totalOpen || 0, stats.totalWon || 0, stats.totalLost || 0,
    stats.wonValue || 0, stats.newOpportunities || 0, stats.newContacts || 0);
}

function logSync(clientId, status, stats = {}) {
  if (!db) initDB();
  db.prepare(`
    INSERT INTO sync_log (client_id, status, opportunities_synced, contacts_synced, duration_ms, error)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(clientId, status, stats.opportunities || 0, stats.contacts || 0,
    stats.durationMs || 0, stats.error || null);
}

// ============================================================
// Read functions
// ============================================================

function getOpportunities(clientId, options = {}) {
  if (!db) initDB();
  let sql = 'SELECT * FROM opportunities WHERE client_id = ?';
  const params = [clientId];

  if (options.startDate) {
    sql += ' AND created_at >= ?';
    params.push(options.startDate);
  }
  if (options.endDate) {
    sql += ' AND created_at <= ?';
    params.push(options.endDate + 'T23:59:59.999Z');
  }
  if (options.status) {
    sql += ' AND status = ?';
    params.push(options.status);
  }
  if (options.source) {
    sql += ' AND source = ?';
    params.push(options.source);
  }

  sql += ' ORDER BY created_at DESC';
  if (options.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }

  return db.prepare(sql).all(...params).map(r => ({
    id: r.id,
    name: r.name,
    contactId: r.contact_id,
    contactName: r.contact_name,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    pipelineId: r.pipeline_id,
    pipelineStageId: r.pipeline_stage_id,
    stageName: r.stage_name,
    status: r.status,
    monetaryValue: r.monetary_value,
    source: r.source,
    utmCampaign: r.utm_campaign,
    utmContent: r.utm_content,
    utmMedium: r.utm_medium,
    utmSource: r.utm_source,
    tags: r.tags ? JSON.parse(r.tags) : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

function getOpportunitySummary(clientId, startDate, endDate) {
  if (!db) initDB();
  const endParam = endDate ? endDate + 'T23:59:59.999Z' : null;
  return db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as total_open,
      SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as total_won,
      SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as total_lost,
      SUM(CASE WHEN status = 'won' THEN monetary_value ELSE 0 END) as won_value,
      SUM(monetary_value) as total_value
    FROM opportunities
    WHERE client_id = ?
      AND (? IS NULL OR created_at >= ?)
      AND (? IS NULL OR created_at <= ?)
  `).get(clientId, startDate, startDate, endParam, endParam);
}

function getOpportunitiesBySource(clientId, startDate, endDate) {
  if (!db) initDB();
  const endParam = endDate ? endDate + 'T23:59:59.999Z' : null;
  return db.prepare(`
    SELECT
      COALESCE(source, 'Direto') as source,
      COUNT(*) as leads,
      SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won,
      SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost,
      SUM(CASE WHEN status = 'won' THEN monetary_value ELSE 0 END) as won_value
    FROM opportunities
    WHERE client_id = ?
      AND (? IS NULL OR created_at >= ?)
      AND (? IS NULL OR created_at <= ?)
    GROUP BY COALESCE(source, 'Direto')
    ORDER BY leads DESC
  `).all(clientId, startDate, startDate, endParam, endParam);
}

function getOpportunitiesByDay(clientId, startDate, endDate) {
  if (!db) initDB();
  const endParam = endDate ? endDate + 'T23:59:59.999Z' : null;
  return db.prepare(`
    SELECT
      SUBSTR(created_at, 1, 10) as date,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
      SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_count,
      SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_count,
      SUM(CASE WHEN status = 'won' THEN monetary_value ELSE 0 END) as won_value
    FROM opportunities
    WHERE client_id = ?
      AND (? IS NULL OR created_at >= ?)
      AND (? IS NULL OR created_at <= ?)
    GROUP BY SUBSTR(created_at, 1, 10)
    ORDER BY date
  `).all(clientId, startDate, startDate, endParam, endParam);
}

function getRecentContacts(clientId, options = {}) {
  if (!db) initDB();
  let sql = 'SELECT * FROM contacts WHERE client_id = ?';
  const params = [clientId];

  if (options.startDate) {
    sql += ' AND date_added >= ?';
    params.push(options.startDate);
  }
  if (options.endDate) {
    sql += ' AND date_added <= ?';
    params.push(options.endDate + 'T23:59:59.999Z');
  }

  sql += ' ORDER BY date_added DESC LIMIT ?';
  params.push(options.limit || 50);

  return db.prepare(sql).all(...params).map(r => ({
    ...r,
    tags: r.tags ? JSON.parse(r.tags) : [],
  }));
}

function getPipelineStages(clientId) {
  if (!db) initDB();
  return db.prepare('SELECT * FROM pipeline_stages WHERE client_id = ? ORDER BY position').all(clientId);
}

function getDailySnapshots(clientId, startDate, endDate) {
  if (!db) initDB();
  return db.prepare(`
    SELECT * FROM daily_snapshot
    WHERE client_id = ?
      AND (? IS NULL OR date >= ?)
      AND (? IS NULL OR date <= ?)
    ORDER BY date
  `).all(clientId, startDate, startDate, endDate, endDate);
}

function getLastSync(clientId) {
  if (!db) initDB();
  return db.prepare('SELECT * FROM sync_log WHERE client_id = ? ORDER BY created_at DESC LIMIT 1').get(clientId) || null;
}

function hasData(clientId) {
  if (!db) initDB();
  const row = db.prepare('SELECT COUNT(*) as count FROM opportunities WHERE client_id = ?').get(clientId);
  return row.count > 0;
}

// ============================================================
// CRM x Ads Cross-Reference queries (local DB only)
// ============================================================

/**
 * Retorna performance por campanha (UTM) com contagens por status.
 * JOIN opp + contacts para maximizar cobertura UTM.
 */
function getCampaignPerformance(clientId, startDate, endDate) {
  if (!db) initDB();
  const endParam = endDate ? endDate + 'T23:59:59.999Z' : null;
  return db.prepare(`
    SELECT
      COALESCE(o.utm_campaign, c.utm_campaign, o.source, 'Sem UTM') as campaign,
      COUNT(*) as total,
      SUM(CASE WHEN o.status = 'open' THEN 1 ELSE 0 END) as open_count,
      SUM(CASE WHEN o.status = 'won' THEN 1 ELSE 0 END) as won_count,
      SUM(CASE WHEN o.status = 'lost' THEN 1 ELSE 0 END) as lost_count,
      SUM(CASE WHEN o.status = 'won' THEN o.monetary_value ELSE 0 END) as won_value,
      SUM(CASE WHEN o.status = 'lost' THEN o.monetary_value ELSE 0 END) as lost_value
    FROM opportunities o
    LEFT JOIN contacts c ON o.contact_id = c.id AND o.client_id = c.client_id
    WHERE o.client_id = ?
      AND (? IS NULL OR o.created_at >= ?)
      AND (? IS NULL OR o.created_at <= ?)
    GROUP BY COALESCE(o.utm_campaign, c.utm_campaign, o.source, 'Sem UTM')
    ORDER BY total DESC
  `).all(clientId, startDate, startDate, endParam, endParam);
}

/**
 * Retorna contagem de leads por utm_content (criativos) do CRM.
 */
function getAdPerformance(clientId, startDate, endDate) {
  if (!db) initDB();
  const endParam = endDate ? endDate + 'T23:59:59.999Z' : null;
  return db.prepare(`
    SELECT
      COALESCE(o.utm_content, c.utm_content, '-') as ad_name,
      COALESCE(o.utm_campaign, c.utm_campaign, o.source) as campaign,
      COUNT(*) as leads,
      SUM(CASE WHEN o.status = 'won' THEN 1 ELSE 0 END) as won_count
    FROM opportunities o
    LEFT JOIN contacts c ON o.contact_id = c.id AND o.client_id = c.client_id
    WHERE o.client_id = ?
      AND COALESCE(o.utm_content, c.utm_content) IS NOT NULL
      AND COALESCE(o.utm_content, c.utm_content) != '-'
      AND (? IS NULL OR o.created_at >= ?)
      AND (? IS NULL OR o.created_at <= ?)
    GROUP BY COALESCE(o.utm_content, c.utm_content, '-')
    ORDER BY leads DESC
  `).all(clientId, startDate, startDate, endParam, endParam);
}

/**
 * Retorna contagem de leads por utm_medium (conjuntos/adsets) do CRM.
 */
function getAdsetPerformance(clientId, startDate, endDate) {
  if (!db) initDB();
  const endParam = endDate ? endDate + 'T23:59:59.999Z' : null;
  return db.prepare(`
    SELECT
      COALESCE(o.utm_medium, c.utm_medium, '-') as adset_name,
      COALESCE(o.utm_campaign, c.utm_campaign, o.source) as campaign,
      COUNT(*) as leads,
      SUM(CASE WHEN o.status = 'won' THEN 1 ELSE 0 END) as won_count
    FROM opportunities o
    LEFT JOIN contacts c ON o.contact_id = c.id AND o.client_id = c.client_id
    WHERE o.client_id = ?
      AND COALESCE(o.utm_medium, c.utm_medium) IS NOT NULL
      AND COALESCE(o.utm_medium, c.utm_medium) != '-'
      AND (? IS NULL OR o.created_at >= ?)
      AND (? IS NULL OR o.created_at <= ?)
    GROUP BY COALESCE(o.utm_medium, c.utm_medium, '-')
    ORDER BY leads DESC
  `).all(clientId, startDate, startDate, endParam, endParam);
}

/**
 * Retorna funil (contagem por estágio) para opportunities abertas.
 */
function getFunnelStages(clientId) {
  if (!db) initDB();
  return db.prepare(`
    SELECT
      ps.name as stage_name,
      ps.position,
      COUNT(o.id) as count,
      COALESCE(SUM(o.monetary_value), 0) as value
    FROM pipeline_stages ps
    LEFT JOIN opportunities o
      ON ps.id = o.pipeline_stage_id
      AND o.client_id = ps.client_id
      AND o.status = 'open'
    WHERE ps.client_id = ?
    GROUP BY ps.id
    ORDER BY ps.position
  `).all(clientId);
}

/**
 * Retorna contagem total de contatos por utm_campaign (leads no CRM).
 */
function getContactsByCampaign(clientId, startDate, endDate) {
  if (!db) initDB();
  const endParam = endDate ? endDate + 'T23:59:59.999Z' : null;
  return db.prepare(`
    SELECT
      COALESCE(utm_campaign, source, 'Direto') as campaign,
      COUNT(*) as leads
    FROM contacts
    WHERE client_id = ?
      AND (? IS NULL OR date_added >= ?)
      AND (? IS NULL OR date_added <= ?)
    GROUP BY COALESCE(utm_campaign, source, 'Direto')
    ORDER BY leads DESC
  `).all(clientId, startDate, startDate, endParam, endParam);
}

// ============================================================
// Lead Scores read/write
// ============================================================

function upsertLeadScore(clientId, scoreData) {
  if (!db) initDB();
  migrateAddMessageCount();
  db.prepare(`
    INSERT INTO lead_scores (opportunity_id, client_id, contact_id, contact_name, score, tier,
      d1_engagement, d2_velocity, d3_pipeline, d4_recency, d5_targeting, d6_attribution,
      message_count, inbound_count, outbound_count,
      stage_name, status, utm_campaign, scored_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(opportunity_id, client_id) DO UPDATE SET
      contact_id=excluded.contact_id, contact_name=excluded.contact_name,
      score=excluded.score, tier=excluded.tier,
      d1_engagement=excluded.d1_engagement, d2_velocity=excluded.d2_velocity,
      d3_pipeline=excluded.d3_pipeline, d4_recency=excluded.d4_recency,
      d5_targeting=excluded.d5_targeting, d6_attribution=excluded.d6_attribution,
      message_count=excluded.message_count, inbound_count=excluded.inbound_count,
      outbound_count=excluded.outbound_count,
      stage_name=excluded.stage_name, status=excluded.status,
      utm_campaign=excluded.utm_campaign, scored_at=CURRENT_TIMESTAMP
  `).run(
    scoreData.opportunityId, clientId, scoreData.contactId || null, scoreData.contactName || null,
    scoreData.score, scoreData.tier,
    scoreData.dimensions.d1, scoreData.dimensions.d2, scoreData.dimensions.d3,
    scoreData.dimensions.d4, scoreData.dimensions.d5, scoreData.dimensions.d6,
    scoreData.messageCount || 0, scoreData.inboundCount || 0, scoreData.outboundCount || 0,
    scoreData.stageName || null, scoreData.status || null, scoreData.utmCampaign || null
  );
}

function upsertLeadScores(clientId, scores) {
  if (!db) initDB();
  const tx = db.transaction((list) => {
    for (const s of list) upsertLeadScore(clientId, s);
  });
  tx(scores);
}

function getLeadScores(clientId, options = {}) {
  if (!db) initDB();
  let sql = 'SELECT * FROM lead_scores WHERE client_id = ?';
  const params = [clientId];

  if (options.tier) {
    sql += ' AND tier = ?';
    params.push(options.tier);
  }

  sql += ' ORDER BY score DESC';

  if (options.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }
  if (options.offset) {
    sql += ' OFFSET ?';
    params.push(options.offset);
  }

  return db.prepare(sql).all(...params);
}

function getScoreDistribution(clientId) {
  if (!db) initDB();
  const ranges = db.prepare(`
    SELECT
      CASE
        WHEN score BETWEEN 0 AND 19 THEN '0-19'
        WHEN score BETWEEN 20 AND 39 THEN '20-39'
        WHEN score BETWEEN 40 AND 59 THEN '40-59'
        WHEN score BETWEEN 60 AND 79 THEN '60-79'
        WHEN score BETWEEN 80 AND 100 THEN '80-100'
      END as label,
      COUNT(*) as count
    FROM lead_scores
    WHERE client_id = ?
    GROUP BY label
    ORDER BY MIN(score)
  `).all(clientId);

  const avgs = db.prepare(`
    SELECT
      AVG(d1_engagement) as d1, AVG(d2_velocity) as d2, AVG(d3_pipeline) as d3,
      AVG(d4_recency) as d4, AVG(d5_targeting) as d5, AVG(d6_attribution) as d6
    FROM lead_scores WHERE client_id = ?
  `).get(clientId);

  return {
    ranges,
    avgByDimension: {
      d1: Math.round((avgs?.d1 || 0) * 10) / 10,
      d2: Math.round((avgs?.d2 || 0) * 10) / 10,
      d3: Math.round((avgs?.d3 || 0) * 10) / 10,
      d4: Math.round((avgs?.d4 || 0) * 10) / 10,
      d5: Math.round((avgs?.d5 || 0) * 10) / 10,
      d6: Math.round((avgs?.d6 || 0) * 10) / 10,
    },
  };
}

function getScoresByCampaign(clientId) {
  if (!db) initDB();
  return db.prepare(`
    SELECT
      utm_campaign,
      ROUND(AVG(score), 1) as avg_score,
      COUNT(*) as total,
      SUM(CASE WHEN tier = 'hot' THEN 1 ELSE 0 END) as hot,
      SUM(CASE WHEN tier = 'warm' THEN 1 ELSE 0 END) as warm,
      SUM(CASE WHEN tier = 'cold' THEN 1 ELSE 0 END) as cold,
      ROUND(AVG(d2_velocity), 1) as avg_d2,
      ROUND(AVG(d3_pipeline), 1) as avg_d3
    FROM lead_scores
    WHERE client_id = ? AND utm_campaign IS NOT NULL
    GROUP BY utm_campaign
    ORDER BY AVG(score) DESC
  `).all(clientId);
}

function updateOpportunityContactId(opportunityId, contactId) {
  if (!db) initDB();
  db.prepare(`
    UPDATE opportunities SET contact_id = ?, synced_at = CURRENT_TIMESTAMP
    WHERE id = ? AND (contact_id IS NULL OR contact_id = '')
  `).run(contactId, opportunityId);
}

function getScoreSummary(clientId) {
  if (!db) initDB();
  const stats = db.prepare(`
    SELECT
      AVG(score) as avg_score,
      COUNT(*) as total,
      SUM(CASE WHEN tier = 'hot' THEN 1 ELSE 0 END) as hot,
      SUM(CASE WHEN tier = 'warm' THEN 1 ELSE 0 END) as warm,
      SUM(CASE WHEN tier = 'cold' THEN 1 ELSE 0 END) as cold
    FROM lead_scores WHERE client_id = ?
  `).get(clientId);

  const topLeads = db.prepare(`
    SELECT * FROM lead_scores WHERE client_id = ? ORDER BY score DESC LIMIT 5
  `).all(clientId);

  return {
    avgScore: Math.round(stats?.avg_score || 0),
    totalScored: stats?.total || 0,
    byTier: { hot: stats?.hot || 0, warm: stats?.warm || 0, cold: stats?.cold || 0 },
    topLeads,
  };
}

/**
 * Migra banco existente adicionando colunas UTM se não existirem.
 * (Chamado automaticamente no initDB, mas pode ser chamado manualmente)
 */
function migrateAddUtmColumns() {
  if (!db) initDB();
  _migrateUtmColumns();
}

function migrateAddMessageCount() {
  if (!db) initDB();
  try {
    const cols = db.prepare("PRAGMA table_info(lead_scores)").all().map(c => c.name);
    if (!cols.includes('message_count')) {
      db.exec('ALTER TABLE lead_scores ADD COLUMN message_count INTEGER DEFAULT 0');
      console.log('[ghl-analytics-db] Migrated: added message_count to lead_scores');
    }
    if (!cols.includes('inbound_count')) {
      db.exec('ALTER TABLE lead_scores ADD COLUMN inbound_count INTEGER DEFAULT 0');
      console.log('[ghl-analytics-db] Migrated: added inbound_count to lead_scores');
    }
    if (!cols.includes('outbound_count')) {
      db.exec('ALTER TABLE lead_scores ADD COLUMN outbound_count INTEGER DEFAULT 0');
      console.log('[ghl-analytics-db] Migrated: added outbound_count to lead_scores');
    }
  } catch (e) { /* columns already exist */ }
}

module.exports = {
  initDB,
  migrateAddUtmColumns,
  migrateAddMessageCount,
  upsertPipelineStages,
  upsertOpportunity,
  upsertOpportunities,
  upsertContact,
  upsertContacts,
  upsertDailySnapshot,
  logSync,
  getOpportunities,
  getOpportunitySummary,
  getOpportunitiesBySource,
  getOpportunitiesByDay,
  getRecentContacts,
  getPipelineStages,
  getDailySnapshots,
  getLastSync,
  hasData,
  getCampaignPerformance,
  getAdPerformance,
  getAdsetPerformance,
  getFunnelStages,
  getContactsByCampaign,
  upsertLeadScore,
  upsertLeadScores,
  getLeadScores,
  getScoreDistribution,
  getScoreSummary,
  getScoresByCampaign,
  updateOpportunityContactId,
};
