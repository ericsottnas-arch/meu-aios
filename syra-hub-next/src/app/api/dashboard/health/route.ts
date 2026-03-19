import { VPS_PORTS, jsonResponse } from '@/lib/vps-proxy'

const VPS_BASE = process.env.VPS_BASE_URL || 'http://147.79.83.225'

interface ServiceHealth {
  id: string
  name: string
  port: number
  status: 'online' | 'offline'
  uptime?: number
  service?: string
}

async function checkService(name: string, port: number): Promise<ServiceHealth> {
  try {
    const res = await fetch(`${VPS_BASE}:${port}/`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return { id: name.toLowerCase(), name, port, status: 'offline' }
    const data = await res.json()
    return {
      id: name.toLowerCase(),
      name,
      port,
      status: 'online',
      uptime: data.uptime,
      service: data.service,
    }
  } catch {
    return { id: name.toLowerCase(), name, port, status: 'offline' }
  }
}

export async function GET() {
  const checks = Object.entries(VPS_PORTS).map(([name, port]) =>
    checkService(name, port)
  )

  const results = await Promise.all(checks)
  const online = results.filter((r) => r.status === 'online').length

  return jsonResponse({
    services: results,
    summary: { total: results.length, online, offline: results.length - online },
    timestamp: new Date().toISOString(),
  })
}
