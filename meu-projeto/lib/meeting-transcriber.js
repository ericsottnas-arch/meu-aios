/**
 * Meeting Transcriber — Motor do agente @scribe
 * Transcreve gravações de reuniões do Google Drive via Groq Whisper
 * Extrai inteligência (ICP, dores, objeções) via Claude/Groq
 * Atualiza documentação de clientes automaticamente
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// ============================================================
// Config
// ============================================================

const GROQ_API_KEY = process.env.GROQ_API_KEY?.replace(/"/g, '');
const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const WHISPER_MODEL = 'whisper-large-v3';
const ANALYSIS_MODEL = 'llama-3.3-70b-versatile';

const DRIVE_BASE = path.resolve(
  process.env.HOME,
  'Library/CloudStorage/GoogleDrive-ericsottnas@gmail.com/Meu Drive'
);
const MEET_RECORDINGS_PATH = path.join(DRIVE_BASE, 'Meet Recordings');
const DOCS_REUNIOES_PATH = path.resolve(__dirname, '../../docs/reunioes');
const DOCS_CLIENTES_PATH = path.resolve(__dirname, '../../docs/clientes');
const TEMP_DIR = path.join(os.tmpdir(), 'scribe-temp');
const INDEX_PATH = path.join(DOCS_REUNIOES_PATH, 'INDEX.md');

// Max file size for Groq Whisper (25MB)
const MAX_CHUNK_SIZE = 24 * 1024 * 1024; // 24MB para margem de segurança

// Clientes conhecidos para identificação automática
const KNOWN_CLIENTS = [
  { patterns: ['gabrielle', 'gabriele', 'dra gabrielle', 'dra gabriele'], name: 'Dra. Gabrielle Oliveira', folder: 'dra-gabriele-estética' },
  { patterns: ['vanessa', 'dra vanessa', 'soares'], name: 'Dra. Vanessa Soares', folder: 'dra-vanessa-soares' },
  { patterns: ['erico', 'érico', 'servano', 'dr erico', 'dr érico'], name: 'Dr. Erico Servano', folder: 'dr-erico-servano' },
  { patterns: ['bruna', 'nogueira', 'dra bruna'], name: 'Dra. Bruna Nogueira', folder: 'dra-bruna-nogueira' },
  { patterns: ['humberto', 'andrade', 'dr humberto'], name: 'Dr. Humberto Andrade', folder: 'dr-humberto-andrade' },
  { patterns: ['rachel', 'cuimar'], name: 'Rachel Cuimar (Interna)', folder: null },
  { patterns: ['rhaissa', 'cordeiro'], name: 'Dra. Rhaissa Cordeiro', folder: 'dra-rhaissa-cordeiro' },
  { patterns: ['romynick', 'dr romynick'], name: 'Dr. Romynick', folder: 'dr-romynick' },
  { patterns: ['torre 1', 'torre1', 'fourcred'], name: 'Torre 1 / Fourcred', folder: 'torre-1' },
  { patterns: ['thaís', 'thais', 'paula', 'dra thaís'], name: 'Dra. Thaís Paula', folder: 'dra-thais-paula' },
  { patterns: ['abqueila', 'antiqueira'], name: 'Abqueila Antiqueira', folder: 'abqueila-antiqueira' },
  { patterns: ['enio', 'ênio'], name: 'Dr. Enio (Cirurgião)', folder: 'dr-enio' },
  { patterns: ['cleugo', 'porto'], name: 'Cleugo Porto', folder: 'cleugo-porto' },
  { patterns: ['mônica', 'monica', 'andrade monica'], name: 'Dra. Mônica Andrade', folder: 'dra-monica-andrade' },
];

// ============================================================
// Utility Functions
// ============================================================

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function formatFileSize(bytes) {
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)}GB`;
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(0)}MB`;
  return `${(bytes / 1e3).toFixed(0)}KB`;
}

// ============================================================
// Drive Scanner
// ============================================================

/**
 * Escaneia Google Drive por gravações de reuniões
 * Arquivos estão diretamente na pasta Meet Recordings/ (não em subpastas)
 * @returns {Array<{name, path, size, date, hasTranscription}>}
 */
