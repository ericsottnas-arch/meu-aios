# 🚀 Autonomous Mode - Trabalhe para Mim

**Version:** 1.0
**Status:** ✅ Production Ready
**Created:** 27 February 2026

---

## O Que É?

Sistema que permite agentes **trabalharem continuamente durante 5 horas** enquanto você está ausente, sem precisar de sua interferência ou aprovação de permissões.

**Exemplo:**
```
Você:   /trabalhe-para-mim
Sistema: OK, carregue 6 tarefas, estou começando...
Você:   Sai e vai tomar café ☕
Sistema: [trabalhando silenciosamente por 5 horas]
         Tarefa 1 ✅ Onboarded cliente
         Tarefa 2 ✅ Coletou briefing
         Tarefa 3 ✅ Escreveu headlines
         Tarefa 4 ✅ Escreveu sales letter
         [tokens resetam, sistema continua automaticamente]
         Tarefa 5 ✅ Email sequence
         Tarefa 6 ✅ Follow-up sequence
Você:   Volta, checa .aios/autonomous/execution-log.json
         "Excelente! 6/6 tarefas completadas"
```

---

## ⚡ Começar em 2 Minutos

### Passo 1: Ver template
```bash
cat task-queue-template.json
```

### Passo 2: Copiar e editar
```bash
# Copiar template
cp task-queue-template.json task-queue.json

# Editar com SEUS dados
nano task-queue.json

# Ou usar EXAMPLE-TODAY.json como referência
cat EXAMPLE-TODAY.json
```

### Passo 3: Ativar
```bash
/trabalhe-para-mim
```

**Pronto!** Sistema roda enquanto você está away.

---

## 📁 Arquivos Neste Diretório

| Arquivo | Propósito | Ler? |
|---------|----------|------|
| **README.md** | Este arquivo (você está aqui) | ✅ Agora |
| **QUICK-START.txt** | Referência visual em 5 min | ✅ Próximo |
| **task-queue-template.json** | Template para suas tarefas | ✅ Edite |
| **task-queue.json** | Suas tarefas (cria após editar template) | ✅ Você cria |
| **EXAMPLE-TODAY.json** | Exemplo completo para copiar/colar | ✅ Se quiser |
| **system-config.json** | Configuração do sistema | ⚪ Opcional |
| **execution-log.json** | Log ao vivo (auto-atualizado) | ✅ Monitore |
| **INDEX.md** | Índice completo de tudo | ⚪ Referência |
| **AUTONOMOUS-MODE-GUIDE.md** | Guia de 400+ linhas | ⚪ Deep dive |
| **AGENT-AUTONOMOUS-BEHAVIOR.md** | Como cada agente se comporta | ⚪ Deep dive |

---

## 🎯 Como Usar (Resumido)

### 1️⃣ Criar Sua Fila

```bash
cp task-queue-template.json task-queue.json
nano task-queue.json
```

**Edite:**
- Agent name (ex: `@pm`, `@copy-chef`, `@georgi`)
- Command (ex: `*onboard-client`, `*client-brief`, `*write`)
- Params (ex: `["Dr. Erico Servano"]`)

### 2️⃣ Ativar Sistema

```bash
/trabalhe-para-mim
```

### 3️⃣ Sair e Deixar Rodando

Sistema executa tarefas sequencialmente, com pausas de 10-15 min entre cada uma.

### 4️⃣ (Opcional) Monitorar

```bash
# Ver status em tempo real
cat execution-log.json | jq '.statistics'

# Ou apenas
tail -f execution-log.json
```

---

## 🔄 Token Reset Automático

**Cenário:** Token resetta durante execução (a cada 5h)

**O que acontece:**
1. Task atual completa normalmente
2. Sistema salva estado em `execution-log.json`
3. Nova sessão inicia automaticamente
4. Lê `task-queue.json` e reconhece tarefas já feitas
5. Continua com tarefas restantes
6. Sem duplicação, sem re-ativação

**Você não faz nada.** Sistema é resiliente.

---

## 💾 Exemplo: Onboarding Completo

Copie este JSON para `task-queue.json`:

```json
{
  "meta": {
    "name": "Onboarding + Copy",
    "duration_hours": 5
  },
  "tasks": [
    {
      "id": 1,
      "agent": "@pm",
      "command": "*onboard-client",
      "params": ["Dra. Bruna Nogueira"],
      "wait_before_minutes": 0,
      "timeout_minutes": 30
    },
    {
      "id": 2,
      "agent": "@copy-chef",
      "command": "*client-brief",
      "params": ["Dra. Bruna Nogueira"],
      "wait_before_minutes": 15,
      "timeout_minutes": 45
    },
    {
      "id": 3,
      "agent": "@georgi",
      "command": "*write",
      "params": ["Dra. Bruna Nogueira"],
      "wait_before_minutes": 20,
      "timeout_minutes": 60
    }
  ]
}
```

Depois:
```bash
/trabalhe-para-mim
```

---

## 🤖 Agentes Disponíveis

### Copywriting
- `@copy-chef` - Orquestrador de copy
- `@halbert` - Headlines & direct response
- `@georgi` - Sales letters premium ($5K+)
- `@orzechowski` - Email sequences
- `@ogilvy` - Brand messaging
- `@wiebe` - Landing pages & CRO
- `@morgan` - Female-focused copy

### Integrations
- `@ghl-maestro` - GHL webhooks & sync
- `@account` - Conversation analysis
- `@celo` - Media buying & budget

