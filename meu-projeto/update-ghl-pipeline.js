// Reestruturar pipeline "Prospecção" no GHL para 10 estágios
require('dotenv').config();
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const axios = require('axios');

const TOKEN = process.env.GHL_ACCESS_TOKEN;
const LOC = process.env.GHL_LOCATION_ID;

async function run() {
  // 1. Get pipeline ID
  const pipRes = await axios.get('https://services.leadconnectorhq.com/opportunities/pipelines', {
    headers: { Authorization: `Bearer ${TOKEN}`, Version: '2021-07-28' },
    params: { locationId: LOC }
  });

  const prospPipeline = pipRes.data.pipelines.find(p => p.name === 'Prospecção');
  if (!prospPipeline) {
    console.log('Pipeline Prospecção não encontrado');
    return;
  }

  console.log('Pipeline ID:', prospPipeline.id);
  console.log('Stages atuais:', prospPipeline.stages.map(s => s.name).join(' → '));

  // 2. Build new stages
  const newStageNames = [
    'Qualificado',
    'Aquecendo',
    'DM Enviada',
    'Em Conversa',
    'Pitch Feito',
    'Call Agendada',
    'Proposta Enviada',
    'Ganho',
    'Sem Resposta',
    'Perdido'
  ];

  // Map existing stages to keep their IDs where names match
  const existingMap = {};
  for (const s of prospPipeline.stages) {
    existingMap[s.name] = s.id;
  }

  // Build stages array
  const stages = newStageNames.map((name, i) => {
    const stage = { name, position: i };
    if (existingMap[name]) stage.id = existingMap[name];
    return stage;
  });

  console.log('\nNovos stages:');
  stages.forEach(s => console.log(`  ${s.position + 1}. ${s.name} ${s.id ? '(existente)' : '(NOVO)'}`));

  // 3. Update pipeline
  const updateRes = await axios.put(
    `https://services.leadconnectorhq.com/opportunities/pipelines/${prospPipeline.id}`,
    {
      name: 'Prospecção',
      stages,
      locationId: LOC
    },
    {
      headers: { Authorization: `Bearer ${TOKEN}`, Version: '2021-07-28' }
    }
  );

  console.log('\n✅ Pipeline atualizado!');
  if (updateRes.data.stages) {
    console.log('Stages finais:', updateRes.data.stages.map(s => s.name).join(' → '));
  } else {
    console.log('Response:', JSON.stringify(updateRes.data, null, 2));
  }
}

run().catch(e => {
  console.error('ERRO:', e.response?.status, JSON.stringify(e.response?.data || e.message));
});
