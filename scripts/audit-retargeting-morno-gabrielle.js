#!/usr/bin/env node
/**
 * Auditoria de Qualidade de Leads
 * Campanha: [Syra] Emagrecimento Retargeting Morno [Formulário Instantâneo] [CBO]
 * Cliente: Dra. Gabrielle
 *
 * Fluxo:
 * 1. Localiza campanha por nome na conta da Gabrielle
 * 2. Puxa adsets + criativos dessa campanha
 * 3. Puxa leads do form Meta com adset_id
 * 4. Cruza por telefone normalizado com GHL (MQL, consultas, ganhos)
 * 5. Gera relatório de qualidade por adset e geral
 */

const path  = require('path');
const https = require('https');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const META_TOKEN = process.env.META_ACCESS_TOKEN;
const GHL_TOKEN  = process.env.GHL_GABRIELLE_TOKEN;
const GHL_LOC_ID = process.env.GHL_GABRIELLE_LOCATION_ID;
const BASE       = 'https://graph.facebook.com/v21.0';
const ACCOUNT    = 'act_1136892320236480';

const PIPELINE_ID           = 'IqBgqQLwrueiZlsV4yzI';
const STAGE_CONSULTA_ID     = '9ef956f9-be4c-4ec1-8075-23fa02b18e71';
const STAGE_GANHO_ID        = 'b3a893cd-02fe-45a8-8e50-2ac7070607f5';
const STAGE_OPORTUNIDADE_ID = '9894212a-32c9-4126-acbc-b917cfd84d1a';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizePhone(p) {
  if (!p) return '';
  const d = p.replace(/\D/g, '');
  if (d.length === 13 && d.startsWith('55')) return d;
  if (d.length === 11) return '55' + d;
  if (d.length === 10) return '55' + d;
  return d;
}

function getDDD(phone) {
  const n = normalizePhone(phone);
  return n.length >= 4 ? n.substring(2, 4) : '??';
}

async function metaGet(ep) {
  const sep = ep.includes('?') ? '&' : '?';
  const url = `${BASE}/${ep}${sep}access_token=${META_TOKEN}`;
  const r = await fetch(url);
  return r.json();
}

function ghlGet(path_) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: path_,
      method: 'GET',
      headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-07-28', 'Content-Type': 'application/json' },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── 1. Encontrar campanha por nome ──────────────────────────────────────────
async function findCampaign(nameFragment) {
  process.stderr.write('Buscando campanhas da conta...\n');
  const fields = 'id,name,status,objective';
  let url = `${ACCOUNT}/campaigns?fields=${encodeURIComponent(fields)}&limit=100`;
  const all = [];
  while (url) {
    const r = await metaGet(url.replace(BASE + '/', '').replace(`?access_token=${META_TOKEN}`, ''));
    const res = await fetch(`${BASE}/${url.replace(BASE+'/', '')}${url.includes('?') ? '&' : '?'}access_token=${META_TOKEN}`);
    const j = await res.json();
    (j.data || []).forEach(c => all.push(c));
    url = j.paging?.next ? j.paging.next.replace(`access_token=${META_TOKEN}`, '').replace(/[?&]$/, '') : null;
    await sleep(200);
  }
  return all.find(c => c.name.toLowerCase().includes(nameFragment.toLowerCase()));
}

