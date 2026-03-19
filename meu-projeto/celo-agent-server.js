// meu-projeto/celo-agent-server.js
// Celo - Media Buyer Expert Agent Server (Bot Telegram próprio)
const fs = require('fs');
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
  const localEnv = path.resolve(__dirname, '.env');
  const parentEnv = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(localEnv)) {
    require('dotenv').config({ path: localEnv });
  } else if (fs.existsSync(parentEnv)) {
    require('dotenv').config({ path: parentEnv });
  } else {
    require('dotenv').config();
  }
}

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.CELO_PORT || 3002;
const APPROVAL_CHAT_ID = process.env.CELO_APPROVAL_CHAT_ID;
const CELO_BOT_TOKEN = process.env.CELO_BOT_TOKEN?.replace(/"/g, '');
const CELO_WEBHOOK_URL = process.env.CELO_WEBHOOK_URL || 'https://celo.syradigital.com/webhook';

// Módulos
const CeloAgent = require('./lib/celo-agent');
const celoConfig = require('./lib/celo-config');
const celoConversation = require('./lib/celo-conversation');
const celoTelegram = require('./lib/celo-telegram');
const naming = require('./lib/adtag-naming');
const AdsManager = require('./lib/ads-manager');
const campaignWizard = require('./lib/campaign-wizard');
const CeloOptimizer = require('./lib/celo-optimizer');
const CeloAutopilot = require('./lib/celo-autopilot');
const memoryStore = require('./lib/memory-store');
const knowledgeBase = require('./lib/knowledge-base');
const knowledgeExtractor = require('./lib/knowledge-extractor');
const CampaignsExporter = require('./lib/campaigns-exporter');
const AdsSyncer = require('./lib/ads-syncer');
const GhlSyncer = require('./lib/ghl-syncer');
const GhlCrm = require('./lib/ghl-crm');
const adsDb = require('./lib/ads-db');
const ghlDb = require('./lib/ghl-analytics-db');

const celo = new CeloAgent();
const adsManager = new AdsManager();
const optimizer = new CeloOptimizer(adsManager);
const campaignsExporter = new CampaignsExporter();
const adsSyncer = new AdsSyncer();
const ghlSyncer = new GhlSyncer();
let autopilot = null; // Inicializado no startup

const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');

// Armazenar sugestões pendentes para callbacks
const pendingOptimizations = new Map();

// Estado temporário para aguardar input de /scale
const scaleWaiting = new Map();

// ============================================================
// Transcrição de áudio (Groq Whisper)
// ============================================================
async function transcribeAudio(fileUrl) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY não configurada');

  const audioRes = await fetch(fileUrl);
  if (!audioRes.ok) throw new Error(`Falha ao baixar áudio: ${audioRes.statusText}`);
  const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

  const blob = new Blob([audioBuffer], { type: 'audio/ogg' });
  const formData = new FormData();
  formData.append('file', blob, 'audio.ogg');
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'pt');
  formData.append('response_format', 'text');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Whisper ${response.status}: ${errText}`);
  }

  return (await response.text()).trim();
}

// ============================================================
// Static files & Dashboard
// ============================================================
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'celo-dashboard.html'));
});

// ============================================================
// Health check
// ============================================================
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'celo-media-buyer',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    dashboard: `http://localhost:${PORT}/dashboard`,
  });
});

