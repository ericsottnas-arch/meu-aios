// Gera o documento .docx com variações de comentários e stories por procedimento
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require('docx');
const fs = require('fs');
const path = require('path');

const DRIVE_BASE = '/Users/ericsantos/Library/CloudStorage/GoogleDrive-ericsottnas@gmail.com/Meu Drive/Syra Digital';

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ text, heading: level, spacing: { before: 300, after: 150 } });
}
function h2(text) { return heading(text, HeadingLevel.HEADING_2); }
function h3(text) { return heading(text, HeadingLevel.HEADING_3); }

function para(text) {
  return new Paragraph({ text, spacing: { after: 80 } });
}

function quote(text) {
  return new Paragraph({
    children: [new TextRun({ text: `"${text}"`, font: 'Courier New', size: 21, italics: true })],
    spacing: { after: 100 },
    indent: { left: 300 },
    border: { left: { style: BorderStyle.SINGLE, size: 2, color: '4A90D9', space: 8 } }
  });
}

function label(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 20, color: '666666' })],
    spacing: { before: 80, after: 40 }
  });
}

function spacer() {
  return new Paragraph({ text: '', spacing: { after: 80 } });
}

function separator() {
  return new Paragraph({
    children: [new TextRun({ text: '────────────────────────────────────────', color: 'CCCCCC', size: 18 })],
    spacing: { before: 200, after: 200 }
  });
}

// ═══════════════════════════════════════════
// VARIAÇÕES POR PROCEDIMENTO
// ═══════════════════════════════════════════

