'use client'

import { useState, useMemo } from 'react'
import {
  recommendations, getClient, getProperty,
  type Recommendation, type RecommendationUrgency, type RecommendationCategory,
} from '@/lib/mockData'

// ============================================================
// CONFIG
// ============================================================
const urgencyConfig: Record<RecommendationUrgency, { label: string; color: string; bgPulse: boolean; icon: string; sortOrder: number }> = {
  Act:     { label: 'ACT NOW',  color: '#ef4444', bgPulse: true,  icon: '!', sortOrder: 0 },
  Monitor: { label: 'MONITOR',  color: '#f59e0b', bgPulse: false, icon: '◉', sortOrder: 1 },
  Prepare: { label: 'PREPARE',  color: '#3b82f6', bgPulse: false, icon: '◈', sortOrder: 2 },
}

const categoryConfig: Record<RecommendationCategory, { label: string; color: string; icon: string }> = {
  Property:     { label: 'Property',     color: '#d4a574', icon: '⌂' },
  Market:       { label: 'Market',       color: '#22c55e', icon: '◆' },
  Portfolio:    { label: 'Portfolio',     color: '#3b82f6', icon: '▦' },
  Relationship: { label: 'Relationship', color: '#a78bfa', icon: '⋈' },
}

const impactColors: Record<string, string> = {
  High:   '#ef4444',
  Medium: '#f59e0b',
  Low:    '#3b82f6',
}

