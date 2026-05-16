#!/usr/bin/env node
/**
 * Sync de dados — Dashboard Dra. Gabrielle Oliveira
 * Puxa Meta Ads → Google Sheet (aba metaads)
 *
 * Uso: node sync-gabrielle-dashboard.js [--full]
 *   --full : reescreve últimos 90 dias (padrão: últimos 30 dias)
 *
 * Planilha: https://docs.google.com/spreadsheets/d/1EtgCOs2DuucNJVh-mGWmJ-RQk9chHfrw2QKuy7Z9dlU
 */

const path  = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { google } = require('googleapis');

// ─── Config ────────────────────────────────────────────────────────────────────
const SPREADSHEET_ID  = '1EtgCOs2DuucNJVh-mGWmJ-RQk9chHfrw2QKuy7Z9dlU';
const META_ACCOUNT_ID = 'act_1136892320236480';
const META_TOKEN      = process.env.META_ACCESS_TOKEN;

const FULL_MODE = process.argv.includes('--full');
const DAYS_BACK = FULL_MODE ? 90 : 30;

// ─── Google Sheets Auth ────────────────────────────────────────────────────────
const CLIENT_ID     = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_DOCS_REFRESH_TOKEN;

function getSheets() {
  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  auth.setCredentials({ refresh_token: REFRESH_TOKEN });
  return google.sheets({ version: 'v4', auth });
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function dateStr(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function httpsGet(hostname, path_, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path: path_, headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(new Error(`JSON parse failed: ${d.substring(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function writeToSheet(tabName, headers, rows) {
  const sheets = getSheets();
  const values = [headers, ...rows];
  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: tabName });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
  console.log(`  ✅ ${tabName}: ${rows.length} linhas escritas`);
}

// ─── Meta Ads Sync ─────────────────────────────────────────────────────────────
const META_HEADERS = [
  'account_name', 'campaign_id', 'campaign', 'campaign_status', 'campaign_daily_budget',
  'adset_id', 'adset_name', 'adset_status',
  'ad_id', 'ad_name',
  'date', 'impressions', 'reach', 'frequency', 'spend', 'cpc', 'ctr', 'cpm',
  'link_clicks', 'actions_landing_page_view', 'actions_lead',
  'actions_onsite_conversion_messaging_conversation_started_7d',
  'cost_per_action_type_lead', 'cost_per_action_type_landing_page_view',
  'thumbnail_url', 'video_url', 'datasource',
];

async function fetchMetaAds(startDate, endDate) {
  const fields = [
    'account_name', 'campaign_id', 'campaign_name',
    'adset_id', 'adset_name',
    'ad_id', 'ad_name',
    'date_start',
    'impressions', 'reach', 'frequency', 'spend', 'cpc', 'ctr', 'cpm',
    'clicks', 'actions', 'cost_per_action_type',
  ].join(',');

  const all = [];
  let after = null;

  while (true) {
    const cursor = after ? `&after=${encodeURIComponent(after)}` : '';
    const url = `/v21.0/${META_ACCOUNT_ID}/insights?fields=${encodeURIComponent(fields)}&level=ad&time_increment=1&time_range=%7B%22since%22%3A%22${startDate}%22%2C%22until%22%3A%22${endDate}%22%7D&limit=500${cursor}&access_token=${META_TOKEN}`;

    const data = await httpsGet('graph.facebook.com', url, {});
    if (data.error) { console.error('Meta Ads error:', data.error.message); break; }

    const items = data.data || [];
    all.push(...items);
    process.stdout.write(`\r  Meta Ads: ${all.length} registros...`);

    if (data.paging?.cursors?.after && items.length === 500) {
      after = data.paging.cursors.after;
      await sleep(300);
    } else break;
  }
  console.log();
  return all;
}

function getAction(actions, type) {
  if (!actions) return '';
  const a = actions.find(x => x.action_type === type);
  return a ? a.value : '';
}

function getCostPerAction(costs, type) {
  if (!costs) return '';
  const c = costs.find(x => x.action_type === type);
  return c ? c.value : '';
}

async function syncMetaAds() {
  console.log(`\n📊 Sincronizando Meta Ads — Gabrielle (${DAYS_BACK} dias)...`);
  const endDate   = dateStr(0);
  const startDate = dateStr(DAYS_BACK);
  const items     = await fetchMetaAds(startDate, endDate);

  const rows = items.map(item => [
    item.account_name || '',
    item.campaign_id || '',
    item.campaign_name || '',
    '', // campaign_status (não disponível no insights endpoint)
    '', // campaign_daily_budget
    item.adset_id || '',
    item.adset_name || '',
    '', // adset_status
    item.ad_id || '',
    item.ad_name || '',
    item.date_start || '',
    item.impressions || '0',
    item.reach || '0',
    item.frequency || '0',
    item.spend || '0',
    item.cpc || '',
    item.ctr || '0',
    item.cpm || '0',
    getAction(item.actions, 'link_click') || item.inline_link_clicks || item.clicks || '0',
    getAction(item.actions, 'landing_page_view'),
    getAction(item.actions, 'lead'),
    getAction(item.actions, 'onsite_conversion.messaging_conversation_started_7d'),
    getCostPerAction(item.cost_per_action_type, 'lead'),
    getCostPerAction(item.cost_per_action_type, 'landing_page_view'),
    '', // thumbnail_url
    '', // video_url
    'DashboardSyncer',
  ]);

  await writeToSheet('Campanhas', META_HEADERS, rows);
}

// ─── Sync time ─────────────────────────────────────────────────────────────────
async function writeSyncTime() {
  try {
    const sheets = getSheets();
    const now = new Date().toISOString();
    // Escreve na aba Meta para compatibilidade com fetchSyncTime() do dashboard
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Meta!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [[now]] },
    });
  } catch { /* ignora — aba Meta pode não existir */ }
}

// ─── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔄 Dashboard Sync — Dra. Gabrielle Oliveira`);
  console.log(`   Modo: ${FULL_MODE ? 'FULL (90 dias)' : 'incremental (30 dias)'}`);
  console.log(`   Conta: ${META_ACCOUNT_ID}`);
  console.log(`   Inicio: ${new Date().toLocaleString('pt-BR')}\n`);

  if (!META_TOKEN) {
    console.error('❌ META_ACCESS_TOKEN não encontrado no .env');
    process.exit(1);
  }

  const errors = [];

  try { await syncMetaAds(); } catch (e) { console.error('Meta Ads:', e.message); errors.push(`meta:${e.message}`); }
  try { await writeSyncTime(); } catch { /* ignora */ }

  const status = errors.length === 0 ? '✅ Sucesso' : `⚠️ Parcial (${errors.length} erro(s))`;
  console.log(`\n${status} — ${new Date().toLocaleString('pt-BR')}`);
  if (errors.length > 0) errors.forEach(e => console.error('  -', e));
}

main().catch(err => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
