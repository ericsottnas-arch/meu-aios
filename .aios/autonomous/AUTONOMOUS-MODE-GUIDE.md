# Autonomous Operation Mode Guide

## 🚀 Quick Start

**Ativar modo autônomo:**
```
/trabalhe-para-mim
```

**Com duração customizada:**
```
/trabalhe-para-mim 3h
```

**Com fila de tarefas customizada:**
```
/trabalhe-para-mim minha-fila.json
```

---

## 📋 O Que Acontece Quando Ativado

1. **Sistema carrega** `task-queue.json` (ou arquivo especificado)
2. **Inicializa execution log** com timestamp do início
3. **Executa primeira tarefa** imediatamente
4. **Aguarda 10-15 minutos** entre tarefas (slow mode)
5. **Para 5 minutos antes** do reset de tokens
6. **Registra tudo** em `execution-log.json`

---

## 🎯 Como Configurar Sua Fila de Tarefas

### Passo 1: Copiar Template
```bash
cp .aios/autonomous/task-queue-template.json .aios/autonomous/task-queue.json
```

### Passo 2: Editar com Suas Tarefas

```json
{
  "meta": {
    "name": "Minha Fila de Trabalho",
    "created": "2026-02-27T10:00:00Z",
    "duration_hours": 5
  },
  "tasks": [
    {
      "id": 1,
      "agent": "@pm",
      "command": "*onboard-client",
      "params": ["Seu Cliente Aqui"],
      "priority": "high",
      "wait_before_minutes": 0,
      "timeout_minutes": 30
    }
  ]
}
```

### Passo 3: Ativar
```
/trabalhe-para-mim task-queue.json
```

---

## 🔧 Estrutura de Tarefa

Cada tarefa tem:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | number | ID único da tarefa (1, 2, 3...) |
| `agent` | string | Qual agente executar (ex: @pm, @copy-chef) |
| `command` | string | Comando do agente (ex: *onboard-client) |
| `params` | array | Parâmetros do comando |
| `priority` | string | "high", "medium", "low" |
| `wait_before_minutes` | number | Minutos para esperar antes de executar |
| `timeout_minutes` | number | Tempo máximo para task completar |
| `description` | string | (opcional) Descrição legível |
| `notes` | string | (opcional) Notas/contexto |

---

## 🤖 Comportamento de Agentes em Modo Autônomo

### Importante: Auto-Aprovação de Permissões

**Quando em modo autônomo:**
- ✅ Todas as tool calls são auto-aprovadas
- ✅ Não haverá prompts de confirmação
- ✅ Agentes usam parâmetros sensatos se não especificado
- ✅ Logs vão direto para `execution-log.json`

**Exemplo de comportamento:**

```
Queue Manager → @pm
├─ Task: *onboard-client "Dr. Erico Servano"
├─ @pm skips "Tem certeza?" prompts
├─ @pm uses default folder structure
├─ @pm logs completion
└─ Queue Manager continues to next task
```

---

## 📊 Monitorando Progresso

### Em Tempo Real

Verifique o status em qualquer momento:

```bash
cat .aios/autonomous/execution-log.json | jq '.statistics'
```

### Formato do Log

```json
{
  "session_id": "auto-2026-02-27-10-30",
  "session_start": "2026-02-27T10:30:00Z",
  "mode": "autonomous-slow",
  "statistics": {
    "total_tasks_queued": 6,
    "tasks_completed": 2,
    "tasks_failed": 0,
    "tasks_pending": 4,
    "success_rate_percent": 100
  },
  "completed_tasks": [
    {
      "id": 1,
      "agent": "@pm",
      "command": "*onboard-client",
      "status": "completed",
      "duration_minutes": 12,
      "timestamp": "2026-02-27T10:45:00Z"
    }
  ]
}
```

---

## ⚙️ Configuração Avançada

### System Config (`.aios/autonomous/system-config.json`)

```json
{
  "defaults": {
    "min_delay_between_tasks_minutes": 10,
    "max_task_duration_minutes": 60,
    "max_retries_per_task": 1,
    "pause_before_token_reset_minutes": 5
  },
  "permissions": {
    "auto_approve_all_tools": true,
    "require_user_confirmation": false,
    "skip_interactive_prompts": true
  }
}
```

**Não edite** a menos que saiba o que está fazendo. Defaults são sensatos.

---

## 🛡️ Limites de Segurança

