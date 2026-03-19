import {
  MessageCircle, Send, Bell, MessageSquare,
} from 'lucide-react'

const CHANNELS = [
  {
    name: 'WhatsApp (NICO)',
    description: 'Monitor de mensagens — todos os clientes',
    icon: MessageCircle,
    color: '#25D366',
    port: 3001,
    badge: 'VPS :3001',
  },
  {
    name: 'Telegram — CELO',
    description: 'Notificações de campanhas e otimizações',
    icon: Send,
    color: '#26A5E4',
    badge: 'Bot',
  },
  {
    name: 'Telegram — ALEX',
    description: 'Notificações de tarefas e projetos ClickUp',
    icon: Bell,
    color: '#5B8DEF',
    badge: 'Bot',
  },
  {
    name: 'GHL Inbox',
    description: 'Conversas do GoHighLevel via webhook',
    icon: MessageSquare,
    color: '#FF9800',
    port: 3004,
    badge: 'VPS :3004',
  },
]

export default function InboxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Inbox
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Central de canais de comunicação
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CHANNELS.map((channel) => {
          const Icon = channel.icon
          return (
            <div
              key={channel.name}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 hover:border-[var(--border-base)] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${channel.color}15`, color: channel.color }}
                >
                  <Icon size={20} />
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded">
                  {channel.badge}
                </span>
              </div>
              <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                {channel.name}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {channel.description}
              </p>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Inbox unificado em desenvolvimento — por enquanto, acesse cada canal diretamente.
      </p>
    </div>
  )
}
