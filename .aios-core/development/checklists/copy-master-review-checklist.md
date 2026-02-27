# Copy-Master Review Checklist - Synkra AIOS

**Versão:** 2.0
**Data:** 25 de fevereiro de 2026
**Executado por:** Copy-Chef Master Orchestrator

---

## Visão Geral

Este checklist é o **protocolo executável** que o Copy-Chef usa para validar cópia antes de entrega. É estruturado em 3 fases:

1. **PRÉ-VALIDAÇÃO** — Verificação rápida de kill criteria
2. **VALIDAÇÃO UNIVERSAL** — 10 critérios que se aplicam a TODA copy
3. **VALIDAÇÃO TIPO-ESPECÍFICA** — Critérios adicionais baseado no tipo

---

## [FASE 0] PRÉ-VALIDAÇÃO (Kill Criteria)

**Objetivo:** Identificar rapidamente copy que claramente falha

Responda SIM para TODOS antes de prosseguir:

- [ ] Copy foi escrita em português ou idioma correto?
- [ ] Copy é inteligível? (zero caracteres quebrados, gramática básica ok)
- [ ] Copy tem conteúdo substantivo? (>100 palavras ou adequado para formato)
- [ ] Copy respeita Tom de Voz do cliente?
- [ ] Copy não tem injúrias, conteúdo prejudicial ou ilegais?

**Se NÃO em qualquer um:** REJECT imediatamente
- **Feedback:** Especifique qual critério kill falhou
- **Ação:** Reescrever desde o início

---

## [FASE 1] VALIDAÇÃO UNIVERSAL (10 Critérios)

**Objetivo:** Validar os 10 critérios que se aplicam a TODA copy

Avalie CADA critério em escala 1-10. Depois calcule média ponderada.

### Critério 1: Clareza (Peso: 1.0)

**Descrição:** Entendível em primeira leitura, zero ambiguidade

**Checklist:**
- [ ] Lê-se em voz alta? Tem fluxo natural?
- [ ] Entende em primeira leitura (sem reler)?
- [ ] Ambiguidades? Nenhuma identificada?
- [ ] Palavras técnicas explicadas (se necessário)?
- [ ] Estrutura de frases varia (não repetitivo)?

**Score:** ___ / 10

**Mínimo Threshold:** 8.5/10

---

### Critério 2: Relevância para ICP (Peso: 1.0)

**Descrição:** Fala com dor/desejo específico do público-alvo

**Checklist:**
- [ ] Copy menciona pain primário do ICP?
- [ ] Copy menciona desejo primário do ICP?
- [ ] Específico a este ICP (não genérico)?
- [ ] Linguagem respeita jargão do público?
- [ ] Objections antecipadas são do ICP real?

**Score:** ___ / 10

**Mínimo Threshold:** 8.5/10

---

### Critério 3: Especificidade (Peso: 0.9)

**Descrição:** Números, nomes, métricas, dados concretos

**Checklist:**
- [ ] Tem números específicos? (não "muitos", "vários", etc)
- [ ] Tem nomes reais? (clientes, cidades, empresas)
- [ ] Tem datas? (ou timeframes específicos)
- [ ] Zero "parece que", "aparentemente", "talvez"?
- [ ] Métrica/prova é quantificável?

**Score:** ___ / 10

**Mínimo Threshold:** 8.0/10

---

### Critério 4: Fluxo Narrativo (Peso: 0.8)

**Descrição:** Começo-meio-fim convincente, progressão lógica

**Checklist:**
- [ ] Hook no início prende atenção?
- [ ] Middle move leitor emocionalmente?
- [ ] End resolve problema ou cria ação?
- [ ] Progressão é lógica (não saltos aleatórios)?
- [ ] Cada seção conecta com anterior?

**Score:** ___ / 10

**Mínimo Threshold:** 7.5/10

---

### Critério 5: CTA Força (Peso: 1.0)

