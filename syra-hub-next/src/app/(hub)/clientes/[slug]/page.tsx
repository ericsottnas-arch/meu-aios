import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, MapPin, Phone, Mail, Globe, Instagram,
  Palette, ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/ui/status-badge'
import { IntegrationPanels } from '@/components/clients/integration-panels'
import type { Client } from '@/lib/supabase/types'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('slug', slug)
    .single()

  const client = data as Client | null
  if (!client) notFound()

  const contact = client.contact || {}
  const brand = client.brand || {}
  const integrations = client.integrations || {}

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft size={14} />
        Voltar para Clientes
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Brand color swatch */}
        <div
          className="w-14 h-14 rounded-xl border border-[var(--border-subtle)] shrink-0"
          style={{
            backgroundColor: brand.primary_color || 'var(--bg-elevated)',
          }}
        />
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            {client.name}
          </h1>
          {client.specialty && (
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              {client.specialty}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge variant={client.status} />
            <StatusBadge variant={client.priority} />
            {client.location && (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <MapPin size={12} />
                {client.location}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Live Integration Panels */}
      <IntegrationPanels slug={slug} />

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact */}
        <Section title="Contato">
          {Object.keys(contact).length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-2">
              {contact.phone && (
                <ContactRow icon={Phone} label="Telefone" value={contact.phone} />
              )}
              {contact.email && (
                <ContactRow icon={Mail} label="Email" value={contact.email} />
              )}
              {contact.instagram && (
                <ContactRow icon={Instagram} label="Instagram" value={contact.instagram} />
              )}
              {contact.website && (
                <ContactRow icon={Globe} label="Website" value={contact.website} />
              )}
              {/* Render any other contact fields */}
              {Object.entries(contact)
                .filter(([k]) => !['phone', 'email', 'instagram', 'website'].includes(k))
                .map(([k, v]) => (
                  <ContactRow key={k} icon={ExternalLink} label={k} value={v} />
                ))}
            </div>
          )}
        </Section>

        {/* Brand */}
        <Section title="Marca">
          {Object.keys(brand).length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {brand.primary_color && (
                <div className="flex items-center gap-2">
                  <Palette size={14} className="text-[var(--text-muted)]" />
                  <span className="text-xs text-[var(--text-secondary)]">Cor primária</span>
                  <div
                    className="w-5 h-5 rounded border border-[var(--border-subtle)]"
                    style={{ backgroundColor: brand.primary_color }}
                  />
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    {brand.primary_color}
                  </span>
                </div>
              )}
              {brand.secondary_color && (
                <div className="flex items-center gap-2">
                  <Palette size={14} className="text-[var(--text-muted)]" />
                  <span className="text-xs text-[var(--text-secondary)]">Cor secundária</span>
                  <div
                    className="w-5 h-5 rounded border border-[var(--border-subtle)]"
                    style={{ backgroundColor: brand.secondary_color }}
                  />
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    {brand.secondary_color}
                  </span>
                </div>
              )}
              {Object.entries(brand)
                .filter(([k]) => !['primary_color', 'secondary_color'].includes(k))
                .map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)] capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{v}</span>
                  </div>
                ))}
            </div>
          )}
        </Section>

        {/* Integrations */}
        <Section title="Integrações" className="md:col-span-2">
          {Object.keys(integrations).length === 0 ? (
            <Empty />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(integrations).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3"
                >
                  <p className="text-xs font-semibold text-[var(--text-primary)] capitalize">
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono truncate">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Metadata */}
        <Section title="Informações" className="md:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {client.type && (
              <InfoItem label="Tipo" value={client.type} />
            )}
            {client.category && (
              <InfoItem label="Categoria" value={client.category} />
            )}
            <InfoItem label="Criado em" value={new Date(client.created_at).toLocaleDateString('pt-BR')} />
            <InfoItem label="Atualizado em" value={new Date(client.updated_at).toLocaleDateString('pt-BR')} />
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 ${className || ''}`}
    >
      <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
        {title}
      </h2>
      {children}
    </div>
  )
}

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-[var(--text-muted)] shrink-0" />
      <span className="text-xs text-[var(--text-muted)] w-16 shrink-0">{label}</span>
      <span className="text-xs text-[var(--text-secondary)] truncate">{value}</span>
    </div>
  )
}

function Empty() {
  return <p className="text-xs text-[var(--text-muted)]">Nenhuma informação cadastrada</p>
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[var(--text-muted)]">{label}</p>
      <p className="text-[var(--text-secondary)] font-medium mt-0.5">{value}</p>
    </div>
  )
}
