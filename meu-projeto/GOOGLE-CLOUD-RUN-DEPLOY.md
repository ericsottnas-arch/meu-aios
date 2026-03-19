# 🚀 Deploy no Google Cloud Run (GRATUITO)

**Status:** ✅ Pronto para Deploy
**Custo:** Praticamente $0 para seu projeto
**Tempo:** ~15 minutos
**Dificuldade:** Fácil

---

## 💰 Por que Google Cloud Run?

```
┌─────────────────────────────────────┐
│  Google Cloud Run vs Alternativas   │
├─────────────────────────────────────┤
│                                     │
│  Custo por mês:                     │
│  ├─ Google Cloud Run: $0-2          │
│  ├─ Railway: $5-10                  │
│  ├─ Render: $7-14                   │
│  └─ Heroku: Descontinuado free      │
│                                     │
│  Funcionalidades:                   │
│  ├─ Escalagem automática            │
│  ├─ Sem servidor permanente         │
│  ├─ Paga só pelo uso                │
│  ├─ Hibernação automática           │
│  └─ Suporta Docker                  │
│                                     │
│  Primeiro ano: TOTALMENTE GRÁTIS    │
│  Depois: Incrivelmente barato       │
│                                     │
└─────────────────────────────────────┘
```

---

## 📋 Pré-requisitos

- [ ] Conta Google (gmail)
- [ ] Google Cloud Console acesso
- [ ] Git instalado
- [ ] gcloud CLI (vou mostrar como instalar)

---

## PASSO 1️⃣: Preparar Google Cloud Console (5 min)

### 1.1 Criar Projeto

```
1. Ir para: https://console.cloud.google.com
2. Se não tiver projeto, clicar em "Select a Project"
3. Clicar "+ CREATE PROJECT"

Nome do projeto: "Alpha Class Server"
Organização: (deixar padrão)
Localização: (pode deixar)

[CREATE]
```

### 1.2 Ativar Cloud Run API

```
1. Na barra de busca (topo), digitar: "Cloud Run"
2. Clicar em "Cloud Run"
3. Clicar no botão azul "ENABLE" (pode pedir confirmação de billing)
```

⚠️ **Importante:** Pode pedir para ativar Billing. Não se preocupe - você NÃO será cobrado pelos 2 milhões de requisições gratuitas.

### 1.3 Verificar Billing (opcional)

```
Canto superior esquerdo
  → Billing
  → Contas de faturamento
  → Você deve ver seu projeto lá
```

**Status esperado:** "Ativo" (pode haver aviso de "Avaliação gratuita")

---

## PASSO 2️⃣: Instalar gcloud CLI (5 min)

### 2.1 Instalar

**No macOS:**
```bash
brew install google-cloud-sdk
```

**No Linux/Ubuntu:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

**No Windows:**
Baixar em: https://cloud.google.com/sdk/docs/install-sdk

### 2.2 Autenticar

```bash
gcloud auth login
```

Vai abrir navegador. Fazer login com sua conta Google.

### 2.3 Definir Projeto

```bash
gcloud config set project seu-project-id
```

Aonde `seu-project-id` é o ID do projeto criado (ex: "alpha-class-server-123456")

**Para saber seu project ID:**
```
Google Cloud Console → Canto superior esquerdo
Você vê: [Project ID]
```

---

## PASSO 3️⃣: Preparar Código Localmente (2 min)

Você já tem tudo pronto:
- ✅ `alpha-class-webhook-server.js` (servidor)
- ✅ `Dockerfile` (instruções para rodar em container)
- ✅ `.env` (variáveis de ambiente)
- ✅ `package.json` (dependências)

**Apenas verifique que tudo existe:**

```bash
cd meu-projeto

ls -la | grep -E "alpha-class|Dockerfile|\.env|package\.json"
```

Você deve ver:
```
Dockerfile
.env
alpha-class-webhook-server.js
package.json
```

---

## PASSO 4️⃣: Deploy em Google Cloud Run (3 min)

### 4.1 Fazer Deploy

```bash
gcloud run deploy alpha-class-server \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

**O que significa:**
- `alpha-class-server`: Nome do seu serviço
- `--source .`: Usar código local
- `--platform managed`: Google gerencia pra você
- `--region us-central1`: Região (EUA Central = rápido + barato)
- `--allow-unauthenticated`: Qualquer um pode chamar (necessário para AC)

### 4.2 Aguardar Deploy

Você verá:
```
Building using Cloud Build...
Building image... (pode levar 2-3 minutos)

Deploying to Cloud Run service...

✓ Deploying... Done.

Service URL: https://alpha-class-server-xxxx.run.app
```

**COPIAR A URL!** Você vai precisar no ActiveCampaign.

---

## PASSO 5️⃣: Testar Deployment (2 min)

### 5.1 Testar Endpoint

```bash
# Substituir pela URL real que você recebeu
SERVICE_URL="https://alpha-class-server-xxxx.run.app"

# Teste 1: Health check
curl -s $SERVICE_URL/health