function scanDriveRecordings() {
  if (!fs.existsSync(MEET_RECORDINGS_PATH)) {
    console.error(`❌ Pasta Meet Recordings não encontrada: ${MEET_RECORDINGS_PATH}`);
    return [];
  }

  const entries = fs.readdirSync(MEET_RECORDINGS_PATH);
  const recordings = [];

  // Separar vídeos e chats
  const videoFiles = [];
  const chatFiles = [];

  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    const fullPath = path.join(MEET_RECORDINGS_PATH, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) continue; // Pular diretórios

    if (/transcrição|transcript|chat/i.test(entry)) {
      chatFiles.push(entry);
    } else if (stat.size > 500000) {
      // Arquivos > 500KB são provavelmente vídeos (Meet recordings não têm extensão clara)
      videoFiles.push({ name: entry, path: fullPath, size: stat.size });
    }
  }

  for (const video of videoFiles) {
    // Extrair data do nome (formato: xxx-xxx-xxx (YYYY-MM-DD HH:MM GMT-3))
    const dateMatch = video.name.match(/(\d{4}[-\s]\d{2}[-\s]\d{2})/);
    let date = dateMatch ? dateMatch[1].replace(/\s/g, '-') : null;

    // Para nomes com formato "Nome - YYYY MM DD" (ex: "Dra Gabrielle & Syra digital - 2025 11 24")
    if (!date) {
      const altMatch = video.name.match(/(\d{4})\s+(\d{2})\s+(\d{2})/);
      if (altMatch) date = `${altMatch[1]}-${altMatch[2]}-${altMatch[3]}`;
    }

    // Extrair ID base (parte antes do parêntese ou do " - Recording")
    const baseName = video.name
      .replace(/\s*\(.*$/, '')
      .replace(/\s*-\s*Recording.*$/i, '')
      .replace(/\s*-\s*Transcrição.*$/i, '')
      .trim();

    const slug = slugify(baseName);
    const hasTranscription = checkTranscriptionExists(date, slug);

    // Procurar chat transcript correspondente
    const chatFile = chatFiles.find(c => {
      const chatBase = c.replace(/\s*-\s*Transcrição.*$/i, '').trim();
      return video.name.startsWith(chatBase);
    });

    recordings.push({
      id: slug || video.name,
      name: baseName,
      fullName: video.name,
      folderPath: MEET_RECORDINGS_PATH,
      videoPath: video.path,
      videoFile: video.name,
      size: video.size,
      sizeFormatted: formatFileSize(video.size),
      date,
      chatTranscript: chatFile ? path.join(MEET_RECORDINGS_PATH, chatFile) : null,
      hasTranscription,
      clientGuess: identifyClientFromFilename(video.name),
    });
  }

  // Ordenar por data (mais recente primeiro)
  recordings.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return recordings;
}

/**
 * Verifica se uma transcrição já existe para essa gravação
 */
function checkTranscriptionExists(date, slug) {
  if (!fs.existsSync(DOCS_REUNIOES_PATH)) return false;

  const files = fs.readdirSync(DOCS_REUNIOES_PATH);
  return files.some(f => {
    if (date && f.includes(date)) return true;
    if (slug && f.includes(slug)) return true;
    return false;
  });
}

/**
 * Identifica cliente pelo nome do arquivo/pasta
 */
function identifyClientFromFilename(filename) {
  const lower = filename.toLowerCase();
  for (const client of KNOWN_CLIENTS) {
    if (client.patterns.some(p => lower.includes(p))) {
      return client;
    }
  }
  return null;
}

/**
 * Identifica cliente pelo conteúdo da transcrição
 */
function identifyClientFromTranscription(text) {
  const lower = text.toLowerCase().substring(0, 3000); // Primeiros 3000 chars
  for (const client of KNOWN_CLIENTS) {
    if (client.patterns.some(p => lower.includes(p))) {
      return client;
    }
  }
  return null;
}

// ============================================================
// Audio Extraction (ffmpeg)
// ============================================================

/**
 * Extrai áudio de um arquivo de vídeo usando ffmpeg
 * @param {string} videoPath - Caminho do vídeo
 * @returns {{audioPath: string, duration: number}} Caminho do áudio extraído e duração
 */
