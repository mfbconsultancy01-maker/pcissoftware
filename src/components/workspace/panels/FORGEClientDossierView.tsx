'use client'

import React, { useState, useMemo } from 'react'
import {
  dealBriefs,
  proposals,
  communicationDrafts,
  lifecycleActions,
  forgeActions,
} from '@/lib/forgeData'
import {
  clients,
  cognitiveProfiles,
  engagementMetrics,
  predictions,
  type Client,
} from '@/lib/mockData'
import { getCIEClient, ARCHETYPES } from '@/lib/cieData'
import { getEngineMatchesForClient, getClientPurpose, PURPOSE_CONFIGS } from '@/lib/engineData'
import { ClientLink } from '../useWorkspaceNav'

// ── Types ──────────────────────────────────────────────────────────────

interface ClientDossier {
  client: Client
  archetype: string
  archetypeColor: string
  purpose: string
  purposeColor: string
  engagement: string
  engagementScore: number
  momentum: string
  matchCount: number
  topMatchScore: number
  avgMatchScore: number
  briefCount: number
  proposalCount: number
  commCount: number
  activeActions: number
  overdueActions: number
  topTraits: string[]
  approachStrategy: string
  riskFactors: string[]
  communicationTips: string[]
  predictionPattern: string
  predictionConfidence: number
  daysSinceContact: number
}

function buildDossier(client: Client): ClientDossier {
  const cie = getCIEClient(client.id)
  const matches = getEngineMatchesForClient(client.id)
  const purpose = getClientPurpose(client.id)
  const purposeConfig = purpose ? PURPOSE_CONFIGS.find(p => p.id === purpose.primaryPurpose) : null
  const archConfig = cie?.archetype ? ARCHETYPES.find(a => a.id === cie.archetype) : null
  const profile = cognitiveProfiles.find(p => p.clientId === client.id)
  const engagement = engagementMetrics.find(e => e.clientId === client.id)
  const prediction = predictions.find(p => p.clientId === client.id)
  const clientBriefs = dealBriefs.filter(b => b.clientId === client.id)
  const clientProposals = proposals.filter(p => p.clientId === client.id)
  const clientComms = communicationDrafts.filter(c => c.clientId === client.id)
  const clientActions = forgeActions.filter(a => a.clientId === client.id)
  const overdueActs = lifecycleActions.filter(l => l.clientId === client.id && l.isOverdue)

  const scores = matches.map(m => m.overallScore)

  return {
    client,
    archetype: archConfig?.label || 'Unknown',
    archetypeColor: archConfig?.color || '#888',
    purpose: purpose?.primaryPurpose || 'Unclassified',
    purposeColor: purposeConfig?.color || '#888',
    engagement: engagement?.status || 'active',
    engagementScore: engagement?.engagementScore || 0,
    momentum: engagement?.momentum || 'stable',
    matchCount: matches.length,
    topMatchScore: scores.length > 0 ? Math.max(...scores) : 0,
    avgMatchScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    briefCount: clientBriefs.length,
    proposalCount: clientProposals.length,
    commCount: clientComms.length,
    activeActions: clientActions.filter(a => a.status === 'pending' || a.status === 'in-progress').length,
    overdueActions: overdueActs.length,
    topTraits: profile?.keyTraits || [],
    approachStrategy: profile?.approachStrategy || 'Standard advisory approach',
    riskFactors: profile?.riskFactors || [],
    communicationTips: profile?.communicationTips || [],
    predictionPattern: prediction?.pattern || 'No prediction',
    predictionConfidence: prediction?.confidence || 0,
    daysSinceContact: engagement?.daysSinceContact || 0,
  }
}

// ── Status Colors ──────────────────────────────────────────────────────

const engagementColors: Record<string, { bg: string; text: string }> = {
  thriving: { bg: 'bg-emerald-400/15', text: 'text-emerald-400' },
  active: { bg: 'bg-cyan-400/15', text: 'text-cyan-400' },
  cooling: { bg: 'bg-amber-400/15', text: 'text-amber-400' },
  cold: { bg: 'bg-orange-400/15', text: 'text-orange-400' },
  dormant: { bg: 'bg-red-400/15', text: 'text-red-400' },
}

const momentumIcons: Record<string, { icon: string; color: string }> = {
  heating: { icon: '\u2191', color: '#22c55e' },
  stable: { icon: '\u2192', color: '#f59e0b' },
  cooling: { icon: '\u2193', color: '#ef4444' },
}

// ── Completion Ring ────────────────────────────────────────────────────

