/**
 * Cria 3 Formulários Nativos (Instant Forms) — Dr. Enio Leite [T1]
 * Campanha 3 — MORNO: Retargeting
 * Página: Instituto Enio Leite (611759308981092)
 *
 * Formulários:
 *   1. Geral         → criativos C3 (HOF) e C4 (Avaliação Gratuita)
 *   2. Rinomodelação → criativo C1 (Depoimento Paciente Rino)
 *   3. Lipo de Papada → criativo C2 (Você já Considerou a Lipo?)
 *
 * IMPORTANTE: Para usar formulários nativos, a campanha precisa ter
 * objetivo OUTCOME_LEADS (Captação de Cadastros), não Tráfego.
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const PAGE_ID     = '611759308981092';
const TOKEN       = process.env.META_ACCESS_TOKEN;
const API         = 'v21.0';
const BASE        = `https://graph.facebook.com/${API}`;
const PRIVACY_URL = 'https://www.drenioleite.com/';

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST /${endpoint}] ${j.error.error_user_msg || j.error.message} (code ${j.error.code})`);
  return j;
}

const FORMS = [
  // ─────────────────────────────────────────────────────────────────────────
  // FORMULÁRIO 1 — GERAL
  // Criativos: C3 (Resultados Reais HOF) + C4 (Avaliação Gratuita)
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: '[Syra] Dr. Enio — Formulário Geral',
    questions: [
      { type: 'FULL_NAME' },
      { type: 'PHONE' },
      {
        type: 'CUSTOM',
        key: 'o_que_te_incomoda',
        label: 'O que te incomoda mais hoje?',
        options: [
          { key: 'nariz',       value: 'O formato do meu nariz' },
          { key: 'papada',      value: 'Papada ou contorno do queixo' },
          { key: 'olhos',       value: 'Olhos que parecem cansados' },
          { key: 'labios',      value: 'Labios sem volume ou definicao' },
          { key: 'contorno',    value: 'Rosto que perdeu o contorno' },
          { key: 'firmeza',     value: 'Pele que perdeu a firmeza' },
          { key: 'avaliacao',   value: 'Ainda nao sei, quero uma avaliacao' },
        ],
      },
    ],
    context_card: {
      style: 'LIST_STYLE',
      title: 'Avaliacao gratuita com Dr. Enio Leite',
      content: [
        'Especialista em Harmonizacao Orofacial',
        'Resultados naturais, sem cirurgia',
        'Mais de 500 pacientes em Serra, ES',
      ],
      button_text: 'Quero agendar',
    },
    thank_you_page: {
      title: 'Solicitacao recebida!',
      body: 'Nossa equipe entra em contato pelo WhatsApp em breve.',
      button_type: 'VIEW_WEBSITE',
      button_text: 'Conhecer Dr. Enio',
      website_url: 'https://www.drenioleite.com/',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FORMULÁRIO 2 — RINOMODELAÇÃO
  // Criativo: C1 (Depoimento Paciente Rinomodelacao)
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: '[Syra] Dr. Enio — Formulário Rinomodelacao',
    questions: [
      { type: 'FULL_NAME' },
      { type: 'PHONE' },
      {
        type: 'CUSTOM',
        key: 'rino_momento',
        label: 'Ha quanto tempo voce considera a rinomodelacao?',
        options: [
          { key: 'faz_tempo',    value: 'Faz tempo, mas tenho duvidas' },
          { key: 'decidi_agora', value: 'Decidi agora, quero agendar logo' },
          { key: 'entender',     value: 'Quero entender melhor antes' },
          { key: 'so_medico',    value: 'Ja pesquisei, so preciso escolher o medico' },
        ],
      },
    ],
    context_card: {
      style: 'LIST_STYLE',
      title: 'Rinomodelacao com Dr. Enio Leite',
      content: [
        'Sem cirurgia, sem corte, sem internacao',
        'Procedimento de 30 a 45 minutos',
        'Resultado imediato e natural',
      ],
      button_text: 'Quero saber mais',
    },
    thank_you_page: {
      title: 'Perfeito!',
      body: 'Dr. Enio entra em contato pelo WhatsApp para tirar suas duvidas.',
      button_type: 'VIEW_WEBSITE',
      button_text: 'Ver resultados',
      website_url: 'https://www.drenioleite.com/rinomodelacao',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FORMULÁRIO 3 — LIPO DE PAPADA
  // Criativo: C2 (Voce ja Considerou a Lipo de Papada?)
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: '[Syra] Dr. Enio — Formulário Lipo de Papada',
    questions: [
      { type: 'FULL_NAME' },
      { type: 'PHONE' },
      {
        type: 'CUSTOM',
        key: 'lipo_incomodo',
        label: 'O que mais te incomoda na regiao da papada?',
        options: [
          { key: 'peso_extra',  value: 'A aparencia de peso extra no rosto' },
          { key: 'contorno',    value: 'O contorno do queixo indefinido' },
          { key: 'fotos',       value: 'A papada que aparece nas fotos' },
          { key: 'tudo',        value: 'Tudo isso acima' },
        ],
      },
    ],
    context_card: {
      style: 'LIST_STYLE',
      title: 'Lipo de Papada sem cirurgia',
      content: [
        'Procedimento minimamente invasivo',
        'Contorno facial definido e natural',
        'Alta no mesmo dia',
      ],
      button_text: 'Quero agendar',
    },
    thank_you_page: {
      title: 'Obrigado!',
      body: 'Nossa equipe entra em contato pelo WhatsApp para agendar sua avaliacao.',
      button_type: 'VIEW_WEBSITE',
      button_text: 'Ver resultados',
      website_url: 'https://www.drenioleite.com/lipo-de-papada',
    },
  },
];

async function main() {
  console.log('===========================================');
  console.log('  Formulários Nativos — DR. ENIO LEITE');
  console.log('  Campanha 3 — Retargeting MORNO');
  console.log('  Página: ' + PAGE_ID);
  console.log('===========================================\n');

  const results = [];

  for (const [i, form] of FORMS.entries()) {
    console.log(`[${i + 1}/${FORMS.length}] Criando: ${form.name}`);

    const payload = {
      name:            form.name,
      questions:       JSON.stringify(form.questions),
      privacy_policy:  JSON.stringify({ url: PRIVACY_URL, link_text: 'Politica de Privacidade' }),
      locale:          'pt_BR',
      context_card:    JSON.stringify(form.context_card),
      thank_you_page:  JSON.stringify(form.thank_you_page),
      follow_up_action_url: form.thank_you_page.website_url,
      block_display_for_non_targeted_viewer: 'false',
    };

    const res = await post(`${PAGE_ID}/leadgen_forms`, payload);
    console.log(`  ✓ Criado — ID: ${res.id}`);
    results.push({ name: form.name, id: res.id });
  }

  console.log('\n===========================================');
  console.log('  FORMULÁRIOS CRIADOS COM SUCESSO');
  console.log('===========================================');
  results.forEach(r => {
    console.log(`\n  ${r.name}`);
    console.log(`  ID: ${r.id}`);
  });

  console.log('\n===========================================');
  console.log('  PRÓXIMOS PASSOS NO GERENCIADOR:');
  console.log('===========================================');
  console.log('  ATENÇÃO: Campanha 3 precisa ter objetivo');
  console.log('  "Captação de Cadastros" (OUTCOME_LEADS),');
  console.log('  não "Tráfego" — formulário nativo exige esse objetivo.\n');
  console.log('  Mapeamento criativo → formulário:');
  console.log('  C1 (Depoimento Rino)    → Formulário Rinomodelacao');
  console.log('  C2 (Lipo de Papada)     → Formulário Lipo de Papada');
  console.log('  C3 (HOF)                → Formulário Geral');
  console.log('  C4 (Avaliação Gratuita) → Formulário Geral\n');
  console.log('  Gerenciador de Formulários:');
  console.log(`  https://www.facebook.com/ads/manage/pages/forms?page_id=${PAGE_ID}`);
  console.log('===========================================\n');
}

main().catch(err => {
  console.error('✗ Erro:', err.message);
  process.exit(1);
});
