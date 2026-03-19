// Script para gerar o documento .docx de prospecção ativa Instagram
// Gerado pelo Copy-Chef para Eric Santos / Syra Digital

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TabStopType, BorderStyle } = require('docx');
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

function numberedItem(num, text, isBold = false) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${num}. `, bold: true, size: 22 }),
      new TextRun({ text, bold: isBold, size: 22 })
    ],
    spacing: { after: 60 },
    indent: { left: 200 }
  });
}

function separator() {
  return new Paragraph({
    children: [new TextRun({ text: '────────────────────────────────────────', color: 'CCCCCC', size: 18 })],
    spacing: { before: 200, after: 200 }
  });
}

function buildDocument() {
  const doc = new Document({
    creator: 'Copy-Chef · Syra Digital AIOS',
    title: 'Script Prospecção Ativa Instagram — Syra Digital',
    description: 'Script completo de prospecção quente no Instagram para aquisição de clientes da assessoria Syra Digital',
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
          children: [new TextRun({ text: 'SCRIPT DE PROSPECÇÃO ATIVA', bold: true, size: 48, font: 'Calibri' })],
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          children: [new TextRun({ text: 'INSTAGRAM — SYRA DIGITAL', bold: true, size: 36, font: 'Calibri', color: '555555' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Prospecção quente para profissionais de estética e saúde\nque já investem em tráfego pago', size: 24, italics: true, color: '777777' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Preparado por: Copy-Chef · Syra Digital AIOS\nData: ${new Date().toLocaleDateString('pt-BR')}`, size: 20, color: '999999' })],
          alignment: AlignmentType.CENTER
        }),

        // ═══════════════════════════════════════════
        // ICP E QUALIFICAÇÃO
        // ═══════════════════════════════════════════
        heading('1. ICP — QUEM ABORDAR'),

        subheading('1.1 Perfil do Prospect'),
        bullet('Médicos, biomédicos, profissionais de estética e saúde'),
        bullet('Atuam com: lipo sem corte, criolipólise, lipo de papada, preenchedores, bioestimuladores, harmonização orofacial'),
        bullet('JÁ INVESTEM em tráfego pago (Meta Ads, Google Ads)'),
        bullet('Nível de consciência ALTO: sabem que precisam de marketing, mas não estão tendo resultado proporcional'),
        bullet('NÃO são iniciantes: quem nunca investiu em marketing não é prospect'),
        spacer(),

        subheading('1.2 Sinais de Qualificação no Perfil'),
        para('Antes de abordar QUALQUER pessoa, verificar se ela tem pelo menos 3 desses sinais:'),
        spacer(),
        numberedItem(1, 'Posta conteúdo de procedimentos (antes/depois, técnicas, resultados)'),
        numberedItem(2, 'Tem entre 1k e 50k seguidores (abaixo = sem budget; acima = já tem agência)'),
        numberedItem(3, 'Link na bio para agendamento, Linktree ou site com booking'),
        numberedItem(4, 'Engajamento baixo relativo ao tamanho — sinal de dependência de tráfego pago'),
        numberedItem(5, 'Postou nos últimos 7 dias (está ativa)'),
        numberedItem(6, 'Mencionou "campanha", "tráfego" ou "anúncio" em stories/destaques'),
        numberedItem(7, 'Tem post patrocinado visível'),
        spacer(),
        bold('Se tem 3+ sinais → QUALIFICADO. Mover para o pipeline GHL: "Qualificado"'),
        bold('Se tem menos de 3 → NÃO ABORDAR. Não perca tempo.'),

        separator(),

        // ═══════════════════════════════════════════
        // PIPELINE GHL
        // ═══════════════════════════════════════════
        heading('2. PIPELINE GHL — ESTÁGIOS'),

        para('Cada estágio do pipeline corresponde a uma fase do script. Mover o lead conforme a conversa avança.'),
        spacer(),

        numberedItem(1, 'QUALIFICADO — Perfil verificado pelos critérios acima', true),
        para('   Ação: verificar perfil, anotar procedimentos, volume de seguidores, sinais de ads'),
        spacer(),

        numberedItem(2, 'AQUECENDO — Pré-engajamento ativo (3 a 5 dias)', true),
        para('   Ação: curtir 3-4 posts, comentar 1 post, responder 1 story'),
        spacer(),

        numberedItem(3, 'DM ENVIADA — Abertura mandada', true),
        para('   Ação: enviar script de abertura (Seção 4)'),
        spacer(),

        numberedItem(4, 'EM CONVERSA — Respondeu, conversa ativa', true),
        para('   Ação: executar scripts de aquecimento e transição (Seções 5 e 6)'),
        spacer(),

        numberedItem(5, 'PITCH FEITO — Case apresentado, call sugerida', true),
        para('   Ação: script de pitch enviado (Seção 7)'),
        spacer(),

        numberedItem(6, 'CALL AGENDADA — Reunião confirmada', true),
        para('   Ação: confirmar data/horário, enviar lembrete 24h antes'),
        spacer(),

        numberedItem(7, 'PROPOSTA ENVIADA — Pós-call', true),
        para('   Ação: enviar proposta comercial após a reunião'),
        spacer(),

        numberedItem(8, 'GANHO — Fechou', true),
        para('   Ação: onboarding do novo cliente'),
        spacer(),

        numberedItem(9, 'SEM RESPOSTA — Follow-up pendente', true),
        para('   Ação: executar scripts de follow-up (Seção 9) — após 4 dias sem resposta'),
        spacer(),

        numberedItem(10, 'PERDIDO — Descartado', true),
        para('   Critério: sem resposta após 2 follow-ups OU objeção definitiva'),

        separator(),

        // ═══════════════════════════════════════════
        // PRÉ-AQUECIMENTO
        // ═══════════════════════════════════════════
        heading('3. PRÉ-AQUECIMENTO (3 a 5 dias)'),

        para('Objetivo: quando a DM chegar, ela já te viu 3 vezes. Não é mais um estranho.'),
        spacer(),

        subheading('Dia 1-2: Curtir'),
        bullet('Curtir 3-4 posts recentes do feed (NÃO todos de uma vez — espaçar)'),
        bullet('Priorizar posts de procedimentos e resultados (antes/depois)'),
        bullet('NÃO curtir posts pessoais/lifestyle neste momento'),
        spacer(),

        subheading('Dia 3: Comentar'),
        para('Comentar 1 post com observação ESPECÍFICA do procedimento. Exemplos:'),
        spacer(),
        ...scriptBlock([
          'Post de criolipólise:',
          '"Essa abordagem com duas ponteiras simultâneas reduz',
          'o tempo de sessão pela metade. Você usa em todas as regiões?"'
        ]),
        spacer(),
        ...scriptBlock([
          'Post de preenchimento:',
          '"Resultado natural. Qual é sua abordagem pra manter',
          'a proporção sem ficar artificial?"'
        ]),
        spacer(),
        ...scriptBlock([
          'Post de bioestimulador:',
          '"Interessante a evolução em 30 dias.',
          'Quantas sessões nesse protocolo?"'
        ]),
        spacer(),
        bold('REGRA: O comentário tem que mostrar que você ENTENDE o procedimento. Não é "lindo trabalho!". É uma pergunta técnica que prova credibilidade.'),
        spacer(),

        subheading('Dia 4-5: Responder Story'),
        para('Responder 1 story com algo genuíno. Exemplos:'),
        spacer(),
        ...scriptBlock([
          'Story de procedimento:',
          '"O tempo de recuperação dessa técnica é curto, né?',
          'Paciente sai andando?"'
        ]),
        spacer(),
        ...scriptBlock([
          'Story de resultado:',
          '"Esse resultado em 10 dias é consistente',
          'ou varia muito de paciente pra paciente?"'
        ]),
        spacer(),

        bold('Após dia 5 → Mover para "DM Enviada" e executar Seção 4.'),

        separator(),

        // ═══════════════════════════════════════════
        // ABERTURA
        // ═══════════════════════════════════════════
        heading('4. ABERTURA — Primeira DM'),

        para('Regras da abertura:'),
        bullet('NUNCA elogio genérico ("adorei seu trabalho")'),
        bullet('NUNCA se apresentar primeiro ("sou da agência X")'),
        bullet('SEMPRE observação específica do perfil + pergunta de diagnóstico'),
        bullet('TOM: consultivo, direto, curto'),
        spacer(),

        subheading('Script A — Ela roda campanha (sinal visível de ads)'),
        spacer(),
        ...scriptBlock([
          'Vi que você já roda campanha.',
          '',
          'Pergunta direta: você tá conseguindo escalar',
          'ou chegou num ponto que o custo por resultado',
          'não tá compensando?'
        ]),
        spacer(),

        subheading('Script B — Ela tem link na bio mas sem automação'),
        spacer(),
        ...scriptBlock([
          'Você tem um bom volume de conteúdo',
          'e já investe em tráfego.',
          '',
          'Mas o que acontece com quem clica no link da bio',
          'e não agenda?',
          'Você tem algum follow-up',
          'ou perde esse lead?'
        ]),
        spacer(),

        subheading('Script C — Perfil forte mas engajamento baixo'),
        spacer(),
        ...scriptBlock([
          'Fui no seu perfil depois de ver seu Reel',
          'sobre [procedimento específico].',
          '',
          'Você posta consistente.',
          'Mas o engajamento não tá na proporção',
          'do que o seu conteúdo merece.',
          '',
          'Você sabe o que tá travando a conversão?'
        ]),
        spacer(),

        subheading('Script D — Genérico (quando não tem sinal claro)'),
        spacer(),
        ...scriptBlock([
          'Vi seu trabalho com [procedimento].',
          'Resultado consistente.',
          '',
          'Uma curiosidade:',
          'quanto do seu agendamento vem do Instagram',
          'versus indicação?'
        ]),
        spacer(),

        bold('Após enviar → Pipeline GHL: "DM Enviada"'),
        bold('Se respondeu → Pipeline GHL: "Em Conversa" + executar Seção 5'),
        bold('Se não respondeu em 4 dias → Pipeline GHL: "Sem Resposta" + executar Seção 9'),

        separator(),

        // ═══════════════════════════════════════════
        // AQUECIMENTO
        // ═══════════════════════════════════════════
        heading('5. AQUECIMENTO — Após Resposta'),

        para('Ela respondeu. Agora o objetivo é aprofundar sem vender. Entender a situação real.'),
        spacer(),

        subheading('Se resposta CURTA (poucas palavras, genérica)'),
        spacer(),
        ...scriptBlock([
          'Entendido. E você tá rodando campanha sozinha',
          'ou tem alguém cuidando do tráfego?',
          '',
          'Porque isso muda tudo na hora de escalar.'
        ]),
        spacer(),

        subheading('Se resposta LONGA (contou sobre o negócio)'),
        spacer(),
        ...scriptBlock([
          'Entendido. Você tem volume de trabalho mas',
          'o digital não tá correspondendo ao nível',
          'do seu serviço.',
          '',
          'Uma pergunta direta:',
          'você já tentou escalar a campanha?',
          'O que aconteceu com o custo?'
        ]),
        spacer(),

        subheading('Se ela confirmou problema com custo/escala'),
        spacer(),
        ...scriptBlock([
          'Faz sentido. Isso é o padrão quando',
          'a estratégia não foi montada pro seu',
          'procedimento específico.',
          '',
          'Campanha genérica de estética',
          'não converte igual campanha feita',
          'pra [procedimento específico dela].',
          '',
          'Você tá rodando com criativo',
          'estático, vídeo, ou os dois?'
        ]),
        spacer(),

        subheading('Se ela perguntou "e você, o que faz?"'),
        spacer(),
        ...scriptBlock([
          'Trabalho só com estética e saúde.',
          'Não faço marketing genérico.',
          '',
          'Meu foco é campanha estruturada',
          'pro procedimento específico do profissional,',
          'com follow-up automático por WhatsApp.',
          '',
          'Mas antes de falar de mim:',
          'qual é o maior gargalo que você tem',
          'hoje nas suas campanhas?'
        ]),

        separator(),

        // ═══════════════════════════════════════════
        // TRANSIÇÃO
        // ═══════════════════════════════════════════
        heading('6. TRANSIÇÃO — Abrindo para o Pitch'),

        para('Ela revelou o problema. Agora conectar com o case e sugerir a call.'),
        para('REGRA: Só avançar pra transição quando ela FALOU de uma dor concreta (custo alto, não escala, agency ruim, etc.)'),
        spacer(),

        subheading('Script T1 — Ela mencionou custo alto / não consegue escalar'),
        spacer(),
        ...scriptBlock([
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
          'o que tá travando nas suas campanhas?'
        ]),
        spacer(),

        subheading('Script T2 — Ela mencionou agency ruim / descontente'),
        spacer(),
        ...scriptBlock([
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
          'o que dá pra ajustar sem mudar seu orçamento?'
        ]),
        spacer(),

        subheading('Script T3 — Ela mencionou que faz sozinha (sem agência)'),
        spacer(),
        ...scriptBlock([
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
          'como funciona?'
        ]),

        separator(),

        // ═══════════════════════════════════════════
        // PITCH
        // ═══════════════════════════════════════════
        heading('7. PITCH — Apresentação da Assessoria'),

        para('Ela concordou em ouvir. Agora apresentar de forma curta, conectada à dor que ela falou.'),
        spacer(),

        subheading('Script P1 — Pitch Curto (ela tá interessada)'),
        spacer(),
        ...scriptBlock([
          'Perfeito. Então aqui é o que eu entrego:',
          '',
          '1. Campanha estruturada pro seu procedimento',
          '   (não genérica de "estética")',
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
          'pra eu analisar sua situação específica?'
        ]),
        spacer(),

        subheading('Script P2 — Pitch com Prova (ela tá com pé atrás)'),
        spacer(),
        ...scriptBlock([
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
          'Se não fizer sentido, sem problema.'
        ]),

        separator(),

        // ═══════════════════════════════════════════
        // AGENDAMENTO
        // ═══════════════════════════════════════════
        heading('8. AGENDAMENTO — Marcar a Reunião'),

        subheading('Script AG1 — Propor horário'),
        spacer(),
        ...scriptBlock([
          'Ótimo.',
          '',
          'Vou te mandar meu link de agenda.',
          'Escolhe o dia que funcionar melhor pra você.',
          '',
          'A call é por Google Meet, 20 minutos.',
          'Vou analisar suas campanhas antes',
          'pra já chegar com diagnóstico pronto.',
          '',
          '[LINK DO CALENDÁRIO]'
        ]),
        spacer(),

        subheading('Script AG2 — Confirmar'),
        spacer(),
        ...scriptBlock([
          'Confirmado pra [dia] às [hora].',
          '',
          'Vou mandar o link da call',
          'umas horas antes.',
          '',
          'Se puder, me manda o @ do seu Instagram',
          'de anúncios antes da call —',
          'assim já faço a análise prévia.'
        ]),
        spacer(),

        subheading('Script AG3 — Lembrete (24h antes)'),
        spacer(),
        ...scriptBlock([
          'Oi! Lembrete da nossa call hoje às [hora].',
          '',
          'Aqui o link: [LINK GOOGLE MEET]',
          '',
          'Já analisei seu perfil e tenho',
          'umas observações interessantes.',
          'Até já!'
        ]),

        separator(),

        // ═══════════════════════════════════════════
        // FOLLOW-UP
        // ═══════════════════════════════════════════
        heading('9. FOLLOW-UP — Reengajamento'),

        para('Usar quando: não respondeu a DM, sumiu após conversa, ou disse "vou pensar".'),
        spacer(),

        subheading('FU1 — 4 dias após DM sem resposta'),
        spacer(),
        ...scriptBlock([
          'Só retornando aqui.',
          '',
          'Se o problema de escalar campanha',
          'ainda existe, vale 20 minutos.',
          '',
          'Quando você tem uma janela essa semana?'
        ]),
        spacer(),

        subheading('FU2 — 7 dias após (segundo follow-up)'),
        spacer(),
        ...scriptBlock([
          'Oi! Passando aqui de novo.',
          '',
          'Sem pressão.',
          'Mas se em algum momento',
          'você quiser olhar pras suas campanhas',
          'com alguém que só trabalha com estética,',
          'é só chamar.',
          '',
          'Vou deixar meu link de agenda aqui:',
          '[LINK DO CALENDÁRIO]'
        ]),
        spacer(),

        subheading('FU3 — Último follow-up (14 dias)'),
        spacer(),
        ...scriptBlock([
          'Última mensagem sobre isso.',
          '',
          'Se fizer sentido no futuro,',
          'meu perfil tá aqui.',
          '',
          'Sucesso com as campanhas!'
        ]),
        spacer(),

        bold('Após FU3 sem resposta → Pipeline GHL: "Perdido"'),
        bold('NÃO mandar mais follow-up. Respeitar o espaço.'),

        separator(),

        // ═══════════════════════════════════════════
        // OBJEÇÕES
        // ═══════════════════════════════════════════
        heading('10. OBJEÇÕES — Respostas Prontas'),

        subheading('OBJ1 — "Já tenho agência"'),
        spacer(),
        ...scriptBlock([
          'Entendo. Não to pedindo pra trocar agora.',
          '',
          'Uma pergunta só:',
          'você consegue dizer com precisão',
          'qual campanha, qual criativo',
          'e qual procedimento trouxe cada real',
          'que você faturou esse mês?',
          '',
          'Se não — isso é o gap.',
          'E é exatamente onde eu trabalho.'
        ]),
        spacer(),

        subheading('OBJ2 — "Já tentei agência e não funcionou"'),
        spacer(),
        ...scriptBlock([
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
          'do que mudar.'
        ]),
        spacer(),

        subheading('OBJ3 — "Meu tráfego tá indo bem"'),
        spacer(),
        ...scriptBlock([
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
          'de follow-up estruturado.'
        ]),
        spacer(),

        subheading('OBJ4 — "Sem budget agora"'),
        spacer(),
        ...scriptBlock([
          'Sem problema.',
          '',
          'Mas quanto você deixa de faturar',
          'por mês por não ter um sistema',
          'que fecha os leads que já chegam?',
          '',
          'É disso que a gente conversa.',
          '20 minutos, sem compromisso.'
        ]),
        spacer(),

        subheading('OBJ5 — "Vou pensar"'),
        spacer(),
        ...scriptBlock([
          'Beleza. Sem pressa.',
          '',
          'Vou deixar meu link de agenda aqui.',
          'Quando fizer sentido, é só marcar.',
          '',
          '[LINK DO CALENDÁRIO]'
        ]),

        separator(),

        // ═══════════════════════════════════════════
        // REGRAS GERAIS
        // ═══════════════════════════════════════════
        heading('11. REGRAS DE EXECUÇÃO'),

        subheading('Volume e Ritmo'),
        bullet('10 a 15 novos prospects qualificados por semana (não 100)'),
        bullet('Qualidade > Quantidade — cada prospect é trabalhado por 7-14 dias'),
        bullet('Manter no máximo 30 prospects simultâneos no pipeline'),
        spacer(),

        subheading('O que NÃO fazer'),
        bullet('Mandar DM sem pré-aquecimento (3 dias mínimo)'),
        bullet('Usar o mesmo script pra todo mundo — adaptar ao perfil'),
        bullet('Mandar áudio na primeira mensagem'),
        bullet('Falar de preço antes da call'),
        bullet('Mandar link de serviço sem ela pedir'),
        bullet('Mais de 3 follow-ups (respeitar o espaço)'),
        spacer(),

        subheading('Posicionamento na DM'),
        para('NUNCA diga "assessoria de marketing" ou "agência".'),
        para('SEMPRE diga:'),
        spacer(),
        ...scriptBlock([
          '"Trabalho só com estética e saúde.',
          'Campanha estruturada pro seu procedimento,',
          'follow-up automático por WhatsApp,',
          'e estratégia que escala',
          'sem precisar dobrar o orçamento."'
        ]),
        spacer(),

        subheading('Case Principal (usar em toda transição)'),
        ...scriptBlock([
          'R$600 investidos → R$10k faturados em 10 dias.',
          'Não foi sorte. Foi estratégia + automação.',
          'Tá nos destaques do meu Instagram.'
        ]),

        separator(),

        // ═══════════════════════════════════════════
        // MÉTRICAS
        // ═══════════════════════════════════════════
        heading('12. MÉTRICAS PARA ACOMPANHAR'),

        para('Acompanhar semanalmente no GHL:'),
        spacer(),
        bullet('Taxa de resposta: DM Enviada → Em Conversa (meta: 30%+)'),
        bullet('Taxa de diagnóstico: Em Conversa → Pitch Feito (meta: 50%+)'),
        bullet('Taxa de agendamento: Pitch Feito → Call Agendada (meta: 40%+)'),
        bullet('Taxa de conversão: Call Agendada → Ganho (meta: 25%+)'),
        bullet('Ciclo médio: Qualificado → Ganho (meta: 14-21 dias)'),
        spacer(),
        para('Se a taxa de resposta estiver abaixo de 20%, o problema está na abertura ou no pré-aquecimento.'),
        para('Se o diagnóstico estiver abaixo de 30%, o aquecimento não está aprofundando o suficiente.'),
        para('Se o agendamento estiver abaixo de 25%, o pitch não está conectando com a dor.'),

        separator(),

        new Paragraph({
          children: [new TextRun({ text: '— Copy-Chef · Syra Digital AIOS · Março 2026', italics: true, size: 18, color: '999999' })],
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
  const fileName = `${date}_Script-Prospeccao-Ativa-Instagram.docx`;
  const filePath = path.join(driveDir, fileName);

  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Documento salvo: ${filePath}`);

  // Salvar cópia local também
  const localPath = path.join(__dirname, fileName);
  fs.writeFileSync(localPath, buffer);
  console.log(`✅ Cópia local: ${localPath}`);
}

main().catch(console.error);
