# Gaps Detectados - Agentes Faltantes

> Registro de competências identificadas como necessárias mas não cobertas por nenhum agente.
> Quando um gap é detectado, registrar aqui para tracking.

---

## Formato de Registro

```
### [DATA] Gap: [nome da competência]
- **Detectado por:** @{agent-id}
- **Contexto:** O que estava sendo feito quando o gap foi identificado
- **Competência necessária:** Descrição da expertise faltante
- **Agente sugerido:** @{nome-sugerido} - [perfil]
- **Status:** PENDENTE | CRIADO (@{id} em DD/MM/YYYY)
```

---

## Gaps Registrados

### 2026-04-03 Gap: Inteligencia Financeira da Syra Digital

- **Detectado por:** @blueprint (ao mapear o sistema para criar especificacao de novo agente)
- **Contexto:** Eric pediu criacao de agente financeiro. Verificacao confirmou: zero agente cobria DRE, MRR/ARR da agencia, margem por cliente, breakeven, churn, CAC, projecao de fluxo de caixa da Syra como negocio. O @analyst cobre dados de campanhas dos clientes, nao a saude financeira da propria agencia.
- **Competencia necessaria:** CFO estrategico que consolide dados espalhados (GHL, Meta Ads spend, contratos, custos de infra) em visao financeira acionavel da Syra Digital.
- **Agente sugerido:** @cfo (Vera CFO) — Chief Financial Officer da Syra Digital
- **Status:** CRIADO (@cfo em 2026-04-03)
