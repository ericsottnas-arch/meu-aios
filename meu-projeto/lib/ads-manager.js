/**
 * AdsManager - Interface unificada para gerenciar campanhas em múltiplas plataformas.
 * Abstrai Meta Ads e Google Ads (futuro) atrás de uma API consistente.
 */

const MetaAds = require('./meta-ads');
const GoogleAds = require('./google-ads');
const celoConfig = require('./celo-config');
const celoConversation = require('./celo-conversation');

// Threshold para aprovação de budget (20% de mudança)
const BUDGET_APPROVAL_THRESHOLD = 0.20;

class AdsManager {
  constructor() {
    this._meta = new MetaAds();
    this._google = new GoogleAds();
    this._initialized = { meta: false, google: false };
  }

  /**
   * Inicializa adapter da plataforma sob demanda.
   * @param {string} platform - 'meta' ou 'google'
   */
  async _ensurePlatform(platform) {
    if (platform === 'meta' && !this._initialized.meta) {
      this._initialized.meta = await this._meta.init();
      if (!this._initialized.meta) throw new Error('Meta Ads não configurado. Defina META_ACCESS_TOKEN e META_AD_ACCOUNT_ID no .env');
    }
    if (platform === 'google' && !this._initialized.google) {
      this._initialized.google = await this._google.init();
      if (!this._initialized.google) throw new Error('Google Ads nao configurado. Execute setup-google-ads-auth.js e defina as variaveis no .env');
    }
  }

  _getAdapter(platform) {
    if (platform === 'meta') return this._meta;
    if (platform === 'google') return this._google;
    throw new Error(`Plataforma desconhecida: ${platform}`);
  }

  /**
   * Resolve adAccountId e pageId de um clientId.
   * @param {string} [clientId]
   * @returns {{ adAccountId: string|undefined, pageId: string|undefined }}
   */
  _resolveClient(clientId) {
    if (!clientId) return {};
    const client = celoConfig.getClient(clientId);
    if (!client) return {};
    return {
      adAccountId: client.metaAdAccountId || undefined,
      pageId: client.metaPageId || undefined,
      googleCustomerId: client.googleCustomerId || undefined,
    };
  }

  /**
   * Normaliza campanha para formato unificado.
   */
  _normalizeCampaign(raw, platform) {
    return {
      platform,
      id: raw.id,
      name: raw.name,
      status: raw.status,
      objective: raw.objective,
      budget: {
        daily: raw.dailyBudget,
        lifetime: raw.lifetimeBudget || null,
        currency: 'BRL',
      },
      createdTime: raw.createdTime || null,
    };
  }

  /**
   * Status emoji para Telegram.
   */
  static statusEmoji(status) {
    const map = {
      ACTIVE: '🟢',
      PAUSED: '⏸️',
      DELETED: '🗑️',
      ARCHIVED: '📦',
    };
    return map[status] || '⚪';
  }

  // ============================================================
  // Campanhas
  // ============================================================

  /**
   * Lista campanhas.
   * @param {string} platform - 'meta' ou 'google'
   * @param {Object} [options]
   * @param {string} [options.clientId] - Resolve adAccountId do cliente
   */
  async listCampaigns(platform, options = {}) {
    await this._ensurePlatform(platform);
    const adapter = this._getAdapter(platform);
    const { adAccountId, googleCustomerId } = this._resolveClient(options.clientId);

    if (platform === 'google' && googleCustomerId) {
      adapter.setLastCustomerId(googleCustomerId);
      const campaigns = await adapter.listCampaigns({ ...options, customerId: googleCustomerId });
      return campaigns.map((c) => this._normalizeCampaign(c, platform));
    }

    const campaigns = await adapter.listCampaigns({ ...options, adAccountId });
    return campaigns.map((c) => this._normalizeCampaign(c, platform));
  }

  /**
   * Métricas de uma campanha.
   * @param {string} platform
   * @param {string} campaignId
   * @param {string} [datePreset='last_7d']
   */
  async getCampaignMetrics(platform, campaignId, datePreset = 'last_7d', clientId = null) {
    await this._ensurePlatform(platform);
    const adapter = this._getAdapter(platform);

    if (platform === 'google' && clientId) {
      const { googleCustomerId } = this._resolveClient(clientId);
      return adapter.getCampaignInsights(campaignId, datePreset, googleCustomerId);
    }

    return adapter.getCampaignInsights(campaignId, datePreset);
  }

  /**
   * Cria campanha (sempre PAUSED).
   * @param {string} platform
   * @param {Object} params
   * @param {string} [params.clientId]
   */
  async createCampaign(platform, params) {
    await this._ensurePlatform(platform);
    const adapter = this._getAdapter(platform);
    const { adAccountId, googleCustomerId } = this._resolveClient(params.clientId);

    if (platform === 'google') {
      return adapter.createCampaign({ ...params, customerId: googleCustomerId });
    }
    return adapter.createCampaign({ ...params, adAccountId });
  }

  /**
   * Cria ad set (Meta) ou ad group (Google).
   */
  async createAdSet(platform, params) {
    await this._ensurePlatform(platform);
    const adapter = this._getAdapter(platform);
    const { adAccountId, googleCustomerId } = this._resolveClient(params.clientId);

    if (platform === 'google') {
      return adapter.createAdGroup({ ...params, customerId: googleCustomerId });
    }
    return adapter.createAdSet({ ...params, adAccountId });
  }

