// meu-projeto/lib/iris-engine.js
// Orquestrador principal da Iris v2 - Fala como o Eric
// Funil: Aquecimento → Qualificação → Rapport → Proposta Reunião → Agendamento

const irisDB = require('./iris-db');
const irisScripts = require('./iris-scripts');
const irisGroq = require('./iris-groq');
const irisTelegram = require('./iris-telegram');
const ghlAPI = require('./ghl-api');
const instagramDBProspeccao = require('./instagram-db-prospeccao');
const irisLeadScorer = require('./iris-lead-scorer');
const irisPipeline = require('./iris-pipeline');
const stevo = require('./stevo');
const irisCalendar = require('./iris-calendar');

const APPROVAL_CHAT_ID = process.env.IRIS_APPROVAL_CHAT_ID || '5020990459';
const MAX_AUTO_DETECT_MESSAGES = 20;
const DEBOUNCE_MS = 30000; // 30 segundos

const debounceTimers = new Map();
const editingApprovals = new Map();
const nudgeTimers = new Map(); // Timers de 👀 micro-followup
const nudgeSent = new Set();   // Conversas que ja receberam 👀 neste ciclo
let operationMode = 'hunter';

const NUDGE_DELAY_MIN = 10 * 60 * 1000; // 10 minutos
const NUDGE_DELAY_MAX = 15 * 60 * 1000; // 15 minutos
const NUDGE_EMOJI = '👀';

/**
 * Calcula delay humanizado baseado no tamanho da mensagem
 * Simula tempo real de digitacao + tempo de pensar + variacao aleatoria
 *
 * Velocidade media de digitacao no celular: ~35-45 palavras/min (~180-230 chars/min)
 * Eric digita mais rapido que a media, mas tambem pensa antes de enviar
 *
 * @param {string} text - Texto da mensagem a ser "digitada"
 * @returns {number} Delay em milissegundos
 */
function calculateTypingDelay(text) {
  const charCount = text.length;
  const wordCount = text.split(/\s+/).length;

  // Tempo base de digitacao: ~200ms por caractere (celular, informal)
  // Com variacao: 150-250ms por char
  const msPerChar = 150 + Math.random() * 100;
  const typingTime = charCount * msPerChar;

  // Tempo de "pensar" antes de comecar a digitar: 1-4 segundos
  const thinkTime = 1000 + Math.random() * 3000;

  // Pausas naturais: uma pausa curta a cada ~8 palavras (como se relesse)
  const pauseCount = Math.floor(wordCount / 8);
  const pauseTime = pauseCount * (300 + Math.random() * 700);

  // Tempo total com variacao aleatoria de +-15%
  const baseTotal = thinkTime + typingTime + pauseTime;
  const variation = 0.85 + Math.random() * 0.3; // 0.85 a 1.15
  const total = baseTotal * variation;

  // Limites: minimo 3s (msg muito curta), maximo 25s (msg longa)
  return Math.min(Math.max(total, 3000), 25000);
}

/**
 * Salva mensagem no Instagram DB para o Nico Monitor
 */
function saveToMonitor(conversationId, contactName, body, direction, extras = {}) {
  try {
    instagramDBProspeccao.saveMessage({
      id: extras.ghlMessageId || `ig_${conversationId}_${Date.now()}`,
      chatJid: conversationId,
      senderJid: direction === 'inbound' ? (extras.contactId || conversationId) : 'eric',
      chatName: contactName,
      pushName: direction === 'inbound' ? contactName : 'Eric Santos',
      text: body,
      type: extras.isAudio ? 'audio' : 'text',
      isFromMe: direction === 'outbound',
      timestamp: extras.timestamp || Date.now(),
      mediaUrl: extras.audioUrl || null,
      transcription: extras.isAudio ? body : null,
    });
  } catch (err) {
    console.error('🌸 Iris: erro ao salvar no monitor:', err.message);
  }
}

/**
 * Entry point: processa mensagem inbound de um lead
 */
async function processInboundMessage(message, conversation) {
  try {
    const { conversationId, body, type } = message;

    if (type !== 'inbound') return;
    if (!body || body.trim().length === 0) return;

    // Salvar mensagem no banco de memoria
    irisDB.saveMessage(conversationId, 'inbound', body, {
      contactId: message.contactId,
      isAudio: message.isAudio,
      audioUrl: message.audioUrl,
      messageType: message.messageType,
      ghlMessageId: message.id,
    });

    // Salvar no Nico Monitor (Instagram DB)
    const contactName = conversation?.contact_name || message.from || 'Desconhecido';
    saveToMonitor(conversationId, contactName, body, 'inbound', {
      contactId: message.contactId,
      isAudio: message.isAudio,
      audioUrl: message.audioUrl,
      ghlMessageId: message.id,
      timestamp: message.dateAdded ? new Date(message.dateAdded).getTime() : Date.now(),
    });

    let prospect = irisDB.getProspect(conversationId);

    if (!prospect) {
      const msgResult = await ghlAPI.getConversationMessages(conversationId, { limit: MAX_AUTO_DETECT_MESSAGES + 1 });
      const msgCount = msgResult.data ? msgResult.data.length : 0;

      if (msgCount > MAX_AUTO_DETECT_MESSAGES) {
        return;
      }

      const contactName = conversation?.contact_name || message.from || 'Desconhecido';
      const contactId = message.contactId || conversation?.contact_id || null;
      irisDB.enrollProspect(conversationId, contactName, 'aquecimento', contactId);
      prospect = irisDB.getProspect(conversationId);
      console.log(`🌸 Iris: auto-enrolled prospect ${contactName} (${conversationId})`);

      await irisTelegram.sendMessage(APPROVAL_CHAT_ID,
        `🆕 Novo prospect detectado\n\nNome: ${contactName}\nMsg: "${body.substring(0, 100)}"\n${message.isAudio ? '🎙️ (audio transcrito)\n' : ''}\n✅ Iris vai gerar resposta e pedir sua aprovação`
      );
    }

    if (prospect.status !== 'active') return;

    irisDB.updateProspectTimestamp(conversationId, 'inbound');

    // Cancelar nudge 👀 pendente (lead respondeu)
    if (nudgeTimers.has(conversationId)) {
      clearTimeout(nudgeTimers.get(conversationId));
      nudgeTimers.delete(conversationId);
    }
    nudgeSent.delete(conversationId);

    if (debounceTimers.has(conversationId)) {
      clearTimeout(debounceTimers.get(conversationId));
    }

    debounceTimers.set(
      conversationId,
      setTimeout(() => {
        debounceTimers.delete(conversationId);
        processAfterDebounce(conversationId).catch((err) => {
          console.error('🌸 Iris: erro no processamento debounced:', err.message);
        });
      }, DEBOUNCE_MS)
    );
  } catch (error) {
    console.error('🌸 Iris: erro ao processar mensagem inbound:', error.message);
  }
}

/**
 * Processamento apos debounce: classifica, gera resposta como Eric, decide envio
 */
