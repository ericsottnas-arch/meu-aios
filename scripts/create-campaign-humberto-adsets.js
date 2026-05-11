/**
 * Parte 2: Criativos + Conjuntos + Anúncios — Dr. Humberto
 * Campanha já criada: 120248263305390460
 * Vídeos já subidos para Meta — reutilizar IDs
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const fetch = require('node-fetch').default;
const { google } = require('googleapis');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_445142030338909';
const PAGE_ID    = '104425248310435';
const FORM_ID    = '993273069790452';
const CAMPAIGN_ID = '120248263305390460';
const BASE       = 'https://graph.facebook.com/v21.0';
const BUDGET_DAILY = 1500;
const DRIVE_FOLDER = '15Lx6e_KcG8AgU72nuSUO0kB_ycLJGu1j';

// Vídeos já subidos na tentativa anterior
const UPLOADED_VIDEOS = [
  { name: 'C6 [Vídeo] [Hook: Transformação] [CTA: Agendar]',        id: '1627791858262604' },
  { name: 'C5 [Vídeo] [Hook: Olhar Renovado] [CTA: Agendar]',       id: '1254466926392446' },
  { name: 'C4 [Vídeo] [Hook: Médica Especialista] [CTA: Agendar]',  id: '861720983632727' },
  { name: 'C3 [Vídeo] [Hook: Médica Especialista] [CTA: Agendar]',  id: '1637698074117796' },
  { name: 'C2 [Vídeo] [Hook: Depoimento de Paciente] [CTA: Agendar]', id: '1962514671032056' },
  { name: 'C1 [Vídeo] [Hook: Blefaroplastia] [CTA: Agendar]',       id: '894228150333819' },
];

const LOOKALIKES = {
  interagiram: [
    '120248262300950460',
    '120248262044330460',
    '120248262096350460',
    '120248262241770460',
    '120248262277070460',
  ],
  mensagem_e_salvaram: [
    '120248262427330460',
    '120248262396760460',
    '120248262380660460',
    '120248262361110460',
    '120248262340270460',
    '120248262163990460',
    '120248262137600460',
    '120248261933790460',
    '120248261900530460',
  ],
};

const P3_INTERESTS = [
  { id: '6002867432822', name: 'Beauty (social concept)' },
  { id: '6002839660079', name: 'Cosméticos (cuidados pessoais)' },
  { id: '6003088846792', name: 'Beauty salons (cosmetics)' },
  { id: '6003062618007', name: 'Cosmetologia (cosméticos)' },
];

const ADSETS_CONFIG = [
  {
    name: 'P1 [Todos] [35-65] [FB+IG] [PP: LLK Interagiram] [Macapá, AP]',
    custom_audiences: LOOKALIKES.interagiram.map(id => ({ id })),
    genders: [],
    age_min: 35, age_max: 65,
    videos_only: false,
  },
  {
    name: 'P2 [Todos] [35-65] [FB+IG] [PP: LLK Enviaram Mensagem + Salvaram Post] [Macapá, AP]',
    custom_audiences: LOOKALIKES.mensagem_e_salvaram.map(id => ({ id })),
    genders: [],
    age_min: 35, age_max: 65,
    videos_only: false,
  },
  {
    name: 'P3 [Mulheres] [40-65] [FB+IG] [Int: Beleza + Cosméticos] [Macapá, AP]',
    custom_audiences: [],
    genders: [2],
    age_min: 40, age_max: 65,
    interests: P3_INTERESTS,
    videos_only: true,
  },
];

const COPY = {
  message: 'Pálpebras caídas envelhecem o olhar — mesmo em quem cuida bem da pele.\n\nDr. Humberto Andrade é cirurgião plástico em Macapá especializado em blefaroplastia: a cirurgia que corrige pálpebras com naturalidade e sem exageros.\n\nAvaliação gratuita. Preencha o formulário abaixo.',
  headline: 'Avaliação Gratuita — Dr. Humberto Andrade',
  description: 'Cirurgião plástico em Macapá | Resultados naturais',
  page_url: 'https://www.humbertoandrade.com.br/',
};

async function apiGet(endpoint) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE}/${endpoint}`;
  const sep = url.includes('?') ? '&' : '?';
  const r = await fetch(`${url}${sep}access_token=${TOKEN}`);
  const j = await r.json();
  if (j.error) throw new Error(`[GET] ${j.error.message}`);
  return j;
}

async function apiPost(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST ${endpoint}] ${j.error.error_user_msg || j.error.message} (code ${j.error.code})`);
  return j;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getDriveAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_ADS_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_DOCS_REFRESH_TOKEN });
  return auth;
}

async function downloadDriveFile(fileId, dest) {
  const auth = getDriveAuth();
  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(dest);
    res.data.pipe(ws);
    ws.on('finish', resolve);
    ws.on('error', reject);
  });
}

async function getVideoThumbnail(videoId) {
  const res = await apiGet(`${videoId}?fields=thumbnails`);
  const thumbs = res.thumbnails?.data;
  if (thumbs && thumbs.length > 0) return thumbs[0].uri;
  return null;
}

async function createVideoCreative(name, videoId) {
  const thumbUrl = await getVideoThumbnail(videoId);
  const videoData = {
    video_id: videoId,
    title: COPY.headline,
    message: COPY.message,
    call_to_action: {
      type: 'SIGN_UP',
      value: { lead_gen_form_id: FORM_ID },
    },
  };
  if (thumbUrl) videoData.image_url = thumbUrl;

  const res = await apiPost(`${AD_ACCOUNT}/adcreatives`, {
    name,
    object_story_spec: JSON.stringify({
      page_id: PAGE_ID,
      video_data: videoData,
    }),
  });
  return res.id;
}

async function uploadAndCreateImageCreative(name, tmpPath) {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('access_token', TOKEN);
  form.append('filename', fs.createReadStream(tmpPath), { filename: path.basename(tmpPath) });

  const r = await fetch(`${BASE}/${AD_ACCOUNT}/adimages`, { method: 'POST', body: form });
  const j = await r.json();
  if (j.error) throw new Error(`[uploadImage] ${j.error.message}`);
  const hash = Object.values(j.images)[0].hash;

  const res = await apiPost(`${AD_ACCOUNT}/adcreatives`, {
    name,
    object_story_spec: JSON.stringify({
      page_id: PAGE_ID,
      link_data: {
        image_hash: hash,
        link: COPY.page_url,
        message: COPY.message,
        name: COPY.headline,
        description: COPY.description,
        call_to_action: {
          type: 'SIGN_UP',
          value: { lead_gen_form_id: FORM_ID },
        },
      },
    }),
  });
  return res.id;
}

async function main() {
  console.log('==============================================');
  console.log('  Criativos + Conjuntos + Anúncios');
  console.log('  Campanha: ' + CAMPAIGN_ID);
  console.log('==============================================\n');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'humberto-'));

  // ── 1. Criativos de vídeo (reuso IDs já subidos) ───────────────────────────
  console.log('[1/3] Criando criativos de vídeo...');
  const creatives = [];

  for (const [i, vid] of UPLOADED_VIDEOS.entries()) {
    process.stdout.write(`  [${i+1}/${UPLOADED_VIDEOS.length}] ${vid.name.substring(0,55)}... `);
    try {
      const cid = await createVideoCreative(vid.name, vid.id);
      console.log(`✓ ${cid}`);
      creatives.push({ name: vid.name, creativeId: cid, isVideo: true });
    } catch(e) {
      console.log(`✗ ${e.message}`);
    }
  }

  // ── 1b. Criativo de imagem (baixar da Drive) ───────────────────────────────
  console.log('\n  Baixando imagem estática da Drive...');
  const auth = getDriveAuth();
  const drive = google.drive({ version: 'v3', auth });
  const files = await drive.files.list({
    q: `'${DRIVE_FOLDER}' in parents and trashed=false and mimeType contains 'image'`,
    fields: 'files(id,name)',
  });

  for (const file of files.data.files) {
    const tmpPath = path.join(tmpDir, file.name);
    process.stdout.write(`  ${file.name.substring(0,55)}... `);
    try {
      await downloadDriveFile(file.id, tmpPath);
      const name = file.name.replace(/\.[^.]+$/, '');
      const cid = await uploadAndCreateImageCreative(name, tmpPath);
      console.log(`✓ ${cid}`);
      creatives.push({ name, creativeId: cid, isVideo: false });
    } catch(e) {
      console.log(`✗ ${e.message}`);
    }
  }

  console.log(`\n  Total: ${creatives.length} criativos criados\n`);

  // ── 2. Criar Conjuntos ─────────────────────────────────────────────────────
  console.log('[2/3] Criando conjuntos de anúncios...');
  const adsets = [];

  for (const [i, cfg] of ADSETS_CONFIG.entries()) {
    process.stdout.write(`  [${i+1}/3] ${cfg.name.substring(0,65)}... `);

    const targeting = {
      geo_locations: {
        cities: [{ key: '258622', radius: 50, distance_unit: 'kilometer' }],
      },
      age_min: cfg.age_min,
      age_max: cfg.age_max,
      publisher_platforms: ['facebook', 'instagram'],
      facebook_positions: ['feed', 'story', 'facebook_reels'],
      instagram_positions: ['stream', 'story', 'reels'],
    };

    if (cfg.genders?.length > 0)          targeting.genders = cfg.genders;
    if (cfg.custom_audiences?.length > 0)  targeting.custom_audiences = cfg.custom_audiences;
    if (cfg.interests?.length > 0)         targeting.flexible_spec = [{ interests: cfg.interests }];

    try {
      const res = await apiPost(`${AD_ACCOUNT}/adsets`, {
        name: cfg.name,
        campaign_id: CAMPAIGN_ID,
        optimization_goal: 'LEAD_GENERATION',
        billing_event: 'IMPRESSIONS',
        status: 'PAUSED',
        targeting: JSON.stringify(targeting),
        promoted_object: JSON.stringify({ page_id: PAGE_ID }),
        start_time: Math.floor(Date.now() / 1000) + 3600,
      });
      console.log(`✓ ${res.id}`);
      adsets.push({ id: res.id, name: cfg.name, videosOnly: cfg.videos_only });
    } catch(e) {
      console.log(`✗ ${e.message}`);
    }
  }

  // ── 3. Criar Anúncios ──────────────────────────────────────────────────────
  console.log('\n[3/3] Criando anúncios...');
  let adCount = 0;

  for (const adset of adsets) {
    const eligible = adset.videosOnly
      ? creatives.filter(c => c.isVideo)
      : creatives;

    for (const creative of eligible) {
      const adName = creative.name.substring(0, 50);
      process.stdout.write(`  [${adset.name.match(/P\d/)[0]}] ${adName.substring(0,45)}... `);
      try {
        const res = await apiPost(`${AD_ACCOUNT}/ads`, {
          name: adName,
          adset_id: adset.id,
          creative: JSON.stringify({ creative_id: creative.creativeId }),
          status: 'PAUSED',
          destination_type: 'ON_AD',
        });
        console.log(`✓ ${res.id}`);
        adCount++;
      } catch(e) {
        console.log(`✗ ${e.message}`);
      }
    }
  }

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log('\n==============================================');
  console.log('  CONCLUÍDO — CAMPANHA PAUSADA');
  console.log('==============================================');
  console.log(`  Campanha    : ${CAMPAIGN_ID}`);
  console.log(`  Budget CBO  : R$15/dia`);
  console.log(`  Conjuntos   : ${adsets.length}/3`);
  console.log(`  Anúncios    : ${adCount}`);
  console.log(`  Criativos   : ${creatives.length}`);
  console.log('\n  Conjuntos criados:');
  adsets.forEach(a => console.log(`  - ${a.id}  ${a.name.substring(0,50)}`));
  console.log('\n  → Revisar e ativar no Gerenciador:');
  console.log(`  → https://www.facebook.com/adsmanager/manage/campaigns?act=445142030338909`);
  console.log('==============================================\n');

  try { fs.rmSync(tmpDir, { recursive: true }); } catch(e) {}
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message);
  process.exit(1);
});
