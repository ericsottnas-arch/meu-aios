/**
 * Campanha Meta Ads — Dr. Enio Leite / Rinomodelação
 * Agente: @media-buyer (Celo)
 * Data: 2026-04-07
 *
 * Estrutura:
 *   1 Campanha CBO — [Syra] Dr. Enio Leite - Rinomodelação [Conversão] [CBO]
 *   1 Conjunto   — P1 [Mulheres] [22-45] [FB+IG] [Int: Rinomodelação] [Serra - ES]
 *   5 Anúncios   — C1 a C5 (um por vídeo do Drive)
 */

const path    = require('path');
const fs      = require('fs');
const fetch   = require('node-fetch').default;
const FormData = require('form-data');
const { getDrive } = require('../lib/drive');

require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

// ── Configuração ──────────────────────────────────────────────────────────────

const AD_ACCOUNT_ID = 'act_2405811993275286';
const ACCESS_TOKEN  = process.env.META_ACCESS_TOKEN;
const API_VERSION   = 'v21.0';
const BASE_URL      = `https://graph.facebook.com/${API_VERSION}`;

const LANDING_URL   = 'https://www.drenioleite.com/rinomodelacao';
const PIXEL_ID      = '986485470374880';
const DAILY_BUDGET  = 600; // R$6,00 em centavos (Meta usa a menor unidade da moeda)

const DRIVE_FOLDER_ID = '1e5sdrFscNOS-w6m-dXtDcWSsvuXi9rD0';
const TMP_DIR = path.join(__dirname, '../.tmp-videos-enio');

// ── Copy dos anúncios (gerada pelo @copy-chef) ────────────────────────────────

const ADS_COPY = [
  {
    driveFileId: '1mXt6mQAzYHFxVEZhHShYMFPKB4EeC7Ix',
    adtagName:   'C1 [Vídeo] [Hook: Dorso e Ponta] [CTA: Agendar]',
    message:     'Ela não queria outro nariz. Queria o nariz dela, definido.\n\nSem cirurgia, sem repouso. Resultado no mesmo dia.\n\n👉 Agende sua avaliação com Dr. Enio Leite em Serra, ES.',
    headline:    'Rinomodelação em Serra, ES',
    description: 'Procedimento em 40 min. Anestesia local. Sem repouso.',
  },
  {
    driveFileId: '1-oT0ojyNGMGOt0mcNqDTm6hllGR1EMZX',
    adtagName:   'C2 [Vídeo] [Hook: Medo Nariz Porquinho] [CTA: Saiba Mais]',
    message:     'Esse medo existe quando não tem técnica.\n\nDr. Enio trabalha com harmonização estruturada — o resultado parece que você nasceu assim.\n\n👉 Veja como funciona.',
    headline:    'Natural. Sem cirurgia.',
    description: 'Técnica estruturada. Resultado que respeita o seu rosto.',
  },
  {
    driveFileId: '11OE8R30eJuO7jLdTjGakqWp9KHKMCjn4',
    adtagName:   'C3 [Vídeo] [Hook: Case Estruturado] [CTA: Saiba Mais]',
    message:     'Resultado real. Sem filtro.\n\nRinomodelação estruturada com mapeamento específico do seu rosto — não um padrão genérico.\n\n👉 Veja o caso completo.',
    headline:    'Antes e depois real',
    description: 'Case documentado. Técnica estruturada. Serra, ES.',
  },
  {
    driveFileId: '1vigfUW9pnfijfG3jncAlvXWHH8AkPTx7',
    adtagName:   'C4 [Vídeo] [Hook: Naturalidade] [CTA: Agendar]',
    message:     '40 minutos de procedimento. Anestesia local. Sem repouso.\n\nO nariz que equilibra o seu rosto — sem exagero, sem artificial.\n\n👉 Agende sua avaliação.',
    headline:    '40 min. Sem repouso.',
    description: 'Harmonização que respeita a sua naturalidade.',
  },
  {
    driveFileId: '1R-Y-QzNLpk2_bdzEAvA4L9M7fVoYXAPa',
    adtagName:   'C5 [Vídeo] [Hook: Revelar Versão] [CTA: Agendar]',
    message:     'Você não quer mudar quem você é.\n\nVocê quer se reconhecer no espelho.\n\nAgende sua avaliação com Dr. Enio Leite em Serra, ES.',
    headline:    'Agende sua avaliação',
    description: 'Rinomodelação sem cirurgia. Dr. Enio Leite.',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function metaPost(endpoint, body) {
  const url = `${BASE_URL}/${endpoint}`;
  const params = new URLSearchParams({ access_token: ACCESS_TOKEN, ...body });
  const res = await fetch(url, { method: 'POST', body: params });
  const json = await res.json();
  if (json.error) {
    const detail = JSON.stringify(json.error);
    throw new Error(`Meta API [${endpoint}]: ${json.error.message} (code ${json.error.code})\n  Detalhes: ${detail}`);
  }
  return json;
}

async function downloadFromDrive(fileId, destPath) {
  console.log(`  ↓ Baixando vídeo ${fileId} do Drive...`);
  const drive = getDrive();
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  await new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(destPath);
    res.data.pipe(dest);
    dest.on('finish', resolve);
    dest.on('error', reject);
    res.data.on('error', reject);
  });
  console.log(`  ✓ Vídeo salvo: ${destPath}`);
}

