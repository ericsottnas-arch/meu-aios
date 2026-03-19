// meu-projeto/lib/iris-lead-scorer.js
// Sistema de Lead Scoring (0-100) para priorizacao de prospects
// Iris v3: Hot / Warm / Cold tiers

const irisDB = require('./iris-db');

const SCORE_WEIGHTS = {
  inboundMessages: 25,   // +5 por msg inbound (max 25)
  responseTime: 20,      // Responde rapido = score alto
  stageAdvanced: 20,     // rapport=15, proposta=18, agendamento=20
  doresIdentified: 15,   // Cada dor identificada +5 (max 15)
  interesse: 10,         // alto=10, medio=5, baixo=0
  pediuWhatsapp: 10,     // Sinal forte de interesse
};

const STAGE_SCORES = {
  aquecimento: 5,
  qualificacao: 10,
  rapport: 15,
  proposta_reuniao: 18,
  agendamento: 20,
  followup: 3,
  objecoes: 12,
};

const INTERESSE_SCORES = {
  alto: 10,
  medio: 5,
  baixo: 0,
  indefinido: 2,
};

/**
 * Calcula score de um prospect (0-100)
 * @param {Object} prospect - Dados do prospect (iris_prospects)
 * @param {Object} profile - Perfil do lead (iris_lead_profiles)
 * @param {Array} messages - Historico de mensagens (iris_messages)
 * @returns {{ score: number, tier: string, factors: Object }}
 */
function scoreProspect(prospect, profile, messages) {
  const factors = {};
  let totalScore = 0;

  // 1. Mensagens inbound (+5 por msg, max 25)
  const inboundCount = messages.filter((m) => m.direction === 'inbound').length;
  factors.inboundMessages = Math.min(inboundCount * 5, SCORE_WEIGHTS.inboundMessages);
  totalScore += factors.inboundMessages;

  // 2. Tempo de resposta (se responde rapido)
  factors.responseTime = calculateResponseTimeScore(prospect, messages);
  totalScore += factors.responseTime;

  // 3. Stage avancada
  factors.stageAdvanced = STAGE_SCORES[prospect.current_stage] || 0;
  totalScore += factors.stageAdvanced;

  // 4. Dores identificadas (+5 por dor, max 15)
  const dores = profile?.dores || [];
  factors.doresIdentified = Math.min(dores.length * 5, SCORE_WEIGHTS.doresIdentified);
  totalScore += factors.doresIdentified;

  // 5. Nivel de interesse
  const interesse = profile?.nivel_interesse || 'indefinido';
  factors.interesse = INTERESSE_SCORES[interesse] || 0;
  totalScore += factors.interesse;

  // 6. Pediu WhatsApp
  factors.pediuWhatsapp = profile?.pediu_whatsapp ? SCORE_WEIGHTS.pediuWhatsapp : 0;
  totalScore += factors.pediuWhatsapp;

  // Clamp 0-100
  totalScore = Math.min(Math.max(totalScore, 0), 100);

  const tier = getTier(totalScore);

  return { score: totalScore, tier, factors };
}

/**
 * Calcula score baseado no tempo de resposta
 */
function calculateResponseTimeScore(prospect, messages) {
  if (!prospect.last_inbound_at || !prospect.last_outbound_at) return 5;

  // Calcular tempo medio de resposta do lead
  let totalResponseTime = 0;
  let responseCount = 0;

  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];

    // Lead respondeu apos mensagem outbound
    if (prev.direction === 'outbound' && curr.direction === 'inbound') {
      const prevTime = new Date(prev.created_at).getTime();
      const currTime = new Date(curr.created_at).getTime();
      const diff = currTime - prevTime;
      if (diff > 0 && diff < 7 * 24 * 60 * 60 * 1000) {
        totalResponseTime += diff;
        responseCount++;
      }
    }
  }

  if (responseCount === 0) return 5;

  const avgResponseMs = totalResponseTime / responseCount;
  const avgResponseHours = avgResponseMs / (1000 * 60 * 60);

  // Score: <1h = 20, <6h = 15, <24h = 10, <72h = 5, >72h = 0
  if (avgResponseHours < 1) return 20;
  if (avgResponseHours < 6) return 15;
  if (avgResponseHours < 24) return 10;
  if (avgResponseHours < 72) return 5;
  return 0;
}

