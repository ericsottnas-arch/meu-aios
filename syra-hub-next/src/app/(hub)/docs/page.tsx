import {
  Bot, FileText, Code2, Workflow, Settings,
} from 'lucide-react'

const DOC_SECTIONS = [
  {
    title: 'Agentes AIOS',
    description: 'Documentação dos agentes IA, suas capacidades e comandos.',
    icon: Bot,
    color: '#C084FC',
    links: [
      { label: 'Copy Chef — Orquestração de copywriters', href: '#' },
      { label: 'Designer (Luna) — Pipeline criativo', href: '#' },
      { label: 'CELO — Media Buyer automatizado', href: '#' },
      { label: 'IRIS — Prospecção Instagram', href: '#' },
      { label: 'Alex — Gestão de projetos ClickUp', href: '#' },
      { label: 'GHL Maestro — Automações GoHighLevel', href: '#' },
    ],
  },
  {
    title: 'Integrações',
    description: 'Guias de configuração e referência de APIs.',
    icon: Workflow,
    color: '#60A5FA',
    links: [
      { label: 'Meta Ads API — Campanhas e relatórios', href: '#' },
      { label: 'GoHighLevel — Webhooks e CRM', href: '#' },
      { label: 'Stevo — WhatsApp Business API', href: '#' },
      { label: 'ClickUp — API de tarefas', href: '#' },
    ],
  },
  {
    title: 'Infraestrutura',
    description: 'Deploy, servidores e monitoramento.',
    icon: Settings,
    color: '#34D399',
    links: [
      { label: 'VPS — Serviços PM2 (ports 3001-3008)', href: '#' },
      { label: 'Vercel — Deploy do Hub', href: '#' },
      { label: 'Supabase — Banco de dados e auth', href: '#' },
    ],
  },
  {
    title: 'Desenvolvimento',
    description: 'Guias de contribuição e padrões de código.',
    icon: Code2,
    color: '#FB923C',
    links: [
      { label: 'CLAUDE.md — Regras do Claude Code', href: '#' },
      { label: 'Protocolo de Inteligência dos Agentes', href: '#' },
      { label: 'Protocolo de Feedback Persistente', href: '#' },
    ],
  },
]

export default function DocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Documentação
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Referência técnica do ecossistema Syra AIOS
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DOC_SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <div
              key={section.title}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${section.color}15`, color: section.color }}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                    {section.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">{section.description}</p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-default">
                      <FileText size={12} className="text-[var(--text-muted)] shrink-0" />
                      {link.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
