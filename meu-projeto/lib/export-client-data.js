// meu-projeto/lib/export-client-data.js
// Exporta conversas para formato JSON/legível nas pastas do cliente

const fs = require('fs');
const path = require('path');

/**
 * Exporta conversas do Dr. Erico para JSON
 */
function exportDrEricoConversations(whatsappDBErico) {
  const exportPath = path.resolve(
    __dirname,
    '../../../docs/clientes/dr-erico-servano/conversas'
  );

  if (!fs.existsSync(exportPath)) {
    fs.mkdirSync(exportPath, { recursive: true });
  }

  const chats = whatsappDBErico.listChats();
  const data = {
    exportedAt: new Date().toISOString(),
    totalChats: chats.length,
    chats: []
  };

  chats.forEach((chat) => {
    const messages = whatsappDBErico.getConversation(chat.chat_jid, 10000);
    data.chats.push({
      chatJid: chat.chat_jid,
      chatName: chat.chat_name,
      totalMessages: chat.total_mensagens,
      sent: chat.enviadas,
      received: chat.recebidas,
      lastMessage: chat.ultima_mensagem,
      messages: messages
    });
  });

  const filename = `conversas-${new Date().toISOString().split('T')[0]}.json`;
  const filepath = path.join(exportPath, filename);

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`📤 Exportado: ${filepath}`);

  return filepath;
}

/**
 * Exporta relatório diário do Dr. Erico
 */
function exportDrEricoReport(relatorio) {
  const reportPath = path.resolve(
    __dirname,
    '../../../docs/clientes/dr-erico-servano/relatorios'
  );

  if (!fs.existsSync(reportPath)) {
    fs.mkdirSync(reportPath, { recursive: true });
  }

  const filename = `relatorio-${new Date().toISOString().split('T')[0]}.txt`;
  const filepath = path.join(reportPath, filename);

  fs.writeFileSync(filepath, relatorio);
  console.log(`📄 Relatório salvo: ${filepath}`);

  return filepath;
}

module.exports = {
  exportDrEricoConversations,
  exportDrEricoReport
};
