// meu-projeto/lib/repertorio-analyzer.js
// Análise diária de mensagens reais de leads/clientes → atualiza repertório da Nova
//
// Fluxo:
//   1. Lê mensagens inbound recentes do WhatsApp DB
//   2. Claude Sonnet extrai: padrões de comportamento, frases exatas, objeções, sinais de compra
//   3. Adiciona seção timestamped no repertorio-nova.md

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const WA_DB_PATH = '/Users/ericsantos/docs/banco-dados-geral/whatsapp-conversations.db';
const GHL_DB_PATH = '/Users/ericsantos/docs/banco-dados-geral/ghl-conversations.db';
const REPERTORIO_PATH = path.resolve(__dirname, '../../docs/eric-brand/knowledge-base/repertorio-nova.md');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.replace(/"/g, '');
const CLAUDE_MODEL = 'claude-sonnet-4-6';

// Nomes a ignorar (equipe, testes, não são leads)
const IGNORE_NAMES = ['eric santos', 'logística ambiental', 'test', 'syra', 'cursos h&r'];

// ============================================================
// Buscar mensagens recentes
// ============================================================

function getRecentMessages(days = 7) {
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  const messages = [];

  // WhatsApp DB
  try {
    if (fs.existsSync(WA_DB_PATH)) {
      const wa = new Database(WA_DB_PATH, { readonly: true });
      const rows = wa.prepare(`
        SELECT chat_name, push_name, content, transcription, timestamp
        FROM conversas
        WHERE is_from_me = 0
          AND timestamp > ?
          AND (
            (content IS NOT NULL AND length(content) > 15)
            OR (transcription IS NOT NULL AND length(transcription) > 20)
          )
        ORDER BY timestamp DESC
        LIMIT 200
      `).all(cutoff);

      for (const row of rows) {
        const name = (row.push_name || row.chat_name || '').toLowerCase();
        if (IGNORE_NAMES.some(n => name.includes(n))) continue;

        const text = (row.content || row.transcription || '').trim();
        if (text.length < 15) continue;

        messages.push({
          source: 'whatsapp',
          contact: row.push_name || row.chat_name || 'desconhecido',
          text,
          date: new Date(row.timestamp * 1000).toLocaleDateString('pt-BR'),
        });
      }
      wa.close();
    }
  } catch (e) {
    console.log('[repertorio] WA DB:', e.message);
  }

  // GHL DB (mensagens inbound)
  try {
    if (fs.existsSync(GHL_DB_PATH)) {
      const ghl = new Database(GHL_DB_PATH, { readonly: true });
      const rows = ghl.prepare(`
        SELECT contact_name, body, direction, date_added
        FROM ghl_mensagens
        WHERE direction = 'inbound'
          AND body IS NOT NULL
          AND length(body) > 15
          AND date_added > ?
        ORDER BY date_added DESC
        LIMIT 100
      `).all(cutoff * 1000);

      for (const row of rows) {
        if (!row.body?.trim()) continue;
        messages.push({
          source: 'ghl',
          contact: row.contact_name || 'lead GHL',
          text: row.body.trim(),
          date: new Date(row.date_added).toLocaleDateString('pt-BR'),
        });
      }
      ghl.close();
    }
  } catch (e) {
    console.log('[repertorio] GHL DB:', e.message);
  }

  return messages;
}

// ============================================================
// Agrupar mensagens por contato (para ter contexto de conversa)
// ============================================================

function groupByContact(messages) {
  const byContact = {};
  for (const m of messages) {
    if (!byContact[m.contact]) byContact[m.contact] = [];
    byContact[m.contact].push(m.text);
  }
  return byContact;
}

// ============================================================
// Análise com Claude
// ============================================================

async function analyzeMessagesWithClaude(messages) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não configurado');
  if (!messages.length) return null;

  const grouped = groupByContact(messages);
  const contactCount = Object.keys(grouped).length;

  // Formata as mensagens para o prompt
  const msgBlock = Object.entries(grouped)
    .slice(0, 30) // max 30 contatos
    .map(([contact, texts]) => {
      const sample = texts.slice(0, 5).map(t => `  - "${t}"`).join('\n');
      return `**${contact}:**\n${sample}`;
    })
    .join('\n\n');

  const prompt = `Você é um analista de comportamento de mercado especializado no setor de saúde e estética brasileira.

Analise estas mensagens REAIS de leads e clientes recebidas via WhatsApp nos últimos dias.
São ${messages.length} mensagens de ${contactCount} contatos diferentes — todas inbound (eles enviaram).

=== MENSAGENS REAIS ===
${msgBlock}

=== OBJETIVO DA ANÁLISE ===
Esses dados alimentam o repertório de uma agente de social media (Nova) que cria conteúdo para @byericsantos.
@byericsantos vende assessoria de marketing para profissionais de saúde/estética (médicos, dentistas, esteticistas).

=== EXTRAIA EM FORMATO ESTRUTURADO ===

**1. PADRÕES DE COMPORTAMENTO (como esses leads/clientes se comportam na prática)**
Identifique comportamentos recorrentes: como entram em contato, como demonstram interesse, como hesitam, como somem, como voltam.

**2. FRASES EXATAS QUE O MERCADO USA**
Liste as frases/expressões mais reveladoras (com aspas). Priorize:
- Como descrevem seus problemas
- Como falam de dinheiro/preço
- Como expressam insegurança ou desconfiança
- Como demonstram interesse real

**3. OBJEÇÕES IMPLÍCITAS OU EXPLÍCITAS**
Que objeções aparecem (mesmo as não ditas diretamente)?

**4. SINAIS DE COMPRA / INTENÇÃO**
O que indica que esse lead está próximo de contratar?

**5. INSIGHTS PARA CONTEÚDO**
2-3 insights diretos: "Um post sobre X ressoaria porque Y diz Z".

Seja ESPECÍFICO e USE as frases reais sempre que possível.
Escreva em markdown formatado para ser adicionado diretamente a um arquivo de conhecimento.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
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
// Appender no repertório
// ============================================================

function appendToRepertorio(insights, messageCount) {
  if (!fs.existsSync(REPERTORIO_PATH)) {
    throw new Error(`repertorio-nova.md não encontrado: ${REPERTORIO_PATH}`);
  }

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const entry = [
    '',
    '---',
    '',
    `## 🗓️ Análise de Campo — ${today}`,
    `> ${messageCount} mensagens reais analisadas`,
    '',
    insights,
    '',
  ].join('\n');

  fs.appendFileSync(REPERTORIO_PATH, entry, 'utf8');
  return true;
}

// ============================================================
// Entry point principal
// ============================================================

async function runDailyAnalysis(days = 7) {
  console.log(`[repertorio] Buscando mensagens dos últimos ${days} dias...`);

  const messages = getRecentMessages(days);
  console.log(`[repertorio] ${messages.length} mensagens encontradas`);

  if (!messages.length) {
    console.log('[repertorio] Nenhuma mensagem nova. Encerrando.');
    return { ok: true, messagesAnalyzed: 0, message: 'Nenhuma mensagem nova' };
  }

  console.log('[repertorio] Analisando com Claude...');
  const insights = await analyzeMessagesWithClaude(messages);

  if (!insights) {
    return { ok: false, message: 'Claude não retornou análise' };
  }

  appendToRepertorio(insights, messages.length);
  console.log(`[repertorio] ✅ Repertório atualizado com ${messages.length} mensagens`);

  return {
    ok: true,
    messagesAnalyzed: messages.length,
    message: `✅ ${messages.length} mensagens analisadas e adicionadas ao repertório`,
  };
}

module.exports = { runDailyAnalysis, getRecentMessages };
