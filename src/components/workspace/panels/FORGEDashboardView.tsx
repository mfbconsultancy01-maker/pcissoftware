'use client'

import React, { useState, useMemo } from 'react'
import {
  forgeActions,
  dealBriefs,
  proposals,
  communicationDrafts,
  lifecycleActions,
  getForgeSummary,
  getCriticalActions,
  type ForgeAction,
  type ActionPriority,
  type ActionCategory,
  type DealBrief,
  type Proposal,
  type CommunicationDraft,
  type LifecycleAction,
} from '@/lib/forgeData'
import { clients, cognitiveProfiles, engagementMetrics, getProperty, getClient as getClientById } from '@/lib/mockData'
import { getCIEClient, ARCHETYPES } from '@/lib/cieData'
import { engineMatches, getEngineMatchesForClient, getClientPurpose, PURPOSE_CONFIGS } from '@/lib/engineData'
import { useWorkspaceNav, ClientLink } from '../useWorkspaceNav'

// ═══════════════════════════════════════════════════════════════════════════
// E4 FORGE POWER DASHBOARD -- Advisor Action Layer
//
// Layout mirrors E1 CIE and E2 SCOUT:
// StatsBar -> SubPanel Cards -> Analytics Row -> Action Watchlist -> Bottom Row
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

const priorityColors: Record<ActionPriority, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#06b6d4',
  low: '#6b7280',
}

const priorityBgColors: Record<ActionPriority, string> = {
  critical: 'bg-red-400',
  high: 'bg-amber-400',
  medium: 'bg-cyan-400',
  low: 'bg-gray-400',
}

const categoryLabels: Record<ActionCategory, string> = {
  'deal-brief': 'Deal Brief',
  'proposal': 'Proposal',
  'communication': 'Communication',
  'follow-up': 'Follow-up',
  'review': 'Review',
  'meeting-prep': 'Meeting Prep',
}

const categoryColors: Record<ActionCategory, string> = {
  'deal-brief': '#C9A55A',
  'proposal': '#06b6d4',
  'communication': '#8b5cf6',
  'follow-up': '#f59e0b',
  'review': '#22c55e',
  'meeting-prep': '#ec4899',
}

const sourceColors: Record<string, { bg: string; text: string }> = {
  cie: { bg: 'bg-green-400/15', text: 'text-green-400' },
  engine: { bg: 'bg-amber-400/15', text: 'text-amber-400' },
  scout: { bg: 'bg-cyan-400/15', text: 'text-cyan-400' },
  manual: { bg: 'bg-white/[0.05]', text: 'text-white/50' },
}

const getClient = (clientId: string) => getClientById(clientId) || clients.find((c: any) => c.id === clientId)

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

