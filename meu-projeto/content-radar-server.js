// meu-projeto/content-radar-server.js
// Content Radar Server — Port 3008
// Monitora conteudo trending via 3 motores + notifica Eric via Telegram
//
// Env: APIFY_API_TOKEN, EXA_API_KEY, ANTHROPIC_API_KEY, SWIPE_BOT_TOKEN

const path = require('path');
const fs = require('fs');

// Load env
if (process.env.NODE_ENV !== 'production') {
  const localEnv = path.resolve(__dirname, '.env');
  const parentEnv = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(parentEnv)) require('dotenv').config({ path: parentEnv });
  if (fs.existsSync(localEnv)) require('dotenv').config({ path: localEnv, override: true });
}

const express = require('express');
const cron = require('node-cron');
const { watchProfiles, scanNicheTopics, scanTrending, scanAll, loadConfig, radarDB, CHAT_ID, botSend } = require('./lib/content-radar');
const radarDBMod = require('./lib/content-radar-db');

const PORT = process.env.CONTENT_RADAR_PORT || 3008;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// Initialize DB + sync profiles from config
// ============================================================

radarDBMod.initDB();

function syncProfilesFromConfig() {
  const config = loadConfig();
  for (const p of config.profiles) {
    radarDBMod.upsertProfile(p.username, p.category);
  }
  console.log(`[radar] ${config.profiles.length} perfis sincronizados do config`);
}

syncProfilesFromConfig();

// ============================================================
// Cron Jobs
// ============================================================

const config = loadConfig();
const schedule = config.schedule || {};

// Profile Watcher — default 8h e 18h
if (schedule.profile_watcher) {
  cron.schedule(schedule.profile_watcher, async () => {
    console.log('[radar] CRON: Profile Watcher disparado');
    try {
      await watchProfiles();
    } catch (err) {
      console.error('[radar] CRON Profile Watcher error:', err.message);
    }
  });
  console.log(`[radar] Cron Profile Watcher: ${schedule.profile_watcher}`);
}

// Niche Scanner — default 10h
if (schedule.niche_scanner) {
  cron.schedule(schedule.niche_scanner, async () => {
    console.log('[radar] CRON: Niche Scanner disparado');
    try {
      await scanNicheTopics();
    } catch (err) {
      console.error('[radar] CRON Niche Scanner error:', err.message);
    }
  });
  console.log(`[radar] Cron Niche Scanner: ${schedule.niche_scanner}`);
}

// Trending Radar — default 12h
if (schedule.trending_radar) {
  cron.schedule(schedule.trending_radar, async () => {
    console.log('[radar] CRON: Trending Radar disparado');
    try {
      await scanTrending();
    } catch (err) {
      console.error('[radar] CRON Trending Radar error:', err.message);
    }
  });
  console.log(`[radar] Cron Trending Radar: ${schedule.trending_radar}`);
}

// ============================================================
// API Endpoints
// ============================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'content-radar', port: PORT });
});

// Listar items recentes
app.get('/api/radar/items', (req, res) => {
  const { status, source, limit } = req.query;
  let items;
  if (status) {
    items = radarDBMod.getItemsByStatus(status, parseInt(limit) || 50);
  } else {
    items = radarDBMod.getRecentItems(parseInt(limit) || 100);
  }
  if (source) {
    items = items.filter(i => i.source === source);
  }
  res.json({ items, count: items.length });
});

