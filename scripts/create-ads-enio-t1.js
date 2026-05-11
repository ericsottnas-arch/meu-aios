/**
 * Criar anúncios — [T1] DR. ENIO / Rinomodelação
 * Conta: act_1273951357510355
 * Adset: 120239340300170582
 *
 * Fluxo: Download Drive → Upload Meta → Criativo com UTM → Anúncio
 *
 * UTMs por criativo:
 *   utm_source=facebook
 *   utm_medium=cpc
 *   utm_campaign=rinomodelacao
 *   utm_content={slug-do-criativo}  ← identifica qual vídeo gerou o lead
 */

const path     = require('path');
const fs       = require('fs');
const fetch    = require('node-fetch').default;
const FormData = require('form-data');
const { getDrive } = require('../lib/drive');

require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const AD_ACCOUNT  = 'act_1273951357510355';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const API_VERSION  = 'v21.0';
const BASE_URL     = `https://graph.facebook.com/${API_VERSION}`;

const ADSET_ID    = '120239340300170582';
const PAGE_ID     = '611759308981092'; // Instituto Enio Leite
const BASE_URL_LP = 'https://www.drenioleite.com/rinomodelacao';

const TMP_DIR = path.join(__dirname, '../.tmp-videos-enio-t1');

// ── Criativos com UTMs individuais ────────────────────────────────────────────

function buildUrl(utmContent) {
  return `${BASE_URL_LP}?utm_source=facebook&utm_medium=cpc&utm_campaign=rinomodelacao&utm_content=${utmContent}`;
}

const ADS = [
  {
    driveFileId: '1mXt6mQAzYHFxVEZhHShYMFPKB4EeC7Ix',
    adtagName:   'C1 [Vídeo] [Hook: Dorso e Ponta] [CTA: Agendar]',
    utmContent:  'c1-dorso-ponta',
    message:     'Ela não queria outro nariz. Queria o nariz dela, definido.\n\nSem cirurgia, sem repouso. Resultado no mesmo dia.\n\n👉 Agende sua avaliação com Dr. Enio Leite em Serra, ES.',
    headline:    'Rinomodelação em Serra, ES',
    description: 'Procedimento em 40 min. Anestesia local. Sem repouso.',
  },
  {
    driveFileId: '1-oT0ojyNGMGOt0mcNqDTm6hllGR1EMZX',
    adtagName:   'C2 [Vídeo] [Hook: Medo Nariz Porquinho] [CTA: Saiba Mais]',
    utmContent:  'c2-medo-porquinho',
    message:     'Esse medo existe quando não tem técnica.\n\nDr. Enio trabalha com harmonização estruturada — o resultado parece que você nasceu assim.\n\n👉 Veja como funciona.',
    headline:    'Natural. Sem cirurgia.',
    description: 'Técnica estruturada. Resultado que respeita o seu rosto.',
  },
  {
    driveFileId: '11OE8R30eJuO7jLdTjGakqWp9KHKMCjn4',
    adtagName:   'C3 [Vídeo] [Hook: Case Estruturado] [CTA: Saiba Mais]',
    utmContent:  'c3-case-estruturado',
    message:     'Resultado real. Sem filtro.\n\nRinomodelação estruturada com mapeamento específico do seu rosto — não um padrão genérico.\n\n👉 Veja o caso completo.',
    headline:    'Antes e depois real',
    description: 'Case documentado. Técnica estruturada. Serra, ES.',
  },
  {
    driveFileId: '1vigfUW9pnfijfG3jncAlvXWHH8AkPTx7',
    adtagName:   'C4 [Vídeo] [Hook: Naturalidade] [CTA: Agendar]',
    utmContent:  'c4-naturalidade',
    message:     '40 minutos de procedimento. Anestesia local. Sem repouso.\n\nO nariz que equilibra o seu rosto — sem exagero, sem artificial.\n\n👉 Agende sua avaliação.',
    headline:    '40 min. Sem repouso.',
    description: 'Harmonização que respeita a sua naturalidade.',
  },
  {
    driveFileId: '1R-Y-QzNLpk2_bdzEAvA4L9M7fVoYXAPa',
    adtagName:   'C5 [Vídeo] [Hook: Revelar Versão] [CTA: Agendar]',
    utmContent:  'c5-revelar-versao',
    message:     'Você não quer mudar quem você é.\n\nVocê quer se reconhecer no espelho.\n\nAgende sua avaliação com Dr. Enio Leite em Serra, ES.',
    headline:    'Agende sua avaliação',
    description: 'Rinomodelação sem cirurgia. Dr. Enio Leite.',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function metaPost(endpoint, body) {
  const r = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: ACCESS_TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`${j.error.error_user_msg || j.error.message} (${j.error.code})`);
  return j;
}

async function downloadFromDrive(fileId, destPath) {
  const drive = getDrive();
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
  await new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(destPath);
    res.data.pipe(dest);
    dest.on('finish', resolve);
    dest.on('error', reject);
    res.data.on('error', reject);
  });
}

