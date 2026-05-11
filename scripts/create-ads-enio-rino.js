/**
 * Criar anúncios — Dr. Enio Leite / Rinomodelação
 * Campanha e conjunto já existem. Vídeos já subidos no Meta.
 * Este script só cria criativos + anúncios.
 */

const path = require('path');
const fetch = require('node-fetch').default;

require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const AD_ACCOUNT_ID = 'act_2405811993275286';
const ACCESS_TOKEN  = process.env.META_ACCESS_TOKEN;
const API_VERSION   = 'v21.0';
const BASE_URL      = `https://graph.facebook.com/${API_VERSION}`;

const ADSET_ID    = '6919144372925';
const PAGE_ID     = '611759308981092'; // Instituto Enio Leite
const LANDING_URL = 'https://www.drenioleite.com/rinomodelacao';

// IDs dos vídeos já subidos no Meta + thumbnails capturadas
const ADS = [
  {
    videoId:     '837643226013543',
    thumbnail:   'https://scontent-gru1-2.xx.fbcdn.net/v/t15.5256-10/666217319_1498438261676173_6437000500881324285_n.jpg?stp=dst-jpg_p160x160_tt6&_nc_cat=100&ccb=1-7&_nc_sid=200999&_nc_ohc=yDa8sFfkf1EQ7kNvwEOwZXC&_nc_oc=AdoGY2gurAzLlSrygLhRvuUvzaKgxbOePwf6DPkoiVOYhT7iP5aiZenVb4uipLLZrrshAUplhYQ8rVKfxwe7N4mP&_nc_zt=23&_nc_ht=scontent-gru1-2.xx&edm=APRAPSkEAAAA&_nc_gid=vdy9Rgl9ERCkyNyC2zZKKA&_nc_tpa=Q5bMBQGgja08g0FMkDcMMNcL_S0z5dRAcLPXkYTpW5pSZHkI_hLDP77L3d17vESCmunMkSee1-7CKba4AQ&oh=00_Af28SfNSBj5ynuGNhT-DmdWGrwkxgoN1YB60E-jJwfxywQ&oe=69DB5DAA',
    adtagName:   'C1 [Vídeo] [Hook: Dorso e Ponta] [CTA: Agendar]',
    message:     'Ela não queria outro nariz. Queria o nariz dela, definido.\n\nSem cirurgia, sem repouso. Resultado no mesmo dia.\n\n👉 Agende sua avaliação com Dr. Enio Leite em Serra, ES.',
    headline:    'Rinomodelação em Serra, ES',
    description: 'Procedimento em 40 min. Anestesia local. Sem repouso.',
  },
  {
    videoId:     '1921795731873655',
    thumbnail:   'https://scontent-gru2-2.xx.fbcdn.net/v/t15.5256-10/666111584_947354634719096_8967088498636292760_n.jpg?stp=dst-jpg_p160x160_tt6&_nc_cat=105&ccb=1-7&_nc_sid=200999&_nc_ohc=5EXac_kDFLkQ7kNvwFvwYzD&_nc_oc=Adofm5KTljNycWcxXwJIJR9-Zf8xV_27BgjXBb-N85M3AjWl-77AVvlb03kUDC2rgmXWaDLAMJ0PRLWqAtmmpjj4&_nc_zt=23&_nc_ht=scontent-gru2-2.xx&edm=APRAPSkEAAAA&_nc_gid=yWwFBpA23vKvVr1mv9IhUg&_nc_tpa=Q5bMBQGXd5qIl5WV35d4E8Ux3zQDgR2IdXMZ0s26UBwrRA-I2Abk2WJ4kbXsgF9QdApZFD8-ZwwGwKGtlg&oh=00_Af0etL2bIngPzRyc9B1uwZeygdp0HkIb1qdQdTGkjr4AyA&oe=69DB46D6',
    adtagName:   'C2 [Vídeo] [Hook: Medo Nariz Porquinho] [CTA: Saiba Mais]',
    message:     'Esse medo existe quando não tem técnica.\n\nDr. Enio trabalha com harmonização estruturada — o resultado parece que você nasceu assim.\n\n👉 Veja como funciona.',
    headline:    'Natural. Sem cirurgia.',
    description: 'Técnica estruturada. Resultado que respeita o seu rosto.',
  },
  {
    videoId:     '933701802708667',
    thumbnail:   'https://scontent-gru1-2.xx.fbcdn.net/v/t15.5256-10/665580441_1427928515215579_8206982054957486062_n.jpg?stp=dst-jpg_p160x160_tt6&_nc_cat=100&ccb=1-7&_nc_sid=200999&_nc_ohc=45sBbV7yxw0Q7kNvwGbMwYb&_nc_oc=AdpUOAOCO-OPRoi1zwLxozJTFeuilfkzCv3R7xeW-sgxqMvX-tdBu2at-t1WNQWjP7GO4NGHZt7fZBNPIN3x2Bth&_nc_zt=23&_nc_ht=scontent-gru1-2.xx&edm=APRAPSkEAAAA&_nc_gid=jhUVUimzoLMchnYitC55LQ&_nc_tpa=Q5bMBQFxspafLEDqAqvUR0sdiEgl-JD773uop0TZGkanwizoFEVXgxbbx2l_698jP4AVyLuQb7eDdwpGGQ&oh=00_Af3HfjDLBQoIR-YgRS8VoMVsTXaVbmOmZ7BmyqiOKlQMOg&oe=69DB45F3',
    adtagName:   'C3 [Vídeo] [Hook: Case Estruturado] [CTA: Saiba Mais]',
    message:     'Resultado real. Sem filtro.\n\nRinomodelação estruturada com mapeamento específico do seu rosto — não um padrão genérico.\n\n👉 Veja o caso completo.',
    headline:    'Antes e depois real',
    description: 'Case documentado. Técnica estruturada. Serra, ES.',
  },
  {
    videoId:     '1295046615892092',
    thumbnail:   'https://scontent-gru2-1.xx.fbcdn.net/v/t15.5256-10/665275665_1615939222854824_6121910595503352265_n.jpg?stp=dst-jpg_p160x160_tt6&_nc_cat=109&ccb=1-7&_nc_sid=200999&_nc_ohc=ymCJnXmngrQQ7kNvwHmcI1z&_nc_oc=Ado3qgKugOGsklx75XWj1F28_bErKBJJBKU0vgdoEXCloHEKhFXcuX9B_a9CNA7TlHvKVyTFEcSydek4dTs1vflt&_nc_zt=23&_nc_ht=scontent-gru2-1.xx&edm=APRAPSkEAAAA&_nc_gid=sR2uzY7nppEDwsUCufeTug&_nc_tpa=Q5bMBQH3VlNnzH19SetKEp0hyKT_34W0M2yW7jq5km5XcciXDB8-vVAdGnbY4ahx6NeMSzPA5BiRMQTOAQ&oh=00_Af1d8eBNqNcWL8J3DMbrBZXxGCMmgioSqG8R3DijZOVL1g&oe=69DB3D7B',
    adtagName:   'C4 [Vídeo] [Hook: Naturalidade] [CTA: Agendar]',
    message:     '40 minutos de procedimento. Anestesia local. Sem repouso.\n\nO nariz que equilibra o seu rosto — sem exagero, sem artificial.\n\n👉 Agende sua avaliação.',
    headline:    '40 min. Sem repouso.',
    description: 'Harmonização que respeita a sua naturalidade.',
  },
  {
    videoId:     '819405767869769',
    thumbnail:   'https://scontent-gru2-1.xx.fbcdn.net/v/t15.5256-10/667683660_4398394210477434_4967342922200639766_n.jpg?stp=dst-jpg_p160x160_tt6&_nc_cat=109&ccb=1-7&_nc_sid=200999&_nc_ohc=Lk5pBcaWrlkQ7kNvwHQF_jb&_nc_oc=AdpqU8lgXYEsLxy6Lm79tWdF8K9CHg4-pvBCeYU3bdXys_E3Lg1PCo8RjvGCOvNo4rJUCC7k5cVJdJJkmGyU0h8A&_nc_zt=23&_nc_ht=scontent-gru2-1.xx&edm=APRAPSkEAAAA&_nc_gid=vmZj0z_oLOz7NRsjt0BCng&_nc_tpa=Q5bMBQG5AE4RVe7FxWhHLJDaHzWF2pJBZtgfAbjY9z0d3ZQybTW6HV3DTLQeHKdsTc7igE69BWy1G3eYHw&oh=00_Af3GRgZ5FFWGhUlnLA8uR45vJOJTI3DBoYoQxnXXo1Kabw&oe=69DB6627',
    adtagName:   'C5 [Vídeo] [Hook: Revelar Versão] [CTA: Agendar]',
    message:     'Você não quer mudar quem você é.\n\nVocê quer se reconhecer no espelho.\n\nAgende sua avaliação com Dr. Enio Leite em Serra, ES.',
    headline:    'Agende sua avaliação',
    description: 'Rinomodelação sem cirurgia. Dr. Enio Leite.',
  },
];

