/**
 * ClickSign API v3 - Contract Management
 * Handles envelope creation, document upload, signer management, and webhooks
 *
 * Used by: @legal (Lex) agent
 * Triggered by: @pm (Alex) during client onboarding
 */

const fs = require('fs');
const path = require('path');

// ClickSign API Configuration
const CLICKSIGN_CONFIG = {
  sandbox: 'https://sandbox.clicksign.com/api/v3',
  production: 'https://app.clicksign.com/api/v3',
  contentType: 'application/vnd.api+json'
};

class ClickSignAPI {
  /**
   * @param {object} options
   * @param {string} options.apiKey - ClickSign API access token
   * @param {boolean} [options.sandbox=true] - Use sandbox environment
   */
  constructor({ apiKey, sandbox = true } = {}) {
    if (!apiKey) throw new Error('ClickSign API key is required');
    this.apiKey = apiKey;
    this.baseUrl = sandbox ? CLICKSIGN_CONFIG.sandbox : CLICKSIGN_CONFIG.production;
    this.headers = {
      'Authorization': apiKey,
      'Content-Type': CLICKSIGN_CONFIG.contentType,
      'Accept': CLICKSIGN_CONFIG.contentType
    };
  }

  /**
   * Make API request to ClickSign
   */
  async _request(method, endpoint, body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = { method, headers: this.headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      const error = new Error(`ClickSign API Error ${response.status}: ${JSON.stringify(data)}`);
      error.status = response.status;
      error.response = data;
      throw error;
    }

    return data;
  }

  // ═══════════════════════════════════════════
  // ENVELOPE OPERATIONS
  // ═══════════════════════════════════════════

  /**
   * Create a new envelope (container for documents + signers)
   * @param {string} name - Envelope name (e.g., "Contrato - Dra. Vanessa Soares")
   */
  async createEnvelope(name) {
    return this._request('POST', '/envelopes', {
      data: {
        type: 'envelopes',
        attributes: { name }
      }
    });
  }

  /**
   * List all envelopes
   */
  async listEnvelopes() {
    return this._request('GET', '/envelopes');
  }

  /**
   * Get envelope details
   */
  async getEnvelope(envelopeId) {
    return this._request('GET', `/envelopes/${envelopeId}`);
  }

  /**
   * Activate envelope (starts the signing process)
   */
  async activateEnvelope(envelopeId) {
    return this._request('PATCH', `/envelopes/${envelopeId}`, {
      data: {
        id: envelopeId,
        type: 'envelopes',
        attributes: { status: 'running' }
      }
    });
  }

  // ═══════════════════════════════════════════
  // DOCUMENT OPERATIONS
  // ═══════════════════════════════════════════

  /**
   * Upload a PDF document to an envelope
   * @param {string} envelopeId - Envelope ID
   * @param {string} filePath - Path to PDF file
   * @param {string} [filename] - Override filename
   */
  async uploadDocument(envelopeId, filePath, filename) {
    const fileBuffer = fs.readFileSync(filePath);
    const base64Content = `data:application/pdf;base64,${fileBuffer.toString('base64')}`;
    const fname = filename || path.basename(filePath);

    return this._request('POST', `/envelopes/${envelopeId}/documents`, {
      data: {
        type: 'documents',
        attributes: {
          filename: fname,
          content_base64: base64Content
        }
      }
    });
  }

  // ═══════════════════════════════════════════
  // SIGNER OPERATIONS
  // ═══════════════════════════════════════════

  /**
   * Add a signer to an envelope
   * @param {string} envelopeId
   * @param {object} signer - { name, email, documentation?, birthday? }
   */
  async addSigner(envelopeId, { name, email, documentation, birthday }) {
    const attributes = { name, email };
    if (documentation) attributes.documentation = documentation;
    if (birthday) attributes.birthday = birthday;

    return this._request('POST', `/envelopes/${envelopeId}/signers`, {
      data: {
        type: 'signers',
        attributes
      }
    });
  }

  // ═══════════════════════════════════════════
  // SIGNING REQUIREMENTS
  // ═══════════════════════════════════════════

  /**
   * Add signing requirement (links signer to document with action)
   * @param {string} envelopeId
   * @param {string} documentId
   * @param {string} signerId
   * @param {object} options - { action: 'agree'|'sign', auth: 'email'|'auto_signature'|'sms', role: 'sign'|'approve' }
   */
  async addRequirement(envelopeId, documentId, signerId, { action = 'agree', auth, role = 'sign' } = {}) {
    const attributes = { action, role };
    if (auth) attributes.auth = auth;

    return this._request('POST', `/envelopes/${envelopeId}/requirements`, {
      data: {
        type: 'requirements',
        attributes,
        relationships: {
          document: { data: { type: 'documents', id: documentId } },
          signer: { data: { type: 'signers', id: signerId } }
        }
      }
    });
  }

  /**
   * Add authentication requirement for a signer
   */
  async addAuthRequirement(envelopeId, documentId, signerId, authMethod = 'email') {
    return this.addRequirement(envelopeId, documentId, signerId, {
      action: 'provide_evidence',
      auth: authMethod
    });
  }

