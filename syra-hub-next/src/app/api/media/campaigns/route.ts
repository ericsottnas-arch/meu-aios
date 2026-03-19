import { NextRequest } from 'next/server'
import { vpsGet, jsonResponse, errorResponse } from '@/lib/vps-proxy'

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId') || ''
  const path = clientId
    ? `/api/ads/campaigns?platform=meta&clientId=${clientId}`
    : '/api/ads/campaigns?platform=meta'
  const { data, error } = await vpsGet('CELO', path, 120)
  if (error) return errorResponse('CELO', { campaigns: [] })
  return jsonResponse(data)
}
