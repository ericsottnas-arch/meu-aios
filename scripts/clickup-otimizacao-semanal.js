'use strict';
/**
 * clickup-otimizacao-semanal.js
 * Cria tasks de otimização de campanha no ClickUp toda Seg e Qui.
 * Cron: 0 8 * * 1,4  (08:00 Segunda e Quinta)
 *
 * Para cada cliente: cria 1 task "Otimização de Campanha" com due_date = hoje
 * e atribui ao usuário Mkt Syra.
 */

const https = require('https');

const TOKEN    = process.env.CLICKUP_API_KEY || 'pk_112052765_FNWBWCCA8GGL87JS4ZECY1M2LOS13AGB';
const MKT_SYRA = 112052765;

// Clientes ativos com tráfego pago
// list_id = lista do cliente no ClickUp (pasta Clientes > Syra Digital)
const CLIENTS = [
  { name: 'Dr Cleugo',          listId: '901326171452' },
  { name: 'Dr Érico Servano',   listId: '901326171454' },
  { name: 'Dra Bruna Nogueira', listId: '901326171455' },
  { name: 'Dra Gabrielle',      listId: '901326171457' },
  { name: 'Dra Vanessa Soares', listId: '901326171460' },
  { name: 'HR Andrade',         listId: '901326171463' },
  { name: 'Dr Enio Leite',      listId: '901326206577' },
];

function post(listId, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const opts = {
      hostname: 'api.clickup.com',
      path:     `/api/v2/list/${listId}/task`,
      method:   'POST',
      headers: {
        'Authorization': TOKEN,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(payload),
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
    req.write(payload);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // Due date = hoje às 18:00 (horário de Brasília = UTC-3)
  const now = new Date();
  const dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);
  const dueDateMs = dueDate.getTime();

  const dayName = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  console.log(`[${new Date().toISOString()}] Criando tasks de otimização — ${dayName}`);

  let created = 0;
  let errors  = 0;

  for (const client of CLIENTS) {
    try {
      const res = await post(client.listId, {
        name:      `[${client.name}] Otimização de Campanha`,
        description: `Revisar performance das campanhas ativas:\n- Pausar adsets/criativos com frequência alta e CTR baixo\n- Verificar CPL e taxa de qualificação\n- Ajustar orçamento se necessário\n- Registrar observações`,
        assignees: [MKT_SYRA],
        due_date:  dueDateMs,
        status:    'na fila',
        priority:  2,
      });

      if (res.id) {
        console.log(`  ✓ ${client.name} → task ${res.id}`);
        created++;
      } else {
        console.error(`  ✗ ${client.name} → ${JSON.stringify(res).slice(0, 80)}`);
        errors++;
      }
    } catch (err) {
      console.error(`  ✗ ${client.name} → ${err.message}`);
      errors++;
    }
    await sleep(400);
  }

  console.log(`\nConcluído: ${created} criadas, ${errors} erros.`);
  process.exit(errors > 0 ? 1 : 0);
}

main();
