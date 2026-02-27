/**
 * AdTag Master - Sistema de nomenclatura padronizada para campanhas de mídia paga.
 * Baseado nas convenções do repositório adtag-master.
 * Funções puras sem dependências externas.
 */

// === Constantes ===

const CAMPAIGN_OBJECTIVES = [
  'Formulário Instantâneo', 'Tráfego', 'Conversão', 'Engajamento',
  'Alcance', 'Reconhecimento', 'Vídeo Views', 'Mensagens', 'Cadastro', 'Vendas',
];

const BUDGET_TYPES = ['CBO', 'ABO'];

const GENDERS = ['Homens', 'Mulheres', 'Todos'];

const PLACEMENTS = ['FB', 'IG', 'MSG', 'AN'];

const CREATIVE_FORMATS = [
  'Estático', 'Carrossel', 'Vídeo', 'Stories', 'Reels', 'Coleção',
];

const CTAS = [
  'Saiba Mais', 'Compre Agora', 'Cadastre-se', 'Fale Conosco',
  'Ver Mais', 'Baixar', 'Agendar', 'Visita ao Perfil',
];

// === Geração de Nomes ===

/**
 * Gera nome de campanha no padrão AdTag.
 * Formato: [Agência] {Nome} [{Objetivo}] [{CBO|ABO}]
 * @param {Object} params
 * @param {string} [params.agency='Syra']
 * @param {string} params.name - Nome da campanha
 * @param {string} [params.objective] - Objetivo da campanha
 * @param {string} [params.budgetType] - CBO ou ABO
 * @returns {string}
 */
function generateCampaignName({ agency = 'Syra', name, objective, budgetType }) {
  const parts = [`[${agency}]`];
  if (name) parts.push(name);
  if (objective) parts.push(`[${objective}]`);
  if (budgetType) parts.push(`[${budgetType}]`);
  return parts.join(' ');
}

/**
 * Gera nome de conjunto/público no padrão AdTag.
 * Formato: P{N} [{Gênero}] [{IdadeMin}-{IdadeMax}] [{Posicionamentos}] [Int: {Interesse}] [PP: {Público Personalizado}] [{Localização}]
 * @param {Object} params
 * @param {number} params.number - Número do público (P1, P2...)
 * @param {string} [params.gender]
 * @param {number} [params.ageMin]
 * @param {number} [params.ageMax]
 * @param {string[]} [params.placements] - ['FB', 'IG', ...]
 * @param {string} [params.interest]
 * @param {string} [params.customAudience] - Público personalizado
 * @param {string} [params.location]
 * @returns {string}
 */
function generateAudienceName({ number, gender, ageMin, ageMax, placements, interest, customAudience, location }) {
  const parts = [`P${number}`];
  if (gender) parts.push(`[${gender}]`);
  if (ageMin != null && ageMax != null) parts.push(`[${ageMin}-${ageMax}]`);
  if (placements && placements.length > 0) parts.push(`[${placements.join('+')}]`);
  if (interest) parts.push(`[Int: ${interest}]`);
  if (customAudience) parts.push(`[PP: ${customAudience}]`);
  if (location) parts.push(`[${location}]`);
  return parts.join(' ');
}

/**
 * Gera nome de criativo no padrão AdTag.
 * Formato: C{N} [{Formato}] [Hook: {Gancho}] [CTA: {Call to Action}]
 * @param {Object} params
 * @param {number} params.number - Número do criativo (C1, C2...)
 * @param {string} [params.format]
 * @param {string} [params.hook]
 * @param {string} [params.cta]
 * @returns {string}
 */
function generateCreativeName({ number, format, hook, cta }) {
  const parts = [`C${number}`];
  if (format) parts.push(`[${format}]`);
  if (hook) parts.push(`[Hook: ${hook}]`);
  if (cta) parts.push(`[CTA: ${cta}]`);
  return parts.join(' ');
}

// === Parsing (Reverse) ===

/**
 * Extrai componentes de um nome de campanha.
 * @param {string} name
 * @returns {{ agency: string|null, name: string|null, objective: string|null, budgetType: string|null }}
 */
