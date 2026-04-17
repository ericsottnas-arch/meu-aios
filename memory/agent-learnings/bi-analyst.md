# Aprendizados do Agente: @bi-analyst (Avinash)

> Feedbacks do Eric acumulados ao longo das sessoes.
> Leitura OBRIGATORIA antes de qualquer tarefa.
> Regras sao cumulativas — nunca remover, so adicionar.

---

### [2026-04-09] Aprendizado: @media-buyer (Celo) constrói dashboards com outros agentes

- **Contexto:** Eric instruiu ao ativar @bi-analyst pela primeira vez e tentar analisar o dashboard do cliente Servano (servanoadvogados.syradigital.com)
- **Instrução exata do Eric:** "o celo que é nosso agente de media buyer faz junto com outros agentes a construção dos dash conversa com eles pra pegar os acessos e tudo mais sobre"
- **Regra derivada:** @bi-analyst NUNCA deve tentar acessar dashboards de clientes de forma isolada. SEMPRE coordenar primeiro com @media-buyer (Celo) para:
  1. Obter credenciais e acesso ao dashboard
  2. Entender o contexto das campanhas e métricas configuradas
  3. Alinhar sobre o que cada indicador representa naquele cliente específico
  4. Obter qualquer dado adicional que não esteja visível no dashboard
- **Estrutura de colaboração:** @media-buyer constrói e mantém os dashboards em colaboração com outros agentes. @bi-analyst é o analista que interpreta e audita — mas o acesso e contexto vem de @media-buyer.
- **Severidade:** HIGH

### [2026-04-09] Aprendizado: Estrutura técnica dos dashboards Syra Digital

- **Contexto:** Exploração do codebase para entender como os dashboards dos clientes são construídos
- **Localização:** `/Users/ericsantos/meu-aios/dashboards/` — contém `servano/` e `gabrielle/`
- **Stack:** React + TypeScript + Recharts
- **Fontes de dados:** Meta Ads API, Google Ads, GHL (oportunidades via CRM)
- **Dashboard Servano (`/dashboards/servano/src/pages/Principal.tsx`):**
  - Custos fixos hardcoded: assessoria R$3.597 + hospedagem R$147 = R$3.744/mês
  - MRR = apenas oportunidades com tag "assessoria" que foram ganhas
  - ROAS = wonValue / metaSpend (não investimento total)
  - ROI = (wonValue - totalInvestment) / totalInvestment × 100
  - Churn Rate: hardcoded como "0,0%" (sem dados reais ainda)
  - Bug histórico (já corrigido): totalLeads somava leads + messagingConversations (WhatsApp não são form leads)
- **Regra derivada:** Antes de auditar qualquer dashboard, ler o código-fonte do frontend para entender EXATAMENTE como cada métrica é calculada. Cálculos divergem das definições padrão (ex: ROAS usa só Meta, não investimento total).
- **Severidade:** HIGH

### [2026-04-09] Aprendizado: Acesso ao dashboard requer sessão ativa no browser

- **Contexto:** Tentativa de analisar servanoadvogados.syradigital.com via WebFetch retornou conteúdo vazio — é SPA + requer autenticação
- **Regra derivada:** Dashboards dos clientes são SPAs protegidos por login. Para capturar screenshots ou dados reais, usar cliclick + screencapture + osascript no Chrome já aberto com sessão ativa. NUNCA usar WebFetch ou Playwright separado para dashboards autenticados.
- **Referência:** Ver `memory/agent-learnings/media-buyer.md` — Celo tem regra idêntica (2026-03-25)
- **Severidade:** HIGH

### [2026-04-09] Aprendizado: Google Sheet dos dashboards é acessível via CSV export direto

- **Contexto:** Tentativa de analisar o dashboard do Servano sem login
- **Descoberta:** As Google Sheets usadas como backend dos dashboards são públicas (exportáveis sem auth via URL de export)
- **Padrão de acesso:** `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv&gid={GID}`
- **Servano Sheet ID:** `1Br8Fg23cMKwLEjP8dbsz2DRIjwPoRSNoDu47SoX2FW0`
- **GIDs:** conversas=336058686, oportunidades=627957506, metaads=547721519, googleads=218927892, googleadskeywords=1174978175
- **IMPORTANTE:** Usar sempre `export?format=csv&gid=` (NÃO usar `gviz/tq?tqx=out:csv` — causa headers corrompidos)
- **IMPORTANTE:** O campo `spend` no Google Ads usa vírgula como decimal (ex: `29,654143` = R$29,65) — converter com `.replace(',', '.')`
- **Regra derivada:** Para análises rápidas dos dashboards Syra, posso acessar a Sheet diretamente via Bash + python3/curl + csv. Não preciso de login para VER os dados brutos.
- **Severidade:** HIGH

