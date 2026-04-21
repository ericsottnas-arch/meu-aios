# Aprendizados do Agente: @media-buyer (Celo)

> Feedbacks do Eric acumulados ao longo das sessoes.
> Leitura OBRIGATORIA antes de qualquer tarefa.
> Regras sao cumulativas — nunca remover, so adicionar.

### [2026-03-25] Feedback: Dashboard inflava leads (auditoria completa Servano)
- **Contexto:** Auditoria comparando dashboard servanoadvogados.syradigital.com com Meta Ads UI, Google Ads e GHL
- **Feedback:** "dashboard ta mostrando 143 leads e só no meta tem 50 e por volta de 4 no google, n faz sentido esse numero"
- **Regra derivada:** Ao auditar dashboard vs plataformas, verificar o código fonte do frontend para entender como as métricas são calculadas. Bug era: `totalLeads` somava `leads + messagingConversations` — conversas WhatsApp NÃO são form leads. Corrigido para usar só `leads`.
- **Severidade:** CRITICAL

### [2026-03-25] Aprendizado: Auditoria de dashboard — usar cliclick + osascript
- **Contexto:** Tentei usar Playwright MCP para acessar Meta Ads mas abriu browser anônimo sem sessão logada
- **Feedback:** Eric disse "usa nesse que já está aberto" — preferência clara por usar o Chrome existente com sessões ativas
- **Regra derivada:** Para auditar plataformas (Meta Ads, Google Ads, GHL) SEMPRE usar `cliclick` + `screencapture` + `osascript` para controlar o Chrome já aberto. NUNCA abrir Playwright browser separado para plataformas que exigem login. Usar `osascript` para executar JavaScript diretamente no Chrome ativo quando precisar interagir com elementos.
- **Severidade:** HIGH

### [2026-03-25] Aprendizado: Meta Ads API level=ad pode inflar leads por atribuição multi-anúncio
- **Contexto:** Investigando discrepância de leads entre API e UI
- **Regra derivada:** Ao comparar leads da API (level=ad) com UI do Meta Ads: a UI deduplica por campanha, a API pode contar o mesmo lead em múltiplos anúncios via attribution window (7d click + 1d view). Para métricas de LEADS no dashboard, sempre comparar com o level=campaign da UI, não com a soma bruta level=ad.
- **Severidade:** HIGH

### [2026-03-25] Aprendizado: gviz endpoint corrompido — usar export?format=csv&gid=
- **Contexto:** Google Ads mostrava R$0 no dashboard apesar de ter dados no Sheet
- **Regra derivada:** NUNCA usar `gviz/tq?tqx=out:csv` para dados brutos de Sheets. Causa headers corrompidos (`"spend 29.65 44.45"` em vez de `"spend"`). Sempre usar `export?format=csv&gid={NUM}`. Para descobrir GIDs: Sheets API com `sheets.spreadsheets.get`.
- **Severidade:** HIGH

### [2026-03-25] Aprendizado: StatCard tooltips — prop tooltip opcional
- **Contexto:** Eric pediu popup pequeno ao passar mouse no ícone de cada indicador
- **Regra derivada:** StatCard tem prop `tooltip?: string`. Quando presente, o ícone vira TooltipTrigger com cursor-help. Todos os StatCards do Principal.tsx e Campanhas.tsx têm tooltips explicando o cálculo.
- **Severidade:** MEDIUM

### [2026-03-25] Aprendizado: Pipeline stages devem sempre mostrar todas as etapas
- **Contexto:** Dashboard omitia etapas sem oportunidades no período
- **Regra derivada:** Em `calculateOpportunityStats`, pré-popular o stageMap com todos os STAGE_ORDER antes de iterar oportunidades. Isso garante que etapas com 0 apareçam no gráfico e tabela.
- **Severidade:** MEDIUM

---

## Regras Ativas

### [2026-03-10] Feedback: Seguir protocolo de ativação completo
- **Contexto:** Primeira ativação do Celo
- **Feedback:** Eric perguntou qual processo foi seguido, verificando se o protocolo foi respeitado
- **Regra derivada:** SEMPRE seguir a ordem de ativação: 1) Definição do agente, 2) Knowledge base, 3) Aprendizados, 4) Feedback rules (se aplicável). Nunca pular etapas.
- **Severidade:** HIGH

