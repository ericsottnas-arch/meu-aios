// meu-projeto/swipe-collector.js
// Swipe Collector Bot — coleta links via Telegram e analisa para o swipe file
//
// Porta: 3007
// Env: SWIPE_BOT_TOKEN, IRIS_APPROVAL_CHAT_ID, SWIPE_FILE_PATH

const path = require('path');
const fs = require('fs');

// Load env
if (process.env.NODE_ENV !== 'production') {
  const localEnv = path.resolve(__dirname, '.env');
  const parentEnv = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(parentEnv)) require('dotenv').config({ path: parentEnv });
  if (fs.existsSync(localEnv)) require('dotenv').config({ path: localEnv, override: true });
}

const express = require('express');
const { analyzeSwipe, appendToIndex, deleteFromIndex } = require('./lib/swipe-analyzer');
const { parseIndexMd, FORMAT_META } = require('./lib/swipe-parser');
const { loadPositioningDocs, buildPositioningContext, generateContent, qualityGate, saveToRoteiros, interpretMessage, SPECIALIST_SYSTEMS, ROTEIROS_DRIVE_PATH } = require('./lib/swipe-replicator');
const { generateCarousel, cleanOldCarouselTemp, generateFrase, generateEstatico, regenerateSlide, parseF3Content: parseF3 } = require('./lib/carousel-generator');

const { runDailyAnalysis } = require('./lib/repertorio-analyzer');
const { saveAnalysisToNova, saveLearningInput } = require('./lib/nova-learner');
const { transcribeFile } = require('./lib/iris-transcriber');

const INDEX_PATH = path.resolve(__dirname, '../docs/eric-brand/swipe-file/INDEX.md');

