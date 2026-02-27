require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');
const mediaUrl = "https://mmg.whatsapp.net/v/t62.7117-24/533232659_1170020725045860_119808299711510689_n.enc?ccb=11-4&oh=01_Q5Aa3wGmQnyVeJJStXVIxElG_wrrSv0YnivXDem1K-Hluig7JA&oe=69C885D0&_nc_sid=5e03e0&mms3=true";

async function testTranscribe() {
  try {
    console.log(`🔑 GROQ_API_KEY: ${GROQ_API_KEY ? '✅ Carregada' : '❌ Não encontrada'}`);
    if (!GROQ_API_KEY) {
      console.error('Erro: GROQ_API_KEY não definida');
      return;
    }
    
    console.log(`🎤 Baixando áudio...`);
    const audioRes = await fetch(mediaUrl, { timeout: 10000 });
    
    if (!audioRes.ok) {
      console.error(`❌ Falha ao baixar: ${audioRes.status}`);
      return;
    }
    
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    console.log(`✅ Áudio baixado: ${audioBuffer.length} bytes`);
    
    console.log(`📝 Enviando para Groq Whisper...`);
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
      console.error(`❌ Groq error ${response.status}: ${errorText}`);
      return;
    }
    
    const transcription = (await response.text()).trim();
    console.log(`\n✅ TRANSCRIÇÃO CONCLUÍDA:\n"${transcription}"\n`);
  } catch (err) {
    console.error(`❌ Erro:`, err.message);
  }
}

testTranscribe();
