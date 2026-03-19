// meu-projeto/scribe-watcher.js
// Scribe Watcher v2.0 — Monitoramento autônomo de gravações de reunião
//
// Porta: 3008
// Cron: 00:00 BRT (diário)
// Env: GROQ_API_KEY, TELEGRAM_BOT_TOKEN, IRIS_APPROVAL_CHAT_ID

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
const { createTelegramClient } = require('./lib/telegram');
const {
  scanDriveRecordings,
  processRecording,
  getStats,
} = require('./lib/meeting-transcriber');

// ============================================================
// Config
// ============================================================

const PORT = process.env.SCRIBE_PORT || 3008;
const CHAT_ID = String(process.env.IRIS_APPROVAL_CHAT_ID || '5020990459');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.replace(/"/g, '');
const STATE_FILE = path.resolve(__dirname, '../.aios/scribe-watcher-state.json');
const RATE_LIMIT_SECS = 480; // 8 min entre gravações (Groq constraint)
const STARTUP_DELAY_MS = 60_000; // 60s delay no startup

// ============================================================
// Telegram
// ============================================================

let telegram;
if (TELEGRAM_BOT_TOKEN) {
  telegram = createTelegramClient(TELEGRAM_BOT_TOKEN);
}

async function notify(text) {
  console.log(`[scribe-watcher] ${text}`);
  if (telegram) {
    try {
      await telegram.sendMessage(CHAT_ID, text);
    } catch (err) {
      console.error('[scribe-watcher] Telegram notify error:', err.message);
    }
  }
}

// ============================================================
// State Persistence
// ============================================================

const DEFAULT_STATE = {
  version: 1,
  lastScan: null,
  isProcessing: false,
  currentRecording: null,
  queue: [],
  processedRecordings: {},
  stats: { totalScans: 0, totalProcessed: 0, totalErrors: 0 },
  history: [],
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      // Reset processing flags on startup (crash recovery)
      data.isProcessing = false;
      data.currentRecording = null;
      return { ...DEFAULT_STATE, ...data };
    }
  } catch (err) {
    console.error('[scribe-watcher] Error loading state:', err.message);
  }
  return { ...DEFAULT_STATE };
}

function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('[scribe-watcher] Error saving state:', err.message);
  }
}

function isProcessed(state, id) {
  return !!state.processedRecordings[id];
}

function markProcessed(state, id, result) {
  state.processedRecordings[id] = {
    timestamp: new Date().toISOString(),
    success: result.success,
    filePath: result.filePath || null,
    error: result.error || null,
  };

  // Add to history (keep last 100)
  state.history.unshift({
    id,
    timestamp: new Date().toISOString(),
    success: result.success,
    filePath: result.filePath || null,
    error: result.error || null,
    client: result.client || null,
  });
  if (state.history.length > 100) state.history = state.history.slice(0, 100);

  if (result.success) {
    state.stats.totalProcessed++;
  } else {
    state.stats.totalErrors++;
  }
}

// ============================================================
// Global state
// ============================================================

let state = loadState();

// ============================================================
// Scan + Queue
// ============================================================

function scanAndQueue() {
  console.log('[scribe-watcher] Scanning Drive for recordings...');
  state.stats.totalScans++;
  state.lastScan = new Date().toISOString();

  let recordings;
  try {
    recordings = scanDriveRecordings();
  } catch (err) {
    console.error('[scribe-watcher] Scan error:', err.message);
    notify(`❌ SCRIBE — Erro no scan: ${err.message}`);
    saveState(state);
    return [];
  }

  // Filter already processed
  const newRecordings = recordings.filter(
    (r) => !r.hasTranscription && !isProcessed(state, r.id)
  );

  if (newRecordings.length > 0) {
    state.queue = newRecordings.map((r) => ({
      id: r.id,
      name: r.name,
      size: r.sizeFormatted,
      date: r.date,
      client: r.clientGuess?.name || '?',
      retries: 0,
    }));
    saveState(state);
    notify(`🎙️ SCRIBE — ${newRecordings.length} nova(s) gravação(ões) encontrada(s). Processando...`);
  } else {
    state.queue = [];
    saveState(state);
    console.log('[scribe-watcher] No new recordings found.');
  }

  return newRecordings;
}

// ============================================================
// Processing Loop
// ============================================================

