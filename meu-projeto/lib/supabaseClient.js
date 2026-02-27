// lib/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');

// As variáveis de ambiente já são carregadas no ponto de entrada principal do servidor.
const supabaseUrl = process.env.SUPABASE_URL;
// Usamos a SERVICE_ROLE_KEY para operações de backend, pois ela pode ignorar as políticas de RLS.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    '⚠️  Atenção: As variáveis de ambiente do Supabase (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY) não foram definidas.'
  );
  console.warn('As mensagens do WhatsApp NÃO serão salvas no banco de dados.');
} else {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      // Impede que o cliente tente gerenciar o estado do usuário (não necessário para service_role)
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

module.exports = supabase;