// ============================================================
// HELPERS
// ============================================================
function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ============================================================
// RECOMMENDATION CARD
// ============================================================
function RecommendationCard({ rec, expanded, onToggle }: { rec: Recommendation; expanded: boolean; onToggle: () => void }) {
  const uc = urgencyConfig[rec.urgency]
  const cc = categoryConfig[rec.category]
  const client = getClient(rec.clientId)
  const property = rec.propertyId ? getProperty(rec.propertyId) : null

  return (
    <div
      className="rounded-xl border transition-all duration-300 cursor-pointer group overflow-hidden"
      style={{
        borderColor: expanded ? `${uc.color}50` : 'rgba(255,255,255,0.06)',
        borderLeft: `3px solid ${uc.color}`,
        background: expanded ? `${uc.color}06` : 'rgba(255,255,255,0.015)',
      }}
      onClick={onToggle}
    >
      {/* Header Row */}
      <div className="px-5 py-4 flex items-center gap-4 group-hover:bg-white/[0.02] transition-colors">
        {/* Confidence ring */}
        <div className="flex-shrink-0 relative">
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <circle
              cx="24" cy="24" r="20" fill="none"
              stroke={uc.color}
              strokeWidth="3"
              strokeDasharray={`${rec.confidence * 125.6} 125.6`}
              strokeLinecap="round"
              transform="rotate(-90 24 24)"
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
            <text x="24" y="21" textAnchor="middle" fill={uc.color} fontSize="12" fontWeight="800" fontFamily="monospace">{uc.icon}</text>
            <text x="24" y="33" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontFamily="monospace">{Math.round(rec.confidence * 100)}%</text>
          </svg>
        </div>

        {/* Title + client -> property */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[14px] font-semibold text-pcis-text truncate">{rec.title}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Category badge */}
            <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ color: cc.color, background: `${cc.color}12`, border: `1px solid ${cc.color}20` }}>
              {cc.icon} {cc.label}
            </span>
            {/* Client -> Property chain */}
            {client && (
              <span className="text-[11px] text-pcis-text-secondary font-medium">{client.name}</span>
            )}
            {property && (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" className="text-pcis-gold/60 flex-shrink-0"><path d="M4 6h4M6.5 4L8.5 6L6.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="text-[11px] text-pcis-text-muted">{property.name}</span>
              </>
            )}
            {/* Timeframe */}
            <span className="text-[9px] px-2 py-0.5 rounded-full font-medium" style={{ color: uc.color, background: `${uc.color}10`, border: `1px solid ${uc.color}20` }}>
              {rec.timeframe}
            </span>
          </div>
        </div>

        {/* Impact + Date */}
        <div className="flex-shrink-0 flex items-center gap-3">
          <span className="text-[9px] px-2 py-1 rounded-md font-bold uppercase tracking-wider" style={{ color: impactColors[rec.impact], background: `${impactColors[rec.impact]}12`, border: `1px solid ${impactColors[rec.impact]}20` }}>
            {rec.impact}
          </span>
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-pcis-text-muted">{formatDate(rec.createdAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex gap-2" onClick={e => e.stopPropagation()}>
          <button className="text-[10px] px-3 py-1.5 rounded-lg border border-pcis-gold/30 text-pcis-gold bg-pcis-gold/[0.06] hover:bg-pcis-gold/[0.15] transition-all font-semibold uppercase tracking-wider">
            Execute
          </button>
        </div>

        {/* Chevron */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`flex-shrink-0 text-pcis-text-muted/60 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* ============================================================ */}
      {/* EXPANDED VIEW */}
      {/* ============================================================ */}
      {expanded && (
        <div className="border-t border-white/[0.06]" onClick={e => e.stopPropagation()}>
          {/* Description */}
          <div className="px-5 pt-4 pb-3">
            <p className="text-[12px] text-pcis-text-secondary leading-[1.7]">{rec.description}</p>
          </div>

          {/* Metrics Strip */}
          <div className="px-5 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-white/[0.03] rounded-lg px-3 py-2.5 border border-white/[0.05]">
                <span className="text-[8px] text-pcis-text-muted uppercase tracking-wider block mb-0.5">Confidence</span>
                <span className="text-[14px] font-bold font-mono" style={{ color: rec.confidence >= 0.8 ? '#22c55e' : rec.confidence >= 0.7 ? '#f59e0b' : '#ef4444' }}>
                  {Math.round(rec.confidence * 100)}%
                </span>
              </div>
              <div className="bg-white/[0.03] rounded-lg px-3 py-2.5 border border-white/[0.05]">
                <span className="text-[8px] text-pcis-text-muted uppercase tracking-wider block mb-0.5">Timeframe</span>
                <span className="text-[14px] font-bold font-mono" style={{ color: uc.color }}>{rec.timeframe}</span>
              </div>
              <div className="bg-white/[0.03] rounded-lg px-3 py-2.5 border border-white/[0.05]">
                <span className="text-[8px] text-pcis-text-muted uppercase tracking-wider block mb-0.5">Impact</span>
                <span className="text-[14px] font-bold font-mono" style={{ color: impactColors[rec.impact] }}>{rec.impact}</span>
              </div>
              <div className="bg-white/[0.03] rounded-lg px-3 py-2.5 border border-white/[0.05]">
                <span className="text-[8px] text-pcis-text-muted uppercase tracking-wider block mb-0.5">Category</span>
                <span className="text-[14px] font-bold font-mono" style={{ color: cc.color }}>{cc.label}</span>
              </div>
            </div>
          </div>

          {/* 4-Panel Intel Grid */}
          <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: 'WHY NOW', text: rec.whyNow, color: '#3b82f6' },
              { label: 'EXPECTED OUTCOME', text: rec.expectedOutcome, color: '#22c55e' },
              { label: 'CLIENT CONTEXT', text: rec.clientContext, color: '#a78bfa' },
              { label: 'NEXT STEPS', text: rec.nextSteps, color: '#d4a574' },
            ].map((section, i) => (
              <div key={i} className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.05]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-[3px] h-[12px] rounded-full" style={{ background: section.color }} />
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: section.color }}>{section.label}</span>
                </div>
                <p className="text-[11px] text-pcis-text-secondary leading-[1.7]">{section.text}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="px-5 pb-5 flex gap-2 flex-wrap">
            <button className="text-[11px] px-4 py-2 rounded-lg border border-pcis-gold/30 text-pcis-gold bg-pcis-gold/[0.06] hover:bg-pcis-gold/[0.15] transition-all font-semibold uppercase tracking-wider">
              Execute Action
            </button>
            {rec.relatedReportId && (
              <button className="text-[11px] px-4 py-2 rounded-lg border border-white/10 text-pcis-text-muted bg-white/[0.02] hover:bg-white/[0.06] transition-all font-semibold uppercase tracking-wider">
                View Report
              </button>
            )}
            {rec.matchId && (
              <button className="text-[11px] px-4 py-2 rounded-lg border border-white/10 text-pcis-text-muted bg-white/[0.02] hover:bg-white/[0.06] transition-all font-semibold uppercase tracking-wider">
                View Match
              </button>
            )}
            <button className="text-[11px] px-4 py-2 rounded-lg border border-white/10 text-pcis-text-muted bg-white/[0.02] hover:bg-white/[0.06] transition-all font-semibold uppercase tracking-wider">
              Snooze 7 Days
            </button>
            <button className="text-[11px] px-4 py-2 rounded-lg border border-white/10 text-pcis-text-muted/60 bg-white/[0.01] hover:bg-white/[0.04] transition-all font-semibold uppercase tracking-wider">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function RecommendationsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [urgencyFilter, setUrgencyFilter] = useState<RecommendationUrgency | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<RecommendationCategory | 'all'>('all')

  // Filtered + grouped
  const filtered = useMemo(() => {
    let result = [...recommendations]
    if (urgencyFilter !== 'all') result = result.filter(r => r.urgency === urgencyFilter)
    if (categoryFilter !== 'all') result = result.filter(r => r.category === categoryFilter)
    return result.sort((a, b) => urgencyConfig[a.urgency].sortOrder - urgencyConfig[b.urgency].sortOrder)
  }, [urgencyFilter, categoryFilter])

  const grouped = useMemo(() => {
    const groups: Record<RecommendationUrgency, Recommendation[]> = { Act: [], Monitor: [], Prepare: [] }
    filtered.forEach(r => groups[r.urgency].push(r))
    return groups
  }, [filtered])

  // Stats
  const actCount = recommendations.filter(r => r.urgency === 'Act').length
  const monitorCount = recommendations.filter(r => r.urgency === 'Monitor').length
  const prepareCount = recommendations.filter(r => r.urgency === 'Prepare').length
  const avgConfidence = recommendations.reduce((s, r) => s + r.confidence, 0) / recommendations.length
  const totalImpactValue = recommendations.filter(r => r.propertyId).reduce((s, r) => {
    const p = r.propertyId ? getProperty(r.propertyId) : null
    return s + (p?.price ?? 0)
  }, 0)

  // Counts for filter pills
  const urgencyCounts: Record<string, number> = { Act: actCount, Monitor: monitorCount, Prepare: prepareCount }
  const categoryCounts = recommendations.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* HEADER + STATS */}
      {/* ============================================================ */}
      <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[22px] font-bold text-pcis-text" style={{ fontFamily: "'Playfair Display', serif" }}>Recommendations</h1>
            <p className="text-[12px] text-pcis-text-muted mt-1">AI-prioritized action queue -- Act, Monitor, Prepare</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[8px] h-[8px] rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-pcis-text-muted">Engine 2 Active</span>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider block mb-1">Act Now</span>
            <span className="text-[24px] font-bold font-mono" style={{ color: '#ef4444' }}>{actCount}</span>
            <span className="text-[10px] text-pcis-text-muted ml-1">urgent</span>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider block mb-1">Monitor</span>
            <span className="text-[24px] font-bold font-mono" style={{ color: '#f59e0b' }}>{monitorCount}</span>
            <span className="text-[10px] text-pcis-text-muted ml-1">watching</span>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider block mb-1">Prepare</span>
            <span className="text-[24px] font-bold font-mono" style={{ color: '#3b82f6' }}>{prepareCount}</span>
            <span className="text-[10px] text-pcis-text-muted ml-1">upcoming</span>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider block mb-1">Avg Confidence</span>
            <span className="text-[24px] font-bold text-green-400 font-mono">{Math.round(avgConfidence * 100)}%</span>
            <span className="text-[10px] text-pcis-text-muted ml-1">engine score</span>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider block mb-1">Pipeline Impact</span>
            <span className="text-[16px] font-bold text-pcis-gold font-mono" style={{ fontFamily: "'Playfair Display', serif" }}>
              AED {(totalImpactValue / 1_000_000_000).toFixed(1)}B
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FILTER BAR */}
      {/* ============================================================ */}
      <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-xl px-5 py-3.5">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Urgency filters */}
          <button
            onClick={() => setUrgencyFilter('all')}
            className={`text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all ${
              urgencyFilter === 'all' ? 'bg-white/[0.08] text-pcis-text border border-white/20' : 'text-white/30 border border-transparent hover:text-white/50'
            }`}
          >All</button>
          {(['Act', 'Monitor', 'Prepare'] as RecommendationUrgency[]).map(u => {
            const uc = urgencyConfig[u]
            const count = urgencyCounts[u] || 0
            const active = urgencyFilter === u
            return (
              <button key={u} onClick={() => setUrgencyFilter(active ? 'all' : u)}
                className="text-[11px] px-3 py-1.5 rounded-lg font-semibold border transition-all flex items-center gap-1.5"
                style={{
                  background: active ? `${uc.color}15` : 'transparent',
                  color: active ? uc.color : 'rgba(255,255,255,0.25)',
                  borderColor: active ? `${uc.color}30` : 'rgba(255,255,255,0.06)',
                }}
              >
                {uc.label}
                <span className="text-[9px] font-mono opacity-60">{count}</span>
              </button>
            )
          })}

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* Category filters */}
          {(Object.keys(categoryConfig) as RecommendationCategory[]).map(cat => {
            const cc = categoryConfig[cat]
            const count = categoryCounts[cat] || 0
            if (count === 0) return null
            const active = categoryFilter === cat
            return (
              <button key={cat} onClick={() => setCategoryFilter(active ? 'all' : cat)}
                className="text-[11px] px-3 py-1.5 rounded-lg font-semibold border transition-all flex items-center gap-1.5"
                style={{
                  background: active ? `${cc.color}15` : 'transparent',
                  color: active ? cc.color : 'rgba(255,255,255,0.20)',
                  borderColor: active ? `${cc.color}30` : 'rgba(255,255,255,0.04)',
                }}
              >
                {cc.icon} {cc.label}
                <span className="text-[9px] font-mono opacity-60">{count}</span>
              </button>
            )
          })}

          <div className="ml-auto text-[11px] text-pcis-text-muted font-mono">{filtered.length} actions</div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* URGENCY-GROUPED CARD LIST */}
      {/* ============================================================ */}
      {(['Act', 'Monitor', 'Prepare'] as RecommendationUrgency[]).map(urgency => {
        const items = grouped[urgency]
        if (items.length === 0) return null
        const uc = urgencyConfig[urgency]

        return (
          <div key={urgency}>
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-3 mt-2">
              <div className="flex items-center gap-2">
                {uc.bgPulse && <div className="w-[8px] h-[8px] rounded-full animate-pulse" style={{ background: uc.color }} />}
                {!uc.bgPulse && <div className="w-[8px] h-[8px] rounded-full" style={{ background: uc.color, opacity: 0.6 }} />}
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: uc.color }}>{uc.label}</span>
                <span className="text-[10px] font-mono text-pcis-text-muted/50">{items.length}</span>
              </div>
              <div className="flex-1 h-px" style={{ background: `${uc.color}15` }} />
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {items.map(rec => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  expanded={expandedId === rec.id}
                  onToggle={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                />
              ))}
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-12 text-center">
          <p className="text-[13px] text-pcis-text-muted">No recommendations match the selected filters</p>
        </div>
      )}

      {/* ============================================================ */}
      {/* ENGINE INTELLIGENCE FOOTER */}
      {/* ============================================================ */}
      <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-[4px] h-[18px] rounded-full bg-purple-400" />
          <h2 className="text-[14px] font-semibold text-pcis-text">How Engine 2 Generates Recommendations</h2>
          <div className="flex-1 h-px bg-purple-400/10" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              title: 'Behavioral Pattern Detection',
              description: 'Engine 2 continuously monitors client signals: viewing frequency, call duration changes, document requests, browsing telemetry, and response latency. When patterns match known pre-purchase, disengagement, or pivot templates, recommendations are generated automatically.',
              metric: '12 patterns tracked',
              color: '#3b82f6',
            },
            {
              title: 'Time-Sensitivity Analysis',
              description: 'Each recommendation is assigned an urgency level based on decay modeling. "Act" items have confirmed time-sensitive triggers (client momentum peaks, negotiation windows, engagement decay deadlines). "Monitor" items track evolving signals. "Prepare" items anticipate future opportunities.',
              metric: '3 urgency tiers',
              color: '#f59e0b',
            },
            {
              title: 'Network Effect Mapping',
              description: 'Recommendations factor in cross-client relationships and social proof cascades. A single successful close can catalyze 2-3 additional transactions through network effects. Engine 2 identifies these chains and prioritizes actions with multiplier potential.',
              metric: 'AED 345M cascade identified',
              color: '#22c55e',
            },
          ].map((item, i) => (
            <div key={i} className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-[8px] h-[8px] rounded-full" style={{ background: item.color }} />
                <span className="text-[12px] font-semibold text-pcis-text">{item.title}</span>
              </div>
              <p className="text-[10px] text-pcis-text-muted leading-relaxed mb-3">{item.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-medium" style={{ color: item.color }}>{item.metric}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
