'use client'

import { useState, useMemo, useEffect } from 'react'
import { getMyListingsCached } from '@/lib/scoutDataCache'

// ── Types ────────────────────────────────────────────────────────────────

interface ScoutEnrichment {
  opportunityScore: number | null
  estimatedYield: number | null
  capitalAppreciation: number | null
  analysis: string | null
  priceVsAreaAvg: number | null
  areaAvgPricePerSqft: number | null
  areaDemandScore: number | null
  areaPropertyCount: number | null
}

interface PriceHistoryEntry {
  price: number
  date: string
  change: number | null
}

interface MyListing {
  id: string
  externalId: string
  title: string
  type: string
  status: string
  area: string | null
  address: string | null
  price: number
  currency: string
  pricePerSqft: number | null
  bedrooms: number | null
  bathrooms: number | null
  sizeSqft: number | null
  developer: string | null
  project: string | null
  building: string | null
  furnishing: string | null
  completionStatus: string | null
  images: string[]
  sourceUrl: string | null
  listedAt: string | null
  lastUpdated: string | null
  scout: ScoutEnrichment
  priceHistory: PriceHistoryEntry[]
}

interface ListingSummary {
  total: number
  showing: number
  totalValue: number
  avgPrice: number
  byType: Record<string, number>
  byArea: Record<string, number>
  withScoutScore: number
}

type SortKey = 'listedAt' | 'price' | 'area' | 'score' | 'priceVsAvg'

// ── Helpers ──────────────────────────────────────────────────────────────

