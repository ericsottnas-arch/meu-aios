import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AgentInfo {
  id: string
  name: string
  role: string
  description: string
  icon: LucideIcon
  color: string
  department: 'strategy' | 'creative' | 'tech' | 'operations'
}

interface AgentCardProps {
  agent: AgentInfo
}

export function AgentCard({ agent }: AgentCardProps) {
  const Icon = agent.icon
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5',
        'hover:border-[var(--border-base)] transition-colors'
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${agent.color}15`, color: agent.color }}
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
            @{agent.id}
          </h3>
          <p className="text-xs font-medium" style={{ color: agent.color }}>
            {agent.role}
          </p>
        </div>
      </div>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        {agent.description}
      </p>
    </div>
  )
}
