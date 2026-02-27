/**
 * Análise inteligente de dados de CRM/Dashboard para o agente Celo.
 * Usa Groq LLaMA para análise de performance de campanhas.
 * Segue o padrão de account-analyzer.js.
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');
const MODEL = 'llama-3.3-70b-versatile';

// Regras de otimização do media-buyer.md
const OPTIMIZATION_RULES = `
REGRAS DE OTIMIZAÇÃO (aplicar rigorosamente):
1. PAUSAR criativo: Frequência > 3 E queda de CTR
2. ESCALAR conjunto: CPL abaixo da meta E boa taxa de qualificação no CRM
3. NOVOS TESTES: Sempre manter overlap de 48-72h com criativos ativos antes de pausar
4. JANELA DE ATRIBUIÇÃO: 7 dias clique + 1 dia visualização
5. DADOS MÍNIMOS: Nunca decidir com menos de 72h de dados OU menos de 1000 impressões
6. QUALIDADE > VOLUME: Priorizar campanhas que geram leads que avançam no funil, não apenas volume
7. PÚBLICO FRIO vs QUENTE: Separar budgets e métricas por temperatura de público
`;

function buildDashboardPrompt(context) {
  return `Você é Celo, Media Buyer Expert da agência Syra Digital. Especialista em gestão de tráfego pago focado em captação de leads qualificados.

Você analisa dados de CRM e plataformas de anúncio para tomar decisões baseadas em dados.

CLIENTE: ${context.clientName}
BUDGET MENSAL: R$ ${context.currentBudget?.toFixed(2) || '0.00'}
VERBA DE TESTES: ${((context.testingPct || 0.1) * 100).toFixed(0)}%

${OPTIMIZATION_RULES}

MÉTRICAS-CHAVE que você rastreia:
- CPL (Custo por Lead)
- CPA (Custo por Aquisição)
- ROAS (Return on Ad Spend)
- CTR (Click-Through Rate)
- Taxa de Qualificação (% de leads qualificados pelo comercial)
- Custo por Qualificado (CPL / Taxa de Qualificação)
- Frequência (média de vezes que o mesmo usuário viu o anúncio)

Responda SEMPRE em JSON válido com esta estrutura:
{
  "topCampaigns": [{"name": "string", "cpl": 0, "qualificationRate": 0, "costPerQualified": 0, "reason": "string"}],
  "bottomCampaigns": [{"name": "string", "reason": "string", "suggestedAction": "pausar|reduzir|testar"}],
  "budgetRecommendations": [{"campaign": "string", "action": "aumentar|reduzir|pausar|manter", "currentBudget": 0, "suggestedBudget": 0, "reason": "string"}],
  "creativeInsights": [{"creative": "string", "metric": "string", "recommendation": "string"}],
  "audienceInsights": [{"audience": "string", "metric": "string", "recommendation": "string"}],
  "summary": "Resumo executivo em 2-3 frases",
  "alerts": ["Alertas críticos que precisam de ação imediata"]
}

Se os dados forem insuficientes para uma análise completa, indique isso no summary e retorne arrays vazios nos campos sem dados.`;
}

function buildOptimizationPrompt() {
  return `Você é Celo, Media Buyer Expert da agência Syra Digital.

${OPTIMIZATION_RULES}

Com base nos dados fornecidos, gere sugestões de otimização ESPECÍFICAS e ACIONÁVEIS.

Responda em JSON válido:
{
  "suggestions": [
    {
      "type": "pause|scale|test|adjust",
      "target": "nome da campanha/conjunto/criativo",
      "action": "Ação específica a tomar",
      "reason": "Justificativa baseada em dados",
      "priority": "high|medium|low",
      "requiresApproval": true
    }
  ],
  "summary": "Resumo das otimizações sugeridas"
}`;
}

/**
 * Formata dados de planilha para texto legível para a AI.
 * @param {Object} data - { overview, leads, sales, campaigns, sheetNames }
 * @returns {string}
 */
