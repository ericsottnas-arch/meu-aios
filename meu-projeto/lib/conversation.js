/**
 * Gerenciador de conversas multi-step para criação de tarefas via Telegram.
 *
 * Fluxo: mensagem → AI análise → prioridade → cliente → data → responsável → criar task
 *
 * Estado é mantido em memória (Map). Expira após 10 minutos de inatividade.
 */

const EXPIRY_MS = 10 * 60 * 1000; // 10 minutos

// Map<chatId, ConversationState>
const conversations = new Map();

/**
 * @typedef {Object} ConversationState
 * @property {'awaiting_description'|'awaiting_priority'|'awaiting_client'|'awaiting_date'|'awaiting_assignee'|'creating'} step
 * @property {Object} analysis - Resultado da AI (title, description, subtasks, suggested_priority)
 * @property {string} originalText - Texto original da mensagem
 * @property {string} messageType - 'text' | 'voice' | 'photo' | 'document' | 'video'
 * @property {Object} [voiceMetadata] - Metadata de áudio (duration, transcribe_ms)
 * @property {Array<{type: string, file_id: string, file_name?: string, mime_type?: string}>} attachments
 * @property {number|null} priority - 1-4
 * @property {string|null} client - Nome do cliente
 * @property {string|null} clientOptionId - ID da opção no custom field do ClickUp
 * @property {string|null} dueDate - Data no formato YYYY-MM-DD ou null
 * @property {number|null} dueDateMs - Unix timestamp ms
 * @property {string|null} assigneeId - ClickUp user ID
 * @property {string|null} assigneeName - Nome do responsável
 * @property {number} updatedAt - Timestamp da última interação
 */

function startConversation(chatId, { analysis, originalText, messageType, voiceMetadata, attachments }) {
  cleanup();
  conversations.set(String(chatId), {
    step: 'awaiting_priority',
    analysis,
    originalText,
    messageType,
    voiceMetadata: voiceMetadata || null,
    attachments: attachments || [],
    priority: null,
    client: null,
    clientOptionId: null,
    dueDate: null,
    dueDateMs: null,
    assigneeId: null,
    assigneeName: null,
    updatedAt: Date.now(),
  });
}

function getConversation(chatId) {
  cleanup();
  const state = conversations.get(String(chatId));
  if (state) {
    state.updatedAt = Date.now();
  }
  return state || null;
}

function updateConversation(chatId, updates) {
  const state = conversations.get(String(chatId));
  if (!state) return null;
  Object.assign(state, updates, { updatedAt: Date.now() });
  return state;
}

function endConversation(chatId) {
  conversations.delete(String(chatId));
}

function hasActiveConversation(chatId) {
  cleanup();
  return conversations.has(String(chatId));
}

function cleanup() {
  const now = Date.now();
  for (const [chatId, state] of conversations.entries()) {
    if (now - state.updatedAt > EXPIRY_MS) {
      conversations.delete(chatId);
    }
  }
}

// --- Steps do fluxo ---

const STEPS = ['awaiting_description', 'awaiting_priority', 'awaiting_client', 'awaiting_date', 'awaiting_assignee', 'creating'];

function nextStep(currentStep) {
  const idx = STEPS.indexOf(currentStep);
  return idx >= 0 && idx < STEPS.length - 1 ? STEPS[idx + 1] : null;
}

module.exports = {
  startConversation,
  getConversation,
  updateConversation,
  endConversation,
  hasActiveConversation,
  nextStep,
};
