#!/usr/bin/env node
/**
 * Sync de dados — Dashboard Dr. Cleugo Porto
 * Puxa Meta Ads + GHL Oportunidades + GHL Conversas → Google Sheet
 *
 * Uso: node sync-cleugo-dashboard.js [--full]
 *   --full : reescreve últimos 90 dias (padrão: últimos 7 dias incremental)
 */

const path    = require('path');
const https   = require('https');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { google } = require('googleapis');

// ─── Config ────────────────────────────────────────────────────────────────────
const SPREADSHEET_ID  = '1wQI46mhN1kkUuGQDH7XbdF9dEksJSUZ9XbYQeZ5CrAc';
const META_ACCOUNT_ID = 'act_944253477334195';
const GHL_TOKEN       = 'pit-2a4bc66c-28e9-4ba3-82d4-6c39d5bd2d17';
const GHL_LOCATION_ID = '5pupAX6pAY1tiF01b2qo';
const GHL_PIPELINE_ID = 'bVIJAui4cKYng4CKluh6'; // Procedimentos
const META_TOKEN      = process.env.META_ACCESS_TOKEN;

const FULL_MODE = process.argv.includes('--full');
const DAYS_BACK = FULL_MODE ? 90 : 30; // 30 dias incremental para garantir dados completos no dashboard

// ─── Google Sheets Auth ────────────────────────────────────────────────────────
const CLIENT_ID     = process.env.GOOGLE_DRIVE_CLIENT_ID     || process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET;
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

