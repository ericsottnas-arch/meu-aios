'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp, DollarSign, UserPlus, Target, AlertCircle, Loader2,
  Play, Pause, Zap, Activity, ChevronRight, BarChart3,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface CeloClient {
  id: string
  name: string
  budget?: { monthly?: number; testingPercentage?: number }
  spreadsheetId?: string
  agency?: boolean
}

interface AutopilotStatus {
  running: boolean
  clients?: Array<{
    clientId: string
    enabled: boolean
    lastRun?: string
    cycleCount?: number
  }>
}

interface Campaign {
  id: string
  name: string
  status: string
  objective?: string
  daily_budget?: number
  lifetime_budget?: number
  insights?: {
    spend?: string
    impressions?: string
    clicks?: string
    cpc?: string
    ctr?: string
    conversions?: string
    cost_per_result?: string
  }
}

export default function MidiaPage() {
  const [clients, setClients] = useState<CeloClient[]>([])
  const [autopilot, setAutopilot] = useState<AutopilotStatus | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/media/overview').then((r) => r.json()),
    ])
      .then(([overview]) => {
        if (overview.error && !overview.clients?.length) {
          setOffline(true)
        }
        // clients can be array or object with keys
        const clientsList = Array.isArray(overview.clients)
          ? overview.clients
          : Object.entries(overview.clients || {}).map(([id, cfg]) => ({
              id,
              ...(cfg as Record<string, unknown>),
            }))
        setClients(clientsList)
        setAutopilot(overview.autopilot)
      })
      .catch(() => setOffline(true))
      .finally(() => setLoading(false))
  }, [])

  function loadCampaigns(clientId: string) {
    setSelectedClient(clientId)
    setLoadingCampaigns(true)
    fetch(`/api/media/campaigns?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data || []
        setCampaigns(list)
      })
      .catch(() => setCampaigns([]))
      .finally(() => setLoadingCampaigns(false))
  }

  const totalBudget = clients.reduce((s, c) => s + (c.budget?.monthly || 0), 0)
  const autopilotRunning = autopilot?.running || false
  const autopilotClients = autopilot?.clients || []
  const enabledClients = autopilotClients.filter((c) => c.enabled).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Mídia Paga
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Gestão de tráfego via CELO — campanhas Meta Ads
        </p>
      </div>

      {offline && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          <AlertCircle size={16} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">
            CELO server (VPS :3002) offline — conecte para ver dados reais.
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
            <StatCard
              icon={DollarSign}
              label="Budget Total/mês"
              value={totalBudget > 0 ? fmt(totalBudget) : '—'}
              color="var(--warning)"
            />
            <StatCard
              icon={UserPlus}
              label="Clientes CELO"
              value={String(clients.length)}
              color="var(--accent)"
            />
            <StatCard
              icon={Zap}
              label="Autopilot"
              value={autopilotRunning ? 'Ativo' : 'Parado'}
              color={autopilotRunning ? 'var(--success)' : 'var(--text-muted)'}
            />
            <StatCard
              icon={Activity}
              label="Clientes c/ Autopilot"
              value={`${enabledClients}/${autopilotClients.length}`}
              color="var(--info)"
            />
          </div>

          {/* Clients Table */}
          {clients.length > 0 ? (
            <div>
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Clientes ({clients.length})
              </h2>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <Th>Cliente</Th>
                      <Th align="right">Budget/mês</Th>
                      <Th align="right">Teste %</Th>
                      <Th align="center">Autopilot</Th>
                      <Th align="center">Campanhas</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c) => {
                      const ap = autopilotClients.find((a) => a.clientId === c.id)
                      return (
                        <tr
                          key={c.id}
                          className="border-b border-[var(--border-faint)] last:border-0 hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                          onClick={() => loadCampaigns(c.id)}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--text-primary)] font-medium">
                                {c.name || c.id}
                              </span>
                              {c.agency && (
                                <span className="text-[9px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded font-semibold uppercase">
                                  Agency
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-[var(--text-muted)]">
                              {c.id}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-[var(--text-secondary)]">
                            {c.budget?.monthly ? fmt(c.budget.monthly) : '—'}
                          </td>
                          <td className="px-5 py-3 text-right text-[var(--text-secondary)]">
                            {c.budget?.testingPercentage
                              ? `${c.budget.testingPercentage}%`
                              : '—'}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {ap ? (
                              ap.enabled ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                                  <Play size={10} /> ON
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                                  <Pause size={10} /> OFF
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] text-[var(--text-muted)]">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <button
                              className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                              onClick={(e) => {
                                e.stopPropagation()
                                loadCampaigns(c.id)
                              }}
                            >
                              <BarChart3 size={12} />
                              Ver
                              <ChevronRight size={12} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="Sem clientes no CELO"
              description="Conecte o server CELO (VPS :3002) para gerenciar campanhas."
            />
          )}

          {/* Campaigns panel */}
          {selectedClient && (
            <div>
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Campanhas — {selectedClient}
              </h2>
              {loadingCampaigns ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
                </div>
              ) : campaigns.length > 0 ? (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)]">
                        <Th>Campanha</Th>
                        <Th align="center">Status</Th>
                        <Th align="right">Gasto</Th>
                        <Th align="right">Impressões</Th>
                        <Th align="right">Clicks</Th>
                        <Th align="right">CTR</Th>
                        <Th align="right">CPC</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b border-[var(--border-faint)] last:border-0 hover:bg-[var(--bg-elevated)] transition-colors"
                        >
                          <td className="px-5 py-3">
                            <p className="text-[var(--text-primary)] font-medium text-xs truncate max-w-[200px]">
                              {c.name}
                            </p>
                            {c.objective && (
                              <p className="text-[10px] text-[var(--text-muted)]">{c.objective}</p>
                            )}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                c.status === 'ACTIVE'
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-neutral-500/15 text-neutral-400'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs text-[var(--text-secondary)]">
                            {c.insights?.spend ? `R$ ${parseFloat(c.insights.spend).toFixed(0)}` : '—'}
                          </td>
                          <td className="px-5 py-3 text-right text-xs text-[var(--text-secondary)]">
                            {c.insights?.impressions ? Number(c.insights.impressions).toLocaleString('pt-BR') : '—'}
                          </td>
                          <td className="px-5 py-3 text-right text-xs text-[var(--text-secondary)]">
                            {c.insights?.clicks || '—'}
                          </td>
                          <td className="px-5 py-3 text-right text-xs text-[var(--text-secondary)]">
                            {c.insights?.ctr ? `${parseFloat(c.insights.ctr).toFixed(2)}%` : '—'}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs text-[var(--text-secondary)]">
                            {c.insights?.cpc ? `R$ ${parseFloat(c.insights.cpc).toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-center">
                  <p className="text-xs text-[var(--text-muted)]">
                    Nenhuma campanha encontrada para este cliente.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({
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
      <p className="text-xl font-display font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  )
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
}) {
  return (
    <th
      className={`px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-${align}`}
    >
      {children}
    </th>
  )
}

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  })
}
