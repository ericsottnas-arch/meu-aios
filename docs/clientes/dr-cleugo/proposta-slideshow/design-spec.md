# Design Spec — Proposta Slideshow: Eric Santos + Dr. Cleugo Porto
> Por: @designer (Luna) · Versão 3.0 (final — 3 itens corrigidos)
> Para: @dev (implementação)
> Correcoes aplicadas: tipografia hierarquica completa, icones slide a slide, separadores e layout, paleta sem placeholder

---

## DECISAO PENDENTE — ERIC ESCOLHE A PALETA

### Opcao A: Identidade Syra Digital (Lime #C8FF00)

Tom: Syra apresenta proposta ao Dr. Cleugo. Identidade da casa.

```css
/* === COPIAR ESTE BLOCO COMPLETO PARA index.css SE OPCAO A === */
:root {
  --accent:               #C8FF00;
  --accent-hover:         #b8ee00;
  --accent-dim:           rgba(200, 255, 0, 0.08);
  --accent-mid:           rgba(200, 255, 0, 0.15);
  --accent-glow:          rgba(200, 255, 0, 0.20);
  --accent-border:        rgba(200, 255, 0, 0.25);
  --accent-border-subtle: rgba(200, 255, 0, 0.12);
  --text-accent:          #C8FF00;
  --nav-dot-active:       #C8FF00;
  --nav-dot-visited:      rgba(200, 255, 0, 0.35);
  --shadow-accent:        0 0 0 1px rgba(200,255,0,0.25), 0 0 20px rgba(200,255,0,0.12);

  --bg-base:      #080808;
  --bg-surface:   #101010;
  --bg-elevated:  #181818;
  --bg-overlay:   #1e1e1e;
  --text-primary:   #F0F0F5;
  --text-secondary: #AEAEBB;
  --text-muted:     #606070;
  --border-faint:  #141417;
  --border-subtle: #1e1e23;
  --border-base:   #27272d;
  --nav-bg:          rgba(8, 8, 8, 0.85);
  --nav-dot-inactive: rgba(240, 240, 245, 0.20);
  --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.60);
  --ease-fast:  120ms cubic-bezier(0.4, 0, 0.2, 1);
  --ease-base:  200ms cubic-bezier(0.4, 0, 0.2, 1);
  --ease-slide: 380ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --r-xs: 3px; --r-sm: 6px; --r-md: 8px;
  --r-lg: 12px; --r-xl: 16px; --r-full: 9999px;
}
```

---

### Opcao B: Identidade Dr. Cleugo Porto (Gold #D1A84B)

Tom: Proposta fala a lingua do parceiro desde o slide 1. Ele se ve ali.
Fonte: `docs/clientes/dr-cleugo/design-system.md` (tokens oficiais do site dele)

```css
/* === COPIAR ESTE BLOCO COMPLETO PARA index.css SE OPCAO B === */
:root {
  --accent:               #D1A84B;
  --accent-hover:         #be9540;
  --accent-dim:           rgba(209, 168, 75, 0.08);
  --accent-mid:           rgba(209, 168, 75, 0.15);
  --accent-glow:          rgba(209, 168, 75, 0.20);
  --accent-border:        rgba(209, 168, 75, 0.25);
  --accent-border-subtle: rgba(209, 168, 75, 0.12);
  --text-accent:          #D1A84B;
  --nav-dot-active:       #D1A84B;
  --nav-dot-visited:      rgba(209, 168, 75, 0.35);
  --shadow-accent:        0 0 0 1px rgba(209,168,75,0.25), 0 0 20px rgba(209,168,75,0.12);

  --bg-base:      #020202;   /* fundo oficial do site do Cleugo */
  --bg-surface:   #060606;
  --bg-elevated:  #0f0f0f;
  --bg-overlay:   #1a1a1a;
  --text-primary:   #EEEEEE;
  --text-secondary: #CECECE;
  --text-muted:     #8F8F8F;
  --border-faint:  #0e0e0e;
  --border-subtle: #1e1a10;   /* tom escuro dourado (do --border: #2D1F01 do site) */
  --border-base:   #2D1F01;
  --nav-bg:          rgba(2, 2, 2, 0.85);
  --nav-dot-inactive: rgba(238, 238, 238, 0.20);
  --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.70);
  --ease-fast:  120ms cubic-bezier(0.4, 0, 0.2, 1);
  --ease-base:  200ms cubic-bezier(0.4, 0, 0.2, 1);
  --ease-slide: 380ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --r-xs: 3px; --r-sm: 6px; --r-md: 8px;
  --r-lg: 12px; --r-xl: 16px; --r-full: 9999px;
}
```

