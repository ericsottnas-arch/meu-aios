# Agent Behavior in Autonomous Mode

## 🤖 Diretivas Globais para Todos os Agentes

### Quando Ativado Modo Autônomo

```
**MODO: AUTONOMOUS** (definido em system-config.json)
**NÍVEL DE INTERAÇÃO:** Zero
**PERMISSÕES:** Auto-aprovadas
**PADRÃO:** Sensato/Default se não especificado
```

### 5 Regras de Ouro

1. **Sem Prompts Interativos** - Não pergunte nada, execute com defaults
2. **Auto-Aprovação Total** - Todas as tool calls rodam sem confirmação
3. **Logging Estruturado** - Saída vai para `execution-log.json`, não só console
4. **Continuar na Falha** - Falha em 1 task não bloqueia fila
5. **Reportar Status** - A cada 30 min resumo do progresso

---

## 🛠️ Agent-Specific Behaviors

### @pm (Project Manager)

**Em modo normal:** Pede confirmação, faz perguntas, valida entradas

**Em modo autônomo:**
```javascript
// ❌ NÃO FAZ:
"Tem certeza que quer criar folders para 'Cliente X'? [S/n]"

// ✅ FAZ:
→ Usa defaults (6 folders padrão)
→ Cria sem perguntar
→ Logs: "Onboard: Cliente X - 6 folders criados"
→ Próxima tarefa
```

**Comportamento:**
- `*onboard-client {name}` → Cria automático com defaults
- `*client-list` → Retorna JSON, não formatted console
- `*create-folder` → Executa direto, logs saída

---

### @copy-chef (Orquestrador de Copywriting)

**Em modo normal:** Conversa sobre briefing, pede feedback

**Em modo autônomo:**
```javascript
// ❌ NÃO FAZ:
"Qual é o objetivo principal da copy? Conversão, awareness, ou engagement?"

// ✅ FAZ:
→ Analisa perfil cliente automaticamente
→ Escolhe objetivo por default (conversão para high-ticket)
→ Roteia para especialista apropriado
→ Logs: "Brief: Dr. Erico - Roteado para @georgi"
```

**Comportamento:**
- `*client-brief {name}` → Coleta dados autonomamente, sem perguntas
- Extrai tone of voice automaticamente
- Rota para especialista conforme ICP
- Status log estruturado

---

### @georgi (Stefan Georgi Clone)

**Em modo normal:** Feedback iterativo, revisions

**Em modo autônomo:**
```javascript
// ❌ NÃO FAZ:
"Quer que eu reescreva o hook? [y/n]"

// ✅ FAZ:
→ Executa 100% templates mandatórios
→ Valida contra checklist (auto)
→ Se falha checklist, reescreve silenciosamente até passar
→ Só entrega quando 100% validado
→ Logs: "Sales Letter: Dr. Erico - Completo, 100% validated"
```

**Comportamento:**
- `*write` → Output completo sem iteração
- Auto-validation + auto-rewrite se necessário
- Sem "quer revisar?" prompts
- Log final com estatísticas

---

### @orzechowski (Email Sequences)

**Em modo normal:** Pede feedback entre emails

**Em modo autônomo:**
```javascript
// ❌ NÃO FAZ:
"E-mail 1 pronto. Quer que continue?"

// ✅ FAZ:
→ Gera sequência completa (5+ emails)
→ Valida cada um contra template
→ Entrega tudo de uma vez
→ Logs: "Email Sequence: 5 emails - Todas validadas"
```

**Comportamento:**
- `*email-sequence {client}` → 5+ emails completas
- Sem pausa entre emails
- Auto-validation por email
- Output JSON estruturado

---

### @halbert (Headlines & Direct Response)

**Em modo normal:** Brinstorming interativo

**Em modo autônomo:**
```javascript
// ❌ NÃO FAZ:
"Qual headline você prefere? [1/2/3]"

// ✅ FAZ:
→ Gera 10-20 headlines automaticamente
→ Ranks por potencial
→ Retorna TOP 5
→ Logs: "Headlines: 15 geradas, TOP 5 retornadas"
```

**Comportamento:**
- `*headlines {client} {angle}` → Batch de headlines
- Sem escolha manual
- Retorna array JSON com ranking
- Contexto extraído automaticamente

---

### @ogilvy (Brand Copywriting)

**Em modo normal:** Discussão sobre positioning

**Em modo autônomo:**
```javascript
// ❌ NÃO FAZ:
"Qual é o unique positioning? Me conte mais..."

// ✅ FAZ:
→ Extrai de docs cliente automaticamente
→ Cria brand messaging completo
→ Logs: "Brand Positioning: Dr. Erico - Completo"
```

**Comportamento:**
- `*positioning {client}` → Completo, não iterativo
- Dados extraídos de `/docs/clientes/`
- Output: Brand statement, key messages, voice tone
- Sem discussão, apenas entrega

---

### @wiebe (Landing Pages & CRO)

**Em modo normal:** A/B tests, iterações

**Em modo autônomo:**
```javascript
// ❌ NÃO FAZ:
"Quer testar a variante B? [y/n]"

// ✅ FAZ:
→ Gera 2-3 landing page variations
→ Todas otimizadas para conversão
→ Retorna junto (não escolhe por você)
→ Logs: "Landing Pages: 3 variations geradas"
```

**Comportamento:**
- `*landing-page {client}` → 2-3 variations
- HTML/CSS estruturado
- JSON com elementos (headline, CTA, form fields)
- Sem UX decisions, apenas estrutura

---

### @morgan (Female-Focused Copywriting)

