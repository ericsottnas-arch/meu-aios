/**
 * Campaign Creation Wizard - State machine multi-step para criação de campanhas via Telegram.
 * Usa adtag-naming.js para gerar nomes padronizados.
 *
 * Fluxo completo:
 *   1. client → 2. name → 3. objective → 4. budgetType → 5. dailyBudget
 *   → 6. gender → 7. ageRange → 8. placements → 9. interest → 10. confirm
 *
 * Após confirmação: cria Campanha + AdSet no Meta Ads API.
 */

const naming = require('./adtag-naming');

// Sessões ativas por chatId
const _sessions = new Map();

// Expira em 20 minutos (aumentado de 15 para acomodar mais steps)
const SESSION_TTL = 20 * 60 * 1000;

// Steps do wizard (completo com targeting)
const STEPS = [
  'client', 'name', 'objective', 'budgetType', 'dailyBudget',
  'gender', 'ageRange', 'placements', 'interest',
  'confirm',
];

// Presets de faixa etária por nicho
const AGE_PRESETS = [
  { label: '25-55 (Geral)', value: '25-55' },
  { label: '30-60 (Médicos)', value: '30-60' },
  { label: '25-45 (Estética)', value: '25-45' },
  { label: '18-35 (Jovem)', value: '18-35' },
  { label: '35-65+ (Maduro)', value: '35-65' },
];

// Placement combos
const PLACEMENT_PRESETS = [
  { label: 'FB + IG (Recomendado)', value: ['FB', 'IG'] },
  { label: 'Só Instagram', value: ['IG'] },
  { label: 'Só Facebook', value: ['FB'] },
  { label: 'FB + IG + MSG', value: ['FB', 'IG', 'MSG'] },
  { label: 'Todas', value: ['FB', 'IG', 'MSG', 'AN'] },
];

/**
 * Cria nova sessão do wizard.
 * @param {number} chatId
 * @param {Array} clients - Lista de clientes disponíveis
 * @returns {Object} session
 */
function createSession(chatId, clients) {
  const session = {
    chatId,
    step: clients.length === 1 ? 'name' : 'client',
    clientId: clients.length === 1 ? clients[0].id : null,
    clientName: clients.length === 1 ? clients[0].name : null,
    data: {
      name: null,
      objective: null,
      budgetType: null,
      dailyBudget: null,
      // Targeting (AdSet)
      gender: null,      // 'Todos' | 'Homens' | 'Mulheres'
      ageRange: null,     // '25-55'
      placements: null,   // ['FB', 'IG']
      interest: null,     // texto livre ou 'Sem interesse'
    },
    clients,
    createdAt: Date.now(),
  };
  _sessions.set(chatId, session);
  return session;
}

/**
 * Retorna sessão ativa.
 * @param {number} chatId
 * @returns {Object|null}
 */
function getSession(chatId) {
  const session = _sessions.get(chatId);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL) {
    _sessions.delete(chatId);
    return null;
  }
  return session;
}

/**
 * Remove sessão.
 */
function deleteSession(chatId) {
  _sessions.delete(chatId);
}

/**
 * Avança para o próximo step.
 * @param {number} chatId
 * @returns {string} novo step
 */
function nextStep(chatId) {
  const session = getSession(chatId);
  if (!session) return null;
  const idx = STEPS.indexOf(session.step);
  if (idx < STEPS.length - 1) {
    session.step = STEPS[idx + 1];
  }
  return session.step;
}

/**
 * Define valor no step atual e avança.
 * @param {number} chatId
 * @param {string} key
 * @param {*} value
 */
function setStepValue(chatId, key, value) {
  const session = getSession(chatId);
  if (!session) return null;
  if (key === 'clientId') {
    session.clientId = value;
    session.clientName = session.clients.find((c) => c.id === value)?.name || value;
  } else {
    session.data[key] = value;
  }
  return nextStep(chatId);
}

/**
 * Gera nome AdTag da campanha com os dados coletados.
 * @param {Object} session
 * @returns {string}
 */
function generateAdTagName(session) {
  return naming.generateCampaignName({
    agency: 'Syra',
    name: session.data.name,
    objective: session.data.objective,
    budgetType: session.data.budgetType,
  });
}

