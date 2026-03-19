# Design System — Instituto Enio Leite
**Versão:** 1.0 | **Data:** 2026-03-17 | **Criado por:** @ux-design-expert (Uma)

---

## 🏛️ IDENTIDADE VISUAL

### Posicionamento
**Luxury medical aesthetic** — A linguagem visual deve comunicar: excelência clínica com sofisticação. Não é uma clínica comum. É um instituto de referência em Harmonização Orofacial.

### Personalidade da Marca
| Atributo | Expressão Visual |
|----------|-----------------|
| Luxo | Muito espaço branco, ouro parcimonioso |
| Autoridade | Tipografia serif imponente |
| Sofisticação | Paleta quente e restrita (não colorida) |
| Confiança | Grid limpo, sem excesso de elementos |
| Exclusividade | Fotografia editorial dark studio |

---

## 🎨 PALETA DE CORES

### Cor Extraída da Logo
`#C08B51` — Bronze Champagne (cor exata extraída via pixel sampling da logo original)

### Escala de Ouro (Brand)
```
--gold-50:   #FDF8F0   ← Fundo ultra-suave, uso em seções alternadas
--gold-100:  #F7ECD8   ← Fundo de cards, hover sutil
--gold-200:  #EDD5A8   ← Bordas decorativas
--gold-300:  #E0BB78   ← Separadores, ícones secundários
--gold-400:  #D4A264   ← Gold claro — textos sobre fundo escuro
--gold-500:  #C08B51   ← BRAND PRIMARY — logo, CTAs, destaques ★
--gold-600:  #A6733A   ← Gold hover state
--gold-700:  #8A5C26   ← Gold ativo/pressionado
--gold-800:  #6B4619   ← Gold profundo
--gold-900:  #4D3010   ← Gold máximo contraste
```

### Escala Neutra (Warm-toned — NUNCA fria)
```
--neutral-50:   #FAFAF8   ← Background principal da página
--neutral-100:  #F4F3F0   ← Surface de cards, inputs
--neutral-200:  #E8E6E1   ← Bordas sutis
--neutral-300:  #D4D0C8   ← Bordas de dividers
--neutral-400:  #ABA59B   ← Texto placeholder, disabled
--neutral-500:  #82796E   ← Texto secundário, captions
--neutral-600:  #5C5349   ← Texto body em fundo claro
--neutral-700:  #3D3630   ← Texto em destaque
--neutral-800:  #252019   ← Fundo dark sections
--neutral-900:  #15120D   ← Fundo hero dark, near-black ★
```

### Tokens Semânticos
```
--color-background:       var(--neutral-50)     ← Fundo da página
--color-surface:          #FFFFFF               ← Cards, modais
--color-surface-alt:      var(--gold-50)        ← Seções alternadas
--color-border:           var(--neutral-200)    ← Bordas padrão
--color-border-accent:    var(--gold-500)       ← Bordas de destaque
--color-text-primary:     var(--neutral-900)    ← Texto principal
--color-text-secondary:   var(--neutral-500)    ← Texto de apoio
--color-text-inverted:    #FFFFFF               ← Texto sobre dark
--color-accent:           var(--gold-500)       ← Acento principal
--color-accent-light:     var(--gold-400)       ← Acento sobre dark bg
--color-cta:              var(--gold-500)       ← Botões primários
--color-cta-hover:        var(--gold-600)       ← Hover do CTA
```

### Fundos de Seção (uso sequencial sugerido)
```
Seção 1 (Hero):        #15120D (dark, impacto máximo)
Seção 2:               #FFFFFF (respiro, leveza)
Seção 3:               #FAFAF8 (warm white, suave)
Seção 4 (CTA):         #15120D (dark, reconversão)
Seção 5:               #FFFFFF
Footer:                #15120D
```

---

## ✍️ TIPOGRAFIA

### Famílias

#### 1. Display — Cormorant Garamond (Variable)
**Uso:** Headlines, nome do instituto, títulos de seções, citações
**Por quê:** Serif editorial com contraste extremo de traço fino/grosso. Combina com o logotipo — mesma elegância de atelier de alta moda. Variable weight 300–700.

```css
font-family: 'Cormorant Garamond', serif;
/* Google Fonts import */
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&display=swap');
```

**Variações mais usadas:**
- `font-weight: 300` — headlines grandes, leve, elegante
- `font-weight: 500` — headlines em destaque
- `font-style: italic` — citações de pacientes, subheadings especiais

#### 2. UI / Body — DM Sans (Variable)
**Uso:** Corpo de texto, botões, labels, UI elements, o "instituto" da logo
**Por quê:** Humanista, legível, moderno sem ser frio. Light 300 replica o "instituto" da logo perfeitamente.

