// meu-projeto/lib/design-critic.js
// Design Critic Module — Olho Crítico para Criativos Premium
// Autocrítica via Claude Vision + comparação com referências + loop de melhoria
// Custo por execução: ~$0.15-0.20 (3 calls Claude Sonnet com imagem)

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { getRulesForPrompt, getOverrides: getFeedbackOverrides } = require('./design-feedback-rules');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.replace(/"/g, '');
const CLAUDE_VISION_MODEL = 'claude-sonnet-4-6';

const GOLD_REFS_DIR = path.resolve(__dirname, '../assets/gold-references');

// ============================================================
// Override mapping — fixes do critic → parâmetros reais do pipeline
// ============================================================

const OVERRIDE_MAP = {
  'glow_too_strong':     { key: 'glowOpacity', value: 0.40 },
  'glow_too_weak':       { key: 'glowOpacity', value: 0.80 },
  'headline_too_small':  { key: '_headlineSizeOverride', value: '64px' },
  'headline_too_big':    { key: '_headlineSizeOverride', value: '42px' },
  'line_height_tight':   { key: '_lineHeightOverride', value: '1.15' },
  'line_height_loose':   { key: '_lineHeightOverride', value: '0.92' },
  'highlight_too_big':   { key: '_highlightSizeOverride', value: '110%' },
  'photo_too_big':       { key: 'photoScale', value: 0.75 },
  'photo_too_small':     { key: 'photoScale', value: 0.90 },
  'vignette_aggressive': { key: 'vignetteOpacity', value: 0.25 },
  'smoke_too_heavy':     { key: 'smokeOpacity', value: 0.35 },
  'grain_too_visible':   { key: 'grainOpacity', value: 0.3 },
};

// ============================================================
// Checklist de crítica — 5 dimensões com pesos
// ============================================================

const CRITIQUE_DIMENSIONS = {
  typography: {
    weight: 2.5,
    criteria: [
      'Leading/line-height entre 0.95-1.15 (nem apertado nem solto)',
      'Headline pelo menos 1.5x maior que subtitle',
      'Highlights (palavras em cor) aplicados nas palavras-argumento certas',
      'Texto não toca/encosta nas bordas do canvas',
      'Hierarquia tipográfica clara: headline > subtitle > CTA',
      'Fonte consistente com a estética do preset',
      'CTA legível e com contraste suficiente',
      'Header editorial visível mas discreto',
    ],
  },
  composition: {
    weight: 2.0,
    criteria: [
      'Espaço negativo (breathing room) >= 30% do canvas',
      'Hierarquia visual clara: foto → headline → subtitle → CTA',
      'Nenhum elemento "flutuando" sem contexto',
      'Foto e texto em zonas separadas (sem competir)',
      'Alinhamento consistente entre elementos',
      'Peso visual balanceado (não pende para um lado)',
      'Depth panels/profundidade contribuem sem distrair',
    ],
  },
  effects: {
    weight: 1.5,
    criteria: [
      'Glow sutil — quase imperceptível no primeiro olhar',
      'Film grain discreto (visível só em zoom)',
      'Vinheta não agressiva (cantos não pretos demais)',
      'Rim light consistente com a direção da luz principal',
      'Bokeh/partículas complementam sem distrair',
      'Smoke/fog na base natural e gradual',
      'Efeitos adaptados ao modo (dark vs light)',
    ],
  },
  colors: {
    weight: 2.0,
    criteria: [
      'No máximo 1 accent color dominante',
      'Sem uso de #FFF ou #000 puros (usar quase-brancos/pretos)',
      'Accent color aplicada em 1-3 keywords, não em tudo',
      'Color grading cinematográfico consistente',
      'Contraste suficiente para legibilidade (WCAG AA+)',
      'Paleta coerente com o preset escolhido',
    ],
  },
  impression: {
    weight: 2.0,
    criteria: [
      'Parece Behance profissional ou Canva amador?',
      'Pararia de scrollar se visse no feed?',
      'Transmite autoridade e posicionamento premium?',
      'Está no nível de design de perfis como @codigo010k ou @hyeser?',
      'A impressão geral é de sofisticação ou de "tentando demais"?',
    ],
  },
};

// ============================================================
// Helpers
// ============================================================

async function imageToBase64(imagePath) {
  let buffer = fs.readFileSync(imagePath);
  let mediaType = /\.jpe?g$/i.test(imagePath) ? 'image/jpeg' : 'image/png';

  // Claude Vision max 5MB — redimensionar se necessário
  if (buffer.byteLength > 4_500_000) {
    buffer = await sharp(buffer)
      .resize({ width: 1080, height: 1350, fit: 'inside' })
      .jpeg({ quality: 85 })
      .toBuffer();
    mediaType = 'image/jpeg';
  }

  return {
    base64: buffer.toString('base64'),
    mediaType,
  };
}

async function callClaudeVision(prompt, images, maxTokens = 2000) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não configurado');

  const messageContent = [{ type: 'text', text: prompt }];

  for (const img of images) {
    messageContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mediaType,
        data: img.base64,
      },
    });
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_VISION_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: messageContent }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude Vision API ${response.status}: ${err.substring(0, 300)}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