function formatPrice(price: number, currency = 'AED'): string {
  if (price >= 1_000_000) return `${currency} ${(price / 1_000_000).toFixed(2)}M`
  if (price >= 1_000) return `${currency} ${(price / 1_000).toFixed(0)}K`
  return `${currency} ${price}`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-white/30'
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-amber-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

function getScoreBg(score: number | null): string {
  if (score === null) return 'bg-white/[0.03]'
  if (score >= 80) return 'bg-emerald-500/10'
  if (score >= 60) return 'bg-amber-500/10'
  if (score >= 40) return 'bg-orange-500/10'
  return 'bg-red-500/10'
}

function getPriceVsAvgColor(diff: number | null): string {
  if (diff === null) return 'text-white/30'
  if (diff < -10) return 'text-emerald-400'
  if (diff < 0) return 'text-emerald-300'
  if (diff < 10) return 'text-white/60'
  return 'text-red-400'
}

function getDemandLabel(score: number | null): { text: string; cls: string } {
  if (score === null) return { text: '—', cls: 'text-white/30' }
  if (score >= 75) return { text: 'HOT', cls: 'bg-red-500/20 text-red-300 border border-red-500/30' }
  if (score >= 50) return { text: 'WARM', cls: 'bg-orange-500/20 text-orange-300 border border-orange-500/30' }
  if (score >= 25) return { text: 'COOL', cls: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' }
  return { text: 'COLD', cls: 'bg-white/[0.05] text-white/40 border border-white/[0.08]' }
}

// ── Main Component ───────────────────────────────────────────────────────

export default function MyListingsView() {
  const [listings, setListings] = useState<MyListing[]>([])
  const [summary, setSummary] = useState<ListingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortKey>('listedAt')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterArea, setFilterArea] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    getMyListingsCached().then((result) => {
      if (cancelled) return
      if (result && Array.isArray(result.data)) {
        setListings(result.data)
        setSummary(result.summary || null)
      }
      setLoading(false)
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const areas = useMemo(() => {
    const set = new Set(listings.map(l => l.area).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [listings])

  const types = useMemo(() => {
    const set = new Set(listings.map(l => l.type).filter(Boolean))
    return Array.from(set).sort()
  }, [listings])

  const filtered = useMemo(() => {
    let result = [...listings]
    if (filterType !== 'all') result = result.filter(l => l.type === filterType)
    if (filterArea !== 'all') result = result.filter(l => l.area === filterArea)

    result.sort((a, b) => {
      switch (sortBy) {
        case 'price': return b.price - a.price
        case 'area': return (a.area || '').localeCompare(b.area || '')
        case 'score': return (b.scout.opportunityScore || 0) - (a.scout.opportunityScore || 0)
        case 'priceVsAvg': return (a.scout.priceVsAreaAvg || 999) - (b.scout.priceVsAreaAvg || 999)
        default: return new Date(b.listedAt || 0).getTime() - new Date(a.listedAt || 0).getTime()
      }
    })
    return result
  }, [listings, filterType, filterArea, sortBy])

  const avgScore = useMemo(() => {
    const scored = filtered.filter(l => l.scout.opportunityScore !== null)
    if (scored.length === 0) return null
    return Math.round(scored.reduce((s, l) => s + (l.scout.opportunityScore || 0), 0) / scored.length)
  }, [filtered])

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <div>
          <h2 className="text-lg font-semibold text-pcis-text tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}>
            My Listings
          </h2>
          <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
            Broker Inventory · {filtered.length} Active
          </p>
        </div>
        <div className="flex items-center gap-5">
          {summary && summary.totalValue > 0 && (
            <div className="text-right">
              <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block">Portfolio</span>
              <span className="text-[11px] font-bold tabular-nums text-pcis-gold">
                {formatPrice(summary.totalValue)}
              </span>
            </div>
          )}
          {avgScore !== null && (
            <div className="text-right">
              <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block">Avg Score</span>
              <span className={`text-[11px] font-bold tabular-nums ${getScoreColor(avgScore)}`}>
                {avgScore}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Filter / Sort Bar ── */}
      <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 space-y-2">
        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider w-10">Sort</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
            className="px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded bg-white/[0.02] border border-white/[0.04] text-white/90 hover:bg-white/[0.04] transition-all focus:outline-none focus:border-pcis-gold/50">
            <option value="listedAt">Newest</option>
            <option value="price">Price</option>
            <option value="score">SCOUT Score</option>
            <option value="priceVsAvg">Best Deal</option>
            <option value="area">Area A-Z</option>
          </select>
        </div>

        {/* Type filter */}
        {types.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider w-10">Type</span>
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all ${
                  filterType === 'all'
                    ? 'bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/50'
                    : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
                }`}>All</button>
              {types.map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all ${
                    filterType === t
                      ? 'bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/50'
                      : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
                  }`}>{t}</button>
              ))}
            </div>
          </div>
        )}

        {/* Area filter */}
        {areas.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider w-10">Area</span>
            <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
              className="px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded bg-white/[0.02] border border-white/[0.04] text-white/90 hover:bg-white/[0.04] transition-all focus:outline-none focus:border-pcis-gold/50">
              <option value="all">All Areas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto min-h-0 py-3">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-5 h-5 border-2 border-pcis-gold/30 border-t-pcis-gold rounded-full animate-spin mx-auto" />
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Loading listings...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2 max-w-xs">
              <div className="w-10 h-10 mx-auto rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <span className="text-white/20 text-lg">◇</span>
              </div>
              <p className="text-[11px] text-white/50 font-medium">
                {listings.length === 0
                  ? 'No listings scraped yet'
                  : 'No listings match filters'}
              </p>
              <p className="text-[9px] text-white/30 leading-relaxed">
                {listings.length === 0
                  ? 'Configure listing URLs in Command Center. SCOUT syncs daily at 06:30 Dubai time.'
                  : 'Adjust filters above to see more results.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pr-2">
            {filtered.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer: Distribution ── */}
      {summary && summary.byArea && Object.keys(summary.byArea).length > 1 && (
        <div className="flex-shrink-0 pt-2 border-t border-pcis-border/10">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[7px] text-white/30 uppercase tracking-wider shrink-0">Areas</span>
            {Object.entries(summary.byArea)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([area, count]) => (
                <span key={area} className="text-[8px] text-white/50 bg-white/[0.03] px-2 py-0.5 rounded shrink-0">
                  {area} <span className="text-white/30">{count}</span>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Listing Card ─────────────────────────────────────────────────────────

function ListingCard({ listing }: { listing: MyListing }) {
  const demand = getDemandLabel(listing.scout.areaDemandScore)
  const score = listing.scout.opportunityScore

  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 space-y-2.5 group hover:border-white/[0.08] transition-all">
      {/* Top: Type badge + Score */}
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0 mr-2">
          <p className="text-[10px] font-semibold text-white/90 leading-tight line-clamp-2">
            {listing.title}
          </p>
          <p className="text-[8px] text-white/60">
            <span className="text-pcis-gold">{listing.area || 'Unknown'}</span>
            {' '}· {listing.type}
            {listing.bedrooms !== null && ` · ${listing.bedrooms} BR`}
          </p>
        </div>
        {score !== null && (
          <div className={`text-center px-2 py-1 rounded ${getScoreBg(score)}`}>
            <span className="text-[7px] text-white/40 uppercase tracking-wider block">Score</span>
            <span className={`text-[13px] font-bold tabular-nums ${getScoreColor(score)}`}>
              {score}
            </span>
          </div>
        )}
      </div>

      {/* Price */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-baseline">
          <span className="text-[8px] text-white/40 uppercase tracking-wider">Asking</span>
          <span className="text-[11px] font-bold text-pcis-gold tabular-nums">
            {formatPrice(listing.price, listing.currency)}
          </span>
        </div>
        {listing.pricePerSqft && (
          <div className="flex justify-between items-baseline">
            <span className="text-[8px] text-white/40 uppercase tracking-wider">PSF</span>
            <span className="text-[9px] font-semibold text-white/80 tabular-nums">
              {listing.currency} {listing.pricePerSqft.toLocaleString()}
            </span>
          </div>
        )}

        {/* Price bar (visual relative to area avg) */}
        {listing.scout.priceVsAreaAvg !== null && (
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className={`h-full ${listing.scout.priceVsAreaAvg < 0 ? 'bg-emerald-500/50' : 'bg-red-500/40'}`}
              style={{ width: `${Math.min(100, Math.max(10, 50 + listing.scout.priceVsAreaAvg))}%` }}
            />
          </div>
        )}
      </div>

      {/* SCOUT Intelligence Row */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <span className="text-[7px] text-white/30 uppercase tracking-wider block">vs Area</span>
          <span className={`text-[9px] font-bold tabular-nums ${getPriceVsAvgColor(listing.scout.priceVsAreaAvg)}`}>
            {listing.scout.priceVsAreaAvg !== null ? `${listing.scout.priceVsAreaAvg > 0 ? '+' : ''}${listing.scout.priceVsAreaAvg}%` : '—'}
          </span>
        </div>
        <div>
          <span className="text-[7px] text-white/30 uppercase tracking-wider block">Yield</span>
          <span className="text-[9px] font-semibold text-white/70 tabular-nums">
            {listing.scout.estimatedYield !== null ? `${listing.scout.estimatedYield.toFixed(1)}%` : '—'}
          </span>
        </div>
        <div>
          <span className="text-[7px] text-white/30 uppercase tracking-wider block">Demand</span>
          {listing.scout.areaDemandScore !== null ? (
            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${demand.cls}`}>
              {demand.text}
            </span>
          ) : (
            <span className="text-[9px] text-white/30">—</span>
          )}
        </div>
      </div>

      {/* Specs + meta */}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
        <div className="flex gap-2 text-[8px] text-white/40">
          {listing.sizeSqft && <span>{listing.sizeSqft.toLocaleString()} sqft</span>}
          {listing.furnishing && <span>{listing.furnishing}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-white/30 tabular-nums">{formatDate(listing.listedAt)}</span>
          {listing.sourceUrl && (
            <a href={listing.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="text-[7px] text-pcis-gold/50 hover:text-pcis-gold transition-colors uppercase tracking-wider">
              Source
            </a>
          )}
        </div>
      </div>

      {/* Price history changes */}
      {listing.priceHistory.length > 1 && listing.priceHistory.some(p => p.change && p.change !== 0) && (
        <div className="flex items-center gap-1">
          <span className="text-[7px] text-white/20 uppercase tracking-wider">Price Δ</span>
          {listing.priceHistory.slice(0, 3).filter(p => p.change && p.change !== 0).map((ph, i) => (
            <span key={i} className={`text-[8px] tabular-nums font-medium ${(ph.change || 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(ph.change || 0) > 0 ? '+' : ''}{(ph.change || 0).toFixed(1)}%
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
