/**
 * Client para a API StevoManager v2 (stevo.chat).
 * Gerencia envio de mensagens, operações de grupo e controle de instância.
 *
 * Autenticação: Header "apikey" com a API Key da instância.
 */

const STEVO_API_URL = process.env.STEVO_API_URL?.replace(/\/+$/, '');
const STEVO_API_KEY = process.env.STEVO_API_KEY;

function ensureConfig() {
  if (!STEVO_API_URL || !STEVO_API_KEY) {
    throw new Error('STEVO_API_URL e STEVO_API_KEY precisam estar definidas no .env');
  }
}

/**
 * Faz uma requisição para a API do Stevo.
 */
async function stevoRequest(method, path, body = null) {
  ensureConfig();

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': STEVO_API_KEY,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const url = `${STEVO_API_URL}${path}`;
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errMsg = data?.message || data?.error || response.statusText;
    throw new Error(`Stevo API ${method} ${path} [${response.status}]: ${errMsg}`);
  }

  return data;
}

// ============================================================
// Envio de Mensagens
// ============================================================

/**
 * Envia mensagem de texto.
 * @param {string} number - JID do destinatário (ex: '5511999999999@s.whatsapp.net' ou 'xxxxx@g.us')
 * @param {string} text - Texto da mensagem
 * @param {Object} [options] - Opções adicionais
 * @param {string} [options.quotedMessageId] - ID da mensagem para responder
 * @param {string} [options.quotedParticipant] - Participante da mensagem quotada (para grupos)
 * @param {boolean} [options.mentionAll] - Mencionar todos no grupo
 * @param {number} [options.delay] - Delay em ms antes de enviar
 */
async function sendText(number, text, options = {}) {
  const body = { number, text, formatJid: true };

  if (options.delay) body.delay = options.delay;
  if (options.mentionAll) body.mentionAll = true;
  if (options.quotedMessageId) {
    body.quoted = { messageId: options.quotedMessageId };
    if (options.quotedParticipant) {
      body.quoted.participant = options.quotedParticipant;
    }
  }

  return stevoRequest('POST', '/send/text', body);
}

/**
 * Envia mídia (imagem, vídeo, documento, áudio).
 * @param {string} number - JID do destinatário
 * @param {string} url - URL do arquivo de mídia
 * @param {string} type - Tipo: 'image' | 'video' | 'document' | 'audio'
 * @param {Object} [options] - Opções adicionais
 * @param {string} [options.caption] - Legenda
 * @param {string} [options.filename] - Nome do arquivo
 */
async function sendMedia(number, url, type, options = {}) {
  const body = { number, url, type };

  if (options.caption) body.caption = options.caption;
  if (options.filename) body.filename = options.filename;
  if (options.delay) body.delay = options.delay;

  return stevoRequest('POST', '/send/media', body);
}

/**
 * Envia reação a uma mensagem.
 * @param {string} number - JID do chat
 * @param {string} messageId - ID da mensagem
 * @param {string} reaction - Emoji da reação (ex: '\ud83d\udc4d')
 * @param {Object} [options]
 * @param {boolean} [options.fromMe] - Se a mensagem original é do bot
 * @param {string} [options.participant] - Participante em grupo
 */
async function reactToMessage(number, messageId, reaction, options = {}) {
  const body = {
    number,
    id: messageId,
    reaction,
  };

  if (options.fromMe !== undefined) body.fromMe = options.fromMe;
  if (options.participant) body.participant = options.participant;

  return stevoRequest('POST', '/message/react', body);
}

/**
 * Marca mensagens como lidas.
 * @param {string} number - JID do chat
 * @param {string[]} messageIds - Array de IDs de mensagens
 */
async function markAsRead(number, messageIds) {
  return stevoRequest('POST', '/message/markread', {
    number,
    id: messageIds,
  });
}

/**
 * Simula presença (digitando/gravando áudio).
 * @param {string} number - JID do chat
 * @param {string} state - 'composing' | 'recording' | 'paused'
 * @param {boolean} [isAudio=false]
 */
async function setPresence(number, state, isAudio = false) {
  return stevoRequest('POST', '/message/presence', {
    number,
    state,
    isAudio,
  });
}

