/**
 * ClickUp Notifier — Notificações WhatsApp de progresso de tarefas.
 *
 * Dois caminhos de trigger:
 *   1. Bot Alex (Telegram) → chamada direta após updateTaskStatus
 *   2. Polling a cada 2 min → detecta mudanças feitas no board do ClickUp
 *
 * Arquitetura lista-por-cliente:
 *   - Cada cliente tem sua própria lista no ClickUp (Folder "Clientes")
 *   - Grupo WhatsApp mapeado via CLIENTES-CONFIG.json (integrations.groupJid)
 *   - O nome da lista indica o cliente (não precisa de custom field)
 *
 * Mensagens humanizadas via Groq — saudação por horário, resumo dos
 * comentários da tarefa, subtarefas concluídas, linguagem simples e clara.
 */

const fs = require('fs');
const path = require('path');
const clickup = require('./clickup');
const stevo = require('./stevo');

const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const LINK_FIELD_ID = '3bb60a36-cf97-4793-8668-ffc44147920a';

const CONFIG_PATH = path.resolve(__dirname, '..', '..', 'docs', 'clientes', 'CLIENTES-CONFIG.json');

// --- Client → Group Mapping (from CLIENTES-CONFIG.json) ---
// Map<listId, { clientName, groupJid }>
let clientListGroupMap = new Map();

function loadClientGroups() {
  clientListGroupMap.clear();

  // 1. Carregar da env var (legado, backwards compat)
  const raw = (process.env.CLICKUP_CLIENT_GROUPS || '').trim();
  const envGroups = new Map();
  if (raw) {
    raw.split(',').forEach(pair => {
      const sep = pair.lastIndexOf(':');
      if (sep <= 0) return;
      const clientName = pair.substring(0, sep).trim();
      const groupJid = pair.substring(sep + 1).trim();
      if (clientName && groupJid) {
        envGroups.set(clientName.toUpperCase(), groupJid);
      }
    });
  }

  // 2. Carregar do CLIENTES-CONFIG.json (fonte principal)
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    for (const [, client] of Object.entries(config.clients || {})) {
      if (client.status !== 'active') continue;
      const groupJid = client.integrations?.groupJid;
      if (!groupJid) continue;
      const listId = client.integrations?.clickupListId;
      if (listId) {
        clientListGroupMap.set(listId, {
          clientName: client.name,
          groupJid,
        });
      }
    }
  } catch (err) {
    console.warn('⚠️  Notifier: Erro ao ler CLIENTES-CONFIG.json:', err.message);
  }

  // 3. Merge env groups (para clientes que ainda não passaram pelo onboarding novo)
  // Estes serão resolvidos pelo nome do cliente na hora da notificação
  if (envGroups.size > 0) {
    for (const [name, jid] of envGroups) {
      // Guardar como fallback
      clientListGroupMap.set(`env:${name}`, { clientName: name, groupJid: jid });
    }
  }

  const configCount = [...clientListGroupMap.keys()].filter(k => !String(k).startsWith('env:')).length;
  const envCount = envGroups.size;
  console.log(`📱 ClickUp Notifier: ${configCount} lista(s) mapeada(s) via config${envCount ? `, ${envCount} via env` : ''}`);
}

// --- Deduplicação (10 min TTL) ---
const recentlyNotified = new Map();
const DEDUP_TTL_MS = 10 * 60 * 1000;

// --- Agrupamento de mensagens por grupo (10 min window) ---
// Map<groupJid, { sentAt: number, taskNames: string[] }>
const recentGroupMessages = new Map();

function isDuplicate(taskId) {
  const last = recentlyNotified.get(taskId);
  if (!last) return false;
  if (Date.now() - last > DEDUP_TTL_MS) {
    recentlyNotified.delete(taskId);
    return false;
  }
  return true;
}

function markNotified(taskId) {
  recentlyNotified.set(taskId, Date.now());
  if (recentlyNotified.size > 200) {
    const now = Date.now();
    for (const [id, ts] of recentlyNotified) {
      if (now - ts > DEDUP_TTL_MS) recentlyNotified.delete(id);
    }
  }
}

