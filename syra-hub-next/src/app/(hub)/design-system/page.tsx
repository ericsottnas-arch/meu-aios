export default function DesignSystemPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Design System
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Showcase de cores, tipografia e componentes do Syra Hub
        </p>
      </div>

      {/* Colors */}
      <Section title="Cores">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ColorSwatch name="Accent" var="--accent" hex="#C8FF00" />
          <ColorSwatch name="Accent Hover" var="--accent-hover" hex="#D8FF40" />
          <ColorSwatch name="Success" var="--success" hex="#22C55E" />
          <ColorSwatch name="Warning" var="--warning" hex="#F59E0B" />
          <ColorSwatch name="Danger" var="--danger" hex="#EF4444" />
          <ColorSwatch name="Info" var="--info" hex="#60A5FA" />
        </div>
      </Section>

      {/* Backgrounds */}
      <Section title="Backgrounds">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <BgSwatch name="Base" var="--bg-base" />
          <BgSwatch name="Surface" var="--bg-surface" />
          <BgSwatch name="Elevated" var="--bg-elevated" />
          <BgSwatch name="Card" var="--bg-card" />
          <BgSwatch name="Overlay" var="--bg-overlay" />
          <BgSwatch name="Muted" var="--bg-muted" />
        </div>
      </Section>

      {/* Typography */}
      <Section title="Tipografia">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Display — Space Grotesk</p>
            <p className="font-display text-3xl font-bold text-[var(--text-primary)]">
              The quick brown fox
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Body — Inter</p>
            <p className="text-base text-[var(--text-primary)]">
              The quick brown fox jumps over the lazy dog.
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Mono — JetBrains Mono</p>
            <p className="font-mono text-sm text-[var(--text-primary)]">
              const hub = new SyraHub()
            </p>
          </div>
        </div>
      </Section>

      {/* Text Colors */}
      <Section title="Texto">
        <div className="space-y-2">
          <p className="text-sm text-[var(--text-primary)]">Primary — Conteúdo principal</p>
          <p className="text-sm text-[var(--text-secondary)]">Secondary — Conteúdo auxiliar</p>
          <p className="text-sm text-[var(--text-muted)]">Muted — Labels, hints</p>
          <p className="text-sm text-[var(--text-disabled)]">Disabled — Conteúdo inativo</p>
          <p className="text-sm text-[var(--accent)]">Accent — Destaques e CTAs</p>
        </div>
      </Section>

      {/* Borders */}
      <Section title="Bordas">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <BorderSwatch name="Faint" var="--border-faint" />
          <BorderSwatch name="Subtle" var="--border-subtle" />
          <BorderSwatch name="Base" var="--border-base" />
          <BorderSwatch name="Strong" var="--border-strong" />
        </div>
      </Section>

      {/* Spacing */}
      <Section title="Cards">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
            <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">Card Default</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">rounded-xl, border-subtle, bg-card, p-5</p>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 hover:border-[var(--border-base)] transition-colors">
            <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">Card Hover</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">+ hover:border-base transition-colors</p>
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
        {title}
      </h2>
      {children}
    </div>
  )
}

function ColorSwatch({ name, hex }: { name: string; var: string; hex: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
      <div className="h-16" style={{ backgroundColor: hex }} />
      <div className="p-2.5 bg-[var(--bg-card)]">
        <p className="text-xs font-medium text-[var(--text-primary)]">{name}</p>
        <p className="text-[10px] font-mono text-[var(--text-muted)]">{hex}</p>
      </div>
    </div>
  )
}

function BgSwatch({ name, var: cssVar }: { name: string; var: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
      <div className="h-16" style={{ backgroundColor: `var(${cssVar})` }} />
      <div className="p-2.5 bg-[var(--bg-card)]">
        <p className="text-xs font-medium text-[var(--text-primary)]">{name}</p>
        <p className="text-[10px] font-mono text-[var(--text-muted)]">{cssVar}</p>
      </div>
    </div>
  )
}

function BorderSwatch({ name, var: cssVar }: { name: string; var: string }) {
  return (
    <div
      className="rounded-lg p-4 bg-[var(--bg-card)]"
      style={{ border: `2px solid var(${cssVar})` }}
    >
      <p className="text-xs font-medium text-[var(--text-primary)]">{name}</p>
      <p className="text-[10px] font-mono text-[var(--text-muted)]">{cssVar}</p>
    </div>
  )
}
