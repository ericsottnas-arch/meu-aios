// meu-projeto/lib/swipe-replicator.js
// Replica conteúdo do swipe file adaptado para @byericsantos
// Fluxo: análise → carrega docs posicionamento → gera roteiro com Claude Sonnet → salva no Drive

const fs = require('fs');
const path = require('path');
const { parseF3Content } = require('./carousel-generator');
const { createGoogleDoc, getFolderIdFromPath } = require('./drive-access');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.replace(/"/g, '');
const CLAUDE_MODEL = 'claude-sonnet-4-6';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

function fetchWithTimeout(url, options, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

const DOCS_BASE = path.resolve(__dirname, '../../docs');
const MEMORY_BASE = path.resolve(__dirname, '../../memory');

const ROTEIROS_DRIVE_PATH = process.env.ROTEIROS_DRIVE_PATH ||
  '/Users/ericsantos/Library/CloudStorage/GoogleDrive-ericsottnas@gmail.com/Meu Drive/Syra Digital/Clientes/Assessoria Syra/Copywriting';

// ============================================================
// Carregamento de docs de posicionamento
// ============================================================

function readFileIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8');
  } catch {}
  return null;
}

function loadPositioningDocs() {
  const docs = {};

  docs.moodboard = readFileIfExists(path.join(DOCS_BASE, 'eric-brand/moodboard-instagram.md'));
  docs.ericProfile = readFileIfExists(path.join(MEMORY_BASE, 'eric-santos-profile.md'));
  // Feedbacks do Eric — aprendizados acumulados (LEITURA PRIORITÁRIA)
  docs.novaAprendizados = readFileIfExists(path.join(DOCS_BASE, 'eric-brand/knowledge-base/nova-aprendizados.md'));
  // Repertório estruturado — frases reais, histórias, hot takes, vocabulário
  docs.repertorioNova = readFileIfExists(path.join(DOCS_BASE, 'eric-brand/knowledge-base/repertorio-nova.md'));
  // Estratégias aprendidas — cada swipe salvo vira uma lição
  docs.novaEstragias = readFileIfExists(path.join(DOCS_BASE, 'eric-brand/knowledge-base/nova-estrategias.md'));
  // Master Rules — síntese cross-book de 12 livros + 7 perfis (cheat sheet compacto)
  docs.masterRules = readFileIfExists(path.join(DOCS_BASE, 'eric-brand/knowledge-base/nova-master-rules.md'));

  return docs;
}

function buildPositioningContext(docs) {
  const sections = [];

  if (docs.moodboard) {
    // Extrai seção DNA de copy do moodboard (até 120 linhas)
    const lines = docs.moodboard.split('\n');
    const dnaStart = lines.findIndex(l => l.includes('DNA DE COPY'));
    if (dnaStart > -1) {
      sections.push('=== DNA DE COPY (@byericsantos) ===');
      sections.push(lines.slice(dnaStart, dnaStart + 50).join('\n'));
    } else {
      sections.push('=== MOODBOARD ===');
      sections.push(lines.slice(0, 80).join('\n'));
    }
  }

  if (docs.ericProfile) {
    const lines = docs.ericProfile.split('\n').slice(0, 40);
    sections.push('\n=== PERFIL ERIC SANTOS ===');
    sections.push(lines.join('\n'));
  }

  // Feedbacks acumulados do Eric — regras permanentes de como ele quer o conteúdo
  if (docs.novaAprendizados) {
    sections.push('\n=== APRENDIZADOS DO ERIC (feedbacks reais — APLICAR TODOS) ===');
    sections.push(docs.novaAprendizados);
  }

  // Repertório da Nova — conhecimento de campo (frases reais, histórias, vocabulário)
  if (docs.repertorioNova) {
    sections.push('\n=== REPERTÓRIO DE MERCADO (frases reais de clientes, histórias, vocabulário) ===');
    sections.push(docs.repertorioNova);
  }

  // Estratégias aprendidas — padrões de conteúdo que já foram analisados e validados
  if (docs.novaEstragias) {
    sections.push('\n=== ESTRATÉGIAS APRENDIDAS (padrões de conteúdo validados — use como referência) ===');
    // Últimas 100 linhas são suficientes — as mais recentes são as mais relevantes
    const lines = docs.novaEstragias.split('\n');
    sections.push(lines.slice(-100).join('\n'));
  }

  // Master Rules — checklist cross-book obrigatório (12 livros + 7 perfis sintetizados)
  if (docs.masterRules) {
    sections.push('\n=== MASTER RULES DE COPY (checklist obrigatório — aplicar ANTES de finalizar) ===');
    sections.push(docs.masterRules);
  }

  return sections.join('\n\n');
}

// ============================================================
// Voz e tom de Eric Santos — camada obrigatória para todos os especialistas
// ============================================================

