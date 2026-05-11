#!/usr/bin/env node
/**
 * Setup completo — Meta Lead Webhook — Dra. Gabrielle
 *
 * 1. Cria campos UTM no GHL da Gabrielle (se não existirem)
 * 2. Assina webhook leadgen na página do Meta
 * 3. Gera o arquivo do servidor webhook pronto para PM2
 */
const path  = require('path');
const https = require('https');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const GHL_TOKEN  = process.env.GHL_GABRIELLE_TOKEN;
const LOC_ID     = process.env.GHL_GABRIELLE_LOCATION_ID;
const META_TOKEN = process.env.META_ACCESS_TOKEN;
const PAGE_ID    = '2002691046685746'; // Página da Dra. Gabrielle
const BASE_META  = 'https://graph.facebook.com/v21.0';

// ─── GHL helpers ──────────────────────────────────────────────────────────────

function ghlRequest(method, path_, body = null) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: path_,
      method,
      headers: {
        Authorization: `Bearer ${GHL_TOKEN}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve({ raw: d.substring(0, 300) }); } });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── Criar campos UTM ─────────────────────────────────────────────────────────

const UTM_FIELDS_TO_CREATE = [
  { name: 'UTM Source',   fieldKey: 'contact.utm_source',   dataType: 'TEXT' },
  { name: 'UTM Medium',   fieldKey: 'contact.utm_medium',   dataType: 'TEXT' },
  { name: 'UTM Campaign', fieldKey: 'contact.utm_campaign', dataType: 'TEXT' },
  { name: 'UTM Content',  fieldKey: 'contact.utm_content',  dataType: 'TEXT' },
  { name: 'UTM Term',     fieldKey: 'contact.utm_term',     dataType: 'TEXT' },
];

async function getExistingFields() {
  const r = await ghlRequest('GET', `/locations/${LOC_ID}/customFields`);
  return r.customFields || [];
}

async function createUtmFields() {
  console.log('\n[1] Criando campos UTM no GHL...');
  const existing = await getExistingFields();
  const existingKeys = new Set(existing.map(f => f.fieldKey));

  const created = {};

  for (const field of UTM_FIELDS_TO_CREATE) {
    if (existingKeys.has(field.fieldKey)) {
      const found = existing.find(f => f.fieldKey === field.fieldKey);
      console.log(`  ✓ Já existe: ${field.name} [${found.id}]`);
      created[field.fieldKey] = found.id;
      continue;
    }

    const res = await ghlRequest('POST', `/locations/${LOC_ID}/customFields`, {
      name: field.name,
      dataType: field.dataType,
      model: 'contact',
    });

    if (res.customField?.id || res.id) {
      const id = res.customField?.id || res.id;
      console.log(`  + Criado: ${field.name} [${id}]`);
      created[field.fieldKey] = id;
    } else {
      console.error(`  ✗ Erro ao criar ${field.name}:`, JSON.stringify(res).substring(0, 200));
    }

    await new Promise(r => setTimeout(r, 300));
  }

  return created;
}

// ─── Meta Webhook Subscription ────────────────────────────────────────────────

async function getPageToken() {
  const r = await fetch(`${BASE_META}/me/accounts?access_token=${META_TOKEN}`);
  const j = await r.json();
  const page = (j.data || []).find(p => p.id === PAGE_ID);
  if (!page) throw new Error(`Página ${PAGE_ID} não encontrada nas contas do token`);
  return page.access_token;
}

async function subscribeWebhook(pageToken, webhookUrl, verifyToken) {
  console.log('\n[2] Assinando webhook leadgen na página Meta...');

  // Assinar app na página para leadgen
  const r1 = await fetch(`${BASE_META}/${PAGE_ID}/subscribed_apps`, {
    method: 'POST',
    body: new URLSearchParams({
      subscribed_fields: 'leadgen',
      access_token: pageToken,
    }),
  });
  const j1 = await r1.json();
  console.log('  Página subscribed_apps:', JSON.stringify(j1));

  return j1;
}

async function checkCurrentSubscription(pageToken) {
  const r = await fetch(`${BASE_META}/${PAGE_ID}/subscribed_apps?access_token=${pageToken}`);
  const j = await r.json();
  console.log('  Subscriptions atuais:', JSON.stringify(j));
  return j;
}

// ─── Gerar arquivo do servidor webhook ───────────────────────────────────────

function generateWebhookServer(utmFieldIds) {
  return `#!/usr/bin/env node
/**
 * Meta Leadgen Webhook — Dra. Gabrielle Oliveira
 * Porta: 3102
 *
 * Fluxo:
 * 1. Meta envia webhook quando lead preenche formulário nativo
 * 2. Busca ad_id, adset_id, campaign_id via Meta Leads API
 * 3. Resolve nomes de campanha/conjunto/anúncio
 * 4. Encontra contato no GHL por telefone ou email
 * 5. Atualiza custom fields UTM no contato
 *
 * Deploy: PM2 — meta-lead-webhook-gabrielle
 */

const http  = require('http');
const https = require('https');
require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });

