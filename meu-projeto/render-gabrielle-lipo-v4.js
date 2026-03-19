#!/usr/bin/env node
/**
 * Render Final - Lipo Sem Cortes v4 (Editorial Full Bleed)
 * Input: pipeline/4_final_composed.png (foto tratada com glow + dark BG)
 * Output: Story 1080x1920 renderizado a 2x via Puppeteer
 *
 * Estilo: Belle Fernandes DNA - dark, moody, premium medical aesthetic
 * Tipografia: Playfair Display (títulos) + Montserrat (labels/body)
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const COMPOSED_IMAGE = path.join(__dirname, 'assets/criativos-gabrielle/pipeline/4_final_composed.png');
const OUTPUT_DIR = path.join(__dirname, 'assets/criativos-gabrielle');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'Story_Lipo_Sem_Cortes_v4_editorial.png');

const WIDTH = 1080;
const HEIGHT = 1920;
const SCALE = 2;

// Converter imagem para base64 data URI
function imageToDataUri(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

const html = (imageDataUri) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      width: ${WIDTH}px;
      height: ${HEIGHT}px;
      background: #0D0D0F;
      overflow: hidden;
      position: relative;
      font-family: 'Montserrat', sans-serif;
    }

    /* ===== FOTO COMPOSTA (full bleed) ===== */
    .bg-photo {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: url('${imageDataUri}');
      background-size: cover;
      background-position: center top;
      z-index: 1;
    }

    /* ===== GRADIENTE SUAVE (reforço sobre o baked) ===== */
    .gradient-bottom {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 55%;
      background: linear-gradient(
        to bottom,
        rgba(13,13,15,0) 0%,
        rgba(13,13,15,0.15) 25%,
        rgba(13,13,15,0.5) 50%,
        rgba(13,13,15,0.85) 70%,
        rgba(13,13,15,0.95) 85%,
        rgba(13,13,15,1) 100%
      );
      z-index: 2;
    }

    .gradient-top {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 220px;
      background: linear-gradient(
        to bottom,
        rgba(13,13,15,0.7) 0%,
        rgba(13,13,15,0.3) 50%,
        rgba(13,13,15,0) 100%
      );
      z-index: 2;
    }

    /* ===== DIVIDER CENTRAL ===== */
    .divider {
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 1.5px;
      background: rgba(255,255,255,0.12);
      z-index: 3;
    }

    /* ===== CONTORNO DASHED (área da barriga - lado DEPOIS) ===== */
    .contour-callout {
      position: absolute;
      right: 80px;
      top: 380px;
      width: 300px;
      height: 380px;
      border: 2px dashed rgba(255,255,255,0.35);
      border-radius: 50%;
      z-index: 4;
      filter: drop-shadow(0 0 8px rgba(255,255,255,0.08));
    }

    /* ===== ZONA DE TEXTO - TOPO ===== */
    .top-zone {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      padding: 130px 40px 0;
      z-index: 10;
    }

    .brand-name {
      text-align: center;
      font-size: 13px;
      font-weight: 500;
      color: #D6BA9E;
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-bottom: 6px;
      text-shadow: 0 1px 6px rgba(0,0,0,0.8);
    }

    .category {
      text-align: center;
      font-size: 17px;
      font-weight: 600;
      color: #F5F0EB;
      letter-spacing: 5px;
      text-transform: uppercase;
      text-shadow: 0 1px 8px rgba(0,0,0,0.9);
    }

    .decorative-line-top {
      width: 120px;
      height: 1px;
      background: rgba(214,186,158,0.4);
      margin: 12px auto 0;
    }

    /* Labels ANTES / DEPOIS */
    .label-antes {
      position: absolute;
      top: 200px;
      left: 40px;
      font-size: 15px;
      font-weight: 600;
      color: #F5F0EB;
      letter-spacing: 4px;
      text-transform: uppercase;
      text-shadow: 0 2px 8px rgba(0,0,0,0.9);
      z-index: 10;
    }

    .label-depois {
      position: absolute;
      top: 200px;
      right: 40px;
      font-size: 15px;
      font-weight: 600;
      color: #F5F0EB;
      letter-spacing: 4px;
      text-transform: uppercase;
      text-shadow: 0 2px 8px rgba(0,0,0,0.9);
      z-index: 10;
    }

    /* ===== ZONA DE TEXTO - BOTTOM ===== */
    .bottom-zone {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0 60px 300px;
      text-align: center;
      z-index: 10;
    }

    .headline {
      font-family: 'Playfair Display', serif;
      font-size: 110px;
      font-weight: 900;
      font-style: italic;
      color: #F5F0EB;
      line-height: 0.95;
      letter-spacing: -2px;
      text-shadow: 0 4px 20px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5);
      margin-bottom: 24px;
    }

    .decorative-line-bottom {
      width: 280px;
      height: 1px;
      background: rgba(214,186,158,0.35);
      margin: 0 auto 20px;
    }

    .subtitle {
      font-size: 18px;
      font-weight: 500;
      color: #D6BA9E;
      letter-spacing: 5px;
      text-transform: uppercase;
      text-shadow: 0 2px 10px rgba(0,0,0,0.8);
      margin-bottom: 28px;
    }

    .cta-badge {
      display: inline-block;
      padding: 14px 36px;
      border: 1.5px solid rgba(214,186,158,0.5);
      font-size: 14px;
      font-weight: 700;
      color: #F5F0EB;
      letter-spacing: 5px;
      text-transform: uppercase;
      text-shadow: 0 1px 6px rgba(0,0,0,0.6);
    }

    /* ===== SAFE ZONE INDICATOR (invisible, for reference) ===== */
    /* Top safe: 125px, Bottom safe: 280px */
  </style>
