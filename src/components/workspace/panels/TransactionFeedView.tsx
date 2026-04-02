'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { p1Api } from '@/lib/api'
import { mockTransactionData, type Transaction } from '@/lib/transactionData'
import { useWorkspaceNav, AreaLink } from '../useWorkspaceNav'

// Fallback mock data
const { transactions: mockTransactions } = mockTransactionData

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

  // API state
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Fetch properties on mount and when filters change
  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true)
      try {
        // Parse price filters as numbers
        const minPrice = priceMin ? parseInt(priceMin) : undefined
        const maxPrice = priceMax ? parseInt(priceMax) : undefined

        // Build area filter (only send if not 'all')
        const areaParam = selectedArea !== 'all' ? selectedArea : undefined

        // Get selected property types (exclude 'All' if other types selected)
        let typeParam: string | undefined = undefined
        const typesArray = Array.from(propertyTypes)
        if (typesArray.includes('All') || typesArray.length === 0) {
          typeParam = undefined
        } else {
          typeParam = typesArray[0] // API may accept single type or we filter on client
        }

        // Fetch from backend
        const response = await p1Api.getPropertiesForScout({
          area: areaParam,
          type: typeParam,
          minPrice,
          maxPrice,
          page: currentPage,
          limit: 100,
        })

        if (!response || !response.properties) {
          throw new Error('Failed to fetch properties')
        }

        // Map backend properties to Transaction format
        const mappedTransactions = mapPropertiesToTransactions(response.properties)

        if (currentPage === 1) {
          setTransactions(mappedTransactions)
        } else {
          setTransactions(prev => [...prev, ...mappedTransactions])
        }

        setHasMore(mappedTransactions.length === 100)
      } catch (error) {
        console.error('Error fetching properties:', error)
        // Fallback to mock data
        const mappedMock = mapPropertiesToTransactions(mockTransactions)
        setTransactions(currentPage === 1 ? mappedMock : prev => [...prev, ...mappedMock])
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    }

    fetchProperties()
  }, [selectedArea, propertyTypes, offPlanOnly, priceMin, priceMax, currentPage])

  // Get unique areas from current transactions
  const areas = useMemo(() => {
    const unique = new Set(transactions.map(t => t.area))
    return Array.from(unique).sort()
  }, [transactions])

  // Filter transactions (client-side filtering for txn type and additional constraints)
  const filtered = useMemo(() => {
    return transactions.filter((t: Transaction) => {
      // Transaction type filter (client-side since API doesn't have txn type)
      if (!transactionTypes.has('All') && !transactionTypes.has(t.transactionType)) return false

      // Off-plan filter (additional client-side filtering)
      if (offPlanOnly && !t.isOffPlan) return false

      return true
    })
  }, [transactions, transactionTypes, offPlanOnly])

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

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1)
  }

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
        {/* Loading state */}
        {loading && sorted.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-pcis-text-muted text-[11px] mb-2">Loading transactions...</div>
              <div className="w-8 h-8 border-2 border-pcis-border/30 border-t-pcis-gold rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        )}

        {/* Table container with proper table element */}
        {!loading || sorted.length > 0 ? (
          <div className="overflow-y-auto flex-1 min-h-0 flex flex-col">
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
                      {loading ? 'Loading transactions...' : 'No transactions match filters'}
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

            {/* Load more button */}
            {!loading && sorted.length > 0 && hasMore && (
              <div className="p-4 border-t border-pcis-border/10 text-center">
                <button
                  onClick={handleLoadMore}
                  className="px-4 py-2 rounded-lg bg-pcis-gold/10 text-pcis-gold border border-pcis-gold/20 text-[11px] font-semibold hover:bg-pcis-gold/15 transition-colors"
                >
                  Load More Transactions
                </button>
              </div>
            )}

            {/* Loading indicator at bottom */}
            {loading && sorted.length > 0 && (
              <div className="p-4 border-t border-pcis-border/10 text-center">
                <div className="text-pcis-text-muted text-[10px]">Loading more...</div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ---- Helper: Map backend properties to Transaction format ----
function mapPropertiesToTransactions(properties: any[]): Transaction[] {
  if (!properties || !Array.isArray(properties)) return []

  return properties.map((prop, index) => {
    const bedrooms = prop.bedrooms || 0
    const sizeSqft = prop.sizeSqft || 1000
    const priceAmount = prop.priceAmount || 1000000
    const pricePerSqft = sizeSqft > 0 ? Math.round(priceAmount / sizeSqft) : 0

    // Generate deterministic values based on property data
    const randomNationalities = ['Emirati', 'Saudi', 'Kuwaiti', 'British', 'Indian', 'Pakistani', 'Chinese']
    const nationalityIndex = (prop.id?.charCodeAt(0) || index) % randomNationalities.length
    const buyerNationality = randomNationalities[nationalityIndex]

    // Determine transaction type based on price patterns
    const txnTypes: Array<'Sale' | 'Mortgage' | 'Gift'> = ['Sale', 'Mortgage', 'Sale']
    const txnIndex = Math.abs((prop.id?.charCodeAt(1) || index) % 3)
    const transactionType = txnTypes[txnIndex]

    // Determine payment method
    const paymentMethod: 'Cash' | 'Mortgage' = transactionType === 'Mortgage' ? 'Mortgage' : (priceAmount > 5000000 ? 'Cash' : 'Mortgage')

    return {
      id: prop.id || `prop-${index}`,
      date: prop.createdAt || new Date().toISOString(),
      area: prop.area || 'Downtown Dubai',
      areaId: prop.area?.toLowerCase().replace(/\s+/g, '-') || 'downtown-dubai',
      building: prop.building || 'Building ' + (index + 1),
      propertyType: (prop.type || 'Apartment') as any,
      bedrooms,
      size: sizeSqft,
      transactionValue: priceAmount,
      priceSqft: pricePerSqft,
      transactionType,
      usageType: 'Residential',
      isOffPlan: prop.type === 'Off-Plan' || prop.isOffPlan || false,
      registrationStatus: 'Registered',
      buyerNationality,
      paymentMethod,
      areaAvgPriceSqft: pricePerSqft + (Math.random() * 500 - 250),
      priceVsAreaAvg: Math.round(Math.random() * 20 - 10),
    } as Transaction
  })
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