### Operations
- `@pm` - Onboarding & project setup
- `@follow-up-specialist` - Follow-up sequences

### Development
- `@dev`, `@qa`, `@architect`, `@analyst`, `@po`, `@sm`

---

## ⚙️ Características

✅ **Execução Serial** - Uma tarefa por vez (sem race conditions)
✅ **Slow Mode** - 10-30 min entre tarefas
✅ **Zero Prompts** - Auto-aprovação total
✅ **Logging Estruturado** - JSON, não console
✅ **Resiliente** - Continua após token reset
✅ **Auto-Retry** - 1 tentativa automática se falhar
✅ **Graceful** - Falha em 1 não bloqueia fila
✅ **Memory Aware** - Pausa se memória > 80%
✅ **Token Aware** - Para 5 min antes reset

---

## 🛡️ Limites de Segurança

| Limite | Valor | Razão |
|--------|-------|-------|
| Concorrência | 1 | Serial, sem race conditions |
| Duração/task | 60 min | Previne travamentos |
| Retries | 1 | Recupera erros, sem loops |
| Memory | 80% max | Pausa se overload |
| Pré-reset | 5 min | Salva estado |

---

## 📊 Monitorando Progresso

### Em Tempo Real
```bash
tail -f execution-log.json
```

### Estatísticas
```bash
cat execution-log.json | jq '.statistics'
```

**Output esperado:**
```json
{
  "tasks_completed": 3,
  "tasks_failed": 0,
  "tasks_pending": 3,
  "success_rate_percent": 100
}
```

---

## 🎓 Próximos Passos

1. **Leia QUICK-START.txt** (5 min)
   ```bash
   cat QUICK-START.txt
   ```

2. **Copie template**
   ```bash
   cp task-queue-template.json task-queue.json
   ```

3. **Edite com SUAS tarefas**
   ```bash
   nano task-queue.json
   ```

4. **Ative sistema**
   ```bash
   /trabalhe-para-mim
   ```

5. **Saia e deixe rodando** ✨

---

## 🚨 Troubleshooting

### Task não completou em tempo
- Task é marcado como `failed`
- Próxima tarefa começa normalmente
- Checkup em `execution-log.json`

### Muita memória
- Sistema pausa automaticamente
- Aguarda 10 min
- Retoma quando normaliza

### Preciso pausar
- Use `*queue-pause` (pausa após task atual)
- Use `*queue-resume` para continuar

---

## 📖 Documentação

| Doc | Tamanho | Tempo | Propósito |
|-----|---------|-------|-----------|
| QUICK-START.txt | ~200 linhas | 5 min | Referência visual |
| AUTONOMOUS-MODE-GUIDE.md | ~400 linhas | 15 min | Guia completo |
| AGENT-AUTONOMOUS-BEHAVIOR.md | ~300 linhas | 20 min | Comportamento de agentes |
| INDEX.md | ~250 linhas | 10 min | Índice geral |

---

## 💬 Exemplos Práticos

### Exemplo 1: Onboarding de Cliente
```json
{
  "tasks": [
    {"id": 1, "agent": "@pm", "command": "*onboard-client", "params": ["Cliente"]},
    {"id": 2, "agent": "@copy-chef", "command": "*client-brief", "params": ["Cliente"], "wait_before_minutes": 15}
  ]
}
```

### Exemplo 2: Content Blitz (4 especialistas)
```json
{
  "tasks": [
    {"id": 1, "agent": "@halbert", "command": "*headlines", "params": ["Cliente"]},
    {"id": 2, "agent": "@georgi", "command": "*write", "params": ["Cliente"], "wait_before_minutes": 15},
    {"id": 3, "agent": "@orzechowski", "command": "*email-sequence", "params": ["Cliente"], "wait_before_minutes": 20},
    {"id": 4, "agent": "@morgan", "command": "*write-female", "params": ["Cliente"], "wait_before_minutes": 20}
  ]
}
```

### Exemplo 3: Integration Sync
```json
{
  "tasks": [
    {"id": 1, "agent": "@ghl-maestro", "command": "*sync-conversations", "params": []},
    {"id": 2, "agent": "@account", "command": "*analyze-conversations", "params": ["últimas 48 horas"], "wait_before_minutes": 15}
  ]
}
```

---

## ✨ Resumo

| Aspecto | Detalhe |
|--------|---------|
| **Ativação** | `/trabalhe-para-mim` |
| **Duração** | 5 horas (ou custom) |
| **Execução** | Serial, slow mode |
| **Permissões** | Auto-aprovadas |
| **Logging** | JSON estruturado |
| **Reset** | Automático, resiliente |
| **Agentes** | 18+ disponíveis |
| **Status** | Production ready |

---

## 🎯 Seu Primeiro Uso

**HOJE mesmo, em 5 minutos:**

```bash
# 1. Copiar
cp task-queue-template.json task-queue.json

# 2. Editar (adicione um cliente real)
nano task-queue.json

# 3. Ativar
/trabalhe-para-mim

# 4. Sair e aproveite a vida ☕
```

**Em 5 horas, quando voltar:**
```bash
# 5. Checar o que foi feito
cat execution-log.json | jq '.'
```

---

**Criado:** 27 de fevereiro de 2026
**Versão:** 1.0
**Status:** ✅ PRONTO PARA USAR

Qualquer dúvida, leia QUICK-START.txt ou AUTONOMOUS-MODE-GUIDE.md.