const SWIPE_BOT_TOKEN = process.env.SWIPE_BOT_TOKEN?.replace(/"/g, '');
const CHAT_ID = String(process.env.IRIS_APPROVAL_CHAT_ID || '5020990459');
const PORT = process.env.SWIPE_PORT || 3007;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.replace(/"/g, '');

if (!SWIPE_BOT_TOKEN) {
  console.error('❌ SWIPE_BOT_TOKEN não configurado');
  process.exit(1);
}

// ============================================================
// Telegram client (próprio — usa SWIPE_BOT_TOKEN)
// ============================================================

async function callBot(method, body) {
  const url = `https://api.telegram.org/bot${SWIPE_BOT_TOKEN}/${method}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) console.error(`[swipe] Telegram ${method} error:`, data.description);
    return data;
  } catch (err) {
    console.error(`[swipe] Telegram ${method} falhou:`, err.message);
    return { ok: false };
  }
}

function botSend(chatId, text, replyMarkup) {
  const body = { chat_id: chatId, text };
  if (replyMarkup) body.reply_markup = replyMarkup;
  return callBot('sendMessage', body);
}

function botEdit(chatId, messageId, text, replyMarkup) {
  const body = { chat_id: chatId, message_id: messageId, text };
  if (replyMarkup) body.reply_markup = replyMarkup;
  return callBot('editMessageText', body);
}

function botAnswer(callbackQueryId, text) {
  return callBot('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text || undefined,
  });
}

// ============================================================
// Pending state — persiste no disco para sobreviver a restarts
// ============================================================

const PENDING_STATE_FILE = path.resolve(__dirname, '../.aios/swipe-pending-state.json');

function loadPendingState() {
  try {
    if (fs.existsSync(PENDING_STATE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PENDING_STATE_FILE, 'utf8'));
      pendingCounter = raw.counter || 0;
      for (const [k, v] of Object.entries(raw.replicas || {})) pendingReplicas.set(Number(k), v);
    }
  } catch (e) {
    console.error('[swipe] loadPendingState error:', e.message);
  }
}

function savePendingState() {
  try {
    const dir = path.dirname(PENDING_STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const replicas = {};
    for (const [k, v] of pendingReplicas) replicas[k] = v;
    fs.writeFileSync(PENDING_STATE_FILE, JSON.stringify({ counter: pendingCounter, replicas }, null, 2));
  } catch (e) {
    console.error('[swipe] savePendingState error:', e.message);
  }
}

let pendingCounter = 0;
const pendingAnalyses = new Map();    // id → { url, analysis, content } (session only — reenviar link se expirar)
const pendingReplicas = new Map();     // id → { url, analysis, generated, swipeId, attempts } (persistido)
const waitingFeedback = new Map();     // chatId → { pendingId, msgId }

loadPendingState();

const URL_REGEX = /https?:\/\/[^\s<>"]+/gi;

const SUPPORTED_DOMAINS = [
  'instagram.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'youtube.com',
  'youtu.be',
  'linkedin.com',
];

function isSupportedUrl(url) {
  try {
    const { hostname } = new URL(url);
    return SUPPORTED_DOMAINS.some(d => hostname.includes(d));
  } catch {
    return false;
  }
}

const FORMAT_NAMES = {
  F1: 'Frase com Destaque',
  F2: 'Carrossel Dados',
  F3: 'Thread Preta',
  F4: 'Estático Tweet',
  F5: 'Reel com Narrativa',
};

// ============================================================
// Core logic
// ============================================================

async function processUrl(url, chatId) {
  const sentMsg = await botSend(chatId, `🔍 Analisando...\n${url}`);
  const editMsgId = sentMsg.ok ? sentMsg.result?.message_id : null;

  let result;
  try {
    result = await analyzeSwipe(url);
  } catch (err) {
    console.error('[swipe] analyzeSwipe error:', err.message);
    const errText = `❌ Erro ao analisar:\n${err.message.substring(0, 300)}`;
    if (editMsgId) {
      await botEdit(chatId, editMsgId, errText);
    } else {
      await botSend(chatId, errText);
    }
    return;
  }

  const { analysis } = result;
  const id = ++pendingCounter;
  pendingAnalyses.set(id, { url, analysis, content: result.content });

  const formatDisplay = `${analysis.format} — ${FORMAT_NAMES[analysis.format] || analysis.format}`;

  const previewLines = [
    '🔍 Swipe analisado',
    '',
    `📍 Fonte: ${analysis.username || 'desconhecida'}`,
    `🎯 Formato: ${formatDisplay}`,
    analysis.contentCategory ? `🏷️ Tipo: ${analysis.contentCategory}` : null,
  ];

  if (analysis.persons) {
    previewLines.push('', `👥 Personagens: ${analysis.persons}`);
  }

  if (analysis.hypeContext) {
    previewLines.push('', `🔥 Fator Hype:`, analysis.hypeContext);
  }

  if (analysis.timingFactor) {
    previewLines.push('', `⏱️ Por que AGORA:`, analysis.timingFactor);
  }

  previewLines.push(
    '',
    '💡 Razão real de viralizar:',
    analysis.viralReason || analysis.whyViral || '—'
  );

  if (analysis.hookSuggestions?.length) {
    previewLines.push('', '🎣 Hooks para @byericsantos:');
    analysis.hookSuggestions.forEach((h, i) => previewLines.push(`${i + 1}. ${h}`));
  } else if (analysis.adaptation) {
    previewLines.push('', '🔗 Adaptação:', analysis.adaptation);
  }

  const preview = previewLines.filter(l => l !== null).join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🔄 Salvar + Replicar', callback_data: `swipe:replicate:${id}` },
        { text: '💾 Só salvar', callback_data: `swipe:save:${id}` },
      ],
      [
        { text: '🎯 Mudar estratégia', callback_data: `swipe:strategy-menu:${id}` },
        { text: '❌ Descartar', callback_data: `swipe:discard:${id}` },
      ],
    ],
  };

  if (editMsgId) {
    await botEdit(chatId, editMsgId, preview, keyboard);
  } else {
    await botSend(chatId, preview, keyboard);
  }
}

async function handleCallback(callbackQuery) {
  const { id: cbId, message, data } = callbackQuery;
  const chatId = message?.chat?.id;
  const msgId = message?.message_id;

  const parts = data?.split(':');

  // Content Radar callbacks — encaminhar para o radar server
  if (parts?.[0] === 'radar') {
    await botAnswer(cbId, '🔍 Processando...');
    try {
      const axios = require('axios');
      await axios.post(`http://localhost:${process.env.CONTENT_RADAR_PORT || 3008}/api/radar/callback`, {
        callback_data: data,
        item_id: parseInt(parts[2], 10) || null,
        callback_query_id: cbId,
      }, { timeout: 10000 });
    } catch (err) {
      console.error('[swipe] Radar callback forward error:', err.message);
      await botSend(chatId, `⚠️ Erro ao processar ação do Radar: ${err.message}`);
    }
    return;
  }

  if (!parts || parts[0] !== 'swipe') {
    await botAnswer(cbId, 'Ação desconhecida');
    return;
  }

  const action = parts[1];
  const pendingId = parseInt(parts[2], 10);

  // ─── SAVE (só salvar) ───────────────────────────────────────
  if (action === 'save') {
    const pending = pendingAnalyses.get(pendingId);
    if (!pending) { await botAnswer(cbId, 'Análise expirada — envie o link novamente'); return; }

    let savedId;
    try {
      savedId = appendToIndex(pending.analysis, pending.url);
    } catch (err) {
      await botAnswer(cbId, `Erro ao salvar: ${err.message.substring(0, 80)}`);
      console.error('[swipe] appendToIndex error:', err.message);
      return;
    }

    pendingAnalyses.delete(pendingId);

    // Salva análise como lição para a Nova
    try { saveAnalysisToNova(pending.analysis, pending.url, savedId); } catch {}

    await botAnswer(cbId, `✅ Salvo como ${savedId}`);
    await botEdit(
      chatId,
      msgId,
      `✅ Salvo como **${savedId}** no swipe file\n\n📍 ${pending.analysis.username || '—'}\n🎯 ${formatDisplay(pending.analysis.format)} — ${pending.analysis.theme}`
    );

  // ─── DISCARD ────────────────────────────────────────────────
  } else if (action === 'discard') {
    const pending = pendingAnalyses.get(pendingId);
    if (!pending) { await botAnswer(cbId, 'Análise expirada'); return; }
    pendingAnalyses.delete(pendingId);
    await botAnswer(cbId, '❌ Descartado');
    await botEdit(chatId, msgId, `❌ Descartado\n${pending.url}`);

  // ─── REPLICATE (salvar + escolher formato) ─────────────────────
  } else if (action === 'replicate') {
    const pending = pendingAnalyses.get(pendingId);
    if (!pending) { await botAnswer(cbId, 'Análise expirada — envie o link novamente'); return; }

    await botAnswer(cbId, '🔄 Salvando...');

    // 1. Salva no INDEX.md primeiro
    let savedId;
    try {
      savedId = appendToIndex(pending.analysis, pending.url);
    } catch (err) {
      console.error('[swipe] appendToIndex error:', err.message);
      await botSend(chatId, `⚠️ Erro ao salvar no swipe file: ${err.message.substring(0, 100)}`);
    }

    // Salva análise como lição para a Nova
    try { saveAnalysisToNova(pending.analysis, pending.url, savedId); } catch {}

    // 2. Move para pendingReplicas com step format-pending (AP2)
    const replicaId = ++pendingCounter;
    pendingReplicas.set(replicaId, {
      url: pending.url,
      analysis: pending.analysis,
      swipeId: savedId,
      step: 'format-pending',
      attempts: 0,
    });
    savePendingState();

    pendingAnalyses.delete(pendingId);

    // 3. Mostra keyboard de formatos para Eric escolher
    const originalFormat = pending.analysis.format || 'F3';
    await botEdit(chatId, msgId,
      `✅ Swipe salvo como ${savedId || '—'}\n\n🎯 Escolha o formato para gerar o roteiro:`
    );

    const formatKeyboard = {
      inline_keyboard: [
        [
          { text: `F1 Frase`, callback_data: `swipe:format-select:${replicaId}:F1` },
          { text: `F2 Dados`, callback_data: `swipe:format-select:${replicaId}:F2` },
          { text: `F3 Thread`, callback_data: `swipe:format-select:${replicaId}:F3` },
        ],
        [
          { text: `F4 Tweet`, callback_data: `swipe:format-select:${replicaId}:F4` },
          { text: `F5 Reel`, callback_data: `swipe:format-select:${replicaId}:F5` },
        ],
        [
          { text: `📌 ${originalFormat} (original)`, callback_data: `swipe:format-select:${replicaId}:${originalFormat}` },
        ],
      ],
    };

    await botSend(chatId, `Formato sugerido pela análise: ${formatDisplay(originalFormat)}`, formatKeyboard);

  // ─── FORMAT-SELECT (gerar roteiro no formato escolhido) ──────
  } else if (action === 'format-select') {
    const selectedFormat = parts[3]; // F1-F5
    const replica = pendingReplicas.get(pendingId);
    if (!replica || replica.step !== 'format-pending') {
      await botAnswer(cbId, 'Estado inválido — refaça o processo');
      return;
    }

    await botAnswer(cbId, `🎯 Gerando em ${selectedFormat}...`);
    replica.selectedFormat = selectedFormat;
    replica.step = 'generating';
    savePendingState();

    await botEdit(chatId, msgId,
      `🎯 Nova gerando roteiro ${formatDisplay(selectedFormat)}...`
    );

    try {
      const docs = loadPositioningDocs();
      const posContext = buildPositioningContext(docs);
      const result = await generateContent(replica.analysis, posContext, selectedFormat);

      replica.generated = result.content;
      replica.specialistId = result.specialistId;
      replica.specialistName = result.specialistName;
      replica.selectionReason = result.selectionReason;
      replica.slidesData = result.slidesData || null;
      replica.step = 'preview';
      replica.attempts = 1;
      savePendingState();

      const qgLine = result.qualityGate
        ? `\n📊 Quality Gate: ${result.qualityGate.score}/10 — ${result.qualityGate.verdict}`
        : '';
      const preview = buildReplicaPreview(result.content, replica.analysis, replica.swipeId, result.specialistName, result.selectionReason) + qgLine;
      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Aprovar e salvar no Drive', callback_data: `swipe:approved:${pendingId}` },
            { text: '🔄 Revisar', callback_data: `swipe:revise:${pendingId}` },
            { text: '❌ Cancelar', callback_data: `swipe:drop:${pendingId}` },
          ],
        ],
      };

      await botSend(chatId, preview, keyboard);

    } catch (err) {
      console.error('[swipe] generateContent error:', err.message);
      replica.step = 'format-pending'; // volta para escolher formato
      savePendingState();
      await botSend(chatId,
        `❌ Erro ao gerar roteiro: ${err.message.substring(0, 200)}\n\n` +
        (replica.swipeId ? `✅ Swipe salvo como ${replica.swipeId}` : '')
      );
    }

  // ─── APPROVED (salvar roteiro no Drive) ────────────────────
  } else if (action === 'approved') {
    const replica = pendingReplicas.get(pendingId);
    if (!replica) { await botAnswer(cbId, 'Roteiro expirado — refaça o processo'); return; }

    await botAnswer(cbId, '💾 Salvando roteiro...');

    try {
      const { fileName } = await saveToRoteiros(replica.generated, replica.analysis, replica.swipeId, replica.specialistName);

      const activeFormat = replica.selectedFormat || replica.analysis?.format || 'F3';
      const hasDesign = ['F1', 'F3', 'F4'].includes(activeFormat);

      if (hasDesign) {
        // F1/F3/F4: salva docx → pergunta sobre design visual
        replica.step = 'design-pending';
        replica.docxFileName = fileName;
        savePendingState();

        const formatLabel = { F1: 'frase visual', F3: 'thread em slides', F4: 'card de tweet' }[activeFormat] || 'design';
        await botEdit(chatId, msgId,
          `✅ Roteiro ${activeFormat} salvo!\n\n📂 ${fileName}\n🗂️ Pasta: Drive/Syra Digital/Copywriting/`
        );

        const keyboard = {
          inline_keyboard: [[
            { text: `🎨 Gerar ${formatLabel}`, callback_data: `swipe:gen-design:${pendingId}` },
            { text: '⏭️ Só o roteiro', callback_data: `swipe:skip-design:${pendingId}` },
          ]],
        };
        await botSend(chatId, `🎨 Quer gerar o design visual agora?`, keyboard);

      } else {
        // F2/F5: encerra aqui
        pendingReplicas.delete(pendingId);
        waitingFeedback.delete(String(chatId));
        savePendingState();

        await botEdit(chatId, msgId,
          `✅ Roteiro aprovado!\n\n🎯 Escrito por: Nova\n📂 Salvo: ${fileName}\n🗂️ Pasta: Drive/Syra Digital/Copywriting/`
        );
      }

    } catch (err) {
      console.error('[swipe] saveToRoteiros error:', err.message);
      await botAnswer(cbId, `Erro ao salvar: ${err.message.substring(0, 80)}`);
    }

  // ─── GEN-DESIGN (gerar design visual F1/F3/F4) ─────────────────
  } else if (action === 'gen-design') {
    const replica = pendingReplicas.get(pendingId);
    if (!replica || replica.step !== 'design-pending') {
      await botAnswer(cbId, 'Estado inválido — roteiro não encontrado');
      return;
    }

    const activeFormat = replica.selectedFormat || replica.analysis?.format || 'F3';
    await botAnswer(cbId, `🎨 Gerando ${activeFormat}...`);
    await botEdit(chatId, msgId, `🎨 Gerando design visual ${activeFormat}...`);

    try {
      let pngPaths;
      const swipeIdOpt = replica.swipeId || `design-${pendingId}`;

      if (activeFormat === 'F1') {
        // F1: Frase com Destaque
        const { parseF1Content } = require('./lib/carousel-generator');
        const fraseData = parseF1Content(replica.generated);
        pngPaths = await generateFrase(fraseData, { swipeId: swipeIdOpt });

      } else if (activeFormat === 'F4') {
        // F4: Estático Tweet
        const { parseF4Content } = require('./lib/carousel-generator');
        const tweetData = parseF4Content(replica.generated);
        pngPaths = await generateEstatico(tweetData, { swipeId: swipeIdOpt });

      } else {
        // F3: Thread Preta (carrossel)
        let slidesData = replica.slidesData;
        if (!slidesData) {
          try { slidesData = parseF3(replica.generated); } catch {}
        }
        if (!slidesData) {
          await botSend(chatId, '❌ Não foi possível parsear os slides. Envie o link novamente.');
          return;
        }
        replica.slidesData = slidesData;
        pngPaths = await generateCarousel(slidesData, { swipeId: swipeIdOpt });
      }

      await sendCarouselAlbum(chatId, pngPaths, replica.analysis);

      // Para F3: oferece revisão visual (AP4r)
      if (activeFormat === 'F3' && pngPaths.length > 1) {
        replica.step = 'visual-review';
        replica.pngPaths = pngPaths;
        savePendingState();

        const keyboard = {
          inline_keyboard: [
            [
              { text: '✅ Aprovar design', callback_data: `swipe:approve-design:${pendingId}` },
              { text: '🔄 Ajustar slide', callback_data: `swipe:revise-slide:${pendingId}` },
            ],
            [
              { text: '🔁 Refazer tudo', callback_data: `swipe:gen-design:${pendingId}` },
            ],
          ],
        };
        // Reseta step para design-pending pro "Refazer tudo" funcionar
        await botSend(chatId, `🖼️ ${pngPaths.length} slides gerados. O que fazer?`, keyboard);
      } else {
        // F1/F4 ou carrossel de 1 slide: salva no Drive e encerra
        const driveDir = await saveCarouselToDrive(pngPaths, replica.analysis, replica.swipeId);
        pendingReplicas.delete(pendingId);
        waitingFeedback.delete(String(chatId));
        savePendingState();

        await botSend(chatId,
          `✅ Design gerado!\n\n🖼️ ${pngPaths.length} imagem(ns) enviada(s)\n📂 Criativos/${path.basename(driveDir)}/`
        );
      }

      setImmediate(() => cleanOldCarouselTemp());

    } catch (err) {
      console.error('[swipe] gen-design error:', err.message);
      await botAnswer(cbId, `Erro: ${err.message.substring(0, 80)}`);
      await botSend(chatId, `❌ Erro ao gerar design: ${err.message.substring(0, 200)}`);
    }

  // ─── APPROVE-DESIGN (salvar design no Drive) ─────────────────
  } else if (action === 'approve-design') {
    const replica = pendingReplicas.get(pendingId);
    if (!replica) { await botAnswer(cbId, 'Expirado'); return; }

    await botAnswer(cbId, '💾 Salvando...');
    try {
      const pngPaths = replica.pngPaths || [];
      const driveDir = await saveCarouselToDrive(pngPaths, replica.analysis, replica.swipeId);

      pendingReplicas.delete(pendingId);
      waitingFeedback.delete(String(chatId));
      savePendingState();

      await botEdit(chatId, msgId,
        `✅ Design aprovado!\n\n🖼️ ${pngPaths.length} slides salvos\n📂 Criativos/${path.basename(driveDir)}/`
      );
    } catch (err) {
      await botSend(chatId, `❌ Erro: ${err.message.substring(0, 200)}`);
    }

  // ─── REVISE-SLIDE (AP4r — pedir qual slide ajustar) ───────────
  } else if (action === 'revise-slide') {
    const replica = pendingReplicas.get(pendingId);
    if (!replica) { await botAnswer(cbId, 'Expirado'); return; }

    await botAnswer(cbId, '✍️ Me diga qual slide e o que mudar');
    await botSend(chatId,
      `🔄 Qual slide ajustar?\n\n` +
      `_Formato: "slide 2: mude a imagem para agenda médica" ou "slide 3: texto mais curto"_`
    );

    waitingFeedback.set(String(chatId), { pendingId, msgId, feedbackType: 'slide-revision' });

  // ─── SKIP-DESIGN (só o roteiro, sem design) ─────────────────
  } else if (action === 'skip-design') {
    pendingReplicas.delete(pendingId);
    waitingFeedback.delete(String(chatId));
    savePendingState();
    await botAnswer(cbId, '✅ Roteiro salvo');
    await botEdit(chatId, msgId, `✅ Pronto! Só o roteiro salvo no Drive.`);

  // ─── DROP (descartar roteiro) ────────────────────────────────
  } else if (action === 'drop') {
    pendingReplicas.delete(pendingId);
    waitingFeedback.delete(String(chatId));
    savePendingState();
    await botAnswer(cbId, '🗑️ Roteiro descartado');
    await botEdit(chatId, msgId, `🗑️ Roteiro descartado.`);

  // ─── REVISE (pedir feedback) ─────────────────────────────────
  } else if (action === 'revise') {
    const replica = pendingReplicas.get(pendingId);
    if (!replica) { await botAnswer(cbId, 'Roteiro expirado'); return; }

    await botAnswer(cbId, '✍️ Me diga o que ajustar');
    await botEdit(chatId, msgId,
      `🔄 O que devo ajustar no roteiro?\n\n` +
      `_Escreva sua instrução no chat (ex: "torne mais direto", "mude o hook", "foco em objeção de preço")_`
    );

    // Registra que estamos esperando feedback de texto
    waitingFeedback.set(String(chatId), { pendingId, msgId });

  // ─── STRATEGY-MENU (mostrar opções de estratégia) ──────────────
  } else if (action === 'strategy-menu') {
    const pending = pendingAnalyses.get(pendingId);
    if (!pending) { await botAnswer(cbId, 'Análise expirada'); return; }

    await botAnswer(cbId, '🎯 Escolha a estratégia');

    const stratKeyboard = {
      inline_keyboard: [
        [
          { text: '🔄 Adaptar Mercado', callback_data: `swipe:strategy-select:${pendingId}:replicate-mechanism` },
          { text: '📌 Manter Narrativa', callback_data: `swipe:strategy-select:${pendingId}:keep-narrative` },
        ],
        [
          { text: '🔍 Pesquisar+Incrementar', callback_data: `swipe:strategy-select:${pendingId}:find-analogy` },
          { text: '💬 Gerar Opinião', callback_data: `swipe:strategy-select:${pendingId}:generate-opinion` },
        ],
        [
          { text: '🌉 Bridge Post', callback_data: `swipe:strategy-select:${pendingId}:bridge-post` },
          { text: '📣 Comment on Trend', callback_data: `swipe:strategy-select:${pendingId}:comment-on-trend` },
        ],
      ],
    };

    await botEdit(chatId, msgId,
      `🎯 Estratégia atual: ${pending.analysis.adaptationStrategy || 'automática'}\n\nEscolha uma nova estratégia:`,
      stratKeyboard
    );

  // ─── STRATEGY-SELECT (aplicar estratégia escolhida) ────────────
  } else if (action === 'strategy-select') {
    const strategy = parts[3];
    const pending = pendingAnalyses.get(pendingId);
    if (!pending) { await botAnswer(cbId, 'Análise expirada'); return; }

    pending.analysis.adaptationStrategy = strategy;
    await botAnswer(cbId, `✅ Estratégia: ${strategy}`);

    // Volta para o preview normal com os botões originais
    const previewLines = [
      '🔍 Swipe analisado',
      '',
      `📍 Fonte: ${pending.analysis.username || 'desconhecida'}`,
      `🎯 Formato: ${formatDisplay(pending.analysis.format)}`,
      `🛠️ Estratégia: ${strategy}`,
      pending.analysis.contentCategory ? `🏷️ Tipo: ${pending.analysis.contentCategory}` : null,
    ].filter(l => l !== null).join('\n');

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔄 Salvar + Replicar', callback_data: `swipe:replicate:${pendingId}` },
          { text: '💾 Só salvar', callback_data: `swipe:save:${pendingId}` },
        ],
        [
          { text: '🎯 Mudar estratégia', callback_data: `swipe:strategy-menu:${pendingId}` },
          { text: '❌ Descartar', callback_data: `swipe:discard:${pendingId}` },
        ],
      ],
    };

    await botEdit(chatId, msgId, previewLines, keyboard);
  }
}

