#!/usr/bin/env node
/**
 * Cria o Google Spreadsheet do Dr. Humberto Andrade para o dashboard.
 * Retorna spreadsheetId e GIDs de cada aba.
 */
'use strict';
process.chdir('/home/synkra/meu-aios');

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { google } = require('googleapis');

const CLIENT_ID     = process.env.GOOGLE_DRIVE_CLIENT_ID     || process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_DOCS_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error('Credenciais Google ausentes no .env');
  process.exit(1);
}

function getAuth() {
  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  auth.setCredentials({ refresh_token: REFRESH_TOKEN });
  return auth;
}

const TABS = [
  'Segurança',
  'conversas',
  'oportunidades',
  'metaads',
  'queries',
  'googleads',
  'googleadskeywords',
  'leadscoring',
  'Meta',
];

async function main() {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() });

  console.log('Criando spreadsheet Dr. Humberto Andrade...');

  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: 'Dashboard — Dr. Humberto Andrade (Syra Digital)' },
      sheets: TABS.map(title => ({ properties: { title } })),
    },
  });

  const spreadsheetId = res.data.spreadsheetId;
  console.log('\n✅ Spreadsheet criado!');
  console.log('URL:', `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
  console.log('ID:', spreadsheetId);
  console.log('\nGIDs por aba:');

  const gids = {};
  for (const sheet of res.data.sheets) {
    const title = sheet.properties.title;
    const gid = sheet.properties.sheetId;
    gids[title] = gid;
    console.log(`  ${title}: ${gid}`);
  }

  // Adicionar cabeçalho na aba Segurança
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Segurança!A1:C1',
    valueInputOption: 'RAW',
    requestBody: { values: [['Nome', 'E-mail', 'Senha']] },
  });
  console.log('\n✅ Cabeçalho adicionado na aba Segurança');

  // Adicionar cabeçalho na aba Meta (para sync time)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Meta!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [['last_sync']] },
  });
  console.log('✅ Cabeçalho adicionado na aba Meta');

  console.log('\n=== COPIE ESTES VALORES PARA sheetsApi.ts ===');
  console.log(`const SPREADSHEET_ID = '${spreadsheetId}';`);
  console.log('const SHEET_GIDS: Record<string, number> = {');
  console.log(`  conversas: ${gids['conversas']},`);
  console.log(`  oportunidades: ${gids['oportunidades']},`);
  console.log(`  metaads: ${gids['metaads']},`);
  console.log(`  queries: ${gids['queries']},`);
  console.log(`  googleads: ${gids['googleads']},`);
  console.log(`  googleadskeywords: ${gids['googleadskeywords']},`);
  console.log(`  leadscoring: ${gids['leadscoring']},`);
  console.log('};');
  console.log(`\nSECURITY_GID (Segurança): ${gids['Segurança']}`);
  console.log(`SPREADSHEET_ID: ${spreadsheetId}`);

  return { spreadsheetId, gids };
}

main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