**Descrição:** Clara, compelling, múltiplos touches (3-5x mínimo)

**Checklist:**
- [ ] CTA é mencionado 3+ vezes?
- [ ] CTA é ação específica (não "learn more")?
- [ ] CTA tem urgência ou benefício?
- [ ] CTA usa verbo forte? (Click, Get, Join, etc)
- [ ] CTA é visível/destacado? (não perdido em parágrafo)

**Score:** ___ / 10

**Mínimo Threshold:** 8.5/10

---

### Critério 6: Tom de Voz do Cliente (Peso: 0.9)

**Descrição:** Usa jargões, tom, estrutura preferida do cliente

**Checklist:**
- [ ] Tom de Voz do cliente foi consultado?
- [ ] Copy usa jargões preferidos do cliente?
- [ ] Formalidade/casualidade match cliente?
- [ ] Estrutura de argumentação match?
- [ ] Palavras-chave preferidas aparecem?

**Score:** ___ / 10

**Mínimo Threshold:** 8.0/10

---

### Critério 7: Resonância Emocional (Peso: 0.9)

**Descrição:** Cria sentimento (fear, desire, urgency, belonging)

**Checklist:**
- [ ] Copy tem hook emocional claro?
- [ ] Mensagem move sentimento (fear/desire/hope)?
- [ ] Tem elemento de pertencimento ou exclusividade?
- [ ] Resultado é aspiracional?
- [ ] Não é frio/corporativo/genérico?

**Score:** ___ / 10

**Mínimo Threshold:** 8.0/10

---

### Critério 8: Zero Clichês (Peso: 0.8)

**Descrição:** Sem buzzwords genéricos ou frases prontas

**Blacklist (DEVE estar ausente):**
- [ ] "innovative", "cutting-edge", "game-changer", "revolutionary"?
- [ ] "world-class", "best-in-class", "state-of-the-art"?
- [ ] "leverage", "synergy", "paradigm shift"?
- [ ] Frases prontas tipo "Join thousands of..."?
- [ ] "unlike other solutions..."?

**Whitelist (pode usar):**
- [ ] Linguagem específica do domínio (ok)
- [ ] Termos técnicos explicados (ok)
- [ ] Superlativas com prova (ok)

**Score:** ___ / 10

**Mínimo Threshold:** 7.5/10

---

### Critério 9: Pesquisa Documentada (Peso: 0.7)

**Descrição:** Research salvo em knowledge-base do cliente

**Checklist:**
- [ ] Copy referencia pesquisa/dados?
- [ ] Pesquisa foi documentada em arquivo?
- [ ] Arquivo está em: `docs/clientes/{slug}/knowledge-base/`?
- [ ] Arquivo linkado em comentário de copy?
- [ ] Fontes são credíveis?

**Score:** ___ / 10

**Mínimo Threshold:** 7.0/10

---

### Critério 10: Disqualification (Peso: 0.8)

**Descrição:** Claro quem NÃO é o público, cria exclusividade

**Checklist:**
- [ ] Copy deixa claro quem NÃO é para?
- [ ] Tem elemento de "se você não..., isso não é para você"?
- [ ] Cria sensação de exclusividade/membership?
- [ ] Disqualification é explícito (não apenas implícito)?
- [ ] Disqualification está no início ou meio (não escondido no final)?

**Score:** ___ / 10

**Mínimo Threshold:** 7.5/10

---

## Cálculo de Score Universal

```
SCORE UNIVERSAL = [
  (Clareza × 1.0) +
  (Relevância × 1.0) +
  (Especificidade × 0.9) +
  (Fluxo × 0.8) +
  (CTA × 1.0) +
  (Tom de Voz × 0.9) +
  (Emoção × 0.9) +
  (Zero Clichês × 0.8) +
  (Pesquisa × 0.7) +
  (Disqualification × 0.8)
] ÷ 9.0

= ___ / 10
```

---

