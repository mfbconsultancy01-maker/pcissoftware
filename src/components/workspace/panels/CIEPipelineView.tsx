'use client'

import React, { useState, useMemo } from 'react'
import { useCIEClients } from '@/lib/useCIEData'
import {
  ARCHETYPES,
  type CIEClient,
  type Archetype,
} from '@/lib/cieData'
import {
  DEAL_STAGES,
  dealStageColors,
  type DealStage,
} from '@/lib/mockData'
import { P1Loading } from '@/components/P1Loading'
import { useWorkspaceNav, ClientLink } from '../useWorkspaceNav'

// ============================================================================
// CIE PIPELINE — E1 Workspace Panel (CIP-L)
//
// Kanban-style deal pipeline with CIE intelligence overlays.
// Each card shows archetype, CIE score, engagement, and next touch.
// Drag-and-drop between stages. Adapted from Clients page pipeline.
// ============================================================================

const getArchetypeColor = (archetype: Archetype): string => {
  const config = ARCHETYPES.find(a => a.id === archetype)
  return config?.color || '#D4A574'
}

const getCIEScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e'
  if (score >= 65) return '#f59e0b'
  if (score >= 50) return '#3b82f6'
  return '#ef4444'
}

const getEngagementColor = (status: string): string => {
  switch (status) {
    case 'thriving': return '#22c55e'
    case 'active': return '#06b6d4'
    case 'cooling': return '#f59e0b'
    case 'cold': return '#ef4444'
    case 'dormant': return '#6b7280'
    default: return '#9ca3af'
  }
}

export default function CIEPipelineView(): React.ReactElement {
  const { data: liveCIEClients, loading } = useCIEClients()
  const cieClients = liveCIEClients || []

  const nav = useWorkspaceNav()
  const [dragClientId, setDragClientId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DealStage | null>(null)

  // Group CIE clients by deal stage — MUST be before loading guard (React hooks order)
  const stageGroups = useMemo(() => {
    const groups: Record<DealStage, CIEClient[]> = {
      'Lead In': [], 'Discovery': [], 'Viewing': [], 'Offer Made': [], 'Negotiation': [], 'Closed Won': [],
    }
    cieClients.forEach(cie => {
      const stage = cie.client.dealStage
      if (groups[stage]) {
        groups[stage].push(cie)
      }
    })
    // Sort within each stage by CIE score desc
    Object.values(groups).forEach(arr => arr.sort((a, b) => b.overallCIEScore - a.overallCIEScore))
    return groups
  }, [cieClients])

  // Loading guard — all hooks called above
  if (loading && cieClients.length === 0) return <P1Loading message="Loading CIE data..." />

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-pcis-text tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}>
              CIE Deal Pipeline
            </h2>
            <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
              CIPL · Kanban Intelligence View · Drag to reposition
            </p>
          </div>
        </div>

        {/* Pipeline stats */}
        <div className="flex items-center gap-4">
          <div className="h-6 w-px bg-pcis-border/30" />
          {DEAL_STAGES.map(stage => (
            <div key={stage} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dealStageColors[stage] }} />
              <span className="text-[9px] font-mono" style={{ color: dealStageColors[stage] }}>
                {stageGroups[stage].length}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto min-h-0 pt-3">
        <div className="grid grid-cols-6 gap-3 h-full">
          {DEAL_STAGES.map(stage => {
            const stageClients = stageGroups[stage]
            const stageColor = dealStageColors[stage]

            return (
              <div key={stage} className="flex flex-col"
                onDragOver={e => { e.preventDefault(); setDropTarget(stage) }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={e => {
                  e.preventDefault()
                  setDragClientId(null)
                  setDropTarget(null)
                }}
              >
                {/* Column header */}
                <div className={`mb-3 flex-shrink-0 transition-all ${dropTarget === stage ? 'scale-[1.02]' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stageColor }} />
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: stageColor }}>
                      {stage}
                    </h3>
                    <span className="text-[9px] font-mono text-pcis-text-muted ml-auto">{stageClients.length}</span>
                  </div>
                  <div className="h-0.5 rounded-full" style={{ backgroundColor: stageColor + '30' }} />
                </div>

                {/* Client cards */}
                <div className="flex-1 space-y-2 overflow-y-auto min-h-0 pr-1">
                  {stageClients.map(cie => {
                    const archConfig = ARCHETYPES.find(a => a.id === cie.archetype)

                    return (
                      <button
                        key={cie.client.id}
                        draggable
                        onDragStart={() => setDragClientId(cie.client.id)}
                        onDragEnd={() => { setDragClientId(null); setDropTarget(null) }}
                        onClick={() => nav.openCIEProfile(cie.client.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all group cursor-grab active:cursor-grabbing ${
                          dragClientId === cie.client.id
                            ? 'border-pcis-gold/40 bg-pcis-gold/[0.05] opacity-60'
                            : 'border-pcis-border/20 bg-white/[0.015] hover:bg-white/[0.03] hover:border-pcis-border/40'
                        }`}
                      >
                        {/* Header: initials + name + CIE score */}
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2"
                            style={{ borderColor: getEngagementColor(cie.engagement?.status || 'dormant'), backgroundColor: '#0a0a0a' }}>
                            <span className="text-[8px] font-bold text-white">{cie.client.initials}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-semibold text-pcis-text truncate">{cie.client.name}</p>
                            <p className="text-[8px] text-pcis-text-muted">{cie.client.type}</p>
                          </div>
                          <span className="text-[10px] font-mono font-bold" style={{ color: getCIEScoreColor(cie.overallCIEScore) }}>
                            {cie.overallCIEScore}
                          </span>
                        </div>

                        {/* Archetype badge */}
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: `${archConfig?.color || '#D4A574'}20`, color: archConfig?.color || '#D4A574' }}>
                            {archConfig?.label || 'Balanced'}
                          </span>
                          {cie.engagement && (
                            <span className="text-[7px] font-mono" style={{
                              color: cie.engagement.momentum === 'heating' ? '#22c55e' : cie.engagement.momentum === 'cooling' ? '#ef4444' : '#f59e0b'
                            }}>
                              {cie.engagement.momentum === 'heating' ? '▲' : cie.engagement.momentum === 'cooling' ? '▼' : '→'}
                            </span>
                          )}
                        </div>

                        {/* Portfolio value */}
                        <p className="text-[9px] font-mono text-pcis-text-secondary mt-2">
                          AED {((cie.client.financialProfile?.portfolioValue || 0) / 1_000_000).toFixed(0)}M
                        </p>


                        {/* CIE engagement bar */}
                        <div className="mt-2 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${cie.overallCIEScore}%`,
                            backgroundColor: getArchetypeColor(cie.archetype),
                            opacity: 0.6,
                          }} />
                        </div>

                        {/* Signals count */}
                        {cie.signalCount > 0 && (
                          <div className="text-[7px] text-white/40 mt-1">
                            {cie.signalCount} signal{cie.signalCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </button>
                    )
                  })}

                  {stageClients.length === 0 && (
                    <div className={`flex-1 flex items-center justify-center border border-dashed rounded-lg min-h-[80px] transition-colors ${
                      dropTarget === stage ? 'border-pcis-gold/40 bg-pcis-gold/[0.03]' : 'border-pcis-border/15'
                    }`}>
                      <p className="text-[8px] text-pcis-text-muted/40">{dropTarget === stage ? 'Drop here' : 'No clients'}</p>
                    </div>
                  )}

                  {dropTarget === stage && stageClients.length > 0 && (
                    <div className="h-1 rounded-full bg-pcis-gold/40 mt-2 animate-pulse" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
