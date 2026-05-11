/**
 * Pixel + UTMs — Campanha 2 FRIO Leads (retry isolado)
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN    = process.env.META_ACCESS_TOKEN;
const BASE     = 'https://graph.facebook.com/v21.0';
const PIXEL_ID = '1354726053083764';
const CAMP2_ID = '120248326623540460';

const UTM_TAGS =
  'utm_source={{placement}}' +
  '&utm_medium=cpc' +
  '&utm_campaign={{campaign.name}}{{campaign.id}}' +
  '&utm_content={{adset.name}}{{adset.id}}' +
  '&utm_term={{ad.name}}_{{ad.id}}';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function apiGet(p, retries = 5) {
  const sep = p.includes('?') ? '&' : '?';
  for (let i = 0; i < retries; i++) {
    const r = await fetch(`${BASE}/${p}${sep}access_token=${TOKEN}`);
    const j = await r.json();
    if (j.error) {
      const isRateLimit = j.error.code === 17 || j.error.code === 4 || (j.error.message || '').toLowerCase().includes('limit');
      if (isRateLimit && i < retries - 1) {
        const wait = (i + 1) * 30000;
        console.log(`\n  ⏳ Rate limit — aguardando ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      throw new Error(`[GET ${p}] ${j.error.message}`);
    }
    return j;
  }
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

async function main() {
  console.log('Pixel + UTMs — Camp 2 FRIO Leads\n');

  const { data: adsets } = await apiGet(`${CAMP2_ID}/adsets?fields=id,name&limit=50`);
  console.log(`${adsets.length} conjuntos encontrados\n`);

  const results = { ok: [], error: [] };

  for (const adset of adsets) {
    await sleep(8000);
    const { data: ads } = await apiGet(`${adset.id}/ads?fields=id,name&limit=50`);
    console.log(`[${adset.name}] — ${ads.length} ads`);

    for (const ad of ads) {
      process.stdout.write(`  ${ad.name} ... `);
      try {
        await apiPost(ad.id, {
          tracking_specs: JSON.stringify([
            { 'action.type': ['offsite_conversion'], fb_pixel: [PIXEL_ID] },
          ]),
          url_tags: UTM_TAGS,
        });
        console.log('✅');
        results.ok.push(ad.name);
      } catch (e) {
        console.log(`❌ ${e.message}`);
        results.error.push({ name: ad.name, error: e.message });
      }
      await sleep(3000);
    }
  }

  console.log(`\n✅ OK: ${results.ok.length} | ❌ Erros: ${results.error.length}`);
  if (results.error.length) results.error.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
}

main().catch(err => { console.error('✗ Fatal:', err.message); process.exit(1); });
