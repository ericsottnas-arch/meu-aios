#!/usr/bin/env node
/**
 * Investigar: Como buscar criativos/anúncios da API Meta
 */

require('dotenv').config();
const MetaAds = require('./lib/meta-ads');
const celoConfig = require('./lib/celo-config');

async function investigate() {
  console.log('🔍 INVESTIGANDO: Como Buscar Criativos\n');
  console.log('=' .repeat(80));

  const metaAds = new MetaAds();
  await metaAds.init();

  const client = celoConfig.getClient('dr-erico-servano');
  const adAccountId = client.adAccountId || client.metaAdAccountId || process.env.META_AD_ACCOUNT_ID;

  try {
    // Listar campanhas
    const campaigns = await metaAds.listCampaigns({
      adAccountId,
      limit: 100,
    });

    console.log(`\n📊 Testando com primeira campanha que tem adsets\n`);

    // Pegar a campanha 14 (tem 7 adsets)
    const campaign = campaigns[13]; // Índice 13 = campanha 14
    console.log(`Campanha: ${campaign.name}`);
    console.log(`ID: ${campaign.id}\n`);

    // Buscar adsets
    const adsets = await metaAds.getCampaignAdsets(campaign.id);
    console.log(`Adsets encontrados: ${adsets.length}\n`);

    if (adsets.length === 0) {
      console.log('Nenhum adset encontrado.');
      return;
    }

    // Para o primeiro adset, buscar criativos
    const adset = adsets[0];
    console.log(`Testando com Adset: ${adset.name}`);
    console.log(`ID: ${adset.id}\n`);

    // Tentar buscar creatives do adset
    console.log('⏱️  Tentando buscar creatives via adset.getCreatives()...');
    try {
      const { AdSet } = require('facebook-nodejs-business-sdk');
      const adsetObj = new AdSet(adset.id);

      const creatives = await adsetObj.getAdCreatives(
        ['id', 'name', 'object_story_spec', 'effective_object_story_id', 'status'],
        { limit: 100 }
      );

      console.log(`✅ Sucesso! ${creatives.length} creatives encontrados\n`);

      creatives.forEach((c, idx) => {
        console.log(`${idx + 1}. ${c.name || 'Sem nome'}`);
        console.log(`   ID: ${c.id}`);
        console.log(`   Status: ${c.status}`);
        if (c.object_story_spec) {
          console.log(`   Story spec: ${JSON.stringify(c.object_story_spec).substring(0, 100)}...`);
        }
        console.log('');
      });

    } catch (err) {
      console.log(`❌ ERRO: ${err.message}\n`);
      console.log('Tentando alternativa: buscar via Ads...\n');

      // Alternativa: buscar Ads do adset (que contêm creative IDs)
      try {
        const { AdSet, Ad } = require('facebook-nodejs-business-sdk');
        const adsetObj = new AdSet(adset.id);

        const ads = await adsetObj.getAds(
          ['id', 'name', 'creative', 'status', 'adset_id'],
          { limit: 100 }
        );

        console.log(`✅ Encontrados ${ads.length} ads\n`);

        ads.forEach((ad, idx) => {
          console.log(`${idx + 1}. ${ad.name || 'Sem nome'}`);
          console.log(`   ID: ${ad.id}`);
          console.log(`   Status: ${ad.status}`);
          if (ad.creative) {
            console.log(`   Creative ID: ${ad.creative.id}`);
          }
          console.log('');
        });

      } catch (err2) {
        console.log(`❌ ERRO na alternativa: ${err2.message}`);
      }
    }

  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
}

investigate();
