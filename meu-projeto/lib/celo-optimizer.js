/**
 * CeloOptimizer - Engine de otimização rules-based para campanhas de mídia paga.
 * Puxa métricas via AdsManager, aplica regras e retorna sugestões com prioridade.
 *
 * Regras implementadas:
 *   1. Dados insuficientes → aguardar
 *   2. Frequência crítica → pausar
 *   3. Frequência alta + CTR baixo → pausar
 *   4. CTR muito baixo → pausar
 *   5. Zero conversões após 5 dias + R$100 → kill
 *   6. Budget pacing (gasto acima/abaixo do esperado) → alerta
 *   7. CPL abaixo do target → escalar
 *   8. Frequência subindo → alerta (creative fatigue)
 *   9. Health score composto por campanha
 */

const celoConfig = require('./celo-config');

// Regras de otimização (thresholds configuráveis)
const RULES = {
  // Pausar criativo: frequência alta + CTR caindo
  MAX_FREQUENCY: 3,
  CRITICAL_FREQUENCY: 4,
  // CPL target: se CPL abaixo, pode escalar
  CPL_SCALE_THRESHOLD: 0.8, // 80% do target = bom para escalar
  // Dados mínimos para tomar decisão
  MIN_IMPRESSIONS: 1000,
  MIN_HOURS: 72,
  // CTR benchmark (relativo): se CTR < 50% do account average, pausar
  CTR_LOW_RATIO: 0.5,
  // Budget: máximo de scale por vez (%)
  MAX_SCALE_PCT: 0.30, // Escalar no máximo 30% por vez
  // Kill rule: sem conversão
  NO_CONVERSION_DAYS: 5,
  NO_CONVERSION_MIN_SPEND: 100, // R$
  // Budget pacing
  PACING_OVER_THRESHOLD: 1.2, // 120% do esperado = alerta de overspend
  PACING_UNDER_THRESHOLD: 0.5, // 50% do esperado = alerta de underspend
  // Creative fatigue warning
  FATIGUE_FREQUENCY: 2.5,
  // Google Ads specific
  GOOGLE_LOW_QUALITY_SCORE: 5,
  GOOGLE_LOW_IMPRESSION_SHARE: 0.5, // 50%
};

class CeloOptimizer {
  /**
   * @param {import('./ads-manager')} adsManager
   */
  constructor(adsManager) {
    this.adsManager = adsManager;
  }

