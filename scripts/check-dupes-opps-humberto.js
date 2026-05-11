#!/usr/bin/env node
/**
 * Verifica oportunidades duplicadas no mesmo contato — Dr. Humberto
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('=== Oportunidades duplicadas — Humberto ===\n');
  
  // Busca pipelines
  const pipeRes = await ghlGet(`/opportunities/pipelines?locationId=${LOC_ID}`);
  const pipelines = pipeRes.pipelines || [];
  console.log(`Pipelines encontrados: ${pipelines.length}`);
  for (const p of pipelines) {
    console.log(`  - ${p.name} (${p.id})`);
  }
  
  // Busca oportunidades recentes (primeira pipeline)
  for (const pipeline of pipelines) {
    console.log(`\n--- Pipeline: ${pipeline.name} ---`);
    const qs = new URLSearchParams({ location_id: LOC_ID, pipeline_id: pipeline.id, limit: '100', page: '1' });
    const res = await ghlGet(`/opportunities/search?${qs}`);
    const opps = res.opportunities || [];
    console.log(`Total oportunidades (pág 1): ${opps.length}`);
    
    // Agrupa por contactId
    const byContact = {};
    for (const opp of opps) {
      const cid = opp.contactId || opp.contact?.id;
      if (!cid) continue;
      if (!byContact[cid]) byContact[cid] = [];
      byContact[cid].push(opp);
    }
    
    const withDupes = Object.entries(byContact).filter(([, arr]) => arr.length > 1);
    console.log(`Contatos com MÚLTIPLAS oportunidades neste pipeline: ${withDupes.length}`);
    
    for (const [contactId, oppsArr] of withDupes.slice(0, 5)) {
      // Busca nome do contato
      const cRes = await ghlGet(`/contacts/${contactId}`);
      const contact = cRes.contact || {};
      console.log(`\n  Contato: ${contact.firstName || ''} ${contact.lastName || ''} (${contactId})`);
      console.log(`  Tel: ${contact.phone || 'N/A'}`);
      for (const opp of oppsArr) {
        console.log(`    Opp: ${opp.name} | Stage: ${opp.pipelineStageId} | Criada: ${opp.createdAt}`);
      }
      await sleep(200);
    }
    
    await sleep(500);
  }
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
