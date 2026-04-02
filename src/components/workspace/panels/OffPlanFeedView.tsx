'use client'

import React, { useState, useMemo } from 'react'
import { offPlanProjects, developers, offPlanSummary, type OffPlanProject, type UnitMix } from '@/lib/offPlanData'
import { useWorkspace } from '../WorkspaceProvider'
import { AreaLink } from '../useWorkspaceNav'

// ============================================================================
// PCIS Off-Plan Projects Feed — Comprehensive Project Explorer
// ============================================================================
// Terminal-style filterable, sortable table of all off-plan projects in Dubai.
// Developers, areas, status, pricing, units, payment plans, and sales metrics.
// ============================================================================

function formatAED(n: number): string {
  if (n >= 1e9) return `AED ${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `AED ${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `AED ${(n / 1e3).toFixed(0)}K`
  return `AED ${n.toFixed(0)}`
}

function formatPct(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

function SoldPercentageBar({ sold, total }: { sold: number; total: number }) {
  const pct = (sold / total) * 100
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums whitespace-nowrap" style={{ color }}>{pct.toFixed(0)}%</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Announced': '#3b82f6',
    'Launched': '#22c55e',
    'Under Construction': '#f59e0b',
    'Near Completion': '#8b5cf6',
    'Completed': 'rgba(255, 255, 255, 0.6)',
    'Handed Over': 'rgba(255, 255, 255, 0.4)',
  }
  const color = colors[status] || '#6b7280'

  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{ color, background: color + '12', border: `1px solid ${color}20` }}
    >
      {status}
    </span>
  )
}

type SortKey = 'name' | 'developer' | 'area' | 'status' | 'sold' | 'priceFrom' | 'avgSqft' | 'completion' | 'velocity' | 'appeal'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'developer', label: 'Developer' },
  { key: 'sold', label: 'Sold %' },
  { key: 'priceFrom', label: 'Price' },
  { key: 'velocity', label: 'Velocity' },
  { key: 'appeal', label: 'Appeal' },
]

const STATUS_FILTERS = ['Announced', 'Launched', 'Under Construction', 'Near Completion', 'Completed', 'Handed Over']

