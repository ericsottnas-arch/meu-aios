import { Calendar, Clock, Video, Users } from 'lucide-react'

const TODAY = new Date()
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function CalendarioPage() {
  const year = TODAY.getFullYear()
  const month = TODAY.getMonth()
  const totalDays = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const todayDate = TODAY.getDate()

  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= totalDays; d++) days.push(d)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Calendário
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Agenda e compromissos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <h2 className="font-display text-base font-semibold text-[var(--text-primary)] mb-4">
            {MONTHS[month]} {year}
          </h2>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-[var(--text-muted)] uppercase py-1">
                {d}
              </div>
            ))}
            {days.map((day, i) => (
              <div
                key={i}
                className={`text-center py-2 rounded-lg text-xs transition-colors ${
                  day === null
                    ? ''
                    : day === todayDate
                      ? 'bg-[var(--accent)] text-[var(--text-on-accent)] font-bold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
            Próximos eventos
          </h2>
          <div className="space-y-3">
            <EventPlaceholder
              icon={Video}
              title="Reunião semanal"
              time="Toda segunda, 10:00"
              color="#60A5FA"
            />
            <EventPlaceholder
              icon={Users}
              title="Review de clientes"
              time="Toda quarta, 14:00"
              color="#C084FC"
            />
            <EventPlaceholder
              icon={Clock}
              title="Sprint planning"
              time="Toda sexta, 09:00"
              color="#34D399"
            />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-4">
            Conecte o Google Calendar para sincronizar eventos.
          </p>
        </div>
      </div>
    </div>
  )
}

function EventPlaceholder({
  icon: Icon,
  title,
  time,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  time: string
  color: string
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-surface)]">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}15`, color }}
      >
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xs font-medium text-[var(--text-primary)]">{title}</p>
        <p className="text-[10px] text-[var(--text-muted)]">{time}</p>
      </div>
    </div>
  )
}
