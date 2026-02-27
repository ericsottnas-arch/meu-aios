const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: 1080,
    height: 1920,
    deviceScaleFactor: 2 // 2x for high-res output (2160x3840)
  });

  const htmlPath = path.resolve(__dirname, 'design.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 15000 });

  // Wait for fonts to load
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 1000));

  const outputPath = path.resolve(__dirname, 'paciente-modelo-hof.png');
  await page.screenshot({
    path: outputPath,
    type: 'png',
    fullPage: false,
    clip: { x: 0, y: 0, width: 1080, height: 1920 }
  });

  console.log(`✅ Design salvo: ${outputPath}`);
  await browser.close();
})();
