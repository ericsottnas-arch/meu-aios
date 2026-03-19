#!/bin/bash
# meu-projeto/start-ghl.sh
# Gerenciador do servidor GHL Webhook Receiver

set -e

GHL_PORT=${GHL_PORT:-3004}
PID_FILE="$HOME/.local/var/run/ghl-webhook.pid"
LOG_FILE="$HOME/.local/var/log/ghl-webhook.log"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Criar diretórios se não existirem
mkdir -p "$(dirname "$PID_FILE")"
mkdir -p "$(dirname "$LOG_FILE")"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções
start() {
  if [ -f "$PID_FILE" ]; then
    EXISTING_PID=$(cat "$PID_FILE")
    if kill -0 "$EXISTING_PID" 2>/dev/null; then
      echo -e "${YELLOW}⚠️  GHL Webhook Receiver já está rodando (PID: $EXISTING_PID)${NC}"
      return 1
    else
      rm -f "$PID_FILE"
    fi
  fi

  echo -e "${BLUE}🚀 Iniciando GHL Webhook Receiver...${NC}"

  # Iniciar servidor em background
  cd "$PROJECT_DIR"
  nohup node ghl-webhook-server.js >> "$LOG_FILE" 2>&1 &
  NEW_PID=$!

  # Salvar PID
  echo "$NEW_PID" > "$PID_FILE"

  # Aguardar inicialização
  sleep 2

  if kill -0 "$NEW_PID" 2>/dev/null; then
    echo -e "${GREEN}✅ GHL Webhook Receiver iniciado com sucesso${NC}"
    echo -e "   PID: $NEW_PID"
    echo -e "   Port: $GHL_PORT"
    echo -e "   Logs: $LOG_FILE"
  else
    echo -e "${RED}❌ Falha ao iniciar servidor${NC}"
    cat "$LOG_FILE"
    rm -f "$PID_FILE"
    return 1
  fi
}

stop() {
  if [ ! -f "$PID_FILE" ]; then
    echo -e "${YELLOW}⚠️  GHL Webhook Receiver não está rodando${NC}"
    return 1
  fi

  PID=$(cat "$PID_FILE")

  if ! kill -0 "$PID" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Processo não encontrado (PID: $PID)${NC}"
    rm -f "$PID_FILE"
    return 1
  fi

  echo -e "${BLUE}🛑 Encerrando GHL Webhook Receiver (PID: $PID)...${NC}"

  kill "$PID"

  # Aguardar até 5 segundos
  for i in {1..5}; do
    if ! kill -0 "$PID" 2>/dev/null; then
      break
    fi
    sleep 1
  done

  # Force kill se ainda estiver rodando
  if kill -0 "$PID" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Force killing (SIGKILL)...${NC}"
    kill -9 "$PID"
  fi

  rm -f "$PID_FILE"
  echo -e "${GREEN}✅ GHL Webhook Receiver encerrado${NC}"
}

restart() {
  echo -e "${BLUE}🔄 Reiniciando GHL Webhook Receiver...${NC}"
  stop || true
  sleep 1
  start
}

status() {
  if [ ! -f "$PID_FILE" ]; then
    echo -e "${YELLOW}⚠️  GHL Webhook Receiver não está rodando${NC}"
    return 1
  fi

  PID=$(cat "$PID_FILE")

  if kill -0 "$PID" 2>/dev/null; then
    echo -e "${GREEN}✅ GHL Webhook Receiver está rodando${NC}"
    echo -e "   PID: $PID"
    echo -e "   Port: $GHL_PORT"
    echo -e "   Status: $(curl -s http://localhost:$GHL_PORT/ | grep -o '"status":"[^"]*"' || echo 'N/A')"
    echo ""
    echo -e "${BLUE}📊 Logs recentes:${NC}"
    tail -n 10 "$LOG_FILE"
  else
    echo -e "${RED}❌ GHL Webhook Receiver não está rodando${NC}"
    rm -f "$PID_FILE"
    return 1
  fi
}

logs() {
  if [ -f "$LOG_FILE" ]; then
    echo -e "${BLUE}📋 Logs do GHL Webhook Receiver:${NC}"
    tail -f "$LOG_FILE"
  else
    echo -e "${RED}❌ Arquivo de log não encontrado${NC}"
    return 1
  fi
}

# Main
case "${1:-status}" in
start)
  start
  ;;
stop)
  stop
  ;;
restart)
  restart
  ;;
status)
  status
  ;;
logs)
  logs
  ;;
*)
  echo "Uso: $0 {start|stop|restart|status|logs}"
  echo ""
  echo "Comandos:"
  echo "  start   - Iniciar servidor GHL Webhook"
  echo "  stop    - Parar servidor GHL Webhook"
  echo "  restart - Reiniciar servidor GHL Webhook"
  echo "  status  - Verificar status"
  echo "  logs    - Ver logs em tempo real"
  exit 1
  ;;
esac