// ============================================================
// Telegram Webhook (bot próprio do Celo)
// ============================================================
app.post('/webhook', async (req, res) => {
  res.status(200).send('OK');

  try {
    // Callback query (botões inline de aprovação)
    if (req.body.callback_query) {
      await handleCeloCallback(req.body.callback_query);
      return;
    }

    // Mensagem normal — comandos do bot
    const message = req.body.message;
    if (!message) return;

    const chatId = message.chat.id;

    // Capturar input do wizard (name ou dailyBudget)
    const wizSession = campaignWizard.getSession(chatId);
    if (message.text && wizSession && !message.text.startsWith('/')) {
      if (wizSession.step === 'name') {
        const newStep = campaignWizard.setStepValue(chatId, 'name', message.text.trim());
        const prompt = campaignWizard.getStepPrompt(campaignWizard.getSession(chatId));
        if (prompt.keyboard) {
          await celoTelegram.sendInlineKeyboard(chatId, prompt.text, prompt.keyboard);
        } else {
          await celoTelegram.sendMessage(chatId, prompt.text);
        }
        return;
      }
      if (wizSession.step === 'dailyBudget') {
        const budget = parseFloat(message.text.replace(',', '.'));
        if (isNaN(budget) || budget <= 0) {
          await celoTelegram.sendMessage(chatId, 'Valor invalido. Digite um numero (ex: 50.00)');
          return;
        }
        campaignWizard.setStepValue(chatId, 'dailyBudget', budget);
        const prompt = campaignWizard.getStepPrompt(campaignWizard.getSession(chatId));
        if (prompt.keyboard) {
          await celoTelegram.sendInlineKeyboard(chatId, prompt.text, prompt.keyboard);
        } else {
          await celoTelegram.sendMessage(chatId, prompt.text);
        }
        return;
      }
      if (wizSession.step === 'interest') {
        // Texto livre para interesse de audiência
        campaignWizard.setStepValue(chatId, 'interest', message.text.trim());
        const prompt = campaignWizard.getStepPrompt(campaignWizard.getSession(chatId));
        if (prompt.keyboard) {
          await celoTelegram.sendInlineKeyboard(chatId, prompt.text, prompt.keyboard);
        } else {
          await celoTelegram.sendMessage(chatId, prompt.text);
        }
        return;
      }
    }

    // Capturar input de /scale (esperando valor de budget)
    if (message.text && scaleWaiting.has(chatId) && !message.text.startsWith('/')) {
      const { campaignId, platform } = scaleWaiting.get(chatId);
      scaleWaiting.delete(chatId);
      const newBudget = parseFloat(message.text.replace(',', '.'));
      if (isNaN(newBudget) || newBudget <= 0) {
        await celoTelegram.sendMessage(chatId, 'Valor invalido. Cancelado.');
        return;
      }
      try {
        const campaigns = await adsManager.listCampaigns(platform, {});
        const campaign = campaigns.find((c) => c.id === campaignId);
        const currentBudget = campaign?.budget?.daily || 0;
        const result = await adsManager.updateBudget(
          platform, campaignId, 'campaign', currentBudget, newBudget,
          { campaignName: campaign?.name || campaignId, reason: 'Scale via botao' }
        );
        if (result.executed) {
          await celoTelegram.sendMessage(chatId, `💰 Budget: R$ ${currentBudget.toFixed(2)} -> R$ ${newBudget.toFixed(2)}`);
        } else if (result.approval && APPROVAL_CHAT_ID) {
          const pct = Math.round(Math.abs((newBudget - currentBudget) / currentBudget) * 100);
          await celoTelegram.sendInlineKeyboard(APPROVAL_CHAT_ID,
            `Celo - Aprovacao\n\nCampanha: ${campaign?.name || campaignId}\nAtual: R$ ${currentBudget.toFixed(2)}\nProposta: R$ ${newBudget.toFixed(2)} (${pct}%)`,
            celoTelegram.budgetApprovalKeyboard(result.approval.requestId)
          );
          await celoTelegram.sendMessage(chatId, `Mudanca de ${pct}% enviada para aprovacao.`);
        }
      } catch (err) {
        await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
      }
      return;
    }

    if (message.text && message.text.startsWith('/')) {
      const cmd = message.text.split(/\s|@/)[0].toLowerCase();
      const args = message.text.substring(cmd.length).trim();

      switch (cmd) {
        case '/start':
          await celoTelegram.sendMessage(chatId,
            'Celo - Media Buyer Expert\n\n' +
            'Gestao de trafego pago, otimizacao e performance.\n\n' +
            'Comandos:\n' +
            '/clients - Listar clientes\n' +
            '/budget {cliente} - Ver budget de um cliente\n' +
            '/pending - Aprovacoes pendentes\n' +
            '/report {cliente} - Relatorio rapido\n' +
            '/naming - Gerar nomenclatura AdTag\n' +
            '/help - Ajuda completa'
          );
          return;

        case '/help':
          await celoTelegram.sendMessage(chatId,
            'Celo - Media Buyer Expert\n\n' +
            'Campanhas (Meta/Google):\n' +
            '  /campaigns [meta|google] {cliente}\n' +
            '  /create - Criar campanha (wizard)\n' +
            '  /metrics [meta|google] {id} [periodo]\n' +
            '  /pause [meta|google] {id}\n' +
            '  /activate [meta|google] {id}\n' +
            '  /scale [meta|google] {id} {valor}\n' +
            '  /duplicate [meta|google] {id}\n' +
            '  /audiences - Publicos\n\n' +
            'Google Ads:\n' +
            '  /search-terms {id} [periodo]\n' +
            '  /quality-score {id} - QS keywords\n' +
            '  /adgroups {id} - Ad Groups\n' +
            '  /sync-google {cliente} - Sync dados\n' +
            '  /google-status - Verificar config\n\n' +
            'Otimizacao:\n' +
            '  /autooptimize {cliente}\n\n' +
            'Budget:\n' +
            '  /budget {cliente} - Verba mensal\n' +
            '  /pending - Aprovacoes\n\n' +
            'Clientes:\n' +
            '  /clients - Listar\n\n' +
            'Nomenclatura:\n' +
            '  /naming - Gerar AdTag\n\n' +
            '— Celo, dados nao mentem.'
          );
          return;

        case '/clients': {
          const clients = celoConfig.listClients();
          if (clients.length === 0) {
            await celoTelegram.sendMessage(chatId, 'Nenhum cliente configurado.');
          } else {
            const lines = clients.map((c) =>
              `- ${c.name} | R$ ${c.budget.monthly.toFixed(2)} | Testes: ${(c.budget.testingPercentage * 100).toFixed(0)}%`
            );
            await celoTelegram.sendMessage(chatId, `${clients.length} cliente(s):\n\n${lines.join('\n')}`);
          }
          return;
        }

        case '/budget': {
          if (!args) {
            await celoTelegram.sendMessage(chatId, 'Uso: /budget {id-do-cliente}\nEx: /budget dr-erico-servano');
            return;
          }
          try {
            const clientId = args.replace(/\s+/g, '-').toLowerCase();
            const budget = celo.getClientBudget(clientId);
            const client = celoConfig.getClient(clientId);
            await celoTelegram.sendMessage(chatId,
              `Budget - ${client.name}\n\n` +
              `Mensal: R$ ${budget.monthly.toFixed(2)}\n` +
              `Testes (${(budget.testingPercentage * 100).toFixed(0)}%): R$ ${budget.testing.toFixed(2)}\n` +
              `Escala: R$ ${budget.scale.toFixed(2)}`
            );
          } catch (err) {
            await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
          }
          return;
        }

        case '/pending': {
          const pending = celoConversation.getPendingApprovals();
          if (pending.length === 0) {
            await celoTelegram.sendMessage(chatId, 'Nenhuma aprovacao pendente.');
          } else {
            const lines = pending.map((a) =>
              `- ${a.clientName} | ${a.campaign} | R$ ${a.currentBudget} -> R$ ${a.proposedBudget}`
            );
            await celoTelegram.sendMessage(chatId, `${pending.length} pendente(s):\n\n${lines.join('\n')}`);
          }
          return;
        }

        case '/report': {
          if (!args) {
            await celoTelegram.sendMessage(chatId, 'Uso: /report {id-do-cliente}');
            return;
          }
          await celoTelegram.sendMessage(chatId, 'Analisando dados do CRM...');
          try {
            const clientId = args.replace(/\s+/g, '-').toLowerCase();
            const analysis = await celo.analyzeSalesData(clientId);
            let msg = `Relatorio - ${celoConfig.getClient(clientId)?.name || clientId}\n\n`;
            msg += analysis.summary || 'Sem dados suficientes.';
            if (analysis.alerts?.length > 0) {
              msg += `\n\nAlertas:\n${analysis.alerts.map((a) => `- ${a}`).join('\n')}`;
            }
            await celoTelegram.sendMessage(chatId, msg);
          } catch (err) {
            await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
          }
          return;
        }

        case '/optimize': {
          if (!args) {
            await celoTelegram.sendMessage(chatId, 'Uso: /optimize {id-do-cliente}');
            return;
          }
          await celoTelegram.sendMessage(chatId, 'Gerando sugestoes de otimizacao...');
          try {
            const clientId = args.replace(/\s+/g, '-').toLowerCase();
            const result = await celo.getOptimizationSuggestions(clientId);
            let msg = `Otimizacao - ${celoConfig.getClient(clientId)?.name || clientId}\n\n`;
            msg += result.summary || 'Sem sugestoes.';
            if (result.suggestions?.length > 0) {
              msg += '\n\nSugestoes:';
              result.suggestions.forEach((s, i) => {
                msg += `\n${i + 1}. [${s.priority}] ${s.action} (${s.target})`;
              });
            }
            await celoTelegram.sendMessage(chatId, msg);
          } catch (err) {
            await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
          }
          return;
        }

        case '/constants': {
          await celoTelegram.sendMessage(chatId,
            'AdTag - Constantes\n\n' +
            `Objetivos: ${naming.CAMPAIGN_OBJECTIVES.join(', ')}\n\n` +
            `Formatos: ${naming.CREATIVE_FORMATS.join(', ')}\n\n` +
            `CTAs: ${naming.CTAS.join(', ')}\n\n` +
            `Generos: ${naming.GENDERS.join(', ')}\n\n` +
            `Posicionamentos: ${naming.PLACEMENTS.join(', ')}`
          );
          return;
        }

        case '/naming': {
          await celoTelegram.sendInlineKeyboard(chatId, 'Gerar nomenclatura para:', [
            [
              { text: 'Campanha', callback_data: 'naming:campaign' },
              { text: 'Publico', callback_data: 'naming:audience' },
              { text: 'Criativo', callback_data: 'naming:creative' },
            ],
          ]);
          return;
        }

        case '/gencampaign': {
          if (!args) {
            await celoTelegram.sendMessage(chatId,
              'Uso: /gencampaign {nome} | {objetivo} | {CBO ou ABO}\n\n' +
              'Ex: /gencampaign Dr Erico - Implantes | Formulario Instantaneo | CBO\n\n' +
              `Objetivos: ${naming.CAMPAIGN_OBJECTIVES.join(', ')}`
            );
            return;
          }
          const parts = args.split('|').map((s) => s.trim());
          const [campaignName, objective, budgetType] = parts;
          const generated = naming.generateCampaignName({
            name: campaignName,
            objective: objective || undefined,
            budgetType: budgetType || undefined,
          });
          const validation = naming.validateName(generated, 'campaign');
          let msg = `AdTag Campanha:\n\n${generated}`;
          if (!validation.valid) {
            msg += `\n\nAvisos:\n${validation.errors.map((e) => '- ' + e).join('\n')}`;
          }
          await celoTelegram.sendMessage(chatId, msg);
          return;
        }

        case '/genaudience': {
          if (!args) {
            await celoTelegram.sendMessage(chatId,
              'Uso: /genaudience {N} | {genero} | {idadeMin}-{idadeMax} | {posicionamentos} | {interesse} | {local}\n\n' +
              'Ex: /genaudience 1 | Todos | 25-55 | FB+IG | Implante Dentario | Sao Paulo - SP\n\n' +
              `Generos: ${naming.GENDERS.join(', ')}\n` +
              `Posicionamentos: ${naming.PLACEMENTS.join(', ')}`
            );
            return;
          }
          const parts = args.split('|').map((s) => s.trim());
          const [num, gender, ageRange, placements, interest, location] = parts;
          const ageParts = ageRange ? ageRange.split('-').map(Number) : [];
          const generated = naming.generateAudienceName({
            number: parseInt(num, 10) || 1,
            gender: gender || undefined,
            ageMin: ageParts[0] || undefined,
            ageMax: ageParts[1] || undefined,
            placements: placements ? placements.split('+').map((s) => s.trim()) : undefined,
            interest: interest || undefined,
            location: location || undefined,
          });
          const validation = naming.validateName(generated, 'audience');
          let msg = `AdTag Publico:\n\n${generated}`;
          if (!validation.valid) {
            msg += `\n\nAvisos:\n${validation.errors.map((e) => '- ' + e).join('\n')}`;
          }
          await celoTelegram.sendMessage(chatId, msg);
          return;
        }

        case '/gencreative': {
          if (!args) {
            await celoTelegram.sendMessage(chatId,
              'Uso: /gencreative {N} | {formato} | {hook} | {cta}\n\n' +
              'Ex: /gencreative 1 | Video | Antes e Depois | Agendar\n\n' +
              `Formatos: ${naming.CREATIVE_FORMATS.join(', ')}\n` +
              `CTAs: ${naming.CTAS.join(', ')}`
            );
            return;
          }
          const parts = args.split('|').map((s) => s.trim());
          const [num, format, hook, cta] = parts;
          const generated = naming.generateCreativeName({
            number: parseInt(num, 10) || 1,
            format: format || undefined,
            hook: hook || undefined,
            cta: cta || undefined,
          });
          const validation = naming.validateName(generated, 'creative');
          let msg = `AdTag Criativo:\n\n${generated}`;
          if (!validation.valid) {
            msg += `\n\nAvisos:\n${validation.errors.map((e) => '- ' + e).join('\n')}`;
          }
          await celoTelegram.sendMessage(chatId, msg);
          return;
        }

        // ============================================================
        // Wizard de Criação de Campanha
        // ============================================================

        case '/create': {
          const clients = celoConfig.listClients();
          if (clients.length === 0) {
            await celoTelegram.sendMessage(chatId, 'Nenhum cliente configurado.');
            return;
          }
          const session = campaignWizard.createSession(chatId, clients);
          const prompt = campaignWizard.getStepPrompt(session);
          if (prompt.keyboard) {
            await celoTelegram.sendInlineKeyboard(chatId, prompt.text, prompt.keyboard);
          } else {
            await celoTelegram.sendMessage(chatId, prompt.text);
          }
          return;
        }

        // ============================================================
        // Comandos de Campanhas (Meta/Google Ads)
        // ============================================================

        case '/campaigns': {
          // Aceita: /campaigns ou /campaigns {clientId} ou /campaigns meta {clientId}
          const campArgs = args.trim().split(/\s+/);
          let platform = 'meta';
          let clientId = null;

          // Determinar se o argumento é uma plataforma ou um clientId
          if (campArgs[0] === 'meta' || campArgs[0] === 'google') {
            platform = campArgs[0];
            clientId = campArgs[1] || null;
          } else if (campArgs[0]) {
            // Tentar como clientId
            clientId = campArgs[0];
          }

          // Se não informou clientId, listar clientes disponíveis
          if (!clientId) {
            const clients = celoConfig.listClients();
            if (clients.length === 1) {
              clientId = clients[0].id;
            } else if (clients.length > 1) {
              const lines = clients.map((c) => `  /campaigns ${c.id}`);
              await celoTelegram.sendMessage(chatId, `Qual cliente?\n\n${lines.join('\n')}`);
              return;
            }
          }

          await celoTelegram.sendMessage(chatId, `Carregando campanhas ${platform}...`);
          try {
            const campaigns = await adsManager.listCampaigns(platform, {
              statusFilter: ['ACTIVE', 'PAUSED'],
              clientId,
            });
            if (campaigns.length === 0) {
              await celoTelegram.sendMessage(chatId, 'Nenhuma campanha encontrada.');
            } else {
              const lines = campaigns.slice(0, 15).map((c) => {
                const emoji = AdsManager.statusEmoji(c.status);
                const budget = c.budget.daily ? `R$ ${c.budget.daily.toFixed(2)}/dia` : '-';
                return `${emoji} ${c.name}\n   ID: ${c.id} | ${budget}`;
              });
              await celoTelegram.sendInlineKeyboard(
                chatId,
                `${campaigns.length} campanha(s) ${platform}:\n\n${lines.join('\n\n')}`,
                celoTelegram.campaignListKeyboard(campaigns)
              );
            }
          } catch (err) {
            await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
          }
          return;
        }

        case '/metrics': {
          if (!args) {
            await celoTelegram.sendMessage(chatId, 'Uso: /metrics [meta|google] {campaign-id} [last_7d|last_30d|today]');
            return;
          }
          const metricParts = args.split(/\s+/);
          let metricPlatform = 'meta';
          let metricIdx = 0;

          if (metricParts[0] === 'meta' || metricParts[0] === 'google') {
            metricPlatform = metricParts[0];
            metricIdx = 1;
          }

          const metricId = metricParts[metricIdx];
          const datePreset = metricParts[metricIdx + 1] || 'last_7d';

          if (!metricId) {
            await celoTelegram.sendMessage(chatId, 'Uso: /metrics [meta|google] {campaign-id} [last_7d|last_30d|today]');
            return;
          }

          await celoTelegram.sendMessage(chatId, `Buscando metricas ${metricPlatform}...`);
          try {
            const metrics = await adsManager.getCampaignMetrics(metricPlatform, metricId, datePreset);
            if (!metrics) {
              await celoTelegram.sendMessage(chatId, 'Sem dados para este periodo.');
              return;
            }

            let metricsText = `📊 Metricas ${metricPlatform.toUpperCase()} (${datePreset}):\n\n` +
              `Impressoes: ${metrics.impressions.toLocaleString()}\n` +
              `Cliques: ${metrics.clicks.toLocaleString()}\n` +
              `CTR: ${metrics.ctr.toFixed(2)}%\n` +
              `CPC: R$ ${metrics.cpc.toFixed(2)}\n` +
              `CPM: R$ ${metrics.cpm.toFixed(2)}\n` +
              `Gasto: R$ ${metrics.spend.toFixed(2)}\n` +
              `Conversoes: ${metrics.conversions}\n` +
              `CPL: R$ ${metrics.costPerResult.toFixed(2)}`;

            // Google-specific metrics
            if (metricPlatform === 'google') {
              if (metrics.roas > 0) metricsText += `\nROAS: ${metrics.roas.toFixed(2)}`;
              if (metrics.conversionsValue > 0) metricsText += `\nValor conversoes: R$ ${metrics.conversionsValue.toFixed(2)}`;
              if (metrics.impressionShare != null) metricsText += `\nImpression Share: ${(metrics.impressionShare * 100).toFixed(1)}%`;
            } else {
              metricsText += `\nAlcance: ${metrics.reach.toLocaleString()}`;
              metricsText += `\nFrequencia: ${metrics.frequency.toFixed(2)}`;
            }

            await celoTelegram.sendMessage(chatId, metricsText);
          } catch (err) {
            await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
          }
          return;
        }

        case '/pause': {
          if (!args) {
            await celoTelegram.sendMessage(chatId, 'Uso: /pause [meta|google] {campaign-id}');
            return;
          }
          const pauseParts = args.trim().split(/\s+/);
          let pausePlatform = 'meta';
          let pauseId = pauseParts[0];
          if (pauseParts[0] === 'meta' || pauseParts[0] === 'google') {
            pausePlatform = pauseParts[0];
            pauseId = pauseParts[1];
          }
          if (!pauseId) {
            await celoTelegram.sendMessage(chatId, 'Uso: /pause [meta|google] {campaign-id}');
            return;
          }
          try {
            await adsManager.updateStatus(pausePlatform, pauseId, 'campaign', false);
            await celoTelegram.sendMessage(chatId, `⏸️ Campanha ${pausePlatform} ${pauseId} pausada.`);
          } catch (err) {
            await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
          }
          return;
        }

        case '/activate': {
          if (!args) {
            await celoTelegram.sendMessage(chatId, 'Uso: /activate [meta|google] {campaign-id}');
            return;
          }
          const actParts = args.trim().split(/\s+/);
          let actPlatform = 'meta';
          let actId = actParts[0];
          if (actParts[0] === 'meta' || actParts[0] === 'google') {
            actPlatform = actParts[0];
            actId = actParts[1];
          }
          if (!actId) {
            await celoTelegram.sendMessage(chatId, 'Uso: /activate [meta|google] {campaign-id}');
            return;
          }
          try {
            await adsManager.updateStatus(actPlatform, actId, 'campaign', true);
            await celoTelegram.sendMessage(chatId, `🟢 Campanha ${actPlatform} ${actId} ativada.`);
          } catch (err) {
            await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
          }
          return;
        }

        case '/scale': {
          if (!args) {
            await celoTelegram.sendMessage(chatId, 'Uso: /scale [meta|google] {campaign-id} {novo-budget-diario}');
            return;
          }
          const scaleParts = args.trim().split(/\s+/);
          let scalePlatform = 'meta';
          let scaleIdx = 0;

          if (scaleParts[0] === 'meta' || scaleParts[0] === 'google') {
            scalePlatform = scaleParts[0];
            scaleIdx = 1;
          }

          const scaleId = scaleParts[scaleIdx];
          const newBudget = parseFloat(scaleParts[scaleIdx + 1]);

          if (!scaleId || isNaN(newBudget)) {
            await celoTelegram.sendMessage(chatId, 'Uso: /scale [meta|google] {campaign-id} {novo-budget-diario}\nEx: /scale 123456 150.00');
            return;
          }

          try {
            // Buscar budget atual para calcular % de mudança
            const campaigns = await adsManager.listCampaigns(scalePlatform, {});
            const campaign = campaigns.find((c) => c.id === scaleId);
            const currentBudget = campaign?.budget?.daily || 0;

            const result = await adsManager.updateBudget(
              scalePlatform, scaleId, 'campaign', currentBudget, newBudget,
              { campaignName: campaign?.name || scaleId, reason: 'Comando /scale' }
            );

            if (result.executed) {
              await celoTelegram.sendMessage(chatId,
                `💰 Budget atualizado: R$ ${currentBudget.toFixed(2)} -> R$ ${newBudget.toFixed(2)}`
              );
            } else if (result.approval && APPROVAL_CHAT_ID) {
              const pct = Math.round(Math.abs((newBudget - currentBudget) / currentBudget) * 100);
              const dir = newBudget > currentBudget ? 'AUMENTO' : 'REDUCAO';
              await celoTelegram.sendInlineKeyboard(
                APPROVAL_CHAT_ID,
                `Celo - Aprovacao de Budget\n\n` +
                `Campanha: ${campaign?.name || scaleId}\n` +
                `Atual: R$ ${currentBudget.toFixed(2)}\n` +
                `Proposta: R$ ${newBudget.toFixed(2)} (${dir} ${pct}%)\n` +
                `Motivo: Comando /scale`,
                celoTelegram.budgetApprovalKeyboard(result.approval.requestId)
              );
              await celoTelegram.sendMessage(chatId,
                `Mudanca de ${pct}% requer aprovacao. Enviado para aprovacao.`
              );
            }
          } catch (err) {
            await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
          }
          return;
        }

        case '/duplicate': {
          if (!args) {
            await celoTelegram.sendMessage(chatId, 'Uso: /duplicate [meta|google] {campaign-id} [novo-nome]');
            return;
          }
          const dupParts = args.trim().split(/\s+/);
          let dupPlatform = 'meta';
          let dupIdx = 0;
          if (dupParts[0] === 'meta' || dupParts[0] === 'google') {
            dupPlatform = dupParts[0];
            dupIdx = 1;
          }
          const dupId = dupParts[dupIdx];
          const dupName = dupParts.slice(dupIdx + 1).join(' ') || undefined;

          await celoTelegram.sendMessage(chatId, `Duplicando campanha ${dupPlatform}...`);
          try {
            const result = await adsManager.duplicateCampaign(dupPlatform, dupId, dupName);
            const groupLabel = dupPlatform === 'google' ? 'Ad Groups' : 'AdSets';
            await celoTelegram.sendMessage(chatId,
              `📋 Campanha ${dupPlatform} duplicada!\n\n` +
              `Nova campanha: ${result.campaignId}\n` +
              `${groupLabel}: ${result.adGroups || result.adSets}\n` +
              `Ads: ${result.ads}\n` +
              `Status: PAUSED`
            );
          } catch (err) {
            await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
          }
          return;
        }

        // ============================================================
        // Google Ads Specific Commands
        // ============================================================

        case '/search-terms':
        case '/searchterms': {
          if (!args) {
            await celoTelegram.sendMessage(chatId, 'Uso: /search-terms {campaign-id} [last_7d|last_30d]');
            return;
          }
          const stParts = args.trim().split(/\s+/);
          const stCampaignId = stParts[0];
          const stDatePreset = stParts[1] || 'last_7d';

          await celoTelegram.sendMessage(chatId, 'Buscando search terms Google Ads...');
          try {
            await adsManager._ensurePlatform('google');
            const googleAdapter = adsManager._getAdapter('google');
            const terms = await googleAdapter.getSearchTerms(stCampaignId, stDatePreset);

            if (!terms || terms.length === 0) {
              await celoTelegram.sendMessage(chatId, 'Nenhum search term encontrado para este periodo.');
              return;
            }

            const top20 = terms.slice(0, 20);
            const lines = top20.map((t, i) => {
              const convIcon = t.conversions > 0 ? '✅' : '';
              return `${i + 1}. "${t.searchTerm}"\n   ${t.clicks} cliques | R$ ${t.spend.toFixed(2)} | ${t.conversions} conv ${convIcon}`;
            });

            await celoTelegram.sendMessage(chatId,
              `🔍 Top Search Terms (${stDatePreset}):\n\n${lines.join('\n\n')}\n\n` +
              `Total: ${terms.length} termos encontrados`
            );
          } catch (err) {
            await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
          }
          return;
        }

        case '/quality-score':
        case '/qs': {
          if (!args) {
            await celoTelegram.sendMessage(chatId, 'Uso: /quality-score {campaign-id}');
            return;
          }
          const qsCampaignId = args.trim().split(/\s+/)[0];

          await celoTelegram.sendMessage(chatId, 'Analisando Quality Scores Google Ads...');
          try {
            await adsManager._ensurePlatform('google');
            const googleAdapter = adsManager._getAdapter('google');
            const keywords = await googleAdapter.getKeywordQualityScores(qsCampaignId);

            if (!keywords || keywords.length === 0) {
              await celoTelegram.sendMessage(chatId, 'Nenhuma keyword encontrada.');
              return;
            }

            const lines = keywords.map((kw) => {
              const qs = kw.qualityScore != null ? `QS: ${kw.qualityScore}/10` : 'QS: N/A';
              const creative = kw.creativeQuality || '-';
              const landing = kw.landingPageQuality || '-';
              const ctr = kw.expectedCtr || '-';
              return `"${kw.keyword}" [${kw.matchType}]\n   ${qs} | Creative: ${creative} | LP: ${landing} | eCTR: ${ctr}`;
            });

            const avgQs = keywords.filter(k => k.qualityScore).reduce((sum, k) => sum + k.qualityScore, 0) /
              (keywords.filter(k => k.qualityScore).length || 1);

            await celoTelegram.sendMessage(chatId,
              `📊 Quality Scores:\n\n${lines.join('\n\n')}\n\n` +
              `Media QS: ${avgQs.toFixed(1)}/10`
            );
          } catch (err) {
            await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
          }
          return;
        }

        case '/adgroups': {
          if (!args) {
            await celoTelegram.sendMessage(chatId, 'Uso: /adgroups {campaign-id}');
            return;
          }
          const agCampaignId = args.trim().split(/\s+/)[0];

          await celoTelegram.sendMessage(chatId, 'Carregando ad groups Google Ads...');
          try {
            await adsManager._ensurePlatform('google');
            const googleAdapter = adsManager._getAdapter('google');
            const adGroups = await googleAdapter.getCampaignAdGroups(agCampaignId);

            if (!adGroups || adGroups.length === 0) {
              await celoTelegram.sendMessage(chatId, 'Nenhum ad group encontrado.');
              return;
            }

            const lines = adGroups.map((ag) => {
              const emoji = AdsManager.statusEmoji(ag.status);
              const bid = ag.cpcBid ? `CPC: R$ ${ag.cpcBid.toFixed(2)}` : '';
              return `${emoji} ${ag.name}\n   ID: ${ag.id} ${bid}`;
            });

            await celoTelegram.sendMessage(chatId,
              `${adGroups.length} Ad Group(s):\n\n${lines.join('\n\n')}`
            );
          } catch (err) {
            await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
          }
          return;
        }

        case '/sync-google': {
          let sgClientId = args?.trim() || null;
          if (!sgClientId) {
            const clients = celoConfig.listClients();
            const googleClients = clients.filter(c => {
              const platforms = Array.isArray(c.adsPlatform) ? c.adsPlatform : [c.adsPlatform];
              return platforms.includes('google') && c.googleCustomerId;
            });
            if (googleClients.length === 1) {
              sgClientId = googleClients[0].id;
            } else if (googleClients.length > 1) {
              const lines = googleClients.map(c => `  /sync-google ${c.id}`);
              await celoTelegram.sendMessage(chatId, `Qual cliente?\n\n${lines.join('\n')}`);
              return;
            } else {
              await celoTelegram.sendMessage(chatId, 'Nenhum cliente com Google Ads configurado.');
              return;
            }
          }

          await celoTelegram.sendMessage(chatId, `Sincronizando Google Ads de ${sgClientId}...`);
          try {
            const result = await adsSyncer.syncGoogleClient(sgClientId);
            if (result.skipped) {
              await celoTelegram.sendMessage(chatId, `Sync pulado: ${result.reason || 'em andamento'}`);
            } else if (result.error) {
              await celoTelegram.sendMessage(chatId, `Erro no sync: ${result.error}`);
            } else {
              await celoTelegram.sendMessage(chatId,
                `✅ Google Ads sincronizado!\n\n` +
                `Campanhas: ${result.campaigns}\n` +
                `Ad Groups: ${result.adgroups}\n` +
                `Ads: ${result.ads}\n` +
                `Linhas diarias: ${result.dailyRows}\n` +
                `Tempo: ${(result.durationMs / 1000).toFixed(1)}s`
              );
            }
          } catch (err) {
            await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
          }
          return;
        }

        case '/google-status': {
          const isReady = adsSyncer.isGoogleReady();
          const client = celoConfig.getClient('dr-erico-servano');
          const hasCustomerId = !!(client?.googleCustomerId);

          let statusText = `🔧 Google Ads Status:\n\n`;
          statusText += `API inicializada: ${isReady ? '✅' : '❌'}\n`;
          statusText += `Customer ID configurado: ${hasCustomerId ? '✅ ' + client.googleCustomerId : '❌ Vazio'}\n`;

          if (!isReady) {
            statusText += `\n⚠️ Credenciais Google Ads nao configuradas no .env\n`;
            statusText += `Variaveis necessarias:\n`;
            statusText += `- GOOGLE_ADS_CLIENT_ID\n`;
            statusText += `- GOOGLE_ADS_CLIENT_SECRET\n`;
            statusText += `- GOOGLE_ADS_DEVELOPER_TOKEN\n`;
            statusText += `- GOOGLE_ADS_REFRESH_TOKEN\n`;
            statusText += `\nExecute: node setup-google-ads-auth.js`;
          }

          await celoTelegram.sendMessage(chatId, statusText);
          return;
        }

        case '/autooptimize': {
          // Aceita: /autooptimize ou /autooptimize {clientId}
          let optClientId = args.trim() || null;
          if (!optClientId) {
            const clients = celoConfig.listClients();
            if (clients.length === 1) {
              optClientId = clients[0].id;
            } else if (clients.length > 1) {
              const lines = clients.map((c) => `  /autooptimize ${c.id}`);
              await celoTelegram.sendMessage(chatId, `Qual cliente?\n\n${lines.join('\n')}`);
              return;
            }
          }

          await celoTelegram.sendMessage(chatId, 'Analisando campanhas...');
          try {
            const analysis = await optimizer.analyze(optClientId);

            if (analysis.suggestions.length === 0) {
              await celoTelegram.sendMessage(chatId, 'Nenhuma sugestao de otimizacao.\n\nTodas as campanhas dentro dos parametros.');
              return;
            }

            // Mostrar resumo
            let msg = `Otimizacao - ${analysis.summary}\n`;
            msg += `Benchmarks: CTR medio ${analysis.benchmarks.avgCTR.toFixed(2)}% | CPL medio R$ ${analysis.benchmarks.avgCPL.toFixed(2)}\n`;

            // Mostrar top 5 sugestões com botões
            const top = analysis.suggestions.slice(0, 5);
            for (let i = 0; i < top.length; i++) {
              const s = top[i];
              const prio = { high: '🔴', medium: '🟡', low: '🟢' }[s.priority];
              msg += `\n${prio} ${s.action}\n   ${s.reason}`;

              // Salvar para callback
              const optId = `${optClientId}-${i}-${Date.now()}`;
              pendingOptimizations.set(optId, s);
            }

            // Botões de ação para sugestões high/medium
            const actionable = top.filter((s) => s.type === 'pause' || s.type === 'scale');
            if (actionable.length > 0) {
              const buttons = actionable.slice(0, 3).map((s, i) => {
                const optId = `${optClientId}-${top.indexOf(s)}-${Date.now()}`;
                pendingOptimizations.set(optId, s);
                const label = s.type === 'pause' ? `⏸️ Pausar` : `💰 Escalar`;
                return [{ text: `${label}: ${s.target.slice(0, 30)}`, callback_data: `opt:exec:${optId}` }];
              });
              buttons.push([{ text: 'Executar todas', callback_data: `opt:all:${optClientId}` }]);
              await celoTelegram.sendInlineKeyboard(chatId, msg, buttons);
            } else {
              await celoTelegram.sendMessage(chatId, msg);
            }
          } catch (err) {
            await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
          }
          return;
        }

        case '/audiences': {
          const audPlatform = args.toLowerCase() || 'meta';
          await celoTelegram.sendMessage(chatId, 'Carregando publicos...');
          try {
            const audiences = await adsManager.listAudiences(audPlatform);
            if (audiences.length === 0) {
              await celoTelegram.sendMessage(chatId, 'Nenhum publico personalizado.');
            } else {
              const lines = audiences.slice(0, 20).map((a) =>
                `- ${a.name} (${a.size.toLocaleString()} pessoas) [${a.subtype}]`
              );
              await celoTelegram.sendMessage(chatId, `${audiences.length} publico(s):\n\n${lines.join('\n')}`);
            }
          } catch (err) {
            await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
          }
          return;
        }
      }
    }

    // ============================================================
    // Áudio / Voice — transcrever e processar como texto
    // ============================================================
    const voiceOrAudio = message.voice || message.audio;
    if (voiceOrAudio && autopilot) {
      try {
        const duration = voiceOrAudio.duration || 0;
        await celoTelegram.sendMessage(chatId, `Transcrevendo audio (${duration}s)...`);

        const fileUrl = await celoTelegram.getFileUrl(voiceOrAudio.file_id);
        if (!fileUrl) {
          await celoTelegram.sendMessage(chatId, 'Erro: nao consegui acessar o arquivo de audio.');
          return;
        }

        const transcription = await transcribeAudio(fileUrl);
        if (!transcription || transcription.length < 2) {
          await celoTelegram.sendMessage(chatId, 'Nao consegui transcrever o audio. Tente novamente ou envie em texto.');
          return;
        }

        console.log(`Celo: Audio ${duration}s transcrito: "${transcription.substring(0, 80)}..."`);

        // Detectar cliente
        let detectedClientId = null;
        const clients = celoConfig.listClients();
        for (const c of clients) {
          if (transcription.toLowerCase().includes(c.name.toLowerCase())) {
            detectedClientId = c.id;
            break;
          }
        }
        if (!detectedClientId && clients.length === 1) {
          detectedClientId = clients[0].id;
        }
        if (!detectedClientId) {
          detectedClientId = memoryStore.getLastClientId(String(chatId));
        }

        // Salvar na memória
        memoryStore.addMessage(String(chatId), 'user', transcription, detectedClientId);

        // Extração de conhecimento em background
        if (detectedClientId && transcription.length >= 20) {
          const clientName = clients.find(c => c.id === detectedClientId)?.name || detectedClientId;
          knowledgeExtractor.extractAndSave(transcription, detectedClientId, clientName).catch(() => {});
        }

        // Responder via IA
        const response = await autopilot.chatWithMemory(transcription, detectedClientId, String(chatId));
        memoryStore.addMessage(String(chatId), 'assistant', response, detectedClientId);

        if (response.length > 4000) {
          const parts = response.match(/[\s\S]{1,4000}/g);
          for (const part of parts) {
            await celoTelegram.sendMessage(chatId, part);
          }
        } else {
          await celoTelegram.sendMessage(chatId, response);
        }
      } catch (err) {
        console.error('Celo audio error:', err.message);
        await celoTelegram.sendMessage(chatId, `Erro ao processar audio: ${err.message}`);
      }
      return;
    }

    // ============================================================
    // Chat — mensagens de texto livres (IA conversacional com memória)
    // ============================================================
    if (message.text && !message.text.startsWith('/') && autopilot) {
      const question = message.text.trim();
      if (question.length < 2) return;

      // Detectar se mencionou algum cliente
      let detectedClientId = null;
      const clients = celoConfig.listClients();
      for (const c of clients) {
        if (question.toLowerCase().includes(c.name.toLowerCase())) {
          detectedClientId = c.id;
          break;
        }
      }
      // Se só tem 1 cliente, usar ele por padrão
      if (!detectedClientId && clients.length === 1) {
        detectedClientId = clients[0].id;
      }
      // Fallback: último cliente da conversa
      if (!detectedClientId) {
        detectedClientId = memoryStore.getLastClientId(String(chatId));
      }

      // Salvar mensagem do user na memória
      memoryStore.addMessage(String(chatId), 'user', question, detectedClientId);

      // Extração de conhecimento em background (não bloqueia resposta)
      if (detectedClientId && question.length >= 20) {
        const clientName = clients.find(c => c.id === detectedClientId)?.name || detectedClientId;
        knowledgeExtractor.extractAndSave(question, detectedClientId, clientName).catch(() => {});
      }

      try {
        await celoTelegram.sendMessage(chatId, 'Analisando...');
        const response = await autopilot.chatWithMemory(question, detectedClientId, String(chatId));

        // Salvar resposta do assistant na memória
        memoryStore.addMessage(String(chatId), 'assistant', response, detectedClientId);

        // Telegram tem limite de 4096 chars por mensagem
        if (response.length > 4000) {
          const parts = response.match(/[\s\S]{1,4000}/g);
          for (const part of parts) {
            await celoTelegram.sendMessage(chatId, part);
          }
        } else {
          await celoTelegram.sendMessage(chatId, response);
        }
      } catch (err) {
        console.error('Celo chat error:', err.message);
        await celoTelegram.sendMessage(chatId, `Erro ao processar: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('Celo webhook error:', err);
  }
});

// ============================================================
// Callback handler — aprovação de budget + naming
// ============================================================
async function handleCeloCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const queryId = callbackQuery.id;
  const data = callbackQuery.data;
  const [prefix, action, value] = data.split(':');

  if (prefix === 'celo') {
    const approval = celoConversation.getApproval(value);
    if (!approval) {
      await celoTelegram.answerCallbackQuery(queryId, 'Solicitacao expirada.');
      return;
    }

    switch (action) {
      case 'approve': {
        celoConversation.resolveApproval(value, 'approved');
        await celoTelegram.answerCallbackQuery(queryId, 'Budget aprovado');

        // Executar mudança real se tiver _action
        let actionMsg = '';
        if (approval._action) {
          try {
            await adsManager.executeBudgetChange(approval._action);
            actionMsg = '\nBudget atualizado na plataforma.';
          } catch (err) {
            actionMsg = `\nErro ao atualizar: ${err.message}`;
          }
        }

        await celoTelegram.editMessageText(chatId, callbackQuery.message.message_id,
          `APROVADO - ${approval.clientName}\n` +
          `Campanha: ${approval.campaign}\n` +
          `R$ ${approval.currentBudget.toFixed(2)} -> R$ ${approval.proposedBudget.toFixed(2)}\n` +
          `Motivo: ${approval.reason}` + actionMsg
        );
        console.log(`Celo: Budget APROVADO - ${approval.campaign} (${approval.clientName})`);
        break;
      }
      case 'reject': {
        celoConversation.resolveApproval(value, 'rejected');
        await celoTelegram.answerCallbackQuery(queryId, 'Budget rejeitado');
        await celoTelegram.editMessageText(chatId, callbackQuery.message.message_id,
          `REJEITADO - ${approval.clientName}\n` +
          `Campanha: ${approval.campaign}\n` +
          `Mantido em R$ ${approval.currentBudget.toFixed(2)}`
        );
        console.log(`Celo: Budget REJEITADO - ${approval.campaign} (${approval.clientName})`);
        break;
      }
      case 'details': {
        await celoTelegram.answerCallbackQuery(queryId);
        const dir = approval.direction === 'increase' ? 'AUMENTO' : 'REDUCAO';
        await celoTelegram.sendMessage(chatId,
          `Detalhes - ${approval.clientName}\n\n` +
          `Campanha: ${approval.campaign}\n` +
          `Budget atual: R$ ${approval.currentBudget.toFixed(2)}\n` +
          `Proposta: R$ ${approval.proposedBudget.toFixed(2)} (${dir} ${Math.abs(approval.pctChange)}%)\n\n` +
          `Justificativa: ${approval.reason}`
        );
        break;
      }
    }
  } else if (prefix === 'opt') {
    await celoTelegram.answerCallbackQuery(queryId);

    if (action === 'exec') {
      // Executar uma sugestão específica
      const suggestion = pendingOptimizations.get(value);
      if (!suggestion) {
        await celoTelegram.sendMessage(chatId, 'Sugestao expirada.');
        return;
      }
      try {
        const result = await optimizer.execute(suggestion);
        pendingOptimizations.delete(value);
        const emoji = result.executed ? '✅' : '⏳';
        await celoTelegram.sendMessage(chatId, `${emoji} ${result.message}`);
      } catch (err) {
        await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
      }
    } else if (action === 'all') {
      // Executar todas as sugestões actionable do cliente
      const clientId = value;
      const toExecute = [];
      for (const [id, s] of pendingOptimizations) {
        if (id.startsWith(clientId) && (s.type === 'pause' || s.type === 'scale')) {
          toExecute.push({ id, suggestion: s });
        }
      }
      if (toExecute.length === 0) {
        await celoTelegram.sendMessage(chatId, 'Nenhuma acao pendente.');
        return;
      }
      let msg = `Executando ${toExecute.length} acoes:\n`;
      for (const { id, suggestion } of toExecute) {
        try {
          const result = await optimizer.execute(suggestion);
          pendingOptimizations.delete(id);
          msg += `\n✅ ${suggestion.target}: ${result.message}`;
        } catch (err) {
          msg += `\n❌ ${suggestion.target}: ${err.message}`;
        }
      }
      await celoTelegram.sendMessage(chatId, msg);
    }
  } else if (prefix === 'wiz') {
    await celoTelegram.answerCallbackQuery(queryId);
    const session = campaignWizard.getSession(chatId);
    if (!session) {
      await celoTelegram.sendMessage(chatId, 'Sessao expirada. Use /create para iniciar.');
      return;
    }

    switch (action) {
      case 'client': {
        campaignWizard.setStepValue(chatId, 'clientId', value);
        break;
      }
      case 'obj': {
        const naming = require('./lib/adtag-naming');
        const objective = naming.CAMPAIGN_OBJECTIVES[parseInt(value, 10)];
        campaignWizard.setStepValue(chatId, 'objective', objective);
        break;
      }
      case 'budget': {
        campaignWizard.setStepValue(chatId, 'budgetType', value);
        break;
      }
      case 'amount': {
        campaignWizard.setStepValue(chatId, 'dailyBudget', parseFloat(value));
        break;
      }
      case 'gender': {
        campaignWizard.setStepValue(chatId, 'gender', value);
        break;
      }
      case 'age': {
        campaignWizard.setStepValue(chatId, 'ageRange', value);
        break;
      }
      case 'plat': {
        campaignWizard.setStepValue(chatId, 'placements', value.split('+'));
        break;
      }
      case 'interest': {
        campaignWizard.setStepValue(chatId, 'interest', value);
        break;
      }
      case 'confirm': {
        if (value === 'yes') {
          const finalData = campaignWizard.getFinalData(session);
          campaignWizard.deleteSession(chatId);
          await celoTelegram.sendMessage(chatId, 'Criando campanha + conjunto de anuncios...');
          try {
            // 1. Criar campanha
            const campaignResult = await adsManager.createCampaign('meta', {
              clientId: finalData.clientId,
              name: finalData.campaign.name,
              objective: finalData.campaign.objective,
              dailyBudget: finalData.campaign.budgetType === 'CBO' ? finalData.campaign.dailyBudget : undefined,
            });

            // 2. Criar adset com targeting
            let adsetMsg = '';
            try {
              const metaAds = adsManager._getAdapter('meta');
              const { adAccountId } = adsManager._resolveClient(finalData.clientId);
              const adsetResult = await metaAds.createAdSet({
                campaignId: campaignResult.id,
                name: finalData.adset.name,
                dailyBudget: finalData.adset.dailyBudget || finalData.campaign.dailyBudget,
                targeting: finalData.adset.targeting,
                adAccountId,
              });
              adsetMsg = `\nAdSet: ${adsetResult.id} (${finalData.adset.name})`;
            } catch (adsetErr) {
              adsetMsg = `\nAdSet: Erro - ${adsetErr.message}`;
              console.error('Wizard: Erro ao criar AdSet:', adsetErr.message);
            }

            await celoTelegram.sendMessage(chatId,
              `Campanha criada!\n\n` +
              `Campanha: ${campaignResult.id}\n` +
              `Nome: ${finalData.campaign.name}\n` +
              `Budget: R$ ${finalData.campaign.dailyBudget.toFixed(2)}/dia` +
              adsetMsg +
              `\nStatus: PAUSED\n\n` +
              `Use /activate ${campaignResult.id} para ativar.`
            );
          } catch (err) {
            await celoTelegram.sendMessage(chatId, `Erro ao criar: ${err.message}`);
          }
        } else {
          campaignWizard.deleteSession(chatId);
          await celoTelegram.sendMessage(chatId, 'Criacao cancelada.');
        }
        return;
      }
    }

    // Mostrar próximo step
    const updatedSession = campaignWizard.getSession(chatId);
    if (updatedSession) {
      const prompt = campaignWizard.getStepPrompt(updatedSession);
      if (prompt.keyboard) {
        await celoTelegram.sendInlineKeyboard(chatId, prompt.text, prompt.keyboard);
      } else {
        await celoTelegram.sendMessage(chatId, prompt.text);
      }
    }
  } else if (prefix === 'camp') {
    await celoTelegram.answerCallbackQuery(queryId);
    const campaignId = value;

    switch (action) {
      case 'select': {
        // Mostrar ações para a campanha
        try {
          const campaigns = await adsManager.listCampaigns('meta', {});
          const campaign = campaigns.find((c) => c.id === campaignId);
          const status = campaign?.status || 'PAUSED';
          const budget = campaign?.budget?.daily ? `R$ ${campaign.budget.daily.toFixed(2)}/dia` : '-';
          await celoTelegram.sendInlineKeyboard(chatId,
            `${campaign?.name || campaignId}\n` +
            `Status: ${AdsManager.statusEmoji(status)} ${status}\n` +
            `Budget: ${budget}\n` +
            `Objetivo: ${campaign?.objective || '-'}`,
            celoTelegram.campaignActionKeyboard(campaignId, status)
          );
        } catch (err) {
          await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
        }
        break;
      }
      case 'metrics': {
        await celoTelegram.sendMessage(chatId, 'Buscando metricas...');
        try {
          const metrics = await adsManager.getCampaignMetrics('meta', campaignId);
          if (!metrics) {
            await celoTelegram.sendMessage(chatId, 'Sem dados.');
            return;
          }
          await celoTelegram.sendMessage(chatId,
            `Metricas (last_7d):\n\n` +
            `Impressoes: ${metrics.impressions.toLocaleString()}\n` +
            `Cliques: ${metrics.clicks.toLocaleString()}\n` +
            `CTR: ${metrics.ctr.toFixed(2)}%\n` +
            `CPC: R$ ${metrics.cpc.toFixed(2)}\n` +
            `Gasto: R$ ${metrics.spend.toFixed(2)}\n` +
            `Frequencia: ${metrics.frequency.toFixed(2)}\n` +
            `Conversoes: ${metrics.conversions}\n` +
            `CPL: R$ ${metrics.costPerResult.toFixed(2)}`
          );
        } catch (err) {
          await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
        }
        break;
      }
      case 'pause': {
        try {
          await adsManager.updateStatus('meta', campaignId, 'campaign', false);
          await celoTelegram.sendMessage(chatId, `⏸️ Campanha ${campaignId} pausada.`);
        } catch (err) {
          await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
        }
        break;
      }
      case 'activate': {
        try {
          await adsManager.updateStatus('meta', campaignId, 'campaign', true);
          await celoTelegram.sendMessage(chatId, `🟢 Campanha ${campaignId} ativada.`);
        } catch (err) {
          await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
        }
        break;
      }
      case 'scale': {
        await celoTelegram.sendMessage(chatId, `Digite o novo budget diario para ${campaignId}:\nEx: 150.00`);
        scaleWaiting.set(chatId, { campaignId, platform: 'meta' });
        break;
      }
      case 'duplicate': {
        await celoTelegram.sendMessage(chatId, 'Duplicando...');
        try {
          const result = await adsManager.duplicateCampaign('meta', campaignId);
          await celoTelegram.sendMessage(chatId,
            `📋 Duplicada!\nNova: ${result.campaignId}\nAdSets: ${result.adSets} | Ads: ${result.ads}\nStatus: PAUSED`
          );
        } catch (err) {
          await celoTelegram.sendMessage(chatId, `Erro: ${err.message}`);
        }
        break;
      }
    }
  } else if (prefix === 'auto') {
    // Autopilot approval/rejection callbacks
    const approval = celoConversation.getApproval(value);
    if (!approval) {
      await celoTelegram.answerCallbackQuery(queryId, 'Solicitacao expirada.');
      return;
    }

    if (action === 'approve') {
      celoConversation.resolveApproval(value, 'approved');
      await celoTelegram.answerCallbackQuery(queryId, 'Processando...');

      const act = approval._action;
      let executed = false;
      let resultMsg = '';

      if (!act) {
        resultMsg = 'Sem acao vinculada a esta aprovacao.';
      } else {
        try {
          switch (act.type) {
            case 'pause':
              await adsManager.updateStatus(act.platform || 'meta', act.campaignId, 'campaign', false);
              executed = true;
              resultMsg = `Campanha pausada com sucesso na conta de anuncios.`;
              break;
            case 'scale': {
              const scaleResult = await adsManager.updateBudget(
                act.platform || 'meta',
                act.campaignId || act.objectId,
                act.objectType || 'campaign',
                approval.currentBudget,
                act.newBudget,
                { campaignName: approval.campaign, reason: approval.reason }
              );
              if (scaleResult.executed) {
                executed = true;
                resultMsg = `Budget atualizado: R$ ${approval.currentBudget.toFixed(2)} -> R$ ${act.newBudget.toFixed(2)}`;
              } else {
                resultMsg = `Budget enviado mas nao executado: ${scaleResult.message || 'motivo desconhecido'}`;
              }
              break;
            }
            case 'create':
              if (act.params) {
                const createResult = await adsManager.createCampaign(act.platform || 'meta', {
                  clientId: approval.clientId,
                  name: act.params.name || approval.campaign,
                  objective: act.params.objective || 'OUTCOME_LEADS',
                  dailyBudget: act.params.dailyBudget || approval.proposedBudget,
                });
                executed = true;
                resultMsg = `Campanha criada (PAUSED): ID ${createResult.id}`;
              } else {
                resultMsg = 'Erro: parametros de criacao ausentes.';
              }
              break;
            default:
              resultMsg = `Tipo de acao desconhecido: ${act.type}`;
          }
        } catch (err) {
          resultMsg = `ERRO ao executar: ${err.message}`;
          console.error(`Autopilot exec error [${act.type}]:`, err.message);
        }
      }

      const statusIcon = executed ? '✅' : '⚠️';
      await celoTelegram.editMessageText(chatId, callbackQuery.message.message_id,
        `${statusIcon} APROVADO — ${approval.clientName}\n\n` +
        `Campanha: ${approval.campaign}\n` +
        `Acao: ${act?.type || 'nenhuma'}\n` +
        `Justificativa: ${approval.reason}\n\n` +
        `Resultado: ${resultMsg}`
      );
      console.log(`Autopilot: APROVADO [${executed ? 'OK' : 'FALHA'}] — ${approval.campaign} (${approval.clientName}) — ${resultMsg}`);

    } else if (action === 'reject') {
      celoConversation.resolveApproval(value, 'rejected');
      await celoTelegram.answerCallbackQuery(queryId, 'Rejeitado');
      await celoTelegram.editMessageText(chatId, callbackQuery.message.message_id,
        `❌ REJEITADO — ${approval.clientName}\n\n` +
        `Campanha: ${approval.campaign}\n` +
        `Acao cancelada. Nenhuma alteracao feita na conta de anuncios.`
      );
      console.log(`Autopilot: REJEITADO — ${approval.campaign} (${approval.clientName})`);

    } else if (action === 'justify') {
      await celoTelegram.answerCallbackQuery(queryId, 'Gerando justificativa...');

      // Puxar dados reais da campanha + CRM para gerar justificativa detalhada
      try {
        const prompt = `Voce e o Celo, gestor de trafego senior. O dono da agencia quer entender POR QUE voce esta propondo esta acao. Explique com DADOS CONCRETOS.

ACAO PROPOSTA: ${approval._action?.type || 'desconhecida'}
CAMPANHA: ${approval.campaign}
CLIENTE: ${approval.clientName}
CONTEXTO DA ANALISE: ${approval._analysisContext || 'Sem contexto adicional'}

Responda de forma direta e analitica:
1. Qual o problema/oportunidade identificado (com numeros)
2. Quais metricas sustentam essa decisao
3. O que acontece se NAO tomar essa acao
4. Qual o resultado esperado

Use os dados abaixo para embasar sua resposta.`;

        const response = await autopilot.chat(
          prompt + `\n\nCampanha em questao: ${approval.campaign}`,
          approval.clientId
        );

        // Telegram limite 4096 chars
        const justification = response.length > 3900
          ? response.slice(0, 3900) + '\n\n(truncado)'
          : response;

        await celoTelegram.sendMessage(chatId,
          `JUSTIFICATIVA — ${approval.clientName}\n` +
          `Campanha: ${approval.campaign}\n` +
          `Acao proposta: ${approval._action?.type || '-'}\n\n` +
          justification
        );
      } catch (err) {
        // Fallback: mostrar justificativa salva na análise
        await celoTelegram.sendMessage(chatId,
          `JUSTIFICATIVA — ${approval.clientName}\n` +
          `Campanha: ${approval.campaign}\n\n` +
          (approval._analysisContext || approval.reason || 'Sem justificativa detalhada disponivel.')
        );
      }
    }
  } else if (prefix === 'naming') {
    await celoTelegram.answerCallbackQuery(queryId);
    switch (action) {
      case 'campaign':
        await celoTelegram.sendMessage(chatId,
          'Campanha - envie no formato:\n' +
          '/gencampaign {nome} | {objetivo} | {CBO ou ABO}\n\n' +
          'Ex: /gencampaign Dr Erico - Implantes | Formulario Instantaneo | CBO'
        );
        break;
      case 'audience':
        await celoTelegram.sendMessage(chatId,
          'Publico - envie no formato:\n' +
          '/genaudience {N} | {genero} | {idadeMin}-{idadeMax} | {posicionamentos} | {interesse} | {local}\n\n' +
          'Ex: /genaudience 1 | Todos | 25-55 | FB+IG | Implante Dentario | Sao Paulo - SP'
        );
        break;
      case 'creative':
        await celoTelegram.sendMessage(chatId,
          'Criativo - envie no formato:\n' +
          '/gencreative {N} | {formato} | {hook} | {cta}\n\n' +
          'Ex: /gencreative 1 | Video | Antes e Depois | Agendar'
        );
        break;
    }
  }
}

// ============================================================
// Ads Campaigns (API)
// ============================================================

app.get('/api/ads/campaigns', async (req, res) => {
  const { platform = 'meta', clientId } = req.query;
  try {
    const campaigns = await adsManager.listCampaigns(platform, {
      statusFilter: ['ACTIVE', 'PAUSED'],
      clientId,
    });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ads/campaigns/:id/metrics', async (req, res) => {
  const { platform = 'meta', dateRange = 'last_7d' } = req.query;
  try {
    const metrics = await adsManager.getCampaignMetrics(platform, req.params.id, dateRange);
    res.json(metrics || { error: 'Sem dados' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ads/campaigns', async (req, res) => {
  const { platform = 'meta', name, objective, dailyBudget, specialAdCategories } = req.body;
  if (!name || !objective) return res.status(400).json({ error: 'name e objective são obrigatórios' });
  try {
    const result = await adsManager.createCampaign(platform, { name, objective, dailyBudget, specialAdCategories });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/ads/campaigns/:id', async (req, res) => {
  const { platform = 'meta', status, dailyBudget } = req.body;
  try {
    if (status != null) {
      await adsManager.updateStatus(platform, req.params.id, 'campaign', status === 'ACTIVE');
    }
    if (dailyBudget != null) {
      const adapter = adsManager._getAdapter(platform);
      await adapter.updateBudget(req.params.id, 'campaign', dailyBudget);
    }
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ads/campaigns/:id/duplicate', async (req, res) => {
  const { platform = 'meta', newName } = req.body;
  try {
    const result = await adsManager.duplicateCampaign(platform, req.params.id, newName);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ads/audiences', async (req, res) => {
  const { platform = 'meta' } = req.query;
  try {
    const audiences = await adsManager.listAudiences(platform);
    res.json(audiences);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ads/audiences', async (req, res) => {
  const { platform = 'meta', name, description, subtype } = req.body;
  if (!name) return res.status(400).json({ error: 'name é obrigatório' });
  try {
    const result = await adsManager.createAudience(platform, { name, description, subtype });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Optimization (API)
// ============================================================
// Aceita GET e POST
app.all('/api/ads/optimize/:clientId', async (req, res) => {
  const cplTarget = req.body?.cplTarget || req.query?.cplTarget;
  try {
    const analysis = await optimizer.analyze(req.params.clientId, { cplTarget });
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Autopilot (API)
// ============================================================

app.get('/api/autopilot/status', (req, res) => {
  if (!autopilot) return res.json({ running: false, clients: [] });
  res.json(autopilot.getStatus());
});

app.post('/api/autopilot/start', (req, res) => {
  if (!autopilot) return res.status(500).json({ error: 'Autopilot nao inicializado' });
  autopilot.start();
  res.json({ status: 'started' });
});

app.post('/api/autopilot/stop', (req, res) => {
  if (!autopilot) return res.status(500).json({ error: 'Autopilot nao inicializado' });
  autopilot.stop();
  res.json({ status: 'stopped' });
});

app.post('/api/autopilot/run/:clientId', async (req, res) => {
  if (!autopilot) return res.status(500).json({ error: 'Autopilot nao inicializado' });
  try {
    await autopilot.runCycle(req.params.clientId);
    res.json({ status: 'ok', clientId: req.params.clientId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/autopilot/briefing/:clientId', async (req, res) => {
  if (!autopilot) return res.status(500).json({ error: 'Autopilot nao inicializado' });
  try {
    await autopilot.morningBriefing(req.params.clientId);
    res.json({ status: 'ok', clientId: req.params.clientId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/autopilot/summary/:clientId', async (req, res) => {
  if (!autopilot) return res.status(500).json({ error: 'Autopilot nao inicializado' });
  try {
    await autopilot.eveningSummary(req.params.clientId);
    res.json({ status: 'ok', clientId: req.params.clientId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/autopilot/toggle/:clientId', (req, res) => {
  const client = celoConfig.getClient(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Cliente nao encontrado' });

  const cfg = celoConfig.getConfig();
  if (!cfg.clients[req.params.clientId].autopilot) {
    cfg.clients[req.params.clientId].autopilot = {
      enabled: false,
      checkIntervalHours: 4,
      morningBriefing: '08:00',
      eveningSummary: '20:00',
    };
  }
  cfg.clients[req.params.clientId].autopilot.enabled = !cfg.clients[req.params.clientId].autopilot.enabled;
  celoConfig.saveConfig();

  const enabled = cfg.clients[req.params.clientId].autopilot.enabled;
  console.log(`Autopilot: ${client.name} — ${enabled ? 'HABILITADO' : 'DESABILITADO'}`);

  // Se habilitou e autopilot está rodando, reiniciar para pegar novo cliente
  if (enabled && autopilot) {
    autopilot.stop();
    autopilot.start();
  }

  res.json({ clientId: req.params.clientId, autopilot: cfg.clients[req.params.clientId].autopilot });
});

// ============================================================
// Optimizer & Health Score (API)
// ============================================================

// Health score + sugestões do optimizer (rules-based, sem LLaMA)
app.get('/api/autopilot/health/:clientId', async (req, res) => {
  try {
    const result = await optimizer.analyze(req.params.clientId, {
      cplTarget: celoConfig.getClient(req.params.clientId)?.budget?.cplTarget,
    });
    res.json({
      health: result.health,
      pacing: result.pacing,
      suggestions: result.suggestions,
      benchmarks: result.benchmarks,
      summary: result.summary,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Executar uma sugestão do optimizer
app.post('/api/autopilot/execute-suggestion', async (req, res) => {
  try {
    const { suggestion } = req.body;
    if (!suggestion) return res.status(400).json({ error: 'suggestion required' });
    const result = await optimizer.execute(suggestion);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Campanhas Exportadas (API)
// ============================================================

app.get('/api/campaigns/export/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await campaignsExporter.exportClientCampaigns(clientId);
    res.json({
      success: true,
      message: `Campanhas de ${clientId} exportadas com sucesso`,
      timestamp: result.exportedAt,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.get('/api/campaigns/data/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const dataPath = path.join(__dirname, 'docs', 'clientes', clientId, 'campaigns', 'data.json');

    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({
        error: 'Dados de campanhas não encontrados. Execute /api/campaigns/export/:clientId primeiro.',
      });
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/campaigns/summary/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const markdownPath = path.join(__dirname, 'docs', 'clientes', clientId, 'campaigns', 'RESUMO.md');

    if (!fs.existsSync(markdownPath)) {
      return res.status(404).json({
        error: 'Resumo de campanhas não encontrado. Execute /api/campaigns/export/:clientId primeiro.',
      });
    }

    const markdown = fs.readFileSync(markdownPath, 'utf-8');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(markdown);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/campaigns/sync/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    // Enfileirar para sincronização (background)
    setImmediate(async () => {
      try {
        await campaignsExporter.exportClientCampaigns(clientId);
        console.log(`Campanhas sincronizadas: ${clientId}`);
      } catch (err) {
        console.error(`Erro ao sincronizar ${clientId}:`, err.message);
      }
    });

    res.json({
      success: true,
      message: `Sincronização de ${clientId} enfileirada`,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.post('/api/campaigns/sync-all', async (req, res) => {
  try {
    // Sincronizar todos os clientes em background
    setImmediate(async () => {
      try {
        const results = await campaignsExporter.syncAllClients();
        console.log('Sincronização completa de todas as campanhas');
        results.forEach((result, clientId) => {
          console.log(`  - ${clientId}: ${result.success ? '✅' : '❌'}`);
        });
      } catch (err) {
        console.error('Erro ao sincronizar campanhas:', err.message);
      }
    });

    res.json({
      success: true,
      message: 'Sincronização de todos os clientes enfileirada',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.get('/api/campaigns/sync-status', (req, res) => {
  try {
    const status = campaignsExporter.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ads/sync-status', (req, res) => {
  try {
    const status = adsSyncer.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/campaigns/export-to-sheets/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const client = celoConfig.getClient(clientId);

    if (!client.spreadsheetId) {
      return res.status(400).json({
        error: `Cliente ${clientId} não tem spreadsheetId configurado`,
      });
    }

    // Exportar campanhas e salvar em Google Sheets
    const result = await campaignsExporter.exportClientCampaigns(clientId);

    res.json({
      success: true,
      message: `Campanhas de ${clientId} exportadas para Google Sheets`,
      timestamp: result.exportedAt,
      campaigns: result.meta.campaigns.length,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${client.spreadsheetId}/edit#gid=0`,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ============================================================
// Clientes (API)
// ============================================================
app.get('/api/clients', (req, res) => {
  res.json(celoConfig.listClients());
});

app.get('/api/clients/:clientId', (req, res) => {
  const client = celoConfig.getClient(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Cliente nao encontrado' });
  res.json({ id: req.params.clientId, ...client });
});

app.put('/api/clients/:clientId', (req, res) => {
  const client = celoConfig.getClient(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Cliente nao encontrado' });

  const { monthly, testingPercentage } = req.body;
  if (monthly != null) celoConfig.setClientBudget(req.params.clientId, monthly, testingPercentage);
  res.json({ status: 'ok', budget: celoConfig.getClient(req.params.clientId).budget });
});

app.post('/api/clients', (req, res) => {
  const { clientId, name, spreadsheetId, monthly, testingPercentage, agency } = req.body;
  if (!clientId || !name) return res.status(400).json({ error: 'clientId e name sao obrigatorios' });

  celoConfig.addClient(clientId, { name, spreadsheetId, monthly, testingPercentage, agency });
  res.status(201).json({ status: 'ok', clientId });
});

// ============================================================
// Budget (API)
// ============================================================
app.get('/api/budget/:clientId', (req, res) => {
  try {
    const budget = celo.getClientBudget(req.params.clientId);
    res.json(budget);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/budget-request', async (req, res) => {
  const { clientId, campaign, currentBudget, proposedBudget, reason } = req.body;

  if (!clientId || !campaign || currentBudget == null || proposedBudget == null) {
    return res.status(400).json({ error: 'clientId, campaign, currentBudget e proposedBudget sao obrigatorios' });
  }

  const client = celoConfig.getClient(clientId);
  if (!client) return res.status(404).json({ error: 'Cliente nao encontrado' });

  const proposal = celo.createBudgetProposal(clientId, {
    campaign,
    currentBudget: Number(currentBudget),
    proposedBudget: Number(proposedBudget),
    reason: reason || 'Sem justificativa informada',
  });

  const approval = celoConversation.createApproval(proposal);

  if (!APPROVAL_CHAT_ID) {
    return res.status(500).json({ error: 'CELO_APPROVAL_CHAT_ID nao configurado' });
  }

  const dir = proposal.direction === 'increase' ? 'AUMENTO' : 'REDUCAO';
  const msg = [
    `Celo - Solicitacao de Budget`,
    ``,
    `Cliente: ${proposal.clientName}`,
    `Campanha: ${proposal.campaign}`,
    `Atual: R$ ${proposal.currentBudget.toFixed(2)}`,
    `Proposta: R$ ${proposal.proposedBudget.toFixed(2)} (${dir} ${Math.abs(proposal.pctChange)}%)`,
    ``,
    `Justificativa: ${proposal.reason}`,
  ].join('\n');

  try {
    const result = await celoTelegram.sendInlineKeyboard(
      APPROVAL_CHAT_ID,
      msg,
      celoTelegram.budgetApprovalKeyboard(approval.requestId)
    );

    if (result?.result?.message_id) {
      celoConversation.updateApproval(approval.requestId, {
        messageId: result.result.message_id,
        chatId: APPROVAL_CHAT_ID,
      });
    }

    res.json({ requestId: approval.requestId, status: 'pending' });
  } catch (err) {
    console.error('Celo: Erro ao enviar aprovacao via Telegram:', err.message);
    res.status(500).json({ error: 'Falha ao enviar para Telegram' });
  }
});

// ============================================================
// Aprovações (API)
// ============================================================
app.get('/api/approvals', (req, res) => {
  res.json(celoConversation.getPendingApprovals(req.query.clientId));
});

app.get('/api/approvals/all', (req, res) => {
  res.json(celoConversation.getAllApprovals());
});

// ============================================================
// ICP Update (recebido do @account / Nico)
// ============================================================
app.post('/api/icp-update', (req, res) => {
  const { clientName, icpData } = req.body;
  if (!clientName || !icpData) {
    return res.status(400).json({ error: 'clientName e icpData sao obrigatorios' });
  }

  const clientId = celoConfig.findClientByName(clientName);
  if (!clientId) {
    return res.status(404).json({ error: 'Cliente nao encontrado' });
  }

  celoConfig.updateClientICP(clientId, icpData);
  knowledgeBase.updateICP(clientId, icpData);
  console.log(`Celo: ICP atualizado para ${clientName} via @account`);
  res.json({ status: 'ok', clientId });
});

// ============================================================
// Inter-Agent API (para comunicação entre agentes)
// ============================================================

app.post('/api/agent/ask', async (req, res) => {
  const { question, clientId, fromAgent } = req.body;
  if (!question) return res.status(400).json({ error: 'question é obrigatório' });

  try {
    const response = await autopilot.chat(question, clientId);
    res.json({ answer: response, fromAgent: 'celo' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agent/inform', (req, res) => {
  const { clientId, type, data, fromAgent } = req.body;
  if (!clientId || !type || !data) {
    return res.status(400).json({ error: 'clientId, type e data são obrigatórios' });
  }

  try {
    switch (type) {
      case 'icp':
        knowledgeBase.updateICP(clientId, data);
        break;
      case 'audience':
        knowledgeBase.updateAudience(clientId, data);
        break;
      case 'product':
        knowledgeBase.updateProduct(clientId, data);
        break;
      case 'insight':
        knowledgeBase.addGroupInsight(clientId, { source: fromAgent || 'unknown', insight: data.text || data });
        break;
      case 'note':
        knowledgeBase.addNote(clientId, fromAgent || 'agent', data.text || data);
        break;
      default:
        return res.status(400).json({ error: `Tipo desconhecido: ${type}` });
    }
    console.log(`Celo: KB atualizada por ${fromAgent || 'unknown'} — ${type} para ${clientId}`);
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Knowledge Base API
app.get('/api/kb/:clientId', (req, res) => {
  const data = knowledgeBase.getClientKB(req.params.clientId);
  res.json(data);
});

// ============================================================
// CRM Analysis (API)
// ============================================================
app.get('/api/analyze/:clientId', async (req, res) => {
  try {
    const analysis = await celo.analyzeSalesData(req.params.clientId);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/optimize/:clientId', async (req, res) => {
  try {
    const suggestions = await celo.getOptimizationSuggestions(req.params.clientId);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Sheets Discovery (API)
// ============================================================
app.get('/api/sheets/:clientId', async (req, res) => {
  const client = celoConfig.getClient(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Cliente nao encontrado' });

  const sheets = await celo.listSheets(client.spreadsheetId);
  res.json({ spreadsheetId: client.spreadsheetId, sheets });
});

// ============================================================
// AdTag Naming (API)
// ============================================================
app.post('/api/naming/campaign', (req, res) => {
  const name = naming.generateCampaignName(req.body);
  const validation = naming.validateName(name, 'campaign');
  res.json({ name, ...validation });
});

app.post('/api/naming/audience', (req, res) => {
  const name = naming.generateAudienceName(req.body);
  const validation = naming.validateName(name, 'audience');
  res.json({ name, ...validation });
});

app.post('/api/naming/creative', (req, res) => {
  const name = naming.generateCreativeName(req.body);
  const validation = naming.validateName(name, 'creative');
  res.json({ name, ...validation });
});

app.get('/api/naming/constants', (req, res) => {
  res.json({
    objectives: naming.CAMPAIGN_OBJECTIVES,
    budgetTypes: naming.BUDGET_TYPES,
    genders: naming.GENDERS,
    placements: naming.PLACEMENTS,
    formats: naming.CREATIVE_FORMATS,
    ctas: naming.CTAS,
  });
});

// ============================================================
// CRM x Ads Cross-Reference (consulta BANCO LOCAL, não API)
// ============================================================

function normalizeName(name) {
  return (name || '').toLowerCase().replace(/[\[\](){}]/g, '').replace(/\s+/g, ' ').trim();
}

function findCrmMatch(metaName, crmCampaigns) {
  const norm = normalizeName(metaName);
  // Tier 1: exact match
  const exact = crmCampaigns.find(c => normalizeName(c.campaign) === norm);
  if (exact) return exact;
  // Tier 2: contains
  const contains = crmCampaigns.find(c => {
    const cn = normalizeName(c.campaign);
    return cn.includes(norm) || norm.includes(cn);
  });
  if (contains) return contains;
  // Tier 3: token overlap > 50%
  const metaTokens = norm.split(' ').filter(Boolean);
  if (metaTokens.length === 0) return null;
  let bestMatch = null, bestOverlap = 0;
  for (const c of crmCampaigns) {
    const crmTokens = normalizeName(c.campaign).split(' ').filter(Boolean);
    if (crmTokens.length === 0) continue;
    const common = metaTokens.filter(t => crmTokens.includes(t)).length;
    const overlap = common / Math.max(metaTokens.length, crmTokens.length);
    if (overlap > 0.5 && overlap > bestOverlap) {
      bestOverlap = overlap;
      bestMatch = c;
    }
  }
  return bestMatch;
}

function computeCampaignQuality(crm, funnelStages) {
  if (!crm) return 0;
  const total = (crm.total || 0);
  if (total === 0) return 0;
  const wonWeight = (crm.won_count || 0) * 40;
  const openWeight = (crm.open_count || 0) * 20;
  const totalWeight = total * 10;
  const raw = wonWeight + openWeight + totalWeight;
  return Math.min(100, Math.round(raw / total));
}

/**
 * Monta crossref usando BANCO LOCAL (ghlDb + adsDb).
 * Zero chamadas à API — tudo SQLite.
 */
function buildCrossrefFromDb(clientId, start30d, end) {
  // === CRM data (SQLite) ===
  const crmCampaigns = ghlDb.getCampaignPerformance(clientId, start30d, end);
  const crmAds = ghlDb.getAdPerformance(clientId, start30d, end);
  const crmAdsets = ghlDb.getAdsetPerformance(clientId, start30d, end);
  const funnelStages = ghlDb.getFunnelStages(clientId);
  const oppSummary = ghlDb.getOpportunitySummary(clientId, start30d, end);
  const contactsByCampaign = ghlDb.getContactsByCampaign(clientId, start30d, end);
  const stages = ghlDb.getPipelineStages(clientId);
  const pipelineName = stages[0]?.pipeline_name || 'Pipeline';

  // === Ads data (SQLite) ===
  const adsCampaigns = adsDb.getCampaignSummaries(clientId, start30d, end);
  const adsAds = adsDb.getAdSummaries(clientId, start30d, end);
  const adsAdsets = adsDb.getAdsetSummaries(clientId, start30d, end);

  // Contact leads lookup by campaign
  const contactLeadMap = {};
  for (const c of contactsByCampaign) {
    contactLeadMap[normalizeName(c.campaign)] = c.leads;
  }

  // CRM ads lookup by name
  const crmAdMap = {};
  for (const a of crmAds) {
    crmAdMap[normalizeName(a.ad_name)] = a;
  }

  // CRM adsets lookup by name
  const crmAdsetMap = {};
  for (const a of crmAdsets) {
    crmAdsetMap[normalizeName(a.adset_name)] = a;
  }

  // Merge campaigns
  const campaigns = adsCampaigns.map(ac => {
    const crm = findCrmMatch(ac.name, crmCampaigns);
    const quality = computeCampaignQuality(crm, funnelStages);
    const crmLeads = crm?.total || contactLeadMap[normalizeName(ac.name)] || 0;
    const crmWon = crm?.won_count || 0;
    const crmWonValue = crm?.won_value || 0;
    const roas = (ac.spend > 0 && crmWonValue > 0) ? (crmWonValue / ac.spend) : 0;
    return {
      name: ac.name,
      status: ac.status,
      spend: ac.spend || 0,
      clicks: ac.clicks || 0,
      impressions: ac.impressions || 0,
      metaLeads: ac.leads || 0,
      cplMeta: ac.cost_per_result || 0,
      ctr: ac.ctr || 0,
      crmMatched: !!crm,
      crmLeads,
      crmOpen: crm?.open_count || 0,
      crmWon,
      crmLost: crm?.lost_count || 0,
      crmWonValue,
      roas,
      quality,
      cplCrm: (ac.spend > 0 && crmLeads > 0) ? ac.spend / crmLeads : 0,
    };
  });

  // Merge ads (criativos)
  const ads = adsAds.map(ad => {
    const crmAd = crmAdMap[normalizeName(ad.name)];
    const crmLeads = crmAd?.leads || 0;
    return {
      name: ad.name,
      status: ad.status,
      campaignName: ad.campaign_name,
      spend: ad.spend || 0,
      metaLeads: ad.leads || 0,
      crmLeads,
      cplCrm: (ad.spend > 0 && crmLeads > 0) ? ad.spend / crmLeads : 0,
      ctr: ad.ctr || 0,
    };
  });

  // Merge adsets (conjuntos)
  const adsets = adsAdsets.map(as => {
    const crmAs = crmAdsetMap[normalizeName(as.name)];
    const crmLeads = crmAs?.leads || 0;
    return {
      name: as.name,
      status: as.status,
      campaignName: as.campaign_name,
      spend: as.spend || 0,
      metaLeads: as.leads || 0,
      crmLeads,
      cplCrm: (as.spend > 0 && crmLeads > 0) ? as.spend / crmLeads : 0,
      ctr: as.ctr || 0,
    };
  });

  // Totals
  const totalCrmLeads = oppSummary?.total || 0;
  const totalWon = oppSummary?.total_won || 0;
  const totalWonValue = oppSummary?.won_value || 0;
  const totalLost = oppSummary?.total_lost || 0;
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const conversionRate = (totalWon + totalLost) > 0
    ? Math.round((totalWon / (totalWon + totalLost)) * 100) : 0;

  // Consultas agendadas (look for stage containing 'consulta' or 'agendad')
  const consultaStage = funnelStages.find(s =>
    s.stage_name?.toLowerCase().includes('consulta') || s.stage_name?.toLowerCase().includes('agendad')
  );
  const consultasAgendadas = consultaStage?.count || 0;
  const custoConsulta = (totalSpend > 0 && consultasAgendadas > 0)
    ? totalSpend / consultasAgendadas : 0;

  // Rankings
  const qualityRanking = [...campaigns]
    .filter(c => c.crmMatched)
    .sort((a, b) => b.quality - a.quality)
    .slice(0, 5);

  const efficientAds = [...ads]
    .filter(a => a.crmLeads > 0)
    .sort((a, b) => a.cplCrm - b.cplCrm)
    .slice(0, 5);

  const consultaCampaigns = [...campaigns]
    .filter(c => c.crmMatched && c.crmWon > 0)
    .sort((a, b) => b.crmWon - a.crmWon)
    .slice(0, 5);

  // Last sync info
  const lastSync = ghlDb.getLastSync(clientId);

  return {
    kpis: {
      totalCrmLeads,
      won30d: totalWon,
      wonValue30d: totalWonValue,
      roas: totalSpend > 0 ? totalWonValue / totalSpend : 0,
      conversionRate,
      consultasAgendadas,
      custoConsulta,
    },
    funnel: funnelStages.map(s => ({ name: s.stage_name, count: s.count || 0, value: s.value || 0 })),
    campaigns: campaigns.sort((a, b) => b.spend - a.spend),
    ads: ads.filter(a => a.spend > 0).sort((a, b) => b.spend - a.spend),
    adsets: adsets.filter(a => a.spend > 0).sort((a, b) => b.spend - a.spend),
    qualityRanking,
    efficientAds,
    consultaCampaigns,
    pipelineName,
    lastSync: lastSync ? { at: lastSync.created_at, opps: lastSync.opportunities_synced, contacts: lastSync.contacts_synced } : null,
    hasData: (totalCrmLeads > 0 || adsCampaigns.length > 0),
  };
}

app.get('/api/crm-crossref/:clientId', (req, res) => {
  try {
    const clientId = req.params.clientId;
    const client = celoConfig.getClient(clientId);
    if (!client) return res.status(404).json({ error: 'Cliente nao encontrado' });

    // Init DBs if needed
    ghlDb.initDB();
    adsDb.initDB();

    // Check if we have data
    const hasCrmData = ghlDb.hasData(clientId);
    const hasAdsData = adsDb.hasData(clientId);

    if (!hasCrmData && !hasAdsData) {
      return res.json({
        hasData: false,
        error: 'Nenhum dado sincronizado. Use POST /api/crm-sync/:clientId para popular.',
        kpis: { totalCrmLeads: 0, won30d: 0, wonValue30d: 0, roas: 0, conversionRate: 0, consultasAgendadas: 0, custoConsulta: 0 },
        funnel: [], campaigns: [], ads: [], adsets: [],
        qualityRanking: [], efficientAds: [], consultaCampaigns: [],
        pipelineName: '--', lastSync: null,
      });
    }

    const now = new Date();
    const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = now.toISOString().split('T')[0];

    const crossref = buildCrossrefFromDb(clientId, start30d, end);
    res.json(crossref);
  } catch (err) {
    console.error('❌ CRM Crossref error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Sync manual CRM + Ads para um cliente
app.post('/api/crm-sync/:clientId', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const client = celoConfig.getClient(clientId);
    if (!client) return res.status(404).json({ error: 'Cliente nao encontrado' });

    console.log(`🔄 Sync manual iniciado para ${clientId}...`);
    const results = {};

    // Sync GHL CRM
    if (client.ghlLocationId && client.ghlToken) {
      results.ghl = await ghlSyncer.syncClient(clientId);
    } else {
      results.ghl = { skipped: true, reason: 'Sem GHL configurado' };
    }

    // Sync Meta Ads
    if (client.metaAdAccountId) {
      results.ads = await adsSyncer.syncClient(clientId);
    } else {
      results.ads = { skipped: true, reason: 'Sem Meta Ads configurado' };
    }

    console.log(`✅ Sync manual concluido para ${clientId}:`, JSON.stringify(results));
    res.json({ status: 'ok', clientId, results });
  } catch (err) {
    console.error(`❌ Sync manual error ${req.params.clientId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Startup
// ============================================================
app.listen(PORT, async () => {
  console.log(`\n📈 Celo Media Buyer Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}`);
  console.log(`📡 Webhook: POST http://localhost:${PORT}/webhook`);
  console.log(`🤖 Bot Token: ${CELO_BOT_TOKEN ? `...${CELO_BOT_TOKEN.slice(-8)}` : 'NAO CONFIGURADO'}`);
  console.log(`💬 Approval Chat: ${APPROVAL_CHAT_ID || 'NAO CONFIGURADO'}`);

  // Inicializar memória e Knowledge Base
  memoryStore.init();
  const clientIds = celoConfig.listClients().map(c => c.id);
  knowledgeBase.initForClients(clientIds);

  // Inicializar Google Sheets auth
  await celo.initAuth();

  // Verificar bot e configurar webhook
  if (CELO_BOT_TOKEN) {
    const me = await celoTelegram.getMe();
    if (me.ok) {
      console.log(`🤖 Bot: @${me.result.username} (${me.result.first_name})`);

      // Auto-setup webhook
      const whResult = await celoTelegram.setWebhook(CELO_WEBHOOK_URL);
      if (whResult.ok) {
        console.log(`🔗 Webhook: ${CELO_WEBHOOK_URL}`);
      } else {
        console.error(`⚠️  Webhook setup failed: ${whResult.description}`);
      }
    }
  }

  const clients = celoConfig.listClients();
  console.log(`🏢 Clientes: ${clients.length > 0 ? clients.map((c) => c.name).join(', ') : 'Nenhum'}`);

  // Inicializar Autopilot
  autopilot = new CeloAutopilot({
    adsManager,
    celoAgent: celo,
    optimizer,
    telegram: celoTelegram,
    approvalChatId: APPROVAL_CHAT_ID,
  });
  autopilot.start();

  // Inicializar syncers
  await campaignsExporter.init();
  await adsSyncer.init();
  await ghlSyncer.init();

  // Scheduler: sincronizar campanhas, ads BD e GHL a cada 15 minutos
  const CAMPAIGN_SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutos
  setInterval(async () => {
    try {
      console.log('📊 Sincronizando campanhas + ads BD + GHL (scheduler)...');
      const [results, adsResults, ghlResults] = await Promise.allSettled([
        campaignsExporter.syncAllClients(),
        adsSyncer.syncAllClients(),
        ghlSyncer.syncAllClients(),
      ]);
      if (results.status === 'fulfilled') {
        const successful = Array.from(results.value.values()).filter(r => r.success).length;
        console.log(`✅ Campanhas: ${successful}/${results.value.size} clientes`);
      }
      if (adsResults.status === 'fulfilled') {
        const successful = Array.from(adsResults.value.values()).filter(r => r.success).length;
        console.log(`✅ Ads BD: ${successful}/${adsResults.value.size} clientes`);
      }
      if (ghlResults.status === 'fulfilled') {
        const successful = Array.from(ghlResults.value.values()).filter(r => r.success).length;
        console.log(`✅ GHL BD: ${successful}/${ghlResults.value.size} clientes`);
      }
    } catch (err) {
      console.error('❌ Erro no scheduler de campanhas:', err.message);
    }
  }, CAMPAIGN_SYNC_INTERVAL);

  // Primeira sincronização imediata
  setImmediate(async () => {
    try {
      console.log('📊 Sincronizando campanhas (startup)...');
      await campaignsExporter.syncAllClients();
      console.log('✅ Sincronização inicial completa');
    } catch (err) {
      console.error('❌ Erro na sincronização inicial:', err.message);
    }
    try {
      console.log('📊 Sincronizando ads BD (startup)...');
      await adsSyncer.syncAllClients();
      console.log('✅ Ads BD sincronização inicial completa');
    } catch (err) {
      console.error('❌ Erro na sincronização inicial ads BD:', err.message);
    }
    try {
      console.log('📊 Sincronizando GHL BD (startup)...');
      await ghlSyncer.syncAllClients();
      console.log('✅ GHL BD sincronização inicial completa');
    } catch (err) {
      console.error('❌ Erro na sincronização inicial GHL BD:', err.message);
    }
  });

  console.log('\n— Celo online. Dados nao mentem.');
});