/**
 * Gera nome AdTag do conjunto de anúncios.
 * @param {Object} session
 * @returns {string}
 */
function generateAdSetName(session) {
  const age = session.data.ageRange || '25-55';
  const [ageMin, ageMax] = age.split('-').map(Number);
  return naming.generateAudienceName({
    number: 1,
    gender: session.data.gender || 'Todos',
    ageMin,
    ageMax,
    placements: session.data.placements || ['FB', 'IG'],
    interest: session.data.interest !== 'Sem interesse' ? session.data.interest : undefined,
  });
}

/**
 * Converte dados de targeting do wizard para formato Meta Ads API.
 * @param {Object} session
 * @returns {Object} targeting object
 */
function buildTargeting(session) {
  const age = session.data.ageRange || '25-55';
  const [ageMin, ageMax] = age.split('-').map(Number);

  const targeting = {
    age_min: ageMin || 25,
    age_max: ageMax || 55,
    geo_locations: {
      countries: ['BR'],
    },
  };

  // Gender: 0=All, 1=Men, 2=Women
  if (session.data.gender === 'Homens') {
    targeting.genders = [1];
  } else if (session.data.gender === 'Mulheres') {
    targeting.genders = [2];
  }

  // Placements → publisher_platforms
  const platMap = { 'FB': 'facebook', 'IG': 'instagram', 'MSG': 'messenger', 'AN': 'audience_network' };
  if (session.data.placements?.length > 0) {
    targeting.publisher_platforms = session.data.placements
      .map(p => platMap[p])
      .filter(Boolean);
  }

  // Interest targeting (flexible spec)
  if (session.data.interest && session.data.interest !== 'Sem interesse') {
    targeting.flexible_spec = [{
      interests: [{ name: session.data.interest }],
    }];
  }

  return targeting;
}

/**
 * Gera mensagem de preview para confirmação.
 * @param {Object} session
 * @returns {string}
 */
function generatePreview(session) {
  const campaignName = generateAdTagName(session);
  const adsetName = generateAdSetName(session);
  const age = session.data.ageRange || '25-55';
  const placements = (session.data.placements || ['FB', 'IG']).join('+');

  return [
    'Confirmar criacao:\n',
    'CAMPANHA:',
    `  Nome: ${campaignName}`,
    `  Objetivo: ${session.data.objective}`,
    `  Budget: ${session.data.budgetType} | R$ ${session.data.dailyBudget.toFixed(2)}/dia`,
    '',
    'CONJUNTO DE ANUNCIOS:',
    `  Nome: ${adsetName}`,
    `  Genero: ${session.data.gender || 'Todos'}`,
    `  Idade: ${age}`,
    `  Plataformas: ${placements}`,
    `  Interesse: ${session.data.interest || '--'}`,
    '',
    `Cliente: ${session.clientName}`,
    `Status: PAUSED`,
    '\nConfirma?',
  ].join('\n');
}

/**
 * Retorna os dados finais para criar a campanha + adset.
 * @param {Object} session
 * @returns {Object}
 */
function getFinalData(session) {
  return {
    clientId: session.clientId,
    campaign: {
      name: generateAdTagName(session),
      objective: session.data.objective,
      dailyBudget: session.data.dailyBudget,
      budgetType: session.data.budgetType,
    },
    adset: {
      name: generateAdSetName(session),
      dailyBudget: session.data.budgetType === 'ABO' ? session.data.dailyBudget : undefined,
      targeting: buildTargeting(session),
    },
  };
}

/**
 * Gera keyboard para o step atual.
 * @param {Object} session
 * @returns {{ text: string, keyboard: Array|null }}
 */
