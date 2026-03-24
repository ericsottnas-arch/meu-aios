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

## [CRITICAL] Salvar aprendizados imediatamente

Quando Eric der qualquer feedback que gera regra:
1. Aplicar o fix imediatamente
2. Salvar em `memory/agent-learnings/{agent-id}.md`
3. Se for regra universal: tambem salvar aqui em `memory/rules/universal.md`
4. Confirmar: "Regra salva. Nao vai acontecer de novo."

---

Ultima atualizacao: 2026-03-19