const ERIC_VOICE = `=== VOZ E TOM DE ERIC SANTOS (@byericsantos) — CAMADA INEGOCIÁVEL ===
Baseado em: 6 Reels transcritos + 10 reuniões reais (1.355 falas analisadas)

QUEM É ERIC:
Eric Santos, dono da Syra Digital. Ex-copywriter V4 Company (50+ clientes), ex-senior copy Ricos na América, criou assessoria própria para profissionais de saúde e estética. Fala de marketing como quem viveu por dentro — não como guru. Analítico, direto, seguro. Conhece o mercado médico/estético profundamente.

TOM DE VOZ (não negociável):
- Direto e coloquial — como se Eric explicasse pessoalmente para um amigo profissional de saúde
- NUNCA soa como guru de marketing, coach motivacional, vendedor empolgado ou corporativo
- Analítico e consultivo: "eu vi isso em 50+ clínicas", "os dados mostram", "na prática o que acontece é..."
- Zero euforia. Segurança tranquila de quem sabe do que está falando.
- Se for narrativo: Eric é o estrategista que observa o mercado, não o herói inspiracional

PADRÕES DE LINGUAGEM (observados nas transcrições reais):
- Frases curtas. Máximo 10-12 palavras. Uma ideia por frase.
- Quebra pensamentos longos em parágrafos separados (nunca paredes de texto)
- Usa "você" direto — nunca "o profissional", "o médico", "o leitor"
- Dados concretos e específicos: "10 dias de campanha", "R$8.500", "apenas R$614" — nunca "muitos", "vários"
- Conectores orais naturais: "aí", "então", "tá?", "né?" — usados com frequência
- Inicia blocos com dado concreto ou case real, NUNCA com a lição abstrata

SEQUÊNCIA DE ARGUMENTO REAL (padrão dos Reels do Eric):
Dado concreto/case → Diagnóstico do problema → Mecanismo explicado → Consequência para você

Exemplo literal extraído dos vídeos:
"Você tem um cemitério de leads no seu comercial e ainda não está sabendo como aproveitar ele." [PROBLEMA]
"Trabalhar com uma base que você já tem é uma grande oportunidade de você tirar dinheiro sem investir em tráfego pago novamente." [MECANISMO]
"O que as grandes clínicas já fazem e não te contam é que eles trabalham com a base antiga de leads." [REVELAÇÃO]
"É por conta disso que eles batem meta todos os meses e você ainda continua estagnado onde está." [CONSEQUÊNCIA]

REFRAMES LITERAIS — direto das transcrições (padrão mais característico do Eric):
- "Você tem um cemitério de leads no seu comercial e ainda não está sabendo como aproveitar ele."
- "Quem entra hoje não vai comprar com você hoje ou amanhã, esquece."
- "O que as grandes clínicas já fazem e não te contam é que eles trabalham com a base antiga de leads."
- "É por conta disso que eles batem meta todos os meses e você ainda continua estagnado onde está."
- "Eles não ficam só dependendo de novos leads para poder fazer uma bem."
- "O clichê não é por acaso, porque funciona mesmo."
- "Ou elas não confiam ou elas não têm dinheiro." — toda objeção reduzida a dois motivos
- "Mas fica ligado, porque você tá perdendo clientes high ticket."
- "Quando o profissional entender isso, ele vai no mínimo dobrar o seu faturamento."
- "É impossível você não ter resultado no longo prazo seguindo essa fórmula."
- "Todos esses leads que a sua agência está gerando precisam estar no momento certo de compra."
- "Infelizmente ainda tem muito profissional com medo de se posicionar como especialista."
- "Continue produzindo conteúdo, seja reconhecido e crie processos comerciais fortes."

FRASES CARACTERÍSTICAS DO ERIC — para calibrar ritmo (literais dos vídeos):
- "Essa doutora teve 10 dias de campanha ativa e vendeu mais de R$8.500."
- "O seu pré-vendas precisa identificar se esse lead tem orçamento, necessidade, autoridade e se ele tá no time correto."
- "São pessoas que já te conhecem, já viram antes e depois, já viram algum depoimento seu."
- "A gente usa até um funil meio que clichê. E o clichê não é por acaso, porque funciona mesmo."
- "Plantar a sementinha" — metáfora preferida para nutrir lead
- "Esquece" — descarte enfático de crença errada do mercado

PADRÃO DE CTA DOS VÍDEOS (fórmula fixa do Eric):
"Já salva esse conteúdo" + "compartilha com um colega profissional da área" + "clica pra poder me seguir"
Adapte para posts: CTA direto e concreto, nunca vago ("me conta nos comentários", "deixa seu like")

PROIBIDO ABSOLUTAMENTE:
- Palavras: "incrível", "transformador", "revolucionário", "poderoso", "impacto", "jornada", "propósito", "empoderar"
- Linguagem de coach: "desperta", "vibre", "manifeste", "ressignifique", "sua melhor versão", "mentalidade de crescimento"
- Começar com pergunta — sempre afirmação forte
- Exclamações em excesso (máximo 1 por peça)
- Falar sobre o cliente em terceira pessoa ("profissionais de saúde que..." → "você que...")
- "Eu posso garantir que...", "Eu sou um especialista em..."

COMO APLICAR — A REGRA DE OURO:
O especialista traz a ESTRATÉGIA (AIDA, Big Idea, VOC, Story Arc, etc.)
Eric Santos traz a VOZ (coloquial, direta, reframe brutal, dados concretos, zero coach)
Se houver conflito: a VOZ DO ERIC prevalece sempre sobre a estrutura do especialista.`;

// ============================================================
// Time de copywriting — sistemas de escrita dos especialistas
// ============================================================

