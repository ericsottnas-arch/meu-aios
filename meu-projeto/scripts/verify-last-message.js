// meu-projeto/scripts/verify-last-message.js
const path = require('path');
const fs = require('fs');

// Carregamento de .env (produção usa env vars do sistema)
if (process.env.NODE_ENV !== 'production') {
  const localEnv = path.resolve(__dirname, '..', '.env'); // .env na raiz de meu-projeto
  const parentEnv = path.resolve(__dirname, '..', '..', '.env'); // .env na raiz de meu-aios
  if (fs.existsSync(localEnv)) {
    require('dotenv').config({ path: localEnv });
    console.log(`Loaded .env from ${localEnv}`);
  } else if (fs.existsSync(parentEnv)) {
    require('dotenv').config({ path: parentEnv });
    console.log(`Loaded .env from ${parentEnv}`);
  } else {
    require('dotenv').config();
    console.log('Loaded .env from default path');
  }
}

const supabase = require('../lib/supabaseClient');

async function checkLastMessage() {
  if (!supabase) {
    console.error('❌ Cliente Supabase não está configurado. Verifique suas variáveis de ambiente (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) em .env');
    return;
  }

  console.log('🔍 Buscando a última mensagem salva no Supabase...');

  try {
    const { data, error } = await supabase
      .from('conversas_whatsapp')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Erro ao buscar dados do Supabase:', error.message);
      if (error.details) console.error('   Detalhes:', error.details);
      if (error.hint) console.error('   Dica:', error.hint);
      return;
    }

    if (data && data.length > 0) {
      const message = data[0];
      console.log('\n✅ Última mensagem encontrada:');
      console.log('---------------------------------');
      console.log(`  De: ${message.sender_name} (${message.sender_id})`);
      console.log(`  Em: ${new Date(message.created_at).toLocaleString('pt-BR')}`);
      console.log(`  Tipo: ${message.message_type}`);
      console.log(`  Conteúdo: ${message.content || 'N/A'}`);
      console.log('---------------------------------');
    } else {
      console.log('-> Nenhum registro encontrado na tabela "conversas_whatsapp".');
    }
  } catch (err) {
    console.error('❌ Uma exceção ocorreu ao tentar conectar com o Supabase:', err.message);
  }
}

checkLastMessage();