// ============================================================
// Carregar slidesData no pendingReplicas ao gerar F3
// ============================================================

// (slidesData é salvo junto com pendingReplicas via savePendingState)

// ============================================================
// Envio de álbum de PNGs no Telegram
// ============================================================

async function sendCarouselAlbum(chatId, pngPaths, analysis) {
  // Telegram sendMediaGroup aceita até 10 itens por envio
  const chunks = [];
  for (let i = 0; i < pngPaths.length; i += 10) {
    chunks.push(pngPaths.slice(i, i + 10));
  }

  for (const [chunkIdx, chunk] of chunks.entries()) {
    // Usa FormData nativo do Node.js 18+ com Blob
    const formData = new FormData();
    const media = [];

    for (let i = 0; i < chunk.length; i++) {
      const fieldName = `photo${chunkIdx * 10 + i}`;
      const buf = fs.readFileSync(chunk[i]);
      const blob = new Blob([buf], { type: 'image/png' });
      formData.append(fieldName, blob, path.basename(chunk[i]));

      const item = { type: 'photo', media: `attach://${fieldName}` };
      if (i === 0 && chunkIdx === 0) {
        item.caption = `🎯 Carrossel F3 — ${analysis.theme || 'Thread Preta'}`;
      }
      media.push(item);
    }

    formData.append('chat_id', String(chatId));
    formData.append('media', JSON.stringify(media));

    const url = `https://api.telegram.org/bot${SWIPE_BOT_TOKEN}/sendMediaGroup`;
    try {
      const res = await fetch(url, { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.ok) {
        console.error('[swipe] sendMediaGroup error:', data.description);
        // Fallback: envia fotos individualmente
        for (const pngPath of chunk) await sendSinglePhoto(chatId, pngPath);
      }
    } catch (err) {
      console.error('[swipe] sendCarouselAlbum chunk error:', err.message);
      for (const pngPath of chunk) await sendSinglePhoto(chatId, pngPath);
    }
  }
}

async function sendSinglePhoto(chatId, pngPath) {
  try {
    const formData = new FormData();
    const buf = fs.readFileSync(pngPath);
    const blob = new Blob([buf], { type: 'image/png' });
    formData.append('chat_id', String(chatId));
    formData.append('photo', blob, path.basename(pngPath));
    const url = `https://api.telegram.org/bot${SWIPE_BOT_TOKEN}/sendPhoto`;
    await fetch(url, { method: 'POST', body: formData });
  } catch (err) {
    console.error('[swipe] sendSinglePhoto error:', err.message);
  }
}

// ============================================================
// Salvar carrossel PNGs no Drive
// ============================================================

const CARROSSEIS_DRIVE_PATH = process.env.CARROSSEIS_DRIVE_PATH ||
  ROTEIROS_DRIVE_PATH.replace(/\/Copywriting$/, '/Criativos');

async function saveCarouselToDrive(pngPaths, analysis, swipeId) {
  const date = new Date().toISOString().split('T')[0];
  const safeTheme = (analysis.theme || 'thread')
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 40);

  const folderName = `${date}_F3-${swipeId || '000'}_${safeTheme}`;
  const destDir = path.join(CARROSSEIS_DRIVE_PATH, folderName);

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  for (const pngPath of pngPaths) {
    const dest = path.join(destDir, path.basename(pngPath));
    fs.copyFileSync(pngPath, dest);
  }

  console.log(`[swipe] Carrossel salvo em: ${destDir}`);
  return destDir;
}

