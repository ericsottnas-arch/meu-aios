# Copywriters: Acesso a Dados de Clientes

Os copywriters têm acesso completo a documentações de clientes para fazer **copy contextualizado, personalizado e baseado em dados reais**.

## 📁 Estrutura de Dados de Clientes

Todos os dados de clientes estão em: `/docs/clientes/`

### Arquivos Disponíveis

```
/docs/clientes/
├── dra-vanessasoares-bh.md          # Dra. Vanessa Soares (Dentista - BH)
├── estetica-gabrielleoliveira.md    # Gabrielle Oliveira (Estética)
├── humbertoandradebr.md             # Humberto Andrade
├── _fourcred.md                     # Fourcred (Consulting)
├── analise-comparativa.md           # Análise comparativa de clientes
└── [novos clientes vão aqui]
```

---

## 📋 Como Acessar Dados de Cliente

### Para Copy-Chef
```
*client-data {cliente}
→ Mostra resumo executivo do cliente para roteamento
```

### Para Qualquer Especialista
```
*client-brief {cliente}
→ Resumo de dados de cliente para contexto de copy
```

### Para Pesquisa Aprofundada
```
*client-full {cliente}
→ Documentação completa do cliente
```

---

## 🎯 Estrutura Padrão de Documentação de Cliente

Cada cliente deve ter documentação com estas seções:

### 1. **Identificação**
```
- Nome: [Nome do cliente]
- Segmento: [Área de atuação]
- Tipo de Oferta: [Serviço/Produto]
- Ticket Médio: [$XXX]
- ICP: [Descrição do cliente ideal]
```

### 2. **Posicionamento**
```
- Diferencial Competitivo: [O que torna único]
- Pain Points do Cliente: [O que dói]
- Gain Points: [O que ganha]
- Brand Voice: [Tom, estilo, valores]
```

### 3. **Público-Alvo**
```
- Avatar Principal: [Descrição detalhada]
- Demographics: [Idade, gênero, localização]
- Psychographics: [Valores, comportamentos]
- Canais Preferidos: [Email, Instagram, WhatsApp, etc]
```

### 4. **Histórico de Copy Vencedor**
```
- Headlines que funcionaram: [Exemplos]
- CTAs mais clicadas: [Exemplos]
- Formatos preferidos: [Email, landing page, etc]
- Response Rates históricos: [Dados]
```

### 5. **Campanhas Anteriores**
```
- Campanha 1: [Nome] - [Resultados]
- Campanha 2: [Nome] - [Resultados]
- O que funcionou: [Insights]
- O que não funcionou: [Insights]
```

### 6. **Persona Emocional**
```
- Medo Principal: [O que mais teme]
- Desejo Principal: [O que mais quer]
- Objeção Comum: [O que sempre questiona]
- Gatilho Mental Mais Forte: [Scarcity/Urgency/Social Proof/etc]
```

---

## 📊 Dados de Cliente Disponíveis Para Copy-Chef

Copy-Chef tem acesso a:
- ✅ Segmento do cliente
- ✅ Tipo de oferta (ticket, público-alvo)
- ✅ ICP e avatar
- ✅ Brand voice esperada
- ✅ Headlines vencedoras históricas
- ✅ Response rates anteriores
- ✅ Pain points e gain points
- ✅ Canais preferidos
- ✅ Persona emocional

---

## 🚀 Fluxo de Copy Com Dados de Cliente

### Antes (Sem dados)
```
Você: "Preciso de email para Dra. Vanessa"
Copy-Chef: Pergunta tudo sobre cliente
Halbert: Escreve copy genérico
Resultado: Menos contextualizado
```

### Depois (Com dados)
```
Você: "Preciso de email para Dra. Vanessa"
Copy-Chef:
  ✓ Puxa docs/clientes/dra-vanessasoares-bh.md
  ✓ Vê: Pain points, ICP, brand voice, headlines vencedoras
  ✓ Roteia para especialista ideal com contexto completo
Halbert: Escreve copy PERSONALIZADO baseado em dados reais
Resultado: Copy muito mais efetiva, baseada em padrões que já funcionaram
```

---

## 📝 Exemplo: Dra. Vanessa Soares

**Dados do Cliente:**
```
Nome: Dra. Vanessa Soares
Segmento: Odontologia (Dentista)
Localização: Belo Horizonte, BH
Ticket Médio: R$500-2000 (procedimentos)
ICP: Mulheres 25-45, renda média-alta, estéticas odontológicas

Brand Voice: Profissional, acolhedora, educacional
Pain Points: "Medo de dentista", "Resultado estético duvidoso", "Dor pós-procedimento"
Gain Points: "Sorriso perfeito", "Autoconfiança", "Sem dor"

Headlines Vencedoras:
- "O sorriso que você sempre quis em 2 semanas"
- "Implante indolor? Sim, é possível aqui"

Response Rate histórica: 4.2% em email, 8.3% em landing page

Persona Emocional:
- Medo: Dor, resultado ruim
- Desejo: Sorriso bonito, confiança
- Gatilho: Social proof (antes/depois), garantia
```

