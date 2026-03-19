#!/usr/bin/env node
/**
 * Pipeline de Produção Visual - Lipo Sem Cortes (Dra. Gabrielle)
 * Step 1: Crop + Split antes/depois (Sharp)
 * Step 2: Remove background (rembg)
 * Step 3: Compose com glow layer + dark BG (Sharp)
 * Step 4: Output final para Figma
 */

const sharp = require('sharp');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PHOTO_PATH = '/Users/ericsantos/Library/CloudStorage/GoogleDrive-ericsottnas@gmail.com/Meu Drive/Syra Digital/Clientes/Dra Gabrielle/📸 Imagens/Polish_20250806_221434954.jpg';
const OUTPUT_DIR = path.join(__dirname, 'assets/criativos-gabrielle/pipeline');
const CANVAS_W = 1080;
const CANVAS_H = 1920;

// Belle Fernandes palette
const BG_COLOR = { r: 13, g: 13, b: 15 }; // #0D0D0F

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function step1_cropAndSplit() {
  console.log('\n📐 STEP 1: Crop + Split antes/depois...');

  const meta = await sharp(PHOTO_PATH).metadata();
  console.log(`  Original: ${meta.width}x${meta.height}`);

  const halfW = Math.floor(meta.width / 2);

  // Crop para focar na barriga - cortar topo (bra) e bottom (underwear)
  // Remover ~25% do topo e ~15% do bottom para focar no meio (barriga)
  const cropTop = Math.floor(meta.height * 0.22);
  const cropBottom = Math.floor(meta.height * 0.12);
  const cropH = meta.height - cropTop - cropBottom;

  console.log(`  Crop zone: top=${cropTop}px, height=${cropH}px (removendo sutiã/calcinha do foco)`);

  // Split ANTES (left half, cropped)
  await sharp(PHOTO_PATH)
    .extract({ left: 0, top: cropTop, width: halfW, height: cropH })
    .toFile(path.join(OUTPUT_DIR, '1_antes_crop.png'));
  console.log('  ✅ antes_crop.png');

  // Split DEPOIS (right half, cropped)
  await sharp(PHOTO_PATH)
    .extract({ left: halfW, top: cropTop, width: halfW, height: cropH })
    .toFile(path.join(OUTPUT_DIR, '1_depois_crop.png'));
  console.log('  ✅ depois_crop.png');

  return { cropW: halfW, cropH };
}

async function step2_removeBackground() {
  console.log('\n🎭 STEP 2: Removendo fundos com rembg...');

  const antesIn = path.join(OUTPUT_DIR, '1_antes_crop.png');
  const antesOut = path.join(OUTPUT_DIR, '2_antes_nobg.png');
  const depoisIn = path.join(OUTPUT_DIR, '1_depois_crop.png');
  const depoisOut = path.join(OUTPUT_DIR, '2_depois_nobg.png');

  console.log('  Processando ANTES...');
  execSync(`rembg i "${antesIn}" "${antesOut}"`, { stdio: 'pipe' });
  console.log('  ✅ antes_nobg.png');

  console.log('  Processando DEPOIS...');
  execSync(`rembg i "${depoisIn}" "${depoisOut}"`, { stdio: 'pipe' });
  console.log('  ✅ depois_nobg.png');
}

