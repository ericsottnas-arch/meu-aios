'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import type { Profile } from '@/lib/supabase/types'

interface AppShellProps {
  profile: Profile
  children: React.ReactNode
}

export function AppShell({ profile, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <Sidebar
        role={profile.role}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <Topbar profile={profile} sidebarCollapsed={collapsed} />
      <main
        className="pt-14 transition-all duration-200"
        style={{ marginLeft: collapsed ? 60 : 220 }}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
