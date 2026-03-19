import { cn } from '@/lib/utils'

type Variant = 'active' | 'onboarding' | 'prospect' | 'inactive' | 'premium' | 'growth' | 'standard'

const VARIANT_STYLES: Record<Variant, string> = {
  active:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  onboarding: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  prospect:   'bg-blue-500/15 text-blue-400 border-blue-500/25',
  inactive:   'bg-neutral-500/15 text-neutral-400 border-neutral-500/25',
  premium:    'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent-border)]',
  growth:     'bg-violet-500/15 text-violet-400 border-violet-500/25',
  standard:   'bg-neutral-500/15 text-neutral-400 border-neutral-500/25',
}

const LABELS: Record<Variant, string> = {
  active: 'Ativo',
  onboarding: 'Onboarding',
  prospect: 'Prospect',
  inactive: 'Inativo',
  premium: 'Premium',
  growth: 'Growth',
  standard: 'Standard',
}

interface StatusBadgeProps {
  variant: Variant
  label?: string
  className?: string
}

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border',
        VARIANT_STYLES[variant],
        className
      )}
    >
      {label || LABELS[variant]}
    </span>
  )
}
