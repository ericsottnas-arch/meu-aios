import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  className?: string
}

export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
        <Icon size={24} className="text-[var(--text-muted)]" />
      </div>
      <h3 className="font-display text-sm font-semibold text-[var(--text-secondary)]">{title}</h3>
      <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">{description}</p>
    </div>
  )
}
