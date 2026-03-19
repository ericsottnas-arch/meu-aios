/**
 * Drive Access Utility - Acesso centralizado ao Google Drive local (macOS)
 * Permite que qualquer agente consulte o Drive sem precisar de API
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const DRIVE_BASE = path.resolve(
  process.env.HOME,
  'Library/CloudStorage/GoogleDrive-ericsottnas@gmail.com/Meu Drive'
);

const CLIENTS_PATH = path.join(DRIVE_BASE, 'Syra Digital/Clientes');

/**
 * Lista todos os clientes no Drive
 */
function listClients() {
  try {
    const files = fs.readdirSync(CLIENTS_PATH, { withFileTypes: true });
    return files
      .filter(f => f.isDirectory() && !f.name.startsWith('.'))
      .map(f => f.name)
      .sort();
  } catch (err) {
    console.error(`Erro ao listar clientes:`, err.message);
    return [];
  }
}

/**
 * Obtém a estrutura de pastas de um cliente
 */
function getClientStructure(clientName) {
  try {
    const clientPath = path.join(CLIENTS_PATH, clientName);
    if (!fs.existsSync(clientPath)) {
      return null;
    }
    
    const files = fs.readdirSync(clientPath, { withFileTypes: true });
    return {
      name: clientName,
      path: clientPath,
      folders: files
        .filter(f => f.isDirectory() && !f.name.startsWith('.'))
        .map(f => ({
          name: f.name,
          path: path.join(clientPath, f.name),
          files: fs.readdirSync(path.join(clientPath, f.name))
            .filter(file => !file.startsWith('.'))
            .length
        }))
    };
  } catch (err) {
    console.error(`Erro ao obter estrutura:`, err.message);
    return null;
  }
}

/**
 * Lista arquivos em uma pasta específica do cliente
 */
function listClientFiles(clientName, folderName) {
  try {
    const folderPath = path.join(CLIENTS_PATH, clientName, folderName);
    if (!fs.existsSync(folderPath)) {
      return null;
    }
    
    return fs.readdirSync(folderPath)
      .filter(f => !f.startsWith('.'))
      .map(file => ({
        name: file,
        path: path.join(folderPath, file),
        isDir: fs.statSync(path.join(folderPath, file)).isDirectory()
      }));
  } catch (err) {
    console.error(`Erro ao listar arquivos:`, err.message);
    return null;
  }
}

/**
 * Lê conteúdo de um arquivo
 */
function readClientFile(clientName, folderName, fileName) {
  try {
    const filePath = path.join(CLIENTS_PATH, clientName, folderName, fileName);
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`Erro ao ler arquivo:`, err.message);
    return null;
  }
}

const CLIENT_SUBFOLDERS = [
  '🎨 Criativos',
  '📋 Documentação',
  '📄 Documentos',
  '📸 Imagens',
  '📊 Planilhas',
  '🎥 Vídeos',
];

/**
 * Cria pasta de cliente no Google Drive com 6 subpastas padrão.
 * Se já existir, retorna o path sem sobrescrever.
 * @param {string} clientName - Nome do cliente (ex: "Dra Bruna Nogueira")
 * @returns {{path: string, created: boolean, subfolders: string[]}}
 */
function createClientFolder(clientName) {
  const clientPath = path.join(CLIENTS_PATH, clientName);

  if (fs.existsSync(clientPath)) {
    return { path: clientPath, created: false, subfolders: CLIENT_SUBFOLDERS };
  }

  fs.mkdirSync(clientPath, { recursive: true });

  for (const folder of CLIENT_SUBFOLDERS) {
    fs.mkdirSync(path.join(clientPath, folder), { recursive: true });
  }

  return { path: clientPath, created: true, subfolders: CLIENT_SUBFOLDERS };
}

/**
 * Extrai o ID do Google Drive de uma pasta local via xattr (macOS Google Drive Desktop).
 * Aguarda até o sync completar (polling com retry).
 * @param {string} folderPath - Caminho local da pasta
 * @param {number} [maxWaitMs=15000] - Tempo máximo de espera em ms
 * @returns {Promise<string|null>} URL compartilhável ou null se timeout
 */
