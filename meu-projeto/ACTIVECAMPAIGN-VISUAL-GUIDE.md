# 📸 Guia Visual: ActiveCampaign + Alpha Class (Screenshots)

**Objetivo:** Mostrar exatamente onde clicar e o que fazer no AC

---

## 🔑 Login no ActiveCampaign

```
1. Ir para: https://activecompaign.com
2. Clicar em "Login"
3. Email: seu-email
4. Senha: sua-senha
5. Você chega no Dashboard
```

**Dashboard mostra:**
```
┌────────────────────────────────────────┐
│  ActiveCampaign Dashboard              │
├────────────────────────────────────────┤
│                                        │
│  Menu Principal (esquerda):            │
│  ├─ 📊 Reporting (relatórios)         │
│  ├─ 📧 Campaigns (campanhas)          │
│  ├─ 👥 Contacts (contatos)            │
│  ├─ ⚙️ Automations (automações)       │
│  ├─ 🔧 Settings (configurações)       │
│  └─ +Più...                           │
│                                        │
│  Canto superior direito:               │
│  ├─ 🔔 Notificações                   │
│  ├─ ⚙️ Engrenagem (Settings)          │
│  └─ 👤 Seu perfil                     │
│                                        │
└────────────────────────────────────────┘
```

---

## PASSO 1️⃣: Criar Lista

### Caminho no Menu
```
Dashboard
  └─ Contacts (👥)
      └─ Lists
          └─ New List
```

### O que preencher:

```
┌─────────────────────────────────────┐
│  Create List                        │
├─────────────────────────────────────┤
│                                     │
│  Name: *                           │
│  ┌───────────────────────────────┐ │
│  │ Alunos Alpha Class            │ │
│  └───────────────────────────────┘ │
│                                     │
│  Description:                       │
│  ┌───────────────────────────────┐ │
│  │ Contatos que entram na lista  │ │
│  │ para receber acesso automático│ │
│  └───────────────────────────────┘ │
│                                     │
│  List Type:                         │
│  ◉ Standard List (padrão)          │
│  ○ Segment                          │
│                                     │
│  [Create List]  [Cancel]            │
│                                     │
└─────────────────────────────────────┘
```

### Resultado:
```
✅ Lista criada!
"Alunos Alpha Class" agora existe
```

---

## PASSO 2️⃣: Criar Formulário (Opcional)

### Caminho no Menu
```
Dashboard
  └─ Contacts (👥)
      └─ Forms
          └─ Create Form
```

### Tipo de Formulário

```
┌─────────────────────────────────────┐
│  Select Form Type                   │
├─────────────────────────────────────┤
│                                     │
│  ○ Embedded                         │
│  ◉ Standalone Form (recomendado)   │
│  ○ Modal Form                       │
│  ○ Slide-in Form                    │
│                                     │
│  [Next]                             │
│                                     │
└─────────────────────────────────────┘
```

### Configurar Campos

```
┌─────────────────────────────────────┐
│  Add Fields to Form                 │
├─────────────────────────────────────┤
│                                     │
│  Campos já inclusos:                │
│  ✅ Email (obrigatório)            │
│  ✅ First Name                      │
│  ✅ Last Name                       │
│                                     │
│  Adicionar mais campos?             │
│  [+ Add Field]                      │
│                                     │
│  Sugestões:                         │
│  ├─ Phone                           │
│  ├─ Company                         │
│  └─ Custom Field                    │
│                                     │
│  [Next]                             │
│                                     │
└─────────────────────────────────────┘
```

### Ação Após Submissão

```
┌─────────────────────────────────────┐
│  Form Actions                       │
├─────────────────────────────────────┤
│                                     │
│  After form submission:             │
│  ◉ Add contact to a list            │
│                                     │
│  Select list:                       │
│  ┌───────────────────────────────┐ │
│  │ ▼ Alunos Alpha Class   ✓      │ │
│  └───────────────────────────────┘ │
│                                     │
│  ☑ Send confirmation email         │
│  ☑ Assign to automation            │
│                                     │
│  [Publish]  [Save Draft]            │
│                                     │
└─────────────────────────────────────┘
```

