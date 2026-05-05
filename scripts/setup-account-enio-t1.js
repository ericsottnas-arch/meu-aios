/**
 * Setup completo — Nova conta [T1] Dr. Enio
 * Conta: act_1273951357510355
 * Pixel: 1298862062159814
 *
 * Cria:
 *   1 Campanha CBO — OUTCOME_LEADS
 *   1 Conjunto — Mulheres 22-45, ES, Advantage audience
 *   Estrutura pronta para receber anúncios
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const AD_ACCOUNT = 'act_1273951357510355';
const TOKEN      = process.env.META_ACCESS_TOKEN;
const API        = 'v21.0';
const BASE       = `https://graph.facebook.com/${API}`;
const PIXEL_ID   = '1298862062159814';
const PAGE_ID    = '611759308981092'; // Instituto Enio Leite
const PAGES = {
  rinomodelacao:     'https://www.drenioleite.com/rinomodelacao',
  lipoDePapada:      'https://www.drenioleite.com/lipo-de-papada',
  harmonizacao:      'https://www.drenioleite.com/harmonizacao-facial',
  paginaCaptura:     'https://www.drenioleite.com/',
};

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[${endpoint}] ${j.error.error_user_msg || j.error.message} (${j.error.code})`);
  return j;
}

async function main() {
  console.log('===========================================');
  console.log('  Setup: [T1] DR. ENIO — act_1273951357510355');
  console.log('  Pixel: 1298862062159814');
  console.log('===========================================\n');

  // ── 1. Campanha ─────────────────────────────────────────────────────────────
  console.log('[1/2] Criando campanha de leads...');
  const campaign = await post(`${AD_ACCOUNT}/campaigns`, {
    name: '[Syra] Dr. Enio Leite - Rinomodelação [Leads] [ABO]',
    objective: 'OUTCOME_LEADS',
    status: 'PAUSED',
    special_ad_categories: JSON.stringify([]),
    is_adset_budget_sharing_enabled: 'false',
  });
  console.log(`  ✓ Campanha: ${campaign.id}`);

  // ── 2. Conjunto ─────────────────────────────────────────────────────────────
  console.log('\n[2/2] Criando conjunto de anúncios...');
  const targeting = JSON.stringify({
    age_min: 22,
    age_max: 45,
    genders: [2],
    geo_locations: { regions: [{ key: '462' }] }, // Espírito Santo
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: ['feed'],
    instagram_positions: ['stream', 'story', 'reels'],
    targeting_automation: { advantage_audience: 0 },
  });

  const adset = await post(`${AD_ACCOUNT}/adsets`, {
    name: 'P1 [Mulheres] [22-45] [FB+IG] [Espírito Santo]',
    campaign_id: campaign.id,
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'OFFSITE_CONVERSIONS',
    destination_type: 'WEBSITE',
    daily_budget: 600, // R$6,00 — ABO
    bid_strategy: 'COST_CAP',
    bid_amount: 3000, // R$30/lead — ajustar após histórico de dados
    status: 'PAUSED',
    targeting,
    promoted_object: JSON.stringify({
      pixel_id: PIXEL_ID,
      custom_event_type: 'LEAD',
    }),
  });
  console.log(`  ✓ Conjunto: ${adset.id}`);

  // ── Resultado ────────────────────────────────────────────────────────────────
  console.log('\n===========================================');
  console.log('  SETUP CONCLUÍDO');
  console.log('===========================================');
  console.log(`  Pixel ID    : ${PIXEL_ID}`);
  console.log(`  Campanha ID : ${campaign.id}`);
  console.log(`  Conjunto ID : ${adset.id}`);
  console.log(`  Status      : PAUSADO (aguardando anúncios)`);
  console.log('\n  Páginas com pixel atualizado:');
  for (const [k, v] of Object.entries(PAGES)) console.log(`    ✓ ${v}`);
  console.log('\n  Próximo passo: criar anúncios com os vídeos.');
  console.log(`  Link: https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=1273951357510355`);
  console.log('===========================================\n');
}

main().catch(err => {
  console.error('✗ Erro:', err.message);
  process.exit(1);
});