**Como Copy-Chef usa isso:**
```
Você: "Preciso de landing page para procedimento novo da Dra. Vanessa"

Copy-Chef:
✓ Lê: dra-vanessasoares-bh.md
✓ Identifica: Público feminino, pain=medo, gain=confiança
✓ Vê histórico: Headlines sobre "sem medo/indolor" funcionam bem
✓ Roteia para: @wiebe (landing page) OU @morgan (female focus)
✓ Briefing para especialista:
   - Público: Mulheres 25-45 BH
   - Pain: Medo de dentista, resultado duvidoso
   - Gain: Sorriso confiante, sem dor
   - Framework: BAB (Before/After/Bridge)
   - Usar: Headlines sobre "indolor", social proof, antes/depois
   - Brand voice: Profissional + acolhedora

@wiebe cria landing page com:
- Headline: "Sorriso natural sem dor em 2 semanas"
- Pain section: Aborda medo comum
- Gain section: Mostra confiança/transformação
- Social proof: Antes/depois de pacientes
- CTA: "Agendar consulta sem compromisso"
```

---

## 🔍 Comandos de Acesso a Dados

### Copy-Chef
```bash
*client-list          # Lista todos os clientes
*client-data {nome}   # Resumo executivo de cliente
*client-industry      # Agrupar por segmento
```

### Halbert (Direct Response)
```bash
*client-headlines {nome}      # Headlines vencedoras deste cliente
*client-history {nome}        # Histórico de copy que funcionou
*client-pain-points {nome}    # Pain points para AIDA
```

### Ogilvy (Brand)
```bash
*client-voice {nome}          # Brand voice guidelines
*client-positioning {nome}    # Posicionamento atual
*client-competitors {nome}    # Análise comparativa
```

### Wiebe (Conversion)
```bash
*client-ctr {nome}            # CTR histórica
*client-cta-history {nome}    # CTAs que funcionaram
*client-form-data {nome}      # Dados de formulário históricos
```

### Georgi (High-Ticket)
```bash
*client-ticket {nome}         # Ticket médio e range
*client-objections {nome}     # Objeções comuns
*client-revenue {nome}        # Histórico de receita por campanhaS
```

### Orzechowski (Email)
```bash
*client-email-history {nome}  # Histórico de email campaigns
*client-open-rates {nome}     # Open rates e subject lines
*client-segments {nome}       # Segmentação de lista
```

### Morgan (Female-Focused)
```bash
*client-female-avatar {nome}  # Avatar específico do cliente
*client-community {nome}      # Dinâmica de comunidade
*client-values {nome}         # Valores e aspirações
```

---

## 📊 Matriz: Cliente x Especialista

Use para decisões de roteamento:

| Cliente | Segmento | Tipo | Ticket | Público | → Especialista |
|---------|----------|------|--------|---------|---|
| Dra. Vanessa | Odonto | Serviço | $500-2K | Mulheres 25-45 | @morgan (female) ou @wiebe (landing) |
| Gabrielle | Estética | Serviço | $200-1K | Mulheres 18-50 | @morgan (community) |
| Humberto | B2B | Consultoria | $5K+ | Executivos | @georgi (high-ticket) |
| Fourcred | Consulting | Serviço | $10K+ | Empresas | @georgi (high-ticket) |

---

## 🎯 Estratégia: Usar Dados Para Melhor Roteamento

### Passo 1: Copy-Chef Lê Dados
```
Copy-Chef recebe demanda
↓
Consulta /docs/clientes/{cliente}.md
↓
Extrai: segmento, público, pain/gain, histórico
```

### Passo 2: Copy-Chef Analisa
```
Analisa:
✓ Qual especialista serviu melhor este cliente no passado?
✓ Qual foi o tipo de copy mais efetivo?
✓ Qual framework funcionou?
✓ Qual foi a resposta média?
```

### Passo 3: Copy-Chef Roteia Com Contexto
```
Roteia com briefing rico:
- Cliente específico com histórico
- Headlines/CTAs que já funcionaram
- Pain/Gain points documentados
- Brand voice esperada
- Tipo de copy mais efetivo historicamente
```

### Passo 4: Especialista Entrega Copy Otimizada
```
Especialista recebe:
✓ Contexto completo do cliente
✓ Padrões que já funcionaram
✓ Dados reais para argumentação
✓ Framework baseado em sucesso anterior

Resultado: Copy muito mais efetiva
```

---

## 📈 Exemplos Práticos

