'use client'

import { useState, useMemo } from 'react'
import {
  clients, properties, matches, matchStages, recommendations, engagementMetrics,
  getClient, getProperty, getEngagement, getClientRecommendations,
  type Match, type MatchStage, type MatchWithStage, type DealStage,
  MATCH_STAGES, matchStageColors,
} from '@/lib/mockData'

// ============================================================
// GRADE COLORS
// ============================================================
const gradeColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  'A+': { bg: 'rgba(212, 165, 116, 0.15)', text: '#d4a574', border: 'rgba(212, 165, 116, 0.4)', glow: 'rgba(212, 165, 116, 0.08)' },
  'A':  { bg: 'rgba(34, 197, 94, 0.12)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)', glow: 'rgba(34, 197, 94, 0.06)' },
  'B+': { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)', glow: 'rgba(59, 130, 246, 0.06)' },
  'B':  { bg: 'rgba(107, 114, 128, 0.12)', text: '#9ca3af', border: 'rgba(107, 114, 128, 0.3)', glow: 'rgba(107, 114, 128, 0.04)' },
  'C':  { bg: 'rgba(239, 68, 68, 0.10)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.25)', glow: 'rgba(239, 68, 68, 0.04)' },
  'D':  { bg: 'rgba(107, 114, 128, 0.08)', text: '#6b7280', border: 'rgba(107, 114, 128, 0.2)', glow: 'rgba(107, 114, 128, 0.03)' },
}

const stageIndex = (s: MatchStage) => MATCH_STAGES.indexOf(s)

function formatAED(n: number): string {
  if (n >= 1_000_000_000) return `AED ${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(0)}M`
  return `AED ${n.toLocaleString()}`
}

function daysAgo(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
}

function timeAgo(iso: string): string {
  const d = daysAgo(iso)
  if (d === 0) return 'Today'
  if (d === 1) return '1d ago'
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}

// ============================================================
// PILLAR BAR COMPONENT
// ============================================================
function PillarBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-pcis-text-muted uppercase tracking-wider w-[60px] text-right flex-shrink-0">{label}</span>
      <div className="flex-1 h-[7px] bg-white/[0.04] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}90, ${color})` }} />
      </div>
      <span className="text-[11px] font-mono w-[32px] text-right font-semibold" style={{ color }}>{pct}%</span>
    </div>
  )
}

// ============================================================
// RADIAL GAUGE (for readiness score)
// ============================================================
function RadialGauge({ value, size = 40, color }: { value: number; size?: number; color: string }) {
  const r = (size - 5) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (value * circumference)
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3.5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3.5}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  )
}

