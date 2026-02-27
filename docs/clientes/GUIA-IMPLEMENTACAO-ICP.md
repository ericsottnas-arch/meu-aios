# 📋 GUIA: Implementação de ICP em Cada Cliente

**Data:** 25 de fevereiro de 2026
**Versão:** 1.0
**Responsável:** PM Agent

---

## 🎯 OBJETIVO

Cada cliente deve ter **UM arquivo centralizado de ICP** chamado `ICP.md` na raiz de sua pasta em `/docs/clientes/[cliente]/`.

Este arquivo será a **SOURCE OF TRUTH** para:
- Copy-Chef (escreve copy específico para cada persona)
- Celo (Media Buyer) - segmenta audiência
- Account Manager - entende públicos
- Georgi - escreve com personificação correta
- Todos os outros agents

---

## 📁 ESTRUTURA DE PASTAS

```
docs/clientes/
├── dr-erico-servano/
│   ├── ICP.md ⭐ (NOVO - CENTRALIZADO)
│   ├── README.md
│   ├── profile.md
│   ├── knowledge-base/
│   │   ├── data.json
│   │   ├── CORRECAO-ICP-PUBLICO-ALVO-2026-02-25.md (referencias)
│   │   ├── transcricoes-videos-2026-02-25.md (referencias)
│   │   └── analise-videos-erico-2026-02-25.md (referencias)
│   └── 🎨 Criativos/
│       └── 🖊️ Copywriting/
│           └── 📋 Tom de Voz e Estilo - Dr. Erico Servano.txt
│
├── dra-vanessa-soares/
│   ├── ICP.md ⭐ (A CRIAR)
│   ├── README.md
│   ├── profile.md
│   └── ...
│
├── estetica-gabrielleoliveira/
│   ├── ICP.md ⭐ (A CRIAR)
│   ├── README.md
│   ├── profile.md
│   └── ...
│
└── TEMPLATE-ICP.md (template para novos clientes)
```

---

## ✅ CHECKLIST: CRIAR ICP PARA UM NOVO CLIENTE

### Passo 1: Pesquisa Profunda
- [ ] Assistir/analisar vídeos do cliente
- [ ] Ler conteúdo existente (blog, posts, copy anterior)
- [ ] Entrevistar cliente sobre seu público
- [ ] Coletar dados reais (analytics, histórico de vendas)
- [ ] Pesquisar o mercado do cliente

### Passo 2: Identificar Personas
- [ ] Identificar 3-5 públicos-alvo principais
- [ ] Para cada persona:
  - [ ] Perfil demográfico completo
  - [ ] Situação de vida (status, trigger, contexto)
  - [ ] Dores primárias E secundárias
  - [ ] O que realmente busca
  - [ ] Comportamento de compra
  - [ ] Exemplo real ou case

### Passo 3: Mapear Dores
- [ ] Listar 3-5 dores principais
- [ ] Para cada dor:
  - [ ] Definição clara
  - [ ] Quem sente (quais personas)
  - [ ] Evidência onde vimos isso
  - [ ] Como abordar na copy

### Passo 4: Estratégia de Comunicação
- [ ] Criar messaging ESPECÍFICO por persona
- [ ] Definir hook para cada persona
- [ ] Definir story/case para cada persona
- [ ] Definir CTA para cada persona
- [ ] Definir tone para cada persona
- [ ] Definir medium preferido (LinkedIn, WhatsApp, etc)

### Passo 5: Ranking de Foco
- [ ] Ranking: qual persona focar PRIMEIRO
- [ ] Justificar por: % mercado, ticket, urgência, facilidade

### Passo 6: Validação
- [ ] Reviewed pelo PM
- [ ] Approved pelo cliente
- [ ] Compartilhado com todos os agents
- [ ] Status marcado como ✅ VALIDADO

---

## 🚀 COMO USAR O ICP (Para cada Agent)

### Copy-Chef:
```
1. Ler ICP.md do cliente
2. Identificar qual persona vai escrever
3. Usar MESSAGING ESPECÍFICO dessa persona
4. Usar HOOK específico dessa persona
5. Usar TONE específico dessa persona
6. Validar com checklist do ICP
```

### Celo (Media Buyer):
```
1. Ler ICP.md do cliente
2. Ver RANKING - qual persona focar
3. Segmentar audiência por persona
4. Usar demographics/psychographics do ICP
5. Ajustar targeting/bid por urgência
```

### Account Manager:
```
1. Ler ICP.md do cliente
2. Quando prospect entra, identificar qual persona é
3. Comunicar com messaging dessa persona
4. Entender dores dessa persona
5. Propor solução alinhada com ticket dessa persona
```

### Georgi (High-Ticket):
```
1. Ler ICP.md do cliente
2. Focar em personas com ticket alto
3. Usar tone/messaging dessa persona
4. Criar email sequence para essa persona
5. Ajustar objections baseado em dores da persona
```

---

