# Protocolo de Research Enriquecido para Copywriters
**Versão:** 1.0
**Data:** 2026-02-25
**Objetivo:** Garantir que TODA cópia seja baseada em research profundo, sem genéricos

---

## 🎯 Aplicável a Todos os Especialistas

| Especialista | Código |
|---|---|
| @halbert | Gary Halbert |
| @ogilvy | David Ogilvy |
| @wiebe | Joanna Wiebe |
| **@georgi** | **Stefan Georgi** |
| @orzechowski | Chris Orzechowski |
| @morgan | Lorrie Morgan |

---

## 📋 PROTOCOLO DE RESEARCH (OBRIGATÓRIO)

### FASE 1: ANÁLISE DE CLIENTE LOCAL
**Passos:**
1. Localizar pasta: `docs/clientes/{cliente-slug}/`
2. Ler arquivos disponíveis:
   - `README.md` - Overview rápido
   - `profile.md` - Briefing estratégico completo
   - `knowledge-base/data.json` - Dados estruturados
   - `history/` - Histórico de interações
   - `assets/` - Materiais anteriores
3. Extrair elementos-chave:
   - ✅ Tom de voz & style
   - ✅ Pain points e gains
   - ✅ Público-alvo (personas)
   - ✅ Frameworks preferidos
   - ✅ Histórico de copys anteriores (se existir)
   - ✅ Métricas de performance (se disponível)

**Documentação Obrigatória:**
- Se arquivo de "Tom de Voz" existir: REFERENCIAR em toda copy
- Se não existir: CRIAR `📋 Tom de Voz e Estilo - [CLIENTE].txt` na pasta do cliente

---

### FASE 2: WEB RESEARCH (CONTEXTUALIZAÇÃO)
**Quando fazer:**
- Para validar pain points do cliente
- Para encontrar tendências do mercado/indústria
- Para coletar case studies similares
- Para validar argumentação com dados recentes
- Para encontrar psychological triggers relevantes

**O QUE PESQUISAR:**
1. **Indústria/Setor:** Tendências, regulamentações, desafios
2. **Público-Alvo:** Comportamentos, dores emergentes, aspirações
3. **Competidores:** Como comunicam, quais ângulos usam
4. **Estudos/Pesquisas:** Dados que sustentam argumentação
5. **Artigos/Cases:** Referências que validam a oferta

**Ferramentas Disponíveis:**
- WebSearch (web search geral)
- WebFetch (artigos específicos)
- EXA (via docker-gateway) - para research profundo

**Buscar por:**
- Relatórios de mercado
- Estudos de comportamento do público
- Artigos sobre o problema/solução
- Case studies de clientes similares
- News/trends da indústria
- Estatísticas validadas

---

### FASE 3: DOCUMENTAÇÃO NO BANCO DE CONHECIMENTO
**Criar arquivo:** `docs/clientes/{cliente}/knowledge-base/{tema}-research-{data}.md`

**Estrutura do documento:**
```markdown
# Research: {Tema}
**Data:** YYYY-MM-DD
**Pesquisador:** {Nome do Copywriter}
**Objetivo:** {Por que essa research era necessária}

## 🔍 Achados Principais
- Ponto-chave 1
- Ponto-chave 2
- Ponto-chave 3

## 📊 Dados & Estatísticas
- Estatística 1: {Número} (Fonte: {URL})
- Estatística 2: {Número} (Fonte: {URL})

## 💡 Insights para Copy
- Como usar esse conhecimento na narrativa
- Psychological triggers identificados
- Ângulos de entrada viáveis

## 🔗 Fontes Consultadas
- [Título da Fonte 1](URL)
- [Título da Fonte 2](URL)
- [Título da Fonte 3](URL)

---
**Notas:** Observações adicionais
```

**Exemplo:**
```
docs/clientes/dr-erico-servano/knowledge-base/
├── tom-de-voz-estilo.md
├── research-jurisprudencia-2026-02-25.md    ← Nova research
├── research-mercado-harmonizacao-2026-02-25.md
└── research-pain-points-profissionais-2026-02-25.md
```

---

## 🔗 ENTREGA DE COPY

### Seção OBRIGATÓRIA ao Final
```markdown
## 📚 Fontes & Research

Esta copy foi baseada em:
- [Fonte 1: Título](URL)
- [Fonte 2: Título](URL)
- [Fonte 3: Título](URL)

Knowledge Base Reference: docs/clientes/{cliente}/knowledge-base/
```

---

## ⚡ CHECKLIST ANTES DE ENTREGAR

- [ ] Li arquivo `profile.md` do cliente
- [ ] Li arquivo `knowledge-base/data.json` (se existir)
- [ ] Fiz web research sobre indústria/público-alvo
- [ ] Validei pain points com dados reais
- [ ] Documentei research em `knowledge-base/research-*.md`
- [ ] Referenciei tom de voz do cliente
- [ ] Incluí seção "Fontes & Research" na copy
- [ ] Copy NÃO é genérica — é específica para este cliente
- [ ] Argumentação é sustentada por dados/research

---

## 🚫 O QUE NÃO FAZER

❌ Entregar copy sem consultar dados do cliente
❌ Usar argumentos genéricos sem validação
❌ Ignorar tom de voz do cliente
❌ Não documentar sources/research
❌ Copiar padrões de outros clientes sem adaptação
❌ Entregar sem seção "Fontes & Research"

---

## 🎯 OBJETIVO FINAL

**Nenhuma copy é genérica.**
**Toda copy é respaldada por research profundo.**
**Todo cliente tem um knowledge base crescente.**
**Toda fonte fica documentada para futuro.**

---

*Protocolo criado para Synkra AIOS - Copywriting Excellence*
