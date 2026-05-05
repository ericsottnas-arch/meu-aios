#!/usr/bin/env node
/**
 * Fix tags: 49 leads DDD 11 com tag "blefaroplastia - amapá" incorreta
 * Remove: blefaroplastia - amapá
 * Adiciona: procedimento-sp
 */
const https = require('https');
require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });
const TOKEN  = process.env.GHL_HUMBERTO_TOKEN;
const LOC_ID = process.env.GHL_HUMBERTO_LOCATION_ID;

function ghlGet(p) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname:'services.leadconnectorhq.com', path:p, method:'GET',
      headers:{ Authorization:`Bearer ${TOKEN}`, Version:'2021-07-28' }
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d))}catch{resolve({})} }); });
    req.on('error',reject); req.end();
  });
}

function ghlPut(path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request({ hostname:'services.leadconnectorhq.com', path, method:'PUT',
      headers:{ Authorization:`Bearer ${TOKEN}`, Version:'2021-07-28', 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(bodyStr) }
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d))}catch{resolve({})} }); });
    req.on('error',reject); req.write(bodyStr); req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const TAG_WRONG = 'blefaroplastia - amapá';
  const TAG_NEW   = 'procedimento-sp';

  // Busca todos os contatos com a tag errada
  const all = [];
  let cursor = null;
  let page = 1;
  while (true) {
    const qs = new URLSearchParams({ locationId: LOC_ID, limit: '100', tag: TAG_WRONG });
    if (cursor) qs.set('startAfterDate', cursor);
    const res = await ghlGet(`/contacts/?${qs}`);
    const batch = res.contacts || [];
    all.push(...batch);
    if (batch.length < 100) break;
    cursor = res.meta?.startAfterDate || null;
    if (!cursor) break;
    page++;
    await sleep(300);
  }

  // Filtra apenas DDD 11
  const ddd11 = all.filter(c => /^(?:\+?55)?11/.test((c.phone||'').replace(/\s/g,'')));
  console.log(`Total com tag incorreta: ${all.length} | DDD 11: ${ddd11.length}\n`);

  let ok = 0, err = 0;
  for (const c of ddd11) {
    const name = `${c.firstName||''} ${c.lastName||''}`.trim();
    // Tags novas: remove a errada, adiciona a correta, mantém as demais
    const newTags = (c.tags || []).filter(t => t !== TAG_WRONG);
    if (!newTags.includes(TAG_NEW)) newTags.push(TAG_NEW);

    try {
      await ghlPut(`/contacts/${c.id}`, { tags: newTags });
      console.log(`✓ ${name} | ${c.phone} | tags: ${newTags.join(', ')}`);
      ok++;
    } catch (e) {
      console.log(`✗ ${name} | ${c.phone} → ${e.message}`);
      err++;
    }
    await sleep(200);
  }

  console.log(`\n=== RESULTADO ===`);
  console.log(`✓ Corrigidos: ${ok}`);
  console.log(`✗ Erros: ${err}`);
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
