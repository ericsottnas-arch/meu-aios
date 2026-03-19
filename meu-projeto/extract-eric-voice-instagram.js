#!/usr/bin/env node
// extract-eric-voice-instagram.js
// Baixa Reels do @byericsantos, transcreve e analisa o padrão de voz
// Uso: node extract-eric-voice-instagram.js [--limit=N] [--skip-download]

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const parentEnv = path.resolve(__dirname, '..', '.env');
const localEnv = path.resolve(__dirname, '.env');
if (fs.existsSync(parentEnv)) require('dotenv').config({ path: parentEnv });
if (fs.existsSync(localEnv)) require('dotenv').config({ path: localEnv, override: true });

const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.replace(/"/g, '');
const INSTAGRAM_USER = 'byericsantos';
const INSTAGRAM_COOKIES = process.env.INSTAGRAM_COOKIES_FILE || path.join(os.homedir(), '.instagram-cookies.txt');

const VOICE_OUTPUT = path.resolve(__dirname, '../docs/eric-brand/knowledge-base/eric-voice-instagram.md');
const TMP_DIR = path.join(os.tmpdir(), 'eric-instagram-reels');
const AUDIO_DIR = path.join(TMP_DIR, 'audio');

const args = process.argv.slice(2);
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1]) || 10;
const SKIP_DOWNLOAD = args.includes('--skip-download');
const COOKIES_FILE = args.find(a => a.startsWith('--cookies='))?.split('=')[1] || null;

// ============================================================
// Helpers
// ============================================================

function log(msg) { console.log(`[voice-extractor] ${msg}`); }