// Buscar item especifico
app.get('/api/radar/items/:id', (req, res) => {
  const item = radarDBMod.getItem(parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item nao encontrado' });
  res.json(item);
});

// Atualizar status de item
app.patch('/api/radar/items/:id', (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status obrigatorio' });
  radarDBMod.updateItemStatus(parseInt(req.params.id), status);
  res.json({ ok: true });
});

// Scan manual — executar motor especifico
app.post('/api/radar/scan-now', async (req, res) => {
  const { motor } = req.body; // 'profiles' | 'niche' | 'trending' | 'all'
  console.log(`[radar] Scan manual solicitado: ${motor || 'all'}`);

  try {
    let result;
    switch (motor) {
      case 'profiles':
        result = await watchProfiles();
        break;
      case 'niche':
        result = await scanNicheTopics();
        break;
      case 'trending':
        result = await scanTrending();
        break;
      default:
        result = await scanAll();
    }
    res.json({ ok: true, result });
  } catch (err) {
    console.error('[radar] Scan manual error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Stats
app.get('/api/radar/stats', (req, res) => {
  const items = radarDBMod.getItemStats();
  const daily = radarDBMod.getDailyStats(7);
  const profiles = radarDBMod.getActiveProfiles();
  res.json({ items, daily, profiles });
});

// Config — ler
app.get('/api/radar/config', (req, res) => {
  res.json(loadConfig());
});

// Config — atualizar
app.put('/api/radar/config', (req, res) => {
  const configPath = path.resolve(__dirname, 'data/content-radar-config.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(req.body, null, 2));
    syncProfilesFromConfig();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Adicionar perfil
app.post('/api/radar/profiles', (req, res) => {
  const { username, category } = req.body;
  if (!username) return res.status(400).json({ error: 'Username obrigatorio' });

  // Adicionar ao config
  const config = loadConfig();
  if (!config.profiles.find(p => p.username === username)) {
    config.profiles.push({ username, category: category || 'geral' });
    const configPath = path.resolve(__dirname, 'data/content-radar-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
  radarDBMod.upsertProfile(username, category || 'geral');
  res.json({ ok: true });
});

// Dashboard HTML
app.get('/content-radar', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'content-radar.html'));
});

// ============================================================
// Telegram Callback Handler (para botoes inline do radar)
// ============================================================

// O swipe-collector.js vai encaminhar callbacks com prefixo "radar:" para ca
// Mas tambem podemos receber via webhook direto se necessario
app.post('/api/radar/callback', async (req, res) => {
  const { callback_data, item_id, callback_query_id } = req.body;
  console.log(`[radar] Callback recebido: ${callback_data}`);

  try {
    await handleRadarCallback(callback_data, item_id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[radar] Callback error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

async function handleRadarCallback(callbackData, itemId) {
  if (!callbackData) return;

  const parts = callbackData.split(':');
  const action = parts[1]; // analyze | create | discard
  const id = itemId || parseInt(parts[2]);

  if (action === 'discard') {
    if (parts[2] === 'batch') {
      // Descartar todos os items notificados de hoje
      const items = radarDBMod.getItemsByStatus('notified', 50);
      for (const item of items) {
        radarDBMod.updateItemStatus(item.id, 'discarded');
      }
      await botSend(CHAT_ID, '✅ Todos os items descartados.');
    } else if (id) {
      radarDBMod.updateItemStatus(id, 'discarded');
    }
    return;
  }

  const item = radarDBMod.getItem(id);
  if (!item) {
    console.error(`[radar] Item ${id} nao encontrado`);
    return;
  }

  if (action === 'analyze') {
    // Redirecionar para pipeline do Swipe Collector
    radarDBMod.updateItemStatus(id, 'saved');
    radarDBMod.incrementDailyStat('items_saved');

    if (item.source_url) {
      // Envia a URL para o Swipe Collector processar
      await botSend(CHAT_ID, `📥 Enviando para analise do Swipe Collector:\n${item.source_url}\n\nCole essa URL no chat do Swipe Bot para analise completa.`);
    }
  }

  if (action === 'create') {
    radarDBMod.updateItemStatus(id, 'used');
    radarDBMod.incrementDailyStat('items_used');

    const angle = item.suggested_angle || 'bridge-post';
    const format = item.suggested_format || 'F3';

    await botSend(CHAT_ID, `✏️ <b>Criando conteudo</b>

📝 Base: "${escapeHtml(item.title?.slice(0, 100) || '')}"
💡 Angulo: ${escapeHtml(angle)}
📐 Formato: ${format}

Envie este briefing para @nova no Claude Code:
<code>@nova *create-from-radar ${id}</code>`);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================================
// Start server
// ============================================================

app.listen(PORT, () => {
  console.log(`🔍 Content Radar server rodando na porta ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/content-radar`);
  console.log(`📡 API: http://localhost:${PORT}/api/radar/items`);

  const hasApify = !!process.env.APIFY_API_TOKEN;
  const hasExa = !!process.env.EXA_API_KEY;
  console.log(`🔑 Apify: ${hasApify ? 'OK' : 'NAO CONFIGURADO (profile watcher limitado)'}`);
  console.log(`🔑 EXA: ${hasExa ? 'OK' : 'NAO CONFIGURADO (usando fallback)'}`);
});
