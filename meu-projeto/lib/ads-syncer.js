// meu-projeto/lib/ads-syncer.js
// Orquestra coleta de dados da Meta API + Google Ads API e grava no SQLite
const MetaAds = require('./meta-ads');
const GoogleAds = require('./google-ads');
const celoConfig = require('./celo-config');
const adsDb = require('./ads-db');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

class AdsSyncer {
  constructor() {
    this.metaAds = new MetaAds();
    this.googleAds = new GoogleAds();
    this._initialized = false;
    this._googleInitialized = false;
    this._syncing = new Map(); // client:platform → boolean
    this._lastSync = new Map(); // client:platform → Date
  }

  async init() {
    if (this._initialized) return true;
    try {
      await this.metaAds.init();
      adsDb.initDB();
      this._initialized = true;
      console.log('AdsSyncer: Meta Ads inicializado');

      // Tentar inicializar Google Ads (não-bloqueante)
      try {
        this._googleInitialized = await this.googleAds.init();
        if (this._googleInitialized) {
          console.log('AdsSyncer: Google Ads inicializado');
        }
      } catch (err) {
        console.warn('AdsSyncer: Google Ads não configurado:', err.message);
      }

      return true;
    } catch (err) {
      console.error('AdsSyncer: Erro na inicialização:', err.message);
      return false;
    }
  }

  /**
   * Sincroniza dados de um cliente específico
   * @param {string} clientId
   * @param {Object} [options]
   * @param {Date} [options.startDate] - Data inicial (default: 6 meses atrás)
   * @param {Date} [options.endDate] - Data final (default: hoje)
   * @returns {Promise<Object>} Stats da sincronização
   */
  async syncClient(clientId, options = {}) {
    if (!this._initialized) await this.init();

    const platform = options.platform || 'meta';
    const syncKey = `${clientId}:${platform}`;

    if (this._syncing.get(syncKey)) {
      console.log(`AdsSyncer: ${syncKey} já está sincronizando, pulando`);
      return { skipped: true };
    }

    // Redirecionar para sync Google se plataforma for google
    if (platform === 'google') {
      return this.syncGoogleClient(clientId, options);
    }

    this._syncing.set(syncKey, true);
    const startTime = Date.now();
    const stats = { campaigns: 0, adsets: 0, ads: 0, dailyRows: 0 };

    try {
      const client = celoConfig.getClient(clientId);
      if (!client) throw new Error(`Cliente ${clientId} não configurado`);

      const adAccountId = client.metaAdAccountId;
      if (!adAccountId) throw new Error(`Cliente ${clientId} sem metaAdAccountId`);

      // Se já tem dados, buscar só últimos 7 dias (sync incremental rápido)
      // Primeiro sync busca 6 meses completos
      const hasExistingData = adsDb.hasData(clientId);
      const startDate = options.startDate || (() => {
        const d = new Date();
        d.setDate(d.getDate() - (hasExistingData ? 7 : 180));
        return d;
      })();
      const endDate = options.endDate || new Date();

      // Delays menores no sync incremental (já tem dados, só precisa atualizar)
      const apiDelay = hasExistingData ? 1000 : 2000;
      const insightDelay = hasExistingData ? 1500 : 3000;

      console.log(`AdsSyncer: Sincronizando ${clientId} (${hasExistingData ? 'incremental 7d' : 'full 6m'})...`);

      // 1. Listar campanhas
      const campaigns = await this.metaAds.listCampaigns({ adAccountId });

      // No sync incremental, priorizar ativas; no full, todas
      const campaignsToSync = hasExistingData
        ? campaigns.filter(c => c.status === 'ACTIVE')
        : campaigns;

      // Sempre upsert metadata de todas (rápido, sem API call)
      for (const campaign of campaigns) {
        adsDb.upsertCampaign(clientId, campaign, 'meta');
        stats.campaigns++;
      }

      for (const campaign of campaignsToSync) {
        // 2. Insights diários por campanha
        await delay(apiDelay);
        try {
          const dailyInsights = await this.metaAds.getCampaignInsightsDaily(campaign.id, startDate, endDate);
          if (dailyInsights.length > 0) {
            adsDb.upsertCampaignDailyInsights(clientId, campaign.id, dailyInsights, 'meta');
            stats.dailyRows += dailyInsights.length;
          }
        } catch (err) {
          console.warn(`AdsSyncer: Erro insights campanha ${campaign.id}:`, err.message);
        }

        // 3. Adsets da campanha
        await delay(apiDelay);
        try {
          const adsets = await this.metaAds.getCampaignAdsets(campaign.id);
          for (const adset of adsets) {
            adsDb.upsertAdset(clientId, campaign.id, adset, 'meta');
            stats.adsets++;

            // 4. Insights diários por adset
            await delay(insightDelay);
            try {
              const adsetInsights = await this.metaAds.getAdsetInsightsDaily(adset.id, startDate, endDate);
              if (adsetInsights.length > 0) {
                adsDb.upsertAdsetDailyInsights(clientId, adset.id, adsetInsights, 'meta');
                stats.dailyRows += adsetInsights.length;
              }
            } catch (err) {
              console.warn(`AdsSyncer: Erro insights adset ${adset.id}:`, err.message);
            }

            // 5. Ads do adset
            await delay(apiDelay);
            try {
              const ads = await this.metaAds.getAdsetAds(adset.id);
              for (const ad of ads) {
                adsDb.upsertAd(clientId, campaign.id, adset.id, ad, 'meta');
                stats.ads++;

                // 6. Insights diários por ad
                await delay(insightDelay);
                try {
                  const adInsights = await this.metaAds.getAdInsightsDaily(ad.id, startDate, endDate);
                  if (adInsights.length > 0) {
                    adsDb.upsertAdDailyInsights(clientId, ad.id, adInsights, 'meta');
                    stats.dailyRows += adInsights.length;
                  }
                } catch (err) {
                  console.warn(`AdsSyncer: Erro insights ad ${ad.id}:`, err.message);
                }
              }
            } catch (err) {
              console.warn(`AdsSyncer: Erro ads adset ${adset.id}:`, err.message);
            }
          }
        } catch (err) {
          console.warn(`AdsSyncer: Erro adsets campanha ${campaign.id}:`, err.message);
        }
      }

      const durationMs = Date.now() - startTime;
      stats.durationMs = durationMs;
      adsDb.logSync(clientId, 'success', stats, 'meta');
      this._lastSync.set(`${clientId}:meta`, new Date());

      console.log(`AdsSyncer: ✅ ${clientId} [meta] sincronizado em ${(durationMs / 1000).toFixed(1)}s — ${stats.campaigns} campanhas, ${stats.adsets} adsets, ${stats.ads} ads, ${stats.dailyRows} linhas diárias`);
      return stats;

    } catch (err) {
      const durationMs = Date.now() - startTime;
      adsDb.logSync(clientId, 'error', { ...stats, durationMs, error: err.message }, 'meta');
      console.error(`AdsSyncer: ❌ Erro sincronizando ${clientId} [meta]:`, err.message);
      return { ...stats, error: err.message };
    } finally {
      this._syncing.set(syncKey, false);
    }
  }

