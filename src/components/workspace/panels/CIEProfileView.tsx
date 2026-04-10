'use client'

import { useState, useMemo } from 'react'
import {
  DIMENSION_META,
  ARCHETYPES,
  getClientSignalsForCIE,
  pciscomSignals,
  type CIEClient,
  type CIEDimensionInsight,
  type DimensionMeta,
} from '@/lib/cieData'
import { useCIEClients, useProfileClient, getCIESourceLabel, getCIESourceColor } from '@/lib/useCIEData'
import { P1Loading } from '@/components/P1Loading'

import { useWorkspaceNav } from '../useWorkspaceNav'

// ── Color Utilities ─────────────────────────────────────────────────────

const getCIEScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e'
  if (score >= 65) return '#f59e0b'
  if (score >= 50) return '#3b82f6'
  return '#ef4444'
}

const getArchetypeColor = (archetype: string): string => {
  const config = ARCHETYPES.find(a => a.id === archetype)
  return config?.color || '#D4A574'
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

// ── PanelHeader ─────────────────────────────────────────────────────────

function PanelHeader({ title, subtitle, accent, count }: { title: string; subtitle?: string; accent?: string; count?: number }) {
  return (
    <div className="px-4 py-2.5 border-b border-pcis-border/20">
      <div className="flex items-center gap-2 mb-1">
        {accent && <div className="w-[3px] h-3.5 rounded-full" style={{ backgroundColor: accent }} />}
        <span className="text-[11px] font-semibold text-pcis-text-secondary uppercase tracking-wider">{title}</span>
        {count !== undefined && <span className="text-[9px] text-pcis-text-muted">({count})</span>}
      </div>
      {subtitle && <p className="text-[9px] text-pcis-text-muted/70 px-1">{subtitle}</p>}
    </div>
  )
}

// ── Client List View ────────────────────────────────────────────────────

function ClientListView({ onSelectClient, allClients }: { onSelectClient: (id: string) => void; allClients: CIEClient[] }) {
  const clients = useMemo(() => {
    return allClients.sort((a, b) => b.overallCIEScore - a.overallCIEScore)
  }, [allClients])

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <PanelHeader
        title="Cognitive Intelligence Profiles"
        subtitle="Select a client to view detailed CIE analysis"
        accent="#d4a574"
        count={clients.length}
      />

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="grid grid-cols-1 gap-2">
          {clients.map(client => {
            const archetype = ARCHETYPES.find(a => a.id === client.archetype)
            const topDim = client.topDimensions[0]
            const dimMeta = topDim ? DIMENSION_META.find(d => d.name === topDim.dimension) : null
            const engColor = getEngagementColor(client.engagement?.status || 'dormant')

            return (
              <div
                key={client.client.id}
                onClick={() => onSelectClient(client.client.id)}
                className="bg-white/[0.02] border border-pcis-border/30 rounded-xl overflow-hidden hover:bg-white/[0.03] hover:border-pcis-border/50 transition-all cursor-pointer p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[10px] font-semibold text-pcis-text-primary truncate">
                      {client.client.name}
                    </h3>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      <span className="px-1.5 py-0.5 text-[7px] font-mono bg-pcis-border/20 border border-pcis-border/40 text-pcis-text-secondary rounded">
                        {client.client.type}
                      </span>
                      {archetype && (
                        <span
                          className="px-1.5 py-0.5 text-[7px] font-semibold rounded"
                          style={{ backgroundColor: `${archetype.color}15`, color: archetype.color }}
                        >
                          {archetype.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <div className="text-[11px] font-bold font-mono" style={{ color: getCIEScoreColor(client.overallCIEScore) }}>
                      {client.overallCIEScore}
                    </div>
                    <div className="text-[7px] text-pcis-text-muted/60">CIE</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {client.cieInsights ? (
                      <>
                        <div className="w-[4px] h-[4px] rounded-full bg-green-500" />
                        <span className="text-[8px] font-medium text-green-500">PROFILED</span>
                      </>
                    ) : (
                      <>
                        <div className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: engColor }} />
                        <span className="text-[8px] font-medium uppercase" style={{ color: engColor }}>
                          {client.engagement?.status || 'not profiled'}
                        </span>
                      </>
                    )}
                  </div>
                  {dimMeta && (
                    <span className="text-[8px] text-pcis-text-muted">
                      Top: {dimMeta.shortCode}
                    </span>
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

// ── Client Profile View ─────────────────────────────────────────────────

function ClientProfileView({ client, onBack, dataSource, onRefresh }: { client: CIEClient; onBack?: () => void; dataSource?: 'live' | 'mock'; onRefresh?: () => void }) {
  const archetype = ARCHETYPES.find(a => a.id === client.archetype)
  const insights = client.cieInsights
  const { profiling, trigger: triggerProfile } = useProfileClient()

  const handleProfile = async () => {
    await triggerProfile(client.client.id)
    onRefresh?.()
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header Section */}
      <div className="px-4 py-3 border-b border-pcis-border/20">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {onBack && (
              <button
                onClick={onBack}
                className="text-[9px] text-pcis-gold/70 hover:text-pcis-gold transition-colors mb-2 flex items-center gap-1"
              >
                <span>←</span> <span>All Clients</span>
              </button>
            )}
            <h1 className="text-[12px] font-semibold text-pcis-text-primary">
              {client.client.name}
            </h1>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="px-2 py-1 text-[8px] font-mono bg-pcis-border/20 border border-pcis-border/40 text-pcis-text-secondary rounded">
                {client.client.type}
              </span>
              {archetype && (
                <span
                  className="px-2 py-1 text-[8px] font-semibold rounded"
                  style={{ backgroundColor: `${archetype.color}15`, color: archetype.color }}
                >
                  {archetype.label}
                </span>
              )}
              {insights?.macroRegion && (
                <span className="px-2 py-1 text-[8px] font-mono bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded">
                  {insights.macroRegion}
                </span>
              )}
              {insights?.dataQuality && (
                <span className="px-2 py-1 text-[8px] font-mono bg-pcis-border/15 text-pcis-text-muted rounded">
                  {insights.dataQuality.interactionRichness} data
                </span>
              )}
              {dataSource && (
                <span
                  className="px-2 py-1 text-[8px] font-semibold rounded"
                  style={{ backgroundColor: `${getCIESourceColor(dataSource)}15`, color: getCIESourceColor(dataSource) }}
                >
                  {getCIESourceLabel(dataSource)}
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div>
              <div className="text-4xl font-bold font-mono" style={{ color: getCIEScoreColor(client.overallCIEScore) }}>
                {client.overallCIEScore}
              </div>
              <p className="text-[8px] text-pcis-text-muted mt-1">CIE Score</p>
            </div>
            <button
              onClick={handleProfile}
              disabled={profiling}
              className="px-3 py-1.5 text-[8px] font-semibold rounded-lg border transition-all disabled:opacity-50"
              style={{
                backgroundColor: profiling ? 'transparent' : '#D4A57415',
                borderColor: '#D4A57440',
                color: '#D4A574',
              }}
            >
              {profiling ? 'Profiling...' : insights ? 'Re-Profile' : 'Run CIE Profile'}
            </button>
          </div>
        </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

        {/* Intelligence Briefing — from Claude */}
        {insights?.overallNarrative && (
          <div className="bg-white/[0.02] border border-pcis-gold/20 rounded-xl overflow-hidden p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-[3px] h-3.5 rounded-full bg-pcis-gold" />
              <span className="text-[10px] font-semibold text-pcis-gold uppercase tracking-wider">Intelligence Briefing</span>
            </div>
            <p className="text-[10px] text-pcis-text-primary/90 leading-relaxed">
              {insights.overallNarrative}
            </p>
          </div>
        )}

        {/* Top Recommendations */}
        {insights?.topRecommendations && insights.topRecommendations.length > 0 && (
          <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl overflow-hidden p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-[3px] h-3.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
              <span className="text-[10px] font-semibold text-pcis-text-secondary uppercase tracking-wider">Action Items</span>
            </div>
            <div className="space-y-1.5">
              {insights.topRecommendations.map((rec, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-[10px] font-bold text-pcis-gold mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <p className="text-[9px] text-pcis-text-primary/85 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Archetype Reasoning */}
        {insights?.archetypeReasoning && (
          <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl overflow-hidden p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-[3px] h-3.5 rounded-full" style={{ backgroundColor: archetype?.color || '#D4A574' }} />
              <span className="text-[10px] font-semibold text-pcis-text-secondary uppercase tracking-wider">
                Why {archetype?.label || 'Balanced'}
              </span>
            </div>
            <p className="text-[9px] text-pcis-text-secondary/80 leading-relaxed">
              {insights.archetypeReasoning}
            </p>
          </div>
        )}

        {/* Summary Card (fallback when no CIE insights) */}
        {!insights && client.profile && client.profile.summary && (
          <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl overflow-hidden p-3">
            <p className="text-[10px] text-pcis-text-primary/90 mb-2 leading-relaxed">
              {client.profile.summary}
            </p>
          </div>
        )}

        {/* 12-Dimension Grid — WITH Evidence Trails */}
        <div>
          <PanelHeader title="12 Cognitive Dimensions" accent="#a78bfa" />
          <div className="px-3 py-2">
            <div className="grid grid-cols-3 gap-2">
              {DIMENSION_META.map((meta) => {
                const dimensionScore = client.profile?.scores?.find(s => s.dimension === meta.name)
                const score = dimensionScore?.value || 0
                const confidence = dimensionScore?.confidence || 0
                const trend = dimensionScore?.trend || 'stable'

                // Get CIE insight for this dimension (evidence + macro + implication)
                const insight: CIEDimensionInsight | null = insights?.dimensions?.[meta.shortCode] || null

                const trendSymbol = trend === 'rising' ? '▲' : trend === 'falling' ? '▼' : '→'
                const trendColor =
                  trend === 'rising' ? '#22c55e' : trend === 'falling' ? '#ef4444' : '#9ca3af'
                const barColor =
                  score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#6b7280'

                return (
                  <div
                    key={meta.name}
                    className="bg-white/[0.01] border border-pcis-border/20 rounded p-2"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-semibold text-pcis-text-primary truncate">
                          {meta.shortCode}
                        </p>
                        <p className="text-[7px] text-pcis-text-muted/60 truncate">{meta.name}</p>
                      </div>
                      <span className="text-[9px] font-bold ml-1" style={{ color: trendColor }}>
                        {trendSymbol}
                      </span>
                    </div>

                    <div className="mb-1.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-mono font-bold text-pcis-gold">
                          {score}
                        </span>
                        <span className="text-[7px] text-pcis-text-muted">
                          {Math.round(confidence * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-pcis-border/20 rounded overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{ width: `${score}%`, backgroundColor: barColor }}
                        />
                      </div>
                    </div>

                    {/* Evidence Trail — the WHY */}
                    {insight?.evidence ? (
                      <div className="mt-1.5 space-y-1">
                        <p className="text-[7px] text-pcis-text-secondary/70 leading-tight">
                          {insight.evidence}
                        </p>
                        {insight.macroInfluence && (
                          <p className="text-[7px] text-blue-400/70 leading-tight italic">
                            {insight.macroInfluence}
                          </p>
                        )}
                        <p className="text-[7px] text-pcis-gold/70 leading-tight">
                          {insight.advisorImplication}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[7px] text-pcis-text-muted/40 mt-1 italic">
                        Run CIE profiling for evidence
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Profiling Metadata */}
        {insights && (
          <div className="bg-white/[0.01] border border-pcis-border/15 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between text-[7px] text-pcis-text-muted/60">
              <span>Profiled: {new Date(insights.profiledAt).toLocaleDateString()}</span>
              <span>Model: {insights.profilingModel}</span>
              <span>Signals: {insights.dataQuality.totalSignals}</span>
              <span>Confidence: {Math.round(insights.dataQuality.overallConfidence * 100)}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────

export default function CIEProfileView({ entityId }: { entityId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: liveCIEClients, source: dataSource, loading, refetch } = useCIEClients()
  const allClients = liveCIEClients || []

  // Loading guard AFTER all hook calls
  if (loading && allClients.length === 0) return <P1Loading message="Loading CIE profiles..." />

  // Determine which client to display
  const displayId = entityId || selectedId
  const client = displayId ? (allClients.find(c => c.client.id === displayId) || null) : null

  // If no entityId and no selected client, show the list
  if (!entityId && !selectedId) {
    return <ClientListView onSelectClient={setSelectedId} allClients={allClients} />
  }

  // If we have a client, show the profile
  if (client) {
    return <ClientProfileView client={client} onBack={!entityId ? () => setSelectedId(null) : undefined} dataSource={dataSource} onRefresh={refetch} />
  }

  // Fallback: client not found
  return (
    <div className="flex h-full w-full items-center justify-center bg-white/[0.02]">
      <div className="text-center">
        <p className="text-[10px] text-pcis-text-secondary">Client not found</p>
        {selectedId && (
          <button
            onClick={() => setSelectedId(null)}
            className="text-[9px] text-pcis-gold/70 hover:text-pcis-gold transition-colors mt-2"
          >
            ← Back to list
          </button>
        )}
      </div>
    </div>
  )
}
