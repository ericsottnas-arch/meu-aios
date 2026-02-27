/**
 * Análise inteligente de mensagens de grupo para Account Management.
 * Classifica mensagens, detecta urgência, identifica problemas críticos.
 * Usa Groq LLaMA para análise.
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');
const MODEL = 'llama-3.3-70b-versatile';

/**
 * @typedef {'request'|'complaint'|'feedback'|'info'|'urgent'|'greeting'|'followup'|'approval'|'question'|'other'} MessageCategory
 * @typedef {'critical'|'high'|'medium'|'low'|'none'} AlertLevel
 */

function buildSystemPrompt(clientName, recentContext) {
  let prompt = `Você é Nico, Account Manager e líder do time de gestão de tráfego, criação de conteúdo, copywriting e edição de vídeo da agência Syra Digital.

Você é um profissional experiente, resolutivo e consultivo. Gosta de entender o lado do cliente e se colocar no lugar dele antes de tomar decisões. Você é firme mas empático, sempre buscando a melhor solução.

SUA FUNÇÃO AQUI: Analisar CADA mensagem recebida no grupo e classificá-la em JSON.

REGRA CRÍTICA DE COMPORTAMENTO:
- Você SÓ se manifesta quando é chamado diretamente (@nico, @account) ou quando alguém fala com você de forma explícita
- Você NÃO se intromete em conversas entre o cliente e outras pessoas da equipe
- Quando alguém te chama, você é consultivo: investiga o problema, faz perguntas antes de agir

Responda SEMPRE em JSON válido com esta estrutura exata:
{
  "category": "request|complaint|feedback|info|urgent|greeting|followup|approval|question|other",
  "alert_level": "critical|high|medium|low|none",
  "summary": "Resumo breve da mensagem (máximo 100 caracteres)",
  "sentiment": "positive|neutral|negative|frustrated",
  "action_needed": true|false,
  "action_description": "Descrição da ação necessária (null se action_needed=false)",
  "is_directed_at_agent": false,
  "agent_command": null,
  "needs_escalation": false,
  "escalation_reason": null,
  "suggested_response": null,
  "key_topics": ["tópico1", "tópico2"]
}

REGRAS DE CLASSIFICAÇÃO:

category:
- "request" = pedido de algo (nova tarefa, material, alteração, criativo)
- "complaint" = reclamação, insatisfação, problema reportado
- "feedback" = opinião sobre algo entregue ou em andamento
- "info" = informação compartilhada sem ação necessária
- "urgent" = algo que precisa de ação imediata (prazo estourado, crise, problema grave)
- "greeting" = saudação, bom dia, etc
- "followup" = cobrança ou acompanhamento de algo pendente
- "approval" = aprovação ou reprovação de algo
- "question" = pergunta que precisa de resposta
- "other" = não se encaixa nas categorias acima

alert_level:
- "critical" = precisa de ação IMEDIATA (reclamação séria, prazo estourado, cliente irritado, crise)
- "high" = importante, precisa de atenção em breve (pedido urgente, follow-up repetido)
- "medium" = relevante, pode ser tratado no fluxo normal (novo request, feedback)
- "low" = informativo, sem urgência (saudações, informações gerais)
- "none" = pode ser ignorado (mensagens genéricas, emojis soltos)

sentiment:
- "positive" = satisfeito, elogiando, aprovando
- "neutral" = informativo, sem emoção clara
- "negative" = insatisfeito, criticando
- "frustrated" = claramente irritado, cobrando repetidamente, linguagem forte

action_needed: true se alguém da equipe precisa fazer algo em resposta

is_directed_at_agent: true APENAS se a mensagem contém menção direta ao agente (@nico, @account, @bot) ou se estão falando diretamente com ele

agent_command: Se is_directed_at_agent=true, extraia o comando/solicitação. Exemplos:
- "crie uma tarefa sobre X" → "create_task: X"
- "@nico tarefa fazer post pro instagram" → "create_task: fazer post pro instagram"
- "@nico nova tarefa - landing page" → "create_task: landing page"
- "resuma a conversa" → "summarize"
- "qual o status?" → "status"
- "@nico alertas" → "alerts"
- "@nico cancelar" → "cancelar"
- Se não for direcionada, retorne null

needs_escalation: true se a mensagem contém uma dúvida ou assunto que o Nico não consegue resolver sozinho (ex: questões técnicas específicas, decisões estratégicas, valores/preços, aprovações que fogem da alçada)

escalation_reason: Se needs_escalation=true, descreva brevemente o motivo (ex: "Cliente perguntou sobre desconto que foge da minha alçada")

suggested_response: Se is_directed_at_agent=true E você sabe responder com segurança, sugira uma resposta NATURAL e HUMANA (sem emojis excessivos, como se fosse um profissional escrevendo no WhatsApp). Se tiver dúvida, deixe null e marque needs_escalation=true.`;

  if (clientName) {
    prompt += `\n\nCONTEXTO DO GRUPO: Este é o grupo do cliente "${clientName}".`;
  }

  if (clientName) {
    prompt += `\n\nCONTEXTO DO GRUPO: Este é o grupo do cliente "${clientName}".`;
  }

  if (recentContext && recentContext.length > 0) {
    prompt += `\n\nMENSAGENS RECENTES DO GRUPO (para contexto):\n`;
    recentContext.forEach((msg) => {
      prompt += `- [${msg.sender}]: ${msg.text?.substring(0, 150) || '[mídia]'}\n`;
    });
  }

  return prompt;
}