/**
 * Determina tier baseado no score
 */
function getTier(score) {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

/**
 * Retorna emoji do tier
 */
function getTierEmoji(tier) {
  const emojis = { hot: '🔥', warm: '🟡', cold: '🔵' };
  return emojis[tier] || '⚪';
}

/**
 * Busca e pontua todos os prospects ativos
 * @returns {Array<{ prospect, profile, score, tier, factors }>}
 */
function scoreAllProspects() {
  const prospects = irisDB.getActiveProspects();
  const scored = [];

  for (const prospect of prospects) {
    const profile = irisDB.getLeadProfile(prospect.conversation_id);
    const messages = irisDB.getMessageHistory(prospect.conversation_id, 50);
    const { score, tier, factors } = scoreProspect(prospect, profile, messages);

    scored.push({
      conversationId: prospect.conversation_id,
      contactName: prospect.contact_name,
      currentStage: prospect.current_stage,
      score,
      tier,
      factors,
      lastInbound: prospect.last_inbound_at,
      lastOutbound: prospect.last_outbound_at,
      messageCount: prospect.message_count,
      profile,
    });
  }

  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Retorna leads quentes (score > 60)
 */
function getHotLeads() {
  return scoreAllProspects().filter((l) => l.score > 60);
}

/**
 * Retorna leads frios (score < 30 e >7 dias sem resposta)
 */
function getColdLeads() {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return scoreAllProspects().filter((l) => {
    if (l.score >= 30) return false;
    if (!l.lastOutbound) return false;
    const lastOutbound = new Date(l.lastOutbound).getTime();
    const lastInbound = l.lastInbound ? new Date(l.lastInbound).getTime() : 0;
    return (now - lastOutbound > sevenDays) && (lastInbound < lastOutbound);
  });
}

/**
 * Retorna leads que precisam de followup com nivel de urgencia
 */
function getFollowupPriorities() {
  const scored = scoreAllProspects();
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const threeDays = 3 * oneDay;
  const sevenDays = 7 * oneDay;

  const priorities = [];

  for (const lead of scored) {
    if (!lead.lastOutbound) continue;
    const lastOutbound = new Date(lead.lastOutbound).getTime();
    const lastInbound = lead.lastInbound ? new Date(lead.lastInbound).getTime() : 0;

    // So precisa de followup se ultima msg foi outbound e lead nao respondeu
    if (lastInbound >= lastOutbound) continue;

    const silenceMs = now - lastOutbound;
    const silenceDays = Math.floor(silenceMs / oneDay);

    if (silenceMs < oneDay) continue;

    let urgency = 'low';
    let action = 'wait';

    if (lead.tier === 'hot' && silenceMs > oneDay) {
      urgency = 'high';
      action = 'auto_followup';
    } else if (lead.tier === 'warm' && silenceMs > threeDays) {
      urgency = 'medium';
      action = 'approval_followup';
    } else if (lead.tier === 'cold' && silenceMs > sevenDays) {
      urgency = 'low';
      action = 'last_attempt';
    } else {
      continue;
    }

    priorities.push({
      ...lead,
      silenceDays,
      urgency,
      action,
    });
  }

  return priorities.sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    return (urgencyOrder[a.urgency] || 3) - (urgencyOrder[b.urgency] || 3);
  });
}

module.exports = {
  scoreProspect,
  scoreAllProspects,
  getHotLeads,
  getColdLeads,
  getFollowupPriorities,
  getTierEmoji,
  getTier,
};