async function processAfterDebounce(conversationId) {
  try {
    const prospect = irisDB.getProspect(conversationId);
    if (!prospect || prospect.status !== 'active') return;

    // Buscar historico COMPLETO da API GHL (50 msgs para contexto total)
    const msgResult = await ghlAPI.getConversationMessages(conversationId, { limit: 50 });
    const messages = (msgResult.data || []).reverse();

    if (messages.length === 0) return;

    const lastInbound = messages.filter((m) => m.direction === 'inbound').pop();
    if (!lastInbound) return;
    if (!lastInbound.body && lastInbound.message) lastInbound.body = lastInbound.message;

    // Buscar perfil do lead (se ja temos)
    let leadProfile = irisDB.getLeadProfile(conversationId);

    // Verificar se lead enviou número de WhatsApp
    const whatsappCheck = await checkWhatsAppTransition(
      conversationId, lastInbound.body, prospect.current_stage
    );
    if (whatsappCheck.detected) {
      console.log(`🌸 Iris [${prospect.contact_name}]: WhatsApp detectado (${whatsappCheck.phoneNumber}), migrado para Stevo`);
      return; // Fluxo continua via WhatsApp
    }

    // Classificar etapa via AI (com contexto do lead)
    const classification = await irisGroq.classifyStage(messages, prospect.current_stage, {
      contactName: prospect.contact_name,
      nicho: leadProfile?.nicho,
      dores: leadProfile?.dores?.join(', '),
    });
    console.log(`🌸 Iris [${prospect.contact_name}]: classificacao:`, classification);

    // Se confidence baixa, marcar como baixa mas continuar gerando resposta com aprovação
    const lowConfidence = classification.confidence < 0.4;
    if (lowConfidence) {
      console.log(`🌸 Iris: confidence baixa (${classification.confidence}), vai gerar resposta mas pedir aprovação`);
    }

    // Atualizar perfil do lead com analise AI (a cada 3 mensagens ou se nao tem)
    if (!leadProfile || prospect.message_count % 3 === 0) {
      try {
        const analysis = await irisGroq.analyzeLeadProfile(messages, prospect.contact_name);
        if (analysis) {
          analysis.contactName = prospect.contact_name;
          irisDB.saveLeadProfile(conversationId, analysis);
          leadProfile = irisDB.getLeadProfile(conversationId);
          console.log(`🌸 Iris: perfil atualizado para ${prospect.contact_name}:`, analysis.resumo);
        }
      } catch (err) {
        console.error('🌸 Iris: erro ao analisar perfil:', err.message);
      }
    }

    // Salvar dor identificada pela classificacao
    if (classification.dor_identificada && leadProfile) {
      const dores = leadProfile.dores || [];
      if (!dores.includes(classification.dor_identificada)) {
        dores.push(classification.dor_identificada);
        irisDB.saveLeadProfile(conversationId, { ...leadProfile, dores, contactName: prospect.contact_name });
      }
    }

    // Selecionar script guia
    const selected = irisScripts.selectScript(
      classification.stage,
      classification.variant,
      prospect.scripts_used || []
    );

    if (!selected) {
      console.log(`🌸 Iris: nenhum script encontrado para ${classification.stage}`);
      return;
    }

    // Gerar resposta como Eric (usando contexto completo)
    const memoryContext = leadProfile
      ? `Nicho: ${leadProfile.nicho || '?'}, Dores: ${(leadProfile.dores || []).join(', ') || 'nenhuma'}, Interesse: ${leadProfile.nivel_interesse || '?'}, Resumo: ${leadProfile.resumo || '?'}`
      : null;

    const chunks = await irisGroq.generateResponse(classification.stage, classification.variant, {
      contactName: prospect.contact_name,
      lastMessage: lastInbound.body,
      messageHistory: messages,
      leadProfile: leadProfile ? leadProfile.resumo : null,
      memoryContext,
      dorIdentificada: classification.dor_identificada,
      contextoAnterior: classification.contexto_anterior,
    });

    if (!chunks || chunks.length === 0) {
      console.log(`🌸 Iris: falha ao gerar resposta para ${prospect.contact_name}`);
      return;
    }

    // Salvar aprovacao
    const approval = irisDB.createApproval(conversationId, chunks, classification.stage, selected.id);
    if (!approval.success) {
      console.error('🌸 Iris: falha ao criar aprovacao:', approval.error);
      return;
    }

    // Atualizar stage
    irisDB.updateProspectStage(conversationId, classification.stage, classification.variant, selected.id);

    // Sync pipeline GHL (async, nao bloqueia)
    if (irisPipeline.isConfigured()) {
      irisPipeline.syncStage(conversationId, classification.stage).catch((err) => {
        console.error('🌸 Iris: erro ao sincronizar pipeline:', err.message);
      });
    }

    // Decidir: autonomo ou aprovacao
    const isAutonomous = operationMode === 'hunter' && irisScripts.AUTONOMOUS_STAGES.includes(classification.stage);

    if (isAutonomous) {
      console.log(`🌸 Iris [HUNTER]: enviando como Eric para ${prospect.contact_name} [${classification.stage}]`);

      irisDB.resolveApproval(approval.id, 'auto_approved');
      const results = await sendApprovedMessages(conversationId, chunks, approval.id);

      // Salvar mensagens outbound na memoria e monitor
      for (const chunk of chunks) {
        irisDB.saveMessage(conversationId, 'outbound', chunk, { contactId: prospect.contact_id });
        saveToMonitor(conversationId, prospect.contact_name, chunk, 'outbound', { contactId: prospect.contact_id });
      }

      const chunksPreview = chunks.map((c, i) => `  ${i + 1}. "${c.substring(0, 80)}${c.length > 80 ? '...' : ''}"`).join('\n');
      const successCount = results.filter((r) => r.success).length;

      const dorInfo = classification.dor_identificada ? `\nDor: ${classification.dor_identificada}` : '';
      const proximo = classification.proximo_passo ? `\nProximo: ${classification.proximo_passo}` : '';

      await irisTelegram.sendMessage(APPROVAL_CHAT_ID,
        `🌸 Iris enviou como Eric\n\n` +
        `Lead: ${prospect.contact_name}\n` +
        `Etapa: ${classification.stage.toUpperCase()}${dorInfo}${proximo}\n` +
        `Status: ${successCount}/${chunks.length} enviados\n\n` +
        `Mensagens:\n${chunksPreview}`
      );
    } else {
      console.log(`🌸 Iris [APPROVAL]: pedindo aprovacao para ${prospect.contact_name} [${classification.stage}]`);

      const dorInfo = classification.dor_identificada ? `\nDor identificada: ${classification.dor_identificada}` : '';
      const profileInfo = leadProfile?.resumo ? `\nPerfil: ${leadProfile.resumo}` : '';
      const confidenceWarning = lowConfidence ? `\n⚠️ CONFIDENCE BAIXA (${(classification.confidence * 100).toFixed(0)}%) — revise com atenção` : '';

      const tgResult = await irisTelegram.sendApprovalRequest(APPROVAL_CHAT_ID, {
        approvalId: approval.id,
        contactName: prospect.contact_name,
        stage: classification.stage,
        chunks,
        lastMessage: lastInbound.body,
        conversationId,
        extraInfo: `${dorInfo}${profileInfo}${confidenceWarning}`,
      });

      if (tgResult.ok && tgResult.result) {
        irisDB.setApprovalTelegramId(approval.id, tgResult.result.message_id);
      }

      console.log(`🌸 Iris: aprovacao #${approval.id} enviada para Telegram`);
    }
  } catch (error) {
    console.error('🌸 Iris: erro no processamento pos-debounce:', error.message);
    // Propagar erro 429 para que o poller saiba re-tentar
    if (error.message && error.message.includes('429')) {
      throw error;
    }
  }
}

/**
 * Envia mensagens para o GHL com delay humano entre chunks
 */
