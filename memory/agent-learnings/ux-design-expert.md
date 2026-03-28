# Aprendizados — @ux-design-expert (Uma)

## [2026-03-19] Projeto: Landing page de captura — Dr. Ênio Leite

### Stack Aprovada para Páginas de Captura Premium (HTML estático)

- **Fonts:** Playfair Display (headlines/display) + DM Sans (body) — pairing aprovado para estética médica premium
- **Animações:** GSAP 3.12.5 + ScrollTrigger + Lenis 1.1.18 (smooth scroll)
- **Deploy:** Vercel (static, sem framework) com `vercel.json` roteando `/` para `/pagina-captura.html`
- **Stack completa aprovada pelo Eric** — pode ser reutilizada para outros clientes médicos

### Design Tokens Aprovados (estética médica luxo)

```css
--gold:     #C08B51
--cream:    #F7F4EF
--cream-dk: #EDE8DF
--parch:    #E8E0D2
--ink:      #15120D
--ink-lt:   #3D3630
--mid:      #82796E
```

### Padrões de Componentes Aprovados

**Before/After Slider (fixes críticos):**
- `user-select: none` e `-webkit-user-select: none` no `.ba-container`
- `pointer-events: none` e `-webkit-user-drag: none` nas `img` dentro do slider
- `e.preventDefault()` no `mousedown` do handle E do container
- Listener `selectstart` no container com `e.preventDefault()`
- Sem esses fixes: ao arrastar o slider, o browser seleciona texto (pisca azul)

**YouTube Facade Pattern:**
- Mostrar thumbnail com play button; ao clicar, injetar iframe com autoplay
- Params obrigatórios para limpar controles: `controls=0&rel=0&playsinline=1&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1`
- Iframe com `position:absolute;inset:0;width:100%;height:100%;border:none`

**Avatar Stack social proof:**
- Usar `randomuser.me/api/portraits/women/{id}.jpg` para fotos realistas de avaliação
- `object-fit: cover` na img dentro do avatar

**Favicon:**
```html
<link rel="icon" type="image/png" href="logo-monograma.png">
```

### Auditoria de Gramática — Regra
- Sempre auditar página completa de clientes antes de entregar
- Português tem muitos acentos que o AI omite: você, Toxina Botulínica, Colágeno, Sustentação, Rinomodelação, Harmonização, Cirurgião, lábios, expressão, versão, própria, começa, aparência
- Usar `replace_all: true` no Edit tool para correções sistemáticas

### Fotos Before/After — Protocolo para Clientes Médicos
- Fotos do cliente ficam em `docs/clientes/{slug}/fotos-procedimentos/`
- Para selecionar pares: usar EXIF timestamp — fotos tiradas em 2s de diferença = mesmo ângulo; gap 10-30 min = possível antes/depois do mesmo dia
- Enquanto não tem pares reais: usar foto demo do cliente com `replace_all: true` em todos os sliders
- Fotos `.poster.JPG` do Photos Library ficam em `scopes/cloudsharing/data/{albumID}/{sessionID}/`
- ImageMagick: usar Python subprocess para criar grades de visualização (montage tem bug de font no macOS)

### Express 5 Gotcha
- `app.post('*')` não funciona no Express 5 — usar `app.use()` em vez disso

---

## [2026-03-27] Feedback: Não tentar substituir ferramenta recomendada com código

- **Contexto:** Eric pediu logos para JurisTrack. Recomendei Freepik/Looka como caminho certo, mas mesmo assim tentei gerar via SVG.
- **Feedback:** "se eu tinha feito essa recomendação antes pq vc ainda tentou gerar pelo svg?"
- **Regra derivada:** Quando recomendar uma ferramenta externa como melhor opção para uma tarefa (logo, imagem, ilustração), NÃO tentar fazer a mesma coisa via código. Seguir a própria recomendação. Código SVG não substitui ferramenta de design para logos profissionais.
- **Severidade:** HIGH

---

## Severidade das Regras
- **Before/after slider sem user-select:** CRITICAL (problema visual óbvio ao usar)
- **Stack de animações aprovada:** HIGH (usar sempre para páginas premium)
- **Auditoria de gramática:** HIGH (sempre fazer antes de entregar)