> Eric escolhe A ou B. @dev cola o bloco correspondente como CSS base. Sem placeholder.

---

### Decisao pendente: Nome da Segunda Frente

| Fonte | Nome usado |
|-------|-----------|
| Briefing do @pm | "Mentoria" |
| Documento de inteligencia da reuniao | "Academia (Cursos para Medicos)" |
| @sales-director | "Academia para Medicos" |
| @copy-chef | "Academia para Medicos" |

Tres fontes convergem em "Academia". Uma fonte diz "Mentoria".
Eric confirma qual e o nome correto antes do @dev fixar no HTML.

---

---

## 2. Tipografia — Hierarquia Completa

### 2.0 Sistema de Hierarquia — 4 Niveis

Tabela de referencia para o @dev. Cada nivel tem valores completos e prontos para implementar.

| Nivel | Elemento | font-family | font-weight | font-size (clamp) | line-height | color token | letter-spacing |
|-------|----------|-------------|-------------|-------------------|-------------|-------------|----------------|
| **Titulo** (h1) | Slide title principal | Space Grotesk | 700 | `clamp(22px, 4vw, 34px)` | 1.2 | `--text-primary` | `-0.03em` |
| **Subtitulo** (h2) | Slide label / section label | Inter | 500 | `clamp(10px, 1.4vw, 12px)` | 1.3 | `--text-accent` | `0.18em` (uppercase) |
| **Corpo** (p) | Bullets, paragrafos, bullets de timeline | Inter | 400 | `clamp(15px, 2.2vw, 18px)` | 1.6 | `--text-secondary` | `0` |
| **Destaque** (label/badge) | Card header (FRENTE 1), table header, periodo de timeline | Inter | 600 | `clamp(11px, 1.5vw, 13px)` | 1.3 | `--text-accent` | `0.10em` (uppercase) |

**Casos especiais (fora da hierarquia principal):**

| Caso | font-family | font-weight | font-size | color |
|------|-------------|-------------|-----------|-------|
| Numero gigante (Slide 4) | JetBrains Mono | 500 | `clamp(40px, 8vw, 80px)` | `--text-accent` |
| Quote (Playfair) | Playfair Display | 700 italic | `clamp(16px, 2.5vw, 22px)` | `--text-primary` |
| Slide number (01, 02...) | JetBrains Mono | 500 | `11px` | `--text-muted` |
| Numero em stat-card (8%, 15-20%) | Space Grotesk | 800 | `clamp(36px, 5vw, 48px)` | `--text-accent` |
| Atribuicao de quote | Inter | 500 uppercase | `12px` | `--text-accent` |

### 2.1 Familias

| Papel | Família | Racional |
|-------|---------|----------|
| Display / Slide Title | Space Grotesk | Bold, autoridade, impacto nos numeros |
| Serif / Quote | Playfair Display | Elegancia clinica — citacoes do Cleugo |
| Body / Labels | Inter | Clareza UI, leitura rapida |
| Mono / Numeros financeiros | JetBrains Mono | Valores em R$, metricas |

### Google Fonts URL

```
https://fonts.googleapis.com/css2?
  family=Space+Grotesk:wght@500;600;700;800&
  family=Playfair+Display:ital,wght@0,700;1,700;1,900&
  family=Inter:wght@400;500;600&
  family=JetBrains+Mono:wght@500&
  display=swap
```