// ============================================================
// Gerar prévia do roteiro para Telegram
// ============================================================

function buildReplicaPreview(content, analysis, swipeId, specialistName, selectionReason) {
  // Trunca se muito longo (Telegram limite 4096 chars)
  const maxBody = 2600;
  const body = content.length > maxBody
    ? content.substring(0, maxBody) + '\n\n_[...continua no arquivo]_'
    : content;

  return [
    `✍️ Roteiro — ${analysis.format}`,
    `📍 Baseado em: ${analysis.username || 'referência'} | ${analysis.theme}`,
    swipeId ? `🗂️ Swipe ID: ${swipeId}` : '',
    `🎯 Nova`,
    '',
    '',
    '─────────────────',
    body,
    '─────────────────',
  ].filter(Boolean).join('\n');
}

function formatDisplay(format) {
  return `${format} — ${FORMAT_NAMES[format] || format}`;
}

// ============================================================
// Telegram polling
// ============================================================

let pollingOffset = 0;
let pollingActive = false;

async function getUpdates() {
  const data = await callBot('getUpdates', {
    offset: pollingOffset,
    timeout: 30,
    allowed_updates: ['message', 'callback_query'],
  });

  if (data.ok && data.result?.length > 0) {
    pollingOffset = data.result[data.result.length - 1].update_id + 1;
  }

  return data.ok ? data.result || [] : [];
}

// ============================================================
// Transcrição de áudio do Telegram
// ============================================================

async function getTelegramFileUrl(fileId) {
  const data = await callBot('getFile', { file_id: fileId });
  if (!data.ok || !data.result?.file_path) {
    throw new Error('Telegram getFile falhou: ' + (data.description || 'sem file_path'));
  }
  return `https://api.telegram.org/file/bot${SWIPE_BOT_TOKEN}/${data.result.file_path}`;
}

