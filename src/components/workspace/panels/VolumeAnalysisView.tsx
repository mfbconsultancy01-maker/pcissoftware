'use client'

import React, { useState, useMemo } from 'react'
import {
  mockTransactionData,
  type VolumeByPeriod,
  type VolumeByArea,
  type VolumeByType,
  type TransactionSummary,
} from '@/lib/transactionData'
import { useWorkspaceNav } from '../useWorkspaceNav'

const { volumeByMonth, volumeByArea, volumeByType, summary } = mockTransactionData

// ============================================================================
// PCIS Volume Analysis — Market Momentum Dashboard
// ============================================================================
// Terminal-style volume analysis showing transaction momentum, area rankings,
// property type distribution, and payment/deal-structure splits. Bloomberg-grade
// density with inline SVG charts. PCIS design system compliant.
// ============================================================================

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return n.toString()
}

function formatValue(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M AED'
  return (n / 1_000).toFixed(0) + 'K AED'
}

function formatPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function formatCurrency(n: number): string {
  return `${(n / 1_000_000).toFixed(2)}M AED`
}

// ============================================================================
// SVG Bar Chart — Monthly Transaction Volume
// ============================================================================
function MonthlyVolumeChart({ data }: { data: VolumeByPeriod[] }): React.ReactElement {
  const maxVolume = Math.max(...data.map(d => d.transactions))
  const months: string[] = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

  return (
    <svg viewBox="0 0 480 140" className="w-full" preserveAspectRatio="none">
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((pct: number) => (
        <g key={pct}>
          <line x1="30" y1={120 - (pct / 100) * 110} x2="480" y2={120 - (pct / 100) * 110}
                stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <text x="5" y={120 - (pct / 100) * 110 + 4} fontSize="8" fill="rgba(255,255,255,0.3)" textAnchor="end">
            {Math.round(maxVolume * (pct / 100))}
          </text>
        </g>
      ))}

      {/* Bars */}
      {data.map((d: VolumeByPeriod, i: number) => {
        const barHeight = (d.transactions / maxVolume) * 110
        const x = 30 + (i / data.length) * 450 + (450 / data.length) * 0.15
        const width = (450 / data.length) * 0.7
        const isCurrentMonth = i === data.length - 1

        return (
          <g key={i}>
            <rect
              x={x}
              y={120 - barHeight}
              width={width}
              height={barHeight}
              fill={isCurrentMonth ? '#d4a574' : '#3b82f6'}
              opacity={isCurrentMonth ? 1 : 0.6}
              rx="2"
            />
            <text x={x + width / 2} y="135" fontSize="9" fill="rgba(255,255,255,0.5)" textAnchor="middle">
              {months[i]}
            </text>
          </g>
        )
      })}

      {/* Value labels on bars */}
      {data.map((d: VolumeByPeriod, i: number) => {
        const barHeight = (d.transactions / maxVolume) * 110
        const x = 30 + (i / data.length) * 450 + (450 / data.length) * 0.15
        const width = (450 / data.length) * 0.7

        return (
          <text
            key={`label-${i}`}
            x={x + width / 2}
            y={120 - barHeight - 4}
            fontSize="8"
            fill="rgba(255,255,255,0.7)"
            textAnchor="middle"
            fontWeight="600"
          >
            {d.transactions}
          </text>
        )
      })}
    </svg>
  )
}

