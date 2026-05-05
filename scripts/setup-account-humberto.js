/**
 * Setup Básico — Dr. Humberto Andrade [Macapá]
 * Conta: act_445142030338909
 * Página: 403747196156120
 *
 * Etapas:
 *   1. Pixel já criado: 1354726053083764
 *   2. Criar Audiências Customizadas (Website Visitors)
 *   3. Criar 4 Formulários Nativos para aquisição de pacientes (Macapá)
 *      — Blefaroplastia
 *      — Rinoplastia
 *      — Lifting de Papada
 *      — Otoplastia
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const AD_ACCOUNT = 'act_445142030338909';
const PAGE_ID    = '403747196156120';
const PIXEL_ID   = '1354726053083764';
const TOKEN      = process.env.META_ACCESS_TOKEN;
const API        = 'v21.0';
const BASE       = `https://graph.facebook.com/${API}`;
const PRIVACY_URL = 'https://www.humbertoandrade.com.br/';

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST /${endpoint}] ${j.error.error_user_msg || j.error.message} (code ${j.error.code})`);
  return j;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIÊNCIAS CUSTOMIZADAS
// ─────────────────────────────────────────────────────────────────────────────

const AUDIENCES = [
  {
    name: '[Syra] Humberto — Visitantes do Site (30 dias)',
    retention_days: 30,
    description: 'Todos que visitaram o site nos últimos 30 dias',
  },
  {
    name: '[Syra] Humberto — Visitantes do Site (60 dias)',
    retention_days: 60,
    description: 'Todos que visitaram o site nos últimos 60 dias',
  },
  {
    name: '[Syra] Humberto — Visitantes do Site (180 dias)',
    retention_days: 180,
    description: 'Todos que visitaram o site nos últimos 180 dias',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FORMULÁRIOS NATIVOS
// ─────────────────────────────────────────────────────────────────────────────

const FORMS = [
  // ─────────────────────────────────────────────────────────────────────────
  // FORMULÁRIO 1 — BLEFAROPLASTIA
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: '[Syra] Dr. Humberto — Blefaroplastia Macapá',
    questions: [
      { type: 'FULL_NAME' },
      { type: 'PHONE' },
      {
        type: 'CUSTOM',
        key: 'incomodo_olhos',
        label: 'O que mais te incomoda nos seus olhos?',
        options: [
          { key: 'palpebra_caida',   value: 'Pálpebra caída que afeta a visão' },
          { key: 'bolsas',           value: 'Bolsas ou inchaço ao redor dos olhos' },
          { key: 'olhar_cansado',    value: 'Olhar cansado ou envelhecido' },
          { key: 'excesso_pele',     value: 'Excesso de pele nas pálpebras' },
          { key: 'tudo_acima',       value: 'Tudo isso acima' },
        ],
      },
    ],
    context_card: {
      style: 'LIST_STYLE',
      title: 'Blefaroplastia com Dr. Humberto Andrade',
      content: [
        'Cirurgião plástico em Macapá',
        'Rejuvenescimento do olhar sem aparência artificial',
        'Alta no mesmo dia, resultado duradouro',
      ],
      button_text: 'Quero agendar avaliação',
    },
    thank_you_page: {
      title: 'Solicitação recebida!',
      body: 'Nossa equipe entra em contato pelo WhatsApp em breve para agendar sua avaliação.',
      button_type: 'VIEW_WEBSITE',
      button_text: 'Conhecer Dr. Humberto',
      website_url: 'https://www.humbertoandrade.com.br/',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FORMULÁRIO 2 — RINOPLASTIA
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: '[Syra] Dr. Humberto — Rinoplastia Macapá',
    questions: [
      { type: 'FULL_NAME' },
      { type: 'PHONE' },
      {
        type: 'CUSTOM',
        key: 'rino_motivo',
        label: 'O que te faz pensar na rinoplastia?',
        options: [
          { key: 'formato',      value: 'Não gosto do formato do meu nariz' },
          { key: 'tamanho',      value: 'Nariz maior ou menor do que gostaria' },
          { key: 'desvio',       value: 'Desvio de septo que afeta a respiração' },
          { key: 'harmonia',     value: 'Quero mais harmonia no rosto' },
          { key: 'ja_decidi',    value: 'Já decidi, preciso escolher o cirurgião' },
        ],
      },
    ],
    context_card: {
      style: 'LIST_STYLE',
      title: 'Rinoplastia com Dr. Humberto Andrade',
      content: [
        'Resultado natural, proporcional ao seu rosto',
        'Técnica avançada com recuperação rápida',
        'Atendimento em Macapá, AP',
      ],
      button_text: 'Quero saber mais',
    },
    thank_you_page: {
      title: 'Perfeito!',
      body: 'Dr. Humberto entra em contato pelo WhatsApp para esclarecer todas as suas dúvidas.',
      button_type: 'VIEW_WEBSITE',
      button_text: 'Ver resultados',
      website_url: 'https://www.humbertoandrade.com.br/',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FORMULÁRIO 3 — LIFTING DE PAPADA
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: '[Syra] Dr. Humberto — Lifting de Papada Macapá',
    questions: [
      { type: 'FULL_NAME' },
      { type: 'PHONE' },
      {
        type: 'CUSTOM',
        key: 'papada_incomodo',
        label: 'O que mais te incomoda na região do pescoço e papada?',
        options: [
          { key: 'papada_visivel',  value: 'Papada visível que não some com dieta' },
          { key: 'contorno',        value: 'Contorno do queixo indefinido' },
          { key: 'pele_flacida',    value: 'Pele flácida no pescoço' },
          { key: 'aparencia',       value: 'Aparência de peso extra no rosto' },
          { key: 'tudo_acima',      value: 'Tudo isso acima' },
        ],
      },
    ],
    context_card: {
      style: 'LIST_STYLE',
      title: 'Lifting de Papada com Dr. Humberto',
      content: [
        'Contorno facial definido e natural',
        'Procedimento cirúrgico seguro e preciso',
        'Alta no mesmo dia na maioria dos casos',
      ],
      button_text: 'Quero agendar avaliação',
    },
    thank_you_page: {
      title: 'Obrigado!',
      body: 'Nossa equipe entra em contato pelo WhatsApp para agendar sua consulta com Dr. Humberto.',
      button_type: 'VIEW_WEBSITE',
      button_text: 'Conhecer Dr. Humberto',
      website_url: 'https://www.humbertoandrade.com.br/',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FORMULÁRIO 4 — OTOPLASTIA
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: '[Syra] Dr. Humberto — Otoplastia Macapá',
    questions: [
      { type: 'FULL_NAME' },
      { type: 'PHONE' },
      {
        type: 'CUSTOM',
        key: 'otoplastia_situacao',
        label: 'Como você descreveria sua situação com as orelhas?',
        options: [
          { key: 'protuberantes',  value: 'Orelhas protuberantes que me incomodam há anos' },
          { key: 'assimetria',     value: 'Assimetria entre as duas orelhas' },
          { key: 'filho',          value: 'Estou buscando para meu filho' },
          { key: 'confianca',      value: 'Afeta minha autoestima e confiança' },
          { key: 'ja_decidi',      value: 'Já decidi operar, quero agendar' },
        ],
      },
    ],
    context_card: {
      style: 'LIST_STYLE',
      title: 'Otoplastia com Dr. Humberto Andrade',
      content: [
        'Correção de orelhas em adultos e crianças',
        'Resultado permanente e natural',
        'Cirurgia rápida, recuperação tranquila',
      ],
      button_text: 'Quero agendar avaliação',
    },
    thank_you_page: {
      title: 'Solicitação recebida!',
      body: 'Nossa equipe entra em contato pelo WhatsApp em breve.',
      button_type: 'VIEW_WEBSITE',
      button_text: 'Conhecer Dr. Humberto',
      website_url: 'https://www.humbertoandrade.com.br/',
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('===========================================');
  console.log('  Setup Básico — DR. HUMBERTO ANDRADE');
  console.log('  Foco: Macapá — Aquisição de Pacientes');
  console.log('  Conta: ' + AD_ACCOUNT);
  console.log('  Pixel: ' + PIXEL_ID + ' (já criado)');
  console.log('===========================================\n');

  // ── 1. Audiências Customizadas ─────────────────────────────────────────────
  console.log('[ETAPA 1/2] Criando Audiências Customizadas (Website Visitors)...');
  const audienceResults = [];

  for (const [i, aud] of AUDIENCES.entries()) {
    console.log(`  [${i + 1}/${AUDIENCES.length}] ${aud.name}`);
    try {
      const res = await post(`${AD_ACCOUNT}/customaudiences`, {
        name:                 aud.name,
        description:          aud.description,
        retention_days:       String(aud.retention_days),
        customer_file_source: 'USER_PROVIDED_ONLY',
        rule: JSON.stringify({
          inclusions: {
            operator: 'or',
            rules: [{
              event_sources: [{ id: PIXEL_ID, type: 'pixel' }],
              retention_seconds: aud.retention_days * 24 * 60 * 60,
              filter: {
                operator: 'and',
                filters: [{ field: 'event', operator: 'eq', value: 'PageView' }],
              },
            }],
          },
        }),
      });
      console.log(`    ✓ Criada — ID: ${res.id}`);
      audienceResults.push({ name: aud.name, id: res.id });
    } catch (err) {
      console.log(`    ✗ Erro: ${err.message}`);
      audienceResults.push({ name: aud.name, error: err.message });
    }
  }

  // ── 2. Formulários Nativos ─────────────────────────────────────────────────
  console.log('\n[ETAPA 2/2] Criando Formulários Nativos (Lead Forms)...');
  const formResults = [];

  for (const [i, form] of FORMS.entries()) {
    console.log(`  [${i + 1}/${FORMS.length}] ${form.name}`);

    const payload = {
      name:           form.name,
      questions:      JSON.stringify(form.questions),
      privacy_policy: JSON.stringify({ url: PRIVACY_URL, link_text: 'Política de Privacidade' }),
      locale:         'pt_BR',
      context_card:   JSON.stringify(form.context_card),
      thank_you_page: JSON.stringify(form.thank_you_page),
      follow_up_action_url: form.thank_you_page.website_url,
      block_display_for_non_targeted_viewer: 'false',
    };

    try {
      const res = await post(`${PAGE_ID}/leadgen_forms`, payload);
      console.log(`    ✓ Criado — ID: ${res.id}`);
      formResults.push({ name: form.name, id: res.id });
    } catch (err) {
      console.log(`    ✗ Erro: ${err.message}`);
      formResults.push({ name: form.name, error: err.message });
    }
  }

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log('\n===========================================');
  console.log('  SETUP CONCLUÍDO — RESUMO');
  console.log('===========================================');

  console.log('\n  PIXEL:');
  console.log(`  ID: ${PIXEL_ID}`);
  console.log(`  Nome: [Syra] Dr. Humberto Andrade - Pixel Web`);

  console.log('\n  AUDIÊNCIAS CUSTOMIZADAS:');
  audienceResults.forEach(a => {
    if (a.id) console.log(`  ✓ ${a.name} → ${a.id}`);
    else console.log(`  ✗ ${a.name} → ERRO: ${a.error}`);
  });

  console.log('\n  FORMULÁRIOS NATIVOS:');
  formResults.forEach(f => {
    if (f.id) console.log(`  ✓ ${f.name} → ${f.id}`);
    else console.log(`  ✗ ${f.name} → ERRO: ${f.error}`);
  });

  console.log('\n===========================================');
  console.log('  PRÓXIMAS ETAPAS:');
  console.log('===========================================');
  console.log('  1. Instalar o pixel no site do Dr. Humberto');
  console.log(`     Pixel ID: ${PIXEL_ID}`);
  console.log('     Copiar código do Gerenciador de Eventos\n');
  console.log('  2. Confirmar GHL Location ID para integração webhook');
  console.log('     (onboarding GHL ainda em andamento)\n');
  console.log('  3. Criar campanhas OUTCOME_LEADS em Macapá');
  console.log('     usando os formulários criados acima\n');
  console.log(`  Gerenciador de Formulários:`);
  console.log(`  https://www.facebook.com/ads/manage/pages/forms?page_id=${PAGE_ID}`);
  console.log(`  Gerenciador de Eventos (Pixel):`);
  console.log(`  https://business.facebook.com/events_manager2/list/pixel/${PIXEL_ID}`);
  console.log('===========================================\n');
}

main().catch(err => {
  console.error('✗ Erro:', err.message);
  process.exit(1);
});
