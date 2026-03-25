# Regras de Entrega de Documentos

> Consultar ao criar, salvar ou entregar qualquer documento, relatorio, roteiro ou arquivo.
> Ver tambem: [[universal]] (Google Docs obrigatorio para copy)

---

## [CRITICAL] Textos para revisao: SEMPRE Google Docs nativo

- NUNCA entregar copy, roteiro, email ou texto para revisao no chat
- NUNCA criar como .docx, .txt ou .md para entrega ao Eric
- SEMPRE criar Google Doc nativo via API

**Como criar:**
```
mcp__google-docs__createDocument   → cria o documento
mcp__google-docs__appendMarkdown   → escreve o conteudo
```

**Pasta padrao:** Syra Digital/Clientes/{cliente}/ no Drive do Eric
**Conta:** ericsottnas@gmail.com

**Por que:** Eric comenta diretamente no Doc — nao consegue fazer isso no chat.

---

## [HIGH] Formatos aceitos por tipo de documento

| Tipo de documento | Formato correto |
|-------------------|----------------|
| Copy, roteiro, email para revisao | Google Docs nativo (CRITICAL) |
| Relatorio de dados, dashboard | Google Docs nativo |
| Planilha, tabela de numeros | Google Sheets (se necessario) |
| Script de automacao | .js ou .py no repositorio |
| Codigo HTML de pagina | .html no `docs/clientes/{slug}/` |
| Documento Word legado (quando cliente pede) | .docx via lib `docx` |

---

## [HIGH] Google Drive — estrutura de pastas

```
Meu Drive/
  Syra Digital/
    1. Clientes/
      {nome-cliente}/
        roteiros/
        copies/
        criativos/
        relatorios/
```

**Path local do Drive:** `/Users/ericsantos/Library/CloudStorage/GoogleDrive-ericsottnas@gmail.com/Meu Drive/`

---

## [HIGH] Autenticacao Google

- OAuth2 com `GOOGLE_DOCS_REFRESH_TOKEN` (conta do Eric)
- Service Account e fallback read-only
- Funcao padrao: `createGoogleDoc()` em `meu-projeto/lib/drive-access.js`

---

## [MEDIUM] Assinatura de tarefas ClickUp

Quando @alex cria uma tarefa, assina:
`Criado por @alex · Syra Digital AIOS`

Quando agente especialista comenta, usa:
`@{agente} · {especialidade}`

---

Ultima atualizacao: 2026-03-19
