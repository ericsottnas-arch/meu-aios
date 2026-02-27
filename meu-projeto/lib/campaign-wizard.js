/**
 * Campaign Creation Wizard - State machine multi-step para criação de campanhas via Telegram.
 * Usa adtag-naming.js para gerar nomes padronizados.
 */

const naming = require('./adtag-naming');

// Sessões ativas por chatId
const _sessions = new Map();

// Expira em 15 minutos
const SESSION_TTL = 15 * 60 * 1000;

// Steps do wizard
const STEPS = ['client', 'name', 'objective', 'budgetType', 'dailyBudget', 'confirm'];

/**
 * Cria nova sessão do wizard.
 * @param {number} chatId
 * @param {Array} clients - Lista de clientes disponíveis
 * @returns {Object} session
 */
function createSession(chatId, clients) {
  const session = {
    chatId,
    step: clients.length === 1 ? 'name' : 'client',
    clientId: clients.length === 1 ? clients[0].id : null,
    clientName: clients.length === 1 ? clients[0].name : null,
    data: {
      name: null,
      objective: null,
      budgetType: null,
      dailyBudget: null,
    },
    clients,
    createdAt: Date.now(),
  };
  _sessions.set(chatId, session);
  return session;
}

/**
 * Retorna sessão ativa.
 * @param {number} chatId
 * @returns {Object|null}
 */
function getSession(chatId) {
  const session = _sessions.get(chatId);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL) {
    _sessions.delete(chatId);
    return null;
  }
  return session;
}

/**
 * Remove sessão.
 */
function deleteSession(chatId) {
  _sessions.delete(chatId);
}

/**
 * Avança para o próximo step.
 * @param {number} chatId
 * @returns {string} novo step
 */
function nextStep(chatId) {
  const session = getSession(chatId);
  if (!session) return null;
  const idx = STEPS.indexOf(session.step);
  if (idx < STEPS.length - 1) {
    session.step = STEPS[idx + 1];
  }
  return session.step;
}

/**
 * Define valor no step atual e avança.
 * @param {number} chatId
 * @param {string} key
 * @param {*} value
 */
function setStepValue(chatId, key, value) {
  const session = getSession(chatId);
  if (!session) return null;
  if (key === 'clientId') {
    session.clientId = value;
    session.clientName = session.clients.find((c) => c.id === value)?.name || value;
  } else {
    session.data[key] = value;
  }
  return nextStep(chatId);
}

/**
 * Gera nome AdTag da campanha com os dados coletados.
 * @param {Object} session
 * @returns {string}
 */
function generateAdTagName(session) {
  return naming.generateCampaignName({
    agency: 'Syra',
    name: session.data.name,
    objective: session.data.objective,
    budgetType: session.data.budgetType,
  });
}

/**
 * Gera mensagem de preview para confirmação.
 * @param {Object} session
 * @returns {string}
 */
function generatePreview(session) {
  const adtagName = generateAdTagName(session);
  return [
    'Confirmar criacao de campanha:\n',
    `Cliente: ${session.clientName}`,
    `Nome AdTag: ${adtagName}`,
    `Objetivo: ${session.data.objective}`,
    `Budget: ${session.data.budgetType} | R$ ${session.data.dailyBudget.toFixed(2)}/dia`,
    `Status: PAUSED`,
    '\nConfirma?',
  ].join('\n');
}

/**
 * Retorna os dados finais para criar a campanha.
 * @param {Object} session
 * @returns {Object}
 */
function getFinalData(session) {
  return {
    clientId: session.clientId,
    name: generateAdTagName(session),
    objective: session.data.objective,
    dailyBudget: session.data.dailyBudget,
    budgetType: session.data.budgetType,
  };
}

/**
 * Gera keyboard para o step atual.
 * @param {Object} session
 * @returns {{ text: string, keyboard: Array|null }}
 */
function getStepPrompt(session) {
  switch (session.step) {
    case 'client': {
      return {
        text: 'Selecione o cliente:',
        keyboard: session.clients.map((c) => [
          { text: c.name, callback_data: `wiz:client:${c.id}` },
        ]),
      };
    }
    case 'name': {
      return {
        text: `Cliente: ${session.clientName}\n\nDigite o nome da campanha:\n(Ex: Dr Erico - Implantes)`,
        keyboard: null,
      };
    }
    case 'objective': {
      // Dividir objectives em rows de 2
      const rows = [];
      for (let i = 0; i < naming.CAMPAIGN_OBJECTIVES.length; i += 2) {
        const row = [{ text: naming.CAMPAIGN_OBJECTIVES[i], callback_data: `wiz:obj:${i}` }];
        if (naming.CAMPAIGN_OBJECTIVES[i + 1]) {
          row.push({ text: naming.CAMPAIGN_OBJECTIVES[i + 1], callback_data: `wiz:obj:${i + 1}` });
        }
        rows.push(row);
      }
      return {
        text: 'Selecione o objetivo:',
        keyboard: rows,
      };
    }
    case 'budgetType': {
      return {
        text: 'Tipo de orcamento:',
        keyboard: [[
          { text: 'CBO (Campaign Budget)', callback_data: 'wiz:budget:CBO' },
          { text: 'ABO (AdSet Budget)', callback_data: 'wiz:budget:ABO' },
        ]],
      };
    }
    case 'dailyBudget': {
      return {
        text: 'Digite o budget diario (em R$):\n(Ex: 50.00)',
        keyboard: [
          [
            { text: 'R$ 20', callback_data: 'wiz:amount:20' },
            { text: 'R$ 50', callback_data: 'wiz:amount:50' },
            { text: 'R$ 100', callback_data: 'wiz:amount:100' },
          ],
          [
            { text: 'R$ 150', callback_data: 'wiz:amount:150' },
            { text: 'R$ 200', callback_data: 'wiz:amount:200' },
            { text: 'R$ 500', callback_data: 'wiz:amount:500' },
          ],
        ],
      };
    }
    case 'confirm': {
      return {
        text: generatePreview(session),
        keyboard: [[
          { text: 'Criar campanha', callback_data: 'wiz:confirm:yes' },
          { text: 'Cancelar', callback_data: 'wiz:confirm:no' },
        ]],
      };
    }
    default:
      return { text: 'Erro no wizard.', keyboard: null };
  }
}

// Auto-cleanup de sessões expiradas
setInterval(() => {
  const now = Date.now();
  for (const [chatId, session] of _sessions) {
    if (now - session.createdAt > SESSION_TTL) {
      _sessions.delete(chatId);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  createSession,
  getSession,
  deleteSession,
  setStepValue,
  getStepPrompt,
  getFinalData,
  STEPS,
};
