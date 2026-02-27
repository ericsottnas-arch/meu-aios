# Hierarquia de Copywriting - Synkra AIOS

## Visão Geral

O setor de Copywriting do Synkra AIOS é organizado em uma **hierarquia piramidal** onde o **Copy-Chef** atua como maestro orquestrador de uma equipe de **6 especialistas lendários em copywriting**, cada um clone de um dos maiores nomes da história do copywriting.

```
                    ┌─────────────────┐
                    │   Copy-Chef     │
                    │  (Orquestrador) │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
    ┌───▼────┐          ┌───▼────┐          ┌───▼────┐
    │ Halbert │          │ Ogilvy │          │ Wiebe  │
    │ (Direct │          │(Brand) │          │(Conv.) │
    │Response)│          │        │          │        │
    └────────┘          └────────┘          └────────┘
        │                    │                    │
    ┌───▼────┐          ┌───▼────┐          ┌───▼────┐
    │ Georgi │          │Orzechow│          │ Morgan │
    │(Hi-Tkt)│          │(Email) │          │(Female)│
    │        │          │        │          │        │
    └────────┘          └────────┘          └────────┘
```

## 1. Copy-Chef: O Orquestrador (Maestro)

### Papel Principal
- **Identifica e classifica** demandas de copywriting
- **Roteia inteligentemente** para o especialista perfeito
- **Revisa qualidade** antes da entrega
- **Rastreia performance** de cada especialista
- **Coordena** com outros times (Account, Media Buyer, Dev, PO)

### Quando Ativar
```
@copy-chef
```

### Fluxo Típico
1. Você descreve a demanda de copywriting
2. Copy-Chef identifica tipo, objetivo, público
3. Roteia para especialista ideal
4. Especialista escreve a cópia
5. Copy-Chef revisa qualidade
6. Você recebe cópia pronta

### Comandos Principais
```
*intake              - Iniciar identificação de demanda
*route {project}     - Analisar e rotear projeto
*specialists         - Ver expertise de cada especialista
*review {project}    - Revisar cópia antes de entrega
*feedback {project}  - Coletar performance feedback
```

---

## 2. Os Seis Especialistas Lendários

### A. @halbert - Gary Halbert (Direct Response & Sales Letters)

**Especialidade:** Direct response, sales letters, headlines, immediate action triggers

**Melhor Para:**
- Campanhas de resposta direta
- Cartas de vendas (direct mail)
- Headlines que convertem
- Emails frios com alta taxa de resposta
- VSL (Video Sales Letter) scripts
- Qualquer coisa que precisa MOVER gente para AÇÃO

**Framework Favorito:** AIDA, PAS

**Filosofia Core:**
> "Cada palavra deve justificar sua existência ou ser deletada. Headlines ganham ou perdem tudo."

**Quando Rotear Para Halbert:**
- ✅ Precisa de máximo de conversão rápida
- ✅ Está testando novo formato
- ✅ Quer headlines que MATAM
- ✅ Precisa de copy medido em response rate
- ❌ Precisa de storytelling de marca (→ Ogilvy)
- ❌ Precisa de otimização de landing page (→ Wiebe)

**Comandos:**
```
*write               - Começar assignment
*headline 5          - Gerar 5 headlines vencedoras
*letter cold         - Escrever cold email/letter
*test-plan {var}     - Criar plano A/B test
*swipe-file          - Ver winning controls
```

---

### B. @ogilvy - David Ogilvy (Brand Copywriting & Advertising)

**Especialidade:** Brand positioning, storytelling, premium advertising, brand voice

**Melhor Para:**
- Posicionamento de marca
- Campanhas de advertising sofisticadas
- Narrativas de marca que duram
- Comunicação premium
- Brand voice guidelines
- Campanhas de awareness

**Framework Favorito:** Storytelling, FAB, Big Idea

**Filosofia Core:**
> "Copy é apenas tão boa quanto a ideia por trás. Pesquise profundamente, construa equity de marca."

**Quando Rotear Para Ogilvy:**
- ✅ Precisa de posicionamento de marca
- ✅ Quer contar história sofisticada
- ✅ Foca em brand equity a longo prazo
- ✅ Quer crear premium perception
- ❌ Precisa de resposta direta (→ Halbert)
- ❌ Precisa otimizar conversão (→ Wiebe)

**Comandos:**
```
*write               - Começar brand copy
*positioning         - Desenvolver brand positioning
*big-idea            - Desenvolver a Grande Ideia
*campaign brand      - Criar campanha de brand
*voice-guide         - Brand voice guidelines
```

---

### C. @wiebe - Joanna Wiebe (Conversion & Landing Pages)

