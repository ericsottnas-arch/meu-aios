#!/usr/bin/env node
/**
 * Setup de autenticação OAuth2 para Google Tag Manager API.
 * Gera refresh_token e salva no .env.
 *
 * Uso: node setup-gtm-auth.js
 *
 * Pré-requisitos:
 *   1. Habilitar "Tag Manager API" no Google Cloud Console
 *   2. Usar o mesmo OAuth Client ID já existente (Desktop App)
 *
 * IMPORTANTE: Usa as mesmas credenciais do Celo (GOOGLE_ADS_CLIENT_ID/SECRET).
 * Apenas gera um refresh_token NOVO com scope de Tag Manager.
 * NÃO afeta os tokens existentes.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ENV_PATH = path.resolve(__dirname, '.env');
const REDIRECT_PORT = 3089;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

// Scopes para Tag Manager (criar containers, tags, triggers, publicar)
const SCOPES = [
  'https://www.googleapis.com/auth/tagmanager.edit.containers',
  'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
  'https://www.googleapis.com/auth/tagmanager.manage.accounts',
  'https://www.googleapis.com/auth/tagmanager.publish',
].join(' ');

function appendToEnv(key, value) {
  let envContent = '';
  if (fs.existsSync(ENV_PATH)) {
    envContent = fs.readFileSync(ENV_PATH, 'utf-8');
  }

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
  console.log('=== Google Tag Manager API - Setup de Autenticação ===\n');

  // Ler credenciais existentes do .env
  let clientId, clientSecret;
  if (fs.existsSync(ENV_PATH)) {
    const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
    clientId = envContent.match(/^GOOGLE_ADS_CLIENT_ID=(.*)$/m)?.[1];
    clientSecret = envContent.match(/^GOOGLE_ADS_CLIENT_SECRET=(.*)$/m)?.[1];
  }

  if (!clientId || !clientSecret) {
    console.error('GOOGLE_ADS_CLIENT_ID e GOOGLE_ADS_CLIENT_SECRET não encontrados no .env');
    console.error('Execute setup-google-ads-auth.js primeiro.');
    process.exit(1);
  }

  console.log(`Usando Client ID: ${clientId.substring(0, 20)}...`);
  console.log('(mesmo OAuth Client do Celo — tokens existentes NÃO serão afetados)\n');

  // Gerar URL de autorização
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  console.log('1. Abra esta URL no browser:\n');
  console.log(authUrl.toString());
  console.log('\n2. Faça login com a conta Google que tem acesso ao GTM.');
  console.log('3. Autorize o acesso. Aguardando callback...\n');

  // Servidor local para capturar callback
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
          res.end('<h1>GTM Autorizado!</h1><p>Pode fechar esta aba. Voltando ao terminal...</p>');
          server.close();
          resolve(authCode);
        }
      }
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`Servidor OAuth2 escutando em http://localhost:${REDIRECT_PORT}...`);
    });

    setTimeout(() => {
      server.close();
      reject(new Error('Timeout: autorização não completada em 5 minutos.'));
    }, 5 * 60 * 1000);
  });

  console.log('Código de autorização recebido. Trocando por tokens...\n');

  // Trocar code por tokens
  const tokens = await exchangeCodeForTokens(clientId, clientSecret, code);

  console.log('Tokens obtidos com sucesso!');
  console.log(`  Access Token: ${tokens.access_token?.substring(0, 20)}...`);
  console.log(`  Refresh Token: ${tokens.refresh_token?.substring(0, 20)}...`);
  console.log(`  Expires in: ${tokens.expires_in}s\n`);

  // Salvar no .env
  appendToEnv('GTM_REFRESH_TOKEN', tokens.refresh_token);

  console.log(`Variável salva em ${ENV_PATH}:`);
  console.log('  GTM_REFRESH_TOKEN');
  console.log('\nSetup completo! Agora rode: node setup-gtm-container.js');
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
