#!/usr/bin/env node
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
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const TAG = 'blefaroplastia - amapá';
  const all = [];
  let cursor = null;
  let page = 1;
  
  while (true) {
    const qs = new URLSearchParams({ locationId: LOC_ID, limit: '100', tag: TAG });
    if (cursor) qs.set('startAfterDate', cursor);
    const res = await ghlGet(`/contacts/?${qs}`);
    const batch = res.contacts || [];
    all.push(...batch);
    process.stderr.write(`Pág ${page}: ${batch.length} contatos (total: ${all.length})\n`);
    if (batch.length < 100) break;
    cursor = res.meta?.startAfterDate || null;
    if (!cursor) break;
    page++;
    await sleep(300);
  }
  
  console.log(`\nTotal tag "blefaroplastia - amapá": ${all.length}`);
  
  // Filtra DDD 11
  const ddd11 = all.filter(c => {
    const ph = (c.phone||'').replace(/\D/g,'');
    return /^(?:55)?11/.test(ph) || /^(?:\+55)?(?:0?11)/.test(c.phone||'');
  });
  
  console.log(`Com DDD 11 (SP): ${ddd11.length}\n`);
  
  if (ddd11.length === 0) {
    console.log('Nenhum lead com DDD 11 encontrado nessa tag.');
    console.log('\nTodos os leads com essa tag:');
    for (const c of all.slice(0, 50)) {
      const name = `${c.firstName||''} ${c.lastName||''}`.trim();
      const ddd = (c.phone||'').replace(/\D/g,'').substring(2,4);
      console.log(`${name} | Tel: ${c.phone} | DDD: ${ddd} | ${new Date(c.dateAdded||0).toLocaleDateString('pt-BR')}`);
    }
  } else {
    for (const c of ddd11) {
      const name = `${c.firstName||''} ${c.lastName||''}`.trim();
      console.log(`Nome: ${name}`);
      console.log(`Tel: ${c.phone}`);
      console.log(`Tags: ${(c.tags||[]).join(', ')}`);
      console.log(`Email: ${c.email||'N/A'}`);
      console.log(`ID: ${c.id}`);
      console.log(`Criado: ${new Date(c.dateAdded||0).toLocaleDateString('pt-BR')}`);
      console.log('---');
    }
  }
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
