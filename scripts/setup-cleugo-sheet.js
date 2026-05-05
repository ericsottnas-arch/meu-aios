#!/usr/bin/env node
/**
 * Setup planilha do Dr. Cleugo Porto:
 * Cria abas: Meta, Oportunidades, Conversas, LeadScoring, Usuarios, SyncHealth
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { google } = require('googleapis');

const CLIENT_ID     = process.env.GOOGLE_DRIVE_CLIENT_ID     || process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_DOCS_REFRESH_TOKEN;

const SPREADSHEET_ID = '1wQI46mhN1kkUuGQDH7XbdF9dEksJSUZ9XbYQeZ5CrAc';

function getAuth() {
  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  auth.setCredentials({ refresh_token: REFRESH_TOKEN });
  return auth;
}

async function main() {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() });
  const drive  = google.drive({ version: 'v3', auth: getAuth() });

  // Busca abas existentes
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingSheets = meta.data.sheets.map(s => ({ title: s.properties.title, gid: s.properties.sheetId }));
  console.log('Abas existentes:', existingSheets.map(s => s.title).join(', '));

  const needed = ['Meta', 'Oportunidades', 'Conversas', 'LeadScoring', 'Usuarios', 'SyncHealth'];
  const existingTitles = existingSheets.map(s => s.title);
  const toCreate = needed.filter(n => !existingTitles.includes(n));

  if (toCreate.length > 0) {
    console.log('Criando abas:', toCreate.join(', '));
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: toCreate.map(title => ({
          addSheet: { properties: { title } }
        }))
      }
    });
  } else {
    console.log('Todas as abas já existem.');
  }

  // Busca GIDs atualizados
  const updated = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const allSheets = updated.data.sheets.map(s => ({ title: s.properties.title, gid: s.properties.sheetId }));

  console.log('\n=== GIDs para sheetsApi.ts ===');
  for (const s of allSheets) {
    console.log(`  ${s.title}: ${s.gid}`);
  }

  // Adiciona cabeçalho na aba Usuarios
  const usuariosSheet = allSheets.find(s => s.title === 'Usuarios');
  if (usuariosSheet) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Usuarios!A1:C1',
      valueInputOption: 'RAW',
      requestBody: { values: [['email', 'senha', 'nome']] }
    });
    // Usuário padrão
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Usuarios!A:C',
      valueInputOption: 'RAW',
      requestBody: { values: [['mktsyra@gmail.com', 'Syra@123', 'Syra Digital']] }
    });
    console.log('\nUsuário padrão criado: mktsyra@gmail.com / Syra@123');
  }

  // Compartilhar com os dois usuários padrão (se ainda não feito)
  try {
    await drive.permissions.create({
      fileId: SPREADSHEET_ID,
      requestBody: { role: 'writer', type: 'user', emailAddress: 'mktsyra@gmail.com' },
      sendNotificationEmail: false,
    });
    await drive.permissions.create({
      fileId: SPREADSHEET_ID,
      requestBody: { role: 'writer', type: 'user', emailAddress: 'ericsottnas@gmail.com' },
      sendNotificationEmail: false,
    });
    // Acesso público de leitura para o frontend conseguir ler via CSV
    await drive.permissions.create({
      fileId: SPREADSHEET_ID,
      requestBody: { role: 'reader', type: 'anyone' },
    });
    console.log('Permissões configuradas.');
  } catch (e) {
    console.log('Permissões (já podem existir):', e.message);
  }

  return allSheets;
}

main().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
