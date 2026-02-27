/**
 * CeloOptimizer - Engine de otimização rules-based para campanhas de mídia paga.
 * Puxa métricas via AdsManager, aplica regras e retorna sugestões com prioridade.
 */

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
   * @returns {Promise<{suggestions: Array, summary: string}>}
   */
  async analyze(clientId, options = {}) {
    const campaigns = await this.adsManager.listCampaigns('meta', {
      clientId,
      statusFilter: ['ACTIVE'],
    });

    if (campaigns.length === 0) {
      return { suggestions: [], summary: 'Nenhuma campanha ativa.' };
    }

    // Buscar métricas de cada campanha em paralelo
    const metricsResults = await Promise.allSettled(
      campaigns.map(async (c) => {
        const metrics = await this.adsManager.getCampaignMetrics('meta', c.id, 'last_7d');
        return { campaign: c, metrics };
      })
    );

    const campaignData = metricsResults
      .filter((r) => r.status === 'fulfilled' && r.value.metrics)
      .map((r) => r.value);

    if (campaignData.length === 0) {
      return { suggestions: [], summary: 'Sem dados de metricas nas campanhas ativas.' };
    }

    // Calcular médias do account para benchmarks
    const avgCTR = this._average(campaignData, (d) => d.metrics.ctr);
    const avgCPL = this._average(
      campaignData.filter((d) => d.metrics.costPerResult > 0),
      (d) => d.metrics.costPerResult
    );
    const cplTarget = options.cplTarget || avgCPL || 30;

    const suggestions = [];

    for (const { campaign, metrics } of campaignData) {
      const age = this._campaignAgeHours(campaign.createdTime);

      // Regra: dados insuficientes
      if (metrics.impressions < RULES.MIN_IMPRESSIONS || age < RULES.MIN_HOURS) {
        suggestions.push({
          type: 'wait',
          target: campaign.name,
          targetId: campaign.id,
          action: `Aguardar mais dados (${metrics.impressions} imp, ${Math.round(age)}h)`,
          reason: `Menos de ${RULES.MIN_IMPRESSIONS} impressoes ou ${RULES.MIN_HOURS}h de dados`,
          priority: 'low',
          metrics: { impressions: metrics.impressions, age: Math.round(age) },
        });
        continue;
      }

      // Regra: frequência crítica (> 4)
      if (metrics.frequency > RULES.CRITICAL_FREQUENCY) {
        suggestions.push({
          type: 'pause',
          target: campaign.name,
          targetId: campaign.id,
          action: `Pausar - frequencia critica (${metrics.frequency.toFixed(1)})`,
          reason: `Frequencia ${metrics.frequency.toFixed(1)} > ${RULES.CRITICAL_FREQUENCY}. Publico saturado.`,
          priority: 'high',
          metrics: { frequency: metrics.frequency, ctr: metrics.ctr },
        });
        continue;
      }

      // Regra: frequência alta + CTR baixo
      if (metrics.frequency > RULES.MAX_FREQUENCY && metrics.ctr < avgCTR * RULES.CTR_LOW_RATIO) {
        suggestions.push({
          type: 'pause',
          target: campaign.name,
          targetId: campaign.id,
          action: `Pausar - frequencia ${metrics.frequency.toFixed(1)} + CTR baixo (${metrics.ctr.toFixed(2)}%)`,
          reason: `Frequencia > ${RULES.MAX_FREQUENCY} e CTR abaixo de 50% da media (${avgCTR.toFixed(2)}%)`,
          priority: 'high',
          metrics: { frequency: metrics.frequency, ctr: metrics.ctr, avgCTR },
        });
        continue;
      }

      // Regra: CTR muito baixo (sem frequência alta)
      if (metrics.ctr < avgCTR * RULES.CTR_LOW_RATIO && metrics.impressions > 2000) {
        suggestions.push({
          type: 'pause',
          target: campaign.name,
          targetId: campaign.id,
          action: `Pausar - CTR muito baixo (${metrics.ctr.toFixed(2)}%)`,
          reason: `CTR ${metrics.ctr.toFixed(2)}% esta abaixo de 50% da media (${avgCTR.toFixed(2)}%)`,
          priority: 'medium',
          metrics: { ctr: metrics.ctr, avgCTR },
        });
        continue;
      }

      // Regra: CPL abaixo do target → escalar
      if (metrics.costPerResult > 0 && metrics.costPerResult < cplTarget * RULES.CPL_SCALE_THRESHOLD) {
        const currentBudget = campaign.budget?.daily || 0;
        const suggestedBudget = currentBudget > 0
          ? Math.round(currentBudget * (1 + RULES.MAX_SCALE_PCT) * 100) / 100
          : 0;

        suggestions.push({
          type: 'scale',
          target: campaign.name,
          targetId: campaign.id,
          action: currentBudget > 0
            ? `Escalar budget: R$ ${currentBudget.toFixed(2)} -> R$ ${suggestedBudget.toFixed(2)}`
            : `Escalar - CPL excelente (R$ ${metrics.costPerResult.toFixed(2)})`,
          reason: `CPL R$ ${metrics.costPerResult.toFixed(2)} esta abaixo de 80% do target (R$ ${cplTarget.toFixed(2)})`,
          priority: 'medium',
          metrics: { cpl: metrics.costPerResult, cplTarget, currentBudget, suggestedBudget },
        });
        continue;
      }

      // Regra: frequência subindo (entre 2.5 e 3) → alerta
      if (metrics.frequency > 2.5 && metrics.frequency <= RULES.MAX_FREQUENCY) {
        suggestions.push({
          type: 'alert',
          target: campaign.name,
          targetId: campaign.id,
          action: `Monitorar - frequencia subindo (${metrics.frequency.toFixed(1)})`,
          reason: `Frequencia ${metrics.frequency.toFixed(1)} se aproximando do limite (${RULES.MAX_FREQUENCY})`,
          priority: 'low',
          metrics: { frequency: metrics.frequency },
        });
      }
    }

    // Ordenar por prioridade
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const high = suggestions.filter((s) => s.priority === 'high').length;
    const medium = suggestions.filter((s) => s.priority === 'medium').length;
    const low = suggestions.filter((s) => s.priority === 'low').length;

    return {
      suggestions,
      summary: `${suggestions.length} sugestao(es): ${high} alta, ${medium} media, ${low} baixa prioridade`,
      benchmarks: { avgCTR, avgCPL, cplTarget },
    };
  }

  /**
   * Executa uma sugestão de otimização.
   * @param {Object} suggestion
   * @returns {Promise<{executed: boolean, message: string}>}
   */
  async execute(suggestion) {
    switch (suggestion.type) {
      case 'pause': {
        await this.adsManager.updateStatus('meta', suggestion.targetId, 'campaign', false);
        return { executed: true, message: `Campanha "${suggestion.target}" pausada.` };
      }
      case 'scale': {
        if (suggestion.metrics.suggestedBudget > 0) {
          const result = await this.adsManager.updateBudget(
            'meta', suggestion.targetId, 'campaign',
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
