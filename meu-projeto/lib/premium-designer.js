// meu-projeto/lib/premium-designer.js
// Pipeline F6 Premium Creative v3 — Cinema Quality + Multi-Style
// 17-step pipeline: Sharp (composição) + Playwright (tipografia dupla)
// Resolução: 1080x1350 — foto recortada + efeitos neon/glow + tipografia premium
// 14 presets: dark (neon-green/blue/red, gold-premium, clean-dark, amber-luxury,
//   crimson-power, matrix-green, ocean-tech, burnt-orange)
//   + light (cobalt-editorial, warm-gold, navy-corporate, earth-zen)
// Fontes: Inter, Playfair Display, Cormorant Garamond, Plus Jakarta Sans
// Efeitos: glow, rim light, bokeh, smoke/fog, glitch, light shards, vertical beams
// Header editorial + CTA pill — padrões extraídos de 238 referências premium

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const ASSETS_DIR = path.resolve(__dirname, '../assets');
const EFFECTS_DIR = path.join(ASSETS_DIR, 'effects');
const PHOTOS_DIR = path.join(ASSETS_DIR, 'photos');
const BRANDS_DIR = path.join(ASSETS_DIR, 'brands');
const TEMP_DIR = path.resolve(__dirname, '../../.carousel-temp');

const WIDTH = 1080;
const HEIGHT = 1350;

// ============================================================
// Presets de efeito (v2 — com colorMatrix, cinematicLinear, vignetteColor)
// ============================================================

const PRESETS = {
  'neon-green': {
    name: 'Neon Verde',
    emoji: '💚',
    glow: { r: 0, g: 255, b: 102 },
    effects: ['glitch'],
    gradientStops: [
      { offset: 0, color: 'rgba(0,255,102,0.18)' },
      { offset: 50, color: 'rgba(0,80,40,0.10)' },
      { offset: 100, color: 'rgba(10,10,10,0)' },
    ],
    highlightColor: '#00FF66',
    background: '#0A0A0A',
    photoLayout: 'center',
    layout: 'hero-bottom',
    colorMatrix: [
      [1.02, 0.03, 0.00],
      [0.01, 1.03, -0.01],
      [0.01, 0.01, 0.95],
    ],
    cinematicLinear: { a: 1.08, b: 8 },
    vignetteColor: { r: 0, g: 30, b: 15 },
  },
  'neon-blue': {
    name: 'Neon Azul',
    emoji: '💙',
    glow: { r: 0, g: 150, b: 255 },
    gradientStops: [
      { offset: 0, color: 'rgba(0,150,255,0.15)' },
      { offset: 50, color: 'rgba(0,50,120,0.08)' },
      { offset: 100, color: 'rgba(10,10,10,0)' },
    ],
    highlightColor: '#0096FF',
    background: '#0A0A0A',
    colorMatrix: [
      [0.90, 0.05, 0.05],
      [0.02, 0.98, 0.05],
      [0.00, 0.05, 1.15],
    ],
    cinematicLinear: { a: 1.05, b: 8 },
    vignetteColor: { r: 0, g: 15, b: 35 },
  },
  'neon-red': {
    name: 'Neon Vermelho',
    emoji: '❤️',
    glow: { r: 255, g: 50, b: 50 },
    gradientStops: [
      { offset: 0, color: 'rgba(255,50,50,0.15)' },
      { offset: 50, color: 'rgba(120,20,20,0.08)' },
      { offset: 100, color: 'rgba(10,10,10,0)' },
    ],
    highlightColor: '#FF3232',
    background: '#0A0A0A',
    colorMatrix: [
      [1.15, 0.02, 0.00],
      [0.05, 0.92, 0.02],
      [0.02, 0.02, 0.90],
    ],
    cinematicLinear: { a: 1.08, b: 6 },
    vignetteColor: { r: 35, g: 0, b: 0 },
  },
  'gold-premium': {
    name: 'Gold Premium',
    emoji: '✨',
    glow: { r: 255, g: 200, b: 50 },
    gradientStops: [
      { offset: 0, color: 'rgba(255,200,50,0.12)' },
      { offset: 50, color: 'rgba(120,90,20,0.06)' },
      { offset: 100, color: 'rgba(10,10,10,0)' },
    ],
    highlightColor: '#FFD700',
    background: '#0D0D0D',
    colorMatrix: [
      [1.10, 0.05, 0.00],
      [0.03, 1.05, 0.00],
      [0.00, 0.02, 0.85],
    ],
    cinematicLinear: { a: 1.03, b: 10 },
    vignetteColor: { r: 25, g: 18, b: 0 },
  },
  'clean-dark': {
    name: 'Clean Dark',
    emoji: '🖤',
    glow: null,
    gradientStops: [
      { offset: 0, color: 'rgba(40,40,40,0.3)' },
      { offset: 100, color: 'rgba(10,10,10,0)' },
    ],
    highlightColor: '#FFFFFF',
    background: '#0A0A0A',
    colorMatrix: [
      [1.05, 0.02, 0.02],
      [0.02, 1.05, 0.02],
      [0.02, 0.02, 1.05],
    ],
    cinematicLinear: { a: 1.10, b: 5 },
    vignetteColor: { r: 5, g: 5, b: 5 },
  },

  // ---- Novos presets (extraídos de 238 referências) ----

  'cobalt-editorial': {
    name: 'Cobalt Editorial',
    emoji: '🔷',
    glow: null,
    isLight: true,
    headlineFont: 'cormorant',
    textColor: '#1A1A2E',
    effects: [],
    gradientStops: [
      { offset: 0, color: 'rgba(45,53,197,0.05)' },
      { offset: 100, color: 'rgba(224,224,230,0)' },
    ],
    highlightColor: '#2D35C5',
    background: '#E0E0E6',
    colorMatrix: [
      [0.95, 0.03, 0.05],
      [0.02, 0.95, 0.05],
      [0.05, 0.05, 1.10],
    ],
    cinematicLinear: { a: 1.02, b: 3 },
    vignetteColor: { r: 180, g: 180, b: 190 },
  },
  'amber-luxury': {
    name: 'Amber Luxury',
    emoji: '👑',
    glow: { r: 212, g: 168, b: 83 },
    headlineFont: 'playfair',
    effects: [],
    photoLayout: 'right',
    layout: 'hero-bottom',
    gradientStops: [
      { offset: 0, color: 'rgba(212,168,83,0.12)' },
      { offset: 50, color: 'rgba(120,90,30,0.06)' },
      { offset: 100, color: 'rgba(13,11,8,0)' },
    ],
    highlightColor: '#D4A853',
    background: '#0D0B08',
    colorMatrix: [
      [1.12, 0.06, 0.00],
      [0.04, 1.06, -0.02],
      [0.00, 0.01, 0.82],
    ],
    cinematicLinear: { a: 1.04, b: 8 },
    vignetteColor: { r: 30, g: 22, b: 5 },
  },
  'crimson-power': {
    name: 'Crimson Power',
    emoji: '🔴',
    glow: { r: 212, g: 43, b: 43 },
    headlineFont: 'inter',
    effects: ['shards'],
    photoLayout: 'center',
    layout: 'hero-bottom',
    gradientStops: [
      { offset: 0, color: 'rgba(212,43,43,0.14)' },
      { offset: 50, color: 'rgba(100,15,15,0.07)' },
      { offset: 100, color: 'rgba(13,13,13,0)' },
    ],
    highlightColor: '#D42B2B',
    background: '#0D0D0D',
    colorMatrix: [
      [1.18, 0.03, 0.00],
      [0.04, 0.88, 0.02],
      [0.02, 0.02, 0.88],
    ],
    cinematicLinear: { a: 1.06, b: 5 },
    vignetteColor: { r: 40, g: 0, b: 0 },
  },
  'matrix-green': {
    name: 'Matrix Green',
    emoji: '🟢',
    glow: { r: 0, g: 255, b: 65 },
    headlineFont: 'inter',
    effects: ['glitch'],
    photoLayout: 'right',
    layout: 'hero-split',
    gradientStops: [
      { offset: 0, color: 'rgba(0,255,65,0.14)' },
      { offset: 50, color: 'rgba(0,100,25,0.07)' },
      { offset: 100, color: 'rgba(13,13,13,0)' },
    ],
    highlightColor: '#00FF41',
    background: '#0D0D0D',
    colorMatrix: [
      [0.95, 0.02, 0.00],
      [0.02, 1.10, -0.02],
      [0.01, 0.02, 0.90],
    ],
    cinematicLinear: { a: 1.08, b: 4 },
    vignetteColor: { r: 0, g: 25, b: 8 },
  },
  'ocean-tech': {
    name: 'Ocean Tech',
    emoji: '🌊',
    glow: { r: 59, g: 158, b: 255 },
    headlineFont: 'jakarta',
    effects: ['vertical-beams'],
    photoLayout: 'left',
    layout: 'hero-overlay',
    gradientStops: [
      { offset: 0, color: 'rgba(59,158,255,0.13)' },
      { offset: 50, color: 'rgba(20,60,120,0.06)' },
      { offset: 100, color: 'rgba(10,14,20,0)' },
    ],
    highlightColor: '#3B9EFF',
    background: '#0A0E14',
    colorMatrix: [
      [0.88, 0.04, 0.06],
      [0.02, 0.96, 0.06],
      [0.00, 0.06, 1.16],
    ],
    cinematicLinear: { a: 1.05, b: 6 },
    vignetteColor: { r: 5, g: 10, b: 25 },
  },
  'warm-gold': {
    name: 'Warm Gold',
    emoji: '🌻',
    glow: null,
    isLight: true,
    headlineFont: 'playfair',
    textColor: '#2A2520',
    effects: [],
    gradientStops: [
      { offset: 0, color: 'rgba(201,168,76,0.06)' },
      { offset: 100, color: 'rgba(245,240,235,0)' },
    ],
    highlightColor: '#C9A84C',
    background: '#F5F0EB',
    colorMatrix: [
      [1.06, 0.04, 0.00],
      [0.02, 1.04, -0.01],
      [0.00, 0.01, 0.90],
    ],
    cinematicLinear: { a: 1.02, b: 5 },
    vignetteColor: { r: 200, g: 190, b: 175 },
  },
  'navy-corporate': {
    name: 'Navy Corporate',
    emoji: '💼',
    glow: null,
    isLight: true,
    headlineFont: 'inter',
    textColor: '#1A1A2E',
    effects: [],
    gradientStops: [
      { offset: 0, color: 'rgba(43,76,155,0.05)' },
      { offset: 100, color: 'rgba(245,240,235,0)' },
    ],
    highlightColor: '#2B4C9B',
    background: '#F5F0EB',
    colorMatrix: [
      [0.96, 0.03, 0.04],
      [0.02, 0.96, 0.04],
      [0.04, 0.04, 1.08],
    ],
    cinematicLinear: { a: 1.03, b: 4 },
    vignetteColor: { r: 190, g: 185, b: 180 },
  },
  'burnt-orange': {
    name: 'Burnt Orange',
    emoji: '🔥',
    glow: { r: 255, g: 102, b: 51 },
    headlineFont: 'inter',
    effects: [],
    photoLayout: 'full',
    layout: 'hero-overlay',
    gradientStops: [
      { offset: 0, color: 'rgba(255,102,51,0.14)' },
      { offset: 50, color: 'rgba(120,45,15,0.07)' },
      { offset: 100, color: 'rgba(13,13,13,0)' },
    ],
    highlightColor: '#FF6633',
    background: '#0D0D0D',
    colorMatrix: [
      [1.14, 0.05, 0.00],
      [0.04, 1.00, -0.02],
      [0.00, 0.01, 0.86],
    ],
    cinematicLinear: { a: 1.06, b: 6 },
    vignetteColor: { r: 35, g: 12, b: 0 },
  },
  'earth-zen': {
    name: 'Earth Zen',
    emoji: '🍃',
    glow: null,
    isLight: true,
    headlineFont: 'cormorant',
    textColor: '#3A3028',
    effects: [],
    gradientStops: [
      { offset: 0, color: 'rgba(139,115,85,0.05)' },
      { offset: 100, color: 'rgba(242,237,231,0)' },
    ],
    highlightColor: '#8B7355',
    background: '#F2EDE7',
    colorMatrix: [
      [1.04, 0.03, 0.00],
      [0.02, 1.02, 0.00],
      [0.01, 0.02, 0.94],
    ],
    cinematicLinear: { a: 1.01, b: 5 },
    vignetteColor: { r: 195, g: 188, b: 178 },
  },
};

