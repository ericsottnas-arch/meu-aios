#!/usr/bin/env node
/**
 * Script de teste: Exportação com histórico COMPLETO e TODAS as colunas
 *
 * Objetivo:
 * - Buscar dados desde a PRIMEIRA campanha (sem limite de 120 dias)
 * - Preencher TODAS as 26 colunas
 * - Gerar >700 linhas se possível
 */

require('dotenv').config();
const CampaignsExporter = require('./lib/campaigns-exporter');

async function testFullHistory() {
  console.log('🔍 TESTE: Exportação com Histórico Completo\n');
  console.log('=' .repeat(70));

  const exporter = new CampaignsExporter();
  const clientId = 'dr-erico-servano';

  try {
    // Inicializar
    console.log('✅ Inicializando CampaignsExporter...');
    await exporter.init();

    // Buscar dados de Meta Ads (COM HISTÓRICO COMPLETO)
    console.log('\n📊 Buscando campanhas (HISTÓRICO COMPLETO)...');
    const metaData = await exporter.fetchFromMetaAds(clientId);

    console.log(`\n📈 CAMPANHAS ENCONTRADAS: ${metaData.campaigns.length}`);
    console.log('=' .repeat(70));

    let totalRows = 0;
    let totalDays = 0;
    let emptyColumns = new Set();

    metaData.campaigns.forEach((campaign, idx) => {
      const daysCount = campaign.dailyInsights ? campaign.dailyInsights.length : 0;
      totalDays += daysCount;
      totalRows += daysCount || 1;

      console.log(`\n${idx + 1}. ${campaign.name}`);
      console.log(`   ID: ${campaign.id}`);
      console.log(`   Status: ${campaign.status}`);
      console.log(`   Budget: R$ ${campaign.dailyBudget || 'N/A'}/dia`);
      console.log(`   Dias de dados: ${daysCount}`);

      // Verificar quais colunas estão vazias
      if (campaign.dailyInsights && campaign.dailyInsights.length > 0) {
        const firstDay = campaign.dailyInsights[0];
        const columns26 = [
          'account_name', 'actions_landing_page_view', 'actions_lead',
          'actions_onsite_conversion_messaging_conversation_started_7d', 'ad_name',
          'adset_name', 'adset_start_time', 'adset_status', 'campaign',
          'campaign_daily_budget', 'campaign_status', 'clicks',
          'cost_per_action_type_landing_page_view', 'cost_per_action_type_lead',
          'cost_per_action_type_onsite_conversion_messaging_conversation_started_7d',
          'cost_per_thruplay_video_view', 'cpc', 'cpm', 'ctr', 'datasource',
          'date', 'frequency', 'impressions', 'link_clicks', 'reach', 'source'
        ];

        // Mapeamento simplificado para teste
        const dataMap = {
          'landingPageViews': firstDay.landingPageViews,
          'conversions': firstDay.conversions,
          'messagingConversations': firstDay.messagingConversations,
          'cpc': firstDay.cpc,
          'cpm': firstDay.cpm,
          'ctr': firstDay.ctr,
          'costPerLandingPageView': firstDay.costPerLandingPageView,
          'costPerResult': firstDay.costPerResult,
          'costPerMessagingConversation': firstDay.costPerMessagingConversation,
          'costPerThruplayVideoView': firstDay.costPerThruplayVideoView,
          'frequency': firstDay.frequency,
          'impressions': firstDay.impressions,
          'linkClicks': firstDay.linkClicks,
          'reach': firstDay.reach,
        };

        if (firstDay.landingPageViews === undefined || firstDay.landingPageViews === 0) {
          emptyColumns.add('landingPageViews');
        }
      }

      if (campaign.adsets && campaign.adsets.length > 0) {
        console.log(`   Adsets: ${campaign.adsets.length}`);
      }
    });

    console.log('\n' + '=' .repeat(70));
    console.log(`\n📊 RESUMO DE LINHAS:`);
    console.log(`   Total de campanhas: ${metaData.campaigns.length}`);
    console.log(`   Total de dias: ${totalDays}`);
    console.log(`   TOTAL DE LINHAS QUE SERÃO EXPORTADAS: ${totalRows}`);
    console.log(`   Meta: >700 linhas ✅ ${totalRows > 700 ? '✅ ATINGIDA' : '❌ NÃO ATINGIDA'}`);

    // Agora fazer build das rows para verificar colunas
    console.log(`\n🔧 Construindo rows para Google Sheets...`);
    const synthesis = await exporter.synthesizeData(clientId, metaData, {
      timestamp: new Date().toISOString(),
      campaigns: [],
      headers: [],
      rows: [],
    });

    const rows = await exporter.buildGoogleSheetsRows(clientId, synthesis);
    console.log(`   Rows construídas: ${rows.length}`);

    if (rows.length > 0) {
      const firstRow = rows[0];
      console.log(`   Colunas por row: ${firstRow.length}`);
      console.log(`   Meta: 26 colunas ✅ ${firstRow.length === 26 ? '✅ ATINGIDA' : '❌ NÃO ATINGIDA'}`);

      // Verificar se há vazios
      let emptyCount = 0;
      const emptyIndexes = [];
      firstRow.forEach((value, idx) => {
        if (value === '' || value === 0 || value === null) {
          emptyCount++;
          emptyIndexes.push(idx);
        }
      });

      console.log(`\n📋 ANÁLISE DA PRIMEIRA ROW:`);
      const columns26 = [
        'account_name', 'actions_landing_page_view', 'actions_lead',
        'actions_onsite_conversion_messaging_conversation_started_7d', 'ad_name',
        'adset_name', 'adset_start_time', 'adset_status', 'campaign',
        'campaign_daily_budget', 'campaign_status', 'clicks',
        'cost_per_action_type_landing_page_view', 'cost_per_action_type_lead',
        'cost_per_action_type_onsite_conversion_messaging_conversation_started_7d',
        'cost_per_thruplay_video_view', 'cpc', 'cpm', 'ctr', 'datasource',
        'date', 'frequency', 'impressions', 'link_clicks', 'reach', 'source'
      ];

      console.log(`   Colunas vazias/zero: ${emptyCount}`);
      if (emptyIndexes.length > 0 && emptyIndexes.length <= 5) {
        emptyIndexes.forEach(idx => {
          console.log(`     - ${columns26[idx] || `Col ${idx}`}: ${firstRow[idx]}`);
        });
      }

      // Mostrar primeiros e últimos valores
      console.log(`\n📊 Primeiros valores da row 1:`);
      columns26.slice(0, 5).forEach((col, idx) => {
        console.log(`   ${col}: ${firstRow[idx]}`);
      });
    }

    console.log('\n' + '=' .repeat(70));
    console.log('\n✅ TESTE COMPLETO!\n');
    console.log('Próximo passo: npm start para sincronizar com Google Sheets');

  } catch (err) {
    console.error('\n❌ ERRO:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testFullHistory();