function extractAudio(videoPath) {
  ensureDir(TEMP_DIR);

  const audioPath = path.join(TEMP_DIR, `meeting-${Date.now()}.mp3`);

  // Extrair áudio: mono, 16kHz, 64kbps para manter tamanho pequeno
  try {
    execSync(
      `ffmpeg -i "${videoPath}" -vn -ac 1 -ar 16000 -b:a 64k -y "${audioPath}" 2>&1`,
      { timeout: 600000 } // 10 min timeout
    );
  } catch (error) {
    throw new Error(`ffmpeg falhou: ${error.message}`);
  }

  // Obter duração
  let duration = 0;
  try {
    const probeOutput = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioPath}"`,
      { encoding: 'utf-8', timeout: 10000 }
    ).trim();
    duration = parseFloat(probeOutput) || 0;
  } catch { /* ignore */ }

  const stat = fs.statSync(audioPath);
  console.log(`🎙️ Áudio extraído: ${formatFileSize(stat.size)} | ${formatDuration(duration)}`);

  return { audioPath, duration, size: stat.size };
}

// ============================================================
// Audio Chunking (para arquivos > 25MB)
// ============================================================

/**
 * Divide áudio em chunks menores para o Groq Whisper
 * @param {string} audioPath - Caminho do áudio
 * @param {number} duration - Duração em segundos
 * @returns {string[]} Array de caminhos dos chunks
 */
function chunkAudio(audioPath, duration) {
  const stat = fs.statSync(audioPath);

  if (stat.size <= MAX_CHUNK_SIZE) {
    return [audioPath]; // Não precisa chunkar
  }

  console.log(`📦 Arquivo ${formatFileSize(stat.size)} > 24MB — dividindo em chunks...`);

  // Calcular duração de cada chunk baseado no tamanho
  const bytesPerSecond = stat.size / duration;
  const secondsPerChunk = Math.floor(MAX_CHUNK_SIZE / bytesPerSecond);
  const overlap = 30; // 30 segundos de overlap para não perder contexto

  const chunks = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < duration) {
    const chunkPath = path.join(TEMP_DIR, `chunk-${Date.now()}-${chunkIndex}.mp3`);
    const chunkDuration = Math.min(secondsPerChunk, duration - start);

    try {
      execSync(
        `ffmpeg -i "${audioPath}" -ss ${start} -t ${chunkDuration + overlap} -ac 1 -ar 16000 -b:a 64k -y "${chunkPath}" 2>&1`,
        { timeout: 120000 }
      );
      chunks.push(chunkPath);
      console.log(`  📦 Chunk ${chunkIndex + 1}: ${start}s → ${start + chunkDuration}s`);
    } catch (error) {
      console.error(`  ❌ Erro no chunk ${chunkIndex}: ${error.message}`);
    }

    start += secondsPerChunk;
    chunkIndex++;
  }

  console.log(`📦 ${chunks.length} chunks criados`);
  return chunks;
}

// ============================================================
// Transcription (Groq Whisper)
// ============================================================

/**
 * Transcreve um arquivo de áudio via Groq Whisper
 * @param {string} audioPath - Caminho do arquivo
 * @returns {Promise<string>} Texto transcrito
 */
async function transcribeAudio(audioPath, retries = 3) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY não configurada');
  }

  const fileBuffer = fs.readFileSync(audioPath);
  const fileName = path.basename(audioPath);

  console.log(`🎙️ Transcrevendo ${formatFileSize(fileBuffer.length)}...`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);
    formData.append('model', WHISPER_MODEL);
    formData.append('language', 'pt');
    formData.append('response_format', 'verbose_json');

    const response = await fetch(GROQ_WHISPER_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      return result.text?.trim() || '';
    }

    const errText = await response.text();

    // Rate limit — extrair tempo de espera e aguardar
    if (response.status === 429) {
      let waitSecs = 420; // padrão: 7 minutos
      try {
        const errJson = JSON.parse(errText);
        const msg = errJson?.error?.message || '';
        const match = msg.match(/try again in (\d+)m([\d.]+)?s/);
        if (match) {
          waitSecs = parseInt(match[1]) * 60 + (parseFloat(match[2]) || 0) + 15; // +15s de margem
        }
      } catch (_) {}

      const waitMins = Math.ceil(waitSecs / 60);
      console.log(`  ⏳ Rate limit atingido. Aguardando ${waitMins} minutos antes de tentar novamente (tentativa ${attempt}/${retries})...`);
      await new Promise(r => setTimeout(r, waitSecs * 1000));
      continue;
    }

    // Outro erro — lançar imediatamente
    throw new Error(`Groq Whisper ${response.status}: ${errText}`);
  }

  throw new Error(`Groq Whisper: rate limit persistente após ${retries} tentativas`);
}

