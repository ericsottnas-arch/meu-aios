# Nico Activity Monitor - Requisitos

## Visão Geral
Monitor visual em tempo real para atividades de salvamento de mensagens WhatsApp dos 3 clientes (Erico, Humberto, Gabrielle).

## Requisitos Funcionais

### 1. Dashboard
- **Layout:** 3 colunas (um por cliente)
- **Cliente:** Erico | Humberto | Gabrielle
- **Informações por cliente:**
  - Nome do cliente
  - Status (🟢 Online/🔴 Offline)
  - Total de mensagens salvas (hoje)
  - Última mensagem (tempo relativo)
  - Feed de últimas 10 mensagens em tempo real

### 2. Feed de Mensagens
Cada mensagem mostra:
- Contato/Push Name
- Texto da mensagem (primeiras 50 chars)
- Timestamp (HH:MM:SS)
- Tipo de mensagem (text, image, audio, etc)
- Status (✅ Salvo, ⏳ Salvando)
- Animação ao chegar (slide/fade in)

### 3. Atualização em Tempo Real
- WebSocket ou Server-Sent Events (SSE)
- Auto-refresh a cada nova mensagem
- Histórico visual de atividade (últimas 2 horas)

### 4. Estatísticas
- Total de mensagens por cliente (hoje)
- Taxa de mensagens/hora
- Tempo médio de salvamento
- Gráfico de atividade ao longo do dia (opcional)

## Design Visual
- **Tema:** Premium, clean, minimalist
- **Cores:**
  - Erico: #0d0d0f (dark premium)
  - Humberto: #3498db (blue)
  - Gabrielle: #e74c3c (red/warm)
- **Tipografia:** Monospace para códigos/timestamps
- **Responsividade:** Desktop-first, adaptável

## Tecnologia
- **Backend:** Express.js (integrar com whatsapp-agent-server.js)
- **Frontend:** HTML/CSS/JavaScript vanilla ou simple framework
- **Real-time:** Server-Sent Events (SSE)
- **Porta:** 3002 (ou dedicada)
- **URL:** http://localhost:3002/monitor

## Estrutura de Dados
```javascript
{
  client: "erico|humberto|gabrielle",
  timestamp: 1234567890,
  pushName: "Eric Santos",
  message: "Texto...",
  type: "text|image|audio|video|document",
  status: "saved|pending",
  duration_ms: 150
}
```

## Componentes
1. **Server Endpoint:** `/api/monitor/stream` (SSE)
2. **Dashboard UI:** `/monitor` (HTML)
3. **API Status:** `/api/monitor/stats` (JSON)
4. **Database Integration:** Ler do SQLite em tempo real

## Prioridades
1. ✅ Dashboard com 3 colunas
2. ✅ Feed de mensagens em tempo real (SSE)
3. ✅ Estatísticas básicas
4. 🟡 Gráfico de atividade (nice-to-have)
5. 🟡 Dark mode toggle (nice-to-have)

## Definição de Pronto
- [ ] Dashboard visual mostrando todos os 3 clientes
- [ ] Mensagens aparecem em tempo real ao chegar
- [ ] Estatísticas de hoje atualizando
- [ ] Zero lag/latência perceptível
- [ ] Funciona em Chrome/Safari/Firefox
- [ ] Código limpo e documentado
