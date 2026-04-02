'use client'

import React, { useState, useMemo } from 'react'
import {
  engineMatches,
  PURPOSE_CONFIGS,
  getClientPurpose,
  type EngineMatch,
  type PillarScore,
} from '@/lib/engineData'
import { getClient, getProperty } from '@/lib/mockData'
import { getCIEClient, ARCHETYPES } from '@/lib/cieData'
import { ClientLink, PropertyLink } from '../useWorkspaceNav'
import { useMatchNarrative } from '@/hooks/useEngineAI'

// ═══════════════════════════════════════════════════════════════════════════
// E3 ENGINE -- MATCH SCORER (EMS)
//
// The core of the matching engine. Every client-property pair is evaluated
// across 4 pillars: Financial Fit, Lifestyle Fit, Investment Fit, and
// Purpose Alignment. Each pillar produces a weighted score with a written
// breakdown explaining the reasoning. The composite score determines the
// grade (A+ through D) and the narrative tells the full story.
//
// This panel is the assembly line -- you select a match from the left,
// and the right side shows you exactly how that score was computed,
// what each pillar contributed, and why.
// ═══════════════════════════════════════════════════════════════════════════

// ── Color Utilities ─────────────────────────────────────────────────────

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

const getGradeBg = (grade: string): string => {
  const map: Record<string, string> = { 'A+': 'bg-[#D4A574]/10', 'A': 'bg-emerald-400/10', 'B+': 'bg-cyan-400/10', 'B': 'bg-blue-400/10', 'C': 'bg-amber-400/10', 'D': 'bg-red-400/10' }
  return map[grade] || 'bg-white/[0.03]'
}

// ── Score Ring SVG ──────────────────────────────────────────────────────

function ScoreRing({ score, size = 80, strokeWidth = 5 }: { score: number; size?: number; strokeWidth?: number }) {
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
      <text x={size / 2} y={size / 2 - 5} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="16" fontWeight="bold" fontFamily="monospace">{score}</text>
      <text x={size / 2} y={size / 2 + 9} textAnchor="middle" dominantBaseline="central"
        fill="rgba(255,255,255,0.35)" fontSize="7" fontFamily="monospace">SCORE</text>
    </svg>
  )
}

// ── Pillar Explanation Generator ────────────────────────────────────────

function generatePillarContext(pillar: PillarScore, match: EngineMatch): string {
  const purpose = match.purpose
  const config = PURPOSE_CONFIGS.find(p => p.id === purpose)
  const weight = Math.round(pillar.weight * 100)

  if (pillar.shortCode === 'FIN') {
    if (pillar.score >= 80) return `Strong financial alignment. The property sits within the client's operating budget, and projected returns align with ${purpose} expectations. This pillar carries ${weight}% of the composite score for ${purpose} clients.`
    if (pillar.score >= 65) return `Adequate financial fit with minor friction points. Price point or projected yield is slightly outside optimal range for this client's budget profile. Weight: ${weight}% for ${purpose} classification.`
    return `Financial misalignment detected. Property pricing or expected returns fall outside the target range for this client's financial profile. Despite the ${weight}% weight, this pillar is pulling the composite score down.`
  }
  if (pillar.shortCode === 'LIF') {
    if (pillar.score >= 80) return `Excellent lifestyle match. Location, community, and amenity profile align strongly with the client's preferences and living requirements. For ${purpose} buyers, this pillar carries ${weight}% weight.`
    if (pillar.score >= 65) return `Moderate lifestyle fit. Some aspects of location or amenities align, but the property doesn't perfectly match all lifestyle criteria. Weight: ${weight}% for ${purpose} classification.`
    return `Lifestyle friction identified. The property's location, community type, or amenity offering doesn't align well with this client's preferences. At ${weight}% weight for ${purpose} buyers, this affects the grade.`
  }
  if (pillar.shortCode === 'INV') {
    if (pillar.score >= 80) return `Strong investment fundamentals. Rental yield, capital appreciation trajectory, and market position all support a ${purpose} acquisition thesis. This pillar is weighted at ${weight}% for ${purpose} clients.`
    if (pillar.score >= 65) return `Reasonable investment case with caveats. Some fundamentals are solid but others (yield, growth, or market timing) show mixed signals. Weight: ${weight}%.`
    return `Weak investment case for this property-client pairing. Key investment metrics (yield, appreciation, demand) don't support the ${purpose} thesis at this price point. Weight: ${weight}%.`
  }
  // Purpose Alignment
  if (pillar.score >= 80) return `Tight purpose alignment. The property's characteristics map directly to the key factors ENGINE evaluates for ${purpose} buyers: ${config?.keyFactors.slice(0, 3).join(', ')}. This is the "why does this match make sense" pillar, weighted at ${weight}%.`
  if (pillar.score >= 65) return `Partial purpose alignment. The property satisfies some ${purpose} criteria (${config?.keyFactors.slice(0, 2).join(', ')}) but gaps remain. At ${weight}% weight, there's room for improvement in this match.`
  return `Purpose misalignment. The property doesn't strongly satisfy the key factors for ${purpose} buyers. ENGINE flags this as a weak match on the purpose dimension specifically.`
}