async function metaPost(endpoint, body) {
  const url = `${BASE_URL}/${endpoint}`;
  const params = new URLSearchParams({ access_token: ACCESS_TOKEN, ...body });
  const res = await fetch(url, { method: 'POST', body: params });
  const json = await res.json();
  if (json.error) {
    throw new Error(`[${endpoint}]: ${json.error.error_user_msg || json.error.message} (${json.error.code}/${json.error.error_subcode || '-'})`);
  }
  return json;
}

async function createAd(ad) {
  // Criativo
  const creative = await metaPost(`${AD_ACCOUNT_ID}/adcreatives`, {
    name: ad.adtagName,
    object_story_spec: JSON.stringify({
      page_id: PAGE_ID,
      video_data: {
        video_id: ad.videoId,
        image_url: ad.thumbnail,
        message: ad.message,
        title: ad.headline,
        link_description: ad.description,
        call_to_action: {
          type: 'LEARN_MORE',
          value: { link: LANDING_URL },
        },
      },
    }),
  });

  // Anúncio
  const result = await metaPost(`${AD_ACCOUNT_ID}/ads`, {
    name: ad.adtagName,
    adset_id: ADSET_ID,
    creative: JSON.stringify({ creative_id: creative.id }),
    status: 'PAUSED',
  });

  return { creativeId: creative.id, adId: result.id };
}

