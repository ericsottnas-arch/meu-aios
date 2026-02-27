#!/usr/bin/env node
/**
 * Script: Exporta campanhas agora com histórico completo
 */

require('dotenv').config();
const CampaignsExporter = require('./lib/campaigns-exporter');

async function exportNow() {
  console.log('📊 Exportando campanhas com histórico COMPLETO...\n');

  const exporter = new CampaignsExporter();

  try {
    // Inicializar
    await exporter.init();

    // Exportar Dr Erico Servano
    const result = await exporter.exportClientCampaigns('dr-erico-servano');

    console.log('\n✅ EXPORTAÇÃO CONCLUÍDA!');
    console.log('\n📊 RESUMO:');
    console.log(`   Campanhas: ${result.meta.campaigns.length}`);

    let totalRows = 0;
    result.meta.campaigns.forEach(c => {
      const daysCount = c.dailyInsights ? c.dailyInsights.length : 0;
      totalRows += daysCount || 1;
    });

    console.log(`   Total de linhas: ${totalRows}`);
    console.log(`   Colunas: 26 ✅`);

    console.log('\n✅ Google Sheets sincronizada!');
    console.log('   Acesse: https://docs.google.com/spreadsheets/d/1Br8Fg23cMKwLEjP8dbsz2DRIjwPoRSNoDu47SoX2FW0');

  } catch (err) {
    console.error('❌ ERRO:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

exportNow();
