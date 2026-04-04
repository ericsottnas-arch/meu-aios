# Synkra AIOS Development Rules for Claude Code

You are working with Synkra AIOS, an AI-Orchestrated System for Full Stack Development.

---

## !!!! ALERTA MAXIMO: PROBLEMA #1 DO SISTEMA !!!!

> **Eric ja reclamou MULTIPLAS VEZES que sessoes passam sem salvar aprendizados.**
> **Isso e INACEITAVEL e a falha mais grave do AIOS.**
>
> TODA sessao DEVE salvar o que foi aprendido. NAO e opcional.
> Leia `memory/rules/universal.md` secao "Salvar aprendizados".
>
> DURANTE a conversa: salvar na hora. AO FINAL: revisar tudo.
> TESTE: "Se amanha eu nao lembrar, vou errar?" Se sim, SALVAR AGORA.

---

## PROTOCOLO PRE-TAREFA — OBRIGATORIO EM TODA SESSAO

**ANTES de iniciar qualquer tarefa:**

1. `memory/rules/_index.md` — identifica qual arquivo ler para cada tipo de tarefa
2. `memory/rules/universal.md` — regras criticas que se aplicam a TODA tarefa
3. Arquivo de regras do dominio identificado no `_index.md`
4. `memory/agent-learnings/{agent-id}.md` — feedbacks acumulados do Eric

Mapa de dominios:
- Copy / texto / roteiro → `memory/rules/copy-escrita.md`
- Landing page / HTML → `memory/rules/landing-pages.md`
- Clientes medicos → `memory/rules/clientes-medicos.md`
- Ads / campanhas → `memory/rules/ads-campanhas.md`
- Conteudo redes sociais → `memory/rules/conteudo-redes-sociais.md`
- Comportamento de agentes → `memory/rules/agentes-comportamento.md`
- Entrega de documentos → `memory/rules/entrega-documentos.md`
- Desenvolvimento / automacoes → `memory/rules/dev-automacoes.md`

---

## PROTOCOLO POS-RESPOSTA — CAPTURA TOTAL

**EM TODA RESPOSTA**, antes de fechar, verificar o que precisa ser salvo.

Teste rapido: "Se eu abrir sessao nova amanha sem contexto, vou errar por nao saber isso?"
- Sim, e uma REGRA → `memory/rules/` (universal ou dominio)
- Sim, e sobre o ERIC → `memory/eric-santos-profile.md` ou `eric-comportamentos-detalhado.md`
- Sim, e sobre CLIENTE/NEGOCIO → `docs/clientes/{slug}/` ou `memory/clientes-completo.md`
- Sim, e aprendizado de agente → `memory/agent-learnings/{agent-id}.md`

Detalhes das 3 camadas de captura (tecnica, perfil Eric, contexto estrategico): `memory/rules/universal.md`

---

## PROTOCOLO DE FEEDBACK PERSISTENTE

Feedback dado UMA VEZ = regra para SEMPRE.

1. APLICAR o fix imediatamente
2. SALVAR em `memory/agent-learnings/{agent-id}.md`
3. Se regra visual/criativa: tambem em `meu-projeto/design-feedback-rules.json`
4. CONFIRMAR: "Regra salva para @{agent}. Nao vai acontecer de novo."

Regras sao cumulativas — nunca remover, so adicionar.

---

## KNOWLEDGE HIERARCHY — Ordem de Consulta

**ANTES de qualquer resposta ou tarefa:**

1. `memory/` — base de conhecimento persistente (MEMORY.md + arquivos tematicos)
2. `docs/` e projeto — patterns existentes, codebase
3. So entao: WebSearch, ferramentas externas

NUNCA buscar na web algo que ja esta na memoria.

---

## CONTROLE DO COMPUTADOR

Todos os agentes tem PERMISSAO TOTAL para controlar mouse e teclado via `cliclick` (v5.1).
Referencia completa de comandos: `memory/ambiente-ferramentas.md`

---

## PROTOCOLO DE INTELIGENCIA DOS AGENTES (v1.0)

### Regra 1: Knowledge Base First

Todo agente ao ser ativado DEVE:
1. Ler sua knowledge base (`memory/{agent}-*.md`)
2. Ler `memory/agent-learnings/{agent-id}.md`
3. Se agente criativo: ler `meu-projeto/design-feedback-rules.json`

Ordem: arquivo do agente → KB → aprendizados → regras visuais (se aplicavel)

### Regra 2: Verificar Antes de Criar (Anti-Duplicacao)

Antes de criar qualquer artefato (arquivo, funcao, doc, criativo):
1. Grep por termos-chave
2. Glob por nomes de arquivo relacionados
3. Verificar `memory/` por referencias ao tema
4. So criar do zero se comprovadamente nao existe nada reutilizavel

Editar > Criar novo | Estender > Reescrever | Reaproveitar > Duplicar

### Regra 3: Aprendizado Persistente por Agente

Quando Eric der feedback: APLICAR + REGISTRAR em `memory/agent-learnings/{agent-id}.md` + CONFIRMAR.

Formato: `## [DATA] Feedback: [resumo] | Contexto | Feedback | Regra derivada | Severidade`
- CRITICAL = bloqueio (nunca mais)
- HIGH = padrao (sempre seguir)
- MEDIUM = preferencia (seguir quando possivel)

