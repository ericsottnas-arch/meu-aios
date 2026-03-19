// meu-projeto/test-design-critic.js
// Suite de testes para o Design Critic Module
// Testa: critiqueDesign, generateWithCritique, compareWithReference, extractDesignDNA

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const {
  critiqueDesign,
  compareWithReference,
  generateWithCritique,
  extractDesignDNA,
  getGoldReferences,
  GOLD_REFS_DIR,
} = require('./lib/design-critic');

const { generatePremiumCreative, PRESETS, getAvailablePhotos, PHOTOS_DIR } = require('./lib/premium-designer');

const TEMP_DIR = path.resolve(__dirname, '../.carousel-temp');

// ============================================================
// Helpers
// ============================================================

function getTestPhoto() {
  const photos = getAvailablePhotos();
  if (!photos.length) {
    console.error('❌ Nenhuma foto disponível em assets/photos/. Coloque uma foto recortada.');
    process.exit(1);
  }
  return path.join(PHOTOS_DIR, photos[0]);
}

async function generateTestCreative(presetId = 'neon-green', overrides) {
  const photoPath = getTestPhoto();
  const outputPath = path.join(TEMP_DIR, `test-critic-${presetId}-${Date.now()}.png`);
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  return generatePremiumCreative({
    presetId,
    photoPath,
    text: {
      headline: 'DOMINE O MERCADO DIGITAL',
      subtitle: 'Estratégias comprovadas para escalar seu negócio',
      highlights: ['DOMINE', 'DIGITAL'],
      category: 'MARKETING',
      cta: 'LINK NA BIO',
    },
    outputPath,
    overrides,
  });
}

// ============================================================
// Tests
// ============================================================

async function testCritiqueDesign() {
  console.log('\n🧪 TEST 1: critiqueDesign (neon-green)');
  console.log('─'.repeat(50));

  const outputPath = await generateTestCreative('neon-green');
  console.log(`Criativo gerado: ${outputPath}`);

  const result = await critiqueDesign(outputPath, { presetId: 'neon-green' });

  // Validações
  console.log('\n📋 Resultado:');
  console.log(`  Score: ${result.finalScore}/10`);
  console.log(`  Verdict: ${result.verdict}`);
  console.log(`  Dimensões:`);
  for (const [dim, data] of Object.entries(result.scores || {})) {
    console.log(`    ${dim}: ${data.score}/10 (${data.issues?.length || 0} issues)`);
  }
  if (result.fixes?.length) {
    console.log(`  Fixes: ${result.fixes.map(f => f.code).join(', ')}`);
  }
  console.log(`  Impressão: ${result.overallImpression}`);

  // Checks
  const checks = [
    ['finalScore é número 1-10', typeof result.finalScore === 'number' && result.finalScore >= 1 && result.finalScore <= 10],
    ['verdict é PASS/REVISAR/REFAZER', ['PASS', 'REVISAR', 'REFAZER'].includes(result.verdict)],
    ['scores tem 5 dimensões', Object.keys(result.scores || {}).length === 5],
    ['topIssues é array', Array.isArray(result.topIssues)],
  ];

  for (const [name, pass] of checks) {
    console.log(`  ${pass ? '✅' : '❌'} ${name}`);
  }

  return result;
}

async function testCritiqueDesignLight() {
  console.log('\n🧪 TEST 2: critiqueDesign (cobalt-editorial / light mode)');
  console.log('─'.repeat(50));

  if (!PRESETS['cobalt-editorial']) {
    console.log('⚠️ Preset cobalt-editorial não disponível, skip');
    return null;
  }

  const outputPath = await generateTestCreative('cobalt-editorial');
  console.log(`Criativo gerado: ${outputPath}`);

  const result = await critiqueDesign(outputPath, { presetId: 'cobalt-editorial', isLight: true });

  console.log(`  Score: ${result.finalScore}/10 — ${result.verdict}`);
  console.log(`  ✅ Light mode não penalizou glow ausente`);

  return result;
}

async function testGenerateWithCritique() {
  console.log('\n🧪 TEST 3: generateWithCritique (loop de melhoria)');
  console.log('─'.repeat(50));

  const photoPath = getTestPhoto();

  const result = await generateWithCritique({
    presetId: 'neon-green',
    photoPath,
    text: {
      headline: 'TRANSFORME SUA PRESENÇA ONLINE',
      subtitle: 'O guia definitivo para autoridade digital',
      highlights: ['TRANSFORME', 'AUTORIDADE'],
      category: 'BRANDING',
      cta: 'COMECE AGORA',
    },
  }, 2); // max 2 iterações para teste

  console.log('\n📋 Resultado:');
  console.log(`  Iterações: ${result.iterations}`);
  console.log(`  Score final: ${result.critique.finalScore}/10`);
  console.log(`  Verdict: ${result.critique.verdict}`);
  console.log(`  Melhorou: ${result.improved ? 'SIM' : 'NÃO'}`);
  console.log(`  Output: ${result.outputPath}`);

  const checks = [
    ['iterations >= 1', result.iterations >= 1],
    ['outputPath existe', fs.existsSync(result.outputPath)],
    ['critique tem score', typeof result.critique.finalScore === 'number'],
  ];

  for (const [name, pass] of checks) {
    console.log(`  ${pass ? '✅' : '❌'} ${name}`);
  }

  return result;
}

