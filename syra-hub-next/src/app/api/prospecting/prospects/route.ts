import { vpsGet, jsonResponse, errorResponse } from '@/lib/vps-proxy'

export async function GET() {
  const { data, error } = await vpsGet('IRIS', '/api/prospects?limit=100', 60)
  if (error) return errorResponse('IRIS', { success: false, data: [] })
  return jsonResponse(data)
}
