/**
 * Monitor de gasto Google Ads - Dr. Erico Servano
 * Verifica a cada 3h se a campanha começou a gastar.
 * Envia notificação no Telegram quando detectar gasto > R$0,01.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { google } = require('googleapis');

const CID = '2169824174';
const CAMPAIGN_ID = '23531775083';
const MCC_ID = '7331913513';
const CHAT_ID = '5020990459'; // Eric
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.replace(/"/g, '') || process.env.IRIS_BOT_TOKEN?.replace(/"/g, '');

const CHECK_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 horas
const MAX_CHECKS = 40; // ~5 dias

let checkCount = 0;

async function getAccessToken() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_ADS_CLIENT_ID?.replace(/"/g, ''),
    process.env.GOOGLE_ADS_CLIENT_SECRET?.replace(/"/g, ''),
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN?.replace(/"/g, ''),
  });
  const { token } = await oauth2Client.getAccessToken();
  return token;
}

async function queryGoogleAds(gaql) {
  const token = await getAccessToken();
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.replace(/"/g, '');
  const url = `https://googleads.googleapis.com/v23/customers/${CID}/googleAds:searchStream`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'developer-token': devToken,
      'login-customer-id': MCC_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: gaql }),
  });
  const data = await r.json();
  if (!r.ok) return [];
  return data[0]?.results || [];
}

async function sendTelegram(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
  });
}

async function checkSpend() {
  checkCount++;
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  console.log(`[${now}] Check #${checkCount}/${MAX_CHECKS}`);

  try {
    // Métricas dos últimos 7 dias
    const results = await queryGoogleAds(`
      SELECT
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM campaign
      WHERE campaign.id = ${CAMPAIGN_ID}
        AND segments.date DURING LAST_7_DAYS
    `);

    let totalImps = 0, totalClicks = 0, totalCost = 0, totalConv = 0;
    results.forEach(r => {
      totalImps += Number(r.metrics?.impressions || 0);
      totalClicks += Number(r.metrics?.clicks || 0);
      totalCost += Number(r.metrics?.costMicros || 0);
      totalConv += Number(r.metrics?.conversions || 0);
    });

    const spend = totalCost / 1_000_000;
    console.log(`  Impressions: ${totalImps} | Clicks: ${totalClicks} | Spend: R$ ${spend.toFixed(2)}`);

    if (spend > 0 || totalImps > 0) {
      // DETECTOU GASTO!
      const cpc = totalClicks > 0 ? (spend / totalClicks).toFixed(2) : '-';
      const ctr = totalImps > 0 ? ((totalClicks / totalImps) * 100).toFixed(1) : '-';

      const msg = [
        `📈 <b>Google Ads gastou!</b>`,
        ``,
        `<b>Campanha:</b> Página de Captura - Dr. Erico`,
        `<b>Período:</b> Últimos 7 dias`,
        ``,
        `💰 <b>Gasto:</b> R$ ${spend.toFixed(2)}`,
        `👁 <b>Impressões:</b> ${totalImps.toLocaleString('pt-BR')}`,
        `🖱 <b>Cliques:</b> ${totalClicks}`,
        `📊 <b>CTR:</b> ${ctr}%`,
        `💵 <b>CPC:</b> R$ ${cpc}`,
        `🎯 <b>Conversões:</b> ${totalConv}`,
        ``,
        `✅ A campanha está funcionando!`,
        ``,
        `<i>— Celo, monitor automático</i>`,
      ].join('\n');

      await sendTelegram(msg);
      console.log('  ✅ Notificação enviada! Parando monitor.');
      process.exit(0);
    } else {
      console.log('  Ainda sem gasto. Próximo check em 3h.');
    }
  } catch (err) {
    console.error('  Erro no check:', err.message);
  }

  if (checkCount >= MAX_CHECKS) {
    const msg = [
      `⚠️ <b>Google Ads - Alerta</b>`,
      ``,
      `A campanha do Dr. Erico Servano continua sem gastar após ${MAX_CHECKS} verificações (~5 dias).`,
      ``,
      `Recomendo verificar manualmente no painel do Google Ads.`,
      ``,
      `<i>— Celo, monitor automático</i>`,
    ].join('\n');
    await sendTelegram(msg);
    console.log('  ⚠️ Max checks atingido. Parando.');
    process.exit(1);
  }
}

// Rodar imediatamente e depois a cada 3h
console.log(`Google Ads Spend Monitor iniciado`);
console.log(`Campanha: ${CAMPAIGN_ID} | Cliente: ${CID}`);
console.log(`Intervalo: 3h | Máx checks: ${MAX_CHECKS}`);
console.log(`Telegram: ${CHAT_ID} via bot ${BOT_TOKEN?.slice(0, 10)}...`);
console.log('---');

checkSpend();
setInterval(checkSpend, CHECK_INTERVAL_MS);
