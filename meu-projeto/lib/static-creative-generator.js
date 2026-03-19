// static-creative-generator.js
// Gerador de criativos estáticos para estética médica
// Estilo: Classe Academy / Renova / Dra. Vanessa Soares
// Approach: Foto dominante + tipografia elegante + overlay sutil
// Renderiza HTML/CSS via Playwright — SEM Sharp, SEM efeitos artificiais

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { getPreset } = require('./client-creative-presets');

const TEMP_DIR = path.resolve(__dirname, '../../.carousel-temp');
const BRANDS_DIR = path.resolve(__dirname, '../assets/brands');

// ============================================================
// Brand config + Preset loading
// ============================================================

function loadBrandConfig(brandId) {
  const brandPath = path.join(BRANDS_DIR, `${brandId}.json`);
  if (!fs.existsSync(brandPath)) throw new Error(`Brand config não encontrada: ${brandPath}`);
  return JSON.parse(fs.readFileSync(brandPath, 'utf-8'));
}

function applyPreset(config) {
  if (!config.preset) return config;
  const preset = getPreset(config.preset);
  // Preset como fallback — config manual tem prioridade
  return { ...preset, ...config };
}

function applyBrand(config) {
  if (!config.brandId) return config;
  const brand = loadBrandConfig(config.brandId);
  // Brand como fallback para 'brand' text
  if (!config.brand) config.brand = brand.brand || brand.name;
  return config;
}

// ============================================================
// Templates de layout
// ============================================================

