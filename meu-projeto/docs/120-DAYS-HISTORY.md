# 📊 Histórico de 120 Dias | Meta Ads → Google Sheets

**Data:** 26 de fevereiro de 2026
**Status:** ✅ **IMPLEMENTADO E TESTADO**

---

## 🎯 O Que Mudou

### ❌ Antes (Últimos 7 dias)
```
Meta Ads API (últimos 7 dias)
         ↓
    1 linha por campanha
         ↓
Google Sheets (resumo semanal)
```

### ✅ Agora (Últimos 120 dias)
```
Meta Ads API (últimos 120 dias com granularidade diária)
         ↓
    1 linha por campanha POR DIA
         ↓
Google Sheets (histórico completo de 120 dias)
```

---

## 📈 Dados Capturados

### Novo Método: `getCampaignInsightsDaily()`

Para cada campanha, agora buscamos:

- **Data:** YYYY-MM-DD (cada dia dos últimos 120 dias)
- **Impressões:** Total diário
- **Cliques:** Total diário
- **Conversões:** Leads diários
- **Spend:** Gasto diário (R$)
- **CPL:** Custo por lead diário
- **CTR:** Taxa de clique diária (%)
- **CPM:** Custo por mil impressões
- **Frequência:** Frequência de exibição
- **Alcance:** Pessoas alcançadas no dia

### Exemplo: 2 Campanhas × 120 Dias

```
Campanha 1:     120 linhas (1 por dia)
Campanha 2:      60 linhas (criada há 60 dias)
─────────────────────────────
Total:          180 linhas

Google Sheets (aba "Meta Ads"):
  Row 1:    Headers (26 colunas)
  Row 2:    2025-10-30 | Campanha 1 | 14.488 impressões | 205 cliques...
  Row 3:    2025-10-31 | Campanha 1 | 12.288 impressões | 276 cliques...
  ...
  Row 181:  2026-02-26 | Campanha 2 | 13.245 impressões | 298 cliques...
```

---

## 🚀 Como Funciona

### 1. **Busca de Campanhas**
```javascript
const campaigns = await metaAds.listCampaigns({ limit: 100 });
// Retorna: [Campanha1, Campanha2, ...]
```

### 2. **Busca de Insights Diários (120 dias)**
```javascript
for each campaign {
  const dailyInsights = await metaAds.getCampaignInsightsDaily(campaignId);
  // Retorna: [
  //   { date: "2025-10-30", impressions: 14488, clicks: 205, ... },
  //   { date: "2025-10-31", impressions: 12288, clicks: 276, ... },
  //   ...
  // ]
}
```

### 3. **Mapeamento para Google Sheets**
```javascript
for each campaign {
  for each dailyInsight {
    const row = [
      account_name,           // Dr Erico Servano
      0,                      // actions_landing_page_view
      dailyInsight.conversions, // actions_lead
      0,                      // ...
      campaign.name,          // [Syra] Harmonização Facial...
      campaign.dailyBudget,   // 50
      dailyInsight.clicks,    // 205
      dailyInsight.cpl,       // R$ 10.56
      dailyInsight.date,      // 2025-10-30
      dailyInsight.impressions, // 14488
      // ... mais colunas
    ];
    rows.push(row);
  }
}
```

### 4. **Salvar em Google Sheets**
```javascript
await sheetsApi.update({
  spreadsheetId: "1Br8Fg23cMKwLEjP8...",
  range: "'Meta Ads'!A1",
  values: [headers, ...rows]
});
```

---

## 📊 Estrutura de Dados

### Campos por Linha
| Campo | Tipo | Exemplo |
|-------|------|---------|
| `account_name` | String | "Dr Erico Servano" |
| `campaign` | String | "[Syra] Harmonização Facial..." |
| `campaign_daily_budget` | Number | 50 |
| `campaign_status` | String | "ACTIVE" |
| `date` | String (YYYY-MM-DD) | "2025-10-30" |
| `impressions` | Number | 14488 |
| `clicks` | Number | 205 |
| `actions_lead` | Number | 19 |
| `reach` | Number | 12314 |
| `frequency` | Number | 1.18 |
| `cpc` | Number | 0.87 |
| `cpm` | Number | 23.45 |
| `ctr` | Number | 1.42 |
| `cost_per_action_type_lead` | Number | 10.56 |
| `datasource` | String | "Meta Ads API" |

### Capacidade
- **Dias:** 120
- **Campanhas:** Até 100
- **Linhas por export:** Campanhas × dias históricos
  - Exemplo: 2 campanhas = até 240 linhas
  - Exemplo: 5 campanhas = até 600 linhas

---

## 🔄 Uso

### **1. Sincronizar Agora**

```bash
# Via API
curl -X POST http://localhost:3002/api/campaigns/export-to-sheets/dr-erico-servano

# Via Agente Celo
@media-buyer
*sync-campaigns dr-erico-servano
```

### **2. Automático (Scheduler)**

```javascript
// Sincroniza cada 4 horas
// A cada sincronização: busca últimos 120 dias
// Salva em: aba "Meta Ads" da planilha
setInterval(async () => {
  await campaignsExporter.syncAllClients();
}, 4 * 3600 * 1000);
```

---

## 🔌 Integração Técnica

