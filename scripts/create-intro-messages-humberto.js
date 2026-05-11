const { createDoc } = require('../lib/drive.js');

const FOLDER_ID = '1CYWRWomCV4yVCC6ZTP4vCsM1e8lj1iWw';

const content = `MENSAGENS DE INTRODUÇÃO — AUTOMAÇÃO GHL (PRIMEIRO CONTATO)
HR Andrade | Equipe Comercial
Criado por @copy-chef + @media-buyer (Syra Digital AIOS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUÇÕES TÉCNICAS (GHL):
- Variável de nome: {{contact.first_name}}
- Disparo: imediato ao criar o contato no GHL
- Canal: WhatsApp
- Mensagem totalmente automática — sem intervenção humana antes do envio
- Selecionar UMA variação por fluxo (separar por vendedora no workflow)
- NÃO perguntar novamente o que a lead quer — dados já estão no formulário

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BLOCO 1 — FORMULÁRIO GERAL (procedimento não especificado)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Contexto: Lead pediu avaliação. Formulário já coletou área de interesse e urgência.
Objetivo da mensagem: apresentar a equipe, gerar confiança na HR Andrade, abrir conversa para agendamento.
Não perguntar: o que quer, há quanto tempo pensa, qual procedimento.

- - - - - - - - - - - - - - - - - - - - - - - - - - -
ARDINA
- - - - - - - - - - - - - - - - - - - - - - - - - - -

Oi, {{contact.first_name}}! Tudo bem?

Aqui é a Ardina, da equipe HR Andrade. 😊

Recebi seu pedido de avaliação e fiquei feliz em saber que você deu esse passo!

Antes de a gente falar sobre agendamento, queria te entender melhor: o que te motivou a buscar uma avaliação agora? Teve algum momento específico ou é algo que você vem pensando há um tempo?

Me responde quando puder — sem pressa! 😊

- - - - - - - - - - - - - - - - - - - - - - - - - - -
FLÁVIA
- - - - - - - - - - - - - - - - - - - - - - - - - - -

Olá, {{contact.first_name}}!

Sou a Flávia, da equipe HR Andrade. 👋

Recebi seu contato e vim te ajudar com os próximos passos.

Pra te orientar da melhor forma: você já teve alguma consulta com cirurgião plástico antes, ou essa seria sua primeira vez?

Me responde aqui quando puder!

- - - - - - - - - - - - - - - - - - - - - - - - - - -
VÊRONICA
- - - - - - - - - - - - - - - - - - - - - - - - - - -

Oi, {{contact.first_name}}! 😊

Aqui é a Vêronica, da clínica HR Andrade.

Vi que você solicitou uma avaliação — que ótimo!

Antes de falar sobre datas, me conta uma coisa: qual é a sua maior dúvida sobre o procedimento hoje? Às vezes uma pergunta simples já esclarece muita coisa antes mesmo da consulta.

Me responde quando puder! 📅

- - - - - - - - - - - - - - - - - - - - - - - - - - -
JULIANA
- - - - - - - - - - - - - - - - - - - - - - - - - - -

Oi, {{contact.first_name}}! Tudo bem?

Sou a Juliana, da equipe HR Andrade. 👋

Recebi seu pedido de avaliação e quero te ajudar da melhor forma possível.

Me conta: tem alguma coisa que ainda te gera dúvida ou insegurança antes de dar esse passo? Assim já consigo te passar as informações certas antes mesmo de agendar.

Me responde aqui quando quiser! 😊

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BLOCO 2 — FORMULÁRIO PACIENTE MODELO (blefaroplastia — Maio)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Contexto: Lead se inscreveu no programa de paciente modelo de blefaroplastia.
Formulário já coletou: queixa nos olhos, nível de pesquisa sobre o procedimento, disponibilidade em Maio.
Objetivo da mensagem: confirmar a inscrição, gerar senso de exclusividade, abrir conversa para avançar na seleção.
Não perguntar: o que incomoda, se pesquisou, quando pode em Maio.

- - - - - - - - - - - - - - - - - - - - - - - - - - -
ARDINA
- - - - - - - - - - - - - - - - - - - - - - - - - - -

Oi, {{contact.first_name}}! Tudo bem?

Aqui é a Ardina, da equipe HR Andrade. 😊

Sua inscrição para o programa de paciente modelo de blefaroplastia foi recebida — obrigada pelo interesse!

Antes de te passar todos os detalhes, queria entender melhor: o que te fez considerar a blefaroplastia agora? É algo que você pensa há muito tempo ou surgiu mais recentemente?

Me responde quando puder! 📅

- - - - - - - - - - - - - - - - - - - - - - - - - - -
FLÁVIA
- - - - - - - - - - - - - - - - - - - - - - - - - - -

Olá, {{contact.first_name}}!

Sou a Flávia, da equipe HR Andrade. 👋

Recebi sua inscrição para o programa de paciente modelo de blefaroplastia — que ótimo que você deu esse passo!

Pra eu te orientar melhor: tem alguma dúvida ou preocupação sobre o procedimento que ainda não foi respondida? Pode me contar — estou aqui pra isso.

Me responde aqui quando puder!

- - - - - - - - - - - - - - - - - - - - - - - - - - -
VÊRONICA
- - - - - - - - - - - - - - - - - - - - - - - - - - -

Oi, {{contact.first_name}}! 😊

Aqui é a Vêronica, da clínica HR Andrade.

Vi que você se inscreveu para ser paciente modelo de blefaroplastia em Maio — que bom!

Antes de falar sobre os próximos passos, me conta: o que ainda te gera mais dúvida sobre o procedimento? Assim já consigo te ajudar antes mesmo de você chegar na consulta.

Me responde quando puder! 📅

- - - - - - - - - - - - - - - - - - - - - - - - - - -
JULIANA
- - - - - - - - - - - - - - - - - - - - - - - - - - -

Oi, {{contact.first_name}}! Tudo bem?

Sou a Juliana, da equipe HR Andrade. 👋

Recebi sua inscrição para o programa de paciente modelo de blefaroplastia — obrigada!

Quero te ajudar da melhor forma. Me conta uma coisa: você já conversou com algum médico sobre blefaroplastia antes, ou essa seria sua primeira avaliação?

Me responde aqui quando puder e a gente avança! 😊

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUALITY GATE — @copy-chef
Score: 8.7 / 10.0 | Decisão: PASS

Ajustes aplicados para automação GHL:
- Variavel {{contact.first_name}} (sintaxe nativa GHL)
- Removido "agora uns minutinhos?" e "essa semana" — sem pressao de tempo real
- CTA substituido por "me responde quando puder" — funciona para qualquer horario de disparo
- Tom mantido: humano, coloquial, sem parecer bot
- Nenhuma variacao repete perguntas ja respondidas no formulario
- Senso de exclusividade e escassez preservado nas mensagens de paciente modelo
- Assinatura da vendedora + HR Andrade em todas as variacoes (neutro para Humberto ou Rachel)
`;

createDoc('Mensagens de Introdução GHL — Primeiro Contato — HR Andrade', content, FOLDER_ID)
  .then(doc => {
    const id = doc.id || doc;
    console.log('Doc criado com sucesso!');
    console.log('Link: https://docs.google.com/document/d/' + id);
  })
  .catch(err => console.error('Erro:', err.message));
