#!/usr/bin/env node
// meu-projeto/scripts/pm-whatsapp-cli.js
// CLI para @pm agent consultar WhatsApp Intelligence

const whatsappDB = require('../lib/whatsapp-db');
const path = require('path');
const fs = require('fs');

// Carregamento de .env (se necessário)
if (!process.env.SUPABASE_URL) {
  const localEnv = path.resolve(__dirname, '../.env');
  const parentEnv = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(localEnv)) {
    require('dotenv').config({ path: localEnv });
  } else if (fs.existsSync(parentEnv)) {
    require('dotenv').config({ path: parentEnv });
  }
}

const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

// Inicializar banco de dados
whatsappDB.initDB();

function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('pt-BR');
}

function formatPhone(jid) {
  // Extrair número do JID (formato: 5511999887766@s.whatsapp.net)
  const match = jid.match(/^(\d+)@/);
  return match ? match[1] : jid;
}

/**
 * Lista todos os chats com últimas mensagens
 */
function cmdChats() {
  const chats = whatsappDB.listChats();

  if (chats.length === 0) {
    console.log('📭 Nenhum chat encontrado');
    return;
  }

  console.log('\n📱 CHATS (Ordenados por última mensagem)\n');
  console.log('─────────────────────────────────────────────────────────────');

  chats.forEach((chat, i) => {
    const tipo = chat.is_group ? '👥 Grupo' : '👤 DM';
    const nome = chat.chat_name || formatPhone(chat.chat_jid);
    const lastMsg = chat.ultima_mensagem || '(sem mensagens)';
    const lastTime = formatTimestamp(chat.ultima_mensagem_timestamp);
    const stats = `${chat.total_mensagens} msgs | ${chat.enviadas} enviadas | ${chat.recebidas} recebidas`;

    console.log(`\n${i + 1}. ${tipo} ${nome}`);
    console.log(`   📊 ${stats}`);
    console.log(`   ⏰ ${lastTime}`);
    console.log(`   💬 "${lastMsg.substring(0, 80)}${lastMsg.length > 80 ? '...' : ''}"`);
  });

  console.log('\n─────────────────────────────────────────────────────────────\n');
}

/**
 * Exibe histórico de um chat específico
 * @param {string} chatJid - JID do chat
 * @param {number} limit - Limite de mensagens
 */
function cmdConversation(chatJid, limit = 20) {
  if (!chatJid) {
    console.log('❌ Uso: pm-whatsapp-cli.js conversation <chat-jid> [limit]');
    return;
  }

  const messages = whatsappDB.getConversation(chatJid, parseInt(limit) || 20);

  if (messages.length === 0) {
    console.log(`📭 Nenhuma mensagem encontrada para ${chatJid}`);
    return;
  }

  const chatName = messages[0].chat_name || formatPhone(chatJid);
  console.log(`\n📱 Conversa com: ${chatName}\n`);
  console.log('─────────────────────────────────────────────────────────────');

  messages.forEach((msg) => {
    const time = formatTimestamp(msg.timestamp);
    const from = msg.is_from_me ? '➡️ Você' : `⬅️ ${msg.push_name || formatPhone(msg.sender_jid)}`;
    const type = msg.message_type !== 'text' ? ` [${msg.message_type.toUpperCase()}]` : '';

    console.log(`\n${time} ${from}${type}`);
    console.log(`${msg.content}`);
  });

  console.log('\n─────────────────────────────────────────────────────────────\n');
}

/**
 * Busca full-text em mensagens
 * @param {string} query - Termo de busca
 */
function cmdSearch(query) {
  if (!query) {
    console.log('❌ Uso: pm-whatsapp-cli.js search "<query>"');
    return;
  }

  const results = whatsappDB.searchMessages(query, 20);

  if (results.length === 0) {
    console.log(`\n🔍 Nenhuma mensagem encontrada para: "${query}"\n`);
    return;
  }

  console.log(`\n🔍 Resultados para: "${query}" (${results.length} encontradas)\n`);
  console.log('─────────────────────────────────────────────────────────────');

  results.forEach((msg, i) => {
    const time = formatTimestamp(msg.timestamp);
    const chatName = msg.chat_name || formatPhone(msg.chat_jid);
    const from = msg.is_from_me ? 'Você' : msg.push_name || formatPhone(msg.sender_jid);

    console.log(`\n${i + 1}. ${time}`);
    console.log(`   📱 ${chatName}`);
    console.log(`   👤 ${from}`);
    console.log(`   "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"`);
  });

  console.log('\n─────────────────────────────────────────────────────────────\n');
}

/**
 * Exibe resumo estatístico de um cliente
 * @param {string} phone - Número de telefone / JID
 */