// ============================================================
// Font config — famílias tipográficas por preset
// ============================================================

const FONT_CONFIG = {
  inter: {
    family: 'Inter',
    import: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap",
    weight: 900,
    style: 'normal',
    letterSpacing: '-0.02em',
  },
  playfair: {
    family: 'Playfair Display',
    import: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,700;1,900&display=swap",
    weight: 900,
    style: 'italic',
    letterSpacing: '-0.01em',
  },
  cormorant: {
    family: 'Cormorant Garamond',
    import: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,700&display=swap",
    weight: 700,
    style: 'italic',
    letterSpacing: '0',
  },
  jakarta: {
    family: 'Plus Jakarta Sans',
    import: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap",
    weight: 800,
    style: 'normal',
    letterSpacing: '-0.02em',
  },
};

// ============================================================
// Seeded PRNG (deterministic bokeh)
// ============================================================

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ============================================================
// Brand config loader
// ============================================================

function loadBrandConfig(brandId = 'eric-santos') {
  const configPath = path.join(BRANDS_DIR, `${brandId}.json`);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Brand config não encontrado: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

// ============================================================
// Step 1: Background — SVG radial gradient → Sharp PNG
// ============================================================

function createBackgroundSvg(preset) {
  const stops = preset.gradientStops
    .map(s => `<stop offset="${s.offset}%" stop-color="${s.color}"/>`)
    .join('\n      ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${preset.background}"/>
  <defs>
    <radialGradient id="glow" cx="50%" cy="30%" r="70%" fx="50%" fy="30%">
      ${stops}
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
</svg>`;
}

async function renderBackground(preset) {
  const svg = Buffer.from(createBackgroundSvg(preset));
  return sharp(svg).resize(WIDTH, HEIGHT).png().toBuffer();
}

// ============================================================
// Step 1.2: Background texture — noise sutil anti-digital
// Visual DNA: "Grain sempre: 3-8% noise em soft-light"
// ============================================================

async function createBackgroundTexture(preset, overrides) {
  const opacity = overrides?.bgTextureOpacity ?? 0.7;
  if (opacity <= 0) return null;

  // Noise em escala menor → upscale cubic = textura orgânica
  const noiseW = 270;
  const noiseH = 338;
  const noiseBytes = crypto.randomBytes(noiseW * noiseH);

  // Gera buffer grayscale RGBA (noise no canal, alpha variável)
  const isLight = preset.isLight || false;
  const baseAlpha = isLight ? Math.round(12 * opacity) : Math.round(24 * opacity);

  const raw = Buffer.alloc(noiseW * noiseH * 4);
  for (let i = 0; i < noiseW * noiseH; i++) {
    const v = noiseBytes[i];
    raw[i * 4] = v;
    raw[i * 4 + 1] = v;
    raw[i * 4 + 2] = v;
    raw[i * 4 + 3] = baseAlpha;
  }

  // Upscale com kernel cubic para suavidade orgânica
  return sharp(raw, { raw: { width: noiseW, height: noiseH, channels: 4 } })
    .resize(WIDTH, HEIGHT, { kernel: 'cubic' })
    .png()
    .toBuffer();
}

// ============================================================
// Step 2: Bootstrap de efeitos (SVG → PNG) — gerados na 1ª vez
// ============================================================

async function bootstrapEffects() {
  fs.mkdirSync(EFFECTS_DIR, { recursive: true });

  // Light effects + raios diagonais por preset
  for (const [presetId, preset] of Object.entries(PRESETS)) {
    if (!preset.glow) continue;
    const effectPath = path.join(EFFECTS_DIR, `${presetId}-light.png`);
    if (fs.existsSync(effectPath)) continue;

    const { r, g, b } = preset.glow;
    // Ambient glow moderado-forte — claramente visível como iluminação neon de fundo
    const rays = generateLightRays(10, presetId.length * 42, r, g, b);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <radialGradient id="light1" cx="70%" cy="25%" r="50%">
      <stop offset="0%" stop-color="rgba(${r},${g},${b},0.22)"/>
      <stop offset="50%" stop-color="rgba(${r},${g},${b},0.08)"/>
      <stop offset="100%" stop-color="rgba(${r},${g},${b},0)"/>
    </radialGradient>
    <radialGradient id="light2" cx="25%" cy="55%" r="40%">
      <stop offset="0%" stop-color="rgba(${r},${g},${b},0.10)"/>
      <stop offset="100%" stop-color="rgba(${r},${g},${b},0)"/>
    </radialGradient>
    <radialGradient id="spotlight" cx="50%" cy="30%" r="35%">
      <stop offset="0%" stop-color="rgba(${r},${g},${b},0.15)"/>
      <stop offset="40%" stop-color="rgba(${r},${g},${b},0.05)"/>
      <stop offset="100%" stop-color="rgba(${r},${g},${b},0)"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#light1)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#light2)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#spotlight)"/>
  ${rays}
</svg>`;

    await sharp(Buffer.from(svg)).resize(WIDTH, HEIGHT).png().toFile(effectPath);
  }

  // Bokeh particles por preset
  for (const [presetId, preset] of Object.entries(PRESETS)) {
    if (!preset.glow) continue;
    const bokehPath = path.join(EFFECTS_DIR, `${presetId}-bokeh.png`);
    if (fs.existsSync(bokehPath)) continue;

    const { r, g, b } = preset.glow;
    const bokehSvg = generateBokehSvg(20, presetId.length * 1337, r, g, b);
    await sharp(Buffer.from(bokehSvg)).resize(WIDTH, HEIGHT).png().toFile(bokehPath);
  }

  // Special effects por preset (glitch, shards, vertical-beams)
  for (const [presetId, preset] of Object.entries(PRESETS)) {
    const effects = preset.effects || [];
    if (!preset.glow || effects.length === 0) continue;

    const { r, g, b } = preset.glow;
    const seed = presetId.length * 31337;

    if (effects.includes('glitch')) {
      const p = path.join(EFFECTS_DIR, `${presetId}-glitch.png`);
      if (!fs.existsSync(p)) {
        const svg = generateGlitchSvg(seed, r, g, b);
        await sharp(Buffer.from(svg)).resize(WIDTH, HEIGHT).png().toFile(p);
      }
    }

    if (effects.includes('shards')) {
      const p = path.join(EFFECTS_DIR, `${presetId}-shards.png`);
      if (!fs.existsSync(p)) {
        const svg = generateShardsSvg(seed + 1, r, g, b);
        await sharp(Buffer.from(svg)).resize(WIDTH, HEIGHT).png().toFile(p);
      }
    }

    if (effects.includes('vertical-beams')) {
      const p = path.join(EFFECTS_DIR, `${presetId}-vbeams.png`);
      if (!fs.existsSync(p)) {
        const svg = generateVerticalBeamsSvg(seed + 2, r, g, b);
        await sharp(Buffer.from(svg)).resize(WIDTH, HEIGHT).png().toFile(p);
      }
    }
  }

  // Film grain (universal, 1x)
  const grainPath = path.join(EFFECTS_DIR, 'film-grain.png');
  if (!fs.existsSync(grainPath)) {
    await generateFilmGrain(grainPath);
  }
}

// ============================================================
// Light rays — feixes diagonais neon (estilo Código 10K)
// ============================================================

function generateLightRays(count, seed, r, g, b) {
  const rand = seededRandom(seed);
  let rays = '';

  // Feixes de luz sutis apenas nos cantos extremos (menos é mais)
  // Apenas 2 barras finas nos cantos, opacidade baixa
  const corners = [
    // Canto superior direito — 1 barra fina
    { originX: WIDTH * 0.92, originY: -80, angle: 35 },
    // Canto inferior direito — 1 barra fina (longe do texto)
    { originX: WIDTH * 0.88, originY: HEIGHT * 0.15, angle: 32 },
  ];

  for (let i = 0; i < corners.length; i++) {
    const c = corners[i];
    const length = 400 + rand() * 500;
    const width = 8 + rand() * 15; // 8-23px (mais fino)
    const opacity = 0.10 + rand() * 0.10; // 0.10-0.20 (mais sutil)

    const rad = (c.angle * Math.PI) / 180;
    const endX = c.originX + Math.cos(rad) * length;
    const endY = c.originY + Math.sin(rad) * length;

    rays += `
    <line x1="${c.originX}" y1="${c.originY}" x2="${endX}" y2="${endY}"
      stroke="rgba(${r},${g},${b},${opacity.toFixed(2)})"
      stroke-width="${width.toFixed(1)}"
      stroke-linecap="butt"/>`;
  }

  return rays;
}

// ============================================================
// Texturas geométricas — zigzag/spikes no fundo
// ============================================================

function generateGeometricTexture(seed, r, g, b) {
  const rand = seededRandom(seed);
  let shapes = '';

  // Zigzag/sawtooth vertical no lado esquerdo
  const zigPoints = [];
  const zigX = WIDTH * 0.35;
  for (let y = 0; y < HEIGHT; y += 40 + rand() * 30) {
    const x = zigX + (rand() > 0.5 ? 1 : -1) * (15 + rand() * 40);
    zigPoints.push(`${x},${y}`);
  }
  if (zigPoints.length > 2) {
    shapes += `<polyline points="${zigPoints.join(' ')}"
      fill="none" stroke="rgba(${r},${g},${b},0.08)" stroke-width="2"/>`;
  }

  // Zigzag vertical no lado direito
  const zigPoints2 = [];
  const zigX2 = WIDTH * 0.65;
  for (let y = 0; y < HEIGHT; y += 35 + rand() * 25) {
    const x = zigX2 + (rand() > 0.5 ? 1 : -1) * (20 + rand() * 50);
    zigPoints2.push(`${x},${y}`);
  }
  if (zigPoints2.length > 2) {
    shapes += `<polyline points="${zigPoints2.join(' ')}"
      fill="none" stroke="rgba(${r},${g},${b},0.06)" stroke-width="2.5"/>`;
  }

  // Linhas angulares decorativas
  for (let i = 0; i < 6; i++) {
    const x1 = rand() * WIDTH;
    const y1 = rand() * HEIGHT;
    const angle = 30 + rand() * 60;
    const len = 200 + rand() * 400;
    const rad = (angle * Math.PI) / 180;
    shapes += `<line x1="${x1}" y1="${y1}" x2="${x1 + Math.cos(rad) * len}" y2="${y1 + Math.sin(rad) * len}"
      stroke="rgba(${r},${g},${b},0.05)" stroke-width="${1 + rand() * 2}"/>`;
  }

  return shapes;
}

// ============================================================
// Bokeh particles — SVG circles com radial gradient
// ============================================================

function generateBokehSvg(count, seed, r, g, b) {
  const rand = seededRandom(seed);
  let circles = '';

  for (let i = 0; i < count; i++) {
    const cx = Math.round(rand() * WIDTH);
    const cy = Math.round(rand() * HEIGHT);
    const radius = 15 + Math.round(rand() * 55);

    circles += `
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#bokeh${i})"/>`;
  }

  let defs = '';
  for (let i = 0; i < count; i++) {
    const opacity = 0.08 + seededRandom(seed + i)() * 0.15;
    defs += `
    <radialGradient id="bokeh${i}" cx="35%" cy="35%" r="50%">
      <stop offset="0%" stop-color="rgba(${r},${g},${b},${opacity.toFixed(2)})"/>
      <stop offset="40%" stop-color="rgba(${r},${g},${b},${(opacity * 0.5).toFixed(3)})"/>
      <stop offset="80%" stop-color="rgba(${r},${g},${b},${(opacity * 0.15).toFixed(3)})"/>
      <stop offset="100%" stop-color="rgba(${r},${g},${b},0)"/>
    </radialGradient>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>${defs}
  </defs>
  ${circles}
</svg>`;
}

// ============================================================
// Glitch overlay — linhas verticais de deslocamento digital
// ============================================================

function generateGlitchSvg(seed, r, g, b) {
  const rand = seededRandom(seed);
  let lines = '';

  // Zona central do glow (onde o glitch aparece)
  const glitchTop = Math.round(HEIGHT * 0.15);
  const glitchBottom = Math.round(HEIGHT * 0.55);
  const glitchLeft = Math.round(WIDTH * 0.25);
  const glitchRight = Math.round(WIDTH * 0.75);

  // Linhas verticais irregulares (displacement digital)
  for (let i = 0; i < 25; i++) {
    const x = glitchLeft + rand() * (glitchRight - glitchLeft);
    const y = glitchTop + rand() * (glitchBottom - glitchTop);
    const w = 2 + rand() * 8;
    const h = 20 + rand() * 80;
    const opacity = 0.08 + rand() * 0.18;
    const dx = (rand() - 0.5) * 15; // deslocamento horizontal

    lines += `<rect x="${x + dx}" y="${y}" width="${w}" height="${h}"
      fill="rgba(${r},${g},${b},${opacity.toFixed(2)})" rx="1"/>`;
  }

  // Scanlines horizontais finas (interferência)
  for (let i = 0; i < 8; i++) {
    const y = glitchTop + rand() * (glitchBottom - glitchTop);
    const w = 100 + rand() * 300;
    const x = glitchLeft + rand() * (glitchRight - glitchLeft - w);
    const opacity = 0.05 + rand() * 0.10;

    lines += `<rect x="${x}" y="${y}" width="${w}" height="${1 + rand() * 3}"
      fill="rgba(${r},${g},${b},${opacity.toFixed(2)})"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  ${lines}
</svg>`;
}

// ============================================================
// Light shards — polígonos angulares (fragmentos de vidro)
// ============================================================

function generateShardsSvg(seed, r, g, b) {
  const rand = seededRandom(seed);
  let shards = '';

  // 3-5 shards angulares atrás do sujeito
  const count = 3 + Math.floor(rand() * 3);
  const centerX = WIDTH / 2;
  const centerY = HEIGHT * 0.35;

  for (let i = 0; i < count; i++) {
    // Cada shard é um trapézio/triângulo angular
    const angle = -30 + rand() * 60; // ângulo base (-30° a +30°)
    const size = 150 + rand() * 250;
    const offsetX = (rand() - 0.5) * WIDTH * 0.5;
    const offsetY = (rand() - 0.5) * HEIGHT * 0.3;

    const cx = centerX + offsetX;
    const cy = centerY + offsetY;
    const rad = (angle * Math.PI) / 180;

    // 4 pontos do shard (trapézio angular)
    const w1 = 30 + rand() * 60; // largura superior
    const w2 = 60 + rand() * 120; // largura inferior
    const points = [
      `${cx - w1 / 2},${cy - size / 2}`,
      `${cx + w1 / 2},${cy - size / 2}`,
      `${cx + w2 / 2},${cy + size / 2}`,
      `${cx - w2 / 2},${cy + size / 2}`,
    ].join(' ');

    const opacity = 0.06 + rand() * 0.10;

    shards += `<polygon points="${points}"
      fill="rgba(${r},${g},${b},${opacity.toFixed(2)})"
      transform="rotate(${angle.toFixed(1)} ${cx} ${cy})"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  ${shards}
</svg>`;
}

// ============================================================
// Vertical beams — feixes verticais finos com glow
// ============================================================

function generateVerticalBeamsSvg(seed, r, g, b) {
  const rand = seededRandom(seed);
  let beams = '';
  let defs = '';

  const count = 8 + Math.floor(rand() * 6);

  for (let i = 0; i < count; i++) {
    const x = WIDTH * 0.1 + rand() * WIDTH * 0.8;
    const w = 1 + rand() * 4;
    const opacity = 0.06 + rand() * 0.12;
    const h = HEIGHT * (0.4 + rand() * 0.5);
    const y = rand() * HEIGHT * 0.2;

    // Gradiente linear vertical para fade nas pontas
    defs += `<linearGradient id="vbeam${i}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(${r},${g},${b},0)"/>
      <stop offset="20%" stop-color="rgba(${r},${g},${b},${opacity.toFixed(2)})"/>
      <stop offset="80%" stop-color="rgba(${r},${g},${b},${opacity.toFixed(2)})"/>
      <stop offset="100%" stop-color="rgba(${r},${g},${b},0)"/>
    </linearGradient>`;

    beams += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#vbeam${i})"/>`;

    // Glow largo atrás de cada beam (blur visual)
    if (rand() > 0.5) {
      beams += `<rect x="${x - 10}" y="${y}" width="${w + 20}" height="${h}"
        fill="rgba(${r},${g},${b},${(opacity * 0.3).toFixed(3)})" rx="10"/>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>${defs}</defs>
  ${beams}
</svg>`;
}

// ============================================================
// Film grain — noise via crypto.randomBytes
// ============================================================

async function generateFilmGrain(outputPath) {
  // Gera noise em resolução menor (540x675) e upscale → grain mais visível
  const gW = 540;
  const gH = 675;
  const pixels = gW * gH;
  const rawBuf = Buffer.alloc(pixels * 4);
  const noise = crypto.randomBytes(pixels);

  for (let i = 0; i < pixels; i++) {
    // Center around gray 128, range ±30
    const v = 128 + ((noise[i] - 128) * 0.24) | 0;
    const idx = i * 4;
    rawBuf[idx] = v;     // R
    rawBuf[idx + 1] = v; // G
    rawBuf[idx + 2] = v; // B
    rawBuf[idx + 3] = 40; // Alpha — semi-transparent
  }

  await sharp(rawBuf, { raw: { width: gW, height: gH, channels: 4 } })
    .resize(WIDTH, HEIGHT, { kernel: 'nearest' })
    .png()
    .toFile(outputPath);
}

// ============================================================
// Feather edges — blur no alpha channel → bordas suaves
// ============================================================

async function featherEdges(photoBuf, radius = 6) {
  const meta = await sharp(photoBuf).metadata();
  const w = meta.width;
  const h = meta.height;

  // Blur moderado no alpha (não exagerar — borda muito mole = pior)
  const blurredAlpha = await sharp(photoBuf)
    .extractChannel(3)
    .blur(radius + 1)
    .raw()
    .toBuffer();

  const rgb = await sharp(photoBuf)
    .removeAlpha()
    .raw()
    .toBuffer();

  const origAlpha = await sharp(photoBuf)
    .extractChannel(3)
    .raw()
    .toBuffer();

  // Combina: alpha blurred + fade gradual nas bordas inferiores (30% bottom)
  const combined = Buffer.alloc(w * h * 4);
  const fadeStart = Math.round(h * 0.70); // fade começa a 70% da altura
  for (let i = 0; i < w * h; i++) {
    const y = Math.floor(i / w);
    const x = i % w;
    combined[i * 4] = rgb[i * 3];
    combined[i * 4 + 1] = rgb[i * 3 + 1];
    combined[i * 4 + 2] = rgb[i * 3 + 2];

    let a = blurredAlpha[i];
    // Fade gradual no bottom 25% apenas
    if (y > fadeStart) {
      const fadeProgress = (y - fadeStart) / (h - fadeStart);
      a = Math.round(a * (1 - fadeProgress * fadeProgress));
    }
    combined[i * 4 + 3] = a;
  }

  return sharp(combined, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
}

// ============================================================
// Rim light — edge detect → tint → glow na borda do sujeito
// ============================================================

async function createRimLight(photoBuf, preset) {
  if (!preset.glow) return null;

  const { r, g, b } = preset.glow;
  const meta = await sharp(photoBuf).metadata();
  const w = meta.width;
  const h = meta.height;

  // Extrai alpha e cria versão dilatada (expandida)
  const alphaRaw = await sharp(photoBuf)
    .extractChannel(3)
    .raw()
    .toBuffer();

  // Dilata: blur suave no alpha → threshold → borda FINA expandida
  const dilated = await sharp(photoBuf)
    .extractChannel(3)
    .blur(5)
    .threshold(50)
    .raw()
    .toBuffer();

  // Subtrai: dilated - original = contorno fino do sujeito
  // Aplica gradiente direcional (mais forte no lado direito + topo = backlight)
  const result = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const dil = dilated[i];
    const orig = alphaRaw[i];
    const border = Math.max(0, dil - orig);
    if (border > 30) {
      const x = i % w;
      const y = Math.floor(i / w);
      // Gradiente direcional: forte nos lados, atenuado no centro-topo
      const xNorm = x / w; // 0→1 left→right
      const yNorm = y / h; // 0→1 top→bottom
      const xFactor = 0.4 + xNorm * 0.6; // mais forte no lado direito
      const yFactor = 1.0 - yNorm * 0.4; // atenua embaixo
      // Atenuar centro-topo (evitar auréola): reduz se x está no meio e y está no topo
      const centerDist = Math.abs(xNorm - 0.5) * 2; // 0 no centro, 1 nas bordas
      const topAttenuation = yNorm < 0.25 ? (0.3 + 0.7 * Math.max(centerDist, yNorm * 4)) : 1.0;
      const dirFactor = xFactor * yFactor * topAttenuation;
      const alpha = Math.min(255, Math.round(border * 1.8 * dirFactor));
      if (alpha > 15) {
        result[i * 4] = r;
        result[i * 4 + 1] = g;
        result[i * 4 + 2] = b;
        result[i * 4 + 3] = alpha;
      }
    }
  }

  // Dois passes: contorno nítido + halo suave
  const sharpGlow = await sharp(result, { raw: { width: w, height: h, channels: 4 } })
    .blur(5)
    .png()
    .toBuffer();

  const wideGlow = await sharp(result, { raw: { width: w, height: h, channels: 4 } })
    .blur(20)
    .linear(1.2, 0)
    .png()
    .toBuffer();

  return sharp(sharpGlow)
    .composite([{ input: wideGlow, blend: 'screen' }])
    .png()
    .toBuffer();
}

// ============================================================
// Step 5.5: Photo color grading — desaturar, crush blacks, tint
// Referência Hyeser: pele dessaturada -40%, sombras esmagadas, contraste alto
// ============================================================

async function gradePhoto(photoBuf, preset, overrides) {
  if (preset.isLight) return photoBuf; // Presets claros mantêm foto natural

  const gradeIntensity = overrides?.photoGradeIntensity ?? 0.7;
  if (gradeIntensity <= 0) return photoBuf;

  // Desaturar leve: -25% (não exagerar, manter pele natural)
  const saturation = 1.0 - (0.25 * gradeIntensity); // ~0.825 no default

  // Contraste moderado (não esmagar os pretos demais)
  const contrastMult = 1.0 + (0.20 * gradeIntensity); // ~1.14 default
  const blackCrush = Math.round(-8 * gradeIntensity);  // ~-6 default

  let graded = await sharp(photoBuf)
    .modulate({ saturation })
    .linear(contrastMult, blackCrush)
    .png()
    .toBuffer();

  // Tint sutil: aplicar recomb matrix puxando para a cor do preset
  if (preset.glow && preset.colorMatrix) {
    graded = await sharp(graded)
      .recomb(preset.colorMatrix)
      .png()
      .toBuffer();
  }

  return graded;
}

// ============================================================
// Step 6.5: Photo color cast — tinge foto com cor da cena
// Maior impacto isolado contra efeito "sticker colado"
// ============================================================

async function createPhotoColorCast(photoBuf, preset, overrides) {
  if (!preset.glow) return photoBuf;
  if (preset.isLight) return photoBuf;

  const intensity = overrides?.colorCastIntensity ?? 0.5;
  if (intensity <= 0) return photoBuf;

  const { r, g, b } = preset.glow;
  const meta = await sharp(photoBuf).metadata();
  const w = meta.width;
  const h = meta.height;

  // Extrai alpha original (onde a pessoa está)
  const alphaRaw = await sharp(photoBuf)
    .extractChannel(3)
    .raw()
    .toBuffer();

  // Cria overlay com cor do glow — mais forte nas bordas, fraco no centro
  const castAlpha = Math.round(40 * intensity); // 0-40 base
  const edgeBoost = Math.round(30 * intensity); // +30 nas bordas

  const overlay = Buffer.alloc(w * h * 4);
  const cx = w / 2;
  const cy = h / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let i = 0; i < w * h; i++) {
    const personAlpha = alphaRaw[i];
    if (personAlpha < 10) continue; // skip pixels transparentes

    const x = i % w;
    const y = Math.floor(i / w);

    // Distância do centro normalizada (0 centro, 1 borda)
    const dx = (x - cx) / cx;
    const dy = (y - cy) / cy;
    const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy));

    // Mais cor nas bordas, menos no centro (preserva tons de pele)
    const edgeFactor = dist * dist; // quadrático = transição suave
    const alpha = Math.round((castAlpha + edgeBoost * edgeFactor) * (personAlpha / 255));

    overlay[i * 4] = r;
    overlay[i * 4 + 1] = g;
    overlay[i * 4 + 2] = b;
    overlay[i * 4 + 3] = alpha;
  }

  const castLayer = await sharp(overlay, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();

  // Soft-light blend sobre a foto original
  return sharp(photoBuf)
    .composite([{ input: castLayer, blend: 'soft-light' }])
    .png()
    .toBuffer();
}

// ============================================================
// Step 7.8: Shadow projection — sombra da persona no chão
// Sensação de "estar pisando" na cena
// ============================================================

async function createShadowLayer(photoBuf, preset, photo, overrides) {
  const opacity = overrides?.shadowOpacity ?? 0.5;
  if (opacity <= 0) return null;
  if (preset.isLight) return null;

  const meta = await sharp(photoBuf).metadata();
  const photoW = meta.width;
  const photoH = meta.height;

  // Extrai silhueta da pessoa (alpha channel)
  const alphaRaw = await sharp(photoBuf)
    .extractChannel(3)
    .raw()
    .toBuffer();

  // Comprime verticalmente (25% da altura) = projeção no chão
  const shadowH = Math.round(photoH * 0.25);
  const shadowAlpha = Math.round(25 * opacity); // sombra sutil

  // Cor da sombra: glow color escuro ou preto puro
  const sr = preset.glow ? Math.round(preset.glow.r * 0.1) : 0;
  const sg = preset.glow ? Math.round(preset.glow.g * 0.1) : 0;
  const sb = preset.glow ? Math.round(preset.glow.b * 0.1) : 0;

  // Cria silhueta comprimida no canvas completo (1080x1350)
  const shadowBuf = Buffer.alloc(WIDTH * HEIGHT * 4);

  // Posiciona a sombra nos pés da persona
  const feetY = photo.top + photoH; // base da foto
  const shadowTop = Math.min(feetY - Math.round(shadowH * 0.3), HEIGHT - shadowH);

  for (let sy = 0; sy < shadowH; sy++) {
    // Mapeia y da sombra para y da foto original (de baixo para cima)
    const srcY = Math.round(photoH - 1 - (sy / shadowH) * photoH * 0.5);
    if (srcY < 0 || srcY >= photoH) continue;

    // Fade vertical: mais forte no topo da sombra (perto dos pés), fraco embaixo
    const fadeFactor = 1 - (sy / shadowH);

    for (let sx = 0; sx < photoW; sx++) {
      const srcIdx = srcY * photoW + sx;
      const personAlpha = alphaRaw[srcIdx];
      if (personAlpha < 30) continue;

      const destX = photo.left + sx;
      const destY = shadowTop + sy;
      if (destX < 0 || destX >= WIDTH || destY < 0 || destY >= HEIGHT) continue;

      const destIdx = destY * WIDTH + destX;
      const a = Math.round(shadowAlpha * fadeFactor * (personAlpha / 255));
      if (a < 2) continue;

      shadowBuf[destIdx * 4] = sr;
      shadowBuf[destIdx * 4 + 1] = sg;
      shadowBuf[destIdx * 4 + 2] = sb;
      shadowBuf[destIdx * 4 + 3] = a;
    }
  }

  // Blur forte para suavizar bordas da sombra
  return sharp(shadowBuf, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } })
    .blur(30)
    .png()
    .toBuffer();
}

// ============================================================
// Step 8: Ambient light wrap — luz do glow envolvendo a persona
// Diferença do rim: wrap = largo (20-40px), difuso, integração
// ============================================================

async function createAmbientLightWrap(photoBuf, preset, photo, overrides) {
  if (!preset.glow) return null;
  if (preset.isLight) return null;

  const intensity = overrides?.lightWrapIntensity ?? 0.6;
  if (intensity <= 0) return null;

  const { r, g, b } = preset.glow;
  const meta = await sharp(photoBuf).metadata();
  const w = meta.width;
  const h = meta.height;

  // Alpha original da foto
  const alphaRaw = await sharp(photoBuf)
    .extractChannel(3)
    .raw()
    .toBuffer();

  // Alpha dilatado (blur grande = silhueta expandida)
  const dilatedAlpha = await sharp(photoBuf)
    .extractChannel(3)
    .blur(18)
    .raw()
    .toBuffer();

  // Anel de borda = dilatado - original (onde a luz "sangra")
  const wrapAlpha = Math.round(80 * intensity);
  const wrapBuf = Buffer.alloc(w * h * 4);

  for (let i = 0; i < w * h; i++) {
    const dil = dilatedAlpha[i];
    const orig = alphaRaw[i];

    // Zona de wrap: onde o dilatado existe mas o original não (ou é fraco)
    const wrapZone = Math.max(0, dil - orig);
    if (wrapZone < 15) continue;

    // Intensidade proporcional à zona de wrap
    const a = Math.min(255, Math.round(wrapZone * (wrapAlpha / 255)));
    if (a < 3) continue;

    wrapBuf[i * 4] = r;
    wrapBuf[i * 4 + 1] = g;
    wrapBuf[i * 4 + 2] = b;
    wrapBuf[i * 4 + 3] = a;
  }

  // Blur suave para difundir a luz
  const wrapLayer = await sharp(wrapBuf, { raw: { width: w, height: h, channels: 4 } })
    .blur(8)
    .png()
    .toBuffer();

  // Posiciona no canvas completo (mesma posição da foto)
  const canvas = await sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).png().toBuffer();

  return sharp(canvas)
    .composite([{ input: wrapLayer, left: photo.left, top: photo.top, blend: 'over' }])
    .png()
    .toBuffer();
}

// ============================================================
// Depth panels — painéis geométricos de profundidade (estilo Hyeser)
// ============================================================

function createDepthPanelsSvg(preset, seed) {
  const rand = seededRandom(seed || 42);
  const bg = preset.background || '#0A0A0A';
  const glow = preset.glow || { r: 255, g: 255, b: 255 };

  const bgR = parseInt(bg.slice(1, 3), 16) || 10;
  const bgG = parseInt(bg.slice(3, 5), 16) || 10;
  const bgB = parseInt(bg.slice(5, 7), 16) || 10;

  let panels = '';

  // 2-3 painéis geométricos de fundo (tons escuros, sutis)
  const panelCount = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < panelCount; i++) {
    const lift = 6 + Math.round(rand() * 8);
    const pR = Math.min(255, bgR + lift);
    const pG = Math.min(255, bgG + lift);
    const pB = Math.min(255, bgB + lift);

    const x = Math.round(-WIDTH * 0.1 + rand() * WIDTH * 0.5);
    const y = Math.round(-HEIGHT * 0.1 + rand() * HEIGHT * 0.5);
    const w = Math.round(WIDTH * (0.4 + rand() * 0.5));
    const h = Math.round(HEIGHT * (0.5 + rand() * 0.4));
    const angle = -15 + Math.round(rand() * 30);
    const cx = x + w / 2;
    const cy = y + h / 2;

    panels += `<rect x="${x}" y="${y}" width="${w}" height="${h}"
      fill="rgb(${pR},${pG},${pB})"
      transform="rotate(${angle} ${cx} ${cy})"/>`;
    panels += `<rect x="${x}" y="${y}" width="${w}" height="${h}"
      fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"
      transform="rotate(${angle} ${cx} ${cy})"/>`;
  }

  // Accent lines mínimas — apenas 1-2 linhas finas nos cantos (estilo premium limpo)
  const ar = glow.r, ag = glow.g, ab = glow.b;

  // Linha fina superior esquerda (sutil, apenas moldura)
  panels += `<line x1="50" y1="50" x2="50" y2="180"
    stroke="rgba(${ar},${ag},${ab},0.08)" stroke-width="1"/>`;
  panels += `<line x1="50" y1="50" x2="180" y2="50"
    stroke="rgba(${ar},${ag},${ab},0.08)" stroke-width="1"/>`;

  // Linha fina inferior direita (contraponto)
  panels += `<line x1="${WIDTH - 50}" y1="${HEIGHT - 180}" x2="${WIDTH - 50}" y2="${HEIGHT - 50}"
    stroke="rgba(${ar},${ag},${ab},0.06)" stroke-width="1"/>`;
  panels += `<line x1="${WIDTH - 180}" y1="${HEIGHT - 50}" x2="${WIDTH - 50}" y2="${HEIGHT - 50}"
    stroke="rgba(${ar},${ag},${ab},0.06)" stroke-width="1"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  ${panels}
</svg>`;
}

