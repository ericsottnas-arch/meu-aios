# Guia de Integração: Campaigns Exporter

**Data:** 25 de fevereiro de 2026
**Status:** ✅ Implementação Completa

## 📋 Visão Geral

O **Campaigns Exporter** sincroniza dados de campanhas de mídia paga (Meta Ads API + Google Sheets) em três formatos:

1. **RESUMO.md** — Markdown legível para agentes e equipe
2. **data.json** — Dados estruturados para automação
3. **data.xlsx** — Excel com 3 abas para análise visual

Sincronização automática a cada **4 horas** + endpoints REST para consultas em tempo real.

## 🗂️ Estrutura de Arquivos Criados

### Novos Módulos

```
meu-projeto/
├── lib/
│   └── campaigns-exporter.js  (NEW) 650+ linhas
└── celo-agent-server.js       (ATUALIZADO) +140 linhas
```

### Estrutura de Dados (por Cliente)

```
docs/clientes/{clientId}/campaigns/
├── RESUMO.md                 ← Markdown legível
├── data.json                 ← JSON estruturado
├── data.xlsx                 ← Excel (3 abas)
├── meta-campaigns.json       ← Raw backup
└── sheets-data.json          ← Raw backup
```

### Exemplo: Dr. Erico Servano

```
docs/clientes/dr-erico-servano/campaigns/
├── RESUMO.md (873 B)
├── data.json (2.2 KB)
└── data.xlsx (9.2 KB)
```

## 🔌 Endpoints REST

### Sincronização Manual

```bash
# Exportar campanhas de um cliente (synchronous)
GET /api/campaigns/export/:clientId

# Response:
{
  "success": true,
  "message": "Campanhas de dr-erico-servano exportadas com sucesso",
  "timestamp": "2026-02-25T23:37:09.629Z"
}
```

### Consultar Dados

```bash
# Retorna JSON estruturado
GET /api/campaigns/data/:clientId

# Retorna Markdown
GET /api/campaigns/summary/:clientId

# Status de sincronização
GET /api/campaigns/sync-status
```

### Sincronização Assincronizada

```bash
# Enfileirar sincronização de cliente específico
POST /api/campaigns/sync/:clientId

# Sincronizar TODOS os clientes em background
POST /api/campaigns/sync-all
```

## 📊 Formato de Dados JSON

```json
{
  "clientId": "dr-erico-servano",
  "clientName": "Dr Erico Servano",
  "exportedAt": "2026-02-25T23:37:09.629Z",
  "period": "last_7d",

  "meta": {
    "campaigns": [
      {
        "id": "123456789",
        "name": "[Syra] Harmonização Facial [Formulário] [ABO]",
        "status": "ACTIVE",
        "objective": "OUTCOME_LEADS",
        "dailyBudget": 50,
        "createdTime": "2026-02-25T23:37:09.629Z",
        "metrics": {
          "impressions": 12450,
          "clicks": 345,
          "spend": 287.50,
          "cpc": 0.83,
          "ctr": 2.77,
          "conversions": 28,
          "costPerResult": 10.27,
          "cpm": 23.09
        },
        "adsets": []
      }
    ],
    "summary": {
      "totalCampaigns": 2,
      "activeCampaigns": 1,
      "totalSpend": 703.25,
      "avgCPL": 31.12,
      "totalImpressions": 21350,
      "totalClicks": 560
    }
  },

  "synthesis": {
    "topPerformers": [...],
    "opportunities": [...],
    "nextSteps": [...]
  }
}
```

## 📈 Arquivo Excel (data.xlsx)

### Aba 1: Campanhas
Colunas: ID | Nome | Status | Objetivo | Budget | Impressões | Cliques | Gasto | CPL | Conversões | ROAS | CTR | CPM | Observações

