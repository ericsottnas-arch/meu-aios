#!/usr/bin/env node
// meu-projeto/ghl-dashboard.js
// Dashboard visual de mensagens GHL

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const ghlDB = require('./lib/ghl-db');

const colors = {
  reset: '\x1b[0m',
  clear: '\x1b[2J\x1b[0f',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'ontem';
  }
  return date.toLocaleDateString('pt-BR');
}

function truncateString(str, length = 50) {
  if (str.length > length) {
    return str.substring(0, length - 3) + '...';
  }
  return str;
}

function showDashboard() {
  console.clear();

  const stats = ghlDB.getStats();
  const conversations = ghlDB.getAllConversations(10, 0);

  // Header
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           ${colors.cyan}📨 GHL MESSAGE DASHBOARD${colors.reset}                       ║
╚══════════════════════════════════════════════════════════════════╝
  `);

  // Stats
  console.log(`
  ${colors.bright}📊 Estatísticas:${colors.reset}
  ├─ Conversas: ${colors.bright}${stats.conversations}${colors.reset}
  ├─ Mensagens: ${colors.bright}${stats.messages}${colors.reset}
  └─ Não lidas: ${colors.yellow}${stats.unread}${colors.reset}
  `);

  // Conversations
  if (conversations.success && conversations.data.length > 0) {
    console.log(`  ${colors.bright}💬 Últimas conversas:${colors.reset}\n`);

    conversations.data.forEach((conv, idx) => {
      const unreadBadge = conv.unread_count > 0
        ? `${colors.yellow}[${conv.unread_count}]${colors.reset}`
        : `${colors.dim}[✓]${colors.reset}`;

      console.log(`  ${idx + 1}. ${colors.bright}${conv.contact_name || conv.contact_id}${colors.reset} ${unreadBadge}`);
      console.log(`     ID: ${colors.dim}${conv.conversation_id}${colors.reset}`);
      console.log(`     Última mensagem: ${colors.dim}${formatDate(conv.last_message_date)}${colors.reset}`);
      console.log('');
    });
  } else {
    console.log(`  ${colors.dim}(Nenhuma conversa armazenada ainda)${colors.reset}\n`);
  }

  // Footer
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  ${colors.dim}Comandos:${colors.reset}                                              ║
║  • ${colors.cyan}./ghl-reader.js list${colors.reset} - Ver todas conversas            ║
║  • ${colors.cyan}./ghl-reader.js messages <id>${colors.reset} - Ver mensagens        ║
║  • ${colors.cyan}./ghl-reader.js sync${colors.reset} - Sincronizar do GHL API       ║
║  • ${colors.cyan}./ghl-reader.js unread${colors.reset} - Apenas não lidas           ║
║  • ${colors.cyan}./start-ghl.sh start${colors.reset} - Iniciar servidor webhook     ║
╚══════════════════════════════════════════════════════════════════╝
  `);
}

function showConversationDetail(conversationId) {
  console.clear();

  const conv = ghlDB.getConversation(conversationId);

  if (!conv.success || !conv.data) {
    console.log(`${colors.red}❌ Conversa não encontrada: ${conversationId}${colors.reset}`);
    process.exit(1);
  }

  const messages = ghlDB.getMessages(conversationId, 50);
  const contact = conv.data;

  // Header
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  ${colors.cyan}💬 ${contact.contact_name || contact.contact_id}${colors.reset}
╚══════════════════════════════════════════════════════════════════╝
  `);

  // Info
  console.log(`  ${colors.dim}ID: ${contact.conversation_id}${colors.reset}`);
  console.log(`  ${colors.dim}Não lidas: ${contact.unread_count}${colors.reset}\n`);

  // Messages
  if (messages.success && messages.data.length > 0) {
    const sortedMessages = messages.data.reverse();

    sortedMessages.forEach((msg) => {
      const icon = msg.direction === 'inbound' ? '📥' : '📤';
      const color = msg.direction === 'inbound' ? colors.green : colors.blue;

      console.log(`  ${icon} ${color}${formatDate(msg.timestamp)}${colors.reset}`);
      console.log(`     ${msg.body}`);
      console.log('');
    });
  } else {
    console.log(`  ${colors.dim}(Sem mensagens)${colors.reset}\n`);
  }

  // Footer
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  ${colors.dim}Pressione Ctrl+C para sair${colors.reset}
╚══════════════════════════════════════════════════════════════════╝
  `);
}

// CLI
const command = process.argv[2];
const arg = process.argv[3];

if (command === 'detail' && arg) {
  showConversationDetail(arg);
} else {
  showDashboard();
}
