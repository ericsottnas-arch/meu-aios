// Temporary script: Extract ALL Instagram DM conversations via Graph API
// Purpose: Analyze real prospecting patterns for playbook v2

require('dotenv').config({ path: '/Users/ericsantos/meu-aios/.env' });
const ig = require('./lib/instagram-graph');
const fs = require('fs');

const DELAY_MS = 350;
const EXCLUDE_USERNAMES = ['ericsantos.io', 'dra.vanessasoares.bh', 'vjmartins03', 'ericoservano', 'atattimiranda', 'drfabianocaixeta', 'ohenriquecedor', 'iallas', 'naele_vet'];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('=== Instagram DM Extractor (ALL conversations) ===\n');

  // 1. Get all conversations
  const result = await ig.getAllConversations(10);
  console.log(`Total conversas: ${result.data.length} | Páginas: ${result.pages}\n`);

  // 2. Map conversations
  const convs = result.data.map(c => {
    const parts = c.participants?.data || [];
    const other = parts.find(p => p.username !== 'byericsantos');
    return {
      id: c.id,
      username: other?.username || '?',
      updated: c.updated_time,
    };
  }).filter(c => !EXCLUDE_USERNAMES.includes(c.username));

  console.log(`Conversas de prospecção (excluindo clientes/amigos): ${convs.length}\n`);

  // 3. Extract messages from each
  const allConversations = [];
  let processed = 0;

  for (const conv of convs) {
    processed++;
    process.stdout.write(`[${processed}/${convs.length}] ${conv.username}...`);

    try {
      const msgs = await ig.getMessages(conv.id, 20);
      if (msgs.success && msgs.data.length > 0) {
        const ordered = msgs.data.reverse();
        const messages = ordered.map(m => ({
          from: m.from?.username || '?',
          text: m.message || null,
          isEric: m.from?.username === 'byericsantos',
        }));

        // Classify conversation
        const ericMsgs = messages.filter(m => m.isEric);
        const prospectMsgs = messages.filter(m => !m.isEric);
        const prospectResponded = prospectMsgs.length > 0;
        const prospectTextMsgs = prospectMsgs.filter(m => m.text && m.text.length > 5);

        allConversations.push({
          username: conv.username,
          totalMessages: messages.length,
          ericMessages: ericMsgs.length,
          prospectMessages: prospectMsgs.length,
          prospectResponded,
          prospectEngaged: prospectTextMsgs.length >= 2,
          messages,
        });

        const status = prospectEngaged(prospectTextMsgs) ? 'ENGAGED' : prospectResponded ? 'RESPONDED' : 'NO-REPLY';
        console.log(` ${messages.length} msgs | ${status}`);
      } else {
        console.log(' (no messages)');
      }
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  function prospectEngaged(textMsgs) {
    return textMsgs.length >= 2;
  }

  // 4. Classify and save
  const engaged = allConversations.filter(c => c.prospectEngaged);
  const responded = allConversations.filter(c => c.prospectResponded && !c.prospectEngaged);
  const noReply = allConversations.filter(c => !c.prospectResponded);

  const output = {
    meta: {
      extractedAt: new Date().toISOString(),
      totalConversations: allConversations.length,
      engaged: engaged.length,
      responded: responded.length,
      noReply: noReply.length,
    },
    engaged,
    responded,
    noReply,
  };

  const outputPath = '/tmp/ig-prospecting-analysis.json';
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log('\n=== SUMMARY ===');
  console.log(`Total: ${allConversations.length}`);
  console.log(`ENGAGED (2+ responses): ${engaged.length}`);
  console.log(`RESPONDED (1 response): ${responded.length}`);
  console.log(`NO REPLY: ${noReply.length}`);
  console.log(`\nSaved to: ${outputPath}`);

  // 5. Print engaged conversations for analysis
  console.log('\n\n=== ENGAGED CONVERSATIONS ===');
  for (const conv of engaged) {
    console.log(`\n--- ${conv.username} (${conv.totalMessages} msgs) ---`);
    for (const m of conv.messages) {
      const prefix = m.isEric ? '>>> ERIC: ' : '<<< PROSPECT: ';
      console.log(prefix + (m.text || '(media/reaction)'));
    }
  }

  console.log('\n\n=== RESPONDED (but not deeply engaged) ===');
  for (const conv of responded) {
    console.log(`\n--- ${conv.username} (${conv.totalMessages} msgs) ---`);
    for (const m of conv.messages) {
      const prefix = m.isEric ? '>>> ERIC: ' : '<<< PROSPECT: ';
      console.log(prefix + (m.text || '(media/reaction)'));
    }
  }

  console.log('\n\n=== NO REPLY (Eric only) ===');
  for (const conv of noReply) {
    console.log(`\n--- ${conv.username} (${conv.totalMessages} msgs) ---`);
    for (const m of conv.messages) {
      console.log('>>> ERIC: ' + (m.text || '(media/reaction)'));
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