function ghlGet(path_) {
  return httpsGet('services.leadconnectorhq.com', path_, {
    Authorization: `Bearer ${GHL_TOKEN}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
  });
}

async function writeToSheet(tabName, headers, rows) {
  const sheets = getSheets();
  const values = [headers, ...rows];

  // Limpar aba antes de escrever
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
  let page  = 0;

  while (true) {
    const cursor = after ? `&after=${encodeURIComponent(after)}` : '';
    const url = `/v21.0/${META_ACCOUNT_ID}/insights?fields=${encodeURIComponent(fields)}&level=ad&time_increment=1&time_range=%7B%22since%22%3A%22${startDate}%22%2C%22until%22%3A%22${endDate}%22%7D&limit=500${cursor}&access_token=${META_TOKEN}`;

    const data = await httpsGet('graph.facebook.com', url, {});
    if (data.error) { console.error('Meta Ads error:', data.error.message); break; }

    const items = data.data || [];
    all.push(...items);
    page++;
    process.stdout.write(`\r  Meta Ads: ${all.length} registros (página ${page})...`);

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
  console.log(`\n📊 Sincronizando Meta Ads (${DAYS_BACK} dias)...`);
  const endDate   = dateStr(0);
  const startDate = dateStr(DAYS_BACK);
  const items     = await fetchMetaAds(startDate, endDate);

  const rows = items.map(item => {
    return [
      item.account_name || '',
      item.campaign_id || '',
      item.campaign_name || '',
      '', // campaign_status
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
    ];
  });

  if (FULL_MODE) {
    await writeToSheet('Meta', META_HEADERS, rows);
  } else {
    // Incremental: apenas sobrescreve tudo mesmo assim (Meta tem atribuição retroativa)
    await writeToSheet('Meta', META_HEADERS, rows);
  }
}

// ─── GHL Oportunidades Sync ────────────────────────────────────────────────────
const OPP_HEADERS = [
  'opportunity_id', 'opportunity_name', 'opportunity_contact_name',
  'opportunity_contact_email', 'opportunity_contact_phone', 'opportunity_contact_id',
  'opportunity_contact_tags', 'opportunity_status', 'opportunity_monetary_value',
  'opportunity_source', 'opportunity_pipeline_stage_id', 'opportunity_assigned_to',
  'opportunity_created_at', 'opportunity_updated_at',
  'opportunity_last_stage_change_at', 'opportunity_last_status_change_at',
  'opportunity_lost_reason_id',
  'opportunity_utm_campaign', 'opportunity_utm_medium', 'opportunity_utm_content',
];

async function fetchGHLOpportunities() {
  const all = [];
  let startAfterId = null;
  let startAfterDate = null;
  let page = 0;

  while (true) {
    let url = `/opportunities/search?location_id=${GHL_LOCATION_ID}&pipeline_id=${GHL_PIPELINE_ID}&limit=100`;
    if (startAfterId) url += `&startAfterId=${startAfterId}&startAfter=${startAfterDate}`;

    const data = await ghlGet(url);
    const opps = data.opportunities || [];
    if (opps.length === 0) break;

    all.push(...opps);
    page++;
    process.stdout.write(`\r  GHL Opps: ${all.length} registros...`);

    const meta = data.meta || {};
    if (opps.length < 100 || !meta.startAfter) break;
    startAfterDate = meta.startAfter;
    startAfterId   = meta.startAfterId;
    await sleep(200);
  }
  console.log();
  return all;
}

async function syncOpportunities() {
  console.log('\n📋 Sincronizando GHL Oportunidades...');
  const opps = await fetchGHLOpportunities();

  const rows = opps.map(o => {
    const contact = o.contact || {};
    const tags = contact.tags ? JSON.stringify(contact.tags) : '[]';

    // UTMs: usar first-touch attribution (isFirst=true) ou primeira entrada do array
    const attributions = o.attributions || [];
    const firstTouch = attributions.find(a => a.isFirst) || attributions[0] || {};
    const utmCampaign = firstTouch.utmCampaign || '';
    const utmMedium   = firstTouch.utmMedium   || '';
    const utmContent  = firstTouch.utmContent  || '';

    return [
      o.id || '',
      o.name || '',
      contact.name || '',
      contact.email || '',
      contact.phone || '',
      contact.id || '',
      tags,
      o.status || 'open',
      o.monetaryValue || '0',
      o.source || '',
      o.pipelineStageId || '',
      o.assignedTo || '',
      o.createdAt || '',
      o.updatedAt || '',
      o.lastStageChangeAt || '',
      o.lastStatusChangeAt || '',
      o.lostReasonId || '',
      utmCampaign,
      utmMedium,
      utmContent,
    ];
  });

  await writeToSheet('Oportunidades', OPP_HEADERS, rows);
}

// ─── GHL Conversas Sync ────────────────────────────────────────────────────────
// Headers alinhados com conversations.ts no frontend
const CONV_HEADERS = [
  'conversation_id',
  'conversation_contact_id',
  'conversation_contact_name',
  'conversation_company_name',
  'conversation_email',
  'conversation_phone',
  'conversation_full_name',
  'conversation_date_added',
  'conversation_date_updated',
  'conversation_last_message_date',
  'conversation_last_manual_message_date',
  'conversation_last_message_body',
  'conversation_last_message_direction',
  'conversation_last_message_type',
  'conversation_last_outbound_message_action',
  'conversation_tags',
  'conversation_type',
  'conversation_unread_count',
  'conversation_is_last_message_internal_comment',
];

async function fetchGHLConversations() {
  const all = [];
  let startAfterDate = null;
  let page = 0;

  while (true) {
    let url = `/conversations/search?locationId=${GHL_LOCATION_ID}&limit=100`;
    if (startAfterDate) url += `&startAfterDate=${startAfterDate}`;

    const data = await ghlGet(url);
    const convs = data.conversations || [];
    if (convs.length === 0) break;

    all.push(...convs);
    page++;
    process.stdout.write(`\r  GHL Conversas: ${all.length} registros...`);

    if (convs.length < 100) break;
    const lastConv = convs[convs.length - 1];
    startAfterDate = lastConv.lastMessageDate || lastConv.updatedAt;
    if (!startAfterDate) break;
    await sleep(200);
  }
  console.log();
  return all;
}

async function syncConversations() {
  console.log('\n💬 Sincronizando GHL Conversas...');
  const convs = await fetchGHLConversations();

  const rows = convs.map(c => {
    const tags = Array.isArray(c.tags) ? JSON.stringify(c.tags) : (c.tags || '[]');
    return [
      c.id || '',
      c.contactId || '',
      c.contactName || c.fullName || '',
      c.companyName || '',
      c.email || '',
      c.phone || '',
      c.fullName || c.contactName || '',
      c.dateAdded || c.createdAt || '',
      c.dateUpdated || c.updatedAt || '',
      c.lastMessageDate || '',
      c.lastManualMessageDate || '',
      c.lastMessageBody || '',
      c.lastMessageDirection || '',
      c.lastMessageType || '',
      c.lastOutboundMessageAction || '',
      tags,
      c.type || '',
      c.unreadCount != null ? String(c.unreadCount) : '0',
      c.isLastMessageInternalComment ? 'True' : 'False',
    ];
  });

  await writeToSheet('Conversas', CONV_HEADERS, rows);
}

// ─── SyncHealth ────────────────────────────────────────────────────────────────
async function writeSyncHealth(results) {
  const sheets = getSheets();
  const now = new Date().toISOString();

  // Garante header na aba SyncHealth
  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'SyncHealth!A1:A1',
    });
    if (!existing.data.values) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'SyncHealth!A1',
        valueInputOption: 'RAW',
        requestBody: { values: [['timestamp','metaAdsOk','ghlOppsOk','ghlConvsOk','ghlTokenValid','oppsCount','convsCount','metaAdsRows','errors']] },
      });
    }
  } catch { /* ignora */ }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'SyncHealth!A:I',
    valueInputOption: 'RAW',
    requestBody: { values: [[
      now,
      String(results.metaOk),
      String(results.oppsOk),
      String(results.convsOk),
      'true',
      results.oppsCount,
      results.convsCount,
      results.metaRows,
      JSON.stringify(results.errors),
    ]] },
  });

  // Escreve timestamp na aba Meta para o SyncCountdown do frontend
  try {
    const sheets2 = getSheets();
    await sheets2.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'SyncHealth!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [[now]] },
    });
  } catch { /* ignora */ }
}

// ─── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔄 Dashboard Sync — Dr. Cleugo Porto`);
  console.log(`   Modo: ${FULL_MODE ? 'FULL (90 dias)' : 'incremental (7 dias)'}`);
  console.log(`   Início: ${new Date().toLocaleString('pt-BR')}\n`);

  const results = { metaOk: false, oppsOk: false, convsOk: false, oppsCount: 0, convsCount: 0, metaRows: 0, errors: [] };

  try { await syncMetaAds();    results.metaOk = true;  } catch (e) { console.error('❌ Meta Ads:', e.message); results.errors.push(`meta:${e.message}`); }
  try { await syncOpportunities(); results.oppsOk = true;  } catch (e) { console.error('❌ Opps:', e.message); results.errors.push(`opps:${e.message}`); }
  try { await syncConversations(); results.convsOk = true; } catch (e) { console.error('❌ Convs:', e.message); results.errors.push(`convs:${e.message}`); }

  try { await writeSyncHealth(results); } catch (e) { console.error('SyncHealth error:', e.message); }

  const status = results.metaOk && results.oppsOk && results.convsOk ? '✅ Sucesso' : '⚠️ Parcial';
  console.log(`\n${status} — ${new Date().toLocaleString('pt-BR')}`);
}

main().catch(err => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