// ── 2. Adsets da campanha ───────────────────────────────────────────────────
async function getAdsets(campaignId) {
  process.stderr.write(`Buscando adsets da campanha ${campaignId}...\n`);
  const insFields = 'impressions,reach,spend,ctr,cpm,frequency,actions,cost_per_action_type';
  const res = await fetch(`${BASE}/${campaignId}/adsets?fields=id,name,status&limit=50&access_token=${META_TOKEN}`);
  const j = await res.json();
  const adsets = j.data || [];
  process.stderr.write(`  ${adsets.length} adset(s) encontrado(s)\n`);

  // Buscar insights de cada adset
  for (const a of adsets) {
    const ins = await fetch(`${BASE}/${a.id}/insights?fields=${encodeURIComponent(insFields)}&date_preset=maximum&access_token=${META_TOKEN}`);
    const ij = await ins.json();
    const d = ij.data?.[0] || {};
    a.spend     = parseFloat(d.spend || 0);
    a.impressions = parseInt(d.impressions || 0);
    a.leads     = parseInt((d.actions||[]).find(x => x.action_type === 'lead')?.value || 0);
    a.clicks    = parseInt((d.actions||[]).find(x => x.action_type === 'link_click')?.value || 0);
    a.cpl       = a.leads > 0 ? (a.spend / a.leads).toFixed(2) : '-';
    a.ctr       = parseFloat(d.ctr || 0).toFixed(2);
    a.frequency = parseFloat(d.frequency || 0).toFixed(2);
    await sleep(300);
  }
  return adsets;
}

// ── 3. Ads (criativos) da campanha ─────────────────────────────────────────
async function getAds(campaignId) {
  const res = await fetch(`${BASE}/${campaignId}/ads?fields=id,name,status,adset_id&limit=100&access_token=${META_TOKEN}`);
  const j = await res.json();
  return j.data || [];
}

// ── 4. Leads do formulário (todos os ads da campanha) ───────────────────────
async function getLeadsForCampaign(campaignId) {
  process.stderr.write('Buscando form IDs nos ads...\n');
  const ads = await getAds(campaignId);

  // Coletar form IDs únicos
  const formIds = new Set();
  for (const ad of ads) {
    const r = await fetch(`${BASE}/${ad.id}?fields=creative{object_story_spec}&access_token=${META_TOKEN}`);
    const j = await r.json();
    const formId = j.creative?.object_story_spec?.link_data?.call_to_action?.value?.lead_gen_form_id;
    if (formId) formIds.add(formId);
    await sleep(200);
  }

  // Se não achou via creative, busca direto na campanha
  if (formIds.size === 0) {
    const r2 = await fetch(`${BASE}/${campaignId}/leads?fields=id,created_time,ad_id,adset_id,campaign_id,field_data&limit=100&access_token=${META_TOKEN}`);
    const j2 = await r2.json();
    if (j2.data?.length > 0) {
      return paginateLeads(campaignId, 'campaign');
    }
  }

  // Puxar leads de cada form
  const allLeads = [];
  for (const fid of formIds) {
    process.stderr.write(`  Form ${fid}...\n`);
    const leads = await paginateLeads(fid, 'form');
    // Filtrar só leads desta campanha
    const filtered = leads.filter(l => l.campaign_id === campaignId);
    allLeads.push(...filtered);
  }

  // Fallback: puxar direto da campanha se form não encontrou
  if (allLeads.length === 0) {
    process.stderr.write('  Fallback: puxando leads direto da campanha...\n');
    return paginateLeads(campaignId, 'campaign');
  }

  return allLeads;
}

async function paginateLeads(id, type) {
  const endpoint = type === 'form'
    ? `${id}/leads?fields=id,created_time,ad_id,adset_id,campaign_id,field_data&limit=100`
    : `${id}/leads?fields=id,created_time,ad_id,adset_id,campaign_id,field_data&limit=100`;
  const leads = [];
  let url = `${BASE}/${endpoint}&access_token=${META_TOKEN}`;
  let page = 1;
  while (url) {
    const r = await fetch(url);
    const j = await r.json();
    if (j.error) { process.stderr.write(`  Erro leads: ${JSON.stringify(j.error)}\n`); break; }
    const batch = j.data || [];
    leads.push(...batch);
    process.stderr.write(`    Pág ${page}: ${batch.length} leads (total: ${leads.length})\n`);
    url = j.paging?.next || null;
    page++;
    await sleep(300);
  }
  return leads;
}

