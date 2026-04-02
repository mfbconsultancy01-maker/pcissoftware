'use client'

import React, { useState, useMemo } from 'react'
import { mockTransactionData, type Transaction } from '@/lib/transactionData'

type TimeFilter = '30' | '90' | '365' | 'all'
type AreaFilter = 'all' | string
type TypeFilter = 'all' | string

const TIME_FILTERS: Array<{ value: TimeFilter; label: string }> = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 365 days' },
  { value: 'all', label: 'All Time' },
]

// Dynamically build area filters from actual transaction data
const AREA_FILTERS: string[] = (() => {
  const areaCounts: Record<string, number> = {}
  mockTransactionData.transactions.forEach((t: any) => {
    areaCounts[t.area] = (areaCounts[t.area] || 0) + 1
  })
  const topAreas = Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([area]) => area)
  return ['All', ...topAreas]
})()

const TYPE_FILTERS: string[] = ['All', 'Villa', 'Apartment', 'Penthouse', 'Townhouse']

// Generate abbreviations dynamically from area names
const AREA_ABBR: Record<string, string> = (() => {
  const abbrs: Record<string, string> = {}
  mockTransactionData.transactions.forEach((t: any) => {
    if (!abbrs[t.area]) {
      // Take first letter of each word, max 3 chars
      const words = t.area.split(/[\s-]+/).filter(Boolean)
      abbrs[t.area] = words.map((w: string) => w[0]).join('').slice(0, 3).toUpperCase()
    }
  })
  return abbrs
})()

