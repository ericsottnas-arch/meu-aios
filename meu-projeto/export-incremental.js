#!/usr/bin/env node
/**
 * PHASE 3: Incremental export (ongoing, every 15 minutes)
 *
 * Razão: Depois que histórico completo está salvo (Phase 1 + 2),
 *        puxar apenas últimos 7 dias para atualizar novos dados
 * Período: Últimos 7 dias (rolling window)
 * Creatives: PULADO (incremental não precisa de creatives, só métricas)
 * Tempo estimado: 30 segundos - 1 minuto
 * Rate limit: MUITO BAIXO (últimos 7 dias = menos dados)
 *
 * Uso: node export-incremental.js [clientId] [daysBack]
 * Exemplo: node export-incremental.js dr-erico-servano 7
 *
 * 🔄 STRATEGY:
 * 1. Puxar últimos 7 dias da Meta Ads API
 * 2. Mesclar com dados existentes em Google Sheets (sobrescrever últimas 7 dias)
 * 3. Não reescrever tudo, só atualizar últimas linhas
 *
 * ⏰ TIMING:
 * - Phase 1 (Feb): node export-feb-only.js
 * - Aguardar ~2 horas
 * - Phase 2 (Jan): node export-jan-only.js
 * - Phase 3 (Incremental): DEPOIS disso, executar a cada 15 min
 *   - Opção 1: Manual (a cada 15 min)
 *   - Opção 2: Cron job (recomendado)
 *   - Opção 3: Scheduler no Celo Agent (meu-projeto/celo-agent-server.js)
 */

require('dotenv').config();
const CampaignsExporter = require('./lib/campaigns-exporter');

async function exportIncremental() {
  const clientId = process.argv[2] || 'dr-erico-servano';
  const daysBack = parseInt(process.argv[3] || '7', 10);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔄 PHASE 3: Atualização Incremental (últimos ${daysBack} dias)`);
  console.log(`${'='.repeat(80)}\n`);
  console.log(`Cliente: ${clientId}`);

  // Calcular data range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  console.log(`Período: ${startDate.toISOString().split('T')[0]} até ${endDate.toISOString().split('T')[0]}`);
  console.log(`Creatives: PULADO (incremental = apenas métricas)`);
  console.log(`\nInício: ${new Date().toLocaleString('pt-BR')}\n`);

  const exporter = new CampaignsExporter();
  await exporter.init();

  try {
    console.log(`⏱️  Buscando campanhas e insights para últimos ${daysBack} dias...\n`);

    const metaData = await exporter.fetchFromMetaAds(
      clientId,
      startDate,
      endDate,
      { skipCreatives: true } // SKIP creatives (incremental não precisa)
    );

    console.log(`\n✅ Dados incrementais buscados com sucesso`);
    console.log(`   Campanhas atualizadas: ${metaData.campaigns.length}`);
    const totalDays = metaData.campaigns.reduce((sum, c) => sum + c.dailyInsights.length, 0);
    console.log(`   Total de linhas: ${totalDays}`);

    // Salvar em Google Sheets (APPEND/UPDATE - não sobrescrever histórico)
    console.log(`\n📊 Atualizando Google Sheets (mergear com histórico)...`);
    const sheetData = await exporter.fetchFromGoogleSheets(clientId);
    const synthesis = await exporter.synthesizeData(clientId, metaData, sheetData);
    await exporter.saveToGoogleSheets(clientId, synthesis);

    console.log(`✅ Google Sheets atualizado com sucesso`);

    // Salvar localmente (para referência)
    console.log(`\n💾 Atualizando arquivos locais...`);
    await exporter.saveToJSON(clientId, synthesis);
    await exporter.saveToMarkdown(clientId, synthesis);
    await exporter.saveToExcel(clientId, synthesis);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ PHASE 3 CONCLUÍDA COM SUCESSO!`);
    console.log(`${'='.repeat(80)}`);
    console.log(`\n⏰ Próxima atualização: daqui 15 minutos`);
    console.log(`   node export-incremental.js ${clientId}\n`);
    console.log(`Fim: ${new Date().toLocaleString('pt-BR')}\n`);

  } catch (err) {
    console.error(`\n❌ ERRO em PHASE 3:`);
    console.error(err.message);
    if (err.response?.error?.message) {
      console.error(`Meta API Error: ${err.response.error.message}`);
    }
    // Não fazer exit(1) para que se estiver em scheduler não quebre
    process.exit(0);
  }
}

exportIncremental();