## 📊 EXEMPLO: COMO FICOU DR. ERICO

**Antes:**
- ❌ Público genérico: "Fonoaudiólogos, fisioterapeutas, esteticistas"
- ❌ Dor genérica: "Insegurança jurídica"
- ❌ Ticket esperado: "R$ 2-5k"
- ❌ Copy genérica

**Depois:**
- ✅ 5 personas específicas com dores diferentes
- ✅ Persona 1 (Perseguido): "Medo de 15 anos de cadeia"
- ✅ Ticket esperado: "R$ 5-15k para Persona 1"
- ✅ Copy específica para cada persona
- ✅ Ranking claro: Focar em Persona 1 primeiro

---

## 🔄 ATUALIZAÇÕES E REVISÕES

### Quando Atualizar ICP:

**IMEDIATO (quando acontece):**
- Descoberta de novo público
- Mudança drástica no ticket
- Breakthrough de pesquisa
- Cliente corrige informação

**TRIMESTRAL (a cada 3 meses):**
- Revisar dados reais vs. teórico
- Validar que personas ainda fazem sentido
- Atualizar % de mercado se mudar
- Checar se pricing está correto

**ANUAL (revisão geral):**
- Revisão completa
- Atualizar com novos dados
- Revalidar com cliente
- Publicar versão 2.0 (se houver mudanças significativas)

### Histórico de Versões:
```
Arquivo: /docs/clientes/dr-erico-servano/ICP.md

Versão 1.0 (2026-02-25): ICP inicial (ERRADO - genérico)
Versão 2.0 (2026-02-25): ICP atualizado com análise de vídeos (CORRETO - 5 personas)
```

---

## 📝 TEMPLATE PADRÃO

Usar: `/docs/clientes/TEMPLATE-ICP.md`

Para cada novo cliente:
1. Copiar TEMPLATE-ICP.md
2. Renomear para ICP.md
3. Colocar na pasta `/docs/clientes/[cliente-novo]/ICP.md`
4. Preencher com dados reais
5. Não deixar espaços em branco
6. Se não sabe, deixar como "A PESQUISAR"

---

## 🎯 CLIENTES QUE PRECISAM DE ICP

| Cliente | Status | Responsável | Data Deadline |
|---------|--------|-------------|---------------|
| Dr. Erico Servano | ✅ PRONTO | Claude | 25/02/2026 |
| Dra. Vanessa Soares | ⏳ A FAZER | PM | 28/02/2026 |
| Estética Gabrielle | ⏳ A FAZER | PM | 28/02/2026 |
| Dr. Humberto Andrade | ⏳ A FAZER | PM | 28/02/2026 |
| Torre 1 | ⏳ A FAZER | PM | 28/02/2026 |
| FourCred | ⏳ A FAZER | PM | 28/02/2026 |

---

## 💾 BACKUP & VERSIONAMENTO

**Backup automático:**
- Cada versão de ICP é salva em Git
- Histórico completo em Git log
- Recuperação via `git show [commit]`

**Versionamento:**
```
ICP.md (produção)
↓
CORRECAO-ICP-PUBLICO-ALVO-2026-02-25.md (análise - pode ser deletada)
↓
knowledge-base/ (pesquisa/análise - referência)
```

---

## 🔐 PERMISSÕES & ACESSO

| Role | Leitura | Escrita | Aprovação |
|------|---------|---------|-----------|
| Copy-Chef | ✅ | ❌ | - |
| Celo (Media Buyer) | ✅ | ❌ | - |
| Account Manager | ✅ | ❌ | - |
| Georgi | ✅ | ❌ | - |
| PM | ✅ | ✅ | ✅ |
| Analyst | ✅ | ✅ | - |
| Cliente | ✅ | ❌ | ✅ |

---

## 📞 SUPORTE & DÚVIDAS

**Se você não sabe como preencher alguma seção:**
1. Consulte TEMPLATE-ICP.md
2. Consulte ICP de Dr. Erico (exemplo completo)
3. Pergunte ao PM
4. Deixe como "A PESQUISAR" temporariamente

**Se precisar atualizar:**
1. Edit o arquivo ICP.md
2. Mude a versão (1.0 → 1.1)
3. Mude a data
4. Commit com mensagem clara
5. Notifique os agents relevantes

---

## ✨ BENEFÍCIOS DE TER ICP CENTRALIZADO

1. **Copy melhor** - Não genérico, específico por persona
2. **Conversão melhor** - Fala com as dores reais
3. **Ticket melhor** - Conhece limite de gasto de cada persona
4. **Segmentação melhor** - Celo sabe exatamente quem focar
5. **Comunicação alinhada** - Todos falam a mesma língua
6. **Menos desperdício** - Não gasta dinheiro em público errado
7. **ROI melhor** - Cada real gasto é mais eficiente

---

*Guia criado por Claude Code - 25 de fevereiro de 2026*
*Framework: Synkra AIOS*