async function createDepthPanels(preset, seed) {
  if (preset.isLight) return null; // Skip para presets claros
  const svg = Buffer.from(createDepthPanelsSvg(preset, seed));
  return sharp(svg).resize(WIDTH, HEIGHT).png().toBuffer();
}

// ============================================================
// Smoke/fog — SVG gradient nos 30% inferiores
// ============================================================

function createSmokeFogSvg(preset, overrides) {
  // Névoa atmosférica — cor escura do preset (não branca, senão fica estourado)
  const fogR = preset.glow ? Math.round(preset.glow.r * 0.3) : 20;
  const fogG = preset.glow ? Math.round(preset.glow.g * 0.3) : 20;
  const fogB = preset.glow ? Math.round(preset.glow.b * 0.3) : 20;
  const smokeScale = overrides?.smokeOpacity || 1.0;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="fog" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(${fogR},${fogG},${fogB},0)"/>
      <stop offset="60%" stop-color="rgba(${fogR},${fogG},${fogB},0)"/>
      <stop offset="78%" stop-color="rgba(${fogR},${fogG},${fogB},${(0.08 * smokeScale).toFixed(2)})"/>
      <stop offset="88%" stop-color="rgba(${fogR},${fogG},${fogB},${(0.18 * smokeScale).toFixed(2)})"/>
      <stop offset="95%" stop-color="rgba(${fogR},${fogG},${fogB},${(0.30 * smokeScale).toFixed(2)})"/>
      <stop offset="100%" stop-color="rgba(${fogR},${fogG},${fogB},${(0.40 * smokeScale).toFixed(2)})"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#fog)"/>
</svg>`;
}

async function createSmokeFog(preset, overrides) {
  const svg = Buffer.from(createSmokeFogSvg(preset, overrides));
  return sharp(svg).resize(WIDTH, HEIGHT).png().toBuffer();
}

// ============================================================
// Glow atrás do sujeito — blur + tint da foto
// ============================================================

async function createGlowLayer(photoBuf, preset, overrides) {
  if (!preset.glow) return null;

  const { r, g, b } = preset.glow;
  const gi = overrides?.glowOpacity || 1.0;

  // Glow v2: PAINEL NEON vertical concentrado (estilo Hyeser/Codigo010K)
  // Retângulo de luz com bordas soft — fonte de luz LED atrás do sujeito
  const panelOpacity = (0.55 * gi).toFixed(2);
  const coreOpacity = (0.70 * gi).toFixed(2);
  const haloOpacity = (0.18 * gi).toFixed(2);

  // Dimensões do painel (centrado onde fica o torso/cabeça)
  const panelW = Math.round(WIDTH * 0.38);
  const panelH = Math.round(HEIGHT * 0.55);
  const panelX = Math.round((WIDTH - panelW) / 2);
  const panelY = Math.round(HEIGHT * 0.02);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="panelH" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(${r},${g},${b},0)"/>
      <stop offset="18%" stop-color="rgba(${r},${g},${b},${panelOpacity})"/>
      <stop offset="82%" stop-color="rgba(${r},${g},${b},${panelOpacity})"/>
      <stop offset="100%" stop-color="rgba(${r},${g},${b},0)"/>
    </linearGradient>
    <linearGradient id="panelV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity="0.6"/>
      <stop offset="12%" stop-color="white" stop-opacity="1"/>
      <stop offset="70%" stop-color="white" stop-opacity="1"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </linearGradient>
    <mask id="panelMask">
      <rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" fill="url(#panelV)"/>
    </mask>
    <radialGradient id="core" cx="50%" cy="25%" rx="14%" ry="22%">
      <stop offset="0%" stop-color="rgba(${r},${g},${b},${coreOpacity})"/>
      <stop offset="35%" stop-color="rgba(${r},${g},${b},${(coreOpacity * 0.5).toFixed(2)})"/>
      <stop offset="100%" stop-color="rgba(${r},${g},${b},0)"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="30%" rx="42%" ry="40%">
      <stop offset="0%" stop-color="rgba(${r},${g},${b},${haloOpacity})"/>
      <stop offset="55%" stop-color="rgba(${r},${g},${b},${(haloOpacity * 0.3).toFixed(2)})"/>
      <stop offset="100%" stop-color="rgba(${r},${g},${b},0)"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#halo)"/>
  <rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" fill="url(#panelH)" mask="url(#panelMask)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#core)"/>
</svg>`;

  // Blur moderado para bordas orgânicas (não geométricas demais)
  return sharp(Buffer.from(svg))
    .resize(WIDTH, HEIGHT)
    .blur(30)
    .png()
    .toBuffer();
}