## [FASE 2] VALIDAÇÃO TIPO-ESPECÍFICA

**Objetivo:** Aplicar critérios adicionais baseado no tipo de cópia

Selecione a seção relevante:

---

### HEADLINES (Para Halbert, Orzechowski, Wiebe)

**Aplicável quando:** Cópia é um headline/subject line isolado

#### Halbert Headlines (Direct Response)

- [ ] Headline para o leitor frio (sem contexto)?
- [ ] Para o leitor imediatamente (não setup)?
- [ ] Benefício ou curiosidade clara?
- [ ] Não é genérico/comum?
- [ ] Específico demais para teste? (pode fazer A/B?)

**Peso Específico:** +0.5 para score final se headline é crítico

#### Orzechowski Subject Lines (Email)

- [ ] Subject estimula abertura?
- [ ] Não é spam-like (não ALL CAPS, muitos símbolos)?
- [ ] Curiosidade balanceada (não clickbait)?
- [ ] Preview text complementa (não repete)?

**Peso Específico:** +0.5 para score final

#### Wiebe Headlines (Conversion)

- [ ] Headline corresponde search intent do visitante?
- [ ] Match em landing page (continuidade)?
- [ ] Benefício acima do fold é claro?

**Peso Específico:** +0.3 para score final

---

### SALES LETTERS & PAGES (Para Halbert, Georgi, Ogilvy)

**Aplicável quando:** Cópia é sales letter ou sales page

#### Oferta Crystal Clear

- [ ] O que exatamente está sendo vendido?
- [ ] Quanto custa (ou como descobrir)?
- [ ] Quem é o ideal buyer?
- [ ] Como funciona / como se usa?
- [ ] Quando começa / deadline?

**Peso Específico:** +0.5

#### Risk Reversal (Halbert/Georgi)

- [ ] Money-back guarantee explícito?
- [ ] Trial period ou escrow?
- [ ] Terms são claros?
- [ ] Garantia é real (não legal-ese)?

**Peso Específico:** +0.3

#### Social Proof (Todos os tipos)

- [ ] 3+ testimonials ou evidence?
- [ ] Testimonials são específicos (nome, resultado, timeframe)?
- [ ] Case studies linkados?
- [ ] Números de clientes/conversões?

**Peso Específico:** +0.4

---

### EMAIL SEQUENCES (Para Orzechowski, Georgi)

**Aplicável quando:** Cópia é uma sequência de múltiplos emails

#### Single Purpose per Email

- [ ] Email 1: Introdução/hook?
- [ ] Email 2: Story/credibilidade?
- [ ] Email 3: Mechanism/como funciona?
- [ ] Email 4: Objections/prova?
- [ ] Email 5: Call-to-action/urgência?
- [ ] Cada email tem UMA coisa a fazer (não tudo em um)?

**Peso Específico:** +0.6

#### Progressive Pitch

- [ ] Sequência move leitor mais perto a cada email?
- [ ] Não é repetitivo (cada email novo)?
- [ ] Flow: Presell → Educational → Pitch → Urgency?

**Peso Específico:** +0.4

---

### LANDING PAGES (Para Wiebe, Georgi)

**Aplicável quando:** Cópia é para landing page

#### Above The Fold Priority

- [ ] CTA principal acima do fold?
- [ ] Headline + benefício primário acima do fold?
- [ ] Sem scroll obrigatório para entender oferta?
- [ ] Form (se houver) tem <3 campos?

**Peso Específico:** +0.5

#### Friction Minimization

- [ ] Form design é minimal?
- [ ] Labels são claros?
- [ ] Copy não é desnecessáriamente longo?
- [ ] Visual breathing room?

**Peso Específico:** +0.4

---

### BRAND COPY (Para Ogilvy, Morgan)

**Aplicável quando:** Cópia é branding/posicionamento

#### Big Idea Identificável

