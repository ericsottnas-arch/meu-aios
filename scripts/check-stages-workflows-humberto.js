#!/usr/bin/env node
/**
 * Busca stages do pipeline PROCEDIMENTO e workflows ativos
 */
const https = require('https');
require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });

const TOKEN  = process.env.GHL_HUMBERTO_TOKEN;
const LOC_ID = process.env.GHL_HUMBERTO_LOCATION_ID;

function ghlGet(path_) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'services.leadconnectorhq.com',
      path: path_,
      method: 'GET',
      headers: { Authorization: `Bearer ${TOKEN}`, Version: '2021-07-28' },
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(new Error(d.substring(0,300))); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // 1. Stages do pipeline PROCEDIMENTO
  const pipeRes = await ghlGet(`/opportunities/pipelines?locationId=${LOC_ID}`);
  const procedimento = (pipeRes.pipelines || []).find(p => p.id === 'Z0BXCFpuHdqcc6SRCTVr');
  
  if (procedimento) {
    console.log('=== Stages do Pipeline PROCEDIMENTO ===');
    for (const stage of (procedimento.stages || [])) {
      console.log(`  ${stage.id} → "${stage.name}" (pos: ${stage.position})`);
    }
  }
  
  // 2. Busca workflows ativos
  console.log('\n=== Workflows Ativos ===');
  const wfRes = await ghlGet(`/workflows/?locationId=${LOC_ID}`);
  const workflows = wfRes.workflows || [];
  console.log(`Total workflows: ${workflows.length}`);
  for (const wf of workflows) {
    const status = wf.status || 'unknown';
    console.log(`  [${status}] ${wf.name} (${wf.id})`);
  }
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
