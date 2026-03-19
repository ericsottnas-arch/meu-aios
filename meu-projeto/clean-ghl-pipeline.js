// Deleta todas as oportunidades do pipeline Prospecção no GHL
require('dotenv').config();
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const axios = require('axios');

const TOKEN = process.env.GHL_ACCESS_TOKEN;
const LOC = process.env.GHL_LOCATION_ID;
const HEADERS = { Authorization: `Bearer ${TOKEN}`, Version: '2021-07-28' };
const BASE = 'https://services.leadconnectorhq.com';
const PIPELINE_ID = 'ePZNBwhee24q2yDE91pJ';

async function fetchPage() {
  const res = await axios.get(`${BASE}/opportunities/search`, {
    headers: HEADERS,
    params: { location_id: LOC, pipeline_id: PIPELINE_ID, limit: 100 }
  });
  return {
    opps: res.data.opportunities || [],
    total: res.data.meta?.total || 0
  };
}

async function run() {
  let totalDeleted = 0;
  let round = 1;

  while (true) {
    console.log(`\n--- Rodada ${round} ---`);
    const { opps, total } = await fetchPage();

    if (opps.length === 0) {
      console.log('Pipeline vazio.');
      break;
    }

    console.log(`Encontrados: ${opps.length} (total restante: ${total})`);

    for (const opp of opps) {
      const name = opp.contact?.name || opp.name || opp.id;
      try {
        await axios.delete(`${BASE}/opportunities/${opp.id}`, { headers: HEADERS });
        totalDeleted++;
        if (totalDeleted % 10 === 0) {
          process.stdout.write(`  ${totalDeleted} deletados...\r`);
        }
      } catch (e) {
        console.log(`  ❌ ${name}: ${e.response?.status || e.message}`);
      }
    }

    console.log(`  ✅ Rodada ${round}: ${opps.length} deletados`);
    round++;

    // Safety: max 10 rounds (1000 leads)
    if (round > 10) {
      console.log('⚠️  Limite de segurança atingido (10 rodadas)');
      break;
    }
  }

  console.log(`\n✅ Pipeline limpo. Total deletado: ${totalDeleted}`);
}

run().catch(e => console.error('ERRO:', e.response?.status, JSON.stringify(e.response?.data || e.message)));
