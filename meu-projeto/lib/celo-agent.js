/**
 * Agente Celo: Especialista em Gestão de Tráfego Pago
 * Foco: Captação de leads qualificados B2B e B2C.
 *
 * Responsabilidades:
 * - Google Sheets: leitura de dashboards de CRM
 * - Budget: gestão de verba por cliente via celo-config
 * - Naming: nomenclatura AdTag via adtag-naming
 * - CRM Analysis: análise de dados via celo-analyzer (Groq AI)
 *
 * Design: NÃO importa telegram.js — retorna dados estruturados para o server.
 */

const { google } = require('googleapis');
const path = require('path');
const celoConfig = require('./celo-config');
const naming = require('./adtag-naming');

class CeloAgent {
  constructor() {
    this.sheets = null;
    this.authClient = null;
    this._authPromise = null;
  }

  // === Google Sheets ===

  async initAuth() {
    if (this._authPromise) return this._authPromise;

    this._authPromise = (async () => {
      const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_PATH
        || path.resolve(__dirname, '..', 'google-service-account.json');

      try {
        const auth = new google.auth.GoogleAuth({
          keyFile,
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets', // Leitura e escrita
            'https://www.googleapis.com/auth/drive', // Acesso aos arquivos
          ],
        });
        this.authClient = await auth.getClient();
        this.sheets = google.sheets({ version: 'v4', auth: this.authClient });
        console.log('Celo: Google Sheets autenticado.');
      } catch (err) {
        console.warn('Celo: Google Sheets não disponível:', err.message);
        this.sheets = null;
      }
    })();

    return this._authPromise;
  }

  /**
   * Lê dados de uma planilha.
   * @param {string} spreadsheetId
   * @param {string} range - Formato A1 (ex: "'Visão Geral'!A1:Z100")
   * @returns {Promise<string[][]|null>}
   */
  async getSheetData(spreadsheetId, range) {
    await this.initAuth();
    if (!this.sheets) return null;

    try {
      const res = await this.sheets.spreadsheets.values.get({ spreadsheetId, range });
      return res.data.values || [];
    } catch (err) {
      console.error(`Celo: Erro ao ler ${range}:`, err.message);
      return null;
    }
  }

  /**
   * Lista abas de uma planilha.
   * @param {string} spreadsheetId
   * @returns {Promise<string[]|null>}
   */
  async listSheets(spreadsheetId) {
    await this.initAuth();
    if (!this.sheets) return null;

    try {
      const res = await this.sheets.spreadsheets.get({ spreadsheetId });
      return res.data.sheets.map((s) => s.properties.title);
    } catch (err) {
      console.error('Celo: Erro ao listar abas:', err.message);
      return null;
    }
  }

  /**
   * Busca todos os dados configurados de um cliente.
   * @param {string} clientId
   * @returns {Promise<Object>} { overview, leads, sales, campaigns, sheetNames }
   */
  async fetchDashboardData(clientId) {
    const client = celoConfig.getClient(clientId);
    if (!client) throw new Error(`Cliente não encontrado: ${clientId}`);

    const { spreadsheetId, sheetRanges } = client;
    const data = { sheetNames: null };

    // Buscar nomes de abas primeiro para validar
    data.sheetNames = await this.listSheets(spreadsheetId);

    // Buscar dados de cada range configurado em paralelo
    const rangeEntries = Object.entries(sheetRanges || {});
    const results = await Promise.allSettled(
      rangeEntries.map(([key, range]) => this.getSheetData(spreadsheetId, range))
    );

    for (let i = 0; i < rangeEntries.length; i++) {
      const [key] = rangeEntries[i];
      const result = results[i];
      data[key] = result.status === 'fulfilled' ? result.value : null;
    }

    return data;
  }

  // === Budget ===

  /**
   * Retorna o budget de um cliente.
   * @param {string} clientId
   * @returns {{ monthly: number, testingPercentage: number, testing: number, scale: number, currency: string }}
   */
  getClientBudget(clientId) {
    const client = celoConfig.getClient(clientId);
    if (!client) throw new Error(`Cliente não encontrado: ${clientId}`);

    const { monthly, testingPercentage, currency } = client.budget;
    const testing = monthly * testingPercentage;
    const scale = monthly - testing;
    return { monthly, testingPercentage, testing, scale, currency };
  }

  /**
   * Define budget de um cliente.
   * @param {string} clientId
   * @param {number} monthly
   * @param {number} [testingPct]
   */
  setClientBudget(clientId, monthly, testingPct) {
    celoConfig.setClientBudget(clientId, monthly, testingPct);
  }

  // === Naming (AdTag) ===

  generateCampaignName(params) {
    return naming.generateCampaignName(params);
  }

  generateAudienceName(params) {
    return naming.generateAudienceName(params);
  }

  generateCreativeName(params) {
    return naming.generateCreativeName(params);
  }

  validateName(name, type) {
    return naming.validateName(name, type);
  }

  // === Budget Proposal ===

  /**
   * Cria proposta de mudança de budget (dados estruturados, sem enviar Telegram).
   * @param {string} clientId
   * @param {Object} params
   * @param {string} params.campaign
   * @param {number} params.currentBudget
   * @param {number} params.proposedBudget
   * @param {string} params.reason
   * @returns {Object} Proposta estruturada
   */
  createBudgetProposal(clientId, { campaign, currentBudget, proposedBudget, reason }) {
    const client = celoConfig.getClient(clientId);
    if (!client) throw new Error(`Cliente não encontrado: ${clientId}`);

    const direction = proposedBudget > currentBudget ? 'increase' : 'decrease';
    const pctChange = ((proposedBudget - currentBudget) / currentBudget * 100).toFixed(1);

    return {
      clientId,
      clientName: client.name,
      campaign,
      currentBudget,
      proposedBudget,
      direction,
      pctChange: parseFloat(pctChange),
      reason,
      timestamp: Date.now(),
    };
  }

  // === CRM Analysis ===

  /**
   * Busca e analisa dados de vendas de um cliente.
   * @param {string} clientId
   * @returns {Promise<Object>}
   */
  async analyzeSalesData(clientId) {
    const dashboardData = await this.fetchDashboardData(clientId);

    // Lazy load do analyzer para evitar circular dependency
    const { analyzeDashboardData } = require('./celo-analyzer');
    const client = celoConfig.getClient(clientId);
    const budget = this.getClientBudget(clientId);

    return analyzeDashboardData(dashboardData, {
      clientName: client.name,
      currentBudget: budget.monthly,
      testingPct: budget.testingPercentage,
    });
  }

  /**
   * Gera sugestões de otimização para um cliente.
   * @param {string} clientId
   * @returns {Promise<Object>}
   */
  async getOptimizationSuggestions(clientId) {
    const dashboardData = await this.fetchDashboardData(clientId);
    const { generateOptimizationSuggestions } = require('./celo-analyzer');
    return generateOptimizationSuggestions(dashboardData);
  }
}

module.exports = CeloAgent;
