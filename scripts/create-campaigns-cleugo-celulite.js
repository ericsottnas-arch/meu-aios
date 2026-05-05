/**
 * Cria Campanhas FRIO + MORNO — Dr. Cleugo Porto
 * Conta: act_944253477334195
 * Formulário: 971625528653143
 *
 * FRIO: Captação via lookalike — R$50/dia CBO
 * MORNO: Retargeting — R$25/dia CBO
 *
 * IMPORTANTE: Conta pré-paga com saldo R$0 — ativar manualmente após recarregar.
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const API        = 'v21.0';
const BASE       = `https://graph.facebook.com/${API}`;
const AD_ACCOUNT = 'act_944253477334195';
const PAGE_ID    = '275505112301938';
const FORM_ID    = '971625528653143';

// Criativos existentes (vídeos que já rodaram e performaram)
const VIDEO_IDS = [
  '1184023537202155', // Vídeo 18 — "Nós recebemos mulheres aqui todos os dias"
  '2308592932993749', // Vídeo 19 — "Celulite, você tem celulite?"
  '1383640443205523', // Vídeo 20 — "Celulite em coxa ou no bumbum..."
];

// Audiences existentes
const AUDIENCES = {
  VV_TODOS_01_04:       '120220898275060701', // [M] VV TODOS - 01.04
  SEGUIDORES:           '120217980717440701', // [IG] SEGUIDORES
  VV_TODOS_75PCT:       '120215043524870701', // [M] VV TODOS - 365D - 75%
  ENGAJ_ANUNCIOS:       '120210309443750701', // [IG] Engajaram com anuncios - 365D
  VISITARAM_PERFIL:     '120210309430600701', // [IG] Visitaram o perfil - 365D
  VV_DREAM_75PCT:       '120210309416990701', // [M] VV Dream Incision - 75% - 365D
  ENGAJ_TODOS:          '120207458593330701', // [IG] Engajamento [Todos] - 365D
};

// Geo — cidades principais: Atibaia + Barueri + Jundiaí + Campinas + Alphaville
const GEO_FRIO = {
  cities: [
    { key: '242981', radius: 25, distance_unit: 'kilometer' },  // Atibaia
    { key: '244379', radius: 20, distance_unit: 'kilometer' },  // Barueri (cobre Alphaville)
    { key: '257242', radius: 20, distance_unit: 'kilometer' },  // Jundiaí
    { key: '247071', radius: 20, distance_unit: 'kilometer' },  // Campinas
  ],
};

async function getVideoThumbnail(videoId) {
  const r = await fetch(`${BASE}/${videoId}?fields=thumbnails&access_token=${TOKEN}`);
  const j = await r.json();
  return j.thumbnails?.data?.[0]?.uri || null;
}

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST /${endpoint}] ${j.error.error_user_msg || j.error.message} (code ${j.error.code})`);
  return j;
}

async function createLookalike(name, sourceAudienceId, ratio) {
  console.log(`  → Criando lookalike: ${name}`);
  const res = await post(`${AD_ACCOUNT}/customaudiences`, {
    name,
    subtype: 'LOOKALIKE',
    origin_audience_id: sourceAudienceId,
    lookalike_spec: JSON.stringify({
      type: 'similarity',
      ratio,
      country: 'BR',
    }),
  });
  console.log(`    ✓ ID: ${res.id}`);
  return res.id;
}

async function createCampaign(name, objective, dailyBudget, status = 'PAUSED') {
  console.log(`\nCriando campanha: ${name}`);
  const res = await post(`${AD_ACCOUNT}/campaigns`, {
    name,
    objective,
    status,
    special_ad_categories: JSON.stringify([]),
    daily_budget: String(dailyBudget * 100), // centavos
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
  });
  console.log(`  ✓ Campaign ID: ${res.id}`);
  return res.id;
}

async function createAdset(campaignId, name, targeting, dailyBudget, optimization, billingEvent, promotedObject) {
  console.log(`  Criando adset: ${name}`);
  const params = {
    campaign_id: campaignId,
    name,
    status: 'PAUSED',
    targeting: JSON.stringify({
      ...targeting,
      targeting_automation: { advantage_audience: 0 },
    }),
    optimization_goal: optimization,
    billing_event: billingEvent,
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    destination_type: 'ON_AD',
    promoted_object: JSON.stringify(promotedObject),
  };
  // Budget: se campanha é CBO, não passa daily_budget no adset
  // Mas como estamos usando ABO para controle fino, passamos aqui
  if (dailyBudget) {
    params.daily_budget = String(dailyBudget * 100);
  }
  const res = await post(`${AD_ACCOUNT}/adsets`, params);
  console.log(`    ✓ Adset ID: ${res.id}`);
  return res.id;
}

async function createAd(adsetId, name, creativeId) {
  console.log(`    Criando anúncio: ${name}`);
  const res = await post(`${AD_ACCOUNT}/ads`, {
    adset_id: adsetId,
    name,
    status: 'PAUSED',
    creative: JSON.stringify({ creative_id: creativeId }),
  });
  console.log(`      ✓ Ad ID: ${res.id}`);
  return res.id;
}

async function createAdCreative(name, videoId, message, thumbnailUrl) {
  console.log(`    Criando criativo: ${name}`);
  const res = await post(`${AD_ACCOUNT}/adcreatives`, {
    name,
    object_story_spec: JSON.stringify({
      page_id: PAGE_ID,
      video_data: {
        video_id: videoId,
        message,
        image_url: thumbnailUrl,
        call_to_action: {
          type: 'SIGN_UP',
          value: {
            lead_gen_form_id: FORM_ID,
          },
        },
      },
    }),
  });
  console.log(`      ✓ Creative ID: ${res.id}`);
  return res.id;
}

const COPY_FRIO = `Através do Dream Incision, uma combinação eficaz de técnicas de descolamento subcutâneo e estimulação de colágeno.

Este procedimento não apenas proporciona resultados imediatos, mas também garante benefícios duradouros, mantendo a pele saudável e firme ao longo do tempo.

Dê o primeiro passo para alcançar a pele perfeita e a confiança que você merece.

Dr. Cleugo Porto Coelho Jr - CRM 129662

Fale conosco para descobrir como podemos te ajudar, oferecendo um cuidado seguro e personalizado.`;

async function main() {
  console.log('=======================================================');
  console.log('  CAMPANHAS FRIO + MORNO — DR. CLEUGO PORTO');
  console.log('  Conta: ' + AD_ACCOUNT);
  console.log('  Formulário: ' + FORM_ID);
  console.log('=======================================================\n');
  console.log('⚠️  ATENÇÃO: Conta pré-paga com saldo R$0!');
  console.log('    Campanhas serão criadas como PAUSED.');
  console.log('    Ativar APÓS recarregar a conta.\n');

  // ── STEP 1: Lookalike Audiences (já criados na execução anterior) ────
  console.log('═══════════════════════════════════════');
  console.log('PASSO 1 — Lookalike Audiences (IDs existentes)');
  console.log('═══════════════════════════════════════');

  const lkl_engaj_id = '120240877347170701'; // [Syra] [LKL 1%] Engajamento IG 365D
  const lkl_vv75_id  = '120240877347280701'; // [Syra] [LKL 1%] VV 75% Dream Incision

  console.log(`  ✓ LKL Engajamento IG: ${lkl_engaj_id}`);
  console.log(`  ✓ LKL VV 75%:         ${lkl_vv75_id}`);

  // ── STEP 2: Campanha FRIO ────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('PASSO 2 — Campanha FRIO (Captação)');
  console.log('═══════════════════════════════════════');

  // Campanha FRIO já criada na execução anterior
  const campFrioId = '120240877361730701';
  console.log(`\n  ✓ Campanha FRIO (existente): ${campFrioId}`);

  // Adsets FRIO já criados na execução anterior
  const adsetFrioP1 = '120240877410840701'; // P1 LKL Engaj IG
  const adsetFrioP2 = '120240877411500701'; // P2 LKL VV 75%
  const adsetFrioP3 = '120240877412190701'; // P3 Interesses
  console.log(`  ✓ Adsets FRIO (existentes): P1=${adsetFrioP1} P2=${adsetFrioP2} P3=${adsetFrioP3}`);

  // Criar criativos e anúncios para FRIO (vídeos 18, 19, 20)
  console.log('\n  Criando criativos FRIO...');
  const VIDEO_LABELS = ['V18-Recebemos-mulheres', 'V19-Celulite-pergunta', 'V20-Coxa-bumbum'];

  // Creative C1 já criado — usar ID existente
  const existingCreatives = { 0: '1519965232863956' };

  for (let i = 0; i < VIDEO_IDS.length; i++) {
    const videoId   = VIDEO_IDS[i];
    const label     = VIDEO_LABELS[i];
    const creativeName = `[Syra] C${i+1} [Vídeo] [Hook: ${label}] [CTA: Formulário]`;

    let creativeId;
    if (existingCreatives[i]) {
      creativeId = existingCreatives[i];
      console.log(`    ✓ Criativo C${i+1} (existente): ${creativeId}`);
    } else {
      const thumbnail = await getVideoThumbnail(videoId);
      creativeId = await createAdCreative(creativeName, videoId, COPY_FRIO, thumbnail);
    }

    // Anúncio em todos os adsets FRIO
    for (const [adsetId, adsetLabel] of [[adsetFrioP1, 'P1'], [adsetFrioP2, 'P2'], [adsetFrioP3, 'P3']]) {
      await createAd(adsetId, `C${i+1} [Vídeo] [${label}] — ${adsetLabel}`, creativeId);
    }
  }

  // ── STEP 3: Campanha MORNO ────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('PASSO 3 — Campanha MORNO (Retargeting)');
  console.log('═══════════════════════════════════════');

  const campMornoId = await createCampaign(
    '[Syra] Dr Cleugo — Celulite Dream Incision [Formulário Instantâneo] [MORNO] [CBO]',
    'OUTCOME_LEADS',
    25
  );

  const promotedObjectMorno = {
    page_id: PAGE_ID,
  };

  // Adset P1 MORNO — público morno consolidado (baseado no que funcionou na Hortencia)
  const adsetMornoP1 = await createAdset(
    campMornoId,
    'P1 [Mulheres] [25-55] [FB+IG] [PP: VV75%+VisitaramPerfil+EngajTodos]',
    {
      age_min: 25,
      age_max: 55,
      genders: [2],
      custom_audiences: [
        { id: AUDIENCES.VV_TODOS_75PCT },
        { id: AUDIENCES.VISITARAM_PERFIL },
        { id: AUDIENCES.ENGAJ_TODOS },
        { id: AUDIENCES.SEGUIDORES },
      ],
      facebook_positions: ['feed', 'story'],
      instagram_positions: ['stream', 'story', 'explore', 'reels'],
      device_platforms: ['mobile'],
      publisher_platforms: ['facebook', 'instagram'],
    },
    null,
    'LEAD_GENERATION',
    'IMPRESSIONS',
    promotedObjectMorno
  );

  // Adset P2 MORNO — engajamento profundo (VV 75% Dream Incision + VV TODOS 01.04)
  const adsetMornoP2 = await createAdset(
    campMornoId,
    'P2 [Mulheres] [25-55] [IG] [PP: VV Dream75%+VVTodos01.04+EngajAnuncios]',
    {
      age_min: 25,
      age_max: 55,
      genders: [2],
      custom_audiences: [
        { id: AUDIENCES.VV_DREAM_75PCT },
        { id: AUDIENCES.VV_TODOS_01_04 },
        { id: AUDIENCES.ENGAJ_ANUNCIOS },
      ],
      instagram_positions: ['stream', 'story', 'explore', 'reels'],
      device_platforms: ['mobile'],
      publisher_platforms: ['instagram'],
    },
    null,
    'LEAD_GENERATION',
    'IMPRESSIONS',
    promotedObjectMorno
  );

  // Criar anúncios MORNO com os mesmos criativos (reaproveitamos os creative IDs não são guardados acima, vamos criar de novo)
  console.log('\n  Criando criativos MORNO...');
  for (let i = 0; i < VIDEO_IDS.length; i++) {
    const videoId = VIDEO_IDS[i];
    const label   = VIDEO_LABELS[i];
    const creativeName = `[Syra] MORNO C${i+1} [Vídeo] [Hook: ${label}] [CTA: Formulário]`;
    const thumbnail  = await getVideoThumbnail(videoId);
    const creativeId = await createAdCreative(creativeName, videoId, COPY_FRIO, thumbnail);
    for (const [adsetId, adsetLabel] of [[adsetMornoP1, 'P1'], [adsetMornoP2, 'P2']]) {
      await createAd(adsetId, `MORNO C${i+1} [Vídeo] [${label}] — ${adsetLabel}`, creativeId);
    }
  }

  // ── RESUMO FINAL ───────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ ESTRUTURA CRIADA COM SUCESSO!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('  LOOKALIKES CRIADOS:');
  console.log(`    LKL Engajamento IG: ${lkl_engaj_id}`);
  console.log(`    LKL VV 75%:         ${lkl_vv75_id}`);
  console.log('');
  console.log('  CAMPANHA FRIO (R$50/dia CBO):');
  console.log(`    ID: ${campFrioId}`);
  console.log(`    P1 (LKL Engaj IG):  ${adsetFrioP1}`);
  console.log(`    P2 (LKL VV 75%):    ${adsetFrioP2}`);
  console.log(`    P3 (Interesses):    ${adsetFrioP3}`);
  console.log('');
  console.log('  CAMPANHA MORNO (R$25/dia CBO):');
  console.log(`    ID: ${campMornoId}`);
  console.log(`    P1 (VV75%+Perf+Eng): ${adsetMornoP1}`);
  console.log(`    P2 (VV Dream+01.04): ${adsetMornoP2}`);
  console.log('');
  console.log('  ⚠️  AÇÃO NECESSÁRIA:');
  console.log('  → Recarregar conta pré-paga (saldo R$0)');
  console.log('  → Após recarga: ativar campanhas no Gerenciador');
  console.log('');
  console.log(`  Gerenciador: https://adsmanager.facebook.com/advertisers/${AD_ACCOUNT}`);
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n✗ Erro:', err.message);
  process.exit(1);
});