async function uploadVideoToMeta(videoPath, name) {
  const form = new FormData();
  form.append('access_token', ACCESS_TOKEN);
  form.append('name', name);
  form.append('source', fs.createReadStream(videoPath));
  const r = await fetch(`${BASE_URL}/${AD_ACCOUNT}/advideos`, { method: 'POST', body: form });
  const j = await r.json();
  if (j.error) throw new Error(`Upload: ${j.error.message}`);
  return j.id;
}

async function waitForVideo(videoId, maxMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const r = await fetch(`${BASE_URL}/${videoId}?fields=status&access_token=${ACCESS_TOKEN}`);
    const j = await r.json();
    if (j.status?.video_status === 'ready') return;
    await sleep(5000);
  }
  throw new Error(`Vídeo ${videoId} não ficou pronto`);
}

async function getThumbnail(videoId) {
  const r = await fetch(`${BASE_URL}/${videoId}?fields=picture&access_token=${ACCESS_TOKEN}`);
  const j = await r.json();
  return j.picture;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('===========================================');
  console.log('  Anúncios: [T1] DR. ENIO — Rinomodelação');
  console.log('  5 vídeos do Drive → Meta → com UTMs');
  console.log('===========================================\n');

  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const results = [];

  for (let i = 0; i < ADS.length; i++) {
    const ad = ADS[i];
    const tag = `C${i + 1}`;
    console.log(`\n[${tag}] ${ad.adtagName}`);

    try {
      // 1. Download
      const videoPath = path.join(TMP_DIR, `video-${tag}.mp4`);
      process.stdout.write('  ↓ Drive... ');
      await downloadFromDrive(ad.driveFileId, videoPath);
      console.log('ok');

      // 2. Upload Meta
      process.stdout.write('  ↑ Meta...  ');
      const videoId = await uploadVideoToMeta(videoPath, ad.adtagName);
      console.log('ok — ID', videoId);

      // 3. Aguardar
      process.stdout.write('  ⏳ Proc... ');
      await waitForVideo(videoId);
      console.log('ok');

      // 4. Thumbnail
      const thumb = await getThumbnail(videoId);

      // 5. URL com UTM
      const landingUrl = buildUrl(ad.utmContent);

      // 6. Criativo
      process.stdout.write('  🎨 Cria... ');
      const creative = await metaPost(`${AD_ACCOUNT}/adcreatives`, {
        name: ad.adtagName,
        object_story_spec: JSON.stringify({
          page_id: PAGE_ID,
          video_data: {
            video_id: videoId,
            image_url: thumb,
            message: ad.message,
            title: ad.headline,
            link_description: ad.description,
            call_to_action: {
              type: 'LEARN_MORE',
              value: { link: landingUrl },
            },
          },
        }),
      });
      console.log('ok — ID', creative.id);

      // 7. Anúncio
      process.stdout.write('  📢 Anúnc... ');
      const result = await metaPost(`${AD_ACCOUNT}/ads`, {
        name: ad.adtagName,
        adset_id: ADSET_ID,
        creative: JSON.stringify({ creative_id: creative.id }),
        status: 'PAUSED',
      });
      console.log('ok — ID', result.id);
      console.log(`  🔗 URL: ${landingUrl}`);

      results.push({ tag, adtagName: ad.adtagName, adId: result.id, utmContent: ad.utmContent, status: 'ok' });

    } catch (err) {
      console.log(`\n  ✗ Erro: ${err.message}`);
      results.push({ tag, adtagName: ad.adtagName, status: 'error', error: err.message });
    }

    if (i < ADS.length - 1) await sleep(2000);
  }

  // Limpar tmp
  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch (_) {}

  // Relatório
  const ok = results.filter(r => r.status === 'ok');
  const fail = results.filter(r => r.status !== 'ok');

  console.log('\n===========================================');
  console.log(`  ${ok.length}/5 anúncios criados`);
  if (ok.length) {
    console.log('\n  UTMs configurados:');
    ok.forEach(r => console.log(`    ${r.tag}: utm_content=${r.utmContent} → Ad ID ${r.adId}`));
  }
  if (fail.length) {
    console.log('\n  Falhas:');
    fail.forEach(r => console.log(`    ${r.tag}: ${r.error}`));
  }
  console.log(`\n  Link: https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=1273951357510355`);
  console.log('===========================================\n');

  // Salvar log
  const logPath = path.join(__dirname, '../logs/ads-enio-t1.json');
  fs.writeFileSync(logPath, JSON.stringify({ results, createdAt: new Date().toISOString() }, null, 2));
}

main().catch(err => { console.error('✗ Fatal:', err.message); process.exit(1); });