// ── 5. Dados do GHL ─────────────────────────────────────────────────────────
async function getGHLContacts() {
  process.stderr.write('Buscando contatos GHL...\n');
  const all = [];
  let cursor = null;
  let page = 1;
  while (true) {
    const qs = new URLSearchParams({ locationId: GHL_LOC_ID, limit: '100' });
    if (cursor) qs.set('startAfter', cursor);
    const res = await ghlGet(`/contacts/?${qs}`);
    if (res.statusCode >= 400 || res.error) { process.stderr.write(`  Erro GHL: ${JSON.stringify(res)}\n`); break; }
    const batch = res.contacts || [];
    all.push(...batch);
    process.stderr.write(`  Pág ${page}: ${batch.length} contatos (total: ${all.length})\n`);
    if (batch.length < 100) break;
    cursor = res.meta?.startAfterDate || null;
    if (!cursor) break;
    page++;
    await sleep(400);
  }
  return all;
}

async function getMQLsByTag() {
  process.stderr.write('Buscando MQLs (tag=mql)...\n');
  const all = [];
  let cursor = null;
  let page = 1;
  while (true) {
    const qs = new URLSearchParams({ locationId: GHL_LOC_ID, limit: '100', tag: 'mql' });
    if (cursor) qs.set('startAfter', cursor);
    const res = await ghlGet(`/contacts/?${qs}`);
    if (res.statusCode >= 400 || res.error) break;
    const batch = res.contacts || [];
    all.push(...batch);
    if (batch.length < 100) break;
    cursor = res.meta?.startAfterDate || null;
    if (!cursor) break;
    page++;
    await sleep(300);
  }
  return all;
}