const META_TOKEN   = process.env.META_ACCESS_TOKEN;
const GHL_TOKEN    = process.env.GHL_GABRIELLE_TOKEN;
const LOCATION_ID  = process.env.GHL_GABRIELLE_LOCATION_ID;
const PAGE_ID      = '${PAGE_ID}';
const VERIFY_TOKEN = 'syra-gabrielle-meta-leads-2026';
const PORT         = 3102;

// IDs dos campos UTM no GHL (criados via setup)
const UTM_FIELDS = ${JSON.stringify(utmFieldIds, null, 2)};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
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
        'Authorization': \`Bearer \${GHL_TOKEN}\`,
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

// ─── Meta API ─────────────────────────────────────────────────────────────────

let _pageToken = null;
async function getPageToken() {
  if (_pageToken) return _pageToken;
  const res = await httpsGet(\`https://graph.facebook.com/v21.0/me/accounts?access_token=\${META_TOKEN}\`);
  const page = (res.data || []).find(p => p.id === PAGE_ID);
  if (!page) throw new Error('Página não encontrada');
  _pageToken = page.access_token;
  return _pageToken;
}

async function getLeadData(leadgenId) {
  const pageToken = await getPageToken();
  const url = \`https://graph.facebook.com/v21.0/\${leadgenId}?fields=field_data,created_time,ad_id,adset_id,campaign_id&access_token=\${pageToken}\`;
  return httpsGet(url);
}

async function getMetaName(id) {
  if (!id) return '';
  const res = await httpsGet(\`https://graph.facebook.com/v21.0/\${id}?fields=name&access_token=\${META_TOKEN}\`);
  return res.name || '';
}

async function getPlacement(adId) {
  if (!adId) return 'facebook';
  const res = await httpsGet(\`https://graph.facebook.com/v21.0/\${adId}?fields=adset{publisher_platforms}&access_token=\${META_TOKEN}\`);
  const platforms = res.adset?.publisher_platforms || [];
  if (platforms.includes('instagram') && platforms.includes('facebook')) return 'facebook_instagram';
  if (platforms.includes('instagram')) return 'instagram';
  return 'facebook';
}

// ─── GHL API ──────────────────────────────────────────────────────────────────

function normalizePhone(phone) {
  let n = (phone || '').replace(/\\D/g, '');
  if (!n.startsWith('55') && n.length <= 11) n = '55' + n;
  return '+' + n;
}

async function findContact(phone, email) {
  if (phone) {
    const res = await ghlRequest('POST', '/contacts/search', {
      locationId: LOCATION_ID,
      filters: [{ field: 'phone', operator: 'eq', value: normalizePhone(phone) }],
      page: 1, pageLimit: 1,
    });
    const c = (res.contacts || [])[0];
    if (c) return c;
  }
  if (email) {
    const res = await ghlRequest('POST', '/contacts/search', {
      locationId: LOCATION_ID,
      filters: [{ field: 'email', operator: 'eq', value: email }],
      page: 1, pageLimit: 1,
    });
    const c = (res.contacts || [])[0];
    if (c) return c;
  }
  return null;
}

async function updateGHLUtms(contactId, utms) {
  const customFields = [];
  const map = {
    'contact.utm_source':   utms.source,
    'contact.utm_medium':   utms.medium,
    'contact.utm_campaign': utms.campaign,
    'contact.utm_content':  utms.content,
    'contact.utm_term':     utms.term,
  };
  for (const [key, value] of Object.entries(map)) {
    const id = UTM_FIELDS[key];
    if (id && value) customFields.push({ id, value });
  }
  if (customFields.length === 0) return null;
  return ghlRequest('PUT', \`/contacts/\${contactId}\`, { customFields });
}

// ─── Processamento principal ──────────────────────────────────────────────────

async function processLead(leadgenId, pageId) {
  console.log(\`\\n[LEAD] \${leadgenId} | page: \${pageId}\`);

  const lead = await getLeadData(leadgenId);
  if (!lead || lead.error) {
    console.log(\`[WARN] Não foi possível buscar lead \${leadgenId}:\`, lead?.error?.message);
    return;
  }

  const { field_data = [], ad_id, adset_id, campaign_id } = lead;

  let phone = '', email = '';
  for (const field of field_data) {
    const key = (field.name || '').toLowerCase();
    if (key.includes('phone') || key === 'phone_number') phone = field.values?.[0] || '';
    if (key.includes('email')) email = field.values?.[0] || '';
  }

  console.log(\`[INFO] phone=\${phone} | email=\${email} | adset=\${adset_id} | campaign=\${campaign_id}\`);

  const [campaignName, adsetName, adName, placement] = await Promise.all([
    getMetaName(campaign_id),
    getMetaName(adset_id),
    getMetaName(ad_id),
    getPlacement(ad_id),
  ]);

  const utms = {
    source:   placement || 'facebook',
    medium:   'cpc',
    campaign: campaignName && campaign_id ? \`\${campaignName}_\${campaign_id}\` : (campaign_id || ''),
    content:  adsetName && adset_id ? \`\${adsetName}_\${adset_id}\` : (adset_id || ''),
    term:     adName && ad_id ? \`\${adName}_\${ad_id}\` : (ad_id || ''),
  };

  console.log(\`[INFO] UTMs: source=\${utms.source} | campaign=\${utms.campaign?.substring(0, 50)}\`);

  const contact = await findContact(phone, email);
  if (!contact) {
    console.log(\`[WARN] Contato não encontrado no GHL: phone=\${phone} email=\${email}\`);
    return;
  }

  console.log(\`[OK] Contato: \${contact.id} — \${contact.firstName} \${contact.lastName}\`);
  await updateGHLUtms(contact.id, utms);
  console.log(\`[OK] UTMs gravados no GHL\`);
}

// ─── Servidor HTTP ────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, \`http://localhost\`);

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

  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      res.writeHead(200);
      res.end('ok');
      try {
        const payload = JSON.parse(body);
        for (const entry of payload.entry || []) {
          for (const change of entry.changes || []) {
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
  console.log(\`Meta Leadgen Webhook — Dra. Gabrielle rodando na porta \${PORT}\`);
  console.log(\`Webhook URL: http://187.77.252.12:\${PORT}\`);
  console.log(\`Verify Token: \${VERIFY_TOKEN}\`);
});
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Setup Meta Lead Webhook — Dra. Gabrielle ===\n');

  // 1. Criar campos UTM no GHL
  const utmFieldIds = await createUtmFields();
  console.log('\nIDs criados:', JSON.stringify(utmFieldIds, null, 2));

  // 2. Verificar / assinar webhook na página Meta
  console.log('\n[2] Verificando token da página Meta...');
  let pageToken;
  try {
    pageToken = await getPageToken();
    console.log('  Page token obtido com sucesso');
  } catch (e) {
    console.error('  Erro ao obter page token:', e.message);
    console.log('  Continuando sem assinar webhook — faça manualmente no Meta App Dashboard');
  }

  if (pageToken) {
    await checkCurrentSubscription(pageToken);
    await subscribeWebhook(pageToken, null, 'syra-gabrielle-meta-leads-2026');
  }

  // 3. Gerar arquivo do servidor
  console.log('\n[3] Gerando arquivo do servidor webhook...');
  const fs = require('fs');
  const serverCode = generateWebhookServer(utmFieldIds);
  const outPath = path.join(__dirname, 'meta-lead-webhook-gabrielle.js');
  fs.writeFileSync(outPath, serverCode, 'utf8');
  console.log(`  Arquivo gerado: ${outPath}`);

  console.log('\n=== PRÓXIMOS PASSOS ===');
  console.log('1. Iniciar servidor: pm2 start scripts/meta-lead-webhook-gabrielle.js --name meta-lead-webhook-gabrielle');
  console.log('2. Registrar webhook URL no Meta App Dashboard:');
  console.log('   URL: http://187.77.252.12:3102');
  console.log('   Verify Token: syra-gabrielle-meta-leads-2026');
  console.log('   Campos: leadgen');
  console.log('3. Testar com um lead de teste no Meta');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
