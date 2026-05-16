/**
 * Cria novo pixel Meta para Dra. Gabrielle Oliveira
 * Conta: act_1136892320236480
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const AD_ACCOUNT = 'act_1136892320236480';
const TOKEN      = process.env.META_ACCESS_TOKEN;
const API        = 'v21.0';
const BASE       = `https://graph.facebook.com/${API}`;

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body:   new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST ${endpoint}] ${j.error.message} (code ${j.error.code})`);
  return j;
}

async function main() {
  console.log('===========================================');
  console.log('  Novo Pixel — DRA. GABRIELLE OLIVEIRA');
  console.log('  Conta: act_1136892320236480');
  console.log('===========================================\n');

  console.log('[1/1] Criando pixel...');
  const pixel = await post(`${AD_ACCOUNT}/adspixels`, {
    name: 'Pixel Dra. Gabrielle Oliveira',
  });

  console.log('\n✅ Pixel criado com sucesso!');
  console.log('─────────────────────────────────────────');
  console.log(`  Pixel ID : ${pixel.id}`);
  console.log(`  Nome     : Pixel Dra. Gabrielle Oliveira`);
  console.log(`  Gerenciador: https://business.facebook.com/events_manager2/list/pixel/${pixel.id}`);
  console.log('─────────────────────────────────────────\n');
}

main().catch(e => { console.error('\n❌ Erro:', e.message); process.exit(1); });
