import { createClient } from '@/lib/supabase/server'
import { ClientCard } from '@/components/clients/client-card'
import { ClientFilters } from './client-filters'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('priority', { ascending: true })
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Clientes
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {clients?.length || 0} clientes cadastrados
        </p>
      </div>

      <ClientFilters clients={clients || []} />
    </div>
  )
}
