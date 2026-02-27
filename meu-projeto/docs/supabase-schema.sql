-- Schema para histórico de tarefas criadas pelo bot Telegram-ClickUp
-- Execute este SQL no Supabase SQL Editor (https://supabase.com/dashboard)

CREATE TABLE IF NOT EXISTS task_history (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_chat_id TEXT NOT NULL,
  message_type    TEXT NOT NULL CHECK (message_type IN ('text', 'voice')),
  original_text   TEXT NOT NULL,
  task_title      TEXT,
  clickup_task_id TEXT,
  clickup_task_url TEXT,
  status          TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message   TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index para consultas por chat
CREATE INDEX IF NOT EXISTS idx_task_history_chat_id ON task_history (telegram_chat_id);

-- Index para consultas por data
CREATE INDEX IF NOT EXISTS idx_task_history_created_at ON task_history (created_at DESC);

-- RLS (Row Level Security) — habilitar se usar ANON key
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- Política: service_role pode tudo; anon pode inserir
CREATE POLICY "Allow inserts from bot" ON task_history
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow select for authenticated" ON task_history
  FOR SELECT
  USING (true);
