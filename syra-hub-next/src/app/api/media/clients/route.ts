import { vpsGet, jsonResponse, errorResponse } from '@/lib/vps-proxy'

export async function GET() {
  const { data, error } = await vpsGet('CELO', '/api/clients', 120)
  if (error) return errorResponse('CELO', { clients: [] })
  return jsonResponse(data)
}
