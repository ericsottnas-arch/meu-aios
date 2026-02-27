require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');

async function analyze() {
  const serviceAccount = JSON.parse(fs.readFileSync('./google-service-account.json'));
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1Br8Fg23cMKwLEjP8dbsz2DRIjwPoRSNoDu47SoX2FW0';

  try {
    // Listar todas as abas
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetTitles = spreadsheet.data.sheets.map(s => s.properties.title);

    console.log('📊 ABAS DISPONÍVEIS NA PLANILHA:\n');
    sheetTitles.forEach((title, idx) => {
      console.log(`  ${idx + 1}. ${title}`);
    });

    // Ler cada aba e mostrar estrutura
    for (const title of sheetTitles) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`\n📋 ABA: "${title}"\n`);

      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `'${title}'!A1:Z100`,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
          console.log('(Aba vazia)');
          continue;
        }

        // Headers
        const headers = rows[0];
        console.log(`Headers (${headers.length} colunas):`);
        headers.forEach((h, idx) => {
          console.log(`  ${String(idx + 1).padStart(2)} | ${h}`);
        });

        // Primeiras 5 linhas de dados
        console.log(`\nPrimeiras ${Math.min(5, rows.length - 1)} linhas de dados:\n`);

        const dataRows = rows.slice(1, Math.min(6, rows.length));
        dataRows.forEach((row, rowIdx) => {
          console.log(`Row ${rowIdx + 1}:`);
          headers.forEach((header, colIdx) => {
            const value = row[colIdx];
            if (value !== undefined && value !== '') {
              const displayValue = String(value).substring(0, 50);
              console.log(`  ${header}: ${displayValue}`);
            }
          });
          console.log('');
        });

        // Estatísticas
        const totalRows = rows.length - 1;
        const totalCols = headers.length;
        console.log(`Estatísticas: ${totalRows} linhas × ${totalCols} colunas`);

      } catch (err) {
        console.log(`Erro ao ler: ${err.message}`);
      }
    }

  } catch (err) {
    console.error('Erro:', err.message);
  }
}

analyze();
