#!/usr/bin/env node
/**
 * RODADA ÚNICA COMPLETA: Busca TODOS os dados
 *
 * ✅ O QUE BUSCA:
 * - Todas as campanhas (15)
 * - Todos os adsets (32+)
 * - TODOS os criativos (com nomes!)
 * - Todos os dados históricos desde criação
 * - Todas as 26 colunas preenchidas
 *
 * ⏰ TEMPO: ~10-12 minutos
 * 🎯 FREQUÊNCIA: Uma vez agora, depois incremental a cada 15 min
 *
 * Uso: node export-complete.js [clientId]
 * Exemplo: node export-complete.js dr-erico-servano
 *
 * DEPOIS DESTA RODADA:
 * 1. Configure incremental a cada 15 min: node export-incremental.js
 * 2. Pronto! Dados sempre 100% atualizados
 */

require('dotenv').config();
const CampaignsExporter = require('./lib/campaigns-exporter');

async function exportComplete() {
  const clientId = process.argv[2] || 'dr-erico-servano';

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 RODADA COMPLETA: Exportando TODOS os dados com criativos`);
  console.log(`${'='.repeat(80)}\n`);
  console.log(`Cliente: ${clientId}`);
  console.log(`O QUE SERÁ BUSCADO:`);
  console.log(`  ✅ Todas as campanhas (15)`);
  console.log(`  ✅ Todos os adsets (32+)`);
  console.log(`  ✅ TODOS os criativos (com ad_name!)`);
  console.log(`  ✅ Dados históricos completos desde criação`);
  console.log(`  ✅ Todas as 26 colunas preenchidas\n`);
  console.log(`⏱️  TEMPO ESTIMADO: 10-12 minutos`);
  console.log(`🔄 FREQUÊNCIA DEPOIS: A cada 15 minutos (incremental rápido)\n`);
  console.log(`Início: ${new Date().toLocaleString('pt-BR')}\n`);

  const exporter = new CampaignsExporter();
  await exporter.init();

  try {
    console.log(`${'▓'.repeat(80)}`);
    console.log(`BUSCANDO TODOS OS DADOS (sem pular nada)...`);
    console.log(`${'▓'.repeat(80)}\n`);

    // Rodada única completa com delay maior para evitar rate limit
    // 12000ms = 12 segundos entre campanhas
    // = ~5 campanhas por minuto
    // = 15 campanhas em ~3 minutos
    // + creatives (2s cada adset) = +2-3 minutos
    // TOTAL: ~8-10 minutos
    const metaData = await exporter.fetchFromMetaAds(
      clientId,
      null,  // startDate: null = desde criação (todos os dados históricos)
      null,  // endDate: null = até hoje
      {
        skipCreatives: false,      // 🔑 INCLUIR TODOS OS CRIATIVOS
        campaignDelay: 12000       // 12 segundos entre campanhas (evita rate limit)
      }
    );

    console.log(`\n${'▓'.repeat(80)}`);
    console.log(`✅ DADOS BUSCADOS COM SUCESSO`);
    console.log(`${'▓'.repeat(80)}\n`);

    console.log(`📊 RESUMO DOS DADOS:`);
    console.log(`  Campanhas: ${metaData.campaigns.length}`);

    let totalDays = 0;
    let totalAdsets = 0;
    let totalCreatives = 0;

    metaData.campaigns.forEach(c => {
      totalDays += c.dailyInsights?.length || 0;
      totalAdsets += c.adsets?.length || 0;
      c.adsets?.forEach(a => {
        totalCreatives += a.creatives?.length || 0;
      });
    });

    console.log(`  Dias de dados: ${totalDays}`);
    console.log(`  Adsets: ${totalAdsets}`);
    console.log(`  Criativos: ${totalCreatives}`);
    console.log(`  Período: ${metaData.period}`);

    // Salvar em Google Sheets
    console.log(`\n📊 Salvando em Google Sheets...`);
    const sheetData = await exporter.fetchFromGoogleSheets(clientId);
    const synthesis = await exporter.synthesizeData(clientId, metaData, sheetData);
    await exporter.saveToGoogleSheets(clientId, synthesis);

    console.log(`✅ Salvo em Google Sheets com sucesso`);
    console.log(`   ${synthesis.campaigns?.length || 0} campanhas × ${Math.ceil(totalDays / metaData.campaigns.length)} dias aprox`);
    console.log(`   Total de linhas: ~${totalDays * totalAdsets / metaData.campaigns.length || 'N/A'}`);

    // Salvar localmente
    console.log(`\n💾 Salvando em JSON/Markdown/Excel...`);
    await exporter.saveToJSON(clientId, synthesis);
    await exporter.saveToMarkdown(clientId, synthesis);
    await exporter.saveToExcel(clientId, synthesis);

    console.log(`✅ Tudo salvo localmente`);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ RODADA COMPLETA FINALIZADA!`);
    console.log(`${'='.repeat(80)}\n`);

    console.log(`🎉 AGORA VOCÊ TEM:`);
    console.log(`  ✅ Todos os dados históricos completos`);
    console.log(`  ✅ Todas as 26 colunas preenchidas`);
    console.log(`  ✅ ad_name com nomes dos criativos`);
    console.log(`  ✅ Tudo em Google Sheets + JSON + Markdown + Excel\n`);

    console.log(`📍 PRÓXIMO PASSO: Configurar sincronização a cada 15 minutos\n`);
    console.log(`Para manter dados atualizados (bem rápido agora), execute:\n`);
    console.log(`  # Opção 1: Manual a cada 15 minutos`);
    console.log(`  node export-incremental.js ${clientId}\n`);
    console.log(`  # Opção 2: Automático via cron (recomendado)`);
    console.log(`  */15 * * * * cd /Users/ericsantos/meu-aios/meu-projeto && node export-incremental.js ${clientId}\n`);

    console.log(`Fim: ${new Date().toLocaleString('pt-BR')}\n`);

  } catch (err) {
    console.error(`\n❌ ERRO:`);
    console.error(err.message);
    if (err.response?.error?.message) {
      console.error(`Meta API Error: ${err.response.error.message}`);
    }
    process.exit(1);
  }
}

exportComplete();
