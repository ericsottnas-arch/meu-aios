# 🔧 Corrigindo Token GHL - Erro 404

## O que aconteceu

```
❌ Status: 404 - Not found
```

Você passou um token que funciona em alguns contextos, mas **não funciona para a API REST de conversações**.

## 🎯 Soluções

### Opção 1: Usar dados locais (recomendado para agora) ✅

Você **JÁ TEM MENSAGENS ARMAZENADAS** no banco local:

```bash
# Ver conversas
node ghl-reader.js list

# Ver mensagens
node ghl-reader.js messages "conv-001"

# Buscar texto
node ghl-reader.js search "palavra"
```

**Vantagem:** Funciona agora, sem precisar de token válido!

---

### Opção 2: Obter um API Token válido (para sincronizar do GHL)

O token que você passou pode ser:
- ❌ Um **webhook secret** (para receber, não para chamar)
- ❌ Um **token de outro tipo** (session, user token)
- ❌ Um **token expirado ou inválido**

**Para obter um API Token válido:**

#### Método A: OAuth Token (Recomendado)

1. Acesse: **https://app.gohighlevel.com/settings/integrations/api**
2. Clique em **"Create API Token"** ou **"Generate New Token"**
3. Selecione **"OAuth Token"**
4. Copie o token (começa com `pat_` ou `oauth_`)
5. Configure em `.env`:

```bash
GHL_API_KEY=pat_seu_novo_token_aqui
```

#### Método B: Verificar token existente

1. Vá em: **https://app.gohighlevel.com/settings/integrations/api**
2. Procure por **"API Keys"** ou **"Tokens"**
3. Copie o token (deve começar com `pat_`)

---

## 📍 Diferenças de Tokens GHL

| Token | Formato | Uso | Status |
|-------|---------|-----|--------|
| API Token | `pat_xxxx` | Chamar APIs | ✅ Teste primeiro |
| OAuth Token | `oauth_xxxx` | Apps OAuth | ✅ Use se disponível |
| Webhook Secret | `whsec_xxxx` | Receber webhooks | ❌ Não funciona em chamadas |
| Session Token | `sess_xxxx` | Dashboard | ❌ Não funciona |
| Seu token | `pit_xxxx` | ??? | ❌ Retorna 404 |

---

## 🚀 Próximas ações

### Agora (dados locais)
```bash
# Ver o que já tem
node ghl-reader.js list
node ghl-reader.js unread
node ghl-reader.js search "sua busca"
```

### Quando tiver token válido
```bash
# Sincronizar do GHL (pull de conversas)
node ghl-reader.js sync

# Depois ver
node ghl-reader.js list
```

---

## 📞 Se ainda não funcionar

1. **Verifique em GHL:**
   - Você está em qual conta? (Location ID?)
   - Qual é o seu role? (Admin, Editor, etc)
   - O token está ativo?

2. **Teste manualmente:**
```bash
# Cole seu novo token aqui
curl -H "Authorization: Bearer SEU_NOVO_TOKEN" \
  "https://rest.gohighlevel.com/v1/conversations?limit=1"

# Se funcionar, deve retornar:
# {"conversations": [...], "total": X}
```

3. **Se ainda 404:**
   - O token pode ser para uma location específica
   - Pode precisar de `Location-Id` header
   - Verifique docs GHL: https://docs.gohighlevel.com/

---

## 💡 Alternativa: Usar dados que receber via webhook

Se você **ativar o servidor webhook**, as mensagens **chegam em tempo real** sem precisar de API token:

```bash
# Iniciar servidor (porta 3004)
./start-ghl.sh start

# Em GHL Dashboard, registre webhook:
# URL: https://seu-dominio.com/webhook (ou ngrok)
# Secret: seu GHL_WEBHOOK_SECRET
# Events: InboundMessage, OutboundMessage

# Depois, qualquer mensagem entra automaticamente:
node ghl-reader.js list
```

---

## ✅ Checklist

- [ ] Tenho acesso ao GHL Dashboard
- [ ] Consegui listar conversas locais: `node ghl-reader.js list`
- [ ] Verifiquei meu API Token em https://app.gohighlevel.com/settings/integrations/api
- [ ] Testei novo token: `curl -H "Authorization: Bearer TOKEN" "https://rest.gohighlevel.com/v1/conversations?limit=1"`
- [ ] Se ainda não funciona, ativei webhook para receber dados em tempo real

---

💻 — Dex, sempre construindo 🔨
