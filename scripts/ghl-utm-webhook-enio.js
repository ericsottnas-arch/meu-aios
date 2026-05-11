/**
 * GHL UTM Webhook — Dr. Enio Leite
 * Porta 3100
 */
const http = require('http');
const https = require('https');
require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });

const GHL_TOKEN   = process.env.GHL_ENIO_API_KEY;
const PORT        = 3100;

const UTM_FIELD_IDS = {
  utmSource:   'F8hk9Zy9Uka6zJqX6NqK',
  utmMedium:   '6pmjrqZAegarlhKRKFtp',
  utmCampaign: 'QoDo21wlk6yZlqxsK8l6',
  utmContent:  'j4tEO7vkmBc1OBJfGW8y',
  utmTerm:     'U0iBYsxTuIZl7jXvxVBr',
};

function ghlRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path, method,
      headers: { 'Authorization': `Bearer ${GHL_TOKEN}`, 'Version': '2021-07-28', 'Content-Type': 'application/json' },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getContact(contactId) {
  const res = await ghlRequest('GET', `/contacts/${contactId}`);
  return res.contact || null;
}

async function updateUTMFields(contactId, attribution) {
  const customFields = [];
  if (attribution.utmSource)   customFields.push({ id: UTM_FIELD_IDS.utmSource,   value: attribution.utmSource });
  if (attribution.utmMedium)   customFields.push({ id: UTM_FIELD_IDS.utmMedium,   value: attribution.utmMedium });
  if (attribution.utmCampaign) customFields.push({ id: UTM_FIELD_IDS.utmCampaign, value: attribution.utmCampaign });
  if (attribution.utmContent)  customFields.push({ id: UTM_FIELD_IDS.utmContent,  value: attribution.utmContent });
  if (attribution.utmTerm)     customFields.push({ id: UTM_FIELD_IDS.utmTerm,     value: attribution.utmTerm });
  if (customFields.length === 0) return { skipped: true };
  return await ghlRequest('PUT', `/contacts/${contactId}`, { customFields });
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') { res.writeHead(405); return res.end('Method Not Allowed'); }
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body);
      const contactId = payload.contactId || payload.id || payload.contact?.id;
      if (!contactId) { res.writeHead(200); return res.end('ok'); }

      console.log(`[INFO] Lead recebido: ${contactId}`);
      await new Promise(r => setTimeout(r, 5000));

      const contact = await getContact(contactId);
      if (!contact) { console.log(`[WARN] Contato não encontrado: ${contactId}`); res.writeHead(200); return res.end('ok'); }

      const attribution = contact.attributionSource?.utmSource
        ? contact.attributionSource
        : (payload._testAttribution || contact.attributionSource || {});

      console.log(`[INFO] Attribution: source=${attribution.utmSource} | medium=${attribution.utmMedium} | campaign=${attribution.utmCampaign}`);

      if (!attribution.utmSource && !attribution.utmCampaign) {
        console.log(`[INFO] Sem UTM data para ${contactId} — pulando`);
        res.writeHead(200); return res.end('ok');
      }

      const result = await updateUTMFields(contactId, attribution);
      console.log(`[OK] UTMs atualizados para ${contactId}:`, JSON.stringify(result).substring(0, 100));
      res.writeHead(200); res.end('ok');
    } catch (err) {
      console.error('[ERROR]', err.message);
      res.writeHead(500); res.end('error');
    }
  });
});

server.listen(PORT, () => {
  console.log(`GHL UTM Webhook — Dr. Enio Leite rodando na porta ${PORT}`);
  console.log(`URL: http://187.77.252.12:${PORT}`);
});
