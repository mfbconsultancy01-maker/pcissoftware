'use client'

import React, { useMemo, useState } from 'react'
import {
  engineMatches,
  clientPurposes,
  PURPOSE_CONFIGS,
  getClientPurpose,
  type EngineMatch,
} from '@/lib/engineData'
import { clients, properties, type Client, type Property } from '@/lib/mockData'
import { getArea, type AreaProfile } from '@/lib/marketData'
import { getCIEClient, ARCHETYPES } from '@/lib/cieData'
import { ClientLink, PropertyLink } from '../useWorkspaceNav'
import { useMatchNarrative } from '@/hooks/useEngineAI'

// ═══════════════════════════════════════════════════════════════════════════
// E3 ENGINE -- CLIENT-PROPERTY GRID (ECP)
//
// Strategic heatmap plotting every scored client-property/area pairing.
// Resolves matches against both the property catalogue (p1-p10) and
// SCOUT area profiles (palm-jumeirah, dubai-marina, etc.) so the grid
// shows the full matching landscape, not just the property subset.
// ═══════════════════════════════════════════════════════════════════════════

// ── Resolve property OR area from a match ───────────────────────────────

interface ResolvedTarget {
  id: string
  label: string
  area: string
  price: string
  type: string
}

function resolveTarget(propertyId: string, match: EngineMatch): ResolvedTarget {
  // Try property first
  const prop = properties.find(p => p.id === propertyId)
  if (prop) return {
    id: prop.id,
    label: prop.name,
    area: prop.area,
    price: `${((prop.price || 0) / 1e6).toFixed(1)}M`,
    type: prop.type,
  }
  // Fall back to area
  const area = getArea(propertyId)
  if (area) return {
    id: area.id,
    label: area.name,
    area: area.name,
    price: area.avgPriceSqft ? `${area.avgPriceSqft.toLocaleString()}/sqft` : '--',
    type: 'Area',
  }
  return { id: propertyId, label: propertyId, area: '--', price: '--', type: '--' }
}

// ── Color & Score Utilities ─────────────────────────────────────────────

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e'
  if (score >= 65) return '#f59e0b'
  if (score >= 50) return '#06b6d4'
  return '#ef4444'
}

const getGradeColor = (grade: string): string => {
  const map: Record<string, string> = { 'A+': '#D4A574', 'A': '#10B981', 'B+': '#06B6D4', 'B': '#3B82F6', 'C': '#F59E0B', 'D': '#EF4444' }
  return map[grade] || '#9ca3af'
}

const getHeatmapBg = (score: number): string => {
  if (score >= 80) return 'rgba(34,197,94,0.14)'
  if (score >= 65) return 'rgba(245,158,11,0.11)'
  if (score >= 50) return 'rgba(6,182,212,0.09)'
  return 'rgba(239,68,68,0.09)'
}

// ── Score Ring SVG ──────────────────────────────────────────────────────

function ScoreRing({ score, size = 56, strokeWidth = 4 }: { score: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const color = getScoreColor(score)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 - 2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="13" fontWeight="bold" fontFamily="monospace">{score}</text>
      <text x={size / 2} y={size / 2 + 9} textAnchor="middle" dominantBaseline="central"
        fill="rgba(255,255,255,0.25)" fontSize="6" fontFamily="monospace">SCORE</text>
    </svg>
  )
}

// ── Intelligence Brief Generator ────────────────────────────────────────

interface BriefSection {
  heading: string
  body: string
  accent: string
}

