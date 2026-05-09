# INLEAD — Knowledge Base Completa
**Fonte:** 3 PDFs oficiais INLEAD (abril/2026)
**Aplicável a:** todos os funis construídos na plataforma

---

## COMPONENTES DISPONÍVEIS (17 + Galeria)

| Componente | Uso | Observação |
|------------|-----|-----------|
| Alerta | Faixa de aviso destacada | Urgência, oferta limitada |
| Argumentos | Até 4 colunas com título e imagem | Value stack, diferenciais |
| Nível | Barra de progresso % | Mostrar progresso no quiz |
| Depoimentos | Lista, grade ou carrossel | Prova social |
| Botão | Navegar entre etapas ou URL externa | CTA principal |
| Captura | Formulário Nome/Email/Tel | Coleta de leads |
| Espaço | Separação visual | Organização |
| Gráficos | Barras ou circular | Dados visuais |
| Cartesiano | Gráfico de linha | Tendências |
| Imagem | Upload / URL / emoji | Fotos, ícones |
| Loading | Indicador de carregamento com redirect | Antes de revelar resultado |
| Opções | Múltipla escolha (simples ou múltipla) | Perguntas do quiz |
| Preço | Exibição de preço com condições | Oferta |
| Texto | Bloco de texto rico (títulos, cores) | Conteúdo livre |
| Timer | Contador regressivo | Urgência |
| Vídeo | Embed via iframe | VSL, depoimento em vídeo |
| Script | Código de tracking (GTM, pixels) | Analytics |
| Galeria | Slide de imagens | Antes/depois, portfólio |

---

## VARIÁVEIS E PERSONALIZAÇÃO

- Resgatar dados de etapas anteriores: `{{id_name_da_variavel}}`
- Exemplos: `{{nome}}`, `{{email}}`, `{{whatsapp}}`
- Usar em qualquer componente de texto para personalizar a experiência
- **Aplicação imediata no PDN:** na Etapa 6 usar `{{nome}}` para "Olá {{nome}}, seu diagnóstico está pronto."

---

## SISTEMA DE SCORE (pontuação)

- Atribuir pontos nas opções de cada pergunta
- Variável: `{{score}}` para somar pontuação acumulada
- Sistemas de exibição condicional baseados no score:
  - Comparativo: X maior/menor/igual a Y (lógica E/OU)
  - Temporal: exibir componente após N segundos
- Uso: mostrar resultado diferente por faixa de score (ex: perfil A vs B vs C)

---

## FLUXO E NAVEGAÇÃO

- Cada opção pode redirecionar para etapa diferente
- **ATENÇÃO:** botão tem PRIORIDADE sobre opções quando estão na mesma etapa
  - Se tem botão de envio + opções na mesma tela, o botão override as opções
  - Configurar botão como "Navegar entre etapas" para evitar conflito
- Aba de FLUXO: "AUTO ORGANIZAR" para visualizar onde cada opção direciona
- Após publicar: aguardar até 10 min para propagação

---

## TRACKING E ANALYTICS

- Campo de scripts: inserir Tag Manager, pixels (Meta, Google)
- IDs customizáveis em cada componente (aparecem no dashboard e planilha exportada)
- Botões têm "onclick" em configurações avançadas para eventos de tracking
- UTMs via parâmetros de URL (a INLEAD não registra internamente, só via UTM)
- Webhook: envia dados de cada etapa em tempo real para ferramentas externas (GHL, Zapier)
- Dashboard: visualiza comportamento por etapa, identifica abandono por pergunta

---

## METRICAS DE REFERENCIA

| Métrica | Meta saudável | Sinal de problema |
|---------|--------------|------------------|
| Taxa de conclusão do quiz | 70%+ | < 50%: revisar ordem/formato das perguntas |
| Taxa de captura | 50%+ | < 30%: revisar copy da tela de captura |
| Taxa de conversão geral | 5-10% | < 2%: revisar oferta ou copy da página de resultado |

---

## ESTRUTURA DE FUNIL RECOMENDADA (INLEAD)

**4 Fases do Funil Inlead:**

| Fase | Objetivo | Componentes típicos |
|------|---------|-------------------|
| 1. Quebra-gelo | Engajar, coletar perfil base | Opções simples, Imagem |
| 2. Admitir o problema | Elevar consciência da dor | Opções de diagnóstico |
| 3. Solução personalizada | Coletar preferências, construir o "plano" | Opções de preferência/restrição |
| 4. Página de vendas | Converter com personalização | Texto, Argumentos, Depoimentos, Timer, CTA |

---

## BOAS PRATICAS FUNIL DE QUIZ

- Número ideal de perguntas: 5 a 7 (nunca mais)
- Começar com perguntas fáceis (quebra-gelo), dificultar progressivamente
- Variação de formatos: múltipla escolha, escala (1-5), campo livre com moderação
- Captura ANTES do resultado (lead deixa dados para ver o diagnóstico)
- Loading antes do resultado = aumenta curiosidade e perceived value
- Resultado deve: (1) resumir respostas, (2) oferecer solução, (3) ter CTA claro

---

## PERSONALIZAÇÃO NA PAGINA DE RESULTADO

Frases que aumentam conversão por conectar ao quiz:

- "Com base nas suas respostas, criamos um plano específico pra você."
- "Seu perfil indica que o ideal é começar com [X]."
- "Como você indicou que tem [Y], focamos na estratégia mais eficiente."
- "Seu plano considera suas preferências e seu tempo disponível."

Usar `{{nome}}` no topo para personalização imediata.

---

## APLICACOES NO PDN VENDAS TERCEIRA ONDA

| Etapa | Componentes sugeridos |
|-------|----------------------|
| Etapa 0 (Landing) | Texto (headline), Imagem (Alexandre Clare), Botão CTA |
| Etapas 1-4 (Quiz) | Opções (uma por etapa), Nível (barra de progresso opcional) |
| Etapa 5 (Captura) | Texto (headline + subhead), Captura (formulário), Botão |
| Etapa 6 (Resultado) | Loading (suspense), Texto, Argumentos (value stack), Depoimentos, Vídeo (se disponível), Timer (urgência vagas), Botão CTA |

**Personalização chave:**
- Etapa 6 headline: "{{nome}}, seu diagnóstico está pronto."
- Etapa 6 subhead: conectar ao pain point da Etapa 3 via copy estática ou score

---

## INTEGRACAO COM GHL

- Webhook INLEAD envia dados de cada etapa em tempo real
- Configurar GHL para receber e taguear por resposta
- Segmentação automática por etapa: quando lead responde E3 com "dor-cac-alto", GHL já aplica tag antes de chegar na captura
- Abandono: INLEAD envia partial data via webhook, GHL pode recuperar com sequência automatizada

---

## TROUBLESHOOTING

| Problema | Solução |
|---------|---------|
| Funil indo para etapa errada | Verificar se botão está overridando opções na mesma tela |
| Alterações não aparecem no link | Salvar + Publicar + aguardar 10 min + limpar cache |
| Domínio não carrega | DNS propaga em 2h-48h; verificar via DNS Checker |
| Dashboard confuso | Personalizar ID/NAME de cada componente |
