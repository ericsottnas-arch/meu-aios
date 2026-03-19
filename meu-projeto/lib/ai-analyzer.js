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
  "priority_explicit": false,
  "suggested_due_date": null,
  "detected_client": null
}

Regras:
- O "title" deve ser curto, claro e em forma imperativa (ex: "Criar landing page para campanha X")
- A "description" deve organizar e expandir o que foi dito, mantendo todos os detalhes
- Se a mensagem mencionar foto, imagem, criativo, documento ou vídeo em anexo, inclua na descrição que há material anexo (ex: "Criativo/imagem em anexo", "Documento anexado para referência")
- Se a mensagem contiver URLs/links, mantenha-os na descrição
- "subtasks" só inclua se a tarefa for complexa e claramente dividível. Se for simples, retorne array vazio []
- "suggested_priority" pode ser: "urgent", "high", "normal" ou "low" — baseie-se no tom e urgência da mensagem
- "priority_explicit": true SOMENTE se o usuário disse explicitamente a prioridade (ex: "prioridade alta", "urgente", "coloca como baixa"). false se você está apenas inferindo pelo tom
- "suggested_due_date": Se o usuário mencionou uma data de entrega/prazo (ex: "dia 21", "até sexta", "para amanhã", "entrega dia 15/03"), retorne no formato "YYYY-MM-DD". Use o ano atual (${new Date().getFullYear()}) e o mês atual (${new Date().getMonth() + 1}) como referência para datas relativas. Se disse "dia 21" sem mês, use o mês corrente ou próximo mês se o dia já passou. Se não mencionou data, retorne null
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
      priority_explicit: parsed.priority_explicit === true,
      suggested_due_date: parsed.suggested_due_date || null,
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

/**
 * Detecta a intenção principal da mensagem: criar tarefa, onboarding, churn, etc.
 * Usa Groq LLaMA para classificação rápida.
 * @param {string} text - Texto ou transcrição de áudio
 * @param {string[]} [clientNames] - Lista de clientes ativos
 * @returns {Promise<{intent: string, clientName: string|null, phone: string|null, phones: string[]|null, instagram: string|null, details: string|null}>}
 */
