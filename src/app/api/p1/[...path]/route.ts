// =============================================================================
// PCIS P1 — Server-Side Proxy to Railway Backend
// =============================================================================
// Clerk auth → resolve org → API key → Railway.
// Keeps secrets server-side, never exposed to the browser.
// All P1 backend calls go through this proxy.
//
// TENANT ISOLATION: Each Clerk org is mapped to a P1 backend org UUID via
// the Command Center. No mapping = no access. Never falls back to a default.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

const P1_BACKEND_URL = process.env.P1_BACKEND_URL || 'https://pcisp1-production.up.railway.app'
const SERVICE_API_KEY = process.env.P1_SERVICE_API_KEY || ''
const COMMAND_CENTER_URL = process.env.COMMAND_CENTER_URL || 'https://pcis-command-center.vercel.app'

// ── In-memory cache: Clerk orgId → P1 org UUID ─────────────────────────────
// TTL of 5 minutes to pick up new tenants without hammering Command Center
const orgCache = new Map<string, { p1OrgId: string; resolvedAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

async function resolveOrgId(clerkOrgId: string): Promise<string | null> {
  // Check cache first
  const cached = orgCache.get(clerkOrgId)
  if (cached && Date.now() - cached.resolvedAt < CACHE_TTL_MS) {
    return cached.p1OrgId
  }

  // Call Command Center to resolve
  try {
    const res = await fetch(`${COMMAND_CENTER_URL}/api/franklin/vega`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve-org', clerkOrgId }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.error(`[P1 Proxy] Org resolve failed for clerk=${clerkOrgId}: ${res.status}`)
      orgCache.delete(clerkOrgId) // Clear stale cache on failure
      return null
    }

    const data = await res.json()
    const p1OrgId = data.tenantId

    if (p1OrgId) {
      orgCache.set(clerkOrgId, { p1OrgId, resolvedAt: Date.now() })
      console.log(`[P1 Proxy] Resolved clerk=${clerkOrgId} → p1=${p1OrgId}`)
      return p1OrgId
    }

    return null
  } catch (err) {
    console.error(`[P1 Proxy] Org resolve error for clerk=${clerkOrgId}:`, err)
    // Return cached value if available (even if expired) as fallback during outages
    return cached?.p1OrgId || null
  }
}

// ── Shared handler for all methods ──────────────────────────────────────────

async function proxyToP1(req: NextRequest, params: { path: string[] }) {
  // 1. Check Clerk auth
  const { userId, orgId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Resolve Clerk org → P1 backend org UUID
  if (!orgId) {
    return NextResponse.json(
      { error: 'No organization selected. Please select an organization in your account.' },
      { status: 403 }
    )
  }

  const p1OrgId = await resolveOrgId(orgId)
  if (!p1OrgId) {
    return NextResponse.json(
      { error: 'Your organization is not provisioned for P1 access. Contact your administrator.' },
      { status: 403 }
    )
  }

  // 3. Build target URL
  const pathSegments = params.path.join('/')
  const url = new URL(`/api/${pathSegments}`, P1_BACKEND_URL)

  // Preserve query params
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value)
  })

  // 4. Build headers — inject API key + resolved org ID (server-side only)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': SERVICE_API_KEY,
    'X-Org-Id': p1OrgId,
  }

  // 5. Forward the request
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