function parseJsonFromText(text) {
  // Limpar caracteres problemáticos
  let cleaned = text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-');

  // Encontrar o primeiro JSON completo com chaves balanceadas
  const start = cleaned.indexOf('{');
  if (start === -1) throw new Error('Claude não retornou JSON válido');

  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) throw new Error('JSON incompleto — chaves não fechadas');

  let jsonStr = cleaned.substring(start, end + 1)
    .replace(/,\s*([\]}])/g, '$1')  // trailing commas
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ');

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`Falha ao parsear JSON: ${e.message}\nTexto: ${jsonStr.substring(0, 500)}`);
  }
}

// ============================================================
// 1. critiqueDesign — autocrítica visual completa
// ============================================================

async function critiqueDesign(imagePath, options = {}) {
  console.log('[CRITIC] Analisando criativo...');

  const img = await imageToBase64(imagePath);
  const presetId = options.presetId || 'unknown';
  const isLight = options.isLight || false;

  const dimensionsList = Object.entries(CRITIQUE_DIMENSIONS)
    .map(([dim, { weight, criteria }]) => {
      return `### ${dim.toUpperCase()} (peso ${weight})\n${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
    })
    .join('\n\n');

  // Carregar regras persistentes de feedback do Eric
  const feedbackRules = getRulesForPrompt();
  console.log(`[CRITIC] Regras de feedback carregadas: ${feedbackRules ? 'sim' : 'nenhuma'}`);

  const prompt = `Analise este criativo como DIRETOR DE ARTE senior. Preset: ${presetId} | Modo: ${isLight ? 'LIGHT' : 'DARK'}

Avalie 5 dimensões (score 1-10): typography (peso 2.5), composition (peso 2.0), effects (peso 1.5), colors (peso 2.0), impression (peso 2.0).

PASS>=8.0 | REVISAR 6.0-7.9 | REFAZER<6.0. Seja rigoroso.
${feedbackRules}
IMPORTANTE: Cada issue e strength deve ter MAX 15 palavras. Sem aspas simples dentro das strings. MAX 3 issues e 2 strengths por dimensão.

Fix codes validos: ${Object.keys(OVERRIDE_MAP).join(', ')}

Retorne APENAS este JSON (sem markdown):
{"scores":{"typography":{"score":7.5,"issues":["issue curta"],"strengths":["ponto forte"]},"composition":{"score":8.0,"issues":[],"strengths":["ponto forte"]},"effects":{"score":7.0,"issues":["issue curta"],"strengths":[]},"colors":{"score":8.5,"issues":[],"strengths":["ponto forte"]},"impression":{"score":7.5,"issues":["issue curta"],"strengths":["ponto forte"]}},"finalScore":7.7,"verdict":"REVISAR","topIssues":["fix urgente","segundo fix"],"fixes":[{"code":"glow_too_strong","reason":"Motivo curto"}],"overallImpression":"Resumo em 1 frase curta"}`;

  // Retry até 2x se parse falhar
  let result;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const text = await callClaudeVision(prompt, [img], 2000);
    try {
      result = parseJsonFromText(text);
      break;
    } catch (e) {
      if (attempt === 2) throw e;
      console.log(`[CRITIC] Parse falhou (tentativa ${attempt}), retrying...`);
    }
  }

  // Calcular score ponderado se não veio correto
  if (!result.finalScore && result.scores) {
    let totalWeight = 0;
    let weightedSum = 0;
    for (const [dim, { weight }] of Object.entries(CRITIQUE_DIMENSIONS)) {
      if (result.scores[dim]) {
        weightedSum += result.scores[dim].score * weight;
        totalWeight += weight;
      }
    }
    result.finalScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
  }

  // Determinar verdict
  if (result.finalScore >= 8.0) result.verdict = 'PASS';
  else if (result.finalScore >= 6.0) result.verdict = 'REVISAR';
  else result.verdict = 'REFAZER';

  console.log(`[CRITIC] Score: ${result.finalScore}/10 — ${result.verdict}`);
  if (result.fixes?.length) {
    console.log(`[CRITIC] Fixes sugeridos: ${result.fixes.map(f => f.code).join(', ')}`);
  }

  return result;
}

// ============================================================
// 2. compareWithReference — criativo vs gold-standard
// ============================================================

async function compareWithReference(imagePath, referencePath) {
  console.log('[CRITIC] Comparando com referência...');

  const img = await imageToBase64(imagePath);
  const ref = await imageToBase64(referencePath);

  // Análise de paleta de cores via Sharp
  const [imgStats, refStats] = await Promise.all([
    sharp(fs.readFileSync(imagePath)).stats(),
    sharp(fs.readFileSync(referencePath)).stats(),
  ]);

  const colorDiff = {
    rDiff: Math.abs(imgStats.channels[0].mean - refStats.channels[0].mean),
    gDiff: Math.abs(imgStats.channels[1].mean - refStats.channels[1].mean),
    bDiff: Math.abs(imgStats.channels[2].mean - refStats.channels[2].mean),
  };

  // Pixel diff via pixelmatch (se disponível)
  let pixelDiffPercent = null;
  try {
    const pixelmatchModule = require('pixelmatch');
    const pixelmatch = pixelmatchModule.default || pixelmatchModule;
    const { PNG } = require('pngjs');

    const img1 = PNG.sync.read(fs.readFileSync(imagePath));
    const img2Raw = fs.readFileSync(referencePath);
    // Redimensionar referência para o mesmo tamanho
    const resized = await sharp(img2Raw)
      .resize(img1.width, img1.height, { fit: 'fill' })
      .png()
      .toBuffer();
    const img2 = PNG.sync.read(resized);

    const diff = new PNG({ width: img1.width, height: img1.height });
    const numDiffPixels = pixelmatch(
      img1.data, img2.data, diff.data,
      img1.width, img1.height,
      { threshold: 0.3 }
    );
    pixelDiffPercent = Math.round((numDiffPixels / (img1.width * img1.height)) * 100 * 10) / 10;
  } catch (e) {
    console.log('[CRITIC] pixelmatch não disponível, skip pixel diff:', e.message);
  }

  // Análise estrutural via Vision
  const prompt = `Você é um diretor de arte. Compare estas duas imagens:
- IMAGEM 1: Criativo gerado automaticamente
- IMAGEM 2: Referência profissional (gold standard)

Analise:
1. LAYOUT: A estrutura/composição é similar? Hierarquia visual parecida?
2. CORES: A paleta é coerente com a referência? Mood similar?
3. TIPOGRAFIA: O tratamento do texto tem qualidade comparable?
4. EFEITOS: Glow, grain, vinheta — nível de sofisticação similar?
5. GAP PRINCIPAL: Qual é a MAIOR diferença entre o criativo e a referência?

Dados técnicos da análise de cor:
- Diferença R: ${colorDiff.rDiff.toFixed(1)}, G: ${colorDiff.gDiff.toFixed(1)}, B: ${colorDiff.bDiff.toFixed(1)}
${pixelDiffPercent !== null ? `- Diferença pixel a pixel: ${pixelDiffPercent}%` : ''}

Retorne JSON puro:
{
  "similarity": 7.5,
  "layoutMatch": "high|medium|low",
  "colorMatch": "high|medium|low",
  "typographyMatch": "high|medium|low",
  "effectsMatch": "high|medium|low",
  "mainGap": "Descrição da maior diferença em 1 frase",
  "suggestions": ["sugestão 1 para se aproximar da referência", "sugestão 2"],
  "colorAnalysis": {
    "rDiff": ${colorDiff.rDiff.toFixed(1)},
    "gDiff": ${colorDiff.gDiff.toFixed(1)},
    "bDiff": ${colorDiff.bDiff.toFixed(1)},
    "pixelDiffPercent": ${pixelDiffPercent ?? 'null'}
  }
}`;

  const text = await callClaudeVision(prompt, [img, ref], 1200);
  const result = parseJsonFromText(text);

  console.log(`[CRITIC] Similaridade com referência: ${result.similarity}/10`);
  console.log(`[CRITIC] Gap principal: ${result.mainGap}`);

  return result;
}

// ============================================================
// 3. generateWithCritique — gera → critica → melhora (loop)
// ============================================================

async function generateWithCritique(config, maxIterations = 3) {
  const { generatePremiumCreative } = require('./premium-designer');

  console.log(`[CRITIC] Iniciando geração com autocrítica (max ${maxIterations} iterações)...`);

  // Aplicar overrides persistentes de feedback ANTES da primeira geração
  const persistentOverrides = getFeedbackOverrides();
  if (Object.keys(persistentOverrides).length > 0) {
    console.log(`[CRITIC] Aplicando ${Object.keys(persistentOverrides).length} overrides de feedback persistente`);
  }

  let currentConfig = {
    ...config,
    overrides: { ...persistentOverrides, ...(config.overrides || {}) },
  };
  let bestResult = null;
  let bestScore = 0;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`\n[CRITIC] === Iteração ${iteration}/${maxIterations} ===`);

    // Gerar criativo
    const outputPath = await generatePremiumCreative({
      ...currentConfig,
      outputPath: currentConfig.outputPath
        ? currentConfig.outputPath.replace('.png', `-iter${iteration}.png`)
        : undefined,
    });

    // Criticar
    const critique = await critiqueDesign(outputPath, {
      presetId: currentConfig.presetId,
      isLight: currentConfig.isLight,
    });

    // Guardar melhor resultado
    if (critique.finalScore > bestScore) {
      bestScore = critique.finalScore;
      bestResult = { outputPath, critique, iteration };
    }

    // PASS — entregar
    if (critique.verdict === 'PASS') {
      console.log(`[CRITIC] PASS na iteração ${iteration}! Score: ${critique.finalScore}`);
      return {
        outputPath,
        critique,
        iterations: iteration,
        improved: iteration > 1,
        allResults: bestResult,
      };
    }

    // Última iteração — entregar o melhor que temos
    if (iteration >= maxIterations) {
      console.log(`[CRITIC] Max iterações atingido. Melhor score: ${bestScore} (iter ${bestResult.iteration})`);
      return {
        outputPath: bestResult.outputPath,
        critique: bestResult.critique,
        iterations: iteration,
        improved: bestScore > (bestResult.iteration === 1 ? 0 : bestScore),
        allResults: bestResult,
      };
    }

    // Mapear fixes para overrides
    const overrides = currentConfig.overrides || {};
    const textOverrides = { ...(currentConfig.text || {}) };

    if (critique.fixes?.length) {
      for (const fix of critique.fixes) {
        const mapping = OVERRIDE_MAP[fix.code];
        if (!mapping) continue;

        if (mapping.key.startsWith('_')) {
          // Override de texto (tipografia)
          textOverrides[mapping.key] = mapping.value;
        } else {
          overrides[mapping.key] = mapping.value;
        }
        console.log(`[CRITIC] Fix aplicado: ${fix.code} → ${mapping.key}=${mapping.value}`);
      }
    }

    currentConfig = {
      ...currentConfig,
      overrides,
      text: { ...currentConfig.text, ...textOverrides },
    };
  }

  return bestResult;
}

// ============================================================
// 4. extractDesignDNA — extrai parâmetros de qualquer imagem
// ============================================================

async function extractDesignDNA(imagePath) {
  console.log('[CRITIC] Extraindo Design DNA...');

  const img = await imageToBase64(imagePath);

  // Análise de cores via Sharp
  const stats = await sharp(fs.readFileSync(imagePath)).stats();
  const meta = await sharp(fs.readFileSync(imagePath)).metadata();

  const prompt = `Você é um designer e engenheiro visual. Analise esta imagem e extraia todos os parâmetros de design que a definem.

Dados técnicos:
- Resolução: ${meta.width}x${meta.height}
- Canal R média: ${stats.channels[0].mean.toFixed(1)}, G: ${stats.channels[1].mean.toFixed(1)}, B: ${stats.channels[2].mean.toFixed(1)}
- Dominante estimado: ${stats.dominant ? `rgb(${stats.dominant.r},${stats.dominant.g},${stats.dominant.b})` : 'N/A'}

Extraia e retorne JSON puro:
{
  "layout": {
    "type": "hero-bottom|hero-split|hero-overlay|centered|fullbleed",
    "photoPosition": "center|left|right|full",
    "textPosition": "bottom|top|left|right|center",
    "negativeSpacePercent": 30
  },
  "colors": {
    "background": "#hex",
    "accent": "#hex",
    "textPrimary": "#hex",
    "textSecondary": "#hex",
    "mood": "dark-premium|light-clean|neon-tech|warm-gold|cold-blue|crimson-power",
    "isLight": false
  },
  "typography": {
    "headlineStyle": "bold-sans|elegant-serif|modern-geometric|condensed",
    "estimatedHeadlineSize": "48px",
    "estimatedLineHeight": "1.0",
    "hasHighlights": true,
    "highlightStyle": "color-change|underline|background|glow",
    "textTransform": "uppercase|lowercase|capitalize|none"
  },
  "effects": {
    "hasGlow": true,
    "glowIntensity": "subtle|medium|strong",
    "glowColor": "#hex or null",
    "hasGrain": true,
    "grainIntensity": "subtle|medium|strong",
    "hasVignette": true,
    "vignetteIntensity": "subtle|medium|strong",
    "hasBokeh": false,
    "hasSmoke": false,
    "hasRimLight": true,
    "specialEffects": ["glitch", "shards", "beams"]
  },
  "impression": {
    "quality": "behance|dribbble|canva|amateur",
    "style": "tech|luxury|editorial|minimalist|urban|organic",
    "targetAudience": "premium|mass|niche",
    "scrollStopPower": 8
  },
  "suggestedPreset": "neon-green|neon-blue|gold-premium|etc"
}

Retorne APENAS JSON válido.`;

  const text = await callClaudeVision(prompt, [img], 1500);
  const result = parseJsonFromText(text);

  console.log(`[CRITIC] DNA extraído — mood: ${result.colors?.mood}, quality: ${result.impression?.quality}`);
  return result;
}

// ============================================================
// Utilitários
// ============================================================

function getGoldReferences() {
  if (!fs.existsSync(GOLD_REFS_DIR)) return [];
  return fs.readdirSync(GOLD_REFS_DIR)
    .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
    .map(f => path.join(GOLD_REFS_DIR, f));
}

function getOverrideMap() {
  return { ...OVERRIDE_MAP };
}

function getDimensions() {
  return { ...CRITIQUE_DIMENSIONS };
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  critiqueDesign,
  compareWithReference,
  generateWithCritique,
  extractDesignDNA,
  getGoldReferences,
  getOverrideMap,
  getDimensions,
  OVERRIDE_MAP,
  CRITIQUE_DIMENSIONS,
  GOLD_REFS_DIR,
  // Re-export feedback rules para acesso fácil
  feedbackRules: require('./design-feedback-rules'),
};
