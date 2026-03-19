# Premium Designer F6 — Visual DNA (Extraído de 238 Referências)

> Documento técnico consolidado de TODOS os padrões visuais extraídos
> de 14 pastas de referência do swipe-file-criativos.
> Base para atualização do `meu-projeto/lib/premium-designer.js`

---

## 1. TIPOGRAFIA — Padrões Consolidados

### Fontes Identificadas nas Referências (por frequência)
| Fonte | Tipo | Uso | Visto em |
|-------|------|-----|----------|
| **Playfair Display** | Serif Didone | Headlines de impacto, italico para destaque | Aquila, Jesse Branth, Dhiessica |
| **Montserrat** | Sans-serif | Labels, CTA, corpo, uppercase com tracking | Todos |
| **Inter** | Sans-serif | Headlines bold, corpo | Codigo010K, Blue Growth, Infoprodutor |
| **Cormorant Garamond** | Serif | Alternativa ao Playfair, mais leve | Jesse Branth |
| **Plus Jakarta Sans** | Sans-serif | Headlines modernos | Blue Growth |
| **Satoshi** | Sans-serif | Headlines tech premium | Blue Growth |

### Hierarquia Tipográfica (4 níveis)
1. **Headline:** Bold/Black (700-900), tamanho dominante (48-80px em 1080px), cor branca ou accent
2. **Subtítulo:** Medium/SemiBold (500-600), ~50% do headline, cor accent ou branca com opacidade
3. **Corpo:** Regular (400), 14-18px, cinza claro (#B0B0B0 a #CCCCCC)
4. **Label/Badge:** Medium uppercase, tracking largo (200-400), 12-14px

### Regras de Tipografia
- **Itálico estratégico:** Só para 1-3 palavras de destaque por peça (nunca frases inteiras)
- **Ponto final nos títulos:** Transmite assertividade ("Inscrições abertas." / "PRODUTIVIDADE EXTREMA.")
- **Leading apertado:** Line-height 0.95-1.15 para headlines (linhas quase se tocam = blocos densos)
- **Tracking variado:** Apertado (-0.02em) para headlines uppercase; largo (+0.15em) para labels
- **Hierarquia por cor:** Palavras-chave na cor accent (verde/azul/dourado), restante em branco
- **Máximo 2 famílias por peça:** Serif para emoção + Sans-serif para informação

### Combinações de Fontes Testadas
| Estilo | Headline | Corpo | Referência |
|--------|----------|-------|------------|
| Luxo/Editorial | Playfair Display 900 italic | Montserrat 400 | Aquila, Dhiessica |
| Tech/Premium | Inter 900 | Inter 400 | Codigo010K, F6 atual |
| SaaS/Moderno | Plus Jakarta Sans 800 | Plus Jakarta Sans 400 | Blue Growth |
| Editorial Clássico | Cormorant Garamond 400 | Montserrat 500 | Jesse Branth |

---

## 2. FUNDOS — Padrões Consolidados

### Cores de Fundo (por frequência)
| Cor | Hex | Temperatura | Visto em |
|-----|-----|-------------|----------|
| Preto puro frio | `#0A0A0A` | Neutro | Codigo010K, F6 atual |
| Preto azulado | `#0A0E14` | Frio | Blue Growth |
| Preto quente | `#0D0B08` | Quente | Aquila Finanças |
| Preto vermelho | `#0D0D0D` | Neutro | Eslen Delanogare |
| Off-white quente | `#F5F0EB` | Quente | Infoprodutor, Psicóloga |
| Bege/Cream | `#F0E8DC` | Quente | Dhiessica Santos |

### Técnicas de Fundo
1. **Gradiente radial sutil:** Centro ~5% mais claro que bordas (todos os projetos escuros)
2. **Textura grain:** 3-8% de noise em soft-light/overlay (universalmente usado)
3. **Tipografia decorativa gigante:** Texto 200pt+ em 5-15% opacidade atrás do sujeito (Codigo010K, Infoprodutor)
4. **Formas geométricas 3D:** Painéis angulares em cinza escuro #1A1A1A (Blue Growth)
5. **Textura de papel/linho:** Nos fundos claros (Dhiessica, Psicóloga)
6. **Watermark de elementos temáticos:** Candlesticks, hexágonos, dados em 5-10% opacidade

### Vinheta (Padrão Universal)
- **Todos os projetos** usam vinheta radial escura nas bordas
- **Intensidade:** 30-50% nos cantos, 40-60% nas bordas laterais
- **Centro:** Transparente ou com gradiente sutil da cor accent
- **Cor da vinheta:** Preto puro (maioria) ou colorida (verde escuro para neon-green, azul escuro para neon-blue)

---

## 3. ILUMINAÇÃO — Padrões Consolidados

### Tipos de Luz Identificados
| Tipo | Descrição | Visto em | Implementável? |
|------|-----------|----------|---------------|
| **Glow neon central** | Retângulo/elipse de cor brilhante atrás do sujeito | Codigo010K, F6 atual | ✅ Já existe |
| **Rim light colorido** | Contorno de luz na borda do cabelo/ombros | Todos c/ foto | ✅ Já existe |
| **Backlight dramatico** | Luz forte de trás do sujeito, criando halo | Eslen (vermelho), Aquila (dourado) | ✅ Melhorar |
| **Light rays diagonais** | Feixes de luz dos cantos | Codigo010K, F6 atual | ✅ Já existe |
| **Feixes verticais** | Raios finos verticais subindo | Blue Growth | 🆕 Implementar |
| **Partículas/Bokeh** | Pontos luminosos flutuando | Aquila, F6 atual | ✅ Já existe |
| **Lens flare sutil** | Reflexos de lente nos cantos | Aquila | 🆕 Implementar |
| **Glow atmosférico** | Névoa/fog colorida na base | F6 atual, Eslen | ✅ Já existe |

### Efeito Glitch (NOVO — Codigo010K)
- Linhas verticais irregulares no glow central
- Simula corrupção de dados / interferência digital
- **Técnica:** Displacement map vertical com variação aleatória
- **Implementação:** Gerar SVG com linhas verticais de opacidade/largura variável sobre o glow

### Formas Geométricas de Luz (NOVO — Eslen Delanogare)
- "Shards" angulares (fragmentos de vidro) em cor accent
- 3-4 formas triangulares/trapezoidais atrás do sujeito
- Ângulos agudos (~30-60°), parcialmente ocultos pela pessoa
- **Implementação:** SVG com polígonos coloridos em Screen blend

---

## 4. TRATAMENTO DE FOTOS — Padrões Consolidados

### Recorte
- **Feathering:** 2-6px de suavização nas bordas (NUNCA corte duro)
- **Fade inferior:** Gradiente de alpha nos 25-30% inferiores da foto (dissolve no fundo)
- **Cabelo:** O glow atrás do sujeito mascara imperfeições no recorte do cabelo

### Posicionamento
| Estilo | Posição Foto | Posição Texto | Visto em |
|--------|-------------|---------------|----------|
| **Centro-superior** | Rosto no terço superior, centralizado | Bottom 30-40% | F6 atual, Codigo010K |
| **Direita** | Sujeito no lado direito ~55% | Esquerda ~45% | Eslen, Aquila |
| **Full center** | Sujeito centralizado, corpo some no preto | Overlay com gradiente | Wagner Mello, Blue Growth |

### Color Grading
| Estilo | Técnica | Visto em |
|--------|---------|----------|
| Dessaturação parcial | -30% a -50% saturação da pele | Eslen, Codigo010K |
| Tons quentes/amber | Highlights puxados para dourado | Aquila |
| Tons frios/azulados | Shadows puxados para azul | Blue Growth |
| P&B com accent | Foto quase monocromática + 1 cor de destaque | Eslen (vermelho), Wagner Mello |
| Crushed blacks | Sombras esmagadas, midtones aquecidos | Aquila |

### Integração Foto-Fundo
- **Roupa preta:** A pessoa SEMPRE veste preto → roupa se funde com fundo escuro (TODOS os projetos)
- **Glow reverso:** Em vez de drop shadow, usar glow colorido ATRÁS do sujeito (anti-sombra)
- **Sem drop shadow:** Nenhuma referência usa drop shadow tradicional na pessoa

---

## 5. ELEMENTOS GRÁFICOS — Padrões Consolidados

### Header Editorial (NOVO — padrão recorrente)
- **Formato:** "MARCA | CATEGORIA | ANO" no topo
- **Estilo:** Sans-serif uppercase, tracking 200-400, opacidade 60-80%
- **Visto em:** Aquila ("ÁQUILA | FINANÇAS | 2026"), Jesse Branth ("2024 | JESSEBRANTH"), Wagner Mello
- **Implementar no F6:** Header com `@byericsantos` + ano + categoria

### Botão CTA (NOVO — padrão recorrente)
| Estilo | Formato | Cor | Visto em |
|--------|---------|-----|----------|
| Pill | border-radius 20-24px | Accent color | Infoprodutor |
| Rounded | border-radius 6-8px | Gradiente accent | Aquila (dourado) |
| Outline | border 2px solid accent | Fundo transparente | F6 atual |
| Badge vermelho | border-radius full | Vermelho sólido | Eslen |

### Elementos Decorativos por Categoria
| Nicho | Elementos | Exemplo |
|-------|-----------|---------|
| **Tech/Digital** | Glitch, barras neon, badges de follower | Codigo010K |
| **Finanças/Business** | Linhas douradas, peças de xadrez, cordas | Aquila |
| **Mentoria/Educação** | Fragmentos geométricos, badges de módulo | Eslen |
| **Feminino/Lifestyle** | Folhas botânicas douradas, arcos | Dhiessica |
| **SaaS/Growth** | Círculos concêntricos, feixes verticais, pills | Blue Growth |
| **Psicologia/Saúde** | Fotos atmosféricas, silhuetas, pedras | Wagner Mello, Psicóloga |

---

## 6. LAYOUT/DIAGRAMAÇÃO — Padrões Consolidados

### Grid Principal (1080x1350)
```
┌──────────────────────────────────┐
│  Header: Marca | Cat | Ano  (8%)│
├──────────────────────────────────┤
│                                  │
│  Headline (20-25%)               │
│                                  │
├──────────────────────────────────┤
│                                  │
│  Foto/Visual Central (40-45%)    │
│                                  │
├──────────────────────────────────┤
│  Subtítulo + CTA (15-20%)        │
├──────────────────────────────────┤
│  Footer: Handle | Badge    (8%)  │
└──────────────────────────────────┘
```

### Margens
- **Lateral:** 32-48px (3-4.5% de 1080px) — NUNCA menos que 32px
- **Vertical (topo/base):** 36-60px
- **Entre blocos:** 24-48px

### Alinhamento por Estilo
| Estilo | Alinhamento texto | Foto |
|--------|-------------------|------|
| Impacto/CTA | Centralizado | Centralizada |
| Editorial | Esquerda | Direita ou full |
| Minimalista | Centralizado | Ausente |

---

## 7. CORES — Paletas por Nicho

### Presets Atuais (F6 v2)
| Preset | Accent | BG | Status |
|--------|--------|-----|--------|
| neon-green | `#00FF66` | `#0A0A0A` | ✅ Funciona |
| neon-blue | `#0096FF` | `#0A0A0A` | ✅ Funciona |
| neon-red | `#FF3232` | `#0A0A0A` | ✅ Funciona |
| gold-premium | `#FFD700` | `#0D0D0D` | ✅ Funciona |
| clean-dark | `#FFFFFF` | `#0A0A0A` | ✅ Funciona |

### Presets NOVOS (extraídos das referências)
| Preset | Accent | BG | Inspiração | Nicho |
|--------|--------|----|------------|-------|
| **cobalt-editorial** | `#2D35C5` | `#E0E0E6` (claro) | Jesse Branth | Editorial |
| **amber-luxury** | `#D4A853` | `#0D0B08` | Aquila Finanças | Finanças/Luxo |
| **crimson-power** | `#D42B2B` | `#0D0D0D` | Eslen Delanogare | Mentoria/Power |
| **matrix-green** | `#00FF41` | `#0D0D0D` | Codigo010K | Tech/Growth |
| **ocean-tech** | `#3B9EFF` | `#0A0E14` | Blue Growth | SaaS/Data |
| **warm-gold** | `#C9A84C` | `#F5F0EB` (claro) | Dhiessica Santos | Feminino/Luxo |
| **navy-corporate** | `#2B4C9B` | `#F5F0EB` (claro) | Infoprodutor | Business |
| **burnt-orange** | `#FF6633` | `#0D0D0D` | Moskitão | E-commerce |
| **earth-zen** | `#8B7355` | `#F2EDE7` (claro) | Psicóloga | Saúde/Wellness |

---

## 8. EFEITOS — Catálogo Completo

### Efeitos Já Implementados (F6 v2)
- ✅ Background SVG radial gradient
- ✅ Light effects overlay (screen blend)
- ✅ Bokeh particles
- ✅ Glow atrás do sujeito
- ✅ Back text (tipografia gigante semi-transparente)
- ✅ Feathering nas bordas da foto
- ✅ Rim light / edge glow
- ✅ Smoke/fog na base
- ✅ Color grading (recomb 3x3 + linear)
- ✅ Film grain
- ✅ Vignette dupla

### Efeitos NOVOS para Implementar
| Efeito | Prioridade | Técnica | Referência |
|--------|-----------|---------|------------|
| **Glitch digital** | Alta | SVG linhas verticais aleatórias sobre o glow | Codigo010K |
| **Light shards** | Alta | SVG polígonos angulares em Screen blend | Eslen |
| **Feixes verticais** | Média | SVG linhas verticais finas com glow | Blue Growth |
| **Partículas douradas** | Média | Bokeh em tons dourados, menores (2-4px) | Aquila |
| **Header editorial** | Alta | Playwright HTML — marca + categoria + ano | Aquila, Jesse |
| **Botão CTA** | Alta | Playwright HTML — pill ou rounded | Todos |
| **Lens flare sutil** | Baixa | SVG gradiente radial nos cantos | Aquila |
| **Reflexo especular** | Baixa | Sharp — highlight branco suave no topo | Dhiessica |
| **Circulos concêntricos** | Baixa | SVG circles com text-on-path | Blue Growth |
| **Fundo claro** | Alta | Suporte a bg off-white #F5F0EB | Infoprodutor, Psicóloga |

---

## 9. PIPELINE TÉCNICO — O que Precisa para Replicar

### Ferramentas Atuais (já instaladas)
- ✅ **Sharp** — composição, blur, recomb, linear, resize
- ✅ **Playwright** — tipografia HTML/CSS → PNG com omitBackground
- ✅ **rembg** — remoção de fundo (Python, via CLI)

### Fontes que Precisam ser Instaladas
```bash
# Já disponíveis via Google Fonts (carregadas no Playwright via @import)
# Playfair Display — serif editorial
# Cormorant Garamond — serif leve
# Plus Jakarta Sans — sans-serif moderna
# Satoshi — precisa de CDN específico (usar Inter como fallback)
```

### Gaps no Pipeline Atual vs Referências
| O que falta | Como resolver |
|-------------|--------------|
| Suporte a fundo CLARO | Novo fluxo no pipeline: bg off-white, texto escuro, sem glow |
| Header editorial | Nova camada HTML no Playwright |
| Botão CTA no criativo | Incluir no frontText HTML |
| Mais presets de cor | Adicionar 9 novos presets ao PRESETS object |
| Glitch effect | SVG com linhas verticais aleatórias |
| Light shards | SVG com polígonos angulares |
| Feixes verticais | SVG com linhas verticais finas + blur |
| Tipografia serif | Carregar Playfair Display no HTML |
| Color grading por nicho | Novos colorMatrix para cada preset |

---

## 10. REGRAS DE OURO (Extraídas de TODAS as Referências)

1. **Monocromatismo máximo:** Preto + 1 cor accent. NUNCA mais de 2 matizes por peça
2. **Tipografia como protagonista:** Se a foto for fraca, a tipografia salva. Se ambas forem fortes, é premium
3. **Espaço negativo generoso:** 30%+ do canvas deve ser "vazio" — respiro = sofisticação
4. **Roupa preta = invisível:** A pessoa deve vestir preto para fundir com o fundo
5. **Glow > Shadow:** Usar luz colorida atrás da pessoa em vez de sombra projetada
6. **Grain sempre:** 3-8% de noise em overlay/soft-light remove o aspecto "digital demais"
7. **Vinheta universal:** Todo criativo premium tem escurecimento nas bordas
8. **Header editorial:** Marca + Categoria + Ano no topo dá ar de publicação premium
9. **Ponto final no título:** "Resultado." transmite mais autoridade que "Resultado"
10. **Palavras-chave em accent color:** O olho vai primeiro para a cor diferente
11. **Leading apertado:** Line-height 0.95-1.15 para headlines cria blocos impactantes
12. **Nunca branco puro:** Usar off-white #F5F0EB para fundos claros
13. **Nunca preto puro:** Usar #0A0A0A a #0D0D0D para fundos escuros

---

*Documento gerado em 08/mar/2026 — Luna (@designer)*
*Base: 238 imagens de 14 projetos Behance premium*
