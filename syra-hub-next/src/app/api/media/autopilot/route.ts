import { vpsGet, jsonResponse, errorResponse } from '@/lib/vps-proxy'

export async function GET() {
  const { data, error } = await vpsGet('CELO', '/api/autopilot/status', 60)
  if (error) return errorResponse('CELO', { running: false, clients: [] })
  return jsonResponse(data)
}
