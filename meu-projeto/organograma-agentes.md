# Organograma de Agentes - Minha Empresa

> Use este documento como referência para criar o organograma visual no Figma.

## Hierarquia dos Agentes

```
                    ┌─────────────────┐
                    │      VOCÊ       │
                    │  (Fundador/CEO) │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌────────────────┐  ┌─────────────────┐
│  PLANEJAMENTO │  │    PRODUTO     │  │   ESPECIALISTAS │
├───────────────┤  ├────────────────┤  ├─────────────────┤
│ • Analyst     │  │ • PO           │  │ • DevOps        │
│ • PM          │  │ • Scrum Master │  │ • Data Engineer │
│ • Architect   │  └───────┬────────┘  │ • UX Designer   │
└───────┬───────┘          │           └─────────────────┘
        │                  │
        └──────────────────┼──────────────────┐
                           ▼                  │
                    ┌──────────────┐          │
                    │  EXECUÇÃO    │          │
                    ├──────────────┤          │
                    │ • Dev        │◄─────────┘
                    │ • QA         │
                    └──────────────┘
```

## Descrição dos Agentes

### 🎯 Orquestração
| Agente | Função |
|--------|--------|
| **Você** | Tomada de decisões, direção estratégica |

### 📋 Planejamento
| Agente | Função |
|--------|--------|
| **Analyst** | Briefing inicial, elicitação de requisitos |
| **PM** | Product Requirements (PRD), roadmap |
| **Architect** | Arquitetura técnica, decisões de sistema |

### 📦 Produto
| Agente | Função |
|--------|--------|
| **PO** | Priorização, backlog, visão do produto |
| **Scrum Master** | Histórias de desenvolvimento, sprints |

### ⚙️ Execução
| Agente | Função |
|--------|--------|
| **Dev** | Implementação, código |
| **QA** | Testes, qualidade, validação |

### 🔧 Especialistas
| Agente | Função |
|--------|--------|
| **DevOps** | Infraestrutura, CI/CD, MCPs |
| **Data Engineer** | Pipelines, dados, ETL |
| **UX Designer** | Experiência do usuário, interface |

---

## Dicas para o Figma

1. **Cores sugeridas:**
   - Fundo: `#0F172A` ou gradiente azul escuro
   - Caixas: `#FFFFFF` ou `#F1F5F9`
   - Linhas: `#94A3B8` (cinza claro)
   - Destaque: `#3B82F6` (azul)

2. **Layout:** Use Auto Layout para manter alinhamento consistente

3. **Componentes:** Crie um componente reutilizável para cada "carta" de agente

4. **Conectores:** Use a ferramenta de Connector (ou linhas) do Figma para ligar os níveis

5. **Figma vs FigJam:** O FigJam é ótimo para organogramas - tem templates de org chart nativos!