/**
 * Transcreve um vídeo completo (extrai áudio → chunka se necessário → transcreve)
 * @param {string} videoPath - Caminho do arquivo de vídeo
 * @returns {Promise<{text: string, duration: number}>}
 */
async function transcribeVideo(videoPath) {
  const filesToClean = [];

  try {
    // 1. Extrair áudio
    const { audioPath, duration, size } = extractAudio(videoPath);
    filesToClean.push(audioPath);

    // 2. Chunkar se necessário
    const chunks = chunkAudio(audioPath, duration);
    if (chunks[0] !== audioPath) {
      filesToClean.push(...chunks);
    }

    // 3. Transcrever cada chunk
    const transcriptions = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`🎙️ Transcrevendo chunk ${i + 1}/${chunks.length}...`);
      try {
        const text = await transcribeAudio(chunks[i]);
        transcriptions.push(text);
      } catch (error) {
        console.error(`  ❌ Erro no chunk ${i + 1}: ${error.message}`);
        transcriptions.push(`[ERRO NA TRANSCRIÇÃO DO TRECHO ${i + 1}]`);
      }

      // Rate limiting entre chunks
      if (i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // 4. Merge transcriptions (remover overlap duplicado)
    const fullText = mergeTranscriptions(transcriptions);

    return { text: fullText, duration };

  } finally {
    // Cleanup temp files
    for (const f of filesToClean) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
  }
}

/**
 * Merge transcrições de chunks, removendo overlap duplicado
 */
function mergeTranscriptions(texts) {
  if (texts.length <= 1) return texts[0] || '';

  let merged = texts[0];

  for (let i = 1; i < texts.length; i++) {
    const current = texts[i];
    if (!current) continue;

    // Tentar encontrar overlap (últimas 50 palavras do anterior vs primeiras 50 do atual)
    const prevWords = merged.split(/\s+/).slice(-50).join(' ');
    const currWords = current.split(/\s+/);

    // Procurar ponto de match
    let overlapFound = false;
    for (let matchLen = 10; matchLen >= 3; matchLen--) {
      const searchPhrase = currWords.slice(0, matchLen).join(' ');
      const idx = prevWords.lastIndexOf(searchPhrase);
      if (idx !== -1) {
        // Encontrou overlap — adicionar apenas a parte nova
        merged += ' ' + currWords.slice(matchLen).join(' ');
        overlapFound = true;
        break;
      }
    }

    if (!overlapFound) {
      merged += ' ' + current;
    }
  }

  return merged.replace(/\s+/g, ' ').trim();
}

// ============================================================
// Intelligence Extraction (Groq LLaMA)
// ============================================================

/**
 * Analisa transcrição e extrai inteligência
 * @param {string} transcription - Texto completo da transcrição
 * @param {string} clientName - Nome do cliente (se identificado)
 * @returns {Promise<Object>} Inteligência extraída
 */
