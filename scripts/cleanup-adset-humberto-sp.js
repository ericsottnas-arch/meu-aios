/**
 * Limpar adset SP — deletar anúncios v1 e completar v2
 * Adset: 120248562899320460
 *
 * Deletar: 33 anúncios "SP |" e iniciais (form v1)
 * Criar:   14 anúncios "SP v2 |" restantes (form v2: 2476069096165870)
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_445142030338909';
const BASE       = 'https://graph.facebook.com/v21.0';
const ADSET_ID   = '120248562899320460';
const FORM_ID_V2 = '2476069096165870';

// Anúncios v1 a deletar (todos os "SP |" e os 2 iniciais sem prefixo)
const ADS_TO_DELETE = [
  '120248562918630460', '120248562919580460', // iniciais
  '120248562997610460', '120248562998200460', '120248562998910460',
  '120248562999660460', '120248563000450460', '120248563001240460',
  '120248563002460460', '120248563003210460', '120248563004160460',
  '120248563005550460', '120248563006760460', '120248563008060460',
  '120248563009310460', '120248563010700460', '120248563012130460',
  '120248563015900460', '120248563016940460', '120248563017790460',
  '120248563019140460', '120248563019850460', '120248563020790460',
  '120248563021260460', '120248563022620460', '120248563023590460',
  '120248563025430460', '120248563026290460', '120248563027060460',
  '120248563028320460', '120248563028950460', '120248563030320460',
  '120248563032150460',
];

// Criativos v2 restantes que ainda não têm anúncio (14 faltando)
const REMAINING_CREATIVES_V2 = [
  { id: '940210938639987',   name: 'Rinoplastia — C6' },
  { id: '821255913865786',   name: 'Rinoplastia — C4' },
  { id: '1284840466956723',  name: 'Blefaroplastia — Olhar cansado 2' },
  { id: '2137713890101918',  name: 'Blefaroplastia — Olhar cansado 3' },
  { id: '2014235686135992',  name: 'Blefaroplastia — Olhar cansado 4' },
  { id: '784739811168018',   name: 'Blefaroplastia — Olhar cansado 5' },
  { id: '1548044730660078',  name: 'Blefaroplastia — Olhar cansado 6' },
  { id: '2867739913557281',  name: 'Blefaroplastia — Olhar cansado 7' },
  { id: '1585766009186048',  name: 'Blefaroplastia — Cirurgião referência' },
  { id: '1289873713121525',  name: 'Blefaroplastia — Resultado natural' },
  { id: '1264607525817316',  name: 'Blefaroplastia — Especialista' },
  { id: '920504990806656',   name: 'Blefaroplastia — Olhar descansado' },
  { id: '1637000740876483',  name: 'Blefaroplastia — Antes e depois' },
  { id: '1201569195243856',  name: 'Blefaroplastia — Cirurgia SP' },
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function deleteAd(adId) {
  const r = await fetch(`${BASE}/${adId}`, {
    method: 'DELETE',
    body: new URLSearchParams({ access_token: TOKEN }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.success;
}

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`${j.error.error_user_msg || j.error.message} (code ${j.error.code})`);
  return j;
}

async function main() {
  console.log('==============================================');
  console.log('  CLEANUP + COMPLETAR ADSET SP');
  console.log(`  Deletar: ${ADS_TO_DELETE.length} anúncios v1`);
  console.log(`  Criar:   ${REMAINING_CREATIVES_V2.length} anúncios v2`);
  console.log('==============================================\n');

  // ── STEP 1: Deletar anúncios v1 ─────────────────────────────────────────
  console.log(`PASSO 1 — Deletando ${ADS_TO_DELETE.length} anúncios v1...`);
  let deleted = 0;

  for (const [i, adId] of ADS_TO_DELETE.entries()) {
    process.stdout.write(`  [${i+1}/${ADS_TO_DELETE.length}] ${adId}... `);
    try {
      await deleteAd(adId);
      console.log('✓');
      deleted++;
      if (i % 5 === 4) await sleep(1000); // pausa a cada 5 para não bater rate limit
    } catch(e) {
      console.log(`✗ ${e.message.substring(0, 60)}`);
    }
  }

  console.log(`\n  Deletados: ${deleted}/${ADS_TO_DELETE.length}`);

  // Aguardar antes de criar novos
  console.log('\n  Aguardando 5s antes de criar anúncios...');
  await sleep(5000);

  // ── STEP 2: Criar os 14 anúncios v2 restantes ───────────────────────────
  console.log(`\nPASSO 2 — Criando ${REMAINING_CREATIVES_V2.length} anúncios v2 restantes...`);
  let created = 0;

  for (const [i, crtv] of REMAINING_CREATIVES_V2.entries()) {
    process.stdout.write(`  [${i+1}/${REMAINING_CREATIVES_V2.length}] ${crtv.name.substring(0, 45)}... `);
    try {
      const res = await post(`${AD_ACCOUNT}/ads`, {
        name:             `SP v2 | ${crtv.name}`,
        adset_id:         ADSET_ID,
        creative:         JSON.stringify({ creative_id: crtv.id }),
        status:           'PAUSED',
        destination_type: 'ON_AD',
      });
      console.log(`✓ ${res.id}`);
      created++;
      if (i % 5 === 4) await sleep(1000);
    } catch(e) {
      console.log(`✗ ${e.message.substring(0, 80)}`);
    }
  }

  console.log('\n==============================================');
  console.log('  CONCLUÍDO');
  console.log('==============================================');
  console.log(`  Deletados: ${deleted}/33`);
  console.log(`  Criados:   ${created}/14`);
  console.log(`  Total v2 no adset: ${17 + created}/31`);
  console.log('\n  Adset PAUSADO — aguarda aprovação de budget (R$50/dia)');
  console.log('==============================================\n');
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message);
  process.exit(1);
});
