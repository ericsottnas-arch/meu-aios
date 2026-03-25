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

## [2026-03-19] Aprendizado: Copy para médico estética — Tom e Estrutura Aprovados

- **Contexto:** Landing page de captura Dr. Ênio Leite — Harmonização Orofacial, Serra/ES
- **Copy v3 aprovada pelo Eric** — padrões extraídos para reutilizar em outros clientes médicos

**Tom aprovado para clínica estética premium:**
- Falar PARA a paciente, não sobre o procedimento ("Para quem sempre quis mudar alguma coisa no rosto")
- Abordar o MEDO primeiro ("Você quer. Mas tem medo que fique artificial")
- Resultado natural como promessa central, não o procedimento em si
- Frases curtas, intimistas, sem jargão médico corporativo
- Nunca começa com pergunta — sempre afirmação que valida o sentimento dela

**Headline aprovada como modelo:**
"Para quem sempre quis mudar alguma coisa no rosto. Mas queria que parecesse natural."

**Estrutura aprovada para copy de procedimentos:**
- Nome do procedimento + o resultado emocional que ela vai sentir
- Ex: "Aquela versão mais descansada que você lembra de você." (Toxina Botulínica)
- Ex: "Para quem sempre quis lábios mais cheios e nunca teve coragem." (Preenchimento Labial)
- Terminar com: "Ninguém vai saber o que você fez. Todo mundo vai notar."

**Depoimentos aprovados (estrutura):**
- Começar com o antes emocional ("Saí parecendo eu mesma")
- Resultado específico e concreto ("o resultado só melhora com o tempo")
- Zero hipérboles ou superlativos

**Rodapé:** Remover telefone/WhatsApp — forçar conversão pelo formulário

- **Severidade:** HIGH
- **Aplica a:** @copy-chef, @georgi, @wiebe ao trabalhar com clientes médicos/estética

## [2026-03-20] Feedback: CRITICO — regras de copy extraidas dos comentarios no Google Docs

- **Contexto:** Sistema Lego Dra. Gabrielle v6 — 8 comentarios do Eric no doc

**Regras derivadas (cada uma extraida de um comentario real):**

1. PROIBIDO palavras técnicas que o lead não usa: "tecido", "alcançar", "metabolicamente", "protocolo não-invasivo". Usar sempre: "gordurinha", "pochete", "culote", "pneu", "barriga", "gordura da gravidez"

2. FOCAR EM UM ÚNICO ARGUMENTO por bloco. Não misturar "sem corte + sem repouso + protocolo". Se o assunto é criolipólise, falar só do tempo. Se é gestação, falar só da gordura que ficou. Misturar = confunde e dilui tudo.

3. TEMPLATE DE ERIC para copy de evento (replicar sempre): "Vai acontecer um evento e você já tá pensando em como vai aparecer a sua barriga nas fotos. Se você não quer passar por isso, ainda dá tempo de resolver." Levantar o problema e trazer a solução no mesmo movimento, sem pausas excessivas.

4. PROIBIDO "avental" como palavra isolada sem contexto explicativo. Usar "a barriga que sobrou da gravidez" ou "aquela gordura que ficou depois da gestação".

5. Body "sem cirurgia": não dizer apenas "sem corte, sem internação" — o lead que viu criolipólise JÁ SABE que não é cirurgia. Usar comparação com pior alternativa: "Você não precisa gastar 20, 30, 40 mil numa bariátrica..."

6. CTA de qualificação: PROIBIDO mencionar valores (R$300). Usar "meios de pagamento flexíveis" para induzir que é pago sem citar preço.

7. CTA principal: SEMPRE na voz da Dra. Gabrielle em PRIMEIRA PESSOA quando ela for quem vai falar/postar. "É nela que eu monto o seu plano... minha agenda."

8. Fluxo: menos pontos finais, mais "e", "porque", "mas", "então". Conectar ideias em vez de espaçar frases curtas.

- **Severidade:** CRITICAL (múltiplas regras)
- **Aplica a:** @copy-chef e todos os especialistas

## [2026-03-20] Feedback: CRITICO — copy em PORTUGUES BRASILEIRO real, nao traduzido do inglês

- **Contexto:** Sistema Lego Dra. Gabrielle — copy soando como tradução literal de framework americano
- **Feedback:** "Parece que você está pensando em inglês e traduzindo para o português. A gente não fala dessa forma. 'Academia quando dá, comida melhor, esforço' não faz sentido."
- **Problema raiz:** Os especialistas (Halbert, Morgan, Ogilvy etc.) escrevem em inglês. A estrutura de frase deles vaza no português. Em inglês funciona: "Hard work. Better food. Effort." Em português fica nonsense literal.
- **Regra derivada:**
  - PROIBIDO aplicar estrutura de copy americana traduzida para o português
  - Escrever sempre na voz de uma brasileira conversando com outra brasileira
  - Usar ritmo real do português falado: "né", "pra", "tá", "a gente", "de jeito nenhum", "faz o que todo mundo fala", "já tentou de tudo"
  - Teste antes de entregar: "uma mulher de Caieiras falaria assim com a amiga dela no WhatsApp?" Se não, reescrever.
  - Os frameworks americanos ditam a ESTRATÉGIA. A EXECUÇÃO é 100% em português brasileiro autêntico.
- **Severidade:** CRITICAL
- **Aplica a:** @copy-chef e todos os especialistas ao escrever em português

## [2026-03-20] Feedback: copy CONVERSACIONAL, nao fragmentada em frases de efeito

- **Contexto:** Sistema Lego de criativos para Dra. Gabrielle — hooks, bodies, CTAs
- **Feedback:** "ta muito comercial... vc escreve muito pausado, sem continuidade da frase e sem sentido, falando apenas frases de efeito, quero conversar com o lead, tocar na dor dele... continuar uma conversa que ja está atormentando a cabeça dele"
- **Regra derivada:**
  - PROIBIDO escrever copy como lista de frases curtas soltas, mesmo que cada uma seja boa isolada
  - O copy precisa CONTINUAR o pensamento que o lead ja está tendo na cabeça, nao interrompê-lo com slogans
  - Frases se conectam com conjuncoes: "e", "mas", "porque", "é que", "então", "mesmo assim"
  - Parágrafos com 3 a 5 linhas conectadas, nao 1 frase por linha
  - O lead nao deve sentir que está sendo vendido — deve sentir que alguem finalmente entendeu o que está na cabeça dele
  - Regra pratica: antes de entregar, perguntar "isso soa como uma conversa real ou como um anuncio montado?"
- **Severidade:** CRITICAL
- **Aplica a:** @copy-chef e todos os especialistas ao escrever para Eric

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

