// meu-projeto/lib/account-analyzer.js
// Sistema de análise de mensagens: urgência, palavras-chave, classificação

const URGENCY_KEYWORDS = {
  critical: [
    'urgente', 'urgent', 'emergência', 'emergency', 'problema', 'problem',
    'erro', 'error', 'falha', 'failure', 'não funciona', 'not working',
    'quebrou', 'broke', 'perdeu', 'lost', 'desastre', 'disaster',
    '⚠️', '🚨', 'SOS', 'HELP'
  ],
  high: [
    'rápido', 'quick', 'ASAP', 'hoje', 'today', 'agora', 'now',
    'reunião', 'meeting', 'call', 'chamada', 'importante', 'important',
    'preciso', 'need', 'deve', 'must', 'deadline',
    '❗', '⏰'
  ],
  medium: [
    'quando', 'when', 'próximo', 'next', 'semana', 'week', 'mês', 'month',
    'dúvida', 'question', 'como', 'how', 'por que', 'why',
    'sugestão', 'suggestion', 'ideia', 'idea'
  ]
};

const NEGATIVE_INDICATORS = [
  'reclamação', 'complaint', 'insatisfeito', 'unsatisfied',
  'decepcionado', 'disappointed', 'frustrado', 'frustrated',
  'não gostei', 'did not like', 'péssimo', 'terrible',
  'horrível', 'horrible', 'pior', 'worst',
  '😠', '😡', '😤', '🤦', '😤'
];

const POSITIVE_INDICATORS = [
  'obrigado', 'thanks', 'ótimo', 'great', 'adorei', 'loved',
  'perfeito', 'perfect', 'incrível', 'amazing', 'excelente', 'excellent',
  '😊', '😍', '🙌', '👏', '✨', '🎉'
];

// Calcula pontuação de urgência (0-100)
function calculateUrgencyScore(text) {
  if (!text) return 0;

  const lowerText = text.toLowerCase();
  let score = 0;

  // Palavras críticas
  for (const keyword of URGENCY_KEYWORDS.critical) {
    if (lowerText.includes(keyword)) {
      score += 35;
    }
  }

  // Palavras de alta prioridade
  for (const keyword of URGENCY_KEYWORDS.high) {
    if (lowerText.includes(keyword)) {
      score += 20;
    }
  }

  // Palavras de média prioridade
  for (const keyword of URGENCY_KEYWORDS.medium) {
    if (lowerText.includes(keyword)) {
      score += 10;
    }
  }

  // Indicadores negativos
  for (const indicator of NEGATIVE_INDICATORS) {
    if (lowerText.includes(indicator)) {
      score += 25;
    }
  }

  // Indicadores positivos (diminuem urgência)
  for (const indicator of POSITIVE_INDICATORS) {
    if (lowerText.includes(indicator)) {
      score -= 10;
    }
  }

  // CAPS amplificam
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.3) {
    score += 15;
  }

  // Múltiplos pontos de exclamação
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 2) {
    score += exclamationCount * 5;
  }

  return Math.min(100, Math.max(0, score));
}

// Classifica mensagem por tipo
function classifyMessage(text, messageType) {
  if (!text) return 'unknown';

  const lowerText = text.toLowerCase();

  if (messageType && messageType !== 'text' && messageType !== 'link') {
    return messageType;
  }

  if (lowerText.includes('http') || lowerText.includes('www')) {
    return 'link';
  }

  if (lowerText.includes('?')) {
    return 'question';
  }

  const hasNegative = NEGATIVE_INDICATORS.some(i => lowerText.includes(i));
  if (hasNegative) {
    return 'complaint';
  }

  const hasPositive = POSITIVE_INDICATORS.some(i => lowerText.includes(i));
  if (hasPositive) {
    return 'positive_feedback';
  }

  return 'text';
}

// Extrai palavras-chave da mensagem
function extractKeywords(text, limit = 5) {
  if (!text) return [];

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !isCommonWord(w));

  const freq = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function isCommonWord(word) {
  const common = [
    'the', 'that', 'this', 'and', 'or', 'not', 'was', 'are',
    'have', 'with', 'from', 'about', 'by', 'to', 'in', 'on',
    'at', 'for', 'of', 'is', 'be', 'it', 'do', 'go', 'up', 'as',
    'você', 'está', 'para', 'com', 'uma', 'um', 'que', 'de',
    'do', 'da', 'em', 'não', 'ou', 'se', 'os', 'as'
  ];
  return common.includes(word);
}

// Análise completa da mensagem
function analyzeMessage(text, messageType = 'text') {
  const urgency = calculateUrgencyScore(text);
  const classification = classifyMessage(text, messageType);
  const keywords = extractKeywords(text);

  let urgencyLevel = 'low';
  if (urgency >= 70) urgencyLevel = 'critical';
  else if (urgency >= 50) urgencyLevel = 'high';
  else if (urgency >= 30) urgencyLevel = 'medium';

  const hasNegativeContent = NEGATIVE_INDICATORS.some(i =>
    text.toLowerCase().includes(i)
  );

  return {
    urgencyScore: urgency,
    urgencyLevel,
    classification,
    keywords,
    hasNegativeContent,
    length: text.length
  };
}

// Estatísticas agregadas
function generateStats(messages) {
  if (!messages || messages.length === 0) {
    return {
      totalMessages: 0,
      avgUrgencyScore: 0,
      criticalCount: 0,
      complaintCount: 0
    };
  }

  const analyses = messages.map(m => analyzeMessage(m.content, m.message_type));

  const criticalCount = analyses.filter(a => a.urgencyLevel === 'critical').length;
  const complaintCount = analyses.filter(a => a.hasNegativeContent).length;
  const avgUrgency = analyses.reduce((sum, a) => sum + a.urgencyScore, 0) / analyses.length;

  return {
    totalMessages: messages.length,
    avgUrgencyScore: Math.round(avgUrgency),
    criticalCount,
    complaintCount
  };
}

module.exports = {
  calculateUrgencyScore,
  classifyMessage,
  extractKeywords,
  analyzeMessage,
  generateStats
};
