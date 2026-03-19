// meu-projeto/lib/prospecting-scripts.js
// Dados estruturados de prospecção ativa Instagram — scripts, variações, pipeline stages
'use strict';

// ============================================================
// Pipeline Stages (10 estágios)
// ============================================================

const PIPELINE_STAGES = [
  { id: 'qualified',     name: 'Qualificado',     color: '#60A5FA', icon: 'user-check',     position: 1 },
  { id: 'warming',       name: 'Aquecendo',       color: '#FBBF24', icon: 'flame',          position: 2 },
  { id: 'dm_sent',       name: 'DM Enviada',      color: '#A78BFA', icon: 'send',           position: 3 },
  { id: 'in_conversation', name: 'Em Conversa',   color: '#34D399', icon: 'message-circle', position: 4 },
  { id: 'pitch_done',    name: 'Pitch Feito',     color: '#F97316', icon: 'presentation',   position: 5 },
  { id: 'call_scheduled', name: 'Call Agendada',  color: '#818CF8', icon: 'calendar',       position: 6 },
  { id: 'proposal_sent', name: 'Proposta Enviada', color: '#FB923C', icon: 'file-text',     position: 7 },
  { id: 'won',           name: 'Ganho',           color: '#22C55E', icon: 'trophy',         position: 8 },
  { id: 'no_response',   name: 'Sem Resposta',    color: '#94A3B8', icon: 'clock',          position: 9 },
  { id: 'lost',          name: 'Perdido',         color: '#EF4444', icon: 'x-circle',       position: 10 },
];

const STAGE_MAP = {};
for (const s of PIPELINE_STAGES) STAGE_MAP[s.id] = s;

// ============================================================
// Procedures (7 + genérico)
// ============================================================

const PROCEDURES = [
  {
    id: 'criolipólise',
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
    ],
  },
  {
    id: 'lipo-sem-corte',
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
    ],
  },
  {
    id: 'lipo-papada',
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
    ],
  },
  {
    id: 'preenchedores',
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
    ],
  },
  {
    id: 'bioestimuladores',
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
    ],
  },
  {
    id: 'hof',
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
    ],
  },
  {
    id: 'botox',
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
    ],
  },
  {
    id: 'generico',
    name: 'Genérico (qualquer procedimento)',
    comments: [
      'Resultado consistente. Quanto tempo de protocolo pra chegar aí?',
      'Você combina alguma tecnologia nesse tratamento ou usa isolada?',
      'Interessante a evolução. Paciente voltou pra manutenção ou ficou satisfeito?',
      'Cada vez mais natural o resultado. Isso que o paciente quer hoje, né?',
      'Quantas sessões no total? Parece que foi bem planejado o protocolo.',
    ],
    stories: [
      'Quantos atendimentos você faz por dia? Parece uma rotina intensa.',
      'Esse procedimento é o que mais sai na sua clínica?',
      'Qual é a maior dúvida que seus pacientes têm antes de começar?',
      'Resultado rápido ou precisou de mais de uma sessão?',
      'Você tá preferindo agendar avaliação presencial ou faz online também?',
    ],
  },
];

// ============================================================
// Scripts por Estágio
// ============================================================

