// Script para gerar o Playbook Prospecção Ativa v2.1 em .docx
// Baseado em dados reais (81 conversas analisadas via Instagram Graph API)

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require('docx');
const fs = require('fs');
const path = require('path');

const DRIVE_BASE = '/Users/ericsantos/Library/CloudStorage/GoogleDrive-ericsottnas@gmail.com/Meu Drive/Syra Digital';

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ text, heading: level, spacing: { before: 300, after: 150 } });
}

function subheading(text) {
  return heading(text, HeadingLevel.HEADING_2);
}

function h3(text) {
  return heading(text, HeadingLevel.HEADING_3);
}

function bold(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22 })],
    spacing: { before: 120, after: 60 }
  });
}

function para(text) {
  return new Paragraph({ text, spacing: { after: 80 }, style: 'normal' });
}

function spacer() {
  return new Paragraph({ text: '', spacing: { after: 120 } });
}

function scriptBlock(lines) {
  return lines.map(line => new Paragraph({
    children: [new TextRun({ text: line, font: 'Courier New', size: 20, italics: true })],
    spacing: { after: 40 },
    indent: { left: 400 },
    border: { left: { style: BorderStyle.SINGLE, size: 2, color: '999999', space: 8 } }
  }));
}

function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text: `• ${text}`, size: 22 })],
    spacing: { after: 60 },
    indent: { left: 300 }
  });
}

function alertBlock(lines) {
  return lines.map(line => new Paragraph({
    children: [new TextRun({ text: line, font: 'Courier New', size: 20, color: 'CC0000', bold: true })],
    spacing: { after: 40 },
    indent: { left: 400 },
    border: { left: { style: BorderStyle.SINGLE, size: 3, color: 'CC0000', space: 8 } }
  }));
}

function separator() {
  return new Paragraph({
    children: [new TextRun({ text: '────────────────────────────────────────', color: 'CCCCCC', size: 18 })],
    spacing: { before: 200, after: 200 }
  });
}

