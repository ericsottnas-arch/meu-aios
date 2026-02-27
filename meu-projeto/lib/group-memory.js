/**
 * Gerenciador de memória/contexto de grupos WhatsApp.
 * Armazena histórico recente de mensagens, alertas e metadata por grupo.
 *
 * Dados ficam em memória com cleanup automático de mensagens antigas.
 * Opcionalmente persiste resumos no Supabase.
 */

const MAX_MESSAGES_PER_GROUP = 100;
const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

/**
 * @typedef {Object} GroupMessage
 * @property {string} id - ID da mensagem WhatsApp
 * @property {string} sender - Nome de quem enviou
 * @property {string} senderJid - JID de quem enviou
 * @property {string} text - Texto da mensagem ou transcrição
 * @property {string} type - 'text'|'audio'|'image'|'document'|'video'|'link'|'sticker'
 * @property {number} timestamp - Unix timestamp ms
 * @property {Object} analysis - Resultado da análise AI
 */

/**
 * @typedef {Object} GroupContext
 * @property {string} groupJid - JID do grupo
 * @property {string} groupName - Nome do grupo
 * @property {string|null} clientName - Nome do cliente associado
 * @property {GroupMessage[]} messages - Histórico de mensagens
 * @property {Object[]} alerts - Alertas pendentes
 * @property {Object} stats - Estatísticas do grupo
 * @property {number} createdAt - Quando o grupo foi adicionado
 * @property {number} updatedAt - Última atualização
 */

// Map<groupJid, GroupContext>
const groups = new Map();

// Alertas pendentes globais (para notificação consolidada)
const pendingAlerts = [];

/**
 * Registra um grupo para monitoramento.
 * @param {string} groupJid
 * @param {string} groupName
 * @param {string|null} clientName
 */