```css
font-family: 'DM Sans', sans-serif;
/* Google Fonts import */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
```

**Variações:**
- `font-weight: 300` — labels, categorias, "instituto"-style
- `font-weight: 400` — corpo de texto
- `font-weight: 500` — botões, navegação

### Escala Tipográfica (Fluid — sem breakpoints)
```css
:root {
  /* Display — Cormorant Garamond */
  --text-hero:    clamp(3.5rem,  2rem + 7.5vw, 7rem);     /* 56–112px */
  --text-display: clamp(2.5rem,  1.5rem + 5vw,  5.5rem);  /* 40–88px  */
  --text-h1:      clamp(2rem,    1.25rem + 3.75vw, 4rem);  /* 32–64px  */
  --text-h2:      clamp(1.625rem, 1rem + 3.125vw, 3rem);  /* 26–48px  */
  --text-h3:      clamp(1.375rem, 1rem + 1.875vw, 2rem);  /* 22–32px  */

  /* Body — DM Sans */
  --text-body-lg: clamp(1.0625rem, 0.975rem + 0.4375vw, 1.25rem); /* 17–20px */
  --text-body:    clamp(1rem,     0.95rem + 0.25vw,  1.125rem);   /* 16–18px */
  --text-sm:      clamp(0.875rem, 0.85rem + 0.125vw, 0.9375rem);  /* 14–15px */
  --text-label:   clamp(0.75rem,  0.725rem + 0.125vw, 0.8125rem); /* 12–13px */
}
```

### Line Heights
```css
--leading-display: 1.05;   /* Hero e Display — bem apertado = luxo */
--leading-heading: 1.15;   /* H1, H2 */
--leading-subhead: 1.3;    /* H3 */
--leading-body:    1.65;   /* Body — confortável para leitura */
--leading-label:   1.4;    /* Labels */
```

### Letter Spacing
```css
--tracking-display:  -0.02em;  /* Headlines grandes — comprimido = elegante */
--tracking-heading:  -0.01em;
--tracking-body:      0em;
--tracking-label:     0.08em;  /* Labels em uppercase — espaçado */
--tracking-caps:      0.12em;  /* Textos em ALL CAPS */
```

### Estilos de Texto (Compostos)
```css
.text-hero {
  font-family: var(--font-display);
  font-size: var(--text-hero);
  font-weight: 300;
  line-height: var(--leading-display);
  letter-spacing: var(--tracking-display);
}

.text-display {
  font-family: var(--font-display);
  font-size: var(--text-display);
  font-weight: 300;
  line-height: var(--leading-display);
  letter-spacing: var(--tracking-display);
}

.text-label-caps {
  font-family: var(--font-body);
  font-size: var(--text-label);
  font-weight: 300;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
}
/* ↑ Equivalente ao "instituto" da logo — usar para categorias, tags, labels */
```

---

## 📐 GRID & ESPAÇAMENTO

### Base Grid: 4px
```css
--space-1:   4px
--space-2:   8px
--space-3:   12px
--space-4:   16px
--space-5:   20px
--space-6:   24px
--space-8:   32px
--space-10:  40px
--space-12:  48px
--space-16:  64px
--space-20:  80px
--space-24:  96px
--space-32:  128px
--space-40:  160px  ← Espaço entre seções mobile
--space-48:  192px  ← Espaço entre seções desktop
```

### Container
```css
--container-max: 1280px;
--container-padding: clamp(1.5rem, 5vw, 5rem); /* 24–80px horizontal */
```

### Seções (padding vertical)
```css
--section-padding: clamp(4rem, 10vw, 8rem); /* 64–128px */
--section-padding-lg: clamp(6rem, 14vw, 12rem); /* Hero e CTA */
```

---

## 🔲 BORDAS & RAIO

### Filosofia: Luxury = Sharp
Marcas de luxo evitam bordas arredondadas excessivas. O Instituto Enio Leite é austero e refinado.

```css
--radius-none:  0px       ← Cards, containers principais, imagens
--radius-sm:    2px       ← Sutilíssimo — badges, chips
--radius-md:    4px       ← Inputs, tooltips
--radius-pill:  9999px    ← Apenas botões CTA e tags especiais
```

**Regra:** Cards = `0px`. Botões = `2px` ou `9999px` (pill). NUNCA `12px` ou `16px` em cards.

### Bordas Decorativas
```css
/* Divisor elegante — linha dourada fina */
.divider-gold {
  height: 1px;
  background: var(--gold-500);
  opacity: 0.3;
}

/* Acento lateral — borda esquerda dourada */
.accent-border {
  border-left: 1px solid var(--gold-500);
  padding-left: var(--space-6);
}
```

---

## 🌫️ SOMBRAS

