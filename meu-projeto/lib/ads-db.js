// meu-projeto/lib/ads-db.js
// Módulo SQLite para persistir dados históricos de Ads (Meta + Google)
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '../../../docs/banco-dados-geral/meta-ads.db');
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
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      name TEXT,
      status TEXT,
      objective TEXT,
      daily_budget REAL,
      lifetime_budget REAL,
      created_time TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_campaigns_client ON campaigns(client_id);

    CREATE TABLE IF NOT EXISTS campaign_daily_insights (
      campaign_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      date TEXT NOT NULL,
      spend REAL DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      leads INTEGER DEFAULT 0,
      ctr REAL DEFAULT 0,
      cpc REAL DEFAULT 0,
      cpm REAL DEFAULT 0,
      reach INTEGER DEFAULT 0,
      frequency REAL DEFAULT 0,
      cost_per_result REAL DEFAULT 0,
      landing_page_views INTEGER DEFAULT 0,
      messaging_conversations INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (campaign_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_cdi_client_date ON campaign_daily_insights(client_id, date);

    CREATE TABLE IF NOT EXISTS adsets (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      name TEXT,
      status TEXT,
      daily_budget REAL,
      targeting TEXT,
      created_time TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_adsets_client ON adsets(client_id);
    CREATE INDEX IF NOT EXISTS idx_adsets_campaign ON adsets(campaign_id);

    CREATE TABLE IF NOT EXISTS adset_daily_insights (
      adset_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      date TEXT NOT NULL,
      spend REAL DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      leads INTEGER DEFAULT 0,
      ctr REAL DEFAULT 0,
      cpc REAL DEFAULT 0,
      cpm REAL DEFAULT 0,
      reach INTEGER DEFAULT 0,
      frequency REAL DEFAULT 0,
      cost_per_result REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (adset_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_adi_client_date ON adset_daily_insights(client_id, date);

    CREATE TABLE IF NOT EXISTS ads (
      id TEXT PRIMARY KEY,
      adset_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      name TEXT,
      status TEXT,
      thumbnail_url TEXT,
      created_time TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_ads_client ON ads(client_id);
    CREATE INDEX IF NOT EXISTS idx_ads_adset ON ads(adset_id);

    CREATE TABLE IF NOT EXISTS ad_daily_insights (
      ad_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      date TEXT NOT NULL,
      spend REAL DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      leads INTEGER DEFAULT 0,
      ctr REAL DEFAULT 0,
      cpc REAL DEFAULT 0,
      cpm REAL DEFAULT 0,
      reach INTEGER DEFAULT 0,
      frequency REAL DEFAULT 0,
      cost_per_result REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (ad_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_addi_client_date ON ad_daily_insights(client_id, date);

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      status TEXT NOT NULL,
      campaigns_synced INTEGER DEFAULT 0,
      adsets_synced INTEGER DEFAULT 0,
      ads_synced INTEGER DEFAULT 0,
      daily_rows INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sync_client ON sync_log(client_id, created_at DESC);
  `);

  // Migration: adicionar coluna platform onde não existe
  const migrations = [
    { table: 'campaigns', column: 'platform', type: "TEXT DEFAULT 'meta'" },
    { table: 'adsets', column: 'platform', type: "TEXT DEFAULT 'meta'" },
    { table: 'ads', column: 'platform', type: "TEXT DEFAULT 'meta'" },
    { table: 'campaign_daily_insights', column: 'platform', type: "TEXT DEFAULT 'meta'" },
    { table: 'adset_daily_insights', column: 'platform', type: "TEXT DEFAULT 'meta'" },
    { table: 'ad_daily_insights', column: 'platform', type: "TEXT DEFAULT 'meta'" },
    { table: 'sync_log', column: 'platform', type: "TEXT DEFAULT 'meta'" },
    // Google Ads specific columns
    { table: 'campaign_daily_insights', column: 'conversions', type: 'REAL DEFAULT 0' },
    { table: 'campaign_daily_insights', column: 'conversions_value', type: 'REAL DEFAULT 0' },
    { table: 'campaign_daily_insights', column: 'impression_share', type: 'REAL' },
    { table: 'adset_daily_insights', column: 'conversions', type: 'REAL DEFAULT 0' },
    { table: 'adset_daily_insights', column: 'conversions_value', type: 'REAL DEFAULT 0' },
    { table: 'campaigns', column: 'campaign_type', type: 'TEXT' },
  ];

  for (const m of migrations) {
    try {
      db.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`);
    } catch (_) {
      // Column already exists — ignore
    }
  }

  // Index for platform filtering
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_campaigns_platform ON campaigns(platform)'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_sync_platform ON sync_log(platform)'); } catch (_) {}

  console.log(`✅ Ads DB inicializado em ${DB_PATH}`);
}

// ============================================================
// Write functions
// ============================================================

function upsertCampaign(clientId, campaign, platform = 'meta') {
  if (!db) initDB();
  db.prepare(`
    INSERT INTO campaigns (id, client_id, name, status, objective, daily_budget, lifetime_budget, created_time, platform, campaign_type, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, status=excluded.status, objective=excluded.objective,
      daily_budget=excluded.daily_budget, lifetime_budget=excluded.lifetime_budget,
      platform=excluded.platform, campaign_type=excluded.campaign_type, updated_at=CURRENT_TIMESTAMP
  `).run(campaign.id, clientId, campaign.name, campaign.status, campaign.objective,
    campaign.dailyBudget || null, campaign.lifetimeBudget || null, campaign.createdTime || null,
    platform, campaign.campaignType || campaign.objective || null);
}

function upsertCampaignDailyInsights(clientId, campaignId, insights, platform = 'meta') {
  if (!db) initDB();
  const stmt = db.prepare(`
    INSERT INTO campaign_daily_insights (campaign_id, client_id, date, spend, clicks, impressions, leads, ctr, cpc, cpm, reach, frequency, cost_per_result, landing_page_views, messaging_conversations, platform, conversions, conversions_value, impression_share, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(campaign_id, date) DO UPDATE SET
      spend=excluded.spend, clicks=excluded.clicks, impressions=excluded.impressions, leads=excluded.leads,
      ctr=excluded.ctr, cpc=excluded.cpc, cpm=excluded.cpm, reach=excluded.reach, frequency=excluded.frequency,
      cost_per_result=excluded.cost_per_result, landing_page_views=excluded.landing_page_views,
      messaging_conversations=excluded.messaging_conversations, platform=excluded.platform,
      conversions=excluded.conversions, conversions_value=excluded.conversions_value,
      impression_share=excluded.impression_share, updated_at=CURRENT_TIMESTAMP
  `);
  const upsertMany = db.transaction((rows) => {
    for (const row of rows) {
      stmt.run(campaignId, clientId, row.date, row.spend || 0, row.clicks || 0, row.impressions || 0,
        row.conversions || row.leads || 0, row.ctr || 0, row.cpc || 0, row.cpm || 0, row.reach || 0, row.frequency || 0,
        row.costPerResult || 0, row.landingPageViews || 0, row.messagingConversations || 0,
        platform, row.conversions || 0, row.conversionsValue || 0, row.impressionShare || null);
    }
  });
  upsertMany(insights);
}

function upsertAdset(clientId, campaignId, adset, platform = 'meta') {
  if (!db) initDB();
  db.prepare(`
    INSERT INTO adsets (id, campaign_id, client_id, name, status, daily_budget, targeting, created_time, platform, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, status=excluded.status, daily_budget=excluded.daily_budget,
      targeting=excluded.targeting, platform=excluded.platform, updated_at=CURRENT_TIMESTAMP
  `).run(adset.id, campaignId, clientId, adset.name, adset.status,
    adset.dailyBudget || adset.cpcBid || null,
    adset.targeting ? JSON.stringify(adset.targeting) : null,
    adset.createdTime || null, platform);
}

function upsertAdsetDailyInsights(clientId, adsetId, insights) {
  if (!db) initDB();
  const stmt = db.prepare(`
    INSERT INTO adset_daily_insights (adset_id, client_id, date, spend, clicks, impressions, leads, ctr, cpc, cpm, reach, frequency, cost_per_result, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(adset_id, date) DO UPDATE SET
      spend=excluded.spend, clicks=excluded.clicks, impressions=excluded.impressions, leads=excluded.leads,
      ctr=excluded.ctr, cpc=excluded.cpc, cpm=excluded.cpm, reach=excluded.reach, frequency=excluded.frequency,
      cost_per_result=excluded.cost_per_result, updated_at=CURRENT_TIMESTAMP
  `);
  const upsertMany = db.transaction((rows) => {
    for (const row of rows) {
      stmt.run(adsetId, clientId, row.date, row.spend || 0, row.clicks || 0, row.impressions || 0,
        row.conversions || 0, row.ctr || 0, row.cpc || 0, row.cpm || 0, row.reach || 0, row.frequency || 0,
        row.costPerResult || 0);
    }
  });
  upsertMany(insights);
}

function upsertAd(clientId, campaignId, adsetId, ad, platform = 'meta') {
  if (!db) initDB();
  db.prepare(`
    INSERT INTO ads (id, adset_id, campaign_id, client_id, name, status, thumbnail_url, created_time, platform, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, status=excluded.status, thumbnail_url=excluded.thumbnail_url,
      platform=excluded.platform, updated_at=CURRENT_TIMESTAMP
  `).run(ad.id, adsetId, campaignId, clientId, ad.name, ad.status,
    ad.thumbnailUrl || null, ad.createdTime || null, platform);
}

function upsertAdDailyInsights(clientId, adId, insights) {
  if (!db) initDB();
  const stmt = db.prepare(`
    INSERT INTO ad_daily_insights (ad_id, client_id, date, spend, clicks, impressions, leads, ctr, cpc, cpm, reach, frequency, cost_per_result, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(ad_id, date) DO UPDATE SET
      spend=excluded.spend, clicks=excluded.clicks, impressions=excluded.impressions, leads=excluded.leads,
      ctr=excluded.ctr, cpc=excluded.cpc, cpm=excluded.cpm, reach=excluded.reach, frequency=excluded.frequency,
      cost_per_result=excluded.cost_per_result, updated_at=CURRENT_TIMESTAMP
  `);
  const upsertMany = db.transaction((rows) => {
    for (const row of rows) {
      stmt.run(adId, clientId, row.date, row.spend || 0, row.clicks || 0, row.impressions || 0,
        row.conversions || 0, row.ctr || 0, row.cpc || 0, row.cpm || 0, row.reach || 0, row.frequency || 0,
        row.costPerResult || 0);
    }
  });
  upsertMany(insights);
}

function logSync(clientId, status, stats = {}, platform = 'meta') {
  if (!db) initDB();
  db.prepare(`
    INSERT INTO sync_log (client_id, status, campaigns_synced, adsets_synced, ads_synced, daily_rows, duration_ms, error, platform)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(clientId, status, stats.campaigns || 0, stats.adsets || 0, stats.ads || 0,
    stats.dailyRows || 0, stats.durationMs || 0, stats.error || null, platform);
}

// ============================================================
// Read functions
// ============================================================

function getCampaignSummaries(clientId, startDate, endDate, platform = null) {
  if (!db) initDB();
  const platformFilter = platform ? 'AND c.platform = ?' : '';
  const params = [startDate, startDate, endDate, endDate, clientId];
  if (platform) params.push(platform);

  return db.prepare(`
    SELECT c.id, c.name, c.status, c.objective, c.daily_budget, c.platform, c.campaign_type,
      COALESCE(SUM(i.spend), 0) as spend,
      COALESCE(SUM(i.clicks), 0) as clicks,
      COALESCE(SUM(i.impressions), 0) as impressions,
      COALESCE(SUM(i.leads), 0) as leads,
      COALESCE(SUM(i.reach), 0) as reach,
      CASE WHEN SUM(i.impressions) > 0 THEN CAST(SUM(i.clicks) AS REAL) / SUM(i.impressions) * 100 ELSE 0 END as ctr,
      CASE WHEN SUM(i.clicks) > 0 THEN SUM(i.spend) / SUM(i.clicks) ELSE 0 END as cpc,
      CASE WHEN SUM(i.impressions) > 0 THEN SUM(i.spend) / SUM(i.impressions) * 1000 ELSE 0 END as cpm,
      CASE WHEN SUM(i.leads) > 0 THEN SUM(i.spend) / SUM(i.leads) ELSE 0 END as cost_per_result,
      AVG(i.frequency) as frequency,
      COALESCE(SUM(i.conversions), 0) as conversions,
      COALESCE(SUM(i.conversions_value), 0) as conversions_value
    FROM campaigns c
    LEFT JOIN campaign_daily_insights i ON c.id = i.campaign_id
      AND (? IS NULL OR i.date >= ?) AND (? IS NULL OR i.date <= ?)
    WHERE c.client_id = ? ${platformFilter}
    GROUP BY c.id
    ORDER BY spend DESC
  `).all(...params);
}

function getDailyInsights(clientId, startDate, endDate, platform = null) {
  if (!db) initDB();
  const platformFilter = platform ? 'AND platform = ?' : '';
  const params = [clientId, startDate, startDate, endDate, endDate];
  if (platform) params.push(platform);

  return db.prepare(`
    SELECT date,
      SUM(spend) as spend,
      SUM(clicks) as clicks,
      SUM(impressions) as impressions,
      SUM(leads) as leads,
      SUM(reach) as reach,
      CASE WHEN SUM(impressions) > 0 THEN CAST(SUM(clicks) AS REAL) / SUM(impressions) * 100 ELSE 0 END as ctr,
      CASE WHEN SUM(clicks) > 0 THEN SUM(spend) / SUM(clicks) ELSE 0 END as cpc,
      SUM(landing_page_views) as landing_page_views,
      SUM(messaging_conversations) as messaging_conversations,
      SUM(conversions) as conversions,
      SUM(conversions_value) as conversions_value
    FROM campaign_daily_insights
    WHERE client_id = ?
      AND (? IS NULL OR date >= ?) AND (? IS NULL OR date <= ?)
      ${platformFilter}
    GROUP BY date
    ORDER BY date
  `).all(...params);
}

function getAdSummaries(clientId, startDate, endDate) {
  if (!db) initDB();
  return db.prepare(`
    SELECT a.id, a.name, a.status, a.thumbnail_url, a.campaign_id,
      c.name as campaign_name,
      COALESCE(SUM(i.spend), 0) as spend,
      COALESCE(SUM(i.clicks), 0) as clicks,
      COALESCE(SUM(i.impressions), 0) as impressions,
      COALESCE(SUM(i.leads), 0) as leads,
      COALESCE(SUM(i.reach), 0) as reach,
      CASE WHEN SUM(i.impressions) > 0 THEN CAST(SUM(i.clicks) AS REAL) / SUM(i.impressions) * 100 ELSE 0 END as ctr,
      CASE WHEN SUM(i.clicks) > 0 THEN SUM(i.spend) / SUM(i.clicks) ELSE 0 END as cpc,
      CASE WHEN SUM(i.impressions) > 0 THEN SUM(i.spend) / SUM(i.impressions) * 1000 ELSE 0 END as cpm,
      CASE WHEN SUM(i.leads) > 0 THEN SUM(i.spend) / SUM(i.leads) ELSE 0 END as cost_per_result,
      AVG(i.frequency) as frequency
    FROM ads a
    LEFT JOIN ad_daily_insights i ON a.id = i.ad_id
      AND (? IS NULL OR i.date >= ?) AND (? IS NULL OR i.date <= ?)
    LEFT JOIN campaigns c ON a.campaign_id = c.id
    WHERE a.client_id = ?
    GROUP BY a.id
    ORDER BY spend DESC
  `).all(startDate, startDate, endDate, endDate, clientId);
}

function getAdsetSummaries(clientId, startDate, endDate) {
  if (!db) initDB();
  return db.prepare(`
    SELECT s.id, s.name, s.status, s.campaign_id, s.targeting,
      c.name as campaign_name,
      COALESCE(SUM(i.spend), 0) as spend,
      COALESCE(SUM(i.clicks), 0) as clicks,
      COALESCE(SUM(i.impressions), 0) as impressions,
      COALESCE(SUM(i.leads), 0) as leads,
      COALESCE(SUM(i.reach), 0) as reach,
      CASE WHEN SUM(i.impressions) > 0 THEN CAST(SUM(i.clicks) AS REAL) / SUM(i.impressions) * 100 ELSE 0 END as ctr,
      CASE WHEN SUM(i.clicks) > 0 THEN SUM(i.spend) / SUM(i.clicks) ELSE 0 END as cpc,
      CASE WHEN SUM(i.impressions) > 0 THEN SUM(i.spend) / SUM(i.impressions) * 1000 ELSE 0 END as cpm,
      CASE WHEN SUM(i.leads) > 0 THEN SUM(i.spend) / SUM(i.leads) ELSE 0 END as cost_per_result,
      AVG(i.frequency) as frequency
    FROM adsets s
    LEFT JOIN adset_daily_insights i ON s.id = i.adset_id
      AND (? IS NULL OR i.date >= ?) AND (? IS NULL OR i.date <= ?)
    LEFT JOIN campaigns c ON s.campaign_id = c.id
    WHERE s.client_id = ?
    GROUP BY s.id
    ORDER BY spend DESC
  `).all(startDate, startDate, endDate, endDate, clientId);
}

function getLastSync(clientId) {
  if (!db) initDB();
  return db.prepare(`
    SELECT * FROM sync_log WHERE client_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(clientId) || null;
}

function hasData(clientId) {
  if (!db) initDB();
  const row = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE client_id = ?').get(clientId);
  return row.count > 0;
}

function getCampaignAverages(clientId, startDate, endDate) {
  if (!db) initDB();

  const rows = db.prepare(`
    SELECT c.name as campaign_name,
      COALESCE(SUM(i.spend), 0) as spend,
      COALESCE(SUM(i.clicks), 0) as clicks,
      COALESCE(SUM(i.impressions), 0) as impressions,
      COALESCE(SUM(i.leads), 0) as leads,
      CASE WHEN SUM(i.impressions) > 0 THEN CAST(SUM(i.clicks) AS REAL) / SUM(i.impressions) * 100 ELSE 0 END as ctr,
      CASE WHEN SUM(i.leads) > 0 THEN SUM(i.spend) / SUM(i.leads) ELSE 0 END as cpl
    FROM campaigns c
    LEFT JOIN campaign_daily_insights i ON c.id = i.campaign_id
      AND (? IS NULL OR i.date >= ?) AND (? IS NULL OR i.date <= ?)
    WHERE c.client_id = ?
    GROUP BY c.id
    HAVING SUM(i.spend) > 0
  `).all(startDate || null, startDate || null, endDate || null, endDate || null, clientId);

  const byCampaign = {};
  let totalCtr = 0, totalCpl = 0, count = 0;

  for (const r of rows) {
    byCampaign[r.campaign_name] = {
      ctr: r.ctr,
      cpl: r.cpl,
      spend: r.spend,
      leads: r.leads,
      wonValue: 0,
    };
    totalCtr += r.ctr;
    totalCpl += r.cpl;
    count++;
  }

  return {
    avgCtr: count > 0 ? totalCtr / count : 0,
    avgCpl: count > 0 ? totalCpl / count : 0,
    byCampaign,
  };
}

module.exports = {
  initDB,
  upsertCampaign,
  upsertCampaignDailyInsights,
  upsertAdset,
  upsertAdsetDailyInsights,
  upsertAd,
  upsertAdDailyInsights,
  logSync,
  getCampaignSummaries,
  getDailyInsights,
  getAdSummaries,
  getAdsetSummaries,
  getLastSync,
  hasData,
  getCampaignAverages,
};
