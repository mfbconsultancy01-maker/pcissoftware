import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { heartbeatSeat } from '@/lib/seatManager'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { orgId, sessionId } = body

    if (!orgId || typeof orgId !== 'string' || orgId.length > 128) {
      return NextResponse.json({ error: 'Invalid orgId' }, { status: 400 })
    }
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 128) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
    }

    const success = heartbeatSeat(orgId, sessionId)
    return NextResponse.json({ success })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
