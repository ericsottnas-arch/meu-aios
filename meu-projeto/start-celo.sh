#!/bin/bash
# Start Celo - Media Buyer Expert Agent
# Usage: ./start-celo.sh [start|stop|restart|status]
# Nota: O tunnel Cloudflare é compartilhado com o Nico (config.yml)

export PATH="$HOME/bin:$PATH"
SERVER_PID_FILE="/tmp/celo-server.pid"
SERVER_LOG="/tmp/celo-server.log"

start() {
  echo "📈 Starting Celo Media Buyer..."

  cd "$(dirname "$0")"
  node celo-agent-server.js > "$SERVER_LOG" 2>&1 &
  echo $! > "$SERVER_PID_FILE"
  echo "   Server PID: $(cat $SERVER_PID_FILE)"

  # Verificar se o tunnel está rodando (compartilhado com Nico)
  if pgrep -f "cloudflared tunnel run nico-whatsapp" > /dev/null; then
    echo "   Tunnel: ✅ Já rodando (compartilhado com Nico)"
  else
    echo "   ⚠️  Tunnel não está rodando. Execute: ./start-nico.sh start"
  fi

  sleep 3
  echo ""
  echo "✅ Celo online!"
  echo "   Server: http://localhost:3002"
  echo "   Webhook: https://celo.syradigital.com/webhook"
  echo "   Bot: @MediaBuyerCelo_bot"
  echo "   Logs: tail -f $SERVER_LOG"
}

stop() {
  echo "🛑 Stopping Celo..."
  [ -f "$SERVER_PID_FILE" ] && kill "$(cat $SERVER_PID_FILE)" 2>/dev/null && rm "$SERVER_PID_FILE" && echo "   Server stopped"
  echo "✅ Done"
}

status() {
  echo "📊 Celo Status:"
  if [ -f "$SERVER_PID_FILE" ] && kill -0 "$(cat $SERVER_PID_FILE)" 2>/dev/null; then
    echo "   Server: ✅ Running (PID $(cat $SERVER_PID_FILE))"
  else
    echo "   Server: ❌ Not running"
  fi
  if pgrep -f "cloudflared tunnel run nico-whatsapp" > /dev/null; then
    echo "   Tunnel: ✅ Running (shared)"
  else
    echo "   Tunnel: ❌ Not running"
  fi
  curl -s https://celo.syradigital.com/ 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'   Health: ✅ {d[\"status\"]} | Uptime: {d[\"uptime\"]}s')" 2>/dev/null || echo "   Health: ❌ Unreachable"
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  restart) stop; sleep 2; start ;;
  status) status ;;
  *) echo "Usage: $0 {start|stop|restart|status}" ;;
esac