function registerGroup(groupJid, groupName, clientName = null) {
  if (!groups.has(groupJid)) {
    groups.set(groupJid, {
      groupJid,
      groupName,
      clientName,
      messages: [],
      alerts: [],
      stats: {
        totalMessages: 0,
        textMessages: 0,
        audioMessages: 0,
        mediaMessages: 0,
        alertsTriggered: 0,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  } else {
    // Atualiza nome/cliente se mudou
    const group = groups.get(groupJid);
    group.groupName = groupName;
    if (clientName) group.clientName = clientName;
  }
}

/**
 * Remove um grupo do monitoramento.
 * @param {string} groupJid
 */
function unregisterGroup(groupJid) {
  groups.delete(groupJid);
}

/**
 * Adiciona uma mensagem ao histórico do grupo.
 * @param {string} groupJid
 * @param {GroupMessage} message
 */
function addMessage(groupJid, message) {
  const group = groups.get(groupJid);
  if (!group) return;

  group.messages.push({
    ...message,
    timestamp: message.timestamp || Date.now(),
  });

  // Limitar tamanho do histórico
  if (group.messages.length > MAX_MESSAGES_PER_GROUP) {
    group.messages = group.messages.slice(-MAX_MESSAGES_PER_GROUP);
  }

  // Atualizar stats
  group.stats.totalMessages++;
  if (message.type === 'text') group.stats.textMessages++;
  else if (message.type === 'audio') group.stats.audioMessages++;
  else group.stats.mediaMessages++;

  group.updatedAt = Date.now();
}

/**
 * Adiciona um alerta para o grupo.
 * @param {string} groupJid
 * @param {Object} alert
 * @param {string} alert.level - 'critical'|'high'|'medium'
 * @param {string} alert.message - Descrição do alerta
 * @param {string} alert.triggerMessageId - ID da mensagem que gerou o alerta
 * @param {string} alert.sender - Quem enviou a mensagem
 * @param {string} alert.category - Categoria da mensagem
 */
function addAlert(groupJid, alert) {
  const group = groups.get(groupJid);
  if (!group) return;

  const fullAlert = {
    ...alert,
    groupJid,
    groupName: group.groupName,
    clientName: group.clientName,
    timestamp: Date.now(),
    acknowledged: false,
  };

  group.alerts.push(fullAlert);
  group.stats.alertsTriggered++;
  pendingAlerts.push(fullAlert);
}

/**
 * Obtém mensagens recentes de um grupo (para contexto da AI).
 * @param {string} groupJid
 * @param {number} [count=10] - Quantidade de mensagens
 * @returns {GroupMessage[]}
 */
function getRecentMessages(groupJid, count = 10) {
  const group = groups.get(groupJid);
  if (!group) return [];
  return group.messages.slice(-count);
}

/**
 * Obtém o contexto completo de um grupo.
 * @param {string} groupJid
 * @returns {GroupContext|null}
 */
function getGroupContext(groupJid) {
  return groups.get(groupJid) || null;
}

/**
 * Retorna todos os grupos monitorados.
 * @returns {Array<{groupJid: string, groupName: string, clientName: string|null, messageCount: number, lastActivity: number, pendingAlerts: number}>}
 */
function listGroups() {
  return Array.from(groups.values()).map((g) => ({
    groupJid: g.groupJid,
    groupName: g.groupName,
    clientName: g.clientName,
    messageCount: g.stats.totalMessages,
    lastActivity: g.updatedAt,
    pendingAlerts: g.alerts.filter((a) => !a.acknowledged).length,
  }));
}

/**
 * Obtém alertas pendentes (não reconhecidos).
 * @param {string} [groupJid] - Filtrar por grupo (opcional)
 * @returns {Object[]}
 */
function getPendingAlerts(groupJid) {
  if (groupJid) {
    const group = groups.get(groupJid);
    if (!group) return [];
    return group.alerts.filter((a) => !a.acknowledged);
  }
  return pendingAlerts.filter((a) => !a.acknowledged);
}

/**
 * Marca alertas como reconhecidos.
 * @param {string} [groupJid] - Grupo específico ou todos
 */
function acknowledgeAlerts(groupJid) {
  if (groupJid) {
    const group = groups.get(groupJid);
    if (group) {
      group.alerts.forEach((a) => { a.acknowledged = true; });
    }
    pendingAlerts.forEach((a) => {
      if (a.groupJid === groupJid) a.acknowledged = true;
    });
  } else {
    pendingAlerts.forEach((a) => { a.acknowledged = true; });
    for (const group of groups.values()) {
      group.alerts.forEach((a) => { a.acknowledged = true; });
    }
  }
}

/**
 * Verifica se um grupo está registrado.
 * @param {string} groupJid
 * @returns {boolean}
 */
function isGroupMonitored(groupJid) {
  return groups.has(groupJid);
}

/**
 * Remove mensagens expiradas de todos os grupos.
 */
function cleanup() {
  const cutoff = Date.now() - MESSAGE_TTL_MS;
  for (const group of groups.values()) {
    group.messages = group.messages.filter((m) => m.timestamp > cutoff);
  }
  // Limpar alertas antigos (mais de 48h)
  const alertCutoff = Date.now() - (48 * 60 * 60 * 1000);
  for (const group of groups.values()) {
    group.alerts = group.alerts.filter((a) => a.timestamp > alertCutoff);
  }
  const globalCutoff = pendingAlerts.findIndex((a) => a.timestamp > alertCutoff);
  if (globalCutoff > 0) {
    pendingAlerts.splice(0, globalCutoff);
  }
}

// Cleanup automático
setInterval(cleanup, CLEANUP_INTERVAL_MS);

module.exports = {
  registerGroup,
  unregisterGroup,
  addMessage,
  addAlert,
  getRecentMessages,
  getGroupContext,
  listGroups,
  getPendingAlerts,
  acknowledgeAlerts,
  isGroupMonitored,
  cleanup,
};
