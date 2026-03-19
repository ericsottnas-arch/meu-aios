// meu-projeto/lib/ghl-syncer.js
// Orquestra coleta de dados do GHL API e grava no SQLite
// Segue mesmo padrão de ads-syncer.js
const GhlCrm = require('./ghl-crm');
const celoConfig = require('./celo-config');
const ghlDb = require('./ghl-analytics-db');
const ghlConvDb = require('./ghl-db');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

class GhlSyncer {
  constructor() {
    this._initialized = false;
    this._syncing = new Map();
    this._lastSync = new Map();
  }

  async init() {
    if (this._initialized) return true;
    try {
      ghlDb.initDB();
      this._initialized = true;
      console.log('GhlSyncer: Inicializado');
      return true;
    } catch (err) {
      console.error('GhlSyncer: Erro na inicialização:', err.message);
      return false;
    }
  }

  /**
   * Extrai UTM attribution de uma opportunity (mesma lógica do getCrmSummary).
   * Prioridade: opp.attributions → opp.customFields → fallback source
   */
  _extractUtm(opp) {
    // 1. Attributions da opportunity
    const oppAttr = opp?.attributions?.find(a => a.isFirst) || opp?.attributions?.[0];
    if (oppAttr?.utmCampaign) {
      return {
        campaign: oppAttr.utmCampaign,
        content: oppAttr.utmContent || null,
        medium: oppAttr.utmMedium || null,
        source: oppAttr.utmSource || oppAttr.adSource || null,
      };
    }
    // 2. Custom fields (GHL custom field IDs para UTM)
    if (opp?.customFields?.length > 0) {
      const cfCampaign = opp.customFields.find(f => f.id === 'O96F4460z9JJ6FSXQv3u');
      const cfAd = opp.customFields.find(f => f.id === 'BGjsgW0wop8bwApitpHV');
      if (cfCampaign?.fieldValueString) {
        return {
          campaign: cfCampaign.fieldValueString,
          content: cfAd?.fieldValueString || null,
          medium: null,
          source: opp.source || null,
        };
      }
    }
    // 3. Fallback: source da opportunity
    return {
      campaign: opp.source || null,
      content: null,
      medium: null,
      source: opp.source || null,
    };
  }

