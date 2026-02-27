/**
 * GoHighLevel CRM API Client.
 * Puxa contacts, opportunities, pipelines para análise do Celo.
 */

const GHL_API_KEY = process.env.GHL_API_KEY?.replace(/"/g, '');
const GHL_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

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

    // Funções helper para extrair UTM de um contato
    const getUtm = (contact) => {
      if (!contact) return { campaign: 'Sem UTM', content: '-', medium: '-', source: '-' };
      const attr = contact.attributions?.[0] || {};
      return {
        campaign: attr.utmCampaign || attr.campaign || contact.source || 'Sem UTM',
        content: attr.utmContent || '-',
        medium: attr.utmMedium || '-',
        source: attr.utmSource || contact.source || '-',
      };
    };

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
      const utm = getUtm(contact);
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

module.exports = GhlCrm;
