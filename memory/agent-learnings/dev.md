# Aprendizados do @dev

## 2026-03-16 Feedback: Documentos SEMPRE Google Docs nativo, NUNCA Word
- **Contexto:** Roteiros de conteúdo eram gerados como .docx via lib `docx`
- **Feedback:** Eric pediu para parar de criar documentos Word e usar apenas Google Docs nativo
- **Regra derivada:** TODOS os documentos gerados pelo sistema (roteiros, relatórios, etc.) devem ser criados como Google Docs nativos via API, NUNCA como .docx. A função `createGoogleDoc()` em `drive-access.js` é o padrão.
- **Severidade:** CRITICAL
- **Implementação:** `swipe-replicator.js > saveToRoteiros()` agora usa `createGoogleDoc()` com OAuth2. Fallback para .md local se API falhar.
- **Auth:** OAuth2 com `GOOGLE_DOCS_REFRESH_TOKEN` (conta do Eric). Service Account é fallback read-only.
