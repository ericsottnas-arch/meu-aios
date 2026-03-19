// meu-projeto/ghl-webhook-server.js
// GHL Webhook Receiver - Salva conversas e mensagens do GoHighLevel

const fs = require('fs');
const path = require('path');

// Carregamento de .env (parent primeiro, local como override)
if (process.env.NODE_ENV !== 'production') {
  const localEnv = path.resolve(__dirname, '.env');
  const parentEnv = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(parentEnv)) {
    require('dotenv').config({ path: parentEnv });
  }
  if (fs.existsSync(localEnv)) {
    require('dotenv').config({ path: localEnv, override: true });
  }
}

const express = require('express');
const bodyParser = require('body-parser');

const app = express();

// Middleware para capturar raw body (necessário para validação de assinatura)
app.use(
  bodyParser.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    }
  })
);

const PORT = process.env.GHL_PORT || 3004;
const GHL_WEBHOOK_SECRET = process.env.GHL_WEBHOOK_SECRET;
const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN;

// Módulos
const GHLWebhookValidator = require('./lib/ghl-webhook-validator');
const ghlDB = require('./lib/ghl-db');
const instagramGraph = require('./lib/instagram-graph');
const ghlAPI = require('./lib/ghl-api');

// Meta Lead Form + GHL CRM + Stevo (para webhook de formulário instantâneo)
const MetaAds = require('./lib/meta-ads');
const GhlCrm = require('./lib/ghl-crm');
const stevo = require('./lib/stevo');

const metaAds = new MetaAds();
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'syra_leadgen_verify';

// Carregar config de clientes para mapear page_id → client config
let celoClients = {};
try {
  celoClients = require('./data/celo-clients.json').clients || {};
} catch { celoClients = {}; }

// Mapa de pageId → client config para lookup rápido no webhook
const pageClientMap = new Map();
for (const [clientId, config] of Object.entries(celoClients)) {
  if (config.metaPageId) {
    pageClientMap.set(config.metaPageId, { clientId, ...config });
  }
}

// Custom field IDs de respostas de formulário por GHL Location
const FORM_FIELD_IDS = {
  // Dra. Gabrielle
  '3iNi7kJci5f0BNUoq4kX': {
    incomodo_principal: 'ULyTUMmnV0nwSLPmh4gP',
  },
};

// Iris Engine (prospeccao automatizada) - carrega com try/catch para nao quebrar se nao configurada
let irisEngine = null;
try {
  irisEngine = require('./lib/iris-engine');
  console.log('🌸 Iris Engine carregado com sucesso');
} catch (err) {
  console.warn('⚠️ Iris Engine nao carregado:', err.message);
}

// ============================================================
// Health check
// ============================================================
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ghl-webhook-receiver',
    uptime: process.uptime(),
    port: PORT
  });
});

