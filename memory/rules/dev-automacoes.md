# Regras de Desenvolvimento e Automacoes

> Consultar ao configurar automacoes, webhooks, codigo Node.js, integrações GHL, Stevo.
> Ver tambem: [[universal]]

---

## [HIGH] Express 5 — Gotcha critico

- `app.post('*')` NAO funciona no Express 5
- Usar `app.use()` em vez disso
- Afeta todos os servidores webhook do projeto

---

## [HIGH] Stevo WhatsApp API

- NAO passar `subscribe` vazio na payload
- PascalCase nos webhooks (InboundMessage, Message, etc.)
- Docs: `memory/stevo-details.md`

---

## [HIGH] Telegram

- Filtrar `update_id` duplicados
- Callbacks do Celo usam prefixo `celo:`
- Docs: `meu-projeto/lib/telegram.js`

---

## [HIGH] SQLite / FTS5

- GHL usa SQLite com FTS5 para busca em conversas
- Port 3004
- Docs: `memory/ghl-integration.md`

---

## [HIGH] PM2 — Processos do sistema

**8 processos rodando (portas 3000-3007):**

| Porta | Servidor | Funcao |
|-------|---------|--------|
| 3000 | whatsapp-agent-server | Agente WhatsApp principal |
| 3001 | telegram-webhook-server | Telegram webhooks |
| 3002 | celo-agent-server | Celo (media buyer) |
| 3003 | alex-agent-server | Alex (ClickUp + Telegram) |
| 3004 | ghl-webhook-server | GHL webhooks |
| 3005 | iris-server | Prospeccao Instagram |
| 3006 | content-radar-server | Radar de conteudo |
| 3007 | swipe-collector | Swipe file |

Docs: `memory/pm2-autonomous-system.md`

---

## [HIGH] Google Docs — Criar documentos

**NUNCA usar .docx para documentos novos.**
Sempre usar Google Docs nativo:
- `createGoogleDoc()` em `meu-projeto/lib/drive-access.js`
- Auth: OAuth2 com `GOOGLE_DOCS_REFRESH_TOKEN`
- Fallback: arquivo .md local se API falhar

Ver: [[entrega-documentos]]

---

## [HIGH] Playwright para testes visuais

Playwright instalado em `/meu-projeto/`:
```js
// Sempre rodar de /Users/ericsantos/meu-aios/meu-projeto/
const { chromium } = require('playwright');
```

Nao rodar de `/meu-aios/` raiz — Playwright nao esta instalado la.

---

## [MEDIUM] GHL — GoHighLevel

- Integracao via webhook, Port 3004
- Token em `.env` como `GHL_API_KEY`
- Docs completos: `memory/ghl-integration.md`
- Payloads: `memory/ghl-maestro-payloads.md`

---

## [MEDIUM] Controle do Mac — cliclick

Ferramenta: `cliclick` v5.1 (instalado via brew)
Uso aprovado para todos os agentes.
Docs: `memory/ambiente-ferramentas.md`

---

<<<<<<< HEAD
Ultima atualizacao: 2026-03-19
=======
## [HIGH] Automacao de Browser sem Screenshots — Hierarquia de Abordagens

**Problema:** O fluxo cliclick + screencapture e lento e ineficiente (screenshot loop).

**Solucao recomendada por caso de uso:**

### Caso 1: Controle de navegador (web)
Usar Playwright MCP (ja instalado em `~/.claude.json`):
- Modo padrao usa accessibility tree, NAO screenshots
- `browser_snapshot` retorna refs de elementos (ex: `e21`, `button-123`)
- `browser_click({ref: "button-123"})` clica sem screenshot
- Para desativar imagens: adicionar `--image-responses=omit` nos args do MCP
- Config otima: `"args": ["-y", "@playwright/mcp@latest", "--image-responses=omit"]`

### Caso 2: Automacao longa / token-eficiente (Claude Code)
Usar Playwright CLI (`@playwright/cli`) — 4x menos tokens que MCP:
- Snapshots salvos em YAML no disco, nao na janela de contexto
- Instalar: `npm install -g @playwright/cli@latest`
- Uso: `playwright-cli snapshot` → gera YAML → ler seletivamente
- Referencia: https://testcollab.com/blog/playwright-cli

### Caso 3: Controle de apps nativos macOS (fora do navegador)
Usar macos-automator-mcp (steipete) ou macos-ui-automation-mcp (mb-dev):
- Ambos usam Accessibility API do macOS, sem screenshot
- `steipete`: npx @steipete/macos-automator-mcp@latest (200+ scripts prontos)
- `mb-dev`: find_elements, click_by_accessibility_id (JSONPath queries)
- Requer permissao de Acessibilidade para o app pai (Terminal/Claude Code)

### Quando usar cliclick (fallback):
- Elementos sem accessibility ID (canvas, apps nao-acessiveis)
- Acoes que exigem coordenadas absolutas
- Combinacao com screencapture apenas quando necessario

**Token comparison (MCP vs CLI):**
- MCP: ~114.000 tokens por tarefa
- CLI: ~27.000 tokens por tarefa (4x mais eficiente)
- MCP degrada apos ~15 steps por acumulo de contexto
- CLI suporta workflows de 50+ steps estavelmente

---

Ultima atualizacao: 2026-03-25
>>>>>>> origin/eric/main
