#!/usr/bin/env node
/**
 * Ad Library Spy — Pesquisa anúncios ativos na Biblioteca de Anúncios do Meta
 * Uso: node ad-library-spy.js "termo de busca" [--limit 50] [--country BR] [--media video]
 *
 * Exemplos:
 *   node ad-library-spy.js "G4 Educação"
 *   node ad-library-spy.js "V4 Company" --limit 20
 *   node ad-library-spy.js "marketing médico" --media video
 *   node ad-library-spy.js --page-id 123456789  (busca por página específica)
 */

require('dotenv').config();
const https = require('https');

const TOKEN = process.env.META_ACCESS_TOKEN;
const API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/ads_archive`;

const FIELDS = [
  'id',
  'page_id',
  'page_name',
  'ad_creative_bodies',
  'ad_creative_link_captions',
  'ad_creative_link_descriptions',
  'ad_creative_link_titles',
  'ad_snapshot_url',
  'ad_delivery_start_time',
  'ad_delivery_stop_time',
  'publisher_platforms',
  'languages',
  'estimated_audience_size',
  'target_ages',
  'target_gender',
  'target_locations',
].join(',');

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    searchTerm: null,
    pageId: null,
    limit: 25,
    country: 'BR',
    media: 'ALL',
    activeOnly: true,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') { config.limit = parseInt(args[++i]); }
    else if (args[i] === '--country') { config.country = args[++i]; }
    else if (args[i] === '--media') { config.media = args[++i].toUpperCase(); }
    else if (args[i] === '--page-id') { config.pageId = args[++i]; }
    else if (args[i] === '--all') { config.activeOnly = false; }
    else if (!args[i].startsWith('--')) { config.searchTerm = args[i]; }
  }

  if (!config.searchTerm && !config.pageId) {
    console.error('Uso: node ad-library-spy.js "termo de busca" [--limit N] [--country BR] [--media video|image|all]');
    console.error('  ou: node ad-library-spy.js --page-id ID_DA_PAGINA');
    process.exit(1);
  }

  return config;
}

function buildUrl(config) {
  const params = new URLSearchParams({
    access_token: TOKEN,
    ad_reached_countries: `["${config.country}"]`,
    ad_active_status: config.activeOnly ? 'ACTIVE' : 'ALL',
    fields: FIELDS,
    limit: config.limit.toString(),
  });

  if (config.searchTerm) {
    params.set('search_terms', config.searchTerm);
  }
  if (config.pageId) {
    params.set('search_page_ids', config.pageId);
  }
  if (config.media !== 'ALL') {
    params.set('media_type', config.media);
  }

  return `${BASE_URL}?${params.toString()}`;
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'SyraAdSpy/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${data.substring(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

function formatAd(ad, index) {
  const lines = [];
  lines.push(`\n${'='.repeat(80)}`);
  lines.push(`📢 Anúncio #${index + 1}`);
  lines.push(`${'='.repeat(80)}`);
  lines.push(`📄 Página: ${ad.page_name || 'N/A'} (ID: ${ad.page_id || 'N/A'})`);
  lines.push(`📅 Início: ${ad.ad_delivery_start_time || 'N/A'}`);
  if (ad.ad_delivery_stop_time) lines.push(`⏹️  Fim: ${ad.ad_delivery_stop_time}`);

  if (ad.publisher_platforms) {
    lines.push(`📱 Plataformas: ${ad.publisher_platforms.join(', ')}`);
  }

  if (ad.ad_creative_bodies && ad.ad_creative_bodies.length > 0) {
    lines.push(`\n📝 COPY DO ANÚNCIO:`);
    ad.ad_creative_bodies.forEach(body => {
      lines.push(`   "${body}"`);
    });
  }

  if (ad.ad_creative_link_titles && ad.ad_creative_link_titles.length > 0) {
    lines.push(`\n🔗 TÍTULO DO LINK:`);
    ad.ad_creative_link_titles.forEach(t => lines.push(`   "${t}"`));
  }

  if (ad.ad_creative_link_descriptions && ad.ad_creative_link_descriptions.length > 0) {
    lines.push(`📋 DESCRIÇÃO DO LINK:`);
    ad.ad_creative_link_descriptions.forEach(d => lines.push(`   "${d}"`));
  }

  if (ad.ad_creative_link_captions && ad.ad_creative_link_captions.length > 0) {
    lines.push(`🏷️  CAPTION:`);
    ad.ad_creative_link_captions.forEach(c => lines.push(`   "${c}"`));
  }

  if (ad.target_ages) lines.push(`👥 Idade alvo: ${ad.target_ages}`);
  if (ad.target_gender) lines.push(`⚧️  Gênero alvo: ${ad.target_gender}`);
  if (ad.target_locations) {
    lines.push(`📍 Localização: ${JSON.stringify(ad.target_locations)}`);
  }
  if (ad.estimated_audience_size) {
    lines.push(`👁️  Audiência estimada: ${JSON.stringify(ad.estimated_audience_size)}`);
  }

  if (ad.ad_snapshot_url) {
    lines.push(`\n🔍 Ver criativo: ${ad.ad_snapshot_url}`);
  }

  return lines.join('\n');
}

async function main() {
  if (!TOKEN) {
    console.error('❌ META_ACCESS_TOKEN não configurado no .env');
    process.exit(1);
  }

  const config = parseArgs();
  const searchLabel = config.searchTerm || `Page ID: ${config.pageId}`;

  console.log(`\n🔎 Pesquisando: "${searchLabel}"`);
  console.log(`   País: ${config.country} | Limite: ${config.limit} | Mídia: ${config.media} | Ativos: ${config.activeOnly}`);
  console.log(`   Aguarde...\n`);

  const url = buildUrl(config);

  try {
    const result = await fetch(url);

    if (result.error) {
      console.error(`❌ Erro da API: ${result.error.message}`);
      if (result.error.code === 190) {
        console.error('   Token expirado. Renove em: https://developers.facebook.com/tools/explorer/');
      }
      process.exit(1);
    }

    const ads = result.data || [];
    console.log(`✅ Encontrados: ${ads.length} anúncios\n`);

    if (ads.length === 0) {
      console.log('Nenhum anúncio encontrado. Tente outro termo ou remova filtros.');
      return;
    }

    // Agrupar por página
    const byPage = {};
    ads.forEach(ad => {
      const page = ad.page_name || 'Desconhecido';
      if (!byPage[page]) byPage[page] = [];
      byPage[page].push(ad);
    });

    console.log('📊 Resumo por Anunciante:');
    Object.entries(byPage)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([page, pageAds]) => {
        console.log(`   ${page}: ${pageAds.length} anúncios`);
      });

    // Mostrar cada anúncio
    ads.forEach((ad, i) => {
      console.log(formatAd(ad, i));
    });

    // Paginação
    if (result.paging && result.paging.next) {
      console.log(`\n📄 Mais resultados disponíveis. Use --limit ${config.limit * 2} para ver mais.`);
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`Pesquisa finalizada: "${searchLabel}" — ${ads.length} anúncios encontrados`);
    console.log(`${'='.repeat(80)}\n`);

  } catch (err) {
    console.error(`❌ Erro: ${err.message}`);
    process.exit(1);
  }
}

main();
