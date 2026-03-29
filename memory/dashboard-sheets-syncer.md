# Dashboard Sheets Syncer — Arquitetura e Gotchas

> Processo PM2: `dashboard-sync` (Port 3009)
> Arquivo principal: `meu-projeto/dashboard-sync-server.js`
> Lib: `meu-projeto/lib/dashboard-sheets-syncer.js`

---

## O que faz

Sincroniza dados para o Google Sheets do dashboard (`data-petal-view`).
SpreadsheetId Dr. Erico: `1Br8Fg23cMKwLEjP8dbsz2DRIjwPoRSNoDu47SoX2FW0`

| Fonte | Aba | Frequência |
|-------|-----|------------|
| Meta Ads API (level=ad) | Campanhas | A cada 2h (incremental 7d / full 3 meses) |
| GHL Oportunidades | Oportunidades | A cada 2h (limit 50k, timeout 120s) |
| GHL Conversas | Conversas | A cada 2h (limit 5k) |
| Google Ads API (level=ad) | Google Ads | A cada 2h (incremental 7d / full 3 meses) |
| Google Ads API (keywords) | Google Ads Keywords | A cada 2h (incremental 7d / full 3 meses) |

---

## Arquitetura Meta Ads

Usa `metaAds.getAccountAdsInsightsDaily(adAccountId, start, end)` com `level: 'ad'`.
- 1 chamada paginada para a conta toda (não por campanha/anúncio)
- Retorna dados diários por anúncio: 1011 linhas para 3 meses do Dr. Erico
- Método em `lib/meta-ads.js`: `getAccountAdsInsightsDaily()` + `_mapAdInsightRow()`

**Por que `level=ad` e não por campanha:**
- Abordagem anterior (por campanha) replicava métricas da campanha para todos os anúncios dentro dela — errado
- `level=ad` retorna métricas reais de cada anúncio individual por dia

**Por que reescreve tudo (não append):**
- Meta Ads tem atribuição retroativa (lead clicado hoje pode ser contabilizado amanhã)
- Append incremental deixaria dados históricos desatualizados

---

## CAMP_HEADERS (34 colunas)

Inclui `spend` entre `reach` (col 25) e `source` (col 26). O CampaignsExporter antigo tinha 33 colunas (sem `spend`).

Source = `'DashboardSyncer'` (não `'CampaignsExporter'`).

---

## GOTCHA CRITICO: CeloAgent sobrescreve o Sheets

**Problema encontrado em 2026-03-24:**
`celo-agent-server.js` roda `campaignsExporter.syncAllClients()` a cada 15 minutos.
Isso chamava `saveToGoogleSheets()` dentro de `exportClientCampaigns()`, sobrescrevendo o tab "Campanhas" com formato antigo (33 colunas, sem spend, source="CampaignsExporter", todos video zeros).

**Fix aplicado:**
Em `lib/campaigns-exporter.js` linha 72-73, comentada a chamada:
```js
// Salvar em Google Sheets — desabilitado: DashboardSheetsSyncer é o responsável
// await this.saveToGoogleSheets(clientId, synthesis);
```

CeloAgent continua rodando `exportClientCampaigns` para salvar JSON/Markdown/Excel locais — só o Sheets export foi desabilitado.

**Regra:** `DashboardSheetsSyncer` é o único responsável pelo tab "Campanhas".
Se algum dia o CeloAgent precisar escrever no Sheets novamente, resolver o conflito antes.

---

## _writeToSheet — clear correto

```js
await this.sheets.spreadsheets.values.clear({
  spreadsheetId,
  range: tabName,  // CERTO: só o nome da aba
});
```

**Errado** (versão antiga que não limpava):
```js
range: `'${tabName}'!A1:ZZ`  // ZZ sem número de linha = comportamento indefinido
```

---

## Endpoints

```
GET  /status           → status do último sync + isSyncing
POST /sync             → sync de todos os clientes ativos
POST /sync/:clientId   → sync de um cliente específico
```

O endpoint `/sync/:clientId` chama `syncer.syncClient()` diretamente (não passa pelo `isSyncing` check). Pode rodar em paralelo com o auto-sync — sem problema pois escrevem os mesmos dados.

---

## Clientes configurados

Só `dr-erico-servano` tem `spreadsheetId` configurado (2026-03-24).
Dra. Gabrielle, Dra. Vanessa, Torre-1 ainda não têm spreadsheetId → sync pula com aviso.

---

## Google Ads Integration (2026-03-25)

**Conta:** 885-010-3233 (Servano Advogados)
**Config:** `celo-clients.json` campo `googleAdsCustomerId: "8850103233"`

