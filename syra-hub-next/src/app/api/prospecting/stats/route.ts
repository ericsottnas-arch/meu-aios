import { vpsGet, jsonResponse, errorResponse } from '@/lib/vps-proxy'

export async function GET() {
  const { data, error } = await vpsGet('IRIS', '/api/stats', 60)
  if (error) return errorResponse('IRIS', { success: false })
  return jsonResponse(data)
}
