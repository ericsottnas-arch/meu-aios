#!/usr/bin/env node
/**
 * Meta Leadgen Webhook — Dr. Humberto Andrade
 * Porta: 3100
 *
 * Fluxo:
 * 1. Meta envia webhook quando lead preenche formulário nativo
 * 2. Buscamos ad_id, adset_id, campaign_id via Meta Leads API
 * 3. Resolvemos nomes de campanha/conjunto/anúncio
 * 4. Encontramos o contato no GHL por telefone ou email
 * 5. Atualizamos os custom fields UTM
 *
 * Deploy: PM2 — meta-lead-webhook-humberto
 */

const http  = require('http');
const https = require('https');
require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });

const META_TOKEN   = process.env.META_ACCESS_TOKEN;
const GHL_TOKEN    = process.env.GHL_HUMBERTO_TOKEN;
const LOCATION_ID  = process.env.GHL_HUMBERTO_LOCATION_ID;
const PAGE_ID      = '104425248310435'; // Dr. Humberto Andrade
const VERIFY_TOKEN = 'syra-humberto-meta-leads-2026';
const PORT         = 3101;

// IDs dos campos UTM no GHL (confirmados)
const UTM_FIELDS = {
  utmSource:   'nvufOPP8cZuB12jBv7Bs',
  utmMedium:   'DoFMXsBzk6L4wGk2ZM0a',
  utmCampaign: 'Cycy9Gne1ZvW8GKadxcn',
  utmContent:  'Wb72WyVmin6bm3RDRa2S',
  utmTerm:     'ArfUh1uITRLSgjsemAEM',
};

// ─── Helpers HTTP ──────────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({}); }
      });
    }).on('error', reject);
  });
}

function ghlRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${GHL_TOKEN}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({}); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── Meta API ──────────────────────────────────────────────────────────────────

let _pageToken = null;
async function getPageToken() {
  if (_pageToken) return _pageToken;
  const res = await httpsGet(`https://graph.facebook.com/v21.0/me/accounts?access_token=${META_TOKEN}`);
  const page = (res.data || []).find(p => p.id === PAGE_ID);
  if (!page) throw new Error('Página não encontrada');
  _pageToken = page.access_token;
  return _pageToken;
}

async function getLeadData(leadgenId) {
  const pageToken = await getPageToken();
  const url = `https://graph.facebook.com/v21.0/${leadgenId}?fields=field_data,created_time,ad_id,adset_id,campaign_id&access_token=${pageToken}`;
  return httpsGet(url);
}

async function getMetaName(id) {
  if (!id) return '';
  const url = `https://graph.facebook.com/v21.0/${id}?fields=name&access_token=${META_TOKEN}`;
  const res = await httpsGet(url);
  return res.name || '';
}

async function getPlacement(adId) {
  if (!adId) return 'facebook';
  const url = `https://graph.facebook.com/v21.0/${adId}?fields=name,adset{publisher_platforms}&access_token=${META_TOKEN}`;
  const res = await httpsGet(url);
  const platforms = res.adset?.publisher_platforms || [];
  if (platforms.includes('instagram') && platforms.includes('facebook')) return 'facebook_instagram';
  if (platforms.includes('instagram')) return 'instagram';
  return 'facebook';
}

// ─── GHL API ───────────────────────────────────────────────────────────────────

function normalizePhone(phone) {
  let n = (phone || '').replace(/\D/g, '');
  if (!n.startsWith('55') && n.length <= 11) n = '55' + n;
  return '+' + n;
}

async function searchContact(field, value) {
  const res = await ghlRequest('POST', '/contacts/search', {
    locationId: LOCATION_ID,
    filters: [{ field, operator: 'eq', value }],
    page: 1,
    pageLimit: 1,
  });
  return (res.contacts || [])[0] || null;
}

async function findContact(phone, email) {
  if (phone) {
    const c = await searchContact('phone', normalizePhone(phone));
    if (c) return c;
  }
  if (email) {
    const c = await searchContact('email', email);
    if (c) return c;
  }
  return null;
}

