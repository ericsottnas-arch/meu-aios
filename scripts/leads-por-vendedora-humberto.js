#!/usr/bin/env node
/**
 * Leads por Vendedora — Dr. Humberto
 * Conta quantos leads foram atribuídos a cada vendedora desde uma data específica
 */

require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });

const GHL_TOKEN   = process.env.GHL_HUMBERTO_TOKEN;
const LOCATION_ID = process.env.GHL_HUMBERTO_LOCATION_ID;
const BASE_URL    = 'https://services.leadconnectorhq.com';

// Data de início (padrão: 01/04/2026)
const START_DATE = process.argv[2] ? new Date(process.argv[2]) : new Date('2026-04-01T00:00:00.000Z');
const START_TS   = START_DATE.getTime();

const headers = {
  'Authorization': `Bearer ${GHL_TOKEN}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
};

// Vendedoras do Dr. Humberto (excluindo admins)
const SELLERS = [
  { id: 'ATW63K2pGMsgZpUZXysr', name: 'Ardina Araujo' },
  { id: 'B0gkXItNyfhJgUZgBDfF', name: 'Flavia Sarraff' },
  { id: 'HEMrRXCfuyYX0OlYHLD0', name: 'July Lino' },
  { id: 'fnLKSe8X9TRS9evtqnCL', name: 'Simone Chucre' },
  { id: 'rEPM0twkMSyjmg9BplNr', name: 'Tatiane Closer' },
  { id: 'od66JGJ9el9wZg7R3ves', name: 'Veronica Marise' },
  { id: 'tvRjuPMCaPWWmTVFBkXJ', name: 'Zaya Azevedo' },
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function countLeadsSince(userId, startTs, sourceFilter = null) {
  let count = 0;
  let done = false;
  let page = 1;

  const baseFilters = [
    { field: 'assignedTo', operator: 'eq', value: userId }
  ];
  if (sourceFilter) {
    baseFilters.push({ field: 'source', operator: 'eq', value: sourceFilter });
  }

  while (!done) {
    const body = {
      locationId: LOCATION_ID,
      page,
      pageLimit: 100,
      filters: [{ group: 'AND', filters: baseFilters }],
      sort: [{ field: 'dateAdded', direction: 'desc' }]
    };

    const res = await fetch(`${BASE_URL}/contacts/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const contacts = data.contacts || [];

    if (contacts.length === 0) break;

    let allOld = true;
    for (const c of contacts) {
      const ts = new Date(c.dateAdded).getTime();
      if (ts >= startTs) {
        count++;
        allOld = false;
      }
    }

    // Se todos os contatos desta página são mais antigos que a data, parar
    const lastContact = contacts[contacts.length - 1];
    const lastTs = new Date(lastContact.dateAdded).getTime();
    if (lastTs < startTs) break;

    page++;
    await sleep(200);

    // Safety: máx 20 páginas (2000 contatos)
    if (page > 20) break;
  }

  return count;
}

async function main() {
  const startFormatted = START_DATE.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Leads por Vendedora — Dr. Humberto`);
  console.log(`  Período: ${startFormatted} até hoje`);
  console.log(`${'═'.repeat(50)}\n`);

  const results = [];

  for (const seller of SELLERS) {
    process.stdout.write(`  Buscando ${seller.name}...`);
    const count = await countLeadsSince(seller.id, START_TS, 'Facebook');
    results.push({ ...seller, count });
    process.stdout.write(` ${count} leads\n`);
  }

  // Ordenar por mais leads
  results.sort((a, b) => b.count - a.count);
  const total = results.reduce((s, r) => s + r.count, 0);

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  RANKING — Leads de Campanha (Facebook) desde ${startFormatted}`);
  console.log(`${'─'.repeat(50)}`);

  results.forEach((r, i) => {
    const pct = total > 0 ? ((r.count / total) * 100).toFixed(1) : '0.0';
    const bar = '█'.repeat(Math.round(r.count / Math.max(...results.map(x => x.count)) * 20));
    console.log(`  ${i + 1}. ${r.name.padEnd(18)} ${String(r.count).padStart(4)} leads (${pct}%) ${bar}`);
  });

  console.log(`${'─'.repeat(50)}`);
  console.log(`  TOTAL: ${total} leads\n`);
}

main().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
