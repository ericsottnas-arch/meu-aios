import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const META_BASE = 'https://graph.facebook.com/v21.0'
const META_TOKEN = process.env.META_ACCESS_TOKEN

async function metaGet(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${META_BASE}${path}`)
  url.searchParams.set('access_token', META_TOKEN!)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url.toString(), { next: { revalidate: 300 } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Meta API ${res.status}`)
  }
  return res.json()
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!META_TOKEN) {
    return Response.json({ error: 'META_ACCESS_TOKEN não configurado' }, { status: 503 })
  }

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
    .eq('platform', 'meta')
    .single()

  if (!integration) {
    return Response.json({ error: 'Meta Ads não configurado para este cliente' }, { status: 404 })
  }

  const { adAccountId } = integration.config as { adAccountId: string; pageId?: string }

  try {
    // Datas: últimos 30 dias
    const today = new Date()
    const since = new Date(today)
    since.setDate(since.getDate() - 30)
    const dateRange = JSON.stringify({
      since: since.toISOString().split('T')[0],
      until: today.toISOString().split('T')[0],
    })

    // Campanhas ativas + insights
    const [campaignsData, insightsData] = await Promise.allSettled([
      metaGet(`/${adAccountId}/campaigns`, {
        fields: 'id,name,status,objective,daily_budget,lifetime_budget',
        limit: '20',
        effective_status: '["ACTIVE","PAUSED"]',
      }),
      metaGet(`/${adAccountId}/insights`, {
        fields: 'spend,impressions,clicks,cpc,ctr,actions',
        date_preset: 'last_30d',
        level: 'account',
      }),
    ])

    const campaigns =
      campaignsData.status === 'fulfilled'
        ? (campaignsData.value?.data || []).map((c: Record<string, unknown>) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            objective: c.objective,
            dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
            lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
          }))
        : []

    const activeCampaigns = campaigns.filter((c: { status: string }) => c.status === 'ACTIVE').length

    let insights = null
    if (insightsData.status === 'fulfilled' && insightsData.value?.data?.[0]) {
      const d = insightsData.value.data[0]
      const leads = (d.actions || []).find((a: Record<string, unknown>) => a.action_type === 'lead')?.value ?? 0
      const messages = (d.actions || []).find((a: Record<string, unknown>) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value ?? 0
      insights = {
        spend: Number(d.spend || 0).toFixed(2),
        impressions: Number(d.impressions || 0),
        clicks: Number(d.clicks || 0),
        cpc: Number(d.cpc || 0).toFixed(2),
        ctr: Number(d.ctr || 0).toFixed(2),
        leads: Number(leads),
        messages: Number(messages),
        cpl: leads > 0 ? (Number(d.spend) / Number(leads)).toFixed(2) : null,
      }
    }

    return Response.json({
      client: client.name,
      meta: {
        adAccountId,
        activeCampaigns,
        totalCampaigns: campaigns.length,
        campaigns,
        insights,
        period: 'Últimos 30 dias',
      },
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erro ao buscar dados Meta' },
      { status: 502 }
    )
  }
}
