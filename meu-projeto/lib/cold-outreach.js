/**
 * Cold Outreach Engine - Prospecção Fria via WhatsApp (Stevo)
 *
 * Envia mensagens personalizadas para lista de dentistas (ROF) do GHL.
 * Detecta gênero por nome, varia mensagens anti-ban, cadência inteligente.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const stevo = require('./stevo');
const irisTelegram = require('./iris-telegram');

const TELEGRAM_CHAT_ID = process.env.IRIS_APPROVAL_CHAT_ID || '5020990459';
const GHL_API_KEY = process.env.GHL_ACCESS_TOKEN?.replace(/"/g, '');
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

// ============================================================
// Database
// ============================================================

const DB_PATH = path.resolve(__dirname, '../../../docs/banco-dados-geral/cold-outreach.db');
let db = null;

function initDB() {
  if (db) return;

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS cold_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ghl_contact_id TEXT UNIQUE,
      name TEXT,
      first_name TEXT,
      phone TEXT,
      phone_jid TEXT,
      gender TEXT DEFAULT 'unknown',
      tag TEXT,
      status TEXT DEFAULT 'pending',
      first_msg_variant INTEGER,
      first_msg_sent_at DATETIME,
      followup_variant INTEGER,
      followup_sent_at DATETIME,
      responded INTEGER DEFAULT 0,
      responded_at DATETIME,
      response_text TEXT,
      error_message TEXT,
      dialog_state TEXT DEFAULT 'initial',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_cold_leads_status ON cold_leads(status);
    CREATE INDEX IF NOT EXISTS idx_cold_leads_phone ON cold_leads(phone);
    CREATE INDEX IF NOT EXISTS idx_cold_leads_phone_jid ON cold_leads(phone_jid);

    CREATE TABLE IF NOT EXISTS cold_campaign_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migração: adicionar dialog_state em bancos existentes
  try {
    db.exec(`ALTER TABLE cold_leads ADD COLUMN dialog_state TEXT DEFAULT 'initial'`);
  } catch (_) { /* coluna já existe */ }

  db.exec(`

    CREATE TABLE IF NOT EXISTS cold_campaign_state (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function getDB() {
  initDB();
  return db;
}

function setState(key, value) {
  getDB().prepare(`
    INSERT OR REPLACE INTO cold_campaign_state (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
  `).run(key, String(value));
}

function getState(key) {
  const row = getDB().prepare('SELECT value FROM cold_campaign_state WHERE key = ?').get(key);
  return row?.value || null;
}

function logAction(action, details) {
  getDB().prepare('INSERT INTO cold_campaign_log (action, details) VALUES (?, ?)').run(action, details);
}

// ============================================================
// Detecção de Gênero por Nome Brasileiro
// ============================================================

const MALE_NAMES = new Set([
  'adriano', 'alan', 'alberto', 'alessandro', 'alex', 'alexandre', 'alexsandro',
  'anderson', 'andre', 'antonio', 'artur', 'augusto', 'bernardo', 'bruno',
  'caio', 'carlos', 'cesar', 'claudio', 'cristiano', 'daniel', 'danilo',
  'davi', 'david', 'denis', 'diego', 'diogo', 'douglas', 'edgar', 'edson',
  'eduardo', 'elias', 'emerson', 'enrique', 'enzo', 'erick', 'erico',
  'evandro', 'everton', 'fabiano', 'fabio', 'fabricio', 'felipe', 'fernando',
  'filipe', 'flavio', 'francisco', 'frederico', 'gabriel', 'george', 'gilberto',
  'giovanni', 'guilherme', 'gustavo', 'heitor', 'henrique', 'hugo', 'igor',
  'isaac', 'ivan', 'jean', 'jefferson', 'joao', 'jonas', 'jonathan', 'jorge',
  'jose', 'julio', 'kleber', 'leandro', 'leonardo', 'luan', 'lucas', 'luciano',
  'luis', 'luiz', 'marcelo', 'marcio', 'marcos', 'mario', 'mateus', 'matheus',
  'mauricio', 'mauro', 'maxwell', 'miguel', 'murilo', 'nathan', 'nelson',
  'neto', 'nicolas', 'otavio', 'pablo', 'patrick', 'paulo', 'pedro', 'rafael',
  'raul', 'renan', 'renato', 'ricardo', 'roberto', 'rodrigo', 'rogerio',
  'romulo', 'ronaldo', 'samuel', 'sergio', 'sidnei', 'silvio', 'thiago',
  'tiago', 'vagner', 'vinicius', 'vitor', 'wagner', 'wallace', 'wanderson',
  'wellington', 'wendel', 'wesley', 'william', 'willian',
]);

const FEMALE_NAMES = new Set([
  'adriana', 'agatha', 'aline', 'amanda', 'ana', 'andrea', 'andreia',
  'andressa', 'angela', 'angelica', 'anna', 'barbara', 'beatriz', 'bianca',
  'brenda', 'bruna', 'camila', 'carla', 'carolina', 'caroline', 'cecilia',
  'celia', 'claudia', 'cristiane', 'cristina', 'daiane', 'daniela', 'danielle',
  'debora', 'denise', 'diana', 'edna', 'elaine', 'eliane', 'elizabete',
  'erica', 'fabiana', 'fernanda', 'flavia', 'franciele', 'gabriela', 'gabrielle',
  'giovana', 'gisele', 'helena', 'ingrid', 'isabela', 'isabelle', 'ivone',
  'jacqueline', 'janaina', 'jessica', 'joana', 'josiane', 'joyce', 'julia',
  'juliana', 'karina', 'karla', 'katia', 'kelly', 'lais', 'larissa', 'laura',
  'leticia', 'ligia', 'liliane', 'lorena', 'luana', 'lucia', 'luciana',
  'luiza', 'madalena', 'marcela', 'marcia', 'maria', 'mariana', 'marina',
  'marlene', 'marta', 'mayara', 'melissa', 'michele', 'milena', 'miriam',
  'monique', 'nadia', 'natalia', 'natasha', 'nathalia', 'neide', 'nicole',
  'paloma', 'pamela', 'patricia', 'paula', 'priscila', 'rafaela', 'raquel',
  'rebeca', 'regina', 'renata', 'roberta', 'rosa', 'rosana', 'sabrina',
  'samantha', 'sandra', 'sara', 'silvia', 'simone', 'sonia', 'stefanie',
  'suelen', 'suzana', 'tais', 'talita', 'tatiana', 'tatiane', 'thais',
  'thaisa', 'vanessa', 'vera', 'veronica', 'victoria', 'vitoria', 'viviane',
]);

/**
 * Detecta gênero pelo primeiro nome
 * @param {string} name - Nome completo ou primeiro nome
 * @returns {'male'|'female'|'unknown'}
 */
function detectGender(name) {
  if (!name) return 'unknown';

  const parts = name.trim().split(/\s+/);
  let firstName = parts[0].toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Ignorar títulos: Dr., Dra., Dr, Dra
  if (/^dra?\.?$/.test(firstName)) {
    if (firstName.startsWith('dra')) return 'female';
    // "Dr." sem "a" → usar segundo nome
    firstName = (parts[1] || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!firstName) return 'male'; // "Dr." sozinho assume masculino
  }

  if (MALE_NAMES.has(firstName)) return 'male';
  if (FEMALE_NAMES.has(firstName)) return 'female';

  // Heurística por sufixo
  if (firstName.endsWith('a') || firstName.endsWith('e')) return 'female';
  if (firstName.endsWith('o') || firstName.endsWith('os') || firstName.endsWith('son')) return 'male';

  return 'unknown';
}

// ============================================================
// Templates de Mensagens com Variações
// ============================================================

const TEMPLATES_FIRST_MSG = {
  male: [
    (nome) => `Fala ${nome}, tudo bem cara? É você que tem uma clínica de harmonização facial?`,
    (nome) => `E aí ${nome}, tudo certo? Você que é o dentista que faz harmonização facial?`,
    (nome) => `Oi ${nome}, tudo bem? Você que tem consultório de harmonização facial?`,
    (nome) => `Fala ${nome}, beleza? É você que trabalha com harmonização facial??`,
    (nome) => `E aí ${nome}, como vai? Você que é especialista em harmonização facial?`,
    (nome) => `Oi ${nome}, tudo joia? É você que faz procedimento de harmonização facial?`,
    (nome) => `Fala ${nome}, td bem? É vc que tem clínica de harmonização?`,
    (nome) => `Oi ${nome}, tudo certo cara? Você que é dentista e faz harmonização?`,
  ],
  female: [
    (nome) => `Oi doutora, tudo bem? É você que tem uma clínica de harmonização facial?`,
    (nome) => `Oi doutora, como você está? Você que faz procedimentos estéticos?`,
    (nome) => `Oi doutora, tudo bem? É você que trabalha com harmonização facial??`,
    (nome) => `Oii doutora, tudo joia? Você que tem consultório de estética facial?`,
    (nome) => `Oi doutora, como vai? É você que é especialista em harmonização facial?`,
    (nome) => `Oi doutora, tudo certo? Você que faz harmonização facial?`,
    (nome) => `Oi doutora, td bem? É vc que tem clínica de harmonização?`,
    (nome) => `Oii doutora, tudo bem? Você que faz harmonização facial??`,
  ],
  unknown: [
    (nome) => `Oi, tudo bem? É você que tem uma clínica de harmonização facial?`,
    (nome) => `Oi, como vai? É você que trabalha com harmonização facial?`,
    (nome) => `Oi, tudo certo? Você que faz harmonização facial?`,
    (nome) => `Oi, tudo bem? É você que é especialista em harmonização facial??`,
    (nome) => `Oii, tudo bem? Você que tem clínica de harmonização facial?`,
    (nome) => `Oi, td bem? É vc que faz harmonização facial?`,
  ],
};

const TEMPLATES_FOLLOWUP = {
  male: [
    () => `Conseguiu ver?`,
    () => `Conseguiu ver??`,
    () => `É você mesmo?`,
    () => `👀`,
    () => `?`,
    () => `Viu?`,
    () => `Oi?`,
    () => `E aí?`,
  ],
  female: [
    () => `Conseguiu ver?`,
    () => `Conseguiu ver??`,
    () => `É você mesma?`,
    () => `👀`,
    () => `?`,
    () => `Viu?`,
    () => `Oi?`,
    () => `Doutora?`,
  ],
  unknown: [
    () => `Conseguiu ver?`,
    () => `Conseguiu ver??`,
    () => `👀`,
    () => `?`,
    () => `Viu?`,
    () => `Oi?`,
  ],
};

/**
 * Seleciona uma variação aleatória diferente da última usada
 * @param {Array} templates - Array de templates
 * @param {number|null} lastVariant - Índice da última variação usada
 * @returns {{ index: number, text: string }}
 */
function selectVariant(templates, firstName, lastVariant = null) {
  let index;
  do {
    index = Math.floor(Math.random() * templates.length);
  } while (index === lastVariant && templates.length > 1);

  return { index, text: templates[index](firstName) };
}

// ============================================================
// Templates de Diálogo Investigativo
// ============================================================

const TEMPLATES_INVESTIGATE = [
  () => `Mas calma aí, você é dentista? Acho que mandei mensagem por engano, mas me diz uma coisa: você é dentista?`,
  () => `Peraí, mas você é dentista? Desculpa o engano, mas só pra confirmar: você é dentista?`,
  () => `Ah tá, mas antes de encerrar: você é dentista? Pode ser que eu tenha o número certo sim`,
  () => `Opa, desculpe! Mas me diz uma coisa antes: você tem formação em odontologia? Pode ser que não tenha sido engano`,
  () => `Entendi, mas só uma coisa: você é dentista? Acho que fiz confusão aqui, mas me confirma isso`,
  () => `Hmm, mas você é dentista? Desculpe incomodar, só preciso confirmar isso`,
];

const TEMPLATES_CLOSING = [
  () => `Certo, obrigado!`,
  () => `Entendido, desculpe o engano!`,
  () => `Ok, desculpe incomodar!`,
  () => `Tudo bem, me desculpe o contato!`,
  () => `Certo! Me desculpe o incômodo.`,
  () => `Ok, obrigado pela atenção!`,
];

// ============================================================
// Classificação de Resposta — Groq Llama 3.1 8B (free tier)
// ============================================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.replace(/"/g, '');
const CLAUDE_MODEL = 'claude-3-haiku-20240307';

/**
 * Classifica a resposta via Claude Haiku.
 * Tokens mínimos: ~60 input + ~5 output por chamada.
 */
async function classifyWithGroq(text, dialogState) {
  if (!ANTHROPIC_API_KEY) return null;

  const contextHint = dialogState === 'investigating'
    ? 'Você perguntou se a pessoa é dentista. Ela respondeu:'
    : 'Você mandou mensagem perguntando se a pessoa tem clínica de harmonização facial. Ela respondeu:';

  const systemPrompt = `Você classifica respostas de leads em uma campanha de prospecção para cirurgiões-dentistas.
Responda APENAS com uma das palavras abaixo, sem explicação:

- wrong_number → pessoa diz que recebeu mensagem por engano, não é o contato certo, ou que não tem clínica
- not_dentist → pessoa confirma que não é dentista, ou menciona outra profissão (médico, enfermeiro, fisio, etc.)
- is_dentist → pessoa confirma que é dentista ou odontologista
- positive → pessoa demonstra interesse, curiosidade ou pergunta do que se trata`;

  const userMessage = `${contextHint}\n"${text}"\n\nClassificação:`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 10,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const raw = data.content?.[0]?.text?.trim().toLowerCase() || '';

    if (raw.includes('wrong_number')) return 'wrong_number';
    if (raw.includes('not_dentist')) return 'not_dentist';
    if (raw.includes('is_dentist')) return 'is_dentist';
    if (raw.includes('positive')) return 'positive';

    return null;
  } catch {
    return null;
  }
}

/**
 * Fallback regex — usado quando Groq não está disponível ou falha
 */
function classifyWithRegex(text, dialogState) {
  const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (dialogState === 'investigating') {
    const relatedHealthField = /\b(medic|enferm|farmac|fisio|nutri|psicol|veterin|biomedic|terapeuta|auxiliar|tecnic|recepcion|secretar|administrat|contador|advogad|engenheir|professor|estudante)/.test(t);
    if (relatedHealthField) return 'not_dentist';

    const notDentist = /\b(nao|nao sou|nao tenho|nao trabalho|nunca|nenhum|neg|negativo|leigo|leiga|nope)\b/.test(t);
    if (notDentist) return 'not_dentist';

    const isDentist = /\b(sim|sou sim|sim sou|sim dentist|sou dentist|dentist|odonto|clinica|consultorio|e sim|sim e|sou)\b/.test(t);
    if (isDentist) return 'is_dentist';

    return 'is_dentist'; // ambíguo → Eric decide
  }

  const wrongNumber = /(engano|errado|errou|nao sou eu|nao e eu|nao e aqui|numero errado|nao tenho clinica|nao trabalho|nao sou dent|nao faco|nao faz|nao presto|nao exerc|nao atend|nunca fui|nao tenho formac|nao e o numero|nao e meu)/.test(t);
  if (wrongNumber) return 'wrong_number';

  const shortNegative = /^(nao\.?|nao!?|errado\.?|errei\.?|quem e voce|quem e vc|nao conheo|numero errado)$/.test(t.trim());
  if (shortNegative) return 'wrong_number';

  const positive = /(sim|e eu|sou eu|pode falar|o que|do que se trata|me diz|ola|oi sim|claro|obvio|correto|e isso)/.test(t);
  if (positive) return 'positive';

  return 'unknown';
}

/**
 * Classifica a resposta de um lead.
 * Tenta Groq primeiro (free tier), regex como fallback.
 * @param {string} text - Texto da resposta
 * @param {string} dialogState - Estado atual do diálogo
 * @returns {Promise<'wrong_number'|'is_dentist'|'not_dentist'|'positive'|'unknown'>}
 */
async function classifyResponse(text, dialogState) {
  if (!text) return 'unknown';

  const groqResult = await classifyWithGroq(text, dialogState);
  if (groqResult) {
    console.log(`🤖 Haiku classificou "${text.substring(0, 40)}" → ${groqResult}`);
    return groqResult;
  }

  // Fallback para regex
  const regexResult = classifyWithRegex(text, dialogState);
  console.log(`🔤 Regex classificou "${text.substring(0, 40)}" → ${regexResult}`);
  return regexResult;
}

// ============================================================
// Envio de Mensagens de Diálogo
// ============================================================

/**
 * Envia pergunta investigativa para um lead
 */
async function sendInvestigativeQuestion(lead) {
  const { index, text } = selectVariant(TEMPLATES_INVESTIGATE, '', null);

  try {
    await stevo.setPresence(lead.phone_jid, 'composing');
    await sleep(2000 + Math.random() * 3000);
    await stevo.sendText(lead.phone_jid, text);

    getDB().prepare(`
      UPDATE cold_leads SET dialog_state = 'investigating', status = 'investigating'
      WHERE id = ?
    `).run(lead.id);

    logAction('investigate', JSON.stringify({ leadId: lead.id, name: lead.name, variant: index }));
    console.log(`🔍 [${lead.id}] Pergunta investigativa → ${lead.name}: "${text}"`);
    return true;
  } catch (err) {
    console.error(`❌ [${lead.id}] Erro investigativa ${lead.name}: ${err.message}`);
    return false;
  }
}

/**
 * Desqualifica um lead: adiciona tag no GHL + envia mensagem de agradecimento + encerra
 * Chamado quando lead confirma que não é dentista
 */
async function disqualifyLead(lead) {
  const { index, text } = selectVariant(TEMPLATES_CLOSING, '', null);

  try {
    // 1. Enviar mensagem de agradecimento
    await stevo.setPresence(lead.phone_jid, 'composing');
    await sleep(1500 + Math.random() * 1500);
    await stevo.sendText(lead.phone_jid, text);

    // 2. Atualizar DB
    getDB().prepare(`
      UPDATE cold_leads SET dialog_state = 'closed', status = 'disqualified'
      WHERE id = ?
    `).run(lead.id);

    logAction('disqualified', JSON.stringify({ leadId: lead.id, name: lead.name, phone: lead.phone }));
    console.log(`🔒 [${lead.id}] Desqualificado: ${lead.name} | msg: "${text}"`);

    // 3. Adicionar tag "desqualificado" no GHL (assíncrono, não bloqueia)
    addGhlTag(lead.ghl_contact_id, 'desqualificado').catch(() => {});

    return true;
  } catch (err) {
    console.error(`❌ [${lead.id}] Erro ao desqualificar ${lead.name}: ${err.message}`);
    return false;
  }
}

// ============================================================
// GHL Contact Fetcher (com paginação e filtro por tag)
// ============================================================

async function ghlRequest(method, urlPath, params = {}) {
  const url = new URL(`${GHL_BASE}${urlPath}`);

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${GHL_API_KEY}`,
      'Version': API_VERSION,
      'Accept': 'application/json',
    },
  };

  if (method === 'GET') {
    for (const [k, v] of Object.entries(params)) {
      if (v != null) url.searchParams.set(k, String(v));
    }
  } else {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(params);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GHL ${method} ${urlPath}: ${res.status} — ${body}`);
  }
  return res.json();
}

/**
 * Adiciona uma tag a um contato no GHL sem sobrescrever as existentes
 * @param {string} contactId - ID do contato no GHL
 * @param {string} newTag - Tag a adicionar (ex: 'desqualificado')
 */
async function addGhlTag(contactId, newTag) {
  if (!contactId || contactId.startsWith('manual_')) return; // lead ad-hoc sem GHL ID

  try {
    // Buscar tags atuais
    const data = await ghlRequest('GET', `/contacts/${contactId}`);
    const current = data.contact?.tags || [];

    if (current.includes(newTag)) return; // já tem a tag

    // Adicionar nova tag
    await ghlRequest('PUT', `/contacts/${contactId}`, {
      tags: [...current, newTag],
    });

    console.log(`🏷️ GHL tag "${newTag}" adicionada ao contato ${contactId}`);
  } catch (err) {
    console.error(`⚠️ Falha ao adicionar tag GHL para ${contactId}: ${err.message}`);
    // Não bloqueia o fluxo — tag é secundária
  }
}

/**
 * Busca TODOS os contatos do GHL com tag específica (paginado)
 * @param {string} tag - Tag para filtrar (ex: 'frio')
 * @returns {Promise<Array>} Lista de contatos com phone, name, tags
 */
async function fetchContactsByTag(tag) {
  const allContacts = [];
  let startAfterId = null;
  let page = 0;
  const MAX_PAGES = 50; // Safety limit (50 * 100 = 5000 contacts max)

  console.log(`📋 Buscando contatos com tag "${tag}" no GHL...`);

  while (page < MAX_PAGES) {
    const params = {
      locationId: GHL_LOCATION_ID,
      limit: 100,
    };
    if (startAfterId) params.startAfterId = startAfterId;

    const data = await ghlRequest('GET', '/contacts/', params);
    const contacts = data.contacts || [];

    if (contacts.length === 0) break;

    // Filtrar por tag
    const tagged = contacts.filter(c => {
      const tags = (c.tags || []).map(t => t.toLowerCase());
      return tags.includes(tag.toLowerCase());
    });

    for (const c of tagged) {
      if (c.phone) {
        allContacts.push({
          id: c.id,
          name: c.contactName || c.firstName || c.name || '',
          firstName: c.firstName || (c.contactName || '').split(' ')[0] || '',
          phone: c.phone,
          tags: c.tags || [],
        });
      }
    }

    // Próxima página
    startAfterId = contacts[contacts.length - 1]?.id;
    page++;

    console.log(`  Página ${page}: ${contacts.length} contatos, ${tagged.length} com tag "${tag}" (total: ${allContacts.length})`);

    // Se retornou menos que o limit, acabou
    if (contacts.length < 100) break;

    // Pequeno delay entre páginas para não throttle
    await sleep(500);
  }

  console.log(`✅ Total: ${allContacts.length} contatos com tag "${tag}" e telefone válido`);
  return allContacts;
}

// ============================================================
// Normalização de Telefone
// ============================================================

/**
 * Normaliza número de telefone para formato Stevo JID
 * @param {string} phone - Número em qualquer formato
 * @returns {string|null} JID formatado (5511999999999@s.whatsapp.net) ou null se inválido
 */
function normalizePhone(phone) {
  if (!phone) return null;

  // Remove tudo que não é número
  let digits = phone.replace(/\D/g, '');

  // Se começa com +, já removemos
  // Se tem 13 dígitos (55 + DDD + 9 dígitos) = OK
  // Se tem 12 dígitos (55 + DDD + 8 dígitos) = celular antigo, adicionar 9
  // Se tem 11 dígitos (DDD + 9 dígitos) = adicionar 55
  // Se tem 10 dígitos (DDD + 8 dígitos) = adicionar 55 + 9

  if (digits.length === 13 && digits.startsWith('55')) {
    // Formato completo: 5511999999999
  } else if (digits.length === 12 && digits.startsWith('55')) {
    // Sem o 9: 551199999999 → 5511999999999
    const ddd = digits.substring(2, 4);
    const number = digits.substring(4);
    digits = `55${ddd}9${number}`;
  } else if (digits.length === 12 && digits.startsWith('0')) {
    // 0 + DDD + 9 dígitos: 011999999999
    digits = `55${digits.substring(1)}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    // 0 + DDD + 8 dígitos: 01199999999
    const ddd = digits.substring(1, 3);
    const number = digits.substring(3);
    digits = `55${ddd}9${number}`;
  } else if (digits.length === 11) {
    // DDD + 9 dígitos: 11999999999
    digits = `55${digits}`;
  } else if (digits.length === 10) {
    // DDD + 8 dígitos: 1199999999
    const ddd = digits.substring(0, 2);
    const number = digits.substring(2);
    digits = `55${ddd}9${number}`;
  } else if (digits.length === 9) {
    // Só o número sem DDD (não sabemos o DDD, retorna null)
    return null;
  } else if (digits.length < 10 || digits.length > 13) {
    return null;
  }

  return `${digits}@s.whatsapp.net`;
}

