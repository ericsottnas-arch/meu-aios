// Configura campos personalizados e tags no GHL para o sistema de prospecção
require('dotenv').config();
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const axios = require('axios');

const TOKEN = process.env.GHL_ACCESS_TOKEN;
const LOC = process.env.GHL_LOCATION_ID;
const HEADERS = { Authorization: `Bearer ${TOKEN}`, Version: '2021-07-28' };
const BASE = 'https://services.leadconnectorhq.com';

async function run() {
  console.log('📋 Configurando campos de prospecção no GHL...\n');

  // 1. Criar campo personalizado "Procedimento Principal"
  try {
    const procRes = await axios.post(`${BASE}/locations/${LOC}/customFields`, {
      name: 'Procedimento Principal',
      dataType: 'SINGLE_OPTIONS',
      options: [
        'Criolipólise',
        'Lipo sem corte',
        'Lipo de papada',
        'Preenchedores',
        'Bioestimuladores',
        'Harmonização Orofacial',
        'Botox/Toxina',
        'Estética Geral',
        'Outro'
      ]
    }, { headers: HEADERS });
    console.log('✅ Campo "Procedimento Principal" criado:', procRes.data?.customField?.id || 'ok');
  } catch (e) {
    console.log('⚠️  Procedimento Principal:', e.response?.data?.message || e.message);
  }

  // 2. Criar campo personalizado "@Instagram"
  try {
    const igRes = await axios.post(`${BASE}/locations/${LOC}/customFields`, {
      name: 'Instagram',
      dataType: 'TEXT'
    }, { headers: HEADERS });
    console.log('✅ Campo "Instagram" criado:', igRes.data?.customField?.id || 'ok');
  } catch (e) {
    console.log('⚠️  Instagram:', e.response?.data?.message || e.message);
  }

  // 3. Criar campo personalizado "Seguidores"
  try {
    const segRes = await axios.post(`${BASE}/locations/${LOC}/customFields`, {
      name: 'Seguidores',
      dataType: 'NUMERICAL'
    }, { headers: HEADERS });
    console.log('✅ Campo "Seguidores" criado:', segRes.data?.customField?.id || 'ok');
  } catch (e) {
    console.log('⚠️  Seguidores:', e.response?.data?.message || e.message);
  }

  // 4. Criar tags de progresso de aquecimento
  // GHL cria tags automaticamente quando usadas, então vamos documentar
  console.log('\n📌 Tags de progresso (criar ao usar):');
  console.log('  - "curtiu" → quando curtir 3-4 posts');
  console.log('  - "comentou" → quando comentar 1 post');
  console.log('  - "story" → quando responder 1 story');
  console.log('  - "dm-pronta" → quando tem as 3 tags acima');

  console.log('\n✅ Setup concluído!');
  console.log('\nFluxo no GHL:');
  console.log('  1. Lead entra em "Qualificado" → preencher Procedimento + @Instagram + Seguidores');
  console.log('  2. Mover pra "Aquecendo" → começar engajamento');
  console.log('  3. Adicionar tag "curtiu" (Dia 1-2)');
  console.log('  4. Adicionar tag "comentou" (Dia 3)');
  console.log('  5. Adicionar tag "story" (Dia 4-5)');
  console.log('  6. Quando tem 3 tags → mover pra "DM Enviada"');
}

run().catch(e => console.error('ERRO:', e.response?.status, JSON.stringify(e.response?.data || e.message)));