### Escala por Elemento

```css
/* Slide title (h2 de cada slide) */
.slide-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(22px, 4vw, 34px);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  line-height: 1.2;
}

/* Numero gigante (Slide 4 — impacto maximo) */
.number-giant {
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(40px, 8vw, 80px);
  font-weight: 500;
  letter-spacing: -0.04em;
  color: var(--text-accent);
  line-height: 1;
}

/* Label de numero (HOJE / CAPACIDADE REAL) */
.number-label {
  font-family: 'Inter', sans-serif;
  font-size: clamp(10px, 1.5vw, 12px);
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

/* Sub-numero (8 a 12 procedimentos) */
.number-sub {
  font-family: 'Inter', sans-serif;
  font-size: clamp(14px, 2vw, 18px);
  font-weight: 400;
  color: var(--text-secondary);
}

/* Bullet item */
.bullet-item {
  font-family: 'Inter', sans-serif;
  font-size: clamp(15px, 2.2vw, 18px);
  font-weight: 400;
  color: var(--text-secondary);
  line-height: 1.6;
}

.bullet-item strong {
  color: var(--text-primary);
  font-weight: 600;
}

/* Quote text */
.quote-text {
  font-family: 'Playfair Display', serif;
  font-style: italic;
  font-size: clamp(16px, 2.5vw, 22px);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.5;
}

/* Quote attribution */
.quote-author {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-accent);
}

/* Section label (acima do titulo) */
.slide-label {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-accent);
}

/* Slide number (canto superior esq) */
.slide-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

/* Rodape de impacto (ex: "Mesmo ticket. Mesmo medico.") */
.impact-footer {
  font-family: 'Inter', sans-serif;
  font-size: clamp(13px, 1.8vw, 16px);
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

/* Card header (Frente 1 / Frente 2) */
.card-header {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(13px, 1.8vw, 16px);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-accent);
}

/* Timeline period label */
.timeline-period {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--text-muted);
}

/* Tabela header */
.table-header {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* Checklist item confirmado */
.checklist-done {
  font-family: 'Inter', sans-serif;
  font-size: clamp(14px, 2vw, 16px);
  font-weight: 500;
  color: var(--text-secondary);
}

/* Placeholder de data [data] */
.date-placeholder {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  background: var(--accent-dim);
  border: 1px solid var(--accent-border-subtle);
  border-radius: var(--r-xs);
  padding: 1px 6px;
  color: var(--text-accent);
}
```

---

## 3. Componentes

### 3.1 Slide Card (container base)

```css
.slide-card {
  background: var(--bg-base);
  max-width: 960px;
  width: 100%;
  min-height: 80dvh;
  padding: 48px 64px 96px;
  margin: 0 auto;
  position: relative;
}

@media (max-width: 768px) {
  .slide-card {
    padding: 32px 24px 80px;
  }
}
```

### 3.2 Separador de Titulo

```css
.title-divider {
  width: 100%;
  height: 1px;
  background: var(--border-subtle);
  margin: 20px 0 32px;
  position: relative;
}

.title-divider--accent::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 48px;
  height: 1px;
  background: var(--accent);
}
```

### 3.3 Quote Block

```css
/* Versao compacta — Template B */
.quote-block {
  border-left: 3px solid var(--accent-glow);
  background: var(--bg-elevated);
  padding: 16px 24px;
  border-radius: 0 var(--r-md) var(--r-md) 0;
  margin-top: 24px;
}

/* Versao destaque — Template G (Slide 9) */
.quote-block--large {
  border: 1px solid var(--accent-border);
  background: var(--bg-elevated);
  padding: 24px 32px;
  border-radius: var(--r-lg);
  margin-top: 32px;
  position: relative;
}

.quote-block--large::before {
  content: '"';
  font-family: 'Playfair Display', serif;
  font-size: 80px;
  line-height: 0.6;
  color: var(--accent-border);
  position: absolute;
  top: 24px;
  left: 24px;
}
```

### 3.4 Bullet Customizado

