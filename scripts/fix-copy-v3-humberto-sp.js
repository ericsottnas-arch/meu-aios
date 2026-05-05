/**
 * Fix Copy v3 — HR Andrade SP
 *
 * Corrige TODOS os 31 anúncios do adset SP de uma vez:
 * 1. Cria formulário v3 (thank you sem "avaliação gratuita")
 * 2. Reescreve copy de todos os criativos:
 *    - Remove localização (Macapá, Amapá — sem citar SP no body)
 *    - Remove "avaliação gratuita" / "consulta gratuita"
 *    - Formata com \n\n entre parágrafos
 *    - Frases curtas, voz Eric Santos, sem travessão
 * 3. Recria 31 criativos com copy nova + form v3
 * 4. Atualiza cada anúncio para o novo criativo
 * 5. Aplica UTM + pixel (offsite_conversion) em todos
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_445142030338909';
const PAGE_ID    = '104425248310435';
const PIXEL_ID   = '1354726053083764';
const BASE       = 'https://graph.facebook.com/v21.0';
const ADSET_ID   = '120248562899320460';

const UTM_TAGS = 'utm_source={{placement}}&utm_medium=cpc&utm_campaign={{campaign.name}}{{campaign.id}}&utm_content={{adset.name}}{{adset.id}}&utm_term={{ad.name}}_{{ad.id}}';

const TRACKING_SPECS = JSON.stringify([
  { 'action.type': ['offsite_conversion'], fb_pixel: [PIXEL_ID] },
]);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function get(endpoint) {
  const sep = endpoint.includes('?') ? '&' : '?';
  const r = await fetch(`${BASE}/${endpoint}${sep}access_token=${TOKEN}`);
  const j = await r.json();
  if (j.error) throw new Error(j.error.error_user_msg || j.error.message);
  return j;
}

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST ${endpoint}] ${j.error.error_user_msg || j.error.message} (code ${j.error.code})`);
  return j;
}

// ── Copy por procedimento (voz Eric Santos) ──────────────────────────────────
// Regras: frases curtas, sem travessao, sem localizacao, sem "avaliacao gratuita"
// \n\n entre paragrafos

const COPY = {
  blefaroplastia: {
    message: 'Palpebras caidas e olheiras pesadas envelhecem o rosto.\n\nA blefaroplastia corrige isso com precisao.\n\nMenos de uma hora de cirurgia. Recuperacao discreta.\n\nPreencha o formulario abaixo.',
    link_description: 'Conheca o HR Andrade Instituto.',
  },
  rinoplastia: {
    message: 'O nariz define a harmonia do rosto.\n\nQuando esta fora de proporcao, desequilibra tudo.\n\nA rinoplastia entrega resultado natural. Sem exageros.\n\nPreencha o formulario abaixo.',
    link_description: 'Conheca o HR Andrade Instituto.',
  },
  otoplastia: {
    message: 'Orelhas protuberantes chamam atencao pelo motivo errado.\n\nA otoplastia corrige isso com uma cirurgia simples e rapida.\n\nResultado permanente. Cicatriz oculta.\n\nPreencha o formulario abaixo.',
    link_description: 'Conheca o HR Andrade Instituto.',
  },
  lifting: {
    message: 'Com o tempo, o rosto perde firmeza e definicao.\n\nO lifting facial restaura o contorno sem aparencia de operado.\n\nResultado natural. Envelhecimento revertido.\n\nPreencha o formulario abaixo.',
    link_description: 'Conheca o HR Andrade Instituto.',
  },
};

function detectProcedure(name) {
  const n = name.toLowerCase();
  if (n.includes('blefaroplastia') || n.includes('palpebra') || n.includes('pálpebra') || n.includes('olhar')) return 'blefaroplastia';
  if (n.includes('rinoplastia') || n.includes('rino')) return 'rinoplastia';
  if (n.includes('otoplastia') || n.includes('orelha')) return 'otoplastia';
  if (n.includes('lifting')) return 'lifting';
  return null;
}

function fixTitle(title) {
  if (!title) return title;
  return title
    .replace(/\s*[—–]\s*/g, ' ')           // remove travessao (em/en dash)
    .replace(/\bno Amapá\b/gi, '')
    .replace(/\bno Amapa\b/gi, '')
    .replace(/\bem Macapá\b/gi, '')
    .replace(/\bem Macapa\b/gi, '')
    .replace(/\bde Macapá\b/gi, '')
    .replace(/\bde Macapa\b/gi, '')
    .replace(/\bMacapá\b/gi, '')
    .replace(/\bMacapa\b/gi, '')
    .replace(/\bAmapá\b/gi, '')
    .replace(/\bAmapa\b/gi, '')
    .replace(/\bno São Paulo\b/gi, '')      // corrige reescrita ruim de pass anterior
    .replace(/\bem São Paulo\b/gi, '')
    .replace(/\bde São Paulo\b/gi, '')
    .replace(/\bno Sao Paulo\b/gi, '')
    .replace(/\bem Sao Paulo\b/gi, '')
    .replace(/\bde Sao Paulo\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function applyFix(spec, procedure, formId) {
  const copy = COPY[procedure];

  if (spec.video_data) {
    const vd = spec.video_data;
    if (vd.title !== undefined)            vd.title            = fixTitle(vd.title);
    if (vd.message !== undefined && copy)  vd.message          = copy.message;
    if (vd.link_description !== undefined) vd.link_description = copy ? copy.link_description : fixTitle(vd.link_description);
    if (vd.image_hash && vd.image_url)     delete vd.image_url;
    if (vd.call_to_action?.value)          vd.call_to_action.value.lead_gen_form_id = formId;
  }

  if (spec.link_data) {
    const ld = spec.link_data;
    if (ld.name !== undefined && copy)        ld.name        = fixTitle(ld.name);
    if (ld.message !== undefined && copy)     ld.message     = copy.message;
    if (ld.description !== undefined)         ld.description = copy ? copy.link_description : fixTitle(ld.description);
    if (ld.image_hash && ld.image_url)        delete ld.image_url;
    if (ld.call_to_action?.value)             ld.call_to_action.value.lead_gen_form_id = formId;
  }

  return spec;
}

async function main() {
  console.log('=======================================================');
  console.log('  FIX COPY v3 — HR ANDRADE SP');
  console.log('  Remove: localizacao, avaliacao gratuita, travessao');
  console.log('  Aplica: voz Eric Santos + espacamento + form v3');
  console.log('=======================================================\n');

  // ── PASSO 1: Criar formulário v3 ─────────────────────────────────────────
  console.log('PASSO 1 — Criando formulario v3...');

  const formRes = await post(`${PAGE_ID}/leadgen_forms`, {
    name:   '[Syra] HR Andrade SP v3 (mai/2026)',
    locale: 'pt_BR',
    questions: JSON.stringify([
      {
        type:    'CUSTOM',
        key:     'area_interesse',
        label:   'O que voce quer transformar no rosto?',
        options: [
          { key: 'palpebras',  value: 'Palpebras caidas ou olhar cansado' },
          { key: 'nariz',      value: 'Formato ou tamanho do nariz' },
          { key: 'orelhas',    value: 'Orelhas protuberantes' },
          { key: 'rosto_todo', value: 'Quero uma avaliacao completa com o especialista' },
        ],
      },
      {
        type:    'CUSTOM',
        key:     'tempo_considerando',
        label:   'Ha quanto tempo voce pensa em resolver isso?',
        options: [
          { key: 'comecando',    value: 'Acabei de comecar a pesquisar' },
          { key: 'alguns_meses', value: 'Faz alguns meses, ainda tenho duvidas' },
          { key: 'ja_decidi',    value: 'Ja decidi. So preciso escolher o especialista certo.' },
          { key: 'resolver_logo', value: 'Quero resolver logo, mas preciso de mais informacoes' },
        ],
      },
      { type: 'FULL_NAME' },
      { type: 'PHONE' },
    ]),
    privacy_policy: JSON.stringify({
      url:       'https://www.humbertoandrade.com.br/',
      link_text: 'Politica de Privacidade',
    }),
    thank_you_page: JSON.stringify({
      title:       'Recebemos sua solicitacao.',
      body:        'Nossa equipe entra em contato pelo WhatsApp em breve.',
      button_type: 'VIEW_WEBSITE',
      button_text: 'Conhecer o HR Andrade Instituto',
      website_url: 'https://www.humbertoandrade.com.br/',
    }),
    follow_up_action_url: 'https://www.humbertoandrade.com.br/',
    block_display_for_non_targeted_viewer: 'false',
  });

  const FORM_V3 = formRes.id;
  console.log(`  Formulario v3 criado — ID: ${FORM_V3}\n`);

  // ── PASSO 2: Buscar anúncios do adset SP ──────────────────────────────────
  console.log('PASSO 2 — Buscando anuncios do adset SP...');
  const adsRes = await get(`${ADSET_ID}/ads?fields=id,name,creative{id,name,object_story_spec}&limit=100`);
  const ads = adsRes.data;
  console.log(`  ${ads.length} anuncios encontrados\n`);

  // ── PASSO 3: Recriar criativos + atualizar ads + UTM+pixel ────────────────
  console.log('PASSO 3 — Recriando criativos e aplicando UTM+pixel...\n');

  let fixed = 0, skipped = 0, errors = 0;

  for (const [i, ad] of ads.entries()) {
    const creative = ad.creative;
    if (!creative?.object_story_spec) {
      console.log(`  [${i+1}/${ads.length}] ${ad.name.substring(0, 50)} — sem spec, pulando`);
      skipped++;
      continue;
    }

    const label = ad.name.substring(0, 55);
    process.stdout.write(`  [${i+1}/${ads.length}] ${label}...\n    `);

    try {
      const procedure = detectProcedure(ad.name);
      if (!procedure) {
        process.stdout.write(`[AVISO: procedimento nao detectado] `);
      } else {
        process.stdout.write(`[${procedure}] `);
      }

      const spec = JSON.parse(JSON.stringify(creative.object_story_spec));
      const fixedSpec = applyFix(spec, procedure, FORM_V3);

      // Limpar nome do criativo (remover "SP v2 |" prefix se existir)
      const baseName = (creative.name || ad.name)
        .replace(/^SP v[0-9]+ \| /, '')
        .replace(/^SP \| /, '');

      // Criar novo criativo v3
      const newCreative = await post(`${AD_ACCOUNT}/adcreatives`, {
        name:              `SP v3 | ${baseName}`,
        object_story_spec: JSON.stringify(fixedSpec),
      });
      process.stdout.write(`criativo ${newCreative.id} `);

      // Atualizar anuncio para novo criativo
      await post(ad.id, {
        creative: JSON.stringify({ creative_id: newCreative.id }),
      });
      process.stdout.write(`| ad atualizado `);

      // Aplicar UTM + pixel
      await post(ad.id, {
        url_tags:       UTM_TAGS,
        tracking_specs: TRACKING_SPECS,
      });
      process.stdout.write(`| UTM+pixel OK\n`);

      fixed++;
      if (i % 5 === 4) {
        process.stdout.write('  (pausa 3s...)\n');
        await sleep(3000);
      }

    } catch(e) {
      process.stdout.write(`\n    ERRO: ${e.message.substring(0, 100)}\n`);
      errors++;
    }
  }

  console.log('\n=======================================================');
  console.log('  CONCLUIDO');
  console.log('=======================================================');
  console.log(`  Corrigidos: ${fixed}/${ads.length}`);
  console.log(`  Pulados:    ${skipped}`);
  console.log(`  Erros:      ${errors}`);
  console.log(`\n  Form v3:    ${FORM_V3}`);
  console.log(`  Pixel:      ${PIXEL_ID}`);
  console.log(`  Adset:      ${ADSET_ID}`);
  console.log('\n  Adset PAUSADO. Aprovar budget R$50/dia para ativar.');
  console.log('=======================================================\n');
}

main().catch(err => {
  console.error('\n Erro fatal:', err.message);
  process.exit(1);
});
