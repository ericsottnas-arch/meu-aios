#!/usr/bin/env node
/**
 * Setup tracking avançado — Dr. Humberto Andrade
 * Cria custom values: API Meta Ads + Pixel Assessoria
 */
const path  = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN = process.env.GHL_HUMBERTO_TOKEN;
const LOC   = process.env.GHL_HUMBERTO_LOCATION_ID;
const PIXEL_ID = '1354726053083764';
// Token CAPI — por ora usa o token de sistema com acesso ao pixel
// (Victor deve gerar um token dedicado no Meta Events Manager se necessário)
const CAPI_TOKEN = process.env.META_ACCESS_TOKEN;

function apiPost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: endpoint,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
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

function apiGet(endpoint) {
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

async function createOrUpdateCustomValue(name, value) {
  // Buscar existentes
  const existing = await apiGet(`/locations/${LOC}/customValues`);
  const found = existing.customValues?.find(v => v.name.toLowerCase() === name.toLowerCase());
  
  if (found) {
    // Update via PUT
    const res = await new Promise((resolve, reject) => {
      const data = JSON.stringify({ name, value });
      const options = {
        hostname: 'services.leadconnectorhq.com',
        path: `/locations/${LOC}/customValues/${found.id}`,
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Version: '2021-07-28',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
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
    return { action: 'updated', id: found.id, name, value: value.slice(0, 30) };
  } else {
    // Create
    const res = await apiPost(`/locations/${LOC}/customValues`, { name, value });
    return { action: 'created', id: res.customValue?.id, name, value: value.slice(0, 30) };
  }
}

async function main() {
  console.log('🔧 Criando custom values no GHL Humberto...\n');

  const r1 = await createOrUpdateCustomValue('Pixel Assessoria', PIXEL_ID);
  console.log(`${r1.action === 'created' ? '✅ Criado' : '🔄 Atualizado'}: ${r1.name} = ${r1.value} [${r1.id}]`);

  const r2 = await createOrUpdateCustomValue('API Meta Ads', CAPI_TOKEN);
  console.log(`${r2.action === 'created' ? '✅ Criado' : '🔄 Atualizado'}: ${r2.name} = ${r2.value}... [${r2.id}]`);

  console.log('\n✅ Custom values configurados. Próximo passo: criar os 4 workflows no GHL UI.');
}
main().catch(e => { console.error(e.message); process.exit(1); });
