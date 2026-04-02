'use client'

import React, { useState, useMemo } from 'react'
import {
  clientPurposes,
  engineMatches,
  PURPOSE_CONFIGS,
  type ClientPurpose,
  type ClientPurposeAssignment,
  type PurposeConfig,
} from '@/lib/engineData'
import { clients, engagementMetrics, type Client } from '@/lib/mockData'
import { getCIEClient, ARCHETYPES } from '@/lib/cieData'
import { ClientLink } from '../useWorkspaceNav'
import { usePurposeAnalysis } from '@/hooks/useEngineAI'

// ═══════════════════════════════════════════════════════════════════════════
// E3 ENGINE -- PURPOSE MATRIX (EPM)
//
// The intake classifier of the matching engine. Every client entering
// ENGINE is evaluated against 6 purpose categories. This panel shows
// exactly how and why each classification was made, with full
// transparency into the signals, reasoning, and confidence model.
//
// Purpose classification drives everything downstream: which properties
// are matched, how pillars are weighted, and what FORGE generates.
// Getting this right is the foundation of the entire system.
// ═══════════════════════════════════════════════════════════════════════════

type SortBy = 'confidence' | 'matchCount' | 'name'

// ── Purpose Narrative Generation ────────────────────────────────────────

function generatePurposeNarrative(client: Client, assign: ClientPurposeAssignment, config: PurposeConfig): string {
  const budgetMin = ((client.financialProfile?.budgetMin || 0) / 1_000_000).toFixed(0)
  const budgetMax = ((client.financialProfile?.budgetMax || 0) / 1_000_000).toFixed(0)

  const narratives: Record<ClientPurpose, string> = {
    'Investment': `${client.name} presents a clear investment-first profile. As a ${client.category} with a ${budgetMin}--${budgetMax}M AED operating range, the primary driver is capital growth and yield generation. The classification is supported by ${assign.signals.length} distinct signals including portfolio-focused language patterns and transaction history alignment. ENGINE weights investment fit at ${Math.round(config.investmentWeight * 100)}% for this purpose category, meaning matched properties will be evaluated primarily on ROI potential, rental yield forecasts, and capital appreciation trajectory. Key factors in scoring: ${config.keyFactors.join(', ')}.`,

    'End-Use': `${client.name} is classified as a lifestyle-driven end-user. The ${client.type} profile with ${budgetMin}--${budgetMax}M AED budget indicates a primary residence or quality-of-life motivated acquisition. ${assign.signals.length} supporting signals confirm community-focused inquiry patterns and residential preference indicators. ENGINE applies a ${Math.round(config.lifestyleWeight * 100)}% lifestyle weight for this purpose, prioritising location quality, community fit, and amenity access in match scoring. Key factors: ${config.keyFactors.join(', ')}.`,

    'Family Office': `${client.name} operates with a multi-generational wealth strategy typical of family office clients. The ${budgetMin}--${budgetMax}M AED range and ${client.category} classification indicate portfolio diversification and legacy asset acquisition intent. ${assign.signals.length} signals support this through multi-asset strategy indicators and long-horizon planning patterns. ENGINE balances investment (${Math.round(config.investmentWeight * 100)}%) and lifestyle (${Math.round(config.lifestyleWeight * 100)}%) weights to reflect the dual mandate of preservation and growth. Key factors: ${config.keyFactors.join(', ')}.`,

    'Renovation': `${client.name} shows value-add acquisition patterns consistent with renovation-focused buyers. The ${budgetMin}--${budgetMax}M AED budget paired with ${client.category} signals indicates an appetite for below-market properties with repositioning upside. ENGINE weights investment fit at ${Math.round(config.investmentWeight * 100)}% for renovation purposes, scoring properties on price discount, renovation potential, area trajectory, and achievable flip margins. ${assign.signals.length} classification signals detected. Key factors: ${config.keyFactors.join(', ')}.`,

    'Golden Visa': `${client.name} qualifies for Golden Visa pathway classification. With a budget ceiling of ${budgetMax}M AED (exceeding the 2M AED threshold), the primary objective is securing UAE residency through property acquisition. ENGINE applies balanced weights (${Math.round(config.investmentWeight * 100)}% investment / ${Math.round(config.lifestyleWeight * 100)}% lifestyle) since Golden Visa buyers often combine residency goals with either investment returns or personal use. Scoring prioritises ready properties with clear title deed timelines. Key factors: ${config.keyFactors.join(', ')}.`,

    'Pied-à-Terre': `${client.name} fits the secondary residence profile, seeking a prestigious address for occasional use. As a ${client.category} in the ${client.type} segment with ${budgetMin}--${budgetMax}M AED range, the focus is on premium locations with managed services and rental potential when absent. ENGINE weights lifestyle at ${Math.round(config.lifestyleWeight * 100)}% while maintaining ${Math.round(config.investmentWeight * 100)}% investment consideration for rental-when-absent economics. ${assign.signals.length} status-oriented signals support this classification. Key factors: ${config.keyFactors.join(', ')}.`,
  }

  return narratives[assign.primaryPurpose] || `${client.name} classified as ${assign.primaryPurpose} with ${Math.round(assign.confidence * 100)}% confidence based on ${assign.signals.length} supporting signals.`
}