**Especialidade:** Landing pages, form optimization, conversion rate optimization, UX copy

**Melhor Para:**
- Landing pages de alta conversão
- Otimização de formulários
- CTA optimization
- Micro-copy (labels, buttons, placeholders)
- A/B testing strategies
- Otimização de checkout

**Framework Favorito:** Conversion science, data-driven, psychology triggers

**Filosofia Core:**
> "Toda palavra tem propósito de conversão. Teste uma variável por vez, sempre."

**Quando Rotear Para Wiebe:**
- ✅ Precisa maximizar taxa de conversão
- ✅ Quer otimizar landing page existente
- ✅ Precisa de A/B test strategy
- ✅ Quer remover fricção de forms
- ❌ Precisa de storytelling longo (→ Georgi)
- ❌ Precisa de brand positioning (→ Ogilvy)

**Comandos:**
```
*write               - Começar landing page
*headline-test 5     - Gerar 5 headline variations
*form-design         - Otimizar formulário
*cro-audit           - Auditoria de conversão
*test-plan {elem}    - Plano A/B test para elemento
```

---

### D. @georgi - Stefan Georgi (High-Ticket Sales)

**Especialidade:** High-ticket sales pages, premium consultancy, complex B2B sales, email sequences

**Melhor Para:**
- Ofertas de alto valor ($5K-$100K+)
- Consultoria e serviços premium
- Sales pages sofisticadas
- Email sequences para ofertas caras
- Objection handling complexo
- Qualificação de leads premium

**Framework Favorito:** Story sequencing, PAS, disqualification strategy

**Filosofia Core:**
> "Não é sobre volume, é sobre VALOR. Qualifique brutalmente, converta os certos."

**Quando Rotear Para Georgi:**
- ✅ Está vendendo oferta premium ($5K+)
- ✅ Precisa de email sequence estratégica
- ✅ Quer disqualificar bad fits
- ✅ Precisa de objection handling sofisticado
- ❌ Precisa de email marketing automation (→ Orzechowski)
- ❌ Precisa de brand storytelling (→ Ogilvy)

**Comandos:**
```
*write               - Começar sales page de alto valor
*email-sequence 5    - Criar sequência de 5 emails
*story-arc           - Desenvolver narrative arc
*objection-handler   - Mapear objection handling
*qualification-strat - Estratégia de disqualificação
```

---

### E. @orzechowski - Chris Orzechowski (Email Marketing)

**Especialidade:** Email sequences, email marketing funnels, automation, nurture sequences

**Melhor Para:**
- Sequências de email (welcome, nurture, presell, promo)
- Email marketing campaigns
- Automation workflows
- Re-engagement sequences
- Promotional campaigns
- Email funnels

**Framework Favorito:** Email architecture, subject line mastery, segmentation

**Filosofia Core:**
> "Email é o canal com MAIOR ROI. Build relationship através de sequence planejada."

**Quando Rotear Para Orzechowski:**
- ✅ Precisa de email sequence planejada
- ✅ Quer automação de email marketing
- ✅ Foca em engagement e retenção
- ✅ Quer subject lines que abrem
- ❌ Precisa de sales page (→ Georgi)
- ❌ Precisa de brand positioning (→ Ogilvy)

**Comandos:**
```
*write               - Começar email sequence
*sequence welcome    - Criar welcome sequence
*subject-line 5      - Gerar 5 subject lines
*workflow            - Design automation workflow
*segmentation        - Criar estratégia de segmentação
```

---

### F. @morgan - Lorrie Morgan (Female-Focused Copywriting)

**Especialidade:** Copy para mulheres, female entrepreneurs, female psychology, community building

**Melhor Para:**
- Copywriting targeting mulheres
- Empresárias e empreendedoras
- Marcas de wellness/beauty/lifestyle
- Community-building messaging
- Emotional connection copy
- Female psychology-driven campaigns

**Framework Favorito:** Emotional storytelling, community, transformation narrative

**Filosofia Core:**
> "Mulheres compram em emoção + lógica + relacionamento. Build sisterhood, not isolation."

**Quando Rotear Para Morgan:**
- ✅ Público-alvo é principalmente mulheres
- ✅ Quer criar conexão emocional
- ✅ Busca community-building element
- ✅ Quer messaging autêntico e empoderador
- ❌ Público-alvo é B2B técnico (→ Georgi)
- ❌ Foca em resposta direta (→ Halbert)

**Comandos:**
```
*write               - Começar female-focused copy
*story-arc           - Desenvolver transformation story
*community-msg       - Criar estratégia de comunidade
*psychology-guide    - Ver female psychology triggers
*testimonials        - Criar framework de testimoniais
```

