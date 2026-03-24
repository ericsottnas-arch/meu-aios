# Regras de Comportamento de Agentes

> Consultar ao ativar qualquer agente ou executar qualquer workflow de agente.
> Ver tambem: [[universal]]

---

## [CRITICAL] Ordem de ativacao obrigatoria

Todo agente, ao ser ativado, DEVE executar nesta ordem:

1. Ler o arquivo de definicao do agente (`.claude/commands/AIOS/agents/{id}.md`)
2. Ler `memory/rules/_index.md` (este sistema de regras)
3. Identificar tipo de tarefa e ler arquivos relevantes da arvore
4. Ler knowledge base especifica (`memory/{agent}-*.md` se existir)
5. Ler aprendizados acumulados (`memory/agent-learnings/{agent-id}.md`)
6. Ler `meu-projeto/design-feedback-rules.json` (se agente criativo)

NUNCA pular etapas. NUNCA comecar a tarefa sem essa leitura.

---

## [CRITICAL] Delegacao automatica — autorizada pelo Eric

Agentes DEVEM delegar quando a tarefa sai de sua zona de genialidade.
Eric autorizou delegacao automatica. NAO precisa pedir permissao.

**Mapa de delegacao:**

| Se precisa de... | Delegar para... |
|-----------------|----------------|
| Copy/texto persuasivo | @copy-chef |
| Design visual/criativo | @designer |
| Banco de dados | @data-engineer |
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
| Vendas/comercial/closing | @sales-director (Grant) |
| Documentar tarefa no ClickUp | @alex (UNICO criador) |

---

## [CRITICAL] ClickUp — @alex e o unico criador de tarefas

- @alex e o UNICO agente que cria tarefas no ClickUp
- Outros agentes NAO criam tarefas diretamente — DELEGAM para @alex

**Quando perguntar ao Eric:**
"Eric, voce quer que eu documente isso no ClickUp?"

Perguntar SEMPRE que surgir tarefa de cliente:
- Copy, criativo, roteiro, campanha
- Automacao ou GHL para cliente
- Planejamento estrategico ou briefing
- Qualquer entregavel destinado a cliente

**Se Eric disser SIM:**
1. Reunir: briefing + historico + decisoes + entregaveis + links
2. Chamar @alex via Skill tool (skill="AIOS:agents:alex")
3. Executar: `*document-task {agente} {cliente} {titulo} {briefing_completo}`
4. Aguardar @alex retornar o link
5. Informar Eric

**Apos criacao:** O agente especialista adiciona comentario na tarefa via `lib/clickup.js → addTaskComment(taskId, texto)`

---

## [CRITICAL] Aprendizado persistente

Quando Eric der feedback sobre qualquer entrega:
1. APLICAR o fix imediatamente
2. REGISTRAR em `memory/agent-learnings/{agent-id}.md`
3. Se for regra universal: tambem em `memory/rules/universal.md`
4. CONFIRMAR: "Aprendizado salvo. Nao vai acontecer de novo."

**Formato de registro:**
```markdown
## [DATA] Feedback: [resumo curto]
- **Contexto:** O que foi entregue
- **Feedback:** O que Eric disse
- **Regra derivada:** O que nunca mais fazer / sempre fazer
- **Severidade:** CRITICAL | HIGH | MEDIUM
```

Regras sao CUMULATIVAS — nunca remover, so adicionar.

---

## [HIGH] Gap Detection

Se uma tarefa esta fora da zona de genialidade de todos os agentes:
1. Informar Eric imediatamente
2. Descrever qual competencia esta faltando
3. Sugerir perfil do novo agente necessario
4. NAO improvisar

**Formato:**
```
Gap detectado: [descricao da competencia necessaria]
Nenhum agente atual cobre isso. Sugiro criar @{nome-sugerido}.
Posso montar o blueprint agora?
```

Registrar em: `memory/agent-learnings/gaps-detected.md`

---

## [HIGH] Regras de delegacao

- O agente que delega MANTEM responsabilidade sobre o resultado final
- Delegacao em cadeia e permitida (A → B → C)
- Cada agente reporta brevemente o que fez quando delegado
- Conflitos de abordagem = escalar para Eric decidir

---

Ultima atualizacao: 2026-03-19
