#!/usr/bin/env node
/**
 * Auditoria de dados — Dashboard Dr. Cleugo Porto
 * Compara dados direto das APIs (GHL + Meta) com o que está na planilha (o que o dashboard lê)
 */

const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { google } = require('googleapis');

const SPREADSHEET_ID  = '1wQI46mhN1kkUuGQDH7XbdF9dEksJSUZ9XbYQeZ5CrAc';
const META_ACCOUNT_ID = 'act_944253477334195';
const GHL_TOKEN       = 'pit-2a4bc66c-28e9-4ba3-82d4-6c39d5bd2d17';
const GHL_LOCATION_ID = '5pupAX6pAY1tiF01b2qo';
const GHL_PIPELINE_ID = 'bVIJAui4cKYng4CKluh6';
const META_TOKEN      = process.env.META_ACCESS_TOKEN;

const STAGE_NAMES = {
  '97886e90-8162-4b84-b555-067be6b5e4ec': 'Entrada do lead',
  'cd736509-4fc3-4095-b4c2-fba9cf2d51ff': 'Primeiro contato',
  '3bfa6592-6e00-443b-a5d5-2baa1a2d2ca7': 'Lead conectado',
  '4c0adf55-3236-4c22-818f-d3530e91c443': 'Oportunidade',
  '9932a1a2-557e-46ed-9b76-050e54be71ec': 'Consulta agendada',
  'db9ddf1d-6d9d-484c-9357-336939d32e13': 'Consulta realizada',
  '7f909ea2-c466-4836-b219-3bdbd2366b2c': 'Ganhos',
  'eedc4b3d-0fde-4e24-b7e0-260917791e37': 'Perdas',
};

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

function getSheets() {
  const CLIENT_ID     = process.env.GOOGLE_DRIVE_CLIENT_ID     || process.env.GOOGLE_ADS_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.GOOGLE_DOCS_REFRESH_TOKEN;
  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  auth.setCredentials({ refresh_token: REFRESH_TOKEN });
  return google.sheets({ version: 'v4', auth });
}

// ─── Lê aba da planilha ────────────────────────────────────────────────────────
async function readSheet(range) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  const rows = res.data.values || [];
  const headers = rows[0] || [];
  const data = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
  return { headers, data };
}

// ─── GHL: todas as oportunidades ──────────────────────────────────────────────
async function fetchAllGHLOpps() {
  const all = [];
  let startAfterId = null, startAfterDate = null;
  while (true) {
    let url = `/opportunities/search?location_id=${GHL_LOCATION_ID}&pipeline_id=${GHL_PIPELINE_ID}&limit=100`;
    if (startAfterId) url += `&startAfterId=${startAfterId}&startAfter=${startAfterDate}`;
    const data = await ghlGet(url);
    const opps = data.opportunities || [];
    if (opps.length === 0) break;
    all.push(...opps);
    const meta = data.meta || {};
    if (opps.length < 100 || !meta.startAfter) break;
    startAfterDate = meta.startAfter;
    startAfterId   = meta.startAfterId;
    await sleep(200);
  }
  return all;
}

// ─── GHL: todas as conversas ──────────────────────────────────────────────────
async function fetchAllGHLConvs() {
  const all = [];
  let startAfterDate = null;
  while (true) {
    let url = `/conversations/search?locationId=${GHL_LOCATION_ID}&limit=100`;
    if (startAfterDate) url += `&startAfterDate=${startAfterDate}`;
    const data = await ghlGet(url);
    const convs = data.conversations || [];
    if (convs.length === 0) break;
    all.push(...convs);
    if (convs.length < 100) break;
    startAfterDate = convs[convs.length - 1].lastMessageDate || convs[convs.length - 1].updatedAt;
    if (!startAfterDate) break;
    await sleep(200);
  }
  return all;
}

// ─── Meta Ads: últimos 30 dias ─────────────────────────────────────────────────
async function fetchMetaStats() {
  const start = dateStr(30);
  const end = dateStr(0);
  const fields = 'spend,impressions,clicks,reach,actions,cost_per_action_type,ctr,cpc,cpm,frequency';
  const url = `/v21.0/${META_ACCOUNT_ID}/insights?fields=${encodeURIComponent(fields)}&level=account&time_range=%7B%22since%22%3A%22${start}%22%2C%22until%22%3A%22${end}%22%7D&access_token=${META_TOKEN}`;
  const data = await httpsGet('graph.facebook.com', url, {});
  if (data.error) throw new Error(data.error.message);
  return data.data?.[0] || {};
}