```css
.bullet-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bullet-list li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-family: 'Inter', sans-serif;
  font-size: clamp(15px, 2.2vw, 18px);
  color: var(--text-secondary);
  line-height: 1.6;
}

.bullet-list li::before {
  content: '';
  flex-shrink: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  margin-top: 9px;
}
```

### 3.5 Stat Card — Dados de Porcentagem (NOVO — CORE DA PROPOSTA)

Usado no Slide 6 para exibir os modelos de remuneração (8% e 15-20%).
Estes números são o core da proposta de valor e precisam de destaque visual máximo.

```
┌─────────────────────┐
│                     │
│        8%           │  ← stat-number
│                     │
│  do crescimento     │  ← stat-label-primary
│  acima da base      │  ← stat-label-secondary
│                     │
└─────────────────────┘
```

```css
.stat-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background: var(--bg-surface);
  border: 1px solid var(--accent-border-subtle);
  border-radius: var(--r-lg);      /* 12px */
  padding: 20px 24px;
  min-width: 140px;
  width: fit-content;
  gap: 6px;
}

.stat-card:hover {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-accent);
  transition: var(--ease-base);
}

/* O numero principal (8% / 15-20%) */
.stat-number {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(36px, 5vw, 48px);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text-accent);
  line-height: 1;
}

/* Label primario (ex: "do crescimento") */
.stat-label-primary {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* Label secundario (ex: "acima da base") */
.stat-label-secondary {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
  line-height: 1.4;
}
```

#### Variante de faixa (15-20%)

Para valores em faixa, usar o mesmo componente com formatação de range:

```css
/* Numero com faixa: "15-20%" */
.stat-number--range {
  font-size: clamp(28px, 4vw, 40px); /* ligeiramente menor para caber */
  letter-spacing: -0.02em;
}
```

#### HTML dos dois stat cards no Slide 6

```html
<!-- Dentro do frente-card Frente 1 -->
<div class="stat-card">
  <span class="stat-number">8%</span>
  <span class="stat-label-primary">do crescimento</span>
  <span class="stat-label-secondary">acima da base</span>
</div>

<!-- Dentro do frente-card Frente 2 -->
<div class="stat-card">
  <span class="stat-number stat-number--range">15-20%</span>
  <span class="stat-label-primary">das vendas</span>
  <span class="stat-label-secondary">geradas pela estrutura</span>
</div>
```

#### Layout no Slide 6 (frente cards com stat cards integrados)

```
┌──────────────────────────┐  ┌──────────────────────────┐
│ [icone]                  │  │ [icone]                  │
│ FRENTE 1                 │  │ FRENTE 2                 │
│ Operacao Clinica         │  │ Academia para Medicos    │
│                          │  │                          │
│ Base: R$360k/mes         │  │ Ticket: R$85k/medico     │
│ Tudo acima: dividido     │  │ Vendas geradas pela      │
│                          │  │ nossa estrutura          │
│ ┌──────────────────┐     │  │ ┌──────────────────┐    │
│ │ 8%               │     │  │ │ 15-20%           │    │
│ │ do crescimento   │     │  │ │ das vendas       │    │
│ │ acima da base    │     │  │ │ geradas pela...  │    │
│ └──────────────────┘     │  │ └──────────────────┘    │
│                          │  │                          │
│ Zero crescimento =       │  │ Inclui SDR + funil       │
│ zero % nosso             │  │ de captacao              │
└──────────────────────────┘  └──────────────────────────┘
```

### 3.6 Card de Frente (Template D — Dois Blocos)

```css
.frente-card {
  flex: 1;
  background: var(--bg-surface);
  border: 1px solid var(--accent-border-subtle);
  border-radius: var(--r-lg);
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.frente-card:hover {
  border-color: var(--accent-border);
  box-shadow: var(--shadow-accent);
  transition: var(--ease-base);
}
```

### 3.7 Icones — Mapeamento Slide a Slide

