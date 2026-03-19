// meu-projeto/lib/nova-learner.js
// Salva cada análise aprovada como lição estruturada para a Nova
//
// Cada swipe salvo vira uma entrada no nova-estrategias.md:
//   - O que era o conteúdo original
//   - Por que viralizou (razão real)
//   - Qual estratégia de adaptação foi indicada
//   - Os hooks sugeridos
//   - A lição consolidada para conteúdos futuros

const fs = require('fs');
const path = require('path');

const ESTRATEGIAS_PATH = path.resolve(
  __dirname,
  '../../docs/eric-brand/knowledge-base/nova-estrategias.md'
);

const STRATEGY_LABEL = {
  'bridge-post':          '🌉 Bridge Post — captura energia de outro mercado',
  'replicate-mechanism':  '🔄 Replicar Mecanismo — mesmo formato, outro tema',
  'find-analogy':         '🔍 Analogia — equivalente no mercado médico/estético',
  'comment-on-trend':     '💬 Comentar Trend — trend aplicada ao nicho',
};

const CATEGORY_LABEL = {
  hype:          '🔥 Hype — aproveita momento/personagem externo',
  educational:   '📚 Educacional — ensina algo prático',
  controversy:   '⚡ Controverso — opinião forte',
  announcement:  '📣 Anúncio — movimento/novidade',
  entertainment: '🎭 Entretenimento',
  evergreen:     '🌿 Evergreen — funciona sempre',
};

function saveAnalysisToNova(analysis, url, swipeId) {
  if (!fs.existsSync(ESTRATEGIAS_PATH)) return;

  const date = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const stratLabel = STRATEGY_LABEL[analysis.adaptationStrategy] || analysis.adaptationStrategy || '—';
  const catLabel   = CATEGORY_LABEL[analysis.contentCategory]    || analysis.contentCategory    || '—';

  // Monta a lição consolidada — o resumo "o que aprender com isso"
  const licao = buildLicao(analysis);

  const lines = [
    '',
    `## ${date} | ${swipeId || analysis.format} | ${analysis.username || 'desconhecido'}`,
    '',
    `**Categoria:** ${catLabel}`,
    `**Formato:** ${analysis.format}`,
    `**Tema:** ${analysis.theme || '—'}`,
    `**Técnica:** ${analysis.technique || '—'}`,
    '',
  ];

  if (analysis.persons)      lines.push(`**Personagens/Contexto:** ${analysis.persons}`, '');
  if (analysis.hypeContext)   lines.push(`**Fator Hype:** ${analysis.hypeContext}`, '');
  if (analysis.timingFactor)  lines.push(`**Timing:** ${analysis.timingFactor}`, '');

  lines.push(
    `**Por que viralizou:**`,
    analysis.viralReason || analysis.whyViral || '—',
    '',
  );

  if (analysis.adaptationStrategy) {
    lines.push(`**Estratégia de adaptação:** ${stratLabel}`, '');
  }

  if (analysis.hookSuggestions?.length) {
    lines.push('**Hooks gerados para @byericsantos:**');
    analysis.hookSuggestions.forEach((h, i) => lines.push(`${i + 1}. ${h}`));
    lines.push('');
  }

  lines.push(
    '**🧠 Lição para a Nova:**',
    licao,
    '',
    `> Swipe ID: ${swipeId || '—'} | [Link original](${url})`,
    '',
    '---',
  );

  // Insere antes do marcador de fim (mantém o cabeçalho intacto)
  const content = fs.readFileSync(ESTRATEGIAS_PATH, 'utf8');
  const marker = '<!-- ENTRADAS ABAIXO — NÃO REMOVA ESTE MARCADOR -->';
  const markerIdx = content.indexOf(marker);

  if (markerIdx > -1) {
    const before = content.substring(0, markerIdx + marker.length);
    const after  = content.substring(markerIdx + marker.length);
    fs.writeFileSync(ESTRATEGIAS_PATH, before + '\n' + lines.join('\n') + after, 'utf8');
  } else {
    // Fallback: append no final
    fs.appendFileSync(ESTRATEGIAS_PATH, '\n' + lines.join('\n'), 'utf8');
  }
}

// Gera a lição consolidada — o insight reutilizável
function buildLicao(analysis) {
  const parts = [];

  // Padrão de conteúdo baseado na categoria
  if (analysis.contentCategory === 'hype') {
    parts.push(
      `Conteúdo de hype de outro mercado. ` +
      `Não copiar o personagem — capturar a ENERGIA do momento. ` +
      `Perguntar: "Qual é o equivalente desse movimento no mundo da clínica/consultório?"`
    );
  } else if (analysis.contentCategory === 'educational') {
    parts.push(
      `Conteúdo educacional que funciona por ser específico e acionável. ` +
      `Replicar a mesma especificidade para o nicho de saúde/estética.`
    );
  } else if (analysis.contentCategory === 'controversy') {
    parts.push(
      `Post controverso — funciona por confrontar uma crença do mercado. ` +
      `Encontrar a crença equivalente que profissionais de saúde/estética têm (e que está errada).`
    );
  } else if (analysis.contentCategory === 'announcement') {
    parts.push(
      `Anúncio que viralizou pelo status/reputação de quem anuncia. ` +
      `Para @byericsantos: transformar cases e conquistas de clientes em micro-anúncios.`
    );
  }

  // Padrão da estratégia
  if (analysis.adaptationStrategy === 'bridge-post') {
    parts.push(
      `Estratégia bridge: identificar o "movimento" ou "sensação" do post original e ` +
      `criar uma ponte direta com o dia a dia do profissional de saúde.`
    );
  } else if (analysis.adaptationStrategy === 'replicate-mechanism') {
    parts.push(
      `Replicar o mecanismo visual/copy para o tema de visibilidade e marketing para saúde.`
    );
  }

  // Timing insight
  if (analysis.timingFactor) {
    parts.push(`Timing importa: ${analysis.timingFactor}`);
  }

  return parts.length ? parts.join(' ') : 'Padrão identificado — revisar análise acima para lição específica.';
}

