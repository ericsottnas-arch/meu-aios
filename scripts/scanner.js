#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const monitor = process.argv[2] || '1';
const screenshotDir = path.join(process.env.HOME, '.claude', 'screenshots');

// Criar diretório se não existir
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const filename = `screenshot_monitor${monitor}_${timestamp}.png`;
const filepath = path.join(screenshotDir, filename);

try {
  // Executar screencapture
  execSync(`screencapture -x -D ${monitor} "${filepath}"`, {
    stdio: 'pipe',
  });
  console.log(`✅ Screenshot salvo: ${filepath}`);
} catch (error) {
  console.error(`❌ Erro ao capturar screenshot do monitor ${monitor}`);
  console.error('Monitores disponíveis:', '\n');
  try {
    const info = execSync('system_profiler SPDisplaysDataType | grep "Resolution:"', {
      encoding: 'utf-8',
    });
    console.error(info);
  } catch (e) {
    console.error('Não foi possível listar monitores');
  }
  process.exit(1);
}
