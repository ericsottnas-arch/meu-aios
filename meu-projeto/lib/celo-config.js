/**
 * Gerenciamento de configuração multi-cliente para o agente Celo.
 * Persiste em JSON local (data/celo-clients.json).
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.resolve(__dirname, '..', 'data', 'celo-clients.json');

let _config = null;

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    _config = JSON.parse(raw);
    return _config;
  } catch (err) {
    console.error('Erro ao carregar config do Celo:', err.message);
    _config = { clients: {}, defaults: { agency: 'Syra', testingPercentage: 0.10, currency: 'BRL' } };
    return _config;
  }
}

function saveConfig(config) {
  _config = config || _config;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(_config, null, 2), 'utf-8');
}

function getConfig() {
  if (!_config) loadConfig();
  return _config;
}

/**
 * Retorna config de um cliente por ID.
 * @param {string} clientId
 * @returns {Object|null}
 */
function getClient(clientId) {
  const cfg = getConfig();
  return cfg.clients[clientId] || null;
}

/**
 * Busca cliente pelo nome (case-insensitive, parcial).
 * @param {string} name
 * @returns {string|null} clientId
 */
function findClientByName(name) {
  if (!name) return null;
  const cfg = getConfig();
  const lower = name.toLowerCase();
  for (const [id, client] of Object.entries(cfg.clients)) {
    if (client.name.toLowerCase().includes(lower) || lower.includes(client.name.toLowerCase())) {
      return id;
    }
  }
  return null;
}

/**
 * Lista todos os clientes ativos.
 * @returns {Array<{ id: string, name: string, budget: Object, active: boolean }>}
 */
function listClients() {
  const cfg = getConfig();
  return Object.entries(cfg.clients)
    .filter(([, c]) => c.active)
    .map(([id, c]) => ({ id, name: c.name, budget: c.budget, active: c.active }));
}

/**
 * Define o budget de um cliente.
 * @param {string} clientId
 * @param {number} monthly
 * @param {number} [testingPct]
 */
function setClientBudget(clientId, monthly, testingPct) {
  const cfg = getConfig();
  const client = cfg.clients[clientId];
  if (!client) throw new Error(`Cliente não encontrado: ${clientId}`);
  client.budget.monthly = monthly;
  if (testingPct != null) client.budget.testingPercentage = testingPct;
  saveConfig();
}

/**
 * Atualiza ICP de um cliente (recebido do @account/Nico).
 * @param {string} clientId
 * @param {Object} icpData
 */
function updateClientICP(clientId, icpData) {
  const cfg = getConfig();
  const client = cfg.clients[clientId];
  if (!client) throw new Error(`Cliente não encontrado: ${clientId}`);
  client.icp = icpData;
  saveConfig();
}

/**
 * Adiciona um novo cliente.
 * @param {string} clientId
 * @param {Object} clientData
 */
function addClient(clientId, clientData) {
  const cfg = getConfig();
  const defaults = cfg.defaults;
  cfg.clients[clientId] = {
    name: clientData.name,
    spreadsheetId: clientData.spreadsheetId || '',
    sheetRanges: clientData.sheetRanges || {},
    budget: {
      monthly: clientData.monthly || 0,
      testingPercentage: clientData.testingPercentage || defaults.testingPercentage,
      currency: defaults.currency,
    },
    agency: clientData.agency || defaults.agency,
    adsPlatform: clientData.adsPlatform || 'meta',
    metaAdAccountId: clientData.metaAdAccountId || '',
    icp: null,
    active: true,
    autopilot: clientData.autopilot || {
      enabled: false,
      checkIntervalHours: 4,
      morningBriefing: '08:00',
      eveningSummary: '20:00',
    },
  };
  saveConfig();
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfig,
  getClient,
  findClientByName,
  listClients,
  setClientBudget,
  updateClientICP,
  addClient,
};
