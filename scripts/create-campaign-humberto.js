/**
 * Campanha Completa — Dr. Humberto Andrade [Macapá]
 * Objetivo: OUTCOME_LEADS — Formulário Nativo
 * Budget: R$15/dia CBO
 *
 * 3 Conjuntos:
 *   P1 — LLK Interagiram (todos os períodos)
 *   P2 — LLK Enviaram Mensagem + Salvaram Post
 *   P3 — Mulheres, interesses cirurgia plástica, vídeos apenas
 *
 * Criativos: 6 vídeos + 1 estático (Drive folder)
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const fetch = require('node-fetch').default;
const { google } = require('googleapis');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

// ─── Config ───────────────────────────────────────────────────────────────────
const TOKEN       = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT  = 'act_445142030338909';
const PAGE_ID     = '104425248310435';
const FORM_ID     = '993273069790452';
const BASE        = 'https://graph.facebook.com/v21.0';
const DRIVE_FOLDER = '15Lx6e_KcG8AgU72nuSUO0kB_ycLJGu1j';
const BUDGET_DAILY = 1500; // R$15 em centavos

// ─── Ad Sets targeting ────────────────────────────────────────────────────────
const LOOKALIKES = {
  interagiram: [
    '120248262300950460', // LLK Interagiram 7D
    '120248262096350460', // LLK Interagiram 60D
    '120248262044330460', // LLK Interagiram 60D
    '120248262241770460', // LLK Interagiram 90D
    '120248262277070460', // LLK Interagiram 180D
  ],
  mensagem_e_salvaram: [
    '120248262427330460', // LLK Enviaram Mensagem 90D
    '120248262396760460', // LLK Enviaram Mensagem 7D
    '120248262380660460', // LLK Enviaram Mensagem 60D
    '120248262361110460', // LLK Enviaram Mensagem 30D
    '120248262340270460', // LLK Enviaram Mensagem 180D
    '120248262163990460', // LLK Salvaram Post 30D
    '120248262137600460', // LLK Salvaram Post 60D
    '120248261933790460', // LLK Salvaram Post 7D
    '120248261900530460', // LLK Salvaram Post 90D
    // Salvaram Post 180D não encontrado na listagem anterior, adicionar se existir
  ],
};

// Interesses para P3 (mulheres, beleza/cosméticos/saúde)
const P3_INTERESTS = [
  { id: '6002867432822', name: 'Beauty (social concept)' },
  { id: '6002839660079', name: 'Cosméticos (cuidados pessoais)' },
  { id: '6003088846792', name: 'Beauty salons (cosmetics)' },
  { id: '6003062618007', name: 'Cosmetologia (cosméticos)' },
];

const ADSETS = [
  {
    name: 'P1 [Todos] [35-65] [FB+IG] [PP: LLK Interagiram] [Macapá, AP]',
    custom_audiences: LOOKALIKES.interagiram.map(id => ({ id })),
    genders: [],       // todos
    age_min: 35,
    age_max: 65,
    videos_only: false,
  },
  {
    name: 'P2 [Todos] [35-65] [FB+IG] [PP: LLK Enviaram Mensagem + Salvaram Post] [Macapá, AP]',
    custom_audiences: LOOKALIKES.mensagem_e_salvaram.map(id => ({ id })),
    genders: [],
    age_min: 35,
    age_max: 65,
    videos_only: false,
  },
  {
    name: 'P3 [Mulheres] [40-65] [FB+IG] [Int: Cirurgia Plástica + Rejuvenescimento] [Macapá, AP]',
    custom_audiences: [],
    genders: [2],      // 2 = mulheres
    age_min: 40,
    age_max: 65,
    interests: P3_INTERESTS,
    videos_only: true,
  },
];

const COPY = {
  message: 'Pálpebras caídas envelhecem o olhar — mesmo em quem cuida bem da pele.\n\nDr. Humberto Andrade é cirurgião plástico em Macapá especializado em blefaroplastia: a cirurgia que corrige pálpebras com naturalidade e sem exageros.\n\nAvaliação gratuita. Preencha o formulário abaixo.',
  headline: 'Avaliação Gratuita — Dr. Humberto Andrade',
  description: 'Cirurgião plástico em Macapá | Resultados naturais',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function apiGet(endpoint) {
  const r = await fetch(`${BASE}/${endpoint}&access_token=${TOKEN}`);
  const j = await r.json();
  if (j.error) throw new Error(`[GET ${endpoint}] ${j.error.message}`);
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

// ─── Drive ───────────────────────────────────────────────────────────────────
function getDriveAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_ADS_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_DOCS_REFRESH_TOKEN });
  return auth;
}

async function listDriveFiles() {
  const auth = getDriveAuth();
  const drive = google.drive({ version: 'v3', auth });
  const r = await drive.files.list({
    q: `'${DRIVE_FOLDER}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'`,
    fields: 'files(id,name,mimeType)',
    pageSize: 20,
  });
  return r.data.files;
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

// ─── Meta: Upload imagem ──────────────────────────────────────────────────────
async function uploadImage(filePath, name) {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('access_token', TOKEN);
  form.append('filename', fs.createReadStream(filePath), { filename: path.basename(filePath) });

  const r = await fetch(`${BASE}/${AD_ACCOUNT}/adimages`, {
    method: 'POST',
    body: form,
  });
  const j = await r.json();
  if (j.error) throw new Error(`[uploadImage] ${j.error.message}`);
  const hash = Object.values(j.images)[0].hash;
  console.log(`    ✓ Imagem hash: ${hash}`);
  return hash;
}

// ─── Meta: Upload vídeo ───────────────────────────────────────────────────────
async function uploadVideo(filePath, name) {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('access_token', TOKEN);
  form.append('name', name);
  form.append('source', fs.createReadStream(filePath), { filename: path.basename(filePath) });

  const r = await fetch(`${BASE}/${AD_ACCOUNT}/advideos`, {
    method: 'POST',
    body: form,
  });
  const j = await r.json();
  if (j.error) throw new Error(`[uploadVideo] ${j.error.message}`);
  const videoId = j.id;
  console.log(`    ✓ Vídeo upload iniciado — ID: ${videoId}. Aguardando processamento...`);

  // Poll até ready
  for (let i = 0; i < 30; i++) {
    await sleep(10000);
    const status = await apiGet(`${videoId}?fields=status`);
    if (status.status?.processing_progress === 100 || status.status?.video_status === 'ready') {
      console.log(`    ✓ Vídeo pronto — ID: ${videoId}`);
      return videoId;
    }
    process.stdout.write('.');
  }
  console.log(`\n    ⚠ Vídeo ${videoId} ainda processando — usando ID assim mesmo`);
  return videoId;
}

// ─── Meta: Criativo de imagem ─────────────────────────────────────────────────
async function createImageCreative(name, imageHash) {
  const res = await apiPost(`${AD_ACCOUNT}/adcreatives`, {
    name,
    object_story_spec: JSON.stringify({
      page_id: PAGE_ID,
      link_data: {
        image_hash: imageHash,
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

// ─── Meta: Criativo de vídeo ──────────────────────────────────────────────────
async function createVideoCreative(name, videoId) {
  const res = await apiPost(`${AD_ACCOUNT}/adcreatives`, {
    name,
    object_story_spec: JSON.stringify({
      page_id: PAGE_ID,
      video_data: {
        video_id: videoId,
        title: COPY.headline,
        message: COPY.message,
        call_to_action: {
          type: 'SIGN_UP',
          value: { lead_gen_form_id: FORM_ID },
        },
      },
    }),
  });
  return res.id;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('==============================================');
  console.log('  Campanha Dr. Humberto — Macapá');
  console.log('  Formulário Nativo | CBO R$15/dia');
  console.log('==============================================\n');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'humberto-'));

  // ── 1. Baixar e subir criativos ────────────────────────────────────────────
  console.log('[1/4] Carregando criativos da Drive...');
  const driveFiles = await listDriveFiles();
  console.log(`  ${driveFiles.length} arquivos encontrados`);

  const creatives = []; // { name, creativeId, isVideo }

  for (const [i, file] of driveFiles.entries()) {
    const ext = file.name.split('.').pop().toLowerCase();
    const isVideo = ['mp4', 'mov', 'avi'].includes(ext);
    const tmpPath = path.join(tmpDir, file.name);

    process.stdout.write(`  [${i+1}/${driveFiles.length}] ${file.name.substring(0, 60)}... `);
    try {
      await downloadDriveFile(file.id, tmpPath);
      console.log(`baixado`);
      process.stdout.write(`    Subindo para Meta... `);

      let creativeId;
      if (isVideo) {
        const videoId = await uploadVideo(tmpPath, file.name.replace(`.${ext}`, ''));
        creativeId = await createVideoCreative(file.name.replace(`.${ext}`, ''), videoId);
      } else {
        const hash = await uploadImage(tmpPath, file.name);
        creativeId = await createImageCreative(file.name.replace(`.${ext}`, ''), hash);
      }
      console.log(`    ✓ Creative ID: ${creativeId}`);
      creatives.push({ name: file.name, creativeId, isVideo });
    } catch(e) {
      console.log(`✗ ${e.message}`);
    }
  }

  console.log(`\n  ${creatives.length} criativos prontos\n`);

  // ── 2. Criar Campanha ──────────────────────────────────────────────────────
  console.log('[2/4] Criando campanha...');
  const campaign = await apiPost(`${AD_ACCOUNT}/campaigns`, {
    name: '[Syra] Dr. Humberto Andrade — Blefaroplastia Macapá [Formulário Instantâneo] [CBO]',
    objective: 'OUTCOME_LEADS',
    special_ad_categories: JSON.stringify([]),
    status: 'PAUSED',
    daily_budget: String(BUDGET_DAILY),
  });
  console.log(`  ✓ Campanha: ${campaign.id}\n`);

  // ── 3. Criar Conjuntos ─────────────────────────────────────────────────────
  console.log('[3/4] Criando conjuntos...');
  const adsetIds = [];

  for (const [i, adset] of ADSETS.entries()) {
    process.stdout.write(`  [${i+1}/3] ${adset.name.substring(0, 70)}... `);

    const targeting = {
      geo_locations: { cities: [{ key: '258622', radius: 50, distance_unit: 'kilometer' }] }, // Macapá
      age_min: adset.age_min,
      age_max: adset.age_max,
      publisher_platforms: ['facebook', 'instagram'],
      facebook_positions: ['feed', 'story', 'reel'],
      instagram_positions: ['stream', 'story', 'reels'],
    };

    if (adset.genders.length > 0) targeting.genders = adset.genders;
    if (adset.custom_audiences?.length > 0) targeting.custom_audiences = adset.custom_audiences;
    if (adset.interests?.length > 0) targeting.flexible_spec = [{ interests: adset.interests }];

    try {
      const res = await apiPost(`${AD_ACCOUNT}/adsets`, {
        name: adset.name,
        campaign_id: campaign.id,
        optimization_goal: 'LEAD_GENERATION',
        billing_event: 'IMPRESSIONS',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        status: 'PAUSED',
        start_time: new Date(Date.now() + 3600000).toISOString(),
        targeting: JSON.stringify(targeting),
        promoted_object: JSON.stringify({ page_id: PAGE_ID, lead_gen_form_id: FORM_ID }),
      });
      console.log(`✓ ${res.id}`);
      adsetIds.push({ id: res.id, name: adset.name, videosOnly: adset.videos_only });
    } catch(e) {
      console.log(`✗ ${e.message}`);
      adsetIds.push(null);
    }
  }

  // ── 4. Criar Anúncios ──────────────────────────────────────────────────────
  console.log('\n[4/4] Criando anúncios...');
  let adCount = 0;

  for (const adset of adsetIds.filter(Boolean)) {
    const eligibleCreatives = adset.videosOnly
      ? creatives.filter(c => c.isVideo)
      : creatives;

    for (const creative of eligibleCreatives) {
      const adName = `${creative.name.replace(/\.[^.]+$/, '')}`;
      process.stdout.write(`  [${adset.name.split(']')[0].replace('[', '')}] ${adName.substring(0, 50)}... `);
      try {
        const res = await apiPost(`${AD_ACCOUNT}/ads`, {
          name: adName,
          adset_id: adset.id,
          creative: JSON.stringify({ creative_id: creative.creativeId }),
          status: 'PAUSED',
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
  console.log('  CAMPANHA CRIADA — PAUSADA PARA REVISÃO');
  console.log('==============================================');
  console.log(`  Campanha ID : ${campaign.id}`);
  console.log(`  Budget CBO  : R$15/dia`);
  console.log(`  Conjuntos   : ${adsetIds.filter(Boolean).length}/3`);
  console.log(`  Anúncios    : ${adCount}`);
  console.log(`  Form        : ${FORM_ID}`);
  console.log('\n  → Revisar no Gerenciador de Anúncios antes de ativar');
  console.log(`  → https://www.facebook.com/adsmanager/manage/campaigns?act=${AD_ACCOUNT.replace('act_', '')}`);
  console.log('==============================================\n');

  // Limpar tmp
  try { fs.rmSync(tmpDir, { recursive: true }); } catch(e) {}
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message);
  process.exit(1);
});
