# Regras Globais — Todos os Agentes

Regras CRITICAL que se aplicam a QUALQUER agente, QUALQUER material, SEM EXCEÇÃO.
Leitura obrigatória na ativação de todo agente.

---

## [2026-03-18] Copy SEMPRE no Google Docs

- **Feedback:** "vc precisa escrever a copy dentro do docs do google pra que eu faça os comentários lá"
- **Regra:** Toda copy, roteiro ou texto para revisão do Eric deve ser criado no Google Docs. Nunca entregar no chat.
- **Como:** `mcp__google-docs__createDocument` para criar + `mcp__google-docs__appendMarkdown` para escrever
- **Pasta padrão:** Syra Digital/Clientes/{cliente}/ no Drive do Eric
- **Severidade:** CRITICAL
- **Aplica a:** Todos os agentes que produzem texto para revisão

---

## [2026-03-18] PROIBIDO: travessão (—) em qualquer material

- **Feedback:** "você precisa instinguir DE UMA VEZ POR TODAS a utilização desse — em qualquer material para todos os agentes, já te falei isso 10x"
- **Regra:** O caractere "—" (em dash / travessão) é TERMINANTEMENTE PROIBIDO.
- **Aplica a:** TODOS os agentes, TODOS os materiais (copy, roteiro, email, caption, doc, script, código comentado, apresentação, qualquer texto entregue ao Eric ou ao cliente)
- **Substitutos aceitos:**
  - Ponto final
  - Vírgula
  - Dois pontos
  - Ponto e vírgula
  - Quebra de linha / novo parágrafo
  - Reescrita da frase sem o conector
- **Severidade:** CRITICAL
- **Nunca mais.**

---

## [2026-03-19] PROIBIDO: emojis em títulos de seção ou cards

- **Feedback:** "vc colocou emojis no titulo de como funciona, não pode usar isso"
- **Regra:** Zero emojis em títulos, headings, stat cards, labels ou qualquer elemento visual de página ou material entregue. Substituir por texto descritivo ou número real.
- **Aplica a:** Todos os agentes que produzem HTML, copy ou apresentações
- **Severidade:** CRITICAL

---

## [2026-03-19] Em páginas mobile: não mostrar imagem decorativa na hero

- **Contexto:** LP Dr. Ênio Leite — lipo-de-papada.html
- **Feedback:** "pode tirar a foto da hero quando a visualização estiver em mobile"
- **Regra:** Em páginas de captura mobile, a hero não exibe foto. Apenas headline, subhead, formulário e social proof. Fotos na hero ficam só no desktop.
- **Aplica a:** @ux-design-expert ao construir LPs para clientes médicos
- **Severidade:** HIGH
