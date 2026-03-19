#!/usr/bin/env node
/**
 * ClickSign API Test Script
 * Tests the full contract flow using sandbox environment
 *
 * Usage: node test-clicksign.js
 *
 * Prerequisites:
 *   - CLICKSIGN_API_KEY in .env
 *   - Contract PDF in Downloads folder
 */

require('dotenv').config();
const { ClickSignAPI, ERIC_CONTRATADA } = require('./lib/clicksign');

const API_KEY = process.env.CLICKSIGN_API_KEY;
const CONTRACT_PDF = '/Users/ericsantos/Downloads/CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ASSESSORIA DE MARKETING.pdf';

// Test client data (Dra. Vanessa - from existing contract)
const CLIENT_CONTRATANTE = {
  name: 'VANESSA SOARES LOPES',
  email: 'vanessasoares.dra@gmail.com'
};

async function testConnection() {
  console.log('═══════════════════════════════════════');
  console.log('  ClickSign API Test (Sandbox)');
  console.log('═══════════════════════════════════════\n');

  if (!API_KEY) {
    console.error('❌ CLICKSIGN_API_KEY não encontrada no .env');
    console.log('\nAdicione no .env:');
    console.log('CLICKSIGN_API_KEY=sua_chave_aqui');
    process.exit(1);
  }

  const api = new ClickSignAPI({ apiKey: API_KEY, sandbox: true });

  // Test 1: List envelopes (connectivity test)
  console.log('🔌 Test 1: Conexão com API...');
  try {
    const envelopes = await api.listEnvelopes();
    console.log(`   ✅ Conectado! ${envelopes.data?.length || 0} envelopes existentes.\n`);
  } catch (err) {
    console.error(`   ❌ Falha na conexão: ${err.message}`);
    if (err.status === 401) console.log('   → API key inválida ou expirada');
    if (err.status === 403) console.log('   → Sem permissão - verifique o plano da conta');
    process.exit(1);
  }

  // Test 2: Full contract flow
  console.log('📋 Test 2: Fluxo completo de contrato...');
  try {
    const result = await api.sendContract({
      contractName: '[TESTE] Contrato - Dra. Vanessa Soares',
      pdfPath: CONTRACT_PDF,
      contratada: ERIC_CONTRATADA,
      contratante: CLIENT_CONTRATANTE,
      autoSignEric: false  // Set true after signing the auto-signature term
    });

    console.log('═══════════════════════════════════════');
    console.log('  RESULTADO DO TESTE');
    console.log('═══════════════════════════════════════');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n✅ Todos os testes passaram!');
    console.log('⚠️  Como é sandbox, nenhum email real será enviado.');

  } catch (err) {
    console.error(`\n❌ Erro no fluxo: ${err.message}`);
    if (err.response) console.error('Response:', JSON.stringify(err.response, null, 2));
  }
}

// Run a specific test only
const testArg = process.argv[2];

if (testArg === '--connection-only') {
  (async () => {
    if (!API_KEY) {
      console.error('❌ CLICKSIGN_API_KEY não encontrada no .env');
      process.exit(1);
    }
    const api = new ClickSignAPI({ apiKey: API_KEY, sandbox: true });
    try {
      const envelopes = await api.listEnvelopes();
      console.log(`✅ Conexão OK! ${envelopes.data?.length || 0} envelopes.`);
    } catch (err) {
      console.error(`❌ Falha: ${err.message}`);
      process.exit(1);
    }
  })();
} else {
  testConnection();
}
