# 🎯 GHL Webhook Receiver - Guia de Configuração

## Visão Geral

O **GHL Webhook Receiver** é um servidor Express que recebe eventos em tempo real do GoHighLevel (conversas, mensagens, status) e os salva no banco de dados Supabase.

```
GoHighLevel (GHL) → Webhook → ghl-webhook-server.js → Supabase Database
```

---

## 📋 Pré-requisitos

- ✅ Node.js 18+ instalado
- ✅ Projeto com Supabase configurado (`.env` com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`)
- ✅ Conta GoHighLevel com acesso ao Developer Marketplace
- ✅ URL pública para receber webhooks (ngrok em dev, domínio real em prod)

---

## 🔧 Configuração Passo a Passo

### 1️⃣ Obter Credenciais do GHL

#### A. Gerar Access Token

**Via OAuth 2.0 (Recomendado para produção):**
1. Acesse: https://marketplace.gohighlevel.com/
2. Clique em **"Create App"**
3. Preencha detalhes básicos
4. Em **OAuth Redirect URLs**, adicione: `http://localhost:3000/oauth/callback` (ou seu domínio)
5. Em **Scopes**, selecione:
   - ✅ `conversations.readonly` (ler conversas)
   - ✅ `conversations.write` (atualizar conversas)
   - ✅ `conversations/message.readonly` (ler mensagens)
   - ✅ `conversations/message.write` (enviar mensagens)
6. Copie **Client ID** e **Client Secret**
7. Gere **Access Token** via OAuth flow

**Via Private Integration Token (Simples, para um único sub-account):**
1. Em sua conta GHL, acesse: **Settings → Integrations**
2. Clique em **"Create Private Integration"**
3. Preencha nome da app
4. Em **Scopes**, selecione as mesmas acima
5. Copie o token gerado (formato: `pit-xxxxx`)

#### B. Gerar Webhook Secret

1. No Developer Marketplace, vá para sua App
2. Acesse **Webhooks** ou **Webhook Configuration**
3. Gere um novo **Webhook Secret**
4. Copie e guarde com segurança

### 2️⃣ Configurar Variáveis de Ambiente

Edite `.env` e adicione:

```bash
# GoHighLevel (GHL) Webhook Configuration
GHL_ACCESS_TOKEN=pit-xxxxxxxxxxxxxxxx  # ou seu OAuth token
GHL_WEBHOOK_SECRET=whsec_xxxxxxxx      # webhook secret
GHL_PORT=3004                           # porta do servidor
GHL_WEBHOOK_URL=https://seu-dominio.com/webhook  # URL pública
GHL_LOCATION_ID=                        # opcional
```

**Importante:** Nunca commitar `.env` com credenciais sensíveis!

### 3️⃣ Criar Tabelas no Supabase

Execute no Editor SQL do Supabase:

```sql
-- Tabela de conversas
CREATE TABLE ghl_conversations (
  id BIGSERIAL PRIMARY KEY,
  conversation_id TEXT UNIQUE NOT NULL,
  contact_id TEXT,
  status TEXT DEFAULT 'active',
  type TEXT DEFAULT 'sms',
  last_message_date TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de mensagens
CREATE TABLE ghl_messages (
  id BIGSERIAL PRIMARY KEY,
  message_id TEXT UNIQUE NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES ghl_conversations(conversation_id),
  body TEXT NOT NULL,
  from_number TEXT,
  to_number TEXT,
  timestamp TIMESTAMPTZ,
  direction TEXT DEFAULT 'inbound',
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY(conversation_id) REFERENCES ghl_conversations(conversation_id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_conversations_created ON ghl_conversations(created_at DESC);
CREATE INDEX idx_messages_conversation ON ghl_messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON ghl_messages(timestamp DESC);
CREATE INDEX idx_unread_conversations ON ghl_conversations(unread_count) WHERE unread_count > 0;
```

### 4️⃣ Registrar Webhook no GHL

1. No Developer Marketplace, vá para sua App
2. Acesse **Webhooks**
3. Clique em **"Add Webhook"** ou **"Register Webhook"**
4. Preencha:
   - **Webhook URL**: `https://seu-dominio.com/webhook` (ou ngrok em dev)
   - **Webhook Secret**: (mesmo secret do passo 2)
   - **Events**: Selecione:
     - ✅ `InboundMessage`
     - ✅ `OutboundMessage`
     - ✅ `ConversationUnread`
5. Salve e ative

### 5️⃣ Verificar Database

O servidor cria automaticamente:
- **Arquivo**: `docs/banco-dados-geral/ghl-conversations.db` (SQLite)
- **Tabelas**: `ghl_conversas`, `ghl_mensagens`
- **FTS5**: Busca full-text integrada em `ghl_mensagens_fts`
- **Índices**: Otimizados para performance

Nenhuma configuração adicional necessária!

### 6️⃣ Iniciar o Servidor

```bash
# Start
./meu-projeto/start-ghl.sh start

# Status
./meu-projeto/start-ghl.sh status

# Logs em tempo real
./meu-projeto/start-ghl.sh logs
```

**Output esperado:**
```
╔════════════════════════════════════════╗
║   🎯 GHL Webhook Receiver Started      ║
╠════════════════════════════════════════╣
║   Port: 3004                           ║
║   Status: ✅ Ready                      ║
║   Endpoint: /webhook                   ║
║   API: /api/*                          ║
╚════════════════════════════════════════╝
```

---

## 📡 Testando Webhook

### Método 1: Usar ngrok para dev

```bash
# Terminal 1: Iniciar servidor local
./meu-projeto/start-ghl.sh start

# Terminal 2: Criar túnel ngrok
ngrok http 3004

# Copiar URL gerada (ex: https://abc123.ngrok.io)
# Usar como GHL_WEBHOOK_URL em .env
# Registrar webhook em https://abc123.ngrok.io/webhook
```

### Método 2: Testar com curl

```bash
# Simular evento de mensagem
curl -X POST http://localhost:3004/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "Message": {
        "id": "msg-123",
        "conversationId": "conv-456",
        "body": "Teste de mensagem",
        "from": "5511999999999",
        "to": "5511988888888",
        "timestamp": 1234567890,
        "type": "inbound"
      }
    }
  }'

# Resposta esperada:
# {"success": true}
```

---

## 🔌 API Endpoints

O servidor expõe endpoints para gerenciar os dados:

### Conversas

```bash
# Listar conversas
GET /api/conversations?limit=50&offset=0

# Buscar conversa específica
GET /api/conversations/{conversationId}

# Marcar como lida
POST /api/conversations/{conversationId}/read

# Listar conversas não lidas
GET /api/unread
```

### Mensagens

```bash
# Buscar mensagens de uma conversa
GET /api/conversations/{conversationId}/messages?limit=50
```

### Sistema

```bash
# Estatísticas
GET /api/stats

# Health check
GET /
```

**Exemplo de resposta:**

```bash
curl http://localhost:3004/api/stats

{
  "success": true,
  "conversations": 42,
  "messages": 1250
}
```

---

## 🔐 Validação de Assinatura

O servidor valida automaticamente assinaturas de webhook do GHL usando HMAC-SHA256.

**Flow:**
1. GHL assina o payload com `X-GHL-Signature` header
2. Servidor recalcula assinatura usando `GHL_WEBHOOK_SECRET`
3. Se não bater, rejeita com `401 Unauthorized`

Para desabilitar em dev (não recomendado):
```javascript
// Em ghl-webhook-server.js, comentar validação:
// if (GHL_WEBHOOK_SECRET) { ... }
```

---

## 🛠️ Troubleshooting

### ❌ "Webhook signature validation failed"

**Causa:** Secret incorreto ou payload corrompido

**Solução:**
```bash
# Verificar se GHL_WEBHOOK_SECRET está no .env
echo $GHL_WEBHOOK_SECRET

# Verificar se é idêntico ao registrado em GHL
# Settings → Webhooks → View Secret
```

### ❌ "Database operations failed"

**Causa:** SQLite não conseguiu acessar pasta ou criar banco

**Solução:**
```bash
# Verificar se a pasta existe
ls -la docs/banco-dados-geral/

# Testar conexão
curl -X GET http://localhost:3004/api/stats

# Se falhar, logs mostram erro:
./meu-projeto/start-ghl.sh logs

# Resetar banco (apagar e recriar):
rm -f docs/banco-dados-geral/ghl-conversations.db*
./meu-projeto/start-ghl.sh restart
```

### ❌ "ECONNREFUSED"

**Causa:** Servidor não está rodando ou porta errada

**Solução:**
```bash
# Verificar se está rodando
./meu-projeto/start-ghl.sh status

# Reiniciar
./meu-projeto/start-ghl.sh restart

# Verificar porta
lsof -i :3004  # macOS/Linux
netstat -ano | findstr :3004  # Windows
```

### ❌ GHL não envia webhook

**Causa 1:** URL não registrada corretamente
- Ir a Developer Marketplace → Webhooks
- Verificar se URL está https (ngrok ou domínio real)
- Testar com curl se URL responde

**Causa 2:** Eventos não selecionados
- Ir a Webhooks → Events
- Garantir `InboundMessage` + `OutboundMessage` ativados

**Causa 3:** App não tem permissões
- Verificar Scopes em OAuth: `conversations.readonly` + `conversations/message.readonly`

---

## 📊 Monitorando Webhooks

### Ver logs em tempo real

```bash
./meu-projeto/start-ghl.sh logs
```

**Output esperado:**
```
📨 Webhook recebido: message
💬 Mensagem: "Olá, como vai?"
✅ Mensagem salva com sucesso

🔔 Conversa conv-456: 1 não lida(s)
✅ Status de leitura atualizado
```

### Dashboard de Estatísticas

```bash
# Query Supabase
curl http://localhost:3004/api/stats

# ou via Supabase dashboard
# https://app.supabase.com → seu projeto → SQL Editor
# SELECT COUNT(*) FROM ghl_conversations;
# SELECT COUNT(*) FROM ghl_messages;
```

---

## 🔄 Integração com Outros Agentes

### Usar com @account (Nico)

Estender `whatsapp-agent-server.js` para também buscar conversas do GHL:

```javascript
// Em whatsapp-agent-server.js
const axios = require('axios');

async function getGHLConversations() {
  const res = await axios.get('http://localhost:3004/api/conversations');
  return res.data;
}

app.get('/api/conversations/all', async (req, res) => {
  const whatsapp = await getWhatsAppConversations();
  const ghl = await getGHLConversations();
  res.json({ whatsapp, ghl });
});
```

### Integração com Polling Fallback

Se webhooks falharem, implementar polling:

```javascript
// Polling a cada hora para sincronizar
setInterval(async () => {
  const conversations = await ghlDB.getAllConversations();
  console.log(`✅ Sync completado: ${conversations.data.length} conversas`);
}, 60 * 60 * 1000);
```

---

## 📝 Próximas Etapas

- [ ] Testar webhook com evento real do GHL
- [ ] Implementar autenticação nos endpoints `/api/*`
- [ ] Criar dashboard para visualizar conversas
- [ ] Implementar busca e filtros avançados
- [ ] Sincronizar com agentes (@account, @copy-chef)
- [ ] Implementar retry logic com fila
- [ ] Adicionar notificações em tempo real (socket.io, webhooks internos)

---

## 📚 Referências

- [GoHighLevel API Docs](https://marketplace.gohighlevel.com/docs/)
- [Webhook Integration Guide](https://marketplace.gohighlevel.com/docs/webhook/)
- [Conversations API](https://marketplace.gohighlevel.com/docs/ghl/conversations/conversations/)
- [OAuth 2.0 Setup](https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0/)

---

**Status:** ✅ Webhook Receiver Implementado e Pronto para Uso

💻 — Dex, sempre construindo 🔨
