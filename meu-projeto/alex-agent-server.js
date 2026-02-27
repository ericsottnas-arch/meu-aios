// meu-projeto/alex-agent-server.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// Em produção (Railway), usa env vars do sistema
// Em dev local, tenta .env local e depois .env no diretório pai
if (process.env.NODE_ENV !== 'production') {
  const localEnv = path.resolve(__dirname, '.env');
  const parentEnv = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(localEnv)) {
    require('dotenv').config({ path: localEnv });
  } else if (fs.existsSync(parentEnv)) {
    require('dotenv').config({ path: parentEnv });
  } else {
    require('dotenv').config();
  }
}

const app = express();
const port = process.env.ALEX_PORT || 3003;
const ALEX_BOT_TOKEN = process.env.ALEX_BOT_TOKEN?.replace(/"/g, '');
const WEBHOOK_SECRET = process.env.ALEX_WEBHOOK_SECRET;
const ALEX_OWNER_CHAT_ID = process.env.ALEX_OWNER_CHAT_ID;

if (!ALEX_BOT_TOKEN) {
  console.error('ALEX_BOT_TOKEN is not set');
  process.exit(1);
}

app.use(bodyParser.json());

// Módulos
const conversation = require('./lib/conversation');
const telegram = require('./lib/telegram');
const clickup = require('./lib/clickup');

// Variável global para cache de tasks
let CACHED_STATUSES = [];

// ============================================================
// Health check
// ============================================================
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'alex-project-manager',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Security middlewares
// ============================================================
function verifyWebhookSecret(req, res, next) {
  if (!WEBHOOK_SECRET) return next();
  const token = req.headers['x-telegram-bot-api-secret-token'];
  if (token !== WEBHOOK_SECRET) {
    console.warn(`🚫 Rejected webhook — invalid secret from ${req.ip}`);
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// ============================================================
// Helpers para formatação
// ============================================================
function formatTask(task) {
  const title = task.name || 'Sem título';
  const status = task.status?.status || 'Desconhecido';
  const priority = getPriorityEmoji(task.priority);
  const dueDateText = task.due_date
    ? new Date(task.due_date).toLocaleDateString('pt-BR')
    : 'Sem prazo';

  return {
    id: task.id,
    title,
    status,
    priority,
    dueDateText,
    dueDate: task.due_date,
    description: task.description ? task.description.substring(0, 100) : '',
  };
}

function getPriorityEmoji(priority) {
  if (!priority) return '⚪';
  if (priority === 1) return '🔴';
  if (priority === 2) return '🟠';
  if (priority === 3) return '🟡';
  if (priority === 4) return '🔵';
  return '⚪';
}

function formatTaskDetail(task) {
  const formatted = formatTask(task);
  let msg = `📌 *${formatted.title}*\n\n`;
  msg += `Status: ${formatted.status}\n`;
  msg += `Prioridade: ${formatted.priority}\n`;
  msg += `Prazo: ${formatted.dueDateText}\n`;

  if (formatted.description) {
    msg += `Descrição: ${formatted.description}...\n`;
  }

  msg += `\n🔗 [Abrir no ClickUp](${task.url || 'https://app.clickup.com'})`;

  return msg;
}

// ============================================================
// Fluxo interativo: listar tarefas
// ============================================================
async function startListFlow(chatId) {
  try {
    await telegram.sendMessage(chatId, '📋 Carregando tarefas...');

    const statuses = await clickup.getListStatuses();
    CACHED_STATUSES = statuses;

    // Mostra opções de filtro
    const buttons = [
      [{ text: 'Todas', callback_data: 'list_filter:all' }],
      [{ text: 'Em andamento', callback_data: 'list_filter:in_progress' }],
      [{ text: 'Na fila', callback_data: 'list_filter:to_do' }],
      [{ text: 'Feitas', callback_data: 'list_filter:done' }],
    ];

    await telegram.sendInlineKeyboard(
      chatId,
      '🔍 Filtrar tarefas por status:',
      buttons
    );
  } catch (err) {
    console.error('Error starting list flow:', err);
    telegram.sendMessage(chatId, `❌ Erro ao listar tarefas: ${err.message}`);
  }
}

async function handleListFilter(chatId, messageId, filterType) {
  try {
    await telegram.sendMessage(chatId, '⏳ Buscando tarefas...');

    const statusMap = {
      all: null,
      in_progress: 'IN PROGRESS',
      to_do: 'TO DO',
      done: 'DONE',
    };

    const filters = {};
    if (statusMap[filterType]) {
      filters.statuses = [statusMap[filterType]];
    }

    const result = await clickup.listTasks(filters);
    const tasks = result.tasks || [];

    if (tasks.length === 0) {
      await telegram.sendMessage(chatId, '📭 Nenhuma tarefa encontrada com este filtro.');
      return;
    }

    // Limita a 5 tarefas por mensagem
    const displayTasks = tasks.slice(0, 5);
    const buttons = displayTasks.map((task) => [
      {
        text: `${getPriorityEmoji(task.priority)} ${task.name.substring(0, 40)}`,
        callback_data: `task_select:${task.id}`,
      },
    ]);

    let msg = `📋 *Encontrei ${tasks.length} tarefa(s)*\n\n`;
    msg += `Mostrando as primeiras 5:\n\n`;
    displayTasks.forEach((task, idx) => {
      const status = task.status?.status || 'Desconhecido';
      msg += `${idx + 1}. ${getPriorityEmoji(task.priority)} ${task.name}\n`;
      msg += `   Status: ${status}\n`;
    });

    await telegram.sendInlineKeyboard(chatId, msg, buttons);
  } catch (err) {
    console.error('Error handling list filter:', err);
    telegram.sendMessage(chatId, `❌ Erro: ${err.message}`);
  }
}

async function handleTaskSelect(chatId, taskId) {
  try {
    // Busca detalhes da tarefa via searchTasks (único método disponível com detalhes)
    const allTasks = await clickup.searchTasks(taskId);
    const task = allTasks.find((t) => t.id === taskId);

    if (!task) {
      await telegram.sendMessage(chatId, '❌ Tarefa não encontrada.');
      return;
    }

    const msg = formatTaskDetail(task);
    const buttons = [
      [{ text: '📝 Mudar Status', callback_data: `task_status_select:${taskId}` }],
      [{ text: '🔄 Voltar', callback_data: 'list_filter:all' }],
    ];

    await telegram.sendInlineKeyboard(chatId, msg, buttons);
  } catch (err) {
    console.error('Error handling task select:', err);
    telegram.sendMessage(chatId, `❌ Erro: ${err.message}`);
  }
}

async function handleTaskStatusSelect(chatId, taskId) {
  try {
    const statuses = CACHED_STATUSES || (await clickup.getListStatuses());

    if (statuses.length === 0) {
      await telegram.sendMessage(chatId, '❌ Não foi possível carregar os status disponíveis.');
      return;
    }

    const buttons = statuses.map((s) => [
      {
        text: s.status,
        callback_data: `task_status_change:${taskId}:${s.status}`,
      },
    ]);

    await telegram.sendInlineKeyboard(
      chatId,
      '📝 Selecione o novo status:',
      buttons
    );
  } catch (err) {
    console.error('Error handling task status select:', err);
    telegram.sendMessage(chatId, `❌ Erro: ${err.message}`);
  }
}

async function handleTaskStatusChange(chatId, taskId, newStatus) {
  try {
    await telegram.sendMessage(chatId, `⏳ Atualizando status para "${newStatus}"...`);

    const result = await clickup.updateTaskStatus(taskId, newStatus);

    if (result) {
      await telegram.sendMessage(
        chatId,
        `✅ Status atualizado com sucesso!\n🔄 Novo status: ${result.status}`
      );
    } else {
      await telegram.sendMessage(chatId, '❌ Não foi possível atualizar o status.');
    }
  } catch (err) {
    console.error('Error updating task status:', err);
    telegram.sendMessage(chatId, `❌ Erro: ${err.message}`);
  }
}

// ============================================================
// Dashboard automático
// ============================================================
async function sendDashboard(chatId) {
  try {
    const inProgress = await clickup.listTasks({ statuses: ['IN PROGRESS'] });
    const pending = await clickup.listTasks({ statuses: ['TO DO'] });
    const done = await clickup.listTasks({ statuses: ['DONE'] });

    let msg = `📊 *Dashboard do Dia*\n\n`;
    msg += `🟠 *Em Andamento*: ${inProgress.total_count} tarefa(s)\n`;
    inProgress.tasks?.slice(0, 3).forEach((t) => {
      msg += `  • ${t.name.substring(0, 40)}\n`;
    });

    msg += `\n🟡 *Na Fila*: ${pending.total_count} tarefa(s)\n`;
    pending.tasks?.slice(0, 3).forEach((t) => {
      msg += `  • ${t.name.substring(0, 40)}\n`;
    });

    msg += `\n✅ *Concluídas*: ${done.total_count} tarefa(s)\n`;

    msg += `\n📈 *Total*: ${inProgress.total_count + pending.total_count + done.total_count} tarefa(s)`;

    await telegram.sendMessage(chatId, msg);
  } catch (err) {
    console.error('Error sending dashboard:', err);
  }
}

// ============================================================
// Callback query handler (botões inline)
// ============================================================
async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const queryId = callbackQuery.id;

  const [type, ...valueParts] = data.split(':');
  const value = valueParts.join(':');

  try {
    switch (type) {
      case 'list_filter': {
        await telegram.answerCallbackQuery(queryId);
        await handleListFilter(chatId, callbackQuery.message.message_id, value);
        break;
      }

      case 'task_select': {
        await telegram.answerCallbackQuery(queryId);
        await handleTaskSelect(chatId, value);
        break;
      }

      case 'task_status_select': {
        await telegram.answerCallbackQuery(queryId);
        await handleTaskStatusSelect(chatId, value);
        break;
      }

      case 'task_status_change': {
        const [taskId, newStatus] = value.split(':');
        await telegram.answerCallbackQuery(queryId, `Atualizando...`);
        await handleTaskStatusChange(chatId, taskId, newStatus);
        break;
      }

      default:
        await telegram.answerCallbackQuery(queryId, 'Opção não reconhecida');
    }
  } catch (err) {
    console.error('Error in callback handler:', err);
    await telegram.answerCallbackQuery(queryId, '❌ Erro ao processar');
  }
}

// ============================================================
// Webhook endpoint
// ============================================================
app.post('/webhook', verifyWebhookSecret, async (req, res) => {
  // Responde imediatamente para evitar retries do Telegram
  res.status(200).send('OK');

  try {
    // --- Callback Query (botões inline) ---
    if (req.body.callback_query) {
      await handleCallbackQuery(req.body.callback_query);
      return;
    }

    // --- Mensagem normal ---
    const message = req.body.message;
    if (!message) return;

    const chatId = message.chat.id;

    // --- Comandos do bot ---
    if (message.text && message.text.startsWith('/')) {
      const cmd = message.text.split(/\s|@/)[0].toLowerCase();
      switch (cmd) {
        case '/start':
          await telegram.sendMessage(
            chatId,
            `📌 Olá! Eu sou o Alex, seu Project Manager.\n\n` +
              `Posso ajudar você a:\n` +
              `  📋 Listar tarefas\n` +
              `  📊 Ver dashboard do dia\n` +
              `  📝 Mudar status de tarefas\n\n` +
              `Comandos:\n` +
              `/tarefas — listar tarefas\n` +
              `/dashboard — resumo do dia\n` +
              `/help — menu de ajuda\n` +
              `/cancel — cancelar ação`
          );
          return;

        case '/tarefas':
          await startListFlow(chatId);
          return;

        case '/dashboard':
          await sendDashboard(chatId);
          return;

        case '/help':
          await telegram.sendMessage(
            chatId,
            `📌 Alex — Project Manager\n\n` +
              `Comandos disponíveis:\n` +
              `/tarefas — listar e filtrar tarefas\n` +
              `/dashboard — resumo do dia (tarefas em andamento, na fila, feitas)\n` +
              `/cancel — cancelar ação em andamento`
          );
          return;

        case '/cancel':
          await telegram.sendMessage(chatId, '🚫 Ação cancelada.');
          return;

        default:
          await telegram.sendMessage(
            chatId,
            `📌 Comando não reconhecido.\n/help para ver os comandos disponíveis.`
          );
          return;
      }
    }

    // --- Mensagem de texto sem comando ---
    if (message.text) {
      await telegram.sendMessage(
        chatId,
        `📌 Envie um comando:\n/tarefas — listar tarefas\n/dashboard — resumo do dia\n/help — ajuda`
      );
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }
});

// ============================================================
// Dashboard automático às 08h
// ============================================================
if (ALEX_OWNER_CHAT_ID) {
  cron.schedule('0 8 * * *', async () => {
    console.log('📊 Enviando dashboard automático...');
    await sendDashboard(Number(ALEX_OWNER_CHAT_ID));
  }, { timezone: 'America/Sao_Paulo' });
}

// ============================================================
// Polling (getUpdates) para desenvolvimento local
// ============================================================
let lastUpdateId = 0;

async function pollUpdates() {
  try {
    // Polling está rodando, mas não logando tudo para não poluir (apenas updates)
    const response = await fetch(
      `https://api.telegram.org/bot${ALEX_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`
    );
    const data = await response.json();

    if (!data.ok) {
      console.error(`❌ Telegram API error: ${data.description}`);
      setTimeout(pollUpdates, 1000);
      return;
    }

    if (!data.result || data.result.length === 0) {
      setTimeout(pollUpdates, 100);
      return;
    }

    console.log(`📩 Received ${data.result.length} update(s)`);

    for (const update of data.result) {
      lastUpdateId = update.update_id;
      console.log(`  Processing update ${update.update_id}`);

      try {
        // Callback query
        if (update.callback_query) {
          console.log(`    → Callback query: ${update.callback_query.data}`);
          await handleCallbackQuery(update.callback_query);
          console.log(`    ✓ Callback processed`);
        }
        // Mensagem normal
        else if (update.message) {
          const message = update.message;
          const chatId = message.chat.id;
          console.log(`    → Message from ${chatId}: "${message.text}"`);

          if (message.text && message.text.startsWith('/')) {
            const cmd = message.text.split(/\s|@/)[0].toLowerCase();
            console.log(`    → Command: ${cmd}`);

            switch (cmd) {
              case '/start':
                console.log(`    → Sending /start response`);
                await telegram.sendMessage(
                  chatId,
                  `📌 Olá! Eu sou o Alex, seu Project Manager.\n\n` +
                    `Posso ajudar você a:\n` +
                    `  📋 Listar tarefas\n` +
                    `  📊 Ver dashboard do dia\n` +
                    `  📝 Mudar status de tarefas\n\n` +
                    `Comandos:\n` +
                    `/tarefas — listar tarefas\n` +
                    `/dashboard — resumo do dia\n` +
                    `/help — menu de ajuda\n` +
                    `/cancel — cancelar ação`
                );
                console.log(`    ✓ /start sent`);
                break;

              case '/tarefas':
                console.log(`    → Calling startListFlow`);
                await startListFlow(chatId);
                console.log(`    ✓ /tarefas sent`);
                break;

              case '/dashboard':
                console.log(`    → Sending dashboard`);
                await sendDashboard(chatId);
                console.log(`    ✓ /dashboard sent`);
                break;

              case '/help':
                console.log(`    → Sending /help response`);
                await telegram.sendMessage(
                  chatId,
                  `📌 Alex — Project Manager\n\n` +
                    `Comandos disponíveis:\n` +
                    `/tarefas — listar e filtrar tarefas\n` +
                    `/dashboard — resumo do dia (tarefas em andamento, na fila, feitas)\n` +
                    `/cancel — cancelar ação em andamento`
                );
                console.log(`    ✓ /help sent`);
                break;

              case '/cancel':
                console.log(`    → Sending /cancel response`);
                await telegram.sendMessage(chatId, '🚫 Ação cancelada.');
                console.log(`    ✓ /cancel sent`);
                break;

              default:
                console.log(`    → Unknown command, sending error`);
                await telegram.sendMessage(
                  chatId,
                  `📌 Comando não reconhecido.\n/help para ver os comandos disponíveis.`
                );
                console.log(`    ✓ Error message sent`);
                break;
            }
          } else if (message.text) {
            console.log(`    → Free text, sending command prompt`);
            await telegram.sendMessage(
              chatId,
              `📌 Envie um comando:\n/tarefas — listar tarefas\n/dashboard — resumo do dia\n/help — ajuda`
            );
            console.log(`    ✓ Prompt sent`);
          }
        }
      } catch (updateErr) {
        console.error(`  ❌ Error processing update ${update.update_id}:`, updateErr.message);
      }
    }
  } catch (err) {
    console.error('Polling error:', err.message);
  }

  // Poll novamente em 100ms
  setTimeout(pollUpdates, 100);
}

// ============================================================
// Startup
// ============================================================
app.listen(port, async () => {
  console.log(`\n🤖 Alex Project Manager running on port ${port}`);
  console.log(`📡 Mode: POLLING (getUpdates) — local development`);
  console.log(`🔑 Bot Token: ...${ALEX_BOT_TOKEN.slice(-8)}`);
  console.log(`📊 Dashboard Owner: ${ALEX_OWNER_CHAT_ID || 'Not configured'}`);

  // Pre-cache de status
  CACHED_STATUSES = await clickup.getListStatuses();
  if (CACHED_STATUSES.length > 0) {
    console.log(
      `📋 ClickUp Status: ${CACHED_STATUSES.map((s) => s.status).join(', ')}`
    );
  }

  if (ALEX_OWNER_CHAT_ID) {
    console.log(`⏰ Daily dashboard scheduled: 08:00 (São Paulo time)`);
  }

  console.log('✅ Ready to receive messages via polling\n');

  // Inicia polling de atualizações
  console.log('🔄 Starting polling loop...');
  pollUpdates();
});
