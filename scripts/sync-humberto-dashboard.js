#!/usr/bin/env node
/**
 * Sync de dados — Dashboard Dr. Humberto Andrade
 * Puxa Meta Ads + GHL Oportunidades + GHL Conversas → Google Sheet
 *
 * Uso: node sync-humberto-dashboard.js [--full]
 *   --full : reescreve últimos 90 dias (padrão: últimos 30 dias)
 */

const path  = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { google } = require('googleapis');

// ─── Config ────────────────────────────────────────────────────────────────────
const SPREADSHEET_ID  = '1AsrleT9tPS8vO5TMcZtcYyV5Ol1GAbpgH8B2rdqalco';
const META_ACCOUNT_ID = 'act_445142030338909';
const GHL_TOKEN       = process.env.GHL_HUMBERTO_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_HUMBERTO_LOCATION_ID;
const GHL_PIPELINE_ID = 'Z0BXCFpuHdqcc6SRCTVr'; // PROCEDIMENTO
const META_TOKEN      = process.env.META_ACCESS_TOKEN;

const FULL_MODE = process.argv.includes('--full');
const DAYS_BACK = FULL_MODE ? 90 : 30;

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
  console.log(`\n📊 Sincronizando Meta Ads (${DAYS_BACK} dias)...`);
  const endDate   = dateStr(0);
  const startDate = dateStr(DAYS_BACK);
  const items     = await fetchMetaAds(startDate, endDate);

  const rows = items.map(item => [
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
  ]);

  await writeToSheet('Meta', META_HEADERS, rows);
}

// ─── GHL Oportunidades Sync ────────────────────────────────────────────────────
const OPP_HEADERS = [
  'opportunity_assigned_to', 'opportunity_contact_email', 'opportunity_contact_id',
  'opportunity_contact_name', 'opportunity_contact_phone', 'opportunity_contact_tags',
  'opportunity_created_at', 'opportunity_id', 'opportunity_last_stage_change_at',
  'opportunity_last_status_change_at', 'opportunity_lost_reason_id',
  'opportunity_monetary_value', 'opportunity_name', 'opportunity_pipeline_stage_id',
  'opportunity_source', 'opportunity_status', 'opportunity_updated_at',
  'opportunity_utm_campaign', 'opportunity_utm_medium', 'opportunity_utm_content',
];