export default function OffPlanFeedView() {
  const { openPanel } = useWorkspace()

  const [sortBy, setSortBy] = useState<SortKey>('sold')
  const [filterStatus, setFilterStatus] = useState<Set<string>>(new Set(STATUS_FILTERS))
  const [filterDeveloper, setFilterDeveloper] = useState<string>('all')
  const [filterArea, setFilterArea] = useState<string>('all')
  const [priceMin, setPriceMin] = useState<number>(0)
  const [priceMax, setPriceMax] = useState<number>(20000000)

  const uniqueAreas = useMemo(() => {
    const areas = new Set(offPlanProjects.map((p: OffPlanProject) => p.area))
    return Array.from(areas).sort()
  }, [])

  const sorted = useMemo(() => {
    let result = [...offPlanProjects]

    // Apply filters
    result = result.filter((p: OffPlanProject) => {
      const passStatus = filterStatus.has(p.status)
      const passDeveloper = filterDeveloper === 'all' || p.developerId === filterDeveloper
      const passArea = filterArea === 'all' || p.area === filterArea
      const passPrice = p.priceFrom >= priceMin && p.priceFrom <= priceMax
      return passStatus && passDeveloper && passArea && passPrice
    })

    // Apply sort
    switch (sortBy) {
      case 'name':
        return result.sort((a: OffPlanProject, b: OffPlanProject) => a.projectName.localeCompare(b.projectName))
      case 'developer':
        return result.sort((a: OffPlanProject, b: OffPlanProject) => a.developer.localeCompare(b.developer))
      case 'sold':
        return result.sort((a: OffPlanProject, b: OffPlanProject) => (b.soldUnits / b.totalUnits) - (a.soldUnits / a.totalUnits))
      case 'priceFrom':
        return result.sort((a: OffPlanProject, b: OffPlanProject) => a.priceFrom - b.priceFrom)
      case 'avgSqft':
        return result.sort((a: OffPlanProject, b: OffPlanProject) => b.avgPriceSqft - a.avgPriceSqft)
      case 'completion':
        return result.sort((a: OffPlanProject, b: OffPlanProject) => a.estimatedCompletion.localeCompare(b.estimatedCompletion))
      case 'velocity':
        return result.sort((a: OffPlanProject, b: OffPlanProject) => b.salesVelocity - a.salesVelocity)
      case 'appeal':
        return result.sort((a: OffPlanProject, b: OffPlanProject) => {
          const appealOrder = { 'High': 3, 'Medium': 2, 'Low': 1 }
          return (appealOrder[b.investorAppeal as keyof typeof appealOrder] || 0) - (appealOrder[a.investorAppeal as keyof typeof appealOrder] || 0)
        })
      default:
        return result
    }
  }, [sortBy, filterStatus, filterDeveloper, filterArea, priceMin, priceMax])

  const handleProjectClick = (projectId: string) => {
    openPanel('offplan-detail' as any, 'split-right', projectId)
  }

  const toggleStatusFilter = (status: string) => {
    const updated = new Set(filterStatus)
    if (updated.has(status)) {
      updated.delete(status)
    } else {
      updated.add(status)
    }
    setFilterStatus(updated)
  }

  const avgPriceSqft = Math.round(offPlanProjects.reduce((s: number, p: OffPlanProject) => s + p.avgPriceSqft, 0) / offPlanProjects.length)
  const totalAvailable = offPlanProjects.reduce((s: number, p: OffPlanProject) => s + (p.totalUnits - p.soldUnits), 0)
  const totalPipelineValue = offPlanProjects.reduce((s: number, p: OffPlanProject) => {
    return s + (p.unitMix.reduce((ut: number, u) => ut + (u.priceFrom * u.count), 0))
  }, 0)

  return (
    <div className="h-full flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-white/[0.04]">
        <div>
          <h2 className="text-lg font-semibold text-white tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Off-Plan Intelligence
          </h2>
          <p className="text-[10px] text-white/40 tracking-wider uppercase mt-0.5">
            Dubai Developer Landscape · {offPlanProjects.length} Active Projects
          </p>
        </div>
        <div className="flex items-center gap-4">
          {[
            { label: 'Total Projects', value: String(offPlanProjects.length) },
            { label: 'Available Units', value: totalAvailable.toLocaleString() },
            { label: 'Avg AED/sqft', value: avgPriceSqft.toLocaleString() },
            { label: 'Pipeline Value', value: formatAED(totalPipelineValue) },
          ].map(s => (
            <div key={s.label} className="text-right">
              <span className="text-[8px] text-white/40 uppercase tracking-wider block">{s.label}</span>
              <span className="text-sm font-bold text-white tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="flex-shrink-0 py-3 space-y-2.5 border-b border-white/[0.04]">

        {/* Status Pills */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-white/40 uppercase tracking-wider whitespace-nowrap">Status</span>
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_FILTERS.map(status => (
              <button
                key={status}
                onClick={() => toggleStatusFilter(status)}
                className={`text-[8px] tracking-wider px-1.5 py-0.5 rounded-md transition-colors ${
                  filterStatus.has(status)
                    ? 'text-white bg-white/[0.08] border border-white/[0.2]'
                    : 'text-white/40 border border-transparent hover:bg-white/[0.02]'
                }`}
              >
                {status.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Developer & Area Dropdowns */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <span className="text-[8px] text-white/40 uppercase tracking-wider whitespace-nowrap">Developer</span>
            <select
              value={filterDeveloper}
              onChange={(e) => setFilterDeveloper(e.target.value)}
              className="h-7 bg-white/[0.03] border border-white/[0.1] rounded-lg px-2 text-[11px] text-white outline-none focus:border-white/[0.3]"
            >
              <option value="all">All Developers</option>
              {developers.map(dev => (
                <option key={dev.id} value={dev.id}>{dev.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <span className="text-[8px] text-white/40 uppercase tracking-wider whitespace-nowrap">Area</span>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="h-7 bg-white/[0.03] border border-white/[0.1] rounded-lg px-2 text-[11px] text-white outline-none focus:border-white/[0.3]"
            >
              <option value="all">All Areas</option>
              {uniqueAreas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <span className="text-[8px] text-white/40 uppercase tracking-wider whitespace-nowrap">Price From</span>
            <input
              type="number"
              value={priceMin}
              onChange={(e) => setPriceMin(Number(e.target.value))}
              className="h-7 bg-white/[0.03] border border-white/[0.1] rounded-lg px-2 text-[11px] text-white outline-none focus:border-white/[0.3] w-24 tabular-nums"
            />
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <span className="text-[8px] text-white/40 uppercase tracking-wider whitespace-nowrap">To</span>
            <input
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(Number(e.target.value))}
              className="h-7 bg-white/[0.03] border border-white/[0.1] rounded-lg px-2 text-[11px] text-white outline-none focus:border-white/[0.3] w-24 tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* ── Sort Controls ── */}
      <div className="flex items-center gap-2 py-2 flex-shrink-0 border-b border-white/[0.04] px-0">
        <span className="text-[8px] text-white/40 uppercase tracking-wider">Sort</span>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`text-[8px] tracking-wider px-2 py-1 rounded-md transition-colors ${
              sortBy === opt.key
                ? 'text-white/90 bg-white/[0.08] border border-white/[0.2]'
                : 'text-white/40 border border-transparent hover:bg-white/[0.03]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white/[0.01] border-b border-white/[0.04]">
            <tr>
              <th className="text-[10px] text-white/40 uppercase tracking-wider font-medium px-3 py-2 text-left">Project</th>
              <th className="text-[10px] text-white/40 uppercase tracking-wider font-medium px-3 py-2 text-left">Developer</th>
              <th className="text-[10px] text-white/40 uppercase tracking-wider font-medium px-3 py-2 text-left">Area</th>
              <th className="text-[10px] text-white/40 uppercase tracking-wider font-medium px-3 py-2 text-center">Status</th>
              <th className="text-[10px] text-white/40 uppercase tracking-wider font-medium px-3 py-2 text-right">Units</th>
              <th className="text-[10px] text-white/40 uppercase tracking-wider font-medium px-3 py-2 text-center">Sold %</th>
              <th className="text-[10px] text-white/40 uppercase tracking-wider font-medium px-3 py-2 text-right">Price From</th>
              <th className="text-[10px] text-white/40 uppercase tracking-wider font-medium px-3 py-2 text-right">AED/sqft</th>
              <th className="text-[10px] text-white/40 uppercase tracking-wider font-medium px-3 py-2 text-right">vs Area</th>
              <th className="text-[10px] text-white/40 uppercase tracking-wider font-medium px-3 py-2 text-center">Completion</th>
              <th className="text-[10px] text-white/40 uppercase tracking-wider font-medium px-3 py-2 text-right">Velocity</th>
              <th className="text-[10px] text-white/40 uppercase tracking-wider font-medium px-3 py-2 text-center">Appeal</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((project: OffPlanProject) => {
              const soldPct = (project.soldUnits / project.totalUnits) * 100
              const vsAreaColor = project.priceVsAreaAvg >= 0 ? '#22c55e' : '#ef4444'
              const appealColor = project.investorAppeal === 'High' ? '#22c55e' : project.investorAppeal === 'Medium' ? '#3b82f6' : '#f59e0b'

              return (
                <tr
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2 text-white/80 font-semibold">{project.projectName}</td>
                  <td className="px-3 py-2 text-white/60">{project.developer}</td>
                  <td className="px-3 py-2 text-white/60">
                    <AreaLink areaId={project.areaId}>{project.area}</AreaLink>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="px-3 py-2 text-white/80 text-right tabular-nums">
                    {project.soldUnits} / {project.totalUnits}
                  </td>
                  <td className="px-3 py-2">
                    <SoldPercentageBar sold={project.soldUnits} total={project.totalUnits} />
                  </td>
                  <td className="px-3 py-2 text-white/80 text-right tabular-nums font-medium">
                    {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(project.priceFrom)}
                  </td>
                  <td className="px-3 py-2 text-white/80 text-right tabular-nums">
                    {project.avgPriceSqft.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium" style={{ color: vsAreaColor }}>
                    {formatPct(project.priceVsAreaAvg)}
                  </td>
                  <td className="px-3 py-2 text-center text-white/60">
                    {project.estimatedCompletion}
                  </td>
                  <td className="px-3 py-2 text-right text-white/80 tabular-nums font-medium">
                    {project.salesVelocity} / mo
                  </td>
                  <td className="px-3 py-2 text-center font-bold" style={{ color: appealColor }}>
                    {project.investorAppeal}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="text-center py-12">
            <span className="text-white/40 text-sm">No projects match your filters</span>
          </div>
        )}
      </div>
    </div>
  )
}
