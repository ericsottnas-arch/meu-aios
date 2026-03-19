// meu-projeto/lib/content-radar.js
// Content Radar — Motor de pesquisa de conteudo trending
//
// 3 motores:
//  1. Profile Watcher (Apify Instagram) — monitora posts de perfis referencia
//  2. Niche Topic Scanner (EXA) — temas quentes no nicho
//  3. Trending Radar (EXA) — tendencias gerais de mercado
//
// Env: APIFY_API_TOKEN, EXA_API_KEY, ANTHROPIC_API_KEY, SWIPE_BOT_TOKEN

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const radarDB = require('./content-radar-db');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.replace(/"/g, '');
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN?.replace(/"/g, '');
const EXA_API_KEY = process.env.EXA_API_KEY?.replace(/"/g, '');
const SWIPE_BOT_TOKEN = process.env.SWIPE_BOT_TOKEN?.replace(/"/g, '');
const CHAT_ID = String(process.env.IRIS_APPROVAL_CHAT_ID || '5020990459');

const CONFIG_PATH = path.resolve(__dirname, '../data/content-radar-config.json');

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// ============================================================
// Config
// ============================================================

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (err) {
    console.error('[radar] Erro ao ler config:', err.message);
    return { profiles: [], niche_queries: [], trending_sources: [], thresholds: { min_relevance_score: 7, max_notifications_per_day: 10 } };
  }
}

// ============================================================
// Telegram helpers (mesmo bot do Swipe Collector)
// ============================================================

async function botSend(chatId, text, replyMarkup) {
  if (!SWIPE_BOT_TOKEN) return null;
  try {
    const body = { chat_id: chatId, text, parse_mode: 'HTML' };
    if (replyMarkup) body.reply_markup = replyMarkup;
    const res = await axios.post(`https://api.telegram.org/bot${SWIPE_BOT_TOKEN}/sendMessage`, body);
    return res.data;
  } catch (err) {
    console.error('[radar] Telegram send error:', err.message);
    return null;
  }
}

// ============================================================
// Claude Haiku — classificacao rapida
// ============================================================

async function classifyWithClaude(prompt, systemPrompt) {
  if (!ANTHROPIC_API_KEY) {
    console.error('[radar] ANTHROPIC_API_KEY nao configurado');
    return null;
  }

  try {
    const res = await axios.post('https://api.anthropic.com/v1/messages', {
      model: HAIKU_MODEL,
      max_tokens: 1024,
      system: systemPrompt || 'Voce e um analista de conteudo digital especializado em marketing medico e estetica.',
      messages: [{ role: 'user', content: prompt }],
    }, {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    });

    return res.data?.content?.[0]?.text || null;
  } catch (err) {
    console.error('[radar] Claude classify error:', err.response?.data || err.message);
    return null;
  }
}

// ============================================================
// Motor 1: Profile Watcher (Apify)
// ============================================================

async function watchProfiles() {
  const config = loadConfig();
  const { profiles } = config;
  const { min_relevance_score, max_notifications_per_day } = config.thresholds;

  if (!profiles.length) {
    console.log('[radar] Nenhum perfil configurado para monitorar');
    return { found: 0, notified: 0 };
  }

  console.log(`[radar] Profile Watcher: monitorando ${profiles.length} perfis...`);
  let found = 0;
  let notified = 0;

  for (const profile of profiles) {
    try {
      const posts = await fetchInstagramPosts(profile.username);
      if (!posts?.length) {
        console.log(`[radar] @${profile.username}: nenhum post encontrado`);
        continue;
      }

      for (const post of posts) {
        // Skip se ja existe no DB
        if (post.url && radarDB.itemExistsByUrl(post.url)) continue;

        // Check daily notification limit
        if (radarDB.getNotificationCount() >= max_notifications_per_day) {
          console.log('[radar] Limite diario de notificacoes atingido');
          break;
        }

        const analysis = await analyzePost(post, profile);
        if (!analysis) continue;

        found++;
        radarDB.incrementDailyStat('items_found');

        const itemId = radarDB.insertItem({
          source: 'profile_watcher',
          source_url: post.url,
          source_username: profile.username,
          title: post.caption?.slice(0, 100) || `Post de @${profile.username}`,
          content: JSON.stringify({ caption: post.caption, type: post.type, likes: post.likes, comments: post.comments }),
          relevance_score: analysis.relevance,
          engagement_rate: post.engagementRate || 0,
          suggested_angle: analysis.angle,
          suggested_format: analysis.format,
        });

        if (analysis.relevance >= min_relevance_score) {
          await notifyProfilePost(itemId, post, profile, analysis);
          notified++;
        }
      }

      radarDB.updateProfileChecked(profile.username, posts[0]?.id || null);
    } catch (err) {
      console.error(`[radar] Erro monitorando @${profile.username}:`, err.message);
    }
  }

  console.log(`[radar] Profile Watcher concluido: ${found} encontrados, ${notified} notificados`);
  return { found, notified };
}

async function fetchInstagramPosts(username) {
  // Tenta Apify primeiro, fallback para scraping basico
  if (APIFY_API_TOKEN) {
    return fetchViaApify(username);
  }
  console.log(`[radar] APIFY_API_TOKEN nao disponivel, usando scraping basico para @${username}`);
  return fetchViaBasicScrape(username);
}

async function fetchViaApify(username) {
  try {
    // Apify Instagram Profile Scraper
    const actorId = 'apify~instagram-profile-scraper';
    const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_API_TOKEN}`;

    const runRes = await axios.post(runUrl, {
      usernames: [username],
      resultsLimit: 5,
      resultsType: 'posts',
    }, { timeout: 120000 });

    const datasetId = runRes.data?.data?.defaultDatasetId;
    if (!datasetId) return [];

    // Esperar o actor terminar (max 2 min)
    const runId = runRes.data?.data?.id;
    await waitForApifyRun(runId);

    const itemsUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`;
    const itemsRes = await axios.get(itemsUrl, { timeout: 30000 });
    const items = itemsRes.data || [];

    return items.map(item => ({
      id: item.id || item.shortCode,
      url: item.url || `https://www.instagram.com/p/${item.shortCode}/`,
      type: item.type || (item.videoUrl ? 'reel' : item.images?.length > 1 ? 'carousel' : 'image'),
      caption: item.caption || '',
      likes: item.likesCount || 0,
      comments: item.commentsCount || 0,
      timestamp: item.timestamp,
      engagementRate: calculateEngagement(item),
      mediaUrls: item.displayUrl ? [item.displayUrl] : [],
    }));
  } catch (err) {
    console.error(`[radar] Apify error for @${username}:`, err.message);
    return [];
  }
}

async function waitForApifyRun(runId) {
  if (!runId) return;
  const maxWait = 120000;
  const interval = 5000;
  let elapsed = 0;

  while (elapsed < maxWait) {
    try {
      const res = await axios.get(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`);
      const status = res.data?.data?.status;
      if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'ABORTED') return;
    } catch {}
    await sleep(interval);
    elapsed += interval;
  }
}

async function fetchViaBasicScrape(username) {
  // Fallback: busca basica via pagina publica (limitado)
  try {
    const res = await axios.get(`https://www.instagram.com/${username}/`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      timeout: 15000,
    });

    // Tenta extrair do JSON embutido na pagina
    const match = res.data.match(/window\._sharedData\s*=\s*({.+?});<\/script>/);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const edges = data?.entry_data?.ProfilePage?.[0]?.graphql?.user?.edge_owner_to_timeline_media?.edges || [];

    return edges.slice(0, 5).map(edge => ({
      id: edge.node.shortcode,
      url: `https://www.instagram.com/p/${edge.node.shortcode}/`,
      type: edge.node.is_video ? 'reel' : edge.node.edge_sidecar_to_children ? 'carousel' : 'image',
      caption: edge.node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
      likes: edge.node.edge_liked_by?.count || 0,
      comments: edge.node.edge_media_to_comment?.count || 0,
      timestamp: new Date(edge.node.taken_at_timestamp * 1000).toISOString(),
      engagementRate: 0,
    }));
  } catch (err) {
    console.error(`[radar] Basic scrape error for @${username}:`, err.message);
    return [];
  }
}

function calculateEngagement(item) {
  const followers = item.ownerFollowersCount || 1;
  const interactions = (item.likesCount || 0) + (item.commentsCount || 0);
  return parseFloat(((interactions / followers) * 100).toFixed(2));
}

async function analyzePost(post, profile) {
  const prompt = `Analise este post de Instagram de @${profile.username} (categoria: ${profile.category}):

Tipo: ${post.type}
Caption: ${post.caption?.slice(0, 500) || '(sem caption)'}
Likes: ${post.likes} | Comments: ${post.comments}
Engagement Rate: ${post.engagementRate}%

Contexto: Eric Santos e dono da Syra Digital, agencia de marketing digital focada em clinicas medicas e esteticas. Ele cria conteudo no @byericsantos sobre marketing, vendas e negocios para donos de clinicas.

Avalie:
1. Relevancia (1-10): Quao relevante e esse conteudo para o publico de Eric?
2. Angulo sugerido: Como Eric poderia adaptar isso? (bridge-post, comment-on-trend, replicate, keep-narrative, generate-opinion)
3. Formato sugerido: F1 (frase), F2 (carrossel dados), F3 (thread), F4 (estatico), F5 (reel)

Responda APENAS em JSON:
{"relevance": 8, "angle": "bridge-post", "angle_detail": "Conectar X com Y para clinicas", "format": "F3"}`;

  const result = await classifyWithClaude(prompt);
  if (!result) return null;

  try {
    const cleaned = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    console.error('[radar] Erro parseando analise:', result?.slice(0, 200));
    return null;
  }
}

async function notifyProfilePost(itemId, post, profile, analysis) {
  const text = `🔍 <b>CONTENT RADAR</b> — Novo post relevante

👤 @${profile.username} · ${post.type} · ${formatNumber(post.likes)} likes
📝 "${(post.caption || '').slice(0, 120)}${(post.caption || '').length > 120 ? '...' : ''}"

🎯 Relevancia: ${analysis.relevance}/10
💡 Angulo: ${analysis.angle} → "${analysis.angle_detail || ''}"
📐 Formato sugerido: ${analysis.format}`;

  const keyboard = {
    inline_keyboard: [[
      { text: '📥 Analisar + Salvar', callback_data: `radar:analyze:${itemId}` },
      { text: '✏️ Criar conteudo', callback_data: `radar:create:${itemId}` },
    ], [
      { text: '❌ Descartar', callback_data: `radar:discard:${itemId}` },
    ]],
  };

  const sent = await botSend(CHAT_ID, text, keyboard);
  if (sent?.result?.message_id) {
    radarDB.updateItemStatus(itemId, 'notified', { notified_message_id: sent.result.message_id });
    radarDB.incrementDailyStat('items_notified');
  }
}

// ============================================================
// Motor 2: Niche Topic Scanner (EXA)
// ============================================================

async function scanNicheTopics() {
  const config = loadConfig();
  const { niche_queries } = config;
  const { min_relevance_score, max_notifications_per_day } = config.thresholds;

  if (!niche_queries.length) {
    console.log('[radar] Nenhuma query de nicho configurada');
    return { found: 0, notified: 0 };
  }

  console.log(`[radar] Niche Scanner: executando ${niche_queries.length} queries...`);

  // Rotacionar queries — usar 2-3 por execucao
  const today = new Date().getDate();
  const startIdx = (today * 2) % niche_queries.length;
  const selectedQueries = [];
  for (let i = 0; i < 3; i++) {
    selectedQueries.push(niche_queries[(startIdx + i) % niche_queries.length]);
  }

  let allResults = [];

  for (const query of selectedQueries) {
    try {
      const results = await searchExa(query, 5);
      allResults.push(...results);
    } catch (err) {
      console.error(`[radar] Niche scan error for "${query}":`, err.message);
    }
  }

  // Deduplicar por URL
  const seen = new Set();
  allResults = allResults.filter(r => {
    if (seen.has(r.url) || radarDB.itemExistsByUrl(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  if (!allResults.length) {
    console.log('[radar] Niche Scanner: nenhum resultado novo');
    return { found: 0, notified: 0 };
  }

  // Classificar com Claude
  const classified = await classifyNicheResults(allResults);
  let found = 0;
  let notified = 0;

  for (const item of classified) {
    found++;
    radarDB.incrementDailyStat('items_found');

    const itemId = radarDB.insertItem({
      source: 'niche_scanner',
      source_url: item.url,
      source_username: item.source || extractDomain(item.url),
      title: item.title,
      content: item.snippet,
      relevance_score: item.relevance,
      suggested_angle: item.angle,
      suggested_format: item.format,
    });

    if (item.relevance >= min_relevance_score && radarDB.getNotificationCount() < max_notifications_per_day) {
      // Acumular para notificacao consolidada
      item.itemId = itemId;
    }
  }

  // Notificacao consolidada dos top 5
  const topItems = classified
    .filter(i => i.relevance >= min_relevance_score)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5);

  if (topItems.length) {
    notified = await notifyNicheResults(topItems);
  }

  console.log(`[radar] Niche Scanner concluido: ${found} encontrados, ${notified} notificados`);
  return { found, notified };
}

async function searchExa(query, numResults = 5) {
  if (EXA_API_KEY) {
    return searchViaExa(query, numResults);
  }
  console.log('[radar] EXA_API_KEY nao disponivel, usando WebSearch fallback');
  return searchViaWebFallback(query, numResults);
}

async function searchViaExa(query, numResults) {
  try {
    const res = await axios.post('https://api.exa.ai/search', {
      query,
      numResults,
      useAutoprompt: true,
      type: 'auto',
      startPublishedDate: getDateDaysAgo(7),
      contents: { text: { maxCharacters: 500 } },
    }, {
      headers: {
        'x-api-key': EXA_API_KEY,
        'content-type': 'application/json',
      },
      timeout: 30000,
    });

    return (res.data?.results || []).map(r => ({
      url: r.url,
      title: r.title,
      snippet: r.text || r.highlight || '',
      publishedDate: r.publishedDate,
      source: r.author || extractDomain(r.url),
    }));
  } catch (err) {
    console.error('[radar] EXA search error:', err.response?.data || err.message);
    return [];
  }
}

async function searchViaWebFallback(query, numResults) {
  // Fallback: Google Custom Search ou DuckDuckGo
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`;
    const res = await axios.get(ddgUrl, { timeout: 10000 });
    const topics = res.data?.RelatedTopics || [];

    return topics.slice(0, numResults).map(t => ({
      url: t.FirstURL || '',
      title: t.Text?.slice(0, 100) || '',
      snippet: t.Text || '',
      source: extractDomain(t.FirstURL || ''),
    }));
  } catch (err) {
    console.error('[radar] Web fallback error:', err.message);
    return [];
  }
}

async function classifyNicheResults(results) {
  const prompt = `Classifique estes artigos/posts por relevancia para Eric Santos, dono da Syra Digital (agencia marketing digital para clinicas medicas/esteticas). Ele cria conteudo no @byericsantos.

Artigos:
${results.map((r, i) => `${i + 1}. "${r.title}" — ${r.snippet?.slice(0, 200)}`).join('\n')}

Para cada item, avalie:
- relevance (1-10): relevancia para o publico de Eric (donos de clinicas com 2-3 funcionarios)
- angle: como Eric pode usar (bridge-post, replicate, comment-on-trend, keep-narrative)
- format: F1 (frase), F2 (carrossel), F3 (thread), F5 (reel)

Responda APENAS em JSON array:
[{"index": 1, "relevance": 8, "angle": "bridge-post", "angle_detail": "...", "format": "F3"}, ...]`;

  const result = await classifyWithClaude(prompt);
  if (!result) return results.map(r => ({ ...r, relevance: 5, angle: 'unknown', format: 'F3' }));

  try {
    const cleaned = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const classified = JSON.parse(cleaned);

    return results.map((r, i) => {
      const cls = classified.find(c => c.index === i + 1) || {};
      return { ...r, relevance: cls.relevance || 5, angle: cls.angle || 'unknown', angle_detail: cls.angle_detail || '', format: cls.format || 'F3' };
    });
  } catch {
    return results.map(r => ({ ...r, relevance: 5, angle: 'unknown', format: 'F3' }));
  }
}

async function notifyNicheResults(items) {
  let text = `📰 <b>CONTENT RADAR</b> — Temas quentes do nicho\n\n`;

  items.forEach((item, i) => {
    text += `${i + 1}. "<b>${escapeHtml(item.title?.slice(0, 80) || 'Sem titulo')}</b>"
   🎯 ${item.relevance}/10 · 💡 ${item.angle_detail || item.angle}
   📐 ${item.format}\n\n`;
  });

  const keyboard = {
    inline_keyboard: items.slice(0, 3).map((item, i) => ([
      { text: `✏️ Criar #${i + 1}`, callback_data: `radar:create:${item.itemId}` },
      { text: `📥 Salvar #${i + 1}`, callback_data: `radar:analyze:${item.itemId}` },
    ])).concat([[
      { text: '❌ Ignorar tudo', callback_data: 'radar:discard:batch' },
    ]]),
  };

  const sent = await botSend(CHAT_ID, text, keyboard);
  if (sent?.ok) {
    for (const item of items) {
      if (item.itemId) radarDB.updateItemStatus(item.itemId, 'notified');
    }
    radarDB.incrementDailyStat('items_notified');
  }
  return items.length;
}

// ============================================================
// Motor 3: Trending Radar (EXA + análise ICP)
// ============================================================

async function scanTrending() {
  const config = loadConfig();
  const { trending_sources } = config;
  const { min_relevance_score, max_notifications_per_day } = config.thresholds;

  console.log('[radar] Trending Radar: buscando tendencias...');

  let allResults = [];

  // Queries fixas de trending
  const trendingQueries = [
    'noticias negocios empreendedorismo brasil esta semana',
    'inteligencia artificial impacto pequenas empresas 2026',
    'tendencias marketing digital redes sociais 2026',
    ...trending_sources,
  ];

  // Usar 2-3 queries rotativas
  const today = new Date().getDate();
  const selected = [];
  for (let i = 0; i < 3; i++) {
    selected.push(trendingQueries[(today + i) % trendingQueries.length]);
  }

  for (const query of selected) {
    try {
      const results = await searchExa(query, 5);
      allResults.push(...results);
    } catch (err) {
      console.error(`[radar] Trending search error:`, err.message);
    }
  }

  // Deduplicar
  const seen = new Set();
  allResults = allResults.filter(r => {
    if (seen.has(r.url) || radarDB.itemExistsByUrl(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  if (!allResults.length) {
    console.log('[radar] Trending Radar: nenhum resultado novo');
    return { found: 0, notified: 0 };
  }

  // Classificar com teste ICP
  const classified = await classifyTrending(allResults);

  let found = 0;
  const topTrends = [];

  for (const item of classified) {
    if (!item.icp_fit) continue;

    found++;
    radarDB.incrementDailyStat('items_found');

    const itemId = radarDB.insertItem({
      source: 'trending_radar',
      source_url: item.url,
      source_username: item.source || extractDomain(item.url),
      title: item.title,
      content: item.snippet,
      relevance_score: item.relevance,
      suggested_angle: item.take,
      suggested_format: item.format,
    });

    if (item.relevance >= min_relevance_score) {
      topTrends.push({ ...item, itemId });
    }
  }

  // Notificar top 3 trends
  let notified = 0;
  if (topTrends.length && radarDB.getNotificationCount() < max_notifications_per_day) {
    notified = await notifyTrending(topTrends.slice(0, 3));
  }

  console.log(`[radar] Trending Radar concluido: ${found} encontrados, ${notified} notificados`);
  return { found, notified };
}

async function classifyTrending(results) {
  const prompt = `Voce e um curador de conteudo para Eric Santos (@byericsantos). Eric fala para donos de clinicas medicas/esteticas com 2-3 funcionarios.

Avalie estas noticias/tendencias:
${results.map((r, i) => `${i + 1}. "${r.title}" — ${r.snippet?.slice(0, 200)}`).join('\n')}

Para cada noticia, responda:
- icp_fit (true/false): "Um dono de clinica com 2-3 funcionarios se identifica com isso?"
- relevance (1-10): quao relevante para transformar em conteudo de autoridade
- take: sugestao de "take" de Eric em 1 frase (como ele comentaria isso)
- format: melhor formato (F1 frase, F3 thread, F4 estatico, F5 reel)

Responda APENAS em JSON array:
[{"index": 1, "icp_fit": true, "relevance": 8, "take": "Voce nao precisa de 100M de clientes...", "format": "F3"}, ...]`;

  const result = await classifyWithClaude(prompt);
  if (!result) return results.map(r => ({ ...r, icp_fit: false, relevance: 3, take: '', format: 'F3' }));

  try {
    const cleaned = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const classified = JSON.parse(cleaned);

    return results.map((r, i) => {
      const cls = classified.find(c => c.index === i + 1) || {};
      return { ...r, icp_fit: cls.icp_fit || false, relevance: cls.relevance || 3, take: cls.take || '', format: cls.format || 'F3' };
    });
  } catch {
    return results.map(r => ({ ...r, icp_fit: false, relevance: 3, take: '', format: 'F3' }));
  }
}

async function notifyTrending(items) {
  let text = `📰 <b>CONTENT RADAR</b> — Trending do dia\n\n`;

  items.forEach((item, i) => {
    text += `${i + 1}. "<b>${escapeHtml(item.title?.slice(0, 80) || 'Sem titulo')}</b>"
   💡 Take: "${escapeHtml(item.take?.slice(0, 120) || '')}"
   📐 ${item.format}\n\n`;
  });

  const keyboard = {
    inline_keyboard: items.map((item, i) => ([
      { text: `✏️ Criar sobre #${i + 1}`, callback_data: `radar:create:${item.itemId}` },
    ])).concat([[
      { text: '❌ Ignorar tudo', callback_data: 'radar:discard:batch' },
    ]]),
  };

  const sent = await botSend(CHAT_ID, text, keyboard);
  if (sent?.ok) {
    for (const item of items) {
      if (item.itemId) radarDB.updateItemStatus(item.itemId, 'notified');
    }
  }
  return items.length;
}

// ============================================================
// Scan All — executa os 3 motores
// ============================================================

async function scanAll() {
  console.log('[radar] === Scan completo iniciado ===');
  const results = {};

  try {
    results.profiles = await watchProfiles();
  } catch (err) {
    console.error('[radar] Profile Watcher error:', err.message);
    results.profiles = { found: 0, notified: 0, error: err.message };
  }

  try {
    results.niche = await scanNicheTopics();
  } catch (err) {
    console.error('[radar] Niche Scanner error:', err.message);
    results.niche = { found: 0, notified: 0, error: err.message };
  }

  try {
    results.trending = await scanTrending();
  } catch (err) {
    console.error('[radar] Trending Radar error:', err.message);
    results.trending = { found: 0, notified: 0, error: err.message };
  }

  console.log('[radar] === Scan completo finalizado ===', results);
  return results;
}

// ============================================================
// Utils
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatNumber(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

module.exports = {
  loadConfig,
  watchProfiles,
  scanNicheTopics,
  scanTrending,
  scanAll,
  // Exported for server callback handlers
  radarDB,
  CHAT_ID,
  botSend,
};