async function analyzeTranscription(transcription, clientName = 'Desconhecido') {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY não configurada');
  }

  // Limitar transcrição para caber no contexto do LLaMA
  const maxChars = 28000;
  const truncated = transcription.length > maxChars
    ? transcription.substring(0, maxChars) + '\n\n[... TRANSCRIÇÃO TRUNCADA ...]'
    : transcription;

  const systemPrompt = `Você é um analista de inteligência de vendas da Syra Digital, agência de marketing médico/estético.
Sua função é analisar transcrições de reuniões e extrair insights acionáveis.

RESPONDA SEMPRE EM JSON VÁLIDO com esta estrutura:

{
  "resumo_executivo": ["bullet 1", "bullet 2", "bullet 3"],
  "participantes_identificados": ["nome1", "nome2"],
  "tipo_reuniao": "venda|onboarding|acompanhamento|interna|outro",
  "cliente_identificado": "nome ou null",
  "dores_identificadas": [
    {"dor": "descrição", "frase_literal": "quote exata do participante", "intensidade": "alta|media|baixa"}
  ],
  "objecoes_levantadas": [
    {"objecao": "descrição", "resposta_eric": "como Eric respondeu (quote)", "superada": true}
  ],
  "dados_icp": {
    "perfil": "descrição do perfil do prospect/cliente",
    "especialidade_medica": "se aplicável",
    "motivacao_principal": "o que o motiva",
    "budget_mencionado": "valor ou null",
    "experiencia_anterior_marketing": "descrição ou null",
    "nivel_urgencia": "alto|medio|baixo",
    "decisor": "quem decide"
  },
  "action_items": [
    {"acao": "descrição", "responsavel": "quem", "prazo": "se mencionado"}
  ],
  "decisoes_tomadas": ["decisão 1", "decisão 2"],
  "frases_impacto": {
    "do_cliente": ["frase literal 1", "frase literal 2"],
    "do_eric": ["frase de impacto 1", "frase 2"]
  },
  "temas_conteudo": ["tema sugerido para post/reel baseado na conversa"],
  "proximos_passos": ["próximo passo 1", "próximo passo 2"],
  "sentimento_geral": "positivo|neutro|negativo",
  "probabilidade_fechamento": "alta|media|baixa|ja_fechou|nao_aplicavel"
}

REGRAS:
- Extraia FRASES LITERAIS sempre que possível (entre aspas)
- Se não conseguir identificar algo, use null
- Dores devem refletir a LINGUAGEM REAL do participante
- Action items devem ser específicos e acionáveis
- Temas de conteúdo: sugira posts/reels que Eric poderia fazer baseado nas dores/objeções reais
- Se for reunião interna (sem cliente), foque em decisões e action items`;

  const response = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ANALYSIS_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analise esta transcrição de reunião com o cliente "${clientName}":\n\n${truncated}` },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq Analysis ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '{}';

  try {
    return JSON.parse(content);
  } catch {
    console.error('❌ Erro ao parsear JSON da análise');
    return { raw_response: content, parse_error: true };
  }
}

// ============================================================
// Document Generation
// ============================================================

/**
 * Gera documento de transcrição no formato padrão
 */
function generateTranscriptionDoc(recording, transcription, analysis, duration) {
  const date = recording.date || new Date().toISOString().split('T')[0];
  const clientName = analysis?.cliente_identificado || recording.clientGuess?.name || 'Não identificado';
  const participants = analysis?.participantes_identificados?.join(', ') || 'Eric Santos, ' + clientName;
  const meetingType = analysis?.tipo_reuniao || 'outro';

  let doc = `# Reunião: ${recording.name.split('(')[0].trim()}