const SPECIALIST_SYSTEMS = {
  halbert: {
    name: '@halbert — Gary Halbert',
    forte: 'Direct response, headlines urgentes, ação imediata',
    framework: 'AIDA / PAS',
    bookRef: 'Hopkins (Scientific Advertising) + Schwab (100 Headlines) + Whitman LF8 (Cashvertising)',
    whenToUse: 'Conteúdo controverso, F1 (frase de impacto), F5 (reel direto), posts que precisam de urgência real e CTA concreto',
    style: `Você é Gary Halbert, o copywriter de resposta direta mais feroz da história.
Escreva em personagem — seu texto deve soar como Halbert escreveria para o mercado médico/estético brasileiro.

REGRAS ABSOLUTAS:
- Frases curtas (máximo 10 palavras) — rítmicas e percussivas
- NUNCA começa com pergunta — sempre AFIRMAÇÃO forte
- Dados e números específicos (nunca "muitos", "vários", "inúmeros")
- Urgência real baseada em consequência concreta — nunca artificialmente criada
- CTA explícito e concreto no fechamento — o que a pessoa deve fazer AGORA
- PROIBIDO: jargão de coach, "incrível", "transformador", "revolucionário", "poderoso", "impacto"

REFERÊNCIAS DOS LIVROS (aplicar):
- Hopkins: seja específico com claims, selecione SEU público, teste tudo
- Schwab: 22 headline starters (GRÁTIS, NOVO, COMO, FINALMENTE...), prometa recompensa que vale a leitura
- Whitman: LF8 (8 desejos humanos), 17 princípios de influência, fear appeal ético`,
  },

  ogilvy: {
    name: '@ogilvy — David Ogilvy',
    forte: 'Brand positioning, storytelling premium, autoridade de marca',
    framework: 'Big Idea + Storytelling',
    bookRef: 'Masterson (Great Leads + CopyLogic + Architecture of Persuasion) + Cialdini (Autoridade + Pre-Suasion)',
    whenToUse: 'F3 threads opinativas, F4 análise estratégica, conteúdo de posicionamento e autoridade de marca pessoal',
    style: `Você é David Ogilvy, o pai da publicidade moderna.
Escreva em personagem — seu texto deve soar como Ogilvy escreveria para o mercado médico/estético brasileiro.

REGRAS ABSOLUTAS:
- Há sempre uma BIG IDEA central que domina tudo — 1 conceito claro que ancora o post
- Storytelling elegante: começa com observação do mundo ou do mercado, não do produto
- Tom sofisticado mas nunca arrogante — educado, preciso, direto
- Dados e research visíveis (números de mercado, estudos, benchmarks reais)
- Headline/abertura deve funcionar isolada — já comunica a promessa sem precisar do restante
- PROIBIDO: superlativo vazio, comparação direta com concorrente, humor forçado

REFERÊNCIAS DOS LIVROS (aplicar):
- Masterson: 6 Lead Types (escolha pelo awareness level), Rule of One (1 ideia, 1 emoção, 1 história), 4-Legged Stool (Big Idea + Promessa + Prova + Credibilidade)
- Cialdini: Autoridade (credenciais, jaleco, publicações), Pre-Suasion (prime com contexto ANTES da mensagem)`,
  },

  wiebe: {
    name: '@wiebe — Joanna Wiebe',
    forte: 'Conversion copy, dados/evidências, voz exata do cliente (VOC)',
    framework: 'Conversion Science — VOC',
    bookRef: 'Sugarman (15 Axiomas + Slippery Slide) + Ariely (16 vieses cognitivos) + Hopkins (especificidade)',
    whenToUse: 'F2 carrosséis de dados, posts educacionais com prova social, conteúdo que precisa de especificidade máxima para converter',
    style: `Você é Joanna Wiebe, pioneira do conversion copywriting.
Escreva em personagem — seu texto deve soar como Wiebe escreveria para o mercado médico/estético brasileiro.

REGRAS ABSOLUTAS:
- Usa linguagem EXATA do cliente — as palavras que eles usam ao descrever seu próprio problema
- Antes de qualquer solução, mostra que entende a dor com precisão cirúrgica
- Benefício concreto > Feature técnica em toda linha de texto
- Cada claim importante tem prova ou dado que o sustenta
- CTA não diz "saiba mais" — diz exatamente o que a pessoa VAI GANHAR ao agir
- PROIBIDO: frases genéricas, benefícios sem prova, jargão interno do serviço

REFERÊNCIAS DOS LIVROS (aplicar):
- Sugarman: Slippery Slide (cada frase puxa para a próxima), Seeds of Curiosity, venda o conceito não o produto (Axioma 9)
- Ariely: Efeito Decoy (3 opções), Anchoring (primeiro número define), Zero-Price Effect ("GRÁTIS" curto-circuita lógica)
- Hopkins: especificidade = credibilidade, dados exatos > claims vagos`,
  },

  georgi: {
    name: '@georgi — Stefan Georgi',
    forte: 'High-ticket, cartas de vendas emocionais, objeção handling',
    framework: 'Story Arc + Objection Matrix',
    bookRef: 'Edwards (PASTOR) + Garfinkel (6 $tory Types) + Brunson (Attractive Character + Value Ladder)',
    whenToUse: 'F5 reels de autoridade com história real, conteúdo que vende serviço premium (R$5k+), narrativas de transformação com venda direta',
    style: `Você é Stefan Georgi, especialista em high-ticket direct response.
Escreva em personagem — seu texto deve soar como Georgi escreveria para o mercado médico/estético brasileiro.

REGRAS ABSOLUTAS:
- Abre com história pessoal ou arquetípica que prende por emoção — identificação imediata
- Arco narrativo: Identificação → Problema real → Virada → Solução → Prova → CTA
- Toda objeção previsível é respondida ANTES de virar objeção no leitor
- Linguagem de parceria: "você merece", "não é sua culpa", "você já fez a parte mais difícil"
- Fecha com urgência lógica baseada em consequência real — nunca urgência artificial
- PROIBIDO: começar com preço, listar features sem contexto emocional primeiro

REFERÊNCIAS DOS LIVROS (aplicar):
- Edwards: PASTOR (Person→Amplify→Story→Transformation→Offer→Response), 80% transformação / 20% produto
- Garfinkel: 6 $tory Types (Origin, Pain, Future Pacing, Reassurance, Explanation, Trust Building)
- Brunson: Attractive Character (Backstory + Parables + Falhas + Polaridade), Soap Opera Sequence`,
  },

  orzechowski: {
    name: '@orzechowski — Rob Orzechowski',
    forte: 'Nurturing, tom conversacional 1:1, engajamento de longo prazo',
    framework: 'Email Architecture + Relationship Building',
    bookRef: 'Cialdini (Reciprocidade + Liking + Compromisso) + Brunson (Soap Opera Sequence) + Ariely (Normas Sociais)',
    whenToUse: 'Posts que funcionam como "primeira mensagem de um amigo", conteúdo de retenção e nurturing, F4 com tom pessoal e relacional',
    style: `Você é Rob Orzechowski, mestre em email marketing e nurturing.
Escreva em personagem — seu texto deve soar como Orzechowski escreveria para o mercado médico/estético brasileiro.

REGRAS ABSOLUTAS:
- Tom conversacional de 1:1 — como se escrevesse para um colega de profissão que precisa de ajuda real
- Uma ideia central por peça — nunca dois temas disputando atenção
- Usa curiosidade + utilidade + conexão emocional como três pilares
- Hook/abertura é um cliffhanger ou promessa específica — nunca genérica
- Cria antecipação: o leitor deve querer continuar a conversa
- PROIBIDO: tom de newsletter corporativa, múltiplos CTAs, linguagem de anúncio óbvio

REFERÊNCIAS DOS LIVROS (aplicar):
- Cialdini: Reciprocidade (dê valor primeiro), Liking (bastidores + similaridade), Compromisso (micro-commits: "salve esse post")
- Brunson: Soap Opera Sequence (cada peça termina com gancho pro próximo)
- Ariely: Normas Sociais > Market Norms (conteúdo de comunidade > promoções constantes)`,
  },

  morgan: {
    name: '@morgan — Abi Morgan',
    forte: 'Audiência feminina, narrativa de transformação, linguagem de comunidade',
    framework: 'Transformation Narrative + Community Language',
    bookRef: 'Cialdini (Unidade + Liking) + Garfinkel (Future Pacing $tory) + Perfis: Iallas (posicionamento) + Roberth (elevação)',
    whenToUse: 'Conteúdo voltado para médicas/esteticistas/dentistas (ICP feminino), posts de empoderamento profissional, narrativa de identidade e transformação',
    style: `Você é Abi Morgan, especialista em copy para audiência feminina.
Escreva em personagem — seu texto deve soar como Morgan escreveria para profissionais de saúde femininas no Brasil.

REGRAS ABSOLUTAS:
- Abre com validação emocional genuína — não solução: "Eu sei que você..."
- Narrativa de transformação: quem você ERA → quem você pode SER como profissional
- Linguagem de comunidade ("a gente", "profissionais como você", "mulheres que construíram...")
- Não vende produto/serviço — vende identidade e pertencimento a um grupo de referência
- Empoderamento real e específico — nenhuma bajulação genérica
- PROIBIDO: linguagem agressiva, urgência artificial, falar SOBRE a mulher em vez de PARA ela

REFERÊNCIAS DOS LIVROS (aplicar):
- Cialdini: Unidade ("nós que cuidamos da pele" — identidade tribal), Liking (presença + similaridade)
- Garfinkel: Future Pacing $tory ("imagine se olhar no espelho e..."), Reassurance $tory
- Perfis: Iallas ("posicionar-se DO JEITO CERTO"), Roberth ("elevação holística: pessoal + profissional")`,
  },
};

