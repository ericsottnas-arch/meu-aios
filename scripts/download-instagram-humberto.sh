#!/bin/bash

# Download de vídeos Instagram — Campanha Dr. Humberto
# Perfis: drarachelandrade | humbertoandradebr | institutohrandrade | doutores_da_face
# Ferramenta: yt-dlp

YT_DLP="/home/synkra/.local/bin/yt-dlp"
BASE_DIR="/home/synkra/meu-aios/data/instagram-humberto"
LOG_FILE="$BASE_DIR/download-log.txt"

echo "=======================================" | tee "$LOG_FILE"
echo "Download Instagram — Dr. Humberto Ads" | tee -a "$LOG_FILE"
echo "Data: $(date)" | tee -a "$LOG_FILE"
echo "=======================================" | tee -a "$LOG_FILE"

declare -A PROFILES=(
  ["drarachelandrade"]="https://www.instagram.com/drarachelandrade/"
  ["humbertoandradebr"]="https://www.instagram.com/humbertoandradebr/"
  ["institutohrandrade"]="https://www.instagram.com/institutohrandrade/"
  ["doutores_da_face"]="https://www.instagram.com/doutores_da_face/"
)

for PROFILE in "${!PROFILES[@]}"; do
  URL="${PROFILES[$PROFILE]}"
  DEST="$BASE_DIR/$PROFILE"

  echo "" | tee -a "$LOG_FILE"
  echo "→ Baixando: @$PROFILE" | tee -a "$LOG_FILE"
  echo "  URL: $URL" | tee -a "$LOG_FILE"

  $YT_DLP \
    --playlist-end 30 \
    --match-filter "duration > 5" \
    -o "$DEST/%(upload_date)s_%(id)s.%(ext)s" \
    --write-description \
    --write-info-json \
    --no-warnings \
    --ignore-errors \
    "$URL" 2>&1 | tee -a "$LOG_FILE"

  COUNT=$(ls "$DEST"/*.mp4 2>/dev/null | wc -l)
  echo "  ✓ $COUNT vídeo(s) baixados em $DEST" | tee -a "$LOG_FILE"
done

echo "" | tee -a "$LOG_FILE"
echo "=======================================" | tee -a "$LOG_FILE"
echo "RESUMO FINAL" | tee -a "$LOG_FILE"
for PROFILE in "${!PROFILES[@]}"; do
  COUNT=$(ls "$BASE_DIR/$PROFILE"/*.mp4 2>/dev/null | wc -l)
  echo "  @$PROFILE: $COUNT vídeos" | tee -a "$LOG_FILE"
done
echo "Log completo: $LOG_FILE" | tee -a "$LOG_FILE"