// ============================================================
// Política de Privacidade (para Meta App)
// ============================================================
app.get('/privacidade', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Política de Privacidade - Syra Digital</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; color: #333; }
    h1 { color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 10px; }
    h2 { color: #1a1a2e; margin-top: 30px; }
    .updated { color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Política de Privacidade</h1>
  <p class="updated">Última atualização: 10 de março de 2026</p>

  <h2>1. Informações que Coletamos</h2>
  <p>Coletamos informações fornecidas voluntariamente por você ao preencher formulários em nossas campanhas publicitárias, incluindo: nome, telefone, e-mail e respostas a perguntas do formulário.</p>

  <h2>2. Como Usamos suas Informações</h2>
  <p>Utilizamos seus dados para:</p>
  <ul>
    <li>Entrar em contato para agendar consultas ou avaliações</li>
    <li>Enviar informações sobre serviços solicitados</li>
    <li>Melhorar nossas campanhas e atendimento</li>
  </ul>

  <h2>3. Compartilhamento de Dados</h2>
  <p>Seus dados são compartilhados apenas com os profissionais de saúde e clínicas parceiras diretamente relacionados ao serviço que você solicitou. Não vendemos ou compartilhamos seus dados com terceiros para fins de marketing.</p>

  <h2>4. Armazenamento e Segurança</h2>
  <p>Seus dados são armazenados em sistemas seguros com criptografia e acesso restrito. Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas nesta política.</p>

  <h2>5. Seus Direitos</h2>
  <p>Você pode solicitar a qualquer momento:</p>
  <ul>
    <li>Acesso aos seus dados pessoais</li>
    <li>Correção de dados incorretos</li>
    <li>Exclusão dos seus dados</li>
  </ul>

  <h2>6. Exclusão de Dados</h2>
  <p>Para solicitar a exclusão dos seus dados, envie um e-mail para <strong>contato@syradigital.com.br</strong> com o assunto "Exclusão de Dados".</p>

  <h2>7. Contato</h2>
  <p><strong>Syra Digital</strong><br>E-mail: contato@syradigital.com.br</p>
</body>
</html>`);
});

app.get('/exclusao-dados', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exclusão de Dados - Syra Digital</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; color: #333; }
    h1 { color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 10px; }
    h2 { color: #1a1a2e; margin-top: 30px; }
  </style>
</head>
<body>
  <h1>Solicitação de Exclusão de Dados</h1>
  <p>Para solicitar a exclusão dos seus dados pessoais, envie um e-mail para:</p>
  <p><strong>contato@syradigital.com.br</strong></p>
  <p>Assunto: "Exclusão de Dados"</p>
  <p>Inclua seu nome completo e telefone cadastrado para que possamos localizar e remover seus dados.</p>
  <p>Prazo de atendimento: até 15 dias úteis.</p>
  <h2>Contato</h2>
  <p><strong>Syra Digital</strong><br>E-mail: contato@syradigital.com.br</p>
</body>
</html>`);
});

// ============================================================
// Webhook receiver
// ============================================================
app.post('/webhook', async (req, res) => {
  try {
    // 1. Validar assinatura
    const signature = req.headers['x-ghl-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    if (GHL_WEBHOOK_SECRET) {
      const isValid = GHLWebhookValidator.validateSignature(
        signature,
        rawBody,
        GHL_WEBHOOK_SECRET
      );

      if (!isValid) {
        console.warn('❌ Webhook signature validation failed');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // 2. Parse do evento
    const payload = req.body;
    const event = GHLWebhookValidator.parseEvent(payload);

    if (!event) {
      console.warn('⚠️ Webhook payload inválido:', payload);
      return res.status(400).json({ error: 'Invalid payload' });
    }

    console.log(`📨 Webhook recebido: ${event.eventType}`);

    // 3. Processar por tipo de evento
    if (event.eventType === 'message') {
      await handleMessage(event.message);
    } else if (event.eventType === 'conversation_unread') {
      await handleConversationUnread(event);
    } else {
      console.log('ℹ️ Evento desconhecido:', event.eventType);
    }

    // 4. Responder com 200 OK (importante para GHL saber que foi recebido)
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error.message);
    // Ainda responder com 200 para GHL não tentar reenviar
    res.status(200).json({ error: error.message });
  }
});

/**
 * Processar mensagem recebida
 */
function handleMessage(message) {
  try {
    console.log(`💬 Mensagem: "${message.body.substring(0, 50)}..."`);

    // 1. Garantir que conversa existe
    let conversation = ghlDB.getConversation(message.conversationId);

    if (!conversation.success) {
      // Conversa não existe, criar
      ghlDB.saveConversation({
        conversationId: message.conversationId,
        contactId: message.from,
        contactName: message.from,
        status: 'active',
        type: 'sms',
        fromNumber: message.to,
        toNumber: message.from,
        lastMessageDate: Date.now(),
        unreadCount: 1
      });
    } else {
      // Atualizar última mensagem e unread count
      ghlDB.saveConversation({
        conversationId: message.conversationId,
        contactId: conversation.data.contact_id,
        contactName: conversation.data.contact_name,
        status: 'active',
        type: conversation.data.type,
        fromNumber: conversation.data.from_number,
        toNumber: conversation.data.to_number,
        lastMessageDate: Date.now(),
        unreadCount: (conversation.data.unread_count || 0) + 1
      });
    }

    // 2. Salvar mensagem
    const result = ghlDB.saveMessage({
      messageId: message.id,
      conversationId: message.conversationId,
      body: message.body,
      from: message.from,
      to: message.to,
      timestamp: message.timestamp,
      direction: message.type === 'inbound' ? 'inbound' : 'outbound',
      attachments: message.attachments
    });

    if (!result.success) {
      console.error('❌ Erro ao salvar mensagem:', result.error);
    } else {
      console.log('✅ Mensagem salva com sucesso');
    }

    // Iris: processar mensagem inbound (fire-and-forget)
    if (irisEngine && message.type === 'inbound') {
      irisEngine.processInboundMessage(message, conversation?.data).catch((err) => {
        console.error('🌸 Iris: erro ao processar:', err.message);
      });
    }
  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error.message);
  }
}