### Resultado:
```
✅ Formulário criado!
Seu formulário URL:
https://[seu-account].activecompaign.com/forms/[id]/share
```

---

## PASSO 3️⃣: Criar Webhook

### Caminho no Menu

```
Canto Superior Direito
  └─ ⚙️ Engrenagem (Settings)
      └─ Procure por "Webhooks"
          └─ Create Webhook

Ou direto:
https://[seu-account].activecompaign.com/settings/webhooks
```

### Preencher Webhook

```
┌─────────────────────────────────────┐
│  Create Webhook                     │
├─────────────────────────────────────┤
│                                     │
│  URL to Post To: *                 │
│  ┌───────────────────────────────┐ │
│  │ https://seu-app.herokuapp.com │ │
│  │ /webhooks/ac-enrollment       │ │
│  └───────────────────────────────┘ │
│                                     │
│  Select Events:                     │
│  ☑ Contact Created                 │
│  ☐ Contact Updated                 │
│  ☐ Contact Deleted                 │
│  ☐ (... mais opções)               │
│                                     │
│  Select Fields:                     │
│  ☑ Email                           │
│  ☑ First Name                      │
│  ☑ Last Name                       │
│  ☑ Phone                           │
│  ☐ (... mais campos)               │
│                                     │
│  Custom Fields to Include:         │
│  ┌───────────────────────────────┐ │
│  │ (deixar em branco)            │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Create Webhook]                   │
│                                     │
└─────────────────────────────────────┘
```

### Resultado:
```
✅ Webhook criado!

Você verá:
- Webhook ID (não precisa)
- URL configurada
- Recent Deliveries (histórico)
```

### Testar Webhook

```
Settings → Webhooks → [Seu Webhook]

┌─────────────────────────────────────┐
│  Seu Webhook                        │
├─────────────────────────────────────┤
│                                     │
│  Status: ✅ Active                  │
│  URL: https://seu-app.herokuapp... │
│                                     │
│  Recent Deliveries:                 │
│  ┌───────────────────────────────┐ │
│  │ ✅ 2026-03-02 10:15:00       │ │
│  │    Status: 200 OK             │ │
│  │    [View Details]             │ │
│  │                               │ │
│  │ ❌ 2026-03-02 10:10:00       │ │
│  │    Status: 400 Bad Request    │ │
│  │    [View Details]             │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Test Webhook] [Delete]            │
│                                     │
└─────────────────────────────────────┘
```

---

## PASSO 4️⃣: Criar Automação

### Caminho no Menu

```
Dashboard
  └─ Automations (⚙️)
      └─ New Automation
          └─ Blank Automation
```

### Nomear Automação

```
┌─────────────────────────────────────┐
│  New Automation                     │
├─────────────────────────────────────┤
│                                     │
│  Name: *                           │
│  ┌───────────────────────────────┐ │
│  │ Alpha Class - Enviar SSO Link │ │
│  └───────────────────────────────┘ │
│                                     │
│  Description:                       │
│  ┌───────────────────────────────┐ │
│  │ Dispara webhook e envia email │ │
│  │ com link de acesso            │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Create Automation]                │
│                                     │
└─────────────────────────────────────┘
```

---

## PASSO 5️⃣: Definir Trigger (Gatilho)

### Tela do Fluxo

```
┌─────────────────────────────────────┐
│  START ← Clique aqui para editar   │
├─────────────────────────────────────┤
│                                     │
│  [START]                            │
│     │                               │
│     ├─ Quando?                      │
│     │  └─ Contact Added to a List   │
│     │     └─ Alunos Alpha Class     │
│     │                               │
│     ├─ E se?                        │
│     │  └─ (sem condições)           │
│     │                               │
│     └─ Depois                       │
│        └─ [+ Add Action]            │
│                                     │
└─────────────────────────────────────┘
```

### Selecionar Trigger

```
Clique em START

┌─────────────────────────────────────┐
│  Choose a Start Condition           │
├─────────────────────────────────────┤
│                                     │
│  Search: ________________           │
│                                     │
│  Contact-based:                     │
│  ◉ Contact Added to a List          │
│  ○ Contact Updated                  │
│  ○ Contact Removed From a List      │
│  ○ Contact Email Bounced            │
│  ○ (... mais opções)                │
│                                     │
│  Form-based:                        │
│  ○ Form Submitted                   │
│  ○ Page Viewed                      │
│                                     │
│  [Select]                           │
│                                     │
└─────────────────────────────────────┘
```

