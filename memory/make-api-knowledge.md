# Make.com API - Knowledge Base

**Descoberto em:** 2026-04-08
**API Token:** em `.env` como `MAKE_API_TOKEN`
**Base URL:** `https://eu1.make.com/api/v2`
**Org ID:** 6764860 (EU1) | **Team ID:** 1146757

---

## Autenticacao

Header: `Authorization: Token {MAKE_API_TOKEN}`

**IMPORTANTE:** Python urllib e blocked por Cloudflare (erro 1010). Usar `curl` para todas as chamadas.

---

## Endpoints Uteis

| Acao | Metodo | Endpoint |
|------|--------|----------|
| Listar scenarios | GET | `/scenarios?teamId=1146757` |
| Detalhes scenario | GET | `/scenarios/{id}` |
| Blueprint scenario | GET | `/scenarios/{id}/blueprint` |
| Criar scenario | POST | `/scenarios?confirmed=true` |
| Atualizar scenario | PATCH | `/scenarios/{id}?confirmed=true` |
| Deletar scenario | DELETE | `/scenarios/{id}` |
| Listar hooks | GET | `/hooks?teamId=1146757` |
| Criar hook | POST | `/hooks` |
| Listar connections | GET | `/connections?teamId=1146757` |
| Detalhes connection | GET | `/connections/{id}` |

---

## Criar Scenario - Campos Obrigatorios

```json
{
  "teamId": 1146757,
  "blueprint": "<string JSON>",
  "scheduling": "<string JSON>",
  "concept": false
}
```

**CRITICAL:** O campo `concept: false` e OBRIGATORIO. Sem ele, retorna erro 23502.
**CRITICAL:** O `name` do scenario deve estar DENTRO do blueprint JSON, nao no payload raiz.

### Blueprint format

```json
{
  "name": "Nome do Scenario",
  "flow": [...modules...],
  "metadata": {
    "version": 1,
    "instant": true,
    "scenario": {
      "roundtrips": 1,
      "maxErrors": 3,
      "autoCommit": true,
      "autoCommitTriggerLast": true,
      "sequential": false,
      "confidential": false,
      "dataloss": false,
      "dlq": false
    }
  }
}
```

### Scheduling format

```json
{"type": "indefinitely", "interval": 900}
```

---

## Criar Hook (Webhook)

```json
{
  "name": "Nome do Hook",
  "teamId": 1146757,
  "typeName": "gateway-webhook",
  "headers": false,
  "method": false,
  "stringify": false
}
```

Retorna URL do webhook em `hook.url`.

---

## Modulos ActiveCampaign (nomes exatos)

| Modulo | Nome no Make |
|--------|-------------|
| Watch Contacts (trigger) | `activecampaign:WatchContacts` |
| Criar/Atualizar Contato | `activecampaign:CreateOrUpdateContact` |
| Atualizar Status na Lista | `activecampaign:UpdateContactListStatus` |

### Mapper - CreateOrUpdateContact

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

**IMPORTANTE:** O campo da lista e `listId` (NAO `list`). O modulo CreateOrUpdateContact JA aceita `listId` no mapper. NAO precisa de modulo separado UpdateContactListStatus. Usar apenas 1 modulo AC e suficiente.

### Mapper - UpdateContactListStatus (DESNECESSARIO na maioria dos casos)

```json
{
  "contact": "{{2.id}}",
  "list": "47",
  "status": "1"
}
```

So usar se precisar alterar status de lista de um contato JA existente.

**Nomes que NAO funcionam:** `createAContact`, `ActionCreateUpdateAContact`, `createContact`, `CreateContact`, `ActionCreateContact`, `createOrUpdateContact`, `ActionCreateOrUpdateContact`, `upsertContact`, `createUpdateContact`

---

## Connections Existentes

| ID | App | Nome |
|----|-----|------|
| 5605211 | activecampaign | PDN (admin, info@pdnpro.com) |

---

## Scenarios Criados (2026-04-08)

| ID | Nome | Hook | Lista AC |
|----|------|------|----------|
| 5190778 | PDN Vendas - Terceira Onda → AC | 2803331 | 46 |
| 5190782 | PDN Vendas - Raio-X → AC | 2803333 | 46 |
| 5190784 | PDN Evento - Goiania → AC | 2803334 | 47 |

### Webhook URLs

| Funil | URL Make |
|-------|---------|
| terceiraonda.pdnvendas.com.br | `https://hook.eu1.make.com/o1ajhepgvje2ikciw3ixcs3k4fo4aywa` |
| form.pdnvendas.com.br | `https://hook.eu1.make.com/nfp5shkteq6oqxayitu6xbsu8e8rjj2s` |
| form.poderdonetwork.com | `https://hook.eu1.make.com/zzlr26inxo15ovt9dmzim4suec5yldht` |

### Listas AC do PDN

| ID | Nome |
|----|------|
| 34 | ISCA DIGITAL E GRUPOS |
| 40 | (Cuiaba) |
| 46 | Goiania |
| 47 | PDN Vendas |

---

## Scenarios Existentes (antes de 2026-04-08)

| ID | Nome | Acao |
|----|------|------|
| 4668683 | LISTA ISCA DIGITAL | AC WatchContacts (list 34) → HTTP POST Alpaclass SSO |
| 4668705 | LISTA ISCA DIGITAL CUIABA | AC WatchContacts (list 40) → HTTP POST Alpaclass SSO |

Alpaclass SSO: `https://app.alpaclass.com/api/v1/sso` com Bearer `dXEIjWY9mkUFLMMIHeF52sYraRpIA6EMXyKaSQhU`