// ============================================================
// Utils
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gera delay aleatório entre min e max (em minutos)
 * Inclui variação para parecer humano
 */
function randomDelay(minMinutes, maxMinutes) {
  const minMs = minMinutes * 60 * 1000;
  const maxMs = maxMinutes * 60 * 1000;
  return minMs + Math.random() * (maxMs - minMs);
}

/**
 * Verifica se estamos em horário comercial (9h-12h ou 14h-18h)
 */
function isBusinessHours() {
  const now = new Date();
  const hour = now.getHours();
  return (hour >= 6 && hour < 21);
}

/**
 * Calcula próximo horário comercial disponível
 */
function nextBusinessHourMs() {
  const now = new Date();
  const hour = now.getHours();

  if (hour < 6) {
    // Antes das 6h: espera até 6h
    const next = new Date(now);
    next.setHours(6, Math.floor(Math.random() * 15), 0, 0);
    return next.getTime() - now.getTime();
  } else if (hour >= 21) {
    // Depois das 21h: espera até amanhã 6h
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(6, Math.floor(Math.random() * 15), 0, 0);
    return next.getTime() - now.getTime();
  }

  return 0; // Já está em horário comercial
}

// ============================================================
// Campaign Engine
// ============================================================

let campaignRunning = false;
let campaignPaused = false;
let outreachLoopTimer = null;
let followupLoopTimer = null;
let sentToday = 0;
let lastSentDate = null;

