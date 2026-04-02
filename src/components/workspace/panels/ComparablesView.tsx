'use client'

import React, { useState, useMemo } from 'react'
import { comparables, buildingPrices, type Comparable, type BuildingPrice } from '@/lib/priceData'
import { areas, type AreaProfile } from '@/lib/marketData'
import { useWorkspaceNav, AreaLink } from '../useWorkspaceNav'

type PropertyType = 'All' | 'Apartment' | 'Villa' | 'Penthouse' | 'Townhouse'
type Condition = 'All' | 'New' | 'Renovated' | 'Original'
type DateRange = '30d' | '90d' | '6m' | '12m'

interface FilterState {
  area: string
  building: string
  propertyType: PropertyType
  bedrooms: string
  minSize: string
  maxSize: string
  minPrice: string
  maxPrice: string
  condition: Condition
  dateRange: DateRange
}

interface ExpandedComp {
  id: string
  expanded: boolean
}

const PROPERTY_TYPES: PropertyType[] = ['All', 'Apartment', 'Villa', 'Penthouse', 'Townhouse']
const BEDROOM_OPTIONS = ['All', 'Studio', '1BR', '2BR', '3BR', '4BR', '5BR+']
const CONDITIONS: Condition[] = ['All', 'New', 'Renovated', 'Original']
const DATE_RANGES: DateRange[] = ['30d', '90d', '6m', '12m']

const DATE_RANGE_DAYS: Record<DateRange, number> = {
  '30d': 30,
  '90d': 90,
  '6m': 180,
  '12m': 365,
}