</head>
<body>
  <!-- Background Photo (composed from pipeline) -->
  <div class="bg-photo"></div>

  <!-- Gradient overlays (reinforce the baked gradient for smoother transition) -->
  <div class="gradient-top"></div>
  <div class="gradient-bottom"></div>

  <!-- Center divider -->
  <div class="divider"></div>

  <!-- Contour callout on DEPOIS side -->
  <div class="contour-callout"></div>

  <!-- TOP ZONE: Brand + Category + Labels -->
  <div class="top-zone">
    <div class="brand-name">Estética Gabrielle Oliveira</div>
    <div class="category">Estética Corporal</div>
    <div class="decorative-line-top"></div>
  </div>

  <div class="label-antes">Antes</div>
  <div class="label-depois">Depois</div>

  <!-- BOTTOM ZONE: Headline + Subtitle + CTA -->
  <div class="bottom-zone">
    <div class="headline">Lipo<br>Sem Cortes</div>
    <div class="decorative-line-bottom"></div>
    <div class="subtitle">Resultado Real · Sem Cirurgia</div>
    <div class="cta-badge">Agende Sua Avaliação</div>
  </div>
</body>
</html>`;

async function render() {
  console.log('🎨 Renderizando Story v4 - Editorial Full Bleed');
  console.log('================================================');

  // Carregar imagem composta como data URI
  console.log('📸 Carregando imagem composta do pipeline...');
  const imageDataUri = imageToDataUri(COMPOSED_IMAGE);

  // Lançar Puppeteer
  console.log('🚀 Iniciando Puppeteer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: SCALE
  });

  // Carregar HTML
  console.log('📝 Carregando layout HTML/CSS...');
  await page.setContent(html(imageDataUri), {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Aguardar fontes carregarem
  await page.evaluate(() => document.fonts.ready);
  console.log('✅ Fontes carregadas');

  // Screenshot
  console.log('📷 Renderizando em 2x...');
  await page.screenshot({
    path: OUTPUT_FILE,
    type: 'png',
    fullPage: false,
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT }
  });

  await browser.close();

  // Verificar tamanho do output
  const stats = fs.statSync(OUTPUT_FILE);
  const sizeKB = Math.round(stats.size / 1024);

  console.log(`\n✅ RENDERIZADO COM SUCESSO!`);
  console.log(`📁 ${OUTPUT_FILE}`);
  console.log(`📐 ${WIDTH * SCALE}x${HEIGHT * SCALE} (${WIDTH}x${HEIGHT} @2x)`);
  console.log(`💾 ${sizeKB} KB`);
}

render().catch(err => {
  console.error('❌ Render falhou:', err.message);
  process.exit(1);
});
