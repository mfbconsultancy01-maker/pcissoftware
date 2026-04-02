'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/nextjs'
import GateAnimation from './GateAnimation'

// ── Tenant (organization) context ──
interface Tenant {
  id: string
  name: string
  dashboardType: string
  maxSeats: number
  activeSeats: number
}

interface AuthContextType {
  isAuthenticated: boolean
  tenant: Tenant | null
  userId: string | null
  userEmail: string | null
  userName: string | null
  sessionId: string | null
  seatLimitReached: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  tenant: null,
  userId: null,
  userEmail: null,
  userName: null,
  sessionId: null,
  seatLimitReached: false,
  logout: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

// ── Device fingerprint for seat tracking ──
function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server'
  let fp = localStorage.getItem('pcis_device_fp')
  if (!fp) {
    fp = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
    localStorage.setItem('pcis_device_fp', fp)
  }
  return fp
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded: authLoaded, orgId: clerkOrgId } = useClerkAuth()
  const { user, isLoaded: userLoaded } = useUser()
  const { signOut } = useClerk()

  const [showGateAnimation, setShowGateAnimation] = useState(false)
  const [hasShownGate, setHasShownGate] = useState(false)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [seatLimitReached, setSeatLimitReached] = useState(false)
  const [sessionId] = useState(() => `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`)

  // ── Build tenant from Clerk user/org ──
  useEffect(() => {
    if (!isSignedIn || !user) return

    // Use Clerk org if available, otherwise personal workspace
    const orgId = clerkOrgId || `personal_${user.id}`
    const orgName = `${user.firstName || 'User'}'s Workspace`

    // In production, read maxSeats from Clerk org publicMetadata or your DB
    const maxSeats = 5 // Default: 5 terminals per org

    const t: Tenant = {
      id: orgId,
      name: orgName,
      dashboardType: 'standard',
      maxSeats,
      activeSeats: 0,
    }
    setTenant(t)

    // ── Register this terminal seat ──
    registerSeat(orgId, user.id, sessionId)
  }, [isSignedIn, user, clerkOrgId, sessionId])

  // ── Seat registration (Bloomberg model) ──
  async function registerSeat(orgId: string, userId: string, sessId: string) {
    try {
      const fp = getDeviceFingerprint()
      const res = await fetch('/api/seats/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, userId, sessionId: sessId, deviceFingerprint: fp }),
      })

      if (res.status === 429) {
        // Seat limit reached
        setSeatLimitReached(true)
        return
      }

      if (res.ok) {
        const data = await res.json()
        setTenant(prev => prev ? { ...prev, activeSeats: data.activeSeats } : prev)
        setSeatLimitReached(false)
      }
    } catch {
      // API not available yet — allow through for now
      setSeatLimitReached(false)
    }
  }

  // ── Heartbeat: keep seat alive, release on tab close ──
  useEffect(() => {
    if (!isSignedIn || !tenant) return

    const fp = getDeviceFingerprint()

    // Send heartbeat every 60s
    const interval = setInterval(() => {
      fetch('/api/seats/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: tenant.id, sessionId, deviceFingerprint: fp }),
      }).catch(() => {})
    }, 60_000)

    // Release seat on tab close
    const handleUnload = () => {
      navigator.sendBeacon('/api/seats/release', JSON.stringify({
        orgId: tenant.id,
        sessionId,
        deviceFingerprint: fp,
      }))
    }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [isSignedIn, tenant, sessionId])

  // ── Gate animation on first sign-in ──
  useEffect(() => {
    if (isSignedIn && !hasShownGate && authLoaded && userLoaded) {
      const hasSeenGate = sessionStorage.getItem('pcis_gate_shown')
      if (!hasSeenGate) {
        setShowGateAnimation(true)
      } else {
        setHasShownGate(true)
      }
    }
  }, [isSignedIn, authLoaded, userLoaded, hasShownGate])

  function handleAnimationComplete() {
    sessionStorage.setItem('pcis_gate_shown', 'true')
    setShowGateAnimation(false)
    setHasShownGate(true)
  }

  function logout() {
    // Release seat before signing out
    if (tenant) {
      const fp = getDeviceFingerprint()
      navigator.sendBeacon('/api/seats/release', JSON.stringify({
        orgId: tenant.id,
        sessionId,
        deviceFingerprint: fp,
      }))
    }
    signOut()
  }

  // ── Loading state ──
  if (!authLoaded || !userLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-pcis-gold animate-pulse text-lg font-serif">PCIS</div>
      </div>
    )
  }

  // ── Not signed in → Clerk handles redirect to /sign-in ──
  if (!isSignedIn) {
    return <>{children}</>
  }

  // ── Gate animation ──
  if (showGateAnimation && !hasShownGate) {
    return <GateAnimation onComplete={handleAnimationComplete} userName={user?.firstName || 'Agent'} />
  }

  // ── Seat limit reached ──
  if (seatLimitReached) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-[#0a0a0a]/90 border border-red-500/30 rounded-2xl p-10 max-w-lg text-center">
          <h1 className="text-2xl font-serif text-pcis-gold mb-4">Terminal Limit Reached</h1>
          <p className="text-gray-400 mb-2">
            Your organization has reached its maximum number of active terminals
            ({tenant?.maxSeats || 0} seats).
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Close an existing terminal or contact your administrator to add more seats.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => registerSeat(tenant!.id, user!.id, sessionId)}
              className="px-6 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={logout}
              className="px-6 py-2 bg-pcis-gold text-black rounded-lg hover:bg-pcis-gold/90 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated: true,
      tenant,
      userId: user?.id || null,
      userEmail: user?.primaryEmailAddress?.emailAddress || null,
      userName: user?.firstName || null,
      sessionId,
      seatLimitReached,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
