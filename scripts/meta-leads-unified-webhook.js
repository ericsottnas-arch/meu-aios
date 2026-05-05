#!/usr/bin/env node
/**
 * Meta Leadgen Webhook Unificado
 * Porta: 3101 — https://humberto.syradigital.com/meta-leads
 *
 * Recebe eventos leadgen do Meta App e roteia por page_id:
 *   - Humberto (104425248310435) → GHL_HUMBERTO
 *   - Gabrielle (2002691046685746) → GHL_GABRIELLE
 *
 * Para cada lead: busca ad_id/adset_id/campaign_id via Meta API
 * e grava UTMs nos custom fields do contato no GHL correspondente.
 */

const http  = require('http');
const https = require('https');
require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });

const META_TOKEN = process.env.META_ACCESS_TOKEN;
const PORT       = 3101;
const VERIFY_TOKEN = 'syra-meta-leads-unified-2026';

// Config por cliente (page_id → credenciais GHL + campos UTM)
const CLIENTS = {
  '104425248310435': {
    name: 'Dr. Humberto',
    ghlToken:    process.env.GHL_HUMBERTO_TOKEN,
    locationId:  process.env.GHL_HUMBERTO_LOCATION_ID,
    utmFields: {
      utmSource:   'nvufOPP8cZuB12jBv7Bs',
      utmMedium:   'DoFMXsBzk6L4wGk2ZM0a',
      utmCampaign: 'Cycy9Gne1ZvW8GKadxcn',
      utmContent:  'Wb72WyVmin6bm3RDRa2S',
      utmTerm:     'ArfUh1uITRLSgjsemAEM',
    },
  },
  '2002691046685746': {
    name: 'Dra. Gabrielle',
    ghlToken:    process.env.GHL_GABRIELLE_TOKEN,
    locationId:  process.env.GHL_GABRIELLE_LOCATION_ID,
    utmFields: {
      utmSource:   '9zH2XuVVMURW7G19B6kK',
      utmMedium:   'mQKsB7XTVNHeH9XyZHQ1',
      utmCampaign: 'MRzim9V6orbJQNPBIoW3',
      utmContent:  '1WOMXwqm56ecq3ZaKoqO',
      utmTerm:     'vg503hVbnmcNE8IAVWVn',
    },
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    }).on('error', reject);
  });
}