// ============================================================
// Photo layer — ancorada bottom-center
// ============================================================

async function composePhotoLayer(photoBuf, photoLayout = 'center', textLayout = 'hero-bottom', overrides) {
  const photoScale = overrides?.photoScale || 1.0;
  let maxH, maxW, top, left;

  switch (textLayout) {
    case 'hero-split':
      maxW = Math.round(WIDTH * 0.55 * photoScale);
      maxH = Math.round(HEIGHT * 0.75 * photoScale);
      break;
    case 'hero-overlay':
      maxW = Math.round(WIDTH * 0.85 * photoScale);
      maxH = Math.round(HEIGHT * 0.70 * photoScale);
      break;
    default: // hero-bottom
      // Foto menor = mais espaço para respirar + cabeça completa
      maxW = Math.round(WIDTH * 0.80 * photoScale);
      maxH = Math.round(HEIGHT * 0.60 * photoScale);
  }

  const resized = await sharp(photoBuf)
    .resize({ width: maxW, height: maxH, fit: 'inside' })
    .png()
    .toBuffer();

  const meta = await sharp(resized).metadata();

  // Posição vertical — rosto no terço superior, cabeça COMPLETA visível
  switch (textLayout) {
    case 'hero-split':
      top = Math.round((HEIGHT - meta.height) * 0.30);
      break;
    case 'hero-overlay':
      top = Math.round(HEIGHT * 0.06);
      break;
    default: // hero-bottom
      // Margem generosa no topo para não cortar cabeça
      top = Math.round(HEIGHT * 0.06);
  }

  // Posição horizontal
  switch (photoLayout) {
    case 'right':
      left = WIDTH - meta.width;
      break;
    case 'left':
      left = 0;
      break;
    case 'full':
      left = Math.round((WIDTH - meta.width) / 2);
      break;
    default: // center
      left = Math.round((WIDTH - meta.width) / 2);
  }

  return { buffer: resized, left, top, width: meta.width, height: meta.height };
}