const PROCEDURES = [
  {
    name: 'Criolipólise',
    comments: [
      'Quantas sessões você costuma fazer pra essa região? Vi que o resultado ficou bem definido.',
      'Essa ponteira que você usou é a de sucção ou a de placa? Pergunto porque a diferença no resultado é grande.',
      'Quanto tempo de aplicação por região você tá fazendo? Vi que tem gente reduzindo pra 35 min com bons resultados.',
      'Resultado bem uniforme. Você combina crio com alguma outra tecnologia pra potencializar ou usa isolada?',
      'Essa evolução de 30 dias tá bem consistente. Paciente voltou pra segunda sessão ou já ficou satisfeita com essa?',
    ],
    stories: [
      'Crio nessa região costuma dar muito desconforto no paciente ou é tranquilo?',
      'Quantas áreas você consegue fazer num atendimento só?',
      'Esse resultado em quanto tempo? Crio demora pra mostrar, né?',
      'Você faz avaliação de prega antes e depois pra documentar a evolução?',
      'Essa ponteira é nova? A marca faz diferença no resultado?',
    ]
  },
  {
    name: 'Lipo sem corte (corporal)',
    comments: [
      'Resultado bem natural. Qual tecnologia você usa? Tá tendo uma evolução grande nessa área ultimamente.',
      'Quantas sessões foram pra chegar nesse resultado? Pergunto porque varia muito de protocolo.',
      'Você faz associação com drenagem ou algum protocolo pós? Porque isso muda muito o resultado final.',
      'Interessante a região que você tratou. É a que mais tem demanda na sua clínica ou variam bastante?',
      'O tempo de recuperação que seus pacientes reportam é quanto? Tem gente voltando no mesmo dia pro trabalho?',
    ],
    stories: [
      'Lipo sem corte nessa região é o que mais sai na sua clínica?',
      'Quanto tempo de sessão nesse protocolo? Parece rápido.',
      'Paciente consegue voltar pra rotina no mesmo dia?',
      'Você usa essa tecnologia há quanto tempo? Resultados tão consistentes?',
      'Qual é a queixa mais comum dos pacientes antes de começar?',
    ]
  },
  {
    name: 'Lipo de papada sem corte',
    comments: [
      'Resultado definido. Quantas sessões foram pra chegar nessa redução de papada?',
      'Você usa criolipólise na papada ou outra tecnologia? Pergunto porque o protocolo muda bastante.',
      'Esse ângulo do antes e depois mostra bem a diferença. Paciente ficou satisfeito logo na primeira sessão?',
      'Papada é uma das maiores queixas que chegam pra você ou é mais corporal?',
      'Interessante a evolução. Você faz alguma associação de tratamento pra papada ou usa protocolo isolado?',
    ],
    stories: [
      'Papada sem corte tá tendo muita procura? Parece que virou o procedimento do momento.',
      'Quanto tempo leva a sessão de papada? Paciente aguenta bem?',
      'Esse resultado é com quantas sessões? Ficou natural.',
      'Você percebe que papada é mais procurada por homem ou mulher?',
      'A recuperação de papada sem corte é rápida ou precisa de repouso?',
    ]
  },
  {
    name: 'Preenchedores',
    comments: [
      'Resultado bem harmonioso. Qual é sua abordagem pra manter a proporção sem ficar artificial?',
      'Você usa cânula ou agulha nessa região? Pergunto porque muda muito o conforto do paciente.',
      'Quanto de produto foi nesse resultado? Parece que foi bem dosado.',
      'Interessante a técnica. Você faz em camadas ou aplica tudo de uma vez?',
      'O natural tá cada vez mais difícil de acertar e você conseguiu. Paciente já tinha feito antes ou foi primeira vez?',
    ],
    stories: [
      'Preenchimento nessa região costuma durar quanto tempo no seu protocolo?',
      'Você percebe que paciente tá pedindo resultado mais natural ou ainda quer volume?',
      'Quanto tempo levou essa aplicação? Parece que foi rápido.',
      'Qual marca de ácido hialurônico você prefere pra essa região?',
      'Primeira vez dessa paciente ou retoque? Ficou bem natural.',
    ]
  },
  {
    name: 'Bioestimuladores',
    comments: [
      'A evolução em 30 dias ficou visível. Quantas sessões nesse protocolo de bioestimulador?',
      'Qual bioestimulador você tá usando? Porque cada um tem uma resposta diferente dependendo da região.',
      'Resultado consistente. O colágeno novo já tá aparecendo ou esse é o efeito imediato ainda?',
      'Você combina bioestimulador com algum outro procedimento ou usa isolado nesse protocolo?',
      'Interessante a indicação pra essa região. A maioria usa em face — você tá expandindo pra corpo também?',
    ],
    stories: [
      'Bioestimulador nessa região é novidade ou você já faz há tempo?',
      'Quanto tempo pra paciente ver resultado real com bioestimulador? A expectativa é sempre um desafio, né?',
      'Qual intervalo entre sessões você usa no seu protocolo?',
      'Paciente sente muita diferença depois da segunda sessão comparado com a primeira?',
      'Você tá vendo mais procura por bioestimulador esse ano?',
    ]
  },
  {
    name: 'Harmonização Orofacial (HOF)',
    comments: [
      'O equilíbrio ficou excelente. Você planeja digitalmente antes ou faz avaliação clínica direto?',
      'Quantos pontos de aplicação foram nesse resultado? Parece que foi bem distribuído.',
      'Harmonização completa ou você fez por etapas? Porque a abordagem muda o resultado final.',
      'Resultado natural. O maior desafio nessa região é acertar a proporção ou o volume?',
      'Interessante a técnica. Você usa mais preenchedor ou toxina pra esse tipo de resultado?',
    ],
    stories: [
      'HOF completa em uma sessão ou você divide em etapas?',
      'Qual é a queixa mais comum que chega pra harmonização no seu consultório?',
      'Quanto tempo de procedimento pra um resultado assim?',
      'Você percebe que o perfil do paciente de HOF mudou? Tá vindo mais homem?',
      'Planejamento digital antes do procedimento faz muita diferença no resultado?',
    ]
  },
  {
    name: 'Botox / Toxina Botulínica',
    comments: [
      'Resultado limpo. Quantas unidades você usou nessa região? Pergunto porque menos às vezes é mais.',
      'A naturalidade ficou ótima. Paciente consegue mover a expressão normalmente?',
      'Você faz o protocolo de micro-botox também ou prefere a aplicação clássica?',
      'Interessante o ponto de aplicação. Você segue protocolo fixo ou personaliza por anatomia?',
      'Quanto tempo levou a aplicação? Botox bem feito parece simples mas exige bastante técnica.',
    ],
    stories: [
      'Toxina nessa região costuma durar quanto meses nos seus pacientes?',
      'Paciente já chega pedindo quantidade específica ou você avalia e decide?',
      'Retoque depois de 15 dias — você faz em todo mundo ou só quando precisa?',
      'Qual é a marca de toxina que você mais confia hoje?',
      'Micro-botox tá ganhando espaço na sua clínica ou ainda é mais o clássico?',
    ]
  }
];

