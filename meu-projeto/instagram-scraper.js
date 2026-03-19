#!/usr/bin/env node

// Instagram DM Scraper com Playwright
// Lê mensagens direto do Instagram e salva no banco local

const path = require('path');
const fs = require('fs');

if (process.env.NODE_ENV !== 'production') {
  const localEnv = path.resolve(__dirname, '.env');
  const parentEnv = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(localEnv)) {
    require('dotenv').config({ path: localEnv });
  } else if (fs.existsSync(parentEnv)) {
    require('dotenv').config({ path: parentEnv });
  } else {
    require('dotenv').config();
  }
}

const { chromium } = require('playwright');
const ghlDB = require('./lib/ghl-db');

const INSTAGRAM_EMAIL = process.env.INSTAGRAM_EMAIL || '';
const INSTAGRAM_PASSWORD = process.env.INSTAGRAM_PASSWORD || '';
const PLAYWRIGHT_HEADLESS = process.env.PLAYWRIGHT_HEADLESS !== 'false';

console.log(`
╔════════════════════════════════════════╗
║   📷 Instagram Scraper Started         ║
╠════════════════════════════════════════╣
║   Sincronizando DMs a cada 15 min      ║
║   Status: ✅ Ativo                     ║
╚════════════════════════════════════════╝
`);

/**
 * Fazer login no Instagram
 */
async function loginInstagram(page) {
  console.log('🔑 Fazendo login no Instagram...');

  await page.goto('https://instagram.com/', { waitUntil: 'domcontentloaded' });

  // Aguardar campo de username/email (pode variar)
  try {
    await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 15000 });
  } catch (e) {
    console.log('⚠️  Campos de login não encontrados, tentando alternativa...');
    // Tentar encontrar por aria-label
    await page.waitForSelector('input[aria-label*="phone"]', { timeout: 5000 }).catch(() => null);
  }

  // Encontrar inputs dinamicamente
  const inputs = await page.$$('input[type="text"], input[type="password"]');

  if (inputs.length >= 2) {
    await inputs[0].fill(INSTAGRAM_EMAIL);
    await inputs[1].fill(INSTAGRAM_PASSWORD);
  } else {
    throw new Error('Não foi possível encontrar os campos de login');
  }

  // Clicar no botão de login
  const buttons = await page.$$('button');
  if (buttons.length > 0) {
    await buttons[buttons.length - 1].click();
  }

  // Aguardar carregamento
  await page.waitForTimeout(5000);

  // Verificar se está logado
  try {
    await page.goto('https://instagram.com/direct/inbox/', { waitUntil: 'domcontentloaded' });
    console.log('✅ Login bem-sucedido');
  } catch (e) {
    throw new Error('Falha ao fazer login: ' + e.message);
  }
}

/**
 * Extrair mensagens do inbox
 */
async function scrapeMessages(page) {
  try {
    console.log(`⏱️  [${new Date().toLocaleTimeString()}] Iniciando scraping...`);

    // Navegar para Direct
    await page.goto('https://instagram.com/direct/inbox/', { waitUntil: 'networkidle' });

    // Aguardar carregar conversas
    await page.waitForSelector('[role="article"]', { timeout: 10000 }).catch(() => null);

    // Extrair todas as conversas visíveis
    const conversations = await page.$$eval('[role="article"]', articles => {
      return articles.map(article => {
        const nameEl = article.querySelector('span a');
        const messageEl = article.querySelector('[dir="auto"]');
        const timeEl = article.querySelector('time');

        return {
          name: nameEl?.textContent?.trim() || 'Unknown',
          message: messageEl?.textContent?.trim() || '',
          time: timeEl?.getAttribute('datetime') || new Date().toISOString()
        };
      });
    });

    console.log(`📨 Encontradas ${conversations.length} conversas`);

    if (conversations.length === 0) {
      console.log('⚠️  Nenhuma conversa encontrada');
      return;
    }

    // Salvar cada conversa
    conversations.forEach(conv => {
      if (!conv.message) return;

      const conversationId = `ig_${conv.name.toLowerCase().replace(/\s+/g, '_')}`;

      // Salvar conversa
      ghlDB.saveConversation({
        conversationId,
        contactId: conv.name,
        contactName: conv.name,
        status: 'active',
        type: 'instagram',
        fromNumber: 'instagram',
        toNumber: 'instagram',
        lastMessageDate: new Date(conv.time).getTime(),
        unreadCount: 0
      });

      // Salvar mensagem
      ghlDB.saveMessage({
        messageId: `ig_${Date.now()}_${Math.random()}`,
        conversationId,
        body: conv.message,
        from: conv.name,
        to: 'você',
        timestamp: new Date(conv.time).getTime(),
        direction: 'inbound',
        attachments: []
      });
    });

    console.log(`✅ Scraping concluído - ${conversations.length} conversas sincronizadas`);
  } catch (error) {
    console.error('❌ Erro ao fazer scraping:', error.message);
  }
}

/**
 * Main: Executar scraper
 */
async function main() {
  if (!INSTAGRAM_EMAIL || !INSTAGRAM_PASSWORD) {
    console.error('❌ ERRO: Configure INSTAGRAM_EMAIL e INSTAGRAM_PASSWORD no .env');
    console.log('\nAdicione ao .env:');
    console.log('INSTAGRAM_EMAIL=seu_email@gmail.com');
    console.log('INSTAGRAM_PASSWORD=sua_senha');
    process.exit(1);
  }

  let browser;

  try {
    // Iniciar navegador
    browser = await chromium.launch({
      headless: PLAYWRIGHT_HEADLESS,
      args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    const page = await context.newPage();

    // Fazer login
    await loginInstagram(page);

    // Extrair mensagens primeira vez
    await scrapeMessages(page);

    // Depois extrair a cada 15 minutos
    setInterval(async () => {
      try {
        await scrapeMessages(page);
      } catch (error) {
        console.error('❌ Erro na sincronização periódica:', error.message);
        // Tentar fazer login novamente se sessão expirou
        try {
          await loginInstagram(page);
          await scrapeMessages(page);
        } catch (e) {
          console.error('❌ Falha ao reconectar:', e.message);
        }
      }
    }, 15 * 60 * 1000);

  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Encerrando scraper...');
  process.exit(0);
});

// Executar
main().catch(error => {
  console.error('❌ Erro não tratado:', error);
  process.exit(1);
});
