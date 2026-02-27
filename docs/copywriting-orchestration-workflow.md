# Fluxo de Orquestração de Copywriting - Synkra AIOS

**Versão:** 2.0
**Data de Criação:** 25 de fevereiro de 2026
**Executed by:** Copy-Chef Master Orchestrator

---

## Visão Geral

O fluxo de orquestração de copywriting é um processo estruturado de **7 etapas** que transforma uma demanda nebulosa em cópia de qualidade aprovada e pronta para entrega.

```
┌─────────────────────────────────────────────────────────────┐
│ [1] DEMAND RECEIPT → [2] TEAM SELECTION → [3] EXECUTE      │
│      ↓                    ↓                    ↓             │
│   Entender         Definir especialistas   Escrever copy   │
│                                                 ↓             │
│ [7] FEEDBACK LOOP ← [6] DELIVER ← [5] QUALITY GATE        │
│      ↑                  ↑                    ↑               │
│   Iterar             Entregar        Validar + Score       │
│   criterios          resultado       ├─ PASS/CONDITIONAL  │
│                                      └─ REJECT + RE-EXEC   │
└─────────────────────────────────────────────────────────────┘
```

---

## [ETAPA 1] DEMAND RECEIPT PROTOCOL

**Objetivo:** Entender completamente a demanda antes de rotear para especialista

**Trigger:** Usuário inicia comando `*demand {briefing}`

### Inputs Obrigatórios (4)

Copy-Chef coleta EXATAMENTE essas 4 informações:

```
1. TIPO DE CÓPIA
   - Email? Sales letter? Landing page? Ad copy? VSL? Social?

2. OBJETIVO PRIMÁRIO
   - Conversão? Leads? Vendas? Awareness? Retenção?

3. PÚBLICO-ALVO & PERSONA
   - Quem é? Médico? Empreendedor? Mulher? B2B? Premium?
   - Dor primária? Desejo primário?

4. TOM DE VOZ & BRAND STYLE
   - Cliente tem doc de tom de voz?
   - Formal ou casual? Urgente ou sofisticado?
```

### Processo de Receipt

