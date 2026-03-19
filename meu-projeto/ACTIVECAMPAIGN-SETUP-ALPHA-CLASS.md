# 🔧 Setup ActiveCampaign + Alpha Class (Guia Visual)

**Data:** 2 de março de 2026
**Objetivo:** Configurar automação AC para disparar webhook ao Alpha Class
**Tempo:** 15-20 minutos

---

## 🎯 O que vamos fazer

```
FORMULÁRIO (AC)
     ↓
Contato criado/adicionado à lista
     ↓
AUTOMAÇÃO AC (Webhook)
     ↓
Seu servidor recebe dados
     ↓
API AlpaClass (SSO)
     ↓
Conta criada + Email com link
     ↓
ALUNO clica
     ↓
Login automático no Alpha Class ✅
```

---

## 📋 PRÉ-REQUISITOS

### Você precisa ter:
- [ ] Conta ActiveCampaign (com acesso Admin)
- [ ] Conta Alpha Class
- [ ] Token da API Alpha Class (já gerado)
- [ ] Servidor rodando `alpha-class-webhook-server.js` (Heroku ou seu servidor)

**Não tem servidor?** Siga `ALPHA-CLASS-SETUP.md` PASSO 4 primeiro.

---

## PASSO 1️⃣: Criar Lista no ActiveCampaign

### 1.1 Acessar Listas

```
ActiveCampaign
├── Contacts
├── Lists ← Clique aqui
└── New List
```

### 1.2 Criar Nova Lista

**Nome da Lista:** `Alunos Alpha Class` (ou seu nome)

**Descrição:** `Contatos que devem receber acesso automático ao Alpha Class`

**Tipo:** Standard List

Clique em **Create List**

### 1.3 Resultado

Você terá uma lista vazia pronta para receber contatos.

---

## PASSO 2️⃣: Criar Formulário (Opcional)

### Se você quer que contatos se inscrevam sozinhos:

#### 2.1 Acessar Formulários

```
ActiveCampaign
├── Contacts
├── Forms ← Clique aqui
└── Create Form
```

#### 2.2 Criar Formulário

**Nome:** `Cadastro - Acesso Alunos`

**Campos obrigatórios:**
- [ ] Email (padrão)
- [ ] First Name (padrão)
- [ ] Last Name (padrão, opcional)
- [ ] Phone (opcional)

**Ação após submissão:**
- "Add contact to a list"
- Selecionar: `Alunos Alpha Class`

#### 2.3 Publicar Formulário

- Ir para **Publish**
- Copiar código/URL
- Compartilhar no seu site

**Resultado:** Quando alguém preenche, é automaticamente adicionado à lista

---

## PASSO 3️⃣: Configurar Webhook no ActiveCampaign

### 3.1 Acessar Webhooks

```
ActiveCampaign Dashboard
├── Settings ← Engrenagem (canto superior direito)
├── Webhooks ← Procure por "Webhook" ou "Integration"
└── Create Webhook
```

**Se não encontrar:**
- Ir para: `https://yourname.activecompaign.com/settings/webhooks`

### 3.2 Criar Novo Webhook

**Campo: "URL to Post To"**
```
https://seu-app-name.herokuapp.com/webhooks/ac-enrollment
```

**Ou se tiver servidor próprio:**
```
https://seu-dominio.com/webhooks/ac-enrollment
```

⚠️ **Importante:** Deve ser HTTPS em produção

### 3.3 Selecionar Eventos

Marque **UMA DESTAS** opções:

```
☑️ Contact Created
   OU
☑️ Contact Updated
```

**Recomendação:** Use **"Contact Created"** para não processar atualizações

### 3.4 Selecionar Campos a Enviar

Marque os campos que quer enviar:
```
☑️ Email
☑️ First Name
☑️ Last Name
☑️ Phone (opcional)
```

### 3.5 Testar Webhook

```
1. Preencher formulário de teste
2. Ir para Settings → Webhooks
3. Clicar em seu webhook
4. Ver "Recent Deliveries"
5. Deve estar em verde ✅
```

**Se estiver vermelho ❌:**
- [ ] URL incorreta
- [ ] Servidor desligado
- [ ] Erro na resposta do servidor

---

## PASSO 4️⃣: Criar Automação (Fluxo Automático)

### 4.1 Acessar Automações

```
ActiveCampaign Dashboard
├── Automations ← Menu principal
├── Manage Automation ← Ou "My Automations"
└── New Automation
```

### 4.2 Criar Automação

**Nome:** `Alpha Class - Enviar SSO Link`

**Descrição:** `Quando contato entra em lista, dispara webhook e envia email com link de acesso`

Clique em **Create Automation**

### 4.3 Definir Trigger (Quando Dispara)

```
Automations Flow
├── START → O que dispara?
│   └── Contact Added to a List ← Selecione esta
│       └── Selecionar Lista: "Alunos Alpha Class"
│
└── NEXT: Adicionar ações
```

### 4.4 Adicionar Ações

