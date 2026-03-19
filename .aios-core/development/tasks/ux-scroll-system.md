# Task: ux-scroll-system

## Purpose
Setup Lenis smooth scroll + GSAP ScrollTrigger integration for premium Next.js projects. Webflow-quality scroll experience.

## When to Use
- Projeto Next.js que precisa de scroll suave premium (equivalente Webflow)
- Animações ativadas por scroll (fade, parallax, pinning, scrubbing)
- Performance de 60fps garantida em mobile e desktop

## Stack
- **Lenis** — smooth scroll RAF-synced (substitui scroll nativo)
- **GSAP ScrollTrigger** — animações trigger by scroll position
- **Integration bridge** — sincroniza Lenis RAF com ScrollTrigger

## Execution Steps

### STEP 1: Elicit project context (elicit: true)
```
Perguntar ao usuário:
1. Framework: Next.js App Router ou Pages Router?
2. Tem TypeScript? (sim/não)
3. Já tem GSAP instalado?
4. Qual tipo de scroll animations precisa?
   [ ] Fade/reveal elements on scroll
   [ ] Parallax (elementos em velocidades diferentes)
   [ ] Pin sections (sticky scroll storytelling)
   [ ] Horizontal scroll
   [ ] Progress bar/indicator
   [ ] Text reveal (linha por linha)
```

### STEP 2: Install dependencies
```bash
npm install lenis gsap @gsap/react
```

### STEP 3: Generate Lenis provider (Next.js App Router)

```tsx
// app/providers/lenis-provider.tsx
'use client'

import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    })
    lenisRef.current = lenis

    // Sync Lenis RAF with GSAP ticker — CRITICAL for ScrollTrigger to work
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000)
    })
    gsap.ticker.lagSmoothing(0)

    // Update ScrollTrigger on each scroll
    lenis.on('scroll', ScrollTrigger.update)

    return () => {
      gsap.ticker.remove((time) => lenis.raf(time * 1000))
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
```

```tsx
// app/layout.tsx — adicionar provider
import { LenisProvider } from './providers/lenis-provider'

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <LenisProvider>
          {children}
        </LenisProvider>
      </body>
    </html>
  )
}
```

### STEP 4: Generate ScrollTrigger hook

```tsx
// hooks/use-scroll-animation.ts
'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface ScrollAnimationOptions {
  animation: gsap.TweenVars
  trigger?: gsap.DOMTarget
  start?: string
  end?: string
  scrub?: boolean | number
  pin?: boolean
  markers?: boolean
}

export function useScrollAnimation<T extends HTMLElement>(
  options: ScrollAnimationOptions
) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!ref.current) return

    const ctx = gsap.context(() => {
      gsap.from(ref.current!, {
        ...options.animation,
        scrollTrigger: {
          trigger: options.trigger || ref.current,
          start: options.start || 'top 80%',
          end: options.end || 'top 20%',
          scrub: options.scrub ?? false,
          pin: options.pin ?? false,
          markers: options.markers ?? false,
        },
      })
    })

    return () => ctx.revert()
  }, [])

  return ref
}
```

### STEP 5: Generate fade-in preset (most common)

```tsx
// components/atoms/reveal.tsx
'use client'

import { useScrollAnimation } from '@/hooks/use-scroll-animation'

interface RevealProps {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
}

export function Reveal({ children, delay = 0, y = 40, className }: RevealProps) {
  const ref = useScrollAnimation<HTMLDivElement>({
    animation: {
      opacity: 0,
      y,
      duration: 0.8,
      delay,
      ease: 'power3.out',
    },
    start: 'top 85%',
  })

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
```

### STEP 6: Accessibility — prefers-reduced-motion

```tsx
// hooks/use-reduced-motion.ts
import { useEffect, useState } from 'react'

export function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mq.matches)
    mq.addEventListener('change', (e) => setPrefersReduced(e.matches))
  }, [])

  return prefersReduced
}
```

```tsx
// No provider Lenis — respeitar preferência
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const lenis = new Lenis({
  duration: prefersReduced ? 0 : 1.2,
  // ...
})
```

## Output
- `app/providers/lenis-provider.tsx` — Provider completo com GSAP sync
- `hooks/use-scroll-animation.ts` — Hook reutilizável
- `hooks/use-reduced-motion.ts` — Acessibilidade
- `components/atoms/reveal.tsx` — Componente Reveal atômico
- Instruções de integração no layout

## Common Patterns (Reference)

| Efeito | Config ScrollTrigger |
|--------|---------------------|
| Fade on scroll | `start: 'top 85%', scrub: false` |
| Parallax | `scrub: true, start: 'top bottom', end: 'bottom top'` |
| Pin section | `pin: true, start: 'top top', end: '+=100%'` |
| Progress bar | `scrub: true, start: 'top top', end: 'bottom bottom'` |
| Stagger cards | `stagger: 0.1` no `gsap.from()` |

## Performance Rules
- NUNCA usar `will-change` fora de animações ativas (adicionar na play, remover na complete)
- SEMPRE usar `gsap.context()` + `.revert()` para cleanup
- Transforms only — never animate `top`, `left`, `width`, `height`
- `opacity` + `transform` são as únicas props GPU-accelerated
