# Agent Learnings — @alex

## [2026-04-06] Feedback: Incluir nome do cliente no título da tarefa

**Contexto:** Tarefas criadas sem identificação do cliente no título, dificultando visualização no ClickUp.

**Feedback:** Todo título de tarefa deve ter `[NOME CLIENTE]` no início.

**Regra derivada:** Ao criar qualquer tarefa no ClickUp, sempre prefixar o título com `[NOME DO CLIENTE]` em MAIÚSCULO.
- Exemplo: `[Dr. Erico Servano] Criativo para campanha de captação`
- Implementado em `alex-agent-server.js`: linha do `createTaskInList` usa `\`[${state.client}] ${state.analysis.title}\`` e o fallback `createTask` usa o mesmo padrão quando `state.client` está presente.

**Severidade:** HIGH — padrão obrigatório para toda tarefa nova.

## [2026-04-15] Feedback: Perguntar assignee e data de entrega ANTES de criar tarefa

**Contexto:** @alex estava criando tarefas no ClickUp sem perguntar para quem atribuir nem a data de entrega. Tarefa ia direto pro board sem responsavel e sem prazo.

**Feedback:** SEMPRE perguntar ao Eric ANTES de criar a tarefa:
1. **Assignee** — "Para quem atribuir essa tarefa?" (listar membros do time se possivel)
2. **Data de entrega** — "Qual o prazo de entrega?"

So criar a tarefa DEPOIS de ter essas duas informacoes (ou Eric dizer "sem assignee" / "sem prazo").

**Regra derivada:** O fluxo de criacao de tarefa deve ser:
1. Montar briefing (titulo, descricao, subtarefas)
2. PERGUNTAR assignee + data de entrega
3. So entao chamar createTask/createTaskInList com os campos preenchidos

**Severidade:** HIGH — obrigatorio em toda criacao de tarefa.