### [2026-04-09] Análise: Situação crítica Servano Março/2026

- **Diagnóstico:** Ruptura severa no funil — mais gasto (+45%) + mais leads (+169%) = menos receita (-97% vs fev)
- **Métricas chave:** ROAS=0.17x | Win Rate=0.9% | CAC=R$7.195 | 88 opps abertas com R$0 valor
- **Fevereiro foi excepcional:** ROAS=8.08x | Win Rate=15.6% | CAC=R$832 (7 deals fechados)
- **Hipótese principal:** CPL caiu (R$72→R$39) sinalizando audiência expandida/menos qualificada. Problema de qualidade de lead, não de volume.
- **Dado crítico:** 11 deals ganhos total — 3 vieram de "Direct", 2 de "Indicação". Orgânico/indicação converte muito mais que paid.
- **Ação pendente:** Auditar 88 opps abertas de março (todas com R$0 valor) + revisar processo de qualificação
- **Severidade:** CRITICAL (situação ativa do cliente)

---

## Dashboards de Clientes — Referência Técnica

| Cliente | URL | Codebase | Sheet ID | Status |
|---------|-----|----------|----------|--------|
| Dr. Erico Servano | servanoadvogados.syradigital.com | `/dashboards/servano/` | `1Br8Fg23cMKwLEjP8dbsz2DRIjwPoRSNoDu47SoX2FW0` | live |
| Dra. Gabrielle | gabrielle.syradigital.com | `/dashboards/gabrielle/` | `1EtgCOs2DuucNJVh-mGWmJ-RQk9chHfrw2QKuy7Z9dlU` | live (deployado 2026-04-09) |

Para acesso: coordenar com @media-buyer (Celo) antes de qualquer análise.

---

### [2026-04-09] Setup completo — Dashboard Dra. Gabrielle

**O que foi feito nesta sessão:**
- Arquivo `gabrielle-dashboard.tar.gz` extraído de VPS e organizado em `/Users/ericsantos/meu-aios/dashboards/gabrielle/`
- Bug corrigido: `AuthContext.tsx` chamava `/api/validate-login` (rota relativa inválida) → corrigido para `${VITE_SUPABASE_URL}/functions/v1/validate-login` com header `apikey` (mesmo padrão do Servano)
- Bug corrigido: `supabase/functions/validate-login/index.ts` usava Spreadsheet ID do Servano → corrigido para ID da Gabrielle
- `celo-clients.json`: `spreadsheetId` da Gabrielle estava vazio → setado para `1EtgCOs2DuucNJVh-mGWmJ-RQk9chHfrw2QKuy7Z9dlU`
- Sync executado manualmente: 351 linhas Meta Ads, 150 oportunidades, 203 conversas, 414 leads no LeadScoring
- Planilha compartilhada com visualização pública (necessário para o frontend ler via CSV)
- Build + deploy na VPS: `/root/apps/gabrielle-dashboard-src/dist/`
- Domínio já existia no Caddyfile: `gabrielle.syradigital.com` → live ✅

**Config técnica da Gabrielle:**
- `metaAdAccountId`: `act_1136892320236480`
- `ghlLocationId`: `3iNi7kJci5f0BNUoq4kX`
- Supabase project: `bfmpbjidnkbhusuziebn`
- Sem Google Ads
- Custos fixos no dashboard: assessoria R$1.300 + hospedagem R$147 = R$1.447/mês ✅ (corrigido 2026-04-09)
- Verba de mídia: R$1.500/mês — capturada via API real do Meta Ads (não entra nos fixedCosts)

**GIDs da planilha Gabrielle:**
- Campanhas (Meta Ads): `1301917712`
- Oportunidades: `422106097`
- Conversas: `1482294895`
- LeadScoring: `1308366247`

---

### [2026-04-09] Decisão arquitetural — Multi-tenant (pendente aprovação)

**Problema atual:** Cada cliente = codebase separado (fork manual). Não escala.

**Proposta aprovada pelo Eric:** Único app multi-tenant onde o subdomínio determina o cliente.