const TEMPLATES = {
  // Antes/Depois lado a lado (estilo Classe Academy)
  'before-after': {
    name: 'Antes & Depois',
    width: 1080,
    height: 1350,
    html: (config) => `
<!DOCTYPE html>
<html>
<head>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; height: 1350px;
    font-family: 'Montserrat', sans-serif;
    background: ${config.bgColor || '#2a2a2a'};
    overflow: hidden;
    position: relative;
  }

  /* Foto container — ocupa ~55% superior */
  .photo-zone {
    width: 100%; height: 58%;
    display: flex;
    position: relative;
    overflow: hidden;
  }

  .photo-zone img {
    width: 100%; height: 100%;
    object-fit: cover;
    object-position: center top;
  }

  /* Overlay gradiente suave no bottom da foto */
  .photo-zone::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 40%;
    background: linear-gradient(to top, ${config.bgColor || '#2a2a2a'} 0%, transparent 100%);
    pointer-events: none;
  }

  /* Labels ANTES / DEPOIS */
  .label-before, .label-after {
    position: absolute;
    top: 28px;
    font-family: 'Montserrat', sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.85);
    z-index: 2;
    text-shadow: 0 1px 8px rgba(0,0,0,0.5);
  }
  .label-before { left: 32px; }
  .label-after { right: 32px; }

  /* Divisor central */
  .divider {
    position: absolute;
    top: 0; bottom: 0;
    left: 50%;
    width: 2px;
    background: rgba(255,255,255,0.25);
    z-index: 2;
  }

  /* Texto container — 42% inferior */
  .text-zone {
    width: 100%; height: 42%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0 60px;
    text-align: center;
    position: relative;
  }

  .tag {
    font-family: 'Montserrat', sans-serif;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: ${config.accentColor || '#c9a87c'};
    margin-bottom: 18px;
  }

  .headline {
    font-family: '${config.headlineFont || 'Playfair Display'}', serif;
    font-size: ${config.headlineSize || '72'}px;
    font-weight: ${config.headlineWeight || '700'};
    font-style: ${config.headlineItalic ? 'italic' : 'normal'};
    color: ${config.headlineColor || '#f5f0eb'};
    line-height: 1.05;
    letter-spacing: -1px;
    margin-bottom: 20px;
  }

  .subtitle {
    font-family: 'Montserrat', sans-serif;
    font-size: 16px;
    font-weight: 300;
    letter-spacing: 1px;
    color: ${config.subtitleColor || 'rgba(255,255,255,0.7)'};
    margin-bottom: 32px;
    line-height: 1.5;
  }

  .cta-pill {
    display: inline-block;
    padding: 14px 36px;
    border: 1.5px solid ${config.ctaBorderColor || 'rgba(255,255,255,0.3)'};
    border-radius: 50px;
    font-family: 'Montserrat', sans-serif;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 2px;
    color: ${config.ctaColor || 'rgba(255,255,255,0.85)'};
    background: ${config.ctaBg || 'transparent'};
  }

  .brand {
    position: absolute;
    bottom: 36px;
    font-family: 'Montserrat', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
  }
</style>
</head>
<body>
  <div class="photo-zone">
    <img src="${config.photoPath}" alt="Resultado">
    ${config.showLabels !== false ? `
    <div class="label-before">ANTES</div>
    <div class="label-after">DEPOIS</div>
    <div class="divider"></div>
    ` : ''}
  </div>
  <div class="text-zone">
    ${config.tag ? `<div class="tag">${config.tag}</div>` : ''}
    <div class="headline">${config.headline}</div>
    ${config.subtitle ? `<div class="subtitle">${config.subtitle}</div>` : ''}
    ${config.cta ? `<div class="cta-pill">${config.cta}</div>` : ''}
    ${config.brand ? `<div class="brand">${config.brand}</div>` : ''}
  </div>
</body>
</html>`,
  },

  // Foto full + overlay (estilo Dra. Vanessa / Renova)
  'photo-overlay': {
    name: 'Foto Full + Overlay',
    width: 1080,
    height: 1350,
    html: (config) => `
<!DOCTYPE html>
<html>
<head>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; height: 1350px;
    font-family: 'Montserrat', sans-serif;
    overflow: hidden;
    position: relative;
  }

  .photo-bg {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 0;
  }
  .photo-bg img {
    width: 100%; height: 100%;
    object-fit: cover;
    object-position: ${config.photoPosition || 'center center'};
  }

  /* Overlay gradiente */
  .overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(
      to bottom,
      ${config.overlayTop || 'rgba(0,0,0,0.1)'} 0%,
      ${config.overlayMid || 'rgba(0,0,0,0.05)'} 40%,
      ${config.overlayBot || 'rgba(0,0,0,0.75)'} 100%
    );
    z-index: 1;
  }

  .content {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 0 56px 56px;
    z-index: 2;
    text-align: ${config.textAlign || 'left'};
  }

  .tag {
    font-family: 'Montserrat', sans-serif;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: ${config.accentColor || '#c9a87c'};
    margin-bottom: 14px;
  }

  .headline {
    font-family: '${config.headlineFont || 'Playfair Display'}', serif;
    font-size: ${config.headlineSize || '64'}px;
    font-weight: ${config.headlineWeight || '700'};
    font-style: ${config.headlineItalic ? 'italic' : 'normal'};
    color: ${config.headlineColor || '#ffffff'};
    line-height: 1.08;
    letter-spacing: -1px;
    margin-bottom: 16px;
  }

  .subtitle {
    font-family: 'Montserrat', sans-serif;
    font-size: 15px;
    font-weight: 300;
    letter-spacing: 0.5px;
    color: rgba(255,255,255,0.8);
    line-height: 1.6;
    margin-bottom: 28px;
    max-width: 520px;
  }

  .cta-pill {
    display: inline-block;
    padding: 14px 32px;
    border: 1.5px solid rgba(255,255,255,0.35);
    border-radius: 50px;
    font-family: 'Montserrat', sans-serif;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 2px;
    color: rgba(255,255,255,0.9);
    background: ${config.ctaBg || 'rgba(255,255,255,0.08)'};
    backdrop-filter: blur(4px);
  }

  .brand-mark {
    position: absolute;
    top: 40px; right: 48px;
    z-index: 2;
    text-align: right;
    color: rgba(255,255,255,0.7);
    font-family: 'Montserrat', sans-serif;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 3px;
    text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="photo-bg">
    <img src="${config.photoPath}" alt="">
  </div>
  <div class="overlay"></div>
  ${config.brand ? `<div class="brand-mark">${config.brand}</div>` : ''}
  <div class="content">
    ${config.tag ? `<div class="tag">${config.tag}</div>` : ''}
    <div class="headline">${config.headline}</div>
    ${config.subtitle ? `<div class="subtitle">${config.subtitle}</div>` : ''}
    ${config.cta ? `<div class="cta-pill">${config.cta}</div>` : ''}
  </div>
</body>
</html>`,
  },

  // Story format 9:16 (estilo Botox Day / Paciente Portfólio)
  'story': {
    name: 'Story 9:16',
    width: 1080,
    height: 1920,
    html: (config) => `
<!DOCTYPE html>
<html>
<head>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; height: 1920px;
    font-family: 'Montserrat', sans-serif;
    overflow: hidden;
    position: relative;
  }

  .photo-bg {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
  }
  .photo-bg img {
    width: 100%; height: 100%;
    object-fit: cover;
    object-position: ${config.photoPosition || 'center center'};
  }

  .overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(
      to bottom,
      ${config.overlayTop || 'rgba(0,0,0,0.2)'} 0%,
      ${config.overlayMid || 'transparent'} 30%,
      ${config.overlayMid || 'transparent'} 50%,
      ${config.overlayBot || 'rgba(0,0,0,0.8)'} 100%
    );
    z-index: 1;
  }

  .content {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 0 56px 80px;
    z-index: 2;
    text-align: ${config.textAlign || 'center'};
  }

  .tag {
    font-size: 12px; font-weight: 500;
    letter-spacing: 5px; text-transform: uppercase;
    color: ${config.accentColor || '#c9a87c'};
    margin-bottom: 14px;
  }

  .headline {
    font-family: '${config.headlineFont || 'Playfair Display'}', serif;
    font-size: ${config.headlineSize || '72'}px;
    font-weight: ${config.headlineWeight || '700'};
    font-style: ${config.headlineItalic ? 'italic' : 'normal'};
    color: ${config.headlineColor || '#ffffff'};
    line-height: 1.05;
    letter-spacing: -1px;
    margin-bottom: 18px;
  }

  .subtitle {
    font-size: 16px; font-weight: 300;
    color: rgba(255,255,255,0.8);
    line-height: 1.6;
    margin-bottom: 32px;
  }

  .cta-pill {
    display: inline-block;
    padding: 16px 40px;
    border-radius: 50px;
    font-size: 13px; font-weight: 600;
    letter-spacing: 1px;
    color: #fff;
    background: ${config.ctaBg || config.accentColor || '#c9a87c'};
  }

  .brand-mark {
    position: absolute;
    top: 56px; right: 48px;
    z-index: 2;
    text-align: right;
    color: rgba(255,255,255,0.75);
    font-size: 13px; font-weight: 500;
    letter-spacing: 3px; text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="photo-bg">
    <img src="${config.photoPath}" alt="">
  </div>
  <div class="overlay"></div>
  ${config.brand ? `<div class="brand-mark">${config.brand}</div>` : ''}
  <div class="content">
    ${config.tag ? `<div class="tag">${config.tag}</div>` : ''}
    <div class="headline">${config.headline}</div>
    ${config.subtitle ? `<div class="subtitle">${config.subtitle}</div>` : ''}
    ${config.cta ? `<div class="cta-pill">${config.cta}</div>` : ''}
  </div>
</body>
</html>`,
  },

  // Result Card quadrado 1:1 (Meta Ads — foto + overlay + CTA sólido)
  'result-card': {
    name: 'Result Card (Ad 1:1)',
    width: 1080,
    height: 1080,
    html: (config) => `
<!DOCTYPE html>
<html>
<head>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; height: 1080px;
    font-family: 'Montserrat', sans-serif;
    overflow: hidden;
    position: relative;
  }

  .photo-bg {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
  }
  .photo-bg img {
    width: 100%; height: 100%;
    object-fit: cover;
    object-position: ${config.photoPosition || 'center center'};
  }

  .overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(
      to bottom,
      ${config.overlayTop || 'rgba(0,0,0,0.4)'} 0%,
      ${config.overlayMid || 'rgba(0,0,0,0.1)'} 40%,
      ${config.overlayBot || 'rgba(0,0,0,0.8)'} 100%
    );
    z-index: 1;
  }

  .badge {
    position: absolute;
    top: 40px; left: 48px;
    z-index: 2;
    display: inline-block;
    padding: 8px 20px;
    background: ${config.accentColor || '#C9A87C'};
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: ${config.badgeTextColor || '#1A1A1A'};
  }

  .brand-mark {
    position: absolute;
    top: 44px; right: 48px;
    z-index: 2;
    color: rgba(255,255,255,0.7);
    font-size: 11px; font-weight: 500;
    letter-spacing: 3px; text-transform: uppercase;
  }

  .content {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 0 48px 48px;
    z-index: 2;
    text-align: left;
  }

  .headline {
    font-family: '${config.headlineFont || 'Playfair Display'}', serif;
    font-size: ${config.headlineSize || '52'}px;
    font-weight: ${config.headlineWeight || '700'};
    font-style: ${config.headlineItalic ? 'italic' : 'normal'};
    color: ${config.headlineColor || '#ffffff'};
    line-height: 1.1;
    letter-spacing: -0.5px;
    margin-bottom: 16px;
  }

  .subtitle {
    font-size: 15px; font-weight: 300;
    color: rgba(255,255,255,0.8);
    line-height: 1.5;
    margin-bottom: 24px;
    max-width: 560px;
  }

  .cta-solid {
    display: inline-block;
    padding: 16px 40px;
    border-radius: 50px;
    font-size: 13px; font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: ${config.ctaColor || '#1A1A1A'};
    background: ${config.ctaBg || config.accentColor || '#C9A87C'};
  }
</style>
</head>
<body>
  <div class="photo-bg">
    <img src="${config.photoPath}" alt="">
  </div>
  <div class="overlay"></div>
  ${config.tag ? `<div class="badge">${config.tag}</div>` : ''}
  ${config.brand ? `<div class="brand-mark">${config.brand}</div>` : ''}
  <div class="content">
    <div class="headline">${config.headline}</div>
    ${config.subtitle ? `<div class="subtitle">${config.subtitle}</div>` : ''}
    ${config.cta ? `<div class="cta-solid">${config.cta}</div>` : ''}
  </div>
</body>
</html>`,
  },
};

