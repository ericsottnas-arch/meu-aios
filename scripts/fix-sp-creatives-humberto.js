/**
 * Re-upload imagens corrigidas (terminologia + foto) e atualiza os ads rodando.
 * C8–C11 nos adsets P1 (LLK) + P2 (Aberto) da campanha Paciente Modelo SP.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../meu-projeto/.env') });
const fs    = require('fs');
const fetch = require('node-fetch').default;
const FormData = require('form-data');

const TOKEN   = process.env.META_ACCESS_TOKEN;
const ACCOUNT = 'act_445142030338909';
const PAGE_ID = '104425248310435';
const FORM_ID = '2161459277935035';
const BASE    = 'https://graph.facebook.com/v21.0';

const ADSETS = [
  '120248335266620460',  // P2 Aberto
  '120248334756250460',  // P1 LLK
];

const COPY = {
  message:     'Pálpebra caída envelhece o olhar antes do rosto. Não importa o quanto você durma.\n\nO rejuvenescimento de pálpebras (blefaroplastia) corrige o excesso de pele das pálpebras. Resultado natural. Você vai parecer descansada, não operada.\n\nO Instituto HR Andrade seleciona pacientes modelo em São Paulo. Custo diferenciado para quem se enquadra no perfil. Vagas limitadas.\n\nPreencha o formulário e nossa equipe entra em contato.',
  headline:    'Seja Nossa Paciente Modelo em SP',
  description: 'Custo diferenciado. Vagas limitadas.',
  link:        'https://www.humbertoandrade.com.br/',
};

const CREATIVES = [
  { num: 'C8',  hook: 'Escuro',     feed: 'v1-escuro-texto-feed.png',  stories: 'v1-escuro-texto-stories.png' },
  { num: 'C9',  hook: 'Foto Fundo', feed: 'v2-foto-split-feed.png',    stories: 'v2-foto-split-stories.png' },
  { num: 'C10', hook: 'Claro',      feed: 'v3-premium-claro-feed.png', stories: 'v3-premium-claro-stories.png' },
  { num: 'C11', hook: 'Texto',      feed: 'v4-texto-puro-feed.png',    stories: 'v4-texto-puro-stories.png' },
];

const IMG_DIR = '/home/synkra/ads-humberto';

async function api(path, body) {
  const r = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: TOKEN }),
  });
  const d = await r.json();
  if (d.error) throw new Error(`Meta API [${path}]: ${d.error.message} (code ${d.error.code})`);
  return d;
}

async function uploadImage(filePath) {
  const form = new FormData();
  form.append('filename', fs.createReadStream(filePath));
  form.append('access_token', TOKEN);
  const r = await fetch(`${BASE}/${ACCOUNT}/adimages`, { method: 'POST', body: form });
  const d = await r.json();
  if (d.error) throw new Error(`Upload [${filePath}]: ${d.error.message}`);
  const key = Object.keys(d.images)[0];
  return d.images[key].hash;
}

async function getAdsInAdset(adsetId) {
  const r = await fetch(`${BASE}/${adsetId}/ads?fields=id,name,status&access_token=${TOKEN}`);
  const d = await r.json();
  if (d.error) throw new Error(`getAds: ${d.error.message}`);
  return d.data || [];
}

async function pauseAd(adId) {
  await api(adId, { status: 'PAUSED' });
}

async function createCreative(c, feedHash) {
  const name = `${c.num}v2 [Estático] [Hook: Paciente Modelo - ${c.hook}]`;
  const creative = await api(`${ACCOUNT}/adcreatives`, {
    name,
    object_story_spec: {
      page_id: PAGE_ID,
      link_data: {
        message: COPY.message,
        link: COPY.link,
        name: COPY.headline,
        description: COPY.description,
        image_hash: feedHash,
        call_to_action: { type: 'LEARN_MORE', value: { lead_gen_form_id: FORM_ID } },
      },
    },
  });
  return creative.id;
}

async function createAd(adsetId, creativeId, adName) {
  const ad = await api(`${ACCOUNT}/ads`, {
    name: adName,
    adset_id: adsetId,
    creative: { creative_id: creativeId },
    status: 'ACTIVE',
  });
  return ad.id;
}

async function main() {
  console.log('=== STEP 1: Upload imagens corrigidas ===\n');
  const hashes = {};
  for (const c of CREATIVES) {
    for (const key of ['feed', 'stories']) {
      const file = `${IMG_DIR}/${c[key]}`;
      process.stdout.write(`Upload ${c[key]}... `);
      hashes[c[key]] = await uploadImage(file);
      console.log(`hash: ${hashes[c[key]]}`);
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n=== STEP 2: Criar novos criativos ===\n');
  const creativeIds = {};
  for (const c of CREATIVES) {
    process.stdout.write(`${c.num}v2 [${c.hook}]... `);
    creativeIds[c.num] = await createCreative(c, hashes[c.feed]);
    console.log(`creative: ${creativeIds[c.num]}`);
    await new Promise(r => setTimeout(r, 700));
  }

  console.log('\n=== STEP 3: Pausar ads antigos + criar novos ===\n');
  for (const adsetId of ADSETS) {
    console.log(`\nAdset ${adsetId}:`);
    const existingAds = await getAdsInAdset(adsetId);

    for (const c of CREATIVES) {
      const oldAd = existingAds.find(a => a.name.includes(c.num) && !a.name.includes('v2'));
      if (oldAd && oldAd.status === 'ACTIVE') {
        await pauseAd(oldAd.id);
        console.log(`  Pausado: ${oldAd.name} (${oldAd.id})`);
      }

      const adName = `${c.num}v2 [Estático] [Hook: Paciente Modelo - ${c.hook}]`;
      const adId = await createAd(adsetId, creativeIds[c.num], adName);
      console.log(`  Novo ad: ${adName} → ${adId}`);
      await new Promise(r => setTimeout(r, 700));
    }
  }

  console.log('\n Concluído. 4 criativos corrigidos x 2 adsets = 8 novos anúncios ativos.');
}

main().catch(e => { console.error('\n ERRO:', e.message); process.exit(1); });