**Como funciona:**
1. App detecta `clientId` do subdomínio: `gabrielle` de `gabrielle.syradigital.com`
2. Busca `/configs/gabrielle.json` com config específica do cliente
3. Renderiza com: spreadsheetId, GIDs, logo, cores, custos fixos, metas do funil

**Config por cliente incluiria:**
```json
{
  "clientId": "gabrielle",
  "name": "Dra. Gabrielle Oliveira",
  "logo": { "initial": "G", "subtitle": "OLIVEIRA", "color": "#C9A87C" },
  "spreadsheetId": "1EtgCOs2...",
  "sheetGids": { "campanhas": 1301917712, "oportunidades": 422106097, ... },
  "fixedCosts": { "assessoria": 2900, "hospedagem": 147 },
  "funnelGoals": { "leads": 150, "mql": 100, "reuniao": 12, "ganho": 8 },
  "hasGoogleAds": false,
  "supabaseUrl": "...",
  "supabaseKey": "..."
}
```

**Novo cliente = 3 passos apenas:**
1. Criar `configs/{cliente}.json`
2. Adicionar 1 linha no Caddy
3. Adicionar no `celo-clients.json` (já fazemos)

**Status:** Aguardando @bi-analyst liderar implementação com @dev

---

### [2026-04-09] Ownership: @bi-analyst é responsável por dashboards

**Instrução do Eric (2026-04-09):** "@bi-analyst cuida disso a partir de agora"

**Responsabilidades do @bi-analyst nos dashboards Syra:**
1. Liderar arquitetura multi-tenant (implementar com @dev)
2. Definir quais KPIs devem estar em cada dashboard por tipo de cliente
3. Auditar métricas exibidas e garantir que são outcomes, não vanity
4. Coordenar sync de dados com @media-buyer
5. Onboarding de novos clientes: criar config + validar dados
6. Manutenção e evolução da estrutura de métricas

**Fluxo de colaboração:**
- @media-buyer (Celo): executa sync de dados e tem contexto de campanhas
- @dev (Dex): implementa mudanças de código no frontend
- @devops (Gage): deploy na VPS e configuração Caddy/DNS
- @bi-analyst (Avinash): define o que medir, audita, e lidera arquitetura
- **Severidade:** HIGH

---

### [2026-04-16] Dashboard Syra Digital (Agencia) criado

- **Contexto:** Eric pediu dashboard para a agencia, similar aos dashboards de clientes, mas adaptado para pipeline de prospeccao/vendas
- **O que foi feito:**
  1. Google Sheet criada: `1YhNggN18IecxJ0BllMO_D2IqSjwqF0xs2j-oP5TaZxw` (pasta Syra Digital/02. Comercial/)
  2. Tab "Oportunidades" populada com 71 opps de ambos pipelines via GHL API
  3. Tab "Conversas" criada (GID 2045759476) - a ser populada futuramente
  4. Syra Digital adicionada ao `celo-clients.json` como `syra-digital` com `isAgency: true`
  5. Dashboard frontend criado em `/dashboards/syra-agency/` (React + TypeScript + Recharts)
  6. 4 paginas: Visao Geral, Prospeccao (funil), Comercial (funil), Oportunidades (tabela)
  7. Build OK (913KB JS, 64KB CSS)

- **Dados reais encontrados (2026-04-16):**
  - Pipeline Prospeccao: 20 open, 1 won (Dr. Cleugo), 11 lost. Win Rate: 8.3%
  - Pipeline Marketing: 5 open (todos desqualificados), 11 won, 21 lost. Win Rate: 34.4%
  - Receita fechada Marketing: R$15.805 (Servano R$3.200, Gabrielle R$2.500, Vanessa R$2.500, Humberto R$1.394, Bruna R$3.000, Raissa R$2.000, etc)
  - TODOS os monetaryValues no pipeline Prospeccao = R$0 (ninguem setou valores)

- **GHL Config Syra Digital:**
  - Location: MmKHrppeW0M8EQ4M1noj
  - Pipeline Prospeccao: ePZNBwhee24q2yDE91pJ
  - Pipeline Marketing: AG9Kfmu2HOp8WsGOsOq4

- **Pendente:**
  - Deploy na VPS (precisa de @devops/Gage)
  - Sync automatico (integrar com dashboard-syncer existente)
  - Popular tab Conversas
  - Corrigir monetaryValues = 0 no pipeline Prospeccao
  - Dominio: sugestao syra.syradigital.com ou dash.syradigital.com

- **Severidade:** HIGH