  /**
   * Analisa todas as campanhas ativas de um cliente e retorna sugestões.
   * @param {string} clientId
   * @param {Object} [options]
   * @param {number} [options.cplTarget] - CPL target em R$ (se não informado, usa média)
   * @returns {Promise<{suggestions: Array, summary: string, health: Object, pacing: Object}>}
   */
  async analyze(clientId, options = {}) {
    // Buscar campanhas de todas as plataformas do cliente
    const platforms = this.adsManager.getClientPlatforms(clientId);
    let allCampaigns = [];

    for (const platform of platforms) {
      try {
        const campaigns = await this.adsManager.listCampaigns(platform, {
          clientId,
          statusFilter: ['ACTIVE'],
        });
        allCampaigns = allCampaigns.concat(campaigns);
      } catch (err) {
        console.warn(`CeloOptimizer: Erro ao listar campanhas ${platform}: ${err.message}`);
      }
    }

    if (allCampaigns.length === 0) {
      return {
        suggestions: [],
        summary: 'Nenhuma campanha ativa.',
        health: { score: 0, grade: '-', campaigns: [] },
        pacing: null,
      };
    }

    // Buscar métricas 7d e today em paralelo
    const metricsResults = await Promise.allSettled(
      allCampaigns.map(async (c) => {
        const platform = c.platform || 'meta';
        const [metrics7d, metricsToday] = await Promise.all([
          this.adsManager.getCampaignMetrics(platform, c.id, 'last_7d', clientId).catch(() => null),
          this.adsManager.getCampaignMetrics(platform, c.id, 'today', clientId).catch(() => null),
        ]);
        return { campaign: c, metrics: metrics7d, metricsToday };
      })
    );

    const campaignData = metricsResults
      .filter((r) => r.status === 'fulfilled' && r.value.metrics)
      .map((r) => r.value);

    if (campaignData.length === 0) {
      return {
        suggestions: [],
        summary: 'Sem dados de metricas nas campanhas ativas.',
        health: { score: 0, grade: '-', campaigns: [] },
        pacing: null,
      };
    }

    // Calcular médias do account para benchmarks
    const avgCTR = this._average(campaignData, (d) => d.metrics.ctr);
    const avgCPL = this._average(
      campaignData.filter((d) => d.metrics.costPerResult > 0),
      (d) => d.metrics.costPerResult
    );
    const cplTarget = options.cplTarget || avgCPL || 30;

    const suggestions = [];
    const healthScores = [];

    for (const { campaign, metrics, metricsToday } of campaignData) {
      const age = this._campaignAgeHours(campaign.createdTime);
      const campaignPlatform = campaign.platform || 'meta';
      let campaignHealth = 100; // Começa perfeito, vai perdendo pontos

      // Regra 1: dados insuficientes
      if (metrics.impressions < RULES.MIN_IMPRESSIONS || age < RULES.MIN_HOURS) {
        suggestions.push({
          type: 'wait',
          target: campaign.name,
          targetId: campaign.id,
          platform: campaignPlatform,
          action: `Aguardar mais dados (${metrics.impressions} imp, ${Math.round(age)}h)`,
          reason: `Menos de ${RULES.MIN_IMPRESSIONS} impressoes ou ${RULES.MIN_HOURS}h de dados`,
          priority: 'low',
          metrics: { impressions: metrics.impressions, age: Math.round(age) },
        });
        healthScores.push({ name: campaign.name, id: campaign.id, score: 50, status: 'learning' });
        continue;
      }

      const isGoogle = campaign.platform === 'google';

      // Regra 2: frequência crítica (> 4) — Meta only (Google nao reporta frequency)
      if (!isGoogle && metrics.frequency > RULES.CRITICAL_FREQUENCY) {
        suggestions.push({
          type: 'pause',
          target: campaign.name,
          targetId: campaign.id,
          platform: campaignPlatform,
          action: `Pausar - frequencia critica (${metrics.frequency.toFixed(1)})`,
          reason: `Frequencia ${metrics.frequency.toFixed(1)} > ${RULES.CRITICAL_FREQUENCY}. Publico saturado.`,
          priority: 'high',
          metrics: { frequency: metrics.frequency, ctr: metrics.ctr },
        });
        healthScores.push({ name: campaign.name, id: campaign.id, score: 10, status: 'critical' });
        continue;
      }

      // Regra 3: frequência alta + CTR baixo — Meta only
      if (!isGoogle && metrics.frequency > RULES.MAX_FREQUENCY && metrics.ctr < avgCTR * RULES.CTR_LOW_RATIO) {
        suggestions.push({
          type: 'pause',
          target: campaign.name,
          targetId: campaign.id,
          platform: campaignPlatform,
          action: `Pausar - frequencia ${metrics.frequency.toFixed(1)} + CTR baixo (${metrics.ctr.toFixed(2)}%)`,
          reason: `Frequencia > ${RULES.MAX_FREQUENCY} e CTR abaixo de 50% da media (${avgCTR.toFixed(2)}%)`,
          priority: 'high',
          metrics: { frequency: metrics.frequency, ctr: metrics.ctr, avgCTR },
        });
        healthScores.push({ name: campaign.name, id: campaign.id, score: 15, status: 'critical' });
        continue;
      }

      // Regra 4: CTR muito baixo (sem frequência alta)
      if (metrics.ctr < avgCTR * RULES.CTR_LOW_RATIO && metrics.impressions > 2000) {
        suggestions.push({
          type: 'pause',
          target: campaign.name,
          targetId: campaign.id,
          platform: campaignPlatform,
          action: `Pausar - CTR muito baixo (${metrics.ctr.toFixed(2)}%)`,
          reason: `CTR ${metrics.ctr.toFixed(2)}% esta abaixo de 50% da media (${avgCTR.toFixed(2)}%)`,
          priority: 'medium',
          metrics: { ctr: metrics.ctr, avgCTR },
        });
        campaignHealth -= 40;
      }

      // Regra 5: Zero conversões após X dias + R$Y gastos (kill rule)
      if (
        metrics.conversions === 0 &&
        age >= RULES.NO_CONVERSION_DAYS * 24 &&
        metrics.spend >= RULES.NO_CONVERSION_MIN_SPEND
      ) {
        suggestions.push({
          type: 'pause',
          target: campaign.name,
          targetId: campaign.id,
          platform: campaignPlatform,
          action: `Kill - ${Math.round(age / 24)} dias + R$ ${metrics.spend.toFixed(2)} sem conversao`,
          reason: `${Math.round(age / 24)} dias ativos, R$ ${metrics.spend.toFixed(2)} gastos, zero conversoes. Budget desperdicado.`,
          priority: 'high',
          metrics: { spend: metrics.spend, days: Math.round(age / 24), conversions: 0 },
        });
        healthScores.push({ name: campaign.name, id: campaign.id, score: 5, status: 'dead' });
        continue;
      }

      // Regra 6: Budget pacing (usando metricsToday)
      if (metricsToday && campaign.budget?.daily > 0) {
        const now = new Date();
        const hoursBR = (now.getUTCHours() - 3 + 24) % 24; // BRT
        const expectedPct = Math.max(hoursBR / 24, 0.1); // % do dia passado
        const expectedSpend = campaign.budget.daily * expectedPct;
        const actualSpend = metricsToday.spend || 0;

        if (actualSpend > 0 && expectedSpend > 0) {
          const pacingRatio = actualSpend / expectedSpend;

          if (pacingRatio > RULES.PACING_OVER_THRESHOLD) {
            suggestions.push({
              type: 'alert',
              target: campaign.name,
              targetId: campaign.id,
              platform: campaignPlatform,
              action: `Overspend - gastando ${(pacingRatio * 100).toFixed(0)}% do esperado`,
              reason: `Gasto hoje: R$ ${actualSpend.toFixed(2)} vs esperado R$ ${expectedSpend.toFixed(2)} (${hoursBR}h do dia). Pode estourar budget diario.`,
              priority: 'medium',
              metrics: { actualSpend, expectedSpend, pacingRatio, dailyBudget: campaign.budget.daily },
            });
            campaignHealth -= 15;
          } else if (pacingRatio < RULES.PACING_UNDER_THRESHOLD && hoursBR >= 12) {
            suggestions.push({
              type: 'alert',
              target: campaign.name,
              targetId: campaign.id,
              platform: campaignPlatform,
              action: `Underspend - gastando so ${(pacingRatio * 100).toFixed(0)}% do esperado`,
              reason: `Gasto hoje: R$ ${actualSpend.toFixed(2)} vs esperado R$ ${expectedSpend.toFixed(2)}. Campanha pode ter problema de entrega.`,
              priority: 'low',
              metrics: { actualSpend, expectedSpend, pacingRatio, dailyBudget: campaign.budget.daily },
            });
            campaignHealth -= 10;
          }
        }
      }

      // Regra 7: CPL abaixo do target → escalar
      if (metrics.costPerResult > 0 && metrics.costPerResult < cplTarget * RULES.CPL_SCALE_THRESHOLD) {
        const currentBudget = campaign.budget?.daily || 0;
        const suggestedBudget = currentBudget > 0
          ? Math.round(currentBudget * (1 + RULES.MAX_SCALE_PCT) * 100) / 100
          : 0;

        suggestions.push({
          type: 'scale',
          target: campaign.name,
          targetId: campaign.id,
          platform: campaignPlatform,
          action: currentBudget > 0
            ? `Escalar budget: R$ ${currentBudget.toFixed(2)} -> R$ ${suggestedBudget.toFixed(2)}`
            : `Escalar - CPL excelente (R$ ${metrics.costPerResult.toFixed(2)})`,
          reason: `CPL R$ ${metrics.costPerResult.toFixed(2)} esta abaixo de 80% do target (R$ ${cplTarget.toFixed(2)})`,
          priority: 'medium',
          metrics: { cpl: metrics.costPerResult, cplTarget, currentBudget, suggestedBudget },
        });
        campaignHealth += 10; // Bonus por boa performance
      }

      // Regra 8: frequência subindo (creative fatigue warning) — Meta only
      if (!isGoogle && metrics.frequency > RULES.FATIGUE_FREQUENCY && metrics.frequency <= RULES.MAX_FREQUENCY) {
        suggestions.push({
          type: 'creative_fatigue',
          target: campaign.name,
          targetId: campaign.id,
          platform: campaignPlatform,
          action: `Creative fatigue - frequencia ${metrics.frequency.toFixed(1)} (pedir criativo novo)`,
          reason: `Frequencia ${metrics.frequency.toFixed(1)} indica saturacao do publico. Novos criativos podem reverter queda de CTR.`,
          priority: 'medium',
          metrics: { frequency: metrics.frequency, ctr: metrics.ctr },
        });
        campaignHealth -= 15;
      }

      // Regra 9 (Google): Impression Share baixo
      if (isGoogle && metrics.impressionShare != null && metrics.impressionShare < RULES.GOOGLE_LOW_IMPRESSION_SHARE) {
        suggestions.push({
          type: 'alert',
          target: campaign.name,
          targetId: campaign.id,
          action: `Impression Share baixo (${(metrics.impressionShare * 100).toFixed(0)}%) - considere aumentar bid ou budget`,
          reason: `Search Impression Share ${(metrics.impressionShare * 100).toFixed(0)}% < ${RULES.GOOGLE_LOW_IMPRESSION_SHARE * 100}%. Oportunidades sendo perdidas.`,
          priority: 'medium',
          platform: 'google',
          metrics: { impressionShare: metrics.impressionShare },
        });
        campaignHealth -= 15;
      }

      // Calcular health score final da campanha
      // Penalidades adicionais baseadas em métricas
      if (metrics.ctr > 0 && avgCTR > 0) {
        const ctrRatio = metrics.ctr / avgCTR;
        if (ctrRatio < 0.7) campaignHealth -= 20;
        else if (ctrRatio > 1.3) campaignHealth += 10;
      }
      if (!isGoogle && metrics.frequency > 2) campaignHealth -= (metrics.frequency - 2) * 10;
      if (metrics.costPerResult > 0 && cplTarget > 0) {
        const cplRatio = metrics.costPerResult / cplTarget;
        if (cplRatio > 1.5) campaignHealth -= 25;
        else if (cplRatio > 1.2) campaignHealth -= 10;
        else if (cplRatio < 0.8) campaignHealth += 10;
      }

      const score = Math.max(0, Math.min(100, campaignHealth));
      const status = score >= 80 ? 'healthy' : score >= 50 ? 'warning' : score >= 25 ? 'poor' : 'critical';
      healthScores.push({ name: campaign.name, id: campaign.id, score, status });
    }

    // Platform e atribuido por campanha durante o loop acima.
    // Sugestoes sem platform (legacy) default para 'meta'.
    for (const s of suggestions) {
      if (!s.platform) s.platform = 'meta';
    }

    // Ordenar por prioridade
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const high = suggestions.filter((s) => s.priority === 'high').length;
    const medium = suggestions.filter((s) => s.priority === 'medium').length;
    const low = suggestions.filter((s) => s.priority === 'low').length;

    // Budget pacing do cliente
    const pacing = this._calculatePacing(clientId, campaignData);

    // Health score geral
    const avgHealth = healthScores.length > 0
      ? Math.round(healthScores.reduce((s, h) => s + h.score, 0) / healthScores.length)
      : 0;
    const healthGrade = avgHealth >= 80 ? 'A' : avgHealth >= 60 ? 'B' : avgHealth >= 40 ? 'C' : avgHealth >= 20 ? 'D' : 'F';

    return {
      suggestions,
      summary: `${suggestions.length} sugestao(es): ${high} alta, ${medium} media, ${low} baixa prioridade`,
      benchmarks: { avgCTR, avgCPL, cplTarget },
      health: {
        score: avgHealth,
        grade: healthGrade,
        campaigns: healthScores,
      },
      pacing,
    };
  }

