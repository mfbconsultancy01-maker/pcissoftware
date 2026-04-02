'use client'

import React, { useState, useMemo } from 'react'
import {
  opportunities,
  signalsSummary,
  type Opportunity,
} from '@/lib/signalsData'

type OpportunityType = Opportunity['type']
import { AreaLink } from '../useWorkspaceNav'

type TypeFilter = 'all' | OpportunityType
type ConfidenceFilter = 'all' | '>80%' | '>60%'
type SortBy = 'upside' | 'confidence' | 'time-horizon' | 'newest'

const TYPE_FILTERS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
  { value: 'hold', label: 'Hold' },
  { value: 'watch', label: 'Watch' },
]

const CONFIDENCE_FILTERS: Array<{ value: ConfidenceFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: '>80%', label: '>80%' },
  { value: '>60%', label: '>60%' },
]

const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: 'upside', label: 'Upside %' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'time-horizon', label: 'Time Horizon' },
  { value: 'newest', label: 'Newest' },
]

const getTypeColor = (type: OpportunityType): string => {
  switch (type) {
    case 'buy':
      return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
    case 'sell':
      return 'bg-red-500/20 text-red-300 border border-red-500/30'
    case 'hold':
      return 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    case 'watch':
    default:
      return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
  }
}

const getTypeIcon = (type: OpportunityType): string => {
  switch (type) {
    case 'buy':
      return '▲'
    case 'sell':
      return '▼'
    case 'hold':
      return '—'
    case 'watch':
    default:
      return '●'
  }
}

const getUpsideColor = (upside: number): string => {
  if (upside > 0) return 'text-emerald-400'
  if (upside < 0) return 'text-red-400'
  return 'text-white/70'
}

const getTimeHorizonOrder = (horizon: string): number => {
  switch (horizon) {
    case '3 months':
      return 1
    case '6 months':
      return 2
    case '12 months':
      return 3
    case '18 months':
      return 4
    default:
      return 5
  }
}

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 80) return 'bg-emerald-500/30 text-emerald-300'
  if (confidence >= 70) return 'bg-amber-500/30 text-amber-300'
  return 'bg-orange-500/30 text-orange-300'
}