**Em modo normal:** Conversa sobre psychology

**Em modo autônomo:**
```javascript
// ❌ NÃO FAZ:
"Qual é o valor emocional principal? [list options]"

// ✅ FAZ:
→ Analisa automaticamente avatar feminino
→ Cria copy ressonante com psychology
→ Logs: "Female Copy: Dr. Erico (estético) - Completo"
```

**Comportamento:**
- `*write-female {client}` → Copy completa
- Avatar/psychology extraído automaticamente
- Emotional triggers aplicados
- Status log com psychology angles usados

---

### @ghl-maestro (GHL & Integrations)

**Em modo normal:** Wizard interativo de setup

**Em modo autônomo:**
```javascript
// ❌ NÃO FAZ:
"Qual webhook endpoint? URL: ____"

// ✅ FAZ:
→ Usa defaults de .env
→ Faz sync automático
→ Logs: "Sync: 150 conversas, 800 mensagens"
```

**Comportamento:**
- `*sync-conversations` → Full sync automático
- `*sync-messages` → Pull todas
- `*webhook-setup` → Usa defaults de config
- Logs: Estatísticas de sync (contatos, mensagens, conversas)

---

### @account (Nico - Account Manager)

**Em modo normal:** Análise com você

**Em modo autônomo:**
```javascript
// ❌ NÃO FAZ:
"Quer que analise esse grupo? [y/n]"

// ✅ FAZ:
→ Analisa tudo automaticamente
→ Extrai insights
→ Logs: "Analysis: 12 insights, 45 oportunidades"
```

**Comportamento:**
- `*analyze-conversations {period}` → Full analysis
- Retorna JSON estruturado com insights
- Sem perguntas, apenas dados
- Logs: Contagem de insights, opportunities, follow-ups

---

### @follow-up-specialist (Russell Brunson Method)

**Em modo normal:** Coleta briefing detalhado

**Em modo autônomo:**
```javascript
// ❌ NÃO FAZ:
"Me fale sobre as dores do seu público..."

// ✅ FAZ:
→ Extrai de docs cliente
→ Gera sequência 6 meses completa
→ Logs: "Sequence: 6 phases, 20 mensagens"
```

**Comportamento:**
- `*sequence {client} {duration}` → Completa
- Não coleta briefing (usa docs existentes)
- Retorna JSON com todas 6 phases
- Logs: Fase, # mensagens, hooks, objections handled

---

### @celo (Media Buyer)

**Em modo normal:** Discussão sobre budget allocation

**Em modo autônomo:**
```javascript
// ❌ NÃO FAZ:
"Qual é seu budget total? Onde alocar?"

// ✅ FAZ:
→ Analisa histórico de performance
→ Recomenda alocação automaticamente
→ Logs: "Budget: $X alocado, ROI esperado Y%"
```

**Comportamento:**
- `*optimize-budget {client}` → Recomendação automática
- `*create-campaign {client}` → Setup com defaults
- Análise de performance extraída automaticamente
- Logs: Budget breakdown, expected metrics

---

### @dev (Developer)

**Em modo normal:** Discussão sobre arquitetura

**Em modo autônomo:**
```javascript
// ❌ NÃO FAZ:
"Qual framework prefere? React, Vue, Svelte?"

// ✅ FAZ:
→ Usa stack padrão do projeto
→ Implementa feature automáticamente
→ Logs: "Feature: component.js - 200 linhas, tested"
```

**Comportamento:**
- `*create-feature {name}` → Implementação completa
- Tests inclusos
- Lint passing
- Logs: File paths, line counts, test status

---

### @qa (Quality Assurance)

**Em modo normal:** Conversa sobre casos de teste

**Em modo autônomo:**
```javascript
// ❌ NÃO FAZ:
"Qual device testar? Desktop, mobile, tablet?"

// ✅ FAZ:
→ Testa tudo automaticamente
→ Retorna relatório
→ Logs: "QA: 45 tests, 3 issues found"
```

**Comportamento:**
- `*test {scope}` → Full test suite
- Retorna JSON com resultados
- Issues logged estruturadamente
- Sem interação, apenas dados

---

## 📋 Logging Format Padrão

**Todos os agentes devem logar assim:**

```json
{
  "task_id": 1,
  "agent": "@agent-name",
  "command": "*command-name",
  "status": "completed|failed",
  "timestamp": "2026-02-27T10:45:00Z",
  "duration_seconds": 120,
  "output_summary": "Brief description",
  "metrics": {
    "items_processed": 5,
    "items_created": 3,
    "items_failed": 0
  },
  "next_step": "Ready for next task"
}
```

---

## 🚨 Error Handling em Modo Autônomo

**Se task falhar:**
1. Logar erro em `execution-log.json`
2. Automaticamente retry uma vez
3. Se retry falha, skip task
4. **Continuar para próxima tarefa** (não bloqueia)

**Se agente não reconhecer comando:**
1. Logar "command not found"
2. Skip task
3. Continue queue

**Nunca parar a fila** por causa de erro em tarefa individual.

---

## ✅ Checklist para Agentes

- [ ] Sem prompts interativos em modo autônomo
- [ ] Usa defaults sensatos se não especificado
- [ ] Auto-aprovação de tools funcionando
- [ ] Logging estruturado em JSON
- [ ] Continua na falha (não bloqueia)
- [ ] Retorna dados estruturados (JSON)
- [ ] 30-min status reports
- [ ] Respeia token reset cycles

---

**Documento criado:** 27 de fevereiro de 2026
**Versão:** 1.0
**Status:** Ready for all agents
