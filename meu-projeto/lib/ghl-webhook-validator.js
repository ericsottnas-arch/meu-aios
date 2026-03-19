// meu-projeto/lib/ghl-webhook-validator.js
// Validação de assinatura de webhook do GHL

const crypto = require('crypto');

class GHLWebhookValidator {
  /**
   * Validar assinatura do webhook GHL
   * @param {string} signature - Header X-GHL-Signature do webhook
   * @param {string} body - Raw body string do webhook
   * @param {string} webhookSecret - Webhook secret do GHL
   * @returns {boolean} true se válido, false se inválido
   */
  static validateSignature(signature, body, webhookSecret) {
    if (!signature || !webhookSecret) {
      console.warn('⚠️ Signature validation skipped: missing signature or webhook secret');
      return true; // Em dev, permitir sem assinatura
    }

    try {
      // GHL usa HMAC-SHA256
      const hash = crypto
        .createHmac('sha256', webhookSecret)
        .update(body, 'utf-8')
        .digest('base64');

      const computedSignature = `sha256=${hash}`;

      // Comparar de forma segura (timing attack resistant)
      return crypto.timingSafeEqual(
        Buffer.from(computedSignature),
        Buffer.from(signature)
      );
    } catch (error) {
      console.error('Erro ao validar assinatura:', error.message);
      return false;
    }
  }

  /**
   * Extrair dados do evento webhook
   * @param {object} payload - Payload do webhook
   * @returns {object} Dados extraídos do evento
   */
  static parseEvent(payload) {
    if (!payload || !payload.data) {
      return null;
    }

    const { data } = payload;

    // Webhook de mensagem inbound
    if (data.Message) {
      return {
        eventType: 'message',
        direction: 'inbound',
        message: {
          id: data.Message.id,
          conversationId: data.Message.conversationId,
          body: data.Message.body,
          from: data.Message.from,
          to: data.Message.to,
          timestamp: data.Message.timestamp,
          type: data.Message.type || 'inbound',
          attachments: data.Message.attachments || []
        }
      };
    }

    // Webhook de conversa não lida
    if (data.ConversationUnread !== undefined) {
      return {
        eventType: 'conversation_unread',
        conversationId: data.conversationId,
        unreadCount: data.ConversationUnread
      };
    }

    // Outros webhooks (presença, digitação, etc)
    return {
      eventType: 'unknown',
      rawData: data
    };
  }
}

module.exports = GHLWebhookValidator;