const SCRIPTS_BY_STAGE = {
  dm_sent: {
    label: 'Abertura (Primeira DM)',
    scripts: [
      {
        id: 'open-default',
        name: 'PADRÃO — Elogio específico + pergunta técnica (75% taxa resposta)',
        text: 'Que resultado incrível no último antes e depois que você postou! Pode falar quanto tempo leva no total? Sempre fico curioso com o tempo de procedimento.',
        validated: true,
        responseRate: 0.75,
      },
      {
        id: 'open-default-v2',
        name: 'PADRÃO v2 — Modelo de negócio',
        text: 'Que resultado top! Você vende protocolos isolados ou completos?',
        validated: true,
      },
      {
        id: 'open-default-v3',
        name: 'PADRÃO v3 — Quantas sessões',
        text: 'Vi seu último antes e depois de [procedimento]. Ficou muito natural. Quantas sessões foram?',
        validated: true,
      },
      {
        id: 'open-a',
        name: 'A — Roda campanha (ads visíveis)',
        text: 'Vi que você já roda campanha. Tá conseguindo escalar ou o custo por resultado não tá compensando?',
      },
      {
        id: 'open-b',
        name: 'B — Link na bio sem automação',
        text: 'Você tem bom volume de conteúdo. O que acontece com quem clica no link da bio e não agenda? Tem algum follow-up?',
      },
      {
        id: 'open-c',
        name: 'C — Perfil forte, engajamento baixo',
        text: 'Fui no seu perfil depois de ver seu Reel sobre [procedimento específico]. Você posta consistente, mas o engajamento não tá na proporção do que o conteúdo merece. Sabe o que tá travando?',
      },
    ],
    deadScripts: [
      {
        id: 'dead-seguir',
        text: 'Oii, Dra!!! Tudo bem? Comecei a te seguir agora, me surpreendi com esses resultados 👏👏',
        reason: '0% taxa resposta em 4+ envios. Parece bot de follow/unfollow.',
      },
      {
        id: 'dead-generico',
        text: 'Oi! Vi seu perfil e gostei muito do seu trabalho!',
        reason: 'Elogio genérico sem pergunta = não gera resposta.',
      },
    ],
  },
  in_conversation: {
    label: 'Aquecimento (Após Resposta)',
    rules: [
      'REGRA DOS 2: Máximo 2 perguntas seguidas. Depois validar/elogiar.',
      'OBRIGADA SECO: "Obrigada 🙏" = encerramento. Esperar 5-7 dias.',
      'AUTENTICIDADE: Ser genuíno funciona melhor que scripts formais.',
    ],
    scripts: [
      {
        id: 'warm-obrigada-seco',
        name: 'PROTOCOLO OBRIGADA SECO — NÃO insistir',
        text: 'Sucesso, Dra! 🙌',
        note: 'Esperar 5-7 dias. Retomar por outro ângulo (story diferente). Se repetir → Sem Resposta.',
      },
      {
        id: 'warm-short',
        name: 'Resposta CURTA mas positiva',
        text: 'Quanto tempo você atua com [procedimento]? Foi fácil pegar clientela desde o início ou demorou?',
      },
      {
        id: 'warm-long',
        name: 'Resposta LONGA — validar primeiro, depois pergunta',
        text: 'Faz sentido! Dá pra ver que você é cuidadosa com [aspecto que ela mencionou]. Isso faz diferença.',
        followUp: 'E essa demanda veio mais por boca a boca ou pelas redes?',
      },
      {
        id: 'warm-what',
        name: 'Ela perguntou o que você faz',
        text: 'Trabalho com assessoria de marketing só pra estética e saúde. Ajudo a estruturar campanha por procedimento com follow-up automático.\n\nMas tô mais curioso sobre o seu trabalho — qual é o procedimento que mais sai na sua clínica?',
      },
    ],
  },
  value_offer: {
    label: 'Oferta de Valor (Dar Antes de Pedir)',
    rules: [
      'Oferecer ANTES de qualquer transição para negócio.',
      'NÃO condicionar a nada. Entregar com qualidade.',
      'NÃO mencionar assessoria, venda ou preço.',
    ],
    scripts: [
      {
        id: 'ov-video',
        name: 'OV1 — Edição de vídeo grátis',
        text: 'Gostei muito da sua didática nesse último vídeo. Quero te fazer uma proposta: posso fazer uma edição profissional dele pra você, sem custo. Me manda o vídeo original?',
      },
      {
        id: 'ov-profile',
        name: 'OV2 — Análise de perfil',
        text: 'Tava vendo seu perfil com olho profissional e vi uns pontos que dariam pra otimizar fácil. Posso te mandar uma análise rápida? Sem compromisso.',
      },
      {
        id: 'ov-creative',
        name: 'OV3 — Feedback criativo',
        text: 'Vi seus últimos criativos e tenho umas sugestões que podem melhorar a performance. Posso te mandar um feedback rápido?',
      },
      {
        id: 'ov-tip',
        name: 'OV4 — Dica específica do nicho',
        text: 'Vi que você tá postando [tipo de conteúdo]. Tenho visto [insight do nicho]. Quer que eu te mande uns exemplos do que tá convertendo bem pra [procedimento]?',
      },
    ],
  },
  pitch_done: {
    label: 'Transição Orgânica + Pitch',
    rules: [
      'NUNCA iniciar diagnóstico com sequência de perguntas.',
      'Esperar ELA mencionar dor/desafio naturalmente.',
      'REAGIR à dor, não forçar a transição.',
    ],
    neverDo: [
      'Sequência de 3+ perguntas diagnósticas (100% detectada como venda)',
      '"E você investe em marketing?" (ameaçador)',
      '"Como tá a concorrência?" (gera defensividade)',
      'Mudar tom abruptamente',
      'Revelar automação/IA',
    ],
    scripts: [
      {
        id: 'trans-difficulty',
        name: 'T1 — Ela mencionou dificuldade em atrair clientes',
        text: 'Faz sentido. A maioria que eu conheço do seu segmento tem esse mesmo desafio. O que mais funciona pra atrair paciente novo no seu caso — indicação ou redes?',
        followUp: 'Uma das minhas clientes tava nesse ponto. Investia R$600 e faturou R$10k em 10 dias. Não mudou o orçamento — mudou a estrutura.\n\nSe quiser, posso te mostrar em 20 minutos o que dá pra ajustar.',
      },
      {
        id: 'trans-has-agency',
        name: 'T2 — Ela já tem agência/marketing',
        text: 'Legal! Ter alguém cuidando é importante. Se em algum momento você quiser uma segunda visão, tô por aqui. Às vezes ajuda validar se o rumo tá certo.',
      },
      {
        id: 'trans-growth',
        name: 'T3 — Ela mencionou faturamento/crescimento',
        text: 'Bacana! E essa demanda é consistente ou varia muito de mês pra mês?',
        followUp: 'Faz sentido. Quando não tem estratégia constante, fica na onda do momento. Posso te mostrar como algumas clientes estabilizaram isso — 20 min, sem compromisso.',
      },
      {
        id: 'trans-no-pain',
        name: 'T4 — Ela NÃO mencionou dor (tudo bem)',
        text: 'Que bom! Quando tiver interesse em explorar como crescer ainda mais, é só chamar. Vou continuar acompanhando seu trabalho.',
        note: 'Manter follow-up leve. Transição pode levar semanas.',
      },
      {
        id: 'pitch-interested',
        name: 'P1 — Ela demonstrou interesse genuíno',
        text: 'Perfeito. Então aqui é o que eu entrego:\n\n1. Campanha estruturada pro seu procedimento (não genérica de estética)\n2. Criativo que fala direto na dor do paciente (não foto bonita sem direção)\n3. Follow-up automático por WhatsApp pra quem demonstrou interesse mas não fechou\n\nMinha última cliente investiu R$600 e faturou R$10k em 10 dias. Tá nos meus destaques.\n\nQual dia você tem 20 minutos pra eu analisar sua situação específica?',
      },
      {
        id: 'pitch-hesitant',
        name: 'P2 — Com pé atrás',
        text: 'Vou ser transparente. Eu trabalho SÓ com estética e saúde. Por isso sei exatamente o que funciona no seu nicho.\n\nOs números tão nos meus destaques. R$600 investidos, R$10k faturados em 10 dias.\n\nSe você der 20 minutos, saio de lá com um diagnóstico do que tá travando. Se não fizer sentido, sem problema.',
      },
    ],
  },
  call_scheduled: {
    label: 'Agendamento',
    scripts: [
      {
        id: 'sched-propose',
        name: 'AG1 — Propor horário',
        text: 'Ótimo.\n\nVou te mandar meu link de agenda. Escolhe o dia que funcionar melhor pra você.\n\nA call é por Google Meet, 20 minutos. Vou analisar suas campanhas antes pra já chegar com diagnóstico pronto.\n\n[LINK DO CALENDÁRIO]',
      },
      {
        id: 'sched-confirm',
        name: 'AG2 — Confirmar',
        text: 'Confirmado pra [dia] às [hora].\n\nVou mandar o link da call umas horas antes.\n\nSe puder, me manda o @ do seu Instagram de anúncios antes da call — assim já faço a análise prévia.',
      },
      {
        id: 'sched-reminder',
        name: 'AG3 — Lembrete 24h antes',
        text: 'Oi! Lembrete da nossa call hoje às [hora].\n\nAqui o link: [LINK GOOGLE MEET]\n\nJá analisei seu perfil e tenho umas observações interessantes. Até já!',
      },
    ],
  },
  no_response: {
    label: 'Follow-up',
    scripts: [
      {
        id: 'fu-4days',
        name: 'FU1 — 4 dias sem resposta',
        text: 'Só retornando aqui.\n\nSe o problema de escalar campanha ainda existe, vale 20 minutos.\n\nQuando você tem uma janela essa semana?',
      },
      {
        id: 'fu-7days',
        name: 'FU2 — 7 dias',
        text: 'Oi! Passando aqui de novo.\n\nSem pressão. Mas se em algum momento você quiser olhar pras suas campanhas com alguém que só trabalha com estética, é só chamar.\n\nVou deixar meu link de agenda aqui: [LINK DO CALENDÁRIO]',
      },
      {
        id: 'fu-14days',
        name: 'FU3 — 14 dias (último)',
        text: 'Última mensagem sobre isso.\n\nSe fizer sentido no futuro, meu perfil tá aqui.\n\nSucesso com as campanhas!',
      },
      {
        id: 'fu-natural-1',
        name: 'FU-NATURAL — Casual (VALIDADO)',
        text: 'Como tá?',
        validated: true,
        note: 'Funciona melhor que qualquer follow-up longo.',
      },
      {
        id: 'fu-natural-2',
        name: 'FU-NATURAL — Desculpa natural (VALIDADO)',
        text: 'Oii, achei que tinha te respondido',
        validated: true,
        note: 'Desculpa natural que reabre conversa.',
      },
    ],
    neverDo: [
      '"Dra, tudo bem? Tá por aí?" — soa ansioso',
    ],
  },
  objections: {
    label: 'Objeções',
    scripts: [
      {
        id: 'obj-agency',
        name: 'OBJ1 — Já tenho agência',
        text: 'Entendo. Não to pedindo pra trocar agora.\n\nUma pergunta só: você consegue dizer com precisão qual campanha, qual criativo e qual procedimento trouxe cada real que você faturou esse mês?\n\nSe não — isso é o gap. E é exatamente onde eu trabalho.',
      },
      {
        id: 'obj-tried',
        name: 'OBJ2 — Já tentei e não funcionou',
        text: 'Entendo. A maioria faz o genérico: post bonito, legenda e torcida.\n\nO que eu faço é diferente: trabalho só com estética e saúde. Sei o que converte nesse nicho. E automatizo o follow-up — porque a venda quase nunca acontece no primeiro contato.\n\n20 minutos. Se não fizer sentido, pelo menos você sai com clareza do que mudar.',
      },
      {
        id: 'obj-going-well',
        name: 'OBJ3 — Meu tráfego tá indo bem',
        text: 'Ótimo. Então você já tem a base.\n\nSó uma coisa: quanto do seu orçamento vai pra lead que não fecha?\n\nE você tem algum sistema que recupera esse lead depois?\n\nNa maioria das clínicas, 60% do faturamento possível fica na mesa por falta de follow-up estruturado.',
      },
      {
        id: 'obj-budget',
        name: 'OBJ4 — Sem budget',
        text: 'Sem problema.\n\nMas quanto você deixa de faturar por mês por não ter um sistema que fecha os leads que já chegam?\n\nÉ disso que a gente conversa. 20 minutos, sem compromisso.',
      },
      {
        id: 'obj-think',
        name: 'OBJ5 — Vou pensar',
        text: 'Beleza. Sem pressa.\n\nVou deixar meu link de agenda aqui. Quando fizer sentido, é só marcar.\n\n[LINK DO CALENDÁRIO]',
      },
    ],
  },
};

