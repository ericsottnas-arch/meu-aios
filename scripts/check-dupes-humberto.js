#!/usr/bin/env node
/**
 * Diagnóstico: contatos duplicados por telefone — Dr. Humberto
 * Busca contatos criados nos últimos 30 dias e detecta duplicatas por telefone normalizado
 */
const https = require('https');
require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });

const TOKEN     = process.env.GHL_HUMBERTO_TOKEN;
const LOC_ID    = process.env.GHL_HUMBERTO_LOCATION_ID;

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
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(new Error(d.substring(0,200))); } });
    });
    req.on('error', reject);
    req.end();
  });
}

function normalizePhone(p) {
  if (!p) return '';
  const d = p.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) return d;
  if (d.length === 11) return '55' + d;
  if (d.length === 10) return '55' + d;
  return d;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('=== Diagnóstico duplicatas Humberto ===\n');
  
  // Busca contatos recentes
  const all = [];
  let page = 1;
  while (page <= 5) { // até 500 contatos
    const qs = new URLSearchParams({ locationId: LOC_ID, limit: '100', page: String(page) });
    const res = await ghlGet(`/contacts/?${qs}`);
    const batch = res.contacts || [];
    if (!batch.length) break;
    all.push(...batch);
    process.stderr.write(`Página ${page}: ${batch.length} contatos (total: ${all.length})\n`);
    if (batch.length < 100) break;
    page++;
    await sleep(300);
  }
  
  console.log(`\nTotal contatos: ${all.length}\n`);
  
  // Agrupa por telefone normalizado
  const byPhone = {};
  for (const c of all) {
    const phone = normalizePhone(c.phone || '');
    if (!phone) continue;
    if (!byPhone[phone]) byPhone[phone] = [];
    byPhone[phone].push(c);
  }
  
  // Encontra duplicatas
  const dupes = Object.entries(byPhone).filter(([, arr]) => arr.length > 1);
  console.log(`Telefones com MÚLTIPLOS contatos: ${dupes.length}\n`);
  
  for (const [phone, contacts] of dupes.slice(0, 10)) {
    console.log(`\n📞 +${phone} (${contacts.length} contatos):`);
    for (const c of contacts) {
      console.log(`  ID: ${c.id}`);
      console.log(`  Nome: ${c.firstName || ''} ${c.lastName || ''}`);
      console.log(`  Telefone raw: ${c.phone}`);
      console.log(`  Criado: ${c.dateAdded || c.createdAt || 'N/A'}`);
      console.log(`  Source: ${c.source || 'N/A'}`);
    }
  }
  
  if (dupes.length === 0) {
    console.log('Nenhuma duplicata encontrada nos primeiros 500 contatos.');
    console.log('O problema pode estar em contatos mais antigos ou na lógica de criação de oportunidades.');
  }
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