const DAILY_LIMIT = 500;
const BATCH_SIZE = 35; // Pausa a cada N mensagens
const BATCH_PAUSE_MIN = 15; // Pausa de 15-25 min entre batches
const BATCH_PAUSE_MAX = 25;
const MSG_DELAY_MIN = 3; // 3-10 min entre mensagens
const MSG_DELAY_MAX = 10;
const FOLLOWUP_DELAY_MS = 30 * 60 * 1000; // 30 minutos
const FOLLOWUP_CHECK_INTERVAL = 60 * 1000; // Verifica a cada 1 min

/**
 * Importa contatos do GHL para o banco local
 * @param {string} tag - Tag para buscar (default: 'frio')
 * @returns {Promise<{imported: number, skipped: number, errors: number}>}
 */
async function importContacts(tag = 'frio') {
  initDB();
  const contacts = await fetchContactsByTag(tag);

  let imported = 0, skipped = 0, errors = 0;

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO cold_leads (ghl_contact_id, name, first_name, phone, phone_jid, gender, tag)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of contacts) {
    const jid = normalizePhone(c.phone);
    if (!jid) {
      errors++;
      continue;
    }

    // Verificar se já existe
    const existing = db.prepare('SELECT id FROM cold_leads WHERE ghl_contact_id = ?').get(c.id);
    if (existing) {
      skipped++;
      continue;
    }

    const gender = detectGender(c.firstName);
    const firstName = c.firstName || c.name.split(' ')[0] || '';

    insertStmt.run(c.id, c.name, firstName, c.phone, jid, gender, tag);
    imported++;
  }

  logAction('import', JSON.stringify({ tag, imported, skipped, errors, total: contacts.length }));

  console.log(`📥 Importação: ${imported} novos, ${skipped} já existiam, ${errors} inválidos`);
  return { imported, skipped, errors };
}

