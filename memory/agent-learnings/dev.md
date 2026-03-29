# Aprendizados do @dev

## 2026-03-16 Feedback: Documentos SEMPRE Google Docs nativo, NUNCA Word
- **Contexto:** Roteiros de conteúdo eram gerados como .docx via lib `docx`
- **Feedback:** Eric pediu para parar de criar documentos Word e usar apenas Google Docs nativo
- **Regra derivada:** TODOS os documentos gerados pelo sistema (roteiros, relatórios, etc.) devem ser criados como Google Docs nativos via API, NUNCA como .docx. A função `createGoogleDoc()` em `drive-access.js` é o padrão.
- **Severidade:** CRITICAL
- **Implementação:** `swipe-replicator.js > saveToRoteiros()` agora usa `createGoogleDoc()` com OAuth2. Fallback para .md local se API falhar.
- **Auth:** OAuth2 com `GOOGLE_DOCS_REFRESH_TOKEN` (conta do Eric). Service Account é fallback read-only.

## 2026-03-24 Arquitetura: DashboardSheetsSyncer + conflito CeloAgent

- **Contexto:** Implementação do sync de dados Meta Ads por nível de anúncio para Google Sheets
- **Decisão técnica:** `level=ad` com 1 chamada paginada por conta (não por campanha) → evita rate limit e retorna métricas reais por anúncio
- **Gotcha crítico:** CeloAgent rodava `campaignsExporter.syncAllClients()` a cada 15min, sobrescrevendo o tab com formato antigo. Fix: comentar `saveToGoogleSheets()` em `campaigns-exporter.js`
- **Regra derivada:** Quando dois processos PM2 escrevem no mesmo Google Sheets tab, sempre identificar o "dono" do tab e desabilitar o outro. Ver `memory/dashboard-sheets-syncer.md` para detalhes completos.
- **Severidade:** HIGH

## 2026-03-24 Feedback: Usar automacao browser (cliclick/Playwright) em vez de perguntar

- **Contexto:** Eric pediu para criar DNS record no Cloudflare. Em vez de usar Playwright para acessar o painel, fiquei perguntando credenciais
- **Feedback:** "voce mesmo pode acessar meu computador com playwright pra pegar isso... pq esta me perguntando isso?"
- **Regra derivada:** Quando precisar acessar paineis web (Cloudflare, Vercel, etc.), usar Playwright MCP ou cliclick para navegar no browser do Mac do Eric. NUNCA pedir credenciais/tokens quando posso acessar a interface visualmente
- **Severidade:** CRITICAL
- **Metodo rapido (AppleScript + JS):** Em vez de screenshot-click-screenshot (lento), usar `osascript` para executar JavaScript direto no Chrome: `tell application "Google Chrome" to tell active tab of front window to execute javascript "..."`. Sem screenshots, resposta instantanea. Usar cliclick APENAS para digitacao em campos React que resistem a `nativeInputValueSetter`
- **Cloudflare via browser:** Logar com "Continue with Google" (AppleScript JS click), navegar direto para URL do DNS com account ID no path

## 2026-03-24 Feedback: Salvar TUDO na memoria sem esperar

- **Contexto:** Sessao inteira de deploy VPS + dashboard sem salvar na memoria
- **Feedback:** "vc ainda nao salva as coisas na memoria... isso me deixa puto"
- **Regra derivada:** Salvar informacoes tecnicas na memoria DURANTE a sessao, nao ao final. VPS, deploys, configs, DNS - tudo deve ser persistido imediatamente
- **Severidade:** CRITICAL
