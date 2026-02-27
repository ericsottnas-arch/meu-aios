/**
 * Cliente Supabase para logging de tarefas.
 * Se SUPABASE_URL não estiver configurada, todas as chamadas são no-op.
 * Nunca quebra o bot — erros de logging são silenciosamente logados no console.
 */

let supabase = null;

function getClient() {
  if (supabase !== undefined && supabase !== null) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    supabase = null;
    return null;
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(url, key);
    return supabase;
  } catch (err) {
    console.warn('⚠️  Supabase client not available:', err.message);
    supabase = null;
    return null;
  }
}

/**
 * Registra uma criação de tarefa no histórico.
 * No-op se Supabase não estiver configurado.
 *
 * @param {Object} data
 * @param {string} data.telegram_chat_id
 * @param {string} data.message_type - 'text' | 'voice'
 * @param {string} data.original_text
 * @param {string} [data.task_title]
 * @param {string} [data.clickup_task_id]
 * @param {string} [data.clickup_task_url]
 * @param {string} data.status - 'success' | 'error'
 * @param {string} [data.error_message]
 * @param {Object} [data.metadata]
 */
async function logTaskCreation(data) {
  const client = getClient();
  if (!client) return;

  try {
    const { error } = await client.from('task_history').insert({
      telegram_chat_id: data.telegram_chat_id,
      message_type: data.message_type,
      original_text: data.original_text,
      task_title: data.task_title || null,
      clickup_task_id: data.clickup_task_id || null,
      clickup_task_url: data.clickup_task_url || null,
      status: data.status,
      error_message: data.error_message || null,
      metadata: data.metadata || null,
    });

    if (error) {
      console.warn('⚠️  Supabase log error:', error.message);
    }
  } catch (err) {
    console.warn('⚠️  Supabase log failed:', err.message);
  }
}

module.exports = { logTaskCreation };
