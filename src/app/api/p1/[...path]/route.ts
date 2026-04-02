// =============================================================================
// PCIS P1 — Server-Side Proxy to Railway Backend
// =============================================================================
// Clerk auth → API key → Railway. Keeps secrets server-side, never exposed
// to the browser. All P1 backend calls go through this proxy.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

const P1_BACKEND_URL = process.env.P1_BACKEND_URL || 'https://pcisp1-production.up.railway.app'
const SERVICE_API_KEY = process.env.P1_SERVICE_API_KEY || ''
const DEFAULT_ORG_ID = process.env.P1_DEFAULT_ORG_ID || ''

// ── Shared handler for all methods ──────────────────────────────────────────

async function proxyToP1(req: NextRequest, params: { path: string[] }) {
  // 1. Check Clerk auth
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Build target URL
  const pathSegments = params.path.join('/')
  const url = new URL(`/api/${pathSegments}`, P1_BACKEND_URL)

  // Preserve query params
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value)
  })

  // 3. Build headers — inject API key (server-side only, never sent to browser)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': SERVICE_API_KEY,
    'X-Org-Id': DEFAULT_ORG_ID,
  }

  // 4. Forward the request
  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    }

    // Forward body for non-GET requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        const body = await req.text()
        if (body) fetchOptions.body = body
      } catch {
        // No body — that's fine for some POST requests
      }
    }

    const response = await fetch(url.toString(), fetchOptions)
    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (err) {
    console.error(`[P1 Proxy] Error forwarding to ${url.toString()}:`, err)
    return NextResponse.json(
      { success: false, error: 'Backend unavailable' },
      { status: 502 }
    )
  }
}

// ── Export all HTTP methods ──────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyToP1(req, await params)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyToP1(req, await params)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyToP1(req, await params)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyToP1(req, await params)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyToP1(req, await params)
}