function ScoreRing({ score, size = 44, color = '#C9A55A', label }: { score: number; size?: number; color?: string; label?: string }) {
  const strokeWidth = 3.5
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize="11" fontWeight="bold" fontFamily="monospace">{score}</text>
      </svg>
      {label && <span className="text-[7px] text-pcis-text-muted uppercase tracking-wide">{label}</span>}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────

export default function FORGEClientDossierView(): React.ReactElement {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const dossiers = useMemo(() =>
    clients.map(buildDossier).sort((a, b) => {
      // Sort by engagement score descending, then by match count
      if (b.activeActions !== a.activeActions) return b.activeActions - a.activeActions
      return b.engagementScore - a.engagementScore
    }),
  [])

  const filtered = useMemo(() => {
    if (!search) return dossiers
    const q = search.toLowerCase()
    return dossiers.filter(d =>
      d.client.name.toLowerCase().includes(q) ||
      d.archetype.toLowerCase().includes(q) ||
      d.purpose.toLowerCase().includes(q)
    )
  }, [dossiers, search])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-4 rounded-full bg-[#22c55e]" />
            <h2 className="text-sm font-semibold text-white/90 tracking-wide">FCD -- Client Dossier</h2>
          </div>
          <p className="text-[10px] text-pcis-text-muted mt-1 ml-3">Unified intelligence file per client -- CIE profile, ENGINE matches, FORGE deliverables</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-pcis-text-muted font-mono">{filtered.length} clients</span>
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-[10px] bg-white/[0.03] border border-pcis-border/20 rounded-lg px-3 py-1.5 text-white/70 placeholder:text-pcis-text-muted/30 focus:outline-none focus:border-pcis-gold/30 w-48"
          />
        </div>
      </div>

      {/* Dossier List */}
      <div className="flex-1 overflow-y-auto mt-3 space-y-2">
        {filtered.map(d => {
          const isExpanded = expandedId === d.client.id
          const engColor = engagementColors[d.engagement] || engagementColors.active
          const momConfig = momentumIcons[d.momentum] || momentumIcons.stable

          return (
            <div key={d.client.id}
              className={`border rounded-xl transition-all ${isExpanded ? 'border-pcis-gold/30 bg-white/[0.03]' : 'border-pcis-border/20 bg-white/[0.015] hover:border-pcis-border/40'}`}>

              {/* Collapsed Row */}
              <div className="flex items-center px-4 py-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : d.client.id)}>
                {/* Client Identity */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: `${d.archetypeColor}20`, color: d.archetypeColor }}>
                    {d.client.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-white/80 font-medium truncate">{d.client.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8px] font-mono" style={{ color: d.archetypeColor }}>{d.archetype}</span>
                      <span className="text-white/20">|</span>
                      <span className="text-[8px] font-mono" style={{ color: d.purposeColor }}>{d.purpose}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-4 mr-4">
                  <div className="text-center">
                    <div className="text-[10px] font-mono font-semibold text-white/70">{d.matchCount}</div>
                    <div className="text-[7px] text-pcis-text-muted">Matches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-mono font-semibold" style={{ color: d.topMatchScore >= 80 ? '#22c55e' : d.topMatchScore >= 60 ? '#f59e0b' : '#ef4444' }}>
                      {d.topMatchScore > 0 ? d.topMatchScore : '--'}
                    </div>
                    <div className="text-[7px] text-pcis-text-muted">Top Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-mono font-semibold text-pcis-gold">{d.briefCount}B {d.proposalCount}P {d.commCount}C</div>
                    <div className="text-[7px] text-pcis-text-muted">Deliverables</div>
                  </div>
                </div>

                {/* Engagement Badge */}
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded-full border ${engColor.bg} ${engColor.text} border-transparent`}>
                    {d.engagement}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: momConfig.color }}>{momConfig.icon}</span>
                  <span className="text-[10px] text-white/40">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                </div>
              </div>

              {/* Expanded Dossier */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-pcis-border/10">
                  <div className="grid grid-cols-4 gap-4 mt-3">

                    {/* Col 1: CIE Intelligence */}
                    <div className="space-y-3">
                      <div className="text-[9px] font-semibold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        E1 CIE Profile
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-[8px] text-pcis-text-muted mb-1">Archetype</div>
                          <div className="text-[10px] font-medium" style={{ color: d.archetypeColor }}>{d.archetype}</div>
                        </div>
                        <div>
                          <div className="text-[8px] text-pcis-text-muted mb-1">Key Traits</div>
                          <div className="flex flex-wrap gap-1">
                            {d.topTraits.slice(0, 4).map((t, i) => (
                              <span key={i} className="text-[7px] bg-white/[0.04] text-white/50 px-1.5 py-0.5 rounded">{t}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-[8px] text-pcis-text-muted mb-1">Approach Strategy</div>
                          <div className="text-[9px] text-white/50 leading-relaxed">{d.approachStrategy}</div>
                        </div>
                        <div>
                          <div className="text-[8px] text-pcis-text-muted mb-1">Risk Factors</div>
                          <div className="space-y-0.5">
                            {d.riskFactors.slice(0, 3).map((r, i) => (
                              <div key={i} className="text-[8px] text-red-400/60">{'\u2022'} {r}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Col 2: ENGINE Matching */}
                    <div className="space-y-3">
                      <div className="text-[9px] font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        E3 ENGINE Matching
                      </div>
                      <div className="flex items-center gap-3">
                        <ScoreRing score={d.topMatchScore} color="#a78bfa" label="Top" />
                        <ScoreRing score={d.avgMatchScore} color="#8b5cf6" label="Avg" />
                        <ScoreRing score={d.engagementScore} color="#06b6d4" label="Engage" />
                      </div>
                      <div className="space-y-1.5 mt-2">
                        <div className="flex justify-between text-[9px]">
                          <span className="text-pcis-text-muted">Purpose</span>
                          <span style={{ color: d.purposeColor }}>{d.purpose}</span>
                        </div>
                        <div className="flex justify-between text-[9px]">
                          <span className="text-pcis-text-muted">Total Matches</span>
                          <span className="text-white/60 font-mono">{d.matchCount}</span>
                        </div>
                        <div className="flex justify-between text-[9px]">
                          <span className="text-pcis-text-muted">Prediction</span>
                          <span className="text-amber-400">{d.predictionPattern}</span>
                        </div>
                        <div className="flex justify-between text-[9px]">
                          <span className="text-pcis-text-muted">Confidence</span>
                          <span className="text-white/60 font-mono">{d.predictionConfidence}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Col 3: FORGE Deliverables */}
                    <div className="space-y-3">
                      <div className="text-[9px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        E4 FORGE Deliverables
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-white/[0.02] rounded-lg px-3 py-2">
                          <span className="text-[9px] text-white/50">Deal Briefs</span>
                          <span className="text-[11px] font-mono font-semibold text-pcis-gold">{d.briefCount}</span>
                        </div>
                        <div className="flex items-center justify-between bg-white/[0.02] rounded-lg px-3 py-2">
                          <span className="text-[9px] text-white/50">Proposals</span>
                          <span className="text-[11px] font-mono font-semibold text-cyan-400">{d.proposalCount}</span>
                        </div>
                        <div className="flex items-center justify-between bg-white/[0.02] rounded-lg px-3 py-2">
                          <span className="text-[9px] text-white/50">Communications</span>
                          <span className="text-[11px] font-mono font-semibold text-purple-400">{d.commCount}</span>
                        </div>
                        <div className="flex items-center justify-between bg-white/[0.02] rounded-lg px-3 py-2">
                          <span className="text-[9px] text-white/50">Active Actions</span>
                          <span className={`text-[11px] font-mono font-semibold ${d.activeActions > 0 ? 'text-amber-400' : 'text-white/30'}`}>{d.activeActions}</span>
                        </div>
                      </div>
                    </div>

                    {/* Col 4: Advisor Notes */}
                    <div className="space-y-3">
                      <div className="text-[9px] font-semibold text-pcis-gold uppercase tracking-wider flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-pcis-gold" />
                        Meeting Prep
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-[8px] text-pcis-text-muted mb-1">Communication Tips</div>
                          <div className="space-y-0.5">
                            {d.communicationTips.slice(0, 3).map((tip, i) => (
                              <div key={i} className="text-[8px] text-white/50">{'\u2022'} {tip}</div>
                            ))}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-[8px] text-pcis-text-muted mb-1">Contact Status</div>
                          <div className="text-[9px]">
                            <span className={d.daysSinceContact > 7 ? 'text-red-400' : d.daysSinceContact > 3 ? 'text-amber-400' : 'text-emerald-400'}>
                              {d.daysSinceContact} days since last contact
                            </span>
                          </div>
                        </div>
                        {d.overdueActions > 0 && (
                          <div className="mt-2 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                            <div className="text-[9px] text-red-400 font-semibold">{d.overdueActions} Overdue Action{d.overdueActions > 1 ? 's' : ''}</div>
                            <div className="text-[8px] text-red-400/60 mt-0.5">Requires immediate attention</div>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[8px] text-pcis-text-muted">Client Type:</span>
                          <span className="text-[9px] font-mono text-white/60">{d.client.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] text-pcis-text-muted">Category:</span>
                          <span className="text-[9px] font-mono text-white/60">{d.client.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] text-pcis-text-muted">Budget:</span>
                          <span className="text-[9px] font-mono text-white/60">
                            {(d.client.financialProfile.budgetMin / 1e6).toFixed(1)}M - {(d.client.financialProfile.budgetMax / 1e6).toFixed(1)}M AED
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
