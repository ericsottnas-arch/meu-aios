/**
 * Contacts Database — SQLite para gestão de contatos
 * Relaciona pessoas (stakeholders, equipe, parceiros) com clientes
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '..', 'contacts.db');

let db;

function getDb() {
  if (db) return db;
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Criar tabelas
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      instagram TEXT,
      role TEXT DEFAULT 'contact',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS client_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL,
      client_key TEXT NOT NULL,
      client_name TEXT NOT NULL,
      role_at_client TEXT DEFAULT 'team',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
      UNIQUE(contact_id, client_key)
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
    CREATE INDEX IF NOT EXISTS idx_client_contacts_key ON client_contacts(client_key);
  `);

  // Migração: adicionar coluna instagram se não existe (DBs criados antes desta versão)
  try {
    db.prepare('SELECT instagram FROM contacts LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE contacts ADD COLUMN instagram TEXT');
    console.log('[contacts-db] Migração: coluna instagram adicionada');
  }

  return db;
}

/**
 * Adiciona um contato
 * @param {{ name: string, email?: string, phone?: string, instagram?: string, role?: string, notes?: string }} contact
 * @returns {{ id: number, created: boolean }}
 */
function addContact({ name, email, phone, instagram, role, notes }) {
  const d = getDb();

  // Checar se já existe por email ou nome exato
  if (email) {
    const existing = d.prepare('SELECT id FROM contacts WHERE email = ? COLLATE NOCASE').get(email);
    if (existing) {
      // Atualizar dados
      d.prepare('UPDATE contacts SET name = ?, phone = COALESCE(?, phone), instagram = COALESCE(?, instagram), role = COALESCE(?, role), notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(name, phone, instagram, role, notes, existing.id);
      return { id: existing.id, created: false };
    }
  }

  // Checar se já existe por nome (match case-insensitive)
  const normName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const cleanedName = normName.replace(/^(dr|dra|prof)\s*\.?\s*/i, '');
  const existingByName = d.prepare(`
    SELECT id FROM contacts
    WHERE LOWER(REPLACE(REPLACE(REPLACE(name, 'Dr. ', ''), 'Dra. ', ''), 'Prof. ', '')) LIKE ?
    OR LOWER(name) LIKE ?
    LIMIT 1
  `).get(`%${cleanedName}%`, `%${cleanedName}%`);

  if (existingByName) {
    // Atualizar dados existentes (só atualiza campos não-nulos)
    d.prepare('UPDATE contacts SET email = COALESCE(?, email), phone = COALESCE(?, phone), instagram = COALESCE(?, instagram), role = COALESCE(?, role), notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(email, phone, instagram, role, notes, existingByName.id);
    return { id: existingByName.id, created: false };
  }

  const result = d.prepare('INSERT INTO contacts (name, email, phone, instagram, role, notes) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, email || null, phone || null, instagram || null, role || 'contact', notes || null);

  return { id: result.lastInsertRowid, created: true };
}

/**
 * Atualiza instagram de um contato por nome
 * @param {string} name
 * @param {string} instagram
 * @returns {boolean}
 */
function updateInstagram(name, instagram) {
  const d = getDb();
  const results = findByName(name);
  if (results.length === 0) return false;
  d.prepare('UPDATE contacts SET instagram = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(instagram, results[0].id);
  return true;
}

/**
 * Vincula um contato a um cliente
 * @param {number} contactId
 * @param {string} clientKey - ex: 'dr-erico-servano'
 * @param {string} clientName - ex: 'Dr. Erico Servano'
 * @param {string} [roleAtClient] - ex: 'secretária', 'sócio', 'gerente'
 */
function linkContactToClient(contactId, clientKey, clientName, roleAtClient) {
  const d = getDb();
  try {
    d.prepare('INSERT OR REPLACE INTO client_contacts (contact_id, client_key, client_name, role_at_client) VALUES (?, ?, ?, ?)')
      .run(contactId, clientKey, clientName, roleAtClient || 'team');
  } catch (err) {
    console.error('Error linking contact to client:', err.message);
  }
}

/**
 * Busca contato por nome (match parcial, case-insensitive)
 * @param {string} name
 * @returns {Array<{ id, name, email, phone, role, clients: string }>}
 */
function findByName(name) {
  const d = getDb();
  const norm = `%${name}%`;
  // Também buscar sem prefixo Dr./Dra.
  const cleaned = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^(dr|dra|prof)\s*\.?\s*/i, '').trim();
  const contacts = d.prepare(`
    SELECT c.id, c.name, c.email, c.phone, c.instagram, c.role, c.notes,
           GROUP_CONCAT(cc.client_name || ' (' || cc.role_at_client || ')', ', ') as clients
    FROM contacts c
    LEFT JOIN client_contacts cc ON cc.contact_id = c.id
    WHERE c.name LIKE ? COLLATE NOCASE
       OR c.name LIKE ? COLLATE NOCASE
    GROUP BY c.id
    ORDER BY c.name
  `).all(norm, `%${cleaned}%`);
  return contacts;
}

/**
 * Busca contato por email exato
 * @param {string} email
 * @returns {Object|null}
 */
function findByEmail(email) {
  const d = getDb();
  return d.prepare(`
    SELECT c.id, c.name, c.email, c.phone, c.role,
           GROUP_CONCAT(cc.client_name, ', ') as clients
    FROM contacts c
    LEFT JOIN client_contacts cc ON cc.contact_id = c.id
    WHERE c.email = ? COLLATE NOCASE
    GROUP BY c.id
  `).get(email) || null;
}

/**
 * Lista todos os contatos de um cliente
 * @param {string} clientKey
 * @returns {Array}
 */
function getClientContacts(clientKey) {
  const d = getDb();
  return d.prepare(`
    SELECT c.id, c.name, c.email, c.phone, c.role, cc.role_at_client
    FROM contacts c
    JOIN client_contacts cc ON cc.contact_id = c.id
    WHERE cc.client_key = ?
    ORDER BY c.name
  `).all(clientKey);
}

/**
 * Lista todos os contatos
 * @returns {Array}
 */
function listAll() {
  const d = getDb();
  return d.prepare(`
    SELECT c.id, c.name, c.email, c.phone, c.role,
           GROUP_CONCAT(cc.client_name || ' (' || cc.role_at_client || ')', ', ') as clients
    FROM contacts c
    LEFT JOIN client_contacts cc ON cc.contact_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `).all();
}

/**
 * Busca email pelo nome (para uso no scheduling — retorna o melhor match)
 * @param {string} name
 * @returns {{ email: string, fullName: string } | null}
 */
function resolveEmail(name) {
  const d = getDb();
  const norm = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (norm.length < 2) return null;

  // 1. Match exato por nome (sem Dr./Dra.)
  const cleaned = norm.replace(/^(dr|dra|prof)\s*\.?\s*/i, '');
  let row = d.prepare(`
    SELECT name, email FROM contacts
    WHERE email IS NOT NULL
    AND (LOWER(name) = ? OR LOWER(REPLACE(REPLACE(REPLACE(name, 'Dr. ', ''), 'Dra. ', ''), 'Prof. ', '')) = ?)
    LIMIT 1
  `).get(norm, cleaned);
  if (row) return { email: row.email, fullName: row.name };

  // 2. Match parcial (contém o nome)
  row = d.prepare(`
    SELECT name, email FROM contacts
    WHERE email IS NOT NULL
    AND LOWER(name) LIKE ?
    LIMIT 1
  `).get(`%${cleaned}%`);
  if (row) return { email: row.email, fullName: row.name };

  return null;
}

/**
 * Remove um contato
 * @param {number} id
 */
function removeContact(id) {
  const d = getDb();
  d.prepare('DELETE FROM contacts WHERE id = ?').run(id);
}

/**
 * Importa contatos do CLIENTES-CONFIG.json (seed inicial)
 */
function seedFromClientConfig(configPath) {
  try {
    const fs = require('fs');
    if (!fs.existsSync(configPath)) return 0;

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    let count = 0;

    for (const [clientKey, client] of Object.entries(config.clients || {})) {
      if (!client.name) continue;
      const email = client.contact?.email && client.contact.email !== 'N/A' ? client.contact.email : null;
      const phone = client.contact?.phone || null;
      const instagram = client.contact?.instagram || null;
      // Importar TODOS os clientes (com ou sem email)
      const { id } = addContact({
        name: client.name,
        email,
        phone,
        instagram,
        role: 'client',
      });
      linkContactToClient(id, clientKey, client.name, 'stakeholder');
      count++;

      // Importar contatos extras se existirem
      if (Array.isArray(client.contacts)) {
        for (const c of client.contacts) {
          if (c.name) {
            const { id } = addContact({
              name: c.name,
              email: c.email,
              phone: c.phone,
              role: c.role || 'team',
            });
            linkContactToClient(id, clientKey, client.name, c.role || 'team');
            count++;
          }
        }
      }
    }

    return count;
  } catch (err) {
    console.error('Error seeding contacts:', err.message);
    return 0;
  }
}

module.exports = {
  getDb,
  addContact,
  updateInstagram,
  linkContactToClient,
  findByName,
  findByEmail,
  getClientContacts,
  listAll,
  resolveEmail,
  removeContact,
  seedFromClientConfig,
};