# Resultado esperado:
# {"status":"ok","alpaclass_token":"configurado"}
```

### 5.2 Testar Webhook

```bash
curl -X POST $SERVICE_URL/webhooks/ac-enrollment \
  -H "Content-Type: application/json" \
  -d '{
    "contact": {
      "email": "teste@gmail.com",
      "firstName": "João",
      "lastName": "Silva"
    }
  }'

# Resultado esperado:
# {"success":true,"student":{"id":...,"email":"teste@gmail.com",...},"sso_url":"..."}
```

✅ Se receber resposta JSON = **FUNCIONANDO!**

---

## 🎯 Seu Endpoint Público

Depois do deploy, você tem uma URL pública como:

```
https://alpha-class-server-abc123def456.run.app/webhooks/ac-enrollment
```

**Esta é a URL que você vai usar no ActiveCampaign!**

---

## 📊 Monitorar Logs

Depois que está em produção, ver logs:

```bash
gcloud run logs read alpha-class-server --region us-central1 --limit 50
```

Ou via console:
```
Google Cloud Console
  → Cloud Run
  → Clicar em seu serviço
  → Aba "LOGS"
```

---

## 💡 Dicas Importantes

### Variáveis de Ambiente

Seu `.env` está sendo usado localmente, mas em produção precisa estar no Cloud Run:

```bash
# Adicionar variável de ambiente no Cloud Run
gcloud run deploy alpha-class-server \
  --set-env-vars ALPACLASS_TOKEN=seu_token_aqui \
  --region us-central1 \
  --platform managed
```

Ou via Console:
```
Cloud Run → seu-serviço → EDIT
Encontrar "Environment variables"
Adicionar: ALPACLASS_TOKEN = seu_token
[DEPLOY]
```

### Auto-scaling

Google Cloud Run automaticamente:
- ✅ Escala para mais instâncias se houver muito tráfego
- ✅ Reduz para 0 se não houver requisições (economizando $)
- ✅ Traz de volta quando necessário

### Segurança

O servidor está público, mas:
- ✅ Apenas ActiveCampaign o chama
- ✅ AC envia dados reais (email, nome)
- ✅ Token AlpaClass está protegido
- ✅ HTTPS automático (sempre seguro)

---

## ❌ Troubleshooting

### "Erro: API not enabled"
```
Solução: Google Cloud Console → Cloud Run → Enable API
```

### "Erro: Permission denied"
```
Solução:
gcloud auth login
gcloud config set project seu-project-id
```

### "Service URL returns 404"
```
Solução:
1. Verificar se imagem foi buildada: gcloud run services list
2. Se vazio, deployar novamente
3. Ver logs: gcloud run logs read alpha-class-server
```

### "Webhook retorna 500 error"
```
Solução:
1. Ver logs: gcloud run logs read alpha-class-server
2. Procurar por erro
3. Pode ser token inválido - atualizar variável de ambiente
```

---

## 🔄 Atualizar Servidor em Produção

Depois que fizer mudanças locais:

```bash
# Fazer alterações no código
# Depois:

gcloud run deploy alpha-class-server \
  --source . \
  --region us-central1 \
  --platform managed
```

Demora 2-3 minutos para fazer deploy novo.

---

## 💾 Backup de Configuração

Para salvar sua configuração:

```bash
# Exportar configuração
gcloud run services describe alpha-class-server \
  --region us-central1 \
  --format export > service-config.yaml

# Depois, se precisar recuperar:
gcloud run services replace service-config.yaml --region us-central1
```

---

## 📈 Monitorar Uso

```
Google Cloud Console
  → Cloud Run
  → Seu serviço
  → Aba "METRICS"
```

Você verá:
- Número de requisições
- Tempo de resposta
- Erros
- Uso de memória

---

## 💰 Estimar Custo

Com 50 requisições por dia (1500/mês):

```
Primeiro ano: GRÁTIS (2 milhões/mês inclusos)
Depois: ~$0.50 por mês
        (muito abaixo do limite gratuito)

Com 1000 requisições por dia:
Primeiro ano: GRÁTIS
Depois: ~$10 por mês
```

**Conclusão:** Para seu caso de uso, será praticamente GRÁTIS.

---

## ✅ Checklist Final

- [ ] Conta Google criada
- [ ] Google Cloud Project criado
- [ ] Cloud Run API ativada
- [ ] gcloud CLI instalado e autenticado
- [ ] Código pronto localmente
- [ ] Deploy realizado com sucesso
- [ ] Endpoint testado (curl)
- [ ] URL funcionando

🎉 **Pronto para usar no ActiveCampaign!**

---

## 🎯 Próximo Passo

Agora você tem:
- ✅ Servidor rodando em `https://seu-app.run.app/webhooks/ac-enrollment`
- ✅ Público na internet
- ✅ Sempre ativo quando precisa
- ✅ Hibernado quando não usa
- ✅ Praticamente grátis

**Próximo:** Configurar esse URL no ActiveCampaign!

Veja o documento: `ACTIVECAMPAIGN-SETUP-ALPHA-CLASS.md`

Lá você vai usar esta URL em vez de localhost:3000

---

**Criado:** 2 de março de 2026
**Status:** ✅ Pronto para Deploy