  /**
   * Sincroniza dados do Google Ads de um cliente
   * @param {string} clientId
   * @param {Object} [options]
   * @returns {Promise<Object>} Stats da sincronização
   */
  async syncGoogleClient(clientId, options = {}) {
    if (!this._googleInitialized) {
      console.warn(`AdsSyncer: Google Ads não inicializado, pulando sync de ${clientId}`);
      return { skipped: true, reason: 'google_not_initialized' };
    }

    const syncKey = `${clientId}:google`;
    if (this._syncing.get(syncKey)) {
      console.log(`AdsSyncer: ${syncKey} já está sincronizando, pulando`);
      return { skipped: true };
    }

    this._syncing.set(syncKey, true);
    const startTime = Date.now();
    const stats = { campaigns: 0, adgroups: 0, ads: 0, dailyRows: 0, platform: 'google' };

    try {
      const client = celoConfig.getClient(clientId);
      if (!client) throw new Error(`Cliente ${clientId} não configurado`);

      const customerId = client.googleCustomerId;
      if (!customerId) throw new Error(`Cliente ${clientId} sem googleCustomerId`);

      this.googleAds.setLastCustomerId(customerId);

      // Determinar range de datas
      const hasExistingData = adsDb.hasData(clientId); // TODO: filtrar por platform
      const startDate = options.startDate || (() => {
        const d = new Date();
        d.setDate(d.getDate() - (hasExistingData ? 7 : 90)); // Google: 90 dias no primeiro sync
        return d;
      })();
      const endDate = options.endDate || new Date();

      console.log(`AdsSyncer: Sincronizando ${clientId} [google] (${hasExistingData ? 'incremental 7d' : 'full 90d'})...`);

      // 1. Listar campanhas
      const campaigns = await this.googleAds.listCampaigns({ customerId });

      for (const campaign of campaigns) {
        adsDb.upsertCampaign(clientId, campaign, 'google');
        stats.campaigns++;
      }

      // Sync ativas
      const activeCampaigns = hasExistingData
        ? campaigns.filter(c => c.status === 'ACTIVE')
        : campaigns;

      for (const campaign of activeCampaigns) {
        // 2. Insights diários
        await delay(1000);
        try {
          const dailyInsights = await this.googleAds.getCampaignInsightsDaily(
            campaign.id, startDate, endDate, customerId
          );
          if (dailyInsights.length > 0) {
            adsDb.upsertCampaignDailyInsights(clientId, campaign.id, dailyInsights, 'google');
            stats.dailyRows += dailyInsights.length;
          }
        } catch (err) {
          console.warn(`AdsSyncer: Erro insights google campanha ${campaign.id}:`, err.message);
        }

        // 3. Ad Groups (equivalente a adsets)
        await delay(1000);
        try {
          const adGroups = await this.googleAds.getCampaignAdGroups(campaign.id, customerId);
          for (const ag of adGroups) {
            adsDb.upsertAdset(clientId, campaign.id, {
              id: ag.id,
              name: ag.name,
              status: ag.status,
              dailyBudget: ag.cpcBid,
            }, 'google');
            stats.adgroups++;

            // 4. Ads do ad group
            await delay(1000);
            try {
              const ads = await this.googleAds.getAdGroupAds(ag.id, customerId);
              for (const ad of ads) {
                adsDb.upsertAd(clientId, campaign.id, ag.id, {
                  id: ad.id,
                  name: ad.name || `RSA ${ad.id}`,
                  status: ad.status,
                }, 'google');
                stats.ads++;
              }
            } catch (err) {
              console.warn(`AdsSyncer: Erro ads google adgroup ${ag.id}:`, err.message);
            }
          }
        } catch (err) {
          console.warn(`AdsSyncer: Erro adgroups google campanha ${campaign.id}:`, err.message);
        }
      }

      const durationMs = Date.now() - startTime;
      stats.durationMs = durationMs;
      adsDb.logSync(clientId, 'success', stats, 'google');
      this._lastSync.set(syncKey, new Date());

      console.log(`AdsSyncer: ✅ ${clientId} [google] sincronizado em ${(durationMs / 1000).toFixed(1)}s — ${stats.campaigns} campanhas, ${stats.adgroups} ad groups, ${stats.ads} ads, ${stats.dailyRows} linhas diárias`);
      return stats;

    } catch (err) {
      const durationMs = Date.now() - startTime;
      adsDb.logSync(clientId, 'error', { ...stats, durationMs, error: err.message }, 'google');
      console.error(`AdsSyncer: ❌ Erro sincronizando ${clientId} [google]:`, err.message);
      return { ...stats, error: err.message };
    } finally {
      this._syncing.set(syncKey, false);
    }
  }

