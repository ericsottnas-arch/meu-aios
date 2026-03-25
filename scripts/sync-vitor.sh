#!/bin/bash
# sync-vitor.sh — Synkra Push Noturno
# Executa todo dia à meia-noite: comita e faz push das mudanças do dia

REPO_DIR="/c/Users/Victor/meu-aios"
LOG_FILE="$REPO_DIR/logs/sync-vitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

mkdir -p "$REPO_DIR/logs"

cd "$REPO_DIR" || exit 1

# Garante que está na branch certa
git checkout vitor/main 2>/dev/null

# Puxa atualizações remotas antes de fazer push
git fetch origin >> "$LOG_FILE" 2>&1

# Verifica se tem mudanças para commitar
if [[ -n $(git status --porcelain) ]]; then
  git add -A
  git commit -m "sync: auto-push noturno $DATE"
  git push origin vitor/main >> "$LOG_FILE" 2>&1
  echo "[$DATE] Push realizado com sucesso." >> "$LOG_FILE"
else
  echo "[$DATE] Nenhuma mudança para commitar." >> "$LOG_FILE"
fi
