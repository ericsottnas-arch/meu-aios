/**
 * Alpha Class + ActiveCampaign Integration Server
 *
 * SSO Automático: Quando um contato entra na lista do AC,
 * automaticamente cria conta no Alpha Class e envia link de login
 *
 * Setup:
 * 1. npm install express axios dotenv
 * 2. Criar .env com ALPACLASS_TOKEN
 * 3. node alpha-class-webhook-server.js
 * 4. Configurar webhook no AC: POST https://seu-server.com/webhooks/ac-enrollment
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Configurações
const ALPACLASS_API_URL = 'https://app.alpaclass.com/api/v1';
const ALPACLASS_TOKEN = process.env.ALPACLASS_TOKEN;
const PORT = process.env.PORT || 3000;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// Validação de variáveis de ambiente
if (!ALPACLASS_TOKEN) {
  console.error('❌ ERRO: ALPACLASS_TOKEN não configurado em .env');
  process.exit(1);
}

console.log(`🚀 Alpha Class Webhook Server iniciado em ${ENVIRONMENT}`);
console.log(`📍 Porta: ${PORT}`);
console.log(`🔐 Token AlpaClass: ${ALPACLASS_TOKEN.substring(0, 10)}...`);

// ============================================================================
// WEBHOOK: ActiveCampaign → AlpaClass SSO
// ============================================================================

app.post('/webhooks/ac-enrollment', async (req, res) => {
  const startTime = Date.now();

  try {
    console.log('\n📨 [AC Webhook] Requisição recebida');

    // Validar dados
    const { contact } = req.body;

    if (!contact) {
      console.warn('⚠️ [AC Webhook] Sem dados de contato');
      return res.status(400).json({ error: 'Contato não encontrado no body' });
    }

    if (!contact.email) {
      console.warn('⚠️ [AC Webhook] Email vazio:', contact);
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    if (!contact.firstName) {
      console.warn('⚠️ [AC Webhook] Nome vazio:', contact.email);
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const email = contact.email.toLowerCase().trim();
    const name = contact.firstName + (contact.lastName ? ` ${contact.lastName}` : '');

    console.log(`👤 Processando: ${name} (${email})`);

    // ========================================================================
    // CHAMADA 1: Criar SSO no AlpaClass
    // ========================================================================

    console.log(`🔄 Criando SSO no AlpaClass...`);

    const ssoResponse = await axios.post(
      `${ALPACLASS_API_URL}/sso`,
      {
        name,
        email
      },
      {
        headers: {
          'Authorization': `Bearer ${ALPACLASS_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 segundos
      }
    );

    const { url: ssoUrl, student } = ssoResponse.data;

    console.log(`✅ SSO criado com sucesso`);
    console.log(`   - ID: ${student.id}`);
    console.log(`   - Email: ${student.email}`);
    console.log(`   - Criado em: ${student.created_at}`);
    console.log(`   - URL SSO: ${ssoUrl.substring(0, 50)}...`);

    // ========================================================================
    // Preparar resposta com SSO URL
    // ========================================================================

    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        created_at: student.created_at
      },
      sso_url: ssoUrl,
      next_steps: [
        '1. Enviar email com SSO URL ao contato',
        '2. Contato clica no link',
        '3. Login automático no Alpha Class'
      ]
    };

    // ========================================================================
    // OPCIONAL: Você pode adicionar aqui:
    // - Envio de email (SendGrid, Mailgun, etc)
    // - Atualizar contato no AC com o student_id
    // - Guardar em banco de dados local para logs
    // ========================================================================

    res.json(responseData);

    console.log(`⏱️  Completado em ${Date.now() - startTime}ms\n`);

  } catch (error) {
    console.error('\n❌ Erro ao processar webhook:');

    const errorData = error.response?.data || {};
    const errorMessage = error.message;

    console.error(`   Status: ${error.response?.status || 'N/A'}`);
    console.error(`   Mensagem: ${errorMessage}`);
    console.error(`   Detalhes: ${JSON.stringify(errorData)}`);

    // Sempre retornar 200 ao AC para não ficar retry infinito
    res.status(200).json({
      success: false,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      error: errorMessage,
      error_details: errorData,
      suggestion: 'Verifique o log do servidor para mais detalhes'
    });
  }
});

// ============================================================================
// HEALTH CHECK (para monitoramento e testes)
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: ENVIRONMENT,
    timestamp: new Date().toISOString(),
    alpaclass_token: ALPACLASS_TOKEN ? 'configurado' : 'não configurado'
  });
});

// ============================================================================
// INFO: Retorna instruções de uso
// ============================================================================

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Alpha Class Webhook Server</title>
      <style>
        body { font-family: Arial; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #333; }
        .status { background: #d4edda; padding: 10px; border-radius: 4px; color: #155724; }
        .endpoint { background: #e2e3e5; padding: 15px; margin: 10px 0; border-radius: 4px; font-family: monospace; }
        code { background: #f8f9fa; padding: 2px 6px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Alpha Class Webhook Server</h1>

        <div class="status">✅ Servidor rodando</div>

        <h2>Endpoints Disponíveis</h2>

        <h3>1. Webhook do ActiveCampaign (POST)</h3>
        <div class="endpoint">
          POST /webhooks/ac-enrollment
        </div>
        <p>Recebe dados do contato do AC e cria SSO automático no Alpha Class.</p>
        <strong>Body esperado:</strong>
        <pre>{
  "contact": {
    "email": "aluno@example.com",
    "firstName": "João",
    "lastName": "Silva"
  }
}</pre>

        <h3>2. Health Check (GET)</h3>
        <div class="endpoint">
          GET /health
        </div>
        <p>Verifica se o servidor está online.</p>

        <h2>Setup ActiveCampaign</h2>
        <ol>
          <li>Ir para Automations > Webhooks</li>
          <li>Criar novo webhook</li>
          <li>URL: <code>https://seu-dominio.com/webhooks/ac-enrollment</code></li>
          <li>Método: <code>POST</code></li>
          <li>Adicionar trigger: Contato adicionado à lista "Alunos"</li>
        </ol>

        <h2>Variáveis de Ambiente</h2>
        <p>Criar arquivo <code>.env</code>:</p>
        <pre>ALPACLASS_TOKEN=seu_token_aqui
PORT=3000
NODE_ENV=production</pre>

        <h2>Logs</h2>
        <p>Verifique o console/logs para saber o status de cada requisição.</p>
      </div>
    </body>
    </html>
  `);
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err, req, res, next) => {
  console.error('❌ Erro não tratado:', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: err.message
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n✅ Servidor iniciado com sucesso`);
  console.log(`\n📍 Endpoints:`);
  console.log(`   • Webhook: POST http://localhost:${PORT}/webhooks/ac-enrollment`);
  console.log(`   • Health: GET http://localhost:${PORT}/health`);
  console.log(`   • Info: GET http://localhost:${PORT}/`);
  console.log(`\n🔗 Configure no ActiveCampaign:`);
  console.log(`   https://seu-dominio.com/webhooks/ac-enrollment\n`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
});
