// meu-projeto/lib/ghl-api.js
// Integracao com GoHighLevel API v2 (LeadConnector)

const axios = require('axios');

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const API_KEY = process.env.GHL_ACCESS_TOKEN;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
const API_VERSION = '2021-07-28';

class GHLAPI {
  constructor() {
    if (!API_KEY) {
      console.warn('⚠️ GHL_ACCESS_TOKEN nao configurado');
    }
    if (!LOCATION_ID) {
      console.warn('⚠️ GHL_LOCATION_ID nao configurado');
    }

    this.client = axios.create({
      baseURL: GHL_API_BASE,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Version': API_VERSION,
      },
    });
  }

  /**
   * Buscar conversas (com filtros opcionais)
   */
  async getConversations(params = {}) {
    try {
      if (!API_KEY || !LOCATION_ID) {
        return { success: false, error: 'API Key ou Location ID nao configurado', data: [] };
      }

      const response = await this.client.get('/conversations/search', {
        params: {
          locationId: LOCATION_ID,
          limit: params.limit || 20,
          ...params,
        },
      });

      return {
        success: true,
        data: response.data.conversations || [],
        total: response.data.total || 0,
      };
    } catch (error) {
      console.error('❌ Erro ao buscar conversas GHL:', error.response?.data?.message || error.message);
      return { success: false, error: error.response?.data?.message || error.message, data: [] };
    }
  }

  /**
   * Buscar mensagens de uma conversa
   */
  async getConversationMessages(conversationId, params = {}) {
    try {
      if (!API_KEY) {
        return { success: false, error: 'API Key nao configurado', data: [] };
      }

      const response = await this.client.get(`/conversations/${conversationId}/messages`, {
        params: { limit: params.limit || 20, type: params.type },
      });

      const msgs = response.data.messages?.messages || response.data.messages || [];
      return { success: true, data: msgs };
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens:', error.response?.data?.message || error.message);
      return { success: false, error: error.response?.data?.message || error.message, data: [] };
    }
  }

  /**
   * Enviar mensagem via GHL v2
   * @param {string} contactId - Contact ID (nao conversation ID)
   * @param {string} message - Texto da mensagem
   * @param {string} type - Tipo: SMS, Email, WhatsApp, IG, FB, GMB, Live_Chat
   */
  async sendMessage(contactId, message, type = 'IG') {
    try {
      if (!API_KEY) {
        return { success: false, error: 'API Key nao configurado' };
      }

      const response = await this.client.post('/conversations/messages', {
        type,
        contactId,
        message,
      });

      return {
        success: true,
        data: response.data,
        conversationId: response.data.conversationId,
        messageId: response.data.messageId,
      };
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.response?.data?.message || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Obter detalhes de uma conversa
   */
  async getConversationDetails(conversationId) {
    try {
      if (!API_KEY) {
        return { success: false, error: 'API Key nao configurado' };
      }

      const response = await this.client.get(`/conversations/${conversationId}`);
      return { success: true, data: response.data.conversation || response.data };
    } catch (error) {
      console.error('❌ Erro ao obter detalhes:', error.response?.data?.message || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Buscar contato por ID
   */
  async getContact(contactId) {
    try {
      if (!API_KEY) {
        return { success: false, error: 'API Key nao configurado' };
      }

      const response = await this.client.get(`/contacts/${contactId}`);
      return { success: true, data: response.data.contact || response.data };
    } catch (error) {
      console.error('❌ Erro ao buscar contato:', error.response?.data?.message || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Buscar conversas de um contato específico
   * @param {string} contactId - GHL Contact ID
   */
  async searchConversations(contactId) {
    try {
      if (!API_KEY || !LOCATION_ID) {
        return { success: false, error: 'API Key ou Location ID nao configurado', data: [] };
      }

      const response = await this.client.get('/conversations/search', {
        params: {
          locationId: LOCATION_ID,
          contactId,
          limit: 20,
        },
      });

      return {
        success: true,
        data: response.data.conversations || [],
        total: response.data.total || 0,
      };
    } catch (error) {
      console.error('❌ Erro ao buscar conversas por contactId:', error.response?.data?.message || error.message);
      return { success: false, error: error.response?.data?.message || error.message, data: [] };
    }
  }

  /**
   * Buscar contato por telefone
   * @param {string} phone - Telefone para buscar (formato +5511999991234)
   */
  async searchContactByPhone(phone) {
    try {
      if (!API_KEY || !LOCATION_ID) {
        return { success: false, error: 'API Key ou Location ID nao configurado', data: null };
      }

      // GHL v2: GET /contacts/ with query filter
      const response = await this.client.get('/contacts/', {
        params: {
          locationId: LOCATION_ID,
          query: phone,
          limit: 1,
        },
      });

      const contacts = response.data.contacts || [];
      return {
        success: contacts.length > 0,
        data: contacts[0] || null,
      };
    } catch (error) {
      // Silently fail — phone search is best-effort
      return { success: false, error: error.response?.data?.message || error.message, data: null };
    }
  }

  /**
   * Buscar conversas recentes com mensagens inbound nao processadas
   * Usado pelo polling da Iris
   */
  async getRecentInboundConversations(sinceTimestamp) {
    try {
      if (!API_KEY || !LOCATION_ID) {
        return { success: false, error: 'Configuracao incompleta', data: [] };
      }

      const response = await this.client.get('/conversations/search', {
        params: {
          locationId: LOCATION_ID,
          limit: 20,
          sortBy: 'last_message_date',
          sortOrder: 'desc',
        },
      });

      const conversations = response.data.conversations || [];

      // Filtrar conversas com ultima mensagem inbound e apos o timestamp
      const recent = conversations.filter((c) => {
        const lastMsgDate = c.lastMessageDate?.seconds
          ? c.lastMessageDate.seconds * 1000
          : new Date(c.lastMessageDate).getTime();
        return c.lastMessageDirection === 'inbound' && lastMsgDate > sinceTimestamp;
      });

      return { success: true, data: recent };
    } catch (error) {
      console.error('❌ Erro ao buscar conversas recentes:', error.response?.data?.message || error.message);
      return { success: false, error: error.response?.data?.message || error.message, data: [] };
    }
  }

  /**
   * Testar conexao
   */
  async testConnection() {
    try {
      if (!API_KEY || !LOCATION_ID) {
        return { success: false, error: 'API Key ou Location ID nao configurado' };
      }

      const response = await this.client.get('/conversations/search', {
        params: { locationId: LOCATION_ID, limit: 1 },
      });

      return {
        success: true,
        message: '✅ Conectado ao GHL v2',
        total: response.data.total,
      };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }
}

module.exports = new GHLAPI();