/**
 * Analisa uma mensagem de grupo.
 * @param {string} text - Texto da mensagem ou transcrição de áudio
 * @param {Object} [options]
 * @param {string} [options.clientName] - Nome do cliente dono do grupo
 * @param {string} [options.senderName] - Nome de quem enviou
 * @param {string} [options.messageType] - 'text'|'audio_transcription'|'image_caption'|'link'
 * @param {Array<{sender: string, text: string}>} [options.recentContext] - Mensagens recentes para contexto
 * @returns {Promise<{category: MessageCategory, alert_level: AlertLevel, summary: string, sentiment: string, action_needed: boolean, action_description: string|null, is_directed_at_agent: boolean, agent_command: string|null, key_topics: string[]}>}
 */
async function analyzeGroupMessage(text, options = {}) {
  if (!GROQ_API_KEY) {
    return fallbackAnalysis(text);
  }

  // Detectar menção ao agente antes de qualquer shortcut
  const agentMentions = ['@nico', '@account', '@bot', '@agente'];
  const isDirectedAtAgent = agentMentions.some((m) => text.toLowerCase().includes(m));

  // Mensagens muito curtas (saudações, emojis) - análise rápida sem AI
  // Exceto se mencionam o agente
  if (text.length <= 5 && !isDirectedAtAgent) {
    return {
      category: 'greeting',
      alert_level: 'none',
      summary: text,
      sentiment: 'neutral',
      action_needed: false,
      action_description: null,
      is_directed_at_agent: false,
      agent_command: null,
      key_topics: [],
    };
  }

  // Se é uma menção pura ao agente sem comando, responder com help
  if (isDirectedAtAgent && text.trim().match(/^@(nico|account|bot|agente)$/i)) {
    return {
      category: 'greeting',
      alert_level: 'none',
      summary: 'Menção ao agente',
      sentiment: 'neutral',
      action_needed: false,
      action_description: null,
      is_directed_at_agent: true,
      agent_command: 'help',
      key_topics: [],
    };
  }

  try {
    const userMessage = options.senderName
      ? `[${options.senderName}] (${options.messageType || 'text'}): ${text}`
      : text;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt(options.clientName, options.recentContext) },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Groq API error ${response.status}: ${errText}`);
      return fallbackAnalysis(text);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return fallbackAnalysis(text);
    }

    const parsed = JSON.parse(content);
    return {
      category: parsed.category || 'other',
      alert_level: parsed.alert_level || 'none',
      summary: (parsed.summary || text.substring(0, 100)).substring(0, 100),
      sentiment: parsed.sentiment || 'neutral',
      action_needed: parsed.action_needed || false,
      action_description: parsed.action_description || null,
      is_directed_at_agent: parsed.is_directed_at_agent || false,
      agent_command: parsed.agent_command || null,
      needs_escalation: parsed.needs_escalation || false,
      escalation_reason: parsed.escalation_reason || null,
      suggested_response: parsed.suggested_response || null,
      key_topics: Array.isArray(parsed.key_topics) ? parsed.key_topics : [],
    };
  } catch (err) {
    console.warn('AI group analysis failed, using fallback:', err.message);
    return fallbackAnalysis(text);
  }
}

/**
 * Gera um resumo das mensagens recentes de um grupo.
 * @param {Array<{sender: string, text: string, type: string, timestamp: number}>} messages
 * @param {string} [clientName]
 * @returns {Promise<string>}
 */
async function generateGroupSummary(messages, clientName) {
  if (!GROQ_API_KEY || messages.length === 0) {
    return 'Nenhuma mensagem recente para resumir.';
  }

  const conversationText = messages
    .map((m) => `[${m.sender}] (${m.type}): ${m.text?.substring(0, 200) || '[mídia]'}`)
    .join('\n');

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
          {
            role: 'system',
            content: `Você é Nico, Account Manager AI. Gere um resumo executivo das conversas do grupo${clientName ? ` do cliente "${clientName}"` : ''}.

O resumo deve incluir:
1. Principais tópicos discutidos
2. Pedidos ou solicitações feitas
3. Problemas ou reclamações mencionados
4. Decisões tomadas
5. Itens pendentes que precisam de ação

Formato: Texto corrido em português, claro e conciso. Máximo 500 caracteres.`,
          },
          { role: 'user', content: conversationText },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) return 'Erro ao gerar resumo.';

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Resumo indisponível.';
  } catch (err) {
    console.warn('Summary generation failed:', err.message);
    return 'Erro ao gerar resumo.';
  }
}

function fallbackAnalysis(text) {
  const lower = text.toLowerCase();

  // Detecção básica de urgência por palavras-chave
  const urgentKeywords = ['urgente', 'urgência', 'imediato', 'agora', 'crise', 'problema grave', 'estourou'];
  const complaintKeywords = ['reclamação', 'insatisfeito', 'péssimo', 'horrível', 'não funciona', 'demora', 'atraso'];
  const requestKeywords = ['preciso', 'precisa', 'pode fazer', 'fazer', 'criar', 'enviar', 'mandar'];
  const greetingKeywords = ['bom dia', 'boa tarde', 'boa noite', 'olá', 'oi', 'hey'];

  let category = 'other';
  let alertLevel = 'none';
  let sentiment = 'neutral';

  if (urgentKeywords.some((k) => lower.includes(k))) {
    category = 'urgent';
    alertLevel = 'critical';
    sentiment = 'frustrated';
  } else if (complaintKeywords.some((k) => lower.includes(k))) {
    category = 'complaint';
    alertLevel = 'high';
    sentiment = 'negative';
  } else if (requestKeywords.some((k) => lower.includes(k))) {
    category = 'request';
    alertLevel = 'medium';
  } else if (greetingKeywords.some((k) => lower.includes(k))) {
    category = 'greeting';
    alertLevel = 'none';
    sentiment = 'positive';
  }

  // Detectar menção ao agente
  const agentMentions = ['@nico', '@account', '@bot', '@agente'];
  const isDirected = agentMentions.some((m) => lower.includes(m));

  // Detectar comandos de tarefa no fallback
  let agentCommand = null;
  if (isDirected) {
    const taskPatterns = [
      /(?:@\w+)\s+(?:criar?\s+)?tarefa[:\s]+(.+)/i,
      /(?:@\w+)\s+nova\s+tarefa[:\s]+(.+)/i,
      /(?:@\w+)\s+tarefa$/i,
      /(?:@\w+)\s+criar\s+tarefa$/i,
    ];
    for (const pattern of taskPatterns) {
      const match = lower.match(pattern);
      if (match) {
        agentCommand = match[1] ? `create_task: ${match[1].trim()}` : 'criar tarefa';
        break;
      }
    }
    if (!agentCommand) {
      if (lower.includes('resumo') || lower.includes('resumir')) agentCommand = 'summarize';
      else if (lower.includes('status')) agentCommand = 'status';
      else if (lower.includes('alerta')) agentCommand = 'alerts';
      else if (lower.includes('cancelar')) agentCommand = 'cancelar';
      else agentCommand = 'help';
    }
  }

  return {
    category,
    alert_level: alertLevel,
    summary: text.substring(0, 100),
    sentiment,
    action_needed: ['urgent', 'complaint', 'request'].includes(category),
    action_description: null,
    is_directed_at_agent: isDirected,
    agent_command: agentCommand,
    needs_escalation: false,
    escalation_reason: null,
    suggested_response: null,
    key_topics: [],
  };
}

module.exports = { analyzeGroupMessage, generateGroupSummary };
