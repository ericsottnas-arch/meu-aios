require('dotenv').config({ path: require('path').join(__dirname, '../meu-projeto/.env') });
const fetch = require('node-fetch').default;
const TOKEN = process.env.META_ACCESS_TOKEN;
const ACCOUNT = 'act_445142030338909';
const BASE = 'https://graph.facebook.com/v21.0';
const ADSETS = ['120248335266620460','120248334756250460'];
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
async function sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }
async function main() {
  for (const adsetId of ADSETS) {
    await sleep(4000);
    const r = await fetch(BASE+'/'+adsetId+'/ads?fields=id,name,status&limit=50&access_token='+TOKEN);
    const d = await r.json();
    if (d.error) throw new Error('getAds '+adsetId+': '+d.error.message);
    console.log('Adset '+adsetId+': '+d.data.length+' ads');
    for (const c of CREATIVES) {
      await sleep(1500);
      const v2 = d.data.find(a => a.name.includes(c.num+'v2'));
      if (v2 && v2.status === 'ACTIVE') {
        await api(v2.id, { status:'PAUSED' });
        console.log('  Pausado: '+v2.name);
        await sleep(1200);
      }
      const exists = d.data.find(a => a.name.includes(c.num+'v3'));
      if (exists) { console.log('  Já existe: '+c.num+'v3, skip'); continue; }
      const ad = await api(ACCOUNT+'/ads', { name:c.num+'v3 [Estático] [Hook: Paciente Modelo - '+c.hook+']', adset_id:adsetId, creative:{creative_id:c.id}, status:'ACTIVE' });
      console.log('  Ativo: '+c.num+'v3 -> '+ad.id);
      await sleep(1500);
    }
  }
  console.log('Concluido.');
}
main().catch(e=>{ console.error('ERRO:', e.message); process.exit(1); });