### Filosofia: Sombras Quentes (nunca azuladas)
```css
--shadow-sm:  0 1px 3px rgba(21, 18, 13, 0.08);
--shadow-md:  0 4px 16px rgba(21, 18, 13, 0.10);
--shadow-lg:  0 16px 48px rgba(21, 18, 13, 0.12);
--shadow-xl:  0 32px 80px rgba(21, 18, 13, 0.15);
/* ↑ Sempre com o neutral-900 warm, não preto puro */

/* Sombra dourada sutil — para cards em hover */
--shadow-gold: 0 8px 32px rgba(192, 139, 81, 0.15);
```

---

## 🖼️ FOTOGRAFIA

### Estilo Visual
Baseado nas referências de foto profissional:
- **Dark studio background** — fundo escuro (preto/cinza escuro) quente
- **Lighting:** Rembrandt ou loop lighting — sombras dramáticas
- **Crop:** Bust shot (cabeça + ombros) ou close-up
- **Tom:** Sem filtros quentes excessivos — neutro/levemente desaturado
- **Pose:** Profissional, direta ao câmera ou lateral

### Tratamento de Imagem
```css
/* Overlay suave em imagens — integra na paleta */
.image-overlay {
  background: linear-gradient(
    to bottom,
    transparent 40%,
    rgba(21, 18, 13, 0.6) 100%
  );
}

/* Imagem em seção dark — leve vinheta */
.image-vignette {
  box-shadow: inset 0 0 80px rgba(21, 18, 13, 0.4);
}
```

---

## ⚡ TOKENS CSS (arquivo completo)

```css
/* ============================================
   DESIGN SYSTEM — INSTITUTO ENIO LEITE
   Version: 1.0 | 2026-03-17
   ============================================ */

:root {
  /* --- BRAND GOLD --- */
  --gold-50:   #FDF8F0;
  --gold-100:  #F7ECD8;
  --gold-200:  #EDD5A8;
  --gold-300:  #E0BB78;
  --gold-400:  #D4A264;
  --gold-500:  #C08B51;
  --gold-600:  #A6733A;
  --gold-700:  #8A5C26;
  --gold-800:  #6B4619;
  --gold-900:  #4D3010;

  /* --- NEUTRAL WARM --- */
  --neutral-50:   #FAFAF8;
  --neutral-100:  #F4F3F0;
  --neutral-200:  #E8E6E1;
  --neutral-300:  #D4D0C8;
  --neutral-400:  #ABA59B;
  --neutral-500:  #82796E;
  --neutral-600:  #5C5349;
  --neutral-700:  #3D3630;
  --neutral-800:  #252019;
  --neutral-900:  #15120D;

  /* --- SEMANTIC --- */
  --color-bg:           var(--neutral-50);
  --color-surface:      #FFFFFF;
  --color-surface-alt:  var(--gold-50);
  --color-border:       var(--neutral-200);
  --color-border-gold:  var(--gold-500);
  --color-text:         var(--neutral-900);
  --color-text-muted:   var(--neutral-500);
  --color-text-inv:     #FFFFFF;
  --color-accent:       var(--gold-500);
  --color-cta:          var(--gold-500);
  --color-cta-hover:    var(--gold-600);

  /* --- TYPOGRAPHY --- */
  --font-display: 'Cormorant Garamond', Georgia, serif;
  --font-body:    'DM Sans', system-ui, sans-serif;

  --text-hero:    clamp(3.5rem,  2rem + 7.5vw,   7rem);
  --text-display: clamp(2.5rem,  1.5rem + 5vw,   5.5rem);
  --text-h1:      clamp(2rem,    1.25rem + 3.75vw, 4rem);
  --text-h2:      clamp(1.625rem, 1rem + 3.125vw, 3rem);
  --text-h3:      clamp(1.375rem, 1rem + 1.875vw, 2rem);
  --text-body-lg: clamp(1.0625rem, 0.975rem + 0.4375vw, 1.25rem);
  --text-body:    clamp(1rem,    0.95rem + 0.25vw,  1.125rem);
  --text-sm:      clamp(0.875rem, 0.85rem + 0.125vw, 0.9375rem);
  --text-label:   clamp(0.75rem, 0.725rem + 0.125vw, 0.8125rem);

  --leading-display: 1.05;
  --leading-heading: 1.15;
  --leading-body:    1.65;
  --leading-label:   1.4;

  --tracking-display: -0.02em;
  --tracking-heading: -0.01em;
  --tracking-body:     0em;
  --tracking-caps:     0.12em;

  /* --- SPACING --- */
  --space-1:  4px;  --space-2:  8px;  --space-3:  12px;
  --space-4:  16px; --space-5:  20px; --space-6:  24px;
  --space-8:  32px; --space-10: 40px; --space-12: 48px;
  --space-16: 64px; --space-20: 80px; --space-24: 96px;
  --space-32: 128px;

  --container-max:     1280px;
  --container-padding: clamp(1.5rem, 5vw, 5rem);
  --section-padding:   clamp(4rem, 10vw, 8rem);

  /* --- RADIUS --- */
  --radius-none: 0px;
  --radius-sm:   2px;
  --radius-md:   4px;
  --radius-pill: 9999px;

  /* --- SHADOWS (warm) --- */
  --shadow-sm:   0 1px 3px rgba(21, 18, 13, 0.08);
  --shadow-md:   0 4px 16px rgba(21, 18, 13, 0.10);
  --shadow-lg:   0 16px 48px rgba(21, 18, 13, 0.12);
  --shadow-gold: 0 8px 32px rgba(192, 139, 81, 0.15);
}
```

