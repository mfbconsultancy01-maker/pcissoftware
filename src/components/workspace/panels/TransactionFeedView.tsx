'use client'

import React, { useMemo, useState } from 'react'
import { mockTransactionData, type Transaction } from '@/lib/transactionData'
import { useWorkspaceNav, AreaLink } from '../useWorkspaceNav'

const { transactions } = mockTransactionData

// ============================================================================
// PCIS Live Transaction Feed — Workspace Panel
// ============================================================================
// Real-time Dubai transaction stream with terminal-density filtering and
// sortable columns. Context-linked to areas and detail panels.
// ============================================================================

type SortKey = 'date' | 'area' | 'building' | 'type' | 'beds' | 'size' | 'price' | 'sqft' | 'txnType' | 'plan' | 'buyer' | 'payment' | 'vsAvg'
type SortDir = 'asc' | 'desc'

export default function TransactionFeedView() {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Filters
  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [propertyTypes, setPropertyTypes] = useState<Set<string>>(new Set(['All']))
  const [transactionTypes, setTransactionTypes] = useState<Set<string>>(new Set(['All']))
  const [offPlanOnly, setOffPlanOnly] = useState(false)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')

  // Get unique areas
  const areas = useMemo(() => {
    const unique = new Set(transactions.map(t => t.area))
    return Array.from(unique).sort()
  }, [])

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter((t: Transaction) => {
      // Area filter
      if (selectedArea !== 'all' && t.area !== selectedArea) return false

      // Property type filter
      if (!propertyTypes.has('All') && !propertyTypes.has(t.propertyType)) return false

      // Transaction type filter
      if (!transactionTypes.has('All') && !transactionTypes.has(t.transactionType)) return false

      // Off-plan filter
      if (offPlanOnly && !t.isOffPlan) return false

      // Price range filter
      if (priceMin && t.transactionValue < parseInt(priceMin)) return false
      if (priceMax && t.transactionValue > parseInt(priceMax)) return false

      return true
    })
  }, [selectedArea, propertyTypes, transactionTypes, offPlanOnly, priceMin, priceMax])

  // Sort transactions
  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a: Transaction, b: Transaction) => {
      let aVal: string | number | boolean | undefined = a[sortKey as keyof Transaction]
      let bVal: string | number | boolean | undefined = b[sortKey as keyof Transaction]

      if (sortKey === 'sqft') {
        aVal = a.priceSqft
        bVal = b.priceSqft
      } else if (sortKey === 'beds') {
        aVal = a.bedrooms
        bVal = b.bedrooms
      } else if (sortKey === 'plan') {
        aVal = a.isOffPlan ? 'off' : 'ready'
        bVal = b.isOffPlan ? 'off' : 'ready'
      } else if (sortKey === 'vsAvg') {
        aVal = a.priceVsAreaAvg
        bVal = b.priceVsAreaAvg
      } else if (sortKey === 'txnType') {
        aVal = a.transactionType
        bVal = b.transactionType
      } else if (sortKey === 'payment') {
        aVal = a.paymentMethod
        bVal = b.paymentMethod
      }

      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()

      if (aVal !== undefined && bVal !== undefined) {
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      }
      return 0
    })
    return copy
  }, [filtered, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const togglePropertyType = (type: string) => {
    const updated = new Set(propertyTypes)
    if (type === 'All') {
      updated.clear()
      updated.add('All')
    } else {
      updated.delete('All')
      if (updated.has(type)) {
        updated.delete(type)
      } else {
        updated.add(type)
      }
      if (updated.size === 0) {
        updated.add('All')
      }
    }
    setPropertyTypes(updated)
  }

  const toggleTransactionType = (type: string) => {
    const updated = new Set(transactionTypes)
    if (type === 'All') {
      updated.clear()
      updated.add('All')
    } else {
      updated.delete('All')
      if (updated.has(type)) {
        updated.delete(type)
      } else {
        updated.add(type)
      }
      if (updated.size === 0) {
        updated.add('All')
      }
    }
    setTransactionTypes(updated)
  }

  const totalValue = sorted.reduce((sum, t) => sum + t.transactionValue, 0)
  const avgPriceSqft = sorted.length > 0 ? Math.round(sorted.reduce((sum, t) => sum + t.priceSqft, 0) / sorted.length) : 0
  const offPlanPct = sorted.length > 0 ? Math.round((sorted.filter(t => t.isOffPlan).length / sorted.length) * 100) : 0
  const cashPct = sorted.length > 0 ? Math.round((sorted.filter(t => t.paymentMethod === 'Cash').length / sorted.length) * 100) : 0

  return (
    <div className="h-full flex flex-col space-y-3">
      {/* ---- Header ---- */}
      <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-4">
        <h2 className="text-lg font-semibold text-pcis-text mb-3 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
          Live Transaction Feed
        </h2>
        <div className="grid grid-cols-5 gap-4">
          <div>
            <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1">Count</div>
            <div className="text-[13px] font-bold tabular-nums text-pcis-text">{sorted.length.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1">Total Value</div>
            <div className="text-[13px] font-bold tabular-nums text-pcis-gold">AED {(totalValue / 1e9).toFixed(2)}B</div>
          </div>
          <div>
            <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1">Avg Price/SQFT</div>
            <div className="text-[13px] font-bold tabular-nums text-pcis-text">{avgPriceSqft.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1">Off-Plan %</div>
            <div className="text-[13px] font-bold tabular-nums text-pcis-text">{offPlanPct}%</div>
          </div>
          <div>
            <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1">Cash %</div>
            <div className="text-[13px] font-bold tabular-nums text-pcis-text">{cashPct}%</div>
          </div>
        </div>
      </div>

      {/* ---- Filters ---- */}
      <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-3 space-y-2">
        {/* Area dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider min-w-fit font-semibold">Area</label>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="flex-1 bg-white/[0.03] border border-pcis-border/20 rounded-lg px-2 py-1.5 text-[11px] text-pcis-text placeholder-pcis-text-muted/40 outline-none focus:border-pcis-gold/30"
          >
            <option value="all">All</option>
            {areas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        {/* Property type pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold">Type</label>
          {['All', 'Villa', 'Apartment', 'Penthouse', 'Townhouse', 'Land'].map(type => (
            <button
              key={type}
              onClick={() => togglePropertyType(type)}
              className={`text-[11px] px-2 py-1 rounded-lg border transition-all font-semibold ${
                propertyTypes.has(type)
                  ? 'text-pcis-gold bg-pcis-gold/[0.08] border border-pcis-gold/20'
                  : 'text-pcis-text-muted border border-transparent hover:bg-white/[0.03]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Transaction type pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold">Txn Type</label>
          {['All', 'Sale', 'Mortgage', 'Gift'].map(type => (
            <button
              key={type}
              onClick={() => toggleTransactionType(type)}
              className={`text-[11px] px-2 py-1 rounded-lg border transition-all font-semibold ${
                transactionTypes.has(type)
                  ? 'text-pcis-gold bg-pcis-gold/[0.08] border border-pcis-gold/20'
                  : 'text-pcis-text-muted border border-transparent hover:bg-white/[0.03]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Off-plan toggle and price range */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={offPlanOnly}
              onChange={(e) => setOffPlanOnly(e.target.checked)}
              className="w-3 h-3 rounded border border-pcis-border/30"
            />
            <span className="text-pcis-text-muted">Off-Plan Only</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min AED"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="w-24 bg-white/[0.03] border border-pcis-border/20 rounded-lg px-2 py-1.5 text-[11px] text-pcis-text placeholder-pcis-text-muted/40 outline-none focus:border-pcis-gold/30"
            />
            <span className="text-pcis-text-muted text-[8px]">–</span>
            <input
              type="number"
              placeholder="Max AED"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="w-24 bg-white/[0.03] border border-pcis-border/20 rounded-lg px-2 py-1.5 text-[11px] text-pcis-text placeholder-pcis-text-muted/40 outline-none focus:border-pcis-gold/30"
            />
          </div>
        </div>
      </div>

      {/* ---- Table ---- */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white/[0.02] border border-pcis-border/20 rounded-xl">
        {/* Table container with proper table element */}
        <div className="overflow-y-auto flex-1 min-h-0">
          <table className="w-full border-collapse text-[10px]">
            <thead className="sticky top-0 bg-white/[0.01] border-b border-pcis-border/10">
              <tr>
                <th className="px-3 py-2 text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold border-r border-pcis-border/5">
                  <SortButton label="Date" sortKey="date" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold border-r border-pcis-border/5">
                  <SortButton label="Area" sortKey="area" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold border-r border-pcis-border/5">
                  <SortButton label="Building" sortKey="building" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold border-r border-pcis-border/5">
                  <SortButton label="Type" sortKey="type" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-center text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold border-r border-pcis-border/5">
                  <SortButton label="Beds" sortKey="beds" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold border-r border-pcis-border/5">
                  <SortButton label="Size (SQFT)" sortKey="size" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold border-r border-pcis-border/5">
                  <SortButton label="Price (AED)" sortKey="price" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold border-r border-pcis-border/5">
                  <SortButton label="AED/SQFT" sortKey="sqft" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold border-r border-pcis-border/5">
                  <SortButton label="Txn Type" sortKey="txnType" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold border-r border-pcis-border/5">
                  <SortButton label="Plan" sortKey="plan" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold border-r border-pcis-border/5">
                  <SortButton label="Buyer" sortKey="buyer" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold border-r border-pcis-border/5">
                  <SortButton label="Payment" sortKey="payment" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-3 py-2 text-right text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold">
                  <SortButton label="VS Avg %" sortKey="vsAvg" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-8 text-pcis-text-muted text-[10px]">
                    No transactions match filters
                  </td>
                </tr>
              ) : (
                sorted.map((txn) => (
                  <tr key={txn.id} className="border-b border-pcis-border/5 hover:bg-white/[0.02] transition-colors">
                    {/* Date */}
                    <td className="px-3 py-2 text-pcis-text border-r border-pcis-border/5">
                      {new Date(txn.date).toLocaleDateString('en-GB', { month: 'short', day: '2-digit' })}
                    </td>

                    {/* Area (clickable) */}
                    <td className="px-3 py-2 border-r border-pcis-border/5 truncate">
                      <AreaLink areaId={txn.areaId} className="text-pcis-text hover:text-pcis-gold">
                        {txn.area}
                      </AreaLink>
                    </td>

                    {/* Building */}
                    <td className="px-3 py-2 text-pcis-text-muted border-r border-pcis-border/5 truncate">{txn.building}</td>

                    {/* Type */}
                    <td className="px-3 py-2 text-pcis-text-muted border-r border-pcis-border/5">{txn.propertyType.slice(0, 3)}</td>

                    {/* Beds */}
                    <td className="px-3 py-2 text-center text-pcis-text border-r border-pcis-border/5">{txn.bedrooms}</td>

                    {/* Size */}
                    <td className="px-3 py-2 text-right text-pcis-text-muted border-r border-pcis-border/5 tabular-nums">{(txn.size / 1000).toFixed(1)}K</td>

                    {/* Price */}
                    <td className="px-3 py-2 text-right text-pcis-text border-r border-pcis-border/5 tabular-nums">
                      {(txn.transactionValue / 1e6).toFixed(1)}M
                    </td>

                    {/* Price/sqft */}
                    <td className="px-3 py-2 text-right text-pcis-text-muted border-r border-pcis-border/5 tabular-nums">
                      {txn.priceSqft.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>

                    {/* Txn Type */}
                    <td className="px-3 py-2 text-[8px] font-semibold border-r border-pcis-border/5" style={{
                      color: txn.transactionType === 'Sale' ? 'var(--pcis-text-muted)' :
                        txn.transactionType === 'Mortgage' ? '#60a5fa' : '#a78bfa'
                    }}>
                      {txn.transactionType.slice(0, 3).toUpperCase()}
                    </td>

                    {/* Plan badge */}
                    <td className="px-3 py-2 border-r border-pcis-border/5">
                      {txn.isOffPlan ? (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">OFF</span>
                      ) : (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">RDY</span>
                      )}
                    </td>

                    {/* Buyer nationality */}
                    <td className="px-3 py-2 text-pcis-text-muted border-r border-pcis-border/5 truncate">{txn.buyerNationality}</td>

                    {/* Payment */}
                    <td className="px-3 py-2 border-r border-pcis-border/5">
                      {txn.paymentMethod === 'Cash' ? (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">CASH</span>
                      ) : (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">MTG</span>
                      )}
                    </td>

                    {/* Vs Area Avg */}
                    <td className="px-3 py-2 text-right text-[11px] font-bold tabular-nums" style={{
                      color: txn.priceVsAreaAvg >= 0 ? '#22c55e' : '#ef4444'
                    }}>
                      {txn.priceVsAreaAvg > 0 ? '+' : ''}{txn.priceVsAreaAvg}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ---- Helper: Sortable Header Button ----
function SortButton({
  label,
  sortKey,
  currentSort,
  sortDir,
  onSort,
}: {
  label: string
  sortKey: SortKey
  currentSort: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
}) {
  const isActive = currentSort === sortKey
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`transition-colors ${
        isActive ? 'text-pcis-gold' : 'hover:text-pcis-text'
      }`}
    >
      {label} {isActive && (sortDir === 'asc' ? '↑' : '↓')}
    </button>
  )
}
