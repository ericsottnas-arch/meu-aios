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
  // Lista todas as tags disponíveis buscando contatos recentes
  const res = await ghlGet(`/contacts/?locationId=${LOC_ID}&limit=5`);
  const sample = res.contacts || [];
  const allTags = new Set();
  sample.forEach(c => (c.tags||[]).forEach(t => allTags.add(t)));
  process.stderr.write(`Tags em amostra: ${[...allTags].join(', ')}\n`);
  
  // Busca por "blefaroplastia" como tag
  const r2 = await ghlGet(`/contacts/?locationId=${LOC_ID}&limit=100&tag=blefaroplastia`);
  const blefaro = r2.contacts || [];
  process.stderr.write(`Contatos com tag "blefaroplastia": ${blefaro.length}\n`);
  
  // Filtra DDD 11
  const ddd11 = blefaro.filter(c => {
    const ph = (c.phone||'').replace(/\D/g,'');
    // DDD 11 = São Paulo
    return ph.includes('11') && (ph.startsWith('5511') || ph.startsWith('011') || (ph.length>=10 && ph.substring(ph.length-11,ph.length-9)==='11') || ph.match(/^(?:55)?11/));
  });
  
  // Filtra por amapá (tag)
  const amapa = blefaro.filter(c => (c.tags||[]).some(t => t.toLowerCase().includes('amap')));
  
  console.log(`\nBlefaroplastia total: ${blefaro.length}`);
  console.log(`Com DDD 11 (SP): ${ddd11.length}`);
  console.log(`Com tag amapá: ${amapa.length}`);
  
  console.log('\n=== Leads DDD 11 + blefaroplastia ===');
  for (const c of ddd11.slice(0,30)) {
    console.log(`${c.firstName||''} ${c.lastName||''} | ${c.phone} | tags: ${(c.tags||[]).join(',')} | ${new Date(c.dateAdded||c.createdAt).toLocaleDateString('pt-BR')}`);
  }
  
  if (amapa.length > 0) {
    console.log('\n=== Leads blefaroplastia + tag amapá ===');
    for (const c of amapa) {
      console.log(`${c.firstName||''} ${c.lastName||''} | ${c.phone} | tags: ${(c.tags||[]).join(',')} | id: ${c.id}`);
    }
  }
}
main().catch(e => console.error(e.message));
