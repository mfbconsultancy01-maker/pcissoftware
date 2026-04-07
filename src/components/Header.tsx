'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useAuth } from './AuthProvider'

// ============================================================================
// PCIS Header — Rotating Intelligence Ticker
// ============================================================================
// Left:   PCIS gold logo (image) + Tenant name
// Center: Rotating ticker with client-specific system intelligence
// Right:  Clean — no icons, just the ticker extending
// ============================================================================

// ── Ticker Messages ─────────────────────────────────────────────────────

interface TickerItem {
  category: string
  color: string
  message: string
}

function generateTickerItems(userName?: string | null, tenantName?: string | null): TickerItem[] {
  const now = new Date()
  const hour = now.getHours()
  const dayName = now.toLocaleDateString('en-GB', { weekday: 'long' })
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  // Time-aware greeting with user name and tenant
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const nameFragment = userName ? `, ${userName}` : ''
  const tenantFragment = tenantName ? ` · ${tenantName}` : ''

  return [
    // System status
    {
      category: 'SYS',
      color: '#22c55e',
      message: `All 4 engines operational · PCIS P1 running at full capacity`,
    },
    // Time & date with greeting + tenant
    {
      category: 'TIME',
      color: '#d4a574',
      message: `${greeting}${nameFragment} · ${dayName}, ${dateStr}${tenantFragment} · Dubai, UAE`,
    },
    // Client intelligence
    {
      category: 'E1',
      color: '#22c55e',
      message: `Client Intelligence: 24 active profiles · 6 thriving, 10 active, 4 cooling · Avg engagement 52%`,
    },
    // Market intelligence
    {
      category: 'E2',
      color: '#06b6d4',
      message: `Market Intelligence: 18 properties tracked · 8 areas monitored · DLD transactions up 23% YoY`,
    },
    // Matching engine
    {
      category: 'E3',
      color: '#a78bfa',
      message: `Matching Engine: 11 active matches · 47 signals fed · 34% conversion rate this month`,
    },
    // Advisor actions
    {
      category: 'E4',
      color: '#f59e0b',
      message: `Advisor Actions: 5 urgent items · 14 total actions queued · 3 follow-ups due today`,
    },
    // News
    {
      category: 'NWS',
      color: '#22c55e',
      message: `Dubai News: Live feed active · Real estate + financial intelligence from 25+ sources`,
    },
    // SCOUT
    {
      category: 'SCT',
      color: '#06b6d4',
      message: `SCOUT Dashboard: Market signals, emerging areas, and property analytics all online`,
    },
    // Performance
    {
      category: 'PRF',
      color: '#ec4899',
      message: `Flywheel: 47 signals → 22 actions → 18 matches → 34% conversion · Pipeline healthy`,
    },
  ]
}

// ── Ticker Component ─────────────────────────────────────────────────────

function RotatingTicker({ userName, tenantName }: { userName?: string | null; tenantName?: string | null }) {
  const [items, setItems] = useState<TickerItem[]>(() => generateTickerItems(userName, tenantName))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Regenerate items when user/tenant changes (real-time update)
  useEffect(() => {
    setItems(generateTickerItems(userName, tenantName))
  }, [userName, tenantName])

  // Refresh ticker every minute to keep time-aware greeting current
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      setItems(generateTickerItems(userName, tenantName))
    }, 60_000)
    return () => clearInterval(refreshInterval)
  }, [userName, tenantName])

  const advance = useCallback(() => {
    setIsAnimating(true)
    // After fade-out, switch to next item and fade in
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length)
      setIsAnimating(false)
    }, 400)
  }, [items.length])

  useEffect(() => {
    const interval = setInterval(advance, 5000)
    return () => clearInterval(interval)
  }, [advance])

  const current = items[currentIndex]

  return (
    <div className="flex items-center gap-3 overflow-hidden flex-1 justify-center">
      {/* Category badge */}
      <div
        className={`flex items-center gap-1.5 shrink-0 transition-opacity duration-300 ${
          isAnimating ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            backgroundColor: current.color,
            boxShadow: `0 0 6px ${current.color}40`,
          }}
        />
        <span
          className="text-[8px] font-mono font-bold tracking-wider"
          style={{ color: current.color }}
        >
          {current.category}
        </span>
      </div>

      {/* Message */}
      <span
        className={`text-[11px] text-white/50 tracking-wide transition-opacity duration-300 ${
          isAnimating ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {current.message}
      </span>

      {/* Progress dots */}
      <div className="flex items-center gap-1 shrink-0 ml-2">
        {items.map((_, i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i === currentIndex ? current.color : 'rgba(255,255,255,0.1)',
              transform: i === currentIndex ? 'scale(1.3)' : 'scale(1)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main Header ──────────────────────────────────────────────────────────

export default function Header() {
  const { tenant, userName, userEmail, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <header className="h-11 border-b border-white/[0.04] bg-black/40 backdrop-blur-sm flex items-center pl-4 pr-5 relative z-20 flex-shrink-0 gap-5">
      {/* Left — PCIS Logo Image + Tenant */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Image
          src="/pcis-header-logo.png"
          alt="PCIS"
          width={80}
          height={28}
          className="opacity-90"
          priority
        />
        {tenant?.name && (
          <>
            <span className="text-white/20 text-[10px] font-light">×</span>
            <span className="text-[10px] text-[#d4a574]/70 font-medium tracking-wide truncate max-w-[140px]">
              {tenant.name}
            </span>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-white/[0.06] shrink-0" />

      {/* Center — Rotating Ticker */}
      <RotatingTicker userName={userName} tenantName={tenant?.name} />

      {/* Right — User Menu */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/[0.04] transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-[#c9a55a]/20 border border-[#c9a55a]/30 flex items-center justify-center">
            <span className="text-[9px] font-semibold text-[#c9a55a]">{initials}</span>
          </div>
          <svg
            className={`w-3 h-3 text-white/30 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-[#141414] border border-white/[0.08] rounded-lg shadow-xl overflow-hidden z-50">
            {/* User info */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-[11px] font-medium text-white/80 truncate">{userName || 'User'}</p>
              {userEmail && (
                <p className="text-[10px] text-white/30 truncate mt-0.5">{userEmail}</p>
              )}
              {tenant?.name && (
                <p className="text-[10px] text-[#c9a55a]/50 truncate mt-1">{tenant.name}</p>
              )}
            </div>
            {/* Log out */}
            <button
              onClick={() => { setMenuOpen(false); logout() }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-white/[0.04] transition-colors group"
            >
              <svg className="w-3.5 h-3.5 text-white/30 group-hover:text-red-400/70 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9" />
              </svg>
              <span className="text-[11px] text-white/50 group-hover:text-red-400/70 transition-colors">
                Log out
              </span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
