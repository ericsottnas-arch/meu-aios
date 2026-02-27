/**
 * Campaigns Exporter - Sincroniza campanhas de Mídia Paga
 *
 * Busca dados de:
 * - Meta Ads API (campanhas, adsets, criativos, métricas)
 * - Google Sheets (CRM, vendas, leads)
 *
 * Exporta em 3 formatos:
 * - RESUMO.md (legível para agentes)
 * - data.json (estruturado para automação)
 * - data.xlsx (visual para análise em Excel)
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const MetaAds = require('./meta-ads');
const CeloAgent = require('./celo-agent');
const celoConfig = require('./celo-config');

class CampaignsExporter {
  constructor() {
    this.metaAds = new MetaAds();
    this.celoAgent = new CeloAgent();
    this._initialized = false;
    this._cache = new Map();
    this._lastSync = new Map();
  }

  async init() {
    if (this._initialized) return true;
    try {
      await this.metaAds.init();
      await this.celoAgent.initAuth();
      this._initialized = true;
      console.log('CampaignsExporter: Inicializado');
      return true;
    } catch (err) {
      console.error('CampaignsExporter: Erro na inicialização:', err.message);
      return false;
    }
  }

  /**
   * Exporta campanhas de um cliente
   * @param {string} clientId
   * @returns {Promise<Object>}
   */
  async exportClientCampaigns(clientId) {
    if (!this._initialized) await this.init();

    const client = celoConfig.getClient(clientId);
    if (!client) {
      throw new Error(`Cliente ${clientId} não configurado`);
    }

    console.log(`CampaignsExporter: Exportando campanhas de ${client.name}...`);

    try {
      // Buscar dados de múltiplas fontes
      const metaData = await this.fetchFromMetaAds(clientId);
      const sheetData = await this.fetchFromGoogleSheets(clientId);

      // Sintetizar dados
      const synthesis = await this.synthesizeData(clientId, metaData, sheetData);

      // Salvar em múltiplos formatos
      await this.saveToJSON(clientId, synthesis);
      await this.saveToMarkdown(clientId, synthesis);
      await this.saveToExcel(clientId, synthesis);

      // Salvar em Google Sheets (aba Meta Ads)
      await this.saveToGoogleSheets(clientId, synthesis);

      // Atualizar timestamp
      this._lastSync.set(clientId, new Date());

      console.log(`CampaignsExporter: ✅ ${clientId} exportado com sucesso`);
      return synthesis;
    } catch (err) {
      console.error(`CampaignsExporter: Erro ao exportar ${clientId}:`, err.message);
      throw err;
    }
  }

  /**
   * Busca campanhas da Meta Ads API (histórico COMPLETO com dados diários)
   * @param {string} clientId
   * @param {Date|null} startDate - Data inicial (opcional). Se null, usa toda história
   * @param {Date|null} endDate - Data final (opcional). Se null, usa hoje
   * @param {Object} options - Opções adicionais {skipCreatives: boolean}
   * @returns {Promise<Object>}
   */
  async fetchFromMetaAds(clientId, startDate = null, endDate = null, options = {}) {
    const cacheKey = `meta_${clientId}`;
    const cached = this._cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return cached.data; // Cache de 1 hora
    }

    try {
      const client = celoConfig.getClient(clientId);
      const adAccountId = client.adAccountId || client.metaAdAccountId || process.env.META_AD_ACCOUNT_ID;

      console.log(`CampaignsExporter: Buscando campanhas (histórico completo) para ${clientId}...`);

      // Listar campanhas
      const campaigns = await this.metaAds.listCampaigns({
        adAccountId,
        limit: 100,
      });

      console.log(`CampaignsExporter: ${campaigns.length} campanhas encontradas`);

      // Buscar insights DIÁRIOS + adsets + criativos para cada campanha
      // Usar abordagem sequencial com delay para evitar rate limiting
      const campaignsWithDailyMetrics = [];
      const skipCreatives = options.skipCreatives || false;
      const periodLabel = startDate && endDate ?
        `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}` :
        'all_time';

      console.log(`CampaignsExporter: Período = ${periodLabel}, skipCreatives = ${skipCreatives}`);

      for (let i = 0; i < campaigns.length; i++) {
        const campaign = campaigns[i];
        let dailyInsights = [];
        let adsets = [];

        // Buscar insights (crítico - não pode falhar)
        try {
          dailyInsights = await this.metaAds.getCampaignInsightsDaily(campaign.id, startDate, endDate);
        } catch (err) {
          console.warn(`CampaignsExporter: Erro ao buscar insights para ${campaign.id}:`, err.message);
          dailyInsights = [];
        }

        // Buscar adsets (não crítico - se falhar, continua sem adsets)
        try {
          adsets = await this.metaAds.getCampaignAdsets(campaign.id);

          // Para cada adset, buscar ads com dados de vídeo (só se não estiver skipando)
          if (!skipCreatives) {
            for (const adset of adsets) {
              try {
                const ads = await this.metaAds.getAdsetAds(adset.id);
                adset.ads = ads || [];
              } catch (err) {
                console.warn(`CampaignsExporter: Aviso - ads não buscados para adset ${adset.id}:`, err.message);
                adset.ads = [];
              }
              // Delay entre adsets para evitar rate limit
              // Buscas de ads são mais intensivas que adsets
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        } catch (err) {
          console.warn(`CampaignsExporter: Aviso - adsets não buscados para ${campaign.id}:`, err.message);
          adsets = [];
        }

        campaignsWithDailyMetrics.push({
          ...campaign,
          dailyInsights: dailyInsights || [],
          adsets: adsets || [],
        });

        // Delay entre campanhas para evitar rate limit da Meta
        // Customizável via parâmetro options.campaignDelay (ms)
        // Padrão: 4000ms = ~15 campanhas/minuto
        const delay = options.campaignDelay || 4000;
        if (i < campaigns.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      const result = {
        timestamp: new Date().toISOString(),
        adAccountId,
        campaigns: campaignsWithDailyMetrics,
        period: periodLabel,
      };

      console.log(`CampaignsExporter: Dados de histórico completo buscados com sucesso`);
      this._cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (err) {
      console.error('CampaignsExporter: Erro ao buscar Meta Ads:', err.message);
      return { timestamp: new Date().toISOString(), campaigns: [], period: 'all_time' };
    }
  }

  /**
   * Busca adsets de uma campanha
   * @private
   */
  async _getAdsetsByCampaign(campaignId, adAccountId) {
    try {
      // Este é um método auxiliar que usaria a API da Meta
      // Por enquanto, retornamos um array vazio
      // Em produção, isso seria implementado na meta-ads.js
      return [];
    } catch (err) {
      console.warn('CampaignsExporter: Erro ao buscar adsets:', err.message);
      return [];
    }
  }

  /**
   * Busca dados do Google Sheets (CRM)
   * @param {string} clientId
   * @returns {Promise<Object>}
   */
  async fetchFromGoogleSheets(clientId) {
    try {
      const client = celoConfig.getClient(clientId);
      if (!client.spreadsheetId) {
        return { timestamp: new Date().toISOString(), campaigns: [] };
      }

      const cacheKey = `sheets_${clientId}`;
      const cached = this._cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 3600000) {
        return cached.data;
      }

      // Tentar ler dados da planilha
      const data = await this.celoAgent.getSheetData(
        client.spreadsheetId,
        "'Campanhas'!A1:Z100"
      );

      if (!data || data.length === 0) {
        return { timestamp: new Date().toISOString(), campaigns: [] };
      }

      const result = {
        timestamp: new Date().toISOString(),
        headers: data[0] || [],
        rows: data.slice(1) || [],
      };

      this._cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (err) {
      console.warn('CampaignsExporter: Erro ao buscar Google Sheets:', err.message);
      return { timestamp: new Date().toISOString(), campaigns: [] };
    }
  }

  /**
   * Sintetiza dados de múltiplas fontes
   * @param {string} clientId
   * @param {Object} metaData
   * @param {Object} sheetData
   * @returns {Promise<Object>}
   */
  async synthesizeData(clientId, metaData, sheetData) {
    const client = celoConfig.getClient(clientId);

    // Calcular sumário de Meta Ads
    const metaSummary = {
      totalCampaigns: metaData.campaigns?.length || 0,
      activeCampaigns: metaData.campaigns?.filter(c => c.status === 'ACTIVE').length || 0,
      totalSpend: (metaData.campaigns || []).reduce((sum, c) => sum + (c.metrics?.spend || 0), 0),
      avgCPL: this._calculateAverageCPL(metaData.campaigns || []),
      totalImpressions: (metaData.campaigns || []).reduce((sum, c) => sum + (c.metrics?.impressions || 0), 0),
      totalClicks: (metaData.campaigns || []).reduce((sum, c) => sum + (c.metrics?.clicks || 0), 0),
    };

    // Calcular sumário de CRM (se houver dados)
    const sheetSummary = {
      totalLeads: 0,
      totalSales: 0,
      totalRevenue: 0,
      avgRoas: 0,
    };

    return {
      clientId,
      clientName: client.name,
      exportedAt: new Date().toISOString(),
      period: 'last_7d',
      meta: {
        campaigns: metaData.campaigns || [],
        summary: metaSummary,
      },
      googleSheets: {
        campaigns: sheetData.rows || [],
        headers: sheetData.headers || [],
        summary: sheetSummary,
      },
      synthesis: {
        topPerformers: this._findTopPerformers(metaData.campaigns || []),
        opportunities: this._findOpportunities(metaData.campaigns || []),
        nextSteps: this._suggestNextSteps(metaData.campaigns || []),
      },
    };
  }

  /**
   * Encontra campanhas com melhor performance
   * @private
   */
  _findTopPerformers(campaigns) {
    return campaigns
      .filter(c => c.metrics?.costPerResult && c.metrics.costPerResult > 0)
      .sort((a, b) => a.metrics.costPerResult - b.metrics.costPerResult)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        cpl: c.metrics.costPerResult,
        conversions: c.metrics.conversions,
        spend: c.metrics.spend,
        reason: 'Melhor CPL',
      }));
  }

  /**
   * Identifica oportunidades de otimização
   * @private
   */
  _findOpportunities(campaigns) {
    const opportunities = [];

    campaigns.forEach(c => {
      if (c.status === 'ACTIVE') {
        if (c.metrics?.costPerResult > 50) {
          opportunities.push({
            campaign: c.name,
            issue: 'CPL alto',
            suggestion: 'Otimizar targeting ou criativo',
            priority: 'Alta',
          });
        }
        if (c.metrics?.ctr < 1) {
          opportunities.push({
            campaign: c.name,
            issue: 'CTR baixo',
            suggestion: 'Testar novos criativos',
            priority: 'Média',
          });
        }
      }
    });

    return opportunities;
  }

  /**
   * Sugere próximas ações
   * @private
   */
  _suggestNextSteps(campaigns) {
    const steps = [];
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');

    if (activeCampaigns.length === 0) {
      steps.push('Ativar campanhas pausadas');
    } else {
      const topPerformer = activeCampaigns
        .sort((a, b) => (a.metrics?.costPerResult || 999) - (b.metrics?.costPerResult || 999))[0];
      if (topPerformer) {
        steps.push(`Escalar: ${topPerformer.name}`);
      }
    }

    const lowPerformers = campaigns.filter(c =>
      c.status === 'ACTIVE' && c.metrics?.costPerResult > 30
    );
    if (lowPerformers.length > 0) {
      steps.push('Pausar campanhas com CPL alto');
    }

    steps.push('Analisar audiências');
    steps.push('Testar novos criativos');

    return steps;
  }

  /**
   * Calcula CPL médio
   * @private
   */
  _calculateAverageCPL(campaigns) {
    const campaignsWithCPL = campaigns.filter(c => c.metrics?.costPerResult && c.metrics.costPerResult > 0);
    if (campaignsWithCPL.length === 0) return 0;
    const sum = campaignsWithCPL.reduce((s, c) => s + c.metrics.costPerResult, 0);
    return sum / campaignsWithCPL.length;
  }

  /**
   * Salva dados em JSON
   * @param {string} clientId
   * @param {Object} data
   */
  async saveToJSON(clientId, data) {
    const dir = path.resolve(__dirname, '..', 'docs', 'clientes', clientId, 'campaigns');
    this._ensureDir(dir);

    const filePath = path.join(dir, 'data.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`CampaignsExporter: Salvo data.json (${clientId})`);
  }

  /**
   * Salva dados em Markdown
   * @param {string} clientId
   * @param {Object} data
   */
  async saveToMarkdown(clientId, data) {
    const dir = path.resolve(__dirname, '..', 'docs', 'clientes', clientId, 'campaigns');
    this._ensureDir(dir);

    const { meta, googleSheets, synthesis } = data;
    const { campaigns, summary } = meta;

    let markdown = `# Campanhas de Mídia Paga - ${data.clientName}\n`;
    markdown += `**Atualizado em:** ${new Date(data.exportedAt).toLocaleString('pt-BR')}\n`;
    markdown += `**Período:** ${data.period === 'last_7d' ? 'Últimos 7 dias' : 'Últimos 30 dias'}\n\n`;

    // Visão Geral
    markdown += `## Visão Geral\n`;
    markdown += `| Métrica | Valor | Status |\n`;
    markdown += `|---------|-------|--------|\n`;
    markdown += `| Campanhas Ativas | ${summary.activeCampaigns}/${summary.totalCampaigns} | ${'🟢'} |\n`;
    markdown += `| Gasto Total | R$ ${summary.totalSpend.toFixed(2)} | ${'📊'} |\n`;
    markdown += `| CPL Médio | R$ ${summary.avgCPL.toFixed(2)} | ${summary.avgCPL < 20 ? '🟢' : summary.avgCPL < 40 ? '🟡' : '🔴'} |\n`;
    markdown += `| Impressões | ${summary.totalImpressions.toLocaleString()} | ${'📈'} |\n`;
    markdown += `| Cliques | ${summary.totalClicks.toLocaleString()} | ${'🔗'} |\n\n`;

    // Campanhas Ativas
    markdown += `## Campanhas Ativas\n`;
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
    if (activeCampaigns.length === 0) {
      markdown += `Nenhuma campanha ativa.\n\n`;
    } else {
      activeCampaigns.forEach(c => {
        markdown += `### ${c.name}\n`;
        markdown += `- **Status:** 🟢 ${c.status}\n`;
        markdown += `- **Objetivo:** ${c.objective}\n`;
        markdown += `- **Budget:** R$ ${c.dailyBudget ? c.dailyBudget.toFixed(2) : 'N/A'}/dia\n`;
        markdown += `- **Impressões:** ${c.metrics?.impressions || 0}\n`;
        markdown += `- **Cliques:** ${c.metrics?.clicks || 0}\n`;
        markdown += `- **CTR:** ${((c.metrics?.ctr || 0) * 100).toFixed(2)}%\n`;
        markdown += `- **Gasto:** R$ ${(c.metrics?.spend || 0).toFixed(2)}\n`;
        markdown += `- **CPL:** R$ ${(c.metrics?.costPerResult || 0).toFixed(2)}\n`;
        markdown += `- **Conversões:** ${c.metrics?.conversions || 0}\n`;
        markdown += `- **Criado:** ${new Date(c.createdTime).toLocaleDateString('pt-BR')}\n\n`;
      });
    }

    // Oportunidades
    markdown += `## Oportunidades de Otimização\n`;
    if (synthesis.opportunities.length === 0) {
      markdown += `Nenhuma oportunidade identificada.\n\n`;
    } else {
      synthesis.opportunities.forEach(opp => {
        markdown += `- **${opp.campaign}** (${opp.priority})\n`;
        markdown += `  - Problema: ${opp.issue}\n`;
        markdown += `  - Sugestão: ${opp.suggestion}\n`;
      });
      markdown += '\n';
    }

    // Próximas Ações
    markdown += `## Próximas Ações\n`;
    synthesis.nextSteps.forEach((step, idx) => {
      markdown += `- [ ] ${step}\n`;
    });
    markdown += '\n';

    // CRM Data (se disponível)
    if (googleSheets.rows && googleSheets.rows.length > 0) {
      markdown += `## Dados do CRM (últimos 30 dias)\n`;
      markdown += `- Leads: ${googleSheets.summary.totalLeads}\n`;
      markdown += `- Vendas: ${googleSheets.summary.totalSales}\n`;
      markdown += `- Faturamento: R$ ${googleSheets.summary.totalRevenue.toFixed(2)}\n`;
      markdown += `- ROAS: ${googleSheets.summary.avgRoas.toFixed(2)}x\n\n`;
    }

    const filePath = path.join(dir, 'RESUMO.md');
    fs.writeFileSync(filePath, markdown, 'utf-8');
    console.log(`CampaignsExporter: Salvo RESUMO.md (${clientId})`);
  }

  /**
   * Salva dados em Excel
   * @param {string} clientId
   * @param {Object} data
   */
  async saveToExcel(clientId, data) {
    const dir = path.resolve(__dirname, '..', 'docs', 'clientes', clientId, 'campaigns');
    this._ensureDir(dir);

    const workbook = new ExcelJS.Workbook();

    // Aba 1: Campanhas
    const campaignsSheet = workbook.addWorksheet('Campanhas');
    this._buildCampaignsSheet(campaignsSheet, data.meta.campaigns);

    // Aba 2: Conjuntos (Adsets)
    const adsetsSheet = workbook.addWorksheet('Conjuntos');
    this._buildAdSetsSheet(adsetsSheet, data.meta.campaigns);

    // Aba 3: Criativos
    const creativesSheet = workbook.addWorksheet('Criativos');
    this._buildCreativesSheet(creativesSheet, data.meta.campaigns);

    // Aplicar formatação
    this._applyExcelFormatting(workbook);

    const filePath = path.join(dir, 'data.xlsx');
    await workbook.xlsx.writeFile(filePath);
    console.log(`CampaignsExporter: Salvo data.xlsx (${clientId})`);
  }

  /**
   * Constrói aba de Campanhas
   * @private
   */
  _buildCampaignsSheet(sheet, campaigns) {
    sheet.columns = [
      { header: 'ID da Campanha', key: 'id', width: 20 },
      { header: 'Nome', key: 'name', width: 30 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Objetivo', key: 'objective', width: 18 },
      { header: 'Budget Diário (R$)', key: 'dailyBudget', width: 15 },
      { header: 'Criada em', key: 'createdTime', width: 15 },
      { header: 'Impressões', key: 'impressions', width: 12 },
      { header: 'Cliques', key: 'clicks', width: 12 },
      { header: 'Gasto (R$)', key: 'spend', width: 12 },
      { header: 'CPL (R$)', key: 'cpl', width: 12 },
      { header: 'Conversões', key: 'conversions', width: 12 },
      { header: 'ROAS', key: 'roas', width: 10 },
      { header: 'CTR (%)', key: 'ctr', width: 10 },
      { header: 'CPM (R$)', key: 'cpm', width: 12 },
      { header: 'Observações', key: 'notes', width: 25 },
    ];

    // Aplicar header
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4788' } };

    // Adicionar dados
    campaigns.forEach((campaign, idx) => {
      const row = sheet.addRow({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        dailyBudget: campaign.dailyBudget || 0,
        createdTime: campaign.createdTime ? new Date(campaign.createdTime).toLocaleDateString('pt-BR') : '',
        impressions: campaign.metrics?.impressions || 0,
        clicks: campaign.metrics?.clicks || 0,
        spend: campaign.metrics?.spend || 0,
        cpl: campaign.metrics?.costPerResult || 0,
        conversions: campaign.metrics?.conversions || 0,
        roas: campaign.metrics?.spend ? 0 : 0, // Calcular quando houver dados de faturamento
        ctr: campaign.metrics?.ctr || 0,
        cpm: campaign.metrics?.cpm || 0,
        notes: campaign.status === 'ACTIVE' ? '✅ Ativa' : campaign.status === 'PAUSED' ? '⏸️ Pausada' : '❌ Deletada',
      });

      // Linhas alternadas
      if ((idx + 2) % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      }

      // Formatação condicional para CPL
      const cplCell = row.getCell('cpl');
      if (cplCell.value && cplCell.value < 20) {
        cplCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
      } else if (cplCell.value && cplCell.value > 40) {
        cplCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
      }

      // Formatação condicional para Status
      const statusCell = row.getCell('status');
      if (statusCell.value === 'ACTIVE') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
      } else if (statusCell.value === 'PAUSED') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } };
      }
    });

    // Frozen panes (headers sempre visíveis)
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  /**
   * Constrói aba de Adsets
   * @private
   */
  _buildAdSetsSheet(sheet, campaigns) {
    sheet.columns = [
      { header: 'ID do Adset', key: 'id', width: 20 },
      { header: 'Nome', key: 'name', width: 30 },
      { header: 'Campanha', key: 'campaign', width: 25 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Budget Diário (R$)', key: 'budget', width: 15 },
      { header: 'Público-alvo', key: 'audience', width: 25 },
      { header: 'Impressões', key: 'impressions', width: 12 },
      { header: 'Cliques', key: 'clicks', width: 12 },
      { header: 'Conversões', key: 'conversions', width: 12 },
      { header: 'CPL (R$)', key: 'cpl', width: 12 },
      { header: 'Frequência', key: 'frequency', width: 12 },
      { header: 'Performance', key: 'performance', width: 12 },
    ];

    // Aplicar header
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4788' } };

    // Nota: Em produção, adsets viriam da API da Meta
    // Por enquanto, adicionar linha demonstrativa
    sheet.addRow({
      id: 'N/A',
      name: 'Dados indisponíveis',
      campaign: 'Implementar getCampaignAdsets',
      status: 'N/A',
      budget: 0,
      audience: 'N/A',
      impressions: 0,
      clicks: 0,
      conversions: 0,
      cpl: 0,
      frequency: 0,
      performance: 'N/A',
    });

    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  /**
   * Constrói aba de Criativos
   * @private
   */
  _buildCreativesSheet(sheet, campaigns) {
    sheet.columns = [
      { header: 'ID do Criativo', key: 'id', width: 20 },
      { header: 'Nome/Hook', key: 'name', width: 30 },
      { header: 'Campanha', key: 'campaign', width: 25 },
      { header: 'Formato', key: 'format', width: 15 },
      { header: 'CTA', key: 'cta', width: 15 },
      { header: 'Impressões', key: 'impressions', width: 12 },
      { header: 'Cliques', key: 'clicks', width: 12 },
      { header: 'CTR (%)', key: 'ctr', width: 10 },
      { header: 'CPL (R$)', key: 'cpl', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Performance', key: 'performance', width: 12 },
    ];

    // Aplicar header
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4788' } };

    // Nota: Em produção, criativos viriam da API da Meta
    sheet.addRow({
      id: 'N/A',
      name: 'Dados indisponíveis',
      campaign: 'Implementar getCampaignCreatives',
      format: 'N/A',
      cta: 'N/A',
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpl: 0,
      status: 'N/A',
      performance: 'N/A',
    });

    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  /**
   * Aplica formatação ao workbook
   * @private
   */
  _applyExcelFormatting(workbook) {
    if (!workbook.worksheets) return;

    workbook.worksheets.forEach(sheet => {
      if (!sheet.columns) return;

      sheet.columns.forEach((col, colIdx) => {
        // Auto-fit de colunas
        let maxLength = col.header ? String(col.header).length : 10;
        col.width = Math.min(maxLength + 2, 50);

        // Formatação de moeda/números nas colunas de dados
        if (col.key?.includes('Budget') || col.key?.includes('spend') ||
            col.key?.includes('cpl') || col.key?.includes('cpm') || col.key?.includes('daily')) {
          sheet.getColumn(colIdx + 1).numFmt = '"R$ "#,##0.00';
        } else if (col.key?.includes('percentage') || col.key === 'ctr') {
          sheet.getColumn(colIdx + 1).numFmt = '0.00%';
        }
      });
    });
  }

  /**
   * Sincroniza todos os clientes
   * @returns {Promise<Map>}
   */
  async syncAllClients() {
    if (!this._initialized) await this.init();

    const results = new Map();
    const clients = celoConfig.listClients();

    console.log(`CampaignsExporter: Sincronizando ${clients.length} cliente(s)...`);

    for (const client of clients) {
      try {
        const result = await this.exportClientCampaigns(client.id);
        results.set(client.id, { success: true, timestamp: result.exportedAt });
      } catch (err) {
        console.error(`CampaignsExporter: Erro ao sincronizar ${client.id}:`, err.message);
        results.set(client.id, { success: false, error: err.message });
      }
    }

    return results;
  }

  /**
   * Exporta dados estruturados para Google Sheets
   * Mapeando colunas da Meta Ads API para a planilha esperada
   * Gera uma linha por campanha POR DIA (últimos 120 dias)
   * @param {string} clientId
   * @param {Object} data - Dados síntese com campanhas
   * @returns {Promise<Array>} Rows para Google Sheets
   */
  async buildGoogleSheetsRows(clientId, data) {
    const rows = [];
    const client = celoConfig.getClient(clientId);

    // Mapeamento de colunas esperadas no Google Sheets
    const columnMap = [
      'account_name',
      'actions_landing_page_view',
      'actions_lead',
      'actions_onsite_conversion_messaging_conversation_started_7d',
      'ad_name',
      'adset_name',
      'adset_start_time',
      'adset_status',
      'campaign',
      'campaign_daily_budget',
      'campaign_status',
      'clicks',
      'cost_per_action_type_landing_page_view',
      'cost_per_action_type_lead',
      'cost_per_action_type_onsite_conversion_messaging_conversation_started_7d',
      'cost_per_thruplay_video_view',
      'cpc',
      'cpm',
      'ctr',
      'datasource',
      'date',
      'frequency',
      'impressions',
      'link_clicks',
      'reach',
      'source',
      'thumbnail_url',
      'video_avg_time_watched_actions_video_view',
      'video_p25_watched_actions_video_view',
      'video_p50_watched_actions_video_view',
      'video_p75_watched_actions_video_view',
      'video_p100_watched_actions_video_view',
      'video_thruplay_watched_actions_video_view',
    ];

    // Gerar uma linha por CAMPANHA × ADSET × CRIATIVO × DIA
    data.meta.campaigns.forEach(campaign => {
      // Se não há adsets, criar línhas por campanha × dia (fallback)
      if (!campaign.adsets || campaign.adsets.length === 0) {
        if (campaign.dailyInsights && campaign.dailyInsights.length > 0) {
          campaign.dailyInsights.forEach(dailyData => {
            const row = columnMap.map(col => {
              switch (col) {
                case 'account_name':
                  return client.name || '';
                case 'actions_landing_page_view':
                  return dailyData.landingPageViews || 0;
                case 'actions_lead':
                  return dailyData.conversions || 0;
                case 'actions_onsite_conversion_messaging_conversation_started_7d':
                  return dailyData.messagingConversations || 0;
                case 'ad_name':
                  return ''; // Sem criativo
                case 'adset_name':
                  return '';
                case 'adset_start_time':
                  return '';
                case 'adset_status':
                  return '';
                case 'campaign':
                  return campaign.name || '';
                case 'campaign_daily_budget':
                  return campaign.dailyBudget || 0;
                case 'campaign_status':
                  return campaign.status || 'PAUSED';
                case 'clicks':
                  return dailyData.clicks || 0;
                case 'cost_per_action_type_landing_page_view':
                  return dailyData.costPerLandingPageView || 0;
                case 'cost_per_action_type_lead':
                  return dailyData.costPerResult || 0;
                case 'cost_per_action_type_onsite_conversion_messaging_conversation_started_7d':
                  return dailyData.costPerMessagingConversation || 0;
                case 'cost_per_thruplay_video_view':
                  return dailyData.costPerThruplayVideoView || 0;
                case 'cpc':
                  return dailyData.cpc || 0;
                case 'cpm':
                  return dailyData.cpm || 0;
                case 'ctr':
                  return dailyData.ctr || 0;
                case 'date':
                  return dailyData.date || new Date().toISOString().split('T')[0];
                case 'datasource':
                  return 'Meta Ads API';
                case 'frequency':
                  return dailyData.frequency || 0;
                case 'impressions':
                  return dailyData.impressions || 0;
                case 'link_clicks':
                  return dailyData.linkClicks || 0;
                case 'reach':
                  return dailyData.reach || 0;
                case 'source':
                  return 'CampaignsExporter';
                default:
                  return '';
              }
            });
            rows.push(row);
          });
        }
        return; // Próxima campanha
      }

      // Estrutura: campanha × adset × ad × dia
      campaign.adsets.forEach(adset => {
        // Se adset não tem ads, gerar linhas sem ad
        if (!adset.ads || adset.ads.length === 0) {
          if (campaign.dailyInsights && campaign.dailyInsights.length > 0) {
            campaign.dailyInsights.forEach(dailyData => {
              const row = columnMap.map(col => {
                switch (col) {
                  case 'account_name':
                    return client.name || '';
                  case 'ad_name':
                    return ''; // Sem criativo
                  case 'adset_name':
                    return adset.name || '';
                  case 'adset_start_time':
                    return adset.startTime || '';
                  case 'adset_status':
                    return adset.status || '';
                  case 'campaign':
                    return campaign.name || '';
                  case 'campaign_daily_budget':
                    return campaign.dailyBudget || 0;
                  case 'campaign_status':
                    return campaign.status || 'PAUSED';
                  case 'date':
                    return dailyData.date || new Date().toISOString().split('T')[0];
                  case 'clicks':
                    return dailyData.clicks || 0;
                  case 'impressions':
                    return dailyData.impressions || 0;
                  case 'cpc':
                    return dailyData.cpc || 0;
                  case 'cpm':
                    return dailyData.cpm || 0;
                  case 'ctr':
                    return dailyData.ctr || 0;
                  case 'actions_landing_page_view':
                    return dailyData.landingPageViews || 0;
                  case 'actions_lead':
                    return dailyData.conversions || 0;
                  case 'reach':
                    return dailyData.reach || 0;
                  case 'frequency':
                    return dailyData.frequency || 0;
                  case 'link_clicks':
                    return dailyData.linkClicks || 0;
                  case 'cost_per_action_type_landing_page_view':
                    return dailyData.costPerLandingPageView || 0;
                  case 'cost_per_action_type_lead':
                    return dailyData.costPerResult || 0;
                  case 'cost_per_action_type_onsite_conversion_messaging_conversation_started_7d':
                    return dailyData.costPerMessagingConversation || 0;
                  case 'cost_per_thruplay_video_view':
                    return dailyData.costPerThruplayVideoView || 0;
                  case 'thumbnail_url':
                    return '';
                  case 'video_avg_time_watched_actions_video_view':
                    return 0;
                  case 'video_p25_watched_actions_video_view':
                    return 0;
                  case 'video_p50_watched_actions_video_view':
                    return 0;
                  case 'video_p75_watched_actions_video_view':
                    return 0;
                  case 'video_p100_watched_actions_video_view':
                    return 0;
                  case 'video_thruplay_watched_actions_video_view':
                    return 0;
                  case 'datasource':
                    return 'Meta Ads API';
                  case 'source':
                    return 'CampaignsExporter';
                  default:
                    return '';
                }
              });
              rows.push(row);
            });
          }
          return; // Próximo adset
        }

        // Para cada ad, gerar uma linha por dia
        adset.ads.forEach(ad => {
          if (campaign.dailyInsights && campaign.dailyInsights.length > 0) {
            campaign.dailyInsights.forEach(dailyData => {
              const row = columnMap.map(col => {
                switch (col) {
                  case 'account_name':
                    return client.name || '';
                  case 'ad_name':
                    return ad.name || ''; // 🎯 NOME DO AD (agora correto!)
                  case 'adset_name':
                    return adset.name || '';
                  case 'adset_start_time':
                    return adset.startTime || '';
                  case 'adset_status':
                    return adset.status || '';
                  case 'campaign':
                    return campaign.name || '';
                  case 'campaign_daily_budget':
                    return campaign.dailyBudget || 0;
                  case 'campaign_status':
                    return campaign.status || 'PAUSED';
                  case 'date':
                    return dailyData.date || new Date().toISOString().split('T')[0];
                  case 'clicks':
                    return dailyData.clicks || 0;
                  case 'impressions':
                    return dailyData.impressions || 0;
                  case 'cpc':
                    return dailyData.cpc || 0;
                  case 'cpm':
                    return dailyData.cpm || 0;
                  case 'ctr':
                    return dailyData.ctr || 0;
                  case 'actions_landing_page_view':
                    return dailyData.landingPageViews || 0;
                  case 'actions_lead':
                    return dailyData.conversions || 0;
                  case 'reach':
                    return dailyData.reach || 0;
                  case 'frequency':
                    return dailyData.frequency || 0;
                  case 'link_clicks':
                    return dailyData.linkClicks || 0;
                  case 'cost_per_action_type_landing_page_view':
                    return dailyData.costPerLandingPageView || 0;
                  case 'cost_per_action_type_lead':
                    return dailyData.costPerResult || 0;
                  case 'cost_per_action_type_onsite_conversion_messaging_conversation_started_7d':
                    return dailyData.costPerMessagingConversation || 0;
                  case 'cost_per_thruplay_video_view':
                    return dailyData.costPerThruplayVideoView || 0;
                  case 'thumbnail_url':
                    return ad.thumbnailUrl || '';
                  case 'video_avg_time_watched_actions_video_view':
                    return ad.videoAvgTimeWatched || 0;
                  case 'video_p25_watched_actions_video_view':
                    return ad.videoP25Watched || 0;
                  case 'video_p50_watched_actions_video_view':
                    return ad.videoP50Watched || 0;
                  case 'video_p75_watched_actions_video_view':
                    return ad.videoP75Watched || 0;
                  case 'video_p100_watched_actions_video_view':
                    return ad.videoP100Watched || 0;
                  case 'video_thruplay_watched_actions_video_view':
                    return ad.videoThruplay || 0;
                  case 'datasource':
                    return 'Meta Ads API';
                  case 'source':
                    return 'CampaignsExporter';
                  default:
                    return '';
                }
              });
              rows.push(row);
            });
          }
        });
      });
    });

    return rows;
  }

  /**
   * Salva dados em Google Sheets (aba Meta Ads)
   * @param {string} clientId
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async saveToGoogleSheets(clientId, data) {
    try {
      const client = celoConfig.getClient(clientId);
      if (!client.spreadsheetId) {
        console.warn(`CampaignsExporter: ${clientId} não tem spreadsheetId configurado`);
        return;
      }

      // Gerar rows estruturadas
      const rows = await this.buildGoogleSheetsRows(clientId, data);

      if (rows.length === 0) {
        console.warn(`CampaignsExporter: Nenhuma campanha para ${clientId}`);
        return;
      }

      // Headers (primeira linha)
      const headers = [
        'account_name',
        'actions_landing_page_view',
        'actions_lead',
        'actions_onsite_conversion_messaging_conversation_started_7d',
        'ad_name',
        'adset_name',
        'adset_start_time',
        'adset_status',
        'campaign',
        'campaign_daily_budget',
        'campaign_status',
        'clicks',
        'cost_per_action_type_landing_page_view',
        'cost_per_action_type_lead',
        'cost_per_action_type_onsite_conversion_messaging_conversation_started_7d',
        'cost_per_thruplay_video_view',
        'cpc',
        'cpm',
        'ctr',
        'datasource',
        'date',
        'frequency',
        'impressions',
        'link_clicks',
        'reach',
        'source',
        'thumbnail_url',
        'video_avg_time_watched_actions_video_view',
        'video_p25_watched_actions_video_view',
        'video_p50_watched_actions_video_view',
        'video_p75_watched_actions_video_view',
        'video_p100_watched_actions_video_view',
        'video_thruplay_watched_actions_video_view',
      ];

      // Preparar dados: [headers, ...rows]
      const values = [headers, ...rows];

      // Usar Google Sheets API para atualizar
      await this.celoAgent.initAuth();
      if (!this.celoAgent.sheets) {
        console.warn('CampaignsExporter: Google Sheets não disponível');
        return;
      }

      // Limpar dados antigos e inserir novos
      const { google } = require('googleapis');
      const sheets = this.celoAgent.sheets;

      // Atualizar range (limpar e adicionar dados novos)
      // CORRIGIDO: aba se chama 'Campanhas', não 'Meta Ads'
      await sheets.spreadsheets.values.clear({
        spreadsheetId: client.spreadsheetId,
        range: "'Campanhas'!A1:AK5000",  // A até AK cobre todas as 37 colunas
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: client.spreadsheetId,
        range: "'Campanhas'!A1",
        valueInputOption: 'RAW',
        resource: { values },
      });

      console.log(`CampaignsExporter: ✅ Google Sheets atualizada para ${clientId} (${rows.length} linhas)`);
    } catch (err) {
      console.error(`CampaignsExporter: Erro ao salvar em Google Sheets (${clientId}):`, err.message);
    }
  }

  /**
   * Retorna status de sincronização
   * @returns {Object}
   */
  getStatus() {
    const clients = celoConfig.listClients();
    const lastSyncs = {};

    clients.forEach(client => {
      const lastSync = this._lastSync.get(client.id);
      lastSyncs[client.id] = lastSync ? lastSync.toISOString() : 'Nunca';
    });

    return {
      status: 'ok',
      lastSyncs,
      nextSync: new Date(Date.now() + 4 * 3600000).toISOString(), // +4 horas
    };
  }

  /**
   * Cria diretório se não existir
   * @private
   */
  _ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

module.exports = CampaignsExporter;
