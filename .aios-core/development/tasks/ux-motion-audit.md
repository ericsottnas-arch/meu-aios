# Task: ux-motion-audit

## Purpose
Audit existing animations for performance, smoothness, and accessibility. Identify jank, layout thrashing, missing reduced-motion support, and over-animation.

## When to Use
- Página existente com animações que causam jank ou são lentas no mobile
- Antes de launch: validar que animações não afetam Core Web Vitals
- Code review de animações de outro dev

## Execution Steps

### STEP 1: Gather context (elicit: true)
```
Perguntar ao usuário:
1. Qual arquivo/componente auditar?
2. Observando algum problema específico?
   [ ] Jank/frames pulados
   [ ] CLS alto (layout shift)
   [ ] Mobile lento
   [ ] Acessibilidade (reduced-motion)
   [ ] Animação não termina corretamente
   [ ] Memory leak (animations continuam após unmount)
```

### STEP 2: Read the code
Usar Read() para ler os arquivos apontados pelo usuário.

### STEP 3: Apply audit checklist

**PERFORMANCE:**
- [ ] Anima apenas `transform` e `opacity` (GPU-friendly)?
  - ❌ RUIM: animar `top`, `left`, `width`, `height`, `margin`, `padding`
  - ✅ BOM: animar `translateX`, `translateY`, `scale`, `opacity`

- [ ] `will-change` usado corretamente?
  - ❌ RUIM: `will-change: transform` em CSS estático (desperdiça memória)
  - ✅ BOM: adicionar via JS antes da animação, remover após

- [ ] GSAP: usa `gsap.context()` + `.revert()` no cleanup?
  - ❌ RUIM: animações sem cleanup (memory leak no SPA)

- [ ] Framer Motion: usa `useReducedMotion()` ou `m` (motion lite)?

- [ ] ScrollTrigger: usa `scrub: true` para parallax (não `onUpdate` manual)?

- [ ] Lenis: sincronizado com GSAP ticker (`gsap.ticker.add`)?

**ACESSIBILIDADE:**
- [ ] `prefers-reduced-motion` respeitado?
  ```css
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; }
  }
  ```
  ou via JS:
  ```js
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!prefersReduced) { /* animate */ }
  ```

- [ ] Animações de texto têm `overflow: hidden` no container?
  (evita flash de conteúdo não-splitado)

- [ ] SplitType: `.revert()` chamado no cleanup?

**CHOREOGRAPHY:**
- [ ] Above-fold carrega sem delay? (usuário não espera para ver conteúdo)
- [ ] Stagger muito lento? (>0.2s entre elementos parece quebrado)
- [ ] Animações de exit desnecessárias? (geralmente só enter é necessário)
- [ ] Duração muito longa? (>1s para UI animations frustra usuário)

**BUNDLE:**
- [ ] GSAP: importando só o que usa?
  ```js
  // ❌ RUIM (bundle completo):
  import gsap from 'gsap/all'
  // ✅ BOM (tree-shaking):
  import { gsap } from 'gsap'
  import { ScrollTrigger } from 'gsap/ScrollTrigger'
  ```

- [ ] Framer Motion: considera `motion` lite para componentes simples?
  ```js
  import { m } from 'framer-motion' // menor que motion
  ```

### STEP 4: Generate report

```markdown
## Relatório de Motion Audit
**Arquivo:** {arquivo}
**Data:** {data}

### Problemas Críticos (corrigir antes de launch)
- [ ] {problema} — {arquivo}:{linha} — Fix: {solução}

### Melhorias Recomendadas
- [ ] {melhoria}

### Boas Práticas Encontradas
- {o que está bem}

### Score
- Performance: {X}/10
- Acessibilidade: {X}/10
- Choreography: {X}/10
```

## Output
- Relatório de audit com problemas categorizados
- Code fixes inline para cada problema encontrado
- Score geral de qualidade de motion
