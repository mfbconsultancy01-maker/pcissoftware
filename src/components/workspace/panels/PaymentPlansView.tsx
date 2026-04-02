'use client'

import React, { useState, useMemo } from 'react'
import { offPlanProjects, developers as devList, type OffPlanProject, type PaymentPlan, type Developer } from '@/lib/offPlanData'
import { AreaLink } from '../useWorkspaceNav'

// ============================================================================
// PCIS Off-Plan Intelligence — Payment Plan Comparator
// ============================================================================
// Side-by-side comparison of payment plans across off-plan projects.
// Includes filter bar, project cards with payment breakdown visualization,
// comparison table, and payment timeline visualization.
// ============================================================================

// ---------------------------------------------------------------------------
// Payment Breakdown Bar Component
// ---------------------------------------------------------------------------

function PaymentBreakdownBar({ plan }: { plan: PaymentPlan }) {
  const segments = [
    { label: 'Down', pct: plan.downPayment, color: '#d4a574' },
    { label: 'Const', pct: plan.duringConstruction, color: '#3b82f6' },
    { label: 'Handover', pct: plan.onHandover, color: '#22c55e' },
    { label: 'Post', pct: plan.postHandover, color: '#a855f7' },
  ].filter((s: { label: string; pct: number; color: string }) => s.pct > 0)

  return (
    <div className="space-y-1">
      <div className="flex h-3 rounded-full overflow-hidden bg-white/[0.04]">
        {segments.map((s: { label: string; pct: number; color: string }, i: number) => (
          <div key={i} style={{ width: `${s.pct}%`, background: s.color }} className="h-full transition-all" />
        ))}
      </div>
      <div className="flex justify-between">
        {segments.map((s: { label: string; pct: number; color: string }, i: number) => (
          <span key={i} className="text-[9px] text-white/40 tabular-nums">
            {s.label} {s.pct}%
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Badge Component
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    'Under Construction': 'bg-blue-500/10 text-blue-300',
    'Planning': 'bg-amber-500/10 text-amber-300',
    'Approved': 'bg-emerald-500/10 text-emerald-300',
    'Handed Over': 'bg-white/[0.06] text-white/60',
  }

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colorMap[status] || 'bg-white/[0.06] text-white/60'}`}>
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Payment Timeline Visualization
// ---------------------------------------------------------------------------

function PaymentTimeline({ selectedProjects }: { selectedProjects: OffPlanProject[] }) {
  if (selectedProjects.length === 0) return null

  const launchDates = selectedProjects.map((p: OffPlanProject) => new Date(p.launchDate).getTime())
  const deliveryDates = selectedProjects.map((p: OffPlanProject) => new Date(p.estimatedCompletion).getTime())
  const allDates = [...launchDates, ...deliveryDates]
  const minDate = Math.min(...allDates)
  const maxDate = Math.max(...allDates)
  const timeRange = maxDate - minDate
  const width = 400
  const height = selectedProjects.length * 60 + 40

  const getXPosition = (date: number): number => {
    return 60 + ((date - minDate) / timeRange) * (width - 120)
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 mt-6">
      <div className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-4">Payment Timeline</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: `${height}px` }}>
        {/* Month labels */}
        {Array.from({ length: 13 }).map((_, i: number) => {
          const date = new Date(minDate + (timeRange / 12) * i)
          const x = getXPosition(date.getTime())
          return (
            <g key={i}>
              <line x1={x} y1={20} x2={x} y2={height - 10} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
              <text x={x} y={height - 2} fontSize="8" fill="rgba(255,255,255,0.2)" textAnchor="middle">
                {date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              </text>
            </g>
          )
        })}

        {/* Project timelines */}
        {selectedProjects.map((project: OffPlanProject, idx: number) => {
          const y = 35 + idx * 60
          const launchX = getXPosition(new Date(project.launchDate).getTime())
          const deliveryX = getXPosition(new Date(project.estimatedCompletion).getTime())

          return (
            <g key={project.id}>
              {/* Timeline line */}
              <line x1={launchX} y1={y} x2={deliveryX} y2={y} stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
              {/* Launch point */}
              <circle cx={launchX} cy={y} r="4" fill="#d4a574" />
              {/* Delivery point */}
              <circle cx={deliveryX} cy={y} r="4" fill="#22c55e" />
              {/* Label */}
              <text x={10} y={y + 4} fontSize="10" fill="text-white" className="fill-white">
                {project.projectName.substring(0, 20)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PaymentPlansView() {
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [developerFilter, setDeveloperFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priceMin, setPriceMin] = useState<number>(0)
  const [priceMax, setPriceMax] = useState<number>(10000000)

  // Filter projects
  const filteredProjects = useMemo(() => {
    return offPlanProjects.filter((p: OffPlanProject) => {
      if (areaFilter !== 'all' && p.areaId !== areaFilter) return false
      if (developerFilter !== 'all' && p.developerId !== developerFilter) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (p.priceFrom > priceMax || p.priceTo < priceMin) return false
      return true
    })
  }, [areaFilter, developerFilter, statusFilter, priceMin, priceMax])

  // Get unique values for filters
  const areas = useMemo(() => Array.from(new Set(offPlanProjects.map((p: OffPlanProject) => p.area))), [])
  const developerNames = useMemo(() => Array.from(new Set(offPlanProjects.map((p: OffPlanProject) => p.developer))), [])
  const statuses = useMemo(() => Array.from(new Set(offPlanProjects.map((p: OffPlanProject) => p.status))), [])

  // Get selected projects
  const projectsForComparison = useMemo(() => {
    return filteredProjects.filter((p: OffPlanProject) => selectedProjects.has(p.id))
  }, [filteredProjects, selectedProjects])

  // Toggle project selection
  const toggleProjectSelection = (projectId: string) => {
    const newSelected = new Set(selectedProjects)
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId)
    } else {
      newSelected.add(projectId)
    }
    setSelectedProjects(newSelected)
  }

  // Find best values for comparison highlighting
  const getBestValues = useMemo(() => {
    if (projectsForComparison.length === 0) return {}
    return {
      lowestDown: Math.min(...projectsForComparison.map((p: OffPlanProject) =>
        p.paymentPlan.downPayment
      )),
      highestQuality: Math.max(...projectsForComparison.map((p: OffPlanProject) => {
        const dev = devList.find((d: Developer) => d.id === p.developerId)
        return dev?.qualityRating ?? 0
      })),
      lowestAvgSqft: Math.min(...projectsForComparison.map((p: OffPlanProject) => p.avgPriceSqft)),
      highestOnTime: Math.max(...projectsForComparison.map((p: OffPlanProject) => {
        const dev = devList.find((d: Developer) => d.id === p.developerId)
        return dev?.onTimeDeliveryPct ?? 0
      })),
    }
  }, [projectsForComparison])

  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 })

  return (
    <div className="h-full flex flex-col bg-black/20">
      {/* Header */}
      <div className="border-b border-white/[0.04] p-4 flex-shrink-0">
        <div className="text-white font-serif text-sm mb-4">Payment Plans Comparator</div>
        <div className="text-[10px] text-white/40">
          {filteredProjects.length} projects • {selectedProjects.size} selected for comparison
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border-b border-white/[0.04] p-4 flex-shrink-0 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Area Filter */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider font-medium block mb-2">Area</label>
            <select
              value={areaFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAreaFilter(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.04] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-white/[0.08]"
            >
              <option value="all">All Areas</option>
              {areas.map((area: string) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          {/* Developer Filter */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider font-medium block mb-2">Developer</label>
            <select
              value={developerFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDeveloperFilter(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.04] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-white/[0.08]"
            >
              <option value="all">All Developers</option>
              {developerNames.map((dev: string) => (
                <option key={dev} value={dev}>
                  {dev}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider font-medium block mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.04] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-white/[0.08]"
            >
              <option value="all">All Status</option>
              {statuses.map((status: string) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider font-medium block mb-2">Min Price AED</label>
            <input
              type="number"
              value={priceMin}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPriceMin(Number(e.target.value))}
              className="w-full bg-white/[0.04] border border-white/[0.04] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-white/[0.08]"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project: OffPlanProject) => (
            <div
              key={project.id}
              className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 cursor-pointer hover:bg-white/[0.04] transition-colors"
              onClick={() => toggleProjectSelection(project.id)}
            >
              {/* Header with checkbox */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="text-xs font-serif text-white font-semibold">{project.projectName}</div>
                  <div className="text-[9px] text-white/60">{project.developer}</div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedProjects.has(project.id)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    e.stopPropagation()
                    toggleProjectSelection(project.id)
                  }}
                  className="mt-1 cursor-pointer"
                />
              </div>

              {/* Area and Status */}
              <div className="flex gap-2 mb-3 flex-wrap">
                <AreaLink areaId={project.areaId}>{project.area}</AreaLink>
                <StatusBadge status={project.status} />
              </div>

              {/* Price Info */}
              <div className="mb-3 space-y-1 text-[9px]">
                <div className="text-white/60">
                  Price Range: <span className="text-white tabular-nums">{formatter.format(project.priceFrom)} — {formatter.format(project.priceTo)}</span>
                </div>
                <div className="text-white/60">
                  Avg/sqft: <span className="text-[#d4a574] tabular-nums">{formatter.format(project.avgPriceSqft)}</span>
                </div>
              </div>

              {/* Payment Plan */}
              {project.paymentPlan && (
                <div className="mb-3 space-y-2">
                  <div className="text-[9px] text-white/40 uppercase tracking-wider font-medium">Payment Plan</div>
                  <div>
                    <div className="text-[9px] text-white/60 mb-1">{project.paymentPlan.name}</div>
                    <PaymentBreakdownBar plan={project.paymentPlan} />
                  </div>
                </div>
              )}

              {/* Key Metrics */}
              <div className="border-t border-white/[0.04] pt-3 text-[9px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-white/60">Total Units:</span>
                  <span className="text-white tabular-nums font-medium">{project.totalUnits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Expected Delivery:</span>
                  <span className="text-white tabular-nums font-medium">
                    {new Date(project.estimatedCompletion).toLocaleDateString('en-US', { year: '2-digit', month: 'short' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        {projectsForComparison.length >= 2 && (
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg overflow-hidden mt-6">
            <div className="p-4 border-b border-white/[0.04]">
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Comparison Table</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left px-4 py-2 text-white/40 uppercase tracking-wider font-medium text-[9px] bg-white/[0.02]">Metric</th>
                    {projectsForComparison.map((p: OffPlanProject) => (
                      <th key={p.id} className="text-right px-4 py-2 text-white/60 uppercase tracking-wider font-medium text-[9px] bg-white/[0.02] whitespace-nowrap">
                        {p.projectName.substring(0, 15)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-white/60">Min Down Payment %</td>
                    {projectsForComparison.map((p: OffPlanProject) => {
                      const minDown = p.paymentPlan.downPayment
                      const isLowest = minDown === getBestValues.lowestDown
                      return (
                        <td key={p.id} className={`text-right px-4 py-2 tabular-nums font-medium ${isLowest ? 'text-[#d4a574]' : 'text-white/80'}`}>
                          {minDown}%
                        </td>
                      )
                    })}
                  </tr>
                  <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-white/60">Total Units</td>
                    {projectsForComparison.map((p: OffPlanProject) => (
                      <td key={p.id} className="text-right px-4 py-2 text-white/80 tabular-nums font-medium">
                        {p.totalUnits}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-white/60">Avg Price/sqft (AED)</td>
                    {projectsForComparison.map((p: OffPlanProject) => {
                      const isLowest = p.avgPriceSqft === getBestValues.lowestAvgSqft
                      return (
                        <td key={p.id} className={`text-right px-4 py-2 tabular-nums font-medium ${isLowest ? 'text-[#d4a574]' : 'text-white/80'}`}>
                          {p.avgPriceSqft.toLocaleString()}
                        </td>
                      )
                    })}
                  </tr>
                  <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-white/60">Quality Rating</td>
                    {projectsForComparison.map((p: OffPlanProject) => {
                      const dev = devList.find((d: Developer) => d.id === p.developerId)
                      const qualityRating = dev?.qualityRating ?? 0
                      const isHighest = qualityRating === getBestValues.highestQuality
                      return (
                        <td key={p.id} className={`text-right px-4 py-2 tabular-nums font-medium ${isHighest ? 'text-[#d4a574]' : 'text-white/80'}`}>
                          {qualityRating.toFixed(1)}★
                        </td>
                      )
                    })}
                  </tr>
                  <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-white/60">Rental Yield Est</td>
                    {projectsForComparison.map((p: OffPlanProject) => (
                      <td key={p.id} className="text-right px-4 py-2 text-white/80 tabular-nums font-medium">
                        {p.rentalYieldEstimate}%
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-white/60">Investor Appeal</td>
                    {projectsForComparison.map((p: OffPlanProject) => (
                      <td key={p.id} className={`text-right px-4 py-2 font-medium ${p.investorAppeal === 'High' ? 'text-emerald-400' : p.investorAppeal === 'Medium' ? 'text-blue-400' : 'text-white/60'}`}>
                        {p.investorAppeal}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Timeline */}
        <PaymentTimeline selectedProjects={projectsForComparison} />
      </div>
    </div>
  )
}