// ============================================================
// MATCH CARD COMPONENT (expanded)
// ============================================================
function MatchCard({ m, expanded, onToggle }: { m: MatchWithStage; expanded: boolean; onToggle: () => void }) {
  const client = getClient(m.clientId)
  const property = getProperty(m.propertyId)
  const engagement = getEngagement(m.clientId)
  const recs = getClientRecommendations(m.clientId).filter(r => r.urgency === 'Act')
  const gc = gradeColors[m.grade] || gradeColors['D']
  const sc = matchStageColors[m.stage]

  if (!client || !property) return null

  const readiness = engagement?.readinessScore ?? 0
  const readinessColor = readiness >= 0.7 ? '#22c55e' : readiness >= 0.4 ? '#f59e0b' : '#ef4444'

  // Preference alignment
  const alignments: { label: string; match: 'full' | 'partial' | 'gap' }[] = []
  const fp = client.financialProfile
  if (property.price >= fp.budgetMin && property.price <= fp.budgetMax) alignments.push({ label: 'Budget', match: 'full' })
  else if (property.price <= fp.budgetMax * 1.2) alignments.push({ label: 'Budget', match: 'partial' })
  else alignments.push({ label: 'Budget', match: 'gap' })

  if (m.pillars.clientFit >= 0.8) alignments.push({ label: 'Lifestyle', match: 'full' })
  else if (m.pillars.clientFit >= 0.6) alignments.push({ label: 'Lifestyle', match: 'partial' })
  else alignments.push({ label: 'Lifestyle', match: 'gap' })

  if (property.bedrooms >= 5) alignments.push({ label: 'Space', match: client.type === 'UHNW' ? 'full' : 'partial' })
  else alignments.push({ label: 'Space', match: client.type === 'UHNW' ? 'gap' : 'full' })

  if (m.pillars.timing >= 0.75) alignments.push({ label: 'Timing', match: 'full' })
  else if (m.pillars.timing >= 0.55) alignments.push({ label: 'Timing', match: 'partial' })
  else alignments.push({ label: 'Timing', match: 'gap' })

  const alignColor = { full: '#22c55e', partial: '#f59e0b', gap: '#ef4444' }

  return (
    <div
      className="rounded-xl border transition-all duration-300 cursor-pointer group overflow-hidden"
      style={{
        borderColor: expanded ? gc.border : 'rgba(255,255,255,0.06)',
        background: expanded ? gc.glow : 'rgba(255,255,255,0.015)',
        borderLeft: `3px solid ${gc.text}`,
      }}
      onClick={onToggle}
    >
      {/* HEADER ROW */}
      <div className="px-5 py-4 flex items-center gap-5 group-hover:bg-white/[0.02] transition-colors">
        {/* Grade badge */}
        <div className="flex-shrink-0 w-[52px] h-[52px] rounded-xl flex items-center justify-center border-2"
          style={{ background: gc.bg, borderColor: gc.border }}>
          <span className="text-[20px] font-bold" style={{ color: gc.text, fontFamily: "'Playfair Display', serif" }}>{m.grade}</span>
        </div>

        {/* Client -> Property */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[15px] font-semibold text-pcis-text truncate">{client.name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md border font-medium" style={{
              color: client.type === 'UHNW' ? '#d4a574' : client.type === 'HNW' ? '#3b82f6' : '#9ca3af',
              borderColor: client.type === 'UHNW' ? 'rgba(212,165,116,0.3)' : 'rgba(59,130,246,0.2)',
              background: client.type === 'UHNW' ? 'rgba(212,165,116,0.08)' : 'rgba(59,130,246,0.06)',
            }}>{client.type}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-pcis-text-muted flex-shrink-0">
              <path d="M6 1L8 4.5L12 5L9 8L10 12L6 10L2 12L3 8L0 5L4 4.5L6 1Z" fill="currentColor" opacity="0.3"/>
            </svg>
            <span className="text-[12px] text-pcis-text-muted truncate">{property.name}</span>
            <span className="text-[10px] text-pcis-text-muted/50">--</span>
            <span className="text-[11px] text-pcis-text-muted/70">{property.area}</span>
          </div>
        </div>

        {/* Chemistry bar */}
        <div className="flex-shrink-0 w-[140px] hidden sm:block">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider">Chemistry</span>
            <span className="text-[13px] font-mono font-bold" style={{ color: gc.text }}>{Math.round(m.overallScore * 100)}%</span>
          </div>
          <div className="h-[6px] bg-white/[0.05] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${m.overallScore * 100}%`, background: `linear-gradient(90deg, ${gc.text}60, ${gc.text})` }} />
          </div>
        </div>

        {/* Stage pill */}
        <div className="flex-shrink-0">
          <span className="text-[10px] px-3 py-1.5 rounded-full font-semibold uppercase tracking-wider"
            style={{ background: `${sc}18`, color: sc, border: `1px solid ${sc}35` }}>
            {m.stage}
          </span>
        </div>

        {/* Readiness gauge */}
        <div className="flex-shrink-0 relative hidden md:flex items-center justify-center">
          <RadialGauge value={readiness} size={44} color={readinessColor} />
          <span className="absolute text-[10px] font-mono font-bold" style={{ color: readinessColor }}>{Math.round(readiness * 100)}</span>
        </div>

        {/* Price */}
        <div className="flex-shrink-0 text-right hidden lg:block">
          <span className="text-[14px] font-mono font-semibold text-pcis-text">{formatAED(property.price)}</span>
          <div className="text-[10px] text-pcis-text-muted mt-0.5">{property.bedrooms} bed -- {property.type}</div>
        </div>

        {/* Chevron */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`flex-shrink-0 text-pcis-text-muted/60 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* EXPANDED CONTENT */}
      {expanded && (() => {
        const sections = m.aiIntelligence.split(' || ').map(s => {
          const colonIdx = s.indexOf(': ')
          if (colonIdx > 0 && colonIdx < 30) {
            return { label: s.slice(0, colonIdx).trim(), text: s.slice(colonIdx + 2).trim() }
          }
          return { label: '', text: s.trim() }
        })

        return (
        <div className="px-5 pb-5 border-t border-white/[0.06] pt-4" onClick={e => e.stopPropagation()}>
          {/* FULL-WIDTH AI INTELLIGENCE -- Hero Section */}
          <div className="mb-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-[4px] h-[18px] rounded-full bg-pcis-gold" />
              <h5 className="text-[11px] text-pcis-gold uppercase tracking-wider font-semibold">Engine 2 Match Intelligence</h5>
              <div className="flex-1 h-px bg-pcis-gold/10" />
              <span className="text-[10px] text-pcis-text-muted font-mono">{Math.round(m.overallScore * 100)}% composite</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sections.map((sec, i) => (
                <div key={i} className={`rounded-lg p-4 border ${
                  sec.label === 'STRATEGY' || sec.label === 'CRITICAL'
                    ? 'border-pcis-gold/25 bg-pcis-gold/[0.04]'
                    : 'border-white/[0.06] bg-white/[0.02]'
                }`}>
                  {sec.label && (
                    <span className={`text-[9px] font-bold uppercase tracking-[0.1em] block mb-2 ${
                      sec.label === 'STRATEGY' || sec.label === 'CRITICAL' ? 'text-pcis-gold' :
                      sec.label === 'WHY THIS MATCH' ? 'text-blue-400' :
                      sec.label === 'CLIENT PSYCHOLOGY' ? 'text-purple-400' :
                      sec.label === 'FINANCIAL CASE' ? 'text-green-400' :
                      sec.label === 'TIMING' ? 'text-amber-400' :
                      'text-pcis-text-muted'
                    }`}>{sec.label}</span>
                  )}
                  <p className="text-[12px] text-pcis-text-secondary leading-[1.7]">{sec.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Required Banner */}
          {recs.length > 0 && (
            <div className="bg-pcis-gold/[0.06] border border-pcis-gold/25 rounded-lg p-4 mb-5">
              <h5 className="text-[10px] text-pcis-gold uppercase tracking-wider font-semibold mb-2">Action Required</h5>
              {recs.map(r => (
                <p key={r.id} className="text-[12px] text-pcis-text-secondary leading-relaxed">
                  <span className="font-semibold text-pcis-gold">{r.title}</span> -- {r.description}
                </p>
              ))}
            </div>
          )}

          {/* BOTTOM GRID -- Analytics + Alignment + Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* COL 1: 4-Pillar Breakdown + Lifecycle */}
            <div className="space-y-4">
              <h5 className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium">4-Pillar Analysis</h5>
              <div className="space-y-2.5">
                <PillarBar label="Client Fit" value={m.pillars.clientFit} color="#3b82f6" />
                <PillarBar label="Financial" value={m.pillars.financial} color="#22c55e" />
                <PillarBar label="Value" value={m.pillars.value} color="#d4a574" />
                <PillarBar label="Timing" value={m.pillars.timing} color="#a78bfa" />
              </div>

              {/* Stage timeline */}
              <div className="mt-4">
                <h5 className="text-[10px] text-pcis-text-muted uppercase tracking-wider mb-2.5 font-medium">Match Lifecycle</h5>
                <div className="flex items-center gap-0.5">
                  {MATCH_STAGES.map((stage, i) => {
                    const isActive = stageIndex(m.stage) >= i
                    const isCurrent = m.stage === stage
                    return (
                      <div key={stage} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full h-[4px] rounded-full transition-colors"
                          style={{ background: isActive ? matchStageColors[stage] : 'rgba(255,255,255,0.06)' }} />
                        {isCurrent && <span className="text-[8px] font-semibold" style={{ color: matchStageColors[stage] }}>{stage}</span>}
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-3 mt-2.5 text-[10px] text-pcis-text-muted">
                  {m.presented && m.presentedAt && <span>Presented {timeAgo(m.presentedAt)}</span>}
                  {m.viewingDate && <span>Viewed {timeAgo(m.viewingDate)}</span>}
                  {m.offerAmount && <span>Offer: {formatAED(m.offerAmount)}</span>}
                </div>
              </div>

              {m.notes && (
                <div className="mt-3">
                  <h5 className="text-[10px] text-pcis-text-muted uppercase tracking-wider mb-1.5 font-medium">Advisor Notes</h5>
                  <p className="text-[11px] text-pcis-text-muted leading-relaxed italic">{m.notes}</p>
                </div>
              )}
            </div>

            {/* COL 2: Preference Alignment */}
            <div className="space-y-4">
              <h5 className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium">Preference Alignment</h5>
              <div className="space-y-2">
                {alignments.map(a => (
                  <div key={a.label} className="flex items-center gap-3">
                    <div className="w-[8px] h-[8px] rounded-full" style={{ background: alignColor[a.match] }} />
                    <span className="text-[12px] text-pcis-text-secondary flex-1">{a.label}</span>
                    <span className="text-[10px] font-semibold uppercase" style={{ color: alignColor[a.match] }}>
                      {a.match === 'full' ? 'Match' : a.match === 'partial' ? 'Partial' : 'Gap'}
                    </span>
                  </div>
                ))}
              </div>

              <h5 className="text-[10px] text-pcis-text-muted uppercase tracking-wider mt-4 font-medium">Property Features</h5>
              <div className="flex flex-wrap gap-1.5">
                {property.features.map(f => (
                  <span key={f} className="text-[10px] px-2.5 py-1 rounded-md bg-white/[0.04] text-pcis-text-muted border border-white/[0.06]">{f}</span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/[0.05]">
                  <span className="text-[9px] text-pcis-text-muted block mb-1">Budget Range</span>
                  <span className="text-[12px] font-mono text-pcis-text">{formatAED(fp.budgetMin)} -- {formatAED(fp.budgetMax)}</span>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/[0.05]">
                  <span className="text-[9px] text-pcis-text-muted block mb-1">Client Readiness</span>
                  <span className="text-[14px] font-mono font-bold" style={{ color: readinessColor }}>{Math.round(readiness * 100)}%</span>
                </div>
              </div>
            </div>

            {/* COL 3: Action Buttons */}
            <div className="space-y-3">
              <h5 className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium">Quick Actions</h5>
              <button className="w-full text-[11px] py-2.5 rounded-lg border border-pcis-gold/30 text-pcis-gold bg-pcis-gold/[0.06] hover:bg-pcis-gold/[0.15] transition-all font-semibold uppercase tracking-wider hover:border-pcis-gold/50">
                Present to Client
              </button>
              <button className="w-full text-[11px] py-2.5 rounded-lg border border-white/10 text-pcis-text-muted bg-white/[0.02] hover:bg-white/[0.06] transition-all font-semibold uppercase tracking-wider hover:border-white/20">
                Schedule Viewing
              </button>
              <button className="w-full text-[11px] py-2.5 rounded-lg border border-white/10 text-pcis-text-muted bg-white/[0.02] hover:bg-white/[0.06] transition-all font-semibold uppercase tracking-wider hover:border-white/20">
                Generate Dossier
              </button>
              <button className="w-full text-[11px] py-2.5 rounded-lg border border-white/10 text-pcis-text-muted bg-white/[0.02] hover:bg-white/[0.06] transition-all font-semibold uppercase tracking-wider hover:border-white/20">
                View Full Profile
              </button>
            </div>
          </div>
        </div>
        )
      })()}
    </div>
  )
}

// ============================================================
// TABLE ROW COMPONENT
// ============================================================
function MatchTableRow({ m, onClick }: { m: MatchWithStage; onClick: () => void }) {
  const client = getClient(m.clientId)
  const property = getProperty(m.propertyId)
  if (!client || !property) return null
  const gc = gradeColors[m.grade] || gradeColors['D']
  const sc = matchStageColors[m.stage]
  const eng = getEngagement(m.clientId)
  const readiness = eng?.readinessScore ?? 0

  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors" onClick={onClick}>
      <td className="py-3 px-4">
        <span className="text-[14px] font-bold px-2 py-1 rounded-md" style={{ color: gc.text, background: gc.bg, fontFamily: "'Playfair Display', serif" }}>{m.grade}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-[12px] text-pcis-text font-medium">{client.name}</span>
        <span className="text-[10px] text-pcis-text-muted ml-2">{client.type}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-[12px] text-pcis-text-secondary">{property.name}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-[12px] font-mono font-semibold" style={{ color: gc.text }}>{Math.round(m.overallScore * 100)}%</span>
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-1">
          {(['clientFit', 'financial', 'value', 'timing'] as const).map(p => (
            <div key={p} className="w-[20px] h-[5px] rounded-full" style={{
              background: m.pillars[p] >= 0.8 ? '#22c55e' : m.pillars[p] >= 0.6 ? '#f59e0b' : '#ef4444',
              opacity: 0.7 + m.pillars[p] * 0.3,
            }} />
          ))}
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ background: `${sc}18`, color: sc, border: `1px solid ${sc}30` }}>{m.stage}</span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="text-[12px] font-mono text-pcis-text-secondary">{Math.round(readiness * 100)}%</span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="text-[12px] font-mono text-pcis-text-secondary">{formatAED(property.price)}</span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="text-[10px] text-pcis-text-muted">{timeAgo(m.stageChangedAt)}</span>
      </td>
    </tr>
  )
}

// ============================================================
// KANBAN CARD
// ============================================================
function KanbanCard({ m }: { m: MatchWithStage }) {
  const client = getClient(m.clientId)
  const property = getProperty(m.propertyId)
  if (!client || !property) return null
  const gc = gradeColors[m.grade] || gradeColors['D']
  const daysSinceChange = daysAgo(m.stageChangedAt)
  const isStalling = daysSinceChange > 5 && m.stage !== 'Closed' && m.stage !== 'Identified'
  const isAtRisk = daysSinceChange > 10 && m.stage !== 'Closed'

  return (
    <div className={`bg-white/[0.03] rounded-lg p-3 border transition-colors hover:bg-white/[0.05] ${isAtRisk ? 'border-red-500/30' : isStalling ? 'border-amber-500/20' : 'border-white/[0.06]'}`}
      style={{ borderLeft: `3px solid ${gc.text}` }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[12px] font-bold px-1.5 py-0.5 rounded" style={{ color: gc.text, background: gc.bg, fontFamily: "'Playfair Display', serif" }}>{m.grade}</span>
        <span className="text-[11px] font-medium text-pcis-text truncate">{client.name}</span>
      </div>
      <p className="text-[10px] text-pcis-text-muted truncate">{property.name}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] font-mono text-pcis-text-secondary">{formatAED(property.price)}</span>
        <span className={`text-[9px] font-mono ${isAtRisk ? 'text-red-400' : isStalling ? 'text-amber-400' : 'text-pcis-text-muted'}`}>
          {daysSinceChange}d
        </span>
      </div>
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function MatchesPage() {
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'pipeline'>('cards')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [gradeFilter, setGradeFilter] = useState<string[]>([])
  const [stageFilter, setStageFilter] = useState<string[]>([])
  const [clientTypeFilter, setClientTypeFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'score' | 'newest' | 'value' | 'readiness' | 'stage'>('score')
  const [searchQuery, setSearchQuery] = useState('')

  // ---- FILTERED + SORTED DATA ----
  const filtered = useMemo(() => {
    let result = [...matchStages]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(m => {
        const c = getClient(m.clientId)
        const p = getProperty(m.propertyId)
        return c?.name.toLowerCase().includes(q) || p?.name.toLowerCase().includes(q) || p?.area.toLowerCase().includes(q)
      })
    }
    if (gradeFilter.length > 0) result = result.filter(m => gradeFilter.includes(m.grade))
    if (stageFilter.length > 0) result = result.filter(m => stageFilter.includes(m.stage))
    if (clientTypeFilter.length > 0) result = result.filter(m => {
      const c = getClient(m.clientId)
      return c && clientTypeFilter.includes(c.type)
    })

    result.sort((a, b) => {
      switch (sortBy) {
        case 'score': return b.overallScore - a.overallScore
        case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'value': {
          const pa = getProperty(a.propertyId)
          const pb = getProperty(b.propertyId)
          return (pb?.price ?? 0) - (pa?.price ?? 0)
        }
        case 'readiness': {
          const ea = getEngagement(a.clientId)
          const eb = getEngagement(b.clientId)
          return (eb?.readinessScore ?? 0) - (ea?.readinessScore ?? 0)
        }
        case 'stage': return stageIndex(b.stage) - stageIndex(a.stage)
        default: return 0
      }
    })

    return result
  }, [searchQuery, gradeFilter, stageFilter, clientTypeFilter, sortBy])

  // ---- COMMAND STRIP METRICS ----
  const totalMatches = matchStages.length
  const activeMatches = matchStages.filter(m => m.stage !== 'Closed').length
  const avgScore = Math.round((matchStages.reduce((s, m) => s + m.overallScore, 0) / totalMatches) * 100)
  const pipelineValue = matchStages.filter(m => m.stage !== 'Closed').reduce((s, m) => {
    const p = getProperty(m.propertyId)
    return s + (p?.price ?? 0)
  }, 0)
  const gradeDistribution = matchStages.reduce((acc, m) => {
    acc[m.grade] = (acc[m.grade] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const closedDeals = matchStages.filter(m => m.stage === 'Closed').length
  const closedValue = matchStages.filter(m => m.stage === 'Closed').reduce((s, m) => {
    const p = getProperty(m.propertyId)
    return s + (p?.price ?? 0)
  }, 0)

  const toggleFilter = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* ZONE 1 -- COMMAND STRIP */}
      {/* ============================================================ */}
      <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[22px] font-bold text-pcis-text" style={{ fontFamily: "'Playfair Display', serif" }}>Match Intelligence</h1>
            <p className="text-[12px] text-pcis-text-muted mt-1">4-Pillar Chemistry Engine -- Client-Property Matching</p>
          </div>
          {/* View mode toggle */}
          <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1 border border-white/[0.05]">
            {(['cards', 'table', 'pipeline'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`text-[11px] px-4 py-2 rounded-md font-semibold uppercase tracking-wider transition-all ${
                  viewMode === mode ? 'bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/30 shadow-sm' : 'text-pcis-text-muted hover:text-pcis-text hover:bg-white/[0.03]'
                }`}>
                {mode === 'cards' ? 'Cards' : mode === 'table' ? 'Table' : 'Pipeline'}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics strip */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider block mb-1">Active Matches</span>
            <span className="text-[24px] font-bold text-pcis-text font-mono">{activeMatches}</span>
            <span className="text-[10px] text-pcis-text-muted ml-1">of {totalMatches}</span>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider block mb-1">Avg Chemistry</span>
            <span className="text-[24px] font-bold font-mono" style={{ color: avgScore >= 75 ? '#22c55e' : '#f59e0b' }}>{avgScore}%</span>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider block mb-1">Grade Distribution</span>
            <div className="flex items-center gap-1.5 mt-1">
              {['A+', 'A', 'B+', 'B'].map(g => (
                <span key={g} className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold" style={{
                  color: gradeColors[g]?.text,
                  background: gradeColors[g]?.bg,
                }}>{g}:{gradeDistribution[g] || 0}</span>
              ))}
            </div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider block mb-1">Pipeline Value</span>
            <span className="text-[16px] font-bold text-pcis-gold font-mono" style={{ fontFamily: "'Playfair Display', serif" }}>{formatAED(pipelineValue)}</span>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider block mb-1">Closed Deals</span>
            <span className="text-[24px] font-bold text-green-400 font-mono">{closedDeals}</span>
            <span className="text-[10px] text-pcis-text-muted ml-1">{formatAED(closedValue)}</span>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider block mb-1">Conversion</span>
            <span className="text-[24px] font-bold text-pcis-text font-mono">{totalMatches > 0 ? Math.round((closedDeals / totalMatches) * 100) : 0}%</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FILTER BAR */}
      {/* ============================================================ */}
      <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-xl px-5 py-3.5">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-shrink-0">
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-pcis-text-muted/50">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search clients or properties..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-4 py-2.5 text-[12px] text-pcis-text placeholder-pcis-text-muted/40 outline-none focus:border-pcis-gold/30 w-[260px] transition-colors"
            />
          </div>

          <div className="w-px h-7 bg-white/[0.08]" />

          {/* Grade pills */}
          <div className="flex items-center gap-2">
            {['A+', 'A', 'B+', 'B'].map(g => {
              const active = gradeFilter.includes(g)
              const gc2 = gradeColors[g]
              return (
                <button key={g} onClick={() => toggleFilter(gradeFilter, g, setGradeFilter)}
                  className="text-[11px] px-3 py-1.5 rounded-lg font-mono font-semibold border transition-all"
                  style={{
                    background: active ? gc2.bg : 'transparent',
                    color: active ? gc2.text : 'rgba(255,255,255,0.25)',
                    borderColor: active ? gc2.border : 'rgba(255,255,255,0.06)',
                  }}>{g}</button>
              )
            })}
          </div>

          <div className="w-px h-7 bg-white/[0.08]" />

          {/* Stage dropdown */}
          <select
            value={stageFilter.length === 1 ? stageFilter[0] : ''}
            onChange={e => setStageFilter(e.target.value ? [e.target.value] : [])}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[11px] text-pcis-text outline-none focus:border-pcis-gold/30"
          >
            <option value="">All Stages</option>
            {MATCH_STAGES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Client type pills */}
          <div className="flex items-center gap-2">
            {['UHNW', 'HNW', 'Affluent'].map(t => {
              const active = clientTypeFilter.includes(t)
              return (
                <button key={t} onClick={() => toggleFilter(clientTypeFilter, t, setClientTypeFilter)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg border transition-all ${
                    active ? 'bg-white/[0.08] text-pcis-text border-white/20' : 'text-white/25 border-white/[0.06] hover:text-white/40'
                  }`}>{t}</button>
              )
            })}
          </div>

          {/* Right side: Sort + Count */}
          <div className="flex items-center gap-3 ml-auto">
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[11px] text-pcis-text outline-none focus:border-pcis-gold/30">
              <option value="score">Best Match</option>
              <option value="newest">Newest</option>
              <option value="value">Highest Value</option>
              <option value="readiness">Client Readiness</option>
              <option value="stage">Furthest Stage</option>
            </select>
            <span className="text-[11px] text-pcis-text-muted font-mono">{filtered.length} results</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ZONE 2 -- CARD VIEW */}
      {/* ============================================================ */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          {filtered.map(m => (
            <MatchCard
              key={m.id}
              m={m}
              expanded={expandedId === m.id}
              onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-12 text-center">
              <p className="text-[13px] text-pcis-text-muted">No matches found for current filters</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ZONE 2 -- TABLE VIEW */}
      {/* ============================================================ */}
      {viewMode === 'table' && (
        <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                {['Grade', 'Client', 'Property', 'Score', 'Pillars', 'Stage', 'Ready', 'Value', 'Updated'].map(h => (
                  <th key={h} className="text-[9px] text-pcis-text-muted uppercase tracking-wider py-3 px-4 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <MatchTableRow key={m.id} m={m} onClick={() => { setViewMode('cards'); setExpandedId(m.id) }} />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-[13px] text-pcis-text-muted">No matches found for current filters</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ZONE 3 -- PIPELINE VIEW (KANBAN) */}
      {/* ============================================================ */}
      {viewMode === 'pipeline' && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {MATCH_STAGES.map(stage => {
            const stageMatches = filtered.filter(m => m.stage === stage)
            const sc2 = matchStageColors[stage]
            return (
              <div key={stage} className="flex-shrink-0 w-[220px]">
                {/* Column header */}
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-[8px] h-[8px] rounded-full" style={{ background: sc2 }} />
                    <span className="text-[10px] font-semibold text-pcis-text uppercase tracking-wider">{stage}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-pcis-text-muted">{stageMatches.length}</span>
                </div>
                {/* Column body */}
                <div className="space-y-2 min-h-[120px] bg-white/[0.01] rounded-lg border border-white/[0.04] p-2.5">
                  {stageMatches.map(m => <KanbanCard key={m.id} m={m} />)}
                  {stageMatches.length === 0 && (
                    <div className="flex items-center justify-center h-[80px]">
                      <span className="text-[10px] text-pcis-text-muted/30">No matches</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
