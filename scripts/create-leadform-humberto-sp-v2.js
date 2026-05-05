/**
 * Formulário SP v2 — HR Andrade Instituto
 * Sem context card: lead cai direto nas perguntas ao clicar no CTA
 *
 * Q1: O que você quer transformar no rosto? (segmentação de procedimento)
 * Q2: Há quanto tempo você pensa em resolver isso? (qualificação de urgência)
 * Q3: Nome completo
 * Q4: Telefone
 *
 * Após criação: atualiza todos os criativos do adset SP para apontar para este form.
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_445142030338909';
const PAGE_ID    = '104425248310435';
const BASE       = 'https://graph.facebook.com/v21.0';

// Adset SP criado anteriormente
const ADSET_ID = '120248562899320460';

// Criativos SP criados anteriormente (todos apontando para form antigo)
const CREATIVE_IDS_SP = [
  { id: '3932388770403494',  name: 'Blefaroplastia — Olhar cansado 1' },
  { id: '26324232580569485', name: 'Blefaroplastia — Pálpebra caída' },
  { id: '4291438881116597',  name: 'Lifting Facial — C1' },
  { id: '2781028145582644',  name: 'Lifting Facial — C4' },
  { id: '1289854833340302',  name: 'Lifting Facial — C3' },
  { id: '904416329295118',   name: 'Lifting Facial — C2' },
  { id: '1601381370919757',  name: 'Otoplastia — C1' },
  { id: '26375787508744121', name: 'Otoplastia — C2' },
  { id: '1454169586176050',  name: 'Otoplastia — C3' },
  { id: '2462553717520392',  name: 'Rinoplastia — C10' },
  { id: '1004393255493189',  name: 'Rinoplastia — C7' },
  { id: '3221883214658150',  name: 'Rinoplastia — C8' },
  { id: '2184325269004453',  name: 'Rinoplastia — C3' },
  { id: '1408713221013927',  name: 'Rinoplastia — C9' },
  { id: '2196282527868580',  name: 'Rinoplastia — C5' },
  { id: '984212097890101',   name: 'Rinoplastia — C2' },
  { id: '1665129148144596',  name: 'Rinoplastia — C1' },
  { id: '1507350344059412',  name: 'Rinoplastia — C6' },
  { id: '978179544563811',   name: 'Rinoplastia — C4' },
  { id: '987120703880447',   name: 'Blefaroplastia — Olhar cansado 2' },
  { id: '2480938152359070',  name: 'Blefaroplastia — Olhar cansado 3' },
  { id: '825844753333234',   name: 'Blefaroplastia — Olhar cansado 4' },
  { id: '995355616393160',   name: 'Blefaroplastia — Olhar cansado 5' },
  { id: '1541832227953954',  name: 'Blefaroplastia — Olhar cansado 6' },
  { id: '2017618395848481',  name: 'Blefaroplastia — Olhar cansado 7' },
  { id: '1913833429249170',  name: 'Blefaroplastia — Cirurgião referência' },
  { id: '2120404971868175',  name: 'Blefaroplastia — Resultado natural' },
  { id: '2004885173782053',  name: 'Blefaroplastia — Especialista' },
  { id: '1478836950316758',  name: 'Blefaroplastia — Olhar descansado' },
  { id: '1668655814130167',  name: 'Blefaroplastia — Antes e depois' },
  { id: '1325288782781197',  name: 'Blefaroplastia — Cirurgia SP' },
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

function cleanSpec(spec) {
  if (spec.video_data?.image_hash && spec.video_data?.image_url) {
    delete spec.video_data.image_url;
  }
  if (spec.link_data?.image_hash && spec.link_data?.image_url) {
    delete spec.link_data.image_url;
  }
  return spec;
}

function updateFormId(spec, formId) {
  if (spec.video_data?.call_to_action?.value) {
    spec.video_data.call_to_action.value.lead_gen_form_id = formId;
  }
  if (spec.link_data?.call_to_action?.value) {
    spec.link_data.call_to_action.value.lead_gen_form_id = formId;
  }
  return spec;
}

async function main() {
  console.log('=======================================================');
  console.log('  FORMULÁRIO SP v2 — HR ANDRADE INSTITUTO');
  console.log('  Sem context card — direto nas perguntas');
  console.log('=======================================================\n');

  // ── PASSO 1: Criar formulário v2 ────────────────────────────────────────
  console.log('PASSO 1 — Criando formulário SP v2...');

  const formPayload = {
    name:     '[Syra] HR Andrade — Avaliação Gratuita São Paulo v2 (mai/2026)',
    locale:   'pt_BR',
    questions: JSON.stringify([
      {
        type:    'CUSTOM',
        key:     'area_interesse',
        label:   'O que você quer transformar no rosto?',
        options: [
          { key: 'palpebras',  value: 'Pálpebras caídas ou olhar cansado' },
          { key: 'nariz',      value: 'Formato ou tamanho do nariz' },
          { key: 'orelhas',    value: 'Orelhas protuberantes' },
          { key: 'rosto_todo', value: 'Quero avaliar o rosto todo com o especialista' },
        ],
      },
      {
        type:    'CUSTOM',
        key:     'tempo_considerando',
        label:   'Há quanto tempo você pensa em resolver isso?',
        options: [
          { key: 'comecando',   value: 'Acabei de começar a pesquisar' },
          { key: 'alguns_meses', value: 'Faz alguns meses, ainda tenho dúvidas' },
          { key: 'ja_decidi',   value: 'Já decidi — só preciso escolher o especialista certo' },
          { key: 'resolver_logo', value: 'Quero resolver logo, mas preciso de mais informações' },
        ],
      },
      { type: 'FULL_NAME' },
      { type: 'PHONE' },
    ]),
    privacy_policy: JSON.stringify({
      url:       'https://www.humbertoandrade.com.br/',
      link_text: 'Política de Privacidade',
    }),
    thank_you_page: JSON.stringify({
      title:       'Recebemos sua solicitação.',
      body:        'Nossa equipe entra em contato pelo WhatsApp em breve para agendar sua avaliação gratuita com o HR Andrade Instituto.',
      button_type: 'VIEW_WEBSITE',
      button_text: 'Conhecer o HR Andrade Instituto',
      website_url: 'https://www.humbertoandrade.com.br/',
    }),
    follow_up_action_url: 'https://www.humbertoandrade.com.br/',
    block_display_for_non_targeted_viewer: 'false',
  };

  const formRes = await post(`${PAGE_ID}/leadgen_forms`, formPayload);
  const FORM_ID = formRes.id;
  console.log(`  ✓ Formulário criado — ID: ${FORM_ID}\n`);

  // ── PASSO 2: Recriar criativos SP apontando para o novo form ────────────
  console.log(`PASSO 2 — Recriando ${CREATIVE_IDS_SP.length} criativos com form v2...`);

  const newCreatives = [];

  for (const [i, crtv] of CREATIVE_IDS_SP.entries()) {
    process.stdout.write(`  [${i+1}/${CREATIVE_IDS_SP.length}] ${crtv.name.substring(0, 45)}... `);
    try {
      const specRes = await fetch(
        `${BASE}/${crtv.id}?fields=object_story_spec&access_token=${TOKEN}`
      ).then(r => r.json());

      if (specRes.error) { console.log(`✗ ${specRes.error.message.substring(0, 60)}`); continue; }

      let spec = specRes.object_story_spec;
      if (!spec) { console.log('✗ sem spec'); continue; }

      spec = cleanSpec(spec);
      spec = updateFormId(spec, FORM_ID);

      const res = await post(`${AD_ACCOUNT}/adcreatives`, {
        name:              `SP v2 | ${crtv.name}`,
        object_story_spec: JSON.stringify(spec),
      });

      console.log(`✓ ${res.id}`);
      newCreatives.push({ id: res.id, name: crtv.name });
    } catch(e) {
      console.log(`✗ ${e.message.substring(0, 80)}`);
    }
  }

  console.log(`\n  Criativos criados: ${newCreatives.length}/${CREATIVE_IDS_SP.length}\n`);

  // ── PASSO 3: Criar novos anúncios no adset SP ────────────────────────────
  console.log(`PASSO 3 — Criando ${newCreatives.length} anúncios no adset SP...`);

  let adCount = 0;
  for (const [i, crtv] of newCreatives.entries()) {
    process.stdout.write(`  [${i+1}/${newCreatives.length}] ${crtv.name.substring(0, 45)}... `);
    try {
      const res = await post(`${AD_ACCOUNT}/ads`, {
        name:             `SP v2 | ${crtv.name}`,
        adset_id:         ADSET_ID,
        creative:         JSON.stringify({ creative_id: crtv.id }),
        status:           'PAUSED',
        destination_type: 'ON_AD',
      });
      console.log(`✓ ${res.id}`);
      adCount++;
    } catch(e) {
      console.log(`✗ ${e.message.substring(0, 80)}`);
    }
  }

  // ── RESUMO ───────────────────────────────────────────────────────────────
  console.log('\n=======================================================');
  console.log('  ✅ FORMULÁRIO SP v2 — CONCLUÍDO');
  console.log('=======================================================');
  console.log('');
  console.log(`  Form ID v2 : ${FORM_ID}`);
  console.log(`  Criativos  : ${newCreatives.length}/31`);
  console.log(`  Anúncios   : ${adCount}/${newCreatives.length}`);
  console.log('');
  console.log('  ⚠️  Adset ainda PAUSADO — aguarda aprovação de budget (R$50/dia)');
  console.log(`\n  Gerenciador:`);
  console.log(`  https://www.facebook.com/adsmanager/manage/campaigns?act=445142030338909`);
  console.log('=======================================================\n');
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message);
  process.exit(1);
});
