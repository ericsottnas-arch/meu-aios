/**
 * Atualiza formulário Dr. Cleugo — v2
 * - Cria novo formulário com perguntas corrigidas + pergunta de localização
 * - Cria 3 novos criativos apontando para o novo formulário
 * - Atualiza todos os 15 anúncios para usar os novos criativos
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const PAGE_TOKEN = 'EAATzhzZB33BIBRJF4ohVnfdTVKOFSJXR4J5Tta9rjGZC30YCrr3Pd0VjNeviKrXZB62NHh2lsb7dxc9YHwefnARQ31wP3ScEZC6mRHIXGJhX7hv36RxBkIDiKMK9JWVdFjVv9Sifqz4TbcTJpnw4g2esCOkkV0ZAZC19AXHvGGXxZAgRFYttllMDZCpNSGwbmCzE2BkZD';
const API        = 'v21.0';
const BASE       = `https://graph.facebook.com/${API}`;
const AD_ACCOUNT = 'act_944253477334195';
const PAGE_ID    = '275505112301938';
const INSTAGRAM  = 'https://www.instagram.com/drcleugo/';

const VIDEO_IDS    = ['1184023537202155', '2308592932993749', '1383640443205523'];
const VIDEO_LABELS = ['V18-Recebemos-mulheres', 'V19-Celulite-pergunta', 'V20-Coxa-bumbum'];

// Todos os 15 anúncios mapeados por vídeo (índice 0, 1, 2)
const ADS_BY_VIDEO = {
  0: ['120240877435240701','120240877436350701','120240877437270701',
      '120240877442640701','120240877443010701'],
  1: ['120240877438180701','120240877438630701','120240877439160701',
      '120240877444900701','120240877445520701'],
  2: ['120240877440040701','120240877440370701','120240877440630701',
      '120240877447630701','120240877448040701'],
};

const COPY = `Através do Dream Incision, uma combinação eficaz de técnicas de descolamento subcutâneo e estimulação de colágeno.

Este procedimento não apenas proporciona resultados imediatos, mas também garante benefícios duradouros, mantendo a pele saudável e firme ao longo do tempo.

Dê o primeiro passo para alcançar a pele perfeita e a confiança que você merece.

Dr. Cleugo Porto Coelho Jr - CRM 129662

Fale conosco para descobrir como podemos te ajudar, oferecendo um cuidado seguro e personalizado.`;

async function post(endpoint, body, usePageToken = false) {
  const token = usePageToken ? PAGE_TOKEN : TOKEN;
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: token, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST /${endpoint}] ${j.error.error_user_msg || j.error.message} (code ${j.error.code})`);
  return j;
}

async function getVideoThumbnail(videoId) {
  const r = await fetch(`${BASE}/${videoId}?fields=thumbnails&access_token=${TOKEN}`);
  const j = await r.json();
  return j.thumbnails?.data?.[0]?.uri || null;
}

async function main() {
  console.log('══════════════════════════════════════════');
  console.log('  FORMULÁRIO v2 + ATUALIZAÇÃO DE CRIATIVOS');
  console.log('  Dr. Cleugo Porto — Celulite Dream Incision');
  console.log('══════════════════════════════════════════\n');

  // ── PASSO 1: Criar novo formulário ──────────────────────────────────
  console.log('PASSO 1 — Criando formulário v2...');

  const FORM = {
    name: '[Syra] Dr Cleugo — Formulário Celulite v2',
    questions: [
      {
        type: 'CUSTOM',
        key: 'grau_celulite',
        label: 'Como você descreveria a sua celulite?',
        options: [
          { key: 'grau_1', value: 'Aparece só quando aperto a pele' },
          { key: 'grau_2', value: 'Dá pra ver em pé, mas some quando deito' },
          { key: 'grau_3', value: 'Sempre visível, aquela casca de laranja mesmo' },
          { key: 'grau_4', value: 'Bem marcada e às vezes causa desconforto' },
        ],
      },
      {
        type: 'CUSTOM',
        key: 'regiao_celulite',
        label: 'Em qual região a celulite te incomoda mais?',
        options: [
          { key: 'coxas',        value: 'Coxas' },
          { key: 'bumbum',       value: 'Bumbum' },
          { key: 'coxas_bumbum', value: 'Coxas e bumbum' },
          { key: 'outra',        value: 'Outra região' },
        ],
      },
      {
        type: 'CUSTOM',
        key: 'historico_tratamento',
        label: 'Você já fez algum tratamento para celulite?',
        options: [
          { key: 'nunca',                value: 'Nunca fiz nada específico' },
          { key: 'tentei_sem_resultado', value: 'Já tentei, mas o resultado não durou' },
          { key: 'varios_sem_resultado', value: 'Fiz vários e nada adiantou de verdade' },
          { key: 'em_tratamento',        value: 'Ainda estou fazendo algum tratamento' },
        ],
      },
      {
        type: 'CUSTOM',
        key: 'unidade_preferida',
        label: 'Qual unidade fica mais perto de você?',
        options: [
          { key: 'alphaville', value: 'Alphaville' },
          { key: 'atibaia',    value: 'Atibaia' },
          { key: 'qualquer',   value: 'As duas ficam bem para mim' },
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

  const formRes = await post(`${PAGE_ID}/leadgen_forms`, {
    name:           FORM.name,
    questions:      JSON.stringify(FORM.questions),
    privacy_policy: JSON.stringify({ url: INSTAGRAM, link_text: 'Política de Privacidade' }),
    locale:         'pt_BR',
    thank_you_page: JSON.stringify(FORM.thank_you_page),
    follow_up_action_url: INSTAGRAM,
    block_display_for_non_targeted_viewer: 'false',
  }, true);

  const NEW_FORM_ID = formRes.id;
  console.log(`  ✓ Formulário v2 criado — ID: ${NEW_FORM_ID}\n`);

  // ── PASSO 2: Criar novos criativos ──────────────────────────────────
  console.log('PASSO 2 — Criando novos criativos com formulário v2...');
  const newCreativeIds = [];

  for (let i = 0; i < VIDEO_IDS.length; i++) {
    const videoId   = VIDEO_IDS[i];
    const label     = VIDEO_LABELS[i];
    const thumbnail = await getVideoThumbnail(videoId);

    const res = await post(`${AD_ACCOUNT}/adcreatives`, {
      name: `[Syra] C${i+1} [Vídeo] [Hook: ${label}] [CTA: Formulário v2]`,
      object_story_spec: JSON.stringify({
        page_id: PAGE_ID,
        video_data: {
          video_id: videoId,
          message: COPY,
          image_url: thumbnail,
          call_to_action: {
            type: 'SIGN_UP',
            value: { lead_gen_form_id: NEW_FORM_ID },
          },
        },
      }),
    });
    newCreativeIds.push(res.id);
    console.log(`  ✓ Criativo C${i+1} — ID: ${res.id}`);
  }

  // ── PASSO 3: Atualizar todos os 15 anúncios ─────────────────────────
  console.log('\nPASSO 3 — Atualizando anúncios para novo criativo...');
  let total = 0;

  for (let i = 0; i < VIDEO_IDS.length; i++) {
    const creativeId = newCreativeIds[i];
    for (const adId of ADS_BY_VIDEO[i]) {
      const j = await post(adId, { creative: JSON.stringify({ creative_id: creativeId }) });
      if (j.success) {
        console.log(`  ✓ Anúncio ${adId} → criativo C${i+1}`);
        total++;
      }
    }
  }

  console.log(`\n══════════════════════════════════════════`);
  console.log(`  CONCLUÍDO`);
  console.log(`══════════════════════════════════════════`);
  console.log(`  Formulário v2: ${NEW_FORM_ID}`);
  console.log(`  Criativos novos: ${newCreativeIds.join(', ')}`);
  console.log(`  Anúncios atualizados: ${total}/15`);
  console.log(`\n  Gerenciador de Formulários:`);
  console.log(`  https://www.facebook.com/ads/manage/pages/forms?page_id=${PAGE_ID}`);
  console.log(`══════════════════════════════════════════\n`);
}

main().catch(err => {
  console.error('\n✗ Erro:', err.message);
  process.exit(1);
});
