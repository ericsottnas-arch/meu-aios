# Playbook de Prospecção Ativa Instagram v2.1

> **Fonte de verdade** para prospecção manual ativa no Instagram.
> Substitui: `2026-03-11_Script-Prospeccao-Ativa-Instagram.docx`
> Atualizado: 2026-03-16 — Reescrito com dados reais (81 conversas analisadas via Instagram Graph API)
> Referência de dados: `memory/prospeccao-conversas-reais.md`

---

## Visao Geral

Prospecção ativa = Eric vai atrás de profissionais de estética/saúde no Instagram, aquece o relacionamento por 5 dias, e inicia conversa de negócio via DM.

**Diferencial v2.1:** Playbook reconstruído a partir de dados reais — 81 conversas de DM analisadas, 17 engajadas, 4 respondidas, ~60 sem resposta. Cada script, regra e fluxo foi validado contra o que funcionou e o que matou leads na prática.

**Nicho alvo:** Profissionais de harmonização orofacial, estética e saúde (dentistas, dermatologistas, fisioterapeutas, esteticistas).

**Posicionamento:** Assessoria de marketing especializada em estética — campanha estruturada por procedimento + follow-up automático por WhatsApp.

---

## 1. Qualificação do Prospect

### Critérios de qualificação

Antes de iniciar qualquer interação, verificar:

- [ ] Posta conteúdo de procedimentos (antes/depois, técnicas, resultados)
- [ ] Tem entre 1k e 50k seguidores
- [ ] Link na bio para agendamento ou Linktree
- [ ] Engajamento baixo relativo ao tamanho (sinal de tráfego pago)
- [ ] Postou nos últimos 7 dias
- [ ] Mencionou campanha, tráfego ou anúncio em stories/destaques
- [ ] Tem post patrocinado visível

**Mínimo 3 critérios** para considerar qualificado.

### Ação no GHL

Ao qualificar → criar oportunidade no pipeline "Prospecção Ativa" no estágio **"Qualificado"**.

---

## 2. Pré-Aquecimento (5 dias estruturado)

### Princípio

O pré-aquecimento cria familiaridade antes da abordagem real. O prospect começa a reconhecer seu perfil. Quando a DM de abertura chegar, não é um estranho — é alguém que já interagiu.

### Fluxo dia a dia

#### DIA 1: Curtidas em Rajada + DM Leve (TOQUE INICIAL)

**Ações:**
1. Curtir 6-8 posts de uma vez (rajada — ela recebe várias notificações juntas e nota seu perfil)
2. **Enviar DM leve** — reação a story ou mensagem ultra-curta

**Scripts de DM leve (Dia 1):**

| Contexto | DM |
|----------|----|
| Story de procedimento / resultado | `🔥` |
| Story de antes/depois | `impressionante 👏` |
| Story de técnica / explicação | `que resultado!` |
| Story casual (clínica, dia a dia) | emoji relevante (☕, 💪, etc.) |
| Reels de procedimento | `🔥` ou `👏` |

**REGRAS da DM leve:**
- Máximo 3 palavras ou 1 emoji
- NÃO é conversa — é toque
- NÃO faz pergunta
- NÃO se apresenta
- Objetivo: GHL cria contato + prospect vê seu perfil

**No GHL:** Webhook de DM enviada cria contato automaticamente → Oportunidade em **"Aquecendo"**.

#### DIA 2-3: Mais Curtidas (Espaçadas)

**Ações:**
1. Curtir 2-3 posts por dia (diferentes dos anteriores)
2. Assistir stories (ela vê que você assistiu)
3. NÃO enviar mensagem

**Objetivo:** Reforçar presença. Ela já viu sua DM leve, agora vê suas curtidas recorrentes.

#### DIA 3-4: Comentário Técnico (Credibilidade)

**Ações:**
1. Comentar 1 post com observação TÉCNICA sobre o procedimento
2. O comentário deve mostrar que você entende o nicho

**Scripts de comentário técnico (por procedimento):**

Usar os scripts de `PROCEDURES[].comments` do `prospecting-scripts.js`.

**REGRAS do comentário:**
- Sobre o PROCEDIMENTO, não sobre ela
- Demonstra conhecimento técnico
- Pode fazer pergunta profissional
- NÃO menciona marketing, assessoria ou seu trabalho
- Tom: colega de área, não vendedor

