#!/usr/bin/env node

// Debug do Scraper - Abre navegador visível para inspecionar

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const { chromium } = require('playwright');

const INSTAGRAM_EMAIL = process.env.INSTAGRAM_EMAIL;
const INSTAGRAM_PASSWORD = process.env.INSTAGRAM_PASSWORD;

async function debugScraper() {
  let browser;
  try {
    console.log('🧪 MODO DEBUG - Navegador Visível\n');
    console.log('Email:', INSTAGRAM_EMAIL);
    console.log('');

    // Abrir navegador VISÍVEL (headless: false)
    browser = await chromium.launch({
      headless: false,  // ← AQUI: Visível!
      args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    const page = await context.newPage();

    // Login
    console.log('1️⃣ Abrindo Instagram...');
    await page.goto('https://instagram.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    console.log('2️⃣ Preenchendo credenciais...');
    const inputs = await page.$$('input[type="text"], input[type="password"]');
    if (inputs.length >= 2) {
      await inputs[0].fill(INSTAGRAM_EMAIL);
      await inputs[1].fill(INSTAGRAM_PASSWORD);

      const buttons = await page.$$('button');
      if (buttons.length > 0) {
        await buttons[buttons.length - 1].click();
      }
    }

    console.log('3️⃣ Aguardando login...');
    await page.waitForTimeout(5000);

    // Acessar Direct
    console.log('4️⃣ Abrindo Direct Messages...');
    await page.goto('https://instagram.com/direct/inbox/', { waitUntil: 'domcontentloaded' });

    console.log('\n✅ Navegador aberto e logado!');
    console.log('\n📋 Inspect elements:');
    console.log('   - Abra o DevTools (F12 ou Cmd+Option+I)');
    console.log('   - Procure por elementos de conversa');
    console.log('   - Clique com botão direito > Inspect para ver a estrutura HTML');
    console.log('\n🔍 Procure pelos seguintes seletores:');
    console.log('   - [role="article"]');
    console.log('   - [role="listitem"]');
    console.log('   - div com classe "x1...]');
    console.log('   - Procure por nomes de contatos visíveis\n');

    // Extrair informações para debug
    console.log('📊 Análise da página:');
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        articles: document.querySelectorAll('[role="article"]').length,
        listItems: document.querySelectorAll('[role="listitem"]').length,
        buttons: document.querySelectorAll('button').length,
        divsWithText: Array.from(document.querySelectorAll('div'))
          .filter(d => d.children.length === 0 && d.innerText && d.innerText.length > 5 && d.innerText.length < 100)
          .slice(0, 15)
          .map(d => ({ text: d.innerText, classes: d.className }))
      };
    });

    console.log(`   - Title: ${pageInfo.title}`);
    console.log(`   - URL: ${pageInfo.url}`);
    console.log(`   - [role="article"]: ${pageInfo.articles}`);
    console.log(`   - [role="listitem"]: ${pageInfo.listItems}`);
    console.log(`   - Total buttons: ${pageInfo.buttons}`);

    console.log('\n   📝 Textos visíveis na página:');
    pageInfo.divsWithText.slice(0, 10).forEach((item, i) => {
      console.log(`      ${i + 1}. "${item.text}" [class="${item.classes.substring(0, 50)}"]`);
    });

    // Manter navegador aberto por 2 minutos
    console.log('\n⏱️  Navegador será fechado em 120 segundos...');
    console.log('   Use este tempo para inspecionar os elementos!\n');

    await page.waitForTimeout(120000);

    await browser.close();
    console.log('\n✅ Debug concluído');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

debugScraper();