/**
 * Envia primeira mensagem para um lead
 * @param {Object} lead - Registro do banco cold_leads
 * @returns {Promise<boolean>}
 */
async function sendFirstMessage(lead) {
  const templates = TEMPLATES_FIRST_MSG[lead.gender] || TEMPLATES_FIRST_MSG.unknown;
  const { index, text } = selectVariant(templates, lead.first_name, lead.first_msg_variant);

  try {
    // Simular digitação
    await stevo.setPresence(lead.phone_jid, 'composing');
    await sleep(2000 + Math.random() * 3000);

    // Enviar
    await stevo.sendText(lead.phone_jid, text);

    // Atualizar DB
    getDB().prepare(`
      UPDATE cold_leads SET
        status = 'first_sent',
        first_msg_variant = ?,
        first_msg_sent_at = datetime('now')
      WHERE id = ?
    `).run(index, lead.id);

    logAction('first_msg', JSON.stringify({
      leadId: lead.id,
      name: lead.name,
      phone: lead.phone,
      variant: index,
    }));

    console.log(`📤 [${lead.id}] Primeira msg → ${lead.name} (${lead.gender}) | Variante ${index}`);
    return true;
  } catch (err) {
    getDB().prepare(`
      UPDATE cold_leads SET status = 'error', error_message = ? WHERE id = ?
    `).run(err.message, lead.id);

    logAction('error', JSON.stringify({ leadId: lead.id, name: lead.name, error: err.message }));
    console.error(`❌ [${lead.id}] Erro ao enviar para ${lead.name}: ${err.message}`);
    return false;
  }
}

