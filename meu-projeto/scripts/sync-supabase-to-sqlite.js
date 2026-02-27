#!/usr/bin/env node
// meu-projeto/scripts/sync-supabase-to-sqlite.js
// Sincroniza histórico de mensagens do Supabase → SQLite local (uma única execução)

const path = require('path');
const fs = require('fs');

// Carregamento de .env
if (!process.env.SUPABASE_URL) {
  const localEnv = path.resolve(__dirname, '../.env');
  const parentEnv = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(localEnv)) {
    require('dotenv').config({ path: localEnv });
  } else if (fs.existsSync(parentEnv)) {
    require('dotenv').config({ path: parentEnv });
  } else {
    require('dotenv').config();
  }
}

const supabase = require('../lib/supabaseClient');
const whatsappDB = require('../lib/whatsapp-db');

const BATCH_SIZE = 500;

async function syncSupabaseToSQLite() {
  console.log('🔄 Iniciando sincronização Supabase → SQLite...\n');

  // Inicializar banco de dados
  whatsappDB.initDB();

  let totalFetched = 0;
  let totalSaved = 0;
  let hasMore = true;
  let offset = 0;

  try {
    while (hasMore) {
      console.log(`📥 Buscando ${BATCH_SIZE} mensagens (offset: ${offset})...`);

      // Buscar em batches
      const { data, error } = await supabase
        .from('message_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        console.error('❌ Erro ao buscar do Supabase:', error);
        process.exit(1);
      }

      if (!data || data.length === 0) {
        console.log('✅ Fim do histórico atingido\n');
        hasMore = false;
        break;
      }

      totalFetched += data.length;

      // Converter dados do Supabase para formato do SQLite
      for (const msg of data) {
        const parsed = {
          id: msg.id,
          chatJid: msg.chat_jid,
          senderJid: msg.sender_jid,
          chatName: msg.chat_name,
          pushName: msg.push_name,
          content: msg.content,
          type: msg.message_type,
          isFromMe: msg.is_from_me || false,
          isGroup: msg.is_group || false,
          timestamp: msg.timestamp,
        };

        whatsappDB.saveMessage(parsed);
        totalSaved++;
      }

      console.log(`✅ Salvas ${data.length} mensagens (total: ${totalSaved})`);

      if (data.length < BATCH_SIZE) {
        hasMore = false;
        console.log('✅ Sincronização concluída\n');
      } else {
        offset += BATCH_SIZE;
      }
    }

    // Estatísticas finais
    const dbTotal = whatsappDB.getTotalMessages();
    const chats = whatsappDB.listChats();

    console.log('📊 RESUMO DA SINCRONIZAÇÃO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total de mensagens no Supabase: ${totalFetched}`);
    console.log(`Total de mensagens no SQLite: ${dbTotal}`);
    console.log(`Chats únicos: ${chats.length}\n`);

    if (chats.length > 0) {
      console.log('📱 TOP 10 CHATS:');
      chats.slice(0, 10).forEach((chat, i) => {
        const tipo = chat.is_group ? '👥 Grupo' : '👤 DM';
        console.log(`${i + 1}. ${tipo} | ${chat.chat_name || chat.chat_jid} (${chat.total_mensagens} msgs)`);
      });
    }

    console.log('\n✅ Sincronização concluída com sucesso!');
    console.log(
      `💾 Banco de dados: ${path.resolve(__dirname, '../data/whatsapp-conversations.db')}\n`,
    );
  } catch (err) {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  }
}

syncSupabaseToSQLite();
