/**
 * Cria conjunto Blefaroplastia João Pessoa
 * Base: P2 [Blefaroplastia] [Mulheres] [35-65+] [FB+IG] [Int: Viajante/Compradores]
 * Campanha: [Syra] Procedimento Publico Frio [Formulário Instantâneo] [ABO] (120248326623540460)
 * Formulário novo: [Syra] Dr. Humberto — Blefaroplastia João Pessoa (1424717323002870)
 */

const https = require('https');
require('dotenv').config({ path: 'meu-projeto/.env' });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_445142030338909'; // Humberto Andrade - Goiânia
const PAGE_ID    = '104425248310435';     // Dr. Humberto Andrade
const CAMP_ID    = '120248326623540460';  // [Syra] Procedimento Publico Frio [ABO]
const FORM_ID    = '1424717323002870';    // [Syra] Dr. Humberto — Blefaroplastia João Pessoa

// Criativos do P2 a replicar com o novo form
const CREATIVES_P2 = [
  { name: 'C4 [Vídeo] [Hook: Médica Especialista v2]', video_id: '861720983632727',  image_hash: '7ee3d2dfbaff551034459638bdae158d' },
  { name: 'C2 [Vídeo] [Hook: Depoimento de Paciente]',  video_id: '1962514671032056', image_hash: 'ae4d3387e2554e825fd6e231d3be204c' },
  { name: 'C1 [Vídeo] [Hook: Blefaroplastia]',          video_id: '894228150333819',  image_hash: '65ac96a9e6c6dc8bc186c1b5288c2818' },
  { name: 'C3 [Vídeo] [Hook: Médica Especialista v1]',  video_id: '1637698074117796', image_hash: 'd820721e442448fb84e08e9686962bf1' },
  { name: 'C5 [Vídeo] [Hook: Olhar Renovado]',          video_id: '1254466926392446', image_hash: 'a5fe4653f576f2899a1fd940faf2ba27' },
  { name: 'C6 [Vídeo] [Hook: Transformação]',           video_id: '1627791858262604', image_hash: 'c32e4e3c7547ca869878b3d4fcb17e1e' },
  { name: 'C7 [Estático] [Hook: Qualidade de Vida]',    video_id: null,               image_hash: 'af8cd551dfb61ae09218174a0dfa546e' },
];

const COPY = {
  title:            'Olhar cansado tem correção',
  message:          'Pálpebra caída deixa qualquer olhar pesado.\nNão importa quanto você dormiu.\n\nA blefaroplastia corrige isso.\nResultado natural. Sem mudar quem você é.\n\n👇Preencha o formulário abaixo.👇',
  link_description: 'Resultado natural. Veja como.',
};

function httpsReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'graph.facebook.com',
      path: '/v21.0' + path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('━━━ Conjunto Blefaroplastia João Pessoa ━━━\n');

  // 1. Criar novo ad set
  console.log('1. Criando ad set João Pessoa...');
  const asRes = await httpsReq('POST', '/' + AD_ACCOUNT + '/adsets?access_token=' + TOKEN, {
    campaign_id:      CAMP_ID,
    name:             'P8 [Blefaroplastia] [Mulheres] [35-65+] [FB+IG] [Int: Viajante/Compradores] [João Pessoa]',
    optimization_goal: 'LEAD_GENERATION',
    billing_event:    'IMPRESSIONS',
    daily_budget:     3200, // R$32/dia
    status:           'PAUSED',
    promoted_object:  { page_id: PAGE_ID, smart_pse_enabled: false },
    targeting: {
      age_min: 35,
      age_max: 65,
      genders: [2], // mulheres
      geo_locations: {
        cities: [{
          country: 'BR',
          distance_unit: 'kilometer',
          key: '256863',
          name: 'João Pessoa',
          radius: 30,
          region: 'Paraíba',
          region_id: '451',
        }],
        location_types: ['home', 'recent'],
      },
      flexible_spec: [{
        interests: [{ id: '6003761051678', name: 'Colágeno (ciência)' }],
        behaviors: [
          { id: '6002714895372', name: 'Frequent Travelers' },
          { id: '6022788483583', name: 'Frequent international travelers' },
          { id: '6046096201583', name: 'People who prefer high-value goods in Brazil' },
          { id: '6071631541183', name: 'Engaged Shoppers' },
        ],
      }],
      publisher_platforms: ['facebook', 'instagram'],
      facebook_positions:  ['feed', 'facebook_reels', 'facebook_reels_overlay', 'notification', 'instream_video', 'story', 'search'],
      instagram_positions: ['stream', 'ig_search', 'story', 'explore', 'reels', 'explore_home'],
      device_platforms:    ['mobile', 'desktop'],
      brand_safety_content_filter_levels: ['FACEBOOK_RELAXED'],
      targeting_relaxation_types: { lookalike: 0, custom_audience: 0 },
      targeting_automation: { advantage_audience: 0 },
    },
  });

  if (asRes.status !== 200 || !asRes.body?.id) {
    console.error('✗ Falha criar ad set:', JSON.stringify(asRes.body).slice(0, 300));
    process.exit(1);
  }

  const newAsId = asRes.body.id;
  console.log('  ✓ Ad set criado: ' + newAsId);
  await sleep(2000);

  // 2. Criar criativos + ads
  console.log('\n2. Criando criativos e anúncios...');
  let ok = 0;

  for (const c of CREATIVES_P2) {
    await sleep(800);

    let object_story_spec;

    if (c.video_id) {
      // Criativo de vídeo
      object_story_spec = {
        page_id: PAGE_ID,
        video_data: {
          video_id:         c.video_id,
          image_hash:       c.image_hash,
          title:            COPY.title,
          message:          COPY.message,
          link_description: COPY.link_description,
          call_to_action: {
            type:  'LEARN_MORE',
            value: { lead_gen_form_id: FORM_ID },
          },
        },
      };
    } else {
      // Criativo estático
      object_story_spec = {
        page_id: PAGE_ID,
        link_data: {
          image_hash:       c.image_hash,
          link:             'https://www.humbertoandrade.com.br/',
          name:             COPY.title,
          message:          COPY.message,
          description:      COPY.link_description,
          call_to_action: {
            type:  'LEARN_MORE',
            value: { lead_gen_form_id: FORM_ID },
          },
        },
      };
    }

    // Criar creative
    const crRes = await httpsReq('POST', '/' + AD_ACCOUNT + '/adcreatives?access_token=' + TOKEN, {
      object_story_spec,
    });

    if (crRes.status !== 200 || !crRes.body?.id) {
      console.log('  ✗ Creative ' + c.name + ': ' + JSON.stringify(crRes.body).slice(0, 200));
      continue;
    }

    await sleep(500);

    // Criar ad
    const adRes = await httpsReq('POST', '/' + AD_ACCOUNT + '/ads?access_token=' + TOKEN, {
      name:      c.name,
      adset_id:  newAsId,
      creative:  { creative_id: crRes.body.id },
      status:    'PAUSED',
    });

    if (adRes.status === 200) {
      console.log('  ✓ ' + c.name);
      ok++;
    } else {
      console.log('  ✗ ' + c.name + ': ' + JSON.stringify(adRes.body).slice(0, 150));
    }
  }

  console.log('\n━━━ CONCLUÍDO ━━━');
  console.log('Ad set: ' + newAsId);
  console.log('Formulário: ' + FORM_ID);
  console.log('Anúncios criados: ' + ok + '/' + CREATIVES_P2.length);
  console.log('Status: PAUSADO (ativar quando confirmar atendimento em JP)\n');
}

main().catch(console.error);