- [ ] Copy tem uma ideia central clara?
- [ ] Ideia é resumível em 1-2 frases?
- [ ] Ideia sustenta TODA copy?
- [ ] Ideia é diferenciável (competidores não têm)?

**Peso Específico:** +0.5

#### Premium Positioning

- [ ] Tom é sofisticado (não stuffy)?
- [ ] Aspiracional sem ser falso?
- [ ] Elegante mas acessível?
- [ ] Exclusividade implied (não stated)?

**Peso Específico:** +0.4

---

## [FASE 3] DECISÃO FINAL

### Cálculo de Score Final

```
SCORE FINAL = SCORE UNIVERSAL + AJUSTES TIPO-ESPECÍFICOS

Se SCORE FINAL ≥ 8.0:
  → STATUS: PASS ✅
  → Ação: Aprova para entrega

Se SCORE FINAL 6.0-7.9:
  → STATUS: CONDITIONAL ⚠️
  → Ação: Aprova com notas/recomendações

Se SCORE FINAL < 6.0:
  → STATUS: REJECT ❌
  → Ação: Feedback específico + Re-execute
```

---

## Template de Feedback (Para REJECT)

Use este template quando score < 6.0:

```markdown
## REJECT - [COPY_TYPE]

**Score:** [X.X]/10
**Timestamp:** [DATA]

### Critérios que Falharam:
- [Critério 1]: [Score]/10 (Threshold: [Threshold])
  - Problema específico: [Detalhe]
  - Exemplo do que funciona: [Exemplo]

- [Critério 2]: [Score]/10
  - Problema: [Detalhe]

### Ação Necessária:
Reescrever focando em:
1. [Foco 1]
2. [Foco 2]
3. [Foco 3]

### Referência:
- Copy de referência de mesma qualidade: [Link]
- Critérios: docs/copywriting-quality-criteria.md
- Tipo específico: copywriting-hierarchy.md

---
Copy-Chef Master Review
```

---

## Scorecard Documentado

Depois de validação, salvar scorecard em:
`docs/clientes/{slug}/copy-reviews/{copy_id}-scorecard.md`

### Template de Scorecard:

```markdown
# Copy Review Scorecard

**Copy ID:** [ID]
**Type:** [Email/Sales Letter/Landing Page/etc]
**Specialist:** [@halbert/@ogilvy/etc]
**Date:** [DATA]
**Score:** [X.X]/10

## Universal Criteria
| Critério | Score | Threshold | Status |
|----------|-------|-----------|--------|
| Clareza | [X]/10 | 8.5 | ✅/⚠️/❌ |
| Relevância | [X]/10 | 8.5 | ✅/⚠️/❌ |
| Especificidade | [X]/10 | 8.0 | ✅/⚠️/❌ |
| [etc...] |

## Type-Specific Criteria
| Critério | Score | Status |
|----------|-------|--------|
| [Tipo-específico 1] | [X]/10 | ✅/⚠️/❌ |

## Decision
**Status:** PASS / CONDITIONAL / REJECT
**Next Action:** [Entrega / Re-execute]
```

---

## Checklist Rápido (1 Minuto)

Use para validação RÁPIDA de copy:

```
☐ Clareza: Entende em 1º read?
☐ Relevância: Fala com pain/desejo ICP?
☐ Especificidade: Tem números, nomes, datas?
☐ Fluxo: Hook → Move → Resolução?
☐ CTA: 3-5x, claro, em negrito?
☐ Tom de Voz: Match cliente?
☐ Emoção: Move sentimento?
☐ Clichês: Zero buzzwords genéricos?
☐ Pesquisa: Documentada?
☐ Disqualification: Claro quem NÃO é?

SCORE 8.0+? → PASS ✅
SCORE 6.0-7.9? → CONDITIONAL ⚠️
SCORE <6.0? → REJECT ❌
```

---

**Mantido por:** Copy-Chef Master Orchestrator
**Referência:** copywriting-quality-criteria.md | copywriting-orchestration-workflow.md
