/**
 * Cria Formulário Nativo Geral — Dr. Humberto Andrade
 * Página: 403747196156120
 *
 * Formulário único de pré-qualificação cobrindo todos os procedimentos.
 * Foco nos criativos de blefaroplastia mas aceita qualquer intenção.
 *
 * 4 perguntas:
 *   1. Nome completo
 *   2. Telefone
 *   3. Qual área te incomoda? (segmenta procedimento)
 *   4. Há quanto tempo considera? (qualifica urgência)
 *
 * ATENÇÃO: Requer acesso de admin na página 403747196156120.
 * Para liberar: Dr. Humberto deve adicionar o BM 3701479013300328
 * como parceiro da página com permissão de anunciante/admin.
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const PAGE_ID     = '104425248310435'; // Dr Humberto Andrade (Syra BM partner)
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
  name: '[Syra] Dr. Humberto — Avaliação Gratuita Macapá v2',

  questions: [
    {
      type:  'CUSTOM',
      key:   'area_incomodo',
      label: 'O que mais te incomoda no seu rosto hoje?',
      options: [
        { key: 'palpebras',  value: 'Pálpebras caídas ou olhar cansado' },
        { key: 'nariz',      value: 'Formato ou tamanho do nariz' },
        { key: 'papada',     value: 'Papada ou contorno do queixo' },
        { key: 'orelhas',    value: 'Orelhas protuberantes' },
        { key: 'avaliacao',  value: 'Quero avaliar o rosto todo com o médico' },
      ],
    },
    {
      type:  'CUSTOM',
      key:   'tempo_considerando',
      label: 'Há quanto tempo você pensa em resolver isso?',
      options: [
        { key: 'decidi_agora',  value: 'Decidi agora, quero agendar logo' },
        { key: 'faz_tempo',     value: 'Faz tempo, mas ainda tenho dúvidas' },
        { key: 'pesquisando',   value: 'Ainda estou pesquisando opções' },
        { key: 'so_medico',     value: 'Já pesquisei, só preciso escolher o médico certo' },
      ],
    },
    { type: 'FULL_NAME' },
    { type: 'PHONE' },
  ],

  context_card: {
    style:   'LIST_STYLE',
    title:   'Avaliação gratuita com Dr. Humberto Andrade',
    content: [
      'Cirurgião plástico em Macapá, AP',
      'Resultados naturais, sem exageros',
      'Mais de 10 anos de experiência em cirurgia plástica',
    ],
    button_text: 'Quero agendar avaliação',
  },

  thank_you_page: {
    title:        'Solicitação recebida!',
    body:         'Nossa equipe entra em contato pelo WhatsApp em breve para agendar sua avaliação gratuita com Dr. Humberto.',
    button_type:  'VIEW_WEBSITE',
    button_text:  'Conhecer Dr. Humberto',
    website_url:  'https://www.humbertoandrade.com.br/',
  },
};

async function main() {
  console.log('===========================================');
  console.log('  Formulário Nativo Geral — DR. HUMBERTO');
  console.log('  Pré-qualificação — todos os procedimentos');
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
  console.log('  → Campanha: OUTCOME_LEADS (Captação de Cadastros)');
  console.log('  → Vincular este form em todos os conjuntos da campanha de Macapá');
  console.log('  → Todos os criativos (Bléfo + genéricos) usam este mesmo form');
  console.log(`\n  Gerenciador de Formulários:`);
  console.log(`  https://www.facebook.com/ads/manage/pages/forms?page_id=${PAGE_ID}`);
  console.log('===========================================\n');
}

main().catch(err => {
  console.error('\n✗ Erro:', err.message);
  if (err.message.includes('insufficient privileges')) {
    console.error('\n⚠  ACESSO À PÁGINA NECESSÁRIO');
    console.error('   O sistema user não tem admin na página ' + PAGE_ID);
    console.error('   Solicite ao Dr. Humberto:');
    console.error('   1. Acessar Configurações da Página → Acessos e Ativos');
    console.error('   2. Adicionar o BM 3701479013300328 como parceiro com acesso de anunciante');
    console.error('   3. Após confirmar, rodar este script novamente');
  }
  process.exit(1);
});