// ============================================================
// Tipografia — Playwright omitBackground: true
// Renderiza 2 layers num só browser: backText + frontText
// ============================================================

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildBackTextHtml(text, preset) {
  const headline = text.headline || 'PREMIUM';
  const words = headline.toUpperCase().split(/\s+/);
  const backWord1 = words[0] || 'ERIC';
  const backWord2 = words.length > 1 ? words[words.length - 1] : 'SANTOS';

  const isLight = preset.isLight || false;
  const fontId = preset.headlineFont || 'inter';
  const font = FONT_CONFIG[fontId] || FONT_CONFIG.inter;
  const color = isLight ? (preset.textColor || '#1A1A2E') : (preset.highlightColor || '#FFFFFF');
  const op1 = isLight ? 0.04 : 0.10;
  const op2 = isLight ? 0.03 : 0.07;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('${font.import}');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 540px;
    height: 675px;
    background: transparent;
    overflow: hidden;
    font-family: '${font.family}', 'Inter', sans-serif;
    position: relative;
  }
  .back-text-top {
    position: absolute;
    top: -15px;
    left: -20px;
    font-size: 200px;
    font-weight: ${font.weight};
    font-style: ${font.style};
    color: ${color};
    opacity: ${op1};
    text-transform: uppercase;
    letter-spacing: -0.05em;
    line-height: 0.85;
    white-space: nowrap;
  }
  .back-text-mid {
    position: absolute;
    top: 280px;
    right: -30px;
    font-size: 160px;
    font-weight: ${font.weight};
    font-style: ${font.style};
    color: ${color};
    opacity: ${op2};
    text-transform: uppercase;
    letter-spacing: -0.04em;
    line-height: 0.85;
    white-space: nowrap;
    transform: rotate(-3deg);
  }
