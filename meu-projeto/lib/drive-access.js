/**
 * Drive Access Utility - Acesso centralizado ao Google Drive local (macOS)
 * Permite que qualquer agente consulte o Drive sem precisar de API
 */

const fs = require('fs');
const path = require('path');

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

module.exports = {
  listClients,
  getClientStructure,
  listClientFiles,
  readClientFile,
  DRIVE_BASE,
  CLIENTS_PATH
};
