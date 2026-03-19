const KEY = process.argv[2] || 'AIzaSyBhj9WNhlHfrfJfPNtyxtrUCOjv6j8DBgU';
const fs = require('fs');

async function tryConfig(label, genConfig) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${KEY}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Generate an image of a red apple on a white table' }] }],
      generationConfig: genConfig,
    }),
  });
  const data = await r.json();
  if (r.status !== 200) {
    console.log(`${label}: ${r.status} — ${(data.error?.message || '').substring(0, 120)}`);
    return;
  }
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    if (p.inlineData) {
      const buf = Buffer.from(p.inlineData.data, 'base64');
      const fname = `test-apple-${Date.now()}.png`;
      fs.writeFileSync(fname, buf);
      console.log(`${label}: ✅ IMAGEM ${(buf.length / 1024).toFixed(0)} KB → ${fname}`);
    } else if (p.text) {
      console.log(`${label}: TEXT "${p.text.substring(0, 80)}"`);
    }
  }
  if (parts.length === 0) {
    console.log(`${label}: resposta vazia`);
  }
}

(async () => {
  await tryConfig('image-only', { responseModalities: ['image'] });
  await tryConfig('IMAGE-caps', { responseModalities: ['IMAGE'] });
  await tryConfig('text+image', { responseModalities: ['text', 'image'] });
  await tryConfig('TEXT+IMAGE', { responseModalities: ['TEXT', 'IMAGE'] });
  await tryConfig('no-config', {});
  await tryConfig('no-genConfig', undefined);
})();
