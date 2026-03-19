# Task: ux-premium-page-spec

## Purpose
Generate a complete R$50k-quality landing page specification for Next.js. Covers visual direction, animation choreography, typography, components needed, and performance targets.

## When to Use
- Inicio de projeto premium de alto impacto
- Cliente de alto ticket que precisa de diferencial visual
- Página de vendas, landing page ou site institucional de serviço premium

## Execution Steps

### STEP 1: Deep brief (elicit: true)
```
Perguntar ao usuário:

1. CLIENTE / PROJETO:
   - Quem é o cliente? (especialidade, posicionamento)
   - Qual o objetivo da página? (converter leads, vender produto, institucional)
   - Ticket médio do cliente (produto/serviço que a página vende)?

2. AUDIÊNCIA:
   - Quem vai acessar? (demographics, dores, nível de sofisticação)
   - Dispositivo primário? (mobile vs desktop-first)

3. REFERÊNCIAS VISUAIS:
   - Tem referências de sites que admira?
   - Paleta de cores existente? (ou criar)
   - Tipografia existente? (ou criar)

4. CONTEÚDO DISPONÍVEL:
   - Tem copy pronto? (ou Uma cria o briefing de copy)
   - Tem fotos/videos profissionais? (ou usar stock)
   - Tem logo/brand assets?

5. TECNOLOGIA:
   - Next.js App Router (padrão)
   - TypeScript? (sim/não)
   - CMS? (Contentful, Sanity, Payload, sem CMS)
   - Deploy: Vercel? (padrão)
```

### STEP 2: Generate full page specification

Gerar documento completo com:

