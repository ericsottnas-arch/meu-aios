/**
 * Criar ads C1, C2, C8 — Blefaroplastia Video Views
 * Creatives já criados, só vincular ao adset
 */

const path  = require('path');
const fetch = require('node-fetch').default;
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });

const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = 'act_445142030338909';
const BASE       = 'https://graph.facebook.com/v21.0';
const ADSET_ID   = '120248466251330460';

const UTM_TAGS =
  'utm_source={{placement}}' +
  '&utm_medium=cpc' +
  '&utm_campaign={{campaign.name}}{{campaign.id}}' +
  '&utm_content={{adset.name}}{{adset.id}}' +
  '&utm_term={{ad.name}}_{{ad.id}}';

const ADS = [
  { cNum: 1, creativeId: '970564965552437'  },
  { cNum: 2, creativeId: '1853647031994440' },
  { cNum: 8, creativeId: '939303522212301'  },
];

async function main() {
  for (const item of ADS) {
    const adName = `Blefaroplastia — C${item.cNum} [Vídeo] [CTA: Saiba Mais]`;
    process.stdout.write(`  Criando ${adName} ... `);

    const r = await fetch(`${BASE}/${AD_ACCOUNT}/ads`, {
      method: 'POST',
      body: new URLSearchParams({
        access_token: TOKEN,
        name: adName,
        adset_id: ADSET_ID,
        creative: JSON.stringify({ creative_id: item.creativeId }),
        status: 'ACTIVE',
        url_tags: UTM_TAGS,
      }),
    });
    const j = await r.json();
    if (j.error) {
      console.log(`❌ ${j.error.error_user_msg || j.error.message}`);
    } else {
      console.log(`✅ ID: ${j.id}`);
    }
  }
}

main().catch(err => { console.error('✗', err.message); process.exit(1); });
