# Miro — Documentação de Funis e Fluxos

**Board PDN:** https://miro.com/app/board/uXjVGm1UN4s=/

---

## PADRÃO DE DOCUMENTAÇÃO (por funil)

Cada funil no board tem **2 artefatos**:

| Artefato | Ferramenta | Conteúdo |
|----------|-----------|----------|
| Diagrama de fluxo | `mcp__miro__diagram_create` | Fluxo visual com decisões, clusters, segmentos |
| Documento de referência | `mcp__miro__doc_create` | Objetivo, estrutura, mecanismo, tags, promessa |

---

## FLUXO DE TRABALHO

### 1. Explorar o board antes de criar
```
mcp__miro__context_explore (URL do board)
```
Retorna todos os frames, diagramas e documentos existentes com coordenadas.

### 2. Ler documento existente para replicar o padrão
```
mcp__miro__doc_get (URL do item)
```
Usar como referência de formato e estilo.

### 3. Obter spec DSL antes de criar diagrama
```
mcp__miro__diagram_get_dsl (URL do board, diagram_type: "flowchart")
```
Obrigatório antes de `diagram_create`. Retorna a spec de formato.

### 4. Criar diagrama
```
mcp__miro__diagram_create
  miro_url: URL do board
  title: "Cliente - Nome do Funil"
  diagram_type: "flowchart"
  x: (posicionar à direita dos existentes)
  diagram_dsl: (DSL gerado)
```

### 5. Criar documento ao lado
```
mcp__miro__doc_create
  miro_url: URL do board
  x: (diagrama_x + 2500)
  content: (markdown estruturado)
```

---

## DSL FLOWCHART — REFERÊNCIA RÁPIDA

```
graphdir TB
palette #fff6b6 #c6dcff #adf0c7

# Nós
n1 Label do nó flowchart-terminator 2     ← verde (início/fim)
n2 Label do nó flowchart-process 0        ← amarelo (processo)
n3 Label do nó flowchart-decision 1       ← azul (decisão)
n4 Label do nó flowchart-data 0           ← amarelo paralelo (input/output)

# Conectores
c n1 - n2                    ← sem label
c n2 Texto da aresta n3      ← com label

# Clusters (agrupadores — definir SEMPRE ao final)
cluster c1 "Nome do Cluster" n2 n3 n4
cluster c2 "Outro Cluster" n5 n6 [parent=c1]  ← cluster aninhado
```

**Cores:** `#fff6b6`=amarelo (processo) | `#c6dcff`=azul (decisão) | `#adf0c7`=verde (início/fim)

**Shapes:** `flowchart-terminator` | `flowchart-process` | `flowchart-decision` | `flowchart-data`

---

## POSICIONAMENTO NO BOARD PDN

| Item | x | y |
|------|---|---|
| PDN Evento — Diagrama | 6649 | 0 |
| PDN Evento — Documento | 8632 | 0 |
| PDN Vendas Raio-X — Diagrama (FINAL) | 10000 | 0 |
| PDN Vendas Raio-X — Documento | 12027 | 0 |
| PDN Vendas Raio-X — Diagrama (Bitrix) | 15000 | 0 |
| PDN Terceira Onda — Diagrama | 20000 | 0 |
| PDN Terceira Onda — Documento | 22500 | 0 |

**Regra:** próximo funil começa em x=25000+.

---

## PADRÃO DO DOCUMENTO DE REFERÊNCIA

```markdown
# Cliente — Nome do Funil

**Tipo:** Quiz Funnel / VSL / etc.
**Plataforma:** INLEAD / GHL / etc.
**URL sugerida:** ...
**Apresentador / Produto:** ...
**Big Idea:** ...
**Copy completo:** [Google Doc](URL)

## Objetivo do Funil
- bullet 1
- bullet 2

## Mecanismo Central
(tabela ou texto curto)

## Estrutura do Quiz
(etapas e opções)

## Otimizações de plataforma
(INLEAD: Loading, Timer, Nível, {{nome}})

## Follow-up / Tags
(GHL tags e segmentos)

## Promessa
(resultado prometido ao lead)
```

---

## GOTCHAS

- `diagram_get_dsl` precisa do parâmetro `diagram_type` — sem ele dá erro
- Clusters SEMPRE ao final do DSL, depois de todos os nós e conectores
- Label de nó: tudo entre o id e o shape é o label (sem aspas necessárias)
- Sem em-dash (`—`) em labels — usar `:` ou `-`
- Coordenada x do documento = coordenada x do diagrama + 2000 a 2500
