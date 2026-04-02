// ============================================================================
// PCIS Seat Manager — Bloomberg-style per-terminal licensing
// ============================================================================
// Tracks active "seats" (terminals) per organization. Each seat is identified
// by a combination of orgId + deviceFingerprint + sessionId.
//
// In production, this should be backed by Redis or a database.
// For now, we use an in-memory store (resets on server restart).
// ============================================================================

interface Seat {
  orgId: string
  userId: string
  sessionId: string
  deviceFingerprint: string
  lastHeartbeat: number
  createdAt: number
}

// In-memory seat store — replace with Redis in production
const activeSeats = new Map<string, Seat>()

// Seat timeout: if no heartbeat for 2 minutes, consider seat dead
const SEAT_TIMEOUT_MS = 2 * 60 * 1000

// Default max seats per org (override via Clerk org metadata)
const DEFAULT_MAX_SEATS = 2

function seatKey(orgId: string, sessionId: string): string {
  return `${orgId}::${sessionId}`
}

// Clean up stale seats (no heartbeat within timeout)
function cleanStaleSeats(orgId: string): void {
  const now = Date.now()
  const keys = Array.from(activeSeats.keys())
  for (const key of keys) {
    const seat = activeSeats.get(key)!
    if (seat.orgId === orgId && now - seat.lastHeartbeat > SEAT_TIMEOUT_MS) {
      activeSeats.delete(key)
    }
  }
}

// Count active seats for an organization
export function countOrgSeats(orgId: string): number {
  cleanStaleSeats(orgId)
  let count = 0
  Array.from(activeSeats.values()).forEach(seat => {
    if (seat.orgId === orgId) count++
  })
  return count
}

// Register a new seat — returns { allowed, activeSeats } or throws 429
export function registerSeat(
  orgId: string,
  userId: string,
  sessionId: string,
  deviceFingerprint: string,
  maxSeats: number = DEFAULT_MAX_SEATS
): { allowed: boolean; activeSeats: number } {
  const key = seatKey(orgId, sessionId)

  // If this exact session already registered, update heartbeat
  if (activeSeats.has(key)) {
    const existing = activeSeats.get(key)!
    existing.lastHeartbeat = Date.now()
    return { allowed: true, activeSeats: countOrgSeats(orgId) }
  }

  // Clean stale seats before checking limits
  cleanStaleSeats(orgId)
  const currentCount = countOrgSeats(orgId)

  if (currentCount >= maxSeats) {
    return { allowed: false, activeSeats: currentCount }
  }

  // Register new seat
  activeSeats.set(key, {
    orgId,
    userId,
    sessionId,
    deviceFingerprint,
    lastHeartbeat: Date.now(),
    createdAt: Date.now(),
  })

  return { allowed: true, activeSeats: currentCount + 1 }
}

// Update heartbeat for a seat
export function heartbeatSeat(orgId: string, sessionId: string): boolean {
  const key = seatKey(orgId, sessionId)
  const seat = activeSeats.get(key)
  if (seat) {
    seat.lastHeartbeat = Date.now()
    return true
  }
  return false
}

// Release a seat
export function releaseSeat(orgId: string, sessionId: string): void {
  const key = seatKey(orgId, sessionId)
  activeSeats.delete(key)
}

// Get all active seats for an org (for admin view)
export function getOrgSeats(orgId: string): Seat[] {
  cleanStaleSeats(orgId)
  const seats: Seat[] = []
  Array.from(activeSeats.values()).forEach(seat => {
    if (seat.orgId === orgId) seats.push({ ...seat })
  })
  return seats
}
