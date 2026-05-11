/**
 * Fix: Criar criativos SP + anúncios no adset já criado
 * Adset ID: 120248562899320460
 * Form SP ID: 1454665208911055
 *
 * Correção: ao clonar object_story_spec, remover image_url quando image_hash presente.
 * (Meta não aceita ambos simultâneamente na criação)
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_445142030338909';
const BASE       = 'https://graph.facebook.com/v21.0';

const ADSET_ID = '120248562899320460';
const FORM_ID  = '1454665208911055';

// Todos os criativos — excluir os 2 que já foram criados com sucesso
const CREATIVE_IDS = [
  { id: '1440821967733270', name: 'Lifting Facial — C1' },
  { id: '1306094531497499', name: 'Lifting Facial — C4' },
  { id: '1293308366067916', name: 'Lifting Facial — C3' },
  { id: '873637939027747',  name: 'Lifting Facial — C2' },
  { id: '1004098572159630', name: 'Otoplastia — C1' },
  { id: '1520765809654240', name: 'Otoplastia — C2' },
  { id: '1218284676884798', name: 'Otoplastia — C3' },
  { id: '841537118966151',  name: 'Rinoplastia — C10' },
  { id: '1285239413051941', name: 'Rinoplastia — C7' },
  { id: '1608183456963583', name: 'Rinoplastia — C8' },
  { id: '1698037851365667', name: 'Rinoplastia — C3' },
  { id: '4313870905542602', name: 'Rinoplastia — C9' },
  { id: '1281918407220568', name: 'Rinoplastia — C5' },
  { id: '1307539947950730', name: 'Rinoplastia — C2' },
  { id: '850749904703151',  name: 'Rinoplastia — C1' },
  { id: '1840212153318494', name: 'Rinoplastia — C6' },
  { id: '1274041224703591', name: 'Rinoplastia — C4' },
  // Blefaroplastia — Olhar cansado 1 e Pálpebra caída já foram criados
  { id: '4293491997539289', name: 'Blefaroplastia — Olhar cansado 2' },
  { id: '909605451912944',  name: 'Blefaroplastia — Olhar cansado 3' },
  { id: '1285141676923833', name: 'Blefaroplastia — Olhar cansado 4' },
  { id: '1692713381886079', name: 'Blefaroplastia — Olhar cansado 5' },
  { id: '1477192980817855', name: 'Blefaroplastia — Olhar cansado 6' },
  { id: '1607027297254613', name: 'Blefaroplastia — Olhar cansado 7' },
  { id: '1491391932577104', name: 'Blefaroplastia — Cirurgião referência' },
  { id: '1859020158137904', name: 'Blefaroplastia — Resultado natural' },
  { id: '1600305092104141', name: 'Blefaroplastia — Especialista' },
  { id: '1289950903088270', name: 'Blefaroplastia — Olhar descansado' },
  { id: '1985190058755646', name: 'Blefaroplastia — Antes e depois' },
  { id: '1295923689170334', name: 'Blefaroplastia — Cirurgia SP' },
];

// Criativos já criados com sucesso — apenas criar anúncios para estes
const ALREADY_CREATED = [
  { id: '3932388770403494', name: 'Blefaroplastia — Olhar cansado 1' },
  { id: '26324232580569485', name: 'Blefaroplastia — Pálpebra caída' },
];

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST ${endpoint}] ${j.error.error_user_msg || j.error.message} (code ${j.error.code})`);
  return j;
}

function cleanSpec(spec) {
  // Remover image_url quando image_hash presente (Meta não aceita ambos)
  if (spec.video_data) {
    if (spec.video_data.image_hash && spec.video_data.image_url) {
      delete spec.video_data.image_url;
    }
  }
  if (spec.link_data) {
    if (spec.link_data.image_hash && spec.link_data.image_url) {
      delete spec.link_data.image_url;
    }
  }
  return spec;
}

function updateFormId(spec, formId) {
  if (spec.video_data?.call_to_action?.value) {
    spec.video_data.call_to_action.value.lead_gen_form_id = formId;
  }
  if (spec.link_data?.call_to_action?.value) {
    spec.link_data.call_to_action.value.lead_gen_form_id = formId;
  }
  return spec;
}

async function createAd(creativeId, name) {
  const res = await post(`${AD_ACCOUNT}/ads`, {
    name:             `SP | ${name}`,
    adset_id:         ADSET_ID,
    creative:         JSON.stringify({ creative_id: creativeId }),
    status:           'PAUSED',
    destination_type: 'ON_AD',
  });
  return res.id;
}

async function main() {
  console.log('==============================================');
  console.log('  FIX: Criativos SP + Anúncios');
  console.log(`  Adset: ${ADSET_ID}`);
  console.log(`  Form SP: ${FORM_ID}`);
  console.log('==============================================\n');

  const newCreatives = [...ALREADY_CREATED];

  // ── Criar criativos restantes ───────────────────────────────────────────
  console.log(`Criando ${CREATIVE_IDS.length} criativos pendentes...`);

  for (const [i, crtv] of CREATIVE_IDS.entries()) {
    process.stdout.write(`  [${i+1}/${CREATIVE_IDS.length}] ${crtv.name.substring(0, 45)}... `);
    try {
      const specRes = await fetch(
        `${BASE}/${crtv.id}?fields=object_story_spec&access_token=${TOKEN}`
      ).then(r => r.json());

      if (specRes.error) { console.log(`✗ ${specRes.error.message.substring(0,60)}`); continue; }

      let spec = specRes.object_story_spec;
      if (!spec) { console.log('✗ sem spec'); continue; }

      spec = cleanSpec(spec);
      spec = updateFormId(spec, FORM_ID);

      const res = await post(`${AD_ACCOUNT}/adcreatives`, {
        name:              `SP | ${crtv.name}`,
        object_story_spec: JSON.stringify(spec),
      });

      console.log(`✓ ${res.id}`);
      newCreatives.push({ id: res.id, name: crtv.name });
    } catch(e) {
      console.log(`✗ ${e.message.substring(0, 80)}`);
    }
  }

  // ── Criar anúncios ──────────────────────────────────────────────────────
  console.log(`\nCriando ${newCreatives.length} anúncios no adset SP...`);
  let adCount = 0;

  for (const [i, crtv] of newCreatives.entries()) {
    process.stdout.write(`  [${i+1}/${newCreatives.length}] ${crtv.name.substring(0, 45)}... `);
    try {
      const adId = await createAd(crtv.id, crtv.name);
      console.log(`✓ ${adId}`);
      adCount++;
    } catch(e) {
      // Se anúncio já existe para os 2 primeiros, ignorar
      if (e.message.includes('duplicat') || e.message.includes('already')) {
        console.log('(já existe, ok)');
        adCount++;
      } else {
        console.log(`✗ ${e.message.substring(0, 80)}`);
      }
    }
  }

  console.log('\n==============================================');
  console.log('  CONCLUÍDO');
  console.log('==============================================');
  console.log(`  Criativos novos: ${newCreatives.length - ALREADY_CREATED.length}`);
  console.log(`  Total criativos: ${newCreatives.length}/31`);
  console.log(`  Anúncios criados: ${adCount}/${newCreatives.length}`);
  console.log(`\n  Adset: ${ADSET_ID}`);
  console.log(`  Budget: R$50/dia (PAUSADO)`);
  console.log('\n  ⚠️  Aprovar budget e ativar no Gerenciador.');
  console.log('==============================================\n');
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message);
  process.exit(1);
});
