// lib/form-sheets.js — Google Sheets integration for SDR form
const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1KvqNaZwzOxBjcop1gn7ppNYgs8scqalFhIaYUtQaPhw';
const SHEET_NAME = 'Respostas';

let _sheets = null;

async function getSheets() {
  if (_sheets) return _sheets;
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH
      || path.resolve(__dirname, '..', 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  _sheets = google.sheets({ version: 'v4', auth });
  return _sheets;
}

// Field order must match spreadsheet headers exactly
const FIELDS = [
  'nome', 'email', 'whatsapp', 'cidade', 'nascimento',
  'linkedin', 'instagram', 'exp_vendas', 'exp_vendas_desc',
  'exp_saude', 'exp_saude_desc', 'crm_usado',
  'familiaridade_social', 'demora_responder', 'vou_pensar',
  'paciencia', 'conforto_desconhecidos', 'perfil_social',
  'cenario_1', 'cenario_2', 'cenario_4', 'cenario_5',
  'horario_comercial', 'mudar_sp', 'computador_internet',
  'pretensao_salarial', 'quando_comecar',
  'auto_comunicacao_escrita', 'auto_comunicacao_verbal',
  'auto_organizacao', 'auto_rejeicao',
  'porque_vaga'
];

async function appendFormData(data) {
  const sheets = await getSheets();
  const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const row = [timestamp, ...FIELDS.map(f => data[f] || '')];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });

  return { ok: true, timestamp };
}

module.exports = { appendFormData, SPREADSHEET_ID };
