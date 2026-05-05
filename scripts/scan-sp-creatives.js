/**
 * Diagnóstico: escaneia copy atual dos ads do adset SP P6
 */
const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN    = process.env.META_ACCESS_TOKEN;
const BASE     = 'https://graph.facebook.com/v21.0';
const ADSET_ID = '120248562899320460';
const BAD      = /macapá|macapa|amapá|amapa|avaliação gratuita|consulta gratuita|avaliacao gratuita|—/gi;

async function get(endpoint) {
  const sep = endpoint.includes('?') ? '&' : '?';
  const r = await fetch(`${BASE}/${endpoint}${sep}access_token=${TOKEN}`);
  const j = await r.json();
  if (j.error) throw new Error(j.error.error_user_msg || j.error.message);
  return j;
}

async function main() {
  const adsRes = await get(`${ADSET_ID}/ads?fields=id,name,creative{id,name,object_story_spec}&limit=100`);
  const ads    = adsRes.data;
  console.log(`${ads.length} anúncios\n`);

  let issues = 0;

  for (const ad of ads) {
    const spec = ad.creative?.object_story_spec;
    if (!spec) { console.log(`${ad.name} — SEM SPEC\n`); continue; }

    const specStr = JSON.stringify(spec);
    const matches = specStr.match(BAD);

    // Extrair campos relevantes
    const vd = spec.video_data;
    const ld = spec.link_data;

    const title   = vd?.title       || ld?.name        || '';
    const msg     = vd?.message     || ld?.message      || '';
    const desc    = vd?.link_description || ld?.description || '';

    if (matches) {
      issues++;
      console.log(`[PROBLEMA] ${ad.name}`);
      console.log(`  Creative: ${ad.creative.id}`);
      console.log(`  Termos proibidos: ${matches.join(', ')}`);
      console.log(`  titulo:  ${title.substring(0, 80)}`);
      console.log(`  msg:     ${msg.substring(0, 120).replace(/\n/g, '|')}`);
      console.log(`  desc:    ${desc.substring(0, 80)}`);
      console.log('');
    }
  }

  if (issues === 0) {
    console.log('Nenhum problema encontrado.');
  } else {
    console.log(`\nTotal com problemas: ${issues}/${ads.length}`);
  }
}

main().catch(err => { console.error('Erro:', err.message); process.exit(1); });