// --- Polling Snapshot ---
// Map<taskId, statusString>
let statusSnapshot = new Map();
let snapshotInitialized = false;

async function initialize() {
  loadClientGroups();

  if (clientListGroupMap.size === 0) {
    console.log('📱 ClickUp Notifier: Nenhum grupo configurado');
    return;
  }

  try {
    // Carregar snapshot de todas as listas de clientes
    const clientLists = await clickup.listClientLists();
    let totalTasks = 0;

    for (const list of clientLists) {
      try {
        const { tasks } = await clickup.listTasksInList(list.id, { subtasks: true, include_closed: true });
        for (const task of tasks) {
          statusSnapshot.set(task.id, task.status?.status || '');
        }
        totalTasks += tasks.length;
      } catch (err) {
        console.warn(`⚠️  Notifier: Erro ao carregar lista "${list.name}":`, err.message);
      }
    }

    snapshotInitialized = true;
    console.log(`📱 ClickUp Notifier: Snapshot inicial com ${totalTasks} tarefas de ${clientLists.length} listas`);
  } catch (err) {
    console.warn('⚠️  ClickUp Notifier: Erro ao criar snapshot inicial:', err.message);
  }
}

async function pollForCompletions() {
  if (clientListGroupMap.size === 0) return;

  try {
    const clientLists = await clickup.listClientLists();

    if (!snapshotInitialized) {
      for (const list of clientLists) {
        try {
          const { tasks } = await clickup.listTasksInList(list.id, { subtasks: true, include_closed: true });
          for (const task of tasks) {
            statusSnapshot.set(task.id, task.status?.status || '');
          }
        } catch { /* skip */ }
      }
      snapshotInitialized = true;
      console.log(`📱 Poll: Snapshot inicial salvo`);
      return;
    }

    for (const list of clientLists) {
      try {
        const { tasks } = await clickup.listTasksInList(list.id, { subtasks: true, include_closed: true });

        for (const task of tasks) {
          const currentStatus = task.status?.status || '';
          const previousStatus = statusSnapshot.get(task.id);
          const isNew = previousStatus === undefined;
          const statusChanged = previousStatus !== currentStatus;

          if ((isNew || statusChanged) && isCompletedStatus(currentStatus)) {
            // Passar listId para resolver o grupo do cliente
            await notifyIfCompleted(task.id, currentStatus, list.id, list.name);
          }

          statusSnapshot.set(task.id, currentStatus);
        }
      } catch (err) {
        console.warn(`⚠️  Notifier poll error (lista "${list.name}"):`, err.message);
      }
    }
  } catch (err) {
    console.warn('⚠️  ClickUp Notifier poll error:', err.message);
  }
}

function isCompletedStatus(status) {
  const s = (status || '').toUpperCase();
  return s === 'CONCLUÍDO' || s === 'CONCLUIDO' || s === 'DONE' || s === 'COMPLETE' || s === 'CLOSED';
}

// --- Saudação por horário ---
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

// --- Resolução de grupo WhatsApp ---
function resolveGroupJid(listId, listName) {
  // 1. Tentar por listId (fonte principal — onboarding salva isso)
  const byList = clientListGroupMap.get(listId);
  if (byList?.groupJid) return { groupJid: byList.groupJid, clientName: byList.clientName };

  // 2. Tentar por nome (env var legado)
  const listNameUpper = (listName || '').toUpperCase();
  for (const [key, val] of clientListGroupMap) {
    if (String(key).startsWith('env:')) {
      const envName = key.substring(4);
      if (listNameUpper.includes(envName) || envName.includes(listNameUpper)) {
        return { groupJid: val.groupJid, clientName: val.clientName };
      }
    }
  }

  return null;
}

