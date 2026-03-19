// api/form/sdr-cleugo.js — Vercel Serverless Function for SDR form → Google Sheets
// Supports partial saves (each field change updates the row) and final submit
const { google } = require('googleapis');

const SPREADSHEET_ID = '1KvqNaZwzOxBjcop1gn7ppNYgs8scqalFhIaYUtQaPhw';
const SHEET_NAME = 'Respostas';

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

// Columns: A=timestamp, B-AG=fields (32), AH=status, AI=session_id, AJ=last_field
const STATUS_COL = FIELDS.length + 1; // 0-indexed after timestamp
const SESSION_COL = FIELDS.length + 2;
const LAST_FIELD_COL = FIELDS.length + 3;

const ALEX_BOT_TOKEN = process.env.ALEX_BOT_TOKEN;
const ALEX_CHAT_ID = process.env.ALEX_CHAT_ID;

async function notifyTelegram(data) {
  if (!ALEX_BOT_TOKEN || !ALEX_CHAT_ID) return;
  const nome = data.nome || 'Sem nome';
  const email = data.email || '-';
  const whatsapp = data.whatsapp || '-';
  const cidade = data.cidade || '-';
  const text = `📋 *Nova candidatura SDR — Dr. Cleugo Porto*\n\n👤 *Nome:* ${nome}\n📧 *Email:* ${email}\n📱 *WhatsApp:* ${whatsapp}\n📍 *Cidade:* ${cidade}\n\n✅ Formulário completo. Verifique a planilha.`;
  try {
    await fetch(`https://api.telegram.org/bot${ALEX_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ALEX_CHAT_ID, text, parse_mode: 'Markdown' })
    });
  } catch (e) { console.error('Telegram notify error:', e.message); }
}

let _sheets = null;

async function getSheets() {
  if (_sheets) return _sheets;
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  _sheets = google.sheets({ version: 'v4', auth });
  return _sheets;
}

async function findSessionRow(sheets, sessionId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:AJ`,
  });
  const rows = res.data.values || [];
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i][SESSION_COL] === sessionId) return i + 1; // 1-indexed for Sheets
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = req.body;
    const sheets = await getSheets();
    const sessionId = data._session_id || '';
    const isFinal = data._final === true;
    const lastField = data._last_field || '';
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const status = isFinal ? 'COMPLETO' : 'PARCIAL';

    const row = [
      timestamp,
      ...FIELDS.map(f => data[f] || ''),
      status,
      sessionId,
      lastField
    ];

    // Try to find existing row for this session
    let existingRow = null;
    if (sessionId) {
      existingRow = await findSessionRow(sheets, sessionId);
    }

    if (existingRow) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A${existingRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [row] }
      });
    } else {
      // Create new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [row] }
      });
    }

    // Notify Telegram on final submit
    if (isFinal) {
      await notifyTelegram(data);
    }

    return res.status(200).json({ ok: true, timestamp });
  } catch (error) {
    console.error('Form submission error:', error.message);
    return res.status(500).json({ error: 'Erro ao salvar resposta' });
  }
};
