/**
 * Cria Formulário Nativo — Dr. Cleugo Porto
 * Página: 275505112301938
 *
 * Formulário de pré-qualificação para o procedimento Dream Incision (celulite).
 * Tipo: Alta Intenção — 3 perguntas de qualificação + dados de contato.
 *
 * Perguntas:
 *   1. Grau da celulite (autoclassificação por descrição)
 *   2. Região (coxa, bumbum, ambas)
 *   3. Histórico de tratamentos anteriores
 *   + Nome completo + WhatsApp (auto-fill)
 *
 * Tela de agradecimento: direciona para @drcleugo no Instagram.
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const PAGE_ID     = '275505112301938';
const PAGE_TOKEN  = 'EAATzhzZB33BIBRJF4ohVnfdTVKOFSJXR4J5Tta9rjGZC30YCrr3Pd0VjNeviKrXZB62NHh2lsb7dxc9YHwefnARQ31wP3ScEZC6mRHIXGJhX7hv36RxBkIDiKMK9JWVdFjVv9Sifqz4TbcTJpnw4g2esCOkkV0ZAZC19AXHvGGXxZAgRFYttllMDZCpNSGwbmCzE2BkZD';
const API         = 'v21.0';
const BASE        = `https://graph.facebook.com/${API}`;
const INSTAGRAM   = 'https://www.instagram.com/drcleugo/';

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: PAGE_TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST /${endpoint}] ${j.error.error_user_msg || j.error.message} (code ${j.error.code})`);
  return j;
}

const FORM = {
  name: '[Syra] Dr Cleugo — Formulário Celulite',

  questions: [
    {
      type:  'CUSTOM',
      key:   'grau_celulite',
      label: 'Como você descreveria a sua celulite?',
      options: [
        { key: 'grau_1', value: 'Aparece só quando aperto a pele' },
        { key: 'grau_2', value: 'Visível em pé, mas some quando deito' },
        { key: 'grau_3', value: 'Sempre visível, com aspecto de casca de laranja' },
        { key: 'grau_4', value: 'Bem marcada, com irregularidades e desconforto' },
      ],
    },
    {
      type:  'CUSTOM',
      key:   'regiao_celulite',
      label: 'Em qual região a celulite te incomoda mais?',
      options: [
        { key: 'coxas',        value: 'Coxas' },
        { key: 'bumbum',       value: 'Bumbum' },
        { key: 'coxas_bumbum', value: 'Coxas e bumbum' },
        { key: 'outra',        value: 'Outra região' },
      ],
    },
    {
      type:  'CUSTOM',
      key:   'historico_tratamento',
      label: 'Você já fez algum tratamento para celulite antes?',
      options: [
        { key: 'nunca',                value: 'Nunca fiz nada específico' },
        { key: 'tentei_sem_resultado', value: 'Já tentei, mas o resultado não durou' },
        { key: 'varios_sem_resultado', value: 'Fiz vários tratamentos sem resultado real' },
        { key: 'em_tratamento',        value: 'Estou fazendo tratamento agora' },
      ],
    },
    { type: 'FULL_NAME' },
    { type: 'PHONE' },
  ],

  thank_you_page: {
    title:       'Pronto, suas respostas chegaram até nós.',
    body:        'A equipe do Dr. Cleugo vai analisar o seu caso e entrar em contato pelo WhatsApp em breve. Fique de olho.',
    button_type: 'VIEW_WEBSITE',
    button_text: 'Ver resultados no Instagram',
    website_url: INSTAGRAM,
  },
};

async function main() {
  console.log('===========================================');
  console.log('  Formulário Nativo — DR. CLEUGO PORTO');
  console.log('  Celulite — Dream Incision');
  console.log('  Página: ' + PAGE_ID);
  console.log('===========================================\n');

  console.log(`Criando: ${FORM.name}`);

  const payload = {
    name:            FORM.name,
    questions:       JSON.stringify(FORM.questions),
    privacy_policy:  JSON.stringify({ url: INSTAGRAM, link_text: 'Política de Privacidade' }),
    locale:          'pt_BR',
    thank_you_page:  JSON.stringify(FORM.thank_you_page),
    follow_up_action_url: INSTAGRAM,
    block_display_for_non_targeted_viewer: 'false',
  };

  const res = await post(`${PAGE_ID}/leadgen_forms`, payload);

  console.log(`\n✓ Formulário criado — ID: ${res.id}`);
  console.log('\n===========================================');
  console.log('  PRÓXIMOS PASSOS:');
  console.log('===========================================');
  console.log(`  Form ID: ${res.id}`);
  console.log('  → Campanha FRIO: objetivo OUTCOME_LEADS (Formulário Instantâneo)');
  console.log('  → Campanha MORNO: mesmo formulário como destino');
  console.log(`\n  Gerenciador de Formulários:`);
  console.log(`  https://www.facebook.com/ads/manage/pages/forms?page_id=${PAGE_ID}`);
  console.log('===========================================\n');
}

main().catch(err => {
  console.error('\n✗ Erro:', err.message);
  process.exit(1);
});