function generateCellBrief(
  match: EngineMatch,
  client: Client,
  target: ResolvedTarget,
  archetypeLabel: string | null,
  purposeConf: number | null,
): BriefSection[] {
  const p = match.pillars
  const scores = [
    { name: 'Financial Fit', score: p.financialFit.score },
    { name: 'Lifestyle Fit', score: p.lifestyleFit.score },
    { name: 'Investment Fit', score: p.investmentFit.score },
    { name: 'Purpose Alignment', score: p.purposeAlignment.score },
  ]
  const strongest = scores.reduce((a, b) => a.score > b.score ? a : b)
  const weakest = scores.reduce((a, b) => a.score < b.score ? a : b)
  const config = PURPOSE_CONFIGS.find(c => c.id === match.purpose)
  const spread = strongest.score - weakest.score
  const budgetMin = ((client.financialProfile?.budgetMin || 0) / 1e6).toFixed(0)
  const budgetMax = ((client.financialProfile?.budgetMax || 0) / 1e6).toFixed(0)
  const area = match.areaData
  const conf = purposeConf ? Math.round(purposeConf * 100) : null

  const sections: BriefSection[] = []

  // 1. Executive Summary
  const ex: string[] = []
  ex.push(`ENGINE scored this ${match.purpose} match at ${match.overallScore}/100 (Grade ${match.grade}), pairing ${client.name} with ${target.label} (${target.area}, ${target.type}, AED ${target.price}).`)
  ex.push(` The client operates in the ${budgetMin}--${budgetMax}M AED range as a ${client.category || client.type} profile.`)
  if (archetypeLabel) ex.push(` CIE classifies this client as a "${archetypeLabel}" archetype, which shapes how ENGINE weights engagement signals and risk tolerance in the scoring model.`)
  if (conf) ex.push(` Purpose classification confidence sits at ${conf}% -- ${conf >= 85 ? 'high confidence means pillar weights are calibrated tightly to the declared purpose' : conf >= 70 ? 'moderate confidence, so the model applies some hedging across secondary purpose dimensions' : 'lower confidence introduces broader weighting across multiple purpose scenarios'}.`)
  ex.push(` The composite reflects a ${spread <= 10 ? 'well-balanced profile across all four pillars, indicating consistent alignment' : spread <= 20 ? 'moderate spread between pillar scores, indicating targeted strengths with identifiable gaps' : 'significant variance between pillars, signaling a polarised match that excels in some areas but falls short in others'}.`)
  sections.push({ heading: 'Executive Summary', body: ex.join(''), accent: '#C9A55A' })

  // 2. Strength Analysis
  const sa: string[] = []
  sa.push(`The strongest dimension is ${strongest.name} at ${strongest.score}/100. `)
  if (strongest.name === 'Financial Fit') {
    sa.push(`This means the property's pricing, projected costs, and expected returns sit well within the client's operating parameters. For ${match.purpose} buyers, financial alignment is the foundation -- it confirms the deal is commercially viable before any lifestyle or strategic factors come into play. The client's ${budgetMin}--${budgetMax}M AED range against this ${target.type} at AED ${target.price} ${p.financialFit.score >= 80 ? 'shows strong budget headroom' : 'shows an acceptable but tighter fit'}.`)
  } else if (strongest.name === 'Lifestyle Fit') {
    sa.push(`Location characteristics, community profile, and amenity infrastructure in ${target.area} align closely with the client's stated preferences and living requirements. For ${match.purpose} clients, this signals that the property environment matches their day-to-day expectations -- proximity, community maturity, and lifestyle amenities all score well against this client's profile.`)
  } else if (strongest.name === 'Investment Fit') {
    sa.push(`Market fundamentals -- rental yield, capital trajectory, demand dynamics, and exit liquidity -- support the ${match.purpose} acquisition thesis.${area ? ` The ${area.rentalYield > 0 ? (area.rentalYield * 100).toFixed(1) + '% gross yield' : 'yield profile'} and ${area.outlook} market outlook underpin this score. With ${area.demandScore}/100 demand and ${area.transactionCount.toLocaleString()} recent transactions, the area demonstrates ${area.demandScore >= 75 ? 'strong institutional-grade liquidity' : area.demandScore >= 50 ? 'healthy transactional activity' : 'developing demand patterns'}.` : ''}`)
  } else {
    sa.push(`The property's core characteristics map directly onto ENGINE's ${match.purpose} evaluation criteria: ${config?.keyFactors.slice(0, 3).join(', ') || 'key strategic factors'}. This means the "why" of the match is well-grounded -- the property was designed or positioned for exactly this type of buyer. Purpose alignment is the narrative pillar -- it determines how convincingly the match story can be told to the client.`)
  }
  sections.push({ heading: 'Strength Analysis', body: sa.join(''), accent: '#22c55e' })

  // 3. Risk & Friction Assessment
  const rf: string[] = []
  if (weakest.score < 60) {
    rf.push(`${weakest.name} scored ${weakest.score}/100, which ENGINE flags as a friction point requiring attention. `)
    if (weakest.name === 'Financial Fit') {
      rf.push(`The property's price point or projected financial return falls outside the client's optimal budget range. This doesn't disqualify the match, but any FORGE presentation should include a clear financial justification -- potentially highlighting long-term appreciation, rental offset, or negotiation margin to bridge the gap.`)
    } else if (weakest.name === 'Lifestyle Fit') {
      rf.push(`Location or community characteristics don't fully align with the client's preferences. If presenting this match, FORGE should emphasise other compensating strengths and frame the lifestyle gap in context -- for instance, an area undergoing rapid development may score lower today but could improve significantly within 12--18 months.`)
    } else if (weakest.name === 'Investment Fit') {
      rf.push(`Market fundamentals present risk for this pairing. Yield, demand trajectory, or exit liquidity metrics don't strongly support the ${match.purpose} thesis at the current price point. A FORGE brief should position this transparently and perhaps frame it as a medium-term play if price momentum is expected to shift.`)
    } else {
      rf.push(`The property doesn't strongly satisfy the specific criteria ENGINE evaluates for ${match.purpose} buyers. This creates a narrative gap -- the "why" of the match is harder to articulate. FORGE should lean on pillar strengths in other areas when building the client presentation.`)
    }
  } else if (weakest.score < 70) {
    rf.push(`No critical friction detected. The weakest dimension (${weakest.name} at ${weakest.score}/100) is still in acceptable range but represents the area with most room for improvement. In a FORGE presentation, this dimension should be acknowledged with context rather than left unaddressed -- proactive framing builds stronger client trust and prevents objections.`)
  } else {
    rf.push(`All four pillars score above 70/100, indicating a low-friction match with no critical weaknesses. This is a well-rounded pairing that should present cleanly across all dimensions. The broker can lead with any pillar in the client conversation without needing to deflect from weak points.`)
  }
  sections.push({ heading: 'Risk & Friction Assessment', body: rf.join(''), accent: weakest.score < 60 ? '#ef4444' : weakest.score < 70 ? '#f59e0b' : '#22c55e' })

  // 4. Market Context
  if (area) {
    const mc: string[] = []
    mc.push(`SCOUT market data for ${target.area} shows ${area.transactionCount.toLocaleString()} recent transactions at AED ${area.avgPriceSqft.toLocaleString()}/sqft average.`)
    mc.push(` ${area.priceChange30d >= 0 ? `Prices moved +${area.priceChange30d.toFixed(1)}% over the last 30 days -- ${area.priceChange30d > 3 ? 'strong upward momentum suggesting timing pressure for entry' : 'steady appreciation supporting the value case'}.` : `Prices adjusted ${area.priceChange30d.toFixed(1)}% in 30 days -- ${area.priceChange30d < -3 ? 'notable correction that could create a favourable entry window for this client' : 'minor softening within normal market range'}.`}`)
    mc.push(` Demand score: ${area.demandScore}/100. Market outlook: ${area.outlook}. ${area.outlook === 'bullish' ? 'Favourable conditions for both entry and medium-term hold -- appreciation expected during the typical holding period.' : area.outlook === 'neutral' ? 'Stable conditions -- no urgency signals but no deterioration either, suitable for methodical decision-making.' : 'Caution warranted -- market headwinds may affect exit timing and should be factored into FORGE presentation.'}`)
    sections.push({ heading: 'Market Context', body: mc.join(''), accent: '#06b6d4' })
  }

  // 5. Recommendation
  const rc: string[] = []
  if (match.grade === 'A+' || match.grade === 'A') {
    rc.push(`Grade ${match.grade} -- this match is cleared for FORGE progression. It should be queued for deal brief generation and client presentation preparation. The scoring profile supports a confident recommendation with minimal caveats needed.`)
    if (match.status === 'active') rc.push(` Current status: Active. Recommend escalating to "presented" and assigning a FORGE deliverable timeline.`)
    else if (match.status === 'shortlisted') rc.push(` Currently shortlisted. Strong candidate for next client meeting -- ensure the FORGE brief is current and presentation-ready.`)
    else if (match.status === 'presented') rc.push(` Already presented to client. Monitor for response and prepare follow-up collateral or comparative alternatives.`)
  } else if (match.grade === 'B+' || match.grade === 'B') {
    rc.push(`Grade ${match.grade} -- a viable match with identifiable strengths. Suitable for presentation if the FORGE brief proactively addresses the weaker dimensions with context and framing. Consider pairing this with a Grade A match in a comparative presentation so the client sees options and this property's specific advantages are highlighted against a stronger baseline.`)
  } else {
    rc.push(`Grade ${match.grade} -- below the typical presentation threshold. This match has ${weakest.score < 50 ? 'critical' : 'notable'} gaps in ${weakest.name} that would require significant reframing or a change in client requirements to become viable. ENGINE recommends holding this in the pipeline rather than progressing to FORGE unless the client's criteria shift or market conditions in ${target.area} change materially.`)
  }
  sections.push({ heading: 'Recommendation', body: rc.join(''), accent: match.grade === 'A+' || match.grade === 'A' ? '#22c55e' : match.grade === 'B+' || match.grade === 'B' ? '#f59e0b' : '#ef4444' })

  return sections
}

