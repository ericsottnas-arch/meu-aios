#!/usr/bin/env node
/**
 * Fix Anna — Dr. Enio
 * 1. Busca TODAS as conversas atribuídas à Anna
 * 2. Filtra apenas Instagram (lastMessageType contém INSTAGRAM)
 * 3. Remove atribuição (unassign)
 * 4. Atualiza permissões dela para ver apenas conversas atribuídas a ela
 */

require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });

const GHL_TOKEN   = process.env.GHL_ENIO_API_KEY;
const LOCATION_ID = process.env.GHL_ENIO_LOCATION_ID;
const ANNA_ID     = '28UD0m4zHFmx2xrZZ1YR';
const BASE_URL    = 'https://services.leadconnectorhq.com';
const PAGE_LIMIT  = 100;

const headers = {
  'Authorization': `Bearer ${GHL_TOKEN}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function request(method, path, body = null) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${txt}`);
  }
  return res.json();
}

// Busca todas as conversas da Anna com paginação
async function getAllAnnaConversations() {
  const all = [];
  let page = 1;
  let fetched = 0;
  let total = null;

  while (true) {
    const params = new URLSearchParams({
      locationId: LOCATION_ID,
      assignedTo: ANNA_ID,
      limit: PAGE_LIMIT,
      skip: (page - 1) * PAGE_LIMIT,
    });

    const data = await request('GET', `/conversations/search?${params}`);
    if (total === null) total = data.total || 0;

    const convs = data.conversations || [];
    if (convs.length === 0) break;

    all.push(...convs);
    fetched += convs.length;
    console.log(`  Fetched ${fetched}/${total}...`);

    if (fetched >= total) break;
    page++;
    await sleep(300);
  }

  return all;
}

// Unassign um contato (e todas as suas conversas automaticamente)
async function unassignContact(contactId) {
  return request('PUT', `/contacts/${contactId}`, { assignedTo: null });
}

// Atualiza permissões da Anna para ver APENAS conversas atribuídas a ela
async function restrictAnnaPermissions() {
  const updatePayload = {
    // Manter os scopes existentes (contacts.write, opportunities.write) + adicionar conversations
    scopesAssignedToOnly: [
      'contacts.write',
      'opportunities.write',
      'conversations.readonly',
      'conversations.write',
      'conversations/message.readonly',
      'conversations/message.write',
    ],
    // Ativar assignedDataOnly para bloquear conversas não atribuídas
    permissions: {
      assignedDataOnly: true,
    },
  };

  const result = await request('PUT', `/users/${ANNA_ID}`, updatePayload);
  return result;
}

async function main() {
  console.log('=== Fix Anna — Dr. Enio Instagram ===\n');
  console.log(`Token: ${GHL_TOKEN?.substring(0, 20)}...`);
  console.log(`Location: ${LOCATION_ID}`);
  console.log(`Anna ID: ${ANNA_ID}\n`);

  // STEP 1: Buscar todas as conversas
  console.log('📥 Buscando todas as conversas da Anna...');
  const allConversations = await getAllAnnaConversations();
  console.log(`✅ Total encontrado: ${allConversations.length} conversas\n`);

  // STEP 2: Filtrar Instagram
  const igConversations = allConversations.filter(c => {
    const lastType = (c.lastMessageType || '').toUpperCase();
    const type     = (c.type || '').toUpperCase();
    const channel  = (c.channel || '').toUpperCase();
    return lastType.includes('INSTAGRAM') || type.includes('INSTAGRAM') || channel.includes('INSTAGRAM');
  });

  console.log(`📸 Conversas Instagram encontradas: ${igConversations.length}`);
  if (igConversations.length === 0) {
    console.log('Nenhuma conversa Instagram para processar.');
    return;
  }

  // Mostrar sample
  console.log('\nSample das primeiras 5:');
  igConversations.slice(0, 5).forEach(c => {
    console.log(`  - ${c.id} | ${c.lastMessageType} | contact: ${c.contactId} | lastMsg: ${(c.lastMessageBody || '').substring(0, 40)}`);
  });

  // STEP 3: Unassign todas
  console.log(`\n🔄 Removendo atribuição de ${igConversations.length} conversas...`);
  let success = 0;
  let errors = 0;

  // Dedupe por contactId (um contato pode ter múltiplas convs Instagram)
  const contactIds = [...new Set(igConversations.map(c => c.contactId).filter(Boolean))];
  console.log(`   Contatos únicos a desatribuir: ${contactIds.length}`);

  for (let i = 0; i < contactIds.length; i++) {
    const contactId = contactIds[i];
    try {
      await unassignContact(contactId);
      success++;
      if ((i + 1) % 20 === 0 || i === contactIds.length - 1) {
        console.log(`  ${i + 1}/${contactIds.length} processados (${success} ok, ${errors} erros)`);
      }
      await sleep(200); // rate limit
    } catch (err) {
      errors++;
      console.error(`  ❌ Erro em contato ${contactId}: ${err.message}`);
    }
  }

  console.log(`\n✅ Unassign concluído: ${success} contatos desatribuídos, ${errors} erros`);

  // STEP 4: Restringir permissões da Anna
  console.log('\n🔒 Atualizando permissões da Anna...');
  try {
    const result = await restrictAnnaPermissions();
    console.log('✅ Permissões atualizadas:');
    console.log(`   scopesAssignedToOnly: ${JSON.stringify(result.scopesAssignedToOnly)}`);
  } catch (err) {
    console.error(`❌ Erro ao atualizar permissões: ${err.message}`);
    console.log('\n⚠️  As permissões precisam ser ajustadas manualmente no GHL:');
    console.log('   Settings > Team > Anna > Permissions > "Assigned Only" para Conversations');
  }

  console.log('\n=== CONCLUÍDO ===');
  console.log(`📊 Resumo:`);
  console.log(`   - Total conversas da Anna: ${allConversations.length}`);
  console.log(`   - Contatos Instagram desatribuídos: ${success}`);
  console.log(`   - Erros: ${errors}`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