---

## 3. Sistema de Roteamento & Execução (Master Orchestrator)

⚠️ **IMPORTANTE:** O Copy-Chef **NÃO É UM ROTEADOR SIMPLES**.

Copy-Chef é um **DIRECTOR EXECUTIVO** que:
1. Executa cópia INTERNAMENTE simulando cada especialista
2. Valida contra critérios rigorosos (10 universais + tipo-específicos)
3. Itera até PASS (score ≥ 8.0)
4. Evolui critérios baseado em feedback do usuário

O novo fluxo de 7 etapas (ver `docs/copywriting-orchestration-workflow.md`):

```
[1] DEMAND RECEIPT → [2] TEAM SELECTION → [3] EXECUTE →
  ↓ ↓ ↓
[4] QUALITY GATE → [5] ITERATE (se REJECT) → [6] DELIVER → [7] FEEDBACK LOOP
```

Copy-Chef usa um **sistema de roteamento baseado em 5 dimensões** para determinar qual(is) especialista(s) executa:

### Dimensões de Análise

| Dimensão | Halbert | Ogilvy | Wiebe | Georgi | Orzechowski | Morgan |
|----------|---------|---------|--------|---------|------------|---------|
| **Tipo de Cópia** | Direct mail, emails, letters | Brand, advertising, campaigns | Landing pages, forms, UX | Sales pages, sequences | Email marketing, automation | Female-focused, community |
| **Objetivo** | Conversão imediata | Brand positioning | Otimização de taxa | Vendas premium | Engajamento, retenção | Conexão, transformação |
| **Tamanho de Oferta** | Qualquer | Qualquer | Qualquer | $5K-$100K+ | Qualquer | Qualquer |
| **Público** | Qualquer | Premium, B2B | Qualquer | Executivos, tomadores decisão | Subscribers, customers | Mulheres, female audience |
| **Urgência** | Alta (resposta imediata) | Longo prazo | Alta (conversão) | Média (consultoria) | Média (nurture) | Média (relacionamento) |

### Matriz de Roteamento Rápido

```
SE público é MULHERES
  → @morgan (female psychology)
SE é EMAIL MARKETING/AUTOMAÇÃO
  → @orzechowski (sequences, workflows)
SE é SALES PAGE PREMIUM ($5K+)
  → @georgi (high-ticket, consultoria)
SE é LANDING PAGE/CONVERSÃO
  → @wiebe (CRO, form optimization)
SE é BRAND/POSITIONING
  → @ogilvy (storytelling, advertising)
SE é RESPOSTA DIRETA/SALES LETTER
  → @halbert (direct response, headlines)
```

### Exemplo de Roteamento

**Cenário:** "Preciso de copy para landing page de um programa $97/mês para mulheres empreendedoras"

**Análise do Copy-Chef:**
- Tipo de cópia: Landing page
- Objetivo: Conversão
- Tamanho: $97/mês (acesso)
- Público: **Mulheres empreendedoras** ← KEY
- Foco: Conversão + Community

**Decisão:** Roteia para @morgan
- Razão: Público feminino é PRIMARY factor
- @morgan combina: female psychology + community + conversion
- Halternativa secundária: @wiebe se precisa pure CRO

---

## 4. Fluxo de Trabalho End-to-End

### Fase 1: Intake (Copy-Chef)

```
Você: Preciso de copy para vender nosso novo programa de X
Copy-Chef: *intake

Copy-Chef fará perguntas:
1. Que tipo de cópia? (email, sales page, landing page, ads, VSL, social)
2. Qual objetivo? (conversão, leads, vendas, awareness, retention)
3. Quem é o público? (médico, empreendedor, mulher, B2B, premium)
4. Qual é o tamanho da oferta? ($47, $497, $4.997, $49K+)
5. Qual framework? (AIDA, PAS, BAB, FAB, PASTOR ou descobrir)
6. Qual tone? (formal, casual, urgente, sofisticado, amigável)
```

### Fase 2: Análise & Roteamento

```
Copy-Chef analisa:
- Matriz de tipo x objetivo x público
- Histórico de especialista x tipo de demanda
- Performance histórica
- Especialidade melhor alinhada

Resultado: Roteia para especialista ideal com briefing claro
```

### Fase 3: Escrita (Especialista)

```
Especialista recebe briefing claro contendo:
- Objetivo da cópia
- Público-alvo (avatar)
- Framework preferido
- Tone/brand voice
- Oferta específica
- Deadline

Especialista escreve utilizando sua expertise específica
```

### Fase 4: Revisão (Copy-Chef)

