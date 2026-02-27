/**
 * Extração de conhecimento via LLM.
 * Roda em background — analisa mensagens do usuário e salva na KB.
 */

const kb = require('./knowledge-base');

const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');
const MODEL = 'llama-3.3-70b-versatile';

const EXTRACTION_PROMPT = `Você é um analisador de mensagens para uma agência de marketing digital.
Analise a mensagem do usuário e extraia informações relevantes sobre o cliente.

Retorne um JSON com:
{
  "hasKnowledge": true/false,
  "extractions": [
    {
      "type": "icp" | "audience" | "product" | "insight" | "note",
      "data": { ... campos relevantes ... }
    }
  ]
}

Tipos de extração:
- "icp": dados do cliente ideal (age, gender, location, interests, painPoints, decisionFactors)
- "audience": público-alvo (primaryTarget, secondaryTarget, exclusions)
- "product": produto/serviço (mainServices, priceRange, differentials, landingPages, instagram)
- "insight": aprendizado sobre campanhas ou mercado (text)
- "note": informação geral sobre o cliente (text)

Se a mensagem NÃO contém informação relevante para salvar, retorne:
{ "hasKnowledge": false, "extractions": [] }

Apenas extraia informações EXPLÍCITAS. Não invente dados.`;

/**
 * Analisa uma mensagem e extrai conhecimento em background.
 * @param {string} message - Mensagem do usuário
 * @param {string} clientId - ID do cliente associado
 * @param {string} clientName - Nome do cliente (para contexto)
 */
async function extractAndSave(message, clientId, clientName) {
  if (!message || message.length < 20 || message.startsWith('/')) return;
  if (!GROQ_API_KEY) return;

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
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: `Cliente: ${clientName}\nMensagem: ${message}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) return;

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return;

    const result = JSON.parse(text);
    if (result.hasKnowledge && result.extractions?.length > 0) {
      kb.applyExtractions(clientId, result.extractions);
      console.log(`KE: ${result.extractions.length} extração(ões) salvas para ${clientName}.`);
    }
  } catch (err) {
    console.error(`KE: erro na extração para ${clientName}:`, err.message);
  }
}

module.exports = { extractAndSave };
