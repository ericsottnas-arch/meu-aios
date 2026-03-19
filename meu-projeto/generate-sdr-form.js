const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType } = require('docx');
const fs = require('fs');
const path = require('path');

const FONT = 'Calibri';
const BLUE = '1F4E79';
const DARK = '2D2D2D';
const WHITE = 'FFFFFF';
const GRAY = '555555';

function heading(text, level = HeadingLevel.HEADING_1) {
  const sizes = { [HeadingLevel.HEADING_1]: 32, [HeadingLevel.HEADING_2]: 26, [HeadingLevel.HEADING_3]: 22 };
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 400 : 200, after: 120 },
    children: [new TextRun({ text, font: FONT, bold: true, color: BLUE, size: sizes[level] || 22 })]
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, font: FONT, size: 22, color: DARK, bold: opts.bold || false, italics: opts.italic || false })]
  });
}

function bold(text) { return new TextRun({ text, font: FONT, size: 22, color: DARK, bold: true }); }
function normal(text) { return new TextRun({ text, font: FONT, size: 22, color: DARK }); }
function gray(text) { return new TextRun({ text, font: FONT, size: 20, color: GRAY, italics: true }); }

function multiRun(runs) {
  return new Paragraph({ spacing: { after: 120 }, children: runs });
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: FONT, size: 22, color: DARK })]
  });
}

// Campo de formulário em texto (bold label + tipo em cinza)
function formField(label, type, required) {
  const reqText = required === 'sim' ? ' (obrigatório)' : required === 'condicional' ? ' (condicional)' : ' (opcional)';
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      bold(label),
      gray('  —  ' + type + reqText)
    ]
  });
}

function simpleTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(text => new TableCell({
          shading: { type: ShadingType.SOLID, color: BLUE },
          width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
          children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text, font: FONT, size: 20, color: WHITE, bold: true })] })]
        }))
      }),
      ...rows.map(cells => new TableRow({
        children: cells.map(text => new TableCell({
          width: { size: Math.floor(100 / cells.length), type: WidthType.PERCENTAGE },
          children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text, font: FONT, size: 20, color: DARK })] })]
        }))
      }))
    ]
  });
}

function separator() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    children: [new TextRun({ text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', font: FONT, size: 16, color: 'CCCCCC' })]
  });
}

function scenarioBlock(title, description, fieldLabel) {
  return [
    new Paragraph({ spacing: { before: 200, after: 80 }, children: [bold(title)] }),
    new Paragraph({
      spacing: { after: 80 },
      indent: { left: 200 },
      children: [new TextRun({ text: description, font: FONT, size: 22, color: GRAY, italics: true })]
    }),
    formField(fieldLabel, 'textarea', 'sim'),
  ];
}