function ensureDirs() {
  [TMP_DIR, AUDIO_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

// ============================================================
// 1a. Coletar URLs dos Reels via Playwright
// ============================================================

async function collectReelUrls(limit) {
  const { chromium } = require('playwright');
  log(`🌐 Abrindo perfil público @${INSTAGRAM_USER} via Playwright...`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'pt-BR',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  try {
    // Acessa perfil diretamente (público, sem login)
    await page.goto(`https://www.instagram.com/${INSTAGRAM_USER}/reels/`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Aguarda conteúdo carregar (pode aparecer popup de login — rola mesmo assim)
    await page.waitForTimeout(4000);

    // Tenta fechar popup de login se aparecer
    const closeBtn = page.locator('[aria-label="Close"], button:has-text("Não agora"), button:has-text("Not Now")');
    if (await closeBtn.count() > 0) {
      await closeBtn.first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    // Scroll e coleta de links
    const reelUrls = new Set();
    let attempts = 0;
    const maxAttempts = Math.ceil(limit / 6) + 5;

    while (reelUrls.size < limit && attempts < maxAttempts) {
      const links = await page.$$eval('a[href*="/reel/"]', els =>
        els.map(el => el.href).filter(h => h.includes('/reel/'))
      );
      links.forEach(l => reelUrls.add(l.split('?')[0]));
      log(`  Reels encontrados: ${reelUrls.size} (tentativa ${attempts + 1}/${maxAttempts})`);

      if (reelUrls.size >= limit) break;
      await page.evaluate(() => window.scrollBy(0, 1500));
      await page.waitForTimeout(2500);
      attempts++;
    }

    await browser.close();
    const urls = [...reelUrls].slice(0, limit);
    log(`✅ ${urls.length} URLs coletados`);
    return urls;
  } catch (err) {
    await browser.close();
    throw new Error(`Playwright falhou: ${err.message}`);
  }
}

// ============================================================
// 1b. Baixar áudio dos Reels via yt-dlp (URL por URL)
// ============================================================

async function downloadReels(limit) {
  // Passo 1: Coletar URLs via Playwright
  const urls = await collectReelUrls(limit);

  if (urls.length === 0) {
    throw new Error('Nenhum Reel encontrado no perfil');
  }

  log(`📥 Baixando áudio de ${urls.length} Reels...`);
  const downloaded = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const id = url.split('/reel/')[1]?.replace('/', '') || `reel_${i}`;
    const outPath = path.join(AUDIO_DIR, `${id}.mp3`);

    if (fs.existsSync(outPath)) {
      log(`  [${i + 1}/${urls.length}] ${id} já existe, pulando`);
      downloaded.push(outPath);
      continue;
    }

    log(`  [${i + 1}/${urls.length}] Baixando ${id}...`);
    try {
      execSync(
        `yt-dlp "${url}" --extract-audio --audio-format mp3 --audio-quality 64K --output "${AUDIO_DIR}/${id}.%(ext)s" --no-warnings --quiet`,
        { timeout: 60_000 }
      );
      if (fs.existsSync(outPath)) {
        downloaded.push(outPath);
        log(`    ✅ OK`);
      }
    } catch (err) {
      log(`    ⚠️ Falhou: ${err.message.substring(0, 80)}`);
    }

    // Aguarda entre downloads para não ser bloqueado
    if (i < urls.length - 1) await new Promise(r => setTimeout(r, 2000));
  }

  log(`✅ ${downloaded.length} áudios baixados`);
  return downloaded;
}

// ============================================================
// 2. Transcrever áudios via Groq Whisper
// ============================================================

async function transcribeAudio(filePath) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY não configurado');

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), fileName);
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'pt');
  formData.append('response_format', 'text');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq Whisper ${response.status}: ${err.substring(0, 100)}`);
  }

  return (await response.text()).trim();
}

async function transcribeAll(audioPaths) {
  log(`🎙️ Transcrevendo ${audioPaths.length} áudios via Groq Whisper...`);
  const transcriptions = [];

  for (let i = 0; i < audioPaths.length; i++) {
    const filePath = audioPaths[i];
    const id = path.basename(filePath, '.mp3');
    log(`  [${i + 1}/${audioPaths.length}] ${id}...`);
    try {
      const text = await transcribeAudio(filePath);
      if (text.length > 30) {
        transcriptions.push({ id, text });
        log(`  ✅ ${text.substring(0, 60)}...`);
      } else {
        log(`  ⚠️ Texto muito curto, pulando`);
      }
    } catch (err) {
      log(`  ❌ Erro: ${err.message}`);
    }
    // Aguarda para não estourar rate limit
    if (i < audioPaths.length - 1) await new Promise(r => setTimeout(r, 500));
  }

  log(`✅ ${transcriptions.length} transcrições concluídas`);
  return transcriptions;
}

// ============================================================
// 3. Analisar com Claude — extrair padrões de voz
// ============================================================

async function analyzeVoicePatterns(transcriptions) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não configurado');

  const combined = transcriptions
    .map((t, i) => `--- Vídeo ${i + 1} (${t.id}) ---\n${t.text}`)
    .join('\n\n');

  log(`🧠 Analisando ${transcriptions.length} transcrições com Claude Sonnet...`);

  const prompt = `Você vai analisar transcrições de vídeos do Instagram de Eric Santos (@byericsantos) para criar um perfil detalhado da sua voz e estilo de comunicação.

Eric Santos é dono da Syra Digital, assessoria de marketing para profissionais de saúde e estética (médicos, dentistas, esteticistas). Ele cria conteúdo no Instagram sobre marketing para clínicas.

=== TRANSCRIÇÕES DOS VÍDEOS ===
${combined.substring(0, 15000)}

=== SUA TAREFA ===
Analise APENAS as falas do Eric (ignore qualquer outra pessoa que apareça) e extraia:

**1. VOCABULÁRIO CARACTERÍSTICO**
Liste palavras e expressões que Eric usa repetidamente. Inclua termos técnicos de marketing que ele simplifica, gírias, conectores que usa com frequência. Mínimo 30 itens.

**2. ESTRUTURA DE FRASE PREFERIDA**
Como Eric monta suas frases? Comprimento médio, use de pausa (vírgulas), início de parágrafo, conclusão. Com exemplos literais das transcrições.

**3. PADRÕES DE ARGUMENTO**
Como ele estrutura um ponto de vista? Qual é a sequência típica (afirmação → dado → exemplo → consequência)? Com exemplos literais.

**4. REFRAMES E PROVOCAÇÕES (mais importante)**
Frases onde ele vira a perspectiva do interlocutor. Copie literalmente. Mínimo 15 exemplos.

**5. COMO ELE EXPLICA CONCEITOS TÉCNICOS**
Como ele simplifica tráfego pago, funil, lead, CRM, algoritmo. Com exemplos literais de como ele formulou.

**6. FRASES DE TRANSIÇÃO E RITMO**
Como ele conecta ideias, valida o que a pessoa disse, muda de assunto. Com exemplos literais.

**7. TOM EM DIFERENTES MOMENTOS**
- Quando está ensinando: _______
- Quando está provocando: _______
- Quando está validando: _______
- Quando está concluindo: _______

**8. O QUE ERIC NUNCA FAZ**
Linguagem, expressões, comportamentos que claramente não fazem parte do estilo dele (baseado nas transcrições).

**9. 40 FRASES DE IMPACTO**
As melhores frases ditas por Eric. Copie literalmente das transcrições. Uma frase por linha.

Seja específico e use exemplos literais das transcrições. Evite generalidades. O objetivo é que um copywriter possa imitar a voz do Eric com precisão.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API ${response.status}: ${err.substring(0, 200)}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ============================================================
// 4. Salvar knowledge base
// ============================================================

function saveKnowledgeBase(analysis, transcriptions, sourceCount) {
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const content = `# Eric Santos — Voz Extraída dos Vídeos do Instagram
> Gerado automaticamente em ${date} a partir de ${sourceCount} Reels de @byericsantos
> **Fonte:** Transcrições de vídeo via Groq Whisper + análise Claude Sonnet
> **Uso:** Referência obrigatória para copywriters ao escrever como Eric

---

## Como usar este arquivo
- **Antes de escrever:** leia a seção "Frases de Impacto" para calibrar o ritmo
- **Para verificar:** use a seção "O que Eric NUNCA faz" como checklist de rejeição
- **Para adaptar:** a seção "Padrões de Argumento" mostra a estrutura lógica dele

---

${analysis}

---

## Transcrições Brutas (referência)

${transcriptions.slice(0, 5).map((t, i) =>
  `### Vídeo ${i + 1}\n\`\`\`\n${t.text.substring(0, 500)}...\n\`\`\``
).join('\n\n')}

