#!/bin/bash
# ouvir.sh — Inicia gravação do áudio do sistema em background
# Para e transcreve: ./parar.sh

PID_FILE="/tmp/ouvir.pid"
AUDIO_FILE="/tmp/ouvir_audio.wav"

if [ -f "$PID_FILE" ]; then
  echo "⚠️  Já tem uma gravação em andamento. Rode ./parar.sh primeiro."
  exit 1
fi

rm -f "$AUDIO_FILE"

echo "🎙️  Gravando áudio do sistema... rode ./parar.sh quando terminar."

ffmpeg -f avfoundation -i ":0" -ar 16000 -ac 1 "$AUDIO_FILE" -y -loglevel quiet &
echo $! > "$PID_FILE"
