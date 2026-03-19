# ⚡ GHL Webhook Receiver - Quick Start

## 30 Segundos para Começar

### 1. Configurar .env
```bash
GHL_ACCESS_TOKEN=pit-xxxxx          # Seu token GHL
GHL_WEBHOOK_SECRET=whsec_xxxxx      # Seu webhook secret
GHL_WEBHOOK_URL=https://seu-site.com/webhook
```

### 2. Database SQLite

Pronto! O servidor cria automaticamente em:
```
docs/banco-dados-geral/ghl-conversations.db
```

Tabelas criadas automaticamente:
- `ghl_conversas` - conversas com índices
- `ghl_mensagens` - mensagens com timestamps
- `ghl_mensagens_fts` - busca full-text (FTS5)

### 3. Iniciar servidor
```bash
./meu-projeto/start-ghl.sh start

# Verificar status
./meu-projeto/start-ghl.sh status
```

### 4. Registrar webhook em GHL
- URL: `https://seu-site.com/webhook`
- Secret: (mesmo de GHL_WEBHOOK_SECRET)
- Events: `InboundMessage`, `OutboundMessage`, `ConversationUnread`

### 5. Testar
```bash
# Via curl
curl -X POST http://localhost:3004/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "Message": {
        "id": "msg-123",
        "conversationId": "conv-456",
        "body": "Test",
        "from": "5511999999999",
        "to": "5511988888888",
        "timestamp": 1234567890,
        "type": "inbound"
      }
    }
  }'

# Via API
curl http://localhost:3004/api/stats
```

---

## 📍 Arquivos Criados

```
meu-projeto/
├── ghl-webhook-server.js           # Servidor Express principal
├── lib/
│   ├── ghl-webhook-validator.js    # Validação de assinatura
│   └── ghl-db.js                   # Database Supabase
├── start-ghl.sh                    # Script start/stop/restart
├── GHL-WEBHOOK-SETUP.md            # Guia completo de configuração
└── GHL-QUICK-START.md              # Este arquivo
```

---

## 🔌 Endpoints Disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Health check |
| POST | `/webhook` | Receber webhooks do GHL |
| GET | `/api/conversations` | Listar conversas |
| GET | `/api/conversations/:id` | Buscar conversa |
| GET | `/api/conversations/:id/messages` | Buscar mensagens |
| GET | `/api/unread` | Conversas não lidas |
| POST | `/api/conversations/:id/read` | Marcar como lida |
| GET | `/api/stats` | Estatísticas |

---

## 🚀 Dev Setup com ngrok

```bash
# Terminal 1
./meu-projeto/start-ghl.sh start

# Terminal 2
ngrok http 3004
# → https://abc123.ngrok.io

# Configurar em .env
GHL_WEBHOOK_URL=https://abc123.ngrok.io/webhook
GHL_WEBHOOK_SECRET=seu_secret

# Registrar em GHL Dashboard
```

---

## 📋 Comandos

```bash
./meu-projeto/start-ghl.sh start     # Iniciar
./meu-projeto/start-ghl.sh stop      # Parar
./meu-projeto/start-ghl.sh restart   # Reiniciar
./meu-projeto/start-ghl.sh status    # Status + logs recentes
./meu-projeto/start-ghl.sh logs      # Logs em tempo real
```

---

## ✅ Checklist

- [ ] .env configurado com GHL_ACCESS_TOKEN e GHL_WEBHOOK_SECRET
- [ ] Tabelas criadas no Supabase
- [ ] Servidor iniciado: `./start-ghl.sh start`
- [ ] Webhook registrado em GHL Dashboard
- [ ] Teste com curl retorna `{"success": true}`
- [ ] Logs mostram `✅ Mensagem salva com sucesso`

---

## 🆘 Não funciona?

1. Verificar `.env`: `echo $GHL_WEBHOOK_SECRET`
2. Ver logs: `./start-ghl.sh logs`
3. Verificar Supabase: `curl http://localhost:3004/api/stats`
4. Testar webhook URL em GHL: Settings → Webhooks → Test

---

**Para mais detalhes:** Veja `GHL-WEBHOOK-SETUP.md`

💻 — Dex, sempre construindo 🔨
