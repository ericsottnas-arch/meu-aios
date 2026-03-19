# Aprendizados — @copy-chef

## [2026-03-10] Feedback: roteiro de vídeo — naturalidade e CTA com força

- **Contexto:** Roteiro de vídeo para otomodelação, Dra. Vanessa Soares
- **Feedback:** Eric apontou 4 problemas no roteiro entregue:
  1. Oferecer variações de perguntas para o paciente, não apenas uma opção — videomaker precisa de flexibilidade
  2. Fala da doutora estava "engessada" — precisa soar como conversa real durante o procedimento, não copy formatado
  3. Evitar pontuação artificial com cara de texto gerado por IA (excesso de bullets, colchetes, travessões decorativos)
  4. CTA fraco — precisa bater diretamente na dor da pessoa e provocar decisão, não apenas convidar
- **Regra derivada:**
  - Em roteiros de vídeo, SEMPRE oferecer 4-5 variações de perguntas para cada momento de entrevista
  - Falas de autoridade (médico, especialista) devem soar como conversa real, não como copy — adaptar o que o cliente já fala naturalmente
  - Pontuação deve ser natural: sem travessão em excesso, sem bullets dentro de diálogos, sem colchetes no meio da fala
  - CTA de vídeo precisa espelhar a dor específica mostrada no vídeo + urgência real + ação clara
- **Severidade:** HIGH

## [2026-03-18] Feedback: copy sempre no Google Docs para revisão

- **Contexto:** Copy da landing page Dr. Enio Leite entregue no chat
- **Feedback:** "vc precisa escrever a copy dentro do docs do google pra que eu faça os comentários lá"
- **Regra derivada:** TODA copy entregue ao Eric deve ser criada no Google Docs. Nunca entregar copy no chat. O Doc permite que Eric faça comentários diretamente no texto. Usar `mcp__google-docs__createDocument` para criar e `mcp__google-docs__appendMarkdown` para escrever o conteúdo.
- **Severidade:** CRITICAL
- **Aplica a:** @copy-chef e qualquer agente que produza copy, roteiro ou texto para revisão

## [2026-03-18] Feedback: PROIBIDO travessão em qualquer material CRITICAL

- **Contexto:** Copy da landing page Dr. Enio Leite — múltiplas ocorrências do "—"
- **Feedback:** "você precisa instinguir DE UMA VEZ POR TODAS a utilização desse — em qualquer material para todos os agentes, já te falei isso 10x"
- **Regra derivada:** O caractere "—" (travessão/em dash) é TERMINANTEMENTE PROIBIDO em qualquer material produzido. Substituir por: ponto final, vírgula, dois pontos, quebra de linha ou reescrever a frase sem o conector.
- **Severidade:** CRITICAL
- **Aplica a:** TODOS os agentes, TODOS os materiais (copy, roteiro, email, doc, caption, script)

## [2026-03-10] Feedback: protocolo de ativação — ordem obrigatória

- **Contexto:** Demanda de funil de aquisição HOF via conteúdo
- **Feedback:** "vc precisa seguir o protocolo SEM ERRAR" — fui direto para perguntas sem checar memória e docs primeiro
- **Regra derivada:** SEMPRE seguir a ordem: (1) memory/ → (2) docs/clientes/ → (3) codebase → (4) só então perguntar o que faltou. NUNCA iniciar intake perguntando o que já pode ser encontrado internamente.
- **Severidade:** CRITICAL

## [2026-03-10] Feedback: formato de entrega de documentos

- **Contexto:** Roteiro salvo como .txt no Drive
- **Feedback:** "o arquivo sempre tem que ser em docx. formato word n se esqueça"
- **Regra derivada:** Todo documento entregue no Drive deve ser .docx (Word). Nunca .txt, .md ou outro formato. Usar a lib `docx` disponível em `meu-projeto/node_modules/docx` (v9.6.0)
- **Severidade:** CRITICAL