- **Data:** ${date}
- **Duração:** ${formatDuration(duration)}
- **Participantes:** ${participants}
- **Cliente:** ${clientName}
- **Tipo:** ${meetingType}
- **Arquivo fonte:** \`Meet Recordings/${recording.name}/${recording.videoFile}\`
- **Tamanho:** ${recording.sizeFormatted}
- **Transcrito em:** ${new Date().toISOString().split('T')[0]}

---

## Resumo Executivo

${(analysis?.resumo_executivo || ['Resumo não disponível']).map(b => `- ${b}`).join('\n')}

---

## Inteligência Extraída

### Dores Identificadas
${(analysis?.dores_identificadas || []).map(d =>
  `- **${d.dor}** (${d.intensidade}) — "${d.frase_literal || 'sem quote'}"`
).join('\n') || '- Nenhuma dor identificada'}

### Objeções Levantadas
${(analysis?.objecoes_levantadas || []).map(o =>
  `- **${o.objecao}** ${o.superada ? '✅' : '❌'}\n  - Resposta Eric: "${o.resposta_eric || 'N/A'}"`
).join('\n') || '- Nenhuma objeção identificada'}

### Dados de ICP
${analysis?.dados_icp ? Object.entries(analysis.dados_icp)
  .filter(([_, v]) => v != null)
  .map(([k, v]) => `- **${k.replace(/_/g, ' ')}:** ${v}`)
  .join('\n') : '- Sem dados de ICP'}

### Action Items
${(analysis?.action_items || []).map(a =>
  `- [ ] ${a.acao} — **${a.responsavel || '?'}** ${a.prazo ? `(prazo: ${a.prazo})` : ''}`
).join('\n') || '- Sem action items'}

### Frases de Impacto (para copy)

**Do cliente:**
${(analysis?.frases_impacto?.do_cliente || []).map(f => `- "${f}"`).join('\n') || '- Nenhuma'}

**Do Eric:**
${(analysis?.frases_impacto?.do_eric || []).map(f => `- "${f}"`).join('\n') || '- Nenhuma'}

### Decisões Tomadas
${(analysis?.decisoes_tomadas || []).map(d => `- ${d}`).join('\n') || '- Nenhuma decisão registrada'}

### Próximos Passos
${(analysis?.proximos_passos || []).map(p => `- ${p}`).join('\n') || '- Sem próximos passos'}

### Temas para Conteúdo
${(analysis?.temas_conteudo || []).map(t => `- ${t}`).join('\n') || '- Sem sugestões'}

### Métricas
- **Sentimento geral:** ${analysis?.sentimento_geral || 'N/A'}
- **Probabilidade de fechamento:** ${analysis?.probabilidade_fechamento || 'N/A'}

---

## Transcrição Completa

${transcription}
`;

  return doc;
}

/**
 * Salva transcrição e atualiza INDEX
 */
function saveTranscription(recording, doc, analysis) {
  ensureDir(DOCS_REUNIOES_PATH);

  const date = recording.date || new Date().toISOString().split('T')[0];
  const clientSlug = analysis?.cliente_identificado
    ? slugify(analysis.cliente_identificado)
    : (recording.clientGuess ? slugify(recording.clientGuess.name) : 'desconhecido');

  const fileName = `${date}-${clientSlug}.md`;
  const filePath = path.join(DOCS_REUNIOES_PATH, fileName);

  fs.writeFileSync(filePath, doc, 'utf-8');
  console.log(`📝 Transcrição salva: ${filePath}`);

  // Atualizar INDEX
  updateIndex(recording, analysis, fileName, date);

  // Atualizar docs do cliente se identificado
  const clientFolder = recording.clientGuess?.folder || findClientFolder(analysis?.cliente_identificado);
  if (clientFolder) {
    updateClientDocs(clientFolder, analysis, date);
  }

  return filePath;
}

/**
 * Atualiza INDEX.md com nova entrada
 */
function updateIndex(recording, analysis, fileName, date) {
  ensureDir(DOCS_REUNIOES_PATH);

  let indexContent = '';
  if (fs.existsSync(INDEX_PATH)) {
    indexContent = fs.readFileSync(INDEX_PATH, 'utf-8');
  } else {
    indexContent = `# Índice de Transcrições de Reuniões

> Gerado e mantido automaticamente pelo @scribe
> Total de reuniões transcritas: 0

---

## Reuniões por Data

| Data | Cliente | Tipo | Duração | Arquivo |
|------|---------|------|---------|---------|
`;
  }

  const clientName = analysis?.cliente_identificado || recording.clientGuess?.name || '?';
  const meetingType = analysis?.tipo_reuniao || '?';
  const newRow = `| ${date} | ${clientName} | ${meetingType} | ${recording.sizeFormatted} | [${fileName}](./${fileName}) |`;

  // Adicionar nova linha na tabela (antes do último ---)
  if (indexContent.includes('|------|')) {
    const lines = indexContent.split('\n');
    const tableHeaderIdx = lines.findIndex(l => l.includes('|------|'));
    lines.splice(tableHeaderIdx + 1, 0, newRow);

    // Atualizar contador
    const countMatch = indexContent.match(/Total de reuniões transcritas: (\d+)/);
    const currentCount = countMatch ? parseInt(countMatch[1]) : 0;
    indexContent = lines.join('\n').replace(
      /Total de reuniões transcritas: \d+/,
      `Total de reuniões transcritas: ${currentCount + 1}`
    );
  } else {
    indexContent += '\n' + newRow;
  }

  fs.writeFileSync(INDEX_PATH, indexContent, 'utf-8');
  console.log(`📋 INDEX.md atualizado`);
}

