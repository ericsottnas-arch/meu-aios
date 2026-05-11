#!/usr/bin/env node
/**
 * Limpa oportunidades duplicadas — pipeline PROCEDIMENTO — Dr. Humberto
 * Lógica: para cada contato com múltiplas opps, mantém a mais avançada no funil
 * (maior position de stage). Se empate, mantém a mais recente.
 * Deleta as restantes via DELETE /opportunities/{id}
 *
 * Modo padrão: dry-run (só mostra o que faria)
 * Para executar de verdade: node fix-dupes-opps-humberto.js --execute
 */
const https = require('https');
require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });
const TOKEN  = process.env.GHL_HUMBERTO_TOKEN;
const LOC_ID = process.env.GHL_HUMBERTO_LOCATION_ID;
const PIPELINE_ID = 'Z0BXCFpuHdqcc6SRCTVr';
const DRY_RUN = !process.argv.includes('--execute');

// Posição de cada stage no funil (maior = mais avançado)
const STAGE_POSITION = {
  '6cf4178e-4712-4070-a918-8b15211b41e9': 0,  // Lead recebido
  '41f7bbbf-0131-492a-b0ea-695dafe139ea': 1,  // Lead contatado
  '9532f181-d86a-4693-85a1-fa72f614c9cb': 2,  // Conectado
  'db2836dc-8473-4663-bf57-917321f7e1b5': 3,  // Oportunidade
  'f8409aa1-25c2-4a77-9cdf-7c603b39e2f7': 4,  // Avaliação agendada
  '4bf5fd0c-fbd8-497c-961e-1da4608bb691': 5,  // Avaliação realizada
  '88de7441-27aa-43fc-99e6-f13498b001a3': 6,  // Ganho
  '24bf756b-9f57-41bc-8b90-0bcf158bcab5': -1, // Perdido (menor prioridade)
};

function ghlGet(p) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname:'services.leadconnectorhq.com', path:p, method:'GET',
      headers:{ Authorization:`Bearer ${TOKEN}`, Version:'2021-07-28' }
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d))}catch{resolve({})} }); });
    req.on('error',reject); req.end();
  });
}

function ghlDelete(id) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname:'services.leadconnectorhq.com', path:`/opportunities/${id}`, method:'DELETE',
      headers:{ Authorization:`Bearer ${TOKEN}`, Version:'2021-07-28' }
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d))}catch{resolve({status:res.statusCode})} }); });
    req.on('error',reject); req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function stagePos(stageId) { return STAGE_POSITION[stageId] ?? 0; }

async function main() {
  console.log(`=== Fix duplicatas PROCEDIMENTO — ${DRY_RUN ? 'DRY RUN' : 'EXECUTANDO'} ===\n`);

  // Busca todas as oportunidades do pipeline
  const all = [];
  let page = 1;
  while (true) {
    const qs = new URLSearchParams({ location_id: LOC_ID, pipeline_id: PIPELINE_ID, limit: '100', page: String(page) });
    const res = await ghlGet(`/opportunities/search?${qs}`);
    const opps = res.opportunities || [];
    if (!opps.length) break;
    all.push(...opps);
    process.stderr.write(`Página ${page}: ${opps.length} opps (total: ${all.length})\n`);
    if (all.length >= (res.meta?.total || 99999) || opps.length < 100) break;
    page++;
    await sleep(300);
  }

  // Agrupa por contactId
  const byContact = {};
  for (const opp of all) {
    const cid = opp.contactId || opp.contact?.id;
    if (!cid) continue;
    if (!byContact[cid]) byContact[cid] = [];
    byContact[cid].push(opp);
  }

  const dupes = Object.entries(byContact).filter(([, arr]) => arr.length > 1);
  console.log(`Contatos com duplicatas: ${dupes.length}`);
  console.log(`Total oportunidades a deletar: ${dupes.reduce((s,[,a]) => s + a.length - 1, 0)}\n`);

  let deleted = 0, skipped = 0, errors = 0;

  for (const [contactId, opps] of dupes) {
    // Ordena: mais avançado primeiro, depois mais recente
    opps.sort((a, b) => {
      const posA = stagePos(a.pipelineStageId);
      const posB = stagePos(b.pipelineStageId);
      if (posB !== posA) return posB - posA;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const keep   = opps[0];
    const remove = opps.slice(1);

    const keepStage = keep.pipelineStage?.name || keep.pipelineStageId?.substring(0,8);
    const name = keep.name || keep.contact?.name || contactId.substring(0,8);

    if (DRY_RUN) {
      console.log(`  [KEEP]   "${name}" → stage: ${keepStage} | criado: ${new Date(keep.createdAt).toLocaleDateString('pt-BR')}`);
      for (const r of remove) {
        const rStage = r.pipelineStage?.name || r.pipelineStageId?.substring(0,8);
        console.log(`  [DELETE] "${r.name||name}" → stage: ${rStage} | criado: ${new Date(r.createdAt).toLocaleDateString('pt-BR')} | id: ${r.id}`);
      }
      console.log('');
    } else {
      for (const r of remove) {
        try {
          await ghlDelete(r.id);
          console.log(`✓ Deletado: ${r.id} (${r.name||name}) | manteve: ${keep.id}`);
          deleted++;
        } catch(e) {
          console.log(`✗ Erro ao deletar ${r.id}: ${e.message}`);
          errors++;
        }
        await sleep(200);
      }
    }
  }

  if (DRY_RUN) {
    console.log(`\n--- DRY RUN concluído ---`);
    console.log(`Para executar de verdade: node scripts/fix-dupes-opps-humberto.js --execute`);
  } else {
    console.log(`\n=== RESULTADO ===`);
    console.log(`✓ Deletados: ${deleted}`);
    console.log(`✗ Erros: ${errors}`);
  }
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