### Selecionar Lista

```
┌─────────────────────────────────────┐
│  Which list?                        │
├─────────────────────────────────────┤
│                                     │
│  Select List:                       │
│  ┌───────────────────────────────┐ │
│  │ ▼ Alunos Alpha Class          │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Confirm]                          │
│                                     │
└─────────────────────────────────────┘
```

---

## PASSO 6️⃣: Adicionar Ação 1 - Webhook

### Clicar em "[+ Add Action]"

```
┌─────────────────────────────────────┐
│  Choose an Action                   │
├─────────────────────────────────────┤
│                                     │
│  Search: ________________           │
│                                     │
│  Popular Actions:                   │
│  ◉ Send Webhook                     │
│  ○ Send Email                       │
│  ○ Create Task                      │
│  ○ Add/Remove Tags                  │
│  ○ Add to List                      │
│  ○ Update Contact Field             │
│  ○ (... mais opções)                │
│                                     │
│  [Select Send Webhook]              │
│                                     │
└─────────────────────────────────────┘
```

### Configurar Webhook

```
┌─────────────────────────────────────┐
│  Send Webhook Settings              │
├─────────────────────────────────────┤
│                                     │
│  Select Webhook:                    │
│  ┌───────────────────────────────┐ │
│  │ ▼ [Seu Webhook AC]      ✓     │ │
│  │   ac-enrollment-webhook       │ │
│  └───────────────────────────────┘ │
│                                     │
│  Or Enter Custom URL:              │
│  ┌───────────────────────────────┐ │
│  │ (deixar em branco)            │ │
│  └───────────────────────────────┘ │
│                                     │
│  Method: POST (padrão)             │
│                                     │
│  ☑ Wait for webhook response       │
│    ⚠️ IMPORTANTE: Marque isso!     │
│                                     │
│  Timeout: 30 [segundos]            │
│                                     │
│  [Confirm]                          │
│                                     │
└─────────────────────────────────────┘
```

### Fluxo até agora:
```
[START: Contact Added to List]
         │
         ▼
   [Send Webhook]
         │
         ├─ Success → [Next Action]
         └─ Failed → [End]
```

---

## PASSO 7️⃣: Adicionar Ação 2 - Enviar Email

### Clicar em "[+ Add Action]" novamente

```
Selecione: Send Email
```

### Criar/Selecionar Email

```
┌─────────────────────────────────────┐
│  Send Email                         │
├─────────────────────────────────────┤
│                                     │
│  Email Template:                    │
│  ┌───────────────────────────────┐ │
│  │ ▼ [Create New Email]          │ │
│  │   Custom Email                │ │
│  │   Template: Bem-vindo         │ │
│  │   Template: Confirmação       │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Select Create New Email]          │
│                                     │
└─────────────────────────────────────┘
```

### Preencher Email

```
┌─────────────────────────────────────┐
│  Create Email                       │
├─────────────────────────────────────┤
│                                     │
│  From Name:                         │
│  ┌───────────────────────────────┐ │
│  │ Seu Nome / Sua Empresa        │ │
│  └───────────────────────────────┘ │
│                                     │
│  From Email:                        │
│  ┌───────────────────────────────┐ │
│  │ seu-email@seu-dominio.com     │ │
│  └───────────────────────────────┘ │
│                                     │
│  Subject:                           │
│  ┌───────────────────────────────┐ │
│  │ 🎓 Seu acesso está pronto!    │ │
│  └───────────────────────────────┘ │
│                                     │
│  Email Body:                        │
│  ┌───────────────────────────────┐ │
│  │ Olá {{firstName}},            │ │
│  │                               │ │
│  │ Bem-vindo! Seu acesso foi    │ │
│  │ liberado.                     │ │
│  │                               │ │
│  │ Clique no link:               │ │
│  │ {{sso_url}}                   │ │
│  │                               │ │
│  │ Abraços!                      │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Save Email]                       │
│                                     │
└─────────────────────────────────────┘
```

