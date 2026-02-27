require('dotenv').config();
const Database = require('better-sqlite3');

const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');
const db = new Database('/Users/ericsantos/docs/banco-dados-geral/whatsapp-conversations.db');

async function transcribeAudioFromUrl(mediaUrl, audioId) {
  try {
    console.log(`\n🎤 [${audioId}] Baixando áudio...`);
    const audioRes = await fetch(mediaUrl, { timeout: 10000 });
    
    if (!audioRes.ok) {
      throw new Error(`Download falhou: ${audioRes.status}`);
    }
    
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    console.log(`   ✅ Áudio baixado: ${audioBuffer.length} bytes`);
    
    console.log(`   📝 Enviando para Groq Whisper...`);
    const mimeType = audioRes.headers.get('content-type') || 'audio/ogg';
    const blob = new Blob([audioBuffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, `audio.ogg`);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'pt');
    formData.append('response_format', 'text');
    
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq error ${response.status}`);
    }
    
    const transcription = (await response.text()).trim();
    console.log(`   ✓ Transcrição: "${transcription.substring(0, 80)}..."`);
    
    // Salvar no banco
    const updateStmt = db.prepare(`
      UPDATE conversas 
      SET transcription = ?, content = ?
      WHERE id = ?
    `);
    updateStmt.run(transcription, transcription, audioId);
    console.log(`   💾 Salvo no banco`);
    
    return transcription;
  } catch (err) {
    console.error(`   ❌ Erro: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log(`\n=== TRANSCRIÇÃO RETROATIVA DE ÁUDIOS ===\n`);
  console.log(`🔑 GROQ_API_KEY: ${GROQ_API_KEY ? '✅ Carregada' : '❌ Não encontrada'}\n`);
  
  if (!GROQ_API_KEY) {
    console.error('Erro: GROQ_API_KEY não definida');
    process.exit(1);
  }
  
  // Buscar áudios sem transcrição
  const stmt = db.prepare(`
    SELECT id, audio_url, audio_duration 
    FROM conversas 
    WHERE message_type='audio' AND transcription IS NULL
    LIMIT 5
  `);
  
  const audios = stmt.all();
  console.log(`📊 Encontrados ${audios.length} áudios para transcrever\n`);
  
  for (const audio of audios) {
    await transcribeAudioFromUrl(audio.audio_url, audio.id);
  }
  
  console.log(`\n✅ Transcrição retroativa concluída!\n`);
  db.close();
}

main();
