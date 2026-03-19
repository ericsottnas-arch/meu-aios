// test-premium-designer.js
// Teste standalone do pipeline F6 Premium Creative v2 (13 steps)
// Uso: node test-premium-designer.js [preset]
// Gera 1 criativo de teste e verifica dimensões 1080x1350

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const {
  generatePremiumCreative,
  bootstrapEffects,
  getAvailablePresets,
  getAvailablePhotos,
  featherEdges,
  createRimLight,
  PHOTOS_DIR,
  PRESETS,
} = require('./lib/premium-designer');

async function main() {
  const presetId = process.argv[2] || 'neon-green';

  console.log('=== F6 Premium Creative v2 — Teste Standalone (13 steps) ===\n');
  console.log(`Preset: ${presetId}`);

  // Verifica fotos disponíveis
  const photos = getAvailablePhotos();
  if (photos.length === 0) {
    console.log(`\n⚠️  Nenhuma foto encontrada em: ${PHOTOS_DIR}/`);
    console.log('   Criando foto placeholder para teste...\n');

    const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
      <rect width="600" height="900" fill="transparent"/>
      <circle cx="300" cy="300" r="120" fill="#333"/>
      <rect x="180" y="450" width="240" height="350" rx="20" fill="#333"/>
      <circle cx="300" cy="300" r="80" fill="#555"/>
      <text x="300" y="800" text-anchor="middle" fill="#666" font-size="24" font-family="Arial">PLACEHOLDER</text>
    </svg>`;

    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
    const placeholderPath = path.join(PHOTOS_DIR, 'eric-santos-01.png');
    await sharp(Buffer.from(placeholderSvg)).resize(600, 900).png().toFile(placeholderPath);
    console.log(`   Placeholder salvo: ${placeholderPath}\n`);
  } else {
    console.log(`Fotos disponíveis: ${photos.join(', ')}`);
  }

  // Bootstrap dos efeitos (inclui bokeh + film grain)
  console.log('\nBootstrapping efeitos (light + bokeh + grain)...');
  await bootstrapEffects();

  // Verifica efeitos gerados
  const effectsDir = path.resolve(__dirname, 'assets/effects');
  const effectFiles = fs.readdirSync(effectsDir);
  console.log(`Efeitos gerados: ${effectFiles.join(', ')}`);

  // Teste unit: featherEdges
  console.log('\n--- Teste unit: featherEdges ---');
  try {
    const testBuf = await sharp({
      create: { width: 100, height: 100, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 255 } },
    }).png().toBuffer();
    const feathered = await featherEdges(testBuf, 4);
    const fMeta = await sharp(feathered).metadata();
    console.log(`  featherEdges: ${fMeta.width}x${fMeta.height} ✅`);
  } catch (e) {
    console.log(`  featherEdges: ${e.message} ⚠️ (non-blocking)`);
  }

  // Teste unit: createRimLight
  console.log('\n--- Teste unit: createRimLight ---');
  try {
    const testBuf = await sharp({
      create: { width: 100, height: 100, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } },
    }).png().toBuffer();
    const rim = await createRimLight(testBuf, PRESETS['neon-green']);
    if (rim) {
      const rMeta = await sharp(rim).metadata();
      console.log(`  createRimLight: ${rMeta.width}x${rMeta.height} ✅`);
    } else {
      console.log('  createRimLight: null (preset sem glow)');
    }
  } catch (e) {
    console.log(`  createRimLight: ${e.message} ⚠️ (non-blocking)`);
  }

  // Gera criativo completo (13 steps)
  const testText = {
    headline: 'NINGUÉM VAI TE SALVAR',
    subtitle: 'Ou você constrói, ou assiste quem construiu.',
    highlights: ['NINGUÉM', 'SALVAR'],
  };

  console.log(`\nGerando criativo v2 com: "${testText.headline}"...\n`);

  const startTime = Date.now();
  const outputPath = await generatePremiumCreative({
    presetId,
    text: testText,
    swipeId: `test-v2-${Date.now()}`,
  });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Verifica dimensões
  const meta = await sharp(outputPath).metadata();
  console.log(`\n✅ Criativo v2 gerado: ${outputPath}`);
  console.log(`   Dimensões: ${meta.width}x${meta.height}`);
  console.log(`   Formato: ${meta.format}`);
  console.log(`   Tamanho: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
  console.log(`   Tempo: ${elapsed}s`);

  if (meta.width === 1080 && meta.height === 1350) {
    console.log('\n✅ Dimensões corretas (1080x1350)');
  } else {
    console.log(`\n❌ Dimensões incorretas! Esperado 1080x1350, obtido ${meta.width}x${meta.height}`);
    process.exit(1);
  }

  // Verifica que o arquivo tem tamanho razoável (> 100KB = tem conteúdo visual)
  const fileSize = fs.statSync(outputPath).size;
  if (fileSize > 100 * 1024) {
    console.log(`✅ Tamanho adequado (${(fileSize / 1024).toFixed(0)} KB > 100 KB)`);
  } else {
    console.log(`⚠️  Tamanho pequeno (${(fileSize / 1024).toFixed(0)} KB) — pode estar sem efeitos`);
  }

  // Lista todos os presets disponíveis
  console.log('\n--- Presets disponíveis ---');
  for (const p of getAvailablePresets()) {
    console.log(`  ${p.emoji} ${p.id} — ${p.name}`);
  }

  console.log('\n=== Teste completo ===');
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  console.error(err.stack);
  process.exit(1);
});
