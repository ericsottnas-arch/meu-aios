/**
 * Alex Brain — Motor de IA hibrido para Super Alex 2.0
 * Groq LLaMA 3.3 70B (simples) + Claude Haiku 4.5 (complexo)
 */

const alexMemory = require('./alex-memory');
const alexContext = require('./alex-context');

// APIs
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.replace(/"/g, '');
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_FALLBACK = 'llama-3.1-8b-instant';

/**
 * Funcao principal: conversa inteligente com contexto
 * @param {string} chatId
 * @param {string} userMessage
 * @param {object} context - Contexto ja coletado (de alex-context)
 * @returns {{ response: string, model: string, tokensUsed: number }}
 */
async function chat(chatId, userMessage, context) {
  // 1. Montar system prompt com persona + contexto
  const contextStr = alexContext.formatContextForPrompt(context);
  const systemPrompt = buildSystemPrompt(contextStr);

  // 2. Carregar historico (20 recentes + resumo)
  const history = alexMemory.getHistoryForLLM(chatId, 20);

  // 3. Detectar complexidade
  const isComplex = detectComplexity(userMessage, history);

  // 4. Montar mensagens
  const messages = [];
  // Historico (pular system messages do resumo - vao no system prompt)
  for (const msg of history) {
    if (msg.role === 'system') {
      // Resumo ja esta no systemPrompt via context
      continue;
    }
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: userMessage });

  // 5. Chamar modelo
  let response, model, tokensUsed;

  if (isComplex && ANTHROPIC_API_KEY) {
    try {
      const result = await callClaude(systemPrompt, messages, 0.4);
      response = result.text;
      model = CLAUDE_MODEL;
      tokensUsed = result.tokens;
    } catch (err) {
      console.warn('[alex-brain] Claude falhou, fallback Groq:', err.message);
      const result = await callGroq(systemPrompt, messages, 0.3);
      response = result.text;
      model = result.model;
      tokensUsed = result.tokens;
    }
  } else {
    const result = await callGroq(systemPrompt, messages, 0.3);
    response = result.text;
    model = result.model;
    tokensUsed = result.tokens;
  }

  console.log(`[alex-brain] ${isComplex ? 'COMPLEXO' : 'SIMPLES'} → ${model} (${tokensUsed} tokens)`);

  return { response, model, tokensUsed };
}

/**
 * Detecta se a pergunta e complexa (Claude) ou simples (Groq)
 */
function detectComplexity(text, history) {
  const norm = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Padroes complexos: decisoes, estrategia, analise, opiniao
  const complexPatterns = [
    /o que (?:voce )?acha/,
    /qual (?:a )?(?:melhor )?estrategia/,
    /como (?:devo|devemos|posso|podemos)/,
    /(?:devo|deveria|vale a pena)/,
    /(?:prioriz|analisa|avalia|compara)/,
    /(?:plano|planej|roadmap)/,
    /(?:o que fazer|por onde come[cç])/,
    /(?:sugere|sugira|recomend)/,
    /(?:vantagem|desvantagem|pros? e contras?)/,
    /(?:diagnostico|problema|resolver)/,
    /(?:tender?cia|cenario|previsao)/,
  ];

  for (const pattern of complexPatterns) {
    if (pattern.test(norm)) return true;
  }

  // Mensagens longas (>200 chars) tendem a ser complexas
  if (text.length > 200) return true;

  // Se historico recente indica conversa profunda
  if (history.length > 10) {
    const recentComplex = history.slice(-5).some(m =>
      m.content && m.content.length > 300
    );
    if (recentComplex) return true;
  }

  return false;
}

/**
 * Chama Claude Haiku 4.5 via Anthropic API
 */
async function callClaude(systemPrompt, messages, temperature = 0.4) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      temperature,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return {
    text: data.content?.[0]?.text || '',
    tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}

/**
 * Chama Groq LLaMA 3.3 70B (com fallback para 8B)
 */
async function callGroq(systemPrompt, messages, temperature = 0.3) {
  const groqMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  for (const model of [GROQ_MODEL, GROQ_FALLBACK]) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: groqMessages,
          temperature,
          max_tokens: 500,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          text: data.choices?.[0]?.message?.content || '',
          model,
          tokens: (data.usage?.total_tokens || 0),
        };
      }

      if (response.status === 429) {
        console.warn(`[alex-brain] Groq rate limit (${model}), tentando fallback...`);
        continue;
      }

      const errText = await response.text();
      throw new Error(`Groq API ${response.status}: ${errText}`);
    } catch (err) {
      if (model === GROQ_FALLBACK) throw err;
      console.warn(`[alex-brain] Groq ${model} falhou:`, err.message);
    }
  }

  throw new Error('Todos os modelos Groq falharam');
}

/**
 * Monta o system prompt com persona do Alex + contexto
 */
function buildSystemPrompt(contextStr) {
  return `Voce e Alex, o COO (Chief Operating Officer) digital da agencia Syra Digital.

PERSONALIDADE:
- Direto, objetivo e proativo
- Tom profissional mas humano (como um COO de confianca)
- Antecipa necessidades do Eric (CEO)
- Sugere acoes quando ve oportunidades ou riscos
- Assina como "-- Alex" ao final de mensagens mais longas

CONTEXTO ATUAL:
${contextStr}

REGRAS DE COMUNICACAO:
- Portugues brasileiro, sem formalidade excessiva
- Conciso: responda em 2-5 frases, maximo 10 quando necessario
- Use 1-2 emojis por mensagem (maximo)
- Formate com Markdown do Telegram (*bold*, _italic_)
- Se nao tiver a informacao, diga honestamente
- NAO invente dados que nao estao no contexto
- Se perceber algo urgente no contexto (tarefa atrasada, reuniao proxima), mencione proativamente
- Para perguntas sobre agenda/reunioes, use os dados do calendario
- Para perguntas sobre tarefas, use os dados do ClickUp
- Quando Eric pedir opiniao/analise, de uma resposta estrategica e fundamentada`;
}

module.exports = {
  chat,
  detectComplexity,
  callClaude,
  callGroq,
  buildSystemPrompt,
};