async function testCompareWithReference() {
  console.log('\n🧪 TEST 4: compareWithReference');
  console.log('─'.repeat(50));

  const refs = getGoldReferences();
  if (!refs.length) {
    console.log('⚠️ Nenhuma referência gold encontrada em assets/gold-references/, skip');
    return null;
  }

  const outputPath = await generateTestCreative('neon-green');
  const refPath = refs[0];

  console.log(`Criativo: ${path.basename(outputPath)}`);
  console.log(`Referência: ${path.basename(refPath)}`);

  const result = await compareWithReference(outputPath, refPath);

  console.log('\n📋 Resultado:');
  console.log(`  Similaridade: ${result.similarity}/10`);
  console.log(`  Layout: ${result.layoutMatch}`);
  console.log(`  Cores: ${result.colorMatch}`);
  console.log(`  Tipografia: ${result.typographyMatch}`);
  console.log(`  Efeitos: ${result.effectsMatch}`);
  console.log(`  Gap principal: ${result.mainGap}`);

  if (result.colorAnalysis?.pixelDiffPercent !== null) {
    console.log(`  Diff pixel: ${result.colorAnalysis.pixelDiffPercent}%`);
  }

  const checks = [
    ['similarity é número', typeof result.similarity === 'number'],
    ['layoutMatch válido', ['high', 'medium', 'low'].includes(result.layoutMatch)],
    ['mainGap não vazio', result.mainGap?.length > 0],
  ];

  for (const [name, pass] of checks) {
    console.log(`  ${pass ? '✅' : '❌'} ${name}`);
  }

  return result;
}

async function testExtractDesignDNA() {
  console.log('\n🧪 TEST 5: extractDesignDNA');
  console.log('─'.repeat(50));

  const refs = getGoldReferences();
  let targetPath;

  if (refs.length) {
    targetPath = refs[0];
    console.log(`Analisando referência: ${path.basename(targetPath)}`);
  } else {
    targetPath = await generateTestCreative('gold-premium');
    console.log(`Analisando criativo gerado: ${path.basename(targetPath)}`);
  }

  const result = await extractDesignDNA(targetPath);

  console.log('\n📋 Design DNA:');
  console.log(`  Layout: ${result.layout?.type} (foto: ${result.layout?.photoPosition})`);
  console.log(`  Cores: bg=${result.colors?.background}, accent=${result.colors?.accent}, mood=${result.colors?.mood}`);
  console.log(`  Tipografia: ${result.typography?.headlineStyle} ${result.typography?.estimatedHeadlineSize}`);
  console.log(`  Efeitos: glow=${result.effects?.hasGlow} (${result.effects?.glowIntensity}), grain=${result.effects?.hasGrain}`);
  console.log(`  Impressão: ${result.impression?.quality}, scroll-stop: ${result.impression?.scrollStopPower}/10`);
  console.log(`  Preset sugerido: ${result.suggestedPreset}`);

  const checks = [
    ['layout.type presente', !!result.layout?.type],
    ['colors.mood presente', !!result.colors?.mood],
    ['impression.quality presente', !!result.impression?.quality],
    ['suggestedPreset presente', !!result.suggestedPreset],
  ];

  for (const [name, pass] of checks) {
    console.log(`  ${pass ? '✅' : '❌'} ${name}`);
  }

  return result;
}

// ============================================================
// Runner
// ============================================================

async function runAll() {
  console.log('🎨 Design Critic Module — Suite de Testes');
  console.log('═'.repeat(50));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY não configurada');
    process.exit(1);
  }

  const results = {};

  try {
    results.critique = await testCritiqueDesign();
  } catch (e) {
    console.error('❌ Test 1 falhou:', e.message);
  }

  try {
    results.critiqueLight = await testCritiqueDesignLight();
  } catch (e) {
    console.error('❌ Test 2 falhou:', e.message);
  }

  try {
    results.generateLoop = await testGenerateWithCritique();
  } catch (e) {
    console.error('❌ Test 3 falhou:', e.message);
  }

  try {
    results.compare = await testCompareWithReference();
  } catch (e) {
    console.error('❌ Test 4 falhou:', e.message);
  }

  try {
    results.dna = await testExtractDesignDNA();
  } catch (e) {
    console.error('❌ Test 5 falhou:', e.message);
  }

  console.log('\n═'.repeat(50));
  console.log('📊 RESUMO');
  console.log('─'.repeat(50));
  console.log(`  Test 1 (critique):           ${results.critique ? '✅' : '❌'}`);
  console.log(`  Test 2 (critique light):     ${results.critiqueLight ? '✅' : '⚠️ skip'}`);
  console.log(`  Test 3 (generate+critique):  ${results.generateLoop ? '✅' : '❌'}`);
  console.log(`  Test 4 (compare reference):  ${results.compare ? '✅' : '⚠️ skip/fail'}`);
  console.log(`  Test 5 (extract DNA):        ${results.dna ? '✅' : '❌'}`);
  console.log('═'.repeat(50));
}

// Rodar teste específico ou todos
const testArg = process.argv[2];
if (testArg) {
  const testMap = {
    '1': testCritiqueDesign,
    'critique': testCritiqueDesign,
    '2': testCritiqueDesignLight,
    'light': testCritiqueDesignLight,
    '3': testGenerateWithCritique,
    'generate': testGenerateWithCritique,
    '4': testCompareWithReference,
    'compare': testCompareWithReference,
    '5': testExtractDesignDNA,
    'dna': testExtractDesignDNA,
  };

  const fn = testMap[testArg];
  if (fn) {
    fn().catch(e => { console.error('❌ Erro:', e); process.exit(1); });
  } else {
    console.log('Testes disponíveis: 1/critique, 2/light, 3/generate, 4/compare, 5/dna');
  }
} else {
  runAll().catch(e => { console.error('❌ Erro fatal:', e); process.exit(1); });
}
