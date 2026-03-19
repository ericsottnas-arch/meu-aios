import { vpsGet, jsonResponse, errorResponse } from '@/lib/vps-proxy'

export async function GET() {
  const { data, error } = await vpsGet('NICO', '/api/monitor/stats', 60)
  if (error) return errorResponse('NICO', { totalMessages: 0, clients: {} })
  return jsonResponse(data)
}