function formatDataForAI(data) {
  const parts = [];

  if (data.sheetNames) {
    parts.push(`Abas disponíveis: ${data.sheetNames.join(', ')}`);
  }

  for (const [key, rows] of Object.entries(data)) {
    if (key === 'sheetNames' || !rows || !Array.isArray(rows)) continue;

    parts.push(`\n=== ${key.toUpperCase()} ===`);
    // Limitar a 50 linhas por seção para caber no contexto
    const limitedRows = rows.slice(0, 50);
    for (const row of limitedRows) {
      parts.push(row.join(' | '));
    }
    if (rows.length > 50) {
      parts.push(`... (${rows.length - 50} linhas adicionais)`);
    }
  }

  return parts.join('\n');
}

/**
 * Analisa dados de dashboard/CRM e retorna insights.
 * @param {Object} data - Dados do fetchDashboardData()
 * @param {Object} context - { clientName, currentBudget, testingPct }
 * @returns {Promise<Object>}
 */
async function analyzeDashboardData(data, context) {
  if (!GROQ_API_KEY) return fallbackAnalysis(data);

  const formattedData = formatDataForAI(data);
  if (!formattedData || formattedData.length < 20) {
    return {
      topCampaigns: [],
      bottomCampaigns: [],
      budgetRecommendations: [],
      creativeInsights: [],
      audienceInsights: [],
      summary: 'Dados insuficientes para análise. Verifique os ranges configurados na planilha.',
      alerts: [],
    };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: buildDashboardPrompt(context) },
          { role: 'user', content: `Analise os seguintes dados do CRM/Dashboard:\n\n${formattedData}` },
        ],
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Celo Analyzer: Groq API error ${response.status}: ${errText}`);
      return fallbackAnalysis(data);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) return fallbackAnalysis(data);

    const parsed = JSON.parse(content);
    return {
      topCampaigns: parsed.topCampaigns || [],
      bottomCampaigns: parsed.bottomCampaigns || [],
      budgetRecommendations: parsed.budgetRecommendations || [],
      creativeInsights: parsed.creativeInsights || [],
      audienceInsights: parsed.audienceInsights || [],
      summary: parsed.summary || 'Análise concluída.',
      alerts: parsed.alerts || [],
    };
  } catch (err) {
    console.warn('Celo Analyzer: AI analysis failed:', err.message);
    return fallbackAnalysis(data);
  }
}

/**
 * Gera sugestões de otimização baseadas nos dados.
 * @param {Object} data - Dados do fetchDashboardData()
 * @returns {Promise<Object>}
 */
async function generateOptimizationSuggestions(data) {
  if (!GROQ_API_KEY) {
    return { suggestions: [], summary: 'Groq API não configurada.' };
  }

  const formattedData = formatDataForAI(data);
  if (!formattedData || formattedData.length < 20) {
    return { suggestions: [], summary: 'Dados insuficientes para otimização.' };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: buildOptimizationPrompt() },
          { role: 'user', content: `Dados para otimização:\n\n${formattedData}` },
        ],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) return { suggestions: [], summary: 'Erro na API de análise.' };

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) return { suggestions: [], summary: 'Resposta vazia da IA.' };

    const parsed = JSON.parse(content);
    return {
      suggestions: parsed.suggestions || [],
      summary: parsed.summary || 'Otimização concluída.',
    };
  } catch (err) {
    console.warn('Celo Analyzer: optimization failed:', err.message);
    return { suggestions: [], summary: 'Erro ao gerar otimizações.' };
  }
}

function fallbackAnalysis(data) {
  const rowCount = Object.values(data)
    .filter((v) => Array.isArray(v))
    .reduce((sum, arr) => sum + arr.length, 0);

  return {
    topCampaigns: [],
    bottomCampaigns: [],
    budgetRecommendations: [],
    creativeInsights: [],
    audienceInsights: [],
    summary: `Fallback: ${rowCount} linhas de dados encontradas. Análise AI indisponível.`,
    alerts: [],
  };
}

module.exports = { analyzeDashboardData, generateOptimizationSuggestions };
