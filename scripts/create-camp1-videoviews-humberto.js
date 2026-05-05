/**
 * Campanha 1 — TOPO: Video Views Procedimentos
 * [Syra] HR Andrade - Conteudo Procedimentos [Video Views] [ABO]
 *
 * Geo: Amapá (region 440)
 * Budget: R$10/dia por conjunto (ABO)
 * Posicionamento: IG Feed + Reels + Stories
 * Targeting: Advantage+ por conjunto, demographic constraints por procedimento
 * Status: PAUSED (revisar antes de ativar)
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_445142030338909';
const PAGE_ID    = '104425248310435';
const BASE       = 'https://graph.facebook.com/v21.0';

// R$10/dia em centavos
const DAILY_BUDGET = 1000;

// Geo: Amapá (estado inteiro)
const GEO_AMAPA = {
  regions: [{ key: '440' }], // Amapá, BR
};

// Posicionamentos: IG Feed + Reels + Stories
const PLACEMENTS = {
  publisher_platforms: ['instagram'],
  instagram_positions: ['stream', 'reels', 'story'],
};

// ─── Configuração dos 4 conjuntos ────────────────────────────────────────────
const AD_SETS = [
  {
    name: 'P1 [Mulheres] [30-65] [IG] [Blefaroplastia] [Amapá]',
    age_min: 30,
    age_max: 65,
    genders: [2], // Mulheres
  },
  {
    name: 'P2 [Mulheres] [28-55] [IG] [Rinoplastia] [Amapá]',
    age_min: 28,
    age_max: 55,
    genders: [2], // Mulheres
  },
  {
    name: 'P3 [Todos] [18-55] [IG] [Otoplastia] [Amapá]',
    age_min: 18,
    age_max: 55,
    genders: [1, 2], // Todos
  },
  {
    name: 'P4 [Mulheres] [40-65] [IG] [Lifting Facial] [Amapá]',
    age_min: 40,
    age_max: 65,
    genders: [2], // Mulheres
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[${endpoint}] ${j.error.message} (code ${j.error.code})`);
  return j;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  Campanha 1 — TOPO: Video Views Procedimentos');
  console.log('  Cliente: HR Andrade Instituto');
  console.log('  Geo: Amapá | Budget: R$10/dia por conjunto | ABO');
  console.log('════════════════════════════════════════════════════════════\n');

  // ── 1. Criar Campanha ──────────────────────────────────────────────────────
  console.log('[1/2] Criando campanha...');
  const campaign = await post(`${AD_ACCOUNT}/campaigns`, {
    name: '[Syra] HR Andrade - Conteudo Procedimentos [Video Views] [ABO]',
    objective: 'OUTCOME_AWARENESS',
    status: 'PAUSED',
    special_ad_categories: JSON.stringify([]),
    is_adset_budget_sharing_enabled: 'false',
  });
  console.log(`  ✓ Campanha criada: ${campaign.id}`);

  // ── 2. Criar Conjuntos ────────────────────────────────────────────────────
  console.log('\n[2/2] Criando conjuntos (ad sets)...');
  const createdAdSets = [];

  for (const adset of AD_SETS) {
    const targeting = JSON.stringify({
      age_min: adset.age_min,
      age_max: adset.age_max,
      genders: adset.genders,
      geo_locations: GEO_AMAPA,
      ...PLACEMENTS,
    });

    const result = await post(`${AD_ACCOUNT}/adsets`, {
      name: adset.name,
      campaign_id: campaign.id,
      daily_budget: DAILY_BUDGET,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'THRUPLAY',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      status: 'PAUSED',
      targeting,
    });

    console.log(`  ✓ ${adset.name}`);
    console.log(`    ID: ${result.id}`);
    createdAdSets.push({ name: adset.name, id: result.id });
  }

  // ── Resultado ────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  CAMPANHA CRIADA — PAUSADA (aguardando criativos)');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  Campanha ID : ${campaign.id}`);
  console.log(`  Nome        : [Syra] HR Andrade - Conteudo Procedimentos [Video Views] [ABO]`);
  console.log(`  Geo         : Amapá`);
  console.log(`  Budget      : R$10/dia por conjunto (ABO)`);
  console.log('\n  Conjuntos criados:');
  createdAdSets.forEach(a => console.log(`    ✓ ${a.name}\n      ID: ${a.id}`));
  console.log('\n  Próximo passo: vincular criativos (vídeos) a cada conjunto.');
  console.log('════════════════════════════════════════════════════════════\n');

  return { campaignId: campaign.id, adSets: createdAdSets };
}

main().catch(err => {
  console.error('\n✗ Erro:', err.message);
  process.exit(1);
});
