'use client'

import React, { useMemo } from 'react'
import {
  engineMatches,
  clientPurposes,
  getEngineSummary,
  PURPOSE_CONFIGS,
  type EngineMatch,
  type ClientPurpose,
} from '@/lib/engineData'
import { getClient, getProperty } from '@/lib/mockData'
import { useWorkspaceNav, ClientLink, PropertyLink } from '../useWorkspaceNav'

// ═══════════════════════════════════════════════════════════════════════════
// E3 ENGINE POWER DASHBOARD -- Purpose-Aware Matching Engine
//
// Layout mirrors E1 CIE, E2 SCOUT, and E4 FORGE:
// StatsBar -> SubPanel Cards -> Analytics Row -> Match Watchlist -> Bottom Row
// ═══════════════════════════════════════════════════════════════════════════

// ── Formatting ──────────────────────────────────────────────────────────

const ago = (ts: string) => {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ── Color Utilities ─────────────────────────────────────────────────────

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e'
  if (score >= 65) return '#f59e0b'
  if (score >= 50) return '#06b6d4'
  return '#ef4444'
}

const getScoreTextColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 65) return 'text-amber-400'
  if (score >= 50) return 'text-cyan-400'
  return 'text-red-400'
}

const getGradeColor = (grade: string): string => {
  switch (grade) {
    case 'A+': return '#D4A574'
    case 'A': return '#10B981'
    case 'B+': return '#06B6D4'
    case 'B': return '#3B82F6'
    case 'C': return '#F59E0B'
    case 'D': return '#EF4444'
    default: return '#9ca3af'
  }
}

const getGradeTextColor = (grade: string): string => {
  switch (grade) {
    case 'A+': return 'text-[#D4A574]'
    case 'A': return 'text-emerald-400'
    case 'B+': return 'text-cyan-400'
    case 'B': return 'text-blue-400'
    case 'C': return 'text-amber-400'
    case 'D': return 'text-red-400'
    default: return 'text-white/70'
  }
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return '#06b6d4'
    case 'presented': return '#f59e0b'
    case 'shortlisted': return '#22c55e'
    case 'rejected': return '#ef4444'
    case 'converted': return '#D4A574'
    default: return '#9ca3af'
  }
}

// ── SVG Components ──────────────────────────────────────────────────────

function DonutChart({ data, size = 80, strokeWidth = 10 }: { data: { label: string; value: number; color: string }[]; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const total = data.reduce((s, d) => s + d.value, 0)
  let acc = 0
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
      {data.filter(d => d.value > 0).map((d, i) => {
        const pct = d.value / total
        const dashLen = pct * circ
        const dashOff = -acc * circ
        acc += pct
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={strokeWidth}
            strokeDasharray={`${dashLen} ${circ - dashLen}`} strokeDashoffset={dashOff}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        )
      })}
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill="#ffffff" fontSize="14" fontWeight="bold" fontFamily="Inter, sans-serif">{total}</text>
    </svg>
  )
}

function ScoreRing({ score, size = 36, strokeWidth = 3 }: { score: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = getScoreColor(score)
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="9" fontWeight="bold" fontFamily="monospace">{score}</text>
    </svg>
  )
}

