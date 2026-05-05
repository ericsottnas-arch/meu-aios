#!/usr/bin/env node
const path  = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

function apiGet(endpoint, params) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams({ locationId: process.env.GHL_HUMBERTO_LOCATION_ID, ...params }).toString();
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: `${endpoint}?${qs}`,
      headers: { Authorization: `Bearer ${process.env.GHL_HUMBERTO_TOKEN}`, Version: '2021-07-28' }
    };
    https.get(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  const res = await apiGet('/opportunities/pipelines', {});
  res.pipelines.forEach(p => {
    console.log('\nPipeline:', p.name, '|', p.id);
    p.stages.forEach(s => console.log('  Stage:', s.name, '|', s.id));
  });
}
main().catch(e => { console.error(e); process.exit(1); });
