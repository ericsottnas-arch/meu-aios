// =====================================================
// Google Apps Script — Formulario SDR Dr. Cleugo Porto
// =====================================================
//
// SETUP (5 minutos):
//
// 1. Abra Google Sheets → crie uma planilha nova
//    Nome sugerido: "Candidatos SDR - Dr. Cleugo Porto"
//
// 2. Va em Extensoes → Apps Script
//
// 3. Apague o conteudo e cole TODO este arquivo
//
// 4. Clique em "Implantar" → "Nova implantacao"
//    - Tipo: "App da Web"
//    - Executar como: "Eu" (seu email)
//    - Quem tem acesso: "Qualquer pessoa"
//    - Clique em "Implantar"
//
// 5. Copie a URL gerada (algo como:
//    https://script.google.com/macros/s/AKfycb.../exec)
//
// 6. No arquivo form-sdr-cleugo.html, ache a linha:
//    var GOOGLE_SCRIPT_URL = '';
//    E cole a URL entre as aspas:
//    var GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
//
// 7. Pronto! Cada candidato que submeter vai aparecer como
//    uma nova linha na planilha.
//
// =====================================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Se planilha vazia, criar cabecalhos
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp',
        'Nome',
        'Email',
        'WhatsApp',
        'Cidade',
        'Nascimento',
        'LinkedIn',
        'Instagram',
        'Exp. Vendas',
        'Exp. Vendas (detalhe)',
        'Exp. Saude',
        'Exp. Saude (detalhe)',
        'CRM Usado',
        'Familiaridade Social (1-5)',
        'Demora Responder',
        'Vou Pensar',
        'Paciencia',
        'Conforto Desconhecidos',
        'Perfil Social',
        'Cenario 1: Primeiro Contato',
        'Cenario 2: Objecao Preco',
        'Cenario 3: Lead Frio',
        'Cenario 4: Urgencia Emocional',
        'Cenario 5: Pergunta Tecnica',
        'Horario Comercial',
        'Mudar SP',
        'Computador + Internet',
        'Pretensao Salarial',
        'Quando Comecar',
        'Auto: Comunicacao Escrita (1-10)',
        'Auto: Comunicacao Verbal (1-10)',
        'Auto: Organizacao (1-10)',
        'Auto: Rejeicao (1-10)',
        'Por que quer a vaga',
        'Link Video'
      ]);

      // Formatar cabecalho
      var headerRange = sheet.getRange(1, 1, 1, 35);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#D1A84B');
      headerRange.setFontColor('#020202');
      sheet.setFrozenRows(1);
    }

    // Adicionar linha com dados
    sheet.appendRow([
      new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      data.nome || '',
      data.email || '',
      data.whatsapp || '',
      data.cidade || '',
      data.nascimento || '',
      data.linkedin || '',
      data.instagram || '',
      data.exp_vendas || '',
      data.exp_vendas_desc || '',
      data.exp_saude || '',
      data.exp_saude_desc || '',
      data.crm_usado || '',
      data.familiaridade_social || '',
      data.demora_responder || '',
      data.vou_pensar || '',
      data.paciencia || '',
      data.conforto_desconhecidos || '',
      data.perfil_social || '',
      data.cenario_1 || '',
      data.cenario_2 || '',
      data.cenario_3 || '',
      data.cenario_4 || '',
      data.cenario_5 || '',
      data.horario_comercial || '',
      data.mudar_sp || '',
      data.computador_internet || '',
      data.pretensao_salarial || '',
      data.quando_comecar || '',
      data.auto_comunicacao_escrita || '',
      data.auto_comunicacao_verbal || '',
      data.auto_organizacao || '',
      data.auto_rejeicao || '',
      data.porque_vaga || '',
      data.link_video || ''
    ]);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Necessario para CORS pre-flight
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'Form SDR Dr. Cleugo - ativo' }))
    .setMimeType(ContentService.MimeType.JSON);
}