function buildDocument() {
  const children = [];

  // Capa
  children.push(new Paragraph({ text: '', spacing: { before: 1500 } }));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'VARIAÇÕES DE SCRIPTS', bold: true, size: 48 })],
    alignment: AlignmentType.CENTER
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'COMENTÁRIOS E STORIES POR PROCEDIMENTO', bold: true, size: 32, color: '555555' })],
    alignment: AlignmentType.CENTER, spacing: { after: 200 }
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'Copie entre aspas. Adapte o procedimento específico.\nCada variação serve pra um contexto diferente do post/story.', size: 22, italics: true, color: '777777' })],
    alignment: AlignmentType.CENTER, spacing: { after: 400 }
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: `Copy-Chef · Syra Digital AIOS · ${new Date().toLocaleDateString('pt-BR')}`, size: 18, color: '999999' })],
    alignment: AlignmentType.CENTER
  }));

  // Instruções
  children.push(separator());
  children.push(heading('COMO USAR'));
  children.push(para('1. Veja o PROCEDIMENTO principal do prospect (campo "Procedimento Principal" no GHL)'));
  children.push(para('2. Vá na seção correspondente abaixo'));
  children.push(para('3. Escolha a variação que FAZ SENTIDO com o post/story que ela publicou'));
  children.push(para('4. Copie o texto entre aspas e cole direto'));
  children.push(para('5. Adapte APENAS se necessário (nome do procedimento específico, região do corpo, etc.)'));
  children.push(spacer());
  children.push(para('REGRA: Nunca mande a mesma variação pra dois prospects. Rotacione.'));

  // Sistema de tags GHL
  children.push(separator());
  children.push(heading('SISTEMA DE TRACKING NO GHL'));
  children.push(spacer());
  children.push(para('Cada lead em "Aquecendo" recebe tags conforme você avança:'));
  children.push(spacer());
  children.push(para('📌 Tag "curtiu" → Quando curtir 3-4 posts (Dia 1-2)'));
  children.push(para('📌 Tag "comentou" → Quando comentar 1 post usando os scripts abaixo (Dia 3)'));
  children.push(para('📌 Tag "story" → Quando responder 1 story usando os scripts abaixo (Dia 4-5)'));
  children.push(spacer());
  children.push(para('✅ Quando tem as 3 tags → mover pra "DM Enviada" e usar scripts de abertura'));
  children.push(spacer());
  children.push(para('Campos obrigatórios ao adicionar lead:'));
  children.push(para('  • Procedimento Principal (dropdown)'));
  children.push(para('  • @Instagram (campo nativo)'));
  children.push(para('  • Seguidores (número)'));

  // Variações por procedimento
  for (const proc of PROCEDURES) {
    children.push(separator());
    children.push(heading(proc.name.toUpperCase()));

    children.push(h2('Comentários no Feed (Dia 3 — tag "comentou")'));
    children.push(para(`Usar quando ela postar conteúdo de ${proc.name.toLowerCase()}. Escolha 1 por prospect.`));
    children.push(spacer());

    proc.comments.forEach((c, i) => {
      children.push(label(`Variação ${i + 1}:`));
      children.push(quote(c));
      children.push(spacer());
    });

    children.push(h2('Respostas em Stories (Dia 4-5 — tag "story")'));
    children.push(para(`Usar quando ela postar story relacionado a ${proc.name.toLowerCase()}.`));
    children.push(spacer());

    proc.stories.forEach((s, i) => {
      children.push(label(`Variação ${i + 1}:`));
      children.push(quote(s));
      children.push(spacer());
    });
  }

  // Variações genéricas
  children.push(separator());
  children.push(heading('GENÉRICO (QUALQUER PROCEDIMENTO)'));

  children.push(h2('Comentários genéricos (quando não sabe o procedimento)'));
  children.push(spacer());
  const genericComments = [
    'Resultado consistente. Quanto tempo de protocolo pra chegar aí?',
    'Você combina alguma tecnologia nesse tratamento ou usa isolada?',
    'Interessante a evolução. Paciente voltou pra manutenção ou ficou satisfeito?',
    'Cada vez mais natural o resultado. Isso que o paciente quer hoje, né?',
    'Quantas sessões no total? Parece que foi bem planejado o protocolo.',
  ];
  genericComments.forEach((c, i) => {
    children.push(label(`Variação ${i + 1}:`));
    children.push(quote(c));
    children.push(spacer());
  });

  children.push(h2('Stories genéricos'));
  children.push(spacer());
  const genericStories = [
    'Quantos atendimentos você faz por dia? Parece uma rotina intensa.',
    'Esse procedimento é o que mais sai na sua clínica?',
    'Qual é a maior dúvida que seus pacientes têm antes de começar?',
    'Resultado rápido ou precisou de mais de uma sessão?',
    'Você tá preferindo agendar avaliação presencial ou faz online também?',
  ];
  genericStories.forEach((s, i) => {
    children.push(label(`Variação ${i + 1}:`));
    children.push(quote(s));
    children.push(spacer());
  });

  // Rodapé
  children.push(separator());
  children.push(new Paragraph({
    children: [new TextRun({ text: '— Copy-Chef · Syra Digital AIOS · Março 2026', italics: true, size: 18, color: '999999' })],
    alignment: AlignmentType.CENTER, spacing: { before: 300 }
  }));

  return new Document({
    creator: 'Copy-Chef · Syra Digital AIOS',
    title: 'Variações de Scripts — Comentários e Stories por Procedimento',
    sections: [{
      properties: { page: { margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 } } },
      children
    }]
  });
}

async function main() {
  const doc = buildDocument();
  const buffer = await Packer.toBuffer(doc);

  const driveDir = path.join(DRIVE_BASE, 'Prospecção');
  if (!fs.existsSync(driveDir)) fs.mkdirSync(driveDir, { recursive: true });

  const date = new Date().toISOString().split('T')[0];
  const fileName = `${date}_Variacoes-Scripts-Comentarios-Stories.docx`;
  const filePath = path.join(driveDir, fileName);

  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Salvo: ${filePath}`);
}

main().catch(console.error);
