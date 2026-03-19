# Task: ux-page-transitions

## Purpose
Implement premium page transition system in Next.js App Router. Webflow-quality between-page animations using Framer Motion.

## When to Use
- Landing page/site com múltiplas páginas e navegação interna
- Transições entre rotas que reforçam a identidade de marca
- Experiência cinematográfica premium (fade, slide, curtain)

## Stack
- **Framer Motion** `AnimatePresence` — React-native page transitions
- **Next.js App Router** — usando `layout.tsx` como wrapper
- **Variants** — estados de enter/exit definidos por tipo

## Execution Steps

### STEP 1: Elicit transition style (elicit: true)
```
Perguntar ao usuário:
1. Estilo de transição:
   [ ] Fade simples (suave, universal)
   [ ] Slide horizontal (moderno, direcional)
   [ ] Curtain/Wipe (premium, teatral)
   [ ] Overlay color (marca-forward)
   [ ] Scale + fade (Webflow-like)
2. Duração preferida?
   [ ] Rápida (0.3s) — não interrompe o usuário
   [ ] Média (0.5s) — equilíbrio
   [ ] Lenta (0.8s) — premium, impactante
3. Página tem scroll preservation entre rotas? (sim/não)
```

### STEP 2: Setup AnimatePresence no layout

```tsx
// app/template.tsx  ← IMPORTANTE: usar template.tsx, não layout.tsx
// template.tsx re-renderiza a cada mudança de rota
// layout.tsx persiste entre rotas (não faz transição)

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

const pageVariants = {
  // === OPÇÃO A: FADE ===
  fade: {
    initial:  { opacity: 0 },
    animate:  { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
    exit:     { opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
  },

  // === OPÇÃO B: SLIDE + FADE ===
  slide: {
    initial:  { opacity: 0, x: 20 },
    animate:  { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
    exit:     { opacity: 0, x: -20, transition: { duration: 0.3, ease: 'easeIn' } },
  },

  // === OPÇÃO C: SCALE + FADE (Webflow-like) ===
  scale: {
    initial:  { opacity: 0, scale: 0.97 },
    animate:  { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
    exit:     { opacity: 0, scale: 1.02, transition: { duration: 0.3, ease: 'easeIn' } },
  },
}

// Escolher variant conforme Step 1:
const TRANSITION_STYLE = 'scale'

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const variant = pageVariants[TRANSITION_STYLE]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={variant.initial}
        animate={variant.animate}
        exit={variant.exit}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

### STEP 3: Curtain/Wipe transition (premium)

```tsx
// components/page-transition/curtain.tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const curtainVariants = {
  enter: {
    scaleY: [0, 1, 1],
    transition: { duration: 0.6, times: [0, 0.5, 1], ease: 'easeInOut' }
  },
  exit: {
    scaleY: [1, 1, 0],
    transition: { duration: 0.6, times: [0, 0.5, 1], ease: 'easeInOut' }
  }
}

export function CurtainTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isAnimating, setIsAnimating] = useState(false)

  return (
    <>
      {/* Curtain overlay */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            className="fixed inset-0 z-50 bg-neutral-900 origin-top"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            exit={{ scaleY: 0 }}
            transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
          />
        )}
      </AnimatePresence>

      {/* Page content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.3, duration: 0.4 } }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  )
}
```

### STEP 4: Scroll to top on route change

```tsx
// app/template.tsx — adicionar scroll reset
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0)
    // Se usar Lenis:
    // lenisInstance?.scrollTo(0, { immediate: true })
  }, [pathname])

  // ... resto do template
}
```

### STEP 5: Navigation link com prefetch + loading state

```tsx
// components/atoms/nav-link.tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

export function NavLink({ href, children, className }: NavLinkProps) {
  return (
    <Link href={href} className={`relative group ${className}`}>
      <span>{children}</span>
      {/* Underline animation */}
      <motion.span
        className="absolute bottom-0 left-0 h-px bg-current"
        initial={{ scaleX: 0, originX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      />
    </Link>
  )
}
```

## Output
- `app/template.tsx` — wrapper de transição (método correto para App Router)
- Variant escolhido configurado com timing premium
- Scroll-to-top automático
- Acessibilidade: `prefers-reduced-motion` respeitado

## Notas Críticas
- **NUNCA usar `layout.tsx`** para transições — use `template.tsx`
- `mode="wait"` no AnimatePresence é obrigatório (aguarda exit antes de enter)
- Transição muito longa (>0.8s) frustra usuários que clicam em links — máximo 0.6s
- Testar em mobile: transitions custosas causam jank em dispositivos lentos