const doc = new Document({
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
    children: [
      new Paragraph({
        spacing: { after: 60 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'FORMULÁRIO DE CONTRATAÇÃO', font: FONT, bold: true, color: BLUE, size: 36 })]
      }),
      new Paragraph({
        spacing: { after: 300 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'SDR & Social Seller — Dr. Cleugo Porto', font: FONT, size: 28, color: '666666' })]
      }),

      heading('Sobre a Empresa'),
      multiRun([
        bold('Syra Digital'),
        normal(' é uma agência de marketing médico e estético que atende profissionais de saúde premium. O cliente que você atenderá é o '),
        bold('Dr. Cleugo Porto'),
        normal(', médico integrativo, referência nacional no tratamento de celulite e lipedema, com clínica em Alphaville (SP). Seus procedimentos são high-ticket e o público é predominantemente feminino.')
      ]),

      separator(),

      heading('Descrição da Vaga'),
      heading('Cargo: SDR & Social Seller', HeadingLevel.HEADING_3),
      multiRun([
        bold('O que é? '),
        normal('SDR (Sales Development Representative) é o profissional responsável por fazer o primeiro contato com potenciais pacientes, qualificar o interesse e agendar consultas. Social Seller é quem constrói relacionamento e gera oportunidades de negócio através de redes sociais (Instagram, WhatsApp). Você será a ponte entre o marketing digital e a agenda do médico.')
      ]),
      multiRun([
        bold('Resumo: '),
        normal('Você vai receber leads (pessoas interessadas nos procedimentos do Dr. Cleugo), iniciar conversas, entender as necessidades, tirar dúvidas iniciais e agendar consultas. Tudo com empatia, paciência e comunicação premium.')
      ]),

      heading('Responsabilidades', HeadingLevel.HEADING_3),
      bullet('Atender leads que chegam via Instagram, WhatsApp e formulários'),
      bullet('Responder mensagens com agilidade (tempo máximo: 5 minutos em horário comercial)'),
      bullet('Qualificar leads: entender o problema, interesse e momento de compra'),
      bullet('Agendar consultas/avaliações na agenda do médico'),
      bullet('Fazer follow-up de leads que não responderam (sequências de 5-10 contatos)'),
      bullet('Registrar todas as interações no CRM'),
      bullet('Construir relacionamento nas redes sociais do médico (comentários, DMs, engajamento)'),
      bullet('Reportar semanalmente: leads recebidos, agendamentos, conversões'),

      heading('Modalidade', HeadingLevel.HEADING_3),
      bullet('Início: Home Office (remoto)'),
      bullet('Previsão: Migração para presencial em São Paulo dentro de 6 meses a 1 ano'),
      bullet('Horário: Comercial'),

      heading('Requisitos', HeadingLevel.HEADING_3),
      p('Obrigatórios:', { bold: true }),
      bullet('Boa comunicação escrita e verbal'),
      bullet('Boa apresentação pessoal'),
      bullet('Paciência e empatia com o público'),
      bullet('Noção básica de vendas e atendimento'),
      bullet('Perfil comunicativo e proativo'),
      bullet('Saber trabalhar com público premium/high-ticket'),
      bullet('Habilidade para criar conexões genuínas'),
      bullet('Acesso a computador e internet estável'),
      bullet('Familiaridade com Instagram e WhatsApp Business'),
      p('Diferenciais (não obrigatórios, mas valorizam):', { bold: true }),
      bullet('Experiência anterior com vendas ou atendimento comercial'),
      bullet('Experiência no segmento de saúde, medicina, biomedicina ou estética'),
      bullet('Conhecimento de CRM (qualquer plataforma)'),
      bullet('Experiência com vendas high-ticket'),

      separator(),

      // SEÇÃO 1 — campos em texto
      heading('SEÇÃO 1: Dados Pessoais'),
      formField('Nome completo', 'texto', 'sim'),
      formField('E-mail', 'email', 'sim'),
      formField('Telefone (WhatsApp)', 'telefone', 'sim'),
      formField('Cidade / Estado', 'texto', 'sim'),
      formField('Data de nascimento', 'data', 'sim'),
      formField('LinkedIn (se tiver)', 'url', 'não'),
      formField('Instagram pessoal (se tiver)', 'texto', 'não'),

      separator(),

      // SEÇÃO 2 — campos em texto
      heading('SEÇÃO 2: Experiência e Background'),
      formField('Você já trabalhou com vendas ou atendimento comercial?', 'sim/não', 'sim'),
      formField('Se sim, descreva brevemente sua experiência', 'textarea', 'condicional'),
      formField('Você já trabalhou no segmento de saúde, medicina ou estética?', 'sim/não', 'sim'),
      formField('Se sim, em qual função e por quanto tempo?', 'textarea', 'condicional'),
      formField('Você já usou algum CRM? Qual?', 'texto', 'não'),
      formField('Qual sua familiaridade com Instagram e WhatsApp Business? (1 a 5)', 'range 1-5', 'sim'),

      separator(),

      // SEÇÃO 3 — campos em texto
      heading('SEÇÃO 3: Perfil Comportamental'),
      formField('Como você lida com uma pessoa que demora para responder suas mensagens?', 'textarea', 'sim'),
      formField('Um lead disse "vou pensar" depois de você apresentar o procedimento. O que você faz?', 'textarea', 'sim'),
      formField('Descreva uma situação onde você precisou ter muita paciência com alguém', 'textarea', 'sim'),
      formField('Como você se sente conversando com pessoas que não conhece?', 'select: "Muito confortável" / "Confortável" / "Um pouco desconfortável" / "Desconfortável"', 'sim'),
      formField('Você se considera mais extrovertida ou introvertida?', 'select: "Extrovertida" / "Mais para extrovertida" / "Equilíbrio" / "Mais para introvertida" / "Introvertida"', 'sim'),

      separator(),

      // SEÇÃO 4 — cenários em texto
      heading('SEÇÃO 4: Cenários Práticos (Situacionais)'),

      ...scenarioBlock(
        'Cenário 1 — Primeiro Contato',
        'Uma mulher de 38 anos preencheu um formulário dizendo que tem celulite grau 3 e que "já tentou de tudo". Como você inicia a conversa com ela pelo WhatsApp?',
        'Escreva a mensagem que você enviaria'
      ),
      ...scenarioBlock(
        'Cenário 2 — Objeção de Preço',
        'A lead perguntou o valor do procedimento. Depois que você informou, ela disse: "Nossa, achei caro. Vou pesquisar mais." O que você responde?',
        'Escreva sua resposta'
      ),
      ...scenarioBlock(
        'Cenário 3 — Lead Frio',
        'Você mandou 3 mensagens para um lead nos últimos 7 dias e não recebeu resposta. O que você faz agora?',
        'Descreva sua abordagem'
      ),
      ...scenarioBlock(
        'Cenário 4 — Urgência Emocional',
        'Uma mulher manda mensagem dizendo que está muito incomodada com a aparência das pernas e que "não aguenta mais". Ela está visivelmente emocionada. Como você conduz essa conversa?',
        'Escreva como você conduziria'
      ),
      ...scenarioBlock(
        'Cenário 5 — Pergunta Técnica',
        'A lead pergunta: "Esse procedimento dói? E se a celulite voltar?" Você não é médico. O que você responde?',
        'Escreva sua resposta'
      ),

      separator(),

      // SEÇÃO 5 — campos em texto
      heading('SEÇÃO 5: Disponibilidade e Logística'),
      formField('Você tem disponibilidade para trabalhar em horário comercial (seg-sex)?', 'sim/não', 'sim'),
      formField('Você estaria disposto(a) a migrar para presencial em SP (6 meses a 1 ano)?', 'select: "Sim, sem problemas" / "Sim, dependendo das condições" / "Não tenho certeza" / "Não"', 'sim'),
      formField('Você tem computador próprio e internet estável para trabalho remoto?', 'sim/não', 'sim'),
      formField('Qual sua pretensão salarial? (fixo + comissão)', 'texto', 'sim'),
      formField('Quando poderia começar?', 'select: "Imediatamente" / "Em 1 semana" / "Em 2 semanas" / "Em 1 mês"', 'sim'),

      separator(),

      // SEÇÃO 6 — campos em texto
      heading('SEÇÃO 6: Autoavaliação'),
      formField('De 1 a 10, qual sua habilidade de comunicação escrita?', 'range 1-10', 'sim'),
      formField('De 1 a 10, qual sua habilidade de comunicação verbal?', 'range 1-10', 'sim'),
      formField('De 1 a 10, qual seu nível de organização?', 'range 1-10', 'sim'),
      formField('De 1 a 10, qual sua capacidade de lidar com rejeição?', 'range 1-10', 'sim'),
      formField('Por que você quer essa vaga? (máximo 200 palavras)', 'textarea', 'sim'),

      separator(),

      // SEÇÃO 7 — campo em texto
      heading('SEÇÃO 7: Envio de Vídeo (Diferencial)'),
      formField('Grave um vídeo de até 60s se apresentando. Fale seu nome, por que quer a vaga, e o que te torna uma boa escolha.', 'upload vídeo', 'não'),

      separator(),

      // CRITÉRIOS INTERNOS — tabela mantida (é referência interna, não campo de formulário)
      heading('Critérios de Avaliação (Interno — Não Mostrar no Formulário)'),
      simpleTable(['Critério', 'Peso', 'O que avaliar'], [
        ['Comunicação escrita', '25%', 'Clareza, empatia, ortografia, tom adequado'],
        ['Empatia e paciência', '20%', 'Respostas aos cenários emocionais (4 e 1)'],
        ['Habilidade de vendas', '20%', 'Respostas aos cenários de objeção e lead frio (2 e 3)'],
        ['Inteligência situacional', '15%', 'Sabe quando escalar para o médico (cenário 5)'],
        ['Apresentação pessoal', '10%', 'Vídeo, perfil, primeira impressão'],
        ['Fit cultural', '10%', 'Disponibilidade, motivação, alinhamento premium'],
      ]),

      heading('Red Flags (Eliminar candidato)', HeadingLevel.HEADING_3),
      bullet('Cenário 1: mensagem genérica ("Oi, tudo bem? Vi que você se cadastrou...")'),
      bullet('Cenário 2: tenta forçar a venda ou diminuir o valor do procedimento'),
      bullet('Cenário 4: ignora a emoção e vai direto para agendar'),
      bullet('Cenário 5: inventa informação médica em vez de encaminhar ao doutor'),
      bullet('Erros graves de português'),
      bullet('Respostas monossilábicas ou com zero personalidade'),

      heading('Green Flags (Valorizar candidato)', HeadingLevel.HEADING_3),
      bullet('Cenário 1: demonstra que leu o problema da pessoa e personaliza'),
      bullet('Cenário 2: valida o sentimento, reforça valor, sugere conversa com o médico'),
      bullet('Cenário 3: muda o canal ou abordagem, não apenas repete a mesma mensagem'),
      bullet('Cenário 4: acolhe primeiro, escuta, depois orienta'),
      bullet('Cenário 5: é transparente sobre não ser médico e encaminha com confiança'),
      bullet('Vídeo enviado com boa apresentação e carisma'),

      separator(),
      new Paragraph({
        spacing: { before: 200 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Syra Digital — Formulário de Contratação SDR & Social Seller', font: FONT, size: 18, color: '999999', italics: true })]
      }),
    ]
  }]
});

async function main() {
  const buf = await Packer.toBuffer(doc);

  const localPath = '/Users/ericsantos/meu-aios/docs/clientes/dr-cleugo/Formulario-Contratacao-SDR-Social-Seller.docx';
  fs.writeFileSync(localPath, buf);
  console.log('Local:', localPath);

  const drivePath = path.join(
    '/Users/ericsantos/Library/CloudStorage/GoogleDrive-ericsottnas@gmail.com/Meu Drive/Syra Digital/1. Clientes/Dr. Cleugo Porto'
  );
  if (!fs.existsSync(drivePath)) {
    fs.mkdirSync(drivePath, { recursive: true });
  }
  const driveFile = path.join(drivePath, 'Formulario-Contratacao-SDR-Social-Seller.docx');
  fs.writeFileSync(driveFile, buf);
  console.log('Drive:', driveFile);
}

main().catch(err => console.error('ERRO:', err.message));
