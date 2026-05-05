/**
 * Subir criativos faltando — Blefaroplastia Video Views
 * C1, C2, C8 do Drive → Meta Ads (adset 120248466251330460)
 */

const path  = require('path');
const fs    = require('fs');
const os    = require('os');
const fetch = require('node-fetch').default;
const { google } = require('googleapis');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_445142030338909';
const PAGE_ID    = '104425248310435';
const BASE       = 'https://graph.facebook.com/v21.0';
const PIXEL_ID   = '1354726053083764';
const ADSET_ID   = '120248466251330460'; // Blefaroplastia — Camp 1 Video Views

const UTM_TAGS =
  'utm_source={{placement}}' +
  '&utm_medium=cpc' +
  '&utm_campaign={{campaign.name}}{{campaign.id}}' +
  '&utm_content={{adset.name}}{{adset.id}}' +
  '&utm_term={{ad.name}}_{{ad.id}}';

const COPY = {
  message:  'Pálpebras caídas afetam o olhar — mesmo em quem cuida bem da pele.\n\nConheça a blefaroplastia com o Prof. Dr. Humberto Andrade, especialista em cirurgia da face.',
  headline: 'Olhar mais jovem e descansado',
  link:     'https://www.humbertoandrade.com.br',
};

const MISSING = [
  { cNum: 1, fileId: '12ukhgbZgB52rjZsRgzXD-I43IEdDPM1Q', name: 'C1 [Vídeo] [Hook: Blefaroplastia] [CTA: Agendar].mp4' },
  { cNum: 2, fileId: '1XV7lFl8wgDEGNc9MieelrxraRVK5zDRZ', name: 'C2 [Vídeo] [Hook: Depoimento de Paciente] [CTA: Agendar].mp4' },
  { cNum: 8, fileId: '1IWWNmwl-r-308dZ1Gvq18_FkxUB91L1c', name: 'C8 [Vídeo] [Hook: Música] [CTA: Agendar].mp4' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDrive() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_DOCS_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth });
}

async function downloadDriveFile(fileId, dest) {
  const drive = getDrive();
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(dest);
    res.data.pipe(ws);
    ws.on('finish', resolve);
    ws.on('error', reject);
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function apiPost(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST ${endpoint}] ${j.error.error_user_msg || j.error.message} (${j.error.code})`);
  return j;
}

async function apiGet(p) {
  const r = await fetch(`${BASE}/${p}&access_token=${TOKEN}`);
  const j = await r.json();
  if (j.error) throw new Error(`[GET] ${j.error.message}`);
  return j;
}

async function uploadVideo(filePath, name) {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('access_token', TOKEN);
  form.append('name', name);
  form.append('source', fs.createReadStream(filePath), { filename: path.basename(filePath) });

  const r = await fetch(`${BASE}/${AD_ACCOUNT}/advideos`, { method: 'POST', body: form });
  const j = await r.json();
  if (j.error) throw new Error(`[uploadVideo] ${j.error.message}`);
  const videoId = j.id;

  process.stdout.write(' processando');
  for (let i = 0; i < 30; i++) {
    await sleep(8000);
    const status = await apiGet(`${videoId}?fields=status`);
    const vs = status?.status;
    if (vs?.video_status === 'ready' || vs?.processing_progress === 100) {
      process.stdout.write(' pronto');
      return videoId;
    }
    process.stdout.write('.');
  }
  return videoId;
}

async function extractThumbnail(videoPath, thumbPath) {
  const { execSync } = require('child_process');
  execSync(`ffmpeg -y -i "${videoPath}" -ss 00:00:02 -vframes 1 "${thumbPath}" 2>/dev/null`, { stdio: 'pipe' });
}

async function uploadThumbnail(thumbPath) {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('access_token', TOKEN);
  form.append('filename', fs.createReadStream(thumbPath), { filename: path.basename(thumbPath) });
  const r = await fetch(`${BASE}/${AD_ACCOUNT}/adimages`, { method: 'POST', body: form });
  const j = await r.json();
  if (j.error) throw new Error(`[uploadThumbnail] ${j.error.message}`);
  return Object.values(j.images)[0].hash;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blef-missing-'));
  const results = [];

  console.log('════════════════════════════════════════════════════════════');
  console.log('  Criativos Faltando — Blefaroplastia Video Views');
  console.log('  C1, C2, C8');
  console.log('════════════════════════════════════════════════════════════\n');

  for (const file of MISSING) {
    const ext = '.mp4';
    const tmpPath = path.join(tmpDir, `Blefaroplastia-C${file.cNum}${ext}`);

    console.log(`\n── C${file.cNum} — ${file.name}`);

    try {
      process.stdout.write('  📥 Baixando do Drive...');
      await downloadDriveFile(file.fileId, tmpPath);
      console.log(' ok');

      process.stdout.write('  ⬆️  Subindo vídeo...');
      const videoName = file.name.replace(ext, '').trim();
      const videoId = await uploadVideo(tmpPath, videoName);
      console.log(` ID: ${videoId}`);

      const thumbPath = tmpPath.replace(ext, '.jpg');
      process.stdout.write('  🖼️  Extraindo thumbnail...');
      await extractThumbnail(tmpPath, thumbPath);
      const imageHash = await uploadThumbnail(thumbPath);
      console.log(` hash: ${imageHash}`);
      try { fs.unlinkSync(thumbPath); } catch {}

      const creativeName = `C${file.cNum} [Vídeo] [Hook: Blefaroplastia] [CTA: Saiba Mais]`;
      process.stdout.write('  🎨 Criando creative...');
      const creative = await apiPost(`${AD_ACCOUNT}/adcreatives`, {
        name: creativeName,
        object_story_spec: JSON.stringify({
          page_id: PAGE_ID,
          video_data: {
            video_id: videoId,
            image_hash: imageHash,
            message: COPY.message,
            title: COPY.headline,
            call_to_action: {
              type: 'LEARN_MORE',
              value: { link: COPY.link },
            },
          },
        }),
      });
      console.log(` ID: ${creative.id}`);

      const adName = `Blefaroplastia — C${file.cNum} [Vídeo] [CTA: Saiba Mais]`;
      process.stdout.write('  📢 Criando ad...');
      const ad = await apiPost(`${AD_ACCOUNT}/ads`, {
        name: adName,
        adset_id: ADSET_ID,
        creative: JSON.stringify({ creative_id: creative.id }),
        status: 'ACTIVE',
        tracking_specs: JSON.stringify([
          { 'action.type': ['video_view'], fb_pixel: [PIXEL_ID] },
        ]),
        url_tags: UTM_TAGS,
      });
      console.log(` ID: ${ad.id} ✅`);

      results.push({ cNum: file.cNum, videoId, creativeId: creative.id, adId: ad.id, status: 'ok' });
      try { fs.unlinkSync(tmpPath); } catch {}

    } catch (e) {
      console.log(`\n  ❌ Erro: ${e.message}`);
      results.push({ cNum: file.cNum, error: e.message, status: 'error' });
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  }

  try { fs.rmdirSync(tmpDir); } catch {}

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  RESULTADO');
  console.log('════════════════════════════════════════════════════════════');
  const ok  = results.filter(r => r.status === 'ok');
  const err = results.filter(r => r.status === 'error');
  console.log(`✅ Criados: ${ok.length} | ❌ Erros: ${err.length}`);
  ok.forEach(r => console.log(`  C${r.cNum} → Ad: ${r.adId} | Creative: ${r.creativeId} | Video: ${r.videoId}`));
  if (err.length) err.forEach(e => console.log(`  C${e.cNum}: ${e.error}`));
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message);
  process.exit(1);
});
