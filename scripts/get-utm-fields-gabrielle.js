const https = require('https');
require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });
const TOKEN = process.env.GHL_GABRIELLE_TOKEN;
const LOC_ID = process.env.GHL_GABRIELLE_LOCATION_ID;
function ghlGet(p) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname:'services.leadconnectorhq.com', path:p, method:'GET',
      headers:{ Authorization:`Bearer ${TOKEN}`, Version:'2021-07-28' }
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d))}catch{resolve({})} }); });
    req.on('error',reject); req.end();
  });
}
async function main() {
  const res = await ghlGet(`/locations/${LOC_ID}/customFields`);
  const fields = res.customFields || [];
  const utmFields = fields.filter(f => (f.name||f.fieldKey||'').toLowerCase().includes('utm') || (f.fieldKey||'').toLowerCase().includes('utm'));
  console.log('Campos UTM Gabrielle:');
  for (const f of utmFields) {
    console.log(`  ${f.name || f.fieldKey} → id: ${f.id}`);
  }
  if (!utmFields.length) {
    console.log('Nenhum campo UTM encontrado. Todos os campos:');
    for (const f of fields.slice(0, 20)) {
      console.log(`  ${f.name} (${f.fieldKey}) → ${f.id}`);
    }
  }
}
main().catch(e => console.error(e.message));
