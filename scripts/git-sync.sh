#!/bin/bash
# git-sync.sh — Sincroniza novas transcrições e docs para o GitHub
# Roda como synkra às 01:00 BRT (após scribe-watcher das 00:00)

REPO="/home/synkra/meu-aios"
LOG="/home/synkra/meu-aios/logs/git-sync.log"

mkdir -p "$(dirname "$LOG")"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando git-sync..." >> "$LOG"

cd "$REPO"

# Verifica se há algo novo para commitar
git add docs/reunioes/ memory/ docs/clientes/ 2>/dev/null || true

if ! git diff --cached --quiet; then
  DATE=$(date '+%Y-%m-%d %H:%M')
  NEW=$(git diff --cached --name-only | grep "docs/reunioes/" | wc -l | tr -d ' ')
  git commit -m "sync: VPS — ${NEW} transcrição(ões) nova(s) [${DATE}]" >> "$LOG" 2>&1
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Commit feito." >> "$LOG"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Nada novo para commitar." >> "$LOG"
  exit 0
fi

# Pull (merge, sem rebase) e push
git pull --no-rebase -X ours origin eric/main >> "$LOG" 2>&1
git push origin eric/main >> "$LOG" 2>&1 && \
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Push concluído." >> "$LOG" || \
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERRO no push." >> "$LOG"