#### DIA 4-5: Resposta a Story (Interação Direta)

**Ações:**
1. Responder a um story com pergunta específica sobre o conteúdo
2. Tom: curiosidade genuína, não invasiva

**Scripts de resposta a story (por procedimento):**

Usar os scripts de `PROCEDURES[].stories` do `prospecting-scripts.js`.

**REGRAS:**
- Pergunta sobre o trabalho DELA
- Mostra interesse genuíno
- Se ela responder → anotar resposta
- Se não responder → continuar para Dia 5+

#### DIA 5+: Abertura Real (DM de Negócio)

**Pré-requisito:** Pelo menos 2 interações nos dias anteriores.

**Ação:** Enviar DM de abertura usando scripts da Seção 4.

**No GHL:** Mover oportunidade para **"DM Enviada"**.

---

## 3. Resumo Visual do Funil

```
QUALIFICAÇÃO → Pesquisar + Validar critérios
     ↓
DIA 1: Curtir 6-8 posts (rajada) + DM LEVE (emoji/reação)
       → GHL cria contato → "Aquecendo"
     ↓
DIA 2-3: Curtir mais posts (espaçados)
     ↓
DIA 3-4: Comentar 1 post com observação TÉCNICA
     ↓
DIA 4-5: Responder story com pergunta específica
     ↓
DIA 5+: DM DE ABERTURA REAL (scripts seção 4)
        → Mover para "DM Enviada"
     ↓
RESPOSTA → "Em Conversa" → Aquecimento (seção 5)
     ↓
OFERTA DE VALOR → Dar algo grátis antes de pedir (seção 6)
     ↓
TRANSIÇÃO ORGÂNICA → Esperar ELA mencionar dor (seção 7)
     ↓
PITCH → Apresentação da assessoria (seção 8)
     ↓
AGENDAMENTO → Call 20min (seção 9)
     ↓
FOLLOW-UP → Se sumiu (seção 10)
     ↓
OBJEÇÕES → Respostas prontas (seção 11)
```

---

## 4. Abertura — Primeira DM Real (Dia 5+)

### SCRIPT PADRÃO (75% de taxa de resposta — VALIDADO)

```
Que resultado incrível no último antes e depois que você postou! Pode falar quanto tempo leva no total? Sempre fico curioso com o tempo de procedimento.
```

**Por que funciona:** Elogio ESPECÍFICO ao conteúdo + pergunta TÉCNICA sobre o trabalho. Parece curiosidade genuína de alguém do nicho, não de vendedor.

**Variações validadas (usar conforme contexto):**

```
Que resultado top! Você vende protocolos isolados ou completos?
```

```
Vi seu último antes e depois de [procedimento]. Ficou muito natural. Quantas sessões foram?
```

```
Resultado consistente nos seus posts. Quanto tempo de atuação com [procedimento]?
```

### SCRIPTS SITUACIONAIS (quando o padrão não se aplica)

#### A — Roda campanha (ads visíveis)

```
Vi que você já roda campanha. Tá conseguindo escalar ou o custo por resultado não tá compensando?
```

#### B — Link na bio sem automação

```
Você tem bom volume de conteúdo. O que acontece com quem clica no link da bio e não agenda? Tem algum follow-up?
```

#### C — Perfil forte, engajamento baixo

```
Fui no seu perfil depois de ver seu Reel sobre [procedimento específico]. Você posta consistente, mas o engajamento não tá na proporção do que o conteúdo merece. Sabe o que tá travando?
```

### SCRIPTS MORTOS — NUNCA USAR

> **DADOS REAIS:** 0% de taxa de resposta em 4+ envios cada

```
❌ "Oii, Dra!!! Tudo bem? Comecei a te seguir agora, me surpreendi com esses resultados 👏👏"
```
- **Por que falha:** Parece follow/unfollow bot. Genérico. Não faz pergunta específica.
- **NUNCA usar "comecei a te seguir agora"** — é a frase que mais mata abertura.

```
❌ "Oi! Vi seu perfil e gostei muito do seu trabalho!"
```
- **Por que falha:** Elogio genérico sem pergunta = não gera resposta.