**Formatação:**
- Headers em azul (#1F4788) com texto branco
- Linhas alternadas em cinza claro
- Conditional formatting: CPL baixo = verde, alto = vermelho
- Status ativo = verde, pausado = amarelo
- Frozen panes (headers sempre visíveis)
- Formatação de moeda em BRL

### Aba 2: Conjuntos (Adsets)
Colunas: ID | Nome | Campanha | Status | Budget | Público-alvo | Impressões | Cliques | Conversões | CPL | Frequência | Performance

### Aba 3: Criativos
Colunas: ID | Nome/Hook | Campanha | Formato | CTA | Impressões | Cliques | CTR | CPL | Status | Performance

## 🤖 Novos Comandos nos Agentes

### Media-Buyer (Celo) - `@media-buyer`

```
*campaign-data {client}              ← Fetch dados completos
*campaign-performance {client} {período}  ← Análise com trends
*campaign-creatives {client}         ← Listar criativos
*campaign-audiences {client}         ← Listar públicos
*sync-campaigns {client}             ← Sincronizar manualmente
```

### Copy-Chef - `@copy-chef`

```
*client-campaigns {client}           ← Campanhas vencedoras para insights
*campaign-insights {client}          ← Extrair hooks, CTAs, patterns
*audience-research {client}          ← Análise de segmentação
```

## ⚙️ Scheduler Automático

- **Intervalo:** 4 horas
- **Trigger:** Automático no startup + a cada 4h
- **Clientes:** Sincroniza todos simultaneamente
- **Logs:** Exibidos no console do servidor Celo

```javascript
// Iniciado em celo-agent-server.js startup
setInterval(async () => {
  console.log('📊 Sincronizando campanhas (scheduler)...');
  await campaignsExporter.syncAllClients();
}, 4 * 3600 * 1000);
```

## 🔧 Como Usar

### 1. Inicializar o Servidor Celo

```bash
cd meu-projeto
npm start  # Inicia celo-agent-server.js
```

**Output esperado:**
```
📊 Sincronizando campanhas (startup)...
✅ Sincronização inicial completa
📊 Sincronizando campanhas (scheduler)...
— Celo online. Dados nao mentem.
```

### 2. Consultar Dados via API

```bash
# Exportar/atualizar campanhas
curl http://localhost:3002/api/campaigns/export/dr-erico-servano

# Ler dados já exportados (JSON)
curl http://localhost:3002/api/campaigns/data/dr-erico-servano | jq '.meta.summary'

# Ler Markdown
curl http://localhost:3002/api/campaigns/summary/dr-erico-servano

# Status
curl http://localhost:3002/api/campaigns/sync-status
```

### 3. Copy-Chef Consulta Campanhas para Insights

```
@copy-chef
*client-campaigns dr-erico-servano
# Lê RESUMO.md localmente e extrai:
# - Campanhas vencedoras
# - Hooks que funcionam
# - CTAs efetivos
# - Públicos-alvo

*campaign-insights dr-erico-servano
# Analisa patterns de copy bem-sucedidos
```

### 4. Media-Buyer Monitora Performance

```
@media-buyer
*campaign-data dr-erico-servano
# Exibe resumo das campanhas

*campaign-performance dr-erico-servano last_30d
# Análise detalhada com trends

*sync-campaigns dr-erico-servano
# Sincroniza manualmente (em background)
```

## 📁 Arquivos Modificados

1. **meu-projeto/lib/campaigns-exporter.js** (NEW)
   - 650+ linhas
   - Classe `CampaignsExporter`
   - Métodos: `exportClientCampaigns()`, `fetchFromMetaAds()`, `saveToJSON()`, `saveToMarkdown()`, `saveToExcel()`, etc.

2. **meu-projeto/celo-agent-server.js** (ATUALIZADO)
   - Require do CampaignsExporter (linha 42)
   - Instância `campaignsExporter` (linha 47)
   - 6 novos endpoints `/api/campaigns/*` (linhas 1441-1555)
   - Scheduler de sincronização (linhas 1857-1878)

3. **.claude/commands/AIOS/agents/media-buyer.md** (ATUALIZADO)
   - 5 novos comandos para campanhas (linhas 213-227)

4. **.claude/commands/AIOS/agents/copy-chef.md** (ATUALIZADO)
   - 3 novos comandos para insights de campanhas (linhas 285-292)

5. **package.json** (ATUALIZADO)
   - `exceljs` adicionado (npm install exceljs)

## 🔄 Fluxo de Dados

```
Meta Ads API + Google Sheets
           ↓
    CampaignsExporter
           ↓
    ┌──────┴──────┬─────────┐
    ↓             ↓         ↓
 RESUMO.md   data.json  data.xlsx
    ↓             ↓         ↓
  Copy-Chef   Automação  Análise Visual
    ↓             ↓         ↓
 Insights   APIs REST   Excel Browser
```

## 🧪 Testes Executados

✅ **Teste 1:** Inicialização do CampaignsExporter
✅ **Teste 2:** Status de sincronização
✅ **Teste 3:** Síntese de dados (mock)
✅ **Teste 4:** Salvamento de arquivos (JSON, Markdown, Excel)
✅ **Teste 5:** Verificação de arquivos criados
✅ **Teste 6:** Validação de conteúdo

**Resultado:** Todos os testes passaram ✅

## 📦 Dependências

- `exceljs` (npm install exceljs) — Geração de arquivos Excel
- `googleapis` (já existente) — Google Sheets API
- `facebook-nodejs-business-sdk` (já existente) — Meta Ads API

## 🚀 Próximas Melhorias (Futuro)

1. **Implementar `getCampaignAdsets()` e `getCampaignCreatives()`** em `meta-ads.js`
   - Preencherá abas 2 e 3 do Excel com dados reais

2. **Adicionar filtros de data** aos endpoints
   - `/api/campaigns/data/:clientId?period=last_30d`

3. **Implementar cache mais sofisticado**
   - Redis para sincronizações em larga escala

4. **Adicionar webhooks** para Copy-Chef e Media-Buyer
   - Notificações em tempo real de novas oportunidades

5. **Exportar em Google Sheets**
   - Compartilhar RESUMO.md automaticamente

## 📞 Suporte

- **Arquivo:** `lib/campaigns-exporter.js`
- **Endpoints:** `/api/campaigns/*` (linha 1441 em `celo-agent-server.js`)
- **Scheduler:** Inicia automaticamente com o servidor Celo
- **Logs:** Console do servidor Celo

---

**Implementação concluída em:** 25 de fevereiro de 2026
**Versão:** 1.0
**Mantido por:** Claude Code + Synkra AIOS