  /**
   * Sincroniza dados de um cliente específico
   */
  async syncClient(clientId) {
    if (!this._initialized) await this.init();
    if (this._syncing.get(clientId)) {
      console.log(`GhlSyncer: ${clientId} já está sincronizando, pulando`);
      return { skipped: true };
    }

    this._syncing.set(clientId, true);
    const startTime = Date.now();
    const stats = { opportunities: 0, contacts: 0 };

    try {
      const config = celoConfig.getConfig();
      const client = config.clients[clientId];
      if (!client) throw new Error(`Cliente ${clientId} não configurado`);

      const locationId = client.ghlLocationId;
      const token = client.ghlToken || process.env.GHL_ACCESS_TOKEN;
      if (!locationId || !token) throw new Error(`Cliente ${clientId} sem GHL configurado`);

      const ghl = new GhlCrm(locationId, token);
      const pipelineId = client.ghlPipelineId;

      console.log(`GhlSyncer: Sincronizando ${clientId}...`);

      // Migrate DB schema if needed
      ghlDb.migrateAddUtmColumns();

      // 1. Pipeline stages
      const pipelines = await ghl.getPipelines();
      const pipeline = pipelineId
        ? pipelines.find(p => p.id === pipelineId)
        : pipelines[0];

      if (pipeline && pipeline.stages) {
        ghlDb.upsertPipelineStages(clientId, pipeline.id, pipeline.name, pipeline.stages);
      }

      await delay(1000);

      // 2. Opportunities (open, won, lost)
      const pid = pipeline?.id || pipelineId;
      if (pid) {
        const stageMap = {};
        if (pipeline?.stages) {
          for (const s of pipeline.stages) stageMap[s.id] = s.name;
        }

        const [open, won, lost] = await Promise.all([
          ghl.searchOpportunities({ pipelineId: pid, status: 'open', limit: 100 }),
          ghl.searchOpportunities({ pipelineId: pid, status: 'won', limit: 100 }),
          ghl.searchOpportunities({ pipelineId: pid, status: 'lost', limit: 100 }),
        ]);

        const mapOpp = (opp, status) => {
          const utm = this._extractUtm(opp);
          return {
            id: opp.id,
            name: opp.name || opp.contact?.name || '-',
            contactId: opp.contact?.id || opp.contactId || null,
            contactName: opp.contact?.name || '-',
            contactEmail: opp.contact?.email || '',
            contactPhone: opp.contact?.phone || '',
            pipelineId: pid,
            pipelineStageId: opp.pipelineStageId,
            stageName: stageMap[opp.pipelineStageId] || 'Outro',
            status,
            monetaryValue: opp.monetaryValue || 0,
            source: opp.source || '',
            utmCampaign: utm.campaign,
            utmContent: utm.content,
            utmMedium: utm.medium,
            utmSource: utm.source,
            tags: opp.contact?.tags || [],
            createdAt: opp.createdAt || '',
            updatedAt: opp.updatedAt || '',
          };
        };

        const allOpps = [
          ...open.map(o => mapOpp(o, 'open')),
          ...won.map(o => mapOpp(o, 'won')),
          ...lost.map(o => mapOpp(o, 'lost')),
        ];

        ghlDb.upsertOpportunities(clientId, allOpps);
        stats.opportunities = allOpps.length;

        // Daily snapshot for today
        const today = new Date().toISOString().split('T')[0];
        const todayOpps = allOpps.filter(o => (o.createdAt || '').substring(0, 10) === today);
        ghlDb.upsertDailySnapshot(clientId, today, {
          totalOpen: open.length,
          totalWon: won.length,
          totalLost: lost.length,
          wonValue: won.reduce((s, o) => s + (o.monetaryValue || 0), 0),
          newOpportunities: todayOpps.length,
        });
      }

      await delay(1500);

      // 3. Contacts (recent 100) + backfill UTM from contacts on opportunities
      try {
        const contacts = await ghl.getContacts({ limit: 100 });
        if (contacts && contacts.length > 0) {
          // Para cada contato, buscar detalhes completos (inclui attributions)
          // Fazemos em batches para não sobrecarregar a API
          const enriched = [];
          for (let i = 0; i < contacts.length; i += 5) {
            const batch = contacts.slice(i, i + 5);
            const details = await Promise.allSettled(
              batch.map(c => ghl.getContact(c.id).catch(() => null))
            );
            for (let j = 0; j < batch.length; j++) {
              const detail = details[j]?.status === 'fulfilled' ? details[j].value : null;
              if (detail) {
                // Mesclar attributions do detalhe no contato
                if (detail.attributions) batch[j].attributions = detail.attributions;
                if (detail.attributionSource) batch[j].attributionSource = detail.attributionSource;
              }
              enriched.push(batch[j]);
            }
            if (i + 5 < contacts.length) await delay(500);
          }
          ghlDb.upsertContacts(clientId, enriched);
          stats.contacts = enriched.length;

          // Count today's new contacts for snapshot
          const today = new Date().toISOString().split('T')[0];
          const todayContacts = contacts.filter(c => (c.dateAdded || '').substring(0, 10) === today);
          if (todayContacts.length > 0) {
            // Update snapshot with new_contacts
            const existing = ghlDb.getDailySnapshots(clientId, today, today);
            if (existing.length > 0) {
              ghlDb.upsertDailySnapshot(clientId, today, {
                totalOpen: existing[0].total_open,
                totalWon: existing[0].total_won,
                totalLost: existing[0].total_lost,
                wonValue: existing[0].won_value,
                newOpportunities: existing[0].new_opportunities,
                newContacts: todayContacts.length,
              });
            }
          }
        }
      } catch (err) {
        console.warn(`GhlSyncer: Erro contacts ${clientId}:`, err.message);
      }

      // 4. Sync conversations for contacts with contact_id
      await delay(1500);
      try {
        stats.conversations = 0;
        stats.messages = 0;

        // Collect contact_ids from opportunities
        const allOppsForConv = ghlDb.getOpportunities(clientId);
        const contactIds = new Set();
        const phoneToOppId = new Map();

        for (const opp of allOppsForConv) {
          if (opp.contactId) {
            contactIds.add(opp.contactId);
          } else if (opp.contactPhone) {
            // Track phone → opportunity for later contact_id backfill
            const normalized = opp.contactPhone.replace(/\D/g, '');
            if (normalized) phoneToOppId.set(normalized, opp.id);
          }
        }

        // For contacts without contact_id, try to find via phone in GHL
        for (const [phone, oppId] of phoneToOppId) {
          if (contactIds.size >= 150) break; // rate limit guard
          try {
            const found = await ghl.searchContactByPhone(phone);
            if (found.success && found.data?.id) {
              contactIds.add(found.data.id);
              // Backfill contact_id on the opportunity
              ghlDb.updateOpportunityContactId(oppId, found.data.id);
            }
            await delay(500);
          } catch (e) { /* phone search failed */ }
        }

        // Sync conversations (max 30 contacts, rate limit 2/s)
        let syncedCount = 0;
        for (const contactId of contactIds) {
          if (syncedCount >= 150) break;

          try {
            const convResult = await ghl.searchConversations(contactId);
            if (!convResult.success || convResult.data.length === 0) {
              syncedCount++;
              await delay(500);
              continue;
            }

            for (const conv of convResult.data.slice(0, 3)) {
              // Save conversation
              ghlConvDb.saveConversation({
                conversationId: conv.id,
                contactId: contactId,
                contactName: conv.contactName || conv.fullName || '-',
                status: conv.type === 'TYPE_PHONE' ? 'active' : (conv.inbox_status || 'active'),
                type: conv.type || 'sms',
                fromNumber: conv.phone || null,
                toNumber: null,
                lastMessageDate: conv.lastMessageDate ? new Date(conv.lastMessageDate).getTime() : Date.now(),
                unreadCount: conv.unreadCount || 0,
              });
              stats.conversations++;

              // Fetch messages for this conversation
              await delay(500);
              const msgsResult = await ghl.getConversationMessages(conv.id, 50);
              if (msgsResult.success && msgsResult.data.length > 0) {
                for (const msg of msgsResult.data) {
                  try {
                    ghlConvDb.saveMessage({
                      messageId: msg.id || msg.messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                      conversationId: conv.id,
                      body: msg.body || msg.message || '',
                      from: msg.from || msg.phone || null,
                      to: msg.to || null,
                      timestamp: msg.dateAdded ? new Date(msg.dateAdded).getTime() / 1000 : Date.now() / 1000,
                      direction: msg.direction === 1 || msg.direction === 'inbound' ? 'inbound' : 'outbound',
                      messageType: msg.contentType || msg.type || 'text',
                      attachments: msg.attachments || [],
                    });
                    stats.messages++;
                  } catch (e) { /* duplicate message, skip */ }
                }
              }
            }
          } catch (e) {
            console.warn(`GhlSyncer: Erro sync conv ${contactId}:`, e.message);
          }

          syncedCount++;
          await delay(500);
        }

        if (stats.conversations > 0) {
          console.log(`GhlSyncer: 💬 ${stats.conversations} conversas, ${stats.messages} mensagens sincronizadas`);
        }
      } catch (err) {
        console.warn(`GhlSyncer: Erro sync conversations ${clientId}:`, err.message);
      }

      const durationMs = Date.now() - startTime;
      stats.durationMs = durationMs;
      ghlDb.logSync(clientId, 'success', stats);
      this._lastSync.set(clientId, new Date());

      console.log(`GhlSyncer: ✅ ${clientId} sincronizado em ${(durationMs / 1000).toFixed(1)}s — ${stats.opportunities} opps, ${stats.contacts} contacts`);
      return stats;

    } catch (err) {
      const durationMs = Date.now() - startTime;
      ghlDb.logSync(clientId, 'error', { ...stats, durationMs, error: err.message });
      console.error(`GhlSyncer: ❌ Erro sincronizando ${clientId}:`, err.message);
      return { ...stats, error: err.message };
    } finally {
      this._syncing.set(clientId, false);
    }
  }

  /**
   * Sincroniza todos os clientes ativos com GHL configurado
   */
  async syncAllClients() {
    if (!this._initialized) await this.init();

    const config = celoConfig.getConfig();
    const clients = Object.keys(config.clients).filter(id => {
      const c = config.clients[id];
      return c.active !== false && c.ghlLocationId && (c.ghlToken || process.env.GHL_ACCESS_TOKEN);
    });
    const results = new Map();

    for (const clientId of clients) {
      try {
        const result = await this.syncClient(clientId);
        results.set(clientId, { success: true, ...result });
      } catch (err) {
        results.set(clientId, { success: false, error: err.message });
      }
      await delay(3000);
    }

    return results;
  }

  getStatus() {
    const status = {};
    for (const [clientId, date] of this._lastSync) {
      status[clientId] = {
        lastSync: date.toISOString(),
        syncing: this._syncing.get(clientId) || false,
      };
    }
    return status;
  }
}

module.exports = GhlSyncer;
