'use client'

import { useEffect, useState } from 'react'
import { Users, TrendingUp, DollarSign, MousePointer, Target, Loader2, AlertCircle, BarChart3 } from 'lucide-react'

// ─── tipos ────────────────────────────────────────────────────────────────────

interface GHLSummary {
  totalContacts: number
  recentLeads: Array<{ id: string; name: string; source: string; dateAdded: string; tags: string[] }>
  pipeline: {
    total: number
    totalValue: number
    stages: Array<{ name: string; count: number; value: number }>
  } | null
}

interface MetaSummary {
  activeCampaigns: number
  totalCampaigns: number
  insights: {
    spend: string
    impressions: number
    clicks: number
    cpc: string
    ctr: string
    leads: number
    messages: number
    cpl: string | null
  } | null
  period: string
}

interface GoogleSummary {
  activeCampaigns: number
  totalCampaigns: number
  insights: {
    spend: string
    impressions: number
    clicks: number
    ctr: string
    cpc: string
    conversions: number
    cpa: string | null
  } | null
  period: string
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | string) {
  return Number(n).toLocaleString('pt-BR')
}
function fmtBRL(n: number | string) {
  return 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── micro componentes ────────────────────────────────────────────────────────

function Stat({ label, value, icon: Icon, color = 'var(--accent)' }: { label: string; value: string; icon: React.ElementType; color?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 flex items-start gap-3">
      <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18`, color }}>
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{value}</p>
      </div>
    </div>
  )
}

function PanelShell({ title, color, children, loading, error }: {
  title: string; color: string; children: React.ReactNode; loading: boolean; error?: string
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold text-[var(--text-primary)]">{title}</span>
        {loading && <Loader2 size={12} className="ml-auto animate-spin text-[var(--text-muted)]" />}
      </div>
      <div className="p-4">
        {error ? (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <AlertCircle size={13} />
            {error}
          </div>
        ) : children}
      </div>
    </div>
  )
}

// ─── painel GHL ───────────────────────────────────────────────────────────────

function GHLPanel({ slug }: { slug: string }) {
  const [data, setData] = useState<GHLSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    fetch(`/api/ghl/${slug}/summary`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d.ghl)
      })
      .catch(() => setError('Falha na conexão'))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <PanelShell title="GHL — CRM" color="#FF9800" loading={loading} error={error}>
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Total Contatos" value={fmt(data.totalContacts)} icon={Users} color="#FF9800" />
            {data.pipeline && (
              <Stat label="Pipeline" value={`${data.pipeline.total} oport.`} icon={BarChart3} color="#FF9800" />
            )}
            {data.pipeline && (
              <Stat label="Valor Pipeline" value={fmtBRL(data.pipeline.totalValue)} icon={DollarSign} color="#FF9800" />
            )}
          </div>
          {data.pipeline && data.pipeline.stages.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Estágios</p>
              <div className="space-y-1.5">
                {data.pipeline.stages.map(s => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)] truncate">{s.name}</span>
                    <span className="font-medium text-[var(--text-primary)] ml-2 shrink-0">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.recentLeads.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Leads Recentes</p>
              <div className="space-y-1.5">
                {data.recentLeads.slice(0, 4).map(l => (
                  <div key={l.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--text-secondary)] truncate">{l.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                      {new Date(l.dateAdded).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PanelShell>
  )
}

// ─── painel Meta Ads ──────────────────────────────────────────────────────────

function MetaPanel({ slug }: { slug: string }) {
  const [data, setData] = useState<MetaSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    fetch(`/api/meta/${slug}/summary`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d.meta)
      })
      .catch(() => setError('Falha na conexão'))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <PanelShell title="Meta Ads" color="#1877F2" loading={loading} error={error}>
      {data && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Campanhas Ativas" value={`${data.activeCampaigns}/${data.totalCampaigns}`} icon={Target} color="#1877F2" />
            {data.insights && <Stat label="Investido 30d" value={fmtBRL(data.insights.spend)} icon={DollarSign} color="#1877F2" />}
            {data.insights && <Stat label="Cliques" value={fmt(data.insights.clicks)} icon={MousePointer} color="#1877F2" />}
            {data.insights && <Stat label="CPC" value={`R$ ${data.insights.cpc}`} icon={TrendingUp} color="#1877F2" />}
            {data.insights && data.insights.leads > 0 && (
              <Stat label="Leads" value={fmt(data.insights.leads)} icon={Users} color="#1877F2" />
            )}
            {data.insights?.cpl && (
              <Stat label="CPL" value={fmtBRL(data.insights.cpl)} icon={Target} color="#1877F2" />
            )}
          </div>
          {data.insights && (
            <p className="text-[10px] text-[var(--text-muted)]">{data.period} · CTR {data.insights.ctr}%</p>
          )}
        </div>
      )}
    </PanelShell>
  )
}

// ─── painel Google Ads ────────────────────────────────────────────────────────

function GooglePanel({ slug }: { slug: string }) {
  const [data, setData] = useState<GoogleSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    fetch(`/api/google/${slug}/summary`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d.google)
      })
      .catch(() => setError('Falha na conexão'))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <PanelShell title="Google Ads" color="#4285F4" loading={loading} error={error}>
      {data && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Campanhas Ativas" value={`${data.activeCampaigns}/${data.totalCampaigns}`} icon={Target} color="#4285F4" />
            {data.insights && <Stat label="Investido 30d" value={fmtBRL(data.insights.spend)} icon={DollarSign} color="#4285F4" />}
            {data.insights && <Stat label="Cliques" value={fmt(data.insights.clicks)} icon={MousePointer} color="#4285F4" />}
            {data.insights && <Stat label="CPC" value={`R$ ${data.insights.cpc}`} icon={TrendingUp} color="#4285F4" />}
            {data.insights && data.insights.conversions > 0 && (
              <Stat label="Conversões" value={fmt(data.insights.conversions)} icon={Users} color="#4285F4" />
            )}
            {data.insights?.cpa && (
              <Stat label="CPA" value={fmtBRL(data.insights.cpa)} icon={Target} color="#4285F4" />
            )}
          </div>
          {data.insights && (
            <p className="text-[10px] text-[var(--text-muted)]">{data.period} · CTR {data.insights.ctr}%</p>
          )}
        </div>
      )}
    </PanelShell>
  )
}

// ─── export principal ─────────────────────────────────────────────────────────

export function IntegrationPanels({ slug }: { slug: string }) {
  return (
    <div className="space-y-3">
      <GHLPanel slug={slug} />
      <MetaPanel slug={slug} />
      <GooglePanel slug={slug} />
    </div>
  )
}