  /**
   * Cria ad creative (Meta only — Google usa createAd direto).
   */
  async createAdCreative(platform, params) {
    await this._ensurePlatform(platform);
    if (platform === 'google') {
      throw new Error('Google Ads nao usa AdCreative separado. Use createAd com headlines/descriptions.');
    }
    const adapter = this._getAdapter(platform);
    const { adAccountId, pageId } = this._resolveClient(params.clientId);
    return adapter.createAdCreative({ ...params, adAccountId, pageId: params.pageId || pageId });
  }

  /**
   * Cria ad.
   */
  async createAd(platform, params) {
    await this._ensurePlatform(platform);
    const adapter = this._getAdapter(platform);
    const { adAccountId, googleCustomerId } = this._resolveClient(params.clientId);

    if (platform === 'google') {
      return adapter.createAd({ ...params, customerId: googleCustomerId });
    }
    return adapter.createAd({ ...params, adAccountId });
  }

  /**
   * Altera status (pausar/ativar).
   * @param {string} platform
   * @param {string} objectId
   * @param {'campaign'|'adset'|'ad'} type
   * @param {boolean} active
   */
  async updateStatus(platform, objectId, type, active, clientId = null) {
    await this._ensurePlatform(platform);
    const adapter = this._getAdapter(platform);

    if (platform === 'google' && clientId) {
      const { googleCustomerId } = this._resolveClient(clientId);
      return adapter.updateStatus(objectId, type, active, googleCustomerId);
    }
    return adapter.updateStatus(objectId, type, active);
  }

  /**
   * Atualiza budget. Se mudança > 20%, retorna objeto de aprovação em vez de executar.
   * @param {string} platform
   * @param {string} objectId
   * @param {'campaign'|'adset'} type
   * @param {number} currentBudget - Budget atual em reais
   * @param {number} newBudget - Novo budget em reais
   * @param {Object} [meta] - Metadados extras (clientName, campaign name)
   * @returns {Promise<{executed: boolean, result?: Object, approval?: Object}>}
   */
  async updateBudget(platform, objectId, type, currentBudget, newBudget, meta = {}) {
    await this._ensurePlatform(platform);

    const pctChange = currentBudget > 0
      ? Math.abs((newBudget - currentBudget) / currentBudget)
      : 1;

    // Se mudança > threshold, pedir aprovação
    if (pctChange > BUDGET_APPROVAL_THRESHOLD) {
      const approval = celoConversation.createApproval({
        clientId: meta.clientId || 'unknown',
        clientName: meta.clientName || 'Unknown',
        campaign: meta.campaignName || objectId,
        currentBudget,
        proposedBudget: newBudget,
        reason: meta.reason || `Alteração de ${(pctChange * 100).toFixed(0)}% no budget`,
        direction: newBudget > currentBudget ? 'increase' : 'decrease',
        pctChange: Math.round(pctChange * 100),
        // Metadata para executar depois da aprovação
        _action: { platform, objectId, type, newBudget },
      });

      return { executed: false, approval };
    }

    // Mudança pequena: executar direto
    const adapter = this._getAdapter(platform);
    const result = await adapter.updateBudget(objectId, type, newBudget);
    return { executed: true, result };
  }

  /**
   * Executa mudança de budget após aprovação.
   * @param {Object} action - _action do approval
   */
  async executeBudgetChange(action) {
    const { platform, objectId, type, newBudget } = action;
    await this._ensurePlatform(platform);
    const adapter = this._getAdapter(platform);
    return adapter.updateBudget(objectId, type, newBudget);
  }

  /**
   * Duplica campanha.
   * @param {string} platform
   * @param {string} campaignId
   * @param {string} [newName]
   */
  async duplicateCampaign(platform, campaignId, newName) {
    await this._ensurePlatform(platform);
    const adapter = this._getAdapter(platform);
    return adapter.duplicateCampaign(campaignId, newName);
  }

  // ============================================================
  // Públicos
  // ============================================================

  async listAudiences(platform, clientId) {
    await this._ensurePlatform(platform);
    const adapter = this._getAdapter(platform);
    const { adAccountId, googleCustomerId } = this._resolveClient(clientId);

    if (platform === 'google') {
      return adapter.listAudiences(googleCustomerId);
    }
    return adapter.listAudiences(adAccountId);
  }

  async createAudience(platform, params) {
    await this._ensurePlatform(platform);
    const adapter = this._getAdapter(platform);
    const { adAccountId } = this._resolveClient(params.clientId);
    return adapter.createCustomAudience({ ...params, adAccountId });
  }

  /**
   * Retorna plataformas ativas de um cliente.
   * @param {string} clientId
   * @returns {string[]} - ['meta'], ['meta', 'google'], etc.
   */
  getClientPlatforms(clientId) {
    const client = celoConfig.getClient(clientId);
    if (!client) return ['meta'];
    const platform = client.adsPlatform;
    if (Array.isArray(platform)) return platform;
    return platform ? [platform] : ['meta'];
  }
}

module.exports = AdsManager;
