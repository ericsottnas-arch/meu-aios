#!/usr/bin/env node
/**
 * Flavia Follower — Ardina Leads (Cron)
 *
 * Roda a cada hora via cron.
 * Busca contatos NOVOS atribuídos à Ardina Araujo criados desde a última execução.
 * Adiciona Flavia Sarraff como seguidora de todos eles.
 *
 * Configuração temporária — desativar quando Flavia retornar.
 * Para desativar: crontab -e e remover a linha deste script.
 *
 * Deploy: crontab -e
 * 0 * * * * node /home/synkra/meu-aios/scripts/flavia-follower-ardina-cron.js >> /var/log/flavia-follower.log 2>&1
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.GHL_HUMBERTO_TOKEN;
const LOCATION_ID = process.env.GHL_HUMBERTO_LOCATION_ID;
const ARDINA_ID  = 'ATW63K2pGMsgZpUZXysr';
const FLAVIA_ID  = 'B0gkXItNyfhJgUZgBDfF';

const STATE_FILE = '/tmp/flavia-follower-last-run.json';

function ghlGet(p) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'services.leadconnectorhq.com',
      path: p, method: 'GET',
      headers: { 'Authorization': 'Bearer ' + TOKEN, 'Version': '2021-07-28' }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

function ghlPost(p, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const opts = {
      hostname: 'services.leadconnectorhq.com',
      path: p, method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE));
  } catch {
    // Primeira execução: checar últimas 2h
    return { lastRun: Date.now() - 2 * 60 * 60 * 1000 };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
}

async function main() {
  const now = new Date();
  console.log(`[${now.toISOString()}] flavia-follower-ardina-cron iniciando...`);

  const state = loadState();
  const since = new Date(state.lastRun);
  console.log(`Buscando contatos da Ardina criados desde: ${since.toISOString()}`);

  // Buscar contatos novos filtrando por data de criação
  let newArdinaContacts = [];
  let startAfter = null;
  let startAfterId = null;
  let page = 1;

  while (true) {
    let url = `/contacts/?locationId=${LOCATION_ID}&limit=100`;
    if (startAfter && startAfterId) {
      url += `&startAfter=${startAfter}&startAfterId=${startAfterId}`;
    }

    const res = await ghlGet(url);
    if (res.status !== 200) {
      console.error('Erro ao buscar contatos:', res.status, res.body.substring(0, 200));
      break;
    }

    const data = JSON.parse(res.body);
    const contacts = data.contacts || [];
    const meta = data.meta || {};

    let foundOlder = false;
    for (const c of contacts) {
      const createdAt = new Date(c.dateAdded);
      if (createdAt < since) {
        foundOlder = true;
        continue;
      }
      if (c.assignedTo === ARDINA_ID) {
        newArdinaContacts.push({ id: c.id, name: `${c.firstName} ${c.lastName}` });
      }
    }

    // Se todos os contatos desta página são mais antigos, parar
    if (foundOlder && contacts.every(c => new Date(c.dateAdded) < since)) break;
    if (contacts.length < 100 || !meta.nextPageUrl) break;

    startAfter = meta.startAfter;
    startAfterId = meta.startAfterId;
    page++;

    await sleep(150);
  }

  console.log(`Novos contatos da Ardina: ${newArdinaContacts.length}`);

  if (newArdinaContacts.length === 0) {
    console.log('Nenhum contato novo. Finalizando.');
    saveState({ lastRun: Date.now() });
    return;
  }

  // Adicionar Flavia como seguidora
  let success = 0, failed = 0;
  for (const c of newArdinaContacts) {
    try {
      const res = await ghlPost(`/contacts/${c.id}/followers`, { followers: [FLAVIA_ID] });
      if (res.status === 201 || res.status === 200) {
        success++;
        console.log(`  ✅ ${c.name} (${c.id})`);
      } else if (res.status === 429) {
        console.log('Rate limit. Aguardando 5s...');
        await sleep(5000);
      } else {
        failed++;
        console.log(`  ❌ ${c.name} (${c.id}) — ${res.status}: ${res.body.substring(0, 100)}`);
      }
    } catch (e) {
      failed++;
      console.error(`  ❌ ${c.name} — ${e.message}`);
    }
    await sleep(150);
  }

  saveState({ lastRun: Date.now() });
  console.log(`Concluído: ✅ ${success} | ❌ ${failed}`);
  console.log(`Próxima execução em ~1h.`);
}

main().catch(err => {
  console.error('ERRO FATAL:', err.message);
  process.exit(1);
});
