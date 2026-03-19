/**
 * Google Ads API adapter para o agente Celo.
 * Usa google-ads-api para gerenciar campanhas, ad groups, ads e audiencias.
 * Interface espelha MetaAds para integracao transparente via AdsManager.
 */

const { GoogleAdsApi, enums } = require('google-ads-api');

const GOOGLE_ADS_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID?.replace(/"/g, '');
const GOOGLE_ADS_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET?.replace(/"/g, '');
const GOOGLE_ADS_DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.replace(/"/g, '');
const GOOGLE_ADS_REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN?.replace(/"/g, '');
const GOOGLE_ADS_LOGIN_CUSTOMER_ID = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/"/g, '');

// Mapeamento de tipo de campanha legivel → enum
const CAMPAIGN_TYPE_MAP = {
  'Search': 'SEARCH',
  'Display': 'DISPLAY',
  'Performance Max': 'PERFORMANCE_MAX',
  'YouTube': 'VIDEO',
  'Video': 'VIDEO',
  'Shopping': 'SHOPPING',
  'Discovery': 'DISCOVERY',
};

// Mapeamento de status
const STATUS_MAP = {
  2: 'ACTIVE',    // ENABLED
  3: 'PAUSED',    // PAUSED
  4: 'DELETED',   // REMOVED
};

const REVERSE_STATUS_MAP = {
  'ACTIVE': 2,
  'PAUSED': 3,
};

class GoogleAds {
  constructor() {
    this._client = null;
    this._customers = new Map(); // customerId → customer instance
    this._ready = false;
  }

  /**
   * Inicializa o client Google Ads API.
   * @returns {Promise<boolean>}
   */
  async init() {
    if (this._ready) return true;

    if (!GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_CLIENT_SECRET || !GOOGLE_ADS_DEVELOPER_TOKEN || !GOOGLE_ADS_REFRESH_TOKEN) {
      console.warn('GoogleAds: Credenciais nao configuradas. Execute setup-google-ads-auth.js');
      return false;
    }

    try {
      this._client = new GoogleAdsApi({
        client_id: GOOGLE_ADS_CLIENT_ID,
        client_secret: GOOGLE_ADS_CLIENT_SECRET,
        developer_token: GOOGLE_ADS_DEVELOPER_TOKEN,
      });

      this._ready = true;
      console.log('GoogleAds: API client inicializado.');
      return true;
    } catch (err) {
      console.error('GoogleAds: Falha ao inicializar:', err.message);
      return false;
    }
  }

  /**
   * Retorna instancia customer para um customerId.
   * @param {string} customerId - Sem hifens (ex: 1234567890)
   */
  _getCustomer(customerId) {
    if (!customerId) throw new Error('GoogleAds: customerId obrigatorio.');
    const id = customerId.replace(/-/g, '');

    if (!this._customers.has(id)) {
      this._customers.set(id, this._client.Customer({
        customer_id: id,
        login_customer_id: GOOGLE_ADS_LOGIN_CUSTOMER_ID || id,
        refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
      }));
    }
    return this._customers.get(id);
  }

  _ensureReady() {
    if (!this._ready) throw new Error('GoogleAds nao inicializado. Chame init() primeiro.');
  }

  /**
   * Retry com exponential backoff.
   */
  async _withRetry(fn, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const isRetryable = err.message?.includes('RESOURCE_EXHAUSTED') ||
          err.message?.includes('INTERNAL') ||
          err.message?.includes('UNAVAILABLE');

        if (isRetryable && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.warn(`GoogleAds: Retry ${attempt}/${maxRetries} em ${Math.round(delay)}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
  }

  /**
   * Converte cost_micros para reais.
   */
  _micros(value) {
    return value ? Number(value) / 1_000_000 : 0;
  }

  /**
   * Converte date string GAQL (YYYY-MM-DD) para range string.
   */
  _dateRange(datePreset) {
    const now = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];

    switch (datePreset) {
      case 'today': return { since: fmt(now), until: fmt(now) };
      case 'yesterday': {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        return { since: fmt(y), until: fmt(y) };
      }
      case 'last_3d': {
        const d = new Date(now); d.setDate(d.getDate() - 3);
        return { since: fmt(d), until: fmt(now) };
      }
      case 'last_7d':
      default: {
        const d = new Date(now); d.setDate(d.getDate() - 7);
        return { since: fmt(d), until: fmt(now) };
      }
      case 'last_14d': {
        const d = new Date(now); d.setDate(d.getDate() - 14);
        return { since: fmt(d), until: fmt(now) };
      }
      case 'last_30d': {
        const d = new Date(now); d.setDate(d.getDate() - 30);
        return { since: fmt(d), until: fmt(now) };
      }
    }
  }

  // ============================================================
  // Campanhas
  // ============================================================

  /**
   * Lista campanhas da conta.
   * @param {Object} options
   * @param {string} options.customerId
   * @param {string[]} [options.statusFilter] - ['ACTIVE', 'PAUSED']
   * @param {number} [options.limit=50]
   * @returns {Promise<Array>}
   */
  async listCampaigns(options = {}) {
    this._ensureReady();
    const { customerId, statusFilter, limit = 50 } = options;
    const customer = this._getCustomer(customerId);

    return this._withRetry(async () => {
      let query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign_budget.amount_micros
        FROM campaign
        WHERE campaign.status != 'REMOVED'
      `;

      if (statusFilter?.length > 0) {
        const statuses = statusFilter.map(s => s === 'ACTIVE' ? 'ENABLED' : s).join("', '");
        query += ` AND campaign.status IN ('${statuses}')`;
      }

      query += ` LIMIT ${limit}`;

      const results = await customer.query(query);

      return results.map((row) => ({
        id: String(row.campaign.id),
        name: row.campaign.name,
        status: STATUS_MAP[row.campaign.status] || String(row.campaign.status),
        objective: this._channelTypeToObjective(row.campaign.advertising_channel_type),
        dailyBudget: this._micros(row.campaign_budget?.amount_micros),
        lifetimeBudget: null,
        createdTime: null,
      }));
    });
  }

  /**
   * Metricas de uma campanha.
   * @param {string} campaignId
   * @param {string} [datePreset='last_7d']
   * @param {string} [customerId]
   * @returns {Promise<Object|null>}
   */
  async getCampaignInsights(campaignId, datePreset = 'last_7d', customerId = null) {
    this._ensureReady();
    const customer = this._getCustomer(customerId || this._lastCustomerId);

    return this._withRetry(async () => {
      const range = this._dateRange(datePreset);

      const query = `
        SELECT
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.search_impression_share
        FROM campaign
        WHERE campaign.id = ${campaignId}
          AND segments.date BETWEEN '${range.since}' AND '${range.until}'
      `;

      const results = await customer.query(query);
      if (!results || results.length === 0) return null;

      // Agregar resultados (GAQL retorna por dia quando tem date segment)
      let impressions = 0, clicks = 0, costMicros = 0, conversions = 0, conversionsValue = 0;
      let impressionShare = 0, shareCount = 0;

      for (const row of results) {
        impressions += Number(row.metrics.impressions || 0);
        clicks += Number(row.metrics.clicks || 0);
        costMicros += Number(row.metrics.cost_micros || 0);
        conversions += Number(row.metrics.conversions || 0);
        conversionsValue += Number(row.metrics.conversions_value || 0);
        if (row.metrics.search_impression_share) {
          impressionShare += Number(row.metrics.search_impression_share);
          shareCount++;
        }
      }

      const spend = costMicros / 1_000_000;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
      const costPerResult = conversions > 0 ? spend / conversions : 0;

      return {
        impressions,
        clicks,
        spend,
        cpc,
        ctr,
        cpm,
        reach: impressions, // Google Ads nao tem "reach" separado para Search
        frequency: 0, // Google Ads nao reporta frequency como Meta
        conversions,
        costPerResult,
        // Extras Google Ads
        conversionsValue,
        roas: spend > 0 ? conversionsValue / spend : 0,
        impressionShare: shareCount > 0 ? impressionShare / shareCount : null,
      };
    });
  }

  /**
   * Insights diarios de uma campanha.
   * @param {string} campaignId
   * @param {Date|null} customStartDate
   * @param {Date|null} customEndDate
   * @param {string} [customerId]
   * @returns {Promise<Array>}
   */
  async getCampaignInsightsDaily(campaignId, customStartDate = null, customEndDate = null, customerId = null) {
    this._ensureReady();
    const customer = this._getCustomer(customerId || this._lastCustomerId);

    return this._withRetry(async () => {
      const fmt = (d) => d.toISOString().split('T')[0];
      const startDate = customStartDate || (() => { const d = new Date(); d.setMonth(d.getMonth() - 6); return d; })();
      const endDate = customEndDate || new Date();

      const query = `
        SELECT
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE campaign.id = ${campaignId}
          AND segments.date BETWEEN '${fmt(startDate)}' AND '${fmt(endDate)}'
        ORDER BY segments.date ASC
      `;

      const results = await customer.query(query);
      if (!results || results.length === 0) return [];

      return results.map((row) => {
        const spend = this._micros(row.metrics.cost_micros);
        const impressions = Number(row.metrics.impressions || 0);
        const clicks = Number(row.metrics.clicks || 0);
        const convs = Number(row.metrics.conversions || 0);

        return {
          date: row.segments.date,
          impressions,
          clicks,
          spend,
          cpc: clicks > 0 ? spend / clicks : 0,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
          reach: impressions,
          frequency: 0,
          conversions: convs,
          costPerResult: convs > 0 ? spend / convs : 0,
        };
      });
    });
  }

  /**
   * Lista ad groups de uma campanha (equivalente a adsets no Meta).
   * @param {string} campaignId
   * @param {string} [customerId]
   * @returns {Promise<Array>}
   */
  async getCampaignAdGroups(campaignId, customerId = null) {
    this._ensureReady();
    const customer = this._getCustomer(customerId || this._lastCustomerId);

    return this._withRetry(async () => {
      const query = `
        SELECT
          ad_group.id,
          ad_group.name,
          ad_group.status,
          ad_group.cpc_bid_micros,
          ad_group.type
        FROM ad_group
        WHERE campaign.id = ${campaignId}
          AND ad_group.status != 'REMOVED'
      `;

      const results = await customer.query(query);

      return results.map((row) => ({
        id: String(row.ad_group.id),
        name: row.ad_group.name,
        status: STATUS_MAP[row.ad_group.status] || String(row.ad_group.status),
        cpcBid: this._micros(row.ad_group.cpc_bid_micros),
        type: row.ad_group.type,
      }));
    });
  }

  /**
   * Lista ads de um ad group.
   * @param {string} adGroupId
   * @param {string} [customerId]
   * @returns {Promise<Array>}
   */
  async getAdGroupAds(adGroupId, customerId = null) {
    this._ensureReady();
    const customer = this._getCustomer(customerId || this._lastCustomerId);

    return this._withRetry(async () => {
      const query = `
        SELECT
          ad_group_ad.ad.id,
          ad_group_ad.ad.name,
          ad_group_ad.status,
          ad_group_ad.ad.type,
          ad_group_ad.ad.final_urls,
          ad_group_ad.ad.responsive_search_ad.headlines,
          ad_group_ad.ad.responsive_search_ad.descriptions
        FROM ad_group_ad
        WHERE ad_group.id = ${adGroupId}
          AND ad_group_ad.status != 'REMOVED'
      `;

      const results = await customer.query(query);

      return results.map((row) => ({
        id: String(row.ad_group_ad.ad.id),
        name: row.ad_group_ad.ad.name || '',
        status: STATUS_MAP[row.ad_group_ad.status] || String(row.ad_group_ad.status),
        type: row.ad_group_ad.ad.type,
        finalUrls: row.ad_group_ad.ad.final_urls || [],
        headlines: row.ad_group_ad.ad.responsive_search_ad?.headlines?.map(h => h.text) || [],
        descriptions: row.ad_group_ad.ad.responsive_search_ad?.descriptions?.map(d => d.text) || [],
      }));
    });
  }

  // ============================================================
  // Criacao (sempre PAUSED)
  // ============================================================

  /**
   * Cria campanha (sempre PAUSED).
   * @param {Object} params
   * @param {string} params.customerId
   * @param {string} params.name
   * @param {string} params.type - 'Search', 'Display', 'Performance Max', 'Video'
   * @param {number} [params.dailyBudget] - Em reais
   * @returns {Promise<{id: string}>}
   */
  async createCampaign({ customerId, name, type, dailyBudget }) {
    this._ensureReady();
    const customer = this._getCustomer(customerId);

    return this._withRetry(async () => {
      // Primeiro criar budget
      const budgetResult = await customer.campaignBudgets.create({
        name: `Budget - ${name}`,
        amount_micros: dailyBudget ? Math.round(dailyBudget * 1_000_000) : 50_000_000,
        delivery_method: enums.BudgetDeliveryMethod.STANDARD,
      });

      const channelType = CAMPAIGN_TYPE_MAP[type] || 'SEARCH';

      const result = await customer.campaigns.create({
        name,
        status: enums.CampaignStatus.PAUSED,
        advertising_channel_type: enums.AdvertisingChannelType[channelType],
        campaign_budget: budgetResult.results[0].resource_name,
      });

      const id = result.results[0].resource_name.split('/').pop();
      console.log(`GoogleAds: Campanha criada: ${id} (${name})`);
      return { id };
    });
  }

  /**
   * Cria ad group.
   * @param {Object} params
   * @param {string} params.customerId
   * @param {string} params.campaignId
   * @param {string} params.name
   * @param {number} [params.cpcBid] - CPC bid em reais
   * @returns {Promise<{id: string}>}
   */
  async createAdGroup({ customerId, campaignId, name, cpcBid }) {
    this._ensureReady();
    const customer = this._getCustomer(customerId);

    return this._withRetry(async () => {
      const result = await customer.adGroups.create({
        name,
        campaign: `customers/${customerId}/campaigns/${campaignId}`,
        status: enums.AdGroupStatus.PAUSED,
        cpc_bid_micros: cpcBid ? Math.round(cpcBid * 1_000_000) : undefined,
        type: enums.AdGroupType.SEARCH_STANDARD,
      });

      const id = result.results[0].resource_name.split('/').pop();
      console.log(`GoogleAds: Ad Group criado: ${id} (${name})`);
      return { id };
    });
  }

  /**
   * Cria responsive search ad.
   * @param {Object} params
   * @param {string} params.customerId
   * @param {string} params.adGroupId
   * @param {string[]} params.headlines - Array de headlines (max 15)
   * @param {string[]} params.descriptions - Array de descricoes (max 4)
   * @param {string} params.finalUrl
   * @returns {Promise<{id: string}>}
   */
  async createAd({ customerId, adGroupId, headlines, descriptions, finalUrl }) {
    this._ensureReady();
    const customer = this._getCustomer(customerId);

    return this._withRetry(async () => {
      const result = await customer.ads.create({
        ad_group: `customers/${customerId}/adGroups/${adGroupId}`,
        status: enums.AdGroupAdStatus.PAUSED,
        ad: {
          final_urls: [finalUrl],
          responsive_search_ad: {
            headlines: headlines.map(text => ({ text })),
            descriptions: descriptions.map(text => ({ text })),
          },
        },
      });

      const id = result.results[0].resource_name.split('/').pop();
      console.log(`GoogleAds: Ad criado: ${id}`);
      return { id };
    });
  }

  // ============================================================
  // Updates
  // ============================================================

  /**
   * Atualiza status de campanha/adgroup/ad.
   * @param {string} objectId
   * @param {'campaign'|'adgroup'|'ad'} type
   * @param {boolean} active
   * @param {string} [customerId]
   */
  async updateStatus(objectId, type, active, customerId = null) {
    this._ensureReady();
    const customer = this._getCustomer(customerId || this._lastCustomerId);
    const status = active ? 'ENABLED' : 'PAUSED';

    return this._withRetry(async () => {
      const cid = customerId || this._lastCustomerId;

      if (type === 'campaign') {
        await customer.campaigns.update({
          resource_name: `customers/${cid}/campaigns/${objectId}`,
          status: active ? enums.CampaignStatus.ENABLED : enums.CampaignStatus.PAUSED,
        });
      } else if (type === 'adgroup' || type === 'adset') {
        await customer.adGroups.update({
          resource_name: `customers/${cid}/adGroups/${objectId}`,
          status: active ? enums.AdGroupStatus.ENABLED : enums.AdGroupStatus.PAUSED,
        });
      } else if (type === 'ad') {
        await customer.ads.update({
          resource_name: `customers/${cid}/adGroupAds/${objectId}`,
          status: active ? enums.AdGroupAdStatus.ENABLED : enums.AdGroupAdStatus.PAUSED,
        });
      }

      console.log(`GoogleAds: ${type} ${objectId} → ${status}`);
      return { id: objectId, status: active ? 'ACTIVE' : 'PAUSED' };
    });
  }

  /**
   * Atualiza budget diario da campanha.
   * @param {string} objectId - Campaign ID
   * @param {'campaign'} type
   * @param {number} newDailyBudget - Em reais
   * @param {string} [customerId]
   */
  async updateBudget(objectId, type, newDailyBudget, customerId = null) {
    this._ensureReady();
    const customer = this._getCustomer(customerId || this._lastCustomerId);

    return this._withRetry(async () => {
      // Primeiro buscar o budget resource da campanha
      const query = `
        SELECT campaign.campaign_budget
        FROM campaign
        WHERE campaign.id = ${objectId}
      `;

      const results = await customer.query(query);
      if (!results || results.length === 0) throw new Error(`Campanha ${objectId} nao encontrada.`);

      const budgetResource = results[0].campaign.campaign_budget;

      await customer.campaignBudgets.update({
        resource_name: budgetResource,
        amount_micros: Math.round(newDailyBudget * 1_000_000),
      });

      console.log(`GoogleAds: Budget campanha ${objectId} → R$ ${newDailyBudget.toFixed(2)}`);
      return { id: objectId, dailyBudget: newDailyBudget };
    });
  }

  /**
   * Atualiza bidding strategy e CPC bid via REST API.
   * A lib gRPC tem bug com campos oneof, então usamos REST.
   * @param {string} campaignId
   * @param {Object} options
   * @param {string} [options.strategy] - 'maximize_clicks'|'maximize_conversions'|'manual_cpc'|'target_cpa'
   * @param {number} [options.cpcCeiling] - CPC máximo em reais (para maximize_clicks)
   * @param {number} [options.targetCpa] - Target CPA em reais (para target_cpa)
   * @param {string} [customerId]
   */
  async updateBiddingStrategy(campaignId, options = {}, customerId = null) {
    this._ensureReady();
    const cid = (customerId || this._lastCustomerId)?.replace(/-/g, '');

    const strategyFieldMap = {
      maximize_clicks: 'target_spend',
      maximize_conversions: 'maximize_conversions',
      maximize_conversion_value: 'maximize_conversion_value',
      manual_cpc: 'manual_cpc',
      target_cpa: 'target_cpa',
      target_roas: 'target_roas',
    };

    const fieldName = strategyFieldMap[options.strategy];
    if (!fieldName) throw new Error(`Estrategia invalida: ${options.strategy}. Use: ${Object.keys(strategyFieldMap).join(', ')}`);

    const updateFields = {};
    if (options.strategy === 'maximize_clicks') {
      updateFields[fieldName] = {};
      if (options.cpcCeiling) {
        updateFields[fieldName].cpc_bid_ceiling_micros = String(Math.round(options.cpcCeiling * 1_000_000));
      }
    } else if (options.strategy === 'target_cpa' && options.targetCpa) {
      updateFields[fieldName] = { target_cpa_micros: String(Math.round(options.targetCpa * 1_000_000)) };
    } else {
      updateFields[fieldName] = {};
    }

    const updateMask = Object.keys(updateFields).map(k => {
      const sub = Object.keys(updateFields[k]);
      return sub.length > 0 ? sub.map(s => `${k}.${s}`).join(',') : k;
    }).join(',');

    return this._restMutate(cid, 'campaigns', {
      update_mask: updateMask,
      update: {
        resource_name: `customers/${cid}/campaigns/${campaignId}`,
        ...updateFields,
      },
    });
  }

  /**
   * Atualiza CPC bid de um Ad Group via REST API.
   * @param {string} adGroupId
   * @param {number} cpcBid - CPC em reais
   * @param {string} [customerId]
   */
  async updateAdGroupBid(adGroupId, cpcBid, customerId = null) {
    this._ensureReady();
    const cid = (customerId || this._lastCustomerId)?.replace(/-/g, '');

    return this._restMutate(cid, 'adGroups', {
      update_mask: 'cpc_bid_micros',
      update: {
        resource_name: `customers/${cid}/adGroups/${adGroupId}`,
        cpc_bid_micros: String(Math.round(cpcBid * 1_000_000)),
      },
    });
  }

  /**
   * Helper para chamadas REST API (contorna bugs do gRPC com oneof fields).
   */
  async _restMutate(customerId, resource, operation) {
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: GOOGLE_ADS_REFRESH_TOKEN });
    const { token } = await oauth2Client.getAccessToken();

    const url = `https://googleads.googleapis.com/v23/customers/${customerId}/${resource}:mutate`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
        'login-customer-id': GOOGLE_ADS_LOGIN_CUSTOMER_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operations: [operation] }),
    });

    const data = await response.json();
    if (!response.ok) {
      const errMsg = data.error?.details?.[0]?.errors?.[0]?.message || data.error?.message || 'Unknown error';
      throw new Error(`GoogleAds REST: ${errMsg}`);
    }
    return data;
  }

  /**
   * Duplica campanha (copia campanha + ad groups + ads).
   * @param {string} campaignId
   * @param {string} [newName]
   * @param {string} [customerId]
   * @returns {Promise<{campaignId: string, adGroups: number, ads: number}>}
   */
  async duplicateCampaign(campaignId, newName, customerId = null) {
    this._ensureReady();
    const cid = customerId || this._lastCustomerId;
    const customer = this._getCustomer(cid);

    return this._withRetry(async () => {
      // Ler campanha original
      const campQuery = `
        SELECT
          campaign.name,
          campaign.advertising_channel_type,
          campaign_budget.amount_micros
        FROM campaign
        WHERE campaign.id = ${campaignId}
      `;

      const campResults = await customer.query(campQuery);
      if (!campResults || campResults.length === 0) throw new Error(`Campanha ${campaignId} nao encontrada.`);

      const original = campResults[0];
      const name = newName || `${original.campaign.name} [Copy ${new Date().toISOString().slice(0, 10)}]`;

      // Criar nova campanha
      const newCampaign = await this.createCampaign({
        customerId: cid,
        name,
        type: this._channelTypeToObjective(original.campaign.advertising_channel_type),
        dailyBudget: this._micros(original.campaign_budget?.amount_micros),
      });

      // Copiar ad groups
      const adGroups = await this.getCampaignAdGroups(campaignId, cid);
      let adGroupCount = 0;
      let adCount = 0;

      for (const ag of adGroups) {
        const newAg = await this.createAdGroup({
          customerId: cid,
          campaignId: newCampaign.id,
          name: ag.name,
          cpcBid: ag.cpcBid,
        });
        adGroupCount++;

        // Copiar ads
        const ads = await this.getAdGroupAds(ag.id, cid);
        for (const ad of ads) {
          if (ad.finalUrls?.length > 0 && ad.headlines?.length > 0) {
            await this.createAd({
              customerId: cid,
              adGroupId: newAg.id,
              headlines: ad.headlines,
              descriptions: ad.descriptions || [],
              finalUrl: ad.finalUrls[0],
            });
            adCount++;
          }
        }
      }

      console.log(`GoogleAds: Campanha duplicada: ${newCampaign.id} (${adGroupCount} ad groups, ${adCount} ads)`);
      return { campaignId: newCampaign.id, adGroups: adGroupCount, ads: adCount };
    });
  }

  // ============================================================
  // Audiencias
  // ============================================================

  /**
   * Lista audiencias da conta.
   * @param {string} customerId
   * @returns {Promise<Array>}
   */
  async listAudiences(customerId) {
    this._ensureReady();
    const customer = this._getCustomer(customerId);

    return this._withRetry(async () => {
      const query = `
        SELECT
          user_list.id,
          user_list.name,
          user_list.size_for_search,
          user_list.size_for_display,
          user_list.type
        FROM user_list
        WHERE user_list.membership_status = 'OPEN'
        LIMIT 100
      `;

      const results = await customer.query(query);

      return results.map((row) => ({
        id: String(row.user_list.id),
        name: row.user_list.name,
        size: Number(row.user_list.size_for_display || row.user_list.size_for_search || 0),
        type: row.user_list.type,
      }));
    });
  }

  // ============================================================
  // Google Ads Specific: Search Terms & Quality Score
  // ============================================================

  /**
   * Retorna search terms report (apenas para Search campaigns).
   * @param {string} campaignId
   * @param {string} [datePreset='last_7d']
   * @param {string} [customerId]
   * @returns {Promise<Array>}
   */
  async getSearchTerms(campaignId, datePreset = 'last_7d', customerId = null) {
    this._ensureReady();
    const customer = this._getCustomer(customerId || this._lastCustomerId);
    const range = this._dateRange(datePreset);

    return this._withRetry(async () => {
      const query = `
        SELECT
          search_term_view.search_term,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions
        FROM search_term_view
        WHERE campaign.id = ${campaignId}
          AND segments.date BETWEEN '${range.since}' AND '${range.until}'
        ORDER BY metrics.impressions DESC
        LIMIT 100
      `;

      const results = await customer.query(query);

      return results.map((row) => ({
        searchTerm: row.search_term_view.search_term,
        impressions: Number(row.metrics.impressions || 0),
        clicks: Number(row.metrics.clicks || 0),
        spend: this._micros(row.metrics.cost_micros),
        conversions: Number(row.metrics.conversions || 0),
      }));
    });
  }

  /**
   * Retorna Quality Score das keywords.
   * @param {string} campaignId
   * @param {string} [customerId]
   * @returns {Promise<Array>}
   */
  async getKeywordQualityScores(campaignId, customerId = null) {
    this._ensureReady();
    const customer = this._getCustomer(customerId || this._lastCustomerId);

    return this._withRetry(async () => {
      const query = `
        SELECT
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.quality_info.quality_score,
          ad_group_criterion.quality_info.creative_quality_score,
          ad_group_criterion.quality_info.post_click_quality_score,
          ad_group_criterion.quality_info.search_predicted_ctr
        FROM keyword_view
        WHERE campaign.id = ${campaignId}
          AND ad_group_criterion.status != 'REMOVED'
      `;

      const results = await customer.query(query);

      return results.map((row) => ({
        keyword: row.ad_group_criterion.keyword.text,
        matchType: row.ad_group_criterion.keyword.match_type,
        qualityScore: row.ad_group_criterion.quality_info?.quality_score || null,
        creativeQuality: row.ad_group_criterion.quality_info?.creative_quality_score || null,
        landingPageQuality: row.ad_group_criterion.quality_info?.post_click_quality_score || null,
        expectedCtr: row.ad_group_criterion.quality_info?.search_predicted_ctr || null,
      }));
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  _channelTypeToObjective(channelType) {
    const map = {
      2: 'Search',       // SEARCH
      3: 'Display',      // DISPLAY
      6: 'Video',        // VIDEO
      7: 'Shopping',     // SHOPPING
      8: 'Hotel',        // HOTEL
      9: 'Local',        // LOCAL
      10: 'Smart',       // SMART
      11: 'Performance Max', // PERFORMANCE_MAX
      12: 'Discovery',   // DISCOVERY
      'SEARCH': 'Search',
      'DISPLAY': 'Display',
      'VIDEO': 'Video',
      'SHOPPING': 'Shopping',
      'PERFORMANCE_MAX': 'Performance Max',
      'DISCOVERY': 'Discovery',
    };
    return map[channelType] || String(channelType);
  }

  /**
   * Salva customerId para uso em chamadas subsequentes.
   * Chamado pelo AdsManager ao resolver o cliente.
   */
  setLastCustomerId(customerId) {
    this._lastCustomerId = customerId?.replace(/-/g, '');
  }
}

module.exports = GoogleAds;
