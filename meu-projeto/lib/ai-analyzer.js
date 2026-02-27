/**
 * Análise inteligente de tarefas usando Groq LLaMA.
 * Extrai título breve, descrição estruturada, subtasks sugeridas e cliente detectado.
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');
const MODEL = 'llama-3.3-70b-versatile';

function buildSystemPrompt(clientNames) {
  let prompt = `Você é um assistente de gestão de projetos da agência Syra Digital.
Sua função é analisar mensagens (texto, transcrição de áudio, ou descrições de mídia enviada) e extrair uma tarefa estruturada.

Responda SEMPRE em JSON válido com esta estrutura exata:
{
  "title": "Título breve e objetivo (máximo 60 caracteres)",
  "description": "Descrição completa e organizada da tarefa",
  "subtasks": ["Subtarefa 1", "Subtarefa 2"],
  "suggested_priority": "normal",
  "detected_client": null
}

Regras:
- O "title" deve ser curto, claro e em forma imperativa (ex: "Criar landing page para campanha X")
- A "description" deve organizar e expandir o que foi dito, mantendo todos os detalhes
- Se a mensagem mencionar foto, imagem, criativo, documento ou vídeo em anexo, inclua na descrição que há material anexo (ex: "Criativo/imagem em anexo", "Documento anexado para referência")
- Se a mensagem contiver URLs/links, mantenha-os na descrição
- "subtasks" só inclua se a tarefa for complexa e claramente dividível. Se for simples, retorne array vazio []
- "suggested_priority" pode ser: "urgent", "high", "normal" ou "low" — baseie-se no tom e urgência da mensagem
- Não invente informações — use apenas o que foi dito na mensagem
- Se a mensagem for muito curta ou vaga, faça o melhor possível com o que tem`;

  if (clientNames && clientNames.length > 0) {
    prompt += `

DETECÇÃO DE CLIENTE:
A lista de clientes ativos é: ${clientNames.join(', ')}

- "detected_client": Se a mensagem mencionar qualquer um desses clientes (pode ser pelo primeiro nome, sobrenome, apelido ou nome parcial), retorne o NOME COMPLETO EXATO como está na lista acima.
- Exemplos de match: "Vanessa" → "DRA VANESSA SOARES", "Humberto" → "DR HUMBERTO", "Fourcred" → "FOURCRED", "Bruna" → "DRA BRUNA NOGUEIRA", "Gabrielle" → "DRA GABRIELLE"
- Se a mensagem NÃO mencionar nenhum cliente, retorne null
- Não inclua o nome do cliente no título da tarefa quando detectado`;
  }

  return prompt;
}

/**
 * Analisa uma mensagem e retorna tarefa estruturada.
 * @param {string} text - Texto da mensagem ou transcrição de áudio
 * @param {string[]} [clientNames] - Lista de nomes de clientes para detecção
 * @returns {Promise<{title: string, description: string, subtasks: string[], suggested_priority: string, detected_client: string|null}>}
 */
async function analyzeTask(text, clientNames) {
  if (!GROQ_API_KEY) {
    return {
      title: text.split(/[.!?\n]/)[0].substring(0, 60) || text.substring(0, 60),
      description: text,
      subtasks: [],
      suggested_priority: 'normal',
      detected_client: null,
    };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt(clientNames) },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`⚠️  Groq chat API error ${response.status}: ${errText}`);
      return fallbackAnalysis(text);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return fallbackAnalysis(text);
    }

    const parsed = JSON.parse(content);
    return {
      title: (parsed.title || '').substring(0, 60),
      description: parsed.description || text,
      subtasks: Array.isArray(parsed.subtasks) ? parsed.subtasks : [],
      suggested_priority: parsed.suggested_priority || 'normal',
      detected_client: parsed.detected_client || null,
    };
  } catch (err) {
    console.warn('⚠️  AI analysis failed, using fallback:', err.message);
    return fallbackAnalysis(text);
  }
}

function fallbackAnalysis(text) {
  return {
    title: text.split(/[.!?\n]/)[0].substring(0, 60) || text.substring(0, 60),
    description: text,
    subtasks: [],
    suggested_priority: 'normal',
    detected_client: null,
  };
}

module.exports = { analyzeTask };