/**
 * Envia follow-up para um lead
 * @param {Object} lead - Registro do banco cold_leads
 * @returns {Promise<boolean>}
 */
async function sendFollowup(lead) {
  const templates = TEMPLATES_FOLLOWUP[lead.gender] || TEMPLATES_FOLLOWUP.unknown;
  const { index, text } = selectVariant(templates, lead.first_name, lead.followup_variant);

  try {
    // Simular digitação (curta, pois follow-up é msg curta)
    await stevo.setPresence(lead.phone_jid, 'composing');
    await sleep(1000 + Math.random() * 1500);

    // Enviar
    await stevo.sendText(lead.phone_jid, text);

    // Atualizar DB
    getDB().prepare(`
      UPDATE cold_leads SET
        status = 'followup_sent',
        followup_variant = ?,
        followup_sent_at = datetime('now')
      WHERE id = ?
    `).run(index, lead.id);

    logAction('followup', JSON.stringify({ leadId: lead.id, name: lead.name, variant: index }));
    console.log(`📤 [${lead.id}] Follow-up → ${lead.name} | "${text}"`);
    return true;
  } catch (err) {
    logAction('followup_error', JSON.stringify({ leadId: lead.id, error: err.message }));
    console.error(`❌ [${lead.id}] Erro follow-up ${lead.name}: ${err.message}`);
    return false;
  }
}

