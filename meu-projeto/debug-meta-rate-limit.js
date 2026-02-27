#!/usr/bin/env node
/**
 * Debug: Investigar QUAL é o rate limit exato do Meta Ads
 */

require('dotenv').config();
const MetaAds = require('./lib/meta-ads');
const celoConfig = require('./lib/celo-config');
const { AdSet } = require('facebook-nodejs-business-sdk');

async function debugMetaRateLimit() {
  console.log('🔍 INVESTIGANDO: Rate Limit Exato do Meta Ads\n');
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

    console.log(`\n📊 Fazendo requisições para entender rate limit...\n`);

    // Testar sequencialmente
    let requestCount = 0;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < campaigns.length; i++) {
      const campaign = campaigns[i];
      console.log(`\n[${i + 1}/${campaigns.length}] ${campaign.name}`);

      // 1. Insights
      try {
        console.log(`  ▪ Insights...`);
        requestCount++;
        const insights = await metaAds.getCampaignInsightsDaily(campaign.id);
        successCount++;
        console.log(`    ✅ ${insights.length} dias`);
      } catch (err) {
        failCount++;
        console.log(`    ❌ ${err.message}`);
      }

      // 2. Adsets
      try {
        console.log(`  ▪ Adsets...`);
        requestCount++;
        const adsets = await metaAds.getCampaignAdsets(campaign.id);
        successCount++;
        console.log(`    ✅ ${adsets.length} adsets`);

        // 3. Criativos (só para o primeiro adset)
        if (adsets.length > 0) {
          const adset = adsets[0];
          try {
            console.log(`  ▪ Criativos do adset ${adset.id}...`);
            requestCount++;

            const adsetObj = new AdSet(adset.id);
            const creatives = await adsetObj.getAdCreatives(
              ['id', 'name'],
              { limit: 100 }
            );
            successCount++;
            console.log(`    ✅ ${creatives.length} criativos`);
          } catch (err) {
            failCount++;
            console.log(`    ❌ ${err.message}`);

            // Investigar erro
            if (err.response && err.response.data) {
              const data = err.response.data;
              console.log(`\n    📋 Detalhes do erro:`);
              console.log(`       Type: ${data.error?.type}`);
              console.log(`       Code: ${data.error?.code}`);
              console.log(`       Message: ${data.error?.message}`);
              console.log(`       Subcode: ${data.error?.error_subcode}`);

              if (err.response.headers) {
                console.log(`\n    📊 Headers da resposta:`);
                console.log(`       x-business-use-case-usage: ${err.response.headers['x-business-use-case-usage']}`);
                console.log(`       x-app-usage: ${err.response.headers['x-app-usage']}`);
                console.log(`       x-rate-limit-limit: ${err.response.headers['x-rate-limit-limit']}`);
                console.log(`       x-rate-limit-remaining: ${err.response.headers['x-rate-limit-remaining']}`);
                console.log(`       x-rate-limit-reset: ${err.response.headers['x-rate-limit-reset']}`);
              }
            }
          }
        }
      } catch (err) {
        failCount++;
        console.log(`    ❌ ${err.message}`);
      }

      // Parar após 5 campanhas ou se começar a falhar muito
      if (failCount > 3) {
        console.log(`\n⚠️  Parando após ${failCount} falhas...`);
        break;
      }

      // Delay pequeno
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`\n📊 RESULTADO:\n`);
    console.log(`   Total de requisições: ${requestCount}`);
    console.log(`   Sucesso: ${successCount}`);
    console.log(`   Falhas: ${failCount}`);
    console.log(`   Taxa de sucesso: ${((successCount / requestCount) * 100).toFixed(1)}%`);

    console.log(`\n📌 ANÁLISE:\n`);

    if (failCount === 0) {
      console.log(`   ✅ Nenhuma falha! Rate limit não foi atingido.`);
      console.log(`   💡 Pode-se aumentar a frequência de requisições.`);
    } else if (failCount < 5) {
      console.log(`   ⚠️  Algumas falhas, mas taxa alta de sucesso.`);
      console.log(`   💡 Aumentar delay entre requisições em 50%.`);
    } else {
      console.log(`   ❌ Taxa de falha muito alta.`);
      console.log(`   💡 Rate limit é MUITO restritivo para este tipo de requisição.`);
      console.log(`   💡 Usar cache agressivo ou executar em horários diferentes.`);
    }

    console.log(`\n🔗 Documentação Meta Ads Rate Limiting:`);
    console.log(`   https://developers.facebook.com/docs/graph-api/overview/rate-limiting`);
    console.log(`\n💡 Pontos importantes:`);
    console.log(`   • Rate limit é por usuário/token/app`);
    console.log(`   • Diferentes endpoints têm limites diferentes`);
    console.log(`   • Creative/Adset insights são mais restritivos`);
    console.log(`   • Headers x-rate-limit-* indicam limite restante`);

  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
}

debugMetaRateLimit();
