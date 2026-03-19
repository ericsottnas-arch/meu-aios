// meu-projeto/lib/lead-scorer.js
// Lead Scoring System — 6 dimensões redesenhadas (0-100)
// D1: Resultado (30) | D2: Engajamento (25) | D3: Velocidade (15)
// D4: Recência (15)  | D5: Qualidade Campanha (10) | D6: Atribuição (5)
'use strict';

const ghlDb = require('./ghl-analytics-db');
const ghlConvDb = require('./ghl-db');
const adsDb = require('./ads-db');

// ============================================================
// Phone normalization — strips to digits only
// ============================================================
function _normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/\D/g, '');
}

// ============================================================
// D1: Resultado no Pipeline (0-30)
// Won=30, Consulta/stage avançado=22, Follow-up=12-18, Novo=8, Lost=3
// ============================================================
function _calcResult(opp, stages) {
  const status = (opp.status || '').toLowerCase();
  if (status === 'won') return 30;
  if (status === 'lost') return 3;

  // Open — score by stage position
  if (!stages || stages.length === 0) return 8;

  const totalStages = stages.length;
  const currentStage = stages.find(s => s.id === opp.pipelineStageId);
  const stagePosition = currentStage ? (currentStage.position || 0) : 0;
  const stageName = (opp.stageName || opp.stage_name || currentStage?.name || '').toLowerCase();

  // Consulta/agendamento stages
  if (stageName.includes('consulta') || stageName.includes('agendad') || stageName.includes('agendamento')) {
    return 22;
  }

  // Follow-up stages
  if (stageName.includes('follow') || stageName.includes('retorno') || stageName.includes('negociação') || stageName.includes('negociacao')) {
    // Scale 12-18 based on position
    const progress = totalStages > 1 ? stagePosition / (totalStages - 1) : 0.5;
    return Math.round(12 + progress * 6);
  }

  // Generic open: scale 8-18 by position
  if (totalStages > 1) {
    const progress = stagePosition / (totalStages - 1);
    return Math.round(8 + progress * 14); // 8 to 22
  }

  return 8;
}

// ============================================================
// D2: Engajamento de Mensagens (0-25)
// ============================================================
function _calcEngagement(messages) {
  if (!messages || messages.length === 0) return 0;

  const inbound = messages.filter(m => m.direction === 'inbound');
  const inboundCount = inbound.length;
  const total = messages.length;

  let score = 0;
  if (inboundCount === 0) score = 0;
  else if (inboundCount <= 2) score = 5;
  else if (inboundCount <= 5) score = 10;
  else if (inboundCount <= 10) score = 15;
  else if (inboundCount <= 20) score = 20;
  else score = 25;

  // Bonus reply ratio
  if (total > 0) {
    const replyRatio = inboundCount / total;
    if (replyRatio >= 0.4) score += 5;
  }

  return Math.min(score, 25);
}

// ============================================================
// D3: Velocidade de Resposta (0-15)
// Tempo médio outbound→inbound (<1h→15, <6h→11, <24h→7, <72h→3, >72h→0)
// ============================================================
function _calcResponseVelocity(messages) {
  if (!messages || messages.length < 2) return 0;

  const sorted = [...messages].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const deltas = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].direction === 'outbound' && sorted[i + 1].direction === 'inbound') {
      const delta = (sorted[i + 1].timestamp || 0) - (sorted[i].timestamp || 0);
      if (delta > 0) deltas.push(delta);
    }
  }

  if (deltas.length === 0) return 0;

  const avgDeltaSec = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const avgDeltaHours = avgDeltaSec / 3600;

  if (avgDeltaHours < 1) return 15;
  if (avgDeltaHours < 6) return 11;
  if (avgDeltaHours < 24) return 7;
  if (avgDeltaHours < 72) return 3;
  return 0;
}

// ============================================================
// D4: Recência & Atividade (0-15)
// ============================================================
function _calcRecency(opp, messages) {
  const now = Date.now();

  let lastActivity = 0;

  if (opp.updatedAt) {
    const d = new Date(opp.updatedAt).getTime();
    if (d > lastActivity) lastActivity = d;
  }

  if (messages && messages.length > 0) {
    for (const m of messages) {
      const ts = (m.timestamp || 0) * 1000; // timestamps in seconds in DB
      if (ts > lastActivity) lastActivity = ts;
    }
  }

  if (lastActivity === 0) return 0;

  const daysSince = (now - lastActivity) / (1000 * 60 * 60 * 24);

  if (daysSince < 1) return 15;
  if (daysSince <= 3) return 12;
  if (daysSince <= 7) return 9;
  if (daysSince <= 14) return 6;
  if (daysSince <= 30) return 3;
  return 0;
}