/**
 * Processa resposta de um lead — ponto de entrada para TODAS as respostas
 * Gerencia o fluxo de diálogo automaticamente
 *
 * Estados do diálogo:
 *   initial       → primeira resposta
 *   investigating → enviamos pergunta investigativa, aguardando resposta
 *   closed        → encerrado (não-dentista confirmado)
 *   eric_takeover → Eric assume manualmente
 *
 * @param {string} phoneJid - JID do WhatsApp
 * @param {string} responseText - Texto da resposta
 */
async function handleLeadResponse(phoneJid, responseText) {
  initDB();

  const lead = db.prepare(`
    SELECT * FROM cold_leads WHERE phone_jid = ?
  `).get(phoneJid);

  if (!lead) return null;

  // Se já encerrado ou Eric assumiu, ignorar
  if (lead.dialog_state === 'closed' || lead.dialog_state === 'eric_takeover') return lead;

  const dialogState = lead.dialog_state || 'initial';
  const classification = await classifyResponse(responseText, dialogState);

  console.log(`💬 [${lead.id}] Resposta de ${lead.name} (estado: ${dialogState}): "${responseText}" → ${classification}`);

  // Registrar resposta
  db.prepare(`
    UPDATE cold_leads SET
      responded = 1,
      responded_at = COALESCE(responded_at, datetime('now')),
      response_text = COALESCE(response_text || ' | ', '') || ?,
      status = CASE WHEN status = 'pending' OR status = 'first_sent' OR status = 'followup_sent' THEN 'responded' ELSE status END
    WHERE id = ?
  `).run(responseText || '', lead.id);

  logAction('response', JSON.stringify({ leadId: lead.id, name: lead.name, state: dialogState, classification, text: responseText }));

  // ── Fluxo de diálogo ──────────────────────────────────────

  if (dialogState === 'investigating') {
    // Estávamos aguardando resposta à pergunta investigativa
    if (classification === 'not_dentist') {
      // Confirmado: não é dentista → desqualificar no GHL + encerrar
      await disqualifyLead(lead);

    } else if (classification === 'is_dentist') {
      // É dentista! → Eric assume
      db.prepare(`UPDATE cold_leads SET dialog_state = 'eric_takeover', status = 'eric_takeover' WHERE id = ?`).run(lead.id);

      irisTelegram.sendMessage(TELEGRAM_CHAT_ID,
        `🦷 DENTISTA CONFIRMADO na prospecção fria!\n\n` +
        `Nome: ${lead.name}\n` +
        `Tel: ${lead.phone}\n` +
        `Resposta: "${responseText}"\n\n` +
        `⚡ Assuma agora no Nico/Stevo!`
      ).catch(() => {});

      console.log(`🦷 [${lead.id}] DENTISTA CONFIRMADO: ${lead.name}`);
    }

  } else {
    // Primeira resposta (estado initial / responded)
    if (classification === 'wrong_number') {
      // Parecer de engano → disparar pergunta investigativa
      await sendInvestigativeQuestion(lead);

    } else {
      // Resposta positiva ou desconhecida → Eric assume
      db.prepare(`UPDATE cold_leads SET dialog_state = 'eric_takeover', status = 'eric_takeover' WHERE id = ?`).run(lead.id);

      irisTelegram.sendMessage(TELEGRAM_CHAT_ID,
        `🔥 Lead respondeu na prospecção fria!\n\n` +
        `Nome: ${lead.name}\n` +
        `Tel: ${lead.phone}\n` +
        `Resposta: "${responseText}"\n\n` +
        `Assuma o atendimento no Nico/Stevo.`
      ).catch(() => {});
    }
  }

  return lead;
}

// Alias mantido para compatibilidade
function markAsResponded(phoneJid, responseText) {
  return handleLeadResponse(phoneJid, responseText);
}

/**
 * Dispara manualmente a pergunta investigativa para um número específico
 * Útil quando o lead já respondeu fora do sistema (ex: via Nico Web)
 * @param {string} phone - Número no formato +55 31 9999-9999 ou qualquer formato
 */
async function manualInvestigate(phone) {
  initDB();
  const jid = normalizePhone(phone);
  if (!jid) return { success: false, error: 'Número inválido' };

  let lead = db.prepare('SELECT * FROM cold_leads WHERE phone_jid = ?').get(jid);

  // Se não existe no banco, criar registro ad-hoc
  if (!lead) {
    db.prepare(`
      INSERT OR IGNORE INTO cold_leads (ghl_contact_id, name, first_name, phone, phone_jid, gender, tag, status, responded, dialog_state)
      VALUES (?, ?, ?, ?, ?, 'unknown', 'manual', 'responded', 1, 'initial')
    `).run(`manual_${jid}`, phone, phone.split(' ').pop(), phone, jid);

    lead = db.prepare('SELECT * FROM cold_leads WHERE phone_jid = ?').get(jid);
  }

  if (!lead) return { success: false, error: 'Falha ao criar lead' };

  // Se já encerrado, não reenviar
  if (lead.dialog_state === 'closed') {
    return { success: false, error: 'Conversa já encerrada para este número' };
  }

  const ok = await sendInvestigativeQuestion(lead);
  return { success: ok, phone, jid };
}

/**
 * Verifica se um número é da campanha cold
 * @param {string} phoneJid - JID do WhatsApp
 * @returns {boolean}
 */
function isInCampaign(phoneJid) {
  initDB();
  const lead = db.prepare('SELECT id FROM cold_leads WHERE phone_jid = ?').get(phoneJid);
  return !!lead;
}

/**
 * Reseta o contador diário se mudou o dia
 */
function checkDailyReset() {
  const today = new Date().toISOString().split('T')[0];
  if (lastSentDate !== today) {
    sentToday = 0;
    lastSentDate = today;
    setState('sent_today', '0');
    setState('last_sent_date', today);
  }
}

/**
 * Loop principal de envio de primeiras mensagens
 */
