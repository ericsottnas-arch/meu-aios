// meu-projeto/lib/swipe-analyzer.js
// Analisa conteúdo de redes sociais com visão real + contexto profundo
//
// UPGRADES vs v1:
//  - Claude Sonnet 4.6 com Vision (não apenas Haiku com texto)
//  - Baixa a imagem OG e envia para análise visual
//  - Tenta extrair comentários da página
//  - Identifica: quem são os personagens, qual o contexto cultural, por que esse TIMING importa
//  - Classifica: hype | educational | controversy | announcement | entertainment
//  - Sugere: estratégia de adaptação (comment-on-trend | replicate | bridge-post | analogy)

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.replace(/"/g, '');

// Sonnet para análise visual profunda — qualidade > custo aqui
const CLAUDE_ANALYSIS_MODEL = 'claude-sonnet-4-6';

function getIndexPath() {
  if (process.env.SWIPE_FILE_PATH) {
    return path.resolve(process.cwd(), process.env.SWIPE_FILE_PATH);
  }
  return path.resolve(__dirname, '../../docs/eric-brand/swipe-file/INDEX.md');
}

// ============================================================
// Detecção de plataforma e tipo
// ============================================================

function detectPlatform(url) {
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/twitter\.com|x\.com/.test(url)) return 'twitter';
  if (/tiktok\.com/.test(url)) return 'tiktok';
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/linkedin\.com/.test(url)) return 'linkedin';
  return 'other';
}

function detectContentType(url, platform) {
  if (platform === 'instagram') {
    if (/\/reel\//.test(url)) return 'reel';
    if (/\/p\//.test(url)) return 'post';
    return 'profile';
  }
  if (platform === 'twitter') return 'tweet';
  if (platform === 'tiktok') return 'video';
  if (platform === 'youtube') return 'video';
  return 'unknown';
}

function extractUsernameFromUrl(url, platform) {
  if (platform === 'instagram') {
    const withUser = url.match(/instagram\.com\/([^\/]+)\/(reel|p|tv)\//);
    if (withUser && !['p', 'explore', 'stories', 'reels'].includes(withUser[1])) {
      return `@${withUser[1]}`;
    }
  }
  if (platform === 'twitter') {
    const m = url.match(/(?:twitter|x)\.com\/([^\/]+)\/status\//);
    if (m) return `@${m[1]}`;
  }
  if (platform === 'tiktok') {
    const m = url.match(/tiktok\.com\/@([^\/]+)/);
    if (m) return `@${m[1]}`;
  }
  return null;
}

function decodeHtmlEntities(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

function getMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+property="${name}"[^>]+content="([^"]*)"`, 'i'),
    new RegExp(`<meta[^>]+content="([^"]*)"[^>]+property="${name}"`, 'i'),
    new RegExp(`<meta[^>]+name="${name}"[^>]+content="([^"]*)"`, 'i'),
    new RegExp(`<meta[^>]+content="([^"]*)"[^>]+name="${name}"`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return decodeHtmlEntities(m[1]);
  }
  return null;
}

// ============================================================
// Baixar imagem OG como base64
// ============================================================

async function downloadImageAsBase64(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    // Only accept image types supported by Claude Vision
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(contentType)) return null;
    const base64 = Buffer.from(buffer).toString('base64');
    // Skip if too small (icon/placeholder) or too big (>5MB)
    if (buffer.byteLength < 2000 || buffer.byteLength > 5_000_000) return null;
    return { base64, mediaType: contentType };
  } catch {
    return null;
  }
}

// ============================================================
// Extrair comentários via Playwright
// ============================================================