// ── Detailed Match Narrative Generator ──────────────────────────────────

interface NarrativeSection {
  heading: string
  body: string
  accent: string
}

function generateDetailedNarrative(
  match: EngineMatch,
  clientName: string,
  propertyLabel: string,
  archetypeLabel: string | null,
  purposeConfidence: number | null,
): NarrativeSection[] {
  const p = match.pillars
  const config = PURPOSE_CONFIGS.find(c => c.id === match.purpose)
  const allScores = [p.financialFit.score, p.lifestyleFit.score, p.investmentFit.score, p.purposeAlignment.score]
  const strongest = (['Financial Fit', 'Lifestyle Fit', 'Investment Fit', 'Purpose Alignment'] as const)[allScores.indexOf(Math.max(...allScores))]
  const weakest = (['Financial Fit', 'Lifestyle Fit', 'Investment Fit', 'Purpose Alignment'] as const)[allScores.indexOf(Math.min(...allScores))]
  const weakScore = Math.min(...allScores)
  const strongScore = Math.max(...allScores)
  const spread = strongScore - weakScore
  const area = match.areaData
  const conf = purposeConfidence ? Math.round(purposeConfidence * 100) : null

  // Section 1 -- Executive Summary
  const execLines: string[] = []
  execLines.push(`ENGINE scored this ${match.purpose} match at ${match.overallScore}/100 (Grade ${match.grade}), pairing ${clientName} with ${propertyLabel}.`)
  if (archetypeLabel) execLines.push(`CIE classifies this client as a "${archetypeLabel}" archetype, which shapes how we weight engagement signals and risk tolerance in the scoring model.`)
  if (conf) execLines.push(`Purpose classification confidence sits at ${conf}% -- ${conf >= 85 ? 'high confidence means pillar weights are calibrated tightly to the declared purpose' : conf >= 70 ? 'moderate confidence, so the model applies some hedging across secondary purpose dimensions' : 'lower confidence introduces broader weighting across multiple purpose scenarios'}.`)
  execLines.push(`The composite reflects a ${spread <= 10 ? 'well-balanced profile across all four pillars' : spread <= 20 ? 'moderate spread between pillar scores, indicating targeted strengths' : 'significant variance between pillars, signaling a polarized match'}.`)

  // Section 2 -- Strength Analysis
  const strengthLines: string[] = []
  strengthLines.push(`The strongest dimension is ${strongest} at ${strongScore}/100. `)
  if (strongest === 'Financial Fit') {
    strengthLines.push(`This means the property's pricing, projected costs, and expected returns sit well within the client's operating parameters. For ${match.purpose} buyers, financial alignment is the foundation -- it confirms the deal is commercially viable before any lifestyle or strategic factors come into play.`)
  } else if (strongest === 'Lifestyle Fit') {
    strengthLines.push(`Location characteristics, community profile, and amenity infrastructure align closely with the client's stated preferences and living requirements. For ${match.purpose} clients, this signals that the property environment matches their day-to-day expectations.`)
  } else if (strongest === 'Investment Fit') {
    strengthLines.push(`Market fundamentals -- rental yield, capital trajectory, demand dynamics, and exit liquidity -- support the ${match.purpose} acquisition thesis.${area ? ` The ${area.rentalYield > 0 ? (area.rentalYield * 100).toFixed(1) + '% gross yield' : 'yield profile'} and ${area.outlook} market outlook underpin this score.` : ''}`)
  } else {
    strengthLines.push(`The property's core characteristics map directly onto ENGINE's ${match.purpose} evaluation criteria: ${config?.keyFactors.slice(0, 3).join(', ') || 'key strategic factors'}. This means the "why" of the match is well-grounded -- the property was designed or positioned for exactly this type of buyer.`)
  }

  // Section 3 -- Risk / Friction
  const riskLines: string[] = []
  if (weakScore < 60) {
    riskLines.push(`${weakest} scored ${weakScore}/100, which ENGINE flags as a friction point requiring attention. `)
    if (weakest === 'Financial Fit') {
      riskLines.push(`The property's price point or projected financial return falls outside the client's optimal budget range. This doesn't disqualify the match, but any FORGE presentation should include a clear financial justification -- potentially highlighting long-term appreciation, rental offset, or negotiation margin.`)
    } else if (weakest === 'Lifestyle Fit') {
      riskLines.push(`Location or community characteristics don't fully align with the client's preferences. If presenting this match, FORGE should emphasize other compensating strengths and frame the lifestyle gap in context -- for instance, an area undergoing rapid development may score lower today but could improve significantly.`)
    } else if (weakest === 'Investment Fit') {
      riskLines.push(`Market fundamentals present risk for this pairing. Yield, demand trajectory, or exit liquidity metrics don't strongly support the ${match.purpose} thesis at the current price point. A FORGE brief should position this transparently and perhaps frame it as a medium-term play if price momentum is expected to shift.`)
    } else {
      riskLines.push(`The property doesn't strongly satisfy the specific criteria ENGINE evaluates for ${match.purpose} buyers. This creates a narrative gap -- the "why" of the match is harder to articulate. FORGE should lean on pillar strengths in other areas when building the client presentation.`)
    }
  } else if (weakScore < 70) {
    riskLines.push(`No critical friction detected. The weakest dimension (${weakest} at ${weakScore}/100) is still in acceptable range but represents the area with most room for improvement. `)
    riskLines.push(`In a FORGE presentation, this dimension should be acknowledged with context rather than left unaddressed -- proactive framing builds stronger client trust.`)
  } else {
    riskLines.push(`All four pillars score above 70/100, indicating a low-friction match with no critical weaknesses. This is a well-rounded pairing that should present cleanly across all dimensions.`)
  }

  // Section 4 -- Market Context (if area data)
  const marketLines: string[] = []
  if (area) {
    marketLines.push(`SCOUT market data for this area shows ${area.transactionCount.toLocaleString()} recent transactions at AED ${area.avgPriceSqft.toLocaleString()}/sqft average.`)
    marketLines.push(` ${area.priceChange30d >= 0 ? `Prices moved +${area.priceChange30d.toFixed(1)}% over the last 30 days -- ${area.priceChange30d > 3 ? 'strong upward momentum suggesting timing pressure' : 'steady appreciation supporting the value case'}.` : `Prices adjusted ${area.priceChange30d.toFixed(1)}% in 30 days -- ${area.priceChange30d < -3 ? 'notable correction that could create an entry window' : 'minor softening within normal range'}.`}`)
    marketLines.push(` Demand score: ${area.demandScore}/100. Market outlook: ${area.outlook}. ${area.outlook === 'bullish' ? 'Favorable conditions for both entry and medium-term hold.' : area.outlook === 'neutral' ? 'Stable conditions -- no urgency but no deterioration.' : 'Caution warranted -- market headwinds may affect exit timing.'}`)
  }

  // Section 5 -- Recommendation
  const recLines: string[] = []
  if (match.grade === 'A+' || match.grade === 'A') {
    recLines.push(`Grade ${match.grade} -- this match is cleared for FORGE progression. It should be queued for deal brief generation and client presentation preparation. The scoring profile supports a confident recommendation with minimal caveats needed.`)
    if (match.status === 'active') recLines.push(` Current status: Active. Recommend escalating to "presented" and assigning a FORGE deliverable timeline.`)
    else if (match.status === 'shortlisted') recLines.push(` Currently shortlisted. Strong candidate for next client meeting -- ensure FORGE brief is current.`)
  } else if (match.grade === 'B+' || match.grade === 'B') {
    recLines.push(`Grade ${match.grade} -- a viable match with identifiable strengths. Suitable for presentation if the FORGE brief addresses the weaker dimensions with context and framing. Consider pairing this with a stronger match in a comparative presentation so the client sees options.`)
  } else {
    recLines.push(`Grade ${match.grade} -- below the typical presentation threshold. This match would need significant reframing or a change in client requirements to become viable. ENGINE recommends holding this in the pipeline rather than progressing to FORGE unless client criteria shift.`)
  }

  const sections: NarrativeSection[] = [
    { heading: 'Executive Summary', body: execLines.join(' '), accent: '#C9A55A' },
    { heading: 'Strength Analysis', body: strengthLines.join(''), accent: '#22c55e' },
    { heading: 'Risk & Friction Assessment', body: riskLines.join(''), accent: weakScore < 60 ? '#ef4444' : weakScore < 70 ? '#f59e0b' : '#22c55e' },
  ]
  if (marketLines.length > 0) sections.push({ heading: 'Market Context', body: marketLines.join(''), accent: '#06b6d4' })
  sections.push({ heading: 'Recommendation', body: recLines.join(''), accent: '#a78bfa' })

  return sections
}