Biblioteca: **Lucide Icons** (SVG inline, `stroke-width="1.5"`, `stroke-linecap="round"`, `stroke-linejoin="round"`)
CDN: `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js` + `lucide.createIcons()`
Tamanho padrao: `width="20" height="20"` (w-5 h-5), cor: `var(--accent)`

#### Slide 6 — Frente 1: Operacao Clinica

| Elemento no slide | Icone Lucide | Racional |
|-------------------|-------------|----------|
| Header da frente-card | `stethoscope` | Identificacao medica imediata |
| Bullet "Base R$360k/mes" | `trending-up` | Crescimento financeiro |
| Bullet "CRM + atendimento" | `layout-dashboard` | Estrutura operacional |
| Bullet "Zero crescimento = zero %" | `shield-check` | Garantia, risco zero |
| Bullet "SDR via WhatsApp" | `message-circle` | Comunicacao direta |

#### Slide 6 — Frente 2: Academia para Medicos

| Elemento no slide | Icone Lucide | Racional |
|-------------------|-------------|----------|
| Header da frente-card | `graduation-cap` | Educacao medica |
| Bullet "Ticket R$85k/medico" | `banknote` | Valor do produto |
| Bullet "Funil de captacao" | `funnel` | Pipeline de vendas |
| Bullet "SDR para o curso" | `phone-call` | Prospeccao ativa |
| Bullet "Posicionamento Dream Incision" | `star` | Marca/autoridade |

#### Demais slides — icones pontuais

| Slide | Contexto | Icone Lucide | Posicao |
|-------|----------|-------------|---------|
| Slide 7 (Timeline) | Ponto de cada periodo | `circle` (filled via CSS) | Marcador da linha do tempo |
| Slide 8 (Tabela) | Header "O que nao funciona" | `x-circle` | Canto da th, `var(--text-muted)` |
| Slide 8 (Tabela) | Header "O que a Syra faz" | `check-circle` | Canto da th, `var(--accent)` |
| Slide 10 (Checklist) | Item confirmado | `check` | Antes do texto, `var(--accent)` |
| Slide 10 (Checklist) | Item pendente/agendado | `circle` | Antes do texto, `var(--text-muted)` |
| Slide 1 (Abertura) | Separador entre nomes | Nenhum — usar `·` tipografico | Centro |
| Nav bar | Botao prev | `chevron-left` | 16x16 |
| Nav bar | Botao next | `chevron-right` | 16x16 |

#### CSS do wrapper de icone (frente-cards)

```css
.card-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--accent-dim);
  border: 1px solid var(--accent-border-subtle);
  border-radius: var(--r-md);
  margin-bottom: 12px;
}

/* Icone dentro do wrapper */
.card-icon-wrap svg {
  color: var(--accent);
  width: 18px;
  height: 18px;
}

/* Icone de bullet em listas (sem wrapper) */
.inline-icon {
  display: inline-flex;
  align-items: center;
  color: var(--accent);
  flex-shrink: 0;
  margin-top: 2px;
}
```

### 3.8 Bloco de Numeros Gigantes (Template C — Slide 4)

```css
.number-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 32px;
}

.number-block--hoje {
  opacity: 0.70;  /* passado — suavizado */
}

.number-block--potencial .number-giant {
  color: var(--accent);
}

.number-divider-vertical {
  width: 1px;
  background: var(--border-subtle);
  align-self: stretch;
  margin: 16px 0;
}

@media (max-width: 768px) {
  .number-divider-vertical { display: none; }
  .number-divider-horizontal {
    display: block;
    width: 100%;
    height: 1px;
    background: var(--border-subtle);
    margin: 24px 0;
  }
}
```

### 3.9 Timeline (Template E — Slide 7)

