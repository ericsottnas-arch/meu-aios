# Setup Completo - Vitor (Windows)

## 1. Instalar Git (se ainda nao tem)

Baixar e instalar: https://git-scm.com/download/win

Depois abrir o **Git Bash** (vem junto com o Git) e rodar tudo por ele.

---

## 2. Clonar o repositorio

```bash
cd /c/Users/Victor
git clone https://github.com/ericsottnas-arch/meu-aios.git
cd meu-aios
```

## 3. Criar sua branch

```bash
git checkout -b vitor/main
git push -u origin vitor/main
```

## 4. Criar os scripts de sync

### 4.1 Script de push noturno

Criar o arquivo `C:\Users\Victor\meu-aios\scripts\sync-vitor.sh`:

```bash
#!/bin/bash
REPO_DIR="/c/Users/Victor/meu-aios"
BRANCH="vitor/main"
LOG_FILE="$REPO_DIR/scripts/sync.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

cd "$REPO_DIR" || { echo "[$DATE] ERRO: Dir nao encontrado" >> "$LOG_FILE"; exit 1; }

CURRENT=$(git branch --show-current)
if [ "$CURRENT" != "$BRANCH" ]; then
  git checkout "$BRANCH" 2>> "$LOG_FILE" || exit 1
fi

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

STAGED=$(git diff --cached --name-only 2>/dev/null)
if [ -z "$STAGED" ]; then
  echo "[$DATE] Sem alteracoes. Nada a fazer." >> "$LOG_FILE"
  exit 0
fi

git commit -m "sync(vitor): contexto $(date '+%Y-%m-%d')"
git push origin "$BRANCH" 2>> "$LOG_FILE"

if [ $? -eq 0 ]; then
  echo "[$DATE] OK: Push concluido" >> "$LOG_FILE"
else
  echo "[$DATE] ERRO: Falha no push" >> "$LOG_FILE"
fi
```

### 4.2 Script de check matinal

Criar o arquivo `C:\Users\Victor\meu-aios\scripts\morning-check-vitor.sh`:

```bash
#!/bin/bash
REPO_DIR="/c/Users/Victor/meu-aios"
MY_BRANCH="vitor/main"
OTHER_BRANCH="eric/main"
REPORT_FILE="$REPO_DIR/scripts/morning-report.md"
LOG_FILE="$REPO_DIR/scripts/sync.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

cd "$REPO_DIR" || exit 1

git fetch origin 2>> "$LOG_FILE"

if ! git rev-parse --verify "origin/$OTHER_BRANCH" >/dev/null 2>&1; then
  echo "[$DATE] Branch $OTHER_BRANCH nao existe." >> "$LOG_FILE"
  rm -f "$REPORT_FILE"
  exit 0
fi

NEW_COMMITS=$(git log "$MY_BRANCH..origin/$OTHER_BRANCH" --oneline 2>/dev/null)

if [ -z "$NEW_COMMITS" ]; then
  echo "[$DATE] Nenhuma atualizacao do Eric." >> "$LOG_FILE"
  rm -f "$REPORT_FILE"
  exit 0
fi

COMMIT_COUNT=$(echo "$NEW_COMMITS" | wc -l | tr -d ' ')

cat > "$REPORT_FILE" << REPORT
# Atualizacoes do Eric ($(date '+%Y-%m-%d'))

**$COMMIT_COUNT commit(s) novo(s) em \`$OTHER_BRANCH\`**

## Commits
$(git log "$MY_BRANCH..origin/$OTHER_BRANCH" --format="- **%s** (%ar)" 2>/dev/null)

## Arquivos alterados
$(git diff --name-status "$MY_BRANCH..origin/$OTHER_BRANCH" 2>/dev/null | while IFS=$'\t' read -r status file; do
  case "$status" in
    A) echo "- NOVO: $file" ;;
    M) echo "- ALTERADO: $file" ;;
    D) echo "- REMOVIDO: $file" ;;
    *) echo "- $status: $file" ;;
  esac
done)

---
Para aplicar: git merge origin/$OTHER_BRANCH
REPORT

echo "[$DATE] Relatorio: $COMMIT_COUNT commits do Eric pendentes." >> "$LOG_FILE"
```

## 5. Agendar no Windows (Agendador de Tarefas)

Abrir o **Prompt de Comando como Administrador** e rodar:

### 5.1 Push noturno (meia-noite)

```cmd
schtasks /create /tn "Synkra-Push-Noturno" /tr "\"C:\Program Files\Git\bin\bash.exe\" -l -c \"/c/Users/Victor/meu-aios/scripts/sync-vitor.sh\"" /sc daily /st 00:00 /f
```

### 5.2 Check matinal (8h)

```cmd
schtasks /create /tn "Synkra-Morning-Check" /tr "\"C:\Program Files\Git\bin\bash.exe\" -l -c \"/c/Users/Victor/meu-aios/scripts/morning-check-vitor.sh\"" /sc daily /st 08:00 /f
```

## 6. Testar

```bash
cd /c/Users/Victor/meu-aios

# Testar push
bash scripts/sync-vitor.sh

# Testar check
bash scripts/morning-check-vitor.sh

# Ver log
cat scripts/sync.log
```

## 7. Puxar atualizacoes do Eric (quando quiser)

```bash
cd /c/Users/Victor/meu-aios
git fetch origin
git merge origin/eric/main
```

---

## Resumo do Workflow

| Horario | O que acontece |
|---------|----------------|
| 00:00 | Seu contexto sobe automaticamente para `vitor/main` |
| 08:00 | Check se Eric commitou algo novo, gera relatorio |
| Manual | Abrir Claude Code, ele mostra o relatorio e pergunta se quer merge |

**Repo:** https://github.com/ericsottnas-arch/meu-aios
**Sua branch:** `vitor/main`
**Branch do Eric:** `eric/main`
