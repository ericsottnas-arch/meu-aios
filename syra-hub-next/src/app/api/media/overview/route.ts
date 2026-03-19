import { vpsGet, jsonResponse, errorResponse } from '@/lib/vps-proxy'

export async function GET() {
  // Fetch clients list + autopilot status in parallel
  const [clientsRes, autopilotRes] = await Promise.all([
    vpsGet('CELO', '/api/clients', 120),
    vpsGet('CELO', '/api/autopilot/status', 60),
  ])

  if (clientsRes.error && autopilotRes.error) {
    return errorResponse('CELO', { clients: [], autopilot: null })
  }

  return jsonResponse({
    clients: clientsRes.data || [],
    autopilot: autopilotRes.data || null,
    error: clientsRes.error || autopilotRes.error || null,
  })
}