### Metodos adicionados em `lib/google-ads.js`
- `getAccountAdsInsightsDaily(customerId, startDate, endDate)` - insights nivel anuncio
- `getAccountKeywordsInsightsDaily(customerId, startDate, endDate)` - insights nivel keyword

### GOTCHA: GAQL FROM ad_group_ad
- `campaign_budget.amount_micros` NAO pode ser selecionado com `FROM ad_group_ad`
- `metrics.search_impression_share` tambem NAO funciona com `FROM ad_group_ad`
- Solucao: removidos da query, `campaignDailyBudget` fixado em 0

### GOTCHA: Google Ads API errors
- `err.message` vem `undefined` em erros da Google Ads API
- Mensagem real fica em `err.errors[0].message`
- Error handling no syncer usa `err.message` — pode mostrar "undefined" no log

### GADS_HEADERS (26 colunas)
account_name, campaign_id, campaign_name, campaign_status, campaign_type, campaign_daily_budget, ad_group_id, ad_group_name, ad_group_status, ad_id, ad_name, ad_status, date, impressions, clicks, spend, cpc, ctr, cpm, conversions, conversions_value, cost_per_conversion, roas, search_impression_share, final_url, datasource

### GADS_KW_HEADERS (17 colunas)
account_name, campaign_id, campaign_name, ad_group_id, ad_group_name, keyword, match_type, quality_score, date, impressions, clicks, spend, cpc, ctr, conversions, cost_per_conversion, datasource

### Frontend (syra-vision-dashboard)
- Aba Google Ads: `/google-ads` route
- Dados carregados via `gviz/tq?tqx=out:csv&sheet=Google%20Ads`
- Pagina Principal soma Google Ads + Meta Ads no investimento total
- Dashboard deployado em: servanoadvogados.syradigital.com (VPS 187.77.252.12)

---

## GOTCHA: GHL Pagination Bug (2026-03-25)

**Problema:** `_fetchAllGHL` usava apenas `startAfterId` para paginacao.
GHL API requer AMBOS `startAfter` (timestamp) E `startAfterId` para avancar cursor.
Resultado: loop infinito retornando os mesmos 100 registros. 50.000 duplicatas.

**Fix:** Dual-cursor com `meta.startAfter` + `meta.startAfterId` da resposta + deduplicacao via Set.

**Conversas:** Nem `lastId` nem `page` funcionam no `/conversations/search`.
Criado metodo separado `_fetchAllGHLConversations` usando `startAfterDate` cursor.

**Resultado apos fix:** Oportunidades 192, Conversas 220 (corretos).

---

## GOTCHA: Frontend Comercial usava MOCK data (2026-03-25)

`fetchConversations()` em `src/lib/conversations.ts` retornava `generateMockConversations()`.
Fix: atualizado para usar `fetchSheetCached('conversas')` com conversao de timestamps Unix para ISO.

---

## GOTCHA: gviz endpoint corrompido para Google Ads (2026-03-25)

**Problema:** A aba "Google Ads" do spreadsheet usava `gviz/tq?tqx=out:csv&sheet=...` que retorna headers corrompidos — cada célula contém `"header_name valor1 valor2"` em vez de só o nome. O `headers.indexOf('spend')` retornava -1, tornando todos os valores 0.

**Causa:** gviz é um endpoint de visualização, não exportação pura. Interpreta os dados diferentemente.

**Fix aplicado em `sheetsApi.ts`:**
```ts
// ANTES (quebrado):
const SHEET_NAMES = { googleads: 'Google Ads', googleadskeywords: 'Google Ads Keywords' };
// → usava gviz endpoint que corrompeu headers

// DEPOIS (correto):
const SHEET_GIDS = {
  ...
  googleads: 218927892,           // GID real da aba "Google Ads"
  googleadskeywords: 1174978175,  // GID real da aba "Google Ads Keywords"
};
// → usa export?format=csv&gid= que retorna CSV limpo
```

**Regra:** SEMPRE usar `export?format=csv&gid=` para buscar dados de Google Sheets. NUNCA usar `gviz/tq?tqx=out:csv` para dados brutos — só funciona para visualizações.

**Como obter GID:** Via Sheets API: `sheets.spreadsheets.get({ fields: 'sheets.properties.sheetId,sheets.properties.title' })`

---

## GOTCHA: LEADS INFLADOS no dashboard (2026-03-25 auditoria)

**Problema detectado:** Dashboard mostrava 143 leads, Meta UI mostrava ~50.

**Causa raiz em `src/lib/campaigns.ts` linha 66:**
```ts
// ERRADO — soma form leads + messaging conversations:
const totalLeads = campaigns.reduce((sum, c) => sum + (c.leads || 0) + (c.messagingConversations || 0), 0);
```

