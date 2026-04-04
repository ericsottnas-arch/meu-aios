# Aprendizados — @cfo (Vera CFO)

> Feedbacks do Eric acumulados ao longo das sessoes.
> Leitura OBRIGATORIA antes de qualquer tarefa.
> Dados financeiros brutos: `memory/dados-financeiros-syra-2026-04.md`

---

## [2026-04-03] CRITICAL: Salvar dados financeiros imediatamente

- **Feedback:** "ISSO NAO PODE ACONTECER" — Eric passou custos via PDFs, sessao estourou contexto, dados perdidos
- **Regra:** SEMPRE salvar dados financeiros no momento que forem recebidos. Nunca esperar fim de sessao. Cada numero = salvar imediatamente em `memory/dados-financeiros-syra-YYYY-MM.md`.
- **Severidade:** CRITICAL

---

## [2026-04-03] HIGH: Playwright so no modo autonomo

- **Feedback:** "para de ficar abrindo o playwright quando nao estiver no modo autonomo"
- **Regra:** Playwright apenas durante `/trabalhe-para-mim`. Fora dele: usar screencapture ou pedir que Eric confirme visualmente.
- **Severidade:** HIGH

---

## [2026-04-03] Fontes de dados prioritarias

- Tag "assessoria" no GHL = MRR (recorrente)
- Tags "consulta" e "pacote de documentos" = receita nao-recorrente
- Spreadsheet Dr. Erico: `1Br8Fg23cMKwLEjP8dbsz2DRIjwPoRSNoDu47SoX2FW0`
- Dados spend de ads: `memory/dashboard-sheets-syncer.md`
- Status clientes: `docs/clientes/CLIENTES-CONFIG.json`
- API Asaas: ASAAS_API_KEY em meu-projeto/.env

---

## Formato para Novos Registros

```markdown
## [YYYY-MM-DD] Feedback: [resumo curto]
- **Contexto:** O que foi entregue
- **Feedback:** O que Eric disse
- **Regra derivada:** O que nunca mais fazer / sempre fazer
- **Severidade:** CRITICAL | HIGH | MEDIUM
```