async function fetchMetaAdCount() {
  const start = dateStr(30);
  const end = dateStr(0);
  const fields = 'spend,impressions,clicks,actions,ad_id';
  const url = `/v21.0/${META_ACCOUNT_ID}/insights?fields=${encodeURIComponent(fields)}&level=ad&time_range=%7B%22since%22%3A%22${start}%22%2C%22until%22%3A%22${end}%22%7D&limit=500&access_token=${META_TOKEN}`;
  const data = await httpsGet('graph.facebook.com', url, {});
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getAction(actions, type) {
  if (!actions) return 0;
  const a = actions.find(x => x.action_type === type);
  return a ? parseFloat(a.value) : 0;
}

function ok(condition) { return condition ? '✅' : '❌'; }
function diff(a, b) {
  if (a === b) return '(igual)';
  return `(diff: ${a > b ? '+' : ''}${a - b})`;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔍 AUDITORIA — Dashboard Dr. Cleugo Porto');
  console.log(`   Data: ${new Date().toLocaleString('pt-BR')}\n`);
  console.log('═'.repeat(65));

  // ── 1. GHL Oportunidades ──────────────────────────────────────────
  process.stdout.write('\n📋 Buscando GHL Oportunidades (API)...');
  const ghlOpps = await fetchAllGHLOpps();
  console.log(` ${ghlOpps.length} encontradas`);

  process.stdout.write('📋 Lendo planilha (Oportunidades)...');
  const { data: sheetOpps } = await readSheet('Oportunidades');
  console.log(` ${sheetOpps.length} linhas`);

  // Contagens API
  const apiOppTotal = ghlOpps.length;
  const apiOppOpen  = ghlOpps.filter(o => o.status === 'open').length;
  const apiOppWon   = ghlOpps.filter(o => o.status === 'won').length;
  const apiOppLost  = ghlOpps.filter(o => o.status === 'lost').length;

  // Contagens por stage (API)
  const apiByStage = {};
  ghlOpps.forEach(o => {
    const name = STAGE_NAMES[o.pipelineStageId] || o.pipelineStageId;
    apiByStage[name] = (apiByStage[name] || 0) + 1;
  });

  // Contagens planilha
  const sheetOppTotal = sheetOpps.length;
  const sheetOppOpen  = sheetOpps.filter(o => o.opportunity_status === 'open').length;
  const sheetOppWon   = sheetOpps.filter(o => o.opportunity_status === 'won').length;
  const sheetOppLost  = sheetOpps.filter(o => o.opportunity_status === 'lost').length;

  const sheetByStage = {};
  sheetOpps.forEach(o => {
    const name = STAGE_NAMES[o.opportunity_pipeline_stage_id] || o.opportunity_pipeline_stage_id || 'Sem stage';
    sheetByStage[name] = (sheetByStage[name] || 0) + 1;
  });

  console.log('\n┌─ OPORTUNIDADES ─────────────────────────────────────────────┐');
  console.log(`│  Total     API=${apiOppTotal}  Sheet=${sheetOppTotal}  ${ok(apiOppTotal === sheetOppTotal)} ${diff(sheetOppTotal, apiOppTotal)}`);
  console.log(`│  Abertas   API=${apiOppOpen}   Sheet=${sheetOppOpen}   ${ok(apiOppOpen === sheetOppOpen)} ${diff(sheetOppOpen, apiOppOpen)}`);
  console.log(`│  Ganhas    API=${apiOppWon}    Sheet=${sheetOppWon}    ${ok(apiOppWon === sheetOppWon)} ${diff(sheetOppWon, apiOppWon)}`);
  console.log(`│  Perdidas  API=${apiOppLost}   Sheet=${sheetOppLost}   ${ok(apiOppLost === sheetOppLost)} ${diff(sheetOppLost, apiOppLost)}`);
  console.log('├─ Por Stage ─────────────────────────────────────────────────┤');
  const allStageNames = new Set([...Object.keys(apiByStage), ...Object.keys(sheetByStage)]);
  allStageNames.forEach(name => {
    const a = apiByStage[name] || 0;
    const s = sheetByStage[name] || 0;
    console.log(`│  ${(name + '            ').substring(0, 22)} API=${a}  Sheet=${s}  ${ok(a === s)}`);
  });
  console.log('└─────────────────────────────────────────────────────────────┘');

  // IDs na API mas não na planilha
  const sheetIds = new Set(sheetOpps.map(o => o.opportunity_id));
  const missingInSheet = ghlOpps.filter(o => !sheetIds.has(o.id));
  if (missingInSheet.length > 0) {
    console.log(`\n⚠️  ${missingInSheet.length} oportunidades na API mas NÃO na planilha:`);
    missingInSheet.slice(0, 5).forEach(o => {
      console.log(`   - ${o.id} | ${o.contact?.name || 'sem nome'} | ${o.status} | ${o.createdAt?.substring(0,10)}`);
    });
    if (missingInSheet.length > 5) console.log(`   ... e mais ${missingInSheet.length - 5}`);
  }

  // ── 2. GHL Conversas ─────────────────────────────────────────────
  process.stdout.write('\n💬 Buscando GHL Conversas (API)...');
  const ghlConvs = await fetchAllGHLConvs();
  console.log(` ${ghlConvs.length} encontradas`);

  process.stdout.write('💬 Lendo planilha (Conversas)...');
  const { data: sheetConvs } = await readSheet('Conversas');
  console.log(` ${sheetConvs.length} linhas`);

  console.log('\n┌─ CONVERSAS ─────────────────────────────────────────────────┐');
  console.log(`│  Total  API=${ghlConvs.length}  Sheet=${sheetConvs.length}  ${ok(ghlConvs.length === sheetConvs.length)} ${diff(sheetConvs.length, ghlConvs.length)}`);
  console.log('└─────────────────────────────────────────────────────────────┘');

  // ── 3. Meta Ads ──────────────────────────────────────────────────
  process.stdout.write('\n📊 Buscando Meta Ads (API — 30 dias)...');
  const metaStats = await fetchMetaStats();
  const metaAds   = await fetchMetaAdCount();
  console.log(` OK`);

  process.stdout.write('📊 Lendo planilha (Meta)...');
  const { data: sheetMeta } = await readSheet('Meta');
  console.log(` ${sheetMeta.length} linhas`);

  // Totais API
  const apiSpend       = parseFloat(metaStats.spend || '0');
  const apiImpressions = parseInt(metaStats.impressions || '0');
  const apiClicks      = parseInt(metaStats.clicks || '0');
  const apiLeads       = getAction(metaStats.actions, 'lead');
  const apiReach       = parseInt(metaStats.reach || '0');

  // Totais planilha (últimos 30 dias)
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const sheetMetaFiltered = sheetMeta.filter(r => {
    const d = new Date(r.date);
    return !isNaN(d.getTime()) && d >= cutoff;
  });

  const sheetSpend       = sheetMetaFiltered.reduce((s, r) => s + parseFloat(r.spend || '0'), 0);
  const sheetImpressions = sheetMetaFiltered.reduce((s, r) => s + parseInt(r.impressions || '0'), 0);
  const sheetClicks      = sheetMetaFiltered.reduce((s, r) => s + parseInt(r.link_clicks || '0'), 0);
  const sheetLeads       = sheetMetaFiltered.reduce((s, r) => s + parseInt(r.actions_lead || '0'), 0);

  // Meta Ads API: agregar por anúncio (todos os anúncios únicos com spend > 0)
  const apiActiveAds = metaAds.filter(a => parseFloat(a.spend || '0') > 0).length;
  const sheetUniqueAds = new Set(sheetMetaFiltered.filter(r => parseFloat(r.spend || '0') > 0).map(r => r.ad_id)).size;

  console.log('\n┌─ META ADS (últimos 30 dias) ───────────────────────────────┐');
  console.log(`│  Gasto        API=R$${apiSpend.toFixed(2)}  Sheet=R$${sheetSpend.toFixed(2)}`);
  console.log(`│               ${ok(Math.abs(apiSpend - sheetSpend) < 1)} ${diff(Math.round(sheetSpend), Math.round(apiSpend))}`);
  console.log(`│  Impressões   API=${apiImpressions.toLocaleString()}  Sheet=${sheetImpressions.toLocaleString()}`);
  console.log(`│               ${ok(Math.abs(apiImpressions - sheetImpressions) < 100)}`);
  console.log(`│  Cliques      API=${apiClicks.toLocaleString()}  Sheet=${sheetClicks.toLocaleString()}`);
  console.log(`│  Leads        API=${apiLeads}  Sheet=${sheetLeads}`);
  console.log(`│               ${ok(Math.abs(apiLeads - sheetLeads) < 2)}`);
  console.log(`│  Anúncios     API=${apiActiveAds} ativos  Sheet=${sheetUniqueAds} únicos`);
  console.log('└─────────────────────────────────────────────────────────────┘');

  // ── 4. Verificação de campos críticos ────────────────────────────
  console.log('\n┌─ CAMPOS CRÍTICOS NA PLANILHA ──────────────────────────────┐');

  // Oportunidades sem stage
  const oppsNoStage = sheetOpps.filter(o => !o.opportunity_pipeline_stage_id).length;
  console.log(`│  Opps sem stage ID:     ${oppsNoStage}  ${ok(oppsNoStage === 0)}`);

  // Oportunidades sem data de criação
  const oppsNoDate = sheetOpps.filter(o => !o.opportunity_created_at).length;
  console.log(`│  Opps sem createdAt:    ${oppsNoDate}  ${ok(oppsNoDate === 0)}`);

  // Oportunidades com valor monetário
  const oppsWithValue = sheetOpps.filter(o => parseFloat(o.opportunity_monetary_value || '0') > 0).length;
  console.log(`│  Opps com valor > 0:    ${oppsWithValue} de ${sheetOppTotal}`);

  // Meta: linhas com spend > 0
  const metaWithSpend = sheetMeta.filter(r => parseFloat(r.spend || '0') > 0).length;
  console.log(`│  Meta rows com spend:   ${metaWithSpend} de ${sheetMeta.length}`);

  // Meta: linhas com leads > 0
  const metaWithLeads = sheetMeta.filter(r => parseInt(r.actions_lead || '0') > 0).length;
  console.log(`│  Meta rows com leads:   ${metaWithLeads}`);

  // Colunas UTM preenchidas
  const oppsWithUtm = sheetOpps.filter(o => o.opportunity_utm_campaign).length;
  console.log(`│  Opps com UTM:          ${oppsWithUtm} de ${sheetOppTotal}`);

  console.log('└─────────────────────────────────────────────────────────────┘');

  // ── 5. Resumo Final ───────────────────────────────────────────────
  console.log('\n═'.repeat(65));
  console.log('📊 RESUMO EXECUTIVO\n');

  const oppMatch = apiOppTotal === sheetOppTotal;
  const convMatch = Math.abs(ghlConvs.length - sheetConvs.length) <= 2;
  const spendMatch = Math.abs(apiSpend - sheetSpend) < 5;
  const leadsMatch = Math.abs(apiLeads - sheetLeads) <= 2;

  console.log(`Oportunidades GHL:     ${oppMatch ? '✅ OK' : `❌ Divergência: API=${apiOppTotal} vs Sheet=${sheetOppTotal}`}`);
  console.log(`Conversas GHL:         ${convMatch ? '✅ OK' : `❌ Divergência: API=${ghlConvs.length} vs Sheet=${sheetConvs.length}`}`);
  console.log(`Gasto Meta Ads:        ${spendMatch ? '✅ OK' : `❌ Divergência: API=R$${apiSpend.toFixed(0)} vs Sheet=R$${sheetSpend.toFixed(0)}`}`);
  console.log(`Leads Meta Ads:        ${leadsMatch ? '✅ OK' : `❌ Divergência: API=${apiLeads} vs Sheet=${sheetLeads}`}`);

  if (oppsWithUtm === 0) {
    console.log(`\n⚠️  UTM: Nenhuma oportunidade tem UTM preenchido.`);
    console.log(`   O dashboard de atribuição não vai funcionar sem isso.`);
    console.log(`   Precisa configurar os custom fields de UTM no GHL e no syncer.`);
  }

  if (oppsWithValue === 0) {
    console.log(`\n⚠️  Valor monetário: Nenhuma oportunidade tem valor > 0.`);
    console.log(`   ROAS e faturamento vão aparecer como R$0 no dashboard.`);
  } else {
    const totalValue = sheetOpps.reduce((s, o) => s + parseFloat(o.opportunity_monetary_value || '0'), 0);
    const wonValue = sheetOpps.filter(o => o.opportunity_status === 'won').reduce((s, o) => s + parseFloat(o.opportunity_monetary_value || '0'), 0);
    console.log(`\n💰 Valor total em pipeline: R$${totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 0})}`);
    console.log(`💰 Valor ganho (won):       R$${wonValue.toLocaleString('pt-BR', {minimumFractionDigits: 0})}`);
  }

  console.log('\n═'.repeat(65));
}

main().catch(err => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
