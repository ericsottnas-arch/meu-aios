const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const { chromium } = require('playwright');
const ghlDB = require('./lib/ghl-db');
const sqlite3 = require('sqlite3').verbose();

const INSTAGRAM_EMAIL = process.env.INSTAGRAM_EMAIL;
const INSTAGRAM_PASSWORD = process.env.INSTAGRAM_PASSWORD;

async function testScraper() {
  let browser;
  try {
    console.log('🧪 Teste de Scraper Iniciado...\n');
    
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    const page = await context.newPage();

    // Login
    console.log('1️⃣ Fazendo login...');
    await page.goto('https://instagram.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    const inputs = await page.$$('input[type="text"], input[type="password"]');
    if (inputs.length >= 2) {
      await inputs[0].fill(INSTAGRAM_EMAIL);
      await inputs[1].fill(INSTAGRAM_PASSWORD);
      
      const buttons = await page.$$('button');
      if (buttons.length > 0) {
        await buttons[buttons.length - 1].click();
      }
    }

    await page.waitForTimeout(5000);
    
    // Acessar Direct
    console.log('2️⃣ Acessando Direct Messages...');
    await page.goto('https://instagram.com/direct/inbox/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // Extrair dados para debug
    console.log('3️⃣ Analisando estrutura HTML...');
    
    const debugInfo = await page.evaluate(() => {
      return {
        articles: document.querySelectorAll('[role="article"]').length,
        listItems: document.querySelectorAll('div[role="listitem"]').length,
        buttons: document.querySelectorAll('button').length,
        divTexts: Array.from(document.querySelectorAll('div')).filter(d => d.innerText && d.innerText.length > 10 && d.innerText.length < 100).slice(0, 5).map(d => d.innerText)
      };
    });

    console.log(`   - [role="article"]: ${debugInfo.articles}`);
    console.log(`   - [role="listitem"]: ${debugInfo.listItems}`);
    console.log(`   - Buttons: ${debugInfo.buttons}`);
    console.log(`   - Sample texts:`, debugInfo.divTexts);

    await browser.close();
    
    // Verificar banco de dados
    console.log('\n📊 Verificando banco de dados...');
    
    const db = new sqlite3.Database('/Users/ericsantos/docs/banco-dados-geral/ghl-conversations.db');
    
    db.all('SELECT * FROM ghl_conversas ORDER BY created_at DESC LIMIT 10', (err, conversations) => {
      if (conversations && conversations.length > 0) {
        console.log(`\n✅ Total de conversas: ${conversations.length}`);
        conversations.forEach(conv => {
          console.log(`   - ${conv.contact_name} (${conv.type})`);
        });
      } else {
        console.log('\n⚠️ Nenhuma conversa encontrada');
      }

      // Verificar mensagens
      db.all('SELECT * FROM ghl_mensagens ORDER BY timestamp DESC LIMIT 5', (err, messages) => {
        if (messages && messages.length > 0) {
          console.log(`\n📝 Últimas mensagens: ${messages.length}`);
          messages.forEach(msg => {
            console.log(`   - ${msg.body.substring(0, 60)}`);
          });
        } else {
          console.log('\n⚠️ Nenhuma mensagem encontrada');
        }

        db.close();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

testScraper();
