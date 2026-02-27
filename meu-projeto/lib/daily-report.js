// meu-projeto/lib/daily-report.js
// Gera e envia relatório diário às 20h para o número pessoal do usuário

const cron = require('node-cron');
const whatsappDB = require('./whatsapp-db');
const whatsappDBErico = require('./whatsapp-db-erico');
const stevo = require('./stevo');
const { exportDrEricoReport } = require('./export-client-data');

const OWNER_JID = process.env.WHATSAPP_OWNER_JID || '5511966137112@s.whatsapp.net';

/**
 * Formata timestamp em data legível
 */
function formatDate(timestamp) {
  if (!timestamp) return new Date().toLocaleDateString('pt-BR');
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('pt-BR');
}

/**
 * Gera relatório do dia
 */
function generateDailyReport() {
  // Buscar mensagens de hoje
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const timestampHoje = Math.floor(hoje.getTime() / 1000);

  const chats = whatsappDB.listChats();

  // Filtrar apenas mensagens de hoje
  const messagensHoje = [];
  const pessoasInteracao = new Map();

  chats.forEach((chat) => {
    const conversation = whatsappDB.getConversation(chat.chat_jid, 1000);
    conversation.forEach((msg) => {
      if (msg.timestamp >= timestampHoje) {
        messagensHoje.push(msg);

        // Registrar pessoa que interagiu
        const pessoa = msg.push_name || msg.sender_jid;
        if (!pessoasInteracao.has(pessoa)) {
          pessoasInteracao.set(pessoa, {
            nome: msg.push_name,
            jid: msg.sender_jid,
            total: 0,
            grupos: new Set()
          });
        }
        const stats = pessoasInteracao.get(pessoa);
        stats.total++;
        stats.grupos.add(chat.chat_name);
      }
    });
  });

  // Montar relatório
  const data = new Date().toLocaleDateString('pt-BR');
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let relatorio = `📊 *RELATÓRIO DIÁRIO* - ${data} às ${hora}\n`;
  relatorio += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  relatorio += `📨 *Total de mensagens:* ${messagensHoje.length}\n\n`;

  relatorio += `👥 *Pessoas que interagiram:* ${pessoasInteracao.size}\n\n`;

  if (pessoasInteracao.size > 0) {
    relatorio += `*Detalhamento:*\n`;
    Array.from(pessoasInteracao.values())
      .sort((a, b) => b.total - a.total)
      .forEach((pessoa) => {
        const nome = pessoa.nome || pessoa.jid.split('@')[0];
        relatorio += `• ${nome}: ${pessoa.total} msg(s)\n`;
      });
  }

  relatorio += `\n━━━━━━━━━━━━━━━━━━━━━━━━`;

  return relatorio;
}

/**
 * Gera relatório do Dr. Erico
 */
function generateDrEricoReport() {
  const chats = whatsappDBErico.listChats();
  const totalMsgs = whatsappDBErico.getTotalMessages();

  let relatorio = `📊 RELATÓRIO Dr. Erico - ${new Date().toLocaleDateString('pt-BR')}\n`;
  relatorio += `${'='.repeat(50)}\n\n`;
  relatorio += `📨 Total de mensagens: ${totalMsgs}\n`;
  relatorio += `💬 Chats: ${chats.length}\n\n`;

  if (chats.length > 0) {
    relatorio += `Detalhamento:\n`;
    chats.forEach((chat) => {
      relatorio += `• ${chat.chat_name}: ${chat.total_mensagens} msgs (${chat.enviadas} enviadas, ${chat.recebidas} recebidas)\n`;
    });
  }

  return relatorio;
}

/**
 * Envia relatório via WhatsApp
 */
async function sendDailyReport() {
  try {
    const relatorio = generateDailyReport();
    const relatorioErico = generateDrEricoReport();

    console.log(`\n📤 Enviando relatório diário para ${OWNER_JID}`);
    console.log(relatorio);

    // Exportar relatório do Dr. Erico para pasta dele
    exportDrEricoReport(relatorioErico);

    // Enviar via Stevo
    if (stevo.isConfigured()) {
      await stevo.sendText(OWNER_JID, relatorio);
      console.log(`✅ Relatório enviado com sucesso`);
    } else {
      console.warn(`⚠️ Stevo não configurado - relatório não foi enviado`);
    }
  } catch (err) {
    console.error(`❌ Erro ao enviar relatório:`, err.message);
  }
}

/**
 * Agenda relatório para rodar às 20h diariamente
 */
function scheduleDailyReport() {
  // Rodar às 20:00 (horário local)
  cron.schedule('0 20 * * *', () => {
    console.log(`\n⏰ Gerando relatório diário (20h)...`);
    sendDailyReport();
  });

  console.log(`📅 Relatório diário agendado para 20:00`);
}

module.exports = {
  generateDailyReport,
  sendDailyReport,
  scheduleDailyReport
};
