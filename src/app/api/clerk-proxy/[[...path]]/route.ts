import { NextRequest, NextResponse } from 'next/server'

// Proxy all Clerk Frontend API requests through the main domain.
// This avoids third-party script/cookie blocking in Electron shells,
// Safari ITP, ad-blockers, and restrictive CSP environments.

const CLERK_FAPI = 'https://clerk.platformpcissolution.com'

async function proxyHandler(
  req: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  const pathSegments = params.path || []
  const path = pathSegments.join('/')
  const url = new URL(`/${path}`, CLERK_FAPI)

  // Forward query params
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value)
  })

  // Build forwarded headers
  const headers = new Headers()
  const forwardHeaders = [
    'accept',
    'accept-language',
    'content-type',
    'authorization',
    'cookie',
    'user-agent',
    'clerk-backend-api-version',
  ]
  for (const name of forwardHeaders) {
    const val = req.headers.get(name)
    if (val) headers.set(name, val)
  }
  // Transparent proxy — do NOT set X-Forwarded-Host as Clerk
  // rejects it unless proxy mode is explicitly enabled in Dashboard.
  // The fetch to clerk.platformpcissolution.com will use the
  // correct Host header automatically from the URL.

  let body: BodyInit | undefined
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.arrayBuffer()
  }

  // Request uncompressed content so we can stream it directly
  headers.set('Accept-Encoding', 'identity')

  const upstreamRes = await fetch(url.toString(), {
    method: req.method,
    headers,
    body,
    redirect: 'follow',
  })

  // Read the full body to avoid truncation issues with streaming
  const resBody = await upstreamRes.arrayBuffer()

  // Build response headers — forward everything except hop-by-hop
  const resHeaders = new Headers()
  const skipHeaders = new Set([
    'transfer-encoding',
    'connection',
    'keep-alive',
    'content-encoding',
    'content-length',
  ])
  upstreamRes.headers.forEach((value, key) => {
    if (!skipHeaders.has(key.toLowerCase())) {
      resHeaders.set(key, value)
    }
  })

  // Set correct content-length for the uncompressed body
  resHeaders.set('Content-Length', String(resBody.byteLength))

  // Rewrite Set-Cookie domain so cookies work through the proxy
  const cookies = upstreamRes.headers.getSetCookie?.() || []
  if (cookies.length > 0) {
    resHeaders.delete('set-cookie')
    for (const cookie of cookies) {
      const rewritten = cookie.replace(
        /domain=\.?clerk\.platformpcissolution\.com/gi,
        `domain=.platformpcissolution.com`
      )
      resHeaders.append('set-cookie', rewritten)
    }
  }

  return new NextResponse(resBody, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: resHeaders,
  })
}

export const GET = proxyHandler
export const POST = proxyHandler
export const PUT = proxyHandler
export const DELETE = proxyHandler
export const PATCH = proxyHandler