function getStepPrompt(session) {
  switch (session.step) {
    case 'client': {
      return {
        text: 'Selecione o cliente:',
        keyboard: session.clients.map((c) => [
          { text: c.name, callback_data: `wiz:client:${c.id}` },
        ]),
      };
    }
    case 'name': {
      return {
        text: `Cliente: ${session.clientName}\n\nDigite o nome da campanha:\n(Ex: Dr Erico - Implantes)`,
        keyboard: null,
      };
    }
    case 'objective': {
      const rows = [];
      for (let i = 0; i < naming.CAMPAIGN_OBJECTIVES.length; i += 2) {
        const row = [{ text: naming.CAMPAIGN_OBJECTIVES[i], callback_data: `wiz:obj:${i}` }];
        if (naming.CAMPAIGN_OBJECTIVES[i + 1]) {
          row.push({ text: naming.CAMPAIGN_OBJECTIVES[i + 1], callback_data: `wiz:obj:${i + 1}` });
        }
        rows.push(row);
      }
      return {
        text: 'Selecione o objetivo:',
        keyboard: rows,
      };
    }
    case 'budgetType': {
      return {
        text: 'Tipo de orcamento:',
        keyboard: [[
          { text: 'CBO (Campaign Budget)', callback_data: 'wiz:budget:CBO' },
          { text: 'ABO (AdSet Budget)', callback_data: 'wiz:budget:ABO' },
        ]],
      };
    }
    case 'dailyBudget': {
      return {
        text: 'Digite o budget diario (em R$):\n(Ex: 50.00)',
        keyboard: [
          [
            { text: 'R$ 20', callback_data: 'wiz:amount:20' },
            { text: 'R$ 50', callback_data: 'wiz:amount:50' },
            { text: 'R$ 100', callback_data: 'wiz:amount:100' },
          ],
          [
            { text: 'R$ 150', callback_data: 'wiz:amount:150' },
            { text: 'R$ 200', callback_data: 'wiz:amount:200' },
            { text: 'R$ 500', callback_data: 'wiz:amount:500' },
          ],
        ],
      };
    }

    // === Targeting Steps ===

    case 'gender': {
      return {
        text: 'AUDIENCIA - Genero do publico:',
        keyboard: [[
          { text: 'Todos', callback_data: 'wiz:gender:Todos' },
          { text: 'Mulheres', callback_data: 'wiz:gender:Mulheres' },
          { text: 'Homens', callback_data: 'wiz:gender:Homens' },
        ]],
      };
    }
    case 'ageRange': {
      return {
        text: 'Faixa etaria:',
        keyboard: AGE_PRESETS.map((p) => [
          { text: p.label, callback_data: `wiz:age:${p.value}` },
        ]),
      };
    }
    case 'placements': {
      return {
        text: 'Plataformas de veiculacao:',
        keyboard: PLACEMENT_PRESETS.map((p) => [
          { text: p.label, callback_data: `wiz:plat:${p.value.join('+')}` },
        ]),
      };
    }
    case 'interest': {
      return {
        text: 'Interesse principal da audiencia:\n(Digite o interesse ou selecione)',
        keyboard: [
          [{ text: 'Sem interesse especifico', callback_data: 'wiz:interest:Sem interesse' }],
          [
            { text: 'Implante Dentario', callback_data: 'wiz:interest:Implante Dentario' },
            { text: 'Estetica', callback_data: 'wiz:interest:Estetica' },
          ],
          [
            { text: 'Cirurgia Plastica', callback_data: 'wiz:interest:Cirurgia Plastica' },
            { text: 'Odontologia', callback_data: 'wiz:interest:Odontologia' },
          ],
          [
            { text: 'Saude e Bem-estar', callback_data: 'wiz:interest:Saude e Bem-estar' },
            { text: 'Beleza', callback_data: 'wiz:interest:Beleza' },
          ],
        ],
      };
    }

    case 'confirm': {
      return {
        text: generatePreview(session),
        keyboard: [[
          { text: 'Criar campanha + adset', callback_data: 'wiz:confirm:yes' },
          { text: 'Cancelar', callback_data: 'wiz:confirm:no' },
        ]],
      };
    }
    default:
      return { text: 'Erro no wizard.', keyboard: null };
  }
}

// Auto-cleanup de sessões expiradas
setInterval(() => {
  const now = Date.now();
  for (const [chatId, session] of _sessions) {
    if (now - session.createdAt > SESSION_TTL) {
      _sessions.delete(chatId);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  createSession,
  getSession,
  deleteSession,
  setStepValue,
  getStepPrompt,
  getFinalData,
  generateAdTagName,
  generateAdSetName,
  buildTargeting,
  STEPS,
  AGE_PRESETS,
  PLACEMENT_PRESETS,
};