// ============================================================
// Metrics Targets (benchmarks)
// ============================================================

const METRICS_TARGETS = {
  weeklyProspects: 15,       // 10-15 novos por semana
  maxSimultaneous: 30,       // máximo no pipeline
  responseRate: 30,          // DM Enviada → Em Conversa (30%+)
  diagnosisRate: 50,         // Em Conversa → Pitch Feito (50%+)
  schedulingRate: 40,        // Pitch Feito → Call Agendada (40%+)
  conversionRate: 25,        // Call Agendada → Ganho (25%+)
  avgCycleDays: { min: 14, max: 21 }, // Qualificado → Ganho
};

// ============================================================
// Qualification Criteria
// ============================================================

const QUALIFICATION_SIGNS = [
  'Posta conteúdo de procedimentos (antes/depois, técnicas, resultados)',
  'Tem entre 1k e 50k seguidores',
  'Link na bio para agendamento ou Linktree',
  'Engajamento baixo relativo ao tamanho — sinal de tráfego pago',
  'Postou nos últimos 7 dias',
  'Mencionou campanha, tráfego ou anúncio em stories/destaques',
  'Tem post patrocinado visível',
];

const WARMUP_TAGS = ['curtiu', 'comentou', 'story', 'dm-pronta', 'prospeccao-ativa'];