---
*Arquivo gerado automaticamente. Atualizar rodando: \`node meu-projeto/extract-eric-voice-instagram.js\`*
`;

  fs.mkdirSync(path.dirname(VOICE_OUTPUT), { recursive: true });
  fs.writeFileSync(VOICE_OUTPUT, content, 'utf8');
  log(`✅ Salvo em: ${VOICE_OUTPUT}`);
}

// ============================================================
// Main
// ============================================================

async function main() {
  log(`🎬 Eric Voice Extractor — @${INSTAGRAM_USER}`);
  log(`Limite: ${LIMIT} vídeos | Skip download: ${SKIP_DOWNLOAD}`);
  ensureDirs();

  let audioPaths = [];

  if (SKIP_DOWNLOAD) {
    // Usa áudios já baixados
    audioPaths = fs.existsSync(AUDIO_DIR)
      ? fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.mp3')).map(f => path.join(AUDIO_DIR, f))
      : [];
    log(`📁 Usando ${audioPaths.length} áudios já baixados`);
  } else {
    audioPaths = await downloadReels(LIMIT);
  }

  if (audioPaths.length === 0) {
    log('❌ Nenhum áudio disponível. Verifique credenciais do Instagram ou use --skip-download');
    log('💡 Para autenticar: exporte cookies do Instagram via extensão "Get cookies.txt LOCALLY"');
    log(`   Salve em: ${INSTAGRAM_COOKIES}`);
    process.exit(1);
  }

  const transcriptions = await transcribeAll(audioPaths);

  if (transcriptions.length === 0) {
    log('❌ Nenhuma transcrição bem-sucedida');
    process.exit(1);
  }

  const analysis = await analyzeVoicePatterns(transcriptions);
  saveKnowledgeBase(analysis, transcriptions, transcriptions.length);

  log(`\n✅ Concluído!`);
  log(`📄 Knowledge base: ${VOICE_OUTPUT}`);
  log(`📊 Vídeos processados: ${transcriptions.length}`);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
