/**
 * Knowledge Base compartilhada por cliente.
 * Cada cliente tem um JSON em data/knowledge-base/{clientId}.json
 * Todos os agentes podem ler; escritas centralizadas aqui.
 */

const fs = require('fs');
const path = require('path');

const KB_DIR = path.join(__dirname, '..', 'data', 'knowledge-base');
const MAX_INSIGHTS = 50;
const MAX_NOTES = 30;
const MAX_CONTEXT_CHARS = 2000;

// Cache em memória
const cache = new Map();

// --- Persistência ---

function ensureDir() {
  if (!fs.existsSync(KB_DIR)) fs.mkdirSync(KB_DIR, { recursive: true });
}

function filePath(clientId) {
  return path.join(KB_DIR, `${clientId}.json`);
}

function defaultKB(clientId) {
  return {
    clientId,
    icp: {},
    audience: {},
    product: {},
    campaignInsights: [],
    groupInsights: [],
    notes: [],
    updatedAt: Date.now(),
  };
}

function loadKB(clientId) {
  if (cache.has(clientId)) return cache.get(clientId);
  const fp = filePath(clientId);
  let kb;
  try {
    if (fs.existsSync(fp)) {
      kb = JSON.parse(fs.readFileSync(fp, 'utf8'));
    } else {
      kb = defaultKB(clientId);
    }
  } catch (err) {
    console.error(`KB: erro ao carregar ${clientId}:`, err.message);
    kb = defaultKB(clientId);
  }
  cache.set(clientId, kb);
  return kb;
}

function saveKB(clientId) {
  ensureDir();
  const kb = cache.get(clientId);
  if (!kb) return;
  kb.updatedAt = Date.now();
  try {
    fs.writeFileSync(filePath(clientId), JSON.stringify(kb, null, 2));
  } catch (err) {
    console.error(`KB: erro ao salvar ${clientId}:`, err.message);
  }
}

// --- API ---

/**
 * Retorna a KB completa de um cliente.
 */
function getClientKB(clientId) {
  return loadKB(clientId);
}

/**
 * Atualiza ICP do cliente (merge parcial).
 */
function updateICP(clientId, icpData) {
  const kb = loadKB(clientId);
  kb.icp = { ...kb.icp, ...icpData };
  saveKB(clientId);
  return kb.icp;
}

/**
 * Atualiza dados de audiência (merge parcial).
 */
function updateAudience(clientId, audienceData) {
  const kb = loadKB(clientId);
  kb.audience = { ...kb.audience, ...audienceData };
  saveKB(clientId);
  return kb.audience;
}

/**
 * Atualiza dados de produto (merge parcial).
 */
function updateProduct(clientId, productData) {
  const kb = loadKB(clientId);
  kb.product = { ...kb.product, ...productData };
  saveKB(clientId);
  return kb.product;
}

/**
 * Adiciona insight de campanha.
 */
function addCampaignInsight(clientId, insight) {
  const kb = loadKB(clientId);
  kb.campaignInsights.push({
    date: new Date().toISOString(),
    ...insight,
  });
  if (kb.campaignInsights.length > MAX_INSIGHTS) {
    kb.campaignInsights = kb.campaignInsights.slice(-MAX_INSIGHTS);
  }
  saveKB(clientId);
}

/**
 * Adiciona insight de grupo (WhatsApp/Nico).
 */
function addGroupInsight(clientId, insight) {
  const kb = loadKB(clientId);
  kb.groupInsights.push({
    date: new Date().toISOString(),
    ...insight,
  });
  if (kb.groupInsights.length > MAX_INSIGHTS) {
    kb.groupInsights = kb.groupInsights.slice(-MAX_INSIGHTS);
  }
  saveKB(clientId);
}

/**
 * Adiciona nota manual.
 */
function addNote(clientId, author, text) {
  const kb = loadKB(clientId);
  kb.notes.push({
    date: new Date().toISOString(),
    author,
    text,
  });
  if (kb.notes.length > MAX_NOTES) {
    kb.notes = kb.notes.slice(-MAX_NOTES);
  }
  saveKB(clientId);
}

/**
 * Serializa KB para injetar no prompt do LLM (max 2000 chars).
 */
function getContextForLLM(clientId) {
  const kb = loadKB(clientId);
  const parts = [];

  if (Object.keys(kb.icp).length > 0) {
    parts.push(`ICP: ${JSON.stringify(kb.icp)}`);
  }
  if (Object.keys(kb.audience).length > 0) {
    parts.push(`Público: ${JSON.stringify(kb.audience)}`);
  }
  if (Object.keys(kb.product).length > 0) {
    parts.push(`Produto: ${JSON.stringify(kb.product)}`);
  }

  // Últimos 5 insights de campanha
  const recentCampaign = kb.campaignInsights.slice(-5);
  if (recentCampaign.length > 0) {
    parts.push(`Insights recentes: ${recentCampaign.map(i => i.insight || i.text || JSON.stringify(i)).join('; ')}`);
  }

  // Últimas 3 notas
  const recentNotes = kb.notes.slice(-3);
  if (recentNotes.length > 0) {
    parts.push(`Notas: ${recentNotes.map(n => n.text).join('; ')}`);
  }

  const text = parts.join('\n');
  if (text.length > MAX_CONTEXT_CHARS) {
    return text.substring(0, MAX_CONTEXT_CHARS) + '...';
  }
  return text;
}

/**
 * Aplica extrações do knowledge-extractor.
 */
function applyExtractions(clientId, extractions) {
  if (!extractions || !Array.isArray(extractions)) return;
  for (const ext of extractions) {
    switch (ext.type) {
      case 'icp':
        updateICP(clientId, ext.data);
        break;
      case 'audience':
        updateAudience(clientId, ext.data);
        break;
      case 'product':
        updateProduct(clientId, ext.data);
        break;
      case 'insight':
        addCampaignInsight(clientId, { source: 'conversation', insight: ext.data.text || ext.data });
        break;
      case 'note':
        addNote(clientId, 'user', ext.data.text || ext.data);
        break;
    }
  }
}

/**
 * Inicializa KB para uma lista de clientIds (cria defaults se não existem).
 */
function initForClients(clientIds) {
  ensureDir();
  for (const id of clientIds) {
    loadKB(id);
    if (!fs.existsSync(filePath(id))) {
      saveKB(id);
    }
  }
  console.log(`KB: ${clientIds.length} clientes inicializados.`);
}

module.exports = {
  getClientKB,
  updateICP,
  updateAudience,
  updateProduct,
  addCampaignInsight,
  addGroupInsight,
  addNote,
  getContextForLLM,
  applyExtractions,
  initForClients,
};
