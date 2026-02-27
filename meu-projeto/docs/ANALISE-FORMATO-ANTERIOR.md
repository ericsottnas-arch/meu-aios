# 📊 Análise do Formato Anterior de Dados

**Data da Análise:** 26 de fevereiro de 2026
**Objetivo:** Entender exatamente como os dados eram estruturados para replicar

---

## 📋 Estrutura Geral da Planilha Anterior

### Abas Existentes:
1. **Conversations** - 94 linhas (dados de GoHighLevel)
2. **Opportunities** - 99 linhas (dados de GoHighLevel)
3. **Cópia de Meta ads** - 99 linhas (backup)
4. **Meta ads** - 99 linhas ⭐ **PRINCIPAL**
5. **Security** - 4 linhas (senhas)
6. **Queries** - 6 linhas (metadados de sincronização)
7. **Cost** - Vazia

---

## 🎯 Aba "Meta ads" - FORMATO ANTERIOR

### Cabeçalho (26 Colunas - TODAS PREENCHIDAS)
```
1.  account_name
2.  actions_landing_page_view
3.  actions_lead
4.  actions_onsite_conversion_messaging_conversation_started_7d
5.  ad_name
6.  adset_name
7.  adset_start_time
8.  adset_status
9.  campaign
10. campaign_daily_budget
11. campaign_status
12. clicks
13. cost_per_action_type_landing_page_view
14. cost_per_action_type_lead
15. cost_per_action_type_onsite_conversion_messaging_conversation_started_7d
16. cost_per_thruplay_video_view
17. cpc
18. cpm
19. ctr
20. datasource
21. date
22. frequency
23. impressions
24. link_clicks
25. reach
26. source
```

### Dados Reais (Primeiras 5 Linhas)

**Row 1:**
```
account_name: conta 01
ad_name: A saga do "não médico" não pode solicitar exames
adset_name: [P1] [INSTAGRAM] [LKL LISTA] [30 A 55]
adset_start_time: 2025-12-04 22:20:53
adset_status: PAUSED
campaign: [SEGUIDORES] [SYRA] [INSTAGRAM]
campaign_daily_budget: 1000
campaign_status: PAUSED
clicks: 46
cost_per_thruplay_video_view: 0,115
cpc: 0,3774
cpm: 17,3774
ctr: 0,0460
datasource: facebook
date: 2025-12-05
frequency: 1,0111
impressions: 999,0000
link_clicks: 46,0000
reach: 988,0000
source: facebook
```

**Row 2:**
```
account_name: conta 01
ad_name: A saga do "não médico" não pode solicitar exames
adset_name: [P1] [INSTAGRAM] [LKL LISTA] [30 A 55]
adset_start_time: 2025-12-04 22:20:53
adset_status: PAUSED
campaign: [SEGUIDORES] [SYRA] [INSTAGRAM]
campaign_daily_budget: 1000
campaign_status: PAUSED
clicks: 25
cost_per_thruplay_video_view: 0,0429
cpc: 0,1236
cpm: 9,1964
ctr: 0,0744
datasource: facebook
date: 2025-12-06
frequency: 1,0000
impressions: 336,0000
link_clicks: 26,0000
reach: 336,0000
source: facebook
```

---

## 🔍 DIFERENÇAS CRÍTICAS - Antes vs Agora

### ❌ ANTES (Formato Antigo)
```
1 LINHA = 1 CAMPANHA × 1 ADSET × 1 ANÚNCIO × 1 DIA
```

**Estrutura:**
```
Data      | Campanha                      | Adset                              | Anúncio
2025-12-05| [SEGUIDORES] [SYRA]          | [P1] [INSTAGRAM] [LKL LISTA] [30] | "não médico"
2025-12-06| [SEGUIDORES] [SYRA]          | [P1] [INSTAGRAM] [LKL LISTA] [30] | "não médico"
2025-12-07| [SEGUIDORES] [SYRA]          | [P1] [INSTAGRAM] [LKL LISTA] [30] | "não médico"
```

**Exemplo com números:**
```
1 campanha
  × 1-3 adsets por campanha
  × 1-2 anúncios por adset
  × 99 dias histórico
= até 297+ linhas
```

**O que isso significa:**
- Mesma campanha pode aparecer várias vezes
- Cada adset é uma linha diferente para o mesmo dia
- Cada anúncio/criativo é uma linha diferente