```markdown
# Especificação: {nome-projeto} Landing Page
**Data:** {data}
**Ticket:** R${valor}
**Objetivo:** {conversão/institucional/venda}

---

## 1. DIRETRIZ VISUAL

### Estilo
{luxury-medical | tech-premium | editorial | corporate-premium}

### Paleta de Cores
| Token | Hex | Uso |
|-------|-----|-----|
| --color-primary | #XXXXXX | CTAs, destaques |
| --color-secondary | #XXXXXX | Elementos de apoio |
| --color-neutral-900 | #XXXXXX | Texto principal |
| --color-neutral-100 | #XXXXXX | Backgrounds |
| --color-accent | #XXXXXX | Microdetalhes |

### Tipografia
| Família | Peso | Uso |
|---------|------|-----|
| {Display Font} | 300–800 (variable) | Headlines |
| {Body Font} | 400, 500 | Corpo, UI |

---

## 2. ESTRUTURA DA PÁGINA (Sections)

### Section 1: HERO
- **Objetivo:** Impacto imediato, clareza do valor
- **Layout:** Full viewport height, dividido 50/50 ou full-bleed
- **Animação entrada:** Timeline GSAP — eyebrow → h1 → subline → CTA (stagger 0.3s)
- **Tipografia:** Hero font-size: clamp(3.5rem, 2rem + 7.5vw, 8rem)
- **Componentes:** HeroSection, TextReveal, Button (magnetic), HeroMedia

### Section 2: SOCIAL PROOF / CREDIBILIDADE
- **Objetivo:** Reduzir objeção imediata
- **Layout:** Logos carousel ou metrics grid
- **Animação:** CountUp nos números ao entrar no viewport
- **Componentes:** LogoCloud, StatCard, CountUp

### Section 3: PROBLEMA / TRANSFORMAÇÃO
- **Objetivo:** Resonância emocional com a dor do cliente
- **Layout:** Split screen (antes/depois) ou narrative scroll
- **Animação:** Scroll-pinned storytelling (ScrollTrigger pin)
- **Componentes:** ProblemStatement, TransformationVisual

### Section 4: SOLUÇÃO / SERVIÇOS
- **Objetivo:** Mostrar capacidade e diferencial
- **Layout:** Cards em grid 3-col
- **Animação:** Stagger reveal dos cards (0.1s entre cada)
- **Componentes:** ServiceCard (hover elevação), FeatureList

### Section 5: PROVA SOCIAL
- **Objetivo:** Validação por pares
- **Layout:** Testimonials carousel ou grid
- **Animação:** Lenis smooth scroll lateral no mobile
- **Componentes:** TestimonialCard, StarRating, Avatar

### Section 6: CTA PRINCIPAL
- **Objetivo:** Converter
- **Layout:** Full-width, fundo escuro, copy direto
- **Animação:** Scale-in CTA button ao entrar
- **Componentes:** Button (magnetic + shimmer), FormEmbed ou CalendlyWidget

### Section 7: FAQ
- **Objetivo:** Remover objeções finais
- **Layout:** Accordion
- **Animação:** Height animate no open/close (Framer Motion layout)
- **Componentes:** Accordion, AccordionItem

### Section 8: FOOTER
- **Layout:** Logo + links + social + legal
- **Sem animações** (apenas transições de hover)

---

## 3. ANIMATION CHOREOGRAPHY

### Timing Global
| Fase | Delay | Duração |
|------|-------|---------|
| Above fold | immediate | 0.6-1.2s |
| First scroll | 0ms | 0.7-0.9s |
| Subsequent | 0ms | 0.5-0.7s |

### Scroll Triggers
- **Threshold:** `top 80%` (elementos entram antes de chegarem à viewport center)
- **Exit animations:** NUNCA — elementos ficam visíveis após entrar
- **Stagger padrão:** 0.06-0.1s entre siblings

### Motion Library Allocation
| Uso | Biblioteca |
|-----|-----------|
| Scroll animations | GSAP ScrollTrigger |
| Hover/micro | Framer Motion |
| Text reveals | SplitType + GSAP |
| Page transitions | Framer Motion AnimatePresence |
| Smooth scroll | Lenis |

---

## 4. COMPONENTES NECESSÁRIOS

### Atoms (base)
- [ ] Button (primary, outline, ghost) — magnetic + shimmer
- [ ] TextReveal (chars, words, lines)
- [ ] CountUp (números animados)
- [ ] Reveal (fade+y wrapper genérico)
- [ ] ParallaxImage
- [ ] Tag/Badge

### Molecules
- [ ] ServiceCard (icon + title + desc + hover)
- [ ] TestimonialCard (avatar + quote + name)
- [ ] StatCard (número + label + ícone)
- [ ] AccordionItem (FAQ)
- [ ] NavLink (underline animado)

### Organisms
- [ ] HeroSection (timeline entrada)
- [ ] LogoCloud (carousel ou grid)
- [ ] TestimonialsGrid/Carousel
- [ ] CTASection (full-width dark)

---

## 5. PERFORMANCE TARGETS

| Métrica | Target |
|---------|--------|
| LCP | < 2.5s |
| CLS | < 0.1 |
| FID | < 100ms |
| Core Web Vitals | All green |
| Bundle JS (gzipped) | < 200KB |
| GSAP chunk | Tree-shake — só importar o que usa |

### Estratégias
- `next/image` em todas as imagens (lazy + WebP automático)
- Fontes via `next/font` (sem FOUT)
- GSAP + ScrollTrigger em `use client` components isolados
- Lenis como provider global (RAF otimizado)
- `will-change: transform` apenas durante animação ativa

---

## 6. SEO / META

```tsx
// app/page.tsx
export const metadata = {
  title: '{título cliente} — {proposta valor 1 linha}',
  description: '{meta desc 155 chars, inclui keyword principal}',
  openGraph: {
    title: '{og:title}',
    description: '{og:desc}',
    image: '/og-image.jpg', // 1200x630
  },
}
```

---

## 7. CHECKLIST DE LAUNCH

- [ ] Core Web Vitals verde no PageSpeed
- [ ] prefers-reduced-motion testado
- [ ] Tested no iPhone SE (viewport 375px)
- [ ] Tested no iPhone 15 Pro (viewport 393px)
- [ ] Tested 1440px desktop
- [ ] Schema markup (LocalBusiness ou Service)
- [ ] GTM configurado
- [ ] Pixel Meta/Google Ads instalado
```

## Output
Documento completo de especificação com:
- Diretriz visual (cores + tipografia)
- Estrutura de sections com objetivos
- Choreography de animações
- Lista de componentes atômicos
- Performance targets
- Checklist de launch
