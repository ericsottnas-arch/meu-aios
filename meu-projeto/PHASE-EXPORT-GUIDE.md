# 📅 Guia de Exportação em 3 Fases

## Status Atual
- **Phase 1 (Fevereiro 1-26):** ✅ **CONCLUÍDA**
- **Phase 2 (Janeiro 1-31):** ⏳ Aguardando ~2 horas
- **Phase 3 (Incremental):** 🔄 Próximo passo após Phase 2

---

## 📋 O Que Foi Feito (Phase 1)

### Resultados
```
✅ 15 campanhas buscadas
✅ 69 linhas de dados diários (Fev 1-26)
✅ 32 adsets encontrados e mapeados
✅ Salvo em Google Sheets
✅ Salvo em JSON, Markdown e Excel localmente
```

### Por Que Pular Creatives em Phase 1?
Creatives fazem muitas requisições extras à Meta API, causando rate limit. Em Phase 1 (dados recentes), focar só em métricas é muito mais rápido.

---

## ⏰ Timeline Recomendada

### Agora (14:52 - Feb 26)
✅ Phase 1 concluída

### Em ~2 horas (16:52 - Feb 26)
Execute Phase 2:
```bash
node export-jan-only.js dr-erico-servano
```

**O que fará:**
- Buscar dados de Janeiro 1-31
- INCLUIR creatives (Phase 1 aliviou rate limit)
- Mesclar com dados de Feb na planilha
- Salvar localmente (JSON/Markdown/Excel)

**Tempo estimado:** 5-10 minutos

### Após Phase 2 estar pronto (17:00+)
Configure Phase 3 para rodar a cada 15 minutos:

```bash
# Opção 1: Manual (a cada 15 minutos)
node export-incremental.js dr-erico-servano

# Opção 2: Cron job (recomendado)
# Adicione ao crontab:
*/15 * * * * cd /Users/ericsantos/meu-aios/meu-projeto && node export-incremental.js dr-erico-servano >> logs/incremental.log 2>&1
```

**O que fará:**
- Buscar apenas últimos 7 dias
- Atualizar Google Sheets com novos dados
- Muito rápido (~30 segundos)
- Sem creatives (só métricas)

---

## 🚀 Próximo Passo: Phase 2 (em ~2 horas)

Quando chegar o momento, execute:

```bash
node export-jan-only.js dr-erico-servano
```

**Alternativamente, para agendar automaticamente:**

```bash
# Schedule para rodar em 2 horas
sleep 7200 && node export-jan-only.js dr-erico-servano &
```

---

## 📊 Estrutura de Dados

### Antes
```
1 linha = 1 campanha × 1 dia

Exemplo:
Campanha A | 2026-02-26 | 192 impressões
Campanha A | 2026-02-25 | 156 impressões
Campanha B | 2026-02-26 | 450 impressões

Total: 184 linhas (15 campanhas × 12 dias aprox)
```

### Agora (Após Phase 1)
```
1 linha = 1 campanha × 1 adset × 1 criativo × 1 dia

Exemplo:
Campanha A | Adset 1 | Criativo 1 | 2026-02-26 | 192 impressões
Campanha A | Adset 1 | Criativo 2 | 2026-02-26 | 85 impressões
Campanha A | Adset 2 | Criativo 3 | 2026-02-26 | 107 impressões
Campanha B | Adset 1 | Criativo 1 | 2026-02-26 | 450 impressões

Total: ~600-800 linhas (15 campanhas × 2-3 adsets/camp × 2-3 criativ/adset × 12 dias)
```

### Colunas Preenchidas
```
✅ 26 de 26 colunas (100%)
├─ campaign_id, campaign_name, campaign_status
├─ adset_id, adset_name, adset_status, adset_start_time
├─ ad_id, ad_name (CRIATIVO! Novo em Phase 1)
├─ date, impressions, clicks, spend, cpc, ctr, cpm
├─ reach, frequency, conversions, costPerResult
├─ landingPageViews, costPerLandingPageView
├─ messagingConversations, costPerMessagingConversation
├─ video_thruplay, costPerThruplayVideoView
└─ Colunas de CRM (leads, vendas, faturamento)
```