### Exemplo 1: Dra. Vanessa - Email de Promoção
```
Você: "Preciso de email para promoção de implante da Dra. Vanessa"

Copy-Chef:
- Lê: dra-vanessasoares-bh.md
- Vê: Pain="medo de dor", Headlines vencedoras="indolor"
- Roteia para: @orzechowski (email) com dados

@orzechowski cria:
Subject: "Implante indolor? Confira esse case de sucesso"
Body:
  - Hook: Aborda medo (pain)
  - Story: Paciente real que tinha medo
  - Social proof: Antes/depois + depoimento
  - CTA: "Agende sua consulta sem dor"
```

### Exemplo 2: Gabrielle Oliveira - Landing Page
```
Você: "Landing page para novo serviço de Gabrielle"

Copy-Chef:
- Lê: estetica-gabrielleoliveira.md
- Vê: Público=mulheres jovens, pain=insegurança
- Roteia para: @morgan (female-focused) + @wiebe (conversion)

@morgan + @wiebe criam:
- Headline: "A confiança que todas as mulheres merecem"
- Community angle: "Junte-se a +500 mulheres que transformaram..."
- Social proof: Depoimentos de mulheres
- Transformation: Antes/depois + história
- CTA: "Começar minha transformação"
```

### Exemplo 3: Humberto Andrade - Sales Page Premium
```
Você: "Sales page premium para consultoria do Humberto"

Copy-Chef:
- Lê: humbertoandradebr.md
- Vê: Ticket=$5K+, público=executivos, pain=complexidade
- Roteia para: @georgi (high-ticket)

@georgi cria:
- Hook: Aborda frustração específica
- Disqualification: "Não é para quem não está pronto"
- Transformation: Resultado específico documentado
- Social proof: Case studies de executivos
- Objection handling: "Mas quanto custa? Vale a pena?"
- CTA: "Reserve call de estratégia" (qualificação)
```

---

## 🔐 Segurança e Acesso

### O Que Copywriters PODEM Ver:
- ✅ Brand voice
- ✅ Pain/gain points
- ✅ ICP e avatar
- ✅ Headlines vencedoras
- ✅ Histórico de copy que funcionou
- ✅ Response rates
- ✅ Segmento e tipo de oferta
- ✅ Público-alvo
- ✅ Canais preferidos

### O Que NÃO PODEM Ver:
- ❌ Informações financeiras sensíveis
- ❌ Dados pessoais de clientes reais
- ❌ Nomes de pacientes/clientes finais
- ❌ Números de contato privados
- ❌ Dados de pagamento

---

## 📝 Template Para Novos Clientes

Ao criar documentação de novo cliente, use:

```markdown
# [Nome do Cliente]

## Identificação
- **Segmento:** [Área]
- **Localização:** [Onde opera]
- **Ticket Médio:** [$XXX]
- **ICP:** [Descrição]

## Posicionamento
- **Diferencial:** [O que torna único]
- **Brand Voice:** [Tom, estilo]

## Público-Alvo
- **Avatar:** [Descrição completa]
- **Pain Points:** [Problemas que resolve]
- **Gain Points:** [Benefícios que oferece]

## Copy que Funciona
- **Headlines Vencedoras:**
  - "..."
  - "..."
- **CTAs Efetivas:**
  - "..."

## Performance Histórica
- **Email:** XXX% open, XXX% click
- **Landing Page:** XXX% conversion
- **Cold Traffic:** XXX% response

## Persona Emocional
- **Medo:** [O que teme]
- **Desejo:** [O que quer]
- **Gatilho Forte:** [Que psicológico funciona]

## Notas Para Copywriters
- [Insights específicos]
- [Padrões observados]
- [O que NÃO funciona]
```

---

## 🚀 Como Começar

### Para Copy-Chef:
1. Quando receber demanda, primeiro execute: `*client-data {cliente}`
2. Consulte dados para roteamento mais inteligente
3. Passe contexto completo para especialista

### Para Especialistas:
1. Quando receber briefing, execute: `*client-{seu-tipo} {cliente}`
2. Consulte dados vencedores históricos
3. Use patterns que já funcionaram como baseline

### Para Você:
1. Mantenha `/docs/clientes/` atualizado
2. Documente cada campanha e resultados
3. Adicione headlines/CTAs vencedoras após cada campanha
4. Atualize response rates regularmente

---

## 📊 Exemplo de Estrutura Ideal

```
/docs/clientes/
├── dra-vanessasoares-bh.md
│   ├── Posicionamento ✓
│   ├── ICP ✓
│   ├── Brand Voice ✓
│   ├── Headlines Vencedoras ✓
│   ├── Performance Data ✓
│   └── Persona Emocional ✓
│
├── estetica-gabrielleoliveira.md
│   ├── [Mesma estrutura] ✓
│
└── [Novos clientes seguem padrão]
```

---

**Última atualização:** 2026-02-25
**Status:** Sistema de Acesso a Dados Implementado