async function sendApprovedMessages(conversationId, chunks, approvalId) {
  const results = [];

  const prospect = irisDB.getProspect(conversationId);
  let contactId = prospect?.contact_id;

  if (!contactId) {
    try {
      const convDetails = await ghlAPI.getConversationDetails(conversationId);
      if (convDetails.success && convDetails.data?.contactId) {
        contactId = convDetails.data.contactId;
        irisDB.enrollProspect(conversationId, prospect?.contact_name, prospect?.current_stage, contactId);
      }
    } catch (err) {
      console.error('🌸 Iris: erro ao buscar contactId:', err.message);
    }
  }

  if (!contactId) {
    console.error(`🌸 Iris: contactId nao encontrado para conversa ${conversationId}`);
    return [{ success: false, error: 'contactId nao encontrado' }];
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      const result = await ghlAPI.sendMessage(contactId, chunk, 'IG');
      results.push(result);

      irisDB.logSentMessage(conversationId, approvalId, chunk, i, null, result);
      console.log(`🌸 Iris: chunk ${i + 1}/${chunks.length} enviado (contact: ${contactId})`);

      if (i < chunks.length - 1) {
        const nextChunk = chunks[i + 1];
        const delay = calculateTypingDelay(nextChunk);
        console.log(`🌸 Iris: aguardando ${(delay / 1000).toFixed(1)}s antes do proximo chunk (${nextChunk.length} chars)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`🌸 Iris: erro ao enviar chunk ${i + 1}:`, error.message);
      results.push({ success: false, error: error.message });
    }
  }

  irisDB.updateProspectTimestamp(conversationId, 'outbound');

  // Agendar nudge 👀 para 10-15 min (se lead nao responder)
  scheduleNudge(conversationId, contactId);

  return results;
}

/**
 * Agenda envio de 👀 caso o lead nao responda em 10-15 min
 * So envia 1 vez por ciclo de conversa (reset quando lead responde)
 */
function scheduleNudge(conversationId, contactId) {
  // Cancelar timer anterior se existir
  if (nudgeTimers.has(conversationId)) {
    clearTimeout(nudgeTimers.get(conversationId));
  }

  // Se ja mandou 👀 nesse ciclo, nao mandar de novo
  if (nudgeSent.has(conversationId)) return;

  const delay = NUDGE_DELAY_MIN + Math.random() * (NUDGE_DELAY_MAX - NUDGE_DELAY_MIN);

  const timer = setTimeout(async () => {
    nudgeTimers.delete(conversationId);

    // Verificar se lead respondeu nesse meio tempo
    const prospect = irisDB.getProspect(conversationId);
    if (!prospect || prospect.status !== 'active') return;

    const lastInbound = prospect.last_inbound_at ? new Date(prospect.last_inbound_at).getTime() : 0;
    const lastOutbound = prospect.last_outbound_at ? new Date(prospect.last_outbound_at).getTime() : 0;

    // So enviar se a ultima msg foi outbound (lead nao respondeu)
    if (lastInbound >= lastOutbound) return;

    // So enviar se a conversa teve interacao recente (nao mandar 👀 pra leads frios)
    const timeSinceOutbound = Date.now() - lastOutbound;
    if (timeSinceOutbound > 20 * 60 * 1000) return; // mais de 20 min = algo deu errado, nao enviar

    try {
      const cId = contactId || prospect.contact_id;
      if (!cId) return;

      await ghlAPI.sendMessage(cId, NUDGE_EMOJI, 'IG');
      nudgeSent.add(conversationId);

      irisDB.saveMessage(conversationId, 'outbound', NUDGE_EMOJI, { contactId: cId });
      irisDB.updateProspectTimestamp(conversationId, 'outbound');
      saveToMonitor(conversationId, prospect.contact_name, NUDGE_EMOJI, 'outbound', { contactId: cId });

      console.log(`🌸 Iris: ${NUDGE_EMOJI} enviado para ${prospect.contact_name} (${(delay / 1000 / 60).toFixed(0)} min sem resposta)`);
    } catch (err) {
      console.error(`🌸 Iris: erro ao enviar nudge para ${prospect?.contact_name}:`, err.message);
    }
  }, delay);

  nudgeTimers.set(conversationId, timer);
  console.log(`🌸 Iris: nudge ${NUDGE_EMOJI} agendado para ${(delay / 1000 / 60).toFixed(0)} min (conv: ${conversationId.substring(0, 12)}...)`);
}

/**
 * Processa callback de aprovacao do Telegram
 */
async function handleApprovalCallback(action, approvalId, callbackQueryId, chatId, messageId) {
  const approval = irisDB.getPendingApproval(approvalId);
  if (!approval) {
    await irisTelegram.answerCallbackQuery(callbackQueryId, 'Aprovacao nao encontrada');
    return;
  }

  const prospect = irisDB.getProspect(approval.conversation_id);
  const contactName = prospect?.contact_name || 'Desconhecido';

  if (action === 'approve') {
    irisDB.resolveApproval(approvalId, 'approved');
    await irisTelegram.answerCallbackQuery(callbackQueryId, 'Aprovado! Enviando...');
    await irisTelegram.updateApprovalMessage(chatId, messageId, 'approved', contactName);

    await sendApprovedMessages(approval.conversation_id, approval.chunks, approvalId);

    // Salvar na memoria e monitor
    for (const chunk of approval.chunks) {
      irisDB.saveMessage(approval.conversation_id, 'outbound', chunk, { contactId: prospect?.contact_id });
      saveToMonitor(approval.conversation_id, contactName, chunk, 'outbound', { contactId: prospect?.contact_id });
    }

    // Feedback positivo: aprovado sem editar
    irisDB.saveFeedback(
      approval.conversation_id, 'approval',
      approval.chunks.join('\n\n'), null,
      approval.stage, { action: 'approved_as_is' }
    );

    await irisTelegram.updateApprovalMessage(chatId, messageId, 'sent', contactName);

  } else if (action === 'edit') {
    editingApprovals.set(chatId.toString(), { approvalId, conversationId: approval.conversation_id, stage: approval.stage });
    await irisTelegram.answerCallbackQuery(callbackQueryId, 'Envie o texto editado');
    await irisTelegram.updateApprovalMessage(chatId, messageId, 'editing', contactName);

  } else if (action === 'reject') {
    irisDB.resolveApproval(approvalId, 'rejected');
    await irisTelegram.answerCallbackQuery(callbackQueryId, 'Rejeitado');
    await irisTelegram.updateApprovalMessage(chatId, messageId, 'rejected', contactName);

    // Feedback negativo: rejeitado
    irisDB.saveFeedback(
      approval.conversation_id, 'rejection',
      approval.chunks.join('\n\n'), null,
      approval.stage, { action: 'rejected' }
    );

  } else if (action === 'disqualify') {
    // Desqualificar lead: parar todo processamento
    irisDB.resolveApproval(approvalId, 'rejected');
    irisDB.setProspectStatus(approval.conversation_id, 'disqualified');

    await irisTelegram.answerCallbackQuery(callbackQueryId, 'Lead desqualificado');
    await irisTelegram.editMessageText(chatId, messageId,
      `🚫 DESQUALIFICADO\n\nLead: ${contactName}\nMotivo: Desqualificado manualmente pelo Eric\nIris não enviará mais mensagens para este lead.`
    );

    // Cancelar todas as aprovações pendentes deste lead
    const pendingApprovals = irisDB.getPendingApprovals();
    for (const pa of pendingApprovals) {
      if (pa.conversation_id === approval.conversation_id && pa.id !== approvalId) {
        irisDB.resolveApproval(pa.id, 'rejected');
      }
    }

    console.log(`🚫 Iris: Lead ${contactName} desqualificado manualmente`);
  }
}

async function handleEditedText(chatId, text) {
  const key = chatId.toString();
  const editing = editingApprovals.get(key);
  if (!editing) return false;

  editingApprovals.delete(key);

  const chunks = text.split(/\n\s*\n/).filter((c) => c.trim());
  const finalChunks = chunks.length > 0 ? chunks : [text];

  // Buscar original para feedback
  const originalApproval = irisDB.getPendingApproval(editing.approvalId);
  const originalText = originalApproval ? originalApproval.chunks.join('\n\n') : '';

  irisDB.resolveApproval(editing.approvalId, 'approved', finalChunks);
  await sendApprovedMessages(editing.conversationId, finalChunks, editing.approvalId);

  // Feedback de edicao: salvar original vs editado
  irisDB.saveFeedback(
    editing.conversationId, 'approval_edit',
    originalText, finalChunks.join('\n\n'),
    editing.stage || 'unknown', { action: 'edited' }
  );

  const editProspect = irisDB.getProspect(editing.conversationId);
  for (const chunk of finalChunks) {
    irisDB.saveMessage(editing.conversationId, 'outbound', chunk);
    saveToMonitor(editing.conversationId, editProspect?.contact_name || 'Lead', chunk, 'outbound');
  }

  await irisTelegram.sendMessage(chatId, `✅ Mensagem editada enviada (${finalChunks.length} chunk${finalChunks.length > 1 ? 's' : ''})`);

  return true;
}

function isEditingMode(chatId) {
  return editingApprovals.has(chatId.toString());
}

function enrollManual(conversationId, contactName, stage = 'aquecimento') {
  return irisDB.enrollProspect(conversationId, contactName, stage);
}

function checkFollowups() {
  const prospects = irisDB.getActiveProspects();
  const now = Date.now();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const needFollowup = [];

  for (const p of prospects) {
    if (!p.last_outbound_at) continue;
    const lastOutbound = new Date(p.last_outbound_at).getTime();
    const lastInbound = p.last_inbound_at ? new Date(p.last_inbound_at).getTime() : 0;
    const silenceDays = now - lastOutbound;

    if (silenceDays > threeDays && lastInbound < lastOutbound) {
      const variant = silenceDays > sevenDays ? '7dias' : '3dias';
      needFollowup.push({ ...p, suggestedVariant: variant, silenceDays: Math.floor(silenceDays / (24 * 60 * 60 * 1000)) });
    }
  }

  return needFollowup;
}

async function executeFollowup(conversationId) {
  const prospect = irisDB.getProspect(conversationId);
  if (!prospect || prospect.status !== 'active') return { success: false, error: 'Prospect nao ativo' };

  const now = Date.now();
  const lastOutbound = prospect.last_outbound_at ? new Date(prospect.last_outbound_at).getTime() : 0;
  const silenceDays = Math.floor((now - lastOutbound) / (24 * 60 * 60 * 1000));
  const variant = silenceDays >= 7 ? '7dias' : '3dias';

  const selected = irisScripts.selectScript('followup', variant, prospect.scripts_used || []);
  if (!selected) return { success: false, error: 'Sem script de followup disponivel' };

  // Buscar histórico da conversa para contexto do followup
  const msgResult = await ghlAPI.getConversationMessages(conversationId, { limit: 50 });
  const messages = (msgResult.data || []).reverse();

  // Gerar followup como Eric
  const leadProfile = irisDB.getLeadProfile(conversationId);
  const chunks = await irisGroq.generateResponse('followup', variant, {
    contactName: prospect.contact_name,
    lastMessage: '',
    messageHistory: messages,
    leadProfile: leadProfile?.resumo,
    memoryContext: leadProfile ? `Dores: ${(leadProfile.dores || []).join(', ')}` : null,
  });

  if (!chunks) return { success: false, error: 'Falha ao gerar followup' };

  const approval = irisDB.createApproval(conversationId, chunks, 'followup', selected.id);
  if (!approval.success) return { success: false, error: approval.error };

  irisDB.updateProspectStage(conversationId, 'followup', variant, selected.id);

  // Sync pipeline GHL
  if (irisPipeline.isConfigured()) {
    irisPipeline.syncStage(conversationId, 'followup').catch(() => {});
  }

  if (operationMode === 'hunter') {
    irisDB.resolveApproval(approval.id, 'auto_approved');
    const results = await sendApprovedMessages(conversationId, chunks, approval.id);

    for (const chunk of chunks) {
      irisDB.saveMessage(conversationId, 'outbound', chunk, { contactId: prospect.contact_id });
      saveToMonitor(conversationId, prospect.contact_name, chunk, 'outbound', { contactId: prospect.contact_id });
    }

    await irisTelegram.sendMessage(APPROVAL_CHAT_ID,
      `🔔 Followup enviado como Eric\n\nLead: ${prospect.contact_name}\nSilencio: ${silenceDays} dias\n\nMensagem: "${chunks[0].substring(0, 100)}..."`
    );

    return { success: true, sent: results.length };
  } else {
    const tgResult = await irisTelegram.sendApprovalRequest(APPROVAL_CHAT_ID, {
      approvalId: approval.id,
      contactName: prospect.contact_name,
      stage: 'followup',
      chunks,
      lastMessage: `(silencio de ${silenceDays} dias)`,
      conversationId,
    });

    if (tgResult.ok && tgResult.result) {
      irisDB.setApprovalTelegramId(approval.id, tgResult.result.message_id);
    }

    return { success: true, pendingApproval: true };
  }
}

async function executeAllFollowups() {
  const prospects = checkFollowups();
  const results = [];

  for (const p of prospects) {
    try {
      const result = await executeFollowup(p.conversation_id);
      results.push({ conversationId: p.conversation_id, contactName: p.contact_name, ...result });
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error) {
      results.push({ conversationId: p.conversation_id, success: false, error: error.message });
    }
  }

  return results;
}

function setMode(mode) {
  if (['hunter', 'supervised'].includes(mode)) {
    operationMode = mode;
    console.log(`🌸 Iris: modo alterado para ${mode}`);
    return true;
  }
  return false;
}

function getMode() {
  return operationMode;
}

/**
 * Scan completo: scoring, relatorio, followups automaticos
 * Roda nos horarios agendados (9h, 13h, 17h)
 */
async function scanAndPrioritize() {
  try {
    const scored = irisLeadScorer.scoreAllProspects();
    if (scored.length === 0) return { hot: [], warm: [], cold: [], total: 0 };

    const hot = scored.filter((l) => l.tier === 'hot');
    const warm = scored.filter((l) => l.tier === 'warm');
    const cold = scored.filter((l) => l.tier === 'cold');

    // Gerar relatorio para Telegram
    const lines = [];
    lines.push(`📊 SCAN DE LEADS (${scored.length} ativos)\n`);

    if (hot.length > 0) {
      lines.push('🔥 LEADS QUENTES (acao imediata):');
      for (const l of hot.slice(0, 5)) {
        const dorInfo = l.profile?.dores?.length > 0 ? `, dor: ${l.profile.dores[0]}` : '';
        lines.push(`  ${l.contactName} (score ${l.score}) - ${l.currentStage}${dorInfo}`);
      }
      lines.push('');
    }

    if (warm.length > 0) {
      lines.push('🟡 WARM (acompanhar):');
      for (const l of warm.slice(0, 5)) {
        const silence = l.lastOutbound ? Math.floor((Date.now() - new Date(l.lastOutbound).getTime()) / (24 * 60 * 60 * 1000)) : '?';
        lines.push(`  ${l.contactName} (score ${l.score}) - ${silence}d sem responder`);
      }
      lines.push('');
    }

    if (cold.length > 0) {
      lines.push('🔵 COLD (followup leve):');
      for (const l of cold.slice(0, 3)) {
        const silence = l.lastOutbound ? Math.floor((Date.now() - new Date(l.lastOutbound).getTime()) / (24 * 60 * 60 * 1000)) : '?';
        lines.push(`  ${l.contactName} (score ${l.score}) - ${silence}d de silencio`);
      }
    }

    await irisTelegram.sendMessage(APPROVAL_CHAT_ID, lines.join('\n'));

    // Followups automaticos para leads HOT sem resposta >1 dia
    const followupPriorities = irisLeadScorer.getFollowupPriorities();
    const autoFollowups = followupPriorities.filter((f) => f.action === 'auto_followup');

    if (autoFollowups.length > 0 && operationMode === 'hunter') {
      for (const lead of autoFollowups.slice(0, 3)) {
        try {
          await executeFollowup(lead.conversationId);
          await new Promise((resolve) => setTimeout(resolve, 10000));
        } catch (err) {
          console.error(`🌸 Iris: erro followup auto ${lead.contactName}:`, err.message);
        }
      }
    }

    // Leads COLD >7 dias: marcar como perdido apos 3+ followups sem resposta
    for (const lead of cold) {
      if (!lead.lastOutbound) continue;
      const silenceDays = Math.floor((Date.now() - new Date(lead.lastOutbound).getTime()) / (24 * 60 * 60 * 1000));
      const prospect = irisDB.getProspect(lead.conversationId);
      const followupScripts = (prospect?.scripts_used || []).filter((s) => s.startsWith('followup'));

      if (silenceDays > 14 && followupScripts.length >= 3) {
        irisDB.setProspectStatus(lead.conversationId, 'lost');
        if (irisPipeline.isConfigured()) {
          irisPipeline.markAsLost(lead.conversationId).catch(() => {});
        }
        console.log(`🌸 Iris: ${lead.contactName} marcado como PERDIDO (${silenceDays}d silencio, ${followupScripts.length} followups)`);
      }
    }

    return { hot, warm, cold, total: scored.length };
  } catch (error) {
    console.error('🌸 Iris: erro no scanAndPrioritize:', error.message);
    return { hot: [], warm: [], cold: [], total: 0, error: error.message };
  }
}

/**
 * Scan de conversas no GHL que nao estao enrolled na Iris
 * Busca conversas Instagram recentes e auto-enrolla se fizer sentido
 */
async function scanGHLConversations() {
  try {
    const convResult = await ghlAPI.getConversations({
      limit: 20,
      sortBy: 'last_message_date',
      sortOrder: 'desc',
    });

    if (!convResult.success) return { found: 0, enrolled: 0 };

    const conversations = convResult.data || [];
    const newLeads = [];

    for (const conv of conversations) {
      // Filtrar: apenas Instagram, com mensagem inbound recente
      if (conv.type !== 'TYPE_INSTAGRAM' && conv.type !== 'Instagram') continue;
      if (conv.lastMessageDirection !== 'inbound') continue;

      const conversationId = conv.id;
      const existing = irisDB.getProspect(conversationId);
      if (existing) continue;

      // Verificar quantidade de mensagens (< 20 para auto-enroll)
      const msgResult = await ghlAPI.getConversationMessages(conversationId, { limit: 21 });
      const msgCount = msgResult.data ? msgResult.data.length : 0;
      if (msgCount > MAX_AUTO_DETECT_MESSAGES) continue;

      const contactName = conv.contactName || conv.fullName || 'Desconhecido';
      const contactId = conv.contactId || null;

      irisDB.enrollProspect(conversationId, contactName, 'aquecimento', contactId);
      newLeads.push({ conversationId, contactName, msgCount });

      // Sync pipeline
      if (irisPipeline.isConfigured() && contactId) {
        irisPipeline.syncStage(conversationId, 'aquecimento').catch(() => {});
      }

      console.log(`🌸 Iris: auto-enrolled via scan: ${contactName} (${msgCount} msgs)`);
    }

    if (newLeads.length > 0) {
      const list = newLeads.map((l) => `  - ${l.contactName} (${l.msgCount} msgs)`).join('\n');
      await irisTelegram.sendMessage(APPROVAL_CHAT_ID,
        `🔍 Scan GHL: ${newLeads.length} novos leads encontrados\n\n${list}\n\nIris acompanhando automaticamente.`
      );
    }

    return { found: conversations.length, enrolled: newLeads.length, newLeads };
  } catch (error) {
    console.error('🌸 Iris: erro no scanGHLConversations:', error.message);
    return { found: 0, enrolled: 0, error: error.message };
  }
}

/**
 * Gera resumo diario: msgs enviadas, leads avancados, conversoes
 */
async function generateDailySummary() {
  try {
    const stats = irisDB.getStats();
    const scored = irisLeadScorer.scoreAllProspects();
    const hot = scored.filter((l) => l.tier === 'hot').length;
    const warm = scored.filter((l) => l.tier === 'warm').length;
    const cold = scored.filter((l) => l.tier === 'cold').length;

    const summary = [
      '📋 RESUMO DO DIA\n',
      `Prospects ativos: ${stats.active}`,
      `Mensagens enviadas (total): ${stats.sent}`,
      `Aprovacoes pendentes: ${stats.pending}`,
      `Feedbacks coletados: ${stats.feedbackCount}`,
      `Regras aprendidas: ${stats.learningCount}`,
      '',
      `🔥 Hot: ${hot} | 🟡 Warm: ${warm} | 🔵 Cold: ${cold}`,
      '',
      `Modo: ${operationMode === 'hunter' ? '🟢 HUNTER' : '🟡 SUPERVISED'}`,
    ];

    await irisTelegram.sendMessage(APPROVAL_CHAT_ID, summary.join('\n'));
    return { success: true };
  } catch (error) {
    console.error('🌸 Iris: erro no resumo diario:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Analisa feedbacks acumulados e extrai regras de aprendizado via Groq
 */
async function analyzeFeedbackPatterns() {
  try {
    const feedbackCount = irisDB.getFeedbackCount();
    if (feedbackCount < 10) return { success: false, reason: 'Menos de 10 feedbacks' };

    const feedbacks = irisDB.getAllFeedback(30);
    const edits = feedbacks.filter((f) => f.type === 'approval_edit');
    const rejections = feedbacks.filter((f) => f.type === 'rejection');

    if (edits.length + rejections.length < 5) return { success: false, reason: 'Poucos feedbacks de correcao' };

    const feedbackText = [];
    for (const edit of edits.slice(0, 10)) {
      feedbackText.push(`[EDITADO] Stage: ${edit.stage}\nOriginal: "${edit.original_text?.substring(0, 200)}"\nEditado: "${edit.edited_text?.substring(0, 200)}"`);
    }
    for (const rej of rejections.slice(0, 5)) {
      feedbackText.push(`[REJEITADO] Stage: ${rej.stage}\nTexto: "${rej.original_text?.substring(0, 200)}"`);
    }

    const rules = await irisGroq.analyzeFeedback(feedbackText.join('\n\n'));
    if (rules && rules.length > 0) {
      for (const rule of rules) {
        irisDB.saveLearningRule(rule.category, rule.rule, 'feedback_analysis', rule.confidence || 0.6);
      }
      console.log(`🌸 Iris: ${rules.length} regras aprendidas dos feedbacks`);
    }

    return { success: true, rulesLearned: rules?.length || 0 };
  } catch (error) {
    console.error('🌸 Iris: erro ao analisar feedbacks:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================
// Reativação de Leads Inativos
// Varredura a cada 30 min: encontra leads sem resposta e reenvia
// ============================================================

let reactivationInterval = null;
let reactivationActive = false;

/**
 * Busca TODAS as conversas do Instagram direto no GHL
 * e identifica quais ficaram sem resposta do Eric
 *
 * Vai além do banco local da Iris — olha o GHL real
 *
 * @returns {Promise<Array>} Lista de leads com contexto para reativação
 */
async function findLeadsToReactivate() {
  const leads = [];

  try {
    // Buscar conversas do GHL — pegar o máximo possível
    // Fazemos múltiplas páginas se necessário
    let allConversations = [];
    let hasMore = true;
    let lastId = null;

    // Buscar até 100 conversas (5 páginas de 20)
    for (let page = 0; page < 5 && hasMore; page++) {
      const params = {
        limit: 20,
        sortBy: 'last_message_date',
        sortOrder: 'desc',
      };
      if (lastId) params.startAfterId = lastId;

      const convResult = await ghlAPI.getConversations(params);
      if (!convResult.success || !convResult.data?.length) break;

      allConversations = allConversations.concat(convResult.data);
      hasMore = convResult.data.length === 20;
      lastId = convResult.data[convResult.data.length - 1]?.id;

      // Delay entre páginas para não estourar rate limit
      if (hasMore) await new Promise((r) => setTimeout(r, 500));
    }

    console.log(`🔄 Iris Reativação: ${allConversations.length} conversas encontradas no GHL`);

    // Filtrar apenas conversas do Instagram
    // GHL usa type=TYPE_PHONE mas lastMessageType=TYPE_INSTAGRAM para conversas do IG
    const igConversations = allConversations.filter((c) => {
      const convType = (c.type || '').toUpperCase();
      const msgType = (c.lastMessageType || '').toUpperCase();
      return convType.includes('INSTAGRAM') || msgType.includes('INSTAGRAM');
    });

    console.log(`🔄 Iris Reativação: ${igConversations.length} conversas do Instagram`);

    // Para cada conversa, verificar se a última mensagem é inbound (lead não foi respondido)
    for (const conv of igConversations) {
      try {
        const conversationId = conv.id;
        const contactName = conv.contactName || conv.fullName || 'Desconhecido';
        const contactId = conv.contactId || null;

        // Buscar últimas mensagens dessa conversa
        const msgResult = await ghlAPI.getConversationMessages(conversationId, { limit: 5 });
        const messages = msgResult.data || [];

        if (messages.length === 0) continue;

        // Mensagens vêm do mais recente pro mais antigo
        const lastMsg = messages[0];
        const lastDirection = lastMsg.direction;
        const lastMsgDate = lastMsg.dateAdded ? new Date(lastMsg.dateAdded).getTime() : 0;

        if (lastMsgDate === 0) continue;

        const now = Date.now();
        const silenceMs = now - lastMsgDate;
        const silenceDays = Math.floor(silenceMs / (24 * 60 * 60 * 1000));

        // CASO 1: Última mensagem é INBOUND (lead mandou, nós não respondemos)
        if (lastDirection === 'inbound' && silenceMs > 1 * 24 * 60 * 60 * 1000) {
          leads.push({
            conversation_id: conversationId,
            contact_name: contactName,
            contact_id: contactId,
            current_stage: irisDB.getProspect(conversationId)?.current_stage || 'desconhecido',
            reason: 'nao_respondido',
            silenceDays,
            priority: 1,
            lastMessage: (lastMsg.body || '').substring(0, 100),
            status: irisDB.getProspect(conversationId)?.status || 'novo',
          });
          continue;
        }

        // CASO 2: Última mensagem é OUTBOUND mas lead nunca respondeu (>3 dias)
        if (lastDirection === 'outbound' && silenceMs > 3 * 24 * 60 * 60 * 1000) {
          // Verificar se lead já respondeu alguma vez
          const hasInbound = messages.some((m) => m.direction === 'inbound');
          if (hasInbound) {
            leads.push({
              conversation_id: conversationId,
              contact_name: contactName,
              contact_id: contactId,
              current_stage: irisDB.getProspect(conversationId)?.current_stage || 'desconhecido',
              reason: 'silencio_mutuo',
              silenceDays,
              priority: 2,
              lastMessage: (lastMsg.body || '').substring(0, 100),
              status: irisDB.getProspect(conversationId)?.status || 'novo',
            });
          }
        }

        // Delay entre conversas para rate limit
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        // Pular conversas com erro silenciosamente
        continue;
      }
    }
  } catch (error) {
    console.error('🔄 Iris Reativação: erro ao buscar conversas GHL:', error.message);
  }

  // Ordenar: prioridade (menor = mais urgente), depois silenceDays (menor = mais recente)
  leads.sort((a, b) => a.priority - b.priority || a.silenceDays - b.silenceDays);

  console.log(`🔄 Iris Reativação: ${leads.length} leads precisam de reativação`);
  return leads;
}

/**
 * Reativa UM lead específico: gera mensagem personalizada e envia para aprovação
 * Se o lead não está cadastrado na Iris, faz enroll automático
 *
 * @param {Object} prospect - Dados do lead (pode vir do GHL direto)
 * @returns {Promise<{success: boolean, action?: string, error?: string}>}
 */
async function reactivateLead(prospect) {
  const conversationId = prospect.conversation_id;
  const contactId = prospect.contact_id;

  if (!contactId) return { success: false, error: 'Sem contact_id' };

  try {
    // Se o lead ainda não está cadastrado na Iris, enroll agora
    let existingProspect = irisDB.getProspect(conversationId);
    if (!existingProspect) {
      irisDB.enrollProspect(conversationId, prospect.contact_name, 'followup', contactId);
      existingProspect = irisDB.getProspect(conversationId);
      console.log(`🔄 Iris Reativação: auto-enrolled ${prospect.contact_name}`);
    }

    // Buscar histórico completo para contexto
    const msgResult = await ghlAPI.getConversationMessages(conversationId, { limit: 50 });
    const messages = (msgResult.data || []).reverse();

    // Buscar perfil do lead (pode não existir se é novo)
    const leadProfile = irisDB.getLeadProfile(conversationId);

    // Gerar mensagem de reativação via Groq
    const chunks = await irisGroq.generateReactivation({
      contactName: prospect.contact_name,
      messageHistory: messages,
      lastStage: prospect.current_stage || 'desconhecido',
      silenceDays: prospect.silenceDays || 0,
      leadProfile,
    });

    if (!chunks || chunks.length === 0) {
      return { success: false, error: 'Falha ao gerar mensagem de reativação' };
    }

    // Criar aprovação (reativação SEMPRE pede aprovação no Telegram)
    const approval = irisDB.createApproval(conversationId, chunks, 'reativacao', 'reativacao_auto');
    if (!approval.success) return { success: false, error: approval.error };

    // Se lead estava "lost", reativar como "active"
    if (existingProspect?.status === 'lost') {
      irisDB.setProspectStatus(conversationId, 'active');
    }

    // Enviar para aprovação no Telegram
    const reasonText = {
      nao_respondido: '⚠️ Não respondemos',
      silencio_mutuo: '😶 Silêncio mútuo',
      reativacao_lost: '🔄 Reativação (lead perdido)',
    };

    const lastMsgPreview = prospect.lastMessage
      ? `\nÚltima msg do lead: "${prospect.lastMessage}"`
      : '';

    const tgResult = await irisTelegram.sendApprovalRequest(APPROVAL_CHAT_ID, {
      approvalId: approval.id,
      contactName: prospect.contact_name,
      stage: 'reativacao',
      chunks,
      lastMessage: `(${reasonText[prospect.reason] || 'reativação'} — ${prospect.silenceDays} dias)${lastMsgPreview}`,
      conversationId,
      extraInfo: leadProfile?.resumo ? `\nPerfil: ${leadProfile.resumo}` : '',
    });

    if (tgResult.ok && tgResult.result) {
      irisDB.setApprovalTelegramId(approval.id, tgResult.result.message_id);
    }

    console.log(`🔄 Iris Reativação: #${approval.id} criada para ${prospect.contact_name} (${prospect.reason}, ${prospect.silenceDays}d)`);
    return { success: true, action: 'approval_sent', approvalId: approval.id };
  } catch (error) {
    console.error(`🔄 Iris Reativação: erro para ${prospect.contact_name}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Executa varredura completa de reativação
 * Encontra todos os leads inativos e gera mensagens personalizadas
 * Limita a 5 reativações por ciclo para não sobrecarregar
 *
 * @returns {Promise<{total: number, sent: number, leads: Array}>}
 */
async function runReactivationSweep() {
  console.log('🔄 Iris Reativação: iniciando varredura...');

  const leads = await findLeadsToReactivate();

  if (leads.length === 0) {
    console.log('🔄 Iris Reativação: nenhum lead para reativar');
    return { total: 0, sent: 0, leads: [] };
  }

  // Filtrar leads que já têm aprovação pendente (evitar duplicatas)
  const pending = irisDB.getPendingApprovals();
  const pendingConversations = new Set(pending.map((a) => a.conversation_id));
  const filteredLeads = leads.filter((l) => !pendingConversations.has(l.conversation_id));

  if (filteredLeads.length === 0) {
    console.log('🔄 Iris Reativação: todos os leads já têm aprovação pendente');
    return { total: leads.length, sent: 0, leads: [] };
  }

  // Limitar a 5 por ciclo
  const batch = filteredLeads.slice(0, 5);
  const results = [];

  for (const lead of batch) {
    const result = await reactivateLead(lead);
    results.push({
      contactName: lead.contact_name,
      reason: lead.reason,
      silenceDays: lead.silenceDays,
      ...result,
    });

    // Delay entre cada para não sobrecarregar API
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  const sent = results.filter((r) => r.success).length;

  // Notificar resumo no Telegram
  if (sent > 0) {
    const reasonEmoji = { nao_respondido: '⚠️', silencio_mutuo: '😶', reativacao_lost: '🔄' };
    const summary = results
      .filter((r) => r.success)
      .map((r) => `  ${reasonEmoji[r.reason] || '•'} ${r.contactName} (${r.silenceDays}d)`)
      .join('\n');

    await irisTelegram.sendMessage(APPROVAL_CHAT_ID,
      `🔄 VARREDURA DE REATIVAÇÃO\n\n` +
      `Total inativos: ${leads.length}\n` +
      `Aprovações geradas: ${sent}/${batch.length}\n\n` +
      `Pendentes de aprovação:\n${summary}\n\n` +
      `Aprove ou edite cada uma individualmente.`
    );
  }

  console.log(`🔄 Iris Reativação: ${sent} aprovações geradas de ${batch.length} leads`);
  return { total: leads.length, sent, leads: results };
}

/**
 * Inicia varredura automática a cada 30 minutos
 */
function startReactivationLoop() {
  if (reactivationActive) return false;

  reactivationActive = true;

  // Executar imediatamente na primeira vez
  runReactivationSweep().catch((err) => {
    console.error('🔄 Iris Reativação: erro na primeira varredura:', err.message);
  });

  // Depois a cada 30 minutos
  reactivationInterval = setInterval(() => {
    runReactivationSweep().catch((err) => {
      console.error('🔄 Iris Reativação: erro na varredura periódica:', err.message);
    });
  }, 30 * 60 * 1000);

  console.log('🔄 Iris Reativação: loop ativo (a cada 30 min)');
  return true;
}

/**
 * Para a varredura automática
 */
function stopReactivationLoop() {
  if (!reactivationActive) return false;

  reactivationActive = false;
  if (reactivationInterval) {
    clearInterval(reactivationInterval);
    reactivationInterval = null;
  }

  console.log('🔄 Iris Reativação: loop desativado');
  return true;
}

/**
 * Retorna se o loop de reativação está ativo
 */
function isReactivationActive() {
  return reactivationActive;
}

// ============================================================
// WhatsApp Flow (Stevo)
// Fluxo: Lead dá WhatsApp → Iris envia via Stevo → Pede email → Agenda reunião
// ============================================================

/**
 * Detecta número de telefone/WhatsApp em uma mensagem
 * Suporta formatos: (11) 99999-9999, 11999999999, +5511999999999, etc
 * @param {string} text - Texto da mensagem
 * @returns {string|null} Número formatado (5511999999999) ou null
 */
function extractPhoneNumber(text) {
  if (!text) return null;

  // Remover caracteres que atrapalham
  const cleaned = text.replace(/[-.\s()]/g, '');

  // Padrões comuns
  const patterns = [
    /\+?55(\d{2})(\d{8,9})/,       // +5511999999999 ou 5511999999999
    /(\d{2})(\d{8,9})/,             // 11999999999
    /\((\d{2})\)(\d{8,9})/,        // (11)999999999
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const ddd = match[1];
      let number = match[2];
      // Garantir 9 dígitos (celular)
      if (number.length === 8) number = '9' + number;
      if (number.length === 9 && ddd.length === 2) {
        return `55${ddd}${number}`;
      }
    }
  }

  return null;
}

/**
 * Detecta email em uma mensagem
 * @param {string} text
 * @returns {string|null}
 */
function extractEmail(text) {
  if (!text) return null;
  const match = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Envia primeira mensagem no WhatsApp via Stevo
 * Chamado quando o lead fornece o número e a stage muda para whatsapp_ativo
 * @param {string} conversationId - ID da conversa IG
 * @param {string} phoneNumber - Número formatado (5511999999999)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendFirstWhatsAppMessage(conversationId, phoneNumber) {
  if (!stevo.isConfigured()) {
    return { success: false, error: 'Stevo não configurado' };
  }

  const prospect = irisDB.getProspect(conversationId);
  if (!prospect) return { success: false, error: 'Prospect não encontrado' };

  const jid = `${phoneNumber}@s.whatsapp.net`;

  try {
    // Simular digitação antes de enviar
    await stevo.setPresence(jid, 'composing');
    await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 2000));

    // Mensagem de introdução no WhatsApp
    const firstName = prospect.contact_name.split(' ')[0];
    const msg = `E aí, ${firstName}! Eric aqui 🤙\nA gente tava conversando pelo Instagram. Fica mais fácil trocar ideia por aqui, certo?\n\nMe passa teu email que eu te mando o convite da reunião.`;

    await stevo.sendText(jid, msg);

    // Salvar no DB que a conversa migrou pro WhatsApp
    irisDB.saveMessage(conversationId, 'outbound_whatsapp', msg, {
      contactId: prospect.contact_id,
      whatsappNumber: phoneNumber,
    });

    // Salvar número do WhatsApp no perfil
    const profile = irisDB.getLeadProfile(conversationId) || {};
    irisDB.saveLeadProfile(conversationId, {
      ...profile,
      contactName: prospect.contact_name,
      whatsappNumber: phoneNumber,
      whatsappActive: true,
    });

    console.log(`🌸 Iris WhatsApp: primeira msg enviada para ${prospect.contact_name} (${phoneNumber})`);

    // Notificar Eric
    await irisTelegram.sendMessage(APPROVAL_CHAT_ID,
      `📱 Iris migrou para WhatsApp\n\nLead: ${prospect.contact_name}\nWhatsApp: ${phoneNumber}\n\nPrimeira mensagem enviada. Pedindo email para agendar.`
    );

    return { success: true };
  } catch (error) {
    console.error(`🌸 Iris WhatsApp: erro ao enviar para ${phoneNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Processa resposta do lead no WhatsApp (via webhook Stevo)
 * Detecta email, agenda reunião, etc
 * @param {string} phoneNumber - Número do lead
 * @param {string} messageText - Texto da mensagem
 * @returns {Promise<{success: boolean, action?: string}>}
 */
async function processWhatsAppInbound(phoneNumber, messageText) {
  // Buscar prospect pelo número do WhatsApp
  const prospects = irisDB.getActiveProspects();
  let prospect = null;
  let conversationId = null;

  for (const p of prospects) {
    const profile = irisDB.getLeadProfile(p.conversation_id);
    if (profile?.whatsappNumber === phoneNumber) {
      prospect = p;
      conversationId = p.conversation_id;
      break;
    }
  }

  if (!prospect || !conversationId) {
    return { success: false, error: 'Lead não encontrado pelo WhatsApp' };
  }

  // Salvar mensagem inbound do WhatsApp
  irisDB.saveMessage(conversationId, 'inbound_whatsapp', messageText, {
    contactId: prospect.contact_id,
    whatsappNumber: phoneNumber,
  });

  // Detectar email na mensagem
  const email = extractEmail(messageText);
  if (email) {
    return await handleEmailReceived(conversationId, phoneNumber, email);
  }

  // Se não detectou email, verificar se é resposta genérica
  // (ex: "oi", "pode ser", "ok") e reforçar pedido de email
  const jid = `${phoneNumber}@s.whatsapp.net`;
  try {
    await new Promise((resolve) => setTimeout(resolve, 3000 + Math.random() * 3000));
    await stevo.setPresence(jid, 'composing');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await stevo.sendText(jid, 'Perfeito! Me manda teu email que eu já envio o convite da reunião 📩');

    return { success: true, action: 'asked_email_again' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Quando o lead envia o email, agenda a reunião
 */
async function handleEmailReceived(conversationId, phoneNumber, email) {
  const prospect = irisDB.getProspect(conversationId);
  if (!prospect) return { success: false, error: 'Prospect não encontrado' };

  const jid = `${phoneNumber}@s.whatsapp.net`;

  // Salvar email no perfil
  const profile = irisDB.getLeadProfile(conversationId) || {};
  irisDB.saveLeadProfile(conversationId, {
    ...profile,
    contactName: prospect.contact_name,
    email,
  });

  try {
    // Buscar próximo horário disponível
    if (irisCalendar.isConfigured()) {
      const result = await irisCalendar.scheduleNextAvailable(prospect.contact_id, {
        contactName: prospect.contact_name,
        email,
        notes: `Lead de prospecção Instagram. WhatsApp: ${phoneNumber}`,
      });

      if (result.success && result.slot) {
        const date = new Date(result.slot.startTime);
        const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const dayName = dayNames[date.getDay()];
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const formattedDate = `${dayName}, ${day}/${month} às ${result.slot.time}`;

        // Atualizar stage para agendamento
        irisDB.updateProspectStage(conversationId, 'agendamento', 'confirmacao');

        // Sync pipeline
        if (irisPipeline.isConfigured()) {
          irisPipeline.syncStage(conversationId, 'agendamento').catch(() => {});
        }

        // Enviar confirmação no WhatsApp
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await stevo.setPresence(jid, 'composing');
        await new Promise((resolve) => setTimeout(resolve, 3000));

        await stevo.sendText(jid,
          `Show! Agendei para ${formattedDate} ✅\n\nTe mandei o convite no email ${email}. Vai ser uma call de 20 min, bem direto ao ponto.\n\nQualquer coisa me avisa aqui!`
        );

        // Notificar Eric
        await irisTelegram.sendMessage(APPROVAL_CHAT_ID,
          `📅 Reunião agendada!\n\nLead: ${prospect.contact_name}\nData: ${formattedDate}\nEmail: ${email}\nWhatsApp: ${phoneNumber}\n\n✅ Convite enviado automaticamente.`
        );

        return { success: true, action: 'meeting_scheduled', date: formattedDate };
      }
    }

    // Fallback: se calendar não disponível, confirmar email e avisar Eric
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await stevo.setPresence(jid, 'composing');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Sugerir horários manualmente
    const suggestions = await irisCalendar.suggestNextSlots();
    if (suggestions) {
      await stevo.sendText(jid,
        `Anotado! Tenho esses horários disponíveis:\n\n${suggestions}\n\nQual funciona melhor pra você?`
      );
    } else {
      await stevo.sendText(jid,
        `Anotado o email ${email}! Vou verificar meus horários e te mando o convite em breve 👍`
      );
    }

    await irisTelegram.sendMessage(APPROVAL_CHAT_ID,
      `📧 Email recebido\n\nLead: ${prospect.contact_name}\nEmail: ${email}\nWhatsApp: ${phoneNumber}\n\n⚠️ Precisa agendar manualmente (calendar não disponível ou sem slots).`
    );

    return { success: true, action: 'email_received_manual_schedule' };
  } catch (error) {
    console.error(`🌸 Iris WhatsApp: erro no agendamento para ${prospect.contact_name}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Hook chamado durante classificação: detecta se lead enviou número de WhatsApp
 * Se sim, transiciona para pedir_whatsapp → whatsapp_ativo
 * @param {string} conversationId
 * @param {string} lastMessageBody - Última mensagem do lead
 * @param {string} currentStage - Stage atual
 * @returns {Promise<{detected: boolean, phoneNumber?: string}>}
 */
async function checkWhatsAppTransition(conversationId, lastMessageBody, currentStage) {
  // Só detectar WhatsApp se estamos em stages avançadas
  const whatsappStages = ['proposta_reuniao', 'pedir_whatsapp', 'rapport', 'objecoes'];
  if (!whatsappStages.includes(currentStage)) return { detected: false };

  const phoneNumber = extractPhoneNumber(lastMessageBody);
  if (!phoneNumber) return { detected: false };

  console.log(`🌸 Iris: WhatsApp detectado! ${phoneNumber} de ${conversationId}`);

  // Transicionar para whatsapp_ativo
  irisDB.updateProspectStage(conversationId, 'whatsapp_ativo', 'primeiro_contato');

  // Enviar primeira mensagem via Stevo
  const result = await sendFirstWhatsAppMessage(conversationId, phoneNumber);

  return { detected: true, phoneNumber, sent: result.success };
}

module.exports = {
  processInboundMessage,
  sendApprovedMessages,
  handleApprovalCallback,
  handleEditedText,
  isEditingMode,
  enrollManual,
  checkFollowups,
  executeFollowup,
  executeAllFollowups,
  scanAndPrioritize,
  scanGHLConversations,
  generateDailySummary,
  analyzeFeedbackPatterns,
  checkWhatsAppTransition,
  processWhatsAppInbound,
  sendFirstWhatsAppMessage,
  extractPhoneNumber,
  extractEmail,
  findLeadsToReactivate,
  reactivateLead,
  runReactivationSweep,
  startReactivationLoop,
  stopReactivationLoop,
  isReactivationActive,
  setMode,
  getMode,
};
