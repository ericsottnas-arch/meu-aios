'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Bot, Users, Calendar, Inbox, Target,
  BarChart3, Wallet, FileText, Plug, Palette, Settings,
  ChevronLeft,
} from 'lucide-react'
import { SECTIONS, ADMIN_ONLY_SECTIONS, type SectionId } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/supabase/types'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard, Bot, Users, Calendar, Inbox, Target,
  BarChart3, Wallet, FileText, Plug, Palette, Settings,
}

interface SidebarProps {
  role: UserRole
  collapsed: boolean
  onToggle: () => void
}

function sectionToPath(id: SectionId): string {
  if (id === 'dashboard') return '/'
  return `/${id}`
}

export function Sidebar({ role, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  const visibleSections = SECTIONS.filter(
    (s) => role === 'admin' || !ADMIN_ONLY_SECTIONS.includes(s.id)
  )

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-[var(--border-faint)] bg-[var(--bg-surface)] transition-all duration-200',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-[var(--border-faint)]">
        {!collapsed && (
          <span className="font-display text-lg font-bold text-[var(--text-primary)] tracking-tight">
            Syra<span className="text-[var(--accent)]">Hub</span>
          </span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors"
        >
          <ChevronLeft size={16} className={cn('transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {visibleSections.map((section) => {
          const Icon = ICON_MAP[section.icon]
          const href = sectionToPath(section.id)
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))

          return (
            <Link
              key={section.id}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? section.name : undefined}
            >
              {Icon && <Icon size={18} />}
              {!collapsed && <span>{section.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[var(--border-faint)]">
        {!collapsed && (
          <p className="text-[10px] text-[var(--text-muted)] text-center">
            Syra Digital &copy; 2026
          </p>
        )}
      </div>
    </aside>
  )
}