/**
 * Baixa uma imagem de uma mensagem.
 * @param {Object} message - Objeto de mensagem do WhatsApp (waE2E.Message)
 */
async function downloadImage(message) {
  return stevoRequest('POST', '/message/downloadimage', { message });
}

/**
 * Baixa e descriptografa uma mídia (áudio, vídeo, documento) de uma mensagem.
 * Retorna um Buffer com os bytes do arquivo já descriptografado.
 * @param {Object} rawMessage - Objeto Message completo do webhook (ex: { audioMessage: {...} })
 */
async function downloadMedia(rawMessage) {
  ensureConfig();

  const response = await fetch(`${STEVO_API_URL}/message/downloadmedia`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': STEVO_API_KEY,
    },
    body: JSON.stringify({ message: rawMessage }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Stevo downloadMedia [${response.status}]: ${errText}`);
  }

  // Retorna os bytes brutos (buffer)
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ============================================================
// Gerenciamento de Grupos
// ============================================================

/**
 * Lista todos os grupos.
 */
async function listGroups() {
  return stevoRequest('GET', '/group/list');
}

/**
 * Obtém informações de um grupo.
 * @param {string} groupJid - JID do grupo
 */
async function getGroupInfo(groupJid) {
  return stevoRequest('POST', '/group/info', { groupJid });
}

/**
 * Obtém link de convite do grupo.
 * @param {string} groupJid - JID do grupo
 * @param {boolean} [reset=false] - Resetar o link
 */
async function getGroupInviteLink(groupJid, reset = false) {
  return stevoRequest('POST', '/group/invitelink', { groupJid, reset });
}

/**
 * Cria um novo grupo WhatsApp.
 * @param {string} groupName - Nome do grupo
 * @param {string[]} participants - Array de números (ex: ['5531999999999'])
 * @returns {Promise<{groupJid: string}>}
 */
async function createGroup(groupName, participants) {
  return stevoRequest('POST', '/group/create', { groupName, participants });
}

/**
 * Define a descrição de um grupo.
 * @param {string} groupJid - JID do grupo
 * @param {string} description - Descrição do grupo
 */
async function setGroupDescription(groupJid, description) {
  return stevoRequest('POST', '/group/description', { groupJid, description });
}

/**
 * Adiciona ou remove participantes de um grupo.
 * @param {string} groupJid - JID do grupo
 * @param {'add'|'remove'} action - Ação
 * @param {string[]} participants - Array de números
 */
async function updateGroupParticipants(groupJid, action, participants) {
  return stevoRequest('POST', '/group/participant', { groupJid, action, participants });
}

/**
 * Altera o nome de um grupo.
 * @param {string} groupJid - JID do grupo
 * @param {string} name - Novo nome
 */
async function setGroupName(groupJid, name) {
  return stevoRequest('POST', '/group/name', { groupJid, name });
}

/**
 * Define a foto de um grupo (base64).
 * @param {string} groupJid - JID do grupo
 * @param {string} imageBase64 - Imagem em base64
 */
async function setGroupPhoto(groupJid, imageBase64) {
  return stevoRequest('POST', '/group/photo', { groupJid, image: imageBase64 });
}

// ============================================================
// Instância
// ============================================================

/**
 * Obtém status da instância.
 */
async function getInstanceStatus() {
  return stevoRequest('GET', '/instance/status');
}

/**
 * Obtém perfil da instância (nome, número, foto).
 */
async function getInstanceProfile() {
  return stevoRequest('GET', '/instance/profile');
}

/**
 * Verifica se a API está configurada e acessível.
 */
function isConfigured() {
  return !!(STEVO_API_URL && STEVO_API_KEY);
}

module.exports = {
  // Mensagens
  sendText,
  sendMedia,
  reactToMessage,
  markAsRead,
  setPresence,
  downloadImage,
  downloadMedia,
  // Grupos
  listGroups,
  getGroupInfo,
  getGroupInviteLink,
  createGroup,
  setGroupDescription,
  updateGroupParticipants,
  setGroupName,
  setGroupPhoto,
  // Instância
  getInstanceStatus,
  getInstanceProfile,
  // Utils
  isConfigured,
};