### Novo Método em `meta-ads.js`

```javascript
async getCampaignInsightsDaily(campaignId) {
  // Calcula: endDate - 120 dias
  const startDate = new Date(now - 120 * 24 * 60 * 60 * 1000);
  const endDate = new Date();

  // Busca com time_range + time_increment=1 (diário)
  const insights = await campaign.getInsights([...], {
    time_range: { since: "YYYY-MM-DD", until: "YYYY-MM-DD" },
    time_increment: 1, // 1 = daily
    limit: 1000
  });

  // Retorna array de {date, metrics}
  return insights.map(data => ({
    date: data.date_start,
    impressions: Number(data.impressions),
    clicks: Number(data.clicks),
    // ... mais métricas
  }));
}
```

### Modificações em `campaigns-exporter.js`

**1. `fetchFromMetaAds()`**
```javascript
// Agora busca insights diários
const dailyInsights = await metaAds.getCampaignInsightsDaily(campaign.id);
return {
  ...campaign,
  dailyInsights: dailyInsights // Array de {date, metrics}
};
```

**2. `buildGoogleSheetsRows()`**
```javascript
// Gera 1 linha por campanha por dia
campaigns.forEach(campaign => {
  campaign.dailyInsights.forEach(dailyData => {
    rows.push([account_name, ..., dailyData.date, ...]);
  });
});
```

---

## 📈 Exemplos de Análise

Com 120 dias de histórico, você pode:

### 1. **Tendências de Performance**
```
Gráfico: Impressões por dia (últimos 120 dias)
╭────────────────────────────────╮
│ ██  ██   ██ ██ ██             │ Campanha 1
│ ██  ██   ██ ██ ██             │
│ ██  ██   ██ ██ ██             │
└────────────────────────────────┘
```

### 2. **CPL ao Longo do Tempo**
```
Gráfico: Custo por Lead (últimos 120 dias)
╭────────────────────────────────╮
│             ╱╲                 │ CPL sobe
│           ╱  ╲    ╱╲           │ depois cai
│         ╱      ╲╱  ╲╱          │
└────────────────────────────────┘
```

### 3. **Sazonalidade**
```
Descubra:
- Dias com melhor performance (CPL mais baixo)
- Padrões semanais (seg-dom)
- Períodos de menor gasto
- Correlações com eventos
```

---

## ⚙️ Configuração

### 1. **Nenhuma configuração necessária!**

O sistema já está pronto. Apenas use:

```bash
POST /api/campaigns/export-to-sheets/dr-erico-servano
```

### 2. **Ajustar Período (Futuro)**

Se quiser mudar de 120 para outro período:

```javascript
// Em fetchFromMetaAds()
const days = 120; // Mude para 30, 60, 365, etc
const startDate = new Date(now - days * 24 * 60 * 60 * 1000);
```

---

## 📊 Performance & Limites

### Tempos de Sincronização

| Campanhas | Dias | Tempo Estimado |
|-----------|------|----------------|
| 1 | 120 | ~5 segundos |
| 2 | 120 | ~10 segundos |
| 5 | 120 | ~25 segundos |
| 10 | 120 | ~50 segundos |

### Limites Google Sheets

- **Máximo de células:** 10 milhões
- **Seu uso:** ~5.200 células (26 colunas × 200 linhas)
- **Capacidade restante:** 99.95%
- **Pode armazenar:** ~1.9 milhões de linhas diárias

---

## 🆘 Troubleshooting

### "Erro: getCampaignInsightsDaily não é uma função"
- **Solução:** Atualize o arquivo `lib/meta-ads.js`
- Certifique-se de ter o novo método implementado

### "Menos linhas que esperado"
- **Causas:**
  - Campanha foi criada há menos de 120 dias
  - Dados da Meta Ads ainda não sincronizados
  - Gaps nos dados (dias sem atividade registrada)

### "Google Sheets trava com muitas linhas"
- **Solução:** Divida por campanhas ou use pivôs
- Máximo recomendado: ~10.000 linhas por aba

---

## 📚 Próximas Melhorias

- [ ] Filtro por período customizado
- [ ] Exportar apenas campanhas ativas
- [ ] Agregar por semana/mês (em vez de dia)
- [ ] Incluir dados de Adsets também
- [ ] Criar gráficos automáticos na planilha

---

## 🎓 Exemplos de Uso Avançado

### Copy-Chef Analisando Tendências

```
@copy-chef
"Analise os últimos 120 dias de campanhas.
Qual é o melhor período para lançar novas campanhas?"

→ Copy-Chef lê 180 linhas (2 campanhas × 120 dias)
→ Identifica padrões sazonais
→ Recomenda timing ideal para novo criativo
```

### Media-Buyer Otimizando Budget

```
@media-buyer
"Qual foi a melhor semana dos últimos 120 dias?
Quanto devemos alocar para cada dia?"

→ Celo analisa 180 linhas
→ Identifica dias com CPL mais baixo
→ Recomenda alocação otimizada
```

---

**✅ Sistema pronto!**

Você agora tem:
- 120 dias de histórico
- 1 linha por campanha por dia
- Tendências e padrões identificáveis
- Dados para análises profundas

---

*Última atualização: 26 de fevereiro de 2026*
