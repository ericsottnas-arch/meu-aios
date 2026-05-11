#!/usr/bin/env node
/**
 * Swap v3 — Dr. Humberto — Adset 2 apenas (retry após rate limit)
 */
require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });
const TOKEN   = process.env.META_ACCESS_TOKEN;
const ACCOUNT = 'act_1161765921688268';
const BASE    = 'https://graph.facebook.com/v21.0';

const ADSET   = '120248334756250460';
const CREATIVES = [
  { num:'C8',  hook:'Escuro',     id:'949669764719951' },
  { num:'C9',  hook:'Foto Fundo', id:'2600032747059874' },
  { num:'C10', hook:'Claro',      id:'1464122425191661' },
  { num:'C11', hook:'Texto',      id:'1466694618578541' },
];

async function api(path, body) {
  const r = await fetch(BASE+'/'+path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...body, access_token:TOKEN}) });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message+' ('+d.error.code+')');
  return d;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('[swap-v3-adset2] Iniciando adset', ADSET);
  await sleep(3000);
  const r = await fetch(BASE+'/'+ADSET+'/ads?fields=id,name,status&limit=50&access_token='+TOKEN);
  const d = await r.json();
  if (d.error) throw new Error('getAds: '+d.error.message);
  console.log('Ads encontrados:', d.data.length);

  for (const c of CREATIVES) {
    await sleep(2000);
    const v2 = d.data.find(a => a.name.includes(c.num+'v2'));
    if (v2 && v2.status === 'ACTIVE') {
      await api(v2.id, { status:'PAUSED' });
      console.log('  Pausado:', v2.name);
      await sleep(1500);
    }
    const exists = d.data.find(a => a.name.includes(c.num+'v3'));
    if (exists) { console.log('  Já existe:', c.num+'v3, skip'); continue; }
    const ad = await api(ACCOUNT+'/ads', {
      name: c.num+'v3 [Estático] [Hook: Paciente Modelo - '+c.hook+']',
      adset_id: ADSET,
      creative: { creative_id: c.id },
      status: 'ACTIVE',
    });
    console.log('  Ativo:', c.num+'v3 ->', ad.id);
    await sleep(1500);
  }
  console.log('[swap-v3-adset2] Concluído');
}

main().catch(e => { console.error('[ERRO]', e.message); process.exit(1); });
