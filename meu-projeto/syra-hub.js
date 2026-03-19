// meu-projeto/syra-hub.js
// Syra Digital Hub — painel central de todos os sistemas
//
// Porta: 3008
// Acesso: http://localhost:3008

'use strict';

const path = require('path');
const fs = require('fs');

if (process.env.NODE_ENV !== 'production') {
  const localEnv = path.resolve(__dirname, '.env');
  const parentEnv = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(parentEnv)) require('dotenv').config({ path: parentEnv });
  if (fs.existsSync(localEnv)) require('dotenv').config({ path: localEnv, override: true });
}

const express = require('express');
const adsDb = require('./lib/ads-db');
const ghlDb = require('./lib/ghl-analytics-db');
const prospectingDb = require('./lib/prospecting-db');
const prospectingScripts = require('./lib/prospecting-scripts');
const app = express();
const PORT = process.env.HUB_PORT || 3008;

app.use(express.json());

// Inicializar DBs
try { adsDb.initDB(); } catch (err) { console.warn('Ads DB init warning:', err.message); }
try { ghlDb.initDB(); } catch (err) { console.warn('GHL DB init warning:', err.message); }
try { prospectingDb.initDB(); } catch (err) { console.warn('Prospecting DB init warning:', err.message); }

// ============================================================
// Registro de serviços
// ============================================================

const SERVICES = [
  {
    id: 'nico-whatsapp',
    name: 'NICO',
    label: 'WhatsApp Monitor',
    port: 3001,
    url: 'http://localhost:3001/monitor',
    icon: '💬',
    color: '#25D366',
  },
  {
    id: 'celo',
    name: 'CELO',
    label: 'Media Buyer',
    port: 3002,
    url: 'http://localhost:3002',
    icon: '📈',
    color: '#FF6B35',
  },
  {
    id: 'alex',
    name: 'ALEX',
    label: 'Project Manager',
    port: 3003,
    url: 'http://localhost:3003',
    icon: '📋',
    color: '#5B8DEF',
  },
  {
    id: 'ghl-webhook',
    name: 'GHL',
    label: 'Webhook Server',
    port: 3004,
    url: 'http://localhost:3004',
    icon: '⚡',
    color: '#FF9800',
  },
  {
    id: 'iris',
    name: 'IRIS',
    label: 'Prospecção',
    port: 3005,
    url: 'http://localhost:3005',
    icon: '🎯',
    color: '#AB47BC',
  },
  {
    id: 'cold-outreach',
    name: 'COLD',
    label: 'Cold Outreach',
    port: 3006,
    url: 'http://localhost:3006',
    icon: '✉️',
    color: '#26C6DA',
  },
  {
    id: 'swipe-collector',
    name: 'SWIPE',
    label: 'Swipe File',
    port: 3007,
    url: 'http://localhost:3007/dashboard',
    icon: '🔖',
    color: '#42A5F5',
  },
];

// ============================================================
// Registro de páginas (escalável — adicionar novas aqui)
// ============================================================

const PAGES = [
  { id: 'doc-social-media', name: 'Social Media', label: '@nova', icon: '📱', section: 'docs', url: '/docs/social-media' },
  { id: 'doc-alex', name: 'Project Manager', label: '@alex', icon: '📋', section: 'docs', url: '/docs/alex' },
  { id: 'design-system', name: 'Design System', label: 'Tokens & Componentes', icon: '🎨', section: 'design', url: '/design-system' },
];

const SECTIONS = [
  { id: 'dashboard',     name: 'Dashboard',      icon: 'layout-dashboard' },
  { id: 'agentes',       name: 'Agentes',        icon: 'bot' },
  { id: 'clientes',      name: 'Clientes',       icon: 'users' },
  { id: 'calendario',    name: 'Calendário',     icon: 'calendar' },
  { id: 'inbox',         name: 'Inbox',          icon: 'inbox' },
  { id: 'prospeccao',     name: 'Prospecção',     icon: 'target' },
  { id: 'midia',          name: 'Mídia Paga',     icon: 'bar-chart-3' },
  { id: 'financeiro',    name: 'Financeiro',     icon: 'wallet' },
  { id: 'docs',          name: 'Documentação',   icon: 'file-text' },
  { id: 'integracoes',   name: 'Integrações',    icon: 'plug' },
  { id: 'design-system', name: 'Design System',  icon: 'palette' },
  { id: 'config',        name: 'Configurações',  icon: 'settings' },
];

// ============================================================
// CSS Compartilhado — Design System v2.1 (fonte única)
// Todas as páginas usam getSharedTokensCss() + getSharedFontsLink()
// ============================================================

function getSharedFontsLink() {
  return '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">';
}

function getSharedTokensCss() {
  return `
:root {
  /* — Backgrounds — */
  --bg-base:       #030303;
  --bg-surface:    #0a0a0a;
  --bg-elevated:   #101013;
  --bg-overlay:    #18181d;
  --bg-card:       #0d0d10;
  --bg-muted:      #141417;

  /* — Borders — */
  --border-faint:  #141417;
  --border-subtle: #1e1e23;
  --border-base:   #27272d;
  --border-strong: #35353c;
  --border-accent: rgba(200, 255, 0, 0.28);

  /* — Text — */
  --text-primary:   #F0F0F5;
  --text-secondary: #8F8FA0;
  --text-muted:     #505060;
  --text-disabled:  #36363f;
  --text-on-accent: #0a0a0a;

  /* — Brand Accent — */
  --accent:           #C8FF00;
  --accent-hover:     #D8FF40;
  --accent-dim:       rgba(200, 255, 0, 0.08);
  --accent-mid:       rgba(200, 255, 0, 0.15);
  --accent-glow:      rgba(200, 255, 0, 0.22);
  --accent-border:    rgba(200, 255, 0, 0.28);
  --brand-lime-hover: hsl(78, 100%, 59%);

  /* — Semantic — */
  --success:     #22C55E;
  --success-bg:  rgba(34, 197, 94, 0.10);
  --warning:     #F59E0B;
  --warning-bg:  rgba(245, 158, 11, 0.10);
  --danger:      #EF4444;
  --danger-bg:   rgba(239, 68, 68, 0.10);
  --info:        #60A5FA;
  --info-bg:     rgba(96, 165, 250, 0.10);

  /* — Typography — */
  --font-display: 'Space Grotesk', 'Inter', system-ui, sans-serif;
  --font-body:    'Inter', system-ui, -apple-system, sans-serif;
  --font-mono:    'JetBrains Mono', 'Fira Code', monospace;
  --font-brand:   'Nunito Sans', 'Inter', system-ui, sans-serif;

  /* — Type Scale — */
  --text-2xs:  0.625rem;
  --text-xs:   0.6875rem;
  --text-sm:   0.75rem;
  --text-base: 0.875rem;
  --text-md:   1rem;
  --text-lg:   1.125rem;
  --text-xl:   1.375rem;
  --text-2xl:  1.75rem;
  --text-3xl:  2.25rem;

  /* — Spacing (4px base) — */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px;
  --sp-5: 20px; --sp-6: 24px; --sp-8: 32px; --sp-10: 40px;
  --sp-12: 48px; --sp-16: 64px; --sp-20: 80px; --sp-24: 96px;

  /* — Border Radius — */
  --r-xs: 3px; --r-sm: 6px; --r-md: 8px; --r-lg: 12px;
  --r-xl: 16px; --r-2xl: 24px; --r-full: 9999px;

  /* — Shadows — */
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.4);
  --shadow-sm: 0 2px 6px rgba(0,0,0,0.5);
  --shadow-md: 0 4px 14px rgba(0,0,0,0.6);
  --shadow-lg: 0 8px 28px rgba(0,0,0,0.7);
  --shadow-glow-ring:
    0 0 0 1px var(--accent-border),
    0 0 20px var(--accent-glow),
    0 0 40px rgba(200, 255, 0, 0.08);
  --shadow-glow-sm:
    0 0 8px rgba(200, 255, 0, 0.12),
    0 0 16px rgba(200, 255, 0, 0.06);
  --shadow-glow-lg:
    0 0 20px var(--accent-glow),
    0 0 60px rgba(200, 255, 0, 0.10);

  /* — Transitions — */
  --ease-fast:  120ms cubic-bezier(0.4, 0, 0.2, 1);
  --ease-base:  200ms cubic-bezier(0.4, 0, 0.2, 1);
  --ease-slow:  300ms cubic-bezier(0.4, 0, 0.2, 1);
  --ease-enter: 600ms ease-out;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
`;
}

function getSubpageCss() {
  return getSharedTokensCss() + `
body {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.6;
  padding: var(--sp-8) var(--sp-8);
  overflow-y: auto;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
body::-webkit-scrollbar { width: 5px; }
body::-webkit-scrollbar-track { background: transparent; }
body::-webkit-scrollbar-thumb { background: var(--border-base); border-radius: var(--r-xs); }
.container { max-width: 1020px; margin: 0 auto; }

/* Shared doc components */
.doc-header { margin-bottom: var(--sp-12); }
.doc-title {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.2;
  margin-bottom: 10px;
}
.doc-title .accent { color: var(--accent); }
.doc-desc {
  color: var(--text-secondary);
  font-size: 0.9375rem;
  max-width: 720px;
  line-height: 1.7;
  margin-bottom: var(--sp-4);
}
.doc-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.meta-chip {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  padding: 4px 12px;
  border-radius: var(--r-full);
  color: var(--text-secondary);
}

/* TOC */
.toc {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  padding: var(--sp-5) var(--sp-6);
  margin-bottom: var(--sp-12);
}
.toc-title {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
  margin-bottom: 14px;
}
.toc-list {
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 24px;
}
.toc-list a {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-sm);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.8125rem;
  transition: all var(--ease-fast);
}
.toc-list a:hover {
  background: var(--accent-dim);
  color: var(--text-primary);
}
.toc-list a .toc-num {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--accent);
  min-width: 22px;
}

/* Sections */
.doc-section { margin-bottom: var(--sp-16); scroll-margin-top: 24px; }
.section-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
  color: var(--text-primary);
}
.section-sub {
  color: var(--text-muted);
  font-size: 0.8125rem;
  margin-bottom: var(--sp-5);
}

/* Diagram cards */
.diagram-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  padding: var(--sp-8) var(--sp-6);
  overflow-x: auto;
}
.diagram-card .mermaid { display: flex; justify-content: center; }

/* Detail boxes */
.detail-box {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  padding: var(--sp-5) var(--sp-6);
  margin-top: var(--sp-4);
}
.detail-box h4 {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--accent);
  margin-bottom: var(--sp-2);
  letter-spacing: -0.01em;
}
.detail-box p, .detail-box li {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  line-height: 1.6;
}
.detail-box ul { list-style: none; padding: 0; }
.detail-box li {
  padding: 3px 0;
  padding-left: var(--sp-4);
  position: relative;
}
.detail-box li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 11px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
}

/* Tables */
.table-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  overflow: hidden;
}
table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
th {
  text-align: left;
  font-weight: 600;
  color: var(--text-muted);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--border-base);
  background: var(--bg-elevated);
}
td {
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--border-faint);
  color: var(--text-secondary);
  vertical-align: top;
  line-height: 1.5;
}
tr:last-child td { border-bottom: none; }
tr:hover td { background: rgba(255,255,255,0.015); }
td strong { color: var(--text-primary); font-weight: 600; }
td code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  background: var(--bg-elevated);
  padding: 1px 6px;
  border-radius: var(--r-xs);
  color: var(--accent);
}

/* Badges */
.badge {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  background: var(--accent-dim);
  color: var(--accent);
  padding: 2px 8px;
  border-radius: var(--r-full);
  font-weight: 600;
  white-space: nowrap;
}
.badge-blue  { background: rgba(91, 141, 239, 0.12); color: #5B8DEF; }
.badge-orange { background: rgba(245, 158, 11, 0.12); color: #F59E0B; }
.badge-green { background: var(--success-bg); color: var(--success); }
.badge-red   { background: var(--danger-bg); color: var(--danger); }

/* Note callout */
.note-callout {
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  border-radius: var(--r-md);
  padding: var(--sp-3) var(--sp-4);
  margin-top: var(--sp-4);
  font-size: 0.8125rem;
  color: var(--text-secondary);
}
.note-callout strong { color: var(--accent); }
.note-callout code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  background: var(--bg-elevated);
  padding: 1px 6px;
  border-radius: var(--r-xs);
  color: var(--accent);
}

/* Divider */
.divider {
  border: none;
  border-top: 1px solid var(--border-faint);
  margin: var(--sp-16) 0;
}

/* Skills grid */
.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: var(--sp-4);
}
.skill-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  padding: var(--sp-5);
  transition: border-color var(--ease-base);
}
.skill-card:hover { border-color: var(--border-strong); }
.skill-card-title {
  font-family: var(--font-display);
  font-size: 0.9375rem;
  font-weight: 700;
  margin-bottom: var(--sp-3);
  display: flex;
  align-items: center;
  gap: 8px;
}
.skill-card-title .icon { font-size: 1.1rem; }
.skill-list { list-style: none; padding: 0; }
.skill-list li {
  padding: 4px 0;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.skill-list li::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}
.skill-list li.planned::before { background: var(--warning); }
.skill-list li.planned { color: var(--text-muted); font-style: italic; }
.planned-tag {
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  background: var(--warning-bg);
  color: var(--warning);
  padding: 1px 6px;
  border-radius: var(--r-full);
  font-weight: 600;
  margin-left: 4px;
}

/* Fade-in animation */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.doc-section { animation: fadeUp 0.5s ease backwards; }
.doc-section:nth-child(2) { animation-delay: 0.05s; }
.doc-section:nth-child(3) { animation-delay: 0.1s; }
.doc-section:nth-child(4) { animation-delay: 0.15s; }
.doc-section:nth-child(5) { animation-delay: 0.2s; }
.doc-section:nth-child(6) { animation-delay: 0.25s; }
`;
}

// Static files
app.use('/public', express.static(path.join(__dirname, 'public'), { etag: false, maxAge: 0 }));
app.use('/assets/logos', express.static(path.join(__dirname, 'assets', 'logos')));

// ============================================================
// Health check (server-side para evitar CORS)
// ============================================================

async function checkService(svc) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const r = await fetch(`http://localhost:${svc.port}/`, { signal: controller.signal });
    clearTimeout(timer);
    const ms = Date.now() - start;
    return { id: svc.id, status: r.ok ? 'online' : 'degraded', ms };
  } catch {
    return { id: svc.id, status: 'offline', ms: Date.now() - start };
  }
}

app.get('/api/health', async (req, res) => {
  const results = await Promise.allSettled(SERVICES.map(checkService));
  const services = {};
  for (const r of results) {
    if (r.status === 'fulfilled') services[r.value.id] = r.value;
  }
  res.json({ ok: true, timestamp: new Date().toISOString(), services });
});

app.get('/api/health/:serviceId', async (req, res) => {
  const svc = SERVICES.find(s => s.id === req.params.serviceId);
  if (!svc) return res.status(404).json({ error: 'Serviço não encontrado' });
  const result = await checkService(svc);
  res.json(result);
});

// ============================================================
// API: Monitored Groups (proxy para Nico)
// ============================================================

app.get('/api/monitored-groups', async (req, res) => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const r = await fetch('http://localhost:3001/api/monitor/groups', { signal: controller.signal });
    clearTimeout(timer);
    if (!r.ok) return res.json({ groups: [], total: 0 });
    res.json(await r.json());
  } catch {
    res.json({ groups: [], total: 0 });
  }
});

// ============================================================
// API: Clients (lê CLIENTES-CONFIG.json)
// ============================================================

app.get('/api/clients', (req, res) => {
  try {
    const configPath = path.resolve(__dirname, '..', 'docs', 'clientes', 'CLIENTES-CONFIG.json');
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ler CLIENTES-CONFIG.json', message: err.message });
  }
});

// ============================================================
// API: Client Detail (agrega dados de múltiplas fontes)
// ============================================================

app.get('/api/client/:id', (req, res) => {
  try {
    const clientId = req.params.id;
    const configPath = path.resolve(__dirname, '..', 'docs', 'clientes', 'CLIENTES-CONFIG.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const client = config.clients[clientId];
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

    // Load brand config if available
    let brand = null;
    if (client.brand && client.brand.configFile) {
      const brandPath = path.resolve(__dirname, client.brand.configFile);
      if (fs.existsSync(brandPath)) {
        brand = JSON.parse(fs.readFileSync(brandPath, 'utf8'));
      }
    }

    // Load profile.md if available
    let profile = null;
    if (client.paths && client.paths.profile) {
      const profilePath = path.resolve(__dirname, '..', client.paths.profile);
      if (fs.existsSync(profilePath)) {
        profile = fs.readFileSync(profilePath, 'utf8');
      }
    }

    // List knowledge-base files
    let kbFiles = [];
    if (client.paths && client.paths.folder) {
      const kbDir = path.resolve(__dirname, '..', client.paths.folder, 'knowledge-base');
      if (fs.existsSync(kbDir)) {
        kbFiles = fs.readdirSync(kbDir).filter(f => !f.startsWith('.'));
      }
    }

    // List docs in client folder
    let docFiles = [];
    if (client.paths && client.paths.folder) {
      const folder = path.resolve(__dirname, '..', client.paths.folder);
      if (fs.existsSync(folder)) {
        docFiles = fs.readdirSync(folder).filter(f => !f.startsWith('.'));
      }
    }

    // Check SQLite DB
    let dbInfo = null;
    if (client.paths && client.paths.folder) {
      const dbPath = path.resolve(__dirname, '..', client.paths.folder, 'banco-dados', 'conversas.db');
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        dbInfo = { exists: true, size: stats.size, modified: stats.mtime.toISOString() };
      }
    }

    res.json({ client, brand, profile, kbFiles, docFiles, dbInfo });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar dados do cliente', message: err.message });
  }
});

// ============================================================
// API: Mídia Paga (proxy para Celo port 3002)
// ============================================================

const CELO_BASE = 'http://localhost:3002';

async function celoFetch(path, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const r = await fetch(`${CELO_BASE}${path}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!r.ok) return null;
    return r.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// Overview de todas as contas — dados em tempo real
app.get('/api/media/overview', async (req, res) => {
  try {
    // Ler config de clientes do Celo
    const celoConfigPath = path.resolve(__dirname, 'data', 'celo-clients.json');
    const celoConfig = JSON.parse(fs.readFileSync(celoConfigPath, 'utf8'));
    const clients = Object.entries(celoConfig.clients).filter(([, c]) => c.active);

    const results = await Promise.allSettled(
      clients.map(async ([id, client]) => {
        // Buscar campanhas, health e CRM em paralelo
        const fetches = [
          celoFetch(`/api/ads/campaigns?clientId=${id}`),
          celoFetch(`/api/autopilot/health/${id}`),
        ];

        // CRM: se tem GHL configurado, buscar conversions
        let crmSummary = null;
        if (client.ghlLocationId) {
          const token = client.ghlToken || process.env.GHL_ACCESS_TOKEN;
          if (token) {
            try {
              const GhlCrm = require('./lib/ghl-crm');
              const ghl = new GhlCrm(client.ghlLocationId, token);
              crmSummary = await ghl.getCrmSummary(client.ghlPipelineId || undefined);
            } catch (e) { /* silently skip CRM errors */ }
          }
        }

        const [campaigns, health] = await Promise.all(fetches);

        const active = (campaigns || []).filter(c => c.status === 'ACTIVE');
        const paused = (campaigns || []).filter(c => c.status === 'PAUSED');

        // Calcular pacing do mês
        const monthlyBudget = client.budget?.monthly || 0;
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        return {
          id,
          name: client.name,
          adAccountId: client.metaAdAccountId,
          hasGhl: !!client.ghlLocationId,
          budget: {
            monthly: monthlyBudget,
            dailyTarget: monthlyBudget > 0 ? Math.round(monthlyBudget / daysInMonth * 100) / 100 : 0,
          },
          campaigns: {
            total: (campaigns || []).length,
            active: active.length,
            paused: paused.length,
          },
          health: health?.health || null,
          pacing: health?.pacing || null,
          suggestions: (health?.suggestions || []).length,
          crm: crmSummary ? {
            won30d: crmSummary.conversions?.won30d || 0,
            lost30d: crmSummary.conversions?.lost30d || 0,
            revenue30d: crmSummary.conversions?.wonValue30d || 0,
            convRate: crmSummary.conversions?.conversionRate || 0,
            totalOpen: crmSummary.pipeline?.totalOpen || 0,
            recentLeads: crmSummary.recentLeads?.total || 0,
          } : null,
        };
      })
    );

    const overview = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    // Totais globais
    const totals = {
      totalBudget: overview.reduce((s, c) => s + c.budget.monthly, 0),
      totalProjected: overview.reduce((s, c) => s + (c.pacing?.projectedMonthly || 0), 0),
      totalSpendToday: overview.reduce((s, c) => s + (c.pacing?.spendToday || 0), 0),
      totalActive: overview.reduce((s, c) => s + c.campaigns.active, 0),
      totalPaused: overview.reduce((s, c) => s + c.campaigns.paused, 0),
      totalRevenue30d: overview.reduce((s, c) => s + (c.crm?.revenue30d || 0), 0),
      totalWon30d: overview.reduce((s, c) => s + (c.crm?.won30d || 0), 0),
      totalLeads7d: overview.reduce((s, c) => s + (c.crm?.recentLeads || 0), 0),
    };

    res.json({ clients: overview, totals, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detalhes de campanhas de um cliente específico
app.get('/api/media/client/:id', async (req, res) => {
  try {
    const clientId = req.params.id;
    const { start, end } = req.query;

    // Se temos dados no BD, lê de lá (rápido, offline-safe)
    if (adsDb.hasData(clientId)) {
      const startDate = start || null;
      const endDate = end || null;
      const campaignSummaries = adsDb.getCampaignSummaries(clientId, startDate, endDate);
      const dailyInsights = adsDb.getDailyInsights(clientId, startDate, endDate);
      const adSummaries = adsDb.getAdSummaries(clientId, startDate, endDate);
      const adsetSummaries = adsDb.getAdsetSummaries(clientId, startDate, endDate);
      const lastSync = adsDb.getLastSync(clientId);

      // Formatar campanhas no mesmo formato que o Celo retorna
      const active = campaignSummaries.filter(c => c.status === 'ACTIVE').map(c => ({
        id: c.id, name: c.name, status: c.status, objective: c.objective,
        dailyBudget: c.daily_budget,
        metrics: { spend: c.spend, clicks: c.clicks, impressions: c.impressions, conversions: c.leads, reach: c.reach, frequency: c.frequency, ctr: c.ctr, cpc: c.cpc, cpm: c.cpm, costPerResult: c.cost_per_result },
      }));
      const paused = campaignSummaries.filter(c => c.status !== 'ACTIVE').map(c => ({
        id: c.id, name: c.name, status: c.status, objective: c.objective,
        dailyBudget: c.daily_budget,
      }));

      // Buscar health do Celo (não-blocking)
      let health = null;
      try { health = await celoFetch(`/api/autopilot/health/${clientId}`, 5000); } catch (e) { /* ok */ }

      return res.json({
        clientId, source: 'db',
        active, paused,
        dailyInsights,
        adSummaries: adSummaries.map(a => ({
          adName: a.name, campaign: a.campaign_name, status: a.status === 'ACTIVE' ? 'active' : 'paused',
          thumbnailUrl: a.thumbnail_url, spend: a.spend, clicks: a.clicks, impressions: a.impressions,
          leads: a.leads, reach: a.reach, ctr: a.ctr, cpc: a.cpc, cpm: a.cpm,
          cpl: a.cost_per_result, frequency: a.frequency,
          conversionRate: a.clicks > 0 ? (a.leads / a.clicks) * 100 : 0,
        })),
        adsetSummaries: adsetSummaries.map(s => ({
          adsetName: s.name, campaign: s.campaign_name, status: s.status === 'ACTIVE' ? 'active' : 'paused',
          spend: s.spend, clicks: s.clicks, impressions: s.impressions, leads: s.leads,
          reach: s.reach, ctr: s.ctr, cpc: s.cpc, cpm: s.cpm,
          cpl: s.cost_per_result, frequency: s.frequency,
          conversionRate: s.clicks > 0 ? (s.leads / s.clicks) * 100 : 0,
        })),
        lastSync: lastSync ? lastSync.created_at : null,
        health: health?.health || null,
        pacing: health?.pacing || null,
        suggestions: health?.suggestions || [],
        benchmarks: health?.benchmarks || null,
      });
    }

    // Fallback: lê do Celo live (comportamento original)
    const [campaigns, health] = await Promise.all([
      celoFetch(`/api/ads/campaigns?clientId=${clientId}`),
      celoFetch(`/api/autopilot/health/${clientId}`, 12000),
    ]);

    if (!campaigns) return res.status(502).json({ error: 'Celo não respondeu' });

    const active = campaigns.filter(c => c.status === 'ACTIVE');
    const metricsResults = await Promise.allSettled(
      active.map(async c => {
        const m = await celoFetch(`/api/ads/campaigns/${c.id}/metrics?dateRange=last_7d`);
        return { ...c, metrics: m };
      })
    );

    const withMetrics = metricsResults
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    const paused = campaigns.filter(c => c.status === 'PAUSED');

    res.json({
      clientId, source: 'live',
      active: withMetrics,
      paused,
      health: health?.health || null,
      pacing: health?.pacing || null,
      suggestions: health?.suggestions || [],
      benchmarks: health?.benchmarks || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRM (GHL) data for a specific client — reads from local SQLite (fast)
app.get('/api/media/client/:id/crm', (req, res) => {
  try {
    const clientId = req.params.id;
    const celoConfigPath = path.resolve(__dirname, 'data', 'celo-clients.json');
    const celoConfig = JSON.parse(fs.readFileSync(celoConfigPath, 'utf8'));
    const client = celoConfig.clients[clientId];

    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

    const locationId = client.ghlLocationId;
    if (!locationId) return res.json({ available: false, reason: 'Sem GHL configurado para este cliente' });

    // DB-first: read from SQLite (synced by ghl-syncer)
    if (!ghlDb.hasData(clientId)) {
      return res.json({ available: false, reason: 'Dados CRM ainda não sincronizados. Execute sync primeiro.' });
    }

    const startDate = req.query.start || null;
    const endDate = req.query.end || null;

    const oppSummary = ghlDb.getOpportunitySummary(clientId, startDate, endDate);
    const stages = ghlDb.getPipelineStages(clientId);
    const crmCampaigns = ghlDb.getCampaignPerformance(clientId, startDate, endDate);
    const lastSync = ghlDb.getLastSync(clientId);

    // Build campaign performance array from DB
    const campaignPerformance = crmCampaigns.map(c => ({
      campaign: c.campaign,
      total: c.total,
      open: c.open_count,
      won: c.won_count,
      lost: c.lost_count,
      wonValue: c.won_value || 0,
    }));

    // Build leads list from recent opportunities as contact proxy
    const opps = ghlDb.getOpportunities(clientId, { limit: 20 });
    const recentLeads = (opps || []).map(o => ({
      name: o.contact_name || o.name || '-',
      email: o.contact_email || '',
      phone: o.contact_phone || '',
      source: o.utm_campaign || o.source || '',
      dateAdded: o.created_at || '',
    }));

    // Funnel stages
    const funnelStages = ghlDb.getFunnelStages(clientId);
    const stageBreakdown = funnelStages.map(s => ({ name: s.stage_name, count: s.count || 0, value: s.value || 0 }));

    // Conversions
    const totalWon = oppSummary?.total_won || 0;
    const totalLost = oppSummary?.total_lost || 0;
    const totalOpen = oppSummary?.total_open || 0;

    res.json({
      available: true,
      source: 'db',
      pipeline: {
        name: stages[0]?.pipeline_name || 'Pipeline',
        stages: stages.map(s => ({ id: s.id, name: s.name, position: s.position })),
      },
      totalOpportunities: oppSummary?.total || 0,
      stageBreakdown,
      conversions: {
        won30d: totalWon,
        lost30d: totalLost,
        wonValue30d: oppSummary?.won_value || 0,
        conversionRate: (totalWon + totalLost) > 0 ? Math.round((totalWon / (totalWon + totalLost)) * 100) : 0,
      },
      campaignPerformance,
      recentLeads,
      recentLeadsTotal: recentLeads.length,
      lastSync: lastSync ? lastSync.created_at : null,
    });
  } catch (err) {
    console.error('[Hub] CRM error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Opportunities (individual level) for a specific client
// Reads from SQLite DB (fast, date-filterable) with fallback to live GHL API
app.get('/api/media/client/:id/opportunities', async (req, res) => {
  try {
    const clientId = req.params.id;
    const celoConfigPath = path.resolve(__dirname, 'data', 'celo-clients.json');
    const celoConfig = JSON.parse(fs.readFileSync(celoConfigPath, 'utf8'));
    const client = celoConfig.clients[clientId];

    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
    const locationId = client.ghlLocationId;
    if (!locationId) return res.json({ available: false, reason: 'Sem GHL configurado' });

    const startDate = req.query.start || null;
    const endDate = req.query.end || null;

    // Try reading from DB first (fast, supports date filtering)
    if (ghlDb.hasData(clientId)) {
      const opportunities = ghlDb.getOpportunities(clientId, { startDate, endDate });
      const stages = ghlDb.getPipelineStages(clientId);
      const summary = ghlDb.getOpportunitySummary(clientId, startDate, endDate);
      const lastSync = ghlDb.getLastSync(clientId);

      return res.json({
        available: true,
        source: 'db',
        pipelineName: stages[0]?.pipeline_name || 'Pipeline',
        stages: stages.map(s => ({ id: s.id, name: s.name, position: s.position })),
        opportunities,
        totals: {
          total: summary.total || 0,
          open: summary.total_open || 0,
          won: summary.total_won || 0,
          lost: summary.total_lost || 0,
          wonValue: summary.won_value || 0,
          totalValue: summary.total_value || 0,
        },
        lastSync: lastSync?.created_at || null,
      });
    }

    // Fallback: live API call (first load before sync runs)
    const GhlCrm = require('./lib/ghl-crm');
    const token = client.ghlToken || process.env.GHL_ACCESS_TOKEN;
    if (!token) return res.json({ available: false, reason: 'Sem token GHL' });

    const ghl = new GhlCrm(locationId, token);
    const pipelines = await ghl.getPipelines();
    const pid = client.ghlPipelineId || pipelines[0]?.id;
    if (!pid) return res.json({ available: true, opportunities: [], pipeline: null });

    const pipeline = pipelines.find(p => p.id === pid);
    const [open, won, lost] = await Promise.all([
      ghl.searchOpportunities({ pipelineId: pid, status: 'open', limit: 100 }),
      ghl.searchOpportunities({ pipelineId: pid, status: 'won', limit: 100 }),
      ghl.searchOpportunities({ pipelineId: pid, status: 'lost', limit: 100 }),
    ]);

    const stageMap = {};
    if (pipeline?.stages) {
      for (const s of pipeline.stages) stageMap[s.id] = s.name;
    }

    const mapOpp = (opp, status) => ({
      id: opp.id,
      name: opp.name || opp.contact?.name || '-',
      contactName: opp.contact?.name || '-',
      contactEmail: opp.contact?.email || '',
      contactPhone: opp.contact?.phone || '',
      status,
      monetaryValue: opp.monetaryValue || 0,
      source: opp.source || '',
      pipelineStageId: opp.pipelineStageId,
      stageName: stageMap[opp.pipelineStageId] || 'Outro',
      createdAt: opp.createdAt || '',
      updatedAt: opp.updatedAt || '',
      tags: opp.contact?.tags || [],
    });

    const opportunities = [
      ...open.map(o => mapOpp(o, 'open')),
      ...won.map(o => mapOpp(o, 'won')),
      ...lost.map(o => mapOpp(o, 'lost')),
    ];

    res.json({
      available: true,
      source: 'live',
      pipelineName: pipeline?.name || 'Pipeline',
      stages: pipeline?.stages?.map(s => ({ id: s.id, name: s.name, position: s.position })) || [],
      opportunities,
      totals: {
        total: opportunities.length,
        open: open.length,
        won: won.length,
        lost: lost.length,
        wonValue: won.reduce((s, o) => s + (o.monetaryValue || 0), 0),
        totalValue: opportunities.reduce((s, o) => s + (o.monetaryValue || 0), 0),
      },
    });
  } catch (err) {
    console.error('[Hub] Opportunities error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// CRM x Ads Cross-Reference (local SQLite — zero API calls)
// ============================================================

function _normalizeName(name) {
  return (name || '').toLowerCase().replace(/[\[\](){}]/g, '').replace(/\s+/g, ' ').trim();
}

function _findCrmMatch(metaName, crmCampaigns) {
  const norm = _normalizeName(metaName);
  const exact = crmCampaigns.find(c => _normalizeName(c.campaign) === norm);
  if (exact) return exact;
  const contains = crmCampaigns.find(c => {
    const cn = _normalizeName(c.campaign);
    return cn.includes(norm) || norm.includes(cn);
  });
  if (contains) return contains;
  const metaTokens = norm.split(' ').filter(Boolean);
  if (metaTokens.length === 0) return null;
  let bestMatch = null, bestOverlap = 0;
  for (const c of crmCampaigns) {
    const crmTokens = _normalizeName(c.campaign).split(' ').filter(Boolean);
    if (crmTokens.length === 0) continue;
    const common = metaTokens.filter(t => crmTokens.includes(t)).length;
    const overlap = common / Math.max(metaTokens.length, crmTokens.length);
    if (overlap > 0.5 && overlap > bestOverlap) { bestOverlap = overlap; bestMatch = c; }
  }
  return bestMatch;
}

function _computeQuality(crm) {
  if (!crm) return 0;
  const total = crm.total || 0;
  if (total === 0) return 0;
  const raw = (crm.won_count || 0) * 40 + (crm.open_count || 0) * 20 + total * 10;
  return Math.min(100, Math.round(raw / total));
}

function _buildCrossref(clientId, startDate, endDate) {
  const crmCampaigns = ghlDb.getCampaignPerformance(clientId, startDate, endDate);
  const crmAds = ghlDb.getAdPerformance(clientId, startDate, endDate);
  const crmAdsets = ghlDb.getAdsetPerformance(clientId, startDate, endDate);
  const funnelStages = ghlDb.getFunnelStages(clientId);
  const oppSummary = ghlDb.getOpportunitySummary(clientId, startDate, endDate);
  const contactsByCampaign = ghlDb.getContactsByCampaign(clientId, startDate, endDate);
  const stages = ghlDb.getPipelineStages(clientId);

  const adsCampaigns = adsDb.getCampaignSummaries(clientId, startDate, endDate);
  const adsAds = adsDb.getAdSummaries(clientId, startDate, endDate);
  const adsAdsets = adsDb.getAdsetSummaries(clientId, startDate, endDate);

  // Lead scores by campaign
  let scoresByCampaign = [];
  try { scoresByCampaign = ghlDb.getScoresByCampaign(clientId); } catch (e) { /* scores not available */ }
  const scoreMap = {};
  for (const s of scoresByCampaign) scoreMap[_normalizeName(s.utm_campaign)] = s;

  const contactLeadMap = {};
  for (const c of contactsByCampaign) contactLeadMap[_normalizeName(c.campaign)] = c.leads;
  const crmAdMap = {};
  for (const a of crmAds) crmAdMap[_normalizeName(a.ad_name)] = a;
  const crmAdsetMap = {};
  for (const a of crmAdsets) crmAdsetMap[_normalizeName(a.adset_name)] = a;

  const campaigns = adsCampaigns.map(ac => {
    const crm = _findCrmMatch(ac.name, crmCampaigns);
    const quality = _computeQuality(crm);
    const crmLeads = crm?.total || contactLeadMap[_normalizeName(ac.name)] || 0;
    const crmWon = crm?.won_count || 0;
    const crmWonValue = crm?.won_value || 0;
    const roas = (ac.spend > 0 && crmWonValue > 0) ? crmWonValue / ac.spend : 0;
    // Lead score enrichment
    const scoreData = scoreMap[_normalizeName(ac.name)];
    const avgLeadScore = scoreData ? Math.round(scoreData.avg_score) : null;
    const tierBreakdown = scoreData ? { hot: scoreData.hot || 0, warm: scoreData.warm || 0, cold: scoreData.cold || 0 } : null;

    return {
      name: ac.name, status: ac.status,
      spend: ac.spend || 0, clicks: ac.clicks || 0, impressions: ac.impressions || 0,
      metaLeads: ac.leads || 0, cplMeta: ac.cost_per_result || 0, ctr: ac.ctr || 0,
      crmMatched: !!crm, crmLeads, crmOpen: crm?.open_count || 0,
      crmWon, crmLost: crm?.lost_count || 0, crmWonValue, roas, quality,
      cplCrm: (ac.spend > 0 && crmLeads > 0) ? ac.spend / crmLeads : 0,
      avgLeadScore, tierBreakdown,
    };
  });

  const ads = adsAds.map(ad => {
    const crmAd = crmAdMap[_normalizeName(ad.name)];
    const crmLeads = crmAd?.leads || 0;
    return {
      name: ad.name, status: ad.status, campaignName: ad.campaign_name,
      spend: ad.spend || 0, metaLeads: ad.leads || 0, crmLeads,
      cplCrm: (ad.spend > 0 && crmLeads > 0) ? ad.spend / crmLeads : 0, ctr: ad.ctr || 0,
    };
  });

  const adsets = adsAdsets.map(as => {
    const crmAs = crmAdsetMap[_normalizeName(as.name)];
    const crmLeads = crmAs?.leads || 0;
    return {
      name: as.name, status: as.status, campaignName: as.campaign_name,
      spend: as.spend || 0, metaLeads: as.leads || 0, crmLeads,
      cplCrm: (as.spend > 0 && crmLeads > 0) ? as.spend / crmLeads : 0, ctr: as.ctr || 0,
    };
  });

  const totalCrmLeads = oppSummary?.total || 0;
  const totalWon = oppSummary?.total_won || 0;
  const totalWonValue = oppSummary?.won_value || 0;
  const totalLost = oppSummary?.total_lost || 0;
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const conversionRate = (totalWon + totalLost) > 0 ? Math.round((totalWon / (totalWon + totalLost)) * 100) : 0;

  const consultaStage = funnelStages.find(s =>
    s.stage_name?.toLowerCase().includes('consulta') || s.stage_name?.toLowerCase().includes('agendad')
  );
  const consultasAgendadas = consultaStage?.count || 0;
  const custoConsulta = (totalSpend > 0 && consultasAgendadas > 0) ? totalSpend / consultasAgendadas : 0;

  const qualityRanking = [...campaigns].filter(c => c.crmMatched).sort((a, b) => b.quality - a.quality).slice(0, 5);
  const efficientAds = [...ads].filter(a => a.crmLeads > 0).sort((a, b) => a.cplCrm - b.cplCrm).slice(0, 5);
  const consultaCampaigns = [...campaigns].filter(c => c.crmMatched && c.crmWon > 0).sort((a, b) => b.crmWon - a.crmWon).slice(0, 5);
  const lastSync = ghlDb.getLastSync(clientId);

  return {
    kpis: { totalCrmLeads, won30d: totalWon, wonValue30d: totalWonValue, roas: totalSpend > 0 ? totalWonValue / totalSpend : 0, conversionRate, consultasAgendadas, custoConsulta },
    funnel: funnelStages.map(s => ({ name: s.stage_name, count: s.count || 0, value: s.value || 0 })),
    campaigns: campaigns.sort((a, b) => b.spend - a.spend),
    ads: ads.filter(a => a.spend > 0).sort((a, b) => b.spend - a.spend),
    adsets: adsets.filter(a => a.spend > 0).sort((a, b) => b.spend - a.spend),
    qualityRanking, efficientAds, consultaCampaigns,
    pipelineName: stages[0]?.pipeline_name || 'Pipeline',
    lastSync: lastSync ? { at: lastSync.created_at, opps: lastSync.opportunities_synced, contacts: lastSync.contacts_synced } : null,
    hasData: (totalCrmLeads > 0 || adsCampaigns.length > 0),
  };
}

app.get('/api/media/client/:id/crossref', (req, res) => {
  try {
    const clientId = req.params.id;
    const celoConfigPath = path.resolve(__dirname, 'data', 'celo-clients.json');
    const celoConfig = JSON.parse(fs.readFileSync(celoConfigPath, 'utf8'));
    const client = celoConfig.clients[clientId];
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

    const hasCrm = ghlDb.hasData(clientId);
    const hasAds = adsDb.hasData(clientId);

    if (!hasCrm && !hasAds) {
      return res.json({
        hasData: false,
        kpis: { totalCrmLeads: 0, won30d: 0, wonValue30d: 0, roas: 0, conversionRate: 0, consultasAgendadas: 0, custoConsulta: 0 },
        funnel: [], campaigns: [], ads: [], adsets: [],
        qualityRanking: [], efficientAds: [], consultaCampaigns: [],
        pipelineName: '--', lastSync: null,
      });
    }

    const startDate = req.query.start || null;
    const endDate = req.query.end || null;
    const crossref = _buildCrossref(clientId, startDate, endDate);
    res.json(crossref);
  } catch (err) {
    console.error('[Hub] Crossref error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Manual sync trigger for a client
app.post('/api/media/client/:id/sync', async (req, res) => {
  try {
    const clientId = req.params.id;
    const celoConfigPath = path.resolve(__dirname, 'data', 'celo-clients.json');
    const celoConfig = JSON.parse(fs.readFileSync(celoConfigPath, 'utf8'));
    const client = celoConfig.clients[clientId];
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

    const results = {};

    // Sync GHL
    if (client.ghlLocationId && client.ghlToken) {
      try {
        const GhlSyncer = require('./lib/ghl-syncer');
        const syncer = new GhlSyncer();
        const ghlResult = await syncer.syncClient(clientId);
        results.ghl = { success: true, ...ghlResult };
      } catch (err) { results.ghl = { success: false, error: err.message }; }
    }

    // Sync Ads
    if (client.metaAdAccountId) {
      try {
        const AdsSyncer = require('./lib/ads-syncer');
        const adsSyncer = new AdsSyncer();
        const adsResult = await adsSyncer.syncClient(clientId);
        results.ads = { success: true, ...adsResult };
      } catch (err) { results.ads = { success: false, error: err.message }; }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Lead Scoring endpoints
// ============================================================

app.get('/api/media/client/:id/lead-scores', (req, res) => {
  try {
    const clientId = req.params.id;
    const { tier, limit, offset } = req.query;
    const scores = ghlDb.getLeadScores(clientId, {
      tier: tier || undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
    res.json({ success: true, data: scores });
  } catch (err) {
    console.error('[Hub] Lead scores error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/media/client/:id/lead-scores/summary', (req, res) => {
  try {
    const clientId = req.params.id;
    const summary = ghlDb.getScoreSummary(clientId);
    res.json({ success: true, ...summary });
  } catch (err) {
    console.error('[Hub] Lead score summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/media/client/:id/lead-scores/distribution', (req, res) => {
  try {
    const clientId = req.params.id;
    const distribution = ghlDb.getScoreDistribution(clientId);
    res.json({ success: true, ...distribution });
  } catch (err) {
    console.error('[Hub] Lead score distribution error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/media/client/:id/lead-scores/recalculate', (req, res) => {
  try {
    const clientId = req.params.id;
    const leadScorer = require('./lib/lead-scorer');
    const result = leadScorer.scoreAllLeads(clientId);
    res.json({ success: true, summary: result.summary, distribution: result.distribution, totalScored: result.leads.length });
  } catch (err) {
    console.error('[Hub] Lead score recalculate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/media/client/:id/lead-scores/by-campaign', (req, res) => {
  try {
    const clientId = req.params.id;
    const data = ghlDb.getScoresByCampaign(clientId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[Hub] Lead scores by campaign error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Client Dashboard (full 6-tab dashboard replicating Syra Vision)
// ============================================================

app.get('/dashboard/:clientId', (req, res) => {
  const clientId = req.params.clientId;
  const celoConfigPath = path.resolve(__dirname, 'data', 'celo-clients.json');
  let clientName = clientId;
  try {
    const celoConfig = JSON.parse(fs.readFileSync(celoConfigPath, 'utf8'));
    const client = celoConfig.clients[clientId];
    if (client) clientName = client.name;
  } catch {}

  const htmlPath = path.resolve(__dirname, 'public', 'client-dashboard.html');
  if (!fs.existsSync(htmlPath)) return res.status(404).send('Dashboard não encontrado');

  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace(/\{\{clientId\}\}/g, clientId);
  html = html.replace(/\{\{clientName\}\}/g, clientName);
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.send(html);
});

// ============================================================
// Client Detail Page
// ============================================================

app.get('/client/:id', (req, res) => {
  const clientId = req.params.id;
  res.send(buildClientDetailHtml(clientId));
});

function buildClientDetailHtml(clientId) {
  // Load data server-side for SSR
  const configPath = path.resolve(__dirname, '..', 'docs', 'clientes', 'CLIENTES-CONFIG.json');
  let config, client;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    client = config.clients[clientId];
  } catch { return '<h1>Erro ao carregar configuração</h1>'; }
  if (!client) return '<h1>Cliente não encontrado</h1>';

  let brand = null;
  if (client.brand && client.brand.configFile) {
    const brandPath = path.resolve(__dirname, client.brand.configFile);
    if (fs.existsSync(brandPath)) {
      try { brand = JSON.parse(fs.readFileSync(brandPath, 'utf8')); } catch {}
    }
  }

  let profile = '';
  if (client.paths && client.paths.profile) {
    const profilePath = path.resolve(__dirname, '..', client.paths.profile);
    if (fs.existsSync(profilePath)) {
      try { profile = fs.readFileSync(profilePath, 'utf8'); } catch {}
    }
  }

  let kbFiles = [];
  if (client.paths && client.paths.folder) {
    const kbDir = path.resolve(__dirname, '..', client.paths.folder, 'knowledge-base');
    if (fs.existsSync(kbDir)) {
      try { kbFiles = fs.readdirSync(kbDir).filter(f => !f.startsWith('.')); } catch {}
    }
  }

  let docFiles = [];
  if (client.paths && client.paths.folder) {
    const folder = path.resolve(__dirname, '..', client.paths.folder);
    if (fs.existsSync(folder)) {
      try { docFiles = fs.readdirSync(folder).filter(f => !f.startsWith('.')); } catch {}
    }
  }

  let dbInfo = null;
  if (client.paths && client.paths.folder) {
    const dbPath = path.resolve(__dirname, '..', client.paths.folder, 'banco-dados', 'conversas.db');
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      dbInfo = { exists: true, sizeKB: Math.round(stats.size / 1024), modified: stats.mtime.toISOString() };
    }
  }

  const accentColor = brand ? brand.colors.accent : (client.brand ? client.brand.primaryColor : '#C8FF00');
  const darkColor = brand ? (brand.colors.dark || brand.colors.primary) : '#151515';
  const clientName = brand ? brand.brandName : client.name;
  const hasBrand = !!brand;

  // Generate color swatches HTML
  const colorSwatches = brand ? Object.entries(brand.colors).map(([name, hex]) =>
    `<div class="cd-swatch" onclick="copySwatch('${hex}')" title="Clique para copiar">
      <div class="cd-swatch-preview" style="background:${hex};${hex === '#FFFFFF' || hex === '#E8DCC8' ? 'border:1px solid var(--border-base);' : ''}"></div>
      <div class="cd-swatch-info">
        <span class="cd-swatch-name">${name}</span>
        <span class="cd-swatch-hex">${hex}</span>
      </div>
    </div>`
  ).join('') : '';

  // Logo gallery
  const logoGallery = brand && brand.logos ? Object.entries(brand.logos).map(([name, src]) =>
    `<div class="cd-logo-item">
      <div class="cd-logo-preview" style="background:${name.includes('light') ? '#f0f0f0' : darkColor}">
        <img src="${src}" alt="${name}" onerror="this.parentElement.innerHTML='<span class=\\'cd-logo-placeholder\\'>Logo pendente</span>'" />
      </div>
      <span class="cd-logo-name">${name}</span>
    </div>`
  ).join('') : '';

  // Usage rules
  const usageDos = brand && brand.usage ? brand.usage.dos.map(d => `<li>${d}</li>`).join('') : '';
  const usageDonts = brand && brand.usage ? brand.usage.donts.map(d => `<li>${d}</li>`).join('') : '';

  // Fonts
  const fontsHtml = brand && brand.fonts ? `
    <div class="cd-font-row">
      <span class="cd-font-label">Headline</span>
      <span class="cd-font-value" style="font-family:'${brand.fonts.headline}',serif;font-size:1.5rem">${brand.fonts.headline}</span>
    </div>
    <div class="cd-font-row">
      <span class="cd-font-label">Body</span>
      <span class="cd-font-value" style="font-family:'${brand.fonts.body}',sans-serif">${brand.fonts.body} — The quick brown fox jumps over the lazy dog</span>
    </div>` : '';

  // Doc files list
  const docsListHtml = docFiles.map(f => {
    const icon = f.endsWith('.md') ? '📄' : f.endsWith('.json') ? '📊' : f.endsWith('.db') ? '🗄️' : '📁';
    return `<div class="cd-doc-item"><span class="cd-doc-icon">${icon}</span><span class="cd-doc-name">${f}</span></div>`;
  }).join('');

  // KB files list
  const kbListHtml = kbFiles.map(f =>
    `<div class="cd-doc-item"><span class="cd-doc-icon">🧠</span><span class="cd-doc-name">${f}</span></div>`
  ).join('');

  // Integration status
  const integrations = [];
  if (client.celo) {
    integrations.push({ name: 'Meta Ads', icon: '📊', status: client.celo.metaAdAccountId ? 'connected' : 'none', detail: client.celo.metaAdAccountId || '' });
    integrations.push({ name: 'GoHighLevel', icon: '⚡', status: client.celo.ghlLocationId ? 'connected' : 'none', detail: client.celo.ghlLocationId || '' });
  }
  if (client.googleSheets) {
    integrations.push({ name: 'Google Sheets', icon: '📋', status: 'connected', detail: client.googleSheets.spreadsheetId });
  }
  if (client.contact && client.contact.instagram) {
    integrations.push({ name: 'Instagram', icon: '📷', status: 'connected', detail: client.contact.instagram });
  }
  if (client.integrations) {
    if (client.integrations.groupJid) integrations.push({ name: 'WhatsApp Group', icon: '💬', status: 'connected', detail: client.integrations.groupJid.substring(0, 20) + '...' });
    if (client.integrations.clickupListId) integrations.push({ name: 'ClickUp', icon: '✅', status: 'connected', detail: 'List ' + client.integrations.clickupListId });
  }

  const integrationsHtml = integrations.map(i =>
    `<div class="cd-integration-row">
      <span class="cd-integration-icon">${i.icon}</span>
      <div class="cd-integration-info">
        <span class="cd-integration-name">${i.name}</span>
        <span class="cd-integration-detail">${i.detail}</span>
      </div>
      <span class="cd-integration-status ${i.status}">${i.status === 'connected' ? 'Conectado' : 'Pendente'}</span>
    </div>`
  ).join('');

  // Profile summary (first ~30 lines of markdown rendered simply)
  const profileSummary = profile ? profile.split('\n').slice(0, 40).map(line => {
    if (line.startsWith('# ')) return `<h3 class="cd-profile-h1">${line.substring(2)}</h3>`;
    if (line.startsWith('## ')) return `<h4 class="cd-profile-h2">${line.substring(3)}</h4>`;
    if (line.startsWith('### ')) return `<h5 class="cd-profile-h3">${line.substring(4)}</h5>`;
    if (line.startsWith('- ')) return `<div class="cd-profile-li">${line.substring(2)}</div>`;
    if (line.startsWith('| ')) return `<div class="cd-profile-table-row">${line}</div>`;
    if (line.startsWith('**') && line.endsWith('**')) return `<strong>${line.replace(/\*\*/g, '')}</strong>`;
    if (line.trim() === '---') return '<hr class="cd-divider">';
    if (line.trim() === '') return '';
    return `<p class="cd-profile-p">${line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`;
  }).join('\n') : '<p class="cd-empty">Perfil não disponível</p>';

  // Google Fonts for client brand
  const extraFonts = brand && brand.fonts.headline !== 'Inter'
    ? `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(brand.fonts.headline)}:wght@400;600;700&display=swap" rel="stylesheet">`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${client.name} — Design System | Syra Hub</title>
${getSharedFontsLink()}
${extraFonts}
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"><\/script>
<style>
${getSharedTokensCss()}

/* === CLIENT DETAIL OVERRIDES === */
:root {
  --client-accent: ${accentColor};
  --client-dark: ${darkColor};
  --client-accent-dim: ${accentColor}18;
  --client-accent-border: ${accentColor}44;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { height: 100%; scroll-behavior: smooth; }
body {
  font-family: var(--font-body);
  background: var(--bg-base);
  color: var(--text-primary);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  font-size: 0.875rem;
  line-height: 1.5;
}

/* === TOP BAR === */
.cd-topbar {
  position: sticky; top: 0; z-index: 100;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  padding: 12px 24px;
  display: flex; align-items: center; gap: 16px;
}
.cd-back-btn {
  display: flex; align-items: center; gap: 6px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  padding: 6px 14px; border-radius: 8px;
  cursor: pointer; font-size: 0.8125rem;
  transition: all 150ms ease;
  text-decoration: none;
}
.cd-back-btn:hover { border-color: var(--client-accent); color: var(--client-accent); }
.cd-back-btn svg { width: 16px; height: 16px; }
.cd-topbar-title {
  font-family: var(--font-display); font-weight: 700;
  font-size: 1rem; color: var(--text-primary);
}
.cd-topbar-badge {
  font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; padding: 2px 10px; border-radius: 999px;
  background: var(--client-accent-dim); color: var(--client-accent);
}

/* === SIDEBAR NAV === */
.cd-layout { display: flex; min-height: calc(100vh - 49px); }
.cd-sidebar {
  width: 200px; flex-shrink: 0;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  padding: 20px 12px;
  position: sticky; top: 49px; height: calc(100vh - 49px);
  overflow-y: auto;
}
.cd-sidebar-link {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 8px;
  color: var(--text-secondary); font-size: 0.8125rem;
  cursor: pointer; text-decoration: none;
  transition: all 150ms ease;
  margin-bottom: 2px;
}
.cd-sidebar-link:hover { background: var(--bg-elevated); color: var(--text-primary); }
.cd-sidebar-link.active { background: var(--client-accent-dim); color: var(--client-accent); }
.cd-sidebar-link svg { width: 16px; height: 16px; }

/* === MAIN CONTENT === */
.cd-main { flex: 1; padding: 32px; max-width: 960px; }

/* === HERO === */
.cd-hero {
  display: flex; align-items: center; gap: 24px;
  padding: 32px; border-radius: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  margin-bottom: 40px;
}
.cd-hero-logo {
  width: 80px; height: 80px; border-radius: 12px;
  background: var(--client-dark);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; flex-shrink: 0;
}
.cd-hero-logo img { max-width: 90%; max-height: 90%; object-fit: contain; }
.cd-hero-logo .cd-hero-initial {
  font-family: var(--font-display); font-size: 2rem; font-weight: 700;
  color: var(--client-accent);
}
.cd-hero-info h1 {
  font-family: var(--font-display); font-size: 1.5rem; font-weight: 700;
  color: var(--text-primary); margin-bottom: 4px;
}
.cd-hero-info p { color: var(--text-secondary); font-size: 0.875rem; }
.cd-hero-tags { display: flex; gap: 8px; margin-top: 8px; }
.cd-hero-tag {
  font-size: 0.6875rem; padding: 3px 10px; border-radius: 999px;
  background: var(--bg-elevated); color: var(--text-muted);
  border: 1px solid var(--border-subtle);
}
.cd-hero-tag.accent { background: var(--client-accent-dim); color: var(--client-accent); border-color: var(--client-accent-border); }

/* === SECTION BLOCK === */
.cd-section {
  margin-bottom: 40px;
  scroll-margin-top: 60px;
}
.cd-section-title {
  font-family: var(--font-display); font-size: 1.125rem; font-weight: 700;
  color: var(--text-primary); margin-bottom: 20px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex; align-items: center; gap: 8px;
}
.cd-section-title svg { width: 20px; height: 20px; color: var(--client-accent); }

/* === COLOR SWATCHES === */
.cd-swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.cd-swatch {
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
  border-radius: 10px; overflow: hidden; cursor: pointer;
  transition: all 150ms ease;
}
.cd-swatch:hover { border-color: var(--client-accent-border); transform: translateY(-2px); }
.cd-swatch-preview { height: 60px; }
.cd-swatch-info { padding: 8px 10px; }
.cd-swatch-name { display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-primary); text-transform: capitalize; }
.cd-swatch-hex { display: block; font-family: var(--font-mono); font-size: 0.6875rem; color: var(--text-muted); }

/* === TYPOGRAPHY === */
.cd-font-row {
  padding: 16px; background: var(--bg-surface);
  border: 1px solid var(--border-subtle); border-radius: 10px;
  margin-bottom: 8px;
}
.cd-font-label {
  display: block; font-size: 0.6875rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--text-muted); margin-bottom: 6px;
}
.cd-font-value { color: var(--text-primary); }

/* === LOGOS === */
.cd-logos { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.cd-logo-item { text-align: center; }
.cd-logo-preview {
  height: 100px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--border-subtle);
  margin-bottom: 6px; overflow: hidden;
}
.cd-logo-preview img { max-width: 80%; max-height: 80%; object-fit: contain; }
.cd-logo-name { font-size: 0.75rem; color: var(--text-muted); }
.cd-logo-placeholder { font-size: 0.75rem; color: var(--text-disabled); }

/* === USAGE RULES === */
.cd-usage { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.cd-usage-block {
  padding: 16px; border-radius: 10px;
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
}
.cd-usage-title {
  font-weight: 700; font-size: 0.8125rem; margin-bottom: 10px;
  display: flex; align-items: center; gap: 6px;
}
.cd-usage-title.do { color: var(--success); }
.cd-usage-title.dont { color: var(--danger); }
.cd-usage-block ul { list-style: none; padding: 0; }
.cd-usage-block li {
  font-size: 0.8125rem; color: var(--text-secondary);
  padding: 4px 0; padding-left: 16px; position: relative;
}
.cd-usage-block li::before {
  content: ''; position: absolute; left: 0; top: 10px;
  width: 6px; height: 6px; border-radius: 50%;
}
.cd-usage-block.do li::before { background: var(--success); }
.cd-usage-block.dont li::before { background: var(--danger); }

/* === DOC LIST === */
.cd-doc-list { display: flex; flex-direction: column; gap: 4px; }
.cd-doc-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; background: var(--bg-surface);
  border: 1px solid var(--border-subtle); border-radius: 8px;
  font-size: 0.8125rem; color: var(--text-primary);
}
.cd-doc-icon { font-size: 1rem; }
.cd-doc-name { font-family: var(--font-mono); font-size: 0.75rem; }

/* === INTEGRATIONS === */
.cd-integration-list { display: flex; flex-direction: column; gap: 6px; }
.cd-integration-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; background: var(--bg-surface);
  border: 1px solid var(--border-subtle); border-radius: 10px;
}
.cd-integration-icon { font-size: 1.25rem; }
.cd-integration-info { flex: 1; }
.cd-integration-name { display: block; font-weight: 600; font-size: 0.8125rem; color: var(--text-primary); }
.cd-integration-detail { display: block; font-family: var(--font-mono); font-size: 0.6875rem; color: var(--text-muted); }
.cd-integration-status {
  font-size: 0.6875rem; font-weight: 700; padding: 3px 10px;
  border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em;
}
.cd-integration-status.connected { background: var(--success-bg); color: var(--success); }
.cd-integration-status.none { background: var(--bg-elevated); color: var(--text-disabled); }

/* === DB INFO === */
.cd-db-card {
  padding: 20px; background: var(--bg-surface);
  border: 1px solid var(--border-subtle); border-radius: 10px;
}
.cd-db-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-faint); }
.cd-db-key { font-size: 0.8125rem; color: var(--text-secondary); }
.cd-db-val { font-family: var(--font-mono); font-size: 0.8125rem; color: var(--text-primary); }

/* === PROFILE === */
.cd-profile-card {
  padding: 24px; background: var(--bg-surface);
  border: 1px solid var(--border-subtle); border-radius: 12px;
  max-height: 500px; overflow-y: auto;
}
.cd-profile-h1 { font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; margin: 16px 0 8px; color: var(--text-primary); }
.cd-profile-h2 { font-family: var(--font-display); font-size: 1rem; font-weight: 600; margin: 12px 0 6px; color: var(--client-accent); }
.cd-profile-h3 { font-size: 0.875rem; font-weight: 600; margin: 10px 0 4px; color: var(--text-primary); }
.cd-profile-p { font-size: 0.8125rem; color: var(--text-secondary); margin-bottom: 4px; }
.cd-profile-li { font-size: 0.8125rem; color: var(--text-secondary); padding-left: 16px; position: relative; }
.cd-profile-li::before { content: '•'; position: absolute; left: 4px; color: var(--client-accent); }
.cd-profile-table-row { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); }
.cd-divider { border: none; border-top: 1px solid var(--border-subtle); margin: 12px 0; }
.cd-empty { color: var(--text-disabled); font-style: italic; }

/* === NO BRAND PLACEHOLDER === */
.cd-no-brand {
  padding: 40px; text-align: center;
  background: var(--bg-surface); border: 1px dashed var(--border-base);
  border-radius: 12px; color: var(--text-muted);
}
.cd-no-brand svg { width: 40px; height: 40px; margin-bottom: 12px; color: var(--text-disabled); }
.cd-no-brand h3 { font-size: 1rem; margin-bottom: 4px; color: var(--text-secondary); }
.cd-no-brand p { font-size: 0.8125rem; }

/* === TOAST === */
.cd-toast {
  position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(60px);
  background: var(--bg-elevated); border: 1px solid var(--client-accent-border);
  color: var(--client-accent); padding: 8px 20px; border-radius: 8px;
  font-size: 0.8125rem; font-weight: 600; opacity: 0;
  transition: all 300ms ease; z-index: 999; pointer-events: none;
}
.cd-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

/* === RESPONSIVE === */
@media (max-width: 768px) {
  .cd-sidebar { display: none; }
  .cd-main { padding: 20px; }
  .cd-hero { flex-direction: column; text-align: center; }
  .cd-hero-tags { justify-content: center; }
  .cd-usage { grid-template-columns: 1fr; }
  .cd-swatches { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
}
</style>
</head>
<body>

<!-- TOP BAR -->
<div class="cd-topbar">
  <a href="/" class="cd-back-btn"><i data-lucide="arrow-left"></i> Hub</a>
  <span class="cd-topbar-title">${client.name}</span>
  <span class="cd-topbar-badge">${client.priority || 'standard'}</span>
</div>

<div class="cd-layout">
  <!-- SIDEBAR -->
  <nav class="cd-sidebar">
    <a href="#design-system" class="cd-sidebar-link active" onclick="activateSidebarLink(this)"><i data-lucide="palette"></i> Design System</a>
    <a href="#profile" class="cd-sidebar-link" onclick="activateSidebarLink(this)"><i data-lucide="user"></i> Perfil</a>
    <a href="#docs" class="cd-sidebar-link" onclick="activateSidebarLink(this)"><i data-lucide="file-text"></i> Documentação</a>
    <a href="#integrations" class="cd-sidebar-link" onclick="activateSidebarLink(this)"><i data-lucide="plug"></i> Integrações</a>
    <a href="#database" class="cd-sidebar-link" onclick="activateSidebarLink(this)"><i data-lucide="database"></i> Banco de Dados</a>
  </nav>

  <!-- MAIN CONTENT -->
  <div class="cd-main">

    <!-- HERO -->
    <div class="cd-hero">
      <div class="cd-hero-logo" style="background:${darkColor}">
        ${brand && brand.logos ? `<img src="${brand.logos['full-dark'] || brand.logos.symbol || ''}" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=\\'cd-hero-initial\\'>${client.name.charAt(0)}</span>'" />` : `<span class="cd-hero-initial">${client.name.charAt(0)}</span>`}
      </div>
      <div class="cd-hero-info">
        <h1>${clientName}</h1>
        <p>${client.specialty || client.category || client.type || ''}</p>
        <div class="cd-hero-tags">
          ${client.priority ? `<span class="cd-hero-tag accent">${client.priority}</span>` : ''}
          ${client.location ? `<span class="cd-hero-tag">${client.location}</span>` : ''}
          ${client.contact && client.contact.instagram ? `<span class="cd-hero-tag">${client.contact.instagram}</span>` : ''}
          ${brand ? `<span class="cd-hero-tag">${brand.style}</span>` : ''}
        </div>
      </div>
    </div>

    <!-- DESIGN SYSTEM -->
    <div class="cd-section" id="design-system">
      <div class="cd-section-title"><i data-lucide="palette"></i> Design System</div>
      ${hasBrand ? `
        <!-- Colors -->
        <h4 style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.08em">Paleta de Cores</h4>
        <div class="cd-swatches">${colorSwatches}</div>

        <!-- Typography -->
        <h4 style="font-size:0.8125rem;color:var(--text-muted);margin:24px 0 10px;text-transform:uppercase;letter-spacing:0.08em">Tipografia</h4>
        ${fontsHtml}

        <!-- Logos -->
        <h4 style="font-size:0.8125rem;color:var(--text-muted);margin:24px 0 10px;text-transform:uppercase;letter-spacing:0.08em">Logos</h4>
        <div class="cd-logos">${logoGallery}</div>

        ${brand.pattern ? `
        <h4 style="font-size:0.8125rem;color:var(--text-muted);margin:24px 0 10px;text-transform:uppercase;letter-spacing:0.08em">Pattern</h4>
        <div class="cd-doc-item"><span class="cd-doc-icon">🔲</span><span class="cd-doc-name">${brand.pattern}</span></div>
        ` : ''}

        <!-- Usage Rules -->
        ${brand.usage ? `
        <h4 style="font-size:0.8125rem;color:var(--text-muted);margin:24px 0 10px;text-transform:uppercase;letter-spacing:0.08em">Regras de Uso</h4>
        <div class="cd-usage">
          <div class="cd-usage-block do"><div class="cd-usage-title do">Fazer</div><ul>${usageDos}</ul></div>
          <div class="cd-usage-block dont"><div class="cd-usage-title dont">Não fazer</div><ul>${usageDonts}</ul></div>
        </div>
        ` : ''}
      ` : `
        <div class="cd-no-brand">
          <i data-lucide="palette"></i>
          <h3>Aguardando Brand Guidelines</h3>
          <p>O design system deste cliente ainda não foi configurado. Envie o manual de marca para gerar automaticamente.</p>
        </div>
      `}
    </div>

    <!-- PROFILE -->
    <div class="cd-section" id="profile">
      <div class="cd-section-title"><i data-lucide="user"></i> Perfil</div>
      <div class="cd-profile-card">${profileSummary}</div>
    </div>

    <!-- DOCS -->
    <div class="cd-section" id="docs">
      <div class="cd-section-title"><i data-lucide="file-text"></i> Documentação</div>
      ${docFiles.length > 0 ? `
        <h4 style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.08em">Arquivos (${docFiles.length})</h4>
        <div class="cd-doc-list">${docsListHtml}</div>
      ` : '<p class="cd-empty">Nenhum documento encontrado</p>'}
      ${kbFiles.length > 0 ? `
        <h4 style="font-size:0.8125rem;color:var(--text-muted);margin:20px 0 10px;text-transform:uppercase;letter-spacing:0.08em">Knowledge Base (${kbFiles.length})</h4>
        <div class="cd-doc-list">${kbListHtml}</div>
      ` : ''}
    </div>

    <!-- INTEGRATIONS -->
    <div class="cd-section" id="integrations">
      <div class="cd-section-title"><i data-lucide="plug"></i> Integrações</div>
      ${integrations.length > 0 ? `<div class="cd-integration-list">${integrationsHtml}</div>` : '<p class="cd-empty">Nenhuma integração configurada</p>'}
    </div>

    <!-- DATABASE -->
    <div class="cd-section" id="database">
      <div class="cd-section-title"><i data-lucide="database"></i> Banco de Dados</div>
      ${dbInfo ? `
        <div class="cd-db-card">
          <div class="cd-db-row"><span class="cd-db-key">Status</span><span class="cd-db-val" style="color:var(--success)">Ativo</span></div>
          <div class="cd-db-row"><span class="cd-db-key">Tamanho</span><span class="cd-db-val">${dbInfo.sizeKB} KB</span></div>
          <div class="cd-db-row"><span class="cd-db-key">Última modificação</span><span class="cd-db-val">${new Date(dbInfo.modified).toLocaleString('pt-BR')}</span></div>
        </div>
      ` : `
        <div class="cd-no-brand">
          <i data-lucide="database"></i>
          <h3>Sem banco de dados</h3>
          <p>Nenhum banco SQLite encontrado para este cliente.</p>
        </div>
      `}
    </div>

  </div>
</div>

<div class="cd-toast" id="cd-toast">Copiado!</div>

<script>
lucide.createIcons();

function activateSidebarLink(el) {
  document.querySelectorAll('.cd-sidebar-link').forEach(function(l) { l.classList.remove('active'); });
  el.classList.add('active');
}

// Scroll spy
var observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(e) {
    if (e.isIntersecting) {
      var id = e.target.id;
      document.querySelectorAll('.cd-sidebar-link').forEach(function(l) {
        l.classList.toggle('active', l.getAttribute('href') === '#' + id);
      });
    }
  });
}, { threshold: 0.3, rootMargin: '-60px 0px -50% 0px' });

document.querySelectorAll('.cd-section').forEach(function(s) { observer.observe(s); });

function copySwatch(hex) {
  navigator.clipboard.writeText(hex).then(function() {
    var toast = document.getElementById('cd-toast');
    toast.textContent = hex + ' copiado!';
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 1500);
  });
}
<\/script>
</body>
</html>`;
}

// ============================================================
// HTML do Hub — Design System v2.1
// ============================================================

app.get('/', (req, res) => res.send(buildHubHtml()));

function buildHubHtml() {
  // Generate agent cards for dashboard
  const agentCards = SERVICES.map(s =>
    `<div class="agent-card" id="card-${s.id}" data-id="${s.id}" onclick="openService('${s.id}','${s.url}')">
      <div class="agent-card-top">
        <span class="status-chip checking" id="chip-${s.id}">—</span>
        <span class="latency-badge" id="lat-${s.id}"></span>
      </div>
      <span class="agent-card-icon" style="color:${s.color}">${s.icon}</span>
      <div class="agent-card-name">${s.name}</div>
      <div class="agent-card-label">${s.label}</div>
      <div class="agent-card-footer">
        <span class="agent-card-port">:${s.port}</span>
        <span class="agent-card-cta">Abrir →</span>
      </div>
    </div>`
  ).join('');

  // Generate agent rows for Agentes section
  const agentRows = SERVICES.map(s =>
    `<div class="agent-row" data-id="${s.id}" onclick="openService('${s.id}','${s.url}')">
      <span class="status-dot" id="a-dot-${s.id}"></span>
      <span class="agent-row-icon" style="color:${s.color}">${s.icon}</span>
      <div class="agent-row-info">
        <span class="agent-row-name">${s.name}</span>
        <span class="agent-row-label">${s.label}</span>
      </div>
      <span class="agent-row-port">:${s.port}</span>
      <span class="agent-row-latency" id="a-lat-${s.id}"></span>
      <span class="status-chip checking" id="a-chip-${s.id}">—</span>
    </div>`
  ).join('');

  // Sidebar main icons (excluding config)
  const sidebarMainIcons = SECTIONS.filter(s => s.id !== 'config').map((s, i) =>
    `<button class="sidebar-icon${i === 0 ? ' active' : ''}" data-section="${s.id}" data-tooltip="${s.name}" onclick="navigateSection('${s.id}')">
        <i data-lucide="${s.icon}"></i>
      </button>`
  ).join('\n      ');

  // Config PM2 rows
  const configRows = [...SERVICES, { id: 'hub', name: 'HUB', label: 'Syra Digital Hub', port: PORT, icon: '🏠', color: '#C8FF00' }].map(s =>
    `<div class="config-row">
      <span class="config-row-icon" style="color:${s.color || '#C8FF00'}">${s.icon}</span>
      <div class="config-row-info">
        <span class="config-row-name">${s.name}</span>
        <span class="config-row-label">${s.label}</span>
      </div>
      <span class="config-row-port">:${s.port}</span>
      <span class="status-dot" id="c-dot-${s.id}"></span>
    </div>`
  ).join('');

  // JSON for client-side
  const servicesJson = JSON.stringify(SERVICES).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  const pagesJson = JSON.stringify(PAGES).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  const sectionsJson = JSON.stringify(SECTIONS).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

  return `<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Syra Digital Hub</title>
${getSharedFontsLink()}
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<style>

/* === TOKENS (theme-independent) === */
:root {
  --font-display: 'Space Grotesk', 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-brand: 'Nunito Sans', 'Inter', system-ui, sans-serif;
  --text-2xs: 0.625rem; --text-xs: 0.6875rem; --text-sm: 0.75rem;
  --text-base: 0.875rem; --text-md: 1rem; --text-lg: 1.125rem;
  --text-xl: 1.375rem; --text-2xl: 1.75rem; --text-3xl: 2.25rem;
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px;
  --sp-5: 20px; --sp-6: 24px; --sp-8: 32px; --sp-10: 40px;
  --sp-12: 48px; --sp-16: 64px;
  --r-xs: 3px; --r-sm: 6px; --r-md: 8px; --r-lg: 12px;
  --r-xl: 16px; --r-2xl: 24px; --r-full: 9999px;
  --ease-fast: 120ms cubic-bezier(0.4, 0, 0.2, 1);
  --ease-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --ease-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
  --ease-enter: 600ms ease-out;
  --sidebar-w: 64px;
  --topbar-h: 56px;
}

/* === DARK THEME === */
[data-theme="dark"] {
  --bg-base: #030303; --bg-surface: #0a0a0a; --bg-elevated: #101013;
  --bg-overlay: #18181d; --bg-card: #0d0d10; --bg-muted: #141417;
  --border-faint: #141417; --border-subtle: #1e1e23;
  --border-base: #27272d; --border-strong: #35353c;
  --border-accent: rgba(200,255,0,0.28);
  --text-primary: #F0F0F5; --text-secondary: #8F8FA0;
  --text-muted: #505060; --text-disabled: #36363f;
  --text-on-accent: #0a0a0a;
  --accent: #C8FF00; --accent-hover: #D8FF40;
  --accent-dim: rgba(200,255,0,0.08); --accent-mid: rgba(200,255,0,0.15);
  --accent-glow: rgba(200,255,0,0.22); --accent-border: rgba(200,255,0,0.28);
  --sidebar-bg: #0a0a0a; --sidebar-active: rgba(200,255,0,0.08);
  --success: #22C55E; --success-bg: rgba(34,197,94,0.10);
  --warning: #F59E0B; --warning-bg: rgba(245,158,11,0.10);
  --danger: #EF4444; --danger-bg: rgba(239,68,68,0.10);
  --info: #60A5FA; --info-bg: rgba(96,165,250,0.10);
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.4);
  --shadow-sm: 0 2px 6px rgba(0,0,0,0.5);
  --shadow-md: 0 4px 14px rgba(0,0,0,0.6);
  --shadow-lg: 0 8px 28px rgba(0,0,0,0.7);
  --shadow-glow-ring: 0 0 0 1px rgba(200,255,0,0.28), 0 0 20px rgba(200,255,0,0.22), 0 0 40px rgba(200,255,0,0.08);
}

/* === LIGHT THEME === */
[data-theme="light"] {
  --bg-base: #FFFFFF; --bg-surface: #F5F5F7; --bg-elevated: #EEEEF0;
  --bg-overlay: #E8E8EC; --bg-card: #F8F8FA; --bg-muted: #EBEBED;
  --border-faint: #E8E8EC; --border-subtle: #DCDCE0;
  --border-base: #CFCFD5; --border-strong: #B8B8C0;
  --border-accent: rgba(155,191,0,0.35);
  --text-primary: #1A1A2E; --text-secondary: #555568;
  --text-muted: #888898; --text-disabled: #AAABB8;
  --text-on-accent: #0a0a0a;
  --accent: #9BBF00; --accent-hover: #B2D820;
  --accent-dim: rgba(155,191,0,0.08); --accent-mid: rgba(155,191,0,0.15);
  --accent-glow: rgba(155,191,0,0.22); --accent-border: rgba(155,191,0,0.35);
  --sidebar-bg: #F0F0F2; --sidebar-active: rgba(155,191,0,0.12);
  --success: #16A34A; --success-bg: rgba(22,163,74,0.10);
  --warning: #D97706; --warning-bg: rgba(217,119,6,0.10);
  --danger: #DC2626; --danger-bg: rgba(220,38,38,0.10);
  --info: #3B82F6; --info-bg: rgba(59,130,246,0.10);
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.06);
  --shadow-sm: 0 2px 6px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 14px rgba(0,0,0,0.10);
  --shadow-lg: 0 8px 28px rgba(0,0,0,0.12);
  --shadow-glow-ring: 0 0 0 1px rgba(155,191,0,0.35), 0 0 12px rgba(155,191,0,0.22);
}

/* === RESET === */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { height: 100%; }
body {
  font-family: var(--font-body);
  background: var(--bg-base);
  color: var(--text-primary);
  display: flex;
  height: 100vh;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  font-size: var(--text-base);
  line-height: 1.5;
}

/* === ICON SIDEBAR === */
.icon-sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border-faint);
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100vh;
  padding: var(--sp-3) 0;
  z-index: 50;
}
.sidebar-logo {
  width: 40px; height: 40px;
  background: var(--accent);
  color: var(--text-on-accent);
  border-radius: var(--r-md);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display);
  font-size: 1.1rem; font-weight: 800;
  cursor: pointer;
  margin-bottom: var(--sp-2);
  transition: transform var(--ease-fast);
}
.sidebar-logo:hover { transform: scale(1.05); }

.theme-toggle {
  width: 36px; height: 36px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-md);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--text-secondary);
  margin-bottom: var(--sp-4);
  transition: all var(--ease-fast);
}
.theme-toggle:hover { color: var(--accent); border-color: var(--accent-border); }
.theme-toggle svg { width: 16px; height: 16px; }
[data-theme="dark"] .theme-icon-dark { display: none; }
[data-theme="light"] .theme-icon-light { display: none; }

.sidebar-nav-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-1);
  width: 100%;
  padding: 0 var(--sp-2);
}
.sidebar-nav-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding-top: var(--sp-3);
  border-top: 1px solid var(--border-faint);
  width: 100%;
  padding-left: var(--sp-2); padding-right: var(--sp-2);
}

.sidebar-icon {
  width: 40px; height: 40px;
  background: none; border: none;
  border-radius: var(--r-md);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--text-secondary);
  transition: all var(--ease-fast);
  position: relative;
}
.sidebar-icon svg { width: 22px; height: 22px; stroke-width: 1.75; }
.sidebar-icon:hover { background: var(--bg-elevated); color: var(--text-primary); }
.sidebar-icon.active {
  background: var(--sidebar-active);
  color: var(--accent);
}
.sidebar-icon.active::before {
  content: '';
  position: absolute; left: -8px; top: 25%; height: 50%;
  width: 3px; background: var(--accent);
  border-radius: 0 var(--r-xs) var(--r-xs) 0;
}
/* Tooltip */
.sidebar-icon::after {
  content: attr(data-tooltip);
  position: absolute; left: calc(100% + 10px); top: 50%;
  transform: translateY(-50%);
  background: var(--bg-overlay); color: var(--text-primary);
  font-size: var(--text-xs); font-weight: 500;
  padding: 4px 10px; border-radius: var(--r-sm);
  white-space: nowrap; pointer-events: none;
  opacity: 0; transition: opacity var(--ease-fast);
  border: 1px solid var(--border-subtle);
  z-index: 100;
}
.sidebar-icon:hover::after { opacity: 1; }

.sidebar-avatar {
  width: 36px; height: 36px;
  border-radius: var(--r-full);
  overflow: hidden;
  border: 2px solid var(--border-subtle);
  cursor: pointer;
  position: relative;
}
.sidebar-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-fallback {
  display: none;
  width: 100%; height: 100%;
  align-items: center; justify-content: center;
  background: var(--accent-dim); color: var(--accent);
  font-size: var(--text-xs); font-weight: 700;
  font-family: var(--font-display);
}

/* === MAIN WRAPPER === */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* === TOPBAR === */
.topbar {
  height: var(--topbar-h);
  flex-shrink: 0;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-faint);
  display: flex;
  align-items: center;
  padding: 0 var(--sp-6);
  gap: var(--sp-4);
}
.topbar-section-mode, .topbar-iframe-mode {
  display: flex; align-items: center; width: 100%; gap: var(--sp-4);
}
.topbar-title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  white-space: nowrap;
}
.topbar-tabs {
  display: flex; gap: var(--sp-1);
  margin-left: var(--sp-4);
}
.topbar-tab {
  padding: 6px 14px;
  border-radius: var(--r-full);
  border: none; background: none;
  color: var(--text-muted);
  font-size: var(--text-sm); font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--ease-fast);
}
.topbar-tab:hover { background: var(--bg-elevated); color: var(--text-primary); }
.topbar-tab.active { background: var(--accent-dim); color: var(--accent); }
.topbar-actions {
  margin-left: auto;
  display: flex; align-items: center; gap: var(--sp-2);
  flex-shrink: 0;
}
.topbar-btn {
  width: 34px; height: 34px;
  border-radius: var(--r-md); border: none;
  background: none; color: var(--text-muted);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all var(--ease-fast);
}
.topbar-btn svg { width: 18px; height: 18px; }
.topbar-btn:hover { background: var(--bg-elevated); color: var(--text-primary); }
.topbar-avatar {
  width: 32px; height: 32px;
  border-radius: var(--r-full);
  overflow: hidden;
  border: 2px solid var(--border-subtle);
}
.topbar-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-fallback-sm {
  display: none;
  width: 100%; height: 100%;
  align-items: center; justify-content: center;
  background: var(--accent-dim); color: var(--accent);
  font-size: var(--text-2xs); font-weight: 700;
}

/* Iframe mode topbar */
.topbar-back {
  display: flex; align-items: center; gap: var(--sp-2);
  background: none; border: none;
  color: var(--text-muted); cursor: pointer;
  font-size: var(--text-sm); font-weight: 500;
  font-family: var(--font-body);
  padding: 4px 8px; border-radius: var(--r-sm);
  transition: all var(--ease-fast);
}
.topbar-back svg { width: 16px; height: 16px; }
.topbar-back:hover { color: var(--accent); background: var(--accent-dim); }
.topbar-sep { color: var(--text-disabled); font-size: var(--text-xs); }
.topbar-svc-name {
  font-size: var(--text-base); font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.topbar-svc-badge {
  font-size: var(--text-xs); font-weight: 600;
  padding: 2px 9px; border-radius: var(--r-full);
  margin-left: var(--sp-1);
}
.topbar-svc-badge.online { background: var(--success-bg); color: var(--success); }
.topbar-svc-badge.offline { background: var(--danger-bg); color: var(--danger); }
.topbar-svc-badge.degraded { background: var(--warning-bg); color: var(--warning); }
.topbar-svc-badge.checking { background: var(--bg-elevated); color: var(--text-disabled); }
.topbar-svc-ms {
  font-family: var(--font-mono); font-size: var(--text-xs);
  color: var(--text-muted); margin-left: var(--sp-1);
}
.topbar-iframe-actions { margin-left: auto; display: flex; gap: var(--sp-2); }

/* === CONTENT AREA === */
.content-area {
  flex: 1;
  overflow: hidden;
  position: relative;
}
.section-view {
  display: none;
  position: absolute;
  inset: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border-base) transparent;
}
.section-view::-webkit-scrollbar { width: 4px; }
.section-view::-webkit-scrollbar-track { background: transparent; }
.section-view::-webkit-scrollbar-thumb { background: var(--border-base); border-radius: var(--r-xs); }
.section-view.active { display: block; }
.section-padding { padding: var(--sp-8); max-width: 1400px; }

/* === GREETING === */
.greeting {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  line-height: 1.15;
  margin-bottom: 4px;
}
.greeting-sub {
  font-size: var(--text-base);
  color: var(--text-muted);
  margin-bottom: var(--sp-6);
}

/* === STATS ROW === */
.stats-row {
  display: flex; gap: var(--sp-3);
  margin-bottom: var(--sp-6); flex-wrap: wrap;
}
.stat-pill {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px;
  border-radius: var(--r-full);
  font-size: var(--text-sm); font-weight: 600;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
}
.stat-pill .pill-dot {
  width: 7px; height: 7px; border-radius: var(--r-full);
}
.stat-pill.online .pill-dot { background: var(--success); box-shadow: 0 0 6px rgba(34,197,94,0.5); }
.stat-pill.online { color: var(--success); border-color: rgba(34,197,94,0.2); }
.stat-pill.degraded .pill-dot { background: var(--warning); }
.stat-pill.degraded { color: var(--warning); border-color: rgba(245,158,11,0.2); }
.stat-pill.offline .pill-dot { background: var(--danger); }
.stat-pill.offline { color: var(--danger); border-color: rgba(239,68,68,0.2); }

/* === SECTION BLOCK === */
.section-block { margin-bottom: var(--sp-8); }
.section-block-header {
  display: flex; align-items: center; gap: var(--sp-3);
  margin-bottom: var(--sp-4);
}
.section-block-title {
  font-family: var(--font-display);
  font-size: var(--text-md); font-weight: 700;
  color: var(--text-primary); letter-spacing: -0.02em;
}
.section-block-count {
  background: var(--accent); color: var(--text-on-accent);
  font-size: var(--text-2xs); font-weight: 700;
  padding: 2px 8px; border-radius: var(--r-full);
  min-width: 20px; text-align: center;
}

/* === AGENT CARDS === */
.agents-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-4);
}
.agent-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  padding: var(--sp-5);
  cursor: pointer;
  transition: transform var(--ease-base), border-color var(--ease-base), box-shadow var(--ease-base);
  position: relative; overflow: hidden;
  display: flex; flex-direction: column;
}
.agent-card::before {
  content: '';
  position: absolute; inset: 0;
  border-radius: inherit;
  background: linear-gradient(145deg, rgba(255,255,255,0.025) 0%, transparent 55%);
  pointer-events: none;
}
.agent-card:hover {
  transform: translateY(-3px);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
}
.agent-card.online:hover {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-glow-ring);
}
.agent-card.offline { opacity: 0.45; }
.agent-card.offline:hover {
  opacity: 0.6; transform: none;
  box-shadow: none; border-color: rgba(239,68,68,0.2);
}
.agent-card-top {
  display: flex; align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-4);
}
.status-chip {
  font-size: var(--text-2xs); font-weight: 700;
  letter-spacing: 0.07em; text-transform: uppercase;
  padding: 2px 8px; border-radius: var(--r-full);
}
.status-chip.online { background: var(--success-bg); color: var(--success); }
.status-chip.offline { background: rgba(60,60,70,0.35); color: var(--text-disabled); }
.status-chip.degraded { background: var(--warning-bg); color: var(--warning); }
.status-chip.checking { background: var(--bg-elevated); color: var(--text-disabled); }
.latency-badge {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--text-muted);
}
.agent-card-icon {
  font-size: 1.8rem; line-height: 1;
  margin-bottom: var(--sp-3); display: block;
}
.agent-card-name {
  font-family: var(--font-display);
  font-size: var(--text-md); font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin-bottom: 3px;
}
.agent-card-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  flex: 1;
}
.agent-card-footer {
  display: flex; align-items: center;
  justify-content: space-between;
  margin-top: var(--sp-4);
  padding-top: var(--sp-3);
  border-top: 1px solid var(--border-faint);
}
.agent-card-port {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-disabled);
  background: var(--bg-elevated);
  padding: 2px 7px; border-radius: var(--r-xs);
}
.agent-card-cta {
  font-size: var(--text-xs); font-weight: 500;
  color: var(--text-muted);
  transition: color var(--ease-fast);
}
.agent-card:hover .agent-card-cta { color: var(--accent); }

/* === AGENT ROWS (Agentes section) === */
.agents-list {
  display: flex; flex-direction: column;
  gap: var(--sp-2);
}
.agent-row {
  display: flex; align-items: center; gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-5);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  cursor: pointer;
  transition: all var(--ease-fast);
}
.agent-row:hover {
  border-color: var(--border-strong);
  background: var(--bg-elevated);
}
.agent-row .status-dot {
  width: 8px; height: 8px; border-radius: var(--r-full);
  flex-shrink: 0; background: var(--border-base);
  transition: background var(--ease-base), box-shadow var(--ease-base);
}
.agent-row .status-dot.online { background: var(--success); box-shadow: 0 0 6px rgba(34,197,94,0.5); }
.agent-row .status-dot.degraded { background: var(--warning); }
.agent-row .status-dot.offline { background: var(--border-base); }
.agent-row-icon { font-size: 1.3rem; flex-shrink: 0; }
.agent-row-info { flex: 1; min-width: 0; }
.agent-row-name { font-weight: 600; color: var(--text-primary); font-size: var(--text-base); }
.agent-row-label {
  font-size: var(--text-xs); color: var(--text-muted);
  display: block; margin-top: 1px;
}
.agent-row-port {
  font-family: var(--font-mono); font-size: var(--text-xs);
  color: var(--text-disabled); background: var(--bg-muted);
  padding: 2px 7px; border-radius: var(--r-xs);
}
.agent-row-latency {
  font-family: var(--font-mono); font-size: var(--text-xs);
  color: var(--text-muted); min-width: 40px; text-align: right;
}

/* === CLIENT CARDS === */
.clients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--sp-4);
}
.client-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  padding: var(--sp-5);
  transition: all var(--ease-fast);
}
.client-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}
.client-card-header {
  display: flex; align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-3);
}
.client-card-name {
  font-family: var(--font-display);
  font-size: var(--text-md); font-weight: 700;
  color: var(--text-primary);
}
.client-card-priority {
  font-size: var(--text-2xs); font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em;
  padding: 2px 8px; border-radius: var(--r-full);
}
.client-card-priority.premium { background: var(--accent-dim); color: var(--accent); }
.client-card-priority.growth { background: var(--info-bg); color: var(--info); }
.client-card-priority.standard { background: var(--bg-elevated); color: var(--text-muted); }
.client-card-meta {
  display: flex; flex-direction: column; gap: var(--sp-1);
  font-size: var(--text-sm); color: var(--text-secondary);
}
.client-card-meta span { display: flex; align-items: center; gap: var(--sp-2); }
.client-card-meta svg { width: 14px; height: 14px; color: var(--text-muted); }

/* === DOC CARDS === */
.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--sp-4);
}
.doc-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  padding: var(--sp-6);
  cursor: pointer;
  transition: all var(--ease-fast);
  display: flex; flex-direction: column; gap: var(--sp-3);
}
.doc-card:hover {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}
.doc-card-icon { font-size: 2rem; }
.doc-card-title {
  font-family: var(--font-display);
  font-size: var(--text-md); font-weight: 700;
  color: var(--text-primary);
}
.doc-card-desc { font-size: var(--text-sm); color: var(--text-secondary); }

/* === INTEGRATION CARDS === */
.integrations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--sp-4);
}
.integration-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  padding: var(--sp-5);
  display: flex; align-items: center; gap: var(--sp-4);
  transition: all var(--ease-fast);
}
.integration-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}
.integration-icon {
  width: 42px; height: 42px;
  border-radius: var(--r-md);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; flex-shrink: 0;
}
.integration-icon svg { width: 22px; height: 22px; }
.integration-info { flex: 1; min-width: 0; }
.integration-name {
  font-weight: 600; color: var(--text-primary);
  font-size: var(--text-base);
}
.integration-desc {
  font-size: var(--text-xs); color: var(--text-muted);
  margin-top: 1px;
}
.integration-port {
  font-family: var(--font-mono); font-size: var(--text-xs);
  color: var(--text-disabled); background: var(--bg-elevated);
  padding: 2px 7px; border-radius: var(--r-xs);
}

/* === CONFIG SECTION === */
.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--sp-4);
}
.config-block {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  padding: var(--sp-5);
}
.config-block-title {
  font-family: var(--font-display);
  font-size: var(--text-sm); font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--accent); margin-bottom: var(--sp-4);
}
.config-rows { display: flex; flex-direction: column; gap: var(--sp-2); }
.config-row {
  display: flex; align-items: center; gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-sm);
  transition: background var(--ease-fast);
}
.config-row:hover { background: var(--bg-elevated); }
.config-row-icon { font-size: 1rem; flex-shrink: 0; width: 24px; text-align: center; }
.config-row-info { flex: 1; min-width: 0; }
.config-row-name { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); }
.config-row-label { font-size: var(--text-xs); color: var(--text-muted); }
.config-row-port {
  font-family: var(--font-mono); font-size: var(--text-xs);
  color: var(--text-disabled); background: var(--bg-muted);
  padding: 1px 6px; border-radius: var(--r-xs);
}
.config-row .status-dot {
  width: 6px; height: 6px; border-radius: var(--r-full);
  flex-shrink: 0; background: var(--border-base);
}
.config-row .status-dot.online { background: var(--success); }

.config-env-row {
  display: flex; justify-content: space-between;
  padding: var(--sp-2) 0;
  border-bottom: 1px solid var(--border-faint);
  font-size: var(--text-sm);
}
.config-env-row:last-child { border-bottom: none; }
.config-env-key { color: var(--text-muted); }
.config-env-val { color: var(--text-primary); font-weight: 500; font-family: var(--font-mono); }

/* === EMPTY STATE === */
.empty-state {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  padding: var(--sp-16) var(--sp-8);
  color: var(--text-muted);
}
.empty-state svg { width: 56px; height: 56px; opacity: 0.15; margin-bottom: var(--sp-4); }
.empty-state-title {
  font-family: var(--font-display);
  font-size: var(--text-xl); font-weight: 700;
  color: var(--text-primary); margin-bottom: var(--sp-2);
}
.empty-state-desc { font-size: var(--text-base); color: var(--text-muted); max-width: 400px; }

/* === SECTION HEADER (for non-dashboard sections) === */
.sh-title {
  font-family: var(--font-display);
  font-size: var(--text-xl); font-weight: 700;
  color: var(--text-primary); margin-bottom: 4px;
  letter-spacing: -0.02em;
}
.sh-desc {
  font-size: var(--text-base); color: var(--text-muted);
  margin-bottom: var(--sp-6);
}

/* === MONITORED GROUPS === */
.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--sp-3);
}
.group-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-md);
  padding: var(--sp-4);
  display: flex; align-items: center; gap: var(--sp-3);
  transition: border-color var(--ease-fast);
}
.group-card:hover { border-color: #25D366; }
.group-icon { font-size: 1.5rem; flex-shrink: 0; }
.group-info { min-width: 0; }
.group-name {
  font-size: 0.85rem; font-weight: 600; color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.group-jid {
  font-size: 0.65rem; color: var(--text-muted);
  font-family: var(--font-mono);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.group-date { font-size: 0.65rem; color: var(--text-muted); margin-top: 2px; }

/* === IFRAME VIEW === */
#iframe-view {
  display: none;
  position: absolute; inset: 0;
  flex-direction: column;
  overflow: hidden;
}
#iframe-view.visible { display: flex; }
.iframe-loading {
  position: absolute; inset: 0;
  background: var(--bg-base);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: var(--sp-3); color: var(--text-muted);
  font-size: var(--text-sm); z-index: 1;
}
@keyframes spin { to { transform: rotate(360deg); } }
.spinner {
  width: 22px; height: 22px;
  border: 2px solid var(--border-base);
  border-top-color: var(--accent);
  border-radius: var(--r-full);
  animation: spin 0.65s linear infinite;
}
#main-frame {
  flex: 1; width: 100%; border: none; background: var(--bg-base);
}

/* === OFFLINE VIEW === */
#offline-view {
  display: none;
  position: absolute; inset: 0;
  flex-direction: column;
  align-items: center; justify-content: center;
  gap: var(--sp-3); text-align: center;
  padding: var(--sp-12);
}
#offline-view.visible { display: flex; }
.offline-icon { font-size: 2.5rem; opacity: 0.15; margin-bottom: var(--sp-1); }
.offline-title {
  font-family: var(--font-display);
  font-size: var(--text-xl); font-weight: 700;
  color: var(--text-primary);
}
.offline-sub { font-size: var(--text-base); color: var(--text-muted); }
.retry-btn {
  margin-top: var(--sp-2);
  padding: 8px 20px; border-radius: var(--r-md);
  border: 1px solid var(--border-base);
  background: transparent; color: var(--text-secondary);
  cursor: pointer; font-size: var(--text-base);
  font-family: var(--font-body); font-weight: 500;
  transition: all var(--ease-fast);
}
.retry-btn:hover {
  border-color: var(--accent-border);
  color: var(--accent); background: var(--accent-dim);
}

/* === BOTTOM NAV (mobile) === */
.bottom-nav {
  display: none;
  position: fixed; bottom: 0; left: 0; right: 0;
  height: 56px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border-faint);
  z-index: 100;
  justify-content: space-around; align-items: center;
}
.bottom-nav-item {
  display: flex; flex-direction: column;
  align-items: center; gap: 2px;
  background: none; border: none;
  color: var(--text-muted); cursor: pointer;
  font-size: 0.6rem; font-family: var(--font-body);
  padding: 4px 8px; border-radius: var(--r-sm);
  transition: color var(--ease-fast);
}
.bottom-nav-item svg { width: 20px; height: 20px; }
.bottom-nav-item.active { color: var(--accent); }
.bottom-nav-item:hover { color: var(--text-primary); }

/* === RESPONSIVE === */
@media (max-width: 1200px) {
  .agents-grid { grid-template-columns: repeat(3, 1fr); }
  .topbar-tabs { display: none; }
}
@media (max-width: 768px) {
  .icon-sidebar { display: none; }
  .bottom-nav { display: flex; }
  .main-wrapper { padding-bottom: 56px; }
  .agents-grid { grid-template-columns: repeat(2, 1fr); }
  .topbar-tabs { display: none; }
  .topbar-title { font-size: var(--text-base); }
}
@media (max-width: 480px) {
  .agents-grid { grid-template-columns: 1fr; }
  .clients-grid { grid-template-columns: 1fr; }
  .docs-grid { grid-template-columns: 1fr; }
  .integrations-grid { grid-template-columns: 1fr; }
  .config-grid { grid-template-columns: 1fr; }
  .section-padding { padding: var(--sp-4); }
  .topbar-actions .topbar-btn:not(:last-child) { display: none; }
}

/* === PULSE ANIMATION === */
@keyframes pulseDot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* === MÍDIA PAGA === */
.metric-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  padding: 16px;
  text-align: center;
}
.metric-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .6px;
  margin-bottom: 6px;
}
.metric-value {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}
.metric-sub {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-base);
  color: var(--text-secondary);
  padding: 6px 12px;
  border-radius: var(--r-md);
  cursor: pointer;
  font-size: 12px;
  font-family: var(--font-body);
  transition: all var(--ease-fast);
}
.btn-action:hover { border-color: var(--accent); color: var(--accent); }

/* Client media card */
.media-client-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  padding: 20px;
  transition: border-color var(--ease-base);
}
.media-client-card:hover { border-color: var(--border-strong); }
.media-client-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.media-client-name {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
}
.media-health-badge {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 14px;
  padding: 2px 10px;
  border-radius: var(--r-full);
  letter-spacing: .5px;
}
.media-pacing-bar-wrap {
  background: var(--bg-overlay);
  border-radius: var(--r-full);
  height: 10px;
  overflow: hidden;
  margin: 10px 0 8px;
}
.media-pacing-bar {
  height: 100%;
  border-radius: var(--r-full);
  transition: width .6s ease;
}
.media-kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 14px;
}
.media-kpi {
  text-align: center;
}
.media-kpi-val {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.media-kpi-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .4px;
}
.media-campaigns-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: 12px;
}
.media-campaigns-table th {
  text-align: left;
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .5px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-subtle);
}
.media-campaigns-table td {
  padding: 8px;
  border-bottom: 1px solid var(--border-faint);
  color: var(--text-secondary);
}
.media-campaigns-table tr:hover td { color: var(--text-primary); }
.media-status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}
.media-status-dot.active { background: var(--success); }
.media-status-dot.paused { background: var(--text-muted); }
.media-suggestions {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.media-suggestion {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  background: var(--bg-overlay);
  border-radius: var(--r-md);
  font-size: 11px;
  color: var(--text-secondary);
}
.media-suggestion-priority {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}
.media-suggestion-priority.high { background: var(--danger); }
.media-suggestion-priority.medium { background: var(--warning); }
.media-suggestion-priority.low { background: var(--info); }

/* CRM Integration */
.crm-panel { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-subtle); }
.crm-panel-title { font-size: 13px; font-weight: 600; color: var(--accent); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.crm-funnel { display: flex; gap: 4px; align-items: flex-end; margin-bottom: 16px; }
.crm-funnel-stage { flex: 1; text-align: center; }
.crm-funnel-bar { background: var(--accent); border-radius: 4px 4px 0 0; min-height: 8px; transition: height 0.3s ease; margin: 0 2px; }
.crm-funnel-count { font-size: 16px; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
.crm-funnel-name { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; margin-top: 4px; }
.crm-funnel-value { font-size: 9px; color: var(--text-secondary); }
.crm-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
.crm-kpi { background: var(--bg-overlay); border-radius: var(--r-md); padding: 10px; text-align: center; }
.crm-kpi-val { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.crm-kpi-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; margin-top: 2px; }
.crm-campaign-row { display: grid; grid-template-columns: 1.5fr repeat(5, 1fr); gap: 4px; padding: 6px 8px; font-size: 11px; border-bottom: 1px solid var(--border-subtle); }
.crm-campaign-row.header { font-weight: 600; color: var(--text-secondary); text-transform: uppercase; font-size: 9px; letter-spacing: 0.3px; border-bottom-color: var(--border); }
.crm-campaign-row:not(.header):hover { background: var(--bg-overlay); }
.crm-campaign-name { color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.crm-leads-list { max-height: 180px; overflow-y: auto; }
.crm-lead-item { display: grid; grid-template-columns: 80px 1.2fr 1fr 0.8fr; gap: 6px; padding: 4px 8px; font-size: 10px; color: var(--text-secondary); border-bottom: 1px solid rgba(255,255,255,0.03); }
.crm-lead-item:hover { background: var(--bg-overlay); }
.crm-unavailable { text-align: center; padding: 20px; font-size: 12px; color: var(--text-muted); background: var(--bg-overlay); border-radius: var(--r-md); margin-top: 12px; }
.crm-section-label { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin: 12px 0 6px; }

</style>
</head>
<body>

<!-- ==================== ICON SIDEBAR ==================== -->
<nav class="icon-sidebar">
  <div class="sidebar-logo" onclick="navigateSection('dashboard')">S</div>

  <button class="theme-toggle" onclick="toggleTheme()" data-tooltip="Tema">
    <i data-lucide="sun" class="theme-icon-light"></i>
    <i data-lucide="moon" class="theme-icon-dark"></i>
  </button>

  <div class="sidebar-nav-main">
      ${sidebarMainIcons}
  </div>

  <div class="sidebar-nav-bottom">
    <button class="sidebar-icon" data-section="config" data-tooltip="Configurações" onclick="navigateSection('config')">
      <i data-lucide="settings"></i>
    </button>
    <div class="sidebar-avatar" data-tooltip="Eric Santos">
      <img src="/public/eric-profile.jpg" alt="ES" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
      <span class="avatar-fallback">ES</span>
    </div>
  </div>
</nav>

<!-- ==================== MAIN ==================== -->
<div class="main-wrapper">

  <!-- Topbar -->
  <header class="topbar">
    <div class="topbar-section-mode" id="topbar-section">
      <h2 class="topbar-title" id="topbar-title">Dashboard</h2>
      <div class="topbar-tabs" id="topbar-tabs"></div>
      <div class="topbar-actions">
        <button class="topbar-btn" title="Buscar"><i data-lucide="search"></i></button>
        <button class="topbar-btn" title="Notificações"><i data-lucide="bell"></i></button>
        <div class="topbar-avatar">
          <img src="/public/eric-profile.jpg" alt="ES" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
          <span class="avatar-fallback-sm">ES</span>
        </div>
      </div>
    </div>
    <div class="topbar-iframe-mode" id="topbar-iframe" style="display:none">
      <button class="topbar-back" onclick="goHome()">
        <i data-lucide="arrow-left"></i> Voltar
      </button>
      <span class="topbar-sep">/</span>
      <span class="topbar-svc-name" id="topbar-svc-name"></span>
      <span class="topbar-svc-badge" id="topbar-svc-badge"></span>
      <span class="topbar-svc-ms" id="topbar-svc-ms"></span>
      <div class="topbar-iframe-actions">
        <button class="topbar-btn" onclick="reloadFrame()" title="Recarregar"><i data-lucide="refresh-cw"></i></button>
        <button class="topbar-btn" onclick="openNewWindow()" title="Nova aba"><i data-lucide="external-link"></i></button>
      </div>
    </div>
  </header>

  <!-- Content Area -->
  <main class="content-area">

    <!-- ===== DASHBOARD ===== -->
    <section class="section-view active" id="section-dashboard">
      <div class="section-padding">
        <h1 class="greeting" id="greeting-text"></h1>
        <p class="greeting-sub" id="greeting-sub">Verificando serviços...</p>

        <div class="stats-row" id="stats-row"></div>

        <div class="section-block">
          <div class="section-block-header">
            <span class="section-block-title">Agentes</span>
            <span class="section-block-count">${SERVICES.length}</span>
          </div>
          <div class="agents-grid">${agentCards}</div>
        </div>

        <div class="section-block" id="monitored-section" style="display:none">
          <div class="section-block-header">
            <span class="section-block-title">Grupos Monitorados</span>
            <span class="section-block-count" id="groups-count">0</span>
          </div>
          <div class="groups-grid" id="groups-grid"></div>
        </div>
      </div>
    </section>

    <!-- ===== AGENTES ===== -->
    <section class="section-view" id="section-agentes">
      <div class="section-padding">
        <h2 class="sh-title">Agentes</h2>
        <p class="sh-desc">Visão detalhada de todos os agentes do sistema</p>
        <div class="agents-list">${agentRows}</div>
      </div>
    </section>

    <!-- ===== CLIENTES ===== -->
    <section class="section-view" id="section-clientes">
      <div class="section-padding">
        <h2 class="sh-title">Clientes</h2>
        <p class="sh-desc">Gestão de clientes da Syra Digital</p>
        <div class="clients-grid" id="clients-grid">
          <div class="empty-state">
            <i data-lucide="loader"></i>
            <div class="empty-state-title">Carregando...</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== CALENDÁRIO ===== -->
    <!-- ===== PROSPECÇÃO ===== -->
    <section class="section-view" id="section-prospeccao">
      <iframe id="prospeccao-frame" data-src="/prospecting" style="width:100%;height:100%;border:none;background:var(--bg-base)"></iframe>
    </section>

    <section class="section-view" id="section-calendario">
      <div class="section-padding">
        <div class="empty-state">
          <i data-lucide="calendar"></i>
          <div class="empty-state-title">Calendário</div>
          <div class="empty-state-desc">Em breve — calendário integrado com Google Calendar, reuniões e deadlines de clientes.</div>
        </div>
      </div>
    </section>

    <!-- ===== INBOX ===== -->
    <section class="section-view" id="section-inbox">
      <div class="section-padding">
        <div class="empty-state">
          <i data-lucide="inbox"></i>
          <div class="empty-state-title">Inbox</div>
          <div class="empty-state-desc">Em breve — caixa de entrada unificada com mensagens de WhatsApp, Telegram e Instagram.</div>
        </div>
      </div>
    </section>

    <!-- ===== MÍDIA PAGA ===== -->
    <section class="section-view" id="section-midia">
      <div class="section-padding">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div>
            <h2 class="sh-title">Mídia Paga</h2>
            <p class="sh-desc">Controle de verba e performance em tempo real — todas as contas</p>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span id="media-last-update" style="font-size:11px;color:var(--text-muted);">--</span>
            <button class="btn-action" onclick="loadMediaData()"><i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> Atualizar</button>
          </div>
        </div>

        <!-- Totais Globais -->
        <div id="media-totals" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
          <div class="metric-card"><div class="metric-label">Verba Total / Mês</div><div class="metric-value" id="mt-budget">--</div></div>
          <div class="metric-card"><div class="metric-label">Projeção Mensal</div><div class="metric-value" id="mt-projected">--</div></div>
          <div class="metric-card"><div class="metric-label">Gasto Hoje</div><div class="metric-value" id="mt-today">--</div></div>
          <div class="metric-card"><div class="metric-label">Campanhas Ativas</div><div class="metric-value" id="mt-active">--</div></div>
        </div>
        <div id="media-crm-totals" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
          <div class="metric-card"><div class="metric-label">Faturamento (30d)</div><div class="metric-value" id="mt-revenue" style="color:var(--accent);">--</div></div>
          <div class="metric-card"><div class="metric-label">Vendas (30d)</div><div class="metric-value" id="mt-won" style="color:var(--success);">--</div></div>
          <div class="metric-card"><div class="metric-label">Leads Novos (7d)</div><div class="metric-value" id="mt-leads">--</div></div>
          <div class="metric-card"><div class="metric-label">Campanhas Pausadas</div><div class="metric-value" id="mt-paused">--</div></div>
        </div>

        <!-- Cards por Cliente -->
        <div id="media-clients" style="display:grid;gap:16px;">
          <div style="text-align:center;padding:40px;color:var(--text-muted);">Carregando dados...</div>
        </div>
      </div>
    </section>

    <!-- ===== FINANCEIRO ===== -->
    <section class="section-view" id="section-financeiro">
      <div class="section-padding">
        <div class="empty-state">
          <i data-lucide="wallet"></i>
          <div class="empty-state-title">Financeiro</div>
          <div class="empty-state-desc">Em breve — dashboard financeiro com receita, despesas, projeções e controle de budget por cliente.</div>
        </div>
      </div>
    </section>

    <!-- ===== DOCUMENTAÇÃO ===== -->
    <section class="section-view" id="section-docs">
      <div class="section-padding">
        <h2 class="sh-title">Documentação</h2>
        <p class="sh-desc">Base de conhecimento e guias do sistema</p>
        <div class="docs-grid">
          <div class="doc-card" onclick="openDocPage('doc-social-media','/docs/social-media')">
            <span class="doc-card-icon">📱</span>
            <div class="doc-card-title">Social Media</div>
            <div class="doc-card-desc">Estratégias, repertório @nova, e playbook de conteúdo para redes sociais.</div>
          </div>
          <div class="doc-card" onclick="openDocPage('doc-alex','/docs/alex')">
            <span class="doc-card-icon">📋</span>
            <div class="doc-card-title">Project Manager</div>
            <div class="doc-card-desc">Documentação do Alex — gestão de projetos, ClickUp e dashboards.</div>
          </div>
          <div class="doc-card" onclick="openDocPage('design-system','/design-system')">
            <span class="doc-card-icon">🎨</span>
            <div class="doc-card-title">Design System</div>
            <div class="doc-card-desc">Tokens, componentes, tipografia e paleta de cores do sistema.</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== INTEGRAÇÕES ===== -->
    <section class="section-view" id="section-integracoes">
      <div class="section-padding">
        <h2 class="sh-title">Integrações</h2>
        <p class="sh-desc">Serviços externos conectados ao sistema</p>
        <div class="integrations-grid">
          <div class="integration-card">
            <div class="integration-icon" style="background:rgba(255,152,0,0.1);color:#FF9800">
              <i data-lucide="zap"></i>
            </div>
            <div class="integration-info">
              <div class="integration-name">GoHighLevel</div>
              <div class="integration-desc">CRM & Marketing Automation</div>
            </div>
            <span class="integration-port">:3004</span>
          </div>
          <div class="integration-card">
            <div class="integration-icon" style="background:rgba(37,211,102,0.1);color:#25D366">
              <i data-lucide="message-circle"></i>
            </div>
            <div class="integration-info">
              <div class="integration-name">Stevo</div>
              <div class="integration-desc">WhatsApp Business API</div>
            </div>
          </div>
          <div class="integration-card">
            <div class="integration-icon" style="background:rgba(123,104,238,0.1);color:#7B68EE">
              <i data-lucide="check-square"></i>
            </div>
            <div class="integration-info">
              <div class="integration-name">ClickUp</div>
              <div class="integration-desc">Project Management</div>
            </div>
          </div>
          <div class="integration-card">
            <div class="integration-icon" style="background:rgba(66,133,244,0.1);color:#4285F4">
              <i data-lucide="hard-drive"></i>
            </div>
            <div class="integration-info">
              <div class="integration-name">Google Drive</div>
              <div class="integration-desc">File Storage & Sync</div>
            </div>
          </div>
          <div class="integration-card">
            <div class="integration-icon" style="background:rgba(0,136,204,0.1);color:#0088CC">
              <i data-lucide="send"></i>
            </div>
            <div class="integration-info">
              <div class="integration-name">Telegram</div>
              <div class="integration-desc">Bot & Notifications</div>
            </div>
          </div>
          <div class="integration-card">
            <div class="integration-icon" style="background:rgba(228,64,95,0.1);color:#E4405F">
              <i data-lucide="instagram"></i>
            </div>
            <div class="integration-info">
              <div class="integration-name">Instagram Graph</div>
              <div class="integration-desc">Social Media API</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== DESIGN SYSTEM ===== -->
    <section class="section-view" id="section-design-system">
      <div class="section-padding">
        <h2 class="sh-title">Design System</h2>
        <p class="sh-desc">Tokens, componentes e guias visuais</p>
        <div class="docs-grid">
          <div class="doc-card" onclick="openDocPage('design-system','/design-system')">
            <span class="doc-card-icon">🎨</span>
            <div class="doc-card-title">Design System Completo</div>
            <div class="doc-card-desc">Visualizar todos os tokens, paleta de cores, tipografia e componentes.</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== CONFIG ===== -->
    <section class="section-view" id="section-config">
      <div class="section-padding">
        <h2 class="sh-title">Configurações</h2>
        <p class="sh-desc">Processos PM2 e ambiente do sistema</p>
        <div class="config-grid">
          <div class="config-block">
            <div class="config-block-title">Processos PM2</div>
            <div class="config-rows">${configRows}</div>
          </div>
          <div class="config-block">
            <div class="config-block-title">Ambiente</div>
            <div class="config-env-row"><span class="config-env-key">Node.js</span><span class="config-env-val" id="cfg-node">—</span></div>
            <div class="config-env-row"><span class="config-env-key">Porta Hub</span><span class="config-env-val">${PORT}</span></div>
            <div class="config-env-row"><span class="config-env-key">Total Serviços</span><span class="config-env-val">${SERVICES.length}</span></div>
            <div class="config-env-row"><span class="config-env-key">Tema</span><span class="config-env-val" id="cfg-theme">dark</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== IFRAME VIEW ===== -->
    <div id="iframe-view">
      <div class="iframe-loading" id="iframe-loading">
        <div class="spinner"></div>
        <span>Carregando serviço...</span>
      </div>
      <iframe id="main-frame" src="about:blank" onload="frameLoaded()"></iframe>
    </div>

    <!-- ===== OFFLINE VIEW ===== -->
    <div id="offline-view">
      <div class="offline-icon">○</div>
      <div class="offline-title" id="offline-title">Serviço offline</div>
      <div class="offline-sub" id="offline-sub">Porta não está respondendo</div>
      <button class="retry-btn" onclick="retryActive()">Tentar novamente</button>
    </div>

  </main>
</div>

<!-- ==================== BOTTOM NAV (mobile) ==================== -->
<nav class="bottom-nav" id="bottom-nav">
  <button class="bottom-nav-item active" data-section="dashboard" onclick="navigateSection('dashboard')">
    <i data-lucide="layout-dashboard"></i><span>Home</span>
  </button>
  <button class="bottom-nav-item" data-section="agentes" onclick="navigateSection('agentes')">
    <i data-lucide="bot"></i><span>Agentes</span>
  </button>
  <button class="bottom-nav-item" data-section="clientes" onclick="navigateSection('clientes')">
    <i data-lucide="users"></i><span>Clientes</span>
  </button>
  <button class="bottom-nav-item" data-section="docs" onclick="navigateSection('docs')">
    <i data-lucide="file-text"></i><span>Docs</span>
  </button>
  <button class="bottom-nav-item" data-section="config" onclick="navigateSection('config')">
    <i data-lucide="settings"></i><span>Config</span>
  </button>
</nav>

<script>
// === DATA ===
var SERVICES = ${servicesJson};
var PAGES = ${pagesJson};
var SECTIONS = ${sectionsJson};
var statusMap = {};
var activeSvcId = null;
var activePageId = null;
var activeUrl = null;
var currentSection = 'dashboard';
var clientsLoaded = false;

// === SECTION TABS CONFIG ===
var SECTION_TABS = {
  'agentes': ['Todos', 'Online', 'Offline'],
  'clientes': ['Todos', 'Premium', 'Standard'],
  'config': ['Processos', 'Ambiente']
};

// === THEME ===
function initTheme() {
  var saved = localStorage.getItem('syra-hub-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  var cfgTheme = document.getElementById('cfg-theme');
  if (cfgTheme) cfgTheme.textContent = document.documentElement.getAttribute('data-theme') || 'dark';
}
function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  var next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('syra-hub-theme', next);
  var cfgTheme = document.getElementById('cfg-theme');
  if (cfgTheme) cfgTheme.textContent = next;
  // Re-create Lucide icons for theme change
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// === GREETING ===
function updateGreeting() {
  var h = new Date().getHours();
  var g = 'Boa noite';
  if (h >= 5 && h < 12) g = 'Bom dia';
  else if (h >= 12 && h < 18) g = 'Boa tarde';
  var el = document.getElementById('greeting-text');
  if (el) el.textContent = g + ', Eric';
}

// === NAVIGATION ===
function navigateSection(id) {
  // Exit iframe mode
  document.getElementById('iframe-view').classList.remove('visible');
  document.getElementById('offline-view').classList.remove('visible');
  document.getElementById('topbar-section').style.display = 'flex';
  document.getElementById('topbar-iframe').style.display = 'none';
  document.getElementById('main-frame').src = 'about:blank';

  // Hide all sections, show target
  document.querySelectorAll('.section-view').forEach(function(el) { el.classList.remove('active'); });
  var target = document.getElementById('section-' + id);
  if (target) {
    target.classList.add('active');
    animatePageIn(target);
  }

  // Update sidebar active
  document.querySelectorAll('.sidebar-icon').forEach(function(el) { el.classList.remove('active'); });
  var sideIcon = document.querySelector('.sidebar-icon[data-section="' + id + '"]');
  if (sideIcon) sideIcon.classList.add('active');

  // Update bottom nav
  document.querySelectorAll('.bottom-nav-item').forEach(function(el) { el.classList.remove('active'); });
  var bottomItem = document.querySelector('.bottom-nav-item[data-section="' + id + '"]');
  if (bottomItem) bottomItem.classList.add('active');

  // Update topbar
  updateTopbar(id);

  // Load data
  if (id === 'clientes' && !clientsLoaded) loadClients();

  activeSvcId = null;
  activePageId = null;
  activeUrl = null;
  currentSection = id;
}

function updateTopbar(sectionId) {
  var sec = SECTIONS.find(function(s) { return s.id === sectionId; });
  var title = document.getElementById('topbar-title');
  if (title && sec) title.textContent = sec.name;

  var tabsEl = document.getElementById('topbar-tabs');
  var tabs = SECTION_TABS[sectionId];
  if (tabsEl) {
    if (tabs) {
      tabsEl.innerHTML = tabs.map(function(t, i) {
        return '<button class="topbar-tab' + (i === 0 ? ' active' : '') + '" onclick="filterTab(this,\\'' + sectionId + '\\',\\'' + t + '\\')">' + t + '</button>';
      }).join('');
    } else {
      tabsEl.innerHTML = '';
    }
  }
}

function filterTab(btn, sectionId, tabName) {
  // Activate tab button
  btn.parentElement.querySelectorAll('.topbar-tab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');

  // Filter logic per section
  if (sectionId === 'agentes') {
    var rows = document.querySelectorAll('#section-agentes .agent-row');
    rows.forEach(function(row) {
      var chipEl = row.querySelector('.status-chip');
      var status = chipEl ? chipEl.textContent.toLowerCase() : '';
      if (tabName === 'Todos') { row.style.display = ''; }
      else if (tabName === 'Online') { row.style.display = status === 'online' ? '' : 'none'; }
      else if (tabName === 'Offline') { row.style.display = (status === 'offline' || status === '—') ? '' : 'none'; }
    });
  } else if (sectionId === 'clientes') {
    var cards = document.querySelectorAll('#clients-grid .client-card');
    cards.forEach(function(card) {
      var priority = card.getAttribute('data-priority') || '';
      if (tabName === 'Todos') { card.style.display = ''; }
      else if (tabName === 'Premium') { card.style.display = priority === 'premium' ? '' : 'none'; }
      else if (tabName === 'Standard') { card.style.display = (priority === 'standard' || priority === 'growth') ? '' : 'none'; }
    });
  }
}

// === SERVICE / DOC NAVIGATION (iframe) ===
function openService(svcId, url) {
  var svc = SERVICES.find(function(s) { return s.id === svcId; });
  if (!svc) return;

  activeSvcId = svcId;
  activePageId = null;
  activeUrl = url;

  // Hide sections
  document.querySelectorAll('.section-view').forEach(function(el) { el.classList.remove('active'); });

  // Switch topbar to iframe mode
  document.getElementById('topbar-section').style.display = 'none';
  document.getElementById('topbar-iframe').style.display = 'flex';
  updateSvcHeader(svcId);

  // Check if offline
  var status = statusMap[svcId] ? statusMap[svcId].status : null;
  if (status === 'offline') {
    showOfflineView(svc);
    return;
  }

  document.getElementById('offline-view').classList.remove('visible');
  document.getElementById('iframe-view').classList.add('visible');
  document.getElementById('iframe-loading').style.display = 'flex';
  document.getElementById('main-frame').src = url;
}

function openDocPage(pageId, url) {
  activeSvcId = null;
  activePageId = pageId;
  activeUrl = url;

  document.querySelectorAll('.section-view').forEach(function(el) { el.classList.remove('active'); });

  document.getElementById('topbar-section').style.display = 'none';
  document.getElementById('topbar-iframe').style.display = 'flex';

  var page = PAGES.find(function(p) { return p.id === pageId; });
  document.getElementById('topbar-svc-name').textContent = page ? page.icon + ' ' + page.name : pageId;
  document.getElementById('topbar-svc-badge').textContent = '';
  document.getElementById('topbar-svc-badge').className = 'topbar-svc-badge';
  document.getElementById('topbar-svc-ms').textContent = '';

  document.getElementById('offline-view').classList.remove('visible');
  document.getElementById('iframe-view').classList.add('visible');
  document.getElementById('iframe-loading').style.display = 'flex';
  document.getElementById('main-frame').src = url;
}

function goHome() {
  activeSvcId = null;
  activePageId = null;
  activeUrl = null;
  document.getElementById('main-frame').src = 'about:blank';
  navigateSection(currentSection || 'dashboard');
}

function updateSvcHeader(svcId) {
  var svc = SERVICES.find(function(s) { return s.id === svcId; });
  var health = statusMap[svcId];
  if (!svc) return;

  document.getElementById('topbar-svc-name').textContent = svc.icon + ' ' + svc.name + ' — ' + svc.label;

  var badge = document.getElementById('topbar-svc-badge');
  var status = health ? health.status : 'checking';
  badge.textContent = status;
  badge.className = 'topbar-svc-badge ' + status;

  var msEl = document.getElementById('topbar-svc-ms');
  msEl.textContent = (health && health.ms && status !== 'offline') ? '· ' + health.ms + 'ms' : '';
}

function frameLoaded() {
  document.getElementById('iframe-loading').style.display = 'none';
}

function showOfflineView(svc) {
  document.getElementById('iframe-view').classList.remove('visible');
  document.getElementById('offline-view').classList.add('visible');
  document.getElementById('offline-title').textContent = svc.name + ' está offline';
  document.getElementById('offline-sub').textContent = 'Porta ' + svc.port + ' não está respondendo';
}

function reloadFrame() {
  if (activeUrl) {
    document.getElementById('iframe-loading').style.display = 'flex';
    document.getElementById('main-frame').src = activeUrl;
  }
}

function openNewWindow() {
  if (activeUrl) window.open(activeUrl, '_blank');
}

async function retryActive() {
  if (!activeSvcId) return;
  var svc = SERVICES.find(function(s) { return s.id === activeSvcId; });
  if (!svc) return;
  var r = await checkOne(svc);
  statusMap[r.id] = r;
  updateServiceUI(r);
  if (r.status !== 'offline') {
    openService(activeSvcId, activeUrl);
  } else {
    document.getElementById('offline-sub').textContent = 'Ainda indisponível. Tente novamente em breve.';
  }
}

// === HEALTH CHECK ===
async function checkOne(svc) {
  try {
    var r = await fetch('/api/health/' + svc.id);
    return await r.json();
  } catch(e) {
    return { id: svc.id, status: 'offline' };
  }
}

async function pollAll() {
  var results = await Promise.all(SERVICES.map(checkOne));
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    statusMap[r.id] = r;
    updateServiceUI(r);
  }

  var online = results.filter(function(r) { return r.status === 'online'; }).length;
  var degraded = results.filter(function(r) { return r.status === 'degraded'; }).length;
  var offline = results.filter(function(r) { return r.status === 'offline'; }).length;
  var total = SERVICES.length;

  document.getElementById('greeting-sub').textContent = online + ' de ' + total + ' serviços ativos';

  // Stats pills
  var statsRow = document.getElementById('stats-row');
  var pills = '';
  if (online > 0) pills += '<div class="stat-pill online"><span class="pill-dot"></span>' + online + ' online</div>';
  if (degraded > 0) pills += '<div class="stat-pill degraded"><span class="pill-dot"></span>' + degraded + ' degraded</div>';
  if (offline > 0) pills += '<div class="stat-pill offline"><span class="pill-dot"></span>' + offline + ' offline</div>';
  statsRow.innerHTML = pills;

  // Animate stats pills
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(statsRow.children,
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.3, stagger: 0.05, ease: 'back.out(1.7)' }
    );
  }

  // Update config PM2 dots
  for (var j = 0; j < results.length; j++) {
    var cDot = document.getElementById('c-dot-' + results[j].id);
    if (cDot) cDot.className = 'status-dot ' + results[j].status;
  }

  if (activeSvcId && statusMap[activeSvcId]) updateSvcHeader(activeSvcId);
}

function updateServiceUI(r) {
  // Dashboard cards
  var card = document.getElementById('card-' + r.id);
  if (card) card.className = 'agent-card ' + r.status;

  var chip = document.getElementById('chip-' + r.id);
  if (chip) { chip.className = 'status-chip ' + r.status; chip.textContent = r.status; }

  var lat = document.getElementById('lat-' + r.id);
  if (lat) lat.textContent = (r.ms != null && r.status !== 'offline') ? r.ms + 'ms' : '';

  // Agentes section
  var aDot = document.getElementById('a-dot-' + r.id);
  if (aDot) aDot.className = 'status-dot ' + r.status;

  var aChip = document.getElementById('a-chip-' + r.id);
  if (aChip) { aChip.className = 'status-chip ' + r.status; aChip.textContent = r.status; }

  var aLat = document.getElementById('a-lat-' + r.id);
  if (aLat) aLat.textContent = (r.ms != null && r.status !== 'offline') ? r.ms + 'ms' : '';
}

// === CLIENTS ===
async function loadClients() {
  try {
    var r = await fetch('/api/clients');
    var data = await r.json();
    renderClients(data);
    clientsLoaded = true;
  } catch(e) {
    var grid = document.getElementById('clients-grid');
    grid.innerHTML = '<div class="empty-state"><div class="empty-state-title">Erro ao carregar clientes</div></div>';
  }
}

function renderClients(data) {
  var grid = document.getElementById('clients-grid');
  if (!data || !data.clients) { grid.innerHTML = ''; return; }

  var clients = Object.values(data.clients);
  grid.innerHTML = clients.map(function(c) {
    var priority = c.priority || 'standard';
    var location = c.location || '';
    var specialty = c.specialty || c.category || '';
    var ig = (c.contact && c.contact.instagram) ? c.contact.instagram : '';

    var brandColor = (c.brand && c.brand.primaryColor) ? c.brand.primaryColor : '';
    var brandBorder = brandColor ? 'border-left: 3px solid ' + brandColor + ';' : '';

    return '<div class="client-card" data-priority="' + priority + '" data-client-id="' + c.id + '" style="cursor:pointer;' + brandBorder + '">' +
      '<div class="client-card-header">' +
        '<div class="client-card-name">' + c.name + '</div>' +
        '<span class="client-card-priority ' + priority + '">' + priority + '</span>' +
      '</div>' +
      '<div class="client-card-meta">' +
        (location ? '<span><i data-lucide="map-pin"></i> ' + location + '</span>' : '') +
        (specialty ? '<span><i data-lucide="briefcase"></i> ' + specialty + '</span>' : '') +
        (ig ? '<span><i data-lucide="instagram"></i> ' + ig + '</span>' : '') +
      '</div>' +
      (brandColor ? '<div style="margin-top:8px;display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:' + brandColor + '"></span><span style="font-size:0.6875rem;color:#505060">Design System</span></div>' : '') +
    '</div>';
  }).join('');

  // Re-render Lucide icons for dynamic content
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Client card click → open detail page
  grid.querySelectorAll('.client-card[data-client-id]').forEach(function(card) {
    card.addEventListener('click', function() {
      window.open('/client/' + this.dataset.clientId, '_blank');
    });
  });

  // Animate
  animatePageIn(document.getElementById('section-clientes'));
}

// === MONITORED GROUPS ===
async function loadMonitoredGroups() {
  try {
    var r = await fetch('/api/monitored-groups');
    var data = await r.json();
    var section = document.getElementById('monitored-section');
    var grid = document.getElementById('groups-grid');
    var badge = document.getElementById('groups-count');

    if (!data.groups || data.groups.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = '';
    badge.textContent = data.groups.length;

    grid.innerHTML = data.groups.map(function(g) {
      var date = g.added_at ? new Date(g.added_at + 'Z').toLocaleDateString('pt-BR') : '';
      var jidShort = g.group_jid.length > 20 ? g.group_jid.substring(0, 18) + '...' : g.group_jid;
      return '<div class="group-card">' +
        '<span class="group-icon">💬</span>' +
        '<div class="group-info">' +
          '<div class="group-name">' + g.client_name + '</div>' +
          '<div class="group-jid">' + jidShort + '</div>' +
          (date ? '<div class="group-date">Desde ' + date + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  } catch(e) {
    // Silencioso se Nico offline
  }
}

// === GSAP ANIMATIONS ===
function animatePageIn(el) {
  if (typeof gsap === 'undefined' || !el) return;
  var cards = el.querySelectorAll('.agent-card, .agent-row, .client-card, .integration-card, .doc-card, .config-block, .empty-state');
  if (cards.length > 0) {
    gsap.fromTo(cards,
      { opacity: 0, y: 15, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
    );
  }
}

// Card hover GSAP
function initCardHover() {
  if (typeof gsap === 'undefined') return;
  document.querySelectorAll('.agent-card').forEach(function(card) {
    card.addEventListener('mouseenter', function() { gsap.to(this, { y: -4, duration: 0.2, ease: 'power2.out' }); });
    card.addEventListener('mouseleave', function() { gsap.to(this, { y: 0, duration: 0.2, ease: 'power2.out' }); });
  });
}

// === KEYBOARD SHORTCUTS ===
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (activeSvcId || activePageId) {
      goHome();
    }
  }
});

// === NODE VERSION (config) ===
function detectNodeVersion() {
  var el = document.getElementById('cfg-node');
  if (el) el.textContent = 'v18+';
}

// === INIT ===
initTheme();
updateGreeting();
pollAll();
loadMonitoredGroups();
setInterval(pollAll, 30000);
setInterval(loadMonitoredGroups, 60000);

// Lucide icons
if (typeof lucide !== 'undefined') lucide.createIcons();

// GSAP entrance
setTimeout(function() { animatePageIn(document.getElementById('section-dashboard')); }, 100);
setTimeout(initCardHover, 500);

detectNodeVersion();

// === MÍDIA PAGA ===
var mediaData = null;

async function loadMediaData() {
  document.getElementById('media-last-update').textContent = 'Carregando...';
  try {
    var r = await fetch('/api/media/overview');
    if (!r.ok) throw new Error('Erro ' + r.status);
    mediaData = await r.json();
    renderMediaOverview(mediaData);
    document.getElementById('media-last-update').textContent = 'Atualizado ' + new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
  } catch (err) {
    document.getElementById('media-clients').innerHTML = '<div style="text-align:center;padding:40px;color:var(--danger);">Erro ao carregar dados do Celo. Verifique se o servidor está rodando na porta 3002.</div>';
    document.getElementById('media-last-update').textContent = 'Erro';
  }
}

function renderMediaOverview(data) {
  // Totais Ads
  var t = data.totals;
  document.getElementById('mt-budget').textContent = 'R$ ' + (t.totalBudget || 0).toLocaleString('pt-BR');
  document.getElementById('mt-projected').textContent = 'R$ ' + (t.totalProjected || 0).toLocaleString('pt-BR', {maximumFractionDigits:0});
  document.getElementById('mt-projected').style.color = t.totalProjected > t.totalBudget * 1.1 ? 'var(--danger)' : t.totalProjected > t.totalBudget * 0.9 ? 'var(--warning)' : 'var(--success)';
  document.getElementById('mt-today').textContent = 'R$ ' + (t.totalSpendToday || 0).toLocaleString('pt-BR', {minimumFractionDigits:2});
  document.getElementById('mt-active').textContent = t.totalActive || 0;
  document.getElementById('mt-paused').textContent = t.totalPaused || 0;
  // Totais CRM
  document.getElementById('mt-revenue').textContent = t.totalRevenue30d > 0 ? 'R$ ' + (t.totalRevenue30d / 1000).toFixed(1) + 'k' : '--';
  document.getElementById('mt-won').textContent = t.totalWon30d || '--';
  document.getElementById('mt-leads').textContent = t.totalLeads7d || '--';

  // Cards por cliente
  var container = document.getElementById('media-clients');
  if (!data.clients || data.clients.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Nenhum cliente configurado</div>';
    return;
  }

  container.innerHTML = data.clients.map(function(c) {
    var pacing = c.pacing;
    var health = c.health;
    var monthly = c.budget.monthly;

    // Health badge
    var hGrade = health ? health.grade : '-';
    var hScore = health ? health.score : 0;
    var hColors = { A: 'var(--success)', B: '#84cc16', C: 'var(--warning)', D: '#f97316', F: 'var(--danger)' };
    var hColor = hColors[hGrade] || 'var(--text-muted)';
    var hBg = hColor.replace(')', ',0.12)').replace('var(', 'rgba(').replace('--success', '34,197,94').replace('--warning', '245,158,11').replace('--danger', '239,68,68');
    if (hGrade === 'A') hBg = 'rgba(34,197,94,0.12)';
    else if (hGrade === 'B') hBg = 'rgba(132,204,22,0.12)';
    else if (hGrade === 'C') hBg = 'rgba(245,158,11,0.12)';
    else if (hGrade === 'D') hBg = 'rgba(249,115,22,0.12)';
    else if (hGrade === 'F') hBg = 'rgba(239,68,68,0.12)';
    else hBg = 'rgba(80,80,96,0.12)';

    // Pacing
    var pacingPct = pacing ? pacing.pctUsed : 0;
    var pacingProjected = pacing ? pacing.projectedMonthly : 0;
    var pacingDaily = pacing ? pacing.dailyAvg : 0;
    var pacingToday = pacing ? pacing.spendToday : 0;
    var daysLeft = pacing ? pacing.daysRemaining : '-';
    var pacingBarColor = pacingPct <= 100 ? 'var(--accent)' : pacingPct <= 110 ? 'var(--warning)' : 'var(--danger)';
    var pacingOnTrack = pacing ? pacing.onTrack : true;
    var barWidth = Math.min(pacingPct, 100);

    // Verba disponível (estimativa)
    var spent = pacingDaily * (new Date().getDate());
    var remaining = Math.max(0, monthly - spent);

    return '<div class="media-client-card" onclick="window.open(\\'/dashboard/' + c.id + '\\', \\'_blank\\')">' +
      '<div class="media-client-header">' +
        '<div>' +
          '<div class="media-client-name">' + c.name + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);">' + c.campaigns.active + ' ativas · ' + c.campaigns.paused + ' pausadas</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<span class="media-health-badge" style="color:' + hColor + ';background:' + hBg + ';">' + hGrade + ' ' + hScore + '</span>' +
        '</div>' +
      '</div>' +

      // Pacing bar
      '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-secondary);">' +
        '<span>Verba: <b style="color:var(--text-primary);">R$ ' + monthly.toLocaleString('pt-BR') + '</b>/mês</span>' +
        '<span>Projeção: <b style="color:' + (pacingOnTrack ? 'var(--text-primary)' : 'var(--danger)') + ';">R$ ' + pacingProjected.toLocaleString('pt-BR', {maximumFractionDigits:0}) + '</b> (' + pacingPct + '%)</span>' +
      '</div>' +
      '<div class="media-pacing-bar-wrap">' +
        '<div class="media-pacing-bar" style="width:' + barWidth + '%;background:' + pacingBarColor + ';"></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);">' +
        '<span>Gasto hoje: R$ ' + pacingToday.toFixed(2) + '</span>' +
        '<span>Média/dia: R$ ' + pacingDaily.toFixed(2) + '</span>' +
        '<span>Disponível: ~R$ ' + remaining.toLocaleString('pt-BR', {maximumFractionDigits:0}) + '</span>' +
        '<span>' + daysLeft + ' dias restantes</span>' +
      '</div>' +

      // KPIs rápidos (Ads + CRM)
      '<div class="media-kpis">' +
        '<div class="media-kpi"><div class="media-kpi-val">' + c.campaigns.active + '</div><div class="media-kpi-label">Ativas</div></div>' +
        '<div class="media-kpi"><div class="media-kpi-val">R$ ' + pacingDaily.toFixed(0) + '</div><div class="media-kpi-label">Média/dia</div></div>' +
        (c.crm ? '<div class="media-kpi"><div class="media-kpi-val" style="color:var(--success);">' + c.crm.won30d + '</div><div class="media-kpi-label">Vendas 30d</div></div>' : '<div class="media-kpi"><div class="media-kpi-val">' + (c.suggestions || 0) + '</div><div class="media-kpi-label">Sugestões</div></div>') +
        (c.crm ? '<div class="media-kpi"><div class="media-kpi-val" style="color:var(--accent);">R$ ' + (c.crm.revenue30d > 0 ? (c.crm.revenue30d/1000).toFixed(1) + 'k' : '0') + '</div><div class="media-kpi-label">Receita 30d</div></div>' : '<div class="media-kpi"><div class="media-kpi-val">' + c.budget.dailyTarget.toFixed(0) + '</div><div class="media-kpi-label">Target/dia</div></div>') +
      '</div>' +
      (c.hasGhl ? '<div style="font-size:9px;text-align:right;color:var(--text-muted);margin-top:4px;">CRM conectado</div>' : '<div style="font-size:9px;text-align:right;color:var(--text-muted);margin-top:4px;opacity:0.5;">Sem CRM</div>') +
    '</div>';
  }).join('');
}

// Detalhe de um cliente (expande campanhas + CRM)
var mediaDetailOpen = null;
async function loadClientDetail(clientId) {
  if (mediaDetailOpen === clientId) { mediaDetailOpen = null; return; }
  mediaDetailOpen = clientId;

  // Fechar painéis abertos
  var cards = document.querySelectorAll('.media-client-card');
  cards.forEach(function(card) {
    var existing = card.querySelector('.media-detail-panel');
    if (existing) existing.remove();
  });

  // Encontrar o card correto
  var card = null;
  var clientInfo = mediaData ? mediaData.clients.find(function(c) { return c.id === clientId; }) : null;
  cards.forEach(function(c) {
    var nameEl = c.querySelector('.media-client-name');
    if (nameEl && clientInfo && nameEl.textContent === clientInfo.name) card = c;
  });
  if (!card) return;

  var panel = document.createElement('div');
  panel.className = 'media-detail-panel';
  panel.style.cssText = 'margin-top:16px;padding-top:16px;border-top:1px solid var(--border-subtle);';
  panel.innerHTML = '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:12px;">Carregando campanhas e CRM...</div>';
  card.appendChild(panel);

  try {
    // Buscar Meta Ads e CRM em paralelo
    var [adsRes, crmRes] = await Promise.all([
      fetch('/api/media/client/' + clientId),
      fetch('/api/media/client/' + clientId + '/crm')
    ]);
    var data = await adsRes.json();
    var crm = await crmRes.json();

    var html = '';

    // === SEÇÃO 1: META ADS ===
    html += '<div class="crm-panel-title">META ADS — Campanhas</div>';

    // Tabela de campanhas ativas
    if (data.active && data.active.length > 0) {
      html += '<table class="media-campaigns-table"><thead><tr><th>Status</th><th>Campanha</th><th>Budget/dia</th><th>Gasto 7d</th><th>CPL</th><th>CTR</th><th>Freq</th><th>Conv</th></tr></thead><tbody>';
      data.active.forEach(function(c) {
        var m = c.metrics || {};
        html += '<tr>' +
          '<td><span class="media-status-dot active"></span>Ativa</td>' +
          '<td style="color:var(--text-primary);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + c.name + '</td>' +
          '<td>R$ ' + (c.budget && c.budget.daily ? c.budget.daily.toFixed(0) : '-') + '</td>' +
          '<td>R$ ' + (m.spend ? m.spend.toFixed(2) : '-') + '</td>' +
          '<td>' + (m.costPerResult ? 'R$ ' + m.costPerResult.toFixed(2) : '-') + '</td>' +
          '<td>' + (m.ctr ? m.ctr.toFixed(2) + '%' : '-') + '</td>' +
          '<td>' + (m.frequency ? m.frequency.toFixed(1) : '-') + '</td>' +
          '<td>' + (m.conversions || 0) + '</td>' +
        '</tr>';
      });
      html += '</tbody></table>';
    } else {
      html += '<div style="font-size:11px;color:var(--text-muted);padding:8px 0;">Sem campanhas ativas</div>';
    }

    if (data.paused && data.paused.length > 0) {
      html += '<div style="margin-top:8px;font-size:11px;color:var(--text-muted);">' + data.paused.length + ' campanhas pausadas</div>';
    }

    // Sugestões do optimizer
    if (data.suggestions && data.suggestions.length > 0) {
      html += '<div class="media-suggestions">';
      var typeIcons = { pause: '⏸', scale: '📈', alert: '⚠', wait: '⏳', creative_fatigue: '🎨' };
      data.suggestions.slice(0, 5).forEach(function(s) {
        html += '<div class="media-suggestion">' +
          '<span class="media-suggestion-priority ' + s.priority + '"></span>' +
          '<div><b>' + (typeIcons[s.type] || '•') + ' ' + s.action + '</b><br>' + s.reason + '</div>' +
        '</div>';
      });
      html += '</div>';
    }

    // === SEÇÃO 2: CRM (GHL) ===
    html += '<div class="crm-panel">';
    html += '<div class="crm-panel-title">CRM — Funil de Vendas (GoHighLevel)</div>';

    if (!crm.available) {
      html += '<div class="crm-unavailable">Sem CRM configurado para este cliente.<br>Leads WhatsApp sem rastreamento GHL.</div>';
    } else if (crm.error) {
      html += '<div class="crm-unavailable" style="color:var(--danger);">Erro CRM: ' + crm.error + '</div>';
    } else {
      // KPIs de conversão
      var conv = crm.conversions || {};
      html += '<div class="crm-kpi-row">' +
        '<div class="crm-kpi"><div class="crm-kpi-val" style="color:var(--success);">' + (conv.won30d || 0) + '</div><div class="crm-kpi-label">Vendas (30d)</div></div>' +
        '<div class="crm-kpi"><div class="crm-kpi-val" style="color:var(--accent);">R$ ' + ((conv.wonValue30d || 0) / 1000).toFixed(1) + 'k</div><div class="crm-kpi-label">Faturamento (30d)</div></div>' +
        '<div class="crm-kpi"><div class="crm-kpi-val">' + (conv.conversionRate || 0) + '%</div><div class="crm-kpi-label">Conv. Rate</div></div>' +
        '<div class="crm-kpi"><div class="crm-kpi-val" style="color:var(--danger);">' + (conv.lost30d || 0) + '</div><div class="crm-kpi-label">Perdidos (30d)</div></div>' +
      '</div>';

      // Funil visual
      if (crm.pipeline && crm.pipeline.stages) {
        var stages = crm.pipeline.stages;
        var maxCount = Math.max.apply(null, stages.map(function(s) { return s.count; }).concat([1]));
        html += '<div class="crm-section-label">' + (crm.pipeline.pipelineName || 'Pipeline') + ' — ' + (crm.pipeline.totalOpen || 0) + ' abertos</div>';
        html += '<div class="crm-funnel">';
        stages.forEach(function(s) {
          var barH = Math.max(8, (s.count / maxCount) * 60);
          var valStr = s.value > 0 ? 'R$ ' + (s.value/1000).toFixed(1) + 'k' : '';
          html += '<div class="crm-funnel-stage">' +
            '<div class="crm-funnel-count">' + s.count + '</div>' +
            '<div class="crm-funnel-bar" style="height:' + barH + 'px;"></div>' +
            '<div class="crm-funnel-name">' + s.name + '</div>' +
            (valStr ? '<div class="crm-funnel-value">' + valStr + '</div>' : '') +
          '</div>';
        });
        html += '</div>';
      }

      // Performance por campanha (cruzamento Meta ↔ CRM)
      if (crm.campaignPerformance && crm.campaignPerformance.length > 0) {
        html += '<div class="crm-section-label">Atribuição: Campanha → Vendas (UTM)</div>';
        html += '<div class="crm-campaign-row header"><div>Campanha</div><div>Leads</div><div>Abertos</div><div>Ganhos</div><div>Perdidos</div><div>Receita</div></div>';
        crm.campaignPerformance.slice(0, 10).forEach(function(cp) {
          var total = cp.open + cp.won + cp.lost;
          if (total === 0 && cp.leads === 0) return;
          html += '<div class="crm-campaign-row">' +
            '<div class="crm-campaign-name">' + cp.campaign + '</div>' +
            '<div>' + (cp.leads || 0) + '</div>' +
            '<div>' + (cp.open || 0) + '</div>' +
            '<div style="color:var(--success);">' + (cp.won || 0) + '</div>' +
            '<div style="color:var(--danger);">' + (cp.lost || 0) + '</div>' +
            '<div style="color:var(--accent);">' + (cp.wonValue > 0 ? 'R$ ' + cp.wonValue.toFixed(0) : '-') + '</div>' +
          '</div>';
        });
      }

      // Leads recentes
      if (crm.recentLeads && crm.recentLeads.total > 0) {
        html += '<div class="crm-section-label">Leads Recentes (7 dias) — ' + crm.recentLeads.total + ' total</div>';
        html += '<div class="crm-leads-list">';
        crm.recentLeads.leads.slice(0, 15).forEach(function(lead) {
          var date = lead.date ? lead.date.split('T')[0].split('-').reverse().slice(0,2).join('/') : '-';
          html += '<div class="crm-lead-item">' +
            '<div>' + date + '</div>' +
            '<div style="color:var(--text-primary);">' + (lead.name || '-') + '</div>' +
            '<div>' + (lead.campaign !== 'Sem UTM' ? lead.campaign : '<span style="color:var(--text-muted);">sem UTM</span>') + '</div>' +
            '<div>' + (lead.tags && lead.tags.length > 0 ? lead.tags.join(', ') : '-') + '</div>' +
          '</div>';
        });
        html += '</div>';
      }
    }
    html += '</div>'; // close crm-panel

    panel.innerHTML = html;
  } catch (err) {
    panel.innerHTML = '<div style="color:var(--danger);font-size:12px;">Erro ao carregar: ' + err.message + '</div>';
  }
}

// Auto-load quando navegar para a seção
var origNavigateSection = typeof navigateSection === 'function' ? navigateSection : null;
if (origNavigateSection) {
  var _origNav = navigateSection;
  navigateSection = function(sectionId) {
    _origNav(sectionId);
    if (sectionId === 'midia' && !mediaData) loadMediaData();
    if (sectionId === 'prospeccao') {
      var pf = document.getElementById('prospeccao-frame');
      if (pf && pf.dataset.src && (!pf.getAttribute('src') || pf.getAttribute('src') === '')) {
        pf.src = pf.dataset.src;
      }
    }
  };
}

</script>
</body>
</html>`;
}


// ============================================================
// Documentação de Agentes (Mermaid.js)
// ============================================================

app.get('/docs/:agentSlug', (req, res) => {
  const slug = req.params.agentSlug;
  const html = buildDocsHtml(slug);
  if (!html) return res.status(404).send('Página não encontrada');
  res.send(html);
});

function buildDocsHtml(slug) {
  if (slug === 'social-media') return buildSocialMediaDocs();
  if (slug === 'alex') return buildAlexDocs();
  return null;
}

function parseNovaRepertoire() {
  const KB = path.resolve(__dirname, '..', 'docs', 'eric-brand', 'knowledge-base');
  const result = {
    estrategias: { total: 0, last: null, byCategory: {}, byFormat: {}, lessons: [] },
    repertorio: { lastDate: null, lastMsgCount: 0, categories: [] },
    aprendizados: { total: 0, last: null, rules: [] },
    lastUpdate: null
  };
  try {
    // --- nova-estrategias.md ---
    const estPath = path.join(KB, 'nova-estrategias.md');
    if (fs.existsSync(estPath)) {
      const est = fs.readFileSync(estPath, 'utf-8');
      const entries = est.match(/^## .+?\|.+?\|/gm) || [];
      result.estrategias.total = entries.length;
      // categories
      const cats = est.match(/\*\*Categoria:\*\* (.+)/g) || [];
      for (const c of cats) {
        const label = c.replace('**Categoria:** ', '').trim();
        result.estrategias.byCategory[label] = (result.estrategias.byCategory[label] || 0) + 1;
      }
      // formats
      const fmts = est.match(/\*\*Formato:\*\* (.+)/g) || [];
      for (const f of fmts) {
        const label = f.replace('**Formato:** ', '').trim();
        result.estrategias.byFormat[label] = (result.estrategias.byFormat[label] || 0) + 1;
      }
      // last entry
      if (entries.length) {
        const last = entries[entries.length - 1];
        const parts = last.replace('## ', '').split('|').map(s => s.trim());
        result.estrategias.last = { date: parts[0], id: parts[1], source: parts[2] || '' };
      }
      // extract lessons per swipe (header + tema + licao)
      const blocks = est.split(/^---$/m).filter(b => b.includes('🧠 Lição'));
      for (const block of blocks) {
        const headerMatch = block.match(/## (.+?) \| (.+?) \| (.+)/);
        const temaMatch = block.match(/\*\*Tema:\*\* (.+)/);
        const catMatch = block.match(/\*\*Categoria:\*\* (.+)/);
        const stratMatch = block.match(/\*\*Estratégia de adaptação:\*\* (.+)/);
        const licaoMatch = block.match(/\*\*🧠 Lição para a Nova:\*\*\n(.+?)(?:\n\n|$)/s);
        if (headerMatch && licaoMatch) {
          const licaoText = licaoMatch[1].trim().split('\n')[0]; // first line
          result.estrategias.lessons.push({
            date: headerMatch[1].trim(),
            id: headerMatch[2].trim(),
            source: headerMatch[3].trim(),
            tema: temaMatch ? temaMatch[1].trim() : '',
            categoria: catMatch ? catMatch[1].trim() : '',
            estrategia: stratMatch ? stratMatch[1].trim() : '',
            licao: licaoText.length > 200 ? licaoText.slice(0, 200) + '...' : licaoText
          });
        }
      }
      result.estrategias.lessons.reverse(); // newest first
    }
    // --- repertorio-nova.md ---
    const repPath = path.join(KB, 'repertorio-nova.md');
    if (fs.existsSync(repPath)) {
      const rep = fs.readFileSync(repPath, 'utf-8');
      const dates = rep.match(/## 🗓️ Análise de Campo — .+/g) || [];
      if (dates.length) {
        result.repertorio.lastDate = dates[dates.length - 1].replace('## 🗓️ Análise de Campo — ', '').trim();
      }
      const msgs = rep.match(/> (\d+) mensagens? reais? analisadas?/g) || [];
      if (msgs.length) {
        const m = msgs[msgs.length - 1].match(/(\d+)/);
        if (m) result.repertorio.lastMsgCount = parseInt(m[1]);
      }
      result.repertorio.totalAnalyses = dates.length;
      // extract category headers (### headings)
      const catHeaders = rep.match(/^### .+$/gm) || [];
      const uniqueCats = [...new Set(catHeaders.map(h => h.replace('### ', '').trim()))];
      result.repertorio.categories = uniqueCats;
      // count quotes
      const quotes = rep.match(/^- \*\*".+?"\*\*/gm) || [];
      result.repertorio.totalQuotes = quotes.length;
    }
    // --- nova-aprendizados.md ---
    const aprPath = path.join(KB, 'nova-aprendizados.md');
    if (fs.existsSync(aprPath)) {
      const apr = fs.readFileSync(aprPath, 'utf-8');
      const feedbacks = apr.match(/FEEDBACK #\d+/g) || [];
      result.aprendizados.total = feedbacks.length;
      // last feedback
      const lastMatch = apr.match(/\[(.+?)\] FEEDBACK #(\d+)/g) || [];
      if (lastMatch.length) {
        const l = lastMatch[lastMatch.length - 1];
        const parts = l.match(/\[(.+?)\] FEEDBACK #(\d+)/);
        if (parts) result.aprendizados.last = { date: parts[1], num: parts[2] };
      }
      // extract rules
      const ruleMatches = apr.match(/\*\*#\d+ — .+?\*\*\n.+?\nRegra gerada: .+/g) || [];
      for (const rm of ruleMatches) {
        const titleMatch = rm.match(/\*\*#(\d+) — (.+?)\*\*/);
        const ruleMatch = rm.match(/Regra gerada: (.+)/);
        if (titleMatch && ruleMatch) {
          result.aprendizados.rules.push({
            num: titleMatch[1],
            title: titleMatch[2],
            rule: ruleMatch[1].replace(/\*\*/g, '')
          });
        }
      }
    }
    // --- knowledge base files (livros + perfis) ---
    result.knowledgeBase = { livros: [], perfis: null, masterRules: null, totalLines: 0 };
    const kbFiles = [
      { file: 'nova-livros-copywriting-classico.md', label: 'Copywriting Clássico (Hopkins, Schwab, Whitman)' },
      { file: 'nova-livros-masterson.md', label: 'Masterson (CopyLogic, Great Leads, Architecture)' },
      { file: 'nova-livros-copywriting-moderno.md', label: 'Copywriting Moderno (Garfinkel, Edwards, Sugarman, Brunson)' },
      { file: 'nova-livros-psicologia.md', label: 'Psicologia (Ariely, Cialdini)' },
      { file: 'nova-referencias-perfis.md', label: 'Perfis de Referência (7 profiles)' },
      { file: 'nova-master-rules.md', label: 'Master Rules (síntese cross-book)' },
    ];
    for (const kb of kbFiles) {
      const kbPath = path.join(KB, kb.file);
      if (fs.existsSync(kbPath)) {
        const content = fs.readFileSync(kbPath, 'utf-8');
        const lines = content.split('\n').length;
        result.knowledgeBase.totalLines += lines;
        if (kb.file.startsWith('nova-livros-')) {
          result.knowledgeBase.livros.push({ label: kb.label, lines, file: kb.file });
        } else if (kb.file === 'nova-referencias-perfis.md') {
          result.knowledgeBase.perfis = { label: kb.label, lines, file: kb.file };
        } else if (kb.file === 'nova-master-rules.md') {
          result.knowledgeBase.masterRules = { label: kb.label, lines, file: kb.file };
        }
      }
    }
    // overall last update
    const files = ['nova-estrategias.md', 'repertorio-nova.md', 'nova-aprendizados.md',
      'icp-persona-detalhado.md', ...kbFiles.map(k => k.file)];
    let latest = 0;
    for (const f of files) {
      const fp = path.join(KB, f);
      if (fs.existsSync(fp)) {
        const stat = fs.statSync(fp);
        if (stat.mtimeMs > latest) latest = stat.mtimeMs;
      }
    }
    if (latest) result.lastUpdate = new Date(latest);
  } catch (e) {
    console.error('[hub] Error parsing Nova repertoire:', e.message);
  }
  return result;
}

function buildSocialMediaDocs() {
  const rep = parseNovaRepertoire();
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@nova — Social Media Strategist</title>
${getSharedFontsLink()}
<style>
${getSubpageCss()}

/* ── Social Media specific CSS ── */

/* Image type section */
.img-types-grid { display: flex; flex-direction: column; gap: 0; }

.img-type-block { margin-bottom: 0; }
.img-type-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.img-type-header h3 {
  font-family: var(--font-display);
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--text-primary);
}
.img-type-desc {
  color: var(--text-secondary);
  font-size: 0.8125rem;
  line-height: 1.6;
  margin-bottom: 20px;
  max-width: 720px;
}

.img-previews-row {
  display: flex;
  gap: var(--sp-4);
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.img-preview-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.img-preview-label {
  font-size: 0.6875rem;
  color: var(--text-muted);
  font-weight: 500;
}

/* Frase preview mockup */
.frase-preview {
  width: 216px;
  height: 270px;
  background: #FFFFFF;
  border-radius: var(--r-md);
  display: flex;
  flex-direction: column;
  padding: 16px 18px 18px;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
}
.frase-spacer { flex: 1; }
.frase-text {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.18;
  letter-spacing: -0.02em;
}
.frase-black { color: #000; }
.frase-red { color: #CC0000; }
.frase-credit {
  margin-top: 8px;
  font-size: 7.5px;
  color: #999;
  font-weight: 400;
}

/* Carousel preview mockup */
.carousel-preview {
  width: 216px;
  height: 270px;
  background: #000;
  border-radius: var(--r-md);
  display: flex;
  flex-direction: column;
  padding: 12px 14px 14px;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
}
.cp-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  flex-shrink: 0;
}
.cp-avatar {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: #333;
  flex-shrink: 0;
}
.cp-info { flex: 1; min-width: 0; }
.cp-name {
  font-size: 7px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
}
.cp-badge {
  display: inline-block;
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #0095F6;
  color: #fff;
  font-size: 5px;
  text-align: center;
  line-height: 7px;
  vertical-align: middle;
  margin-left: 2px;
}
.cp-handle {
  font-size: 6px;
  color: #666;
}
.cp-counter {
  font-size: 6px;
  color: #555;
  flex-shrink: 0;
}
.cp-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}
.cp-headline-lg {
  font-size: 13px;
  font-weight: 900;
  color: #fff;
  line-height: 1.15;
  letter-spacing: -0.02em;
}
.cp-headline-sm {
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
  letter-spacing: -0.02em;
}
.cp-sub {
  font-size: 7px;
  color: #888;
  line-height: 1.35;
}
.cp-imgzone {
  height: 80px;
  background: #1a1a1a;
  border-radius: var(--r-sm);
  margin-top: 8px;
  flex-shrink: 0;
  background-image: repeating-linear-gradient(
    45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px
  );
}

/* Carousel CTA preview */
.carousel-cta { padding: 0; }
.carousel-cta .cp-header { display: none; }
.cp-cta-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 14px;
}
.cp-cta-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: #333;
  margin-bottom: 6px;
}
.cp-cta-name { font-size: 7px; font-weight: 600; color: #fff; }
.cp-cta-handle { font-size: 6px; color: #666; margin-bottom: 10px; }
.cp-cta-divider {
  width: 16px; height: 1px;
  background: #333;
  margin-bottom: 10px;
}
.cp-cta-text {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
  letter-spacing: -0.02em;
}
.cp-cta-hint {
  margin-top: 10px;
  font-size: 6px;
  color: #444;
}

/* Image specs table */
.img-specs {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  overflow: hidden;
  margin-bottom: 16px;
}
.img-specs h4 {
  font-family: var(--font-display);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--accent);
  padding: 12px 16px 0;
  margin-bottom: 4px;
}

/* Repertoire live panel */
.rep-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-4);
  margin-bottom: 24px;
}
.rep-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  padding: 16px 20px;
}
.rep-card-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.rep-card-value {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--accent);
  line-height: 1;
}
.rep-card-sub {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 6px;
}
.rep-last {
  grid-column: 1 / -1;
  background: var(--accent-dim);
  border: 1px solid var(--accent-border);
  border-radius: var(--r-lg);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}
.rep-last-icon {
  font-size: 1.5rem;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-mid);
  border-radius: var(--r-lg);
  flex-shrink: 0;
}
.rep-last-info { flex: 1; }
.rep-last-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-primary);
  margin-bottom: 2px;
}
.rep-last-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}
.rep-last-meta span {
  margin-right: 12px;
}
.rep-cats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.rep-cat-chip {
  font-size: 0.75rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  padding: 5px 12px;
  border-radius: var(--r-full);
  color: var(--text-secondary);
}
.rep-cat-chip strong {
  color: var(--text-primary);
  margin-left: 4px;
}
.rep-live-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: var(--success);
  border-radius: 50%;
  margin-right: 6px;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Repertoire details / knowledge summary */
.rep-details {
  margin-top: 32px;
}
.rep-details summary {
  cursor: pointer;
  font-family: var(--font-display);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  padding: 12px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  list-style: none;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all var(--ease-fast);
}
.rep-details summary:hover { border-color: var(--accent-border); }
.rep-details summary::before {
  content: '▸';
  color: var(--accent);
  font-size: 0.75rem;
  transition: transform 0.2s;
}
.rep-details[open] summary::before { transform: rotate(90deg); }
.rep-details[open] summary {
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  border-bottom-color: transparent;
}
.rep-details-body {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-top: none;
  border-radius: 0 0 var(--r-lg) var(--r-lg);
  padding: 16px 20px;
  max-height: 500px;
  overflow-y: auto;
}
.rep-details-body::-webkit-scrollbar { width: 4px; }
.rep-details-body::-webkit-scrollbar-thumb { background: var(--border-base); border-radius: var(--r-xs); }
.rep-details + .rep-details { margin-top: 12px; }

/* Lesson timeline */
.lesson-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--border-subtle);
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 12px;
}
.lesson-item:last-child { border-bottom: none; }
.lesson-id {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
  padding-top: 2px;
}
.lesson-id .lesson-date {
  display: block;
  font-weight: 400;
  color: var(--text-muted);
  font-size: 0.6875rem;
  margin-top: 2px;
}
.lesson-tema {
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.lesson-licao {
  font-size: 0.78125rem;
  color: var(--text-secondary);
  line-height: 1.55;
}
.lesson-meta {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.lesson-meta-chip {
  font-size: 0.6875rem;
  background: var(--bg-base);
  border: 1px solid var(--border-subtle);
  padding: 2px 8px;
  border-radius: var(--r-full);
  color: var(--text-muted);
}

/* Rule items */
.rule-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);
}
.rule-item:last-child { border-bottom: none; }
.rule-title {
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.rule-text {
  font-size: 0.78125rem;
  color: var(--text-secondary);
  line-height: 1.55;
}

/* Category chips for repertorio */
.rep-cat-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0;
}
.rep-cat-item {
  font-size: 0.78125rem;
  background: var(--bg-base);
  border: 1px solid var(--border-subtle);
  padding: 6px 14px;
  border-radius: var(--r-md);
  color: var(--text-secondary);
}

</style>
</head>
<body>
<div class="container">

  <!-- ═══════════════════════════════════ HEADER ═══════════════════════════════════ -->
  <div class="doc-header doc-section">
    <h1 class="doc-title"><span class="accent">@nova</span> — Social Media Strategist</h1>
    <p class="doc-desc">
      <strong>UNICA</strong> responsavel por todo conteudo do <strong>@byericsantos</strong>.
      Nova escreve, analisa, gera design e gerencia o calendario editorial.
      Nao delega para nenhum outro agente — ela incorpora internamente os frameworks
      de 6 copywriters lendarios, enriquecidos com <strong>12 livros + 7 perfis de referencia</strong>,
      e sempre escreve na <strong>voz do Eric</strong>.
    </p>
    <div class="doc-meta">
      <span class="meta-chip">Port 3007</span>
      <span class="meta-chip">PM2: swipe-collector</span>
      <span class="meta-chip">Bot: SWIPE_BOT_TOKEN</span>
      <span class="meta-chip">Claude Sonnet 4.6</span>
      <span class="meta-chip">Playwright</span>
      <span class="meta-chip">Google Drive</span>
      <span class="meta-chip">12 livros + 7 perfis</span>
    </div>
  </div>

  <!-- ═══════════════════════════════ INDICE ═══════════════════════════════ -->
  <nav class="toc">
    <div class="toc-title">Indice</div>
    <ol class="toc-list">
      <li><a href="#repertorio"><span class="toc-num">01</span> <span class="rep-live-dot"></span>Repertorio (Live)</a></li>
      <li><a href="#skills"><span class="toc-num">02</span> Mapa de Skills</a></li>
      <li><a href="#fluxo1"><span class="toc-num">03</span> Fluxo 1 — Swipe Collector</a></li>
      <li><a href="#revisao"><span class="toc-num">04</span> Fluxo de Revisao</a></li>
      <li><a href="#fluxo2"><span class="toc-num">05</span> Fluxo 2 — Criacao Direta</a></li>
      <li><a href="#fluxo3"><span class="toc-num">06</span> Fluxo 3 — Repertorio Analyzer</a></li>
      <li><a href="#aprovacoes"><span class="toc-num">07</span> Pontos de Aprovacao</a></li>
      <li><a href="#formatos"><span class="toc-num">08</span> Formatos de Conteudo</a></li>
      <li><a href="#escrita"><span class="toc-num">09</span> Capacidades de Escrita</a></li>
      <li><a href="#voz"><span class="toc-num">10</span> DNA da Voz do Eric</a></li>
      <li><a href="#quality"><span class="toc-num">11</span> Quality Gate</a></li>
      <li><a href="#estrategia"><span class="toc-num">12</span> Inteligencia Estrategica</a></li>
      <li><a href="#integracoes"><span class="toc-num">13</span> Integracoes</a></li>
      <li><a href="#imagens"><span class="toc-num">14</span> Tipos de Imagem</a></li>
      <li><a href="#comandos"><span class="toc-num">15</span> Comandos da Nova</a></li>
    </ol>
  </nav>

  <!-- ═══════════════════════════════ REPERTORIO LIVE ═══════════════════════════════ -->
  <div class="doc-section" id="repertorio">
    <h2 class="section-title"><span class="rep-live-dot"></span>Repertorio da Nova — Live</h2>
    <p class="section-sub">Dados lidos em tempo real dos arquivos de conhecimento. Atualiza automaticamente a cada swipe salvo ou analise diaria.</p>

    ${rep.estrategias.last ? `
    <div class="rep-last">
      <div class="rep-last-icon">🧠</div>
      <div class="rep-last-info">
        <div class="rep-last-title">Ultimo aprendizado: ${rep.estrategias.last.id}</div>
        <div class="rep-last-meta">
          <span>📅 ${rep.estrategias.last.date}</span>
          <span>👤 ${rep.estrategias.last.source}</span>
        </div>
      </div>
    </div>
    ` : `
    <div class="rep-last">
      <div class="rep-last-icon">🧠</div>
      <div class="rep-last-info">
        <div class="rep-last-title">Nenhum aprendizado registrado ainda</div>
      </div>
    </div>
    `}

    <div class="rep-grid">
      <div class="rep-card">
        <div class="rep-card-label">Swipes analisados</div>
        <div class="rep-card-value">${rep.estrategias.total}</div>
        <div class="rep-card-sub">nova-estrategias.md</div>
      </div>
      <div class="rep-card">
        <div class="rep-card-label">Analises de campo</div>
        <div class="rep-card-value">${rep.repertorio.totalAnalyses || 0}</div>
        <div class="rep-card-sub">${rep.repertorio.lastDate ? 'Ultima: ' + rep.repertorio.lastDate : 'repertorio-nova.md'}</div>
      </div>
      <div class="rep-card">
        <div class="rep-card-label">Feedbacks do Eric</div>
        <div class="rep-card-value">${rep.aprendizados.total}</div>
        <div class="rep-card-sub">${rep.aprendizados.last ? 'Ultimo: Feedback #' + rep.aprendizados.last.num : 'nova-aprendizados.md'}</div>
      </div>
      <div class="rep-card">
        <div class="rep-card-label">Msgs reais analisadas</div>
        <div class="rep-card-value">${rep.repertorio.lastMsgCount}+</div>
        <div class="rep-card-sub">Na ultima analise diaria</div>
      </div>
    </div>

    ${Object.keys(rep.estrategias.byCategory).length ? `
    <h3 style="font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 10px;">Distribuicao por categoria</h3>
    <div class="rep-cats">
      ${Object.entries(rep.estrategias.byCategory).map(([cat, count]) =>
        '<span class="rep-cat-chip">' + cat + '<strong> ' + count + '</strong></span>'
      ).join('')}
    </div>
    ` : ''}

    ${Object.keys(rep.estrategias.byFormat).length ? `
    <h3 style="font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); margin: 16px 0 10px;">Distribuicao por formato</h3>
    <div class="rep-cats">
      ${Object.entries(rep.estrategias.byFormat).map(([fmt, count]) =>
        '<span class="rep-cat-chip">' + fmt + '<strong> ' + count + '</strong></span>'
      ).join('')}
    </div>
    ` : ''}

    <div class="detail-box" style="margin-top: 24px;">
      <h4>Fontes de conhecimento — Operacional (3 arquivos)</h4>
      <ul>
        <li><strong>nova-estrategias.md</strong> — Licao extraida de cada swipe aprovado (categoria, tecnica, hooks adaptados, estrategia de adaptacao)</li>
        <li><strong>repertorio-nova.md</strong> — Inteligencia de mercado: padroes de comportamento, frases exatas de leads, objecoes implicitas, sinais de compra (atualizado diariamente as 08h)</li>
        <li><strong>nova-aprendizados.md</strong> — Feedback direto do Eric sobre conteudo gerado (o que nao gostou, regra gerada)</li>
      </ul>
    </div>

    <!-- Knowledge Base Expandida -->
    <div class="detail-box" style="margin-top: 16px;">
      <h4>📚 Knowledge Base Expandida — ${rep.knowledgeBase.totalLines} linhas de conhecimento</h4>
      <p style="font-size: 0.78125rem; color: var(--text-secondary); margin: 8px 0 12px;">
        Pesquisa profunda de 12 livros de copywriting/psicologia + 7 perfis de referencia. Compilado como repertorio para criacao de conteudo com fundamentacao teórica.
      </p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        ${rep.knowledgeBase.livros.map(l => `
        <div style="background: rgba(200,255,0,0.04); border: 1px solid var(--border-subtle); border-radius: var(--r-md); padding: 10px 12px;">
          <div style="font-size: 0.6875rem; color: var(--accent); font-weight: 600;">📖 ${l.lines} linhas</div>
          <div style="font-size: 0.78125rem; color: var(--text-primary); margin-top: 2px;">${l.label}</div>
        </div>
        `).join('')}
        ${rep.knowledgeBase.perfis ? `
        <div style="background: rgba(200,255,0,0.04); border: 1px solid var(--border-subtle); border-radius: var(--r-md); padding: 10px 12px;">
          <div style="font-size: 0.6875rem; color: var(--accent); font-weight: 600;">👤 ${rep.knowledgeBase.perfis.lines} linhas</div>
          <div style="font-size: 0.78125rem; color: var(--text-primary); margin-top: 2px;">${rep.knowledgeBase.perfis.label}</div>
        </div>
        ` : ''}
        ${rep.knowledgeBase.masterRules ? `
        <div style="background: rgba(200,255,0,0.08); border: 1px solid var(--accent); border-radius: var(--r-md); padding: 10px 12px;">
          <div style="font-size: 0.6875rem; color: var(--accent); font-weight: 600;">⚡ ${rep.knowledgeBase.masterRules.lines} linhas</div>
          <div style="font-size: 0.78125rem; color: var(--text-primary); margin-top: 2px;">${rep.knowledgeBase.masterRules.label}</div>
        </div>
        ` : ''}
      </div>
      <p style="margin-top: 10px; font-size: 0.75rem; color: var(--text-muted);">
        ${rep.lastUpdate ? 'Ultima atualizacao: ' + rep.lastUpdate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : ''}
      </p>
      <div class="note-callout" style="margin-top: 12px;">
        <strong>Integracao ativa:</strong> <code>nova-master-rules.md</code> e injetado automaticamente em TODA geracao de conteudo via <code>buildPositioningContext()</code> no <code>swipe-replicator.js</code>. Os demais arquivos sao consultados por cada especialista conforme seu <code>bookRef</code> e pelo agente <code>nova.md</code> na ETAPA 2 da hierarquia de consulta.
      </div>
    </div>

    <!-- Resumo expandivel: Licoes dos Swipes -->
    ${rep.estrategias.lessons.length ? `
    <details class="rep-details">
      <summary>🧠 Licoes aprendidas dos swipes (${rep.estrategias.lessons.length})</summary>
      <div class="rep-details-body">
        ${rep.estrategias.lessons.map(l => `
        <div class="lesson-item">
          <div class="lesson-id">
            ${l.id}
            <span class="lesson-date">${l.date.split(' de ').slice(0, 2).join('/')}</span>
          </div>
          <div>
            <div class="lesson-tema">${l.tema}</div>
            <div class="lesson-licao">${l.licao}</div>
            <div class="lesson-meta">
              <span class="lesson-meta-chip">${l.categoria.split(' — ')[0]}</span>
              <span class="lesson-meta-chip">${l.estrategia.split(' — ')[0]}</span>
              <span class="lesson-meta-chip">${l.source}</span>
            </div>
          </div>
        </div>
        `).join('')}
      </div>
    </details>
    ` : ''}

    <!-- Resumo expandivel: Regras do Eric -->
    ${rep.aprendizados.rules.length ? `
    <details class="rep-details">
      <summary>📏 Regras do Eric — feedbacks sobre conteudo (${rep.aprendizados.rules.length})</summary>
      <div class="rep-details-body">
        ${rep.aprendizados.rules.map(r => `
        <div class="rule-item">
          <div class="rule-title">#${r.num} — ${r.title}</div>
          <div class="rule-text">${r.rule}</div>
        </div>
        `).join('')}
      </div>
    </details>
    ` : ''}

    <!-- Resumo expandivel: Repertorio de mercado -->
    ${rep.repertorio.categories.length ? `
    <details class="rep-details">
      <summary>🎙️ Repertorio de mercado — frases reais de leads (${rep.repertorio.totalQuotes || 0} frases em ${rep.repertorio.categories.length} categorias)</summary>
      <div class="rep-details-body">
        <p style="font-size: 0.78125rem; color: var(--text-secondary); margin-bottom: 12px;">
          Categorias de dores e objecoes extraidas de conversas reais com leads (WhatsApp + GHL).
          Fonte: <code>repertorio-nova.md</code>
        </p>
        <div class="rep-cat-list">
          ${rep.repertorio.categories.map(c => '<span class="rep-cat-item">' + c + '</span>').join('')}
        </div>
      </div>
    </details>
    ` : ''}

  </div>

  <!-- ═══════════════════════════════ MAPA DE SKILLS ═══════════════════════════════ -->
  <div class="doc-section" id="skills">
    <h2 class="section-title">Mapa Completo de Skills</h2>
    <p class="section-sub">Todas as capacidades da Nova — skills ativas e planejadas para implementacao futura</p>

    <div class="skills-grid">

      <div class="skill-card">
        <div class="skill-card-title"><span class="icon">✍️</span> Escrita de Conteudo</div>
        <ul class="skill-list">
          <li>Reels — roteiro completo (hook + corpo + CTA)</li>
          <li>Carrossel Twitter — slides com narrativa</li>
          <li>Estatico Twitter — imagem unica 1080x1350</li>
          <li>Frase de impacto — preto + vermelho</li>
          <li>Sequencia Stories — narrativa multi-story</li>
          <li>Legendas Instagram — com CTA</li>
          <li>Copies de campanha — ads e promocoes</li>
          <li>Hooks — 5 opcoes por tema</li>
          <li>CTAs — comandos unicos e diretos</li>
        </ul>
      </div>

      <div class="skill-card">
        <div class="skill-card-title"><span class="icon">🧠</span> Analise e Estrategia</div>
        <ul class="skill-list">
          <li>Decupagem completa de conteudo externo</li>
          <li>Quality Gate — 7 criterios com score</li>
          <li>4 estrategias de conteudo (adaptar, manter, pesquisar, opinar)</li>
          <li>WebSearch — dados atuais 2026 antes de criar</li>
          <li>Analise de referencias e swipe files</li>
          <li>Extracao de dores reais de reunioes</li>
          <li>Selecao inteligente de formato por tema</li>
          <li class="planned">Analise de performance de posts <span class="planned-tag">PLANEJADA</span></li>
        </ul>
      </div>

      <div class="skill-card">
        <div class="skill-card-title"><span class="icon">🎨</span> Design e Visual</div>
        <ul class="skill-list">
          <li>Carousel PNG 1080x1350 (Playwright HTML-to-PNG)</li>
          <li>Estatico Twitter PNG 1080x1350</li>
          <li>Frase de impacto PNG</li>
          <li>Busca automatica de imagens (Google Images)</li>
          <li>4 templates visuais (cover, slide+img, text, CTA)</li>
          <li>Revisao parcial — altera so imagens indicadas</li>
        </ul>
      </div>

      <div class="skill-card">
        <div class="skill-card-title"><span class="icon">📅</span> Planejamento</div>
        <ul class="skill-list">
          <li>Calendario editorial semanal (Seg-Sab)</li>
          <li>Batch semanal — 6 posts, todos os formatos</li>
          <li>Banco de temas extraidos do ICP</li>
          <li>Briefing completo de posicionamento</li>
          <li class="planned">Repurpose — 1 conteudo em multiplos formatos <span class="planned-tag">PLANEJADA</span></li>
          <li class="planned">Trending topics do mercado do ICP <span class="planned-tag">PLANEJADA</span></li>
        </ul>
      </div>

      <div class="skill-card">
        <div class="skill-card-title"><span class="icon">📊</span> Inteligencia de Mercado</div>
        <ul class="skill-list">
          <li>Repertorio Analyzer diario (WhatsApp + GHL)</li>
          <li>Extracao de dores reais verbalizadas</li>
          <li>Cases disponiveis como prova social</li>
          <li>Frases literais do ICP (linguagem real)</li>
          <li>Voice DNA — 1.395 falas reais do Eric</li>
          <li>40 frases de impacto dos Reels</li>
          <li class="planned">Analise de hashtags por nicho <span class="planned-tag">PLANEJADA</span></li>
        </ul>
      </div>

      <div class="skill-card">
        <div class="skill-card-title"><span class="icon">🔄</span> Aprendizado Continuo</div>
        <ul class="skill-list">
          <li>Feedback Evolution — salva cada correcao</li>
          <li>nova-aprendizados.md — regras acumuladas</li>
          <li>Leitura obrigatoria antes de cada criacao</li>
          <li>Regras do Eric tem prioridade sobre genericas</li>
          <li>nova-estrategias.md — licoes dos swipes</li>
          <li>Repertorio-nova.md — atualizado diariamente 08h</li>
          <li>Master Rules — checklist cross-book (12 livros) injetado em toda geracao</li>
          <li>Book Refs por especialista — cada copywriter com livros-fonte especificos</li>
        </ul>
      </div>

    </div>

    <div class="note-callout">
      <strong>Para o desenvolvedor:</strong> Skills marcadas como <span class="planned-tag">PLANEJADA</span>
      ainda nao existem no codigo. Devem ser implementadas como novos comandos no
      <code>swipe-collector.js</code> e/ou como novas capacidades no agente <code>nova.md</code>.
    </div>
  </div>

  <hr class="divider">

  <!-- ═══════════════════════ FLUXO 1: SWIPE COLLECTOR ═══════════════════════ -->
  <div class="doc-section" id="fluxo1">
    <h2 class="section-title">Fluxo 1 — Swipe Collector</h2>
    <p class="section-sub">Curadoria, replicacao e producao de conteudo a partir de referencias externas. Fluxo completo com verificacao de duplicatas, selecao de formato, revisoes ilimitadas e geracao de design.</p>
    <div class="diagram-card">
      <pre class="mermaid">
flowchart TD
    A["Eric envia link no Telegram"] --> B{"Duplicata?
    Verifica URL no INDEX.md"}
    B -->|"Ja existe"| B1{"Mostra analise anterior + data.
    Criar novo conteudo com esse link?"}
    B1 -->|"Sim, criar"| F
    B1 -->|"Nao"| B2["Encerrado"]
    B -->|"Link novo"| C["Playwright: scrape + screenshot
    + OG Tags + comentarios"]
    C --> D["Claude Vision: analise completa
    formato, categoria, viral reason,
    hook suggestions, estrategia"]
    D --> E["Preview no Telegram com analise"]

    E -->|"Salvar + Replicar"| F["Salva INDEX.md
    + nova-estrategias.md"]
    E -->|"So Salvar"| G["Salva INDEX.md
    + nova-estrategias.md"]
    E -->|"Descartar"| Z["Descartado"]

    F --> H["Nova pergunta formato:
    Estatico Twitter | Frase
    Carrossel Twitter | Reels
    Sequencia Stories"]
    H --> I["Nova gera conteudo
    ERIC_VOICE + Quality Gate"]
    I --> J["Preview texto no Telegram"]

    J -->|"Aprovar"| K["Texto aprovado"]
    J -->|"Revisar"| L["Eric envia feedback
    no Telegram"]
    L --> I
    J -->|"Cancelar"| Y["Cancelado"]

    K --> M{"Formato visual?
    Estatico / Frase / Carrossel"}
    M -->|"Sim"| N["Playwright gera PNG
    1080x1350"]
    N --> O["Preview design no Telegram"]
    O -->|"Aprovar"| P["Salva Drive/Criativos/
    YYYY-MM-DD_tema/"]
    O -->|"Revisar"| Q["Eric envia feedback:
    texto OU print com marcacoes"]
    Q --> R["Nova altera APENAS
    imagens indicadas"]
    R --> N

    M -->|"Nao: Reels / Stories"| S["Salva .docx
    roteiro no Drive"]

    style B fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
    style B1 fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
    style E fill:#18181d,stroke:#5B8DEF,stroke-width:2px
    style H fill:#18181d,stroke:#5B8DEF,stroke-width:2px
    style J fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
    style M fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
    style O fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
      </pre>
    </div>

    <div class="detail-box">
      <h4>Detalhes tecnicos para o desenvolvedor</h4>
      <ul>
        <li><strong>Verificacao de duplicata:</strong> Antes de qualquer scrape, buscar a URL exata no <code>docs/eric-brand/swipe-file/INDEX.md</code>. Se encontrar, mostrar ao Eric: "Esse conteudo ja foi analisado em [DATA] como [ID]" + resumo da analise anterior. Perguntar: "Quer criar um novo conteudo a partir desse link?" via inline keyboard [Sim, criar] [Nao]. Se "Sim", pula direto para selecao de formato (nao re-analisa o link, usa os dados que ja tem no INDEX). Se "Nao", encerra. Implementar em <code>swipe-collector.js</code> antes de chamar <code>scrapeContent()</code>.</li>
        <li><strong>Scrape:</strong> <code>lib/swipe-analyzer.js</code> — scrapeContent(url) — Playwright headless + OG Tags + screenshot JPEG + extrai comentarios (max 8) + texto visivel (max 1500 chars). Ate 5 imagens para Claude.</li>
        <li><strong>Claude Vision:</strong> <code>lib/swipe-analyzer.js</code> — analyzeWithClaude() — claude-sonnet-4-6 com Vision. Retorna JSON: format, username, theme, technique, contentCategory (hype|educational|controversy|announcement|entertainment|evergreen), persons, hypeContext, timingFactor, viralReason, adaptationStrategy, hookSuggestions[2].</li>
        <li><strong>Selecao de formato:</strong> Nova apresenta inline keyboard no Telegram com 5 botoes de formato. Eric escolhe. O formato determina o template de geracao e se havera etapa de design.</li>
        <li><strong>Geracao:</strong> <code>lib/swipe-replicator.js</code> — Nova gera conteudo usando ERIC_VOICE + positioning docs (moodboard, voice-instagram, voice-transcricoes, repertorio-nova, nova-aprendizados). Quality Gate automatico antes de enviar preview.</li>
        <li><strong>Revisoes textuais:</strong> Sem limite de revisoes. Sem timeout/expiracao de contexto. Eric digita feedback diretamente no Telegram. Nova aplica e regenera. Loop ate aprovar ou cancelar.</li>
        <li><strong>Geracao de design:</strong> <code>lib/carousel-generator.js</code> — Playwright HTML-to-PNG, viewport 540x675, deviceScaleFactor 2 = 1080x1350. Busca automatica de imagens via Google Images. Cache em <code>.carousel-temp/_img-cache/</code>.</li>
        <li><strong>Revisao visual:</strong> Eric pode enviar feedback em texto OU em imagem (print/screenshot com desenhos/marcacoes indicando o que alterar). Nova identifica QUAL imagem precisa ser alterada e regenera APENAS aquela — nao recria as demais.</li>
        <li><strong>Save no Drive:</strong> Pasta <code>Meu Drive/Syra Digital/Clientes/Assessoria Syra/Criativos/YYYY-MM-DD_tema/</code>. Para roteiros: <code>.docx</code> via npm docx. Para design: <code>.png</code> individuais + album Telegram via sendMediaGroup.</li>
      </ul>
    </div>
  </div>

  <!-- ════════════════════ FLUXO REVISAO DETALHADO ════════════════════ -->
  <div class="doc-section" id="revisao">
    <h2 class="section-title">Fluxo de Revisao — Detalhado</h2>
    <p class="section-sub">Revisoes textuais e visuais sao ilimitadas, sem timeout, sempre via Telegram. O Eric controla quando o conteudo esta pronto.</p>
    <div class="diagram-card">
      <pre class="mermaid">
flowchart LR
    subgraph TEXTO["Revisao Textual"]
        direction TB
        T1["Nova gera conteudo"] --> T2["Preview no Telegram"]
        T2 -->|"Aprovar"| T3["Texto final aprovado"]
        T2 -->|"Revisar"| T4["Eric digita feedback
        no Telegram"]
        T4 --> T5["Nova entende feedback
        e aplica correcao"]
        T5 --> T1
        T2 -->|"Cancelar"| T6["Cancelado"]
    end

    subgraph VISUAL["Revisao Visual"]
        direction TB
        V1["Playwright gera PNG"] --> V2["Preview no Telegram"]
        V2 -->|"Aprovar"| V3["Salva no Drive"]
        V2 -->|"Revisar"| V4["Eric envia feedback"]
        V4 --> V5{"Tipo de feedback"}
        V5 -->|"Texto"| V6["Descricao escrita
        da alteracao"]
        V5 -->|"Imagem"| V7["Print/screenshot
        com marcacoes"]
        V6 --> V8["Nova altera APENAS
        imagens indicadas"]
        V7 --> V8
        V8 --> V1
    end

    TEXTO --> VISUAL

    style T2 fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
    style V2 fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
    style V5 fill:#18181d,stroke:#5B8DEF,stroke-width:2px
      </pre>
    </div>

    <div class="detail-box">
      <h4>Regras de revisao para o desenvolvedor</h4>
      <ul>
        <li><strong>Sem limite:</strong> Nao existe <code>MAX_REVISIONS</code>. Remover qualquer check de limite no codigo. O loop continua ate Eric aprovar ou cancelar.</li>
        <li><strong>Sem expiracao:</strong> Nao existe timeout de contexto. O <code>pendingReplicas</code> em <code>.aios/swipe-pending-state.json</code> persiste ate acao do Eric. Nao limpar automaticamente.</li>
        <li><strong>Feedback visual:</strong> Se Eric enviar uma foto/imagem como resposta ao preview de design, tratar como feedback visual. Enviar a imagem para Claude Vision para interpretar marcacoes e identificar quais slides/imagens precisam de alteracao.</li>
        <li><strong>Revisao parcial:</strong> Para carrossel com N slides, se Eric pedir para alterar apenas slide 3, regenerar APENAS slide 3. Manter slides 1, 2, 4...N intactos. Implementar em <code>lib/carousel-generator.js</code> com funcao <code>regenerateSlide(slideIndex, feedback)</code>.</li>
        <li><strong>Formato Reels/Stories:</strong> Nao tem etapa de design. Apos texto aprovado, salva direto como <code>.docx</code> no Drive. Sem loop de revisao visual.</li>
      </ul>
    </div>
  </div>

  <!-- ════════════════════ FLUXO 2: CRIACAO DIRETA ════════════════════ -->
  <div class="doc-section" id="fluxo2">
    <h2 class="section-title">Fluxo 2 — Criacao Direta com @nova</h2>
    <p class="section-sub">Producao de conteudo sob demanda via Claude Code. Nova pesquisa, escreve e valida antes de entregar.</p>
    <div class="diagram-card">
      <pre class="mermaid">
flowchart TD
    A["Eric pede conteudo via @nova"] --> B["WebSearch: dados atuais 2026
    stats, cases, tendencias"]
    B --> C["Le knowledge base interna
    aprendizados + voice + repertorio"]
    C --> D["Eric escolhe formato:
    Estatico Twitter | Frase
    Carrossel Twitter | Reels
    Sequencia Stories"]
    D --> E["Nova gera conteudo
    com ERIC_VOICE"]
    E --> F{"Quality Gate
    7 criterios, score 0-10"}

    F -->|"Score >= 8.0 PASS"| G["Entrega ao Eric"]
    F -->|"Score 6.0-7.9"| H["Auto-revisao interna"]
    H --> E
    F -->|"Score menor que 6.0"| I["Reescreve do zero"]
    I --> E

    style D fill:#18181d,stroke:#5B8DEF,stroke-width:2px
    style F fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
      </pre>
    </div>

    <div class="detail-box">
      <h4>Detalhes tecnicos para o desenvolvedor</h4>
      <ul>
        <li><strong>Etapa 1 — Pesquisa:</strong> WebSearch obrigatoria antes de qualquer criacao. Buscar: "{tema} estatisticas 2026", "{tema} cases clinicas", "{tema} tendencia saude". Objetivo: dados reais e atuais.</li>
        <li><strong>Etapa 2 — Knowledge base:</strong> Ler OBRIGATORIAMENTE: <code>nova-aprendizados.md</code> (feedbacks acumulados — PRIMEIRO), <code>eric-voice-instagram.md</code> (40 frases), <code>eric-voice-transcricoes.md</code> (1355 falas), <code>repertorio-nova.md</code> (frases reais ICP), <code>analise-reunioes.md</code> (dores).</li>
        <li><strong>Etapa 3 — Formato:</strong> Eric indica ou Nova sugere. 5 formatos disponiveis: Estatico Twitter, Frase, Carrossel Twitter, Reels, Sequencia Stories.</li>
        <li><strong>Etapa 4 — Geracao:</strong> Combinar pesquisa + base interna + voz do Eric. Aplicar framework de copy adequado ao formato (PAS, Hook Engineering, Prova Social, etc.).</li>
        <li><strong>Etapa 5 — Quality Gate:</strong> Automatico antes de entregar. Score minimo 8.0. Se falhar, identificar criterio que falhou e corrigir. Max 3 loops automaticos antes de pedir input do Eric.</li>
      </ul>
    </div>
  </div>

  <!-- ════════════════════ FLUXO 3: REPERTORIO ANALYZER ════════════════════ -->
  <div class="doc-section" id="fluxo3">
    <h2 class="section-title">Fluxo 3 — Repertorio Analyzer</h2>
    <p class="section-sub">Analise diaria automatica de mensagens reais do mercado (WhatsApp + GHL). Roda todo dia as 08:00 via PM2.</p>
    <div class="diagram-card">
      <pre class="mermaid">
flowchart TD
    A["Cron diario 08:00 via PM2"] --> B["WhatsApp DB:
    200 msgs recentes, 7 dias"]
    A --> C["GHL DB:
    100 msgs recentes, 7 dias"]

    B --> D["Agrupa por contato
    max 30 contatos, 5 msgs cada"]
    C --> D

    D --> E["Claude Sonnet analisa:
    padroes, objecoes, frases reais,
    sinais de compra, insights"]
    E --> F["repertorio-nova.md atualizado
    com secao timestamped"]

    F --> G["Alimenta Swipe Replicator
    contexto de posicionamento"]
    F --> H["Alimenta @nova
    criacao direta"]

    style A fill:#18181d,stroke:#5B8DEF,stroke-width:2px
      </pre>
    </div>

    <div class="detail-box">
      <h4>Detalhes tecnicos para o desenvolvedor</h4>
      <ul>
        <li><strong>Arquivo:</strong> <code>lib/repertorio-analyzer.js</code> — funcao <code>runDailyAnalysis()</code></li>
        <li><strong>WhatsApp DB:</strong> <code>/docs/banco-dados-geral/whatsapp-conversations.db</code> — tabela <code>conversas</code>, <code>is_from_me=0</code>, campos content e transcription. Ignora: 'eric santos', 'logistica ambiental', 'test', 'syra', 'cursos h&r'.</li>
        <li><strong>GHL DB:</strong> <code>/docs/banco-dados-geral/ghl-conversations.db</code> — tabela <code>ghl_mensagens</code>, <code>direction='inbound'</code>.</li>
        <li><strong>Claude:</strong> claude-sonnet-4-6, max 1500 tokens. Extrai: padroes comportamentais, frases exatas (entre aspas), objecoes implicitas/explicitas, sinais de compra, insights para conteudo.</li>
        <li><strong>Output:</strong> Secao timestamped em <code>docs/eric-brand/knowledge-base/repertorio-nova.md</code>.</li>
      </ul>
    </div>
  </div>

  <hr class="divider">

  <!-- ═══════════════════ PONTOS DE APROVACAO ═══════════════════ -->
  <div class="doc-section" id="aprovacoes">
    <h2 class="section-title">Pontos de Aprovacao do Eric</h2>
    <p class="section-sub">Momentos onde Eric intervem no fluxo — todo o resto e autonomo. Revisoes sao ilimitadas e via Telegram.</p>
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Ponto</th>
            <th>Quando</th>
            <th>Opcoes</th>
            <th>Canal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>AP0</strong> — Duplicata</td>
            <td>Se URL ja existe no INDEX.md, mostra analise anterior e pergunta se quer criar novo conteudo a partir desse link.</td>
            <td><span class="badge">Sim, criar</span> <span class="badge-orange badge">Nao</span></td>
            <td>Telegram</td>
          </tr>
          <tr>
            <td><strong>AP1</strong> — Triagem do Swipe</td>
            <td>Apos analise Claude Vision do link (so para links novos).</td>
            <td><span class="badge">Salvar + Replicar</span> <span class="badge-blue badge">So Salvar</span> <span class="badge-orange badge">Descartar</span></td>
            <td>Telegram</td>
          </tr>
          <tr>
            <td><strong>AP2</strong> — Selecao de Formato</td>
            <td>Apos salvar o swipe. Nova pergunta qual formato aplicar.</td>
            <td><span class="badge">Estatico Twitter</span> <span class="badge">Frase</span> <span class="badge">Carrossel Twitter</span> <span class="badge">Reels</span> <span class="badge">Seq. Stories</span></td>
            <td>Telegram</td>
          </tr>
          <tr>
            <td><strong>AP3</strong> — Texto Gerado</td>
            <td>Apos Nova gerar conteudo com ERIC_VOICE + Quality Gate.</td>
            <td><span class="badge-green badge">Aprovar</span> <span class="badge-blue badge">Revisar</span> <span class="badge-orange badge">Cancelar</span></td>
            <td>Telegram</td>
          </tr>
          <tr>
            <td><strong>AP3r</strong> — Revisao Textual</td>
            <td>Eric envia feedback de revisao. Sem limite de revisoes, sem timeout.</td>
            <td><span class="badge-green badge">Aprovar</span> <span class="badge-blue badge">Revisar novamente</span> <span class="badge-orange badge">Cancelar</span></td>
            <td>Telegram</td>
          </tr>
          <tr>
            <td><strong>AP4</strong> — Design Gerado</td>
            <td>Apos Playwright gerar PNGs. So para formatos visuais (Estatico/Frase/Carrossel).</td>
            <td><span class="badge-green badge">Aprovar &rarr; Drive</span> <span class="badge-blue badge">Revisar</span></td>
            <td>Telegram</td>
          </tr>
          <tr>
            <td><strong>AP4r</strong> — Revisao Visual</td>
            <td>Eric envia feedback (texto ou print com marcacoes). Nova altera so imagens indicadas.</td>
            <td><span class="badge-green badge">Aprovar</span> <span class="badge-blue badge">Revisar novamente</span></td>
            <td>Telegram</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="note-callout">
      <strong>Regra critica:</strong> Reels e Sequencia Stories NAO passam por AP4/AP4r (revisao visual)
      porque sao formatos de roteiro — nao geram arquivos de design. Apos AP3 aprovado, salvam direto como .docx no Drive.
    </div>
  </div>

  <!-- ═══════════════════ FORMATOS DE CONTEUDO ═══════════════════ -->
  <div class="doc-section" id="formatos">
    <h2 class="section-title">Formatos de Conteudo</h2>
    <p class="section-sub">5 formatos padronizados. Nomes intuitivos, sem codigos F1-F5. Cada formato tem visual, estrutura e geracao de design especificos.</p>
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Formato</th>
            <th>Visual</th>
            <th>Estrutura</th>
            <th>Gera Design?</th>
            <th>Frequencia</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge">Estatico Twitter</span><br><strong>Imagem unica para feed</strong></td>
            <td>1080x1350, estilo tweet embutido, fundo escuro, tipografia bold</td>
            <td>Provocacao/pergunta bold na imagem. Legenda: analise em 3 pontos + aplicacao ao ICP</td>
            <td><span class="badge-green badge">SIM</span> PNG via Playwright</td>
            <td>1x/semana</td>
          </tr>
          <tr>
            <td><span class="badge">Frase</span><br><strong>Frase de impacto</strong></td>
            <td>1080x1350, fundo branco, tipografia preto + vermelho, @byericsantos</td>
            <td>[setup em preto] + [impacto em VERMELHO] + @byericsantos. Uma ideia, uma facada.</td>
            <td><span class="badge-green badge">SIM</span> PNG via Playwright</td>
            <td>2x/semana</td>
          </tr>
          <tr>
            <td><span class="badge">Carrossel Twitter</span><br><strong>Slides com narrativa</strong></td>
            <td>1080x1350 por slide, fundo preto #000, avatar 56px + "Eric Santos" (verificado) + @byericsantos, numeracao N/total</td>
            <td>Cover: headline bold + body + imagem contextual. Slides: headline + body + imagem. Final: CTA centralizado (sem header).</td>
            <td><span class="badge-green badge">SIM</span> PNGs via Playwright + busca automatica de imagens</td>
            <td>1-2x/semana</td>
          </tr>
          <tr>
            <td><span class="badge">Reels</span><br><strong>Roteiro de video</strong></td>
            <td>Talking head, texto bold overlay (entregue como roteiro .docx)</td>
            <td>Hook (0-3s): afirmacao que para o scroll. Corpo (3-25s): desenvolvimento + reframe. CTA (25-30s): comando unico.</td>
            <td><span class="badge-red badge">NAO</span> So roteiro .docx</td>
            <td>3-4x/semana</td>
          </tr>
          <tr>
            <td><span class="badge">Sequencia Stories</span><br><strong>Roteiro narrativo</strong></td>
            <td>Roteiro texto (.docx) — sequencia de 4-8 stories com indicacoes do que postar</td>
            <td>Story 1: hook (texto ou ideia visual). Stories 2-6: desenvolvimento com sugestoes de enquetes/perguntas. Story final: CTA (link, DM, arraste). <strong>Apenas texto — sem geracao de imagem.</strong></td>
            <td><span class="badge-red badge">NAO</span> So roteiro .docx</td>
            <td>1-2x/semana</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="detail-box">
      <h4>Detalhes tecnicos do Carrossel Twitter (geracao automatica)</h4>
      <ul>
        <li><strong>Motor:</strong> <code>lib/carousel-generator.js</code> — funcoes <code>parseF3Content()</code> + <code>generateCarousel()</code></li>
        <li><strong>Renderizacao:</strong> Playwright HTML-to-PNG, viewport 540x675, deviceScaleFactor 2 = final 1080x1350</li>
        <li><strong>Tipografia hierarquica:</strong> CAPA = headline bold 800 (32-38px) + body regular 400. SLIDES INTERNOS = titulo semibold 600 (20-26px) + body regular 400 (15-17px). Somente a capa tem destaque tipografico grande.</li>
        <li><strong>Paragrafos:</strong> <code>formatBodyHtml()</code> divide blocos longos em 2 paragrafos automaticamente (split em <code>\\n\\n</code> ou auto-split por ponto final se bloco > 200 chars). CSS: <code>.body + .body { margin-top: 10px; }</code></li>
        <li><strong>Fonte:</strong> Inter (Google Fonts), weights: 400 (body), 600 (titulos internos), 800 (capa)</li>
        <li><strong>Header:</strong> Avatar 48px circular + "Eric Santos" bold + verified badge SVG (#0095F6) + @byericsantos + counter N/total</li>
        <li><strong>Imagens:</strong> Google Images via Playwright, height 220px, border-radius 12px, <code>object-fit: cover; object-position: center top</code> (centraliza faces). Cache em <code>.carousel-temp/_img-cache/</code></li>
        <li><strong>Coerencia imagem/texto:</strong> Se a imagem mostra algo (ex: Cimed), o texto PRECISA mencionar. Imagem = evidencia visual do argumento, nao decoracao.</li>
        <li><strong>Templates:</strong> cover (headline + img), slide+imagem, text-only, numbered (1. 2. 3.), reframe (barra vermelha), CTA (centralizado)</li>
        <li><strong>Cada slide deve incluir:</strong> <code>[IMAGEM: descricao para busca]</code> ou <code>[IMAGEM: nenhuma]</code> se funciona melhor so com texto. Pelo menos 3 slides com imagem.</li>
        <li><strong>Cleanup:</strong> <code>cleanOldCarouselTemp()</code> remove pastas com mais de 24h (preserva cache de imagens)</li>
        <li><strong>Drive:</strong> <code>Meu Drive/Syra Digital/Clientes/Assessoria Syra/Criativos/YYYY-MM-DD_Carrossel-Twitter_{tema}/</code></li>
      </ul>
    </div>
  </div>

  <!-- ═════════════════ CAPACIDADES DE ESCRITA DA NOVA ═════════════════ -->
  <div class="doc-section" id="escrita">
    <h2 class="section-title">Capacidades de Escrita da Nova</h2>
    <p class="section-sub">Nova e a UNICA escritora do @byericsantos. Ela internaliza frameworks de 6 copywriters lendarios, enriquecidos com 12 livros e 7 perfis de referencia. Sempre escreve na voz do Eric — nunca na voz dos especialistas.</p>
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Especialista</th>
            <th>Framework</th>
            <th>Livros de Referencia</th>
            <th>Melhor Para</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>@halbert</strong><br><span style="color:var(--text-muted)">Gary Halbert</span></td>
            <td>AIDA / PAS — Direct response, headlines urgentes, acao imediata</td>
            <td>
              <span class="badge">Hopkins</span> <span class="badge">Schwab</span> <span class="badge">Whitman LF8</span><br>
              <span style="font-size:0.75rem;color:var(--text-muted)">Especificidade, 22 headline starters, 8 desejos humanos</span>
            </td>
            <td>F1 (frase de impacto), F5 (reel direto), urgencia + CTA concreto</td>
          </tr>
          <tr>
            <td><strong>@ogilvy</strong><br><span style="color:var(--text-muted)">David Ogilvy</span></td>
            <td>Big Idea + Storytelling — Brand positioning, autoridade premium</td>
            <td>
              <span class="badge">Masterson</span> <span class="badge">Cialdini</span><br>
              <span style="font-size:0.75rem;color:var(--text-muted)">6 Lead Types, Rule of One, 4-Legged Stool, Autoridade + Pre-Suasion</span>
            </td>
            <td>F3 threads opinativas, F4 analise estrategica, posicionamento</td>
          </tr>
          <tr>
            <td><strong>@wiebe</strong><br><span style="color:var(--text-muted)">Joanna Wiebe</span></td>
            <td>Conversion Science — VOC, dados, especificidade maxima</td>
            <td>
              <span class="badge">Sugarman</span> <span class="badge">Ariely</span> <span class="badge">Hopkins</span><br>
              <span style="font-size:0.75rem;color:var(--text-muted)">Slippery Slide, Seeds of Curiosity, Decoy Effect, Anchoring, Zero-Price</span>
            </td>
            <td>F2 carrosseis de dados, conteudo educacional com prova social</td>
          </tr>
          <tr>
            <td><strong>@georgi</strong><br><span style="color:var(--text-muted)">Stefan Georgi</span></td>
            <td>Story Arc + Objection Matrix — High-ticket, emocao, objecoes</td>
            <td>
              <span class="badge">Edwards</span> <span class="badge">Garfinkel</span> <span class="badge">Brunson</span><br>
              <span style="font-size:0.75rem;color:var(--text-muted)">PASTOR, 6 $tory Types, Attractive Character, Soap Opera Sequence</span>
            </td>
            <td>F5 reels de autoridade, venda de servico premium (R$5k+)</td>
          </tr>
          <tr>
            <td><strong>@orzechowski</strong><br><span style="color:var(--text-muted)">Rob Orzechowski</span></td>
            <td>Email Architecture — Nurturing, tom conversacional 1:1</td>
            <td>
              <span class="badge">Cialdini</span> <span class="badge">Brunson</span> <span class="badge">Ariely</span><br>
              <span style="font-size:0.75rem;color:var(--text-muted)">Reciprocidade, Liking, Compromisso, Soap Opera, Normas Sociais</span>
            </td>
            <td>Posts de nurturing, F4 com tom relacional, retencao</td>
          </tr>
          <tr>
            <td><strong>@morgan</strong><br><span style="color:var(--text-muted)">Abi Morgan</span></td>
            <td>Transformation Narrative — Audiencia feminina, comunidade</td>
            <td>
              <span class="badge">Cialdini</span> <span class="badge">Garfinkel</span> <span class="badge-blue badge">Iallas</span> <span class="badge-blue badge">Roberth</span><br>
              <span style="font-size:0.75rem;color:var(--text-muted)">Unidade tribal, Future Pacing $tory, posicionamento, elevacao</span>
            </td>
            <td>ICP feminino (medicas, esteticistas), transformacao profissional</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="detail-box">
      <h4>Como funciona a integracao livros + especialistas</h4>
      <ul>
        <li><strong>Cada especialista recebe instrucoes dos seus livros de referencia</strong> — nao e generico, e direcionado.</li>
        <li><strong>Master Rules (checklist cross-book)</strong> e injetado em TODA geracao de conteudo, independente do especialista selecionado.</li>
        <li><strong>Voz do Eric SEMPRE prevalece</strong> — o especialista traz a estrategia (AIDA, Big Idea, VOC), Eric traz a voz (coloquial, reframe brutal, dados concretos).</li>
        <li><strong>Copy-Chef seleciona o especialista</strong> baseado no formato, tipo de conteudo e estrategia de adaptacao solicitada.</li>
      </ul>
    </div>

    <div class="note-callout">
      <strong>Fontes:</strong> 12 livros (Hopkins, Schwab, Whitman, Masterson x3, Sugarman, Edwards, Garfinkel, Brunson, Ariely, Cialdini) + 7 perfis (Estevao Souza, Alfredo Soares, Grant Cardone, Yuri Barbosa, FSS, Iallas Oliveira, Roberth Resende). Total: <strong>${rep.knowledgeBase.totalLines} linhas</strong> de conhecimento compilado.
    </div>
  </div>

  <!-- ═════════════════ VOZ DO ERIC ═════════════════ -->
  <div class="doc-section" id="voz">
    <h2 class="section-title">DNA da Voz do Eric — Camada Inegociavel</h2>
    <p class="section-sub">Regras absolutas que se aplicam a TODO conteudo. Frameworks trazem a estrategia, mas a voz e SEMPRE a do Eric.</p>
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Regra</th>
            <th>Descricao</th>
            <th>Exemplo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Tom</strong></td>
            <td>Direto, coloquial, brasileiro, consultivo. NUNCA guru, coach ou corporativo.</td>
            <td>"Voce tem um cemiterio de leads no seu comercial e ainda nao esta sabendo aproveitar."</td>
          </tr>
          <tr>
            <td><strong>Frases curtas</strong></td>
            <td>Max 10 palavras por frase. Uma ideia por paragrafo.</td>
            <td>"Isso nao e azar. E ausencia de processo."</td>
          </tr>
          <tr>
            <td><strong>Dados concretos</strong></td>
            <td>Sempre especificos: R$8.500, 10 dias, R$614, 3 a 6 meses. Nunca vago.</td>
            <td>"80% dos pacientes fecham entre o 5o e o 10o contato."</td>
          </tr>
          <tr>
            <td><strong>Abertura</strong></td>
            <td>SEMPRE afirmacao forte. NUNCA comeca com pergunta.</td>
            <td>"O lead nao sumiu. Voce parou de aparecer."</td>
          </tr>
          <tr>
            <td><strong>Reframe</strong></td>
            <td>Pega o que ICP acha que e merito e expoe como problema.</td>
            <td>"Reputacao nao paga conta. Paciente novo paga."</td>
          </tr>
          <tr>
            <td><strong>Pessoa</strong></td>
            <td>"voce" direto. Nunca terceira pessoa ("o medico", "o profissional").</td>
            <td>"E por conta disso que eles batem meta e voce continua estagnado."</td>
          </tr>
          <tr>
            <td><strong>PROIBIDO</strong></td>
            <td colspan="2">"incrivel", "transformador", "revolucionario", "poderoso", "jornada", linguagem de coach, disclaimers longos, elogios vagos, superlativos vazios, explicar antes de explicar</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="detail-box">
      <h4>Fontes da voz + ICP (arquivos de referencia)</h4>
      <ul>
        <li><code>docs/eric-brand/knowledge-base/icp-persona-detalhado.md</code> — <strong>ICP completo + regra de ponte case→ICP</strong> (LEITURA OBRIGATORIA — perfil, 7 dores, 5 angulos, tabela de equivalencias)</li>
        <li><code>docs/eric-brand/knowledge-base/eric-voice-instagram.md</code> — 40 frases literais dos Reels (extraidas via Playwright + yt-dlp + Groq Whisper + Claude)</li>
        <li><code>docs/eric-brand/knowledge-base/eric-voice-transcricoes.md</code> — 1.355 falas reais de 10 reunioes com clientes (579 linhas)</li>
        <li><code>docs/eric-brand/knowledge-base/nova-aprendizados.md</code> — feedbacks acumulados do Eric (PRIORIDADE MAXIMA — ler ANTES de criar)</li>
        <li><code>docs/eric-brand/knowledge-base/repertorio-nova.md</code> — frases reais dos clientes/leads (atualizado diariamente 08h)</li>
      </ul>
    </div>
  </div>

  <!-- ═════════════════ QUALITY GATE ═════════════════ -->
  <div class="doc-section" id="quality">
    <h2 class="section-title">Quality Gate</h2>
    <p class="section-sub">Validacao automatica obrigatoria antes de entregar qualquer conteudo. Score minimo 8.0 para PASS.</p>
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Criterio</th>
            <th>Peso</th>
            <th>Checklist</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Voz do Eric</strong></td>
            <td><span class="badge">2.0</span></td>
            <td>Frases com max 10 palavras? Zero palavras proibidas? Tom direto e coloquial?</td>
          </tr>
          <tr>
            <td><strong>Hook para o scroll</strong></td>
            <td><span class="badge">2.0</span></td>
            <td>Para em 2 segundos? Comeca com afirmacao (nunca pergunta)?</td>
          </tr>
          <tr>
            <td><strong>Reframe brutal</strong></td>
            <td><span class="badge">1.5</span></td>
            <td>Tem o "tapa de realidade"? Expoe o que ICP acha positivo como problema?</td>
          </tr>
          <tr>
            <td><strong>Dado concreto</strong></td>
            <td><span class="badge">1.5</span></td>
            <td>Numero real presente (R$, %, dias, pacientes)?</td>
          </tr>
          <tr>
            <td><strong>Fala pro ICP</strong></td>
            <td><span class="badge">1.5</span></td>
            <td>"voce" direto ao profissional de estetica (fatura R$50-100k+, 2-3 funcionarios, quer escalar)? Transicao case→ICP realista?</td>
          </tr>
          <tr>
            <td><strong>CTA unico</strong></td>
            <td><span class="badge">1.0</span></td>
            <td>Um unico comando claro, nao dois?</td>
          </tr>
          <tr>
            <td><strong>Zero cliches</strong></td>
            <td><span class="badge">1.0</span></td>
            <td>Nenhuma palavra de coach ou linguagem generica?</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="note-callout">
      <strong>Formula:</strong> Score = soma(nota x peso) / soma(pesos) — maximo 10.0<br>
      <strong>PASS</strong> >= 8.0 | <strong>REVISAR</strong> 6.0-7.9 | <strong>REESCREVER</strong> &lt; 6.0<br>
      Se REVISAR ou REESCREVER: identificar criterio que falhou, corrigir so aquela parte, retestar.
    </div>
  </div>

  <!-- ═════════════════ INTELIGENCIA ESTRATEGICA ═════════════════ -->
  <div class="doc-section" id="estrategia">
    <h2 class="section-title">Inteligencia Estrategica de Conteudo</h2>
    <p class="section-sub">4 estrategias que Nova aplica dependendo do contexto. Nao e regra fixa — e leitura inteligente de cenario.</p>
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Estrategia</th>
            <th>Quando Usar</th>
            <th>O Que Faz</th>
            <th>Exemplo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>1. Adaptar para o Mercado</strong></td>
            <td>Tema original distante do ICP (tech, SaaS, varejo)</td>
            <td>Pega o MECANISMO (estrutura, gancho, formato) e traduz para saude/estetica</td>
            <td>Churn em SaaS → "80% dos leads nunca recebem mensagem depois do 1o contato"</td>
          </tr>
          <tr>
            <td><strong>2. Manter Narrativa</strong></td>
            <td>Tema ja conecta com ICP como EMPRESARIO (gestao, margem, lucro)</td>
            <td>Mantem assunto original, aplica voz do Eric. ICP se identifica por ser empresario.</td>
            <td>Case de gestao → Eric comenta: "Construir negocio vs ter emprego com CNPJ"</td>
          </tr>
          <tr>
            <td><strong>3. Pesquisar e Incrementar</strong></td>
            <td>Eric quer criar sobre tema e precisa de dados/referencias atuais</td>
            <td>WebSearch por dados quentes, cases recentes, estatisticas 2026. Enriquece conteudo.</td>
            <td>"Faz sobre follow-up" → busca stats recentes sobre follow-up em vendas 2026</td>
          </tr>
          <tr>
            <td><strong>4. Gerar Opiniao / Take</strong></td>
            <td>Noticia, trend ou acontecimento relevante que merece posicionamento</td>
            <td>Cria conteudo de OPINIAO do Eric. Posiciona como autoridade que pensa sobre mercado.</td>
            <td>IA substituindo profissionais → Eric da take sobre impacto em clinicas</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="detail-box">
      <h4>Logica de decisao (para o desenvolvedor)</h4>
      <ul>
        <li>Se Eric mandou referencia e disse "faz sobre isso" → provavelmente quer <strong>Manter Narrativa</strong></li>
        <li>Se Eric pediu tema aberto → <strong>Pesquisar e Incrementar</strong> com dados frescos</li>
        <li>Se tem noticia quente no mercado → oportunidade de <strong>Gerar Opiniao/Take</strong></li>
        <li>Se referencia e de outro mercado → <strong>Adaptar para o Mercado</strong></li>
        <li>Estrategias podem ser combinadas (ex: manter narrativa + pesquisar dados novos)</li>
        <li>Na duvida: apresentar opcoes ao Eric antes de criar</li>
      </ul>
    </div>

    <div class="detail-box" style="margin-top:24px;">
      <h4>Regra de Ponte: Case Geral → ICP (OBRIGATORIA)</h4>
      <ul>
        <li><strong>Quando:</strong> conteudo usa case de mercado geral (Toguro/Rappi, MrBeast, McDonald's) e precisa transicionar para o ICP</li>
        <li><strong>Checklist:</strong> "Dono de clinica de estetica com 2-3 funcionarios REALMENTE faria isso?"</li>
        <li><strong>ERRADO:</strong> conselhos corporate (contratar VP, fazer M&A, investir bilhoes)</li>
        <li><strong>CERTO:</strong> visibilidade pessoal, embaixador de beleza local, processo comercial, presenca digital</li>
      </ul>
    </div>
    <div class="table-card" style="margin-top:16px;">
      <table>
        <thead>
          <tr>
            <th>Case Geral</th>
            <th>NAO Falar</th>
            <th>Transicao Realista pro ICP</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Empresa contrata influencer como VP</td>
            <td><span class="badge-red">Contrate alguem com visibilidade</span></td>
            <td>Seja VOCE o rosto da sua clinica. Ou contrate um embaixador de beleza/estetica da regiao.</td>
          </tr>
          <tr>
            <td>MrBeast compra fintech</td>
            <td><span class="badge-red">Compre uma empresa</span></td>
            <td>Voce nao precisa comprar nada. Precisa CONSTRUIR uma audiencia que confia em voce.</td>
          </tr>
          <tr>
            <td>McDonald's muda branding</td>
            <td><span class="badge-red">Faca um rebranding</span></td>
            <td>Se o McDonald's sentiu que precisava mudar como aparece, por que seu feed de 2019 funciona?</td>
          </tr>
          <tr>
            <td>IA substituindo vendedores</td>
            <td><span class="badge-red">Use IA no time</span></td>
            <td>O follow-up que voce esquece de fazer, a IA faz em 30 segundos.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="note-callout" style="margin-top:16px;">
      <strong>Referencia completa:</strong> <code>docs/eric-brand/knowledge-base/icp-persona-detalhado.md</code> — ICP enriquecido com 7 dores reais, 5 angulos de conteudo, tabela de equivalencias case→clinica, frases literais do ICP.
    </div>
  </div>

  <!-- ═════════════════ INTEGRACOES ═════════════════ -->
  <div class="doc-section" id="integracoes">
    <h2 class="section-title">Integracoes</h2>
    <p class="section-sub">Tecnologias e servicos que compoem o sistema da @nova</p>
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Integracao</th>
            <th>Finalidade</th>
            <th>Detalhes Tecnicos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Telegram Bot API</strong></td>
            <td>Interface principal com Eric. Todas aprovacoes, revisoes e entregas.</td>
            <td>Long polling. Token: <code>SWIPE_BOT_TOKEN</code>. Chat: <code>IRIS_APPROVAL_CHAT_ID</code>. Suporta: texto, imagens, albums, inline keyboards, voice messages.</td>
          </tr>
          <tr>
            <td><strong>Claude Sonnet 4.6</strong></td>
            <td>Analise com Vision, geracao de conteudo, repertorio, quality gate.</td>
            <td>API Anthropic. Vision: ate 5 imagens por analise. Geracao: max 1500 tokens. Modelo: <code>claude-sonnet-4-6</code>.</td>
          </tr>
          <tr>
            <td><strong>Playwright</strong></td>
            <td>Web scraping + geracao de carousel PNG + busca de imagens.</td>
            <td>Headless Chromium. Screenshots JPEG 1000x700. Carousel: viewport 540x675, scale 2x = 1080x1350. Google Images search + download.</td>
          </tr>
          <tr>
            <td><strong>Groq Whisper</strong></td>
            <td>Transcricao de audios do Telegram.</td>
            <td>Telegram .ogg voice → Groq Whisper API → texto. Processado antes de interpretar mensagens do Eric.</td>
          </tr>
          <tr>
            <td><strong>Google Drive</strong></td>
            <td>Armazenamento de roteiros (.docx) e criativos (PNG).</td>
            <td>Mount local: <code>GoogleDrive-ericsottnas@gmail.com/Meu Drive/</code>. Roteiros: <code>Syra Digital/Clientes/Assessoria Syra/Copywriting/</code>. Criativos: <code>.../Criativos/YYYY-MM-DD_formato_tema/</code>.</td>
          </tr>
          <tr>
            <td><strong>SQLite (WhatsApp)</strong></td>
            <td>Fonte de dados para Repertorio Analyzer.</td>
            <td><code>docs/banco-dados-geral/whatsapp-conversations.db</code>. Tabela: <code>conversas</code>.</td>
          </tr>
          <tr>
            <td><strong>SQLite (GHL)</strong></td>
            <td>Fonte de dados para Repertorio Analyzer.</td>
            <td><code>docs/banco-dados-geral/ghl-conversations.db</code>. Tabela: <code>ghl_mensagens</code>.</td>
          </tr>
          <tr>
            <td><strong>npm docx</strong></td>
            <td>Geracao de arquivos .docx para roteiros.</td>
            <td>Paragraphs, headings, bold inline, horizontal rules. Nomeacao: <code>YYYY-MM-DD_{id}_{tema}.docx</code>.</td>
          </tr>
          <tr>
            <td><strong>PM2</strong></td>
            <td>Gerenciamento do processo swipe-collector.</td>
            <td>ID: 11 | Nome: <code>swipe-collector</code> | Port: 3007 | Auto-restart habilitado.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ═════════════════ TIPOS DE IMAGEM ═════════════════ -->
  <div class="doc-section" id="imagens">
    <h2 class="section-title">Tipos de Imagem — Geracao Automatica</h2>
    <p class="section-sub">Todos os formatos de imagem que Nova consegue gerar via Playwright (HTML-to-PNG). Cada tipo tem specs tecnicas e exemplos de referencia aprovados pelo Eric.</p>

    <div class="img-types-grid">

      <!-- TIPO 1: FRASE -->
      <div class="img-type-block">
        <div class="img-type-header">
          <h3>Frase</h3>
          <span class="badge-orange badge">IMPLEMENTAR</span>
        </div>
        <p class="img-type-desc">Imagem tipografica com fundo branco, texto em preto e destaque em vermelho. Referencia: @alfredosoares. Posicionamento na metade inferior da imagem. Sem avatar, sem imagens, puro texto.</p>

        <div class="img-previews-row">
          <div class="img-preview-wrapper">
            <div class="img-preview frase-preview">
              <div class="frase-spacer"></div>
              <div class="frase-text">
                <span class="frase-black">O fracasso teme os que</span><br>
                <span class="frase-red">constroem a propria "sorte".</span>
              </div>
              <div class="frase-credit">@byericsantos</div>
            </div>
            <div class="img-preview-label">Exemplo 1 — frase curta</div>
          </div>

          <div class="img-preview-wrapper">
            <div class="img-preview frase-preview">
              <div class="frase-spacer"></div>
              <div class="frase-text">
                <span class="frase-black">Quem vive de desculpa coleciona arrependimento,</span><br>
                <span class="frase-red">Quem vive de execucao coleciona resultado.</span>
              </div>
              <div class="frase-credit">@byericsantos</div>
            </div>
            <div class="img-preview-label">Exemplo 2 — frase dupla</div>
          </div>
        </div>

        <div class="img-specs">
          <h4>Especificacoes tecnicas</h4>
          <table>
            <tbody>
              <tr><td><strong>Dimensoes</strong></td><td>1080 x 1350px (viewport 540x675, scale 2x)</td></tr>
              <tr><td><strong>Background</strong></td><td><code>#FFFFFF</code> (branco puro)</td></tr>
              <tr><td><strong>Fonte</strong></td><td>Inter (Google Fonts), fallback: -apple-system, Helvetica Neue</td></tr>
              <tr><td><strong>Texto setup</strong></td><td>Cor: <code>#000000</code>, peso: 700-900, tamanho: 28-34px (no viewport 540px)</td></tr>
              <tr><td><strong>Texto destaque</strong></td><td>Cor: <code>#CC0000</code> (vermelho), peso: 900, mesmo tamanho do setup</td></tr>
              <tr><td><strong>Credit</strong></td><td><code>@byericsantos</code>, cor: <code>#999</code>, tamanho: 14px, peso 400</td></tr>
              <tr><td><strong>Layout</strong></td><td>Texto posicionado na metade inferior-esquerda. Padding: ~36px laterais, ~40px bottom. Justify-content: flex-end (empurra texto para baixo).</td></tr>
              <tr><td><strong>Estrutura</strong></td><td>[linha setup em preto] + [linha impacto em vermelho] + @byericsantos abaixo</td></tr>
              <tr><td><strong>Line-height</strong></td><td>1.15 — linhas coladas, impacto visual denso</td></tr>
              <tr><td><strong>Max caracteres</strong></td><td>~60 chars por linha. Se texto maior, reduzir font-size proporcionalmente.</td></tr>
            </tbody>
          </table>
        </div>

        <div class="detail-box">
          <h4>Instrucoes para o desenvolvedor</h4>
          <ul>
            <li>Criar novo template <code>generateFrase(text, options)</code> em <code>lib/carousel-generator.js</code> (ou arquivo dedicado <code>lib/frase-generator.js</code>).</li>
            <li>Input: texto com marcacao de qual parte e setup e qual e destaque. Sugestao: usar <code>[DESTAQUE: texto em vermelho]</code> como marcador, similar ao <code>[IMAGEM: query]</code> do carousel.</li>
            <li>Playwright renderiza HTML com fundo branco, texto posicionado na metade inferior. Mesmo viewport (540x675) e scale (2x) do carousel.</li>
            <li>O texto NAO fica centralizado — fica alinhado a esquerda, na parte de baixo da imagem (flex-end + align-items: flex-start).</li>
            <li>Referencia visual: perfil @alfredosoares no Instagram. Tipografia limpa, sem decoracao, sem imagens, so texto puro.</li>
            <li>Gera 1 unica imagem PNG (nao e carousel, e estatico).</li>
          </ul>
        </div>
      </div>

      <hr class="divider" style="margin: 40px 0;">

      <!-- TIPO 2: CARROSSEL TWITTER — COVER -->
      <div class="img-type-block">
        <div class="img-type-header">
          <h3>Carrossel Twitter — 4 Templates</h3>
          <span class="badge-green badge">ATIVO</span>
        </div>
        <p class="img-type-desc">Carousel com fundo preto, avatar Eric Santos verificado, tipografia Inter bold. 4 templates automaticos: Cover, Slide+Imagem, Texto Only, CTA. Referencia: @alfredosoares thread style.</p>

        <div class="img-previews-row">

          <div class="img-preview-wrapper">
            <div class="img-preview carousel-preview">
              <div class="cp-header">
                <div class="cp-avatar"></div>
                <div class="cp-info">
                  <div class="cp-name">Eric Santos <span class="cp-badge">&#10003;</span></div>
                  <div class="cp-handle">@byericsantos</div>
                </div>
                <div class="cp-counter">1/6</div>
              </div>
              <div class="cp-body">
                <div class="cp-headline-lg">80% dos leads nunca recebem uma segunda mensagem.</div>
                <div class="cp-sub">E voce se pergunta por que nao fecha...</div>
              </div>
              <div class="cp-imgzone"></div>
            </div>
            <div class="img-preview-label">Cover (slide 1)</div>
          </div>

          <div class="img-preview-wrapper">
            <div class="img-preview carousel-preview">
              <div class="cp-header">
                <div class="cp-avatar"></div>
                <div class="cp-info">
                  <div class="cp-name">Eric Santos <span class="cp-badge">&#10003;</span></div>
                  <div class="cp-handle">@byericsantos</div>
                </div>
                <div class="cp-counter">3/6</div>
              </div>
              <div class="cp-body">
                <div class="cp-headline-sm">O follow-up nao e insistencia. E processo.</div>
                <div class="cp-sub">Quem desiste no 1o contato perde 80% das vendas.</div>
              </div>
            </div>
            <div class="img-preview-label">Text Only (sem imagem)</div>
          </div>

          <div class="img-preview-wrapper">
            <div class="img-preview carousel-preview carousel-cta">
              <div class="cp-cta-content">
                <div class="cp-cta-avatar"></div>
                <div class="cp-cta-name">Eric Santos</div>
                <div class="cp-cta-handle">@byericsantos</div>
                <div class="cp-cta-divider"></div>
                <div class="cp-cta-text">Salva esse carrossel e envia pro teu socio.</div>
                <div class="cp-cta-hint">Salva e compartilha com um colega</div>
              </div>
            </div>
            <div class="img-preview-label">CTA (slide final)</div>
          </div>

        </div>

        <div class="img-specs">
          <h4>Especificacoes tecnicas — Carrossel Twitter</h4>
          <table>
            <tbody>
              <tr><td><strong>Dimensoes</strong></td><td>1080 x 1350px por slide (viewport 540x675, deviceScaleFactor 2)</td></tr>
              <tr><td><strong>Background</strong></td><td><code>#000000</code> (preto puro)</td></tr>
              <tr><td><strong>Fonte</strong></td><td>Inter (Google Fonts), pesos: 400, 600, 700, 900</td></tr>
              <tr><td><strong>Padding</strong></td><td>28px top, 36px laterais e bottom</td></tr>
              <tr><td><strong>Header</strong></td><td>Avatar 56px circular + "Eric Santos" w700 16px + verified badge SVG #0095F6 14x14 + @byericsantos 13px #666 + counter N/total 12px #555</td></tr>
              <tr><td><strong>Cover headline</strong></td><td>30px, w900, #fff, line-height 1.15, letter-spacing -0.02em</td></tr>
              <tr><td><strong>Cover body</strong></td><td>16px, w400, #888, line-height 1.35</td></tr>
              <tr><td><strong>Slide headline</strong></td><td>Adaptativo: >120ch=22px, >80ch=26px, >50ch=28px, <=50ch=30px. Peso 700.</td></tr>
              <tr><td><strong>Slide body</strong></td><td>Com imagem: 15px #999. Sem imagem: 18px #999 (maior para preencher)</td></tr>
              <tr><td><strong>Image zone</strong></td><td>Height 240px, border-radius 12px, object-fit cover. Busca automatica Google Images.</td></tr>
              <tr><td><strong>CTA</strong></td><td>Centralizado, sem header. Avatar 72px + nome + handle + divider 32px + texto 24px w700 + "Salva e compartilha" 13px #444.</td></tr>
              <tr><td><strong>Max slides</strong></td><td>8 conteudo + 1 CTA = 9 slides maximo</td></tr>
              <tr><td><strong>Motor</strong></td><td><code>lib/carousel-generator.js</code> — <code>generateCarousel(slidesData, options)</code></td></tr>
            </tbody>
          </table>
        </div>

        <div class="detail-box">
          <h4>Selecao automatica de template</h4>
          <ul>
            <li><code>isCta == true</code> → Template CTA (centralizado, sem header)</li>
            <li><code>slideIndex == 0</code> → Template Cover (headline 30px w900, com ou sem imagem)</li>
            <li><code>contentImgSrc != null</code> → Template Slide+Imagem (headline adaptativo + zona de imagem 240px)</li>
            <li><code>else</code> → Template Text Only (headline adaptativo maior, body 18px)</li>
            <li>Imagens buscadas via Google Images por <code>[IMAGEM: query]</code> markers. <code>[IMAGEM: nenhuma]</code> forca text-only.</li>
            <li>Cache de imagens: <code>.carousel-temp/_img-cache/</code> (retencao 24h)</li>
          </ul>
        </div>
      </div>

      <hr class="divider" style="margin: 40px 0;">

      <!-- TIPO 3: ESTATICO TWITTER -->
      <div class="img-type-block">
        <div class="img-type-header">
          <h3>Estatico Twitter</h3>
          <span class="badge-orange badge">IMPLEMENTAR</span>
        </div>
        <p class="img-type-desc">Imagem unica 1080x1350 no estilo tweet embutido. Fundo escuro, tipografia bold, provocacao direta. Similar a uma capa do carrossel, mas entregue como imagem unica para o feed.</p>

        <div class="note-callout">
          <strong>Aguardando referencia visual:</strong> Eric vai enviar exemplos aprovados desse formato.
          Quando receber, documentar aqui com mockup CSS e specs tecnicas completas.
          Usar como base o template Cover do carrossel (fundo preto, headline bold, body gray) mas como imagem standalone.
        </div>
      </div>


    </div>
  </div>

  <!-- ═════════════════ COMANDOS DA NOVA ═════════════════ -->
  <div class="doc-section" id="comandos">
    <h2 class="section-title">Comandos da Nova (via Claude Code)</h2>
    <p class="section-sub">Todos os comandos disponiveis quando @nova esta ativa. Prefixo * obrigatorio.</p>
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Comando</th>
            <th>Args</th>
            <th>O Que Faz</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>*reel</code></td><td>{tema}</td><td>Roteiro completo de Reel: hook (0-3s) + corpo (3-25s) + CTA (25-30s)</td></tr>
          <tr><td><code>*carrossel</code></td><td>{tipo} {tema}</td><td>Carrossel slide por slide. Tipos: dados, thread, frase</td></tr>
          <tr><td><code>*frase</code></td><td>{tema}</td><td>5 frases de impacto no formato Frase (preto+vermelho)</td></tr>
          <tr><td><code>*hook</code></td><td>{tema}</td><td>5 opcoes de hook para o tema</td></tr>
          <tr><td><code>*legenda</code></td><td>{post-type} {tema}</td><td>Legenda completa com CTA</td></tr>
          <tr><td><code>*copy</code></td><td>{tipo} {tema}</td><td>Copy completo com quality gate automatico</td></tr>
          <tr><td><code>*batch</code></td><td>[semanas]</td><td>1 semana completa: 6 posts, todos os formatos</td></tr>
          <tr><td><code>*calendario</code></td><td>—</td><td>Calendario editorial semanal com temas e formatos</td></tr>
          <tr><td><code>*temas</code></td><td>—</td><td>Banco de temas extraidos das dores do ICP</td></tr>
          <tr><td><code>*revisar</code></td><td>{feedback} | {sugestao}</td><td>Reescreve conteudo + salva aprendizado em nova-aprendizados.md</td></tr>
          <tr><td><code>*quality-gate</code></td><td>{copy}</td><td>Score por criterio: Voz, Hook, Reframe, Dados, ICP, CTA, Cliches</td></tr>
          <tr><td><code>*transcrever</code></td><td>{url}</td><td>Transcreve + decupa conteudo. Oferece salvar no swipe file.</td></tr>
          <tr><td><code>*decupar</code></td><td>{id ou texto}</td><td>Decupa estrutura de conteudo (swipe file por ID ou texto colado)</td></tr>
          <tr><td><code>*gerar-design</code></td><td>{formato} {conteudo}</td><td>Gera PNGs via Playwright. Carrossel 1080x1350 com imagens automaticas.</td></tr>
          <tr><td><code>*briefing</code></td><td>—</td><td>ICP + posicionamento + formatos + DNA de copy completo</td></tr>
          <tr><td><code>*dores</code></td><td>—</td><td>Dores reais verbalizadas pelos clientes nas reunioes</td></tr>
          <tr><td><code>*cases</code></td><td>—</td><td>Casos reais disponiveis para prova social nos posts</td></tr>
          <tr><td><code>*aprendizados</code></td><td>—</td><td>Todos os feedbacks e regras acumuladas do Eric</td></tr>
        </tbody>
      </table>
    </div>
  </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
  mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#1e1e24',
      primaryTextColor: '#F0F0F5',
      primaryBorderColor: '#35353c',
      lineColor: '#505060',
      secondaryColor: '#18181d',
      tertiaryColor: '#27272d',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '13px'
    },
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      padding: 12,
      nodeSpacing: 30,
      rankSpacing: 40
    }
  });

  // TOC scroll spy
  const tocLinks = document.querySelectorAll('.toc-list a');
  const sections = [];
  tocLinks.forEach(a => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) sections.push({ id, el, a });
  });
  function updateToc() {
    let current = sections[0];
    for (const s of sections) {
      if (s.el.getBoundingClientRect().top <= 80) current = s;
    }
    tocLinks.forEach(a => a.classList.remove('active'));
    if (current) current.a.classList.add('active');
  }
  window.addEventListener('scroll', updateToc, { passive: true });
  updateToc();

  // Smooth scroll
  tocLinks.forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
</script>
</body>
</html>`;
}


function buildAlexDocs() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@alex — Project Manager</title>
${getSharedFontsLink()}
<style>
${getSubpageCss()}
</style>
</head>
<body>
<div class="container">

<!-- ============ HEADER ============ -->
<div class="doc-header doc-section" id="overview">
  <h1 class="doc-title"><span class="accent">@alex</span> — Project Manager Bot</h1>
  <p class="doc-desc">
    Bot Telegram para gerenciamento de projetos com IA. Recebe texto ou audio,
    analisa com Groq LLaMA 3.3-70b, cria tarefas no ClickUp com roteamento por cliente,
    agenda reunioes no Google Calendar com deteccao de conflitos e resolucao de participantes,
    onboarding de clientes (Drive + WhatsApp + ClickUp + docs), notificacoes WhatsApp
    com aprovacao, lembretes de reuniao, gestao de contatos e dashboard diario.
  </p>
  <div class="doc-meta">
    <span class="meta-chip">Port 3003</span>
    <span class="meta-chip">PM2: alex</span>
    <span class="meta-chip">Model: LLaMA 3.3-70b</span>
    <span class="meta-chip">Groq Whisper</span>
    <span class="meta-chip">ClickUp API v2</span>
    <span class="meta-chip">Telegram Bot</span>
    <span class="meta-chip">Google Calendar API v3</span>
    <span class="meta-chip">Stevo WhatsApp API</span>
    <span class="meta-chip">Google Drive API</span>
    <span class="meta-chip">Contacts DB (SQLite)</span>
    <span class="meta-chip">Cron 08:00 BRT</span>
  </div>
</div>

<!-- ============ TOC ============ -->
<nav class="toc">
  <div class="toc-title">Indice</div>
  <ol class="toc-list">
    <li><a href="#overview"><span class="toc-num">01</span> Overview</a></li>
    <li><a href="#skills"><span class="toc-num">02</span> Skills Map</a></li>
    <li><a href="#architecture"><span class="toc-num">03</span> Arquitetura</a></li>
    <li><a href="#flow-task"><span class="toc-num">04</span> Fluxo: Criacao de Tarefa</a></li>
    <li><a href="#flow-list"><span class="toc-num">05</span> Fluxo: Listagem de Tarefas</a></li>
    <li><a href="#flow-meeting"><span class="toc-num">06</span> Fluxo: Agendamento de Reuniao</a></li>
    <li><a href="#flow-dashboard"><span class="toc-num">07</span> Fluxo: Dashboard Diario</a></li>
    <li><a href="#flow-media"><span class="toc-num">08</span> Fluxo: Processamento de Midia</a></li>
    <li><a href="#decisions"><span class="toc-num">09</span> Decision Tree</a></li>
    <li><a href="#state-task"><span class="toc-num">10</span> State Machine — Tarefas</a></li>
    <li><a href="#state-scheduling"><span class="toc-num">11</span> State Machine — Agendamento</a></li>
    <li><a href="#contacts"><span class="toc-num">12</span> Gestao de Contatos</a></li>
    <li><a href="#meeting-reminders"><span class="toc-num">13</span> Lembretes de Reuniao</a></li>
    <li><a href="#integrations"><span class="toc-num">14</span> Integracoes</a></li>
    <li><a href="#commands"><span class="toc-num">15</span> Comandos Telegram</a></li>
    <li><a href="#collaboration"><span class="toc-num">16</span> Colaboracao</a></li>
    <li><a href="#whatsapp-progress"><span class="toc-num">17</span> Notificacoes WhatsApp + Aprovacao</a></li>
    <li><a href="#onboarding"><span class="toc-num">18</span> Onboarding + Intent Detection</a></li>
  </ol>
</nav>

<!-- ============ 02. SKILLS MAP ============ -->
<div class="doc-section" id="skills">
  <h2 class="section-title">Skills Map</h2>
  <p class="section-sub">25+ capacidades ativas organizadas por dominio</p>
  <div class="skills-grid">

    <div class="skill-card">
      <div class="skill-card-title"><span class="icon">🧠</span> AI & NLP</div>
      <ul class="skill-list">
        <li>Analise inteligente de tarefas (Groq LLaMA 3.3-70b)</li>
        <li>Extracao automatica de titulo, descricao e subtarefas</li>
        <li>Deteccao de prioridade por contexto</li>
        <li>Deteccao automatica de cliente</li>
        <li>Transcricao de audio (Groq Whisper)</li>
        <li>Deteccao de intencao: task / onboarding / churn</li>
        <li>Resumo de comentarios para notificacoes (Groq)</li>
      </ul>
    </div>

    <div class="skill-card">
      <div class="skill-card-title"><span class="icon">📋</span> Task Management</div>
      <ul class="skill-list">
        <li>Criacao de tarefas no ClickUp</li>
        <li>Roteamento automatico para lista do cliente</li>
        <li>Subtarefas automaticas via AI</li>
        <li>Listagem e busca de tarefas</li>
        <li>Atribuicao a membros da equipe</li>
        <li>Anexo de arquivos (fotos, docs, audio)</li>
      </ul>
    </div>

    <div class="skill-card">
      <div class="skill-card-title"><span class="icon">🚀</span> Client Onboarding</div>
      <ul class="skill-list">
        <li>Onboarding completo em 10 steps automaticos</li>
        <li>Pasta Google Drive + link compartilhavel</li>
        <li>Grupo WhatsApp (foto, descricao, boas-vindas)</li>
        <li>Lista ClickUp com Kanban 7 status</li>
        <li>Tarefa [ONBOARDING] + 6 subtarefas</li>
        <li>Docs locais + CLIENTES-CONFIG.json</li>
        <li>Churn: arquivamento de lista do cliente</li>
      </ul>
    </div>

    <div class="skill-card">
      <div class="skill-card-title"><span class="icon">📱</span> WhatsApp Notifications</div>
      <ul class="skill-list">
        <li>Notificacao automatica de conclusao de tarefas</li>
        <li>Polling de todas as listas de clientes (2 min)</li>
        <li>Agrupamento de mensagens em janela de 10 min</li>
        <li>Link de entregavel + solicitacao de aprovacao</li>
        <li>60 variacoes de mensagem (anti-repeticao)</li>
        <li>Resumo de comentarios via Groq</li>
      </ul>
    </div>

    <div class="skill-card">
      <div class="skill-card-title"><span class="icon">📊</span> Reporting</div>
      <ul class="skill-list">
        <li>Dashboard diario automatico (Cron 08:00)</li>
        <li>Resumo de tarefas por status</li>
        <li>Contagem de tarefas abertas vs concluidas</li>
      </ul>
    </div>

    <div class="skill-card">
      <div class="skill-card-title"><span class="icon">📅</span> Scheduling</div>
      <ul class="skill-list">
        <li>Agendamento interativo 8 steps (Google Calendar API v3)</li>
        <li>NLP + regex para extracao de data/hora/participantes</li>
        <li>Slots disponiveis (FreeBusy API, horario comercial 12h-20h)</li>
        <li>Deteccao de conflitos + resolucao (remover/forcar/reagendar)</li>
        <li>Resolucao de participantes por nome → email (Contacts DB)</li>
        <li>Recorrencia semanal (RRULE)</li>
        <li>Correcao de agendamento ativo (merge, nao reinicia)</li>
        <li>Pauta/descricao da reuniao (ASK_DESCRIPTION step)</li>
        <li>Lembretes 30 min antes (polling a cada 5 min)</li>
      </ul>
    </div>

    <div class="skill-card">
      <div class="skill-card-title"><span class="icon">👥</span> Contact Management</div>
      <ul class="skill-list">
        <li>Banco de contatos SQLite (nome, email, telefone, cliente)</li>
        <li>Resolucao de email por nome (scheduling participants)</li>
        <li>Seed automatico de CLIENTES-CONFIG.json</li>
        <li>CRUD via linguagem natural (add, update, delete, list, query)</li>
        <li>Parsing inteligente via Groq AI</li>
      </ul>
    </div>

  </div>
</div>

<hr class="divider">

<!-- ============ 03. ARCHITECTURE ============ -->
<div class="doc-section" id="architecture">
  <h2 class="section-title">Arquitetura</h2>
  <p class="section-sub">C4 Level 3 — Componentes internos do Alex Server</p>
  <div class="diagram-card">
    <pre class="mermaid">
flowchart TD
  TG["Telegram Bot API"]
  subgraph ALEX["alex-agent-server.js :3003"]
    WH["Webhook Handler"]
    TXT["handleTextMessage"]
    MED["handleMediaMessage"]
    INTENT["detectIntent()<br/>task | onboarding | churn<br/>scheduling | contact | greeting"]
    CONV["conversation.js<br/>Task State Machine"]
    SCHED["schedulingState<br/>Meeting State Machine<br/>8 steps"]
    AI["ai-analyzer.js<br/>Groq LLaMA 3.3-70b"]
    CONTACTS["contacts-db.js<br/>SQLite"]
    ONBOARD["client-onboarding.js<br/>10 steps"]
    NOTIF["clickup-notifier.js<br/>Polling + Notify"]
    REMIND["Meeting Reminders<br/>5 min interval"]
    TEL["telegram.js<br/>Factory Client"]
    CRON["node-cron<br/>08:00 BRT"]
  end
  CU["ClickUp API v2"]
  GROQ["Groq Whisper API"]
  STEVO["Stevo WhatsApp API"]
  DRIVE["Google Drive API"]
  GCAL["google-calendar.js<br/>Google Calendar API v3"]

  TG -->|"webhook/polling"| WH
  WH -->|"text"| TXT
  WH -->|"photo/audio/doc"| MED
  TXT --> INTENT
  INTENT -->|"task"| CONV
  INTENT -->|"scheduling"| SCHED
  INTENT -->|"onboarding"| ONBOARD
  INTENT -->|"contact_*"| CONTACTS
  INTENT -->|"churn"| CU
  TXT --> AI
  MED -->|"audio .ogg"| GROQ
  GROQ -->|"transcricao"| TXT
  SCHED -->|"criar evento"| GCAL
  SCHED -->|"resolver emails"| CONTACTS
  CONV -->|"estado"| TXT
  AI -->|"analise"| TXT
  TXT -->|"criar tarefa"| CU
  TXT -->|"responder"| TEL
  TEL -->|"send"| TG
  ONBOARD -->|"pasta + link"| DRIVE
  ONBOARD -->|"grupo + msg"| STEVO
  ONBOARD -->|"lista + tarefa"| CU
  NOTIF -->|"poll 2min"| CU
  NOTIF -->|"msg grupo"| STEVO
  CRON -->|"dashboard diario"| CU
  CRON -->|"enviar"| TEL
  REMIND -->|"check 5min"| GCAL
  REMIND -->|"lembrete"| TEL

  style TG fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style CU fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style GROQ fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style STEVO fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style DRIVE fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style GCAL fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style WH fill:#1e1e24,stroke:#35353c,stroke-width:1px
  style TXT fill:#1e1e24,stroke:#35353c,stroke-width:1px
  style MED fill:#1e1e24,stroke:#35353c,stroke-width:1px
  style INTENT fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style CONV fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style SCHED fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style AI fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style CONTACTS fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style ONBOARD fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style NOTIF fill:#1a1a0a,stroke:#F59E0B,stroke-width:2px
  style REMIND fill:#1a1a0a,stroke:#F59E0B,stroke-width:2px
  style TEL fill:#1e1e24,stroke:#35353c,stroke-width:1px
  style CRON fill:#1a1a0a,stroke:#F59E0B,stroke-width:2px
    </pre>
  </div>
  <div class="detail-box">
    <h4>Componentes</h4>
    <ul>
      <li><strong>Webhook Handler:</strong> Recebe updates do Telegram (webhook ou polling local), filtra por update_id, roteia texto vs midia</li>
      <li><strong>detectIntent():</strong> Classifica mensagens como task, onboarding, churn, scheduling, contact_* ou greeting (Groq LLaMA + regex)</li>
      <li><strong>conversation.js:</strong> Maquina de estados para criacao de tarefas — 6 steps, expiry 10 min</li>
      <li><strong>schedulingState:</strong> Maquina de estados para agendamento — 8 steps com correcao inline e resolucao de conflitos</li>
      <li><strong>ai-analyzer.js:</strong> Groq LLaMA 3.3-70b — analyzeTask() + detectIntent() + parseScheduleWithAI()</li>
      <li><strong>contacts-db.js:</strong> SQLite com resolucao nome→email, seed de CLIENTES-CONFIG.json, CRUD via linguagem natural</li>
      <li><strong>google-calendar.js:</strong> Google Calendar API v3 via Service Account — criar eventos, FreeBusy, slots disponiveis, recorrencia</li>
      <li><strong>client-onboarding.js:</strong> Orquestrador de 10 steps (Drive, WhatsApp, ClickUp, Docs)</li>
      <li><strong>clickup-notifier.js:</strong> Polling todas as listas + notificacoes WhatsApp com variacoes e aprovacao</li>
      <li><strong>Meeting Reminders:</strong> Intervalo de 5 min verifica reunioes nos proximos 35 min, envia lembrete 25-35 min antes</li>
      <li><strong>telegram.js:</strong> Factory pattern — sendMessage, sendInlineKeyboard, editMessageText</li>
      <li><strong>node-cron:</strong> Dashboard automatico as 08:00 horario Sao Paulo</li>
    </ul>
  </div>
</div>

<hr class="divider">

<!-- ============ 04. FLOW: TASK CREATION ============ -->
<div class="doc-section" id="flow-task">
  <h2 class="section-title">Fluxo 1 — Criacao de Tarefa</h2>
  <p class="section-sub">Workflow conversacional guiado por maquina de estados com 6 etapas</p>
  <div class="diagram-card">
    <pre class="mermaid">
flowchart TD
  START["Usuario envia /nova<br/>ou texto livre"] --> D1{"Tem conversa<br/>ativa?"}
  D1 -->|"Nao"| CMD{"E comando<br/>/nova?"}
  D1 -->|"Sim"| STEP["Continuar no<br/>step atual"]

  CMD -->|"Sim"| INIT["Iniciar conversa<br/>awaiting_description"]
  CMD -->|"Nao"| AI_CHK{"Texto > 10 chars?"}
  AI_CHK -->|"Sim"| AI["AI Analyzer<br/>Groq LLaMA"]
  AI_CHK -->|"Nao"| HELP["Mostrar /help"]

  INIT --> ASK_DESC["Pedir descricao<br/>da tarefa"]
  ASK_DESC --> RECV_DESC["Recebe descricao"]
  RECV_DESC --> AI

  AI --> AI_RESULT["Titulo + Descricao<br/>+ Subtarefas extraidas"]
  AI_RESULT --> AP1{"AP1: Confirmar<br/>analise AI?"}

  AP1 -->|"Confirmar"| ASK_PRI["Teclado de<br/>prioridade"]
  AP1 -->|"Editar"| EDIT_DESC["Usuario edita"]
  EDIT_DESC --> AI

  ASK_PRI --> AP2{"AP2: Escolher<br/>prioridade"}
  AP2 -->|"1-4"| ASK_CLI["Teclado de<br/>cliente"]

  ASK_CLI --> AP3{"AP3: Escolher<br/>cliente"}
  AP3 -->|"Cliente"| ASK_DATE["Teclado de<br/>data"]

  ASK_DATE --> D_DATE{"AP4: Escolher<br/>prazo"}
  D_DATE -->|"Data"| ASK_ASSIGN["Teclado de<br/>responsavel"]

  ASK_ASSIGN --> D_ASSIGN{"Escolher<br/>responsavel"}
  D_ASSIGN -->|"Membro"| CREATE["Criar tarefa<br/>no ClickUp"]

  CREATE --> D_SUB{"Tem<br/>subtarefas?"}
  D_SUB -->|"Sim"| SUBS["Criar subtarefas"]
  D_SUB -->|"Nao"| DONE
  SUBS --> DONE["Confirmar<br/>criacao"]

  style START fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style D1 fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style CMD fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style AI_CHK fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style AP1 fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style AP2 fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style AP3 fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style D_DATE fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style D_ASSIGN fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style D_SUB fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style AI fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style CREATE fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style DONE fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style HELP fill:#18181d,stroke:#5B8DEF,stroke-width:2px
    </pre>
  </div>
  <div class="detail-box">
    <h4>Detalhes do Fluxo</h4>
    <ul>
      <li><strong>Entrada dupla:</strong> Via comando /nova (fluxo guiado) ou texto livre (AI detecta intencao)</li>
      <li><strong>AI Analyzer:</strong> Groq LLaMA extrai titulo, descricao, ate 5 subtarefas, prioridade sugerida e cliente detectado</li>
      <li><strong>Teclados inline:</strong> Prioridade (Urgente/Alta/Normal/Baixa), Cliente (lista dinamica do ClickUp), Data (Hoje/Amanha/+3d/+7d/Sem prazo), Responsavel (membros do time)</li>
      <li><strong>Fallback AI:</strong> Se Groq falhar, gera analise basica com titulo = primeiras palavras do texto</li>
      <li><strong>Subtarefas:</strong> Criadas automaticamente no ClickUp apos a tarefa principal</li>
      <li><strong>Estado expira:</strong> 10 minutos de inatividade limpa a conversa</li>
    </ul>
  </div>
</div>

<hr class="divider">

<!-- ============ 05. FLOW: TASK LIST ============ -->
<div class="doc-section" id="flow-list">
  <h2 class="section-title">Fluxo 2 — Listagem de Tarefas</h2>
  <p class="section-sub">Consulta ao ClickUp com filtros por lista e formatacao Telegram</p>
  <div class="diagram-card">
    <pre class="mermaid">
flowchart TD
  CMD["/tarefas"] --> FETCH["ClickUp API<br/>listTasks()"]
  FETCH --> D_EMPTY{"Tem<br/>tarefas?"}
  D_EMPTY -->|"Nao"| EMPTY["Sem tarefas<br/>pendentes"]
  D_EMPTY -->|"Sim"| FORMAT["Formatar lista"]
  FORMAT --> GROUP["Agrupar por status"]
  GROUP --> SEND["Enviar mensagem<br/>formatada HTML"]

  style CMD fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style FETCH fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style D_EMPTY fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style EMPTY fill:#1a1a0a,stroke:#F59E0B,stroke-width:2px
  style FORMAT fill:#1e1e24,stroke:#35353c,stroke-width:1px
  style GROUP fill:#1e1e24,stroke:#35353c,stroke-width:1px
  style SEND fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
    </pre>
  </div>
  <div class="detail-box">
    <h4>Detalhes</h4>
    <ul>
      <li><strong>Fonte:</strong> ClickUp API v2 — busca tarefas da lista padrao com status != closed</li>
      <li><strong>Agrupamento:</strong> Tarefas organizadas por status (To Do, In Progress, Review, Done)</li>
      <li><strong>Formato:</strong> HTML Telegram com emojis de status, nome, prioridade e assignee</li>
    </ul>
  </div>
</div>

<hr class="divider">

<!-- ============ 06. FLOW: MEETING ============ -->
<div class="doc-section" id="flow-meeting">
  <h2 class="section-title">Fluxo 3 — Agendamento Interativo de Reuniao</h2>
  <p class="section-sub">8 steps com Google Calendar API v3, resolucao de conflitos, participantes por nome e correcao inline</p>
  <div class="diagram-card">
    <pre class="mermaid">
flowchart TD
  START["Usuario envia /reuniao<br/>ou texto livre sobre reuniao"] --> D_ACTIVE{"Agendamento<br/>ativo?"}
  D_ACTIVE -->|"Sim"| CORRECT["handleScheduleCorrection()<br/>Merge correcoes no estado"]
  D_ACTIVE -->|"Nao"| NLP{"isSchedulingIntent()<br/>regex + keywords"}
  NLP -->|"Sim"| PARSE["parseScheduleWithAI()<br/>Groq extrai estrutura"]

  PARSE --> D_HAS_DATE{"Extraiu<br/>data/hora?"}
  D_HAS_DATE -->|"Sim"| SKIP_MODE["Pular CHOOSE_MODE<br/>→ ASK_PARTICIPANTS"]
  D_HAS_DATE -->|"Nao"| MODE["CHOOSE_MODE"]

  MODE --> D_MODE{"Modo?"}
  D_MODE -->|"Slots"| SLOTS["showAvailableSlots()<br/>FreeBusy API<br/>12h-20h seg-sex"]
  D_MODE -->|"Custom"| ASK_DATE["ASK_DATE<br/>Digitar data DD/MM"]

  SLOTS --> PICK["PICK_TIME<br/>Selecionar slot"]
  ASK_DATE --> SHOW_TIMES["showTimeSlotsForDate()<br/>Slots 1h no dia"]
  SHOW_TIMES --> PICK

  PICK --> PARTICIPANTS["ASK_PARTICIPANTS<br/>Adicionar emails"]
  SKIP_MODE --> PARTICIPANTS
  PARTICIPANTS --> D_MORE{"Mais<br/>participantes?"}
  D_MORE -->|"Sim"| PARTICIPANTS
  D_MORE -->|"Nao/Skip"| TITLE["ASK_TITLE<br/>Nome da reuniao"]

  TITLE --> DESC["ASK_DESCRIPTION<br/>Pauta da reuniao"]
  DESC --> CONFLICTS["checkConflictsAndConfirm()<br/>Google Calendar FreeBusy"]

  CONFLICTS --> D_CONFLICT{"Conflito?"}
  D_CONFLICT -->|"Sim"| RESOLVE{"Resolver conflito"}
  D_CONFLICT -->|"Nao"| CONFIRM["CONFIRM<br/>Resumo completo"]

  RESOLVE -->|"Remover"| DEL_CONF["deleteEvent() +<br/>→ CONFIRM"]
  RESOLVE -->|"Outro horario"| MODE
  RESOLVE -->|"Forcar"| CONFIRM
  RESOLVE -->|"Cancelar"| CANCEL["Limpar estado"]

  CONFIRM --> D_OK{"Confirmar?"}
  D_OK -->|"Sim"| EXEC["executeScheduling()<br/>resolveParticipants()<br/>createEvent()"]
  D_OK -->|"Cancelar"| CANCEL

  EXEC --> DONE["Evento criado<br/>Link do Calendar"]

  style START fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style D_ACTIVE fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style CORRECT fill:#1a1a0a,stroke:#F59E0B,stroke-width:2px
  style NLP fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style PARSE fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style D_HAS_DATE fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style MODE fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style D_MODE fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style SLOTS fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style ASK_DATE fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style PICK fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style PARTICIPANTS fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style D_MORE fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style TITLE fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style DESC fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style CONFLICTS fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style D_CONFLICT fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style RESOLVE fill:#1a1a0a,stroke:#F59E0B,stroke-width:2px
  style CONFIRM fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style D_OK fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style EXEC fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style DONE fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style CANCEL fill:#1a0a0a,stroke:#EF4444,stroke-width:2px
    </pre>
  </div>
  <div class="detail-box">
    <h4>Detalhes do Fluxo</h4>
    <ul>
      <li><strong>Entrada tripla:</strong> /reuniao (fluxo guiado), texto livre ("marca reuniao amanha 14h"), ou audio transcrito</li>
      <li><strong>NLP Dual:</strong> isSchedulingIntent() (regex + keywords) → parseScheduleWithAI() (Groq extrai data, hora, duracao, participantes, titulo)</li>
      <li><strong>Correcao inline:</strong> Se ja existe agendamento ativo, novas mensagens CORRIGEM ao inves de iniciar novo fluxo — handleScheduleCorrection() faz merge</li>
      <li><strong>Audio continuidade:</strong> Audios verificam schedulingState ANTES de routeByIntent — tratados como correcao se ha fluxo ativo</li>
      <li><strong>Slots inteligentes:</strong> FreeBusy API + horario comercial 12h-20h (WORK_HOURS), pula finais de semana, slots de 30 min</li>
      <li><strong>Participantes:</strong> resolveParticipants() converte nomes em emails via contacts-db.js</li>
      <li><strong>Conflitos:</strong> 3 opcoes — remover evento conflitante, escolher outro horario, ou forcar criacao</li>
      <li><strong>Descricao:</strong> Step ASK_DESCRIPTION pede pauta da reuniao (com botao pular)</li>
      <li><strong>Recorrencia:</strong> Suporte a RRULE (ex: "reuniao semanal toda terca")</li>
      <li><strong>Google Calendar:</strong> Service Account — cria eventos com attendees, descricao e link HTML</li>
    </ul>
  </div>
  <div class="detail-box" style="margin-top: 16px;">
    <h4>Correcao de Agendamento (handleScheduleCorrection)</h4>
    <ul>
      <li><strong>Trigger:</strong> Nova mensagem/audio quando schedulingState ja existe para o chatId</li>
      <li><strong>Comportamento:</strong> Re-parseia a nova mensagem, atualiza APENAS os campos que mudaram</li>
      <li><strong>Campos mergeados:</strong> data, hora, duracao, participantes, titulo — preserva dados existentes</li>
      <li><strong>Feedback:</strong> Mostra resumo do que foi atualizado e retorna ao step anterior</li>
    </ul>
  </div>
</div>

<hr class="divider">

<!-- ============ 07. FLOW: DASHBOARD ============ -->
<div class="doc-section" id="flow-dashboard">
  <h2 class="section-title">Fluxo 4 — Dashboard Diario</h2>
  <p class="section-sub">Cron job as 08:00 BRT envia resumo automatico via Telegram</p>
  <div class="diagram-card">
    <pre class="mermaid">
flowchart LR
  CRON["Cron 08:00<br/>Sao Paulo"] --> FETCH["ClickUp API<br/>listTasks()"]
  FETCH --> COUNT["Contar por<br/>status"]
  COUNT --> BUILD["Montar HTML<br/>dashboard"]
  BUILD --> SEND["Enviar ao<br/>OWNER_CHAT_ID"]

  style CRON fill:#1a1a0a,stroke:#F59E0B,stroke-width:2px
  style FETCH fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style COUNT fill:#1e1e24,stroke:#35353c,stroke-width:1px
  style BUILD fill:#1e1e24,stroke:#35353c,stroke-width:1px
  style SEND fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
    </pre>
  </div>
  <div class="detail-box">
    <h4>Detalhes</h4>
    <ul>
      <li><strong>Trigger:</strong> node-cron com timezone America/Sao_Paulo, executa diariamente as 08:00</li>
      <li><strong>Metricas:</strong> Total de tarefas, abertas, em progresso, concluidas, atrasadas</li>
      <li><strong>Formato:</strong> HTML Telegram com emojis e contadores organizados</li>
      <li><strong>Tambem via /dashboard:</strong> Comando manual dispara o mesmo resumo instantaneamente</li>
    </ul>
  </div>
</div>

<hr class="divider">

<!-- ============ 08. FLOW: MEDIA ============ -->
<div class="doc-section" id="flow-media">
  <h2 class="section-title">Fluxo 5 — Processamento de Midia</h2>
  <p class="section-sub">Audios com continuidade de conversa, fotos e documentos anexados a tarefas</p>
  <div class="diagram-card">
    <pre class="mermaid">
flowchart TD
  MSG["Mensagem com<br/>midia recebida"] --> D_TYPE{"Tipo de<br/>midia?"}
  D_TYPE -->|"voice / audio"| TRANS["Groq Whisper<br/>transcrever .ogg"]
  D_TYPE -->|"photo"| PHOTO["Baixar foto<br/>via getFileUrl"]
  D_TYPE -->|"document"| DOC["Baixar documento<br/>via getFileUrl"]
  D_TYPE -->|"video"| VID["Baixar video<br/>via getFileUrl"]

  TRANS --> TEXT["Texto<br/>transcrito"]
  TEXT --> D_SCHED{"schedulingState<br/>ativo?"}
  D_SCHED -->|"Sim"| CORRECT["handleScheduleCorrection()<br/>Merge correcoes"]
  D_SCHED -->|"Nao"| D_TASK{"conversation<br/>ativa?"}
  D_TASK -->|"Sim"| CONTINUE["handleTextDuringConversation()<br/>Continuar fluxo"]
  D_TASK -->|"Nao"| ROUTE["routeByIntent()<br/>Novo fluxo"]

  PHOTO --> D_CONV{"Conversa<br/>ativa?"}
  DOC --> D_CONV
  VID --> D_CONV

  D_CONV -->|"Sim"| ATTACH["Anexar ao<br/>ClickUp task"]
  D_CONV -->|"Nao + caption"| START_TASK["startTaskFlow()<br/>com caption"]
  D_CONV -->|"Nao + sem caption"| ASK["Pedir descricao"]

  ATTACH --> CONFIRM["Confirmar<br/>anexo"]

  style MSG fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style D_TYPE fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style D_SCHED fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style D_TASK fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style D_CONV fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style TRANS fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style CORRECT fill:#1a1a0a,stroke:#F59E0B,stroke-width:2px
  style CONTINUE fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style ROUTE fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style PHOTO fill:#1e1e24,stroke:#35353c,stroke-width:1px
  style DOC fill:#1e1e24,stroke:#35353c,stroke-width:1px
  style VID fill:#1e1e24,stroke:#35353c,stroke-width:1px
  style ATTACH fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style CONFIRM fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style START_TASK fill:#18181d,stroke:#5B8DEF,stroke-width:2px
    </pre>
  </div>
  <div class="detail-box">
    <h4>Detalhes</h4>
    <ul>
      <li><strong>Audio com continuidade:</strong> Apos transcricao, verifica schedulingState e conversation ANTES de routeByIntent — garante que audios continuam fluxos ativos</li>
      <li><strong>Correcao via audio:</strong> Se ha agendamento ativo, audio transcrito vai para handleScheduleCorrection() ao inves de iniciar nova conversa</li>
      <li><strong>Fotos/Docs/Videos:</strong> Se ha conversa ativa com step de criacao, anexa ao task via ClickUp uploadAttachment</li>
      <li><strong>Caption:</strong> Se midia vem com legenda, usa como briefing para iniciar criacao de tarefa</li>
      <li><strong>getFileUrl:</strong> Baixa arquivo via Telegram Bot API e obtem URL temporaria para upload</li>
    </ul>
  </div>
</div>

<hr class="divider">

<!-- ============ 09. DECISION TREE ============ -->
<div class="doc-section" id="decisions">
  <h2 class="section-title">Decision Tree</h2>
  <p class="section-sub">13 pontos de decisao mapeados no fluxo do Alex</p>
  <div class="table-card">
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Decision Point</th>
          <th>Criterio</th>
          <th>Rota SIM</th>
          <th>Rota NAO</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="badge">D1</span></td>
          <td><strong>Tem conversa ativa?</strong></td>
          <td>hasActiveConversation(chatId)</td>
          <td>Continuar no step atual</td>
          <td>Verificar se e comando</td>
        </tr>
        <tr>
          <td><span class="badge">D2</span></td>
          <td><strong>E comando Telegram?</strong></td>
          <td>text.startsWith('/')</td>
          <td>Executar handler do comando</td>
          <td>Enviar para AI Analyzer</td>
        </tr>
        <tr>
          <td><span class="badge">D3</span></td>
          <td><strong>Texto suficiente para AI?</strong></td>
          <td>text.length > 10</td>
          <td>Groq LLaMA analisa</td>
          <td>Mostrar /help</td>
        </tr>
        <tr>
          <td><span class="badge">D4</span></td>
          <td><strong>AI analise sucesso?</strong></td>
          <td>Groq API retorna 200</td>
          <td>Usar analise completa</td>
          <td>Fallback: titulo = primeiras palavras</td>
        </tr>
        <tr>
          <td><span class="badge">D5</span></td>
          <td><strong>Tipo de midia?</strong></td>
          <td>voice vs photo vs document</td>
          <td>Audio → transcrever</td>
          <td>Foto/Doc → anexar ou salvar</td>
        </tr>
        <tr>
          <td><span class="badge">D6</span></td>
          <td><strong>Conversa ativa para anexo?</strong></td>
          <td>step === 'creating'</td>
          <td>Anexar ao ClickUp task</td>
          <td>Salvar referencia</td>
        </tr>
        <tr>
          <td><span class="badge">D7</span></td>
          <td><strong>Tem subtarefas?</strong></td>
          <td>analysis.subtasks.length > 0</td>
          <td>Criar subtarefas no ClickUp</td>
          <td>Finalizar sem subtarefas</td>
        </tr>
        <tr>
          <td><span class="badge">D8</span></td>
          <td><strong>Agendamento ativo?</strong></td>
          <td>schedulingState.has(chatId)</td>
          <td>handleScheduleCorrection() — merge</td>
          <td>Iniciar novo fluxo scheduling</td>
        </tr>
        <tr>
          <td><span class="badge">D9</span></td>
          <td><strong>NLP extraiu data/hora?</strong></td>
          <td>parseScheduleWithAI() result</td>
          <td>Pular CHOOSE_MODE, ir para ASK_PARTICIPANTS</td>
          <td>Mostrar CHOOSE_MODE (slots ou custom)</td>
        </tr>
        <tr>
          <td><span class="badge">D10</span></td>
          <td><strong>Conflito no Calendar?</strong></td>
          <td>getEventsInRange() retorna eventos</td>
          <td>Mostrar opcoes: remover, forcar, reagendar</td>
          <td>Ir direto para CONFIRM</td>
        </tr>
        <tr>
          <td><span class="badge">D11</span></td>
          <td><strong>E intent de contato?</strong></td>
          <td>intent starts with contact_</td>
          <td>handleContactIntent() — CRUD contatos</td>
          <td>Continuar routing normal</td>
        </tr>
        <tr>
          <td><span class="badge">D12</span></td>
          <td><strong>Reuniao em 25-35 min?</strong></td>
          <td>checkUpcomingMeetings()</td>
          <td>Enviar lembrete + marcar como reminded</td>
          <td>Skip (fora da janela ou ja lembrado)</td>
        </tr>
        <tr>
          <td><span class="badge">D13</span></td>
          <td><strong>E greeting?</strong></td>
          <td>handleGreeting() — keywords oi, ola, etc</td>
          <td>Resposta contextual por horario</td>
          <td>Processar como tarefa ou pergunta</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<hr class="divider">

<!-- ============ 10. STATE MACHINE — TAREFAS ============ -->
<div class="doc-section" id="state-task">
  <h2 class="section-title">State Machine — Tarefas</h2>
  <p class="section-sub">Maquina de estados da conversa (conversation.js) — 6 estados, expiry 10 min</p>
  <div class="diagram-card">
    <pre class="mermaid">
stateDiagram-v2
  [*] --> awaiting_description : /nova ou AI trigger
  awaiting_description --> awaiting_priority : descricao recebida + AI analisa
  awaiting_priority --> awaiting_client : prioridade escolhida (1-4)
  awaiting_client --> awaiting_date : cliente selecionado
  awaiting_date --> awaiting_assignee : prazo definido
  awaiting_assignee --> creating : responsavel escolhido
  creating --> [*] : tarefa criada no ClickUp

  awaiting_description --> [*] : /cancel ou timeout 10min
  awaiting_priority --> [*] : /cancel ou timeout 10min
  awaiting_client --> [*] : /cancel ou timeout 10min
  awaiting_date --> [*] : /cancel ou timeout 10min
  awaiting_assignee --> [*] : /cancel ou timeout 10min
    </pre>
  </div>
  <div class="detail-box">
    <h4>Detalhes da State Machine</h4>
    <ul>
      <li><strong>Storage:</strong> In-memory Map (nao persiste entre restarts do servidor)</li>
      <li><strong>Expiry:</strong> 10 minutos (EXPIRY_MS = 600000) — conversa abandona automaticamente</li>
      <li><strong>Cancel:</strong> Comando /cancel limpa o estado a qualquer momento</li>
      <li><strong>Dados armazenados:</strong> step, description, analysis, priority, client, dueDate, assignee, attachments</li>
      <li><strong>Cleanup:</strong> Verificacao de expiry a cada chamada de getConversation()</li>
    </ul>
  </div>
</div>

<hr class="divider">

<!-- ============ 11. STATE MACHINE — SCHEDULING ============ -->
<div class="doc-section" id="state-scheduling">
  <h2 class="section-title">State Machine — Agendamento</h2>
  <p class="section-sub">8 estados para agendamento interativo de reunioes com Google Calendar</p>
  <div class="diagram-card">
    <pre class="mermaid">
stateDiagram-v2
  [*] --> CHOOSE_MODE : /reuniao ou NLP detect
  CHOOSE_MODE --> PICK_TIME : ver slots disponiveis
  CHOOSE_MODE --> ASK_DATE : digitar data custom

  ASK_DATE --> PICK_TIME : data parseada + slots mostrados

  PICK_TIME --> ASK_PARTICIPANTS : horario selecionado
  ASK_PARTICIPANTS --> ASK_PARTICIPANTS : +1 participante
  ASK_PARTICIPANTS --> ASK_TITLE : skip ou prosseguir

  ASK_TITLE --> ASK_DESCRIPTION : titulo definido ou skip
  ASK_DESCRIPTION --> CONFLICT : checkConflictsAndConfirm()
  ASK_DESCRIPTION --> CONFIRM : sem conflitos

  CONFLICT --> CONFIRM : remover conflito ou forcar
  CONFLICT --> CHOOSE_MODE : outro horario

  CONFIRM --> [*] : executeScheduling() → Google Calendar

  CHOOSE_MODE --> [*] : /cancel
  ASK_DATE --> [*] : /cancel
  PICK_TIME --> [*] : /cancel
  ASK_PARTICIPANTS --> [*] : /cancel
  ASK_TITLE --> [*] : /cancel
  ASK_DESCRIPTION --> [*] : /cancel
  CONFLICT --> [*] : cancelar
    </pre>
  </div>
  <div class="detail-box">
    <h4>Dados do Estado (schedulingState Map)</h4>
    <ul>
      <li><strong>step:</strong> CHOOSE_MODE | ASK_DATE | PICK_TIME | ASK_PARTICIPANTS | ASK_TITLE | ASK_DESCRIPTION | CONFLICT | CONFIRM</li>
      <li><strong>participants:</strong> Array de emails resolvidos via contacts-db</li>
      <li><strong>title:</strong> Nome da reuniao (texto livre ou skip)</li>
      <li><strong>description:</strong> Pauta da reuniao (texto livre ou skip)</li>
      <li><strong>startTime:</strong> ISO datetime do inicio</li>
      <li><strong>durationMinutes:</strong> Duracao em minutos (default 60)</li>
      <li><strong>selectedDate:</strong> Data selecionada (ISO) para filtrar slots</li>
      <li><strong>conflictEventIds:</strong> IDs de eventos conflitantes para resolucao</li>
      <li><strong>updatedAt:</strong> Timestamp da ultima atualizacao</li>
    </ul>
  </div>
  <div class="detail-box" style="margin-top: 16px;">
    <h4>Correcao Inline vs Novo Fluxo</h4>
    <ul>
      <li><strong>Novo fluxo:</strong> Se nao existe schedulingState para o chatId → inicia CHOOSE_MODE</li>
      <li><strong>Correcao:</strong> Se JA existe schedulingState → handleScheduleCorrection() re-parseia e faz MERGE</li>
      <li><strong>Audio:</strong> Audios transcritos verificam schedulingState ANTES de routeByIntent()</li>
      <li><strong>Texto:</strong> handleTextMessage() verifica schedulingState ANTES de conversation.hasActiveConversation()</li>
    </ul>
  </div>
</div>

<hr class="divider">

<!-- ============ 12. CONTACTS ============ -->
<div class="doc-section" id="contacts">
  <h2 class="section-title">Gestao de Contatos</h2>
  <p class="section-sub">Banco de contatos SQLite para resolucao de nomes em emails e telefones</p>
  <div class="diagram-card">
    <pre class="mermaid">
flowchart TD
  INTENT["Intent: contact_*"] --> D_TYPE{"Tipo?"}
  D_TYPE -->|"contact_list"| LIST["Listar contatos<br/>por cliente"]
  D_TYPE -->|"contact_query"| QUERY["Buscar email<br/>por nome"]
  D_TYPE -->|"contact_add"| PARSE["parseContactWithAI()<br/>Groq extrai nome+email"]
  D_TYPE -->|"contact_update"| PARSE
  D_TYPE -->|"contact_delete"| DEL["Remover contato"]

  PARSE --> SAVE["Salvar/atualizar<br/>no SQLite"]

  SEED["CLIENTES-CONFIG.json"] -->|"startup"| DB["contacts.db"]
  DB --> RESOLVE["resolveEmail(nome)"]
  RESOLVE --> SCHED["Scheduling:<br/>participantes"]

  style INTENT fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style D_TYPE fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style PARSE fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style SAVE fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style DB fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style SEED fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style RESOLVE fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style SCHED fill:#18181d,stroke:#5B8DEF,stroke-width:2px
    </pre>
  </div>
  <div class="detail-box">
    <h4>Como funciona</h4>
    <ul>
      <li><strong>Seed:</strong> No startup, importa contatos de docs/clientes/CLIENTES-CONFIG.json (nome, email, telefone, cliente)</li>
      <li><strong>Resolucao:</strong> resolveEmail("Dr. Enio") → busca no banco e retorna {fullName, email, phone, client}</li>
      <li><strong>Scheduling:</strong> resolveParticipants() converte array de nomes em emails para Google Calendar attendees</li>
      <li><strong>CRUD natural:</strong> "Adiciona contato Dr. Enio email enio@gmail.com" → parseContactWithAI() + save</li>
      <li><strong>Busca fuzzy:</strong> Normaliza acentos e case para matching flexivel</li>
    </ul>
  </div>
</div>

<hr class="divider">

<!-- ============ 13. MEETING REMINDERS ============ -->
<div class="doc-section" id="meeting-reminders">
  <h2 class="section-title">Lembretes de Reuniao</h2>
  <p class="section-sub">Polling a cada 5 minutos com lembrete automatico 25-35 min antes da reuniao</p>
  <div class="diagram-card">
    <pre class="mermaid">
flowchart LR
  TIMER["setInterval<br/>5 min"] --> CHECK["checkUpcomingMeetings()<br/>Google Calendar"]
  CHECK --> GCAL["listUpcoming()<br/>proximos 35 min"]
  GCAL --> D_EVENTS{"Eventos<br/>encontrados?"}
  D_EVENTS -->|"Nao"| WAIT["Aguardar proximo ciclo"]
  D_EVENTS -->|"Sim"| D_TIME{"25-35 min<br/>ate inicio?"}
  D_TIME -->|"Nao"| SKIP["Fora da janela<br/>(ja lembrado ou muito longe)"]
  D_TIME -->|"Sim"| D_REMINDED{"Ja lembrado?<br/>_remindedEvents Set"}
  D_REMINDED -->|"Sim"| SKIP
  D_REMINDED -->|"Nao"| SEND["Enviar lembrete<br/>Telegram"]

  SEND --> FORMAT["Reuniao em X min<br/>Titulo + Data + Hora<br/>Participantes + Meet Link"]

  style TIMER fill:#1a1a0a,stroke:#F59E0B,stroke-width:2px
  style CHECK fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style GCAL fill:#18181d,stroke:#5B8DEF,stroke-width:2px
  style D_EVENTS fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style D_TIME fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style D_REMINDED fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
  style SEND fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
  style FORMAT fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
    </pre>
  </div>
  <div class="detail-box">
    <h4>Detalhes</h4>
    <ul>
      <li><strong>Intervalo:</strong> 5 minutos via setInterval (startMeetingReminder())</li>
      <li><strong>Janela:</strong> Envia lembrete quando faltam 25-35 min — evita duplicacao</li>
      <li><strong>Dedup:</strong> _remindedEvents Set rastreia IDs de eventos ja notificados</li>
      <li><strong>Cleanup:</strong> Set limpa automaticamente quando > 100 itens (previne memory leak)</li>
      <li><strong>Formato:</strong> Emoji-rich com titulo, data, horario, descricao, participantes, link Meet (se disponivel) e link Calendar</li>
    </ul>
  </div>
</div>

<hr class="divider">

<!-- ============ 14. INTEGRATIONS ============ -->
<div class="doc-section" id="integrations">
  <h2 class="section-title">Integracoes</h2>
  <p class="section-sub">9 sistemas externos conectados ao Alex</p>
  <div class="table-card">
    <table>
      <thead>
        <tr>
          <th>Sistema</th>
          <th>Tipo</th>
          <th>Uso</th>
          <th>Arquivo</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>ClickUp API v2</strong></td>
          <td><span class="badge-blue badge">REST API</span></td>
          <td>CRUD tarefas, subtarefas, membros, listas, status, anexos</td>
          <td><code>lib/clickup.js</code></td>
        </tr>
        <tr>
          <td><strong>Telegram Bot API</strong></td>
          <td><span class="badge-blue badge">REST API</span></td>
          <td>Receber mensagens, enviar respostas, teclados inline, callbacks</td>
          <td><code>lib/telegram.js</code></td>
        </tr>
        <tr>
          <td><strong>Groq API (LLaMA)</strong></td>
          <td><span class="badge badge">AI Model</span></td>
          <td>Analise de tarefas, deteccao de intencao, resumo de comentarios</td>
          <td><code>lib/ai-analyzer.js</code></td>
        </tr>
        <tr>
          <td><strong>Groq Whisper</strong></td>
          <td><span class="badge badge">AI Model</span></td>
          <td>Transcricao de audio (.ogg → texto)</td>
          <td><code>alex-agent-server.js</code></td>
        </tr>
        <tr>
          <td><strong>Stevo WhatsApp API</strong></td>
          <td><span class="badge-blue badge">REST API</span></td>
          <td>Criar grupos, enviar mensagens, gerenciar participantes</td>
          <td><code>lib/stevo.js</code></td>
        </tr>
        <tr>
          <td><strong>Google Drive API v3</strong></td>
          <td><span class="badge-blue badge">REST API</span></td>
          <td>Criar pastas de cliente, definir permissoes publicas, gerar links</td>
          <td><code>lib/drive-access.js</code></td>
        </tr>
        <tr>
          <td><strong>Google Calendar API v3</strong></td>
          <td><span class="badge-blue badge">REST API</span></td>
          <td>Criar eventos, FreeBusy, slots disponiveis, conflitos, recorrencia, lembretes</td>
          <td><code>lib/google-calendar.js</code></td>
        </tr>
        <tr>
          <td><strong>Contacts DB</strong></td>
          <td><span class="badge badge">SQLite</span></td>
          <td>Resolucao nome→email, CRUD contatos, seed de CLIENTES-CONFIG.json</td>
          <td><code>lib/contacts-db.js</code></td>
        </tr>
        <tr>
          <td><strong>Supabase</strong></td>
          <td><span class="badge-blue badge">REST API</span></td>
          <td>Log de criacao de tarefas (analytics)</td>
          <td><code>lib/supabase.js</code></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<hr class="divider">

<!-- ============ 12. COMMANDS ============ -->
<div class="doc-section" id="commands">
  <h2 class="section-title">Comandos Telegram</h2>
  <p class="section-sub">9 comandos + 7 intents de linguagem natural no bot @alex</p>
  <div class="table-card">
    <table>
      <thead>
        <tr>
          <th>Comando</th>
          <th>Descricao</th>
          <th>Workflow</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>/start</code></td>
          <td>Mensagem de boas-vindas com instrucoes</td>
          <td><span class="badge-green badge">Direto</span></td>
        </tr>
        <tr>
          <td><code>/nova</code></td>
          <td>Iniciar criacao de nova tarefa (fluxo guiado)</td>
          <td><span class="badge badge">Conversacional</span></td>
        </tr>
        <tr>
          <td><code>/tarefas</code></td>
          <td>Listar todas as tarefas pendentes</td>
          <td><span class="badge-blue badge">Consulta</span></td>
        </tr>
        <tr>
          <td><code>/dashboard</code></td>
          <td>Dashboard instantaneo (mesmo do cron 08:00)</td>
          <td><span class="badge-blue badge">Consulta</span></td>
        </tr>
        <tr>
          <td><code>/reuniao</code></td>
          <td>Agendar reuniao interativa (8 steps, Google Calendar, conflitos)</td>
          <td><span class="badge badge">Conversacional</span></td>
        </tr>
        <tr>
          <td><code>/help</code></td>
          <td>Mostrar lista de comandos disponiveis</td>
          <td><span class="badge-green badge">Direto</span></td>
        </tr>
        <tr>
          <td><code>/onboarding</code></td>
          <td>Iniciar onboarding de novo cliente (10 steps automaticos)</td>
          <td><span class="badge badge">Conversacional</span></td>
        </tr>
        <tr>
          <td><code>/churn</code></td>
          <td>Desativar cliente (selecionar → confirmar → arquivar lista)</td>
          <td><span class="badge-red badge">Acao</span></td>
        </tr>
        <tr>
          <td><code>/cancel</code></td>
          <td>Cancelar conversa ativa</td>
          <td><span class="badge-red badge">Reset</span></td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="note-callout">
    <strong>Linguagem natural:</strong> Alem dos comandos, o Alex detecta intencao automaticamente via AI (7 intents).
    "Marca reuniao amanha 14h" → scheduling. "Faz onboard da Dra. Bruna" → onboarding.
    "A Vanessa saiu" → churn. "Qual email do Dr. Enio?" → contact_query. "Oi" → greeting.
    Qualquer outro texto → analise de tarefa via Groq LLaMA.
  </div>
</div>

<hr class="divider">

<!-- ============ 13. COLLABORATION ============ -->
<div class="doc-section" id="collaboration">
  <h2 class="section-title">Colaboracao</h2>
  <p class="section-sub">Como o Alex interage com outros agentes do sistema</p>
  <div class="detail-box">
    <h4>Interage com</h4>
    <ul>
      <li><strong>@nico (Account Manager):</strong> Ambos usam Telegram — Alex para tarefas, Nico para atendimento ao cliente</li>
      <li><strong>@celo (Media Buyer):</strong> Compartilham o mesmo ecossistema Telegram para aprovar budgets e criar tasks de campanha</li>
      <li><strong>Google Calendar:</strong> google-calendar.js (Service Account) para agendamento, FreeBusy, slots e recorrencia</li>
      <li><strong>Contacts DB:</strong> contacts-db.js para resolucao de nomes em emails nos agendamentos</li>
      <li><strong>Syra Hub (Port 3008):</strong> Esta pagina de documentacao e servida pelo Hub</li>
    </ul>
  </div>
  <div class="detail-box" style="margin-top: 16px;">
    <h4>Variaveis de Ambiente</h4>
    <ul>
      <li><strong>ALEX_BOT_TOKEN:</strong> Token do bot Telegram</li>
      <li><strong>ALEX_PORT:</strong> Porta do servidor (default: 3003)</li>
      <li><strong>ALEX_OWNER_CHAT_ID:</strong> Chat ID do Eric para dashboard e notificacoes</li>
      <li><strong>GROQ_API_KEY:</strong> Chave API Groq (compartilhada com outros agentes)</li>
      <li><strong>CLICKUP_API_KEY:</strong> Token API ClickUp</li>
      <li><strong>CLICKUP_LIST_ID:</strong> ID da lista padrao de tarefas</li>
      <li><strong>GOOGLE_CALENDAR_ID:</strong> Calendar ID do Eric (ericsottnas@gmail.com)</li>
      <li><strong>GOOGLE_SERVICE_ACCOUNT_PATH:</strong> Path para google-service-account.json</li>
      <li><strong>CLICKUP_CLIENT_GROUPS:</strong> Mapping cliente → grupo WhatsApp (ex: GABRIELLE:120363xxx@g.us)</li>
    </ul>
  </div>
</div>

<hr class="divider">

<!-- ============ 17. WHATSAPP PROGRESS ============ -->
<div class="doc-section" id="whatsapp-progress">
  <h2 class="section-title">Fluxo 6 — Notificacoes WhatsApp de Progresso (Secao 17)</h2>
  <p class="section-sub">Notifica grupo WhatsApp do cliente quando tarefas/subtarefas sao concluidas no ClickUp</p>
  <div class="diagram-card">
    <pre class="mermaid">
flowchart TD
    A["Alex Bot<br/>(Telegram)"] -->|"imediato"| D["clickup-notifier.js"]
    B["ClickUp UI<br/>(Board)"] -->|"polling 2min<br/>todas as listas"| D

    D --> E{"Dedup<br/>10min TTL"}
    E -->|"duplicado"| SKIP["Skip"]
    E -->|"novo"| F["getTask(taskId)"]

    F --> RESOLVE["resolveGroupJid()<br/>listId → groupJid<br/>via CLIENTES-CONFIG.json"]
    RESOLVE --> D_GROUP{"Tem grupo<br/>mapeado?"}
    D_GROUP -->|"nao"| SKIP2["Skip (log)"]
    D_GROUP -->|"sim"| D_FOLLOWUP{"Msg enviada<br/>nos ultimos<br/>10 min?"}

    D_FOLLOWUP -->|"nao"| MSG1["Msg completa<br/>Saudacao + tarefa"]
    D_FOLLOWUP -->|"sim"| MSG2["Msg follow-up<br/>Finalizamos mais uma!"]

    MSG1 --> D_SUBS{"Tem subtarefas<br/>concluidas?"}
    MSG2 --> D_SUBS
    D_SUBS -->|"sim"| BULLETS["Lista bullet points<br/>✔️ subtarefa 1<br/>✔️ subtarefa 2"]
    D_SUBS -->|"nao"| D_LINK

    BULLETS --> D_LINK{"Campo Link<br/>preenchido?"}
    D_LINK -->|"sim"| APPROVAL["🔗 Link + pedido<br/>de aprovacao"]
    D_LINK -->|"nao"| D_COMMENTS

    APPROVAL --> D_COMMENTS{"Tem comentarios<br/>na tarefa?"}
    D_COMMENTS -->|"sim"| SUMMARY["📝 Resumo do que<br/>foi feito (Groq)"]
    D_COMMENTS -->|"nao"| SEND

    SUMMARY --> SEND["stevo.sendText()<br/>Grupo WhatsApp"]

    style A fill:#18181d,stroke:#5B8DEF,stroke-width:2px
    style B fill:#18181d,stroke:#5B8DEF,stroke-width:2px
    style E fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
    style D_GROUP fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
    style D_FOLLOWUP fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
    style D_SUBS fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
    style D_LINK fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
    style D_COMMENTS fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
    style RESOLVE fill:#18181d,stroke:#5B8DEF,stroke-width:2px
    style MSG1 fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
    style MSG2 fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
    style APPROVAL fill:#1a1a0a,stroke:#F59E0B,stroke-width:2px
    style SUMMARY fill:#18181d,stroke:#5B8DEF,stroke-width:2px
    style SEND fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
    </pre>
  </div>
  <div class="detail-box">
    <h4>Como funciona</h4>
    <ul>
      <li><strong>Path A (Bot):</strong> Quando Eric muda status via Telegram, notifyIfCompleted() dispara imediatamente</li>
      <li><strong>Path B (Poll):</strong> A cada 2 min, polla TODAS as listas de clientes no folder Clientes — detecta mudancas feitas no board do ClickUp</li>
      <li><strong>Resolucao de grupo:</strong> CLIENTES-CONFIG.json mapeia listId → groupJid (salvo durante onboarding). Fallback para env var CLICKUP_CLIENT_GROUPS</li>
      <li><strong>Dedup:</strong> Map com TTL de 10 min evita notificacao duplicada quando ambos os paths detectam a mesma mudanca</li>
    </ul>
  </div>
  <div class="detail-box" style="margin-top: 16px;">
    <h4>Formato das mensagens</h4>
    <ul>
      <li><strong>Mensagem principal:</strong> Saudacao por horario + nome da tarefa concluida (20 variacoes aleatorias, nunca repete em sequencia)</li>
      <li><strong>Subtarefas:</strong> Listadas como bullet points com ✔️ abaixo da mensagem principal</li>
      <li><strong>Entregavel (campo Link):</strong> Se preenchido, inclui o link + solicitacao de aprovacao do cliente (20 variacoes)</li>
      <li><strong>Resumo (comentarios):</strong> Se a tarefa tem comentarios, envia segunda mensagem com resumo do que foi feito (via Groq)</li>
      <li><strong>Agrupamento 10 min:</strong> Se outra tarefa concluir em menos de 10 min, troca saudacao por "Finalizamos mais uma!" (20 variacoes de follow-up)</li>
    </ul>
  </div>
  <div class="detail-box" style="margin-top: 16px;">
    <h4>Variacoes de mensagem</h4>
    <ul>
      <li><strong>20 saudacoes:</strong> "Boa tarde, pessoal! Passando pra avisar..." / "Boa tarde! Mais uma entrega prontinha..." / etc.</li>
      <li><strong>20 follow-ups:</strong> "Finalizamos mais uma!" / "Mais uma concluida:" / "E tem mais —" / etc.</li>
      <li><strong>20 aprovacoes:</strong> "Precisamos da aprovacao de voces..." / "Quando puderem, da uma conferida..." / etc.</li>
      <li><strong>Anti-repeticao:</strong> Historico por grupo garante que a mesma variacao nao aparece em sequencia</li>
    </ul>
  </div>
</div>

<hr class="divider">

<div class="doc-section" id="onboarding">
  <h2 class="section-title">Fluxo 7 — Onboarding Automatizado de Cliente (Secao 18)</h2>
  <p class="section-sub">Via /onboarding, audio ou texto natural — 10 steps sequenciais para setup completo</p>
  <div class="diagram-card">
    <pre class="mermaid">
flowchart TD
    A["Eric envia mensagem<br/>(texto, audio ou /onboarding)"] --> INTENT["detectIntent()<br/>Groq LLaMA 3.3-70b"]
    INTENT --> D_INT{"Intent?"}
    D_INT -->|"task"| TASK["Fluxo de tarefa<br/>(Fluxo 1)"]
    D_INT -->|"churn"| CHURN["Desativar cliente<br/>(arquivar lista)"]
    D_INT -->|"onboarding"| COLLECT["Coletar dados:<br/>Nome, Telefone, Instagram"]

    COLLECT --> CONFIRM{"Confirmar dados?"}
    CONFIRM -->|"Cancelar"| FIM["Fim"]
    CONFIRM -->|"Iniciar"| S1

    S1["Step 1: Drive<br/>Cria pasta + 6 subpastas<br/>+ link compartilhavel"] --> S2
    S2["Step 2: Grupo WhatsApp<br/>Cria via Stevo<br/>(Nico + Eric + cliente)"] --> S3
    S3["Step 3: Promover admins<br/>Eric + stakeholder"] --> S4
    S4["Step 4: Foto do grupo<br/>syra-group-photo.jpg"] --> S5
    S5["Step 5: Descricao<br/>Growth Performance"] --> S6
    S6["Step 6: Boas-vindas<br/>Template + link Drive"] --> S7
    S7["Step 7: Lista ClickUp<br/>Kanban 7 status"] --> S8
    S8["Step 8: Tarefa ClickUp<br/>[ONBOARDING] + 6 subtarefas"] --> S9
    S9["Step 9: Docs<br/>README + CONFIG.json<br/>(salva groupJid + listId)"] --> S10
    S10["Step 10: Notify<br/>Resumo no Telegram<br/>+ reloadGroups()"]

    S10 --> READY["Cliente pronto!<br/>Notificacoes ativas<br/>automaticamente"]

    style A fill:#18181d,stroke:#5B8DEF,stroke-width:2px
    style INTENT fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
    style D_INT fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
    style CONFIRM fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
    style S1 fill:#18181d,stroke:#5B8DEF,stroke-width:2px
    style S2 fill:#18181d,stroke:#5B8DEF,stroke-width:2px
    style S3 fill:#1e1e24,stroke:#35353c,stroke-width:1px
    style S4 fill:#1e1e24,stroke:#35353c,stroke-width:1px
    style S5 fill:#1e1e24,stroke:#35353c,stroke-width:1px
    style S6 fill:#18181d,stroke:#5B8DEF,stroke-width:2px
    style S7 fill:#18181d,stroke:#5B8DEF,stroke-width:2px
    style S8 fill:#18181d,stroke:#5B8DEF,stroke-width:2px
    style S9 fill:#1a1a0a,stroke:#C8FF00,stroke-width:2px
    style S10 fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
    style READY fill:#0a1a0a,stroke:#22C55E,stroke-width:2px
    style CHURN fill:#1a0a0a,stroke:#EF4444,stroke-width:2px
    </pre>
  </div>
  <div class="detail-box">
    <h4>Ativacao por linguagem natural</h4>
    <ul>
      <li><strong>detectIntent():</strong> Groq LLaMA classifica mensagens como task, onboarding ou churn automaticamente</li>
      <li><strong>Onboarding:</strong> "Faz o onboard da Dra. Bruna, telefone 5531999..." → extrai nome, telefone, Instagram e inicia</li>
      <li><strong>Churn:</strong> "A Vanessa saiu da assessoria" → detecta cliente, confirma e arquiva lista no ClickUp</li>
      <li><strong>Comando:</strong> /onboarding tambem funciona como fluxo guiado interativo</li>
    </ul>
  </div>
  <div class="detail-box" style="margin-top: 16px;">
    <h4>O que cada step produz</h4>
    <ul>
      <li><strong>Drive:</strong> Pasta com 6 subpastas (Criativos, Documentacao, Documentos, Imagens, Planilhas, Videos) + link compartilhavel com permissao publica de edicao</li>
      <li><strong>WhatsApp:</strong> Grupo "Cliente x Syra Digital" com foto, descricao e mensagem de boas-vindas com link do Drive</li>
      <li><strong>ClickUp:</strong> Lista dedicada com 7 status Kanban + tarefa [ONBOARDING] com 6 subtarefas de documentos</li>
      <li><strong>Config:</strong> CLIENTES-CONFIG.json salva groupJid, clickupListId e driveLink — notificacoes ativas automaticamente</li>
    </ul>
  </div>
  <div class="detail-box" style="margin-top: 16px;">
    <h4>Graceful Degradation</h4>
    <ul>
      <li>Cada step e independente — se um falhar, continua pro proximo</li>
      <li>Steps 3-6 (WhatsApp) dependem do groupJid do step 2</li>
      <li>Step 8 (tarefa) depende do clickupListId do step 7</li>
      <li>Resumo final lista todos os erros para acao manual</li>
    </ul>
  </div>
</div>

</div><!-- /.container -->

<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
  mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#1e1e24',
      primaryTextColor: '#F0F0F5',
      primaryBorderColor: '#35353c',
      lineColor: '#505060',
      secondaryColor: '#18181d',
      tertiaryColor: '#27272d',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '13px'
    },
    flowchart: { htmlLabels: true, curve: 'basis', padding: 12, nodeSpacing: 30, rankSpacing: 40 }
  });

  // TOC Scroll Spy
  const tocLinks = document.querySelectorAll('.toc-list a');
  const sections = document.querySelectorAll('.doc-section');

  function updateToc() {
    let current = null;
    for (const s of sections) {
      const rect = s.getBoundingClientRect();
      if (rect.top <= 80) {
        const id = s.getAttribute('id');
        const a = document.querySelector('.toc-list a[href="#' + id + '"]');
        if (a) current = { id, a };
      }
    }
    tocLinks.forEach(a => a.classList.remove('active'));
    if (current) current.a.classList.add('active');
  }
  window.addEventListener('scroll', updateToc, { passive: true });
  updateToc();

  // Smooth scroll
  tocLinks.forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
</script>
</body>
</html>`;
}


// ============================================================
// Design System — Syra Digital
// Extraído do projeto Impact Clinic Growth (identidade visual)
// Acesso: http://localhost:3008/design-system
// ============================================================

app.get('/design-system', (req, res) => res.send(buildDesignSystemHtml()));

function buildDesignSystemHtml() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Syra Digital — Design System</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>

/* ═══════════════════════════════════════════════════════════════
   SYRA DIGITAL — DESIGN SYSTEM v1.0
   Documentação Visual Completa
   Fonte: Impact Clinic Growth + Syra Hub v2.0
   ═══════════════════════════════════════════════════════════════ */

:root {
  /* ── BRAND COLORS (Landing Page — HSL) ── */
  --brand-lime:          hsl(78, 100%, 69%);
  --brand-lime-hex:      #C8FF00;
  --brand-lime-hover:    hsl(78, 100%, 59%);
  --brand-lime-dim:      rgba(200, 255, 0, 0.08);
  --brand-lime-mid:      rgba(200, 255, 0, 0.15);
  --brand-lime-glow:     rgba(200, 255, 0, 0.22);
  --brand-lime-glow-lg:  rgba(200, 255, 0, 0.30);
  --brand-lime-border:   rgba(200, 255, 0, 0.28);

  --brand-platinum:      hsl(0, 0%, 89%);
  --brand-rich-black:    hsl(210, 50%, 1%);
  --brand-morning-blue:  hsl(200, 6%, 58%);

  /* ── BACKGROUND SCALE ── */
  --bg-base:         #030303;
  --bg-surface:      #0a0a0a;
  --bg-elevated:     #101013;
  --bg-overlay:      #18181d;
  --bg-card:         #0a0a0a;
  --bg-muted:        hsl(0, 0%, 12%);

  /* ── BORDER SCALE ── */
  --border-faint:    #141417;
  --border-subtle:   #1e1e23;
  --border-base:     hsl(0, 0%, 18%);
  --border-strong:   #35353c;
  --border-accent:   var(--brand-lime-border);

  /* ── TEXT SCALE ── */
  --text-primary:    hsl(0, 0%, 89%);
  --text-secondary:  hsl(200, 6%, 58%);
  --text-muted:      #505060;
  --text-disabled:   #36363f;
  --text-on-accent:  hsl(0, 0%, 1%);

  /* ── SEMANTIC COLORS ── */
  --success:         #22C55E;
  --success-bg:      rgba(34, 197, 94, 0.10);
  --warning:         #F59E0B;
  --warning-bg:      rgba(245, 158, 11, 0.10);
  --danger:          #EF4444;
  --danger-bg:       rgba(239, 68, 68, 0.10);
  --info:            #3B82F6;
  --info-bg:         rgba(59, 130, 246, 0.10);

  /* ── TYPOGRAPHY ── */
  --font-brand:      'Nunito Sans', sans-serif;
  --font-display:    'Space Grotesk', 'Inter', system-ui, sans-serif;
  --font-body:       'Inter', system-ui, -apple-system, sans-serif;
  --font-mono:       'JetBrains Mono', 'Fira Code', monospace;

  /* ── TYPE SCALE ── */
  --ts-xs:   0.75rem;
  --ts-sm:   0.875rem;
  --ts-base: 1rem;
  --ts-lg:   1.125rem;
  --ts-xl:   1.25rem;
  --ts-2xl:  1.5rem;
  --ts-3xl:  1.875rem;
  --ts-4xl:  2.25rem;
  --ts-5xl:  3rem;
  --ts-6xl:  3.75rem;
  --ts-7xl:  4.5rem;

  /* ── SPACING (4px base) ── */
  --sp-1:  4px;   --sp-2:  8px;   --sp-3:  12px;  --sp-4:  16px;
  --sp-5:  20px;  --sp-6:  24px;  --sp-8:  32px;  --sp-10: 40px;
  --sp-12: 48px;  --sp-16: 64px;  --sp-20: 80px;  --sp-24: 96px;

  /* ── BORDER RADIUS ── */
  --r-none: 0;
  --r-xs:   3px;
  --r-sm:   6px;
  --r-md:   8px;
  --r-lg:   12px;
  --r-xl:   16px;
  --r-2xl:  24px;
  --r-full: 9999px;

  /* ── SHADOWS ── */
  --shadow-xs:  0 1px 2px rgba(0,0,0,0.4);
  --shadow-sm:  0 2px 6px rgba(0,0,0,0.5);
  --shadow-md:  0 4px 14px rgba(0,0,0,0.6);
  --shadow-lg:  0 8px 28px rgba(0,0,0,0.7);
  --shadow-glow-sm: 0 0 30px rgba(200, 255, 0, 0.2);
  --shadow-glow-lg: 0 0 60px rgba(200, 255, 0, 0.3);
  --shadow-glow-ring:
    0 0 0 1px var(--brand-lime-border),
    0 0 20px var(--brand-lime-glow),
    0 0 40px rgba(200, 255, 0, 0.08);

  /* ── TRANSITIONS ── */
  --ease-fast:  120ms cubic-bezier(0.4, 0, 0.2, 1);
  --ease-base:  200ms cubic-bezier(0.4, 0, 0.2, 1);
  --ease-slow:  300ms cubic-bezier(0.4, 0, 0.2, 1);
  --ease-enter: 600ms ease-out;

  /* ── BREAKPOINTS (ref) ── */
  /* sm: 640px | md: 768px | lg: 1024px | xl: 1280px | 2xl: 1400px */

  /* ── LAYOUT ── */
  --container-max: 1152px;
  --container-padding: 2rem;
}

/* ═══ RESET ═══ */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--font-body);
  background: var(--bg-base);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  line-height: 1.6;
}

/* ═══ LAYOUT ═══ */
.ds-container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

.ds-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(3,3,3,0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
  padding: var(--sp-4) 0;
}

.ds-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

.ds-header-brand {
  font-family: var(--font-display);
  font-size: var(--ts-xl);
  font-weight: 700;
  color: var(--text-primary);
}
.ds-header-brand span { color: var(--brand-lime); }

.ds-header-version {
  font-family: var(--font-mono);
  font-size: var(--ts-xs);
  color: var(--text-muted);
  background: var(--bg-elevated);
  padding: 2px 10px;
  border-radius: var(--r-full);
  border: 1px solid var(--border-subtle);
}

.ds-back-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: var(--ts-sm);
  transition: color var(--ease-base);
}
.ds-back-link:hover { color: var(--brand-lime); }

/* ═══ NAV LATERAL ═══ */
.ds-layout {
  display: flex;
  gap: var(--sp-10);
  padding: var(--sp-10) 0 var(--sp-16);
}

.ds-nav {
  position: sticky;
  top: 80px;
  width: 220px;
  flex-shrink: 0;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  padding-right: var(--sp-4);
}

.ds-nav-title {
  font-family: var(--font-display);
  font-size: var(--ts-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: var(--sp-3);
  padding-left: var(--sp-3);
}

.ds-nav a {
  display: block;
  padding: var(--sp-2) var(--sp-3);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: var(--ts-sm);
  border-left: 2px solid transparent;
  transition: all var(--ease-base);
  margin-bottom: 2px;
}
.ds-nav a:hover {
  color: var(--text-primary);
  background: var(--brand-lime-dim);
  border-left-color: var(--brand-lime);
}

.ds-content { flex: 1; min-width: 0; }

/* ═══ SECTIONS ═══ */
.ds-section {
  margin-bottom: var(--sp-16);
  scroll-margin-top: 90px;
}

.ds-section-title {
  font-family: var(--font-display);
  font-size: var(--ts-3xl);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: var(--sp-2);
}
.ds-section-title span { color: var(--brand-lime); }

.ds-section-desc {
  color: var(--text-secondary);
  font-size: var(--ts-base);
  margin-bottom: var(--sp-8);
  max-width: 640px;
}

.ds-subsection {
  margin-bottom: var(--sp-10);
}

.ds-subsection-title {
  font-family: var(--font-display);
  font-size: var(--ts-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--sp-4);
  padding-bottom: var(--sp-2);
  border-bottom: 1px solid var(--border-subtle);
}

/* ═══ HERO ═══ */
.ds-hero {
  text-align: center;
  padding: var(--sp-20) 0 var(--sp-16);
  position: relative;
  overflow: hidden;
}
.ds-hero::before {
  content: '';
  position: absolute;
  top: -100px;
  right: -100px;
  width: 500px;
  height: 500px;
  background: var(--brand-lime);
  opacity: 0.06;
  filter: blur(120px);
  pointer-events: none;
}
.ds-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  border: 1px solid var(--border-base);
  padding: var(--sp-2) var(--sp-4);
  margin-bottom: var(--sp-6);
  font-size: var(--ts-xs);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-secondary);
  font-weight: 600;
}
.ds-hero-badge .dot {
  width: 8px; height: 8px;
  background: var(--brand-lime);
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

.ds-hero h1 {
  font-family: var(--font-brand);
  font-size: clamp(2.5rem, 5vw, 4.5rem);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: var(--sp-4);
}
.ds-hero h1 .accent { color: var(--brand-lime); }
.ds-hero h1 .muted  { color: var(--text-secondary); }

.ds-hero p {
  color: var(--text-secondary);
  font-size: var(--ts-lg);
  max-width: 600px;
  margin: 0 auto;
}

/* ═══ COLOR SWATCHES ═══ */
.ds-color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--sp-4);
}
.ds-color-card {
  border: 1px solid var(--border-subtle);
  overflow: hidden;
  background: var(--bg-surface);
  transition: border-color var(--ease-base);
}
.ds-color-card:hover { border-color: var(--border-strong); }
.ds-color-swatch {
  height: 100px;
  position: relative;
}
.ds-color-swatch .copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  border: none;
  padding: 4px 10px;
  font-size: 11px;
  font-family: var(--font-mono);
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--ease-base);
}
.ds-color-card:hover .copy-btn { opacity: 1; }
.ds-color-info {
  padding: var(--sp-3) var(--sp-4);
}
.ds-color-name {
  font-weight: 600;
  font-size: var(--ts-sm);
  color: var(--text-primary);
  margin-bottom: 2px;
}
.ds-color-value {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}

/* ═══ TOKEN TABLE ═══ */
.ds-token-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--ts-sm);
}
.ds-token-table th {
  text-align: left;
  padding: var(--sp-3) var(--sp-4);
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 2px solid var(--border-base);
  font-size: var(--ts-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.ds-token-table td {
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--border-faint);
  vertical-align: middle;
}
.ds-token-table tr:hover { background: var(--brand-lime-dim); }
.ds-token-table .token-var {
  font-family: var(--font-mono);
  color: var(--brand-lime);
  font-size: 12px;
}
.ds-token-table .token-preview {
  display: inline-block;
  vertical-align: middle;
}

/* ═══ TYPOGRAPHY SPECIMENS ═══ */
.ds-type-specimen {
  padding: var(--sp-6);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  margin-bottom: var(--sp-4);
}
.ds-type-sample {
  margin-bottom: var(--sp-3);
}
.ds-type-meta {
  display: flex;
  gap: var(--sp-4);
  flex-wrap: wrap;
}
.ds-type-tag {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-elevated);
  padding: 2px 8px;
  border: 1px solid var(--border-faint);
}

/* ═══ COMPONENT SHOWCASE ═══ */
.ds-showcase {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  padding: var(--sp-8);
  margin-bottom: var(--sp-4);
}
.ds-showcase-label {
  font-family: var(--font-mono);
  font-size: var(--ts-xs);
  color: var(--text-muted);
  margin-bottom: var(--sp-4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.ds-showcase-row {
  display: flex;
  gap: var(--sp-4);
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: var(--sp-6);
}

/* ═══ BUTTONS ═══ */
.ds-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
  font-size: var(--ts-sm);
  transition: all 300ms;
  cursor: pointer;
  border: none;
  white-space: nowrap;
}
.ds-btn:focus-visible {
  outline: 2px solid var(--brand-lime);
  outline-offset: 2px;
}

/* Variants */
.ds-btn-primary {
  background: var(--brand-lime);
  color: var(--text-on-accent);
}
.ds-btn-primary:hover {
  background: var(--brand-lime-hover);
  box-shadow: var(--shadow-glow-sm);
}
.ds-btn-outline {
  background: transparent;
  color: var(--brand-lime);
  border: 2px solid var(--brand-lime);
}
.ds-btn-outline:hover {
  background: var(--brand-lime);
  color: var(--text-on-accent);
}
.ds-btn-secondary {
  background: var(--bg-muted);
  color: var(--text-primary);
}
.ds-btn-secondary:hover { background: rgba(255,255,255,0.12); }
.ds-btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}
.ds-btn-ghost:hover { background: var(--bg-muted); color: var(--text-primary); }
.ds-btn-destructive {
  background: var(--danger);
  color: white;
}
.ds-btn-destructive:hover { background: #dc2626; }
.ds-btn-hero {
  background: var(--brand-lime);
  color: var(--text-on-accent);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: var(--shadow-glow-sm);
}
.ds-btn-hero:hover { box-shadow: var(--shadow-glow-lg); }
.ds-btn-hero-outline {
  background: transparent;
  color: var(--text-primary);
  border: 2px solid rgba(240,240,245,0.3);
  font-weight: 600;
}
.ds-btn-hero-outline:hover {
  border-color: var(--brand-lime);
  color: var(--brand-lime);
}

/* Sizes */
.ds-btn-sm  { height: 36px; padding: 0 16px; font-size: var(--ts-sm); }
.ds-btn-md  { height: 44px; padding: 0 24px; font-size: var(--ts-sm); }
.ds-btn-lg  { height: 56px; padding: 0 40px; font-size: var(--ts-base); }
.ds-btn-xl  { height: 64px; padding: 0 48px; font-size: var(--ts-lg); }
.ds-btn-icon { width: 40px; height: 40px; padding: 0; }

/* ═══ INPUTS ═══ */
.ds-input {
  width: 100%;
  max-width: 380px;
  height: 48px;
  border: 2px solid var(--border-base);
  background: var(--bg-muted);
  color: var(--text-primary);
  padding: 0 var(--sp-4);
  font-size: var(--ts-base);
  font-family: var(--font-body);
  transition: all 200ms;
}
.ds-input::placeholder { color: var(--text-secondary); }
.ds-input:focus {
  outline: none;
  border-color: var(--brand-lime);
  box-shadow: 0 0 0 1px var(--brand-lime);
}
.ds-input:disabled { opacity: 0.5; cursor: not-allowed; }

.ds-label {
  display: block;
  font-size: var(--ts-sm);
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--sp-2);
}

/* ═══ CARDS ═══ */
.ds-card {
  background: var(--bg-card);
  border: 1px solid var(--border-base);
  padding: var(--sp-6);
  transition: all 300ms;
}
.ds-card:hover {
  border-color: var(--brand-lime-border);
}
.ds-card-gradient {
  border: 1px solid transparent;
  background:
    linear-gradient(var(--bg-card), var(--bg-card)) padding-box,
    linear-gradient(135deg, var(--brand-lime-border), transparent) border-box;
}
.ds-card-glow:hover {
  box-shadow: var(--shadow-glow-sm);
}
.ds-card-icon {
  color: var(--brand-lime);
  margin-bottom: var(--sp-4);
}
.ds-card-title {
  font-weight: 700;
  font-size: var(--ts-base);
  color: var(--text-primary);
  margin-bottom: var(--sp-2);
}
.ds-card-desc {
  font-size: var(--ts-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}

/* ═══ BADGES ═══ */
.ds-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: var(--sp-1) var(--sp-3);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border: 1px solid var(--border-base);
  color: var(--text-secondary);
}
.ds-badge-lime {
  color: var(--brand-lime);
  border-color: var(--brand-lime-border);
  background: var(--brand-lime-dim);
}
.ds-badge-success { color: var(--success); border-color: rgba(34,197,94,0.3); background: var(--success-bg); }
.ds-badge-warning { color: var(--warning); border-color: rgba(245,158,11,0.3); background: var(--warning-bg); }
.ds-badge-danger  { color: var(--danger);  border-color: rgba(239,68,68,0.3);  background: var(--danger-bg); }

/* ═══ EFFECTS ═══ */
.ds-effect-box {
  padding: var(--sp-6);
  text-align: center;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
}
.ds-text-gradient {
  background: linear-gradient(to right, var(--brand-lime), rgba(200,255,0,0.7));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 800;
  font-size: var(--ts-3xl);
  font-family: var(--font-brand);
}

/* ═══ SPACING VISUAL ═══ */
.ds-spacing-row {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin-bottom: var(--sp-3);
}
.ds-spacing-block {
  background: var(--brand-lime-mid);
  border: 1px solid var(--brand-lime-border);
  height: 32px;
}
.ds-spacing-label {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
  min-width: 80px;
}
.ds-spacing-value {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 50px;
}

/* ═══ ANIMATION SHOWCASE ═══ */
.ds-anim-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--sp-4);
}
.ds-anim-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  padding: var(--sp-6);
  text-align: center;
  cursor: pointer;
  transition: border-color var(--ease-base);
}
.ds-anim-card:hover { border-color: var(--brand-lime-border); }
.ds-anim-demo {
  width: 48px;
  height: 48px;
  background: var(--brand-lime);
  margin: 0 auto var(--sp-4);
}
.ds-anim-name {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--brand-lime);
  margin-bottom: var(--sp-1);
}
.ds-anim-timing {
  font-size: 11px;
  color: var(--text-muted);
}

/* Animations */
@keyframes ds-fade-in { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes ds-slide-left { from{opacity:0;transform:translateX(-30px)} to{opacity:1;transform:translateX(0)} }
@keyframes ds-slide-right { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
@keyframes ds-scale-in { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
@keyframes ds-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes ds-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }

.play-fade-in      { animation: ds-fade-in 0.6s ease-out forwards; }
.play-slide-left   { animation: ds-slide-left 0.6s ease-out forwards; }
.play-slide-right  { animation: ds-slide-right 0.6s ease-out forwards; }
.play-scale-in     { animation: ds-scale-in 0.4s ease-out forwards; }
.play-pulse        { animation: ds-pulse 2s infinite; }
.play-bounce       { animation: ds-bounce 1s infinite; }

/* ═══ CODE BLOCK ═══ */
.ds-code {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  padding: var(--sp-4) var(--sp-6);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
  overflow-x: auto;
  white-space: pre;
  margin-top: var(--sp-3);
  line-height: 1.7;
}
.ds-code .key { color: var(--brand-lime); }
.ds-code .val { color: #F59E0B; }
.ds-code .comment { color: var(--text-muted); }

/* ═══ GRID PATTERN ═══ */
.ds-grid-demo {
  display: grid;
  gap: var(--sp-4);
  margin-bottom: var(--sp-4);
}
.ds-grid-demo-item {
  background: var(--brand-lime-dim);
  border: 1px dashed var(--brand-lime-border);
  padding: var(--sp-4);
  text-align: center;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
}

/* ═══ RESPONSIVE ═══ */
@media (max-width: 768px) {
  .ds-nav { display: none; }
  .ds-layout { padding: var(--sp-6) 0; }
  .ds-color-grid { grid-template-columns: repeat(2, 1fr); }
  .ds-showcase-row { flex-direction: column; align-items: flex-start; }
}
</style>
</head>
<body>

<!-- ═══ HEADER ═══ -->
<header class="ds-header">
  <div class="ds-header-inner">
    <div style="display:flex;align-items:center;gap:var(--sp-4)">
      <a href="/" class="ds-back-link">&larr; Hub</a>
      <div class="ds-header-brand"><span>Syra</span> Design System</div>
    </div>
    <div class="ds-header-version">v1.0.0</div>
  </div>
</header>

<div class="ds-container">

<!-- ═══ HERO ═══ -->
<div class="ds-hero">
  <div class="ds-hero-badge"><span class="dot"></span> Design System Oficial</div>
  <h1>
    <span class="accent">Design System</span><br>
    <span class="muted">Syra Digital</span>
  </h1>
  <p>Documentação completa de tokens, componentes e padrões visuais para garantir consistência em todos os materiais da marca.</p>
</div>

<!-- ═══ LAYOUT ═══ -->
<div class="ds-layout">

<!-- NAV -->
<nav class="ds-nav">
  <div class="ds-nav-title">Fundações</div>
  <a href="#colors">Cores</a>
  <a href="#typography">Tipografia</a>
  <a href="#spacing">Espaçamento</a>
  <a href="#shadows">Sombras</a>
  <a href="#radius">Border Radius</a>
  <div class="ds-nav-title" style="margin-top:var(--sp-6)">Componentes</div>
  <a href="#buttons">Botões</a>
  <a href="#inputs">Inputs</a>
  <a href="#cards">Cards</a>
  <a href="#badges">Badges</a>
  <div class="ds-nav-title" style="margin-top:var(--sp-6)">Padrões</div>
  <a href="#effects">Efeitos</a>
  <a href="#animations">Animações</a>
  <a href="#layout-patterns">Layout</a>
  <a href="#usage">Como Usar</a>
</nav>

<!-- CONTENT -->
<main class="ds-content">

<!-- ═══ 1. COLORS ═══ -->
<section class="ds-section" id="colors">
  <h2 class="ds-section-title"><span>01.</span> Cores</h2>
  <p class="ds-section-desc">Paleta de cores da marca Syra Digital. Todas as cores usam HSL com CSS Variables para máxima flexibilidade.</p>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Brand Colors</h3>
    <div class="ds-color-grid">
      <div class="ds-color-card">
        <div class="ds-color-swatch" style="background:hsl(78,100%,69%)">
          <button class="copy-btn" onclick="copyColor('#C8FF00')">Copy</button>
        </div>
        <div class="ds-color-info">
          <div class="ds-color-name">Lime (Primary)</div>
          <div class="ds-color-value">HSL(78, 100%, 69%) · #C8FF00</div>
        </div>
      </div>
      <div class="ds-color-card">
        <div class="ds-color-swatch" style="background:hsl(0,0%,89%)">
          <button class="copy-btn" onclick="copyColor('#E3E3E3')">Copy</button>
        </div>
        <div class="ds-color-info">
          <div class="ds-color-name">Platinum (Foreground)</div>
          <div class="ds-color-value">HSL(0, 0%, 89%) · #E3E3E3</div>
        </div>
      </div>
      <div class="ds-color-card">
        <div class="ds-color-swatch" style="background:hsl(210,50%,1%)">
          <button class="copy-btn" onclick="copyColor('#030303')">Copy</button>
        </div>
        <div class="ds-color-info">
          <div class="ds-color-name">Rich Black (Background)</div>
          <div class="ds-color-value">HSL(210, 50%, 1%) · #030303</div>
        </div>
      </div>
      <div class="ds-color-card">
        <div class="ds-color-swatch" style="background:hsl(200,6%,58%)">
          <button class="copy-btn" onclick="copyColor('#8B9296')">Copy</button>
        </div>
        <div class="ds-color-info">
          <div class="ds-color-name">Morning Blue (Secondary)</div>
          <div class="ds-color-value">HSL(200, 6%, 58%) · #8B9296</div>
        </div>
      </div>
    </div>
  </div>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Background Scale</h3>
    <div class="ds-color-grid">
      <div class="ds-color-card">
        <div class="ds-color-swatch" style="background:#030303"><button class="copy-btn" onclick="copyColor('#030303')">Copy</button></div>
        <div class="ds-color-info"><div class="ds-color-name">Base</div><div class="ds-color-value">--bg-base · #030303</div></div>
      </div>
      <div class="ds-color-card">
        <div class="ds-color-swatch" style="background:#0a0a0a"><button class="copy-btn" onclick="copyColor('#0a0a0a')">Copy</button></div>
        <div class="ds-color-info"><div class="ds-color-name">Surface / Card</div><div class="ds-color-value">--bg-surface · #0A0A0A</div></div>
      </div>
      <div class="ds-color-card">
        <div class="ds-color-swatch" style="background:#101013"><button class="copy-btn" onclick="copyColor('#101013')">Copy</button></div>
        <div class="ds-color-info"><div class="ds-color-name">Elevated</div><div class="ds-color-value">--bg-elevated · #101013</div></div>
      </div>
      <div class="ds-color-card">
        <div class="ds-color-swatch" style="background:hsl(0,0%,12%)"><button class="copy-btn" onclick="copyColor('hsl(0,0%,12%)')">Copy</button></div>
        <div class="ds-color-info"><div class="ds-color-name">Muted</div><div class="ds-color-value">--bg-muted · HSL(0,0%,12%)</div></div>
      </div>
    </div>
  </div>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Semantic Colors</h3>
    <div class="ds-color-grid">
      <div class="ds-color-card">
        <div class="ds-color-swatch" style="background:#22C55E"><button class="copy-btn" onclick="copyColor('#22C55E')">Copy</button></div>
        <div class="ds-color-info"><div class="ds-color-name">Success</div><div class="ds-color-value">#22C55E</div></div>
      </div>
      <div class="ds-color-card">
        <div class="ds-color-swatch" style="background:#F59E0B"><button class="copy-btn" onclick="copyColor('#F59E0B')">Copy</button></div>
        <div class="ds-color-info"><div class="ds-color-name">Warning</div><div class="ds-color-value">#F59E0B</div></div>
      </div>
      <div class="ds-color-card">
        <div class="ds-color-swatch" style="background:#EF4444"><button class="copy-btn" onclick="copyColor('#EF4444')">Copy</button></div>
        <div class="ds-color-info"><div class="ds-color-name">Danger / Destructive</div><div class="ds-color-value">#EF4444</div></div>
      </div>
      <div class="ds-color-card">
        <div class="ds-color-swatch" style="background:#3B82F6"><button class="copy-btn" onclick="copyColor('#3B82F6')">Copy</button></div>
        <div class="ds-color-info"><div class="ds-color-name">Info</div><div class="ds-color-value">#3B82F6</div></div>
      </div>
    </div>
  </div>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Accent Opacities</h3>
    <div class="ds-color-grid">
      <div class="ds-color-card">
        <div class="ds-color-swatch" style="background:rgba(200,255,0,0.08)"><button class="copy-btn" onclick="copyColor('rgba(200,255,0,0.08)')">Copy</button></div>
        <div class="ds-color-info"><div class="ds-color-name">Lime Dim (8%)</div><div class="ds-color-value">Hover backgrounds</div></div>
      </div>
      <div class="ds-color-card">
        <div class="ds-color-swatch" style="background:rgba(200,255,0,0.15)"><button class="copy-btn" onclick="copyColor('rgba(200,255,0,0.15)')">Copy</button></div>
        <div class="ds-color-info"><div class="ds-color-name">Lime Mid (15%)</div><div class="ds-color-value">Active/selected states</div></div>
      </div>
      <div class="ds-color-card">
        <div class="ds-color-swatch" style="background:rgba(200,255,0,0.22)"><button class="copy-btn" onclick="copyColor('rgba(200,255,0,0.22)')">Copy</button></div>
        <div class="ds-color-info"><div class="ds-color-name">Lime Glow (22%)</div><div class="ds-color-value">Glow effects</div></div>
      </div>
      <div class="ds-color-card">
        <div class="ds-color-swatch" style="background:rgba(200,255,0,0.28);border:1px solid rgba(200,255,0,0.4)"><button class="copy-btn" onclick="copyColor('rgba(200,255,0,0.28)')">Copy</button></div>
        <div class="ds-color-info"><div class="ds-color-name">Lime Border (28%)</div><div class="ds-color-value">Accent borders</div></div>
      </div>
    </div>
  </div>
</section>

<!-- ═══ 2. TYPOGRAPHY ═══ -->
<section class="ds-section" id="typography">
  <h2 class="ds-section-title"><span>02.</span> Tipografia</h2>
  <p class="ds-section-desc">Sistema tipográfico com 4 famílias: Brand (Nunito Sans) para landing pages, Display (Space Grotesk) para títulos do Hub, Body (Inter) para texto corrido, e Mono (JetBrains Mono) para código.</p>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Font Families</h3>
    <div class="ds-type-specimen">
      <div class="ds-type-sample" style="font-family:'Nunito Sans',sans-serif;font-size:var(--ts-3xl);font-weight:800">
        Nunito Sans — Brand Font
      </div>
      <div class="ds-type-meta">
        <span class="ds-type-tag">--font-brand</span>
        <span class="ds-type-tag">Weights: 400 500 600 700 800</span>
        <span class="ds-type-tag">Landing pages, headlines</span>
      </div>
    </div>
    <div class="ds-type-specimen">
      <div class="ds-type-sample" style="font-family:'Space Grotesk',sans-serif;font-size:var(--ts-2xl);font-weight:700">
        Space Grotesk — Display Font
      </div>
      <div class="ds-type-meta">
        <span class="ds-type-tag">--font-display</span>
        <span class="ds-type-tag">Weights: 500 600 700 800</span>
        <span class="ds-type-tag">Hub titles, section headers</span>
      </div>
    </div>
    <div class="ds-type-specimen">
      <div class="ds-type-sample" style="font-family:'Inter',sans-serif;font-size:var(--ts-lg);font-weight:400">
        Inter — Body Font. O texto principal de toda a interface.
      </div>
      <div class="ds-type-meta">
        <span class="ds-type-tag">--font-body</span>
        <span class="ds-type-tag">Weights: 400 500 600 700</span>
        <span class="ds-type-tag">Paragraphs, labels, descriptions</span>
      </div>
    </div>
    <div class="ds-type-specimen">
      <div class="ds-type-sample" style="font-family:'JetBrains Mono',monospace;font-size:var(--ts-base);font-weight:400">
        JetBrains Mono — Monospace Font
      </div>
      <div class="ds-type-meta">
        <span class="ds-type-tag">--font-mono</span>
        <span class="ds-type-tag">Weights: 400 500</span>
        <span class="ds-type-tag">Code, tokens, ports, technical data</span>
      </div>
    </div>
  </div>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Type Scale</h3>
    <table class="ds-token-table">
      <thead><tr><th>Token</th><th>Size</th><th>Preview</th><th>Uso</th></tr></thead>
      <tbody>
        <tr><td class="token-var">--ts-xs</td><td>0.75rem (12px)</td><td style="font-size:0.75rem">Aa</td><td>Badges, labels menores</td></tr>
        <tr><td class="token-var">--ts-sm</td><td>0.875rem (14px)</td><td style="font-size:0.875rem">Aa</td><td>Botões, texto secundário</td></tr>
        <tr><td class="token-var">--ts-base</td><td>1rem (16px)</td><td style="font-size:1rem">Aa</td><td>Corpo de texto</td></tr>
        <tr><td class="token-var">--ts-lg</td><td>1.125rem (18px)</td><td style="font-size:1.125rem">Aa</td><td>Subtítulos, descrições hero</td></tr>
        <tr><td class="token-var">--ts-xl</td><td>1.25rem (20px)</td><td style="font-size:1.25rem">Aa</td><td>Heading H4</td></tr>
        <tr><td class="token-var">--ts-2xl</td><td>1.5rem (24px)</td><td style="font-size:1.5rem">Aa</td><td>Heading H3, card titles</td></tr>
        <tr><td class="token-var">--ts-3xl</td><td>1.875rem (30px)</td><td style="font-size:1.875rem">Aa</td><td>Section headers mobile</td></tr>
        <tr><td class="token-var">--ts-4xl</td><td>2.25rem (36px)</td><td style="font-size:2.25rem">Aa</td><td>Section headers desktop</td></tr>
        <tr><td class="token-var">--ts-5xl</td><td>3rem (48px)</td><td style="font-size:2.5rem">Aa</td><td>Hero heading</td></tr>
        <tr><td class="token-var">--ts-7xl</td><td>4.5rem (72px)</td><td style="font-size:3rem">Aa</td><td>Hero heading max</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- ═══ 3. SPACING ═══ -->
<section class="ds-section" id="spacing">
  <h2 class="ds-section-title"><span>03.</span> Espaçamento</h2>
  <p class="ds-section-desc">Sistema baseado em múltiplos de 4px. Use os tokens para padding, margin e gap.</p>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Spacing Scale</h3>
    <div class="ds-spacing-row"><span class="ds-spacing-label">--sp-1</span><span class="ds-spacing-value">4px</span><div class="ds-spacing-block" style="width:4px"></div></div>
    <div class="ds-spacing-row"><span class="ds-spacing-label">--sp-2</span><span class="ds-spacing-value">8px</span><div class="ds-spacing-block" style="width:8px"></div></div>
    <div class="ds-spacing-row"><span class="ds-spacing-label">--sp-3</span><span class="ds-spacing-value">12px</span><div class="ds-spacing-block" style="width:12px"></div></div>
    <div class="ds-spacing-row"><span class="ds-spacing-label">--sp-4</span><span class="ds-spacing-value">16px</span><div class="ds-spacing-block" style="width:16px"></div></div>
    <div class="ds-spacing-row"><span class="ds-spacing-label">--sp-6</span><span class="ds-spacing-value">24px</span><div class="ds-spacing-block" style="width:24px"></div></div>
    <div class="ds-spacing-row"><span class="ds-spacing-label">--sp-8</span><span class="ds-spacing-value">32px</span><div class="ds-spacing-block" style="width:32px"></div></div>
    <div class="ds-spacing-row"><span class="ds-spacing-label">--sp-10</span><span class="ds-spacing-value">40px</span><div class="ds-spacing-block" style="width:40px"></div></div>
    <div class="ds-spacing-row"><span class="ds-spacing-label">--sp-12</span><span class="ds-spacing-value">48px</span><div class="ds-spacing-block" style="width:48px"></div></div>
    <div class="ds-spacing-row"><span class="ds-spacing-label">--sp-16</span><span class="ds-spacing-value">64px</span><div class="ds-spacing-block" style="width:64px"></div></div>
    <div class="ds-spacing-row"><span class="ds-spacing-label">--sp-20</span><span class="ds-spacing-value">80px</span><div class="ds-spacing-block" style="width:80px"></div></div>
    <div class="ds-spacing-row"><span class="ds-spacing-label">--sp-24</span><span class="ds-spacing-value">96px</span><div class="ds-spacing-block" style="width:96px"></div></div>
  </div>
</section>

<!-- ═══ 4. SHADOWS ═══ -->
<section class="ds-section" id="shadows">
  <h2 class="ds-section-title"><span>04.</span> Sombras</h2>
  <p class="ds-section-desc">De sutis a glows dramáticos. Sombras escuras para o dark theme e glows em lime para destaque.</p>

  <div class="ds-showcase">
    <div class="ds-showcase-row">
      <div style="width:120px;height:80px;background:var(--bg-surface);border:1px solid var(--border-subtle);box-shadow:var(--shadow-xs);display:flex;align-items:center;justify-content:center"><span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">shadow-xs</span></div>
      <div style="width:120px;height:80px;background:var(--bg-surface);border:1px solid var(--border-subtle);box-shadow:var(--shadow-sm);display:flex;align-items:center;justify-content:center"><span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">shadow-sm</span></div>
      <div style="width:120px;height:80px;background:var(--bg-surface);border:1px solid var(--border-subtle);box-shadow:var(--shadow-md);display:flex;align-items:center;justify-content:center"><span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">shadow-md</span></div>
      <div style="width:120px;height:80px;background:var(--bg-surface);border:1px solid var(--border-subtle);box-shadow:var(--shadow-lg);display:flex;align-items:center;justify-content:center"><span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">shadow-lg</span></div>
    </div>
    <div class="ds-showcase-row">
      <div style="width:120px;height:80px;background:var(--bg-surface);box-shadow:var(--shadow-glow-sm);display:flex;align-items:center;justify-content:center"><span style="font-family:var(--font-mono);font-size:11px;color:var(--brand-lime)">glow-sm</span></div>
      <div style="width:120px;height:80px;background:var(--bg-surface);box-shadow:var(--shadow-glow-lg);display:flex;align-items:center;justify-content:center"><span style="font-family:var(--font-mono);font-size:11px;color:var(--brand-lime)">glow-lg</span></div>
      <div style="width:120px;height:80px;background:var(--bg-surface);box-shadow:var(--shadow-glow-ring);display:flex;align-items:center;justify-content:center"><span style="font-family:var(--font-mono);font-size:11px;color:var(--brand-lime)">glow-ring</span></div>
    </div>
  </div>
</section>

<!-- ═══ 5. BORDER RADIUS ═══ -->
<section class="ds-section" id="radius">
  <h2 class="ds-section-title"><span>05.</span> Border Radius</h2>
  <p class="ds-section-desc">Landing pages usam <strong>radius 0</strong> (sharp corners) por padrão. O Hub usa escala progressiva.</p>

  <div class="ds-showcase">
    <div class="ds-showcase-row">
      <div style="width:80px;height:60px;background:var(--brand-lime-mid);border:1px solid var(--brand-lime-border);border-radius:0;display:flex;align-items:center;justify-content:center"><span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">0 (LP)</span></div>
      <div style="width:80px;height:60px;background:var(--brand-lime-mid);border:1px solid var(--brand-lime-border);border-radius:3px;display:flex;align-items:center;justify-content:center"><span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">r-xs 3px</span></div>
      <div style="width:80px;height:60px;background:var(--brand-lime-mid);border:1px solid var(--brand-lime-border);border-radius:6px;display:flex;align-items:center;justify-content:center"><span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">r-sm 6px</span></div>
      <div style="width:80px;height:60px;background:var(--brand-lime-mid);border:1px solid var(--brand-lime-border);border-radius:8px;display:flex;align-items:center;justify-content:center"><span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">r-md 8px</span></div>
      <div style="width:80px;height:60px;background:var(--brand-lime-mid);border:1px solid var(--brand-lime-border);border-radius:12px;display:flex;align-items:center;justify-content:center"><span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">r-lg 12px</span></div>
      <div style="width:80px;height:60px;background:var(--brand-lime-mid);border:1px solid var(--brand-lime-border);border-radius:9999px;display:flex;align-items:center;justify-content:center"><span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">r-full</span></div>
    </div>
  </div>
</section>

<!-- ═══ 6. BUTTONS ═══ -->
<section class="ds-section" id="buttons">
  <h2 class="ds-section-title"><span>06.</span> Botões</h2>
  <p class="ds-section-desc">8 variantes + 5 tamanhos. Landing pages usam radius 0. Hero buttons têm glow effect.</p>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Variantes</h3>
    <div class="ds-showcase">
      <div class="ds-showcase-label">Button Variants</div>
      <div class="ds-showcase-row">
        <button class="ds-btn ds-btn-primary ds-btn-md">Primary</button>
        <button class="ds-btn ds-btn-outline ds-btn-md">Outline</button>
        <button class="ds-btn ds-btn-secondary ds-btn-md">Secondary</button>
        <button class="ds-btn ds-btn-ghost ds-btn-md">Ghost</button>
        <button class="ds-btn ds-btn-destructive ds-btn-md">Destructive</button>
      </div>
      <div class="ds-showcase-label" style="margin-top:var(--sp-6)">Hero Variants</div>
      <div class="ds-showcase-row" style="padding:var(--sp-6);background:var(--bg-base)">
        <button class="ds-btn ds-btn-hero ds-btn-lg">FALAR COM ESPECIALISTA</button>
        <button class="ds-btn ds-btn-hero-outline ds-btn-lg">Ver Como Funciona</button>
      </div>
    </div>
  </div>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Tamanhos</h3>
    <div class="ds-showcase">
      <div class="ds-showcase-row" style="align-items:flex-end">
        <button class="ds-btn ds-btn-primary ds-btn-sm">Small (36px)</button>
        <button class="ds-btn ds-btn-primary ds-btn-md">Default (44px)</button>
        <button class="ds-btn ds-btn-primary ds-btn-lg">Large (56px)</button>
        <button class="ds-btn ds-btn-primary ds-btn-xl">XL (64px)</button>
        <button class="ds-btn ds-btn-primary ds-btn-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  </div>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Token Reference</h3>
    <table class="ds-token-table">
      <thead><tr><th>Variant</th><th>Background</th><th>Text</th><th>Hover</th><th>Uso</th></tr></thead>
      <tbody>
        <tr><td>primary</td><td class="token-var">--brand-lime</td><td>--text-on-accent</td><td>Darken + glow-sm</td><td>CTAs principais</td></tr>
        <tr><td>outline</td><td>transparent</td><td class="token-var">--brand-lime</td><td>Fill primary</td><td>CTAs secundários</td></tr>
        <tr><td>secondary</td><td>--bg-muted</td><td>--text-primary</td><td>Lighten bg</td><td>Ações terciárias</td></tr>
        <tr><td>ghost</td><td>transparent</td><td>--text-secondary</td><td>--bg-muted</td><td>Estilo minimal</td></tr>
        <tr><td>destructive</td><td>--danger</td><td>white</td><td>Darken red</td><td>Ações perigosas</td></tr>
        <tr><td>hero</td><td class="token-var">--brand-lime</td><td>--text-on-accent</td><td>glow-sm → glow-lg</td><td>CTAs hero section</td></tr>
        <tr><td>hero-outline</td><td>transparent</td><td>--text-primary</td><td>border lime</td><td>CTA hero secundário</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- ═══ 7. INPUTS ═══ -->
<section class="ds-section" id="inputs">
  <h2 class="ds-section-title"><span>07.</span> Inputs</h2>
  <p class="ds-section-desc">Campos de formulário com altura de 48px, bordas de 2px, e focus state com a cor primary (lime).</p>

  <div class="ds-showcase">
    <div class="ds-showcase-label">Input States</div>
    <div style="display:grid;gap:var(--sp-6);max-width:400px">
      <div>
        <label class="ds-label">Default</label>
        <input class="ds-input" placeholder="Seu nome" />
      </div>
      <div>
        <label class="ds-label">Focused (clique)</label>
        <input class="ds-input" placeholder="seu@email.com" />
      </div>
      <div>
        <label class="ds-label">Disabled</label>
        <input class="ds-input" placeholder="Campo desativado" disabled />
      </div>
    </div>
  </div>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Input Tokens</h3>
    <table class="ds-token-table">
      <thead><tr><th>Propriedade</th><th>Valor</th><th>Token</th></tr></thead>
      <tbody>
        <tr><td>Height</td><td>48px (h-12)</td><td class="token-var">-</td></tr>
        <tr><td>Border</td><td>2px solid</td><td class="token-var">--border-base</td></tr>
        <tr><td>Background</td><td>Dark muted</td><td class="token-var">--bg-muted</td></tr>
        <tr><td>Font Size</td><td>1rem (16px)</td><td class="token-var">--ts-base</td></tr>
        <tr><td>Focus Border</td><td>Lime green</td><td class="token-var">--brand-lime</td></tr>
        <tr><td>Transition</td><td>200ms</td><td class="token-var">--ease-base</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- ═══ 8. CARDS ═══ -->
<section class="ds-section" id="cards">
  <h2 class="ds-section-title"><span>08.</span> Cards</h2>
  <p class="ds-section-desc">3 estilos de card: padrão, gradient border e com glow effect.</p>

  <div class="ds-showcase">
    <div class="ds-showcase-label">Card Variants</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sp-4)">
      <div class="ds-card">
        <div class="ds-card-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div class="ds-card-title">Card Padrão</div>
        <div class="ds-card-desc">Border sutil com hover accent. Usado para grids de serviços.</div>
      </div>
      <div class="ds-card ds-card-gradient">
        <div class="ds-card-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <div class="ds-card-title">Gradient Border</div>
        <div class="ds-card-desc">Borda gradiente de lime para transparente. Visual premium.</div>
      </div>
      <div class="ds-card ds-card-glow">
        <div class="ds-card-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v1m0 16v1m-8-9H3m18 0h-1m-2.636-6.364-.707.707M6.343 17.657l-.707.707m0-12.728.707.707m11.314 11.314.707.707"/><circle cx="12" cy="12" r="4"/></svg>
        </div>
        <div class="ds-card-title">Card com Glow</div>
        <div class="ds-card-desc">Glow de lime no hover. Para cards de feature e destaque.</div>
      </div>
    </div>
  </div>
</section>

<!-- ═══ 9. BADGES ═══ -->
<section class="ds-section" id="badges">
  <h2 class="ds-section-title"><span>09.</span> Badges</h2>
  <p class="ds-section-desc">Labels de status, categorias e tags. Uppercase, tracking wide, font-size 11px.</p>

  <div class="ds-showcase">
    <div class="ds-showcase-row">
      <span class="ds-badge">Default</span>
      <span class="ds-badge ds-badge-lime">Lime / Active</span>
      <span class="ds-badge ds-badge-success">Success</span>
      <span class="ds-badge ds-badge-warning">Warning</span>
      <span class="ds-badge ds-badge-danger">Danger</span>
    </div>
    <div class="ds-showcase-row" style="margin-top:var(--sp-4)">
      <span class="ds-badge ds-badge-lime"><span class="dot" style="width:6px;height:6px;background:var(--brand-lime);border-radius:50%;animation:pulse 2s infinite"></span> Online</span>
      <span class="ds-badge">Hub de Soluções</span>
      <span class="ds-badge ds-badge-lime">v1.0.0</span>
    </div>
  </div>
</section>

<!-- ═══ 10. EFFECTS ═══ -->
<section class="ds-section" id="effects">
  <h2 class="ds-section-title"><span>10.</span> Efeitos</h2>
  <p class="ds-section-desc">Utilitários visuais: gradiente de texto, glow, borda gradiente, backdrop blur.</p>

  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--sp-4)">
    <div class="ds-effect-box">
      <div class="ds-text-gradient">Text Gradient</div>
      <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">Lime → Lime/70</span>
    </div>
    <div class="ds-effect-box" style="box-shadow:var(--shadow-glow-lg)">
      <div style="font-weight:700;font-size:var(--ts-xl);color:var(--brand-lime)">Glow Effect</div>
      <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">box-shadow: 0 0 60px lime/30%</span>
    </div>
    <div class="ds-effect-box ds-card-gradient">
      <div style="font-weight:700;font-size:var(--ts-xl)">Gradient Border</div>
      <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">135deg lime → transparent</span>
    </div>
    <div class="ds-effect-box" style="background:rgba(3,3,3,0.6);backdrop-filter:blur(12px)">
      <div style="font-weight:700;font-size:var(--ts-xl)">Backdrop Blur</div>
      <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">backdrop-filter: blur(12px)</span>
    </div>
  </div>
</section>

<!-- ═══ 11. ANIMATIONS ═══ -->
<section class="ds-section" id="animations">
  <h2 class="ds-section-title"><span>11.</span> Animações</h2>
  <p class="ds-section-desc">Animações de entrada e interação. Clique nos cards para ver replay.</p>

  <div class="ds-anim-grid">
    <div class="ds-anim-card" onclick="replayAnim(this,'play-fade-in')">
      <div class="ds-anim-demo play-fade-in"></div>
      <div class="ds-anim-name">fade-in</div>
      <div class="ds-anim-timing">0.6s ease-out · Y: 20px → 0</div>
    </div>
    <div class="ds-anim-card" onclick="replayAnim(this,'play-slide-left')">
      <div class="ds-anim-demo play-slide-left"></div>
      <div class="ds-anim-name">slide-in-left</div>
      <div class="ds-anim-timing">0.6s ease-out · X: -30px → 0</div>
    </div>
    <div class="ds-anim-card" onclick="replayAnim(this,'play-slide-right')">
      <div class="ds-anim-demo play-slide-right"></div>
      <div class="ds-anim-name">slide-in-right</div>
      <div class="ds-anim-timing">0.6s ease-out · X: 30px → 0</div>
    </div>
    <div class="ds-anim-card" onclick="replayAnim(this,'play-scale-in')">
      <div class="ds-anim-demo play-scale-in"></div>
      <div class="ds-anim-name">scale-in</div>
      <div class="ds-anim-timing">0.4s ease-out · 0.95 → 1</div>
    </div>
    <div class="ds-anim-card">
      <div class="ds-anim-demo play-pulse"></div>
      <div class="ds-anim-name">pulse</div>
      <div class="ds-anim-timing">2s infinite · Opacity: 1 → 0.4</div>
    </div>
    <div class="ds-anim-card">
      <div class="ds-anim-demo play-bounce"></div>
      <div class="ds-anim-name">bounce</div>
      <div class="ds-anim-timing">1s infinite · Scroll indicator</div>
    </div>
  </div>

  <div class="ds-subsection" style="margin-top:var(--sp-8)">
    <h3 class="ds-subsection-title">Framer Motion Patterns</h3>
    <div class="ds-code"><span class="comment">// Padrão de entrada — usado em todas as sections</span>
<span class="key">initial</span>={{ opacity: <span class="val">0</span>, y: <span class="val">20</span> }}
<span class="key">whileInView</span>={{ opacity: <span class="val">1</span>, y: <span class="val">0</span> }}
<span class="key">viewport</span>={{ once: <span class="val">true</span> }}
<span class="key">transition</span>={{ duration: <span class="val">0.5</span>, delay: index * <span class="val">0.1</span> }}

<span class="comment">// Stagger em grids — atraso incremental</span>
<span class="key">transition</span>={{ duration: <span class="val">0.4</span>, delay: index * <span class="val">0.05</span> }}

<span class="comment">// Hover com scale — ícones e cards</span>
<span class="key">className</span>="group-hover:<span class="val">scale-110</span> transition-transform duration-<span class="val">300</span>"

<span class="comment">// Scroll indicator — bounce infinito</span>
<span class="key">animate</span>={{ y: [<span class="val">0</span>, <span class="val">10</span>, <span class="val">0</span>] }}
<span class="key">transition</span>={{ duration: <span class="val">2</span>, repeat: <span class="val">Infinity</span> }}</div>
  </div>
</section>

<!-- ═══ 12. LAYOUT PATTERNS ═══ -->
<section class="ds-section" id="layout-patterns">
  <h2 class="ds-section-title"><span>12.</span> Layout Patterns</h2>
  <p class="ds-section-desc">Padrões de container, grid e seções usados em toda a landing page.</p>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Container</h3>
    <table class="ds-token-table">
      <thead><tr><th>Classe</th><th>Max Width</th><th>Padding</th><th>Uso</th></tr></thead>
      <tbody>
        <tr><td class="token-var">.container-narrow</td><td>1152px (max-w-6xl)</td><td>0 (usa section-padding)</td><td>Conteúdo principal</td></tr>
        <tr><td class="token-var">.section-padding</td><td>-</td><td>px: 16-32px · py: 64-96px</td><td>Seções da página</td></tr>
        <tr><td class="token-var">.container (Tailwind)</td><td>1400px (2xl)</td><td>2rem (32px)</td><td>Container alternativo</td></tr>
      </tbody>
    </table>
  </div>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Grid Patterns</h3>
    <div class="ds-showcase">
      <div class="ds-showcase-label">3-Column Grid (Services)</div>
      <div class="ds-grid-demo" style="grid-template-columns:repeat(3,1fr)">
        <div class="ds-grid-demo-item">Col 1</div>
        <div class="ds-grid-demo-item">Col 2</div>
        <div class="ds-grid-demo-item">Col 3</div>
      </div>
      <div class="ds-showcase-label">2-Column Grid (Comparison)</div>
      <div class="ds-grid-demo" style="grid-template-columns:repeat(2,1fr)">
        <div class="ds-grid-demo-item">Antes</div>
        <div class="ds-grid-demo-item">Depois</div>
      </div>
    </div>
  </div>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Responsive Breakpoints</h3>
    <table class="ds-token-table">
      <thead><tr><th>Breakpoint</th><th>Width</th><th>Colunas Grid</th><th>Text Scale</th></tr></thead>
      <tbody>
        <tr><td class="token-var">mobile</td><td>&lt; 640px</td><td>1 coluna</td><td>text-4xl (hero)</td></tr>
        <tr><td class="token-var">sm (640px)</td><td>640px</td><td>2 ou 3 colunas</td><td>text-5xl</td></tr>
        <tr><td class="token-var">md (768px)</td><td>768px</td><td>2 colunas</td><td>text-6xl</td></tr>
        <tr><td class="token-var">lg (1024px)</td><td>1024px</td><td>3 colunas</td><td>text-7xl (hero max)</td></tr>
        <tr><td class="token-var">xl (1280px)</td><td>1280px</td><td>3-4 colunas</td><td>-</td></tr>
        <tr><td class="token-var">2xl (1400px)</td><td>1400px</td><td>Container max</td><td>-</td></tr>
      </tbody>
    </table>
  </div>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Section Pattern</h3>
    <div class="ds-code"><span class="comment">// Padrão de seção — usado em TODAS as sections da LP</span>

&lt;<span class="key">section</span> className="<span class="val">section-padding</span>"&gt;
  &lt;<span class="key">div</span> className="<span class="val">container-narrow</span>"&gt;

    <span class="comment">{/* Header */}</span>
    &lt;<span class="key">span</span> className="text-primary font-bold text-sm uppercase tracking-wider"&gt;
      Subtag
    &lt;/<span class="key">span</span>&gt;

    &lt;<span class="key">h2</span> className="text-3xl sm:text-4xl md:text-5xl font-extrabold"&gt;
      Título com &lt;span className="<span class="val">text-primary</span>"&gt;Destaque&lt;/span&gt;
    &lt;/<span class="key">h2</span>&gt;

    &lt;<span class="key">p</span> className="text-lg <span class="val">text-muted-foreground</span> max-w-2xl mx-auto"&gt;
      Descrição da seção
    &lt;/<span class="key">p</span>&gt;

    <span class="comment">{/* Content grid */}</span>
    &lt;<span class="key">div</span> className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"&gt;
      ...cards
    &lt;/<span class="key">div</span>&gt;

  &lt;/<span class="key">div</span>&gt;
&lt;/<span class="key">section</span>&gt;</div>
  </div>
</section>

<!-- ═══ 13. COMO USAR ═══ -->
<section class="ds-section" id="usage">
  <h2 class="ds-section-title"><span>13.</span> Como Usar</h2>
  <p class="ds-section-desc">Guia rápido para aplicar o Design System em novos materiais.</p>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">CSS Variables (Copy & Paste)</h3>
    <div class="ds-code"><span class="comment">/* Cole no :root do seu projeto para herdar todo o tema */</span>

<span class="key">:root</span> {
  <span class="comment">/* Brand */</span>
  --primary:        <span class="val">hsl(78, 100%, 69%)</span>;       <span class="comment">/* Lime */</span>
  --primary-fg:     <span class="val">hsl(0, 0%, 1%)</span>;           <span class="comment">/* Dark text on lime */</span>
  --secondary:      <span class="val">hsl(200, 6%, 58%)</span>;        <span class="comment">/* Morning Blue */</span>

  <span class="comment">/* Backgrounds */</span>
  --background:     <span class="val">#030303</span>;
  --surface:        <span class="val">#0a0a0a</span>;
  --elevated:       <span class="val">#101013</span>;
  --muted:          <span class="val">hsl(0, 0%, 12%)</span>;

  <span class="comment">/* Text */</span>
  --text-primary:   <span class="val">hsl(0, 0%, 89%)</span>;           <span class="comment">/* Platinum */</span>
  --text-secondary: <span class="val">hsl(200, 6%, 58%)</span>;         <span class="comment">/* Morning Blue */</span>

  <span class="comment">/* Borders */</span>
  --border:         <span class="val">hsl(0, 0%, 18%)</span>;

  <span class="comment">/* Typography */</span>
  --font-brand:     <span class="val">'Nunito Sans', sans-serif</span>;
  --font-display:   <span class="val">'Space Grotesk', sans-serif</span>;
  --font-body:      <span class="val">'Inter', system-ui, sans-serif</span>;

  <span class="comment">/* Radius */</span>
  --radius:         <span class="val">0</span>;  <span class="comment">/* Sharp corners = identidade Syra */</span>
}</div>
  </div>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Tailwind Config (para projetos React)</h3>
    <div class="ds-code"><span class="comment">// tailwind.config.ts — extend colors from CSS vars</span>

<span class="key">colors</span>: {
  primary: { DEFAULT: "<span class="val">hsl(var(--primary))</span>", foreground: "..." },
  background: "<span class="val">hsl(var(--background))</span>",
  foreground: "<span class="val">hsl(var(--foreground))</span>",
  muted: { DEFAULT: "<span class="val">hsl(var(--muted))</span>", foreground: "..." },
  lime: "<span class="val">hsl(var(--lime))</span>",
  platinum: "<span class="val">hsl(var(--platinum))</span>",
  "rich-black": "<span class="val">hsl(var(--rich-black))</span>",
  "morning-blue": "<span class="val">hsl(var(--morning-blue))</span>",
},
<span class="key">fontFamily</span>: {
  nunito: ["<span class="val">Nunito Sans</span>", "sans-serif"],
},
<span class="key">borderRadius</span>: {
  lg: "<span class="val">var(--radius)</span>", <span class="comment">// 0 = sharp by default</span>
}</div>
  </div>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Google Fonts (import)</h3>
    <div class="ds-code"><span class="comment">&lt;!-- HTML --&gt;</span>
&lt;link href="<span class="val">https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap</span>" rel="stylesheet"&gt;

<span class="comment">/* CSS */</span>
@import url('<span class="val">https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;500;600;700;800&display=swap</span>');</div>
  </div>

  <div class="ds-subsection">
    <h3 class="ds-subsection-title">Regras de Ouro</h3>
    <div style="display:grid;gap:var(--sp-3)">
      <div class="ds-card" style="display:flex;gap:var(--sp-4);align-items:center">
        <span style="font-size:24px;color:var(--brand-lime)">1</span>
        <div><strong>Radius 0 é identidade.</strong> Landing pages sempre usam sharp corners. No Hub, use a escala progressiva.</div>
      </div>
      <div class="ds-card" style="display:flex;gap:var(--sp-4);align-items:center">
        <span style="font-size:24px;color:var(--brand-lime)">2</span>
        <div><strong>Lime é acento, nunca background.</strong> Use para CTAs, destaques, ícones e badges. Nunca como background de seção.</div>
      </div>
      <div class="ds-card" style="display:flex;gap:var(--sp-4);align-items:center">
        <span style="font-size:24px;color:var(--brand-lime)">3</span>
        <div><strong>Texto muted para corpo, primary para destaques.</strong> Use Morning Blue (secondary) para corpo de texto e Platinum para títulos.</div>
      </div>
      <div class="ds-card" style="display:flex;gap:var(--sp-4);align-items:center">
        <span style="font-size:24px;color:var(--brand-lime)">4</span>
        <div><strong>Glow effect apenas em CTAs hero.</strong> Não use glow em botões pequenos ou cards internos.</div>
      </div>
      <div class="ds-card" style="display:flex;gap:var(--sp-4);align-items:center">
        <span style="font-size:24px;color:var(--brand-lime)">5</span>
        <div><strong>Animações com viewport once.</strong> Toda animação de entrada dispara uma vez. Use stagger de 0.05-0.1s por item.</div>
      </div>
    </div>
  </div>
</section>

</main>
</div> <!-- /ds-layout -->

<!-- ═══ FOOTER ═══ -->
<div style="text-align:center;padding:var(--sp-10) 0 var(--sp-6);border-top:1px solid var(--border-subtle);margin-top:var(--sp-16)">
  <div style="font-family:var(--font-display);font-size:var(--ts-xl);font-weight:700;margin-bottom:var(--sp-2)">
    <span style="color:var(--brand-lime)">Syra</span> Digital
  </div>
  <div style="color:var(--text-muted);font-size:var(--ts-sm)">
    Design System v1.0.0 · Extraído de Impact Clinic Growth · \${new Date().getFullYear()}
  </div>
</div>

</div> <!-- /ds-container -->

<script>
function copyColor(val) {
  navigator.clipboard.writeText(val).then(() => {
    const toast = document.createElement('div');
    toast.textContent = 'Copiado: ' + val;
    toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:var(--brand-lime-hex,#C8FF00);color:#000;padding:8px 16px;font-family:var(--font-mono);font-size:13px;font-weight:600;z-index:9999;animation:ds-fade-in 0.3s ease-out';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  });
}

function replayAnim(card, cls) {
  const demo = card.querySelector('.ds-anim-demo');
  demo.classList.remove(cls);
  void demo.offsetWidth;
  demo.classList.add(cls);
}

// Highlight active nav on scroll
const sections = document.querySelectorAll('.ds-section');
const navLinks = document.querySelectorAll('.ds-nav a');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.style.color = '';
        link.style.borderLeftColor = 'transparent';
        link.style.background = '';
      });
      const active = document.querySelector('.ds-nav a[href="#' + entry.target.id + '"]');
      if (active) {
        active.style.color = 'var(--text-primary)';
        active.style.borderLeftColor = 'var(--brand-lime)';
        active.style.background = 'var(--brand-lime-dim)';
      }
    }
  });
}, { threshold: 0.2, rootMargin: '-80px 0px -60% 0px' });

sections.forEach(s => observer.observe(s));
</script>
</body>
</html>`;
}

// ============================================================
// Prospecting Dashboard — route + API
// ============================================================

app.get('/prospecting', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'prospecting-dashboard.html'));
});

// Pipeline overview (stage counts)
app.get('/api/prospecting/pipeline', (req, res) => {
  try {
    const counts = prospectingDb.getProspectCountByStage();
    const stages = prospectingScripts.PIPELINE_STAGES.map(s => {
      const found = counts.find(c => c.stage === s.id);
      return { ...s, count: found ? found.count : 0 };
    });
    res.json({ stages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List prospects with filters
app.get('/api/prospecting/prospects', (req, res) => {
  try {
    const { stage, procedure, status, search, limit } = req.query;
    const prospects = prospectingDb.getProspects({
      stage, procedure, status: status || 'open', search,
      limit: limit ? parseInt(limit) : undefined,
    });
    res.json({ prospects: prospects.map(p => ({ ...p, tags: JSON.parse(p.tags || '[]') })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Prospect detail with timeline
app.get('/api/prospecting/prospect/:id', (req, res) => {
  try {
    const prospect = prospectingDb.getProspectById(req.params.id);
    if (!prospect) return res.status(404).json({ error: 'Prospect not found' });
    const transitions = prospectingDb.getTransitions(req.params.id);
    const messages = prospectingDb.getMessageUsage(req.params.id);
    const notes = prospectingDb.getNotes(req.params.id);
    res.json({
      ...prospect,
      tags: JSON.parse(prospect.tags || '[]'),
      transitions, messages, notes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// KPIs and conversion rates
app.get('/api/prospecting/metrics', (req, res) => {
  try {
    const metrics = prospectingDb.getMetrics();
    res.json({ metrics, targets: prospectingScripts.METRICS_TARGETS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Scripts for copy-paste
app.get('/api/prospecting/scripts', (req, res) => {
  try {
    res.json({
      stages: prospectingScripts.SCRIPTS_BY_STAGE,
      procedures: prospectingScripts.PROCEDURES,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Weekly goals
app.get('/api/prospecting/goals', (req, res) => {
  try {
    const current = prospectingDb.getCurrentWeekGoals();
    const weekStart = prospectingDb.getWeekStart();
    prospectingDb.updateWeeklyActuals(weekStart);
    const updated = prospectingDb.getCurrentWeekGoals();
    const history = prospectingDb.getWeeklyGoalsHistory(8);
    res.json({ current: updated, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set weekly goals
app.post('/api/prospecting/goals', (req, res) => {
  try {
    const { prospects, dms, calls, proposals } = req.body;
    const weekStart = prospectingDb.getWeekStart();
    prospectingDb.upsertWeeklyGoal(weekStart, { prospects, dms, calls, proposals });
    const updated = prospectingDb.getCurrentWeekGoals();
    res.json({ ok: true, goals: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Advance prospect stage
app.post('/api/prospecting/prospect/:id/advance', (req, res) => {
  try {
    const { stage } = req.body;
    if (!stage) return res.status(400).json({ error: 'stage required' });
    const result = prospectingDb.advanceProspect(req.params.id, stage);
    if (!result) return res.status(404).json({ error: 'Prospect not found' });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add note to prospect
app.post('/api/prospecting/prospect/:id/note', (req, res) => {
  try {
    const { note, author } = req.body;
    if (!note) return res.status(400).json({ error: 'note required' });
    prospectingDb.addNote(req.params.id, note, author);
    const notes = prospectingDb.getNotes(req.params.id);
    res.json({ ok: true, notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record script usage
app.post('/api/prospecting/message-used', (req, res) => {
  try {
    const { prospectId, scriptId, stage } = req.body;
    if (!prospectId || !scriptId) return res.status(400).json({ error: 'prospectId and scriptId required' });
    prospectingDb.recordMessageUsage(prospectId, scriptId, stage);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync from GHL pipeline
app.post('/api/prospecting/sync', async (req, res) => {
  try {
    const synced = await syncProspectingFromGHL();
    res.json({ ok: true, ...synced });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function syncProspectingFromGHL() {
  const GhlCrm = require('./lib/ghl-crm');
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId) return { synced: 0, error: 'GHL_LOCATION_ID not set' };

  const ghl = new GhlCrm(locationId);
  const pipelines = await ghl.getPipelines();

  // Find the prospecting pipeline (contains "prospec" in name) or use first one
  const prospPipeline = pipelines.find(p => /prospec/i.test(p.name)) || pipelines[0];
  if (!prospPipeline) return { synced: 0, error: 'No pipeline found' };

  const opportunities = await ghl.searchOpportunities({
    pipelineId: prospPipeline.id,
    status: 'open',
    limit: 100,
  });

  // Build stage name → our stage ID mapping
  const ghlStageMap = {};
  if (prospPipeline.stages) {
    for (const s of prospPipeline.stages) {
      const name = (s.name || '').toLowerCase();
      if (name.includes('qualificad')) ghlStageMap[s.id] = 'qualified';
      else if (name.includes('aquec')) ghlStageMap[s.id] = 'warming';
      else if (name.includes('dm') && name.includes('envia')) ghlStageMap[s.id] = 'dm_sent';
      else if (name.includes('convers')) ghlStageMap[s.id] = 'in_conversation';
      else if (name.includes('pitch')) ghlStageMap[s.id] = 'pitch_done';
      else if (name.includes('call') || name.includes('agenda')) ghlStageMap[s.id] = 'call_scheduled';
      else if (name.includes('proposta')) ghlStageMap[s.id] = 'proposal_sent';
      else if (name.includes('ganh') || name.includes('won')) ghlStageMap[s.id] = 'won';
      else if (name.includes('sem resp') || name.includes('no resp')) ghlStageMap[s.id] = 'no_response';
      else if (name.includes('perdid') || name.includes('lost')) ghlStageMap[s.id] = 'lost';
      else ghlStageMap[s.id] = 'qualified';
    }
  }

  let synced = 0;
  for (const opp of opportunities) {
    const stage = ghlStageMap[opp.pipelineStageId] || 'qualified';
    const tags = Array.isArray(opp.contact?.tags) ? opp.contact.tags : [];

    // Check if prospect exists to detect stage change
    const existing = prospectingDb.getProspectById(opp.id);
    if (existing && existing.stage !== stage) {
      prospectingDb.advanceProspect(opp.id, stage);
    }

    prospectingDb.upsertProspect({
      id: opp.id,
      ghl_contact_id: opp.contact?.id || null,
      ghl_opportunity_id: opp.id,
      name: opp.contact?.name || opp.name || 'Sem nome',
      instagram: opp.contact?.instagram || null,
      followers: opp.contact?.followers || 0,
      procedure_type: opp.contact?.customFields?.find(f => /procedimento/i.test(f.name))?.value || null,
      stage,
      tags,
      status: 'open',
      monetary_value: opp.monetaryValue || 0,
      source: 'ghl',
    });
    synced++;
  }

  // Also sync won/lost
  for (const status of ['won', 'lost']) {
    const closed = await ghl.searchOpportunities({
      pipelineId: prospPipeline.id,
      status,
      limit: 50,
    });
    for (const opp of closed) {
      const stage = status === 'won' ? 'won' : 'lost';
      prospectingDb.upsertProspect({
        id: opp.id,
        ghl_contact_id: opp.contact?.id || null,
        ghl_opportunity_id: opp.id,
        name: opp.contact?.name || opp.name || 'Sem nome',
        instagram: opp.contact?.instagram || null,
        followers: 0,
        procedure_type: null,
        stage,
        tags: Array.isArray(opp.contact?.tags) ? opp.contact.tags : [],
        status,
        monetary_value: opp.monetaryValue || 0,
        source: 'ghl',
      });
      synced++;
    }
  }

  console.log(`[prospecting-sync] Synced ${synced} prospects from GHL pipeline "${prospPipeline.name}"`);
  return { synced, pipeline: prospPipeline.name };
}

// ============================================================
// Auto-sync CRM + conversations every 30 minutes
// ============================================================
async function autoSyncAll() {
  try {
    // 1. Sync GHL (CRM + conversations)
    const GhlSyncer = require('./lib/ghl-syncer');
    const syncer = new GhlSyncer();
    const ghlResults = await syncer.syncAllClients();
    const ghlSummary = [];
    for (const [clientId, result] of ghlResults) {
      ghlSummary.push(`${clientId}: ${result.opportunities || 0} opps, ${result.conversations || 0} convs, ${result.messages || 0} msgs`);
    }
    console.log(`[auto-sync] GHL: ${ghlSummary.join(' | ')}`);

    // 2. Sync Meta Ads
    const AdsSyncer = require('./lib/ads-syncer');
    const adsSyncer = new AdsSyncer();
    const adsResults = await adsSyncer.syncAllClients();
    const adsSummary = [];
    for (const [clientId, result] of adsResults) {
      adsSummary.push(`${clientId}: ${result.campaigns || 0} camps, ${result.ads || 0} ads`);
    }
    console.log(`[auto-sync] Ads: ${adsSummary.join(' | ')}`);
  } catch (err) {
    console.error('[auto-sync] Error:', err.message);
  }
}

// ============================================================
// Auto-recalculate lead scores every 15 minutes
// ============================================================
function autoRecalculateLeadScores() {
  try {
    const celoConfigPath = path.resolve(__dirname, 'data', 'celo-clients.json');
    const celoConfig = JSON.parse(fs.readFileSync(celoConfigPath, 'utf8'));
    const leadScorer = require('./lib/lead-scorer');
    const clientIds = Object.keys(celoConfig.clients || {});
    let totalScored = 0;

    for (const clientId of clientIds) {
      try {
        const result = leadScorer.scoreAllLeads(clientId);
        totalScored += result.leads.length;
      } catch (e) {
        console.warn(`[lead-scoring] Skip ${clientId}: ${e.message}`);
      }
    }

    console.log(`[lead-scoring] Auto-recalculated: ${totalScored} leads across ${clientIds.length} clients`);
  } catch (err) {
    console.error('[lead-scoring] Auto-recalculate error:', err.message);
  }
}

// ============================================================
// Form: SDR Dr. Cleugo Porto
// ============================================================
app.get('/form/sdr-cleugo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'form-sdr-cleugo.html'));
});
app.get('/contratacoes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'form-sdr-cleugo.html'));
});

const formSheets = require('./lib/form-sheets');

app.post('/api/form/sdr-cleugo', async (req, res) => {
  try {
    const data = req.body || {};
    data._submitted_at = data._submitted_at || new Date().toISOString();
    data._ip = req.ip;

    // Save JSON backup
    const candidatosDir = path.join(__dirname, '..', 'docs', 'clientes', 'dr-cleugo', 'candidatos');
    if (!fs.existsSync(candidatosDir)) fs.mkdirSync(candidatosDir, { recursive: true });
    const safeName = (data.nome || 'anonimo').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().slice(0, 40);
    const filename = `${safeName}-${Date.now()}.json`;
    fs.writeFileSync(path.join(candidatosDir, filename), JSON.stringify(data, null, 2), 'utf8');

    // Write to Google Sheets
    await formSheets.appendFormData(data);

    console.log(`[form-sdr] Nova candidatura: ${data.nome || 'anonimo'} (${data.email || 'no-email'}) → Sheets + JSON`);
    res.json({ ok: true, id: filename });
  } catch (err) {
    console.error('[form-sdr] Error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[hub] Syra Digital Hub → http://localhost:${PORT}`);

  // Sync CRM + conversations: first after 30s, then every 30 min
  setTimeout(autoSyncAll, 30000);
  setInterval(autoSyncAll, 30 * 60 * 1000);

  // Recalculate scores: first after 60s (after sync), then every 15 min
  setTimeout(autoRecalculateLeadScores, 60000);
  setInterval(autoRecalculateLeadScores, 15 * 60 * 1000);

  // Sync prospecting pipeline: first after 45s, then every 10 min
  setTimeout(() => { syncProspectingFromGHL().catch(e => console.warn('[prospecting-sync]', e.message)); }, 45000);
  setInterval(() => { syncProspectingFromGHL().catch(e => console.warn('[prospecting-sync]', e.message)); }, 10 * 60 * 1000);
});
