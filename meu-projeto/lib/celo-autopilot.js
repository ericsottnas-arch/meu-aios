/**
 * CeloAutopilot — Motor autônomo de gestão de tráfego.
 * Roda em ciclos, analisa campanhas + vendas, toma decisões e notifica via Telegram.
 */

const celoConfig = require('./celo-config');
const celoConversation = require('./celo-conversation');
const prompts = require('./celo-prompts');
const GhlCrm = require('./ghl-crm');
const kb = require('./knowledge-base');
const memoryStore = require('./memory-store');

const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');
const MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

class CeloAutopilot {
  /**
   * @param {Object} deps
   * @param {import('./ads-manager')} deps.adsManager
   * @param {import('./celo-agent')} deps.celoAgent
   * @param {import('./celo-optimizer')} deps.optimizer
   * @param {Object} deps.telegram - módulo celo-telegram
   * @param {string} deps.approvalChatId - Chat ID para notificações
   */
  constructor({ adsManager, celoAgent, optimizer, telegram, approvalChatId }) {
    this.adsManager = adsManager;
    this.celoAgent = celoAgent;
    this.optimizer = optimizer;
    this.telegram = telegram;
    this.approvalChatId = approvalChatId;

    // GHL CRM instances por cliente (lazy init)
    this._ghlClients = new Map();

    this._timers = [];
    this._running = false;
    this._lastRun = new Map(); // clientId → timestamp
  }

  /**
   * Retorna instância GHL CRM para um cliente (lazy init).
   */
  _getGhl(clientId) {
    if (this._ghlClients.has(clientId)) return this._ghlClients.get(clientId);

    const client = celoConfig.getClient(clientId);
    if (!client?.ghlLocationId) return null;

    const ghl = new GhlCrm(client.ghlLocationId, client.ghlApiKey || undefined);
    this._ghlClients.set(clientId, ghl);
    return ghl;
  }

  // ============================================================
  // Scheduler
  // ============================================================

  /**
   * Inicia o autopilot para todos os clientes com autopilot.enabled.
   */
  start() {
    if (this._running) return;
    this._running = true;

    const clients = celoConfig.listClients();
    let scheduledCount = 0;

    for (const client of clients) {
      const fullClient = celoConfig.getClient(client.id);
      const ap = fullClient?.autopilot;
      if (!ap?.enabled) continue;

      const intervalMs = (ap.checkIntervalHours || 4) * 60 * 60 * 1000;

      // Ciclo de análise
      const timer = setInterval(() => this._safeCycle(client.id), intervalMs);
      this._timers.push(timer);

      // Briefing matinal e resumo diário
      this._scheduleDailyEvent(ap.morningBriefing || '08:00', () => this.morningBriefing(client.id));
      this._scheduleDailyEvent(ap.eveningSummary || '20:00', () => this.eveningSummary(client.id));

      scheduledCount++;
      console.log(`Autopilot: ${client.name} — ciclo a cada ${ap.checkIntervalHours || 4}h`);
    }

    if (scheduledCount > 0) {
      console.log(`Autopilot: ${scheduledCount} cliente(s) ativo(s).`);
      // Rodar primeiro ciclo após 30s (dar tempo pro server estabilizar)
      setTimeout(() => this._runAllClients(), 30 * 1000);
    } else {
      console.log('Autopilot: Nenhum cliente com autopilot habilitado.');
    }
  }

  stop() {
    this._running = false;
    for (const timer of this._timers) clearInterval(timer);
    this._timers = [];
    console.log('Autopilot: Parado.');
  }

  /**
   * Agenda evento diário por horário (HH:MM).
   */
  _scheduleDailyEvent(timeStr, fn) {
    const check = () => {
      const now = new Date().toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      if (now === timeStr) fn();
    };
    const timer = setInterval(check, 60 * 1000); // Checa a cada minuto
    this._timers.push(timer);
  }

  async _runAllClients() {
    const clients = celoConfig.listClients();
    for (const client of clients) {
      const fullClient = celoConfig.getClient(client.id);
      if (fullClient?.autopilot?.enabled) {
        await this._safeCycle(client.id);
      }
    }
  }

  async _safeCycle(clientId) {
    try {
      await this.runCycle(clientId);
    } catch (err) {
      console.error(`Autopilot: Erro no ciclo de ${clientId}:`, err.message);
    }
  }

