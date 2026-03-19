#!/usr/bin/env node
// meu-projeto/ghl-reader.js
// CLI para ler mensagens do GHL sem iniciar servidor (development)

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const ghlAPI = require('./lib/ghl-api');
const ghlDB = require('./lib/ghl-db');

const args = process.argv.slice(2);
const command = args[0] || 'help';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('pt-BR');
}

async function testConnection() {
  log('\n🔗 Testando conexão com GHL API...', 'cyan');
  const result = await ghlAPI.testConnection();

  if (result.success) {
    log('✅ Conexão bem-sucedida!', 'green');
    log(`   API Base: https://rest.gohighlevel.com/v1`, 'dim');
  } else {
    log(`❌ Erro: ${result.error}`, 'red');
    process.exit(1);
  }
}

async function listConversations() {
  log('\n📋 Conversas armazenadas (local SQLite):', 'cyan');

  const stats = ghlDB.getStats();
  log(`\n📊 Estatísticas:`, 'bright');
  log(`   Conversas: ${stats.conversations}`, 'dim');
  log(`   Mensagens: ${stats.messages}`, 'dim');
  log(`   Não lidas: ${stats.unread}`, 'yellow');

  const result = ghlDB.getAllConversations(50, 0);

  if (!result.success || result.data.length === 0) {
    log('\n(Nenhuma conversa armazenada ainda)', 'dim');
    log('Inicie o servidor e receba mensagens para sincronizar.', 'dim');
    return;
  }

  log('\n', 'reset');
  result.data.forEach((conv, idx) => {
    log(`${idx + 1}. ${conv.contact_name || conv.contact_id}`, 'bright');
    log(`   ID: ${conv.conversation_id}`, 'dim');
    log(`   Não lidas: ${conv.unread_count} | Última msg: ${formatDate(conv.last_message_date)}`, 'dim');
  });
}

async function showMessages(conversationId) {
  if (!conversationId) {
    log('❌ Uso: ghl-reader messages <conversation-id>', 'red');
    process.exit(1);
  }

  log(`\n💬 Mensagens de ${conversationId}:`, 'cyan');

  const result = ghlDB.getMessages(conversationId, 50);

  if (!result.success || result.data.length === 0) {
    log('\n(Nenhuma mensagem encontrada)', 'dim');
    return;
  }

  // Ordenar em ordem crescente (antigas primeiro)
  const messages = result.data.reverse();

  log('\n', 'reset');
  messages.forEach((msg) => {
    const direction = msg.direction === 'inbound' ? '📥' : '📤';
    const directionColor = msg.direction === 'inbound' ? 'green' : 'blue';

    log(`${direction} [${formatDate(msg.timestamp)}]`, directionColor);
    log(`   ${msg.body}`, 'reset');

    if (msg.attachments && msg.attachments.length > 0) {
      log(`   Anexos: ${msg.attachments.length}`, 'dim');
    }

    log('', 'reset');
  });
}

async function syncFromGHL() {
  log('\n🔄 Sincronizando conversas da GHL API...', 'cyan');

  const result = await ghlAPI.getConversations({ limit: 100 });

  if (!result.success) {
    log(`❌ Erro: ${result.error}`, 'red');
    process.exit(1);
  }

  const conversations = result.data || [];
  log(`✅ Encontradas ${conversations.length} conversas`, 'green');

  // Salvar no banco local
  for (const conv of conversations) {
    ghlDB.saveConversation({
      conversationId: conv.id,
      contactId: conv.contactId || conv.contact?.id,
      contactName: conv.contactName || conv.contact?.name || 'Desconhecido',
      type: conv.type || 'sms',
      fromNumber: conv.fromNumber,
      toNumber: conv.toNumber,
      lastMessageDate: conv.lastMessageDate || Date.now(),
      status: 'active'
    });
  }

  log('✅ Conversas sincronizadas localmente', 'green');
}

async function search(query) {
  if (!query) {
    log('❌ Uso: ghl-reader search "<texto>"', 'red');
    process.exit(1);
  }

  log(`\n🔍 Buscando: "${query}"`, 'cyan');

  const result = ghlDB.searchMessages(query, 50);

  if (!result.success || result.data.length === 0) {
    log('\n(Nenhuma mensagem encontrada)', 'dim');
    return;
  }

  log(`\n✅ Encontradas ${result.data.length} mensagens:`, 'green');
  log('\n', 'reset');

  result.data.forEach((msg) => {
    const direction = msg.direction === 'inbound' ? '📥' : '📤';
    const directionColor = msg.direction === 'inbound' ? 'green' : 'blue';

    log(`${direction} [${formatDate(msg.timestamp)}] de ${msg.from_number}`, directionColor);
    log(`   ${msg.body}`, 'reset');
    log('', 'reset');
  });
}

async function showUnread() {
  log('\n🔔 Conversas não lidas:', 'cyan');

  const result = ghlDB.getUnreadConversations();

  if (!result.success || result.data.length === 0) {
    log('\n✅ Nenhuma conversa não lida!', 'green');
    return;
  }

  log('\n', 'reset');
  result.data.forEach((conv, idx) => {
    log(`${idx + 1}. ${conv.contact_name || conv.contact_id}`, 'bright');
    log(`   ID: ${conv.conversation_id}`, 'dim');
    log(`   Não lidas: ${colors.yellow}${conv.unread_count}${colors.reset} | Última msg: ${formatDate(conv.last_message_date)}`, 'dim');
  });
}

function showHelp() {
  log(`
╔════════════════════════════════════════╗
║   📨 GHL Message Reader CLI             ║
╚════════════════════════════════════════╝

Comandos:
  ${colors.bright}test${colors.reset}           - Testar conexão com GHL API
  ${colors.bright}list${colors.reset}           - Listar todas as conversas (local)
  ${colors.bright}messages${colors.reset} <id>  - Ver mensagens de uma conversa
  ${colors.bright}sync${colors.reset}           - Sincronizar conversas do GHL
  ${colors.bright}search${colors.reset} <texto> - Buscar mensagens
  ${colors.bright}unread${colors.reset}         - Ver conversas não lidas
  ${colors.bright}help${colors.reset}           - Esta mensagem

Exemplos:
  ${colors.dim}./ghl-reader.js test${colors.reset}
  ${colors.dim}./ghl-reader.js list${colors.reset}
  ${colors.dim}./ghl-reader.js messages "conv-123"${colors.reset}
  ${colors.dim}./ghl-reader.js search "urgente"${colors.reset}
  ${colors.dim}./ghl-reader.js unread${colors.reset}

Configuração .env necessária:
  ${colors.bright}GHL_ACCESS_TOKEN${colors.reset}    - Token de API do GHL
  ${colors.bright}GHL_WEBHOOK_SECRET${colors.reset}  - Secret do webhook

Informações:
  🗄️  Base de dados: docs/banco-dados-geral/ghl-conversations.db
  🔌 Servidor webhook: meu-projeto/start-ghl.sh start
  📖 Docs: meu-projeto/GHL-QUICK-START.md
`, 'reset');
}

async function main() {
  try {
    switch (command) {
      case 'test':
        await testConnection();
        break;
      case 'list':
        await listConversations();
        break;
      case 'messages':
        await showMessages(args[1]);
        break;
      case 'sync':
        await syncFromGHL();
        break;
      case 'search':
        await search(args.slice(1).join(' '));
        break;
      case 'unread':
        await showUnread();
        break;
      case 'help':
      default:
        showHelp();
    }
  } catch (error) {
    log(`\n❌ Erro: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
