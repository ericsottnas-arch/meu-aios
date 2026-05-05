#!/usr/bin/env node
/**
 * Download Instagram videos via sssinstagram.com (Playwright automation)
 * → Acessa perfil, extrai links de download + legendas
 * → Categoriza por procedimento (keywords da legenda)
 * → Baixa localmente e faz upload para Google Drive
 */

const { chromium } = require('playwright');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { uploadFile, findFolder } = require('../lib/drive.js');
const { google } = require('googleapis');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ─── Config ──────────────────────────────────────────────────────────────────

const DRIVE_PARENT_FOLDER = '1mbQOTdnlHMs_9FsHQV6skW2N2FojZsSF';
const BASE_DIR = '/home/synkra/meu-aios/data/instagram-humberto';
const LOG_FILE = path.join(BASE_DIR, 'download-log.json');

const PROFILES = [
  'drarachelandrade',
  'humbertoandradebr',
  'institutohrandrade',
  'doutores_da_face',
];

const PROCEDURE_KEYWORDS = {
  'Blefaroplastia': [
    'bléfaro', 'blefaroplastia', 'pálpebra', 'palpebra', 'olho', 'olhos',
    'eyelid', 'blepharoplasty', 'bolsas nos olhos', 'bolfas', 'blefaroplastia',
  ],
  'Rinoplastia': [
    'rino', 'rinoplastia', 'nariz', 'nose', 'rhinoplasty', 'septoplastia', 'septum',
  ],
  'Otoplastia': [
    'oto', 'otoplastia', 'orelha', 'orelhas', 'ear', 'otoplasty', 'orelha em abano',
  ],
  'Lifting Facial': [
    'lifting', 'face lift', 'facelift', 'ritidoplastia', 'rejuvenescimento facial',
    'mini lifting', 'minilifting', 'ptose facial', 'flacidez facial',
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function categorize(caption = '') {
  const text = caption.toLowerCase();
  for (const [proc, keywords] of Object.entries(PROCEDURE_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) return proc;
    }
  }
  return 'Sem Categoria';
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://sssinstagram.com/' },
      timeout: 90000,
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    });
    req.on('error', err => { try { fs.unlinkSync(destPath); } catch(e){} reject(err); });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Drive folder setup ───────────────────────────────────────────────────────

async function ensureDriveFolder(name, parentId) {
  const existing = await findFolder(name, parentId).catch(() => null);
  if (existing) return existing.id;

  const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.GOOGLE_DOCS_REFRESH_TOKEN;
  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  auth.setCredentials({ refresh_token: REFRESH_TOKEN });
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id, name',
  });
  return res.data.id;
}

// ─── Scrape profile via sssinstagram.com ─────────────────────────────────────

