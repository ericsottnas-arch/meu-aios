/**
 * Cliente ClickUp API — criação de tarefas com campos completos.
 * Substitui a chamada via exec ao script create-clickup-task.js.
 */

const path = require('path');
const fs = require('fs');

// Garante que .env está carregado (necessário quando chamado via node -e fora do servidor)
if (!process.env.CLICKUP_API_KEY && !process.env.CLICKUP_API_TOKEN) {
  const localEnv = path.resolve(__dirname, '..', '.env');
  const parentEnv = path.resolve(__dirname, '..', '..', '.env');
  if (fs.existsSync(localEnv)) {
    require('dotenv').config({ path: localEnv });
  } else if (fs.existsSync(parentEnv)) {
    require('dotenv').config({ path: parentEnv });
  }
}

const API_KEY = (process.env.CLICKUP_API_KEY || process.env.CLICKUP_API_TOKEN || '').replace(/"/g, '').trim();
const LIST_ID = (process.env.CLICKUP_LIST_ID || '').replace(/"/g, '').trim();
const DEFAULT_STATUS = process.env.CLICKUP_DEFAULT_STATUS || 'NA FILA';

let cachedMembers = null;
let cachedTeamId = null;
let cachedClientOptions = null;

async function clickupFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `https://api.clickup.com/api/v2${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: API_KEY,
      ...options.headers,
    },
  });
  return res;
}

/**
 * Busca os membros do workspace/team.
 * @returns {Promise<Array<{id: number, name: string, email: string}>>}
 */
async function getTeamMembers() {
  if (cachedMembers) return cachedMembers;

  try {
    // Primeiro, obter o team ID
    const teamsRes = await clickupFetch('/team');
    if (!teamsRes.ok) {
      console.warn('⚠️  Não foi possível buscar teams do ClickUp');
      return [];
    }
    const teamsData = await teamsRes.json();
    const team = teamsData.teams?.[0];
    if (!team) return [];

    cachedTeamId = team.id;
    cachedMembers = (team.members || []).map((m) => ({
      id: m.user.id,
      name: m.user.username || m.user.email?.split('@')[0] || `User ${m.user.id}`,
      email: m.user.email,
    }));

    console.log(`📋 ClickUp: ${cachedMembers.length} membros carregados`);
    return cachedMembers;
  } catch (err) {
    console.warn('⚠️  Erro ao buscar membros ClickUp:', err.message);
    return [];
  }
}

/**
 * Busca as opções do campo personalizado "Cliente" da lista.
 * @returns {Promise<Array<{id: string, name: string, color: string}>>}
 */
async function getClientOptions() {
  if (cachedClientOptions) return cachedClientOptions;

  try {
    const res = await clickupFetch(`/list/${LIST_ID}/field`);
    if (!res.ok) {
      console.warn('⚠️  Não foi possível buscar custom fields do ClickUp');
      return [];
    }
    const data = await res.json();
    const clientField = (data.fields || []).find(
      (f) => f.name.toLowerCase() === 'cliente' && f.type === 'drop_down'
    );
    if (!clientField) {
      console.warn('⚠️  Campo "Cliente" não encontrado no ClickUp');
      return [];
    }

    cachedClientOptions = (clientField.type_config?.options || []).map((opt) => ({
      id: opt.id,
      name: opt.name,
      color: opt.color,
    }));

    console.log(`🏢 ClickUp: ${cachedClientOptions.length} clientes carregados`);
    return cachedClientOptions;
  } catch (err) {
    console.warn('⚠️  Erro ao buscar clientes ClickUp:', err.message);
    return [];
  }
}

/** ID do custom field "Cliente" no ClickUp */
const CLIENT_FIELD_ID = '96a22e9b-bbfc-4f45-b401-ef3ded63581f';

/**
 * Cria uma tarefa no ClickUp com campos completos.
 * @param {Object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {number} [params.priority] - 1 (urgent) a 4 (low)
 * @param {number} [params.dueDateMs] - Unix timestamp em ms
 * @param {number[]} [params.assignees] - Array de user IDs
 * @param {string[]} [params.tags] - Tags
 * @param {Array<{id: string, value: string}>} [params.customFields] - Custom fields
 * @returns {Promise<{id: string, name: string, url: string, customId: string}>}
 */
async function createTask({ title, description, priority, dueDateMs, assignees, tags, customFields }) {
  if (!API_KEY) throw new Error('CLICKUP_API_KEY não configurada');
  if (!LIST_ID) throw new Error('CLICKUP_LIST_ID não configurada');

  const body = {
    name: title,
    description: description || undefined,
    markdown_description: description || undefined,
    status: DEFAULT_STATUS,
  };

  if (priority && priority >= 1 && priority <= 4) {
    body.priority = priority;
  }
  if (dueDateMs) {
    body.due_date = dueDateMs;
    body.due_date_time = true;
  }
  if (assignees && assignees.length > 0) {
    body.assignees = assignees;
  }
  if (tags && tags.length > 0) {
    body.tags = tags;
  }
  if (customFields && customFields.length > 0) {
    body.custom_fields = customFields;
  }

  // Limpa undefined
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

  let res = await clickupFetch(`/list/${LIST_ID}/task`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  // Retry sem status se falhar
  if (!res.ok && body.status) {
    delete body.status;
    res = await clickupFetch(`/list/${LIST_ID}/task`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ClickUp API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    url: data.url || `https://app.clickup.com/t/${data.id}`,
    customId: data.custom_id || data.id,
  };
}