async function transcribeVoiceMessage(voiceData) {
  const os = require('os');
  const fs = require('fs');
  const fileUrl = await getTelegramFileUrl(voiceData.file_id);

  // Baixa o arquivo de áudio
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`Download falhou: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  // Telegram voz vem como .oga (OGG/OPUS) — salva como .ogg para o Whisper
  const tmpPath = require('path').join(os.tmpdir(), `swipe-voice-${Date.now()}.ogg`);
  fs.writeFileSync(tmpPath, buffer);

  try {
    const text = await transcribeFile(tmpPath);
    return text;
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}

// ============================================================
// Media Group Buffer + Geração de Legenda com Vision
// ============================================================

const mediaGroupBuffer = new Map(); // media_group_id → { photos: [], caption, chatId, timer }

function bufferMediaGroupPhoto(update) {
  const msg = update.message;
  const groupId = msg.media_group_id;
  const chatId = String(msg.chat.id);
  const photo = msg.photo ? msg.photo[msg.photo.length - 1] : null; // maior resolução

  if (!photo) return false;

  if (!mediaGroupBuffer.has(groupId)) {
    mediaGroupBuffer.set(groupId, { photos: [], caption: null, chatId });
  }

  const group = mediaGroupBuffer.get(groupId);
  group.photos.push(photo.file_id);
  if (msg.caption) group.caption = msg.caption;

  // Limpa timer anterior e seta novo (espera 2s para todas as fotos chegarem)
  if (group.timer) clearTimeout(group.timer);
  group.timer = setTimeout(() => processMediaGroup(groupId), 2000);

  return true;
}

async function processMediaGroup(groupId) {
  const group = mediaGroupBuffer.get(groupId);
  mediaGroupBuffer.delete(groupId);
  if (!group || !group.caption) return;

  const caption = group.caption.trim();
  const isLegendaRequest = /legenda|caption/i.test(caption);
  if (!isLegendaRequest) {
    // Não é pedido de legenda — processa caption como texto normal via interpretador
    const fakeUpdate = { message: { chat: { id: Number(group.chatId) }, text: caption } };
    try { await processUpdate(fakeUpdate); } catch {}
    return;
  }

  const chatId = group.chatId;
  console.log(`[swipe] Legenda request: ${group.photos.length} foto(s), caption="${caption.substring(0, 50)}"`);

  await botSend(chatId, `📸 Analisando ${group.photos.length} imagem(ns) para gerar legenda...`);

  try {
    // Baixa fotos e converte para base64
    const imageContents = [];
    for (const fileId of group.photos.slice(0, 10)) { // max 10 fotos
      const fileUrl = await getTelegramFileUrl(fileId);
      const res = await fetch(fileUrl);
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      const base64 = buffer.toString('base64');
      const mimeType = 'image/jpeg';
      imageContents.push({ type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } });
    }

    if (imageContents.length === 0) {
      await botSend(chatId, '⚠️ Não consegui baixar as imagens.');
      return;
    }

    // Carrega docs de posicionamento para contexto
    const docs = loadPositioningDocs();
    const posContext = buildPositioningContext(docs);

    // Claude Vision: analisa imagens + gera legenda
    const legendaPrompt = `Você é a Nova, social media strategist do @byericsantos.

CONTEXTO DO ERIC:
${posContext.substring(0, 2000)}

TAREFA: Eric enviou ${imageContents.length} imagem(ns) de um post/carrossel para Instagram. Analise TODAS as imagens e escreva uma LEGENDA profissional para o post.

INSTRUÇÕES:
1. LEIA cada imagem com atenção — identifique o tema, texto nas imagens, dados, argumentos
2. A legenda deve COMPLEMENTAR as imagens (não repetir o que já está escrito nelas)
3. Escreva na VOZ DO ERIC: direto, "você", dados concretos, sem coach
4. Estrutura da legenda:
   - ABERTURA: gancho que conecta ao tema das imagens (1-2 linhas)
   - CORPO: desenvolve o argumento principal com 1-2 insights extras que NÃO estão nas imagens
   - REFRAME: uma frase que "vira a chave" para o ICP (dono de clínica, profissional de estética)
   - CTA: comando claro (salvar, compartilhar, chamar no direct)
5. Máximo 150 palavras na legenda
6. Ao final: 5-8 hashtags relevantes (mix de nicho + alcance)

FORMATO DE RESPOSTA:
---
LEGENDA:
[a legenda completa aqui]

HASHTAGS:
[as hashtags aqui]
---

${caption !== 'Escreve a legenda para esse post' ? `\nInstrução adicional do Eric: "${caption}"` : ''}`;

    const messages = [{
      role: 'user',
      content: [...imageContents, { type: 'text', text: legendaPrompt }],
    }];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`API ${response.status}: ${err.error?.message || 'unknown'}`);
    }

    const data = await response.json();
    const legendaText = data.content[0].text.trim();

    console.log(`[swipe] Legenda gerada (${legendaText.length} chars)`);

    const keyboard = {
      inline_keyboard: [[
        { text: '📋 Copiar', callback_data: 'swipe:noop' },
        { text: '🔄 Reescrever', callback_data: `swipe:rewrite-legenda:${groupId}` },
      ]],
    };

    await botSend(chatId, `✍️ *Legenda para o post:*\n\n${legendaText}`, keyboard);

  } catch (err) {
    console.error('[swipe] Legenda generation error:', err.message);
    await botSend(chatId, `❌ Erro ao gerar legenda: ${err.message.substring(0, 200)}`);
  }
}

async function processUpdate(update) {
  if (update.message) {
    const { chat } = update.message;
    let { text } = update.message;
    const chatId = String(chat.id);

    // Only accept messages from Eric's chat
    if (chatId !== CHAT_ID) {
      return;
    }

    // ─── Media Group (album de fotos): buffer e processa junto ──────────
    if (update.message.media_group_id && update.message.photo) {
      bufferMediaGroupPhoto(update);
      return; // processMediaGroup será chamado pelo timer
    }

    // ─── Foto avulsa com caption pedindo legenda ──────────
    if (update.message.photo && !update.message.media_group_id) {
      const caption = update.message.caption || '';
      if (/legenda|caption/i.test(caption)) {
        const fakeGroupId = `single-${Date.now()}`;
        mediaGroupBuffer.set(fakeGroupId, {
          photos: [update.message.photo[update.message.photo.length - 1].file_id],
          caption,
          chatId,
        });
        await processMediaGroup(fakeGroupId);
        return;
      }
      // ─── Foto sem "legenda" → salvar como aprendizado ──────────
      try {
        const photoDesc = caption || 'Print/imagem enviada pelo Eric';
        await botSend(chatId, '📸 Salvando como aprendizado...');
        const result = await saveLearningInput(
          photoDesc, 'photo', ANTHROPIC_API_KEY, photoDesc
        );
        await botSend(chatId, `✅ Salvo! ${result.catLabel}\n📝 ${result.summary}`);
      } catch (err) {
        console.error('[swipe] learning photo error:', err.message);
        await botSend(chatId, '⚠️ Erro ao salvar aprendizado.');
      }
      return;
    }

    // Se a mensagem é uma foto com caption (não legenda), usar o caption como text
    if (!text && update.message.caption) {
      text = update.message.caption;
    }

    // ─── Áudio / Voz: transcrever antes de processar ──────────
    const voiceData = update.message.voice || update.message.audio;
    if (voiceData && !text) {
      await botSend(chatId, '🎙️ Transcrevendo áudio...');
      try {
        const transcribed = await transcribeVoiceMessage(voiceData);
        if (transcribed) {
          text = transcribed;
          await botSend(chatId, `📝 _"${transcribed}"_`);
        } else {
          await botSend(chatId, '⚠️ Não consegui transcrever o áudio. Tente novamente.');
          return;
        }
      } catch (err) {
        console.error('[swipe] transcrição error:', err.message);
        await botSend(chatId, `❌ Erro na transcrição: ${err.message.substring(0, 100)}`);
        return;
      }
    }

    if (!text) return;

    // ─── Determinar estado atual para o interpretador ──────────
    function getCurrentState() {
      const feedbackCtx = waitingFeedback.get(chatId);
      if (feedbackCtx?.feedbackType === 'slide-revision') return 'waiting-slide-revision';
      if (feedbackCtx) return 'waiting-feedback';
      // Verifica se tem réplica em andamento
      for (const [, r] of pendingReplicas) {
        if (r.step === 'format-pending') return 'format-pending';
        if (r.step === 'preview') return 'preview';
        if (r.step === 'visual-review') return 'visual-review';
      }
      return 'idle';
    }

    function getActiveReplica() {
      const feedbackCtx = waitingFeedback.get(chatId);
      if (feedbackCtx) {
        const replica = pendingReplicas.get(feedbackCtx.pendingId);
        return replica ? { pendingId: feedbackCtx.pendingId, replica } : null;
      }
      for (const [id, r] of pendingReplicas) {
        if (['format-pending', 'preview', 'visual-review'].includes(r.step)) {
          return { pendingId: id, replica: r };
        }
      }
      return null;
    }

    // ─── Atalho: comandos / explícitos vão direto ──────────
    if (text === '/temas') {
      try {
        const estrategiasPath = path.resolve(__dirname, '../docs/eric-brand/knowledge-base/nova-estrategias.md');
        if (!fs.existsSync(estrategiasPath)) {
          await botSend(chatId, '⚠️ Arquivo nova-estrategias.md não encontrado.');
          return;
        }
        const raw = fs.readFileSync(estrategiasPath, 'utf8');
        const lines = raw.split('\n').filter(l => l.trim().length > 0);
        const temas = lines
          .filter(l => /^[-*]\s|^##\s/.test(l.trim()))
          .slice(-10)
          .map((l, i) => `${i + 1}. ${l.replace(/^[-*#]+\s*/, '').trim()}`)
          .join('\n');
        await botSend(chatId, `📋 Últimos 10 temas da Nova:\n\n${temas || 'Nenhum tema encontrado.'}`);
      } catch (err) {
        await botSend(chatId, `❌ Erro: ${err.message.substring(0, 100)}`);
      }
      return;
    }

    if (text.startsWith('/analisar-campo') || text === '/campo') {
      const daysArg = parseInt(text.split(' ')[1]) || 7;
      const processingMsg = await botSend(chatId, `🔍 Analisando mensagens dos últimos ${daysArg} dias...`);
      try {
        const result = await runDailyAnalysis(daysArg);
        await botEdit(chatId, processingMsg.result?.message_id,
          result.ok
            ? `✅ Análise de campo concluída!\n\n📊 ${result.messagesAnalyzed} mensagens analisadas\n📝 Repertório da Nova atualizado\n\nVeja em: docs/eric-brand/knowledge-base/repertorio-nova.md`
            : `⚠️ ${result.message}`
        );
      } catch (err) {
        console.error('[swipe] /analisar-campo error:', err.message);
        await botSend(chatId, `❌ Erro na análise: ${err.message.substring(0, 200)}`);
      }
      return;
    }

    // ─── Atalho: URLs diretas vão direto (sem interpretador) ──────────
    const urls = text.match(URL_REGEX);
    if (urls) {
      for (const rawUrl of urls) {
        const url = rawUrl.replace(/[)\]>.,!?]+$/, '');
        if (isSupportedUrl(url)) {
          await processUrl(url, chatId);
          return;
        }
      }
      // URL não é de rede social → salvar como aprendizado (link de referência)
      try {
        const linkText = text.trim();
        await botSend(chatId, '🔗 Link de referência — salvando como aprendizado...');
        const result = await saveLearningInput(linkText, 'link', ANTHROPIC_API_KEY);
        await botSend(chatId, `✅ Salvo! ${result.catLabel}\n📝 ${result.summary}`);
      } catch (err) {
        console.error('[swipe] learning link error:', err.message);
        await botSend(chatId, '⚠️ Erro ao salvar aprendizado do link.');
      }
      return;
    }

    // ─── Interpretador inteligente (Haiku) ──────────
    const currentState = getCurrentState();
    const activeCtx = getActiveReplica();
    const replicaContext = activeCtx ? activeCtx.replica : null;

    console.log(`[swipe] Interpretando: "${text.substring(0, 80)}" | state=${currentState}`);
    const intent = await interpretMessage(text, currentState, replicaContext);
    console.log(`[swipe] Intenção: ${intent.action} (${intent.confidence}) — ${intent.instruction?.substring(0, 60) || ''}`);

    // Se confiança baixa, pede confirmação
    if (intent.confidence < 0.7 && intent.action !== 'unclear') {
      const actionLabels = {
        'revise-text': 'revisar o roteiro',
        'revise-slide': 'ajustar um slide',
        'select-format': 'mudar o formato',
        'generate-new': 'criar conteúdo novo',
        'approve': 'aprovar',
        'discard': 'descartar',
      };
      const label = actionLabels[intent.action] || intent.action;
      await botSend(chatId,
        `🤔 Entendi que você quer: *${label}*\n"${intent.instruction || text}"\n\nÉ isso? Reformule se não for.`
      );
      return;
    }

    // ─── Roteamento baseado na ação interpretada ──────────

    if (intent.action === 'send-url') {
      // Haiku extraiu URL do texto
      const extractedUrl = intent.instruction || text;
      const urlMatch = extractedUrl.match(URL_REGEX);
      if (urlMatch) {
        const url = urlMatch[0].replace(/[)\]>.,!?]+$/, '');
        await processUrl(url, chatId);
      } else {
        await botSend(chatId, '⚠️ Não encontrei uma URL válida na sua mensagem.');
      }

    } else if (intent.action === 'revise-text') {
      if (!activeCtx) {
        await botSend(chatId, '⚠️ Nenhum roteiro em andamento para revisar. Envie um link primeiro.');
        return;
      }
      const { pendingId, replica } = activeCtx;
      waitingFeedback.delete(chatId);

      await botSend(chatId, `🔄 Nova revisando...`);
      try {
        const docs = loadPositioningDocs();
        const posContext = buildPositioningContext(docs);
        const revisionFeedback = {
          feedback: intent.instruction || text,
          previousVersion: replica.generated,
        };
        const newResult = await generateContent(
          replica.analysis, posContext, replica.selectedFormat || null,
          replica.specialistId, revisionFeedback
        );
        replica.generated = newResult.content;
        replica.slidesData = newResult.slidesData || null;
        replica.step = 'preview';
        replica.attempts += 1;
        savePendingState();

        const qgLine = newResult.qualityGate
          ? `\n📊 Quality Gate: ${newResult.qualityGate.score}/10 — ${newResult.qualityGate.verdict}`
          : '';
        const preview = buildReplicaPreview(newResult.content, replica.analysis, replica.swipeId, replica.specialistName, replica.selectionReason) + qgLine;
        const keyboard = {
          inline_keyboard: [[
            { text: '✅ Aprovar e salvar no Drive', callback_data: `swipe:approved:${pendingId}` },
            { text: '🔄 Revisar novamente', callback_data: `swipe:revise:${pendingId}` },
            { text: '❌ Cancelar', callback_data: `swipe:drop:${pendingId}` },
          ]],
        };
        await botSend(chatId, preview, keyboard);
      } catch (err) {
        console.error('[swipe] revisão error:', err.message);
        await botSend(chatId, `❌ Erro ao revisar: ${err.message.substring(0, 200)}`);
      }

    } else if (intent.action === 'revise-slide') {
      if (!activeCtx) {
        await botSend(chatId, '⚠️ Nenhum design em andamento.');
        return;
      }
      const { pendingId, replica } = activeCtx;
      waitingFeedback.delete(chatId);

      const slideNum = intent.details?.slideNumber || parseInt((intent.instruction || '').match(/\d+/)?.[0]) || 0;
      const slideInstruction = intent.details?.instruction || intent.instruction || text;

      if (!slideNum) {
        await botSend(chatId, '⚠️ Qual slide? Ex: "slide 2: mude a imagem para agenda médica"');
        waitingFeedback.set(chatId, { pendingId, feedbackType: 'slide-revision' });
        return;
      }

      const slideIdx = slideNum - 1;
      let slidesData = replica.slidesData;
      if (!slidesData) {
        try { slidesData = parseF3(replica.generated); } catch {}
      }
      if (!slidesData) {
        await botSend(chatId, '❌ Não foi possível parsear os slides.');
        return;
      }

      const allSlides = [...slidesData.slides];
      if (slidesData.cta) allSlides.push({ headline: slidesData.cta, body: null, imageQuery: null, isCta: true });

      if (slideIdx < 0 || slideIdx >= allSlides.length) {
        await botSend(chatId, `⚠️ Slide ${slideNum} não existe. Total: ${allSlides.length}`);
        return;
      }

      await botSend(chatId, `🔄 Regenerando slide ${slideNum}...`);
      try {
        const slide = slideIdx < slidesData.slides.length ? slidesData.slides[slideIdx] : null;
        if (slide) {
          if (/imagem|foto|image|screenshot|print/i.test(slideInstruction)) {
            slide.imageQuery = slideInstruction.replace(/^.*(?:imagem|foto|image)\s*(?:para|de|com)?\s*/i, '').trim() || slideInstruction;
          } else {
            if (slideInstruction.length < 60) {
              slide.headline = slideInstruction;
            } else {
              slide.body = slideInstruction;
            }
          }
        }

        replica.slidesData = slidesData;
        savePendingState();

        const pngPath = await regenerateSlide(slidesData, slideIdx, {
          swipeId: replica.swipeId || `regen-${pendingId}`,
        });

        if (replica.pngPaths && replica.pngPaths[slideIdx]) {
          replica.pngPaths[slideIdx] = pngPath;
        }
        savePendingState();

        await sendSinglePhoto(chatId, pngPath);

        const keyboard = {
          inline_keyboard: [[
            { text: '✅ Aprovar design', callback_data: `swipe:approve-design:${pendingId}` },
            { text: '🔄 Ajustar outro slide', callback_data: `swipe:revise-slide:${pendingId}` },
          ]],
        };
        await botSend(chatId, `✅ Slide ${slideNum} regenerado. O que fazer?`, keyboard);
      } catch (err) {
        console.error('[swipe] slide-revision error:', err.message);
        await botSend(chatId, `❌ Erro ao regenerar slide: ${err.message.substring(0, 200)}`);
      }

    } else if (intent.action === 'select-format') {
      if (!activeCtx) {
        await botSend(chatId, '⚠️ Nenhum conteúdo pendente para formatar.');
        return;
      }
      const format = intent.details?.format || (intent.instruction || '').match(/F[1-5]/)?.[0];
      if (!format) {
        await botSend(chatId, '⚠️ Qual formato? F1, F2, F3, F4 ou F5.');
        return;
      }
      // Simula callback format-select
      const { pendingId } = activeCtx;
      const fakeCallback = {
        id: `fake-${Date.now()}`,
        message: { chat: { id: chatId }, message_id: 0 },
        data: `swipe:format-select:${pendingId}:${format}`,
      };
      await handleCallback(fakeCallback);

    } else if (intent.action === 'select-strategy') {
      // Encontra análise pendente
      let targetId = null;
      for (const [id] of pendingAnalyses) { targetId = id; break; }
      if (!targetId) {
        await botSend(chatId, '⚠️ Nenhuma análise pendente para mudar estratégia.');
        return;
      }
      const strategy = intent.details?.strategy || intent.instruction || 'replicate-mechanism';
      const pending = pendingAnalyses.get(targetId);
      if (pending) {
        pending.analysis.adaptationStrategy = strategy;
        await botSend(chatId, `✅ Estratégia atualizada: ${strategy}`);
      }

    } else if (intent.action === 'generate-new') {
      const tema = intent.details?.tema || intent.instruction || text;
      const format = intent.details?.format || 'F3';

      await botSend(chatId, `🎯 Gerando ${format} sobre: ${tema}`);

      // Cria análise sintética
      const syntheticAnalysis = {
        username: '@byericsantos',
        theme: tema,
        format: format,
        technique: 'conteúdo original',
        contentCategory: 'educational',
        adaptationStrategy: 'replicate-mechanism',
        viralReason: 'Tema solicitado por Eric',
      };

      const replicaId = ++pendingCounter;
      pendingReplicas.set(replicaId, {
        url: null,
        analysis: syntheticAnalysis,
        swipeId: null,
        step: 'generating',
        selectedFormat: format,
        attempts: 0,
      });
      savePendingState();

      try {
        const docs = loadPositioningDocs();
        const posContext = buildPositioningContext(docs);
        const result = await generateContent(syntheticAnalysis, posContext, format);

        const replica = pendingReplicas.get(replicaId);
        replica.generated = result.content;
        replica.specialistId = result.specialistId;
        replica.specialistName = result.specialistName;
        replica.selectionReason = result.selectionReason;
        replica.slidesData = result.slidesData || null;
        replica.step = 'preview';
        replica.attempts = 1;
        savePendingState();

        const qgLine = result.qualityGate
          ? `\n📊 Quality Gate: ${result.qualityGate.score}/10 — ${result.qualityGate.verdict}`
          : '';
        const preview = buildReplicaPreview(result.content, syntheticAnalysis, null, result.specialistName, result.selectionReason) + qgLine;
        const keyboard = {
          inline_keyboard: [[
            { text: '✅ Aprovar e salvar no Drive', callback_data: `swipe:approved:${replicaId}` },
            { text: '🔄 Revisar', callback_data: `swipe:revise:${replicaId}` },
            { text: '❌ Cancelar', callback_data: `swipe:drop:${replicaId}` },
          ]],
        };
        await botSend(chatId, preview, keyboard);
      } catch (err) {
        console.error('[swipe] generate-new error:', err.message);
        pendingReplicas.delete(replicaId);
        savePendingState();
        await botSend(chatId, `❌ Erro ao gerar: ${err.message.substring(0, 200)}`);
      }

    } else if (intent.action === 'approve') {
      if (!activeCtx) {
        await botSend(chatId, '⚠️ Nada pendente para aprovar.');
        return;
      }
      const { pendingId } = activeCtx;
      const replica = activeCtx.replica;
      waitingFeedback.delete(chatId);

      if (replica.step === 'visual-review') {
        const fakeCallback = {
          id: `fake-${Date.now()}`,
          message: { chat: { id: chatId }, message_id: 0 },
          data: `swipe:approve-design:${pendingId}`,
        };
        await handleCallback(fakeCallback);
      } else {
        const fakeCallback = {
          id: `fake-${Date.now()}`,
          message: { chat: { id: chatId }, message_id: 0 },
          data: `swipe:approved:${pendingId}`,
        };
        await handleCallback(fakeCallback);
      }

    } else if (intent.action === 'discard') {
      if (!activeCtx) {
        await botSend(chatId, '⚠️ Nada pendente para descartar.');
        return;
      }
      const { pendingId } = activeCtx;
      waitingFeedback.delete(chatId);
      const fakeCallback = {
        id: `fake-${Date.now()}`,
        message: { chat: { id: chatId }, message_id: 0 },
        data: `swipe:drop:${pendingId}`,
      };
      await handleCallback(fakeCallback);

    } else if (intent.action === 'command') {
      // Haiku identificou um comando — tenta executar
      const cmd = intent.instruction || text;
      if (cmd.includes('/temas') || cmd.includes('temas')) {
        await botSend(chatId, '💡 Use /temas para ver os temas.');
      } else if (cmd.includes('/campo') || cmd.includes('analisar')) {
        await botSend(chatId, '💡 Use /campo ou /analisar-campo para análise.');
      } else {
        await botSend(chatId, `💡 Comando não reconhecido: ${cmd}`);
      }

    } else if (intent.action === 'question') {
      // Haiku já respondeu no campo instruction
      await botSend(chatId, intent.instruction || 'Não tenho contexto suficiente para responder.');

    } else {
      // unclear ou ação não reconhecida em idle → salvar como aprendizado
      if (currentState === 'idle' && text.length > 10) {
        try {
          await botSend(chatId, '📝 Salvando como aprendizado...');
          const result = await saveLearningInput(text, 'text', ANTHROPIC_API_KEY);
          await botSend(chatId, `✅ Salvo! ${result.catLabel}\n📝 ${result.summary}`);
        } catch (err) {
          console.error('[swipe] learning text error:', err.message);
          await botSend(chatId, '⚠️ Erro ao salvar aprendizado.');
        }
      } else {
        await botSend(
          chatId,
          '💡 Não entendi. Pode:\n\n' +
          '• Enviar um link para analisar\n' +
          '• Pedir um conteúdo: "faz um F3 sobre leads frios"\n' +
          '• Qualquer texto/insight → salvo como aprendizado\n' +
          '• Aprovar: "aprovado" / Cancelar: "descarta"\n\n' +
          '/temas — ver últimos temas\n' +
          '/campo — análise de campo'
        );
      }
    }
  }

  if (update.callback_query) {
    await handleCallback(update.callback_query);
  }
}

