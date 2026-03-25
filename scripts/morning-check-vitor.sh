#!/bin/bash
# morning-check-vitor.sh — Synkra Morning Sync
# Executa todo dia às 9h: puxa e aplica atualizações do Eric automaticamente

REPO_DIR="/c/Users/Victor/meu-aios"
LOG_FILE="$REPO_DIR/logs/morning-check.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

mkdir -p "$REPO_DIR/logs"

cd "$REPO_DIR" || exit 1

git checkout vitor/main 2>/dev/null

# Puxa atualizações do Eric
git fetch origin >> "$LOG_FILE" 2>&1

BEHIND=$(git rev-list HEAD..origin/eric/main --count 2>/dev/null)

if [[ "$BEHIND" -gt 0 ]]; then
  echo "[$DATE] $BEHIND novo(s) commit(s) do Eric encontrado(s). Aplicando merge..." >> "$LOG_FILE"
  git merge origin/eric/main --no-edit >> "$LOG_FILE" 2>&1
  if [[ $? -eq 0 ]]; then
    git push origin vitor/main >> "$LOG_FILE" 2>&1
    echo "[$DATE] Merge concluído e push realizado." >> "$LOG_FILE"
  else
    echo "[$DATE] ERRO: Conflito no merge. Resolução manual necessária." >> "$LOG_FILE"
  fi
else
  echo "[$DATE] Nenhuma atualização nova do Eric." >> "$LOG_FILE"
fi

echo "[$DATE] Morning sync concluído." >> "$LOG_FILE"
