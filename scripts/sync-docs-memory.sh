#!/bin/bash
# Synkra AIOS - Sync diário do repo inteiro para GitHub
# Roda via cron todos os dias às 00:00
# Eric e Vitor trabalham no mesmo repo

REPO_DIR="/Users/ericsantos/meu-aios"
LOG_FILE="$REPO_DIR/scripts/sync-docs-memory.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Garantir PATH com git e gh
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# Configurar gh como credential helper (cron não herda a sessão)
export GIT_TERMINAL_PROMPT=0
git config --global credential.helper '!gh auth git-credential' 2>/dev/null

cd "$REPO_DIR" || { echo "[$DATE] ERRO: Diretório não encontrado" >> "$LOG_FILE"; exit 1; }

# Verificar se há mudanças
CHANGES=$(git status --porcelain 2>/dev/null)

if [ -z "$CHANGES" ]; then
  echo "[$DATE] Sem alterações. Nada a fazer." >> "$LOG_FILE"
  exit 0
fi

# Adicionar tudo (respeitando .gitignore)
git add -A 2>/dev/null

# Commit com data
git commit -m "sync: atualização diária $(date '+%Y-%m-%d')" 2>> "$LOG_FILE"

if [ $? -ne 0 ]; then
  echo "[$DATE] ERRO: Falha no commit" >> "$LOG_FILE"
  exit 1
fi

# Push para origin
git push origin main 2>> "$LOG_FILE"

if [ $? -eq 0 ]; then
  echo "[$DATE] OK: Sync concluído com sucesso" >> "$LOG_FILE"
else
  echo "[$DATE] ERRO: Falha no push" >> "$LOG_FILE"
  exit 1
fi
