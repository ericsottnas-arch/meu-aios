#!/usr/bin/env node
/**
 * PHASE 2: Export January data (complete historical)
 *
 * Razão: Após Feb estar salva, puxar January para completar histórico
 * Período: Jan 1-31, 2026
 * Creatives: INCLUÍDO (agora que Phase 1 já pode aliviar o rate limit)
 * Tempo estimado: 5-10 minutos
 * Rate limit: Médio (pode sofrer, mas com retry logic vai funcionar)
 *
 * Uso: node export-jan-only.js [clientId]
 * Exemplo: node export-jan-only.js dr-erico-servano
 *
 * ⏰ TIMING:
 * - Phase 1 (Feb): node export-feb-only.js
 * - Aguardar ~2 horas
 * - Phase 2 (Jan): node export-jan-only.js  ← VOCÊ ESTÁ AQUI
 * - Phase 3 (Incremental): node export-incremental.js (a cada 15 min)
 */

require('dotenv').config();
const CampaignsExporter = require('./lib/campaigns-exporter');

async function exportJanOnly() {
  const clientId = process.argv[2] || 'dr-erico-servano';

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📅 PHASE 2: Exportando dados de Janeiro (1-31, 2026)`);
  console.log(`${'='.repeat(80)}\n`);
  console.log(`Cliente: ${clientId}`);
  console.log(`Período: 2026-01-01 até 2026-01-31`);
  console.log(`Creatives: INCLUÍDO (rodará mais lentamente)`);
  console.log(`\nInício: ${new Date().toLocaleString('pt-BR')}\n`);

  const exporter = new CampaignsExporter();
  await exporter.init();

  try {
    // Phase 2: Janeiro 1-31 (com creatives para completar histórico)
    const jan1 = new Date('2026-01-01');
    const jan31 = new Date('2026-01-31');

    console.log(`⏱️  Buscando campanhas e insights para Janeiro...\n`);

    const metaData = await exporter.fetchFromMetaAds(
      clientId,
      jan1,
      jan31,
      { skipCreatives: false } // INCLUIR creatives (Phase 1 aliviou o rate limit)
    );

    console.log(`\n✅ Dados de Janeiro buscados com sucesso`);
    console.log(`   Campanhas: ${metaData.campaigns.length}`);
    const totalDays = metaData.campaigns.reduce((sum, c) => sum + c.dailyInsights.length, 0);
    console.log(`   Total de dias: ${totalDays}`);
    const totalAdsets = metaData.campaigns.reduce((sum, c) => sum + c.adsets.length, 0);
    console.log(`   Total de adsets: ${totalAdsets}`);

    // Salvar em Google Sheets (MERGE com dados existentes de Feb)
    console.log(`\n📊 Salvando em Google Sheets (mergeando com Feb)...`);
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
    console.log(`✅ PHASE 2 CONCLUÍDA COM SUCESSO!`);
    console.log(`${'='.repeat(80)}`);
    console.log(`\n🎉 Agora você tem:`);
    console.log(`   ✅ Fevereiro 1-26 (Phase 1)`);
    console.log(`   ✅ Janeiro 1-31 (Phase 2 - VOCÊ ESTÁ AQUI)`);
    console.log(`   📍 Próximo: Phase 3 - Incremental updates a cada 15 min\n`);
    console.log(`📍 Para manter dados atualizados daqui pra frente:`);
    console.log(`   node export-incremental.js ${clientId}`);
    console.log(`   (Execute isso a cada 15 minutos ou configure em cron/scheduler)\n`);
    console.log(`Fim: ${new Date().toLocaleString('pt-BR')}\n`);

  } catch (err) {
    console.error(`\n❌ ERRO em PHASE 2:`);
    console.error(err.message);
    if (err.response?.error?.message) {
      console.error(`Meta API Error: ${err.response.error.message}`);
    }
    process.exit(1);
  }
}

exportJanOnly();
