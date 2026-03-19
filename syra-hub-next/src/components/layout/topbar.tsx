'use client'

import { useRouter } from 'next/navigation'
import { Search, LogOut, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'

interface TopbarProps {
  profile: Profile | null
  sidebarCollapsed: boolean
}

export function Topbar({ profile, sidebarCollapsed }: TopbarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : profile?.email?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <header
      className="fixed top-0 right-0 z-20 h-14 flex items-center justify-between gap-4 border-b border-[var(--border-faint)] bg-[var(--bg-surface)]/80 backdrop-blur-md px-6 transition-all"
      style={{ left: sidebarCollapsed ? 60 : 220 }}
    >
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Buscar..."
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)] transition-colors"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors relative">
          <Bell size={17} />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2.5">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-8 h-8 rounded-full border border-[var(--border-subtle)]"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] border border-[var(--accent-border)] flex items-center justify-center text-xs font-semibold text-[var(--accent)]">
              {initials}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-[var(--text-primary)] leading-tight">
              {profile?.full_name || profile?.email}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] capitalize">
              {profile?.role}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-[var(--danger-bg)] text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors"
          title="Sair"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  )
}
