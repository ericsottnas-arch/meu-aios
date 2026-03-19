/**
 * Cold Outreach Server - Controle de campanha de prospecção fria via WhatsApp
 *
 * Porta: 3006
 *
 * Endpoints:
 *   POST /campaign/start     - Inicia campanha (importa do GHL + começa envios)
 *   POST /campaign/pause     - Pausa envios
 *   POST /campaign/resume    - Retoma envios
 *   POST /campaign/stop      - Para campanha completamente
 *   GET  /campaign/status     - Estatísticas em tempo real
 *   GET  /campaign/leads      - Lista de leads com filtros
 *   POST /campaign/test       - Envia mensagem teste para um número
 *   POST /campaign/import     - Importa contatos do GHL sem iniciar envios
 *   POST /campaign/report     - Envia relatório via Telegram
 *   POST /webhook/response    - Webhook para respostas de leads
 */

require('dotenv').config();
const express = require('express');
const coldOutreach = require('./lib/cold-outreach');

const app = express();
app.use(express.json());

const PORT = process.env.COLD_OUTREACH_PORT || 3006;

// ============================================================
// Campaign Control
// ============================================================

app.post('/campaign/start', async (req, res) => {
  try {
    const { tag = 'frio', importFirst = true } = req.body || {};
    const result = await coldOutreach.startCampaign({ tag, importFirst });
    res.json(result);
  } catch (err) {
    console.error('Erro ao iniciar campanha:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/campaign/pause', (req, res) => {
  res.json(coldOutreach.pauseCampaign());
});

app.post('/campaign/resume', (req, res) => {
  res.json(coldOutreach.resumeCampaign());
});

app.post('/campaign/stop', (req, res) => {
  res.json(coldOutreach.stopCampaign());
});

// ============================================================
// Status & Data
// ============================================================

app.get('/campaign/status', (req, res) => {
  try {
    const stats = coldOutreach.getCampaignStats();
    res.json({ success: true, ...stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/campaign/leads', (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const leads = coldOutreach.getLeads({
      status,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
    res.json({ success: true, count: leads.length, leads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// Test & Import
// ============================================================

/**
 * Dispara manualmente a pergunta investigativa para um número específico.
 * Usar quando o lead já respondeu fora do sistema (ex: direto no Nico Web).
 * Body: { phone: "+55 31 8329-2170" }
 */
app.post('/campaign/investigate', async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'phone é obrigatório' });

    const result = await coldOutreach.manualInvestigate(phone);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/campaign/test', async (req, res) => {
  try {
    const { phone, name = 'Teste', gender = 'male' } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'phone é obrigatório' });

    const result = await coldOutreach.sendTestMessage(phone, name, gender);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/campaign/import', async (req, res) => {
  try {
    const { tag = 'frio' } = req.body || {};
    const result = await coldOutreach.importContacts(tag);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/campaign/report', async (req, res) => {
  try {
    await coldOutreach.sendProgressReport();
    res.json({ success: true, message: 'Relatório enviado no Telegram' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// Webhook - Respostas de leads
// ============================================================

/**
 * Recebe notificação de resposta de lead.
 * Pode ser chamado pelo whatsapp-agent-server quando detecta msg inbound
 * de um número que está na campanha cold outreach.
 *
 * Body: { phoneJid: "5511999999999@s.whatsapp.net", text: "Sim, sou eu" }
 */
app.post('/webhook/response', (req, res) => {
  try {
    const { phoneJid, text } = req.body || {};
    if (!phoneJid) return res.status(400).json({ success: false, error: 'phoneJid obrigatório' });

    const lead = coldOutreach.markAsResponded(phoneJid, text);
    if (lead) {
      res.json({ success: true, lead: { id: lead.id, name: lead.name } });
    } else {
      res.json({ success: false, message: 'Lead não encontrado ou já respondeu' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Processa manualmente a resposta de um lead (para casos onde a resposta
 * chegou mas não foi capturada pelo webhook automático).
 *
 * Body: { phone: "+55 31 8329-2170", text: "Sim sou dentista" }
 *    ou: { phone: "31999999999", text: "Não sou dentista" }
 */
app.post('/campaign/process-response', async (req, res) => {
  try {
    const { phone, text } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'phone é obrigatório' });
    if (!text) return res.status(400).json({ success: false, error: 'text é obrigatório' });

    const result = await coldOutreach.handleLeadResponse(phone, text);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// Dashboard HTML simples
// ============================================================

app.get('/', (req, res) => {
  const stats = coldOutreach.getCampaignStats();

  const responseRate = (stats.firstSent + stats.followupSent) > 0
    ? ((stats.responded / (stats.firstSent + stats.followupSent)) * 100).toFixed(1)
    : '0';

  const statusEmoji = stats.isRunning ? (stats.isPaused ? '⏸️' : '🟢') : '⏹️';
  const statusText = stats.isRunning ? (stats.isPaused ? 'PAUSADA' : 'RODANDO') : 'PARADA';

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cold Outreach - Dashboard</title>
      <meta charset="utf-8">
      <meta http-equiv="refresh" content="30">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg-base: #030303; --bg-surface: #0a0a0a; --bg-elevated: #101013;
          --border-faint: #141417; --border-subtle: #1e1e23; --border-base: #27272d;
          --text-primary: #F0F0F5; --text-secondary: #8F8FA0; --text-muted: #505060;
          --accent: #C8FF00; --accent-dim: rgba(200, 255, 0, 0.08);
          --success: #22C55E; --warning: #F59E0B; --danger: #EF4444;
          --font-display: 'Space Grotesk', 'Inter', system-ui, sans-serif;
          --font-body: 'Inter', system-ui, -apple-system, sans-serif;
          --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
          --r-sm: 6px; --r-md: 8px; --r-lg: 12px; --r-full: 9999px;
          --ease-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        body { font-family: var(--font-body); max-width: 800px; margin: 40px auto; padding: 0 20px; background: var(--bg-base); color: var(--text-primary); -webkit-font-smoothing: antialiased; }
        h1 { color: var(--text-primary); font-family: var(--font-display); }
        h3 { color: var(--text-primary); font-family: var(--font-display); }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin: 24px 0; }
        .stat { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--r-lg); padding: 20px; text-align: center; transition: border-color var(--ease-base); }
        .stat:hover { border-color: var(--border-base); }
        .stat .value { font-size: 2rem; font-weight: 700; color: var(--accent); font-family: var(--font-display); }
        .stat .label { font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px; }
        .stat.highlight .value { color: var(--success); }
        .stat.warning .value { color: var(--warning); }
        .stat.error .value { color: var(--danger); }
        .controls { display: flex; gap: 12px; margin: 24px 0; flex-wrap: wrap; }
        .btn { padding: 10px 24px; border: none; border-radius: var(--r-md); font-size: 1rem; cursor: pointer; font-weight: 600; transition: opacity var(--ease-base); }
        .btn:hover { opacity: 0.85; }
        .btn-start { background: var(--success); color: #fff; }
        .btn-pause { background: var(--warning); color: #fff; }
        .btn-stop { background: var(--danger); color: #fff; }
        .btn-report { background: #2196f3; color: #fff; }
        .status-bar { background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 16px 24px; border-radius: var(--r-lg); margin: 16px 0; font-size: 1.1rem; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border-faint); }
        th { color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; font-family: var(--font-mono); letter-spacing: 0.05em; }
        td { color: var(--text-secondary); }
      </style>
    </head>
    <body>
      <h1>📞 Cold Outreach Dashboard</h1>

      <div class="status-bar">${statusEmoji} Status: <strong>${statusText}</strong> | Hoje: ${stats.sentToday}/${stats.dailyLimit}</div>

      <div class="stat-grid">
        <div class="stat"><div class="value">${stats.total}</div><div class="label">Total Leads</div></div>
        <div class="stat"><div class="value">${stats.pending}</div><div class="label">Pendentes</div></div>
        <div class="stat"><div class="value">${stats.firstSent}</div><div class="label">1ª Msg Enviada</div></div>
        <div class="stat"><div class="value">${stats.followupSent}</div><div class="label">Follow-up</div></div>
        <div class="stat highlight"><div class="value">${stats.responded}</div><div class="label">Responderam</div></div>
        <div class="stat warning"><div class="value">${responseRate}%</div><div class="label">Taxa Resposta</div></div>
        <div class="stat error"><div class="value">${stats.errors}</div><div class="label">Erros</div></div>
      </div>

      <div class="controls">
        <button class="btn btn-start" onclick="fetch('/campaign/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag:'frio'})}).then(()=>location.reload())">▶️ Iniciar</button>
        <button class="btn btn-pause" onclick="fetch('/campaign/${stats.isPaused ? 'resume' : 'pause'}',{method:'POST'}).then(()=>location.reload())">${stats.isPaused ? '▶️ Retomar' : '⏸️ Pausar'}</button>
        <button class="btn btn-stop" onclick="fetch('/campaign/stop',{method:'POST'}).then(()=>location.reload())">⏹️ Parar</button>
        <button class="btn btn-report" onclick="fetch('/campaign/report',{method:'POST'}).then(()=>alert('Relatório enviado!'))">📊 Relatório TG</button>
      </div>

      <h3>Gêneros Detectados</h3>
      <div class="stat-grid">
        <div class="stat"><div class="value">${stats.genderBreakdown.male || 0}</div><div class="label">👨 Homens</div></div>
        <div class="stat"><div class="value">${stats.genderBreakdown.female || 0}</div><div class="label">👩 Mulheres</div></div>
        <div class="stat"><div class="value">${stats.genderBreakdown.unknown || 0}</div><div class="label">❓ Indefinido</div></div>
      </div>

      ${stats.recentResponses.length > 0 ? `
        <h3>🔥 Últimas Respostas</h3>
        <table>
          <tr><th>Nome</th><th>Telefone</th><th>Resposta</th><th>Quando</th></tr>
          ${stats.recentResponses.map(r => `
            <tr>
              <td>${r.name}</td>
              <td>${r.phone}</td>
              <td>${r.response_text || '-'}</td>
              <td>${r.responded_at || '-'}</td>
            </tr>
          `).join('')}
        </table>
      ` : ''}

      <p style="color:var(--text-muted); margin-top:40px; font-size:0.85rem">Auto-refresh a cada 30s | Campanha: tag "frio" | Cadência: 3-10min | Batch pause: a cada 35 msgs</p>
    </body>
    </html>
  `);
});

// ============================================================
// Server Start
// ============================================================

app.listen(PORT, () => {
  console.log(`\n📞 Cold Outreach Server rodando na porta ${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/campaign/status`);
  console.log('');
});