// ============================================================
// Render engine — Playwright
// ============================================================

async function renderCreative(config) {
  // Aplicar brand e preset como defaults (config manual tem prioridade)
  config = applyBrand(config);
  config = applyPreset(config);

  const template = TEMPLATES[config.template || 'before-after'];
  if (!template) throw new Error(`Template desconhecido: ${config.template}`);

  // Resolver foto path como file:// URL
  const photoAbsPath = path.resolve(config.photoPath);
  if (!fs.existsSync(photoAbsPath)) throw new Error(`Foto não encontrada: ${photoAbsPath}`);

  // Detecção de composite: fotos largas (aspect ratio > 1.2) são antes/depois já compostas
  // Esconde labels automaticamente no template before-after
  if (config.template === 'before-after' && config.showLabels === undefined) {
    try {
      const sizeOf = require('image-size');
      const dims = sizeOf(photoAbsPath);
      if (dims.width / dims.height > 1.2) {
        config.showLabels = false;
        console.log(`[Static] Composite detectado (${dims.width}x${dims.height}), labels ocultos`);
      }
    } catch (e) {
      // image-size não disponível, manter default (labels visíveis)
    }
  }

  // Converter foto para data URI base64 (file:// bloqueado pelo Chromium)
  const photoBuffer = fs.readFileSync(photoAbsPath);
  const ext = path.extname(photoAbsPath).toLowerCase().replace('.', '');
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  config.photoPath = `data:${mime};base64,${photoBuffer.toString('base64')}`;

  const html = template.html(config);
  const outputDir = path.join(TEMP_DIR, config.outputId || `static-${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = config.outputPath || path.join(outputDir, 'creative.png');

  // Save HTML for debug
  fs.writeFileSync(path.join(outputDir, 'debug.html'), html);

  console.log(`[Static] Renderizando: ${template.name} (${template.width}x${template.height})`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: template.width, height: template.height },
    deviceScaleFactor: 2,
  });

  await page.setContent(html, { waitUntil: 'networkidle' });
  // Wait for fonts to load
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: outputPath,
    type: 'png',
    fullPage: false,
  });

  await browser.close();
  console.log(`[Static] Criativo gerado: ${outputPath}`);
  return outputPath;
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  renderCreative,
  loadBrandConfig,
  TEMPLATES,
  TEMP_DIR,
};