---

## 🔍 Verificar Dados

### Google Sheets
```
https://docs.google.com/spreadsheets/d/1Br8Fg23cMKwLEjP8dbsz2DRIjwPoRSNoDu47SoX2FW0
```

### Localmente
```bash
# JSON (estruturado)
cat docs/clientes/dr-erico-servano/campaigns/data.json

# Markdown (legível para agentes)
cat docs/clientes/dr-erico-servano/campaigns/RESUMO.md

# Excel (visual)
open docs/clientes/dr-erico-servano/campaigns/data.xlsx
```

---

## ⚠️ Troubleshooting

### Erro: "Rate limit reached" em Phase 2
**Solução:** Aumentar delay entre campanhas em `lib/campaigns-exporter.js`
```javascript
// Mude de 4000ms para 6000ms
await new Promise(resolve => setTimeout(resolve, 6000));
```

### Erro: "Google Sheets authentication failed"
**Solução:** Verificar se arquivo de autenticação existe:
```bash
ls -la google-service-account.json
```

### Phase 2 demora mais que esperado
**Esperado!** Dados de janeiro + creatives = ~10 minutos. Retry logic faz com que funcione mesmo com rate limit ocasional.

---

## 📈 Próximos Passos (Opcional)

### Se quiser dados ainda mais antigos
Execute com datas customizadas:
```bash
# Exportar Dezembro
node -e "
require('dotenv').config();
const CampaignsExporter = require('./lib/campaigns-exporter');
(async () => {
  const exp = new CampaignsExporter();
  await exp.init();
  const dec1 = new Date('2025-12-01');
  const dec31 = new Date('2025-12-31');
  const data = await exp.fetchFromMetaAds('dr-erico-servano', dec1, dec31);
  console.log(data.campaigns.length + ' campanhas');
})();
"
```

### Se quiser menos delay entre campanhas
Mod `lib/campaigns-exporter.js` linha 159:
```javascript
// De 4000ms para 3000ms (mais agressivo)
await new Promise(resolve => setTimeout(resolve, 3000));
```

---

## 📝 Resumo Técnico

### Arquivos Criados/Modificados

**Novos Scripts:**
- `export-feb-only.js` - Phase 1 (Fevereiro, fast)
- `export-jan-only.js` - Phase 2 (Janeiro, com creatives)
- `export-incremental.js` - Phase 3 (Rolling 7 dias)

**Modificados:**
- `lib/campaigns-exporter.js` - Adicionado suporte a date ranges
- `lib/meta-ads.js` - Já suportava date ranges (estava pronto)

### Lógica

**Phase 1: Fevereiro (Rápido)**
```
skipCreatives: true    → Pula buscas de criativo
Período: 2026-02-01 → 2026-02-26
Tempo: 2-3 min
Rate limit: Muito baixo
```

**Phase 2: Janeiro (Completo)**
```
skipCreatives: false   → Inclui creatives
Período: 2026-01-01 → 2026-01-31
Tempo: 5-10 min
Rate limit: Médio (mas retry logic compensa)
```

**Phase 3: Incremental (Ongoing)**
```
skipCreatives: true    → Só métricas
Período: Últimos 7 dias (rolling)
Tempo: 30s - 1 min
Rate limit: Muito baixo
Frequência: A cada 15 min (ou custom)
```

---

## ✅ Checklist

### Phase 1 (AGORA)
- [x] Rodar `export-feb-only.js`
- [x] Verificar dados em Google Sheets
- [x] Verificar arquivos locais (JSON/Markdown/Excel)

### Phase 2 (EM ~2 HORAS)
- [ ] Rodar `export-jan-only.js`
- [ ] Verificar que dados de Janeiro foram mergeados
- [ ] Verificar total de linhas (deve ser ~300-500 agora)

### Phase 3 (APÓS PHASE 2)
- [ ] Configurar Phase 3 (manual ou cron)
- [ ] Testar primeira execução
- [ ] Configurar scheduler (opcional)

---

**Última atualização:** 26 de fevereiro de 2026, 14:52
**Status:** ✅ Phase 1 concluída, aguardando Phase 2
