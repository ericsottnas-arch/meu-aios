#!/bin/bash
# Start Nico - Telegram Agent
# Usage: ./start-nico.sh [start|stop|status]

export PATH="$HOME/bin:$PATH"
SERVER_PID_FILE="/tmp/nico-telegram-server.pid"
TUNNEL_PID_FILE="/tmp/nico-telegram-tunnel.pid"
SERVER_LOG="/tmp/nico-telegram-server.log"
TUNNEL_LOG="/tmp/cloudflared-telegram.log"

start() {
  echo "🚀 Starting Nico Telegram Agent..."
  
  # Start the Node.js server
  cd "$(dirname "$0")"
  node telegram-webhook-server.js > "$SERVER_LOG" 2>&1 &
  echo $! > "$SERVER_PID_FILE"
  echo "   Server PID: $(cat $SERVER_PID_FILE)"
  
  # Start Cloudflare Tunnel
  # Assuming telegram-webhook-server.js runs on port 3000 (default in the script)
  cloudflared tunnel run nico-telegram > "$TUNNEL_LOG" 2>&1 &
  echo $! > "$TUNNEL_PID_FILE"
  echo "   Tunnel PID: $(cat $TUNNEL_PID_FILE)"
  
  sleep 3
  echo ""
  echo "✅ Nico Telegram online!"
  echo "   Server: http://localhost:3000"
  echo "   Webhook: http://localhost:3000/webhook" # Updated for local testing
  echo "   Logs: tail -f $SERVER_LOG"
}

stop() {
  echo "🛑 Stopping Nico Telegram Agent..."
  [ -f "$SERVER_PID_FILE" ] && kill "$(cat $SERVER_PID_FILE)" 2>/dev/null && rm "$SERVER_PID_FILE" && echo "   Server stopped"
  [ -f "$TUNNEL_PID_FILE" ] && kill "$(cat $TUNNEL_PID_FILE)" 2>/dev/null && rm "$TUNNEL_PID_FILE" && echo "   Tunnel stopped"
  pkill -f "cloudflared tunnel run nico-telegram" 2>/dev/null
  echo "✅ Done"
}

status() {
  echo "📊 Nico Telegram Status:"
  if [ -f "$SERVER_PID_FILE" ] && kill -0 "$(cat $SERVER_PID_FILE)" 2>/dev/null; then
    echo "   Server: ✅ Running (PID $(cat $SERVER_PID_FILE))"
  else
    echo "   Server: ❌ Not running"
  fi
  if [ -f "$TUNNEL_PID_FILE" ] && kill -0 "$(cat $TUNNEL_PID_FILE)" 2>/dev/null; then
    echo "   Tunnel: ✅ Running (PID $(cat $TUNNEL_PID_FILE))"
  else
    echo "   Tunnel: ❌ Not running"
  fi
  # Health check for the telegram-webhook-server.js (assumes it runs on port 3000)
  curl -s http://localhost:3000/ 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'   Health: ✅ {d[\"status\"]} | Service: {d[\"service\"]} | Uptime: {d[\"uptime\"]}s')" 2>/dev/null || echo "   Health: ❌ Unreachable"
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  restart) stop; sleep 2; start ;;
  status) status ;;
  *) echo "Usage: $0 {start|stop|restart|status}" ;;
esac
