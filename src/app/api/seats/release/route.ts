import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { releaseSeat } from '@/lib/seatManager'

// Release endpoint — called via sendBeacon on tab close
// Note: sendBeacon sends as text/plain, so we also handle that
export async function POST(req: NextRequest) {
  try {
    // Validate auth — sendBeacon still sends cookies so Clerk can verify
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: any

    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      // sendBeacon sends as text/plain
      const text = await req.text()
      body = JSON.parse(text)
    }

    const { orgId, sessionId } = body

    if (!orgId || typeof orgId !== 'string' || orgId.length > 128) {
      return NextResponse.json({ error: 'Invalid orgId' }, { status: 400 })
    }
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 128) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
    }

    releaseSeat(orgId, sessionId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 400 })
  }
}
