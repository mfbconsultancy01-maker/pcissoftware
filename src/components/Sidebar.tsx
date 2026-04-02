'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/components/AuthProvider'

// ============================================================
// SVG icon components — clean, professional, 15x15 stroke-based
// ============================================================

function IconMorningBrief({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className={active ? 'text-pcis-gold' : 'text-current'}>
      <circle cx="8" cy="9" r="4" stroke="currentColor" strokeWidth="1.3" />
      <line x1="8" y1="1" x2="8" y2="3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="2.5" y1="3.5" x2="3.9" y2="4.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="13.5" y1="3.5" x2="12.1" y2="4.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="1" y1="14" x2="15" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function IconDashboard({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className={active ? 'text-pcis-gold' : 'text-current'}>
      <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function IconClients({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className={active ? 'text-pcis-gold' : 'text-current'}>
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 14c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="11.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1" />
      <path d="M11.5 9.5c1.5 0 3 .8 3 2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

function IconPredictions({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className={active ? 'text-pcis-gold' : 'text-current'}>
      <path d="M2 12l3.5-4 3 2.5L13 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 4h3v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconRelationships({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className={active ? 'text-pcis-gold' : 'text-current'}>
      <circle cx="8" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="3" cy="12" r="2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="13" cy="12" r="2" stroke="currentColor" strokeWidth="1.2" />
      <line x1="6.5" y1="5" x2="4.2" y2="10.2" stroke="currentColor" strokeWidth="1" />
      <line x1="9.5" y1="5" x2="11.8" y2="10.2" stroke="currentColor" strokeWidth="1" />
      <line x1="5" y1="12" x2="11" y2="12" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function IconMatches({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className={active ? 'text-pcis-gold' : 'text-current'}>
      <path d="M5.5 6.5L8 9l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 9.5L8 7l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function IconIntel({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className={active ? 'text-pcis-gold' : 'text-current'}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <ellipse cx="8" cy="8" rx="2.5" ry="6.5" stroke="currentColor" strokeWidth="1" />
      <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function IconReports({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className={active ? 'text-pcis-gold' : 'text-current'}>
      <rect x="2" y="1" width="9" height="13" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <line x1="4.5" y1="4.5" x2="8.5" y2="4.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <line x1="4.5" y1="7" x2="8.5" y2="7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <line x1="4.5" y1="9.5" x2="7" y2="9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M11 5h2a1 1 0 011 1v8a1 1 0 01-1 1H6" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function IconRecommendations({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className={active ? 'text-pcis-gold' : 'text-current'}>
      <path d="M2 3h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M2 13h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M12 11.5l1.5 1.5 2.5-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconPerformance({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className={active ? 'text-pcis-gold' : 'text-current'}>
      <path d="M8 1l2 4.5 5 .5-3.7 3.3L12.3 14 8 11.5 3.7 14l1-4.7L1 6l5-.5L8 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function IconSettings({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className={active ? 'text-pcis-gold' : 'text-current'}>
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconWorkspace({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className={active ? 'text-pcis-gold' : 'text-current'}>
      <rect x="1" y="1" width="6" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9" y="1" width="6" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
      <rect x="1" y="8" width="14" height="7" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
      <line x1="8" y1="8" x2="8" y2="15" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-current">
      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M10.5 4.5L14 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="6" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

// ============================================================
// Navigation structure — 5 groups, 11 items
// ============================================================

const navGroups = [
  {
    label: 'Command',
    items: [
      { name: 'Workspace', href: '/workspace', Icon: IconWorkspace },
    ],
  },
]

// ============================================================
// Sidebar Component
// ============================================================

export default function Sidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className="bg-pcis-black border-r border-white/[0.06] flex flex-col h-full flex-shrink-0 relative z-10 transition-all duration-300 ease-in-out"
      style={{ width: collapsed ? 56 : 200 }}
    >
      {/* Logo + Collapse Toggle */}
      <div className="border-b border-white/[0.06] flex items-center justify-between" style={{ padding: collapsed ? '16px 12px' : '20px' }}>
        {!collapsed && (
          <div>
            <Image src="/Logo.png" alt="PCIS" width={120} height={40} className="opacity-90" />
            <p className="text-[8px] font-semibold text-pcis-text-muted tracking-[0.2em] uppercase mt-1">Advisor Intelligence</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-6 h-6 rounded text-white/30 hover:text-pcis-gold hover:bg-white/[0.04] transition-colors flex-shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            {collapsed ? (
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <div className="px-4 pt-3 pb-1.5">
                <p className="text-[9px] font-semibold text-pcis-text-muted tracking-[0.15em] uppercase">
                  {group.label}
                </p>
              </div>
            )}
            {collapsed && <div className="pt-2" />}
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={`flex items-center transition-colors ${
                      collapsed
                        ? `justify-center py-2.5 mx-2 rounded ${
                            isActive
                              ? 'text-pcis-gold bg-pcis-gold/10'
                              : 'text-pcis-text-secondary hover:text-pcis-text hover:bg-white/[0.03]'
                          }`
                        : `gap-3 px-4 py-2 text-[13px] ${
                            isActive
                              ? 'text-white bg-pcis-gold/10 border-l-2 border-l-pcis-gold'
                              : 'text-pcis-text-secondary hover:text-pcis-text hover:bg-white/[0.03] border-l-2 border-l-transparent'
                          }`
                    }`}
                  >
                    <span className={collapsed ? '' : 'w-5 flex justify-center'}>
                      <item.Icon active={isActive} />
                    </span>
                    {!collapsed && <span className="font-medium">{item.name}</span>}
                  </Link>
                )
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer — AI Status + Logout */}
      <div className="border-t border-pcis-border">
        {/* AI Status */}
        <div className={collapsed ? 'px-2 pt-3 pb-2 flex justify-center' : 'px-4 pt-3 pb-2'}>
          <div className={`flex items-center ${collapsed ? '' : 'gap-2 mb-1'}`}>
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="w-2 h-2 rounded-full bg-green-500 absolute inset-0 animate-ping opacity-40" />
            </div>
            {!collapsed && <span className="text-[10px] font-medium text-green-400">Engines Active</span>}
          </div>
          {!collapsed && <p className="text-[9px] text-pcis-text-muted">PCIS P1 v1.0</p>}
        </div>

        {/* Logout Button */}
        <div className={collapsed ? 'px-2 pb-3' : 'px-3 pb-3'}>
          <button
            onClick={logout}
            title={collapsed ? 'Log out' : undefined}
            className={`flex items-center rounded-md text-pcis-text-muted hover:text-red-400 hover:bg-red-500/[0.06] transition-all text-xs group ${
              collapsed ? 'justify-center w-full py-2' : 'w-full gap-2.5 px-3 py-2'
            }`}
          >
            <IconLogout />
            {!collapsed && <span className="font-medium">Log out</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