function generateSecondaryRationale(client: Client, assign: ClientPurposeAssignment): string | null {
  if (!assign.secondaryPurpose) return null
  const secondaryConfig = PURPOSE_CONFIGS.find(p => p.id === assign.secondaryPurpose)
  if (!secondaryConfig) return null
  const budgetMax = ((client.financialProfile?.budgetMax || 0) / 1_000_000).toFixed(0)

  if (assign.secondaryPurpose === 'Golden Visa') {
    return `Secondary classification triggered by budget ceiling (${budgetMax}M AED) exceeding the 2M AED Golden Visa threshold. If residency becomes a stated objective, this secondary purpose would be promoted to primary, shifting ENGINE's scoring weights to prioritise ready property availability and title deed processing speed.`
  }
  if (assign.secondaryPurpose === 'Renovation') {
    return `Secondary renovation potential detected alongside the primary investment thesis. If value-add appetite is confirmed through further client interaction, ENGINE can re-weight scoring towards below-market pricing and renovation margin analysis.`
  }
  return `${assign.secondaryPurpose} detected as a secondary intent vector. Additional signals may promote this to primary classification, altering how ENGINE weights the 4-pillar scoring model.`
}

// ── Confidence Breakdown ────────────────────────────────────────────────

function getConfidenceBreakdown(assign: ClientPurposeAssignment): { label: string; value: number; color: string }[] {
  const base = 0.7
  const signalBonus = Math.min(0.25, assign.signals.length * 0.05)
  const total = Math.min(0.95, base + signalBonus)

  return [
    { label: 'Base Model', value: Math.round((base / total) * 100), color: '#a78bfa' },
    { label: 'Signal Strength', value: Math.round((signalBonus / total) * 100), color: '#C9A55A' },
  ]
}

// ── Score Ring SVG ──────────────────────────────────────────────────────

function ConfidenceRing({ pct, size = 52, color = '#C9A55A' }: { pct: number; size?: number; color?: string }) {
  const strokeWidth = 4
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="12" fontWeight="bold" fontFamily="monospace">{pct}%</text>
      <text x={size / 2} y={size / 2 + 8} textAnchor="middle" dominantBaseline="central"
        fill="rgba(255,255,255,0.4)" fontSize="6" fontWeight="normal" fontFamily="monospace">CONF</text>
    </svg>
  )
}

// ── Purpose Card (for the overview) ─────────────────────────────────────

