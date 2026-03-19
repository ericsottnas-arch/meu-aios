/**
 * Runner: Transcrever todas as gravações pendentes do Drive
 * Uso: node run-transcribe-all.js [limit]
 *
 * Chamado pelo @scribe para batch transcription
 */

require('dotenv').config();
const { processAllPending, getStats, scanDriveRecordings } = require('./lib/meeting-transcriber');

const limit = parseInt(process.argv[2]) || 0;

async function main() {
  console.log('\n🎙️ SCRIBE — Batch Transcription Runner');
  console.log('=====================================');

  // Stats iniciais
  const stats = getStats();
  console.log(`\n📊 Estado atual:`);
  console.log(`   Total no Drive: ${stats.total} gravações`);
  console.log(`   Já transcritas: ${stats.transcribed}`);
  console.log(`   Pendentes: ${stats.pending}`);
  if (limit > 0) console.log(`   Limite desta sessão: ${limit}`);
  console.log('');

  if (stats.pending === 0) {
    console.log('✅ Nenhuma gravação pendente. Tudo transcrito!');
    return;
  }

  // Mostrar lista antes de processar
  const recordings = scanDriveRecordings();
  const pending = recordings.filter(r => !r.hasTranscription);
  console.log('📋 Gravações a processar:');
  const toShow = limit > 0 ? pending.slice(0, limit) : pending;
  toShow.forEach((r, i) => {
    console.log(`   ${i + 1}. [${r.date || '?'}] ${r.name} (${r.sizeFormatted}) — ${r.clientGuess?.name || '?'}`);
  });
  console.log('');

  // Processar
  const result = await processAllPending(limit);

  console.log('\n🎙️ Batch concluído.');
  console.log(`   ✅ Processadas: ${result.processed}`);
  console.log(`   ❌ Falharam: ${result.failed}`);
  console.log(`   📋 Restantes: ${result.remaining}`);
  console.log('\n📁 Transcrições salvas em: docs/reunioes/');
  console.log('📑 Índice atualizado em: docs/reunioes/INDEX.md');
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
});
