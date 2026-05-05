#!/usr/bin/env node
/**
 * Fix Anna v2 — Dr. Enio
 * Abordagem via conversations (não contacts):
 * 1. Busca TODAS as conversas atribuídas à Anna
 * 2. Filtra Instagram (lastMessageType contém INSTAGRAM)
 * 3. Para cada conversa, pega o contactId e atualiza contact.assignedTo = null
 *    (isso propaga automaticamente para a conversa)
 * 4. Continua até não sobrar nenhuma
 */

require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });

const GHL_TOKEN   = process.env.GHL_ENIO_API_KEY;
const LOCATION_ID = process.env.GHL_ENIO_LOCATION_ID;
const ANNA_ID     = '28UD0m4zHFmx2xrZZ1YR';
const BASE        = 'https://services.leadconnectorhq.com';
const PAGE_LIMIT  = 100;

const headers = {
  'Authorization': `Bearer ${GHL_TOKEN}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function put(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT', headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

// Busca uma página de conversas Instagram atribuídas à Anna
async function fetchIGConversationPage(skip = 0) {
  const params = new URLSearchParams({
    locationId: LOCATION_ID,
    assignedTo: ANNA_ID,
    limit: PAGE_LIMIT,
    skip,
  });
  const data = await get(`/conversations/search?${params}`);
  const convs = (data.conversations || []).filter(c =>
    (c.lastMessageType || '').includes('INSTAGRAM')
  );
  return { convs, total: data.total || 0 };
}

async function main() {
  console.log('=== Fix Anna v2 — Instagram Enio ===\n');

  let round = 0;
  let totalFixed = 0;
  const processedContacts = new Set();

  // Loop até não encontrar mais conversas IG atribuídas à Anna
  while (true) {
    round++;
    console.log(`🔄 Round ${round}: buscando conversas Instagram da Anna...`);

    const { convs, total } = await fetchIGConversationPage(0);

    console.log(`   Total na conta: ${total} | Instagram encontradas: ${convs.length}`);

    if (convs.length === 0) {
      console.log('   ✅ Nenhuma conversa Instagram restante!');
      break;
    }

    // Dedupe por contactId
    const contactIds = [...new Set(
      convs.map(c => c.contactId).filter(id => id && !processedContacts.has(id))
    )];

    console.log(`   Contatos únicos novos: ${contactIds.length}`);

    if (contactIds.length === 0) {
      // Todas as conversas são de contatos já processados — problema de cache
      // Aguarda e tenta novamente
      console.log('   ⏳ Todos já processados — aguardando cache do GHL sincronizar...');
      await sleep(3000);
      round++;
      if (round > 10) {
        console.log('   ⚠️  Muitas tentativas sem progresso. Encerrando.');
        break;
      }
      continue;
    }

    let ok = 0, err = 0;
    for (const contactId of contactIds) {
      try {
        await put(`/contacts/${contactId}`, { assignedTo: null });
        processedContacts.add(contactId);
        ok++;
        await sleep(150);
      } catch (e) {
        err++;
        console.error(`   ❌ Contato ${contactId}: ${e.message}`);
      }
    }

    totalFixed += ok;
    console.log(`   ✅ ${ok} contatos desatribuídos (${err} erros) | Total geral: ${totalFixed}`);
    await sleep(1000); // aguarda cache do GHL atualizar
  }

  // Verificação final
  console.log('\n📊 Verificação final...');
  const { convs: remaining, total } = await fetchIGConversationPage(0);
  console.log(`   Total conversas atribuídas à Anna: ${total}`);
  console.log(`   Instagram ainda atribuídas: ${remaining.length}`);
  console.log(`   Contatos processados: ${processedContacts.size}`);
  console.log(`   Total desatribuídos: ${totalFixed}`);

  if (remaining.length === 0) {
    console.log('\n🎉 Concluído! Nenhuma conversa Instagram visível para Anna.');
  } else {
    console.log(`\n⚠️  Restam ${remaining.length} conversas Instagram — pode ser cache do GHL.`);
    console.log('   Aguarde alguns minutos e verifique novamente na UI.');
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
