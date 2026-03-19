const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureCarousel(shortcode, name, expectedSlides) {
  const dir = `/Users/ericsantos/meu-aios/.carousel-temp/_ref-analysis/${name}`;
  fs.mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 540, height: 675 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    await page.goto(`https://www.instagram.com/p/${shortcode}/embed/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Screenshot slide 1
    await page.screenshot({ path: path.join(dir, 'slide-01.png'), type: 'png' });
    console.log(`${name} slide 1 captured`);

    // Navigate through slides
    for (let i = 2; i <= expectedSlides; i++) {
      try {
        // Try multiple selectors for the next button
        const nextBtn = await page.$('button[aria-label="Next"]')
          || await page.$('.coreSpriteRightChevron')
          || await page.$('button._6CZji')
          || await page.$('div._6CZji')
          || await page.$('button[aria-label="Avançar"]')
          || await page.$('button[aria-label="Go Forward"]');

        if (!nextBtn) {
          // Try finding any right-side clickable element
          const buttons = await page.$$('button');
          let clicked = false;
          for (const btn of buttons) {
            const box = await btn.boundingBox();
            if (box && box.x > 300) { // right side of viewport
              await btn.click();
              clicked = true;
              break;
            }
          }
          if (!clicked) {
            // Try clicking right side of the image area
            await page.click('div.EmbeddedMediaImage, div.EmbedMedia, img', { position: { x: 480, y: 300 } }).catch(() => {});
          }
        } else {
          await nextBtn.click();
        }

        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(dir, `slide-${String(i).padStart(2, '0')}.png`), type: 'png' });
        console.log(`${name} slide ${i} captured`);
      } catch (e) {
        console.log(`${name} slide ${i} failed: ${e.message}`);
        // Still take a screenshot even if navigation failed
        await page.screenshot({ path: path.join(dir, `slide-${String(i).padStart(2, '0')}.png`), type: 'png' });
      }
    }
  } catch (e) {
    console.log(`${name} error: ${e.message}`);
  }

  await browser.close();
  console.log(`Done: ${name} — ${expectedSlides} slides`);
}

async function captureSingle(shortcode, name) {
  const dir = `/Users/ericsantos/meu-aios/.carousel-temp/_ref-analysis/${name}`;
  fs.mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 540, height: 675 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    await page.goto(`https://www.instagram.com/p/${shortcode}/embed/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(dir, 'slide-01.png'), type: 'png' });
    console.log(`${name} captured`);
  } catch (e) {
    console.log(`${name} error: ${e.message}`);
  }

  await browser.close();
  console.log(`Done: ${name}`);
}

async function main() {
  console.log('=== CAROUSELS ===');
  await captureCarousel('DVgUZlhDVET', 'keeta-ifood', 11);
  await captureCarousel('DVOxzJpkWb5', 'vendas-ia', 8);
  await captureCarousel('DU_T0VGiblh', 'mrbeast-step', 7);

  console.log('\n=== SINGLE POSTS ===');
  await captureSingle('DVhdVC-jSOI', 'toguro-rappi');
  await captureSingle('DVeQ6WHCYXH', 'neymar');
  await captureSingle('DVML3sBEU7H', 'subway-mcdonalds');
  await captureSingle('DVHCYVqCWwX', 'mcdonalds-rebranding');
  await captureSingle('DVPcUTLjfMp', 'branding-sem-logo');

  console.log('\n=== ALL DONE ===');
  // List all captured files
  const baseDir = '/Users/ericsantos/meu-aios/.carousel-temp/_ref-analysis';
  const dirs = fs.readdirSync(baseDir);
  for (const d of dirs) {
    const files = fs.readdirSync(path.join(baseDir, d));
    console.log(`${d}: ${files.length} files — ${files.join(', ')}`);
  }
}

main().catch(console.error);
