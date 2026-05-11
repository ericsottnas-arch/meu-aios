#!/usr/bin/env node
/**
 * Fast audit adsets + audiences — Dra. Gabrielle
 * Query direta na conta, sem iterar campanha por campanha
 */
const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN   = process.env.META_ACCESS_TOKEN;
const BASE    = 'https://graph.facebook.com/v21.0';
const ACCOUNT = 'act_1136892320236480';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function get(ep) {
  const sep = ep.includes('?') ? '&' : '?';
  const url = `${BASE}/${ep}${sep}access_token=${TOKEN}`;
  const r = await fetch(url);
  return r.json();
}

async function main() {
  // 1. Buscar adsets direto da conta (ativas + pausadas)
  process.stderr.write('Buscando adsets da conta...\n');
  const fields = 'id,name,status,campaign_id,campaign{id,name,status,objective},optimization_goal,billing_event,daily_budget,lifetime_budget,targeting';
  const adsetRes = await get(`${ACCOUNT}/adsets?fields=${encodeURIComponent(fields)}&limit=100`);

  if (adsetRes.error) {
    console.error('Erro adsets:', JSON.stringify(adsetRes.error));
    process.exit(1);
  }

  const adsets = adsetRes.data || [];
  process.stderr.write(`Total adsets: ${adsets.length}\n`);

  // 2. Buscar insights em lote para cada adset
  const insFields = 'impressions,reach,spend,ctr,cpm,frequency,actions,cost_per_action_type';
  const results = [];

  for (const a of adsets) {
    process.stderr.write(`  > ${a.name} (${a.status})\n`);
    const ins = await get(`${a.id}/insights?fields=${encodeURIComponent(insFields)}&date_preset=last_30d`);
    await sleep(300);

    const d = ins.data?.[0] || null;
    const leads   = parseInt((d?.actions||[]).find(x => x.action_type === 'lead')?.value || 0);
    const spend   = parseFloat(d?.spend || 0);
    const clicks  = parseInt((d?.actions||[]).find(x => x.action_type === 'link_click')?.value || 0);
    const msgs    = parseInt((d?.actions||[]).find(x => x.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value || 0);

    const tgt = a.targeting || {};
    const ageRange = `${tgt.age_min||'?'}-${tgt.age_max||'?'}`;
    const geo = (() => {
      const gl = tgt.geo_locations || {};
      if (gl.cities?.length)   return gl.cities.map(c => c.name).join(', ');
      if (gl.regions?.length)  return gl.regions.map(r => r.name).join(', ');
      if (gl.countries?.length) return gl.countries.join(', ');
      return 'n/a';
    })();
    const interests = (tgt.flexible_spec?.[0]?.interests||[]).map(i=>i.name).join(', ') || 'n/a';
    const customAud = (tgt.custom_audiences||[]).map(c=>c.name).join(', ') || 'n/a';
    const lookalike = (tgt.lookalike_specs||[]).map(l=>`LAL ${l.ratio*100}%`).join(', ') || 'n/a';

    results.push({
      campaign: a.campaign?.name || '?',
      campaignStatus: a.campaign?.status || '?',
      objective: a.campaign?.objective || '?',
      adsetId: a.id,
      adsetName: a.name,
      status: a.status,
      goal: a.optimization_goal,
      age: ageRange,
      geo,
      interests,
      customAudiences: customAud,
      lookalike,
      spend: spend.toFixed(2),
      leads,
      clicks,
      msgs,
      cpl: leads > 0 ? (spend/leads).toFixed(2) : '-',
      ctr: parseFloat(d?.ctr || 0).toFixed(2),
      cpm: parseFloat(d?.cpm || 0).toFixed(2),
      frequency: parseFloat(d?.frequency || 0).toFixed(2),
      impressions: parseInt(d?.impressions || 0),
    });
  }

  // Ordenar por leads desc
  results.sort((a,b) => b.leads - a.leads);

  console.log(JSON.stringify(results, null, 2));
  process.stderr.write(`\nDone. ${results.length} adsets.\n`);
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
