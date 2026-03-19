# 🚀 COMECE AQUI: ActiveCampaign + Alpha Class

**Leia este arquivo PRIMEIRO**
**Tempo total: ~45 minutos**

---

## 📋 Fluxo Completo (O que vai acontecer)

```
PESSOA PREENCHE FORMULÁRIO
        ↓
        ├─→ ActiveCampaign: Contato criado
        │       ↓
        │   Contato adicionado à lista "Alunos Alpha Class"
        │       ↓
        │   AUTOMAÇÃO AC DISPARA
        │       ↓
        │   ├─→ WEBHOOK envia dados para seu servidor
        │   │       ↓
        │   │   Seu Node.js server recebe
        │   │       ↓
        │   │   Chama API AlpaClass (SSO)
        │   │       ↓
        │   │   Conta criada + URL SSO gerada
        │   │       ↓
        │   └─→ EMAIL enviado com link SSO
        │           ↓
        │       PESSOA CLICA NO LINK
        │           ↓
        │       LOGIN AUTOMÁTICO ✅
        │           ↓
        └───→ ACESSO LIBERADO 🎓
```

---

## ✅ CHECKLIST: Antes de Começar

Você precisa ter:

- [ ] Conta ActiveCampaign (login funcionando)
- [ ] Conta Alpha Class (login funcionando)
- [ ] Acesso para criar Webhooks no AC
- [ ] Node.js instalado (v14+) **OU** usar Heroku free
- [ ] 45 minutos de tempo disponível

**Não tem algo acima?** Pause aqui e configure.

---

## 📖 Guias Disponíveis

| Etapa | Guia | Tempo |
|-------|------|-------|
| **1. Setup no ActiveCampaign** | `ACTIVECAMPAIGN-SETUP-ALPHA-CLASS.md` | 20 min |
| **2. Setup do Servidor** | `ALPHA-CLASS-SETUP.md` | 20 min |
| **3. Testar Tudo** | `ALPHA-CLASS-SETUP.md` (Passo 6) | 5 min |

---

## 🎯 ORDEM RECOMENDADA: Fazer isso

### FASE 1️⃣: Preparar o Servidor (10 minutos)

> Você vai gerar um link que o AC vai chamar

**1.1 Gerar Token no Alpha Class**

```
Login em: app.alpaclass.com
Settings → API Tokens → Novo Token

Nome: "activecampaign-sso"
Permissões: ☑ Create, ☑ View

COPIAR O TOKEN (aparece só uma vez!)
Guardar seguro (LastPass, Notion, etc)
```

**1.2 Configurar Servidor Localmente**

```bash
# 1. Abrir terminal
cd meu-projeto

# 2. Criar arquivo .env
cat > .env << 'EOF'
ALPACLASS_TOKEN=cole_seu_token_aqui
PORT=3000
NODE_ENV=development
EOF

# 3. Instalar pacotes
npm install express axios dotenv

# 4. Testar localmente
npm run dev

# Você verá:
# ✅ Servidor iniciado com sucesso
# 📍 Endpoints:
#    • Webhook: POST http://localhost:3000/webhooks/ac-enrollment
```

**✅ Servidor rodando localmente!**

---

### FASE 2️⃣: Preparar Servidor em Produção (10 minutos)

> Você precisa de um link público para o AC chamar

**2.1 Opção A: Heroku (Recomendado)**

```bash
# 1. Criar conta em heroku.com (grátis)

# 2. Instalar Heroku CLI
brew tap heroku/brew && brew install heroku

# 3. Login
heroku login

# 4. Deploy
heroku create seu-app-alpha-class

# 5. Configurar variáveis
heroku config:set ALPACLASS_TOKEN=seu_token_aqui

# 6. Fazer push
git push heroku main

# 7. Testar
heroku logs --tail
```

**Seu endpoint público:**
```
https://seu-app-alpha-class.herokuapp.com/webhooks/ac-enrollment
```

**2.2 Opção B: Seu Próprio Servidor**

Se você já tem servidor (AWS, DigitalOcean, etc):

```bash
# SSH no servidor
ssh seu-servidor

# Clonar projeto
git clone seu-repo
cd meu-projeto

# Configurar .env com token
nano .env

# Instalar e rodar
npm install
npm start

# Usar PM2 para manter ativo
npm install -g pm2
pm2 start alpha-class-webhook-server.js
pm2 startup
pm2 save
```

**✅ Servidor em produção!**

---

### FASE 3️⃣: Configurar ActiveCampaign (20 minutos)

> Você vai criar lista, webhook, automação e email

