#!/usr/bin/env node
/**
 * Cron: Bloqueia Instagram para Anna — Dr. Enio
 * Roda a cada 15min e remove qualquer conversa Instagram atribuída à Anna
 *
 * Ativar: node -e "require('./scripts/block-anna-instagram-cron.js')"
 * Ou via cron: 0,15,30,45 * * * * node /home/synkra/meu-aios/scripts/block-anna-instagram-cron.js
 */

require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });

const GHL_TOKEN   = process.env.GHL_ENIO_API_KEY;
const LOCATION_ID = process.env.GHL_ENIO_LOCATION_ID;
const ANNA_ID     = '28UD0m4zHFmx2xrZZ1YR';
const BASE        = 'https://services.leadconnectorhq.com';

const headers = {
  'Authorization': `Bearer ${GHL_TOKEN}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const ts = new Date().toISOString();

  // Busca conversas Instagram atribuídas à Anna (só precisa da primeira página)
  const params = new URLSearchParams({
    locationId: LOCATION_ID,
    assignedTo: ANNA_ID,
    limit: 100,
  });

  const res = await fetch(`${BASE}/conversations/search?${params}`, { headers });
  const data = await res.json();
  const convs = (data.conversations || []).filter(c =>
    (c.lastMessageType || '').includes('INSTAGRAM')
  );

  if (convs.length === 0) {
    console.log(`[${ts}] ✅ Nenhuma conversa Instagram na Anna.`);
    return;
  }

  console.log(`[${ts}] ⚠️  ${convs.length} conversa(s) Instagram encontrada(s) — removendo...`);

  const contactIds = [...new Set(convs.map(c => c.contactId).filter(Boolean))];
  let fixed = 0;

  for (const contactId of contactIds) {
    try {
      await fetch(`${BASE}/contacts/${contactId}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ assignedTo: null }),
      });
      fixed++;
      await sleep(150);
    } catch (e) {
      console.error(`  ❌ Contato ${contactId}: ${e.message}`);
    }
  }

  console.log(`[${ts}] ✅ ${fixed}/${contactIds.length} contatos desatribuídos.`);
}

run().catch(err => console.error(`[${new Date().toISOString()}] ERRO: ${err.message}`));