  /**
   * Sincroniza todos os clientes ativos
   * @returns {Promise<Map<string, Object>>} Resultados por cliente
   */
  async syncAllClients() {
    if (!this._initialized) await this.init();

    const config = celoConfig.getConfig();
    const results = new Map();

    // Sync Meta Ads clients
    const metaClients = Object.keys(config.clients).filter(id => {
      const c = config.clients[id];
      return c.active !== false && c.metaAdAccountId;
    });

    for (const clientId of metaClients) {
      try {
        const result = await this.syncClient(clientId, { platform: 'meta' });
        results.set(`${clientId}:meta`, { success: true, ...result });
      } catch (err) {
        results.set(`${clientId}:meta`, { success: false, error: err.message });
      }
      await delay(5000);
    }

    // Sync Google Ads clients
    if (this._googleInitialized) {
      const googleClients = Object.keys(config.clients).filter(id => {
        const c = config.clients[id];
        const platforms = Array.isArray(c.adsPlatform) ? c.adsPlatform : [c.adsPlatform];
        return c.active !== false && platforms.includes('google') && c.googleCustomerId;
      });

      for (const clientId of googleClients) {
        try {
          const result = await this.syncGoogleClient(clientId);
          results.set(`${clientId}:google`, { success: true, ...result });
        } catch (err) {
          results.set(`${clientId}:google`, { success: false, error: err.message });
        }
        await delay(5000);
      }
    }

    return results;
  }

  /**
   * Retorna status de sincronização
   */
  getStatus() {
    const status = {};
    for (const [key, date] of this._lastSync) {
      status[key] = {
        lastSync: date.toISOString(),
        syncing: this._syncing.get(key) || false,
      };
    }
    return status;
  }

  /**
   * Verifica se Google Ads está pronto para sync
   */
  isGoogleReady() {
    return this._googleInitialized;
  }
}

module.exports = AdsSyncer;
