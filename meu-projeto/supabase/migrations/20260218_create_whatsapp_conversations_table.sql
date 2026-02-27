-- Tabela para armazenar todas as mensagens recebidas via webhook do WhatsApp
CREATE TABLE IF NOT EXISTS conversas_whatsapp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    sender_id TEXT,
    sender_name TEXT,
    is_from_me BOOLEAN NOT NULL DEFAULT FALSE,
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    content TEXT,
    message_type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    raw_payload JSONB,

    -- Metadados adicionais
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- Para otimizar buscas por chat e data
CREATE INDEX idx_conversas_whatsapp_chat_id ON conversas_whatsapp (chat_id);
CREATE INDEX idx_conversas_whatsapp_timestamp ON conversas_whatsapp (timestamp DESC);

COMMENT ON TABLE conversas_whatsapp IS 'Armazena cada mensagem recebida do WhatsApp para análise e histórico.';
COMMENT ON COLUMN conversas_whatsapp.id IS 'Identificador único da linha (PK).';
COMMENT ON COLUMN conversas_whatsapp.message_id IS 'ID original da mensagem fornecido pelo WhatsApp/Stevo.';
COMMENT ON COLUMN conversas_whatsapp.chat_id IS 'JID do chat (grupo ou usuário).';
COMMENT ON COLUMN conversas_whatsapp.sender_id IS 'JID de quem enviou a mensagem.';
COMMENT ON COLUMN conversas_whatsapp.sender_name IS 'Nome de exibição (PushName) do remetente.';
COMMENT ON COLUMN conversas_whatsapp.is_from_me IS 'Verdadeiro se a mensagem foi enviada pela instância do bot.';
COMMENT ON COLUMN conversas_whatsapp.is_group IS 'Verdadeiro se a mensagem foi enviada em um grupo.';
COMMENT ON COLUMN conversas_whatsapp.content IS 'Conteúdo de texto da mensagem (inclui legendas e transcrições).';
COMMENT ON COLUMN conversas_whatsapp.message_type IS 'Tipo de mensagem (ex: text, audio, image, etc.).';
COMMENT ON COLUMN conversas_whatsapp.timestamp IS 'Data e hora em que a mensagem original foi enviada.';
COMMENT ON COLUMN conversas_whatsapp.raw_payload IS 'Objeto JSON completo do webhook para fins de depuração e futuras análises.';
COMMENT ON COLUMN conversas_whatsapp.created_at IS 'Data e hora em que o registro foi inserido no banco de dados.';

-- Habilitar a política de segurança de nível de linha (RLS)
ALTER TABLE conversas_whatsapp ENABLE ROW LEVEL SECURITY;

-- Permitir acesso total para a role `service_role`, que a API usará
-- Isso é seguro porque apenas seu backend, com a chave de serviço, pode usar essa role.
CREATE POLICY "Allow full access for service_role"
ON conversas_whatsapp
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- (Opcional) Se você precisar ler esses dados de um aplicativo de frontend no futuro,
-- você pode criar uma política mais restritiva para usuários autenticados.
-- Exemplo:
-- CREATE POLICY "Allow individual read access"
-- ON conversas_whatsapp
-- FOR SELECT
-- USING (auth.uid() = user_id);