/**
 * Cria subtasks vinculadas a uma task pai.
 * @param {string} parentTaskId
 * @param {string[]} subtaskTitles
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
async function createSubtasks(parentTaskId, subtaskTitles) {
  if (!subtaskTitles || subtaskTitles.length === 0) return [];

  const results = [];
  for (const title of subtaskTitles) {
    try {
      const body = {
        name: title,
        parent: parentTaskId,
      };

      const res = await clickupFetch(`/list/${LIST_ID}/task`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        results.push({ id: data.id, name: data.name });
      } else {
        console.warn(`⚠️  Falha ao criar subtask "${title}"`);
      }
    } catch (err) {
      console.warn(`⚠️  Erro subtask "${title}":`, err.message);
    }
  }
  return results;
}

/**
 * Atualiza o nome de uma tarefa (para incluir o ID no título).
 * @param {string} taskId
 * @param {string} newName
 */
async function updateTaskName(taskId, newName) {
  try {
    await clickupFetch(`/task/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: newName }),
    });
  } catch (err) {
    console.warn(`⚠️  Erro ao atualizar nome da task:`, err.message);
  }
}

/**
 * Faz upload de um arquivo como anexo em uma tarefa.
 * @param {string} taskId
 * @param {string} fileName
 * @param {Buffer} buffer
 * @returns {Promise<{id: string, url: string}|null>}
 */
async function uploadAttachment(taskId, fileName, buffer) {
  if (!API_KEY) return null;

  try {
    const blob = new Blob([buffer]);
    const formData = new FormData();
    formData.append('attachment', blob, fileName);

    const url = `https://api.clickup.com/api/v2/task/${taskId}/attachment`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: API_KEY },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`⚠️  ClickUp attachment upload failed: ${res.status} ${errText}`);
      return null;
    }

    const data = await res.json();
    return { id: data.id, url: data.url };
  } catch (err) {
    console.warn('⚠️  ClickUp attachment error:', err.message);
    return null;
  }
}

/**
 * Busca por tarefas na equipe.
 * @param {string} searchText O texto para buscar no nome e conteúdo das tarefas.
 * @returns {Promise<Array<any>>} Uma lista de tarefas encontradas.
 */
