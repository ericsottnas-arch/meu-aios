import Link from 'next/link'
import { MapPin, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import type { Client } from '@/lib/supabase/types'

interface ClientCardProps {
  client: Client
}

export function ClientCard({ client }: ClientCardProps) {
  return (
    <Link
      href={`/clientes/${client.slug}`}
      className="group relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 hover:border-[var(--border-base)] transition-colors block"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-semibold text-[var(--text-primary)] truncate">
            {client.name}
          </h3>
          {client.specialty && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
              {client.specialty}
            </p>
          )}
        </div>
        <ChevronRight
          size={16}
          className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors shrink-0 ml-2"
        />
      </div>

      {client.location && (
        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mb-3">
          <MapPin size={12} />
          <span>{client.location}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        <StatusBadge variant={client.status} />
        <StatusBadge variant={client.priority} />
      </div>
    </Link>
  )
}