async function detectIntent(text, clientNames = []) {
  if (!GROQ_API_KEY) {
    return { intent: 'task', clientName: null, phone: null, phones: null, instagram: null, details: null };
  }

  const clientList = clientNames.length > 0 ? clientNames.join(', ') : 'nenhum';

  const systemPrompt = `Você é o assistente de gestão da agência Syra Digital (Alex, PM Bot).
Analise a mensagem e classifique a INTENÇÃO PRINCIPAL do usuário.

Responda SEMPRE em JSON com esta estrutura:
{
  "intent": "task" | "question" | "action" | "contact" | "greeting" | "onboarding" | "churn" | "client_update" | "task_update",
  "clientName": "Nome do cliente mencionado ou null",
  "phone": "Telefone principal com DDD (apenas dígitos, ex: 5531999999999) ou null",
  "phones": ["telefones extras mencionados"] ou null,
  "instagram": "@perfil ou null",
  "details": "Informações adicionais extraídas ou null",
  "actionType": "schedule_check | task_list | task_status | client_info | calendar | contact_add | contact_update | contact_query | contact_list | contact_delete | task_update_status | task_update_name | task_update_assign | general | null",
  "taskSearch": "Trecho do nome da tarefa para buscar no ClickUp ou null",
  "newStatus": "Novo status desejado (na fila, andamento, aguardando cliente, revisão, aprovação cliente, tráfego, complete) ou null",
  "newName": "Novo nome da tarefa ou null"
}

REGRAS DE CLASSIFICAÇÃO (em ordem de prioridade):

"greeting" — APENAS saudações iniciais de conversa:
  - "bom dia", "oi", "tudo bem?", "fala Alex", "e aí", "olá"
  - NÃO classificar como greeting: "sim", "não", "pode ser", "isso", "exato", "ok" (essas são RESPOSTAS, não saudações)
  - NÃO classificar como greeting: qualquer mensagem que contenha informação útil (links, nomes, emails)

"question" — o usuário está PERGUNTANDO algo, quer INFORMAÇÃO:
  - "quais reuniões tenho hoje?", "quantas tarefas pendentes?", "qual o status do projeto?"
  - "me mostra minha agenda", "o que tem pra hoje?", "como está o Dr. Erico?"
  - "quais clientes ativos?", "quando é a próxima reunião?"
  - Perguntas sobre status, agenda, tarefas, clientes, prazos
  - actionType: identifique o tipo (schedule_check, task_list, task_status, client_info, etc.)

"task_update" — o usuário quer ALTERAR/ATUALIZAR uma tarefa EXISTENTE no ClickUp:
  - MUDAR STATUS: "marca a tarefa X como concluída", "coloca a tarefa Y em andamento", "muda o status da tarefa Z", "fecha a tarefa", "conclui a tarefa"
  - RENOMEAR: "renomeia a tarefa X para Y", "muda o nome da tarefa"
  - Palavras-chave: marca, muda, atualiza, altera, coloca, fecha, conclui, move, finaliza, completa (referindo-se a tarefas)
  - Status válidos: na fila, andamento, aguardando cliente, revisão, aprovação cliente, tráfego, complete
  - Extraia: taskSearch (trecho do nome da tarefa), newStatus (novo status), newName (novo nome se renomear)
  - IMPORTANTE: Se o usuário diz "concluída/finalizada/feita/pronta/done" → newStatus = "complete"
  - IMPORTANTE: Se o usuário diz "em andamento/em progresso" → newStatus = "andamento"
  - actionType: task_update_status ou task_update_name

"action" — o usuário quer que você FAÇA algo que NÃO é criar uma tarefa e NÃO é atualizar tarefa:
  - "lista minhas tarefas", "mostra as tarefas em andamento", "puxa a agenda da semana"
  - "manda um resumo", "verifica os prazos"
  - actionType: identifique o tipo da ação

"contact" — gerenciamento de CONTATOS/EMAILS de pessoas (clientes, prospects, equipe, qualquer pessoa):
  - ADICIONAR: "salva o email da Brenda: brenda@x.com", "anota o email joao@y.com do João", "o email do fulano é x@z.com"
  - ATUALIZAR: "atualiza o email do Humberto para novo@email.com", "muda o email da Vanessa"
  - CONSULTAR: "qual o email da Vanessa?", "me passa o email do Erico", "tem o contato do João?", "vc tem o instagram do Dr. Enio cadastrado?", "qual o instagram do Dr. Enio?"
  - LISTAR: "contatos", "lista contatos", "todos os contatos", "contatos do Dr. Erico"
  - REMOVER: "remove o contato da Fulana", "apaga o email do João"
  - actionType: contact_add, contact_update, contact_query, contact_list, contact_delete
  - Extraia: nome da pessoa, email, telefone, cliente associado se mencionado
  - Vale para QUALQUER pessoa: clientes, prospects, parceiros, equipe de clientes
  - IMPORTANTE: Perguntas sobre "tem cadastrado?", "qual o instagram de?", "qual o email de?" são SEMPRE contact_query

"client_update" — o usuário está INFORMANDO DADOS sobre um cliente ativo (NÃO é contato pessoal, é INFO DO NEGÓCIO):
  - Informações sobre: localização, região de atendimento, especialidade, tipo de serviço, clínica, endereço, horários, preços, diferenciais, público-alvo
  - Exemplos: "A Dra. Gabriele atende em Caieiras e na Grande São Paulo", "O Dr. Erico é especialista em direito médico", "A Vanessa atende na região do Buritis", "O consultório da Gabriele fica em Caieiras"
  - Transcrições de áudio que descrevem informações sobre o negócio/serviço do cliente
  - NÃO classificar como task (não é demanda de trabalho)
  - NÃO classificar como contact (não é email/telefone/instagram pessoal)
  - Extraia: clientName (OBRIGATÓRIO), details (TUDO que foi dito sobre o cliente — preservar informação completa)
  - Clientes ativos: ${clientList}

"onboarding" — quando o usuário quer INICIAR/CADASTRAR um novo cliente:
  - Palavras-chave: onboarding, onboardear, cadastrar novo cliente, entrou um cliente novo, faz o onboard
  - Extraia: nome do cliente, telefone, Instagram

"churn" — quando o usuário quer DESATIVAR/REMOVER um cliente:
  - Palavras-chave: churn, saiu, perdemos, cancelou, desativar, churnou
  - Clientes ativos: ${clientList}

"task" — SOMENTE quando o usuário quer CRIAR UMA NOVA TAREFA ou DEMANDA específica de trabalho:
  - "cria uma tarefa para fazer o site do Dr. Erico"
  - "preciso de um criativo para a Dra. Vanessa"
  - "faz um post sobre procedimento X para o cliente Y"
  - "briefing de campanha para Black Friday"
  - Deve conter uma DEMANDA DE TRABALHO clara e específica

IMPORTANTE:
- NÃO classifique como "task" se o usuário está apenas perguntando, consultando ou conversando
- "task" é SOMENTE para criação de demanda/trabalho novo
- Se houver dúvida entre "question" e "task", prefira "question"
- Para onboarding, extraia telefone se mencionado (normalize para dígitos com DDD 55)
- Para churn, faça match parcial no nome do cliente`;

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.warn(`⚠️  Groq detectIntent error ${response.status}`);
      return { intent: 'task', clientName: null, phone: null, phones: null, instagram: null, details: null };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { intent: 'task', clientName: null, phone: null, phones: null, instagram: null, details: null };

    const parsed = JSON.parse(content);
    const validIntents = ['task', 'question', 'action', 'contact', 'greeting', 'onboarding', 'churn', 'client_update'];
    return {
      intent: validIntents.includes(parsed.intent) ? parsed.intent : 'task',
      clientName: parsed.clientName || null,
      phone: parsed.phone || null,
      phones: Array.isArray(parsed.phones) ? parsed.phones : null,
      instagram: parsed.instagram || null,
      details: parsed.details || null,
      actionType: parsed.actionType || null,
    };
  } catch (err) {
    console.warn('⚠️  detectIntent failed:', err.message);
    return { intent: 'task', clientName: null, phone: null, phones: null, instagram: null, details: null };
  }
}

module.exports = { analyzeTask, detectIntent };
