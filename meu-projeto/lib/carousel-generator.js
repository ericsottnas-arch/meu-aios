// meu-projeto/lib/carousel-generator.js
// Gera carrossel F3 (Thread Preta) como PNGs via Playwright
// Layout: @alfredosoares style — fundo preto, texto + imagens contextuais
// Imagens: fotos reais das pessoas citadas, screenshots, logos, memes (Google Images)
// Resolução: 1080x1350 (viewport 540x675 + deviceScaleFactor 2)
// Referência: docs/eric-brand/knowledge-base/nova-analise-carrosseis-referencia.md

const fs = require('fs');
const path = require('path');

const PROFILE_IMG_PATH = path.resolve(__dirname, '../public/eric-profile.jpg');
const TEMP_DIR = path.resolve(__dirname, '../../.carousel-temp');
const IMG_CACHE_DIR = path.join(TEMP_DIR, '_img-cache');

// ============================================================
// Utilities
// ============================================================

function getProfileImgBase64() {
  try {
    if (fs.existsSync(PROFILE_IMG_PATH)) {
      const buf = fs.readFileSync(PROFILE_IMG_PATH);
      return `data:image/jpeg;base64,${buf.toString('base64')}`;
    }
  } catch {}
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="40" fill="#444"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Converte body text em parágrafos separados (quebra em \n\n ou a cada ~2 frases longas)
function formatBodyHtml(body, fontSize) {
  if (!body) return '';
  const size = fontSize || '16px';
  // Divide por linhas duplas primeiro
  let paragraphs = body.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
  // Se ficou um bloco só muito grande, tenta dividir ao meio por ponto final
  if (paragraphs.length === 1 && paragraphs[0].length > 200) {
    const text = paragraphs[0];
    const sentences = text.split(/(?<=\.)\s+/);
    if (sentences.length >= 3) {
      const mid = Math.ceil(sentences.length / 2);
      paragraphs = [
        sentences.slice(0, mid).join(' '),
        sentences.slice(mid).join(' ')
      ];
    }
  }
  return paragraphs
    .map(p => `<p class="body" style="font-size:${size}">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// ============================================================
// Instagram verified badge — SVG inline (azul oficial)
// ============================================================

const VERIFIED_BADGE_SVG = `<svg viewBox="0 0 40 40" width="16" height="16" style="vertical-align: middle; margin-left: 4px;">
  <circle cx="20" cy="20" r="20" fill="#0095F6"/>
  <path d="M17.2 27.5l-6.5-6.5 2.8-2.8 3.7 3.7 9.3-9.3 2.8 2.8-12.1 12.1z" fill="white"/>
</svg>`;

// ============================================================
// Web Image Search — Google Images via Playwright + cache
// Busca: fotos reais de pessoas, screenshots, logos, memes
// ============================================================

async function searchWebImage(query, browser) {
  if (!query || query.toLowerCase() === 'nenhuma' || query.toLowerCase() === 'none') return null;

  // Cache check
  const cacheKey = Buffer.from(query.toLowerCase().trim()).toString('base64url').substring(0, 50);
  const cachePath = path.join(IMG_CACHE_DIR, `${cacheKey}.jpg`);

  if (fs.existsSync(cachePath)) {
    const buf = fs.readFileSync(cachePath);
    if (buf.length > 5000) {
      return `data:image/jpeg;base64,${buf.toString('base64')}`;
    }
  }

  console.log(`[carousel] Buscando imagem: "${query}"`);

  try {
    const searchContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });
    const page = await searchContext.newPage();

    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&hl=pt-BR`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);

      // Extrair URLs full-size dos scripts inline do Google
      const fullUrls = await page.evaluate(() => {
        const urls = [];
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const text = script.textContent || '';
          const matches = text.matchAll(/\["(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)",(\d+),(\d+)\]/gi);
          for (const m of matches) {
            const u = m[1].replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');
            const w = parseInt(m[2]);
            const h = parseInt(m[3]);
            if (w > 600 && h > 400 && !u.includes('google.com') && !u.includes('gstatic.com')) {
              urls.push(u);
            }
            if (urls.length >= 10) break;
          }
          if (urls.length >= 10) break;
        }
        return [...new Set(urls)];
      });

      // Tenta baixar a primeira imagem válida
      for (const imgUrl of fullUrls.slice(0, 8)) {
        try {
          const cleanUrl = imgUrl.replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');
          const imgRes = await fetch(cleanUrl, {
            signal: AbortSignal.timeout(6000),
            headers: { 'Accept': 'image/*', 'User-Agent': 'Mozilla/5.0' },
          });

          if (!imgRes.ok) continue;

          const contentType = imgRes.headers.get('content-type') || '';
          if (!contentType.includes('image')) continue;

          const buf = Buffer.from(await imgRes.arrayBuffer());
          if (buf.length < 20000) continue; // min ~20KB

          // Cache
          if (!fs.existsSync(IMG_CACHE_DIR)) fs.mkdirSync(IMG_CACHE_DIR, { recursive: true });
          fs.writeFileSync(cachePath, buf);

          const mime = contentType.includes('png') ? 'image/png' : 'image/jpeg';
          console.log(`[carousel] ✅ Imagem encontrada (${Math.round(buf.length / 1024)}KB)`);
          return `data:${mime};base64,${buf.toString('base64')}`;
        } catch {}
      }

      // Fallback: thumbnail base64 do Google
      const thumbSrc = await page.evaluate(() => {
        const imgs = document.querySelectorAll('img[src^="data:image"]');
        for (const img of imgs) {
          const w = img.naturalWidth || img.width || 0;
          const h = img.naturalHeight || img.height || 0;
          if (w > 120 && h > 120) return img.src;
        }
        return null;
      });

      if (thumbSrc) {
        console.log(`[carousel] ⚠️ Usando thumbnail (fallback) para: "${query}"`);
        return thumbSrc;
      }

      console.warn(`[carousel] Nenhuma imagem para: "${query}"`);
    } finally {
      await searchContext.close();
    }
  } catch (err) {
    console.error(`[carousel] Busca de imagem falhou: ${err.message}`);
  }

  return null;
}

