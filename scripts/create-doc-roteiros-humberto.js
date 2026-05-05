const { createDoc, findClientFolder } = require('../lib/drive');

const content = `ROTEIROS — CAMPANHA RETARGETING
HR Andrade Instituto | Procedimentos Faciais
Syra Digital AIOS | abr/2026
Campanha: [Syra] HR Andrade - Retargeting Procedimentos [Trafego] [CBO]
Público: Engajamento IG + Visitantes + Pageview landing + Salvou/Comentou posts
Objetivo: Direto e agressivo — eliminar o "ainda tô pensando"
Porta-voz: Dr. / Raquel (roteiros adaptáveis para ambos)

════════════════════════════════════════════════════

ROTEIRO 1 — BLEFAROPLASTIA
Ângulo: o custo silencioso de esperar
Duração estimada: 25 segundos

CÂMERA: Olhando direto para a câmera, tom sério, sem sorriso

FALA:
"Você tá olhando pro espelho há quanto tempo?"

[PAUSA DE 1 SEGUNDO]

"A pálpebra caída não some com creme.
Não some com descanso.
Ela só aumenta.

E cada mês que passa, a cirurgia fica mais complexa.
Não mais cara. Mais complexa.

Quem espera, sempre diz que devia ter feito antes.

Se você já pensou nisso, a hora de resolver é agora.
Avaliação gratuita. O link tá aqui."

CTA NA TELA: Agendar Avaliação Gratuita — HR Andrade Instituto

LEGENDA SUGERIDA:
"A pálpebra caída não some com creme. Cada mês que passa, a cirurgia fica mais complexa. Quem espera sempre diz que devia ter feito antes."

════════════════════════════════════════════════════

ROTEIRO 2 — RINOPLASTIA
Ângulo: você já tomou a decisão, só não marcou ainda
Duração estimada: 22 segundos

CÂMERA: Ambiente clean, consultório ou fundo neutro, tom direto

FALA:
"Você não tá mais na fase de 'será que eu faço'.

Você já decidiu.

Só tá esperando o momento certo.

Mas o momento certo não aparece sozinho.
Você marca, ou fica esperando.

Rinoplastia com resultado natural, sem aquela aparência de operado.
É o que o HR Andrade entrega.

Avaliação gratuita. Sem compromisso.
O link tá aqui."

CTA NA TELA: Avaliação Gratuita — sem compromisso

LEGENDA SUGERIDA:
"Você não tá mais na fase de 'será que eu faço'. Você já decidiu. Só tá esperando o momento certo. Mas o momento certo não aparece sozinho."

════════════════════════════════════════════════════

ROTEIRO 3 — LIFTING FACIAL
Ângulo: o que as pacientes falam depois — relato que vira espelho
Duração estimada: 26 segundos

CÂMERA: Tom mais próximo, quase confidencial

FALA:
"Sabe o que as pacientes mais falam depois de um lifting?

'Eu devia ter feito isso há 5 anos.'

Não porque ficou exagerado.
Porque ficou natural.
Porque a pessoa voltou a se reconhecer no espelho.

Flacidez não é sobre vaidade.
É sobre se sentir você mesma de novo.

Se você tá nesse ponto, chama a gente.
Avaliação gratuita, sem enrolação."

CTA NA TELA: Fale com o HR Andrade

LEGENDA SUGERIDA:
"O que as pacientes mais falam depois de um lifting: 'Eu devia ter feito isso há 5 anos.' Flacidez não é sobre vaidade. É sobre se sentir você mesma de novo."

════════════════════════════════════════════════════

ROTEIRO 4 — MULTI-PROCEDIMENTO
Ângulo: urgência direta, sem rodeio — para quem já engajou e não agiu
Duração estimada: 24 segundos

CÂMERA: Em pé, tom mais intenso, olho no olho

FALA:
"Blefaroplastia. Rinoplastia. Otoplastia. Lifting.

Não são quatro cirurgias diferentes.

São quatro soluções para quem já sabe o que quer e ainda não agiu.

Você seguiu o perfil. Você assistiu os vídeos.
Alguma coisa te trouxe até aqui.

Não deixa isso passar.

Avaliação gratuita no HR Andrade.
Você sai sabendo exatamente o que faz sentido pro seu caso."

CTA NA TELA: Agendar Agora — HR Andrade Instituto

LEGENDA SUGERIDA:
"Você seguiu o perfil. Você assistiu os vídeos. Alguma coisa te trouxe até aqui. Não deixa isso passar."

════════════════════════════════════════════════════

NOTAS DE PRODUÇÃO

Duração ideal: 20 a 30 segundos por roteiro
Formato: vertical 9:16 (Reels/Stories) — prioridade
Edição: corte direto, sem transição suave, sem música ambiente
Legenda: sempre ativa (85% dos usuários assistem sem som)
CTA: fixo nos últimos 5 segundos, fonte grande, cor de contraste
Tom: sério, direto, sem sorrir — esse público já conhece o HR Andrade

NOTA PARA GRAVAÇÃO:
Roteiros 1 e 4 funcionam para qualquer porta-voz.
Roteiro 2: substituir "o HR Andrade entrega" por "é o que eu faço" se gravado pelo Dr.
Roteiro 3: substituir "as pacientes" por "os meus pacientes" e "chama a gente" por "me chama" se gravado pelo Dr.

Syra Digital AIOS | @copy-chef | 2026-04-17
`;

async function run() {
  const folder = await findClientFolder('Humberto');
  console.log('Pasta:', folder ? folder.name : 'raiz do Drive');

  const doc = await createDoc(
    'Roteiros Retargeting — HR Andrade Instituto (abr/2026)',
    content,
    folder ? folder.id : null
  );

  console.log('Link:', doc.url);
}

run().catch(err => { console.error('Erro:', err.message); process.exit(1); });
