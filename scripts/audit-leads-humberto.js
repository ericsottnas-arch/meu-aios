#!/usr/bin/env node
/**
 * Auditoria: Leads Meta vs GHL — Dr. Humberto (Abril 2026)
 */

require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });

const GHL_TOKEN   = process.env.GHL_HUMBERTO_TOKEN;
const LOCATION_ID = process.env.GHL_HUMBERTO_LOCATION_ID;
const META_TOKEN  = process.env.META_ACCESS_TOKEN;
const META_ACCOUNT = 'act_445142030338909';
const BASE_GHL    = 'https://services.leadconnectorhq.com';
const BASE_META   = 'https://graph.facebook.com/v21.0';

const START_DATE  = new Date('2026-04-01T03:00:00.000Z'); // 01/04 00:00 BRT
const START_TS    = START_DATE.getTime();

const GHL_HEADERS = {
  'Authorization': `Bearer ${GHL_TOKEN}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
};

const ADMIN_IDS = new Set(['5ZqvI8xX8oe4bBLjIZho', 'T4BmTsa7QYsDBmZmyVkk', 'Z34kFuWtLGpe8oyzudm1']);

const SELLERS = {
  'ATW63K2pGMsgZpUZXysr': 'Ardina Araujo',
  'B0gkXItNyfhJgUZgBDfF': 'Flavia Sarraff',
  'HEMrRXCfuyYX0OlYHLD0': 'July Lino',
  'fnLKSe8X9TRS9evtqnCL': 'Simone Chucre',
  'rEPM0twkMSyjmg9BplNr': 'Tatiane Closer',
  'od66JGJ9el9wZg7R3ves': 'Veronica Marise',
  'tvRjuPMCaPWWmTVFBkXJ': 'Zaya Azevedo',
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Busca todos leads Facebook no GHL desde a data
async function getAllFacebookLeadsGHL() {
  let page = 1;
  const all = [];

  while (true) {
    const res = await fetch(`${BASE_GHL}/contacts/search`, {
      method: 'POST',
      headers: GHL_HEADERS,
      body: JSON.stringify({
        locationId: LOCATION_ID,
        page,
        pageLimit: 100,
        filters: [{ group: 'AND', filters: [{ field: 'source', operator: 'eq', value: 'Facebook' }] }],
        sort: [{ field: 'dateAdded', direction: 'desc' }]
      })
    });
    const data = await res.json();
    const contacts = data.contacts || [];
    if (!contacts.length) break;

    let hitOld = false;
    for (const c of contacts) {
      const ts = new Date(c.dateAdded).getTime();
      if (ts >= START_TS) {
        all.push(c);
      } else {
        hitOld = true;
      }
    }

    const lastTs = new Date(contacts[contacts.length - 1].dateAdded).getTime();
    if (lastTs < START_TS || hitOld) break;

    page++;
    await sleep(200);
    if (page > 50) break;
  }

  return all;
}

// Busca leads Meta Ads por campanha
async function getMetaLeadsByCampaign() {
  const params = new URLSearchParams({
    fields: 'id,name,effective_status,insights{spend,actions}',
    date_preset: 'this_month',
    access_token: META_TOKEN,
  });
  const res = await fetch(`${BASE_META}/${META_ACCOUNT}/campaigns?${params}`);
  const data = await res.json();
  return data.data || [];
}

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  Auditoria: Meta Ads vs GHL — Dr. Humberto Abril 2026');
  console.log('══════════════════════════════════════════════════════\n');

  // 1. GHL
  console.log('📋 Buscando leads no GHL (source=Facebook)...');
  const ghlLeads = await getAllFacebookLeadsGHL();

  const byVendedora = {};
  let unassigned = 0;
  let adminAssigned = 0;

  for (const c of ghlLeads) {
    const id = c.assignedTo;
    if (!id) { unassigned++; continue; }
    if (ADMIN_IDS.has(id)) { adminAssigned++; continue; }
    const name = SELLERS[id] || id;
    byVendedora[name] = (byVendedora[name] || 0) + 1;
  }

  const totalGHL = ghlLeads.length;
  const totalVendedoras = Object.values(byVendedora).reduce((s, v) => s + v, 0);

  // 2. Meta
  console.log('📊 Buscando dados Meta Ads...');
  const campaigns = await getMetaLeadsByCampaign();
  let metaLeads = 0;
  let metaSpend = 0;
  const activeCamps = [];

  for (const c of campaigns) {
    const ins = c.insights?.data?.[0] || {};
    const spend = parseFloat(ins.spend || 0);
    let leads = 0;
    for (const a of ins.actions || []) {
      if (a.action_type === 'lead') leads = parseInt(a.value);
    }
    if (leads > 0 || spend > 0) {
      metaLeads += leads;
      metaSpend += spend;
      activeCamps.push({ name: c.name, status: c.effective_status, spend, leads });
    }
  }

  // Resultados
  console.log('\n─── META ADS ──────────────────────────────────────────');
  console.log(`  Leads reportados: ${metaLeads}`);
  console.log(`  Spend total: R$${metaSpend.toFixed(2)}`);
  console.log(`  CPL Meta: R$${(metaSpend / metaLeads).toFixed(2)}`);
  console.log('\n  Por campanha (com leads):');
  activeCamps.filter(c => c.leads > 0).sort((a, b) => b.leads - a.leads).forEach(c => {
    console.log(`    [${c.status.substring(0,6)}] ${c.name.substring(0,50).padEnd(50)} ${c.leads} leads | R$${c.spend.toFixed(0)}`);
  });

  console.log('\n─── GHL (source=Facebook) ─────────────────────────────');
  console.log(`  Total no GHL: ${totalGHL}`);
  console.log(`  Atribuídos a vendedoras: ${totalVendedoras}`);
  console.log(`  Sem atribuição: ${unassigned}`);
  console.log(`  Atribuídos a admins: ${adminAssigned}`);
  console.log('\n  Por vendedora:');
  Object.entries(byVendedora).sort((a, b) => b[1] - a[1]).forEach(([name, cnt]) => {
    const pct = ((cnt / totalVendedoras) * 100).toFixed(1);
    console.log(`    ${name.padEnd(18)} ${cnt} leads (${pct}%)`);
  });

  console.log('\n─── COMPARATIVO ───────────────────────────────────────');
  const gap = metaLeads - totalGHL;
  const gapPct = ((gap / metaLeads) * 100).toFixed(1);
  console.log(`  Meta reporta:    ${metaLeads} leads`);
  console.log(`  GHL registrou:   ${totalGHL} leads`);
  console.log(`  Gap:             ${gap} leads (${gapPct}% não chegaram ao GHL)`);
  console.log(`\n  CPL real (GHL):  R$${(metaSpend / totalGHL).toFixed(2)} por lead registrado`);
  console.log(`  CPL Meta:        R$${(metaSpend / metaLeads).toFixed(2)} por lead reportado`);

  if (gap > 0) {
    console.log(`\n  ⚠️  Causas prováveis do gap:`);
    console.log(`    1. Leads duplicados na atribuição do Meta (janela 7d clique + 1d view)`);
    console.log(`    2. Webhook GHL falhou para alguns leads`);
    console.log(`    3. Leads de formulário sem integração com GHL`);
    console.log(`    4. Leads de campanhas Gproex/antigas sem integração ativa`);
  }

  console.log('\n══════════════════════════════════════════════════════\n');
}

main().catch(err => { console.error('Erro:', err.message); process.exit(1); });
