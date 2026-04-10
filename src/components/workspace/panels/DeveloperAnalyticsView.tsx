'use client'
import React, { useState, useMemo } from 'react'
import { developers, offPlanProjects, type Developer, type OffPlanProject } from '@/lib/offPlanData'
import { useWorkspace } from '../WorkspaceProvider'

type SortField = 'name' | 'reraRating' | 'projectsDelivered' | 'activeProjects' | 'unitsDelivered' | 'onTimePercentage' | 'quality' | 'avgPriceSqft' | 'marketShare' | 'financialStability'
type SortDirection = 'asc' | 'desc'

// Helper function to render star rating
function renderStarRating(rating: number): string {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  let stars = '★'.repeat(fullStars)
  if (hasHalfStar) stars += '★'
  stars += '☆'.repeat(5 - Math.ceil(rating))
  return stars
}

// Horizontal bar chart component
function HBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-pcis-border/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <span className="text-[10px] text-pcis-text-muted tabular-nums w-8 text-right">{value.toFixed(0)}</span>
    </div>
  )
}

// RERA Rating Badge
function ReraBadge({ rating }: { rating: string }) {
  const colorMap: Record<string, string> = {
    'A+': 'text-pcis-gold',
    'A': 'text-emerald-400',
    'B+': 'text-blue-400',
    'B': 'text-pcis-text-muted'
  }
  const bgMap: Record<string, string> = {
    'A+': 'bg-pcis-border/15',
    'A': 'bg-emerald-500/10',
    'B+': 'bg-blue-500/10',
    'B': 'bg-pcis-border/10'
  }

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${bgMap[rating]} ${colorMap[rating]} font-medium`}>
      {rating}
    </span>
  )
}

// Financial Stability Badge
function StabilityBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    'Strong': 'text-emerald-400 bg-emerald-500/10',
    'Stable': 'text-blue-400 bg-blue-500/10',
    'Caution': 'text-amber-400 bg-amber-500/10'
  }

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colorMap[status]} font-medium`}>
      {status}
    </span>
  )
}

// Trend indicator
function TrendIndicator({ trend }: { trend: 'growing' | 'stable' | 'declining' }) {
  if (trend === 'growing') {
    return <span className="text-emerald-400">▲</span>
  } else if (trend === 'declining') {
    return <span className="text-red-400">▼</span>
  } else {
    return <span className="text-pcis-text-muted/50">—</span>
  }
}

