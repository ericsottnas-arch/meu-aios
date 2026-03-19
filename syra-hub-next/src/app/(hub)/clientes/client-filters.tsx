'use client'

import { useState } from 'react'
import { ClientCard } from '@/components/clients/client-card'
import type { Client } from '@/lib/supabase/types'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'prospect', label: 'Prospects' },
  { value: 'inactive', label: 'Inativos' },
] as const

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'premium', label: 'Premium' },
  { value: 'growth', label: 'Growth' },
  { value: 'standard', label: 'Standard' },
] as const

interface ClientFiltersProps {
  clients: Client[]
}

export function ClientFilters({ clients }: ClientFiltersProps) {
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')

  const filtered = clients.filter((c) => {
    if (status !== 'all' && c.status !== status) return false
    if (priority !== 'all' && c.priority !== priority) return false
    return true
  })

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <FilterGroup
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
        />
        <div className="w-px h-8 bg-[var(--border-subtle)] mx-1 self-center" />
        <FilterGroup
          label="Prioridade"
          options={PRIORITY_OPTIONS}
          value={priority}
          onChange={setPriority}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((client) => (
          <ClientCard key={client.id} client={client} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-[var(--text-muted)] text-center py-12">
          Nenhum cliente encontrado com os filtros selecionados.
        </p>
      )}
    </>
  )
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: ReadonlyArray<{ value: string; label: string }>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mr-1">
        {label}
      </span>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
            value === opt.value
              ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-medium'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
