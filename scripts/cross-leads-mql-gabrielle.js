#!/usr/bin/env node
/**
 * Cross: Meta Leads (com adset_id) x GHL MQLs/Consultas — Dra. Gabrielle
 * 1. Puxa todos os leads do form Meta com campo adset_id
 * 2. Puxa MQLs e consultas do GHL com telefone/email
 * 3. Cruza por telefone normalizado
 * 4. Conta quantos MQLs e consultas vieram de cada adset
 */
const path  = require('path');
const https = require('https');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const META_TOKEN  = process.env.META_ACCESS_TOKEN;
const GHL_TOKEN   = process.env.GHL_GABRIELLE_TOKEN;
const GHL_LOC_ID  = process.env.GHL_GABRIELLE_LOCATION_ID;
const BASE_META   = 'https://graph.facebook.com/v21.0';

// Lead forms encontrados nos ads
const LEAD_FORM_IDS = ['2177995835940337'];

// Mapa adset_id → nome legível
const ADSET_NAMES = {
  '120243183218800249': 'P5 [M][30-55] Caieiras+Franco+Perus+Jundiaí+Cajamar',
  '120244210967340249': 'P9 [M][30-45] Caieiras+Franco+Perus',
  '120245733793050249': 'P10 LLK1% Engaja/DM/Save',
  '120245734861820249': 'P1 Retargeting Engaj. Amplo',
  '120245734879710249': 'P2 Retargeting Engaj. Profundo',
  '120246321649670249': 'P11 LLK1% MQL',
  '120246322261580249': 'P12 LLK1% Conectados/Oportunidade',
  '120243243508230249': 'P6 [M][30-55] Grande SP Nobres',
  '120243494919000249': 'P7 [M][30-55] Caieiras POS+ON',
  '120243496327780249': 'P8 [M][28-40] Ricos/Fit',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizePhone(p) {
  if (!p) return '';
  const d = p.replace(/\D/g, '');
  if (d.length === 13 && d.startsWith('55')) return d;
  if (d.length === 11) return '55' + d;
  if (d.length === 10) return '55' + d;
  return d;
}

// Fetch Meta leads com adset_id (paginado)
async function getMetaLeads(formId) {
  const leads = [];
  let url = `${BASE_META}/${formId}/leads?fields=id,created_time,ad_id,adset_id,campaign_id,field_data&limit=100&access_token=${META_TOKEN}`;

  process.stderr.write(`[Meta] Form ${formId} — buscando leads...\n`);
  let page = 1;
  while (url) {
    const r = await fetch(url);
    const j = await r.json();
    if (j.error) {
      process.stderr.write(`  Erro: ${JSON.stringify(j.error)}\n`);
      break;
    }
    const batch = j.data || [];
    leads.push(...batch);
    process.stderr.write(`  Página ${page}: ${batch.length} leads (total: ${leads.length})\n`);
    url = j.paging?.next || null;
    page++;
    await sleep(300);
  }
  return leads;
}

// GHL: busca por tag via GET
function ghlGet(path_) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: path_,
      method: 'GET',
      headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-07-28' },
    };
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(new Error(d.substring(0,200))); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function getGhlContactsByTag(tag) {
  const all = [];
  let cursor = null;
  let page = 1;
  while (true) {
    const qs = new URLSearchParams({ locationId: GHL_LOC_ID, limit: '100', tag });
    if (cursor) qs.set('startAfter', cursor);
    const res = await ghlGet(`/contacts/?${qs}`);
    if (res.statusCode >= 400) { process.stderr.write(`  GHL erro: ${JSON.stringify(res)}\n`); break; }
    const batch = res.contacts || [];
    all.push(...batch);
    process.stderr.write(`  [GHL] tag="${tag}" página ${page}: ${batch.length} contatos\n`);
    if (batch.length < 100) break;
    cursor = res.meta?.startAfterDate || res.meta?.nextCursor || null;
    if (!cursor) break;
    page++;
    await sleep(300);
  }
  return all;
}

async function getGhlOpportunitiesByStage(stageId, pipelineId) {
  const all = [];
  let page = 1;
  while (true) {
    const qs = new URLSearchParams({ location_id: GHL_LOC_ID, pipeline_id: pipelineId, pipeline_stage_id: stageId, limit: '100', page: String(page) });
    const res = await ghlGet(`/opportunities/search?${qs}`);
    if (res.statusCode >= 400) { process.stderr.write(`  GHL opps erro: ${JSON.stringify(res)}\n`); break; }
    const batch = res.opportunities || [];
    all.push(...batch);
    process.stderr.write(`  [GHL] stage="${stageId}" página ${page}: ${batch.length} oportunidades\n`);
    if (batch.length < 100) break;
    page++;
    await sleep(300);
  }
  return all;
}

async function getGhlContact(id) {
  const res = await ghlGet(`/contacts/${id}`);
  return res.contact || res;
}

function extractPhone(contact) {
  return normalizePhone(contact.phone || '');
}

function extractEmail(contact) {
  return (contact.email || '').toLowerCase().trim();
}

function extractMetaPhone(fieldData) {
  const f = (fieldData || []).find(x => x.name === 'phone_number' || x.name === 'phone');
  return normalizePhone(f?.values?.[0] || '');
}

function extractMetaEmail(fieldData) {
  const f = (fieldData || []).find(x => x.name === 'email');
  return (f?.values?.[0] || '').toLowerCase().trim();
}

