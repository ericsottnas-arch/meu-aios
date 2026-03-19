import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User, Shield, Clock } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { LogoutButton } from './logout-button'
import type { Profile } from '@/lib/supabase/types'

export default async function ConfigPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = data as Profile | null

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Configurações
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Perfil e preferências
        </p>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
          Perfil
        </h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-[var(--accent-dim)] flex items-center justify-center">
            <span className="font-display text-lg font-bold text-[var(--accent)]">
              {(profile?.full_name || user.email || '?')[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-display text-base font-semibold text-[var(--text-primary)]">
              {profile?.full_name || 'Sem nome'}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
          </div>
        </div>

        <div className="space-y-3">
          <InfoRow icon={User} label="Nome" value={profile?.full_name || '—'} />
          <InfoRow icon={Shield} label="Papel" value={
            <StatusBadge
              variant={profile?.role === 'admin' ? 'premium' : 'standard'}
              label={profile?.role === 'admin' ? 'Admin' : 'Cliente'}
            />
          } />
          <InfoRow icon={Clock} label="Membro desde" value={
            profile ? new Date(profile.created_at).toLocaleDateString('pt-BR', {
              year: 'numeric', month: 'long', day: 'numeric',
            }) : '—'
          } />
        </div>
      </div>

      {/* Session */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
          Sessão
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-primary)]">Encerrar sessão</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Desconectar do Syra Hub
            </p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border-faint)] last:border-0">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-[var(--text-muted)]" />
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
      </div>
      <div className="text-xs text-[var(--text-secondary)]">{value}</div>
    </div>
  )
}
