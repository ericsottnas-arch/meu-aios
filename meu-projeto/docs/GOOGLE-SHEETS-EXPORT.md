# Exportar Dados de Meta Ads para Google Sheets

## 📊 O Que Faz

Extrai dados de campanhas da **Meta Ads API** e preenche automaticamente a aba **"Meta Ads"** da sua planilha Google Sheets com as 26 colunas:

```
account_name, actions_landing_page_view, actions_lead,
actions_onsite_conversion_messaging_conversation_started_7d,
ad_name, adset_name, adset_start_time, adset_status,
campaign, campaign_daily_budget, campaign_status, clicks,
cost_per_action_type_landing_page_view, cost_per_action_type_lead,
cost_per_action_type_onsite_conversion_messaging_conversation_started_7d,
cost_per_thruplay_video_view, cpc, cpm, ctr, datasource, date,
frequency, impressions, link_clicks, reach, source
```

## 🔧 Configuração (Uma Única Vez)

### 1. Encontre o Email da Service Account

Abra o arquivo `google-service-account.json` no seu projeto:

```bash
cat meu-projeto/google-service-account.json | grep "client_email"
```

Resultado será algo como:
```
google-sheets-integration@aios-system-1.iam.gserviceaccount.com
```

### 2. Compartilhe sua Planilha Google Sheets

1. Abra: https://docs.google.com/spreadsheets/d/1Br8Fg23cMKwLEjP8dbsz2DRIjwPoRSNoDu47SoX2FW0/edit
2. Clique em **Compartilhar** (canto superior direito)
3. Cole o email da service account no campo de email
4. Dê permissão de **Editor**
5. Clique em **Compartilhar**

**✅ Pronto!** Agora a planilha está sincronizada com o sistema.

## 🚀 Como Usar

### Via API REST

**Exportar campanhas para Google Sheets:**
```bash
POST /api/campaigns/export-to-sheets/:clientId

# Exemplo:
curl -X POST http://localhost:3002/api/campaigns/export-to-sheets/dr-erico-servano

# Response:
{
  "success": true,
  "message": "Campanhas de dr-erico-servano exportadas para Google Sheets",
  "timestamp": "2026-02-26T10:30:45.123Z",
  "campaigns": 2,
  "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/1Br8Fg23cMKwLEjP8dbsz2DRIjwPoRSNoDu47SoX2FW0/edit#gid=0"
}
```

### Via Agente Celo

```
@media-buyer
*sync-campaigns dr-erico-servano
# Sincroniza automaticamente para Google Sheets
```

### Automático (Scheduler)

- **Sincroniza automaticamente a cada 4 horas**
- Primeira sincronização no startup do servidor
- Todos os clientes configurados são sincronizados simultaneamente

## 📋 Mapeamento de Colunas

| Coluna da Planilha | Fonte na Meta Ads API | Descrição |
|-------------------|----------------------|-----------|
| `account_name` | Client Name | Nome do cliente |
| `campaign` | Campaign Name | Nome da campanha |
| `campaign_daily_budget` | Daily Budget | Budget diário (R$) |
| `campaign_status` | Status | ACTIVE ou PAUSED |
| `clicks` | Clicks | Cliques totais |
| `impressions` | Impressions | Impressões totais |
| `reach` | Reach | Pessoas alcançadas |
| `frequency` | Frequency | Frequência média |
| `cpc` | CPC | Custo por clique |
| `cpm` | CPM | Custo por mil impressões |
| `ctr` | CTR | Taxa de clique (%) |
| `actions_lead` | Conversions | Conversões/Leads |
| `cost_per_action_type_lead` | Cost Per Conversion | Custo por lead (R$) |
| `date` | Export Date | Data do export (YYYY-MM-DD) |
| `datasource` | N/A | Sempre "Meta Ads API" |
| `source` | N/A | Sempre "CampaignsExporter" |
| Outras colunas | 0 | Vazias (esperando implementação futura) |

## 📊 Exemplo de Dados Exportados

Quando você executa o export, cada campanha se torna uma linha na planilha:

| account_name | campaign | campaign_daily_budget | campaign_status | clicks | impressions | cpm | ctr | actions_lead | cost_per_action_type_lead | date | datasource |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Dr Erico Servano | [Syra] Harmonização Facial [Formulário] [ABO] | 50 | ACTIVE | 345 | 12450 | 23.09 | 2.77 | 28 | 10.27 | 2026-02-26 | Meta Ads API |
| Dr Erico Servano | [Syra] Implante Dentário [Conversão] [CBO] | 75 | PAUSED | 215 | 8900 | 46.68 | 2.41 | 8 | 51.97 | 2026-02-26 | Meta Ads API |

## 🔄 Fluxo de Sincronização

```
Meta Ads API
     ↓
CampaignsExporter.exportClientCampaigns()
     ↓
Google Sheets API
     ↓
Aba "Meta Ads" Atualizada
     ↓
Copy-Chef & Media-Buyer
Consultam dados para insights
```

## 🐛 Troubleshooting

### Erro: "Insufficient Permission"
**Solução:** Certifique-se de que compartilhou a planilha com o email da service account com permissão de **Editor**.

### Erro: "Invalid Sheet Name 'Meta Ads'"
**Solução:** Verifique se a aba se chama exatamente **"Meta Ads"** (com espaço e maiúsculas). Se tiver outro nome, abra uma issue.

### Dados não aparecem
**Solução:**
1. Verifique se `spreadsheetId` está configurado no cliente (em `data/celo-clients.json`)
2. Verifique os logs do servidor: `npm start` mostra erros de sincronização
3. Teste manualmente: `curl http://localhost:3002/api/campaigns/export-to-sheets/dr-erico-servano`

## 📝 Logs de Sincronização

Todos os exports são registrados no console do servidor:

```
CampaignsExporter: Salvo data.json (dr-erico-servano)
CampaignsExporter: Salvo RESUMO.md (dr-erico-servano)
CampaignsExporter: Salvo data.xlsx (dr-erico-servano)
CampaignsExporter: ✅ Google Sheets atualizada para dr-erico-servano (2 linhas)
```

## 🔮 Futuras Melhorias

- [ ] Adicionar dados de Adsets (conjuntos) na planilha
- [ ] Adicionar dados de Criativos
- [ ] Adicionar filtros de data/período
- [ ] Sincronizar dados de vendas do CRM junto
- [ ] Criar charts automaticamente

---

**Configurado em:** 26 de fevereiro de 2026
**Status:** ✅ Pronto para usar
