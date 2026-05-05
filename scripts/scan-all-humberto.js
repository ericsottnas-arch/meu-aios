/**
 * Escaneia TODOS os ads da conta HR Andrade via endpoint account-level
 * Uma única chamada paginada em vez de campaign > adset > ads
 * Busca: travessão (—), avaliação gratuita, consulta gratuita, Macapá, Amapá
 */
const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_445142030338909';
const BASE       = 'https://graph.facebook.com/v21.0';

const BAD_PATTERNS = [
  { re: /[—–]/,                          label: 'travessao' },
  { re: /avalia[çc][aã]o\s+gratuita/i,  label: 'avaliacao gratuita' },
  { re: /consulta\s+gratuita/i,          label: 'consulta gratuita' },
  { re: /macap[aá]/i,                    label: 'Macapa' },
  { re: /amap[aá]/i,                     label: 'Amapa' },
];

function hasProblems(text) {
  if (!text) return [];
  return BAD_PATTERNS.filter(p => p.re.test(text)).map(p => p.label);
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function get(url, retries = 8) {
  for (let i = 0; i < retries; i++) {
    const r = await fetch(url);
    const j = await r.json();
    if (!j.error) return j;
    const isRate = j.error.code === 17 || j.error.code === 4 ||
                   (j.error.message || '').toLowerCase().includes('excessivo') ||
                   (j.error.message || '').toLowerCase().includes('limit');
    if (isRate && i < retries - 1) {
      const wait = Math.min((i + 1) * 30000, 120000);
      process.stdout.write(`\n  [rate limit] aguardando ${wait/1000}s...\n`);
      await sleep(wait);
      continue;
    }
    throw new Error(j.error.error_user_msg || j.error.message);
  }
}

async function main() {
  console.log('=====================================================');
  console.log('  SCAN GERAL — HR Andrade Instituto');
  console.log('  Verifica: travessao, avaliacao/consulta gratuita,');
  console.log('            Macapa, Amapa');
  console.log('=====================================================\n');

  const results  = [];
  let adsScanned = 0;
  let page       = 0;

  // Campos para buscar em cada ad (inclui campaign e adset name para contexto)
  const fields = [
    'id', 'name',
    'campaign{id,name}',
    'adset{id,name}',
    'creative{id,object_story_spec}',
  ].join(',');

  let url = `${BASE}/${AD_ACCOUNT}/ads?fields=${fields}&limit=50&access_token=${TOKEN}`;

  console.log('Buscando ads (paginado, 50 por vez)...\n');

  while (url) {
    page++;
    process.stdout.write(`  Página ${page} (${adsScanned} ads até agora)...\r`);

    const data = await get(url);
    const ads  = data.data || [];
    adsScanned += ads.length;

    for (const ad of ads) {
      const spec = ad.creative?.object_story_spec;
      if (!spec) continue;

      const vd = spec.video_data;
      const ld = spec.link_data;

      const textFields = {
        titulo:    vd?.title            || ld?.name        || '',
        mensagem:  vd?.message          || ld?.message     || '',
        descricao: vd?.link_description || ld?.description || '',
      };

      for (const [fieldName, text] of Object.entries(textFields)) {
        const probs = hasProblems(text);
        for (const prob of probs) {
          results.push({
            camp:    ad.campaign?.name || '(sem campanha)',
            adset:   ad.adset?.name   || '(sem adset)',
            ad:      ad.name,
            adId:    ad.id,
            field:   fieldName,
            problem: prob,
            excerpt: text.substring(0, 90).replace(/\n/g, ' '),
          });
        }
      }
    }

    // Próxima página
    url = data.paging?.next || null;
    if (url) await sleep(2000); // pausa entre páginas
  }

  process.stdout.write('\n');

  // ── Relatório ─────────────────────────────────────────────────────────────
  console.log('\n=====================================================');
  console.log(`  Ads escaneados: ${adsScanned}`);
  console.log(`  Problemas:      ${results.length}`);
  console.log('=====================================================\n');

  if (results.length === 0) {
    console.log('  Nenhum problema encontrado. Copy limpa em toda a conta.\n');
    return;
  }

  // Agrupar por campanha
  const byCamp = {};
  for (const r of results) {
    if (!byCamp[r.camp]) byCamp[r.camp] = [];
    byCamp[r.camp].push(r);
  }

  for (const [camp, items] of Object.entries(byCamp)) {
    console.log(`CAMPANHA: ${camp.substring(0, 75)}`);
    const seen = new Set();
    for (const item of items) {
      const key = `${item.adId}|${item.problem}|${item.field}`;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`  [${item.problem}] ${item.ad.substring(0, 60)}`);
      console.log(`    Campo:   ${item.field}`);
      console.log(`    Trecho:  "${item.excerpt}"`);
    }
    console.log('');
  }

  const byProblem = {};
  for (const r of results) {
    byProblem[r.problem] = (byProblem[r.problem] || 0) + 1;
  }
  console.log('RESUMO POR TIPO:');
  for (const [prob, count] of Object.entries(byProblem)) {
    console.log(`  ${prob}: ${count} ocorrência(s)`);
  }
}

main().catch(err => { console.error('\nErro fatal:', err.message); process.exit(1); });
