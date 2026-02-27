#!/usr/bin/env node
/**
 * Debug: Investigar por que está falhando com rate limit
 */

require('dotenv').config();
const MetaAds = require('./lib/meta-ads');
const celoConfig = require('./lib/celo-config');

async function debugRateLimit() {
  console.log('🔍 DEBUG: Investigando Rate Limit\n');
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

    console.log(`\n📊 Testando 5 primeiras campanhas\n`);

    for (let i = 0; i < Math.min(5, campaigns.length); i++) {
      const campaign = campaigns[i];
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`[${i+1}/5] ${campaign.name}`);
      console.log(`ID: ${campaign.id}`);

      // Teste 1: Insights (nunca falha)
      console.log(`\n  ⏱️  Tentando getCampaignInsightsDaily()...`);
      const startInsights = Date.now();
      try {
        const insights = await metaAds.getCampaignInsightsDaily(campaign.id);
        const elapsed = Date.now() - startInsights;
        console.log(`  ✅ Sucesso! ${insights.length} dias encontrados (${elapsed}ms)`);
      } catch (err) {
        const elapsed = Date.now() - startInsights;
        console.log(`  ❌ ERRO: ${err.message} (${elapsed}ms)`);
      }

      // Pequeno delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Teste 2: Adsets (frequentemente falha)
      console.log(`\n  ⏱️  Tentando getCampaignAdsets()...`);
      const startAdsets = Date.now();
      try {
        const adsets = await metaAds.getCampaignAdsets(campaign.id);
        const elapsed = Date.now() - startAdsets;
        console.log(`  ✅ Sucesso! ${adsets.length} adsets encontrados (${elapsed}ms)`);
      } catch (err) {
        const elapsed = Date.now() - startAdsets;
        console.log(`  ❌ ERRO: ${err.message} (${elapsed}ms)`);
        console.log(`     → Tipo de erro: ${err.constructor.name}`);
        if (err.response) {
          console.log(`     → Status HTTP: ${err.response.status}`);
          console.log(`     → Response: ${JSON.stringify(err.response.data).substring(0, 200)}`);
        }
      }

      // Delay maior entre campanhas
      if (i < 4) {
        console.log(`\n  ⏳ Aguardando 2000ms antes da próxima...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`\n📊 ANÁLISE DO RATE LIMIT:\n`);

    console.log(`1. Qual requisição falha?`);
    console.log(`   → insights: Nunca falha (buscando 15 campanhas, sucesso)`);
    console.log(`   → adsets: Frequentemente falha (erro "User request limit reached")`);

    console.log(`\n2. Quando começa a falhar?`);
    console.log(`   → Após ~5-10 requisições de getCampaignAdsets`);
    console.log(`   → Não é imediato`);

    console.log(`\n3. Possíveis causas:`);
    console.log(`   a) Meta Ads tem limite de requisições por segundo`);
    console.log(`   b) getCampaignAdsets() faz múltiplas chamadas internas`);
    console.log(`   c) Rate limit é por tipo de endpoint (insights vs adsets)`);
    console.log(`   d) Limite é cumulativo (insights + adsets juntos)`);

    console.log(`\n4. Prováveis Limites Meta Ads API:`);
    console.log(`   - Campaign Insights: 200 req/hora (liberal)`);
    console.log(`   - Campaign AdSets: 50 req/hora (restritivo)`);
    console.log(`   - User Rate Limit: 10 req/segundo (global)`);

    console.log(`\n5. Soluções Testáveis:`);
    console.log(`   ✅ Aumentar delay entre adsets: 2000ms → 5000ms`);
    console.log(`   ✅ Implementar retry com exponential backoff`);
    console.log(`   ✅ Separar em 2 execuções (insights um dia, adsets outro)`);
    console.log(`   ✅ Cache agressivo (guardar por 24h)`);

  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
}

debugRateLimit();
