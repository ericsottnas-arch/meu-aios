#!/usr/bin/env node
/**
 * Setup Eric's Weekly Routine in Google Calendar
 * Creates recurring events (Mon-Fri) for the daily work blocks.
 * Run once: node setup-eric-calendar.js
 */

require('dotenv').config();
const calendar = require('./lib/google-calendar');

const RECURRENCE_MO_FR = 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';

// Start from today
function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Build a local datetime string: "2026-03-10T08:00:00"
function makeLocalTime(baseDate, hours, minutes = 0) {
  const d = new Date(baseDate);
  d.setHours(hours, minutes, 0, 0);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(hours)}:${pad(minutes)}:00`;
}

const BLOCKS = [
  {
    title: '🏋️ Academia',
    startHour: 8, startMin: 0,
    durationMinutes: 60,
    description: 'Treino diário. Não reprogramar.',
    colorId: '2', // Sage (verde claro)
  },
  {
    title: '🔥 Motor de Receita — Prospecção & Vendas',
    startHour: 9, startMin: 0,
    durationMinutes: 180, // 3h
    description: [
      '09:00-10:00 → Prospecção ativa (LinkedIn, indicações, contatos diretos)',
      '• Identificar 3-5 profissionais de saúde/estética',
      '• Enviar mensagens personalizadas',
      '• Follow-up com prospects em andamento',
      '',
      '10:00-11:00 → Calls de venda / reuniões com prospects',
      '',
      '11:00-12:00 → Relacionamento com clientes atuais',
      '• Check com Dr. Erico, Vanessa, Gabrielle',
      '• Identificar oportunidades de upsell',
      '• Garantir satisfação',
      '',
      '⚡ REGRA: Este bloco é SAGRADO. Não abrir terminal.',
    ].join('\n'),
    colorId: '11', // Tomato (vermelho)
  },
  {
    title: '🍽️ Almoço',
    startHour: 12, startMin: 0,
    durationMinutes: 60,
    description: 'Pausa para almoço e descanso.',
    colorId: '8', // Graphite
  },
  {
    title: '📱 Conteúdo & Posicionamento',
    startHour: 13, startMin: 0,
    durationMinutes: 90,
    description: [
      '• Postar 1x no LinkedIn (Operational AI, cases, marketing médico)',
      '• Gravar 1 Reel curto para @byericsantos',
      '• Responder comentários e DMs',
      '• Networking em grupos de profissionais de saúde',
      '',
      '📊 Meta semanal: 5 posts LinkedIn + 3 Reels',
    ].join('\n'),
    colorId: '5', // Banana (amarelo)
  },
  {
    title: '🧠 Estratégia & Supervisão',
    startHour: 14, startMin: 30,
    durationMinutes: 150, // 2.5h
    description: [
      '14:30-15:30 → Revisar entregas do Vitor (criativos, campanhas)',
      '15:30-16:30 → Estratégia de clientes (campanhas, pivots, otimizações)',
      '16:30-17:00 → Sistemas/AIOS (máx 30min neste bloco)',
      '',
      '⚠️ Automação limitada a 30min aqui. O grosso é estratégia e supervisão.',
    ].join('\n'),
    colorId: '7', // Peacock (azul)
  },
  {
    title: '🌙 Deep Work (opcional)',
    startHour: 20, startMin: 0,
    durationMinutes: 60,
    description: [
      'Automação, AIOS, construção de sistemas.',
      '',
      '⚠️ REGRA: Só se os blocos Motor de Receita e Conteúdo foram cumpridos.',
      'Se não foram → usar esse horário para compensar.',
    ].join('\n'),
    colorId: '3', // Grape (roxo)
  },
];

async function main() {
  if (!calendar.isConfigured()) {
    console.error('❌ Google Service Account não configurado.');
    process.exit(1);
  }

  const startDate = today();
  console.log(`📅 Criando rotina semanal a partir de ${startDate.toLocaleDateString('pt-BR')} (GMT-3)...\n`);

  const results = [];

  for (const block of BLOCKS) {
    const startTime = makeLocalTime(startDate, block.startHour, block.startMin);

    console.log(`  ➤ ${block.title} (${String(block.startHour).padStart(2, '0')}:${String(block.startMin).padStart(2, '0')} — ${block.durationMinutes}min)`);
    console.log(`    startTime: ${startTime}`);

    const res = await calendar.createEvent({
      title: block.title,
      startTime,
      durationMinutes: block.durationMinutes,
      description: block.description,
      colorId: block.colorId,
      recurrence: RECURRENCE_MO_FR,
    });

    if (res.success) {
      console.log(`    ✅ Criado: ${res.htmlLink}\n`);
      results.push({ block: block.title, success: true, link: res.htmlLink });
    } else {
      console.log(`    ❌ Erro: ${res.error}\n`);
      results.push({ block: block.title, success: false, error: res.error });
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📊 RESUMO');
  console.log('═══════════════════════════════════════');

  const ok = results.filter(r => r.success).length;
  const fail = results.filter(r => !r.success).length;

  console.log(`✅ ${ok} blocos criados | ❌ ${fail} falhas`);
  console.log('\n🎯 Rotina configurada! Confira no Google Calendar.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