function buildDocument() {
  const doc = new Document({
    creator: 'Syra Digital AIOS',
    title: 'Playbook Prospecção Ativa Instagram v2.1 — Syra Digital',
    description: 'Playbook reescrito com dados reais de 81 conversas analisadas via Instagram Graph API',
    styles: {
      paragraphStyles: [{
        id: 'normal',
        name: 'Normal',
        run: { size: 22, font: 'Calibri' },
        paragraph: { spacing: { line: 276 } }
      }]
    },
    sections: [{
      properties: {
        page: { margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 } }
      },
      children: [

        // ═══════════════════════════════════════════
        // CAPA
        // ═══════════════════════════════════════════
        new Paragraph({ text: '', spacing: { before: 2000 } }),
        new Paragraph({
          children: [new TextRun({ text: 'PLAYBOOK PROSPECÇÃO ATIVA', bold: true, size: 48, font: 'Calibri' })],
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          children: [new TextRun({ text: 'INSTAGRAM v2.1 — SYRA DIGITAL', bold: true, size: 36, font: 'Calibri', color: '555555' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Baseado em dados reais: 81 conversas analisadas via Instagram Graph API\n17 engajadas | 4 respondidas | ~60 sem resposta', size: 24, italics: true, color: '777777' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Syra Digital AIOS\nData: ${new Date().toLocaleDateString('pt-BR')}`, size: 20, color: '999999' })],
          alignment: AlignmentType.CENTER
        }),

        separator(),

        // ═══════════════════════════════════════════
        // 1. QUALIFICAÇÃO
        // ═══════════════════════════════════════════
        heading('1. QUALIFICAÇÃO DO PROSPECT'),

        para('Antes de iniciar qualquer interação, verificar (mínimo 3 critérios):'),
        spacer(),
        bullet('Posta conteúdo de procedimentos (antes/depois, técnicas, resultados)'),
        bullet('Tem entre 1k e 50k seguidores'),
        bullet('Link na bio para agendamento ou Linktree'),
        bullet('Engajamento baixo relativo ao tamanho (sinal de tráfego pago)'),
        bullet('Postou nos últimos 7 dias'),
        bullet('Mencionou campanha, tráfego ou anúncio em stories/destaques'),
        bullet('Tem post patrocinado visível'),

        separator(),

        // ═══════════════════════════════════════════
        // 2. PRÉ-AQUECIMENTO
        // ═══════════════════════════════════════════
        heading('2. PRÉ-AQUECIMENTO (5 dias)'),

        para('O pré-aquecimento cria familiaridade antes da abordagem real. Quando a DM de abertura chegar, não é um estranho.'),
        spacer(),

        subheading('DIA 1: Curtidas em Rajada + DM Leve'),
        bullet('Curtir 6-8 posts de uma vez (rajada — ela recebe notificações agrupadas e nota seu perfil)'),
        bullet('Enviar 1 DM leve: reação a story ou emoji (máx 3 palavras)'),
        spacer(),
        bold('Scripts de DM leve:'),
        bullet('Story de procedimento/resultado → 🔥'),
        bullet('Story de antes/depois → impressionante 👏'),
        bullet('Story de técnica → que resultado!'),
        bullet('Story casual → emoji relevante (☕, 💪)'),
        spacer(),
        bold('REGRAS: Máx 3 palavras ou 1 emoji. NÃO faz pergunta. NÃO se apresenta. É toque, não conversa.'),
        bold('GHL: Webhook de DM enviada cria contato → "Aquecendo"'),
        spacer(),

        subheading('DIA 2-3: Curtidas Espaçadas'),
        bullet('Curtir 2-3 posts/dia (diferentes dos anteriores)'),
        bullet('Assistir stories (ela vê que você assistiu)'),
        bullet('NÃO enviar mensagem'),
        spacer(),

        subheading('DIA 3-4: Comentário Técnico'),
        bullet('Comentar 1 post com observação TÉCNICA sobre o procedimento'),
        bullet('Tom: colega de área, não vendedor'),
        bullet('NÃO mencionar marketing ou assessoria'),
        spacer(),

        subheading('DIA 4-5: Resposta a Story'),
        bullet('Responder 1 story com pergunta específica sobre o conteúdo'),
        bullet('Curiosidade genuína, não invasiva'),
        spacer(),

        subheading('DIA 5+: Abertura Real'),
        bullet('Mínimo 2 interações nos dias anteriores'),
        bullet('Enviar DM de abertura (scripts seção 4)'),
        bold('GHL: Mover para "DM Enviada"'),

        separator(),

        // ═══════════════════════════════════════════
        // 3. FUNIL VISUAL
        // ═══════════════════════════════════════════
        heading('3. FUNIL VISUAL'),

        ...scriptBlock([
          'QUALIFICAÇÃO → Pesquisar + Validar critérios',
          '     ↓',
          'DIA 1: Curtir 6-8 posts (rajada) + DM LEVE',
          '       → GHL cria contato → "Aquecendo"',
          '     ↓',
          'DIA 2-3: Curtir mais posts (espaçados)',
          '     ↓',
          'DIA 3-4: Comentar 1 post TÉCNICO',
          '     ↓',
          'DIA 4-5: Responder story com pergunta',
          '     ↓',
          'DIA 5+: DM DE ABERTURA REAL → "DM Enviada"',
          '     ↓',
          'RESPOSTA → "Em Conversa" → Aquecimento',
          '     ↓',
          'OFERTA DE VALOR → Dar algo grátis',
          '     ↓',
          'TRANSIÇÃO ORGÂNICA → ELA menciona dor',
          '     ↓',
          'PITCH → Apresentação → AGENDAMENTO',
        ]),

        separator(),

        // ═══════════════════════════════════════════
        // 4. ABERTURA
        // ═══════════════════════════════════════════
        heading('4. ABERTURA — Primeira DM Real (Dia 5+)'),

        bold('⭐ SCRIPT PADRÃO — 75% de taxa de resposta (VALIDADO com dados reais)'),
        spacer(),
        ...scriptBlock([
          'Que resultado incrível no último antes e depois',
          'que você postou! Pode falar quanto tempo leva',
          'no total? Sempre fico curioso com o tempo',
          'de procedimento.',
        ]),
        spacer(),
        para('Por que funciona: Elogio ESPECÍFICO ao conteúdo + pergunta TÉCNICA sobre o trabalho. Parece curiosidade genuína de alguém do nicho.'),
        spacer(),

        bold('Variações validadas:'),
        spacer(),
        ...scriptBlock([
          'Que resultado top! Você vende protocolos',
          'isolados ou completos?',
        ]),
        spacer(),
        ...scriptBlock([
          'Vi seu último antes e depois de [procedimento].',
          'Ficou muito natural. Quantas sessões foram?',
        ]),
        spacer(),

        subheading('A — Roda campanha (ads visíveis)'),
        spacer(),
        ...scriptBlock([
          'Vi que você já roda campanha.',
          'Tá conseguindo escalar ou o custo por resultado',
          'não tá compensando?',
        ]),
        spacer(),

        subheading('B — Link na bio sem automação'),
        spacer(),
        ...scriptBlock([
          'Você tem bom volume de conteúdo.',
          'O que acontece com quem clica no link da bio',
          'e não agenda? Tem algum follow-up?',
        ]),
        spacer(),

        subheading('C — Perfil forte, engajamento baixo'),
        spacer(),
        ...scriptBlock([
          'Fui no seu perfil depois de ver seu Reel',
          'sobre [procedimento específico].',
          'Você posta consistente, mas o engajamento não tá',
          'na proporção do que o conteúdo merece.',
          'Sabe o que tá travando?',
        ]),
        spacer(),

        bold('❌ SCRIPTS MORTOS — NUNCA USAR (0% taxa de resposta)'),
        spacer(),
        ...alertBlock([
          '❌ "Oii, Dra!!! Tudo bem? Comecei a te seguir',
          '   agora, me surpreendi com esses resultados 👏👏"',
          '',
          '→ 0% resposta em 4+ envios. Parece bot.',
          '→ NUNCA usar "comecei a te seguir agora".',
          '',
          '❌ "Oi! Vi seu perfil e gostei muito',
          '   do seu trabalho!"',
          '',
          '→ Elogio genérico sem pergunta = 0 respostas.',
          '',
          '❌ Qualquer abertura sem pergunta específica',
          '→ Sem pergunta = sem resposta. SEMPRE terminar',
          '  com pergunta TÉCNICA.',
        ]),

        separator(),

        // ═══════════════════════════════════════════
        // 5. AQUECIMENTO
        // ═══════════════════════════════════════════
        heading('5. AQUECIMENTO — Após Resposta Dela'),

        bold('⚠️ REGRA DOS 2 (CRÍTICA — validada com dados reais)'),
        para('Máximo 2 perguntas seguidas. Se ela respondeu 2 perguntas sem perguntar nada de volta, PARAR de perguntar e mudar pra validação/elogio.'),
        spacer(),
        para('Caso real (Ester Guedes): Eric fez 3 perguntas seguidas → ela detectou venda → cortou: "percebi que essa conversa se trata de venda do seu trabalho"'),
        para('Caso real (Larissa Gonçalves): Perguntas sobre demanda, concorrência → "O intuito das perguntas é o que?!" → lead perdido'),
        spacer(),

        subheading('5.1 Protocolo "Obrigada Seco" (NOVO)'),
        bold('"Obrigada 🙏" = sinal de encerramento. NÃO insistir.'),
        spacer(),
        bullet('Responder leve: "Sucesso, Dra! 🙌" (sem pergunta)'),
        bullet('Esperar 5-7 dias — sem nenhuma interação'),
        bullet('Retomar por outro ângulo (story diferente, emoji novo)'),
        bullet('Se repetir "obrigada seco" → mover para "Sem Resposta"'),
        spacer(),
        ...alertBlock([
          '❌ NUNCA: "Dra, tudo bem? Tá por aí?" (soa ansioso)',
          '❌ NUNCA: Mais de 3 msgs sem resposta (soa desesperado)',
        ]),
        spacer(),

        subheading('Resposta CURTA mas positiva'),
        spacer(),
        ...scriptBlock([
          'Quanto tempo você atua com [procedimento]?',
          'Foi fácil pegar clientela desde o início',
          'ou demorou?',
        ]),
        spacer(),

        subheading('Resposta LONGA (ela contou algo)'),
        bold('Validar PRIMEIRO, depois pergunta (se natural):'),
        spacer(),
        ...scriptBlock([
          'Faz sentido! Dá pra ver que você é cuidadosa',
          'com [aspecto que ela mencionou].',
          'Isso faz diferença.',
        ]),
        para('Se ela continuar respondendo:'),
        ...scriptBlock([
          'E essa demanda veio mais por boca a boca',
          'ou pelas redes?',
        ]),
        spacer(),

        subheading('Ela perguntou o que você faz'),
        spacer(),
        ...scriptBlock([
          'Trabalho com assessoria de marketing só pra',
          'estética e saúde. Ajudo a estruturar campanha',
          'por procedimento com follow-up automático.',
          '',
          'Mas tô mais curioso sobre o seu trabalho —',
          'qual é o procedimento que mais sai',
          'na sua clínica?',
        ]),
        spacer(),

        subheading('Truque do Autêntico (VALIDADO)'),
        para('Caso real (Tammy Torres): Eric disse "Que resultado top, pqp 👏 / desculpa o palavrão" → ela: "😂😂😂😂 / ♥️♥️"'),
        para('Ser genuíno e espontâneo funciona melhor que scripts formais.'),

        separator(),

        // ═══════════════════════════════════════════
        // 6. OFERTA DE VALOR
        // ═══════════════════════════════════════════
        heading('6. OFERTA DE VALOR — Dar Antes de Pedir (NOVO)'),

        para('Antes de qualquer transição para negócio, oferecer algo de VALOR REAL gratuitamente. Inverte a dinâmica: em vez de pedir atenção, você dá.'),
        spacer(),
        para('Caso real (Erica Mello): Eric ofereceu edição grátis → abordagem diferenciada que gera reciprocidade.'),
        spacer(),

        subheading('OV1 — Edição de vídeo grátis'),
        spacer(),
        ...scriptBlock([
          'Gostei muito da sua didática nesse último vídeo.',
          'Quero te fazer uma proposta:',
          'posso fazer uma edição profissional dele',
          'pra você, sem custo.',
          'Me manda o vídeo original?',
        ]),
        spacer(),

        subheading('OV2 — Análise de perfil'),
        spacer(),
        ...scriptBlock([
          'Tava vendo seu perfil com olho profissional',
          'e vi uns pontos que dariam pra otimizar fácil.',
          'Posso te mandar uma análise rápida?',
          'Sem compromisso.',
        ]),
        spacer(),

        subheading('OV3 — Feedback criativo'),
        spacer(),
        ...scriptBlock([
          'Vi seus últimos criativos e tenho umas sugestões',
          'que podem melhorar a performance.',
          'Posso te mandar um feedback rápido?',
        ]),
        spacer(),

        subheading('OV4 — Dica específica do nicho'),
        spacer(),
        ...scriptBlock([
          'Vi que você tá postando [tipo de conteúdo].',
          'Tenho visto [insight do nicho].',
          'Quer que eu te mande uns exemplos',
          'do que tá convertendo bem pra [procedimento]?',
        ]),
        spacer(),

        bold('REGRAS:'),
        bullet('Oferecer algo que você REALMENTE pode entregar'),
        bullet('NÃO condicionar a nada (sem "faço isso se...")'),
        bullet('Se ela aceitar → entregar com qualidade → transição natural'),
        bullet('NÃO mencionar assessoria, venda ou preço'),

        separator(),

        // ═══════════════════════════════════════════
        // 7. TRANSIÇÃO ORGÂNICA
        // ═══════════════════════════════════════════
        heading('7. TRANSIÇÃO — Orgânica, Não Forçada (REESCRITO)'),

        bold('⚠️ A transição NÃO é feita por você. É feita PELA PROSPECT.'),
        spacer(),
        para('Erro fatal documentado: Sequência de perguntas diagnósticas = detectada como venda em 100% dos casos testados.'),
        para('O que funciona: Esperar ELA mencionar naturalmente uma dor/desafio, e REAGIR.'),
        spacer(),

        subheading('T1 — Ela mencionou dificuldade em atrair clientes'),
        bold('REAGIR (não diagnosticar):'),
        spacer(),
        ...scriptBlock([
          'Faz sentido. A maioria que eu conheço do seu',
          'segmento tem esse mesmo desafio.',
          'O que mais funciona pra atrair paciente novo',
          'no seu caso — indicação ou redes?',
        ]),
        para('Se ela disser indicação ou redes não funcionam:'),
        ...scriptBlock([
          'Uma das minhas clientes tava nesse ponto.',
          'Investia R$600 e faturou R$10k em 10 dias.',
          'Não mudou o orçamento — mudou a estrutura.',
          '',
          'Se quiser, posso te mostrar em 20 minutos',
          'o que dá pra ajustar.',
        ]),
        spacer(),

        subheading('T2 — Ela já tem agência/marketing'),
        bold('NÃO competir. Posicionar como segunda opinião:'),
        spacer(),
        ...scriptBlock([
          'Legal! Ter alguém cuidando é importante.',
          'Se em algum momento você quiser',
          'uma segunda visão, tô por aqui.',
          'Às vezes ajuda validar se o rumo tá certo.',
        ]),
        spacer(),

        subheading('T3 — Ela mencionou faturamento/crescimento'),
        spacer(),
        ...scriptBlock([
          'Bacana! E essa demanda é consistente',
          'ou varia muito de mês pra mês?',
        ]),
        para('Se mencionar variação:'),
        ...scriptBlock([
          'Faz sentido. Quando não tem estratégia constante,',
          'fica na onda do momento.',
          'Posso te mostrar como algumas clientes',
          'estabilizaram isso — 20 min, sem compromisso.',
        ]),
        spacer(),

        subheading('T4 — Ela NÃO mencionou dor (tudo bem)'),
        bold('NÃO forçar. Manter relacionamento:'),
        spacer(),
        ...scriptBlock([
          'Que bom! Quando tiver interesse em explorar',
          'como crescer ainda mais, é só chamar.',
          'Vou continuar acompanhando seu trabalho.',
        ]),
        para('Mover para follow-up leve. Transição pode levar semanas.'),
        spacer(),

        bold('❌ O QUE NUNCA FAZER NA TRANSIÇÃO'),
        spacer(),
        ...alertBlock([
          '❌ Sequência de 3+ perguntas diagnósticas',
          '   → detectada como venda em 100% dos casos',
          '❌ "E você investe em marketing?" → ameaçador',
          '❌ "Como tá a concorrência?" → gera defensividade',
          '❌ Mudar tom abruptamente → prospect percebe',
          '❌ Revelar automação/IA → lead morre instantâneo',
          '❌ Insistir após "já tenho alguém" → prospect bloqueia',
        ]),

        separator(),

        // ═══════════════════════════════════════════
        // 8. PITCH
        // ═══════════════════════════════════════════
        heading('8. PITCH — Apresentação da Assessoria'),

        subheading('P1 — Ela demonstrou interesse genuíno'),
        spacer(),
        ...scriptBlock([
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
        ]),
        spacer(),

        subheading('P2 — Com pé atrás'),
        spacer(),
        ...scriptBlock([
          'Vou ser transparente.',
          'Eu trabalho SÓ com estética e saúde.',
          'Por isso sei exatamente o que funciona',
          'no seu nicho.',
          '',
          'Os números tão nos meus destaques.',
          'R$600 investidos, R$10k faturados em 10 dias.',
          '',
          'Se você der 20 minutos, saio de lá',
          'com um diagnóstico do que tá travando.',
          'Se não fizer sentido, sem problema.',
        ]),

        separator(),

        // ═══════════════════════════════════════════
        // 9. AGENDAMENTO
        // ═══════════════════════════════════════════
        heading('9. AGENDAMENTO'),

        subheading('AG1 — Propor horário'),
        spacer(),
        ...scriptBlock([
          'Ótimo. Vou te mandar meu link de agenda.',
          'Escolhe o dia que funcionar melhor pra você.',
          '',
          'A call é por Google Meet, 20 minutos.',
          'Vou analisar suas campanhas antes',
          'pra já chegar com diagnóstico pronto.',
          '',
          '[LINK DO CALENDÁRIO]',
        ]),
        spacer(),

        subheading('AG2 — Confirmar'),
        spacer(),
        ...scriptBlock([
          'Confirmado pra [dia] às [hora].',
          '',
          'Vou mandar o link da call umas horas antes.',
          '',
          'Se puder, me manda o @ do seu Instagram',
          'de anúncios antes da call —',
          'assim já faço a análise prévia.',
        ]),
        spacer(),

        subheading('AG3 — Lembrete 24h antes'),
        spacer(),
        ...scriptBlock([
          'Oi! Lembrete da nossa call hoje às [hora].',
          '',
          'Aqui o link: [LINK GOOGLE MEET]',
          '',
          'Já analisei seu perfil e tenho umas',
          'observações interessantes. Até já!',
        ]),

        separator(),

        // ═══════════════════════════════════════════
        // 10. FOLLOW-UP
        // ═══════════════════════════════════════════
        heading('10. FOLLOW-UP'),

        subheading('FU1 — 4 dias sem resposta'),
        spacer(),
        ...scriptBlock([
          'Só retornando aqui.',
          'Se o problema ainda existe, vale 20 minutos.',
          '',
          'Quando você tem uma janela essa semana?',
        ]),
        spacer(),

        subheading('FU2 — 7 dias'),
        spacer(),
        ...scriptBlock([
          'Oi! Sem pressão.',
          'Se em algum momento quiser olhar',
          'pras suas campanhas com alguém',
          'que só trabalha com estética, é só chamar.',
          '',
          'Vou deixar meu link de agenda aqui:',
          '[LINK DO CALENDÁRIO]',
        ]),
        spacer(),

        subheading('FU3 — 14 dias (último)'),
        spacer(),
        ...scriptBlock([
          'Última mensagem sobre isso.',
          'Se fizer sentido no futuro, meu perfil tá aqui.',
          '',
          'Sucesso com as campanhas!',
        ]),
        spacer(),

        bold('Follow-up Natural (VALIDADO — funciona melhor que FU longo)'),
        spacer(),
        ...scriptBlock([
          'Como tá?',
        ]),
        spacer(),
        ...scriptBlock([
          'Oii, achei que tinha te respondido',
        ]),
        spacer(),
        ...alertBlock([
          '❌ NÃO usar: "Dra, tudo bem? Tá por aí?" (soa ansioso)',
        ]),

        separator(),

        // ═══════════════════════════════════════════
        // 11. OBJEÇÕES
        // ═══════════════════════════════════════════
        heading('11. OBJEÇÕES'),

        subheading('OBJ1 — "Já tenho agência"'),
        spacer(),
        ...scriptBlock([
          'Entendo. Não to pedindo pra trocar agora.',
          '',
          'Se em algum momento quiser uma segunda opinião',
          'ou validar o que vocês estão fazendo,',
          'tô por aqui. Sem custos, sem compromisso.',
        ]),
        spacer(),

        subheading('OBJ2 — "Já tentei e não funcionou"'),
        spacer(),
        ...scriptBlock([
          'Entendo. A maioria faz o genérico:',
          'post bonito, legenda e torcida.',
          '',
          'O que eu faço é diferente:',
          'trabalho só com estética e saúde.',
          'Sei o que converte nesse nicho.',
          'E automatizo o follow-up.',
          '',
          '20 minutos. Se não fizer sentido,',
          'pelo menos você sai com clareza',
          'do que mudar.',
        ]),
        spacer(),

        subheading('OBJ3 — "Meu tráfego tá indo bem"'),
        spacer(),
        ...scriptBlock([
          'Ótimo. Então você já tem a base.',
          '',
          'Na maioria das clínicas, 60% do faturamento',
          'possível fica na mesa por falta',
          'de follow-up estruturado.',
          'Se quiser explorar isso, é só chamar.',
        ]),
        spacer(),

        subheading('OBJ4 — "Sem budget"'),
        spacer(),
        ...scriptBlock([
          'Sem problema.',
          'Mas quanto você deixa de faturar por mês',
          'por não ter um sistema que fecha',
          'os leads que já chegam?',
          '',
          'É disso que a gente conversa.',
          '20 minutos, sem compromisso.',
        ]),
        spacer(),

        subheading('OBJ5 — "Vou pensar"'),
        spacer(),
        ...scriptBlock([
          'Beleza. Sem pressa.',
          'Vou deixar meu link de agenda aqui.',
          'Quando fizer sentido, é só marcar.',
          '',
          '[LINK DO CALENDÁRIO]',
        ]),

        separator(),

        // ═══════════════════════════════════════════
        // 12. MÉTRICAS
        // ═══════════════════════════════════════════
        heading('12. MÉTRICAS (Dados Reais + Targets)'),

        bold('Baseline Real (81 conversas analisadas):'),
        bullet('Taxa de resposta: 26% (21/81)'),
        bullet('Taxa de engajamento (2+ respostas): 21% (17/81)'),
        bullet('NO-REPLY: 74% (60/81)'),
        spacer(),

        bold('Targets Operacionais:'),
        bullet('Novos prospects/semana: 10-15'),
        bullet('Máximo simultâneo no pipeline: 30'),
        bullet('DM Enviada → Em Conversa: 30%+'),
        bullet('Em Conversa → Oferta/Transição: 50%+'),
        bullet('Transição → Call Agendada: 40%+'),
        bullet('Call Agendada → Ganho: 25%+'),
        bullet('Ciclo médio: 14-21 dias'),

        separator(),

        // ═══════════════════════════════════════════
        // 13. REGRAS DE OURO
        // ═══════════════════════════════════════════
        heading('13. REGRAS DE OURO (Dados Reais)'),

        bold('✅ FAZER:'),
        bullet('Elogiar algo ESPECÍFICO do conteúdo (procedimento, resultado, técnica)'),
        bullet('SEMPRE terminar abertura com pergunta TÉCNICA — sem pergunta = sem resposta'),
        bullet('Tom casual: "kkkkk", emoji natural — parecer humano'),
        bullet('DM leve com 👏 ou 🔥 — zero taxa de rejeição'),
        bullet('Máximo 2 perguntas seguidas — depois validar/elogiar'),
        bullet('Esperar ELA mencionar dor antes de oferecer solução'),
        bullet('Ser autêntico (ex: "pqp" + "desculpa o palavrão")'),
        bullet('Oferecer valor grátis quando possível (edição, análise, dica)'),
        bullet('"Como tá?" funciona melhor que follow-up longo'),
        bullet('Curtir em rajada (6-8) no Dia 1'),
        spacer(),

        bold('❌ NÃO FAZER:'),
        bullet('"Comecei a te seguir agora" — NUNCA (0% resposta, soa bot)'),
        bullet('Sequência de perguntas diagnósticas — detectada como venda'),
        bullet('Mais de 3 mensagens sem resposta — soa desesperado'),
        bullet('Transição abrupta pra marketing'),
        bullet('Elogio genérico sem pergunta'),
        bullet('Revelar automação/IA = morte do lead'),
        bullet('"Obrigada 🙏" = encerramento → NÃO insistir'),
        bullet('"Como tá a concorrência?" = ameaçador'),
        bullet('Perguntar sobre marketing diretamente'),
        bullet('Insistir após objeção — respeitar, deixar porta aberta'),

        separator(),

        new Paragraph({
          children: [new TextRun({ text: 'Playbook Prospecção Ativa Instagram v2.1 — Syra Digital AIOS\nBaseado em análise real de 81 conversas via Instagram Graph API — Março 2026', italics: true, size: 18, color: '999999' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 }
        }),
      ]
    }]
  });

  return doc;
}

async function main() {
  const doc = buildDocument();
  const buffer = await Packer.toBuffer(doc);

  // Salvar no Drive
  const driveDir = path.join(DRIVE_BASE, 'Prospecção');
  if (!fs.existsSync(driveDir)) {
    fs.mkdirSync(driveDir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const fileName = `${date}_Playbook-Prospeccao-Ativa-Instagram-v2.1.docx`;
  const filePath = path.join(driveDir, fileName);

  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Documento salvo no Drive: ${filePath}`);

  // Salvar cópia local
  const localPath = path.join(__dirname, fileName);
  fs.writeFileSync(localPath, buffer);
  console.log(`✅ Cópia local: ${localPath}`);
}

main().catch(console.error);