```css
/* Desktop: horizontal */
.timeline {
  display: flex;
  align-items: flex-start;
  position: relative;
  padding-top: 24px;
}

.timeline::before {
  content: '';
  position: absolute;
  top: 6px; left: 6px; right: 6px;
  height: 1px;
  background: var(--border-subtle);
}

.timeline-item { flex: 1; position: relative; }

.timeline-item::before {
  content: '';
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--bg-base);
  position: absolute;
  top: 0; left: 0;
  transform: translateY(-5px);
}

.timeline-content { padding: 24px 16px 0 0; }

@media (max-width: 768px) {
  .timeline {
    flex-direction: column;
    padding-top: 0;
    padding-left: 24px;
  }
  .timeline::before {
    top: 6px; bottom: 6px;
    left: 6px; right: auto;
    width: 1px; height: auto;
  }
  .timeline-item::before { left: -24px; top: 4px; transform: none; }
  .timeline-content { padding: 0 0 28px; }
}
```

### 3.10 Tabela Comparativa (Template F — Slide 8)

```css
.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Inter', sans-serif;
}

.comparison-table thead tr { border-bottom: 1px solid var(--border-base); }

.comparison-table th {
  padding: 12px 16px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  text-align: left;
}

.comparison-table th:first-child { color: var(--text-muted); }
.comparison-table th:last-child  { color: var(--text-accent); }

.comparison-table td {
  padding: 14px 16px;
  font-size: clamp(13px, 1.8vw, 15px);
  line-height: 1.5;
  border-bottom: 1px solid var(--border-faint);
  vertical-align: top;
}

.comparison-table td:first-child { color: var(--text-muted); }
.comparison-table td:last-child  { color: var(--text-secondary); }

@media (max-width: 768px) {
  .comparison-table td,
  .comparison-table th { padding: 10px; font-size: 13px; }
}
```

### 3.11 Checklist (Template H — Slide 10)

```css
.checklist {
  list-style: none;
  padding: 0; margin: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.checklist-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-family: 'Inter', sans-serif;
  font-size: clamp(15px, 2vw, 17px);
  line-height: 1.5;
}

.checklist-item--done  .check-icon { color: var(--accent); font-size: 14px; flex-shrink: 0; margin-top: 2px; }
.checklist-item--done  .item-text  { color: var(--text-secondary); }
.checklist-item--pending .check-icon { color: var(--text-muted); font-size: 14px; flex-shrink: 0; margin-top: 2px; }
.checklist-item--pending .item-text  { color: var(--text-muted); }
```

---

## 4. Separadores, Espacamento e Grid Base

### 4.1 Componente Separador (Divisor entre titulo e conteudo)

O separador padrao e uma `<hr>` estilizada com acento opcional.
Usado em todos os slides exceto Slide 1 (Abertura).

```css
/* Separador padrao — linha fina entre titulo e corpo */
.slide-divider {
  border: none;
  border-top: 1px solid var(--border-subtle);  /* #1e1e23 */
  margin: 16px 0 28px;
  width: 100%;
}

/* Variante com acento — linha curta colorida a esquerda */
.slide-divider--accent {
  position: relative;
  border-top: 1px solid var(--border-subtle);
  margin: 16px 0 28px;
}

.slide-divider--accent::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 0;
  width: 40px;
  height: 2px;
  background: var(--accent);
  border-radius: 1px;
}
```

**Quando usar cada variante:**

| Slide | Variante | Racional |
|-------|----------|----------|
| Slides 2, 3, 5, 9 (bullets + quote) | `slide-divider--accent` | Slides de conteudo principal |
| Slides 4 (impacto), 6 (dois blocos) | `slide-divider` | Visual mais limpo |
| Slides 7, 8, 10 | `slide-divider--accent` | Acento guia o olho |
| Slide 1 (abertura) | Sem divisor — usar `.opening-divider` | Abertura tem tratamento proprio |

### 4.2 Espacamento entre Blocos

Distancias verticais fixas para consistencia entre slides.