</style>
</head>
<body>
  <div class="back-text-top">${escapeHtml(backWord1)}</div>
  <div class="back-text-mid">${escapeHtml(backWord2)}</div>
</body>
</html>`;
}

function buildFrontTextHtml(text, brand, preset) {
  const headline = text.headline || '';
  const subtitle = text.subtitle || '';
  const highlights = text.highlights || [];
  const category = text.category || '';
  const cta = text.cta || 'SAIBA MAIS';
  const badge = text.badge || null; // { icon: '🔥', value: '10K+' }
  const layout = preset.layout || 'hero-bottom';

  const isLight = preset.isLight || false;
  const fontId = preset.headlineFont || 'inter';
  const font = FONT_CONFIG[fontId] || FONT_CONFIG.inter;
  const textColor = isLight ? (preset.textColor || '#1A1A2E') : '#FFFFFF';
  const subtitleColor = isLight ? 'rgba(30,30,30,0.60)' : 'rgba(255,255,255,0.70)';
  const handleColor = isLight ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.45)';

  const hLen = headline.length;
  // Tamanho do headline adaptado ao layout (overridável pelo critic)
  let headlineSize;
  if (text._headlineSizeOverride) {
    headlineSize = text._headlineSizeOverride;
  } else if (layout === 'hero-split') {
    headlineSize = hLen > 50 ? '34px' : hLen > 30 ? '40px' : '48px';
  } else {
    // Tamanhos agressivos estilo Hyeser/Codigo010K — headline domina
    headlineSize = hLen > 80 ? '48px' : hLen > 50 ? '54px' : hLen > 30 ? '62px' : '72px';
  }

  // Quebras de linha inteligentes — órfãs (artigos/preposições) grudam na PRÓXIMA palavra
  const ORPHAN_WORDS = new Set(['O', 'A', 'OS', 'AS', 'UM', 'UMA', 'DE', 'DO', 'DA', 'E', 'EM', 'NO', 'NA', 'COM', 'POR', 'SUA', 'SEU']);

  function balanceHeadline(text, highlights) {
    const words = text.toUpperCase().split(/\s+/);
    if (words.length <= 2) return applyHighlights(escapeHtml(text), highlights);

    // Agrupar: órfãs se grudam à PRÓXIMA palavra forte
    // Ex: "DOMINE O MERCADO DIGITAL" → ["DOMINE", "O MERCADO", "DIGITAL"]
    const groups = [];
    let prefix = []; // buffer de órfãs que esperam a próxima palavra forte

    for (const word of words) {
      if (ORPHAN_WORDS.has(word)) {
        prefix.push(word);
      } else {
        // Palavra forte: combinar com órfãs anteriores
        const group = [...prefix, word].join(' ');
        groups.push(group);
        prefix = [];
      }
    }

    // Se sobrou órfã no final, juntar com o último grupo
    if (prefix.length > 0 && groups.length > 0) {
      groups[groups.length - 1] += ' ' + prefix.join(' ');
    } else if (prefix.length > 0) {
      groups.push(prefix.join(' '));
    }

    return groups.map(line => applyHighlights(escapeHtml(line), highlights)).join('<br>');
  }

  function applyHighlights(html, highlights) {
    for (const word of highlights) {
      const escaped = escapeHtml(word);
      const regex = new RegExp(`(${escaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      html = html.replace(regex, `<span class="highlight">$1</span>`);
    }
    return html;
  }

  let headlineHtml = balanceHeadline(headline, highlights);

  const subtitleHtml = subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : '';

  // Header editorial: HANDLE | CATEGORIA | ANO
  const year = new Date().getFullYear();
  const headerParts = [brand.handle.toUpperCase()];
  if (category) headerParts.push(category.toUpperCase());
  headerParts.push(String(year));
  const headerText = headerParts.join('  ·  ');

  // Badge decorativo (opcional)
  const badgeHtml = badge
    ? `<div class="badge">${badge.icon ? `<span class="badge-icon">${badge.icon}</span>` : ''}${escapeHtml(badge.value || '')}</div>`
    : '';

  // Contraste automático: texto escuro em highlight claro, branco em escuro
  const hlColor = preset.highlightColor || '#00FF66';
  const hlR = parseInt(hlColor.slice(1, 3), 16) || 0;
  const hlG = parseInt(hlColor.slice(3, 5), 16) || 0;
  const hlB = parseInt(hlColor.slice(5, 7), 16) || 0;
  const hlLuminance = (0.299 * hlR + 0.587 * hlG + 0.114 * hlB) / 255;
  const hlTextColor = hlLuminance > 0.55 ? '#000000' : '#FFFFFF';

  // Gradient e layout CSS conforme variante
  // REGRA: texto e foto NUNCA competem pelo mesmo espaço
  let gradientCss, contentCss;
  switch (layout) {
    case 'hero-split':
      // Gradient lateral cobrindo o lado esquerdo (zona do texto)
      gradientCss = isLight
        ? `background: linear-gradient(to right,
            rgba(255,255,255,0.95) 0%,
            rgba(255,255,255,0.80) 40%,
            rgba(255,255,255,0) 58%);`
        : `background: linear-gradient(to right,
            rgba(0,0,0,0.92) 0%,
            rgba(0,0,0,0.75) 40%,
            rgba(0,0,0,0) 58%);`;
      // Texto contido nos 42% esquerdos — NÃO invade a zona da foto
      contentCss = `
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        left: 24px;
        width: 42%;
        max-width: 42%;
        overflow: hidden;`;
      break;
    case 'hero-overlay':
      gradientCss = isLight
        ? `background: rgba(255,255,255,0.55);`
        : `background: rgba(0,0,0,0.55);`;
      contentCss = `
        position: absolute;
        bottom: 60px;
        left: 36px;
        right: 36px;
        text-align: center;`;
      break;
    default: // hero-bottom
      // Gradient FORTE nos 40% inferiores (zona exclusiva do texto)
      gradientCss = isLight
        ? `background: linear-gradient(to bottom,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.3) 20%,
            rgba(255,255,255,0.85) 55%,
            rgba(255,255,255,0.95) 100%);`
        : `background: linear-gradient(to bottom,
            rgba(0,0,0,0) 0%,
            rgba(0,0,0,0.35) 18%,
            rgba(0,0,0,0.85) 50%,
            rgba(0,0,0,0.96) 100%);`;
      // Texto contido nos 35% inferiores
      contentCss = `
        position: absolute;
        bottom: 28px;
        left: 36px;
        right: 36px;`;
  }

  const textShadow = isLight
    ? '0 1px 10px rgba(255,255,255,0.6)'
    : '0 2px 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.6)';

  const ctaBg = isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('${font.import}');
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 540px;
    height: 675px;
    background: transparent;
    font-family: 'Montserrat', -apple-system, 'Helvetica Neue', Arial, sans-serif;
    overflow: hidden;
    position: relative;
  }

  /* Header editorial */
  .header-editorial {
    position: absolute;
    top: 18px;
    left: 36px;
    right: 36px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-text {
    font-family: 'Montserrat', sans-serif;
    font-size: 10px;
    font-weight: 600;
    color: ${handleColor};
    letter-spacing: 0.20em;
    text-transform: uppercase;
  }
  .header-line {
    flex: 1;
    height: 1px;
    background: ${isLight ? 'rgba(30,30,30,0.12)' : 'rgba(255,255,255,0.12)'};
    margin-left: 12px;
  }

  /* Badge decorativo 3D */
  .badge {
    position: absolute;
    top: 50px;
    right: 28px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    border-radius: 20px;
    font-family: 'Montserrat', sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: ${textColor};
    background: ${isLight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.10)'};
    border: 1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)'};
    backdrop-filter: blur(8px);
    letter-spacing: 0.05em;
    transform: perspective(400px) rotateY(-5deg);
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  }
  .badge-icon { font-size: 14px; }

  /* Gradient behind headline for readability */
  .bottom-gradient {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: ${layout === 'hero-split' ? '100%' : layout === 'hero-overlay' ? '100%' : '55%'};
    ${gradientCss}
  }

  .content {
    ${contentCss}
  }

  .headline {
    font-family: '${font.family}', 'Inter', serif;
    font-size: ${headlineSize};
    font-weight: ${font.weight};
    font-style: ${font.style};
    color: ${textColor};
    line-height: ${text._lineHeightOverride || '1.02'};
    text-transform: uppercase;
    letter-spacing: ${font.letterSpacing};
    text-shadow: ${textShadow};
    text-wrap: balance;
    overflow-wrap: break-word;
    hyphens: none;
  }

  /* Highlight: cor + tamanho levemente maior (estilo Hyeser — sem background) */
  .highlight {
    color: ${preset.highlightColor};
    font-size: ${text._highlightSizeOverride || '112%'};
    line-height: 1.0;
    text-shadow: 0 0 25px ${preset.highlightColor}44, ${textShadow};
  }

  .subtitle {
    font-family: 'Montserrat', sans-serif;
    font-size: 15px;
    font-weight: 500;
    color: ${subtitleColor};
    margin-top: ${text._marginOverride || '14px'};
    letter-spacing: 0.06em;
    text-shadow: ${isLight ? 'none' : '0 1px 15px rgba(0,0,0,0.9)'};
    max-width: 85%;
  }

  /* CTA button — pill style */
  .cta {
    display: inline-block;
    margin-top: 16px;
    padding: 10px 28px;
    border: ${text._ctaBorderOverride || '2px'} solid ${preset.highlightColor};
    border-radius: 22px;
    font-family: 'Montserrat', sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: ${textColor};
    text-transform: uppercase;
    letter-spacing: 0.14em;
    background: ${ctaBg};
  }
  .cta .accent {
    color: ${preset.highlightColor};
    font-weight: 800;
  }

