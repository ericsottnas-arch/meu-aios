# Agent Learnings — @ghl-maestro (Thalion)

---

## [2026-04-03] Regra: Stevo usa SMS como canal no GHL (não WhatsApp)
**Contexto:** Montando workflow "Chamou WhatsApp" no GHL do Dr. Cleugo
**Feedback:** Eric confirmou que o Stevo envia mensagens via SMS no GHL — o canal aparece como "SMS", não "WhatsApp"
**Regra derivada:** Sempre que configurar filtro de canal para WhatsApp no GHL, usar `Reply channel = SMS` (não WhatsApp) quando a integração é via Stevo
**Severidade:** HIGH

---

## [2026-04-03] Regra: Trigger "Contato Criado" NÃO tem filtro de Source/Canal
**Contexto:** Tentei sugerir filtro `Source = Instagram` no trigger "Contato Criado" — Eric corrigiu duas vezes
**Feedback:** O trigger "Contato Criado" no GHL não possui campo de filtro por source ou canal
**Regra derivada:** Para filtrar por canal (Instagram, WhatsApp/SMS), usar o trigger **"Cliente Respondeu"** com filtro `Reply channel = [canal]`, não "Contato Criado"
**Severidade:** CRITICAL

---

## [2026-04-03] Regra: GHL captura comentários em posts do Instagram nativamente
**Contexto:** Eric configurou trigger no GHL para comentários em publicações do Instagram
**Feedback:** O GHL tem trigger nativo para "comentário em publicação" — cria lead automaticamente
**Regra derivada:** NÃO afirmar que GHL não captura comentários de Instagram. É possível nativamente via trigger de automação. Quando alguém comenta em qualquer post, o GHL pode criar um contato/oportunidade automaticamente na pipeline configurada (ex: Social Selling → Entrada)
**Severidade:** CRITICAL

---

## [2026-04-03] Config: Dr. Cleugo — GHL Location e Pipelines
**Location ID:** `5pupAX6pAY1tiF01b2qo`
**Token PIT:** `pit-2a4bc66c-28e9-4ba3-82d4-6c39d5bd2d17`
**Pipelines:**
- Mentoria: `xDXxlJQR9U8F4dFaC50L`
- Procedimentos: `bVIJAui4cKYng4CKluh6`
- Pós-procedimento: `WMyBxh90gWFgU8bQyhxn`
- Social Selling: `pokTreh52j0Fw9SXawJc` ← Instagram entra aqui (stage "Entrada": `5183723c-a93e-444f-a584-2fb00fba4e64`)

**Workflows publicados relevantes:**
- `[PROSPECÇÃO] Lead respondeu instagram` (ID: 4928cefd) — gatilho Instagram
- `Chamou WhatsApp` (ID: 0411a012) — gatilho: Contato Criado + Cliente Respondeu (SMS)

**Severidade:** HIGH

---

## [2026-04-08] Config: Dr. Humberto Andrade — GHL Location, Users e Stevo

**Location ID:** `uOdD33rlNeQtBc3CatYL`
**Company ID:** `kt6Z1sbZOMLrD8vPrWzR`
**Token PIT:** `pit-768454e1-6fec-4dce-9280-a654c6de43f6` (atualizado 2026-04-20, token anterior expirou)

**Usuarios GHL:**
| Nome | ID | Papel |
|------|-----|-------|
| Flavia Sarraff | `B0gkXItNyfhJgUZgBDfF` | Vendedora - dona do numero DDD 96 (Macapa) |
| Veronica Marise | `od66JGJ9el9wZg7R3ves` | Vendedora - dona do numero DDD 11 (SP) |
| Ardina | `ATW63K2pGMsgZpUZXysr` | Vendedora (nao deveria ter leads) |
| July | `HEMrRXCfuyYX0OlYHLD0` | Vendedora (nao deveria ter leads) |
| Simone | `fnLKSe8X9TRS9evtqnCL` | Vendedora (nao deveria ter leads) |
| Zaya | `tvRjuPMCaPWWmTVFBkXJ` | Vendedora (nao deveria ter leads) |
| Tatiane | `rEPM0twkMSyjmg9BplNr` | Vendedora (nao deveria ter leads) |
| Eric | `T4BmTsa7QYsDBmZmyVkk` | Admin |
| Dr Humberto | `5ZqvI8xX8oe4bBLjIZho` | Dono |

**Stevo Instances:**
- `dddmacapa` -> DDD 96 (Macapa) -> Flavia
- `dddsaopaulo` -> DDD 11 (SP) -> Veronica

**Severidade:** HIGH

---

## [2026-04-08] Aprendizado: Identificacao de origem Stevo via URL (nao conteudo da foto)