async function outreachLoop() {
  if (!campaignRunning || campaignPaused) return;

  checkDailyReset();

  // Verificar limite diário
  if (sentToday >= DAILY_LIMIT) {
    console.log(`⏸️ Limite diário atingido (${DAILY_LIMIT}). Retomando amanhã.`);
    const waitMs = nextBusinessHourMs();
    if (waitMs > 0) {
      outreachLoopTimer = setTimeout(outreachLoop, waitMs);
      return;
    }
  }

  // Verificar horário comercial
  if (!isBusinessHours()) {
    const waitMs = nextBusinessHourMs();
    console.log(`⏸️ Fora do horário comercial. Próximo envio em ${Math.round(waitMs / 60000)} min.`);
    outreachLoopTimer = setTimeout(outreachLoop, waitMs);
    return;
  }

  // Buscar próximo lead pendente
  const lead = getDB().prepare(`
    SELECT * FROM cold_leads WHERE status = 'pending' ORDER BY id ASC LIMIT 1
  `).get();

  if (!lead) {
    console.log('✅ Todos os leads foram contatados! Campanha finalizada.');
    setState('status', 'completed');
    logAction('completed', 'Todos os leads foram contatados');

    // Notificar Eric
    const stats = getCampaignStats();
    irisTelegram.sendMessage(TELEGRAM_CHAT_ID,
      `✅ Campanha cold outreach finalizada!\n\n` +
      `Total: ${stats.total}\n` +
      `Enviados: ${stats.firstSent + stats.followupSent}\n` +
      `Responderam: ${stats.responded}\n` +
      `Erros: ${stats.errors}`
    ).catch(() => {});

    campaignRunning = false;
    return;
  }

  // Enviar primeira mensagem
  const success = await sendFirstMessage(lead);

  if (success) {
    sentToday++;
    setState('sent_today', String(sentToday));
    setState('last_lead_id', String(lead.id));
  }

  // Delay baseado no resultado
  let delayMs;

  if (!success) {
    // Erro (número inválido/sem WhatsApp): delay curto para pular logo
    delayMs = 15000 + Math.random() * 30000; // 15-45 segundos
  } else {
    // Envio bem-sucedido: delay anti-ban + pausa de batch
    const batchCount = sentToday % BATCH_SIZE;
    if (batchCount === 0 && sentToday > 0) {
      delayMs = randomDelay(BATCH_PAUSE_MIN, BATCH_PAUSE_MAX);
      console.log(`⏸️ Pausa de batch (${Math.round(delayMs / 60000)} min) após ${sentToday} mensagens`);
    } else {
      delayMs = randomDelay(MSG_DELAY_MIN, MSG_DELAY_MAX);
    }
  }

  outreachLoopTimer = setTimeout(outreachLoop, delayMs);
}

/**
 * Loop de follow-up (verifica leads que precisam de follow-up a cada 1 min)
 */
async function followupLoop() {
  if (!campaignRunning) return;
  if (campaignPaused) {
    followupLoopTimer = setTimeout(followupLoop, FOLLOWUP_CHECK_INTERVAL);
    return;
  }

  // Verificar horário comercial
  if (!isBusinessHours()) {
    followupLoopTimer = setTimeout(followupLoop, FOLLOWUP_CHECK_INTERVAL);
    return;
  }

  // Buscar leads que receberam primeira msg há 30+ min e ainda não receberam follow-up
  const cutoffSeconds = FOLLOWUP_DELAY_MS / 1000;
  const leads = getDB().prepare(`
    SELECT * FROM cold_leads
    WHERE status = 'first_sent'
      AND responded = 0
      AND (julianday('now') - julianday(first_msg_sent_at)) * 86400 >= ?
    ORDER BY first_msg_sent_at ASC
    LIMIT 5
  `).all(cutoffSeconds);

  for (const lead of leads) {
    // Delay curto entre follow-ups (30s - 2min)
    await sleep(30000 + Math.random() * 90000);

    if (!campaignRunning || campaignPaused) break;

    await sendFollowup(lead);
  }

  followupLoopTimer = setTimeout(followupLoop, FOLLOWUP_CHECK_INTERVAL);
}

/**
 * Inicia a campanha
 * @param {Object} options
 * @param {string} [options.tag='frio'] - Tag dos contatos no GHL
 * @param {boolean} [options.importFirst=true] - Importar contatos antes de iniciar
 */
async function startCampaign(options = {}) {
  const tag = options.tag || 'frio';

  if (campaignRunning) {
    return { success: false, error: 'Campanha já está rodando. Use pause/resume.' };
  }

  initDB();

  // Importar contatos se necessário
  if (options.importFirst !== false) {
    console.log('📋 Importando contatos do GHL...');
    const result = await importContacts(tag);

    if (result.imported === 0 && result.skipped === 0) {
      return { success: false, error: `Nenhum contato encontrado com tag "${tag}" no GHL` };
    }
  }

  // Restaurar contador diário
  const savedDate = getState('last_sent_date');
  const savedCount = getState('sent_today');
  const today = new Date().toISOString().split('T')[0];

  if (savedDate === today && savedCount) {
    sentToday = parseInt(savedCount, 10) || 0;
  } else {
    sentToday = 0;
  }
  lastSentDate = today;

  campaignRunning = true;
  campaignPaused = false;
  setState('status', 'running');
  logAction('start', JSON.stringify({ tag }));

  const stats = getCampaignStats();

  console.log(`\n🚀 CAMPANHA COLD OUTREACH INICIADA`);
  console.log(`   Tag: "${tag}"`);
  console.log(`   Total leads: ${stats.total}`);
  console.log(`   Pendentes: ${stats.pending}`);
  console.log(`   Já enviados: ${stats.firstSent}`);
  console.log(`   Enviados hoje: ${sentToday}/${DAILY_LIMIT}`);
  console.log(`   Cadência: ${MSG_DELAY_MIN}-${MSG_DELAY_MAX} min entre msgs`);
  console.log(`   Batch pause: a cada ${BATCH_SIZE} msgs, ${BATCH_PAUSE_MIN}-${BATCH_PAUSE_MAX} min\n`);

  // Notificar Eric
  irisTelegram.sendMessage(TELEGRAM_CHAT_ID,
    `🚀 Campanha cold outreach INICIADA\n\n` +
    `Tag: "${tag}"\n` +
    `Total: ${stats.total} leads\n` +
    `Pendentes: ${stats.pending}\n` +
    `Cadência: ${MSG_DELAY_MIN}-${MSG_DELAY_MAX} min\n\n` +
    `Estimativa: ~${Math.ceil(stats.pending / DAILY_LIMIT)} dias para completar`
  ).catch(() => {});

  // Iniciar loops
  outreachLoop();
  followupLoop();

  return { success: true, stats };
}