async function updateGHLUtms(contactId, utms) {
  const customFields = [];

  if (utms.source)   customFields.push({ id: UTM_FIELDS.utmSource,   value: utms.source });
  if (utms.medium)   customFields.push({ id: UTM_FIELDS.utmMedium,   value: utms.medium });
  if (utms.campaign) customFields.push({ id: UTM_FIELDS.utmCampaign, value: utms.campaign });
  if (utms.content)  customFields.push({ id: UTM_FIELDS.utmContent,  value: utms.content });
  if (utms.term)     customFields.push({ id: UTM_FIELDS.utmTerm,     value: utms.term });

  if (customFields.length === 0) return null;
  return ghlRequest('PUT', `/contacts/${contactId}`, { customFields });
}

// ─── Processamento principal ───────────────────────────────────────────────────

async function processLead(leadgenId, pageId) {
  console.log(`\n[LEAD] ${leadgenId} | page: ${pageId}`);

  // 1. Busca dados do lead no Meta
  const lead = await getLeadData(leadgenId);
  if (!lead || lead.error) {
    console.log(`[WARN] Não foi possível buscar lead ${leadgenId}:`, lead?.error?.message);
    return;
  }

  const { field_data = [], ad_id, adset_id, campaign_id } = lead;

  // 2. Extrai telefone e email dos campos do formulário
  let phone = '';
  let email = '';
  for (const field of field_data) {
    const key = (field.name || '').toLowerCase();
    if (key.includes('phone') || key === 'phone_number') phone = field.values?.[0] || '';
    if (key.includes('email')) email = field.values?.[0] || '';
  }

  console.log(`[INFO] phone=${phone} | email=${email} | ad=${ad_id} | adset=${adset_id} | campaign=${campaign_id}`);

  // 3. Resolve nomes de campanha, conjunto e anúncio em paralelo
  const [campaignName, adsetName, adName, placement] = await Promise.all([
    getMetaName(campaign_id),
    getMetaName(adset_id),
    getMetaName(ad_id),
    getPlacement(ad_id),
  ]);

  const utms = {
    source:   placement || 'facebook',
    medium:   'cpc',
    campaign: campaignName && campaign_id ? `${campaignName}${campaign_id}` : (campaign_id || ''),
    content:  adsetName && adset_id ? `${adsetName}${adset_id}` : (adset_id || ''),
    term:     adName && ad_id ? `${adName}_${ad_id}` : (ad_id || ''),
  };

  console.log(`[INFO] UTMs: source=${utms.source} | campaign=${utms.campaign?.substring(0, 40)}...`);

  // 4. Encontra contato no GHL
  let contact = null;
  contact = await findContact(phone, email);

  if (!contact) {
    console.log(`[WARN] Contato não encontrado no GHL para phone=${phone} email=${email}`);
    return;
  }

  console.log(`[INFO] Contato GHL encontrado: ${contact.id} — ${contact.firstName} ${contact.lastName}`);

  // 5. Atualiza UTMs no GHL
  const result = await updateGHLUtms(contact.id, utms);
  console.log(`[OK] UTMs atualizados para ${contact.id}:`, JSON.stringify(result)?.substring(0, 80));
}

// ─── Servidor HTTP ─────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`);

  // Verificação do webhook Meta (GET)
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[OK] Webhook verificado pelo Meta');
      res.writeHead(200);
      return res.end(challenge);
    }
    res.writeHead(403);
    return res.end('Forbidden');
  }

  // Recebe leads do Meta (POST)
  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      // Responde imediatamente para Meta não retentar
      res.writeHead(200);
      res.end('ok');

      try {
        const payload = JSON.parse(body);
        const entries = payload.entry || [];

        for (const entry of entries) {
          const changes = entry.changes || [];
          for (const change of changes) {
            if (change.field === 'leadgen') {
              const { leadgen_id, page_id } = change.value;
              await processLead(leadgen_id, page_id);
            }
          }
        }
      } catch (err) {
        console.error('[ERROR]', err.message);
      }
    });
    return;
  }

  res.writeHead(405);
  res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`Meta Leadgen Webhook — Humberto rodando na porta ${PORT}`);
  console.log(`Webhook URL: http://187.77.252.12:${PORT}`);
  console.log(`Verify Token: ${VERIFY_TOKEN}`);
});