```
❌ Qualquer abertura que não faça pergunta específica
```
- **Regra:** Sem pergunta = sem resposta. Sempre terminar com pergunta TÉCNICA.

---

## 5. Aquecimento — Após Resposta Dela

### Princípio (VALIDADO COM DADOS REAIS)

O objetivo é fazer ELA falar sobre o que é importante PRA ELA. Não sobre marketing. Perguntas sobre o trabalho, rotina, início de carreira — coisas que ela tem orgulho de contar.

### Regra dos 2 (CRÍTICA)

**Máximo 2 perguntas seguidas. Se ela respondeu 2 perguntas sem perguntar nada de volta, PARAR de perguntar e mudar pra validação/elogio.**

> **Caso real (Ester Guedes):** Eric fez 3 perguntas seguidas → ela detectou venda → cortou: "percebi que essa conversa se trata de venda do seu trabalho e não da procura do meu"
>
> **Caso real (Larissa Gonçalves):** Eric fez perguntas sobre demanda, concorrência, estrutura → ela perguntou "O intuito das perguntas é o que?!" → lead perdido

### Resposta CURTA (emoji, "obrigada", 1 frase)

**Se for "obrigada" seco → VER SEÇÃO 5.1 (Protocolo Obrigada Seco)**

**Se for resposta curta mas positiva:**
```
Quanto tempo você atua com [procedimento]? Foi fácil pegar clientela desde o início ou demorou?
```

### Resposta LONGA (ela contou algo sobre o trabalho)

**Validar + conectar com valor (NÃO fazer outra pergunta imediata):**
```
Faz sentido! Dá pra ver que você é cuidadosa com [aspecto que ela mencionou]. Isso faz diferença.
```

**Depois de validar, se ela continuar respondendo:**
```
E essa demanda veio mais por boca a boca ou pelas redes?
```

### Ela perguntou o que você faz

```
Trabalho com assessoria de marketing só pra estética e saúde. Ajudo a estruturar campanha por procedimento com follow-up automático.

Mas tô mais curioso sobre o seu trabalho — qual é o procedimento que mais sai na sua clínica?
```

### Truque do Autêntico (VALIDADO)

> **Caso real (Tammy Torres):** Eric disse "Que resultado top, pqp 👏 / desculpa o palavrão" → ela respondeu "😂😂😂😂 / ♥️♥️"

Ser genuíno e espontâneo funciona. Não precisa ser formal. "pqp" + "desculpa" = reação genuína.

### 5.1 Protocolo "Obrigada Seco" (NOVO — baseado em dados reais)

> **Caso real (Andreia Olegário):** Respondeu "Obrigada 🙏🏻" duas vezes. Eric insistiu com mais mensagens → conversa morreu.

**REGRA: "Obrigada 🙏" = sinal de encerramento. NÃO insistir.**

**O que fazer:**

1. **Responder leve:** "Sucesso, Dra! 🙌" (1 mensagem, sem pergunta)
2. **Esperar 5-7 dias** — sem nenhuma interação
3. **Retomar por outro ângulo:**
   - Reagir a um story diferente (procedimento novo, resultado diferente)
   - Usar DM leve novamente (emoji, máx 3 palavras)
   - NÃO retomar o assunto anterior
4. **Se repetir "obrigada seco" na segunda tentativa → classificar como Sem Interesse**
   - Mover para "Sem Resposta" no GHL
   - Revisitar só daqui 30+ dias

**O que NÃO fazer:**
- ❌ Enviar mais perguntas
- ❌ "Dra, tudo bem? Tá por aí?" (soa ansioso)
- ❌ Mais de 3 mensagens sem resposta significativa (soa desesperado)

---

## 6. Oferta de Valor — Dar Antes de Pedir (NOVO)

### Princípio

Antes de fazer qualquer transição para negócio, oferecer algo de VALOR REAL gratuitamente. Isso inverte a dinâmica: em vez de Eric pedir algo (atenção, call, tempo), ele dá algo.

> **Caso real (Erica Mello):** Eric disse "Gostei tanto da sua didática que quero fazer uma edição pra você, sem custo nenhum. Me manda esse vídeo completo." — abordagem diferenciada que gera reciprocidade.

### Scripts de Oferta de Valor