</style>
</head>
<body>
  <div class="header-editorial">
    <span class="header-text">${escapeHtml(headerText)}</span>
    <div class="header-line"></div>
  </div>
  ${badgeHtml}
  <div class="bottom-gradient"></div>
  <div class="content">
    <div class="headline">${headlineHtml}</div>
    ${subtitleHtml}
    <div class="cta">TOQUE NO <span class="accent">${escapeHtml(cta)}</span></div>
  </div>
</body>
</html>`;
}

async function renderTypographyLayers(text, brand, preset) {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    throw new Error('Playwright não encontrado — npm install playwright');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 540, height: 675 },
    deviceScaleFactor: 2,
  });

  try {
    // Back text (grande, semi-transparente, atrás do sujeito)
    const backPage = await context.newPage();
    const backHtml = buildBackTextHtml(text, preset);
    await backPage.setContent(backHtml, { waitUntil: 'networkidle' });
    const backTextBuf = await backPage.screenshot({ type: 'png', omitBackground: true });
    await backPage.close();

    // Front text (headline + subtitle + handle)
    const frontPage = await context.newPage();
    const frontHtml = buildFrontTextHtml(text, brand, preset);
    await frontPage.setContent(frontHtml, { waitUntil: 'networkidle' });
    const frontTextBuf = await frontPage.screenshot({ type: 'png', omitBackground: true });
    await frontPage.close();

    return { backTextBuf, frontTextBuf };
  } finally {
    await context.close();
    await browser.close();
  }
}

// Compat: manter export antigo
async function renderTypographyLayer(text, brand, preset) {
  const { frontTextBuf } = await renderTypographyLayers(text, brand, preset);
  return frontTextBuf;
}

// ============================================================
// Color grading cinematográfico — recomb 3x3 + linear (lifted blacks)
// ============================================================

async function applyColorGrade(composedBuf, preset, overrides) {
  let pipeline = sharp(composedBuf);

  // Color matrix (teal & orange, etc.)
  const colorMatrix = overrides?.colorGradeA || preset.colorMatrix;
  if (colorMatrix) {
    pipeline = pipeline.recomb(colorMatrix);
  }

  // Lifted blacks + contrast
  if (preset.cinematicLinear) {
    pipeline = pipeline.linear(preset.cinematicLinear.a, preset.cinematicLinear.b);
  }

  // Sharpen leve
  pipeline = pipeline.sharpen({ sigma: 0.8 });

  return pipeline.png().toBuffer();
}

// ============================================================
// Film grain overlay
// ============================================================

async function applyFilmGrain(canvasBuf, overrides) {
  const grainPath = path.join(EFFECTS_DIR, 'film-grain.png');
  if (!fs.existsSync(grainPath)) return canvasBuf;

  let grainBuf = fs.readFileSync(grainPath);

  // Reduzir opacidade do grain se override
  const grainOpacity = overrides?.grainOpacity;
  if (grainOpacity && grainOpacity < 1.0) {
    grainBuf = await sharp(grainBuf)
      .ensureAlpha(grainOpacity)
      .png()
      .toBuffer();
  }

  return sharp(canvasBuf)
    .composite([{ input: grainBuf, blend: 'soft-light' }])
    .png()
    .toBuffer();
}

// ============================================================
// Vignette dupla — elliptical + colorida
// ============================================================

async function createVignette(preset, overrides) {
  const vc = preset.vignetteColor || { r: 0, g: 0, b: 0 };
  const isLight = preset.isLight || false;
  // Light mode: vinheta sutil usando cor do preset; dark mode: preto forte
  const vig1Color = isLight ? `${vc.r},${vc.g},${vc.b}` : '0,0,0';
  const vigScale = overrides?.vignetteOpacity || 1.0;
  const vig1Opacity = (isLight ? 0.18 : 0.45) * vigScale;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <radialGradient id="vig1" cx="50%" cy="50%" r="70%">
      <stop offset="55%" stop-color="rgba(${vig1Color},0)"/>
      <stop offset="100%" stop-color="rgba(${vig1Color},${vig1Opacity})"/>
    </radialGradient>
    <radialGradient id="vig2" cx="50%" cy="45%" r="60%" fx="50%" fy="40%">
      <stop offset="50%" stop-color="rgba(${vc.r},${vc.g},${vc.b},0)"/>
      <stop offset="100%" stop-color="rgba(${vc.r},${vc.g},${vc.b},${(0.20 * vigScale).toFixed(2)})"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#vig1)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#vig2)"/>
</svg>`;

  return sharp(Buffer.from(svg)).resize(WIDTH, HEIGHT).png().toBuffer();
}

// ============================================================
// AI Photo generation (OpenAI gpt-image-1)
// ============================================================

async function generateAIPhoto(description, options = {}) {
  let OpenAI;
  try {
    OpenAI = require('openai');
  } catch {
    throw new Error('openai não instalado — npm install openai');
  }

  const client = new OpenAI();

  const prompt = [
    'Professional photo of a Brazilian man named Eric Santos.',
    'He is 25 years old, light brown skin, short dark hair, well-groomed beard.',
    'Athletic build. Wearing professional/stylish clothing.',
    description,
    'High quality studio lighting. Clean background for easy removal.',
    'Portrait orientation. Full body or half body shot.',
  ].join(' ');

  console.log('[F6-AI] Gerando foto com IA...');

  const response = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: options.size || '1024x1536',
    quality: options.quality || 'high',
  });

  // gpt-image-1 retorna b64_json
  const b64 = response.data[0].b64_json;
  if (!b64) throw new Error('OpenAI não retornou imagem');

  const imgBuf = Buffer.from(b64, 'base64');

  // Tenta remover background com rembg (se disponível)
  let finalBuf = imgBuf;
  try {
    const { execSync } = require('child_process');
    const tmpIn = path.join(TEMP_DIR, `ai-photo-in-${Date.now()}.png`);
    const tmpOut = path.join(TEMP_DIR, `ai-photo-out-${Date.now()}.png`);
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    fs.writeFileSync(tmpIn, imgBuf);
    execSync(`rembg i "${tmpIn}" "${tmpOut}"`, { timeout: 60000 });
    if (fs.existsSync(tmpOut)) {
      finalBuf = fs.readFileSync(tmpOut);
      fs.unlinkSync(tmpIn);
      fs.unlinkSync(tmpOut);
      console.log('[F6-AI] Background removido com rembg');
    }
  } catch (e) {
    console.log('[F6-AI] rembg não disponível, usando foto sem recorte:', e.message);
  }

  // Salva em assets/photos
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  const filename = `ai-generated-${Date.now()}.png`;
  const outputPath = path.join(PHOTOS_DIR, filename);
  fs.writeFileSync(outputPath, finalBuf);
  console.log(`[F6-AI] Foto salva: ${outputPath}`);

  return { path: outputPath, buffer: finalBuf, filename };
}

// ============================================================
// Pipeline principal — 13 steps → PNG final
// ============================================================

/**
 * @param {object} config
 * @param {string} config.presetId - ID do preset (neon-green, neon-blue, etc.)
 * @param {Buffer|string} config.photoPath - Caminho ou Buffer da foto recortada (PNG alpha)
 * @param {object} config.text - { headline, subtitle, highlights[] }
 * @param {string} [config.brandId] - ID da marca (default: eric-santos)
 * @param {string} [config.outputPath] - Caminho de saída (default: auto em .carousel-temp)
 * @param {string} [config.swipeId] - ID para organizar em subpasta
 * @returns {Promise<string>} Caminho do PNG gerado
 */