async function extractInstagramComments(page) {
  try {
    // Espera comentários carregarem
    await page.waitForSelector('ul article', { timeout: 5000 }).catch(() => {});

    const comments = await page.evaluate(() => {
      const results = [];

      // Tenta pegar comentários via estrutura do Instagram
      const commentEls = document.querySelectorAll('ul > div > li');
      for (const el of Array.from(commentEls).slice(0, 8)) {
        const text = el.innerText?.trim();
        if (text && text.length > 5 && text.length < 500) {
          results.push(text.replace(/\n+/g, ' '));
        }
      }

      // Fallback: qualquer span com texto significativo na seção de comentários
      if (!results.length) {
        const spans = document.querySelectorAll('article span');
        for (const el of Array.from(spans).slice(0, 20)) {
          const text = el.innerText?.trim();
          if (text && text.length > 10 && text.length < 300 && !text.includes('http')) {
            results.push(text);
          }
        }
      }

      return results.slice(0, 8);
    });

    return comments;
  } catch {
    return [];
  }
}

// ============================================================
// scrapeContent — versão completa com imagem + comentários
// ============================================================

async function scrapeContent(url) {
  const platform = detectPlatform(url);
  const contentType = detectContentType(url, platform);
  const urlUsername = extractUsernameFromUrl(url, platform);

  const base = { url, platform, contentType, urlUsername };

  // ── PASSO 1: Fetch rápido com Facebook bot UA para OG tags + imagem URL ──
  let ogImageUrl = null;
  let html = '';

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      html = await res.text();
      ogImageUrl = getMeta(html, 'og:image');
    }
  } catch (e) {
    console.log(`[swipe] fetch rápido falhou: ${e.message}`);
  }

  // ── PASSO 2: Playwright para screenshots + comentários ──
  const screenshots = [];
  const comments = [];
  let playwrightText = '';

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Espera um pouco para JS carregar
    await page.waitForTimeout(2500);

    // Extrai metadados se não tivemos no fetch
    if (!html) {
      const extracted = await page.evaluate(() => {
        const getMeta = (name) => {
          const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
          return el?.getAttribute('content') || null;
        };
        return {
          title: document.title,
          ogDescription: getMeta('og:description'),
          ogTitle: getMeta('og:title'),
          ogImage: getMeta('og:image'),
        };
      });
      if (extracted.ogImage) ogImageUrl = extracted.ogImage;
      playwrightText = [extracted.ogTitle, extracted.ogDescription].filter(Boolean).join('\n');
    }

    // Screenshot da área principal do post (viewport focused)
    try {
      const screenshotBuf = await page.screenshot({
        type: 'jpeg',
        quality: 75,
        clip: { x: 0, y: 0, width: 1000, height: 700 },
      });
      if (screenshotBuf.length > 5000) {
        screenshots.push({
          base64: screenshotBuf.toString('base64'),
          mediaType: 'image/jpeg',
          source: 'playwright_screenshot',
        });
      }
    } catch (e) {
      console.log('[swipe] screenshot falhou:', e.message);
    }

    // Tenta navegar carrossel (Instagram: clica no botão next)
    if (platform === 'instagram' && contentType === 'post') {
      for (let i = 0; i < 4; i++) {
        try {
          const nextBtn = await page.$('[aria-label="Avançar"], [aria-label="Next"]');
          if (!nextBtn) break;
          await nextBtn.click();
          await page.waitForTimeout(800);

          const slideBuf = await page.screenshot({
            type: 'jpeg',
            quality: 70,
            clip: { x: 0, y: 0, width: 800, height: 600 },
          });
          if (slideBuf.length > 5000) {
            screenshots.push({
              base64: slideBuf.toString('base64'),
              mediaType: 'image/jpeg',
              source: `slide_${i + 2}`,
            });
          }
        } catch {
          break;
        }
      }
    }

    // Extrai comentários
    const extractedComments = await extractInstagramComments(page);
    comments.push(...extractedComments);

    // Extrai texto visível (legenda completa, likes, etc.)
    try {
      playwrightText = await page.evaluate(() => {
        const article = document.querySelector('article') || document.body;
        return article.innerText?.slice(0, 1500) || '';
      });
    } catch {}

  } catch (e) {
    console.log(`[swipe] Playwright falhou: ${e.message}`);
  } finally {
    if (browser) await browser.close();
  }

  // ── PASSO 3: Baixa imagem OG como base64 ──
  const ogImage = await downloadImageAsBase64(ogImageUrl);
  if (ogImage) {
    ogImage.source = 'og_image';
    // Coloca a OG image primeiro (geralmente a mais limpa)
    screenshots.unshift(ogImage);
  }

  // Extrai metadados do HTML
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : null;
  const description = getMeta(html, 'og:description') || getMeta(html, 'description');
  const ogTitle = getMeta(html, 'og:title');

  return {
    ...base,
    title,
    description,
    ogTitle,
    ogImageUrl,
    pageText: playwrightText,
    images: screenshots.slice(0, 5), // máximo 5 imagens para a API
    comments,
  };
}