1. **Copy-Chef recebe briefing**
2. **Faz perguntas clarificadoras** para preencher gaps
3. **Consulta cliente em docs/**
   - Se existe: `docs/clientes/{slug}/profile.md`
   - Se existe: `docs/clientes/{slug}/tom-de-voz.md`
4. **Extrai ou cria Tom de Voz do cliente**
   - Se não existe: Solicita exemplos ao usuário
   - Documenta em: `docs/clientes/{slug}/tom-de-voz.md`
5. **Cria BRIEFING INTERNO** com 5 campos obrigatórios:

```json
{
  "demand_type": "email sequence",
  "primary_objective": "converter leads em clientes",
  "target_icp": "mulheres empreendedoras, 25-45, saúde/wellness",
  "primary_pain": "falta de tempo + insegurança com regime",
  "primary_desire": "resultado rápido, comunidade feminina, sem julgamento",
  "tone_of_voice": "amigável, consultiva, empoderada, vulnerable",
  "mechanism": "comunidade + accountability + resultado real",
  "disqualifiers": "homens, públicos genéricos, purista fitness",
  "transformation": "de insegura/paralizada para confiante/em ação",
  "objections": ["caro?", "funciona mesmo?", "tenho pouco tempo?"],
  "deadline": "quando?"
}
```

---

## [ETAPA 2] TEAM SELECTION & BRIEF

**Objetivo:** Identificar qual(is) especialista(s) é perfeito(s) para a demanda

**Inputs:** Briefing Interno da Etapa 1

### Tabela de Roteamento (5 Dimensões)

| Dimensão | Halbert | Ogilvy | Wiebe | Georgi | Orzechowski | Morgan |
|----------|---------|--------|-------|--------|-------------|--------|
| **Tipo** | Direct response, sales letters, emails | Brand, storytelling, advertising | Landing pages, forms, UX | Sales pages premium, sequences | Email marketing, automation | Female-focused, community |
| **Objetivo** | Conversão imediata, resposta alta | Brand equity, positioning | Taxa de conversão otimizada | Vendas premium, consultoria | Engajamento, retenção, automation | Conexão emocional, transformação |
| **Oferta** | Qualquer volume | Qualquer | Qualquer | $5K-$100K+ premium | Qualquer | Qualquer |
| **Público** | Qualquer | Premium, B2B elegante | Qualquer | Executivos, tomadores decisão | Subscribers, customers | **Mulheres, female audience** |
| **Urgência** | Alta (imediata) | Média-Longa | Alta (conversão) | Média (consultoria) | Média (nurture) | Média (relacionamento) |

### Lógica de Roteamento (Decision Tree)

```
SE público é MULHERES (primary)
  → PRIMARY: @morgan
  → SECONDARY: @wiebe (se landing page) ou @orzechowski (se email)

SENÃO SE é EMAIL MARKETING/SEQUÊNCIA/AUTOMAÇÃO
  → PRIMARY: @orzechowski
  → SECONDARY: @georgi (se high-ticket) ou @morgan (se mulheres)

SENÃO SE é SALES PAGE PREMIUM ($5K+)
  → PRIMARY: @georgi
  → SECONDARY: @halbert (se urgência alta) ou @morgan (se mulheres)

SENÃO SE é LANDING PAGE / CONVERSÃO SITE
  → PRIMARY: @wiebe
  → SECONDARY: @halbert (se urgência) ou @morgan (se mulheres)

SENÃO SE é BRAND/POSITIONING/ADVERTISING
  → PRIMARY: @ogilvy
  → SECONDARY: @halbert (se direct response também) ou @morgan (se mulheres)

SENÃO (DEFAULT: Direct Response)
  → PRIMARY: @halbert
  → SECONDARY: @orzechowski (se email) ou @wiebe (se landing page)
```

### Output: TEAM SELECIONADO

Copy-Chef documenta:
- Especialista(s) selecionado(s) (1-2 máximo)
- Razão da seleção (qual dimensão foi PRIMARY)
- Briefing completo para cada especialista

---

## [ETAPA 3] EXECUTE (Copy-Chef Simula Time)

**Objetivo:** Executar escrita usando frameworks de cada especialista

**Processo:**

### Para Cada Especialista Selecionado:

1. **Load writingSystem do especialista**
   - Template mandatório (fill-in-the-blanks)
   - Validation checklist específico do tipo
   - DON'Ts absolutos
   - MUSTs obrigatórios (se existem)

2. **Execute em estilo do especialista**
   - Halbert: Headlines vencedoras, AIDA/PAS, risk reversal, CTA 3-5x
   - Ogilvy: Big Idea, pesquisa, storytelling elegante, premium positioning
   - Wiebe: Intent matching, single CTA, specificity triggers, zero ambiguidade
   - Georgi: RMBC, templates (Lead/Story/Mechanism/Objections/Close), validation checklist
   - Orzechowski: Subject lines, single purpose per email, sequences arquiteturadas
   - Morgan: Vulnerability → Transformation arc, tom de amiga, psychology feminina

3. **Aplica Template Mandatório**
   - Preenche cada seção conforme template
   - Valida contra checklist específico
   - Se falha validação: reescreve seção

4. **Documenta Pesquisa**
   - Salva em: `docs/clientes/{slug}/knowledge-base/`
   - Referencia em comentários de copy

5. **Output: Copy Pronta para Review**
   - Seção por seção de cada especialista
   - Anotações internas sobre decisões

---

## [ETAPA 4] QUALITY GATE (Copy-Chef como Master Reviewer)

**Objetivo:** Validar cópia contra critérios rigorosos antes de entrega

**Inputs:** Copy de cada especialista

### Processo de Review:

1. **Aplica 10 Critérios Universais**
   - Clareza, Relevância, Especificidade, Fluxo, CTA, Tom de Voz, Emoção, Zero Clichês, Pesquisa, Disqualification
   - Ver: `docs/copywriting-quality-criteria.md`

2. **Aplica Critérios Específicos do Tipo**
   - Headlines: Para Halbert/Orzechowski/Wiebe
   - Sales Letters: Para Halbert/Georgi/Ogilvy
   - Email Sequences: Para Orzechowski/Georgi
   - Landing Pages: Para Wiebe/Georgi
   - Brand Copy: Para Ogilvy/Morgan

3. **Calcula Score Ponderado**
   ```
   Score = Σ(Critério_Score × Critério_Peso) / Σ(Pesos)
   ```

4. **Decisão:**
   - **PASS** (≥ 8.0): Aprova, segue para DELIVER
   - **CONDITIONAL** (6.0-7.9): Aprova com notas, recomendações de melhoria
   - **REJECT** (< 6.0): Rejeita, fornece feedback específico → vai para ITERATE

5. **Scorecard Documentado**
   - Salva em: `docs/clientes/{slug}/copy-reviews/{copy_id}-scorecard.md`
   - Rastreia score histórico por tipo de copy

---

## [ETAPA 5] ITERATE (Se Rejeitado)

**Objetivo:** Re-executar seções que falharam até aprovação

**Trigger:** Copy recebeu REJECT no Quality Gate (score < 6.0)

### Protocolo de Iteração:

1. **Copy-Chef identifica critérios que falharam**
   - Seção específica? Critério universal?
   - Score < 6.0 em qual dimensão?

2. **Fornece feedback específico e actionable**
   ```
   REJECT - Seção: [SEÇÃO]
   Critério que falhou: [CRITÉRIO] (Score: [X]/10)

   Problema específico:
   - [Detalhe 1]
   - [Detalhe 2]

   Ação: Reescreva focando em [FOCO ESPECÍFICO]

   Exemplo de o que funciona:
   [Exemplo de copy bem-feita do mesmo tipo]
   ```

3. **Especialista reescreve APENAS a seção**
   - Não reescreve tudo
   - Foca no feedback específico
   - Re-aplica validation checklist

4. **Copy-Chef re-valida**
   - Se PASS: segue para DELIVER
   - Se ainda < 6.0: Loop novamente (máx 3 iterações)

5. **Max 3 Iterações**
   - Se após 3 loops ainda falha: Consulta usuário
   - Pode ser que demanda precise ser reformulada

---

## [ETAPA 6] DELIVER

**Objetivo:** Entregar cópia final aprovada ao usuário

**Processo:**

1. **Copy-Chef apresenta resultado final**
   - Copy pronta para implementação
   - Scorecard de quality gate
   - Anotações de qual especialista escreveu cada seção
   - Links para pesquisa em knowledge-base

2. **Instruções de Uso**
   - Onde usar? (Canal, contexto)
   - Como testar? (A/B recommendations)
   - Tracking necessário?

3. **Documenta em Cliente**
   - Salva copy em: `docs/clientes/{slug}/copy-library/{copy_id}/`
   - Adiciona ao histórico de performance

---

## [ETAPA 7] FEEDBACK LOOP (Feedback Evolution Protocol)

**Objetivo:** Iterar e melhorar critérios baseado em performance real

**Trigger:** Usuário testa copy e retorna feedback

### Processo:

1. **Usuário fornece feedback**
   - Performance: "Open rate foi 12%"
   - Audience reaction: "Clientes disseram que..."
   - Suggest improvement: "Seria melhor se..."

2. **Copy-Chef avalia feedback**
   - É racional? Baseado em dados ou opinião?
   - É relevante? Melhora copy future?
   - Padrão? Feedback recorrente?

3. **Se Racional & Relevante:**
   - **Propõe novo critério OU ajusta critério existente**
   - Exemplo:
     ```
     Feedback: "Copy foi rejeitada porque usava 'innovative' muito"
     Proposta: Adicionar "Zero Buzzwords Genéricos" como critério 0.8 peso
     Approval: Usuário aprova mudança?
     → SIM: Atualiza copywriting-quality-criteria.md
     ```

4. **Atualiza Arquivo de Evolução**
   - `memory/copywriting-quality-evolution.md`
   - Log: [DATA] Feedback → Critério Adicionado/Ajustado

5. **Documenta Padrão**
   - Se padrão recorrente: Adiciona ao baseline dos critérios
   - Se one-off: Documenta como "aprendizado do cliente"

---

## Tabela de Responsabilidades

| Etapa | Responsável | Input | Output |
|-------|-------------|-------|--------|
| 1. Demand Receipt | Copy-Chef | Briefing fuzzy | Briefing Interno + Tom de Voz |
| 2. Team Selection | Copy-Chef | Briefing Interno | Especialistas + Brief para cada |
| 3. Execute | Especialista(s) | Brief claro | Copy pronta |
| 4. Quality Gate | Copy-Chef | Copy pronta | Score + Decisão (PASS/CONDITIONAL/REJECT) |
| 5. Iterate (se REJECT) | Especialista | Feedback específico | Copy revisada |
| 6. Deliver | Copy-Chef | Copy aprovada | Copy final + Instruções |
| 7. Feedback Loop | Copy-Chef + Usuário | Performance data | Critérios atualizados (opcional) |

---

## Checklist de Orquestração

Use para rastrear progresso de uma demanda:

```
☐ [1] DEMAND RECEIPT
  ☐ Tipo de cópia identificado
  ☐ Objetivo primário claro
  ☐ ICP & persona definido(s)
  ☐ Tom de Voz consultado/criado
  ☐ Briefing Interno preenchido

☐ [2] TEAM SELECTION
  ☐ Especialista(s) roteado(s)
  ☐ Razão de roteamento documentada
  ☐ Brief enviado para especialista

☐ [3] EXECUTE
  ☐ Copy escrita em estilo do especialista
  ☐ Template mandatório aplicado
  ☐ Validation checklist passou
  ☐ Pesquisa documentada

☐ [4] QUALITY GATE
  ☐ 10 critérios universais avaliados
  ☐ Critérios tipo-específicos avaliados
  ☐ Score calculado
  ☐ Scorecard documentado

☐ [5] ITERATE (se necessário)
  ☐ Feedback específico fornecido
  ☐ Seção(ões) reescrita(s)
  ☐ Re-validação passou

☐ [6] DELIVER
  ☐ Copy entregue ao usuário
  ☐ Instruções fornecidas
  ☐ Documentado em cliente

☐ [7] FEEDBACK LOOP
  ☐ Performance rastreada
  ☐ Feedback coletado
  ☐ Critérios atualizados (opcional)
```

---

## Referências

- `docs/copywriting-quality-criteria.md` — Critérios de validação
- `.aios-core/development/checklists/copy-master-review-checklist.md` — Checklist executável
- `memory/copywriting-quality-evolution.md` — Histórico de feedback
- `docs/copywriting-hierarchy.md` — Papel de cada especialista

---

**Mantido por:** Copy-Chef Master Orchestrator
**Versão:** 2.0 (25 de fevereiro de 2026)
