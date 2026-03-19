# 🚀 Setup: ActiveCampaign + Alpha Class Integration

**Status:** ✅ Pronto para Produção
**Tempo Estimado:** 15-20 minutos
**Nível de Dificuldade:** Intermediário

---

## 📋 Checklist Rápido

- [ ] Gerar token no Alpha Class
- [ ] Configurar `.env` localmente
- [ ] Instalar dependências (`npm install`)
- [ ] Testar servidor localmente
- [ ] Deploy em servidor/Heroku
- [ ] Configurar webhook no ActiveCampaign
- [ ] Testar com contato de teste
- [ ] Monitorar logs

---

## PASSO 1️⃣: Gerar Token no Alpha Class

### 1.1 Acessar painel de tokens
1. Login em **https://app.alpaclass.com**
2. Ir para **Settings → API Tokens** (ou https://app.alpaclass.com/a/apps/_/tokens)
3. Clicar em **"Novo Token"**

### 1.2 Configurar permissões
- **Nome do Token:** `activecampaign-sso` (ou seu nome)
- **Permissões obrigatórias:**
  - ✅ **Create** (criar SSO/alunos)
  - ✅ **View** (visualizar dados)
- **Permissões opcionais:**
  - View, Update (conforme necessário)

### 1.3 Guardar token com segurança
⚠️ **IMPORTANTE:** O token aparece APENAS UMA VEZ!
- Copiar e guardar em local seguro (LastPass, 1Password, etc)
- **NÃO colocar no GitHub** ou código público

---

## PASSO 2️⃣: Setup Local (Node.js)

### 2.1 Instalar dependências

```bash
cd meu-projeto

# Se não tiver package.json ainda
npm init -y

# Instalar pacotes necessários
npm install express axios dotenv
npm install --save-dev nodemon  # Para desenvolvimento
```

### 2.2 Criar arquivo `.env`

```bash
cat > .env << 'EOF'
# Alpha Class
ALPACLASS_TOKEN=seu_token_aqui_copiado_de_alpaclass

# Server
PORT=3000
NODE_ENV=development
EOF
```

Substitua `seu_token_aqui_copiado_de_alpaclass` pelo token real (ex: `OFPd3Hh1tVHpKcgEd6Aof4rDI6m7IiS4R1grZwhn`)

### 2.3 Atualizar `package.json`

Adicione os scripts:

```json
{
  "scripts": {
    "start": "node alpha-class-webhook-server.js",
    "dev": "nodemon alpha-class-webhook-server.js",
    "test": "node test-alpha-class.js"
  }
}
```

### 2.4 Testar localmente

```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

Você deve ver:
```
✅ Servidor iniciado com sucesso

📍 Endpoints:
   • Webhook: POST http://localhost:3000/webhooks/ac-enrollment
   • Health: GET http://localhost:3000/health
   • Info: GET http://localhost:3000/
```

---

## PASSO 3️⃣: Testar Localmente (Antes de Subir)

### 3.1 Criar arquivo de teste

```bash
cat > test-alpha-class.js << 'EOF'
const axios = require('axios');

async function testWebhook() {
  try {
    const response = await axios.post('http://localhost:3000/webhooks/ac-enrollment', {
      contact: {
        email: 'teste123@example.com',
        firstName: 'João',
        lastName: 'Silva'
      }
    });

    console.log('✅ Sucesso!');
    console.log('Resposta:', JSON.stringify(response.data, null, 2));
    console.log('\nSSO URL:', response.data.sso_url);

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testWebhook();
EOF
```

### 3.2 Rodar teste

```bash
npm test
```

Você deve receber uma resposta como:
```json
{
  "success": true,
  "student": {
    "id": 123456,
    "name": "João Silva",
    "email": "teste123@example.com"
  },
  "sso_url": "https://minhaescola.alpaclass.com/sso/FIeciqTSaG52pAAHEyzwH"
}
```

---

## PASSO 4️⃣: Deploy em Servidor

### Opção A: Heroku (Recomendado para Começar)

```bash
# 1. Criar conta em https://heroku.com

# 2. Instalar Heroku CLI
brew tap heroku/brew && brew install heroku

# 3. Login
heroku login

# 4. Criar app
heroku create seu-app-alpha-class

# 5. Adicionar variáveis de ambiente
heroku config:set ALPACLASS_TOKEN=seu_token_aqui -a seu-app-alpha-class
heroku config:set NODE_ENV=production -a seu-app-alpha-class

# 6. Deploy
git push heroku main

# 7. Ver logs
heroku logs --tail -a seu-app-alpha-class
```

**URL resultante:** `https://seu-app-alpha-class.herokuapp.com`

### Opção B: VPS/Servidor Próprio (Railway, Digital Ocean, AWS)

1. SSH no servidor
2. Clonar repositório
3. Instalar dependências: `npm install`
4. Criar `.env` com token
5. Usar PM2 para manter processo rodando:

```bash
npm install -g pm2

pm2 start alpha-class-webhook-server.js --name "alpha-class"
pm2 startup
pm2 save
```

6. Configurar proxy reverso (nginx) para HTTPS

---

## PASSO 5️⃣: Configurar Webhook no ActiveCampaign

### 5.1 Ir para Automations

1. Login em **ActiveCampaign**
2. Ir para **Automations → Webhooks**
3. Clicar em **"Add Webhook"**

### 5.2 Configurar Webhook

**URL:** `https://seu-app-alpha-class.herokuapp.com/webhooks/ac-enrollment`
(ou seu domínio real, ex: seu-dominio.com)

**Método:** POST

**Headers (opcional mas recomendado):**
```
Content-Type: application/json
```

### 5.3 Usar em Automação

1. Criar uma automação (ou editar existente)
2. Adicionar ação **"Send a webhook"**
3. Selecionar o webhook criado
4. Trigger: Contato adicionado à lista "Alunos"

**Mapping de dados (Body):**
```json
{
  "contact": {
    "email": "{{ contact.email }}",
    "firstName": "{{ contact.firstName }}",
    "lastName": "{{ contact.lastName }}"
  }
}
```

---

## PASSO 6️⃣: Teste End-to-End

### 6.1 Criar contato de teste no AC

1. Ir para **Contacts**
2. Adicionar novo contato:
   - **Email:** seu-email-teste@example.com
   - **Nome:** Teste
3. Adicionar à lista **"Alunos"**

### 6.2 Monitorar webhook

1. Ir para **Automations → Webhook Execution History**
2. Você deve ver sua requisição registrada
3. Verificar status (200 = sucesso)

### 6.3 Verificar logs no servidor

```bash
# Heroku
heroku logs --tail -a seu-app-alpha-class

# PM2 (servidor próprio)
pm2 logs alpha-class
```

Você deve ver:
```
✅ SSO criado com sucesso
   - ID: 123456
   - Email: seu-email-teste@example.com
   - URL SSO: https://minhaescola.alpaclass.com/sso/...
```

---

## PASSO 7️⃣: Enviar Email com SSO Link

### Opção 1: Automação AC (Mais Simples)

1. Criar novo email em AC
2. Incluir variable que será preenchida por seu server
3. Usar em automação com webhook

**Problema:** AC não consegue capturar a resposta do webhook diretamente

**Solução:** Usar Zapier ou integração alternativa

### Opção 2: Seu Servidor Envia Email (Recomendado)

Atualizar `alpha-class-webhook-server.js` para enviar email:

```javascript
const nodemailer = require('nodemailer');

// Após criar SSO com sucesso, enviar email:
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

await transporter.sendMail({
  from: 'noreply@sua-escola.com',
  to: email,
  subject: 'Seu acesso ao conteúdo está pronto! 🎓',
  html: `
    <h2>Olá ${name},</h2>
    <p>Sua inscrição foi confirmada! Clique no link abaixo para acessar:</p>
    <a href="${ssoUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
      ➡️ Acessar Conteúdo
    </a>
    <p>Este link é válido apenas uma vez.</p>
  `
});
```

---

## ⚠️ Troubleshooting

### "ALPACLASS_TOKEN não configurado"
- [ ] Verificar se `.env` existe
- [ ] Verificar se `ALPACLASS_TOKEN=` está correto
- [ ] Reiniciar servidor

### "401 Unauthorized"
- [ ] Token expirou ou inválido
- [ ] Gerar novo token no AlpaClass
- [ ] Verificar se tem permissão "Create"

### "Student email already exists"
- [ ] Email já cadastrado no AlpaClass
- [ ] SSO pode redirecionar para login se já existe

### Webhook não dispara no AC
- [ ] Verificar se URL está correta
- [ ] Verificar se servidor está online (`/health`)
- [ ] Verificar logs do AC na aba Webhooks
- [ ] Resubmeter webhook manualmente para testar

### "ECONNREFUSED" em produção
- [ ] Servidor não está rodando
- [ ] Porta errada configurada
- [ ] Proxy reverso não está configurado

---

## 📊 Monitorar em Produção

### Logs
```bash
# Heroku
heroku logs --tail

# PM2
pm2 logs alpha-class
pm2 monit
```

### Alertas Recomendados
- Monitorar se webhook retorna erro > 5 vezes/hora
- Verificar se SSO links estão sendo gerados diariamente
- Alertar se servidor fica offline

### Métricas Úteis
```javascript
// Adicione ao seu servidor:
const successCount = 0;
const errorCount = 0;

app.get('/metrics', (req, res) => {
  res.json({
    success_count: successCount,
    error_count: errorCount,
    success_rate: ((successCount / (successCount + errorCount)) * 100).toFixed(2) + '%'
  });
});
```

---

## 🎯 Próximos Passos

### Fase 1: Básico (Já feito)
- ✅ SSO automático criado
- ✅ Contatos do AC redirecionados para AlpaClass

### Fase 2: Melhorias (Opcional)
- [ ] Enviar email com SSO link
- [ ] Guardar student_id no AC para referência
- [ ] Adicionar logging em banco de dados
- [ ] Implementar dashboard de sincronização

### Fase 3: Avançado (Futuro)
- [ ] Sincronizar progressos de aula de volta para AC
- [ ] Automações baseadas em conclusão de conteúdo
- [ ] Relatórios de engajamento

---

## 📞 Suporte

Se tiver dúvidas:
1. Verificar `/health` endpoint (GET)
2. Ver logs completos do servidor
3. Validar dados enviados pelo AC
4. Testar requisição curl manualmente

**Curl de teste:**
```bash
curl -X POST http://localhost:3000/webhooks/ac-enrollment \
  -H "Content-Type: application/json" \
  -d '{
    "contact": {
      "email": "teste@example.com",
      "firstName": "Teste",
      "lastName": "User"
    }
  }'
```

---

**Última atualização:** 2 de março de 2026
**Status:** ✅ Pronto para produção
