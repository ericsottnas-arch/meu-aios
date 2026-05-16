'use strict';
/**
 * clickup-otimizacao-semanal.js
 * Toda segunda-feira às 7h cria as 10 tasks de otimização da semana.
 * Cron: 0 7 * * 1  (segunda-feira 07:00)
 *
 * Escalonamento fixo (2 clientes/dia, gap mínimo de 1 dia por cliente):
 *   Seg: Cleugo + Gabrielle
 *   Ter: Humberto + Enio
 *   Qua: Cleugo + Fabiana
 *   Qui: Gabrielle + Humberto
 *   Sex: Enio + Fabiana
 *
 * Deduplicação por data: não cria se já existe task aberta com aquele due_date.
 */

const https = require('https');

const TOKEN    = process.env.CLICKUP_API_KEY || 'pk_112052765_FNWBWCCA8GGL87JS4ZECY1M2LOS13AGB';
const MKT_SYRA = 112052765;

const CLIENTS = {
  cleugo:    { name: 'Dr Cleugo',          listId: '901326171452' },
  gabrielle: { name: 'Dra Gabrielle',       listId: '901326171457' },
  humberto:  { name: 'Dr Humberto Andrade', listId: '901326171463' },
  enio:      { name: 'Dr Enio Leite',       listId: '901326206577' },
  fabiana:   { name: 'Dra Fabiana Vargas',  listId: '901327146664' },
};

// Offset em dias a partir da segunda-feira da semana atual (0=seg, 1=ter, ...)
const WEEK_SCHEDULE = [
  { dayOffset: 0, clients: ['cleugo', 'gabrielle'] },  // Seg
  { dayOffset: 1, clients: ['humberto', 'enio'] },      // Ter
  { dayOffset: 2, clients: ['cleugo', 'fabiana'] },     // Qua
  { dayOffset: 3, clients: ['gabrielle', 'humberto'] }, // Qui
  { dayOffset: 4, clients: ['enio', 'fabiana'] },       // Sex
];

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.clickup.com',
      path,
      method,
      headers: {
        'Authorization': TOKEN,
        'Content-Type':  'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      }
    };
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch(e) { resolve({}); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Retorna segunda-feira da semana atual às 00:00
function getMondayOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay(); // 0=dom, 1=seg...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

async function hasOpenTaskForDate(listId, dueDateMs) {
  const startOfDay = new Date(dueDateMs);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dueDateMs);
  endOfDay.setHours(23, 59, 59, 999);

  const data = await request('GET', `/api/v2/list/${listId}/task?include_closed=false`);
  const tasks = data.tasks || [];
  return tasks.some(t =>
    t.name.toLowerCase().includes('otimiza') &&
    t.due_date &&
    parseInt(t.due_date) >= startOfDay.getTime() &&
    parseInt(t.due_date) <= endOfDay.getTime()
  );
}

async function main() {
  const monday = getMondayOfCurrentWeek();
  const weekStr = monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  console.log(`[${new Date().toISOString()}] Criando tasks da semana de ${weekStr}`);

  let created = 0;
  let skipped = 0;
  let errors  = 0;

  for (const slot of WEEK_SCHEDULE) {
    const dueDate = new Date(monday);
    dueDate.setDate(monday.getDate() + slot.dayOffset);
    dueDate.setHours(18, 0, 0, 0);
    const dueDateMs = dueDate.getTime();

    const dayName = dueDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });

    for (const key of slot.clients) {
      const client = CLIENTS[key];
      try {
        const exists = await hasOpenTaskForDate(client.listId, dueDateMs);
        if (exists) {
          console.log(`  ⏭ ${client.name} (${dayName}) → já existe`);
          skipped++;
          await sleep(200);
          continue;
        }

        const res = await request('POST', `/api/v2/list/${client.listId}/task`, {
          name:        `[${client.name}] Otimização de Campanha`,
          description: `Revisar performance das campanhas ativas:\n- Pausar adsets/criativos com frequência alta e CTR baixo\n- Verificar CPL e taxa de qualificação\n- Ajustar orçamento se necessário\n- Registrar observações`,
          assignees:   [MKT_SYRA],
          due_date:    dueDateMs,
          status:      'na fila',
          priority:    2,
        });

        if (res.id) {
          console.log(`  ✓ ${client.name} (${dayName}) → ${res.id}`);
          created++;
        } else {
          console.error(`  ✗ ${client.name} (${dayName}) → ${JSON.stringify(res).slice(0, 100)}`);
          errors++;
        }
      } catch (err) {
        console.error(`  ✗ ${client.name} (${dayName}) → ${err.message}`);
        errors++;
      }
      await sleep(350);
    }
  }

  console.log(`\nConcluído: ${created} criadas, ${skipped} já existiam, ${errors} erros.`);
  process.exit(errors > 0 ? 1 : 0);
}

main();
