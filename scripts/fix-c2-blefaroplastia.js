/**
 * Fix C2 Blefaroplastia — thumbnail muito pequena
 * Re-extrai com scale 1080px, recria creative e cria o ad
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
const ADSET_ID   = '120248466251330460';
const VIDEO_ID   = '984087557479359'; // já subido na run anterior

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

function getDrive() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_DOCS_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth });
}

async function downloadFile(fileId, dest) {
  const drive = getDrive();
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(dest);
    res.data.pipe(ws);
    ws.on('finish', resolve);
    ws.on('error', reject);
  });
}

async function apiPost(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST ${endpoint}] ${j.error.error_user_msg || j.error.message}`);
  return j;
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blef-c2-'));
  const videoPath = path.join(tmpDir, 'C2.mp4');
  const thumbPath = path.join(tmpDir, 'C2.jpg');

  console.log('Fix C2 — Blefaroplastia\n');

  // 1. Download
  process.stdout.write('📥 Baixando C2 do Drive...');
  await downloadFile('1XV7lFl8wgDEGNc9MieelrxraRVK5zDRZ', videoPath);
  console.log(' ok');

  // 2. Extrair thumbnail com scale forçado para 1080px
  process.stdout.write('🖼️  Extraindo thumbnail (1080px)...');
  const { execSync } = require('child_process');
  execSync(
    `ffmpeg -y -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=1080:-2" "${thumbPath}" 2>/dev/null`,
    { stdio: 'pipe' }
  );
  console.log(' ok');

  // 3. Upload thumbnail
  process.stdout.write('⬆️  Subindo thumbnail...');
  const FormData = require('form-data');
  const form = new FormData();
  form.append('access_token', TOKEN);
  form.append('filename', fs.createReadStream(thumbPath), { filename: 'thumb.jpg' });
  const imgRes = await fetch(`${BASE}/${AD_ACCOUNT}/adimages`, { method: 'POST', body: form });
  const imgJson = await imgRes.json();
  if (imgJson.error) throw new Error(imgJson.error.message);
  const imageHash = Object.values(imgJson.images)[0].hash;
  console.log(` hash: ${imageHash}`);

  // 4. Criar novo creative com thumbnail correta
  process.stdout.write('🎨 Criando creative...');
  const creative = await apiPost(`${AD_ACCOUNT}/adcreatives`, {
    name: 'C2 [Vídeo] [Hook: Depoimento de Paciente] [CTA: Saiba Mais]',
    object_story_spec: JSON.stringify({
      page_id: PAGE_ID,
      video_data: {
        video_id: VIDEO_ID,
        image_hash: imageHash,
        message: COPY.message,
        title: COPY.headline,
        call_to_action: { type: 'LEARN_MORE', value: { link: COPY.link } },
      },
    }),
  });
  console.log(` ID: ${creative.id}`);

  // 5. Criar ad
  process.stdout.write('📢 Criando ad...');
  const ad = await apiPost(`${AD_ACCOUNT}/ads`, {
    name: 'Blefaroplastia — C2 [Vídeo] [CTA: Saiba Mais]',
    adset_id: ADSET_ID,
    creative: JSON.stringify({ creative_id: creative.id }),
    status: 'ACTIVE',
    url_tags: UTM_TAGS,
  });
  console.log(` ID: ${ad.id} ✅`);

  try { fs.unlinkSync(videoPath); fs.unlinkSync(thumbPath); fs.rmdirSync(tmpDir); } catch {}
}

main().catch(err => { console.error('✗', err.message); process.exit(1); });
