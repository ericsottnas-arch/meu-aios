#!/usr/bin/env node
/**
 * Cria Custom Audience (lista MQL) + Lookalike 1% — Dra. Gabrielle
 *
 * Fluxo:
 * 1. Lê CSV data/mql-gabrielle-meta.csv
 * 2. Faz SHA256 nos dados (padrão Meta)
 * 3. Cria Custom Audience "LEADS MQL 22/04"
 * 4. Faz upload dos usuários
 * 5. Cria Lookalike 1% a partir do público criado
 */

const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const fetch  = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN   = process.env.META_ACCESS_TOKEN;
const ACCOUNT = 'act_1136892320236480'; // Dra. Gabrielle
const BASE    = 'https://graph.facebook.com/v21.0';
const CSV     = path.join(__dirname, '../data/mql-gabrielle-meta.csv');

function sha256(value) {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

function normalizePhone(p) {
  if (!p) return null;
  const d = p.replace(/\D/g, '');
  if (d.length === 0) return null;
  // Garantir DDI 55
  if (d.startsWith('55') && d.length >= 12) return d;
  if (d.length === 11) return '55' + d;
  if (d.length === 10) return '55' + d;
  return d;
}

async function apiPost(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.error_user_msg || j.error.message);
  return j;
}

async function createCustomAudience() {
  console.log('1. Criando Custom Audience "LEADS MQL 22/04"...');
  const res = await apiPost(`${ACCOUNT}/customaudiences`, {
    name: '[Syra] Gabrielle — LEADS MQL 22/04',
    subtype: 'CUSTOM',
    customer_file_source: 'USER_PROVIDED_ONLY',
    description: 'Lista de leads MQL exportada do GHL — Dra. Gabrielle Oliveira (22/04/2026)',
  });
  console.log(`   ✓ Audience criada: ${res.id}`);
  return res.id;
}

async function uploadUsers(audienceId) {
  console.log('2. Fazendo upload dos usuários...');

  const csv = fs.readFileSync(CSV, 'utf8');
  const rows = csv.split('\n').slice(1).filter(r => r.trim()); // pula header

  const schema = [];
  const data   = [];

  for (const row of rows) {
    const [email, phone, fn, ln] = row.split(',');

    const entry = [];
    const entrySchema = [];

    const normPhone = normalizePhone(phone);
    if (normPhone) {
      entrySchema.push('PHONE');
      entry.push(sha256(normPhone));
    }

    if (email && email.includes('@')) {
      entrySchema.push('EMAIL');
      entry.push(sha256(email));
    }

    if (fn && fn.trim()) {
      entrySchema.push('FN');
      entry.push(sha256(fn));
    }

    if (ln && ln.trim()) {
      entrySchema.push('LN');
      entry.push(sha256(ln));
    }

    if (entry.length === 0) continue;

    // Usar schema do primeiro registro válido
    if (schema.length === 0) schema.push(...entrySchema);

    // Preencher com '' para campos ausentes neste registro
    const normalizedEntry = schema.map((field, i) => {
      const idx = entrySchema.indexOf(field);
      return idx >= 0 ? entry[idx] : '';
    });

    data.push(normalizedEntry);
  }

  console.log(`   Preparados ${data.length} registros com schema: ${schema.join(', ')}`);

  // Upload em batches de 10.000 (limite Meta)
  const BATCH = 10000;
  for (let i = 0; i < data.length; i += BATCH) {
    const batch = data.slice(i, i + BATCH);
    const res = await apiPost(`${audienceId}/users`, {
      schema: JSON.stringify(schema),
      data:   JSON.stringify(batch),
    });
    console.log(`   ✓ Batch ${Math.floor(i/BATCH)+1}: ${res.num_received} recebidos, ${res.num_invalid_entries || 0} inválidos`);
  }
}

async function createLookalike(sourceAudienceId) {
  console.log('3. Criando Lookalike 1%...');
  const res = await apiPost(`${ACCOUNT}/customaudiences`, {
    name: '[Syra] Gabrielle — Semelhante 1% LEADS MQL 22/04',
    subtype: 'LOOKALIKE',
    origin_audience_id: sourceAudienceId,
    lookalike_spec: JSON.stringify({
      type: 'custom_ratio',
      ratio: 0.01,
      country: 'BR',
      origin: [{ id: sourceAudienceId, type: 'custom_audience', name: 'LEADS MQL 22/04' }],
    }),
  });
  console.log(`   ✓ Lookalike criado: ${res.id}`);
  return res.id;
}

async function main() {
  console.log('=== CRIANDO PÚBLICO MQL + LOOKALIKE — DRA. GABRIELLE ===\n');

  if (!TOKEN) { console.error('❌ META_ACCESS_TOKEN não encontrado'); process.exit(1); }
  if (!fs.existsSync(CSV)) { console.error('❌ CSV não encontrado:', CSV); process.exit(1); }

  const audienceId  = await createCustomAudience();
  await uploadUsers(audienceId);
  const lookalikeid = await createLookalike(audienceId);

  console.log('\n=== CONCLUÍDO ===');
  console.log(`Custom Audience ID : ${audienceId}`);
  console.log(`Lookalike 1% ID    : ${lookalikeid}`);
  console.log('\nPróximos passos:');
  console.log('  • Aguardar ~30 min para o Meta processar o público');
  console.log('  • Criar adset ABO usando o Lookalike como segmentação');
  console.log('  • Geo: SP + Grande SP | Mulheres 25-55');
}

main().catch(err => {
  console.error('\n❌ ERRO:', err.message);
  process.exit(1);
});