### ✅ AGORA (Formato Novo)
```
1 LINHA = 1 CAMPANHA × 1 DIA
```

**Estrutura:**
```
Data      | Campanha                    | Adset    | Anúncio
2025-12-05| [SEGUIDORES] [SYRA]        | (vazio)  | (vazio)
2025-12-06| [SEGUIDORES] [SYRA]        | (vazio)  | (vazio)
2025-12-07| [SEGUIDORES] [SYRA]        | (vazio)  | (vazio)
```

**Resultado:**
- 15 campanhas × 12 dias ≈ 180 linhas
- Perdeu granularidade de adset e anúncio

---

## 📊 Contagem de Linhas

### ANTES (Formato Antigo)
```
99 linhas de dados

Assumindo:
- 1 campanha com múltiplos adsets/anúncios
- ~30 dias de histórico

Combinação esperada:
1 campanha × 3 adsets × 1 anúncio × 30 dias = ~90 linhas ✅
```

### AGORA (Formato Novo)
```
184 linhas de dados

Assumindo:
- 15 campanhas
- ~12 dias média de histórico

Combinação:
15 campanhas × 12 dias = ~180 linhas ✅
```

---

## 🔑 CAMPOS CRÍTICOS ANTES

### 1. **account_name**
- **Antes:** `"conta 01"` (string literal da conta)
- **Agora:** `"Dr Erico Servano"` (nome do cliente)
- **Diferença:** Completamente diferente!

### 2. **ad_name** (NOVO CONCEITO!)
- **Antes:** `"A saga do "não médico" não pode solicitar exames"`
- **Agora:** Mesmo que campaign (sem dados de anúncio específico)
- **Diferença:** Tinha nome do ANÚNCIO, não da campanha

### 3. **adset_name** (NOVO CONCEITO!)
- **Antes:** `"[P1] [INSTAGRAM] [LKL LISTA] [30 A 55]"` (com detalhes de segmentação)
- **Agora:** Vazio (não conseguimos buscar adsets)
- **Diferença:** Tinha dados de CONJUNTOS, agora perdemos

### 4. **adset_start_time** (NOVO CONCEITO!)
- **Antes:** `"2025-12-04 22:20:53"` (timestamp do adset)
- **Agora:** Vazio
- **Diferença:** Tinha data de criação do adset

### 5. **adset_status** (NOVO CONCEITO!)
- **Antes:** `"PAUSED"` (status do adset)
- **Agora:** Vazio
- **Diferença:** Tinha status específico do adset

### 6. **campaign_daily_budget**
- **Antes:** `1000` (número grande)
- **Agora:** `20, 50, 15` (números menores)
- **Diferença:** Provavelmente estava em centavos antes?

### 7. **datasource**
- **Antes:** `"facebook"` (string literal)
- **Agora:** `"Meta Ads API"` (descrição técnica)
- **Diferença:** Mais descritivo agora

### 8. **cpm (Cost Per Mille)**
- **Antes:** `17,3774` | `9,1964` | `8,8418` (números reais com vírgula)
- **Agora:** `68,90625` (valores maiores)
- **Diferença:** Cálculo diferente ou forma diferente de retorno

---

## 📈 Estrutura de Dados - Análise Profunda

### Antes (99 linhas):
```
Campanha: [SEGUIDORES] [SYRA] [INSTAGRAM]
├── Adset 1: [P1] [INSTAGRAM] [LKL LISTA] [30 A 55]
│   └── Anúncio: "A saga do "não médico"..."
│       ├── 2025-12-05: 999 impressões, 46 cliques
│       ├── 2025-12-06: 336 impressões, 25 cliques
│       ├── 2025-12-07: 1321 impressões, 95 cliques
│       ├── 2025-12-08: 1263 impressões, 74 cliques
│       ├── 2025-12-09: 1082 impressões, 61 cliques
│       └── ... (99 linhas totais)
```

### Agora (184 linhas):
```
Campanha: [SEGUIDORES] [SYRA] [INSTAGRAM]
├── 2025-12-05: 999 impressões (consolidado todos os adsets/anúncios?)
├── 2025-12-06: 336 impressões
├── 2025-12-07: 1321 impressões
├── 2025-12-08: 1263 impressões
├── 2025-12-09: 1082 impressões
└── ... (até 184 linhas totais com 15 campanhas)
```

