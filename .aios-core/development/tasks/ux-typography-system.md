# Task: ux-typography-system

## Purpose
Build a premium variable font system + SplitType text reveal animations. Webflow-quality typography for Next.js projects de alto padrão.

## When to Use
- Projeto precisa de tipografia animada (headlines que revelam letra por letra, linha por linha)
- Sistema de escala tipográfica fluido (sem breakpoints fixos)
- Variable fonts com animação de peso/largura via CSS

## Stack
- **Variable Fonts** — animate font-weight, font-width, optical sizing
- **SplitType** — split text into chars/words/lines for animation
- **GSAP** — stagger animations com easing premium
- **CSS Custom Properties** — fluid typography via clamp()

## Execution Steps

### STEP 1: Elicit typography direction (elicit: true)
```
Perguntar ao usuário:
1. Fontes em uso (ou escolher agora)?
   [ ] Já tenho (quais?)
   [ ] Quero sugestões para o projeto
2. Estilo visual do projeto?
   [ ] Luxury/premium (serif + sans)
   [ ] Tech/moderno (geometric sans)
   [ ] Editorial (display serif)
   [ ] Clínico/profissional (humanist sans)
3. Animações de texto necessárias?
   [ ] Headline reveal (char by char)
   [ ] Line reveal (linha por linha, mais sutil)
   [ ] Word stagger
   [ ] Typing effect (mais comercial)
   [ ] Count-up numbers
4. Tamanho base do projeto (viewport)?
   [ ] Desktop-first (1440px base)
   [ ] Mobile-first (375px base)
```

### STEP 2: Install SplitType
```bash
npm install split-type
# TypeScript types:
npm install --save-dev @types/split-type 2>/dev/null || true
```

### STEP 3: Generate fluid typography scale

```css
/* styles/typography.css */

/* Fluid scale: nenhum breakpoint, clamp() puro */
:root {
  --font-size-xs:   clamp(0.75rem,  0.7rem + 0.25vw,   0.875rem);
  --font-size-sm:   clamp(0.875rem, 0.8rem + 0.375vw,  1rem);
  --font-size-base: clamp(1rem,     0.925rem + 0.375vw, 1.125rem);
  --font-size-lg:   clamp(1.125rem, 1rem + 0.625vw,     1.375rem);
  --font-size-xl:   clamp(1.25rem,  1.1rem + 0.75vw,    1.75rem);
  --font-size-2xl:  clamp(1.5rem,   1.25rem + 1.25vw,   2.25rem);
  --font-size-3xl:  clamp(1.875rem, 1.5rem + 1.875vw,   3rem);
  --font-size-4xl:  clamp(2.25rem,  1.75rem + 2.5vw,    4rem);
  --font-size-5xl:  clamp(3rem,     2rem + 5vw,          6rem);
  --font-size-hero: clamp(3.5rem,   2rem + 7.5vw,        8rem);

  /* Line heights */
  --leading-tight:  1.1;
  --leading-snug:   1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose:  2;

  /* Letter spacing */
  --tracking-tight:   -0.025em;
  --tracking-normal:  0em;
  --tracking-wide:    0.025em;
  --tracking-wider:   0.05em;
  --tracking-widest:  0.1em;
}
```

### STEP 4: Variable font integration (example: Inter Variable)

```tsx
// app/layout.tsx
import localFont from 'next/font/local'
// OU via Google (se disponível como variable):
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  // Variable font axes:
  // weight: '100 900' (automático se variable)
})

// Para fonte local variable:
const displayFont = localFont({
  src: '../public/fonts/YourFont-Variable.woff2',
  variable: '--font-display',
  display: 'swap',
})
```

```css
/* styles/globals.css */
/* Usar variáveis para animar via CSS */
.font-variable-demo {
  font-variation-settings:
    'wght' var(--font-weight, 400),
    'wdth' var(--font-width, 100),
    'opsz' var(--font-optical, 14);
  transition: font-variation-settings 0.3s ease;
}

/* Hover: peso aumenta */
.font-variable-demo:hover {
  --font-weight: 700;
  --font-optical: 32;
}
```

### STEP 5: SplitType + GSAP text reveal hook