### [2026-03-10] Feedback: NUNCA agir com suposição — SEMPRE verificar via API antes
- **Contexto:** Auditoria Dra. Gabrielle. Diagnostiquei que adsets usavam optimization_goal genérico baseado no objetivo da campanha (OUTCOME_ENGAGEMENT), sem consultar o campo real no adset via API. Criei adset P4 desnecessário (idêntico aos existentes).
- **Feedback:** Eric cobrou o erro. Adsets antigos JÁ tinham optimization_goal: CONVERSATIONS + destination_type: WHATSAPP. Erro grave — ação tomada com base em inferência, não dado.
- **Regra derivada:** ANTES de qualquer diagnóstico ou ação sobre campanhas/adsets/ads, OBRIGATORIAMENTE consultar a API do Meta para verificar os campos reais (optimization_goal, destination_type, promoted_object, billing_event). NUNCA inferir configuração a partir do objetivo da campanha. Campanha OUTCOME_ENGAGEMENT pode ter adsets com optimization_goal variado (CONVERSATIONS, POST_ENGAGEMENT, LINK_CLICKS, etc.). Só o campo real no adset importa.
- **Severidade:** CRITICAL

### [2026-03-10] Feedback: Não confiar cegamente em output de subagentes
- **Contexto:** O subagente de pesquisa fez a auditoria e inferiu incorretamente as configurações dos adsets. Celo aceitou o diagnóstico sem validar.
- **Feedback:** Eric cobrou — erro em cadeia por falta de validação.
- **Regra derivada:** Quando um subagente retornar diagnóstico sobre configurações técnicas de campanhas, SEMPRE validar os dados críticos com chamada direta à API antes de propor ações. Subagente pesquisa, Celo valida.
- **Severidade:** CRITICAL

### [2026-03-16] Feedback: Documentar aprendizados progressivamente
- **Contexto:** Sessão longa de pesquisa estratégica (funil B2B, análise competitiva, pesquisa de mercado)
- **Feedback:** Eric perguntou "como está gerando aprendizado?" — eu NÃO estava salvando na memória ao longo da conversa
- **Regra derivada:** SEMPRE salvar aprendizados e decisões na memória progressivamente durante a conversa, NÃO esperar o final. A cada decisão importante ou descoberta relevante, salvar imediatamente.
- **Severidade:** HIGH

### [2026-03-16] Feedback: Ter autonomia para pesquisa de anúncios
- **Contexto:** Eric pediu para pesquisar funis que estão escalando no Meta Ads. WebFetch retornou 403 na Meta Ad Library.
- **Feedback:** "seria bom vc mesmo ter essa autonomia" — eu deveria ter tentado browser automation ao invés de desistir
- **Regra derivada:** Usar TODAS as ferramentas disponíveis (cliclick, screencapture, open, osascript) para acessar informações que WebFetch não consegue. Tentar browser automation antes de pedir ao Eric para fazer manualmente.
- **Severidade:** HIGH

### [2026-03-16] Feedback: ICP errado — NÃO incluir dentistas, fisioterapeutas, fonoaudiólogas
- **Contexto:** Ao definir ICP do funil, incluí profissões que Syra NÃO atende
- **Feedback:** "não atendemos Fonoaudiólogas, fisioterapeutas e nem dentistas (você está confundindo, por que grande parte dos profissionais da HOF são formados em CD)"
- **Regra derivada:** HOF profissionais ter diploma de CD ≠ Syra atende dentistas. ICP = médicos esteticistas, HOF, cirurgiões plásticos, clínicas de estética. NUNCA incluir dentistas, fisio, fono.
- **Severidade:** CRITICAL

