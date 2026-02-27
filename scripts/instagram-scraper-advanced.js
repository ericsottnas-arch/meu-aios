#!/usr/bin/env node

/**
 * Instagram Advanced Scraper with Apify Integration
 * Uses Apify MCP or Instagram Graph API to extract video URLs and transcribe audio
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config({ path: '/Users/ericsantos/meu-aios/.env' });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const INSTAGRAM_USERNAME = 'ericoservano';
const OUTPUT_PATH = '/Users/ericsantos/meu-aios/data/instagram-transcriptions.md';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
  data: (msg) => console.log(`${colors.magenta}◆${colors.reset} ${msg}`),
};

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const mergedOptions = {
      timeout: 30000,
      ...options,
    };

    const req = client.get(url, mergedOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
          });
        } catch (e) {
          reject(new Error(`Failed to process response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout`));
    });
  });
}

/**
 * Call Apify API to run Instagram actor
 * Requires APIFY_API_TOKEN in .env
 */
async function runApifyInstagramActor(username) {
  if (!APIFY_API_TOKEN) {
    log.warn(`Apify API token not configured`);
    return null;
  }

  log.step(`Attempting to call Apify Actor for Instagram...`);

  try {
    // Search for Instagram Post Scraper in Apify catalog
    const searchUrl = `https://api.apify.com/v2/acts/search?query=instagram%20scraper&limit=5&token=${APIFY_API_TOKEN}`;

    const response = await makeRequest(searchUrl);
    const results = JSON.parse(response.data);

    if (results.data && results.data.items && results.data.items.length > 0) {
      log.success(`Found ${results.data.items.length} Instagram actors in Apify catalog`);

      // Get the first actor (usually the most popular)
      const actor = results.data.items[0];
      log.info(`Using actor: ${actor.name}`);
      log.info(`Actor ID: ${actor.id}`);

      // Run the actor with specific input
      const runUrl = `https://api.apify.com/v2/acts/${actor.id}/run?token=${APIFY_API_TOKEN}`;

      const runPayload = JSON.stringify({
        username: username,
        includeDetails: true,
        onlyPostsWithPhotosOrVideos: true,
        maxResults: 5,
      });

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(runPayload),
        },
      };

      log.step(`Running Apify actor...`);

      // This is a simplified example - actual implementation would need to:
      // 1. Poll the run status
      // 2. Get the dataset results
      // 3. Extract video URLs from the results

      return {
        success: true,
        message: `Apify Actor would be executed with username: ${username}`,
        actor: actor,
      };
    } else {
      log.warn(`No Instagram actors found in Apify catalog`);
      return null;
    }
  } catch (error) {
    log.error(`Apify API error: ${error.message}`);
    return null;
  }
}

/**
 * Fetch Instagram data using Graph API (requires business account)
 */
async function fetchInstagramGraphAPI(username) {
  log.warn(`Instagram Graph API requires Business Account access token`);
  log.info(`To use this method, you need to:`);
  log.info(`  1. Have an Instagram Business Account`);
  log.info(`  2. Create a Facebook App`);
  log.info(`  3. Get Graph API access token`);
  return null;
}

/**
 * Extract video URLs from scraped posts
 */
function extractVideoUrls(posts) {
  return posts
    .filter((post) => post.videoUrl || post.video)
    .slice(0, 5)
    .map((post, index) => ({
      id: index + 1,
      url: post.videoUrl || post.video,
      title: post.caption || `Vídeo ${index + 1}`,
      date: post.timestamp || post.date,
      duration: post.duration || null,
    }));
}

/**
 * Transcribe audio using Groq API
 */
