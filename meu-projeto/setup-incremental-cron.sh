#!/bin/bash

# Script para configurar Cron job que sincroniza dados a cada 15 minutos
# Depois da rodada completa (export-complete.js), esse script mantém dados sempre atualizados

set -e

CLIENT_ID=${1:-dr-erico-servano}
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ⚙️  Setup: Sincronização Automática a cada 15 minutos     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Cliente: $CLIENT_ID"
echo "Projeto: $PROJECT_DIR"
echo ""

# Criar pasta de logs se não existir
if [ ! -d "$PROJECT_DIR/logs" ]; then
  mkdir -p "$PROJECT_DIR/logs"
  echo "✅ Pasta logs/ criada"
fi

# Cron job command
CRON_COMMAND="*/15 * * * * cd $PROJECT_DIR && node export-incremental.js $CLIENT_ID >> logs/incremental.log 2>&1"

# Temp file para crontab
CRON_TMP=$(mktemp)

# Exportar crontab atual (se existir)
crontab -l > "$CRON_TMP" 2>/dev/null || true

# Verificar se já existe
if grep -F "export-incremental.js $CLIENT_ID" "$CRON_TMP" > /dev/null; then
  echo "⚠️  Cron job para $CLIENT_ID já existe!"
  echo ""
  grep "export-incremental.js $CLIENT_ID" "$CRON_TMP"
  echo ""
  read -p "Deseja remover e readicionar? (s/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Ss]$ ]]; then
    grep -v "export-incremental.js $CLIENT_ID" "$CRON_TMP" > "$CRON_TMP.new"
    mv "$CRON_TMP.new" "$CRON_TMP"
  fi
fi

# Adicionar novo cron job
echo "$CRON_COMMAND" >> "$CRON_TMP"

# Instalar crontab atualizado
crontab "$CRON_TMP"

# Limpar temp
rm -f "$CRON_TMP"

echo ""
echo "✅ Cron job instalado com sucesso!"
echo ""
echo "📋 Configuração:"
echo "   Frequência: A cada 15 minutos"
echo "   Cliente: $CLIENT_ID"
echo "   Comando: node export-incremental.js"
echo "   Logs: $PROJECT_DIR/logs/incremental.log"
echo ""
echo "🔍 Ver cron jobs agendados:"
echo "   crontab -l"
echo ""
echo "📊 Ver logs em tempo real:"
echo "   tail -f logs/incremental.log"
echo ""
echo "❌ Para remover o cron job depois:"
echo "   crontab -e  (e remover a linha manualmente)"
echo ""
