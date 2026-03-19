#!/usr/bin/env node
/**
 * Setup COMPLETO Google Ads API — automatiza:
 *   1. Habilitar Google Ads API no projeto GCP
 *   2. Configurar OAuth Consent Screen (se necessario)
 *   3. Criar credenciais OAuth2 (Desktop App)
 *   4. Gerar refresh token via OAuth2 flow
 *   5. Salvar tudo no .env
 *
 * Usa a service account existente para passos 1-3.
 * Passo 4 requer login interativo do Eric no browser.
 */

const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { execSync } = require('child_process');

const SA_KEY_PATH = path.resolve(__dirname, 'google-service-account.json');
const ENV_PATH = path.resolve(__dirname, '.env');
const PROJECT_ID = 'gen-lang-client-0088431713';
const REDIRECT_PORT = 3089;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;
const SCOPES = ['https://www.googleapis.com/auth/adwords'];

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

async function getAuthClient() {
  const auth = new GoogleAuth({
    keyFile: SA_KEY_PATH,
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/service.management',
    ],
  });
  return auth.getClient();
}

// ============================================================
// PASSO 1: Habilitar Google Ads API
// ============================================================
async function enableGoogleAdsApi(authClient) {
  console.log('\n[1/5] Habilitando Google Ads API...');

  const serviceUsage = google.serviceusage({ version: 'v1', auth: authClient });

  try {
    const res = await serviceUsage.services.enable({
      name: `projects/${PROJECT_ID}/services/googleads.googleapis.com`,
    });
    console.log('  ✅ Google Ads API habilitada.');
    return true;
  } catch (err) {
    if (err.message?.includes('already enabled') || err.code === 409) {
      console.log('  ✅ Google Ads API ja estava habilitada.');
      return true;
    }
    // Service account pode nao ter permissao para habilitar APIs
    if (err.code === 403) {
      console.log('  ⚠️  Service account sem permissao para habilitar APIs.');
      console.log('     Tentando via REST direto...');
      return await enableGoogleAdsApiRest(authClient);
    }
    console.error('  ❌ Erro:', err.message);
    return false;
  }
}

async function enableGoogleAdsApiRest(authClient) {
  try {
    const token = await authClient.getAccessToken();
    const res = await fetch(
      `https://serviceusage.googleapis.com/v1/projects/${PROJECT_ID}/services/googleads.googleapis.com:enable`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.token || token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const data = await res.json();
    if (res.ok || data.name) {
      console.log('  ✅ Google Ads API habilitada via REST.');
      return true;
    }
    console.log('  ⚠️  Resposta:', JSON.stringify(data).substring(0, 200));
    return false;
  } catch (err) {
    console.error('  ❌ Erro REST:', err.message);
    return false;
  }
}

// ============================================================
// PASSO 2: Configurar OAuth Consent Screen
// ============================================================
async function configureOAuthConsent(authClient) {
  console.log('\n[2/5] Verificando OAuth Consent Screen...');

  try {
    const token = await authClient.getAccessToken();
    const accessToken = token.token || token;

    // Check existing brand
    const checkRes = await fetch(
      `https://iap.googleapis.com/v1/projects/${PROJECT_ID}/brands`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const checkData = await checkRes.json();

    if (checkData.brands?.length > 0) {
      console.log('  ✅ OAuth Consent Screen ja configurado.');
      return true;
    }

    // Tentar criar
    const createRes = await fetch(
      `https://iap.googleapis.com/v1/projects/${PROJECT_ID}/brands`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationTitle: 'Celo - Google Ads Manager',
          supportEmail: 'ericsottnas@gmail.com',
        }),
      }
    );
    const createData = await createRes.json();
    if (createRes.ok || createData.name) {
      console.log('  ✅ OAuth Consent Screen criado.');
      return true;
    }
    console.log('  ⚠️  Pode precisar ser configurado manualmente.');
    console.log('     Continuando mesmo assim...');
    return true; // Continua, pode ja existir via Cloud Console
  } catch (err) {
    console.log('  ⚠️  Nao foi possivel verificar:', err.message);
    return true; // Continua
  }
}

// ============================================================
// PASSO 3: Criar credenciais OAuth2
// ============================================================
async function createOAuth2Credentials(authClient) {
  console.log('\n[3/5] Criando credenciais OAuth2 (Desktop App)...');

  try {
    const token = await authClient.getAccessToken();
    const accessToken = token.token || token;

    // Listar credenciais existentes para ver se ja tem
    const listRes = await fetch(
      `https://oauth2.googleapis.com/v1/projects/${PROJECT_ID}/oauthClients?pageSize=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // Tentar via Cloud Resource Manager / Credentials API
    // A forma mais confiavel e via projects.oauthClients
    const createRes = await fetch(
      `https://oauth2.googleapis.com/v1/projects/${PROJECT_ID}/oauthClients`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: 'Celo Google Ads',
          allowedGrantTypes: ['AUTHORIZATION_CODE_GRANT'],
          allowedRedirectUris: [REDIRECT_URI],
          allowedScopes: SCOPES,
        }),
      }
    );

    if (createRes.ok) {
      const data = await createRes.json();
      console.log('  ✅ Credenciais OAuth2 criadas via API.');
      return { clientId: data.clientId, clientSecret: data.clientSecret };
    }

    // Se a API nao funcionar, tentar via googleapis
    console.log('  Tentando via googleapis SDK...');
    return await createOAuth2ViaSDK(authClient);
  } catch (err) {
    console.log('  Tentando via googleapis SDK...', err.message);
    return await createOAuth2ViaSDK(authClient);
  }
}

