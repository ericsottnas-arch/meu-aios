'use strict';
/**
 * clickup-otimizacao-semanal.js
 * Cria tasks de otimização de campanha no ClickUp — roda diário seg-sex.
 * Cron: 0 8 * * 1-5  (08:00 Seg a Sex)
 *
 * Cada cliente aparece 2x/semana com gap mínimo de 1 dia:
 *   Seg: Cleugo + Gabrielle
 *   Ter: Humberto + Enio
 *   Qua: Cleugo + Fabiana
 *   Qui: Gabrielle + Humberto
 *   Sex: Enio + Fabiana
 *
 * Deduplicação: verifica se já existe task aberta antes de criar.
 */

const https = require('https');

const TOKEN    = process.env.CLICKUP_API_KEY || 'pk_112052765_FNWBWCCA8GGL87JS4ZECY1M2LOS13AGB';
const MKT_SYRA = 112052765;

const ALL_CLIENTS = {
  cleugo:    { name: 'Dr Cleugo',          listId: '901326171452' },
  gabrielle: { name: 'Dra Gabrielle',       listId: '901326171457' },
  humberto:  { name: 'Dr Humberto Andrade', listId: '901326171463' },
  enio:      { name: 'Dr Enio Leite',       listId: '901326206577' },
  fabiana:   { name: 'Dra Fabiana Vargas',  listId: '901327146664' },
};

// Índice: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
const DAY_SCHEDULE = {
  1: ['cleugo', 'gabrielle'],
  2: ['humberto', 'enio'],
  3: ['cleugo', 'fabiana'],
  4: ['gabrielle', 'humberto'],
  5: ['enio', 'fabiana'],
};

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

async function hasOpenTaskToday(listId, clientName) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const data = await request('GET', `/api/v2/list/${listId}/task?include_closed=false`);
  const tasks = data.tasks || [];
  return tasks.some(t =>
    t.name.toLowerCase().includes('otimiza') &&
    t.due_date &&
    parseInt(t.due_date) >= todayStart.getTime() &&
    parseInt(t.due_date) <= todayEnd.getTime()
  );
}

async function main() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Dom ... 6=Sab

  const todayKeys = DAY_SCHEDULE[dayOfWeek];
  if (!todayKeys) {
    console.log(`[${now.toISOString()}] Fora do calendário de otimização (fim de semana). Nada a fazer.`);
    process.exit(0);
  }

  const dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);
  const dueDateMs = dueDate.getTime();

  const dayName = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  const clients = todayKeys.map(k => ALL_CLIENTS[k]);
  console.log(`[${now.toISOString()}] Otimização — ${dayName} | Clientes: ${clients.map(c => c.name).join(', ')}`);

  let created = 0;
  let skipped = 0;
  let errors  = 0;

  for (const client of clients) {
    try {
      const alreadyExists = await hasOpenTaskToday(client.listId, client.name);
      if (alreadyExists) {
        console.log(`  ⏭ ${client.name} → task de hoje já existe, pulando`);
        skipped++;
        await sleep(300);
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
        console.log(`  ✓ ${client.name} → task ${res.id}`);
        created++;
      } else {
        console.error(`  ✗ ${client.name} → ${JSON.stringify(res).slice(0, 100)}`);
        errors++;
      }
    } catch (err) {
      console.error(`  ✗ ${client.name} → ${err.message}`);
      errors++;
    }
    await sleep(400);
  }

  console.log(`\nConcluído: ${created} criadas, ${skipped} já existiam, ${errors} erros.`);
  process.exit(errors > 0 ? 1 : 0);
}

main();
