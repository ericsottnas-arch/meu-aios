#!/usr/bin/env node
/**
 * Teste dos workflows de tracking — Dr. Humberto
 * 1. Busca um contato real com tag mql
 * 2. Remove e readiciona a tag mql (dispara o workflow Meta > MQL)
 * 3. Verifica no Meta Events Manager se o evento chegou
 */
const path  = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN    = process.env.GHL_HUMBERTO_TOKEN;
const LOC      = process.env.GHL_HUMBERTO_LOCATION_ID;
const PIXEL_ID = '1354726053083764';
const META_TOKEN = process.env.META_ACCESS_TOKEN;

function ghlGet(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: endpoint,
      headers: { Authorization: `Bearer ${TOKEN}`, Version: '2021-07-28' }
    };
    https.get(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({ raw: d }); } });
    }).on('error', reject);
  });
}

function ghlPost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: endpoint,
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, Version: '2021-07-28', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({ raw: d }); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function ghlDelete(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: endpoint,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${TOKEN}`, Version: '2021-07-28' }
    };
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({ raw: d }); } });
    });
    req.on('error', reject);
    req.end();
  });
}

function metaGet(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'graph.facebook.com',
      path: endpoint + (endpoint.includes('?') ? '&' : '?') + `access_token=${META_TOKEN}`,
    };
    https.get(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({ raw: d }); } });
    }).on('error', reject);
  });
}

async function main() {
  // 1. Buscar contato com tag mql
  console.log('🔍 Buscando contato com tag mql...');
  const contacts = await ghlGet(`/contacts/?locationId=${LOC}&tags=mql&limit=1`);
  
  let testContact;
  if (contacts.contacts && contacts.contacts.length > 0) {
    testContact = contacts.contacts[0];
    console.log(`  Encontrado: ${testContact.firstName} ${testContact.lastName || ''} | ${testContact.id}`);
  } else {
    // Buscar qualquer contato recente
    console.log('  Nenhum contato com tag mql. Buscando contato recente...');
    const recent = await ghlGet(`/contacts/?locationId=${LOC}&limit=1`);
    testContact = recent.contacts?.[0];
    if (!testContact) { console.log('  Nenhum contato encontrado.'); process.exit(1); }
    console.log(`  Usando: ${testContact.firstName} ${testContact.lastName || ''} | ${testContact.id}`);
  }

  // 2. Checar estado atual de eventos no Meta (últimos 5 min)
  console.log('\n📊 Checando eventos recentes no Meta Pixel...');
  const now = Math.floor(Date.now() / 1000);
  const stats = await metaGet(`/v19.0/${PIXEL_ID}/stats?start_time=${now - 300}&end_time=${now}&aggregation=event_name`);
  if (stats.data && stats.data.length > 0) {
    console.log('  Eventos nos últimos 5min:');
    stats.data.forEach(e => console.log(`    ${e.event_name}: ${e.count}`));
  } else {
    console.log('  Nenhum evento nos últimos 5min (baseline limpo ✅)');
  }

  // 3. Disparar workflow MQL — remover tag mql se existir, depois adicionar
  console.log(`\n🚀 Disparando workflow "Meta > MQL" via tag mql...`);
  const hasMql = testContact.tags?.includes('mql');
  
  if (hasMql) {
    console.log('  Removendo tag mql existente...');
    await ghlDelete(`/contacts/${testContact.id}/tags?locationId=${LOC}&tags=mql`);
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('  Adicionando tag mql...');
  const addRes = await ghlPost(`/contacts/${testContact.id}/tags`, { tags: ['mql'] });
  console.log('  Tag adicionada:', addRes.tags ? '✅' : JSON.stringify(addRes).slice(0, 100));

  // 4. Aguardar e checar se o evento chegou no Meta
  console.log('\n⏳ Aguardando 15s para o evento processar...');
  await new Promise(r => setTimeout(r, 15000));

  console.log('\n📊 Checando eventos no Meta Pixel após disparo...');
  const nowAfter = Math.floor(Date.now() / 1000);
  const statsAfter = await metaGet(`/v19.0/${PIXEL_ID}/stats?start_time=${nowAfter - 120}&end_time=${nowAfter}&aggregation=event_name`);
  if (statsAfter.data && statsAfter.data.length > 0) {
    console.log('  Eventos recebidos:');
    statsAfter.data.forEach(e => console.log(`    ${e.event_name}: ${e.count}`));
  } else {
    console.log('  ⚠️  Nenhum evento detectado ainda (pode ter delay de até 20min no Meta)');
    console.log('  → Verificar manualmente no Events Manager: https://business.facebook.com/events_manager2');
  }

  console.log(`\n📋 Contato de teste: ${testContact.firstName} ${testContact.lastName || ''}`);
  console.log(`   ID: ${testContact.id}`);
  console.log(`   Pixel: ${PIXEL_ID}`);
  console.log(`   Evento esperado: SubmitApplication`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