### [2026-03-16] Feedback: Buscar dados nas transcrições ANTES de pesquisa externa
- **Contexto:** Fiz pesquisa de mercado externa sem consultar dados internos primeiro
- **Feedback:** "se você procurar tem o agente de documentação que tem muitas transcrições de calls"
- **Regra derivada:** SEMPRE consultar transcrições de clientes (docs/clientes/*/knowledge-base/reuniao-*.md) ANTES de fazer pesquisa externa. Dados reais > pesquisa genérica. Memória primeiro, sempre.
- **Severidade:** HIGH

### [2026-03-16] Decisão: Nome do método — "Método Órbita"
- **Contexto:** Estava usando "Ciclo Fechado" como nome do método. Eric achou ruim ("não parece atrativo"). Sugerimos alternativas, Eric escolheu "Método Órbita" porque "tem poder de atração, puxa várias coisas o tempo inteiro e nunca para de crescer"
- **Regra derivada:** O método se chama MÉTODO ÓRBITA. Nunca mais usar "Ciclo Fechado". Conceito simples: um sistema que atrai, captura e nunca perde. Sem analogias de física (gravidade, massa, energia) — só o conceito puro de atração e crescimento contínuo.
- **Severidade:** CRITICAL

### [2026-03-16] Feedback: Não complicar — manter simples
- **Contexto:** Criei analogia elaborada com física (gravidade, massa, energia, 3 órbitas). Eric disse "não precisa aplicar a física nisso" e depois "ficou complexo demais"
- **Feedback:** Eric quer simplicidade. "Apenas dizer que é uma força que atrai ainda mais pacientes e leads novos e que nunca para de crescer"
- **Regra derivada:** Explicações e frameworks devem ser SIMPLES. Não over-engineer analogias. Se precisa de mais de 2 frases pra explicar, está complexo demais. O médico precisa entender em 10 segundos.
- **Severidade:** HIGH

---

### [2026-04-20] Estado das campanhas Dra. Gabrielle — fim de semana (19-20/abr/2026)

**Campanhas ativas:**
- `[Syra] Dra Gabrielle - Emagrecimento [Formulário Instantâneo] [CBO]` — campanha principal, foco em emagrecimento/corpo
- `[Syra] Emagrecimento Retargeting Morno [Formulário Instantâneo] [CBO]` — retargeting de engajamento

**Métricas consolidadas (sáb+dom):**
- Spend total: R$31.87 (~R$16/dia)
- Impressões: 1.302 | Reach: ~1.143 | Clicks: 20 | CTR: ~1.54%
- Leads (formulário Meta/SP timezone): **0** no sábado e domingo
- Lead aparente "de sábado" no dashboard: é lead de Keite.fernandes (23:57 SP sexta 18/abr = 02:57 UTC sábado 19/abr)
- Conversas WhatsApp: 1 (via P2 retargeting profundo, R$1.50/conversa)

**INSIGHT CRÍTICO — Discrepância de timezone:**
- Meta Ads API usa timezone da conta = America/Sao_Paulo (UTC-3)
- Dashboard Supabase armazena em UTC
- Lead de 23:57 SP (sexta) = 02:57 UTC (sábado) → aparece como "sábado" no dashboard, mas Meta mostra como "sexta"
- Esta discrepância afeta a leitura de performance do fim de semana
- SEMPRE confirmar com a API da Meta usando SP timezone ao discutir leads "de sábado/domingo"

**Adsets ativos:**
- P5 [M][30-55][Caieiras, Franco, Perus, Jundiaí, Cajamar][FB+IG] — R$17.49, CTR 1.40%, CPM R$27.24 → 0 leads
- P10 [M][30-55][Caieiras, Franco, Perus][LLK 1% Engaja/DM/Save] — R$5.41, CTR 1.15%, CPM R$20.65 → 0 leads
- P1 [M][25-65][Engajamento Amplo] Retargeting — R$7.27, CTR 2.25%, CPM R$23.38 → 0 leads
- P2 [M][25-65][Engajamento Profundo] Retargeting — R$1.50, CTR 0%, CPM R$18.75 → 1 conversa

**Performance dos criativos (fim de semana):**
- **C8 [Variação Body2] = VENCEDOR** — R$19.95 spend (63% do total)
  - P5: CTR 2.64%, CPM R$34.30, Hold Rate 53%, Completion 49%
  - P10: CTR 1.23%, CPM R$20.58, Hold Rate 23%, Completion 15%
  - Retargeting P1: CTR 2.48%, CPM R$24.21, Hold Rate 46%, Completion 35%
- **C7 [Variação barriga]** — R$8.02, CTR 0.59%, Hold Rate 32%, Completion 30% (fraco)
- **C6 [Você vai ter um evento]** — R$2.69 total, distribuído em micro-orçamentos
- **C4 [Você Faz Academia]** — R$0.49, sem conversão, algoritmo rejeitando
- **C5 [Eu Descobri Procedimento Estético]** — R$0.05, praticamente zerado
- **AD9 [Resultados Reais]** — R$0.01, 1 conversa WhatsApp no retargeting profundo

**Diagnósticos críticos:**
- Budget R$16/dia = muito baixo vs R$100/dia mencionado na auditoria de 17/abr. Campanhas podem ser novas e ainda em aprendizado
- 0 leads = possível campanha nova ainda buildando pixel events, ou problema no formulário
- C8 Body2 domina o spend do algoritmo em múltiplos adsets — criativo validado para escala
- Campanha de retargeting recebe apenas R$8.92/2d = praticamente sem budget para trabalhar
- P2 Engajamento Profundo gerou 1 conversa WhatsApp com R$1.50 — custo excelente, mas volume ínfimo

**Nota importante:** As campanhas de "Emagrecimento" são DIFERENTES das campanhas de "Captacao Geral" documentadas na auditoria de 17/abr. Campanhas novas criadas provavelmente após a auditoria.

**Otimizações executadas em 20/abr/2026:**
- Pausados C4 (4 adsets), C5 (3 adsets), C7 (2 adsets) = 9 ads pausados
- Budget rebalanceado: R$35→R$30 principal | R$15→R$20 retargeting (total mantido R$50/dia)
- Criativos ativos restantes: C6, C8 Body2 (vencedor), AD9 Resultados Reais
- Exclusão de leads convertidos: PENDENTE — requer aceitar TOS de Custom Audience em business.facebook.com

**Budget Dra. Gabrielle — abril/2026:**
- Orçamento mensal: R$1.500
- Gasto até 20/abr: R$693,77
- Saldo restante: R$806,23
- Projeção 10 dias (R$50/dia): R$500
- Margem: R$306

**Performance abril:**
- 77 leads | CPL R$9,01 | 4,3 leads/dia | meta: 5/dia

- **Severidade:** HIGH

---

### [2026-04-20] Auditoria completa Dr. Humberto Andrade — Meta Ads + GHL

**Conta Meta Ads:** act_445142030338909 — Humberto Andrade - Goiânia
**Saldo:** R$75,99 (CRITICO — menos de 2 dias de spend)

**Campanhas ativas (4):**
- `[Syra] Conteudo Topo [Video Views] [ABO]` — R$100,81 | brand awareness
- `[Syra] Paciente Modelo Frio [Formulario] [ABO] — Copia` — R$283,77 | 104 leads | CPL R$2,73
- `[Syra] Retargeting Procedimento Morno [Formulario] [CBO]` — R$269,66 | 80 leads | CPL R$3,37 | Freq 3,07 ⚠️
- `[Syra] Procedimento Publico Frio [Formulario] [ABO]` — R$686,05 | 244 leads | CPL R$2,81

**Total ultimos 30 dias:** Spend R$1.340,29 | 428 leads | CPL R$3,13

**Adsets criticos:**
- P6 SP Pinheiros/Itaim: CPL R$12,58 (4x acima da meta) — PAUSAR
- P1 LLK Todos Procedimentos Amapa: CPL R$2,03 — MELHOR, escalar
- P1 Retargeting Engajamento Amplo: Freq 3,06, fadiga iminente

**Criativos top:**
- C1 Video Blefaroplastia no retargeting: CPL R$1,50 — VENCEDOR
- C7 Estatico no retargeting: CPL R$7,42 — FRACO para retargeting, pausar no adset
- C7 Estatico no frio: CPL ~R$1,79 — BOM
- Otoplastia C1 Video: CPL R$1,76

**GHL Funil PROCEDIMENTO — Abril 2026:**
- 276 oportunidades | Lead recebido: 257 (93%) | Ganhos: 3 | Receita: R$46.707,50
- Ticket medio: R$15.569 | 193 leads Meta, 83 organico
- CRITICO: 0 conversoes das campanhas pagas. Gargalo e no comercial, nao nas campanhas.
- 257 leads sem qualquer contato — protocolo de follow-up urgente

**Doc de auditoria:** https://docs.google.com/document/d/1r89gebotZOXr6TWaNvAH66ZgeWqSOztBwGb8l44K6NQ/edit

**Severidade:** CRITICAL (saldo) + HIGH (gargalo comercial)

---

### [2026-04-09] Padrão aprovado: Follow-up WhatsApp Dra. Gabrielle
- **Contexto:** Sequência de 5 follow-ups para leads que não responderam o áudio inicial
- **Feedback:** "boa gostei dessas" após ajustes
- **Padrão validado:**
  - Step 1: pergunta direta se ouviu o áudio 🎧
  - Step 2: convite empático pra contar o que incomoda + 💙
  - Step 3: só o emoji 👀 (quebra padrão, humaniza)
  - Step 4: "pode falar à vontade, sem julgamento nenhum" + "certinho"
  - Step 5: fechamento + escassez suave de vaga + "Me chama." + 💙
- **Regras derivadas:**
  - NUNCA usar em-dash (—) — Eric rejeitou explicitamente
  - Público feminino: tom acolhedor, diminutivos (certinho), 💙 no final
  - Escassez no step final: "Ainda tenho uma vaga essa semana"
  - CTA curto e direto: "Me chama." "Me conta."
- **Severidade:** HIGH
