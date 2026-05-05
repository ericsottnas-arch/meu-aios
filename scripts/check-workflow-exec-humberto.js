#!/usr/bin/env node
const path  = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN = process.env.GHL_HUMBERTO_TOKEN;
const LOC   = process.env.GHL_HUMBERTO_LOCATION_ID;
const CONTACT_ID = 'YxSlcFaKNs5h0ntxutzE'; // nilda luna — contato de teste

function ghlGet(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: endpoint,
      headers: { Authorization: `Bearer ${TOKEN}`, Version: '2021-07-28' }
    };
    https.get(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({ raw: d.slice(0, 300) }); } });
    }).on('error', reject);
  });
}

async function main() {
  // Checar se a tag mql está no contato
  console.log('🔍 Verificando estado do contato de teste...');
  const contact = await ghlGet(`/contacts/${CONTACT_ID}`);
  const c = contact.contact || contact;
  console.log(`  Nome: ${c.firstName} ${c.lastName || ''}`);
  console.log(`  Tags: ${JSON.stringify(c.tags)}`);

  // Histórico de workflows do contato
  console.log('\n📋 Histórico de automações do contato...');
  const history = await ghlGet(`/contacts/${CONTACT_ID}/workflow?locationId=${LOC}`);
  if (history.workflows || history.data) {
    const wfs = history.workflows || history.data;
    wfs.slice(0, 10).forEach(w => console.log(`  ${w.name || w.workflowName || JSON.stringify(w).slice(0,80)}`));
  } else {
    console.log('  Raw:', JSON.stringify(history).slice(0, 300));
  }
}
main().catch(e => { console.error(e.message); process.exit(1); });