#### OV1 — Edição de vídeo grátis
```
Gostei muito da sua didática nesse último vídeo. Quero te fazer uma proposta: posso fazer uma edição profissional dele pra você, sem custo. Me manda o vídeo original?
```

#### OV2 — Análise de perfil
```
Tava vendo seu perfil com olho profissional e vi uns pontos que dariam pra otimizar fácil. Posso te mandar uma análise rápida? Sem compromisso, é genuíno.
```

#### OV3 — Feedback criativo
```
Vi seus últimos criativos e tenho umas sugestões que podem melhorar bastante a performance. Posso te mandar um feedback rápido?
```

#### OV4 — Dica específica sobre o nicho
```
Vi que você tá postando [tipo de conteúdo]. Tenho visto [insight técnico sobre o que funciona no nicho]. Quer que eu te mande uns exemplos do que tá convertendo bem pra [procedimento]?
```

### REGRAS da Oferta de Valor

- Oferecer algo que você REALMENTE pode entregar
- Não condicionar a oferta a nada (sem "faço isso se...")
- Se ela aceitar → entregar com qualidade → depois a transição é natural
- Se ela não aceitar → sem problema, continuar no Aquecimento
- NÃO mencionar assessoria, venda ou preço neste momento
- Objetivo: criar reciprocidade e demonstrar competência

### Quando usar

- Após 2-3 mensagens de aquecimento (ela já respondeu algo)
- Quando identificar algo concreto que você pode melhorar pra ela
- ANTES de qualquer tentativa de transição para negócio
- Especialmente efetivo com perfis que não estão respondendo bem ao aquecimento padrão

---

## 7. Transição — Orgânica, Não Forçada (REESCRITO)

### Princípio (VALIDADO COM DADOS REAIS)

**A transição NÃO é feita por você. Ela é feita PELA PROSPECT.**

> **Erro fatal documentado:** Sequência de perguntas diagnósticas ("Como tá a demanda?", "Você tem agência?", "E a concorrência?") = detectada como venda em 100% dos casos testados.
>
> **O que funciona:** Esperar ELA mencionar naturalmente uma dor/desafio, e REAGIR — não iniciar.

### Como funciona

1. Durante o aquecimento, ela vai naturalmente mencionar algo sobre desafios
2. Pode ser: "é difícil no começo", "tô tentando crescer", "a demanda tá variando"
3. Quando ela mencionar → REAGIR com empatia + conexão sutil
4. NÃO fazer sequência de perguntas diagnósticas

### T1 — Ela mencionou dificuldade em atrair clientes

**REAGIR (não diagnosticar):**
```
Faz sentido. A maioria que eu conheço do seu segmento tem esse mesmo desafio. O que mais funciona pra atrair paciente novo no seu caso — indicação ou redes?
```

*Se ela disser que é indicação ou que redes não tão funcionando:*
```
Uma das minhas clientes tava nesse ponto. Investia R$600 e faturou R$10k em 10 dias. Não mudou o orçamento — mudou a estrutura.

Se quiser, posso te mostrar em 20 minutos o que dá pra ajustar.
```

### T2 — Ela mencionou que já tem agência/marketing

**NÃO competir. Posicionar como segunda opinião:**
```
Legal! Ter alguém cuidando é importante. Se em algum momento você quiser uma segunda visão, tô por aqui. Às vezes ajuda validar se o rumo tá certo.
```

> **Caso real (Matheus Falsarelli):** Disse "tenho uma empresa que faz o marketing". Transição veio natural via pergunta sobre captação, mas resultado final foi objeção "já tenho".

### T3 — Ela mencionou faturamento/crescimento

```
Bacana! E essa demanda é consistente ou varia muito de mês pra mês?
```

*Se ela mencionar variação:*
```
Faz sentido. Quando não tem estratégia constante, fica muito na onda do momento. Posso te mostrar como algumas das minhas clientes estabilizaram isso — 20 minutos, sem compromisso.
```

### T4 — Ela NÃO mencionou nenhuma dor (tudo indo bem)

**NÃO forçar. Manter relacionamento:**
```
Que bom! Quando tiver interesse em explorar como crescer ainda mais, é só chamar. Vou continuar acompanhando seu trabalho.
```

