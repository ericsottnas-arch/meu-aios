# 🚀 Guia de Configuração - Integração GHL

## 1️⃣ Obter suas credenciais GHL

### Passo 1: Access Token
1. Acesse: https://app.gohighlevel.com/settings/api
2. Clique em **"Create API Key"** (ou use uma existente)
3. Copie o token (começa com `pit_` ou `pat_`)
4. Guarde em local seguro

### Passo 2: Webhook Secret
1. Vá para: Settings → Webhooks
2. Crie um novo webhook
3. Copie o **secret** (começa com `whsec_`)

### Passo 3: Location ID (opcional)
1. Em Settings, copie seu **Location ID**
2. Necessário para algumas APIs específicas

---

## 2️⃣ Configurar .env

Abra ou crie `.meu-aios/.env`:

```bash
# GoHighLevel API
GHL_ACCESS_TOKEN=pit_xxxxx_seu_token_aqui
GHL_WEBHOOK_SECRET=whsec_xxxxx_seu_secret_aqui
GHL_LOCATION_ID=seu_location_id_aqui
GHL_PORT=3004
GHL_WEBHOOK_URL=https://seu-dominio.com/webhook
```

**Segurança:**
- ⚠️ **NUNCA** faça commit de `.env`
- Mantenha em `.gitignore`
- Use credenciais limitadas em produção

---

## 3️⃣ Verificar configuração

```bash
# Testar credenciais
node meu-projeto/ghl-reader.js test

# Se funcionar, você verá:
# ✅ Conexão bem-sucedida!
```

---

## 4️⃣ Registrar webhook em GHL

Se você tem um domínio público ou ngrok:

### Opção A: Domínio de produção
```
URL: https://seu-dominio.com/webhook
Secret: (mesmo que em GHL_WEBHOOK_SECRET)
Events: InboundMessage, OutboundMessage, ConversationUnread
```

### Opção B: Desenvolvimento com ngrok
```bash
# Terminal 1: Iniciar servidor
./meu-projeto/start-ghl.sh start

# Terminal 2: Criar tunnel ngrok
ngrok http 3004
# Você verá: https://abc123.ngrok.io

# Registrar webhook com:
URL: https://abc123.ngrok.io/webhook
Secret: (seu GHL_WEBHOOK_SECRET)
```

---

## 5️⃣ Usar o leitor de mensagens

### Testar conexão
```bash
node meu-projeto/ghl-reader.js test
```

### Listar conversas (local)
```bash
node meu-projeto/ghl-reader.js list
```

### Ver mensagens de uma conversa
```bash
node meu-projeto/ghl-reader.js messages "conversation-id-aqui"
```

### Sincronizar do GHL
```bash
node meu-projeto/ghl-reader.js sync
```

### Buscar mensagens
```bash
node meu-projeto/ghl-reader.js search "palavra-chave"
```

### Ver conversas não lidas
```bash
node meu-projeto/ghl-reader.js unread
```

---

## 6️⃣ Iniciar servidor webhook

Se você quer receber mensagens em tempo real:

```bash
# Iniciar
./meu-projeto/start-ghl.sh start

# Verificar status
./meu-projeto/start-ghl.sh status

# Ver logs
./meu-projeto/start-ghl.sh logs

# Parar
./meu-projeto/start-ghl.sh stop
```

---

## 📊 Arquitetura

```
┌─────────────────────────────────────────┐
│          GoHighLevel (Nuvem)            │
│  - API REST                             │
│  - Webhooks                             │
└──────────────┬──────────────────────────┘
               │ (webhooks)
               ▼
┌─────────────────────────────────────────┐
│    GHL Webhook Server (porta 3004)      │
│  - Recebe eventos em tempo real         │
│  - Valida assinatura webhook            │
│  - Salva no SQLite                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      SQLite Database (local)            │
│  - ghl_conversas                        │
│  - ghl_mensagens                        │
│  - ghl_mensagens_fts (busca)            │
└─────────────────────────────────────────┘
               ▲
               │ (queries)
               │
┌──────────────┴──────────────────────────┐
│    ghl-reader.js (CLI + API)            │
│  - test, list, messages, sync, search   │
└─────────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### ❌ "API Key não configurado"
```bash
# Verifique .env
echo $GHL_ACCESS_TOKEN

# Se vazio, configure:
export GHL_ACCESS_TOKEN="pit_xxxxx"
```

### ❌ "Conexão recusada no webhook"
1. Verifique se servidor está rodando: `./start-ghl.sh status`
2. Confirme porta 3004 está aberta
3. Para ngrok: `ngrok http 3004` deve estar ativo

### ❌ "Nenhuma mensagem aparece"
1. Verifique webhook registrado em GHL
2. Envie mensagem de teste via GHL
3. Veja logs: `./start-ghl.sh logs`
4. Base de dados: `docs/banco-dados-geral/ghl-conversations.db`

### ❌ "Erro de validação de assinatura"
```bash
# Verifique se GHL_WEBHOOK_SECRET está correto
echo $GHL_WEBHOOK_SECRET
```

---

## 📱 Próximos passos

- [ ] Copiar credentials GHL
- [ ] Configurar `.env`
- [ ] Testar conexão: `node ghl-reader.js test`
- [ ] Registrar webhook em GHL
- [ ] Iniciar servidor: `./start-ghl.sh start`
- [ ] Enviar mensagem de teste via GHL
- [ ] Verificar com: `node ghl-reader.js list`

---

## 🎯 Casos de uso

```bash
# Monitor de mensagens não lidas
watch -n 5 'node meu-projeto/ghl-reader.js unread'

# Buscar cliente específico
node meu-projeto/ghl-reader.js search "Dr. Erico"

# Exportar conversa
node meu-projeto/ghl-reader.js messages "conv-123" > conversa.txt

# Dashboard em tempo real
./start-ghl.sh start && sleep 2 && node meu-projeto/ghl-reader.js list
```

---

💻 — Dex, sempre construindo 🔨
