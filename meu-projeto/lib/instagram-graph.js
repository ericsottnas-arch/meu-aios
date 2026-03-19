// meu-projeto/lib/instagram-graph.js
// Integração direta com Instagram Graph API da Meta

const axios = require('axios');

const INSTAGRAM_API_BASE = 'https://graph.instagram.com/v25.0';
const TOKEN = process.env.INSTAGRAM_GRAPH_API_TOKEN;
const BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

class InstagramGraphAPI {
  constructor() {
    if (!TOKEN) {
      console.warn('⚠️ INSTAGRAM_GRAPH_API_TOKEN não configurado');
    }
  }

  /**
   * Buscar conversas (DMs) do Instagram
   */
  async getConversations(limit = 10) {
    try {
      if (!TOKEN) {
        return { success: false, error: 'Token não configurado' };
      }

      if (!BUSINESS_ACCOUNT_ID) {
        return { success: false, error: 'Instagram Business Account ID não configurado' };
      }

      const response = await axios.get(
        `${INSTAGRAM_API_BASE}/${BUSINESS_ACCOUNT_ID}/conversations?platform=instagram&fields=id,participants,updated_time,snippet,senders&limit=${limit}&access_token=${TOKEN}`
      );

      return {
        success: true,
        data: response.data.data || [],
        paging: response.data.paging || null,
      };
    } catch (error) {
      console.error('❌ Erro ao buscar conversas:', error.response?.data?.error?.message || error.message);
      return { success: false, error: error.response?.data?.error?.message || error.message, data: [] };
    }
  }

  /**
   * Buscar conversas com paginação automática (todas)
   */
  async getAllConversations(maxPages = 10) {
    let all = [];
    let url = `${INSTAGRAM_API_BASE}/${BUSINESS_ACCOUNT_ID}/conversations?platform=instagram&fields=id,participants,updated_time,snippet,senders&limit=50&access_token=${TOKEN}`;
    let page = 0;

    while (url && page < maxPages) {
      try {
        const response = await axios.get(url);
        const data = response.data.data || [];
        all = all.concat(data);
        url = response.data.paging?.next || null;
        page++;
      } catch (error) {
        console.error('❌ Paginação parou:', error.response?.data?.error?.message || error.message);
        break;
      }
    }

    return { success: true, data: all, pages: page };
  }

  /**
   * Buscar mensagens de uma conversa
   */
  async getMessages(conversationId, limit = 50) {
    try {
      if (!TOKEN) {
        return { success: false, error: 'Token não configurado', data: [] };
      }

      const response = await axios.get(
        `${INSTAGRAM_API_BASE}/${conversationId}/messages?fields=id,from,to,message,created_timestamp,type,media,subject&limit=${limit}&access_token=${TOKEN}`
      );

      return {
        success: true,
        data: (response.data.data || []).map(msg => ({
          ...msg,
          // Parse timestamp para milliseconds se necessário
          created_timestamp: msg.created_timestamp ? parseInt(msg.created_timestamp) : null
        }))
      };
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens:', error.response?.data?.error?.message || error.message);
      return { success: false, error: error.response?.data?.error?.message || error.message, data: [] };
    }
  }

  /**
   * Enviar mensagem para um contato
   */
  async sendMessage(conversationId, message) {
    try {
      if (!TOKEN) {
        return { success: false, error: 'Token não configurado' };
      }

      const response = await axios.post(
        `${INSTAGRAM_API_BASE}/${conversationId}/messages`,
        {
          message
        },
        {
          params: { access_token: TOKEN }
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.response?.data?.error?.message || error.message);
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  /**
   * Obter info do perfil
   */
  async getProfile() {
    try {
      if (!TOKEN) {
        return { success: false, error: 'Token não configurado' };
      }

      console.log('📸 Obtendo perfil do Instagram...');
      console.log('   API Base:', INSTAGRAM_API_BASE);
      console.log('   Token (primeiros 20 chars):', TOKEN.substring(0, 20) + '...');

      const response = await axios.get(
        `${INSTAGRAM_API_BASE}/me?fields=id,username,name,biography,profile_picture_url,followers_count,follows_count&access_token=${TOKEN}`
      );

      console.log('✅ Perfil obtido com sucesso');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Erro ao obter perfil:');
      console.error('   Status:', error.response?.status);
      console.error('   Message:', error.response?.data?.error?.message);
      console.error('   Code:', error.response?.data?.error?.code);
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  /**
   * Buscar detalhes de uma conversa
   */
  async getConversationDetails(conversationId) {
    try {
      if (!TOKEN) {
        return { success: false, error: 'Token não configurado' };
      }

      const response = await axios.get(
        `${INSTAGRAM_API_BASE}/${conversationId}?fields=id,participants,updated_time,former_participants,wallpaper,snippet,senders&access_token=${TOKEN}`
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Erro ao obter detalhes da conversa:', error.response?.data?.error?.message || error.message);
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  /**
   * Testar conexão com Instagram Graph API
   */
  async testConnection() {
    try {
      if (!TOKEN) {
        return { success: false, error: 'Token não configurado' };
      }

      const profile = await this.getProfile();
      if (!profile.success) {
        return profile;
      }

      return {
        success: true,
        message: '✅ Conectado ao Instagram Graph API',
        profile: profile.data
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new InstagramGraphAPI();