  // ============================================================
  // Ciclo Principal de Análise
  // ============================================================

  /**
   * Executa um ciclo completo de análise para um cliente.
   */
  async runCycle(clientId) {
    const client = celoConfig.getClient(clientId);
    if (!client) throw new Error(`Cliente não encontrado: ${clientId}`);

    console.log(`Autopilot: Iniciando ciclo para ${client.name}...`);
    this._lastRun.set(clientId, Date.now());

    // 1. Buscar dados de campanhas (Meta Ads)
    let campaigns = [];
    let campaignMetrics = [];
    try {
      campaigns = await this.adsManager.listCampaigns('meta', {
        clientId,
        statusFilter: ['ACTIVE', 'PAUSED'],
      });

      // Métricas das ativas
      const active = campaigns.filter((c) => c.status === 'ACTIVE');
      const results = await Promise.allSettled(
        active.map(async (c) => {
          const metrics = await this.adsManager.getCampaignMetrics('meta', c.id, 'last_7d');
          return { ...c, metrics };
        })
      );
      campaignMetrics = results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value);
    } catch (err) {
      console.error(`Autopilot: Erro ao buscar campanhas de ${clientId}:`, err.message);
    }

    // 2. Buscar dados de vendas (Google Sheets)
    let salesData = null;
    try {
      if (client.spreadsheetId) {
        salesData = await this.celoAgent.fetchDashboardData(clientId);
      }
    } catch (err) {
      console.warn(`Autopilot: Sem dados de vendas para ${clientId}:`, err.message);
    }

    // 2b. Buscar dados do CRM (GoHighLevel)
    let crmContext = '';
    try {
      const ghl = this._getGhl(clientId);
      if (ghl) {
        const summary = await ghl.getCrmSummary();
        crmContext = GhlCrm.formatForContext(summary);
      }
    } catch (err) {
      console.warn(`Autopilot: Sem dados GHL para ${clientId}:`, err.message);
    }

    // 3. Montar contexto para LLaMA
    const context = this._buildContext(client, clientId, campaigns, campaignMetrics, salesData, crmContext);

    // 4. Chamar LLaMA para análise
    const analysis = await this._callGroq(prompts.ANALYSIS_CYCLE_PROMPT, context);
    if (!analysis) {
      console.warn(`Autopilot: Sem resposta do LLaMA para ${clientId}.`);
      return;
    }

    console.log(`Autopilot: ${client.name} — ${analysis.actions?.length || 0} ações sugeridas.`);

    // 5. Processar ações
    if (analysis.actions?.length > 0) {
      for (const action of analysis.actions) {
        await this._processAction(clientId, client, action);
      }
    }

    // 6. Processar pedidos de criativo
    if (analysis.creativeRequests?.length > 0) {
      for (const req of analysis.creativeRequests) {
        await this._requestCreative(client, req);
      }
    }

