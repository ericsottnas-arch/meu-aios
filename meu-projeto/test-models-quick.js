require('dotenv').config();
const KEY = process.argv[2] || process.env.GEMINI_API_KEY;

async function tryModel(model, body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) {
      const msg = data.error?.message || '';
      const limitMatch = msg.match(/limit: (\d+)/);
      const limit = limitMatch ? limitMatch[1] : '?';
      console.log(`${model}: ${r.status} (limit=${limit})`);
    } else {
      const part = data.candidates?.[0]?.content?.parts?.[0];
      if (part?.inlineData) {
        const buf = Buffer.from(part.inlineData.data, 'base64');
        console.log(`${model}: ✅ IMAGEM! ${buf.length} bytes (${(buf.length / 1024).toFixed(0)} KB)`);
      } else {
        console.log(`${model}: resposta sem imagem`);
      }
    }
  } catch (e) {
    console.log(`${model}: ERRO ${e.message}`);
  }
}

(async () => {
  const promptParts = [{ text: 'Generate a photo of a red apple on white table' }];

  const models = [
    ['gemini-2.5-flash-image', { responseModalities: ['image'] }],
    ['nano-banana-pro-preview', { responseModalities: ['image'] }],
    ['gemini-3-pro-image-preview', { responseModalities: ['image'] }],
    ['gemini-3.1-flash-image-preview', { responseModalities: ['image'] }],
    ['gemini-2.0-flash-exp-image-generation', { responseModalities: ['TEXT', 'IMAGE'] }],
    ['gemini-2.5-flash', { responseModalities: ['TEXT', 'IMAGE'] }],
  ];

  for (const [model, genConfig] of models) {
    await tryModel(model, {
      contents: [{ role: 'user', parts: promptParts }],
      generationConfig: genConfig,
    });
  }
})();