| Contexto | Espaco | CSS |
|----------|--------|-----|
| Slide number ate slide title | 24px | `margin-bottom: 24px` no `.slide-number` |
| Slide title ate separador | 12px | `margin-bottom: 12px` no `.slide-title` |
| Separador ate primeiro elemento | 28px | `margin-bottom: 28px` no `.slide-divider` |
| Entre bullets da lista | 14px | `gap: 14px` no `.bullet-list` |
| Entre grupos de bullets | 24px | `margin-top: 24px` no segundo grupo |
| Lista de bullets ate quote block | 24px | `margin-top: 24px` no `.quote-block` |
| Quote block ate proximo elemento | 0 (e o ultimo em todos os templates B) | -- |
| Ultimo elemento ate nav bar | 80px | `padding-bottom: 80px` no `.slide-card` |
| Entre frente-cards (Slide 6) | 20px | `gap: 20px` no container flex |
| Entre periodos de timeline (desktop) | flex: 1 (dividido igualmente) | `.timeline-item { flex: 1 }` |
| Entre linhas da tabela | 0 (bordas separam) | `border-bottom: 1px solid var(--border-faint)` |
| Entre items do checklist (Slide 10) | 16px | `gap: 16px` no `.checklist` |

### 4.3 Grid Base dos Slides

Todos os slides seguem o mesmo grid. O @ux-design-expert ja definiu o viewport e nav bar.
Esta section adiciona o sistema de colunas interno aos slides.

```css
/* Container do conteudo do slide */
.slide-content {
  display: grid;
  grid-template-columns: 1fr;   /* mobile: coluna unica */
  gap: 0;
  width: 100%;
}

/* Slide 6 — Template D: dois blocos lado a lado */
.slide-content--two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}

/* Slide 4 — Template C: dois blocos numericos */
.slide-content--impact {
  display: flex;
  align-items: stretch;
  gap: 0;
  min-height: 220px;
}

/* Breakpoints */
@media (max-width: 768px) {
  .slide-content--two-col {
    grid-template-columns: 1fr;  /* empilha no mobile */
    gap: 16px;
  }

  .slide-content--impact {
    flex-direction: column;
  }
}
```

**Anatomia do slide (wireframe de espacamento):**

```
[slide-card: padding 48px 64px (desk) / 32px 24px (mobile)]
  │
  ├── .slide-number              ← 11px mono, muted
  │     margin-bottom: 24px
  ├── .slide-label (opcional)    ← 11px inter uppercase, accent
  │     margin-bottom: 8px
  ├── .slide-title               ← h2, clamp(22px..34px)
  │     margin-bottom: 12px
  ├── .slide-divider[--accent]   ← hr, margin 0 0 28px
  │
  └── .slide-content             ← area do template (A-H)
        padding-bottom: 80px     ← espaco para nav bar
```

---

## 5. Abertura — Slide 1 (Template A)

```css
.opening-divider {
  width: 60px;
  height: 1px;
  background: var(--accent);
  margin: 24px auto;
  opacity: 0.60;
}

.opening-names {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  flex-wrap: wrap;
}

.opening-name {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(14px, 2.5vw, 20px);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-primary);
}

.opening-names-sep {
  font-family: 'Playfair Display', serif;
  font-size: 24px;
  color: var(--accent);
  font-style: italic;
  line-height: 1;
}

.opening-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(28px, 6vw, 56px);
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--text-primary);
  text-align: center;
  line-height: 1.1;
  margin-top: 32px;
}

.opening-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: clamp(14px, 2vw, 18px);
  font-weight: 400;
  color: var(--text-muted);
  text-align: center;
  letter-spacing: 0.05em;
  margin-top: 16px;
}
```

---

## 5. Nav Bar

```css
.nav-bar {
  position: fixed;
  bottom: 0; left: 0;
  width: 100%;
  height: 64px;
  background: var(--nav-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--border-faint);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 100;
}

.nav-btn {
  width: 36px; height: 36px;
  border: 1px solid var(--border-base);
  border-radius: var(--r-md);
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--ease-fast);
}

.nav-btn:hover { border-color: var(--accent-border); color: var(--text-accent); }
.nav-btn:disabled { opacity: 0.30; pointer-events: none; }

.nav-dots { display: flex; align-items: center; gap: 8px; }

.nav-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--nav-dot-inactive);
  border: none; cursor: pointer;
  transition: var(--ease-base);
  padding: 0;
}

.nav-dot--active  { width: 10px; height: 10px; background: var(--nav-dot-active); }
.nav-dot--visited { background: var(--nav-dot-visited); }

.nav-counter {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
  display: none;
}

@media (min-width: 1024px) {
  .nav-counter { display: block; }
}
```