---

## 🧩 TAILWIND CONFIG

```js
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#FDF8F0', 100: '#F7ECD8', 200: '#EDD5A8',
          300: '#E0BB78', 400: '#D4A264', 500: '#C08B51',
          600: '#A6733A', 700: '#8A5C26', 800: '#6B4619', 900: '#4D3010',
          DEFAULT: '#C08B51',
        },
        warm: {
          50:  '#FAFAF8', 100: '#F4F3F0', 200: '#E8E6E1',
          300: '#D4D0C8', 400: '#ABA59B', 500: '#82796E',
          600: '#5C5349', 700: '#3D3630', 800: '#252019', 900: '#15120D',
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'hero':    ['clamp(3.5rem, 2rem + 7.5vw, 7rem)',    { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display': ['clamp(2.5rem, 1.5rem + 5vw, 5.5rem)',  { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'h1':      ['clamp(2rem, 1.25rem + 3.75vw, 4rem)',  { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'h2':      ['clamp(1.625rem, 1rem + 3.125vw, 3rem)',{ lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'h3':      ['clamp(1.375rem, 1rem + 1.875vw, 2rem)',{ lineHeight: '1.3'  }],
        'body-lg': ['clamp(1.0625rem, 0.975rem + 0.4375vw, 1.25rem)',  { lineHeight: '1.65' }],
        'body':    ['clamp(1rem, 0.95rem + 0.25vw, 1.125rem)',         { lineHeight: '1.65' }],
        'sm':      ['clamp(0.875rem, 0.85rem + 0.125vw, 0.9375rem)',   { lineHeight: '1.5'  }],
        'label':   ['clamp(0.75rem, 0.725rem + 0.125vw, 0.8125rem)',   { lineHeight: '1.4', letterSpacing: '0.12em' }],
      },
      borderRadius: {
        'none': '0px', 'sm': '2px', 'DEFAULT': '4px', 'full': '9999px',
      },
      boxShadow: {
        'sm':   '0 1px 3px rgba(21, 18, 13, 0.08)',
        'md':   '0 4px 16px rgba(21, 18, 13, 0.10)',
        'lg':   '0 16px 48px rgba(21, 18, 13, 0.12)',
        'gold': '0 8px 32px rgba(192, 139, 81, 0.15)',
      },
      spacing: {
        '18': '4.5rem', '22': '5.5rem', '26': '6.5rem', '30': '7.5rem',
      },
    },
  },
}

export default config
```

---

## 🚫 REGRAS DO QUE NÃO FAZER

| ❌ NUNCA | ✅ SEMPRE |
|---------|---------|
| Usar ouro em backgrounds grandes | Ouro em detalhes: bordas, ícones, separadores |
| Bordas arredondadas em cards (`>4px`) | Cards com `border-radius: 0` |
| Cores frias (azul, verde) | Apenas warm: gold + neutros quentes |
| Mais de 2 famílias tipográficas | Cormorant + DM Sans apenas |
| Gradients coloridos | No máximo: white → gold-50 ou neutral-900 → transparent |
| Ícones com cor diferente do ouro | Ícones sempre em `--gold-500` ou `--neutral-400` |
| Tipografia body em Cormorant | Cormorant APENAS para display/headlines |
| Sombras azuladas/frias | Sombras sempre com `rgba(21, 18, 13, ...)` |

---

## 📁 ARQUIVOS

| Arquivo | Localização |
|---------|------------|
| Logo Monograma | `docs/clientes/dr-enio-leite/logo-monograma.png` |
| Logo Horizontal | `docs/clientes/dr-enio-leite/logo-horizontal.png` |
| Design System | `docs/clientes/dr-enio-leite/DESIGN-SYSTEM.md` (este arquivo) |
| Tokens CSS | Implementar em `styles/tokens.css` no projeto |
| Tailwind Config | Implementar em `tailwind.config.ts` no projeto |

---

*— @ux-design-expert (Uma) · Instituto Enio Leite Design System v1.0*