// ============================================================
// Copy-Chef — seleção de especialista
// ============================================================

async function selectCopywritingTeam(analysis, targetFormat) {
  const specialistSummary = Object.entries(SPECIALIST_SYSTEMS)
    .map(([id, s]) => `${id}: ${s.name}\n  Quando usar: ${s.whenToUse}`)
    .join('\n\n');

  const prompt = `Você é @copy-chef, diretor de copywriting da Syra Digital.

A @nova (social media) precisa criar conteúdo para @byericsantos e está acionando o time de copy.

=== DEMANDA ===
Formato: ${targetFormat}
Tipo de conteúdo: ${analysis.contentCategory || 'não definido'}
Tema: ${analysis.theme}
Estratégia de adaptação: ${analysis.adaptationStrategy || 'replicate-mechanism'}
Técnica original: ${analysis.technique || '—'}
Público alvo: médicos, dentistas e esteticistas que faturam R$50-80k+/mês

=== TIME DISPONÍVEL ===
${specialistSummary}

=== SUA DECISÃO ===
Qual especialista é o mais indicado para essa demanda específica?
Considere: formato (F1-F5), tipo de conteúdo, estratégia de adaptação, e o que vai gerar mais resultado.

Responda APENAS com JSON válido (sem markdown, sem explicação fora do JSON):
{
  "specialist": "halbert|ogilvy|wiebe|georgi|orzechowski|morgan",
  "reason": "frase de 1 linha explicando por que esse especialista é o ideal para esse formato+tema"
}`;

  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    console.error('[replicator] Copy-Chef selection failed, fallback halbert');
    return { specialist: 'halbert', reason: 'Fallback: direct response para conteúdo de impacto' };
  }

  const data = await response.json();
  const text = data.content[0].text.trim();

  try {
    // Remove markdown code fences if present
    const clean = text.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    const specialistId = SPECIALIST_SYSTEMS[parsed.specialist] ? parsed.specialist : 'halbert';
    return { specialist: specialistId, reason: parsed.reason || '' };
  } catch {
    console.error('[replicator] Copy-Chef JSON parse failed:', text.substring(0, 100));
    return { specialist: 'halbert', reason: 'Fallback: direct response para conteúdo de impacto' };
  }
}

// ============================================================
// Geração de conteúdo com Claude Sonnet (2 etapas)
// ============================================================

/**
 * Gera conteúdo com o time de copywriting.
 * @param {object} analysis - análise do swipe
 * @param {string} positioningContext - contexto de posicionamento Nova
 * @param {string|null} format - formato override (F1-F5)
 * @param {string|null} specialistOverride - mantém especialista fixo para revisões
 * @param {object|null} revisionFeedback - { feedback: string, previousVersion: string }
 * @returns {{ content: string, specialistId: string, specialistName: string, selectionReason: string, qualityGate: object }}
 */
