import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { registerSeat, countOrgSeats } from '@/lib/seatManager'

const MAX_FIELD_LENGTH = 128

function isValidString(val: unknown, maxLen = MAX_FIELD_LENGTH): val is string {
  return typeof val === 'string' && val.length > 0 && val.length <= maxLen
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { orgId, sessionId, deviceFingerprint } = body

    if (!isValidString(orgId) || !isValidString(sessionId) || !isValidString(deviceFingerprint)) {
      return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 })
    }

    // In production, read maxSeats from Clerk org metadata or your DB
    // For now, default to 5 seats per org
    const maxSeats = 5

    const result = registerSeat(orgId, userId, sessionId, deviceFingerprint, maxSeats)

    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Seat limit reached', activeSeats: result.activeSeats, maxSeats },
        { status: 429 }
      )
    }

    return NextResponse.json({
      success: true,
      activeSeats: result.activeSeats,
      maxSeats,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