---

## 6. Paleta Resumida — Referencia Rapida

Tokens que diferem entre as opcoes estao marcados com (*).

| Token | Opcao A (Syra Lime) | Opcao B (Cleugo Gold) | Uso |
|-------|---------------------|----------------------|-----|
| `--accent` (*) | `#C8FF00` | `#D1A84B` | CTAs, destaques, numeros, bordas ativas |
| `--bg-base` (*) | `#080808` | `#020202` (site oficial) | Fundo geral |
| `--bg-surface` (*) | `#101010` | `#060606` | Slide card, cards |
| `--bg-elevated` (*) | `#181818` | `#0f0f0f` | Quote blocks, hover |
| `--text-primary` (*) | `#F0F0F5` | `#EEEEEE` | Titulos, texto forte |
| `--text-secondary` (*) | `#AEAEBB` | `#CECECE` | Corpo, bullets |
| `--text-muted` (*) | `#606070` | `#8F8F8F` | Labels, metadata |
| `--border-subtle` (*) | `#1e1e23` | `#1e1a10` (tom dourado) | Separadores |
| `--border-base` (*) | `#27272d` | `#2D1F01` (oficial) | Bordas visiveis |

Os blocos CSS completos de cada opcao estao na Secao 1 (copiar e colar).

---

## 7. Slide 4 — Spec de Impacto Maximo

```
┌────────────────────────────────────────────┐
│ 04                                         │  ← slide-number
│                                            │
│ O que fica na mesa todo mes                │  ← slide-title
│ ────────────────────────────────────────  │  ← title-divider--accent
│                                            │
│  HOJE          │    CAPACIDADE REAL        │  ← number-label
│                │                          │
│  R$360k        │    R$2,76M               │  ← number-giant (JetBrains Mono)
│  /mes          │    /mes                  │  ← number-sub
│                │                          │
│  8-12 proc.    │    92 proc.              │  ← number-sub
│                                            │
│    Mesmo ticket. Mesmo medico.             │
│    Diferenca: estrutura.                   │  ← impact-footer (centralizado)
└────────────────────────────────────────────┘

Bloco HOJE: opacity 0.70 (passado, suavizado)
Bloco CAPACIDADE REAL: --accent em number-giant, destaque total
Divider vertical: --border-subtle, 1px
```

---

## 8. Notas para @dev

1. Fontes via Google Fonts (URL na Secao 2.1)
2. Lucide Icons via CDN `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js` + `lucide.createIcons()`
3. Paleta: copiar o bloco CSS da opcao escolhida pelo Eric (Secao 1) direto no `index.css`. Sem substituicao manual de placeholder — os valores ja estao prontos.
4. Aguardar confirmacao do Eric sobre nome da segunda frente (Academia vs Mentoria) antes de subir o HTML
5. Slide 4: `number-giant` usa JetBrains Mono (excecao pontual para valores financeiros)
6. Transicao de slides: spec do @ux-design-expert (380ms, cubic-bezier, horizontal slide)
7. `prefers-reduced-motion`: substituir translate por fade 200ms
8. Sem emoji em nenhum elemento de UI
9. Sem em-dash em nenhum texto renderizado
10. Background do `<html>` e `<body>`: usar o valor de `--bg-base` da opcao escolhida para evitar flash no load
11. Hierarquia tipografica: usar a tabela da Secao 2.0 como referencia — quatro niveis, valores prontos
12. Icones dos slides: mapeamento slide a slide na Secao 3.7 — nao improvisar icones fora da lista
13. Separadores: usar `.slide-divider` (hr estilizada) entre titulo e conteudo em todos os slides exceto Slide 1

---

*@designer (Luna) · cada pixel importa*
