#!/usr/bin/env node
/**
 * PHASE 1: Export Februar 1-26 data FAST (skip creatives to avoid rate limit)
 *
 * Razão: Puxar dados recentes é rápido e não sofre tanto com rate limit
 * Período: Feb 1-26, 2026
 * Creatives: Pulado (skipCreatives: true)
 * Tempo estimado: 2-3 minutos
 * Rate limit: Muito baixo risco
 *
 * Uso: node export-feb-only.js [clientId]
 * Exemplo: node export-feb-only.js dr-erico-servano
 */

require('dotenv').config();
const CampaignsExporter = require('./lib/campaigns-exporter');

async function exportFebOnly() {
  const clientId = process.argv[2] || 'dr-erico-servano';

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📅 PHASE 1: Exportando dados de Fevereiro (1-26, 2026)`);
  console.log(`${'='.repeat(80)}\n`);
  console.log(`Cliente: ${clientId}`);
  console.log(`Período: 2026-02-01 até 2026-02-26`);
  console.log(`Creatives: PULADO (para evitar rate limit)`);
  console.log(`\nInício: ${new Date().toLocaleString('pt-BR')}\n`);

  const exporter = new CampaignsExporter();
  await exporter.init();

  try {
    // Phase 1: Fevereiro 1-26 (rápido, sem creatives)
    const feb1 = new Date('2026-02-01');
    const feb26 = new Date('2026-02-26');

    console.log(`⏱️  Buscando campanhas e insights para Fevereiro...\n`);

    const metaData = await exporter.fetchFromMetaAds(
      clientId,
      feb1,
      feb26,
      { skipCreatives: true } // IMPORTANTE: Skip creatives para ser mais rápido
    );

    console.log(`\n✅ Dados de Fevereiro buscados com sucesso`);
    console.log(`   Campanhas: ${metaData.campaigns.length}`);
    const totalDays = metaData.campaigns.reduce((sum, c) => sum + c.dailyInsights.length, 0);
    console.log(`   Total de dias: ${totalDays}`);

    // Salvar em Google Sheets
    console.log(`\n📊 Salvando em Google Sheets...`);
    const sheetData = await exporter.fetchFromGoogleSheets(clientId);
    const synthesis = await exporter.synthesizeData(clientId, metaData, sheetData);
    await exporter.saveToGoogleSheets(clientId, synthesis);

    console.log(`✅ Salvo em Google Sheets com sucesso`);

    // Salvar localmente também
    console.log(`\n💾 Salvando em JSON/Markdown/Excel localmente...`);
    await exporter.saveToJSON(clientId, synthesis);
    await exporter.saveToMarkdown(clientId, synthesis);
    await exporter.saveToExcel(clientId, synthesis);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ PHASE 1 CONCLUÍDA COM SUCESSO!`);
    console.log(`${'='.repeat(80)}`);
    console.log(`\n📍 Próximo passo (em ~2 horas):`);
    console.log(`   node export-jan-only.js ${clientId}`);
    console.log(`   (Para completar dados do mês passado)\n`);
    console.log(`📍 Depois de Phase 2 estar completa:`);
    console.log(`   node export-incremental.js ${clientId}`);
    console.log(`   (Para manter dados atualizados a cada 15 min)\n`);
    console.log(`Fim: ${new Date().toLocaleString('pt-BR')}\n`);

  } catch (err) {
    console.error(`\n❌ ERRO em PHASE 1:`);
    console.error(err.message);
    process.exit(1);
  }
}

exportFebOnly();