// ============================================================
// DM Leve — Dia 1 do Pré-Aquecimento (v2)
// Objetivo: toque mínimo pra GHL criar contato via webhook
// REGRA: max 3 palavras ou 1 emoji. Não é conversa.
// ============================================================

const WARMUP_DM_SCRIPTS = {
  procedimento: [
    { id: 'warm-dm-proc-1', text: '🔥', context: 'Story/Reels de procedimento ou resultado' },
    { id: 'warm-dm-proc-2', text: 'que resultado!', context: 'Story de técnica ou explicação' },
    { id: 'warm-dm-proc-3', text: '👏', context: 'Reels de procedimento bem executado' },
  ],
  antes_depois: [
    { id: 'warm-dm-ad-1', text: 'impressionante 👏', context: 'Story/post de antes e depois' },
    { id: 'warm-dm-ad-2', text: '🔥', context: 'Antes e depois com resultado marcante' },
    { id: 'warm-dm-ad-3', text: 'que evolução!', context: 'Antes e depois com transformação visível' },
  ],
  casual: [
    { id: 'warm-dm-cas-1', text: '💪', context: 'Story de rotina / dia a dia na clínica' },
    { id: 'warm-dm-cas-2', text: '☕', context: 'Story casual / lifestyle' },
    { id: 'warm-dm-cas-3', text: '👏', context: 'Story de conquista / marco profissional' },
  ],
  tecnica: [
    { id: 'warm-dm-tec-1', text: 'que resultado!', context: 'Story explicando técnica' },
    { id: 'warm-dm-tec-2', text: '🔥', context: 'Story de protocolo / equipamento novo' },
  ],
  generico: [
    { id: 'warm-dm-gen-1', text: '🔥', context: 'Qualquer conteúdo de procedimento' },
    { id: 'warm-dm-gen-2', text: '👏', context: 'Qualquer conteúdo de resultado' },
    { id: 'warm-dm-gen-3', text: 'top!', context: 'Qualquer conteúdo positivo' },
  ],
};

