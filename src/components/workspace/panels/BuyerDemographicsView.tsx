'use client'

import React, { useState, useMemo } from 'react'
import { mockTransactionData, type BuyerProfile } from '@/lib/transactionData'
import { useWorkspaceNav } from '../useWorkspaceNav'

const { buyerProfiles, summary } = mockTransactionData

// ============================================================================
// PCIS Buyer Demographics — Who's Buying in Dubai
// ============================================================================
// Terminal-style buyer nationality rankings with transaction analysis, cash %,
// Golden Visa eligibility, preferred areas/types, and market trends. Bloomberg-
// grade density with inline SVG visualizations. PCIS design system compliant.
// ============================================================================

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return n.toString()
}

function formatCurrency(n: number): string {
  return `${(n / 1_000_000).toFixed(2)}M AED`
}

function formatPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function getTrendColor(trend: string): string {
  switch (trend) {
    case 'increasing':
      return '#22c55e'
    case 'decreasing':
      return '#ef4444'
    default:
      return '#6b7280'
  }
}

function getTrendArrow(trend: string): string {
  switch (trend) {
    case 'increasing':
      return '▲'
    case 'decreasing':
      return '▼'
    default:
      return '—'
  }
}

// ============================================================================
// Horizontal Bar — Market Share
// ============================================================================
function MarketShareBar({ pct }: { pct: number }): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#d4a574' }} />
      </div>
      <span className="text-[9px] tabular-nums text-pcis-text-muted/60 w-10 text-right">{pct.toFixed(1)}%</span>
    </div>
  )
}

