// Documento ÚNICO de prospecção: script completo + variações por procedimento + sistema GHL
// SEM aspas nos scripts — texto limpo pra copiar e colar

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require('docx');
const fs = require('fs');
const path = require('path');

const DRIVE_BASE = '/Users/ericsantos/Library/CloudStorage/GoogleDrive-ericsottnas@gmail.com/Meu Drive/Syra Digital';

// ─── Helpers ────────────────────────────────────────

function h1(text) { return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 150 } }); }
function h2(text) { return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 250, after: 100 } }); }
function h3(text) { return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 80 } }); }

function bold(text) {
  return new Paragraph({ children: [new TextRun({ text, bold: true, size: 22 })], spacing: { before: 100, after: 60 } });
}

function para(text) {
  return new Paragraph({ text, spacing: { after: 80 } });
}

function spacer() { return new Paragraph({ text: '', spacing: { after: 100 } }); }

function separator() {
  return new Paragraph({
    children: [new TextRun({ text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', color: 'CCCCCC', size: 18 })],
    spacing: { before: 250, after: 250 }
  });
}

function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text: `• ${text}`, size: 22 })],
    spacing: { after: 60 }, indent: { left: 300 }
  });
}

function numberedItem(num, text, isBold = false) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${num}. `, bold: true, size: 22 }),
      new TextRun({ text, bold: isBold, size: 22 })
    ],
    spacing: { after: 60 }, indent: { left: 200 }
  });
}

// Script sem aspas — texto limpo com borda azul pra visual
function script(lines) {
  return lines.map(line => new Paragraph({
    children: [new TextRun({ text: line, size: 21 })],
    spacing: { after: 40 },
    indent: { left: 300 },
    border: { left: { style: BorderStyle.SINGLE, size: 3, color: '4A90D9', space: 10 } }
  }));
}

// Variação de comentário/story — sem aspas, com número
function variation(num, text) {
  return [
    new Paragraph({
      children: [new TextRun({ text: `Variação ${num}`, bold: true, size: 20, color: '4A90D9' })],
      spacing: { before: 100, after: 30 }
    }),
    new Paragraph({
      children: [new TextRun({ text, size: 21 })],
      spacing: { after: 80 },
      indent: { left: 200 },
      border: { left: { style: BorderStyle.SINGLE, size: 3, color: '4A90D9', space: 10 } }
    })
  ];
}

// ─── Variações por procedimento ─────────────────────

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

// ─── Build Document ─────────────────────────────────

function buildDocument() {
  const c = []; // children

  // ═══ CAPA ═══
  c.push(new Paragraph({ text: '', spacing: { before: 2000 } }));
  c.push(new Paragraph({
    children: [new TextRun({ text: 'PROSPECÇÃO ATIVA INSTAGRAM', bold: true, size: 48 })],
    alignment: AlignmentType.CENTER
  }));
  c.push(new Paragraph({
    children: [new TextRun({ text: 'PLAYBOOK COMPLETO — SYRA DIGITAL', bold: true, size: 32, color: '555555' })],
    alignment: AlignmentType.CENTER, spacing: { after: 300 }
  }));
  c.push(new Paragraph({
    children: [new TextRun({ text: 'Scripts + Variações por Procedimento + Sistema GHL\nProspecção quente para profissionais que já investem em tráfego', size: 22, italics: true, color: '777777' })],
    alignment: AlignmentType.CENTER, spacing: { after: 600 }
  }));
  c.push(new Paragraph({
    children: [new TextRun({ text: `Copy-Chef · Syra Digital AIOS · ${new Date().toLocaleDateString('pt-BR')}`, size: 18, color: '999999' })],
    alignment: AlignmentType.CENTER
  }));

  // ═══ PARTE 1: ICP E QUALIFICAÇÃO ═══
  c.push(separator());
  c.push(h1('PARTE 1 — ICP E QUALIFICAÇÃO'));

  c.push(h2('Quem abordar'));
  c.push(bullet('Médicos, biomédicos, profissionais de estética e saúde'));
  c.push(bullet('Atuam com: lipo sem corte, criolipólise, lipo de papada, preenchedores, bioestimuladores, HOF'));
  c.push(bullet('JÁ INVESTEM em tráfego pago — não são iniciantes'));
  c.push(bullet('Nível de consciência alto: sabem que precisam de marketing, não estão tendo resultado'));
  c.push(spacer());

  c.push(h2('7 Sinais de qualificação (precisa de 3+)'));
  c.push(numberedItem(1, 'Posta conteúdo de procedimentos (antes/depois, técnicas, resultados)'));
  c.push(numberedItem(2, 'Tem entre 1k e 50k seguidores'));
  c.push(numberedItem(3, 'Link na bio para agendamento ou Linktree'));
  c.push(numberedItem(4, 'Engajamento baixo relativo ao tamanho — sinal de tráfego pago'));
  c.push(numberedItem(5, 'Postou nos últimos 7 dias'));
  c.push(numberedItem(6, 'Mencionou campanha, tráfego ou anúncio em stories/destaques'));
  c.push(numberedItem(7, 'Tem post patrocinado visível'));
  c.push(spacer());
  c.push(bold('3+ sinais = QUALIFICADO → adicionar no GHL'));
  c.push(bold('Menos de 3 = NÃO ABORDAR'));

  // ═══ PARTE 2: SISTEMA GHL ═══
  c.push(separator());
  c.push(h1('PARTE 2 — SISTEMA GHL'));

  c.push(h2('Pipeline: 10 estágios'));
  c.push(numberedItem(1, 'Qualificado — Perfil verificado pelos critérios', true));
  c.push(numberedItem(2, 'Aquecendo — Curtir + comentar + story (3-5 dias)', true));
  c.push(numberedItem(3, 'DM Enviada — Abertura mandada', true));
  c.push(numberedItem(4, 'Em Conversa — Respondeu, conversa ativa', true));
  c.push(numberedItem(5, 'Pitch Feito — Case apresentado, call sugerida', true));
  c.push(numberedItem(6, 'Call Agendada — Reunião confirmada', true));
  c.push(numberedItem(7, 'Proposta Enviada — Pós-call', true));
  c.push(numberedItem(8, 'Ganho — Fechou', true));
  c.push(numberedItem(9, 'Sem Resposta — Follow-up pendente', true));
  c.push(numberedItem(10, 'Perdido — Descartado', true));
  c.push(spacer());

  c.push(h2('Campos obrigatórios ao adicionar lead'));
  c.push(bullet('Procedimento Principal (dropdown) — pra saber qual variação de script usar'));
  c.push(bullet('Instagram (campo nativo) — @ do prospect'));
  c.push(bullet('Seguidores (número)'));
  c.push(spacer());

  c.push(h2('Tags de progresso do aquecimento'));
  c.push(para('Cada tag = 1 clique no GHL. Quando tem as 3 = pronto pra DM.'));
  c.push(spacer());
  c.push(bullet('Tag "curtiu" → quando curtir 3-4 posts (Dia 1-2)'));
  c.push(bullet('Tag "comentou" → quando comentar 1 post (Dia 3)'));
  c.push(bullet('Tag "story" → quando responder 1 story (Dia 4-5)'));
  c.push(bullet('Tag "dm-pronta" → marcar quando completar aquecimento'));
  c.push(bullet('Tag "prospeccao-ativa" → em todos os leads de prospecção'));

  // ═══ PARTE 3: PRÉ-AQUECIMENTO ═══
  c.push(separator());
  c.push(h1('PARTE 3 — PRÉ-AQUECIMENTO (3 a 5 dias)'));

  c.push(para('Objetivo: quando a DM chegar, ela já te viu 3 vezes. Não é mais um estranho.'));
  c.push(spacer());

  c.push(h2('Dia 1-2: Curtir → tag "curtiu"'));
  c.push(bullet('Curtir 3-4 posts recentes do feed (não todos de uma vez — espaçar)'));
  c.push(bullet('Priorizar posts de procedimentos e resultados'));
  c.push(bullet('NÃO curtir posts pessoais/lifestyle neste momento'));
  c.push(spacer());

  c.push(h2('Dia 3: Comentar → tag "comentou"'));
  c.push(para('Usar as variações da PARTE 5 conforme o procedimento do prospect.'));
  c.push(para('O comentário tem que mostrar que você ENTENDE o procedimento. Não é elogio genérico.'));
  c.push(spacer());

  c.push(h2('Dia 4-5: Responder Story → tag "story"'));
  c.push(para('Usar as variações de stories da PARTE 5 conforme o procedimento.'));
  c.push(spacer());

  c.push(bold('Após completar as 3 tags → mover pra "DM Enviada" e usar scripts da PARTE 4'));

  // ═══ PARTE 4: SCRIPTS PRINCIPAIS ═══
  c.push(separator());
  c.push(h1('PARTE 4 — SCRIPTS POR ETAPA'));

  // ABERTURA
  c.push(h2('ABERTURA — Primeira DM'));
  c.push(para('Regras: nunca elogio genérico, nunca se apresentar primeiro, sempre observação + diagnóstico'));
  c.push(spacer());

  c.push(h3('A — Ela roda campanha (sinal visível de ads)'));
  c.push(...script([
    'Vi que você já roda campanha.',
    '',
    'Pergunta direta: você tá conseguindo escalar',
    'ou chegou num ponto que o custo por resultado',
    'não tá compensando?',
  ]));
  c.push(spacer());

  c.push(h3('B — Tem link na bio mas sem automação'));
  c.push(...script([
    'Você tem um bom volume de conteúdo',
    'e já investe em tráfego.',
    '',
    'Mas o que acontece com quem clica no link da bio',
    'e não agenda?',
    'Você tem algum follow-up',
    'ou perde esse lead?',
  ]));
  c.push(spacer());

  c.push(h3('C — Perfil forte mas engajamento baixo'));
  c.push(...script([
    'Fui no seu perfil depois de ver seu Reel',
    'sobre [procedimento específico].',
    '',
    'Você posta consistente.',
    'Mas o engajamento não tá na proporção',
    'do que o seu conteúdo merece.',
    '',
    'Você sabe o que tá travando a conversão?',
  ]));
  c.push(spacer());

  c.push(h3('D — Genérico'));
  c.push(...script([
    'Vi seu trabalho com [procedimento].',
    'Resultado consistente.',
    '',
    'Uma curiosidade:',
    'quanto do seu agendamento vem do Instagram',
    'versus indicação?',
  ]));
  c.push(spacer());

  c.push(bold('Após enviar → Pipeline: "DM Enviada"'));
  c.push(bold('Respondeu → Pipeline: "Em Conversa" + Seção Aquecimento'));
  c.push(bold('4 dias sem resposta → Pipeline: "Sem Resposta" + Follow-up'));

  // AQUECIMENTO
  c.push(separator());
  c.push(h2('AQUECIMENTO — Após Resposta'));
  c.push(para('Ela respondeu. Objetivo: aprofundar sem vender.'));
  c.push(spacer());

  c.push(h3('Resposta CURTA'));
  c.push(...script([
    'Entendido. E você tá rodando campanha sozinha',
    'ou tem alguém cuidando do tráfego?',
    '',
    'Porque isso muda tudo na hora de escalar.',
  ]));
  c.push(spacer());

  c.push(h3('Resposta LONGA'));
  c.push(...script([
    'Entendido. Você tem volume de trabalho mas',
    'o digital não tá correspondendo ao nível',
    'do seu serviço.',
    '',
    'Uma pergunta direta:',
    'você já tentou escalar a campanha?',
    'O que aconteceu com o custo?',
  ]));
  c.push(spacer());

  c.push(h3('Confirmou problema com custo/escala'));
  c.push(...script([
    'Faz sentido. Isso é o padrão quando',
    'a estratégia não foi montada pro seu',
    'procedimento específico.',
    '',
    'Campanha genérica de estética',
    'não converte igual campanha feita',
    'pra [procedimento específico dela].',
    '',
    'Você tá rodando com criativo',
    'estático, vídeo, ou os dois?',
  ]));
  c.push(spacer());

  c.push(h3('Ela perguntou o que você faz'));
  c.push(...script([
    'Trabalho só com estética e saúde.',
    'Não faço marketing genérico.',
    '',
    'Meu foco é campanha estruturada',
    'pro procedimento específico do profissional,',
    'com follow-up automático por WhatsApp.',
    '',
    'Mas antes de falar de mim:',
    'qual é o maior gargalo que você tem',
    'hoje nas suas campanhas?',
  ]));

  // TRANSIÇÃO
  c.push(separator());
  c.push(h2('TRANSIÇÃO — Abrindo para o Pitch'));
  c.push(para('Só avançar quando ela FALOU de uma dor concreta.'));
  c.push(spacer());

  c.push(h3('T1 — Custo alto / não escala'));
  c.push(...script([
    'Uma das minhas clientes tava no mesmo ponto.',
    '',
    'Investia em campanha,',
    'mas os agendamentos não fechavam',
    'na proporção que deveria.',
    '',
    'A gente mudou a estrutura — não o orçamento.',
    'Ela investiu R$600.',
    'Faturou mais de R$10k em 10 dias.',
    '',
    'Não é magia. É a estratégia certa',
    'pro nicho certo.',
    '',
    'Você toparia 20 minutos pra eu analisar',
    'o que tá travando nas suas campanhas?',
  ]));
  c.push(spacer());

  c.push(h3('T2 — Descontente com agência'));
  c.push(...script([
    'Infelizmente é o padrão.',
    'A maioria das agências faz post bonito',
    'e torce pro resultado aparecer.',
    '',
    'O que eu faço é diferente:',
    'campanha montada pro seu procedimento,',
    'com criativo que fala da dor do paciente,',
    'e automação que não deixa lead sumir.',
    '',
    'Uma cliente minha saiu de R$600 investidos',
    'pra R$10k de faturamento em 10 dias.',
    '',
    'Vale 20 minutos pra eu te mostrar',
    'o que dá pra ajustar sem mudar seu orçamento?',
  ]));
  c.push(spacer());

  c.push(h3('T3 — Faz sozinha'));
  c.push(...script([
    'Entendo. Você domina a técnica clínica.',
    'Mas marketing é outro jogo.',
    '',
    'O tempo que você gasta tentando',
    'acertar campanha sozinha',
    'é tempo que poderia estar atendendo.',
    '',
    'Meu trabalho é tirar isso do seu colo.',
    'Campanha estruturada, follow-up automático,',
    'você só atende.',
    '',
    'Posso te mostrar em 20 minutos',
    'como funciona?',
  ]));

  // PITCH
  c.push(separator());
  c.push(h2('PITCH — Apresentação'));
  c.push(spacer());

  c.push(h3('P1 — Ela tá interessada'));
  c.push(...script([
    'Perfeito. Então aqui é o que eu entrego:',
    '',
    '1. Campanha estruturada pro seu procedimento',
    '   (não genérica de estética)',
    '',
    '2. Criativo que fala direto na dor do paciente',
    '   (não foto bonita sem direção)',
    '',
    '3. Follow-up automático por WhatsApp',
    '   pra quem demonstrou interesse mas não fechou',
    '',
    'Minha última cliente investiu R$600',
    'e faturou R$10k em 10 dias.',
    'Tá nos meus destaques.',
    '',
    'Qual dia você tem 20 minutos',
    'pra eu analisar sua situação específica?',
  ]));
  c.push(spacer());

  c.push(h3('P2 — Com pé atrás'));
  c.push(...script([
    'Vou ser transparente.',
    '',
    'Eu trabalho SÓ com estética e saúde.',
    'Não faço marketing pra restaurante,',
    'loja de roupa ou qualquer outra coisa.',
    '',
    'Por isso sei exatamente o que funciona',
    'no seu nicho.',
    '',
    'Os números tão nos meus destaques.',
    'R$600 investidos, R$10k faturados em 10 dias.',
    '',
    'Se você der 20 minutos,',
    'saio de lá com um diagnóstico',
    'do que tá travando suas campanhas.',
    'Se não fizer sentido, sem problema.',
  ]));

  // AGENDAMENTO
  c.push(separator());
  c.push(h2('AGENDAMENTO'));
  c.push(spacer());

  c.push(h3('AG1 — Propor horário'));
  c.push(...script([
    'Ótimo.',
    '',
    'Vou te mandar meu link de agenda.',
    'Escolhe o dia que funcionar melhor pra você.',
    '',
    'A call é por Google Meet, 20 minutos.',
    'Vou analisar suas campanhas antes',
    'pra já chegar com diagnóstico pronto.',
    '',
    '[LINK DO CALENDÁRIO]',
  ]));
  c.push(spacer());

  c.push(h3('AG2 — Confirmar'));
  c.push(...script([
    'Confirmado pra [dia] às [hora].',
    '',
    'Vou mandar o link da call',
    'umas horas antes.',
    '',
    'Se puder, me manda o @ do seu Instagram',
    'de anúncios antes da call —',
    'assim já faço a análise prévia.',
  ]));
  c.push(spacer());

  c.push(h3('AG3 — Lembrete 24h antes'));
  c.push(...script([
    'Oi! Lembrete da nossa call hoje às [hora].',
    '',
    'Aqui o link: [LINK GOOGLE MEET]',
    '',
    'Já analisei seu perfil e tenho',
    'umas observações interessantes.',
    'Até já!',
  ]));

  // FOLLOW-UP
  c.push(separator());
  c.push(h2('FOLLOW-UP'));
  c.push(spacer());

  c.push(h3('FU1 — 4 dias sem resposta'));
  c.push(...script([
    'Só retornando aqui.',
    '',
    'Se o problema de escalar campanha',
    'ainda existe, vale 20 minutos.',
    '',
    'Quando você tem uma janela essa semana?',
  ]));
  c.push(spacer());

  c.push(h3('FU2 — 7 dias'));
  c.push(...script([
    'Oi! Passando aqui de novo.',
    '',
    'Sem pressão.',
    'Mas se em algum momento',
    'você quiser olhar pras suas campanhas',
    'com alguém que só trabalha com estética,',
    'é só chamar.',
    '',
    'Vou deixar meu link de agenda aqui:',
    '[LINK DO CALENDÁRIO]',
  ]));
  c.push(spacer());

  c.push(h3('FU3 — 14 dias (último)'));
  c.push(...script([
    'Última mensagem sobre isso.',
    '',
    'Se fizer sentido no futuro,',
    'meu perfil tá aqui.',
    '',
    'Sucesso com as campanhas!',
  ]));
  c.push(spacer());
  c.push(bold('Após FU3 sem resposta → Pipeline: "Perdido". Não mandar mais.'));

  // OBJEÇÕES
  c.push(separator());
  c.push(h2('OBJEÇÕES'));
  c.push(spacer());

  c.push(h3('OBJ1 — Já tenho agência'));
  c.push(...script([
    'Entendo. Não to pedindo pra trocar agora.',
    '',
    'Uma pergunta só:',
    'você consegue dizer com precisão',
    'qual campanha, qual criativo',
    'e qual procedimento trouxe cada real',
    'que você faturou esse mês?',
    '',
    'Se não — isso é o gap.',
    'E é exatamente onde eu trabalho.',
  ]));
  c.push(spacer());

  c.push(h3('OBJ2 — Já tentei e não funcionou'));
  c.push(...script([
    'Entendo. A maioria faz o genérico:',
    'post bonito, legenda e torcida.',
    '',
    'O que eu faço é diferente:',
    'trabalho só com estética e saúde.',
    'Sei o que converte nesse nicho.',
    'E automatizo o follow-up —',
    'porque a venda quase nunca acontece',
    'no primeiro contato.',
    '',
    '20 minutos. Se não fizer sentido,',
    'pelo menos você sai com clareza',
    'do que mudar.',
  ]));
  c.push(spacer());

  c.push(h3('OBJ3 — Meu tráfego tá indo bem'));
  c.push(...script([
    'Ótimo. Então você já tem a base.',
    '',
    'Só uma coisa:',
    'quanto do seu orçamento',
    'vai pra lead que não fecha?',
    '',
    'E você tem algum sistema',
    'que recupera esse lead depois?',
    '',
    'Na maioria das clínicas,',
    '60% do faturamento possível',
    'fica na mesa por falta',
    'de follow-up estruturado.',
  ]));
  c.push(spacer());

  c.push(h3('OBJ4 — Sem budget'));
  c.push(...script([
    'Sem problema.',
    '',
    'Mas quanto você deixa de faturar',
    'por mês por não ter um sistema',
    'que fecha os leads que já chegam?',
    '',
    'É disso que a gente conversa.',
    '20 minutos, sem compromisso.',
  ]));
  c.push(spacer());

  c.push(h3('OBJ5 — Vou pensar'));
  c.push(...script([
    'Beleza. Sem pressa.',
    '',
    'Vou deixar meu link de agenda aqui.',
    'Quando fizer sentido, é só marcar.',
    '',
    '[LINK DO CALENDÁRIO]',
  ]));

  // ═══ PARTE 5: VARIAÇÕES POR PROCEDIMENTO ═══
  c.push(separator());
  c.push(h1('PARTE 5 — VARIAÇÕES POR PROCEDIMENTO'));
  c.push(para('Usar na fase de pré-aquecimento (Dia 3: comentário no feed / Dia 4-5: resposta em story).'));
  c.push(para('Escolha a variação que faz sentido com o que ela postou. Texto limpo pra copiar direto.'));

  for (const proc of PROCEDURES) {
    c.push(separator());
    c.push(h2(proc.name.toUpperCase()));

    c.push(h3('Comentários no Feed'));
    proc.comments.forEach((txt, i) => c.push(...variation(i + 1, txt)));
    c.push(spacer());

    c.push(h3('Respostas em Stories'));
    proc.stories.forEach((txt, i) => c.push(...variation(i + 1, txt)));
  }

  // Genéricos
  c.push(separator());
  c.push(h2('GENÉRICO (QUALQUER PROCEDIMENTO)'));

  c.push(h3('Comentários genéricos'));
  const gc = [
    'Resultado consistente. Quanto tempo de protocolo pra chegar aí?',
    'Você combina alguma tecnologia nesse tratamento ou usa isolada?',
    'Interessante a evolução. Paciente voltou pra manutenção ou ficou satisfeito?',
    'Cada vez mais natural o resultado. Isso que o paciente quer hoje, né?',
    'Quantas sessões no total? Parece que foi bem planejado o protocolo.',
  ];
  gc.forEach((txt, i) => c.push(...variation(i + 1, txt)));
  c.push(spacer());

  c.push(h3('Stories genéricos'));
  const gs = [
    'Quantos atendimentos você faz por dia? Parece uma rotina intensa.',
    'Esse procedimento é o que mais sai na sua clínica?',
    'Qual é a maior dúvida que seus pacientes têm antes de começar?',
    'Resultado rápido ou precisou de mais de uma sessão?',
    'Você tá preferindo agendar avaliação presencial ou faz online também?',
  ];
  gs.forEach((txt, i) => c.push(...variation(i + 1, txt)));

  // ═══ PARTE 6: REGRAS E MÉTRICAS ═══
  c.push(separator());
  c.push(h1('PARTE 6 — REGRAS E MÉTRICAS'));

  c.push(h2('Volume e Ritmo'));
  c.push(bullet('10 a 15 novos prospects qualificados por semana'));
  c.push(bullet('Máximo 30 prospects simultâneos no pipeline'));
  c.push(bullet('1h por dia de execução'));
  c.push(spacer());

  c.push(h2('O que NÃO fazer'));
  c.push(bullet('Mandar DM sem pré-aquecimento (3 dias mínimo)'));
  c.push(bullet('Usar o mesmo script pra todo mundo'));
  c.push(bullet('Mandar áudio na primeira mensagem'));
  c.push(bullet('Falar de preço antes da call'));
  c.push(bullet('Mais de 3 follow-ups'));
  c.push(spacer());

  c.push(h2('Posicionamento'));
  c.push(para('NUNCA diga "assessoria de marketing" ou "agência". SEMPRE:'));
  c.push(...script([
    'Trabalho só com estética e saúde.',
    'Campanha estruturada pro seu procedimento,',
    'follow-up automático por WhatsApp,',
    'e estratégia que escala',
    'sem precisar dobrar o orçamento.',
  ]));
  c.push(spacer());

  c.push(h2('Case principal'));
  c.push(...script([
    'R$600 investidos → R$10k faturados em 10 dias.',
    'Não foi sorte. Foi estratégia + automação.',
    'Tá nos destaques do meu Instagram.',
  ]));
  c.push(spacer());

  c.push(h2('Métricas pra acompanhar'));
  c.push(bullet('Taxa de resposta: DM Enviada → Em Conversa (meta: 30%+)'));
  c.push(bullet('Taxa de diagnóstico: Em Conversa → Pitch Feito (meta: 50%+)'));
  c.push(bullet('Taxa de agendamento: Pitch Feito → Call Agendada (meta: 40%+)'));
  c.push(bullet('Taxa de conversão: Call Agendada → Ganho (meta: 25%+)'));
  c.push(bullet('Ciclo médio: Qualificado → Ganho (meta: 14-21 dias)'));

  // Rodapé
  c.push(separator());
  c.push(new Paragraph({
    children: [new TextRun({ text: '— Copy-Chef · Syra Digital AIOS · Março 2026', italics: true, size: 18, color: '999999' })],
    alignment: AlignmentType.CENTER, spacing: { before: 300 }
  }));

  return new Document({
    creator: 'Copy-Chef · Syra Digital AIOS',
    title: 'Playbook Prospecção Ativa Instagram — Syra Digital',
    sections: [{
      properties: { page: { margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 } } },
      children: c
    }]
  });
}

// ─── Main ───────────────────────────────────────────

async function main() {
  const doc = buildDocument();
  const buffer = await Packer.toBuffer(doc);

  const driveDir = path.join(DRIVE_BASE, 'Prospecção');
  if (!fs.existsSync(driveDir)) fs.mkdirSync(driveDir, { recursive: true });

  const date = new Date().toISOString().split('T')[0];
  const fileName = `${date}_Playbook-Prospeccao-Ativa-Instagram.docx`;
  const filePath = path.join(driveDir, fileName);

  fs.writeFileSync(filePath, buffer);
  console.log(`✅ ${filePath}`);

  // Remover os dois docs antigos separados
  const old1 = path.join(driveDir, `${date}_Script-Prospeccao-Ativa-Instagram.docx`);
  const old2 = path.join(driveDir, `${date}_Variacoes-Scripts-Comentarios-Stories.docx`);
  if (fs.existsSync(old1)) { fs.unlinkSync(old1); console.log('🗑️  Removido doc antigo: Script'); }
  if (fs.existsSync(old2)) { fs.unlinkSync(old2); console.log('🗑️  Removido doc antigo: Variações'); }
}

main().catch(console.error);
