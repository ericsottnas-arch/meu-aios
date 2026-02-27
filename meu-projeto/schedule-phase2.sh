#!/bin/bash
#
# Script para agendar Phase 2 (January export) para rodar em 2 horas
#
# Uso: ./schedule-phase2.sh [clientId]
# Exemplo: ./schedule-phase2.sh dr-erico-servano
#

CLIENT_ID=${1:-dr-erico-servano}
DELAY_SECONDS=$((2 * 60 * 60))  # 2 horas em segundos

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🔄 AGENDANDO PHASE 2 PARA RODAR EM 2 HORAS               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Cliente: $CLIENT_ID"
echo "Agora: $(date '+%d/%m/%Y %H:%M:%S')"
echo "Phase 2 rodará em: $(date -u -j -f '%s' $(($(date +%s) + DELAY_SECONDS)) '+%d/%m/%Y %H:%M:%S')"
echo ""
echo "⏳ Aguardando 2 horas..."
echo ""

# Agendar Phase 2 em background
(
  sleep $DELAY_SECONDS
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║  🔄 INICIANDO PHASE 2 - JANUARY EXPORT                    ║"
  echo "║     $(date '+%d/%m/%Y %H:%M:%S')                                ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""

  cd "$(dirname "$0")" || exit 1
  node export-jan-only.js "$CLIENT_ID"

  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║  ✅ PHASE 2 CONCLUÍDA                                      ║"
  echo "║     $(date '+%d/%m/%Y %H:%M:%S')                                ║"
  echo "║  📍 Próximo: node export-incremental.js $CLIENT_ID   ║"
  echo "╚════════════════════════════════════════════════════════════╝"
) &

BACKGROUND_PID=$!
echo "✅ Phase 2 agendado com sucesso (PID: $BACKGROUND_PID)"
echo ""
echo "Dicas:"
echo "  • Para cancelar: kill $BACKGROUND_PID"
echo "  • Para ver status: ps aux | grep $BACKGROUND_PID"
echo "  • Você pode fechar este terminal, Phase 2 rodará em background"
echo ""
