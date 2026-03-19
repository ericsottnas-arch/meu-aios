// Temporary script: Extract Eric's real Instagram messages from GHL
// Purpose: Learn Eric's communication style from real conversations

require('dotenv').config({ path: '/Users/ericsantos/meu-aios/.env' });

const ghl = require('./lib/ghl-api');

const DELAY_MS = 500; // delay between API calls to avoid rate limiting

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== Eric Instagram Message Extractor ===\n');

  // 1. Test connection
  const test = await ghl.testConnection();
  if (!test.success) {
    console.error('Connection failed:', test.error);
    process.exit(1);
  }
  console.log(`Connected. Total conversations in GHL: ${test.total}\n`);

  // 2. Fetch conversations - multiple pages to get more data
  let allConversations = [];
  let hasMore = true;
  let afterId = undefined;
  let page = 0;
  const MAX_PAGES = 10; // up to 200 conversations

  while (hasMore && page < MAX_PAGES) {
    const params = { limit: 20, sortBy: 'last_message_date', sortOrder: 'desc' };
    if (afterId) params.startAfterId = afterId;

    const convResult = await ghl.getConversations(params);
    if (!convResult.success || convResult.data.length === 0) {
      hasMore = false;
      break;
    }

    allConversations = allConversations.concat(convResult.data);
    afterId = convResult.data[convResult.data.length - 1].id;
    page++;

    console.log(`  Page ${page}: fetched ${convResult.data.length} conversations (total: ${allConversations.length})`);
    await sleep(DELAY_MS);
  }

  console.log(`\nTotal conversations fetched: ${allConversations.length}`);

  // 3. Filter Instagram conversations only
  const igConversations = allConversations.filter(c => {
    const type = (c.type || '').toLowerCase();
    const lastType = (c.lastMessageType || '').toLowerCase();
    return type.includes('instagram') || type === 'ig' ||
           lastType.includes('instagram') || lastType === 'ig' ||
           type.includes('fb') || type.includes('facebook');
  });

  console.log(`Instagram/Social conversations: ${igConversations.length}`);

  // If no IG-specific filter works, try all conversations
  const conversationsToProcess = igConversations.length > 0 ? igConversations : allConversations;
  console.log(`Processing ${conversationsToProcess.length} conversations...\n`);

  // 4. For each conversation, fetch messages and extract Eric's outbound ones
  const allEricMessages = [];
  let processedCount = 0;

  for (const conv of conversationsToProcess) {
    processedCount++;
    const contactName = conv.contactName || conv.fullName || 'Unknown';
    const convType = conv.type || conv.lastMessageType || 'unknown';

    console.log(`[${processedCount}/${conversationsToProcess.length}] ${contactName} (${convType})`);

    try {
      const msgResult = await ghl.getConversationMessages(conv.id, { limit: 30 });

      if (!msgResult.success || !msgResult.data || msgResult.data.length === 0) {
        console.log(`  -> No messages found`);
        await sleep(DELAY_MS);
        continue;
      }

      // Filter outbound messages (Eric's messages)
      const outbound = msgResult.data.filter(m => {
        return m.direction === 'outbound' && m.body && m.body.trim().length > 0;
      });

      if (outbound.length > 0) {
        console.log(`  -> ${outbound.length} outbound messages from Eric`);

        for (const msg of outbound) {
          allEricMessages.push({
            contactName,
            conversationType: convType,
            conversationId: conv.id,
            messageId: msg.id,
            body: msg.body,
            dateAdded: msg.dateAdded,
            direction: msg.direction,
            messageType: msg.type || msg.messageType || convType,
            status: msg.status,
          });
        }
      } else {
        console.log(`  -> 0 outbound messages`);
      }
    } catch (err) {
      console.log(`  -> Error: ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n=== EXTRACTION COMPLETE ===`);
  console.log(`Total Eric outbound messages: ${allEricMessages.length}`);

  // 5. Sort by date
  allEricMessages.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));

  // 6. Try to categorize by context/stage
  const categorized = {
    meta: {
      extractedAt: new Date().toISOString(),
      totalMessages: allEricMessages.length,
      totalConversations: conversationsToProcess.length,
      conversationsWithOutbound: new Set(allEricMessages.map(m => m.conversationId)).size,
    },
    byConversation: {},
    byPattern: {
      greetings: [],       // first messages, openers
      responses: [],        // replies to inbound
      followUps: [],        // follow-up messages
      questions: [],        // messages with ?
      closings: [],         // closing/farewell messages
      links: [],            // messages with links
      audio_references: [], // references to audio/voice
      emojis_heavy: [],     // messages with many emojis
      short: [],            // short messages (< 50 chars)
      long: [],             // long messages (> 200 chars)
    },
    allMessages: allEricMessages,
  };

  // Group by conversation
  for (const msg of allEricMessages) {
    if (!categorized.byConversation[msg.contactName]) {
      categorized.byConversation[msg.contactName] = [];
    }
    categorized.byConversation[msg.contactName].push({
      body: msg.body,
      date: msg.dateAdded,
      type: msg.messageType,
    });
  }

  // Categorize by patterns
  for (const msg of allEricMessages) {
    const body = msg.body;
    const lower = body.toLowerCase();

    // Questions
    if (body.includes('?')) {
      categorized.byPattern.questions.push(body);
    }

    // Links
    if (body.includes('http') || body.includes('www.') || body.includes('.com')) {
      categorized.byPattern.links.push(body);
    }

    // Short messages
    if (body.length < 50) {
      categorized.byPattern.short.push(body);
    }

    // Long messages
    if (body.length > 200) {
      categorized.byPattern.long.push(body);
    }

    // Greetings patterns
    if (lower.match(/^(oi|ola|hey|fala|e ai|eai|bom dia|boa tarde|boa noite|salve)/)) {
      categorized.byPattern.greetings.push(body);
    }

    // Closings
    if (lower.match(/(abraço|abraco|valeu|tmj|até|ate logo|falou|beijo|obrigad)/)) {
      categorized.byPattern.closings.push(body);
    }

    // Audio references
    if (lower.match(/(audio|áudio|gravar|gravei|mand.*audio|ouve|escuta)/)) {
      categorized.byPattern.audio_references.push(body);
    }

    // Emoji heavy (3+ emojis)
    const emojiCount = (body.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
    if (emojiCount >= 3) {
      categorized.byPattern.emojis_heavy.push(body);
    }
  }

  // 7. Save to file
  const fs = require('fs');
  const outputPath = '/Users/ericsantos/meu-aios/meu-projeto/lib/iris-eric-real-messages.json';
  fs.writeFileSync(outputPath, JSON.stringify(categorized, null, 2), 'utf-8');
  console.log(`\nSaved to: ${outputPath}`);

  // 8. Print summary
  console.log('\n=== PATTERN SUMMARY ===');
  console.log(`Greetings: ${categorized.byPattern.greetings.length}`);
  console.log(`Questions: ${categorized.byPattern.questions.length}`);
  console.log(`Closings: ${categorized.byPattern.closings.length}`);
  console.log(`Links shared: ${categorized.byPattern.links.length}`);
  console.log(`Short (<50 chars): ${categorized.byPattern.short.length}`);
  console.log(`Long (>200 chars): ${categorized.byPattern.long.length}`);
  console.log(`Emoji heavy: ${categorized.byPattern.emojis_heavy.length}`);
  console.log(`Audio references: ${categorized.byPattern.audio_references.length}`);

  // Print some sample messages
  console.log('\n=== SAMPLE MESSAGES ===');
  const samples = allEricMessages.slice(0, 20);
  for (const s of samples) {
    console.log(`\n[${s.contactName}] (${s.messageType}) ${s.dateAdded}`);
    console.log(`  "${s.body.substring(0, 200)}${s.body.length > 200 ? '...' : ''}"`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