function parseBedrooms(bedroomValue: string): number | null {
  if (bedroomValue === 'All') return null
  if (bedroomValue === 'Studio') return 0
  const match = bedroomValue.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

function parseBedroomRange(bedroomValue: string): { min: number; max: number } | null {
  if (bedroomValue === 'All') return null
  if (bedroomValue === 'Studio') return { min: 0, max: 0 }
  if (bedroomValue === '5BR+') return { min: 5, max: 100 }
  const match = bedroomValue.match(/(\d+)/)
  if (match) {
    const num = parseInt(match[1], 10)
    return { min: num, max: num }
  }
  return null
}

function getDateThreshold(dateRange: DateRange): Date {
  const now = new Date()
  const days = DATE_RANGE_DAYS[dateRange]
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

function formatAED(value: number): string {
  return `AED ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export default function ComparablesView() {
  const nav = useWorkspaceNav()
  const [filters, setFilters] = useState<FilterState>({
    area: '',
    building: '',
    propertyType: 'All',
    bedrooms: 'All',
    minSize: '',
    maxSize: '',
    minPrice: '',
    maxPrice: '',
    condition: 'All',
    dateRange: '12m',
  })
  const [expandedComps, setExpandedComps] = useState<Map<string, boolean>>(new Map())
  const [sortKey, setSortKey] = useState<keyof Comparable>('date')
  const [sortDesc, setSortDesc] = useState(true)

  // Get unique areas
  const areaOptions = useMemo(
    () => Array.from(new Set(comparables.map(c => c.area))).sort(),
    []
  )

  // Get buildings for selected area
  const buildingOptions = useMemo(() => {
    if (!filters.area) return []
    return Array.from(
      new Set(
        comparables
          .filter(c => c.area === filters.area)
          .map(c => c.building)
      )
    ).sort()
  }, [filters.area])

  // Filter comparables
  const filtered = useMemo(() => {
    const threshold = getDateThreshold(filters.dateRange)

    return comparables.filter(comp => {
      // Area filter
      if (filters.area && comp.area !== filters.area) return false

      // Building filter
      if (filters.building && comp.building !== filters.building) return false

      // Property type filter
      if (filters.propertyType !== 'All' && comp.propertyType !== filters.propertyType) {
        return false
      }

      // Bedrooms filter
      const bedroomRange = parseBedroomRange(filters.bedrooms)
      if (bedroomRange) {
        if (comp.bedrooms < bedroomRange.min || comp.bedrooms > bedroomRange.max) {
          return false
        }
      }

      // Size range filter
      if (filters.minSize) {
        const min = parseInt(filters.minSize, 10)
        if (comp.size < min) return false
      }
      if (filters.maxSize) {
        const max = parseInt(filters.maxSize, 10)
        if (comp.size > max) return false
      }

      // Price range filter
      if (filters.minPrice) {
        const min = parseInt(filters.minPrice, 10)
        if (comp.price < min) return false
      }
      if (filters.maxPrice) {
        const max = parseInt(filters.maxPrice, 10)
        if (comp.price > max) return false
      }

      // Condition filter
      if (filters.condition !== 'All' && comp.condition !== filters.condition) {
        return false
      }

      // Date range filter
      const compDate = new Date(comp.date)
      if (compDate < threshold) return false

      return true
    })
  }, [filters])

  // Calculate summary stats
  const stats = useMemo(() => {
    if (filtered.length === 0) {
      return {
        count: 0,
        avgPriceSqft: 0,
        median: 0,
        min: 0,
        max: 0,
        avgDOM: 0,
        avgVsArea: 0,
      }
    }

    const prices = filtered.map(c => c.priceSqft).sort((a, b) => a - b)
    const medianIdx = Math.floor(prices.length / 2)
    const median = prices.length % 2 === 0
      ? (prices[medianIdx - 1] + prices[medianIdx]) / 2
      : prices[medianIdx]

    const avgPriceSqft = filtered.reduce((sum, c) => sum + c.priceSqft, 0) / filtered.length
    const avgDOM = filtered.reduce((sum, c) => sum + c.daysOnMarket, 0) / filtered.length
    const avgVsArea = filtered.reduce((sum, c) => sum + c.vsAreaAvg, 0) / filtered.length

    return {
      count: filtered.length,
      avgPriceSqft,
      median,
      min: Math.min(...prices),
      max: Math.max(...prices),
      avgDOM: Math.round(avgDOM),
      avgVsArea,
    }
  }, [filtered])

  // Confidence assessment
  const confidence = useMemo(() => {
    if (stats.count >= 10) return 'High'
    if (stats.count >= 5) return 'Medium'
    return 'Low'
  }, [stats.count])

  // Sort comparables
  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal)
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDesc ? bVal - aVal : aVal - bVal
      }
      return 0
    })
    return copy
  }, [filtered, sortKey, sortDesc])

  const handleSort = (key: keyof Comparable) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc)
    } else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  const toggleExpanded = (id: string) => {
    const newMap = new Map(expandedComps)
    newMap.set(id, !newMap.get(id))
    setExpandedComps(newMap)
  }

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => {
      const updated = { ...prev, [key]: value }
      // Reset building if area changes
      if (key === 'area') {
        updated.building = ''
      }
      return updated
    })
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white/[0.02] to-transparent">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/[0.04]">
        <h2 className="text-lg font-serif text-white/90" style={{ fontFamily: "'Playfair Display', serif" }}>
          Comparables Engine
        </h2>
        <p className="text-[10px] text-white/70 mt-0.5">Transaction-based valuation analysis</p>
      </div>

      {/* Filters */}
      <div className="px-4 py-4 border-b border-white/[0.04] overflow-y-auto flex-shrink-0">
        {/* Area and Building */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[8px] text-white/40 uppercase tracking-wide mb-1.5">Area</label>
            <select
              value={filters.area}
              onChange={e => handleFilterChange('area', e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.04] rounded text-[10px] text-white/90 px-2 py-1.5 focus:outline-none focus:border-[#d4a574]/30"
            >
              <option value="">All Areas</option>
              {areaOptions.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[8px] text-white/40 uppercase tracking-wide mb-1.5">Building</label>
            <select
              value={filters.building}
              onChange={e => handleFilterChange('building', e.target.value)}
              disabled={!filters.area}
              className="w-full bg-white/[0.04] border border-white/[0.04] rounded text-[10px] text-white/90 px-2 py-1.5 focus:outline-none focus:border-[#d4a574]/30 disabled:opacity-50"
            >
              <option value="">All Buildings</option>
              {buildingOptions.map(building => (
                <option key={building} value={building}>{building}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Property Type */}
        <div className="mb-4">
          <label className="block text-[8px] text-white/40 uppercase tracking-wide mb-2">Property Type</label>
          <div className="flex flex-wrap gap-2">
            {PROPERTY_TYPES.map(type => (
              <button
                key={type}
                onClick={() => handleFilterChange('propertyType', type)}
                className={`px-2.5 py-1 rounded text-[9px] font-medium transition-all ${
                  filters.propertyType === type
                    ? 'bg-[#d4a574]/[0.08] border border-[#d4a574]/20 text-[#d4a574]'
                    : 'bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.06]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Bedrooms */}
        <div className="mb-4">
          <label className="block text-[8px] text-white/40 uppercase tracking-wide mb-2">Bedrooms</label>
          <div className="flex flex-wrap gap-2">
            {BEDROOM_OPTIONS.map(option => (
              <button
                key={option}
                onClick={() => handleFilterChange('bedrooms', option)}
                className={`px-2.5 py-1 rounded text-[9px] font-medium transition-all ${
                  filters.bedrooms === option
                    ? 'bg-[#d4a574]/[0.08] border border-[#d4a574]/20 text-[#d4a574]'
                    : 'bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.06]'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Size Range */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[8px] text-white/40 uppercase tracking-wide mb-1.5">Min Size (sqft)</label>
            <input
              type="number"
              value={filters.minSize}
              onChange={e => handleFilterChange('minSize', e.target.value)}
              placeholder="0"
              className="w-full bg-white/[0.04] border border-white/[0.04] rounded text-[10px] text-white/90 px-2 py-1.5 focus:outline-none focus:border-[#d4a574]/30"
            />
          </div>
          <div>
            <label className="block text-[8px] text-white/40 uppercase tracking-wide mb-1.5">Max Size (sqft)</label>
            <input
              type="number"
              value={filters.maxSize}
              onChange={e => handleFilterChange('maxSize', e.target.value)}
              placeholder="∞"
              className="w-full bg-white/[0.04] border border-white/[0.04] rounded text-[10px] text-white/90 px-2 py-1.5 focus:outline-none focus:border-[#d4a574]/30"
            />
          </div>
        </div>

        {/* Price Range */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[8px] text-white/40 uppercase tracking-wide mb-1.5">Min Price (AED)</label>
            <input
              type="number"
              value={filters.minPrice}
              onChange={e => handleFilterChange('minPrice', e.target.value)}
              placeholder="0"
              className="w-full bg-white/[0.04] border border-white/[0.04] rounded text-[10px] text-white/90 px-2 py-1.5 focus:outline-none focus:border-[#d4a574]/30"
            />
          </div>
          <div>
            <label className="block text-[8px] text-white/40 uppercase tracking-wide mb-1.5">Max Price (AED)</label>
            <input
              type="number"
              value={filters.maxPrice}
              onChange={e => handleFilterChange('maxPrice', e.target.value)}
              placeholder="∞"
              className="w-full bg-white/[0.04] border border-white/[0.04] rounded text-[10px] text-white/90 px-2 py-1.5 focus:outline-none focus:border-[#d4a574]/30"
            />
          </div>
        </div>

        {/* Condition */}
        <div className="mb-4">
          <label className="block text-[8px] text-white/40 uppercase tracking-wide mb-2">Condition</label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map(cond => (
              <button
                key={cond}
                onClick={() => handleFilterChange('condition', cond)}
                className={`px-2.5 py-1 rounded text-[9px] font-medium transition-all ${
                  filters.condition === cond
                    ? 'bg-[#d4a574]/[0.08] border border-[#d4a574]/20 text-[#d4a574]'
                    : 'bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.06]'
                }`}
              >
                {cond}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-[8px] text-white/40 uppercase tracking-wide mb-2">Time Period</label>
          <div className="flex flex-wrap gap-2">
            {DATE_RANGES.map(range => (
              <button
                key={range}
                onClick={() => handleFilterChange('dateRange', range)}
                className={`px-2.5 py-1 rounded text-[9px] font-medium transition-all ${
                  filters.dateRange === range
                    ? 'bg-[#d4a574]/[0.08] border border-[#d4a574]/20 text-[#d4a574]'
                    : 'bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.06]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Count Badge and Summary Stats */}
        <div className="px-4 py-3 border-b border-white/[0.04] flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-block bg-[#d4a574]/[0.12] border border-[#d4a574]/20 text-[#d4a574] px-2.5 py-1 rounded text-[9px] font-semibold">
              {stats.count} comparable transactions found
            </span>
          </div>

          {/* Summary Stats Bar */}
          {stats.count > 0 && (
            <div className="grid grid-cols-2 gap-3 text-[9px]">
              <div>
                <div className="text-white/40 uppercase tracking-wide">Avg Price/sqft</div>
                <div className="text-white/90 font-semibold mt-0.5">{formatAED(Math.round(stats.avgPriceSqft))}</div>
              </div>
              <div>
                <div className="text-white/40 uppercase tracking-wide">Median</div>
                <div className="text-white/90 font-semibold mt-0.5">{formatAED(Math.round(stats.median))}</div>
              </div>
              <div>
                <div className="text-white/40 uppercase tracking-wide">Price Range</div>
                <div className="text-white/90 font-semibold mt-0.5">
                  {formatAED(Math.round(stats.min))} – {formatAED(Math.round(stats.max))}
                </div>
              </div>
              <div>
                <div className="text-white/40 uppercase tracking-wide">Avg DOM</div>
                <div className="text-white/90 font-semibold mt-0.5">{stats.avgDOM} days</div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        {stats.count > 0 ? (
          <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full text-[9px] border-collapse">
              <thead className="sticky top-0 bg-white/[0.02] border-b border-white/[0.04]">
                <tr>
                  {[
                    { key: 'date' as const, label: 'Date', width: 'w-16' },
                    { key: 'building' as const, label: 'Building', width: 'flex-1' },
                    { key: 'area' as const, label: 'Area', width: 'w-24' },
                    { key: 'propertyType' as const, label: 'Type', width: 'w-20' },
                    { key: 'bedrooms' as const, label: 'Beds', width: 'w-12' },
                    { key: 'size' as const, label: 'Size (sqft)', width: 'w-20' },
                    { key: 'price' as const, label: 'Price (AED)', width: 'w-28' },
                    { key: 'priceSqft' as const, label: 'AED/sqft', width: 'w-20' },
                    { key: 'floor' as const, label: 'Floor', width: 'w-14' },
                    { key: 'hasView' as const, label: 'View', width: 'w-12' },
                    { key: 'condition' as const, label: 'Condition', width: 'w-20' },
                    { key: 'daysOnMarket' as const, label: 'DOM', width: 'w-12' },
                    { key: 'vsAreaAvg' as const, label: 'vs Area', width: 'w-20' },
                    { key: 'vsBuildingAvg' as const, label: 'vs Bldg', width: 'w-20' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`${col.width} px-2 py-2 text-left text-white/40 uppercase tracking-wide font-semibold border-b border-white/[0.04] cursor-pointer hover:text-white/60 transition-colors`}
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span className="ml-1">{sortDesc ? '▼' : '▲'}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(comp => {
                  const isExpanded = expandedComps.get(comp.id)
                  const vsAreaColor = comp.vsAreaAvg > 10 ? 'text-red-400' : comp.vsAreaAvg < -10 ? 'text-green-400' : 'text-white/70'
                  const vsBldgColor = comp.vsBuildingAvg > 10 ? 'text-red-400' : comp.vsBuildingAvg < -10 ? 'text-green-400' : 'text-white/70'

                  return (
                    <React.Fragment key={comp.id}>
                      <tr
                        onClick={() => toggleExpanded(comp.id)}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        <td className="px-2 py-2 text-white/70 font-mono">
                          {new Date(comp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                        </td>
                        <td className="px-2 py-2 text-white/90">{comp.building}</td>
                        <td className="px-2 py-2 text-white/90">
                          <AreaLink areaId={comp.areaId}>{comp.area}</AreaLink>
                        </td>
                        <td className="px-2 py-2 text-white/70">{comp.propertyType}</td>
                        <td className="px-2 py-2 text-white/70 text-center">
                          {comp.bedrooms === 0 ? 'S' : comp.bedrooms}
                        </td>
                        <td className="px-2 py-2 text-white/70 text-right font-mono">
                          {comp.size.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-white/90 text-right font-mono">
                          {comp.price.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-white/70 text-right font-mono">
                          {comp.priceSqft.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-2 py-2 text-white/70 text-center">
                          {comp.floor ?? '—'}
                        </td>
                        <td className="px-2 py-2 text-white/70 text-center">
                          {comp.hasView ? '✓' : '—'}
                        </td>
                        <td className="px-2 py-2 text-white/70">{comp.condition}</td>
                        <td className="px-2 py-2 text-white/70 text-center">{comp.daysOnMarket}</td>
                        <td className={`px-2 py-2 text-right font-mono ${vsAreaColor}`}>
                          {formatPercent(comp.vsAreaAvg)}
                        </td>
                        <td className={`px-2 py-2 text-right font-mono ${vsBldgColor}`}>
                          {formatPercent(comp.vsBuildingAvg)}
                        </td>
                      </tr>
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/40 text-[10px]">No comparables match your filters</p>
          </div>
        )}

        {/* Valuation Summary Box */}
        {stats.count > 0 && (
          <div className="px-4 py-4 border-t border-white/[0.04] flex-shrink-0 bg-white/[0.02]">
            <div className="text-[9px] text-white/70 mb-2">
              Based on <span className="text-[#d4a574] font-semibold">{stats.count} comps</span>:
            </div>
            <div className="grid grid-cols-3 gap-4 text-[10px]">
              <div>
                <div className="text-white/40 uppercase tracking-wide mb-1">Fair Value Range</div>
                <div className="text-white/90 font-semibold">
                  {formatAED(Math.round(stats.min))} – {formatAED(Math.round(stats.max))}/sqft
                </div>
              </div>
              <div>
                <div className="text-white/40 uppercase tracking-wide mb-1">Median Transaction</div>
                <div className="text-white/90 font-semibold">
                  {formatAED(Math.round(stats.median))}/sqft
                </div>
              </div>
              <div>
                <div className="text-white/40 uppercase tracking-wide mb-1">Confidence</div>
                <div className={`font-semibold ${
                  confidence === 'High' ? 'text-green-400' : confidence === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {confidence}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
