#!/usr/bin/env node

/**
 * Script: Redistribuir leads do Dr. Humberto Andrade
 *
 * Logica:
 * - Contatos que entraram pelo numero DDD 96 (dddmacapa) → Flavia Sarraff
 * - Contatos que entraram pelo numero DDD 11 (dddsaopaulo) → Veronica Marise
 *
 * Identificacao: profilePhoto URL ou attachments das mensagens contem
 * o nome da instancia Stevo (dddmacapa ou dddsaopaulo)
 */

const https = require('https');

const CONFIG = {
  locationId: 'uOdD33rlNeQtBc3CatYL',
  token: 'pit-f38f236c-373f-48b3-9d1e-940043df2656',
  apiVersion: '2021-07-28',

  // User IDs
  users: {
    flavia: 'B0gkXItNyfhJgUZgBDfF',    // Numero A - DDD 96 (dddmacapa)
    veronica: 'od66JGJ9el9wZg7R3ves',    // Numero B - DDD 11 (dddsaopaulo)
  },

  // Stevo instance → user mapping
  instanceMap: {
    'dddmacapa': 'B0gkXItNyfhJgUZgBDfF',     // → Flavia
    'dddsaopaulo': 'od66JGJ9el9wZg7R3ves',    // → Veronica
  },

  // Rate limit: max requests per second
  rateLimit: 8,

  // Dry run (true = only report, false = execute changes)
  dryRun: process.argv.includes('--execute') ? false : true,
};

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${CONFIG.token}`,
        'Version': CONFIG.apiVersion,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function detectInstance(profilePhoto) {
  if (!profilePhoto) return null;
  if (profilePhoto.includes('dddmacapa')) return 'dddmacapa';
  if (profilePhoto.includes('dddsaopaulo')) return 'dddsaopaulo';
  return null;
}

function detectInstanceInMessages(messages) {
  for (const msg of messages) {
    const attachments = msg.attachments || [];
    for (const att of attachments) {
      if (att && att.includes('dddmacapa')) return 'dddmacapa';
      if (att && att.includes('dddsaopaulo')) return 'dddsaopaulo';
    }
    // Check body for Stevo URLs too
    const body = msg.body || '';
    if (body.includes('dddmacapa')) return 'dddmacapa';
    if (body.includes('dddsaopaulo')) return 'dddsaopaulo';
  }
  return null;
}

async function fetchAllContacts() {
  const allContacts = [];
  let startAfterId = '';
  let page = 0;

  while (true) {
    page++;
    let url = `/contacts/?locationId=${CONFIG.locationId}&limit=100`;
    if (startAfterId) url += `&startAfterId=${startAfterId}`;

    const data = await apiRequest('GET', url);
    const contacts = data.contacts || [];

    if (contacts.length === 0) break;

    allContacts.push(...contacts);

    const meta = data.meta || {};
    startAfterId = meta.startAfterId || '';

    console.log(`  Pagina ${page}: ${contacts.length} contatos (total acumulado: ${allContacts.length}/${meta.total || '?'})`);

    if (!meta.nextPage && !startAfterId) break;
    if (allContacts.length >= (meta.total || Infinity)) break;

    await sleep(150); // Rate limit
  }

  return allContacts;
}

async function getConversation(contactId) {
  const data = await apiRequest('GET',
    `/conversations/search?locationId=${CONFIG.locationId}&contactId=${contactId}&limit=1`);
  const convs = data.conversations || [];
  return convs[0] || null;
}

async function getMessages(conversationId) {
  const data = await apiRequest('GET',
    `/conversations/${conversationId}/messages?limit=20`);
  const msgs = data.messages || {};
  return (typeof msgs === 'object' && msgs.messages) ? msgs.messages : [];
}

async function updateContactAssignment(contactId, userId) {
  return apiRequest('PUT', `/contacts/${contactId}`, {
    assignedTo: userId,
  });
}

async function main() {
  console.log('=== Redistribuicao de Leads - Dr. Humberto Andrade ===');
  console.log(`Modo: ${CONFIG.dryRun ? 'DRY RUN (simulacao)' : 'EXECUCAO REAL'}`);
  console.log('');

  // Step 1: Fetch all contacts
  console.log('1. Buscando todos os contatos...');
  const contacts = await fetchAllContacts();
  console.log(`   Total: ${contacts.length} contatos\n`);

  // Step 2: Classify by profilePhoto
  console.log('2. Classificando por profilePhoto...');
  const classified = {
    dddmacapa: [],
    dddsaopaulo: [],
    unknown: [],
  };

  for (const c of contacts) {
    const instance = detectInstance(c.profilePhoto);
    if (instance) {
      classified[instance].push(c);
    } else {
      classified.unknown.push(c);
    }
  }

  console.log(`   dddmacapa (Flavia): ${classified.dddmacapa.length}`);
  console.log(`   dddsaopaulo (Veronica): ${classified.dddsaopaulo.length}`);
  console.log(`   Sem foto Stevo: ${classified.unknown.length}\n`);

  // Step 3: For unknown contacts, check conversation messages
  console.log('3. Verificando mensagens dos contatos sem foto Stevo...');
  let resolvedFromMessages = 0;
  let stillUnknown = 0;
  let errors = 0;

  for (let i = 0; i < classified.unknown.length; i++) {
    const contact = classified.unknown[i];

    if (i % 20 === 0 && i > 0) {
      console.log(`   Progresso: ${i}/${classified.unknown.length} (resolvidos: ${resolvedFromMessages}, sem identificacao: ${stillUnknown})`);
    }

    try {
      // Get conversation
      const conv = await getConversation(contact.id);
      await sleep(130);

      if (!conv) {
        stillUnknown++;
        continue;
      }

      // Check conversation profilePhoto first
      const convInstance = detectInstance(conv.profilePhoto);
      if (convInstance) {
        classified[convInstance].push(contact);
        resolvedFromMessages++;
        continue;
      }

      // Get messages and check attachments
      const messages = await getMessages(conv.id);
      await sleep(130);

      const msgInstance = detectInstanceInMessages(messages);
      if (msgInstance) {
        classified[msgInstance].push(contact);
        resolvedFromMessages++;
      } else {
        stillUnknown++;
      }
    } catch (err) {
      errors++;
      stillUnknown++;
    }
  }

  // Remove classified ones from unknown
  classified.unknown = classified.unknown.filter(c => {
    return !classified.dddmacapa.includes(c) && !classified.dddsaopaulo.includes(c);
  });

  console.log(`\n   Resolvidos via mensagens: ${resolvedFromMessages}`);
  console.log(`   Ainda sem identificacao: ${classified.unknown.length}`);
  console.log(`   Erros: ${errors}\n`);

  // Step 4: Report
  console.log('=== RELATORIO FINAL ===');
  console.log(`dddmacapa → Flavia:    ${classified.dddmacapa.length} contatos`);
  console.log(`dddsaopaulo → Veronica: ${classified.dddsaopaulo.length} contatos`);
  console.log(`Nao identificados:      ${classified.unknown.length} contatos`);
  console.log('');

  // Check how many already have correct assignment
  let alreadyCorrect = 0;
  let needsUpdate = 0;
  const updates = [];

  for (const c of classified.dddmacapa) {
    if (c.assignedTo === CONFIG.users.flavia) {
      alreadyCorrect++;
    } else {
      needsUpdate++;
      updates.push({ id: c.id, name: c.contactName, currentAssigned: c.assignedTo, newAssigned: CONFIG.users.flavia, instance: 'dddmacapa' });
    }
  }

  for (const c of classified.dddsaopaulo) {
    if (c.assignedTo === CONFIG.users.veronica) {
      alreadyCorrect++;
    } else {
      needsUpdate++;
      updates.push({ id: c.id, name: c.contactName, currentAssigned: c.assignedTo, newAssigned: CONFIG.users.veronica, instance: 'dddsaopaulo' });
    }
  }

  console.log(`Ja atribuidos corretamente: ${alreadyCorrect}`);
  console.log(`Precisam atualizar:         ${needsUpdate}`);
  console.log('');

  // Show first 20 updates as sample
  if (updates.length > 0) {
    console.log('Amostra das atualizacoes (primeiros 20):');
    for (const u of updates.slice(0, 20)) {
      const from = u.currentAssigned === CONFIG.users.flavia ? 'Flavia'
        : u.currentAssigned === CONFIG.users.veronica ? 'Veronica'
        : u.currentAssigned === 'ATW63K2pGMsgZpUZXysr' ? 'Ardina'
        : u.currentAssigned === 'HEMrRXCfuyYX0OlYHLD0' ? 'July'
        : u.currentAssigned === 'fnLKSe8X9TRS9evtqnCL' ? 'Simone'
        : u.currentAssigned === 'tvRjuPMCaPWWmTVFBkXJ' ? 'Zaya'
        : u.currentAssigned === 'rEPM0twkMSyjmg9BplNr' ? 'Tatiane'
        : u.currentAssigned || 'ninguem';
      const to = u.instance === 'dddmacapa' ? 'Flavia' : 'Veronica';
      console.log(`  ${u.name || 'sem nome'}: ${from} → ${to}`);
    }
    console.log('');
  }

  // Step 5: Execute updates (if not dry run)
  if (!CONFIG.dryRun && updates.length > 0) {
    console.log(`5. Executando ${updates.length} atualizacoes...`);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < updates.length; i++) {
      const u = updates[i];

      if (i % 50 === 0 && i > 0) {
        console.log(`   Progresso: ${i}/${updates.length} (sucesso: ${success}, falha: ${failed})`);
      }

      try {
        await updateContactAssignment(u.id, u.newAssigned);
        success++;
      } catch (err) {
        failed++;
        console.error(`   ERRO ao atualizar ${u.id} (${u.name}): ${err.message}`);
      }

      await sleep(130); // Rate limit ~8/sec
    }

    console.log(`\n=== RESULTADO ===`);
    console.log(`Atualizados com sucesso: ${success}`);
    console.log(`Falhas: ${failed}`);
  } else if (CONFIG.dryRun) {
    console.log('--- DRY RUN: Nenhuma alteracao feita ---');
    console.log('Para executar: node scripts/ghl-reassign-leads.js --execute');
  }

  // Report unknown contacts
  if (classified.unknown.length > 0) {
    console.log(`\n=== CONTATOS NAO IDENTIFICADOS (${classified.unknown.length}) ===`);
    console.log('Estes contatos nao puderam ser associados a nenhum dos dois numeros:');
    for (const c of classified.unknown.slice(0, 30)) {
      console.log(`  ${c.id} - ${c.contactName || 'sem nome'} - ${c.phone || 'sem tel'} - assigned: ${c.assignedTo || 'ninguem'}`);
    }
    if (classified.unknown.length > 30) {
      console.log(`  ... e mais ${classified.unknown.length - 30}`);
    }
  }
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
