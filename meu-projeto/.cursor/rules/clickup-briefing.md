# ClickUp: criar tarefa por áudio/briefing

Quando o usuário estiver com **@account** ou pedir criação no ClickUp e enviar **áudio** (transcrito pelo Cursor) ou **texto** com um briefing:

1. **Extrair** do texto: um **título** curto (ex.: primeira frase ou resumo) e o **briefing completo** como descrição.
2. **Rodar** o script (usa .env; as tarefas são criadas na lista TAREFAS, status **NA FILA**):
   ```bash
   node scripts/create-clickup-task.js "Título da tarefa" "Texto completo do briefing..."
   ```
   Se o briefing for muito longo, passar o título como primeiro argumento e o resto como segundo (pode ser múltiplas linhas entre aspas).
3. **Mostrar** o link da tarefa criada (`result.url`) e confirmar que foi criada em **NA FILA**.

**Configuração do usuário** (lista SYRA DIGITAL > Clientes > TAREFAS, status TRÁFEGO | ANDAMENTO | NA FILA):
- `.env`: `CLICKUP_API_KEY`, `CLICKUP_LIST_ID` (ID da lista TAREFAS), e opcionalmente `CLICKUP_DEFAULT_STATUS=NA FILA`.

Se faltar `CLICKUP_LIST_ID` ou `CLICKUP_API_KEY`, avisar para preencher o `.env` e como obter o list_id (link da lista, número no final da URL).