// ============================================================
// CSS compartilhado — @alfredosoares style
// ============================================================

const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: 540px;
    height: 675px;
    background: #000;
    color: #fff;
    font-family: 'Inter', -apple-system, 'Helvetica Neue', Arial, sans-serif;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 32px 40px 40px;
  }

  .header {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 12px;
    margin-bottom: 8px;
  }

  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    border: 2px solid #333;
  }

  .name-wrap {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .name-line {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .name {
    font-size: 15px;
    color: #fff;
    font-weight: 700;
  }

  .handle {
    font-size: 13px;
    color: #666;
    font-weight: 400;
  }

  .counter {
    font-size: 12px;
    color: #555;
    font-weight: 400;
    margin-left: auto;
    align-self: flex-start;
    padding-top: 4px;
  }
`;

// ============================================================
// Header HTML
// ============================================================

function headerHtml(profileImgSrc, slideNum, totalSlides) {
  return `
  <div class="header">
    <img class="avatar" src="${profileImgSrc}" alt="">
    <div class="name-wrap">
      <span class="name-line">
        <span class="name">Eric Santos</span>
        ${VERIFIED_BADGE_SVG}
      </span>
      <span class="handle">@byericsantos</span>
    </div>
    <span class="counter">${slideNum}/${totalSlides}</span>
  </div>`;
}

// ============================================================
// Template: CAPA (slide 1) — com ou sem imagem
// ============================================================

function buildCoverSlide(opts) {
  const { headline, body, totalSlides, profileImgSrc, contentImgSrc } = opts;

  const hLen = headline.length;
  const hasImage = !!contentImgSrc;
  // Capa: headline grande e bold (único slide com esse destaque)
  const headlineSize = hasImage
    ? (hLen > 80 ? '24px' : hLen > 50 ? '28px' : '32px')
    : (hLen > 100 ? '26px' : hLen > 70 ? '30px' : hLen > 40 ? '34px' : '38px');

  const bodyHtml = body
    ? formatBodyHtml(body, hasImage ? '14px' : '15px')
    : '';

  const imageSection = hasImage
    ? `<div class="image-zone"><img src="${contentImgSrc}" alt=""></div>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${SHARED_CSS}

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
  }

  .cover-headline {
    font-size: ${headlineSize};
    font-weight: 800;
    line-height: 1.18;
    color: #fff;
    letter-spacing: -0.02em;
  }

  .body {
    font-weight: 400;
    line-height: 1.5;
    color: #999;
    margin-top: 2px;
  }

  .body + .body { margin-top: 10px; }

  .thread-hint {
    font-size: 13px;
    color: #555;
    font-weight: 600;
    margin-top: 4px;
  }

  .image-zone {
    height: 220px;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: 12px;
    margin-top: 8px;
  }

  .image-zone img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
    display: block;
  }
