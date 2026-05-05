/**
 * Otimizações Meta Ads — Dr. Humberto Andrade — 24/abr/2026
 *
 * Ações:
 *   1. PAUSAR P6 SP Pinheiros/Itaim (CPL R$24,15 — inaceitável)
 *   2. ESCALAR P4 Otoplastia: R$23 → R$40/dia (melhor CPL R$5,03)
 *   3. Listar adsets ativos com budget atual (diagnóstico)
 *
 * P6 adset ID conhecido: 120248562899320460
 * P4 adset ID: buscado via API (match por nome)
 */

const https = require('https');
require('dotenv').config({ path: 'meu-projeto/.env' });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_445142030338909';
const CAMP4_ID   = '120248326623540460'; // Campanha 4 — Procedimento Frio [ABO]

const P6_ADSET_ID = '120248562899320460'; // P6 SP Pinheiros/Itaim — CPL R$24,15

function httpsReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'graph.facebook.com',
      path: '/v21.0' + path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('━━━ Otimizações Humberto — 24/abr/2026 ━━━\n');

  // 1. Buscar todos os adsets da Campanha 4
  console.log('Buscando adsets da Campanha 4...');
  const asRes = await httpsReq('GET',
    `/${CAMP4_ID}/adsets?fields=id,name,status,daily_budget&access_token=${TOKEN}`
  );

  if (asRes.body.error) {
    console.error('✗ API error:', asRes.body.error.message);
    process.exit(1);
  }

  const adsets = asRes.body.data || [];
  console.log(`  ${adsets.length} adsets encontrados:\n`);
  adsets.forEach(as => {
    const budget = as.daily_budget ? 'R$' + (parseInt(as.daily_budget)/100).toFixed(0) + '/d' : 'CBO';
    console.log(`  ${as.id} | ${budget} | ${as.status} | ${as.name}`);
  });

  console.log('\n');
  await sleep(1000);

  // 2. PAUSAR P6 SP Pinheiros/Itaim
  console.log('━ Ação 1: Pausar P6 SP Pinheiros/Itaim ━');
  const pauseRes = await httpsReq('POST',
    `/${P6_ADSET_ID}?access_token=${TOKEN}`,
    { status: 'PAUSED' }
  );

  if (pauseRes.body.success) {
    console.log('  ✓ P6 pausado — CPL R$24,15 eliminado da conta');
  } else {
    console.error('  ✗ Falha ao pausar P6:', JSON.stringify(pauseRes.body));
  }

  await sleep(1500);

  // 3. ESCALAR P4 Otoplastia: R$23 → R$40/dia
  console.log('\n━ Ação 2: Escalar P4 Otoplastia R$23→R$40/dia ━');
  const p4 = adsets.find(a =>
    a.name.toLowerCase().includes('otoplastia') ||
    a.name.toLowerCase().includes('p4')
  );

  if (!p4) {
    console.error('  ✗ P4 Otoplastia não encontrado entre os adsets.');
    console.log('  IDs disponíveis:', adsets.map(a => a.id).join(', '));
  } else {
    console.log(`  Encontrado: ${p4.name} (${p4.id})`);
    console.log(`  Budget atual: R$${(parseInt(p4.daily_budget)/100).toFixed(0)}/dia`);

    const scaleRes = await httpsReq('POST',
      `/${p4.id}?access_token=${TOKEN}`,
      { daily_budget: 4000 } // R$40,00 = 4000 centavos
    );

    if (scaleRes.body.success) {
      console.log('  ✓ P4 escalado: R$23 → R$40/dia');
    } else {
      console.error('  ✗ Falha ao escalar P4:', JSON.stringify(scaleRes.body));
    }
  }

  console.log('\n━━━ RESUMO ━━━');
  console.log('P6 Pinheiros/Itaim: PAUSADO (CPL R$24,15)');
  console.log('P4 Otoplastia: R$40/dia (era R$23/dia)');
  console.log('\nPróximas ações pendentes:');
  console.log('  - Novos criativos P1/P1-Morno (freq alta)');
  console.log('  - Criar Campanhas 4 e 7 QUENTE WhatsApp');
  console.log('  - Verificar P8 João Pessoa (0 spend)');
}

main().catch(console.error);