// ── Grid Data Builder ───────────────────────────────────────────────────

interface GridData {
  clientIds: string[]
  targetIds: string[]
  matchLookup: Map<string, EngineMatch>
  targetMap: Map<string, ResolvedTarget>
  clientAvg: Map<string, { total: number; count: number }>
  targetAvg: Map<string, { total: number; count: number }>
  totalPairs: number
  avgScore: number
  gradeDistribution: Record<string, number>
}

function buildGrid(): GridData {
  // Build best-match lookup (deduplicated by client+property)
  const matchLookup = new Map<string, EngineMatch>()
  engineMatches.forEach(m => {
    const key = `${m.clientId}|${m.propertyId}`
    if (!matchLookup.has(key) || m.overallScore > (matchLookup.get(key)?.overallScore || 0)) {
      matchLookup.set(key, m)
    }
  })

  // Count matches per client and per target to rank them
  const clientCounts = new Map<string, number>()
  const targetCounts = new Map<string, number>()
  matchLookup.forEach((m, key) => {
    const [cId, tId] = key.split('|')
    clientCounts.set(cId, (clientCounts.get(cId) || 0) + 1)
    targetCounts.set(tId, (targetCounts.get(tId) || 0) + 1)
  })

  // Take top clients and targets by match count
  const clientIds = Array.from(clientCounts.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id]) => id)
  const targetIds = Array.from(targetCounts.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 14).map(([id]) => id)

  // Resolve targets
  const targetMap = new Map<string, ResolvedTarget>()
  targetIds.forEach(id => {
    const sampleMatch = engineMatches.find(m => m.propertyId === id)
    if (sampleMatch) targetMap.set(id, resolveTarget(id, sampleMatch))
  })

  // Compute averages
  const clientAvg = new Map<string, { total: number; count: number }>()
  const targetAvg = new Map<string, { total: number; count: number }>()
  clientIds.forEach(id => clientAvg.set(id, { total: 0, count: 0 }))
  targetIds.forEach(id => targetAvg.set(id, { total: 0, count: 0 }))

  let totalScore = 0, totalCount = 0
  const gradeDistribution: Record<string, number> = {}

  matchLookup.forEach((match, key) => {
    const [cId, tId] = key.split('|')
    if (clientIds.includes(cId) && targetIds.includes(tId)) {
      const cs = clientAvg.get(cId)
      const ts = targetAvg.get(tId)
      if (cs) { cs.total += match.overallScore; cs.count++ }
      if (ts) { ts.total += match.overallScore; ts.count++ }
      totalScore += match.overallScore
      totalCount++
      gradeDistribution[match.grade] = (gradeDistribution[match.grade] || 0) + 1
    }
  })

  return {
    clientIds, targetIds, matchLookup, targetMap,
    clientAvg, targetAvg,
    totalPairs: totalCount,
    avgScore: totalCount > 0 ? totalScore / totalCount : 0,
    gradeDistribution,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface SelectedCell {
  match: EngineMatch
  client: Client
  target: ResolvedTarget
}

export default function ENGClientPropertyGridView(): React.ReactElement {
  const grid = useMemo(() => buildGrid(), [])
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)
  const [highlightPurpose, setHighlightPurpose] = useState<string | null>(null)
  const aiNarrative = useMatchNarrative()

  const topClientObjects = grid.clientIds.map(id => clients.find(c => c.id === id)).filter(Boolean) as Client[]

  const handleCellClick = (clientId: string, targetId: string) => {
    const key = `${clientId}|${targetId}`
    const match = grid.matchLookup.get(key)
    if (!match) return
    const client = clients.find(c => c.id === clientId)
    const target = grid.targetMap.get(targetId)
    if (client && target) setSelectedCell({ match, client, target })
  }

  const selCie = selectedCell ? getCIEClient(selectedCell.client.id) : null
  const selArchetype = selCie?.archetype ? ARCHETYPES.find(a => a.id === selCie.archetype) : null
  const selPurpose = selectedCell ? getClientPurpose(selectedCell.client.id) : null

  const allGrades = ['A+', 'A', 'B+', 'B', 'C', 'D']
  const activePurposes = useMemo(() => {
    const set = new Set<string>()
    engineMatches.forEach(m => set.add(m.purpose))
    return Array.from(set).sort()
  }, [])

  return (
    <div className="h-full flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 pb-2 border-b border-pcis-border/10">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-[3px] h-5 rounded-full bg-[#D4A574]" />
              <h2 className="text-base font-semibold text-white/90 tracking-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}>
                Client--Property Grid
              </h2>
            </div>
            <p className="text-[8px] text-white/30 tracking-wider uppercase ml-3">
              ECP -- Strategic Heatmap -- {grid.clientIds.length} Clients x {grid.targetIds.length} Targets -- Click Cell for Brief
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Grade chips */}
            <div className="flex items-center gap-1">
              {allGrades.map(g => (
                <div key={g} className="text-center">
                  <span className="text-[9px] font-bold font-mono block" style={{ color: getGradeColor(g) }}>
                    {grid.gradeDistribution[g] || 0}
                  </span>
                  <span className="text-[6px] text-white/20 font-mono">{g}</span>
                </div>
              ))}
            </div>
            <div className="w-px h-6 bg-white/[0.06]" />
            <div className="text-right">
              <span className="text-[16px] font-bold font-mono text-pcis-gold">{grid.totalPairs}</span>
              <span className="text-[7px] text-white/25 block">pairs</span>
            </div>
            <div className="text-right">
              <span className="text-[16px] font-bold font-mono" style={{ color: getScoreColor(grid.avgScore) }}>
                {grid.avgScore.toFixed(0)}
              </span>
              <span className="text-[7px] text-white/25 block">avg</span>
            </div>
          </div>
        </div>

        {/* Purpose filter row */}
        <div className="flex items-center gap-1 mt-2 ml-3">
          <span className="text-[7px] text-white/20 uppercase tracking-wider mr-1">Filter:</span>
          <button onClick={() => setHighlightPurpose(null)}
            className={`text-[7px] font-mono px-1.5 py-0.5 rounded border transition-all ${!highlightPurpose ? 'border-pcis-gold/30 bg-pcis-gold/10 text-pcis-gold' : 'border-transparent bg-white/[0.02] text-white/30 hover:bg-white/[0.04]'}`}>
            All
          </button>
          {activePurposes.map(p => {
            const cfg = PURPOSE_CONFIGS.find(c => c.id === p)
            const active = highlightPurpose === p
            return (
              <button key={p} onClick={() => setHighlightPurpose(active ? null : p)}
                className={`text-[7px] font-mono px-1.5 py-0.5 rounded border transition-all ${active ? 'border-white/15 bg-white/[0.06]' : 'border-transparent bg-white/[0.02] hover:bg-white/[0.04]'}`}
                style={{ color: cfg?.color || '#C9A55A' }}>
                {p}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content Area ────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Grid (left side, or full width if no selection) */}
        <div className={`${selectedCell ? 'w-[55%] border-r border-white/[0.06]' : 'w-full'} overflow-auto min-h-0 py-1 transition-all duration-300`}>
          <div className="inline-block min-w-full">

            {/* Column Headers */}
            <div className="flex gap-0 border-b border-white/[0.06] bg-white/[0.015] sticky top-0 z-10">
              <div className="w-36 flex-shrink-0 py-1.5 px-2 sticky left-0 z-20 bg-[#1a1a1a]">
                <p className="text-[7px] text-white/25 uppercase tracking-wider font-mono">Target</p>
              </div>
              {topClientObjects.map((client) => {
                const purpose = clientPurposes.find(p => p.clientId === client.id)
                const purposeConfig = purpose ? PURPOSE_CONFIGS.find(c => c.id === purpose.primaryPurpose) : null
                const cStats = grid.clientAvg.get(client.id)
                const cAvg = cStats && cStats.count > 0 ? cStats.total / cStats.count : 0
                const dimmed = highlightPurpose && purpose?.primaryPurpose !== highlightPurpose

                return (
                  <div key={client.id}
                    className={`w-[68px] flex-shrink-0 py-1.5 px-0.5 border-l border-white/[0.04] text-center transition-opacity duration-200 ${dimmed ? 'opacity-20' : ''}`}>
                    <ClientLink clientId={client.id} className="hover:text-pcis-gold">
                      <p className="text-[8px] font-semibold text-white/75 font-mono">{client.initials || '??'}</p>
                    </ClientLink>
                    <span className="text-[5px] font-bold uppercase tracking-wider px-1 py-px rounded block mt-0.5 mx-auto w-fit"
                      style={{ backgroundColor: `${purposeConfig?.color || '#D4A574'}18`, color: purposeConfig?.color || '#D4A574' }}>
                      {purpose?.primaryPurpose.slice(0, 3) || '--'}
                    </span>
                  </div>
                )
              })}
              <div className="w-12 flex-shrink-0 py-1.5 px-0.5 border-l border-white/[0.06] bg-white/[0.02] text-center">
                <p className="text-[6px] text-white/30 uppercase font-mono">Avg</p>
              </div>
            </div>

            {/* Grid Rows */}
            {grid.targetIds.map((targetId) => {
              const target = grid.targetMap.get(targetId)
              const tStats = grid.targetAvg.get(targetId)
              const tAvg = tStats && tStats.count > 0 ? tStats.total / tStats.count : 0
              if (!target) return null

              return (
                <div key={targetId} className="flex gap-0 border-b border-white/[0.025] hover:bg-white/[0.01] transition-colors">
                  {/* Row Header */}
                  <div className="w-36 flex-shrink-0 py-1 px-2 sticky left-0 z-20 border-r border-white/[0.04] bg-[#1a1a1a]">
                    <p className="text-[8px] font-semibold text-white/70 truncate font-mono">{target.label}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[6px] text-white/25 font-mono">{target.type}</span>
                      <span className="text-[6px] text-white/20 font-mono">{target.price}</span>
                    </div>
                  </div>

                  {/* Data Cells */}
                  {grid.clientIds.map((clientId) => {
                    const key = `${clientId}|${targetId}`
                    const match = grid.matchLookup.get(key)
                    const purpose = clientPurposes.find(p => p.clientId === clientId)
                    const dimmed = highlightPurpose && purpose?.primaryPurpose !== highlightPurpose
                    const isSelected = selectedCell?.match.id === match?.id

                    return (
                      <div key={key} onClick={() => match && handleCellClick(clientId, targetId)}
                        className={`w-[68px] flex-shrink-0 py-1 px-0.5 border-l border-white/[0.04] flex items-center justify-center transition-all duration-150 ${match ? 'cursor-pointer hover:brightness-130' : ''} ${dimmed ? 'opacity-15' : ''} ${isSelected ? 'ring-1 ring-pcis-gold/50 z-[5]' : ''}`}
                        style={{ backgroundColor: match ? getHeatmapBg(match.overallScore) : 'transparent' }}>
                        {match ? (
                          <div className="text-center">
                            <span className="text-[10px] font-bold font-mono leading-none" style={{ color: getScoreColor(match.overallScore) }}>
                              {match.overallScore}
                            </span>
                            <span className="text-[6px] font-semibold font-mono block leading-none mt-0.5" style={{ color: getGradeColor(match.grade) }}>
                              {match.grade}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[8px] text-white/8 font-mono">--</span>
                        )}
                      </div>
                    )
                  })}

                  {/* Row Avg */}
                  <div className="w-12 flex-shrink-0 py-1 px-0.5 border-l border-white/[0.06] bg-white/[0.015] flex items-center justify-center">
                    {tStats && tStats.count > 0 ? (
                      <span className="text-[8px] font-bold font-mono" style={{ color: getScoreColor(tAvg) }}>{tAvg.toFixed(0)}</span>
                    ) : (
                      <span className="text-[7px] text-white/10 font-mono">--</span>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Summary Row */}
            <div className="flex gap-0 border-t border-white/[0.08] bg-white/[0.02]">
              <div className="w-36 flex-shrink-0 py-1.5 px-2 sticky left-0 z-20 border-r border-white/[0.04] bg-[#1a1a1a]">
                <p className="text-[7px] font-semibold text-white/40 uppercase tracking-wider font-mono">Client Avg</p>
              </div>
              {grid.clientIds.map((clientId) => {
                const cs = grid.clientAvg.get(clientId)
                const cAvg = cs && cs.count > 0 ? cs.total / cs.count : 0
                const purpose = clientPurposes.find(p => p.clientId === clientId)
                const dimmed = highlightPurpose && purpose?.primaryPurpose !== highlightPurpose
                return (
                  <div key={`sum-${clientId}`}
                    className={`w-[68px] flex-shrink-0 py-1.5 px-0.5 border-l border-white/[0.04] flex items-center justify-center transition-opacity duration-200 ${dimmed ? 'opacity-15' : ''}`}>
                    {cs && cs.count > 0 ? (
                      <div className="text-center">
                        <span className="text-[8px] font-bold font-mono" style={{ color: getScoreColor(cAvg) }}>{cAvg.toFixed(0)}</span>
                        <span className="text-[5px] text-white/20 font-mono block">{cs.count}x</span>
                      </div>
                    ) : (
                      <span className="text-[7px] text-white/10 font-mono">--</span>
                    )}
                  </div>
                )
              })}
              <div className="w-12 flex-shrink-0 py-1.5 border-l border-white/[0.06] bg-white/[0.03]" />
            </div>
          </div>
        </div>

        {/* ── Detail Brief (right side panel) ────────────────────────── */}
        {selectedCell && (
          <div className="w-[45%] overflow-auto bg-gradient-to-b from-white/[0.015] to-transparent">
            <div className="p-4">

              {/* Brief Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <ScoreRing score={selectedCell.match.overallScore} />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-pcis-gold">Match Brief</span>
                      <span className="text-[8px] font-bold font-mono px-1 py-px rounded"
                        style={{ backgroundColor: `${getGradeColor(selectedCell.match.grade)}15`, color: getGradeColor(selectedCell.match.grade) }}>
                        {selectedCell.match.grade}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-white/85" style={{ fontFamily: "'Playfair Display', serif" }}>
                      <ClientLink clientId={selectedCell.client.id} className="hover:text-pcis-gold">
                        {selectedCell.client.name}
                      </ClientLink>
                    </p>
                    <p className="text-[10px] text-white/40 font-mono">
                      {selectedCell.target.label} -- {selectedCell.target.type} -- {selectedCell.target.price}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {selArchetype && (
                        <span className="text-[7px] font-mono px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${selArchetype.color}12`, color: selArchetype.color }}>
                          {selArchetype.label}
                        </span>
                      )}
                      {selPurpose && (
                        <span className="text-[7px] font-mono px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${PURPOSE_CONFIGS.find(c => c.id === selPurpose.primaryPurpose)?.color || '#C9A55A'}12`, color: PURPOSE_CONFIGS.find(c => c.id === selPurpose.primaryPurpose)?.color || '#C9A55A' }}>
                          {selPurpose.primaryPurpose} {Math.round(selPurpose.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedCell(null)}
                  className="text-[8px] text-white/25 hover:text-white/50 transition-colors font-mono border border-white/[0.06] rounded px-1.5 py-0.5 hover:bg-white/[0.03]">
                  x
                </button>
              </div>

              {/* 4-Pillar Mini Bars */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: 'Financial', pillar: selectedCell.match.pillars.financialFit },
                  { label: 'Lifestyle', pillar: selectedCell.match.pillars.lifestyleFit },
                  { label: 'Investment', pillar: selectedCell.match.pillars.investmentFit },
                  { label: 'Purpose', pillar: selectedCell.match.pillars.purposeAlignment },
                ].map((item, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[7px] text-white/30 uppercase tracking-wider font-mono">{item.label}</span>
                      <span className="text-[10px] font-bold font-mono" style={{ color: getScoreColor(item.pillar.score) }}>
                        {item.pillar.score}
                      </span>
                    </div>
                    <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${item.pillar.score}%`, backgroundColor: getScoreColor(item.pillar.score) }} />
                    </div>
                    <span className="text-[7px] text-white/20 font-mono mt-0.5 block">
                      {Math.round(item.pillar.weight * 100)}% weight -- {item.pillar.score >= 80 ? 'Strong' : item.pillar.score >= 65 ? 'Adequate' : item.pillar.score >= 50 ? 'Weak' : 'Critical'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Intelligence Sections */}
              <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-pcis-gold" />
                  <span className="text-[8px] font-semibold uppercase tracking-widest text-pcis-gold">Analysis</span>
                  <button
                    onClick={() => {
                      const prop = properties.find(p => p.id === selectedCell.match.propertyId)
                      const purposeConfig = PURPOSE_CONFIGS.find(c => c.id === selectedCell.match.purpose)
                      const cieProfile = selCie?.profile
                      aiNarrative.generate({
                        matchId: selectedCell.match.id,
                        overallScore: selectedCell.match.overallScore,
                        grade: selectedCell.match.grade,
                        purpose: selectedCell.match.purpose,
                        confidence: selectedCell.match.confidence,
                        status: selectedCell.match.status,
                        financialFit: { score: selectedCell.match.pillars.financialFit.score, weight: selectedCell.match.pillars.financialFit.weight, breakdown: selectedCell.match.pillars.financialFit.breakdown || '' },
                        lifestyleFit: { score: selectedCell.match.pillars.lifestyleFit.score, weight: selectedCell.match.pillars.lifestyleFit.weight, breakdown: selectedCell.match.pillars.lifestyleFit.breakdown || '' },
                        investmentFit: { score: selectedCell.match.pillars.investmentFit.score, weight: selectedCell.match.pillars.investmentFit.weight, breakdown: selectedCell.match.pillars.investmentFit.breakdown || '' },
                        purposeAlignment: { score: selectedCell.match.pillars.purposeAlignment.score, weight: selectedCell.match.pillars.purposeAlignment.weight, breakdown: selectedCell.match.pillars.purposeAlignment.breakdown || '' },
                        clientName: selectedCell.client.name,
                        clientType: selectedCell.client.type,
                        clientCategory: selectedCell.client.category,
                        budgetMin: selectedCell.client.financialProfile?.budgetMin || 0,
                        budgetMax: selectedCell.client.financialProfile?.budgetMax || 0,
                        location: selectedCell.client.location,
                        dealStage: selectedCell.client.dealStage,
                        archetype: selCie?.archetype || 'balanced',
                        archetypeLabel: selArchetype?.label || 'Balanced',
                        cognitiveScores: cieProfile?.scores.map(s => ({ dimension: s.dimension, value: s.value })) || [],
                        keyTraits: cieProfile?.keyTraits || [],
                        approachStrategy: cieProfile?.approachStrategy || '',
                        communicationTips: cieProfile?.communicationTips || [],
                        engagementScore: selCie?.engagement?.engagementScore ?? null,
                        engagementMomentum: selCie?.engagement?.momentum ?? null,
                        propertyName: selectedCell.target.label,
                        propertyArea: selectedCell.target.area,
                        propertyType: selectedCell.target.type,
                        propertyPrice: prop?.price || 0,
                        propertyBedrooms: prop?.bedrooms || 0,
                        propertyFeatures: prop?.features || [],
                        areaAvgPriceSqft: selectedCell.match.areaData?.avgPriceSqft ?? null,
                        areaRentalYield: selectedCell.match.areaData?.rentalYield ?? null,
                        areaDemandScore: selectedCell.match.areaData?.demandScore ?? null,
                        areaPriceChange30d: selectedCell.match.areaData?.priceChange30d ?? null,
                        areaTransactionCount: selectedCell.match.areaData?.transactionCount ?? null,
                        areaOutlook: selectedCell.match.areaData?.outlook ?? null,
                        investmentWeight: purposeConfig?.investmentWeight || 0.5,
                        lifestyleWeight: purposeConfig?.lifestyleWeight || 0.5,
                        keyFactors: purposeConfig?.keyFactors || [],
                        dataLayerNarrative: selectedCell.match.narrative,
                      })
                    }}
                    disabled={aiNarrative.loading}
                    className="ml-auto text-[7px] font-mono px-2 py-0.5 rounded border border-pcis-gold/20 bg-pcis-gold/5 text-pcis-gold hover:bg-pcis-gold/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {aiNarrative.loading ? (
                      <><span className="inline-block w-2 h-2 border border-pcis-gold/40 border-t-pcis-gold rounded-full animate-spin" /> Generating...</>
                    ) : (
                      <><svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l2.2 4.5L15 6.3l-3.5 3.4.8 4.8L8 12.2 3.7 14.5l.8-4.8L1 6.3l4.8-.8z"/></svg> AI Analyse</>
                    )}
                  </button>
                </div>

                {/* Data summary */}
                <div className="bg-white/[0.02] rounded-lg p-2.5 mb-3 border-l-2 border-pcis-gold/25">
                  <span className="text-[7px] font-semibold uppercase tracking-wider text-pcis-gold/40 block mb-0.5">Data Summary</span>
                  <p className="text-[10px] text-white/50 leading-[1.75]">{selectedCell.match.narrative}</p>
                </div>

                {/* Generated template sections */}
                <div className="space-y-2.5">
                  {generateCellBrief(
                    selectedCell.match,
                    selectedCell.client,
                    selectedCell.target,
                    selArchetype?.label || null,
                    selPurpose?.confidence || null,
                  ).map((section, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: section.accent }} />
                        <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: section.accent }}>{section.heading}</span>
                      </div>
                      <p className="text-[10px] text-white/55 leading-[1.75] pl-2.5 border-l border-white/[0.04]">
                        {section.body}
                      </p>
                    </div>
                  ))}
                </div>

                {/* AI-Generated Narrative */}
                {(aiNarrative.content || aiNarrative.loading || aiNarrative.error) && (
                  <div className="mt-3 pt-3 border-t border-pcis-gold/10">
                    <div className="bg-pcis-gold/[0.03] border border-pcis-gold/10 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="#C9A55A"><path d="M8 1l2.2 4.5L15 6.3l-3.5 3.4.8 4.8L8 12.2 3.7 14.5l.8-4.8L1 6.3l4.8-.8z"/></svg>
                        <span className="text-[8px] font-semibold uppercase tracking-widest text-pcis-gold">AI-Powered Brief</span>
                        {aiNarrative.tokens > 0 && (
                          <span className="text-[6px] text-white/15 font-mono ml-auto">{aiNarrative.tokens} tokens{aiNarrative.cached ? ' (cached)' : ''}</span>
                        )}
                      </div>
                      {aiNarrative.loading && (
                        <div className="flex items-center gap-2 py-4">
                          <div className="w-3 h-3 border-2 border-pcis-gold/30 border-t-pcis-gold rounded-full animate-spin" />
                          <span className="text-[9px] text-white/40">Synthesising intelligence across CIE, ENGINE, and SCOUT...</span>
                        </div>
                      )}
                      {aiNarrative.error && (
                        <p className="text-[9px] text-red-400/70">Error: {aiNarrative.error}</p>
                      )}
                      {aiNarrative.content && (
                        <div className="text-[10px] text-white/60 leading-[1.75] space-y-2.5">
                          {aiNarrative.content.split('\n\n').map((para, i) => {
                            const headingMatch = para.match(/^(EXECUTIVE SUMMARY|STRENGTH ANALYSIS|RISK & FRICTION ASSESSMENT|MARKET POSITIONING|STRATEGIC RECOMMENDATION)\n?([\s\S]*)$/)
                            if (headingMatch) {
                              const hc: Record<string, string> = { 'EXECUTIVE SUMMARY': '#C9A55A', 'STRENGTH ANALYSIS': '#22c55e', 'RISK & FRICTION ASSESSMENT': '#f59e0b', 'MARKET POSITIONING': '#06b6d4', 'STRATEGIC RECOMMENDATION': '#a78bfa' }
                              return (
                                <div key={i}>
                                  <span className="text-[8px] font-semibold uppercase tracking-wider block mb-1" style={{ color: hc[headingMatch[1]] || '#C9A55A' }}>{headingMatch[1]}</span>
                                  <p className="pl-2.5 border-l border-white/[0.04]">{headingMatch[2].trim()}</p>
                                </div>
                              )
                            }
                            return <p key={i}>{para}</p>
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-2.5 pt-1.5 border-t border-white/[0.03] flex items-center justify-between">
                  <span className="text-[6px] text-white/12 font-mono">ENGINE ECP Intelligence</span>
                  <span className="text-[6px] text-white/12 font-mono">{new Date(selectedCell.match.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Legend ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 py-1.5 border-t border-white/[0.04] bg-white/[0.01]">
        <div className="flex items-center gap-4 text-[7px]">
          <span className="text-white/15 uppercase tracking-wider font-mono">Score:</span>
          {[
            { label: '80+', color: '#22c55e' },
            { label: '65--79', color: '#f59e0b' },
            { label: '50--64', color: '#06b6d4' },
            { label: '<50', color: '#ef4444' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color + '25', border: `1px solid ${item.color}35` }} />
              <span className="text-white/30 font-mono">{item.label}</span>
            </div>
          ))}
          <span className="text-white/10 font-mono ml-auto">
            {selectedCell ? 'Brief open -- click cell or x to change' : 'Click any scored cell'}
          </span>
        </div>
      </div>
    </div>
  )
}
