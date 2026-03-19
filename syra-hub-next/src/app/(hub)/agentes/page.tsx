import { AgentCard } from '@/components/agents/agent-card'
import { AGENTS, DEPARTMENTS } from '@/lib/agents-data'

export default function AgentesPage() {
  const departments = Object.entries(DEPARTMENTS) as Array<
    [keyof typeof DEPARTMENTS, (typeof DEPARTMENTS)[keyof typeof DEPARTMENTS]]
  >

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Agentes IA
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {AGENTS.length} agentes especializados organizados por departamento
        </p>
      </div>

      {departments.map(([deptKey, dept]) => {
        const deptAgents = AGENTS.filter((a) => a.department === deptKey)
        if (deptAgents.length === 0) return null

        return (
          <div key={deptKey}>
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: dept.color }}
              />
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {dept.label}
              </h2>
              <span className="text-[10px] text-[var(--text-muted)]">
                ({deptAgents.length})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {deptAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