*Mover para follow-up leve (reagir a stories, manter presença). A transição pode levar semanas.*

### O QUE NUNCA FAZER NA TRANSIÇÃO

| Erro | Consequência Real |
|------|------------------|
| Sequência de 3+ perguntas diagnósticas | Prospect detecta venda e corta |
| "E você investe em marketing?" | Pergunta ameaçadora, gera defensividade |
| "Como tá a concorrência?" | Ameaçador, prospect se fecha |
| Mudar tom abruptamente | Prospect percebe a virada e desconfia |
| Revelar que usou automação/IA | Lead morre instantaneamente |
| Insistir após "já tenho alguém" | Prospect bloqueia |

---

## 8. Pitch — Apresentação da Assessoria

### P1 — Ela demonstrou interesse genuíno

```
Perfeito. Então aqui é o que eu entrego:

1. Campanha estruturada pro seu procedimento (não genérica de estética)
2. Criativo que fala direto na dor do paciente (não foto bonita sem direção)
3. Follow-up automático por WhatsApp pra quem demonstrou interesse mas não fechou

Minha última cliente investiu R$600 e faturou R$10k em 10 dias. Tá nos meus destaques.

Qual dia você tem 20 minutos pra eu analisar sua situação específica?
```

### P2 — Com pé atrás

```
Vou ser transparente. Eu trabalho SÓ com estética e saúde. Por isso sei exatamente o que funciona no seu nicho.

Os números tão nos meus destaques. R$600 investidos, R$10k faturados em 10 dias.

Se você der 20 minutos, saio de lá com um diagnóstico do que tá travando. Se não fizer sentido, sem problema.
```

---

## 9. Agendamento

### AG1 — Propor horário

```
Ótimo. Vou te mandar meu link de agenda. Escolhe o dia que funcionar melhor pra você.

A call é por Google Meet, 20 minutos. Vou analisar suas campanhas antes pra já chegar com diagnóstico pronto.

[LINK DO CALENDÁRIO]
```

### AG2 — Confirmar

```
Confirmado pra [dia] às [hora].

Vou mandar o link da call umas horas antes.

Se puder, me manda o @ do seu Instagram de anúncios antes da call — assim já faço a análise prévia.
```

### AG3 — Lembrete 24h antes

```
Oi! Lembrete da nossa call hoje às [hora].

Aqui o link: [LINK GOOGLE MEET]

Já analisei seu perfil e tenho umas observações interessantes. Até já!
```

---

## 10. Follow-up

### FU1 — 4 dias sem resposta

```
Só retornando aqui. Se o problema ainda existe, vale 20 minutos.

Quando você tem uma janela essa semana?
```

### FU2 — 7 dias

```
Oi! Sem pressão. Se em algum momento quiser olhar pras suas campanhas com alguém que só trabalha com estética, é só chamar.

Vou deixar meu link de agenda aqui: [LINK DO CALENDÁRIO]
```

### FU3 — 14 dias (último)

```
Última mensagem sobre isso. Se fizer sentido no futuro, meu perfil tá aqui.

Sucesso com as campanhas!
```

### FU-NATURAL — Follow-up casual após silêncio (VALIDADO)

```
Como tá?
```

```
Oii, achei que tinha te respondido
```

> **Dados reais:** "Como tá?" funciona melhor que qualquer follow-up longo. "Achei que tinha te respondido" é desculpa natural que reabre conversa.

> **NÃO usar:** "Dra, tudo bem? Tá por aí?" — soa ansioso.

---

## 11. Objeções

### OBJ1 — Já tenho agência

```
Entendo. Não to pedindo pra trocar agora.

Se em algum momento quiser uma segunda opinião ou validar o que vocês estão fazendo, tô por aqui. Sem custos, sem compromisso.
```

### OBJ2 — Já tentei e não funcionou

```
Entendo. A maioria faz o genérico: post bonito, legenda e torcida.

O que eu faço é diferente: trabalho só com estética e saúde. Sei o que converte nesse nicho. E automatizo o follow-up.

20 minutos. Se não fizer sentido, pelo menos você sai com clareza do que mudar.
```

### OBJ3 — Meu tráfego tá indo bem

```
Ótimo. Então você já tem a base.

Na maioria das clínicas, 60% do faturamento possível fica na mesa por falta de follow-up estruturado. Se quiser explorar isso, é só chamar.
```