function ghlRequest(token, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── Meta API ──────────────────────────────────────────────────────────────────

const _pageTokenCache = {};
async function getPageToken(pageId) {
  if (_pageTokenCache[pageId]) return _pageTokenCache[pageId];
  const res = await httpsGet(`https://graph.facebook.com/v21.0/me/accounts?access_token=${META_TOKEN}`);
  const page = (res.data || []).find(p => p.id === pageId);
  if (!page) throw new Error(`Página ${pageId} não encontrada`);
  _pageTokenCache[pageId] = page.access_token;
  return _pageTokenCache[pageId];
}

async function getLeadData(leadgenId, pageId) {
  const pageToken = await getPageToken(pageId);
  const url = `https://graph.facebook.com/v21.0/${leadgenId}?fields=field_data,created_time,ad_id,adset_id,campaign_id&access_token=${pageToken}`;
  return httpsGet(url);
}

async function getMetaName(id) {
  if (!id) return '';
  const url = `https://graph.facebook.com/v21.0/${id}?fields=name&access_token=${META_TOKEN}`;
  const res = await httpsGet(url);
  return res.name || '';
}

// ─── GHL API ───────────────────────────────────────────────────────────────────

function normalizePhone(phone) {
  let n = (phone || '').replace(/\D/g, '');
  if (!n.startsWith('55') && n.length <= 11) n = '55' + n;
  return '+' + n;
}

async function findContact(token, locationId, phone, email) {
  if (phone) {
    const res = await ghlRequest(token, 'POST', '/contacts/search', {
      locationId,
      filters: [{ field: 'phone', operator: 'eq', value: normalizePhone(phone) }],
      page: 1, pageLimit: 1,
    });
    const contact = (res.contacts || [])[0];
    if (contact) return contact;
  }
  if (email) {
    const res = await ghlRequest(token, 'POST', '/contacts/search', {
      locationId,
      filters: [{ field: 'email', operator: 'eq', value: email }],
      page: 1, pageLimit: 1,
    });
    const contact = (res.contacts || [])[0];
    if (contact) return contact;
  }
  return null;
}

async function updateGHLUtms(token, contactId, utmFieldIds, utms) {
  const customFields = [];
  if (utms.source)   customFields.push({ id: utmFieldIds.utmSource,   value: utms.source });
  if (utms.medium)   customFields.push({ id: utmFieldIds.utmMedium,   value: utms.medium });
  if (utms.campaign) customFields.push({ id: utmFieldIds.utmCampaign, value: utms.campaign });
  if (utms.content)  customFields.push({ id: utmFieldIds.utmContent,  value: utms.content });
  if (utms.term)     customFields.push({ id: utmFieldIds.utmTerm,     value: utms.term });
  if (!customFields.length) return null;
  return ghlRequest(token, 'PUT', `/contacts/${contactId}`, { customFields });
}

// ─── Processamento ─────────────────────────────────────────────────────────────

async function processLead(leadgenId, pageId) {
  const client = CLIENTS[pageId];
  if (!client) {
    console.log(`[SKIP] page_id ${pageId} não configurado`);
    return;
  }

  console.log(`\n[LEAD] ${leadgenId} | page: ${pageId} (${client.name})`);

  const lead = await getLeadData(leadgenId, pageId);
  if (!lead || lead.error) {
    console.log(`[WARN] Não foi possível buscar lead: ${lead?.error?.message}`);
    return;
  }

  const { field_data = [], ad_id, adset_id, campaign_id } = lead;

  let phone = '', email = '';
  for (const f of field_data) {
    const key = (f.name || '').toLowerCase();
    if (key.includes('phone') || key === 'phone_number') phone = f.values?.[0] || '';
    if (key.includes('email')) email = f.values?.[0] || '';
  }

  console.log(`[INFO] phone=${phone} | email=${email} | ad=${ad_id} | adset=${adset_id}`);

  const [campaignName, adsetName, adName] = await Promise.all([
    getMetaName(campaign_id),
    getMetaName(adset_id),
    getMetaName(ad_id),
  ]);

  const utms = {
    source:   'facebook',
    medium:   'cpc',
    campaign: campaignName && campaign_id ? `${campaignName}_${campaign_id}` : (campaign_id || ''),
    content:  adsetName && adset_id ? `${adsetName}_${adset_id}` : (adset_id || ''),
    term:     adName && ad_id ? `${adName}_${ad_id}` : (ad_id || ''),
  };

  const contact = await findContact(client.ghlToken, client.locationId, phone, email);
  if (!contact) {
    console.log(`[WARN] Contato não encontrado no GHL ${client.name} — phone=${phone}`);
    return;
  }

  console.log(`[INFO] Contato: ${contact.id} — ${contact.firstName} ${contact.lastName}`);
  await updateGHLUtms(client.ghlToken, contact.id, client.utmFields, utms);
  console.log(`[OK] UTMs gravados para ${contact.id}`);
}

// ─── Servidor ─────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`);

  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[OK] Webhook verificado');
      res.writeHead(200); return res.end(challenge);
    }
    res.writeHead(403); return res.end('Forbidden');
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      res.writeHead(200); res.end('ok');
      try {
        const payload = JSON.parse(body);
        for (const entry of (payload.entry || [])) {
          for (const change of (entry.changes || [])) {
            if (change.field === 'leadgen') {
              const { leadgen_id, page_id } = change.value;
              await processLead(leadgen_id, page_id);
            }
          }
        }
      } catch (err) { console.error('[ERROR]', err.message); }
    });
    return;
  }

  res.writeHead(405); res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`Meta Leads Unified Webhook na porta ${PORT}`);
  console.log(`URL: https://humberto.syradigital.com/meta-leads`);
  console.log(`Verify Token: ${VERIFY_TOKEN}`);
  console.log(`Clientes configurados: ${Object.values(CLIENTS).map(c => c.name).join(', ')}`);
});
