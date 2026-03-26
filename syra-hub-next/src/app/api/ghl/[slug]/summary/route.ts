import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

async function ghlGet(path: string, token: string) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Version: GHL_VERSION,
    },
    next: { revalidate: 120 },
  })
  if (!res.ok) throw new Error(`GHL ${res.status}: ${path}`)
  return res.json()
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!client) {
    return Response.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  const { data: integration } = await supabase
    .from('client_integrations')
    .select('config')
    .eq('client_id', client.id)
    .eq('platform', 'ghl')
    .single()

  if (!integration) {
    return Response.json({ error: 'GHL não configurado para este cliente' }, { status: 404 })
  }

  const { token, locationId, pipelineId } = integration.config as {
    token: string
    locationId: string
    pipelineId?: string
  }

  try {
    // Buscar contatos + pipeline em paralelo
    const [contactsData, pipelineData] = await Promise.allSettled([
      ghlGet(`/contacts/?locationId=${locationId}&limit=1`, token),
      pipelineId
        ? ghlGet(`/opportunities/search?location_id=${locationId}&pipeline_id=${pipelineId}&limit=100`, token)
        : Promise.resolve(null),
    ])

    const totalContacts =
      contactsData.status === 'fulfilled' ? contactsData.value?.meta?.total ?? 0 : 0

    // Leads recentes (últimos 10)
    const recentLeads =
      contactsData.status === 'fulfilled' && contactsData.value?.contacts
        ? contactsData.value.contacts.slice(0, 5).map((c: Record<string, unknown>) => ({
            id: c.id,
            name: c.contactName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Sem nome',
            source: c.source,
            dateAdded: c.dateAdded,
            tags: c.tags,
          }))
        : []

    // Pipeline stages
    let pipeline = null
    if (pipelineData.status === 'fulfilled' && pipelineData.value) {
      const opps = pipelineData.value.opportunities || []
      const stages: Record<string, { name: string; count: number; value: number }> = {}
      for (const opp of opps) {
        const stageId = opp.pipelineStageId || 'unknown'
        const stageName = opp.pipelineStageName || 'Desconhecido'
        if (!stages[stageId]) stages[stageId] = { name: stageName, count: 0, value: 0 }
        stages[stageId].count++
        stages[stageId].value += opp.monetaryValue || 0
      }
      pipeline = {
        total: opps.length,
        stages: Object.values(stages),
        totalValue: opps.reduce((s: number, o: Record<string, unknown>) => s + ((o.monetaryValue as number) || 0), 0),
      }
    }

    return Response.json({
      client: client.name,
      ghl: {
        totalContacts,
        recentLeads,
        pipeline,
        locationId,
      },
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erro ao buscar dados GHL' },
      { status: 502 }
    )
  }
}