Você vai arrastar ações para o fluxo. A ordem é:

#### Ação 1: Delay (Opcional)
```
Wait: 1 minute
```
(Deixa o webhook ser processado primeiro)

#### Ação 2: Send Webhook ⭐ PRINCIPAL

```
Actions → Webhooks → Send Webhook

Webhook: Seu webhook criado em PASSO 3
ou
URL Custom: https://seu-app-name.herokuapp.com/webhooks/ac-enrollment
Método: POST
Timeout: 30 segundos
```

**Importante:** Ativar "Wait for webhook response"

#### Ação 3: Send Email (Depois que webhook responde)

```
Send Email → Selecionar um template
ou
Usar um email customizado

Assunto: "🎓 Seu acesso já está pronto!"

Template:
---
Olá {{firstName}},

Parabéns por se inscrever! 🎉

Seu acesso já está liberado. Clique no botão abaixo para entrar:

[BOTÃO] Acessar Aula

Link do botão: {{sso_url}}

Este link é válido apenas para seu primeiro acesso.

Qualquer dúvida, responda este email.

Abraços,
[Seu Nome]
---
```

**Importante:** Use a variável `{{sso_url}}` que vem do webhook!

---

## PASSO 5️⃣: Testar a Automação Completa

### 5.1 Criar Contato de Teste

```
Contacts → New Contact

Email: seu-email-teste@exemplo.com
First Name: Teste
Last Name: User
```

### 5.2 Adicionar Manualmente à Lista

```
Contact Card → Add to List → "Alunos Alpha Class"
```

### 5.3 Monitorar

**No servidor:**
```bash
heroku logs --tail
# ou
npm run dev
```

Você deve ver:
```
✅ SSO criado com sucesso
   - Email: seu-email-teste@exemplo.com
   - URL SSO: https://minhaescola.alpaclass.com/sso/...
```

**No ActiveCampaign:**
```
Contacts → seu contato → Activity Log

Deve mostrar:
✅ Added to list: Alunos Alpha Class
✅ Email sent: "Seu acesso já está pronto!"
```

### 5.4 Verificar Email

- Abrir seu email de teste
- Ver email de AC com link SSO
- Clicar no link
- Deve fazer login automático no Alpha Class ✅

---

## PASSO 6️⃣: Otimizar a Automação (Avançado)

### 6.1 Adicionar Validações

Antes do webhook, adicione verificações:

```
START: Contact added to "Alunos Alpha Class"
  ↓
IF/CONDITION: Email is not empty
  ├─ TRUE → Continue
  └─ FALSE → End automation
  ↓
IF/CONDITION: First Name is not empty
  ├─ TRUE → Continue
  └─ FALSE → End automation
  ↓
Send Webhook
  ↓
Send Email
```

### 6.2 Adicionar Tag de Rastreamento

Depois do email enviado:
```
Actions → Add/Remove Tags
├── Add Tag: "alpha-class-enrolled"
├── Add Tag: "sso-sent"
└── Add Tag: data/data-inscricao
```

### 6.3 Criar Contato no Alpha Class também?

Se quer sincronizar DOIS WEBHOOKS (AC + Alpha Class), adicione:

```
Send Webhook → Alpha Class enrollment
(em vez de ou junto com SSO)
```

---

## 📊 Estrutura Completa da Automação Visual

```
┌─────────────────────────────────────────────┐
│  START: Contact Added to List               │
│  "Alunos Alpha Class"                       │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Condition: Email Not Empty?                │
│  ├─ Yes → Continue                          │
│  └─ No → End                                │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Condition: First Name Not Empty?           │
│  ├─ Yes → Continue                          │
│  └─ No → End                                │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Wait: 1 minute                             │
│  (deixa servidor processar)                 │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Send Webhook ⭐                            │
│  POST /webhooks/ac-enrollment               │
│  Wait for response? YES                     │
│  Timeout: 30 segundos                       │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Condition: Webhook Success?                │
│  ├─ Yes → Send Email                        │
│  └─ No → Send Error Email                   │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Send Email: "Acesso Liberado!"             │
│  Variables: {{firstName}}, {{sso_url}}      │
│  From: seu-email@dominio.com                │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Add Tags:                                  │
│  ├─ "alpha-class-enrolled"                  │
│  ├─ "sso-sent"                              │
│  └─ "2026-03-02"                            │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  END                                        │
└─────────────────────────────────────────────┘
```

---

## 🔍 Debugging no ActiveCampaign

### Ver Histórico do Webhook

```
Settings → Webhooks → Seu Webhook
├── Recent Deliveries
├── Status: ✅ (verde) = Sucesso
└── Status: ❌ (vermelho) = Erro

Clique para ver:
- Request enviado
- Response recebida
- Status code (200, 401, 500, etc)
```

### Ver Logs da Automação

```
Automations → Seu fluxo
├── Activity Log
├── Ver cada contato que passou
├── Em qual etapa parou
└── Qual foi o erro
```

