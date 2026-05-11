#!/usr/bin/env node
const path  = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN = process.env.GHL_HUMBERTO_TOKEN;
const LOC   = process.env.GHL_HUMBERTO_LOCATION_ID;

function apiGet(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: `${endpoint}${qs}`,
      headers: { Authorization: `Bearer ${TOKEN}`, Version: '2021-07-28' }
    };
    https.get(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({ raw: data.slice(0,300) }); } });
    }).on('error', reject);
  });
}

async function main() {
  // Custom values
  console.log('\n=== CUSTOM VALUES ===');
  const cv = await apiGet(`/locations/${LOC}/customValues`);
  if (cv.customValues) {
    cv.customValues.forEach(v => console.log(`  [${v.id}] ${v.name}: "${v.value || ''}"`));
  } else {
    console.log('  Raw:', JSON.stringify(cv).slice(0, 200));
  }

  // Workflows via v2
  console.log('\n=== WORKFLOWS (todos) ===');
  const wf = await apiGet(`/workflows/`, { locationId: LOC });
  if (wf.workflows) {
    console.log(`  Total: ${wf.workflows.length}`);
    wf.workflows.forEach(w => console.log(`  ${w.name} | ${w.id} | ${w.status}`));
  } else {
    console.log('  Raw:', JSON.stringify(wf).slice(0, 300));
  }
}
main().catch(e => { console.error(e.message); process.exit(1); });
