const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const parentEnv = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(parentEnv)) dotenv.config({ path: parentEnv });
const localEnv = path.resolve(__dirname, '.env');
if (fs.existsSync(localEnv)) dotenv.config({ path: localEnv, override: true });

const ghlAPI = require('./lib/ghl-api');

async function main() {
  const r = await ghlAPI.getConversations({ limit: 10, sortBy: 'last_message_date', sortOrder: 'desc' });
  if (r.success === false) {
    console.log('ERRO:', r.error);
    return;
  }

  const types = new Set();
  for (const c of r.data) {
    types.add(c.type);
    console.log(
      'TYPE:', JSON.stringify(c.type),
      '| NAME:', (c.contactName || c.fullName || '?').substring(0, 30),
      '| lastDir:', c.lastMessageDirection,
      '| lastType:', c.lastMessageType
    );
  }
  console.log('\nTipos unicos encontrados:', [...types]);
}

main().catch(console.error);
