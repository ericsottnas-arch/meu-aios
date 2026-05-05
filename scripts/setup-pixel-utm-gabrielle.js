#!/usr/bin/env node
/**
 * Habilitar Pixel Lead + UTMs — Dra. Gabrielle Oliveira
 *
 * Para cada ad ativo nas campanhas da Gabrielle:
 *   - tracking_specs: dispara pixel Lead a cada formulário preenchido
 *   - url_tags: UTMs dinâmicas do Meta ({{placement}}, {{campaign.id}}, etc.)
 */
const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN    = process.env.META_ACCESS_TOKEN;
const BASE     = 'https://graph.facebook.com/v21.0';
const PIXEL_ID = '593016887085693'; // WHATSAPP - GABRIELLE OLIVEIRA
const ACCOUNT  = 'act_1136892320236480';

const UTM_TAGS =
  'utm_source={{placement}}' +
  '&utm_medium=cpc' +
  '&utm_campaign={{campaign.name}}_{{campaign.id}}' +
  '&utm_content={{adset.name}}_{{adset.id}}' +
  '&utm_term={{ad.name}}_{{ad.id}}';

// Campanhas ativas
const ACTIVE_CAMPAIGNS = [
  '120243183154170249', // [Syra] Emagrecimento Publico Frio [ABO]
  '120245734861770249', // [Syra] Emagrecimento Retargeting Morno [CBO]
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function apiGet(ep) {
  const sep = ep.includes('?') ? '&' : '?';
  const r = await fetch(`${BASE}/${ep}${sep}access_token=${TOKEN}`);
  const j = await r.json();
  if (j.error) throw new Error(`[GET] ${j.error.message} (code ${j.error.code})`);
  return j;
}

async function apiPost(id, body) {
  const r = await fetch(`${BASE}/${id}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST ${id}] ${j.error.error_user_msg || j.error.message}`);
  return j;
}

async function updateAd(ad) {
  const trackingSpecs = JSON.stringify([
    { 'action.type': ['lead'], fb_pixel: [PIXEL_ID] },
  ]);
  return apiPost(ad.id, {
    tracking_specs: trackingSpecs,
    url_tags: UTM_TAGS,
  });
}

async function main() {
  console.log('=== Pixel Lead + UTMs — Dra. Gabrielle ===\n');
  console.log(`Pixel: ${PIXEL_ID}`);
  console.log(`UTM Tags: ${UTM_TAGS}\n`);

  let totalAds = 0, totalOk = 0, totalErr = 0;

  for (const campId of ACTIVE_CAMPAIGNS) {
    // Buscar adsets
    const adsets = await apiGet(`${campId}/adsets?fields=id,name,status&limit=50`);
    await sleep(400);

    for (const adset of adsets.data || []) {
      if (adset.status !== 'ACTIVE') {
        process.stderr.write(`  ⏸ Adset pausado: ${adset.name}\n`);
        continue;
      }

      console.log(`\n[Adset] ${adset.name}`);

      // Buscar ads do adset
      const ads = await apiGet(`${adset.id}/ads?fields=id,name,status&limit=50`);
      await sleep(400);

      for (const ad of ads.data || []) {
        if (ad.status !== 'ACTIVE') {
          process.stderr.write(`    ⏸ Ad pausado: ${ad.name}\n`);
          continue;
        }

        totalAds++;
        process.stdout.write(`  → ${ad.name.substring(0, 60)}... `);

        try {
          await updateAd(ad);
          console.log('✓');
          totalOk++;
        } catch (e) {
          console.log(`✗ ${e.message}`);
          totalErr++;
        }

        await sleep(500);
      }
    }
  }

  console.log('\n=== RESULTADO ===');
  console.log(`Ads processados: ${totalAds}`);
  console.log(`✓ Sucesso: ${totalOk}`);
  console.log(`✗ Erro:    ${totalErr}`);
  console.log('\nA partir do próximo lead: evento Lead dispara no pixel + UTMs gravados nos contatos GHL.');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
