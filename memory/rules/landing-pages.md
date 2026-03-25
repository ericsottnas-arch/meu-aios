# Regras de Landing Pages / HTML

> Consultar ao construir ou editar qualquer pagina HTML, landing page ou componente visual.
> Ver tambem: [[universal]], [[clientes-medicos]] (se pagina medica)

---

## [HIGH] Stack aprovada para paginas de captura premium (HTML estatico)

Esta stack foi aprovada pelo Eric — usar para todos os clientes medicos:

- **Fonts:** Cormorant Garamond (headlines/display, wght 300-700) + DM Sans (body)
  - Google Fonts: `family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500`
  - CSS var: `--fd: 'Cormorant Garamond', Georgia, serif`
  - NUNCA Playfair Display — Cormorant e a fonte do design system do Dr. Enio Leite e padrao aprovado
  - Pesos: 300 para textos ghost/watermark, 400 para hero headline, 500-600 para h2 de secoes
- **Animacoes:** GSAP 3.12.5 + ScrollTrigger + Lenis 1.1.18 (smooth scroll)
- **Deploy:** Vercel (static, sem framework)
  - `vercel.json` com roteamento `/` → `/pagina-captura.html`
- **Favicon:** `<link rel="icon" type="image/png" href="logo-monograma.png">`

---

## [HIGH] Design Tokens aprovados — Estetica medica luxo

```css
--gold:     #C08B51
--cream:    #F7F4EF
--cream-dk: #EDE8DF
--parch:    #E8E0D2
--ink:      #15120D
--ink-lt:   #3D3630
--mid:      #82796E
```

Estes tokens foram aprovados pelo Eric. Usar como base para todos os clientes medicos premium.

---

## [HIGH] Mobile responsividade

- Hero: nao mostrar foto/imagem decorativa na versao mobile
  - Hero mobile = apenas headline, subhead, formulario, social proof
  - Fotos na hero ficam so no desktop
  - Implementar: `.hero-photo { display: none }` no breakpoint 900px
- Stat cards: usar `font-size: clamp()` para evitar overflow em telas pequenas
  - Ex: `.stat-number { font-size: clamp(1.25rem, 5vw, 1.75rem); word-break: break-word; }`
- Imagens decorativas de secao: ocultar no mobile se nao essenciais para conversao
- Breakpoints comuns: 900px (tablet), 560px (mobile pequeno)

---

## [CRITICAL] Before/After Slider — fixes obrigatorios

Sem esses fixes, ao arrastar o slider o browser seleciona texto (pisca azul):

- `user-select: none` E `-webkit-user-select: none` no `.ba-container`
- `pointer-events: none` E `-webkit-user-drag: none` nas `img` dentro do slider
- `e.preventDefault()` no `mousedown` do handle E do container
- Listener `selectstart` no container com `e.preventDefault()`

---

## [HIGH] YouTube Facade Pattern

- Mostrar thumbnail com play button; ao clicar, injetar iframe com autoplay
- Params obrigatorios:
  ```
  controls=0&rel=0&playsinline=1&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1
  ```
- Iframe: `position:absolute;inset:0;width:100%;height:100%;border:none`

---

## [HIGH] Social Proof — Avatar Stack

- Usar `randomuser.me/api/portraits/women/{id}.jpg` para fotos realistas de avaliacao
- `object-fit: cover` na img dentro do avatar

---

## [HIGH] Auditoria de gramatica antes de entregar

Sempre auditar pagina completa antes de entregar ao cliente.
Palavras com acentos que o AI frequentemente omite:
voce, Toxina Botulinica, Colageno, Sustentacao, Rinomodelacao, Harmonizacao, Cirurgiao, labios, expressao, versao, propria, comeca, aparencia

---

## [HIGH] Deploy Vercel

- Site estatico, sem framework
- Comando: `vercel --prod` a partir da pasta do cliente
- Arquivo `vercel.json` necessario para roteamento
- Estrutura padrao:
  ```json
  {
    "buildCommand": null,
    "outputDirectory": ".",
    "framework": null,
    "routes": [
      { "src": "/", "dest": "/pagina-captura.html" }
    ]
  }
  ```

---

## [HIGH] Fotos Before/After — Protocolo para clientes medicos

- Fotos ficam em `docs/clientes/{slug}/fotos-procedimentos/`
- Para selecionar pares: EXIF timestamp — fotos em 2s de diferenca = mesmo angulo; gap 10-30 min = possivel antes/depois
- Sem pares reais: usar foto demo com `replace_all: true` em todos os sliders
- ImageMagick: usar Python subprocess (montage tem bug de font no macOS)

---

## [MEDIUM] Testar responsividade com Playwright

Playwright esta instalado em `/meu-projeto/`:
```js
// Rodar de /Users/ericsantos/meu-aios/meu-projeto/
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
await page.goto('file:///caminho/para/pagina.html');
await page.screenshot({ path: '/tmp/mobile-test.png' });
```

---

## [HIGH] Quality Gate — obrigatorio antes de enviar LP ao Eric

Antes de enviar qualquer landing page, executar TODOS esses checks:

1. **Font correta**: Confirmar `Cormorant Garamond` no CSS var `--fd` (nao Playfair Display)
2. **Mobile 100%**: Screenshot em 390px — hero headline + form + social proof cabem no viewport sem scroll
3. **Hero viewport**: Headline, subhead, CTA e prova social visiveis no primeiro viewport sem scroll excessivo
4. **Gramatica**: Auditar todos os textos — acentos, pontuacao, html entities (&ldquo; &rdquo; &middot;)
5. **Fotos coluna**: Fotos que dividem layout com texto devem ter bordas decorativas gold
   - Padrao: `overflow: visible` + `::before` (inset: -20px, border: 1px solid rgba(192,139,81,.25)) + `::after` (inset: 16px, border: 1px solid rgba(192,139,81,.1))`
   - No mobile (<=900px): `overflow: hidden` + `::before, ::after { display: none }`
   - Img dentro da foto: `position: relative; z-index: 1`

---

Ultima atualizacao: 2026-03-19