</style></head>
<body>
  ${headerHtml(profileImgSrc, 1, totalSlides)}
  <div class="content">
    <h1 class="cover-headline">${escapeHtml(headline)}</h1>
    ${bodyHtml}
    <span class="thread-hint">Segue o fio &gt;</span>
  </div>
  ${imageSection}
</body></html>`;
}

// ============================================================
// Template: Slide com IMAGEM — texto topo, imagem embaixo (~35%)
// ============================================================

function buildSlideWithImage(opts) {
  const { headline, body, slideNum, totalSlides, profileImgSrc, contentImgSrc } = opts;

  const hLen = headline.length;
  // Título menor nos slides internos (não é capa)
  const headlineSize = hLen > 120 ? '18px' : hLen > 80 ? '20px' : hLen > 50 ? '22px' : '24px';

  const bodyHtml = body ? formatBodyHtml(body, '15px') : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${SHARED_CSS}

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
  }

  .headline {
    font-size: ${headlineSize};
    font-weight: 600;
    line-height: 1.25;
    color: #fff;
    letter-spacing: -0.01em;
  }

  .body {
    font-weight: 400;
    line-height: 1.5;
    color: #999;
  }

  .body + .body { margin-top: 10px; }

  .image-zone {
    height: 220px;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: 12px;
  }

  .image-zone img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
    display: block;
  }
</style></head>
<body>
  ${headerHtml(profileImgSrc, slideNum, totalSlides)}
  <div class="content">
    <h1 class="headline">${escapeHtml(headline)}</h1>
    ${bodyHtml}
  </div>
  <div class="image-zone">
    <img src="${contentImgSrc}" alt="">
  </div>
</body></html>`;
}

// ============================================================
// Template: Slide TEXT-ONLY — headline + body centralizado
// ============================================================

function buildSlideTextOnly(opts) {
  const { headline, body, slideNum, totalSlides, profileImgSrc } = opts;

  const hLen = headline.length;
  // Slides internos text-only: título opcional menor, foco no parágrafo
  const headlineSize = hLen > 120 ? '20px' : hLen > 80 ? '22px' : hLen > 50 ? '24px' : '26px';

  const bLen = (body || '').length;
  const bodySize = bLen > 300 ? '15px' : bLen > 200 ? '16px' : '17px';

  const bodyHtml = body ? formatBodyHtml(body, bodySize) : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${SHARED_CSS}

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
  }

  .headline {
    font-size: ${headlineSize};
    font-weight: 600;
    line-height: 1.25;
    color: #fff;
    letter-spacing: -0.01em;
  }

  .body {
    font-weight: 400;
    line-height: 1.55;
    color: #aaa;
  }

  .body + .body { margin-top: 10px; }
</style></head>
<body>
  ${headerHtml(profileImgSrc, slideNum, totalSlides)}
  <div class="content">
    <h1 class="headline">${escapeHtml(headline)}</h1>
    ${bodyHtml}
  </div>
</body></html>`;
}

// ============================================================
// Template: Slide NUMERADO — "1." + headline + body
// ============================================================

function buildNumberedSlide(opts) {
  const { number, headline, body, slideNum, totalSlides, profileImgSrc, contentImgSrc } = opts;

  const hLen = headline.length;
  const hasImage = !!contentImgSrc;
  // Slides numerados: título médio, foco no argumento
  const headlineSize = hasImage
    ? (hLen > 80 ? '18px' : hLen > 50 ? '20px' : '22px')
    : (hLen > 100 ? '20px' : hLen > 60 ? '22px' : '24px');

  const bodySize = hasImage ? '14px' : '16px';
  const bodyHtml = body ? formatBodyHtml(body, bodySize) : '';

  const imageSection = hasImage
    ? `<div class="image-zone"><img src="${contentImgSrc}" alt=""></div>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${SHARED_CSS}

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
  }

  .number {
    font-size: 40px;
    font-weight: 900;
    color: #333;
    letter-spacing: -0.02em;
    line-height: 1;
  }

  .headline {
    font-size: ${headlineSize};
    font-weight: 600;
    line-height: 1.25;
    color: #fff;
    letter-spacing: -0.01em;
  }

  .body {
    font-weight: 400;
    line-height: 1.5;
    color: #aaa;
  }

  .body + .body { margin-top: 10px; }

  .image-zone {
    height: 200px;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: 12px;
  }

  .image-zone img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
    display: block;
  }
