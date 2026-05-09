# BI Analytics Knowledge Base
## Playbook do @bi-analyst (Avinash)

> Versão: 2.0 | Atualizado: 2026-04-09 (pesquisa profunda adicionada)
> Fontes: Avinash Kaushik, Stephen Few, Cole Nussbaumer Knaflic, Alberto Cairo,
> Edward Tufte, Bernard Marr, David Skok, SaaS CFO, Baremetrics, benchmarks 2025

---

## PARTE 0: AS MENTES FUNDADORAS — PRINCÍPIOS ESSENCIAIS

### EDWARD TUFTE — Minimalismo Radical e Data-Ink

**Princípio central:** Data-Ink Ratio = tinta usada para dados / tinta total. Maximizar esse ratio. Eliminar tudo que não for dado.

**5 regras de Tufte:**
1. Above all else, show the data
2. Maximize the data-ink ratio
3. Erase non-data-ink (grades pesadas, bordas desnecessárias, backgrounds coloridos = lixo)
4. Erase redundant data-ink (labels que repetem o que o eixo já mostra)
5. Revise and edit — simplifique iterativamente

**Chartjunk (inimigo #1):** Qualquer elemento visual que não contribui para compreensão. Tipos: vibrations (hachura que cria ilusão óptica), grids pesados, decoração em forma de dado (barras em formato de pessoas), 3D desnecessário.

**Anti-pattern crítico:** Gráficos 3D quase sempre são chartjunk. 3D distorce percepção de área e volume. Nunca usar 3D para comparações precisas.

**Sparklines:** "data-intense, design-simple, word-sized graphics". Minigráficos sem eixos/labels, embeddados em texto ou tabelas. Ideais para séries temporais em dashboards com muitas métricas lado a lado.

**Small Multiples:** Mesma escala, mesmo formato, repetido para subconjuntos diferentes. O olho compara automaticamente. Muito mais eficaz que sobreposição.

---

### ALBERTO CAIRO — Visualização como Instrumento de Verdade

**Obra principal:** The Functional Art (2012), The Truthful Art (2016), How Charts Lie (2019)

**As 5 Qualidades de uma Boa Visualização (Cairo):**
1. **Truthful (Verdadeira):** baseada em dados precisos, sem distorção
2. **Functional (Funcional):** adequada ao propósito — o visual entrega a informação prometida
3. **Beautiful (Bela):** elegante no uso de tipografia, cor e composição
4. **Insightful (Reveladora):** expõe padrões, tendências ou outliers não evidentes
5. **Enlightening (Esclarecedora):** resultado das 4 anteriores — aumenta genuinamente o entendimento

**Ordem importa:** Verdade vem primeiro. Uma visualização bela que mente é pior que uma feia que diz a verdade.

**Como Gráficos Mentem — Taxonomia de Cairo:**

| Tipo de mentira | Exemplo | Como evitar |
|----------------|---------|-------------|
| **Truncar eixo Y** | Barra começa em 90 em vez de 0 | Eixo Y de barras SEMPRE começa em 0 |
| **Área vs comprimento** | Raio dobrado = área 4x maior em bolhas | Mapear valor para área, não para raio |
| **Dual axis** | Dois eixos Y criam correlação falsa | Evitar gráficos de linha com 2 eixos Y |
| **Cherry-picking temporal** | Janela favorece narrativa | Mostrar histórico completo |
| **Denominador oculto** | "200% de crescimento" sem contexto | Sempre mostrar denominador |
| **Mapa sem normalização** | Países grandes parecem ter mais de tudo | Normalizar por população ou área |

---

### COLE NUSSBAUMER KNAFLIC — Storytelling com Dados

**Os 6 Princípios:**

**1. Entender o Contexto:** Antes de qualquer visualização — quem é a audiência? O que precisa saber? Como vai consumir?

Ferramenta "The Big Idea": uma frase que encapsula o ponto principal + o que está em jogo.
Exemplo bom: "Nossa taxa de churn Q1 subiu 2.3pp vs Q4, e se não agirmos em 30 dias, vamos perder R$180k em ARR"

**2. Escolher o Tipo de Gráfico Correto:**
- Texto simples: quando o número em si é o destaque
- Tabela: quando a audiência quer consultar valores individuais
- Heatmap: comparar padrões em matriz
- Scatter: relação entre duas variáveis
- Barras: comparação categórica (o mais versátil)
- Linha: série temporal (único cenário válido para a maioria das tendências)
- NÃO recomendado: pizza, donut, área sobreposto, 3D

**3. Eliminar Clutter:**
- Remover: bordas de gráficos desnecessárias, grades pesadas, data labels em todo ponto, legendas redundantes
- Título genérico = lixo. "Vendas por Mês" → "Vendas crescem 15% MoM em Q1"

**4. Direcionar Atenção — Atributos Pré-atentivos:**
O cérebro processa em menos de 500ms:
- Cor: uma cor de destaque em fundo neutro (regra: 1 cor de destaque por visualização)
- Tamanho: texto maior = mais importante
- Posição: top-left = primeiro lido
- Intensidade: saturação alta = urgência

**5. Pensar como Designer:** alinhamento, espaço em branco (não é desperdício), hierarquia de texto

**6. Contar a História:** Estrutura: Contexto → Tensão → Virada → Resolução

"Inverted Pyramid" para executivos: conclusão primeiro, então evidência.

**Anti-pattern crítico:** "Aqui está o dashboard, o que vocês acham?" — os dados não falam por si só.

---

### BERNARD MARR — KPIs como Conversa Estratégica

**Filosofia:** "KPIs não são primariamente sobre mensuração; são sobre selecionar indicadores que servem como ponto de partida para uma rica discussão de performance focada na entrega de estratégia."

**5 critérios para validar uma KPI:**
1. Ligado a um objetivo estratégico
2. Mensurável (dados disponíveis com frequência adequada)
3. Acionável (quando muda, sabe-se o que fazer)
4. Relevante (a audiência certa vai usar para decidir)
5. Temporalmente definido (ciclo de revisão claro)

**As 5 perspectivas de Marr (alinhadas ao BSC):**
1. Financeiro: lucratividade, crescimento de receita, eficiência de custo
2. Cliente: satisfação, retenção, aquisição, market share
3. Processos internos: qualidade, tempo de ciclo, capacidade
4. Pessoas: engajamento, produtividade, capacitação
5. Inovação: novos produtos, projetos, P&D

---

### STEPHEN FEW — Dashboard Design como Ciência

**Definição canônica:** "A visual display of the most important information needed to achieve one or more objectives that has been consolidated on a single computer screen so it can be monitored at a glance."

Palavras-chave: **single screen** (sem scroll), **at a glance** (segundos, não minutos), **most important** (curadoria brutal, não dump de dados)

**Bullet Graph (invenção de Few, 2005):**
```
LABEL  [████░░░░░░░░░░░░░] |target  value
        Poor  Avg  Good  Excellent
```
Componentes: valor atual (barra), target (linha vertical), contexto qualitativo (bandas de fundo), escala monocromática.
Uso: substitui gauges e velocímetros — comunica muito mais em muito menos espaço.

**Preattentive Attributes + Gestalt em Dashboards:**

| Gestalt | Aplicação em BI |
|---------|----------------|
| Proximidade | KPIs relacionadas agrupadas sem linha de borda |
| Similaridade | Mesmo formato visual = mesma família de métrica |
| Enclosure | Container (card) = agrupa métricas de uma área |
| Continuidade | Linhas do gráfico que continuam = série temporal |

---

### AVINASH KAUSHIK — Extras Críticos

**A Regra 10/90:**
- 10% do orçamento de analytics em ferramentas e tecnologia
- 90% em pessoas inteligentes que interpretam os dados
- Maioria das organizações inverte isso: dashboards bonitos, zero decisão tomada

**Distinções Kaushik:**
- Objetivo vs Goal vs KPI vs Target vs Segmento (hierarquia, não sinônimos)
- Toda KPI deve ser mapeável até um Business Objective — se não consegue mapear, não meça
- Segmentação como superpoder: médias escondem insights. Sempre segmentar por canal, dispositivo, coorte, plano

---

## FRAMEWORKS CORE

### 1. TRINITY ANALYTICS (Avinash Kaushik)

Todo problema de analytics deve ser abordado pelos três pilares:

```
BEHAVIOR (O que fizeram?)
  → Dados quantitativos de como usuários se comportam
  → Fontes: web analytics, product analytics, CRM data
  → Responde: Quais páginas visitaram? Quais features usaram? Onde desistiram?

OUTCOMES (Qual foi o resultado?)
  → KPIs de negócio que medem se os objetivos foram atingidos
  → Fontes: receita, conversões, retenção, NPS
  → Responde: Converteram? Retornaram? Geraram receita? Recomendaram?

EXPERIENCE (Por que fizeram?)
  → Dados qualitativos de motivação e experiência
  → Fontes: pesquisas, NPS surveys, entrevistas de usuário, heatmaps
  → Responde: Por que desistiram? O que valorizam? O que frustra?
```

**Regra de uso:** Nunca feche uma análise sem ter os três pilares. Behavior sem Outcomes é
operação sem propósito. Outcomes sem Experience é melhora de resultado sem entender por quê.

---

### 2. DIGITAL MARKETING MEASUREMENT MODEL (DMMM)

Framework top-down para definir o que medir:

```
Camada 1: BUSINESS OBJECTIVES (3-5 max)
  Exemplo: "Crescer receita recorrente em 30% em 12 meses"
  Erro comum: objetivos vagos como "aumentar presença digital"

Camada 2: GOALS (por objetivo)
  Exemplo para objetivo acima:
  - Goal A: Aumentar MRR de novos clientes em 20%
  - Goal B: Reduzir churn para abaixo de 5% anual
  - Goal C: Expandir receita de clientes existentes em 15%

Camada 3: KPIs (por goal, máx 3 por goal)
  Goal A → KPIs: New MRR, SQL-to-Win Rate, CAC
  Goal B → KPIs: Monthly Churn Rate, NPS, Feature Adoption Rate
  Goal C → KPIs: NRR, Expansion MRR, Upsell Rate

Camada 4: SEGMENTS (por KPI)
  New MRR por: canal de aquisição, tamanho de empresa, produto
  Churn por: cohort de onboarding, plano, uso de features

Camada 5: TARGETS (por KPI + segmento)
  New MRR: +R$15k/mês, crescimento de 10% MoM
  Churn Rate: < 0.8% monthly (< 10% anual)
```

**Erro fatal:** Começar pela camada 3 (KPIs) sem definir 1 e 2. Resulta em métricas
sem propósito e dashboards que não habilitam decisão.

---

### 3. NORTH STAR METRIC FRAMEWORK (Amplitude / Sean Ellis)

**Definição:** A única métrica que captura o valor central que o produto entrega aos
clientes e que se correlaciona diretamente com crescimento sustentável.

**Componentes do NSM Framework:**
```
North Star Metric (1 apenas)
  ↕
Input Metrics / Levers (3-5)
  → Métricas que você pode influenciar que movem a NSM
  ↕
Guardrails (2-3)
  → Métricas que não podem deteriorar enquanto você melhora a NSM
```

**Exemplos por tipo de negócio:**

| Negócio | North Star Metric | Exemplo Input Metric |
|---------|-------------------|----------------------|
| SaaS B2B | # Active Teams usando feature core | Onboarding completion rate |
| E-commerce | Repeat Purchase Rate | Days between purchases |
| Marketplace | GMV (Gross Merchandise Value) | Listings com fotos + preço |
| Mídia | Tempo de consumo semanal | % usuários que salvam artigos |
| Agency/Service | Revenue per Managed Account | # contas acima de R$10k/mês |

**Critério de qualidade para NSM:**
1. Captura valor real entregue ao cliente (não só receita)
2. É lagging — segue outcomes, não precede
3. Pode ser decomposta em input metrics acionáveis
4. Toda equipe consegue entender como seu trabalho a impacta

**Armadilha:** Revenue como NSM ignora retenção, e uma empresa pode crescer MRR enquanto
churna clientes a taxas insustentáveis. NRR é melhor NSM para SaaS maduro.

---

### 4. OKR vs KPI — DIFERENÇA CRÍTICA

```
KPI (Key Performance Indicator):
  → Mede a saúde de um processo ou área
  → Geralmente constante (sempre monitorado)
  → Tem threshold (acima/abaixo de X = bom/ruim)
  → Exemplo: Churn Rate (meta: < 0.8%/mês — sempre monitorado)

OKR (Objectives + Key Results):
  → Define ambição e como mesurar progresso
  → Temporário (geralmente 90 dias)
  → Tem stretch goal (60-70% = sucesso)
  → Exemplo: "Reduzir churn em 30% neste trimestre" com KR1: NPS > 50, KR2: Feature adoption > 60%

Relacionamento:
  KPIs definem o chão. OKRs definem o movimento.
  Um KPI pode virar input metric de um OKR.
```

---

## KPI LIBRARY — PONTO CRÍTICO DE CADA INDICADOR

### MÉTRICAS FINANCEIRAS / SAAS

#### MRR (Monthly Recurring Revenue)
- **Fórmula:** Soma de todas as assinaturas mensais ativas
- **Componentes que DEVEM ser rastreados separadamente:**
  - New MRR: de clientes novos
  - Expansion MRR: upgrades de clientes existentes
  - Contraction MRR: downgrades
  - Churned MRR: cancelamentos
  - Reactivation MRR: clientes reativados
- **Fórmula Net:** Net New MRR = New + Expansion + Reactivation - Contraction - Churned
- **Ponto crítico:** MRR crescendo com Net New negativo = crescendo no PEITO. A aquisição está tapando o buraco da retenção. Insustentável.
- **Benchmark:** Top SaaS cresce MRR 10-20% MoM early stage, 5-10% em estágio de escala.
- **Armadilha:** Annual plans inflam MRR se não reconhecidos mensalmente (MRR = ARR / 12)

#### ARR (Annual Recurring Revenue)
- **Fórmula:** MRR × 12 (para contratos mensais)
- **Uso correto:** Para contratos anuais, ARR = soma dos valores anuais contratuais
- **Ponto crítico:** ARR sem NRR é ilusório — pode estar crescendo enquanto a base se esvazia
- **Para investidores:** ARR > $1M com NRR > 110% = série A territory; > $3M com NRR > 120% = série B

#### Churn Rate (Customer Churn)
- **Fórmula:** Clientes perdidos no período / Clientes no início do período × 100
- **Tipos:**
  - Customer Churn: % clientes que saíram
  - Revenue Churn: % da receita que saiu (mais importante)
  - Gross Revenue Churn: revenue perdida / revenue total (antes de expansion)
- **Thresholds críticos:**
  - < 5% anual = excelente (< 0.4%/mês)
  - 5-10% anual = aceitável mas monitorar (0.4-0.8%/mês)
  - 10-15% anual = alerta vermelho (0.8-1.3%/mês)
  - > 15% anual = emergência — parar aquisição, focar retenção
- **Ponto crítico:** Monthly churn de 2% parece pequeno, mas anualizando = 22% anual. SEMPRE anualize o churn para ter perspectiva real.
- **Armadilha:** Churning de clientes pequenos mascarado por retenção de grandes. Monitore churn por segmento.
- **Matemática do composto:** Com 5% churn mensal, em 12 meses você perde 46% da base. (1-0.05)^12 = 0.54

#### NRR / NDR (Net Revenue Retention / Net Dollar Retention)
- **Fórmula:** (MRR início - Churned MRR - Contraction MRR + Expansion MRR) / MRR início × 100
- **O que significa:**
  - NRR 100% = retendo toda receita, sem crescimento de base
  - NRR 110% = base crescendo 10% sem um único cliente novo
  - NRR 94% = perdendo 6% da base recorrentemente
- **Benchmark (SaaS):**
  - Elite: > 120%
  - Top quartile: 110-120%
  - Mediana: 100-110%
  - Abaixo do radar: < 100%
  - Emergência: < 90%
- **Por que NRR > ARR growth:** NRR de 120% significa crescimento orgânico de 20% sem nenhum novo cliente. Uma empresa com NRR 120% e zero vendas ainda cresce.
- **Ponto crítico:** É o único indicador que captura simultaneamente: (1) sua retenção, (2) sua capacidade de expandir receita na base, (3) saúde do product-market fit.

#### LTV (Customer Lifetime Value)
- **Fórmula simples:** ARPU (Average Revenue Per User) / Churn Rate mensal
- **Fórmula avançada:** Considera margem (LTV = Gross Margin % × ARPU / Churn Rate)
- **Exemplo:** ARPU = R$500/mês, Churn = 2%/mês → LTV = 500/0.02 = R$25.000
- **Ponto crítico:** LTV é HIPER sensível ao churn. Dobrar churn CORTA O LTV À METADE.
  - Churn 1%: LTV = 50 × ARPU
  - Churn 2%: LTV = 25 × ARPU
  - Churn 5%: LTV = 20 × ARPU
- **Armadilha:** Usar LTV sem desconto temporal (payback muito longo = LTV nominal inflado)
- **Uso correto:** Sempre compare LTV com CAC para avaliar saúde de unit economics

#### CAC (Customer Acquisition Cost)
- **Fórmula:** Total de custos de vendas + marketing no período / Clientes adquiridos no período
- **ERRO MAIS COMUM:** Incluir apenas spend de mídia. CAC real inclui:
  - Salário de time de vendas (proporção do tempo)
  - Salário de time de marketing
  - Ferramentas (CRM, automação, SEO tools)
  - Agência / consultoria externa
  - Eventos e trade shows
  - Spend de mídia paga
- **Regra LTV:CAC:**
  - > 5:1 = excelente (mas cuidado — pode significar sub-investimento em crescimento)
  - 3:1 a 5:1 = saudável e sustentável
  - 1:1 a 3:1 = alerta — modelo sendo testado ou problemático
  - < 1:1 = destruindo valor — cada cliente adquirido custa mais do que vale
- **CAC Payback Period:** Meses para recuperar o CAC = CAC / (ARPU × Gross Margin %)
  - < 12 meses = excelente
  - 12-18 meses = aceitável
  - > 18 meses = risco de fluxo de caixa
  - > 24 meses = emergência (você é um banco emprestando para seus clientes)

#### EBITDA
- **Fórmula:** Receita - Custos Operacionais (excluindo juros, impostos, depreciação, amortização)
- **Por que importa:** Mede eficiência operacional da empresa "no mundo ideal"
- **Para SaaS:** Rule of 40 = ARR Growth % + EBITDA Margin % > 40
  - Growth 30% + EBITDA 15% = 45 (bom)
  - Growth 80% + EBITDA -20% = 60 (bom para early stage)
  - Growth 10% + EBITDA 25% = 35 (preocupante — não está crescendo nem lucrando suficiente)

---

### MÉTRICAS DE MARKETING

#### ROAS (Return on Ad Spend)
- **Fórmula:** Receita gerada por anúncios / Spend em anúncios
- **Benchmark mínimo:** > 2x (antes de margem), > 4x (para ser lucrativo com 50% margem)
- **ROAS de plataforma vs ROAS real:**
  - ROAS de plataforma: o que o Meta/Google reportam (inclui attribution generosa)
  - ROAS real: calculado com dados reais de conversão (geralmente 40-60% do reportado)
  - Diferença = attribution inflation (principalmente de last-click)
- **Ponto crítico:** ROAS de plataforma inclui view-through attribution que inflaciona o número.
  Para B2B, o ROAS real médio é 0.5-0.7x do que a plataforma reporta.
- **Como calcular ROAS real:** Comparar receita de cohorts de clientes adquiridos vs clientes
  do mesmo período sem exposição a ads (holdout group ou geo experiments)
- **Armadilha por vertical:**
  - E-commerce: ROAS > 3x geralmente lucrativo (margens ~30-40%)
  - SaaS: ROAS > 5x considerando que LTV > ROAS curto-prazo
  - Services/Agency: ROAS < 3x pode ainda ser lucrativo se LTV for alto

#### CPA (Cost Per Acquisition)
- **Fórmula:** Total Spend / Número de conversões (clientes pagantes)
- **Diferença de CPL:** CPL = custo por lead. CPA = custo por cliente (após vendas)
- **CPA aceitável:** CPA < LTV / 3 é o threshold mínimo de sustentabilidade
- **Cálculo:** Se LTV = R$10.000, CPA máximo sustentável = R$3.333
- **Ponto crítico:** CPA pode ser manipulado pela definição de "conversão". Sempre clarificar
  se é lead, oportunidade qualificada, ou cliente pagante.

#### CPL (Cost Per Lead)
- **Fórmula:** Spend / Número de leads gerados
- **Isolado, é INÚTIL.** CPL é útil apenas em contexto de:
  1. SQL/MQL ratio (qualidade dos leads)
  2. Lead-to-customer conversion rate
  3. CAC resultante
- **Exemplo da armadilha:** CPL de R$30 com 5% conversão em cliente = R$600 CAC
  vs CPL de R$80 com 30% conversão = R$267 CAC. O CPL "mais barato" é 2.25x mais caro!
- **Benchmark:** Varia muito por vertical. O que importa é CPL × (1/CVR) = CAC

#### CTR (Click-Through Rate)
- **Fórmula:** Cliques / Impressões × 100
- **Benchmarks:**
  - Search: > 3% é bom (top ads podem ter CTR 8-15%)
  - Display/Banner: 0.1-0.5% é normal
  - Email: 2-5% é bom (open rate e CTR separados)
  - Social (Awareness): 0.5-1% é razoável
- **Ponto crítico:** CTR ALTA com CVR BAIXA = creative enganoso ou mau targeting.
  O usuário clica mas não converte. CTR ótimo pode mascarar problemas de landing page.
- **Armadilha:** Otimizar CTR sem olhar downstream. Uma ad com CTR 10% e CVR 0.1%
  é pior que uma ad com CTR 2% e CVR 2%.

#### CVR (Conversion Rate)
- **Fórmula:** Conversões / Visitantes × 100
- **Benchmarks por tipo:**
  - Landing page B2B lead gen: 2-5% é bom, > 10% é excelente
  - E-commerce: 1-3% é típico, > 5% é bom
  - Free trial SaaS: 5-15% de visitante para trial
  - Freemium-to-paid: 2-5% é típico
- **Ponto crítico:** CVR varia até 10x entre verticais. Nunca use benchmark genérico.
  Calcule seu CVR baseline e melhore a partir dele.

#### Attribution Models — Tipos e Distorções

**Last-Click (Padrão da maioria das plataformas):**
- Atribui 100% do crédito ao último canal antes da conversão
- Superestima: SEM, remarketing, bottom-of-funnel
- Subestima: Social, display, conteúdo, top-of-funnel
- Quando usar: nunca como único modelo. Útil para quick reads de volume.

**First-Click:**
- 100% crédito ao primeiro touchpoint
- Bom para: entender fontes de awareness
- Problema: ignora todo o trabalho de nutrição

**Linear:**
- Crédito igual para todos os touchpoints
- Mais justo, mas ainda simplificado

**Time-Decay:**
- Mais crédito para touchpoints mais próximos da conversão
- Bom para: ciclos de venda curtos

**Data-Driven Attribution (Google, Meta):**
- Usa ML para atribuir crédito baseado em padrões reais
- Mais preciso mas caixa-preta
- Melhor opção com volume suficiente de dados (> 300 conversões/mês)

**Regra prática:** Use Last-Click para operações diárias + Data-Driven para decisões
de budget allocation. Nunca corte canal baseado em Last-Click attribution sozinho.

---

### MÉTRICAS DE VENDAS

#### Win Rate
- **Fórmula:** Deals fechados ganhos / Total de deals saídos do pipeline × 100
- **Benchmark:** 20-30% é típico para B2B; < 15% é alerta
- **Ponto crítico:** Win Rate geral esconde variações críticas por:
  - Tamanho de deal: win rate em enterprise vs SMB
  - Fonte do lead: inbound vs outbound vs referral
  - Vendedor: identificar A players vs underperformers
  - Concorrente: win rate contra cada competidor
- **Armadilha:** Win Rate alta pode significar que o time está sendo seletivo demais
  (fechando fáceis, evitando difíceis). Monitorar junto com pipeline volume.

#### Sales Cycle Length
- **Fórmula:** Dias da data de criação de oportunidade à data de fechamento (ganho ou perdido)
- **Ponto crítico:** Ciclo crescendo = algo está errado. Causas comuns:
  - Stakeholders adicionais no processo de decisão
  - Preço mais alto que mercado considera razoável sem evidência de ROI
  - Falta de urgência na proposta de valor
  - Processo de onboarding/integração percebido como complexo
- **Ação:** Quando ciclo cresce > 20%, entrevistar prospects que demoraram mais.

#### Pipeline Velocity
- **Fórmula:** (Número de oportunidades × Win Rate × Deal Size) / Ciclo em dias
- **O que mede:** Velocidade de geração de receita
- **Como usar:** Calcule velocidade mensal e rastreie tendência. Queda = alerta.
- **Diagnóstico:** Uma queda em velocidade pode ser causada por:
  - Menos oportunidades (problema de geração de leads)
  - Win rate menor (problema de processo ou proposta de valor)
  - Deal size menor (problema de positioning ou targeting)
  - Ciclo mais longo (problema de processo de vendas)
  Isole qual componente está deteriorando.

#### SQL/MQL Ratio
- **Fórmula:** SQLs / MQLs × 100
- **O que mede:** Alinhamento entre marketing e vendas na definição de lead qualificado
- **Benchmark:** 20-40% é típico; < 15% = problema de ICP ou critérios de MQL
- **Ponto crítico:** SQL/MQL baixo pode ter duas causas raiz opostas:
  1. Marketing qualificando mal (MQL criteria muito frouxo)
  2. Vendas rejeitando sem critério (não querendo trabalhar leads difíceis)
  Entrevistar ambos os times antes de concluir.

---

### MÉTRICAS DE PRODUTO

#### Activation Rate
- **Definição:** % de usuários que atingiram o "aha moment" (valor percebido pela primeira vez)
- **Como definir ativação:** Identifique o comportamento que correlaciona com retenção de longo prazo
  - Exemplo Dropbox: Colocar pelo menos 1 arquivo na pasta Dropbox
  - Exemplo Slack: Enviar 2000 mensagens no time
  - Exemplo SaaS médico: Realizar 3 atendimentos via plataforma nos primeiros 7 dias
- **Ponto crítico:** Definir ativação errada distorce toda a análise de funil.
  A ativação deve PREVER retenção — valide correlacionando com D30 retention.
- **Benchmark:** > 40-50% é bom; < 20% = onboarding com problema crítico

#### Retention Curves
- **D1, D7, D30, D90:** Percentagem de usuários que retornam em cada dia
- **Curvas saudáveis:** Flatline acima de zero após D30 = product-market fit
  Curva que converge para zero = sem product-market fit
- **Benchmark por tipo de app:**
  - Apps de utilidade diária: D30 > 40% é bom
  - Apps de uso semanal: D30 > 25% é OK
  - Apps transacionais (e-commerce): D30 < 15% é normal
- **Análise de cohort:** Comparar curvas de retenção por cohort de aquisição.
  Melhora nas curvas = produto melhorando. Piora = problema sendo introduzido.

#### NPS (Net Promoter Score)
- **Fórmula:** % Promotores (9-10) - % Detratores (0-6)
- **Benchmarks:**
  - > 70: World class (Apple, Tesla)
  - 50-70: Excelente
  - 30-50: Bom
  - 0-30: Médio, precisa melhorar
  - < 0: Crise — mais detratores que promotores
- **Ponto crítico:** NPS geral esconde segmentações críticas.
  Um NPS de +30 pode esconder clientes enterprise adorando o produto
  e SMBs detestando. Sempre segmente.
- **NPS como leading indicator:** Queda de NPS 6 semanas antes de aumento de churn é comum.
  Use NPS como early warning system.
- **Armadilha:** Low response rate distorce NPS (viés de satisfação extrema).
  Busque > 30% response rate para dados confiáveis.

---

## FRAMEWORKS DE MERCADO E INTELIGÊNCIA DE NEGÓCIO

### TAM / SAM / SOM — Market Sizing

```
TAM (Total Addressable Market): todo o mercado potencial com 100% de market share
SAM (Serviceable Addressable Market): segmento do TAM alcançável com produto/modelo atual
SOM (Serviceable Obtainable Market): porção realista do SAM dado competição e recursos
```

**Método Bottom-Up (mais credível para investors):**
```
TAM = Total de potenciais clientes × ACV médio
SAM = Subsegmento acessível × ACV médio
SOM = SAM × % realista de market share em X anos
```

**Red flags para investidores:**
- "Capturaremos 10% do mercado no ano 1" = zero credibilidade
- Taxas realistas de penetração inicial: 0.5-2% do SAM
- Progressão típica: 0.5% → 2% → 5% → 10% ao longo de 5 anos

---

### AARRR — Pirate Metrics (Dave McClure, 2007)

Framework que mapeia todo o funil de crescimento:

```
ACQUISITION → ACTIVATION → RETENTION → REFERRAL → REVENUE
(como chegam)  (primeiro    (voltam?)   (indicam?)  (pagam?)
               valor)
```

**KPIs por etapa:**
- **Acquisition:** CAC por canal, CPL, CTR, volume por source
- **Activation:** Taxa de completar onboarding, Time-to-Value, % que usou feature core na primeira semana
- **Retention:** DAU/MAU, D7/D30 retention, sessões/usuário/semana
- **Referral:** NPS, viral coefficient (k-factor), % de novos usuários via indicação
- **Revenue:** CVR free-to-paid, ARPU, LTV, Expansion Revenue

**Insight crítico de McClure:** Times jovens focam em Acquisition e ignoram Activation/Retention. É o erro mais caro. Melhorar Retention de 20% para 30% tem ROI muito maior que dobrar Acquisition.

---

### BALANCED SCORECARD (Kaplan & Norton)

**Origem:** Harvard Business Review, 1992. Premissa: medir apenas financeiro é incompleto.

**As 4 Perspectivas:**

| Perspectiva | Foco | Pergunta central |
|-------------|------|-----------------|
| **Financeira** | Resultados (lagging) | "Como aparecemos para os acionistas?" |
| **Clientes** | Proposta de valor | "Como somos vistos pelos clientes?" |
| **Processos Internos** | Operação de excelência | "Em quais processos precisamos ser excelentes?" |
| **Aprendizado/Crescimento** | Capacidade futura | "Como mantemos nossa capacidade de mudar?" |

**Strategy Map (evolução do BSC):** diagrama de causa-e-efeito conectando objetivos das 4 perspectivas. Capacitar pessoas → melhorar processo → entregar mais valor → gerar mais receita.

**Cascading em 3 camadas:**
- Tier 1: Scorecard organizacional (C-suite)
- Tier 2: Scorecards por departamento
- Tier 3: Scorecards individuais/times

---

### TIPOS DE DASHBOARD — QUANDO USAR CADA UM

| Tipo | Usuário | Cadência | Foco |
|------|---------|----------|------|
| **Estratégico** | C-suite, board | Mensal/trimestral | KPIs de alto nível, OKRs, tendências |
| **Tático** | Gerentes de área | Semanal | Progresso de metas departamentais |
| **Operacional** | Times, analistas | Diário/tempo real | Operação do dia a dia, alertas |
| **Analítico** | Analistas de dados | Ad hoc | Exploração, root cause, hipóteses |

**Anti-pattern frequente:** Usar dashboard operacional (tempo real, muitos dados) para executivos que precisam de estratégico (tendências, contexto). Resultado: paralisia por detalhe ou decisões baseadas em ruído.

---

### ÁRVORE DE MÉTRICAS / KPI TREE

**Estrutura:**
```
NORTH STAR METRIC (1)
├── Driver 1: ex: novos usuários
│    ├── Metric A: novos cadastros
│    ├── Metric B: ativação de cadastros
│    └── Counter-metric: custo por cadastro
├── Driver 2: ex: retenção
│    ├── Metric A: retenção D7
│    ├── Metric B: retenção D30
│    └── Counter-metric: pesquisa de satisfação
└── Driver 3: ex: frequência de uso
     ├── Metric A: DAU/MAU ratio
     └── Metric B: sessões/usuário/semana
```

**4 Regras de Construção:**
1. Decomposição matemática ou causal entre níveis
2. Profundidade 3-5 níveis (NSM → Drivers → Métricas operacionais → Alavancas)
3. Ownership em cada nó (sem dono = sem accountability)
4. Counter-metrics para cada input (previne gaming via Goodhart's Law)

---

### GOODHART'S LAW — A Lei que Destrói KPIs

**Definição:** "Quando uma medida se torna um alvo, ela deixa de ser uma boa medida." (Charles Goodhart, 1975)

**Mecanismo:** Quando a métrica carrega consequências, pessoas otimizam a métrica em vez do objetivo subjacente.

**Exemplos reais:**
- Time de suporte incentivado por FCR: fecha tickets sem resolver para aumentar o número
- Time de vendas com meta de pipeline: cria oportunidades fake
- Developer incentivado por linhas de código: escreve código verboso

**Solução — Sistema de Counter-Metrics:**

| KPI Principal | Counter-Metric |
|--------------|---------------|
| FCR (First Contact Resolution) | CSAT pós-resolução |
| Pipeline created | Pipeline-to-Opportunity rate |
| Velocidade de deploy | Taxa de bugs em produção |
| NPS | Churn rate |
| CAC baixo | LTV dos clientes por canal |

Counter-metrics tornam gaming custoso: para melhorar a KPI sem piorar a counter, você precisa genuinamente melhorar o processo.

---

### ANALYTICS MATURITY MODEL

```
Nível 1: DESCRITIVO — "O que aconteceu?"
  → Relatórios básicos, dashboards históricos
  → Maioria das empresas está aqui

Nível 2: DIAGNÓSTICO — "Por que aconteceu?"
  → Root cause analysis, drill-down, segmentação

Nível 3: PREDITIVO — "O que vai acontecer?"
  → Forecasting, machine learning, previsão de churn

Nível 4: PRESCRITIVO — "O que devo fazer?"
  → Recomendações automatizadas, otimização em tempo real
```

**Princípio de Kaushik:** Antes de pedir predição, garanta que o descritivo está correto. "Garbage in, garbage out" — modelo ML em cima de dados sujos prediz errado com 95% de confiança.

---

### LEADING vs LAGGING INDICATORS

| | Leading | Lagging |
|---|---------|---------|
| **O que é** | Prediz o que vai acontecer | Mede o que já aconteceu |
| **Acionabilidade** | Alta (permite intervenção) | Média (confirma resultado) |
| **Precisão** | Menor (estimativa) | Maior (resultado real) |
| **Exemplo** | Número de demos agendadas | Receita fechada no mês |
| **Exemplo 2** | Time-to-value | Churn rate |
| **Exemplo 3** | Feature adoption rate | NPS |

**Regra:** Você precisa de ambos. Leading indicators para agir proativamente. Lagging para confirmar que as ações funcionaram.

---

### STATISTICAL SIGNIFICANCE EM MARKETING

**Por que importa:** Sem rigor estatístico, você toma 10 decisões com 80% de confiança e está errado em 2 delas.

**Conceitos essenciais:**
- **P-value < 0.05:** significativo a 95% de confiança
- **Confidence Interval:** "Lift de 12% (CI 95%: 8-16%)" — range, não apenas ponto
- **Sample size calculado antes de iniciar** (não parar quando parece estar ganhando)

**Erros comuns:**
- **Peeking:** verificar resultados antes do sample size planejado. Infla falsos positivos.
- **Multiple testing:** testar 10 hipóteses sem correção → 5 falsos positivos esperados com 95% de confiança
- **Significância estatística ≠ significância prática:** lift de 0.1% pode ser estatisticamente significativo mas não vale o custo de implementação

**Regra prática:** Para detectar melhoria de 10% em CVR de 2%, você precisa de ~5.000 visitantes por variação. Use calculadoras online (Evan's A/B testing tools, Optimizely calculator).

---

### COMPETITIVE INTELLIGENCE — FRAMEWORKS

**Porter's Five Forces:**
1. Rivalidade entre concorrentes existentes
2. Ameaça de novos entrantes
3. Poder dos fornecedores
4. Poder dos compradores
5. Ameaça de substitutos

Limitação: Responde "quão atraente é a indústria?", não "como vencemos o competidor X?".

**Matriz de Competitive Benchmarking:**
```
Dimensão        Você    Comp A   Comp B
Preço           $99     $79      $149
Feature X       4/5     3/5      5/5
Suporte         4/5     5/5      2/5
NPS             +47     +52      +31
```

**Win/Loss Analysis:** entrevistar deals ganhos E perdidos. Perguntas:
- "O que fez você escolher [nós / concorrente]?"
- "O que tornaria impossível trocar?"
- "O que quase te fez escolher diferente?"

---

## DASHBOARD DESIGN — PRINCÍPIOS STEPHEN FEW

### Os 13 Erros Mais Comuns em Dashboards

1. **Exceder a fronteira de display** — Exigir scroll para ver informação crítica
2. **Fragmentação inadequada** — Dividir o que deveria estar junto
3. **Contexto insuficiente** — Número sem benchmark, target ou tendência
4. **Escolha de media inadequada** — Usar gráfico quando tabela seria melhor e vice-versa
5. **Gráficos de pizza excessivos** — Comparação entre segmentos é impossível com > 4 fatias
6. **Gauges sem propósito** — Usam muito espaço para pouca informação (use bullet chart)
7. **Decorações que distraem** — Backgrounds, bordas, sombras sem função
8. **Codificação de cor inadequada** — Usar cor para decorar em vez de comunicar
9. **Inconsistência de escala** — Comparar números em escalas diferentes sem indicação
10. **Organização inadequada** — Itens sem lógica hierárquica ou sequencial
11. **Métricas de vaidade no lugar de destaque** — O que é bonito vs o que é importante
12. **Ausência de hierarquia visual** — Tudo tem o mesmo peso visual
13. **Dashboard vômito** — Mais de 12-15 KPIs sem estrutura = ninguém usa

### Regras de Escolha de Gráficos

| Relação a mostrar | Tipo de gráfico | Evitar |
|-------------------|-----------------|--------|
| Comparação entre categorias | Bar chart horizontal | Pie chart |
| Tendência temporal | Line chart | Bar (para séries longas) |
| Parte de um todo (2-4 partes) | Pie chart (somente!) | Donut com muitas categorias |
| Correlação entre variáveis | Scatter plot | Line chart |
| Distribuição de valores | Histogram | Bar chart regular |
| Performance vs target | Bullet chart | Gauge/velocímetro |
| Tabela de valores exatos | Table | Gráfico |
| Múltiplas tendências compactas | Sparklines | Gráfico full-size |

### Hierarquia de Dashboard — Layout Stephen Few

```
┌─────────────────────────────────────────────────────┐
│ NORTH STAR METRIC              STATUS GERAL (RAG)   │ ← Linha 1: O que mais importa
│ Receita: R$120k (+12% MoM)     ● Verde              │
├──────────────────────┬──────────────────────────────┤
│ KPI 2 (crítico)      │ KPI 3 (crítico)              │ ← Linha 2: Métricas primárias
│ NRR: 108%            │ CAC Payback: 14 meses        │
├──────────────────────┴──────────────────────────────┤
│ KPI 4      │ KPI 5      │ KPI 6      │ KPI 7        │ ← Linha 3: Métricas secundárias
├────────────┴────────────┴────────────┴──────────────┤
│ TREND CHARTS: principais métricas últimos 12 meses  │ ← Linha 4: Contexto temporal
└─────────────────────────────────────────────────────┘
```

**Princípio:** Top-left = mais importante. Tamanho = importância. Cor saturada = alerta.

---

## DATA STORYTELLING — COLE NUSSBAUMER KNAFLIC

### Framework SCQA (Situation, Complication, Question, Answer)

```
SITUATION: O contexto que a audiência já conhece
  "Nossa base de clientes cresceu 40% nos últimos 6 meses..."

COMPLICATION: O que mudou ou criou tensão
  "...mas nosso NRR caiu de 112% para 94% no mesmo período..."

QUESTION: O que precisamos responder
  "O que está causando essa erosão e como reverter?"

ANSWER: Sua análise e recomendação
  "Análise de cohort mostra que clientes do segmento SMB churn em média no mês 4.
   Correlacionamos com feature adoption: 73% deles nunca completaram o onboarding.
   Recomendação: redesign de onboarding para SMB com checkpoint ativo no mês 2."
```

### Princípios de Comunicação de Dados

**1. Exploratory vs Explanatory:**
- Análise exploratória = para você entender os dados (pode ser bagunçada)
- Análise explanatória = para sua audiência tomar uma decisão (deve ser cristalina)
- Erro comum: mostrar todo o processo exploratório para a audiência

**2. Escolha um gráfico, uma mensagem:**
- Cada visualização deve comunicar UM insight
- Se tem dois insights, use dois gráficos

**3. Anote suas conclusões:**
- Título do gráfico = a conclusão, não a descrição
  - Ruim: "Churn Rate por Mês"
  - Bom: "Churn dobrou após mudança de pricing em novembro"

**4. Use preattentive attributes para guiar atenção:**
- Cor: destaque em vermelho/laranja o que precisa de atenção
- Tamanho: maior = mais importante
- Posição: mais alto/mais à esquerda = mais importante
- Contraste: o que você quer que vejam primeiro deve contrastar com o resto

**5. Narrativa com dados:**
```
1. Contexto (por que estamos falando sobre isso?)
2. Descoberta (o que os dados revelam?)
3. Implicação (o que isso significa para o negócio?)
4. Recomendação (o que devemos fazer?)
5. Próximo passo (quem faz o quê até quando?)
```

---

## KPIs OPERACIONAIS / CUSTOMER EXPERIENCE

### CSAT — Customer Satisfaction Score
```
CSAT = (Respostas satisfeitas / Total de respostas) × 100
Geralmente 1-5 ou 1-10; "satisfeitos" = 4-5 ou 8-10
Benchmark alvo: > 80%
```
Quando medir: após interação específica (suporte, entrega, onboarding). Métrica de curto prazo, pontual.

### CES — Customer Effort Score
```
CES: "Quão fácil foi resolver seu problema?" (1-7)
% que respondeu 5+ = fácil ou muito fácil
```
**Insight crítico:** CES prediz melhor repetição de compra e recomendação do que CSAT em contextos de suporte. Clientes que se esforçaram muito churnam mais, mesmo se ao final ficaram "satisfeitos".

### FCR — First Contact Resolution
```
FCR = (Tickets resolvidos no primeiro contato / Total de tickets) × 100
Benchmark: > 70%
```
FCR tem a correlação mais forte com NPS e CSAT entre todas as métricas de contact center.

### SLA Metrics
```
First Response Time: entre abertura do ticket e primeira resposta humana
Average Resolution Time: tempo total até fechamento

Benchmark SaaS B2B:
- P1/Critical: resposta < 1h, resolução < 4h
- P2/High: resposta < 4h, resolução < 24h
- P3/Normal: resposta < 24h, resolução < 72h
```

---

## MÉTRICAS FINANCEIRAS AVANÇADAS

### GRR vs NRR — A Diferença que Importa

```
GRR (Gross Revenue Retention):
= (MRR início - Contraction MRR - Churned MRR) / MRR início × 100
Máximo 100% — sem expansion

NRR (Net Revenue Retention):
= (MRR início + Expansion MRR - Contraction MRR - Churned MRR) / MRR início × 100
Pode passar 100% — inclui expansion
```

**Análise combinada:**
- NRR 120% + GRR 90% = crescimento forte mas com churn escondido pela expansion. Risco se upsell desacelerar.
- NRR 120% + GRR 95% = crescimento sólido com boa retenção base

### EBITDA — O que Revela e Esconde

**O que revela:** eficiência operacional central, eliminando ruídos de estrutura de capital (juros), tributação e decisões contábeis (depreciação/amortização). Capital structure neutral — permite comparação entre empresas.

**O que esconde (limitações críticas):**
- Ignora necessidade de capital (capex pode ser enorme)
- Empresas com muito ativo fixo podem ter EBITDA alto mas caixa negativo
- "EBITDA ajustado" pode excluir custos legítimos e inflacionar artificialmente
- Sempre perguntar: "o que está sendo excluído do ajuste?"

**Benchmark por setor:**
- SaaS maduro: 15-25%
- SaaS em hipercrescimento: negativo (aceitável)
- Varejo: 5-10%
- Manufatura: 10-20%

### Rule of 40 — Contexto 2025

```
Rule of 40 = ARR Growth % + EBITDA Margin %
Resultado ≥ 40 = saudável
```

Com ambiente de juros altos (2024-2025), mercado passou a preferir empresas que chegam ao 40 via margem, não apenas via crescimento explosivo. Empresas com crescimento moderado + margem positiva são mais valorizadas no ambiente macro atual.

### Burn Multiple (SaaS)

```
Burn Multiple = Net Burn / Net New ARR

< 1x: Excellent
1-1.5x: Good
1.5-2x: Needs improvement
> 2x: Inefficient

Benchmark por estágio:
Early-stage típico: ~3.4x
$25-50M ARR: ~1.4x
```

---

## BENCHMARKS 2025 ATUALIZADOS

### SaaS B2B (referência 2025)

| Métrica | Emergência | Aceitável | Bom | Excelente |
|---------|-----------|-----------|-----|-----------|
| Churn anual | > 20% | 10-20% | 5-10% | < 5% |
| NRR | < 90% | 90-100% | 100-110% | > 120% |
| LTV:CAC | < 1:1 | 1-3:1 | 3-5:1 | > 5:1 |
| CAC Payback | > 24m | 18-24m | 12-18m | < 12m |
| Gross Margin | < 50% | 50-65% | 65-75% | > 75% |
| Rule of 40 | < 20 | 20-40 | 40-60 | > 60 |
| ARR Growth (early) | < 5% MoM | 5-10% | 10-20% | > 20% |

**Dados adicionais 2025:**
- Mediana NRR mercado: ~102% (comprimido de 114% público)
- SMB churn é 8.2x maior que Enterprise
- Empresas com NRR ≥ 100% crescem 2x mais rápido que abaixo de 100%
- Expansion revenue = 40% do novo ARR em empresas $15-30M ARR
- CAC payback cresceu: early-stage ~12m → $50-100M ARR → ~21m

---

## ANÁLISE DE FUNIL

### Estrutura Básica de Funil

```
Topo (Awareness): Impressões → Cliques → Visitantes
  Taxa crítica: CTR e custo por visitante

Meio (Consideration): Visitantes → Leads → MQL
  Taxa crítica: CVR de landing page, custo por lead

Baixo (Decision): MQL → SQL → Oportunidades → Deals → Clientes
  Taxa crítica: SQL/MQL ratio, Win Rate, Sales cycle

Retenção: Clientes → Ativos → Expansão
  Taxa crítica: Activation Rate, D30 Retention, NPS, NRR
```

### Diagnóstico de Funil — Onde Está o Problema?

**Sintoma: Alto custo de aquisição (CAC alto)**
- Causa provável no funil: início (CPL alto) ou fim (Win Rate baixo)
- Diagnóstico: Calcule custo em cada etapa. Onde o custo unitário dispara?

**Sintoma: Volume de leads alto mas vendas baixas**
- Causa provável: MQL desqualificados ou SQL/MQL ratio baixo
- Diagnóstico: Entrevistar vendas sobre qualidade de leads. Revisar critérios de MQL.

**Sintoma: Win Rate caindo**
- Causas prováveis: ICP errado, proposta de valor fraca, novo concorrente, pricing
- Diagnóstico: Análise de deals perdidos — por que perdemos? Para quem?

**Sintoma: Churn alto após aquisição**
- Causa provável: Expectativas não alinhadas na venda OU produto não entrega valor
- Diagnóstico: Entrevistar clientes que churnaram nos primeiros 60 dias

---

## ÁRVORE DE DECISÃO — QUAL GRÁFICO USAR

```
Que comparação você está fazendo?
│
├── COMPARAÇÃO ENTRE CATEGORIAS
│    ├── Poucas categorias (≤7) → Gráfico de barras horizontais
│    ├── Muitas categorias → Treemap ou barras com filtro
│    └── Mudança ao longo do tempo por categoria → Slope chart
│
├── TENDÊNCIA AO LONGO DO TEMPO
│    ├── 1-2 séries → Gráfico de linha
│    ├── Múltiplas séries → Linha com small multiples (não sobreposição)
│    └── Mudança de composição no tempo → Barras 100% empilhadas
│
├── RELAÇÃO ENTRE VARIÁVEIS
│    ├── 2 variáveis numéricas → Scatter plot
│    └── 3 variáveis → Scatter com tamanho de bolha (bubble chart)
│
├── DISTRIBUIÇÃO
│    ├── 1 variável → Histograma
│    └── Comparar distribuições → Box plot
│
└── PARTE-TODO
     ├── ≤5 categorias com contraste claro → Pie chart (único caso)
     ├── Hierarquia → Treemap ou sunburst
     └── Performance vs target → Bullet chart (Few)
```

**Layout F-Pattern:** Eye-tracking mostra leitura em F.
- KPI primária: topo-esquerdo, maior fonte, maior contraste
- KPIs secundárias: topo-direito
- Contexto e drill-down: área central e inferior

**Sistema de cores semântico:**
```
Positivo/OK:       Verde (#2E7D32)
Negativo/Alerta:   Vermelho (#C62828)
Neutro:            Cinza (#616161)
Destaque/Ação:     Azul (#1565C0)
Aviso/Atenção:     Laranja (#EF6C00)
```

**Regras de cores:**
- Máximo 3-4 cores distintas por visualização
- Uma cor de destaque por gráfico
- Garantir acessibilidade: não depender só de vermelho/verde (10% tem daltonismo)

---

## ANÁLISE DE COHORT

### O que é uma Análise de Cohort?

Agrupa usuários/clientes que iniciaram em um mesmo período e rastreia seu comportamento
ao longo do tempo. Revela padrões que médias escondem.

### Tipos de Cohort

**Cohort de aquisição por tempo:**
```
Cohort Jan/2025: clientes adquiridos em jan
Cohort Fev/2025: clientes adquiridos em fev
...
Meses após aquisição: M1, M2, M3... M12
```

**Tabela de cohort (retention):**
```
       M0    M1    M2    M3    M6    M12
Jan    100%  72%   65%   61%   52%   45%
Fev    100%  68%   59%   54%   48%   41%
Mar    100%  75%   68%   65%   58%   52%
```

Se o cohort de Mar retém melhor que Jan: algo melhorou. Identificar o quê.
Se o cohort de Fev piorou: algo regrediu em fev. Investigar mudanças daquele mês.

### Cohort de LTV

Calcular LTV por cohort revela quais canais de aquisição trazem clientes mais valiosos:
```
Canal    | CAC  | LTV M12 | LTV/CAC | Payback
---------|------|---------|---------|--------
Google   | R$800| R$2.400 | 3x      | 4 meses
Meta     | R$600| R$1.500 | 2.5x    | 5 meses
Referral | R$200| R$3.200 | 16x     | 0.7 mês
```

Referral tem LTV/CAC 5x melhor que Meta — mesmo com volume menor, priorizar.

---

## ATTRIBUTION MODELING — GUIA COMPLETO

### Os 6 Modelos + Quando Usar

| Modelo | Crédito | Melhor uso |
|--------|---------|------------|
| **First Touch** | 100% ao primeiro canal | Avaliar canais de awareness |
| **Last Touch** | 100% ao último canal | Quick read de volume (nunca como único modelo) |
| **Linear** | Igual a todos os touchpoints | Visão conservadora de contribuição |
| **Time Decay** | Mais crédito próximo à conversão | Ciclos curtos (< 7 dias) |
| **U-shaped (Position-based)** | 40% primeiro, 40% último, 20% meio | Ciclo médio B2B (30-90 dias) |
| **W-shaped** | 30% primeiro, 30% lead creation, 30% oportunidade | Ciclo longo enterprise |
| **Data-Driven** | ML distribui com base em padrões reais | Quando tem 10k+ conversões |

**Problema sistêmico:** 95% das empresas usam Last Touch porque é o padrão do GA. Last Touch sobrevaloriza canais de fundo de funil (branded search, remarketing) e subvaloriza canais de topo (content, awareness, PR).

**Pré-requisito para data-driven:** mínimo 10.000 conversões no período.

**Limitação universal:** Attribution online só vê touchpoints digitais rastreados. Conversas com vendedores, eventos, indicações — invisíveis para ferramentas de attribution. Complementar com deal source tracking no CRM.

---

## BENCHMARKS POR VERTICAL

### SaaS B2B (referência 2024-2025)

| Métrica | Bom | Excelente | Emergência |
|---------|-----|-----------|------------|
| Annual Churn | < 10% | < 5% | > 20% |
| NRR | > 105% | > 120% | < 90% |
| LTV:CAC | > 3:1 | > 5:1 | < 1:1 |
| CAC Payback | < 18m | < 12m | > 24m |
| MRR Growth (early) | > 10% | > 20% | < 5% |
| Gross Margin | > 65% | > 75% | < 50% |
| Rule of 40 | > 40 | > 60 | < 20 |

### Marketing Digital (referência B2B 2024)

| Métrica | Bom | Contexto |
|---------|-----|---------|
| Email Open Rate | > 25% | Varia muito por lista e vertical |
| Email CTR | > 3% | Calculado sobre abertos |
| Landing Page CVR | > 5% | Para lead gen B2B de alta intenção |
| CAC Payback | < 12 meses | Para campanhas de performance |
| ROAS Real | > 3x | Considerando margem ~40% |

### Agência de Marketing (referência serviços recorrentes)

| Métrica | Bom | Alerta |
|---------|-----|--------|
| Client Retention | > 80% anual | < 60% anual |
| Revenue per Client | Crescendo YoY | Estagnado/caindo |
| NPS | > 40 | < 10 |
| ARPU Growth | > 10% YoY | 0% ou negativo |

---

## CHECKLIST DE QUALIDADE — ANTES DE ENTREGAR QUALQUER ANÁLISE

### Antes de Criar Qualquer Dashboard
- [ ] Quem é a audiência principal?
- [ ] Qual decisão esse dashboard precisa suportar?
- [ ] Com que frequência vai ser consultado?
- [ ] Quais métricas têm owners definidos?
- [ ] Há targets definidos para cada métrica?
- [ ] Há alertas (quando acionar)?
- [ ] Cabe em uma tela sem scroll?

### Antes de Definir Qualquer KPI
- [ ] Ligada a um objetivo de negócio?
- [ ] Tem fórmula precisa e sem ambiguidade?
- [ ] Tem target e data-alvo?
- [ ] Tem owner?
- [ ] Tem counter-metric?
- [ ] Dados existem com qualidade e frequência adequada?
- [ ] Quando a KPI mudar, a organização sabe o que fazer?

### Os 10 Mandamentos do Dashboard
1. Um dashboard, uma audiência, um propósito
2. Se não cabe em uma tela sem scroll, é relatório (tratar como relatório)
3. O título é uma conclusão, não um label
4. Toda métrica tem target e alerta
5. Máximo 7 ± 2 métricas no nível primário (Miller's Law)
6. Vermelho = alerta, verde = ok — usar consistentemente, nunca decorativo
7. A hierarquia visual conta a história antes do usuário ler
8. Contexto temporal obrigatório (período + comparativo)
9. Elimine o que não gera decisão
10. Teste com usuários reais

---

## VANITY METRICS — GUIA DE IDENTIFICAÇÃO

### Métricas de Vaidade Comuns e Por Que São Enganosas

**Impressões:**
- Por que parece boa: números grandes impressionam
- Por que é vaidade: não diferencia entre ver e notar
- O que usar em vez: impressions × estimated attention → rough awareness
- Quando É útil: para entender share of voice relativo ao concorrente

**Seguidores / Followers:**
- Por que parece boa: número crescente sinaliza "crescimento"
- Por que é vaidade: seguidor inativo = zero valor de negócio
- O que usar em vez: Engagement rate × % seguidores ativos × conversão de social para receita
- Quando É útil: benchmark de presença relativa vs concorrentes

**Pageviews:**
- Por que parece boa: mais pageviews = mais visibilidade
- Por que é vaidade: um usuário com 20 pageviews pode valer menos que um com 3 que converteu
- O que usar em vez: Pages per session com contexto, % de páginas que levam à conversão
- Quando É útil: identificar conteúdo com alto engajamento para replicar

**Taxa de abertura de email (open rate):**
- Por que parece boa: alta abertura sinaliza conteúdo relevante
- Por que é vaidade parcial: Apple Mail Privacy Protection inflaciona open rates desde iOS 15
- O que usar em vez: CTR (click-through rate), conversões do email, revenue per email
- Ainda útil para: comparar listas, segmentos, tipos de subject line

### Teste de Vaidade vs Outcome

Para qualquer métrica, faça 3 perguntas:
1. Se esse número aumentar 50%, que decisão de negócio mudaria?
2. Esse número se conecta a receita, retenção ou satisfação do cliente?
3. Um executivo de negócios colocaria isso no relatório para investidores?

Se a resposta é "não" para 2 das 3, é métricia de vaidade.

---

## ALERTAS CRÍTICOS — QUANDO PARAR TUDO

### Emergências que Exigem Ação Imediata (Escalar para C-Level)

1. **NRR < 90% por 2 meses consecutivos**
   - Ação: Parar metas de aquisição. Focar 100% em retenção.
   - Diagnose: Cohort de churn + entrevistas com clientes saídos

2. **LTV:CAC < 1:1**
   - Ação: Pausar canais de aquisição até entender onde valor está sendo destruído
   - Diagnose: Recalcular CAC real (incluindo salários e overhead)

3. **Win Rate caindo > 30% em 2 trimestres**
   - Ação: Deep dive em deals perdidos. Entrevistar 10 prospects que não fecharam
   - Diagnose: Mudança competitiva? Pricing? ICP errado? Processo de vendas?

4. **Churn mensal > 5% por 3 meses**
   - Ação: Customer success liga para TODOS os clientes. Não esperar churn acontecer.
   - Diagnose: Análise de cohort + feature adoption dos clientes que churnaram

5. **NPS < 0 em pesquisa com > 50 respostas**
   - Ação: Reunião de emergência de produto + CS
   - Diagnose: Qual segmento está sendo detrator? Quais os temas dominantes das respostas abertas?

6. **CAC Payback > 24 meses**
   - Ação: Revisar modelo de negócio. Você está financiando clientes sem retorno adequado.
   - Diagnose: Revisar pricing. Verificar se produto está entregando valor prometido.

---

## REFERÊNCIAS ESSENCIAIS

### Livros Fundamentais
- **Edward Tufte:** The Visual Display of Quantitative Information (1983) — o fundador
- **Alberto Cairo:** The Truthful Art (2016), How Charts Lie (2019)
- **Avinash Kaushik:** Web Analytics 2.0 (O'Reilly, 2009)
- **Stephen Few:** Information Dashboard Design (2006; 2nd ed. 2013), Show Me the Numbers (2004)
- **Cole Nussbaumer Knaflic:** Storytelling with Data (Wiley, 2015)
- **Bernard Marr:** Key Performance Indicators (FT Publishing, 2012, 2nd ed. 2019)
- **David Skok:** SaaS Metrics 2.0 (ForEntrepreneurs.com — gratuito e fundamental)

### Blogs e Recursos Online
- [kaushik.net/avinash](https://www.kaushik.net/avinash) — Occam's Razor
- [perceptualedge.com](https://www.perceptualedge.com) — Stephen Few
- [storytellingwithdata.com](https://www.storytellingwithdata.com) — Cole Knaflic
- [forEntrepreneurs.com](https://forEntrepreneurs.com) — David Skok (SaaS metrics)
- [baremetrics.com/blog](https://baremetrics.com/blog) — Benchmarks SaaS reais
- [thesaascfo.com](https://www.thesaascfo.com) — Ben Murray (SaaS CFO)
- [bernardmarr.com/kpi-library](https://bernardmarr.com/kpi-library) — KPI Library
- [data-to-viz.com](https://www.data-to-viz.com) — Decisão de tipo de gráfico
- [amplitude.com/blog/product-north-star-metric](https://amplitude.com/blog/product-north-star-metric) — NSM Framework
- [madetomeasurekpis.com/building-kpi-tree](https://madetomeasurekpis.com/building-kpi-tree) — KPI Tree Guide
- [balancedscorecard.org](https://balancedscorecard.org) — BSC Institute
- [kpitree.co/guides/frameworks/goodharts-law](https://kpitree.co/guides/frameworks/goodharts-law) — Goodhart's Law

---

*Última atualização: 2026-04-09 | Versão: 2.0*
*Pesquisa densa adicionada: Cairo, Tufte, Goodhart's Law, AARRR, Balanced Scorecard, BSC, Analytics Maturity, Attribution completo, benchmarks 2025, KPI trees, statistical significance, TAM/SAM/SOM*
