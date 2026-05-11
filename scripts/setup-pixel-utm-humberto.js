/**
 * Habilitar Pixel + UTMs — Campanhas Ativas HR Andrade
 *
 * Campanhas:
 *   Camp 1 — Video Views  (adsets hardcoded — criados por create-ads-camp1-humberto.js)
 *   Camp 2 — FRIO Leads   (adsets buscados via API — campaign 120248326623540460)
 *
 * Para cada ad:
 *   - tracking_specs: pixel de conversão / lead
 *   - url_tags: UTMs dinâmicas Meta
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_445142030338909';
const BASE       = 'https://graph.facebook.com/v21.0';
const PIXEL_ID   = '1354726053083764';

const UTM_TAGS =
  'utm_source={{placement}}' +
  '&utm_medium=cpc' +
  '&utm_campaign={{campaign.name}}{{campaign.id}}' +
  '&utm_content={{adset.name}}{{adset.id}}' +
  '&utm_term={{ad.name}}_{{ad.id}}';

// Adsets Campaign 1 — Video Views (fixos)
const CAMP1_ADSET_IDS = [
  '120248466251330460', // Blefaroplastia
  '120248466251610460', // Rinoplastia
  '120248466252030460', // Otoplastia
  '120248466252410460', // Lifting Facial
];

// Campaign 2 — FRIO Leads (busca adsets via API)
const CAMP2_ID = '120248326623540460';

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function apiGet(path) {
  const sep = path.includes('?') ? '&' : '?';
  const r = await fetch(`${BASE}/${path}${sep}access_token=${TOKEN}`);
  const j = await r.json();
  if (j.error) throw new Error(`[GET ${path}] ${j.error.message}`);
  return j;
}

async function apiPost(id, body) {
  const r = await fetch(`${BASE}/${id}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST ${id}] ${j.error.error_user_msg || j.error.message} (${j.error.code})`);
  return j;
}

async function getAdsFromAdset(adsetId) {
  const r = await apiGet(`${adsetId}/ads?fields=id,name,status&limit=50`);
  return r.data || [];
}

async function getAdsetsFromCampaign(campaignId) {
  const r = await apiGet(`${campaignId}/adsets?fields=id,name&limit=50`);
  return r.data || [];
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function updateAd(ad, pixelTrackingType) {
  const trackingSpecs = JSON.stringify([
    { 'action.type': [pixelTrackingType], fb_pixel: [PIXEL_ID] },
  ]);

  return apiPost(ad.id, {
    tracking_specs: trackingSpecs,
    url_tags: UTM_TAGS,
  });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  Pixel + UTMs — HR Andrade Instituto');
  console.log(`  Pixel: ${PIXEL_ID}`);
  console.log('════════════════════════════════════════════════════════════\n');

  const results = { ok: [], error: [] };

  // ── Campanha 1 — Video Views ──────────────────────────────────────────────
  console.log('── Campanha 1: Video Views ──────────────────────────────────');
  for (const adsetId of CAMP1_ADSET_IDS) {
    const ads = await getAdsFromAdset(adsetId);
    console.log(`  AdSet ${adsetId}: ${ads.length} ads`);

    for (const ad of ads) {
      process.stdout.write(`    [${ad.name}] ... `);
      try {
        await updateAd(ad, 'video_view');
        console.log('✅');
        results.ok.push({ camp: 1, adId: ad.id, name: ad.name });
      } catch (e) {
        console.log(`❌ ${e.message}`);
        results.error.push({ camp: 1, adId: ad.id, name: ad.name, error: e.message });
      }
    }
  }

  // ── Campanha 2 — FRIO Leads ───────────────────────────────────────────────
  console.log('\n── Campanha 2: FRIO Leads ───────────────────────────────────');
  const camp2Adsets = await getAdsetsFromCampaign(CAMP2_ID);
  console.log(`  ${camp2Adsets.length} conjuntos encontrados`);

  for (const adset of camp2Adsets) {
    await sleep(3000); // respeita rate limit
    const ads = await getAdsFromAdset(adset.id);
    console.log(`  AdSet [${adset.name}]: ${ads.length} ads`);

    for (const ad of ads) {
      process.stdout.write(`    [${ad.name}] ... `);
      try {
        await updateAd(ad, 'offsite_conversion'); // lead gen usa offsite_conversion
        console.log('✅');
        results.ok.push({ camp: 2, adId: ad.id, name: ad.name });
      } catch (e) {
        console.log(`❌ ${e.message}`);
        results.error.push({ camp: 2, adId: ad.id, name: ad.name, error: e.message });
      }
      await sleep(1000);
    }
  }

  // ── Relatório ─────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  RESULTADO');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`✅ Atualizados: ${results.ok.length}`);
  console.log(`❌ Erros:       ${results.error.length}`);
  if (results.error.length) {
    results.error.forEach(e => console.log(`  - [Camp ${e.camp}] ${e.name}: ${e.error}`));
  }
  console.log('\nUTM aplicada:');
  console.log(`  ${UTM_TAGS}`);
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message);
  process.exit(1);
});