// ============================================================================
// SVG Line Chart — Monthly Transaction Value
// ============================================================================
function MonthlyValueChart({ data }: { data: VolumeByPeriod[] }): React.ReactElement {
  const maxValue = Math.max(...data.map(d => d.totalValue))
  const minValue = Math.min(...data.map(d => d.totalValue))
  const range = maxValue - minValue || 1

  const points = data.map((d: VolumeByPeriod, i: number) => {
    const x = 30 + (i / (data.length - 1)) * 450
    const y = 120 - ((d.totalValue - minValue) / range) * 110
    return { x, y, value: d.totalValue }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x} 120 L ${points[0].x} 120 Z`

  return (
    <svg viewBox="0 0 480 140" className="w-full" preserveAspectRatio="none">
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((pct: number) => (
        <g key={pct}>
          <line x1="30" y1={120 - (pct / 100) * 110} x2="480" y2={120 - (pct / 100) * 110}
                stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <text x="5" y={120 - (pct / 100) * 110 + 4} fontSize="8" fill="rgba(255,255,255,0.3)" textAnchor="end">
            {formatNumber((minValue + (maxValue - minValue) * (pct / 100)) / 1_000_000)}M
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaD} fill="#22c55e" opacity="0.1" />

      {/* Line */}
      <path d={pathD} stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2}
                fill="#22c55e" opacity={i === points.length - 1 ? 1 : 0.6} />
      ))}

      {/* Month labels */}
      {data.map((_, i) => {
        const months: string[] = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
        const x = 30 + (i / (data.length - 1)) * 450
        return (
          <text key={`label-${i}`} x={x} y="135" fontSize="9" fill="rgba(255,255,255,0.5)" textAnchor="middle">
            {months[i]}
          </text>
        )
      })}
    </svg>
  )
}

// ============================================================================
// Horizontal Bar Card — Property Type
// ============================================================================
function PropertyTypeCard({ type }: { type: VolumeByType }): React.ReactElement {
  const totalTxns = volumeByType.reduce((s: number, t: VolumeByType) => s + t.transactions, 0)
  const marketShare = (type.transactions / totalTxns) * 100

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-pcis-text">{type.propertyType}</span>
        <span className="text-[10px] tabular-nums text-pcis-text-muted">{type.transactions.toLocaleString()} txns</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${marketShare}%`, background: '#3b82f6' }} />
        </div>
        <span className="text-[9px] tabular-nums text-pcis-text-muted/60 w-12 text-right">{marketShare.toFixed(1)}%</span>
      </div>
      <div className="flex gap-4 text-[10px] text-pcis-text-muted">
        <div>
          <span className="text-pcis-text-muted/50">Value: </span>
          <span className="tabular-nums text-pcis-text-muted/80">{formatCurrency(type.totalValue)}</span>
        </div>
        <div>
          <span className="text-pcis-text-muted/50">Avg: </span>
          <span className="tabular-nums text-pcis-text-muted/80">{formatNumber(type.avgValue)} AED</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Split Comparison — Off-Plan vs Resale / Cash vs Mortgage
// ============================================================================
function SplitComparison({
  label,
  pct1,
  pct2,
  label1,
  label2,
  color1,
  color2,
}: {
  label: string
  pct1: number
  pct2: number
  label1: string
  label2: string
  color1: string
  color2: string
}): React.ReactElement {
  return (
    <div className="space-y-2">
      <span className="text-[11px] font-medium text-pcis-text block">{label}</span>
      <div className="flex h-5 rounded-lg overflow-hidden gap-px bg-white/[0.02] border border-pcis-border/10">
        <div className="flex items-center justify-center text-[9px] font-bold tabular-nums"
             style={{ width: `${pct1}%`, background: color1, color: 'rgb(0,0,0)' }}>
          {pct1.toFixed(0)}%
        </div>
        <div className="flex items-center justify-center text-[9px] font-bold tabular-nums"
             style={{ width: `${pct2}%`, background: color2, color: 'rgb(0,0,0)' }}>
          {pct2.toFixed(0)}%
        </div>
      </div>
      <div className="flex justify-between text-[9px] text-pcis-text-muted/60">
        <span>{label1}</span>
        <span>{label2}</span>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================
type SortKey = 'transactions' | 'value' | 'avg' | 'moChange' | 'yoyChange'

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'transactions', label: 'Txns' },
  { key: 'value', label: 'Value' },
  { key: 'avg', label: 'Avg Sqft' },
  { key: 'moChange', label: 'MoM' },
  { key: 'yoyChange', label: 'YoY' },
]

