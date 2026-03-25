#!/bin/bash
# Synkra AIOS - Push noturno de contexto compartilhado
# Roda via cron todos os dias às 00:00
# Sobe apenas: docs/ memory/ .claude/commands/ agents/

REPO_DIR="/Users/ericsantos/meu-aios"
BRANCH="eric/main"
LOG_FILE="$REPO_DIR/scripts/sync.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export GIT_TERMINAL_PROMPT=0

cd "$REPO_DIR" || { echo "[$DATE] ERRO: Dir nao encontrado" >> "$LOG_FILE"; exit 1; }

# Garantir que está na branch certa
CURRENT=$(git branch --show-current)
if [ "$CURRENT" != "$BRANCH" ]; then
  git checkout "$BRANCH" 2>> "$LOG_FILE" || { echo "[$DATE] ERRO: Falha ao trocar pra $BRANCH" >> "$LOG_FILE"; exit 1; }
fi

# Adicionar apenas pastas de contexto
git add \
  docs/ \
  memory/ \
  .claude/commands/ \
  .claude/CLAUDE.md \
  .aios-core/development/agents/ \
  meu-projeto/docs/ \
  meu-projeto/data/knowledge-base/ \
  meu-projeto/design-feedback-rules.json \
  meu-projeto/assets/brands/ \
  scripts/ \
  .gitignore \
  2>/dev/null

# Verificar se tem algo staged
STAGED=$(git diff --cached --name-only 2>/dev/null)
if [ -z "$STAGED" ]; then
  echo "[$DATE] Sem alteracoes de contexto. Nada a fazer." >> "$LOG_FILE"
  exit 0
fi

# Commit
git commit -m "sync(eric): contexto $(date '+%Y-%m-%d')" 2>> "$LOG_FILE"
if [ $? -ne 0 ]; then
  echo "[$DATE] ERRO: Falha no commit" >> "$LOG_FILE"
  exit 1
fi

# Push
git push origin "$BRANCH" 2>> "$LOG_FILE"
if [ $? -eq 0 ]; then
  echo "[$DATE] OK: Push concluido - $(echo "$STAGED" | wc -l | tr -d ' ') arquivos" >> "$LOG_FILE"
else
  echo "[$DATE] ERRO: Falha no push" >> "$LOG_FILE"
  exit 1
fi
