'use client'

import React, { useState, useMemo } from 'react'
import {
  purposeTrends,
  engineMatches,
  getEngineSummary,
  PURPOSE_CONFIGS,
  type ClientPurpose,
  type PurposeTrend,
} from '@/lib/engineData'

// ============================================================================
// Component
// ============================================================================

export default function ENGPurposeTrendsView(): React.ReactElement {
  const [purposeFilter, setPurposeFilter] = useState<ClientPurpose | null>(null)
  const summary = getEngineSummary()

  // Current month is March 2026
  const currentMonth = 'Mar 2026'

  const filteredTrends = useMemo(() => {
    let result = [...purposeTrends]
    if (purposeFilter) {
      result = result.filter(t => t.purpose === purposeFilter)
    }
    return result
  }, [purposeFilter])

  // Build current month stats by purpose
  const currentMonthStats = useMemo(() => {
    const stats: Record<ClientPurpose, { matchCount: number; avgScore: number; conversions: number }> = {
      'Investment': { matchCount: 0, avgScore: 0, conversions: 0 },
      'End-Use': { matchCount: 0, avgScore: 0, conversions: 0 },
      'Family Office': { matchCount: 0, avgScore: 0, conversions: 0 },
      'Renovation': { matchCount: 0, avgScore: 0, conversions: 0 },
      'Golden Visa': { matchCount: 0, avgScore: 0, conversions: 0 },
      'Pied-à-Terre': { matchCount: 0, avgScore: 0, conversions: 0 },
    }

    PURPOSE_CONFIGS.forEach((config) => {
      const purposeMatches = engineMatches.filter(m => m.purpose === config.id)
      const converted = purposeMatches.filter(m => m.status === 'converted').length
      const avgScore = purposeMatches.length > 0
        ? Math.round(purposeMatches.reduce((acc, m) => acc + m.overallScore, 0) / purposeMatches.length)
        : 0

      stats[config.id] = {
        matchCount: purposeMatches.length,
        avgScore,
        conversions: converted,
      }
    })

    return stats
  }, [])

  // Conversion funnel data
  const conversionFunnel = useMemo(() => {
    const active = engineMatches.filter(m => m.status === 'active').length
    const presented = engineMatches.filter(m => m.status === 'presented').length
    const shortlisted = engineMatches.filter(m => m.status === 'shortlisted').length
    const converted = engineMatches.filter(m => m.status === 'converted').length

    return [
      { stage: 'Active', count: active },
      { stage: 'Presented', count: presented },
      { stage: 'Shortlisted', count: shortlisted },
      { stage: 'Converted', count: converted },
    ]
  }, [])

  const maxFunnel = Math.max(...conversionFunnel.map(f => f.count), 1)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pb-3 border-b border-pcis-border/10 px-0">
        <h2
          className="text-lg font-semibold text-pcis-text tracking-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Purpose Trends
        </h2>
        <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
          Analytics Dashboard
        </p>
      </div>

      {/* Purpose Filter */}
      <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 space-y-2 px-0">
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

      {/* Current Month Summary Cards */}
      <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 px-0">
        <p className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-2">Current Month ({currentMonth})</p>
        <div className="grid grid-cols-6 gap-2">
          {PURPOSE_CONFIGS.map((config) => {
            const stats = currentMonthStats[config.id]
            return (
              <div
                key={config.id}
                className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2 space-y-1"
              >
                <p className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider truncate">{config.label}</p>
                <div className="space-y-1">
                  <div>
                    <p className="text-[7px] text-white/50">Matches</p>
                    <p className="text-[11px] font-bold text-white/90 tabular-nums">{stats.matchCount}</p>
                  </div>
                  <div>
                    <p className="text-[7px] text-white/50">Avg Score</p>
                    <p className="text-[11px] font-bold text-pcis-gold tabular-nums">{stats.avgScore}</p>
                  </div>
                  <div>
                    <p className="text-[7px] text-white/50">Conversions</p>
                    <p className="text-[11px] font-bold text-emerald-400 tabular-nums">{stats.conversions}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0 py-3 space-y-4 pr-2">
        {/* Conversion Funnel */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 space-y-3">
          <p className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">Conversion Funnel (All Statuses)</p>
          <div className="space-y-2">
            {conversionFunnel.map((item) => {
              const pct = maxFunnel > 0 ? Math.round((item.count / maxFunnel) * 100) : 0
              return (
                <div key={item.stage} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-white/80">{item.stage}</span>
                    <span className="text-[9px] font-bold text-white/80 tabular-nums">{item.count}</span>
                  </div>
                  <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: item.stage === 'Converted' ? '#10B981' : item.stage === 'Shortlisted' ? '#D4A574' : item.stage === 'Presented' ? '#F59E0B' : '#3B82F6',
                        opacity: 0.8,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Trends Table */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg overflow-hidden">
          <div className="space-y-0">
            {/* Table Header */}
            <div className="grid grid-cols-5 gap-2 px-4 py-3 border-b border-pcis-border/10 sticky top-0 z-10">
              <div className="text-[9px] text-white/40 uppercase tracking-wider">Month</div>
              <div className="text-[9px] text-white/40 uppercase tracking-wider text-center">Matches</div>
              <div className="text-[9px] text-white/40 uppercase tracking-wider text-center">Avg Score</div>
              <div className="text-[9px] text-white/40 uppercase tracking-wider text-center">Conversions</div>
              <div className="text-[9px] text-white/40 uppercase tracking-wider text-center">Conv. Rate</div>
            </div>

            {/* Table Rows */}
            {filteredTrends.map((trend: PurposeTrend) => {
              const convRate = trend.matchCount > 0 ? Math.round((trend.conversions / trend.matchCount) * 100) : 0
              const purposeConfig = PURPOSE_CONFIGS.find(p => p.id === trend.purpose)

              return (
                <div
                  key={`${trend.month}|${trend.purpose}`}
                  className="grid grid-cols-5 gap-2 px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.02] transition-all items-center"
                >
                  <div>
                    <p className="text-[9px] font-semibold text-white/80">{trend.month}</p>
                    <span
                      className="text-[8px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 text-white/80 inline-block mt-0.5"
                      style={{ backgroundColor: `${purposeConfig?.color || '#D4A574'}20` }}
                    >
                      {trend.purpose.slice(0, 4)}
                    </span>
                  </div>

                  <div className="text-center">
                    <p className="text-[11px] font-bold text-white/90 tabular-nums">{trend.matchCount}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-[11px] font-bold text-pcis-gold tabular-nums">{trend.avgScore}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-[11px] font-bold text-emerald-400 tabular-nums">{trend.conversions}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-[11px] font-bold text-cyan-400 tabular-nums">{convRate}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {filteredTrends.length === 0 && (
          <div className="py-8 text-center text-white/50 text-sm">
            No trends data for selected purpose
          </div>
        )}
      </div>
    </div>
  )
}