async function createOAuth2ViaSDK(authClient) {
  try {
    const service = google.iap({ version: 'v1', auth: authClient });

    // Primeiro buscar a brand
    const brandRes = await service.projects.brands.list({
      parent: `projects/${PROJECT_ID}`,
    });
    const brands = brandRes.data.brands || [];

    let brandName;
    if (brands.length > 0) {
      brandName = brands[0].name;
    } else {
      // Criar brand
      const newBrand = await service.projects.brands.create({
        parent: `projects/${PROJECT_ID}`,
        requestBody: {
          applicationTitle: 'Celo Google Ads',
          supportEmail: 'ericsottnas@gmail.com',
        },
      });
      brandName = newBrand.data.name;
    }

    // Criar OAuth2 client via IAP
    const clientRes = await service.projects.brands.identityAwareProxyClients.create({
      parent: brandName,
      requestBody: {
        displayName: 'Celo Google Ads Desktop',
      },
    });

    if (clientRes.data) {
      console.log('  ✅ Credenciais criadas via IAP SDK.');
      return {
        clientId: clientRes.data.name?.split('/').pop(),
        clientSecret: clientRes.data.secret,
      };
    }
  } catch (err) {
    console.log('  ⚠️  SDK tambem nao funcionou:', err.message?.substring(0, 100));
  }

  return null;
}

// ============================================================
// PASSO 4: Gerar Refresh Token
// ============================================================
async function generateRefreshToken(clientId, clientSecret) {
  console.log('\n[4/5] Gerando refresh token...');
  console.log('  Abrindo browser para autorizacao...\n');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  const urlStr = authUrl.toString();

  // Abrir no browser
  try {
    execSync(`open "${urlStr}"`);
    console.log('  Browser aberto. Faca login e autorize.\n');
  } catch {
    console.log('  Abra manualmente:', urlStr, '\n');
  }

  // Servidor local para capturar callback
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      if (url.pathname === '/oauth2callback') {
        const authCode = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1>Erro: ${error}</h1>`);
          server.close();
          reject(new Error(error));
          return;
        }
        if (authCode) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>✅ Autorizado!</h1><p>Pode fechar esta aba.</p>');
          server.close();
          resolve(authCode);
        }
      }
    });
    server.listen(REDIRECT_PORT);
    setTimeout(() => { server.close(); reject(new Error('Timeout 5min')); }, 300000);
  });

  // Trocar code por tokens
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error) throw new Error(`Token error: ${tokenData.error} - ${tokenData.error_description}`);

  console.log('  ✅ Refresh token obtido.');
  return tokenData.refresh_token;
}

// ============================================================
// PASSO 5: Salvar no .env
// ============================================================
function saveToEnv(clientId, clientSecret, refreshToken, developerToken, loginCustomerId) {
  console.log('\n[5/5] Salvando no .env...');
  appendToEnv('GOOGLE_ADS_CLIENT_ID', clientId);
  appendToEnv('GOOGLE_ADS_CLIENT_SECRET', clientSecret);
  appendToEnv('GOOGLE_ADS_REFRESH_TOKEN', refreshToken);
  if (developerToken) appendToEnv('GOOGLE_ADS_DEVELOPER_TOKEN', developerToken);
  if (loginCustomerId) appendToEnv('GOOGLE_ADS_LOGIN_CUSTOMER_ID', loginCustomerId);
  console.log('  ✅ Variaveis salvas.');
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('=== Setup Completo Google Ads API ===');
  console.log(`Projeto: ${PROJECT_ID}\n`);

  const authClient = await getAuthClient();

  // Passo 1
  await enableGoogleAdsApi(authClient);

  // Passo 2
  await configureOAuthConsent(authClient);

  // Passo 3: criar credenciais
  let credentials = await createOAuth2Credentials(authClient);

  if (!credentials) {
    console.log('\n  ⚠️  Nao consegui criar credenciais automaticamente.');
    console.log('  Isso acontece quando a service account nao tem permissao.');
    console.log('  Vou abrir o Google Cloud Console para voce criar manualmente.\n');

    // Abrir Cloud Console
    const credUrl = `https://console.cloud.google.com/apis/credentials/oauthclient?project=${PROJECT_ID}`;
    try { execSync(`open "${credUrl}"`); } catch {}

    console.log('  Instrucoes:');
    console.log('    1. Tipo: "App para computador" (Desktop App)');
    console.log('    2. Nome: "Celo Google Ads"');
    console.log('    3. Clique Criar');
    console.log('    4. Copie Client ID e Client Secret');

    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise(r => { rl.question(q, a => { r(a.trim()); }); });

    const clientId = await ask('\nClient ID: ');
    const clientSecret = await ask('Client Secret: ');
    rl.close();
    credentials = { clientId, clientSecret };
  }

  // Passo 4: refresh token
  const refreshToken = await generateRefreshToken(credentials.clientId, credentials.clientSecret);

  // Developer token - precisa ser coletado do Google Ads UI
  console.log('\n--- Developer Token ---');
  console.log('Abrindo Google Ads para voce copiar o Developer Token...');
  try { execSync('open "https://ads.google.com/aw/apicenter"'); } catch {}

  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(r => { rl.question(q, a => { r(a.trim()); }); });

  const devToken = await ask('Developer Token (copie do Google Ads → Centro de API): ');
  const mccId = await ask('MCC Customer ID (sem hifens, ex: 1234567890): ');
  rl.close();

  // Passo 5: salvar
  saveToEnv(credentials.clientId, credentials.clientSecret, refreshToken, devToken, mccId);

  console.log('\n=== Setup completo! ===');
  console.log('Agora preencha googleCustomerId no data/celo-clients.json');
}

main().catch(err => {
  console.error('\nErro fatal:', err.message);
  process.exit(1);
});
