# Design System — Dr. Cleugo Porto | Dream Incision

> Documentação oficial de identidade visual e design tokens
> Extraído de: https://fascinating-dodol-3149ef.netlify.app/
> Criado em: 2026-03-12 | Por: @ux-design-expert (Uma)
> Stack: Next.js + Tailwind CSS v4 + shadcn/ui

---

## 1. Marcas e Logos

### 1.1 Marca Pessoal — Dr. Cleugo Porto

| Elemento | Detalhe |
|----------|---------|
| **Nome** | DR.CLEUGO PORTO |
| **Tagline** | MEDICINA · ESTÉTICA · INTEGRATIVA |
| **Monograma** | Letras "C" e "P" entrelaçadas em formato circular |
| **Cor do logo** | Gold/champagne (#D1A84B) sobre fundo preto (#000000) |
| **Tipografia** | Sans-serif geométrica, tracking amplo, uppercase |
| **Uso** | Header do site, favicon, avatares, assinaturas formais |

### 1.2 Marca do Procedimento — Dream Incision

| Elemento | Detalhe |
|----------|---------|
| **Nome** | Dream Incision |
| **Ícone** | Silhueta feminina estilizada em gold (linha fluida) |
| **Cor do logo** | Gold texturizado (#D1A84B com textura granulada) sobre fundo preto texturizado |
| **Tipografia** | Serif elegante (Playfair Display ou similar), caixa mista |
| **Background** | Preto com textura de pedra/ardósia |
| **Uso** | Hero do site, materiais de procedimento, embalagens |

### 1.3 Arquivos de Logo

| Arquivo | Path |
|---------|------|
| Monograma CP | `/images/img-2969-20-281-29.jpeg` |
| Dream Incision | `/images/26d98422-b8ec-423f-a7b9.jpeg` |
| Foto profissional | `/images/dsc02250.jpg` |
| Foto alternativa | `/images/dsc02243.jpg` |

---

## 2. Paleta de Cores

### 2.1 Tema Escuro (Dark Mode — PADRÃO DO SITE)

O site opera em **dark mode permanente** (`class="dark"` no `<html>`).

#### Cores Semânticas (CSS Custom Properties)

```css
:root .dark {
  /* === FUNDOS === */
  --background:     #020202;   /* Quase preto — fundo principal */
  --card:           #060606;   /* Fundo de cards */
  --popover:        #030303;   /* Fundo de popovers/modais */
  --muted:          #121212;   /* Fundo de áreas silenciadas */
  --input:          #121212;   /* Fundo de inputs */
  --secondary:      #0B0B0B;   /* Fundo secundário */

  /* === TEXTOS === */
  --foreground:           #EEEEEE;  /* Texto principal (quase branco) */
  --card-foreground:      #EEEEEE;  /* Texto em cards */
  --popover-foreground:   #EEEEEE;  /* Texto em popovers */
  --muted-foreground:     #8F8F8F;  /* Texto silenciado (cinza médio) */
  --secondary-foreground: #CECECE;  /* Texto secundário */

  /* === MARCA / ACCENT (GOLD) === */
  --primary:              #D1A84B;  /* ★ GOLD PRINCIPAL — cor da marca */
  --primary-foreground:   #020202;  /* Texto sobre gold */
  --accent:               #D1A84B;  /* Accent = mesmo gold */
  --accent-foreground:    #020202;  /* Texto sobre accent */
  --ring:                 #D1A84B;  /* Ring de foco */

  /* === BORDAS === */
  --border:  #2D1F01;  /* Borda escura com sutil tom dourado */

  /* === DESTRUTIVO === */
  --destructive:            #82181A;
  --destructive-foreground: #FB2C36;

  /* === GRÁFICOS === */
  --chart-1: #D1A84B;  /* Gold */
  --chart-2: #00BB7F;  /* Verde */
  --chart-3: #F99C00;  /* Amber */
  --chart-4: #AC4BFF;  /* Roxo */
  --chart-5: #FF2357;  /* Rosa */

  /* === SIDEBAR === */
  --sidebar:                  #030303;
  --sidebar-foreground:       #FAFAFA;
  --sidebar-primary:          #D1A84B;
  --sidebar-primary-foreground: #020202;
  --sidebar-accent:           #121212;
  --sidebar-accent-foreground: #FAFAFA;
  --sidebar-border:           #2D1F01;
  --sidebar-ring:             #D1A84B;
}
```

#### Escala de Opacidade do Gold (uso no Tailwind)

| Classe Tailwind | Uso | Resultado Visual |
|-----------------|-----|------------------|
| `text-primary` | Destaques, CTAs, nomes | #D1A84B 100% |
| `text-primary/60` | Ícones secundários | #D1A84B 60% |
| `bg-primary/10` | Badges, chips, fundos sutis | #D1A84B 10% |
| `bg-primary/20` | Avatares, hover cards | #D1A84B 20% |
| `bg-primary/30` | Bordas de ícones sociais | #D1A84B 30% |
| `border-primary/10` | Separadores, bordas sutis | #D1A84B 10% |
| `border-primary/20` | Bordas de elementos interativos | #D1A84B 20% |
| `border-primary/30` | Bordas de ícones sociais | #D1A84B 30% |

#### Escala de Opacidade do Foreground

| Classe Tailwind | Uso | Resultado Visual |
|-----------------|-----|------------------|
| `text-foreground` | Texto principal | #EEEEEE 100% |
| `text-foreground/80` | Texto de parágrafo | #EEEEEE 80% |
| `text-foreground/70` | Links de navegação inativos | #EEEEEE 70% |
| `text-foreground/60` | Texto terciário, footer | #EEEEEE 60% |
| `text-foreground/50` | Copyright, texto muito sutil | #EEEEEE 50% |

### 2.2 Paleta Completa (Referência Visual)

```
GOLD (Marca)
██████ #D1A84B — Primary / Accent / Ring / Sidebar

BACKGROUNDS (Escala de pretos)
██████ #020202 — Background principal
██████ #030303 — Popover / Sidebar
██████ #060606 — Card
██████ #0A0A0A — Theme-color (meta tag)
██████ #0B0B0B — Secondary
██████ #121212 — Muted / Input

TEXTOS
██████ #EEEEEE — Foreground principal
██████ #CECECE — Secondary foreground
██████ #8F8F8F — Muted foreground

BORDAS
██████ #2D1F01 — Border (tom escuro dourado)

UTILITÁRIAS
██████ #FB2C36 — Destructive text
██████ #82181A — Destructive bg
██████ #00BB7F — Chart verde
██████ #F99C00 — Chart amber
██████ #AC4BFF — Chart roxo
██████ #FF2357 — Chart rosa
```

---

## 3. Tipografia

### 3.1 Famílias Tipográficas

| Papel | Família | Variável CSS | Classe Tailwind |
|-------|---------|-------------|-----------------|
| **Display / Headings** | Playfair Display | `--font-playfair` | `font-serif` |
| **Body / UI** | Inter | `--font-inter` | `font-sans` (quando necessário) |
| **Fallback Serif** | Georgia, Cambria, "Times New Roman", serif | `--font-serif` | — |
| **Fallback Sans** | ui-sans-serif, system-ui, sans-serif | `--font-sans` | — |

### 3.2 Escala Tipográfica (Tailwind v4)

| Token | Tamanho | Line Height | Uso no Site |
|-------|---------|-------------|-------------|
| `text-xs` | 0.75rem (12px) | 1.33 | Labels, copyright, badges |
| `text-sm` | 0.875rem (14px) | 1.43 | Nav links, body small, cards |
| `text-base` | 1rem (16px) | 1.5 | Body text, buttons |
| `text-lg` | 1.125rem (18px) | 1.56 | Subtítulos, footer headings |
| `text-xl` | 1.25rem (20px) | 1.4 | Descrições hero (desktop) |
| `text-2xl` | 1.5rem (24px) | 1.33 | — |
| `text-3xl` | 1.875rem (30px) | 1.2 | H1 mobile, H2 mobile |
| `text-4xl` | 2.25rem (36px) | 1.11 | H1 sm |
| `text-5xl` | 3rem (48px) | 1 | H2 desktop |
| `text-6xl` | 3.75rem (60px) | 1 | H1 lg |
| `text-7xl` | 4.5rem (72px) | 1 | H1 xl |

### 3.3 Pesos Tipográficos

| Token | Valor | Uso |
|-------|-------|-----|
| `font-medium` | 500 | Destaques em texto corrido, nav, botões |
| `font-semibold` | 600 | Subtítulos, stats |
| `font-bold` | 700 | Números destaque |

### 3.4 Tracking (Letter Spacing)

| Token | Valor | Uso |
|-------|-------|-----|
| `tracking-wider` | 0.05em | Botões |
| `tracking-widest` | 0.1em | Nav links, badges, subtítulos de seção |
| `tracking-[0.3em]` | 0.3em | Labels de seção ("Para Profissionais") |

### 3.5 Leading (Line Height)

| Token | Valor | Uso |
|-------|-------|-----|
| `leading-tight` | 1.25 | Headings |
| `leading-relaxed` | 1.625 | Parágrafos descritivos |

### 3.6 Hierarquia Tipográfica no Site

```
Hero H1:        text-3xl sm:text-4xl lg:text-6xl xl:text-7xl font-serif leading-tight
Section H2:     text-3xl lg:text-5xl font-serif
Section Label:  text-xs text-primary tracking-[0.3em] uppercase
Body:           text-base lg:text-xl text-foreground/80 leading-relaxed
Nav Links:      text-sm tracking-widest uppercase
Buttons CTA:    text-sm tracking-widest uppercase / text-base tracking-wider uppercase
Footer H4:      font-serif text-lg
Small Text:     text-xs text-foreground/50
```

---

## 4. Espaçamento

### 4.1 Base

`--spacing: 0.25rem` (4px) — multiplicador base do Tailwind

### 4.2 Padrões de Espaçamento do Site

| Contexto | Padding/Gap | Tailwind |
|----------|-------------|----------|
| Container lateral | 16px / 32px | `px-4 lg:px-8` |
| Seções verticais | 96px / 128px | `py-24 lg:py-32` |
| Entre elementos de nav | 32px | `gap-8` |
| Entre cards no grid | 24px / 32px / 40px | `gap-6` / `gap-8` / `gap-10` |
| Margin bottom heading | 16px / 24px | `mb-4` / `mb-6` |
| Margin bottom seção intro | 64px | `mb-16` |
| Hero padding | 96px / 128px | `py-24 lg:py-32` |

### 4.3 Container

```css
container mx-auto px-4 lg:px-8
```

Sem max-width fixo definido — usa o `container` padrão do Tailwind.

---

## 5. Bordas e Arredondamento

### 5.1 Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius` | 0.625rem (10px) | Padrão shadcn/ui (`rounded-lg`) |
| `rounded-md` | calc(0.625rem - 2px) = 8px | Botões, inputs |
| `rounded-lg` | 0.625rem = 10px | Cards |
| `rounded-xl` | calc(0.625rem + 4px) = 14px | Cards maiores |
| `--radius-2xl` | 1rem (16px) | Overlays, containers |
| `rounded-full` | 9999px | Badges, avatares, dots, botão scroll-top |

### 5.2 Bordas

| Estilo | Classe | Uso |
|--------|--------|-----|
| Borda sutil gold | `border border-primary/10` | Separadores de seção, footer |
| Borda interativa | `border border-primary/20` | Botões de navegação (prev/next) |
| Borda ícone social | `border border-primary/30` | Ícones sociais no footer |
| Borda de input | `border-input` (#121212) | Campos de formulário |

---

## 6. Sombras e Efeitos

### 6.1 Box Shadows

| Token | Uso |
|-------|-----|
| `shadow-lg` | Botão scroll-to-top |
| `drop-shadow-2xl` | Logo Dream Incision no hero |

### 6.2 Gradientes

```css
/* Hero — radial gradient sutil */
bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))]
from-primary/10 via-transparent to-transparent

/* Hero — fade inferior */
bg-gradient-to-t from-background to-transparent

/* Hero — fade lateral (sobre foto) */
bg-gradient-to-r from-background via-background/80 lg:via-background/60 to-transparent

/* Seções — radial gradient decorativo */
bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))]
from-primary/5 via-transparent to-transparent
```

### 6.3 Backdrop / Overlay

```css
/* Mobile menu overlay */
bg-background/80 backdrop-blur-md

/* Imagem hero overlay */
bg-gradient-to-r from-background via-background/80 to-transparent
bg-gradient-to-t from-background via-background/40 to-transparent
```

---

## 7. Componentes UI (Atomic Design)

### 7.1 Botões (Atoms)

#### Primary CTA
```html
<button class="inline-flex items-center justify-center gap-2
  whitespace-nowrap font-medium transition-all
  bg-primary text-primary-foreground hover:bg-primary/90
  rounded-md py-6 tracking-wider uppercase text-base">
  Agendar Consulta
</button>
```

#### Secondary / Outline
```html
<button class="inline-flex items-center justify-center gap-2
  border border-primary/20 text-primary
  hover:bg-primary/10 transition-colors p-3">
  <!-- icon -->
</button>
```

#### Ghost Link
```html
<a class="text-sm text-foreground/60 hover:text-primary
  hover:translate-x-1 transition-all">
  Link
</a>
```

### 7.2 Badge / Chip (Atoms)

```html
<div class="inline-flex items-center gap-3 px-4 py-2
  bg-primary/10 border border-primary/20 rounded-full">
  <span class="relative flex h-2 w-2">
    <span class="animate-ping absolute h-full w-full rounded-full bg-primary opacity-75"></span>
    <span class="relative rounded-full h-2 w-2 bg-primary"></span>
  </span>
  <span class="text-xs tracking-widest uppercase text-primary">
    Medicina Estética de Excelência
  </span>
</div>
```

### 7.3 Card de Serviço (Molecules)

```
Estrutura:
┌─────────────────────┐
│ [Imagem 16:9]       │
│                     │
├─────────────────────┤
│ Título (serif)      │
│ Descrição (sm)      │
│ [Saiba Mais →]      │
└─────────────────────┘

Classes: bg-card border-primary/10 rounded-lg overflow-hidden
```

### 7.4 Social Proof Bar (Organisms)

```
┌──────────┬──────────┬──────────┬──────────┐
│ 15+      │ 5.000+   │ 98%      │ 4.9/5    │
│ Anos     │ Pacientes│ Satisf.  │ Avaliação │
└──────────┴──────────┴──────────┴──────────┘

Números: text-primary font-bold text-2xl
Labels: text-foreground/60 text-xs uppercase tracking-widest
```

### 7.5 Navegação (Organisms)

```
Header: fixed top-0 z-50 transition-all duration-500 bg-transparent
  → Scroll: bg-background/95 backdrop-blur-md border-b border-primary/10

Nav links: text-sm tracking-widest uppercase
  Ativo:    text-primary + underline (h-0.5 bg-primary)
  Inativo:  text-foreground/70
  Hover:    hover:text-primary

Logo: h-10 lg:h-16
```

### 7.6 Floating WhatsApp (Atoms)

```html
<!-- Posicionamento fixo, canto inferior direito -->
<a class="fixed bottom-6 right-6 z-50
  w-14 h-14 bg-[#25D366] rounded-full
  flex items-center justify-center
  shadow-lg hover:scale-110 transition-transform">
  <!-- WhatsApp icon -->
</a>
```

### 7.7 Formulário de Contato (Organisms)

```
Campos: Nome, WhatsApp, Email
Input:  bg-input border-input rounded-md
CTA:    bg-primary text-primary-foreground w-full py-6
Footer: Shield icon + "Seus dados estão protegidos"
```

### 7.8 Testimonial Carousel (Organisms)

```
Avatar:     w-14 h-14 rounded-full bg-primary/20 text-primary font-serif text-xl
Nome:       font-serif text-lg
Info:       text-sm text-foreground/60
Quote:      font-serif italic text-lg
Nav dots:   w-3 h-3 rounded-full (ativo: bg-primary, inativo: bg-primary/30)
Arrows:     p-3 border border-primary/20 hover:bg-primary/10
```

---

## 8. Animações e Transições

### 8.1 Transições Padrão

| Contexto | Classe | Duração |
|----------|--------|---------|
| Cores | `transition-colors` | 150ms (default) |
| Todas props | `transition-all` | 150ms |
| Header scroll | `transition-all duration-500` | 500ms |
| Links/hovers | `duration-300` | 300ms |

### 8.2 Animações de Entrada (Hero)

```css
/* Staggered fade-in + slide-up */
transform transition-all duration-1000 opacity-0 translate-y-10

/* Delays escalonados */
delay-200  → Badge "Medicina Estética"
delay-300  → Logo Dream Incision
delay-500  → Título H1
delay-700  → Parágrafo
delay-800  → Bullet points
delay-900  → Botões CTA
```

### 8.3 Micro-interações

| Elemento | Efeito | Classe |
|----------|--------|--------|
| Botão scroll-top | Scale up | `hover:scale-110` |
| WhatsApp floating | Scale up | `hover:scale-110` |
| Links footer | Translate right | `hover:translate-x-1` |
| Ícones sociais | Scale icon | `group-hover:scale-110` |
| Dot ping | Pulsação | `animate-ping` |
| Pulse | Pulsação suave | `animate-pulse` |

---

## 9. Imagens e Mídia

### 9.1 Tratamento de Imagens

| Contexto | Classes | Aspect Ratio |
|----------|---------|--------------|
| Hero background | `h-full w-full object-cover object-[center_20%]` | Full viewport |
| Logo header | `h-10 lg:h-16 w-auto` | Auto |
| Logo Dream Incision | `h-12 lg:h-24 w-auto drop-shadow-2xl` | Auto |
| Cards de serviço | `object-cover` | 16:9 (`aspect-video`) |
| Before/After | `object-cover` | Pareado |
| Testimonial avatar | `w-14 h-14 rounded-full` | 1:1 |

### 9.2 Estilo Fotográfico

- **Tom**: Escuro, premium, médico-estético
- **Iluminação**: Low-key, contrastes suaves, tons quentes
- **Sujeitos**: Doutor em ambiente clínico, resultados de procedimentos
- **Edição**: Levemente dessaturado, foco em tons de pele naturais

---

## 10. Responsividade

### 10.1 Breakpoints (Tailwind Default)

| Breakpoint | Largura | Prefixo |
|------------|---------|---------|
| Mobile | < 640px | (default) |
| Small | ≥ 640px | `sm:` |
| Medium | ≥ 768px | `md:` |
| Large | ≥ 1024px | `lg:` |
| Extra Large | ≥ 1280px | `xl:` |

### 10.2 Padrões Responsivos Chave

```
Hero H1:     text-3xl → sm:text-4xl → lg:text-6xl → xl:text-7xl
Container:   px-4 → lg:px-8
Header:      h-16 → lg:h-24
Logo:        h-10 → lg:h-16
Grid:        grid-cols-1 → md:grid-cols-2 → lg:grid-cols-4
Seções:      py-24 → lg:py-32
Nav:         Hamburger (mobile) → Horizontal (lg)
```

---

## 11. Acessibilidade e SEO

### 11.1 Meta Tags

```html
<html lang="pt-BR" class="dark">
<meta name="theme-color" content="#0a0a0a">
<meta name="keywords" content="celulite, harmonização corporal, estética, medicina estética, Dr. Cleugo Porto, Dream Incision">
```

### 11.2 Práticas de Acessibilidade

- `antialiased` para renderização de texto suave
- Alt texts em todas as imagens
- Contraste gold (#D1A84B) sobre preto (#020202) = **ratio ~8.5:1** (WCAG AAA)
- Contraste foreground (#EEEEEE) sobre preto (#020202) = **ratio ~17.5:1** (WCAG AAA)
- Ícones SVG com Lucide (consistentes, acessíveis)
- Focus ring com `--ring: #D1A84B`

### 11.3 Ícones

**Biblioteca**: Lucide Icons
**Tamanhos**: `w-3 h-3` (tiny), `w-4 h-4` (small), `w-5 h-5` (default), `w-6 h-6` (large)
**Estilo**: `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`

---

## 12. Stack Técnica

| Tecnologia | Versão/Detalhe |
|------------|----------------|
| **Framework** | Next.js (App Router) |
| **CSS** | Tailwind CSS v4 |
| **UI Library** | shadcn/ui |
| **Gerador** | v0.app (Vercel) |
| **Hospedagem** | Netlify |
| **Fontes** | Google Fonts (Playfair Display + Inter) — woff2 self-hosted |
| **Ícones** | Lucide React |
| **Linguagem** | pt-BR |

---

## 13. Estrutura de Componentes (Site Map)

```
<main>
  ├── Header (fixed, transparent → blur on scroll)
  ├── HeroSection (#inicio)
  ├── SocialProofBar (stats)
  ├── AboutSection (#sobre)
  ├── ServicesSection (#procedimentos)
  ├── BeforeAfterSection (#resultados)
  ├── VideoTestimonials
  ├── CoursesSection (#cursos)
  ├── FAQSection
  ├── ContactSection (#contato)
  ├── Footer
  └── FloatingWhatsApp (fixed)
</main>
```

---

## 14. Design Tokens (Formato JSON para Agentes)

```json
{
  "brand": {
    "name": "Dr. Cleugo Porto",
    "subBrand": "Dream Incision",
    "tagline": "Esculpindo Autoestima",
    "descriptor": "Medicina · Estética · Integrativa",
    "specialty": "Celulite, Lipedema, Harmonização Corporal"
  },
  "colors": {
    "primary": "#D1A84B",
    "primaryForeground": "#020202",
    "background": "#020202",
    "foreground": "#EEEEEE",
    "card": "#060606",
    "muted": "#121212",
    "mutedForeground": "#8F8F8F",
    "border": "#2D1F01",
    "secondary": "#0B0B0B",
    "secondaryForeground": "#CECECE",
    "destructive": "#82181A",
    "destructiveForeground": "#FB2C36",
    "whatsapp": "#25D366"
  },
  "typography": {
    "fontDisplay": "Playfair Display",
    "fontBody": "Inter",
    "heroH1": "text-3xl sm:text-4xl lg:text-6xl xl:text-7xl",
    "sectionH2": "text-3xl lg:text-5xl",
    "sectionLabel": "text-xs tracking-[0.3em] uppercase",
    "body": "text-base lg:text-xl",
    "navLinks": "text-sm tracking-widest uppercase"
  },
  "spacing": {
    "base": "0.25rem",
    "sectionY": "py-24 lg:py-32",
    "containerX": "px-4 lg:px-8"
  },
  "borderRadius": {
    "default": "0.625rem",
    "md": "calc(0.625rem - 2px)",
    "xl": "calc(0.625rem + 4px)",
    "2xl": "1rem",
    "full": "9999px"
  },
  "theme": "dark",
  "themeColor": "#0A0A0A"
}
```

---

## 15. Diretrizes para Criativos (Para @designer e @copy-chef)

### Tom Visual
- **Luxo discreto**: Preto + gold, sem excessos
- **Médico premium**: Confiança, autoridade, sofisticação
- **Feminino empoderado**: Autoestima, transformação, liberdade

### O que FAZER
- Usar fundo escuro (#020202) como base
- Gold (#D1A84B) apenas para destaques e marca
- Playfair Display para headlines, Inter para body
- Fotografias com iluminação low-key
- Espaçamento generoso entre elementos
- Texto uppercase com tracking amplo para labels

### O que NÃO FAZER
- Fundos brancos ou claros (a marca é dark mode)
- Mais de 2 cores de destaque por peça
- Fontes decorativas ou script fora das logos
- Imagens com saturação alta ou filtros coloridos
- Texto em gold sobre fundos claros (quebra contraste)
- Usar o gold como background extenso (é cor de accent)

---

*Documentado por @ux-design-expert (Uma) · Synkra AIOS*
*Fonte: fascinating-dodol-3149ef.netlify.app + logos fornecidos*