async function uploadVideoToMeta(videoPath, name) {
  console.log(`  ↑ Enviando vídeo para Meta: ${name}`);
  const form = new FormData();
  form.append('access_token', ACCESS_TOKEN);
  form.append('name', name);
  form.append('source', fs.createReadStream(videoPath));

  const res = await fetch(`${BASE_URL}/${AD_ACCOUNT_ID}/advideos`, {
    method: 'POST',
    body: form,
  });
  const json = await res.json();
  if (json.error) throw new Error(`Upload vídeo Meta: ${json.error.message}`);
  console.log(`  ✓ Vídeo no Meta: ID ${json.id}`);
  return json.id;
}

async function waitForVideoReady(videoId, maxWaitMs = 120000) {
  const start = Date.now();
  console.log(`  ⏳ Aguardando processamento do vídeo ${videoId}...`);
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(
      `${BASE_URL}/${videoId}?fields=status&access_token=${ACCESS_TOKEN}`
    );
    const json = await res.json();
    if (json.status && json.status.video_status === 'ready') {
      console.log(`  ✓ Vídeo pronto.`);
      return true;
    }
    await sleep(5000);
  }
  throw new Error(`Vídeo ${videoId} não ficou pronto em ${maxWaitMs / 1000}s`);
}

// ── Etapa 1: Criar Campanha ────────────────────────────────────────────────────

async function createCampaign() {
  console.log('\n[1/5] Criando campanha...');
  const result = await metaPost(`${AD_ACCOUNT_ID}/campaigns`, {
    name: '[Syra] Dr. Enio Leite - Rinomodelação [Tráfego] [CBO]',
    objective: 'OUTCOME_TRAFFIC',
    status: 'PAUSED', // PAUSED para revisão antes de ativar
    special_ad_categories: '[]',
    daily_budget: DAILY_BUDGET,
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
  });
  console.log(`  ✓ Campanha criada: ID ${result.id}`);
  return result.id;
}

// ── Etapa 2: Criar Conjunto ────────────────────────────────────────────────────

async function createAdSet(campaignId) {
  console.log('\n[2/5] Criando conjunto de anúncios...');

  // Targeting amplo — adequado para R$6/dia (fase de teste)
  // Advantage audience habilitado (obrigatório na API v21+)
  const targeting = JSON.stringify({
    age_min: 22,
    age_max: 45,
    genders: [2], // 2 = Mulheres
    geo_locations: {
      regions: [{ key: '462' }], // Espírito Santo
    },
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: ['feed'],
    instagram_positions: ['stream', 'story', 'reels'],
    targeting_automation: { advantage_audience: 0 },
  });

  const result = await metaPost(`${AD_ACCOUNT_ID}/adsets`, {
    name: 'P1 [Mulheres] [22-45] [FB+IG] [Espírito Santo]',
    campaign_id: campaignId,
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LANDING_PAGE_VIEWS',
    destination_type: 'WEBSITE',
    status: 'PAUSED',
    targeting,
  });
  console.log(`  ✓ Conjunto criado: ID ${result.id}`);
  return result.id;
}

// ── Etapa 3: Criar Criativos e Anúncios ───────────────────────────────────────

