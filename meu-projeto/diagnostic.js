#!/usr/bin/env node
/**
 * Diagnóstico detalhado dos dados disponíveis
 */

require('dotenv').config();
const MetaAds = require('./lib/meta-ads');
const celoConfig = require('./lib/celo-config');

async function diagnostic() {
  console.log('🔍 DIAGNÓSTICO: Dados Disponíveis em Meta Ads\n');
  console.log('=' .repeat(80));

  const metaAds = new MetaAds();
  await metaAds.init();

  const client = celoConfig.getClient('dr-erico-servano');
  const adAccountId = client.adAccountId || client.metaAdAccountId || process.env.META_AD_ACCOUNT_ID;

  console.log(`\n👤 Conta: ${client.name} (${adAccountId})`);
  console.log('\n📋 Listando TODAS as campanhas...\n');

  try {
    // Listar campanhas
    const campaigns = await metaAds.listCampaigns({
      adAccountId,
      limit: 100,
    });

    console.log(`✅ Total de campanhas encontradas: ${campaigns.length}\n`);
    console.log('=' .repeat(80));

    let totalDays = 0;
    const details = [];

    // Para cada campanha, buscar insights com mais detalhes
    for (let i = 0; i < campaigns.length; i++) {
      const campaign = campaigns[i];
      console.log(`\n[${i + 1}/${campaigns.length}] ${campaign.name}`);
      console.log(`    ID: ${campaign.id}`);
      console.log(`    Status: ${campaign.status}`);
      console.log(`    Criada em: ${new Date(campaign.createdTime).toLocaleDateString('pt-BR')}`);
      console.log(`    Budget: R$ ${campaign.dailyBudget || 'N/A'}/dia`);

      try {
        const insights = await metaAds.getCampaignInsightsDaily(campaign.id);
        const daysCount = insights ? insights.length : 0;
        totalDays += daysCount;

        if (daysCount > 0) {
          const firstDay = insights[0].date;
          const lastDay = insights[insights.length - 1].date;
          console.log(`    ✅ Dados disponíveis: ${daysCount} dias (${firstDay} até ${lastDay})`);

          // Mostrar alguns dados de exemplo
          if (daysCount > 0) {
            const sample = insights[0];
            console.log(`       Exemplo (${sample.date}):`);
            console.log(`         - Impressões: ${sample.impressions}`);
            console.log(`         - Cliques: ${sample.clicks}`);
            console.log(`         - Conversões: ${sample.conversions}`);
            console.log(`         - Spend: R$ ${sample.spend}`);
          }
        } else {
          console.log(`    ⚠️  Nenhum dado disponível`);
        }

        details.push({
          name: campaign.name,
          days: daysCount,
          created: campaign.createdTime,
        });

        // Delay para evitar rate limit
        if (i < campaigns.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (err) {
        console.log(`    ❌ Erro ao buscar insights: ${err.message}`);
      }
    }

    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 RESUMO FINAL:');
    console.log(`   Campanhas com dados: ${details.filter(d => d.days > 0).length}/${details.length}`);
    console.log(`   Total de dias de dados: ${totalDays}`);
    console.log(`   **TOTAL DE LINHAS QUE SERÁ EXPORTADO: ${totalDays}**`);

    // Listar campanhas por volume de dados
    console.log('\n📈 Top Campanhas por Volume de Dados:');
    const sorted = details.sort((a, b) => b.days - a.days).slice(0, 10);
    sorted.forEach((c, idx) => {
      console.log(`   ${idx + 1}. ${c.name.substring(0, 50)}: ${c.days} dias`);
    });

    console.log('\n' + '=' .repeat(80));
    if (totalDays < 700) {
      console.log('\n⚠️  NOTA: Menos de 700 linhas disponíveis.');
      console.log('Possíveis razões:');
      console.log('  1. Meta Ads só retorna insights para campanhas com gastos');
      console.log('  2. Campanhas pausadas podem ter menos dados');
      console.log('  3. Dados podem estar limitados por período de retenção da Meta');
      console.log('  4. Token pode não ter acesso a todas as campanhas');
    } else {
      console.log('\n✅ Mais de 700 linhas disponíveis!');
    }

  } catch (err) {
    console.error('❌ ERRO:', err.message);
    console.error(err.stack);
  }
}

diagnostic();
