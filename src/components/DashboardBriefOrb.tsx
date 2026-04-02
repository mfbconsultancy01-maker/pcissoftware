'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  getBookHealth,
  getHotPredictions,
  getDecayAlerts,
  getActRecommendations,
  getClient,
  signals,
  engagementMetrics,
} from '@/lib/mockData'

const AIBriefOrb = dynamic(() => import('./AIBriefOrb'), { ssr: false })
const MorningBrief = dynamic(() => import('./MorningBrief'), { ssr: false })

// ══════════════════════════════════════════════════════════════
// PCIS Dashboard Brief Orb
// ══════════════════════════════════════════════════════════════
// Clean orb at the bottom of DSH panel. Click to open the
// expanded brief view, or play the full animated morning brief.
// ══════════════════════════════════════════════════════════════

// ── Expanded brief view (static) ──
function ExpandedBrief({ onClose, onPlayBrief }: { onClose: () => void; onPlayBrief: () => void }) {
  const health = useMemo(() => getBookHealth(), [])
  const hotPreds = useMemo(() => getHotPredictions(), [])
  const decays = useMemo(() => getDecayAlerts(), [])
  const actions = useMemo(() => getActRecommendations(), [])
  const recentSignals = useMemo(() => signals.slice(0, 6), [])

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        className="relative w-[640px] max-h-[80vh] overflow-y-auto bg-pcis-card/95 border border-pcis-gold/15 rounded-2xl shadow-2xl backdrop-blur-xl"
        style={{ boxShadow: '0 40px 100px -30px rgba(212,165,116,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header with orb */}
        <div className="relative flex flex-col items-center pt-8 pb-6 border-b border-pcis-border/20">
          <div className="w-[100px] h-[100px] mb-4">
            <AIBriefOrb speakingAmplitude={0.2} size={100} visible={true} compact={false} />
          </div>
          <h2
            className="text-xl text-white/90 mb-1"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {greeting}
          </h2>
          <p className="text-[10px] text-pcis-text-muted tracking-[0.2em] uppercase">{dateStr}</p>

          {/* Play Brief button */}
          <button
            onClick={(e) => { e.stopPropagation(); onPlayBrief() }}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-pcis-gold/20 bg-pcis-gold/[0.05] hover:bg-pcis-gold/[0.1] hover:border-pcis-gold/30 transition-all group"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-pcis-gold/60 group-hover:text-pcis-gold transition-colors">
              <path d="M3 1.5L10.5 6L3 10.5V1.5Z" fill="currentColor" />
            </svg>
            <span className="text-[10px] uppercase tracking-[0.2em] text-pcis-gold/60 group-hover:text-pcis-gold transition-colors font-mono">
              Play Morning Brief
            </span>
          </button>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-pcis-text-muted/40 hover:text-pcis-text-muted transition-colors text-xs font-mono"
          >
            ESC
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3">
            <BriefStat label="Book Size" value={health.total.toString()} color="#d4a574" />
            <BriefStat label="Health" value={`${health.healthPercent}%`} color={health.healthPercent >= 70 ? '#22c55e' : '#f59e0b'} />
            <BriefStat label="Hot Predictions" value={hotPreds.length.toString()} color="#ef4444" />
            <BriefStat label="Actions Due" value={actions.length.toString()} color="#ef4444" />
          </div>

          {/* Hot predictions */}
          {hotPreds.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-3 rounded-full bg-pcis-gold/40" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-pcis-text-secondary">
                  Hot Predictions
                </span>
              </div>
              <div className="space-y-2">
                {hotPreds.slice(0, 4).map((p, i) => {
                  const client = getClient(p.clientId)
                  return (
                    <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.015] border border-pcis-border/10">
                      <div className="w-7 h-7 rounded-full bg-pcis-gold/10 flex items-center justify-center text-[9px] text-pcis-gold/70 flex-shrink-0">
                        {client?.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] text-white/70">{client?.name}</span>
                        <span className="text-[10px] text-pcis-text-muted ml-2">{p.pattern}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-pcis-gold/10 text-pcis-gold/70">
                        {p.confidence}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Decay alerts */}
          {decays.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-3 rounded-full bg-red-500/40" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-pcis-text-secondary">
                  Engagement Decay
                </span>
              </div>
              <div className="space-y-2">
                {decays.slice(0, 4).map((d, i) => {
                  const client = getClient(d.clientId)
                  return (
                    <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.015] border border-pcis-border/10">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] flex-shrink-0 ${
                        d.status === 'cold' ? 'bg-red-500/10 text-red-400/70' : 'bg-amber-500/10 text-amber-400/70'
                      }`}>
                        {client?.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] text-white/70">{client?.name}</span>
                        <span className={`text-[9px] ml-2 px-1.5 py-0.5 rounded ${
                          d.status === 'cold' ? 'bg-red-500/10 text-red-400/70' : 'bg-amber-500/10 text-amber-400/70'
                        }`}>
                          {d.status}
                        </span>
                      </div>
                      <span className="text-[9px] text-pcis-text-muted font-mono">
                        {d.daysSinceContact}d · {d.decayRate}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent signals */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-3 rounded-full bg-cyan-500/40" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-pcis-text-secondary">
                Latest Signals
              </span>
            </div>
            <div className="space-y-1">
              {recentSignals.map((s, i) => {
                const client = getClient(s.clientId)
                return (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <div className="w-1 h-1 rounded-full bg-pcis-gold/30 flex-shrink-0" />
                    <span className="text-[9px] text-pcis-text-muted w-14 flex-shrink-0 uppercase font-mono">{s.type}</span>
                    <span className="text-[10px] text-white/50 flex-1">{client?.name} — {s.content}</span>
                    <span className="text-[9px] text-pcis-text-muted/40 font-mono">
                      {new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-pcis-border/10 flex items-center justify-center">
          <span className="text-[8px] text-pcis-text-muted/30 font-mono tracking-wider">
            PCIS MORNING BRIEF · ESC TO CLOSE
          </span>
        </div>
      </div>
    </div>
  )
}

function BriefStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-white/[0.015] border border-pcis-border/10">
      <p className="text-[8px] uppercase tracking-[0.15em] text-pcis-text-muted mb-1">{label}</p>
      <p className="text-lg font-light" style={{ color, fontFamily: "'Playfair Display', serif" }}>{value}</p>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════

export default function DashboardBriefOrb() {
  const [expanded, setExpanded] = useState(false)
  const [playingBrief, setPlayingBrief] = useState(false)

  const health = useMemo(() => getBookHealth(), [])
  const hotPreds = useMemo(() => getHotPredictions(), [])
  const decays = useMemo(() => getDecayAlerts(), [])
  const actions = useMemo(() => getActRecommendations(), [])
  const recentSignals = useMemo(() => signals.slice(0, 3), [])
  const heating = useMemo(() => engagementMetrics.filter(e => e.momentum === 'heating').length, [])

  // ESC to close expanded view
  useEffect(() => {
    if (!expanded) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [expanded])

  const handlePlayBrief = () => {
    setExpanded(false)
    setPlayingBrief(true)
  }

  const handleBriefComplete = () => {
    setPlayingBrief(false)
  }

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      {/* Full-width morning brief panel */}
      <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl backdrop-blur-sm overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-pcis-border/20">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-3.5 rounded-full bg-pcis-gold/50" />
            <span className="text-[11px] font-semibold text-pcis-text-secondary uppercase tracking-wider">Morning Brief</span>
          </div>
          <button
            onClick={() => setExpanded(true)}
            className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors"
          >
            View full →
          </button>
        </div>

        {/* Content: orb left, insights right */}
        <div className="flex items-stretch">

          {/* Orb column */}
          <div
            className="flex flex-col items-center justify-center px-6 py-5 cursor-pointer group border-r border-pcis-border/10 hover:bg-pcis-gold/[0.02] transition-colors"
            onClick={() => setExpanded(true)}
            style={{ minWidth: 120 }}
          >
            <div className="transition-transform duration-500 ease-out group-hover:scale-110">
              <AIBriefOrb
                speakingAmplitude={0.05}
                size={70}
                visible={true}
                compact={true}
              />
            </div>
            <span className="text-[8px] text-pcis-text-muted/30 font-mono tracking-wider mt-1">
              {greeting.toUpperCase()}
            </span>
          </div>

          {/* Insights grid */}
          <div className="flex-1 grid grid-cols-3 divide-x divide-pcis-border/10">

            {/* Column 1: Latest Signals */}
            <div className="px-4 py-4">
              <div className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-2.5">Latest Signals</div>
              <div className="space-y-2">
                {recentSignals.map((s, i) => {
                  const client = getClient(s.clientId)
                  const typeColors: Record<string, string> = {
                    viewing: '#22c55e', inquiry: '#06b6d4', meeting: '#a78bfa',
                    feedback: '#f59e0b', referral: '#d4a574', offer: '#22c55e',
                  }
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: typeColors[s.type] || '#6b7280', opacity: 0.6 }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] text-white/50 truncate">{client?.name}</div>
                        <div className="text-[8px] text-pcis-text-muted truncate">{s.content}</div>
                      </div>
                      <span className="text-[7px] font-mono text-pcis-text-muted/40 flex-shrink-0 uppercase">{s.type}</span>
                    </div>
                  )
                })}
                {recentSignals.length === 0 && (
                  <span className="text-[9px] text-pcis-text-muted/30">No recent signals</span>
                )}
              </div>
            </div>

            {/* Column 2: Hot predictions */}
            <div className="px-4 py-4">
              <div className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-2.5">Hot Predictions</div>
              <div className="space-y-2">
                {hotPreds.slice(0, 3).map((p, i) => {
                  const client = getClient(p.clientId)
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-pcis-gold/10 flex items-center justify-center text-[7px] text-pcis-gold/60 flex-shrink-0">
                        {client?.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] text-white/50 truncate">{client?.name}</div>
                        <div className="text-[8px] text-pcis-text-muted truncate">{p.pattern}</div>
                      </div>
                      <span className="text-[8px] font-mono px-1 py-[1px] rounded bg-pcis-gold/10 text-pcis-gold/60 flex-shrink-0">
                        {p.confidence}%
                      </span>
                    </div>
                  )
                })}
                {hotPreds.length === 0 && (
                  <span className="text-[9px] text-pcis-text-muted/30">No active predictions</span>
                )}
              </div>
            </div>

            {/* Column 3: Actions + Play button */}
            <div className="px-4 py-4 flex flex-col">
              <div className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-2.5">Actions Due</div>
              <div className="space-y-2 flex-1">
                {actions.slice(0, 2).map((a, i) => {
                  const client = getClient(a.clientId)
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-[5px] h-[5px] rounded-full bg-red-500/50 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] text-white/50 truncate">{a.title}</div>
                        <div className="text-[8px] text-pcis-text-muted truncate">{client?.name}</div>
                      </div>
                    </div>
                  )
                })}
                {actions.length > 2 && (
                  <span className="text-[8px] text-pcis-text-muted/40">+{actions.length - 2} more</span>
                )}
              </div>

              {/* Play brief button */}
              <button
                onClick={handlePlayBrief}
                className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-pcis-gold/15 bg-pcis-gold/[0.04] hover:bg-pcis-gold/[0.08] hover:border-pcis-gold/25 transition-all group"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-pcis-gold/50 group-hover:text-pcis-gold transition-colors">
                  <path d="M3 1.5L10.5 6L3 10.5V1.5Z" fill="currentColor" />
                </svg>
                <span className="text-[9px] uppercase tracking-[0.15em] text-pcis-gold/50 group-hover:text-pcis-gold transition-colors font-mono">
                  Play Brief
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded brief overlay */}
      {expanded && (
        <ExpandedBrief
          onClose={() => setExpanded(false)}
          onPlayBrief={handlePlayBrief}
        />
      )}

      {/* Full animated morning brief */}
      {playingBrief && (
        <MorningBrief onComplete={handleBriefComplete} />
      )}
    </>
  )
}
