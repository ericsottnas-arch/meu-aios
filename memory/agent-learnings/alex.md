# Agent Learnings — @alex

## [2026-04-06] Feedback: Incluir nome do cliente no título da tarefa

**Contexto:** Tarefas criadas sem identificação do cliente no título, dificultando visualização no ClickUp.

**Feedback:** Todo título de tarefa deve ter `[NOME CLIENTE]` no início.

**Regra derivada:** Ao criar qualquer tarefa no ClickUp, sempre prefixar o título com `[NOME DO CLIENTE]` em MAIÚSCULO.
- Exemplo: `[Dr. Erico Servano] Criativo para campanha de captação`
- Implementado em `alex-agent-server.js`: linha do `createTaskInList` usa `\`[${state.client}] ${state.analysis.title}\`` e o fallback `createTask` usa o mesmo padrão quando `state.client` está presente.

**Severidade:** HIGH — padrão obrigatório para toda tarefa nova.
