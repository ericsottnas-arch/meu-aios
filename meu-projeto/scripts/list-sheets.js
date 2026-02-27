// meu-projeto/scripts/list-sheets.js

const CeloAgent = require('../lib/celo-agent');

async function listAllSheets() {
    console.log("Iniciando script para listar as abas da planilha...");

    const celo = new CeloAgent();

    // Aguarda um momento para a autenticação assíncrona inicializar
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (!celo.config.sheets) {
        console.error("A inicialização da API do Google Sheets falhou. Encerrando o script.");
        return;
    }

    try {
        console.log("Tentando obter a lista de abas...");
        const sheetNames = await celo.listSheets();

        if (sheetNames && sheetNames.length > 0) {
            console.log("\nProcesso concluído. As abas disponíveis são:");
            sheetNames.forEach(name => console.log(`- ${name}`));
        } else {
            console.warn("Nenhuma aba foi encontrada na planilha.");
        }
    } catch (error) {
        console.error("O script para listar as abas falhou. Detalhes do erro:", error.message);
    }
}

listAllSheets();
