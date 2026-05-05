/**
 * Cria pixel de Eventos Offline (via CAPI / adspixels) — Dr. Enio Leite [T1]
 * Conta: act_1273951357510355
 *
 * NOTA: O endpoint legacy offline_conversion_data_sets foi descontinuado pelo Meta
 * (inclusive em v19). A abordagem correta agora é criar um pixel padrão via CAPI
 * e enviar eventos offline com action_source: "physical_store".
 *
 * Etapas:
 *   1. Cria um novo pixel nomeado para eventos offline
 *   2. Exibe o ID e o link do Gerenciador de Eventos
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const AD_ACCOUNT = 'act_1273951357510355';
const TOKEN      = process.env.META_ACCESS_TOKEN;
const API        = 'v21.0';
const BASE       = `https://graph.facebook.com/${API}`;

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body:   new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST ${endpoint}] ${j.error.message} (code ${j.error.code})`);
  return j;
}

async function main() {
  console.log('===========================================');
  console.log('  Pixel Eventos Offline — DR. ENIO LEITE [T1]');
  console.log('  Conta: act_1273951357510355');
  console.log('===========================================\n');

  // ── Criar pixel via CAPI ─────────────────────────────────────────────────────
  console.log('[1/1] Criando pixel de eventos offline...');
  const pixel = await post(`${AD_ACCOUNT}/adspixels`, {
    name: '[Syra] Dr. Enio Leite - Eventos Offline',
  });
  console.log(`  ✓ Pixel criado — ID: ${pixel.id}`);

  // ── Resultado ────────────────────────────────────────────────────────────────
  console.log('\n===========================================');
  console.log('  CONCLUÍDO');
  console.log('===========================================');
  console.log(`  Pixel ID (Offline)   : ${pixel.id}`);
  console.log(`  Conta de anúncio     : ${AD_ACCOUNT}`);
  console.log('\n  Como enviar eventos offline para este pixel:');
  console.log('  POST /{pixel_id}/events');
  console.log('  → action_source: "physical_store" (offline)');
  console.log('  → ou "phone_call", "crm", etc. conforme a origem');
  console.log(`\n  Gerenciador de Eventos:`);
  console.log(`  https://business.facebook.com/events_manager2/list/pixel/${pixel.id}`);
  console.log('===========================================\n');
}

main().catch(err => {
  console.error('✗ Erro:', err.message);
  process.exit(1);
});
