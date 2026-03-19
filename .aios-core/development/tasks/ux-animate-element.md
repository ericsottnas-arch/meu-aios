# Task: ux-animate-element

## Purpose
Generate a complete GSAP or Framer Motion animation for a specific element/section. From hover micro-interactions to complex scroll-driven sequences.

## When to Use
- Precisa animar um elemento específico (botão, card, hero, imagem)
- Criando micro-interações premium (hover, focus, tap)
- Animação de entrada de seção
- Parallax de elemento individual

## Execution Steps

### STEP 1: Elicit element and animation type (elicit: true)
```
Perguntar ao usuário:
1. Qual elemento/componente animar?
   (ex: hero headline, CTA button, card grid, imagem de serviço, pricing card)
2. Tipo de animação:
   [ ] Entrada na página (page load)
   [ ] Entrada no scroll (scroll trigger)
   [ ] Hover / micro-interaction
   [ ] Click / tap feedback
   [ ] Parallax (movimento ao scrollar)
   [ ] Morph / transform complexo
3. Referência visual (se tiver):
   (link ou descrição do efeito desejado)
4. Biblioteca preferida:
   [ ] GSAP (mais controle, melhor performance)
   [ ] Framer Motion (mais fácil em React, ótimo para layout animations)
   [ ] CSS puro (simples, sem dependência)
```

### STEP 2: Generate animation based on type

**HERO ENTRANCE (page load) — GSAP**
```tsx
// components/sections/hero.tsx
'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.from('.hero-eyebrow', { opacity: 0, y: 20, duration: 0.6 })
        .from('.hero-headline', { opacity: 0, y: 40, duration: 0.8 }, '-=0.3')
        .from('.hero-subline', { opacity: 0, y: 30, duration: 0.7 }, '-=0.4')
        .from('.hero-cta', { opacity: 0, y: 20, scale: 0.95, duration: 0.6 }, '-=0.3')
        .from('.hero-media', { opacity: 0, scale: 0.98, duration: 1.2 }, '-=0.8')
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={containerRef} className="min-h-screen flex items-center">
      <span className="hero-eyebrow">Especialidade</span>
      <h1 className="hero-headline">Headline principal</h1>
      <p className="hero-subline">Subtítulo de apoio</p>
      <button className="hero-cta">CTA Principal</button>
      <div className="hero-media">{/* imagem/video */}</div>
    </section>
  )
}
```

**CARD HOVER — CSS + Framer Motion**
```tsx
// components/molecules/service-card.tsx
'use client'

import { motion } from 'framer-motion'

const cardVariants = {
  initial: { y: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  hover: {
    y: -8,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
  }
}

const iconVariants = {
  initial: { scale: 1, rotate: 0 },
  hover: {
    scale: 1.1,
    rotate: 5,
    transition: { duration: 0.3, ease: 'backOut' }
  }
}

interface ServiceCardProps {
  title: string
  description: string
  icon: React.ReactNode
}

export function ServiceCard({ title, description, icon }: ServiceCardProps) {
  return (
    <motion.article
      variants={cardVariants}
      initial="initial"
      whileHover="hover"
      className="p-8 rounded-2xl bg-white border border-neutral-100 cursor-pointer"
    >
      <motion.div variants={iconVariants} className="w-12 h-12 mb-6">
        {icon}
      </motion.div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-neutral-600 leading-relaxed">{description}</p>
    </motion.article>
  )
}
```

**CTA BUTTON — Micro-interaction premium**
```tsx
// components/atoms/button.tsx
'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'outline'
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  return (
    <motion.button
      onClick={onClick}
      onTapStart={() => setIsPressed(true)}
      onTap={() => setIsPressed(false)}
      onTapCancel={() => setIsPressed(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      className={`
        relative px-8 py-4 rounded-full font-medium overflow-hidden
        ${variant === 'primary'
          ? 'bg-neutral-900 text-white'
          : 'border-2 border-neutral-900 text-neutral-900'
        }
      `}
    >
      {/* Shimmer effect no hover */}
      <motion.span
        className="absolute inset-0 bg-white/10"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}
```

**IMAGE PARALLAX — GSAP ScrollTrigger**
```tsx
// components/atoms/parallax-image.tsx
'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Image from 'next/image'

gsap.registerPlugin(ScrollTrigger)

interface ParallaxImageProps {
  src: string
  alt: string
  speed?: number // 0.1 = sutil, 0.5 = intenso
  className?: string
}

export function ParallaxImage({ src, alt, speed = 0.2, className }: ParallaxImageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!wrapperRef.current || !imageRef.current) return

    const ctx = gsap.context(() => {
      gsap.to(imageRef.current, {
        yPercent: -speed * 100,
        ease: 'none',
        scrollTrigger: {
          trigger: wrapperRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      })
    })

    return () => ctx.revert()
  }, [speed])

  return (
    <div ref={wrapperRef} className={`overflow-hidden ${className}`}>
      <div ref={imageRef} className="scale-125 h-full w-full">
        <Image src={src} alt={alt} fill className="object-cover" />
      </div>
    </div>
  )
}
```

**MAGNETIC BUTTON — Efeito cursor magnético**
```tsx
// components/atoms/magnetic-button.tsx
'use client'

import { useRef, useState } from 'react'
import { motion, useSpring } from 'framer-motion'

export function MagneticButton({ children, className }: { children: React.ReactNode, className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useSpring(0, { stiffness: 150, damping: 15 })
  const y = useSpring(0, { stiffness: 150, damping: 15 })

  function handleMouseMove(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set((e.clientX - centerX) * 0.3)
    y.set((e.clientY - centerY) * 0.3)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  )
}
```

## Output
Gera o componente específico para o elemento solicitado com:
- Código TypeScript completo
- Accessibility (prefers-reduced-motion)
- Cleanup correto (ctx.revert, useEffect cleanup)
- Comentários explicando as decisões de timing/easing

## Easing Cheatsheet (Premium)

| Efeito | Easing | Duração |
|--------|--------|---------|
| Entrada suave | `power3.out` | 0.7-1s |
| Snap rápido | `back.out(1.7)` | 0.4s |
| Elástico | `elastic.out(1, 0.5)` | 1-1.5s |
| Custom Webflow | `[0.25, 0.1, 0.25, 1]` | 0.3-0.5s |
| Reveal texto | `power4.out` | 0.6-0.9s |
| Hover | `[0.25, 0.1, 0.25, 1]` | 0.15-0.25s |
