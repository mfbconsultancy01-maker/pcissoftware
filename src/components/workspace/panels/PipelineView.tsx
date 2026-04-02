'use client'

import React, { useState, useMemo } from 'react'
import {
  clients,
  getEngagement,
  DEAL_STAGES,
  dealStageColors,
  type Client,
  type DealStage,
  type EngagementStatus,
} from '@/lib/mockData'
import { getCIEClient } from '@/lib/cieData'
import { getClientPurpose, getEngineMatchesForClient } from '@/lib/engineData'
import { getForgeActionsForClient } from '@/lib/forgeData'
import { useWorkspaceNav, ClientLink } from '../useWorkspaceNav'

type ClientTypeFilter = 'UHNW' | 'HNW' | 'Affluent' | null

// ============================================================================
// Color & Icon Utilities
// ============================================================================

const getEngagementColor = (status: EngagementStatus): string => {
  switch (status) {
    case 'thriving':
      return 'text-emerald-400'
    case 'active':
      return 'text-cyan-400'
    case 'cooling':
      return 'text-amber-400'
    case 'cold':
      return 'text-blue-400'
    case 'dormant':
      return 'text-gray-500'
    default:
      return 'text-white/50'
  }
}

const getEngagementIcon = (): string => '●'

const getCIEScoreColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 65) return 'text-amber-400'
  if (score >= 50) return 'text-blue-400'
  return 'text-red-400'
}