/**
 * Encontra a pasta do cliente no docs/clientes/
 */
function findClientFolder(clientName) {
  if (!clientName) return null;

  const client = KNOWN_CLIENTS.find(c =>
    c.patterns.some(p => clientName.toLowerCase().includes(p))
  );

  return client?.folder || null;
}

/**
 * Atualiza documentação do cliente com insights da reunião
 */
function updateClientDocs(clientFolder, analysis, date) {
  if (!analysis || !clientFolder) return;

  const kbPath = path.join(DOCS_CLIENTES_PATH, clientFolder, 'knowledge-base');
  ensureDir(kbPath);

  const meetingFile = path.join(kbPath, `reuniao-${date}.md`);

  // Gerar arquivo resumido de inteligência para o knowledge-base do cliente
  let kbDoc = `# Inteligência de Reunião — ${date}

> Extraído automaticamente pelo @scribe

## Dores Identificadas
${(analysis?.dores_identificadas || []).map(d =>
  `- **${d.dor}** — "${d.frase_literal || ''}"`
).join('\n') || '- Nenhuma'}

## Objeções
${(analysis?.objecoes_levantadas || []).map(o =>
  `- ${o.objecao} → ${o.superada ? 'Superada' : 'Não superada'}`
).join('\n') || '- Nenhuma'}

## Dados ICP
${analysis?.dados_icp ? Object.entries(analysis.dados_icp)
  .filter(([_, v]) => v != null)
  .map(([k, v]) => `- **${k}:** ${v}`)
  .join('\n') : '- Sem dados'}

## Frases Literais (para copy)
${[
  ...(analysis?.frases_impacto?.do_cliente || []).map(f => `- Cliente: "${f}"`),
  ...(analysis?.frases_impacto?.do_eric || []).map(f => `- Eric: "${f}"`),
].join('\n') || '- Nenhuma'}

## Action Items
${(analysis?.action_items || []).map(a =>
  `- [ ] ${a.acao} (${a.responsavel || '?'})`
).join('\n') || '- Nenhum'}
`;

  fs.writeFileSync(meetingFile, kbDoc, 'utf-8');
  console.log(`📂 Knowledge base do cliente atualizado: ${meetingFile}`);
}

// ============================================================
// Batch Processing
// ============================================================

/**
 * Processa uma gravação completa: extrai → transcreve → analisa → salva
 * @param {Object} recording - Objeto da gravação (do scanDriveRecordings)
 * @returns {Promise<{success, filePath, analysis}>}
 */
async function processRecording(recording) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎬 Processando: ${recording.name}`);
  console.log(`   Tamanho: ${recording.sizeFormatted} | Data: ${recording.date || '?'}`);
  console.log(`   Cliente (palpite): ${recording.clientGuess?.name || 'Desconhecido'}`);
  console.log(`${'='.repeat(60)}`);

  try {
    // 1. Transcrever vídeo
    const { text, duration } = await transcribeVideo(recording.videoPath);

    if (!text || text.length < 50) {
      console.log('⚠️ Transcrição muito curta ou vazia — pulando');
      return { success: false, error: 'Transcrição vazia' };
    }

    console.log(`✅ Transcrito: ${text.length} caracteres | ${formatDuration(duration)}`);

    // 2. Identificar cliente (se não identificado pelo nome do arquivo)
    if (!recording.clientGuess) {
      recording.clientGuess = identifyClientFromTranscription(text);
      if (recording.clientGuess) {
        console.log(`🔍 Cliente identificado pela transcrição: ${recording.clientGuess.name}`);
      }
    }

    // 3. Analisar transcrição
    console.log('🧠 Analisando transcrição...');
    const analysis = await analyzeTranscription(
      text,
      recording.clientGuess?.name || 'Desconhecido'
    );

    // 4. Gerar documento
    const doc = generateTranscriptionDoc(recording, text, analysis, duration);

    // 5. Salvar
    const filePath = saveTranscription(recording, doc, analysis);

    console.log(`✅ Concluído: ${path.basename(filePath)}`);
    return { success: true, filePath, analysis };

  } catch (error) {
    console.error(`❌ Erro ao processar ${recording.name}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Processa todas as gravações pendentes (batch)
 * @param {number} limit - Máximo de gravações para processar (0 = todas)
 */
