# Poder do Networking (PDN) — Knowledge Base

**Cliente/Projeto:** Poder do Networking
**Dono:** Bruno Avelar
**Criado:** 2026-04-06
**Atualizado:** 2026-04-08

---

## Indice

| Arquivo | Conteudo |
|---------|----------|
| `profile.md` | Visao geral, produtos, ICP, tom de voz |
| `funis/pdn-vendas.md` | Funil Raio-X Comercial (form.pdnvendas.com.br) |
| `funis/pdn-vendas-terceira-onda.md` | Funil Terceira Onda (terceiraonda.pdnvendas.com.br) |
| `funis/pdn-evento.md` | Funil PDN Evento captura (form.poderdonetwork.com) |
| `funis/pdn-evento-checkout.md` | Funil PDN Evento checkout direto (goiania.poderdonetwork.com) |
| `knowledge-base/terceira-onda-trafego.md` | KB Alexandre Clare, metodologia, transcricoes |
| `campaigns/` | Campanhas de trafego |

---

## 4 Funis Ativos — Resumo Simples

### 1. goiania.poderdonetwork.com (PDN Evento Goiania - Checkout Direto)

**Hook:** "Voce nao trava por falta de esforco. Voce trava porque esta no ambiente errado."

**Fluxo:** Quiz 4 perguntas → Loading → Pagina de venda → Checkout direto (Kirvano/Kiwify)

**NAO tem formulario de captura.** Lead responde quiz e vai direto pra venda.

| Etapa | Pergunta |
|-------|----------|
| Q1 | O que trava seu proximo salto de faturamento (5 opcoes) |
| Q2 | O que vai ter mudado em 6 meses (4 opcoes) |
| Q3 | Como descreve o momento do negocio (4 opcoes) |
| Q4 | O que te move a buscar um ambiente diferente (4 opcoes) |
| Loading | "Aguarde enquanto avaliamos suas respostas..." |
| Resultado | Sales page + checkout direto |

---

### 2. form.poderdonetwork.com (PDN Evento - Captura de Lead)

**Hook:** "Qual negocio voce deixou de fazer por nao estar no ambiente certo?"

**Fluxo:** Quiz 6 perguntas (inclui geo + intencao de compra) → Form captura → SDR entra em contato

| Etapa | Pergunta |
|-------|----------|
| Q1 | O que trava o crescimento (4 opcoes) |
| Q2 | O que tera mudado em 6 meses (4 opcoes) |
| Q3 | Como voce se descreve hoje (4 opcoes) |
| Q4 | Brasil ou fora? (4 opcoes) |
| Q5 | Qual cidade mais viavel? (4 opcoes - condicional Brasil) |
| Q6 | Como decide investir num dia de imersao? (4 opcoes - intencao de compra) |
| Form | Nome + WhatsApp + Email → CTA: "QUERO PARTICIPAR DO PDN" |

---

### 3. form.pdnvendas.com.br (Raio-X Comercial)

**Hook:** "Quanto dinheiro seu comercial esta deixando na mesa todo mes?"

**Fluxo:** Quiz 4 perguntas sobre time comercial → Form captura → Raio-X + SDR

| Etapa | Pergunta |
|-------|----------|
| Q1 | Dono de empresa ou lidera time comercial? (3 opcoes) |
| Q2 | Faturamento mensal (4 opcoes) |
| Q3 | Maior desafio comercial (4 opcoes) |
| Q4 | O que acontece se nao resolver em 90 dias? (4 opcoes) |
| Form | Nome + WhatsApp + Email → CTA: "QUERO VER O RESULTADO" |

---

### 4. terceiraonda.pdnvendas.com.br (Terceira Onda - Alexandre Clare)

**Hook:** "Existe uma terceira fonte de leads que os americanos ja dominaram. A maioria dos brasileiros ainda nao ouviu falar."

**Fluxo:** Quiz 4 perguntas sobre canais de aquisicao → Form com timer 15min → Sessao com Alexandre Clare

| Etapa | Pergunta |
|-------|----------|
| Q1 | Faturamento mensal (4 opcoes) |
| Q2 | De onde vem os clientes hoje (4 opcoes) |
| Q3 | Qual situacao mais se aproxima (4 opcoes) |
| Q4 | O que preocupa se nao resolver em 90 dias (4 opcoes) |
| Form | Timer 15min + Nome + WhatsApp + Email → CTA: "GARANTIR MINHA SESSAO ESTRATEGICA" |

---

## Diferenca entre os funis

| Funil | Tem form? | Destino | Make → AC |
|-------|-----------|---------|-----------|
| goiania.poderdonetwork.com | NAO | Checkout direto | N/A |
| form.poderdonetwork.com | SIM (6 perguntas + geo) | SDR contato | Lista 47 |
| form.pdnvendas.com.br | SIM (4 perguntas comercial) | Raio-X + SDR | Lista 46 |
| terceiraonda.pdnvendas.com.br | SIM (4 perguntas canais + timer) | Sessao Alexandre | Lista 46 |

---

## Integracao Make.com → ActiveCampaign

| Funil | Scenario Make | Webhook URL |
|-------|--------------|-------------|
| terceiraonda.pdnvendas.com.br | PDN Vendas - Terceira Onda → AC (5190778) | `https://hook.eu1.make.com/o1ajhepgvje2ikciw3ixcs3k4fo4aywa` |
| form.pdnvendas.com.br | PDN Vendas - Raio-X → AC (5190782) | `https://hook.eu1.make.com/nfp5shkteq6oqxayitu6xbsu8e8rjj2s` |
| form.poderdonetwork.com | PDN Evento - Goiania → AC (5190784) | `https://hook.eu1.make.com/zzlr26inxo15ovt9dmzim4suec5yldht` |

Detalhes tecnicos: `memory/make-api-knowledge.md`