async function step3_composeWithGlow() {
  console.log('\n✨ STEP 3: Composição com glow + dark BG...');

  // Dimensions for each side
  const sideW = Math.floor(CANVAS_W / 2); // 540px each
  const photoH = Math.floor(CANVAS_H * 0.65); // Foto ocupa 65% do canvas (topo)

  // --- PROCESSO PARA CADA LADO ---
  for (const side of ['antes', 'depois']) {
    const noBgPath = path.join(OUTPUT_DIR, `2_${side}_nobg.png`);

    // Resize para caber no lado
    const resized = await sharp(noBgPath)
      .resize(sideW, photoH, { fit: 'cover', position: 'centre' })
      .toBuffer();

    // A. Criar glow layer (blur da imagem)
    const glow = await sharp(resized)
      .blur(40)
      .modulate({ brightness: 0.8 })
      .toBuffer();

    console.log(`  ✅ ${side} glow layer criado`);

    // B. Criar dark background para este lado
    const darkBg = await sharp({
      create: {
        width: sideW,
        height: photoH,
        channels: 4,
        background: { r: BG_COLOR.r, g: BG_COLOR.g, b: BG_COLOR.b, alpha: 255 }
      }
    }).png().toBuffer();

    // C. Compor: dark BG → glow (35% opacity) → foto principal
    // Glow com opacidade reduzida (composite multiply/overlay)
    const glowWithOpacity = await sharp(glow)
      .ensureAlpha()
      .composite([{
        input: Buffer.from([0, 0, 0, Math.floor(255 * 0.6)]), // 60% dark overlay to reduce glow
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'over'
      }])
      .toBuffer();

    const composed = await sharp(darkBg)
      .composite([
        { input: glowWithOpacity, blend: 'screen', left: 0, top: 0 },
        { input: resized, blend: 'over', left: 0, top: 0 }
      ])
      .toFile(path.join(OUTPUT_DIR, `3_${side}_composed.png`));

    console.log(`  ✅ ${side} composto com glow`);
  }

  // --- MONTAR CANVAS FINAL ---
  console.log('  Montando canvas final...');

  const antesComposed = path.join(OUTPUT_DIR, '3_antes_composed.png');
  const depoisComposed = path.join(OUTPUT_DIR, '3_depois_composed.png');
  const sideH = Math.floor(CANVAS_H * 0.65);

  // Canvas completo: dark background
  const fullCanvas = await sharp({
    create: {
      width: CANVAS_W,
      height: CANVAS_H,
      channels: 4,
      background: { r: BG_COLOR.r, g: BG_COLOR.g, b: BG_COLOR.b, alpha: 255 }
    }
  }).png().toBuffer();

  // Vinheta radial (escurecer bordas)
  // Criar via SVG
  const vignetteSvg = `<svg width="${CANVAS_W}" height="${CANVAS_H}">
    <defs>
      <radialGradient id="vig" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="black" stop-opacity="0"/>
        <stop offset="100%" stop-color="black" stop-opacity="0.6"/>
      </radialGradient>
    </defs>
    <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#vig)"/>
  </svg>`;

  // Gradient de transição (foto → escuro no bottom)
  const gradientSvg = `<svg width="${CANVAS_W}" height="${CANVAS_H}">
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgb(13,13,15)" stop-opacity="0"/>
        <stop offset="50%" stop-color="rgb(13,13,15)" stop-opacity="0"/>
        <stop offset="65%" stop-color="rgb(13,13,15)" stop-opacity="0.4"/>
        <stop offset="78%" stop-color="rgb(13,13,15)" stop-opacity="0.85"/>
        <stop offset="90%" stop-color="rgb(13,13,15)" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="rgb(13,13,15)" stop-opacity="1"/>
      </linearGradient>
    </defs>
    <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#grad)"/>
  </svg>`;

  // Divider line (SVG)
  const dividerSvg = `<svg width="${CANVAS_W}" height="${CANVAS_H}">
    <line x1="${CANVAS_W/2}" y1="0" x2="${CANVAS_W/2}" y2="${CANVAS_H}"
          stroke="white" stroke-width="1.5" stroke-opacity="0.15"/>
  </svg>`;

  // Compor tudo
  const finalImage = await sharp(fullCanvas)
    .composite([
      // Fotos lado a lado no topo
      { input: antesComposed, left: 0, top: 0, blend: 'over' },
      { input: depoisComposed, left: Math.floor(CANVAS_W / 2), top: 0, blend: 'over' },
      // Vinheta
      { input: Buffer.from(vignetteSvg), left: 0, top: 0, blend: 'over' },
      // Gradient transição
      { input: Buffer.from(gradientSvg), left: 0, top: 0, blend: 'over' },
      // Divider
      { input: Buffer.from(dividerSvg), left: 0, top: 0, blend: 'over' },
    ])
    .toFile(path.join(OUTPUT_DIR, '4_final_composed.png'));

  console.log('  ✅ Canvas final montado: 4_final_composed.png');

  return { sideW: Math.floor(CANVAS_W / 2), photoH: sideH };
}

async function main() {
  console.log('🎨 Pipeline de Produção - Lipo Sem Cortes');
  console.log('=========================================');

  await ensureDir(OUTPUT_DIR);

  const { cropW, cropH } = await step1_cropAndSplit();
  await step2_removeBackground();
  await step3_composeWithGlow();

  console.log('\n✅ PIPELINE COMPLETO!');
  console.log(`📁 Output: ${OUTPUT_DIR}/4_final_composed.png`);
  console.log('→ Próximo: importar no Figma para adicionar tipografia');
}

main().catch(err => {
  console.error('❌ Pipeline falhou:', err.message);
  process.exit(1);
});