export default function DeveloperAnalyticsView() {
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('marketShare')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Calculate header stats
  const headerStats = useMemo(() => {
    const totalDevelopers = developers.length
    const activeDeveloperProjects = new Set(offPlanProjects.map((p: OffPlanProject) => p.developerId)).size

    const avgOnTime = developers.reduce((sum: number, d: Developer) => sum + (d.onTimeDeliveryPct || 0), 0) / totalDevelopers
    const avgQuality = developers.reduce((sum: number, d: Developer) => sum + (d.qualityRating || 0), 0) / totalDevelopers

    return {
      totalDevelopers,
      activeDeveloperProjects,
      avgOnTime: avgOnTime.toFixed(1),
      avgQuality: avgQuality.toFixed(1)
    }
  }, [])

  // Sort and filter developers
  const sortedDevelopers = useMemo(() => {
    const sorted = [...developers].sort((a: Developer, b: Developer) => {
      let aVal: string | number = 0
      let bVal: string | number = 0

      switch (sortField) {
        case 'name':
          aVal = a.name
          bVal = b.name
          break
        case 'reraRating':
          const ratingOrder: Record<string, number> = { 'A+': 4, 'A': 3, 'B+': 2, 'B': 1 }
          aVal = ratingOrder[a.reraRating] || 0
          bVal = ratingOrder[b.reraRating] || 0
          break
        case 'projectsDelivered':
          aVal = a.totalProjectsDelivered || 0
          bVal = b.totalProjectsDelivered || 0
          break
        case 'activeProjects':
          aVal = offPlanProjects.filter((p: OffPlanProject) => p.developerId === a.id).length
          bVal = offPlanProjects.filter((p: OffPlanProject) => p.developerId === b.id).length
          break
        case 'unitsDelivered':
          aVal = a.totalUnitsDelivered || 0
          bVal = b.totalUnitsDelivered || 0
          break
        case 'onTimePercentage':
          aVal = a.onTimeDeliveryPct || 0
          bVal = b.onTimeDeliveryPct || 0
          break
        case 'quality':
          aVal = a.qualityRating || 0
          bVal = b.qualityRating || 0
          break
        case 'avgPriceSqft':
          aVal = a.avgPriceSqft || 0
          bVal = b.avgPriceSqft || 0
          break
        case 'marketShare':
          aVal = a.marketSharePct || 0
          bVal = b.marketSharePct || 0
          break
        case 'financialStability':
          const stabMap: Record<string, number> = { 'Strong': 3, 'Stable': 2, 'Caution': 1 }
          aVal = stabMap[a.financialStability] || 0
          bVal = stabMap[b.financialStability] || 0
          break
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })

    return sorted
  }, [sortField, sortDirection])

  const selectedDeveloper = useMemo(() => {
    return developers.find((d: Developer) => d.id === selectedDeveloperId) || null
  }, [selectedDeveloperId])

  const selectedDeveloperProjects = useMemo(() => {
    if (!selectedDeveloper) return []
    return offPlanProjects.filter((p: OffPlanProject) => p.developerId === selectedDeveloper.id)
  }, [selectedDeveloper])

  const topDevelopersForComparison = useMemo(() => {
    return [...developers]
      .sort((a: Developer, b: Developer) => (b.marketSharePct || 0) - (a.marketSharePct || 0))
      .slice(0, 3)
  }, [])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  return (
    <div className="h-full flex flex-col bg-black text-white">
      {/* Header Stats Bar */}
      <div className="grid grid-cols-4 gap-3 p-4 border-b border-pcis-border/20">
        <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-3">
          <div className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium mb-2">Total Developers</div>
          <div className="text-xl font-serif text-pcis-text" style={{ fontFamily: "'Playfair Display', serif" }}>{headerStats.totalDevelopers}</div>
        </div>
        <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-3">
          <div className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium mb-2">Active Projects</div>
          <div className="text-xl font-serif text-pcis-text" style={{ fontFamily: "'Playfair Display', serif" }}>{headerStats.activeDeveloperProjects}</div>
        </div>
        <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-3">
          <div className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium mb-2">Avg On-Time %</div>
          <div className="text-xl font-serif text-pcis-text" style={{ fontFamily: "'Playfair Display', serif" }}>{headerStats.avgOnTime}%</div>
        </div>
        <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-3">
          <div className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium mb-2">Avg Quality Rating</div>
          <div className="text-xl font-serif text-pcis-text" style={{ fontFamily: "'Playfair Display', serif" }}>{headerStats.avgQuality}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {/* Developer Leaderboard Table */}
        <div className="flex-1 min-h-0 flex flex-col p-4">
          <div className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium mb-3">Developer Leaderboard</div>
          <div className="flex-1 overflow-x-auto min-h-0">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-pcis-border/20">
                  <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-left px-3 py-2 cursor-pointer hover:text-pcis-text-secondary" onClick={() => handleSort('name')}>Developer Name</th>
                  <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-left px-3 py-2 cursor-pointer hover:text-pcis-text-secondary" onClick={() => handleSort('reraRating')}>RERA</th>
                  <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-right px-3 py-2 cursor-pointer hover:text-pcis-text-secondary" onClick={() => handleSort('projectsDelivered')}>Delivered</th>
                  <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-right px-3 py-2 cursor-pointer hover:text-pcis-text-secondary" onClick={() => handleSort('activeProjects')}>Active</th>
                  <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-right px-3 py-2 cursor-pointer hover:text-pcis-text-secondary" onClick={() => handleSort('unitsDelivered')}>Units</th>
                  <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-left px-3 py-2 cursor-pointer hover:text-pcis-text-secondary" onClick={() => handleSort('onTimePercentage')}>On-Time %</th>
                  <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-left px-3 py-2 cursor-pointer hover:text-pcis-text-secondary" onClick={() => handleSort('quality')}>Quality</th>
                  <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-right px-3 py-2 cursor-pointer hover:text-pcis-text-secondary" onClick={() => handleSort('avgPriceSqft')}>Avg $/sqft</th>
                  <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-right px-3 py-2 cursor-pointer hover:text-pcis-text-secondary" onClick={() => handleSort('marketShare')}>Mkt Share %</th>
                  <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-left px-3 py-2 cursor-pointer hover:text-pcis-text-secondary" onClick={() => handleSort('financialStability')}>Stability</th>
                  <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-center px-3 py-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {sortedDevelopers.map((dev: Developer) => {
                  const activeCount = offPlanProjects.filter((p: OffPlanProject) => p.developerId === dev.id).length
                  const isSelected = selectedDeveloperId === dev.id

                  return (
                    <tr
                      key={dev.id}
                      onClick={() => setSelectedDeveloperId(dev.id)}
                      className={`border-b border-pcis-border/20 hover:bg-white/[0.02] cursor-pointer transition-colors ${
                        isSelected ? 'border-l-2 border-l-pcis-gold bg-white/[0.03]' : ''
                      }`}
                    >
                      <td className="text-xs text-pcis-text-secondary font-medium px-3 py-2">{dev.name}</td>
                      <td className="text-xs text-pcis-text-secondary px-3 py-2"><ReraBadge rating={dev.reraRating} /></td>
                      <td className="text-xs text-pcis-text-secondary tabular-nums text-right px-3 py-2">{dev.totalProjectsDelivered || 0}</td>
                      <td className="text-xs text-pcis-text-secondary tabular-nums text-right px-3 py-2">{activeCount}</td>
                      <td className="text-xs text-pcis-text-secondary tabular-nums text-right px-3 py-2">{(dev.totalUnitsDelivered || 0).toLocaleString()}</td>
                      <td className="text-xs text-pcis-text-secondary px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 bg-pcis-border/10 rounded-full overflow-hidden">
                            <div className="h-full bg-pcis-gold" style={{ width: `${dev.onTimeDeliveryPct || 0}%` }} />
                          </div>
                          <span className="tabular-nums w-6 text-right">{dev.onTimeDeliveryPct || 0}%</span>
                        </div>
                      </td>
                      <td className="text-xs text-pcis-text-secondary px-3 py-2">{renderStarRating(dev.qualityRating || 0)}</td>
                      <td className="text-xs text-pcis-text-secondary tabular-nums text-right px-3 py-2">AED {(dev.avgPriceSqft || 0).toLocaleString()}</td>
                      <td className="text-xs text-pcis-text-secondary tabular-nums text-right px-3 py-2">{(dev.marketSharePct || 0).toFixed(1)}%</td>
                      <td className="text-xs text-pcis-text-secondary px-3 py-2"><StabilityBadge status={dev.financialStability} /></td>
                      <td className="text-xs text-pcis-text-secondary text-center px-3 py-2"><TrendIndicator trend={dev.trend} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Developer Detail Section */}
        {selectedDeveloper && (
          <div className="border-t border-pcis-border/20 p-4 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {/* Developer Info Card */}
              <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-3 col-span-1">
                <div className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium mb-2">Developer</div>
                <div className="font-serif text-pcis-text mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{selectedDeveloper.name}</div>
                <div className="space-y-1 text-[10px] text-pcis-text-secondary mb-3">
                  <div>Est. {selectedDeveloper.established}</div>
                  <div>HQ: {selectedDeveloper.headquarters}</div>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {selectedDeveloper.specialization.map((spec: string) => (
                    <span key={spec} className="text-[10px] px-1.5 py-0.5 rounded bg-pcis-border/15 text-pcis-text-secondary">
                      {spec}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-pcis-text-muted">RERA</span>
                  <ReraBadge rating={selectedDeveloper.reraRating} />
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px]">
                  <span className="text-pcis-text-muted">Escrow Compliance</span>
                  <span className="text-emerald-400 font-medium">{selectedDeveloper.escrowCompliance || '100%'}</span>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-3 col-span-3">
                <div className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium mb-3">Performance Metrics</div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <div className="text-[10px] text-pcis-text-muted mb-1">On-Time Delivery %</div>
                    <div className="text-lg font-serif text-pcis-text tabular-nums" style={{ fontFamily: "'Playfair Display', serif" }}>{selectedDeveloper.onTimeDeliveryPct || 0}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-pcis-text-muted mb-1">Quality Rating</div>
                    <div className="text-lg font-serif text-pcis-text" style={{ fontFamily: "'Playfair Display', serif" }}>{renderStarRating(selectedDeveloper.qualityRating || 0)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-pcis-text-muted mb-1">Customer Satisfaction</div>
                    <div className="text-lg font-serif text-pcis-text tabular-nums" style={{ fontFamily: "'Playfair Display', serif" }}>{selectedDeveloper.customerSatisfaction || 0}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-pcis-text-muted mb-1">Market Share</div>
                    <div className="text-lg font-serif text-pcis-gold tabular-nums" style={{ fontFamily: "'Playfair Display', serif" }}>{(selectedDeveloper.marketSharePct || 0).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Projects */}
            {selectedDeveloperProjects.length > 0 && (
              <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-3">
                <div className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium mb-3">Active Projects ({selectedDeveloperProjects.length})</div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-pcis-border/20">
                        <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-left px-3 py-2">Project Name</th>
                        <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-right px-3 py-2">Area (sqm)</th>
                        <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-left px-3 py-2">Status</th>
                        <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-right px-3 py-2">Units</th>
                        <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-right px-3 py-2">Sold %</th>
                        <th className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium text-right px-3 py-2">Avg $/sqft</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDeveloperProjects.map((proj: OffPlanProject) => (
                        <tr key={proj.id} className="border-b border-pcis-border/20 hover:bg-white/[0.02]">
                          <td className="text-xs text-pcis-text-secondary px-3 py-2">{proj.projectName}</td>
                          <td className="text-xs text-pcis-text-secondary tabular-nums text-right px-3 py-2">{proj.area.toLocaleString()}</td>
                          <td className="text-xs text-pcis-text-secondary px-3 py-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              proj.status === 'Launched' ? 'bg-emerald-500/10 text-emerald-400' :
                              'bg-pcis-border/15 text-pcis-text-secondary'
                            }`}>
                              {proj.status}
                            </span>
                          </td>
                          <td className="text-xs text-pcis-text-secondary tabular-nums text-right px-3 py-2">{proj.totalUnits}</td>
                          <td className="text-xs text-pcis-text-secondary px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1 bg-pcis-border/10 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${proj.soldPct}%` }} />
                              </div>
                              <span className="tabular-nums w-6 text-right text-[10px]">{proj.soldPct}%</span>
                            </div>
                          </td>
                          <td className="text-xs text-pcis-text-secondary tabular-nums text-right px-3 py-2">AED {proj.avgPriceSqft.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Flagship & Completed Projects */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-3">
                <div className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium mb-2">Flagship/Completed</div>
                <div className="space-y-1">
                  {selectedDeveloper.flagshipProjects?.slice(0, 5).map((proj: string, idx: number) => (
                    <div key={idx} className="text-xs text-pcis-text-secondary">• {proj}</div>
                  ))}
                </div>
              </div>
              <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-3">
                <div className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium mb-2">Recent Launches</div>
                <div className="text-[10px] text-pcis-text-secondary space-y-1">
                  {selectedDeveloper.recentLaunches?.slice(0, 5).map((launch: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span>{launch.name}</span>
                      <span className="tabular-nums">{launch.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Developer Comparison */}
        <div className="border-t border-pcis-border/20 p-4">
          <div className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-4">
            <div className="text-[10px] text-pcis-text-muted uppercase tracking-wider font-medium mb-4">Top 3 Developers Comparison</div>
            <div className="space-y-4">
              {topDevelopersForComparison.map((dev: Developer) => (
                <div key={dev.id} className="space-y-2">
                  <div className="text-xs font-medium text-pcis-text">{dev.name}</div>
                  <div className="grid grid-cols-4 gap-3 pl-3">
                    <div>
                      <div className="text-[10px] text-pcis-text-muted mb-1">On-Time %</div>
                      <HBar value={dev.onTimeDeliveryPct || 0} max={100} color="#d4a574" />
                    </div>
                    <div>
                      <div className="text-[10px] text-pcis-text-muted mb-1">Quality</div>
                      <HBar value={dev.qualityRating || 0} max={5} color="#10b981" />
                    </div>
                    <div>
                      <div className="text-[10px] text-pcis-text-muted mb-1">Avg Price/sqft</div>
                      <HBar value={dev.avgPriceSqft || 0} max={5000} color="#3b82f6" />
                    </div>
                    <div>
                      <div className="text-[10px] text-pcis-text-muted mb-1">Market Share %</div>
                      <HBar value={dev.marketSharePct || 0} max={15} color="#06b6d4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