⚠️ **Importante:** Use `{{firstName}}` e `{{sso_url}}` (do webhook)

### Fluxo completo:
```
[START: Contact Added to List]
         │
         ▼
   [Wait: 1 minute]
         │
         ▼
   [Send Webhook]
         │
         ├─ Success ──→ [Send Email]
         └─ Failed ──→ [End]
                           │
                           ▼
                    Email enviado! ✅
```

---

## PASSO 8️⃣: Ativar Automação

```
┌─────────────────────────────────────┐
│  Automação: Alpha Class - SSO Link  │
├─────────────────────────────────────┤
│                                     │
│  Status:                            │
│  ○ Draft (desativado)              │
│  ◉ Activated (ativo)               │
│                                     │
│  [Activate]  [Save Draft]           │
│                                     │
└─────────────────────────────────────┘
```

✅ Automação está ATIVA!

---

## PASSO 9️⃣: Testar Tudo

### Criar Contato de Teste

```
Dashboard → Contacts (👥)
         └─ New Contact

┌─────────────────────────────────────┐
│  Create New Contact                 │
├─────────────────────────────────────┤
│                                     │
│  Email: *                           │
│  ┌───────────────────────────────┐ │
│  │ seu-teste@gmail.com           │ │
│  └───────────────────────────────┘ │
│                                     │
│  First Name:                        │
│  ┌───────────────────────────────┐ │
│  │ João                          │ │
│  └───────────────────────────────┘ │
│                                     │
│  Last Name:                         │
│  ┌───────────────────────────────┐ │
│  │ Silva                         │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Save]                             │
│                                     │
└─────────────────────────────────────┘
```

### Adicionar à Lista

```
Contato criado → Abrir contato

Na parte superior, procure:
[+ Add to List]

Selecionar: Alunos Alpha Class
[Add to List]
```

### Monitorar

```
Abrir seu contato → Activity Log

Você verá:
✅ 10:15 - Added to list: Alunos Alpha Class
✅ 10:16 - Webhook executed successfully
✅ 10:17 - Email sent: "Seu acesso está pronto!"
```

### Verificar Email

```
Abrir seu email de teste (seu-teste@gmail.com)

Você deve receber:
┌─────────────────────────────────────┐
│  De: seu-email@seu-dominio.com      │
│  Assunto: 🎓 Seu acesso está...    │
│                                     │
│  Olá João,                          │
│                                     │
│  Bem-vindo! Seu acesso foi liberado│
│                                     │
│  [CLIQUE AQUI PARA ACESSAR]         │
│  ↓                                  │
│  https://minhaescola.alpaclass...  │
│                                     │
│  Abraços!                           │
└─────────────────────────────────────┘
```

### Testar Link SSO

```
Clique no link no email

Você será redirecionado para:
https://minhaescola.alpaclass.com/sso/TOKEN

Login automático ✅
Conta criada ✅
Acesso liberado ✅
```

---

## ✅ Resultado Final

Quando tudo está funcionando:

```
FORMULÁRIO (site)
    ↓
Pessoa preenche e submete
    ↓
AC: Contato criado + adicionado à lista
    ↓
AC: Automação dispara
    ↓
WEBHOOK: Seu servidor recebe dados
    ↓
API AlpaClass: SSO criado
    ↓
AC: Email enviado com link SSO
    ↓
PESSOA: Recebe email
    ↓
PESSOA: Clica no link
    ↓
Alpha Class: Login automático ✅
    ↓
PESSOA: Tem acesso ao conteúdo 🎓
```

---

## 🎯 Checklist Visual

- [ ] Dashboard AC aberto
- [ ] Lista "Alunos Alpha Class" criada
- [ ] Webhook criado e testado ✅
- [ ] Automação criada
- [ ] Ação 1: Webhook adicionada
- [ ] Ação 2: Email adicionada
- [ ] Automação ativada
- [ ] Contato de teste criado
- [ ] Email recebido
- [ ] Link SSO funciona ✅

🎉 **Parabéns! Você está 100% pronto!**

---

**Data:** 2 de março de 2026
**Autor:** Sistema AIOS
**Status:** ✅ Completo