// ============================================================================
// Horizontal Bar Chart — Cash % by Nationality
// ============================================================================
function CashPercentageChart({ profiles }: { profiles: BuyerProfile[] }): React.ReactElement {
  const topProfiles = profiles.slice(0, 8)

  return (
    <div className="space-y-3">
      {topProfiles.map((profile: BuyerProfile) => (
        <div key={profile.nationality} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-pcis-text">{profile.nationality}</span>
            <span className="text-[9px] tabular-nums text-pcis-text-muted/60">{profile.cashPct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${profile.cashPct}%`, background: '#22c55e' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Horizontal Bar Chart — Average Transaction Value
// ============================================================================
function AvgTransactionChart({ profiles }: { profiles: BuyerProfile[] }): React.ReactElement {
  const topProfiles = profiles.slice(0, 8)
  const maxAvg = Math.max(...topProfiles.map((p: BuyerProfile) => p.avgTransactionValue))

  return (
    <div className="space-y-3">
      {topProfiles.map((profile: BuyerProfile) => {
        const pct = (profile.avgTransactionValue / maxAvg) * 100

        return (
          <div key={profile.nationality} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-pcis-text">{profile.nationality}</span>
              <span className="text-[9px] tabular-nums text-pcis-text-muted/60">
                {formatNumber(profile.avgTransactionValue)} AED
              </span>
            </div>
            <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#d4a574' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Golden Visa Analysis
// ============================================================================
function GoldenVisaAnalysis({ profiles }: { profiles: BuyerProfile[] }): React.ReactElement {
  const eligibleProfiles = profiles.filter((p: BuyerProfile) => p.goldenVisaEligiblePct >= 50).slice(0, 6)

  return (
    <div className="space-y-2">
      {eligibleProfiles.map((profile: BuyerProfile) => (
        <div key={profile.nationality} className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-pcis-text">{profile.nationality}</span>
              {profile.goldenVisaEligiblePct >= 50 && (
                <span className="text-[7px] px-1.5 py-0.5 bg-pcis-gold/20 text-pcis-gold rounded border border-pcis-gold/30 font-semibold">
                  ELIGIBLE
                </span>
              )}
            </div>
            <span className="text-[9px] tabular-nums text-pcis-text-muted/60">{profile.goldenVisaEligiblePct.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${profile.goldenVisaEligiblePct}%`, background: '#d4a574' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Nationality Card — Full Details
// ============================================================================
function NationalityCard({ profile }: { profile: BuyerProfile }): React.ReactElement {
  const totalTxns = buyerProfiles.reduce((s: number, p: BuyerProfile) => s + p.transactionCount, 0)
  const marketShare = (profile.transactionCount / totalTxns) * 100
  const trendColor = getTrendColor(profile.trend)
  const trendArrow = getTrendArrow(profile.trend)

  return (
    <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-[11px] font-bold text-pcis-text">{profile.nationality}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] text-pcis-text-muted/60">Trend:</span>
            <span className="text-[9px] font-bold" style={{ color: trendColor }}>
              {trendArrow} {profile.trend}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-bold tabular-nums text-pcis-text">
            {profile.transactionCount.toLocaleString()}
          </div>
          <div className="text-[9px] text-pcis-text-muted/60">txns</div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2 text-[9px]">
        <div>
          <span className="text-pcis-text-muted/60">Total Value:</span>
          <div className="text-pcis-text font-bold tabular-nums">
            {formatCurrency(profile.totalValue)}
          </div>
        </div>
        <div>
          <span className="text-pcis-text-muted/60">Avg Value:</span>
          <div className="text-pcis-text font-bold tabular-nums">
            {formatNumber(profile.avgTransactionValue)} AED
          </div>
        </div>
        <div>
          <span className="text-pcis-text-muted/60">Cash %:</span>
          <div className="text-pcis-text font-bold tabular-nums">{profile.cashPct.toFixed(0)}%</div>
        </div>
        <div>
          <span className="text-pcis-text-muted/60">MoM:</span>
          <div className={`font-bold tabular-nums ${profile.momChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatPct(profile.momChange)}
          </div>
        </div>
      </div>

      {/* Market share bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[9px]">
          <span className="text-pcis-text-muted/60">Market Share</span>
          <span className="text-pcis-text font-bold">{marketShare.toFixed(1)}%</span>
        </div>
        <MarketShareBar pct={marketShare} />
      </div>

      {/* Golden Visa */}
      {profile.goldenVisaEligiblePct >= 30 && (
        <div className="space-y-1 pt-1 border-t border-pcis-border/10">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-pcis-text-muted/60">Golden Visa Eligible</span>
            <span className="text-pcis-text font-bold">{profile.goldenVisaEligiblePct.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${profile.goldenVisaEligiblePct}%`, background: '#d4a574' }}
            />
          </div>
        </div>
      )}

      {/* Preferred areas */}
      {profile.preferredAreas.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-pcis-border/10">
          <div className="text-[9px] text-pcis-text-muted/60">Preferred Areas</div>
          <div className="flex flex-wrap gap-1">
            {profile.preferredAreas.slice(0, 3).map((area: string) => (
              <span
                key={area}
                className="text-[8px] px-2 py-1 bg-white/[0.03] text-pcis-text rounded border border-pcis-border/20"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Preferred types */}
      {profile.preferredTypes.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[9px] text-pcis-text-muted/60">Preferred Types</div>
          <div className="flex flex-wrap gap-1">
            {profile.preferredTypes.map((type: string) => (
              <span key={type} className="text-[8px] px-2 py-1 bg-white/[0.03] text-pcis-text rounded border border-pcis-border/20">
                {type}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================
type SortKey = 'transactions' | 'value' | 'avgValue' | 'cashPct' | 'goldenVisa'

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'transactions', label: 'Txns' },
  { key: 'value', label: 'Value' },
  { key: 'avgValue', label: 'Avg' },
  { key: 'cashPct', label: 'Cash %' },
  { key: 'goldenVisa', label: 'Golden Visa' },
]

export default function BuyerDemographicsView(): React.ReactElement {
  const nav = useWorkspaceNav()
  const [sortBy, setSortBy] = useState<SortKey>('transactions')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const sortedProfiles = useMemo(() => {
    const sorted = [...buyerProfiles]
    switch (sortBy) {
      case 'transactions':
        return sorted.sort((a: BuyerProfile, b: BuyerProfile) => b.transactionCount - a.transactionCount)
      case 'value':
        return sorted.sort((a: BuyerProfile, b: BuyerProfile) => b.totalValue - a.totalValue)
      case 'avgValue':
        return sorted.sort((a: BuyerProfile, b: BuyerProfile) => b.avgTransactionValue - a.avgTransactionValue)
      case 'cashPct':
        return sorted.sort((a: BuyerProfile, b: BuyerProfile) => b.cashPct - a.cashPct)
      case 'goldenVisa':
        return sorted.sort((a: BuyerProfile, b: BuyerProfile) => b.goldenVisaEligiblePct - a.goldenVisaEligiblePct)
      default:
        return sorted
    }
  }, [sortBy])

  const topNationality = sortedProfiles[0]
  const topCashPct = Math.max(...buyerProfiles.map((p: BuyerProfile) => p.cashPct))
  const avgGoldenVisa = buyerProfiles.reduce((s: number, p: BuyerProfile) => s + p.goldenVisaEligiblePct, 0) / buyerProfiles.length

  return (
    <div className="h-full flex flex-col">
      {/* Header with summary stats */}
      <div className="px-4 pt-4 pb-3 border-b border-pcis-border/10 flex-shrink-0">
        <div className="mb-3">
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-lg font-semibold text-pcis-text tracking-tight">
            Buyer Demographics
          </h2>
          <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase">
            Dubai Real Estate · Nationality Analysis
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-2.5">
            <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1">Top Nationality</div>
            <div className="text-[13px] font-bold text-pcis-text">{topNationality?.nationality || 'N/A'}</div>
            <div className="text-[9px] text-pcis-text-muted/60 mt-1">
              {topNationality?.transactionCount.toLocaleString() || 0} transactions
            </div>
          </div>
          <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-2.5">
            <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1">Market Cash %</div>
            <div className="text-[13px] font-bold tabular-nums text-pcis-text">{topCashPct.toFixed(0)}%</div>
            <div className="text-[9px] text-pcis-text-muted/60 mt-1">Highest cash buyers</div>
          </div>
          <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-2.5">
            <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1">Avg Golden Visa %</div>
            <div className="text-[13px] font-bold tabular-nums text-pcis-text">{avgGoldenVisa.toFixed(1)}%</div>
            <div className="text-[9px] text-pcis-text-muted/60 mt-1">Above 2M AED</div>
          </div>
          <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-2.5">
            <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1">Nationalities</div>
            <div className="text-[13px] font-bold tabular-nums text-pcis-text">{buyerProfiles.length}</div>
            <div className="text-[9px] text-pcis-text-muted/60 mt-1">Tracked buyers</div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 py-4 space-y-5">
          {/* Tabs and sort controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`text-[9px] px-3 py-1.5 rounded transition-colors ${
                  viewMode === 'cards'
                    ? 'text-pcis-gold bg-pcis-gold/[0.08] border border-pcis-gold/20 font-bold'
                    : 'text-pcis-text-muted border border-transparent hover:bg-white/[0.03]'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`text-[9px] px-3 py-1.5 rounded transition-colors ${
                  viewMode === 'table'
                    ? 'text-pcis-gold bg-pcis-gold/[0.08] border border-pcis-gold/20 font-bold'
                    : 'text-pcis-text-muted border border-transparent hover:bg-white/[0.03]'
                }`}
              >
                Table
              </button>
            </div>
            <div className="flex gap-1">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`text-[9px] px-2 py-1 rounded transition-colors ${
                    sortBy === opt.key
                      ? 'text-pcis-gold bg-pcis-gold/[0.08] border border-pcis-gold/20 font-bold'
                      : 'text-pcis-text-muted border border-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards view */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 gap-3">
              {sortedProfiles.slice(0, 10).map((profile: BuyerProfile) => (
                <NationalityCard key={profile.nationality} profile={profile} />
              ))}
            </div>
          )}

          {/* Table view */}
          {viewMode === 'table' && (
            <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl overflow-hidden">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-pcis-border/10">
                    <th className="px-3 py-2 text-left font-semibold text-pcis-text-muted/60 uppercase tracking-wider">Nationality</th>
                    <th className="px-3 py-2 text-right font-semibold text-pcis-text-muted/60 uppercase tracking-wider">Txns</th>
                    <th className="px-3 py-2 text-right font-semibold text-pcis-text-muted/60 uppercase tracking-wider">Total Value</th>
                    <th className="px-3 py-2 text-right font-semibold text-pcis-text-muted/60 uppercase tracking-wider">Avg Value</th>
                    <th className="px-3 py-2 text-right font-semibold text-pcis-text-muted/60 uppercase tracking-wider">Cash%</th>
                    <th className="px-3 py-2 text-right font-semibold text-pcis-text-muted/60 uppercase tracking-wider">Golden%</th>
                    <th className="px-3 py-2 text-right font-semibold text-pcis-text-muted/60 uppercase tracking-wider">MoM</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProfiles.map((profile: BuyerProfile) => {
                    const totalTxns = buyerProfiles.reduce((s: number, p: BuyerProfile) => s + p.transactionCount, 0)
                    const marketShare = (profile.transactionCount / totalTxns) * 100

                    return (
                      <tr key={profile.nationality} className="border-b border-pcis-border/5 hover:bg-white/[0.02]">
                        <td className="px-3 py-2 text-pcis-text font-bold">{profile.nationality}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-pcis-text">
                          {profile.transactionCount.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-pcis-text">
                          {formatCurrency(profile.totalValue)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-pcis-text">
                          {formatNumber(profile.avgTransactionValue)} AED
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-pcis-text">
                          {profile.cashPct.toFixed(0)}%
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums font-bold ${
                          profile.goldenVisaEligiblePct >= 50 ? 'text-pcis-gold' : 'text-pcis-text-muted/60'
                        }`}>
                          {profile.goldenVisaEligiblePct.toFixed(1)}%
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums font-bold ${
                          profile.momChange >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {formatPct(profile.momChange)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Analytics cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Cash % by Nationality */}
            <div className="space-y-2">
              <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[12px] font-semibold text-pcis-text tracking-wide uppercase pb-1.5 border-b border-pcis-border/10">
                Cash % by Nationality
              </h3>
              <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-3">
                <CashPercentageChart profiles={sortedProfiles} />
              </div>
            </div>

            {/* Avg Transaction Value */}
            <div className="space-y-2">
              <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[12px] font-semibold text-pcis-text tracking-wide uppercase pb-1.5 border-b border-pcis-border/10">
                Avg Transaction Value
              </h3>
              <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-3">
                <AvgTransactionChart profiles={sortedProfiles} />
              </div>
            </div>

            {/* Golden Visa Analysis */}
            <div className="space-y-2">
              <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[12px] font-semibold text-pcis-text tracking-wide uppercase pb-1.5 border-b border-pcis-border/10">
                Golden Visa Eligible
              </h3>
              <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-3">
                <GoldenVisaAnalysis profiles={sortedProfiles} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