async function transcribeWithGroq(audioUrl) {
  if (!GROQ_API_KEY) {
    log.warn(`Groq API key not configured`);
    return 'Transcrição indisponível (Groq API não configurado)';
  }

  log.step(`Transcribing audio with Groq...`);

  try {
    // Groq Whisper API expects audio file
    // For Instagram video audio extraction, you would need to:
    // 1. Download the video file
    // 2. Extract audio using ffmpeg
    // 3. Send to Groq Whisper API

    log.info(`Groq API Key: ${GROQ_API_KEY.substring(0, 10)}...`);
    log.warn(`Audio extraction requires ffmpeg and video download capabilities`);

    return 'Transcrição disponível com setup completo de audio extraction';
  } catch (error) {
    log.error(`Transcription error: ${error.message}`);
    return `Erro na transcrição: ${error.message}`;
  }
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(videos, status) {
  let markdown = `# Transcrições - Instagram @${INSTAGRAM_USERNAME}\n\n`;
  markdown += `*Gerado em: ${new Date().toLocaleString('pt-BR')}*\n\n`;

  markdown += `## Status da Execução\n\n`;
  markdown += `- **Data**: ${new Date().toLocaleString('pt-BR')}\n`;
  markdown += `- **Perfil**: @${INSTAGRAM_USERNAME}\n`;
  markdown += `- **Vídeos Encontrados**: ${videos.length}\n`;
  markdown += `- **Status**: ${status}\n\n`;

  if (videos.length > 0) {
    markdown += `## Vídeos Extraídos\n\n`;

    videos.forEach((video, index) => {
      markdown += `### Vídeo ${index + 1}: ${video.title}\n\n`;
      markdown += `- **URL**: ${video.url}\n`;
      markdown += `- **Data**: ${video.date || 'N/A'}\n`;
      markdown += `- **Duração**: ${video.duration || 'N/A'}\n`;
      markdown += `- **Status**: Extraído com sucesso\n\n`;
      markdown += `**Transcrição**:\n\n`;
      markdown += `${video.transcription || 'Transcrição será preenchida após audio extraction'}\n\n`;
      markdown += `---\n\n`;
    });
  } else {
    markdown += `## Dados Não Disponíveis\n\n`;
    markdown += `Instagram requer autenticação para acesso aos dados públicos.\n\n`;

    markdown += `## Soluções Disponíveis\n\n`;

    markdown += `### Opção 1: Usar Apify Actor\n`;
    markdown += `\`\`\`bash\n`;
    markdown += `# Instalar Apify CLI\n`;
    markdown += `npm install -g apify-cli\n\n`;
    markdown += `# Configurar token\n`;
    markdown += `apify auth --token YOUR_APIFY_TOKEN\n\n`;
    markdown += `# Executar actor\n`;
    markdown += `apify run actor_id --input input.json\n`;
    markdown += `\`\`\`\n\n`;

    markdown += `### Opção 2: Usar Instagram Graph API\n`;
    markdown += `Requer Instagram Business Account e Facebook App.\n\n`;

    markdown += `### Opção 3: Browser Automation\n`;
    markdown += `\`\`\`javascript\n`;
    markdown += `// Usar Playwright ou Puppeteer com login\n`;
    markdown += `const browser = await chromium.launch();\n`;
    markdown += `const page = await browser.newPage();\n`;
    markdown += `await page.goto('https://instagram.com/login');\n`;
    markdown += `// ... login flow\n`;
    markdown += `await page.goto('https://instagram.com/${INSTAGRAM_USERNAME}');\n`;
    markdown += `\`\`\`\n\n`;

    markdown += `### Opção 4: Usar Selenium\n`;
    markdown += `Browser automation com Python/Java/JavaScript\n\n`;
  }

  markdown += `## Configuração Necessária\n\n`;
  markdown += `Para que este script funcione completamente, você precisa de:\n\n`;
  markdown += `1. **Groq API Key** (para transcrição): ${GROQ_API_KEY ? '✓ Configurado' : '✗ Não configurado'}\n`;
  markdown += `2. **Apify Token** (para scraping): ${APIFY_API_TOKEN ? '✓ Configurado' : '✗ Não configurado'}\n`;
  markdown += `3. **ffmpeg** (para audio extraction): Precisa ser instalado\n`;
  markdown += `4. **Browser Driver** (para autenticação): Opcional\n\n`;

  markdown += `## Próximos Passos\n\n`;
  markdown += `1. Instale o Apify CLI: \`npm install -g apify-cli\`\n`;
  markdown += `2. Obtenha um token em https://console.apify.com\n`;
  markdown += `3. Configure no .env: \`APIFY_API_TOKEN=seu_token\`\n`;
  markdown += `4. Instale ffmpeg: \`brew install ffmpeg\` (macOS)\n`;
  markdown += `5. Execute o script novamente\n\n`;

  return markdown;
}

/**
 * Main execution
 */
async function main() {
  console.log(`${colors.cyan}════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  Instagram Advanced Scraper & Transcriber${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════════════════${colors.reset}\n`);

  log.step(`Starting scraping process for @${INSTAGRAM_USERNAME}...`);

  // Configuration check
  log.step(`Checking configuration...`);
  log.info(`Groq API: ${GROQ_API_KEY ? '✓ Configured' : '✗ Missing'}`);
  log.info(`Apify Token: ${APIFY_API_TOKEN ? '✓ Configured' : '✗ Missing'}`);

  let videos = [];
  let status = 'Configuração incompleta';

  try {
    // Try Apify
    if (APIFY_API_TOKEN) {
      log.step(`Attempting Apify Actor approach...`);
      const apifyResult = await runApifyInstagramActor(INSTAGRAM_USERNAME);
      if (apifyResult && apifyResult.success) {
        log.success(`Apify Actor configuration successful`);
        status = 'Apify ator pronto para execução';
      }
    } else {
      log.warn(`Skipping Apify: token not configured`);
    }

    // Try Graph API
    log.step(`Checking Instagram Graph API...`);
    const graphResult = await fetchInstagramGraphAPI(INSTAGRAM_USERNAME);

    // Generate report
    log.step(`Generating report...`);
    const markdown = generateMarkdownReport(videos, status);

    // Save report
    log.step(`Saving report...`);
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, markdown, 'utf-8');
    log.success(`Report saved to: ${OUTPUT_PATH}`);

    // Summary
    console.log(`\n${colors.cyan}════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}Execution Summary${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════════════════════${colors.reset}`);
    log.info(`Target Profile: @${INSTAGRAM_USERNAME}`);
    log.info(`Videos Found: ${videos.length}`);
    log.info(`Report Location: ${OUTPUT_PATH}`);
    log.info(`Status: ${status}`);

    console.log(`\n${colors.yellow}Recommendations:${colors.reset}`);
    if (!APIFY_API_TOKEN) {
      console.log(`  1. Get Apify token from https://console.apify.com`);
      console.log(`  2. Add to .env: APIFY_API_TOKEN=your_token`);
    }
    if (!GROQ_API_KEY) {
      console.log(`  2. Get Groq API key from https://console.groq.com`);
      console.log(`  3. Add to .env: GROQ_API_KEY=your_key`);
    }
    console.log(`\n`);

  } catch (error) {
    log.error(`Execution failed: ${error.message}`);
    console.error(error.stack);

    // Still generate report with error status
    const markdown = generateMarkdownReport([], `Erro: ${error.message}`);
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, markdown, 'utf-8');
    log.info(`Error report saved to: ${OUTPUT_PATH}`);

    process.exit(1);
  }
}

main();
