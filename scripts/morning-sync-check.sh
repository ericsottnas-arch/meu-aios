#!/bin/bash
# Synkra AIOS - Check matinal de atualizações do Vitor
# Roda via cron às 08:00
# Faz fetch, verifica commits novos, gera resumo em arquivo
# Claude lê o resumo e pergunta se quer fazer merge

REPO_DIR="/Users/ericsantos/meu-aios"
MY_BRANCH="eric/main"
OTHER_BRANCH="vitor/main"
REPORT_FILE="$REPO_DIR/scripts/morning-report.md"
LOG_FILE="$REPO_DIR/scripts/sync.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export GIT_TERMINAL_PROMPT=0

cd "$REPO_DIR" || exit 1

# Fetch atualizações
git fetch origin 2>> "$LOG_FILE"

# Verificar se a branch do Vitor existe
if ! git rev-parse --verify "origin/$OTHER_BRANCH" >/dev/null 2>&1; then
  echo "[$DATE] Branch $OTHER_BRANCH ainda nao existe no remote." >> "$LOG_FILE"
  rm -f "$REPORT_FILE"
  exit 0
fi

# Contar commits novos do Vitor que não estão na minha branch
NEW_COMMITS=$(git log "$MY_BRANCH..origin/$OTHER_BRANCH" --oneline 2>/dev/null)

if [ -z "$NEW_COMMITS" ]; then
  echo "[$DATE] Nenhuma atualizacao do Vitor." >> "$LOG_FILE"
  rm -f "$REPORT_FILE"
  exit 0
fi

COMMIT_COUNT=$(echo "$NEW_COMMITS" | wc -l | tr -d ' ')

# Gerar relatório
cat > "$REPORT_FILE" << REPORT
# Atualizacoes do Vitor ($(date '+%Y-%m-%d'))

**$COMMIT_COUNT commit(s) novo(s) em \`$OTHER_BRANCH\`**

## Commits
$(git log "$MY_BRANCH..origin/$OTHER_BRANCH" --format="- **%s** (%ar)" 2>/dev/null)

## Arquivos alterados
$(git diff --stat "$MY_BRANCH..origin/$OTHER_BRANCH" 2>/dev/null)

## Detalhes das mudancas
$(git diff --name-status "$MY_BRANCH..origin/$OTHER_BRANCH" 2>/dev/null | while IFS=$'\t' read -r status file; do
  case "$status" in
    A) echo "- **NOVO:** $file" ;;
    M) echo "- **ALTERADO:** $file" ;;
    D) echo "- **REMOVIDO:** $file" ;;
    *) echo "- $status: $file" ;;
  esac
done)

---
*Para aplicar: \`git merge origin/$OTHER_BRANCH\` na branch \`$MY_BRANCH\`*
REPORT

echo "[$DATE] Relatorio gerado: $COMMIT_COUNT commits do Vitor pendentes." >> "$LOG_FILE"

# Notificação macOS
osascript -e "display notification \"$COMMIT_COUNT atualizacao(es) do Vitor pendentes. Abra o Claude Code para revisar.\" with title \"Synkra AIOS\" sound name \"Glass\"" 2>/dev/null