</style></head>
<body>
  ${headerHtml(profileImgSrc, slideNum, totalSlides)}
  <div class="content">
    <span class="number">${number}.</span>
    <h1 class="headline">${escapeHtml(headline)}</h1>
    ${bodyHtml}
  </div>
  ${imageSection}
</body></html>`;
}

// ============================================================
// Template: REFRAME slide — barra vermelha + destaque
// ============================================================

function buildReframeSlide(opts) {
  const { headline, body, slideNum, totalSlides, profileImgSrc } = opts;

  const hLen = headline.length;
  // Reframe: um pouco mais destaque que slides normais, mas não tanto quanto capa
  const headlineSize = hLen > 100 ? '22px' : hLen > 60 ? '26px' : '28px';

  const bodyHtml = body ? formatBodyHtml(body, '16px') : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${SHARED_CSS}

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
  }

  .divider-top {
    width: 40px;
    height: 3px;
    background: #E53935;
  }

  .headline {
    font-size: ${headlineSize};
    font-weight: 700;
    line-height: 1.22;
    color: #fff;
    letter-spacing: -0.02em;
  }

  .body {
    font-weight: 400;
    line-height: 1.5;
    color: #aaa;
  }

  .body + .body { margin-top: 10px; }
</style></head>
<body>
  ${headerHtml(profileImgSrc, slideNum, totalSlides)}
  <div class="content">
    <div class="divider-top"></div>
    <h1 class="headline">${escapeHtml(headline)}</h1>
    ${bodyHtml}
  </div>
</body></html>`;
}

// ============================================================
// Template: CTA (último slide)
// ============================================================

function buildCtaSlide(opts) {
  const { cta, totalSlides, profileImgSrc } = opts;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${SHARED_CSS}

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    gap: 6px;
  }

  .cta-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 14px;
    border: 2px solid #333;
  }

  .cta-name {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 16px;
    font-weight: 700;
    color: #fff;
  }

  .cta-handle {
    font-size: 13px;
    color: #666;
    margin-bottom: 24px;
  }

  .divider {
    width: 40px;
    height: 1px;
    background: #333;
    margin-bottom: 24px;
  }

  .cta-text {
    font-size: 24px;
    font-weight: 700;
    line-height: 1.3;
    color: #fff;
    letter-spacing: -0.02em;
    max-width: 380px;
  }

  .follow-hint {
    margin-top: 20px;
    font-size: 13px;
    color: #444;
  }
</style></head>
<body>
  <div class="content">
    <img class="cta-avatar" src="${profileImgSrc}" alt="">
    <span class="cta-name">Eric Santos ${VERIFIED_BADGE_SVG}</span>
    <span class="cta-handle">@byericsantos</span>
    <div class="divider"></div>
    <p class="cta-text">${escapeHtml(cta)}</p>
    <p class="follow-hint">Salva e compartilha com um colega</p>
  </div>