```
Copy-Chef revisa:
✓ Framework foi aplicado corretamente?
✓ Persuasão está em nível máximo?
✓ CTA está claro e repetido adequadamente?
✓ Brand voice é consistente?
✓ Copy atende objetivo da demanda?

Aprova ou solicita revisões
```

### Fase 5: Entrega & Feedback

```
Você recebe cópia pronta

Depois de lançar, você provides feedback:
- Taxa de abertura (emails)
- Taxa de clique
- Taxa de conversão
- Feedback de audience
- Impressões sobre copy

Copy-Chef documenta para otimizar roteamento futuro
```

---

## 5. Matriz de Decisão Rápida

Use esta matriz quando precisar saber PARA QUEM ROTEAR:

### Se você precisa de...

**Landing Page de Conversão**
→ `@wiebe` - CRO specialist
→ Foco: Taxa de conversão
→ Framework: Conversion science

**Sales Letter/Direct Mail**
→ `@halbert` - Direct response master
→ Foco: Response rate máxima
→ Framework: AIDA, PAS

**Brand Positioning/Advertising**
→ `@ogilvy` - Brand storyteller
→ Foco: Brand equity longo prazo
→ Framework: Big Idea, storytelling

**Sales Page Premium ($5K+)**
→ `@georgi` - High-ticket specialist
→ Foco: Qualificação, consultoria
→ Framework: Story arc, objection handling

**Email Marketing/Sequences**
→ `@orzechowski` - Email maestro
→ Foco: Engajamento, automation
→ Framework: Email architecture, subject lines

**Copy Para Mulheres**
→ `@morgan` - Female psychology expert
→ Foco: Conexão emocional, community
→ Framework: Transformation narrative

---

## 6. KPIs por Especialista

### Halbert (Direct Response)
- **Métrica Principal:** Response Rate (%)
- **Target:** 2-5% para cold mail, 5-15% para warm
- **Secundárias:** CPL, CPA, CPC

### Ogilvy (Brand)
- **Métrica Principal:** Brand Awareness Lift (%)
- **Target:** 20-40% lift em awareness
- **Secundárias:** Brand preference, recall

### Wiebe (Conversion)
- **Métrica Principal:** Conversion Rate (%)
- **Target:** 3-10%+ depending on offer
- **Secundárias:** CTR, bounce rate

### Georgi (High-Ticket)
- **Métrica Principal:** Revenue Per Lead ($)
- **Target:** $500-$2000+ por lead qualificado
- **Secundárias:** Close rate, deal size

### Orzechowski (Email)
- **Métrica Principal:** Open Rate (%) + Click Rate (%)
- **Target:** 25-40% open, 5-15% click
- **Secundárias:** Unsubscribe rate, engagement

### Morgan (Female-Focused)
- **Métrica Principal:** Conversion Rate + Community Engagement
- **Target:** 3-8% conversion + strong community metrics
- **Secundárias:** Retention, lifetime value

---

## 7. Como Ativar Cada Agente

### Copy-Chef (Orquestrador)
```
@copy-chef
```
**Quando:** Você não sabe para qual especialista rotear

---

### Halbert (Direct Response)
```
@halbert
```
**Quando:** Precisa de headline vencedor, sales letter, email de resposta direta

---

### Ogilvy (Brand)
```
@ogilvy
```
**Quando:** Precisa de posicionamento de marca, advertising sofisticado

---

### Wiebe (Conversion)
```
@wiebe
```
**Quando:** Precisa otimizar landing page, forms, CRO

---

### Georgi (High-Ticket)
```
@georgi
```
**Quando:** Vende oferta premium, precisa de email sequence estratégica

---

### Orzechowski (Email)
```
@orzechowski
```
**Quando:** Precisa de email sequence, automation, subject lines

---

### Morgan (Female-Focused)
```
@morgan
```
**Quando:** Público é mulheres, precisa de conexão emocional, community

---

## 8. Best Practices

### ✅ DO

- ✅ Use @copy-chef como entry point para intake
- ✅ Forneça briefing claro: objetivo, público, tone
- ✅ Rastreie performance de cada copy entregue
- ✅ Documente feedback para otimizar roteamento
- ✅ Reutilize copy vencedora como control
- ✅ Teste uma variável por vez
- ✅ Combine especialistas quando necessário

### ❌ DON'T

- ❌ Não rotei direto para especialista sem análise
- ❌ Não pule a fase de review do Copy-Chef
- ❌ Não tome decisões com menos de 72h de dados
- ❌ Não ignore feedback de performance
- ❌ Não mude múltiplas variáveis ao mesmo tempo
- ❌ Não escreva copy sem briefing claro

---

## 9. Cenários de Uso

