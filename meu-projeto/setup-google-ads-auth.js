#!/usr/bin/env node
/**
 * Setup de autenticacao OAuth2 para Google Ads API.
 * Gera refresh_token e salva no .env.
 *
 * Uso: node setup-google-ads-auth.js
 *
 * Pre-requisitos:
 *   1. Criar projeto no Google Cloud Console (ou usar existente)
 *   2. Habilitar "Google Ads API" no projeto
 *   3. Criar credenciais OAuth2 (tipo "Desktop App")
 *   4. Copiar client_id e client_secret
 *   5. Obter Developer Token no Google Ads UI → Ferramentas → Centro de API
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const readline = require('readline');

const ENV_PATH = path.resolve(__dirname, '.env');
const REDIRECT_PORT = 3089;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

// Scopes necessarios para leitura + escrita no Google Ads
const SCOPES = 'https://www.googleapis.com/auth/adwords';

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function appendToEnv(key, value) {
  let envContent = '';
  if (fs.existsSync(ENV_PATH)) {
    envContent = fs.readFileSync(ENV_PATH, 'utf-8');
  }

  // Substituir se ja existe, senao adicionar
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    envContent += `\n${key}=${value}`;
  }

  fs.writeFileSync(ENV_PATH, envContent.trimStart(), 'utf-8');
}

async function exchangeCodeForTokens(clientId, clientSecret, code) {
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`OAuth2 token exchange failed: ${data.error} - ${data.error_description}`);
  }
  return data;
}

async function main() {
  console.log('=== Google Ads API - Setup de Autenticacao ===\n');

  // 1. Pedir credenciais
  const clientId = await ask('Client ID (OAuth2): ');
  const clientSecret = await ask('Client Secret (OAuth2): ');
  const developerToken = await ask('Developer Token (Google Ads API): ');
  const loginCustomerId = await ask('MCC Customer ID (sem hifens, ex: 1234567890): ');

  if (!clientId || !clientSecret || !developerToken) {
    console.error('Todas as credenciais sao obrigatorias.');
    process.exit(1);
  }

  // 2. Gerar URL de autorizacao
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  console.log('\n1. Abra esta URL no browser:\n');
  console.log(authUrl.toString());
  console.log('\n2. Faca login e autorize o acesso.');
  console.log('3. Voce sera redirecionado para localhost. Aguardando...\n');

  // 3. Iniciar servidor local para capturar o callback
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);

      if (url.pathname === '/oauth2callback') {
        const authCode = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1>Erro: ${error}</h1><p>Tente novamente.</p>`);
          server.close();
          reject(new Error(`OAuth2 error: ${error}`));
          return;
        }

        if (authCode) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>Autorizado!</h1><p>Pode fechar esta aba. Voltando ao terminal...</p>');
          server.close();
          resolve(authCode);
        }
      }
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`Servidor OAuth2 escutando em http://localhost:${REDIRECT_PORT}...`);
    });

    // Timeout de 5 minutos
    setTimeout(() => {
      server.close();
      reject(new Error('Timeout: autorizacao nao completada em 5 minutos.'));
    }, 5 * 60 * 1000);
  });

  console.log('Codigo de autorizacao recebido. Trocando por tokens...\n');

  // 4. Trocar code por tokens
  const tokens = await exchangeCodeForTokens(clientId, clientSecret, code);

  console.log('Tokens obtidos com sucesso!');
  console.log(`  Access Token: ${tokens.access_token?.substring(0, 20)}...`);
  console.log(`  Refresh Token: ${tokens.refresh_token?.substring(0, 20)}...`);
  console.log(`  Expires in: ${tokens.expires_in}s\n`);

  // 5. Salvar no .env
  appendToEnv('GOOGLE_ADS_CLIENT_ID', clientId);
  appendToEnv('GOOGLE_ADS_CLIENT_SECRET', clientSecret);
  appendToEnv('GOOGLE_ADS_DEVELOPER_TOKEN', developerToken);
  appendToEnv('GOOGLE_ADS_REFRESH_TOKEN', tokens.refresh_token);
  if (loginCustomerId) {
    appendToEnv('GOOGLE_ADS_LOGIN_CUSTOMER_ID', loginCustomerId);
  }

  console.log(`Variaveis salvas em ${ENV_PATH}:`);
  console.log('  GOOGLE_ADS_CLIENT_ID');
  console.log('  GOOGLE_ADS_CLIENT_SECRET');
  console.log('  GOOGLE_ADS_DEVELOPER_TOKEN');
  console.log('  GOOGLE_ADS_REFRESH_TOKEN');
  if (loginCustomerId) console.log('  GOOGLE_ADS_LOGIN_CUSTOMER_ID');

  console.log('\nSetup completo! Agora configure o googleCustomerId do cliente em data/celo-clients.json.');
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