// ============================================================
// D5: Qualidade da Campanha (0-10)
// CTR acima da média→+5, CPL abaixo da média→+5. Sem UTM→5 neutro
// ============================================================
function _calcCampaignQuality(opp, campaignAvgs) {
  if (!campaignAvgs || !campaignAvgs.byCampaign) return 5;

  const utmCampaign = opp.utmCampaign || opp.utm_campaign;
  if (!utmCampaign) return 5;

  const campaignData = campaignAvgs.byCampaign[utmCampaign];
  if (!campaignData) return 5;

  let score = 0;

  if (campaignAvgs.avgCtr > 0 && campaignData.ctr > campaignAvgs.avgCtr) {
    score += 5;
  }

  if (campaignAvgs.avgCpl > 0 && campaignData.cpl < campaignAvgs.avgCpl) {
    score += 5;
  }

  return Math.min(score, 10);
}

// ============================================================
// D6: Atribuição de Fonte (0-5)
// Tem UTM→+3, ROAS positivo→+2. Sem dados→1 neutro
// ============================================================
function _calcAttribution(opp, campaignAvgs) {
  if (!campaignAvgs || !campaignAvgs.byCampaign) return 1;

  let score = 0;

  const utmCampaign = opp.utmCampaign || opp.utm_campaign;

  if (utmCampaign) score += 3;

  if (utmCampaign && campaignAvgs.byCampaign[utmCampaign]) {
    const c = campaignAvgs.byCampaign[utmCampaign];
    if (c.wonValue > 0 && c.spend > 0 && c.wonValue > c.spend) {
      score += 2;
    }
  }

  if (score === 0) return 1; // neutro

  return Math.min(score, 5);
}

// ============================================================
// Score a single lead
// ============================================================
function scoreLead(opp, messages, stages, campaignAvgs) {
  const d1 = _calcResult(opp, stages);
  const d2 = _calcEngagement(messages);
  const d3 = _calcResponseVelocity(messages);
  const d4 = _calcRecency(opp, messages);
  const d5 = _calcCampaignQuality(opp, campaignAvgs);
  const d6 = _calcAttribution(opp, campaignAvgs);

  const score = d1 + d2 + d3 + d4 + d5 + d6;
  const tier = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';

  const inboundCount = messages ? messages.filter(m => m.direction === 'inbound').length : 0;
  const outboundCount = messages ? messages.filter(m => m.direction === 'outbound').length : 0;

  return {
    opportunityId: opp.id,
    contactId: opp.contactId || opp.contact_id,
    contactName: opp.contactName || opp.contact_name || opp.name,
    score,
    tier,
    dimensions: { d1, d2, d3, d4, d5, d6 },
    messageCount: messages ? messages.length : 0,
    inboundCount,
    outboundCount,
    stageName: opp.stageName || opp.stage_name,
    status: opp.status,
    utmCampaign: opp.utmCampaign || opp.utm_campaign || null,
  };
}

