'use client'

import { useEffect, useState } from 'react'
import { SERVICES } from '@/lib/constants'
import {
  Activity, MessageCircle, TrendingUp, ClipboardList, Zap,
  Target, Mail, Bookmark, Layout, Loader2, RefreshCw,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  MessageCircle, TrendingUp, ClipboardList, Zap,
  Target, Mail, Bookmark, Layout, Activity,
}

function getIcon(name: string) {
  return ICON_MAP[name] || Activity
}

interface ServiceHealth {
  id: string
  name: string
  port: number
  status: 'online' | 'offline'
  uptime?: number
  service?: string
}

interface HealthData {
  services: ServiceHealth[]
  summary: { total: number; online: number; offline: number }
}

interface WhatsAppStats {
  totalMessages: number
  clients: Record<string, { total: number; lastActivity?: string }>
  healthStatus?: string
}

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [waStats, setWaStats] = useState<WhatsAppStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  function fetchData() {
    return Promise.all([
      fetch('/api/dashboard/health').then((r) => r.json()).catch(() => null),
      fetch('/api/dashboard/whatsapp-stats').then((r) => r.json()).catch(() => null),
    ]).then(([h, w]) => {
      if (h?.services) setHealth(h)
      if (w && !w.error) setWaStats(w)
    })
  }

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [])

  function refresh() {
    setRefreshing(true)
    fetchData().finally(() => setRefreshing(false))
  }

  const healthMap = new Map(
    (health?.services || []).map((s) => [s.name.toLowerCase(), s])
  )

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Visão geral dos serviços e métricas
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStat
          label="Serviços Online"
          value={health ? `${health.summary.online}/${health.summary.total}` : '—'}
          color={
            health
              ? health.summary.online === health.summary.total
                ? 'var(--success)'
                : 'var(--warning)'
              : 'var(--text-muted)'
          }
        />
        <QuickStat
          label="WhatsApp Msgs"
          value={waStats ? waStats.totalMessages.toLocaleString('pt-BR') : '—'}
          color="var(--accent)"
        />
        <QuickStat
          label="Clientes Monitorados"
          value={waStats ? String(Object.keys(waStats.clients).length) : '—'}
          color="var(--info)"
        />
        <QuickStat
          label="Health Status"
          value={waStats?.healthStatus || (health ? 'Verificado' : '—')}
          color="var(--success)"
        />
      </div>

      {/* Services grid */}
      <div>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
          Serviços VPS
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SERVICES.map((service) => {
              const Icon = getIcon(service.icon)
              const svcHealth = healthMap.get(service.name.toLowerCase())
              const isOnline = svcHealth?.status === 'online'
              const uptime = svcHealth?.uptime

              return (
                <div
                  key={service.id}
                  className="group relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 hover:border-[var(--border-base)] transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${service.color}15` }}
                    >
                      <Icon size={20} style={{ color: service.color }} />
                    </div>
                    <ServiceStatus online={svcHealth ? isOnline : null} />
                  </div>
                  <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                    {service.name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {service.label}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-[var(--text-muted)] font-mono">
                      :{service.port}
                    </p>
                    {uptime != null && (
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {formatUptime(uptime)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* WhatsApp monitor */}
      {waStats && Object.keys(waStats.clients).length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
            WhatsApp Monitor (NICO)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(waStats.clients).map(([key, data]) => (
              <div
                key={key}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"
              >
                <p className="text-xs font-medium text-[var(--text-primary)] capitalize truncate">
                  {key.replace(/-/g, ' ')}
                </p>
                <p className="text-lg font-display font-bold text-[var(--accent)] mt-1">
                  {data.total.toLocaleString('pt-BR')}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">mensagens</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ServiceStatus({ online }: { online: boolean | null }) {
  if (online === null) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
        <span className="text-[10px] text-[var(--text-muted)]">—</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
        }`}
      />
      <span
        className={`text-[10px] font-medium ${
          online ? 'text-emerald-400' : 'text-red-400'
        }`}
      >
        {online ? 'Online' : 'Offline'}
      </span>
    </div>
  )
}

function QuickStat({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <p className="text-2xl font-display font-bold mt-1" style={{ color }}>
        {value}
      </p>
    </div>
  )
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
