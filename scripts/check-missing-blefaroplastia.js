/**
 * Verifica criativos faltando — Blefaroplastia Video Views
 * Compara Drive vs Ads no conjunto 120248466251330460
 */

const path  = require('path');
const fetch = require('node-fetch').default;
const { google } = require('googleapis');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const BASE       = 'https://graph.facebook.com/v21.0';
const ADSET_ID   = '120248466251330460'; // Blefaroplastia — Camp 1 Video Views
const FOLDER_ID  = '1zl42NWjUbwBLgj8V1qdqF-AsN3yu5cf_';

function getDrive() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_DOCS_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth });
}

async function main() {
  // ── Drive ──────────────────────────────────────────────────────────────────
  const drive = getDrive();
  const r = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and trashed=false and mimeType contains 'video/'`,
    fields: 'files(id,name,size)',
    orderBy: 'name',
    pageSize: 50,
  });
  const driveFiles = (r.data.files || []).sort((a, b) => {
    const na = parseInt(a.name.match(/^C(\d+)/)?.[1] || 99);
    const nb = parseInt(b.name.match(/^C(\d+)/)?.[1] || 99);
    return na - nb;
  });

  console.log(`\nDrive — ${driveFiles.length} vídeos:`);
  driveFiles.forEach(f => {
    const mb = Math.round((f.size || 0) / 1024 / 1024);
    console.log(`  ${f.name} (${mb}MB)`);
  });

  // ── Meta Ads ───────────────────────────────────────────────────────────────
  const res = await fetch(`${BASE}/${ADSET_ID}/ads?fields=id,name&limit=50&access_token=${TOKEN}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  const metaAds = json.data || [];

  console.log(`\nMeta Ads — ${metaAds.length} ads no conjunto:`);
  metaAds.forEach(a => console.log(`  ${a.name}`));

  // ── Comparação ─────────────────────────────────────────────────────────────
  // Extrai número do criativo: "C3" → 3
  const metaNums = new Set(
    metaAds.map(a => parseInt(a.name.match(/C(\d+)/)?.[1])).filter(Boolean)
  );
  const driveNums = driveFiles.map(f => parseInt(f.name.match(/^C(\d+)/)?.[1])).filter(Boolean);

  const missing = driveFiles.filter(f => {
    const n = parseInt(f.name.match(/^C(\d+)/)?.[1]);
    return n && !metaNums.has(n);
  });

  console.log('\n════════════════════════════════════════════════════════════');
  if (missing.length === 0) {
    console.log('✅ Todos os vídeos do Drive já estão no Meta Ads.');
  } else {
    console.log(`⚠️  ${missing.length} vídeo(s) no Drive SEM ad correspondente:\n`);
    missing.forEach(f => {
      const mb = Math.round((f.size || 0) / 1024 / 1024);
      console.log(`  ❌ ${f.name} (${mb}MB) — Drive ID: ${f.id}`);
    });
    console.log('\nNúmeros presentes no Meta:', [...metaNums].sort((a,b)=>a-b).map(n=>`C${n}`).join(', '));
    console.log('Números no Drive:         ', driveNums.map(n=>`C${n}`).join(', '));
  }
  console.log('════════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('✗ Erro:', err.message);
  process.exit(1);
});
