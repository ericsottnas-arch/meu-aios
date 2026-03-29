#!/bin/bash
# Synkra AIOS - Sync contexto local → GitHub
# Roda via cron todos os dias às 08:00
# Vitor faz git pull às 09:00 e recebe tudo atualizado

REPO_DIR="/Users/ericsantos/meu-aios"
BRANCH="eric/main"
LOG_FILE="$REPO_DIR/scripts/sync-github.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

cd "$REPO_DIR" || exit 1

# Verificar se há mudanças (staged ou unstaged)
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "[$DATE] Nada mudou, skip." >> "$LOG_FILE"
  exit 0
fi

# Adicionar tudo (respeitando .gitignore)
git add -A

# Verificar novamente se tem algo staged
if git diff --cached --quiet; then
  echo "[$DATE] Nada staged após add, skip." >> "$LOG_FILE"
  exit 0
fi

# Commit com data
git commit -m "sync: $(date '+%Y-%m-%d %H:%M') — atualizacao automatica diaria"

# Push
if git push origin "$BRANCH" 2>> "$LOG_FILE"; then
  echo "[$DATE] OK: push para $BRANCH concluido" >> "$LOG_FILE"
else
  echo "[$DATE] ERRO: push falhou" >> "$LOG_FILE"
  exit 1
fi
