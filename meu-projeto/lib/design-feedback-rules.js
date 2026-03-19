// meu-projeto/lib/design-feedback-rules.js
// Sistema Persistente de Feedback → Regras de Design
// Captura feedback do Eric e transforma em regras permanentes
// que são aplicadas automaticamente em todas as gerações futuras.

const fs = require('fs');
const path = require('path');

const RULES_FILE = path.resolve(__dirname, '../design-feedback-rules.json');

// Estrutura padrão do arquivo de regras
const DEFAULT_RULES = {
  meta: {
    version: 1,
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    totalRules: 0,
    description: 'Regras extraídas de feedback real do Eric. Aplicadas automaticamente em toda geração.',
  },
  rules: {
    typography: [],
    composition: [],
    effects: [],
    colors: [],
    photos: [],
    copy: [],
    general: [],
  },
  overrides: {},
};

// ============================================================
// Core Functions
// ============================================================

function loadRules() {
  try {
    if (!fs.existsSync(RULES_FILE)) {
      saveRules(DEFAULT_RULES);
      return DEFAULT_RULES;
    }
    const data = JSON.parse(fs.readFileSync(RULES_FILE, 'utf-8'));
    return data;
  } catch (e) {
    console.error('[FEEDBACK-RULES] Erro ao carregar regras:', e.message);
    return DEFAULT_RULES;
  }
}

function saveRules(data) {
  data.meta.lastUpdated = new Date().toISOString();
  data.meta.totalRules = Object.values(data.rules)
    .reduce((sum, arr) => sum + arr.length, 0);
  fs.writeFileSync(RULES_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Adiciona uma regra de feedback permanente.
 *
 * @param {string} category - typography|composition|effects|colors|photos|copy|general
 * @param {string} rule - Descrição da regra (ex: "headline nunca maior que 3 palavras")
 * @param {string} severity - CRITICAL|HIGH|MEDIUM
 * @param {object} [override] - Override técnico opcional (ex: { key: 'glowOpacity', value: 0.4 })
 * @returns {object} A regra criada
 */
function addRule(category, rule, severity = 'HIGH', override = null) {
  const data = loadRules();

  if (!data.rules[category]) {
    data.rules[category] = [];
  }

  // Verificar duplicata
  const exists = data.rules[category].some(
    r => r.rule.toLowerCase() === rule.toLowerCase()
  );
  if (exists) {
    console.log(`[FEEDBACK-RULES] Regra já existe em ${category}: "${rule}"`);
    return null;
  }

  const newRule = {
    id: `${category}-${Date.now()}`,
    rule,
    severity,
    addedAt: new Date().toISOString(),
    source: 'eric-feedback',
  };

  data.rules[category].push(newRule);

  // Se tem override técnico, salvar
  if (override) {
    data.overrides[newRule.id] = override;
  }

  saveRules(data);
  console.log(`[FEEDBACK-RULES] ✅ Regra adicionada em ${category}: "${rule}" (${severity})`);
  return newRule;
}

/**
 * Remove uma regra pelo ID.
 */
function removeRule(ruleId) {
  const data = loadRules();
  for (const category of Object.keys(data.rules)) {
    const idx = data.rules[category].findIndex(r => r.id === ruleId);
    if (idx !== -1) {
      data.rules[category].splice(idx, 1);
      delete data.overrides[ruleId];
      saveRules(data);
      console.log(`[FEEDBACK-RULES] Regra removida: ${ruleId}`);
      return true;
    }
  }
  return false;
}

/**
 * Retorna todas as regras formatadas para injeção em prompt de crítica/geração.
 * Organizado por severidade (CRITICAL primeiro).
 */
function getRulesForPrompt() {
  const data = loadRules();
  const allRules = [];

  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };

  for (const [category, rules] of Object.entries(data.rules)) {
    for (const r of rules) {
      allRules.push({ ...r, category });
    }
  }

  if (allRules.length === 0) return '';

  allRules.sort((a, b) =>
    (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3)
  );

  let prompt = '\n\n## REGRAS DE FEEDBACK DO ERIC (OBRIGATÓRIAS)\n';
  prompt += 'Estas regras foram extraídas de feedback real. Violá-las é PROIBIDO.\n\n';

  for (const r of allRules) {
    const icon = r.severity === 'CRITICAL' ? '🚫' : r.severity === 'HIGH' ? '⚠️' : 'ℹ️';
    prompt += `${icon} [${r.severity}] [${r.category}] ${r.rule}\n`;
  }

  return prompt;
}

/**
 * Retorna overrides técnicos para aplicar no pipeline de geração.
 */
function getOverrides() {
  const data = loadRules();
  const overrides = {};

  for (const [ruleId, override] of Object.entries(data.overrides)) {
    overrides[override.key] = override.value;
  }

  return overrides;
}

/**
 * Retorna regras de uma categoria específica.
 */
function getRulesByCategory(category) {
  const data = loadRules();
  return data.rules[category] || [];
}

/**
 * Retorna resumo das regras para debug/display.
 */
function getSummary() {
  const data = loadRules();
  const summary = {};
  for (const [cat, rules] of Object.entries(data.rules)) {
    if (rules.length > 0) {
      summary[cat] = rules.length;
    }
  }
  return {
    total: data.meta.totalRules,
    lastUpdated: data.meta.lastUpdated,
    byCategory: summary,
  };
}

/**
 * Extrai regra de feedback em linguagem natural usando análise simples.
 * Usado quando o Eric dá feedback durante uma sessão.
 *
 * @param {string} feedback - Texto do feedback do Eric
 * @returns {object} { category, rule, severity }
 */
function parseFeedback(feedback) {
  const lower = feedback.toLowerCase();

  // Detectar categoria
  let category = 'general';
  if (/font|texto|letra|tipograf|headline|subtit|cta|título|legí/i.test(lower)) {
    category = 'typography';
  } else if (/layout|composiç|alinha|espaço|respir|marg|posiç|centr/i.test(lower)) {
    category = 'composition';
  } else if (/glow|grain|vinhet|efeito|smoke|bokeh|rim|blur|neon/i.test(lower)) {
    category = 'effects';
  } else if (/cor|color|paleta|contraste|accent|escur|clar|branco|preto/i.test(lower)) {
    category = 'colors';
  } else if (/foto|imagem|recort|crop|pessoa|rosto|face|fundo/i.test(lower)) {
    category = 'photos';
  } else if (/copy|frase|hook|cta|texto.*genéric|voz|tom/i.test(lower)) {
    category = 'copy';
  }

  // Detectar severidade
  let severity = 'HIGH';
  if (/nunca|jamais|proibid|crítico|sempre|obrigatór/i.test(lower)) {
    severity = 'CRITICAL';
  } else if (/talvez|pode|prefer|ideal/i.test(lower)) {
    severity = 'MEDIUM';
  }

  return { category, rule: feedback.trim(), severity };
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  loadRules,
  addRule,
  removeRule,
  getRulesForPrompt,
  getOverrides,
  getRulesByCategory,
  getSummary,
  parseFeedback,
  RULES_FILE,
};
