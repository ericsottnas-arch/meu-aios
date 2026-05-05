#!/usr/bin/env node
/**
 * Lista leads do GHL Humberto com DDD 11 e tag "blefaroplastia amapá"
 */
const https = require('https');
require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });

const TOKEN  = process.env.GHL_HUMBERTO_TOKEN;
const LOC_ID = process.env.GHL_HUMBERTO_LOCATION_ID;

function ghlGet(path_) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'services.leadconnectorhq.com',
      path: path_,
      method: 'GET',
      headers: { Authorization: `Bearer ${TOKEN}`, Version: '2021-07-28' },
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(new Error(d.substring(0,300))); } });
    });
    req.on('error', reject);
    req.end();
  });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // Busca contatos com tag "blefaroplastia amapá"
  // A tag pode ser "blefaroplastia" + "amapá" separadas, ou "blefaroplastia amapá" como uma
  const tags = ['blefaroplastia amapá', 'blefaroplastia-amapa', 'blefaroplastia amapa'];
  
  const allContacts = [];
  
  for (const tag of tags) {
    let page = 1;
    while (page <= 20) {
      const qs = new URLSearchParams({ locationId: LOC_ID, limit: '100', tag });
      if (page > 1) qs.set('startAfter', String((page-1)*100));
      const res = await ghlGet(`/contacts/?${qs}`);
      const batch = res.contacts || [];
      if (!batch.length) break;
      
      // Filtra DDD 11
      const sp = batch.filter(c => {
        const phone = (c.phone || '').replace(/\D/g, '');
        return phone.startsWith('5511') || phone.startsWith('11') || phone.includes('11');
      });
      
      allContacts.push(...sp);
      process.stderr.write(`Tag "${tag}" | pág ${page}: ${batch.length} total, ${sp.length} com DDD 11\n`);
      if (batch.length < 100) break;
      page++;
      await sleep(300);
    }
  }
  
  // Remove duplicatas por id
  const uniq = Object.values(Object.fromEntries(allContacts.map(c => [c.id, c])));
  
  console.log(`\n=== Resultado: ${uniq.length} leads DDD 11 + blefaroplastia amapá ===\n`);
  for (const c of uniq) {
    const name = `${c.firstName||''} ${c.lastName||''}`.trim();
    const phone = c.phone || 'N/A';
    const tags = (c.tags || []).join(', ');
    const criado = c.dateAdded ? new Date(c.dateAdded).toLocaleDateString('pt-BR') : 'N/A';
    console.log(`Nome: ${name}`);
    console.log(`Tel: ${phone}`);
    console.log(`Tags: ${tags}`);
    console.log(`Criado: ${criado}`);
    console.log(`ID: ${c.id}`);
    console.log('---');
  }
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
