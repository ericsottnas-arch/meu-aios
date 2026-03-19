/**
 * Nano Banana — Gemini Image Generation Wrapper
 * Gera fotos de estúdio e texturas de efeito via Gemini API.
 * Usa raw fetch (mesmo padrão de aios-chat.js) — sem SDK adicional.
 */

const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.0-flash-exp-image-generation';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const TEMP_DIR = path.join(__dirname, '..', '.carousel-temp');
const PHOTOS_DIR = path.join(__dirname, '..', 'assets', 'photos');

// ============================================================
// Prompt Templates
// ============================================================

const STUDIO_PORTRAIT_PROMPT = [
  'Professional studio portrait photo.',
  'Brazilian man, 25 years old, light brown skin,',
  'short dark hair, well-groomed beard, athletic build.',
  '{description}.',
  'Shot with 85mm portrait lens, soft studio lighting,',
  'clean solid dark background for easy removal.',
  'Portrait orientation, half body shot.',
  'High-end fashion magazine quality, sharp focus on face.',
].join(' ');

const EFFECT_TEXTURE_PROMPTS = {
  smoke: [
    'Seamless smoke fog texture on pure black background.',
    '{color} tinted atmospheric haze, concentrated at the bottom third.',
    'Cinematic quality, subtle, not overpowering. 1080x1350 pixels.',
    'PNG with transparency where possible.',
  ].join(' '),
  particles: [
    'Floating particles and dust motes on pure black background.',
    '{color} tinted bokeh particles, scattered naturally.',
    'Depth of field effect, some particles in focus, some blurred.',
    'Cinematic quality. 1080x1350 pixels.',
  ].join(' '),
  'lens-flare': [
    'Cinematic lens flare on pure black background.',
    '{color} tinted anamorphic flare, horizontal streak.',
    'Subtle, natural looking, not overdone.',
    'Professional cinema quality. 1080x1350 pixels.',
  ].join(' '),
};

// ============================================================
// Core API Call
// ============================================================

async function callGeminiImage(prompt, options = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não configurada no .env');
  }

  const model = options.model || MODEL;
  const url = `${BASE_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: prompt }],
    }],
    generationConfig: {
      responseModalities: ['text', 'image'],
    },
  };

  // Adicionar imagem de input para edição
  if (options.inputImage) {
    const b64 = options.inputImage.toString('base64');
    body.contents[0].parts.unshift({
      inlineData: { mimeType: 'image/png', data: b64 },
    });
  }

  console.log(`[nano-banana] Chamando Gemini (${model})...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API ${response.status}: ${errText}`);
  }

  const data = await response.json();

  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  // Resposta multipart: encontrar a parte com imagem
  const imagePart = parts.find(p => p.inlineData);
  if (!imagePart) {
    const textPart = parts.find(p => p.text);
    throw new Error(`Gemini não retornou imagem — ${textPart ? 'só texto: ' + textPart.text.substring(0, 100) : 'resposta vazia'}`);
  }

  const { mimeType, data: b64Data } = imagePart.inlineData;
  const buffer = Buffer.from(b64Data, 'base64');

  console.log(`[nano-banana] Imagem gerada (${(buffer.length / 1024).toFixed(0)}KB, ${mimeType})`);
  return buffer;
}

// ============================================================
// Remoção de background (rembg)
// ============================================================

function removeBackground(imgBuf) {
  try {
    const { execSync } = require('child_process');
    const tmpIn = path.join(TEMP_DIR, `nb-in-${Date.now()}.png`);
    const tmpOut = path.join(TEMP_DIR, `nb-out-${Date.now()}.png`);
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    fs.writeFileSync(tmpIn, imgBuf);
    execSync(`rembg i "${tmpIn}" "${tmpOut}"`, { timeout: 60000 });
    if (fs.existsSync(tmpOut)) {
      const result = fs.readFileSync(tmpOut);
      fs.unlinkSync(tmpIn);
      fs.unlinkSync(tmpOut);
      console.log('[nano-banana] Background removido com rembg');
      return result;
    }
  } catch (e) {
    console.log('[nano-banana] rembg não disponível, usando foto sem recorte:', e.message);
  }
  return imgBuf;
}

// ============================================================
// Public API
// ============================================================

/**
 * Gera foto profissional de estúdio via Gemini.
 * @param {string} description - Descrição adicional (roupa, pose, etc.)
 * @param {object} [options] - { size, removeBackground }
 * @returns {Promise<{ buffer: Buffer, path: string, filename: string }>}
 */
async function generatePhoto(description, options = {}) {
  const prompt = STUDIO_PORTRAIT_PROMPT.replace('{description}', description || 'Confident pose, looking at camera');

  const rawBuf = await callGeminiImage(prompt, options);
  const finalBuf = options.removeBackground !== false ? removeBackground(rawBuf) : rawBuf;

  // Salva em assets/photos
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  const filename = `nano-banana-${Date.now()}.png`;
  const outputPath = path.join(PHOTOS_DIR, filename);
  fs.writeFileSync(outputPath, finalBuf);
  console.log(`[nano-banana] Foto salva: ${outputPath}`);

  return { buffer: finalBuf, path: outputPath, filename };
}

/**
 * Gera textura de efeito (smoke, particles, lens flare).
 * @param {string} type - 'smoke' | 'particles' | 'lens-flare'
 * @param {object} preset - Preset do premium-designer (precisa de accent color)
 * @returns {Promise<Buffer>}
 */
async function generateEffectTexture(type, preset = {}) {
  const template = EFFECT_TEXTURE_PROMPTS[type];
  if (!template) {
    throw new Error(`Tipo de efeito desconhecido: ${type}. Use: smoke, particles, lens-flare`);
  }

  const color = preset.accentColor || preset.color || 'white';
  const prompt = template.replace('{color}', color);

  return callGeminiImage(prompt);
}

/**
 * Edita imagem existente via Gemini (relight, change pose, enhance).
 * @param {Buffer} imageBuf - Buffer da imagem original
 * @param {string} instruction - Instrução de edição
 * @returns {Promise<Buffer>}
 */
async function editImage(imageBuf, instruction) {
  if (!Buffer.isBuffer(imageBuf)) {
    throw new Error('imageBuf precisa ser um Buffer');
  }

  return callGeminiImage(instruction, { inputImage: imageBuf });
}

module.exports = {
  generatePhoto,
  generateEffectTexture,
  editImage,
  callGeminiImage,
  PHOTOS_DIR,
  TEMP_DIR,
};