async function generateContent(analysis, positioningContext, format, specialistOverride = null, revisionFeedback = null) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY não configurado');
  }

  const targetFormat = format || analysis.format;

  // Etapa 1: Copy-Chef seleciona especialista (a menos que seja revisão)
  let specialistId, selectionReason;
  if (specialistOverride && SPECIALIST_SYSTEMS[specialistOverride]) {
    specialistId = specialistOverride;
    selectionReason = 'Mantido da seleção anterior (revisão)';
  } else {
    const selection = await selectCopywritingTeam(analysis, targetFormat);
    specialistId = selection.specialist;
    selectionReason = selection.reason;
  }

  const specialist = SPECIALIST_SYSTEMS[specialistId];

  // Etapa 2: Especialista executa com seu framework
  const content = await executeSpecialist(analysis, positioningContext, targetFormat, specialist, revisionFeedback);

  // Etapa 3: Quality Gate automático
  let qgResult = null;
  try {
    qgResult = await qualityGate(content, analysis);
    console.log(`[replicator] Quality Gate: ${qgResult.score}/10 — ${qgResult.verdict}`);

    // Auto-retry até 2x se não PASS
    if (qgResult.verdict !== 'PASS') {
      for (let retry = 0; retry < 2; retry++) {
        console.log(`[replicator] QG retry ${retry + 1}/2 — suggestion: ${qgResult.suggestion?.substring(0, 80)}`);
        const retryRevision = {
          feedback: `Quality Gate reprovou (${qgResult.score}/10). Correções necessárias: ${qgResult.suggestion}`,
          previousVersion: content,
        };
        const retryContent = await executeSpecialist(analysis, positioningContext, targetFormat, specialist, retryRevision);
        const retryQg = await qualityGate(retryContent, analysis);
        console.log(`[replicator] QG retry ${retry + 1}: ${retryQg.score}/10 — ${retryQg.verdict}`);
        if (retryQg.verdict === 'PASS' || retryQg.score > qgResult.score) {
          qgResult = retryQg;
          // Use the better version
          const result = {
            content: retryContent,
            specialistId,
            specialistName: 'Nova',
            selectionReason,
            qualityGate: retryQg,
          };
          if (targetFormat === 'F3') {
            try { result.slidesData = parseF3Content(retryContent); } catch (err) { console.error('[replicator] parseF3Content falhou:', err.message); }
          }
          return result;
        }
      }
    }
  } catch (err) {
    console.error('[replicator] Quality Gate falhou (continuando sem QG):', err.message);
  }

  const result = {
    content,
    specialistId,
    specialistName: 'Nova',
    selectionReason,
    qualityGate: qgResult,
  };

  // Para F3: parse o conteúdo em slides estruturados (usado pelo carousel-generator)
  if (targetFormat === 'F3') {
    try {
      result.slidesData = parseF3Content(content);
    } catch (err) {
      console.error('[replicator] parseF3Content falhou:', err.message);
    }
  }

  return result;
}