// ============================================================
// analyzeWithClaude — análise profunda com Vision
// ============================================================

async function analyzeWithClaude(content) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não configurado');

  const {
    url, platform, contentType, urlUsername,
    title, description, ogTitle, pageText,
    images, comments,
  } = content;

  // Monta contexto textual
  const contextLines = [
    `URL: ${url}`,
    `Plataforma: ${platform} / Tipo: ${contentType}`,
    urlUsername ? `Username (da URL): ${urlUsername}` : null,
    ogTitle ? `Título OG: ${ogTitle}` : null,
    title && title !== ogTitle ? `Título da página: ${title}` : null,
    description ? `Legenda/Descrição:\n${description}` : null,
    pageText && pageText.length > 50 ? `Texto visível na página:\n${pageText.slice(0, 800)}` : null,
    comments.length > 0 ? `\nComentários capturados (${comments.length}):\n${comments.map((c, i) => `${i + 1}. ${c}`).join('\n')}` : null,
    `\nImagens capturadas: ${images.length} (${images.map(i => i.source).join(', ')})`,
  ].filter(Boolean).join('\n');

  const prompt = `Você é um analista sênior de conteúdo viral para o mercado brasileiro de marketing digital, com expertise em entender CONTEXT CULTURAL e TIMING de conteúdos.

Analise este conteúdo de ${platform} com PROFUNDIDADE REAL — não faça suposições genéricas.

${contextLines}

=== ANÁLISE REQUERIDA ===

Você recebeu ${images.length > 0 ? `${images.length} imagem(ns) do conteúdo` : 'apenas metadados (sem acesso visual)'}.
${images.length > 0 ? 'OBSERVE as imagens com atenção: quem aparece, o que está escrito, qual o contexto visual.' : ''}

1. PERSONAGENS E CONTEXTO:
   - Quem são as pessoas que aparecem? (nome, cargo, por que são conhecidas)
   - Qual empresa/marca está envolvida?
   - Por que essas pessoas/empresas são relevantes neste momento?

2. FATOR HYPE / TIMING:
   - Este conteúdo está aproveitando alguma notícia, trend ou momento cultural? Qual?
   - Por que AGORA? O que tornava o timing perfeito?
   - O conteúdo é: hype (aproveita momento externo) | evergreen | controverso | educacional | entretenimento

3. MECANISMO REAL DE VIRALIDADE:
   - Qual foi a razão VERDADEIRA de engajar? (não seja genérico)
   - O que fez as pessoas pararem no scroll?
   - O que fez as pessoas comentarem/compartilharem?

4. FORMATO E TÉCNICA VISUAL:
   - Classifique nos formatos F1-F5:
     F1: Frase com Destaque (estático, tipografia bold)
     F2: Carrossel Dados (informação/estatísticas)
     F3: Thread Preta (opinionado, fundo escuro)
     F4: Estático Tweet / Post analítico
     F5: Reel com Narrativa (vídeo)

5. ESTRATÉGIA DE ADAPTAÇÃO para @byericsantos:
   @byericsantos = estrategista de marketing para profissionais de saúde/estética offline
   ICP = médico/dentista/esteticista que fatura bem mas perde pacientes pro concorrente mais visível

   Se for conteúdo de HYPE (personagem famoso + momento cultural):
   → Estratégia: "bridge-post" — aproveitar o mesmo hype para falar do nicho de saúde/estética
   → Ex: "Toguro foi de head da Cimed para VP da Rappi" → "Enquanto você está esperando o paciente chegar, o concorrente virou a chave do marketing"

   Se for conteúdo EVERGREEN/EDUCACIONAL:
   → Estratégia: "replicate-mechanism" — mesmo formato, outro tema

   Se o tema é gestão, financeiro, margem, lucro, crescimento empresarial, empreendedorismo:
   → Estratégia: "keep-narrative" — manter narrativa original, o ICP é EMPRESÁRIO e se identifica direto

   Se tem notícia ou acontecimento que merece posicionamento/opinião:
   → Estratégia: "generate-opinion" — criar take do Eric sobre o assunto

   Sugira 2 hooks concretos e prontos para usar.

Retorne APENAS JSON válido (sem markdown, sem texto extra):
{
  "format": "F1|F2|F3|F4|F5",
  "username": "@username do criador",
  "theme": "tema principal em até 10 palavras",
  "technique": "técnica visual/copy principal",
  "contentCategory": "hype|educational|controversy|announcement|entertainment|evergreen",
  "persons": "quem são as pessoas/marcas e por que são relevantes",
  "hypeContext": "qual o momento cultural/notícia que contextualiza este post (null se não for hype)",
  "timingFactor": "por que este post funcionou neste momento específico",
  "viralReason": "razão REAL e específica de ter engajado — não genérica",
  "adaptationStrategy": "bridge-post|replicate-mechanism|find-analogy|comment-on-trend|keep-narrative|generate-opinion",
  "adaptationReasoning": "1 frase explicando por que escolheu essa estratégia",
  "hookSuggestions": ["hook 1 concreto para @byericsantos", "hook 2 concreto para @byericsantos"],
  "insight": "insight principal para @byericsantos em 1 frase",
  "adaptation": "ideia concreta de adaptação em 1 frase"
}`;

  // Monta o array de conteúdo da mensagem (texto + imagens)
  const messageContent = [{ type: 'text', text: prompt }];

  for (const img of images) {
    if (!img.base64 || !img.mediaType) continue;
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
      model: CLAUDE_ANALYSIS_MODEL,
      max_tokens: 1200,
      messages: [{ role: 'user', content: messageContent }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API ${response.status}: ${err.substring(0, 300)}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude não retornou JSON válido');

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`Falha ao parsear JSON: ${e.message}\nTexto recebido: ${text.substring(0, 300)}`);
  }
}

