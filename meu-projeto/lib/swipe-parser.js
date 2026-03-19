// meu-projeto/lib/swipe-parser.js
// Parser do INDEX.md do swipe file — extrai swipes estruturados

const fs = require('fs');
const path = require('path');

const FORMAT_META = {
  F1: { name: 'Frase com Destaque', color: '#f5f5f5', text: '#111', accent: '#e0e0e0' },
  F2: { name: 'Carrossel Dados',    color: '#0d47a1', text: '#fff', accent: '#4fc3f7' },
  F3: { name: 'Thread Preta',       color: '#1a1a1a', text: '#fff', accent: '#888' },
  F4: { name: 'Estático Tweet',     color: '#3949ab', text: '#fff', accent: '#9fa8da' },
  F5: { name: 'Reel com Narrativa', color: '#bf360c', text: '#fff', accent: '#ff8a65' },
  F6: { name: 'Premium Creative',   color: '#0A0A0A', text: '#fff', accent: '#00FF66' },
};

// Regex para linhas de tabela: | F1-001 | `arquivo` | @fonte | tema | tecnica |
const TABLE_ROW_REGEX = /^\|\s*(F[1-6]-\d{3})\s*\|\s*`?([^`|\n]+?)`?\s*\|\s*(\S+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/;
const FORMAT_HEADER_REGEX = /^##\s+(F[1-6])\s*[—-]/;
const DETAIL_HEADER_REGEX = /^###\s+Análise Detalhada\s*[—-]\s*(F[1-6]-\d{3})/;
const URL_REGEX = /^https?:\/\//;

// Campos de análise detalhada
const FIELD_PATTERNS = [
  // Campos novos (análise profunda v2)
  { key: 'persons',           pattern: /^\*\*Personagens\/Contexto:\*\*\s*(.+)?$/ },
  { key: 'hypeContext',       pattern: /^\*\*Fator Hype:\*\*\s*(.+)?$/ },
  { key: 'timingFactor',      pattern: /^\*\*Timing:\*\*\s*(.+)?$/ },
  { key: 'viralReason',       pattern: /^\*\*Por que viralizou \(razão real\):\*\*\s*(.+)?$/ },
  { key: 'insight',           pattern: /^\*\*Insight para @byericsantos:\*\*\s*(.+)?$/ },
  { key: 'adaptationStrategy',pattern: /^Tipo:\s*(.+)$/ },
  { key: 'adaptation',        pattern: /^\*\*Estratégia de adaptação:\*\*\s*(.+)?$/ },
  { key: 'link',              pattern: /^\*\*Link:\*\*\s*(https?:\/\/\S+)/ },
  { key: 'addedDate',         pattern: /^\*\*Adicionado:\*\*\s*(.+)/ },
  // Campos legados
  { key: 'whyViral',          pattern: /^\*\*Por que pode ter viralizado:\*\*\s*(.+)?$/ },
  { key: 'insight',           pattern: /^\*\*O que Eric gostou:\*\*\s*(.+)?$/ },
  { key: 'whyViral',          pattern: /^\*\*Por que funciona:\*\*\s*(.+)?$/ },
];

function parseIndexMd(indexPath) {
  if (!fs.existsSync(indexPath)) {
    throw new Error(`INDEX.md não encontrado: ${indexPath}`);
  }

  const content = fs.readFileSync(indexPath, 'utf8');
  const lines = content.split('\n');

  const swipes = [];
  const details = {};       // { 'F5-002': { whyViral, insight, adaptation, link, addedDate } }

  let currentFormat = null;
  let currentDetailId = null;
  let currentDetailText = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detectar seção de formato (## F1 —, ## F2 —, etc.)
    const fmtMatch = line.match(FORMAT_HEADER_REGEX);
    if (fmtMatch) {
      currentFormat = fmtMatch[1];
      currentDetailId = null;
      continue;
    }

    // Detectar início de análise detalhada
    const detailMatch = line.match(DETAIL_HEADER_REGEX);
    if (detailMatch) {
      currentDetailId = detailMatch[1];
      if (!details[currentDetailId]) details[currentDetailId] = {};
      currentDetailText = [];
      continue;
    }

    // Dentro de análise detalhada: extrair campos
    if (currentDetailId) {
      const det = details[currentDetailId];

      // Hooks sugeridos (multi-linha): "Hooks sugeridos:\n1. ...\n2. ..."
      if (/^Hooks sugeridos:/.test(line)) {
        const hooks = [];
        let j = i + 1;
        while (j < lines.length && /^\d+\.\s+/.test(lines[j].trim())) {
          hooks.push(lines[j].trim().replace(/^\d+\.\s+/, ''));
          j++;
        }
        if (hooks.length) det.hookSuggestions = hooks;
        i = j - 1;
        continue;
      }

      for (const { key, pattern } of FIELD_PATTERNS) {
        const m = line.match(pattern);
        if (m) {
          if (m[1] && m[1].trim()) {
            if (!det[key]) det[key] = m[1].trim();
          } else {
            // Valor na próxima linha não-vazia
            const nextLine = lines[i + 1]?.trim();
            if (nextLine && !nextLine.startsWith('**') && !nextLine.startsWith('#') && !nextLine.startsWith('Tipo:')) {
              if (!det[key]) det[key] = nextLine;
            }
          }
          break;
        }
      }
    }

    // Parsear linha de tabela de swipe
    if (currentFormat) {
      const rowMatch = line.match(TABLE_ROW_REGEX);
      if (rowMatch) {
        const [, id, arquivo, fonte, tema, tecnica] = rowMatch;
        const isExternalUrl = URL_REGEX.test(arquivo.trim());

        swipes.push({
          id,
          format: id.substring(0, 2),
          formatName: FORMAT_META[id.substring(0, 2)]?.name || id.substring(0, 2),
          arquivo: isExternalUrl ? null : arquivo.trim(),
          link: isExternalUrl ? arquivo.trim() : null,
          fonte: fonte.trim(),
          tema: tema.trim(),
          tecnica: tecnica.trim(),
        });
      }
    }
  }

  // Mesclar análises detalhadas nos swipes
  for (const swipe of swipes) {
    if (details[swipe.id]) {
      Object.assign(swipe, details[swipe.id]);
    }
  }

  // Calcular contagens por formato
  const counts = {};
  for (const s of swipes) {
    counts[s.format] = (counts[s.format] || 0) + 1;
  }

  return { swipes, formatMeta: FORMAT_META, counts };
}

module.exports = { parseIndexMd, FORMAT_META };