async function getOpportunitiesByStage(stageId) {
  const all = [];
  let cursor = null;
  while (true) {
    const qs = new URLSearchParams({ location_id: GHL_LOC_ID, pipeline_id: PIPELINE_ID, pipeline_stage_id: stageId, limit: '100' });
    if (cursor) qs.set('startAfter', cursor);
    const res = await ghlGet(`/opportunities/search?${qs}`);
    if (res.statusCode >= 400 || res.error) break;
    const batch = res.opportunities || [];
    all.push(...batch);
    if (batch.length < 100) break;
    cursor = res.meta?.startAfterDate || null;
    if (!cursor) break;
    await sleep(300);
  }
  return all;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const CAMPAIGN_NAME = 'Retargeting Morno';

  // 1. Encontrar campanha
  process.stderr.write(`\n[1/6] Localizando campanha "${CAMPAIGN_NAME}"...\n`);
  let campaign = null;

  // Busca manual por nome
  const campRes = await fetch(`${BASE}/${ACCOUNT}/campaigns?fields=id,name,status,objective&limit=100&access_token=${META_TOKEN}`);
  const campJson = await campRes.json();
  const allCamps = campJson.data || [];
  campaign = allCamps.find(c => c.name.toLowerCase().includes(CAMPAIGN_NAME.toLowerCase()));

  if (!campaign) {
    process.stderr.write('\nCampanhas disponíveis:\n');
    allCamps.forEach(c => process.stderr.write(`  [${c.status}] ${c.name} (${c.id})\n`));
    console.log(JSON.stringify({ error: 'Campanha não encontrada', available: allCamps.map(c => c.name) }, null, 2));
    return;
  }

  process.stderr.write(`  ✓ Encontrada: ${campaign.name} (${campaign.id}) — ${campaign.status}\n`);

  // 2. Adsets
  process.stderr.write('\n[2/6] Buscando adsets e métricas...\n');
  const adsets = await getAdsets(campaign.id);

  // 3. Leads do Meta
  process.stderr.write('\n[3/6] Buscando leads do formulário Meta...\n');
  const metaLeads = await getLeadsForCampaign(campaign.id);
  process.stderr.write(`  Total de leads Meta: ${metaLeads.length}\n`);

  // 4. GHL — contatos, MQLs, oportunidades
  process.stderr.write('\n[4/6] Buscando dados do GHL...\n');
  const [ghlContacts, mqls, consultas, ganhos] = await Promise.all([
    getGHLContacts(),
    getMQLsByTag(),
    getOpportunitiesByStage(STAGE_CONSULTA_ID),
    getOpportunitiesByStage(STAGE_GANHO_ID),
  ]);

  // Indexar por telefone normalizado
  const mqlPhones  = new Set(mqls.map(c => normalizePhone(c.phone)));
  const consultaPhones = new Set(
    consultas.map(o => normalizePhone(o.contact?.phone || '')).filter(Boolean)
  );
  const ganhoPhones = new Set(
    ganhos.map(o => normalizePhone(o.contact?.phone || '')).filter(Boolean)
  );

  process.stderr.write(`  GHL contatos: ${ghlContacts.length} | MQLs: ${mqls.length} | Consultas: ${consultas.length} | Ganhos: ${ganhos.length}\n`);

  // 5. Cruzamento por telefone
  process.stderr.write('\n[5/6] Cruzando Meta leads × GHL...\n');

  function extractField(fieldData, fieldName) {
    const found = (fieldData || []).find(f =>
      f.name?.toLowerCase().includes(fieldName.toLowerCase())
    );
    return found?.values?.[0] || '';
  }

  const enrichedLeads = metaLeads.map(l => {
    const phone = normalizePhone(extractField(l.field_data, 'phone') || extractField(l.field_data, 'telefone') || extractField(l.field_data, 'celular') || extractField(l.field_data, 'whatsapp'));
    const name  = extractField(l.field_data, 'name') || extractField(l.field_data, 'nome') || extractField(l.field_data, 'full_name');
    const email = extractField(l.field_data, 'email');

    const isMQL       = phone ? mqlPhones.has(phone) : false;
    const isConsulta  = phone ? consultaPhones.has(phone) : false;
    const isGanho     = phone ? ganhoPhones.has(phone) : false;

    // Qualidade do dado
    const hasPhone    = phone.length >= 12;
    const hasName     = name.trim().split(' ').length >= 2;
    const hasEmail    = email.includes('@');
    const ddd         = getDDD(phone);
    const isValidDDD  = /^[1-9][1-9]$/.test(ddd);

    return {
      id:         l.id,
      created:    l.created_time,
      adset_id:   l.adset_id,
      name,
      phone,
      email,
      ddd,
      hasPhone,
      hasName,
      hasEmail,
      isValidDDD,
      isMQL,
      isConsulta,
      isGanho,
      qualityScore: [hasPhone, hasName, hasEmail, isValidDDD].filter(Boolean).length,
    };
  });

  // 6. Análise por adset
  process.stderr.write('\n[6/6] Calculando métricas...\n');

  const adsetMap = {};
  adsets.forEach(a => { adsetMap[a.id] = a; });

  const byAdset = {};
  enrichedLeads.forEach(l => {
    const aid = l.adset_id || 'unknown';
    if (!byAdset[aid]) byAdset[aid] = [];
    byAdset[aid].push(l);
  });

  // DDD distribution
  const dddCount = {};
  enrichedLeads.forEach(l => {
    if (l.ddd && l.ddd !== '??') dddCount[l.ddd] = (dddCount[l.ddd] || 0) + 1;
  });
  const topDDDs = Object.entries(dddCount).sort((a,b) => b[1]-a[1]).slice(0, 10);

  // Score de qualidade geral
  const total   = enrichedLeads.length;
  const mqls_n  = enrichedLeads.filter(l => l.isMQL).length;
  const cons_n  = enrichedLeads.filter(l => l.isConsulta).length;
  const ganho_n = enrichedLeads.filter(l => l.isGanho).length;
  const hasPhone_n = enrichedLeads.filter(l => l.hasPhone).length;
  const hasName_n  = enrichedLeads.filter(l => l.hasName).length;
  const hasEmail_n = enrichedLeads.filter(l => l.hasEmail).length;
  const pct = n => total > 0 ? ((n/total)*100).toFixed(1)+'%' : '0%';

  // Total gasto na campanha
  const totalSpend = adsets.reduce((s, a) => s + a.spend, 0);
  const totalLeadsMeta = adsets.reduce((s, a) => s + a.leads, 0);
  const cplCampanha = totalLeadsMeta > 0 ? (totalSpend / totalLeadsMeta).toFixed(2) : '-';
  const cpMQL = mqls_n > 0 ? (totalSpend / mqls_n).toFixed(2) : '-';
  const cpConsulta = cons_n > 0 ? (totalSpend / cons_n).toFixed(2) : '-';
  const cpGanho = ganho_n > 0 ? (totalSpend / ganho_n).toFixed(2) : '-';

  // Resultado final
  const result = {
    campanha: {
      nome:   campaign.name,
      id:     campaign.id,
      status: campaign.status,
    },
    periodo: 'Todos os tempos (date_preset=maximum)',
    resumo_financeiro: {
      gasto_total:     'R$' + totalSpend.toFixed(2),
      leads_plataforma: totalLeadsMeta,
      cpl_plataforma:  'R$' + cplCampanha,
      cp_mql:          cpMQL !== '-' ? 'R$' + cpMQL : '-',
      cp_consulta:     cpConsulta !== '-' ? 'R$' + cpConsulta : '-',
      cp_ganho:        cpGanho !== '-' ? 'R$' + cpGanho : '-',
    },
    qualidade_leads: {
      total_leads_form:   total,
      com_telefone_valido: hasPhone_n + ' (' + pct(hasPhone_n) + ')',
      com_nome_completo:   hasName_n  + ' (' + pct(hasName_n) + ')',
      com_email:           hasEmail_n + ' (' + pct(hasEmail_n) + ')',
      mqls:               mqls_n     + ' (' + pct(mqls_n) + ')',
      consultas_agendadas: cons_n    + ' (' + pct(cons_n) + ')',
      ganhos_fechados:     ganho_n   + ' (' + pct(ganho_n) + ')',
      taxa_mql:      pct(mqls_n),
      taxa_consulta: pct(cons_n),
      taxa_fechamento: pct(ganho_n),
    },
    distribuicao_ddd: topDDDs.map(([ddd, n]) => ({ ddd, leads: n, pct: pct(n) })),
    por_adset: Object.entries(byAdset).map(([aid, leads]) => {
      const a = adsetMap[aid] || {};
      const n = leads.length;
      const m = leads.filter(l => l.isMQL).length;
      const c = leads.filter(l => l.isConsulta).length;
      const g = leads.filter(l => l.isGanho).length;
      return {
        adset_id:   aid,
        adset_nome: a.name || 'desconhecido',
        status:     a.status || '-',
        gasto:      a.spend ? 'R$' + a.spend.toFixed(2) : '-',
        cpl_plataforma: a.cpl ? 'R$' + a.cpl : '-',
        leads_form:    n,
        mqls:          m + ' (' + (n > 0 ? ((m/n)*100).toFixed(1) : 0) + '%)',
        consultas:     c + ' (' + (n > 0 ? ((c/n)*100).toFixed(1) : 0) + '%)',
        ganhos:        g + ' (' + (n > 0 ? ((g/n)*100).toFixed(1) : 0) + '%)',
        score_qualidade_medio: n > 0 ? (leads.reduce((s,l) => s + l.qualityScore, 0) / n).toFixed(2) : '-',
      };
    }).sort((a,b) => parseInt(b.leads_form) - parseInt(a.leads_form)),
    alertas: [],
  };

  // Alertas automáticos
  if (parseFloat(result.qualidade_leads.taxa_mql) < 10)
    result.alertas.push('⚠️ Taxa MQL abaixo de 10% — público morno pode estar frio demais');
  if (parseFloat(result.qualidade_leads.taxa_mql) > 30)
    result.alertas.push('✅ Taxa MQL acima de 30% — campanha gerando leads qualificados');
  if (hasPhone_n / total < 0.7)
    result.alertas.push('⚠️ Mais de 30% dos leads sem telefone válido — checar configuração do formulário');
  if (hasName_n / total < 0.8)
    result.alertas.push('⚠️ Mais de 20% dos leads com nome incompleto');
  if (totalSpend > 0 && parseFloat(cplCampanha) > 30)
    result.alertas.push('⚠️ CPL acima de R$30 — verificar eficiência do criativo');

  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
