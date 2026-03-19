import { NextResponse } from 'next/server'

const VPS_BASE = process.env.VPS_BASE_URL || 'http://147.79.83.225'

export const VPS_PORTS = {
  NICO: 3001,
  CELO: 3002,
  ALEX: 3003,
  GHL: 3004,
  IRIS: 3005,
  COLD: 3006,
  SWIPE: 3007,
  HUB: 3008,
} as const

type PortName = keyof typeof VPS_PORTS

export async function vpsGet(service: PortName, path: string, revalidate = 60) {
  const port = VPS_PORTS[service]
  const url = `${VPS_BASE}:${port}${path}`

  try {
    const res = await fetch(url, {
      next: { revalidate },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return { data: null, error: `${service} returned ${res.status}` }
    }

    const data = await res.json()
    return { data, error: null }
  } catch {
    return { data: null, error: `${service} unreachable` }
  }
}

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function errorResponse(service: string, fallback: Record<string, unknown> = {}) {
  return NextResponse.json(
    { error: `${service} unavailable`, ...fallback },
    { status: 502 }
  )
}
