'use client'

import { useState, useMemo } from 'react'
import { useCIEClients } from '@/lib/useCIEData'
import { DIMENSION_META, ARCHETYPES, type CIEClient } from '@/lib/cieData'
import { P1Loading } from '@/components/P1Loading'

// ════════════════════════════════════════════════════════════════════════════
// CIE CLIENT COMPARATOR — Side-by-side cognitive profile analysis
// ════════════════════════════════════════════════════════════════════════════

function PanelHeader({ title, accent }: { title: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-pcis-border/20">
      <div className="flex items-center gap-2">
        {accent && <div className="w-[3px] h-3.5 rounded-full" style={{ backgroundColor: accent }} />}
        <span className="text-[11px] font-semibold text-pcis-text-secondary uppercase tracking-wider">{title}</span>
      </div>
    </div>
  )
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/[0.02] border border-pcis-border/30 rounded-xl backdrop-blur-sm overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

export default function CIEComparatorView() {
  const { data: liveCIEClients, loading } = useCIEClients()
  const cieClients = liveCIEClients || []

  const [selectedIds, setSelectedIds] = useState<(string | null)[]>([
    cieClients[0]?.client.id || null,
    cieClients[1]?.client.id || null,
    null,
  ])

  const selectedClients = useMemo(
    () => selectedIds.map((id) => (id ? cieClients.find(c => c.client.id === id) || null : null)).filter(Boolean) as CIEClient[],
    [selectedIds, cieClients]
  )

  const alignmentScore = useMemo(() => {
    if (selectedClients.length < 2) return null

    let totalDiff = 0
    let dimensionCount = 0

    DIMENSION_META.forEach((dim) => {
      const scores = selectedClients.map((client) => client.profile?.scores.find(s => s.dimension === dim.name)?.value ?? 0)
      const maxScore = Math.max(...scores)
      const minScore = Math.min(...scores)
      const diff = maxScore - minScore

      totalDiff += diff
      dimensionCount++
    })

    const avgDiff = totalDiff / dimensionCount
    const alignment = Math.max(0, 100 - avgDiff * 10)
    return Math.round(alignment)
  }, [selectedClients])

  const advisorInsight = useMemo(() => {
    if (selectedClients.length < 2) {
      return null
    }

    // Build per-client analysis data
    const clientAnalysis = selectedClients.map(client => {
      const scores = new Map(
        client.profile?.scores.map(s => [s.dimension, s.value]) || []
      )
      const engScore = client.engagement?.engagementScore || 0
      const readiness = Math.round((client.engagement?.readinessScore || 0) * 100)
      const momentum = client.engagement?.momentum || 'stable'
      const daysInactive = client.engagement?.daysSinceContact || 0
      const predPattern = client.prediction?.pattern || null
      const predConf = client.prediction?.confidence || 0
      const cieScore = client.overallCIEScore
      const archetype = client.archetype

      return {
        name: client.client.name,
        firstName: client.client.name.split(' ')[0],
        engScore,
        readiness,
        momentum,
        daysInactive,
        predPattern,
        predConf,
        cieScore,
        archetype,
        scores,
        signalCount: client.signalCount,
      }
    })

    // Rank by composite priority: engagement * 0.3 + readiness * 0.3 + CIE * 0.2 + signals * 0.2
    const ranked = [...clientAnalysis].sort((a, b) => {
      const scoreA = a.engScore * 0.3 + a.readiness * 0.3 + a.cieScore * 0.2 + Math.min(a.signalCount * 5, 100) * 0.2
      const scoreB = b.engScore * 0.3 + b.readiness * 0.3 + b.cieScore * 0.2 + Math.min(b.signalCount * 5, 100) * 0.2
      return scoreB - scoreA
    })

    const priority = ranked[0]
    const secondary = ranked[1]
    const tertiary = ranked.length > 2 ? ranked[2] : null

    // Build aligned/divergent dimensions
    const alignedDims: string[] = []
    const divergentDims: { name: string; spread: number; highest: string; lowest: string }[] = []

    DIMENSION_META.forEach((dim) => {
      const vals = selectedClients.map(c => ({
        name: c.client.name.split(' ')[0],
        score: c.profile?.scores.find(s => s.dimension === dim.name)?.value ?? 0,
      }))
      const max = vals.reduce((a, b) => a.score > b.score ? a : b)
      const min = vals.reduce((a, b) => a.score < b.score ? a : b)
      const spread = max.score - min.score

      if (spread < 15) {
        alignedDims.push(dim.name)
      } else if (spread > 25) {
        divergentDims.push({ name: dim.name, spread, highest: max.name, lowest: min.name })
      }
    })

    divergentDims.sort((a, b) => b.spread - a.spread)

    // Generate prioritisation narrative
    const priorityMomentum = priority.momentum === 'heating' ? 'accelerating' : priority.momentum === 'cooling' ? 'decelerating' : 'stable'

    let priorityReason = ''
    if (priority.predPattern === 'Imminent Purchase') {
      priorityReason = `${priority.firstName} has an active Imminent Purchase prediction at ${priority.predConf}% confidence, making them the highest-value opportunity in this comparison.`
    } else if (priority.predPattern === 'Flight Risk' || priority.predPattern === 'Trust Erosion') {
      priorityReason = `${priority.firstName} is flagged as ${priority.predPattern} at ${priority.predConf}% confidence, requiring immediate attention to prevent relationship loss.`
    } else if (priority.readiness > 60) {
      priorityReason = `${priority.firstName} shows the highest readiness score at ${priority.readiness}%, indicating they are closest to a decision point.`
    } else if (priority.engScore > secondary.engScore + 15) {
      priorityReason = `${priority.firstName} significantly outpaces the other clients in engagement (${priority.engScore} vs ${secondary.engScore}), signalling stronger active interest.`
    } else {
      priorityReason = `${priority.firstName}'s composite score (engagement ${priority.engScore}, readiness ${priority.readiness}%, CIE ${priority.cieScore}) places them ahead in overall advisor ROI.`
    }

    // Approach differences
    const approachLines: string[] = []
    clientAnalysis.forEach(c => {
      const dv = c.scores.get('Decision Velocity') ?? 50
      const ed = c.scores.get('Emotional Driver') ?? 50
      const pn = c.scores.get('Privacy Need') ?? 50
      const rt = c.scores.get('Risk Tolerance') ?? 50
      const ar = c.scores.get('Detail Orientation') ?? 50

      if (dv > 70) approachLines.push(`${c.firstName} is a fast decision-maker. Keep interactions concise and action-oriented. Do not overload with options.`)
      else if (dv < 30) approachLines.push(`${c.firstName} takes time to decide. Allow breathing room between touchpoints and avoid pressure tactics.`)

      if (ed > 70) approachLines.push(`${c.firstName} is emotionally driven. Lead with narrative and lifestyle framing rather than pure data.`)
      else if (ar > 70) approachLines.push(`${c.firstName} is detail-oriented. Prepare thorough documentation and anticipate granular questions.`)

      if (pn > 70) approachLines.push(`${c.firstName} values privacy highly. Be discreet, avoid group settings, and respect boundaries around personal information.`)

      if (rt < 30) approachLines.push(`${c.firstName} is risk-averse. Emphasise security, guarantees, and proven track records.`)
      else if (rt > 70) approachLines.push(`${c.firstName} has high risk tolerance. Present bold opportunities and off-market options.`)
    })

    // Divergence insights
    let divergenceNote = ''
    if (divergentDims.length > 0) {
      const top = divergentDims[0]
      divergenceNote = `The widest cognitive gap is in ${top.name} (${top.spread} point spread), where ${top.highest} scores highest and ${top.lowest} scores lowest. This means identical messaging will not work across these clients.`
      if (divergentDims.length > 1) {
        const second = divergentDims[1]
        divergenceNote += ` ${second.name} also shows a ${second.spread}-point divergence between ${second.highest} and ${second.lowest}.`
      }
    }

    let alignmentNote = ''
    if (alignedDims.length > 0) {
      alignmentNote = `These clients are closely aligned on ${alignedDims.slice(0, 3).join(', ')}, meaning shared communication themes can be effective for those dimensions.`
    }

    // Secondary/tertiary notes
    let secondaryNote = `${secondary.firstName} should be engaged next.`
    if (secondary.daysInactive > 14) {
      secondaryNote += ` Note: ${secondary.daysInactive} days since last contact. Re-engagement is becoming time-sensitive.`
    }
    if (secondary.predPattern) {
      secondaryNote += ` Active prediction: ${secondary.predPattern} (${secondary.predConf}%).`
    }

    let tertiaryNote = ''
    if (tertiary) {
      if (tertiary.engScore < 25) {
        tertiaryNote = `${tertiary.firstName} shows low engagement (${tertiary.engScore}) and should be deprioritised until re-engagement signals appear. Do not invest significant time here in the current cycle.`
      } else {
        tertiaryNote = `${tertiary.firstName} can be maintained with periodic light touches while focus remains on the higher-priority clients.`
      }
    }

    return {
      priority: priority.firstName,
      priorityReason,
      approachLines: approachLines.slice(0, 6),
      divergenceNote,
      alignmentNote,
      secondaryNote,
      tertiaryNote,
      ranked: ranked.map(r => r.firstName),
    }
  }, [selectedClients, alignmentScore])

  // Loading guard — all hooks called above
  if (!liveCIEClients && loading) {
    return <P1Loading message="Loading..." />
  }

  const getScoreColor = (score: number): string => {
    if (score >= 75) return '#d4a574'
    if (score >= 50) return '#22c55e'
    if (score >= 25) return '#f59e0b'
    return '#ef4444'
  }

  const getBarColor = (score: number): string => {
    if (score >= 75) return 'bg-pcis-gold'
    if (score >= 50) return 'bg-green-400'
    if (score >= 25) return 'bg-yellow-400'
    return 'bg-red-400'
  }

  const handleClientChange = (index: number, value: string) => {
    const newSelectedIds = [...selectedIds]
    newSelectedIds[index] = value || null
    setSelectedIds(newSelectedIds)
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-pcis-border/20 flex-shrink-0">
        <div>
          <h2 className="text-[11px] font-semibold text-pcis-text-secondary uppercase tracking-wider">Client Comparator</h2>
          <p className="text-[10px] text-pcis-text-muted mt-0.5">Side-by-side CIE profile analysis</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3 p-4">
          {/* Client Selectors */}
          <Panel>
            <PanelHeader title="Select Clients" accent="#06b6d4" />
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex flex-col">
                    <label className="text-[9px] font-semibold text-pcis-text-secondary uppercase tracking-wider mb-2">
                      {['Client A', 'Client B', 'Client C'][index]}
                    </label>
                    <select
                      value={selectedIds[index] || ''}
                      onChange={(e) => handleClientChange(index, e.target.value)}
                      className="bg-white/[0.04] border border-pcis-border/20 rounded text-[10px] text-pcis-text-primary px-3 py-1.5 focus:outline-none focus:border-pcis-gold/50 transition-colors"
                    >
                      <option value="">— Select —</option>
                      {cieClients.map((client) => (
                        <option key={client.client.id} value={client.client.id}>
                          {client.client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* Dimension Comparison */}
          {selectedClients.length > 0 && (
            <Panel>
              <PanelHeader title="Dimension Profiles" accent="#a78bfa" />
              <div className="px-4 py-3 space-y-3">
                {DIMENSION_META.map((dim) => {
                  const scores = selectedClients.map((client) => client.profile?.scores.find(s => s.dimension === dim.name)?.value ?? 0)
                  const maxScore = Math.max(...scores)

                  return (
                    <div key={dim.name}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-medium text-pcis-text-secondary">{dim.name}</span>
                      </div>
                      <div className="flex gap-3">
                        {selectedClients.map((client, idx) => (
                          <div key={client.client.id} className="flex-1">
                            <div className="h-[3px] bg-white/[0.04] rounded-full overflow-hidden mb-1.5">
                              <div
                                className={`h-full transition-all duration-300 ${getBarColor(scores[idx])}`}
                                style={{ width: `${scores[idx]}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] text-pcis-text-muted">{client.client.name.split(' ')[0]}</span>
                              <span className="text-[8px] font-mono" style={{ color: getScoreColor(scores[idx]) }}>
                                {scores[idx]}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          )}

          {/* Alignment Score */}
          {alignmentScore !== null && (
            <Panel>
              <PanelHeader title="Profile Alignment" accent="#f59e0b" />
              <div className="px-4 py-3 space-y-3">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <div className="h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          alignmentScore > 70
                            ? 'bg-green-400'
                            : alignmentScore > 40
                              ? 'bg-yellow-400'
                              : 'bg-red-400'
                        }`}
                        style={{ width: `${alignmentScore}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-semibold" style={{ color: getScoreColor(alignmentScore), minWidth: '2.5rem' }}>
                    {alignmentScore}%
                  </span>
                </div>
              </div>
            </Panel>
          )}

          {/* Archetype Comparison */}
          {selectedClients.length > 0 && (
            <Panel>
              <PanelHeader title="Archetype Profiles" accent="#d4a574" />
              <div className="divide-y divide-pcis-border/10">
                {selectedClients.map((client) => {
                  const archetype = ARCHETYPES.find(a => a.id === client.archetype)

                  return (
                    <div key={client.client.id} className="px-4 py-3 space-y-2 hover:bg-pcis-gold/[0.03] transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-[3px] h-3.5 rounded-full" style={{ backgroundColor: archetype?.color || '#d4a574' }} />
                        <div>
                          <div className="text-[10px] font-semibold text-pcis-text-primary">{client.client.name}</div>
                          <div className="text-[9px] text-pcis-gold">{client.archetype}</div>
                        </div>
                      </div>
                      <p className="text-[9px] text-pcis-text-secondary leading-tight">{archetype?.description}</p>
                      {archetype?.strengths && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {archetype.strengths.slice(0, 2).map((trait: string, idx: number) => (
                            <span key={idx} className="text-[8px] bg-pcis-gold/10 text-pcis-gold px-1.5 py-0.5 rounded border border-pcis-gold/20">
                              {trait}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Panel>
          )}

          {/* Advisor Insight - AI Narrative */}
          {advisorInsight && typeof advisorInsight === 'object' && (
            <Panel>
              <PanelHeader title="AI Advisor Insight" accent="#C9A55A" />
              <div className="px-4 py-4 space-y-4">
                {/* Priority Ranking */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-[3px] h-3.5 rounded-full bg-pcis-gold" />
                    <span className="text-[10px] font-semibold text-pcis-gold uppercase tracking-wider">Priority Ranking</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2.5">
                    {advisorInsight.ranked.map((name: string, i: number) => (
                      <div key={name} className="flex items-center gap-1.5">
                        {i > 0 && <span className="text-[8px] text-pcis-text-muted mx-1">&gt;</span>}
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded border ${
                          i === 0
                            ? 'bg-pcis-gold/15 border-pcis-gold/40 text-pcis-gold'
                            : i === 1
                              ? 'bg-white/[0.04] border-pcis-border/30 text-pcis-text-primary'
                              : 'bg-white/[0.02] border-pcis-border/20 text-pcis-text-muted'
                        }`}>
                          {i === 0 && <span className="mr-1">&#9670;</span>}
                          {name}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-pcis-gold/[0.06] border border-pcis-gold/20 rounded-xl p-3">
                    <p className="text-[10px] text-pcis-text-secondary leading-relaxed">
                      <span className="font-semibold text-pcis-gold">Prioritise {advisorInsight.priority}.</span>{' '}
                      {advisorInsight.priorityReason}
                    </p>
                  </div>
                </div>

                {/* Cognitive Divergence */}
                {(advisorInsight.divergenceNote || advisorInsight.alignmentNote) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-[3px] h-3.5 rounded-full bg-purple-500" />
                      <span className="text-[10px] font-semibold text-pcis-text-secondary uppercase tracking-wider">Cognitive Divergence</span>
                    </div>
                    <div className="bg-white/[0.03] border border-pcis-border/20 rounded-xl p-3 space-y-2">
                      {advisorInsight.divergenceNote && (
                        <p className="text-[10px] text-pcis-text-secondary leading-relaxed">{advisorInsight.divergenceNote}</p>
                      )}
                      {advisorInsight.alignmentNote && (
                        <p className="text-[10px] text-pcis-text-secondary leading-relaxed">{advisorInsight.alignmentNote}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Approach per Client */}
                {advisorInsight.approachLines.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-[3px] h-3.5 rounded-full bg-cyan-500" />
                      <span className="text-[10px] font-semibold text-pcis-text-secondary uppercase tracking-wider">Tailored Approach</span>
                    </div>
                    <div className="bg-white/[0.03] border border-pcis-border/20 rounded-xl p-3 space-y-2">
                      {advisorInsight.approachLines.map((line: string, i: number) => (
                        <p key={i} className="text-[10px] text-pcis-text-secondary leading-relaxed">{line}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Secondary & Tertiary */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-[3px] h-3.5 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-semibold text-pcis-text-secondary uppercase tracking-wider">Follow-up Sequence</span>
                  </div>
                  <div className="bg-white/[0.03] border border-pcis-border/20 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] text-pcis-text-secondary leading-relaxed">{advisorInsight.secondaryNote}</p>
                    {advisorInsight.tertiaryNote && (
                      <p className="text-[10px] text-pcis-text-secondary leading-relaxed">{advisorInsight.tertiaryNote}</p>
                    )}
                  </div>
                </div>

                {/* Engine attribution */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-pcis-gold text-[9px]">&#9670;</span>
                  <span className="text-[8px] text-pcis-text-muted">CIE Comparator Engine v2.1 | Narrative generated from real-time cognitive data</span>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
