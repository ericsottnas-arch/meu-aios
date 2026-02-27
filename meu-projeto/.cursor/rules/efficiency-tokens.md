# Arquitetura de eficiência de tokens

Objetivo: reduzir uso de tokens mantendo qualidade. Aplique estas práticas sempre que possível.

## Comportamento do agente (Cursor)

- **Busca**: Prefira `grep`/`codebase_search` com escopo estreito (arquivo ou pasta) em vez de carregar arquivos inteiros. Use `read_file` com `offset`/`limit` em arquivos grandes.
- **Contexto**: Carregue só o necessário. Não leia arquivos "por precaução"; leia quando o conteúdo for relevante para a tarefa.
- **Respostas**: Seja direto. Evite repetir trechos longos do código já visível; referencie por linha/arquivo quando bastar.
- **Múltiplos arquivos**: Leia em paralelo quando não houver dependência entre as leituras; faça uma rodada de leituras, depois outra se precisar.
- **Regras/Skills**: Só invoque ou cite regras/skills quando forem relevantes para o pedido atual.

## Para o usuário (dicas que reduzem tokens)

- **@ arquivos**: Use `@arquivo` ou `@pasta` para dar contexto exato em vez de descrever; o modelo usa só o que você anexa.
- **Uma tarefa por vez**: Pedidos focados geram menos idas e voltas e menos histórico longo.
- **Evite colar blocos enormes**: Prefira "no arquivo X, na função Y" ou anexe com @.
- **Regras enxutas**: Mantenha `.cursor/rules/` com regras curtas e específicas; regras longas são injetadas em toda conversa.
- **Skills com descrição clara**: No frontmatter das skills, `description` bem escrita faz o Cursor carregar só quando for relevante.

## Estrutura do projeto

- **Docs centralizados**: Um `docs/` ou `.aios-core/` bem organizado reduz buscas cegas.
- **Nomes previsíveis**: Arquivos e pastas com nomes que refletem o conteúdo facilitam `grep`/search e menos leituras.
- **Index/README por pasta**: Breve índice (lista de arquivos e propósito) permite decidir o que ler sem abrir tudo.