async function processQueue() {
  if (state.isProcessing) {
    console.log('[scribe-watcher] Already processing, skipping...');
    return;
  }

  // Get fresh scan data to pass to processRecording
  let recordings;
  try {
    recordings = scanDriveRecordings();
  } catch (err) {
    console.error('[scribe-watcher] Scan error in processQueue:', err.message);
    return;
  }

  const queueCopy = [...state.queue];
  if (queueCopy.length === 0) return;

  state.isProcessing = true;
  saveState(state);

  const total = queueCopy.length;
  let okCount = 0;
  let failCount = 0;

  for (let i = 0; i < queueCopy.length; i++) {
    const item = queueCopy[i];

    // Find full recording object
    const recording = recordings.find((r) => r.id === item.id);
    if (!recording) {
      console.log(`[scribe-watcher] Recording ${item.id} not found in Drive, skipping`);
      state.queue = state.queue.filter((q) => q.id !== item.id);
      saveState(state);
      continue;
    }

    state.currentRecording = item.name;
    saveState(state);

    await notify(`🎙️ [${i + 1}/${total}] Processando: ${item.name} (${item.size})`);

    let result;
    try {
      result = await processRecording(recording);
    } catch (err) {
      result = { success: false, error: err.message };
    }

    if (result.success) {
      okCount++;
      const client = recording.clientGuess?.name || '?';
      const summary = result.analysis?.summary
        ? result.analysis.summary.substring(0, 100)
        : '';
      await notify(`✅ ${item.name} — ${client}${summary ? ` — ${summary}` : ''}`);
      markProcessed(state, item.id, { ...result, client });
    } else {
      // Retry once
      if (item.retries < 1) {
        item.retries++;
        await notify(`❌ ${item.name}: ${result.error}. Retry: sim (tentativa ${item.retries})`);
        console.log(`[scribe-watcher] Retrying ${item.name} in 60s...`);
        await sleep(60_000);

        try {
          result = await processRecording(recording);
        } catch (err) {
          result = { success: false, error: err.message };
        }

        if (result.success) {
          okCount++;
          const client = recording.clientGuess?.name || '?';
          await notify(`✅ (retry) ${item.name} — ${client}`);
          markProcessed(state, item.id, { ...result, client });
        } else {
          failCount++;
          await notify(`❌ ${item.name}: ${result.error}. Retry: não (max atingido)`);
          markProcessed(state, item.id, result);
        }
      } else {
        failCount++;
        await notify(`❌ ${item.name}: ${result.error}. Retry: não`);
        markProcessed(state, item.id, result);
      }
    }

    // Remove from queue
    state.queue = state.queue.filter((q) => q.id !== item.id);
    saveState(state);

    // Rate limit between recordings
    if (i < queueCopy.length - 1) {
      console.log(`[scribe-watcher] Rate limit: waiting ${RATE_LIMIT_SECS}s...`);
      await sleep(RATE_LIMIT_SECS * 1000);
    }
  }

  state.isProcessing = false;
  state.currentRecording = null;
  saveState(state);

  const remaining = state.queue.length;
  await notify(`🎙️ Batch concluído: ✅${okCount} ❌${failCount} 📋${remaining} restantes`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Express Server
// ============================================================

const app = express();
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'scribe-watcher',
    version: '2.0.0',
    status: state.isProcessing ? 'processing' : 'idle',
    lastScan: state.lastScan,
    queueLength: state.queue.length,
    uptime: process.uptime(),
  });
});

// Full status
app.get('/api/status', (req, res) => {
  res.json({
    ...state,
    uptime: process.uptime(),
    serverTime: new Date().toISOString(),
  });
});

// Stats from meeting-transcriber
app.get('/api/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// History (last 50)
app.get('/api/history', (req, res) => {
  res.json(state.history.slice(0, 50));
});

// Manual scan trigger
app.post('/api/scan', async (req, res) => {
  if (state.isProcessing) {
    return res.status(409).json({ error: 'Already processing. Wait for current batch to finish.' });
  }

  const newRecordings = scanAndQueue();
  res.json({
    message: `Scan complete. ${newRecordings.length} new recordings queued.`,
    queue: state.queue,
  });

  // Process queue in background
  if (newRecordings.length > 0) {
    processQueue().catch((err) => {
      console.error('[scribe-watcher] processQueue error:', err);
    });
  }
});

// Dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scribe-dashboard.html'));
});

// ============================================================
// Cron Schedule — 00:00 BRT daily
// ============================================================

cron.schedule('0 0 * * *', async () => {
  console.log('[scribe-watcher] Cron triggered: daily scan');
  scanAndQueue();
  if (state.queue.length > 0) {
    processQueue().catch((err) => {
      console.error('[scribe-watcher] processQueue error:', err);
    });
  }
}, { timezone: 'America/Sao_Paulo' });

// ============================================================
// Startup
// ============================================================

app.listen(PORT, () => {
  console.log(`🎙️ Scribe Watcher v2.0 — Port ${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`   State: ${STATE_FILE}`);
  console.log(`   Cron: 00:00 BRT (diário)`);
  console.log(`   Telegram: chat ${CHAT_ID}`);
  console.log(`   Processed: ${Object.keys(state.processedRecordings).length} recordings`);
  console.log(`   Queue: ${state.queue.length} pending`);

  // Initial scan after 60s delay (let other services start first)
  setTimeout(async () => {
    console.log('[scribe-watcher] Initial scan starting...');
    scanAndQueue();
    if (state.queue.length > 0) {
      processQueue().catch((err) => {
        console.error('[scribe-watcher] processQueue error:', err);
      });
    }
  }, STARTUP_DELAY_MS);
});
