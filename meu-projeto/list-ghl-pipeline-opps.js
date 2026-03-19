// Lista todas as oportunidades do pipeline Prospecção no GHL
require('dotenv').config();
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const axios = require('axios');

const TOKEN = process.env.GHL_ACCESS_TOKEN;
const LOC = process.env.GHL_LOCATION_ID;

async function run() {
  const pipRes = await axios.get('https://services.leadconnectorhq.com/opportunities/pipelines', {
    headers: { Authorization: `Bearer ${TOKEN}`, Version: '2021-07-28' },
    params: { locationId: LOC }
  });

  const prosp = pipRes.data.pipelines.find(p => p.name === 'Prospecção');
  if (!prosp) { console.log('Pipeline não encontrado'); return; }

  console.log('Pipeline:', prosp.name, '| ID:', prosp.id);

  const stageMap = {};
  for (const s of prosp.stages) {
    stageMap[s.id] = s.name;
  }

  // Get all opportunities
  let allOpps = [];
  let startAfter = 0;

  while (true) {
    const res = await axios.get('https://services.leadconnectorhq.com/opportunities/search', {
      headers: { Authorization: `Bearer ${TOKEN}`, Version: '2021-07-28' },
      params: {
        location_id: LOC,
        pipeline_id: prosp.id,
        limit: 100,
        startAfter
      }
    });

    const opps = res.data.opportunities || [];
    allOpps = allOpps.concat(opps);
    if (opps.length < 100) break;
    startAfter += 100;
  }

  console.log('Total:', allOpps.length, 'oportunidades\n');

  // Count by stage
  const byStage = {};
  for (const opp of allOpps) {
    const name = stageMap[opp.pipelineStageId] || opp.pipelineStageId;
    if (!byStage[name]) byStage[name] = [];
    byStage[name].push(opp.contact?.name || opp.name || opp.id);
  }

  for (const [stage, names] of Object.entries(byStage)) {
    console.log(`[${stage}] (${names.length}):`);
    names.forEach(n => console.log(`  - ${n}`));
  }

  // Output IDs
  console.log('\nIDs:', JSON.stringify(allOpps.map(o => o.id)));
}

run().catch(e => console.error('ERRO:', e.response?.status, JSON.stringify(e.response?.data || e.message)));
