require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });
const https = require('https');

const TOKEN      = process.env.GHL_ENIO_API_KEY;
const LOCATION_ID = process.env.GHL_ENIO_LOCATION_ID;

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
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Version': '2021-07-28', 'Content-Type': 'application/json' },
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  let total = 0, fixed = 0, skipped = 0;
  let after = null;

  while (true) {
    const url = `/contacts/?locationId=${LOCATION_ID}&limit=100${after ? '&startAfter='+after : ''}`;
    const res = await ghlRequest('GET', url);
    const contacts = res.contacts || [];
    if (contacts.length === 0) break;

    for (const c of contacts) {
      total++;
      if (c.source !== 'Facebook' && c.source !== 'facebook') continue;
      const hasUtm = (c.customFields || []).some(f => f.id === UTM_FIELD_IDS.utmSource && f.value);
      if (hasUtm) { skipped++; continue; }

      const detail = await ghlRequest('GET', `/contacts/${c.id}`);
      const attr = detail.contact?.attributionSource || {};
      if (!attr.utmSource && !attr.utmCampaign) continue;

      const customFields = [];
      if (attr.utmSource)   customFields.push({ id: UTM_FIELD_IDS.utmSource,   value: attr.utmSource });
      if (attr.utmMedium)   customFields.push({ id: UTM_FIELD_IDS.utmMedium,   value: attr.utmMedium });
      if (attr.utmCampaign) customFields.push({ id: UTM_FIELD_IDS.utmCampaign, value: attr.utmCampaign });
      if (attr.utmContent)  customFields.push({ id: UTM_FIELD_IDS.utmContent,  value: attr.utmContent });
      if (attr.utmTerm)     customFields.push({ id: UTM_FIELD_IDS.utmTerm,     value: attr.utmTerm });

      await ghlRequest('PUT', `/contacts/${c.id}`, { customFields });
      fixed++;
      console.log(`[OK] ${c.firstName} ${c.lastName} — source=${attr.utmSource} | content=${attr.utmContent}`);
      await sleep(300);
    }

    after = contacts[contacts.length - 1]?.id;
    if (contacts.length < 100) break;
  }

  console.log(`\nConcluído: ${total} verificados | ${fixed} corrigidos | ${skipped} já tinham UTM`);
}

main().catch(e => console.error('Fatal:', e.message));