    // 7. Se não tem ações, enviar análise resumida
    if ((!analysis.actions || analysis.actions.length === 0) && analysis.analysis) {
      console.log(`Autopilot: ${client.name} — Sem ações. Análise: ${analysis.analysis.slice(0, 100)}...`);
    }
  }

  // ============================================================
  // Briefing Matinal
  // ============================================================

  async morningBriefing(clientId) {
    const client = celoConfig.getClient(clientId);
    if (!client) return;

    console.log(`Autopilot: Briefing matinal para ${client.name}`);

    // Buscar dados
    let campaigns = [];
    let campaignMetrics = [];
    try {
      campaigns = await this.adsManager.listCampaigns('meta', { clientId, statusFilter: ['ACTIVE'] });
      const results = await Promise.allSettled(
        campaigns.map(async (c) => {
          const metrics = await this.adsManager.getCampaignMetrics('meta', c.id, 'yesterday');
          return { ...c, metrics };
        })
      );
      campaignMetrics = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    } catch (err) {
      console.error(`Autopilot briefing: ${err.message}`);
    }

    let salesData = null;
    try {
      if (client.spreadsheetId) salesData = await this.celoAgent.fetchDashboardData(clientId);
    } catch (_) {}

    let crmContext = '';
    try {
      const ghl = this._getGhl(clientId);
      if (ghl) crmContext = GhlCrm.formatForContext(await ghl.getCrmSummary());
    } catch (_) {}

    const context = this._buildContext(client, clientId, campaigns, campaignMetrics, salesData, crmContext);
    const briefing = await this._callGroq(prompts.MORNING_BRIEFING_PROMPT, context);

    if (briefing?.briefing) {
      await this.telegram.sendMessage(
        this.approvalChatId,
        `BRIEFING MATINAL — ${client.name}\n\n${briefing.briefing}\n\n— Celo`
      );
    }
  }

  // ============================================================
  // Resumo Diário
  // ============================================================

  async eveningSummary(clientId) {
    const client = celoConfig.getClient(clientId);
    if (!client) return;

    console.log(`Autopilot: Resumo diário para ${client.name}`);

    let campaigns = [];
    let campaignMetrics = [];
    try {
      campaigns = await this.adsManager.listCampaigns('meta', { clientId, statusFilter: ['ACTIVE'] });
      const results = await Promise.allSettled(
        campaigns.map(async (c) => {
          const metrics = await this.adsManager.getCampaignMetrics('meta', c.id, 'today');
          return { ...c, metrics };
        })
      );
      campaignMetrics = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    } catch (err) {
      console.error(`Autopilot summary: ${err.message}`);
    }

    let salesData = null;
    try {
      if (client.spreadsheetId) salesData = await this.celoAgent.fetchDashboardData(clientId);
    } catch (_) {}

    let crmContext = '';
    try {
      const ghl = this._getGhl(clientId);
      if (ghl) crmContext = GhlCrm.formatForContext(await ghl.getCrmSummary());
    } catch (_) {}

    const context = this._buildContext(client, clientId, campaigns, campaignMetrics, salesData, crmContext);
    const summary = await this._callGroq(prompts.EVENING_SUMMARY_PROMPT, context);

    if (summary?.summary) {
      let msg = `RESUMO DO DIA — ${client.name}\n\n${summary.summary}`;
      if (summary.needsFromOwner?.length > 0) {
        msg += `\n\nPreciso de voce:\n${summary.needsFromOwner.map((n) => `- ${n}`).join('\n')}`;
      }
      msg += '\n\n— Celo';
      await this.telegram.sendMessage(this.approvalChatId, msg);
    }
  }

  // ============================================================
  // Processar Ações
  // ============================================================

  async _processAction(clientId, client, action) {
    const chatId = this.approvalChatId;

    switch (action.type) {
      case 'pause': {
        const msg = [
          `PROPOSTA — ${client.name}`,
          `Acao: Pausar campanha ${action.campaignName}`,
          `Risco: ${action.risk || 'medium'}`,
        ].join('\n');

        const approval = celoConversation.createApproval({
          clientId,
          clientName: client.name,
          campaign: action.campaignName,
          currentBudget: 0,
          proposedBudget: 0,
          reason: action.justification,
          direction: 'pause',
          pctChange: 0,
          _action: {
            type: 'pause',
            platform: 'meta',
            campaignId: action.campaignId,
          },
          _analysisContext: action.justification,
        });

        await this.telegram.sendInlineKeyboard(chatId, msg, [
          [
            { text: 'Aprovar', callback_data: `auto:approve:${approval.requestId}` },
            { text: 'Rejeitar', callback_data: `auto:reject:${approval.requestId}` },
          ],
          [
            { text: 'Justificativa', callback_data: `auto:justify:${approval.requestId}` },
          ],
        ]);
        break;
      }

      case 'scale': {
        const currentBudget = action.params?.currentBudget || 0;
        const newBudget = action.params?.suggestedBudget || 0;

        const msg = [
          `PROPOSTA — ${client.name}`,
          `Acao: Escalar ${action.campaignName}`,
          newBudget > 0 ? `De: R$ ${currentBudget.toFixed(2)}/dia -> R$ ${newBudget.toFixed(2)}/dia` : action.description,
          `Risco: ${action.risk || 'medium'}`,
        ].join('\n');

        const approval = celoConversation.createApproval({
          clientId,
          clientName: client.name,
          campaign: action.campaignName,
          currentBudget,
          proposedBudget: newBudget,
          reason: action.justification,
          direction: 'increase',
          pctChange: currentBudget > 0 ? Math.round(((newBudget - currentBudget) / currentBudget) * 100) : 0,
          _action: {
            type: 'scale',
            platform: 'meta',
            campaignId: action.campaignId,
            objectId: action.campaignId,
            objectType: 'campaign',
            newBudget,
          },
          _analysisContext: action.justification,
        });

        await this.telegram.sendInlineKeyboard(chatId, msg, [
          [
            { text: 'Aprovar', callback_data: `auto:approve:${approval.requestId}` },
            { text: 'Rejeitar', callback_data: `auto:reject:${approval.requestId}` },
          ],
          [
            { text: 'Justificativa', callback_data: `auto:justify:${approval.requestId}` },
          ],
        ]);
        break;
      }

      case 'alert':
      case 'wait': {
        if (action.priority === 'high') {
          await this.telegram.sendMessage(chatId,
            `ALERTA — ${client.name}\n\n${action.description}\n\n${action.justification}\n\n— Celo`
          );
        }
        break;
      }

      case 'create': {
        const msg = [
          `PROPOSTA DE NOVA CAMPANHA — ${client.name}`,
          action.description,
          `Risco: ${action.risk || 'medium'}`,
          'Se aprovado, criarei a campanha como PAUSED.',
        ].join('\n');

        const approval = celoConversation.createApproval({
          clientId,
          clientName: client.name,
          campaign: action.campaignName || 'Nova campanha',
          currentBudget: 0,
          proposedBudget: action.params?.dailyBudget || 0,
          reason: action.justification,
          direction: 'create',
          pctChange: 0,
          _action: {
            type: 'create',
            platform: 'meta',
            params: action.params,
          },
          _analysisContext: action.justification,
        });

        await this.telegram.sendInlineKeyboard(chatId, msg, [
          [
            { text: 'Aprovar', callback_data: `auto:approve:${approval.requestId}` },
            { text: 'Rejeitar', callback_data: `auto:reject:${approval.requestId}` },
          ],
          [
            { text: 'Justificativa', callback_data: `auto:justify:${approval.requestId}` },
          ],
        ]);
        break;
      }
    }
  }

  // ============================================================
  // Pedido de Criativo
  // ============================================================

  async _requestCreative(client, req) {
    const msg = [
      `PRECISO DE CRIATIVO — ${client.name}`,
      '',
      `Campanha: ${req.campaignName}`,
      `Motivo: ${req.reason}`,
      '',
      `Specs:`,
      `- Formato: ${req.format}`,
      `- Hook sugerido: ${req.hookSuggestion}`,
      `- CTA: ${req.cta}`,
      `- Publico: ${req.audience}`,
      req.notes ? `- Obs: ${req.notes}` : '',
      '',
      'Envie o criativo aqui que eu subo na campanha.',
      '',
      '— Celo',
    ].filter(Boolean).join('\n');

    await this.telegram.sendMessage(this.approvalChatId, msg);
  }

  // ============================================================
  // Chamar Groq LLaMA
  // ============================================================

  async _callGroq(systemPrompt, userContent) {
    return this._groqRequest(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      { temperature: 0.2, max_tokens: 3000, response_format: { type: 'json_object' } }
    );
  }

  // ============================================================
  // Montar Contexto
  // ============================================================

  _buildContext(client, clientId, campaigns, campaignMetrics, salesData, crmContext) {
    const parts = [];

    parts.push(`CLIENTE: ${client.name}`);
    parts.push(`ID: ${clientId}`);
    parts.push(`Budget mensal: R$ ${client.budget?.monthly?.toFixed(2) || '0.00'}`);
    parts.push(`Testes: ${((client.budget?.testingPercentage || 0.1) * 100).toFixed(0)}%`);
    parts.push('');

    // Campanhas
    parts.push('=== CAMPANHAS ===');
    if (campaigns.length === 0) {
      parts.push('Nenhuma campanha encontrada.');
    } else {
      for (const c of campaigns) {
        const budget = c.budget?.daily ? `R$ ${c.budget.daily.toFixed(2)}/dia` : 'sem budget';
        parts.push(`[${c.status}] ${c.name} | ID: ${c.id} | ${budget} | Obj: ${c.objective}`);
      }
    }
    parts.push('');

    // Métricas das ativas
    if (campaignMetrics.length > 0) {
      parts.push('=== METRICAS (ultimos 7 dias) ===');
      for (const cm of campaignMetrics) {
        if (!cm.metrics) continue;
        const m = cm.metrics;
        parts.push(`${cm.name}:`);
        parts.push(`  Impressoes: ${m.impressions} | Cliques: ${m.clicks} | CTR: ${m.ctr.toFixed(2)}%`);
        parts.push(`  CPC: R$ ${m.cpc.toFixed(2)} | CPM: R$ ${m.cpm.toFixed(2)} | Gasto: R$ ${m.spend.toFixed(2)}`);
        parts.push(`  Alcance: ${m.reach} | Frequencia: ${m.frequency.toFixed(2)}`);
        parts.push(`  Conversoes: ${m.conversions} | CPL: R$ ${m.costPerResult.toFixed(2)}`);
        parts.push('');
      }
    }

    // Dados de vendas (Google Sheets)
    if (salesData) {
      parts.push('=== DADOS DE VENDAS (Google Sheets) ===');
      for (const [key, rows] of Object.entries(salesData)) {
        if (key === 'sheetNames' || !rows || !Array.isArray(rows)) continue;
        parts.push(`\n--- ${key.toUpperCase()} ---`);
        const limited = rows.slice(0, 30);
        for (const row of limited) {
          parts.push(row.join(' | '));
        }
        if (rows.length > 30) parts.push(`... (${rows.length - 30} linhas adicionais)`);
      }
    }

    // Dados do CRM (GoHighLevel)
    if (crmContext) {
      parts.push('');
      parts.push(crmContext);
    }

    // Knowledge Base
    const kbContext = kb.getContextForLLM(clientId);
    if (kbContext) {
      parts.push('');
      parts.push('=== KNOWLEDGE BASE ===');
      parts.push(kbContext);
    }

    return parts.join('\n');
  }

  // ============================================================
  // Chat — responder perguntas do dono
  // ============================================================

  /**
   * Responde uma pergunta do dono via Telegram.
   * @param {string} question - Mensagem do usuário
   * @param {string} [clientId] - Se mencionou cliente específico
   * @returns {Promise<string>} Resposta do Celo
   */
  async chat(question, clientId) {
    // Montar contexto com dados reais se tiver clientId
    let context = '';

    if (clientId) {
      const client = celoConfig.getClient(clientId);
      if (client) {
        try {
          const campaigns = await this.adsManager.listCampaigns('meta', {
            clientId,
            statusFilter: ['ACTIVE', 'PAUSED'],
          });
          const active = campaigns.filter((c) => c.status === 'ACTIVE');
          const results = await Promise.allSettled(
            active.map(async (c) => {
              const metrics = await this.adsManager.getCampaignMetrics('meta', c.id, 'last_7d');
              return { ...c, metrics };
            })
          );
          const campaignMetrics = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);

          let salesData = null;
          try {
            if (client.spreadsheetId) salesData = await this.celoAgent.fetchDashboardData(clientId);
          } catch (_) {}

          let crmContext = '';
          try {
            const ghl = this._getGhl(clientId);
            if (ghl) crmContext = GhlCrm.formatForContext(await ghl.getCrmSummary());
          } catch (_) {}

          context = this._buildContext(client, clientId, campaigns, campaignMetrics, salesData, crmContext);
        } catch (err) {
          context = `CLIENTE: ${client.name}\n(Erro ao carregar dados: ${err.message})`;
        }
      }
    } else {
      // Sem cliente específico — enviar resumo de todos
      const clients = celoConfig.listClients();
      const parts = ['CLIENTES DA AGENCIA:'];
      for (const c of clients) {
        const full = celoConfig.getClient(c.id);
        parts.push(`- ${c.name} (${c.id}) | Meta: ${full?.metaAdAccountId || '-'} | Budget: R$ ${c.budget?.monthly?.toFixed(2) || '0.00'}/mes`);
      }
      context = parts.join('\n');
    }

    const userMessage = context
      ? `${context}\n\n--- PERGUNTA DO DONO ---\n${question}`
      : `--- PERGUNTA DO DONO ---\n${question}`;

    const response = await this._callGroqText(prompts.CONVERSATION_PROMPT, userMessage);
    return response || 'Nao consegui processar a pergunta. Tente reformular.';
  }

  /**
   * Versão do _callGroq que aceita resposta texto livre (sem forçar JSON).
   */
  async _callGroqText(systemPrompt, userContent) {
    return this._groqRequest(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      { temperature: 0.4, max_tokens: 2000 }
    );
  }

  // ============================================================
  // Chat com Memória (multi-turn)
  // ============================================================

  /**
   * Responde pergunta com histórico de conversa (multi-turn).
   * @param {string} question
   * @param {string} [clientId]
   * @param {string} chatId - Telegram chat ID
   * @returns {Promise<string>}
   */
  async chatWithMemory(question, clientId, chatId) {
    // Montar contexto com dados reais
    let context = '';

    if (clientId) {
      const client = celoConfig.getClient(clientId);
      if (client) {
        try {
          const campaigns = await this.adsManager.listCampaigns('meta', {
            clientId,
            statusFilter: ['ACTIVE', 'PAUSED'],
          });
          const active = campaigns.filter((c) => c.status === 'ACTIVE');
          const results = await Promise.allSettled(
            active.map(async (c) => {
              const metrics = await this.adsManager.getCampaignMetrics('meta', c.id, 'last_7d');
              return { ...c, metrics };
            })
          );
          const campaignMetrics = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);

          let salesData = null;
          try {
            if (client.spreadsheetId) salesData = await this.celoAgent.fetchDashboardData(clientId);
          } catch (_) {}

          let crmContext = '';
          try {
            const ghl = this._getGhl(clientId);
            if (ghl) crmContext = GhlCrm.formatForContext(await ghl.getCrmSummary());
          } catch (_) {}

          context = this._buildContext(client, clientId, campaigns, campaignMetrics, salesData, crmContext);
        } catch (err) {
          context = `CLIENTE: ${client.name}\n(Erro ao carregar dados: ${err.message})`;
        }
      }
    } else {
      const clients = celoConfig.listClients();
      const parts = ['CLIENTES DA AGENCIA:'];
      for (const c of clients) {
        const full = celoConfig.getClient(c.id);
        parts.push(`- ${c.name} (${c.id}) | Meta: ${full?.metaAdAccountId || '-'} | Budget: R$ ${c.budget?.monthly?.toFixed(2) || '0.00'}/mes`);
      }
      context = parts.join('\n');
    }

    // Montar mensagens multi-turn
    const systemPrompt = context
      ? `${prompts.CONVERSATION_PROMPT}\n\n--- DADOS ATUAIS ---\n${context}`
      : prompts.CONVERSATION_PROMPT;

    // Pegar histórico da conversa
    const history = memoryStore.getHistoryForLLM(chatId, 16);

    // Montar array de mensagens: system + histórico + pergunta atual
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: question },
    ];

    const response = await this._callGroqMultiTurn(messages);
    return response || 'Rate limit atingido na API do Groq. Aguarde alguns minutos e tente novamente.\n\n— Celo';
  }

  /**
   * Chama Groq com array de mensagens pré-montado (multi-turn).
   * Faz fallback para modelo menor se rate limit.
   */
  async _callGroqMultiTurn(messages) {
    return this._groqRequest(messages, { temperature: 0.4, max_tokens: 2000 });
  }

  /**
   * Request Groq unificado com fallback automático.
   * Tenta o modelo principal; se der 429 (rate limit), tenta o fallback.
   */
  async _groqRequest(messages, opts = {}) {
    if (!GROQ_API_KEY) return null;

    const models = [MODEL, FALLBACK_MODEL];

    for (const model of models) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: opts.temperature ?? 0.3,
            max_tokens: opts.max_tokens ?? 2000,
            ...(opts.response_format && { response_format: opts.response_format }),
          }),
        });

        if (response.status === 429) {
          console.warn(`Groq: rate limit no ${model}, tentando fallback...`);
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Groq ${model}: ${response.status} — ${errText}`);
          continue;
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content;
        if (!content) continue;

        if (model !== MODEL) {
          console.log(`Groq: respondido via fallback (${model})`);
        }

        return opts.response_format ? JSON.parse(content) : content;
      } catch (err) {
        console.error(`Groq ${model} error:`, err.message);
        continue;
      }
    }

    return null;
  }

  // ============================================================
  // Status
  // ============================================================

  getStatus() {
    const clients = celoConfig.listClients();
    const status = [];
    for (const client of clients) {
      const full = celoConfig.getClient(client.id);
      const ap = full?.autopilot;
      const lastRun = this._lastRun.get(client.id);
      status.push({
        clientId: client.id,
        clientName: client.name,
        enabled: ap?.enabled || false,
        intervalHours: ap?.checkIntervalHours || 4,
        lastRun: lastRun ? new Date(lastRun).toISOString() : null,
      });
    }
    return { running: this._running, clients: status };
  }
}

module.exports = CeloAutopilot;
