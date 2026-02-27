require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');

async function checkSheets() {
  const serviceAccount = JSON.parse(fs.readFileSync('./google-service-account.json'));
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1Br8Fg23cMKwLEjP8dbsz2DRIjwPoRSNoDu47SoX2FW0';

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Meta Ads'!A1:Z3",
    });

    const rows = response.data.values;
    console.log('📋 PRIMEIRAS 3 LINHAS DO GOOGLE SHEETS:\n');

    // Headers
    console.log('HEADERS (26 colunas esperadas):');
    const headers = rows[0];
    console.log(`Total: ${headers.length} colunas\n`);
    headers.forEach((h, idx) => {
      console.log(`  ${idx+1}. ${h || '(VAZIA)'}`);
    });

    // Primeira data row
    if (rows.length > 1) {
      console.log('\n\nDados da PRIMEIRA campanha/dia:');
      const firstData = rows[1];
      let filledCount = 0;
      let emptyCount = 0;
      headers.forEach((h, idx) => {
        const value = firstData[idx];
        const isEmpty = value === undefined || value === '' || value === 0 || value === null;
        if (!isEmpty) filledCount++;
        else emptyCount++;
        console.log(`  ${String(idx+1).padStart(2, ' ')}. ${(h || `Col ${idx+1}`).padEnd(50, ' ')} : ${String(value || '(VAZIA)').substring(0, 30)}`);
      });
      console.log(`\n✅ Colunas preenchidas: ${filledCount}`);
      console.log(`❌ Colunas vazias: ${emptyCount}`);
    }
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

checkSheets();
