const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_445142030338909';
const BASE = 'https://graph.facebook.com/v21.0';

const SOURCES = [
  { id: '120248260736920460', label: 'Salvaram Post 180D' },
  { id: '120248260739300460', label: 'Salvaram Post 90D' },
  { id: '120248260741230460', label: 'Salvaram Post 60D' },
  { id: '120248260744170460', label: 'Salvaram Post 30D' },
  { id: '120248260744670460', label: 'Salvaram Post 7D' },
  { id: '120248260744850460', label: 'Enviaram Mensagem 180D' },
  { id: '120248260751510460', label: 'Interagiram 180D' },
];

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.error_user_msg || j.error.message);
  return j;
}

async function main() {
  console.log('=== CRIANDO LOOKALIKES (1%) ===\n');
  for (const [i, src] of SOURCES.entries()) {
    process.stdout.write(`[${i+1}/7] Semelhante — ${src.label}... `);
    try {
      const res = await post(`${AD_ACCOUNT}/customaudiences`, {
        name: `[Syra] Humberto — Semelhante (1%) ${src.label}`,
        subtype: 'LOOKALIKE',
        lookalike_spec: JSON.stringify({
          type: 'custom_ratio',
          ratio: 0.01,
          origin: [{ id: src.id, type: 'custom_audience', name: src.label }],
        }),
      });
      console.log(`✓ ${res.id}`);
    } catch(e) {
      console.log(`✗ ${e.message}`);
    }
  }
  console.log('\nConcluído.');
}
main();