// --- Variações de mensagens (seleção aleatória sem repetir) ---
const GREETINGS_FIRST = [
  (g, t) => `${g}, pessoal! Passando pra avisar que finalizamos a tarefa "${t}"`,
  (g, t) => `${g}, pessoal! Tudo certo por aqui — acabamos de finalizar "${t}"`,
  (g, t) => `${g}! Mais uma entrega prontinha: "${t}"`,
  (g, t) => `${g}, pessoal! Concluímos "${t}"`,
  (g, t) => `E aí, pessoal! ${g.toLowerCase()}! Finalizamos aqui a tarefa "${t}"`,
  (g, t) => `${g}! Passando rapidinho pra avisar que "${t}" já tá pronta`,
  (g, t) => `${g}, pessoal! Acabamos de concluir "${t}" por aqui`,
  (g, t) => `${g}! Tarefa "${t}" finalizada com sucesso`,
  (g, t) => `${g}, time! Finalizamos mais uma entrega: "${t}"`,
  (g, t) => `${g}, pessoal! Beleza? Vim avisar que "${t}" tá concluída`,
  (g, t) => `${g}! Rapidinho aqui pra avisar que "${t}" ficou pronta`,
  (g, t) => `${g}, pessoal! Atualizando vocês: "${t}" tá finalizada`,
  (g, t) => `${g}! Saiu do forno: "${t}"`,
  (g, t) => `${g}, pessoal! Entrega concluída: "${t}"`,
  (g, t) => `${g}! Vim dar o update — "${t}" tá prontinha`,
  (g, t) => `${g}, pessoal! Fechamos aqui a tarefa "${t}"`,
  (g, t) => `${g}! Atualizando o grupo: finalizamos "${t}"`,
  (g, t) => `${g}, pessoal! Trazendo novidades — "${t}" tá concluída`,
  (g, t) => `${g}! Mais uma entrega saindo: "${t}"`,
  (g, t) => `${g}, pessoal! Pronto! "${t}" tá finalizada`,
];

const GREETINGS_FOLLOWUP = [
  (t) => `Finalizamos mais uma! "${t}"`,
  (t) => `Mais uma concluída: "${t}"`,
  (t) => `E tem mais — "${t}" também tá pronta`,
  (t) => `Aproveitando, "${t}" também ficou pronta`,
  (t) => `Ah, e "${t}" também finalizamos`,
  (t) => `Seguindo as entregas: "${t}" concluída`,
  (t) => `Mais uma saindo do forno: "${t}"`,
  (t) => `Junto com a anterior, também finalizamos "${t}"`,
  (t) => `E mais uma prontinha: "${t}"`,
  (t) => `Outra entrega finalizada: "${t}"`,
  (t) => `Emendando: "${t}" também tá pronta`,
  (t) => `Na sequência, também fechamos "${t}"`,
  (t) => `Atualizando: "${t}" concluída também`,
  (t) => `E não para — "${t}" também ficou pronta`,
  (t) => `Mais uma pra lista: "${t}" finalizada`,
  (t) => `Dando sequência: "${t}" pronta`,
  (t) => `Aproveitando o embalo: "${t}" também tá ok`,
  (t) => `Outra que saiu: "${t}"`,
  (t) => `E junto: "${t}" finalizada também`,
  (t) => `Mandando mais uma: "${t}" concluída`,
];

const APPROVAL_REQUESTS = [
  `Precisamos da aprovação de vocês pra dar sequência. Dá uma olhada e nos avisa se tá tudo certo ou se tem algum ajuste! 🙏`,
  `Quando puderem, dá uma conferida e nos diz se tá aprovado ou se precisa de alguma alteração! 🙏`,
  `Dá uma olhada com calma e nos avisa se podemos seguir assim ou se querem alguma mudança! 🙏`,
  `Fica à vontade pra conferir e nos retornar se tá aprovado ou se precisa ajustar algo! 🙏`,
  `Confiram e nos avisem se tá do jeito que vocês queriam ou se precisam de algum ajuste! 🙏`,
  `Quando tiverem um tempinho, dá uma olhada e nos diz se podemos avançar com isso! 🙏`,
  `Só precisamos do ok de vocês pra seguir em frente. Qualquer ajuste, é só falar! 🙏`,
  `Dá uma olhadinha e nos retorna se tá aprovado, por favor! Se precisar mudar algo, estamos à disposição 🙏`,
  `Aguardamos o ok de vocês! Se tiver qualquer ponto de ajuste, manda pra gente que a gente resolve 🙏`,
  `Confiram quando puderem e nos avisem se segue assim ou se tem algo pra ajustar! 🙏`,
  `Só falta o de acordo de vocês! Dá uma olhada e nos diz se tá certo 🙏`,
  `Quando der, confere aí e nos avisa se bate com o que tinham em mente! 🙏`,
  `Dá uma passada de olho e nos fala se tá aprovado ou se querem que a gente ajuste algum detalhe! 🙏`,
  `Nos retorna se tá tudo alinhado ou se precisam de alguma alteração, beleza? 🙏`,
  `Precisamos que vocês deem uma conferida e aprovem pra gente dar continuidade! 🙏`,
  `Nos avisa se ficou bom! Se precisar de qualquer mudança, estamos por aqui 🙏`,
  `Só aguardando o sinal verde de vocês! Qualquer coisa, fala que a gente ajusta 🙏`,
  `Dá uma checada e nos manda o ok quando puderem. Qualquer detalhe, a gente altera! 🙏`,
  `Confiram se ficou como esperavam e nos deem o aval pra seguir! 🙏`,
  `Esperamos o retorno de vocês! Se quiserem mudar alguma coisa, fiquem à vontade pra pedir 🙏`,
];

