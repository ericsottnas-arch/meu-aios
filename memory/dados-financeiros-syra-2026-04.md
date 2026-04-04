# Dados Financeiros Syra Digital — Levantamento 2026-04-03

> Dados brutos coletados via PDFs e screenshots em 03/04/2026.
> Fonte: @cfo (Vera CFO). Atualizar conforme novos extratos chegarem.

---

## CUSTOS OPERACIONAIS FIXOS MENSAIS (CORRIGIDOS abr/2026)

| Item | Valor | Cartao | Obs |
|------|-------|--------|-----|
| GHL / GoHighLevel | R$1.636,05 | Porto *4211 intl | USD 297 (dolar R$5,50) |
| Claude Max (assinatura) | R$514,77 | Porto *4211 | cobrado em BRL |
| Anthropic API (nacional) | R$5,00 | Porto *4211 | |
| Anthropic API (intl) | R$27,30 | Porto *4211 | USD 5 |
| Stevo WhatsApp (5x Porto) | R$327,00 | Porto *4211 | R$50+R$59+R$59+R$100+R$59 |
| Stevo WhatsApp (1x PJ) | R$59,00 | Nubank PJ | |
| Freepik Premium | R$80,00 | Porto *4211 | |
| VPS Hostinger | R$55,20 | Nubank PJ | +IOF R$1,93 |
| Canva | R$35,00 | Nubank PF | |
| CapCut | R$65,90 | Itau | |
| Asaas (taxas por boleto) | ~R$10,00 | direto | ~R$1,99/boleto |
| **TOTAL FIXO REAL** | **~R$2.815,22** | | |

Pendentes de estruturacao:
- Vitor (socio): R$3.500/mes — acordo a definir
- Salario do Eric: a definir

Login Stevo: https://www.stevo.chat/login | ericsottnas@gmail.com | @@GHpxtw73@@

---

## RECEITA — ASAAS (fonte de verdade financeira)

API Asaas funcionando. ASAAS_API_KEY em meu-projeto/.env

| Mes | Pagamentos | Total Bruto | Taxas |
|-----|-----------|-------------|-------|
| Fev/2026 | 4 | R$6.644,00 | R$45,33 |
| Mar/2026 | 4 | R$10.847,00 | R$7,96 |
| Abr/2026 (esperado) | 5 pendentes | R$11.896,70 | ~R$10,00 |

Saldo Asaas em 03/04/2026: R$3.232,15

Tags GHL:
- "assessoria" = MRR (recorrente)
- "consulta" e "pacote de documentos" = receita nao-recorrente

Spreadsheet Dr. Erico: `1Br8Fg23cMKwLEjP8dbsz2DRIjwPoRSNoDu47SoX2FW0`

---

## PAGAMENTOS PENDENTES ABRIL 2026

| Valor | Vencimento | Descricao |
|-------|-----------|-----------|
| R$4.400,00 | 19/abr | (sem descricao) |
| R$3.597,00 | 26/abr | Hub de Solucoes Syra Digital |
| R$1.300,00 | 20/abr | (sem descricao) |
| R$2.500,00 | 04/abr | URGENTE — Dr. Enio |
| R$99,70 | 19/abr | Parcela 5 de 10 |

ALERTA: R$2.500 venceu em 04/04/2026.

---

## PROJECAO ABRIL 2026

| | Valor |
|-|-------|
| Receita esperada | R$11.896,70 |
| Custos fixos | ~R$2.815,22 |
| Lucro estimado | ~R$9.081,48 |
| Margem bruta | ~76% |

Receita total abril (com Dr. Enio): R$14.397
Plano: Dia 10 paga moradia (R$2.765) + Vitor (R$3.500) = R$6.265
Sobra dia 10: ~R$1.967 | Entradas restantes: R$9.397 (19/26/20 abr)

---

## CUSTOS PESSOAIS DO ERIC — Essenciais mensais

| Item | Valor |
|------|-------|
| Aluguel | R$1.950 |
| Condominio | R$560 |
| Internet casa | R$140 |
| Internet celular | R$50 |
| Luz | R$65 |
| **Total moradia** | **R$2.765** |
| Comida (supermercados) | ~R$1.373 |
| Gasolina | ~R$742 |
| **Total essencial/mes** | **~R$4.880** |

---

## FATURAS DE CARTAO ABRIL 2026 — RESUMO

| Cartao | Total | Empresa | Pessoal+Parcelas |
|--------|-------|---------|-----------------|
| Porto Seguro (2 ciclos) | ~R$5.912 | ~R$2.590 | ~R$3.222 |
| Nubank PJ | R$2.213,51 | R$116,13 | R$695,25 + R$1.308,22 div. |
| Nubank PF "3ric11" | R$592,60 | R$35,00 | R$336,11 + R$227,83 div. |
| Itau Platinum *3040 | R$226,00 | R$65,90 | R$154 + R$50,82 div. |
| Emprestimos Nubank | R$727,81 | - | R$727,81 (encerram jun/jul) |
| **TOTAL** | **~R$9.672** | **~R$2.807** | **~R$6.765** |

Dividas que ENCERRAM EM ABRIL:
- Nubank PJ: parcela divida 3/3 (R$749,42) + parcelamento fatura 2/2 (R$558,80) = R$1.308,22
Dividas com 2 parcelas restantes:
- Nubank PF: R$227,83 (encerra ~junho)
- Itau: R$50,82 parcela 3/7 (4 restantes)
- Nubank emprestimos: R$727,81 (encerram ~jun/jul)

---

## DETALHES CARTAO PORTO — uso empresa

Porto *4211 empresa (fatura abr):
- GHL: R$1.636,05 (USD 297)
- Claude.AI: R$514,77
- Anthropic API: R$5,00 + R$27,30 (intl)
- Stevo (5x): R$327,00
- Freepik: R$80,00
Total empresa Porto: R$2.590,12

Porto *0335 (Erika adicional): 100% pessoal (~R$2.662)
Porto *133 (Sebastiana): pessoal (~R$1.537)

---

## BACKLOG DE SEGURANÇA

Pendente: Desabilitar signup publico no Supabase
- Acessar: supabase.com → projeto cbhykdpvpnbxvbtlnvpv → Authentication → Providers → Email
- Desativar: `Enable email signup` → OFF
- Whitelist + 2FA ja ativos. Isso fecha o ultimo vetor.
