const drive = require('../lib/drive.js');

const FOLDER_ID = '1YcA5xWJrioUd7pjXQRHJ8gv-Pap3d2wf';

const conteudo = `REGISTRO DE ATIVIDADES — DRA. GABRIELLE
Data: 22/04/2026 | Conta: act_1136892320236480
Responsável: Syra Digital AIOS (@media-buyer + @analyst)

════════════════════════════════════════════════════════
1. CONTEXTO — O QUE FOI OTIMIZADO NA SEGUNDA (20/04)
════════════════════════════════════════════════════════

Na sessão de 20/04/2026 foram executadas as seguintes ações:

• Pausados criativos underperformers: C4 (4 adsets), C5 (3 adsets), C7 (2 adsets) = 9 ads pausados
• Budget rebalanceado: R$35 → R$30 campanha principal | R$15 → R$20 retargeting
• Criativos mantidos ativos: C6, C8 Body2 (vencedor), AD9 Resultados Reais
• Exclusão de leads convertidos do retargeting: PENDENTE (aguardando aceite de TOS no Meta)

Objetivo da otimização: reduzir CPL concentrando budget nos criativos vencedores.


════════════════════════════════════════════════════════
2. AUDITORIA 22/04 — RESULTADO DAS OTIMIZAÇÕES
════════════════════════════════════════════════════════

CAMPANHAS ATIVAS:

[1] [Syra] Dra Gabrielle - Emagrecimento [Formulário Instantâneo] [CBO]
• Budget: R$30/dia | Spend 30d: R$834,58
• Leads: 100 | CPL: R$8,35 | CTR: 2,29% | Freq: 2,73

[2] [Syra] Emagrecimento Retargeting Morno [Formulário Instantâneo] [CBO]
• Budget: R$20/dia | Spend 30d: R$82,91
• Leads: 8 | CPL: R$10,36 | CTR: 1,64% | Freq: 2,23

RESULTADO CONSOLIDADO ABRIL:
• Total leads: ~108 | CPL médio: R$8,52 | Ritmo: ~4,8 leads/dia
• Meta: 5 leads/dia → 96% da meta atingida ✅


════════════════════════════════════════════════════════
3. ANÁLISE DE ADSETS ATIVOS
════════════════════════════════════════════════════════

P5 [M][30-55][Caieiras, Franco, Perus, Jundiaí, Cajamar][FB+IG]
• Spend: R$630,18 | Leads: 74 | CPL: R$8,52 | CTR: 2,44% | Freq: 2,39 | CPM: R$21,69
• Status: principal adset da conta, 75% do spend total
• Problema: C7 domina o budget com CPL pior que C8 (ver seção 4)

P10 [M][30-55][Caieiras, Franco, Perus][FB+IG] [LLK 1% Engaja/DM/Save]
• Spend: R$37,58 | Leads: 5 | CPL: R$7,52 | CTR: 2,50% | Freq: 1,15 | CPM: R$25,41
• Status: melhor CPL entre adsets com dados — lookalike funcionando bem
• Frequência saudável (1,15) — público ainda com espaço para crescer

P11 [M][30-55][Caieiras, Franco, Perus][FB+IG] [LLK 1% MQL]
• Sem dados — criado em 22/04/2026 (novo)

P12 [M][30-55][Caieiras, Franco, Perus][FB+IG] [LLK 1% Lead Conectado]
• Sem dados — criado em 22/04/2026 (novo)


════════════════════════════════════════════════════════
4. ANÁLISE DE CRIATIVOS — ADSET P5 (principal)
════════════════════════════════════════════════════════

RANKING POR CPL:

1º C8 [Body2] "Eu Descobri um Procedimento"
   Spend: R$120,70 | Leads: 17 | CPL: R$7,10 | CTR: 3,47%
   Hook Rate: 18,2% | Hold Rate: 46,0% | Completion: 38,3%
   Status: VENCEDOR — melhor CPL + melhor CTR da conta

2º C4 [Vídeo] "Você Faz Academia, Cuida da Alimentação"
   Spend: R$69,74 | Leads: 11 | CPL: R$6,34 | CTR: 2,60%
   Hook Rate: 6,1% | Hold Rate: 43,4% | Completion: 26,9%
   Status: BOM — CPL competitivo apesar de hook fraco. Manter.

3º C7 [Vídeo] "Eu Descobri um Procedimento [Variação: barriga]"
   Spend: R$364,58 | Leads: 39 | CPL: R$9,35 | CTR: 2,25%
   Hook Rate: 12,7% | Hold Rate: 44,1% | Completion: 33,7%
   Status: CRÍTICO — consome 43% do budget de P5 com o pior CPL
   Ação: pausar em P5 (já havia sido pausado em 2 outros adsets em 20/04)

4º AD9 [Vídeo] "Resultados Reais" (cópia)
   Spend: R$34,85 | Leads: 4 | CPL: R$8,71 | CTR: 1,89%
   Hook Rate: 10,4% | Hold Rate: 46,3% | Completion: 28,8%
   Status: MEDIANO — hold rate bom mas hook fraco

5º AD9 [Vídeo] "Resultados Reais" (original)
   Spend: R$26,93 | Leads: 2 | CPL: R$13,46 | CTR: 2,50%
   Status: ABAIXO — CPL elevado, pausar ou testar novo hook

ADSET P10 — Criativos com dados:
• C8 Body2: Spend R$23,68 | Leads 4 | CPL R$5,92 ✅ EXCELENTE
• C6 "Você vai ter um evento": Spend R$1,96 | Leads 1 | CPL R$1,96 (pouco spend)
• C7 Barriga: Spend R$6,39 | Leads 0 | CPL — (fraco)


════════════════════════════════════════════════════════
5. AÇÕES EXECUTADAS EM 22/04/2026
════════════════════════════════════════════════════════

[5.1] INTEGRAÇÃO GHL — CONFIGURAÇÃO INICIAL
• GHL Location ID da Dra. Gabrielle configurado: 3iNi7kJci5f0BNUoq4kX
• Token GHL configurado e salvo no sistema: GHL_GABRIELLE_TOKEN
• Pipeline mapeado: Comercial (IqBgqQLwrueiZlsV4yzI)
• Stages mapeados:
  - Entrada do lead
  - Contato feito
  - Lead conectado
  - Oportunidade
  - Consulta agendada
  - Ganho

[5.2] EXPORTAÇÃO PÚBLICO MQL — LISTA 1
Critério: contatos com tag "mql" + tag "consulta paga" + stage "Ganho" + stage "Consulta Agendada"
• Total exportado: 60 contatos únicos
• Formato: CSV Meta Custom Audience (email, phone, fn, ln)
• Todos os 60 com telefone | 0 com email (formulário instantâneo não coleta email)
• Arquivo: data/mql-gabrielle-meta.csv
• Drive: https://drive.google.com/file/d/1Z76pUBzOJQvvFWQ0NARrRfAPQ9UdVJNj/view
• Nome do público Meta: LEADS MQL 22/04

[5.3] EXPORTAÇÃO PÚBLICO FUNIL — LISTA 2
Critério: contatos nos stages "Lead Conectado" + "Oportunidade" (sem tag mql)
• Total exportado: 107 contatos únicos
• Formato: CSV Meta Custom Audience
• Arquivo: data/leads-funil-gabrielle-meta.csv
• Drive: https://drive.google.com/file/d/1H_NHx91VrmFNYgowHRZ5YdAeFKGk-tV6/view
• Observação: alguns nomes vieram como ID numérico do Facebook (lead form) — não afeta matching

[5.4] PÚBLICOS CRIADOS NO META
Ambos os públicos foram subidos manualmente por Victor no Meta Ads Manager:
• P11: [M][30-55][Caieiras, Franco, Perus] [LLK 1% MQL] — baseado na Lista 1
• P12: [M][30-55][Caieiras, Franco, Perus] [LLK 1% Lead Conectado] — baseado na Lista 2
• Ambos criados dentro da campanha CBO principal
• Status atual: sem dados (recém-criados, aguardando aprendizado do algoritmo)


════════════════════════════════════════════════════════
6. PROBLEMAS IDENTIFICADOS
════════════════════════════════════════════════════════

PROBLEMA #1 — CRÍTICO: C7 concentrando budget com CPL ruim no P5
• R$364,58 gastos (43% do budget de P5) com CPL R$9,35
• C8 Body2 tem CPL R$7,10 com apenas R$120 de spend
• O CBO está favorecendo volume de C7 em detrimento de qualidade
• Ação: pausar C7 no adset P5 → budget migra para C8 e C4
• Impacto estimado: CPL cai de R$8,35 para ~R$7,20 (-14%)

PROBLEMA #2 — ALTO: TOS Meta Custom Audience pendente
• Ainda não aceito: https://business.facebook.com/ads/manage/customaudiences/tos/?act=1136892320236480
• Impede: exclusão automática de leads convertidos do retargeting
• Impede: criação programática de públicos personalizados
• Ação: Victor aceitar manualmente no Meta Business

PROBLEMA #3 — MÉDIO: P11 e P12 sem alocação de budget garantida
• Em CBO, algoritmo pode ignorar adsets novos sem histórico por vários dias
• Se em 48h P11/P12 não receberem spend: converter campanha para ABO com R$15/dia cada

PROBLEMA #4 — MÉDIO: Retargeting subaproveitado
• Apenas R$20/dia para retargeting com pool de 108+ leads
• CPL do retargeting (R$10,36) maior que campanha fria (R$8,35) — incomum
• Investigar: criativos do retargeting, sobreposição de público, frequência


════════════════════════════════════════════════════════
7. ORÇAMENTO ABRIL 2026
════════════════════════════════════════════════════════

• Orçamento mensal: R$1.500
• Spend acumulado até 22/04: ~R$930
• Saldo restante: ~R$570
• Dias restantes: 8 dias
• Projeção de gasto (R$50/dia × 8): R$400
• Saldo final estimado: R$170 (dentro do orçamento ✅)


════════════════════════════════════════════════════════
8. PRÓXIMOS PASSOS
════════════════════════════════════════════════════════

IMEDIATO:
[ ] Pausar C7 no adset P5 (ação de maior impacto disponível hoje)
[ ] Victor aceitar TOS Custom Audience no Meta Business

48H:
[ ] Monitorar distribuição de budget para P11 e P12
[ ] Se sem spend: converter para ABO R$15/dia cada

SEMANA:
[ ] Aumentar retargeting para R$30/dia (saldo permite)
[ ] Avaliar pausar AD9 original (CPL R$13,46)
[ ] Briefar variação de hook para C8 Body2 (testar múltiplas versões do vencedor)

MÊS 2:
[ ] Criar LAL 2% e LAL 3% à medida que base de MQL cresce
[ ] Configurar webhook GHL para captura automática de UTMs dos leads
[ ] Dashboard de performance semanal integrado


════════════════════════════════════════════════════════
9. DADOS TÉCNICOS
════════════════════════════════════════════════════════

Conta Meta Ads: act_1136892320236480
Campanha principal ID: [Syra] Dra Gabrielle - Emagrecimento [CBO]
GHL Location ID: 3iNi7kJci5f0BNUoq4kX
Pipeline GHL: Comercial (IqBgqQLwrueiZlsV4yzI)
Pixel: ativo
Formulários instantâneos: ativos

Fonte dos dados: Meta Ads API v21.0, date_preset=last_30d + GHL API v2021-07-28
Gerado em: 22/04/2026`;

async function main() {
  process.stdout.write('Criando Google Doc na pasta da Dra. Gabrielle...\n');
  const result = await drive.createDoc('Registro de Atividades — Dra. Gabrielle (22/04/2026)', conteudo, FOLDER_ID);
  process.stdout.write('SUCESSO: ' + JSON.stringify(result) + '\n');
}

main().catch(e => process.stdout.write('ERRO: ' + e.message + '\n' + e.stack + '\n'));
