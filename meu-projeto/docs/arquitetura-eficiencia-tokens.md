# Arquitetura de eficiência de tokens

Guia para gastar menos tokens nas conversas com o Cursor (e outros agentes de código).

---

## 1. O que consome mais tokens

- **Contexto da conversa**: todo o histórico da sessão é enviado a cada mensagem.
- **Arquivos carregados**: tudo que você @ menciona ou que o agente lê entra no contexto.
- **Regras globais e de projeto**: o conteúdo das regras é injetado nas chamadas.
- **Skills**: descrição + conteúdo da skill quando ativada.
- **Respostas longas**: aumentam o histórico e as próximas chamadas.

---

## 2. Práticas que reduzem uso

### Você (usuário)

| Prática | Efeito |
|--------|--------|
| Usar **@arquivo** ou **@pasta** em vez de colar código | Só o necessário vai para o contexto |
| Pedir **uma tarefa por mensagem** | Menos idas e voltas e histórico menor |
| **Fechar conversas** ao mudar de assunto | Novo contexto = sem histórico pesado |
| Manter **regras curtas** em `.cursor/rules/` | Menos tokens injetados em toda mensagem |
| **Descrever o que quer** em 1–2 frases + @ onde for relevante | Menos tentativa e erro |

### Projeto (estrutura)

| Prática | Efeito |
|--------|--------|
| **README** ou índice por pasta | Agente decide o que ler sem abrir vários arquivos |
| **Nomes de arquivo/pasta** claros e consistentes | Busca (grep/search) acha rápido com menos leituras |
| **Documentação essencial** em `docs/` ou `.aios-core/` | Menos “exploração” aleatória do repo |
| **Regra de eficiência** em `.cursor/rules/efficiency-tokens.md` | Orienta o agente a ler menos e ser mais direto |

### Agente (já refletido na regra)

- Preferir **grep/search com escopo** em vez de ler arquivo inteiro.
- Usar **offset/limit** em arquivos grandes.
- **Não** carregar arquivos “por precaução”.
- Respostas **objetivas**, referenciando linha/arquivo em vez de repetir código.
- Ler vários arquivos **em paralelo** quando não depender um do outro.

---

## 3. Checklist rápido

- [ ] Regras em `.cursor/rules/` estão enxutas?
- [ ] Uso @ para dar contexto em vez de colar?
- [ ] Skills têm `description` clara no frontmatter?
- [ ] Existe índice ou README nas pastas principais?
- [ ] A regra `efficiency-tokens.md` está ativa no projeto?

---

## 4. Onde está a regra

A regra que instrui o agente a seguir essas práticas está em:

**`.cursor/rules/efficiency-tokens.md`**

Ela é aplicada automaticamente nas conversas deste projeto.
