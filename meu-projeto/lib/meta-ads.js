/**
 * Meta Ads API wrapper para o agente Celo.
 * Usa facebook-nodejs-business-sdk para gerenciar campanhas, adsets, ads, criativos e públicos.
 */

const bizSdk = require('facebook-nodejs-business-sdk');

const FacebookAdsApi = bizSdk.FacebookAdsApi;
const AdAccount = bizSdk.AdAccount;
const Campaign = bizSdk.Campaign;
const AdSet = bizSdk.AdSet;
const Ad = bizSdk.Ad;
const AdCreative = bizSdk.AdCreative;
const CustomAudience = bizSdk.CustomAudience;

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN?.replace(/"/g, '');
const META_DEFAULT_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID?.replace(/"/g, '');
const META_DEFAULT_PAGE_ID = process.env.META_PAGE_ID?.replace(/"/g, '');

// Mapeamento de objetivos legíveis → enum da API
const OBJECTIVE_MAP = {
  'Tráfego': 'OUTCOME_TRAFFIC',
  'Conversão': 'OUTCOME_SALES',
  'Vendas': 'OUTCOME_SALES',
  'Formulário Instantâneo': 'OUTCOME_LEADS',
  'Cadastro': 'OUTCOME_LEADS',
  'Engajamento': 'OUTCOME_ENGAGEMENT',
  'Alcance': 'OUTCOME_AWARENESS',
  'Reconhecimento': 'OUTCOME_AWARENESS',
  'Vídeo Views': 'OUTCOME_AWARENESS',
  'Mensagens': 'OUTCOME_ENGAGEMENT',
};

class MetaAds {
  constructor() {
    this._api = null;
    this._accounts = new Map(); // adAccountId → AdAccount instance
    this._ready = false;
  }

  /**
   * Inicializa o SDK.
   * @returns {Promise<boolean>}
   */
  async init() {
    if (this._ready) return true;

    if (!META_ACCESS_TOKEN) {
      console.warn('MetaAds: META_ACCESS_TOKEN não configurado.');
      return false;
    }

    try {
      this._api = FacebookAdsApi.init(META_ACCESS_TOKEN);
      this._ready = true;
      console.log('MetaAds: SDK inicializado (multi-conta).');
      return true;
    } catch (err) {
      console.error('MetaAds: Falha ao inicializar:', err.message);
      return false;
    }
  }

  /**
   * Retorna instância de AdAccount para um ID específico.
   * @param {string} [adAccountId]
   */
  _getAccount(adAccountId) {
    const id = adAccountId || META_DEFAULT_AD_ACCOUNT_ID;
    if (!id) throw new Error('adAccountId não informado e META_AD_ACCOUNT_ID não configurado.');
    if (!this._accounts.has(id)) {
      this._accounts.set(id, new AdAccount(id));
    }
    return this._accounts.get(id);
  }

  /**
   * Retry com exponential backoff para rate limiting.
   */
  async _withRetry(fn, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const code = err?.response?.error?.code || err?.code;
        const isRateLimit = code === 17 || code === 32 || code === 4;
        const isServerError = code === 2 || code === 1;

        if ((isRateLimit || isServerError) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.warn(`MetaAds: Retry ${attempt}/${maxRetries} em ${Math.round(delay)}ms (code: ${code})`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
  }

  _ensureReady() {
    if (!this._ready) throw new Error('MetaAds não inicializado. Chame init() primeiro.');
  }

  // ============================================================
  // Campanhas
  // ============================================================

  /**
   * Lista campanhas da conta.
   * @param {Object} [options]
   * @param {string[]} [options.statusFilter] - ['ACTIVE', 'PAUSED']
   * @param {number} [options.limit=50]
   * @returns {Promise<Array>}
   */
  async listCampaigns(options = {}) {
    this._ensureReady();
    const { statusFilter, limit = 50, adAccountId } = options;
    const account = this._getAccount(adAccountId);

    return this._withRetry(async () => {
      const fields = [
        Campaign.Fields.id,
        Campaign.Fields.name,
        Campaign.Fields.status,
        Campaign.Fields.objective,
        Campaign.Fields.daily_budget,
        Campaign.Fields.lifetime_budget,
        Campaign.Fields.created_time,
      ];

      const params = { limit };
      if (statusFilter?.length > 0) {
        params.filtering = [{ field: 'effective_status', operator: 'IN', value: statusFilter }];
      }

      const campaigns = await account.getCampaigns(fields, params);
      return campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        objective: c.objective,
        dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
        lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
        createdTime: c.created_time,
      }));
    });
  }

  /**
   * Métricas de uma campanha.
   * @param {string} campaignId
   * @param {string} [datePreset='last_7d']
   * @returns {Promise<Object|null>}
   */
  async getCampaignInsights(campaignId, datePreset = 'last_7d') {
    this._ensureReady();

    return this._withRetry(async () => {
      const campaign = new Campaign(campaignId);
      const insights = await campaign.getInsights(
        [
          'impressions', 'clicks', 'spend', 'cpc', 'ctr', 'cpm',
          'reach', 'frequency', 'actions', 'cost_per_action_type',
        ],
        { date_preset: datePreset }
      );

      if (!insights || insights.length === 0) return null;

      const data = insights[0];
      const conversions = data.actions?.find((a) => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead');
      const costPerResult = data.cost_per_action_type?.find((a) => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead');

      return {
        impressions: Number(data.impressions || 0),
        clicks: Number(data.clicks || 0),
        spend: Number(data.spend || 0),
        cpc: Number(data.cpc || 0),
        ctr: Number(data.ctr || 0),
        cpm: Number(data.cpm || 0),
        reach: Number(data.reach || 0),
        frequency: Number(data.frequency || 0),
        conversions: conversions ? Number(conversions.value) : 0,
        costPerResult: costPerResult ? Number(costPerResult.value) : 0,
      };
    });
  }

  /**
   * Cria campanha (sempre PAUSED).
   * @param {Object} params
   * @param {string} params.name
   * @param {string} params.objective - Nome legível ou enum da API
   * @param {number} [params.dailyBudget] - Em reais (ex: 50.00)
   * @param {string[]} [params.specialAdCategories=[]]
   * @returns {Promise<{id: string}>}
   */
  async createCampaign({ name, objective, dailyBudget, specialAdCategories = [], adAccountId }) {
    this._ensureReady();
    const account = this._getAccount(adAccountId);
    const apiObjective = OBJECTIVE_MAP[objective] || objective;

    return this._withRetry(async () => {
      const params = {
        [Campaign.Fields.name]: name,
        [Campaign.Fields.objective]: apiObjective,
        [Campaign.Fields.status]: 'PAUSED',
        [Campaign.Fields.special_ad_categories]: specialAdCategories,
      };

      if (dailyBudget != null) {
        params[Campaign.Fields.daily_budget] = Math.round(dailyBudget * 100);
      }

      const result = await account.createCampaign([], params);
      console.log(`MetaAds: Campanha criada: ${result.id} (${name})`);
      return { id: result.id };
    });
  }

  /**
   * Retorna insights diários de uma campanha
   * @param {string} campaignId
   * @param {Date|null} customStartDate - Data inicial (opcional). Se null, usa data de criação
   * @param {Date|null} customEndDate - Data final (opcional). Se null, usa hoje
   * @returns {Promise<Array>} Array de objetos com data + métricas
   */
  async getCampaignInsightsDaily(campaignId, customStartDate = null, customEndDate = null) {
    this._ensureReady();

    return this._withRetry(async () => {
      const campaign = new Campaign(campaignId);

      // Determinar data de início
      let startDate;
      if (customStartDate) {
        startDate = customStartDate;
      } else {
        try {
          const campaignData = await campaign.get(['created_time']);
          const createdTime = campaignData.created_time ? new Date(campaignData.created_time) : new Date('2024-01-01');
          startDate = createdTime;
          console.log(`MetaAds: Buscando insights desde data de criação: ${startDate.toISOString().split('T')[0]}`);
        } catch (err) {
          // Fallback para 6 meses atrás se não conseguir data de criação
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 6);
          console.warn(`MetaAds: Erro ao buscar data de criação, usando fallback: ${startDate.toISOString().split('T')[0]}`);
        }
      }

      // Determinar data de fim
      const endDate = customEndDate || new Date();
      const formatDate = (date) => date.toISOString().split('T')[0];

      console.log(`MetaAds: Buscando insights diários de ${formatDate(startDate)} até ${formatDate(endDate)}`);

      // Buscar insights com granularidade diária
      let insights = [];
      try {
        insights = await campaign.getInsights(
          [
            'impressions', 'clicks', 'spend', 'cpc', 'ctr', 'cpm',
            'reach', 'frequency', 'actions', 'cost_per_action_type', 'date_start', 'date_stop',
            'action_values' // link_clicks não é válido para campaign insights
          ],
          {
            time_range: {
              since: formatDate(startDate),
              until: formatDate(endDate),
            },
            time_increment: 1, // 1 = diário
            limit: 1000, // Máximo de 1000 registros por requisição
          }
        );
      } catch (err) {
        console.warn(`MetaAds: Erro ao buscar insights para ${campaignId}:`, err.message);
        insights = [];
      }

      if (!insights || insights.length === 0) {
        console.warn(`MetaAds: Nenhum insight retornado para ${campaignId}`);
        return [];
      }

      console.log(`MetaAds: ${insights.length} dias de dados encontrados para ${campaignId}`);

      // Formatar resposta: array de {date, metrics}
      return insights.map(data => {
        // Buscar conversões (lead)
        const conversions = data.actions?.find((a) => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead');
        const costPerResult = data.cost_per_action_type?.find((a) => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead');

        // Buscar landing page views
        const landingPageViews = data.actions?.find((a) => a.action_type === 'landing_page_view');
        const costPerLandingPageView = data.cost_per_action_type?.find((a) => a.action_type === 'landing_page_view');

        // Buscar messaging conversations
        const messagingConversations = data.actions?.find((a) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d');
        const costPerMessagingConversation = data.cost_per_action_type?.find((a) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d');

        // Buscar video views (thruplay)
        const videoThruplay = data.cost_per_action_type?.find((a) => a.action_type === 'thruplay_video_view');

        return {
          date: data.date_start || data.date_stop || new Date().toISOString().split('T')[0],
          impressions: Number(data.impressions || 0),
          clicks: Number(data.clicks || 0),
          spend: Number(data.spend || 0),
          cpc: Number(data.cpc || 0),
          ctr: Number(data.ctr || 0),
          cpm: Number(data.cpm || 0),
          reach: Number(data.reach || 0),
          frequency: Number(data.frequency || 0),
          conversions: conversions ? Number(conversions.value) : 0,
          costPerResult: costPerResult ? Number(costPerResult.value) : 0,
          linkClicks: Number(data.link_clicks || 0),
          landingPageViews: landingPageViews ? Number(landingPageViews.value) : 0,
          costPerLandingPageView: costPerLandingPageView ? Number(costPerLandingPageView.value) : 0,
          messagingConversations: messagingConversations ? Number(messagingConversations.value) : 0,
          costPerMessagingConversation: costPerMessagingConversation ? Number(costPerMessagingConversation.value) : 0,
          costPerThruplayVideoView: videoThruplay ? Number(videoThruplay.value) : 0,
        };
      });
    });
  }

  /**
   * Retorna ads de um adset (com todos os dados incluindo vídeo)
   * @param {string} adsetId
   * @returns {Promise<Array>} Array de ads com dados
   */
  async getAdsetAds(adsetId, maxRetries = 3) {
    this._ensureReady();

    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { AdSet } = require('facebook-nodejs-business-sdk');
        const adset = new AdSet(adsetId);

        // Buscar ads com TODOS os campos incluindo vídeo
        const ads = await adset.getAds(
          [
            'id', 'name', 'status', 'created_time',
            'creative',  // ID do criativo
            'thumbnail_url',  // Imagem do anúncio
            'video_avg_time_watched_actions_video_view',
            'video_p25_watched_actions_video_view',
            'video_p50_watched_actions_video_view',
            'video_p75_watched_actions_video_view',
            'video_p100_watched_actions_video_view',
            'video_thruplay_watched_actions_video_view',
          ],
          { limit: 1000 }
        );

        if (!ads || ads.length === 0) {
          console.log(`MetaAds: ${adsetId} - nenhum ad encontrado`);
          return [];
        }

        console.log(`MetaAds: ✅ ${ads.length} ads encontrados para adset ${adsetId}`);
        return ads.map(ad => ({
          id: ad.id,
          name: ad.name,
          status: ad.status,
          createdTime: ad.created_time,
          creativeId: ad.creative?.id || null,
          thumbnailUrl: ad.thumbnail_url || '',
          videoAvgTimeWatched: ad.video_avg_time_watched_actions_video_view || 0,
          videoP25Watched: ad.video_p25_watched_actions_video_view || 0,
          videoP50Watched: ad.video_p50_watched_actions_video_view || 0,
          videoP75Watched: ad.video_p75_watched_actions_video_view || 0,
          videoP100Watched: ad.video_p100_watched_actions_video_view || 0,
          videoThruplay: ad.video_thruplay_watched_actions_video_view || 0,
        }));

      } catch (err) {
        lastError = err;
        const isRateLimit = err.message && err.message.includes('rate limit');
        const isUserLimit = err.message && err.message.includes('User request limit');

        if (isRateLimit || isUserLimit) {
          if (attempt < maxRetries - 1) {
            const delayMs = Math.pow(2, attempt) * 1000;
            console.warn(
              `MetaAds: ⚠️  Rate limit ao buscar ads. Retry ${attempt + 1}/${maxRetries} em ${delayMs}ms...`
            );
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } else {
          throw err;
        }
      }
    }

    console.warn(`MetaAds: Falha ao buscar ads para ${adsetId}: ${lastError.message}`);
    return [];
  }

  /**
   * Manter compatibilidade com código antigo
   * @deprecated Use getAdsetAds() instead
   */
  async getAdsetCreatives(adsetId, maxRetries = 3) {
    return this.getAdsetAds(adsetId, maxRetries);
  }

  /**
   * Retorna adsets de uma campanha com retry e exponential backoff
   * @param {string} campaignId
   * @param {number} maxRetries - Máximo de tentativas (padrão: 3)
   * @returns {Promise<Array>} Array de adsets com métricas
   */
  async getCampaignAdsets(campaignId, maxRetries = 3) {
    this._ensureReady();

    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const campaign = new Campaign(campaignId);

        const adsets = await campaign.getAdSets(
          ['id', 'name', 'status', 'daily_budget', 'targeting', 'created_time', 'start_time'],
          { limit: 100 }
        );

        if (!adsets || adsets.length === 0) {
          console.log(`MetaAds: ${campaignId} - nenhum adset encontrado`);
          return [];
        }

        console.log(`MetaAds: ✅ ${adsets.length} adsets encontrados para ${campaignId}`);
        return adsets.map(adset => ({
          id: adset.id,
          name: adset.name,
          status: adset.status,
          dailyBudget: adset.daily_budget ? adset.daily_budget / 100 : 0,
          targeting: adset.targeting,
          createdTime: adset.created_time,
          startTime: adset.start_time,
        }));

      } catch (err) {
        lastError = err;
        const isRateLimit = err.message && err.message.includes('rate limit');
        const isUserLimit = err.message && err.message.includes('User request limit');

        if (isRateLimit || isUserLimit) {
          if (attempt < maxRetries - 1) {
            // Exponential backoff: 1s, 2s, 4s
            const delayMs = Math.pow(2, attempt) * 1000;
            console.warn(
              `MetaAds: ⚠️  Rate limit detectado para ${campaignId}. ` +
              `Retry ${attempt + 1}/${maxRetries} em ${delayMs}ms...`
            );
            await new Promise(resolve => setTimeout(resolve, delayMs));
          } else {
            console.warn(
              `MetaAds: ❌ Rate limit persistente após ${maxRetries} tentativas para ${campaignId}`
            );
          }
        } else {
          // Se não é rate limit, não retry
          throw err;
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam com rate limit
    console.warn(`MetaAds: Falha final para ${campaignId}: ${lastError.message}`);
    return []; // Retorna vazio em vez de falhar completamente
  }

  /**
   * Cria ad set dentro de uma campanha.
   * @param {Object} params
   * @returns {Promise<{id: string}>}
   */
  async createAdSet({
    campaignId, name, dailyBudget, targeting,
    billingEvent = 'IMPRESSIONS', optimizationGoal = 'LEAD_GENERATION',
    destinationType, promotedObject,
    adAccountId,
  }) {
    this._ensureReady();
    const account = this._getAccount(adAccountId);

    return this._withRetry(async () => {
      const params = {
        [AdSet.Fields.name]: name,
        [AdSet.Fields.campaign_id]: campaignId,
        [AdSet.Fields.billing_event]: billingEvent,
        [AdSet.Fields.optimization_goal]: optimizationGoal,
        [AdSet.Fields.targeting]: targeting,
        [AdSet.Fields.status]: 'PAUSED',
      };

      if (dailyBudget != null) {
        params[AdSet.Fields.daily_budget] = Math.round(dailyBudget * 100);
      }

      if (destinationType) {
        params.destination_type = destinationType;
      }

      if (promotedObject) {
        params.promoted_object = promotedObject;
      }

      const result = await account.createAdSet([], params);
      console.log(`MetaAds: AdSet criado: ${result.id} (${name})`);
      return { id: result.id };
    });
  }

  /**
   * Cria ad creative.
   * @param {Object} params
   * @returns {Promise<{id: string}>}
   */
  async createAdCreative({ name, pageId, imageHash, videoId, message, headline, cta = 'LEARN_MORE', link, adAccountId }) {
    this._ensureReady();
    const account = this._getAccount(adAccountId);

    const linkData = {
      link: link,
      message: message,
      name: headline,
      call_to_action: { type: cta, value: { link } },
    };

    if (imageHash) linkData.image_hash = imageHash;

    const spec = { page_id: pageId || META_DEFAULT_PAGE_ID };

    if (videoId) {
      spec.video_data = { video_id: videoId, message, title: headline, call_to_action: { type: cta, value: { link } } };
    } else {
      spec.link_data = linkData;
    }

    return this._withRetry(async () => {
      const params = {
        [AdCreative.Fields.name]: name,
        [AdCreative.Fields.object_story_spec]: spec,
      };

      const result = await account.createAdCreative([], params);
      console.log(`MetaAds: Creative criado: ${result.id} (${name})`);
      return { id: result.id };
    });
  }

  /**
   * Cria ad vinculando creative a adset.
   * @param {Object} params
   * @returns {Promise<{id: string}>}
   */
  async createAd({ adSetId, name, creativeId, adAccountId }) {
    this._ensureReady();
    const account = this._getAccount(adAccountId);

    return this._withRetry(async () => {
      const params = {
        [Ad.Fields.name]: name,
        [Ad.Fields.adset_id]: adSetId,
        [Ad.Fields.creative]: { creative_id: creativeId },
        [Ad.Fields.status]: 'PAUSED',
      };

      const result = await account.createAd([], params);
      console.log(`MetaAds: Ad criado: ${result.id} (${name})`);
      return { id: result.id };
    });
  }

  // ============================================================
  // Operações de update
  // ============================================================

  /**
   * Atualiza status de campanha/adset/ad.
   * @param {string} objectId
   * @param {'campaign'|'adset'|'ad'} type
   * @param {boolean} active - true=ACTIVE, false=PAUSED
   */
  async updateStatus(objectId, type, active) {
    this._ensureReady();
    const status = active ? 'ACTIVE' : 'PAUSED';

    return this._withRetry(async () => {
      const ClassMap = { campaign: Campaign, adset: AdSet, ad: Ad };
      const Cls = ClassMap[type];
      if (!Cls) throw new Error(`Tipo inválido: ${type}`);

      const obj = new Cls(objectId);
      await obj.update([], { status });
      console.log(`MetaAds: ${type} ${objectId} → ${status}`);
      return { id: objectId, status };
    });
  }

  /**
   * Atualiza budget diário.
   * @param {string} objectId - Campaign ou AdSet ID
   * @param {'campaign'|'adset'} type
   * @param {number} newDailyBudget - Em reais
   */
  async updateBudget(objectId, type, newDailyBudget) {
    this._ensureReady();
    const budgetCents = Math.round(newDailyBudget * 100);

    return this._withRetry(async () => {
      const ClassMap = { campaign: Campaign, adset: AdSet };
      const Cls = ClassMap[type];
      if (!Cls) throw new Error(`Tipo inválido para budget: ${type}`);

      const obj = new Cls(objectId);
      await obj.update([], { daily_budget: budgetCents });
      console.log(`MetaAds: Budget ${type} ${objectId} → R$ ${newDailyBudget.toFixed(2)}`);
      return { id: objectId, dailyBudget: newDailyBudget };
    });
  }

  /**
   * Duplica campanha: cria nova campanha com mesmos adsets e ads.
   * @param {string} campaignId
   * @param {string} [newName]
   * @returns {Promise<{campaignId: string, adSets: number, ads: number}>}
   */
  async duplicateCampaign(campaignId, newName) {
    this._ensureReady();

    // Ler campanha original
    const original = new Campaign(campaignId);
    const campaignData = await original.read([
      Campaign.Fields.name, Campaign.Fields.objective,
      Campaign.Fields.daily_budget, Campaign.Fields.special_ad_categories,
    ]);

    // Criar nova campanha
    const name = newName || `${campaignData.name} [Copy ${new Date().toISOString().slice(0, 10)}]`;
    const newCampaign = await this.createCampaign({
      name,
      objective: campaignData.objective,
      dailyBudget: campaignData.daily_budget ? Number(campaignData.daily_budget) / 100 : undefined,
      specialAdCategories: campaignData.special_ad_categories || [],
    });

    // Ler adsets originais
    const adSets = await original.getAdSets([
      AdSet.Fields.name, AdSet.Fields.daily_budget,
      AdSet.Fields.targeting, AdSet.Fields.billing_event,
      AdSet.Fields.optimization_goal, AdSet.Fields.promoted_object,
    ]);

    let adSetCount = 0;
    let adCount = 0;

    for (const adSet of adSets) {
      const newAdSet = await this.createAdSet({
        campaignId: newCampaign.id,
        name: adSet.name,
        dailyBudget: adSet.daily_budget ? Number(adSet.daily_budget) / 100 : 10,
        targeting: adSet.targeting,
        billingEvent: adSet.billing_event,
        optimizationGoal: adSet.optimization_goal,
      });
      adSetCount++;

      // Ler ads do adset original
      const origAdSet = new AdSet(adSet.id);
      const ads = await origAdSet.getAds([Ad.Fields.name, Ad.Fields.creative]);

      for (const ad of ads) {
        if (ad.creative?.id) {
          await this.createAd({
            adSetId: newAdSet.id,
            name: ad.name,
            creativeId: ad.creative.id,
          });
          adCount++;
        }
      }
    }

    console.log(`MetaAds: Campanha duplicada: ${newCampaign.id} (${adSetCount} adsets, ${adCount} ads)`);
    return { campaignId: newCampaign.id, adSets: adSetCount, ads: adCount };
  }

  /**
   * Retorna insights diários de um adset
   * @param {string} adsetId
   * @param {Date|null} customStartDate
   * @param {Date|null} customEndDate
   * @returns {Promise<Array>}
   */
  async getAdsetInsightsDaily(adsetId, customStartDate = null, customEndDate = null) {
    this._ensureReady();

    return this._withRetry(async () => {
      const adset = new AdSet(adsetId);

      let startDate = customStartDate;
      if (!startDate) {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
      }
      const endDate = customEndDate || new Date();
      const formatDate = (d) => d.toISOString().split('T')[0];

      let insights = [];
      try {
        insights = await adset.getInsights(
          ['impressions', 'clicks', 'spend', 'cpc', 'ctr', 'cpm', 'reach', 'frequency', 'actions', 'cost_per_action_type', 'date_start', 'date_stop'],
          { time_range: { since: formatDate(startDate), until: formatDate(endDate) }, time_increment: 1, limit: 1000 }
        );
      } catch (err) {
        console.warn(`MetaAds: Erro insights adset ${adsetId}:`, err.message);
        return [];
      }

      if (!insights || insights.length === 0) return [];

      return insights.map(data => {
        const conversions = data.actions?.find(a => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead');
        const costPerResult = data.cost_per_action_type?.find(a => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead');
        return {
          date: data.date_start || data.date_stop,
          impressions: Number(data.impressions || 0), clicks: Number(data.clicks || 0),
          spend: Number(data.spend || 0), cpc: Number(data.cpc || 0), ctr: Number(data.ctr || 0),
          cpm: Number(data.cpm || 0), reach: Number(data.reach || 0), frequency: Number(data.frequency || 0),
          conversions: conversions ? Number(conversions.value) : 0,
          costPerResult: costPerResult ? Number(costPerResult.value) : 0,
        };
      });
    });
  }

  /**
   * Retorna insights diários de um ad
   * @param {string} adId
   * @param {Date|null} customStartDate
   * @param {Date|null} customEndDate
   * @returns {Promise<Array>}
   */
  async getAdInsightsDaily(adId, customStartDate = null, customEndDate = null) {
    this._ensureReady();

    return this._withRetry(async () => {
      const ad = new Ad(adId);

      let startDate = customStartDate;
      if (!startDate) {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
      }
      const endDate = customEndDate || new Date();
      const formatDate = (d) => d.toISOString().split('T')[0];

      let insights = [];
      try {
        insights = await ad.getInsights(
          ['impressions', 'clicks', 'spend', 'cpc', 'ctr', 'cpm', 'reach', 'frequency', 'actions', 'cost_per_action_type', 'date_start', 'date_stop'],
          { time_range: { since: formatDate(startDate), until: formatDate(endDate) }, time_increment: 1, limit: 1000 }
        );
      } catch (err) {
        console.warn(`MetaAds: Erro insights ad ${adId}:`, err.message);
        return [];
      }

      if (!insights || insights.length === 0) return [];

      return insights.map(data => {
        const conversions = data.actions?.find(a => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead');
        const costPerResult = data.cost_per_action_type?.find(a => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead');
        return {
          date: data.date_start || data.date_stop,
          impressions: Number(data.impressions || 0), clicks: Number(data.clicks || 0),
          spend: Number(data.spend || 0), cpc: Number(data.cpc || 0), ctr: Number(data.ctr || 0),
          cpm: Number(data.cpm || 0), reach: Number(data.reach || 0), frequency: Number(data.frequency || 0),
          conversions: conversions ? Number(conversions.value) : 0,
          costPerResult: costPerResult ? Number(costPerResult.value) : 0,
        };
      });
    });
  }

  // ============================================================
  // Lead Forms (Formulários Instantâneos)
  // ============================================================

  /**
   * Obtém o Page Access Token a partir do User Token.
   * Lead Forms requerem Page Token (não User Token).
   * @param {string} pageId
   * @returns {Promise<string>}
   */
  async _getPageToken(pageId) {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${META_ACCESS_TOKEN}`
    );
    const data = await res.json();
    if (data.error) throw new Error(`Meta API getPageToken: ${data.error.message}`);
    return data.access_token;
  }

  /**
   * Cria um Lead Form (Formulário Instantâneo) numa Page.
   * IMPORTANTE: Usa Page Access Token (obtido automaticamente).
   * @param {Object} params
   * @param {string} [params.pageId] - Page ID (ou usa META_DEFAULT_PAGE_ID)
   * @param {string} params.name - Nome do formulário
   * @param {Array} params.questions - [{type, key?, label?, options?: [{key, value}]}]
   * @param {string} params.privacyPolicyUrl - URL da política de privacidade
   * @param {string} [params.followUpUrl] - URL de follow-up (obrigatório pela API)
   * @param {Object} [params.welcomeScreen] - {title, description}
   * @param {Object} [params.thankYouPage] - {title, body, buttonText, buttonUrl}
   * @returns {Promise<{id: string}>}
   */
  async createLeadForm({ pageId, name, questions, privacyPolicyUrl, followUpUrl, welcomeScreen, thankYouPage }) {
    this._ensureReady();
    const pid = pageId || META_DEFAULT_PAGE_ID;
    if (!pid) throw new Error('pageId não informado e META_PAGE_ID não configurado.');

    return this._withRetry(async () => {
      // Lead forms requerem Page Access Token
      const pageToken = await this._getPageToken(pid);

      const params = new URLSearchParams();
      params.append('name', name);
      params.append('questions', JSON.stringify(questions));
      params.append('privacy_policy', JSON.stringify({ url: privacyPolicyUrl }));
      params.append('follow_up_action_url', followUpUrl || privacyPolicyUrl);
      params.append('access_token', pageToken);

      if (welcomeScreen) {
        params.append('context_card', JSON.stringify({
          title: welcomeScreen.title,
          content: [welcomeScreen.description],
          style: 'PARAGRAPH_STYLE',
        }));
      }

      if (thankYouPage) {
        params.append('thank_you_page', JSON.stringify({
          title: thankYouPage.title,
          body: thankYouPage.body,
          button_text: thankYouPage.buttonText,
          button_type: 'VIEW_WEBSITE',
          website_url: thankYouPage.buttonUrl,
        }));
      }

      const res = await fetch(`https://graph.facebook.com/v21.0/${pid}/leadgen_forms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await res.json();
      if (data.error) throw new Error(`Meta API createLeadForm: ${data.error.message}`);

      console.log(`MetaAds: Lead Form criado: ${data.id} (${name})`);
      return { id: data.id };
    });
  }

  /**
   * Busca leads de um formulário.
   * @param {string} formId - ID do formulário
   * @param {number} [limit=50]
   * @returns {Promise<Array>} Array de leads com campos parseados
   */
  async getFormLeads(formId, limit = 50) {
    this._ensureReady();

    return this._withRetry(async () => {
      const fields = 'id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name';
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${formId}/leads?fields=${fields}&limit=${limit}&access_token=${META_ACCESS_TOKEN}`
      );

      const data = await res.json();
      if (data.error) throw new Error(`Meta API getFormLeads: ${data.error.message}`);

      return (data.data || []).map(lead => ({
        id: lead.id,
        createdTime: lead.created_time,
        fields: (lead.field_data || []).reduce((acc, f) => {
          acc[f.name] = f.values?.[0] || '';
          return acc;
        }, {}),
        adId: lead.ad_id,
        adName: lead.ad_name,
        adsetId: lead.adset_id,
        adsetName: lead.adset_name,
        campaignId: lead.campaign_id,
        campaignName: lead.campaign_name,
      }));
    });
  }

  /**
   * Busca dados de um lead específico pelo ID.
   * Usado pelo webhook handler para obter dados após receber leadgen event.
   * @param {string} leadId - ID do lead (leadgen_id do webhook)
   * @returns {Promise<Object>}
   */
  async getLeadById(leadId) {
    this._ensureReady();

    return this._withRetry(async () => {
      const fields = 'id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name';
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${leadId}?fields=${fields}&access_token=${META_ACCESS_TOKEN}`
      );

      const data = await res.json();
      if (data.error) throw new Error(`Meta API getLeadById: ${data.error.message}`);

      return {
        id: data.id,
        createdTime: data.created_time,
        fields: (data.field_data || []).reduce((acc, f) => {
          acc[f.name] = f.values?.[0] || '';
          return acc;
        }, {}),
        adId: data.ad_id,
        adName: data.ad_name,
        adsetId: data.adset_id,
        adsetName: data.adset_name,
        campaignId: data.campaign_id,
        campaignName: data.campaign_name,
      };
    });
  }

  // ============================================================
  // Públicos
  // ============================================================

  /**
   * Lista custom audiences.
   * @returns {Promise<Array>}
   */
  async listAudiences(adAccountId) {
    this._ensureReady();
    const account = this._getAccount(adAccountId);

    return this._withRetry(async () => {
      const audiences = await account.getCustomAudiences([
        CustomAudience.Fields.id,
        CustomAudience.Fields.name,
        CustomAudience.Fields.approximate_count,
        CustomAudience.Fields.subtype,
      ], { limit: 100 });

      return audiences.map((a) => ({
        id: a.id,
        name: a.name,
        size: a.approximate_count || 0,
        subtype: a.subtype,
      }));
    });
  }

  /**
   * Cria custom audience.
   * @param {Object} params
   * @returns {Promise<{id: string}>}
   */
  async createCustomAudience({ name, description, subtype = 'CUSTOM', adAccountId }) {
    this._ensureReady();
    const account = this._getAccount(adAccountId);

    return this._withRetry(async () => {
      const result = await account.createCustomAudience([], {
        [CustomAudience.Fields.name]: name,
        [CustomAudience.Fields.description]: description || '',
        [CustomAudience.Fields.subtype]: subtype,
      });

      console.log(`MetaAds: Audience criada: ${result.id} (${name})`);
      return { id: result.id };
    });
  }
}

module.exports = MetaAds;