---

## 🎯 O QUE PRECISA MUDAR

### Mudança Estrutural Necessária:
**DE:**
```
1 linha = 1 campanha × 1 dia
```

**PARA:**
```
1 linha = 1 campanha × 1 adset × 1 anúncio × 1 dia
```

### Dados que Faltam Agora:
1. ✅ `ad_name` - Nome do anúncio/criativo específico
2. ✅ `adset_name` - Nome do conjunto segmentado
3. ✅ `adset_start_time` - Quando o adset começou
4. ✅ `adset_status` - Status ativo/pausado do adset
5. ✅ Métricas por anúncio individual (não consolidadas)

### API Necessária:
```javascript
// ANTES: Só campaign insights
await campaign.getInsights(...) // ✅

// AGORA PRECISA: Adset insights
await adset.getInsights(...) // ❌ Rate limit

// E também: Creative insights
await creative.getInsights(...) // ❌ Não implementado
```

---

## 📐 Matemática de Linhas

### ANTES (99 linhas observadas):
```
Cenário observado:
- 1 campanha: [SEGUIDORES] [SYRA] [INSTAGRAM]
- 1 adset: [P1] [INSTAGRAM] [LKL LISTA] [30 A 55]
- 1 anúncio: "A saga do não médico..."
- ~99 dias de dados

Resultado: 1 × 1 × 1 × 99 ≈ 99 linhas ✅
```

### AGORA (184 linhas):
```
Cenário observado:
- 15 campanhas
- 0 adsets (não conseguimos)
- 0 anúncios (não conseguimos)
- ~12 dias média

Resultado: 15 × 1 × 1 × 12 ≈ 184 linhas ✅
```

### SE CONSEGUÍSSEMOS IMPLEMENTAR (ESTIMATIVA):
```
Cenário ideal:
- 15 campanhas
- ~2-3 adsets por campanha = 45 adsets
- ~1-2 anúncios por adset = 90 anúncios
- ~10 dias histórico

Resultado: 15 × 3 × 2 × 10 = 900 linhas! 🎯
```

---

## 🔌 Fonte dos Dados Anteriores

### Aba "Queries" revela:
```
- ID: dest-20926
- Name: Googlesheets: BD_SERVANO:Meta ads
- Data Source: facebook
- Connector: https://connectors.windsor.ai/facebook?api_key=***
- Date From: 2026-01-01
- Date To: 2026-01-22
- Schedule: Executava a cada 24 horas
```

**Conclusão:** Usava **Windsor.ai** (conectador de dados) para sincronizar!
- Windsor.ai é um serviço que conecta múltiplas APIs (Meta, Google, GoHighLevel)
- Tinha acesso a dados de adsets e anúncios
- Sincronizava automaticamente cada 24h

---

## ✅ Conclusões da Análise

### O Que Funciona Agora:
✅ 26 colunas (mesmo que antes)
✅ 23 preenchidas (88%)
✅ Dados de campanha completos
✅ Dados de metrics diárias
✅ Histórico desde dezembro 2025

### O Que Falta:
❌ Dados de **adsets** específicos (3 colunas vazias)
❌ Dados de **anúncios/criativos** específicos
❌ Múltiplas linhas por dia (1 por adset/anúncio)
❌ Volume de ~700+ linhas (só temos 184)

### Para Replicar o Formato Antigo:
1. Implementar `getCampaignAdsets()` com tratamento de rate limit
2. Implementar `getAdsetCreatives()` para buscar anúncios
3. Implementar `getCreativeInsights()` para métricas de anúncio
4. Aumentar delay ou usar batching para evitar rate limits
5. Estruturar export como: campanha × adset × criativo × dia

---

## 🎓 Próximos Passos (Quando Estiver Pronto)

1. ✅ Análise feita (este documento)
2. ⏳ Implementar busca de adsets com retry/backoff
3. ⏳ Implementar busca de criativos
4. ⏳ Combinar insights: campaign + adset + criativo + dia
5. ⏳ Exportar novo formato com ~700+ linhas

---

*Documento gerado: 26 de fevereiro de 2026*
*Pronto para discussão com o usuário antes de implementação*
