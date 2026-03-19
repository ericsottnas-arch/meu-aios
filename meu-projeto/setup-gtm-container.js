#!/usr/bin/env node
/**
 * Configura Google Tag Manager via API para o site ericoservano.com.br
 *
 * Cria:
 *   1. Container GTM (web)
 *   2. Variável built-in: History Change
 *   3. Trigger: Page View em /obrigado (History Change)
 *   4. Tag: Google Ads Conversion no /obrigado
 *   5. Tag: Event personalizado (se quiser Meta Pixel, etc.)
 *   6. Publica o container
 *
 * Uso: node setup-gtm-container.js
 *
 * Pré-requisitos:
 *   - Rodar setup-gtm-auth.js primeiro (gera GTM_REFRESH_TOKEN)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GTM_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error('Variáveis necessárias no .env:');
  console.error('  GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GTM_REFRESH_TOKEN');
  console.error('\nRode setup-gtm-auth.js primeiro.');
  process.exit(1);
}

const GTM_API = 'https://www.googleapis.com/tagmanager/v2';

let accessToken = null;

async function getAccessToken() {
  if (accessToken) return accessToken;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Token refresh failed: ${data.error} - ${data.error_description}`);
  accessToken = data.access_token;
  return accessToken;
}

async function gtmRequest(method, endpoint, body = null) {
  const token = await getAccessToken();
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${GTM_API}${endpoint}`, opts);
  const data = await res.json();

  if (data.error) {
    throw new Error(`GTM API error (${method} ${endpoint}): ${data.error.message}`);
  }
  return data;
}

async function main() {
  console.log('=== Google Tag Manager - Setup Automático ===\n');

  // 1. Listar contas GTM
  console.log('1. Buscando contas GTM...');
  const accounts = await gtmRequest('GET', '/accounts');

  if (!accounts.account || accounts.account.length === 0) {
    console.error('Nenhuma conta GTM encontrada. Crie uma em tagmanager.google.com');
    process.exit(1);
  }

  const account = accounts.account[0];
  console.log(`   Conta: ${account.name} (${account.accountId})\n`);

  // 2. Criar container para ericoservano.com.br
  console.log('2. Criando container "ericoservano.com.br"...');
  let container;
  try {
    container = await gtmRequest('POST', `/${account.path}/containers`, {
      name: 'ericoservano.com.br',
      usageContext: ['web'],
      domainName: ['ericoservano.com.br'],
      notes: 'Criado automaticamente via Synkra AIOS',
    });
    console.log(`   Container criado: ${container.containerId}`);
    console.log(`   GTM ID: ${container.publicId}\n`);
  } catch (err) {
    // Se já existe, listar containers e encontrar
    console.log('   Container pode já existir, buscando...');
    const containers = await gtmRequest('GET', `/${account.path}/containers`);
    container = containers.container?.find(c => c.name === 'ericoservano.com.br');
    if (!container) {
      // Usar o primeiro disponível ou criar com nome diferente
      console.error('   Erro ao criar container:', err.message);
      process.exit(1);
    }
    console.log(`   Container existente encontrado: ${container.publicId}\n`);
  }

  // 3. Obter workspace padrão
  console.log('3. Obtendo workspace...');
  const workspaces = await gtmRequest('GET', `/${container.path}/workspaces`);
  const workspace = workspaces.workspace[0];
  console.log(`   Workspace: ${workspace.name}\n`);

  // 4. Habilitar variáveis built-in (Page Path, History Source, etc.)
  console.log('4. Habilitando variáveis built-in...');
  try {
    await gtmRequest('POST', `/${workspace.path}/built_in_variables`, null);
  } catch (e) {
    // Pode já estar habilitado
  }

  // Habilitar as variáveis necessárias via query params
  const builtInVarsEndpoint = `/${workspace.path}/built_in_variables?type=PAGE_PATH&type=PAGE_URL&type=PAGE_HOSTNAME&type=NEW_HISTORY_FRAGMENT&type=OLD_HISTORY_FRAGMENT&type=NEW_HISTORY_STATE&type=OLD_HISTORY_STATE&type=HISTORY_SOURCE&type=EVENT`;
  try {
    await gtmRequest('POST', builtInVarsEndpoint);
    console.log('   Variáveis built-in habilitadas (Page Path, History, Event)\n');
  } catch (e) {
    console.log('   Variáveis built-in já habilitadas ou erro (continuando...)\n');
  }

  // 5. Criar trigger: History Change em /obrigado
  console.log('5. Criando trigger "Página Obrigado (History Change)"...');
  const trigger = await gtmRequest('POST', `/${workspace.path}/triggers`, {
    name: 'Página Obrigado - History Change',
    type: 'historyChange',
    filter: [
      {
        type: 'equals',
        parameter: [
          { type: 'template', key: 'arg0', value: '{{Page Path}}' },
          { type: 'template', key: 'arg1', value: '/obrigado' },
        ],
      },
    ],
  });
  console.log(`   Trigger criado: ${trigger.triggerId}\n`);

  // 6. Criar trigger: Page View em /obrigado (caso acesse direto)
  console.log('6. Criando trigger "Página Obrigado (Page View direto)"...');
  const triggerPageView = await gtmRequest('POST', `/${workspace.path}/triggers`, {
    name: 'Página Obrigado - Page View',
    type: 'pageview',
    filter: [
      {
        type: 'equals',
        parameter: [
          { type: 'template', key: 'arg0', value: '{{Page Path}}' },
          { type: 'template', key: 'arg1', value: '/obrigado' },
        ],
      },
    ],
  });
  console.log(`   Trigger criado: ${triggerPageView.triggerId}\n`);

  // 7. Criar tag: Google Ads Conversion
  console.log('7. Criando tag "Google Ads Conversion - Obrigado"...');
  const conversionTag = await gtmRequest('POST', `/${workspace.path}/tags`, {
    name: 'Google Ads Conversion - Obrigado',
    type: 'awct', // Google Ads Conversion Tracking
    parameter: [
      { type: 'template', key: 'conversionId', value: 'AW-18020120284' },
      { type: 'template', key: 'conversionLabel', value: 'PREENCHER_LABEL' }, // Eric precisa fornecer
      { type: 'boolean', key: 'enableConversionLinker', value: 'true' },
    ],
    firingTriggerId: [trigger.triggerId, triggerPageView.triggerId],
  });
  console.log(`   Tag criada: ${conversionTag.tagId}`);
  console.log('   ⚠️  ATENÇÃO: Substitua "PREENCHER_LABEL" pelo conversion label real do Google Ads\n');

  // 8. Criar tag: Conversion Linker (necessário para Google Ads)
  console.log('8. Criando tag "Conversion Linker"...');
  const linkerTag = await gtmRequest('POST', `/${workspace.path}/tags`, {
    name: 'Conversion Linker',
    type: 'gclidw', // Conversion Linker
    parameter: [
      { type: 'boolean', key: 'enableCrossDomain', value: 'false' },
    ],
    firingTriggerId: ['2147479553'], // All Pages trigger (built-in)
  });
  console.log(`   Tag criada: ${linkerTag.tagId}\n`);

  // 9. Criar tag: Evento personalizado (dataLayer) para qualquer outro tracking
  console.log('9. Criando tag "Custom Event - Lead Obrigado"...');
  const eventTag = await gtmRequest('POST', `/${workspace.path}/tags`, {
    name: 'Custom Event - Lead Obrigado',
    type: 'html', // Custom HTML
    parameter: [
      {
        type: 'template',
        key: 'html',
        value: `<script>
  // Evento disparado quando usuário chega em /obrigado
  console.log('[GTM] Conversão registrada: Lead - Página Obrigado');

  // Se tiver Meta Pixel, descomente:
  // fbq('track', 'Lead');

  // Se tiver outro tracking, adicione aqui
</script>`,
      },
    ],
    firingTriggerId: [trigger.triggerId, triggerPageView.triggerId],
  });
  console.log(`   Tag criada: ${eventTag.tagId}\n`);

  // 10. Publicar
  console.log('10. Publicando container...');
  try {
    const version = await gtmRequest('POST', `/${workspace.path}:create_version`, {
      name: 'v1 - Setup inicial com tracking /obrigado',
      notes: 'Configurado automaticamente via Synkra AIOS.\nInclui: Google Ads Conversion + History Change trigger para SPA.',
    });

    if (version.containerVersion) {
      // Publicar a versão criada
      const versionPath = version.containerVersion.path;
      await gtmRequest('POST', `/${versionPath}:publish`);
      console.log('   Container PUBLICADO com sucesso!\n');
    } else if (version.compilerError) {
      console.log('   Erros de compilação encontrados:');
      version.compilerError.forEach(err => console.log(`   - ${err.message}`));
      console.log('   Container salvo mas NÃO publicado. Corrija os erros no GTM.\n');
    }
  } catch (err) {
    console.log(`   Erro ao publicar: ${err.message}`);
    console.log('   Container criado com sucesso, mas precisa publicar manualmente no GTM.\n');
  }

  // Resumo final
  console.log('═══════════════════════════════════════════');
  console.log('           SETUP COMPLETO!');
  console.log('═══════════════════════════════════════════');
  console.log(`GTM Container ID: ${container.publicId}`);
  console.log(`Site: ericoservano.com.br`);
  console.log('');
  console.log('Snippet para o <head> do index.html:');
  console.log('─────────────────────────────────────');
  console.log(`<!-- Google Tag Manager -->`);
  console.log(`<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':`);
  console.log(`new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],`);
  console.log(`j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=`);
  console.log(`'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);`);
  console.log(`})(window,document,'script','dataLayer','${container.publicId}');</script>`);
  console.log(`<!-- End Google Tag Manager -->`);
  console.log('');
  console.log('Snippet para o <body> (após abertura):');
  console.log('──────────────────────────────────────');
  console.log(`<!-- Google Tag Manager (noscript) -->`);
  console.log(`<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${container.publicId}"`);
  console.log(`height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`);
  console.log(`<!-- End Google Tag Manager (noscript) -->`);
  console.log('');
  console.log('PRÓXIMOS PASSOS:');
  console.log('  1. Substituir o GTM antigo (GTM-5ZQ3FBF2) no index.html pelo novo snippet acima');
  console.log('  2. Colocar o conversion label correto do Google Ads na tag');
  console.log('  3. Subir o index.html atualizado na Hostinger');
  console.log('  4. Testar em ericoservano.com.br/obrigado');

  // Salvar GTM ID no .env
  const ENV_PATH = path.resolve(__dirname, '.env');
  let envContent = fs.readFileSync(ENV_PATH, 'utf-8');
  const gtmRegex = /^GTM_CONTAINER_ID=.*$/m;
  if (gtmRegex.test(envContent)) {
    envContent = envContent.replace(gtmRegex, `GTM_CONTAINER_ID=${container.publicId}`);
  } else {
    envContent += `\nGTM_CONTAINER_ID=${container.publicId}`;
  }
  fs.writeFileSync(ENV_PATH, envContent, 'utf-8');
  console.log(`\nGTM_CONTAINER_ID=${container.publicId} salvo no .env`);
}

main().catch((err) => {
  console.error('\nErro:', err.message);
  process.exit(1);
});