// ============================================================
// Score all leads for a client
// ============================================================
function scoreAllLeads(clientId) {
  // 1. Get all opportunities
  const opps = ghlDb.getOpportunities(clientId);
  if (!opps || opps.length === 0) {
    return { leads: [], summary: { avgScore: 0, totalScored: 0, byTier: { hot: 0, warm: 0, cold: 0 }, topLeads: [] }, distribution: _emptyDistribution() };
  }

  // 2. Get pipeline stages
  const stages = ghlDb.getPipelineStages(clientId);

  // 3. Get campaign averages from ads DB
  let campaignAvgs = { avgCtr: 0, avgCpl: 0, byCampaign: {} };
  try {
    campaignAvgs = getCampaignAverages(clientId);
  } catch (e) {
    console.warn('[lead-scorer] Campaign averages unavailable:', e.message);
  }

  // 4. Enrich with CRM won values
  _enrichCampaignAvgsWithCrm(clientId, campaignAvgs);

  // 5. Score each opportunity
  const scored = [];
  for (const opp of opps) {
    let messages = [];

    // Try by contact_id first
    if (opp.contactId) {
      try {
        const result = ghlConvDb.getMessagesByContactId(opp.contactId);
        if (result.success) messages = result.data;
      } catch (e) { /* no messages available */ }
    }

    // Fallback: phone matching when contact_id is NULL or no messages found
    if (messages.length === 0 && opp.contactPhone) {
      try {
        const normalized = _normalizePhone(opp.contactPhone);
        if (normalized) {
          const result = ghlConvDb.getConversationByPhone(normalized);
          if (result.success && result.data) {
            const convMsgs = ghlConvDb.getMessages(result.data.conversation_id);
            if (convMsgs.success) messages = convMsgs.data;
          }
        }
      } catch (e) { /* phone matching failed */ }
    }

    const result = scoreLead(opp, messages, stages, campaignAvgs);
    scored.push(result);
  }

  // 6. Persist scores
  try {
    ghlDb.upsertLeadScores(clientId, scored);
  } catch (e) {
    console.error('[lead-scorer] Error persisting scores:', e.message);
  }

  // 7. Build summary
  scored.sort((a, b) => b.score - a.score);

  const summary = {
    avgScore: scored.length > 0 ? Math.round(scored.reduce((s, l) => s + l.score, 0) / scored.length) : 0,
    totalScored: scored.length,
    byTier: {
      hot: scored.filter(l => l.tier === 'hot').length,
      warm: scored.filter(l => l.tier === 'warm').length,
      cold: scored.filter(l => l.tier === 'cold').length,
    },
    topLeads: scored.slice(0, 5),
  };

  const distribution = _buildDistribution(scored);

  return { leads: scored, summary, distribution };
}

// ============================================================
// Helpers
// ============================================================

function getCampaignAverages(clientId) {
  try {
    adsDb.initDB();
  } catch (e) { /* already init */ }

  return adsDb.getCampaignAverages(clientId);
}

function _enrichCampaignAvgsWithCrm(clientId, campaignAvgs) {
  try {
    const crmPerformance = ghlDb.getCampaignPerformance(clientId, null, null);
    for (const cp of crmPerformance) {
      const name = cp.campaign;
      if (campaignAvgs.byCampaign[name]) {
        campaignAvgs.byCampaign[name].wonValue = cp.won_value || 0;
        campaignAvgs.byCampaign[name].wonCount = cp.won_count || 0;
      }
    }
  } catch (e) { /* crm data not available */ }
}

function _buildDistribution(scored) {
  const ranges = [
    { label: '0-19', min: 0, max: 19, count: 0 },
    { label: '20-39', min: 20, max: 39, count: 0 },
    { label: '40-59', min: 40, max: 59, count: 0 },
    { label: '60-79', min: 60, max: 79, count: 0 },
    { label: '80-100', min: 80, max: 100, count: 0 },
  ];

  const dimTotals = { d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0 };

  for (const lead of scored) {
    for (const r of ranges) {
      if (lead.score >= r.min && lead.score <= r.max) { r.count++; break; }
    }
    dimTotals.d1 += lead.dimensions.d1;
    dimTotals.d2 += lead.dimensions.d2;
    dimTotals.d3 += lead.dimensions.d3;
    dimTotals.d4 += lead.dimensions.d4;
    dimTotals.d5 += lead.dimensions.d5;
    dimTotals.d6 += lead.dimensions.d6;
  }

  const n = scored.length || 1;
  const avgByDimension = {
    d1: Math.round(dimTotals.d1 / n * 10) / 10,
    d2: Math.round(dimTotals.d2 / n * 10) / 10,
    d3: Math.round(dimTotals.d3 / n * 10) / 10,
    d4: Math.round(dimTotals.d4 / n * 10) / 10,
    d5: Math.round(dimTotals.d5 / n * 10) / 10,
    d6: Math.round(dimTotals.d6 / n * 10) / 10,
  };

  return { ranges: ranges.map(r => ({ label: r.label, count: r.count })), avgByDimension };
}

function _emptyDistribution() {
  return {
    ranges: [
      { label: '0-19', count: 0 },
      { label: '20-39', count: 0 },
      { label: '40-59', count: 0 },
      { label: '60-79', count: 0 },
      { label: '80-100', count: 0 },
    ],
    avgByDimension: { d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0 },
  };
}

module.exports = {
  scoreLead,
  scoreAllLeads,
  _normalizePhone,
  _calcResult,
  _calcEngagement,
  _calcResponseVelocity,
  _calcRecency,
  _calcCampaignQuality,
  _calcAttribution,
};
