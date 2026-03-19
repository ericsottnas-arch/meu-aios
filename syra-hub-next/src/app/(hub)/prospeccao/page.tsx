'use client'

import { useEffect, useState } from 'react'
import {
  Target, Users, MessageSquare, CheckCircle2, AlertCircle, Loader2,
  Flame, Snowflake, Clock, Activity, Eye, Zap,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface Prospect {
  conversation_id: string
  contact_name: string
  stage: string
  status: string
  score?: number
  messages_sent?: number
  last_followup?: string
  created_at?: string
}

interface Stats {
  success: boolean
  mode?: string
  total_prospects?: number
  active_prospects?: number
  by_stage?: Record<string, number>
  by_status?: Record<string, number>
}

interface HotLead {
  conversation_id: string
  contact_name: string
  score: number
  stage: string
  reason?: string
}

interface Followup {
  conversation_id: string
  contact_name: string
  stage: string
  hours_since?: number
}

const STAGE_COLORS: Record<string, string> = {
  approach: '#60A5FA',
  qualifying: '#F59E0B',
  nurturing: '#A78BFA',
  closing: '#34D399',
  won: '#22C55E',
  lost: '#EF4444',
  paused: '#6B7280',
}

export default function ProspeccaoPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [hotLeads, setHotLeads] = useState<HotLead[]>([])
  const [followups, setFollowups] = useState<Followup[]>([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/prospecting/stats').then((r) => r.json()).catch(() => null),
      fetch('/api/prospecting/prospects').then((r) => r.json()).catch(() => null),
      fetch('/api/prospecting/hot-leads').then((r) => r.json()).catch(() => null),
      fetch('/api/prospecting/followups').then((r) => r.json()).catch(() => null),
    ])
      .then(([statsData, prospectsData, hotData, followupsData]) => {
        if (!statsData?.success && !prospectsData?.success) {
          setOffline(true)
        }
        if (statsData) setStats(statsData)
        if (prospectsData?.data) setProspects(prospectsData.data)
        if (hotData?.data) setHotLeads(hotData.data)
        if (followupsData?.data) setFollowups(followupsData.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const totalProspects = stats?.total_prospects || prospects.length
  const activeProspects = stats?.active_prospects || 0
  const stageMap = stats?.by_stage || {}
  const mode = stats?.mode || 'unknown'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Prospecção
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            IRIS Engine — Prospecção via Instagram DM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-muted)] uppercase">Modo:</span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${
              mode === 'hunter'
                ? 'bg-emerald-500/15 text-emerald-400'
                : mode === 'supervised'
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-neutral-500/15 text-neutral-400'
            }`}
          >
            {mode}
          </span>
        </div>
      </div>

      {offline && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          <AlertCircle size={16} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">
            IRIS server (VPS :3005) offline — conecte para ver dados reais.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={Users} label="Total Prospects" value={String(totalProspects)} color="var(--accent)" />
            <MetricCard icon={Activity} label="Ativos" value={String(activeProspects)} color="var(--info)" />
            <MetricCard icon={Flame} label="Hot Leads" value={String(hotLeads.length)} color="var(--danger)" />
            <MetricCard icon={Clock} label="Follow-ups Pendentes" value={String(followups.length)} color="var(--warning)" />
          </div>

          {/* Stage Pipeline */}
          {Object.keys(stageMap).length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Pipeline por Estágio
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {Object.entries(stageMap).map(([stage, count]) => (
                  <div
                    key={stage}
                    className="min-w-[130px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"
                  >
                    <div
                      className="w-2 h-2 rounded-full mb-2"
                      style={{ backgroundColor: STAGE_COLORS[stage] || '#888' }}
                    />
                    <p className="text-xs text-[var(--text-secondary)] font-medium capitalize">
                      {stage}
                    </p>
                    <p className="text-2xl font-display font-bold text-[var(--text-primary)] mt-1">
                      {count}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hot Leads */}
          {hotLeads.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Flame size={12} className="text-red-400" />
                Hot Leads ({hotLeads.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {hotLeads.slice(0, 9).map((lead) => (
                  <div
                    key={lead.conversation_id}
                    className="rounded-xl border border-red-500/20 bg-red-500/5 p-4"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {lead.contact_name || lead.conversation_id}
                      </p>
                      <span className="text-xs font-bold text-red-400 ml-2">
                        {lead.score}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize"
                      style={{
                        backgroundColor: `${STAGE_COLORS[lead.stage] || '#888'}20`,
                        color: STAGE_COLORS[lead.stage] || '#888',
                      }}
                    >
                      {lead.stage}
                    </span>
                    {lead.reason && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-1.5">{lead.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-ups pendentes */}
          {followups.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock size={12} className="text-amber-400" />
                Follow-ups Pendentes ({followups.length})
              </h2>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Estágio
                      </th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Horas sem contato
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {followups.slice(0, 15).map((f, i) => (
                      <tr
                        key={i}
                        className="border-b border-[var(--border-faint)] last:border-0 hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        <td className="px-5 py-3 text-[var(--text-primary)] font-medium">
                          {f.contact_name || f.conversation_id}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize"
                            style={{
                              backgroundColor: `${STAGE_COLORS[f.stage] || '#888'}20`,
                              color: STAGE_COLORS[f.stage] || '#888',
                            }}
                          >
                            {f.stage}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-[var(--text-secondary)] font-mono">
                          {f.hours_since ? `${f.hours_since}h` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Full prospects list */}
          {prospects.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Todos os Prospects ({prospects.length})
              </h2>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Estágio
                      </th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Msgs
                      </th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {prospects.slice(0, 30).map((p) => (
                      <tr
                        key={p.conversation_id}
                        className="border-b border-[var(--border-faint)] last:border-0 hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        <td className="px-5 py-3 text-[var(--text-primary)] font-medium">
                          {p.contact_name || p.conversation_id}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize"
                            style={{
                              backgroundColor: `${STAGE_COLORS[p.stage] || '#888'}20`,
                              color: STAGE_COLORS[p.stage] || '#888',
                            }}
                          >
                            {p.stage}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span
                            className={`text-[10px] font-semibold ${
                              p.status === 'active'
                                ? 'text-emerald-400'
                                : p.status === 'paused'
                                  ? 'text-amber-400'
                                  : 'text-[var(--text-muted)]'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-[var(--text-secondary)]">
                          {p.messages_sent || 0}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-[var(--text-secondary)]">
                          {p.score ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!offline && prospects.length === 0 && Object.keys(stageMap).length === 0 && (
            <EmptyState
              icon={Target}
              title="Sem prospects no IRIS"
              description="O IRIS Engine ainda não tem prospects cadastrados."
            />
          )}
        </>
      )}
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  color: string
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        <Icon size={14} />
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
      </div>
      <p className="text-xl font-display font-bold" style={{ color }}>{value}</p>
    </div>
  )
}
