#!/bin/bash
# Start Alex - Project Manager Telegram Agent
# Usage: ./start-alex.sh [start|stop|restart|status]

export PATH="$HOME/bin:$PATH"
SERVER_PID_FILE="/tmp/alex-project-manager.pid"
SERVER_LOG="/tmp/alex-project-manager.log"

start() {
  echo "🚀 Starting Alex Project Manager..."

  # Start the Node.js server
  cd "$(dirname "$0")"
  node alex-agent-server.js > "$SERVER_LOG" 2>&1 &
  echo $! > "$SERVER_PID_FILE"
  echo "   Server PID: $(cat $SERVER_PID_FILE)"

  sleep 2
  echo ""
  echo "✅ Alex Project Manager online!"
  echo "   Server: http://localhost:3003"
  echo "   Webhook: http://localhost:3003/webhook"
  echo "   Logs: tail -f $SERVER_LOG"
}

stop() {
  echo "🛑 Stopping Alex Project Manager..."
  [ -f "$SERVER_PID_FILE" ] && kill "$(cat $SERVER_PID_FILE)" 2>/dev/null && rm "$SERVER_PID_FILE" && echo "   Server stopped"
  echo "✅ Done"
}

status() {
  echo "📊 Alex Project Manager Status:"
  if [ -f "$SERVER_PID_FILE" ] && kill -0 "$(cat $SERVER_PID_FILE)" 2>/dev/null; then
    echo "   Server: ✅ Running (PID $(cat $SERVER_PID_FILE))"
  else
    echo "   Server: ❌ Not running"
  fi
  # Health check
  curl -s http://localhost:3003/ 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'   Health: ✅ {d[\"status\"]} | Service: {d[\"service\"]} | Uptime: {d[\"uptime\"]}s')" 2>/dev/null || echo "   Health: ❌ Unreachable"
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  restart) stop; sleep 2; start ;;
  status) status ;;
  *) echo "Usage: $0 {start|stop|restart|status}" ;;
esac
