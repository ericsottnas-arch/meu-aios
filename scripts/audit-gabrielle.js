/**
 * Auditoria completa — Dra. Gabrielle
 * Usa /insights separado para cada nível
 */
const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN   = process.env.META_ACCESS_TOKEN;
const BASE    = 'https://graph.facebook.com/v21.0';
const ACCOUNT = 'act_1136892320236480';
const INS_FIELDS = 'impressions,reach,spend,ctr,cpm,frequency,actions,cost_per_action_type,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function get(ep, retries = 5) {
  const sep = ep.includes('?') ? '&' : '?';
  const url = `${BASE}/${ep}${sep}access_token=${TOKEN}`;
  for (let i = 0; i < retries; i++) {
    const r = await fetch(url);
    const j = await r.json();
    if (!j.error) return j;
    const isRate = j.error.code === 17 || j.error.code === 4 || (j.error.message||'').includes('limit') || (j.error.message||'').includes('excessivo');
    if (isRate && i < retries-1) { await sleep((i+1)*20000); continue; }
    return { data: [], error: j.error };
  }
}

async function getInsights(id) {
  const r = await get(`${id}/insights?fields=${encodeURIComponent(INS_FIELDS)}&date_preset=last_30d`);
  if (!r.data?.[0]) return null;
  const d = r.data[0];
  const leads  = parseInt((d.actions||[]).find(a => a.action_type === 'lead')?.value || 0);
  const clicks = parseInt((d.actions||[]).find(a => a.action_type === 'link_click')?.value || 0);
  const msgs   = parseInt((d.actions||[]).find(a => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value || 0);
  const v25    = parseInt((d.video_p25_watched_actions?.[0]?.value)  || 0);
  const v50    = parseInt((d.video_p50_watched_actions?.[0]?.value)  || 0);
  const v75    = parseInt((d.video_p75_watched_actions?.[0]?.value)  || 0);
  const v100   = parseInt((d.video_p100_watched_actions?.[0]?.value) || 0);
  const spend  = parseFloat(d.spend || 0);
  const impr   = parseInt(d.impressions || 0);
  return {
    spend:       spend.toFixed(2),
    impressions: impr,
    reach:       parseInt(d.reach || 0),
    frequency:   parseFloat(d.frequency || 0).toFixed(2),
    ctr:         parseFloat(d.ctr || 0).toFixed(2),
    cpm:         parseFloat(d.cpm || 0).toFixed(2),
    clicks,
    leads,
    msgs,
    cpl:         leads > 0 ? (spend/leads).toFixed(2) : '-',
    cpc:         clicks > 0 ? (spend/clicks).toFixed(2) : '-',
    hook_rate:   (v25 > 0 && impr > 0) ? ((v25/impr)*100).toFixed(1)+'%' : '-',
    hold_rate:   (v25 > 0 && v75 > 0) ? ((v75/v25)*100).toFixed(1)+'%' : '-',
    completion:  (v25 > 0 && v100 > 0) ? ((v100/v25)*100).toFixed(1)+'%' : '-',
    v25, v50, v75, v100,
  };
}

async function main() {
  const out = { campaigns:[], adsets:[], ads:[] };

  // 1. Campanhas
  process.stderr.write('Buscando campanhas...\n');
  const campsRes = await get(`${ACCOUNT}/campaigns?fields=id,name,status,objective,daily_budget&limit=50`);
  for (const c of campsRes.data || []) {
    const ins = await getInsights(c.id);
    out.campaigns.push({ id:c.id, name:c.name, status:c.status, budget: c.daily_budget ? (c.daily_budget/100).toFixed(0) : null, objective:c.objective, ins });
    await sleep(500);
  }

  // 2. Adsets (ativas + pausadas recentes)
  process.stderr.write('Buscando adsets...\n');
  const activeCamps = out.campaigns.filter(c => c.status === 'ACTIVE');
  for (const camp of activeCamps) {
    const ar = await get(`${camp.id}/adsets?fields=id,name,status,optimization_goal,billing_event,daily_budget,targeting&limit=50`);
    for (const a of ar.data || []) {
      const ins = await getInsights(a.id);
      const tgt = a.targeting || {};
      out.adsets.push({
        campaignName: camp.name,
        campaignId:   camp.id,
        id: a.id, name: a.name, status: a.status,
        goal: a.optimization_goal,
        age: `${tgt.age_min||'?'}-${tgt.age_max||'?'}`,
        geo: JSON.stringify(tgt.geo_locations?.regions || tgt.geo_locations?.cities || tgt.geo_locations?.custom_locations || []).substring(0,100),
        interests: (tgt.flexible_spec?.[0]?.interests||[]).map(i=>i.name).join(', ').substring(0,80),
        ins,
      });
      await sleep(600);
    }
  }

  // 3. Ads ativos
  process.stderr.write('Buscando ads...\n');
  for (const adset of out.adsets.filter(a => a.status === 'ACTIVE')) {
    const ar = await get(`${adset.id}/ads?fields=id,name,status,creative{id,name,object_story_spec}&limit=50`);
    for (const ad of ar.data || []) {
      const ins  = await getInsights(ad.id);
      const spec = ad.creative?.object_story_spec;
      const vd   = spec?.video_data;
      const ld   = spec?.link_data;
      out.ads.push({
        adsetName: adset.name,
        adsetId:   adset.id,
        id: ad.id, name: ad.name, status: ad.status,
        hook:    (vd?.title || ld?.name || '-').substring(0,70),
        message: (vd?.message || ld?.message || '-').substring(0,100),
        ins,
      });
      await sleep(600);
    }
  }

  console.log(JSON.stringify(out, null, 2));
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
