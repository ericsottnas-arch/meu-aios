#!/usr/bin/env node
/**
 * Lista tarefas da lista TAREFAS (SYRA DIGITAL > Clientes) no ClickUp.
 * Uso: node scripts/list-clickup-tasks.js
 * Saída: JSON com tarefas agrupadas por status (para uso por organize-clickup-tasks.js).
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

async function getList() {
  const res = await fetch(`https://api.clickup.com/api/v2/list/${LIST_ID}`, {
    headers: { Authorization: API_KEY },
  });
  if (!res.ok) throw new Error(`List ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getTasks(page = 0) {
  const url = `https://api.clickup.com/api/v2/list/${LIST_ID}/task?page=${page}&include_closed=true`;
  const res = await fetch(url, {
    headers: { Authorization: API_KEY },
  });
  if (!res.ok) throw new Error(`Tasks ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  if (!API_KEY || !LIST_ID) {
    console.error('Defina CLICKUP_API_KEY e CLICKUP_LIST_ID no .env');
    process.exit(1);
  }

  const list = await getList();
  const allTasks = [];
  let page = 0;
  let hasMore = true;
  while (hasMore) {
    const data = await getTasks(page);
    const tasks = data.tasks || [];
    allTasks.push(...tasks);
    hasMore = tasks.length === 100;
    page++;
  }

  const byStatus = {};
  for (const t of allTasks) {
    const statusName = (t.status && t.status.status) || t.status || 'Sem status';
    if (!byStatus[statusName]) byStatus[statusName] = [];
    byStatus[statusName].push({
      id: t.id,
      name: t.name,
      url: t.url || `https://app.clickup.com/t/${t.id}`,
      status: statusName,
      status_id: t.status && t.status.id,
      priority: t.priority && t.priority.id,
      due_date: t.due_date,
      description: t.description ? (t.description.slice(0, 120) + (t.description.length > 120 ? '...' : '')) : '',
    });
  }

  console.log(JSON.stringify({ list: { id: list.id, name: list.name }, byStatus, total: allTasks.length }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
