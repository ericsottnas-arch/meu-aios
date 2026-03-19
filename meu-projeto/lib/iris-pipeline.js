// meu-projeto/lib/iris-pipeline.js
// Sync entre Iris stages e GHL Pipeline "Prospeccao"
// Iris v3: move opportunities automaticamente conforme conversa avanca

const GhlCrm = require('./ghl-crm');
const irisDB = require('./iris-db');

const GHL_PIPELINE_ID = process.env.GHL_PIPELINE_ID;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_API_KEY = process.env.GHL_API_KEY || process.env.GHL_ACCESS_TOKEN;

// Mapeamento Iris Stage → GHL Stage Name
const STAGE_MAP = {
  aquecimento: 'Primeiro Contato',
  qualificacao: 'Em Conversa',
  rapport: 'Qualificado',
  proposta_reuniao: 'Reunião Proposta',
  pedir_whatsapp: 'Reunião Proposta',
  whatsapp_ativo: 'Reunião Proposta',
  agendamento: 'Reunião Agendada',
  followup: 'Sem Resposta',
  objecoes: 'Qualificado',
};

let crmClient = null;
let stageCache = null; // { stageName: stageId }

/**
 * Inicializa o client CRM
 */
function getCrm() {
  if (!crmClient && GHL_LOCATION_ID && GHL_API_KEY) {
    crmClient = new GhlCrm(GHL_LOCATION_ID, GHL_API_KEY);
  }
  return crmClient;
}

/**
 * Carrega e cacheia os stages do pipeline
 * @returns {Promise<Object>} { stageName: stageId }
 */
async function loadStages() {
  if (stageCache) return stageCache;

  const crm = getCrm();
  if (!crm || !GHL_PIPELINE_ID) {
    console.warn('🔗 Iris Pipeline: GHL_PIPELINE_ID ou credenciais nao configurados');
    return null;
  }

  try {
    const pipelines = await crm.getPipelines();
    const pipeline = pipelines.find((p) => p.id === GHL_PIPELINE_ID);

    if (!pipeline) {
      console.error('🔗 Iris Pipeline: pipeline nao encontrado:', GHL_PIPELINE_ID);
      return null;
    }

    stageCache = {};
    for (const stage of pipeline.stages) {
      stageCache[stage.name] = stage.id;
    }

    console.log('🔗 Iris Pipeline: stages carregados:', Object.keys(stageCache).join(', '));
    return stageCache;
  } catch (error) {
    console.error('🔗 Iris Pipeline: erro ao carregar stages:', error.message);
    return null;
  }
}

/**
 * Resolve o GHL stage ID a partir do Iris stage name
 */
async function resolveStageId(irisStage) {
  const stages = await loadStages();
  if (!stages) return null;

  const ghlStageName = STAGE_MAP[irisStage];
  if (!ghlStageName) return null;

  return stages[ghlStageName] || null;
}

/**
 * Sincroniza a mudanca de stage de um prospect no GHL
 * Cria opportunity se nao existe, ou move se ja existe
 *
 * @param {string} conversationId - ID da conversa
 * @param {string} newIrisStage - Nova stage da Iris
 * @returns {Promise<{ success: boolean, action?: string, error?: string }>}
 */
async function syncStage(conversationId, newIrisStage) {
  const crm = getCrm();
  if (!crm || !GHL_PIPELINE_ID) {
    return { success: false, error: 'Pipeline nao configurado' };
  }

  const prospect = irisDB.getProspect(conversationId);
  if (!prospect || !prospect.contact_id) {
    return { success: false, error: 'Prospect sem contact_id' };
  }

  const stageId = await resolveStageId(newIrisStage);
  if (!stageId) {
    return { success: false, error: `Stage nao mapeada: ${newIrisStage}` };
  }

  try {
    // Buscar opportunity existente
    let opportunity = await crm.getOpportunityByContact(prospect.contact_id, GHL_PIPELINE_ID);

    if (!opportunity) {
      // Criar opportunity
      const name = `IG - ${prospect.contact_name}`;
      opportunity = await crm.createOpportunity(
        prospect.contact_id,
        GHL_PIPELINE_ID,
        stageId,
        name
      );
      console.log(`🔗 Iris Pipeline: opportunity criada para ${prospect.contact_name}`);
      return { success: true, action: 'created', opportunityId: opportunity.id };
    }

    // Mover opportunity para nova stage
    await crm.updateOpportunityStage(opportunity.id, stageId);
    console.log(`🔗 Iris Pipeline: ${prospect.contact_name} movido para ${STAGE_MAP[newIrisStage]}`);
    return { success: true, action: 'moved', opportunityId: opportunity.id };
  } catch (error) {
    console.error(`🔗 Iris Pipeline: erro ao sincronizar ${prospect.contact_name}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Marca opportunity como "won" (reuniao agendada)
 */
async function markAsWon(conversationId) {
  const crm = getCrm();
  if (!crm || !GHL_PIPELINE_ID) return { success: false, error: 'Pipeline nao configurado' };

  const prospect = irisDB.getProspect(conversationId);
  if (!prospect?.contact_id) return { success: false, error: 'Prospect sem contact_id' };

  try {
    const opportunity = await crm.getOpportunityByContact(prospect.contact_id, GHL_PIPELINE_ID);
    if (!opportunity) return { success: false, error: 'Opportunity nao encontrada' };

    await crm.updateOpportunityStatus(opportunity.id, 'won');
    console.log(`🔗 Iris Pipeline: ${prospect.contact_name} marcado como WON`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Marca opportunity como "lost" (perdido)
 */
async function markAsLost(conversationId) {
  const crm = getCrm();
  if (!crm || !GHL_PIPELINE_ID) return { success: false, error: 'Pipeline nao configurado' };

  const prospect = irisDB.getProspect(conversationId);
  if (!prospect?.contact_id) return { success: false, error: 'Prospect sem contact_id' };

  try {
    const opportunity = await crm.getOpportunityByContact(prospect.contact_id, GHL_PIPELINE_ID);
    if (!opportunity) return { success: false, error: 'Opportunity nao encontrada' };

    await crm.updateOpportunityStatus(opportunity.id, 'lost');
    irisDB.setProspectStatus(conversationId, 'lost');
    console.log(`🔗 Iris Pipeline: ${prospect.contact_name} marcado como LOST`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Verifica se pipeline esta configurado
 */
function isConfigured() {
  return !!(GHL_PIPELINE_ID && GHL_API_KEY && GHL_LOCATION_ID);
}

module.exports = {
  syncStage,
  markAsWon,
  markAsLost,
  loadStages,
  resolveStageId,
  isConfigured,
  STAGE_MAP,
};
