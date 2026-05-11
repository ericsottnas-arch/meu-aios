const path = require('path');
const { listFolder, readFileBinary } = require('../lib/drive');
const fs = require('fs');

const FOLDER_ID = '1umYozUzq8qV8hB1IaHUYpJEJZLj8wss7';

async function main() {
  const files = await listFolder(FOLDER_ID);
  console.log('Arquivos na pasta (' + files.length + '):');
  files.forEach(f => console.log(' ', f.name, '—', f.id));

  const target = files.find(f => f.name === 'Screenshot_25.png');
  if (!target) { console.log('Screenshot_25.png não encontrado'); return; }
  console.log('Baixando:', target.id);

  // Usa a API diretamente para download binário
  const { google } = require('googleapis');
  require('dotenv').config({ path: path.join(__dirname, '../meu-projeto/.env') });
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.GOOGLE_DOCS_REFRESH_TOKEN;
  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  auth.setCredentials({ refresh_token: REFRESH_TOKEN });
  const drive = google.drive({ version: 'v3', auth });

  const dest = fs.createWriteStream('/tmp/screenshot25.png');
  const res = await drive.files.get({ fileId: target.id, alt: 'media' }, { responseType: 'stream' });
  await new Promise((resolve, reject) => {
    res.data.pipe(dest);
    dest.on('finish', resolve);
    dest.on('error', reject);
  });
  console.log('ok');
}
main().catch(e => { console.error(e.message); process.exit(1); });