async function searchTasks(searchText) {
  if (!cachedTeamId) {
    // Garante que o ID da equipe foi carregado
    await getTeamMembers();
  }
  if (!cachedTeamId) {
    console.warn('⚠️  Team ID do ClickUp não encontrado, não é possível buscar tarefas.');
    return [];
  }

  const params = new URLSearchParams({
    search: searchText,
    subtasks: 'true',
    include_closed: 'true',
  });

  const url = `/team/${cachedTeamId}/task?${params.toString()}`;

  try {
    const res = await clickupFetch(url);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ClickUp API [search] ${res.status}: ${errText}`);
    }
    const data = await res.json();
    return data.tasks || [];
  } catch (err) {
    console.error('Erro ao buscar tarefas no ClickUp:', err);
    return [];
  }
}

/**
 * Lista tarefas da lista com filtros opcionais.
 * @param {Object} [filters={}]
 * @param {string[]} [filters.statuses] - Filtrar por status (ex: ['TO DO', 'IN PROGRESS'])
 * @param {number[]} [filters.assignees] - Filtrar por assignees
 * @param {boolean} [filters.include_closed] - Incluir tarefas fechadas (default: false)
 * @param {number} [filters.page] - Número da página (default: 0)
 * @returns {Promise<{tasks: Array, total_count: number, page: number}|{tasks: [], total_count: 0, page: 0}>}
 */
async function listTasks(filters = {}) {
  if (!LIST_ID) {
    console.warn('⚠️  CLICKUP_LIST_ID não configurada');
    return { tasks: [], total_count: 0, page: 0 };
  }

  try {
    // Construir query string manualmente - ClickUp tem problema com URLSearchParams
    const queryParts = [];

    if (filters.statuses && filters.statuses.length > 0) {
      // ClickUp espera: ?statuses[]=STATUS1&statuses[]=STATUS2
      filters.statuses.forEach(status => {
        queryParts.push(`statuses[]=${encodeURIComponent(status)}`);
      });
    }
    if (filters.assignees && filters.assignees.length > 0) {
      filters.assignees.forEach(id => {
        queryParts.push(`assignees[]=${encodeURIComponent(id)}`);
      });
    }
    if (filters.subtasks) {
      queryParts.push('subtasks=true');
    }
    if (filters.include_closed !== undefined) {
      queryParts.push(`include_closed=${filters.include_closed ? 'true' : 'false'}`);
    }
    if (filters.page !== undefined) {
      queryParts.push(`page=${filters.page}`);
    }

    const queryString = queryParts.length > 0 ? '?' + queryParts.join('&') : '';
    const url = `/list/${LIST_ID}/task${queryString}`;
    const res = await clickupFetch(url);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ClickUp API ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return {
      tasks: data.tasks || [],
      total_count: data.total_count || 0,
      page: data.page || 0,
    };
  } catch (err) {
    console.error('Erro ao listar tarefas do ClickUp:', err.message);
    return { tasks: [], total_count: 0, page: 0 };
  }
}

/**
 * Lista tarefas de uma lista específica (por listId).
 * @param {string} listId
 * @param {Object} filters
 * @returns {Promise<{tasks: Array, total_count: number}>}
 */
async function listTasksInList(listId, filters = {}) {
  const queryParts = [];
  if (filters.subtasks) queryParts.push('subtasks=true');
  if (filters.include_closed) queryParts.push('include_closed=true');
  if (filters.page !== undefined) queryParts.push(`page=${filters.page}`);

  const qs = queryParts.length > 0 ? '?' + queryParts.join('&') : '';
  const res = await clickupFetch(`/list/${listId}/task${qs}`);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ClickUp API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return { tasks: data.tasks || [], total_count: data.total_count || 0 };
}

/**
 * Atualiza o status de uma tarefa.
 * @param {string} taskId
 * @param {string} status - O novo status (ex: 'IN PROGRESS', 'DONE')
 * @returns {Promise<{id: string, status: string}|null>}
 */
async function updateTaskStatus(taskId, status) {
  if (!API_KEY) {
    console.warn('⚠️  CLICKUP_API_KEY não configurada');
    return null;
  }

  try {
    const res = await clickupFetch(`/task/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ClickUp API ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return {
      id: data.id,
      status: data.status?.status || status,
    };
  } catch (err) {
    console.error('Erro ao atualizar status da tarefa:', err.message);
    return null;
  }
}

/**
 * Busca os status disponíveis para a lista.
 * @returns {Promise<Array<{id: string, status: string, color: string, orderindex: number}>>}
 */
async function getListStatuses() {
  if (!LIST_ID) {
    console.warn('⚠️  CLICKUP_LIST_ID não configurada');
    return [];
  }

  try {
    const res = await clickupFetch(`/list/${LIST_ID}`);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ClickUp API ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return (data.statuses || []).map((s) => ({
      id: s.id,
      status: s.status,
      color: s.color,
      orderindex: s.orderindex,
    }));
  } catch (err) {
    console.error('Erro ao buscar status da lista:', err.message);
    return [];
  }
}

/**
 * Busca detalhes completos de uma tarefa (incluindo custom_fields, parent, subtasks).
 * @param {string} taskId
 * @returns {Promise<Object>}
 */