**Referência Visual:** `ACTIVECAMPAIGN-VISUAL-GUIDE.md` (tem screenshots)
**Referência Completa:** `ACTIVECAMPAIGN-SETUP-ALPHA-CLASS.md`

#### 3.1 Criar Lista

```
Dashboard AC
  → Contacts
  → Lists
  → New List

Nome: "Alunos Alpha Class"
Descrição: "Contatos que recebem acesso automático"
```

#### 3.2 Criar Webhook

```
Settings (engrenagem)
  → Webhooks
  → Create Webhook

URL: https://seu-app-alpha-class.herokuapp.com/webhooks/ac-enrollment

Eventos: ☑ Contact Created
Campos: ☑ Email, ☑ First Name, ☑ Last Name, ☑ Phone
```

#### 3.3 Testar Webhook

```
Settings → Webhooks → [Seu Webhook]
Procure por: "Recent Deliveries"

Status deve ser ✅ (verde)
Se vermelho ❌: Verificar URL ou se servidor está ativo
```

#### 3.4 Criar Automação

```
Automations
  → New Automation

Nome: "Alpha Class - SSO Link"
```

**Adicionar Actions:**

1. **Start:** Contact Added to List "Alunos Alpha Class"
2. **Wait:** 1 minute (deixa webhook processar)
3. **Action 1:** Send Webhook (seu webhook do PASSO 3.2)
4. **Action 2:** Send Email (template abaixo)

#### 3.5 Template de Email

```
Assunto: 🎓 Seu acesso está pronto, {{firstName}}!

Corpo:
---

Olá {{firstName}},

Parabéns! 🎉

Seu acesso foi liberado. Clique no botão abaixo:

[BOTÃO AZUL] Acessar Conteúdo Agora
Link: {{sso_url}}

Este link é válido apenas para seu primeiro acesso.

Sucesso!
```

⚠️ **IMPORTANTE:** Use `{{sso_url}}` (com a variável exata do webhook)

#### 3.6 Ativar Automação

```
Status: ◉ Activated (não deixar em Draft)
```

**✅ ActiveCampaign configurado!**

---

### FASE 4️⃣: Testar Tudo (5 minutos)

#### 4.1 Criar Contato de Teste

```
AC Dashboard
  → Contacts
  → New Contact

Email: seu-teste@gmail.com
First Name: Teste
Last Name: Silva

[Save]
```

#### 4.2 Adicionar à Lista

```
Abrir contato
[+ Add to List] → "Alunos Alpha Class"
```

#### 4.3 Monitorar Webhook

```
Terminal:
heroku logs --tail

Você verá:
✅ SSO criado com sucesso
   - Email: seu-teste@gmail.com
   - URL SSO: https://minhaescola.alpaclass.com/sso/...
```

#### 4.4 Verificar Email

```
Abrir seu email de teste (seu-teste@gmail.com)

Você receberá email com:
- Assunto: "🎓 Seu acesso está pronto..."
- Botão com link SSO
```

#### 4.5 Testar Link

```
Clique no link do email

Você será redirecionado para Alpha Class
e fará login automaticamente ✅
```

**✅ Tudo funcionando!**

---

## 🎯 RESUMO RÁPIDO DOS PASSOS

```
┌─────────────────────────────────────────────────────────┐
│ FASE 1: Servidor Local (10 min)                         │
├─────────────────────────────────────────────────────────┤
│ □ Gerar token Alpha Class                              │
│ □ Criar .env com token                                 │
│ □ npm install + npm run dev                            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 2: Servidor Produção (10 min)                      │
├─────────────────────────────────────────────────────────┤
│ □ Deploy em Heroku (ou seu servidor)                   │
│ □ Testar endpoint público                              │
│ □ Nota a URL final                                     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 3: ActiveCampaign Setup (20 min)                   │
├─────────────────────────────────────────────────────────┤
│ □ Criar lista "Alunos Alpha Class"                     │
│ □ Criar webhook com URL do servidor                    │
│ □ Testar webhook (Recent Deliveries)                   │
│ □ Criar automação com Actions                          │
│ □ Criar template de email com {{sso_url}}             │
│ □ Ativar automação                                     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 4: Teste End-to-End (5 min)                        │
├─────────────────────────────────────────────────────────┤
│ □ Criar contato de teste                               │
│ □ Adicionar à lista                                    │
│ □ Ver webhook dispara (heroku logs)                   │
│ □ Receber email com link                               │
│ □ Clicar link = login automático ✅                    │
└─────────────────────────────────────────────────────────┘
                         ↓
                    ✅ PRONTO!
```

---

## 📚 Documentos de Referência

Se você tiver **dúvida em alguma etapa**, consulte:

