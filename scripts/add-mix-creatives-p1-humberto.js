/**
 * Adicionar criativos mix ao P1 — Camp 2 FRIO Leads
 *
 * P1 [Mulheres] [30-65] [FB+IG] [PP: LLK1%] é um conjunto mix.
 * Reutiliza os creatives já criados em P3 (Rinoplastia), P4 (Otoplastia), P5 (Lifting Facial)
 * — que já têm os formulários corretos vinculados — e cria novos ads no P1.
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_445142030338909';
const BASE       = 'https://graph.facebook.com/v21.0';
const PIXEL_ID   = '1354726053083764';
const CAMP2_ID   = '120248326623540460';

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
      const isLimit = j.error.code === 17 || j.error.code === 4 ||
        (j.error.message || '').toLowerCase().includes('limit');
      if (isLimit && i < retries - 1) {
        const wait = (i + 1) * 30000;
        console.log(`\n  ⏳ Rate limit — aguardando ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      throw new Error(`[GET] ${j.error.message}`);
    }
    return j;
  }
}

async function apiPost(endpoint, body, retries = 5) {
  for (let i = 0; i < retries; i++) {
    const r = await fetch(`${BASE}/${endpoint}`, {
      method: 'POST',
      body: new URLSearchParams({ access_token: TOKEN, ...body }),
    });
    const j = await r.json();
    if (j.error) {
      const isLimit = j.error.code === 17 || j.error.code === 4 ||
        (j.error.message || '').toLowerCase().includes('limit');
      if (isLimit && i < retries - 1) {
        const wait = (i + 1) * 30000;
        console.log(`\n  ⏳ Rate limit — aguardando ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      throw new Error(`[POST ${endpoint}] ${j.error.error_user_msg || j.error.message} (${j.error.code})`);
    }
    return j;
  }
}

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  Mix de Criativos → P1 | Camp 2 FRIO Leads');
  console.log('  Rinoplastia + Otoplastia + Lifting Facial');
  console.log('════════════════════════════════════════════════════════════\n');

  // ── 1. Buscar todos os adsets da campanha ─────────────────────────────────
  const { data: adsets } = await apiGet(`${CAMP2_ID}/adsets?fields=id,name&limit=50`);
  console.log(`${adsets.length} conjuntos encontrados:`);
  adsets.forEach(a => console.log(`  [${a.id}] ${a.name}`));

  const p1 = adsets.find(a => a.name.startsWith('P1 [Mulheres]'));
  const p3 = adsets.find(a => a.name.startsWith('P3 [Rinoplastia]'));
  const p4 = adsets.find(a => a.name.startsWith('P4 [Otoplastia]'));
  const p5 = adsets.find(a => a.name.startsWith('P5 [Lifting Facial]'));

  if (!p1 || !p3 || !p4 || !p5) {
    throw new Error(`Conjuntos não encontrados. P1=${p1?.id} P3=${p3?.id} P4=${p4?.id} P5=${p5?.id}`);
  }

  console.log(`\n✓ P1 (destino): ${p1.id}`);
  console.log(`✓ P3 Rinoplastia: ${p3.id}`);
  console.log(`✓ P4 Otoplastia:  ${p4.id}`);
  console.log(`✓ P5 Lifting:     ${p5.id}\n`);

  // ── 2. Buscar ads existentes no P1 (evitar duplicatas) ───────────────────
  await sleep(3000);
  const { data: p1Existing } = await apiGet(`${p1.id}/ads?fields=id,name&limit=100`);
  const p1Names = new Set(p1Existing.map(a => a.name));
  console.log(`P1 já possui ${p1Existing.length} ads.\n`);

  // ── 3. Para cada conjunto fonte, buscar ads e replicar no P1 ─────────────
  const sources = [
    { adset: p3, label: 'Rinoplastia' },
    { adset: p4, label: 'Otoplastia' },
    { adset: p5, label: 'Lifting Facial' },
  ];

  const results = { ok: [], skip: [], error: [] };

  for (const src of sources) {
    await sleep(5000);
    console.log(`── ${src.label} ──────────────────────────────────────────────`);

    const { data: srcAds } = await apiGet(
      `${src.adset.id}/ads?fields=id,name,creative{id}&limit=50`
    );
    console.log(`  ${srcAds.length} ads no conjunto fonte`);

    for (const srcAd of srcAds) {
      if (p1Names.has(srcAd.name)) {
        console.log(`  ⏭  Já existe: ${srcAd.name}`);
        results.skip.push(srcAd.name);
        continue;
      }

      process.stdout.write(`  Criando [${srcAd.name}] ... `);
      try {
        const newAd = await apiPost(`${AD_ACCOUNT}/ads`, {
          name: srcAd.name,
          adset_id: p1.id,
          creative: JSON.stringify({ creative_id: srcAd.creative.id }),
          status: 'ACTIVE',
          tracking_specs: JSON.stringify([
            { 'action.type': ['offsite_conversion'], fb_pixel: [PIXEL_ID] },
          ]),
          url_tags: UTM_TAGS,
        });

        console.log(`✅ ID: ${newAd.id}`);
        results.ok.push({ name: srcAd.name, adId: newAd.id, creativeId: srcAd.creative.id });
        p1Names.add(srcAd.name);
      } catch (e) {
        console.log(`❌ ${e.message}`);
        results.error.push({ name: srcAd.name, error: e.message });
      }
      await sleep(2000);
    }
  }

  // ── Relatório ─────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  RESULTADO FINAL');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`✅ Criados:  ${results.ok.length}`);
  console.log(`⏭  Pulados:  ${results.skip.length}`);
  console.log(`❌ Erros:    ${results.error.length}`);
  if (results.error.length) {
    results.error.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
  }
  if (results.ok.length) {
    console.log('\nAds criados:');
    results.ok.forEach(r => console.log(`  ${r.name} → Ad: ${r.adId}`));
  }
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message);
  process.exit(1);
});