### OBJ4 — Sem budget

```
Sem problema. Mas quanto você deixa de faturar por mês por não ter um sistema que fecha os leads que já chegam?

É disso que a gente conversa. 20 minutos, sem compromisso.
```

### OBJ5 — Vou pensar

```
Beleza. Sem pressa. Vou deixar meu link de agenda aqui. Quando fizer sentido, é só marcar.

[LINK DO CALENDÁRIO]
```

---

## 12. Métricas e Benchmarks

### Dados Reais (Baseline — 81 conversas analisadas)

| Métrica | Resultado Real | Target |
|---------|---------------|--------|
| Taxa de resposta | 26% (21/81) | 30%+ |
| Taxa de engajamento (2+ respostas) | 21% (17/81) | 25%+ |
| NO-REPLY | 74% (60/81) | <70% |

### Targets Operacionais

| Métrica | Target |
|---------|--------|
| Novos prospects / semana | 10-15 |
| Máximo simultâneo no pipeline | 30 |
| DM Enviada → Em Conversa | 30%+ |
| Em Conversa → Oferta/Transição | 50%+ |
| Transição → Call Agendada | 40%+ |
| Call Agendada → Ganho | 25%+ |
| Ciclo médio (Qualificado → Ganho) | 14-21 dias |

---

## 13. Pipeline GHL (10 estágios)

| # | Estágio | Quando mover |
|---|---------|-------------|
| 1 | Qualificado | Prospect validado nos critérios |
| 2 | Aquecendo | DM leve enviada (Dia 1) → GHL cria automaticamente |
| 3 | DM Enviada | DM de abertura real enviada (Dia 5+) |
| 4 | Em Conversa | Prospect respondeu |
| 5 | Pitch Feito | Apresentação da assessoria enviada |
| 6 | Call Agendada | Reunião marcada |
| 7 | Proposta Enviada | Proposta comercial enviada |
| 8 | Ganho | Fechou |
| 9 | Sem Resposta | Não respondeu após follow-ups |
| 10 | Perdido | Recusou definitivamente |

---

## 14. Regras de Ouro (DERIVADAS DE DADOS REAIS)

### FAZER:

1. **Elogiar algo ESPECÍFICO** do conteúdo (procedimento, resultado, técnica) — não genérico
2. **Sempre terminar com pergunta TÉCNICA** sobre o trabalho dela — sem pergunta = sem resposta
3. **Tom casual:** "kkkkk", emoji natural, primeira pessoa — parecer humano
4. **DM leve com 👏 ou 🔥** — zero taxa de rejeição em todas as tentativas
5. **Máximo 2 perguntas seguidas** — depois validar/elogiar
6. **Esperar ELA mencionar dor** antes de oferecer solução — nunca iniciar diagnóstico
7. **Ser autêntico** (ex: "pqp" + "desculpa o palavrão" = arrancou reação genuína)
8. **Oferecer valor primeiro** quando possível (edição grátis, dica específica, análise)
9. **"Como tá?"** funciona melhor que qualquer follow-up longo
10. **Curtir em rajada (6-8)** no Dia 1 para notificações agrupadas

### NÃO FAZER:

1. **"Comecei a te seguir agora"** — NUNCA (0% taxa de resposta, soa como bot)
2. **Sequência de perguntas diagnósticas** — DETECTADA como venda em 100% dos casos
3. **Mais de 3 mensagens sem resposta** — soa desesperado
4. **Transição abrupta pra marketing** — prospect corta na hora
5. **Elogio genérico sem pergunta** — não gera resposta
6. **Revelar automação/IA** — "foi minha IA que mandou" = morte instantânea do lead
7. **"Obrigada 🙏" = sinal de encerramento** — NÃO insistir, esperar 5-7 dias
8. **"Como tá a concorrência?"** — ameaçador, gera defensividade
9. **Perguntar sobre marketing diretamente** — prospect se fecha
10. **Insistir após objeção** — respeitar, deixar porta aberta, voltar depois

---

*Playbook de Prospecção Ativa Instagram v2.1 — Syra Digital AIOS*
*Baseado em análise real de 81 conversas via Instagram Graph API — 2026-03-16*