/**
 * Processar alteração de status de leitura
 */
function handleConversationUnread(event) {
  try {
    console.log(
      `🔔 Conversa ${event.conversationId}: ${event.unreadCount} não lida(s)`
    );

    // Atualizar conversa com novo unread count
    const conversation = ghlDB.getConversation(event.conversationId);

    if (conversation.success) {
      ghlDB.saveConversation({
        conversationId: event.conversationId,
        contactId: conversation.data.contact_id,
        contactName: conversation.data.contact_name,
        status: conversation.data.status,
        type: conversation.data.type,
        fromNumber: conversation.data.from_number,
        toNumber: conversation.data.to_number,
        lastMessageDate: conversation.data.last_message_date,
        unreadCount: event.unreadCount
      });

      console.log('✅ Status de leitura atualizado');
    }
  } catch (error) {
    console.error('❌ Erro ao processar unread:', error.message);
  }
}

// ============================================================
// API Endpoints para gerenciar dados
// ============================================================

/**
 * GET /api/conversations - Listar conversas
 */
app.get('/api/conversations', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = ghlDB.getAllConversations(limit, offset);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/conversations/:conversationId - Buscar conversa específica
 */
app.get('/api/conversations/:conversationId', (req, res) => {
  try {
    const result = ghlDB.getConversation(req.params.conversationId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/conversations/:conversationId/messages - Buscar mensagens
 */
app.get('/api/conversations/:conversationId/messages', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = ghlDB.getMessages(req.params.conversationId, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/unread - Listar conversas não lidas
 */
app.get('/api/unread', (req, res) => {
  try {
    const result = ghlDB.getUnreadConversations();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/conversations/:conversationId/read - Marcar como lida
 */
app.post('/api/conversations/:conversationId/read', (req, res) => {
  try {
    const result = ghlDB.markConversationAsRead(
      req.params.conversationId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/search - Buscar mensagens por texto (FTS5)
 */
app.get('/api/search', (req, res) => {
  try {
    const query = req.query.q;
    const limit = parseInt(req.query.limit) || 50;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" é obrigatório' });
    }

    const result = ghlDB.searchMessages(query, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats - Estatísticas
 */
app.get('/api/stats', (req, res) => {
  try {
    const stats = ghlDB.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// Instagram Graph API Endpoints
// ============================================================

/**
 * GET /api/instagram/test - Testar conexão
 */
app.get('/api/instagram/test', async (req, res) => {
  try {
    const result = await instagramGraph.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/instagram/profile - Obter perfil do Instagram
 */
app.get('/api/instagram/profile', async (req, res) => {
  try {
    const result = await instagramGraph.getProfile();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/instagram/conversations - Listar conversas do Instagram
 */
app.get('/api/instagram/conversations', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await instagramGraph.getConversations(limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/instagram/conversations/:conversationId - Buscar conversa específica
 */
app.get('/api/instagram/conversations/:conversationId', async (req, res) => {
  try {
    const result = await instagramGraph.getConversationDetails(req.params.conversationId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/instagram/conversations/:conversationId/messages - Buscar mensagens
 */
app.get('/api/instagram/conversations/:conversationId/messages', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await instagramGraph.getMessages(req.params.conversationId, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/instagram/messages/send - Enviar mensagem
 */
app.post('/api/instagram/messages/send', async (req, res) => {
  try {
    const { conversationId, message } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({ error: 'conversationId e message são obrigatórios' });
    }

    const result = await instagramGraph.sendMessage(conversationId, message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// Meta Leadgen Webhook (Formulário Instantâneo)
// ============================================================

/**
 * GET /webhook/meta - Verificação do webhook pelo Meta
 * Meta envia hub.mode, hub.verify_token e hub.challenge
 */
app.get('/webhook/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    console.log('✅ Meta webhook verificado com sucesso');
    return res.status(200).send(challenge);
  }

  console.warn('❌ Meta webhook verification failed:', { mode, token });
  return res.sendStatus(403);
});

/**
 * POST /webhook/meta - Recebe eventos de leadgen do Meta
 * Fluxo: Meta envia lead → buscar dados do lead → criar contato GHL → WhatsApp via Stevo
 */
app.post('/webhook/meta', async (req, res) => {
  // Responder 200 imediatamente (Meta espera resposta rápida)
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== 'page') return;

    for (const entry of (body.entry || [])) {
      for (const change of (entry.changes || [])) {
        if (change.field !== 'leadgen') continue;

        const { leadgen_id, form_id, page_id, adgroup_id } = change.value;
        console.log(`📋 Meta Lead recebido: lead=${leadgen_id} form=${form_id} page=${page_id}`);

        // Processar lead em background (fire-and-forget)
        processMetaLead({ leadgen_id, form_id, page_id, adgroup_id }).catch(err => {
          console.error('❌ Erro ao processar Meta lead:', err.message);
        });
      }
    }
  } catch (err) {
    console.error('❌ Erro no webhook Meta:', err.message);
  }
});

/**
 * Processa um lead recebido via formulário instantâneo do Meta.
 * 1. Identificar cliente pelo page_id
 * 2. Buscar dados do lead na API do Meta
 * 3. Criar/atualizar contato no GHL
 * 4. Criar oportunidade no pipeline
 * 5. Enviar mensagem WhatsApp via Stevo
 */
async function processMetaLead({ leadgen_id, form_id, page_id, adgroup_id }) {
  // 1. Identificar cliente pelo page_id
  const clientConfig = pageClientMap.get(page_id);
  const clientName = clientConfig?.name || 'Cliente desconhecido';
  console.log(`📋 Cliente identificado: ${clientName} (page ${page_id})`);

  // 2. Inicializar MetaAds e buscar dados do lead
  await metaAds.init();
  const lead = await metaAds.getLeadById(leadgen_id);
  console.log(`📋 Lead data:`, JSON.stringify(lead.fields));

  const fullName = lead.fields.full_name || lead.fields.nome_completo || '';
  const phone = lead.fields.phone_number || lead.fields.telefone || '';
  const service = lead.fields.servico_interesse || lead.fields.service || '';
  const incomodoPrincipal = lead.fields.incomodo_principal || lead.fields['qual_o_seu_maior_incômodo_hoje?'] || '';

  if (!phone) {
    console.warn('⚠️ Lead sem telefone, ignorando:', leadgen_id);
    return;
  }

  // Normalizar telefone para formato brasileiro
  const normalizedPhone = normalizePhone(phone);
  console.log(`📞 Lead: ${fullName} | ${normalizedPhone} | Serviço: ${service}`);

  // 3. Criar contato no GHL (usando locationId e token do cliente)
  let contact = null;
  const locationId = clientConfig?.ghlLocationId || process.env.GHL_LOCATION_ID;
  const ghlToken = clientConfig?.ghlToken;

  if (locationId) {
    try {
      const ghlCrm = new GhlCrm(locationId, ghlToken);
      // UTM custom field IDs por location
      const utmIds = GhlCrm.getUtmFieldIds(locationId);
      const formIds = FORM_FIELD_IDS[locationId] || {};
      const customFields = [
        { id: utmIds.utm_campaign, field_value: lead.campaignName || '' },
        { id: utmIds.utm_content, field_value: lead.adName || '' },
        { id: utmIds.utm_medium, field_value: lead.adsetName || '' },
        { id: utmIds.utm_source, field_value: 'facebook' },
      ];
      // Campos de formulário (perguntas personalizadas)
      if (incomodoPrincipal && formIds.incomodo_principal) {
        customFields.push({ id: formIds.incomodo_principal, field_value: incomodoPrincipal });
      }
      contact = await ghlCrm.findOrCreateByPhone(normalizedPhone, {
        name: fullName,
        source: 'Meta Lead Form',
        tags: ['lead-form', 'formulario-instantaneo'],
        customFields,
      });

      console.log(`✅ Contato GHL: ${contact.id} (${contact.firstName || fullName})`);

      // 4. Criar oportunidade no pipeline
      const pipelineId = clientConfig?.ghlPipelineId;
      if (pipelineId) {
        const pipelines = await ghlCrm.getPipelines();
        const pipeline = pipelines.find(p => p.id === pipelineId) || pipelines[0];
        if (pipeline) {
          const firstStage = pipeline.stages?.[0];
          if (firstStage) {
            await ghlCrm.createOpportunity(
              contact.id,
              pipeline.id,
              firstStage.id,
              `Lead Form - ${service || 'Consulta'} - ${fullName}`,
            );
            console.log(`✅ Oportunidade criada no pipeline ${pipeline.name}`);
          }
        }
      }
    } catch (err) {
      console.error('⚠️ Erro GHL (continuando para WhatsApp):', err.message);
    }
  }

  // 5. Enviar mensagem WhatsApp via Stevo
  if (stevo.isConfigured()) {
    try {
      const stevoPhone = normalizedPhone.replace(/\D/g, '');
      const firstName = fullName.split(' ')[0] || 'você';

      // Mapa de dor → resposta personalizada com procedimento recomendado
      const painResponseMap = {
        'gordura_localizada': { pain: 'gordura localizada', procedures: 'Hidrolipo, Criolipólise e Power Shape' },
        'Gordura localizada (barriga, flancos, braços)': { pain: 'gordura localizada', procedures: 'Hidrolipo, Criolipólise e Power Shape' },
        'papada': { pain: 'papada', procedures: 'Lipo de Papada' },
        'Papada / queixo duplo': { pain: 'papada', procedures: 'Lipo de Papada' },
        'celulite_flacidez': { pain: 'celulite e flacidez', procedures: 'Pump Up com Corrente Russa e Power Shape' },
        'Celulite e flacidez no corpo': { pain: 'celulite e flacidez', procedures: 'Pump Up com Corrente Russa e Power Shape' },
        'pele_rosto': { pain: 'pele do rosto', procedures: 'Limpeza de Pele profunda' },
        'Pele do rosto (oleosidade, manchas)': { pain: 'pele do rosto', procedures: 'Limpeza de Pele profunda' },
        'inchaco': { pain: 'inchaço e retenção de líquido', procedures: 'Detox corporal' },
        'Inchaço e retenção de líquido': { pain: 'inchaço e retenção de líquido', procedures: 'Detox corporal' },
        'emagrecer': { pain: 'emagrecimento', procedures: 'Manipulado Bio Emagrecedor e protocolos de redução de medidas' },
        'Quero emagrecer de forma saudável': { pain: 'emagrecimento', procedures: 'Manipulado Bio Emagrecedor e protocolos de redução de medidas' },
      };

      const concern = lead.fields.incomodo_principal || service || '';
      const match = painResponseMap[concern];

      let message;
      if (match) {
        message = [
          `Olá ${firstName}! 👋`,
          '',
          `Aqui é a equipe da ${clientName}.`,
          '',
          `Vi que você quer resolver a questão de ${match.pain}. A Dra. Gabrielle já teve ótimos resultados com tratamentos como ${match.procedures}.`,
          '',
          'Vou te passar mais detalhes e agendar seu horário. Me conta: qual horário fica melhor pra você?',
        ].join('\n');
      } else {
        message = [
          `Olá ${firstName}! 👋`,
          '',
          `Aqui é a equipe da ${clientName}.`,
          '',
          'A Dra. Gabrielle tem diversos tratamentos que podem te ajudar. Vou te explicar as opções e agendar seu horário.',
          '',
          'Me conta: o que mais te incomoda hoje no seu corpo?',
        ].join('\n');
      }

      await stevo.sendText(stevoPhone, message);
      console.log(`✅ WhatsApp enviado para ${stevoPhone} (dor: ${concern || 'genérico'})`);
    } catch (err) {
      console.error('⚠️ Erro Stevo WhatsApp:', err.message);
    }
  } else {
    console.warn('⚠️ Stevo não configurado — mensagem WhatsApp não enviada');
  }

  console.log(`✅ Lead processado: ${clientName} | ${fullName} | ${normalizedPhone} | ${service}`);
}

/**
 * Normaliza telefone para formato +55XXXXXXXXXXX
 */
function normalizePhone(phone) {
  let digits = phone.replace(/\D/g, '');

  // Se já começa com 55 e tem 12-13 dígitos, está OK
  if (digits.startsWith('55') && digits.length >= 12) {
    return '+' + digits;
  }

  // Se tem 10-11 dígitos (DDD + número), adicionar 55
  if (digits.length >= 10 && digits.length <= 11) {
    return '+55' + digits;
  }

  // Fallback: retorna com + se não tem
  return phone.startsWith('+') ? phone : '+' + digits;
}

// ============================================================
// Error handling
// ============================================================
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================
// Start server
// ============================================================
// GHL API Endpoints (para acessar conversas via GHL)
// ============================================================

/**
 * GET /api/ghl/test - Testar conexão com GHL
 */
app.get('/api/ghl/test', async (req, res) => {
  try {
    const result = await ghlAPI.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ghl/conversations - Listar conversas via GHL
 */
app.get('/api/ghl/conversations', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await ghlAPI.getConversations({ limit });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ghl/conversations/:conversationId/messages - Mensagens via GHL
 */
app.get('/api/ghl/conversations/:conversationId/messages', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await ghlAPI.getConversationMessages(
      req.params.conversationId,
      { limit }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🎯 GHL Webhook Receiver Started      ║
╠════════════════════════════════════════╣
║   Port: ${PORT}${PORT.toString().length === 4 ? '     ' : '    '}║
║   Status: ✅ Ready                      ║
║   Endpoint: /webhook                   ║
║   Meta Lead: /webhook/meta             ║
║   API: /api/*                          ║
╚════════════════════════════════════════╝
  `);

  // Verificar variáveis obrigatórias
  if (!GHL_WEBHOOK_SECRET) {
    console.warn(
      '⚠️ GHL_WEBHOOK_SECRET não configurado - webhook validation desativado'
    );
  }
  if (!GHL_ACCESS_TOKEN) {
    console.warn('⚠️ GHL_ACCESS_TOKEN não configurado');
  }

  console.log(`📊 Database: ${ghlDB.getStats().dbPath}`);

});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Encerrando servidor...');
  process.exit(0);
});