async function startPolling() {
  if (pollingActive) return;
  pollingActive = true;

  // Reset webhook to use polling
  await callBot('deleteWebhook', { drop_pending_updates: false });
  console.log('[swipe] Bot iniciado. Aguardando links...');

  while (pollingActive) {
    try {
      const updates = await getUpdates();
      for (const update of updates) {
        try {
          await processUpdate(update);
        } catch (err) {
          console.error('[swipe] processUpdate error:', err.message);
        }
      }
    } catch (err) {
      console.error('[swipe] Polling error:', err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// ============================================================
// Express (health check)
// ============================================================

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'swipe-collector',
    pending: pendingAnalyses.size,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/swipes', (req, res) => {
  try {
    const data = parseIndexMd(INDEX_PATH);
    res.json({ ok: true, count: data.swipes.length, ...data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/swipes/:id', (req, res) => {
  const { id } = req.params;
  if (!/^F[1-5]-\d{3}$/.test(id)) {
    return res.status(400).json({ ok: false, error: 'ID inválido' });
  }
  try {
    deleteFromIndex(id);
    res.json({ ok: true, deleted: id });
  } catch (err) {
    res.status(404).json({ ok: false, error: err.message });
  }
});

app.get('/dashboard', (req, res) => {
  try {
    const { swipes, counts } = parseIndexMd(INDEX_PATH);
    res.send(buildDashboardHtml(swipes, counts));
  } catch (err) {
    res.status(500).send(`<pre style="color:red">Erro ao carregar swipe file:\n${err.message}</pre>`);
  }
});

function buildDashboardHtml(swipes, counts) {
  const totalCount = swipes.length;
  const cardsHtml = swipes.map(s => {
    const linkHref = s.link || null;
    const hasAnalysis = s.whyViral || s.insight || s.adaptation;
    return `<div class="card" data-id="${s.id}" data-format="${s.format}">
      <div class="card-top">
        <span class="badge badge-${s.format}">${s.format}</span>
        <span class="card-fmt">${s.formatName}</span>
        <span class="card-id">${s.id}</span>
      </div>
      <div class="card-body">
        <div class="card-fonte">${s.fonte}</div>
        <div class="card-tema">${s.tema}</div>
        <div class="card-tecnica">${s.tecnica}</div>
      </div>
      <div class="card-footer">
        ${linkHref ? `<a class="card-link" href="${linkHref}" target="_blank" rel="noopener" onclick="event.stopPropagation()">↗ Abrir original</a>` : '<span class="card-link-off">arquivo local</span>'}
        ${hasAnalysis ? '<span class="analysis-dot" title="Tem análise">●</span>' : ''}
      </div>
    </div>`;
  }).join('');

  const filterBtns = [
    `<button class="filter-btn active" data-format="ALL">Todos <span class="cnt">${totalCount}</span></button>`,
    ...Object.entries(FORMAT_META).map(([f, meta]) =>
      `<button class="filter-btn" data-format="${f}">${f} <span class="cnt">${counts[f] || 0}</span></button>`
    ),
  ].join('');

  const swipesJson = JSON.stringify(swipes).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Swipe File — @byericsantos</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  /* ── DS Backgrounds ── */
  --bg-base: #030303;
  --bg-surface: #0a0a0a;
  --bg-elevated: #101013;
  --bg-overlay: #18181d;
  /* ── DS Borders ── */
  --border-faint: #141417;
  --border-subtle: #1e1e23;
  --border-base: #27272d;
  --border-strong: #35353c;
  /* ── DS Text ── */
  --text-primary: #F0F0F5;
  --text-secondary: #8F8FA0;
  --text-muted: #505060;
  /* ── DS Accent ── */
  --accent: #C8FF00;
  --accent-dim: rgba(200, 255, 0, 0.08);
  --accent-glow: rgba(200, 255, 0, 0.22);
  /* ── DS Semantic ── */
  --success: #22C55E;
  --warning: #F59E0B;
  --danger: #EF4444;
  /* ── DS Typography ── */
  --font-display: 'Space Grotesk', 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  /* ── DS Radius ── */
  --r-xs: 3px; --r-sm: 6px; --r-md: 8px; --r-lg: 12px; --r-xl: 16px; --r-full: 9999px;
  /* ── DS Transitions ── */
  --ease-fast: 120ms cubic-bezier(0.4, 0, 0.2, 1);
  --ease-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  /* ── Page-specific ── */
  --blue: #4fc3f7;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-body); background: var(--bg-base); color: var(--text-primary); min-height: 100vh; -webkit-font-smoothing: antialiased; }

header {
  position: sticky; top: 0; z-index: 100;
  background: var(--bg-surface); border-bottom: 1px solid var(--border-base);
  padding: 0 28px; height: 56px;
  display: flex; align-items: center; gap: 14px;
}
header h1 { font-size: 1rem; font-weight: 700; color: var(--text-primary); font-family: var(--font-display); }
header h1 span { color: var(--text-muted); font-weight: 400; }
.total-badge { background: var(--bg-elevated); color: var(--text-secondary); padding: 2px 10px; border-radius: var(--r-lg); font-size: 0.75rem; }

.filters {
  padding: 16px 28px; display: flex; gap: 8px; flex-wrap: wrap;
  border-bottom: 1px solid var(--border-base); background: var(--bg-surface);
}
.filter-btn {
  padding: 5px 14px; border-radius: var(--r-full); border: 1px solid var(--border-base);
  background: transparent; color: var(--text-secondary); cursor: pointer;
  font-size: 0.8rem; transition: all var(--ease-fast); display: flex; align-items: center; gap: 6px;
}
.filter-btn:hover { border-color: var(--border-strong); color: var(--text-primary); }
.filter-btn.active { background: #fff; color: #000; border-color: #fff; font-weight: 600; }
.filter-btn[data-format="F1"].active { background: #f5f5f5; color: #111; }
.filter-btn[data-format="F2"].active { background: #1565c0; color: #fff; border-color: #1565c0; }
.filter-btn[data-format="F3"].active { background: #212121; color: #fff; border-color: #555; }
.filter-btn[data-format="F4"].active { background: #3949ab; color: #fff; border-color: #3949ab; }
.filter-btn[data-format="F5"].active { background: #bf360c; color: #fff; border-color: #bf360c; }
.cnt { font-size: 0.7rem; background: rgba(255,255,255,0.12); padding: 1px 6px; border-radius: var(--r-md); }
.filter-btn.active .cnt { background: rgba(0,0,0,0.15); }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px; padding: 24px 28px 48px;
}

.card {
  background: var(--bg-surface); border-radius: var(--r-lg);
  border: 1px solid var(--border-base); cursor: pointer;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
  display: flex; flex-direction: column;
}
.card:hover { transform: translateY(-2px); border-color: var(--border-strong); box-shadow: 0 4px 16px rgba(0,0,0,0.4); }

.card-top {
  padding: 12px 14px 10px; border-bottom: 1px solid var(--border-base);
  display: flex; align-items: center; gap: 8px;
}
.badge {
  font-size: 0.65rem; font-weight: 700; padding: 2px 8px;
  border-radius: var(--r-md); letter-spacing: 0.04em; flex-shrink: 0;
}
.badge-F1 { background: #e8e8e8; color: #111; }
.badge-F2 { background: #1565c0; color: #fff; }
.badge-F3 { background: #1a1a1a; color: #ccc; border: 1px solid var(--border-strong); }
.badge-F4 { background: #3949ab; color: #fff; }
.badge-F5 { background: #bf360c; color: #fff; }

.card-fmt { font-size: 0.73rem; color: var(--text-secondary); flex: 1; }
.card-id  { font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono); }

.card-body { padding: 14px; flex: 1; }
.card-fonte  { font-size: 0.78rem; color: var(--blue); margin-bottom: 6px; font-weight: 500; }
.card-tema   { font-size: 0.9rem; color: var(--text-primary); line-height: 1.45; margin-bottom: 8px; font-weight: 500; }
.card-tecnica{ font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4; }

.card-footer {
  padding: 10px 14px; border-top: 1px solid var(--border-base);
  display: flex; align-items: center; justify-content: space-between;
}
.card-link { font-size: 0.75rem; color: var(--text-muted); text-decoration: none; transition: color var(--ease-fast); }
.card-link:hover { color: var(--blue); }
.card-link-off { font-size: 0.72rem; color: var(--text-muted); }
.analysis-dot { color: #4caf50; font-size: 0.65rem; }
.cat-badge {
  font-size: 0.6rem; font-weight: 700; padding: 1px 7px; border-radius: var(--r-md);
  color: #fff; letter-spacing: 0.04em; text-transform: uppercase; flex-shrink: 0;
}
.card-hype {
  font-size: 0.72rem; color: #ff8a50; margin-top: 6px;
  line-height: 1.35; font-style: italic;
}

/* MODAL */
.overlay {
  display: none; position: fixed; inset: 0;
  background: rgba(0,0,0,0.87); z-index: 200;
  align-items: center; justify-content: center; padding: 20px;
}
.overlay.open { display: flex; }
.modal {
  background: var(--bg-surface); border-radius: var(--r-xl); border: 1px solid var(--border-base);
  max-width: 640px; width: 100%; max-height: 88vh; overflow-y: auto;
  padding: 28px; position: relative; animation: modal-in 0.18s ease-out;
}
@keyframes modal-in {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.modal-close {
  position: absolute; top: 14px; right: 16px;
  background: none; border: none; color: var(--text-secondary); font-size: 1.3rem;
  cursor: pointer; line-height: 1; padding: 4px 8px; border-radius: var(--r-sm);
  transition: background var(--ease-fast), color var(--ease-fast);
}
.modal-close:hover { background: var(--bg-elevated); color: var(--text-primary); }
.modal-header { display: flex; align-items: center; gap: 10px; margin-bottom: 22px; }
.modal-header h2 { font-size: 1rem; color: var(--text-primary); font-family: var(--font-display); }
.modal-section { margin-bottom: 18px; }
.modal-label {
  font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--text-muted); margin-bottom: 5px; font-weight: 600;
}
.modal-value { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.55; }
.modal-value a { color: var(--blue); text-decoration: none; }
.modal-value a:hover { text-decoration: underline; }
.modal-divider { border: none; border-top: 1px solid var(--border-base); margin: 18px 0; }

/* EMPTY */
.empty { grid-column: 1/-1; text-align: center; padding: 64px 20px; color: var(--text-muted); }
.empty p { margin-top: 8px; font-size: 0.85rem; }

/* DELETE */
.modal-delete-zone { margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border-base); display: flex; justify-content: flex-end; }
.btn-delete {
  background: transparent; border: 1px solid #c62828; color: #c62828;
  padding: 7px 16px; border-radius: 7px; cursor: pointer; font-size: 0.8rem;
  transition: all var(--ease-fast);
}
.btn-delete:hover { background: #c62828; color: #fff; }
.btn-delete.confirm { background: #c62828; color: #fff; animation: pulse-red 0.4s ease; }
@keyframes pulse-red { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
</style>
</head>
<body>

<header>
  <h1>Swipe File <span>— @byericsantos</span></h1>
  <span class="total-badge" id="count-badge">${totalCount} swipes</span>
</header>

<div class="filters">${filterBtns}</div>

<div class="grid" id="grid">${cardsHtml}</div>

<div class="overlay" id="overlay">
  <div class="modal">
    <button class="modal-close" id="modal-close">✕</button>
    <div id="modal-body"></div>
  </div>
</div>

<script>
let SWIPES = ${swipesJson};
const FORMAT_META = ${JSON.stringify(FORMAT_META)};
let activeFilter = 'ALL';

const CATEGORY_COLORS = {
  hype: '#ff6d00', educational: '#1565c0', controversy: '#6a1b9a',
  announcement: '#2e7d32', entertainment: '#e65100', evergreen: '#37474f',
};
const STRATEGY_ICON = {
  'bridge-post': '🌉', 'replicate-mechanism': '🔄',
  'find-analogy': '🔍', 'comment-on-trend': '💬',
};

function buildCard(s) {
  const linkHref = s.link || null;
  const hasDeepAnalysis = s.persons || s.hypeContext || s.viralReason;
  const categoryBadge = s.contentCategory
    ? \`<span class="cat-badge" style="background:\${CATEGORY_COLORS[s.contentCategory] || '#444'}">\${s.contentCategory}</span>\`
    : '';
  const stratIcon = s.adaptationStrategy ? (STRATEGY_ICON[s.adaptationStrategy] || '') : '';

  return \`<div class="card" data-id="\${s.id}" data-format="\${s.format}">
    <div class="card-top">
      <span class="badge badge-\${s.format}">\${s.format}</span>
      <span class="card-fmt">\${s.formatName}</span>
      <span class="card-id">\${s.id}</span>
      \${categoryBadge}
    </div>
    <div class="card-body">
      <div class="card-fonte">\${s.fonte}</div>
      <div class="card-tema">\${s.tema}</div>
      <div class="card-tecnica">\${s.tecnica}</div>
      \${s.hypeContext ? \`<div class="card-hype">🔥 \${s.hypeContext.substring(0,80)}\${s.hypeContext.length > 80 ? '…' : ''}</div>\` : ''}
    </div>
    <div class="card-footer">
      \${linkHref
        ? \`<a class="card-link" href="\${linkHref}" target="_blank" rel="noopener" onclick="event.stopPropagation()">↗ Abrir original</a>\`
        : '<span class="card-link-off">arquivo local</span>'}
      <span style="font-size:0.78rem;color:#555">\${stratIcon}</span>
      \${hasDeepAnalysis ? '<span class="analysis-dot" title="Análise profunda">●</span>' : ''}
    </div>
  </div>\`;
}

function renderGrid() {
  const grid = document.getElementById('grid');
  const filtered = activeFilter === 'ALL' ? SWIPES : SWIPES.filter(s => s.format === activeFilter);
  document.getElementById('count-badge').textContent = filtered.length + ' swipes';
  if (!filtered.length) {
    grid.innerHTML = '<div class="empty"><div style="font-size:2rem">📂</div><p>Nenhum swipe encontrado.</p></div>';
    return;
  }
  grid.innerHTML = filtered.map(buildCard).join('');
  attachCardEvents();
}

function openModal(swipe) {
  const linkHref = swipe.link || null;

  // Badge de categoria
  const categoryColors = {
    hype: '#ff6d00', educational: '#1565c0', controversy: '#6a1b9a',
    announcement: '#2e7d32', entertainment: '#e65100', evergreen: '#37474f',
  };
  const categoryBadge = swipe.contentCategory
    ? \`<span style="background:\${categoryColors[swipe.contentCategory] || '#444'};color:#fff;padding:2px 10px;border-radius:12px;font-size:0.7rem;font-weight:600;letter-spacing:0.05em;">\${swipe.contentCategory.toUpperCase()}</span>\`
    : '';

  const sections = [
    ['Fonte', swipe.fonte + (categoryBadge ? '&nbsp;&nbsp;' + categoryBadge : '')],
    ['Formato', \`\${swipe.format} — \${swipe.formatName}\`],
    ['Tema', swipe.tema],
    ['Técnica Principal', swipe.tecnica],
  ];

  // Campos de análise profunda (novos)
  if (swipe.persons)           sections.push(['👥 Personagens / Contexto', swipe.persons]);
  if (swipe.hypeContext)       sections.push(['🔥 Fator Hype', swipe.hypeContext]);
  if (swipe.timingFactor)      sections.push(['⏱️ Por que AGORA', swipe.timingFactor]);
  if (swipe.viralReason || swipe.whyViral)
                               sections.push(['💡 Razão real de viralizar', swipe.viralReason || swipe.whyViral]);
  if (swipe.insight)           sections.push(['🎯 Insight para @byericsantos', swipe.insight]);

  // Estratégia de adaptação
  if (swipe.adaptationStrategy || swipe.adaptation) {
    const strategyLabel = {
      'bridge-post': '🌉 Bridge Post — ponte de outro mercado',
      'replicate-mechanism': '🔄 Replicar Mecanismo',
      'find-analogy': '🔍 Encontrar Analogia',
      'comment-on-trend': '💬 Comentar a Trend',
    };
    const stratLabel = swipe.adaptationStrategy
      ? (strategyLabel[swipe.adaptationStrategy] || swipe.adaptationStrategy)
      : null;
    const stratValue = [stratLabel, swipe.adaptation].filter(Boolean).join('<br>');
    sections.push(['🛠️ Estratégia de Adaptação', stratValue]);
  }

  // Hooks sugeridos
  if (swipe.hookSuggestions?.length) {
    const hooksHtml = swipe.hookSuggestions
      .map((h, i) => \`<div style="background:#1a1a1a;padding:8px 12px;border-radius:6px;margin-bottom:6px;border-left:2px solid #e53935;font-size:0.82rem;">\${i+1}. \${h}</div>\`)
      .join('');
    sections.push(['🎣 Hooks para @byericsantos', hooksHtml]);
  }

  if (linkHref)        sections.push(['🔗 Link original', \`<a href="\${linkHref}" target="_blank" rel="noopener">\${linkHref}</a>\`]);
  if (swipe.addedDate) sections.push(['📅 Adicionado em', swipe.addedDate]);

  document.getElementById('modal-body').innerHTML =
    \`<div class="modal-header">
      <span class="badge badge-\${swipe.format}">\${swipe.format}</span>
      <h2>\${swipe.id}</h2>
    </div>\` +
    sections.map(([label, val], i) =>
      (i > 0 && i % 2 === 0 ? '<hr class="modal-divider">' : '') +
      \`<div class="modal-section">
        <div class="modal-label">\${label}</div>
        <div class="modal-value">\${val}</div>
      </div>\`
    ).join('') +
    \`<div class="modal-delete-zone">
      <button class="btn-delete" id="btn-delete-swipe" data-id="\${swipe.id}">🗑️ Apagar este swipe</button>
    </div>\`;

  // Handler de delete com dupla confirmação
  const btnDel = document.getElementById('btn-delete-swipe');
  let deleteTimer = null;
  btnDel.addEventListener('click', async function () {
    if (!this.classList.contains('confirm')) {
      this.classList.add('confirm');
      this.textContent = '⚠️ Tem certeza? Clique novamente para apagar';
      deleteTimer = setTimeout(() => {
        this.classList.remove('confirm');
        this.textContent = '🗑️ Apagar este swipe';
      }, 3000);
      return;
    }
    clearTimeout(deleteTimer);
    this.disabled = true;
    this.textContent = '⏳ Apagando...';
    try {
      const res = await fetch('/api/swipes/' + this.dataset.id, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        document.querySelector(\`.card[data-id="\${this.dataset.id}"]\`)?.remove();
        SWIPES = SWIPES.filter(s => s.id !== this.dataset.id);
        closeModal();
      } else {
        this.textContent = '❌ Erro: ' + (data.error || 'falha');
        this.disabled = false;
      }
    } catch (err) {
      this.textContent = '❌ Erro de rede';
      this.disabled = false;
    }
  });

  document.getElementById('overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open');
}

function attachCardEvents() {
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const swipe = SWIPES.find(s => s.id === card.dataset.id);
      if (swipe) openModal(swipe);
    });
  });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.format;
    renderGrid();
  });
});

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('overlay').addEventListener('click', e => {
  if (e.target.id === 'overlay') closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

attachCardEvents();
</script>
</body>
</html>`;
}

// ============================================================
// Análise diária agendada (08:00 todo dia)
// ============================================================

function scheduleDailyAnalysis() {
  const now = new Date();
  const next = new Date();
  next.setHours(8, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1); // próximo dia se já passou das 8h

  const msUntilNext = next - now;
  console.log(`[swipe] Análise de campo agendada para ${next.toLocaleString('pt-BR')}`);

  setTimeout(async () => {
    try {
      console.log('[swipe] 🕗 Rodando análise diária de campo...');
      const result = await runDailyAnalysis(1); // analisa apenas o último dia
      if (result.ok && result.messagesAnalyzed > 0) {
        await botSend(CHAT_ID,
          `📊 Análise de campo automática concluída\n\n` +
          `${result.messagesAnalyzed} mensagens analisadas → repertório da Nova atualizado`
        );
      }
    } catch (err) {
      console.error('[swipe] Análise diária falhou:', err.message);
    }
    scheduleDailyAnalysis(); // agenda próxima
  }, msUntilNext);
}

// ============================================================
// Start
// ============================================================

app.listen(PORT, () => {
  console.log(`[swipe] Server na porta ${PORT}`);
});

startPolling().catch(err => {
  console.error('[swipe] Falha fatal no polling:', err.message);
  process.exit(1);
});

scheduleDailyAnalysis();