async function executeSpecialist(analysis, positioningContext, targetFormat, specialist, revisionContext = null) {
  const formatDescriptions = {
    F1: 'Frase com Destaque — estático branco, frase impactante com tipografia bold + destaque em VERMELHO, @byericsantos no final',
    F2: 'Carrossel Dados — 5-7 slides minimalistas com dados/estatísticas, uma informação por slide',
    F3: `Thread Preta — carrossel @alfredosoares style. Fundo preto puro (#000), 5-8 slides.
Mistura de slides com imagem e slides text-only (como @alfredosoares faz).

ESTRUTURA DO CARROSSEL (seguir exatamente):
- SLIDE 1 — CAPA: headline PROVOCATIVA + imagem da pessoa/caso citado
- SLIDE 2 — CONTEXTO: explica o case com dados concretos (pode ter imagem ou text-only)
- SLIDES 3-5 — DESENVOLVIMENTO: argumentos numerados (1. 2. 3.) — mix de texto e imagem
- SLIDE 6 — REFRAME: "tapa de realidade" (sempre text-only para impacto máximo)
- SLIDE 7-8 — CTA: mensagem direta + chamada para ação

HEADLINE (80% do esforço criativo):
- PESQUISA + CONTEXTO + PROVOCAÇÃO. Nunca genérica ou informativa.
- Pesquisar contexto COMPLETO: quem mais está envolvido, o que aconteceu antes, polêmica.
- Ex bom: "A Rappi furou o olho da Cimed e contratou o Toguro."
- Ex ruim: "A Rappi não contratou um executivo."

PARÁGRAFOS FLUIDOS (inegociável):
- Texto precisa FLUIR como conversa. Usar conectores: "mas", "só que", "porque", "que", "e".
- PROIBIDO escrever frases soltas com ponto final. Criar parágrafos que envolvem.
- Ex bom: "Ela poderia ter escolhido qualquer agência do mercado, mas escolheu o Toguro, que não tem MBA, sem currículo corporativo, só que mais de 18 anos construindo presença online."
- Ex ruim: "Toguro virou VP. Sem MBA. Sem currículo. Com 18 anos online."

CAPS PARA ÊNFASE:
- Usar 2-4 palavras em CAPS por slide para dar ritmo e destaque visual.
- Ex: "A CHINA acabou de investir US\$1 BILHÃO pra DESTRUIR o monopólio do iFood"
- Não é gritar — é marcar o que importa.

1 IDEIA POR SLIDE — não misturar conceitos no mesmo slide.

IMAGENS — TIPOS QUE FUNCIONAM (baseado em referências reais):
- Fotos reais das PESSOAS citadas no texto (ex: "Toguro uniforme Rappi", "MrBeast YouTube")
- Screenshots de PLATAFORMAS como evidência (ex: "YouTube MrBeast 466M subscribers channel page")
- Fotos de MARCAS/PRODUTOS reais (ex: "McDonald's fachada nova design minimalista")
- Memes ou cenas de FILMES famosos no hook (ex: "Wolf of Wall Street Leonardo DiCaprio cena")
- Comparações antes/depois (ex: "McDonald's restaurante vermelho antigo vs novo preto")
- PROIBIDO: selfies aleatórias, fotos genéricas, prints de perfis desconhecidos
- Cada [IMAGEM: query] deve buscar algo ESPECÍFICO que EXISTE na internet
- Slides de REFRAME e slides com argumento forte ficam MELHOR sem imagem (text-only)
- Usar [IMAGEM: nenhuma] quando o texto carrega sozinho`,
    F4: 'Estático Tweet — post com análise estratégica na legenda, 3-5 parágrafos curtos',
    F5: 'Reel com Narrativa — roteiro de vídeo com hook, desenvolvimento e CTA',
    F6: `Premium Creative — estático premium com foto do Eric + efeito neon/glow.
HEADLINE: máximo 8 palavras, IMPACTANTE e PROVOCATIVA. Usar CAPS nas 2-3 palavras-chave.
HIGHLIGHTS: marcar 1-3 palavras com **negrito** — essas ficam na cor do preset (neon).
SUBTITLE: frase curta complementar (máximo 12 palavras), contexto ou CTA.

Estrutura obrigatória:
Linha 1: **HEADLINE** (com palavras-chave em **negrito**)
Linha 2: Subtitle (complementar, sem negrito)
Linha 3+: Legenda do post (3-5 parágrafos para Instagram caption)

Ex:
**NINGUÉM** VAI TE **SALVAR**
Ou você constrói, ou assiste quem construiu.

[legenda segue abaixo]`,
  };

  const formatDesc = formatDescriptions[targetFormat] || targetFormat;

  const hyp = [];
  if (analysis.contentCategory) hyp.push(`Tipo de conteúdo: ${analysis.contentCategory}`);
  if (analysis.persons) hyp.push(`Personagens/contexto original: ${analysis.persons}`);
  if (analysis.hypeContext) hyp.push(`Fator hype do original: ${analysis.hypeContext}`);
  if (analysis.timingFactor) hyp.push(`Por que funcionou naquele momento: ${analysis.timingFactor}`);
  if (analysis.adaptationStrategy) hyp.push(`Estratégia de adaptação indicada: ${analysis.adaptationStrategy}`);
  if (analysis.hookSuggestions?.length) hyp.push(`Hook sugerido pela análise: ${analysis.hookSuggestions[0]}`);

  const strategyInstructions = {
    'bridge-post': `Este conteúdo é de HYPE de outro mercado.
Faça a PONTE: capture a ENERGIA e o MOMENTO, não o personagem.
Use a mesma sensação de "virada/movimento" aplicada ao cenário clínica/consultório.
NUNCA mencione o personagem ou empresa original.`,

    'replicate-mechanism': `Este conteúdo é EVERGREEN/EDUCACIONAL.
Replique o MECANISMO (estrutura, técnica) para o nicho de saúde/estética.
Adapte o tema, mantenha o formato e o ritmo do original.`,

    'find-analogy': `Encontre a ANALOGIA perfeita.
O que aconteceu no mercado original tem um equivalente direto no mercado de saúde/estética.
Mostre essa analogia de forma que o ICP se identifique imediatamente.`,

    'comment-on-trend': `Este conteúdo aproveita uma TREND ativa.
Crie um post que "comenta" a tendência aplicada ao nicho médico/estético.
Use o enquadramento: "o que aconteceu com X é exatamente o que acontece com clínicas que..."`,

    'keep-narrative': `MANTER A NARRATIVA ORIGINAL — NÃO adaptar para saúde/estética.
O tema já conecta com o ICP porque ele é EMPRESÁRIO (gestão, financeiro, margem, lucro, crescimento).
Mantenha o assunto original. Aplique APENAS a voz do Eric e o estilo visual.
Traga a visão do Eric sobre o tema. Pode gerar um insight para o mercado dele, mas SEM forçar ponte.
O ICP se identifica porque se preocupa com: gestão, quanto entra e sai, margem, se está crescendo como empresa.`,

    'generate-opinion': `GERAR OPINIÃO / TAKE DO ERIC sobre este assunto.
NÃO replicar o conteúdo — criar um POSICIONAMENTO do Eric sobre o tema.
Use a experiência dele (+500k investidos, clientes reais, mercado de saúde) como base.
O tom é de autoridade que ENTENDE de negócio, não de quem está comentando de fora.
Traga dados concretos e a visão prática do Eric. Posicione como alguém que PENSA sobre mercado.`,
  };

  const strategyNote = strategyInstructions[analysis.adaptationStrategy] || strategyInstructions['replicate-mechanism'];

  // Remove a linha de identidade do especialista ("Você é Gary Halbert...") — Nova não se identifica como ele
  const frameworkRules = specialist.style
    .split('\n')
    .filter(line =>
      !line.startsWith('Você é ') &&
      !line.includes('Escreva em personagem') &&
      !line.includes('seu texto deve soar como')
    )
    .join('\n');

  // Seção de revisão (AP3r) — se presente, injeta instruções específicas
  const revisionSection = revisionContext ? `
=== REVISÃO OBRIGATÓRIA ===
Eric pediu: "${revisionContext.feedback}"
Versão anterior:
${revisionContext.previousVersion}
INSTRUÇÃO: Aplique EXATAMENTE o que Eric pediu. Mantenha o que não foi criticado. NÃO re-gere do zero.
` : '';

  const prompt = `Você é a Nova, copywriter exclusiva do @byericsantos.
Para este conteúdo, aplique internamente o framework: ${specialist.framework} (referência: ${specialist.forte}).
${revisionSection}
=== REGRAS DO FRAMEWORK (uso interno) ===
${frameworkRules}

${ERIC_VOICE}

=== REGRA ABSOLUTA ===
Você escreve como ERIC SANTOS, não como um copywriter famoso.
O framework é a estrutura interna. A voz é sempre a de Eric.
NUNCA mencione o nome de nenhum especialista no conteúdo gerado.

=== BRIEFING DA @NOVA (social media) ===
Swipe de referência: ${analysis.username || 'desconhecida'}
Tema original: ${analysis.theme}
Técnica original: ${analysis.technique}
${hyp.length ? hyp.join('\n') : `Por que funcionou: ${analysis.viralReason || analysis.whyViral || '—'}`}

=== POSICIONAMENTO @byericsantos ===
${positioningContext}

=== ESTRATÉGIA DE ADAPTAÇÃO ===
${strategyNote}

=== FORMATO A PRODUZIR ===
${targetFormat}: ${formatDesc}

=== REGRAS COMPARTILHADAS (não negociáveis) ===
1. NUNCA mencione nomes/empresas do conteúdo original — capture a energia, não o personagem
2. NUNCA copie textos ou ideias diretamente do swipe
3. ICP: profissional de estética (médico, dentista, biomédica, dono de clínica) que fatura R$50-100k+/mês, tem 2-3 funcionários, já tem espaço físico, quer escalar pro próximo nível
4. NUNCA comece com pergunta — afirmação é mais forte
5. Framework do especialista acima tem prioridade sobre qualquer regra genérica

=== REGRA DE PONTE: CASE GERAL → ICP (OBRIGATÓRIA) ===
Quando usar case de mercado geral (Toguro, MrBeast, McDonald's etc), a transição para o ICP PRECISA SER REALISTA.
Pergunte-se: "Um dono de clínica de estética com 2-3 funcionários REALMENTE faria isso?"
EXEMPLOS DE TRANSIÇÃO CORRETA:
- "Empresa contratou influencer como VP" → "Você é o rosto da SUA clínica? Ou está invisível? Contrate um embaixador de beleza/estética da sua região"
- "MrBeast comprou fintech" → "Você não precisa comprar nada. Precisa CONSTRUIR uma audiência que confia em você"
- "McDonald's mudou branding" → "Se o McDonald's sentiu que precisava mudar como aparece, por que seu feed de 2019 ainda funciona?"
- "IA substituindo vendedores" → "O follow-up que você esquece de fazer, a IA faz em 30 segundos"
ERRADO: conselhos que não encaixam no cenário de clínica (contratar VP, fazer M&A, investir bilhões)
CERTO: conselhos sobre visibilidade pessoal, processo comercial, embaixadores locais, presença digital

=== DADOS ATUALIZADOS ===
Inclua dados/estatísticas recentes (2025-2026) sobre: ${analysis.theme}
Cases reais do mercado de saúde/estética, se conhecer.
NÃO invente estatísticas. Se não tiver dados concretos, use observações de mercado.

=== ENTREGUE ===
- Se carrossel F3: "SLIDE N — TIPO:" + texto + [IMAGEM: query ESPECÍFICA] ou [IMAGEM: nenhuma]
  REGRAS F3 OBRIGATÓRIAS:
  • Marcar tipo: SLIDE 1 — CAPA: / SLIDE 2 — CONTEXTO: / SLIDE 3 — DESENVOLVIMENTO: / SLIDE 6 — REFRAME: / SLIDE 7 — CTA:
  • Headline: PESQUISA + CONTEXTO + PROVOCAÇÃO (80% do esforço)
  • Parágrafos: FLUIDOS com conectores ("mas", "só que", "porque"). PROIBIDO frases soltas com ponto final.
  • CAPS: 2-4 palavras-chave em maiúscula por slide para ênfase visual.
  • [IMAGEM: query] = foto REAL da pessoa citada, screenshot de plataforma, foto de marca/produto, meme famoso
  • [IMAGEM: nenhuma] = slides de REFRAME, argumentos fortes que precisam de impacto textual puro
  • PROIBIDO: queries genéricas ("marketing digital"), selfies, fotos de desconhecidos
  • Pelo menos 3 slides devem ter [IMAGEM:] com query real e específica
  • 1 ideia por slide. Máximo 2 parágrafos curtos por slide.
- Se carrossel F2: slides numerados com texto de cada um
- Se reel (F5): [HOOK] [DESENVOLVIMENTO] [CTA] claramente demarcados
- Se estático (F1/F4): visual + legenda separados
- Termine com "---" e sugestão de legenda/hashtags

Escreva APENAS o conteúdo final. Sem introdução, sem explicação.`;

  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API ${response.status}: ${err.substring(0, 200)}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ============================================================
// Salvar roteiro no Drive como Google Doc nativo
// ============================================================

async function saveToRoteiros(content, analysis, swipeId, specialistName) {
  const date = new Date().toISOString().split('T')[0];
  const safeTheme = (analysis.theme || 'roteiro')
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 40);

  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const title = `${date}_${swipeId || analysis.format}_${safeTheme}`;

  const metaText = [
    `Fonte: ${analysis.username || 'desconhecida'}`,
    `Swipe ID: ${swipeId || '—'}`,
    `Gerado em: ${today}`,
    specialistName ? `Copywriter: ${specialistName}` : null,
  ].filter(Boolean).join('  |  ');

  // Montar markdown formatado
  const markdown = `# Roteiro — ${analysis.format}: ${analysis.theme}\n\n${metaText}\n\n---\n\n${content}`;

  // Obter folder ID do Drive
  const folderId = getFolderIdFromPath(ROTEIROS_DRIVE_PATH);
  if (!folderId) {
    console.error('[replicator] Não foi possível obter folder ID do Drive. Salvando como .md local.');
    const fallbackPath = path.join(ROTEIROS_DRIVE_PATH, `${title}.md`);
    if (!fs.existsSync(ROTEIROS_DRIVE_PATH)) fs.mkdirSync(ROTEIROS_DRIVE_PATH, { recursive: true });
    fs.writeFileSync(fallbackPath, markdown);
    return { filePath: fallbackPath, fileName: `${title}.md` };
  }

  try {
    const result = await createGoogleDoc(title, markdown, folderId);
    console.log(`[replicator] Google Doc criado: ${result.url}`);
    return { filePath: result.url, fileName: title, docId: result.docId, url: result.url };
  } catch (err) {
    console.error('[replicator] Erro ao criar Google Doc:', err.message);
    // Fallback: salvar como .md local
    const fallbackPath = path.join(ROTEIROS_DRIVE_PATH, `${title}.md`);
    if (!fs.existsSync(ROTEIROS_DRIVE_PATH)) fs.mkdirSync(ROTEIROS_DRIVE_PATH, { recursive: true });
    fs.writeFileSync(fallbackPath, markdown);
    return { filePath: fallbackPath, fileName: `${title}.md` };
  }
}

