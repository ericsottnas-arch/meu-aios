/**
 * Cria o Google Doc com a copy completa da landing page
 * Dr. Cleugo Porto — Dream Incision
 *
 * Uso: node scripts/create-copy-landing-cleugo-dream-incision.js
 */

const { createDoc, findClientFolder } = require('../lib/drive');

const COPY = `
COPY COMPLETA — LANDING PAGE DR. CLEUGO PORTO
Dream Incision — Tratamento de Celulite
Versão 1.0 | 23/04/2026
Produzido por @copy-chef | Syra Digital


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEÇÃO 1 — HERO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HEADLINE PRINCIPAL:
Você merece usar biquíni sem pensar na celulite.
E existe um tratamento que entrega isso de verdade.

SUBHEADLINE:
A Dream Incision libera os nós internos que criam as covinhas e estimula o seu próprio colágeno para firmar a pele por dentro. O resultado não desaparece porque a causa foi tratada.

CTA BUTTON:
Quero entender como funciona para mim

NOTA DE APOIO ABAIXO DO BOTÃO:
Sem compromisso. Você conversa primeiro, entende se faz sentido, e decide com calma.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEÇÃO 2 — SOCIAL PROOF BAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STAT 1:
Número: +500
Label: Pacientes tratadas com Dream Incision

STAT 2:
Número: +12
Label: Anos dedicados ao tratamento de celulite

STAT 3:
Número: +200
Label: Médicos formados na técnica (curso R$85.000)

STAT 4:
Número: 3
Label: Coberturas em TV aberta (SBT, Globo, UOL)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEÇÃO 3 — SOBRE O PROBLEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TÍTULO DA SEÇÃO:
O que você sente é real. E tem razão de ser assim.

CORPO:
Você já chegou à beira da piscina e ficou com o canguru amarrado na cintura porque não queria ninguém olhando para a sua bunda.

Já deixou de usar uma saia que adorava porque, com aquela luz, ficava nítido demais.

Já tentou creme. Já fez drenagem. Já fez academia por meses seguidos. E a celulite continuou ali, do mesmo jeito.

Não é fraqueza. Não é falta de esforço. É que o problema está dentro, em estruturas que nenhum creme e nenhum exercício conseguem alcançar.

A celulite grau 2 e grau 3 é causada por septos fibrosos, que são fios internos que puxam a pele de dentro para baixo e criam as covinhas. Enquanto esses fios estiverem lá, nada na superfície vai resolver.

É exatamente isso que a Dream Incision trata.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEÇÃO 4 — DREAM INCISION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TÍTULO DA SEÇÃO:
O que é a Dream Incision e por que ela funciona quando o resto não resolve

CORPO:

Por dentro da pele, existem fios de tecido fibroso que puxam a pele para baixo e criam as covinhas da celulite. Esses fios são chamados de septos fibrosos e eles não somem com creme, com drenagem ou com cardio.

A Dream Incision é uma técnica minimamente invasiva que vai exatamente até onde esses fios estão e os libera. A pele para de ser puxada para baixo e começa a se acomodar de forma natural.

Ao mesmo tempo, o tratamento estimula seu próprio colágeno para que a pele ganhe firmeza de dentro para fora, sem preenchimento artificial, sem resultado "inchado", sem cara de procedimento feito.

O resultado é definitivo porque os septos liberados não se reformam. Não é um ciclo de manutenção infinita. É um tratamento que resolve.

BLOCO DE DIFERENCIAL (3 itens):

Item 1:
Título: Minimamente invasivo
Texto: Procedimento feito no consultório, com anestesia local. Sem corte, sem internação, sem repouso prolongado.

Item 2:
Título: Resultado natural
Texto: A pele melhora de dentro para fora, com colágeno do seu próprio corpo. Ninguém vai saber o que você fez. Todo mundo vai notar.

Item 3:
Título: Definitivo
Texto: Os septos que foram liberados não voltam. Não é necessário repetir o tratamento no mesmo ponto.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEÇÃO 5 — CREDENCIAIS E AUTORIDADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TÍTULO DA SEÇÃO:
Dr. Cleugo Porto

SUBTÍTULO:
Referência nacional no tratamento de celulite e criador da técnica Dream Incision

CORPO:
O Dr. Cleugo não chegou à Dream Incision por acidente. São mais de 12 anos dedicados exclusivamente a entender e tratar a celulite, com uma perspectiva que vai além da superfície da pele.

"A celulite é reflexo de desequilíbrios internos. Tratar apenas a superfície não resolve."

Essa filosofia é o que diferencia o tratamento. Ele não trata a covinha. Ele trata o que cria a covinha.

CREDENCIAIS (lista):
- Coberturas em TV SBT ao vivo, Globo e UOL
- Criador do método Dream Incision, ensinado para médicos em todo o Brasil
- Charles Esteves, a maior referência em cirurgia vascular do Brasil, é um dos médicos formados por ele na técnica
- Curso para médicos avaliado em R$85.000 por participante
- Atendimento em Alphaville (SP) e Atibaia (SP)
- Filiado à World Society of Anti-Aging Medicine (França) e World Academy of Anti-Aging Medicine (EUA)

FRASE DE FECHAMENTO DA SEÇÃO:
Quando médicos especialistas pagam R$85.000 para aprender um método, é porque o método funciona.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEÇÃO 6 — DEPOIMENTOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOTA PARA O DEV: Substituir pelos depoimentos reais das pacientes quando disponíveis.
Os textos abaixo têm estrutura aprovada para esse tipo de copy médica.

DEPOIMENTO 1:
Nome: Fernanda, 38 anos
Texto:
"Eu tinha parado de ir à piscina com as minhas filhas. Ficava dentro do canguru, dentro da toalha, inventando desculpa. Depois de dois meses do tratamento com o Dr. Cleugo, fui para o litoral e usei biquíni pela primeira vez em quatro anos. Não foi dramático. Simplesmente me senti livre para ir."

DEPOIMENTO 2:
Nome: Carla, 45 anos
Texto:
"Já tinha feito quatro procedimentos diferentes antes. Cada um prometia resultado definitivo. Quando ouvi isso de novo, na consulta com o Dr. Cleugo, eu já estava desconfiada. Mas ele explicou a diferença de uma forma que fez sentido. Três meses depois eu entendi. A pele mudou de um jeito que os outros tratamentos nunca chegaram perto."

DEPOIMENTO 3:
Nome: Renata, 33 anos
Texto:
"O que me convenceu foi ele dizer que o resultado é natural porque vem do meu próprio colágeno. Tinha medo de ficar com aquele aspecto artificial. Não ficou. Minha cunhada me perguntou se eu estava malhar mais. Não malho nada diferente. A pele é que ficou outra."


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEÇÃO 7 — CTA FINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HEADLINE:
Se você está cansada de tratar o que aparece na superfície, vale entender o que está por baixo.

TEXTO DE APOIO:
Na conversa com a equipe do Dr. Cleugo, você vai entender se a Dream Incision faz sentido para o seu caso, como o tratamento funciona na prática e o que esperar de resultado.

Sem pressão. Sem compromisso. Só informação de verdade para você decidir com clareza.

TEXTO DO BOTÃO:
Quero conversar com a equipe

NOTA DE SEGURANÇA DE DADOS:
Suas informações são confidenciais e usadas apenas para o contato sobre o tratamento. Não compartilhamos com terceiros.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEÇÃO 8 — FAQ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PERGUNTA 1:
Dói? Como é o procedimento na prática?

RESPOSTA:
O procedimento é feito com anestesia local no consultório. Você fica acordada, mas não sente dor durante o tratamento. Pode haver desconforto leve nos dias seguintes, parecido com a sensação de músculo trabalhado. Não há internação e a maioria das pacientes volta às atividades normais em poucos dias.

PERGUNTA 2:
Tenho medo de ficar com aspecto artificial ou estranho. Como fica o resultado?

RESPOSTA:
Esse medo é justo e o Dr. Cleugo ouve isso todo dia. A Dream Incision não injeta nenhuma substância. Ela estimula o seu próprio colágeno, que preenche e firma a região de dentro para fora. O resultado é a sua pele, mais lisa e firme, sem volume artificial, sem cara de procedimento. A mudança é notada, mas não é explicada.

PERGUNTA 3:
Em quanto tempo eu vejo o resultado?

RESPOSTA:
Os primeiros resultados aparecem entre 30 e 60 dias após o procedimento, enquanto o colágeno começa a ser produzido. O resultado final se consolida entre 3 e 6 meses. E porque os septos foram fisicamente liberados, eles não voltam, então o resultado se mantém com o tempo.

PERGUNTA 4:
Qualquer pessoa pode fazer? Tenho celulite há muitos anos, serve para mim?

RESPOSTA:
A Dream Incision trata celulite grau 2 e grau 3, que é exatamente a celulite com covinhas visíveis que não some com exercício ou hidratação. O Dr. Cleugo avalia cada caso individualmente na consulta, mas a grande maioria das mulheres que chegam com esse perfil são candidatas ao tratamento. Celulite antiga não é impedimento.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOTAS PARA O DEV (@dev)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Os depoimentos da Seção 6 são estruturais. Substituir pelos reais quando disponíveis.
2. Os números da Seção 2 (social proof bar) devem ser confirmados com o Dr. Cleugo antes de publicar.
3. A nota sobre R$85.000 do curso pode ser removida se o Dr. Cleugo preferir não exibir publicamente.
4. CTA único no formulário. Remover telefone e WhatsApp do rodapé conforme padrão Syra para clientes médicos.
5. Copy funciona para público frio (LLK) e morno (retargeting). Não é necessário versão separada.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Produzido por @copy-chef | Syra Digital | 23/04/2026
`.trim();

async function main() {
  console.log('Localizando pasta do Dr. Cleugo no Drive...');
  const folder = await findClientFolder('Cleugo');

  if (!folder) {
    console.error('Pasta do Dr. Cleugo não encontrada no Drive.');
    process.exit(1);
  }

  console.log(`Pasta encontrada: ${folder.name} (${folder.id})`);
  console.log('Criando documento...');

  const doc = await createDoc(
    'Copy Landing Page — Dream Incision (v1)',
    COPY,
    folder.id
  );

  console.log('\n✓ Documento criado com sucesso!');
  console.log(`  Link: ${doc.url}`);
  console.log(`  ID: ${doc.id}`);
}

main().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