async function createAd(adSetId, adData, videoId, index) {
  console.log(`\n  Criando criativo para ${adData.adtagName}...`);

  // Criativo
  const creative = await metaPost(`${AD_ACCOUNT_ID}/adcreatives`, {
    name: adData.adtagName,
    object_story_spec: JSON.stringify({
      page_id: await getPageId(),
      video_data: {
        video_id: videoId,
        message: adData.message,
        call_to_action: {
          type: 'LEARN_MORE',
          value: { link: LANDING_URL },
        },
        title: adData.headline,
        link_description: adData.description,
      },
    }),
  });

  // Anúncio
  const ad = await metaPost(`${AD_ACCOUNT_ID}/ads`, {
    name: adData.adtagName,
    adset_id: adSetId,
    creative: JSON.stringify({ creative_id: creative.id }),
    status: 'PAUSED',
  });

  console.log(`  ✓ Anúncio criado: ID ${ad.id}`);
  return ad.id;
}

// ── Helper: Page ID ────────────────────────────────────────────────────────────

async function getPageId() {
  return '111763020460462'; // Dr. Enio Leite — Facebook Page ID
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('========================================');
  console.log('  Campanha: Dr. Enio Leite — Rinomodelação');
  console.log('  Ad Account:', AD_ACCOUNT_ID);
  console.log('  Budget: R$6,00/dia (teste)');
  console.log('  Status inicial: PAUSADA (para revisão)');
  console.log('========================================\n');

  if (!ACCESS_TOKEN) {
    throw new Error('META_ACCESS_TOKEN não encontrado no .env');
  }

  // Criar diretório temporário para vídeos
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const results = { campaign: null, adset: null, ads: [] };

  try {
    // 1. Campanha
    results.campaign = await createCampaign();

    // 2. Conjunto
    results.adset = await createAdSet(results.campaign);

    // 3. Vídeos + Anúncios
    console.log('\n[3/5] Baixando vídeos do Drive...');
    console.log('[4/5] Enviando vídeos para o Meta...');
    console.log('[5/5] Criando anúncios...');

    for (let i = 0; i < ADS_COPY.length; i++) {
      const ad = ADS_COPY[i];
      const videoPath = path.join(TMP_DIR, `video-c${i + 1}.mp4`);

      try {
        // Download do Drive
        await downloadFromDrive(ad.driveFileId, videoPath);

        // Upload para Meta
        const metaVideoId = await uploadVideoToMeta(videoPath, ad.adtagName);

        // Aguardar processamento
        await waitForVideoReady(metaVideoId);

        // Criar anúncio
        const adId = await createAd(results.adset, ad, metaVideoId, i + 1);
        results.ads.push({ adtagName: ad.adtagName, adId, videoId: metaVideoId });

      } catch (err) {
        console.error(`  ✗ Erro no anúncio C${i + 1}: ${err.message}`);
        results.ads.push({ adtagName: ad.adtagName, error: err.message });
      }

      // Pausa entre uploads para não sobrecarregar
      if (i < ADS_COPY.length - 1) await sleep(2000);
    }

  } finally {
    // Limpar vídeos temporários
    try {
      fs.rmSync(TMP_DIR, { recursive: true, force: true });
    } catch (_) {}
  }

  // ── Relatório Final ──
  console.log('\n========================================');
  console.log('  RESULTADO FINAL');
  console.log('========================================');
  console.log(`  Campanha ID : ${results.campaign}`);
  console.log(`  Conjunto ID : ${results.adset}`);
  console.log(`  Anúncios    :`);
  for (const ad of results.ads) {
    if (ad.error) {
      console.log(`    ✗ ${ad.adtagName}: ERRO — ${ad.error}`);
    } else {
      console.log(`    ✓ ${ad.adtagName}: ID ${ad.adId}`);
    }
  }
  console.log('\n  ⚠️  Campanha criada em modo PAUSADO.');
  console.log('  Revisar e ativar no Ads Manager antes de veicular.');
  console.log(`  Link: https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=2405811993275286`);
  console.log('========================================\n');

  // Salvar resultado em JSON
  const logPath = path.join(__dirname, '../logs/campaign-enio-rino.json');
  fs.writeFileSync(logPath, JSON.stringify({ ...results, createdAt: new Date().toISOString() }, null, 2));
  console.log(`  Log salvo em: ${logPath}`);
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message);
  process.exit(1);
});
