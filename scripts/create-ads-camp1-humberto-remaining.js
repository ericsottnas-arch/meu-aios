/**
 * Vincular Criativos Restantes — Campanha 1 Video Views HR Andrade
 *
 * Adiciona C4+ para Blefaroplastia (C4-C8), Rinoplastia (C4-C11), Lifting Facial (C4)
 * Otoplastia já está completo (C1-C3).
 */

const path = require('path');
const fs   = require('fs');
const os   = require('os');
const fetch = require('node-fetch').default;
const { google } = require('googleapis');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_445142030338909';
const PAGE_ID    = '104425248310435';
const BASE       = 'https://graph.facebook.com/v21.0';

// ─── Conjuntos com criativos faltando ─────────────────────────────────────────
const ADSETS = [
  {
    id: '120248466251330460',
    procedimento: 'Blefaroplastia',
    folderId: '1zl42NWjUbwBLgj8V1qdqF-AsN3yu5cf_',
    skipFirst: 3, // C1-C3 já criados
    copy: {
      message: 'Pálpebras caídas afetam o olhar — mesmo em quem cuida bem da pele.\n\nConheça a blefaroplastia com o Prof. Dr. Humberto Andrade, especialista em cirurgia da face.',
      headline: 'Olhar mais jovem e descansado',
      link: 'https://www.humbertoandrade.com.br',
    },
  },
  {
    id: '120248466251610460',
    procedimento: 'Rinoplastia',
    folderId: '1T2zDOYWhOVvsQrnhTDSse8W5UwqkeQIb',
    skipFirst: 3, // C1-C3 já criados
    copy: {
      message: 'Um nariz harmonioso transforma o rosto inteiro — sem perder sua identidade.\n\nRinoplastia com o Prof. Dr. Humberto Andrade, referência em cirurgia facial.',
      headline: 'Seu nariz ideal, sem exageros',
      link: 'https://www.humbertoandrade.com.br',
    },
  },
  {
    id: '120248466252410460',
    procedimento: 'Lifting Facial',
    folderId: '1faMkepOU_TO11HyxPMninC34k82hqBpz',
    skipFirst: 3, // C1-C3 já criados
    copy: {
      message: 'Rejuvenesça com naturalidade e sem exageros.\n\nLifting facial com o Prof. Dr. Humberto Andrade — resultados duradouros, aparência saudável.',
      headline: 'Rejuvenescimento facial natural',
      link: 'https://www.humbertoandrade.com.br',
    },
  },
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

async function listDriveVideos(folderId) {
  const drive = getDrive();
  const r = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false and mimeType contains 'video/'`,
    fields: 'files(id,name,mimeType,size)',
    orderBy: 'name',
    pageSize: 50,
  });
  const files = r.data.files || [];
  files.sort((a, b) => {
    const na = parseInt(a.name.match(/^C(\d+)/)?.[1] || 99);
    const nb = parseInt(b.name.match(/^C(\d+)/)?.[1] || 99);
    return na - nb;
  });
  return files;
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

async function apiGet(endpoint) {
  const r = await fetch(`${BASE}/${endpoint}&access_token=${TOKEN}`);
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
  if (j.error) throw new Error(`[POST ${endpoint}] ${j.error.error_user_msg || j.error.message} (${j.error.code})`);
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

  for (let i = 0; i < 30; i++) {
    await sleep(8000);
    const status = await apiGet(`${videoId}?fields=status`);
    const vs = status?.status;
    if (vs?.video_status === 'ready' || vs?.processing_progress === 100) {
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

async function createVideoCreative(creativeName, videoId, imageHash, copy) {
  const res = await apiPost(`${AD_ACCOUNT}/adcreatives`, {
    name: creativeName,
    object_story_spec: JSON.stringify({
      page_id: PAGE_ID,
      video_data: {
        video_id: videoId,
        image_hash: imageHash,
        message: copy.message,
        title: copy.headline,
        call_to_action: {
          type: 'LEARN_MORE',
          value: { link: copy.link },
        },
      },
    }),
  });
  return res.id;
}

async function createAd(adName, adsetId, creativeId) {
  const res = await apiPost(`${AD_ACCOUNT}/ads`, {
    name: adName,
    adset_id: adsetId,
    creative: JSON.stringify({ creative_id: creativeId }),
    status: 'ACTIVE',
  });
  return res.id;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-ads-remaining-'));
  const results = [];

  console.log('════════════════════════════════════════════════════════════');
  console.log('  Criativos Restantes — Campanha 1 Video Views');
  console.log('  Blefaroplastia C4-C8 | Rinoplastia C4-C11 | Lifting C4');
  console.log('════════════════════════════════════════════════════════════');

  for (const adset of ADSETS) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📁 ${adset.procedimento} | AdSet: ${adset.id}`);
    console.log(`${'─'.repeat(60)}`);

    const allFiles = await listDriveVideos(adset.folderId);
    const driveFiles = allFiles.slice(adset.skipFirst);
    console.log(`  ${allFiles.length} total no Drive, processando ${driveFiles.length} restantes (pulando C1-C${adset.skipFirst})`);

    if (driveFiles.length === 0) {
      console.log('  ✅ Nenhum arquivo restante.');
      continue;
    }

    for (const [i, file] of driveFiles.entries()) {
      const cNum = adset.skipFirst + i + 1;
      const ext = path.extname(file.name).toLowerCase();
      const tmpPath = path.join(tmpDir, `${adset.procedimento}-C${cNum}${ext}`);
      const sizeMB = Math.round((file.size || 0) / 1024 / 1024);

      console.log(`\n  [C${cNum}] ${file.name} (${sizeMB}MB)`);

      try {
        process.stdout.write(`  📥 Baixando...`);
        await downloadDriveFile(file.id, tmpPath);
        console.log(` ok`);

        const videoName = file.name.replace(ext, '').trim();
        process.stdout.write(`  ⬆️  Subindo vídeo...`);
        const videoId = await uploadVideo(tmpPath, videoName);
        console.log(` ID: ${videoId}`);

        const thumbPath = tmpPath.replace(ext, '.jpg');
        process.stdout.write(`  🖼️  Extraindo thumbnail...`);
        await extractThumbnail(tmpPath, thumbPath);
        const imageHash = await uploadThumbnail(thumbPath);
        console.log(` hash: ${imageHash}`);
        try { fs.unlinkSync(thumbPath); } catch {}

        const creativeName = `C${cNum} [Vídeo] [Hook: ${adset.procedimento}] [CTA: Saiba Mais]`;
        process.stdout.write(`  🎨 Criando creative...`);
        const creativeId = await createVideoCreative(creativeName, videoId, imageHash, adset.copy);
        console.log(` ID: ${creativeId}`);

        const adName = `${adset.procedimento} — C${cNum} [Vídeo] [CTA: Saiba Mais]`;
        process.stdout.write(`  📢 Criando anúncio...`);
        const adId = await createAd(adName, adset.id, creativeId);
        console.log(` ID: ${adId} ✅`);

        results.push({ procedimento: adset.procedimento, cNum, videoId, creativeId, adId, status: 'ok' });

        try { fs.unlinkSync(tmpPath); } catch {}

      } catch (e) {
        console.log(`\n  ❌ Erro: ${e.message}`);
        results.push({ procedimento: adset.procedimento, cNum, error: e.message, status: 'error' });
        try { fs.unlinkSync(tmpPath); } catch {}
      }
    }
  }

  try { fs.rmdirSync(tmpDir); } catch {}

  console.log(`\n${'═'.repeat(60)}`);
  console.log('📊 RELATÓRIO FINAL');
  console.log(`${'═'.repeat(60)}`);
  const ok  = results.filter(r => r.status === 'ok');
  const err = results.filter(r => r.status === 'error');
  console.log(`✅ Ads criados:  ${ok.length}`);
  console.log(`❌ Falhas:       ${err.length}`);
  if (err.length) {
    err.forEach(e => console.log(`  - ${e.procedimento} C${e.cNum}: ${e.error}`));
  }
  console.log('\nAds criados (ATIVOS):');
  ok.forEach(r => console.log(`  [${r.procedimento} C${r.cNum}] Ad: ${r.adId} | Creative: ${r.creativeId} | Video: ${r.videoId}`));
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message);
  process.exit(1);
});
