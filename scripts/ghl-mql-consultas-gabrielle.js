#!/usr/bin/env node
/**
 * GHL — MQL + Consultas Agendadas — Dra. Gabrielle
 * Usa GET /contacts/?tag=mql para MQLs
 * Usa GET /opportunities/?pipelineStageId=... para consultas agendadas
 * Extrai UTMs para cruzar com adsets do Meta
 */
const path  = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN  = process.env.GHL_GABRIELLE_TOKEN;
const LOC_ID = process.env.GHL_GABRIELLE_LOCATION_ID;

const PIPELINE_ID            = 'IqBgqQLwrueiZlsV4yzI';
const STAGE_CONSULTA_ID      = '9ef956f9-be4c-4ec1-8075-23fa02b18e71';
const STAGE_GANHO_ID         = 'b3a893cd-02fe-45a8-8e50-2ac7070607f5';
const STAGE_OPORTUNIDADE_ID  = '9894212a-32c9-4126-acbc-b917cfd84d1a';

function ghlGet(path_) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: path_,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse: ${data.substring(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Busca contatos por tag usando GET
async function getContactsByTag(tag) {
  const all = [];
  let cursor = null;
  let page = 1;

  while (true) {
    process.stderr.write(`  Página ${page} (tag: ${tag})...\n`);
    const qs = new URLSearchParams({ locationId: LOC_ID, limit: '100', tag });
    if (cursor) qs.set('startAfter', cursor);

    const res = await ghlGet(`/contacts/?${qs}`);

    if (res.statusCode >= 400 || res.error) {
      process.stderr.write(`  Erro: ${JSON.stringify(res)}\n`);
      break;
    }

    const batch = res.contacts || [];
    all.push(...batch);

    if (batch.length < 100) break;
    cursor = res.meta?.startAfterDate || res.meta?.nextCursor || null;
    if (!cursor) break;
    page++;
    await sleep(300);
  }

  return all;
}

// Busca oportunidades por stage
async function getOpportunitiesByStage(stageId) {
  const all = [];
  let page = 1;

  while (true) {
    process.stderr.write(`  Página ${page} (stage: ${stageId})...\n`);
    const qs = new URLSearchParams({
      location_id: LOC_ID,
      pipeline_id: PIPELINE_ID,
      pipeline_stage_id: stageId,
      limit: '100',
      page: String(page),
    });

    const res = await ghlGet(`/opportunities/search?${qs}`);

    if (res.statusCode >= 400 || res.error) {
      process.stderr.write(`  Erro oportunidades: ${JSON.stringify(res)}\n`);
      break;
    }

    const batch = res.opportunities || [];
    all.push(...batch);
    process.stderr.write(`    → ${batch.length} oportunidades (total: ${all.length})\n`);

    if (batch.length < 100) break;
    page++;
    await sleep(300);
  }

  return all;
}

// Busca contato completo (com customFields/UTMs)
async function getContact(contactId) {
  const res = await ghlGet(`/contacts/${contactId}`);
  return res.contact || res;
}

function extractUtm(contact) {
  const cf = contact.customFields || [];

  const findCf = (...keys) => {
    for (const key of keys) {
      const f = cf.find(x =>
        (x.key || '').toLowerCase().includes(key.toLowerCase()) ||
        (x.fieldKey || '').toLowerCase().includes(key.toLowerCase()) ||
        (x.name || '').toLowerCase().includes(key.toLowerCase())
      );
      if (f?.value) return String(f.value).trim();
      if (contact[key]) return String(contact[key]).trim();
    }
    return '';
  };

  return {
    utm_source:   findCf('utm_source', 'utmsource', 'source'),
    utm_medium:   findCf('utm_medium', 'utmmedium', 'medium'),
    utm_campaign: findCf('utm_campaign', 'utmcampaign', 'campaign'),
    utm_content:  findCf('utm_content', 'utmcontent', 'content', 'adset'),
    utm_term:     findCf('utm_term', 'utmterm', 'term', 'ad_id', 'adid'),
    adset_id:     findCf('adset_id', 'adsetid', 'ad_set_id'),
    ad_id:        findCf('ad_id', 'adid'),
  };
}

function tally(contacts, label) {
  const bySource   = {};
  const byCampaign = {};
  const byContent  = {};
  const withUtm    = contacts.filter(c => {
    const u = extractUtm(c);
    return u.utm_source || u.utm_campaign || u.utm_content || u.adset_id;
  });

  for (const c of contacts) {
    const u = extractUtm(c);
    const src  = u.utm_source  || u.utm_medium  || 'sem_utm';
    const camp = u.utm_campaign || 'sem_campaign';
    const cont = u.utm_content  || u.adset_id   || 'sem_content';

    bySource[src]   = (bySource[src]   || 0) + 1;
    byCampaign[camp] = (byCampaign[camp] || 0) + 1;
    byContent[cont]  = (byContent[cont]  || 0) + 1;
  }

  return {
    label,
    total: contacts.length,
    withUtm: withUtm.length,
    bySource:   Object.entries(bySource).sort((a,b)=>b[1]-a[1]),
    byCampaign: Object.entries(byCampaign).sort((a,b)=>b[1]-a[1]),
    byContent:  Object.entries(byContent).sort((a,b)=>b[1]-a[1]),
    sampleContacts: contacts.slice(0, 3).map(c => ({
      name: `${c.firstName||''} ${c.lastName||''}`.trim(),
      utm: extractUtm(c),
      customFieldsRaw: (c.customFields||[]).slice(0,10).map(f => ({ key: f.key||f.fieldKey||f.id, value: f.value })),
    })),
  };
}

async function main() {
  process.stderr.write(`\n📊 GHL Gabrielle — MQL + Consultas Agendadas\n`);

  // 1. MQLs via tag
  process.stderr.write('\n[1] Buscando MQLs (tag "mql")...\n');
  const mqlContacts = await getContactsByTag('mql');
  process.stderr.write(`Total MQLs: ${mqlContacts.length}\n`);

  // 2. Consultas agendadas via pipeline stage
  process.stderr.write('\n[2] Buscando oportunidades — Consulta Agendada...\n');
  const consultaOpps = await getOpportunitiesByStage(STAGE_CONSULTA_ID);
  process.stderr.write(`Total Consultas Agendadas: ${consultaOpps.length}\n`);

  // 3. Ganhos via pipeline
  process.stderr.write('\n[3] Buscando oportunidades — Ganho...\n');
  const ganhoOpps = await getOpportunitiesByStage(STAGE_GANHO_ID);
  process.stderr.write(`Total Ganhos: ${ganhoOpps.length}\n`);

  // 4. Buscar contatos das oportunidades para pegar UTMs
  process.stderr.write('\n[4] Buscando contatos das consultas agendadas para UTMs...\n');
  const consultaContacts = [];
  for (const opp of consultaOpps.slice(0, 50)) {
    if (opp.contactId || opp.contact?.id) {
      const cid = opp.contactId || opp.contact?.id;
      const c = await getContact(cid);
      consultaContacts.push(c);
      await sleep(150);
    }
  }

  // 5. Buscar contatos dos ganhos
  process.stderr.write('\n[5] Buscando contatos dos ganhos para UTMs...\n');
  const ganhoContacts = [];
  for (const opp of ganhoOpps.slice(0, 30)) {
    if (opp.contactId || opp.contact?.id) {
      const cid = opp.contactId || opp.contact?.id;
      const c = await getContact(cid);
      ganhoContacts.push(c);
      await sleep(150);
    }
  }

  const result = {
    mql:      tally(mqlContacts,      'MQL (tag)'),
    consultas: tally(consultaContacts, 'Consultas Agendadas (pipeline stage)'),
    ganhos:    tally(ganhoContacts,    'Ganhos (pipeline stage)'),
    rawOppsConsulta: consultaOpps.slice(0, 5).map(o => ({
      name: o.name || o.contact?.name,
      contactId: o.contactId || o.contact?.id,
      createdAt: o.createdAt,
    })),
  };

  console.log(JSON.stringify(result, null, 2));
  process.stderr.write('\nDone.\n');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