**Contexto:** Redistribuicao de ~2.300 leads entre Flavia e Veronica no GHL do Dr. Humberto
**Descoberta:** O Stevo armazena fotos de perfil e attachments com o nome da instancia na URL:
- URL contem `dddmacapa` -> lead veio pelo numero de Macapa (Flavia)
- URL contem `dddsaopaulo` -> lead veio pelo numero de SP (Veronica)

**3 metodos de identificacao (em ordem de confiabilidade):**
1. `profilePhoto` do contato - URL contem nome da instancia Stevo
2. `attachments` nas mensagens da conversa - URLs de midia tambem contem
3. DDD do telefone do lead - fallback (96=Flavia, 11=Veronica)

**NOTA:** `createdBy.sourceId` e `conversationProviderId` sao IGUAIS para ambas instancias - nao servem para diferenciar.

**Severidade:** CRITICAL

---

## [2026-04-08] Aprendizado: Paginacao GHL instavel durante mudancas

**Contexto:** Scripts de varredura completa perdiam contatos entre paginas
**Problema:** A API de contatos do GHL usa `startAfterId` para paginacao. Quando dados mudam durante a varredura (leads novos, assignedTo alterado), contatos podem ser pulados.
**Solucao:** Em vez de varrer TODOS os contatos, buscar diretamente por usuario com `assignedTo={userId}`. Isso garante que nenhum contato do usuario seja perdido.
**Severidade:** HIGH

---

## [2026-04-08] Resultado: Redistribuicao Dr. Humberto - 2.112 leads corrigidos

**Execucao em 3 rodadas:**
- Rodada 1: 1.334 atualizados (via profilePhoto + mensagens Stevo)
- Rodada 2: 598 atualizados (via DDD do telefone)
- Rodada 3: 180 atualizados (busca direta por usuario)
- **Total: ~2.112 contatos redistribuidos**

**Restantes (~146):** DDDs de outras regioes (61, 68, 77, 79, 83, 91, internacionais), numeros Meta Ads Privacy, contatos sem telefone - nao identificaveis automaticamente.

**Scripts criados:** `scripts/ghl-reassign-leads.js` (principal), `/tmp/ghl-ddd-reassign.js`, `/tmp/ghl-audit.js`, `/tmp/ghl-fix-by-user.js`
**Severidade:** INFO

---

## [2026-04-27] Config: Dra. Gabrielle Oliveira — GHL Location e Token

**Location ID:** `3iNi7kJci5f0BNUoq4kX`
**Token PIT:** `pit-61f9a255-8d3a-499c-abc1-e1784803a6b7` (atualizado 2026-04-27, token anterior: pit-75807258-fcf2-4dcd-98db-fdee5d35feb1)
**Script de extracao:** `meu-projeto/scripts/extract-ghl-gabrielle.js`
**DB local:** `docs/clientes/estetica-gabrielleoliveira/banco-dados/conversas.db`

**Severidade:** HIGH

---

## [2026-04-27] Aprendizado: DELETE /contacts/{id}/tags retorna 400 em alguns contatos

**Contexto:** Re-tag de 63 contatos MQL da Dra. Gabrielle
**Problema:** O endpoint `DELETE /contacts/{id}/tags` retornava 400 "Contact not found" para a maioria dos contatos, mesmo com IDs validos retornados pela API de listagem.
**Solucao:** Usar `PUT /contacts/{id}` com o array completo de tags (sem "mql") para remover, e depois outro PUT com o array incluindo "mql" para adicionar. Funciona 100%.
**Regra derivada:** Para operacoes de tag em massa, preferir PUT com array completo de tags em vez de DELETE/POST no endpoint /tags.
**Severidade:** HIGH

---

## [2026-04-27] Aprendizado: Paginacao /opportunities/search usa `page`, NAO `startAfterId`

**Contexto:** Auditoria de oportunidades do Dr. Humberto - script ficou em loop infinito buscando 85k+ oportunidades
**Problema:** O endpoint `GET /opportunities/search` ignora o parametro `startAfterId`. Retorna sempre a mesma pagina (meta.currentPage=1, meta.nextPage=2), causando loop infinito de duplicatas.
**Solucao:** Usar paginacao por `page` (query param `page=1`, `page=2`, etc). O `meta.nextPage` retorna o proximo numero de pagina corretamente.
**Regra derivada:** Para /opportunities/search, SEMPRE usar `page={n}` para paginar. Para /contacts, usar `startAfterId`. Cada endpoint do GHL pode ter mecanismo de paginacao diferente.
**Severidade:** CRITICAL

---

## [2026-04-27] Resultado: Auditoria e correcao de proprietarios Dr. Humberto

**Dados reais:** 2.663 oportunidades unicas (18 AGENDAMENTOS + 5 EDUCACIONAL + 2.640 PROCEDIMENTO), 2.488 contatos unicos
**Inconsistencias encontradas:** 246 (231 sem dono + 15 com dono diferente)
**Corrigidos:** 246/246 (100% sucesso) via PUT /opportunities/{id} com assignedTo do contato
**Severidade:** INFO