async function generatePremiumCreative(config) {
  const { presetId, text, brandId = 'eric-santos', swipeId, overrides } = config;

  const preset = PRESETS[presetId];
  if (!preset) throw new Error(`Preset desconhecido: ${presetId}`);

  const brand = loadBrandConfig(brandId);

  // Resolver foto
  let photoBuf;
  if (Buffer.isBuffer(config.photoPath)) {
    photoBuf = config.photoPath;
  } else if (config.photoPath && fs.existsSync(config.photoPath)) {
    photoBuf = fs.readFileSync(config.photoPath);
  } else {
    const defaultPhoto = path.join(PHOTOS_DIR, brand.defaultPhoto);
    if (fs.existsSync(defaultPhoto)) {
      photoBuf = fs.readFileSync(defaultPhoto);
    } else {
      throw new Error(`Foto não encontrada. Coloque um PNG recortado em: ${PHOTOS_DIR}/`);
    }
  }

  // Garantir efeitos existem
  await bootstrapEffects();

  // Output path
  const outputDir = path.join(TEMP_DIR, swipeId || `premium-${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = config.outputPath || path.join(outputDir, 'premium-01.png');

  console.log(`[F6] Gerando premium creative v3 — preset: ${preset.name} (layout: ${preset.layout || 'hero-bottom'}, photo: ${preset.photoLayout || 'center'})`);

  // Step 1: Background
  console.log('[F6] Step 1/17: Background...');
  let canvas = await renderBackground(preset);

  // Step 1.2: Background texture (noise anti-digital)
  console.log('[F6] Step 1.2/17: Background texture...');
  const textureBuf = await createBackgroundTexture(preset, overrides);
  if (textureBuf) {
    canvas = await sharp(canvas)
      .composite([{ input: textureBuf, blend: 'soft-light' }])
      .png()
      .toBuffer();
  }

  // Step 1.3: Gradiente lateral assimétrico (lado oposto à luz = mais escuro)
  if (!preset.isLight) {
    console.log('[F6] Step 1.3/17: Lateral gradient...');
    const lateralSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
      <defs>
        <linearGradient id="lateral" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
          <stop offset="40%" stop-color="rgba(0,0,0,0)"/>
          <stop offset="70%" stop-color="rgba(0,0,0,0.20)"/>
          <stop offset="85%" stop-color="rgba(0,0,0,0.40)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.60)"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#lateral)"/>
    </svg>`);
    const lateralBuf = await sharp(lateralSvg).resize(WIDTH, HEIGHT).png().toBuffer();
    canvas = await sharp(canvas)
      .composite([{ input: lateralBuf, blend: 'multiply' }])
      .png()
      .toBuffer();
  }

  // Step 1.5: Depth panels (painéis geométricos de profundidade — estilo Hyeser)
  console.log('[F6] Step 1.5/17: Depth panels...');
  const depthPanelsBuf = await createDepthPanels(preset, presetId.length * 7919);
  if (depthPanelsBuf) {
    canvas = await sharp(canvas)
      .composite([{ input: depthPanelsBuf, blend: 'over' }])
      .png()
      .toBuffer();
  }

  // Step 2: Light effects overlay (screen blend) — skip for light mode
  console.log('[F6] Step 2/17: Light effects...');
  const effectPath = path.join(EFFECTS_DIR, `${presetId}-light.png`);
  if (!preset.isLight && fs.existsSync(effectPath)) {
    const effectBuf = fs.readFileSync(effectPath);
    canvas = await sharp(canvas)
      .composite([{ input: effectBuf, blend: 'screen' }])
      .png()
      .toBuffer();
  }

  // Step 3: Bokeh particles (screen blend) — skip for light mode
  console.log('[F6] Step 3/17: Bokeh particles...');
  const bokehPath = path.join(EFFECTS_DIR, `${presetId}-bokeh.png`);
  if (!preset.isLight && fs.existsSync(bokehPath)) {
    const bokehBuf = fs.readFileSync(bokehPath);
    canvas = await sharp(canvas)
      .composite([{ input: bokehBuf, blend: 'screen' }])
      .png()
      .toBuffer();
  }

  // Step 4: Glow retangular intenso atrás do sujeito (estilo Hyeser)
  console.log('[F6] Step 4/17: Subject glow (rectangular)...');
  const glowLayer = await createGlowLayer(photoBuf, preset, overrides);
  if (glowLayer) {
    canvas = await sharp(canvas)
      .composite([{ input: glowLayer, blend: 'screen' }])
      .png()
      .toBuffer();
  }

  // Step 4.5: Special effects (glitch, shards, vertical beams)
  const presetEffects = preset.effects || [];
  if (presetEffects.length > 0 && preset.glow) {
    console.log(`[F6] Step 4.5: Special effects: ${presetEffects.join(', ')}...`);
    const fxComposites = [];

    for (const fx of presetEffects) {
      const fxFile = `${presetId}-${fx === 'vertical-beams' ? 'vbeams' : fx}.png`;
      const fxPath = path.join(EFFECTS_DIR, fxFile);
      if (fs.existsSync(fxPath)) {
        fxComposites.push({ input: fs.readFileSync(fxPath), blend: 'screen' });
      }
    }

    if (fxComposites.length > 0) {
      canvas = await sharp(canvas)
        .composite(fxComposites)
        .png()
        .toBuffer();
    }
  }

  // Step 5: Back text (grande, semi-transparente, atrás do sujeito)
  console.log('[F6] Step 5/17: Back text...');
  const { backTextBuf, frontTextBuf } = await renderTypographyLayers(text, brand, preset);
  canvas = await sharp(canvas)
    .composite([{ input: backTextBuf, blend: 'over' }])
    .png()
    .toBuffer();

  // Step 5.5: Photo color grading (desaturar + crush blacks + tint)
  console.log('[F6] Step 5.5/17: Photo color grading...');
  try {
    photoBuf = await gradePhoto(photoBuf, preset, overrides);
  } catch (e) {
    console.log('[F6] Photo grading skipped:', e.message);
  }

  // Step 6: Feathering nas bordas da foto (com layout flexível)
  console.log('[F6] Step 6/17: Feathering...');
  const photoLayout = preset.photoLayout || 'center';
  const textLayout = preset.layout || 'hero-bottom';
  const photo = await composePhotoLayer(photoBuf, photoLayout, textLayout, overrides);
  let processedPhoto = photo.buffer;
  try {
    processedPhoto = await featherEdges(photo.buffer, 6);
  } catch (e) {
    console.log('[F6] Feathering fallback (sem alpha?):', e.message);
  }

  // Step 6.5: Photo color cast (tinge foto com cor da cena)
  console.log('[F6] Step 6.5/17: Photo color cast...');
  try {
    processedPhoto = await createPhotoColorCast(processedPhoto, preset, overrides);
  } catch (e) {
    console.log('[F6] Color cast skipped:', e.message);
  }

  // Step 7: Rim light / edge glow
  console.log('[F6] Step 7/17: Rim light...');
  let rimLayer = null;
  try {
    rimLayer = await createRimLight(photo.buffer, preset);
  } catch (e) {
    console.log('[F6] Rim light skipped:', e.message);
  }

  // Step 7.8: Shadow projection (sombra nos pés da persona)
  console.log('[F6] Step 7.8/17: Shadow projection...');
  let shadowLayer = null;
  try {
    shadowLayer = await createShadowLayer(photo.buffer, preset, photo, overrides);
  } catch (e) {
    console.log('[F6] Shadow skipped:', e.message);
  }

  // Step 8: Photo composite (shadow + feathered photo + rim + light wrap)
  console.log('[F6] Step 8/17: Photo composite + light wrap...');

  // Sombra EMBAIXO da pessoa (multiply)
  const composites = [];
  if (shadowLayer) {
    composites.push({ input: shadowLayer, blend: 'multiply' });
  }
  composites.push({ input: processedPhoto, left: photo.left, top: photo.top, blend: 'over' });
  if (rimLayer) {
    composites.push({ input: rimLayer, left: photo.left, top: photo.top, blend: 'screen' });
  }

  // Ambient light wrap (luz envolvente nas bordas)
  let lightWrap = null;
  try {
    lightWrap = await createAmbientLightWrap(photo.buffer, preset, photo, overrides);
  } catch (e) {
    console.log('[F6] Light wrap skipped:', e.message);
  }
  if (lightWrap) {
    composites.push({ input: lightWrap, blend: 'screen' });
  }

  canvas = await sharp(canvas)
    .composite(composites)
    .png()
    .toBuffer();

  // Step 9: Smoke/fog na base + front bokeh (depth) — skip for light mode
  console.log('[F6] Step 9/17: Smoke/fog...');
  const smokeComposites = [];
  if (!preset.isLight) {
    const smokeBuf = await createSmokeFog(preset, overrides);
    smokeComposites.push({ input: smokeBuf, blend: 'over' });
  }

  // Bokeh na frente (partículas maiores, mais difusas = sensação de profundidade)
  if (preset.glow) {
    const { r: br, g: bg, b: bb } = preset.glow;
    const frontBokehSvg = generateBokehSvg(20, (presetId + '-front').length * 777, br, bg, bb);
    const frontBokeh = await sharp(Buffer.from(frontBokehSvg))
      .resize(WIDTH, HEIGHT)
      .blur(3)
      .png()
      .toBuffer();
    smokeComposites.push({ input: frontBokeh, blend: 'screen' });
  }

  if (smokeComposites.length > 0) {
    canvas = await sharp(canvas)
      .composite(smokeComposites)
      .png()
      .toBuffer();
  }

  // Step 10: Front headline + subtitle (Playwright)
  console.log('[F6] Step 10/17: Front typography...');
  canvas = await sharp(canvas)
    .composite([{ input: frontTextBuf, blend: 'over' }])
    .png()
    .toBuffer();

  // Step 11: Color grading cinematográfico (recomb 3x3 + linear)
  console.log('[F6] Step 11/17: Color grading...');
  canvas = await applyColorGrade(canvas, preset, overrides);

  // Step 12: Film grain (noise, soft-light)
  console.log('[F6] Step 12/17: Film grain...');
  canvas = await applyFilmGrain(canvas, overrides);

  // Step 13: Vignette dupla (elliptical + colorida)
  console.log('[F6] Step 13/17: Vignette...');
  const vignette = await createVignette(preset, overrides);
  canvas = await sharp(canvas)
    .composite([{ input: vignette, blend: 'multiply' }])
    .png()
    .toBuffer();

  // Salvar
  fs.writeFileSync(outputPath, canvas);
  console.log(`[F6] Premium creative v3 gerado: ${outputPath}`);

  return outputPath;
}

// ============================================================
// Utilitários exportados
// ============================================================

function getAvailablePresets() {
  return Object.entries(PRESETS).map(([id, p]) => ({
    id,
    name: p.name,
    emoji: p.emoji,
  }));
}

function getAvailablePhotos() {
  if (!fs.existsSync(PHOTOS_DIR)) return [];
  return fs.readdirSync(PHOTOS_DIR).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  generatePremiumCreative,
  generateAIPhoto,
  renderTypographyLayer,
  renderTypographyLayers,
  loadBrandConfig,
  bootstrapEffects,
  getAvailablePresets,
  getAvailablePhotos,
  featherEdges,
  createRimLight,
  PRESETS,
  FONT_CONFIG,
  TEMP_DIR,
  PHOTOS_DIR,
  WIDTH,
  HEIGHT,
};
