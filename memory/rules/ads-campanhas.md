# Regras de Ads e Campanhas — @media-buyer (Celo)

> Consultar ao trabalhar com Meta Ads, Google Ads, trafego pago, auditoria de campanhas.
> Ver tambem: [[universal]], [[clientes-medicos]] (ICP correto)

---

## [CRITICAL] NUNCA agir com suposicao — verificar via API primeiro

Antes de qualquer diagnostico ou acao sobre campanhas/adsets/ads:
1. Consultar a API do Meta para verificar campos REAIS
   - optimization_goal
   - destination_type
   - promoted_object
   - billing_event
2. NUNCA inferir configuracao a partir do objetivo da campanha
   - Campanha OUTCOME_ENGAGEMENT pode ter adsets com optimization_goal variado
   - So o campo real no adset importa
3. Subagente pesquisa, Celo VALIDA — nunca aceitar diagnostico de subagente sem validar dados criticos

---

## [CRITICAL] ICP correto — ver [[clientes-medicos]]

**Incluir no ICP:**
- Medicos esteticistas
- HOF (Harmonizacao Orofacial)
- Cirurgioes plasticos
- Clinicas de estetica medica

**NUNCA incluir:**
- Dentistas (mesmo que profissionais HOF tenham diploma CD)
- Fisioterapeutas
- Fonoaudiologos

---

## [HIGH] Protocolo de ativacao — ordem obrigatoria

SEMPRE seguir a ordem:
1. Definicao do agente
2. Knowledge base (memory/)
3. Aprendizados (memory/agent-learnings/media-buyer.md)
4. Feedback rules (design-feedback-rules.json se criativo)
Nunca pular etapas.

---

## [HIGH] Autonomia para pesquisa

Ao encontrar bloqueio (ex: 403 em Meta Ad Library):
- NUNCA desistir e pedir ao Eric para fazer manualmente
- Usar TODAS as ferramentas: cliclick, screencapture, open, osascript
- Tentar browser automation antes de escalar

---

## [HIGH] Metodo Orbita — nome oficial

O metodo se chama METODO ORBITA.
- NUNCA usar "Ciclo Fechado" ou qualquer outro nome
- Conceito: sistema que atrai, captura e nunca perde — quanto mais entra, mais forte fica
- SEM analogias de fisica (gravidade, massa, energia) — so o conceito puro
- Frase-ancora: "Nenhum lead fica pra tras."
- Documentacao completa: `memory/funil-metodo-orbita.md`

---

## [HIGH] Simplicidade acima de tudo

- Frameworks e explicacoes devem ser SIMPLES
- Nao over-engineer analogias
- Se precisa de mais de 2 frases para explicar, esta complexo demais
- O medico precisa entender em 10 segundos

---

## [HIGH] Salvar aprendizados progressivamente

- SEMPRE salvar aprendizados e decisoes ao longo da conversa, NAO apenas ao final
- A cada decisao importante ou descoberta relevante: salvar imediatamente em `memory/`

---

## [HIGH] Dados internos antes de pesquisa externa

Consultar transcricoes de clientes ANTES de fazer pesquisa externa:
- `docs/clientes/*/knowledge-base/reuniao-*.md`
Dados reais superam pesquisa generica.

---

Ultima atualizacao: 2026-03-19
