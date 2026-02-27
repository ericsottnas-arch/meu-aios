# Template: Estrutura Padrão de Cliente

**Versão:** 2.0 (com pasta de Copywriting)
**Data:** 25 de fevereiro de 2026

---

## 📁 Estrutura de Pastas por Cliente

Cada cliente possui a seguinte hierarquia padronizada:

### Google Drive

```
{CLIENTE}/
├── 📄 Documentos
│   └── Briefings, estratégias, PDFs, análises
│
├── 📸 Imagens
│   └── Fotos, screenshots, antes/depois
│
├── 🎨 Criativos
│   ├── Designs, anúncios, mockups
│   │
│   └── 🖊️ Copywriting (NOVO)
│       ├── Copy Headlines (textos curtos/impactantes)
│       ├── Copy Emails (sequences, newsletters)
│       ├── Copy Social (posts, captions, stories)
│       ├── Copy Landing Pages (sales pages, squeeze pages)
│       ├── Copy Anúncios (Google Ads, Facebook Ads)
│       ├── Copy Scripts (vendas, apresentações)
│       ├── Tom de Voz e Estilo (marca guidelines)
│       └── Frameworks Utilizados (AIDA, PAS, BAB, etc)
│
├── 📊 Planilhas
│   └── Dados, analytics, relatórios
│
├── 🎥 Vídeos
│   └── Reels, stories, campanhas
│
└── 📋 Documentação
    └── Perfil, knowledge base, histórico
```

### Repositório Local

```
docs/clientes/{cliente-id}/
├── README.md
├── profile.md
├── knowledge-base/
│   └── data.json
├── history/
│   └── (interações, notas)
├── assets/
│   └── (materiais de marketing)
│
└── 🎨 Criativos/ (NOVO - opcional local)
    └── 🖊️ Copywriting/
        └── (mesma estrutura do Google Drive)
```

---

## 🖊️ Pasta Copywriting - Detalhes

### Responsável
**@copy-chef** e especialistas de copywriting

### Estrutura Interna

```
🖊️ Copywriting/
├── 📋 Tom de Voz e Estilo - [CLIENTE].txt
│   └── Jargões, tom, características, triggers emocionais
│
├── Headlines
│   ├── Headlines Vencedoras.md
│   ├── Headlines A/B Testing.md
│   └── Variações por Contexto.md
│
├── Emails
│   ├── Email Sequences.md
│   ├── Email Templates.md
│   ├── Newsletter Copy.md
│   └── Follow-up Sequences.md
│
├── Social Media
│   ├── Instagram Captions.md
│   ├── LinkedIn Posts.md
│   ├── Facebook Copy.md
│   └── TikTok Scripts.md
│
├── Landing Pages
│   ├── Sales Page Copy.md
│   ├── Squeeze Page Copy.md
│   ├── Webinar Page Copy.md
│   └── Checkout Page Copy.md
│
├── Anúncios
│   ├── Google Ads Copy.md
│   ├── Facebook Ads Copy.md
│   ├── LinkedIn Ads Copy.md
│   └── Copy Variations.md
│
├── Scripts
│   ├── Sales Scripts.md
│   ├── Demo Scripts.md
│   ├── Pitch Scripts.md
│   └── Call to Action Variations.md
│
└── Frameworks
    ├── AIDA.md
    ├── PAS.md
    ├── BAB.md
    ├── FAB.md
    └── PASTOR.md
```

---

## 📝 Como Copy-Chef Usa Esta Pasta

### 1. Antes de Escrever Copy
- [ ] Acessar `📋 Tom de Voz e Estilo - [CLIENTE].txt`
- [ ] Revisar headlines vencedoras
- [ ] Entender público-alvo e ICP
- [ ] Consultar copy anterior (para consistência)

### 2. Após Escrever Copy
- [ ] Salvar em pasta apropriada (Headlines, Emails, Social, etc)
- [ ] Nomear arquivo com data: `YYYYMMDD_descricao.md`
- [ ] Adicionar notas sobre performance
- [ ] Compartilhar com especialistas relevantes

### 3. Manutenção
- [ ] Atualizar Tom de Voz conforme evolução da marca
- [ ] Arquivar copy desatualizado
- [ ] Documentar A/B tests realizados
- [ ] Manter histórico de mudanças

---

## ✅ Checklist: Todos os Clientes

**Google Drive (6 clientes):**
- [x] Dr Érico Servano
- [x] Dra Vanessa Soares
- [x] Dra Gabrielle
- [x] Dra Bruna Nogueira
- [x] Dra Mônica Andrade
- [x] Prof. Dr. Humberto Andrade

**Repositório Local (9 clientes):**
- [x] dr-erico-servano
- [x] dra-vanessa-soares
- [x] estetica-gabrielleoliveira
- [x] dra-bruna-nogueira
- [x] dra-monica-andrade
- [x] prof-dr-humberto-andrade
- [x] torre-1
- [x] fourcred
- [x] humbertoandradebr

---

## 📊 Impacto para Outros Agentes

### @copy-chef
✅ Centraliza todo conteúdo de copy
✅ Fácil acesso a historical copy
✅ Compartilhamento com especialistas

### @halbert, @ogilvy, @wiebe, @georgi, @orzechowski, @morgan
✅ Acessam pasta `🖊️ Copywriting` de seus clientes
✅ Podem referenciar copy anterior
✅ Colaboram em versões do mesmo copy

### @account, @celo, @analyst
✅ Sabem onde encontrar copy criada
✅ Podem refereciar em relatórios
✅ Usam em estratégia geral

---

## 🔄 Próximas Implementações

- [ ] Template "📋 Tom de Voz e Estilo" para novos clientes
- [ ] Script automático para criar subpastas em novos clientes
- [ ] Documentação de frameworks de copywriting
- [ ] Dashboard de performance de copy

---

**Template criado:** 25 de fevereiro de 2026
**Versão:** 2.0
**Próxima revisão:** 25 de março de 2026

*Pasta 🖊️ Copywriting é essencial para @copy-chef e especialistas!*