export default function TopTransactionsView(): React.ReactElement {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('90')
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const getDaysFromFilter = (f: TimeFilter): number => {
    switch (f) {
      case '30': return 30
      case '90': return 90
      case '365': return 365
      case 'all': return 10000
    }
  }

  const filtered = useMemo(() => {
    const days: number = getDaysFromFilter(timeFilter)
    const cutoffDate: Date = new Date('2026-03-24')
    cutoffDate.setDate(cutoffDate.getDate() - days)

    let result: Transaction[] = mockTransactionData.transactions.filter(
      (t: Transaction) => new Date(t.date) >= cutoffDate
    )

    if (areaFilter !== 'all') {
      result = result.filter((t: Transaction) => t.area === areaFilter)
    }

    if (typeFilter !== 'all') {
      result = result.filter((t: Transaction) => t.propertyType === typeFilter)
    }

    return result.sort((a: Transaction, b: Transaction) => b.transactionValue - a.transactionValue)
  }, [timeFilter, areaFilter, typeFilter])

  const totalValue: number = filtered.reduce((sum: number, t: Transaction) => sum + t.transactionValue, 0)
  const avgPrice: number = filtered.length > 0 ? totalValue / filtered.length : 0

  const areaRecords = useMemo(() => {
    const records: Record<string, Transaction> = {}
    filtered.forEach((t: Transaction) => {
      if (!records[t.area] || t.transactionValue > records[t.area].transactionValue) {
        records[t.area] = t
      }
    })
    return Object.values(records).sort((a: Transaction, b: Transaction) => b.transactionValue - a.transactionValue)
  }, [filtered])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <div>
          <h2 className="text-lg font-semibold text-pcis-text tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Top Transactions
          </h2>
          <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
            {timeFilter === '30' && 'Last 30 Days'} {timeFilter === '90' && 'Last 90 Days'} {timeFilter === '365' && 'Last 365 Days'} {timeFilter === 'all' && 'All Time'} · {filtered.length} Deals
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block">Total Value</span>
            <span className="text-[11px] font-bold text-pcis-text tabular-nums">{(totalValue / 1e9).toFixed(2)}B AED</span>
          </div>
          <div className="text-right">
            <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block">Avg Price</span>
            <span className="text-[11px] font-bold text-pcis-text tabular-nums">{(avgPrice / 1e6).toFixed(1)}M AED</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 py-2.5 flex-shrink-0">
        <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">Period</span>
        <div className="flex items-center gap-1">
          {TIME_FILTERS.map((f: { value: TimeFilter; label: string }) => (
            <button
              key={f.value}
              onClick={() => setTimeFilter(f.value)}
              className={`text-[8px] tracking-wider px-2 py-1 rounded-lg transition-colors ${
                timeFilter === f.value
                  ? 'text-pcis-gold bg-pcis-gold/[0.08] border border-pcis-gold/20 font-bold'
                  : 'text-pcis-text-muted border border-transparent hover:bg-white/[0.03]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 py-2 flex-shrink-0">
        <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">Area</span>
        <div className="flex items-center gap-1 flex-wrap">
          {AREA_FILTERS.map((area: string) => (
            <button
              key={area}
              onClick={() => setAreaFilter(area === 'All' ? 'all' : area)}
              className={`text-[8px] tracking-wider px-2 py-1 rounded-lg transition-colors ${
                (area === 'All' && areaFilter === 'all') || areaFilter === area
                  ? 'text-pcis-gold bg-pcis-gold/[0.08] border border-pcis-gold/20 font-bold'
                  : 'text-pcis-text-muted border border-transparent hover:bg-white/[0.03]'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 py-2 flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">Type</span>
        <div className="flex items-center gap-1">
          {TYPE_FILTERS.map((type: string) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type === 'All' ? 'all' : type)}
              className={`text-[8px] tracking-wider px-2 py-1 rounded-lg transition-colors ${
                (type === 'All' && typeFilter === 'all') || typeFilter === type
                  ? 'text-pcis-gold bg-pcis-gold/[0.08] border border-pcis-gold/20 font-bold'
                  : 'text-pcis-text-muted border border-transparent hover:bg-white/[0.03]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {filtered.length > 0 ? (
          <table className="w-full border-collapse">
            <thead>
              <tr className="sticky top-0 bg-white/[0.01] border-b border-pcis-border/10">
                <th className="text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-3 py-2 w-12">#</th>
                <th className="text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-3 py-2 w-16">Date</th>
                <th className="text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-3 py-2 w-20">Area</th>
                <th className="text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-3 py-2 w-32">Building</th>
                <th className="text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-3 py-2 w-20">Type</th>
                <th className="text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-3 py-2 w-20">Size</th>
                <th className="text-right text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-3 py-2 w-24">Price (AED)</th>
                <th className="text-right text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-3 py-2 w-20">AED/sqft</th>
                <th className="text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-3 py-2 w-24">Buyer</th>
                <th className="text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-3 py-2 w-20">Method</th>
                <th className="text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-3 py-2 w-20">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((txn: Transaction, idx: number) => {
                const rank: number = idx + 1
                const isTop3: boolean = rank <= 3

                return (
                  <tr
                    key={txn.id}
                    className={`border-b border-pcis-border/5 hover:bg-white/[0.02] transition-colors ${isTop3 ? 'bg-pcis-gold/[0.04]' : ''}`}
                  >
                    <td className="text-[10px] font-bold tabular-nums px-3 py-2" style={{ color: isTop3 ? '#d4a574' : '#9ca3af' }}>
                      {rank} {isTop3 && '★'}
                    </td>
                    <td className="text-[10px] text-pcis-text-muted tabular-nums px-3 py-2">{txn.date}</td>
                    <td className="text-[10px] px-3 py-2">
                      <span className="text-[8px] bg-white/[0.05] border border-pcis-border/20 px-1.5 py-0.5 rounded text-pcis-text-muted">
                        {AREA_ABBR[txn.area] || txn.area.slice(0, 3).toUpperCase()}
                      </span>
                    </td>
                    <td className="text-[10px] text-pcis-text font-medium px-3 py-2 truncate">{txn.building}</td>
                    <td className="text-[10px] text-pcis-text-muted px-3 py-2">
                      {txn.propertyType} {txn.bedrooms > 0 && <span className="font-bold text-pcis-text">{txn.bedrooms}BR</span>}
                    </td>
                    <td className="text-[10px] text-pcis-text-muted tabular-nums px-3 py-2">{txn.size.toLocaleString()} sqft</td>
                    <td className="text-right text-[10px] font-bold tabular-nums px-3 py-2" style={{ color: isTop3 ? '#d4a574' : '#22c55e' }}>
                      {(txn.transactionValue / 1e6).toFixed(1)}M
                    </td>
                    <td className="text-right text-[10px] text-pcis-text-muted tabular-nums px-3 py-2">
                      {Math.round(txn.priceSqft).toLocaleString()}
                    </td>
                    <td className="text-[10px] text-pcis-text-muted px-3 py-2">{txn.buyerNationality}</td>
                    <td className="text-[10px] px-3 py-2">
                      <span
                        className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          txn.paymentMethod === 'Cash'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {txn.paymentMethod}
                      </span>
                    </td>
                    <td className="text-[10px] px-3 py-2">
                      <span
                        className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          txn.isOffPlan
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : 'bg-green-500/10 text-green-400 border border-green-500/20'
                        }`}
                      >
                        {txn.isOffPlan ? 'Off-Plan' : 'Ready'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="sticky bottom-0 bg-white/[0.02] border-t border-pcis-border/20">
                <td colSpan={4} className="text-[10px] text-pcis-text-muted px-3 py-2 font-semibold">
                  {filtered.length} Deals
                </td>
                <td colSpan={2}></td>
                <td className="text-right text-[10px] font-bold text-pcis-gold tabular-nums px-3 py-2">
                  {(totalValue / 1e9).toFixed(2)}B AED
                </td>
                <td className="text-right text-[10px] font-bold text-pcis-gold tabular-nums px-3 py-2">
                  Avg: {(avgPrice / 1e6).toFixed(1)}M
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <div className="flex items-center justify-center h-24">
            <span className="text-pcis-text-muted/40 text-[10px]">No transactions match filters</span>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-pcis-border/10 pt-3 mt-3 px-3 pb-3">
        <h3 className="text-[12px] font-semibold text-pcis-text uppercase tracking-wide pb-1.5 border-b border-pcis-border/10 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          Area Records
        </h3>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {areaRecords.slice(0, 5).map((txn: Transaction, idx: number) => (
            <div
              key={`${txn.area}-${idx}`}
              className="flex items-center justify-between text-[10px] px-2.5 py-1.5 bg-white/[0.02] border border-pcis-border/10 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <div>
                <span className="font-bold text-pcis-text">{txn.area}</span>
                <span className="text-pcis-text-muted/60 ml-2 text-[9px]">{txn.building}</span>
              </div>
              <span className="tabular-nums font-bold text-pcis-gold">{(txn.transactionValue / 1e6).toFixed(1)}M AED</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
