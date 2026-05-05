/**
 * Recria campanhas LP Dr. Cleugo do zero
 *
 * Combinação correta para LP com pixel:
 * - Campaign: OUTCOME_LEADS + LOWEST_COST_WITHOUT_CAP
 * - Ad set: OFFSITE_CONVERSIONS + promoted_object {pixel_id, custom_event_type: 'LEAD'}
 * - Creative: LP URL (LEARN_MORE)
 */

const https = require('https');

const META_TOKEN = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_944253477334195';
const PIXEL_ID   = '1030009936870928';
const LP_URL     = 'https://drcleugo.syradigital.com/';

const CAMPANHAS = [
  {
    nome: '[Syra] Celulite Dream Incision [Formulário Instantâneo] [CBO] [LP]',
    origId: '120240877361730701',
    velhaLpId: '120241227650900701', // campanha LP com config errada
    budget: 1500, // R$15/dia em centavos
  },
  {
    nome: '[Syra] Dream Incision Retargeting [Formulário Instantâneo] [MORNO] [CBO] [LP]',
    origId: '120240877440890701',
    velhaLpId: '120241227672910701',
    budget: 1000, // R$10/dia em centavos
  },
];

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const isGet   = method === 'GET';
    const bodyStr = (!isGet && body) ? JSON.stringify(body) : null;
    const fullPath = `/v19.0${path}${isGet && body ? '?' + new URLSearchParams(body).toString() : ''}`;
    const req = https.request({
      hostname: 'graph.facebook.com',
      path: fullPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${META_TOKEN}`,
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

async function safeApi(method, path, body, retries = 4) {
  for (let i = 0; i < retries; i++) {
    const r = await api(method, path, body);
    if (!r) { await sleep((i+1)*40000); continue; }
    if (r.status === 200) return r;
    if (r.body?.error?.code === 17 || r.body?.error?.is_transient) {
      console.log(`    ⏳ Rate limit, aguardando ${(i+1)*40}s...`);
      await sleep((i+1)*40000);
      continue;
    }
    return r;
  }
  return { status: 0, body: { error: 'max_retries' } };
}

async function createLPCreative(spec) {
  const newSpec = JSON.parse(JSON.stringify(spec));
  if (newSpec.video_data?.call_to_action) {
    newSpec.video_data.call_to_action = { type: 'LEARN_MORE', value: { link: LP_URL } };
    delete newSpec.video_data.link_description;
    delete newSpec.video_data.image_url;
  }
  if (newSpec.link_data) {
    newSpec.link_data.link = LP_URL;
    newSpec.link_data.call_to_action = { type: 'LEARN_MORE', value: { link: LP_URL } };
    delete newSpec.link_data.lead_gen_form_id;
  }
  const r = await safeApi('POST', `/${AD_ACCOUNT}/adcreatives?access_token=${META_TOKEN}`, {
    object_story_spec: newSpec,
    url_tags: 'utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{adset.name}}&utm_term={{ad.name}}',
  });
  if (r.status === 200) return r.body.id;
  console.log(`      ✗ Creative: ${JSON.stringify(r.body).slice(0,200)}`);
  return null;
}

async function main() {
  console.log('🔧 Recriação LP Campaigns — Dr. Cleugo\n');
  console.log('Configuração: OUTCOME_LEADS + OFFSITE_CONVERSIONS + pixel LEAD\n');

  for (const camp of CAMPANHAS) {
    console.log(`\n━━━ ${camp.nome} ━━━`);

    // 1. Deletar campanha LP antiga (com configuração errada)
    console.log(`  1. Deletando campanha antiga ${camp.velhaLpId}...`);
    const delRes = await safeApi('DELETE', `/${camp.velhaLpId}?access_token=${META_TOKEN}`);
    if (delRes.body?.success) {
      console.log('     ✓ Deletada');
    } else {
      console.log(`     ⚠ ${JSON.stringify(delRes.body).slice(0,100)}`);
    }
    await sleep(2000);

    // 2. Criar nova campanha
    console.log('  2. Criando nova campanha LP...');
    const newCampRes = await safeApi('POST', `/${AD_ACCOUNT}/campaigns?access_token=${META_TOKEN}`, {
      name: camp.nome,
      objective: 'OUTCOME_LEADS',
      special_ad_categories: [],
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      status: 'PAUSED',
      daily_budget: camp.budget,
    });
    if (newCampRes.status !== 200 || !newCampRes.body?.id) {
      console.error(`  ✗ Falha criar campanha: ${JSON.stringify(newCampRes.body).slice(0,200)}`);
      continue;
    }
    const newCampId = newCampRes.body.id;
    console.log(`     ✓ Campanha criada: ${newCampId}`);
    await sleep(2000);

    // 3. Buscar ad sets originais
    console.log('  3. Buscando ad sets originais...');
    const origAdsetsRes = await safeApi('GET', `/${camp.origId}/adsets?fields=id,name,targeting,billing_event&limit=20&access_token=${META_TOKEN}`);
    const origAdsets = origAdsetsRes.body?.data || [];
    console.log(`     → ${origAdsets.length} ad set(s)\n`);

    for (const origAdset of origAdsets) {
      console.log(`  Ad set: ${origAdset.name}`);
      await sleep(1000);

      // Garantir targeting_automation presente
      const targeting = origAdset.targeting || {};
      if (!targeting.targeting_automation) {
        targeting.targeting_automation = { advantage_audience: 0 };
      }

      // 4. Criar novo ad set: OFFSITE_CONVERSIONS + pixel
      const newAsRes = await safeApi('POST', `/${AD_ACCOUNT}/adsets?access_token=${META_TOKEN}`, {
        campaign_id: newCampId,
        name: origAdset.name,
        targeting,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'OFFSITE_CONVERSIONS',
        promoted_object: { pixel_id: PIXEL_ID, custom_event_type: 'LEAD' },
        status: 'PAUSED',
      });

      if (newAsRes.status !== 200 || !newAsRes.body?.id) {
        console.error(`    ✗ Falha ad set: ${JSON.stringify(newAsRes.body).slice(0,300)}`);
        continue;
      }
      const newAsId = newAsRes.body.id;
      console.log(`    ✓ Ad set criado: ${newAsId}`);
      await sleep(1000);

      // 5. Buscar ads originais com creative spec
      const adsRes = await safeApi('GET', `/${origAdset.id}/ads?fields=id,name,creative{id,object_story_spec}&limit=50&access_token=${META_TOKEN}`);
      const ads = adsRes.body?.data || [];
      console.log(`    → ${ads.length} ad(s)`);

      for (const ad of ads) {
        const spec = ad.creative?.object_story_spec;
        if (!spec) { console.log(`      ⚠ ${ad.name}: sem spec`); continue; }

        await sleep(800);
        const creativeId = await createLPCreative(spec);
        if (!creativeId) continue;

        await sleep(500);
        const newAdRes = await safeApi('POST', `/${AD_ACCOUNT}/ads?access_token=${META_TOKEN}`, {
          name: ad.name,
          adset_id: newAsId,
          creative: { creative_id: creativeId },
          status: 'PAUSED',
        });

        if (newAdRes.status === 200) {
          console.log(`      ✓ ${ad.name}`);
        } else {
          console.log(`      ✗ ${ad.name}: ${JSON.stringify(newAdRes.body).slice(0,150)}`);
        }
        await sleep(800);
      }
    }

    console.log(`\n  ✅ ${camp.nome} — Campanha LP ID: ${newCampId}`);
    await sleep(5000);
  }

  console.log('\n\n🎯 CONCLUÍDO');
  console.log(`  → https://business.facebook.com/adsmanager/manage/campaigns?act=${AD_ACCOUNT.replace('act_','')}`);
  console.log('\nPróximos passos:');
  console.log('  1. Verificar no Ads Manager os criativos → LP');
  console.log('  2. Confirmar pixel LEAD no ad set (OFFSITE_CONVERSIONS)');
  console.log('  3. Ativar quando pronto');
}

main().catch(console.error);