function parseCampaignName(name) {
  const result = { agency: null, name: null, objective: null, budgetType: null };
  if (!name) return result;

  // Extrair todos os blocos [...]
  const brackets = [];
  const regex = /\[([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(name)) !== null) {
    brackets.push({ value: match[1], start: match.index, end: match.index + match[0].length });
  }

  if (brackets.length === 0) {
    result.name = name.trim();
    return result;
  }

  // Primeiro bracket = agência
  result.agency = brackets[0].value;

  // Último bracket = budgetType se for CBO/ABO
  const lastBracket = brackets[brackets.length - 1];
  if (BUDGET_TYPES.includes(lastBracket.value)) {
    result.budgetType = lastBracket.value;
  }

  // Penúltimo (ou último se não tem budgetType) = objective
  const objIndex = result.budgetType ? brackets.length - 2 : brackets.length - 1;
  if (objIndex > 0) {
    const candidate = brackets[objIndex].value;
    if (CAMPAIGN_OBJECTIVES.includes(candidate)) {
      result.objective = candidate;
    }
  }

  // Nome = tudo entre a agência e o próximo bracket significativo
  const nameStart = brackets[0].end;
  const nameEndBracket = brackets.find((b, i) => i > 0 && (b.value === result.objective || b.value === result.budgetType));
  const nameEnd = nameEndBracket ? nameEndBracket.start : name.length;
  const namePart = name.substring(nameStart, nameEnd).trim();
  if (namePart) result.name = namePart;

  return result;
}

/**
 * Extrai componentes de um nome de público/conjunto.
 * @param {string} name
 * @returns {{ number: number|null, gender: string|null, ageMin: number|null, ageMax: number|null, placements: string[]|null, interest: string|null, customAudience: string|null, location: string|null }}
 */
function parseAudienceName(name) {
  const result = { number: null, gender: null, ageMin: null, ageMax: null, placements: null, interest: null, customAudience: null, location: null };
  if (!name) return result;

  // P{N}
  const numMatch = name.match(/^P(\d+)/);
  if (numMatch) result.number = parseInt(numMatch[1], 10);

  // Extrair brackets
  const brackets = [];
  const regex = /\[([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(name)) !== null) {
    brackets.push(match[1]);
  }

  for (const val of brackets) {
    if (val.startsWith('Int: ')) {
      result.interest = val.substring(5);
    } else if (val.startsWith('PP: ')) {
      result.customAudience = val.substring(4);
    } else if (GENDERS.includes(val)) {
      result.gender = val;
    } else if (/^\d+-\d+$/.test(val)) {
      const [min, max] = val.split('-').map(Number);
      result.ageMin = min;
      result.ageMax = max;
    } else if (/^(FB|IG|MSG|AN)(\+(FB|IG|MSG|AN))*$/.test(val)) {
      result.placements = val.split('+');
    } else {
      // Qualquer outro bracket restante = localização
      result.location = val;
    }
  }

  return result;
}

/**
 * Extrai componentes de um nome de criativo.
 * @param {string} name
 * @returns {{ number: number|null, format: string|null, hook: string|null, cta: string|null }}
 */
function parseCreativeName(name) {
  const result = { number: null, format: null, hook: null, cta: null };
  if (!name) return result;

  const numMatch = name.match(/^C(\d+)/);
  if (numMatch) result.number = parseInt(numMatch[1], 10);

  const brackets = [];
  const regex = /\[([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(name)) !== null) {
    brackets.push(match[1]);
  }

  for (const val of brackets) {
    if (val.startsWith('Hook: ')) {
      result.hook = val.substring(6);
    } else if (val.startsWith('CTA: ')) {
      result.cta = val.substring(5);
    } else if (CREATIVE_FORMATS.includes(val)) {
      result.format = val;
    }
  }

  return result;
}

// === Validação ===

/**
 * Valida um nome contra as convenções AdTag.
 * @param {string} name
 * @param {'campaign'|'audience'|'creative'} type
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateName(name, type) {
  const errors = [];
  if (!name || typeof name !== 'string') {
    return { valid: false, errors: ['Nome é obrigatório'] };
  }

  switch (type) {
    case 'campaign': {
      const parsed = parseCampaignName(name);
      if (!parsed.agency) errors.push('Falta agência [Agência]');
      if (!parsed.name) errors.push('Falta nome da campanha');
      if (!parsed.objective) errors.push('Falta objetivo [Objetivo]');
      else if (!CAMPAIGN_OBJECTIVES.includes(parsed.objective))
        errors.push(`Objetivo inválido: "${parsed.objective}". Válidos: ${CAMPAIGN_OBJECTIVES.join(', ')}`);
      if (!parsed.budgetType) errors.push('Falta tipo de orçamento [CBO|ABO]');
      else if (!BUDGET_TYPES.includes(parsed.budgetType))
        errors.push(`Tipo de orçamento inválido: "${parsed.budgetType}". Válidos: CBO, ABO`);
      break;
    }
    case 'audience': {
      const parsed = parseAudienceName(name);
      if (parsed.number == null) errors.push('Falta número do público (P1, P2...)');
      if (!parsed.gender) errors.push('Falta gênero [Homens|Mulheres|Todos]');
      if (parsed.ageMin == null || parsed.ageMax == null) errors.push('Falta faixa etária [Min-Max]');
      if (parsed.placements) {
        const invalid = parsed.placements.filter((p) => !PLACEMENTS.includes(p));
        if (invalid.length > 0) errors.push(`Posicionamentos inválidos: ${invalid.join(', ')}`);
      }
      break;
    }
    case 'creative': {
      const parsed = parseCreativeName(name);
      if (parsed.number == null) errors.push('Falta número do criativo (C1, C2...)');
      if (!parsed.format) errors.push('Falta formato [Estático|Carrossel|Vídeo|...]');
      else if (!CREATIVE_FORMATS.includes(parsed.format))
        errors.push(`Formato inválido: "${parsed.format}". Válidos: ${CREATIVE_FORMATS.join(', ')}`);
      if (parsed.cta && !CTAS.includes(parsed.cta))
        errors.push(`CTA inválido: "${parsed.cta}". Válidos: ${CTAS.join(', ')}`);
      break;
    }
    default:
      errors.push(`Tipo inválido: "${type}". Use: campaign, audience, creative`);
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  // Constantes
  CAMPAIGN_OBJECTIVES,
  BUDGET_TYPES,
  GENDERS,
  PLACEMENTS,
  CREATIVE_FORMATS,
  CTAS,
  // Geração
  generateCampaignName,
  generateAudienceName,
  generateCreativeName,
  // Parsing
  parseCampaignName,
  parseAudienceName,
  parseCreativeName,
  // Validação
  validateName,
};