</body></html>`;
}

// ============================================================
// Parser: texto Nova → slides estruturados
// Suporta [IMAGEM: query] por slide — query específica e contextual
// ============================================================

function parseF3Content(text) {
  let cleaned = text
    .replace(/^[✍📍🗂🎯]+.*$/gm, '')
    .replace(/^─+$/gm, '')
    .trim();

  // Remove intro antes de SLIDE 1
  const firstSlideIdx = cleaned.search(/\*{0,2}\[?SLIDE\s+1/i);
  if (firstSlideIdx > 0) {
    cleaned = cleaned.substring(firstSlideIdx).trim();
  }

  // Remove seção legenda/hashtags
  const legendaIdx = cleaned.search(/^-{3,}\s*\n.*(?:legenda|hashtag|caption)/im);
  if (legendaIdx > -1) {
    cleaned = cleaned.substring(0, legendaIdx).trim();
  }

  // Normaliza marcadores
  cleaned = cleaned.replace(/\*{0,2}\[?(SLIDE\s+\d+[^\]\n]*)\]?\*{0,2}/gi, '$1');

  let rawSlides = [];

  if (/SLIDE\s+\d+/i.test(cleaned)) {
    const parts = cleaned.split(/(?:^|\n)-{3,}\s*\n(?=SLIDE\s+\d+)|(?=^SLIDE\s+\d+)/gim);
    rawSlides = parts
      .filter(p => p.trim())
      .map(part => {
        const typeMatch = part.match(/SLIDE\s+\d+\s*(?:[:\-—–]\s*)?(CAPA|CONTEXTO|DESENVOLVIMENTO|REFRAME|CTA|FECHAMENTO|ENCERRAMENTO)?/i);
        const slideType = typeMatch && typeMatch[1] ? typeMatch[1].toUpperCase() : null;

        let content = part
          .replace(/^SLIDE\s+\d+\s*(?:[:\-—–]\s*)?(?:CAPA|T[IÍ]TULO|ABERTURA|CONTEXTO|CONTE[UÚ]DO|DESENVOLVIMENTO|REFRAME|CTA|FECHAMENTO|ENCERRAMENTO)?\s*[:\-—–\]\)]?\s*/im, '')
          .replace(/^-{3,}\s*/m, '')
          .trim();

        return { content, slideType };
      })
      .filter(p => p.content.length > 5);
  } else {
    rawSlides = cleaned
      .split(/\n-{3,}\n|\n{3,}/)
      .map(s => ({ content: s.trim(), slideType: null }))
      .filter(s => s.content.length > 10);
  }

  // Extrair CTA do último slide
  let cta = null;
  if (rawSlides.length > 1) {
    const lastSlide = rawSlides[rawSlides.length - 1];
    const ctaPatterns = ['salva', 'compartilha', 'segue', 'me segue', 'clica', 'comenta', 'acessa'];
    if (ctaPatterns.some(p => lastSlide.content.toLowerCase().includes(p)) || lastSlide.slideType === 'CTA') {
      let ctaText = lastSlide.content
        .replace(/\*\*/g, '')
        .replace(/@byericsantos/gi, '')
        .replace(/\[IMAGEM:[^\]]*\]/gi, '')
        .trim();
      const ctaLines = ctaText.split('\n').filter(l => l.trim());
      cta = ctaLines.slice(0, 2).join('\n');
      if (cta.length > 120) cta = ctaLines[0];
      rawSlides = rawSlides.slice(0, -1);
    }
  }

  // Max 8 slides
  if (rawSlides.length > 8) rawSlides = rawSlides.slice(0, 8);

  // Extrair headline, body, imageQuery e tipo de cada slide
  const slides = rawSlides.map(({ content, slideType }) => {
    // Extrair [IMAGEM: query]
    let imageQuery = null;
    const imgMatch = content.match(/\[IMAGEM:\s*([^\]]+)\]/i);
    if (imgMatch) {
      imageQuery = imgMatch[1].trim();
      if (imageQuery.toLowerCase() === 'nenhuma' || imageQuery.toLowerCase() === 'none') {
        imageQuery = null;
      }
    }

    // Remove [IMAGEM: ...] e markdown bold do conteúdo
    content = content.replace(/\[IMAGEM:[^\]]*\]/gi, '').replace(/\*\*/g, '').trim();

    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return null;

    let headline = lines[0].replace(/^#+\s*/, '').trim();
    let body = lines.slice(1).join('\n').trim();

    // Se headline muito curta e tem body, provavelmente é label residual
    if (headline.length < 8 && body.length > 0) {
      const bodyLines = body.split('\n');
      headline = bodyLines[0].trim();
      body = bodyLines.slice(1).join('\n').trim();
    }

    // Detectar numeração (1. 2. 3.) no headline
    let number = null;
    const numMatch = headline.match(/^(\d+)\.\s+/);
    if (numMatch) {
      number = parseInt(numMatch[1]);
      headline = headline.replace(/^\d+\.\s+/, '');
    }

    return { headline, body, slideType, number, imageQuery };
  }).filter(Boolean);

  // Fallback
  if (slides.length === 0) {
    const lines = cleaned.split('\n').filter(l => l.trim()).slice(0, 8);
    slides.push({ headline: lines[0] || 'Thread', body: lines.slice(1).join('\n'), slideType: null, number: null, imageQuery: null });
  }

  return { slides, cta, totalSlides: slides.length + (cta ? 1 : 0) };
}

// ============================================================
// Geração de PNGs via Playwright
// Slides com [IMAGEM:] buscam imagem; slides sem ficam text-only
// ============================================================

async function generateCarousel(slidesData, options = {}) {
  const { slides, cta } = slidesData;
  const swipeId = options.swipeId || `carousel-${Date.now()}`;

  const outputDir = path.join(TEMP_DIR, swipeId);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const profileImgSrc = getProfileImgBase64();

  // Montar todos os slides
  const allSlides = [...slides];
  if (cta) allSlides.push({ headline: cta, body: null, slideType: 'CTA', number: null, imageQuery: null, isCta: true });

  const totalSlides = allSlides.length;

  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    throw new Error('Playwright não encontrado');
  }

  const browser = await chromium.launch({ headless: true });

  // Buscar imagens para slides que precisam (em batches de 3)
  const slidesWithImage = allSlides.filter(s => s.imageQuery && !s.isCta);
  console.log(`[carousel] Buscando imagens para ${slidesWithImage.length} slides...`);

  const images = allSlides.map(() => null);
  const pendingIndexes = allSlides.map((s, i) => (s.imageQuery && !s.isCta) ? i : -1).filter(i => i >= 0);

  const BATCH = 3;
  for (let b = 0; b < pendingIndexes.length; b += BATCH) {
    const batch = pendingIndexes.slice(b, b + BATCH);
    const results = await Promise.all(
      batch.map(i => searchWebImage(allSlides[i].imageQuery, browser))
    );
    batch.forEach((idx, j) => { images[idx] = results[j]; });
  }

  // Contexto de renderização
  const context = await browser.newContext({
    viewport: { width: 540, height: 675 },
    deviceScaleFactor: 2,
  });

  const pngPaths = [];

  try {
    for (let i = 0; i < allSlides.length; i++) {
      const slide = allSlides[i];
      const slideNum = i + 1;
      const contentImgSrc = images[i];
      let html;

      if (slide.isCta) {
        html = buildCtaSlide({ cta: slide.headline, totalSlides, profileImgSrc });
      } else if (i === 0) {
        html = buildCoverSlide({ headline: slide.headline, body: slide.body, totalSlides, profileImgSrc, contentImgSrc });
      } else if (slide.slideType === 'REFRAME') {
        html = buildReframeSlide({ headline: slide.headline, body: slide.body, slideNum, totalSlides, profileImgSrc });
      } else if (slide.number) {
        html = buildNumberedSlide({ number: slide.number, headline: slide.headline, body: slide.body, slideNum, totalSlides, profileImgSrc, contentImgSrc });
      } else if (contentImgSrc) {
        html = buildSlideWithImage({ headline: slide.headline, body: slide.body, slideNum, totalSlides, profileImgSrc, contentImgSrc });
      } else {
        html = buildSlideTextOnly({ headline: slide.headline, body: slide.body, slideNum, totalSlides, profileImgSrc });
      }

      const page = await context.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });

      const pngPath = path.join(outputDir, `slide-${String(slideNum).padStart(2, '0')}.png`);
      await page.screenshot({ path: pngPath, type: 'png' });
      await page.close();

      pngPaths.push(pngPath);
      console.log(`[carousel] Slide ${slideNum}/${totalSlides} gerado`);
    }
  } finally {
    await context.close();
    await browser.close();
  }

  return pngPaths;
}

// ============================================================
// Parser + Gerador: F1 (Frase com Destaque)
// ============================================================

function parseF1Content(text) {
  const cleaned = text
    .replace(/^-{3,}\s*\n.*(?:legenda|hashtag|caption)[\s\S]*/im, '')
    .replace(/^[✍📍🗂🎯]+.*$/gm, '')
    .trim();

  const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let setup = '';
  let impacto = '';

  const boldMatch = cleaned.match(/\*\*(.+?)\*\*/s);
  if (boldMatch) {
    impacto = boldMatch[1].trim();
    setup = cleaned.replace(/\*\*(.+?)\*\*/s, '').replace(/\n{2,}/g, '\n').trim();
  } else {
    const capsIdx = lines.findIndex(l => l === l.toUpperCase() && l.length > 10);
    if (capsIdx > -1) {
      setup = lines.slice(0, capsIdx).join('\n');
      impacto = lines.slice(capsIdx).join('\n');
    } else if (lines.length >= 2) {
      const lastLines = lines.length > 3 ? 2 : 1;
      setup = lines.slice(0, -lastLines).join('\n');
      impacto = lines.slice(-lastLines).join('\n');
    } else {
      impacto = lines[0] || cleaned;
    }
  }

  let legenda = null;
  const legendaMatch = text.match(/^-{3,}\s*\n([\s\S]+)/m);
  if (legendaMatch) {
    legenda = legendaMatch[1].trim();
  }

  return { setup, impacto, legenda };
}

async function generateFrase(fraseData, options = {}) {
  const { setup, impacto } = fraseData;
  const swipeId = options.swipeId || `frase-${Date.now()}`;

  const outputDir = path.join(TEMP_DIR, swipeId);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const profileImgSrc = getProfileImgBase64();

  const setupSize = setup.length > 120 ? '26px' : setup.length > 60 ? '30px' : '34px';
  const impactoSize = impacto.length > 100 ? '30px' : impacto.length > 50 ? '36px' : '42px';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: 540px;
    height: 675px;
    background: #FFFFFF;
    color: #000;
    font-family: 'Inter', -apple-system, 'Helvetica Neue', Arial, sans-serif;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 40px 44px;
    gap: 20px;
  }

  .setup {
    font-size: ${setupSize};
    font-weight: 700;
    line-height: 1.2;
    color: #000000;
    letter-spacing: -0.02em;
  }

  .impacto {
    font-size: ${impactoSize};
    font-weight: 900;
    line-height: 1.15;
    color: #E53935;
    letter-spacing: -0.02em;
  }

  .handle {
    position: absolute;
    bottom: 28px;
    left: 44px;
    font-size: 14px;
    color: #999;
    font-weight: 400;
  }
</style></head>
<body>
  ${setup ? `<p class="setup">${escapeHtml(setup).replace(/\n/g, '<br>')}</p>` : ''}
  <p class="impacto">${escapeHtml(impacto).replace(/\n/g, '<br>')}</p>
  <span class="handle">@byericsantos</span>
</body></html>`;

  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    throw new Error('Playwright não encontrado');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 540, height: 675 },
    deviceScaleFactor: 2,
  });

  const pngPath = path.join(outputDir, 'frase-01.png');
  try {
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.screenshot({ path: pngPath, type: 'png' });
    await page.close();
  } finally {
    await context.close();
    await browser.close();
  }

  console.log(`[carousel] F1 Frase gerada: ${pngPath}`);
  return [pngPath];
}

