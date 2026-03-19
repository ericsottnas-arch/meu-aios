import {
  MessageCircle, TrendingUp, Zap, Target, Clipboard, Mail,
  CheckCircle2, XCircle, MinusCircle,
} from 'lucide-react'

const INTEGRATIONS = [
  {
    name: 'Meta Ads',
    description: 'Facebook & Instagram Ads via Marketing API',
    icon: TrendingUp,
    color: '#1877F2',
    status: 'connected' as const,
  },
  {
    name: 'GoHighLevel',
    description: 'CRM, automações, pipelines e webhooks',
    icon: Zap,
    color: '#FF9800',
    status: 'connected' as const,
  },
  {
    name: 'WhatsApp (Stevo)',
    description: 'API de mensagens, monitor NICO, templates',
    icon: MessageCircle,
    color: '#25D366',
    status: 'connected' as const,
  },
  {
    name: 'Telegram',
    description: 'Bots de notificação e comando (@alex, @celo)',
    icon: Mail,
    color: '#26A5E4',
    status: 'connected' as const,
  },
  {
    name: 'ClickUp',
    description: 'Gestão de projetos e tarefas via @alex',
    icon: Clipboard,
    color: '#7B68EE',
    status: 'connected' as const,
  },
  {
    name: 'Instagram Graph API',
    description: 'Prospecção via DM, scraping de perfis',
    icon: Target,
    color: '#E4405F',
    status: 'partial' as const,
  },
] as const

const STATUS_CONFIG = {
  connected: { icon: CheckCircle2, label: 'Conectado', color: '#22C55E' },
  partial: { icon: MinusCircle, label: 'Parcial', color: '#F59E0B' },
  disconnected: { icon: XCircle, label: 'Desconectado', color: '#EF4444' },
}

export default function IntegracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Integrações
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Serviços conectados ao ecossistema AIOS
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon
          const statusCfg = STATUS_CONFIG[integration.status]
          const StatusIcon = statusCfg.icon
          return (
            <div
              key={integration.name}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 hover:border-[var(--border-base)] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${integration.color}15`, color: integration.color }}
                >
                  <Icon size={20} />
                </div>
                <div className="flex items-center gap-1">
                  <StatusIcon size={12} style={{ color: statusCfg.color }} />
                  <span className="text-[10px] font-medium" style={{ color: statusCfg.color }}>
                    {statusCfg.label}
                  </span>
                </div>
              </div>
              <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                {integration.name}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {integration.description}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
