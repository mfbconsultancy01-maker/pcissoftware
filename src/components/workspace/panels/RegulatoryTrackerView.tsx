'use client'

import { useState, useMemo } from 'react'
import {
  regulatoryChanges,
  getRecentRegulations,
  getRegulationsByCategory,
  type RegulatoryChange
} from '@/lib/macroData'

type CategoryType = 'All' | 'Visa' | 'Tax' | 'Ownership' | 'Mortgage' | 'Rental' | 'Construction' | 'Licensing'
type ImpactFilterType = 'All' | 'Positive' | 'Negative' | 'Neutral'
type StatusFilterType = 'All' | 'Enacted' | 'Proposed' | 'Under Review' | 'Effective'

const CATEGORIES: CategoryType[] = ['All', 'Visa', 'Tax', 'Ownership', 'Mortgage', 'Rental', 'Construction', 'Licensing']
const IMPACT_FILTERS: ImpactFilterType[] = ['All', 'Positive', 'Negative', 'Neutral']
const STATUS_FILTERS: StatusFilterType[] = ['All', 'Enacted', 'Proposed', 'Under Review', 'Effective']

export default function RegulatoryTrackerView() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All')
  const [selectedImpact, setSelectedImpact] = useState<ImpactFilterType>('All')
  const [selectedStatus, setSelectedStatus] = useState<StatusFilterType>('All')

  // Filter and sort regulations
  const filteredRegulations = useMemo(() => {
    let filtered = [...regulatoryChanges]

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((r: RegulatoryChange) => r.category === selectedCategory.toLowerCase())
    }

    // Impact filter
    if (selectedImpact !== 'All') {
      filtered = filtered.filter((r: RegulatoryChange) => r.impact === selectedImpact.toLowerCase())
    }

    // Status filter
    if (selectedStatus !== 'All') {
      filtered = filtered.filter((r: RegulatoryChange) => r.status === selectedStatus.toLowerCase().replace(' ', '-'))
    }

    // Sort by date, most recent first
    return filtered.sort((a: RegulatoryChange, b: RegulatoryChange) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [selectedCategory, selectedImpact, selectedStatus])

  // Calculate counts
  const counts = useMemo(() => {
    const positive = regulatoryChanges.filter((r: RegulatoryChange) => r.impact === 'positive').length
    const negative = regulatoryChanges.filter((r: RegulatoryChange) => r.impact === 'negative').length
    const neutral = regulatoryChanges.filter((r: RegulatoryChange) => r.impact === 'neutral').length
    return { positive, negative, neutral }
  }, [])

  // Impact summary
  const impactSummary = useMemo(() => {
    const positiveChanges = regulatoryChanges
      .filter((r: RegulatoryChange) => r.impact === 'positive')
      .slice(0, 3)
      .map((r: RegulatoryChange) => r.title)

    const negativeChanges = regulatoryChanges
      .filter((r: RegulatoryChange) => r.impact === 'negative')
      .slice(0, 3)
      .map((r: RegulatoryChange) => r.title)

    const watchList = regulatoryChanges
      .filter((r: RegulatoryChange) => r.status === 'proposed' || r.status === 'under-review')
      .slice(0, 3)
      .map((r: RegulatoryChange) => r.title)

    return { positiveChanges, negativeChanges, watchList }
  }, [])

  // Get impact badge color
  const getImpactColor = (impact: string, impactLevel: string): string => {
    if (impact === 'positive') {
      if (impactLevel === 'high') return 'bg-emerald-400/10 text-emerald-400'
      if (impactLevel === 'medium') return 'bg-amber-400/10 text-amber-400'
      return 'bg-white/[0.06] text-white/60'
    } else if (impact === 'negative') {
      if (impactLevel === 'high') return 'bg-rose-400/10 text-rose-400'
      if (impactLevel === 'medium') return 'bg-amber-400/10 text-amber-400'
      return 'bg-white/[0.06] text-white/60'
    }
    return 'bg-white/[0.06] text-white/60'
  }

  // Get border color for timeline card
  const getBorderColor = (impact: string): string => {
    if (impact === 'positive') return 'border-l-2 border-emerald-400'
    if (impact === 'negative') return 'border-l-2 border-rose-400'
    return 'border-l-2 border-blue-400'
  }

  // Get category badge color
  const getCategoryBadgeColor = (category: string): string => {
    const colors: Record<string, string> = {
      'visa': 'bg-blue-400/10 text-blue-400',
      'tax': 'bg-purple-400/10 text-purple-400',
      'ownership': 'bg-indigo-400/10 text-indigo-400',
      'mortgage': 'bg-cyan-400/10 text-cyan-400',
      'rental': 'bg-teal-400/10 text-teal-400',
      'construction': 'bg-orange-400/10 text-orange-400',
      'licensing': 'bg-pink-400/10 text-pink-400'
    }
    return colors[category] || 'bg-white/[0.06] text-white/60'
  }

  // Get status badge color
  const getStatusBadgeColor = (status: string): string => {
    const colors: Record<string, string> = {
      'enacted': 'bg-green-400/10 text-green-400',
      'proposed': 'bg-yellow-400/10 text-yellow-400',
      'under-review': 'bg-amber-400/10 text-amber-400',
      'effective': 'bg-blue-400/10 text-blue-400'
    }
    return colors[status] || 'bg-white/[0.06] text-white/60'
  }

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white/[0.01] to-transparent">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.04]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white/90" style={{ fontFamily: "'Playfair Display', serif" }}>
              Regulatory Tracker
            </h2>
            <p className="text-sm text-white/70 mt-1">Dubai Real Estate Policy & Regulation Monitor</p>
          </div>
          <div className="flex gap-3">
            <div className="text-center">
              <div className="text-lg font-semibold text-emerald-400">{counts.positive}</div>
              <div className="text-[8px] text-white/40 uppercase tracking-wider">Positive</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-rose-400">{counts.negative}</div>
              <div className="text-[8px] text-white/40 uppercase tracking-wider">Negative</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-400">{counts.neutral}</div>
              <div className="text-[8px] text-white/40 uppercase tracking-wider">Neutral</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-6 py-4 border-b border-white/[0.04] space-y-4">
        {/* Category Filter */}
        <div>
          <p className="text-[8px] text-white/40 uppercase tracking-wider mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat: CategoryType) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#d4a574]/20 text-[#d4a574] border border-[#d4a574]/40'
                    : 'bg-white/[0.06] text-white/70 border border-white/[0.08] hover:bg-white/[0.1]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Impact Filter */}
        <div>
          <p className="text-[8px] text-white/40 uppercase tracking-wider mb-2">Impact</p>
          <div className="flex gap-2">
            {IMPACT_FILTERS.map((imp: ImpactFilterType) => (
              <button
                key={imp}
                onClick={() => setSelectedImpact(imp)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  selectedImpact === imp
                    ? 'bg-[#d4a574]/20 text-[#d4a574] border border-[#d4a574]/40'
                    : 'bg-white/[0.06] text-white/70 border border-white/[0.08] hover:bg-white/[0.1]'
                }`}
              >
                {imp}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <p className="text-[8px] text-white/40 uppercase tracking-wider mb-2">Status</p>
          <div className="flex gap-2">
            {STATUS_FILTERS.map((st: StatusFilterType) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  selectedStatus === st
                    ? 'bg-[#d4a574]/20 text-[#d4a574] border border-[#d4a574]/40'
                    : 'bg-white/[0.06] text-white/70 border border-white/[0.08] hover:bg-white/[0.1]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline View */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
        <div className="space-y-3">
          {filteredRegulations.length > 0 ? (
            filteredRegulations.map((regulation: RegulatoryChange) => (
              <div
                key={regulation.id}
                className={`bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 ${getBorderColor(regulation.impact)} transition-all hover:bg-white/[0.04]`}
              >
                {/* Header with Date, Category, Status */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60">{formatDate(regulation.date)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getCategoryBadgeColor(regulation.category)}`}>
                      {regulation.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadgeColor(regulation.status)}`}>
                      {regulation.status}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-white/90 font-semibold mb-2 text-sm">{regulation.title}</h3>

                {/* Description */}
                <p className="text-white/70 text-sm mb-3 line-clamp-3">{regulation.description}</p>

                {/* Authority */}
                <p className="text-[8px] text-white/40 uppercase tracking-wider mb-3">Authority: {regulation.authority}</p>

                {/* Divider */}
                <div className="border-t border-white/[0.04] my-3"></div>

                {/* Impact Section */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getImpactColor(regulation.impact, regulation.impactLevel)}`}>
                      {regulation.impact} — {regulation.impactLevel}
                    </span>
                  </div>
                  <p className="text-white/70 text-xs">{regulation.impactDescription}</p>
                </div>

                {/* Affected Segments */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {regulation.affectedSegments.map((segment: string) => (
                    <span
                      key={segment}
                      className="px-2.5 py-1 rounded-full text-xs bg-white/[0.06] text-white/70 border border-white/[0.08]"
                    >
                      {segment}
                    </span>
                  ))}
                </div>

                {/* Effective Date */}
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-white/40 uppercase tracking-wider">
                    Effective: {formatDate(regulation.effectiveDate)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-white/50 text-sm">No regulations match your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Impact Summary Footer */}
      <div className="px-6 py-4 border-t border-white/[0.04] bg-white/[0.01]">
        <div className="grid grid-cols-3 gap-4">
          {/* Positive Changes */}
          <div>
            <p className="text-[8px] text-white/40 uppercase tracking-wider mb-2">Positive Changes</p>
            <div className="text-lg font-semibold text-emerald-400 mb-2">{counts.positive}</div>
            <div className="space-y-1">
              {impactSummary.positiveChanges.map((title: string, idx: number) => (
                <p key={idx} className="text-xs text-white/70 truncate">
                  • {title}
                </p>
              ))}
            </div>
          </div>

          {/* Negative Changes */}
          <div>
            <p className="text-[8px] text-white/40 uppercase tracking-wider mb-2">Negative Changes</p>
            <div className="text-lg font-semibold text-rose-400 mb-2">{counts.negative}</div>
            <div className="space-y-1">
              {impactSummary.negativeChanges.map((title: string, idx: number) => (
                <p key={idx} className="text-xs text-white/70 truncate">
                  • {title}
                </p>
              ))}
            </div>
          </div>

          {/* Watch List */}
          <div>
            <p className="text-[8px] text-white/40 uppercase tracking-wider mb-2">Watch List</p>
            <div className="text-lg font-semibold text-amber-400 mb-2">
              {regulatoryChanges.filter((r: RegulatoryChange) => r.status === 'proposed' || r.status === 'under-review').length}
            </div>
            <div className="space-y-1">
              {impactSummary.watchList.map((title: string, idx: number) => (
                <p key={idx} className="text-xs text-white/70 truncate">
                  • {title}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
