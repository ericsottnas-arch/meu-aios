/**
 * Novo público SP — Campanha [Syra] Procedimento Publico Frio [Formulário Instantâneo] [ABO]
 * Campanha ID: 120248326623540460
 * Conta: act_445142030338909
 *
 * Objetivo: Criar formulário geral para SP + novo adset segmentado nas
 * regiões premium de SP (Pinheiros, Itaim, Jardins, Morumbi, Campo Belo,
 * Vila Olímpia, Berrini e proximidades) para o procedimento dias 05 e 06/05.
 *
 * Geo: Custom location centrado em Itaim Bibi (-23.5858, -46.6749) raio 8km
 *      — cobre todos os bairros solicitados.
 *
 * Criativos: todos os 31 existentes na campanha (todos os procedimentos).
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN       = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT  = 'act_445142030338909';
const PAGE_ID     = '104425248310435';
const CAMPAIGN_ID = '120248326623540460';
const BASE        = 'https://graph.facebook.com/v21.0';

// Todos os criativos existentes na campanha (todos os procedimentos)
const CREATIVE_IDS = [
  { id: '1440821967733270', name: 'Lifting Facial — C1' },
  { id: '1306094531497499', name: 'Lifting Facial — C4' },
  { id: '1293308366067916', name: 'Lifting Facial — C3' },
  { id: '873637939027747',  name: 'Lifting Facial — C2' },
  { id: '1004098572159630', name: 'Otoplastia — C1' },
  { id: '1520765809654240', name: 'Otoplastia — C2' },
  { id: '1218284676884798', name: 'Otoplastia — C3' },
  { id: '841537118966151',  name: 'Rinoplastia — C10' },
  { id: '1285239413051941', name: 'Rinoplastia — C7' },
  { id: '1608183456963583', name: 'Rinoplastia — C8' },
  { id: '1698037851365667', name: 'Rinoplastia — C3' },
  { id: '4313870905542602', name: 'Rinoplastia — C9' },
  { id: '1281918407220568', name: 'Rinoplastia — C5' },
  { id: '1307539947950730', name: 'Rinoplastia — C2' },
  { id: '850749904703151',  name: 'Rinoplastia — C1' },
  { id: '1840212153318494', name: 'Rinoplastia — C6' },
  { id: '1274041224703591', name: 'Rinoplastia — C4' },
  { id: '829549232910166',  name: 'Blefaroplastia — Olhar cansado 1' },
  { id: '4293491997539289', name: 'Blefaroplastia — Olhar cansado 2' },
  { id: '909605451912944',  name: 'Blefaroplastia — Olhar cansado 3' },
  { id: '1285141676923833', name: 'Blefaroplastia — Olhar cansado 4' },
  { id: '1692713381886079', name: 'Blefaroplastia — Olhar cansado 5' },
  { id: '1477192980817855', name: 'Blefaroplastia — Olhar cansado 6' },
  { id: '1607027297254613', name: 'Blefaroplastia — Olhar cansado 7' },
  { id: '1491391932577104', name: 'Blefaroplastia — Cirurgião referência' },
  { id: '1859020158137904', name: 'Blefaroplastia — Resultado natural' },
  { id: '1600305092104141', name: 'Blefaroplastia — Especialista' },
  { id: '1289950903088270', name: 'Blefaroplastia — Olhar descansado' },
  { id: '1985190058755646', name: 'Blefaroplastia — Antes e depois' },
  { id: '952119730547754',  name: 'Blefaroplastia — Pálpebra caída' },
  { id: '1295923689170334', name: 'Blefaroplastia — Cirurgia SP' },
];

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST ${endpoint}] ${j.error.error_user_msg || j.error.message} (code ${j.error.code})`);
  return j;
}

// ─── FORMULÁRIO SP — GERAL TODOS OS PROCEDIMENTOS ─────────────────────────

const FORM = {
  name: '[Syra] HR Andrade — Avaliação Gratuita São Paulo (mai/2026)',

  questions: [
    {
      type:    'CUSTOM',
      key:     'area_interesse',
      label:   'O que você quer transformar no rosto?',
      options: [
        { key: 'palpebras', value: 'Pálpebras caídas ou olhar cansado' },
        { key: 'nariz',     value: 'Formato ou tamanho do nariz' },
        { key: 'orelhas',   value: 'Orelhas protuberantes' },
        { key: 'rosto_todo', value: 'Quero avaliar o rosto todo com o especialista' },
      ],
    },
    {
      type:    'CUSTOM',
      key:     'disponibilidade_maio',
      label:   'Você tem disponibilidade nos dias 5 ou 6 de maio em São Paulo?',
      options: [
        { key: 'dia5',   value: 'Tenho disponibilidade no dia 5' },
        { key: 'dia6',   value: 'Tenho disponibilidade no dia 6' },
        { key: 'ambos',  value: 'Tenho disponibilidade nos dois dias' },
        { key: 'outra',  value: 'Prefiro outra data — quero ser avisada de próximos eventos' },
      ],
    },
    { type: 'FULL_NAME' },
    { type: 'PHONE' },
  ],

  context_card: {
    style:   'LIST_STYLE',
    title:   'Avaliação gratuita com HR Andrade Instituto — São Paulo',
    content: [
      'Vagas disponíveis: 5 e 6 de maio em São Paulo',
      'Cirurgias faciais com resultado natural e sem exageros',
      'Avaliação presencial sem compromisso',
    ],
    button_text: 'Quero garantir minha vaga',
  },

  thank_you_page: {
    title:       'Solicitação recebida!',
    body:        'Nossa equipe vai entrar em contato pelo WhatsApp para confirmar sua avaliação e garantir sua vaga nos dias 5 ou 6 de maio.',
    button_type: 'VIEW_WEBSITE',
    button_text: 'Conhecer o HR Andrade Instituto',
    website_url: 'https://www.humbertoandrade.com.br/',
  },
};

// ─── GEO — CUSTOM LOCATION: ITAIM BIBI (CENTRO DO CLUSTER) ────────────────
// Raio 8km cobre: Pinheiros, Jardins, Vila Olímpia, Campo Belo,
//                 Morumbi, Berrini, Marginal Pinheiros e arredores

const TARGETING_SP = {
  geo_locations: {
    location_types:   ['home', 'recent'],
    custom_locations: [
      {
        latitude:       -23.5858,
        longitude:      -46.6749,
        radius:         8,
        distance_unit:  'kilometer',
        address_string: 'Itaim Bibi, São Paulo, SP, Brasil',
      },
    ],
  },
  age_min: 30,
  age_max: 65,
  genders: [2],  // Mulheres
  publisher_platforms: ['facebook', 'instagram'],
  facebook_positions:  ['feed', 'story'],
  instagram_positions: ['stream', 'story', 'explore', 'reels'],
  device_platforms:    ['mobile'],
  targeting_automation: { advantage_audience: 0 },
};

async function main() {
  console.log('=======================================================');
  console.log('  NOVO PÚBLICO SP — HR ANDRADE');
  console.log('  Campanha: [Syra] Procedimento Publico Frio [ABO]');
  console.log('  Geo: Pinheiros / Itaim / Jardins / Morumbi / Berrini');
  console.log('  Procedimento: 5 e 6 de maio — São Paulo');
  console.log('=======================================================\n');

  // ── STEP 1: Formulário SP já criado ─────────────────────────────────────
  console.log('PASSO 1 — Formulário SP (já criado na execução anterior)');
  const FORM_ID = '1454665208911055';
  console.log(`  ✓ Form ID: ${FORM_ID}`);

  // ── STEP 2: Criar adset SP ───────────────────────────────────────────────
  console.log('\nPASSO 2 — Criando adset SP...');

  const adsetName = 'P6 [Mulheres] [30-65] [FB+IG] [SP: Pinheiros/Itaim/Jardins/Morumbi] [Todos Procedimentos] [maio/2026]';

  const adsetRes = await post(`${AD_ACCOUNT}/adsets`, {
    name:               adsetName,
    campaign_id:        CAMPAIGN_ID,
    optimization_goal:  'LEAD_GENERATION',
    billing_event:      'IMPRESSIONS',
    bid_strategy:       'LOWEST_COST_WITHOUT_CAP',
    daily_budget:       String(5000), // R$50/dia — sujeito a aprovação
    status:             'PAUSED',
    destination_type:   'ON_AD',
    targeting:          JSON.stringify(TARGETING_SP),
    promoted_object:    JSON.stringify({ page_id: PAGE_ID }),
  });

  const ADSET_ID = adsetRes.id;
  console.log(`  ✓ Adset criado — ID: ${ADSET_ID}`);
  console.log(`    Nome: ${adsetName}`);

  // ── STEP 3: Criar criativos novos apontando para form SP ────────────────
  // Os criativos existentes apontam para o formulário de Macapá.
  // Precisamos criar duplicatas que apontem para o form SP.
  console.log(`\nPASSO 3 — Criando criativos vinculados ao formulário SP...`);
  console.log(`  Form ID SP: ${FORM_ID}\n`);

  // Buscar dados dos criativos existentes para clonar
  const newCreativeIds = [];

  for (const [i, crtv] of CREATIVE_IDS.entries()) {
    process.stdout.write(`  [${i+1}/${CREATIVE_IDS.length}] ${crtv.name.substring(0, 45)}... `);
    try {
      // Buscar spec do criativo original
      const specRes = await fetch(
        `${BASE}/${crtv.id}?fields=name,object_story_spec&access_token=${TOKEN}`
      ).then(r => r.json());

      if (specRes.error) {
        console.log(`✗ fetch: ${specRes.error.message}`);
        continue;
      }

      const spec = specRes.object_story_spec;
      if (!spec) { console.log('✗ sem object_story_spec'); continue; }

      // Atualizar lead_gen_form_id para o form SP
      if (spec.video_data?.call_to_action?.value) {
        spec.video_data.call_to_action.value.lead_gen_form_id = FORM_ID;
      } else if (spec.link_data?.call_to_action?.value) {
        spec.link_data.call_to_action.value.lead_gen_form_id = FORM_ID;
      }

      const newCreative = await post(`${AD_ACCOUNT}/adcreatives`, {
        name:               `SP | ${crtv.name}`,
        object_story_spec:  JSON.stringify(spec),
      });

      console.log(`✓ ${newCreative.id}`);
      newCreativeIds.push({ id: newCreative.id, name: crtv.name });
    } catch(e) {
      console.log(`✗ ${e.message.substring(0, 80)}`);
    }
  }

  console.log(`\n  Total criativos SP criados: ${newCreativeIds.length}/${CREATIVE_IDS.length}`);

  // ── STEP 4: Criar anúncios no adset SP ──────────────────────────────────
  console.log('\nPASSO 4 — Criando anúncios no adset SP...');

  let adCount = 0;
  for (const [i, crtv] of newCreativeIds.entries()) {
    process.stdout.write(`  [${i+1}/${newCreativeIds.length}] ${crtv.name.substring(0, 45)}... `);
    try {
      const adRes = await post(`${AD_ACCOUNT}/ads`, {
        name:        `SP | ${crtv.name}`,
        adset_id:    ADSET_ID,
        creative:    JSON.stringify({ creative_id: crtv.id }),
        status:      'PAUSED',
        destination_type: 'ON_AD',
      });
      console.log(`✓ ${adRes.id}`);
      adCount++;
    } catch(e) {
      console.log(`✗ ${e.message.substring(0, 80)}`);
    }
  }

  // ── RESUMO ───────────────────────────────────────────────────────────────
  console.log('\n=======================================================');
  console.log('  ✅ ESTRUTURA CRIADA — TUDO PAUSADO');
  console.log('=======================================================');
  console.log('');
  console.log('  FORMULÁRIO SP:');
  console.log(`    ID: ${FORM_ID}`);
  console.log(`    Nome: ${FORM.name}`);
  console.log('');
  console.log('  ADSET SP:');
  console.log(`    ID: ${ADSET_ID}`);
  console.log(`    Nome: ${adsetName}`);
  console.log(`    Geo: Itaim/Pinheiros/Jardins/Morumbi (8km)`);
  console.log(`    Budget: R$50/dia (PAUSADO — aguarda aprovação)`);
  console.log('');
  console.log(`  ANÚNCIOS: ${adCount}/${CREATIVE_IDS.length}`);
  console.log('');
  console.log('  ⚠️  AÇÕES NECESSÁRIAS:');
  console.log('  → Aprovar budget R$50/dia');
  console.log('  → Ativar adset no Gerenciador após aprovação');
  console.log('');
  console.log(`  Gerenciador:`);
  console.log(`  https://www.facebook.com/adsmanager/manage/campaigns?act=445142030338909`);
  console.log('=======================================================\n');
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message);
  process.exit(1);
});
