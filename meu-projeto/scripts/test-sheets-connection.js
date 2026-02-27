// meu-projeto/scripts/test-sheets-connection.js

const CeloAgent = require('../lib/celo-agent');

async function testConnection() {
    console.log("Iniciando teste de conexão com o Google Sheets...");

    const celo = new CeloAgent();

    // Aguarda um momento para a autenticação assíncrona inicializar
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (!celo.config.sheets) {
        console.error("A inicialização da API do Google Sheets falhou. Encerrando o teste.");
        return;
    }

    try {
        // Tenta ler um pequeno intervalo da aba 'Opportunities'.
        const range = "'Opportunities'!A1:B2";
        console.log(`Tentando ler o intervalo: ${range}`);

        const data = await celo.getSheetData(range);

        if (data && data.length > 0) {
            console.log("Conexão bem-sucedida! Dados recebidos:", data);
        } else {
            console.warn("Conexão bem-sucedida, mas nenhum dado foi retornado. O intervalo pode estar vazio ou o nome da aba incorreto.");
        }
    } catch (error) {
        console.error("O teste de conexão falhou. Detalhes do erro:", error.message);
        console.log("Possíveis causas: 1. A API Google Sheets não está ativada no seu projeto Google Cloud. 2. O e-mail da conta de serviço não foi adicionado como 'Editor' na sua planilha. 3. O nome da aba ou o intervalo estão incorretos.");
    }
}

testConnection();