function cmdSummarize(phone) {
  if (!phone) {
    console.log('❌ Uso: pm-whatsapp-cli.js summarize <phone-or-jid>');
    return;
  }

  // Se for apenas número, converter para JID
  let chatJid = phone;
  if (!phone.includes('@')) {
    chatJid = `${phone}@s.whatsapp.net`;
  }

  const summary = whatsappDB.summarizeByClient(chatJid);

  if (summary.total.total === 0) {
    console.log(`\n📭 Nenhuma conversa encontrada para ${phone}\n`);
    return;
  }

  const total = summary.total;
  console.log(`\n📊 RESUMO DO CLIENTE: ${phone}\n`);
  console.log('─────────────────────────────────────────────────────────────');

  console.log('\n📈 TOTAIS:');
  console.log(`   Total de mensagens: ${total.total}`);
  console.log(`   Enviadas por você: ${total.enviadas}`);
  console.log(`   Recebidas do cliente: ${total.recebidas}`);
  console.log(`   Pessoas únicas: ${total.unicas_pessoas}`);
  console.log(`   Primeira mensagem: ${formatTimestamp(total.primeira_mensagem)}`);
  console.log(`   Última mensagem: ${formatTimestamp(total.ultima_mensagem)}`);

  console.log('\n📅 ÚLTIMOS 10 DIAS:');
  console.log('   Data       | Total | Enviadas | Recebidas');
  console.log('   ───────────┼───────┼──────────┼──────────');

  summary.daily.forEach((day) => {
    const data = day.data;
    console.log(
      `   ${data} |  ${String(day.total).padStart(2)} |    ${String(day.enviadas).padStart(2)}    |    ${String(day.recebidas).padStart(2)}`,
    );
  });

  console.log('\n─────────────────────────────────────────────────────────────\n');
}

/**
 * Gera briefing com insights do cliente
 * @param {string} clientName - Nome do cliente
 */
function cmdBrief(clientName) {
  if (!clientName) {
    console.log('❌ Uso: pm-whatsapp-cli.js brief "<nome-do-cliente>"');
    return;
  }

  const chats = whatsappDB.listChats();
  const clientChat = chats.find(
    (c) => c.chat_name && c.chat_name.toLowerCase().includes(clientName.toLowerCase()),
  );

  if (!clientChat) {
    console.log(`\n⚠️ Nenhum chat encontrado para "${clientName}"\n`);
    return;
  }

  const summary = whatsappDB.summarizeByClient(clientChat.chat_jid);
  const messages = whatsappDB.getConversation(clientChat.chat_jid, 30);

  const total = summary.total;
  const clientPhone = formatPhone(clientChat.chat_jid);

  console.log(`\n📋 BRIEFING DO CLIENTE: ${clientChat.chat_name}\n`);
  console.log('═════════════════════════════════════════════════════════════');

  console.log(`\n👤 CONTATO`);
  console.log(`   Nome: ${clientChat.chat_name}`);
  console.log(`   Telefone: ${clientPhone}`);
  console.log(`   Tipo: ${clientChat.is_group ? 'Grupo' : 'Contato individual'}`);

  console.log(`\n📊 ENGAJAMENTO`);
  console.log(`   Total de mensagens: ${total.total}`);
  console.log(`   Mensagens suas: ${total.enviadas} (${Math.round((total.enviadas / total.total) * 100)}%)`);
  console.log(`   Mensagens deles: ${total.recebidas} (${Math.round((total.recebidas / total.total) * 100)}%)`);
  console.log(`   Taxa de resposta: ${Math.round((total.recebidas / total.enviadas) * 100)}%`);

  console.log(`\n⏰ TIMELINE`);
  console.log(`   Primeira interação: ${formatTimestamp(total.primeira_mensagem)}`);
  console.log(`   Última conversa: ${formatTimestamp(total.ultima_mensagem)}`);

  if (messages.length > 0) {
    console.log(`\n💬 ÚLTIMAS 5 MENSAGENS DELES:`);
    const fromClient = messages.filter((m) => !m.is_from_me).slice(0, 5);
    fromClient.forEach((msg) => {
      console.log(`   • "${msg.content.substring(0, 60)}${msg.content.length > 60 ? '...' : ''}"`);
    });
  }

  console.log('\n═════════════════════════════════════════════════════════════\n');
}

/**
 * Exibe ajuda
 */
function showHelp() {
  console.log(`
📋 PM WhatsApp CLI — Inteligência de Conversas

COMANDOS:

  chats                               Lista todos os chats com últimas mensagens

  conversation <jid> [limit]          Exibe histórico de um chat (padrão: 20 msgs)
                                      Exemplo: conversation 5511999887766@s.whatsapp.net 50

  search "<query>"                    Busca full-text em mensagens
                                      Exemplo: search "reunião semana que vem"

  summarize <phone|jid>               Resumo estatístico de um cliente
                                      Exemplo: summarize 5511999887766

  brief "<nome-cliente>"              Gera briefing com insights do cliente
                                      Exemplo: brief "Dr. Erico"

EXEMPLOS DE USO:

  node scripts/pm-whatsapp-cli.js chats
  node scripts/pm-whatsapp-cli.js conversation 5511999887766@s.whatsapp.net 30
  node scripts/pm-whatsapp-cli.js search "necessário enviar"
  node scripts/pm-whatsapp-cli.js summarize 5511999887766
  node scripts/pm-whatsapp-cli.js brief "Dr. Erico"
  `);
}

// Executar comando
switch (command) {
  case 'chats':
    cmdChats();
    break;
  case 'conversation':
    cmdConversation(arg1, arg2);
    break;
  case 'search':
    cmdSearch(arg1);
    break;
  case 'summarize':
    cmdSummarize(arg1);
    break;
  case 'brief':
    cmdBrief(arg1);
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    console.log(`❌ Comando desconhecido: "${command}"`);
    console.log(`\nUse: pm-whatsapp-cli.js [chats|conversation|search|summarize|brief|help]\n`);
    process.exit(1);
}
