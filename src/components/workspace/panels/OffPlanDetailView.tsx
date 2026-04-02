'use client'

import React, { useMemo } from 'react'
import { offPlanProjects, developers, type OffPlanProject, type Developer, type UnitMix } from '@/lib/offPlanData'
import { AreaLink } from '../useWorkspaceNav'

// ============================================================================
// PCIS Off-Plan Project Detail — Comprehensive Deep Dive
// ============================================================================
// Complete breakdown of a single off-plan project including pricing, units,
// payment plans, timeline, developer profile, and market metrics.
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

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const empty = 5 - full
  return (
    <div className="flex gap-0.5">
      {Array(full).fill(0).map((_, i) => <span key={`f${i}`} className="text-[#d4a574]">★</span>)}
      {Array(empty).fill(0).map((_, i) => <span key={`e${i}`} className="text-white/20">★</span>)}
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3 pb-2 border-b border-white/[0.04]">
      <h3 className="text-[10px] text-white/40 uppercase tracking-widest font-medium">
        {title}
      </h3>
      {subtitle && <p className="text-[9px] text-white/60 mt-1">{subtitle}</p>}
    </div>
  )
}

function LineChart({ data, width = 280, height = 120, color = '#d4a574' }: {
  data: number[]
  width?: number
  height?: number
  color?: string
}) {
  if (!data.length) return null
  const min = Math.min(...data) * 0.95
  const max = Math.max(...data) * 1.05
  const range = max - min || 1
  const padY = 6
  const padX = 4

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * (width - padX * 2)
    const y = padY + (height - padY * 2) - ((v - min) / range) * (height - padY * 2)
    return { x, y }
  })

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')
  const areaPath = `M${points[0].x},${height - padY} ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${height - padY} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: `${height}px` }}>
      {[0.25, 0.5, 0.75].map(frac => {
        const y = padY + (height - padY * 2) * (1 - frac)
        return <line key={frac} x1={padX} y1={y} x2={width - padX} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
      })}
      <path d={areaPath} fill={color} opacity="0.08" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill={color} />
    </svg>
  )
}

function PaymentTimeline({ milestones }: { milestones: any[] }) {
  const totalPercent = milestones.reduce((s, m) => s + m.percent, 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center h-3 bg-white/[0.02] rounded-full overflow-hidden border border-white/[0.04]">
        {milestones.map((m, i) => {
          const width = (m.percent / totalPercent) * 100
          const isCompleted = m.daysFromNow < 0
          const color = isCompleted ? 'rgb(34, 197, 94)' : m.daysFromNow < 180 ? 'rgb(212, 165, 116)' : 'rgba(255, 255, 255, 0.2)'

          return (
            <div
              key={i}
              className="h-full transition-all"
              style={{ width: `${width}%`, background: color, opacity: isCompleted ? 1 : 0.7 }}
              title={`${m.stage} - ${m.percent}%`}
            />
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[8px]">
        {milestones.map((m, i) => {
          const isCompleted = m.daysFromNow < 0
          return (
            <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded p-1.5">
              <div className="text-white/60 font-medium">{m.stage}</div>
              <div className="text-white/40 mt-0.5">{m.percent}% · {m.daysFromNow > 0 ? `in ${m.daysFromNow}d` : `${Math.abs(m.daysFromNow)}d ago`}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function OffPlanDetailView({ entityId }: { entityId: string }) {
  const project = useMemo(() => {
    return offPlanProjects.find((p: OffPlanProject) => p.id === entityId)
  }, [entityId])

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-white/40">Project not found</span>
      </div>
    )
  }

  const dev = developers.find((d: Developer) => d.id === project.developerId)
  const soldPct = (project.soldUnits / project.totalUnits) * 100
  const statusColor = project.status === 'Announced' ? '#3b82f6' : project.status === 'Launched' ? '#22c55e' : project.status === 'Under Construction' ? '#f59e0b' : project.status === 'Near Completion' ? '#8b5cf6' : 'rgba(255, 255, 255, 0.5)'
  const availableUnits = project.totalUnits - project.soldUnits
  const priceVsAreaColor = project.priceVsAreaAvg >= 0 ? '#22c55e' : '#ef4444'
  const appealColor = project.investorAppeal === 'High' ? '#22c55e' : project.investorAppeal === 'Medium' ? '#3b82f6' : '#f59e0b'
  const yieldColor = project.rentalYieldEstimate >= 4 ? '#22c55e' : project.rentalYieldEstimate >= 3.5 ? '#3b82f6' : '#f59e0b'
  const growthColor = project.capitalGrowthEstimate >= 5 ? '#22c55e' : project.capitalGrowthEstimate >= 3 ? '#3b82f6' : '#f59e0b'

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ── */}
      <div className="flex-shrink-0 pb-3 border-b border-white/[0.04]">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-xl font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              {project.projectName}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-white/60">
              <span>{project.developer}</span>
              <span className="text-white/40">·</span>
              <AreaLink areaId={project.areaId}>{project.area}</AreaLink>
              <span className="text-white/40">·</span>
              <span className="uppercase tracking-wider">{project.reraNumber}</span>
            </div>
          </div>
          <div className="text-right">
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded inline-block"
              style={{ color: statusColor, background: statusColor + '12', border: `1px solid ${statusColor}20` }}
            >
              {project.status}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-white/70 mt-2">{project.usp}</p>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="space-y-4 p-0">

          {/* USP */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <p className="text-[10px] text-white/80">{project.usp}</p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5">
              <span className="text-[8px] text-white/40 uppercase tracking-wider block">Price Range</span>
              <span className="text-[12px] font-bold text-white tabular-nums mt-1">
                {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(project.priceFrom)}
              </span>
              <span className="text-[9px] text-white/60 tabular-nums block">
                to {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(project.priceTo)}
              </span>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5">
              <span className="text-[8px] text-white/40 uppercase tracking-wider block">Avg AED/sqft</span>
              <span className="text-[12px] font-bold text-white tabular-nums mt-1">
                {project.avgPriceSqft.toLocaleString()}
              </span>
              <span className="text-[9px] text-white/60 tabular-nums block" style={{ color: priceVsAreaColor }}>
                {formatPct(project.priceVsAreaAvg)} vs area
              </span>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5">
              <span className="text-[8px] text-white/40 uppercase tracking-wider block">Sold</span>
              <span className="text-[12px] font-bold text-white tabular-nums mt-1">
                {soldPct.toFixed(0)}%
              </span>
              <span className="text-[9px] text-white/60 tabular-nums block">
                {project.soldUnits} / {project.totalUnits} units
              </span>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5">
              <span className="text-[8px] text-white/40 uppercase tracking-wider block">Est. Completion</span>
              <span className="text-[12px] font-bold text-white tabular-nums mt-1">
                {project.estimatedCompletion}
              </span>
              <span className="text-[9px] text-white/60 block">
                Estimated Date
              </span>
            </div>
          </div>

          {/* Payment Plan */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <SectionHeader title="Payment Plan" subtitle={project.paymentPlan.name} />
            <div className="text-[9px] text-white/70 mb-2">{project.paymentPlan.downPayment}% down · {project.paymentPlan.duringConstruction}% construction · {project.paymentPlan.onHandover}% handover{project.paymentPlan.postHandover > 0 ? ` · ${project.paymentPlan.postHandover}% post-handover` : ''}</div>
            <PaymentTimeline milestones={project.paymentPlan.installments} />
          </div>

          {/* Unit Mix Table */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <SectionHeader title="Unit Mix" />
            <div className="overflow-x-auto">
              <table className="w-full text-[8px]">
                <thead className="border-b border-white/[0.04]">
                  <tr>
                    <th className="text-[8px] text-white/40 uppercase tracking-wider font-medium px-1 py-1 text-left">Type</th>
                    <th className="text-[8px] text-white/40 uppercase tracking-wider font-medium px-1 py-1 text-right">Count</th>
                    <th className="text-[8px] text-white/40 uppercase tracking-wider font-medium px-1 py-1 text-right">Size (sqft)</th>
                    <th className="text-[8px] text-white/40 uppercase tracking-wider font-medium px-1 py-1 text-right">From (AED)</th>
                    <th className="text-[8px] text-white/40 uppercase tracking-wider font-medium px-1 py-1 text-right">To (AED)</th>
                    <th className="text-[8px] text-white/40 uppercase tracking-wider font-medium px-1 py-1 text-right">AED/sqft</th>
                    <th className="text-[8px] text-white/40 uppercase tracking-wider font-medium px-1 py-1 text-right">Sold</th>
                    <th className="text-[8px] text-white/40 uppercase tracking-wider font-medium px-1 py-1 text-right">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {project.unitMix.map((ut: UnitMix) => (
                    <tr key={ut.type} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-1 py-1.5 text-white/80 font-medium">{ut.type}</td>
                      <td className="px-1 py-1.5 text-white/70 text-right tabular-nums">{ut.count}</td>
                      <td className="px-1 py-1.5 text-white/60 text-right tabular-nums">
                        {ut.sizeRange}
                      </td>
                      <td className="px-1 py-1.5 text-white/70 text-right tabular-nums font-medium">
                        {new Intl.NumberFormat('en-AE', { notation: 'compact' }).format(ut.priceFrom)}
                      </td>
                      <td className="px-1 py-1.5 text-white/70 text-right tabular-nums font-medium">
                        {new Intl.NumberFormat('en-AE', { notation: 'compact' }).format(ut.priceTo)}
                      </td>
                      <td className="px-1 py-1.5 text-white/70 text-right tabular-nums">
                        {ut.avgPriceSqft.toLocaleString()}
                      </td>
                      <td className="px-1 py-1.5 text-white/70 text-right tabular-nums">{ut.soldPct}%</td>
                      <td className="px-1 py-1.5 text-white/70 text-right tabular-nums font-medium">
                        {ut.availableCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Price Context */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5">
              <span className="text-[8px] text-white/40 uppercase tracking-wider block">Price vs Area</span>
              <span className="text-[11px] font-bold mt-1 block" style={{ color: priceVsAreaColor }}>
                {formatPct(project.priceVsAreaAvg)}
              </span>
              <span className="text-[8px] text-white/60 block mt-0.5">{project.areaAvgPriceSqft} avg in area</span>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5">
              <span className="text-[8px] text-white/40 uppercase tracking-wider block">Investor Appeal</span>
              <span className="text-[11px] font-bold mt-1 block" style={{ color: appealColor }}>
                {project.investorAppeal}
              </span>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5">
              <span className="text-[8px] text-white/40 uppercase tracking-wider block">Est. Rental Yield</span>
              <span className="text-[11px] font-bold mt-1 block tabular-nums" style={{ color: yieldColor }}>
                {project.rentalYieldEstimate}%
              </span>
            </div>
          </div>

          {/* Sales Velocity */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <SectionHeader title="Sales Velocity" />
            <div className="grid grid-cols-3 gap-2 text-[9px]">
              <div>
                <span className="text-white/40 block mb-1">Units/Month</span>
                <span className="text-lg font-bold text-white tabular-nums">{project.salesVelocity}</span>
              </div>
              <div>
                <span className="text-white/40 block mb-1">Total Sold</span>
                <span className="text-lg font-bold text-white tabular-nums">{project.soldUnits}</span>
              </div>
              <div>
                <span className="text-white/40 block mb-1">Available</span>
                <span className="text-lg font-bold text-white tabular-nums">{availableUnits}</span>
              </div>
            </div>
          </div>

          {/* Developer Card */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <SectionHeader title="Developer Profile" />
            {dev && (
              <div className="space-y-2 text-[9px]">
                <div className="flex justify-between items-start">
                  <span className="text-white/60">{dev.name}</span>
                  <span className="text-[8px] text-white/40">{dev.reraRating}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.04]">
                  <div>
                    <span className="text-white/40 block text-[8px] mb-0.5">RERA Rating</span>
                    <StarRating rating={dev.reraRating === 'Registered' ? 4 : 3} />
                  </div>
                  <div>
                    <span className="text-white/40 block text-[8px] mb-0.5">Quality Rating</span>
                    <StarRating rating={dev.qualityRating} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.04]">
                  <div>
                    <span className="text-white/40 block text-[8px]">On-Time Delivery</span>
                    <span className="text-white font-bold">{dev.onTimeDeliveryPct}%</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[8px]">Projects Delivered</span>
                    <span className="text-white font-bold">{dev.totalProjectsDelivered}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04]">
                  <span className="text-white/40 text-[8px]">Financial Stability</span>
                  <span
                    className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      color: dev.financialStability === 'Strong' ? '#22c55e' : dev.financialStability === 'Stable' ? '#3b82f6' : '#f59e0b',
                      background: (dev.financialStability === 'Strong' ? '#22c55e' : dev.financialStability === 'Stable' ? '#3b82f6' : '#f59e0b') + '12'
                    }}
                  >
                    {dev.financialStability}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Price History Chart */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <SectionHeader title="12-Month Price Trend (AED/sqft)" />
            <LineChart data={project.priceHistory} color="#d4a574" height={100} />
          </div>

          {/* Capital Growth & Yield */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5">
              <span className="text-[8px] text-white/40 uppercase tracking-wider block">Est. Capital Growth</span>
              <span className="text-[12px] font-bold text-white tabular-nums mt-1" style={{ color: growthColor }}>
                {formatPct(project.capitalGrowthEstimate)}
              </span>
              <span className="text-[8px] text-white/60 block">per annum</span>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5">
              <span className="text-[8px] text-white/40 uppercase tracking-wider block">Est. Rental Yield</span>
              <span className="text-[12px] font-bold text-white tabular-nums mt-1" style={{ color: yieldColor }}>
                {project.rentalYieldEstimate}%
              </span>
              <span className="text-[8px] text-white/60 block">gross per annum</span>
            </div>
          </div>

          {/* Amenities */}
          {project.amenities.length > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
              <SectionHeader title="Amenities" />
              <div className="flex flex-wrap gap-1">
                {project.amenities.map((amenity, i) => (
                  <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/60">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