// Histórico para não repetir variações seguidas (por grupo)
// Map<groupJid, { lastGreetingIdx, lastApprovalIdx }>
const variationHistory = new Map();

function pickRandom(arr, groupJid, type) {
  const history = variationHistory.get(groupJid) || {};
  const lastKey = `last_${type}`;
  const lastIdx = history[lastKey] ?? -1;

  let idx;
  do {
    idx = Math.floor(Math.random() * arr.length);
  } while (idx === lastIdx && arr.length > 1);

  history[lastKey] = idx;
  variationHistory.set(groupJid, history);
  return arr[idx];
}

// --- Mensagem de status (com variações aleatórias) ---
function buildStatusMessage(ctx, isFollowUp, groupJid) {
  const lines = [];
  const taskName = ctx.taskName.replace(/^\[ONBOARDING\]\s*/i, '');

  if (isFollowUp) {
    const template = pickRandom(GREETINGS_FOLLOWUP, groupJid, 'followup');
    lines.push(template(taskName));
  } else {
    const template = pickRandom(GREETINGS_FIRST, groupJid, 'greeting');
    lines.push(template(getGreeting(), taskName));
  }

  // Listar subtarefas concluídas como bullet points
  if (ctx.completedSubtaskNames && ctx.completedSubtaskNames.length > 0) {
    lines.push('');
    for (const name of ctx.completedSubtaskNames) {
      lines.push(`✔️ ${name}`);
    }
  }

  // Se tem link de entregável → incluir com pedido de aprovação
  if (ctx.deliverableLink) {
    lines.push('');
    lines.push(`🔗 Segue o link pra vocês conferirem:`);
    lines.push(ctx.deliverableLink);
    lines.push('');
    const approval = pickRandom(APPROVAL_REQUESTS, groupJid, 'approval');
    lines.push(approval);
  }

  return lines.join('\n');
}

/**
 * Extrai o valor do campo custom "Link" de uma tarefa.
 */
function extractDeliverableLink(task) {
  if (!task.custom_fields) return null;
  const field = task.custom_fields.find(f => f.id === LINK_FIELD_ID);
  const value = field?.value;
  return value && value.trim() ? value.trim() : null;
}

