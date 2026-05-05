/**
 * Cria Google Doc de Otimizações — Dra. Gabrielle — Maio 2026
 * Executado por: @media-buyer (Celo) + @copy-chef + @bi-analyst
 */

const { createDoc, findClientFolder } = require('../lib/drive');

const CONTENT = `RELATORIO DE OTIMIZACOES — DRA. GABRIELLE OLIVEIRA
Campanha: [Syra] Emagrecimento | Conta: act_1136892320236480
Data de execucao: 04/05/2026
Executado por: @media-buyer (Celo) — Syra Digital AIOS


════════════════════════════════════════════════════════
1. CONTEXTO E ANALISE PRE-OTIMIZACAO
════════════════════════════════════════════════════════

SITUACAO INICIAL (04/05/2026)

Os anuncios da Dra. Gabrielle pararam de veicular porque a conta zerou o saldo
(R$0,83 restantes). O problema foi causado por um spike de gasto nos dias 28-29/abr,
quando os adsets P11 e P12 foram ativados sem controle de budget — resultando em
R$428 gastos em 2 dias. O spend cap historico de R$10.059 tambem estava proximo
de ser atingido (apenas R$21 de margem).

PERFORMANCE ATUAL (Ultimos 7 dias — dados via Meta Ads API)

  Gasto total:     R$636,93
  Leads gerados:   46
  CPL medio:       R$13,84
  CTR medio:       2,01%
  CPM:             R$22,09
  Impressoes:      28.830
  Alcance:         17.198

PERFORMANCE HISTORICA (Ultimos 30 dias)

  P5 Broad [Caieiras-Cajamar] 30-55F
    Leads: 70 | CPL: R$9,04 | Volume: 67% de todos os leads da conta
    Status: PRINCIPAL — melhor adset por volume e custo

  P10 LLK Engaja/DM/Save
    Leads: 34 | CPL: R$8,70
    Status: ATIVO — melhor CPL, publico lookalike engajado

  P11 LLK MQL 22/04
    Leads: em teste | CPL: em validacao
    Status: ATIVO — budget reduzido para R$5/dia

  P12 LLK Conectados/Oportunidade
    Leads: 0 | CPL: sem dados
    Status: PAUSADO — zero resultado em periodo de teste

  P1 Retargeting Amplo (CBO)
    Leads: 17 | CPL: R$9,69
    Status: ATIVO — CBO R$15/dia, retargeting funcionando

  P2 Retargeting Profundo
    CPL: R$24 (alto)
    Status: PAUSADO — CPL insustentavel para a verba disponivel

FUNIL GHL (analise cruzada Meta x CRM)

  Total leads Meta:       188
  MQLs (qualificados):     84  (44,7% de taxa — referencia boa)
  Consultas agendadas:      3  (3,6% — GARGALO CRITICO no comercial)
  Ganhos:                   5

  O problema nao esta nas campanhas. Esta no atendimento pos-lead.
  Prioridade: trabalhar processo comercial para converter os 84 MQLs ativos.

DIAGNOSTICO DE UTM

  100% dos MQLs sem utm_campaign e utm_content no GHL.
  Causa: tracking de UTM nao configurado para formularios Meta.
  Impacto: impossivel atribuir MQL/venda a adset/criativo especifico.

POSICIONAMENTOS

  Instagram performa melhor que Facebook em P5 e P10 (~5% menor CPL).


════════════════════════════════════════════════════════
2. OTIMIZACOES EXECUTADAS
════════════════════════════════════════════════════════

DATA: 04/05/2026

── ACAO 1: Correcao de Budget Total ──────────────────────────────────────────

  Problema: Budget configurado em R$164/dia — 3,3x acima da verba mensal de R$1.500.
  Verba mensal: R$1.500 = R$50/dia (limite maximo).
  Resultado: ✓ APLICADO — budgets reconfigurados para total de R$50/dia.

── ACAO 2: Pausa de P12 LLK Conectados/Oportunidade ─────────────────────────

  ID: 120246322261580249
  Motivo: Zero leads em todo o periodo de veiculacao. Publico frio sem retorno.
  Resultado: ✓ PAUSADO

── ACAO 3: Pausa de P2 Retargeting Profundo ─────────────────────────────────

  ID: 120245734879710249
  Motivo: CPL de R$24 — 2,6x acima da meta. Insustentavel para verba de R$1.500/mes.
  Resultado: ✓ PAUSADO

── ACAO 4: Reativacao de Criativo C4 (3 anos de resultados) ─────────────────

  ID: 120243219778960249 (P5)
  Metricas: 25 leads | CPL R$9,49 | estava pausado incorretamente
  Motivo: Criativo com historico positivo desativado sem justificativa de dados.
  Resultado: ✓ REATIVADO em P5

── ACAO 5: Reativacao de AD9 Resultados Reais ───────────────────────────────

  ID: 120243219785580249
  Metricas: 3 leads + 1 mensagem | criativo de prova social
  Motivo: Criativo de resultados reais com engagement — pausado incorretamente.
  Resultado: ✓ REATIVADO

── ACAO 6: Recreacao de C8 Body2 (policy-compliant) ─────────────────────────

  Criativo original reprovado: copy continha "7kg em 4 semanas" (claim especifico
  de resultado de saude — violacao de politica Meta).
  Nova copy: foco em processo e consistencia, sem claims numericos.
  Resultado: ✓ SUBMETIDO PARA REVISAO META

── ACAO 7: Recreacao de C7 Barriga (policy-compliant) ───────────────────────

  Criativo original reprovado: copy continha "pochete e culote somem" (atributo
  fisico pessoal + linguagem before/after — violacao de politica Meta).
  Nova copy: foco em transformacao de habitos, sem referencia a partes do corpo.
  Resultado: ✓ SUBMETIDO PARA REVISAO META

── ACAO 8: Distribuicao Final de Budget ─────────────────────────────────────

  P5 Broad [Caieiras-Cajamar]      R$20/dia   (ABO)
  P10 LLK Engaja/DM/Save           R$10/dia   (ABO)
  P11 LLK MQL 22/04                R$ 5/dia   (ABO)
  P1 Retargeting Amplo             R$15/dia   (CBO campanha)
  ─────────────────────────────────────────────────
  TOTAL                            R$50/dia ✓

  Resultado: ✓ APLICADO — dentro da verba mensal de R$1.500


════════════════════════════════════════════════════════
3. ESTADO POS-OTIMIZACAO
════════════════════════════════════════════════════════

ADSETS ATIVOS

  Adset                              Budget/dia   Status      CPL validado
  ─────────────────────────────────────────────────────────────────────────
  P5 Broad [Caieiras-Cajamar]        R$20         ATIVO       R$9,04
  P10 LLK Engaja/DM/Save             R$10         ATIVO       R$8,70
  P11 LLK MQL 22/04                  R$ 5         ATIVO       em teste
  P1 Retargeting Amplo (CBO)         R$15 camp    ATIVO       R$9,69
  ─────────────────────────────────────────────────────────────────────────
  TOTAL                              R$50/dia ✓

ADSETS PAUSADOS

  P12 LLK Conectados/Oportunidade   → 0 leads (pausado)
  P2 Retargeting Profundo            → CPL R$24 (pausado)
  P6 Grande SP Nobres                → PAUSADO PERMANENTE (nunca reativar)

CRIATIVOS

  C11 Espelho [Estático Stories]     ATIVO    28 leads | CPL R$8,80 | CTR 2,16%
  C4 [Resultados 3 anos]             ATIVO    25 leads | CPL R$9,49 (reativado)
  AD9 Resultados Reais               ATIVO     3 leads + 1 msg (reativado)
  C10 Feed 4x5                       ATIVO     1 lead  | CPL R$9,75 | CTR 3,46%
  C8 Body2 v2-policy                 EM REVISAO META
  C7 Barriga v2-policy               EM REVISAO META


════════════════════════════════════════════════════════
4. ALERTAS E PROXIMAS ACOES
════════════════════════════════════════════════════════

[CRITICO] Saldo da conta zerado — recarregar saldo urgente para retomar veiculacao.

[CRITICO] Spend cap historico proximo do limite (apenas R$21 de margem).
  Acao: aumentar spend cap no painel Meta Ads Business antes de recarregar saldo.

[ALTO] 100% dos MQLs sem UTM no GHL — impossivel atribuir resultado a campanha.
  Acao: configurar tracking UTM nos formularios Meta via pixel event.

[ALTO] Taxa de consultas agendadas de 3,6% e gargalo critico no comercial.
  Acao: revisar processo de atendimento para converter os 84 MQLs ativos no pipeline.

[MEDIO] C8 e C7 v2 aguardando aprovacao Meta — monitorar status nas proximas 24-48h.

[MEDIO] P11 em fase de aprendizado — nao otimizar ou pausar nas proximas 72h.

Proximas acoes:
  [ ] Recarregar saldo da conta + aumentar spend cap
  [ ] Configurar UTM tracking nos formularios Meta (via pixel)
  [ ] Revisar processo comercial de abordagem dos 84 MQLs no pipeline
  [ ] Monitorar aprovacao de C8/C7 v2 (prazo Meta: 24-48h)
  [ ] Validar P11 com dados apos 72h de veiculacao
  [ ] Avaliar novos criativos para P5 (C11 com maior volume, testar variacao)


════════════════════════════════════════════════════════
5. DADOS TECNICOS
════════════════════════════════════════════════════════

Conta Meta Ads:     act_1136892320236480
Pixel Meta:         instalado (formulario nativo)
GHL Location:       Dra. Gabrielle Oliveira
Fonte dos dados:    Meta Ads API v21.0 + GHL API
Metodologia:        dados reais via API (nao estimativas)
Janela atribuicao:  7 dias clique + 1 dia visualizacao


---
✍️ @media-buyer (Celo) · Media Buyer
📋 Documentado por @alex · Syra Digital AIOS
🤖 Gerado em: 04/05/2026


════════════════════════════════════════════════════════
📲  MENSAGEM WHATSAPP — PRONTA PARA ENVIAR
════════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *Atualizacao de Campanhas — Maio/2026*
_Dra. Gabrielle | Syra Digital_

━━━━━━━━━━━━━━━━

Gabi, inicio de mes e vou te passar um panorama completo do que foi feito e onde estamos.

A conta zerou o saldo nos ultimos dias do mes passado — identificamos o problema, corrigimos a estrutura e ja deixamos tudo otimizado para retomar agora.

━━━━━━━━━━━━━━━━

📈 *Ultimos 7 dias*

Gasto: R$636,93 | Leads: 46 | CPL medio: R$13,84
CTR: 2,01% | Alcance: 17.198 pessoas

━━━━━━━━━━━━━━━━

✅ *O que ajustamos hoje (04/05)*

🔴 *Budget corrigido* — estavamos configurados para R$164/dia (3x acima do limite). Ajustado para R$50/dia exato.

🔴 *P12 pausado* — publico lookalike de conectados/oportunidade sem nenhum lead gerado. Verba realocada para quem entrega.

🔴 *P2 Retargeting Profundo pausado* — CPL de R$24, impraticavel para nosso ticket. So ativamos se volume aumentar muito.

🟢 *P5 Broad Caieiras-Cajamar mantido* — nosso melhor publico. 70 leads no mes passado, CPL R$9,04. Recebeu o maior budget: R$20/dia.

🟢 *Criativos pausados reativados* — C4 (25 leads, CPL R$9,49) e AD9 de resultados reais estavam pausados sem motivo. Voltaram a rodar.

🎨 *C8 e C7 recriados* — os dois criativos que foram reprovados pelo Meta foram refeitos com copy dentro da politica. Aguardando aprovacao (24-48h).

━━━━━━━━━━━━━━━━

📊 *Estrutura atual — R$50/dia*

• P5 Broad: R$20/dia (publico frio principal)
• P10 Lookalike engajados: R$10/dia
• P11 Lookalike MQL: R$5/dia (em teste)
• Retargeting: R$15/dia

━━━━━━━━━━━━━━━━

⚠️ *Alertas ativos*

1. Saldo da conta zerado — precisamos recarregar para retomar hoje.
2. Spend cap historico no limite — vamos aumentar junto com o recarregamento.
3. Gabi, um ponto importante: temos 84 leads qualificados no pipeline sem avanco. O CPL esta otimo, mas a taxa de consultas agendadas esta em 3,6%. O gargalo nao esta nas campanhas — esta no atendimento. Vale revisarmos o processo juntos.

━━━━━━━━━━━━━━━━

📌 *Proximas acoes*

1. Recarregar saldo + aumentar spend cap
2. Acompanhar aprovacao dos novos criativos
3. Configurar UTM para rastrear qual campanha gera MQL
4. Revisao do processo comercial (84 MQLs esperando contato)

*Syra Digital*
`;

async function main() {
  console.log('Criando Google Doc de Otimizacoes — Dra. Gabrielle...');

  try {
    const folder = await findClientFolder('Gabrielle');
    const folderId = folder?.id || null;

    if (folder) {
      console.log(`Pasta da Gabrielle encontrada: ${folder.name} (${folder.id})`);
    } else {
      console.log('Pasta da Gabrielle nao encontrada — criando na raiz do Drive.');
    }

    const doc = await createDoc(
      'Otimizacoes Meta Ads — Dra. Gabrielle — Maio 2026',
      CONTENT,
      folderId
    );

    console.log('\n✓ Google Doc criado com sucesso!');
    console.log(`  ID: ${doc.id}`);
    console.log(`  URL: ${doc.url}`);

  } catch (err) {
    console.error('Erro ao criar doc:', err.message);
    process.exit(1);
  }
}

main();