// ============================================================
// appendToIndex — salva no INDEX.md
// ============================================================

function appendToIndex(analysis, url) {
  const indexPath = getIndexPath();

  if (!fs.existsSync(indexPath)) {
    throw new Error(`INDEX.md não encontrado em: ${indexPath}`);
  }

  const content = fs.readFileSync(indexPath, 'utf8');
  const lines = content.split('\n');

  const { format, username, theme, technique } = analysis;

  const idRegex = new RegExp(`\\|\\s*(${format}-(\\d+))\\s*\\|`);
  let maxNum = 0;
  let lastTableRowIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(idRegex);
    if (match) {
      const num = parseInt(match[2], 10);
      if (num > maxNum) maxNum = num;
      lastTableRowIdx = i;
    }
  }

  if (lastTableRowIdx === -1) {
    throw new Error(`Nenhuma tabela encontrada para ${format} no INDEX.md`);
  }

  const newNum = String(maxNum + 1).padStart(3, '0');
  const newId = `${format}-${newNum}`;

  const displayUrl = url.length > 55 ? url.substring(0, 52) + '...' : url;
  const newRow = `| ${newId} | \`${displayUrl}\` | ${username || 'desconhecido'} | ${theme} | ${technique} |`;

  lines.splice(lastTableRowIdx + 1, 0, newRow);

  // Posição para inserir a análise detalhada
  let insertPos = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## Como Adicionar')) {
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j] === '---') { insertPos = j; break; }
      }
      break;
    }
  }

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const section = [
    '',
    `### Análise Detalhada — ${newId} (${username || 'desconhecido'})`,
    '',
    analysis.persons ? `**Personagens/Contexto:** ${analysis.persons}` : null,
    analysis.hypeContext ? `**Fator Hype:** ${analysis.hypeContext}` : null,
    analysis.timingFactor ? `**Timing:** ${analysis.timingFactor}` : null,
    '',
    '**Por que viralizou (razão real):**',
    analysis.viralReason || analysis.whyViral || '—',
    '',
    '**Insight para @byericsantos:**',
    analysis.insight || '—',
    '',
    '**Estratégia de adaptação:**',
    `Tipo: ${analysis.adaptationStrategy || '—'}`,
    analysis.adaptation || '—',
    analysis.hookSuggestions?.length
      ? `\nHooks sugeridos:\n${analysis.hookSuggestions.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
      : null,
    '',
    `**Link:** ${url}`,
    `**Adicionado:** ${today}`,
    '',
  ].filter(l => l !== null).join('\n');

  lines.splice(insertPos, 0, ...section.split('\n'));

  const updatedIdx = lines.findIndex(l => l.startsWith('**Atualizado:**'));
  if (updatedIdx > -1) lines[updatedIdx] = `**Atualizado:** ${today}`;

  fs.writeFileSync(indexPath, lines.join('\n'), 'utf8');
  return newId;
}

// ============================================================
// analyzeSwipe — entry point público
// ============================================================

function deleteFromIndex(swipeId) {
  const indexPath = getIndexPath();
  if (!fs.existsSync(indexPath)) throw new Error(`INDEX.md não encontrado: ${indexPath}`);

  const content = fs.readFileSync(indexPath, 'utf8');
  const lines = content.split('\n');

  // 1. Remove linha da tabela
  const tableRowIdx = lines.findIndex(l => {
    const m = l.match(/^\|\s*(F[1-5]-\d{3})\s*\|/);
    return m && m[1] === swipeId;
  });
  if (tableRowIdx === -1) throw new Error(`Swipe ${swipeId} não encontrado na tabela`);
  lines.splice(tableRowIdx, 1);

  // 2. Remove seção de análise detalhada (### Análise Detalhada — ID ... até próximo --- ou ###)
  const detailHeaderIdx = lines.findIndex(l =>
    l.match(new RegExp(`^###\\s+Análise Detalhada\\s*[—-]\\s*${swipeId}\\b`))
  );

  if (detailHeaderIdx > -1) {
    // Encontra o fim da seção: próxima linha que começa com ## ou ### ou ---
    let endIdx = detailHeaderIdx + 1;
    while (endIdx < lines.length) {
      const l = lines[endIdx].trim();
      if (l.startsWith('## ') || l.startsWith('### ') || l === '---') break;
      endIdx++;
    }
    // Remove as linhas da seção (inclusive linha em branco antes e o --- se for dela)
    const start = detailHeaderIdx > 0 && lines[detailHeaderIdx - 1].trim() === ''
      ? detailHeaderIdx - 1
      : detailHeaderIdx;
    lines.splice(start, endIdx - start);
  }

  // 3. Atualiza data de atualização
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const updatedIdx = lines.findIndex(l => l.startsWith('**Atualizado:**'));
  if (updatedIdx > -1) lines[updatedIdx] = `**Atualizado:** ${today}`;

  fs.writeFileSync(indexPath, lines.join('\n'), 'utf8');
  return true;
}

async function analyzeSwipe(url) {
  const content = await scrapeContent(url);
  const analysis = await analyzeWithClaude(content);
  return { content, analysis };
}

module.exports = {
  analyzeSwipe,
  appendToIndex,
  deleteFromIndex,
  scrapeContent,
  analyzeWithClaude,
};
