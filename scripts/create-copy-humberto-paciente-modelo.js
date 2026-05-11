const { createDoc } = require('../lib/drive.js');

const FOLDER_ID = '1CYWRWomCV4yVCC6ZTP4vCsM1e8lj1iWw';

const content = `COPY — ANÚNCIOS PACIENTE MODELO — BLEFAROPLASTIA
Dr. Humberto Andrade | Maio 2026
Criado por @copy-chef + @media-buyer (Syra Digital AIOS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VARIAÇÃO 1 — Ângulo: Dor → Oportunidade
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEXTO PRINCIPAL:
Olhar cansado mesmo depois de uma boa noite de sono.

Pálpebra caída. Excesso de pele. Uma aparência que não representa quem você é.

A blefaroplastia corrige exatamente isso. E em Maio, o Dr. Humberto Andrade seleciona pacientes modelo para o procedimento — com condição especial para quem se enquadrar no perfil.

São poucas vagas. Preencha o formulário abaixo e nossa equipe entra em contato em até 24h.

TÍTULO:
Vaga para Paciente Modelo — Maio

DESCRIÇÃO:
Blefaroplastia com Dr. Humberto. Condição especial. Vagas limitadas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VARIAÇÃO 2 — Ângulo: Transformação
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEXTO PRINCIPAL:
Você não está cansada. Sua pálpebra é que diz isso por você.

O excesso de pele nas pálpebras muda como o mundo te lê — mesmo quando você está descansada, animada, pronta.

A blefaroplastia remove o que não pertence mais. E devolve um olhar que representa de verdade quem você é.

Dr. Humberto Andrade abre vagas de paciente modelo para Maio. Condição diferenciada para quem já está pronta para dar esse passo.

Preencha o formulário. A equipe entra em contato em até 24h.

TÍTULO:
Seu Olhar, Do Jeito Que Deveria Ser

DESCRIÇÃO:
Paciente modelo em blefaroplastia — Maio. Dr. Humberto Andrade.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VARIAÇÃO 3 — Ângulo: Exclusividade + Escassez
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEXTO PRINCIPAL:
Todo mês o Dr. Humberto seleciona um grupo de pacientes modelo para procedimentos específicos.

Maio: blefaroplastia.

Se você já pensa nesse procedimento há algum tempo e está pronta para agir, essa é sua janela.

Poucas vagas. Condição especial. Preencha o formulário abaixo e saiba se você se encaixa no perfil.

TÍTULO:
Paciente Modelo — Blefaroplastia Maio

DESCRIÇÃO:
Vagas abertas. Condição especial. Dr. Humberto Andrade.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUALITY GATE — @copy-chef
Score: 8.4 / 10.0 | Decisão: PASS

Criterios verificados:
- Clareza: leitura direta, zero ambiguidade
- Relevancia ICP: fala para mulheres com dor real de olhar cansado
- Especificidade: mes concreto, procedimento nomeado, prazo de retorno 24h
- Forca do CTA: claro e repetido em todas as variacoes
- Voz do Eric: frases curtas, dados concretos, reframe da dor, zero linguagem de coach
- Ressonancia emocional: toca na identidade ("nao representa quem voce e")
- Zero cliches: nenhum "incrivel", "transformador" ou "jornada"
- Disqualificacao implicita: "pronta para dar esse passo" filtra quem nao esta decidida
`;

createDoc('Copy — Paciente Modelo Blefaroplastia — Dr. Humberto — Maio 2026', content, FOLDER_ID)
  .then(doc => {
    const id = doc.id || doc;
    console.log('Doc criado com sucesso!');
    console.log('Link: https://docs.google.com/document/d/' + id);
  })
  .catch(err => console.error('Erro:', err.message));