// --- Resumo dos comentários via Groq ---
async function summarizeComments(comments, taskName) {
  if (!GROQ_API_KEY) return comments;

  const prompt = `Resuma em 2-3 linhas de WhatsApp o que foi feito nesta tarefa, baseado nos comentários da equipe. Linguagem simples e direta, sem saudação, sem assinatura. Apenas o resumo do que foi executado.

Tarefa: ${taskName}
Comentários: ${comments}

Escreva APENAS o resumo, sem aspas.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'Você resume atualizações de tarefas de forma curta e clara para WhatsApp.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 200,
      }),
    });

    if (!response.ok) return comments;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || comments;
  } catch {
    return comments;
  }
}

// --- Notificação principal ---
async function notifyIfCompleted(taskId, newStatus, listId, listName) {
  if (clientListGroupMap.size === 0) return;
  if (!isCompletedStatus(newStatus)) return;
  if (isDuplicate(taskId)) {
    console.log(`📱 Notifier: Tarefa ${taskId} já notificada (dedup)`);
    return;
  }

  try {
    const task = await clickup.getTask(taskId);
    const isSubtask = !!task.parent;

    // Resolver lista e grupo do cliente
    // Se veio com listId direto, usar. Senão, pegar da tarefa
    const effectiveListId = listId || task.list?.id;
    const effectiveListName = listName || task.list?.name || '';

    const resolved = resolveGroupJid(effectiveListId, effectiveListName);
    if (!resolved) {
      console.log(`📱 Notifier: Tarefa "${task.name}" sem grupo WhatsApp (lista: ${effectiveListName})`);
      return;
    }

    const { groupJid, clientName } = resolved;

    // Buscar parent se for subtarefa
    let parentTask = null;
    if (isSubtask) {
      parentTask = await clickup.getTask(task.parent);
    }

    // Buscar comentários da tarefa (e do parent se for subtarefa)
    const comments = await clickup.getTaskComments(taskId);
    let parentComments = [];
    if (isSubtask && parentTask) {
      parentComments = await clickup.getTaskComments(parentTask.id);
    }
    const allComments = [...comments, ...parentComments]
      .map(c => c.text)
      .filter(t => t && t.trim())
      .join('\n');

    // Subtarefas info
    let subtaskNames = [];
    let completedCount = 0;
    let totalSubtasks = 0;
    if (isSubtask && parentTask) {
      const subs = parentTask.subtasks || [];
      totalSubtasks = subs.length;
      completedCount = subs.filter(st => isCompletedStatus(st.status?.status)).length;
      subtaskNames = subs
        .filter(st => isCompletedStatus(st.status?.status))
        .map(st => st.name);
    } else if (!isSubtask && task.subtasks?.length > 0) {
      const subs = task.subtasks;
      totalSubtasks = subs.length;
      completedCount = subs.filter(st => isCompletedStatus(st.status?.status)).length;
      subtaskNames = subs
        .filter(st => isCompletedStatus(st.status?.status))
        .map(st => st.name);
    }

    // Verificar se já enviou mensagem para este grupo recentemente (agrupamento)
    const recentEntry = recentGroupMessages.get(groupJid);
    const isFollowUp = recentEntry && (Date.now() - recentEntry.sentAt < DEDUP_TTL_MS);

    // Nomes das subtarefas concluídas
    const completedSubtaskNames = subtaskNames;

    // Extrair link de entregável (campo custom "Link")
    const deliverableLink = extractDeliverableLink(task);

    const ctx = {
      taskName: task.name,
      completedSubtaskNames,
      completedCount,
      totalSubtasks,
      deliverableLink,
    };

    // Mensagem 1: Status da tarefa (sempre envia)
    const statusMsg = buildStatusMessage(ctx, isFollowUp, groupJid);
    await stevo.sendText(groupJid, statusMsg);

    // Mensagem 2: Resumo do que foi feito (só se tiver comentários)
    if (allComments) {
      const summary = await summarizeComments(allComments, task.name);
      await stevo.sendText(groupJid, `📝 ${summary}`);
    }

    // Tracking
    if (!isFollowUp) {
      recentGroupMessages.set(groupJid, { sentAt: Date.now(), taskNames: [task.name] });
    } else {
      recentEntry.taskNames.push(task.name);
    }
    markNotified(taskId);
    const mode = isFollowUp ? 'follow-up' : 'principal';
    console.log(`📱 Notifier [${mode}]: ${clientName} — "${task.name}"${allComments ? ' (+resumo)' : ''}`);
  } catch (err) {
    console.error(`📱 Notifier: Erro ao notificar tarefa ${taskId}:`, err.message);
  }
}

/**
 * Recarrega mapeamento de grupos (chamar após onboarding de novo cliente).
 */
function reloadGroups() {
  loadClientGroups();
}

module.exports = {
  initialize,
  pollForCompletions,
  notifyIfCompleted,
  reloadGroups,
};