`messagingConversations` = conversas WhatsApp iniciadas (≈90 em março/26) — NÃO são leads.
`leads` = form fills reais (≈50 em março/26) — o que a Meta UI mostra.

**Fix aplicado:**
```ts
// CORRETO — só form leads:
const totalLeads = campaigns.reduce((sum, c) => sum + (c.leads || 0), 0);
```

**Impacto:** CPL correto passou de R$16,67 → ~R$47 (real). ROAS e demais métricas também ajustadas.

**Regra:** `messagingConversations` nunca deve entrar no total de leads. São conversas, não leads.

---

## GOTCHA: CPO GANHO usava filtro errado (2026-03-25)

Em `Principal.tsx`, `cpoWon` usava `oppStats.won` (filtrado por `createdAt`).
Card "GANHAS" usava `wonOpportunities.length` (filtrado por `lastStatusChangeAt`).
Fix: `cpoWon = wonOpportunities.length > 0 ? totalSpend / wonOpportunities.length : 0`

---

## Tags de Produto GHL (2026-03-25)

Dr. Erico tem 3 tipos de produto, diferenciados por tags no contato GHL:
- `"assessoria"` → receita recorrente → entra no MRR e ARR
- `"consulta"` → receita pontual → NÃO entra no MRR/ARR
- `"pacote de documentos"` → receita pontual → NÃO entra no MRR/ARR
- `[]` sem tag → oportunidades antigas sem classificação → NÃO entram no MRR/ARR

**Implementação no frontend (`Principal.tsx`):**
```ts
const assessoriaOpportunities = wonOpportunities.filter(o =>
  o.contactTags.includes('assessoria')
);
const mrrValue = assessoriaOpportunities.reduce((sum, o) => sum + o.monetaryValue, 0);
// MRR usa mrrValue, ARR usa mrrValue * 12
// wonValue (Faturamento total) continua incluindo todos os tipos
```

**Campo no sheet:** `opportunity_contact_tags` → `contactTags` no frontend (parseTags).

---

## Lead Scoring (2026-03-25)

**Aba criada:** `LeadScoring` — GID `947019850`
**Sync:** `syncLeadScoring(client)` em `dashboard-sheets-syncer.js` — etapa 6 do syncClient
**Fonte:** SQLite local (`ghl-conversations.db` + `ghl-crm.db`) via `better-sqlite3`
**296 linhas** no primeiro sync (todos os leads com contact_id)
**Frontend:** `src/lib/leadScoring.ts` (scoring) + `src/pages/LeadScoring.tsx` (UI)
**Rota:** `/comercial/lead-scoring`
**Algoritmo:** 5 dimensoes: Volume(20) + Ratio(15) + Recencia(20) + Conteudo(25) + Pipeline(15) + Unread(5) = max 100pts
**Tiers:** Hot(75+) Quente(55+) Morno(35+) Frio(<35)

---

## FEEDBACKS DO ERIC — Dashboard (2026-03-25)

1. **Oportunidades: Principal mostra 78, GHL filtrado mostra 65** → investigar discrepância de contagem
2. **Meta Ads gasto R$10-20 de diferença** → timing do sync (campanhas ativas continuam gastando entre syncs)
3. **Google Ads mostra R$0 mas já investiu hoje** → bug crítico, dados não sincronizando
4. **"Custo por oportunidade todas" — Eric não entendeu o que é** → falta tooltip explicando o cálculo
5. **Tooltips em TODOS os indicadores** → ao passar o mouse no ícone, mostrar como o número é calculado
6. **Pipeline stages: mostrar todos mesmo vazios** → não omitir etapas com zero oportunidades

---

## Dados validados (2026-03-25)

### Fevereiro 2026
| Fonte | Metrica | Valor |
|-------|---------|-------|
| Meta Ads | Spend | R$ 2.078,45 |
| Meta Ads | Leads | 29 (+ 53 msg convos = 82 total) |
| Meta Ads | CPL | R$ 25,35 (total contacts) |
| GHL | Oportunidades criadas | 43 |
| GHL | Won (por status change) | 7 (R$ 16.800) |

### Marco 2026
| Fonte | Metrica | Valor |
|-------|---------|-------|
| Meta Ads | Spend | R$ 2.350,36 |
| Meta Ads | Leads | 49 + 90 msg convos = 139 total |
| Google Ads | Spend | R$ 211,69 |
| Google Ads | Conversions | 7 |
| GHL | Oportunidades | 86 |
| GHL | Won em marco | 1 (R$ 500) |
| GHL | Conversas | 93 (marco) / 220 (total) |
