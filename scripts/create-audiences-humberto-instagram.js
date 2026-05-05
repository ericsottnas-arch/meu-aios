/**
 * Cria Públicos Personalizados de Engajamento no Instagram
 * Conta: act_445142030338909 — Dr. Humberto Andrade
 *
 * Contas Instagram:
 *   - humbertoandradebr
 *   - universidadedaface
 *   - institutohrandrade
 *
 * Tipos de público por conta:
 *   1. Engajados (todos) — 365 dias
 *   2. Comentaram       — 365 dias
 *   3. Seguiu           — 365 dias
 *   4. Visitou o perfil — 365 dias
 *
 * ETAPA 1: Descobrir IDs das contas Instagram via API
 * ETAPA 2: Criar os 12 públicos (4 tipos × 3 contas)
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const AD_ACCOUNT = 'act_445142030338909';
const TOKEN      = process.env.META_ACCESS_TOKEN;
const API        = 'v21.0';
const BASE       = `https://graph.facebook.com/${API}`;

// Usernames das contas Instagram a serem mapeadas
const IG_USERNAMES = [
  'humbertoandradebr',
  'universidadedaface',
  'institutohrandrade',
];

// Tipos de público a criar por conta
// event: valor exato do campo "event" na regra da API Meta
const AUDIENCE_TYPES = [
  {
    key:         'engajados',
    label:       'Engajados',
    event:       'ig_business_profile_all',
    description: 'Todos que engajaram com o perfil (curtidas, comentários, compartilhamentos, DMs, salvos)',
  },
  {
    key:         'comentaram',
    label:       'Comentaram',
    event:       'ig_business_profile_comment',
    description: 'Todos que comentaram em qualquer post ou reel',
  },
  {
    key:         'seguiu',
    label:       'Seguiu',
    event:       'ig_business_profile_follow',
    description: 'Todos que seguiram a conta',
  },
  {
    key:         'visitou_perfil',
    label:       'Visitou o Perfil',
    event:       'ig_business_profile_visit',
    description: 'Todos que visitaram o perfil mesmo sem engajar',
  },
];

const RETENTION_DAYS    = 365;
const RETENTION_SECONDS = RETENTION_DAYS * 24 * 60 * 60;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de API
// ─────────────────────────────────────────────────────────────────────────────

async function get(endpoint, params = {}) {
  const qs = new URLSearchParams({ access_token: TOKEN, ...params });
  const r = await fetch(`${BASE}/${endpoint}?${qs}`);
  const j = await r.json();
  if (j.error) throw new Error(`[GET /${endpoint}] ${j.error.error_user_msg || j.error.message} (code ${j.error.code})`);
  return j;
}

async function post(endpoint, body) {
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    body:   new URLSearchParams({ access_token: TOKEN, ...body }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`[POST /${endpoint}] ${j.error.error_user_msg || j.error.message} (code ${j.error.code})`);
  return j;
}

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 1 — Descobrir IDs das contas Instagram
// ─────────────────────────────────────────────────────────────────────────────

async function discoverIgAccounts() {
  console.log('\n[ETAPA 1] Descobrindo IDs das contas Instagram...\n');

  // Busca todas as contas IG conectadas ao ad account via business
  let igAccounts = [];
  try {
    const res = await get(`${AD_ACCOUNT}/instagram_accounts`, {
      fields: 'id,username,name,followers_count',
    });
    if (res.data && res.data.length > 0) {
      igAccounts = res.data;
      console.log(`  Encontradas ${igAccounts.length} conta(s) Instagram conectadas ao ad account:`);
      igAccounts.forEach(a => console.log(`    - @${a.username} → ID: ${a.id}`));
    }
  } catch (err) {
    console.log(`  Aviso: não foi possível buscar via /instagram_accounts: ${err.message}`);
  }

  // Se não encontrou todas, tenta via owned_instagram_accounts do business
  if (igAccounts.length < IG_USERNAMES.length) {
    try {
      const biz = await get(`${AD_ACCOUNT}`, { fields: 'business' });
      if (biz.business && biz.business.id) {
        const bizId = biz.business.id;
        console.log(`\n  Business ID: ${bizId}. Buscando instagram_accounts do business...`);
        const bizRes = await get(`${bizId}/instagram_accounts`, {
          fields: 'id,username,name,followers_count',
        });
        if (bizRes.data) {
          const extra = bizRes.data.filter(a => !igAccounts.find(x => x.id === a.id));
          igAccounts = [...igAccounts, ...extra];
          extra.forEach(a => console.log(`    - @${a.username} → ID: ${a.id} (via business)`));
        }
      }
    } catch (err) {
      console.log(`  Aviso: não foi possível buscar via business: ${err.message}`);
    }
  }

  // Mapeia username → id
  const igMap = {};
  for (const acc of igAccounts) {
    if (acc.username) igMap[acc.username.toLowerCase()] = acc;
  }

  // Verifica quais foram encontrados
  const result = {};
  for (const username of IG_USERNAMES) {
    const found = igMap[username.toLowerCase()];
    if (found) {
      result[username] = found;
      console.log(`  ✓ @${username} → ID: ${found.id}`);
    } else {
      console.log(`  ✗ @${username} → NÃO ENCONTRADO na conta (precisa estar conectado ao Business Manager)`);
      result[username] = null;
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 2 — Criar públicos personalizados
// ─────────────────────────────────────────────────────────────────────────────

function buildRule(igAccountId, event) {
  return {
    inclusions: {
      operator: 'or',
      rules: [
        {
          event_sources: [{ id: igAccountId, type: 'ig_business' }],
          retention_seconds: RETENTION_SECONDS,
          filter: {
            operator: 'and',
            filters: [
              { field: 'event', operator: 'eq', value: event },
            ],
          },
        },
      ],
    },
  };
}

function accountLabel(username) {
  const MAP = {
    humbertoandradebr:  'Humberto Andrade',
    universidadedaface: 'Univ. da Face',
    institutohrandrade: 'Instituto HR',
  };
  return MAP[username] || username;
}

async function createAudiences(igMap) {
  console.log('\n[ETAPA 2] Criando públicos personalizados...\n');

  const results = [];
  let total = 0;

  for (const username of IG_USERNAMES) {
    const igAcc = igMap[username];
    if (!igAcc) {
      console.log(`  ⚠ Pulando @${username} — conta não encontrada\n`);
      continue;
    }

    const label = accountLabel(username);
    console.log(`  📸 @${username} (${label}) — ID: ${igAcc.id}`);

    for (const type of AUDIENCE_TYPES) {
      const name = `[Syra] Humberto — ${label} — ${type.label} (${RETENTION_DAYS}D)`;
      process.stdout.write(`    [${type.label}]... `);

      try {
        const res = await post(`${AD_ACCOUNT}/customaudiences`, {
          name,
          description: type.description,
          subtype:     'ENGAGEMENT',
          rule:        JSON.stringify(buildRule(igAcc.id, type.event)),
        });
        console.log(`✓ ID: ${res.id}`);
        results.push({ name, id: res.id, username, type: type.key });
        total++;
      } catch (err) {
        console.log(`✗ Erro: ${err.message}`);
        results.push({ name, error: err.message, username, type: type.key });
      }
    }
    console.log();
  }

  return { results, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('===========================================');
  console.log('  Públicos Instagram — DR. HUMBERTO');
  console.log('  Conta: ' + AD_ACCOUNT);
  console.log('  Contas: @humbertoandradebr');
  console.log('          @universidadedaface');
  console.log('          @institutohrandrade');
  console.log('  Retenção: 365 dias');
  console.log('===========================================');

  // Etapa 1: descobrir IDs
  const igMap = await discoverIgAccounts();

  const found = Object.values(igMap).filter(Boolean).length;
  if (found === 0) {
    console.log('\n✗ Nenhuma conta Instagram encontrada.');
    console.log('  Verifique se as contas estão conectadas ao Business Manager.');
    console.log(`  Business Manager: https://business.facebook.com/settings/instagram-accounts`);
    process.exit(1);
  }

  // Etapa 2: criar públicos
  const { results, total } = await createAudiences(igMap);

  // Resumo final
  console.log('===========================================');
  console.log('  RESUMO');
  console.log('===========================================');

  const ok     = results.filter(r => r.id);
  const failed = results.filter(r => r.error);

  console.log(`\n  ✓ Criados: ${ok.length} público(s)`);
  ok.forEach(r => console.log(`    ${r.name} → ${r.id}`));

  if (failed.length > 0) {
    console.log(`\n  ✗ Falhas: ${failed.length}`);
    failed.forEach(r => console.log(`    ${r.name} → ${r.error}`));
  }

  console.log('\n  Gerenciador de Públicos:');
  console.log(`  https://business.facebook.com/adsmanager/audiences?act=${AD_ACCOUNT.replace('act_','')}`);
  console.log('===========================================\n');
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message);
  process.exit(1);
});