function MiniSparkline({ data, color = '#a78bfa', width = 80, height = 24 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={width} height={height}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── PCIS Card Wrappers ──────────────────────────────────────────────────

function Panel({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={`bg-white/[0.02] border border-pcis-border/30 rounded-xl backdrop-blur-sm overflow-hidden ${onClick ? 'cursor-pointer hover:border-pcis-gold/20 transition-colors' : ''} ${className}`}
      onClick={onClick}>
      {children}
    </div>
  )
}

function PanelHeader({ title, accent, right }: { title: string; accent?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-pcis-border/20">
      <div className="flex items-center gap-2">
        {accent && <div className="w-[3px] h-3.5 rounded-full" style={{ backgroundColor: accent }} />}
        <span className="text-[11px] font-semibold text-pcis-text-secondary uppercase tracking-wider">{title}</span>
      </div>
      {right}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// TOP STATS BAR
// ═══════════════════════════════════════════════════════════════════════════

function ENGINEStatsBar() {
  const summary = getEngineSummary()

  const stats = [
    { label: 'Total Matches', value: `${summary.totalMatches}`, color: '#a78bfa' },
    { label: 'Avg Score', value: `${summary.avgScore}`, color: getScoreColor(summary.avgScore) },
    { label: 'Conversion', value: `${summary.conversionRate}%`, color: '#C9A55A' },
    { label: 'Active', value: `${summary.activeMatches}`, color: '#06b6d4' },
    { label: 'Top Purpose', value: summary.topPurpose, color: '#f59e0b' },
    { label: 'A+ Grades', value: `${summary.gradeBreakdown['A+'] || 0}`, color: '#D4A574' },
    { label: 'Shortlisted', value: `${summary.statusBreakdown['shortlisted'] || 0}`, color: '#22c55e' },
    { label: 'Clients', value: `${clientPurposes.length}`, color: '#a78bfa' },
  ]

  return (
    <div className="flex items-center gap-5 text-[10px] flex-wrap">
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <div className="w-px h-3 bg-pcis-border/30" />}
          <div className="flex items-center gap-1.5">
            <span className="text-pcis-text-muted">{s.label}:</span>
            <span className="font-mono font-semibold" style={{ color: s.color }}>{s.value}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// SUB-PANEL CARDS -- Gateway to all ENGINE workspace panels
// ═══════════════════════════════════════════════════════════════════════════

function ENGINESubPanelCards() {
  const nav = useWorkspaceNav()
  const summary = getEngineSummary()

  const panels = [
    {
      code: 'EPM', title: 'Purpose Matrix',
      desc: 'Client-to-purpose mapping with confidence scores and investment intent classification',
      metric: `${clientPurposes.length} clients`,
      sub: '6 purpose categories',
      color: '#a78bfa',
      onClick: () => nav.openPanelByType('engine-purpose-matrix', 'tab'),
    },
    {
      code: 'EMS', title: 'Match Scorer',
      desc: '4-pillar deep-dive scoring: Financial Fit, Lifestyle Fit, Investment Fit, Purpose Alignment',
      metric: `${summary.totalMatches} matches`,
      sub: `Avg ${summary.avgScore}/100`,
      color: '#D4A574',
      onClick: () => nav.openPanelByType('engine-match-scorer', 'tab'),
    },
    {
      code: 'ECP', title: 'Client-Property Grid',
      desc: 'Matrix view of top clients vs top properties with score heatmap and grade overlay',
      metric: 'Heatmap view',
      sub: 'Cross-reference grid',
      color: '#06b6d4',
      onClick: () => nav.openPanelByType('engine-client-property', 'tab'),
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {panels.map(p => (
        <Panel key={p.code} onClick={p.onClick} className="group hover:border-opacity-50 transition-all">
          <div className="px-3 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color, opacity: 0.7 }} />
                <span className="text-[9px] font-mono font-bold" style={{ color: p.color }}>{p.code}</span>
              </div>
              <span className="text-[7px] text-pcis-text-muted/40 group-hover:text-pcis-gold/60 transition-colors">{'\u2192'}</span>
            </div>
            <div className="text-[11px] font-semibold text-white/80 mb-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>
              {p.title}
            </div>
            <div className="text-[8px] text-pcis-text-muted leading-relaxed mb-2 line-clamp-2">{p.desc}</div>
            <div className="text-[9px] text-pcis-text-secondary font-mono">{p.metric}</div>
            <div className="text-[8px] text-pcis-text-muted mt-0.5">{p.sub}</div>
          </div>
        </Panel>
      ))}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS ROW -- Purpose Distribution, Grade Distribution, Status Pipeline
// ═══════════════════════════════════════════════════════════════════════════

function ENGINEAnalyticsRow() {
  const summary = getEngineSummary()

  const purposeDonut = useMemo(() =>
    PURPOSE_CONFIGS.map(p => ({
      label: p.label,
      value: summary.purposeBreakdown[p.id] || 0,
      color: p.color,
    })).filter(d => d.value > 0),
  [summary])

  const gradeDonut = useMemo(() => [
    { label: 'A+', value: summary.gradeBreakdown['A+'] || 0, color: '#D4A574' },
    { label: 'A', value: summary.gradeBreakdown['A'] || 0, color: '#10B981' },
    { label: 'B+', value: summary.gradeBreakdown['B+'] || 0, color: '#06B6D4' },
    { label: 'B', value: summary.gradeBreakdown['B'] || 0, color: '#3B82F6' },
    { label: 'C', value: summary.gradeBreakdown['C'] || 0, color: '#F59E0B' },
    { label: 'D', value: summary.gradeBreakdown['D'] || 0, color: '#EF4444' },
  ].filter(d => d.value > 0), [summary])

  const statusDonut = useMemo(() => [
    { label: 'Active', value: summary.statusBreakdown['active'] || 0, color: '#06b6d4' },
    { label: 'Presented', value: summary.statusBreakdown['presented'] || 0, color: '#f59e0b' },
    { label: 'Shortlisted', value: summary.statusBreakdown['shortlisted'] || 0, color: '#22c55e' },
    { label: 'Converted', value: summary.statusBreakdown['converted'] || 0, color: '#D4A574' },
    { label: 'Rejected', value: summary.statusBreakdown['rejected'] || 0, color: '#ef4444' },
  ].filter(d => d.value > 0), [summary])

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Purpose Distribution */}
      <Panel>
        <PanelHeader title="Purpose Distribution" accent="#a78bfa" />
        <div className="px-4 py-4 flex items-center gap-4">
          <DonutChart data={purposeDonut} size={80} strokeWidth={10} />
          <div className="flex-1">
            <div className="flex flex-col gap-1.5">
              {purposeDonut.map(d => (
                <div key={d.label} className="flex items-center gap-2 text-[10px] text-pcis-text-secondary">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="flex-1 truncate">{d.label}</span>
                  <span className="font-mono font-semibold" style={{ color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* Grade Distribution */}
      <Panel>
        <PanelHeader title="Grade Distribution" accent="#D4A574" />
        <div className="px-4 py-4 flex items-center gap-4">
          <DonutChart data={gradeDonut} size={80} strokeWidth={10} />
          <div className="flex-1">
            <div className="flex flex-col gap-1.5">
              {gradeDonut.map(d => (
                <div key={d.label} className="flex items-center gap-2 text-[10px] text-pcis-text-secondary">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="flex-1">Grade {d.label}</span>
                  <span className="font-mono font-semibold" style={{ color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* Status Pipeline */}
      <Panel>
        <PanelHeader title="Match Pipeline" accent="#06b6d4" />
        <div className="px-4 py-4 flex items-center gap-4">
          <DonutChart data={statusDonut} size={80} strokeWidth={10} />
          <div className="flex-1">
            <div className="flex flex-col gap-1.5">
              {statusDonut.map(d => (
                <div key={d.label} className="flex items-center gap-2 text-[10px] text-pcis-text-secondary">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="flex-1">{d.label}</span>
                  <span className="font-mono font-semibold" style={{ color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t border-pcis-border/10">
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-white/40">Conversion</span>
                <span className="text-[10px] font-mono font-semibold text-[#C9A55A]">{summary.conversionRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// MATCH WATCHLIST -- Power table (mirrors CIE Client Watchlist / SCOUT Area Watchlist)
// ═══════════════════════════════════════════════════════════════════════════

function MatchWatchlist() {
  const nav = useWorkspaceNav()

  const matches = useMemo(() => {
    return [...engineMatches]
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 15)
  }, [])

  return (
    <Panel>
      <PanelHeader title="ENGINE Match Watchlist" accent="#a78bfa"
        right={
          <button onClick={() => nav.openPanelByType('engine-match-scorer', 'tab')} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">
            Full match scorer {'\u2192'}
          </button>
        } />
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-pcis-text-muted text-[8px] uppercase tracking-wider border-b border-pcis-border/10">
              <th className="text-left py-2 px-4 font-normal">Client</th>
              <th className="text-left py-2 px-2 font-normal">Property</th>
              <th className="text-center py-2 px-2 font-normal">Purpose</th>
              <th className="text-center py-2 px-2 font-normal">Score</th>
              <th className="text-center py-2 px-2 font-normal">Grade</th>
              <th className="text-center py-2 px-2 font-normal">Financial</th>
              <th className="text-center py-2 px-2 font-normal">Lifestyle</th>
              <th className="text-center py-2 px-2 font-normal">Investment</th>
              <th className="text-center py-2 px-2 font-normal">Purpose Fit</th>
              <th className="text-center py-2 px-2 font-normal">Status</th>
              <th className="text-right py-2 px-4 font-normal">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(match => {
              const client = getClient(match.clientId)
              const property = getProperty(match.propertyId)
              const purposeConfig = PURPOSE_CONFIGS.find(p => p.id === match.purpose)

              return (
                <tr key={match.id}
                  className="border-b border-pcis-border/10 hover:bg-pcis-gold/[0.03] cursor-pointer transition-colors">
                  <td className="py-2 px-4">
                    <ClientLink clientId={match.clientId} className="text-[10px]">
                      <span className="text-white/70 font-medium">{client?.name || 'Unknown'}</span>
                    </ClientLink>
                  </td>
                  <td className="py-2 px-2">
                    <PropertyLink propertyId={match.propertyId} className="text-[10px]">
                      <span className="text-white/60 truncate block max-w-[140px]">{property?.name || 'Unknown'}</span>
                    </PropertyLink>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${purposeConfig?.color || '#a78bfa'}20`, color: purposeConfig?.color || '#a78bfa' }}>
                      {match.purpose.slice(0, 3)}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center">
                      <ScoreRing score={match.overallScore} size={24} strokeWidth={2} />
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={`text-xs font-bold ${getGradeTextColor(match.grade)}`}>{match.grade}</span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[9px] font-mono" style={{ color: getScoreColor(match.pillars.financialFit.score) }}>
                      {match.pillars.financialFit.score}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[9px] font-mono" style={{ color: getScoreColor(match.pillars.lifestyleFit.score) }}>
                      {match.pillars.lifestyleFit.score}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[9px] font-mono" style={{ color: getScoreColor(match.pillars.investmentFit.score) }}>
                      {match.pillars.investmentFit.score}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[9px] font-mono" style={{ color: getScoreColor(match.pillars.purposeAlignment.score) }}>
                      {match.pillars.purposeAlignment.score}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${getStatusColor(match.status)}15`, color: getStatusColor(match.status) }}>
                      {match.status}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <span className="text-[9px] font-mono text-white/60">{Math.round(match.confidence * 100)}%</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// BOTTOM ROW -- Top Matches by Purpose, Purpose Trends, Recent Activity, Pillar Analysis
// ═══════════════════════════════════════════════════════════════════════════

function ENGINEBottomRow() {
  const nav = useWorkspaceNav()

  // Top A+ and A matches
  const topMatches = useMemo(() =>
    [...engineMatches]
      .filter(m => m.grade === 'A+' || m.grade === 'A')
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 5),
  [])

  // Recently scored matches
  const recentScoredMatches = useMemo(() =>
    [...engineMatches]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
  [])

  // Recent conversions
  const recentConversions = useMemo(() =>
    [...engineMatches]
      .filter(m => m.status === 'converted')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
  [])

  // Pillar averages
  const pillarAvgs = useMemo(() => {
    const totals = { financialFit: 0, lifestyleFit: 0, investmentFit: 0, purposeAlignment: 0 }
    const count = engineMatches.length || 1
    engineMatches.forEach(m => {
      totals.financialFit += m.pillars.financialFit.score
      totals.lifestyleFit += m.pillars.lifestyleFit.score
      totals.investmentFit += m.pillars.investmentFit.score
      totals.purposeAlignment += m.pillars.purposeAlignment.score
    })
    return [
      { label: 'Financial Fit', avg: Math.round(totals.financialFit / count), color: '#22c55e' },
      { label: 'Lifestyle Fit', avg: Math.round(totals.lifestyleFit / count), color: '#06b6d4' },
      { label: 'Investment Fit', avg: Math.round(totals.investmentFit / count), color: '#f59e0b' },
      { label: 'Purpose Alignment', avg: Math.round(totals.purposeAlignment / count), color: '#a78bfa' },
    ]
  }, [])

  return (
    <div className="grid grid-cols-4 gap-3">
      {/* Top Matches */}
      <Panel>
        <PanelHeader title="Top Matches" accent="#D4A574"
          right={<button onClick={() => nav.openPanelByType('engine-match-scorer', 'tab')} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">EMS {'\u2192'}</button>} />
        <div className="divide-y divide-pcis-border/10">
          {topMatches.map(match => {
            const client = getClient(match.clientId)
            const property = getProperty(match.propertyId)
            return (
              <div key={match.id} className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/70 font-medium truncate">{client?.name || 'Client'}</span>
                  <span className={`text-[9px] font-bold ${getGradeTextColor(match.grade)}`}>{match.grade}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-white/40 truncate">{property?.name || 'Property'}</span>
                  <span className={`text-[9px] font-mono font-semibold ${getScoreTextColor(match.overallScore)}`}>{match.overallScore}</span>
                </div>
                <div className="text-[7px] text-pcis-text-muted mt-1">{match.purpose}</div>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Scoring Activity */}
      <Panel>
        <PanelHeader title="Scoring Activity" accent="#a78bfa"
          right={<span className="text-[8px] text-white/30 font-mono">ENGINE</span>} />
        <div className="divide-y divide-pcis-border/10">
          {recentScoredMatches.length > 0 ? recentScoredMatches.map(match => {
            const client = getClient(match.clientId)
            const property = getProperty(match.propertyId)
            const purposeConfig = PURPOSE_CONFIGS.find(p => p.id === match.purpose)
            return (
              <div key={match.id} className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/70 font-medium truncate">{client?.name || 'Client'}</span>
                  <span className="text-[8px] font-mono font-semibold" style={{ color: getScoreColor(match.overallScore) }}>{match.overallScore}</span>
                </div>
                <div className="flex items-center justify-between text-[8px]">
                  <span className="text-white/40 truncate">{property?.name || 'Property'}</span>
                  <span className="text-[7px] uppercase px-1.5 py-[1px] rounded ml-2" style={{ backgroundColor: `${purposeConfig?.color || '#a78bfa'}20`, color: purposeConfig?.color || '#a78bfa' }}>
                    {match.purpose.slice(0, 3)}
                  </span>
                </div>
                <div className="text-[7px] text-pcis-text-muted font-mono mt-1">{ago(match.createdAt)}</div>
              </div>
            )
          }) : (
            <div className="px-4 py-6 text-center text-[9px] text-pcis-text-muted/40">No activity yet</div>
          )}
        </div>
      </Panel>

      {/* Recent Conversions */}
      <Panel>
        <PanelHeader title="Recent Conversions" accent="#22c55e"
          right={<span className="text-[8px] text-white/30 font-mono">ENGINE</span>} />
        <div className="divide-y divide-pcis-border/10">
          {recentConversions.length > 0 ? recentConversions.map(match => {
            const client = getClient(match.clientId)
            const property = getProperty(match.propertyId)
            return (
              <div key={match.id} className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/70 font-medium truncate">{client?.name || 'Client'}</span>
                  <span className="text-[7px] font-mono uppercase px-1.5 py-[1px] rounded bg-[#D4A574]/15 text-[#D4A574]">converted</span>
                </div>
                <div className="text-[8px] text-white/40 truncate">{property?.name || 'Property'} | {match.purpose}</div>
                <div className="text-[7px] text-pcis-text-muted font-mono mt-1">{ago(match.createdAt)}</div>
              </div>
            )
          }) : (
            <div className="px-4 py-6 text-center text-[9px] text-pcis-text-muted/40">No conversions yet</div>
          )}
        </div>
      </Panel>

      {/* Pillar Analysis */}
      <Panel>
        <PanelHeader title="Pillar Averages" accent="#f59e0b"
          right={<button onClick={() => nav.openPanelByType('engine-client-property', 'tab')} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">ECP {'\u2192'}</button>} />
        <div className="px-4 py-4 space-y-3">
          {pillarAvgs.map(pillar => (
            <div key={pillar.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-white/60">{pillar.label}</span>
                <span className="text-[9px] font-mono font-semibold" style={{ color: pillar.color }}>{pillar.avg}/100</span>
              </div>
              <div className="w-full h-2 bg-white/[0.04] rounded overflow-hidden">
                <div className="h-full rounded transition-all" style={{ width: `${pillar.avg}%`, backgroundColor: pillar.color, opacity: 0.7 }} />
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-pcis-border/10">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-white/40">Overall Avg Score</span>
              <span className="text-[10px] font-mono font-semibold" style={{ color: getScoreColor(getEngineSummary().avgScore) }}>
                {getEngineSummary().avgScore}/100
              </span>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT -- E3 ENGINE Power Dashboard
// ═══════════════════════════════════════════════════════════════════════════

export default function ENGDashboardView(): React.ReactElement {
  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="flex-1 space-y-4 pb-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-pcis-text tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}>
              Purpose-Aware Matching Engine
            </h2>
            <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
              E3 -- Purpose Classification -- 4-Pillar Scoring -- Match Grid
            </p>
          </div>
          <ENGINEStatsBar />
        </div>

        {/* Sub-Panel Cards */}
        <ENGINESubPanelCards />

        {/* Analytics Row */}
        <ENGINEAnalyticsRow />

        {/* Match Watchlist */}
        <MatchWatchlist />

        {/* Bottom Row */}
        <ENGINEBottomRow />
      </div>
    </div>
  )
}
