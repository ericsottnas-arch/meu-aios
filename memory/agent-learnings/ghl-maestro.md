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