// ── Match Scoring Explanation ───────────────────────────────────────────

function generateScoringExplanation(match: EngineMatch): string {
  const pillars = [
    { name: 'Financial Fit', score: match.pillars.financialFit.score, weight: match.pillars.financialFit.weight },
    { name: 'Lifestyle Fit', score: match.pillars.lifestyleFit.score, weight: match.pillars.lifestyleFit.weight },
    { name: 'Investment Fit', score: match.pillars.investmentFit.score, weight: match.pillars.investmentFit.weight },
    { name: 'Purpose Alignment', score: match.pillars.purposeAlignment.score, weight: match.pillars.purposeAlignment.weight },
  ]

  const strongest = pillars.reduce((a, b) => a.score > b.score ? a : b)
  const weakest = pillars.reduce((a, b) => a.score < b.score ? a : b)

  const config = PURPOSE_CONFIGS.find(p => p.id === match.purpose)

  let explanation = `This match was evaluated using ENGINE's 4-pillar scoring model, weighted for ${match.purpose} classification. `
  explanation += `The composite score of ${match.overallScore}/100 (Grade: ${match.grade}) reflects a weighted average across all four dimensions. `
  explanation += `The strongest dimension is ${strongest.name} at ${strongest.score}/100, carrying ${Math.round(strongest.weight * 100)}% weight. `

  if (weakest.score < 60) {
    explanation += `The weakest dimension is ${weakest.name} at ${weakest.score}/100, which is dragging the overall score down. `
  }

  if (match.grade === 'A+' || match.grade === 'A') {
    explanation += `This is a high-confidence match suitable for progression to FORGE for deal brief generation and client presentation.`
  } else if (match.grade === 'B+' || match.grade === 'B') {
    explanation += `This is a moderate match. It may be worth presenting but has specific weaknesses that should be addressed in any client conversation.`
  } else {
    explanation += `This match has significant gaps. It would not typically be recommended for client presentation without addressing the weak pillars.`
  }

  return explanation
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ENGMatchScorerView(): React.ReactElement {
  const sorted = useMemo(() =>
    [...engineMatches].sort((a, b) => b.overallScore - a.overallScore),
  [])

  const [selectedMatch, setSelectedMatch] = useState<EngineMatch>(sorted[0] || engineMatches[0])
  const [gradeFilter, setGradeFilter] = useState<string | null>(null)
  const [purposeFilter, setPurposeFilter] = useState<string | null>(null)
  const aiNarrative = useMatchNarrative()

  const filtered = useMemo(() => {
    let result = sorted
    if (gradeFilter) result = result.filter(m => m.grade === gradeFilter)
    if (purposeFilter) result = result.filter(m => m.purpose === purposeFilter)
    return result
  }, [sorted, gradeFilter, purposeFilter])

  const client = selectedMatch ? getClient(selectedMatch.clientId) : null
  const property = selectedMatch ? getProperty(selectedMatch.propertyId) : null
  const purposeConfig = selectedMatch ? PURPOSE_CONFIGS.find(p => p.id === selectedMatch.purpose) : null
  const cie = selectedMatch ? getCIEClient(selectedMatch.clientId) : null
  const archetype = cie?.archetype ? ARCHETYPES.find(a => a.id === cie.archetype) : null
  const clientPurpose = selectedMatch ? getClientPurpose(selectedMatch.clientId) : null

  // Grade distribution for stats
  const gradeDistribution = useMemo(() => {
    const dist: Record<string, number> = {}
    engineMatches.forEach(m => { dist[m.grade] = (dist[m.grade] || 0) + 1 })
    return dist
  }, [])

  const allGrades = ['A+', 'A', 'B+', 'B', 'C', 'D']
  const allPurposes = useMemo(() => Array.from(new Set(engineMatches.map(m => m.purpose))).sort(), [])

  return (
    <div className="h-full flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-[3px] h-5 rounded-full bg-[#D4A574]" />
              <h2 className="text-base font-semibold text-white/90 tracking-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}>
                Match Scorer
              </h2>
              <span className="text-[8px] font-mono text-[#D4A574]/60 uppercase tracking-widest ml-1">EMS</span>
            </div>
            <p className="text-[10px] text-white/40 ml-3 leading-relaxed max-w-xl">
              Every client-property pair is evaluated across 4 pillars. Each pillar produces a
              weighted score based on the client's purpose classification. Select any match to see
              the full scoring breakdown and reasoning.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] flex-shrink-0">
            {allGrades.map(g => (
              <div key={g} className="text-center">
                <span className="text-[12px] font-bold font-mono block" style={{ color: getGradeColor(g) }}>{gradeDistribution[g] || 0}</span>
                <span className="text-[7px] text-white/25 uppercase">{g}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Split Panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex gap-3 min-h-0 mt-3">

        {/* ══ LEFT: Match List (35%) ══════════════════════════════════ */}
        <div className="w-[35%] flex flex-col min-w-0">

          {/* Filters */}
          <div className="flex-shrink-0 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              <span className="text-[7px] text-white/25 uppercase tracking-widest mr-1">Grade</span>
              <button onClick={() => setGradeFilter(null)}
                className={`px-1.5 py-0.5 text-[7px] uppercase tracking-wider rounded transition-all ${
                  !gradeFilter ? 'bg-pcis-gold/15 text-pcis-gold' : 'bg-white/[0.02] text-white/35 hover:bg-white/[0.04]'
                }`}>All</button>
              {allGrades.map(g => (
                <button key={g} onClick={() => setGradeFilter(gradeFilter === g ? null : g)}
                  className={`px-1.5 py-0.5 text-[7px] uppercase tracking-wider rounded transition-all ${
                    gradeFilter === g ? `${getGradeBg(g)}` : 'bg-white/[0.02] text-white/35 hover:bg-white/[0.04]'
                  }`}
                  style={gradeFilter === g ? { color: getGradeColor(g) } : {}}>
                  {g}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[7px] text-white/25 uppercase tracking-widest mr-1">Purpose</span>
              <button onClick={() => setPurposeFilter(null)}
                className={`px-1.5 py-0.5 text-[7px] uppercase tracking-wider rounded transition-all ${
                  !purposeFilter ? 'bg-pcis-gold/15 text-pcis-gold' : 'bg-white/[0.02] text-white/35 hover:bg-white/[0.04]'
                }`}>All</button>
              {allPurposes.map(p => {
                const cfg = PURPOSE_CONFIGS.find(c => c.id === p)
                return (
                  <button key={p} onClick={() => setPurposeFilter(purposeFilter === p ? null : p)}
                    className={`px-1.5 py-0.5 text-[7px] uppercase tracking-wider rounded transition-all ${
                      purposeFilter === p ? 'bg-white/[0.06]' : 'bg-white/[0.02] text-white/35 hover:bg-white/[0.04]'
                    }`}
                    style={purposeFilter === p ? { color: cfg?.color } : {}}>
                    {p.slice(0, 3)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="text-[8px] text-white/25 mb-1.5 font-mono">{filtered.length} matches</div>

          {/* Match List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filtered.map(match => {
              const c = getClient(match.clientId)
              const p = getProperty(match.propertyId)
              const isSelected = selectedMatch?.id === match.id
              return (
                <div key={match.id}
                  onClick={() => setSelectedMatch(match)}
                  className={`px-3 py-2.5 rounded-lg cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-pcis-gold/30 bg-white/[0.03]'
                      : 'border-transparent bg-white/[0.01] hover:bg-white/[0.02]'
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/70 font-medium truncate flex-1">{c?.name || 'Client'}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[9px] font-mono font-bold" style={{ color: getScoreColor(match.overallScore) }}>
                        {match.overallScore}
                      </span>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${getGradeColor(match.grade)}15`, color: getGradeColor(match.grade) }}>
                        {match.grade}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] text-white/35 truncate flex-1 font-mono">{p?.name || 'Property'}</span>
                    <span className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ backgroundColor: `${PURPOSE_CONFIGS.find(pc => pc.id === match.purpose)?.color || '#888'}15`,
                               color: PURPOSE_CONFIGS.find(pc => pc.id === match.purpose)?.color || '#888' }}>
                      {match.purpose.slice(0, 3)}
                    </span>
                  </div>
                  {/* Score bar */}
                  <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden mt-1.5">
                    <div className="h-full rounded-full transition-all" style={{ width: `${match.overallScore}%`, backgroundColor: getScoreColor(match.overallScore), opacity: 0.5 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ══ RIGHT: Scoring Deep-Dive (65%) ═════════════════════════ */}
        {selectedMatch && (
          <div className="w-[65%] flex flex-col min-w-0 overflow-y-auto pr-1">

            {/* ── Match Identity ────────────────────────────────── */}
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-4 mb-3">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    {client && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                        style={{ backgroundColor: `${archetype?.color || '#888'}20`, color: archetype?.color || '#888' }}>
                        {client.initials}
                      </div>
                    )}
                    <div>
                      <ClientLink clientId={selectedMatch.clientId} className="text-[12px] text-white/85 font-semibold hover:text-pcis-gold transition-colors">
                        {client?.name || 'Unknown Client'}
                      </ClientLink>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[7px] font-mono text-white/30">{client?.type}</span>
                        {archetype && (
                          <>
                            <span className="text-white/15">|</span>
                            <span className="text-[7px] font-mono" style={{ color: archetype.color }}>{archetype.label}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 ml-9">
                    <span className="text-[8px] text-white/20">matched to</span>
                    <PropertyLink propertyId={selectedMatch.propertyId} className="text-[11px] text-white/70 font-mono hover:text-pcis-gold transition-colors">
                      {property?.name || 'Unknown'}
                    </PropertyLink>
                  </div>
                  {property && (
                    <div className="flex items-center gap-2 mt-1 ml-9">
                      <span className="text-[8px] text-white/25">{property.area}</span>
                      <span className="text-white/10">|</span>
                      <span className="text-[8px] text-white/25">{property.type}</span>
                      <span className="text-white/10">|</span>
                      <span className="text-[8px] text-white/25">{property.bedrooms}BR</span>
                      <span className="text-white/10">|</span>
                      <span className="text-[8px] font-mono text-white/30">{(property.price / 1e6).toFixed(1)}M AED</span>
                    </div>
                  )}
                </div>

                {/* Score + Grade */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <ScoreRing score={selectedMatch.overallScore} size={72} />
                  <div className="text-center">
                    <span className="text-2xl font-bold block" style={{ color: getGradeColor(selectedMatch.grade) }}>{selectedMatch.grade}</span>
                    <span className="text-[7px] text-white/25 uppercase tracking-wider">Grade</span>
                  </div>
                </div>
              </div>

              {/* Status Row */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.04]">
                <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${purposeConfig?.color || '#888'}15`, color: purposeConfig?.color }}>
                  {purposeConfig?.icon} {selectedMatch.purpose}
                </span>
                <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-pcis-gold/10 text-pcis-gold">
                  {selectedMatch.status}
                </span>
                <span className="text-[8px] text-white/30 ml-auto">
                  Confidence: <span className="font-mono font-bold text-white/60">{Math.round(selectedMatch.confidence * 100)}%</span>
                </span>
              </div>
            </div>

            {/* ── Scoring Explanation ───────────────────────────── */}
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[#a78bfa]">Scoring Analysis</span>
              </div>
              <p className="text-[10px] text-white/55 leading-[1.7]">
                {generateScoringExplanation(selectedMatch)}
              </p>
            </div>

            {/* ── 4-Pillar Breakdown ───────────────────────────── */}
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4A574]" />
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[#D4A574]">4-Pillar Breakdown</span>
                <span className="text-[7px] text-white/20 ml-auto">Weighted for {selectedMatch.purpose} classification</span>
              </div>

              <div className="space-y-4">
                {[
                  selectedMatch.pillars.financialFit,
                  selectedMatch.pillars.lifestyleFit,
                  selectedMatch.pillars.investmentFit,
                  selectedMatch.pillars.purposeAlignment,
                ].map((pillar, idx) => (
                  <div key={idx} className="border border-white/[0.03] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[7px] font-mono text-white/25 w-6">{pillar.shortCode}</span>
                        <span className="text-[10px] font-semibold text-white/75">{pillar.name}</span>
                        <span className="text-[7px] text-white/20 font-mono">{Math.round(pillar.weight * 100)}% weight</span>
                      </div>
                      <span className="text-[14px] font-bold font-mono" style={{ color: getScoreColor(pillar.score) }}>
                        {pillar.score}
                      </span>
                    </div>

                    {/* Score Bar */}
                    <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden mb-2">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pillar.score}%`, backgroundColor: getScoreColor(pillar.score), opacity: 0.6 }} />
                    </div>

                    {/* Pillar Breakdown Text */}
                    <div className="bg-white/[0.01] rounded-lg p-2 mb-2">
                      <p className="text-[8px] text-white/40 leading-relaxed">{pillar.breakdown}</p>
                    </div>

                    {/* Context Explanation */}
                    <p className="text-[9px] text-white/50 leading-[1.6]">
                      {generatePillarContext(pillar, selectedMatch)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Match Narrative (Detailed Intelligence Brief) ── */}
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-pcis-gold" />
                <span className="text-[9px] font-semibold uppercase tracking-widest text-pcis-gold">Match Intelligence Brief</span>
                <button
                  onClick={() => {
                    const purposeConfig = PURPOSE_CONFIGS.find(p => p.id === selectedMatch.purpose)
                    const cieProfile = cie?.profile
                    aiNarrative.generate({
                      matchId: selectedMatch.id,
                      overallScore: selectedMatch.overallScore,
                      grade: selectedMatch.grade,
                      purpose: selectedMatch.purpose,
                      confidence: selectedMatch.confidence,
                      status: selectedMatch.status,
                      financialFit: { score: selectedMatch.pillars.financialFit.score, weight: selectedMatch.pillars.financialFit.weight, breakdown: selectedMatch.pillars.financialFit.breakdown || '' },
                      lifestyleFit: { score: selectedMatch.pillars.lifestyleFit.score, weight: selectedMatch.pillars.lifestyleFit.weight, breakdown: selectedMatch.pillars.lifestyleFit.breakdown || '' },
                      investmentFit: { score: selectedMatch.pillars.investmentFit.score, weight: selectedMatch.pillars.investmentFit.weight, breakdown: selectedMatch.pillars.investmentFit.breakdown || '' },
                      purposeAlignment: { score: selectedMatch.pillars.purposeAlignment.score, weight: selectedMatch.pillars.purposeAlignment.weight, breakdown: selectedMatch.pillars.purposeAlignment.breakdown || '' },
                      clientName: client?.name || 'Unknown',
                      clientType: client?.type || '',
                      clientCategory: client?.category || '',
                      budgetMin: client?.financialProfile?.budgetMin || 0,
                      budgetMax: client?.financialProfile?.budgetMax || 0,
                      location: client?.location || '',
                      dealStage: client?.dealStage || '',
                      archetype: cie?.archetype || 'balanced',
                      archetypeLabel: archetype?.label || 'Balanced',
                      cognitiveScores: cieProfile?.scores.map(s => ({ dimension: s.dimension, value: s.value })) || [],
                      keyTraits: cieProfile?.keyTraits || [],
                      approachStrategy: cieProfile?.approachStrategy || '',
                      communicationTips: cieProfile?.communicationTips || [],
                      engagementScore: cie?.engagement?.engagementScore ?? null,
                      engagementMomentum: cie?.engagement?.momentum ?? null,
                      propertyName: property?.name || selectedMatch.propertyId,
                      propertyArea: property?.area || '',
                      propertyType: property?.type || '',
                      propertyPrice: property?.price || 0,
                      propertyBedrooms: property?.bedrooms || 0,
                      propertyFeatures: property?.features || [],
                      areaAvgPriceSqft: selectedMatch.areaData?.avgPriceSqft ?? null,
                      areaRentalYield: selectedMatch.areaData?.rentalYield ?? null,
                      areaDemandScore: selectedMatch.areaData?.demandScore ?? null,
                      areaPriceChange30d: selectedMatch.areaData?.priceChange30d ?? null,
                      areaTransactionCount: selectedMatch.areaData?.transactionCount ?? null,
                      areaOutlook: selectedMatch.areaData?.outlook ?? null,
                      investmentWeight: purposeConfig?.investmentWeight || 0.5,
                      lifestyleWeight: purposeConfig?.lifestyleWeight || 0.5,
                      keyFactors: purposeConfig?.keyFactors || [],
                      dataLayerNarrative: selectedMatch.narrative,
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

              {/* Original data-layer narrative */}
              <div className="bg-white/[0.02] rounded-lg p-3 mb-3 border-l-2 border-pcis-gold/30">
                <span className="text-[7px] font-semibold uppercase tracking-wider text-pcis-gold/60 block mb-1">Data Summary</span>
                <p className="text-[9px] text-white/50 leading-[1.7]">{selectedMatch.narrative}</p>
              </div>

              {/* Generated intelligence sections */}
              <div className="space-y-3">
                {generateDetailedNarrative(
                  selectedMatch,
                  client?.name || 'Unknown Client',
                  property?.name || selectedMatch.propertyId,
                  archetype?.label || null,
                  clientPurpose?.confidence || null,
                ).map((section, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-1 h-1 rounded-full" style={{ backgroundColor: section.accent }} />
                      <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: section.accent }}>{section.heading}</span>
                    </div>
                    <p className="text-[9.5px] text-white/55 leading-[1.75] pl-3 border-l border-white/[0.04]">
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
                      <span className="text-[8px] font-semibold uppercase tracking-widest text-pcis-gold">AI-Powered Intelligence Brief</span>
                      {aiNarrative.tokens > 0 && (
                        <span className="text-[6px] text-white/15 font-mono ml-auto">{aiNarrative.tokens} tokens{aiNarrative.cached ? ' (cached)' : ''}</span>
                      )}
                    </div>
                    {aiNarrative.loading && (
                      <div className="flex items-center gap-2 py-6">
                        <div className="w-3 h-3 border-2 border-pcis-gold/30 border-t-pcis-gold rounded-full animate-spin" />
                        <span className="text-[9px] text-white/40">Synthesising match intelligence across CIE, ENGINE, and SCOUT data...</span>
                      </div>
                    )}
                    {aiNarrative.error && (
                      <p className="text-[9px] text-red-400/70">Error: {aiNarrative.error}</p>
                    )}
                    {aiNarrative.content && (
                      <div className="text-[10px] text-white/60 leading-[1.75] space-y-3">
                        {aiNarrative.content.split('\n\n').map((para, i) => {
                          // Check if paragraph starts with a section heading
                          const headingMatch = para.match(/^(EXECUTIVE SUMMARY|STRENGTH ANALYSIS|RISK & FRICTION ASSESSMENT|MARKET POSITIONING|STRATEGIC RECOMMENDATION)\n?([\s\S]*)$/)
                          if (headingMatch) {
                            const headingColors: Record<string, string> = {
                              'EXECUTIVE SUMMARY': '#C9A55A',
                              'STRENGTH ANALYSIS': '#22c55e',
                              'RISK & FRICTION ASSESSMENT': '#f59e0b',
                              'MARKET POSITIONING': '#06b6d4',
                              'STRATEGIC RECOMMENDATION': '#a78bfa',
                            }
                            return (
                              <div key={i}>
                                <span className="text-[8px] font-semibold uppercase tracking-wider block mb-1" style={{ color: headingColors[headingMatch[1]] || '#C9A55A' }}>
                                  {headingMatch[1]}
                                </span>
                                <p className="pl-3 border-l border-white/[0.04]">{headingMatch[2].trim()}</p>
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

              <div className="mt-3 pt-2 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[7px] text-white/15 font-mono">Generated by ENGINE Scoring Model</span>
                <span className="text-[7px] text-white/15 font-mono">{new Date(selectedMatch.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* ── Area Intelligence (if available) ─────────────── */}
            {selectedMatch.areaData && (
              <div className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-4 mb-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-cyan-400">Area Intelligence</span>
                  <span className="text-[7px] text-white/20 ml-auto">From SCOUT market data</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {[
                    { label: 'Avg Price/Sqft', value: `${selectedMatch.areaData.avgPriceSqft.toLocaleString()} AED`, color: '#C9A55A' },
                    { label: 'Rental Yield', value: `${(selectedMatch.areaData.rentalYield * 100).toFixed(1)}%`, color: '#22c55e' },
                    { label: 'Demand Score', value: `${selectedMatch.areaData.demandScore}/100`, color: '#06b6d4' },
                    { label: 'Transactions (90d)', value: selectedMatch.areaData.transactionCount.toLocaleString(), color: '#a78bfa' },
                    { label: 'Price Change 30d', value: `${selectedMatch.areaData.priceChange30d >= 0 ? '+' : ''}${selectedMatch.areaData.priceChange30d.toFixed(1)}%`,
                      color: selectedMatch.areaData.priceChange30d >= 0 ? '#22c55e' : '#ef4444' },
                    { label: 'Outlook', value: selectedMatch.areaData.outlook.charAt(0).toUpperCase() + selectedMatch.areaData.outlook.slice(1),
                      color: selectedMatch.areaData.outlook === 'bullish' ? '#22c55e' : selectedMatch.areaData.outlook === 'neutral' ? '#f59e0b' : '#ef4444' },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/[0.02] rounded-lg p-2.5">
                      <span className="text-[7px] text-white/30 uppercase tracking-wider block mb-1">{item.label}</span>
                      <span className="text-[11px] font-mono font-semibold" style={{ color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-white/40 leading-relaxed">
                  Area data sourced from SCOUT's real-time market intelligence layer. These metrics informed the scoring
                  model's evaluation of market positioning, investment viability, and demand trajectory for this match.
                </p>
              </div>
            )}

            {/* ── Client Context ────────────────────────────────── */}
            <div className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[9px] font-semibold uppercase tracking-widest text-emerald-400">Client Context</span>
                <span className="text-[7px] text-white/20 ml-auto">From CIE + EPM</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {[
                  { label: 'Client Type', value: client?.type || '--' },
                  { label: 'Category', value: client?.category || '--' },
                  { label: 'CIE Archetype', value: archetype?.label || '--', color: archetype?.color },
                  { label: 'Primary Purpose', value: clientPurpose?.primaryPurpose || '--', color: purposeConfig?.color },
                  { label: 'Budget Range', value: client ? `${((client.financialProfile?.budgetMin || 0) / 1e6).toFixed(0)} -- ${((client.financialProfile?.budgetMax || 0) / 1e6).toFixed(0)}M AED` : '--' },
                  { label: 'Purpose Confidence', value: clientPurpose ? `${Math.round(clientPurpose.confidence * 100)}%` : '--' },
                  { label: 'Deal Stage', value: client?.dealStage || '--' },
                  { label: 'Location', value: client?.location || '--' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-white/[0.03]">
                    <span className="text-[8px] text-white/30">{row.label}</span>
                    <span className="text-[9px] font-mono" style={{ color: row.color || 'rgba(255,255,255,0.6)' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Metadata ──────────────────────────────────────── */}
            <div className="flex items-center justify-between text-[8px] text-white/20 px-1 mb-2">
              <span className="font-mono">Match ID: {selectedMatch.id}</span>
              <span className="font-mono">Scored: {new Date(selectedMatch.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
