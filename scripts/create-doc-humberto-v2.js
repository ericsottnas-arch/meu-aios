#!/usr/bin/env node
process.chdir('/home/synkra/meu-aios');
const { createDoc } = require('/home/synkra/meu-aios/lib/drive.js');

const FOLDER_ID = '1ZT078Tqzr_Y_gSMlZLCh2MDwTIEh-vXr';

const content = `RELATÓRIO DE AUDITORIA + OTIMIZAÇÕES — DR. HUMBERTO ANDRADE
Campanha: Procedimento + Paciente Modelo | Conta: act_445142030338909
Data de execução: 20/04/2026
Executado por: @media-buyer (Celo) — Syra Digital AIOS




════════════════════════════════════════════════════════
1. CONTEXTO E ANÁLISE PRÉ-OTIMIZAÇÃO
════════════════════════════════════════════════════════


Período analisado: últimos 30 dias
Saldo atual da conta: R$75,99 ⚠️ CRÍTICO — menos de 2 dias de veiculação
Spend diário atual: ~R$44/dia
Plano de mídia previsto: R$400/dia


Performance acumulada (últimos 30 dias):
• Total de leads: 428 leads
• CPL médio: R$3,13 ✅ excelente para cirurgia plástica
• Ticket médio (GHL): R$15.569


Campanhas ativas antes da otimização:
• [Syra] Conteúdo Topo [Video Views] [ABO] — sem budget fixo declarado
• [Syra] Paciente Modelo Frio [Formulário Instantâneo] [ABO] — ~R$9/dia
• [Syra] Retargeting Procedimento Morno [Formulário Instantâneo] [CBO] — R$50/dia
• [Syra] Procedimento Frio [Formulário Instantâneo] [ABO] — ~R$177/dia
• Total ativo: ~R$236/dia


Diagnóstico por campanha:


[Syra] Procedimento Frio [ABO] — principal em volume
• Spend: R$686,05 | Leads: 244 | CPL: R$2,81 | CTR: 3,93%
• P1 LLK Todos Procedimentos Amapá: CPL R$2,03 ✅ MELHOR ADSET
• P2 Blefaroplastia Interesses: CPL R$2,51 ✅
• P4 Otoplastia Viajantes: CPL R$2,16 ✅
• P3 Rinoplastia Viajantes: CPL R$3,90
• P6 SP Pinheiros/Itaim (bairros premium): CPL R$12,58 ❌ — problema identificado


[Syra] Paciente Modelo Frio [ABO]
• Spend: R$283,77 | Leads: 104 | CPL: R$2,73 | CTR: 4,80% ✅
• P1 LLK SP: CPL R$2,83 | P2 IG Aberto SP: CPL R$2,57


[Syra] Retargeting Procedimento Morno [CBO]
• Spend: R$269,66 | Leads: 80 | CPL: R$3,37 | Frequência: 3,07 ⚠️
• P1 Engajamento Amplo Amapá: Freq 3,06 — fadiga iniciando
• P2 Engajamento Profundo Amapá: apenas R$3,88 em 30 dias — sem budget real


[Syra] Conteúdo Topo [Video Views] [ABO]
• Spend: R$100,81 | CTR: 0,29% | Freq: 1,31
• Objetivo correto — brand awareness, sem geração de leads


Diagnóstico dos criativos (dados reais Meta Ads API — últimos 30 dias):


C1 [Vídeo] [Hook: Blefaroplastia] — VENCEDOR no retargeting
• CPL no retargeting: R$1,50 ✅
• CPL no frio (LLK): R$1,59 ✅
• Melhor criativo da conta em qualquer contexto


C7 [Estático] [Hook: Qualidade de Vida] — DUPLA FACE
• No frio: CPL ~R$1,79 ✅ bom desempenho
• No retargeting: CPL R$7,42 ❌ caro para público que já conhece o Dr. Humberto


Otoplastia C1 [Vídeo] — BOM
• CPL R$1,76 | Spend R$52,94 | 30 leads ✅


Rinoplastia C8 [Vídeo]
• CPL R$2,23 | 22 leads — performance aceitável


P6 SP — Problema Identificado:
• Segmentação: apenas 10 bairros premium (Alto de Pinheiros, Moema, Itaim Bibi,
  Morumbi, Jardim Paulista, Vila Olímpia, Campo Belo, Pinheiros, Vila Nova Conceição)
• Audiência hiperlocal → CPM inflado → CPL R$12,58 (4x acima da meta)
• A localização SP é estratégica — o problema era a restrição de bairros




════════════════════════════════════════════════════════
2. OTIMIZAÇÕES EXECUTADAS
════════════════════════════════════════════════════════


DATA: 20/04/2026


── AÇÃO 1: C7 Estático pausado no Retargeting ──────────


Ad pausado via Meta Ads API:
• C7 [Estático] [Hook: Qualidade de Vida]
• ID: 120248331674110460 — adset P1 Engajamento Amplo Amapá ✓ PAUSADO
• Motivo: CPL R$7,42 em audiência quente que já conhece o médico
• Criativo vencedor C1 Blefaroplastia (CPL R$1,50) assume o espaço


── AÇÃO 2: P6 SP — budget reduzido ──────────


Adset ajustado via Meta Ads API:
• P6 [Mulheres] [30-65] [FB+IG] [SP: Pinheiros/Itaim/Jardins/Morumbi]
• ID: 120248562899320460
• Budget: R$50/dia → R$20/dia ✓ AJUSTADO
• Status: ATIVO (mantido para preservar aprendizado do adset)
• Motivo: geo hiperlocal com CPL R$12,58 — mantido em teste mínimo


── AÇÃO 3: P7 SP Capital — criado e ativado ──────────


Novo adset criado via Meta Ads API:
• Nome: P7 [Mulheres] [30-65] [FB+IG] [SP Capital Amplo 40km] [Todos Procedimentos]
• ID: 120248716539650460 ✓ ATIVO
• Geo: São Paulo capital completa + raio de 40km (city key 269969)
• Budget: R$30/dia
• Criativos copiados do P6 (4 ads):
  — Rinoplastia — C8 (ID: 120248716552020460) ← melhor CPL do P6: R$2,33
  — Blefaroplastia — Olhar cansado 3 (ID: 120248716553350460)
  — Blefaroplastia — Cirurgia SP (ID: 120248716555200460)
  — Blefaroplastia — Pálpebra caída (ID: 120248716556760460)


Lógica do split P6 × P7:
• P6 R$20/dia → bairros premium (teste: esse perfil de alta renda converte?)
• P7 R$30/dia → SP capital ampla (audiência 50x maior, CPM menor, mais volume)
• Em 7 dias: comparar CPL e pausar o perdedor




════════════════════════════════════════════════════════
3. ESTADO ATUAL PÓS-OTIMIZAÇÃO
════════════════════════════════════════════════════════


[Syra] Procedimento Frio [ABO] — adsets ativos:
• P1 LLK Todos Procedimentos Amapá: R$40/dia | CPL R$2,03
• P2 Blefaroplastia Interesses Amapá: R$32/dia | CPL R$2,51
• P3 Rinoplastia Viajantes Amapá: R$32/dia | CPL R$3,90
• P4 Otoplastia Viajantes Amapá: R$23/dia | CPL R$2,16
• P5 Lifting Facial: PAUSADO (pré-existente)
• P6 SP Pinheiros/Itaim: R$20/dia | CPL R$12,58 (em monitoramento)
• P7 SP Capital Amplo 40km: R$30/dia | NOVO — dados em 7 dias


[Syra] Retargeting Procedimento Morno [CBO] — criativos ativos:
• C1 [Vídeo] [Hook: Blefaroplastia] ✅ mantido — CPL R$1,50
• C2 [Vídeo] [Hook: Depoimento de Paciente] — mantido
• C3 [Vídeo] [Hook: Médica Especialista v1] — mantido
• C4 [Vídeo] [Hook: Médica Especialista v2] — mantido
• C5 [Vídeo] [Hook: Olhar Renovado] — mantido
• C6 [Vídeo] [Hook: Transformação] — mantido
• C7 [Estático] [Hook: Qualidade de Vida] ✓ PAUSADO — CPL R$7,42




════════════════════════════════════════════════════════
4. PROJEÇÕES E PRÓXIMOS PASSOS
════════════════════════════════════════════════════════


Decisões em 7 dias (27/04/2026):
• Comparar CPL P6 (bairros) vs P7 (SP ampla) — pausar o perdedor
• Retargeting Freq 3,07 → criar novos criativos antes de chegar em 4+
• Ativar budget real no P2 Engajamento Profundo (hoje: R$3,88 em 30 dias)


Próximas semanas:
• Subir Google Ads: Branded + Procedimentos Search + Display Remarketing
• Campanha QUENTE WhatsApp para leads mais engajados
• Expandir cobertura nacional conforme conta for recarregada




════════════════════════════════════════════════════════
5. MENSAGEM PARA O GRUPO DO CLIENTE
════════════════════════════════════════════════════════


Mensagem pronta para envio no WhatsApp — copie e cole no grupo do Dr. Humberto.


────────────────────────────────────
*Atualização de Campanhas — Abril/2026*
────────────────────────────────────

*Resultados do mês até agora*

Leads gerados: *428*
Investimento: *R$1.340*
Custo por lead: *R$3,13*

*O que ajustamos hoje*

Identificamos que o público de São Paulo estava limitado a bairros muito específicos (Itaim, Pinheiros, Jardins), o que encarecia o custo e reduzia o alcance.

O que fizemos:
✅ Criamos um público novo com São Paulo capital completa (raio de 40km) — mais volume, CPM mais competitivo
✅ Mantivemos o público premium dos bairros em teste paralelo, com investimento menor
✅ Pausamos um criativo caro no retargeting e redirecionamos o budget para o que converte melhor (R$1,50/lead)

Em 7 dias teremos dados concretos comparando os dois públicos de SP e vamos manter apenas o mais eficiente.

⚠️ *Ponto de atenção importante:* o saldo da conta está próximo do fim. Para garantir que as campanhas não parem, recomendo uma recarga ainda essa semana.

📊 Próximo relatório em 7 dias com o comparativo SP.
────────────────────────────────────




════════════════════════════════════════════════════════
6. DADOS TÉCNICOS
════════════════════════════════════════════════════════


Conta Meta Ads:
• ID: act_445142030338909
• Nome: Humberto Andrade - Goiânia
• Timezone: America/Sao_Paulo
• Saldo: R$75,99 ⚠️


IDs relevantes:
• Campanha Procedimento Frio: 120248326623540460
• Campanha Retargeting: 120248331674040460
• Campanha Paciente Modelo: 120248334756100460
• Adset P6 SP bairros: 120248562899320460
• Adset P7 SP capital (NOVO): 120248716539650460
• Ad C7 Retargeting (pausado): 120248331674110460


GHL — Pipeline PROCEDIMENTO (abril/2026):
• Oportunidades criadas: 276
• Lead recebido (sem contato): 257 (93%) ⚠️
• Lead contatado: 10 | Conectado: 5 | Ganho: 3
• Receita abril: R$46.707,50 | Ticket médio: R$15.569


---
@media-buyer (Celo) — Syra Digital AIOS — 20/04/2026`;

async function main() {
  // Deleta o doc anterior e cria o novo
  const r = await createDoc(
    'Auditoria + Otimizações Meta Ads — Dr. Humberto Andrade (20 abr-2026)',
    content,
    FOLDER_ID
  );
  console.log('Doc criado:', r.id);
  console.log('URL:', r.url);
}
main().catch(e => console.error('ERRO:', e.message));
