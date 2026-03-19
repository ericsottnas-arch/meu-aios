// meu-projeto/lib/iris-transcriber.js
// Transcricao de audio via Groq Whisper para a Iris
// Suporta mp4, m4a, ogg, wav, mp3 do GHL

const fs = require('fs');
const path = require('path');
const os = require('os');

const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');
const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3';

const AUDIO_EXTENSIONS = ['.mp4', '.m4a', '.ogg', '.wav', '.mp3', '.mpeg', '.webm'];

/**
 * Verifica se uma URL e de audio
 */
function isAudioUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return AUDIO_EXTENSIONS.some((ext) => lower.includes(ext));
}

/**
 * Extrai URL de audio dos attachments de uma mensagem GHL
 * @param {Object} message - Mensagem do GHL com campo attachments
 * @returns {string|null} URL do audio ou null
 */
function extractAudioUrl(message) {
  if (!message) return null;

  // attachments pode ser array de strings ou array de objetos
  const attachments = message.attachments || [];
  for (const att of attachments) {
    const url = typeof att === 'string' ? att : att.url || att.src;
    if (url && isAudioUrl(url)) return url;
  }

  return null;
}

/**
 * Baixa arquivo de audio de uma URL
 * @returns {Promise<{filePath: string, cleanup: Function}>}
 */
async function downloadAudio(url) {
  const ext = AUDIO_EXTENSIONS.find((e) => url.toLowerCase().includes(e)) || '.mp4';
  const tmpFile = path.join(os.tmpdir(), `iris-audio-${Date.now()}${ext}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar audio: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tmpFile, buffer);

  return {
    filePath: tmpFile,
    size: buffer.length,
    cleanup: () => {
      try { fs.unlinkSync(tmpFile); } catch (e) { /* ignore */ }
    },
  };
}

/**
 * Transcreve arquivo de audio via Groq Whisper
 * @param {string} filePath - Caminho do arquivo de audio
 * @returns {Promise<string>} Texto transcrito
 */
async function transcribeFile(filePath) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY nao configurada');
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  // Groq Whisper usa multipart/form-data
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), fileName);
  formData.append('model', WHISPER_MODEL);
  formData.append('language', 'pt');
  formData.append('response_format', 'text');

  const response = await fetch(GROQ_WHISPER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq Whisper ${response.status}: ${errText}`);
  }

  const text = await response.text();
  return text.trim();
}

/**
 * Transcreve audio a partir de URL
 * Pipeline completo: download → transcricao → cleanup
 * @param {string} audioUrl - URL do arquivo de audio
 * @returns {Promise<{success: boolean, text: string, duration_hint: string}>}
 */
async function transcribeFromUrl(audioUrl) {
  let download = null;
  try {
    download = await downloadAudio(audioUrl);
    console.log(`🎙️ Iris Transcriber: audio baixado (${(download.size / 1024).toFixed(0)}KB)`);

    const text = await transcribeFile(download.filePath);
    console.log(`🎙️ Iris Transcriber: transcrito "${text.substring(0, 80)}..."`);

    return { success: true, text };
  } catch (error) {
    console.error('🎙️ Iris Transcriber: erro:', error.message);
    return { success: false, text: '', error: error.message };
  } finally {
    if (download) download.cleanup();
  }
}

module.exports = {
  isAudioUrl,
  extractAudioUrl,
  transcribeFromUrl,
  transcribeFile,
};