| Se você está em... | Consulte... | Por quê? |
|-------------------|-----------|---------|
| Configurando servidor | `ALPHA-CLASS-SETUP.md` | Guia passo-a-passo detalhado |
| Configurando AC | `ACTIVECAMPAIGN-SETUP-ALPHA-CLASS.md` | Instruções completas de automação |
| Precisa de screenshot | `ACTIVECAMPAIGN-VISUAL-GUIDE.md` | Mostra exatamente onde clicar |
| Quer entender tudo | `memory/alpha-class-integration.md` | Documentação técnica |
| Confuso e quer resumo | `ALPHA-CLASS-QUICK-DECISION.md` | Visão geral das opções |

---

## ⚠️ Erros Comuns e Soluções

### "Webhook URL não responde"
```
❌ Servidor não está rodando
✅ Solução: heroku logs --tail
   Verificar se tem mensagens de erro
```

### "Email não chega"
```
❌ Variável {{sso_url}} não está no template
✅ Solução: Verificar se você copiou exatamente:
   {{sso_url}} (com as chaves duplas)
```

### "Link SSO expirado"
```
❌ Você clicou 2 vezes no link
✅ Link é válido apenas UMA VEZ por segurança
✅ Solução: Gerar novo link (criar novo contato no AC)
```

### "Webhook recebe 401 Unauthorized"
```
❌ Token Alpha Class inválido
✅ Solução:
   1. Gerar novo token em AlpaClass
   2. Atualizar .env
   3. Reiniciar servidor
   4. Deploy em Heroku (git push heroku main)
```

### "Contact não entra no fluxo"
```
❌ Contato pode não estar em "Alunos Alpha Class"
✅ Solução:
   1. Adicionar manualmente à lista
   2. Esperar 1-2 minutos
   3. Verificar Activity Log do contato
```

---

## 🎬 Próximos Passos Depois de Tudo Pronto

1. **Começar a usar:**
   - Compartilhar formulário (se criou um)
   - OU importar lista de contatos
   - OU coletar inscrições

2. **Monitorar por 24h:**
   - Ver logs do servidor
   - Ver Activity Log no AC
   - Testar alguns emails

3. **Ajustar conforme feedback:**
   - Melhorar template de email
   - Adicionar mais informações
   - Otimizar timing

4. **Escalar:**
   - Adicionar mais listas/fluxos
   - Criar automações avançadas
   - Sincronizar dados voltando

---

## 💬 Resumo Uma Última Vez

```
VOCÊ QUER:
  Pessoa preenche formulário
  → Entra no Alpha Class automaticamente
  → Recebe email com link de acesso

COMO FUNCIONA:
  AC captura dados
  → Dispara webhook para seu servidor
  → Servidor cria SSO no Alpha Class
  → AC envia email com link
  → Pessoa clica → Login automático ✅

O QUE VOCÊ PRECISA:
  ✅ Token Alpha Class
  ✅ Servidor (Heroku ou seu)
  ✅ Webhook configurado em AC
  ✅ Automação + Email em AC

TEMPO TOTAL:
  ⏱️ 45 minutos (do zero a rodando)

CUSTO:
  💰 $0-5/mês (Heroku free ou servidor básico)
```

---

## 🚀 Pode Começar AGORA?

### SIM? 👇
```
Siga nesta ordem:
1. FASE 1: Prepare servidor local (10 min)
2. FASE 2: Deploy servidor produção (10 min)
3. FASE 3: Configure ActiveCampaign (20 min)
4. FASE 4: Teste tudo (5 min)

Total: ~45 minutos
```

### DÚVIDA? 👇
```
Consulte documentação específica:
- Servidor: ALPHA-CLASS-SETUP.md
- AC: ACTIVECAMPAIGN-SETUP-ALPHA-CLASS.md
- Visualmente: ACTIVECAMPAIGN-VISUAL-GUIDE.md
```

### QUER ENTENDER TUDO ANTES? 👇
```
Leia:
1. ALPHA-CLASS-QUICK-DECISION.md (decisão)
2. memory/alpha-class-integration.md (técnico)
```

---

## ✅ Checklist Final

- [ ] Você leu este documento inteiro
- [ ] Você entendeu o fluxo (pessoa → AC → servidor → Alpha Class)
- [ ] Você tem token Alpha Class
- [ ] Você tem servidor (Heroku ou seu)
- [ ] Você tem acesso ao AC
- [ ] Você tem 45 minutos livres

**Tudo? Então é COMEÇAR AGORA!** 🚀

---

**Criado:** 2 de março de 2026
**Status:** ✅ Pronto
**Próxima ação:** Ir para FASE 1 (acima)

**Dúvida durante a execução?** Consulte o guia específico da fase em que está.