function CompletionRing({ pct, size = 36, color = '#C9A55A' }: { pct: number; size?: number; color?: string }) {
  const strokeWidth = 3
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="9" fontWeight="bold" fontFamily="monospace">{Math.round(pct)}%</text>
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

function FORGEStatsBar() {
  const summary = getForgeSummary()

  const stats = [
    { label: 'Total Actions', value: `${summary.totalActions}`, color: '#a855f7' },
    { label: 'Pending', value: `${summary.pendingActions}`, color: '#f59e0b' },
    { label: 'Critical', value: `${summary.criticalActions}`, color: summary.criticalActions > 0 ? '#ef4444' : '#22c55e' },
    { label: 'Briefs', value: `${summary.briefsGenerated}`, color: '#C9A55A' },
    { label: 'Proposals', value: `${summary.proposalsSent}`, color: '#06b6d4' },
    { label: 'Comms', value: `${summary.commsDrafted}`, color: '#8b5cf6' },
    { label: 'Overdue', value: `${summary.overdueFollowUps}`, color: summary.overdueFollowUps > 0 ? '#ef4444' : '#22c55e' },
    { label: 'Completion', value: `${Math.round(summary.completionRate * 100)}%`, color: '#22c55e' },
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
// SUB-PANEL CARDS -- Gateway to all FORGE workspace panels
// ═══════════════════════════════════════════════════════════════════════════

function FORGESubPanelCards() {
  const nav = useWorkspaceNav()
  const summary = getForgeSummary()

  const panels = [
    {
      code: 'FDR', title: 'AI Deal Room',
      desc: 'Claude-powered deal intelligence -- 7-section briefs combining CIE profiles, ENGINE matches, and SCOUT market data',
      metric: `${clients.length} clients`,
      sub: 'Anthropic Claude AI',
      color: '#C9A55A',
      onClick: () => nav.openPanelByType('forge-deal-room', 'tab'),
    },
    {
      code: 'FMP', title: 'AI Meeting Prep',
      desc: 'CIE-driven tactical briefings with cognitive profiling, objection playbooks, and closing strategies',
      metric: '5 meeting types',
      sub: 'Cognitive intelligence',
      color: '#06b6d4',
      onClick: () => nav.openPanelByType('forge-meeting-prep', 'tab'),
    },
    {
      code: 'FOR', title: 'AI Opportunity Radar',
      desc: 'Cross-engine pattern detection -- hidden gems, market timing signals, and re-engagement opportunities',
      metric: `${clients.length} clients`,
      sub: 'Pattern analysis',
      color: '#8b5cf6',
      onClick: () => nav.openPanelByType('forge-opportunity-radar', 'tab'),
    },
    {
      code: 'FCD', title: 'Client Dossier',
      desc: 'Unified client intelligence file pulling CIE profile, ENGINE matches, FORGE actions, and market exposure',
      metric: `${clients.length} clients`,
      sub: 'Full intelligence file',
      color: '#22c55e',
      onClick: () => nav.openPanelByType('forge-client-dossier', 'tab'),
    },
    {
      code: 'FCA', title: 'Comm Advisor',
      desc: 'Archetype-tuned communications -- AI-drafted messages calibrated to each client cognitive profile',
      metric: `${communicationDrafts.length} drafts`,
      sub: 'CIE-tuned messaging',
      color: '#f59e0b',
      onClick: () => nav.openPanelByType('forge-comm-advisor', 'tab'),
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
// ANALYTICS ROW -- Priority Distribution, Category Breakdown, Source Mix
// ═══════════════════════════════════════════════════════════════════════════

function FORGEAnalyticsRow() {
  const summary = getForgeSummary()

  const priorityDonut = useMemo(() => [
    { label: 'Critical', value: summary.actionsByPriority.critical, color: '#ef4444' },
    { label: 'High', value: summary.actionsByPriority.high, color: '#f59e0b' },
    { label: 'Medium', value: summary.actionsByPriority.medium, color: '#06b6d4' },
    { label: 'Low', value: summary.actionsByPriority.low, color: '#6b7280' },
  ].filter(d => d.value > 0), [summary])

  const categoryDonut = useMemo(() => [
    { label: 'Deal Brief', value: summary.actionsByCategory['deal-brief'], color: '#C9A55A' },
    { label: 'Proposal', value: summary.actionsByCategory['proposal'], color: '#06b6d4' },
    { label: 'Comm', value: summary.actionsByCategory['communication'], color: '#8b5cf6' },
    { label: 'Follow-up', value: summary.actionsByCategory['follow-up'], color: '#f59e0b' },
    { label: 'Review', value: summary.actionsByCategory['review'], color: '#22c55e' },
    { label: 'Meeting Prep', value: summary.actionsByCategory['meeting-prep'], color: '#ec4899' },
  ].filter(d => d.value > 0), [summary])

  const sourceDonut = useMemo(() => {
    const counts: Record<string, number> = { cie: 0, engine: 0, scout: 0, manual: 0 }
    forgeActions.forEach(a => { counts[a.source] = (counts[a.source] || 0) + 1 })
    return [
      { label: 'CIE', value: counts.cie, color: '#22c55e' },
      { label: 'ENGINE', value: counts.engine, color: '#f59e0b' },
      { label: 'SCOUT', value: counts.scout, color: '#06b6d4' },
      { label: 'Manual', value: counts.manual, color: '#6b7280' },
    ].filter(d => d.value > 0)
  }, [])

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Priority Distribution */}
      <Panel>
        <PanelHeader title="Priority Distribution" accent="#ef4444" />
        <div className="px-4 py-4 flex items-center gap-4">
          <DonutChart data={priorityDonut} size={80} strokeWidth={10} />
          <div className="flex-1">
            <div className="flex flex-col gap-1.5">
              {priorityDonut.map(d => (
                <div key={d.label} className="flex items-center gap-2 text-[10px] text-pcis-text-secondary">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="flex-1">{d.label}</span>
                  <span className="font-mono font-semibold" style={{ color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* Category Breakdown */}
      <Panel>
        <PanelHeader title="Action Categories" accent="#C9A55A" />
        <div className="px-4 py-4 flex items-center gap-4">
          <DonutChart data={categoryDonut} size={80} strokeWidth={10} />
          <div className="flex-1">
            <div className="flex flex-col gap-1.5">
              {categoryDonut.slice(0, 5).map(d => (
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

      {/* Source Intelligence Mix */}
      <Panel>
        <PanelHeader title="Source Intelligence" accent="#a855f7" />
        <div className="px-4 py-4 flex items-center gap-4">
          <DonutChart data={sourceDonut} size={80} strokeWidth={10} />
          <div className="flex-1">
            <div className="flex flex-col gap-1.5">
              {sourceDonut.map(d => (
                <div key={d.label} className="flex items-center gap-2 text-[10px] text-pcis-text-secondary">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="flex-1">{d.label}</span>
                  <span className="font-mono font-semibold" style={{ color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t border-pcis-border/10">
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-white/40">Completion</span>
                <CompletionRing pct={getForgeSummary().completionRate * 100} size={28} />
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// ACTION WATCHLIST -- Priority table (mirrors CIE Client Watchlist / SCOUT Area Watchlist)
// ═══════════════════════════════════════════════════════════════════════════

function DealRoomWatchlist() {
  const nav = useWorkspaceNav()

  // Top client-property matches from ENGINE -- these are the Deal Room targets
  const topDeals = useMemo(() => {
    return [...engineMatches]
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 12)
  }, [])

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#22c55e'
    if (score >= 65) return '#f59e0b'
    if (score >= 50) return '#06b6d4'
    return '#ef4444'
  }

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A+': return '#D4A574'
      case 'A': return '#10B981'
      case 'B+': return '#06B6D4'
      case 'B': return '#3B82F6'
      case 'C': return '#F59E0B'
      default: return '#EF4444'
    }
  }

  const getStatusBg = (status: string): string => {
    switch (status) {
      case 'active': return 'bg-cyan-400/15 text-cyan-400'
      case 'presented': return 'bg-amber-400/15 text-amber-400'
      case 'shortlisted': return 'bg-emerald-400/15 text-emerald-400'
      case 'converted': return 'bg-[#D4A574]/15 text-[#D4A574]'
      default: return 'bg-white/[0.05] text-white/40'
    }
  }

  return (
    <Panel>
      <PanelHeader title="Deal Room Watchlist" accent="#f59e0b"
        right={
          <button onClick={() => nav.openPanelByType('forge-deal-room', 'tab')} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">
            AI Deal Room {'\u2192'}
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
              <th className="text-center py-2 px-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {topDeals.map(match => {
              const client = getClient(match.clientId)
              const property = getProperty(match.propertyId)
              const purposeConfig = PURPOSE_CONFIGS.find(p => p.id === match.purpose)

              return (
                <tr key={match.id}
                  onClick={() => nav.openPanelByType('forge-deal-room', 'tab')}
                  className="border-b border-pcis-border/10 hover:bg-pcis-gold/[0.03] cursor-pointer transition-colors">
                  <td className="py-2 px-4">
                    <ClientLink clientId={match.clientId} className="text-[10px]">
                      {client?.name || 'Unknown'}
                    </ClientLink>
                  </td>
                  <td className="py-2 px-2">
                    <span className="text-white/60 truncate block max-w-[140px]">{property?.name || 'Unknown'}</span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${purposeConfig?.color || '#f59e0b'}20`, color: purposeConfig?.color || '#f59e0b' }}>
                      {match.purpose?.slice(0, 3) || '--'}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[9px] font-mono font-semibold" style={{ color: getScoreColor(match.overallScore) }}>
                      {Math.round(match.overallScore)}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[9px] font-bold" style={{ color: getGradeColor(match.grade) }}>{match.grade}</span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[9px] font-mono" style={{ color: getScoreColor(match.pillars?.financialFit?.score ?? 0) }}>
                      {Math.round(match.pillars?.financialFit?.score ?? 0)}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[9px] font-mono" style={{ color: getScoreColor(match.pillars?.lifestyleFit?.score ?? 0) }}>
                      {Math.round(match.pillars?.lifestyleFit?.score ?? 0)}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[9px] font-mono" style={{ color: getScoreColor(match.pillars?.investmentFit?.score ?? 0) }}>
                      {Math.round(match.pillars?.investmentFit?.score ?? 0)}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${getStatusBg(match.status)}`}>
                      {match.status}
                    </span>
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
// BOTTOM ROW -- Deal Briefs Feed, Recent Proposals, Comms Queue, Activity Log
// ═══════════════════════════════════════════════════════════════════════════

function FORGEBottomRow() {
  const nav = useWorkspaceNav()

  // Deal Room -- top A/A+ matches ready for AI brief generation
  const dealRoomItems = useMemo(() =>
    [...engineMatches]
      .filter(m => m.grade === 'A+' || m.grade === 'A')
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 5),
  [])

  // Meeting Prep -- clients with upcoming deal stages
  const meetingPrepItems = useMemo(() =>
    clients.slice(0, 6).map(client => {
      const cie = getCIEClient(client.id)
      const archetype = cie?.archetype ? ARCHETYPES.find(a => a.id === cie.archetype) : null
      return {
        client,
        archetype: archetype?.label || 'Unknown',
        archetypeColor: archetype?.color || '#888',
        engagement: cie?.engagement?.engagementScore || 0,
        momentum: cie?.engagement?.momentum || 'stable',
        dealStage: client.dealStage,
      }
    }),
  [])

  // Opportunity Radar -- clients with most matches to scan
  const radarItems = useMemo(() =>
    clients.map(client => {
      const matches = getEngineMatchesForClient(client.id)
      const purpose = getClientPurpose(client.id)
      return {
        client,
        matchCount: matches.length,
        topScore: matches.length > 0 ? Math.max(...matches.map(m => m.overallScore)) : 0,
        purpose: purpose?.primaryPurpose || 'Unclassified',
      }
    }).sort((a, b) => b.matchCount - a.matchCount).slice(0, 5),
  [])

  // Client Dossiers -- enriched client summary
  const dossierItems = useMemo(() =>
    clients.slice(0, 6).map(client => {
      const cie = getCIEClient(client.id)
      const matches = getEngineMatchesForClient(client.id)
      const archetype = cie?.archetype ? ARCHETYPES.find(a => a.id === cie.archetype) : null
      return {
        client,
        archetype: archetype?.label || 'Unknown',
        archetypeColor: archetype?.color || '#888',
        matchCount: matches.length,
        topScore: matches.length > 0 ? Math.max(...matches.map(m => m.overallScore)) : 0,
        engagement: cie?.engagement?.engagementScore || 0,
      }
    }),
  [])

  return (
    <div className="grid grid-cols-4 gap-3">
      {/* Deal Room Feed */}
      <Panel>
        <PanelHeader title="AI Deal Room" accent="#C9A55A"
          right={<button onClick={() => nav.openPanelByType('forge-deal-room', 'tab')} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">FDR {'\u2192'}</button>} />
        <div className="divide-y divide-pcis-border/10">
          {dealRoomItems.map(match => {
            const client = getClient(match.clientId)
            const property = getProperty(match.propertyId)
            return (
              <div key={match.id}
                className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer"
                onClick={() => nav.openPanelByType('forge-deal-room', 'tab')}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/70 font-medium truncate">{client?.name || 'Client'}</span>
                  <span className="text-[9px] font-bold" style={{ color: match.grade === 'A+' ? '#D4A574' : '#10B981' }}>{match.grade}</span>
                </div>
                <div className="text-[8px] text-white/40 truncate">{property?.name || 'Property'}</div>
                <div className="text-[7px] text-pcis-text-muted font-mono mt-1">Score: {Math.round(match.overallScore)}/100</div>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Meeting Prep */}
      <Panel>
        <PanelHeader title="AI Meeting Prep" accent="#06b6d4"
          right={<button onClick={() => nav.openPanelByType('forge-meeting-prep', 'tab')} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">FMP {'\u2192'}</button>} />
        <div className="divide-y divide-pcis-border/10">
          {meetingPrepItems.map(d => (
            <div key={d.client.id}
              className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer"
              onClick={() => nav.openPanelByType('forge-meeting-prep', 'tab')}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/70 font-medium truncate">{d.client.name}</span>
                <span className="text-[7px] font-mono px-1.5 py-[1px] rounded" style={{ backgroundColor: `${d.archetypeColor}20`, color: d.archetypeColor }}>
                  {d.archetype}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[8px]">
                <span className="text-cyan-400">{d.dealStage}</span>
                <span className="text-white/30">|</span>
                <span className={`${d.momentum === 'heating' ? 'text-emerald-400' : d.momentum === 'cooling' ? 'text-red-400' : 'text-amber-400'}`}>
                  {d.momentum}
                </span>
              </div>
              <div className="text-[7px] text-pcis-text-muted font-mono mt-1">Engagement: {d.engagement}/100</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Opportunity Radar */}
      <Panel>
        <PanelHeader title="AI Opportunity Radar" accent="#8b5cf6"
          right={<button onClick={() => nav.openPanelByType('forge-opportunity-radar', 'tab')} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">FOR {'\u2192'}</button>} />
        <div className="divide-y divide-pcis-border/10">
          {radarItems.map(d => (
            <div key={d.client.id}
              className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer"
              onClick={() => nav.openPanelByType('forge-opportunity-radar', 'tab')}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/70 font-medium truncate">{d.client.name}</span>
                <span className="text-[9px] font-mono font-semibold text-[#f59e0b]">{d.matchCount}</span>
              </div>
              <div className="text-[8px] text-purple-400">{d.purpose}</div>
              {d.topScore > 0 && (
                <div className="text-[7px] text-pcis-text-muted font-mono mt-1">Top: {d.topScore}/100</div>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* Client Dossiers */}
      <Panel>
        <PanelHeader title="Client Dossier" accent="#22c55e"
          right={<button onClick={() => nav.openPanelByType('forge-client-dossier', 'tab')} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">FCD {'\u2192'}</button>} />
        <div className="divide-y divide-pcis-border/10">
          {dossierItems.map(d => (
            <div key={d.client.id}
              className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer"
              onClick={() => nav.openPanelByType('forge-client-dossier', 'tab')}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/70 font-medium truncate">{d.client.name}</span>
                <span className="text-[7px] font-mono px-1.5 py-[1px] rounded" style={{ backgroundColor: `${d.archetypeColor}20`, color: d.archetypeColor }}>
                  {d.archetype}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[8px]">
                <span className="text-white/40">{d.matchCount} matches</span>
                <span className="text-white/30">|</span>
                <span className="text-amber-400">Score: {d.topScore}</span>
              </div>
              <div className="text-[7px] text-pcis-text-muted font-mono mt-1">Engagement: {d.engagement}/100</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT -- E3 FORGE Power Dashboard
// ═══════════════════════════════════════════════════════════════════════════

export default function FORGEDashboardView(): React.ReactElement {
  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="flex-1 space-y-4 pb-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-pcis-text tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}>
              Advisor Action Engine
            </h2>
            <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
              E4 -- AI Deal Room -- Meeting Prep -- Opportunity Radar -- Client Dossier
            </p>
          </div>
          <FORGEStatsBar />
        </div>

        {/* Sub-Panel Cards */}
        <FORGESubPanelCards />

        {/* Analytics Row */}
        <FORGEAnalyticsRow />

        {/* Deal Room Watchlist */}
        <DealRoomWatchlist />

        {/* Bottom Row */}
        <FORGEBottomRow />
      </div>
    </div>
  )
}
