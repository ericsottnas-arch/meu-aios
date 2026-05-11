#!/usr/bin/env node
/**
 * Export MQL leads — Dra. Gabrielle
 * GHL → busca contatos com tag "mql" → CSV no padrão Meta Custom Audience
 *
 * Formato Meta: https://www.facebook.com/business/help/170456843145568
 * Colunas aceitas: email, phone, fn (first name), ln (last name)
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN    = process.env.GHL_GABRIELLE_TOKEN;
const LOC_ID   = process.env.GHL_GABRIELLE_LOCATION_ID;
const OUT_FILE = path.join(__dirname, '../data/mql-gabrielle-meta.csv');

if (!TOKEN)  { console.error('❌ GHL_GABRIELLE_TOKEN não encontrado no .env'); process.exit(1); }
if (!LOC_ID) { console.error('❌ GHL_GABRIELLE_LOCATION_ID não encontrado no .env'); process.exit(1); }

function ghlGet(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: endpoint,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${data.substring(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Normaliza telefone para formato E.164 sem + (padrão Meta)
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  // Brasil: adiciona 55 se não tiver
  if (digits.length === 11 && digits.startsWith('0')) return '55' + digits.slice(1);
  if (digits.length === 11) return '55' + digits;
  if (digits.length === 10) return '55' + digits;
  return digits; // já tem DDI ou formato desconhecido
}

function normalizeEmail(email) {
  return (email || '').toLowerCase().trim();
}

async function getAllMQLContacts() {
  const contacts = [];
  let cursor = null;
  let page = 1;

  console.error(`🔍 Buscando contatos com tag "mql" na location ${LOC_ID}...`);

  while (true) {
    const qs = new URLSearchParams({
      locationId: LOC_ID,
      limit: '100',
      tag: 'mql',
    });
    if (cursor) qs.set('startAfter', cursor);

    const res = await ghlGet(`/contacts/?${qs.toString()}`);

    if (res.statusCode === 429 || (res.message || '').includes('limit')) {
      console.error('⏳ Rate limit — aguardando 10s...');
      await sleep(10000);
      continue;
    }

    if (res.statusCode >= 400) {
      console.error('❌ Erro GHL:', JSON.stringify(res));
      break;
    }

    const batch = res.contacts || [];
    contacts.push(...batch);

    console.error(`   Página ${page}: ${batch.length} contatos (total: ${contacts.length})`);

    if (!res.meta?.nextPageUrl && batch.length < 100) break;
    cursor = res.meta?.startAfterDate || res.meta?.nextCursor || null;
    if (!cursor) break;

    page++;
    await sleep(300);
  }

  return contacts;
}

function toMetaCSV(contacts) {
  const rows = [];

  // Header Meta Custom Audience
  rows.push('email,phone,fn,ln');

  for (const c of contacts) {
    const email = normalizeEmail(c.email);
    const phone = normalizePhone(c.phone);
    const fn    = (c.firstName || '').trim().replace(/,/g, '');
    const ln    = (c.lastName  || '').trim().replace(/,/g, '');

    // Meta exige ao menos email OU telefone
    if (!email && !phone) continue;

    rows.push(`${email},${phone},${fn},${ln}`);
  }

  return rows.join('\n');
}

async function main() {
  const contacts = await getAllMQLContacts();

  if (contacts.length === 0) {
    console.error('⚠️  Nenhum contato encontrado com tag "mql".');
    process.exit(0);
  }

  console.error(`\n✅ Total MQL encontrados: ${contacts.length}`);

  const csv = toMetaCSV(contacts);
  const validRows = csv.split('\n').length - 1; // -1 pelo header

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, csv, 'utf8');

  console.error(`\n📄 CSV gerado: ${OUT_FILE}`);
  console.error(`📊 Linhas válidas (com email ou phone): ${validRows}`);
  console.error(`\n📌 Como usar no Meta:`);
  console.error(`   1. Ads Manager → Públicos → Criar público → Público Personalizado`);
  console.error(`   2. Selecionar "Lista de clientes" → Fazer upload do CSV`);
  console.error(`   3. Mapear: email=Email, phone=Telefone, fn=Nome, ln=Sobrenome`);
  console.error(`   4. Depois de criar o público: "Criar similar" → 1%, 2%, 3%`);

  // Output o CSV no stdout para facilitar pipe/redirecionamento
  console.log(csv);
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
