/**
 * Fix titles SP — corrige os 6 criativos que ainda tinham Macapá/Amapá no título
 * Bug anterior: regex \b não funciona com caracteres acentuados em JS
 * Solução: regex sem \b + replace simples por substring exata
 */
const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_445142030338909';
const PIXEL_ID   = '1354726053083764';
const BASE       = 'https://graph.facebook.com/v21.0';
const ADSET_ID   = '120248562899320460';

const UTM_TAGS = 'utm_source={{placement}}&utm_medium=cpc&utm_campaign={{campaign.name}}{{campaign.id}}&utm_content={{adset.name}}{{adset.id}}&utm_term={{ad.name}}_{{ad.id}}';
const TRACKING_SPECS = JSON.stringify([
  { 'action.type': ['offsite_conversion'], fb_pixel: [PIXEL_ID] },
]);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function get(endpoint) {
  const sep = endpoint.includes('?') ? '&' : '?';
  const r = await fetch(`${BASE}/${endpoint}${sep}access_token=${TOKEN}`);
  const j = await r.json();
  if (j.error) throw new Error(j.error.error_user_msg || j.error.message);
  return j;
}

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST ${endpoint}] ${j.error.error_user_msg || j.error.message} (code ${j.error.code})`);
  return j;
}

// Regex sem \b — funciona corretamente com acentos
function fixTitle(title) {
  if (!title) return title;
  return title
    // Travessão
    .replace(/[—–]/g, '')
    // Padrões com preposição + localização (ordem importa: mais especifico primeiro)
    .replace(/\s+no\s+Amapá/gi, '')
    .replace(/\s+no\s+Amapa/gi, '')
    .replace(/\s+em\s+Macapá/gi, '')
    .replace(/\s+em\s+Macapa/gi, '')
    .replace(/\s+de\s+Macapá/gi, '')
    .replace(/\s+de\s+Macapa/gi, '')
    .replace(/\s+no\s+São\s+Paulo/gi, '')
    .replace(/\s+em\s+São\s+Paulo/gi, '')
    .replace(/\s+de\s+São\s+Paulo/gi, '')
    .replace(/\s+no\s+Sao\s+Paulo/gi, '')
    .replace(/\s+em\s+Sao\s+Paulo/gi, '')
    // Localização isolada (sem preposição)
    .replace(/\s+Macapá/gi, '')
    .replace(/\s+Macapa/gi, '')
    .replace(/\s+Amapá/gi, '')
    .replace(/\s+Amapa/gi, '')
    // Limpeza
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const BAD = /macapá|macapa|amapá|amapa/gi;

async function main() {
  console.log('==============================================');
  console.log('  FIX TITLES SP v3b — Remove Macapá/Amapá');
  console.log('==============================================\n');

  const adsRes = await get(`${ADSET_ID}/ads?fields=id,name,creative{id,name,object_story_spec}&limit=100`);
  const ads    = adsRes.data;

  const affected = ads.filter(ad => {
    const spec = ad.creative?.object_story_spec;
    if (!spec) return false;
    const title = spec.video_data?.title || spec.link_data?.name || '';
    return BAD.test(title);
  });

  console.log(`Ads com título problemático: ${affected.length}\n`);

  let fixed = 0, errors = 0;

  for (const [i, ad] of affected.entries()) {
    const creative = ad.creative;
    const spec     = JSON.parse(JSON.stringify(creative.object_story_spec));

    const oldTitle = spec.video_data?.title || spec.link_data?.name || '';
    const newTitle = fixTitle(oldTitle);

    process.stdout.write(`  [${i+1}/${affected.length}] ${ad.name.substring(0, 50)}\n`);
    process.stdout.write(`    Antes: "${oldTitle}"\n`);
    process.stdout.write(`    Depois: "${newTitle}"\n    `);

    try {
      // Aplicar título corrigido
      if (spec.video_data?.title !== undefined)  spec.video_data.title = newTitle;
      if (spec.link_data?.name  !== undefined)   spec.link_data.name   = newTitle;

      // Remover image_url duplicado
      if (spec.video_data?.image_hash && spec.video_data?.image_url) delete spec.video_data.image_url;
      if (spec.link_data?.image_hash  && spec.link_data?.image_url)  delete spec.link_data.image_url;

      // Criar novo criativo
      const baseName = ad.name.replace(/^SP v[0-9]+ \| /, '').replace(/^SP \| /, '');
      const newCreative = await post(`${AD_ACCOUNT}/adcreatives`, {
        name:              `SP v3b | ${baseName}`,
        object_story_spec: JSON.stringify(spec),
      });
      process.stdout.write(`criativo ${newCreative.id} `);

      // Atualizar ad
      await post(ad.id, { creative: JSON.stringify({ creative_id: newCreative.id }) });
      process.stdout.write(`| ad atualizado `);

      // UTM + pixel
      await post(ad.id, { url_tags: UTM_TAGS, tracking_specs: TRACKING_SPECS });
      process.stdout.write(`| UTM+pixel OK\n\n`);

      fixed++;
      await sleep(1000);

    } catch(e) {
      process.stdout.write(`\n    ERRO: ${e.message.substring(0, 100)}\n\n`);
      errors++;
    }
  }

  console.log('==============================================');
  console.log(`  Corrigidos: ${fixed}/${affected.length}`);
  console.log(`  Erros:      ${errors}`);
  console.log('==============================================\n');
}

main().catch(err => { console.error('Erro fatal:', err.message); process.exit(1); });
