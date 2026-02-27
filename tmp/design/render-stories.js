const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function renderStories() {
  console.log('🎨 Luna - Iniciando renderização do criativo Stories...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Configurar viewport para Stories (9:16)
    // Stories: 1080x1920 base, renderizar a 2x = 2160x3840
    await page.setViewport({
      width: 1080,
      height: 1920,
      deviceScaleFactor: 2
    });

    const htmlPath = path.join(__dirname, 'leonardo-stories.html');
    const fileUrl = `file://${htmlPath}`;

    console.log(`📄 Carregando HTML: ${htmlPath}`);
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    // Esperar um pouco para certeza de que tudo está renderizado
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));

    const outputPath = path.join(__dirname, 'leonardo-stories-FINAL.png');

    console.log(`📸 Renderizando em alta qualidade (2160x3840)...`);
    await page.screenshot({
      path: outputPath,
      type: 'png',
      fullPage: false
    });

    console.log(`\n✅ CRIATIVO FINALIZADO!`);
    console.log(`📦 Arquivo: ${outputPath}`);
    console.log(`📐 Dimensões: 2160x3840 (Stories 2x)`);
    console.log(`\n✨ Padrão Belle Fernandes aplicado:`);
    console.log(`   ✓ Fundo escuro (#0d0d0f)`);
    console.log(`   ✓ Tipografia Playfair Display 900 italic`);
    console.log(`   ✓ Texto Montserrat uppercase`);
    console.log(`   ✓ Linhas pontilhadas na mandíbula`);
    console.log(`   ✓ Glow layer atrás dos rostos`);
    console.log(`   ✓ Vignette radial`);
    console.log(`   ✓ Cores #f5f0eb (títulos) e #d6ba9e (ouro)`);

  } catch (error) {
    console.error('❌ Erro durante renderização:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

renderStories().catch(console.error);
