'use client'

import React, { useState, useMemo } from 'react'
import {
  engineMatches,
  PURPOSE_CONFIGS,
  type EngineMatch,
  type ClientPurpose,
} from '@/lib/engineData'
import { getClient, getProperty } from '@/lib/mockData'
import { ClientLink, PropertyLink } from '../useWorkspaceNav'

type StatusFilter = 'all' | 'active' | 'presented' | 'shortlisted' | 'rejected' | 'converted'

// ============================================================================
// Color Utilities
// ============================================================================

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 65) return 'text-amber-400'
  if (score >= 50) return 'text-blue-400'
  return 'text-red-400'
}

const getGradeColor = (grade: string): string => {
  switch (grade) {
    case 'A+': return 'text-[#D4A574]'
    case 'A': return 'text-emerald-400'
    case 'B+': return 'text-cyan-400'
    case 'B': return 'text-blue-400'
    case 'C': return 'text-amber-400'
    case 'D': return 'text-red-400'
    default: return 'text-white/70'
  }
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'text-cyan-400'
    case 'presented': return 'text-amber-400'
    case 'shortlisted': return 'text-emerald-400'
    case 'rejected': return 'text-red-400'
    case 'converted': return 'text-[#D4A574]'
    default: return 'text-white/70'
  }
}

const getStatusBgColor = (status: string): string => {
  switch (status) {
    case 'active': return 'bg-cyan-400/10'
    case 'presented': return 'bg-amber-400/10'
    case 'shortlisted': return 'bg-emerald-400/10'
    case 'rejected': return 'bg-red-400/10'
    case 'converted': return 'bg-[#D4A574]/10'
    default: return 'bg-white/[0.03]'
  }
}

// ============================================================================
// Component
// ============================================================================

export default function ENGRecommendationsView(): React.ReactElement {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [purposeFilter, setPurposeFilter] = useState<ClientPurpose | null>(null)

  const filtered = useMemo(() => {
    let result = [...engineMatches].sort((a: EngineMatch, b: EngineMatch) => b.overallScore - a.overallScore)

    if (statusFilter !== 'all') {
      result = result.filter(m => m.status === statusFilter)
    }

    if (purposeFilter) {
      result = result.filter(m => m.purpose === purposeFilter)
    }

    return result
  }, [statusFilter, purposeFilter])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pb-3 border-b border-pcis-border/10 px-0">
        <h2
          className="text-lg font-semibold text-pcis-text tracking-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Recommendations Feed
        </h2>
        <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
          AI-Generated Match Suggestions
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 space-y-2 px-0">
        {/* Status Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">Status</span>
          {(['all', 'active', 'presented', 'shortlisted', 'converted', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all ${
                statusFilter === status
                  ? 'bg-white/[0.1] text-white/90 border border-white/30'
                  : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
              }`}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>

        {/* Purpose Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">Purpose</span>
          <button
            onClick={() => setPurposeFilter(null)}
            className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all ${
              purposeFilter === null
                ? 'bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/50'
                : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
            }`}
          >
            All
          </button>
          {PURPOSE_CONFIGS.map((config) => (
            <button
              key={config.id}
              onClick={() => setPurposeFilter(config.id)}
              className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all ${
                purposeFilter === config.id
                  ? 'border border-white/30'
                  : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
              }`}
              style={purposeFilter === config.id ? { borderColor: config.color, color: config.color } : {}}
            >
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto min-h-0 py-3 space-y-2 pr-2">
        {filtered.map((match: EngineMatch) => {
          const client = getClient(match.clientId)
          const property = getProperty(match.propertyId)
          const purposeConfig = PURPOSE_CONFIGS.find(p => p.id === match.purpose)
          const isAPlus = match.grade === 'A+'

          return (
            <div
              key={match.id}
              className={`bg-white/[0.02] rounded-lg p-3.5 space-y-2.5 group hover:bg-white/[0.04] transition-all border ${
                isAPlus
                  ? 'border-pcis-gold/40'
                  : 'border-white/[0.04]'
              }`}
            >
              {/* Header: Client + Property + Purpose Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white/90">
                    <ClientLink clientId={match.clientId} className="hover:text-pcis-gold">
                      {client?.name || 'Unknown Client'}
                    </ClientLink>
                  </p>
                  <p className="text-[9px] text-white/60 mt-0.5">
                    →
                    {' '}
                    <PropertyLink propertyId={match.propertyId} className="hover:text-pcis-gold">
                      {property?.name || 'Unknown Property'}
                    </PropertyLink>
                  </p>
                </div>
                <span
                  className="px-2 py-1 text-[8px] font-bold uppercase tracking-wider rounded text-white/90 flex-shrink-0"
                  style={{ backgroundColor: `${purposeConfig?.color || '#D4A574'}20` }}
                >
                  {match.purpose}
                </span>
              </div>

              {/* Score + Grade Row */}
              <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-1">
                  <span className={`text-lg font-bold tabular-nums ${getScoreColor(match.overallScore)}`}>
                    {match.overallScore}
                  </span>
                  <span className="text-[8px] text-white/40">score</span>
                </div>
                <div className={`px-2 py-0.5 text-[9px] font-bold rounded ${getGradeColor(match.grade)}`}>
                  Grade {match.grade}
                </div>
                <div className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${getStatusColor(match.status)}`} style={{ backgroundColor: getStatusBgColor(match.status) }}>
                  {match.status}
                </div>
              </div>

              {/* Narrative */}
              <p className="text-[9px] leading-relaxed text-white/70">
                {match.narrative}
              </p>

              {/* Bottom Row: Confidence + Date */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.03]">
                <div>
                  <span className="text-[8px] text-white/40 uppercase tracking-wider block mb-1">Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${match.confidence * 100}%`,
                          backgroundColor: '#D4A574',
                          opacity: 0.8,
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-semibold text-white/70 w-8 text-right tabular-nums">
                      {Math.round(match.confidence * 100)}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[8px] text-white/40 uppercase tracking-wider block mb-1">Created</span>
                  <span className="text-[9px] text-white/70">{new Date(match.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="py-8 text-center text-white/50 text-sm">
            No matches for selected filters
          </div>
        )}
      </div>
    </div>
  )
}
