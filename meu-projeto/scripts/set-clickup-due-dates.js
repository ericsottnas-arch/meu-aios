#!/usr/bin/env node
/**
 * Define datas de entrega saudáveis para as tarefas da Syra no ClickUp.
 * Distribui prazos por status: ANDAMENTO (mais perto) → TRÁFEGO → NA FILA (mais longe).
 * Tarefas concluídas não são alteradas.
 *
 * Uso:
 *   node scripts/set-clickup-due-dates.js           # Aplica as datas no ClickUp
 *   node scripts/set-clickup-due-dates.js --dry-run  # Só mostra o que seria aplicado
 */

const path = require('path');
const fs = require('fs');

function loadEnv() {
  const root = path.resolve(__dirname, '..');
  const envPath = path.join(root, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        const val = m[2].replace(/^["']|["']$/g, '').trim();
        process.env[m[1]] = val;
      }
    });
  }
}
loadEnv();

const LIST_ID = process.env.CLICKUP_LIST_ID || process.env.CLICKUP_LIST_ID_DEFAULT;
const API_KEY = process.env.CLICKUP_API_KEY || process.env.CLICKUP_API_TOKEN;

const DRY_RUN = process.argv.includes('--dry-run');

// Fim do dia em UTC (17h BRT ≈ 20h UTC) para o dia dado
function endOfDayUTC(daysFromNow) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  d.setUTCHours(20, 0, 0, 0);
  return d.getTime();
}

function isCompleted(status) {
  const s = (status || '').toLowerCase();
  return /complete|closed|done|concluíd/.test(s);
}

function normalizeStatus(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('andamento')) return 'ANDAMENTO';
  if (s.includes('tráfego')) return 'TRÁFEGO';
  if (s.includes('na fila') || s.includes('fila')) return 'NA FILA';
  return null;
}

async function getTasks() {
  const all = [];
  let page = 0;
  let hasMore = true;
  while (hasMore) {
    const res = await fetch(
      `https://api.clickup.com/api/v2/list/${LIST_ID}/task?page=${page}&include_closed=true`,
      { headers: { Authorization: API_KEY } }
    );
    if (!res.ok) throw new Error(`Tasks ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const tasks = data.tasks || [];
    all.push(...tasks);
    hasMore = tasks.length === 100;
    page++;
  }
  return all;
}

async function updateTaskDueDate(taskId, dueDateMs) {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: API_KEY,
    },
    body: JSON.stringify({ due_date: dueDateMs }),
  });
  if (!res.ok) throw new Error(`Update ${taskId}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  if (!API_KEY || !LIST_ID) {
    console.error('Defina CLICKUP_API_KEY e CLICKUP_LIST_ID no .env');
    process.exit(1);
  }

  const tasks = await getTasks();

  // Agrupar por status (só ativos)
  const andamento = [];
  const trafego = [];
  const naFila = [];

  for (const t of tasks) {
    const statusName = (t.status && t.status.status) || t.status || '';
    if (isCompleted(statusName)) continue;
    const norm = normalizeStatus(statusName);
    const task = { id: t.id, name: t.name, url: t.url || `https://app.clickup.com/t/${t.id}` };
    if (norm === 'ANDAMENTO') andamento.push(task);
    else if (norm === 'TRÁFEGO') trafego.push(task);
    else if (norm === 'NA FILA') naFila.push(task);
  }

  // Prazos saudáveis: ~2–3 entregas por semana, prioridade ANDAMENTO > TRÁFEGO > NA FILA
  // ANDAMENTO: 5, 8, 11, 14 dias
  // TRÁFEGO: 17, 20, 23, 26 dias
  // NA FILA: 29, 32, 35, 38 dias
  const schedule = [];
  let day = 5;
  const step = 3;
  for (const t of andamento) {
    schedule.push({ ...t, dueDateMs: endOfDayUTC(day), dueLabel: `em ${day} dias` });
    day += step;
  }
  for (const t of trafego) {
    schedule.push({ ...t, dueDateMs: endOfDayUTC(day), dueLabel: `em ${day} dias` });
    day += step;
  }
  for (const t of naFila) {
    schedule.push({ ...t, dueDateMs: endOfDayUTC(day), dueLabel: `em ${day} dias` });
    day += step;
  }

  if (schedule.length === 0) {
    console.log('Nenhuma tarefa ativa (NA FILA / TRÁFEGO / ANDAMENTO) para definir prazo.');
    return;
  }

  console.log('');
  console.log('Prazos de entrega (saudáveis, distribuídos no tempo)');
  console.log('───────────────────────────────────────────────────────────────');
  schedule.forEach((s) => {
    const date = new Date(s.dueDateMs);
    const dateStr = date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    console.log('  ' + s.name);
    console.log('     ' + dateStr + '  (' + s.dueLabel + ')  ' + s.url);
  });
  console.log('───────────────────────────────────────────────────────────────');
  console.log('  Total: ' + schedule.length + ' tarefas');
  if (DRY_RUN) {
    console.log('');
    console.log('  [--dry-run] Nenhuma alteração feita. Rode sem --dry-run para aplicar.');
    console.log('');
    return;
  }

  console.log('');
  console.log('Aplicando no ClickUp...');
  for (let i = 0; i < schedule.length; i++) {
    const s = schedule[i];
    await updateTaskDueDate(s.id, s.dueDateMs);
    console.log('  OK ' + (i + 1) + '/' + schedule.length + '  ' + s.name);
    if (i < schedule.length - 1) await new Promise((r) => setTimeout(r, 250));
  }
  console.log('');
  console.log('Datas de entrega atualizadas.');
  console.log('');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
