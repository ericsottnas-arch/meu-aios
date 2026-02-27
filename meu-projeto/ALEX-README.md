# Alex - Project Manager Telegram Bot

> 🤖 Agente de gerenciamento de projetos integrado ao Telegram + ClickUp

## Quick Start

### 1. Iniciar o servidor
```bash
cd meu-projeto
./start-alex.sh start
```

### 2. Verificar status
```bash
./start-alex.sh status
```

### 3. Parar o servidor
```bash
./start-alex.sh stop
```

## Comando

| Comando | Descrição |
|---------|-----------|
| `/start` | Boas-vindas e menu principal |
| `/tarefas` | Listar tarefas com filtros (Todas, Em andamento, Na fila, Feitas) |
| `/dashboard` | Resumo do dia (tarefas em andamento, pendentes, concluídas) |
| `/help` | Menu de ajuda |
| `/cancel` | Cancela ação em andamento |

## Funcionalidades

### 📋 Listar Tarefas
1. Envie `/tarefas`
2. Escolha um filtro de status
3. Selecione uma tarefa para ver detalhes
4. Clique em "📝 Mudar Status" para atualizar

**Filtros disponíveis:**
- Todas
- Em andamento
- Na fila
- Feitas

### 📊 Dashboard
- Envie `/dashboard` para ver resumo do dia
- **Automático**: Dashboard é enviado automaticamente às 08:00 (hora São Paulo)

### 📝 Atualizar Status
1. Selecione uma tarefa via `/tarefas`
2. Clique em "📝 Mudar Status"
3. Escolha o novo status entre as opções disponíveis
4. Status é atualizado no ClickUp em tempo real

## Configuração

### Variáveis de Ambiente (`.env`)

```env
# Token do bot Alex (obrigatório)
ALEX_BOT_TOKEN=8678248133:AAFwbQXB9Ek--xnejnwyy9LHKPIOVkemLbM

# Porta do servidor (padrão: 3003)
ALEX_PORT=3003

# Secret para validar webhook (opcional, desenvolvimento)
ALEX_WEBHOOK_SECRET=

# Chat ID do proprietário (para dashboard automático)
ALEX_OWNER_CHAT_ID=5020990459

# URL do agente para inter-comunicação
ALEX_AGENT_URL=http://localhost:3003
```

## Arquitetura

### Servidor
- **Arquivo**: `alex-agent-server.js`
- **Porta**: 3003 (configurável)
- **Framework**: Express.js
- **Integrações**: Telegram API, ClickUp API

### Módulos Utilizados
- `lib/telegram.js` — API do Telegram (botões inline, mensagens)
- `lib/clickup.js` — API do ClickUp (CRUD de tarefas)
- `lib/conversation.js` — Gerenciador de conversas (estado)
- `node-cron` — Agendamento (dashboard automático)

### Novos Métodos em `lib/clickup.js`

```javascript
// Lista tarefas com filtros
listTasks({ statuses: [], assignees: [], include_closed: false })

// Atualiza status de uma tarefa
updateTaskStatus(taskId, newStatus)

// Obtém status disponíveis da lista
getListStatuses()
```

## Logs

### Ver logs em tempo real
```bash
tail -f /tmp/alex-project-manager.log
```

### Arquivo de log
```
/tmp/alex-project-manager.log
```

## Dashboard Automático

O dashboard é enviado **automaticamente às 08:00 (hora São Paulo)** para o chat ID configurado em `ALEX_OWNER_CHAT_ID`.

**Conteúdo do dashboard:**
- 🟠 Tarefas em andamento (count + primeiras 3)
- 🟡 Tarefas na fila (count + primeiras 3)
- ✅ Tarefas concluídas (count)
- 📈 Total de tarefas

## Troubleshooting

### Servidor não inicia
```bash
# Verificar logs
cat /tmp/alex-project-manager.log

# Verificar porta
lsof -i :3003

# Matar processos antigos
pkill -f "alex-agent-server"
```

### Bot não responde
1. Verifique que `ALEX_BOT_TOKEN` está correto
2. Verifique que o servidor está rodando: `./start-alex.sh status`
3. Verifique a conexão de rede
4. Tente `/start` novamente

### Tarefas não aparecem
1. Verifique que `CLICKUP_API_KEY` está configurado
2. Verifique que `CLICKUP_LIST_ID` está correto
3. Verifique logs: `cat /tmp/alex-project-manager.log`

## Desenvolvimento

### Testar server localmente
```bash
node alex-agent-server.js
```

### Testar healthcheck
```bash
curl http://localhost:3003/
```

### Simular webhook (para testes)
```bash
curl -X POST http://localhost:3003/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "chat": {"id": 123456789},
      "text": "/tarefas"
    }
  }'
```

## Produção

Para usar em produção com webhook real:

1. Configure `ALEX_WEBHOOK_SECRET` em `.env`
2. Use Cloudflare Tunnel (como o Nico):
   ```bash
   cloudflared tunnel run alex
   ```
3. Configure webhook no Telegram:
   ```bash
   curl "https://api.telegram.org/botALEX_BOT_TOKEN/setWebhook?url=https://seu-dominio.com/webhook"
   ```

## Estrutura de Arquivos

```
meu-projeto/
├── alex-agent-server.js        # Servidor principal
├── start-alex.sh               # Script de inicialização
├── lib/
│   ├── clickup.js              # API ClickUp (modificado)
│   ├── telegram.js             # API Telegram
│   └── conversation.js         # Gerenciador de conversa
└── .env                        # Configuração (modificado)
```

## Status

✅ **Implementação Completa**
- ✅ Servidor rodando
- ✅ Comandos implementados
- ✅ Integração ClickUp
- ✅ Dashboard automático agendado
- ✅ Script de inicialização

---

**Última atualização**: 27 de fevereiro de 2026