async function getTask(taskId) {
  const res = await clickupFetch(`/task/${taskId}?include_subtasks=true`);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ClickUp API ${res.status}: ${errText}`);
  }
  return res.json();
}

/**
 * Busca os comentários de uma tarefa.
 * @param {string} taskId
 * @returns {Promise<Array<{text: string, user: string, date: string}>>}
 */
async function getTaskComments(taskId) {
  try {
    const res = await clickupFetch(`/task/${taskId}/comment`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.comments || []).map(c => ({
      text: c.comment_text || '',
      user: c.user?.username || c.user?.email || 'desconhecido',
      date: c.date ? new Date(Number(c.date)).toISOString() : '',
    }));
  } catch (err) {
    console.warn('⚠️  Erro ao buscar comentários:', err.message);
    return [];
  }
}

// ============================================================
// Criação de Listas (onboarding de clientes)
// ============================================================

const FOLDER_ID = '90130944836'; // Folder "Clientes" no Space SYRA DIGITAL

/** Statuses padrão Kanban — mesmo padrão da lista TAREFAS original */
const KANBAN_STATUSES = [
  { status: 'na fila',              color: '#8d8d8d', orderindex: 0, type: 'open'   },
  { status: 'andamento',            color: '#f76808', orderindex: 1, type: 'custom' },
  { status: 'aguardando cliente',   color: '#e5484d', orderindex: 2, type: 'custom' },
  { status: 'revisão',              color: '#ffc53d', orderindex: 3, type: 'custom' },
  { status: 'aprovação cliente',    color: '#6647f0', orderindex: 4, type: 'custom' },
  { status: 'tráfego',              color: '#0091ff', orderindex: 5, type: 'custom' },
  { status: 'complete',             color: '#008844', orderindex: 6, type: 'closed' },
];

/**
 * Cria uma nova Lista dentro do Folder "Clientes" com os statuses Kanban padrão.
 * @param {string} listName - Nome da lista (ex: "Dra. Bruna Nogueira")
 * @returns {Promise<{id: string, name: string, url: string}>}
 */
async function createClientList(listName) {
  if (!API_KEY) throw new Error('CLICKUP_API_KEY não configurada');

  const body = {
    name: listName,
    statuses: KANBAN_STATUSES,
  };

  const res = await clickupFetch(`/folder/${FOLDER_ID}/list`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ClickUp createList ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    url: `https://app.clickup.com/${data.id}`,
  };
}

/**
 * Cria uma tarefa em uma lista específica (não na LIST_ID padrão).
 * @param {string} listId - ID da lista destino
 * @param {Object} params - Mesmos params do createTask
 * @returns {Promise<{id: string, name: string, url: string}>}
 */
