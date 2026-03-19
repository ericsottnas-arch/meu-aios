import { Wallet, TrendingUp, Users, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function FinanceiroPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Financeiro
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Resumo financeiro da Syra Digital
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <FinCard
          icon={Wallet}
          label="MRR"
          value="—"
          note="Receita recorrente mensal"
          color="var(--accent)"
        />
        <FinCard
          icon={Users}
          label="Clientes Ativos"
          value="11"
          note="Pagantes no mês"
          color="var(--success)"
        />
        <FinCard
          icon={TrendingUp}
          label="Investimento Ads"
          value="—"
          note="Total gerido este mês"
          color="var(--warning)"
        />
        <FinCard
          icon={Receipt}
          label="Fee Médio"
          value="—"
          note="Por cliente"
          color="var(--info)"
        />
      </div>

      {/* Revenue by client placeholder */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
          Receita por Cliente
        </h2>
        <div className="space-y-3">
          {[
            { name: 'Dr. Erico Servano', tier: 'Premium', trend: 'up' },
            { name: 'Dra. Vanessa Soares', tier: 'Premium', trend: 'up' },
            { name: 'Dra. Gabrielle Oliveira', tier: 'Growth', trend: 'up' },
            { name: 'Torre 1', tier: 'Standard', trend: 'stable' },
            { name: 'Humberto Andrade', tier: 'Standard', trend: 'stable' },
            { name: 'Fourcred', tier: 'Standard', trend: 'stable' },
          ].map((client) => (
            <div
              key={client.name}
              className="flex items-center justify-between py-2 border-b border-[var(--border-faint)] last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-primary)]">{client.name}</span>
                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">
                  {client.tier}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {client.trend === 'up' ? (
                  <ArrowUpRight size={12} className="text-emerald-400" />
                ) : (
                  <ArrowDownRight size={12} className="text-[var(--text-muted)]" />
                )}
                <span className="text-xs text-[var(--text-muted)] font-mono">—</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Dados financeiros detalhados serão integrados via planilha ou API de faturamento.
      </p>
    </div>
  )
}

function FinCard({
  icon: Icon,
  label,
  value,
  note,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  note: string
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
      <p className="text-[10px] text-[var(--text-muted)] mt-1">{note}</p>
    </div>
  )
}
