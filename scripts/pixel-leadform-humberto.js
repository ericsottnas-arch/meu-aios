const fetch = require('node-fetch').default;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const BASE       = 'https://graph.facebook.com/v21.0';
const PAGE_ID    = '104425248310435';
const PIXEL_ID   = '1354726053083764';

const ADSETS = [
  { id: '120248263612440460', name: 'P1 LLK Interagiram' },
  { id: '120248263613730460', name: 'P2 LLK Mensagem+Salvaram' },
  { id: '120248263614970460', name: 'P3 Mulheres Interesses' },
];

async function apiPost(id, body) {
  const r = await fetch(`${BASE}/${id}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  return j;
}

async function main() {
  console.log('Associando pixel ao promoted_object dos conjuntos...\n');
  
  for (const adset of ADSETS) {
    process.stdout.write(`  ${adset.name}... `);
    const res = await apiPost(adset.id, {
      promoted_object: JSON.stringify({
        page_id: PAGE_ID,
        pixel_id: PIXEL_ID,
      }),
    });
    if (res.success) {
      console.log('✓');
    } else {
      console.log(`✗ ${JSON.stringify(res.error)}`);
    }
  }
  console.log('\nConcluído.');
}
main();
