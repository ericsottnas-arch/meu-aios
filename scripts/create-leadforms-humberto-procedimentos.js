/**
 * Criar formulários de leads + conjuntos — Campanha FRIO Procedimentos
 * HR Andrade Instituto
 *
 * Formulários: Rinoplastia, Otoplastia, Lifting Facial
 * Conjuntos:   P3, P4, P5 na campanha 120248326623540460
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN       = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT  = 'act_445142030338909';
const PAGE_ID     = '104425248310435';
const BASE        = 'https://graph.facebook.com/v21.0';
const CAMPAIGN_ID = '120248326623540460';
const WA_URL      = 'https://wa.me/559681311503';

// ─── Targeting base (mesmo do P2 existente) ───────────────────────────────────
const BEHAVIORS = [
  { id: '6002714895372', name: 'Frequent Travelers' },
  { id: '6022788483583', name: 'Frequent international travelers' },
  { id: '6046096201583', name: 'People who prefer high-value goods in Brazil' },
  { id: '6071631541183', name: 'Engaged Shoppers' },
];

const INTEREST_COLAGENO = { id: '6003761051678', name: 'Colágeno (ciência)' };

const CUSTOM_LOCATION = {
  name: 'Avenida Fab, 2415, Macapá, AP, Brasil',
  address_string: 'Avenida Fab, 2415, Macapá, AP, Brasil',
  distance_unit: 'kilometer',
  latitude: 0.04154,
  longitude: -51.07157,
  radius: 12,
  primary_city_id: 258622,
  region_id: 440,
  country: 'BR',
};

const PLACEMENTS = {
  publisher_platforms: ['facebook', 'instagram'],
  facebook_positions: ['feed', 'facebook_reels', 'facebook_reels_overlay', 'notification', 'instream_video', 'story', 'search'],
  instagram_positions: ['stream', 'ig_search', 'story', 'reels', 'explore_home'],
  device_platforms: ['mobile', 'desktop'],
};

const TARGETING_FLAGS = {
  brand_safety_content_filter_levels: ['FACEBOOK_RELAXED'],
  targeting_relaxation_types: { lookalike: 0, custom_audience: 0 },
  targeting_automation: { advantage_audience: 0 },
};

// ─── Formulários ──────────────────────────────────────────────────────────────
const FORMS = [
  {
    procedimento: 'Rinoplastia',
    name: '[Syra] Dr. Humberto — Rinoplastia',
    questions: [
      {
        type: 'CUSTOM',
        key: 'incomodo_nariz',
        label: 'O que mais te incomoda no seu nariz hoje?',
        options: [
          { key: 'largura',      value: 'A largura: parece mais largo do que eu gostaria' },
          { key: 'ponta',        value: 'A ponta: não tem a definição que eu quero' },
          { key: 'perfil',       value: 'O perfil: tenho uma elevação ou desvio visível' },
          { key: 'tamanho',      value: 'O tamanho: parece desproporcional ao rosto' },
          { key: 'mais_de_uma',  value: 'Mais de uma dessas características' },
        ],
      },
      {
        type: 'CUSTOM',
        key: 'pesquisou_antes',
        label: 'Você já pesquisou sobre rinoplastia antes?',
        options: [
          { key: 'decidida',     value: 'Sim, já estou decidida' },
          { key: 'tem_duvidas',  value: 'Sim, ainda tenho dúvidas' },
          { key: 'quer_entender',value: 'Não, quero entender melhor' },
          { key: 'na_consulta',  value: 'Prefiro discutir na consulta' },
        ],
      },
      { type: 'FULL_NAME' },
      { type: 'PHONE' },
    ],
  },
  {
    procedimento: 'Otoplastia',
    name: '[Syra] Dr. Humberto — Otoplastia',
    questions: [
      {
        type: 'CUSTOM',
        key: 'motivo_orelhas',
        label: 'O que te faz pensar em corrigir as orelhas?',
        options: [
          { key: 'proeminentes',  value: 'Elas ficam proeminentes mesmo com cabelo' },
          { key: 'penteados',     value: 'Me sinto inseguro(a) em usar penteados abertos' },
          { key: 'assimetria',    value: 'A assimetria: uma fica mais saliente que a outra' },
          { key: 'ha_anos',       value: 'Tenho esse incômodo há anos e quero resolver' },
          { key: 'mais_de_uma',   value: 'Mais de uma dessas situações' },
        ],
      },
      {
        type: 'CUSTOM',
        key: 'pesquisou_antes',
        label: 'Você já pesquisou sobre otoplastia antes?',
        options: [
          { key: 'decidido',     value: 'Sim, já estou decidido(a)' },
          { key: 'tem_duvidas',  value: 'Sim, ainda tenho dúvidas' },
          { key: 'quer_entender',value: 'Não, quero entender melhor' },
          { key: 'na_consulta',  value: 'Prefiro discutir na consulta' },
        ],
      },
      { type: 'FULL_NAME' },
      { type: 'PHONE' },
    ],
  },
  {
    procedimento: 'Lifting Facial',
    name: '[Syra] Dr. Humberto — Lifting Facial',
    questions: [
      {
        type: 'CUSTOM',
        key: 'incomodo_rosto',
        label: 'O que mais te incomoda no rosto hoje?',
        options: [
          { key: 'flacidez',     value: 'Flacidez nas bochechas e na região do maxilar' },
          { key: 'sulcos',       value: 'Sulcos profundos do nariz até a boca' },
          { key: 'papada',       value: 'Papada ou perda de definição no pescoço' },
          { key: 'cansaco',      value: 'Aparência de cansaço que não passa com repouso' },
          { key: 'mais_de_uma',  value: 'Mais de uma dessas características' },
        ],
      },
      {
        type: 'CUSTOM',
        key: 'pesquisou_antes',
        label: 'Você já pesquisou sobre lifting facial antes?',
        options: [
          { key: 'decidida',     value: 'Sim, já estou decidida' },
          { key: 'tem_duvidas',  value: 'Sim, ainda tenho dúvidas' },
          { key: 'quer_entender',value: 'Não, quero entender melhor' },
          { key: 'na_consulta',  value: 'Prefiro discutir na consulta' },
        ],
      },
      { type: 'FULL_NAME' },
      { type: 'PHONE' },
    ],
  },
];

// ─── Conjuntos ────────────────────────────────────────────────────────────────
const ADSETS_CONFIG = [
  {
    procedimento: 'Rinoplastia',
    name: 'P3 [Rinoplastia] [Mulheres] [28-55] [FB+IG] [Int: Viajante/Compradores] [Santa Rita] [Amapá]',
    age_min: 28,
    age_max: 55,
    genders: [2],
    daily_budget: 3200,
  },
  {
    procedimento: 'Otoplastia',
    name: 'P4 [Otoplastia] [Todos] [18-45] [FB+IG] [Int: Viajante/Compradores] [Santa Rita] [Amapá]',
    age_min: 18,
    age_max: 45,
    genders: [1, 2],
    daily_budget: 2300,
  },
  {
    procedimento: 'Lifting Facial',
    name: 'P5 [Lifting Facial] [Mulheres] [40-65] [FB+IG] [Int: Viajante/Compradores] [Santa Rita] [Amapá]',
    age_min: 40,
    age_max: 65,
    genders: [2],
    daily_budget: 3200,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getPageToken() {
  const r = await fetch(`${BASE}/me/accounts?access_token=${TOKEN}`);
  const j = await r.json();
  const page = (j.data || []).find(p => p.id === PAGE_ID);
  if (!page) throw new Error('Página não encontrada');
  return page.access_token;
}

async function createForm(pageToken, form) {
  const body = new URLSearchParams({
    access_token: pageToken,
    name: form.name,
    questions: JSON.stringify(form.questions),
    privacy_policy: JSON.stringify({
      url: 'https://www.humbertoandrade.com.br',
      link_text: 'Política de Privacidade',
    }),
    follow_up_action_url: WA_URL,
    follow_up_action_text: 'Falar com a equipe',
    locale: 'pt_BR',
    block_display_for_non_targeted_viewer: 'false',
  });

  const r = await fetch(`${BASE}/${PAGE_ID}/leadgen_forms`, { method: 'POST', body });
  const j = await r.json();
  if (j.error) throw new Error(`[createForm] ${j.error.message} | trace: ${j.error.fbtrace_id}`);
  return j.id;
}

async function createAdset(formId, config) {
  const targeting = JSON.stringify({
    age_min: config.age_min,
    age_max: config.age_max,
    genders: config.genders,
    flexible_spec: [
      {
        interests: [INTEREST_COLAGENO],
        behaviors: BEHAVIORS,
      },
    ],
    geo_locations: {
      custom_locations: [CUSTOM_LOCATION],
      location_types: ['home', 'recent'],
    },
    ...PLACEMENTS,
    ...TARGETING_FLAGS,
  });

  const body = new URLSearchParams({
    access_token: TOKEN,
    name: config.name,
    campaign_id: CAMPAIGN_ID,
    daily_budget: config.daily_budget,
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LEAD_GENERATION',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    status: 'PAUSED',
    targeting,
    promoted_object: JSON.stringify({ page_id: PAGE_ID }),
  });

  const r = await fetch(`${BASE}/${AD_ACCOUNT}/adsets`, { method: 'POST', body });
  const j = await r.json();
  if (j.error) throw new Error(`[createAdset] ${j.error.error_user_msg || j.error.message} (${j.error.code})`);
  return j.id;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  Formulários + Conjuntos — FRIO Procedimentos HR Andrade');
  console.log('  P3 Rinoplastia | P4 Otoplastia | P5 Lifting Facial');
  console.log('════════════════════════════════════════════════════════════\n');

  const pageToken = await getPageToken();
  console.log('✓ Page token obtido\n');

  const results = [];

  for (const form of FORMS) {
    const config = ADSETS_CONFIG.find(a => a.procedimento === form.procedimento);

    console.log(`${'─'.repeat(60)}`);
    console.log(`📋 ${form.procedimento}`);
    console.log(`${'─'.repeat(60)}`);

    process.stdout.write(`  Criando formulário...`);
    const formId = await createForm(pageToken, form);
    console.log(` ID: ${formId} ✅`);

    process.stdout.write(`  Criando conjunto...`);
    const adsetId = await createAdset(formId, config);
    console.log(` ID: ${adsetId} ✅\n`);

    results.push({ procedimento: form.procedimento, formId, adsetId, adsetName: config.name });
  }

  console.log('════════════════════════════════════════════════════════════');
  console.log('  RESULTADO FINAL');
  console.log('════════════════════════════════════════════════════════════');
  results.forEach(r => {
    console.log(`\n  ${r.procedimento}`);
    console.log(`  Formulário : ${r.formId}`);
    console.log(`  Conjunto   : ${r.adsetId}`);
    console.log(`  Nome       : ${r.adsetName}`);
  });
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message);
  process.exit(1);
});
