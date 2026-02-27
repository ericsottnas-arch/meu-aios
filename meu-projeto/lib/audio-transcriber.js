// meu-projeto/lib/audio-transcriber.js
// Transcreve áudios do WhatsApp via Groq Whisper e armazena transcrições

const fs = require('fs');
const path = require('path');

const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');

/**
 * Transcreve áudio via Groq Whisper
 */
async function transcribeAudio(audioUrl, audioId) {
  if (!GROQ_API_KEY) {
    console.warn(`⚠️ Groq API key não configurada - transcrição não será realizada`);
    return null;
  }

  try {
    // Fazer fetch do áudio
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Falha ao baixar áudio: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const blob = new Blob([buffer], { type: 'audio/ogg' });

    // Enviar para Groq Whisper
    const formData = new FormData();
    formData.append('file', blob, `audio-${audioId}.ogg`);
    formData.append('model', 'whisper-large-v3-turbo');

    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: formData
    });

    if (!groqResponse.ok) {
      throw new Error(`Groq error: ${groqResponse.statusText}`);
    }

    const result = await groqResponse.json();
    return result.text || null;
  } catch (err) {
    console.error(`Erro ao transcrever áudio ${audioId}:`, err.message);
    return null;
  }
}

/**
 * Salva transcrição em arquivo local
 */
function saveTranscription(clientFolder, audioId, transcription) {
  try {
    const transcripsPath = path.resolve(__dirname, `../../docs/clientes/${clientFolder}/conversas`);

    if (!fs.existsSync(transcripsPath)) {
      fs.mkdirSync(transcripsPath, { recursive: true });
    }

    const filename = `transcricao-${audioId}.txt`;
    const filepath = path.join(transcripsPath, filename);

    fs.writeFileSync(filepath, transcription);
    console.log(`📝 Transcrição salva: ${filepath}`);

    return filepath;
  } catch (err) {
    console.error(`Erro ao salvar transcrição:`, err.message);
    return null;
  }
}

/**
 * Processa áudio completo (transcreve + salva)
 */
async function processAudio(audioUrl, audioId, clientFolder) {
  if (!audioUrl) return null;

  console.log(`🎤 Transcrevendo áudio ${audioId}...`);
  const transcription = await transcribeAudio(audioUrl, audioId);

  if (transcription) {
    saveTranscription(clientFolder, audioId, transcription);
    return transcription;
  }

  return null;
}

module.exports = {
  transcribeAudio,
  saveTranscription,
  processAudio
};