// ============================================================
// APRENDIZADO GERAL — recebe qualquer input do Eric e armazena
// ============================================================

const APRENDIZADOS_PATH = path.resolve(
  __dirname,
  '../../docs/eric-brand/knowledge-base/nova-diario-eric.md'
);

const INPUT_CATEGORY = {
  vendas:     '💰 Vendas — insight comercial, objeções, fechamento',
  conteudo:   '📱 Conteúdo — referência, post que gostou, ideia',
  estrategia: '🧠 Estratégia — decisão de negócio, posicionamento',
  cliente:    '👥 Cliente — feedback, informação de lead/paciente',
  mercado:    '📊 Mercado — tendência, notícia, dado do setor',
  pessoal:    '🎯 Pessoal — reflexão, meta, aprendizado pessoal',
  geral:      '📝 Geral',
};

/**
 * Classifica o input do Eric usando Claude Haiku (rápido e barato)
 * Retorna: { category, summary, keyInsight, tags }
 */
async function classifyInput(text, apiKey) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Classifique este input do Eric Santos (dono de agência de marketing para clínicas de estética).
Responda APENAS em JSON válido, sem markdown:

{"category":"vendas|conteudo|estrategia|cliente|mercado|pessoal|geral","summary":"resumo em 1 frase","keyInsight":"o insight principal extraído","tags":["tag1","tag2"]}

INPUT:
${text.substring(0, 1500)}`,
        }],
      }),
    });

    if (!response.ok) throw new Error(`API ${response.status}`);
    const data = await response.json();
    const raw = data.content[0].text.trim();
    return JSON.parse(raw);
  } catch (err) {
    console.error('[nova-learner] classifyInput error:', err.message);
    return {
      category: 'geral',
      summary: text.substring(0, 100),
      keyInsight: text.substring(0, 200),
      tags: [],
    };
  }
}

/**
 * Salva qualquer input do Eric como aprendizado
 * @param {string} text - O conteúdo enviado
 * @param {string} inputType - 'text' | 'link' | 'photo' | 'voice'
 * @param {string} apiKey - Anthropic API key
 * @param {string} [photoDesc] - Descrição da foto (se inputType=photo)
 * @returns {Promise<{category: string, summary: string}>}
 */
async function saveLearningInput(text, inputType, apiKey, photoDesc) {
  // Classifica o input
  const classified = await classifyInput(photoDesc || text, apiKey);

  const date = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const time = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  });

  const catLabel = INPUT_CATEGORY[classified.category] || INPUT_CATEGORY.geral;
  const typeEmoji = { text: '💬', link: '🔗', photo: '📸', voice: '🎙️' }[inputType] || '📝';

  const lines = [
    '',
    `## ${date} ${time} | ${typeEmoji} ${inputType}`,
    '',
    `**Categoria:** ${catLabel}`,
    `**Resumo:** ${classified.summary}`,
    `**Tags:** ${classified.tags.length ? classified.tags.map(t => `\`${t}\``).join(' ') : '—'}`,
    '',
    `**Input original:**`,
    `> ${(text || '').split('\n').join('\n> ')}`,
    '',
    `**Insight extraído:**`,
    classified.keyInsight,
    '',
    '---',
  ];

  // Garante que o arquivo existe
  if (!fs.existsSync(APRENDIZADOS_PATH)) {
    const dir = path.dirname(APRENDIZADOS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(APRENDIZADOS_PATH, [
      '# Diário de Aprendizados — Eric Santos',
      '',
      '> Inputs enviados pelo Eric via Telegram. Classificados e armazenados automaticamente.',
      '> Categorias: vendas | conteudo | estrategia | cliente | mercado | pessoal | geral',
      '',
      '<!-- ENTRADAS ABAIXO — NÃO REMOVA ESTE MARCADOR -->',
      '',
    ].join('\n'), 'utf8');
  }

  const content = fs.readFileSync(APRENDIZADOS_PATH, 'utf8');
  const marker = '<!-- ENTRADAS ABAIXO — NÃO REMOVA ESTE MARCADOR -->';
  const markerIdx = content.indexOf(marker);

  if (markerIdx > -1) {
    const before = content.substring(0, markerIdx + marker.length);
    const after = content.substring(markerIdx + marker.length);
    fs.writeFileSync(APRENDIZADOS_PATH, before + '\n' + lines.join('\n') + after, 'utf8');
  } else {
    fs.appendFileSync(APRENDIZADOS_PATH, '\n' + lines.join('\n'), 'utf8');
  }

  return { category: classified.category, summary: classified.summary, catLabel };
}

module.exports = { saveAnalysisToNova, saveLearningInput };