export default function VolumeAnalysisView(): React.ReactElement {
  const nav = useWorkspaceNav()
  const [sortBy, setSortBy] = useState<SortKey>('transactions')

  const sortedAreas = useMemo(() => {
    const sorted = [...volumeByArea]
    switch (sortBy) {
      case 'transactions':
        return sorted.sort((a: VolumeByArea, b: VolumeByArea) => b.transactions - a.transactions)
      case 'value':
        return sorted.sort((a: VolumeByArea, b: VolumeByArea) => b.totalValue - a.totalValue)
      case 'avg':
        return sorted.sort((a: VolumeByArea, b: VolumeByArea) => b.avgPriceSqft - a.avgPriceSqft)
      case 'moChange':
        return sorted.sort((a: VolumeByArea, b: VolumeByArea) => b.momChange - a.momChange)
      case 'yoyChange':
        return sorted.sort((a: VolumeByArea, b: VolumeByArea) => b.yoyChange - a.yoyChange)
      default:
        return sorted
    }
  }, [sortBy])

  const currentMonth = volumeByMonth[volumeByMonth.length - 1]
  const prevMonth = volumeByMonth[volumeByMonth.length - 2]
  const momVolumeChange = currentMonth && prevMonth
    ? ((currentMonth.transactions - prevMonth.transactions) / prevMonth.transactions) * 100
    : 0
  const momValueChange = currentMonth && prevMonth
    ? ((currentMonth.totalValue - prevMonth.totalValue) / prevMonth.totalValue) * 100
    : 0

  return (
    <div className="h-full flex flex-col">
      {/* Header with summary stats */}
      <div className="px-4 pt-4 pb-3 border-b border-pcis-border/10 flex-shrink-0">
        <div className="mb-3">
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-lg font-semibold text-pcis-text tracking-tight">
            Volume Analysis
          </h2>
          <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase">
            Dubai Real Estate · Monthly Trends
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-2.5">
            <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1">Total Txns</div>
            <div className="text-[13px] font-bold tabular-nums text-pcis-text">
              {summary.totalTransactions.toLocaleString()}
            </div>
            <div className={`text-[9px] tabular-nums ${momVolumeChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPct(momVolumeChange)} MoM
            </div>
          </div>
          <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-2.5">
            <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1">Total Value</div>
            <div className="text-[13px] font-bold tabular-nums text-pcis-text">
              {formatCurrency(summary.totalValue)}
            </div>
            <div className={`text-[9px] tabular-nums ${momValueChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPct(momValueChange)} MoM
            </div>
          </div>
          <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-2.5">
            <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1">YoY Change</div>
            <div className={`text-[13px] font-bold tabular-nums ${summary.yoyVolumeChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPct(summary.yoyVolumeChange)}
            </div>
          </div>
          <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-2.5">
            <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1">Avg Value</div>
            <div className="text-[13px] font-bold tabular-nums text-pcis-text">
              {formatNumber(summary.avgTransactionValue)} AED
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 py-4 space-y-5">
          {/* Monthly Volume Chart */}
          <div className="space-y-2">
            <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[12px] font-semibold text-pcis-text tracking-wide uppercase pb-1.5 border-b border-pcis-border/10">
              Monthly Volume
            </h3>
            <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-3">
              <MonthlyVolumeChart data={volumeByMonth} />
            </div>
          </div>

          {/* Monthly Value Chart */}
          <div className="space-y-2">
            <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[12px] font-semibold text-pcis-text tracking-wide uppercase pb-1.5 border-b border-pcis-border/10">
              Monthly Value
            </h3>
            <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-3">
              <MonthlyValueChart data={volumeByMonth} />
            </div>
          </div>

          {/* Off-Plan vs Resale & Cash vs Mortgage */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-3">
              <SplitComparison
                label="Deal Structure"
                pct1={summary.offPlanPct}
                pct2={100 - summary.offPlanPct}
                label1="Off-Plan"
                label2="Resale"
                color1="#a855f7"
                color2="#ec4899"
              />
            </div>
            <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-3">
              <SplitComparison
                label="Payment Method"
                pct1={summary.cashPct}
                pct2={100 - summary.cashPct}
                label1="Cash"
                label2="Mortgage"
                color1="#22c55e"
                color2="#3b82f6"
              />
            </div>
          </div>

          {/* Property Type Distribution */}
          <div className="space-y-2">
            <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[12px] font-semibold text-pcis-text tracking-wide uppercase pb-1.5 border-b border-pcis-border/10">
              By Property Type
            </h3>
            <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-3 space-y-3">
              {volumeByType.map((type: VolumeByType) => (
                <PropertyTypeCard key={type.propertyType} type={type} />
              ))}
            </div>
          </div>

          {/* Area Rankings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[12px] font-semibold text-pcis-text tracking-wide uppercase">By Area</h3>
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
            <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl overflow-hidden">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-pcis-border/10">
                    <th className="px-3 py-2 text-left font-semibold text-pcis-text-muted/60 uppercase tracking-wider">Area</th>
                    <th className="px-3 py-2 text-right font-semibold text-pcis-text-muted/60 uppercase tracking-wider">Txns</th>
                    <th className="px-3 py-2 text-right font-semibold text-pcis-text-muted/60 uppercase tracking-wider">Value</th>
                    <th className="px-3 py-2 text-right font-semibold text-pcis-text-muted/60 uppercase tracking-wider">Avg/sqft</th>
                    <th className="px-3 py-2 text-right font-semibold text-pcis-text-muted/60 uppercase tracking-wider">MoM%</th>
                    <th className="px-3 py-2 text-right font-semibold text-pcis-text-muted/60 uppercase tracking-wider">YoY%</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAreas.map((area: VolumeByArea) => (
                    <tr
                      key={area.areaId}
                      className="border-b border-pcis-border/5 hover:bg-white/[0.02]"
                      onClick={() => nav.openArea(area.areaId)}
                      role="button"
                      tabIndex={0}
                    >
                      <td className="px-3 py-2 text-pcis-text font-bold">{area.area}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-pcis-text">
                        {area.transactions.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-pcis-text">
                        {formatCurrency(area.totalValue)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-pcis-text">
                        {area.avgPriceSqft.toFixed(0)} AED
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums font-bold ${
                        area.momChange >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {formatPct(area.momChange)}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums font-bold ${
                        area.yoyChange >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {formatPct(area.yoyChange)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
