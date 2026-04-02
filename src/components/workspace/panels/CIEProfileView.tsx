'use client'

import { useState, useMemo } from 'react'
import {
  cieClients as mockCieClients,
  getCIEClient as getMockCIEClient,
  DIMENSION_META,
  ARCHETYPES,
  getClientSignalsForCIE,
  pciscomSignals,
  type CIEClient,
  type DimensionMeta,
} from '@/lib/cieData'
import { useCIEClients, getCIESourceLabel, getCIESourceColor } from '@/lib/useCIEData'

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

function ClientListView({ onSelectClient, allClients }: { onSelectClient: (id: string) => void; allClients: typeof mockCieClients }) {
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
                    <div
                      className="w-[4px] h-[4px] rounded-full"
                      style={{ backgroundColor: engColor }}
                    />
                    <span className="text-[8px] font-medium uppercase" style={{ color: engColor }}>
                      {client.engagement?.status || 'unknown'}
                    </span>
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

function ClientProfileView({ client, onBack, dataSource }: { client: CIEClient; onBack?: () => void; dataSource?: 'live' | 'mock' }) {
  const archetype = ARCHETYPES.find(a => a.id === client.archetype)
  const archetypeColor = archetype?.color || '#D4A574'
  const pciscomClientSignals = pciscomSignals.filter(s => s.clientId === client.client.id)

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
          <div className="text-right">
            <div className="text-4xl font-bold font-mono" style={{ color: getCIEScoreColor(client.overallCIEScore) }}>
              {client.overallCIEScore}
            </div>
            <p className="text-[8px] text-pcis-text-muted mt-1">CIE Score</p>
          </div>
        </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Summary Card */}
        {client.profile && (
          <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl overflow-hidden p-3">
            <p className="text-[10px] text-pcis-text-primary/90 mb-2 leading-relaxed">
              {client.profile.summary}
            </p>
            {client.profile.keyTraits && client.profile.keyTraits.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-2">
                {client.profile.keyTraits.map((trait, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 text-[8px] bg-pcis-border/20 border border-pcis-border/40 text-pcis-text-secondary rounded"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            )}
            {client.profile.approachStrategy && (
              <div className="text-[9px] text-pcis-text-secondary">
                <strong className="text-pcis-gold">Approach:</strong> {client.profile.approachStrategy}
              </div>
            )}
          </div>
        )}

        {/* 12-Dimension Grid */}
        <div>
          <PanelHeader title="12 Dimensions" accent="#a78bfa" />
          <div className="px-3 py-2">
            <div className="grid grid-cols-4 gap-2">
              {DIMENSION_META.map((meta) => {
                const dimensionScore = client.profile?.scores?.find(s => s.dimension === meta.name)
                const score = dimensionScore?.value || 0
                const confidence = dimensionScore?.confidence || 0
                const trend = dimensionScore?.trend || 'stable'

                const trendSymbol = trend === 'rising' ? '▲' : trend === 'falling' ? '▼' : '→'
                const trendColor =
                  trend === 'rising'
                    ? '#22c55e'
                    : trend === 'falling'
                      ? '#ef4444'
                      : '#9ca3af'

                const barColor =
                  score >= 70
                    ? '#22c55e'
                    : score >= 40
                      ? '#f59e0b'
                      : '#6b7280'

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
                      </div>
                      <span className="text-[9px] font-bold ml-1" style={{ color: trendColor }}>
                        {trendSymbol}
                      </span>
                    </div>

                    <div className="mb-1.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] font-mono font-bold text-pcis-gold">
                          {score}
                        </span>
                        <span className="text-[7px] text-pcis-text-muted">
                          {confidence}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-pcis-border/20 rounded overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{ width: `${score}%`, backgroundColor: barColor }}
                        />
                      </div>
                    </div>

                    <p className="text-[8px] text-pcis-text-secondary/80 leading-tight line-clamp-2">
                      {meta.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Risk Factors & Communication Tips */}
        {client.profile && (
          <div className="grid grid-cols-2 gap-2">
            {/* Risk Factors */}
            <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl overflow-hidden">
              <PanelHeader title="Risk Factors" accent="#ef4444" />
              <div className="px-3 py-2 space-y-1">
                {client.profile.riskFactors && client.profile.riskFactors.length > 0 ? (
                  client.profile.riskFactors.map((risk, i) => (
                    <div key={i} className="text-[9px] text-pcis-text-secondary/90 flex gap-2">
                      <span className="text-pcis-gold mt-0.5 flex-shrink-0">●</span>
                      <span>{risk}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[8px] text-pcis-text-muted/50 italic">No risk factors</p>
                )}
              </div>
            </div>

            {/* Communication Tips */}
            <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl overflow-hidden">
              <PanelHeader title="Communication" accent="#06b6d4" />
              <div className="px-3 py-2 space-y-1">
                {client.profile.communicationTips && client.profile.communicationTips.length > 0 ? (
                  client.profile.communicationTips.map((tip, i) => (
                    <div key={i} className="text-[9px] text-pcis-text-secondary/90 flex gap-2">
                      <span className="text-pcis-gold mt-0.5 flex-shrink-0">◆</span>
                      <span>{tip}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[8px] text-pcis-text-muted/50 italic">No tips available</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PCISCOM Signals */}
        <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl overflow-hidden">
          <PanelHeader title="PCISCOM Signals" accent="#06b6d4" count={pciscomClientSignals.length} />
          <div className="px-3 py-2">
            {pciscomClientSignals && pciscomClientSignals.length > 0 ? (
              <div className="space-y-2">
                {pciscomClientSignals.map((signal, i) => (
                  <div key={i} className="bg-white/[0.01] border border-pcis-border/20 rounded p-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[9px] font-semibold text-pcis-text-primary">
                        {signal.intent}
                      </p>
                      <span className="text-[7px] text-pcis-text-muted font-mono">
                        {signal.timestamp}
                      </span>
                    </div>

                    {/* Sentiment Bar */}
                    <div className="mb-1.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[8px] text-pcis-text-muted">Sentiment</span>
                        <span className="text-[8px] font-mono text-pcis-gold">
                          {Math.round(signal.sentiment * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-1 bg-pcis-border/20 rounded overflow-hidden">
                        <div
                          className="h-full bg-blue-500/60"
                          style={{ width: `${signal.sentiment * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Dimension Impacts */}
                    {signal.dimensionImpacts && signal.dimensionImpacts.length > 0 && (
                      <div className="text-[8px] text-pcis-text-muted/70">
                        <p className="font-semibold mb-1">Impacts:</p>
                        <div className="flex flex-wrap gap-1">
                          {signal.dimensionImpacts.map((dim: { dimension: string; delta: number; confidence: number }, j: number) => (
                            <span
                              key={j}
                              className="px-1 py-0.5 bg-pcis-border/25 rounded text-pcis-text-muted text-[7px]"
                            >
                              {dim.dimension}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[8px] text-pcis-text-muted/50 italic px-1 py-2">
                Awaiting PCISCOM connection
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────

export default function CIEProfileView({ entityId }: { entityId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: liveCIEClients, source: dataSource } = useCIEClients()
  const allClients = liveCIEClients || mockCieClients

  // Determine which client to display
  const displayId = entityId || selectedId
  const client = displayId ? (allClients.find(c => c.client.id === displayId) || null) : null

  // If no entityId and no selected client, show the list
  if (!entityId && !selectedId) {
    return <ClientListView onSelectClient={setSelectedId} allClients={allClients} />
  }

  // If we have a client, show the profile
  if (client) {
    return <ClientProfileView client={client} onBack={!entityId ? () => setSelectedId(null) : undefined} dataSource={dataSource} />
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