async function getDriveFolderLink(folderPath, maxWaitMs = 15000) {
  const { execSync } = require('child_process');
  const start = Date.now();
  const interval = 2000; // poll a cada 2s

  while (Date.now() - start < maxWaitMs) {
    try {
      const folderId = execSync(
        `xattr -p "com.google.drivefs.item-id#S" "${folderPath}" 2>/dev/null`,
        { encoding: 'utf-8', timeout: 5000 }
      ).trim();

      if (folderId && folderId.length > 10) {
        return `https://drive.google.com/drive/folders/${folderId}`;
      }
    } catch {
      // xattr ainda não disponível — Drive não sincronizou
    }

    await new Promise(r => setTimeout(r, interval));
  }

  return null;
}

// ============================================================
// Google Drive API (permissões via Service Account)
// ============================================================

let _driveApi = null;
let _docsApi = null;
let _googleAuth = null;

/**
 * Auth com OAuth2 do Eric (Drive + Docs) quando GOOGLE_DOCS_REFRESH_TOKEN disponível.
 * Fallback para Service Account (read-only em folders compartilhados).
 */
function getGoogleAuth() {
  if (_googleAuth) return _googleAuth;

  const refreshToken = process.env.GOOGLE_DOCS_REFRESH_TOKEN?.replace(/"/g, '');
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.replace(/"/g, '');
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET?.replace(/"/g, '');

  if (refreshToken && clientId && clientSecret) {
    // OAuth2 com conta do Eric — acesso total a Drive e Docs
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    _googleAuth = oauth2;
  } else {
    // Fallback: Service Account (read-only)
    const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_PATH
      || path.resolve(__dirname, '..', 'google-service-account.json');
    _googleAuth = new google.auth.GoogleAuth({
      keyFile,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/documents',
      ],
    });
  }
  return _googleAuth;
}

async function getDriveApi() {
  if (_driveApi) return _driveApi;
  _driveApi = google.drive({ version: 'v3', auth: getGoogleAuth() });
  return _driveApi;
}

async function getDocsApi() {
  if (_docsApi) return _docsApi;
  _docsApi = google.docs({ version: 'v1', auth: getGoogleAuth() });
  return _docsApi;
}

/**
 * Define permissão "Qualquer pessoa com o link pode editar" numa pasta do Drive.
 * Requer que o Service Account tenha acesso de Editor à pasta (ou seu parent).
 * @param {string} folderId - ID da pasta no Google Drive
 * @returns {Promise<string>} URL compartilhável
 */
async function shareFolderAsPublicEditor(folderId) {
  const drive = await getDriveApi();

  await drive.permissions.create({
    fileId: folderId,
    requestBody: {
      role: 'writer',
      type: 'anyone',
    },
  });

  return `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;
}

// ============================================================
// Google Docs nativo — criar e editar documentos
// ============================================================

/**
 * Cria um Google Doc nativo numa pasta do Drive.
 * @param {string} title - Título do documento
 * @param {string} markdownContent - Conteúdo em markdown para inserir
 * @param {string} folderId - ID da pasta no Drive (obtido via xattr ou hardcoded)
 * @returns {Promise<{docId: string, url: string, title: string}>}
 */
async function createGoogleDoc(title, markdownContent, folderId) {
  const drive = await getDriveApi();
  const docs = await getDocsApi();

  // 1. Criar documento vazio
  const docRes = await docs.documents.create({
    requestBody: { title },
  });
  const docId = docRes.data.documentId;

  // 2. Mover para a pasta correta
  if (folderId) {
    await drive.files.update({
      fileId: docId,
      addParents: folderId,
      removeParents: 'root',
      fields: 'id, parents',
    });
  }

  // 3. Inserir conteúdo formatado
  if (markdownContent) {
    await insertMarkdownToDoc(docId, markdownContent);
  }

  return {
    docId,
    url: `https://docs.google.com/document/d/${docId}/edit`,
    title,
  };
}

/**
 * Adiciona conteúdo markdown ao final de um Google Doc existente.
 * @param {string} docId - ID do documento
 * @param {string} markdownContent - Conteúdo em markdown
 */
async function appendToGoogleDoc(docId, markdownContent) {
  const docs = await getDocsApi();

  // Pegar o endIndex atual do body
  const doc = await docs.documents.get({ documentId: docId });
  const endIndex = doc.data.body.content.slice(-1)[0]?.endIndex || 1;

  // Inserir separador + conteúdo
  const fullContent = '\n\n' + markdownContent;
  await insertMarkdownToDoc(docId, fullContent, endIndex - 1);
}

/**
 * Converte markdown básico em requests do Google Docs API.
 * Suporta: # headings, **bold**, *italic*, --- separadores, bullet lists.
 */
async function insertMarkdownToDoc(docId, markdown, startIndex = 1) {
  const docs = await getDocsApi();
  const lines = markdown.split('\n');

  // Fase 1: inserir todo o texto de uma vez
  const plainLines = [];
  const formatting = []; // {start, end, style}

  let currentOffset = 0;

  for (const line of lines) {
    let cleanLine = line;
    let lineStyle = null;

    // Headings
    if (/^### /.test(line)) {
      cleanLine = line.replace(/^### /, '');
      lineStyle = 'HEADING_3';
    } else if (/^## /.test(line)) {
      cleanLine = line.replace(/^## /, '');
      lineStyle = 'HEADING_2';
    } else if (/^# /.test(line)) {
      cleanLine = line.replace(/^# /, '');
      lineStyle = 'HEADING_1';
    } else if (/^---+$/.test(line.trim())) {
      cleanLine = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
      lineStyle = 'SEPARATOR';
    }

    // Strip bold/italic markers para texto plano mas guardar posições
    const boldRanges = [];
    let stripped = cleanLine;
    let match;
    const boldRegex = /\*\*(.+?)\*\*/g;
    while ((match = boldRegex.exec(cleanLine)) !== null) {
      boldRanges.push({ text: match[1], originalStart: match.index });
    }
    stripped = stripped.replace(/\*\*(.+?)\*\*/g, '$1');
    stripped = stripped.replace(/\*(.+?)\*/g, '$1');

    plainLines.push(stripped);

    const lineStart = currentOffset;
    const lineEnd = currentOffset + stripped.length;

    if (lineStyle && lineStyle !== 'SEPARATOR') {
      formatting.push({ start: lineStart, end: lineEnd, type: 'heading', style: lineStyle });
    }

    // Track bold ranges in final text
    if (boldRanges.length) {
      let offset = 0;
      let tempLine = cleanLine;
      for (const br of boldRanges) {
        const idx = tempLine.indexOf(`**${br.text}**`);
        if (idx >= 0) {
          const realStart = currentOffset + idx - offset;
          formatting.push({ start: realStart, end: realStart + br.text.length, type: 'bold' });
          offset += 4; // remove 4 chars (**)
          tempLine = tempLine.substring(0, idx) + br.text + tempLine.substring(idx + br.text.length + 4);
        }
      }
    }

    currentOffset = lineEnd + 1; // +1 for newline
  }

  const fullText = plainLines.join('\n');
  if (!fullText.trim()) return;

  // Insert all text at once
  const requests = [];

  requests.push({
    insertText: {
      location: { index: startIndex },
      text: fullText,
    },
  });

  // Apply heading styles
  for (const fmt of formatting) {
    const absStart = startIndex + fmt.start;
    const absEnd = startIndex + fmt.end;

    if (fmt.type === 'heading') {
      const styleMap = {
        HEADING_1: 'HEADING_1',
        HEADING_2: 'HEADING_2',
        HEADING_3: 'HEADING_3',
      };
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: absStart, endIndex: absEnd },
          paragraphStyle: { namedStyleType: styleMap[fmt.style] },
          fields: 'namedStyleType',
        },
      });
    } else if (fmt.type === 'bold') {
      requests.push({
        updateTextStyle: {
          range: { startIndex: absStart, endIndex: absEnd },
          textStyle: { bold: true },
          fields: 'bold',
        },
      });
    }
  }

  // Execute in batches (max 100 per batch)
  const BATCH_SIZE = 100;
  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    const batch = requests.slice(i, i + BATCH_SIZE);
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests: batch },
    });
  }
}

/**
 * Obtém o folder ID de uma pasta local do Google Drive via xattr.
 * @param {string} folderPath - Caminho local
 * @returns {string|null}
 */
function getFolderIdFromPath(folderPath) {
  const { execSync } = require('child_process');
  try {
    return execSync(
      `xattr -p "com.google.drivefs.item-id#S" "${folderPath}" 2>/dev/null`,
      { encoding: 'utf-8', timeout: 5000 }
    ).trim() || null;
  } catch {
    return null;
  }
}

module.exports = {
  listClients,
  getClientStructure,
  listClientFiles,
  readClientFile,
  createClientFolder,
  getDriveFolderLink,
  shareFolderAsPublicEditor,
  createGoogleDoc,
  appendToGoogleDoc,
  getFolderIdFromPath,
  getDriveApi,
  getDocsApi,
  DRIVE_BASE,
  CLIENTS_PATH
};