async function fetchGHLOpportunities() {
  const all = [];
  let startAfterId   = null;
  let startAfterDate = null;

  while (true) {
    let url = `/opportunities/search?location_id=${GHL_LOCATION_ID}&pipeline_id=${GHL_PIPELINE_ID}&limit=100`;
    if (startAfterId) url += `&startAfterId=${startAfterId}&startAfter=${startAfterDate}`;

    const data = await ghlGet(url);
    const opps = data.opportunities || [];
    if (opps.length === 0) break;

    all.push(...opps);
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

// Retorna Set de contactIds dos leads de campanha (source facebook)
async function syncOpportunities() {
  console.log('\n📋 Sincronizando GHL Oportunidades...');
  const opps = await fetchGHLOpportunities();
  const facebookContactIds = new Set();

  const rows = opps.map(o => {
    const contact = o.contact || {};
    const tags = contact.tags ? JSON.stringify(contact.tags) : '[]';
    const attributions = o.attributions || [];
    const firstTouch = attributions.find(a => a.isFirst) || attributions[0] || {};

    // Rastrear contactIds de leads de campanha (facebook)
    const src = (o.source || '').toLowerCase();
    if (src === 'facebook' && contact.id) facebookContactIds.add(contact.id);

    return [
      o.assignedTo || '',
      contact.email || '',
      contact.id || '',
      contact.name || '',
      contact.phone || '',
      tags,
      o.createdAt || '',
      o.id || '',
      o.lastStageChangeAt || '',
      o.lastStatusChangeAt || '',
      o.lostReasonId || '',
      o.monetaryValue || '0',
      o.name || '',
      o.pipelineStageId || '',
      o.source || '',
      o.status || 'open',
      o.updatedAt || '',
      firstTouch.utmCampaign || '',
      firstTouch.utmMedium   || '',
      firstTouch.utmContent  || '',
    ];
  });

  await writeToSheet('oportunidades', OPP_HEADERS, rows);
  return facebookContactIds;
}

// ─── GHL Conversas Sync ────────────────────────────────────────────────────────
const CONV_HEADERS = [
  'conversation_id', 'conversation_contact_id', 'conversation_contact_name',
  'conversation_company_name', 'conversation_email', 'conversation_phone',
  'conversation_full_name', 'conversation_date_added', 'conversation_date_updated',
  'conversation_last_message_date', 'conversation_last_manual_message_date',
  'conversation_last_message_body', 'conversation_last_message_direction',
  'conversation_last_message_type', 'conversation_last_outbound_message_action',
  'conversation_tags', 'conversation_type', 'conversation_unread_count',
  'conversation_is_last_message_internal_comment',
  'conversation_first_outbound_date',
  'conversation_first_outbound_user_id',
];

// Busca a data E o userId da PRIMEIRA mensagem outbound real da vendedora na conversa.
// A API retorna mensagens do mais novo para o mais antigo (lastMessageId para paginar).
// Paginamos até o fim para chegar nas mensagens mais antigas — o último outbound
// encontrado = o mais antigo = primeira resposta real da vendedora.
async function fetchFirstOutbound(conversationId) {
  const outbounds = []; // { dateAdded, userId }
  let lastMessageId = null;
  const MAX_PAGES = 5; // máx 500 mensagens

  for (let page = 0; page < MAX_PAGES; page++) {
    let url = `/conversations/${conversationId}/messages?limit=100`;
    if (lastMessageId) url += `&lastMessageId=${lastMessageId}`;

    let data;
    try { data = await ghlGet(url); } catch { break; }

    const msgs = data.messages?.messages || [];
    if (msgs.length === 0) break;

    for (const msg of msgs) {
      // Excluir activities (type 28), chamadas e mensagens de sistema sem userId humano
      if (
        msg.direction === 'outbound' &&
        msg.messageType &&
        !msg.messageType.startsWith('TYPE_ACTIVITY') &&
        msg.messageType !== 'TYPE_CALL'
      ) {
        outbounds.push({ dateAdded: msg.dateAdded, userId: msg.userId || '' });
      }
    }

    if (!data.messages?.nextPage) break;
    lastMessageId = data.messages?.lastMessageId;
    await sleep(150);
  }

  // Percorremos do mais novo ao mais antigo — o último = mais antigo = primeira resposta
  if (outbounds.length === 0) return { date: '', userId: '' };
  const first = outbounds[outbounds.length - 1];
  return { date: first.dateAdded, userId: first.userId };
}

async function fetchGHLConversations() {
  const all = [];
  let startAfterDate = null;

  while (true) {
    let url = `/conversations/search?locationId=${GHL_LOCATION_ID}&limit=100`;
    if (startAfterDate) url += `&startAfterDate=${startAfterDate}`;

    const data = await ghlGet(url);
    const convs = data.conversations || [];
    if (convs.length === 0) break;

    all.push(...convs);
    process.stdout.write(`\r  GHL Conversas: ${all.length} registros...`);

    if (convs.length < 100) break;
    const last = convs[convs.length - 1];
    startAfterDate = last.lastMessageDate || last.updatedAt;
    if (!startAfterDate) break;
    await sleep(200);
  }
  console.log();
  return all;
}

// facebookContactIds: Set com contactIds dos leads de campanha (source=facebook)
async function syncConversations(facebookContactIds) {
  console.log('\n💬 Sincronizando GHL Conversas...');
  const convs = await fetchGHLConversations();

  // Busca firstOutbound somente para conversas de leads de campanha
  const firstOutboundMap = new Map(); // contactId → { date, userId }
  const campaignConvs = convs.filter(c => facebookContactIds.has(c.contactId));
  console.log(`\n  Buscando primeira resposta para ${campaignConvs.length} conversas de campanha...`);

  for (let i = 0; i < campaignConvs.length; i++) {
    const c = campaignConvs[i];
    const result = await fetchFirstOutbound(c.id);
    if (result.date) firstOutboundMap.set(c.contactId, result);
    if ((i + 1) % 50 === 0) process.stdout.write(`\r  Mensagens: ${i + 1}/${campaignConvs.length}...`);
  }
  console.log(`\r  Mensagens: ${campaignConvs.length}/${campaignConvs.length} concluido`);

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
      firstOutboundMap.get(c.contactId)?.date   || '',
      firstOutboundMap.get(c.contactId)?.userId || '',
    ];
  });

  await writeToSheet('conversas', CONV_HEADERS, rows);
}

// ─── Sync time na aba Meta ─────────────────────────────────────────────────────
async function writeSyncTime() {
  try {
    const sheets = getSheets();
    const now = new Date().toISOString();
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Meta!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [[now]] },
    });
  } catch { /* ignora */ }
}

// ─── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔄 Dashboard Sync — Dr. Humberto Andrade`);
  console.log(`   Modo: ${FULL_MODE ? 'FULL (90 dias)' : 'incremental (30 dias)'}`);
  console.log(`   Inicio: ${new Date().toLocaleString('pt-BR')}\n`);

  const errors = [];

  let facebookContactIds = new Set();
  try { await syncMetaAds();                                           } catch (e) { console.error('Meta Ads:', e.message); errors.push(`meta:${e.message}`); }
  try { facebookContactIds = await syncOpportunities();                } catch (e) { console.error('Opps:', e.message);     errors.push(`opps:${e.message}`); }
  try { await syncConversations(facebookContactIds);                   } catch (e) { console.error('Convs:', e.message);    errors.push(`convs:${e.message}`); }
  try { await writeSyncTime();     } catch { /* ignora */ }

  const status = errors.length === 0 ? '✅ Sucesso' : `⚠️ Parcial (${errors.length} erro(s))`;
  console.log(`\n${status} — ${new Date().toLocaleString('pt-BR')}`);
  if (errors.length > 0) errors.forEach(e => console.error('  -', e));
}

main().catch(err => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
