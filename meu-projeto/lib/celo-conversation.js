/**
 * State machine de aprovação de budget para o agente Celo.
 * Separada da conversation.js do fluxo de tarefas ClickUp.
 * Usa requestId como chave (não chatId), permitindo múltiplas aprovações simultâneas.
 */

const crypto = require('crypto');

const EXPIRY_MS = 30 * 60 * 1000; // 30 minutos
const approvals = new Map();

/**
 * @typedef {Object} ApprovalState
 * @property {string} requestId
 * @property {string} clientId
 * @property {string} clientName
 * @property {string} campaign
 * @property {number} currentBudget
 * @property {number} proposedBudget
 * @property {string} reason
 * @property {string} direction - 'increase' | 'decrease'
 * @property {number} pctChange
 * @property {'pending'|'approved'|'rejected'} status
 * @property {number} createdAt
 * @property {number|null} messageId - Telegram message ID
 * @property {string|null} chatId - Telegram chat ID
 */

/**
 * Cria uma nova solicitação de aprovação.
 * @param {Object} data
 * @returns {ApprovalState}
 */
function createApproval(data) {
  cleanup();
  const requestId = crypto.randomUUID().substring(0, 8);
  const state = {
    requestId,
    clientId: data.clientId,
    clientName: data.clientName,
    campaign: data.campaign,
    currentBudget: data.currentBudget,
    proposedBudget: data.proposedBudget,
    reason: data.reason || '',
    direction: data.direction || (data.proposedBudget > data.currentBudget ? 'increase' : 'decrease'),
    pctChange: data.pctChange || 0,
    status: 'pending',
    createdAt: Date.now(),
    messageId: null,
    chatId: null,
    _action: data._action || null,
    _analysisContext: data._analysisContext || null,
  };
  approvals.set(requestId, state);
  return state;
}

/**
 * Busca aprovação por ID.
 * @param {string} requestId
 * @returns {ApprovalState|null}
 */
function getApproval(requestId) {
  return approvals.get(requestId) || null;
}

/**
 * Atualiza campos de uma aprovação.
 * @param {string} requestId
 * @param {Object} updates
 */
function updateApproval(requestId, updates) {
  const state = approvals.get(requestId);
  if (!state) return;
  Object.assign(state, updates);
}

/**
 * Resolve aprovação (aprova ou rejeita).
 * @param {string} requestId
 * @param {'approved'|'rejected'} status
 * @returns {ApprovalState|null}
 */
function resolveApproval(requestId, status) {
  const state = approvals.get(requestId);
  if (!state) return null;
  state.status = status;
  state.resolvedAt = Date.now();
  return state;
}

/**
 * Lista aprovações pendentes.
 * @param {string} [clientId] - Filtrar por cliente
 * @returns {ApprovalState[]}
 */
function getPendingApprovals(clientId) {
  cleanup();
  const pending = [];
  for (const state of approvals.values()) {
    if (state.status !== 'pending') continue;
    if (clientId && state.clientId !== clientId) continue;
    pending.push(state);
  }
  return pending;
}

/**
 * Lista todas as aprovações (incluindo resolvidas).
 * @returns {ApprovalState[]}
 */
function getAllApprovals() {
  return Array.from(approvals.values());
}

/**
 * Remove aprovações expiradas.
 */
function cleanup() {
  const now = Date.now();
  for (const [id, state] of approvals.entries()) {
    if (now - state.createdAt > EXPIRY_MS) {
      approvals.delete(id);
    }
  }
}

// Limpeza automática a cada 5 minutos
setInterval(cleanup, 5 * 60 * 1000).unref();

module.exports = {
  createApproval,
  getApproval,
  updateApproval,
  resolveApproval,
  getPendingApprovals,
  getAllApprovals,
};
