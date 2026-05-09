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

## 2026-03-31 Feedback: NAO abrir browser sem ser pedido

- **Contexto:** Abri o dashboard local com Playwright para verificar visualmente a implementacao do tab Comercial
- **Feedback:** "pq vc abriu esse dash local?" (tom de questionamento — nao pediu isso)
- **Regra derivada:** NUNCA abrir browser/Playwright para verificar implementacao por conta propria. Apenas quando Eric pedir explicitamente. Verificacao visual = responsabilidade do Eric.
- **Severidade:** HIGH

## 2026-03-24 Feedback: Salvar TUDO na memoria sem esperar

- **Contexto:** Sessao inteira de deploy VPS + dashboard sem salvar na memoria
- **Feedback:** "vc ainda nao salva as coisas na memoria... isso me deixa puto"
- **Regra derivada:** Salvar informacoes tecnicas na memoria DURANTE a sessao, nao ao final. VPS, deploys, configs, DNS - tudo deve ser persistido imediatamente
- **Severidade:** CRITICAL

## 2026-04-09 Aprendizado: GHL API paginacao de mensagens via lastMessageId
- **Contexto:** Extracao de 210 conversas do Dr. Cleugo, algumas com 197+ msgs, GHL API retorna apenas 100 por chamada
- **Descoberta:** `GET /conversations/{id}/messages` retorna `data.messages = { lastMessageId, nextPage, messages[] }`. Para paginar, passar `lastMessageId` como query param ate `nextPage=false`
- **Regra derivada:** `lib/ghl-api.js::getConversationMessages` so busca a primeira pagina. Para extracao historica completa, paginar manualmente via axios direto ou estender a lib com metodo `getAllMessages`
- **Tambem:** Paginacao de conversations via `/conversations/search` usa `startAfterDate` (epoch ms) como cursor; GHL retorna conversas ordenadas por `last_message_date` desc
- **Severidade:** HIGH

## 2026-04-09 Aprendizado: GHL messageType inclui TYPE_CUSTOM_SMS (Stevo WhatsApp)
- **Contexto:** Dr. Cleugo usa Stevo como provider de WhatsApp, que aparece no GHL como `messageType: TYPE_CUSTOM_SMS` (nao `TYPE_SMS`)
- **Regra derivada:** Ao normalizar channel a partir de messageType, tratar `CUSTOM_SMS` como `SMS` (mesmo canal logico). Ver `scripts/extract-ghl-cleugo.js`
- **Canais observados nesta extracao:** SMS (CUSTOM_SMS via Stevo), INSTAGRAM, INSTAGRAM_COMMENT, ACTIVITY_OPPORTUNITY (eventos de pipeline, nao mensagens reais)
- **Severidade:** HIGH

## 2026-04-09 Aprendizado: Groq whisper rate limit em extracao batch
- **Contexto:** Ao transcrever muitos audios em sequencia durante extracao massiva, Groq retorna 429 Too Many Requests
- **Regra derivada:** Para extracoes historicas, salvar apenas `audio_url` no DB e transcrever em rodada batch separada com throttle ~600ms entre chamadas (~1.6 req/s). Flag `--skip-transcription` em `extract-ghl-cleugo.js` e default
- **Severidade:** MEDIUM

## 2026-04-09 Bug fix: whatsapp-db-cleugo.js path incorreto
- **Contexto:** DB_PATH estava resolvendo para `/Users/ericsantos/docs/clientes/...` em vez de `/Users/ericsantos/meu-aios/docs/clientes/...` (um `../` a mais)
- **Fix:** `path.resolve(__dirname, '../../docs/...')` (dois niveis, nao tres)
- **Severidade:** HIGH

## 2026-04-09 CRITICAL: nico-whatsapp roda via launchctl, NAO PM2
- **Contexto:** Ao tentar reiniciar `nico-whatsapp` via `pm2 restart`, o servidor continuava com codigo antigo em memoria. PM2 mostrava online mas com restarts=31802 e nunca subia de verdade
- **Causa raiz:** O servidor real roda via launchd (`~/Library/LaunchAgents/com.syra.nico-server.plist`). O PID que escuta na porta 3001 tem PPID=1 (launchd). O PM2 "nico-whatsapp" era um duplicado em loop de crash porque nao conseguia bindar a porta ja ocupada pelo launchd
- **Fix correto:** `launchctl kickstart -k gui/501/com.syra.nico-server` para reiniciar o servidor real. Para validar: `lsof -i :3001` deve mostrar um unico PID, e `curl /` deve mostrar uptime baixo apos restart
- **Sintoma de diagnostico:** se `pm2 restart X` nao afeta o comportamento do servico mas `lsof -i :PORTA` mostra outro PID, checar `launchctl list | grep <service>` e `~/Library/LaunchAgents/`
- **Related services no launchctl:** `com.syra.nico-server` (servidor Node) + `com.syra.nico-tunnel` (cloudflared tunnel)
- **Severidade:** CRITICAL

## 2026-04-09 Dr. Cleugo adicionado ao monitor do Nico
- **Contexto:** Monitor em `http://localhost:3001/monitor` precisava exibir Dr. Cleugo (3440 msgs GHL)
- **Implementacao:**
  - `lib/whatsapp-db-cleugo.js`: `getAllMessages()` filtra por `ghl_message_id IS NOT NULL`, normaliza `push_name` = `contact_name` (GHL) || `push_name`, e substitui `content` vazio ou `[audio]` por `🎤 Audio (transcrevendo...)` ou `🎤 <transcription>` quando `audio_url` presente. `getTotalMessages()` conta apenas mensagens GHL
  - `whatsapp-agent-server.js`: adicionar cleugo em `/api/monitor/messages`, `/api/monitor/stats`, `/api/monitor/analytics/summary`, `/api/monitor/analytics/urgency`
  - `public/monitor.html`: cor `--cleugo: #10b981` (verde esmeralda), adicionar em `CLIENTS`, `COLORS`, `formatClientName()`, `.badge-cleugo`
- **Gotcha:** `content` no GHL ao extrair audios vem literalmente como `[audio]`, nao string vazia. Detectar ambos com regex `/^\[audio\]$/i`
- **Severidade:** HIGH

## 2026-04-09 Whisper local disponivel como fallback Groq
- **Contexto:** Groq free tier da 429 em batch. Precisava fallback local
- **Disponivel:** `/opt/homebrew/bin/whisper` (OpenAI whisper Python installed via pip/brew)
- **Uso programatico:**
  ```
  execFileSync('/opt/homebrew/bin/whisper', [audioPath, '--model', 'small', '--language', 'Portuguese', '--output_format', 'txt', '--output_dir', outDir, '--fp16', 'False', '--verbose', 'False'], { timeout: 180000 })
  ```
- **Output:** arquivo `<basename>.txt` no `output_dir`
- **Performance:** modelo `small` roda em CPU, ~30-60s por audio de 1min. Qualidade boa para PT
- **Padrao usado em:** `scripts/transcribe-cleugo-audios.js` (tenta Groq 2x, fallback Whisper local)
- **Severidade:** MEDIUM

## 2026-04-09 better-sqlite3: prepare e lazy, mas valida schema
- **Contexto:** Chamei `db.prepare("UPDATE ... SET updated_at = ?")` antes de `db.exec("ALTER TABLE ADD COLUMN updated_at")` e deu `SqliteError: no such column: updated_at`
- **Regra derivada:** Em better-sqlite3, sempre rodar migrations (ALTER TABLE) ANTES de chamar `db.prepare()` em statements que referenciam as novas colunas. O prepare valida schema no momento da chamada
- **Severidade:** MEDIUM
