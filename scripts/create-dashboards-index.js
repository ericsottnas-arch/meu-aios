#!/usr/bin/env node
/**
 * Cria planilha índice com todos os dashboards Syra Digital.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { google } = require('googleapis');

const CLIENT_ID     = process.env.GOOGLE_DRIVE_CLIENT_ID     || process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_DOCS_REFRESH_TOKEN;

function getAuth() {
  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  auth.setCredentials({ refresh_token: REFRESH_TOKEN });
  return auth;
}

// Pasta "Syra Digital / 02. Comercial" — onde faz sentido colocar índice interno
// Ou pasta raiz da Syra Digital
const SYRA_DIGITAL_FOLDER = '1ml12C1gX9jWQ-ReGpg739FMgs2RHBHct';

const DASHBOARDS = [
  {
    cliente:    'Syra Digital (Agência)',
    url:        'https://dashboard.syradigital.com',
    codebase:   'dashboards/syra-agency',
    spreadsheet: 'https://docs.google.com/spreadsheets/d/1YhNggN18IecxJ0BllMO_D2IqSjwqF0xs2j-oP5TaZxw',
    status:     'Live ✅',
    notas:      'Pipeline comercial da agência. Sync: sync-syra-agency-sheet.js',
  },
  {
    cliente:    'Dr. Erico Servano',
    url:        'https://servanoadvogados.syradigital.com',
    codebase:   'dashboards/servano',
    spreadsheet: 'https://docs.google.com/spreadsheets/d/1Br8Fg23cMKwLEjP8dbsz2DRIjwPoRSNoDu47SoX2FW0',
    status:     'Live ✅',
    notas:      'Meta Ads + Google Ads + GHL. Custos fixos: R$3.744/mês',
  },
  {
    cliente:    'Dra. Gabrielle Oliveira',
    url:        'https://gabrielle.syradigital.com',
    codebase:   'dashboards/gabrielle',
    spreadsheet: 'https://docs.google.com/spreadsheets/d/1EtgCOs2DuucNJVh-mGWmJ-RQk9chHfrw2QKuy7Z9dlU',
    status:     'Live ✅',
    notas:      'Apenas Meta Ads + GHL. Custos fixos: R$1.447/mês. Attribution.ts centralizado.',
  },
  {
    cliente:    'Dr. Humberto Andrade',
    url:        'https://humberto.syradigital.com',
    codebase:   'dashboards/humberto',
    spreadsheet: 'https://docs.google.com/spreadsheets/d/1AsrleT9tPS8vO5TMcZtcYyV5Ol1GAbpgH8B2rdqalco',
    status:     'Pendente deploy ⏳',
    notas:      'Build pronto. Aguardando deploy VPS + domínio + Supabase auth. Custos fixos: R$4.847/mês',
  },
  {
    cliente:    'Dr. Enio Leite',
    url:        '—',
    codebase:   '—',
    spreadsheet: 'https://docs.google.com/spreadsheets/d/1QxAB4HFOINWWWiyXB_B0f63VDv3aEzjkvW7IhES5Qsg',
    status:     'Sem dashboard ❌',
    notas:      'Planilha criada. Dashboard frontend não iniciado.',
  },
  {
    cliente:    'Dr. Cleugo Porto',
    url:        '—',
    codebase:   '—',
    spreadsheet: 'https://docs.google.com/spreadsheets/d/1wQI46mhN1kkUuGQDH7XbdF9dEksJSUZ9XbYQeZ5CrAc',
    status:     'Sem dashboard ❌',
    notas:      'Planilha criada. Dashboard frontend não iniciado.',
  },
];

async function main() {
  const auth    = getAuth();
  const drive   = google.drive({ version: 'v3', auth });
  const sheets  = google.sheets({ version: 'v4', auth });

  // Criar planilha
  const file = await drive.files.create({
    requestBody: {
      name: '📊 Índice de Dashboards — Syra Digital',
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [SYRA_DIGITAL_FOLDER],
    },
    fields: 'id',
  });
  const sheetId = file.data.id;

  // Cabeçalho + dados
  const header = ['Cliente', 'URL Dashboard', 'Codebase (VPS)', 'Planilha de Dados', 'Status', 'Notas'];
  const rows = DASHBOARDS.map(d => [
    d.cliente, d.url, d.codebase, d.spreadsheet, d.status, d.notas,
  ]);

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [header, ...rows] },
  });

  // Formatação: negrito no header, largura das colunas
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [
        // Negrito cabeçalho
        {
          repeatCell: {
            range: { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 },
            cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.1, green: 0.1, blue: 0.1 } } },
            fields: 'userEnteredFormat(textFormat,backgroundColor)',
          },
        },
        // Largura coluna A (cliente)
        { updateDimensionProperties: { range: { dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 200 }, fields: 'pixelSize' } },
        // Largura coluna B (url)
        { updateDimensionProperties: { range: { dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 280 }, fields: 'pixelSize' } },
        // Largura coluna C (codebase)
        { updateDimensionProperties: { range: { dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },
        // Largura coluna D (sheet)
        { updateDimensionProperties: { range: { dimension: 'COLUMNS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 320 }, fields: 'pixelSize' } },
        // Largura coluna E (status)
        { updateDimensionProperties: { range: { dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
        // Largura coluna F (notas)
        { updateDimensionProperties: { range: { dimension: 'COLUMNS', startIndex: 5, endIndex: 6 }, properties: { pixelSize: 380 }, fields: 'pixelSize' } },
        // Freeze header
        { updateSheetProperties: { properties: { gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
      ],
    },
  });

  // Compartilhar (qualquer pessoa com o link pode editar)
  await drive.permissions.create({
    fileId: sheetId,
    requestBody: { role: 'writer', type: 'anyone' },
  });

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
  console.log('✅ Planilha criada:', url);
  console.log('   ID:', sheetId);
}

main().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