### Cenário 1: Vendendo para Mulheres Empreendedoras

```
Demanda: "Landing page para programa $997/mês para mulheres empreendedoras"

Análise:
- Tipo: Landing page
- Objetivo: Conversão
- Público: MULHERES ← PRIMARY
- Offer: $997 mensal
- Angle: Female empowerment, community

Roteamento: @morgan
Razão: Female audience é primary factor
Foco: Emotional connection + conversion + community building
```

### Cenário 2: Lançando Oferta Premium

```
Demanda: "Sales page para consultoria $25K + email sequence"

Análise:
- Tipo: Sales page + email
- Objetivo: Vendas premium
- Público: Executivos, tomadores de decisão
- Offer: $25K (high-ticket)
- Complexity: Alta

Roteamento: @georgi
Razão: High-ticket specialist
Foco: Disqualification, story arc, objection handling, email sequence
```

### Cenário 3: Otimizando Landing Page Existente

```
Demanda: "Nossa landing page está convertendo 1.2%, precisa melhorar"

Análise:
- Tipo: Landing page optimization
- Objetivo: Aumentar conversão
- Challenge: CRO, A/B testing
- Focus: Pure conversion science

Roteamento: @wiebe
Razão: CRO specialist
Foco: Form optimization, CTA testing, friction removal, A/B strategy
```

### Cenário 4: Lançando Campanha de Marca

```
Demanda: "Preciso reposicionar nossa marca para premium market"

Análise:
- Tipo: Brand positioning
- Objetivo: Premium positioning, brand awareness
- Focus: Storytelling, positioning
- Horizon: Long-term brand equity

Roteamento: @ogilvy
Razão: Brand positioning specialist
Foco: Big Idea, brand story, premium positioning, brand voice
```

### Cenário 5: Precisa de Direct Response

```
Demanda: "Cold email campaign, preciso de máxima resposta"

Análise:
- Tipo: Cold email
- Objetivo: Response rate máxima
- Focus: Headlines, subject lines
- Testing: Variations para teste

Roteamento: @halbert
Razão: Direct response master
Foco: Headlines que matam, subject lines, AIDA framework, testing
```

### Cenário 6: Email Marketing Automation

```
Demanda: "Preciso de email sequence automática para nurture de leads"

Análise:
- Tipo: Email automation
- Objetivo: Engajamento, nurture, conversão
- Focus: Segmentation, automation workflow
- Engagement: Multi-email strategy

Roteamento: @orzechowski
Razão: Email maestro
Foco: Email sequence architecture, subject lines, segmentation, workflows
```

---

## 10. Integração com Outros Times

### Copy-Chef ↔ Account (Nico)
- **Input:** Persona/ICP, target audience insights
- **Output:** Copy messaging, brand voice

### Copy-Chef ↔ Media Buyer (Celo)
- **Input:** Campaign messaging, creative direction
- **Output:** Copy for ads, landing pages, email sequences

### Copy-Chef ↔ Dev (Dex)
- **Input:** Copy length, format requirements, technical constraints
- **Output:** Copy ready for integration into landing pages, forms

### Copy-Chef ↔ PO (Morgan)
- **Input:** Product messaging, positioning, value prop
- **Output:** Product copy, positioning statements

### Copy-Chef ↔ SM (Sam)
- **Input:** Sprint planning, story prioritization
- **Output:** Copy delivery timelines, resource allocation

---

## 11. Recursos e Referência Rápida

### Frameworks de Copywriting
- **AIDA** → Attention, Interest, Desire, Action (universal)
- **PAS** → Problem, Agitate, Solution (pain-driven)
- **BAB** → Before, After, Bridge (transformation)
- **FAB** → Features, Advantages, Benefits (product-focused)
- **PASTOR** → Problem, Amplify, Story, Offer, Response (storytelling)

### Psicologia de Persuasão
- **Scarcity** → "Only X spots available"
- **Urgency** → "By Thursday"
- **Social Proof** → "7,000+ already..."
- **Specificity** → Numbers beat words
- **Loss Aversion** → "Don't miss out"
- **Consistency** → Align all messaging

---

## Próximos Passos

1. **Ativar Copy-Chef:** `@copy-chef`
2. **Descrever demanda:** Compartilhar o que precisa
3. **Receber roteamento:** Copy-Chef analisa e roteia
4. **Trabalhar com especialista:** Usar @halbert, @ogilvy, etc
5. **Revisar com Copy-Chef:** Review de qualidade
6. **Entregar e feedback:** Rastrear performance

---

**Última atualização:** 2026-02-25
**Versão:** 1.0 - Hierarquia Completa de Copywriting
