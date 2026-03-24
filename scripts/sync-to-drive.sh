#!/bin/bash
# Synkra AIOS - Sync contexto local → Google Drive
# Roda via cron todos os dias às 00:00
# Drive sincroniza automaticamente pro Vitor

REPO_DIR="/Users/ericsantos/meu-aios"
DRIVE_DIR="/Users/ericsantos/Library/CloudStorage/GoogleDrive-ericsottnas@gmail.com/Meu Drive/Syra Digital/AIOS-Compartilhado"
LOG_FILE="$REPO_DIR/scripts/sync.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Verificar se Drive está acessível
if [ ! -d "$DRIVE_DIR" ]; then
  echo "[$DATE] ERRO: Drive nao acessivel" >> "$LOG_FILE"
  exit 1
fi

# Sync cada pasta de contexto (rsync = só copia o que mudou)
rsync -av --delete "$REPO_DIR/docs/" "$DRIVE_DIR/docs/" 2>/dev/null
rsync -av --delete "$REPO_DIR/memory/" "$DRIVE_DIR/memory/" 2>/dev/null
rsync -av --delete "$REPO_DIR/.claude/commands/" "$DRIVE_DIR/claude-commands/" 2>/dev/null
rsync -av --delete "$REPO_DIR/.claude/CLAUDE.md" "$DRIVE_DIR/CLAUDE.md" 2>/dev/null
rsync -av --delete "$REPO_DIR/.aios-core/development/agents/" "$DRIVE_DIR/agents/" 2>/dev/null
rsync -av --delete "$REPO_DIR/meu-projeto/docs/" "$DRIVE_DIR/meu-projeto-docs/" 2>/dev/null
rsync -av --delete "$REPO_DIR/meu-projeto/data/knowledge-base/" "$DRIVE_DIR/knowledge-base/" 2>/dev/null
rsync -av --delete "$REPO_DIR/meu-projeto/assets/brands/" "$DRIVE_DIR/brands/" 2>/dev/null

# Excluir arquivos que não devem ir
find "$DRIVE_DIR" -name "*.db" -o -name "*.db-shm" -o -name "*.db-wal" -o -name ".DS_Store" | xargs rm -f 2>/dev/null

# Timestamp de última sync
echo "$DATE" > "$DRIVE_DIR/LAST-SYNC-ERIC.txt"

echo "[$DATE] OK: Contexto sincronizado pro Drive" >> "$LOG_FILE"