```tsx
// hooks/use-text-reveal.ts
'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SplitType from 'split-type'

gsap.registerPlugin(ScrollTrigger)

type SplitMode = 'chars' | 'words' | 'lines'

interface TextRevealOptions {
  mode?: SplitMode
  stagger?: number
  duration?: number
  delay?: number
  y?: number
  rotateX?: number
  trigger?: 'scroll' | 'immediate'
  start?: string
}

export function useTextReveal<T extends HTMLElement>(
  options: TextRevealOptions = {}
) {
  const ref = useRef<T>(null)

  const {
    mode = 'lines',
    stagger = 0.06,
    duration = 0.8,
    delay = 0,
    y = 60,
    rotateX = 0,
    trigger = 'scroll',
    start = 'top 80%',
  } = options

  useEffect(() => {
    if (!ref.current) return

    // Check reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const split = new SplitType(ref.current, { types: mode })
    const elements = split[mode] || []

    const ctx = gsap.context(() => {
      const tween = gsap.from(elements, {
        opacity: 0,
        y,
        rotateX,
        duration,
        delay,
        stagger,
        ease: 'power3.out',
        ...(trigger === 'scroll' && {
          scrollTrigger: {
            trigger: ref.current,
            start,
            toggleActions: 'play none none none',
          },
        }),
      })
    })

    return () => {
      ctx.revert()
      split.revert()
    }
  }, [])

  return ref
}
```

### STEP 6: Text reveal components

```tsx
// components/atoms/text-reveal.tsx
'use client'

import { useTextReveal } from '@/hooks/use-text-reveal'

interface TextRevealProps {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'
  mode?: 'chars' | 'words' | 'lines'
  stagger?: number
  children: React.ReactNode
  className?: string
  delay?: number
}

export function TextReveal({
  as: Tag = 'h2',
  mode = 'lines',
  stagger,
  children,
  className,
  delay = 0,
}: TextRevealProps) {
  const ref = useTextReveal<HTMLHeadingElement>({ mode, stagger, delay })

  return (
    <Tag
      ref={ref}
      className={className}
      style={{ overflow: 'hidden' }} // evita flash de texto não-splitado
    >
      {children}
    </Tag>
  )
}
```

```tsx
// components/atoms/count-up.tsx — números animados
'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

interface CountUpProps {
  end: number
  prefix?: string
  suffix?: string
  duration?: number
  decimals?: number
  className?: string
}

export function CountUp({ end, prefix = '', suffix = '', duration = 2, decimals = 0, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const ctx = gsap.context(() => {
      gsap.from({ value: 0 }, {
        value: end,
        duration,
        ease: 'power2.out',
        onUpdate() {
          if (ref.current) {
            ref.current.textContent = `${prefix}${this.targets()[0].value.toFixed(decimals)}${suffix}`
          }
        },
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      })
    })
    return () => ctx.revert()
  }, [end])

  return <span ref={ref} className={className}>{prefix}0{suffix}</span>
}
```

### STEP 7: Tailwind typography tokens

```js
// tailwind.config.ts — adicionar escala fluida
import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      fontSize: {
        'xs':   ['var(--font-size-xs)',   { lineHeight: 'var(--leading-normal)' }],
        'sm':   ['var(--font-size-sm)',   { lineHeight: 'var(--leading-normal)' }],
        'base': ['var(--font-size-base)', { lineHeight: 'var(--leading-relaxed)' }],
        'lg':   ['var(--font-size-lg)',   { lineHeight: 'var(--leading-snug)' }],
        'xl':   ['var(--font-size-xl)',   { lineHeight: 'var(--leading-snug)' }],
        '2xl':  ['var(--font-size-2xl)',  { lineHeight: 'var(--leading-tight)' }],
        '3xl':  ['var(--font-size-3xl)',  { lineHeight: 'var(--leading-tight)' }],
        '4xl':  ['var(--font-size-4xl)',  { lineHeight: 'var(--leading-tight)' }],
        '5xl':  ['var(--font-size-5xl)',  { lineHeight: '1' }],
        'hero': ['var(--font-size-hero)', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      letterSpacing: {
        tight:   'var(--tracking-tight)',
        normal:  'var(--tracking-normal)',
        wide:    'var(--tracking-wide)',
        wider:   'var(--tracking-wider)',
        widest:  'var(--tracking-widest)',
      },
    },
  },
}
```

## Output
- `styles/typography.css` — Fluid scale com CSS custom properties
- `hooks/use-text-reveal.ts` — Hook SplitType + GSAP
- `components/atoms/text-reveal.tsx` — Componente de reveal
- `components/atoms/count-up.tsx` — Números animados
- Configuração Tailwind tipográfica
- Instruções de variable fonts no Next.js

## Font Pairing Recommendations (High-End)

| Estilo | Display | Body | Provider |
|--------|---------|------|----------|
| Luxury Médico | Playfair Display (variable) | Inter | Google |
| Premium Tech | Neue Haas Grotesk | Neue Haas Grotesk | Adobe/Local |
| Editorial | DM Serif Display | DM Sans | Google |
| Clínico Premium | Cormorant (variable) | Instrument Sans | Google |
| Moderno Sofisticado | Cabinet Grotesk | Satoshi | Fontshare |