async function createTaskInList(listId, { title, description, priority, dueDateMs, assignees, tags }) {
  if (!API_KEY) throw new Error('CLICKUP_API_KEY não configurada');

  const body = {
    name: title,
    description: description || undefined,
    status: DEFAULT_STATUS,
  };

  if (priority && priority >= 1 && priority <= 4) body.priority = priority;
  if (dueDateMs) { body.due_date = dueDateMs; body.due_date_time = true; }
  if (assignees && assignees.length > 0) body.assignees = assignees;
  if (tags && tags.length > 0) body.tags = tags;

  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

  let res = await clickupFetch(`/list/${listId}/task`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res.ok && body.status) {
    delete body.status;
    res = await clickupFetch(`/list/${listId}/task`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ClickUp API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    url: data.url || `https://app.clickup.com/t/${data.id}`,
  };
}

/**
 * Cria subtasks numa lista específica.
 */
async function createSubtasksInList(listId, parentTaskId, subtaskTitles) {
  if (!subtaskTitles || subtaskTitles.length === 0) return [];

  const results = [];
  for (const title of subtaskTitles) {
    try {
      const res = await clickupFetch(`/list/${listId}/task`, {
        method: 'POST',
        body: JSON.stringify({ name: title, parent: parentTaskId }),
      });

      if (res.ok) {
        const data = await res.json();
        results.push({ id: data.id, name: data.name });
      } else {
        console.warn(`⚠️  Falha ao criar subtask "${title}"`);
      }
    } catch (err) {
      console.warn(`⚠️  Erro subtask "${title}":`, err.message);
    }
  }
  return results;
}

/**
 * Lista todas as listas dentro do Folder "Clientes".
 * @returns {Promise<Array<{id: string, name: string, taskCount: number}>>}
 */
async function listClientLists() {
  const res = await clickupFetch(`/folder/${FOLDER_ID}`);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ClickUp API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return (data.lists || []).map((l) => ({
    id: l.id,
    name: l.name,
    taskCount: l.task_count || 0,
  }));
}

// ============================================================
// Mapeamento Cliente → Lista (cache)
// ============================================================

let cachedClientListMap = null;

/**
 * Retorna mapa de nome de cliente (lowercase) → listId.
 * Usado para rotear tarefas para a lista correta do cliente.
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<Map<string, {id: string, name: string}>>}
 */
async function getClientListMap(forceRefresh = false) {
  if (cachedClientListMap && !forceRefresh) return cachedClientListMap;

  const lists = await listClientLists();
  cachedClientListMap = new Map();
  for (const l of lists) {
    cachedClientListMap.set(l.name.toLowerCase(), { id: l.id, name: l.name });
  }
  return cachedClientListMap;
}

/**
 * Normaliza string para comparação (remove acentos, lowercase).
 */
function normalizeForMatch(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Busca o list ID do cliente pelo nome (fuzzy match com normalização de acentos).
 * @param {string} clientName - Nome do cliente (ex: "Dr. Erico Servano", "Dra Vanessa")
 * @returns {Promise<string|null>} listId ou null se não encontrado
 */
async function findClientListId(clientName) {
  const map = await getClientListMap();
  const norm = normalizeForMatch(clientName);

  // Match exato (normalizado)
  for (const [key, val] of map) {
    if (normalizeForMatch(key) === norm) return val.id;
  }

  // Match parcial (substring)
  for (const [key, val] of map) {
    const keyNorm = normalizeForMatch(key);
    if (keyNorm.includes(norm) || norm.includes(keyNorm)) return val.id;
  }

  // Match sem prefixo (Dr/Dra/Prof.)
  const stripped = norm.replace(/^(dr\.?|dra\.?|prof\.?\s*(dr\.?)?)\s*/i, '').trim();
  if (stripped.length < 3) return null; // evitar matches muito curtos

  for (const [key, val] of map) {
    const keyStripped = normalizeForMatch(key).replace(/^(dr\.?|dra\.?|prof\.?\s*(dr\.?)?)\s*/i, '').trim();
    if (keyStripped === stripped || keyStripped.includes(stripped) || stripped.includes(keyStripped)) {
      return val.id;
    }
  }

  return null;
}

// ============================================================
// Desativação de Clientes
// ============================================================

/**
 * Desativa um cliente — arquiva sua lista no ClickUp.
 * A lista some da visualização geral mas tarefas ficam preservadas.
 * @param {string} listId - ID da lista do cliente
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function deactivateClientList(listId) {
  const res = await clickupFetch(`/list/${listId}`, {
    method: 'PUT',
    body: JSON.stringify({ archived: true }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ClickUp deactivate ${res.status}: ${errText}`);
  }

  cachedClientListMap = null;

  const data = await res.json();
  return { success: true, message: `Lista "${data.name}" arquivada (removida da visualização geral)` };
}

/**
 * Reativa um cliente — desarquiva sua lista no ClickUp.
 * @param {string} listId - ID da lista do cliente
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function reactivateClientList(listId) {
  const res = await clickupFetch(`/list/${listId}`, {
    method: 'PUT',
    body: JSON.stringify({ archived: false }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ClickUp reactivate ${res.status}: ${errText}`);
  }

  cachedClientListMap = null;

  const data = await res.json();
  return { success: true, message: `Lista "${data.name}" reativada em Clientes` };
}

/**
 * Lista clientes inativos (arquivados).
 */
async function listInactiveClients() {
  const res = await clickupFetch(`/folder/${FOLDER_ID}?archived=true`);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.lists || [])
    .filter((l) => l.archived)
    .map((l) => ({
      id: l.id,
      name: l.name,
      taskCount: l.task_count || 0,
    }));
}

/**
 * Adiciona um comentário em uma tarefa existente.
 * Usado por agentes especialistas para documentar suas contribuições.
 * @param {string} taskId
 * @param {string} commentText - Texto do comentário (suporta Markdown)
 * @returns {Promise<{id: string}|null>}
 */
async function addTaskComment(taskId, commentText) {
  if (!API_KEY) {
    console.warn('⚠️  CLICKUP_API_KEY não configurada');
    return null;
  }

  try {
    const res = await clickupFetch(`/task/${taskId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment_text: commentText }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`⚠️  Erro ao adicionar comentário ClickUp: ${res.status} ${errText}`);
      return null;
    }

    const data = await res.json();
    return { id: data.id };
  } catch (err) {
    console.warn('⚠️  Erro addTaskComment:', err.message);
    return null;
  }
}

module.exports = {
  getTeamMembers,
  getClientOptions,
  CLIENT_FIELD_ID,
  FOLDER_ID,
  KANBAN_STATUSES,
  createTask,
  createSubtasks,
  updateTaskName,
  uploadAttachment,
  searchTasks,
  listTasks,
  listTasksInList,
  updateTaskStatus,
  getListStatuses,
  getTask,
  getTaskComments,
  addTaskComment,
  createClientList,
  createTaskInList,
  createSubtasksInList,
  listClientLists,
  getClientListMap,
  findClientListId,
  deactivateClientList,
  reactivateClientList,
  listInactiveClients,
};
