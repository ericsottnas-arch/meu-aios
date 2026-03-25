#!/bin/bash
# morning-check-vitor.sh — Synkra Morning Check
# Executa todo dia às 8h: puxa atualizações do Eric e gera resumo do dia

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
  echo "[$DATE] $BEHIND novo(s) commit(s) do Eric disponível(is) em origin/eric/main." >> "$LOG_FILE"
  echo "[$DATE] Para puxar: git fetch origin && git merge origin/eric/main" >> "$LOG_FILE"
else
  echo "[$DATE] Nenhuma atualização nova do Eric." >> "$LOG_FILE"
fi

echo "[$DATE] Morning check concluído." >> "$LOG_FILE"