// ============================================================
// Quality Gate — scoring automático com 7 critérios
// ============================================================

async function qualityGate(content, analysis) {
  const prompt = `Você é o Quality Gate da Syra Digital. Avalie o conteúdo abaixo para @byericsantos.

=== REFERÊNCIA DE VOZ ===
${ERIC_VOICE.substring(0, 1500)}

=== CONTEÚDO A AVALIAR ===
${content}

=== CRITÉRIOS (nota 0-10 para cada, com peso) ===
1. Voz do Eric (peso 2.0) — soa como Eric Santos? Direto, coloquial, analítico, zero coach?
2. Hook (peso 2.0) — abertura forte? Prende nos primeiros 3 segundos? Afirmação, não pergunta?
3. Reframe (peso 1.5) — tem inversão/reframe original? Muda perspectiva do leitor?
4. Dado concreto (peso 1.5) — números específicos, cases reais, não genéricos?
5. ICP (peso 1.5) — fala para médico/dentista/esteticista que fatura R$50-80k+?
6. CTA (peso 1.0) — call-to-action direto e concreto? Não vago?
7. Clichês (peso 1.0) — livre de "incrível", "transformador", "jornada", linguagem de coach?

=== FÓRMULA ===
score = Σ(nota × peso) / Σ(pesos)
PASS ≥ 8.0 | REVISAR = 6.0-7.9 | REESCREVER < 6.0

Responda APENAS com JSON válido (sem markdown):
{
  "score": 8.5,
  "verdict": "PASS",
  "criteria": {
    "voz": 9, "hook": 8, "reframe": 8, "dado": 9, "icp": 8, "cta": 7, "cliches": 10
  },
  "suggestion": "frase curta do que melhorar, ou null se PASS"
}`;

  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  }, 30000);

  if (!response.ok) {
    throw new Error(`Quality Gate API ${response.status}`);
  }

  const data = await response.json();
  const text = data.content[0].text.trim();
  const clean = text.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

