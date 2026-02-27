// lib/gemini.js — Usa Groq (LLaMA 3.3-70b) como backend, mantendo a mesma interface

const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Personas dos agentes especialistas, para dar contexto à IA.
 */
const AGENT_PERSONAS = {
  analyst: 'Você é um analista de negócios experiente, especializado em entender requisitos de usuários e criar documentos de PRD (Product Requirements Document). Seja detalhado e estruturado.',
  dev: 'Você é um desenvolvedor full-stack sênior com expertise em múltiplas linguagens e frameworks. Forneça código limpo e explicações práticas.',
  architect: 'Você é um arquiteto de software especializado em design de sistemas escaláveis, padrões de arquitetura e melhores práticas.',
  pm: 'Você é um Product Manager focado em priorização, roadmap e estratégia de produto.',
  qa: 'Você é um especialista em Quality Assurance, testes automatizados e garantia de qualidade de software.',
  sm: 'Você é um Scrum Master experiente, focado em metodologias ágeis e facilitação de equipes.',
  devops: 'Você é um especialista em DevOps, focado em infraestrutura, CI/CD, e automação de processos de deploy.',
  data: 'Você é um engenheiro de dados especialista em pipelines, ETL, e arquitetura de dados.',
  ux: 'Você é um UX/UI designer focado em criar experiências de usuário intuitivas e agradáveis.',
  default: 'Você é Nico, um assistente de IA prestativo e versátil, integrado ao WhatsApp. Suas respostas devem ser claras, concisas e em português brasileiro.',
};

/**
 * Chama a API do Groq com um prompt (interface compatível com o antigo generateContent do Gemini).
 */
async function generateContent(prompt, options = {}) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY não está configurada.');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxOutputTokens ?? 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Classifica a intenção do usuário a partir de uma mensagem.
 * @returns {Promise<'create_task' | 'ask_status' | 'talk_to_agent' | 'general_question'>}
 */
async function getIntent(message) {
  const prompt = `
    Você é um classificador de intenções para um assistente de WhatsApp. Sua tarefa é analisar a mensagem do usuário e ser muito preciso.

    Classifique a mensagem em UMA das seguintes categorias:

    - 'create_task': A intenção é CLARAMENTE criar uma tarefa, um lembrete, ou um item "to-do". A mensagem deve conter um verbo de ação claro (criar, fazer, lembrar, agendar, etc.).
      Exemplos: "lembre-se de ligar para o cliente X", "criar uma tarefa para desenvolver a nova feature", "preciso fazer o deploy amanhã".

    - 'ask_status': O usuário está perguntando sobre o andamento ou status de um projeto, tarefa, ou cliente.
      Exemplos: "como está o projeto Y?", "qual o status da tarefa Z?", "novidades do cliente W?".

    - 'talk_to_agent': A mensagem é direcionada a um agente especialista, usando o formato "@<nome_do_agente>".
      Exemplos: "@architect qual o melhor banco de dados para isso?", "@dev me ajuda com esse código".

    - 'general_question': Use esta categoria para saudações, conversas gerais, perguntas que não se encaixam nas outras, ou mensagens de teste.
      Exemplos: "olá, tudo bem?", "oi", "teste", "bom dia", "quais as últimas notícias?".

    Mensagem do usuário: "${message}"

    Responda APENAS com o nome da categoria. Não adicione texto extra.
  `;

  const intent = await generateContent(prompt, { temperature: 0.1 });
  return intent.trim().replace(/'/g, '');
}

/**
 * Resposta geral do Nico para conversas não específicas.
 */
async function getGeneralResponse(message, history = []) {
  const persona = AGENT_PERSONAS.default;
  const prompt = `${persona}\n\nHistórico:\n${history.map(h => `${h.role}: ${h.parts[0].text}`).join('\n')}\n\nUsuário: ${message}\n\nNico:`;
  return await generateContent(prompt);
}

/**
 * Resposta de um agente especialista.
 */
async function getAgentResponse(agentName, message) {
  const persona = AGENT_PERSONAS[agentName.toLowerCase()] || AGENT_PERSONAS.default;
  const prompt = `${persona}\n\nUsuário: ${message}\n\nResposta:`;
  return await generateContent(prompt);
}

module.exports = {
  getIntent,
  getGeneralResponse,
  getAgentResponse,
  generateContent,
};
