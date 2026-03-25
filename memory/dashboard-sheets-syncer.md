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

## Dados validados (2026-03-25)

| Fonte | Metrica | Valor |
|-------|---------|-------|
| Meta Ads (3 meses) | Spend | R$ 6.560,13 |
| Meta Ads | Impressions | 265.436 |
| Meta Ads | Leads | 125 |
| Google Ads (30d) | Spend | R$ 198,34 |
| Google Ads | Clicks | 98 |
| Google Ads | Conversions | 7 |
| GHL | Oportunidades | 50.000 |
| GHL | Conversas | 5.000+ |
