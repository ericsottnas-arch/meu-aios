/**
 * Alex Context — Motor de contexto para Super Alex 2.0
 * Coleta dados de ClickUp, Calendar, Clientes e Memória em paralelo
 */

const fs = require('fs');
const path = require('path');
const clickup = require('./clickup');
const googleCalendar = require('./google-calendar');
const alexMemory = require('./alex-memory');

const CLIENTS_CONFIG_PATH = path.resolve(__dirname, '..', '..', 'docs', 'clientes', 'CLIENTES-CONFIG.json');

/**
 * Coleta contexto de todas as fontes em paralelo
 * @param {{ chatId: string, text?: string, intent?: object }} opts
 * @returns {Promise<object>}
 */
async function gatherContext({ chatId, text, intent } = {}) {
  const now = new Date();
  const todayDate = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  const currentHour = now.getHours();

  // Buscar tudo em paralelo
  const [tasks, calendar, clients, conversationCtx] = await Promise.all([
    getActiveTasks().catch(() => ({ active: [], overdue: [] })),
    getTodayCalendar().catch(() => []),
    getClientsConfig(),
    chatId ? getConversationContext(chatId) : Promise.resolve(null),
  ]);

  return {
    tasks: tasks.active,
    overdueTasks: tasks.overdue,
    calendar,
    clients,
    conversationSummary: conversationCtx,
    todayDate,
    currentHour,
  };
}

/**
 * Busca tarefas ativas e atrasadas do ClickUp
 */
async function getActiveTasks() {
  const result = await clickup.listTasks({});
  const allTasks = result.tasks || [];
  const now = Date.now();

  const active = [];
  const overdue = [];

  for (const t of allTasks) {
    const status = t.status?.status?.toLowerCase();
    if (status === 'complete' || status === 'closed') continue;

    const task = {
      name: t.name,
      status: t.status?.status || '?',
      assignee: t.assignees?.[0]?.username || '',
      dueDate: t.due_date ? new Date(Number(t.due_date)).toLocaleDateString('pt-BR') : null,
    };

    active.push(task);

    if (t.due_date && Number(t.due_date) < now) {
      overdue.push(task);
    }
  }

  return { active: active.slice(0, 20), overdue };
}

/**
 * Busca eventos de hoje do Google Calendar
 */
async function getTodayCalendar() {
  if (!googleCalendar.isConfigured()) return [];

  const events = await googleCalendar.listUpcoming(24);
  return events.map(ev => {
    const start = new Date(ev.start.dateTime || ev.start.date);
    return {
      title: ev.summary || 'Sem titulo',
      time: ev.start.dateTime
        ? start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : 'dia inteiro',
      attendees: (ev.attendees || []).map(a => a.email).slice(0, 3),
      meetLink: ev.hangoutLink || null,
    };
  });
}

/**
 * Busca tarefas atrasadas para alertas proativos
 */
async function getOverdueTasks() {
  const { overdue } = await getActiveTasks();
  return overdue;
}

/**
 * Carrega config de clientes
 */
async function getClientsConfig() {
  try {
    if (!fs.existsSync(CLIENTS_CONFIG_PATH)) return [];
    const config = JSON.parse(fs.readFileSync(CLIENTS_CONFIG_PATH, 'utf-8'));
    return Object.entries(config.clients || {}).map(([key, c]) => ({
      key,
      name: c.name,
      status: c.status || 'ativo',
      specialty: c.specialty || '',
    }));
  } catch {
    return [];
  }
}

/**
 * Busca contexto da conversa (resumo + tópicos recentes)
 * @param {string} chatId
 */
async function getConversationContext(chatId) {
  const summary = alexMemory.getLatestSummary(chatId);
  const recent = alexMemory.getRecentMessages(chatId, 5);
  const recentTopics = recent
    .filter(m => m.intent)
    .map(m => m.intent)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 3);

  return {
    summary: summary?.summary || null,
    recentTopics,
    messageCount: alexMemory.getMessageCount(chatId),
  };
}

/**
 * Formata contexto como string para system prompt
 * @param {object} ctx
 * @returns {string}
 */
function formatContextForPrompt(ctx) {
  const parts = [];

  parts.push(`📆 Data: ${ctx.todayDate} (${ctx.currentHour}h)`);

  // Agenda
  if (ctx.calendar && ctx.calendar.length > 0) {
    parts.push('\n📅 AGENDA DE HOJE:');
    for (const ev of ctx.calendar) {
      let line = `  - ${ev.time} — ${ev.title}`;
      if (ev.meetLink) line += ' (Google Meet)';
      parts.push(line);
    }
  } else {
    parts.push('\n📅 Sem reunioes hoje.');
  }

  // Tarefas ativas
  if (ctx.tasks && ctx.tasks.length > 0) {
    parts.push(`\n📋 TAREFAS ATIVAS (${ctx.tasks.length}):`);
    for (const t of ctx.tasks.slice(0, 15)) {
      let line = `  - [${t.status}] ${t.name}`;
      if (t.assignee) line += ` (${t.assignee})`;
      if (t.dueDate) line += ` — prazo: ${t.dueDate}`;
      parts.push(line);
    }
    if (ctx.tasks.length > 15) parts.push(`  ... e mais ${ctx.tasks.length - 15}`);
  }

  // Tarefas atrasadas
  if (ctx.overdueTasks && ctx.overdueTasks.length > 0) {
    parts.push(`\n⚠️ TAREFAS ATRASADAS (${ctx.overdueTasks.length}):`);
    for (const t of ctx.overdueTasks) {
      parts.push(`  - ${t.name} (prazo: ${t.dueDate})`);
    }
  }

  // Clientes
  if (ctx.clients && ctx.clients.length > 0) {
    const activeClients = ctx.clients.filter(c => c.status === 'ativo' || c.status === 'ATIVO');
    parts.push(`\n👥 CLIENTES (${activeClients.length} ativos): ${activeClients.map(c => c.name).join(', ')}`);
  }

  // Resumo da conversa
  if (ctx.conversationSummary?.summary) {
    parts.push(`\n💬 CONTEXTO DA CONVERSA:\n${ctx.conversationSummary.summary}`);
  }

  // Contexto extra injetado pelo handler (contatos, agenda estendida, etc.)
  if (ctx._extraContext) {
    parts.push(ctx._extraContext);
  }

  return parts.join('\n');
}

module.exports = {
  gatherContext,
  getActiveTasks,
  getTodayCalendar,
  getOverdueTasks,
  getClientsConfig,
  getConversationContext,
  formatContextForPrompt,
};