function PurposeCard({ config, count, total, isSelected, onClick }: {
  config: PurposeConfig; count: number; total: number; isSelected: boolean; onClick: () => void
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const avgMatches = count > 0 ? Math.round(
    engineMatches.filter(m => {
      const cp = clientPurposes.find(c => c.clientId === m.clientId)
      return cp?.primaryPurpose === config.id
    }).length / count
  ) : 0

  return (
    <div
      onClick={onClick}
      className={`bg-white/[0.02] border rounded-xl p-3 cursor-pointer transition-all ${
        isSelected
          ? 'border-opacity-60'
          : 'border-pcis-border/20 hover:border-pcis-border/40'
      }`}
      style={isSelected ? { borderColor: config.color } : {}}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: config.color }}>{config.icon}</span>
          <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">{config.label}</span>
        </div>
        <span className="text-[14px] font-bold font-mono" style={{ color: config.color }}>{count}</span>
      </div>
      <p className="text-[8px] text-white/40 leading-relaxed mb-2">{config.description}</p>
      <div className="flex items-center justify-between">
        <div className="h-1 flex-1 bg-white/[0.05] rounded-full overflow-hidden mr-2">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: config.color, opacity: 0.7 }} />
        </div>
        <span className="text-[8px] font-mono text-white/40">{pct}%</span>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[7px] text-white/30">Avg matches/client</span>
        <span className="text-[8px] font-mono text-white/50">{avgMatches}</span>
      </div>
      <div className="mt-1.5 pt-1.5 border-t border-white/[0.04]">
        <div className="flex items-center gap-1 flex-wrap">
          {config.keyFactors.slice(0, 2).map((f, i) => (
            <span key={i} className="text-[6px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.03] text-white/30">{f}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ENGPurposeMatrixView(): React.ReactElement {
  const [purposeFilter, setPurposeFilter] = useState<ClientPurpose | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>('confidence')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const aiPurpose = usePurposeAnalysis()

  // Build enriched client list
  const enriched = useMemo(() => {
    return clientPurposes.map((assign: ClientPurposeAssignment) => {
      const client = clients.find(c => c.id === assign.clientId)
      const matchCount = engineMatches.filter(m => m.clientId === assign.clientId).length
      const topScore = engineMatches
        .filter(m => m.clientId === assign.clientId)
        .reduce((max, m) => Math.max(max, m.overallScore), 0)
      const cie = getCIEClient(assign.clientId)
      const archetype = cie?.archetype ? ARCHETYPES.find(a => a.id === cie.archetype) : null
      const engagement = engagementMetrics.find(e => e.clientId === assign.clientId)
      return { assign, client: client!, matchCount, topScore, archetype, engagement }
    }).filter(item => item.client)
  }, [])

  // Filter and sort
  const filtered = useMemo(() => {
    let result = enriched
    if (purposeFilter) {
      result = result.filter(item => item.assign.primaryPurpose === purposeFilter)
    }
    result.sort((a, b) => {
      if (sortBy === 'confidence') return b.assign.confidence - a.assign.confidence
      if (sortBy === 'matchCount') return b.matchCount - a.matchCount
      return (a.client?.name || '').localeCompare(b.client?.name || '')
    })
    return result
  }, [enriched, purposeFilter, sortBy])

  // Purpose distribution counts
  const purposeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    PURPOSE_CONFIGS.forEach(c => { counts[c.id] = clientPurposes.filter(p => p.primaryPurpose === c.id).length })
    return counts
  }, [])

  const totalClients = clientPurposes.length
  const avgConfidence = Math.round((clientPurposes.reduce((s, p) => s + p.confidence, 0) / totalClients) * 100)

  return (
    <div className="h-full flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 pb-4 border-b border-pcis-border/10">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-[3px] h-5 rounded-full bg-[#a78bfa]" />
              <h2 className="text-base font-semibold text-white/90 tracking-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}>
                Purpose Matrix
              </h2>
              <span className="text-[8px] font-mono text-[#a78bfa]/60 uppercase tracking-widest ml-1">EPM</span>
            </div>
            <p className="text-[10px] text-white/40 ml-3 leading-relaxed max-w-2xl">
              Every client entering ENGINE is classified against 6 purpose categories. This classification
              determines how the 4-pillar scoring model weights each match. A client classified as Investment
              will have properties scored with 85% investment weight, while an End-Use client shifts to 75%
              lifestyle. Getting purpose right is the foundation of everything downstream.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] flex-shrink-0">
            <div className="text-right">
              <span className="text-pcis-text-muted block text-[8px] uppercase tracking-wider">Classified</span>
              <span className="font-mono font-bold text-[#a78bfa]">{totalClients}</span>
            </div>
            <div className="w-px h-6 bg-pcis-border/20" />
            <div className="text-right">
              <span className="text-pcis-text-muted block text-[8px] uppercase tracking-wider">Avg Confidence</span>
              <span className="font-mono font-bold text-pcis-gold">{avgConfidence}%</span>
            </div>
            <div className="w-px h-6 bg-pcis-border/20" />
            <div className="text-right">
              <span className="text-pcis-text-muted block text-[8px] uppercase tracking-wider">Categories</span>
              <span className="font-mono font-bold text-white/60">6</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Purpose Category Cards ──────────────────────────────────── */}
      <div className="flex-shrink-0 py-3 border-b border-pcis-border/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-widest">Purpose Categories -- Click to Filter</span>
          {purposeFilter && (
            <button onClick={() => setPurposeFilter(null)}
              className="text-[8px] text-pcis-gold/60 hover:text-pcis-gold transition-colors uppercase tracking-wider">
              Clear Filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-6 gap-2">
          {PURPOSE_CONFIGS.map(config => (
            <PurposeCard
              key={config.id}
              config={config}
              count={purposeCounts[config.id] || 0}
              total={totalClients}
              isSelected={purposeFilter === config.id}
              onClick={() => setPurposeFilter(purposeFilter === config.id ? null : config.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Sort Controls ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 py-2 border-b border-pcis-border/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">Sort by</span>
          {(['confidence', 'matchCount', 'name'] as SortBy[]).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-2 py-1 text-[8px] uppercase tracking-wider rounded transition-all ${
                sortBy === s
                  ? 'bg-pcis-gold/15 text-pcis-gold border border-pcis-gold/30'
                  : 'bg-white/[0.02] text-white/50 border border-white/[0.04] hover:bg-white/[0.04]'
              }`}>
              {s === 'matchCount' ? 'Matches' : s === 'name' ? 'Name' : 'Confidence'}
            </button>
          ))}
        </div>
        <span className="text-[9px] text-white/30 font-mono">{filtered.length} client{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Client List ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 py-2">
        <div className="space-y-1.5">
          {filtered.map(item => {
            const primaryConfig = PURPOSE_CONFIGS.find(p => p.id === item.assign.primaryPurpose)!
            const secondaryConfig = item.assign.secondaryPurpose
              ? PURPOSE_CONFIGS.find(p => p.id === item.assign.secondaryPurpose)
              : null
            const isExpanded = expandedId === item.assign.clientId
            const confPct = Math.round(item.assign.confidence * 100)

            return (
              <div key={item.assign.clientId}
                className={`border rounded-xl transition-all ${
                  isExpanded
                    ? 'border-pcis-gold/25 bg-white/[0.02]'
                    : 'border-pcis-border/15 bg-white/[0.01] hover:border-pcis-border/30'
                }`}>

                {/* ── Collapsed Row ─────────────────────────────── */}
                <div className="flex items-center px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : item.assign.clientId)}>

                  {/* Client Identity */}
                  <div className="flex items-center gap-3 w-[200px] flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ backgroundColor: `${item.archetype?.color || '#888'}20`, color: item.archetype?.color || '#888' }}>
                      {item.client.initials}
                    </div>
                    <div>
                      <ClientLink clientId={item.assign.clientId} className="text-[11px] text-white/80 font-medium hover:text-pcis-gold transition-colors">
                        {item.client.name}
                      </ClientLink>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[7px] font-mono text-white/30">{item.client.type}</span>
                        {item.archetype && (
                          <>
                            <span className="text-white/15">|</span>
                            <span className="text-[7px] font-mono" style={{ color: item.archetype.color }}>{item.archetype.label}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Purpose Badge */}
                  <div className="w-[120px] flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ color: primaryConfig.color }}>{primaryConfig.icon}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                        style={{ backgroundColor: `${primaryConfig.color}20`, color: primaryConfig.color }}>
                        {item.assign.primaryPurpose}
                      </span>
                    </div>
                    {item.assign.secondaryPurpose && (
                      <div className="flex items-center gap-1 mt-1 ml-4">
                        <span className="text-[6px] text-white/25 uppercase tracking-wider">2nd</span>
                        <span className="text-[7px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${secondaryConfig?.color || '#888'}12`, color: `${secondaryConfig?.color || '#888'}90` }}>
                          {item.assign.secondaryPurpose}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confidence */}
                  <div className="w-[100px] flex-shrink-0 flex items-center gap-2">
                    <div className="flex-1">
                      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${confPct}%`, backgroundColor: primaryConfig.color, opacity: 0.7 }} />
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold" style={{ color: confPct >= 85 ? '#22c55e' : confPct >= 75 ? primaryConfig.color : '#f59e0b' }}>
                      {confPct}%
                    </span>
                  </div>

                  {/* Signals */}
                  <div className="w-[60px] flex-shrink-0 text-center">
                    <span className="text-[10px] font-mono text-white/50">{item.assign.signals.length}</span>
                    <div className="text-[6px] text-white/20 uppercase tracking-wider">signals</div>
                  </div>

                  {/* Match Output */}
                  <div className="w-[80px] flex-shrink-0 text-center">
                    <span className="text-[10px] font-mono font-bold text-pcis-gold">{item.matchCount}</span>
                    <div className="text-[6px] text-white/20 uppercase tracking-wider">matches</div>
                  </div>

                  {/* Top Score */}
                  <div className="w-[60px] flex-shrink-0 text-center">
                    <span className="text-[10px] font-mono font-semibold"
                      style={{ color: item.topScore >= 80 ? '#22c55e' : item.topScore >= 65 ? '#f59e0b' : '#ef4444' }}>
                      {item.topScore > 0 ? item.topScore : '--'}
                    </span>
                    <div className="text-[6px] text-white/20 uppercase tracking-wider">top score</div>
                  </div>

                  {/* Engagement */}
                  <div className="w-[70px] flex-shrink-0 text-center">
                    {item.engagement && (
                      <>
                        <span className={`text-[8px] font-mono uppercase ${
                          item.engagement.status === 'thriving' ? 'text-emerald-400' :
                          item.engagement.status === 'active' ? 'text-cyan-400' :
                          item.engagement.status === 'cooling' ? 'text-amber-400' : 'text-red-400'
                        }`}>{item.engagement.status}</span>
                        <div className="text-[6px] text-white/20 uppercase tracking-wider">engagement</div>
                      </>
                    )}
                  </div>

                  {/* Expand Arrow */}
                  <div className="w-[24px] flex-shrink-0 text-right">
                    <span className="text-[10px] text-white/30">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                  </div>
                </div>

                {/* ── Expanded Intelligence Brief ──────────────── */}
                {isExpanded && (
                  <div className="border-t border-pcis-border/10 px-4 pb-4">
                    <div className="grid grid-cols-12 gap-4 mt-4">

                      {/* ── Col 1-7: Full Narrative ───────────────── */}
                      <div className="col-span-7 space-y-4">

                        {/* Purpose Classification Narrative */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryConfig.color }} />
                            <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: primaryConfig.color }}>
                              Classification Narrative
                            </span>
                            <button
                              onClick={() => {
                                const cie = getCIEClient(item.client.id)
                                const arch = cie?.archetype ? ARCHETYPES.find(a => a.id === cie.archetype) : null
                                const profile = cie?.profile
                                const engagement = cie?.engagement
                                const matches = engineMatches.filter(m => m.clientId === item.client.id)
                                const topScore = matches.length > 0 ? Math.max(...matches.map(m => m.overallScore)) : 0
                                aiPurpose.generate({
                                  clientName: item.client.name,
                                  clientType: item.client.type,
                                  clientCategory: item.client.category,
                                  location: item.client.location,
                                  budgetMin: item.client.financialProfile?.budgetMin || 0,
                                  budgetMax: item.client.financialProfile?.budgetMax || 0,
                                  dealStage: item.client.dealStage,
                                  primaryPurpose: item.assign.primaryPurpose,
                                  secondaryPurpose: item.assign.secondaryPurpose,
                                  confidence: item.assign.confidence,
                                  signals: item.assign.signals,
                                  archetype: cie?.archetype || 'balanced',
                                  archetypeLabel: arch?.label || 'Balanced',
                                  cognitiveProfile: profile?.scores.map(s => ({ dimension: s.dimension, value: s.value, trend: s.trend })) || [],
                                  keyTraits: profile?.keyTraits || [],
                                  approachStrategy: profile?.approachStrategy || '',
                                  engagementScore: engagement?.engagementScore ?? null,
                                  engagementMomentum: engagement?.momentum ?? null,
                                  matchCount: matches.length,
                                  topMatchScore: topScore,
                                  investmentWeight: primaryConfig.investmentWeight,
                                  lifestyleWeight: primaryConfig.lifestyleWeight,
                                  keyFactors: primaryConfig.keyFactors,
                                })
                              }}
                              disabled={aiPurpose.loading}
                              className="ml-auto text-[7px] font-mono px-2 py-0.5 rounded border border-pcis-gold/20 bg-pcis-gold/5 text-pcis-gold hover:bg-pcis-gold/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              {aiPurpose.loading ? (
                                <><span className="inline-block w-2 h-2 border border-pcis-gold/40 border-t-pcis-gold rounded-full animate-spin" /> Analysing...</>
                              ) : (
                                <><svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l2.2 4.5L15 6.3l-3.5 3.4.8 4.8L8 12.2 3.7 14.5l.8-4.8L1 6.3l4.8-.8z"/></svg> AI Analyse</>
                              )}
                            </button>
                          </div>
                          {/* Template narrative (always shown) */}
                          <div className="bg-white/[0.015] border border-white/[0.04] rounded-lg p-3 mb-2">
                            <p className="text-[10px] text-white/65 leading-[1.7]">
                              {generatePurposeNarrative(item.client, item.assign, primaryConfig)}
                            </p>
                          </div>
                          {/* AI narrative (shown when generated) */}
                          {(aiPurpose.content || aiPurpose.loading || aiPurpose.error) && (
                            <div className="bg-pcis-gold/[0.03] border border-pcis-gold/10 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <svg width="10" height="10" viewBox="0 0 16 16" fill="#C9A55A"><path d="M8 1l2.2 4.5L15 6.3l-3.5 3.4.8 4.8L8 12.2 3.7 14.5l.8-4.8L1 6.3l4.8-.8z"/></svg>
                                <span className="text-[8px] font-semibold uppercase tracking-widest text-pcis-gold">AI-Powered Analysis</span>
                                {aiPurpose.tokens > 0 && (
                                  <span className="text-[6px] text-white/15 font-mono ml-auto">{aiPurpose.tokens} tokens{aiPurpose.cached ? ' (cached)' : ''}</span>
                                )}
                              </div>
                              {aiPurpose.loading && (
                                <div className="flex items-center gap-2 py-4">
                                  <div className="w-3 h-3 border-2 border-pcis-gold/30 border-t-pcis-gold rounded-full animate-spin" />
                                  <span className="text-[9px] text-white/40">Generating deep purpose analysis...</span>
                                </div>
                              )}
                              {aiPurpose.error && (
                                <p className="text-[9px] text-red-400/70">Error: {aiPurpose.error}</p>
                              )}
                              {aiPurpose.content && (
                                <div className="text-[10px] text-white/60 leading-[1.75] space-y-2">
                                  {aiPurpose.content.split('\n\n').map((para, i) => (
                                    <p key={i}>{para}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Secondary Purpose Rationale */}
                        {item.assign.secondaryPurpose && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: secondaryConfig?.color || '#888' }} />
                              <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: secondaryConfig?.color || '#888' }}>
                                Secondary Purpose Rationale
                              </span>
                            </div>
                            <div className="bg-white/[0.015] border border-white/[0.04] rounded-lg p-3">
                              <p className="text-[10px] text-white/55 leading-[1.7]">
                                {generateSecondaryRationale(item.client, item.assign)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Supporting Signals */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-pcis-gold" />
                            <span className="text-[9px] font-semibold uppercase tracking-widest text-pcis-gold">
                              Supporting Signals ({item.assign.signals.length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {item.assign.signals.map((signal, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.025] border border-white/[0.05] rounded-lg">
                                <div className="w-1 h-1 rounded-full bg-pcis-gold/50" />
                                <span className="text-[9px] text-white/60">{signal}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Scoring Impact */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
                            <span className="text-[9px] font-semibold uppercase tracking-widest text-[#a78bfa]">
                              Scoring Weight Impact
                            </span>
                          </div>
                          <div className="bg-white/[0.015] border border-white/[0.04] rounded-lg p-3">
                            <p className="text-[9px] text-white/45 leading-relaxed mb-3">
                              Because {item.client.name} is classified as {item.assign.primaryPurpose}, ENGINE
                              applies the following pillar weights when scoring property matches:
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[8px] text-white/40">Investment Weight</span>
                                  <span className="text-[9px] font-mono font-bold" style={{ color: primaryConfig.color }}>
                                    {Math.round(primaryConfig.investmentWeight * 100)}%
                                  </span>
                                </div>
                                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${primaryConfig.investmentWeight * 100}%`, backgroundColor: primaryConfig.color, opacity: 0.6 }} />
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[8px] text-white/40">Lifestyle Weight</span>
                                  <span className="text-[9px] font-mono font-bold" style={{ color: primaryConfig.color }}>
                                    {Math.round(primaryConfig.lifestyleWeight * 100)}%
                                  </span>
                                </div>
                                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${primaryConfig.lifestyleWeight * 100}%`, backgroundColor: primaryConfig.color, opacity: 0.6 }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Col 8-12: Quick Facts ──────────────────── */}
                      <div className="col-span-5 space-y-3">

                        {/* Confidence Model */}
                        <div className="bg-white/[0.015] border border-white/[0.04] rounded-lg p-3">
                          <span className="text-[8px] font-semibold uppercase tracking-widest text-white/40 block mb-3">Confidence Model</span>
                          <div className="flex items-center gap-4">
                            <ConfidenceRing pct={confPct} color={primaryConfig.color} />
                            <div className="flex-1 space-y-2">
                              {getConfidenceBreakdown(item.assign).map((seg, i) => (
                                <div key={i}>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-[8px] text-white/40">{seg.label}</span>
                                    <span className="text-[8px] font-mono" style={{ color: seg.color }}>{seg.value}%</span>
                                  </div>
                                  <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${seg.value}%`, backgroundColor: seg.color, opacity: 0.6 }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Client Profile */}
                        <div className="bg-white/[0.015] border border-white/[0.04] rounded-lg p-3 space-y-2.5">
                          <span className="text-[8px] font-semibold uppercase tracking-widest text-white/40 block">Client Profile</span>
                          {[
                            { label: 'Client Type', value: item.client.type },
                            { label: 'Category', value: item.client.category },
                            { label: 'Budget Range', value: `${((item.client.financialProfile?.budgetMin || 0) / 1e6).toFixed(1)} -- ${((item.client.financialProfile?.budgetMax || 0) / 1e6).toFixed(1)}M AED` },
                            { label: 'Portfolio Value', value: `${((item.client.financialProfile?.portfolioValue || 0) / 1e6).toFixed(1)}M AED` },
                            { label: 'Location', value: item.client.location },
                            { label: 'Deal Stage', value: item.client.dealStage },
                          ].map((row, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-[8px] text-white/35">{row.label}</span>
                              <span className="text-[9px] font-mono text-white/60">{row.value}</span>
                            </div>
                          ))}
                        </div>

                        {/* Key Scoring Factors */}
                        <div className="bg-white/[0.015] border border-white/[0.04] rounded-lg p-3">
                          <span className="text-[8px] font-semibold uppercase tracking-widest text-white/40 block mb-2">Key Scoring Factors</span>
                          <p className="text-[8px] text-white/35 mb-2">Properties matched to this client will be evaluated on:</p>
                          <div className="space-y-1.5">
                            {primaryConfig.keyFactors.map((factor, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: primaryConfig.color, opacity: 0.5 }} />
                                <span className="text-[9px] text-white/55">{factor}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Match Output Summary */}
                        <div className="bg-white/[0.015] border border-white/[0.04] rounded-lg p-3">
                          <span className="text-[8px] font-semibold uppercase tracking-widest text-white/40 block mb-2">Match Output</span>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center">
                              <span className="text-[14px] font-bold font-mono text-pcis-gold block">{item.matchCount}</span>
                              <span className="text-[7px] text-white/30 uppercase tracking-wider">Matches</span>
                            </div>
                            <div className="text-center">
                              <span className="text-[14px] font-bold font-mono block"
                                style={{ color: item.topScore >= 80 ? '#22c55e' : item.topScore >= 65 ? '#f59e0b' : '#ef4444' }}>
                                {item.topScore > 0 ? item.topScore : '--'}
                              </span>
                              <span className="text-[7px] text-white/30 uppercase tracking-wider">Top Score</span>
                            </div>
                            <div className="text-center">
                              <span className="text-[14px] font-bold font-mono text-white/60 block">
                                {new Date(item.assign.lastUpdated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </span>
                              <span className="text-[7px] text-white/30 uppercase tracking-wider">Last Updated</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-white/30 text-sm">No clients match the selected filter</p>
              <button onClick={() => setPurposeFilter(null)}
                className="mt-2 text-[9px] text-pcis-gold/60 hover:text-pcis-gold transition-colors">
                Clear filter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
