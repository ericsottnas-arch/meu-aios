#!/usr/bin/env node
/**
 * Backfill UTMs — Dr. Humberto Andrade
 *
 * Busca leads recentes dos formulários Meta (últimos N dias),
 * resolve UTMs via Meta API (ad_id, adset_id, campaign_id)
 * e atualiza os contatos no GHL que ainda não têm UTM.
 *
 * Uso: node backfill-utms-humberto.js [dias]
 * Ex:  node backfill-utms-humberto.js 30
 */

const https = require('https');
require('dotenv').config({ path: '/home/synkra/meu-aios/meu-projeto/.env' });

const META_TOKEN  = process.env.META_ACCESS_TOKEN;
const GHL_TOKEN   = process.env.GHL_HUMBERTO_TOKEN;
const LOCATION_ID = process.env.GHL_HUMBERTO_LOCATION_ID;
const PAGE_ID     = '104425248310435';

const UTM_FIELDS = {
  utmSource:   'nvufOPP8cZuB12jBv7Bs',
  utmMedium:   'DoFMXsBzk6L4wGk2ZM0a',
  utmCampaign: 'Cycy9Gne1ZvW8GKadxcn',
  utmContent:  'Wb72WyVmin6bm3RDRa2S',
  utmTerm:     'ArfUh1uITRLSgjsemAEM',
};

const DIAS = parseInt(process.argv[2] || '30');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({}); }
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
        try { resolve(JSON.parse(data)); } catch { resolve({}); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── Meta API ─────────────────────────────────────────────────────────────────

const nameCache = {};
async function getMetaName(id) {
  if (!id) return '';
  if (nameCache[id]) return nameCache[id];
  const res = await httpsGet(`https://graph.facebook.com/v21.0/${id}?fields=name&access_token=${META_TOKEN}`);
  nameCache[id] = res.name || '';
  return nameCache[id];
}

async function getPageToken() {
  const res = await httpsGet(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${META_TOKEN}`
  );
  const page = (res.data || []).find(p => p.id === PAGE_ID);
  if (!page) throw new Error('Página não encontrada nas contas do token');
  return page.access_token;
}

async function getLeadForms(pageToken) {
  const allForms = [];
  let url = `https://graph.facebook.com/v21.0/${PAGE_ID}/leadgen_forms?fields=id,name,status&limit=50&access_token=${pageToken}`;
  while (url) {
    const res = await httpsGet(url);
    allForms.push(...(res.data || []));
    url = res.paging?.next || null;
    if (url) await sleep(300);
  }
  return allForms.filter(f => f.status !== 'ARCHIVED');
}

async function getLeadsFromForm(formId, since, pageToken) {
  const allLeads = [];
  let url = `https://graph.facebook.com/v21.0/${formId}/leads?fields=field_data,created_time,ad_id,adset_id,campaign_id&since=${since}&limit=50&access_token=${pageToken}`;
  while (url) {
    const res = await httpsGet(url);
    allLeads.push(...(res.data || []));
    url = res.paging?.next || null;
    if (url) await sleep(500);
  }
  return allLeads;
}

// ─── GHL API ──────────────────────────────────────────────────────────────────

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
    const normalized = normalizePhone(phone);
    const c = await searchContact('phone', normalized);
    if (c) return c;
  }
  if (email) {
    const c = await searchContact('email', email);
    if (c) return c;
  }
  return null;
}

function contactHasUtms(contact) {
  const fields = contact.customFields || [];
  const src = fields.find(f => f.id === UTM_FIELDS.utmSource);
  return src && src.value && src.value.trim() !== '' && src.value !== '--';
}

async function updateUtms(contactId, utms) {
  const customFields = [
    { id: UTM_FIELDS.utmSource,   value: utms.source },
    { id: UTM_FIELDS.utmMedium,   value: utms.medium },
    { id: UTM_FIELDS.utmCampaign, value: utms.campaign },
    { id: UTM_FIELDS.utmContent,  value: utms.content },
    { id: UTM_FIELDS.utmTerm,     value: utms.term },
  ].filter(f => f.value);
  if (!customFields.length) return null;
  return ghlRequest('PUT', `/contacts/${contactId}`, { customFields });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const since = Math.floor(Date.now() / 1000) - (DIAS * 86400);

  console.log('════════════════════════════════════════════════════════════');
  console.log(`  Backfill UTMs — Humberto | Últimos ${DIAS} dias`);
  console.log('════════════════════════════════════════════════════════════\n');

  const pageToken = await getPageToken();
  console.log('Page token obtido\n');

  const forms = await getLeadForms(pageToken);
  console.log(`${forms.length} formulários ativos:`);
  forms.forEach(f => console.log(`  [${f.id}] ${f.name}`));

  const results = { updated: 0, skipped: 0, notFound: 0, error: 0 };

  for (const form of forms) {
    console.log(`\n── ${form.name}`);
    const leads = await getLeadsFromForm(form.id, since, pageToken);
    console.log(`  ${leads.length} leads nos últimos ${DIAS} dias`);
    if (!leads.length) continue;

    for (const lead of leads) {
      const { field_data = [], ad_id, adset_id, campaign_id, created_time } = lead;

      let phone = '', email = '';
      for (const field of field_data) {
        const key = (field.name || '').toLowerCase();
        if (key.includes('phone') || key === 'phone_number') phone = field.values?.[0] || '';
        if (key.includes('email')) email = field.values?.[0] || '';
      }

      const label = phone || email || 'sem contato';
      const date  = new Date(created_time).toLocaleDateString('pt-BR');
      process.stdout.write(`  [${date}] ${label} ... `);

      try {
        const contact = await findContact(phone, email);
        if (!contact) {
          console.log('não encontrado no GHL');
          results.notFound++;
          await sleep(300);
          continue;
        }

        if (contactHasUtms(contact)) {
          console.log('já tem UTMs');
          results.skipped++;
          await sleep(200);
          continue;
        }

        const [campaignName, adsetName, adName] = await Promise.all([
          getMetaName(campaign_id),
          getMetaName(adset_id),
          getMetaName(ad_id),
        ]);

        const utms = {
          source:   'facebook',
          medium:   'cpc',
          campaign: campaignName && campaign_id ? `${campaignName}${campaign_id}` : (campaign_id || ''),
          content:  adsetName && adset_id ? `${adsetName}${adset_id}` : (adset_id || ''),
          term:     adName && ad_id ? `${adName}_${ad_id}` : (ad_id || ''),
        };

        await updateUtms(contact.id, utms);
        console.log(`✅ ${contact.firstName} ${contact.lastName}`);
        results.updated++;

      } catch (e) {
        console.log(`❌ ${e.message}`);
        results.error++;
      }

      await sleep(400);
    }
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  RESULTADO');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`✅ Atualizados:     ${results.updated}`);
  console.log(`⏭  Já tinham UTMs:  ${results.skipped}`);
  console.log(`🔍 Não encontrados: ${results.notFound}`);
  console.log(`❌ Erros:           ${results.error}`);
}

main().catch(err => { console.error('✗ Fatal:', err.message); process.exit(1); });