| Limite | Valor | Razão |
|--------|-------|-------|
| Concorrência | 1 task | Executação serial, sem race conditions |
| Duração máxima por task | 60 min | Previne travamentos |
| Retries | 1 | Recupera erros transitórios sem loop infinito |
| Memória máxima | 80% | Pausa se sistema fica sobrecarregado |
| Antes de reset | 5 min | Tempo para salvar estado e logs |

---

## 🔄 O Que Acontece No Reset de Tokens

**Cenário:** Durante execução, tokens resettam (a cada 5 horas)

**Fluxo:**
1. Task atual completar normalmente
2. Sistema salva estado em `execution-log.json`
3. Quando você voltar, **nova sessão automática inicia**
4. Sistema herda `task-queue.json` com tarefas restantes
5. Execução continua onde parou (sem duplicar)
6. Logs são mergeados (histórico completo mantido)

**Você não precisa fazer nada.** Sistema é resiliente a resets.

---

## 📝 Exemplos de Filas

### Exemplo 1: Onboarding Completo

```json
{
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

### Exemplo 2: Content Blitz (Copywriting Puro)

```json
{
  "tasks": [
    {
      "id": 1,
      "agent": "@halbert",
      "command": "*headlines",
      "params": ["Dr. Erico", "leads frios"],
      "wait_before_minutes": 0
    },
    {
      "id": 2,
      "agent": "@georgi",
      "command": "*sales-letter",
      "params": ["Dr. Erico"],
      "wait_before_minutes": 15
    },
    {
      "id": 3,
      "agent": "@orzechowski",
      "command": "*email-sequence",
      "params": ["Dr. Erico"],
      "wait_before_minutes": 20
    }
  ]
}
```

### Exemplo 3: Integration Sync

```json
{
  "tasks": [
    {
      "id": 1,
      "agent": "@ghl-maestro",
      "command": "*sync-conversations",
      "params": [],
      "wait_before_minutes": 0
    },
    {
      "id": 2,
      "agent": "@ghl-maestro",
      "command": "*sync-messages",
      "params": [],
      "wait_before_minutes": 10
    },
    {
      "id": 3,
      "agent": "@account",
      "command": "*analyze-conversations",
      "params": ["últimas 48 horas"],
      "wait_before_minutes": 15
    }
  ]
}
```

---

## 🆘 Troubleshooting

### Task não completou em tempo

**Sintoma:** `timeout_minutes` excedido

**Ação:**
1. Task é marcado como failed
2. Sistema tenta retry automático uma vez
3. Se retry falha, task é skipped
4. Próxima tarefa começa normalmente

### Muita memória sendo usada

**Sintoma:** Memory > 80%

**Ação:**
1. Sistema pausa execução
2. Aguarda 10 minutos
3. Retoma quando memória normaliza

### Sistema parou no meio

**Sintoma:** `execution-log.json` mostra incomplete

**Ação:**
1. Verifique logs: `tail -f .aios/autonomous/execution-log.json`
2. Identifique task que falhou
3. Remova completados do `task-queue.json` manualmente
4. Reatire `/trabalhe-para-mim` com fila atualizada

---

## 🎛️ Comandos Gerenciamento

Quando em modo autônomo, você PODE pausar/retomar (não precisa):

```
*queue-pause     # Pausa execução (resume manualmente)
*queue-resume    # Retoma execução
*queue-list      # Mostra tarefas pendentes
*queue-export    # Exporta log completo
```

---

## 🔐 Segurança & Privacidade

- ✅ Task queue é local (`.aios/autonomous/`)
- ✅ Nenhum upload de dados
- ✅ Auto-aprovação de tools só funciona quando Eric está logged in
- ✅ Logs salvos localmente (nunca enviados)
- ✅ Todos agentes respeitam permissões do usuário

---

## 📊 Comparação: Normal vs Autônomo

| Aspecto | Normal | Autônomo |
|--------|--------|----------|
| Interação | Conversacional | Zero (comandos apenas) |
| Permissões | Pede aprovação | Auto-aprova |
| Velocidade | Conversacional | Lenta (intentional) |
| Duração | Até 5h | Até 5h ou customizado |
| Logs | Console | JSON estruturado |
| Token Reset | Você reinicia | Sistema continua auto |
| Perfeito para | Development | Long tasks enquanto away |

---

## 🎯 Próximos Passos

1. **Crie sua fila:** Copie `task-queue-template.json` → `task-queue.json`
2. **Edite com suas tarefas:** Adapte agents/commands/params
3. **Ative:** `/trabalhe-para-mim`
4. **Saia:** Sistema roda enquanto você está away
5. **Volte:** Check `execution-log.json` para ver o que foi feito

---

**Criado:** 27 de fevereiro de 2026
**Versão:** 1.0