  /**
   * Calcula budget pacing do cliente (gasto vs budget mensal).
   */
  _calculatePacing(clientId, campaignData) {
    const client = celoConfig.getClient(clientId);
    const monthlyBudget = client?.budget?.monthly || 0;
    if (monthlyBudget <= 0) return null;

    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const expectedPct = dayOfMonth / daysInMonth;
    const expectedSpend = monthlyBudget * expectedPct;

    // Somar gasto de 7d e extrapolar para o mês
    const totalSpend7d = campaignData.reduce((s, d) => s + (d.metrics?.spend || 0), 0);
    const dailyAvg = totalSpend7d / 7;
    const projectedMonthly = dailyAvg * daysInMonth;
    const totalSpendToday = campaignData.reduce((s, d) => s + (d.metricsToday?.spend || 0), 0);

    return {
      monthlyBudget,
      expectedSpend: Math.round(expectedSpend * 100) / 100,
      dailyAvg: Math.round(dailyAvg * 100) / 100,
      projectedMonthly: Math.round(projectedMonthly * 100) / 100,
      spendToday: Math.round(totalSpendToday * 100) / 100,
      pctUsed: Math.round((projectedMonthly / monthlyBudget) * 100),
      onTrack: projectedMonthly <= monthlyBudget * 1.1, // 10% margem
      daysRemaining: daysInMonth - dayOfMonth,
    };
  }