async function main() {
  // 1. Meta leads
  process.stderr.write('\n=== [1] Buscando leads Meta ===\n');
  let metaLeads = [];
  for (const formId of LEAD_FORM_IDS) {
    const leads = await getMetaLeads(formId);
    metaLeads.push(...leads);
  }
  process.stderr.write(`Total leads Meta: ${metaLeads.length}\n`);

  // Verificar outros lead forms nos outros adsets
  // Checar ad do P9 e P10
  const checkAds = ['120244210967350249', '120245733793110249', '120245734861780249'];
  const extraFormIds = new Set(LEAD_FORM_IDS);
  for (const adId of checkAds) {
    await sleep(300);
    const r = await fetch(`${BASE_META}/${adId}?fields=creative{object_story_spec}&access_token=${META_TOKEN}`);
    const j = await r.json();
    const spec = j.creative?.object_story_spec;
    const formId = spec?.video_data?.call_to_action?.value?.lead_gen_form_id
                || spec?.link_data?.call_to_action?.value?.lead_gen_form_id;
    if (formId && !extraFormIds.has(formId)) {
      process.stderr.write(`Novo form encontrado (ad ${adId}): ${formId}\n`);
      extraFormIds.add(formId);
      const moreLeads = await getMetaLeads(formId);
      metaLeads.push(...moreLeads);
    }
  }
  process.stderr.write(`Total leads Meta após verificar outros forms: ${metaLeads.length}\n`);

  // Indexar leads Meta por telefone e email
  const metaByPhone = {};
  const metaByEmail = {};
  for (const lead of metaLeads) {
    const phone = extractMetaPhone(lead.field_data);
    const email = extractMetaEmail(lead.field_data);
    if (phone) {
      if (!metaByPhone[phone]) metaByPhone[phone] = [];
      metaByPhone[phone].push(lead);
    }
    if (email) {
      if (!metaByEmail[email]) metaByEmail[email] = [];
      metaByEmail[email].push(lead);
    }
  }

  // 2. GHL — MQLs por tag
  process.stderr.write('\n=== [2] Buscando MQLs GHL ===\n');
  const mqlContacts = await getGhlContactsByTag('mql');

  // 3. GHL — Consultas agendadas
  process.stderr.write('\n=== [3] Buscando Consultas Agendadas GHL ===\n');
  const consultaOpps = await getGhlOpportunitiesByStage('9ef956f9-be4c-4ec1-8075-23fa02b18e71', 'IqBgqQLwrueiZlsV4yzI');
  const ganhoOpps    = await getGhlOpportunitiesByStage('b3a893cd-02fe-45a8-8e50-2ac7070607f5', 'IqBgqQLwrueiZlsV4yzI');

  // Buscar contatos das oportunidades
  const consultaContacts = [];
  for (const opp of consultaOpps) {
    const cid = opp.contactId || opp.contact?.id;
    if (cid) { consultaContacts.push(await getGhlContact(cid)); await sleep(150); }
  }
  const ganhoContacts = [];
  for (const opp of ganhoOpps) {
    const cid = opp.contactId || opp.contact?.id;
    if (cid) { ganhoContacts.push(await getGhlContact(cid)); await sleep(150); }
  }

  // 4. Cruzamento
  process.stderr.write('\n=== [4] Cruzando ===\n');

  function matchAdset(ghlContact) {
    const phone = extractPhone(ghlContact);
    const email = extractEmail(ghlContact);
    let matched = null;
    if (phone && metaByPhone[phone]?.length) matched = metaByPhone[phone][0];
    if (!matched && email && metaByEmail[email]?.length) matched = metaByEmail[email][0];
    return matched;
  }

  const mqlByAdset       = {};
  const consultaByAdset  = {};
  const ganhoByAdset     = {};
  let mqlMatched = 0, consultaMatched = 0, ganhoMatched = 0;

  for (const c of mqlContacts) {
    const lead = matchAdset(c);
    const key = lead?.adset_id ? (ADSET_NAMES[lead.adset_id] || lead.adset_id) : 'Não identificado';
    mqlByAdset[key] = (mqlByAdset[key] || 0) + 1;
    if (lead) mqlMatched++;
  }
  for (const c of consultaContacts) {
    const lead = matchAdset(c);
    const key = lead?.adset_id ? (ADSET_NAMES[lead.adset_id] || lead.adset_id) : 'Não identificado';
    consultaByAdset[key] = (consultaByAdset[key] || 0) + 1;
    if (lead) consultaMatched++;
  }
  for (const c of ganhoContacts) {
    const lead = matchAdset(c);
    const key = lead?.adset_id ? (ADSET_NAMES[lead.adset_id] || lead.adset_id) : 'Não identificado';
    ganhoByAdset[key] = (ganhoByAdset[key] || 0) + 1;
    if (lead) ganhoMatched++;
  }

  const result = {
    metaLeadsTotal: metaLeads.length,
    mql: { total: mqlContacts.length, matched: mqlMatched, byAdset: Object.entries(mqlByAdset).sort((a,b)=>b[1]-a[1]) },
    consultas: { total: consultaContacts.length, matched: consultaMatched, byAdset: Object.entries(consultaByAdset).sort((a,b)=>b[1]-a[1]) },
    ganhos: { total: ganhoContacts.length, matched: ganhoMatched, byAdset: Object.entries(ganhoByAdset).sort((a,b)=>b[1]-a[1]) },
  };

  console.log(JSON.stringify(result, null, 2));
  process.stderr.write('\nDone.\n');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
