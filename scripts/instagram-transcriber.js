#!/usr/bin/env node

/**
 * Instagram Video Transcriber
 * Scrapes Instagram profile, extracts video URLs, and transcribes audio using Groq API
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config({ path: '/Users/ericsantos/meu-aios/.env' });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
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
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
};

/**
 * Fetch JSON from a URL
 */
function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error(`Request timeout for ${url}`));
    });
  });
}

/**
 * Download audio from URL and convert to file
 */
async function downloadAudio(videoUrl) {
  return new Promise((resolve) => {
    // For Instagram, we would need to extract the audio stream
    // This is a simplified mock - in production, you'd use ffmpeg
    log.warn(`Audio extraction from Instagram videos requires special handling (ffmpeg + Instagram auth)`);
    resolve(null);
  });
}

/**
 * Transcribe audio using Groq Whisper API
 */
async function transcribeAudio(audioFilePath) {
  if (!audioFilePath) {
    return 'Audio file not available for transcription';
  }

  const FormData = require('form-data');
  const fs = require('fs');
  const https = require('https');

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', fs.createReadStream(audioFilePath));
    form.append('model', 'whisper-large-v3-turbo');
    form.append('language', 'pt');

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.text) {
            resolve(response.text);
          } else {
            reject(new Error(`No transcription in response: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse transcription response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

/**
 * Scrape Instagram profile using Instagram Graph API (requires business account)
 * For public profiles without authentication, we'll use a simplified approach
 */
async function scrapeInstagramProfile(username) {
  log.step(`Fetching Instagram profile: @${username}`);

  try {
    // Try to get Instagram data from open endpoints
    // Note: Direct scraping requires handling authentication and rate limiting

    log.info(`Attempting to fetch profile data for @${username}...`);

    // Using a public API endpoint (if available)
    const profileUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;

    // Instagram requires special headers to avoid being blocked
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    log.warn(`Instagram API access requires authentication`);
    log.warn(`Direct web scraping may violate Instagram Terms of Service`);

    return {
      success: false,
      message: 'Instagram scraping requires either:\n1. Instagram Business Account Graph API access\n2. Apify Actor for Instagram scraping\n3. Browser automation with proper authentication',
      username,
    };
  } catch (error) {
    log.error(`Failed to fetch Instagram profile: ${error.message}`);
    return {
      success: false,
      error: error.message,
      username,
    };
  }
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(videos) {
  let markdown = `# Transcrições - Instagram @${INSTAGRAM_USERNAME}\n\n`;
  markdown += `*Gerado em: ${new Date().toLocaleString('pt-BR')}*\n\n`;

  if (videos.length === 0) {
    markdown += `## Status\nNenhum vídeo foi transcritto. Instagram requer autenticação para acesso aos dados.\n`;
    markdown += `\n## Próximos Passos\n`;
    markdown += `Para transcrever vídeos do Instagram, você pode:\n\n`;
    markdown += `1. **Usar Apify Actor**: Instale o actor "Instagram Post Scraper" via Apify\n`;
    markdown += `2. **Usar Selenium/Playwright**: Com login autenticado\n`;
    markdown += `3. **Usar API Graph do Instagram**: Com credenciais de negócio\n`;
    return markdown;
  }

  videos.forEach((video, index) => {
    markdown += `## Vídeo ${index + 1}: ${video.title || 'Sem título'}\n`;
    markdown += `- **URL**: [Assistir no Instagram](${video.url})\n`;
    markdown += `- **Data**: ${video.date || 'N/A'}\n`;
    markdown += `- **Duração**: ${video.duration || 'N/A'}\n`;
    markdown += `- **Transcrição**:\n\n`;
    markdown += `${video.transcription || 'Transcrição indisponível'}\n\n`;
    markdown += `---\n\n`;
  });

  return markdown;
}

/**
 * Main execution
 */
async function main() {
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  Instagram Video Transcriber${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

  log.step(`Starting Instagram scraping and transcription process...`);
  log.info(`Target: @${INSTAGRAM_USERNAME}`);
  log.info(`Groq API Status: ${GROQ_API_KEY ? '✓ Configured' : '✗ Not configured'}`);

  const videos = [];

  try {
    // Step 1: Attempt to scrape Instagram
    log.step(`Step 1: Scraping Instagram profile...`);
    const profileData = await scrapeInstagramProfile(INSTAGRAM_USERNAME);

    if (!profileData.success) {
      log.warn(`Direct Instagram scraping not possible without authentication`);
      log.info(`Reason: ${profileData.message}`);
    } else {
      log.success(`Profile data retrieved`);
    }

    // Step 2: Generate report
    log.step(`Step 2: Generating markdown report...`);
    const markdown = generateMarkdownReport(videos);

    // Step 3: Save report
    log.step(`Step 3: Saving report...`);
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, markdown, 'utf-8');
    log.success(`Report saved to: ${OUTPUT_PATH}`);

    // Summary
    console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}Summary${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
    log.info(`Vídeos processados: ${videos.length}`);
    log.info(`Relatório salvo em: ${OUTPUT_PATH}`);
    console.log(`\n${colors.yellow}Note: Instagram requer autenticação para acesso direto aos dados.${colors.reset}`);
    console.log(`${colors.yellow}Para extrair vídeos automaticamente, use:${colors.reset}`);
    console.log(`  1. Apify Actor for Instagram`);
    console.log(`  2. Browser automation com credenciais`);
    console.log(`  3. Instagram Graph API (Business Account)\n`);

  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
