import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Google Ads API via REST (sem SDK, para compatibilidade com Edge/Node)
const GOOGLE_ADS_BASE = 'https://googleads.googleapis.com/v18'
const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
const LOGIN_CUSTOMER_ID = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Falha ao obter token Google: ' + JSON.stringify(data))
  return data.access_token
}

async function googleAdsQuery(customerId: string, query: string, accessToken: string) {
  const res = await fetch(`${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': DEVELOPER_TOKEN!,
      ...(LOGIN_CUSTOMER_ID ? { 'login-customer-id': LOGIN_CUSTOMER_ID } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
    next: { revalidate: 300 },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(JSON.stringify(err?.error || err))
  }
  return res.json()
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!DEVELOPER_TOKEN || !process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    return Response.json({ error: 'Google Ads não configurado' }, { status: 503 })
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
    .eq('platform', 'google_ads')
    .single()

  if (!integration) {
    return Response.json({ error: 'Google Ads não configurado para este cliente' }, { status: 404 })
  }

  const { customerId } = integration.config as { customerId: string }
  const cleanId = customerId.replace(/-/g, '')

  try {
    const accessToken = await getAccessToken()

    // Campanhas ativas + métricas dos últimos 30 dias
    const [campaignsRes, metricsRes] = await Promise.allSettled([
      googleAdsQuery(
        cleanId,
        `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type
         FROM campaign
         WHERE campaign.status IN ('ENABLED', 'PAUSED')
         ORDER BY campaign.name`,
        accessToken
      ),
      googleAdsQuery(
        cleanId,
        `SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr,
                metrics.average_cpc, metrics.conversions
         FROM customer
         WHERE segments.date DURING LAST_30_DAYS`,
        accessToken
      ),
    ])

    const campaigns =
      campaignsRes.status === 'fulfilled'
        ? (campaignsRes.value?.results || []).map((r: Record<string, unknown>) => {
            const c = r.campaign as Record<string, unknown>
            return {
              id: c.id,
              name: c.name,
              status: c.status,
              type: c.advertisingChannelType,
            }
          })
        : []

    const activeCampaigns = campaigns.filter((c: { status: string }) => c.status === 'ENABLED').length

    let insights = null
    if (metricsRes.status === 'fulfilled' && metricsRes.value?.results?.[0]) {
      const m = metricsRes.value.results[0].metrics as Record<string, unknown>
      const spend = Number(m.costMicros || 0) / 1_000_000
      const conversions = Number(m.conversions || 0)
      insights = {
        spend: spend.toFixed(2),
        impressions: Number(m.impressions || 0),
        clicks: Number(m.clicks || 0),
        ctr: (Number(m.ctr || 0) * 100).toFixed(2),
        cpc: (Number(m.averageCpc || 0) / 1_000_000).toFixed(2),
        conversions,
        cpa: conversions > 0 ? (spend / conversions).toFixed(2) : null,
      }
    }

    return Response.json({
      client: client.name,
      google: {
        customerId,
        activeCampaigns,
        totalCampaigns: campaigns.length,
        campaigns,
        insights,
        period: 'Últimos 30 dias',
      },
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erro ao buscar dados Google Ads' },
      { status: 502 }
    )
  }
}
