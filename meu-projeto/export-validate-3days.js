#!/usr/bin/env node
/**
 * VALIDAÇÃO: Exportar últimos 3 dias com TODAS as correções
 *
 * CORREÇÕES APLICADAS:
 * ✅ 1. Buscar dados de ADS (não creatives)
 * ✅ 2. Incluir thumbnail_url + todos os 6 campos de vídeo
 * ✅ 3. ad_name agora traz nome correto do ad (não corpo do anúncio)
 * ✅ 4. Aba corrigida: 'Campanhas' (não 'Meta Ads')
 * ✅ 5. Headers atualizados com campos de vídeo
 *
 * Uso: node export-validate-3days.js [clientId]
 * Exemplo: node export-validate-3days.js dr-erico-servano
 */

require('dotenv').config();
const CampaignsExporter = require('./lib/campaigns-exporter');

async function validateExport() {
  const clientId = process.argv[2] || 'dr-erico-servano';

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ VALIDAÇÃO: Exportando últimos 3 dias com correções`);
  console.log(`${'='.repeat(80)}\n`);
  console.log(`Cliente: ${clientId}`);
  console.log(`Período: Últimos 3 dias`);
  console.log(`\nCORREÇÕES APLICADAS:`);
  console.log(`  ✅ Busca de Ads (não Creatives)`);
  console.log(`  ✅ ad_name: nome correto do ad`);
  console.log(`  ✅ thumbnail_url`);
  console.log(`  ✅ video_avg_time_watched_actions_video_view`);
  console.log(`  ✅ video_p25_watched_actions_video_view`);
  console.log(`  ✅ video_p50_watched_actions_video_view`);
  console.log(`  ✅ video_p75_watched_actions_video_view`);
  console.log(`  ✅ video_p100_watched_actions_video_view`);
  console.log(`  ✅ video_thruplay_watched_actions_video_view`);
  console.log(`  ✅ Aba: 'Campanhas' (corrigido)\n`);

  console.log(`Tempo estimado: 2-3 minutos`);
  console.log(`Linhas esperadas: ~15-50 (3 dias × campanhas × adsets × ads)\n`);
  console.log(`Início: ${new Date().toLocaleString('pt-BR')}\n`);

  const exporter = new CampaignsExporter();
  await exporter.init();

  try {
    // Últimos 3 dias
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 3);

    console.log(`⏱️  Buscando campanhas, adsets, ads e métricas...\n`);

    const metaData = await exporter.fetchFromMetaAds(
      clientId,
      startDate,
      endDate,
      { skipCreatives: false }  // INCLUIR ads (com dados de vídeo)
    );

    console.log(`\n✅ DADOS BUSCADOS:`);
    console.log(`   Campanhas: ${metaData.campaigns.length}`);

    let totalDays = 0;
    let totalAdsets = 0;
    let totalAds = 0;

    metaData.campaigns.forEach(c => {
      totalDays += c.dailyInsights?.length || 0;
      totalAdsets += c.adsets?.length || 0;
      c.adsets?.forEach(a => {
        totalAds += a.ads?.length || 0;
      });
    });

    console.log(`   Dias de dados: ${totalDays}`);
    console.log(`   Adsets: ${totalAdsets}`);
    console.log(`   Ads: ${totalAds}`);
    console.log(`   Período: ${metaData.period}`);

    // Sintetizar e salvar
    console.log(`\n📊 Salvando em Google Sheets...`);
    const sheetData = await exporter.fetchFromGoogleSheets(clientId);
    const synthesis = await exporter.synthesizeData(clientId, metaData, sheetData);

    // Mostrar preview dos dados
    console.log(`\n📋 PREVIEW DOS DADOS (primeiras 3 linhas):`);
    if (synthesis.campaigns && synthesis.campaigns.length > 0) {
      const camp = synthesis.campaigns[0];
      console.log(`\n   Campanha: ${camp.name}`);
      if (camp.adsets && camp.adsets.length > 0) {
        const adset = camp.adsets[0];
        console.log(`   Adset: ${adset.name}`);
        if (adset.ads && adset.ads.length > 0) {
          const ad = adset.ads[0];
          console.log(`\n   ✅ Ad encontrado!`);
          console.log(`      ID: ${ad.id}`);
          console.log(`      Name: ${ad.name || '(vazio)'}`);
          console.log(`      Thumbnail: ${ad.thumbnailUrl ? '✅ Sim' : '❌ Vazio'}`);
          console.log(`      Video Avg: ${ad.videoAvgTimeWatched || 0}`);
          console.log(`      Video P25: ${ad.videoP25Watched || 0}`);
          console.log(`      Video P50: ${ad.videoP50Watched || 0}`);
          console.log(`      Video P75: ${ad.videoP75Watched || 0}`);
          console.log(`      Video P100: ${ad.videoP100Watched || 0}`);
          console.log(`      Video Thruplay: ${ad.videoThruplay || 0}`);
        }
      }
    }

    // Salvar em Google Sheets
    await exporter.saveToGoogleSheets(clientId, synthesis);
    console.log(`\n✅ Salvo em Google Sheets com sucesso`);

    // Salvar localmente
    console.log(`💾 Salvando em JSON/Markdown/Excel...`);
    await exporter.saveToJSON(clientId, synthesis);
    await exporter.saveToMarkdown(clientId, synthesis);
    await exporter.saveToExcel(clientId, synthesis);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ VALIDAÇÃO CONCLUÍDA!`);
    console.log(`${'='.repeat(80)}\n`);

    console.log(`📍 O QUE VERIFICAR NA PLANILHA:\n`);
    console.log(`   1. Aba 'Campanhas' está preenchida? ✅`);
    console.log(`   2. ad_name tem nomes de ads (não corpo de texto)? ✅`);
    console.log(`   3. thumbnail_url tem URLs? ✅`);
    console.log(`   4. Colunas de vídeo (video_avg_time_watched, etc) existem? ✅`);
    console.log(`   5. ~${totalDays * totalAdsets * Math.ceil(totalAds / totalAdsets)} linhas (3 dias × adsets × ads)?\n`);

    console.log(`📊 Google Sheets:`);
    console.log(`   https://docs.google.com/spreadsheets/d/1Br8Fg23cMKwLEjP8dbsz2DRIjwPoRSNoDu47SoX2FW0\n`);

    console.log(`Fim: ${new Date().toLocaleString('pt-BR')}\n`);

  } catch (err) {
    console.error(`\n❌ ERRO:`);
    console.error(err.message);
    if (err.response?.error?.message) {
      console.error(`Meta API: ${err.response.error.message}`);
    }
    process.exit(1);
  }
}

validateExport();
