# Arquitetura Proposta: Agente IA no WhatsApp com Stevo.chat e Gemini

Este documento descreve uma arquitetura de alto nível para implementar um agente de IA que monitora um grupo de WhatsApp, interage com os usuários e se conecta ao seu sistema de gerenciamento de tarefas (ClickUp).

## Componentes

A solução é composta por 3 partes principais:

### 1. Stevo.chat (A Ponte com o WhatsApp)

- **Função:** Conectar um número de telefone ao WhatsApp e servir como nossa porta de entrada e saída.
- **Capacidades Confirmadas:**
    1.  **Webhook de Recebimento:** A plataforma permite configurar uma URL para receber notificações (HTTP POST) quando uma nova mensagem chega.
    2.  **API de Envio:** A plataforma oferece uma API REST para enviar mensagens de volta para o WhatsApp.

### 2. Servidor do Agente (O Cérebro da IA)

Este será um novo script no seu projeto, `whatsapp-agent-server.js`, que ficará rodando em um servidor (como Railway).

- **Responsabilidades:**
    1.  **Receber Webhooks:** Ter um endpoint (ex: `/webhook/whatsapp`) que recebe os dados das mensagens do Stevo.chat.
    2.  **Processar Mensagens:**
        -   **Análise Passiva:** Armazenar as conversas para, quando solicitado, enviar a um modelo Gemini para extrair insights, pontos críticos e melhorias.
        -   **Ativação por Menção:** Identificar quando o agente é chamado (ex: `@meu-agente`).
    3.  **Orquestrar Ações:**
        -   **Criar Tarefas:** Quando ativado para criar uma tarefa, ele irá extrair o conteúdo da mensagem e executar o comando `node` do seu agente `account` (ex: `node -e "require('./lib/clickup').createTask(...)"`), preenchendo os detalhes dinamicamente. Ele pode até mesmo iniciar o fluxo interativo de perguntas (prioridade, cliente, etc.) enviando mensagens de volta para o grupo.
        -   **Gerar Relatórios:** Quando solicitado a analisar a conversa, ele agrupará as mensagens recentes e as enviará para a API da Gemini com um prompt como: "Resuma a seguinte conversa de um time de projeto, identifique 3 pontos de atenção e sugira 2 melhorias no processo."
    4.  **Responder via API:** Usar a API do Stevo.chat para enviar as respostas (confirmação de tarefa criada, o resumo da Gemini, perguntas para o usuário, etc.) de volta para o grupo de WhatsApp.

### 3. Seu Agente `account` (O Executor de Tarefas)

- **Função:** Como já definido em `@meu-projeto/.claude/commands/AIOS/agents/account.md`, ele é o especialista em interagir com o ClickUp.
- **Integração:** O **Servidor do Agente** não irá reinventar a roda. Ele simplesmente irá invocar os comandos `node` que seu agente `account` já sabe usar. Isso mantém a lógica de negócios centralizada e reutilizável.

## Detalhes da API Stevo.chat

- **Autenticação:** `ApiKeyAuth`. Uma chave de API deve ser fornecida.
- **Endpoint de Envio de Texto:** `POST /send/text`
- **Corpo da Requisição:**
    ```json
    {
      "number": "ID_DO_GRUPO_OU_USUARIO@g.us",
      "text": "Sua mensagem aqui",
      "quoted": {
        "messageId": "ID_DA_MENSAGEM_PARA_RESPONDER"
      }
    }
    ```

## Fluxo de Dados (Exemplo: Criação de Tarefa)

1.  **Usuário no WhatsApp:** "Galera, @meu-agente por favor crie uma tarefa para preparar a apresentação para o cliente XPTO."
2.  **Stevo.chat:** Recebe a mensagem e envia um JSON para `https://seu-servidor.com/webhook/whatsapp`.
3.  **Servidor do Agente:**
    -   Recebe o JSON e vê que a mensagem contém "@meu-agente" e a intenção de "criar uma tarefa".
    -   Extrai o título: "Preparar a apresentação para o cliente XPTO".
    -   Usa a API do Stevo.chat para responder: "Entendido. Qual a prioridade? (1-Urgente, 2-Alta, 3-Normal)".
    -   ... (continua o fluxo de perguntas do seu agente `account`).
    -   Após coletar as respostas, executa o comando: `node -e "require('./lib/clickup').createTask({ title: 'Preparar a apresentação...', ... })"`.
    -   Recebe a confirmação de sucesso do script.
    -   Usa a API do Stevo.chat para responder: "✅ Tarefa criada! #CU-12345 Preparar a apresentação..."

## Próximos Passos

1.  **Implementar o Servidor:** Criar o arquivo `whatsapp-agent-server.js` com um framework web (Express.js) para receber as chamadas do webhook.
2.  **Configurar Variáveis de Ambiente:** Adicionar `STEVO_API_URL` e `STEVO_API_KEY` ao seu arquivo `.env`.
3.  **Testar Conexão:** Usar uma ferramenta como `ngrok` para expor o servidor localmente e configurar a URL do webhook no painel do Stevo.chat para testes iniciais.
4.  **Implementar o Fluxo:** Começar com o caso de uso mais simples, como responder a uma menção, e depois implementar a lógica de criação de tarefas e análise com a Gemini.
