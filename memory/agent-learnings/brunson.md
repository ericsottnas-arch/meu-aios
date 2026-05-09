# Agent Learnings — @brunson (Russell Brunson)

> Feedbacks acumulados do Eric. Regras cumulativas — nunca remover, só adicionar.

---

## [2026-04-08] Feedback: @brunson escreveu copy diretamente — falha recorrente

- **Contexto:** Funil PDN Evento Checkout — @brunson arquitetou o funil E escreveu toda a copy (headlines, perguntas do quiz, sales page, CTAs) sem delegar para @copy-chef.
- **Feedback:** Eric perguntou quem fez a copy. Ao confirmar que foi o @brunson, disse "isso não é a primeira vez" — falha sistêmica recorrente, não pontual.
- **Causa raiz:** Regra de delegação existia como texto no agente, mas sem mecanismo de parada durante a execução. Em modo de momentum, @brunson preenchia os blocos vazios sozinho.
- **Regra derivada:**
  - @brunson NUNCA escreve copy — nem placeholder, nem funcional, nem provisória
  - Ao identificar necessidade de qualquer texto persuasivo: PARAR e chamar @copy-chef via Skill tool ANTES de continuar
  - @copy-chef é o único ponto de entrada — ele distribui para @halbert, @georgi, @wiebe conforme o tipo
  - Delegação direta para @halbert/@georgi sem passar pelo @copy-chef = também errado
- **Severidade:** CRITICAL
- **Arquivos atualizados:**
  - `.claude/commands/AIOS/agents/brunson.md` — hard block adicionado em `whenToUse` e `orchestrationMode`
  - `memory/rules/agentes-comportamento.md` — regra crítica adicionada no topo

---

## [2026-04-08] Aprendizado: Como configurar Make.com para INLEAD → ActiveCampaign

- **Contexto:** Funis INLEAD do PDN precisavam enviar leads para listas do ActiveCampaign via Make.com.
- **Arquitetura correta (2 modulos apenas):**

```
Webhook (Custom webhook) → ActiveCampaign: Create a Contact (legacy)
```

- **NAO usar** modulo separado "Update Contact's List Status" — o "Create a Contact" ja tem campo `listId` embutido.
- **Campo correto no mapper:** `listId` (nao `list`, nao `listStatus`)
- **Mapper completo do CreateOrUpdateContact:**

```json
{
  "listId": "46",
  "email": "{{1.email}}",
  "firstName": "{{1.nome}}",
  "phone": "{{1.telefone}}",
  "tags": "",
  "lastName": "",
  "customFields": []
}
```

- **Modulo Make correto:** `activecampaign:CreateOrUpdateContact` v1
- **Conexao AC do PDN:** ID `5605211` (admin, info@pdnpro.com)

### Cenarios criados (todos ativos):

| Cenario | Hook ID | Webhook URL | Lista AC |
|---------|---------|-------------|----------|
| PDN Vendas - Terceira Onda → AC (5190778) | 2803331 | `https://hook.eu1.make.com/o1ajhepgvje2ikciw3ixcs3k4fo4aywa` | 46 |
| PDN Vendas - Raio-X → AC (5190782) | 2803333 | `https://hook.eu1.make.com/nfp5shkteq6oqxayitu6xbsu8e8rjj2s` | 46 |
| PDN Evento - Goiania → AC (5190784) | 2803334 | `https://hook.eu1.make.com/zzlr26inxo15ovt9dmzim4suec5yldht` | 47 |

### Detalhes tecnicos Make API:

- `concept: false` e OBRIGATORIO no payload de criacao de scenario
- `name` do scenario vai DENTRO do blueprint JSON, nao no payload raiz
- Python urllib e bloqueado pelo Cloudflare — usar curl
- Para o cenario ficar `islinked: true`, o metadata `restore` precisa ter os dados da conexao
- KB completa: `memory/make-api-knowledge.md`