  /**
   * Executa uma sugestão de otimização.
   * @param {Object} suggestion
   * @returns {Promise<{executed: boolean, message: string}>}
   */
  async execute(suggestion) {
    const platform = suggestion.platform || 'meta';
    switch (suggestion.type) {
      case 'pause': {
        await this.adsManager.updateStatus(platform, suggestion.targetId, 'campaign', false);
        return { executed: true, message: `Campanha "${suggestion.target}" pausada (${platform}).` };
      }
      case 'scale': {
        if (suggestion.metrics.suggestedBudget > 0) {
          const result = await this.adsManager.updateBudget(
            platform, suggestion.targetId, 'campaign',
            suggestion.metrics.currentBudget,
            suggestion.metrics.suggestedBudget,
            { campaignName: suggestion.target, reason: 'Auto-optimize: CPL abaixo do target' }
          );
          if (result.executed) {
            return { executed: true, message: `Budget escalado para R$ ${suggestion.metrics.suggestedBudget.toFixed(2)}` };
          }
          return { executed: false, message: 'Enviado para aprovacao (mudanca > 20%).' };
        }
        return { executed: false, message: 'Sem budget configurado para escalar.' };
      }
      case 'creative_fatigue':
        return { executed: false, message: `Creative fatigue em "${suggestion.target}". Solicitar novo criativo.` };
      case 'wait':
      case 'alert':
        return { executed: false, message: 'Nenhuma acao necessaria. Apenas monitorar.' };
      default:
        return { executed: false, message: `Tipo desconhecido: ${suggestion.type}` };
    }
  }

  _average(arr, getter) {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, item) => sum + getter(item), 0) / arr.length;
  }

  _campaignAgeHours(createdTime) {
    if (!createdTime) return 999; // Assume campanha antiga
    const created = new Date(createdTime);
    return (Date.now() - created.getTime()) / (1000 * 60 * 60);
  }
}

module.exports = CeloOptimizer;
