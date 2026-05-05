/**
 * Step 3 apenas: pausar ads antigos C8-C11, criar novos v2 com criativos já criados.
 * Criativos criados no step anterior:
 *   C8v2  → 1466322568305462
 *   C9v2  → 2076394159952882
 *   C10v2 → 1434668434643415
 *   C11v2 → 1281613094156676
 */

require('dotenv').config({ path: require('path').join(__dirname, '../meu-projeto/.env') });
const fetch = require('node-fetch').default;

const TOKEN   = process.env.META_ACCESS_TOKEN;
const ACCOUNT = 'act_445142030338909';
const BASE    = 'https://graph.facebook.com/v21.0';

const ADSETS = [
  '120248335266620460',  // P2 Aberto
  '120248334756250460',  // P1 LLK
];

const CREATIVES = [
  { num: 'C8',  hook: 'Escuro',     id: '1466322568305462' },
  { num: 'C9',  hook: 'Foto Fundo', id: '2076394159952882' },
  { num: 'C10', hook: 'Claro',      id: '1434668434643415' },
  { num: 'C11', hook: 'Texto',      id: '1281613094156676' },
];

async function api(path, body) {
  const r = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: TOKEN }),
  });
  const d = await r.json();
  if (d.error) throw new Error(`Meta API [${path}]: ${d.error.message} (code ${d.error.code})`);
  return d;
}

async function getAdsInAdset(adsetId) {
  const r = await fetch(`${BASE}/${adsetId}/ads?fields=id,name,status&limit=50&access_token=${TOKEN}`);
  const d = await r.json();
  if (d.error) throw new Error(`getAds: ${d.error.message}`);
  return d.data || [];
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  for (const adsetId of ADSETS) {
    console.log(`\nAdset ${adsetId}:`);

    // Rate limit protection — wait before each adset
    await sleep(3000);

    const existingAds = await getAdsInAdset(adsetId);
    console.log(`  ${existingAds.length} ads encontrados`);

    for (const c of CREATIVES) {
      await sleep(1000);

      // Pausar ads antigos (sem v2 no nome)
      const oldAds = existingAds.filter(a => a.name.includes(c.num) && !a.name.includes('v2'));
      for (const old of oldAds) {
        if (old.status === 'ACTIVE') {
          await api(old.id, { status: 'PAUSED' });
          console.log(`  Pausado: ${old.name}`);
          await sleep(800);
        }
      }

      // Criar novo ad
      const adName = `${c.num}v2 [Estático] [Hook: Paciente Modelo - ${c.hook}]`;
      const ad = await api(`${ACCOUNT}/ads`, {
        name: adName,
        adset_id: adsetId,
        creative: { creative_id: c.id },
        status: 'ACTIVE',
      });
      console.log(`  Novo: ${adName} → ${ad.id}`);
      await sleep(1000);
    }
  }

  console.log('\nConcluido. 8 novos anuncios ativos com criativos corrigidos.');
}

main().catch(e => { console.error('\nERRO:', e.message); process.exit(1); });
