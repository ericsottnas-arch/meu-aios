#!/usr/bin/env node
// meu-projeto/scripts/pm-whatsapp-erico-cli.js
// CLI para consultar conversas do Dr. Erico Servano

const whatsappDBErico = require('../lib/whatsapp-db-erico');

const command = process.argv[2];
const arg1 = process.argv[3];

whatsappDBErico.initDB();

function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('pt-BR');
}

function formatPhone(jid) {
  const match = jid.match(/^(\d+)@/);
  return match ? match[1] : jid;
}

function cmdChats() {
  const chats = whatsappDBErico.listChats();
  if (chats.length === 0) {
    console.log('📭 Nenhum chat');
    return;
  }
  console.log('\n📱 CHATS - Dr. Erico\n');
  chats.forEach((chat, i) => {
    const nome = chat.chat_name || formatPhone(chat.chat_jid);
    console.log(`${i + 1}. ${nome}`);
    console.log(`   📊 ${chat.total_mensagens} msgs | ${chat.enviadas} enviadas | ${chat.recebidas} recebidas`);
    console.log(`   💬 "${chat.ultima_mensagem?.substring(0, 60)}..."\n`);
  });
}

function cmdConversation(chatJid, limit = 20) {
  if (!chatJid) {
    console.log('Uso: conversation <jid> [limit]');
    return;
  }
  const messages = whatsappDBErico.getConversation(chatJid, parseInt(limit) || 20);
  if (messages.length === 0) {
    console.log('📭 Sem mensagens');
    return;
  }
  console.log(`\n📱 Conversa: ${messages[0].chat_name || chatJid}\n`);
  messages.forEach((msg) => {
    const from = msg.is_from_me ? '➡️ Você' : `⬅️ ${msg.push_name}`;
    console.log(`${from}: ${msg.content}`);
  });
  console.log();
}

function cmdStats() {
  const chats = whatsappDBErico.listChats();
  if (chats.length === 0) {
    console.log('📭 Sem dados');
    return;
  }
  const stats = whatsappDBErico.getStats(chats[0].chat_jid);
  console.log(`\n📊 STATS - Dr. Erico\n`);
  console.log(`Total: ${stats.total} msgs`);
  console.log(`Enviadas: ${stats.enviadas}`);
  console.log(`Recebidas: ${stats.recebidas}`);
  console.log(`Pessoas: ${stats.pessoas_unicas}\n`);
}

switch (command) {
  case 'chats':
    cmdChats();
    break;
  case 'conversation':
    cmdConversation(arg1, process.argv[4]);
    break;
  case 'stats':
    cmdStats();
    break;
  default:
    console.log('Comandos: chats, conversation, stats');
}
