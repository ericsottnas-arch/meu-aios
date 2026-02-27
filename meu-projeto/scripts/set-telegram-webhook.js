#!/usr/bin/env node
/**
 * Registra (ou remove) o webhook do Telegram Bot API.
 *
 * Uso:
 *   node scripts/set-telegram-webhook.js https://SEU-APP.railway.app/webhook
 *   node scripts/set-telegram-webhook.js --delete
 *
 * Env vars necessárias:
 *   TELEGRAM_BOT_TOKEN        — token do bot
 *   TELEGRAM_WEBHOOK_SECRET   — (opcional) secret_token para verificação
 */

const path = require('path');
const fs = require('fs');

// Carrega .env se disponível
if (process.env.NODE_ENV !== 'production') {
  const localEnv = path.resolve(__dirname, '..', '.env');
  const parentEnv = path.resolve(__dirname, '..', '..', '.env');
  if (fs.existsSync(localEnv)) {
    require('dotenv').config({ path: localEnv });
  } else if (fs.existsSync(parentEnv)) {
    require('dotenv').config({ path: parentEnv });
  }
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.replace(/"/g, '');
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN não está definido no .env');
  process.exit(1);
}

async function setWebhook(url) {
  const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;
  const body = { url };

  if (WEBHOOK_SECRET) {
    body.secret_token = WEBHOOK_SECRET;
    console.log('🔒 Enviando secret_token junto com o webhook');
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.ok) {
    console.log(`✅ Webhook registrado: ${url}`);
    if (WEBHOOK_SECRET) {
      console.log('🔒 Secret token configurado — requests serão verificados');
    }
  } else {
    console.error(`❌ Erro ao registrar webhook: ${data.description}`);
    process.exit(1);
  }
}

async function deleteWebhook() {
  const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`;
  const res = await fetch(apiUrl, { method: 'POST' });
  const data = await res.json();

  if (data.ok) {
    console.log('✅ Webhook removido com sucesso');
  } else {
    console.error(`❌ Erro ao remover webhook: ${data.description}`);
    process.exit(1);
  }
}

async function getWebhookInfo() {
  const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`;
  const res = await fetch(apiUrl);
  const data = await res.json();

  if (data.ok) {
    const info = data.result;
    console.log('\n📡 Webhook Info:');
    console.log(`   URL: ${info.url || '(não configurado)'}`);
    console.log(`   Has secret: ${info.has_custom_certificate ? 'Yes' : 'No'}`);
    console.log(`   Pending updates: ${info.pending_update_count}`);
    if (info.last_error_message) {
      console.log(`   Last error: ${info.last_error_message}`);
    }
    console.log('');
  }
}

async function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.log('Uso:');
    console.log('  node scripts/set-telegram-webhook.js <URL>      — Registrar webhook');
    console.log('  node scripts/set-telegram-webhook.js --delete   — Remover webhook');
    console.log('  node scripts/set-telegram-webhook.js --info     — Ver info atual');
    console.log('');
    console.log('Exemplo:');
    console.log('  node scripts/set-telegram-webhook.js https://meu-app.railway.app/webhook');
    process.exit(0);
  }

  if (arg === '--delete') {
    await deleteWebhook();
  } else if (arg === '--info') {
    await getWebhookInfo();
  } else {
    if (!arg.startsWith('https://')) {
      console.error('❌ A URL do webhook deve começar com https://');
      process.exit(1);
    }
    await setWebhook(arg);
    await getWebhookInfo();
  }
}

main().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
