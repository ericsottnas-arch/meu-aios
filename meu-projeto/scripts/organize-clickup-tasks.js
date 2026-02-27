#!/usr/bin/env node
/**
 * Organização profissional das tarefas da Syra no ClickUp.
 * Lista TAREFAS (SYRA DIGITAL > Clientes). Statuses: NA FILA → TRÁFEGO → ANDAMENTO → concluído.
 *
 * Uso:
 *   node scripts/organize-clickup-tasks.js           # Relatório e sugestões
 *   node scripts/organize-clickup-tasks.js --json    # Dados brutos (JSON)
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

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

// Ordem de fluxo desejada (Syra): NA FILA → TRÁFEGO → ANDAMENTO → concluído
const FLOW_ORDER = ['NA FILA', 'TRÁFEGO', 'ANDAMENTO', 'complete', 'closed', 'Concluído', 'Done'];

function normalizeStatusName(status) {
  const s = (status || '').trim();
  const lower = s.toLowerCase();
  if (lower === 'na fila') return 'NA FILA';
  if (lower === 'tráfego') return 'TRÁFEGO';
  if (lower === 'andamento') return 'ANDAMENTO';
  if (/complete|closed|done|concluíd/i.test(lower)) return 'Concluído';
  return s;
}

function getFlowIndex(status) {
  const s = (status || '').toLowerCase();
  const i = FLOW_ORDER.findIndex((x) => x.toLowerCase() === s);
  if (i >= 0) return i;
  if (s.includes('complete') || s.includes('done') || s.includes('concluíd')) return 10;
  if (s.includes('andamento')) return 3;
  if (s.includes('tráfego')) return 2;
  if (s.includes('fila')) return 1;
  return 5;
}

async function fetchData() {
  const scriptPath = path.join(__dirname, 'list-clickup-tasks.js');
  const out = execSync(`node "${scriptPath}"`, { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
  return JSON.parse(out);
}

function report(data) {
  const { list, byStatus, total } = data;
  const lines = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('  SYRA DIGITAL — Organização de Tarefas (ClickUp)');
  lines.push('  Lista: ' + (list && list.name ? list.name : 'TAREFAS'));
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  const statusNames = Object.keys(byStatus || {}).sort((a, b) => getFlowIndex(a) - getFlowIndex(b));

  for (const status of statusNames) {
    const tasks = byStatus[status];
    const norm = normalizeStatusName(status);
    const label = norm === 'NA FILA' ? '📋 NA FILA (backlog)' : norm === 'TRÁFEGO' ? '🔄 TRÁFEGO (em triagem)' : norm === 'ANDAMENTO' ? '▶ ANDAMENTO (em execução)' : norm === 'Concluído' ? '✅ Concluído' : '📌 ' + norm;
    lines.push('─── ' + label + ' (' + tasks.length + ') ───');
    tasks.forEach((t, i) => {
      lines.push('  ' + (i + 1) + '. ' + t.name);
      lines.push('     ' + t.url);
    });
    lines.push('');
  }

  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  Total: ' + total + ' tarefas');
  lines.push('');

  // Sugestões (Eisenhower / fluxo) — considerar nomes em qualquer capitalização
  const key = (name) => Object.keys(byStatus || {}).find((k) => k.toLowerCase() === (name || '').toLowerCase());
  const naFila = (byStatus[key('NA FILA')] || []).length;
  const trafego = (byStatus[key('TRÁFEGO')] || []).length;
  const andamento = (byStatus[key('ANDAMENTO')] || []).length;

  lines.push('  SUGESTÕES DE ORGANIZAÇÃO');
  lines.push('───────────────────────────────────────────────────────────────');
  if (naFila > 0) {
    lines.push('  • Priorize 1–3 itens em NA FILA e mova para TRÁFEGO (prontos para começar).');
  }
  if (trafego > 0) {
    lines.push('  • Mova de TRÁFEGO para ANDAMENTO apenas o que está em execução (foco).');
  }
  if (andamento > 3) {
    lines.push('  • Considere limitar ANDAMENTO a 2–3 tarefas por vez (WIP) para entregas mais rápidas.');
  }
  if (naFila + trafego + andamento > 0) {
    lines.push('  • Fluxo recomendado: NA FILA → TRÁFEGO → ANDAMENTO → Concluído.');
  }
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}

async function main() {
  const jsonOnly = process.argv.includes('--json');

  if (!API_KEY || !LIST_ID) {
    console.error('Defina CLICKUP_API_KEY e CLICKUP_LIST_ID no .env');
    process.exit(1);
  }

  const data = await fetchData();
  if (jsonOnly) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  console.log(report(data));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