### Testar Webhook Manualmente

```
Settings → Webhooks → Seu Webhook
├── Test Webhook
├── Selecionar um contato real
├── Enviar
└── Ver resposta
```

---

## ⚠️ Problemas Comuns e Soluções

### ❌ Webhook retorna "401 Unauthorized"
**Causa:** Token AlpaClass inválido ou expirado
**Solução:**
1. Gerar novo token em AlpaClass
2. Atualizar no `.env` do servidor
3. Reiniciar servidor
4. Testar novamente

### ❌ Email não é enviado após webhook
**Causa:** Webhook falha ou demora muito
**Solução:**
1. Aumentar timeout para 45 segundos
2. Verificar logs do servidor
3. Testar webhook manualmente
4. Adicionar condition "if webhook success"

### ❌ Contato não entra no fluxo
**Causa:** Não está em "Alunos Alpha Class" ainda
**Solução:**
1. Adicionar contato à lista manualmente
2. Esperar 1-2 minutos
3. Ver Activity Log se fluxo iniciou
4. Se não, usar ferramenta "Trigger automation manually"

### ❌ Email chega vazio ou com variáveis não preenchidas
**Causa:** Variáveis não foram mapeadas corretamente
**Solução:**
1. Verificar resposta do webhook em "Recent Deliveries"
2. Confirmar que `sso_url` está vindo
3. Usar sintaxe correta: `{{sso_url}}` (não `{{sso-url}}`)

---

## 🎓 Templates de Email Prontos

### Template 1: Simples e Direto

```
Assunto: Seu acesso ao conteúdo está pronto! 🎓

Olá {{firstName}},

Bem-vindo!

Seu acesso foi liberado. Clique abaixo para entrar:

[BOTÃO - Cor azul] Acessar Conteúdo
Link: {{sso_url}}

Qualquer dúvida, responda este email.

Abraços!
```

### Template 2: Com Mais Contexto

```
Assunto: {{firstName}}, sua aula está esperando! 🚀

Olá {{firstName}},

Parabéns por se inscrever no nosso programa! 🎉

Você agora tem acesso completo ao conteúdo exclusivo. Este é seu link pessoal de acesso:

[BOTÃO] Começar Agora
Link: {{sso_url}}

⚠️ IMPORTANTE:
- Este link é válido apenas UMA VEZ
- Após fazer login, você terá acesso permanente
- Se o link não funcionar, responda este email

Qualquer dúvida:
📧 suporte@seu-dominio.com
🔗 seu-dominio.com/ajuda

Muito sucesso! 💪

[Seu Nome/Logo]
```

### Template 3: Com Prova Social

```
Assunto: {{firstName}}, você está pronto para transformar sua vida! 💪

Oi {{firstName}},

Seus dados foram confirmados e você já tem acesso!

Mais de 5.000 alunos já estão aproveitando este conteúdo exclusivo.

👇 ACESSE AGORA

[BOTÃO - Grande] Começar Sua Jornada
Link: {{sso_url}}

O que você vai aprender:
✅ Módulo 1: Fundamentos
✅ Módulo 2: Prática
✅ Módulo 3: Avançado
✅ Bonus: Templates prontos

Lembrando: este link expira após o primeiro uso por questões de segurança.

Sucesso! 🚀

{{companyName}}
```

---

## 📈 Métricas para Monitorar

Depois que a automação estiver rodando, acompanhe:

**No ActiveCampaign:**
```
Automations → Seu fluxo

Estatísticas:
├─ Contatos iniciados: quantos entraram?
├─ Webhook sucesso: % de sucesso
├─ Email enviado: quantos receberam?
├─ Taxa de clique: %
└─ Conversão: quantos acessaram Alpha Class?
```

**No Servidor:**
```
Logs do Node.js:
├─ Requisições recebidas
├─ Erros de API
├─ Student IDs criados
└─ Taxa de sucesso (%)
```

---

## ✅ Checklist Final

- [ ] Lista "Alunos Alpha Class" criada no AC
- [ ] Webhook criado em AC e testado ✅
- [ ] Servidor rodando em produção (Heroku/seu servidor)
- [ ] Automação criada com fluxo completo
- [ ] Template de email configurado
- [ ] Contato de teste processado com sucesso
- [ ] Email recebido com link SSO
- [ ] Link SSO funciona (login automático)
- [ ] Contato aparece em Alpha Class
- [ ] Tags adicionadas ao contato

🎉 **Se tudo acima está marcado, você está 100% pronto!**

---

## 🚀 Próximos Passos

1. **Começar a usar:** Promover formulário para coletar inscrições
2. **Monitorar:** Ver métricas de sucesso por 1 semana
3. **Otimizar:** Ajustar templates de email conforme feedback
4. **Escalar:** Adicionar mais listas/fluxos conforme necessário

---

**Criado:** 2 de março de 2026
**Status:** ✅ Completo e pronto para usar
**Referência:** Ver também ALPHA-CLASS-SETUP.md para servidor