  // ═══════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════

  /**
   * Send signature notification to all signers
   */
  async notifySigners(envelopeId) {
    return this._request('POST', `/envelopes/${envelopeId}/notifications`, {
      data: {
        type: 'notifications',
        attributes: {}
      }
    });
  }

  // ═══════════════════════════════════════════
  // WEBHOOKS
  // ═══════════════════════════════════════════

  /**
   * Register a webhook endpoint
   * @param {string} url - Webhook URL
   * @param {string[]} events - Events to listen for: ['sign', 'close', 'cancel', 'deadline']
   */
  async registerWebhook(url, events = ['sign', 'close', 'cancel']) {
    return this._request('POST', '/webhooks', {
      data: {
        type: 'webhooks',
        attributes: { url, events }
      }
    });
  }

  // ═══════════════════════════════════════════
  // HIGH-LEVEL WORKFLOWS
  // ═══════════════════════════════════════════

  /**
   * Complete contract flow: create envelope → upload PDF → add signers → activate → notify
   *
   * @param {object} options
   * @param {string} options.contractName - Name for the envelope
   * @param {string} options.pdfPath - Path to the contract PDF
   * @param {object} options.contratada - Eric's data (auto-sign) { name, email, documentation, birthday }
   * @param {object} options.contratante - Client data { name, email }
   * @param {boolean} [options.autoSignEric=false] - Use auto_signature for Eric (requires term)
   */
  async sendContract({ contractName, pdfPath, contratada, contratante, autoSignEric = false }) {
    console.log(`\n📋 Iniciando envio de contrato: ${contractName}`);

    // Step 1: Create envelope
    console.log('1️⃣  Criando envelope...');
    const envelope = await this.createEnvelope(contractName);
    const envelopeId = envelope.data.id;
    console.log(`   ✅ Envelope criado: ${envelopeId}`);

    // Step 2: Upload document
    console.log('2️⃣  Fazendo upload do contrato...');
    const document = await this.uploadDocument(envelopeId, pdfPath);
    const documentId = document.data.id;
    console.log(`   ✅ Documento enviado: ${documentId}`);

    // Step 3: Add Eric (CONTRATADA) as signer
    console.log('3️⃣  Adicionando CONTRATADA (Eric)...');
    const signerEric = await this.addSigner(envelopeId, contratada);
    const signerEricId = signerEric.data.id;
    console.log(`   ✅ Eric adicionado: ${signerEricId}`);

    // Step 4: Add Client (CONTRATANTE) as signer
    console.log('4️⃣  Adicionando CONTRATANTE (Cliente)...');
    const signerClient = await this.addSigner(envelopeId, contratante);
    const signerClientId = signerClient.data.id;
    console.log(`   ✅ Cliente adicionado: ${signerClientId}`);

    // Step 5: Configure signing requirements
    console.log('5️⃣  Configurando requisitos de assinatura...');

    // Eric: agree + auth (auto or email)
    await this.addRequirement(envelopeId, documentId, signerEricId, {
      action: 'agree', role: 'sign'
    });
    const ericAuth = autoSignEric ? 'auto_signature' : 'email';
    await this.addAuthRequirement(envelopeId, documentId, signerEricId, ericAuth);
    console.log(`   ✅ Eric: agree + ${ericAuth}`);

    // Client: agree + email auth
    await this.addRequirement(envelopeId, documentId, signerClientId, {
      action: 'agree', role: 'sign'
    });
    await this.addAuthRequirement(envelopeId, documentId, signerClientId, 'email');
    console.log('   ✅ Cliente: agree + email');

    // Step 6: Activate envelope
    console.log('6️⃣  Ativando envelope...');
    await this.activateEnvelope(envelopeId);
    console.log('   ✅ Envelope ativo!');

    // Step 7: Send notifications
    console.log('7️⃣  Enviando notificações...');
    await this.notifySigners(envelopeId);
    console.log('   ✅ Notificações enviadas!');

    const result = {
      envelopeId,
      documentId,
      signers: {
        contratada: { id: signerEricId, name: contratada.name, auth: ericAuth },
        contratante: { id: signerClientId, name: contratante.name, auth: 'email' }
      },
      status: 'running',
      dashboardUrl: `${this.baseUrl.replace('/api/v3', '')}/envelopes/${envelopeId}`
    };

    console.log('\n🎉 Contrato enviado com sucesso!');
    console.log(`📎 Dashboard: ${result.dashboardUrl}`);
    console.log(`📧 ${contratante.name} receberá email para assinar.\n`);

    return result;
  }
}

// Eric's fixed data (CONTRATADA) - always the same in all contracts
const ERIC_CONTRATADA = {
  name: 'ERIC DOS SANTOS TEIXEIRA',
  email: 'ericsottnas@gmail.com',
  documentation: '42.284.418/0001-18'
};

module.exports = { ClickSignAPI, ERIC_CONTRATADA, CLICKSIGN_CONFIG };
