/**
 * Cria Formulário Nativo — Blefaroplastia João Pessoa — Dr. Humberto Andrade
 * Página: 104425248310435
 *
 * Formulário exclusivo para blefaroplastia em João Pessoa.
 * Perguntas de qualificação ANTES dos campos de contato (HIGHER_INTENT).
 *
 * 2 perguntas + contato:
 *   1. O que mais te incomoda nos seus olhos hoje? (segmenta queixa)
 *   2. Você já pesquisou sobre blefaroplastia antes? (qualifica urgência)
 *   3. Nome completo
 *   4. WhatsApp
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const PAGE_ID     = '104425248310435';
const TOKEN       = process.env.META_ACCESS_TOKEN;
const API         = 'v21.0';
const BASE        = `https://graph.facebook.com/${API}`;
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

const FORM = {
  name: '[Syra] Dr. Humberto — Blefaroplastia João Pessoa',

  questions: [
    {
      type:    'CUSTOM',
      key:     'incomodo_olhos',
      label:   'O que mais te incomoda nos seus olhos hoje?',
      options: [
        { key: 'palpebra_caida',    value: 'Pálpebra caída que pesa o olhar' },
        { key: 'aparencia_cansaco', value: 'Aparência de cansaço mesmo descansada' },
        { key: 'excesso_pele',      value: 'Excesso de pele na pálpebra superior' },
        { key: 'bolsas_inchaco',    value: 'Bolsas ou inchaço nas pálpebras inferiores' },
        { key: 'mais_de_uma',       value: 'Mais de uma das opções acima' },
      ],
    },
    {
      type:    'CUSTOM',
      key:     'pesquisou_antes',
      label:   'Você já pesquisou sobre blefaroplastia antes?',
      options: [
        { key: 'decidida',      value: 'Sim, já estou decidida' },
        { key: 'tem_duvidas',   value: 'Sim, ainda tenho dúvidas' },
        { key: 'quer_entender', value: 'Não, quero entender melhor' },
        { key: 'na_consulta',   value: 'Prefiro discutir na consulta' },
      ],
    },
    { type: 'FULL_NAME' },
    { type: 'PHONE' },
  ],

  context_card: {
    style:   'LIST_STYLE',
    title:   'Avaliação para Blefaroplastia em João Pessoa',
    content: [
      'Resultados naturais que rejuvenescem o olhar',
      'Atendimento personalizado do início ao pós-operatório',
    ],
    button_text: 'Quero agendar minha avaliação',
  },

  thank_you_page: {
    title:       'Recebemos!',
    body:        'Nossa equipe entra em contato em até 24h pelo WhatsApp para agendar sua avaliação com o Dr. Humberto.',
    button_type: 'VIEW_WEBSITE',
    button_text: 'Conhecer Dr. Humberto',
    website_url: 'https://www.humbertoandrade.com.br/',
  },
};

async function main() {
  console.log('===========================================');
  console.log('  Formulário Blefaroplastia João Pessoa');
  console.log('  DR. HUMBERTO ANDRADE');
  console.log('  Página: ' + PAGE_ID);
  console.log('===========================================\n');

  console.log(`Criando: ${FORM.name}`);

  const payload = {
    name:            FORM.name,
    questions:       JSON.stringify(FORM.questions),
    privacy_policy:  JSON.stringify({ url: PRIVACY_URL, link_text: 'Política de Privacidade' }),
    locale:          'pt_BR',
    context_card:    JSON.stringify(FORM.context_card),
    thank_you_page:  JSON.stringify(FORM.thank_you_page),
    follow_up_action_url: FORM.thank_you_page.website_url,
    block_display_for_non_targeted_viewer: 'false',
  };

  const res = await post(`${PAGE_ID}/leadgen_forms`, payload);

  console.log(`\n✓ Formulário criado — ID: ${res.id}`);
  console.log('\n===========================================');
  console.log('  PRÓXIMOS PASSOS:');
  console.log('===========================================');
  console.log(`  Form ID: ${res.id}`);
  console.log('  → Vincular no conjunto: P5 [Mulheres] [30-65] [IG] [Blefaroplastia] [João Pessoa]');
  console.log(`  → Conjunto existente no Topo Video Views (120248466250950460)`);
  console.log(`\n  Gerenciador de Formulários:`);
  console.log(`  https://www.facebook.com/ads/manage/pages/forms?page_id=${PAGE_ID}`);
  console.log('===========================================\n');
}

main().catch(err => {
  console.error('\n✗ Erro:', err.message);
  process.exit(1);
});
