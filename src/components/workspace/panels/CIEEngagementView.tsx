'use client'

import { useState, useMemo } from 'react'
import { type CIEClient } from '@/lib/cieData'
import { useCIEClients, getCIESourceLabel, getCIESourceColor } from '@/lib/useCIEData'
import { P1Loading } from '@/components/P1Loading'
import { ClientLink } from '../useWorkspaceNav'

type EngagementStatus = 'thriving' | 'active' | 'cooling' | 'cold' | 'dormant'
type SortKey = 'daysSinceContact' | 'engagementScore' | 'decayRate' | 'readiness'
type MomentumDirection = 'heating' | 'cooling' | 'stable'

// ─────────────────────────────────────────────────────────────────────────────
// Status Configuration
// ─────────────────────────────────────────────────────────────────────────────

const statusConfig: Record<EngagementStatus, { color: string; hex: string; label: string }> = {
  thriving: { color: 'text-green-400', hex: '#22c55e', label: 'Thriving' },
  active: { color: 'text-cyan-400', hex: '#06b6d4', label: 'Active' },
  cooling: { color: 'text-amber-400', hex: '#f59e0b', label: 'Cooling' },
  cold: { color: 'text-red-400', hex: '#ef4444', label: 'Cold' },
  dormant: { color: 'text-gray-500', hex: '#6b7280', label: 'Dormant' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CIEEngagementView() {
  const [selectedStatus, setSelectedStatus] = useState<EngagementStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortKey>('engagementScore')

  const { data: liveCIEClients, loading, source: dataSource } = useCIEClients()
  const cieClients = liveCIEClients || []

  if (!liveCIEClients && loading) {
    return <P1Loading message="Loading..." />
  }

  const summary = useMemo(() => {
    if (!cieClients || cieClients.length === 0) {
      return {
        totalClients: 0,
        archetypeBreakdown: {},
        avgCIEScore: 0,
        engagementBreakdown: { thriving: 0, active: 0, cooling: 0, cold: 0, dormant: 0 },
        activeSignals: 0,
        atRiskClients: 0,
        predictionsActive: 0,
        topArchetype: '',
      }
    }

    const engagementBreakdown = {
      thriving: 0,
      active: 0,
      cooling: 0,
      cold: 0,
      dormant: 0,
    }

    let totalScore = 0
    let atRiskCount = 0
    const archetypeMap: Record<string, number> = {}

    cieClients.forEach(client => {
      const status = client.engagement?.status || 'dormant'
      engagementBreakdown[status]++

      if (status === 'cooling' || status === 'cold' || status === 'dormant') {
        atRiskCount++
      }

      totalScore += client.engagement?.engagementScore || 0

      if (client.archetype) {
        archetypeMap[client.archetype] = (archetypeMap[client.archetype] || 0) + 1
      }
    })

    const topArchetype = Object.entries(archetypeMap).sort(([, a], [, b]) => b - a)[0]?.[0] || ''
    const avgCIEScore = cieClients.length > 0 ? totalScore / cieClients.length : 0

    return {
      totalClients: cieClients.length,
      archetypeBreakdown: archetypeMap,
      avgCIEScore: Math.round(avgCIEScore),
      engagementBreakdown,
      activeSignals: cieClients.reduce((sum, c) => sum + (c.signalCount || 0), 0),
      atRiskClients: atRiskCount,
      predictionsActive: cieClients.filter(c => c.prediction != null).length,
      topArchetype,
    }
  }, [cieClients])

  // Filter clients
  const filteredClients = useMemo(() => {
    if (selectedStatus === 'all') {
      return cieClients
    }
    return cieClients.filter(c => c.engagement?.status === selectedStatus)
  }, [selectedStatus, cieClients])

  // Sort clients
  const sortedClients = useMemo(() => {
    const sorted = [...filteredClients]
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'daysSinceContact':
          return (b.engagement?.daysSinceContact || 999) - (a.engagement?.daysSinceContact || 999)
        case 'engagementScore':
          return (b.engagement?.engagementScore || 0) - (a.engagement?.engagementScore || 0)
        case 'decayRate':
          return (b.engagement?.decayRate || 0) - (a.engagement?.decayRate || 0)
        case 'readiness':
          return (b.engagement?.readinessScore || 0) - (a.engagement?.readinessScore || 0)
        default:
          return 0
      }
    })
    return sorted
  }, [filteredClients, sortBy])

  // Separate at-risk clients
  const atRiskClients = sortedClients.filter(
    c => c.engagement?.status === 'cooling' || c.engagement?.status === 'cold' || c.engagement?.status === 'dormant'
  )
  const normalClients = sortedClients.filter(
    c => c.engagement?.status !== 'cooling' && c.engagement?.status !== 'cold' && c.engagement?.status !== 'dormant'
  )

  const momentumIcon = (momentum: MomentumDirection) => {
    switch (momentum) {
      case 'heating':
        return '▲'
      case 'cooling':
        return '▼'
      case 'stable':
        return '→'
    }
  }

  const getMomentumColor = (momentum: MomentumDirection) => {
    switch (momentum) {
      case 'heating':
        return 'text-green-400'
      case 'cooling':
        return 'text-red-400'
      case 'stable':
        return 'text-pcis-text-secondary'
    }
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-pcis-border/20">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-pcis-gold text-[10px]">●</span>
            <h2 className="text-pcis-gold text-[11px] font-semibold uppercase tracking-wider">
              Engagement Intelligence
            </h2>
          </div>
        </div>
        <p className="text-[10px] text-pcis-text-secondary ml-4">Real-time heatmap across all clients</p>
      </div>

      {/* Stats Row: Colored dots with status counts */}
      <div className="px-4 py-3 border-b border-pcis-border/20 flex items-center gap-4">
        {(['thriving', 'active', 'cooling', 'cold', 'dormant'] as const).map(status => {
          const count = summary.engagementBreakdown[status] || 0
          return (
            <div key={status} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusConfig[status].hex }} />
              <span className="text-[9px] font-mono text-pcis-text-secondary">{count}</span>
              <span className="text-[9px] text-pcis-text-secondary">{statusConfig[status].label}</span>
            </div>
          )
        })}
      </div>

      {/* Status Distribution Panel (horizontal bar in Panel card) */}
      <div className="mx-4 mt-3 mb-3 bg-white/[0.02] border border-pcis-border/30 rounded-xl backdrop-blur-sm overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-[3px] h-3.5 rounded-full" style={{ backgroundColor: '#d4a574' }} />
          <span className="text-[11px] font-semibold text-pcis-text-secondary uppercase tracking-wider">
            Status Distribution
          </span>
        </div>
        <div className="flex gap-0.5 h-5 bg-black/20 rounded overflow-hidden">
          {(['thriving', 'active', 'cooling', 'cold', 'dormant'] as const).map(status => {
            const count = summary.engagementBreakdown[status] || 0
            const percentage = (count / cieClients.length) * 100
            return (
              <div
                key={status}
                className="flex items-center justify-center text-[8px] font-bold text-white/80 whitespace-nowrap"
                style={{ backgroundColor: statusConfig[status].hex, width: `${percentage}%`, minWidth: percentage > 5 ? 'auto' : '0' }}
                title={`${statusConfig[status].label}: ${count}`}
              >
                {percentage > 8 && count}
              </div>
            )
          })}
        </div>
      </div>

      {/* Filter Pills */}
      <div className="px-4 py-2.5 border-b border-pcis-border/20 flex gap-2 overflow-x-auto">
        {(['all', 'thriving', 'active', 'cooling', 'cold', 'dormant'] as const).map(status => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-2.5 py-1 text-[9px] rounded border whitespace-nowrap transition-all ${
              selectedStatus === status
                ? 'bg-pcis-gold/10 text-pcis-gold border-pcis-gold/20'
                : 'text-pcis-text-secondary border-pcis-border/30 hover:border-pcis-border/50'
            }`}
          >
            {status === 'all' ? 'All' : statusConfig[status as EngagementStatus].label}
          </button>
        ))}
      </div>

      {/* Sort Controls */}
      <div className="px-4 py-2.5 border-b border-pcis-border/20 flex gap-2 items-center">
        <span className="text-[9px] font-mono text-pcis-text-secondary">SORT:</span>
        {(['daysSinceContact', 'engagementScore', 'decayRate', 'readiness'] as const).map(key => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`px-2 py-1 text-[9px] rounded transition-all ${
              sortBy === key
                ? 'bg-pcis-gold/10 text-pcis-gold'
                : 'text-pcis-text-secondary hover:text-pcis-text-primary'
            }`}
          >
            {key === 'daysSinceContact' ? 'Days' : key === 'engagementScore' ? 'Score' : key === 'decayRate' ? 'Decay' : 'Ready'}
          </button>
        ))}
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto">
        {/* At-Risk Section */}
        {atRiskClients.length > 0 && (
          <div className="mx-4 mt-3 mb-3">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/20 bg-red-500/5 rounded-t-xl">
              <div className="w-[3px] h-3.5 rounded-full bg-red-500" />
              <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">
                At Risk ({atRiskClients.length})
              </span>
            </div>
            <div className="bg-white/[0.02] border border-t-0 border-pcis-border/30 rounded-b-xl backdrop-blur-sm overflow-hidden divide-y divide-pcis-border/10">
              {atRiskClients.map(client => (
                <ClientEngagementRow
                  key={client.client.id}
                  client={client}
                  momentumIcon={momentumIcon}
                  getMomentumColor={getMomentumColor}
                />
              ))}
            </div>
          </div>
        )}

        {/* Normal Clients Section */}
        {normalClients.length > 0 && (
          <div className="mx-4 mt-3 mb-4">
            <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl backdrop-blur-sm overflow-hidden divide-y divide-pcis-border/10">
              {normalClients.map(client => (
                <ClientEngagementRow
                  key={client.client.id}
                  client={client}
                  momentumIcon={momentumIcon}
                  getMomentumColor={getMomentumColor}
                />
              ))}
            </div>
          </div>
        )}

        {sortedClients.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[10px] text-pcis-text-secondary">No clients in this filter</p>
          </div>
        )}
      </div>

      {/* PCISCOM Banner Footer */}
      <div className="px-4 py-3 border-t border-pcis-border/20 bg-pcis-gold/5">
        <p className="text-[9px] text-pcis-text-secondary">
          <span className="text-pcis-gold">◆</span> PCISCOM will auto-update engagement from WhatsApp activity
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Client Row Component
// ─────────────────────────────────────────────────────────────────────────────

function ClientEngagementRow({
  client,
  momentumIcon,
  getMomentumColor,
}: {
  client: CIEClient
  momentumIcon: (m: MomentumDirection) => string
  getMomentumColor: (m: MomentumDirection) => string
}) {
  const status = statusConfig[client.engagement?.status || 'dormant']

  return (
    <div className="px-4 py-3 hover:bg-pcis-gold/[0.03] transition-colors cursor-pointer">
      {/* Client Header Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: status.hex }} />
          <ClientLink clientId={client.client.id} className="text-[10px] font-medium text-pcis-text-primary hover:text-pcis-gold truncate">
            {client.client.name}
          </ClientLink>
          <span className="text-[9px] px-2 py-0.5 rounded border border-pcis-border/30 text-pcis-text-secondary flex-shrink-0">
            {status.label}
          </span>
        </div>
        <div className={`text-[14px] font-bold ml-2 flex-shrink-0 ${getMomentumColor(client.engagement?.momentum || 'stable')}`}>
          {momentumIcon(client.engagement?.momentum || 'stable')}
        </div>
      </div>

      {/* Engagement Bar */}
      <div className="flex items-center gap-3 mt-1">
        <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${client.engagement?.engagementScore || 0}%`,
              backgroundColor: status.hex,
            }}
          />
        </div>
        <span className="text-[9px] font-mono font-bold text-pcis-text-primary min-w-[28px] text-right">
          {client.engagement?.engagementScore || 0}
        </span>
      </div>
    </div>
  )
}
