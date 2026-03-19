/**
 * Teste do Nano Banana — Gemini Image Generation
 * Uso: node test-nano-banana.js [photo|texture|edit|pipeline]
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { generatePhoto, generateEffectTexture, editImage } = require('./lib/nano-banana');

const TEST_MODE = process.argv[2] || 'photo';

async function testGeneratePhoto() {
  console.log('\n=== Teste: generatePhoto ===\n');

  const result = await generatePhoto('Confident pose, wearing premium black blazer, looking at camera');

  console.log('Resultado:');
  console.log(`  - Path: ${result.path}`);
  console.log(`  - Filename: ${result.filename}`);
  console.log(`  - Buffer size: ${(result.buffer.length / 1024).toFixed(0)} KB`);

  // Valida PNG header
  const pngHeader = result.buffer.slice(0, 4).toString('hex');
  const isPng = pngHeader === '89504e47';
  console.log(`  - É PNG válido: ${isPng ? 'SIM' : 'NÃO (header: ' + pngHeader + ')'}`);

  // Verifica se arquivo foi salvo
  const exists = fs.existsSync(result.path);
  console.log(`  - Arquivo existe: ${exists}`);

  if (!isPng) throw new Error('Buffer não é PNG válido');
  if (!exists) throw new Error('Arquivo não foi salvo');

  console.log('\n✅ generatePhoto OK\n');
  return result;
}

async function testGenerateTexture() {
  console.log('\n=== Teste: generateEffectTexture ===\n');

  const preset = { accentColor: 'green' };
  const buffer = await generateEffectTexture('smoke', preset);

  console.log('Resultado:');
  console.log(`  - Buffer size: ${(buffer.length / 1024).toFixed(0)} KB`);

  const isImage = buffer.length > 1000;
  console.log(`  - Tamanho válido (>1KB): ${isImage}`);

  if (!isImage) throw new Error('Buffer muito pequeno, provavelmente não é imagem');

  // Salva para inspeção visual
  const outPath = path.join(__dirname, '.carousel-temp', `test-smoke-${Date.now()}.png`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buffer);
  console.log(`  - Salvo para inspeção: ${outPath}`);

  console.log('\n✅ generateEffectTexture OK\n');
  return buffer;
}

async function testEditImage() {
  console.log('\n=== Teste: editImage ===\n');

  // Gera foto primeiro, depois edita
  const photo = await generatePhoto('Neutral pose, simple dark clothing');

  console.log('Editando imagem gerada...');
  const edited = await editImage(photo.buffer, 'Add dramatic studio lighting with blue rim light on the left side');

  console.log('Resultado:');
  console.log(`  - Buffer size original: ${(photo.buffer.length / 1024).toFixed(0)} KB`);
  console.log(`  - Buffer size editado: ${(edited.length / 1024).toFixed(0)} KB`);

  const outPath = path.join(__dirname, '.carousel-temp', `test-edited-${Date.now()}.png`);
  fs.writeFileSync(outPath, edited);
  console.log(`  - Salvo para inspeção: ${outPath}`);

  console.log('\n✅ editImage OK\n');
}

async function testPipeline() {
  console.log('\n=== Teste: Pipeline E2E (Nano Banana → F6 Premium) ===\n');

  // 1. Gera foto via Nano Banana
  console.log('1/3 Gerando foto...');
  const photo = await generatePhoto('Wearing black turtleneck, confident pose, looking slightly to the right');

  // 2. Carrega premium-designer
  console.log('2/3 Gerando criativo premium...');
  const { generatePremiumCreative, getAvailablePresets, bootstrapEffects } = require('./lib/premium-designer');

  // Bootstrap effects (necessário na 1ª execução)
  await bootstrapEffects();

  const outputPath = await generatePremiumCreative({
    presetId: 'neon-green',
    photoPath: photo.buffer,
    text: {
      headline: 'COMO ESCALAR',
      subtitle: 'sem queimar sua margem',
      highlights: ['3 estratégias comprovadas', 'Resultados em 30 dias'],
    },
  });

  // 3. Valida output
  console.log('3/3 Validando...');
  const exists = fs.existsSync(outputPath);
  const stats = exists ? fs.statSync(outputPath) : null;

  console.log(`  - Output: ${outputPath}`);
  console.log(`  - Existe: ${exists}`);
  console.log(`  - Tamanho: ${stats ? (stats.size / 1024).toFixed(0) + ' KB' : 'N/A'}`);

  if (!exists) throw new Error('Criativo final não foi gerado');

  console.log('\n✅ Pipeline E2E OK\n');
}

// ─── Runner ─────────────────────────────────────────────────

const TESTS = {
  photo: testGeneratePhoto,
  texture: testGenerateTexture,
  edit: testEditImage,
  pipeline: testPipeline,
  all: async () => {
    await testGeneratePhoto();
    await testGenerateTexture();
    await testPipeline();
  },
};

(async () => {
  const testFn = TESTS[TEST_MODE];
  if (!testFn) {
    console.error(`Modo desconhecido: ${TEST_MODE}`);
    console.error(`Uso: node test-nano-banana.js [${Object.keys(TESTS).join('|')}]`);
    process.exit(1);
  }

  console.log(`\n🍌 Nano Banana Test — modo: ${TEST_MODE}\n`);

  try {
    await testFn();
    console.log('🎉 Todos os testes passaram!\n');
  } catch (err) {
    console.error(`\n❌ FALHOU: ${err.message}\n`);
    console.error(err.stack);
    process.exit(1);
  }
})();
