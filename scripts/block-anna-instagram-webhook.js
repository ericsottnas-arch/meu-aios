/**
 * Webhook: Bloqueia Instagram para Anna — Dr. Enio
 * Porta 3101
 *
 * Intercepta InboundMessage do Instagram e remove atribuição
 * da Anna imediatamente quando a conversa chegar nela.
 */
const http  = require('http');
const https = require('https');
require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });

const GHL_TOKEN   = process.env.GHL_ENIO_API_KEY;
const LOCATION_ID = process.env.GHL_ENIO_LOCATION_ID;
const ANNA_ID     = '28UD0m4zHFmx2xrZZ1YR';
const PORT        = 3101;

function ghlRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'services.leadconnectorhq.com',
      path, method,
      headers: {
        'Authorization': `Bearer ${GHL_TOKEN}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getConversation(convId) {
  const res = await ghlRequest('GET', `/conversations/${convId}`);
  return res.conversation || res;
}

async function unassignContact(contactId) {
  return ghlRequest('PUT', `/contacts/${contactId}`, { assignedTo: null });
}

async function handleInboundMessage(payload) {
  const type = (payload.type || payload.messageType || payload.channel || '').toUpperCase();
  const isInstagram = type.includes('INSTAGRAM') || type.includes('IG');

  if (!isInstagram) return; // Ignora não-Instagram

  const convId     = payload.conversationId || payload.id;
  const contactId  = payload.contactId;
  const assignedTo = payload.assignedTo || payload.userId;
  const locationId = payload.locationId;

  if (locationId && locationId !== LOCATION_ID) return; // Ignora outras locations

  console.log(`[IG] Mensagem Instagram | conv: ${convId} | contact: ${contactId} | assigned: ${assignedTo}`);

  // Se a conversa já vem atribuída à Anna no payload, desatribuir
  if (assignedTo === ANNA_ID && contactId) {
    console.log(`[IG] ⚠️  Atribuída à Anna — removendo...`);
    await unassignContact(contactId);
    console.log(`[IG] ✅ Contato ${contactId} desatribuído.`);
    return;
  }

  // Se não temos assignedTo no payload, buscar a conversa
  if (convId) {
    try {
      const conv = await getConversation(convId);
      if (conv.assignedTo === ANNA_ID && conv.contactId) {
        console.log(`[IG] ⚠️  Conversa ${convId} está na Anna — removendo...`);
        await unassignContact(conv.contactId);
        console.log(`[IG] ✅ Contato ${conv.contactId} desatribuído.`);
      }
    } catch(e) {
      console.error(`[IG] Erro ao buscar conversa ${convId}: ${e.message}`);
    }
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(200); return res.end('ok');
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    res.writeHead(200); res.end('ok'); // Responde imediatamente

    try {
      const payload = JSON.parse(body);
      const event = payload.type || payload.event || payload.eventType || 'unknown';

      console.log(`[IN] ${new Date().toISOString()} | event: ${event} | type: ${payload.messageType || payload.channel || '-'}`);

      await handleInboundMessage(payload);
    } catch(e) {
      console.error('[ERROR]', e.message);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Block Anna Instagram Webhook rodando na porta ${PORT}`);
  console.log(`URL: http://187.77.252.12:${PORT}`);
});
