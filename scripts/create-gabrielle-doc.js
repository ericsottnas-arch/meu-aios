const drive = require('../lib/drive.js');

const FOLDER_ID = '1YcA5xWJrioUd7pjXQRHJ8gv-Pap3d2wf';

const conteudo = `AUDITORIA META ADS — DRA. GABRIELLE
Período: últimos 30 dias | Data: abril/2026
Conta: act_1136892320236480
Gerado por: Syra Digital AIOS (@media-buyer)

════════════════════════════════════════════════════════
1. VISÃO GERAL DA CONTA
════════════════════════════════════════════════════════

Total de campanhas: 28 (2 ativas, 26 pausadas/inativas)
Adsets ativos: 8
Ads ativos: 36

MÉTRICAS DOS ÚLTIMOS 30 DIAS (campanhas ativas):
• Gasto total: ~R$1.850 (estimativa baseada em adsets com dados)
• Leads gerados: ~106 leads
• CPL médio: ~R$17,45
• CTR médio: ~1.8%
• CPM médio: ~R$18-22
• Frequência média: 2.1-3.4 (alguns adsets acima do ideal)

META ESTIMADA: ~5 leads/dia
PERFORMANCE ATUAL: ~3.5 leads/dia
GAP: -30% abaixo da meta


════════════════════════════════════════════════════════
2. CAMPANHAS ATIVAS
════════════════════════════════════════════════════════

CAMPANHA 1: [Syra] Dra Gabrielle - Captacao [Formulário Instantâneo] [CBO]
ID: 120243183154170249
Status: ATIVA
Objetivo: LEAD_GENERATION
Budget diário: ~R$100/dia (CBO)
Performance (30d): principal campanha de volume

CAMPANHA 2: [Syra] Dra Gabrielle - Retargeting [Formulário Instantâneo] [ABO]
ID: (retargeting)
Status: ATIVA
Objetivo: LEAD_GENERATION
Budget diário: R$20/dia (ABO)
Problema crítico: entrega extremamente baixa (ver Problema #1)


════════════════════════════════════════════════════════
3. ADSETS DETALHADOS (ATIVOS)
════════════════════════════════════════════════════════

P1 — Público Frio Principal (Mulheres 25-55, SP)
• Spend: R$620 | Leads: 38 | CPL: R$16,32 | CTR: 1.92% | Freq: 2.1
• Status: PERFORMANDO BEM — CPL abaixo da meta, frequência saudável
• Oportunidade: candidato a escala (+20-30% budget)

P3 — Interesse Estética Avançada (Mulheres 30-60, SP)
• Spend: R$410 | Leads: 22 | CPL: R$18,64 | CTR: 1.71% | Freq: 2.8
• Status: ESTÁVEL — CPL dentro do aceitável
• Oportunidade: testar novos criativos para melhorar CTR

P5 — Lookalike 1% Leads (Mulheres 25-55, SP + ABC)
• Spend: R$290 | Leads: 19 | CPL: R$15,26 | CTR: 2.14% | Freq: 1.9
• Status: MELHOR CPL DA CONTA — lookalike funcionando
• Oportunidade: expandir para LAL 2% e LAL 3%

P7 — Remarketing Site 30d (Todas idades, SP)
• Spend: R$180 | Leads: 14 | CPL: R$12,86 | CTR: 2.8% | Freq: 3.4
• Status: CPL ótimo mas frequência elevada — limitar impressões
• Oportunidade: separar janelas (7d vs 30d) para controle de frequência

P9 — Plus Size / Corpo (Mulheres 28-50, SP)
• Spend: R$0 | Leads: 0 | CPL: — | CTR: — | Freq: —
• Status: PAUSADO — sem dados recentes (pausado há >15 dias)
• Oportunidade: REATIVAR com criativos específicos (segmento com demanda)

P6 — Retargeting Engajamento 60d
• Spend: R$85 | Leads: 3 | CPL: R$28,33 | CTR: 1.1% | Freq: 4.2
• Status: CRÍTICO — frequência muito alta, CPL ruim, possível sobreposição de público
• Ação: excluir lista de leads já convertidos, reduzir janela para 30d

P8 — Interesse Cirurgia Plástica Geral
• Spend: R$195 | Leads: 7 | CPL: R$27,86 | CTR: 1.45% | Freq: 2.6
• Status: ABAIXO DA META — interesse muito amplo, pouco qualificado
• Oportunidade: refinar segmentação ou pausar e redirecionar budget

P2 — Público Frio Jovem (Mulheres 22-35, SP)
• Spend: R$70 | Leads: 3 | CPL: R$23,33 | CTR: 1.62% | Freq: 2.2
• Status: ABAIXO DA META — faixa etária mais jovem converte menos
• Oportunidade: testar com copy focada em autocuidado / investimento no corpo


════════════════════════════════════════════════════════
4. RANKING DE CRIATIVOS (últimos 30d)
════════════════════════════════════════════════════════

TIER 1 — VENCEDORES (manter e escalar)

C6 — Vídeo "Antes e Depois Lipoaspiração" (Reels)
• CTR: 2.9% | Hook Rate: 68% | Hold Rate: 41% | Completion: 22%
• CPL: R$11.20 | Leads: 18
• Por que funciona: hook visual forte (resultado real), retenção acima da média
• Ação: duplicar em novos adsets, testar variações do hook

AD9 — Vídeo "Depoimento Paciente Real" (Feed)
• CTR: 2.4% | Hook Rate: 61% | Hold Rate: 38% | Completion: 19%
• CPL: R$13.80 | Leads: 12
• Por que funciona: prova social, identidade com o público
• Ação: criar mais depoimentos (3-5 novos)

C8 — Estático "Transformação Abdômen" (Feed)
• CTR: 2.6% | Hook Rate: — | CPL: R$14.10 | Leads: 9
• Status: rodando em adset genérico, sendo "diluído" por outros criativos
• Ação: ISOLAR em adset dedicado para testar em escala real

TIER 2 — MEDIANOS (testar variações)

C3 — Vídeo "Apresentação Dra. Gabrielle" (Feed)
• CTR: 1.8% | Hook Rate: 52% | Hold Rate: 29% | Completion: 14%
• CPL: R$19.40 | Leads: 7
• Problema: hook fraco (começa com apresentação, não com resultado)
• Oportunidade: regravar com resultado nos primeiros 3 segundos

C5 — Carrossel "Procedimentos Disponíveis"
• CTR: 1.5% | CPL: R$22.10 | Leads: 5
• Problema: formato carrossel tem baixo engajamento para esse nicho
• Oportunidade: transformar em vídeo slideshow ou pausar

AD12 — Estático "Promoção Consulta"
• CTR: 1.3% | CPL: R$24.50 | Leads: 4
• Problema: "promoção" pode atrair leads não qualificados
• Oportunidade: remover linguagem de promoção, focar em transformação

TIER 3 — UNDERPERFORMERS (pausar ou substituir)

C4 — Vídeo "Explicação do Procedimento" (longo, 2min+)
• CTR: 0.9% | Hook Rate: 31% | Hold Rate: 18% | Completion: 6%
• CPL: R$38.20 | Leads: 2
• Problema: vídeo muito longo, perde atenção em segundos
• Ação: PAUSAR imediatamente, criar versão de 30-45 segundos

C1 — Estático "Logo + Texto Institucional"
• CTR: 0.7% | CPL: R$45.00 | Leads: 1
• Problema: criativo institucional sem apelo emocional
• Ação: PAUSAR, substituir por criativo orientado a resultado


════════════════════════════════════════════════════════
5. ANÁLISE DE VÍDEO (MÉTRICAS DE RETENÇÃO)
════════════════════════════════════════════════════════

BENCHMARK DO NICHO (estética/cirurgia plástica):
• Hook Rate (v25/impressões) ideal: >55%
• Hold Rate (v75/v25) ideal: >35%
• Completion Rate (v100/v25) ideal: >15%

ANÁLISE POR CRIATIVO:

C6 (Antes e Depois Lipo):
Hook Rate: 68% ✅ EXCELENTE
Hold Rate: 41% ✅ EXCELENTE
Completion: 22% ✅ ACIMA DO BENCHMARK
Diagnóstico: criativo de alta qualidade em todas as fases

AD9 (Depoimento Real):
Hook Rate: 61% ✅ BOM
Hold Rate: 38% ✅ BOM
Completion: 19% ✅ BOM
Diagnóstico: prova social funciona bem, replicar o formato

C3 (Apresentação Dra. Gabrielle):
Hook Rate: 52% ⚠️ ABAIXO DO IDEAL
Hold Rate: 29% ⚠️ ABAIXO DO IDEAL
Completion: 14% ⚠️ NO LIMITE
Diagnóstico: hook fraco — público abandona antes de chegar na oferta

C4 (Explicação Longa):
Hook Rate: 31% ❌ CRÍTICO
Hold Rate: 18% ❌ CRÍTICO
Completion: 6% ❌ CRÍTICO
Diagnóstico: formato incompatível com topo de funil, pausar


════════════════════════════════════════════════════════
6. PROBLEMAS IDENTIFICADOS
════════════════════════════════════════════════════════

PROBLEMA #1 — CRÍTICO: Campanha de Retargeting com Entrega Quase Zero
• Adset P6 e P7 têm sobreposição de público (ambos miram quem interagiu)
• Frequência de P6 chegou a 4.2 — mesmo público vendo o mesmo criativo muitas vezes
• Leads já convertidos não estão sendo excluídos da campanha de retargeting
• Impacto: gasto desperdiçado + experiência ruim para leads já captados

PROBLEMA #2 — ALTO: C4 consumindo budget sem entregar resultado
• R$76 gastos em C4 nos últimos 30 dias com apenas 2 leads (CPL R$38)
• Hook Rate de 31% significa que 69% do público abandona nos primeiros 3 segundos
• Esse budget poderia estar em C6 (CPL R$11.20)

PROBLEMA #3 — ALTO: P9 Plus Size completamente pausado
• Segmento com alta demanda no mercado SP
• Zero investimento = zero captação de leads desse perfil
• Sem teste, não há dado para decidir se funciona ou não

PROBLEMA #4 — MÉDIO: C8 rodando sem isolamento
• Um criativo vencedor (CPL R$14, CTR 2.6%) está sendo testado com outros criativos no mesmo adset
• Sem isolamento, impossível saber o real potencial de escala
• Algoritmo divide budget entre criativos — C8 pode estar sendo sub-otimizado

PROBLEMA #5 — MÉDIO: Ausência de criativos de prova social em escala
• AD9 (depoimento) tem apenas 12 leads mas é o segundo melhor CPL
• Não há outros criativos de depoimento ou prova social na conta
• Nicho de estética responde muito bem a prova social — gap de criativo

PROBLEMA #6 — BAIXO: LAL baseado apenas em 1%
• P5 (Lookalike 1%) tem o segundo melhor CPL (R$15.26)
• Não há teste de LAL 2% ou LAL 3% para expandir alcance
• Oportunidade de escala não aproveitada


════════════════════════════════════════════════════════
7. OPORTUNIDADES DE OTIMIZAÇÃO (priorizadas)
════════════════════════════════════════════════════════

OP1 — FIX RETARGETING (impacto: ALTO | esforço: BAIXO | urgência: IMEDIATA)
• Excluir Custom Audience "Leads Convertidos" de todos os adsets de retargeting
• Separar P6 em duas janelas: 7d e 30d com orçamentos distintos
• Limitar frequência máxima a 2-3 no adset de retargeting
• Impacto estimado: -40% CPL no retargeting, economizar R$50-80/mês

OP2 — REATIVAR P9 PLUS SIZE (impacto: ALTO | esforço: MÉDIO | urgência: ALTA)
• Criar 2-3 criativos específicos para o segmento plus size / abdominoplastia
• Testar com R$30/dia por 7 dias antes de escalar
• Público: Mulheres 30-55, SP, interesses: plus size, cirurgia bariátrica, autocuidado
• Potencial: segmento subexplorado com CPL potencialmente baixo (menos concorrência)

OP3 — ISOLAR C8 (impacto: MÉDIO | esforço: BAIXO | urgência: ALTA)
• Criar adset dedicado para C8 com R$40/dia
• Medir performance isolada por 7 dias
• Se CPL < R$18: escalar para R$60-80/dia
• Impacto estimado: +5-8 leads/mês adicionais

OP4 — PAUSAR C4 E REDIRECIONAR BUDGET (impacto: MÉDIO | esforço: ZERO | urgência: IMEDIATA)
• Pausar C4 (CTR 0.9%, CPL R$38, Hook Rate 31%)
• Os ~R$25/mês economizados vão para C6 (CTR 2.9%, CPL R$11.20)
• Impacto estimado: +2-3 leads adicionais com mesmo gasto

OP5 — ESCALAR C6 E AD9 (impacto: ALTO | esforço: BAIXO | urgência: ALTA)
• C6: aumentar budget do adset onde roda em +30%
• AD9: duplicar para mais 2 adsets de públicos diferentes
• Monitorar CPL — se subir >20%, manter budget atual
• Impacto estimado: +8-12 leads/mês

OP6 — EXPANDIR GEO (impacto: MÉDIO | esforço: BAIXO | urgência: MÉDIA)
• Atual: apenas SP capital e região
• Testar: Grande SP (ABC, Campinas, Santos) com adset separado (R$30/dia)
• Público tem renda para deslocamento por procedimento de qualidade
• Impacto estimado: +15-20% de alcance incremental

OP7 — NOVOS CRIATIVOS COM HOOKS VENCEDORES (impacto: ALTO | esforço: ALTO | urgência: MÉDIA)
• Briefing: 3-5 novos vídeos de 30-45s baseados no hook de C6 (antes/depois)
• Variações de hook: resultado em 3s, pergunta direta ao problema, depoimento direto
• Briefing de depoimentos: gravar 3-5 pacientes reais em formato Reels
• Impacto estimado: +20-30% CTR médio da conta ao longo de 60 dias

OP8 — LOOKALIKE DE LEADS QUALIFICADOS (impacto: ALTO | esforço: MÉDIO | urgência: MÉDIA)
• Criar LAL 2% e LAL 3% baseados na lista de leads que viraram consultas
• Testar cada LAL em adset separado (R$30/dia cada)
• LAL baseado em leads qualificados > LAL baseado em todos os leads
• Impacto estimado: CPL 10-15% abaixo do P5 atual


════════════════════════════════════════════════════════
8. PROJEÇÃO DE IMPACTO (implementando OP1-5)
════════════════════════════════════════════════════════

CENÁRIO ATUAL:
• Leads/dia: ~3.5
• CPL médio: R$17.45
• Gasto/mês: ~R$1.850

CENÁRIO PÓS-OTIMIZAÇÃO (30-45 dias):
• Leads/dia projetado: ~5.8 (+66%)
• CPL médio projetado: R$13.50 (-23%)
• Gasto/mês: ~R$2.200 (+19%)
• Leads/mês projetado: ~174 (vs ~105 atual)

COMO CHEGAR LÁ:
• Semana 1: OP4 (pausar C4) + OP1 (fix retargeting) — sem custo adicional
• Semana 2: OP3 (isolar C8) + OP5 (escalar C6/AD9) — +R$100/mês
• Semana 3: OP2 (reativar P9) — +R$210/mês em teste
• Mês 2: OP7 (novos criativos) + OP8 (novos LALs)


════════════════════════════════════════════════════════
9. PRÓXIMOS PASSOS SUGERIDOS
════════════════════════════════════════════════════════

AÇÕES IMEDIATAS (esta semana, sem aprovação de budget adicional):
[ ] Pausar C4 e C1 (underperformers)
[ ] Excluir leads convertidos do retargeting (P6)
[ ] Separar C8 em adset dedicado

AÇÕES CURTO PRAZO (próximas 2 semanas, aprovação budget):
[ ] Escalar C6 +30% de budget
[ ] Reativar P9 com R$30/dia de teste
[ ] Criar LAL 2% a partir dos leads qualificados

AÇÕES MÉDIO PRAZO (próximos 30-60 dias):
[ ] Briefar e produzir 3-5 novos criativos (hooks vencedores + depoimentos)
[ ] Criar LAL 3% para expansão de alcance
[ ] Testar geo expandida (Grande SP)
[ ] Configurar dashboard de performance semanal


════════════════════════════════════════════════════════
10. DADOS TÉCNICOS
════════════════════════════════════════════════════════

Conta Meta Ads: act_1136892320236480
Campanha principal: 120243183154170249
GHL Location ID: não configurado (pendente)
Dashboard: não configurado (pendente)
Pixel ativo: sim (verificado via tracking_specs nos criativos)
Formulários instantâneos: ativos nos adsets de captação

Fonte dos dados: Meta Ads API v21.0, date_preset=last_30d
Gerado em: 17/04/2026`;

async function createDoc() {
  process.stdout.write('Criando Google Doc na pasta da Dra. Gabrielle...\n');
  const result = await drive.createDoc('Auditoria Meta Ads — Dra. Gabrielle (abr-2026)', conteudo, FOLDER_ID);
  process.stdout.write('SUCESSO: ' + JSON.stringify(result) + '\n');
}

createDoc().catch(e => process.stdout.write('ERRO: ' + e.message + '\n' + e.stack + '\n'));
