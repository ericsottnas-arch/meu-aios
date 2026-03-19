/**
 * GoHighLevel CRM API Client.
 * Puxa contacts, opportunities, pipelines para análise do Celo.
 */

const GHL_API_KEY = (process.env.GHL_API_KEY || process.env.GHL_ACCESS_TOKEN)?.replace(/"/g, '');
const GHL_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

// Mapa de custom field IDs de UTM por GHL Location
const UTM_FIELD_IDS = {
  // Dr. Erico Servano
  '9VML3WG6LUoz7Eh5fb9U': {
    utm_campaign: 'O96F4460z9JJ6FSXQv3u',
    utm_content:  'BGjsgW0wop8bwApitpHV',
    utm_medium:   'QH9zCiiWjZVWCf8wiPtN',
    utm_source:   'uJIkW7Z9xX51hbCJfRHy',
    utm_term:     'lRortWtYNLZNDMcbADvE',
  },
  // Dra. Gabrielle
  '3iNi7kJci5f0BNUoq4kX': {
    utm_campaign: 'PEb0UqOHTKwMblxFOOFd',
    utm_content:  'HduNVCKRDhjpPsuVgUts',
    utm_medium:   'IWoEl0lJjXe8GCo7thtv',
    utm_source:   '5t8Kna1ywvNEQqjl8PLD',
    utm_term:     'i40quoFcV3KK8udpdXZ2',
  },
  // Fallback (usa IDs do Erico como default)
  'default': {
    utm_campaign: 'O96F4460z9JJ6FSXQv3u',
    utm_content:  'BGjsgW0wop8bwApitpHV',
    utm_medium:   'QH9zCiiWjZVWCf8wiPtN',
    utm_source:   'uJIkW7Z9xX51hbCJfRHy',
    utm_term:     'lRortWtYNLZNDMcbADvE',
  },
};

class GhlCrm {
  /**
   * @param {string} locationId - GHL Location ID
   * @param {string} [apiKey] - Override API key
   */
  constructor(locationId, apiKey) {
    this.locationId = locationId;
    this.apiKey = apiKey || GHL_API_KEY;
  }

  // ============================================================
  // HTTP
  // ============================================================

  async _request(method, path, params = {}) {
    const url = new URL(`${GHL_BASE}${path}`);
    if (method === 'GET' && Object.keys(params).length > 0) {
      for (const [k, v] of Object.entries(params)) {
        if (v != null) url.searchParams.set(k, String(v));
      }
    }

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Version': API_VERSION,
        'Accept': 'application/json',
      },
    };

    if (method !== 'GET' && Object.keys(params).length > 0) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(params);
    }

    const res = await fetch(url, options);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GHL ${method} ${path}: ${res.status} — ${body}`);
    }
    return res.json();
  }

  // ============================================================
  // Pipelines
  // ============================================================

  async getPipelines() {
    const data = await this._request('GET', '/opportunities/pipelines', {
      locationId: this.locationId,
    });
    return data.pipelines || [];
  }

  // ============================================================
  // Opportunities
  // ============================================================

  /**
   * Busca opportunities com filtros.
   * @param {Object} [options]
   * @param {string} [options.pipelineId]
   * @param {string} [options.stageId]
   * @param {string} [options.status] - 'open', 'won', 'lost', 'abandoned'
   * @param {number} [options.limit=100]
   * @returns {Promise<Array>}
   */
  async searchOpportunities(options = {}) {
    const params = {
      location_id: this.locationId,
      limit: options.limit || 100,
    };
    if (options.pipelineId) params.pipeline_id = options.pipelineId;
    if (options.stageId) params.pipeline_stage_id = options.stageId;
    if (options.status) params.status = options.status;

    const data = await this._request('GET', '/opportunities/search', params);
    return data.opportunities || [];
  }

  /**
   * Conta opportunities por stage do pipeline.
   * @param {string} pipelineId
   * @returns {Promise<Object>} { stageName: count, ... }
   */
  async getOpportunitiesByStage(pipelineId) {
    const [pipelines, opportunities] = await Promise.all([
      this.getPipelines(),
      this.searchOpportunities({ pipelineId, status: 'open', limit: 100 }),
    ]);

    const pipeline = pipelines.find((p) => p.id === pipelineId);
    if (!pipeline) return {};

    const stageMap = {};
    for (const stage of pipeline.stages) {
      stageMap[stage.id] = { name: stage.name, position: stage.position, count: 0, value: 0 };
    }

    for (const opp of opportunities) {
      const stage = stageMap[opp.pipelineStageId];
      if (stage) {
        stage.count++;
        stage.value += opp.monetaryValue || 0;
      }
    }

    return {
      pipelineName: pipeline.name,
      stages: Object.values(stageMap).sort((a, b) => a.position - b.position),
      totalOpen: opportunities.length,
    };
  }

  // ============================================================
  // Opportunity CRUD (Iris Pipeline Sync)
  // ============================================================

  /**
   * Cria uma opportunity no pipeline
   * @param {string} contactId - ID do contato
   * @param {string} pipelineId - ID do pipeline
   * @param {string} stageId - ID do stage
   * @param {string} name - Nome da opportunity
   * @param {string} [status='open'] - Status: open, won, lost, abandoned
   * @returns {Promise<Object>}
   */
  async createOpportunity(contactId, pipelineId, stageId, name, status = 'open') {
    const data = await this._request('POST', '/opportunities/', {
      pipelineId,
      locationId: this.locationId,
      name,
      pipelineStageId: stageId,
      contactId,
      status,
    });
    return data.opportunity || data;
  }

  /**
   * Atualiza o stage de uma opportunity
   * @param {string} opportunityId - ID da opportunity
   * @param {string} stageId - Novo stage ID
   * @returns {Promise<Object>}
   */
  async updateOpportunityStage(opportunityId, stageId) {
    const data = await this._request('PUT', `/opportunities/${opportunityId}`, {
      pipelineStageId: stageId,
    });
    return data.opportunity || data;
  }

  /**
   * Atualiza o status de uma opportunity (open, won, lost, abandoned)
   * @param {string} opportunityId - ID da opportunity
   * @param {string} status - Novo status
   * @returns {Promise<Object>}
   */
  async updateOpportunityStatus(opportunityId, status) {
    const data = await this._request('PUT', `/opportunities/${opportunityId}`, {
      status,
    });
    return data.opportunity || data;
  }

  /**
   * Busca opportunity de um contato em um pipeline especifico
   * @param {string} contactId - ID do contato
   * @param {string} pipelineId - ID do pipeline
   * @returns {Promise<Object|null>}
   */
  async getOpportunityByContact(contactId, pipelineId) {
    try {
      const opps = await this.searchOpportunities({ pipelineId, limit: 100 });
      return opps.find((o) => o.contact?.id === contactId || o.contactId === contactId) || null;
    } catch {
      return null;
    }
  }

  // ============================================================
  // Calendar & Appointments
  // ============================================================

  /**
   * Lista todos os calendários de uma location
   * @returns {Promise<Array>}
   */
  async getCalendars() {
    const data = await this._request('GET', '/calendars/', {
      locationId: this.locationId,
    });
    return data.calendars || [];
  }

  /**
   * Busca horários livres de um calendário
   * @param {string} calendarId - ID do calendário
   * @param {string} startDate - Data início (ISO ou epoch ms)
   * @param {string} endDate - Data fim (ISO ou epoch ms)
   * @param {string} [timezone='America/Sao_Paulo']
   * @returns {Promise<Object>} Mapa de datas com slots disponíveis
   */
  async getFreeSlots(calendarId, startDate, endDate, timezone = 'America/Sao_Paulo') {
    const start = typeof startDate === 'number' ? startDate : new Date(startDate).getTime();
    const end = typeof endDate === 'number' ? endDate : new Date(endDate).getTime();

    const data = await this._request('GET', `/calendars/${calendarId}/free-slots`, {
      startDate: start,
      endDate: end,
      timezone,
    });
    return data;
  }

  /**
   * Cria um appointment no calendário
   * @param {Object} params
   * @param {string} params.calendarId - ID do calendário
   * @param {string} params.contactId - ID do contato GHL
   * @param {string} params.startTime - ISO 8601 (ex: '2026-03-10T15:00:00-03:00')
   * @param {string} params.endTime - ISO 8601
   * @param {string} [params.title] - Título
   * @param {string} [params.notes] - Notas
   * @param {string} [params.appointmentStatus='confirmed']
   * @returns {Promise<Object>}
   */
  async createAppointment(params) {
    const body = {
      calendarId: params.calendarId,
      locationId: this.locationId,
      contactId: params.contactId,
      startTime: params.startTime,
      endTime: params.endTime,
      title: params.title || 'Reunião de Estratégia',
      appointmentStatus: params.appointmentStatus || 'confirmed',
      toNotify: true,
    };

    if (params.notes) body.notes = params.notes;
    if (params.assignedUserId) body.assignedUserId = params.assignedUserId;

    const data = await this._request('POST', '/calendars/events/appointments', body);
    return data;
  }

  /**
   * Busca um appointment por ID
   * @param {string} eventId
   * @returns {Promise<Object>}
   */
  async getAppointment(eventId) {
    const data = await this._request('GET', `/calendars/events/appointments/${eventId}`);
    return data;
  }

  /**
   * Atualiza um appointment
   * @param {string} eventId
   * @param {Object} updates - Campos a atualizar
   * @returns {Promise<Object>}
   */
  async updateAppointment(eventId, updates) {
    const data = await this._request('PUT', `/calendars/events/appointments/${eventId}`, updates);
    return data;
  }

  // ============================================================
  // Contacts
  // ============================================================

  /**
   * Busca contatos recentes.
   * @param {Object} [options]
   * @param {number} [options.limit=50]
   * @param {string} [options.query] - Busca por nome/email/phone
   * @returns {Promise<Array>}
   */
  async getContacts(options = {}) {
    const params = {
      locationId: this.locationId,
      limit: options.limit || 50,
    };
    if (options.query) params.query = options.query;

    const data = await this._request('GET', '/contacts/', params);
    return data.contacts || [];
  }

  /**
   * Busca contato individual por ID (retorna dados completos com attributions).
   */
  async getContact(contactId) {
    const data = await this._request('GET', `/contacts/${contactId}`);
    return data.contact || null;
  }

  /**
   * Busca contato por email exato.
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async getContactByEmail(email) {
    const contacts = await this.getContacts({ query: email.toLowerCase(), limit: 10 });
    return contacts.find((c) => c.email?.toLowerCase() === email.toLowerCase()) || null;
  }

  /**
   * Cria um contato no GHL.
   * @param {Object} data
   * @param {string} [data.email]
   * @param {string} [data.phone] - Telefone (formato +5511999999999)
   * @param {string} [data.firstName]
   * @param {string} [data.lastName]
   * @param {string} [data.name] - Nome completo (alternativa a firstName+lastName)
   * @param {string} [data.source] - Fonte do lead (ex: 'Meta Lead Form')
   * @param {string[]} [data.tags] - Tags para o contato
   * @param {Array} [data.customFields] - Custom fields [{id, field_value}]
   * @returns {Promise<Object>}
   */
  async createContact(data) {
    const body = {
      locationId: this.locationId,
    };

    // Name handling (backward compatible)
    if (data.firstName) {
      body.firstName = data.firstName;
    } else if (data.name) {
      const parts = data.name.split(' ').filter(Boolean);
      body.firstName = parts[0] || 'Lead';
      if (parts.length > 1) body.lastName = parts.slice(1).join(' ');
    } else if (data.email) {
      body.firstName = data.email.split('@')[0];
    } else {
      body.firstName = 'Lead';
    }

    if (data.lastName && !body.lastName) body.lastName = data.lastName;
    if (data.email) body.email = data.email;
    if (data.phone) body.phone = data.phone;
    if (data.source) body.source = data.source;
    if (data.tags && data.tags.length > 0) body.tags = data.tags;
    if (data.customFields && data.customFields.length > 0) body.customField = data.customFields;

    const result = await this._request('POST', '/contacts/', body);
    return result.contact || result;
  }

  /**
   * Busca contato por telefone.
   * @param {string} phone
   * @returns {Promise<Object|null>}
   */
  async getContactByPhone(phone) {
    const contacts = await this.getContacts({ query: phone, limit: 5 });
    return contacts.find((c) => {
      const cPhone = (c.phone || '').replace(/\D/g, '');
      const searchPhone = phone.replace(/\D/g, '');
      return cPhone.endsWith(searchPhone) || searchPhone.endsWith(cPhone);
    }) || null;
  }

  /**
   * Busca ou cria contato por telefone.
   * @param {string} phone
   * @param {Object} [extras] - {name, source, tags, customFields}
   * @returns {Promise<Object>}
   */
  async findOrCreateByPhone(phone, extras = {}) {
    const found = await this.getContactByPhone(phone);
    if (found) return found;
    return this.createContact({ phone, ...extras });
  }

  /**
   * Busca ou cria contato por email.
   * @param {string} email
   * @param {string} [name] - Nome completo (opcional)
   * @returns {Promise<Object>}
   */
  async findOrCreateContact(email, name = null) {
    const found = await this.getContactByEmail(email);
    if (found) return found;
    const parts = (name || '').split(' ').filter(Boolean);
    return this.createContact({
      email,
      firstName: parts[0] || email.split('@')[0],
      lastName: parts.slice(1).join(' ') || undefined,
    });
  }

  /**
   * Busca contatos de uma fonte específica (ex: facebook) nos últimos N dias.
   * @param {string} source - ex: 'Facebook', 'facebook'
   * @param {number} [days=7]
   * @returns {Promise<Array>}
   */
  async getContactsBySource(source, days = 7) {
    const contacts = await this.getContacts({ limit: 100 });
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    return contacts.filter((c) => {
      const added = new Date(c.dateAdded).getTime();
      const src = c.source?.toLowerCase() || '';
      const matchSource = src.includes(source.toLowerCase());
      return matchSource && added >= cutoff;
    });
  }

  // ============================================================
  // Análise para o Celo
  // ============================================================

  /**
   * Busca dados completos de um contato vinculado a uma opportunity.
   * Retorna attributions (UTM) do contato.
   */
  async _getContactAttribution(contactId) {
    try {
      const contact = await this.getContact(contactId);
      if (!contact) return null;
      const attr = contact.attributions?.[0] || {};
      return {
        id: contact.id,
        name: contact.contactName || contact.firstName || '-',
        source: contact.source || '-',
        utmCampaign: attr.utmCampaign || attr.campaign || '-',
        utmContent: attr.utmContent || '-',
        utmMedium: attr.utmMedium || '-',
        utmSource: attr.utmSource || '-',
        utmTerm: attr.utmTerm || '-',
        tags: contact.tags || [],
        dateAdded: contact.dateAdded,
      };
    } catch {
      return null;
    }
  }

  // ============================================================
  // Conversations
  // ============================================================

  /**
   * Busca conversas de um contato pelo contactId.
   */
  async searchConversations(contactId) {
    try {
      const data = await this._request('GET', '/conversations/search', {
        locationId: this.locationId,
        contactId,
        limit: 20,
      });
      return { success: true, data: data.conversations || [], total: data.total || 0 };
    } catch (e) {
      return { success: false, error: e.message, data: [] };
    }
  }

  /**
   * Busca mensagens de uma conversa.
   */
  async getConversationMessages(conversationId, limit = 50) {
    try {
      const data = await this._request('GET', `/conversations/${conversationId}/messages`, { limit });
      const msgs = data.messages?.messages || data.messages || [];
      return { success: true, data: msgs };
    } catch (e) {
      return { success: false, error: e.message, data: [] };
    }
  }

  /**
   * Busca contato por telefone.
   */
  async searchContactByPhone(phone) {
    try {
      const data = await this._request('GET', '/contacts/', {
        locationId: this.locationId,
        query: phone,
        limit: 1,
      });
      const contacts = data.contacts || [];
      return { success: contacts.length > 0, data: contacts[0] || null };
    } catch (e) {
      return { success: false, data: null };
    }
  }

  /**
   * Gera um resumo completo do CRM para análise do Celo.
   * Cruza opportunities com contacts para atribuição campanha → venda.
   * @param {string} [pipelineId] - Se não informar, usa o primeiro pipeline
   * @returns {Promise<Object>}
   */
  async getCrmSummary(pipelineId) {
    const pipelines = await this.getPipelines();
    const pid = pipelineId || pipelines[0]?.id;
    if (!pid) return { error: 'Nenhum pipeline encontrado' };

    const pipeline = pipelines.find((p) => p.id === pid);

    // Buscar tudo em paralelo (GHL limita 100 por request)
    const [openOpps, wonOpps, lostOpps, recentContacts] = await Promise.all([
      this.searchOpportunities({ pipelineId: pid, status: 'open', limit: 100 }),
      this.searchOpportunities({ pipelineId: pid, status: 'won', limit: 100 }),
      this.searchOpportunities({ pipelineId: pid, status: 'lost', limit: 100 }),
      this.getContacts({ limit: 100 }),
    ]);

    // Montar lookup de contacts por ID (attributions incluídas)
    const contactMap = new Map();
    for (const c of recentContacts) {
      contactMap.set(c.id, c);
    }

    // Stage map para nomes
    const stageMap = {};
    if (pipeline?.stages) {
      for (const s of pipeline.stages) {
        stageMap[s.id] = { name: s.name, position: s.position };
      }
    }

    // Funções helper para extrair UTM
    // Prioridade: opp.attributions → contact.attributionSource → contact.source → 'Sem UTM'
    const locationId = this.locationId;
    const getUtmFromOpp = (opp, contact) => {
      // 1. Attributions da oportunidade (mais confiável — preenchido pelo GHL nativo)
      const oppAttr = opp?.attributions?.find(a => a.isFirst) || opp?.attributions?.[0];
      if (oppAttr?.utmCampaign) {
        return {
          campaign: oppAttr.utmCampaign,
          content: oppAttr.utmContent || '-',
          medium: oppAttr.utmMedium || '-',
          source: oppAttr.utmSource || oppAttr.adSource || '-',
          campaignId: oppAttr.utmCampaignId || '-',
          adId: oppAttr.utmAdId || '-',
        };
      }

      // 2. Custom fields da oportunidade (campos personalizados configurados no GHL)
      if (opp?.customFields?.length > 0) {
        const utmIds = UTM_FIELD_IDS[locationId] || UTM_FIELD_IDS['default'];
        const cfCampaign = opp.customFields.find(f => f.id === utmIds.utm_campaign);
        const cfContent = opp.customFields.find(f => f.id === utmIds.utm_content);
        const cfMedium = opp.customFields.find(f => f.id === utmIds.utm_medium);
        const cfSource = opp.customFields.find(f => f.id === utmIds.utm_source);
        const cfTerm = opp.customFields.find(f => f.id === utmIds.utm_term);
        if (cfCampaign?.fieldValueString) {
          return {
            campaign: cfCampaign.fieldValueString,
            content: cfContent?.fieldValueString || '-',
            medium: cfMedium?.fieldValueString || '-',
            source: cfSource?.fieldValueString || opp.source || '-',
            campaignId: '-',
            adId: '-',
          };
        }
      }

      // 3. attributionSource do contato (campo completo do GHL)
      const cAttr = contact?.attributionSource;
      if (cAttr?.utmCampaign) {
        return {
          campaign: cAttr.utmCampaign,
          content: cAttr.utmContent || '-',
          medium: cAttr.utmMedium || '-',
          source: cAttr.utmSource || cAttr.source || '-',
          campaignId: cAttr.campaignId || '-',
          adId: cAttr.adId || '-',
        };
      }

      // 4. Fallback legado: contact.attributions[0]
      const legacyAttr = contact?.attributions?.[0] || {};
      if (legacyAttr.utmCampaign) {
        return {
          campaign: legacyAttr.utmCampaign,
          content: legacyAttr.utmContent || '-',
          medium: legacyAttr.utmMedium || '-',
          source: legacyAttr.utmSource || '-',
          campaignId: '-',
          adId: '-',
        };
      }

      // 5. Último fallback: source do contato ou opp
      return {
        campaign: contact?.source || opp?.source || 'Sem UTM',
        content: '-',
        medium: '-',
        source: contact?.source || opp?.source || '-',
        campaignId: '-',
        adId: '-',
      };
    };

    // Wrapper para manter compatibilidade com contacts (sem opp)
    const getUtm = (contact) => getUtmFromOpp(null, contact);

    // ============================================================
    // 1. Funil por estágio
    // ============================================================
    const funnelStages = {};
    if (pipeline?.stages) {
      for (const s of pipeline.stages) {
        funnelStages[s.id] = { name: s.name, position: s.position, count: 0, value: 0 };
      }
    }
    for (const opp of openOpps) {
      const stage = funnelStages[opp.pipelineStageId];
      if (stage) {
        stage.count++;
        stage.value += opp.monetaryValue || 0;
      }
    }

    // ============================================================
    // 2. Atribuição por campanha → pipeline progression
    // ============================================================
    const campaignPerformance = {};

    const processOpp = (opp, status) => {
      const contactId = opp.contact?.id;
      const contact = contactId ? contactMap.get(contactId) : null;
      const utm = getUtmFromOpp(opp, contact);
      const campaignKey = utm.campaign;

      if (!campaignPerformance[campaignKey]) {
        campaignPerformance[campaignKey] = {
          campaign: campaignKey,
          source: utm.source,
          leads: 0,
          open: 0,
          won: 0,
          lost: 0,
          wonValue: 0,
          lostValue: 0,
          stages: {},
          adSets: {},
          ads: {},
        };
      }

      const cp = campaignPerformance[campaignKey];

      if (status === 'open') {
        cp.open++;
        const stageName = stageMap[opp.pipelineStageId]?.name || 'Desconhecido';
        cp.stages[stageName] = (cp.stages[stageName] || 0) + 1;
      } else if (status === 'won') {
        cp.won++;
        cp.wonValue += opp.monetaryValue || 0;
      } else if (status === 'lost') {
        cp.lost++;
        cp.lostValue += opp.monetaryValue || 0;
      }

      // Contar por adSet (utmMedium) e ad (utmContent)
      if (utm.medium !== '-') {
        cp.adSets[utm.medium] = (cp.adSets[utm.medium] || 0) + 1;
      }
      if (utm.content !== '-') {
        cp.ads[utm.content] = (cp.ads[utm.content] || 0) + 1;
      }
    };

    for (const opp of openOpps) processOpp(opp, 'open');
    for (const opp of wonOpps) processOpp(opp, 'won');
    for (const opp of lostOpps) processOpp(opp, 'lost');

    // Contar leads totais por campanha (contacts com utm)
    for (const c of recentContacts) {
      const utm = getUtm(c);
      const key = utm.campaign;
      if (campaignPerformance[key]) {
        campaignPerformance[key].leads++;
      }
    }

    // ============================================================
    // 3. Leads recentes (últimos 7 dias) com detalhes
    // ============================================================
    const last7d = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const last30d = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const recentLeads = recentContacts
      .filter((c) => new Date(c.dateAdded).getTime() >= last7d)
      .map((c) => {
        const utm = getUtm(c);
        return {
          name: c.contactName || c.firstName || '-',
          phone: c.phone || '-',
          email: c.email || '-',
          date: c.dateAdded,
          source: c.source || '-',
          campaign: utm.campaign,
          adSet: utm.medium,
          ad: utm.content,
          tags: c.tags || [],
        };
      });

    // ============================================================
    // 4. Totais
    // ============================================================
    const recentWon = wonOpps.filter((o) => new Date(o.createdAt).getTime() >= last30d);
    const recentLost = lostOpps.filter((o) => new Date(o.createdAt).getTime() >= last30d);
    const totalWonValue = recentWon.reduce((sum, o) => sum + (o.monetaryValue || 0), 0);

    return {
      pipeline: {
        pipelineName: pipeline?.name || 'Pipeline',
        stages: Object.values(funnelStages).sort((a, b) => a.position - b.position),
        totalOpen: openOpps.length,
      },
      campaignPerformance: Object.values(campaignPerformance)
        .sort((a, b) => (b.won + b.open) - (a.won + a.open)),
      recentLeads: {
        total: recentLeads.length,
        leads: recentLeads.slice(0, 30),
      },
      conversions: {
        totalWon: wonOpps.length,
        totalLost: lostOpps.length,
        won30d: recentWon.length,
        lost30d: recentLost.length,
        wonValue30d: totalWonValue,
        conversionRate: recentWon.length + recentLost.length > 0
          ? Math.round((recentWon.length / (recentWon.length + recentLost.length)) * 100)
          : 0,
      },
    };
  }

  /**
   * Formata o resumo do CRM como texto para injetar no contexto do LLaMA.
   * @param {Object} summary - Output de getCrmSummary()
   * @returns {string}
   */
  static formatForContext(summary) {
    if (summary.error) return `CRM: ${summary.error}`;

    const parts = [];

    // Pipeline/Funil
    if (summary.pipeline?.stages) {
      parts.push('=== CRM - FUNIL (GoHighLevel) ===');
      parts.push(`Pipeline: ${summary.pipeline.pipelineName} | Total aberto: ${summary.pipeline.totalOpen}`);
      for (const stage of summary.pipeline.stages) {
        if (stage.count === 0) continue;
        const value = stage.value > 0 ? ` | R$ ${stage.value.toFixed(2)}` : '';
        parts.push(`  ${stage.name}: ${stage.count}${value}`);
      }
      parts.push('');
    }

    // Performance por Campanha (CRÍTICO: cruza campanha → CRM)
    if (summary.campaignPerformance?.length > 0) {
      parts.push('=== CRM - PERFORMANCE POR CAMPANHA (atribuição UTM) ===');
      parts.push('IMPORTANTE: Estes dados mostram como cada campanha de ads performa no CRM.');
      parts.push('Use estes dados para decidir quais campanhas escalar, pausar ou otimizar.');
      parts.push('');

      for (const cp of summary.campaignPerformance) {
        const total = cp.open + cp.won + cp.lost;
        if (total === 0 && cp.leads === 0) continue;

        const wonRate = cp.won + cp.lost > 0
          ? Math.round((cp.won / (cp.won + cp.lost)) * 100)
          : '-';

        parts.push(`CAMPANHA: ${cp.campaign}`);
        parts.push(`  Leads no CRM: ${cp.leads} | Opp abertas: ${cp.open} | Ganhas: ${cp.won} | Perdidas: ${cp.lost}`);
        if (cp.wonValue > 0) parts.push(`  Valor ganho: R$ ${cp.wonValue.toFixed(2)} | Valor perdido: R$ ${cp.lostValue.toFixed(2)}`);
        if (wonRate !== '-') parts.push(`  Taxa de conversão lead→venda: ${wonRate}%`);

        // Distribuição por estágio
        const stageEntries = Object.entries(cp.stages);
        if (stageEntries.length > 0) {
          parts.push(`  Estágios: ${stageEntries.map(([s, n]) => `${s}(${n})`).join(', ')}`);
        }

        // Top adSets
        const topAdSets = Object.entries(cp.adSets).sort((a, b) => b[1] - a[1]).slice(0, 3);
        if (topAdSets.length > 0) {
          parts.push(`  Conjuntos (UTM medium): ${topAdSets.map(([s, n]) => `${s}(${n})`).join(', ')}`);
        }

        // Top ads
        const topAds = Object.entries(cp.ads).sort((a, b) => b[1] - a[1]).slice(0, 3);
        if (topAds.length > 0) {
          parts.push(`  Criativos (UTM content): ${topAds.map(([s, n]) => `${s}(${n})`).join(', ')}`);
        }

        parts.push('');
      }
    }

    // Leads recentes (últimos 7 dias)
    if (summary.recentLeads?.leads?.length > 0) {
      parts.push(`=== CRM - LEADS RECENTES (7 dias) — Total: ${summary.recentLeads.total} ===`);
      for (const lead of summary.recentLeads.leads.slice(0, 15)) {
        const date = lead.date?.split('T')[0] || '-';
        const tags = lead.tags?.length > 0 ? ` [${lead.tags.join(',')}]` : '';
        parts.push(`  ${date} | ${lead.name} | ${lead.phone} | Camp: ${lead.campaign} | Ad: ${lead.ad?.slice(0, 40)}${tags}`);
      }
      if (summary.recentLeads.total > 15) {
        parts.push(`  ... +${summary.recentLeads.total - 15} leads`);
      }
      parts.push('');
    }

    // Conversões totais
    if (summary.conversions) {
      const c = summary.conversions;
      parts.push('=== CRM - CONVERSOES (30 dias) ===');
      parts.push(`  Ganhos: ${c.won30d} | Perdas: ${c.lost30d} | Taxa: ${c.conversionRate}%`);
      if (c.wonValue30d > 0) parts.push(`  Faturamento: R$ ${c.wonValue30d.toFixed(2)}`);
      parts.push(`  Historico total: ${c.totalWon} ganhos | ${c.totalLost} perdidos`);
      parts.push('');
    }

    return parts.join('\n');
  }
}

/**
 * Retorna os IDs dos custom fields UTM para uma location.
 * @param {string} locationId
 * @returns {Object} { utm_campaign, utm_content, utm_medium, utm_source, utm_term }
 */
GhlCrm.getUtmFieldIds = function (locationId) {
  return UTM_FIELD_IDS[locationId] || UTM_FIELD_IDS['default'];
};

module.exports = GhlCrm;