---

## PROTOCOLO DE COLABORACAO ENTRE AGENTES (v1.0)

### Regra 4: Delegacao Automatica

Eric autoriza delegacao automatica entre agentes. NAO precisa pedir permissao.

| Se precisa de... | Delegar para... |
|-------------------|-----------------|
| Copy/texto persuasivo | @copy-chef |
| Design visual/criativo | @designer |
| Banco de dados/dados | @data-engineer |
| Automacao/GHL | @ghl-maestro |
| Gestao de trafego | @media-buyer |
| Gestao de projeto | @pm |
| Follow-up/reativacao | @follow-up-specialist |
| Codigo/implementacao | @dev |
| QA/testes | @qa |
| Arquitetura tecnica | @architect |
| Analise de dados | @analyst |
| Prospeccao Instagram | @prospect-ig |
| Infra/deploy | @devops |
| Contratos/juridico | @legal |
| Conteudo social media | @nova |
| Account management | @account |
| Vendas/comercial/SDR | @sales-director (Grant) |
| Documentar no ClickUp | @alex (UNICO criador) |
| Otimizacao documentacao | @docs-optimizer (Kai) |

Agente que delega MANTEM responsabilidade. Delegacao em cadeia permitida.

### Regra 5: Gap Detection

Se a tarefa esta fora de toda zona de genialidade existente:
1. Informar Eric imediatamente com formato: "Gap detectado: [competencia]. Sugiro criar @{nome} com expertise em [area]."
2. NAO improvisar
3. Registrar em `memory/agent-learnings/gaps-detected.md`

### Regra 6: ClickUp via @alex

@alex e o UNICO agente que cria tarefas no ClickUp. Outros delegam.

**Gatilho:** Em toda demanda relacionada a cliente, perguntar: "Eric, quer documentar no ClickUp?"

**Se SIM:** Reunir contexto completo → chamar @alex via Skill tool → aguardar link → agente especialista adiciona comentario na tarefa via `lib/clickup.js → addTaskComment()`.

Assinatura @alex: `Criado por @alex · Syra Digital AIOS`
Assinatura agente: `@{agente} · {especialidade}`

---

<!-- AIOS-MANAGED-START: core-framework -->
## Core Framework Understanding

Synkra AIOS is a meta-framework that orchestrates AI agents to handle complex development workflows. Always recognize and work within this architecture.
<!-- AIOS-MANAGED-END: core-framework -->

<!-- AIOS-MANAGED-START: agent-system -->
## Agent System

- Agents activated with @agent-name syntax
- Master agent: @aios-master
- Commands use * prefix: *help, *create-story, *task, *exit
- Seguir Protocolo de Inteligencia dos Agentes (Regras 1-6 acima) em toda ativacao
<!-- AIOS-MANAGED-END: agent-system -->

## Development Methodology

- Work from stories in `docs/stories/` — mark checkboxes as complete
- Follow acceptance criteria exactly
- Write clean, self-documenting code following existing patterns
- Run tests + lint + typecheck before marking tasks complete
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:` + story ID

<!-- AIOS-MANAGED-START: framework-structure -->
## AIOS Framework Structure

Agents: `.claude/commands/AIOS/agents/` | Stories: `docs/stories/` | Rules: `memory/rules/`
<!-- AIOS-MANAGED-END: framework-structure -->

<!-- AIOS-MANAGED-START: aios-patterns -->
## AIOS-Specific Patterns

- Templates: `loadTemplate(name)` → `renderTemplate(template, context)`
- Agent commands: check `command.startsWith('*')`
- Story updates: `loadStory(id)` → `updateTask` → `save()`
<!-- AIOS-MANAGED-END: aios-patterns -->

<!-- AIOS-MANAGED-START: common-commands -->
## Common Commands

AIOS: `*help` | `*create-story` | `*task {name}` | `*workflow {name}`
Dev: `npm run dev` | `npm test` | `npm run lint` | `npm run build`
<!-- AIOS-MANAGED-END: common-commands -->

## Autonomous Operation Mode (/trabalhe-para-mim)

**Comando:** `/trabalhe-para-mim [duration] [queue-file]` | Duracao padrao: 5h | Modo: slow

**Queue:** `.aios/autonomous/task-queue.json` | **Logs:** `.aios/autonomous/execution-log.json`

**Regras em modo autonomo:**
- Sem interacao com usuario — tudo executa sem confirmacao
- Auto-approve em todas as tool calls
- Skip em falhas (retry 1x automatico), continuar queue
- Delay minimo 10min entre tarefas
- Parar 5min antes do reset de tokens
- Reportar status a cada 30min

**Queue management:** `*queue-list` | `*queue-add` | `*queue-remove` | `*queue-pause` | `*queue-resume` | `*queue-clear`

**Limites:** 1 tarefa por vez | max 60min por tarefa | max 1 retry | pausa se memoria > 80%

---

## Claude Code Configuration

- Prefer batched + parallel tool calls
- Grep tool para busca (nunca grep/rg no bash)
- Edit > Write para arquivos existentes
- Task tool para operacoes multi-step complexas

---
*Synkra AIOS Claude Code Configuration v3.1 — Agent Intelligence Protocol*