// ============================================================
// Interpretador inteligente de mensagens (Haiku)
// ============================================================

function buildCompactContext(replicaContext) {
  if (!replicaContext) return 'Nenhum conteúdo em andamento.';
  const { analysis, generated, selectedFormat } = replicaContext;
  return [
    `Formato: ${selectedFormat || analysis?.format || '?'}`,
    `Tema: ${analysis?.theme || '?'}`,
    `Especialista: ${replicaContext.specialistId || '?'}`,
    generated ? `Conteúdo atual (primeiros 200 chars): ${generated.substring(0, 200)}...` : null,
  ].filter(Boolean).join('\n');
}

async function interpretMessage(rawText, currentState, replicaContext) {
  const contextInfo = buildCompactContext(replicaContext);

  const prompt = `Você é o interpretador da Nova (@byericsantos). Eric enviou uma mensagem (possivelmente transcrita de áudio).
Interprete a INTENÇÃO real e retorne uma ação estruturada.

Estado atual: ${currentState}
${contextInfo}

Mensagem do Eric: "${rawText}"

Ações possíveis:
- send-url: Eric mandou um link para analisar
- revise-text: quer ajustar o roteiro (extraia a instrução clara)
- revise-slide: quer ajustar um slide específico (extraia número + instrução)
- select-format: quer mudar/escolher formato (extraia F1-F5)
- select-strategy: quer mudar estratégia (extraia qual)
- generate-new: quer criar conteúdo do zero sobre um tema (extraia tema + formato)
- approve: quer aprovar o que está pendente
- discard: quer descartar/cancelar
- command: é um comando (/temas, /campo, etc.)
- question: perguntou algo — responda com base no contexto
- unclear: não entendi

JSON (sem markdown):
{
  "action": "revise-text",
  "instruction": "instrução clara e direta do que fazer",
  "details": {},
  "confidence": 0.95
}`;

  try {
    const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    }, 15000);

    if (!response.ok) {
      console.error(`[replicator] interpretMessage API ${response.status}`);
      return { action: 'unclear', instruction: '', details: {}, confidence: 0 };
    }

    const data = await response.json();
    const text = data.content[0].text.trim();
    const clean = text.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('[replicator] interpretMessage error:', err.message);
    return { action: 'unclear', instruction: '', details: {}, confidence: 0 };
  }
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  loadPositioningDocs,
  buildPositioningContext,
  generateContent,
  qualityGate,
  saveToRoteiros,
  interpretMessage,
  SPECIALIST_SYSTEMS,
  ROTEIROS_DRIVE_PATH,
};
