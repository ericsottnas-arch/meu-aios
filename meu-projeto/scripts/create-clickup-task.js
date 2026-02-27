#!/usr/bin/env node
/**
 * Cria uma tarefa no ClickUp a partir de um briefing (título + descrição).
 * Uso:
 *   node scripts/create-clickup-task.js "Título da tarefa" "Descrição ou briefing aqui..."
 *   echo "Briefing completo..." | node scripts/create-clickup-task.js "Título"
 *
 * Variáveis de ambiente (ou .env na raiz do projeto):
 *   CLICKUP_API_KEY ou CLICKUP_API_TOKEN - Token da API (ClickUp > Settings > Apps > API Token)
 *   CLICKUP_LIST_ID - ID da lista onde criar a tarefa (obrigatório)
 */

const path = require('path');
const fs = require('fs');

// Carrega .env da raiz do projeto se existir
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
// Status ao criar (ex.: "NA FILA" na lista TAREFAS - SYRA DIGITAL > Clientes)
const DEFAULT_STATUS = process.env.CLICKUP_DEFAULT_STATUS || 'NA FILA';

async function createTask(title, description) {
  if (!API_KEY) {
    throw new Error('Defina CLICKUP_API_KEY ou CLICKUP_API_TOKEN no .env');
  }
  if (!LIST_ID) {
    throw new Error('Defina CLICKUP_LIST_ID no .env (ID numérico da lista no ClickUp)');
  }
  if (!title || !title.trim()) {
    throw new Error('Título da tarefa é obrigatório');
  }

  const token = API_KEY.trim();
  const url = `https://api.clickup.com/api/v2/list/${LIST_ID}/task`;
  const body = {
    name: title.trim(),
    description: (description || '').trim() || undefined,
    markdown_description: (description || '').trim() || undefined,
    status: DEFAULT_STATUS,
  };
  // Remove undefined
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

  let res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify(body),
  });

  // Se a API rejeitar o campo status (ex.: aceita só status id), tenta sem status
  if (!res.ok && body.status) {
    delete body.status;
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      console.warn('⚠️ Tarefa criada com status padrão da lista. Para NA FILA, defina o status padrão da lista no ClickUp ou use CLICKUP_DEFAULT_STATUS com o id do status.');
    }
  }

  if (!res.ok) {
    const errText = await res.text();
    let errMsg = `ClickUp API ${res.status}: ${errText}`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson.err) errMsg = errJson.err;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    url: data.url || `https://app.clickup.com/t/${data.id}`,
  };
}

async function main() {
  let title = '';
  let description = '';

  const args = process.argv.slice(2);
  if (args.length >= 2) {
    title = args[0];
    description = args.slice(1).join(' ');
  } else if (args.length === 1) {
    title = args[0];
    if (!process.stdin.isTTY) {
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      description = Buffer.concat(chunks).toString('utf8').trim();
    }
  } else if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const full = Buffer.concat(chunks).toString('utf8').trim();
    const firstLine = full.split('\n')[0] || full;
    title = firstLine.slice(0, 200);
    description = full;
  }

  if (!title) {
    console.error('Uso: node scripts/create-clickup-task.js "Título" "Briefing..."');
    console.error('   ou: echo "Briefing" | node scripts/create-clickup-task.js "Título"');
    process.exit(1);
  }

  try {
    const result = await createTask(title, description);
    console.log(JSON.stringify(result, null, 2));
    console.log('\n✅ Tarefa criada:', result.url);
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
}

main();
