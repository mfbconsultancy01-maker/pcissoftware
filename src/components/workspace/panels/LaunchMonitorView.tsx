'use client'

import React, { useMemo, useState } from 'react'
import { projectLaunches, offPlanProjects, type ProjectLaunch, type OffPlanProject } from '@/lib/offPlanData'
import { AreaLink } from '../useWorkspaceNav'
import { useWorkspace } from '../WorkspaceProvider'

// ============================================================================
// PCIS Off-Plan Intelligence — Launch Monitor
// ============================================================================
// Tracks upcoming, active, and recently closed project launches with
// timeline visualization, launch cards, and closed launches table.
// ============================================================================

// ---------------------------------------------------------------------------
// Launch Type Badge
// ---------------------------------------------------------------------------

function LaunchTypeBadge({ type }: { type: 'New Launch' | 'New Phase' | 'Price Revision' | 'Soft Launch' | 'VIP Preview' }) {
  const colorMap: Record<string, string> = {
    'New Launch': 'bg-emerald-500/10 text-emerald-300',
    'New Phase': 'bg-blue-500/10 text-blue-300',
    'Price Revision': 'bg-amber-500/10 text-amber-300',
    'Soft Launch': 'bg-purple-500/10 text-purple-300',
    'VIP Preview': 'bg-[#d4a574]/10 text-[#d4a574]',
  }

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colorMap[type]}`}>
      {type}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Launch Timeline Component
// ---------------------------------------------------------------------------

function LaunchTimeline({ launches }: { launches: ProjectLaunch[] }) {
  if (launches.length === 0) return null

  const launchDates = launches.map((l: ProjectLaunch) => new Date(l.launchDate).getTime())
  const minDate = Math.min(...launchDates)
  const maxDate = Math.max(...launchDates)
  const timeRange = maxDate - minDate || 1
  const today = new Date().getTime()
  const width = 500
  const height = 80

  const getXPosition = (date: number): number => {
    return 60 + ((date - minDate) / timeRange) * (width - 120)
  }

  const getTypeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      'New Launch': '#22c55e',
      'New Phase': '#3b82f6',
      'Price Revision': '#f59e0b',
      'Soft Launch': '#a855f7',
      'VIP Preview': '#d4a574',
    }
    return colorMap[type] || '#ffffff'
  }

  const todayX = getXPosition(today)
  const isTodayInRange = todayX >= 60 && todayX <= width - 60

  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
      <div className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-4">Launch Timeline</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: '80px' }}>
        {/* Month labels */}
        {Array.from({ length: 5 }).map((_, i: number) => {
          const date = new Date(minDate + (timeRange / 4) * i)
          const x = getXPosition(date.getTime())
          return (
            <g key={i}>
              <line x1={x} y1={15} x2={x} y2={height - 15} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
              <text x={x} y={height - 2} fontSize="7" fill="rgba(255,255,255,0.2)" textAnchor="middle">
                {date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              </text>
            </g>
          )
        })}

        {/* Today line */}
        {isTodayInRange && (
          <g>
            <line x1={todayX} y1={15} x2={todayX} y2={height - 15} stroke="#d4a574" strokeWidth="1.5" strokeDasharray="2,2" />
            <text x={todayX} y={12} fontSize="6" fill="#d4a574" textAnchor="middle" fontWeight="bold">
              TODAY
            </text>
          </g>
        )}

        {/* Launch dots */}
        {launches.map((launch: ProjectLaunch, idx: number) => {
          const x = getXPosition(new Date(launch.launchDate).getTime())
          const y = 40 + ((idx % 2) * 15)
          const color = getTypeColor(launch.launchType)

          return (
            <g key={launch.id}>
              {/* Dot */}
              <circle cx={x} cy={y} r="3.5" fill={color} />
              <circle cx={x} cy={y} r="5.5" fill={color} opacity="0.15" />

              {/* Label on hover via title (accessible) */}
              <title>{launch.launchType}</title>
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

export default function LaunchMonitorView() {
  const { openPanel } = useWorkspace()
  const [filterTab, setFilterTab] = useState<'upcoming' | 'active' | 'closed' | 'all'>('upcoming')

  // Get current date and categorize launches
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const categorizedLaunches = useMemo(() => {
    return {
      upcoming: projectLaunches.filter((l: ProjectLaunch) => new Date(l.launchDate) > today),
      active: projectLaunches.filter((l: ProjectLaunch) => {
        const launchDate = new Date(l.launchDate)
        launchDate.setHours(0, 0, 0, 0)
        if (!l.registrationDeadline) return false
        const deadlineDate = new Date(l.registrationDeadline)
        deadlineDate.setHours(0, 0, 0, 0)
        return launchDate <= today && deadlineDate >= today
      }),
      closed: projectLaunches.filter((l: ProjectLaunch) => l.registrationDeadline ? new Date(l.registrationDeadline) < today : false),
    }
  }, [])

  // Determine which launches to display based on filter
  const displayedLaunches = useMemo(() => {
    switch (filterTab) {
      case 'upcoming':
        return categorizedLaunches.upcoming
      case 'active':
        return categorizedLaunches.active
      case 'closed':
        return categorizedLaunches.closed
      case 'all':
        return projectLaunches
      default:
        return []
    }
  }, [filterTab, categorizedLaunches])

  // Calculate header stats
  const headerStats = useMemo(() => {
    const totalUpcoming = categorizedLaunches.upcoming.length
    const totalActive = categorizedLaunches.active.length
    const thisMonth = projectLaunches.filter((l: ProjectLaunch) => {
      const launchDate = new Date(l.launchDate)
      return (
        launchDate.getMonth() === today.getMonth() &&
        launchDate.getFullYear() === today.getFullYear()
      )
    }).length
    const avgCommission =
      projectLaunches.reduce((sum: number, l: ProjectLaunch) => sum + l.brokerCommission, 0) /
      projectLaunches.length

    return {
      totalUpcoming,
      totalActive,
      thisMonth,
      avgCommission: avgCommission.toFixed(2),
    }
  }, [categorizedLaunches, today])

  // Get project data for launches
  const getProjectData = (projectId: string): OffPlanProject | undefined => {
    return offPlanProjects.find((p: OffPlanProject) => p.id === projectId)
  }

  // Format date helper
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Calculate days until launch
  const daysUntilLaunch = (launchDate: string): number => {
    const launch = new Date(launchDate)
    launch.setHours(0, 0, 0, 0)
    const diff = launch.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 })

  return (
    <div className="h-full flex flex-col bg-black/20">
      {/* Header with Stats */}
      <div className="border-b border-white/[0.04] p-4 flex-shrink-0">
        <div className="text-white font-serif text-sm mb-4">Launch Monitor</div>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/[0.02] rounded px-3 py-2">
            <div className="text-[9px] text-white/40 uppercase tracking-wider font-medium">Upcoming</div>
            <div className="text-base tabular-nums font-semibold text-white">{headerStats.totalUpcoming}</div>
          </div>
          <div className="bg-white/[0.02] rounded px-3 py-2">
            <div className="text-[9px] text-white/40 uppercase tracking-wider font-medium">Active</div>
            <div className="text-base tabular-nums font-semibold text-white">{headerStats.totalActive}</div>
          </div>
          <div className="bg-white/[0.02] rounded px-3 py-2">
            <div className="text-[9px] text-white/40 uppercase tracking-wider font-medium">This Month</div>
            <div className="text-base tabular-nums font-semibold text-white">{headerStats.thisMonth}</div>
          </div>
          <div className="bg-white/[0.02] rounded px-3 py-2">
            <div className="text-[9px] text-white/40 uppercase tracking-wider font-medium">Avg Commission</div>
            <div className="text-base tabular-nums font-semibold text-[#d4a574]">{headerStats.avgCommission}%</div>
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="border-b border-white/[0.04] p-4 flex-shrink-0 flex gap-2">
        {(['upcoming', 'active', 'closed', 'all'] as const).map((tab: 'upcoming' | 'active' | 'closed' | 'all') => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-3 py-1 rounded text-[10px] font-medium uppercase tracking-wider transition-colors ${
              filterTab === tab
                ? 'bg-white/[0.06] text-white'
                : 'bg-white/[0.02] text-white/60 hover:bg-white/[0.04]'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
        {/* Launch Cards (for upcoming/active) */}
        {(filterTab === 'upcoming' || filterTab === 'active' || filterTab === 'all') && displayedLaunches.length > 0 && (
          <div className="space-y-3">
            {displayedLaunches.slice(0, 6).map((launch: ProjectLaunch) => {
              const project = getProjectData(launch.projectId)
              if (!project) return null

              const days = daysUntilLaunch(launch.launchDate)
              const isUpcoming = days > 0

              return (
                <div
                  key={launch.id}
                  className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 hover:bg-white/[0.04] transition-colors cursor-pointer"
                  onClick={() => openPanel('offplan-detail' as any, 'split-right', project.id)}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <LaunchTypeBadge type={launch.launchType} />
                    </div>
                    {isUpcoming && days > 0 && (
                      <div className="text-[10px] font-semibold text-[#d4a574]">
                        in {days} {days === 1 ? 'day' : 'days'}
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <div className="mb-2">
                    <div className="text-xs font-serif text-white font-semibold">{project.projectName}</div>
                    <div className="text-[9px] text-white/60">by {project.developer}</div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-3 gap-2 mb-3 text-[9px]">
                    <div>
                      <span className="text-white/40">Area</span>
                      <div>
                        <AreaLink areaId={launch.areaId}>{launch.area}</AreaLink>
                      </div>
                    </div>
                    <div>
                      <span className="text-white/40">Units</span>
                      <div className="text-white tabular-nums font-medium">{launch.totalUnits}</div>
                    </div>
                    <div>
                      <span className="text-white/40">Price From</span>
                      <div className="text-white tabular-nums font-medium">{formatter.format(launch.priceFrom)}</div>
                    </div>
                  </div>

                  {/* Launch Date Prominent */}
                  <div className="border-t border-white/[0.04] pt-3 mb-3">
                    <div className="text-[9px] text-white/40 mb-1">Launch Date</div>
                    <div className="text-xs font-semibold text-white tabular-nums">{formatDate(launch.launchDate)}</div>
                  </div>

                  {/* Bottom Row */}
                  <div className="grid grid-cols-3 gap-2 text-[9px]">
                    <div>
                      <span className="text-white/40">Commission</span>
                      <div className="text-[#d4a574] tabular-nums font-medium">{launch.brokerCommission}%</div>
                    </div>
                    {launch.earlyBirdDiscount && (
                      <div>
                        <span className="text-white/40">Early Bird</span>
                        <div className="text-emerald-300 tabular-nums font-medium">{launch.earlyBirdDiscount}%</div>
                      </div>
                    )}
                    <div>
                      <span className="text-white/40">Register By</span>
                      <div className="text-white tabular-nums font-medium">
                        {launch.registrationDeadline ? new Date(launch.registrationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Launch Timeline */}
        {displayedLaunches.length > 0 && (
          <LaunchTimeline launches={displayedLaunches} />
        )}

        {/* Closed Launches Table */}
        {(filterTab === 'closed' || filterTab === 'all') && categorizedLaunches.closed.length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg overflow-hidden">
            <div className="p-4 border-b border-white/[0.04]">
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Closed Launches</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[9px]">
                <thead>
                  <tr className="border-b border-white/[0.04] bg-white/[0.02]">
                    <th className="text-left px-4 py-2 text-white/40 uppercase tracking-wider font-medium">Project</th>
                    <th className="text-left px-4 py-2 text-white/40 uppercase tracking-wider font-medium">Developer</th>
                    <th className="text-left px-4 py-2 text-white/40 uppercase tracking-wider font-medium">Area</th>
                    <th className="text-left px-4 py-2 text-white/40 uppercase tracking-wider font-medium">Launch</th>
                    <th className="text-right px-4 py-2 text-white/40 uppercase tracking-wider font-medium">Units</th>
                    <th className="text-right px-4 py-2 text-white/40 uppercase tracking-wider font-medium">From</th>
                  </tr>
                </thead>
                <tbody>
                  {categorizedLaunches.closed.map((launch: ProjectLaunch) => {
                    const project = getProjectData(launch.projectId)
                    if (!project) return null

                    return (
                      <tr key={launch.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-4 py-2 text-white/80">{project.projectName.substring(0, 20)}</td>
                        <td className="px-4 py-2 text-white/60">{project.developer}</td>
                        <td className="px-4 py-2 text-white/60">{project.area}</td>
                        <td className="px-4 py-2 text-white/60">{formatDate(launch.launchDate)}</td>
                        <td className="px-4 py-2 text-right text-white/80 tabular-nums">{launch.totalUnits}</td>
                        <td className="px-4 py-2 text-right text-[#d4a574] tabular-nums font-medium">{formatter.format(launch.priceFrom)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {displayedLaunches.length === 0 && (
          <div className="text-center py-12">
            <div className="text-white/40 text-xs">No launches in this category</div>
          </div>
        )}
      </div>
    </div>
  )
}