export default function OpportunityRadarView(): React.ReactElement {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('upside')

  const filtered = useMemo(() => {
    let result: Opportunity[] = opportunities.filter(o => o.status === 'active')

    if (typeFilter !== 'all') {
      result = result.filter(o => o.type === typeFilter)
    }

    if (confidenceFilter === '>80%') {
      result = result.filter(o => o.confidence >= 80)
    } else if (confidenceFilter === '>60%') {
      result = result.filter(o => o.confidence >= 60)
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'upside':
          return Math.abs(b.upside) - Math.abs(a.upside)
        case 'confidence':
          return b.confidence - a.confidence
        case 'time-horizon':
          return getTimeHorizonOrder(a.timeHorizon) - getTimeHorizonOrder(b.timeHorizon)
        case 'newest':
          return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
        default:
          return 0
      }
    })

    return result
  }, [typeFilter, confidenceFilter, sortBy])

  const totalUpside = filtered.reduce((sum, o) => sum + o.upside, 0) / Math.max(filtered.length, 1)
  const totalConfidence = filtered.reduce((sum, o) => sum + o.confidence, 0) / Math.max(filtered.length, 1)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <div>
          <h2
            className="text-lg font-semibold text-pcis-text tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Opportunity Radar
          </h2>
          <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
            Curated Investment Signals · {filtered.length} Active
          </p>
        </div>
        <div className="text-right">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block">
            Est. Upside
          </span>
          <span className={`text-[11px] font-bold tabular-nums ${getUpsideColor(totalUpside)}`}>
            {totalUpside > 0 ? '+' : ''}{totalUpside.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Filter/Sort Bar */}
      <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 space-y-2">
        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider w-12">Type</span>
          <div className="flex gap-1.5 flex-wrap">
            {TYPE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all ${
                  typeFilter === f.value
                    ? 'bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/50'
                    : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Confidence Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider w-12">Conf.</span>
          <select
            value={confidenceFilter}
            onChange={e => setConfidenceFilter(e.target.value as ConfidenceFilter)}
            className="px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded bg-white/[0.02] border border-white/[0.04] text-white/90 hover:bg-white/[0.04] transition-all focus:outline-none focus:border-pcis-gold/50"
          >
            {CONFIDENCE_FILTERS.map(f => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider w-12">Sort</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            className="px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded bg-white/[0.02] border border-white/[0.04] text-white/90 hover:bg-white/[0.04] transition-all focus:outline-none focus:border-pcis-gold/50"
          >
            {SORT_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Opportunity Cards Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 py-3">
        <div className="grid grid-cols-2 gap-3 pr-2">
          {filtered.map(opp => (
            <div
              key={opp.id}
              className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 space-y-2.5 group hover:border-white/[0.08] transition-all"
            >
              {/* Header with Type Badge and Confidence */}
              <div className="flex items-start justify-between">
                <span
                  className={`px-2 py-1 text-[8px] font-bold uppercase tracking-wider rounded ${getTypeColor(opp.type)}`}
                >
                  {getTypeIcon(opp.type)} {opp.type.charAt(0).toUpperCase() + opp.type.slice(1)}
                </span>
                <div className="text-right">
                  <span className="text-[7px] text-white/40 uppercase tracking-wider block">Confidence</span>
                  <span className={`text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded ${getConfidenceColor(opp.confidence)}`}>
                    {opp.confidence}%
                  </span>
                </div>
              </div>

              {/* Title and Area */}
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-white/90 leading-tight">
                  {opp.title}
                </p>
                <p className="text-[8px] text-white/60">
                  <AreaLink areaId={opp.areaId} className="text-pcis-gold hover:text-white/90">
                    {opp.area}
                  </AreaLink>
                  {' '}· {opp.propertyType}
                </p>
              </div>

              {/* Price Information */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[8px] text-white/40 uppercase tracking-wider">Current</span>
                  <span className="text-[9px] font-semibold text-white/90 tabular-nums">
                    AED {opp.currentPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[8px] text-white/40 uppercase tracking-wider">Target</span>
                  <span className="text-[9px] font-semibold text-white/90 tabular-nums">
                    AED {opp.targetPrice.toLocaleString()}
                  </span>
                </div>

                {/* Price Bar */}
                <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${opp.upside > 0 ? 'bg-emerald-500/50' : 'bg-red-500/50'}`}
                    style={{
                      width: `${Math.min(100, Math.max(10, Math.abs(opp.upside) * 4))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Upside and Time Horizon */}
              <div className="flex justify-between items-baseline pt-1">
                <div className="space-y-0.5">
                  <span className="text-[8px] text-white/40 uppercase tracking-wider block">Upside</span>
                  <span className={`text-[13px] font-bold tabular-nums ${getUpsideColor(opp.upside)}`}>
                    {opp.upside > 0 ? '+' : ''}{opp.upside.toFixed(1)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] text-white/40 uppercase tracking-wider block">Horizon</span>
                  <span className="text-[9px] font-semibold text-white/80 bg-white/[0.05] px-1.5 py-0.5 rounded">
                    {opp.timeHorizon}
                  </span>
                </div>
              </div>

              {/* Rationale */}
              <p className="text-[8px] text-white/70 leading-relaxed line-clamp-2 italic border-l border-pcis-gold/30 pl-2">
                {opp.rationale}
              </p>

              {/* Risks */}
              <div className="space-y-1">
                <span className="text-[7px] text-white/40 uppercase tracking-wider block">Risks</span>
                <div className="space-y-0.5">
                  {opp.risks.slice(0, 2).map((risk, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="text-red-400 text-[7px] mt-0.5">●</span>
                      <span className="text-[8px] text-white/60">{risk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Client Fit */}
              <div className="flex flex-wrap gap-1 pt-1">
                {opp.clientFit.map((fit, idx) => (
                  <span key={idx} className="text-[7px] bg-pcis-gold/10 text-pcis-gold/80 px-1.5 py-0.5 rounded">
                    {fit}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">No opportunities match filters</p>
              <p className="text-white/20 text-[9px]">Try adjusting your selection</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary Row at Bottom */}
      {filtered.length > 0 && (
        <div className="flex-shrink-0 border-t border-pcis-border/10 pt-3 px-0 flex items-center justify-between text-[8px] text-white/50">
          <div className="flex gap-6">
            <div>
              <span className="text-white/40 uppercase tracking-wider block text-[7px]">Total</span>
              <span className="text-white/90 font-semibold text-[10px]">{filtered.length} Opps</span>
            </div>
            <div>
              <span className="text-white/40 uppercase tracking-wider block text-[7px]">Avg Upside</span>
              <span className={`font-semibold text-[10px] ${getUpsideColor(totalUpside)}`}>
                {totalUpside > 0 ? '+' : ''}{totalUpside.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-white/40 uppercase tracking-wider block text-[7px]">Avg Confidence</span>
              <span className="text-white/90 font-semibold text-[10px]">{totalConfidence.toFixed(0)}%</span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="text-right">
              <span className="text-white/40 uppercase tracking-wider block text-[7px]">Active Opps</span>
              <span className="text-pcis-gold font-semibold text-[10px]">{signalsSummary.activeOpportunities}</span>
            </div>
            <div className="text-right">
              <span className="text-white/40 uppercase tracking-wider block text-[7px]">Emerging</span>
              <span className="text-pcis-gold font-semibold text-[10px]">{signalsSummary.emergingAreas}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
