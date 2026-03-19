# Syra Digital — Design System v2.0
> Inspirado por Tyvo/AthoStudio · Dark · Bold · Preciso

---

## Filosofia

O design system da Syra é baseado em três pilares:
- **Dark-first:** Background ultra-escuro, alto contraste
- **Bold & Precise:** Tipografia forte, espaçamento intencional
- **Lime Accent:** Verde-lima neon como marca registrada (inspirado em Tyvo #BCFF02)

---

## 1. Color Tokens

### Backgrounds
```
--bg-base:       #080808   ← Page background (quase preto)
--bg-surface:    #101013   ← Cards, sidebar, panels
--bg-elevated:   #18181d   ← Hover states, popovers
--bg-overlay:    #1e1e24   ← Modals, dropdowns
```

### Borders
```
--border-faint:  #141417   ← Separadores sutis
--border-subtle: #1e1e23   ← Bordas padrão
--border-base:   #27272d   ← Bordas visíveis
--border-strong: #35353c   ← Bordas de ênfase
```

### Text
```
--text-primary:   #F0F0F5  ← Texto principal (branco suave)
--text-secondary: #8F8FA0  ← Texto secundário
--text-muted:     #505060  ← Labels, placeholders
--text-disabled:  #36363f  ← Desabilitado
```

### Brand Accent — Lime (Tyvo-inspired)
```
--accent:         #C8FF00        ← Cor primária Syra
--accent-hover:   #D8FF40        ← Hover do accent
--accent-dim:     rgba(200,255,0, 0.08)   ← Background sutil
--accent-mid:     rgba(200,255,0, 0.15)   ← Background médio
--accent-glow:    rgba(200,255,0, 0.22)   ← Glow effect
--accent-border:  rgba(200,255,0, 0.28)   ← Border com accent
```

### Semantic Colors
```
--success:       #22C55E   / --success-bg:  rgba(34,197,94, 0.10)
--warning:       #F59E0B   / --warning-bg:  rgba(245,158,11, 0.10)
--danger:        #EF4444   / --danger-bg:   rgba(239,68,68, 0.10)
--info:          #3B82F6   / --info-bg:     rgba(59,130,246, 0.10)
```

---

## 2. Typography

### Font Families
```
--font-display: 'Space Grotesk'    ← Headlines, logo, card names (peso 500–800)
--font-body:    'Inter'            ← UI, body text, labels (peso 400–700)
--font-mono:    'JetBrains Mono'   ← Portas, IDs, código, latência
```

**Google Fonts URL:**
```
https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap
```

### Type Scale
```
--text-2xs:  0.625rem   / 10px   ← Uppercase labels, badges tiny
--text-xs:   0.6875rem  / 11px   ← Captions, port numbers
--text-sm:   0.75rem    / 12px   ← Secondary labels, nav labels
--text-base: 0.875rem   / 14px   ← Body text padrão, nav names
--text-md:   1rem       / 16px   ← Texto maior, card names
--text-lg:   1.125rem   / 18px   ← Subtítulos
--text-xl:   1.375rem   / 22px   ← Títulos de seção
--text-2xl:  1.75rem    / 28px   ← Page titles
--text-3xl:  2.25rem    / 36px   ← Hero headings
```

### Font Weights
```
400 → Regular   (body text)
500 → Medium    (labels, navigation)
600 → Semibold  (nav names, buttons)
700 → Bold      (card names, page titles)
800 → Black     (logo, hero)
```

### Letter Spacing
```
Display/Logo:   -0.04em  (tracking tight)
Page titles:    -0.03em
Card names:     -0.02em
Body:            0em
Labels:         +0.05–0.10em
UPPERCASE tags: +0.10–0.15em
```

---

## 3. Spacing (base 4px)

```
--sp-1:  4px    ← Micro gaps
--sp-2:  8px    ← Tight spacing
--sp-3:  12px   ← Compact
--sp-4:  16px   ← Default padding
--sp-5:  20px   ← Comfortable
--sp-6:  24px   ← Section padding
--sp-8:  32px   ← Large gaps
--sp-10: 40px   ← Section breaks
--sp-12: 48px   ← Large sections
--sp-16: 64px   ← Hero spacing
```

---

## 4. Border Radius

```
--r-xs:   3px      ← Badges, tags inline
--r-sm:   6px      ← Buttons small, inputs
--r-md:   8px      ← Buttons, nav items
--r-lg:   12px     ← Cards, panels
--r-xl:   16px     ← Large cards, modals
--r-2xl:  24px     ← Feature blocks
--r-full: 9999px   ← Pills, circular
```

---

## 5. Shadows

```
--shadow-xs: 0 1px 2px rgba(0,0,0,0.4)
--shadow-sm: 0 2px 6px rgba(0,0,0,0.5)
--shadow-md: 0 4px 14px rgba(0,0,0,0.6)
--shadow-lg: 0 8px 28px rgba(0,0,0,0.7)
--shadow-glow:
  0 0 0 1px rgba(200,255,0, 0.28),
  0 0 20px rgba(200,255,0, 0.22),
  0 0 40px rgba(200,255,0, 0.08)
```

---

## 6. Transitions

```
--ease-fast:   120ms cubic-bezier(0.4, 0, 0.2, 1)   ← Hover states rápidos
--ease-base:   200ms cubic-bezier(0.4, 0, 0.2, 1)   ← Transições padrão
--ease-slow:   360ms cubic-bezier(0.4, 0, 0.2, 1)   ← Animações maiores
--ease-spring: 400ms cubic-bezier(0.34, 1.56, 0.64, 1)  ← Spring (bounce sutil)
```

---

## 7. Layout

```
--sidebar-w: 232px   ← Largura da sidebar
--header-h:  46px    ← Altura do topbar de serviço
```

---

## 8. Component Patterns

### Sidebar
- Background: `--bg-surface`
- Borda direita: `--border-faint`
- Sem scrollbar visível (`scrollbar-width: none`)
- Logo: Space Grotesk 800, `S` em accent lime
- Nav item ativo: background `--accent-dim`, borda esquerda 2px `--accent`
- Status dots: 6px círculo colorido (success/warning/disabled)

### Cards de Serviço
- Background: `--bg-surface`
- Border: `--border-subtle`
- Hover online: border `--accent-border` + `--shadow-glow`
- Status chip: uppercase, `--text-2xs`, pill shape
- Footer: separador `--border-faint`, porta em monospace
- Animação entrada: `fadeIn` staggered 55ms entre cards

### Buttons
- **Primary:** bg `--accent`, text `#080808` (preto), font-weight 600
- **Ghost:** border `--border-base`, text `--text-secondary`, hover `--bg-elevated`
- **Danger:** border `--danger-bg`, text `--danger`, hover `--danger-bg`

### Status Chips/Badges
```
online:   bg --success-bg,  text --success   (#22C55E)
degraded: bg --warning-bg,  text --warning   (#F59E0B)
offline:  bg rgba dim,      text --text-disabled
checking: bg --bg-elevated, text --text-disabled
```

---

## 9. Animations

### cardIn (entrada de cards)
```css
@keyframes cardIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
```
Stagger: 55ms por card, delay baseado em nth-child

### pulseDot (indicador de sistema ativo)
```css
@keyframes pulseDot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
```
Duration: 2.4s ease-in-out infinite

### spin (loading spinner)
```css
@keyframes spin { to { transform: rotate(360deg); } }
```
Duration: 0.65s linear infinite · border-top-color: `--accent`

---

## 10. Responsive

| Breakpoint | Comportamento |
|------------|--------------|
| > 1200px   | Grid 3–4 colunas |
| 768–1200px | Grid 2–3 colunas |
| < 768px    | Sidebar oculta (TODO) |

Grid: `repeat(auto-fill, minmax(200px, 1fr))` com `gap: --sp-4`

---

## 11. Aplicação

### Arquivos que usam este design system:
- `meu-projeto/syra-hub.js` — Hub central (inline CSS)
- `meu-projeto/adtag-master-main/src/index.css` — AdTag (Tailwind tokens)
- `meu-projeto/public/monitor.html` — Nico Monitor (inline CSS)

### Próximos passos:
- [ ] Criar `syra-tokens.css` compartilhado para todos os dashboards
- [ ] Atualizar Nico Monitor para usar os novos tokens
- [ ] Criar componente Button, Card, Badge como Web Components reutilizáveis

---

*Syra Digital Design System v2.0 · Criado por Uma (@ux-design-expert) · 2026-03-05*