- **Severidade:** HIGH
- **Regra derivada:** Ao arquitetar funis que usam INLEAD, incluir na delegacao para @ghl-maestro ou @dev a configuracao do Make com essa estrutura exata. Nunca complicar com modulos extras quando o modulo principal ja resolve.

---

## [2026-04-08] Referencia: 4 Funis PDN Ativos — Estrutura Real

### 1. goiania.poderdonetwork.com (PDN Evento Goiania - Checkout Direto)

- **Hook:** "Voce nao trava por falta de esforco. Voce trava porque esta no ambiente errado."
- **Fluxo:** Quiz 4 perguntas → Loading → Sales page → Checkout direto (Kirvano/Kiwify)
- **NAO tem formulario de captura.** Lead responde quiz e vai direto pra venda.
- **Perguntas:**
  1. O que trava seu proximo salto de faturamento (5 opcoes)
  2. O que vai ter mudado em 6 meses (4 opcoes)
  3. Como descreve o momento do negocio (4 opcoes)
  4. O que te move a buscar um ambiente diferente (4 opcoes)

### 2. form.poderdonetwork.com (PDN Evento - Captura de Lead)

- **Hook:** "Qual negocio voce deixou de fazer por nao estar no ambiente certo?"
- **Fluxo:** Quiz 6 perguntas (inclui geo + intencao de compra) → Form captura → SDR entra em contato
- **Perguntas:**
  1. O que trava o crescimento (4 opcoes)
  2. O que tera mudado em 6 meses (4 opcoes)
  3. Como voce se descreve hoje (4 opcoes)
  4. Brasil ou fora? (4 opcoes)
  5. Qual cidade mais viavel? (4 opcoes - condicional se Brasil)
  6. Como decide investir num dia de imersao? (4 opcoes - intencao de compra)
  7. Form: Nome + WhatsApp + Email → "QUERO PARTICIPAR DO PDN"

### 3. form.pdnvendas.com.br (Raio-X Comercial)

- **Hook:** "Quanto dinheiro seu comercial esta deixando na mesa todo mes?"
- **Fluxo:** Quiz 4 perguntas sobre time comercial → Form captura → Raio-X + SDR
- **Perguntas:**
  1. Dono de empresa ou lidera time comercial? (3 opcoes)
  2. Faturamento mensal (4 opcoes)
  3. Maior desafio comercial (4 opcoes)
  4. O que acontece se nao resolver em 90 dias? (4 opcoes)
  5. Form: Nome + WhatsApp + Email → "QUERO VER O RESULTADO"

### 4. terceiraonda.pdnvendas.com.br (Terceira Onda - Alexandre Clare)

- **Hook:** "Existe uma terceira fonte de leads que os americanos ja dominaram."
- **Fluxo:** Quiz 4 perguntas sobre canais de aquisicao → Form com timer 15min → Sessao com Alexandre Clare
- **Perguntas:**
  1. Faturamento mensal (4 opcoes)
  2. De onde vem os clientes hoje (4 opcoes)
  3. Qual situacao mais se aproxima (4 opcoes)
  4. O que preocupa se nao resolver em 90 dias (4 opcoes)
  5. Timer 15min + Form: Nome + WhatsApp + Email → "GARANTIR MINHA SESSAO ESTRATEGICA"

### Mapa de integracao

| Funil | Tem form? | Destino | Make → AC Lista |
|-------|-----------|---------|-----------------|
| goiania.poderdonetwork.com | NAO | Checkout direto | N/A |
| form.poderdonetwork.com | SIM | SDR contato | 47 |
| form.pdnvendas.com.br | SIM | Raio-X + SDR | 46 |
| terceiraonda.pdnvendas.com.br | SIM + timer | Sessao Alexandre | 46 |

- **Severidade:** HIGH
- **Regra derivada:** Ao auditar ou criar novos funis PDN, consultar esta referencia para manter consistencia de estrutura. goiania e checkout direto (sem form), os outros 3 sao captura de lead com form.
