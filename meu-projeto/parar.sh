#!/bin/bash
# parar.sh — Para a gravação e transcreve com Whisper

PID_FILE="/tmp/ouvir.pid"
AUDIO_FILE="/tmp/ouvir_audio.wav"
GROQ_KEY=$(grep "GROQ_API_KEY" "$(dirname "$0")/.env" | cut -d'=' -f2 | tr -d '"' | tr -d '\r')

if [ ! -f "$PID_FILE" ]; then
  echo "❌ Nenhuma gravação em andamento. Rode ./ouvir.sh primeiro."
  exit 1
fi

PID=$(cat "$PID_FILE")
kill "$PID" 2>/dev/null
wait "$PID" 2>/dev/null
rm -f "$PID_FILE"

echo "⏹️  Gravação encerrada."

sleep 0.5

if [ ! -f "$AUDIO_FILE" ] || [ ! -s "$AUDIO_FILE" ]; then
  echo "❌ Arquivo de áudio vazio ou não encontrado."
  exit 1
fi

echo "🔄 Transcrevendo com Whisper..."

RESPOSTA=$(curl -s https://api.groq.com/openai/v1/audio/transcriptions \
  -H "Authorization: Bearer $GROQ_KEY" \
  -F "file=@${AUDIO_FILE};type=audio/wav" \
  -F "model=whisper-large-v3" \
  -F "language=pt" \
  -F "response_format=text")

rm -f "$AUDIO_FILE"

echo ""
echo "📝 Transcrição:"
echo "───────────────"
echo "$RESPOSTA"
echo "───────────────"
