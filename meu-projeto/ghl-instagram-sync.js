#!/usr/bin/env node

// Sincronizar mensagens do Instagram a cada 10 minutos
// Busca da Meta Graph API e salva no banco local

const path = require('path');
const fs = require('fs');

if (process.env.NODE_ENV !== 'production') {
  const localEnv = path.resolve(__dirname, '.env');
  const parentEnv = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(localEnv)) {
    require('dotenv').config({ path: localEnv });
  } else if (fs.existsSync(parentEnv)) {
    require('dotenv').config({ path: parentEnv });
  } else {
    require('dotenv').config();
  }
}

const instagramGraph = require('./lib/instagram-graph');
const ghlDB = require('./lib/ghl-db');

// Intervalo de sincronização (10 minutos)
const SYNC_INTERVAL = 10 * 60 * 1000;

console.log(`
╔════════════════════════════════════════╗
║   📷 Instagram Sync Service Started    ║
╠════════════════════════════════════════╣
║   Sincronizando a cada 10 minutos      ║
║   Status: ✅ Ativo                     ║
╚════════════════════════════════════════╝
`);

/**
 * Sincronizar conversas e mensagens do Instagram
 */
async function syncInstagramMessages() {
  try {
    console.log(`\n⏱️  [${new Date().toLocaleTimeString()}] Iniciando sincronização...`);

    // 1. Buscar conversas
    const convResult = await instagramGraph.getConversations(20);
    if (!convResult.success) {
      console.error('❌ Erro ao buscar conversas:', convResult.error);
      return;
    }

    const conversations = convResult.data;
    console.log(`📨 Encontradas ${conversations.length} conversas`);

    if (conversations.length === 0) {
      console.log('⚠️  Nenhuma conversa encontrada. Verifique o token do Instagram.');
      return;
    }

    // 2. Para cada conversa, buscar mensagens
    for (const conv of conversations) {
      try {
        // Criar/atualizar conversa no banco
        ghlDB.saveConversation({
          conversationId: `ig_${conv.id}`,
          contactId: conv.participants?.[0]?.id || 'unknown',
          contactName: conv.participants?.[0]?.name || 'Instagram User',
          status: 'active',
          type: 'instagram',
          fromNumber: 'instagram',
          toNumber: 'instagram',
          lastMessageDate: new Date(conv.updated_time).getTime(),
          unreadCount: 0
        });

        // Buscar mensagens dessa conversa
        const msgResult = await instagramGraph.getMessages(conv.id, 50);
        if (msgResult.success) {
          const messages = msgResult.data;
          console.log(`  💬 Conversa ${conv.id}: ${messages.length} mensagens`);

          // Salvar cada mensagem
          for (const msg of messages) {
            ghlDB.saveMessage({
              messageId: msg.id,
              conversationId: `ig_${conv.id}`,
              body: msg.message || msg.subject || '[Mídia]',
              from: msg.from?.id || 'unknown',
              to: msg.to?.id || 'unknown',
              timestamp: new Date(msg.created_timestamp).getTime(),
              direction: 'inbound',
              attachments: msg.media ? [msg.media] : []
            });
          }
        }
      } catch (convErr) {
        console.error(`  ❌ Erro ao processar conversa ${conv.id}:`, convErr.message);
      }
    }

    console.log(`✅ Sincronização concluída em ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    console.error('❌ Erro na sincronização:', error.message);
  }
}

// Executar primeira vez imediatamente
syncInstagramMessages();

// Depois executar a cada 10 minutos
setInterval(syncInstagramMessages, SYNC_INTERVAL);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Encerrando serviço de sincronização...');
  process.exit(0);
});
