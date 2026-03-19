// meu-projeto/lib/iris-scripts.js
// Scripts de prospecção Iris v2 - Processo comercial real do Eric
// Baseado em conversas reais analisadas do GHL
// Funil: Aquecimento → Qualificação → Rapport → Proposta Reunião → Agendamento

const STAGES = [
  'aquecimento',
  'qualificacao',
  'rapport',
  'proposta_reuniao',
  'pedir_whatsapp',
  'whatsapp_ativo',
  'agendamento',
  'followup',
  'objecoes',
];

// Stages onde Iris age sozinha no modo hunter
// DESATIVADO: Eric quer aprovar TODAS as mensagens via Telegram (03/03/2026)
const AUTONOMOUS_STAGES = [];

// Stages que precisam de aprovação do Eric (TODAS)
const APPROVAL_STAGES = ['aquecimento', 'qualificacao', 'rapport', 'proposta_reuniao', 'pedir_whatsapp', 'whatsapp_ativo', 'agendamento', 'objecoes', 'followup'];

/**
 * Scripts organizados por etapa e variante
 * Os templates são GUIAS para o Groq gerar a resposta no estilo do Eric
 */
const scripts = {
  // === AQUECIMENTO: conexão inicial, interesse genuíno, VARIAR abordagem ===
  aquecimento: {
    elogio_resultado: {
      id: 'aquec_resultado',
      description: 'Elogio especifico ao resultado de procedimento',
      template: 'Elogiar resultado especifico. 1 mensagem curta. Max 1 pergunta.',
      maxChunks: 1,
    },
    curiosidade_tecnica: {
      id: 'aquec_tecnica',
      description: 'Pergunta tecnica sobre o procedimento',
      template: 'Pergunta curiosa sobre o procedimento: tempo, tecnica, frequencia. Sem vender nada.',
      maxChunks: 1,
    },
    observacao_mercado: {
      id: 'aquec_mercado',
      description: 'Observacao sobre o mercado/regiao do lead',
      template: 'Comentar sobre o crescimento do mercado na regiao ou nicho do lead. Gerar conversa.',
      maxChunks: 1,
    },
    approach_negocio: {
      id: 'aquec_negocio',
      description: 'Pergunta sobre o negocio/agenda do lead',
      template: 'Pergunta direta sobre agenda, demanda, de onde vem os pacientes. Tom consultivo.',
      maxChunks: 1,
    },
    conexao_direta: {
      id: 'aquec_conexao',
      description: 'Elogio direto e curto, sem pergunta',
      template: 'Elogio curto e genuino ao trabalho. Sem pergunta, so conexao.',
      maxChunks: 1,
    },
  },

  // === QUALIFICAÇÃO: identificar dor, entender situação, 1 pergunta por vez ===
  qualificacao: {
    resposta_curta: {
      id: 'qual_curta',
      description: 'Lead respondeu pouco',
      template: 'Validar resposta curta e fazer UMA pergunta sobre demanda/fluxo de pacientes.',
      maxChunks: 2,
    },
    resposta_longa: {
      id: 'qual_longa',
      description: 'Lead contou sobre seu trabalho',
      template: 'Pegar no fio do que disse, validar e fazer UMA pergunta sobre de onde vem a demanda.',
      maxChunks: 2,
    },
    perguntou_de_volta: {
      id: 'qual_perguntou',
      description: 'Lead perguntou o que Eric faz',
      template: 'Responder curto sobre trafego pago e captacao. Devolver com UMA pergunta.',
      maxChunks: 2,
    },
  },

  // === RAPPORT: se posicionar como quem entende o problema de CAPTACAO ===
  rapport: {
    dor_clientes: {
      id: 'rapport_clientes',
      description: 'Lead mencionou dificuldade com fluxo de pacientes',
      template: 'Validar a dor de captacao. Posicionar que depender de indicacao limita crescimento.',
      maxChunks: 2,
    },
    dor_faturamento: {
      id: 'rapport_faturamento',
      description: 'Lead falou sobre faturamento',
      template: 'Conectar faturamento com falta de estrutura de captacao previsivel.',
      maxChunks: 2,
    },
    dor_marketing: {
      id: 'rapport_marketing',
      description: 'Lead falou de dificuldade com captacao/trafego',
      template: 'Validar e posicionar trafego pago como maquina de captacao. Nao falar de conteudo organico.',
      maxChunks: 2,
    },
    dor_tempo: {
      id: 'rapport_tempo',
      description: 'Lead nao tem tempo para captacao',
      template: 'Usar falta de tempo como argumento: sem estrutura de captacao, tudo fica nas costas.',
      maxChunks: 2,
    },
  },

  // === PROPOSTA REUNIÃO ===
  proposta_reuniao: {
    natural: {
      id: 'prop_natural',
      description: 'Momento natural para propor reuniao',
      template: 'Convidar pra 15 min sem compromisso. 1 mensagem direta.',
      maxChunks: 1,
    },
    apos_objecao: {
      id: 'prop_apos_obj',
      description: 'Reabrindo apos objecao superada',
      template: 'Reposicionar pra reuniao. 1 mensagem.',
      maxChunks: 1,
    },
  },

  // === PEDIR WHATSAPP: mover conversa do Instagram pro WhatsApp ===
  pedir_whatsapp: {
    natural: {
      id: 'pedir_wpp_natural',
      description: 'Pedir WhatsApp de forma natural após aceitar reunião',
      template: 'Pedir o número de WhatsApp para continuar a conversa lá. 1 mensagem.',
      maxChunks: 1,
    },
    lead_ofereceu: {
      id: 'pedir_wpp_ofereceu',
      description: 'Lead já ofereceu WhatsApp espontaneamente',
      template: 'Aceitar e confirmar que vai chamar lá.',
      maxChunks: 1,
    },
  },

  // === WHATSAPP ATIVO: conversa migrou pro WhatsApp ===
  whatsapp_ativo: {
    primeiro_contato: {
      id: 'wpp_primeiro',
      description: 'Primeira mensagem no WhatsApp',
      template: 'Se apresentar brevemente no WhatsApp e pedir email para enviar convite da reunião.',
      maxChunks: 1,
    },
    pedir_email: {
      id: 'wpp_email',
      description: 'Pedir email para enviar convite do calendário',
      template: 'Pedir o email para enviar o invite da call.',
      maxChunks: 1,
    },
    confirmar_invite: {
      id: 'wpp_confirmar',
      description: 'Confirmar que recebeu o invite',
      template: 'Perguntar se recebeu o convite e enviar link da reunião.',
      maxChunks: 1,
    },
  },

  // === AGENDAMENTO ===
  agendamento: {
    proposta: {
      id: 'agend_proposta',
      description: 'Confirmar dia e horário',
      template: 'Perguntar dia e horário. Disponível entre 12h e 20h.',
      maxChunks: 1,
    },
    confirmacao: {
      id: 'agend_confirm',
      description: 'Confirmar data/horário',
      template: 'Confirmar e dizer que vai enviar o invite.',
      maxChunks: 1,
    },
    lembrete: {
      id: 'agend_lembrete',
      description: 'Lembrete antes da reunião',
      template: 'Lembrete amigável da chamada.',
      maxChunks: 1,
    },
  },

  // === FOLLOWUP ===
  followup: {
    '3dias': {
      id: 'fu_3dias',
      description: 'Silencio de 3+ dias',
      template: 'Retorno leve sem pressao.',
      maxChunks: 2,
    },
    '7dias': {
      id: 'fu_7dias',
      description: 'Silencio de 7+ dias',
      template: 'Segundo followup mais direto.',
      maxChunks: 2,
    },
    segunda_tentativa: {
      id: 'fu_segunda',
      description: 'Ultima tentativa',
      template: 'Plantar semente e deixar porta aberta.',
      maxChunks: 1,
    },
  },

  // === OBJEÇÕES ===
  objecoes: {
    sem_dinheiro: {
      id: 'obj_dinheiro',
      description: 'Sem dinheiro/budget',
      template: 'Concordar, reposicionar pra reuniao. 1-2 msgs.',
      maxChunks: 2,
    },
    ja_tenho_alguem: {
      id: 'obj_ja_tem',
      description: 'Ja tem agencia/consultor',
      template: 'Respeitar, oferecer segunda opiniao. 1 msg.',
      maxChunks: 1,
    },
    nao_preciso: {
      id: 'obj_nao_preciso',
      description: 'Nao precisa / ta satisfeita',
      template: 'Aceitar, plantar semente sutil. 1 msg.',
      maxChunks: 1,
    },
    sem_tempo: {
      id: 'obj_sem_tempo',
      description: 'Nao tem tempo',
      template: 'Usar como argumento: com estrutura de captacao rodando, nao precisa se preocupar.',
      maxChunks: 2,
    },
    vai_pensar: {
      id: 'obj_pensar',
      description: 'Vai pensar',
      template: 'Aceitar sem pressao. Deixar porta aberta. 1 msg.',
      maxChunks: 1,
    },
    pediu_whatsapp: {
      id: 'obj_whatsapp',
      description: 'Pediu WhatsApp (sinal POSITIVO)',
      template: 'Aceitar imediatamente e pedir numero.',
      maxChunks: 1,
    },
  },
};

/**
 * Seleciona script por etapa e variante
 */
function selectScript(stage, variant, scriptsUsed = []) {
  const stageScripts = scripts[stage];
  if (!stageScripts) return null;

  if (variant && stageScripts[variant]) {
    const script = stageScripts[variant];
    return { id: script.id, script, stage, variant };
  }

  for (const [variantKey, script] of Object.entries(stageScripts)) {
    if (!scriptsUsed.includes(script.id)) {
      return { id: script.id, script, stage, variant: variantKey };
    }
  }

  const firstKey = Object.keys(stageScripts)[0];
  const firstScript = stageScripts[firstKey];
  return { id: firstScript.id, script: firstScript, stage, variant: firstKey };
}

function getStages() {
  return STAGES;
}

function getAutonomousStages() {
  return AUTONOMOUS_STAGES;
}

function getApprovalStages() {
  return APPROVAL_STAGES;
}

module.exports = {
  scripts,
  selectScript,
  getStages,
  getAutonomousStages,
  getApprovalStages,
  STAGES,
  AUTONOMOUS_STAGES,
  APPROVAL_STAGES,
};