// ============================================================
// Parser + Gerador: F4 (Estático Tweet)
// ============================================================

function parseF4Content(text) {
  const cleaned = text
    .replace(/^[✍📍🗂🎯]+.*$/gm, '')
    .trim();

  const parts = cleaned.split(/^-{3,}\s*$/m);
  const tweetText = parts[0].replace(/\*\*/g, '').trim();
  const legenda = parts[1] ? parts[1].trim() : null;

  return { tweetText, legenda };
}

async function generateEstatico(tweetData, options = {}) {
  const { tweetText } = tweetData;
  const swipeId = options.swipeId || `tweet-${Date.now()}`;

  const outputDir = path.join(TEMP_DIR, swipeId);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const profileImgSrc = getProfileImgBase64();

  const textSize = tweetText.length > 200 ? '24px' : tweetText.length > 120 ? '28px' : '32px';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: 540px;
    height: 675px;
    background: #1A1A1A;
    font-family: 'Inter', -apple-system, 'Helvetica Neue', Arial, sans-serif;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 36px;
  }

  .tweet-card {
    background: #000;
    border: 1px solid #333;
    border-radius: 16px;
    padding: 28px 24px;
    width: 100%;
    max-width: 460px;
  }

  .tweet-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
  }

  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  .name-wrap {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .name-line {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .name {
    font-size: 15px;
    color: #fff;
    font-weight: 700;
  }

  .handle {
    font-size: 13px;
    color: #666;
    font-weight: 400;
  }

  .tweet-text {
    font-size: ${textSize};
    font-weight: 700;
    line-height: 1.35;
    color: #fff;
    letter-spacing: -0.01em;
  }
</style></head>
<body>
  <div class="tweet-card">
    <div class="tweet-header">
      <img class="avatar" src="${profileImgSrc}" alt="">
      <div class="name-wrap">
        <span class="name-line">
          <span class="name">Eric Santos</span>
          ${VERIFIED_BADGE_SVG}
        </span>
        <span class="handle">@byericsantos</span>
      </div>
    </div>
    <p class="tweet-text">${escapeHtml(tweetText).replace(/\n/g, '<br>')}</p>
  </div>
</body></html>`;

  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    throw new Error('Playwright não encontrado');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 540, height: 675 },
    deviceScaleFactor: 2,
  });

  const pngPath = path.join(outputDir, 'tweet-01.png');
  try {
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.screenshot({ path: pngPath, type: 'png' });
    await page.close();
  } finally {
    await context.close();
    await browser.close();
  }

  console.log(`[carousel] F4 Estático gerado: ${pngPath}`);
  return [pngPath];
}

// ============================================================
// Regenerar slide individual
// ============================================================

async function regenerateSlide(slidesData, slideIndex, options = {}) {
  const { slides, cta } = slidesData;
  const allSlides = [...slides];
  if (cta) allSlides.push({ headline: cta, body: null, slideType: 'CTA', number: null, imageQuery: null, isCta: true });

  if (slideIndex < 0 || slideIndex >= allSlides.length) {
    throw new Error(`Slide ${slideIndex + 1} não existe (total: ${allSlides.length})`);
  }

  const slide = allSlides[slideIndex];
  const profileImgSrc = getProfileImgBase64();
  const slideNum = slideIndex + 1;
  const totalSlides = allSlides.length;

  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    throw new Error('Playwright não encontrado');
  }

  const browser = await chromium.launch({ headless: true });

  // Busca imagem se necessário
  let contentImgSrc = null;
  if (slide.imageQuery && !slide.isCta) {
    contentImgSrc = await searchWebImage(slide.imageQuery, browser);
  }

  const context = await browser.newContext({
    viewport: { width: 540, height: 675 },
    deviceScaleFactor: 2,
  });

  let html;
  if (slide.isCta) {
    html = buildCtaSlide({ cta: slide.headline, totalSlides, profileImgSrc });
  } else if (slideIndex === 0) {
    html = buildCoverSlide({ headline: slide.headline, body: slide.body, totalSlides, profileImgSrc, contentImgSrc });
  } else if (slide.slideType === 'REFRAME') {
    html = buildReframeSlide({ headline: slide.headline, body: slide.body, slideNum, totalSlides, profileImgSrc });
  } else if (slide.number) {
    html = buildNumberedSlide({ number: slide.number, headline: slide.headline, body: slide.body, slideNum, totalSlides, profileImgSrc, contentImgSrc });
  } else if (contentImgSrc) {
    html = buildSlideWithImage({ headline: slide.headline, body: slide.body, slideNum, totalSlides, profileImgSrc, contentImgSrc });
  } else {
    html = buildSlideTextOnly({ headline: slide.headline, body: slide.body, slideNum, totalSlides, profileImgSrc });
  }

  const outputDir = path.join(TEMP_DIR, options.swipeId || `regen-${Date.now()}`);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const pngPath = path.join(outputDir, `slide-${String(slideNum).padStart(2, '0')}.png`);
  try {
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.screenshot({ path: pngPath, type: 'png' });
    await page.close();
  } finally {
    await context.close();
    await browser.close();
  }

  console.log(`[carousel] Slide ${slideNum} regenerado: ${pngPath}`);
  return pngPath;
}

// ============================================================
// Limpeza
// ============================================================

function cleanOldCarouselTemp() {
  try {
    if (!fs.existsSync(TEMP_DIR)) return;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const dir of fs.readdirSync(TEMP_DIR)) {
      if (dir === '_img-cache') continue;
      const fullPath = path.join(TEMP_DIR, dir);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && stat.mtimeMs < cutoff) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      } catch {}
    }
  } catch {}
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  parseF3Content,
  generateCarousel,
  parseF1Content,
  generateFrase,
  parseF4Content,
  generateEstatico,
  regenerateSlide,
  cleanOldCarouselTemp,
  searchWebImage,
  TEMP_DIR,
};