// ============================================================
// Fluxo de Pré-Aquecimento (5 dias)
// ============================================================

const WARMUP_FLOW = [
  {
    day: 1,
    label: 'Curtidas + DM Leve',
    actions: [
      'Curtir 3-4 posts recentes (espaçar ao longo do dia)',
      'Enviar 1 DM leve: reação a story ou emoji (max 3 palavras)',
    ],
    ghl_action: 'Webhook DM enviada → cria contato → oportunidade "Aquecendo"',
    scripts_ref: 'WARMUP_DM_SCRIPTS',
  },
  {
    day: '2-3',
    label: 'Curtidas Espaçadas',
    actions: [
      'Curtir 2-3 posts/dia (diferentes dos anteriores)',
      'Assistir stories (ela vê que você assistiu)',
      'NÃO enviar mensagem',
    ],
    ghl_action: null,
    scripts_ref: null,
  },
  {
    day: '3-4',
    label: 'Comentário Técnico',
    actions: [
      'Comentar 1 post com observação TÉCNICA sobre o procedimento',
      'Tom: colega de área, não vendedor',
      'NÃO mencionar marketing ou assessoria',
    ],
    ghl_action: null,
    scripts_ref: 'PROCEDURES[].comments',
  },
  {
    day: '4-5',
    label: 'Resposta a Story',
    actions: [
      'Responder 1 story com pergunta específica sobre o conteúdo',
      'Curiosidade genuína, não invasiva',
    ],
    ghl_action: null,
    scripts_ref: 'PROCEDURES[].stories',
  },
  {
    day: '5+',
    label: 'DM de Abertura Real',
    actions: [
      'Mínimo 2 interações completadas nos dias anteriores',
      'Enviar DM de abertura (SCRIPTS_BY_STAGE.dm_sent)',
    ],
    ghl_action: 'Mover oportunidade para "DM Enviada"',
    scripts_ref: 'SCRIPTS_BY_STAGE.dm_sent',
  },
];

module.exports = {
  PIPELINE_STAGES,
  STAGE_MAP,
  PROCEDURES,
  SCRIPTS_BY_STAGE,
  METRICS_TARGETS,
  QUALIFICATION_SIGNS,
  WARMUP_TAGS,
  WARMUP_DM_SCRIPTS,
  WARMUP_FLOW,
};