const getDaysInStage = (changeDate: string): number => {
  const now = new Date()
  const changed = new Date(changeDate)
  const diffMs = now.getTime() - changed.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

// ============================================================================
// Component
// ============================================================================

export default function PipelineView(): React.ReactElement {
  const { openClient } = useWorkspaceNav()
  const [activeFilter, setActiveFilter] = useState<ClientTypeFilter>(null)

  // Group clients by deal stage, filtered by type
  const stageGroups = useMemo(() => {
    const grouped: Record<DealStage, Client[]> = {
      'Lead In': [],
      'Discovery': [],
      'Viewing': [],
      'Offer Made': [],
      'Negotiation': [],
      'Closed Won': [],
    }

    let filtered = [...clients]
    if (activeFilter) {
      filtered = filtered.filter(c => c.type === activeFilter)
    }

    // Group by stage
    filtered.forEach(client => {
      grouped[client.dealStage].push(client)
    })

    // Sort each stage by CIE score descending
    Object.keys(grouped).forEach(stage => {
      grouped[stage as DealStage].sort((a, b) => {
        const cieA = getCIEClient(a.id)?.overallCIEScore || 0
        const cieB = getCIEClient(b.id)?.overallCIEScore || 0
        return cieB - cieA
      })
    })

    return grouped
  }, [activeFilter])

  // Calculate stats for each stage
  const stageCounts = useMemo(() => {
    const counts: Record<DealStage, number> = {
      'Lead In': stageGroups['Lead In'].length,
      'Discovery': stageGroups['Discovery'].length,
      'Viewing': stageGroups['Viewing'].length,
      'Offer Made': stageGroups['Offer Made'].length,
      'Negotiation': stageGroups['Negotiation'].length,
      'Closed Won': stageGroups['Closed Won'].length,
    }
    return counts
  }, [stageGroups])

  const totalClients = useMemo(
    () => Object.values(stageCounts).reduce((sum, c) => sum + c, 0),
    [stageCounts]
  )

  // ============================================================================
  // Render: Stats Bar
  // ============================================================================

  const renderStatsBar = () => (
    <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 grid grid-cols-6 gap-2 px-0">
      {DEAL_STAGES.map(stage => {
        const count = stageCounts[stage]
        return (
          <div key={stage} className="text-center">
            <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block">
              {stage === 'Offer Made' ? 'Offer/Neg' : stage.split(' ')[0]}
            </span>
            <span
              className="text-[11px] font-bold block mt-0.5 tabular-nums"
              style={{ color: dealStageColors[stage] }}
            >
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )

  // ============================================================================
  // Render: Pipeline Funnel Bar
  // ============================================================================

  const renderFunnelBar = () => (
    <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 space-y-2">
      <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">
        Deal Pipeline Funnel
      </div>
      <div className="flex items-center gap-2 h-6">
        {DEAL_STAGES.map(stage => {
          const count = stageCounts[stage]
          const pct = totalClients > 0 ? Math.round((count / totalClients) * 100) : 0

          return (
            <div
              key={stage}
              className="flex-1 h-full rounded-sm relative group"
              style={{ backgroundColor: `${dealStageColors[stage]}30` }}
            >
              <div
                className="h-full rounded-sm transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: dealStageColors[stage],
                  opacity: 0.7,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/90">
                {count > 0 && <span>{pct}%</span>}
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black/80 px-2 py-1 rounded text-[8px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {stage}: {count}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ============================================================================
  // Render: Filter Bar
  // ============================================================================

  const renderFilterBar = () => (
    <div className="flex-shrink-0 py-3 border-b border-pcis-border/10">
      <div className="flex items-center gap-2">
        <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider w-20">
          Client Type
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setActiveFilter(null)}
            className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all ${
              activeFilter === null
                ? 'bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/50'
                : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
            }`}
          >
            All
          </button>
          {(['UHNW', 'HNW', 'Affluent'] as const).map(type => (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all ${
                activeFilter === type
                  ? 'bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/50'
                  : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // ============================================================================
  // Render: Stage Columns
  // ============================================================================

  const renderClientCard = (client: Client) => {
    const cieClient = getCIEClient(client.id)
    const engagement = getEngagement(client.id)
    const purpose = getClientPurpose(client.id)
    const engineMatches = getEngineMatchesForClient(client.id)
    const forgeActions = getForgeActionsForClient(client.id)
    const daysInStage = getDaysInStage(client.dealStageChangedAt)

    return (
      <div
        key={client.id}
        onClick={() => openClient(client.id)}
        className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 space-y-2 group hover:border-white/[0.08] transition-all cursor-pointer"
      >
        {/* Client Name + Type Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-white/90 leading-tight truncate hover:text-pcis-gold">
              <ClientLink clientId={client.id} className="no-underline hover:underline">
                {client.name}
              </ClientLink>
            </p>
            <p className="text-[8px] text-white/60 mt-0.5">{client.type}</p>
          </div>
        </div>

        {/* Engagement Status Dot + Badge */}
        {engagement && (
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] ${getEngagementColor(engagement.status)}`}>
              {getEngagementIcon()}
            </span>
            <span className="text-[8px] text-white/70 uppercase tracking-wider">
              {engagement.status.charAt(0).toUpperCase() + engagement.status.slice(1)}
            </span>
          </div>
        )}

        {/* CIE Score */}
        {cieClient && (
          <div className="flex items-center justify-between">
            <span className="text-[8px] text-white/70 uppercase tracking-wider">CIE Score</span>
            <span
              className={`text-[9px] font-bold tabular-nums ${getCIEScoreColor(cieClient.overallCIEScore)}`}
            >
              {cieClient.overallCIEScore}
            </span>
          </div>
        )}

        {/* Purpose */}
        {purpose && (
          <div className="flex items-center justify-between">
            <span className="text-[8px] text-white/70 uppercase tracking-wider">Purpose</span>
            <span className="text-[8px] text-white/90 font-medium">{purpose.primaryPurpose}</span>
          </div>
        )}

        {/* ENGINE Matches */}
        <div className="flex items-center justify-between">
          <span className="text-[8px] text-white/70 uppercase tracking-wider">Matches</span>
          <span className="text-[9px] font-bold text-pcis-gold tabular-nums">{engineMatches.length}</span>
        </div>

        {/* FORGE Pending Actions */}
        <div className="flex items-center justify-between">
          <span className="text-[8px] text-white/70 uppercase tracking-wider">Actions</span>
          <span className="text-[9px] font-bold text-white/90 tabular-nums">{forgeActions.length}</span>
        </div>

        {/* Days in Stage */}
        <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
          <span className="text-[8px] text-white/70 uppercase tracking-wider">In Stage</span>
          <span className="text-[8px] text-white/90 tabular-nums">{daysInStage}d</span>
        </div>
      </div>
    )
  }

  const renderStageColumn = (stage: DealStage) => {
    const stageClients = stageGroups[stage]

    return (
      <div key={stage} className="flex-shrink-0 w-72 space-y-2">
        {/* Stage Header */}
        <div
          className="pb-2 border-b-2 rounded-t"
          style={{ borderColor: dealStageColors[stage] }}
        >
          <h3 className="text-[11px] font-semibold text-white/90 uppercase tracking-wider">
            {stage}
          </h3>
          <span
            className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold rounded"
            style={{
              backgroundColor: `${dealStageColors[stage]}20`,
              color: dealStageColors[stage],
            }}
          >
            {stageClients.length}
          </span>
        </div>

        {/* Client Cards */}
        <div className="space-y-2">
          {stageClients.length > 0 ? (
            stageClients.map(client => renderClientCard(client))
          ) : (
            <div className="text-center py-4">
              <p className="text-[8px] text-white/30 uppercase tracking-wider">Empty</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============================================================================
  // Render Main
  // ============================================================================

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <div>
          <h2
            className="text-lg font-semibold text-pcis-text tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Deal Pipeline
          </h2>
          <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
            Cross-Engine Pipeline · CIE → ENGINE → FORGE
          </p>
        </div>
      </div>

      {/* Top Stats Bar */}
      {renderStatsBar()}

      {/* Pipeline Funnel Bar */}
      {renderFunnelBar()}

      {/* Filter Bar */}
      {renderFilterBar()}

      {/* Stage Columns: Horizontally Scrollable */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0 py-3 pr-2">
        <div className="flex gap-4 pb-2">
          {DEAL_STAGES.map(stage => renderStageColumn(stage))}
        </div>
      </div>

      {/* Footer Summary */}
      {totalClients > 0 && (
        <div className="flex-shrink-0 border-t border-pcis-border/10 pt-3 flex items-center justify-between text-[8px] text-white/50">
          <div className="flex gap-6">
            <div>
              <span className="text-white/40 uppercase tracking-wider block text-[7px]">
                Total Clients
              </span>
              <span className="text-white/90 font-semibold text-[10px]">{totalClients}</span>
            </div>
            <div>
              <span className="text-white/40 uppercase tracking-wider block text-[7px]">
                Closed Won
              </span>
              <span
                className="font-semibold text-[10px]"
                style={{ color: dealStageColors['Closed Won'] }}
              >
                {stageCounts['Closed Won']}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-white/40 uppercase tracking-wider block text-[7px]">Active</span>
            <span className="text-white/90 font-semibold text-[10px]">
              {stageCounts['Lead In'] +
                stageCounts['Discovery'] +
                stageCounts['Viewing'] +
                stageCounts['Offer Made'] +
                stageCounts['Negotiation']}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
