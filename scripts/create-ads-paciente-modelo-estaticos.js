/**
 * Sobe 4 criativos estáticos (C8–C11) na campanha Paciente Modelo SP
 * Cada criativo usa asset_feed_spec: feed image (1080x1350) + stories image (1080x1920)
 * por placement customization.
 * Adsets: P1 (LLK) + P2 (Aberto) da campanha 120248334756100460
 */

require('dotenv').config({ path: require('path').join(__dirname, '../meu-projeto/.env') });
const fs    = require('fs');
const fetch = require('node-fetch').default;
const FormData = require('form-data');

const TOKEN      = process.env.META_ACCESS_TOKEN;
const ACCOUNT    = 'act_445142030338909';
const PAGE_ID    = '104425248310435';
const FORM_ID    = '2161459277935035';
const BASE       = 'https://graph.facebook.com/v21.0';

const ADSETS = [
  '120248335266620460',  // P2 Aberto
  '120248334756250460',  // P1 LLK
];

const COPY = {
  message:     'Pálpebra caída envelhece o olhar antes do rosto. Não importa o quanto você durma.\n\nA blefaroplastia corrige o excesso de pele das pálpebras e o arqueamento das sobrancelhas. Resultado natural. Você vai parecer descansada, não operada.\n\nO Instituto HR Andrade seleciona pacientes modelo em São Paulo. Custo diferenciado para quem se enquadra no perfil. Vagas limitadas.\n\nPreencha o formulário e nossa equipe entra em contato.',
  headline:    'Seja Nossa Paciente Modelo em SP',
  description: 'Custo diferenciado. Vagas limitadas.',
  link:        'https://www.humbertoandrade.com.br/',
};

const CREATIVES = [
  { num: 'C8',  hook: 'Escuro',      feed: 'v1-escuro-texto-feed.png',  stories: 'v1-escuro-texto-stories.png' },
  { num: 'C9',  hook: 'Foto Fundo',  feed: 'v2-foto-split-feed.png',    stories: 'v2-foto-split-stories.png' },
  { num: 'C10', hook: 'Claro',       feed: 'v3-premium-claro-feed.png', stories: 'v3-premium-claro-stories.png' },
  { num: 'C11', hook: 'Texto',       feed: 'v4-texto-puro-feed.png',    stories: 'v4-texto-puro-stories.png' },
];

const IMG_DIR = '/home/synkra/ads-humberto';

async function api(path, body) {
  const r = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: TOKEN }),
  });
  const d = await r.json();
  if (d.error) throw new Error(`Meta API: ${d.error.message} (${d.error.code})`);
  return d;
}

async function uploadImage(filePath) {
  const form = new FormData();
  form.append('filename', fs.createReadStream(filePath));
  form.append('access_token', TOKEN);
  const r = await fetch(`${BASE}/${ACCOUNT}/adimages`, { method: 'POST', body: form });
  const d = await r.json();
  if (d.error) throw new Error(`Upload image: ${d.error.message}`);
  const images = d.images;
  const key = Object.keys(images)[0];
  return images[key].hash;
}

async function createCreativeWithPlacement(c, feedHash, storiesHash) {
  const name = `${c.num} [Estático] [Hook: Paciente Modelo - ${c.hook}]`;

  // Tenta asset_feed_spec com placement customization + lead gen form
  try {
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
          call_to_action: {
            type: 'LEARN_MORE',
            value: { lead_gen_form_id: FORM_ID },
          },
        },
      },
      asset_feed_spec: {
        images: [
          { hash: feedHash,    adlabels: [{ name: 'FEED' }] },
          { hash: storiesHash, adlabels: [{ name: 'STORIES' }] },
        ],
        asset_customization_rules: [{
          customization_spec: {
            publisher_platforms: ['instagram', 'facebook'],
            facebook_positions: ['story'],
            instagram_positions: ['story'],
          },
          image_label: { name: 'STORIES' },
        }],
      },
    });
    console.log(`  creative ok (placement): ${creative.id}`);
    return creative.id;
  } catch (e) {
    // Fallback: creative simples com feed image
    console.log(`  asset_feed_spec rejeitado (${e.message.slice(0,60)}), usando feed simples`);
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
          call_to_action: {
            type: 'LEARN_MORE',
            value: { lead_gen_form_id: FORM_ID },
          },
        },
      },
    });
    console.log(`  creative ok (feed simples): ${creative.id}`);
    return creative.id;
  }
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
  console.log('=== Upload de imagens para Meta ===\n');

  // Upload todos os arquivos PNG
  const hashes = {};
  for (const c of CREATIVES) {
    for (const key of ['feed', 'stories']) {
      const file = `${IMG_DIR}/${c[key]}`;
      process.stdout.write(`Uploading ${c[key]}... `);
      hashes[c[key]] = await uploadImage(file);
      console.log(`hash: ${hashes[c[key]]}`);
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n=== Criando criativos ===\n');
  const creativeIds = {};
  for (const c of CREATIVES) {
    console.log(`${c.num} [${c.hook}]`);
    creativeIds[c.num] = await createCreativeWithPlacement(c, hashes[c.feed], hashes[c.stories]);
    await new Promise(r => setTimeout(r, 700));
  }

  console.log('\n=== Criando anúncios ===\n');
  for (const adsetId of ADSETS) {
    for (const c of CREATIVES) {
      const adName = `${c.num} [Estático] [Hook: Paciente Modelo - ${c.hook}]`;
      const adId = await createAd(adsetId, creativeIds[c.num], adName);
      console.log(`✅ Ad ${adName} → adset ${adsetId} → ${adId}`);
      await new Promise(r => setTimeout(r, 700));
    }
  }

  console.log('\n✅ Concluído. 4 criativos × 2 adsets = 8 novos anúncios.');
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
