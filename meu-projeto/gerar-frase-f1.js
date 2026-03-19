// gerar-frase-f1.js
// Gera imagem F1 (Frase com Destaque) — Dark + Lima Syra
// Resolução: 1080x1350 (viewport 540x675 + deviceScaleFactor 2)
// Cores: fundo #080808, setup #F0F0F5, impacto #C8FF00

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(
  process.env.HOME,
  'Library/CloudStorage/GoogleDrive-ericsottnas@gmail.com/Meu Drive/Syra Digital/Conteúdo/@byericsantos/criativos'
);
const PROFILE_IMG_PATH = path.resolve(__dirname, 'public/eric-profile.jpg');

function getProfileImgBase64() {
  try {
    if (fs.existsSync(PROFILE_IMG_PATH)) {
      const buf = fs.readFileSync(PROFILE_IMG_PATH);
      return `data:image/jpeg;base64,${buf.toString('base64')}`;
    }
  } catch {}
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="40" fill="#444"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function buildHtml(setup, impact, profileBase64) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&family=Inter:wght@500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      width: 540px;
      height: 675px;
      background: #080808;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: space-between;
      padding: 52px 48px;
      overflow: hidden;
    }

    .content {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0;
      flex: 1;
      justify-content: center;
    }

    .setup {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 32px;
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: -0.025em;
      color: #F0F0F5;
    }

    .impact {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 32px;
      font-weight: 800;
      line-height: 1.3;
      letter-spacing: -0.025em;
      color: #C8FF00;
      margin-top: 24px;
    }

    .footer {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 40px;
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid #27272d;
    }

    .handle {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: #505060;
    }

    .accent-line {
      width: 40px;
      height: 3px;
      background: #C8FF00;
      border-radius: 2px;
      margin-bottom: 32px;
    }
  </style>
</head>
<body>
  <div class="content">
    <div class="accent-line"></div>
    <div class="setup">${setup}</div>
    <div class="impact">${impact}</div>
    <div class="footer">
      <img class="avatar" src="${profileBase64}" />
      <span class="handle">@byericsantos</span>
    </div>
  </div>
</body>
</html>`;
}

async function gerarFraseF1(setup, impact, filename) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const profileBase64 = getProfileImgBase64();
  const html = buildHtml(setup, impact, profileBase64);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 540, height: 675 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const outPath = path.join(OUTPUT_DIR, filename || 'frase-f1.png');
  await page.screenshot({ path: outPath, type: 'png' });

  await browser.close();
  console.log(`✅ PNG gerado: ${outPath}`);
  return outPath;
}

// Frase atual
const SETUP = '90% das clínicas param o follow-up antes do 3º contato.';
const IMPACT = '80% dos fechamentos acontecem a partir do 5º.';

gerarFraseF1(SETUP, IMPACT, 'frase-f1-followup.png').catch(console.error);