async function processAllPending(limit = 0) {
  const recordings = scanDriveRecordings();
  const pending = recordings.filter(r => !r.hasTranscription);

  if (pending.length === 0) {
    console.log('✅ Todas as gravações já foram transcritas!');
    return { processed: 0, total: recordings.length };
  }

  const toProcess = limit > 0 ? pending.slice(0, limit) : pending;

  console.log(`\n📋 ${pending.length} gravações pendentes (processando ${toProcess.length})`);
  console.log(`📊 Total no Drive: ${recordings.length} gravações\n`);

  const results = [];
  for (let i = 0; i < toProcess.length; i++) {
    console.log(`\n[${i + 1}/${toProcess.length}]`);
    const result = await processRecording(toProcess[i]);
    results.push(result);

    // Pausa entre gravações para respeitar rate limit do Groq (7200s áudio/hora)
    // Média de ~50min por gravação = ~3000s. Aguardar 8min garante margem segura.
    if (i < toProcess.length - 1) {
      const pauseSecs = 480; // 8 minutos
      console.log(`⏳ Aguardando ${pauseSecs / 60} minutos antes do próximo (rate limit Groq)...`);
      await new Promise(r => setTimeout(r, pauseSecs * 1000));
    }
  }

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 RESULTADO FINAL`);
  console.log(`   ✅ Transcritas: ${succeeded}`);
  console.log(`   ❌ Falharam: ${failed}`);
  console.log(`   📋 Pendentes restantes: ${pending.length - toProcess.length}`);
  console.log(`${'='.repeat(60)}`);

  return { processed: succeeded, failed, remaining: pending.length - toProcess.length, results };
}

/**
 * Retorna estatísticas gerais
 */
function getStats() {
  const recordings = scanDriveRecordings();
  const transcribed = recordings.filter(r => r.hasTranscription);
  const pending = recordings.filter(r => !r.hasTranscription);

  const totalSize = recordings.reduce((sum, r) => sum + r.size, 0);
  const clientCounts = {};
  for (const r of recordings) {
    const client = r.clientGuess?.name || 'Não identificado';
    clientCounts[client] = (clientCounts[client] || 0) + 1;
  }

  return {
    total: recordings.length,
    transcribed: transcribed.length,
    pending: pending.length,
    totalSize: formatFileSize(totalSize),
    byClient: clientCounts,
    recordings: recordings.map(r => ({
      id: r.id,
      name: r.name,
      date: r.date,
      size: r.sizeFormatted,
      client: r.clientGuess?.name || '?',
      transcribed: r.hasTranscription,
    })),
  };
}

// ============================================================
// Cleanup
// ============================================================

function cleanupTemp() {
  if (fs.existsSync(TEMP_DIR)) {
    const files = fs.readdirSync(TEMP_DIR);
    for (const f of files) {
      try { fs.unlinkSync(path.join(TEMP_DIR, f)); } catch { /* ignore */ }
    }
    console.log(`🧹 ${files.length} arquivos temporários removidos`);
  }
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  // Scanner
  scanDriveRecordings,
  identifyClientFromFilename,
  identifyClientFromTranscription,

  // Transcription
  extractAudio,
  chunkAudio,
  transcribeAudio,
  transcribeVideo,

  // Analysis
  analyzeTranscription,

  // Documents
  generateTranscriptionDoc,
  saveTranscription,
  updateIndex,
  updateClientDocs,

  // Batch
  processRecording,
  processAllPending,

  // Utils
  getStats,
  cleanupTemp,

  // Constants
  MEET_RECORDINGS_PATH,
  DOCS_REUNIOES_PATH,
  DOCS_CLIENTES_PATH,
  KNOWN_CLIENTS,
};