async function scrapeProfile(page, username) {
  const profileUrl = `https://www.instagram.com/${username}/`;
  console.log(`\n${'='.repeat(55)}`);
  console.log(`📸 @${username}`);
  console.log('='.repeat(55));

  await page.goto('https://sssinstagram.com/pt', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);

  // Enter profile URL
  const input = page.locator('input[type="text"]').first();
  await input.fill(profileUrl);
  await sleep(400);
  await page.locator('button[type="submit"]').first().click();

  // Wait for posts to appear
  console.log('  Carregando posts...');
  try {
    await page.waitForSelector('a[href*="media.sssinstagram"]', { timeout: 25000 });
  } catch (e) {
    console.log('  ⚠ Nenhum vídeo encontrado neste perfil');
    return [];
  }

  await sleep(2000);

  // Load more posts by scrolling
  let prevCount = 0;
  for (let round = 0; round < 8; round++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(3000);

    // Click any "load more" / "carregar mais" button
    const loadMore = page.locator('button:has-text("mais"), button:has-text("more"), button:has-text("Carregar"), [class*="load-more"]');
    if (await loadMore.count() > 0) {
      await loadMore.first().click().catch(() => {});
      await sleep(3000);
    }

    const count = await page.locator('a[href*="media.sssinstagram"]').count();
    console.log(`  → Round ${round + 1}: ${count} vídeos encontrados`);
    if (count === prevCount) break;
    prevCount = count;
  }

  // Extract all posts: {downloadUrl, caption}
  const posts = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="media.sssinstagram"]'));
    return links.map(a => {
      let caption = '';
      let el = a;
      for (let i = 0; i < 10; i++) {
        el = el.parentElement;
        if (!el) break;
        const text = el.innerText || '';
        if (text.length > 30) {
          caption = text.substring(0, 500);
          break;
        }
      }
      return { downloadUrl: a.href, caption };
    });
  });

  console.log(`  ✓ ${posts.length} vídeos extraídos de @${username}`);
  return posts;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const logData = {
    startedAt: new Date().toISOString(),
    driveFolders: {},
    byProcedure: {},
    errors: [],
  };

  const procedures = [...Object.keys(PROCEDURE_KEYWORDS), 'Sem Categoria'];

  // Create local dirs
  for (const proc of procedures) {
    fs.mkdirSync(path.join(BASE_DIR, proc.replace(/\s/g, '_')), { recursive: true });
    logData.byProcedure[proc] = [];
  }

  // Create Drive subfolders
  console.log('\n📁 Verificando pastas no Drive...');
  for (const proc of procedures) {
    try {
      const id = await ensureDriveFolder(proc, DRIVE_PARENT_FOLDER);
      logData.driveFolders[proc] = id;
      console.log(`  ✓ ${proc} → ${id}`);
    } catch (err) {
      console.error(`  ✗ ${proc}: ${err.message}`);
      logData.errors.push({ type: 'folder', proc, error: err.message });
    }
  }

  // Launch browser
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'pt-BR',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  let totalDownloaded = 0;

  try {
    for (const username of PROFILES) {
      const posts = await scrapeProfile(page, username);

      for (let i = 0; i < posts.length; i++) {
        const { downloadUrl, caption } = posts[i];
        const proc = categorize(caption);
        const filename = `${username}_${String(i + 1).padStart(3, '0')}_${Date.now()}.mp4`;
        const localPath = path.join(BASE_DIR, proc.replace(/\s/g, '_'), filename);

        process.stdout.write(`  [${i + 1}/${posts.length}] ${proc.padEnd(18)} → ${filename} ... `);

        try {
          await downloadFile(downloadUrl, localPath);

          const folderId = logData.driveFolders[proc] || logData.driveFolders['Sem Categoria'];
          const driveFile = await uploadFile(localPath, folderId);

          console.log(`✓ Drive: ${driveFile.id}`);
          logData.byProcedure[proc].push({ username, filename, driveId: driveFile.id, caption: caption.substring(0, 100) });
          totalDownloaded++;
        } catch (err) {
          console.log(`✗ ${err.message}`);
          logData.errors.push({ username, filename, error: err.message });
        }

        await sleep(1500);
      }

      await sleep(4000); // between profiles
    }
  } finally {
    await browser.close();
  }

  logData.finishedAt = new Date().toISOString();
  logData.totalDownloaded = totalDownloaded;
  fs.writeFileSync(LOG_FILE, JSON.stringify(logData, null, 2));

  console.log('\n\n' + '='.repeat(55));
  console.log('📊 RESUMO FINAL');
  console.log('='.repeat(55));
  for (const [proc, items] of Object.entries(logData.byProcedure)) {
    const icon = items.length > 0 ? '✅' : '—';
    console.log(`  ${icon} ${proc.padEnd(20)}: ${items.length} vídeos`);
  }
  console.log(`\n  Total: ${totalDownloaded} vídeos`);
  console.log(`  Erros: ${logData.errors.length}`);
  console.log(`\n  Drive: https://drive.google.com/drive/folders/${DRIVE_PARENT_FOLDER}`);
  console.log(`  Log:   ${LOG_FILE}`);
}

main().catch(err => { console.error('\n✗ Fatal:', err.message); process.exit(1); });
