require('dotenv').config({ path: 'meu-projeto/.env' });
require('dotenv').config({ path: '.env' });
const { google } = require('googleapis');

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_DOCS_REFRESH_TOKEN;

const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
auth.setCredentials({ refresh_token: REFRESH_TOKEN });

const docs = google.docs({ version: 'v1', auth });
const DOC_ID = '1_t8SeJS7WIEERNmJpCDJUy81jSSR3UK7uKGI5dJQEV4';

const content = `RELATORIO DE OTIMIZACOES — DR. HUMBERTO ANDRADE
Campanha: Blefaroplastia + Paciente Modelo SP | Conta: act_445142030338909
Data de execucao: 24/04/2026
Executado por: @media-buyer (Celo) — Syra Digital AIOS


════════════════════════════════════════════════════════
1. CONTEXTO E ANALISE PRE-OTIMIZACAO
════════════════════════════════════════════════════════

Periodo analisado: ultimos 7 dias
Gasto total: R$2.090,90
Total de leads: 260 | CPL medio: R$7,26

Camp 1 — Topo Video Views
  Gasto: R$204,46 | Leads: 0 | CTR 0,31% | Freq 1,54
  Status: OK (brand awareness, sem expectativa de lead)

Camp 2 — Paciente Modelo Frio
  Gasto: R$393,21 | Leads: 61 | CPL R$6,45 | CTR 4,22% | Freq 1,64
  Status: Saudavel

Camp 3 — Retargeting Morno [ALERTA]
  Gasto: R$321,84 | Leads: 50 | CPL R$6,44 | CTR 3,58% | Freq 2,39
  P1 Engajamento Amplo: R$311,43 | 49 leads | CPL R$6,36
  Status: Frequencia 2,39 — fadiga aproximando, janela de 5-7 dias para rotacao

Camp 4 — Procedimento Frio (principal)
  Gasto: R$1.171,39 | Leads: 149 | CPL R$7,86 | CTR 3,50% | Freq 2,09
  • P1 LLK SP:         R$287,51 | 46 leads | CPL R$6,25 | Freq 2,23 | CTR 5,44%
  • P2 Blefaroplastia: R$220,53 | 29 leads | CPL R$7,60 | Freq 1,41 | CTR 4,22%
  • P3 Rinoplastia:    R$225,02 | 23 leads | CPL R$9,78 | Freq 1,84 | CTR 2,90% [ALTO]
  • P4 Otoplastia:     R$161,10 | 32 leads | CPL R$5,03 | Freq 1,45 | CTR 2,24% [MELHOR]
  • P7 SP Capital:     R$ 59,89 | 10 leads | CPL R$5,99 | Freq 1,21 | CTR 5,85% [BOM]
  • P8 Joao Pessoa:    R$  0,00 |  0 leads | Novo conjunto — sem dados ainda

Diagnostico:
  P6 SP Pinheiros/Itaim com CPL R$24,15 — muito acima da meta (R$8-10)
  P4 Otoplastia com melhor CPL da conta (R$5,03) — subaproveitado
  P7 SP Capital com CPL R$5,99 e CTR 5,85% — excelente, merecia mais verba
  P8 Joao Pessoa com budget conservador impedindo entrada no leilao


════════════════════════════════════════════════════════
2. OTIMIZACOES EXECUTADAS
════════════════════════════════════════════════════════

DATA: 24/04/2026

── ACAO 1: P6 SP Pinheiros/Itaim — PAUSADO ──────────────────────

  ID: 120248562899320460
  Motivo: CPL R$24,15 nos ultimos 7 dias (meta: R$8-10). 3x acima do aceitavel.
  Budget liberado: R$20/dia redirecionado para P7 SP Capital
  Resultado: ✓ PAUSADO

── ACAO 2: P7 SP Capital Amplo — R$35 para R$55/dia ────────────────

  ID: 120248716539650460
  Motivo: CPL R$5,99 (melhor que P6) + CTR 5,85% + audiencia ampla de SP
  Aumento: +R$20/dia (absorveu orcamento do P6 integralmente)
  Resultado: ✓ APLICADO

── ACAO 3: P4 Otoplastia — R$23 para R$40/dia (+74%) ──────────────

  ID: 120248467593810460
  Motivo: Melhor CPL da conta — R$5,03. Frequencia saudavel 1,45.
  Resultado: ✓ APLICADO

── ACAO 4: P8 Joao Pessoa — R$15 para R$18/dia (+20%) ─────────────

  ID: 120248983938270460
  Motivo: Budget conservador impedia entrada no leilao. Ajuste minimo para competir.
  Proximo passo: monitorar 48h antes de nova decisao
  Resultado: ✓ APLICADO

── ACAO 5: Paciente Modelo — 4 criativos estaticos subidos ─────────

  Criativos criados e publicados via Meta Ads API:
  • C8 [Estatico] [Hook: Paciente Modelo - Escuro Foto] — fundo escuro, foto dos dois doutores juntos
  • C9 [Estatico] [Hook: Paciente Modelo - Foto Full Bleed] — foto como fundo full bleed com overlay gradiente
  • C10 [Estatico] [Hook: Paciente Modelo - Premium Claro] — fundo claro, tags de nome sobrepostos na foto
  • C11 [Estatico] [Hook: Paciente Modelo - Texto Puro] — sem foto, design geometrico premium

  Copy utilizada:
    Texto: "Palpebra caida envelhece o olhar antes do rosto. A blefaroplastia corrige isso com precisao e sem exagero."
    Headline: "Seja Nossa Paciente Modelo em SP"
    Descricao: "Custo diferenciado. Vagas limitadas."

  Distribuicao: 4 criativos x 2 conjuntos (P1 + P2) = 8 novos anuncios ativos

  IDs gerados:
    P2 — C8: 120249040192400460 | C9: 120249040193020460 | C10: 120249040193910460 | C11: 120249040195110460
    P1 — C8: 120249040196020460 | C9: 120249040196880460 | C10: 120249040198330460 | C11: 120249040199080460

  Pendencia: atribuir imagem Stories via Meta Ads Manager (Personalizar por posicionamento)
  Hashes Stories — C8: f8b6245a | C9: 376217db | C10: f57fc65a | C11: 4c7d50f2
  Resultado: ✓ 8 ANUNCIOS ATIVOS


════════════════════════════════════════════════════════
3. ESTADO POS-OTIMIZACAO
════════════════════════════════════════════════════════

Camp 4 — budgets ativos:
  • P1 LLK SP:         R$40/d [ATIVO]
  • P2 Blefaroplastia: R$32/d [ATIVO]
  • P3 Rinoplastia:    R$32/d [ATIVO]
  • P4 Otoplastia:     R$40/d [ATIVO] <- escalado
  • P7 SP Capital:     R$55/d [ATIVO] <- escalado (absorveu P6)
  • P8 Joao Pessoa:    R$18/d [ATIVO] <- escalado
  • P6 Pinheiros:      PAUSADO
  • P5 Lifting:        PAUSADO
  Total Camp 4: R$217/dia

Saldo diario total estimado: R$328/dia
Projecao mensal: ~R$9.840 (dentro do plano R$12.000)


════════════════════════════════════════════════════════
4. ALERTAS E PROXIMAS ACOES
════════════════════════════════════════════════════════

[CRITICO] P3 Rinoplastia — CPL R$9,78 (acima da meta R$8-10)
  Recomendacao: novos criativos com hook especifico de rinoplastia.
  Referencia: SP v2 Rinoplastia C8 tem CTR 9,06% no P7.

[ALERTA] Camp 3 Retargeting Morno — Frequencia 2,39
  Janela: 5-7 dias para rotacao de criativos antes de fadiga severa.

[ALERTA] P1 LLK — Frequencia 2,23
  Inserir novos criativos preventivamente.

Proximas acoes:
  [ ] Novos criativos P1 LLK e Camp 3 Morno
  [ ] Reativar P5 Lifting Facial
  [ ] Monitorar P8 Joao Pessoa (48h)
  [ ] Criar campanha QUENTE WhatsApp Procedimentos
  [ ] Criar campanha QUENTE Paciente Modelo WhatsApp
  [ ] Atribuir Stories nos anuncios C8-C11 via Meta Ads Manager


════════════════════════════════════════════════════════
5. DADOS TECNICOS
════════════════════════════════════════════════════════

Conta Meta Ads: act_445142030338909
Fonte dos dados: Meta Ads API v21.0
Metodologia: dados reais via API (nao estimativas)


---
✍️ @media-buyer (Celo) · Media Buyer
📋 Documentado por @alex · Syra Digital AIOS
🤖 Gerado em: 24/04/2026


📲  MENSAGEM WHATSAPP — PRONTA PARA ENVIAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *Atualizacao de Campanhas — Abril/2026*
_Dr. Humberto Andrade | Syra Digital_

━━━━━━━━━━━━━━━━

Boa tarde! Segue o resumo das otimizacoes executadas hoje nas campanhas.

━━━━━━━━━━━━━━━━

📈 *Ultimos 7 dias*

Gasto: R$2.090 | Leads: 260 | CPL medio: R$7,26

━━━━━━━━━━━━━━━━

✅ *O que fizemos hoje (24/04)*

🔴 *P6 SP Pinheiros/Itaim — PAUSADO*
CPL estava em R$24,15 — 3x acima da meta. Budget de R$20/dia redirecionado para SP Capital.

🟢 *P7 SP Capital Amplo — R$35 para R$55/dia*
CPL R$5,99 com CTR 5,85%. Captacao SP mantida e fortalecida com mais verba.

🟢 *P4 Otoplastia — R$23 para R$40/dia*
Melhor CPL da conta (R$5,03). Escala justificada pelos dados.

🟢 *P8 Joao Pessoa — R$15 para R$18/dia*
Ajuste para entrar no leilao. Monitorar nos proximos 2 dias.

🎨 *Paciente Modelo — 4 novos criativos estaticos no ar*
4 variacoes testadas: foto fundo escuro, foto full bleed, premium claro e texto puro.
8 anuncios ativos (4 criativos x 2 conjuntos P1 + P2).

━━━━━━━━━━━━━━━━

⚠️ *Alertas ativos*

P3 Rinoplastia — CPL R$9,78 (acima da meta)
Camp 3 Morno — frequencia 2,39 (fadiga se aproximando)
P1 LLK — frequencia 2,23 (monitorar)

━━━━━━━━━━━━━━━━

📌 *Proximas acoes*

Novos criativos para P1 LLK e retargeting morno
Reativar P5 Lifting Facial
Campanhas QUENTE WhatsApp

*Syra Digital*
`;

const requests = [{ insertText: { location: { index: 1 }, text: content } }];

docs.documents.batchUpdate({ documentId: DOC_ID, requestBody: { requests } })
  .then(r => console.log('Doc reescrito:', r.status))
  .catch(e => console.error('ERR:', e.message, e.errors));