function pauseCampaign() {
  if (!campaignRunning) return { success: false, error: 'Campanha não está rodando' };

  campaignPaused = true;
  setState('status', 'paused');
  logAction('pause', `Pausada com ${sentToday} msgs enviadas hoje`);

  console.log('⏸️ Campanha pausada');
  return { success: true };
}

function resumeCampaign() {
  if (!campaignRunning) return { success: false, error: 'Campanha não está rodando' };
  if (!campaignPaused) return { success: false, error: 'Campanha não está pausada' };

  campaignPaused = false;
  setState('status', 'running');
  logAction('resume', `Retomada com ${sentToday} msgs enviadas hoje`);

  console.log('▶️ Campanha retomada');

  // Reiniciar outreach loop
  outreachLoop();

  return { success: true };
}

function stopCampaign() {
  campaignRunning = false;
  campaignPaused = false;

  if (outreachLoopTimer) {
    clearTimeout(outreachLoopTimer);
    outreachLoopTimer = null;
  }
  if (followupLoopTimer) {
    clearTimeout(followupLoopTimer);
    followupLoopTimer = null;
  }

  setState('status', 'stopped');
  logAction('stop', `Parada com ${sentToday} msgs enviadas hoje`);

  console.log('⏹️ Campanha parada');
  return { success: true };
}

/**
 * Retorna estatísticas da campanha
 */
function getCampaignStats() {
  initDB();

  const total = db.prepare('SELECT COUNT(*) as c FROM cold_leads').get().c;
  const pending = db.prepare("SELECT COUNT(*) as c FROM cold_leads WHERE status = 'pending'").get().c;
  const firstSent = db.prepare("SELECT COUNT(*) as c FROM cold_leads WHERE status = 'first_sent'").get().c;
  const followupSent = db.prepare("SELECT COUNT(*) as c FROM cold_leads WHERE status = 'followup_sent'").get().c;
  const responded = db.prepare("SELECT COUNT(*) as c FROM cold_leads WHERE responded = 1").get().c;
  const errors = db.prepare("SELECT COUNT(*) as c FROM cold_leads WHERE status = 'error'").get().c;

  const genderBreakdown = db.prepare(`
    SELECT gender, COUNT(*) as c FROM cold_leads GROUP BY gender
  `).all();

  const recentResponses = db.prepare(`
    SELECT name, phone, response_text, responded_at
    FROM cold_leads WHERE responded = 1
    ORDER BY responded_at DESC LIMIT 10
  `).all();

  return {
    total,
    pending,
    firstSent,
    followupSent,
    responded,
    errors,
    sentToday,
    dailyLimit: DAILY_LIMIT,
    isRunning: campaignRunning,
    isPaused: campaignPaused,
    genderBreakdown: genderBreakdown.reduce((acc, g) => { acc[g.gender] = g.c; return acc; }, {}),
    recentResponses,
  };
}

/**
 * Lista leads com filtro
 * @param {Object} options
 * @param {string} [options.status] - Filtrar por status
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 */
function getLeads(options = {}) {
  initDB();

  let query = 'SELECT * FROM cold_leads';
  const params = [];

  if (options.status) {
    query += ' WHERE status = ?';
    params.push(options.status);
  }

  query += ' ORDER BY id ASC';
  query += ` LIMIT ${options.limit || 50} OFFSET ${options.offset || 0}`;

  return db.prepare(query).all(...params);
}

/**
 * Envia mensagem de teste para um número específico
 * Útil para testar antes de iniciar a campanha
 */
async function sendTestMessage(phone, name = 'Teste', gender = 'male') {
  const jid = normalizePhone(phone);
  if (!jid) return { success: false, error: 'Número inválido' };

  const templates = TEMPLATES_FIRST_MSG[gender] || TEMPLATES_FIRST_MSG.unknown;
  const { index, text } = selectVariant(templates, name);

  try {
    await stevo.setPresence(jid, 'composing');
    await sleep(2000);
    await stevo.sendText(jid, text);

    console.log(`🧪 Teste enviado → ${phone}: "${text}"`);
    return { success: true, text, variant: index };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Envia relatório de progresso via Telegram
 */
async function sendProgressReport() {
  const stats = getCampaignStats();
  const responseRate = stats.total > 0
    ? ((stats.responded / (stats.firstSent + stats.followupSent || 1)) * 100).toFixed(1)
    : '0';

  const msg = [
    `📊 RELATÓRIO - Cold Outreach`,
    ``,
    `Total: ${stats.total} leads`,
    `Pendentes: ${stats.pending}`,
    `1ª msg enviada: ${stats.firstSent}`,
    `Follow-up enviado: ${stats.followupSent}`,
    `Responderam: ${stats.responded} (${responseRate}%)`,
    `Erros: ${stats.errors}`,
    `Hoje: ${stats.sentToday}/${stats.dailyLimit}`,
    ``,
    `Gêneros: M:${stats.genderBreakdown.male || 0} F:${stats.genderBreakdown.female || 0} ?:${stats.genderBreakdown.unknown || 0}`,
    `Status: ${stats.isRunning ? (stats.isPaused ? '⏸️ Pausada' : '▶️ Rodando') : '⏹️ Parada'}`,
  ];

  if (stats.recentResponses.length > 0) {
    msg.push('', '🔥 Últimas respostas:');
    for (const r of stats.recentResponses.slice(0, 5)) {
      msg.push(`  ${r.name}: "${r.response_text}"`);
    }
  }

  await irisTelegram.sendMessage(TELEGRAM_CHAT_ID, msg.join('\n'));
}

module.exports = {
  // Campaign control
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  stopCampaign,

  // Data
  importContacts,
  getCampaignStats,
  getLeads,
  sendTestMessage,
  sendProgressReport,

  // Response handling
  handleLeadResponse,
  markAsResponded,         // alias para compatibilidade
  manualInvestigate,
  isInCampaign,

  // Utils exportados para testes
  detectGender,
  normalizePhone,
  classifyResponse,

  // Templates (para review)
  TEMPLATES_FIRST_MSG,
  TEMPLATES_FOLLOWUP,
  TEMPLATES_INVESTIGATE,
  TEMPLATES_CLOSING,
};
