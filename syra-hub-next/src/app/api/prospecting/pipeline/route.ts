import { vpsGet, jsonResponse, errorResponse } from '@/lib/vps-proxy'

export async function GET() {
  const { data, error } = await vpsGet('IRIS', '/api/pipeline/status', 120)
  if (error) return errorResponse('IRIS', { configured: false })
  return jsonResponse(data)
}