async function main() {
  console.log('Criando 5 anúncios — Dr. Enio Leite / Rinomodelação\n');

  const results = [];

  for (let i = 0; i < ADS.length; i++) {
    const ad = ADS[i];
    process.stdout.write(`  C${i + 1} ${ad.adtagName.split(']')[0].replace('[','')}] ... `);
    try {
      const r = await createAd(ad);
      console.log(`✓ Ad ID: ${r.adId}`);
      results.push({ ...ad, ...r, status: 'ok' });
    } catch (err) {
      console.log(`✗ ${err.message}`);
      results.push({ ...ad, status: 'error', error: err.message });
    }
  }

  console.log('\n========================================');
  const ok = results.filter(r => r.status === 'ok');
  const fail = results.filter(r => r.status === 'error');
  console.log(`  ${ok.length}/5 anúncios criados com sucesso`);
  if (fail.length) {
    console.log('  Falhas:');
    fail.forEach(f => console.log(`    - ${f.adtagName}: ${f.error}`));
  }
  console.log(`\n  Campanha ID : 6919144365725`);
  console.log(`  Conjunto ID : ${ADSET_ID}`);
  console.log(`  Status      : PAUSADA (revisar antes de ativar)`);
  console.log(`  Link        : https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=2405811993275286`);
  console.log('========================================\n');
}

main().catch(err => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
