/**
 * Duplica campanhas Formulário → Landing Page Dr. Cleugo
 * Estratégia: cria campanhas novas + copia ad sets individuais
 *
 * FRIO:  120240877361730701  → LP R$15/dia
 * MORNO: 120240877440890701  → LP R$10/dia
 * LP: https://drcleugo.syradigital.com/
 */

const https = require('https');

const META_TOKEN = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_944253477334195';
const PIXEL_ID   = '1030009936870928';
const LP_URL     = 'https://drcleugo.syradigital.com/';
const PAGE_ID    = '275505112301938';

const CAMPANHAS = [
  {
    id: '120240877361730701',
    nome: '[Syra] Celulite Dream Incision [Formulário Instantâneo] [CBO] [LP]',
    budget: 1500, // R$15/dia em centavos
  },
  {
    id: '120240877440890701',
    nome: '[Syra] Dream Incision Retargeting [Formulário Instantâneo] [MORNO] [CBO] [LP]',
    budget: 1000, // R$10/dia em centavos
  },
];

// ── HTTP helper ────────────────────────────────────────────────────────────────
function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const isGet    = method === 'GET';
    const bodyStr  = (!isGet && body) ? JSON.stringify(body) : null;
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
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Duplicação Formulário → LP\n');

  for (const camp of CAMPANHAS) {
    console.log(`\n━━━ ${camp.nome} ━━━`);

    // 1. Buscar detalhes da campanha original
    const origRes = await api('GET', `/${camp.id}?fields=name,objective,special_ad_categories,bid_strategy&access_token=${META_TOKEN}`);
    const orig = origRes.body;
    console.log(`  Original: ${orig.name}`);

    // 2. Criar nova campanha
    console.log('  → Criando nova campanha...');
    const newCampRes = await api('POST', `/${AD_ACCOUNT}/campaigns?access_token=${META_TOKEN}`, {
      name: camp.nome,
      objective: orig.objective,
      special_ad_categories: orig.special_ad_categories || [],
      bid_strategy: orig.bid_strategy || 'LOWEST_COST_WITHOUT_CAP',
      status: 'PAUSED',
      daily_budget: camp.budget,
    });

    if (newCampRes.status !== 200 || !newCampRes.body.id) {
      console.error('  ✗ Falha criar campanha:', JSON.stringify(newCampRes.body).slice(0,300));
      continue;
    }

    const newCampId = newCampRes.body.id;
    console.log(`  ✓ Campanha criada: ${newCampId}`);

    // 3. Buscar ad sets originais
    const adsetsRes = await api('GET', `/${camp.id}/adsets?fields=id,name,status,targeting,optimization_goal,billing_event,bid_amount,start_time,end_time&limit=50&access_token=${META_TOKEN}`);
    const adsets = adsetsRes.body.data || [];
    console.log(`  → ${adsets.length} ad set(s) para copiar`);

    for (const adset of adsets) {
      console.log(`\n    Copiando ad set: ${adset.name}`);

      // 4. Copiar ad set individualmente (sem deep_copy)
      const copyAdsetRes = await api('POST', `/${adset.id}/copies?access_token=${META_TOKEN}`, {
        campaign_id: newCampId,
        status_option: 'PAUSED',
        deep_copy: false,
      });

      if (copyAdsetRes.status !== 200 || !copyAdsetRes.body.copied_adset_id) {
        console.error(`    ✗ Falha copiar ad set: ${JSON.stringify(copyAdsetRes.body).slice(0,300)}`);
        continue;
      }

      const newAdsetId = copyAdsetRes.body.copied_adset_id;
      console.log(`    ✓ Ad set copiado: ${newAdsetId}`);

      // 5. Atualizar ad set: pixel + optimization_goal
      await sleep(500);
      const updateAdsetRes = await api('POST', `/${newAdsetId}?access_token=${META_TOKEN}`, {
        promoted_object: {
          pixel_id: PIXEL_ID,
          custom_event_type: 'LEAD',
          page_id: PAGE_ID,
        },
        optimization_goal: 'LEAD_GENERATION',
      });
      if (updateAdsetRes.status === 200) {
        console.log('    ✓ Pixel vinculado ao ad set');
      } else {
        console.log(`    ⚠ Update ad set: ${JSON.stringify(updateAdsetRes.body).slice(0,200)}`);
      }

      // 6. Buscar ads do ad set ORIGINAL para copiar um por um
      const adsRes = await api('GET', `/${adset.id}/ads?fields=id,name,creative{id,object_story_spec,url_tags}&limit=50&access_token=${META_TOKEN}`);
      const ads = adsRes.body.data || [];
      console.log(`    → ${ads.length} ad(s) para copiar`);

      for (const ad of ads) {
        console.log(`      Ad: ${ad.name}`);

        // 7. Copiar ad individualmente para o novo ad set
        const copyAdRes = await api('POST', `/${ad.id}/copies?access_token=${META_TOKEN}`, {
          adset_id: newAdsetId,
          status_option: 'PAUSED',
        });

        if (copyAdRes.status !== 200 || !copyAdRes.body.copied_ad_id) {
          console.log(`      ✗ Falha copiar ad: ${JSON.stringify(copyAdRes.body).slice(0,200)}`);
          continue;
        }

        const newAdId = copyAdRes.body.copied_ad_id;
        console.log(`      ✓ Ad copiado: ${newAdId}`);

        await sleep(500);

        // 8. Buscar creative do novo ad
        const newAdRes = await api('GET', `/${newAdId}?fields=creative{id,object_story_spec}&access_token=${META_TOKEN}`);
        const newCreative = newAdRes.body.creative || {};
        const spec = JSON.parse(JSON.stringify(newCreative.object_story_spec || {}));

        // 9. Atualizar destino para LP no creative
        let specAtualizado = false;

        if (spec.video_data?.call_to_action) {
          spec.video_data.call_to_action = { type: 'LEARN_MORE', value: { link: LP_URL } };
          if (spec.video_data.link_description !== undefined)
            spec.video_data.link_description = '';
          specAtualizado = true;
        }

        if (spec.link_data) {
          spec.link_data.link = LP_URL;
          spec.link_data.call_to_action = { type: 'LEARN_MORE', value: { link: LP_URL } };
          delete spec.link_data.lead_gen_form_id;
          specAtualizado = true;
        }

        if (specAtualizado && newCreative.id) {
          const updateCreativeRes = await api('POST', `/${newCreative.id}?access_token=${META_TOKEN}`, {
            object_story_spec: spec,
            url_tags: 'utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{adset.name}}&utm_term={{ad.name}}',
          });

          if (updateCreativeRes.status === 200) {
            console.log(`      ✓ LP aplicada no creative`);
          } else {
            console.log(`      ⚠ Creative update: ${JSON.stringify(updateCreativeRes.body).slice(0,200)}`);
          }
        } else {
          console.log(`      ℹ Nenhuma atualização de creative necessária`);
        }

        await sleep(300);
      }
    }

    console.log(`\n  ✅ Campanha [LP] criada e PAUSADA: ${newCampId}`);
  }

  console.log('\n\n🎯 CONCLUÍDO — Próximos passos:');
  console.log('  1. Revisar campanhas [LP] no Ads Manager');
  console.log('  2. Confirmar que os criativos apontam para a LP');
  console.log('  3. Ativar manualmente quando pronto');
  console.log(`  → https://business.facebook.com/adsmanager/manage/campaigns?act=${AD_ACCOUNT.replace('act_','')}`);
}

main().catch(console.error);
