#!/usr/bin/env node
/**
 * Busca TODAS as oportunidades do pipeline PROCEDIMENTO e detecta duplicatas
 */
const https = require('https');
require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });

const TOKEN  = process.env.GHL_HUMBERTO_TOKEN;
const LOC_ID = process.env.GHL_HUMBERTO_LOCATION_ID;
const PIPELINE_PROCEDIMENTO = 'Z0BXCFpuHdqcc6SRCTVr';

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
  const all = [];
  let page = 1;
  while (true) {
    const qs = new URLSearchParams({ location_id: LOC_ID, pipeline_id: PIPELINE_PROCEDIMENTO, limit: '100', page: String(page) });
    const res = await ghlGet(`/opportunities/search?${qs}`);
    const meta = res.meta || {};
    const opps = res.opportunities || [];
    if (!opps.length) break;
    all.push(...opps);
    process.stderr.write(`Página ${page}: ${opps.length} opps (total: ${all.length} / ${meta.total || '?'})\n`);
    if (all.length >= (meta.total || 9999) || opps.length < 100) break;
    page++;
    await sleep(400);
  }
  
  console.log(`\nTotal oportunidades: ${all.length}`);
  
  // Agrupa por contactId
  const byContact = {};
  for (const opp of all) {
    const cid = opp.contactId || opp.contact?.id;
    if (!cid) continue;
    if (!byContact[cid]) byContact[cid] = [];
    byContact[cid].push(opp);
  }
  
  const withDupes = Object.entries(byContact).filter(([, arr]) => arr.length > 1);
  console.log(`Contatos com MÚLTIPLAS oportunidades: ${withDupes.length}`);
  
  for (const [contactId, oppsArr] of withDupes.slice(0, 10)) {
    console.log(`\n  ContactId: ${contactId}`);
    for (const opp of oppsArr) {
      const stageName = opp.pipelineStage?.name || opp.pipelineStageId?.substring(0, 8);
      console.log(`    - "${opp.name}" | Stage: ${stageName} | ${new Date(opp.createdAt).toLocaleDateString('pt-BR')}`);
    }
  }

  // Total info
  console.log(`\nEstatísticas do pipeline PROCEDIMENTO:`);
  console.log(`  Total opps: ${all.length}`);
  console.log(`  Contatos únicos: ${Object.keys(byContact).length}`);
  console.log(`  Contatos com dupes: ${withDupes.length}`);
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
