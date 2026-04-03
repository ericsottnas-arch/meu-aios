# Regras Universais — Aplicam-se a TODAS as tarefas

> CRITICO: Estas regras nao tem excecao.
> Valem para TODO agente, TODO material, TODO cliente.
> Leitura obrigatoria em qualquer ativacao.

---

## [CRITICAL] PROIBIDO: travessao (—) em qualquer material

- O caractere "—" (em dash / travessao longo) e TERMINANTEMENTE PROIBIDO
- Aplica-se a: copy, roteiro, email, caption, doc, script, codigo comentado, HTML
- Substitutos aceitos:
  - Ponto final
  - Virgula
  - Dois pontos
  - Ponto e virgula
  - Quebra de linha / novo paragrafo
  - Reescrita da frase sem o conector
- Historico: Eric falou isso 10+ vezes em sessoes diferentes
- Severidade: CRITICAL — nunca mais

---

## [CRITICAL] Copy e textos para revisao: SEMPRE no Google Docs

- NUNCA entregar copy, roteiro, email ou qualquer texto para revisao no chat
- SEMPRE criar um Google Doc e escrever la
- Eric comenta diretamente no Doc — nao consegue fazer isso no chat
- Como fazer:
  1. `mcp__google-docs__createDocument` para criar o documento
  2. `mcp__google-docs__appendMarkdown` para escrever o conteudo
- Pasta padrao: Syra Digital/Clientes/{cliente}/ no Drive do Eric
- Aplica-se a: @copy-chef, @nova, @georgi, @wiebe, @halbert, @morgan, @orzechowski e qualquer agente que produza texto para revisao
- Severidade: CRITICAL

Ver detalhes: [[entrega-documentos]]

---

## [CRITICAL] PROIBIDO: emojis em titulos, headings, cards, labels

- Zero emojis em:
  - Titulos de secao (h1, h2, h3)
  - Stat cards
  - Labels de componentes
  - Headings de paginas HTML
  - Titulos de documentos entregues
- Substituir por texto descritivo ou numero real
- Aplica-se a: todos os agentes que produzem HTML, copy ou apresentacoes
- Severidade: CRITICAL

---

## [HIGH] Knowledge Hierarchy — Ordem de consulta obrigatoria

Antes de responder qualquer pergunta ou executar qualquer tarefa:

1. Verificar memory/ (este sistema de regras + arquivos tematicos)
2. Verificar docs/ e projeto (patterns existentes, codebase)
3. So entao usar WebSearch / ferramentas externas

NUNCA buscar na web algo que ja esta na memoria.

---

## [HIGH] Verificar antes de criar — Anti-duplicacao

Antes de criar qualquer arquivo, funcao, componente ou documento:
1. Grep por termos-chave
2. Glob por nomes de arquivo relacionados
3. Verificar memory/ por referencias ao tema
4. So criar do zero se comprovadamente nao existe nada reutilizavel

---

## [HIGH] Resposta direta e concisa

- Eric quer resultado, nao explicacao
- Ir direto ao ponto
- Respostas curtas, edicoes cirurgicas
- Nao repetir o que o Eric disse — so executar

---

## [CRITICAL] Salvar aprendizados imediatamente — REGRA MAIS IMPORTANTE DO SISTEMA

> Eric ja reclamou MULTIPLAS VEZES que sessoes passam sem salvar aprendizados.
> Isso e o problema #1 do AIOS. Se voce nao salvar, o Eric vai repetir o mesmo feedback
> pra sempre e o sistema nunca evolui. INACEITAVEL.

**O que DEVE acontecer em TODA sessao:**

1. DURANTE a conversa: quando Eric der feedback, corrigir algo, ou tomar decisao:
   - Salvar IMEDIATAMENTE em `memory/agent-learnings/{agent-id}.md`
   - Se for regra universal: tambem salvar aqui em `memory/rules/universal.md`
   - Confirmar: "Regra salva. Nao vai acontecer de novo."

2. AO FINAL de cada interacao (antes de encerrar):
   - Revisar TUDO que foi discutido na sessao
   - Perguntar internamente: "O que mudou? O que Eric decidiu? O que nao posso esquecer?"
   - Salvar cada item relevante no arquivo correto
   - Se nao houve nada novo: ok, mas a verificacao e OBRIGATORIA

3. SINAIS de que algo precisa ser salvo (mesmo sem Eric pedir):
   - "prefiro assim", "gosto quando", "sempre faz X" → preferencia
   - "nao faca mais isso", "para de X" → regra CRITICAL
   - "aprovado", "ficou bom" → padrao aprovado
   - Decisao sobre cliente, stack, abordagem → decisao permanente
   - Correcao de comportamento → salvar NA HORA, nao esperar
   - Informacao nova sobre cliente → `docs/clientes/` ou `memory/clientes-completo.md`

4. ONDE salvar:
   - Regra para todos → `memory/rules/universal.md` + `memory/agent-learnings/regras-globais.md`
   - Regra de dominio → arquivo correto em `memory/rules/`
   - Aprendizado de agente → `memory/agent-learnings/{agent-id}.md`
   - Info de cliente → `docs/clientes/{slug}/`
   - Decisao tecnica → arquivo tematico em `memory/`

**TESTE MENTAL OBRIGATORIO antes de fechar qualquer resposta:**
> "Se eu abrir uma sessao nova amanha e nao me lembrar dessa conversa,
> vou errar por nao saber isso?"
> Se SIM → salvar AGORA, nao depois.

**Historico:** Eric reclamou disso em 2026-03-24 com raiva.
O sistema tem 40+ arquivos de memoria mas as sessoes nao estao alimentando.
Isso PRECISA mudar a partir de agora.

- Severidade: CRITICAL (a mais alta do sistema)

---

---

## [CRITICAL] Playwright — Execucao autonoma sem confirmacao (2026-04-02)

- Eric autorizou execucao TOTAL de acoes no browser sem pedir permissao
- NUNCA perguntar "posso clicar?", "posso navegar?", "posso preencher o formulario?"
- Executar diretamente: navigate, click, type, screenshot, snapshot, fill, select
- Sequencia correta: navegar → snapshot (pegar refs) → executar acao → screenshot → proxima acao
- Reportar apenas o RESULTADO ao Eric, nao o plano de execucao passo a passo
- Severidade: CRITICAL

---

Ultima atualizacao: 2026-04-02
