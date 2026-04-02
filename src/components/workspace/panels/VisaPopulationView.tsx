'use client'

import React from 'react'
import { useWorkspaceNav, AreaLink } from '../useWorkspaceNav'
import {
  visaData,
  populationData,
  type NationalityBreakdown,
  type VisaTypeBreakdown,
} from '@/lib/macroData'

// SVG Line Chart Component
function LineChart({
  data,
  labels,
  color = '#d4a574',
  width = 600,
  height = 120,
}: {
  data: number[]
  labels: string[]
  color?: string
  width?: number
  height?: number
}): JSX.Element {
  if (!data || data.length === 0) return <div className="text-white/40">No data</div>

  const padding = 40
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * chartWidth
    const y = padding + chartHeight - ((val - min) / range) * chartHeight
    return `${x},${y}`
  })

  const polylinePoints = points.join(' ')

  return (
    <svg width={width} height={height} className="w-full">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
        const y = padding + chartHeight * ratio
        return (
          <line
            key={`grid-${i}`}
            x1={padding}
            y1={y}
            x2={width - padding}
            y2={y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        )
      })}

      {/* Axis lines */}
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

      {/* Data line */}
      <polyline points={polylinePoints} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />

      {/* Data points */}
      {points.map((point, idx) => {
        const [x, y] = point.split(',').map(Number)
        return (
          <circle key={`point-${idx}`} cx={x} cy={y} r="3" fill={color} opacity="0.6" />
        )
      })}

      {/* Y-axis labels */}
      <text x={padding - 10} y={padding + 5} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.4)">
        {max.toLocaleString()}
      </text>
      <text x={padding - 10} y={height - padding + 5} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.4)">
        {min.toLocaleString()}
      </text>
    </svg>
  )
}

// SVG Bar Chart Component
function BarChart({
  data,
  labels,
  color = '#d4a574',
  width = 600,
  height = 120,
}: {
  data: number[]
  labels: string[]
  color?: string
  width?: number
  height?: number
}): JSX.Element {
  if (!data || data.length === 0) return <div className="text-white/40">No data</div>

  const padding = 40
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2
  const max = Math.max(...data)
  const barWidth = chartWidth / data.length * 0.8
  const barGap = chartWidth / data.length * 0.1

  return (
    <svg width={width} height={height} className="w-full">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
        const y = padding + chartHeight * ratio
        return (
          <line
            key={`grid-${i}`}
            x1={padding}
            y1={y}
            x2={width - padding}
            y2={y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        )
      })}

      {/* Axis lines */}
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

      {/* Bars */}
      {data.map((val, idx) => {
        const x = padding + (chartWidth / data.length) * idx + barGap
        const barHeight = (val / max) * chartHeight
        const y = height - padding - barHeight
        return (
          <g key={`bar-${idx}`}>
            <rect x={x} y={y} width={barWidth} height={barHeight} fill={color} opacity="0.7" />
            <text
              x={x + barWidth / 2}
              y={height - padding + 15}
              textAnchor="middle"
              fontSize="9"
              fill="rgba(255,255,255,0.4)"
            >
              {labels[idx] || ''}
            </text>
          </g>
        )
      })}

      {/* Y-axis labels */}
      <text x={padding - 10} y={padding + 5} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.4)">
        {max.toLocaleString()}
      </text>
      <text x={padding - 10} y={height - padding + 5} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.4)">
        0
      </text>
    </svg>
  )
}

// Horizontal Bar Component (for distributions)
function HorizontalBar({
  value,
  max,
  label,
  percentage,
  color = '#d4a574',
}: {
  value: number
  max: number
  label: string
  percentage: number
  color?: string
}): JSX.Element {
  const barWidth = (value / max) * 100

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-white/70">{label}</span>
        <span className="text-sm font-tabular-nums text-white/90">{value.toLocaleString()}</span>
      </div>
      <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${barWidth}%`,
            backgroundColor: color,
            opacity: 0.7,
          }}
        />
      </div>
      <div className="mt-1 text-xs text-white/40">{percentage.toFixed(1)}% of total</div>
    </div>
  )
}

// Key Metric Card
function MetricCard({
  label,
  value,
  suffix = '',
  badge,
  highlight = false,
}: {
  label: string
  value: string | number
  suffix?: string
  badge?: string
  highlight?: boolean
}): JSX.Element {
  return (
    <div
      className={`p-3 rounded-lg border flex flex-col justify-between h-full transition-all ${
        highlight
          ? 'bg-white/[0.05] border-white/[0.08]'
          : 'bg-white/[0.02] border-white/[0.04]'
      }`}
    >
      <div className="text-[8px] text-white/40 uppercase tracking-wider mb-2">{label}</div>
      <div className="flex items-baseline gap-1">
        <div className="text-xl font-semibold text-white/90 tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {suffix && <div className="text-xs text-white/60">{suffix}</div>}
      </div>
      {badge && (
        <div className="mt-2 text-xs text-emerald-400 font-medium">{badge}</div>
      )}
    </div>
  )
}

export default function VisaPopulationView(): JSX.Element {
  // Sample data structure - in production these come from visaData/populationData
  const totalPopulation = 3_680_000
  const populationGrowth = 4.2
  const newVisas12m = 180_000
  const goldenVisas12m = 68_000
  const homeOwnershipRate = 22
  const projected2030 = 5_200_000

  // Population trend data (12 quarters)
  const populationTrendData = [
    3_200_000, 3_250_000, 3_310_000, 3_380_000, 3_450_000, 3_520_000, 3_590_000,
    3_630_000, 3_680_000, 3_720_000, 3_760_000, 3_800_000,
  ]
  const populationTrendLabels = ['Q1', 'Q2', 'Q3', 'Q4', 'Q1', 'Q2', 'Q3', 'Q4', 'Q1', 'Q2', 'Q3', 'Q4']

  // Monthly new residents (12 months)
  const monthlyNewResidentsData = [
    14_200, 12_800, 15_600, 14_100, 16_200, 17_100, 18_500, 19_200, 17_800,
    16_900, 15_200, 13_100,
  ]
  const monthlyLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct',
    'Nov', 'Dec',
  ]

  // Top nationalities data
  const nationalityData: Array<{
    rank: number
    nationality: string
    residents: number
    percentTotal: number
    yoyGrowth: number
    avgBudget: number
    ownershipPct: number
    preferredAreas: Array<{ name: string; id: string }>
  }> = [
    {
      rank: 1,
      nationality: 'Indian',
      residents: 780_000,
      percentTotal: 21.2,
      yoyGrowth: 8.5,
      avgBudget: 450_000,
      ownershipPct: 18,
      preferredAreas: [
        { name: 'International City', id: 'INTCITY' },
        { name: 'Deira', id: 'DEIRA' },
      ],
    },
    {
      rank: 2,
      nationality: 'Pakistani',
      residents: 520_000,
      percentTotal: 14.1,
      yoyGrowth: 6.2,
      avgBudget: 380_000,
      ownershipPct: 15,
      preferredAreas: [
        { name: 'Deira', id: 'DEIRA' },
        { name: 'Bur Dubai', id: 'BURDUBAI' },
      ],
    },
    {
      rank: 3,
      nationality: 'Filipino',
      residents: 420_000,
      percentTotal: 11.4,
      yoyGrowth: 9.1,
      avgBudget: 320_000,
      ownershipPct: 12,
      preferredAreas: [
        { name: 'Deira', id: 'DEIRA' },
        { name: 'Al Manara', id: 'ALMANARA' },
      ],
    },
    {
      rank: 4,
      nationality: 'Egyptian',
      residents: 380_000,
      percentTotal: 10.3,
      yoyGrowth: 7.8,
      avgBudget: 340_000,
      ownershipPct: 14,
      preferredAreas: [
        { name: 'Deira', id: 'DEIRA' },
        { name: 'Bur Dubai', id: 'BURDUBAI' },
      ],
    },
    {
      rank: 5,
      nationality: 'Bangladeshi',
      residents: 280_000,
      percentTotal: 7.6,
      yoyGrowth: 5.4,
      avgBudget: 280_000,
      ownershipPct: 8,
      preferredAreas: [
        { name: 'International City', id: 'INTCITY' },
        { name: 'Sonapur', id: 'SONAPUR' },
      ],
    },
    {
      rank: 6,
      nationality: 'British',
      residents: 185_000,
      percentTotal: 5.0,
      yoyGrowth: 4.2,
      avgBudget: 1_200_000,
      ownershipPct: 42,
      preferredAreas: [
        { name: 'Palm Jumeirah', id: 'PLM' },
        { name: 'Emirates Hills', id: 'EMHILLS' },
      ],
    },
    {
      rank: 7,
      nationality: 'American',
      residents: 152_000,
      percentTotal: 4.1,
      yoyGrowth: 3.8,
      avgBudget: 1_400_000,
      ownershipPct: 45,
      preferredAreas: [
        { name: 'Downtown Dubai', id: 'DT' },
        { name: 'JBR', id: 'JBR' },
      ],
    },
    {
      rank: 8,
      nationality: 'Chinese',
      residents: 128_000,
      percentTotal: 3.5,
      yoyGrowth: 11.2,
      avgBudget: 680_000,
      ownershipPct: 28,
      preferredAreas: [
        { name: 'Dubai Marina', id: 'MARINA' },
        { name: 'Downtown Dubai', id: 'DT' },
      ],
    },
    {
      rank: 9,
      nationality: 'Canadian',
      residents: 94_000,
      percentTotal: 2.6,
      yoyGrowth: 2.9,
      avgBudget: 1_100_000,
      ownershipPct: 38,
      preferredAreas: [
        { name: 'Downtown Dubai', id: 'DT' },
        { name: 'Business Bay', id: 'BB' },
      ],
    },
    {
      rank: 10,
      nationality: 'German',
      residents: 76_000,
      percentTotal: 2.1,
      yoyGrowth: 1.5,
      avgBudget: 950_000,
      ownershipPct: 35,
      preferredAreas: [
        { name: 'JBR', id: 'JBR' },
        { name: 'Dubai Marina', id: 'MARINA' },
      ],
    },
  ]

  // Visa type breakdown
  const visaTypeBreakdown: Array<{
    type: string
    issued12m: number
    buyerPercentage: number
  }> = [
    { type: 'Golden Visa', issued12m: 68_000, buyerPercentage: 65 },
    { type: 'Investor Visa', issued12m: 42_000, buyerPercentage: 72 },
    { type: 'Freelance Visa', issued12m: 28_000, buyerPercentage: 35 },
    { type: 'Green Visa', issued12m: 15_000, buyerPercentage: 48 },
    { type: 'Retirement Visa', issued12m: 8_500, buyerPercentage: 52 },
  ]

  const maxVisaIssued = Math.max(...visaTypeBreakdown.map(v => v.issued12m))

  // Monthly golden visa trend
  const goldenVisaTrendData = [
    5_200, 4_800, 6_100, 5_900, 6_800, 7_200, 7_500, 7_900, 6_800, 6_100,
    5_400, 4_200,
  ]

  // Age distribution
  const ageDistribution = [
    { bracket: '18-25', count: 320_000, percentage: 8.7 },
    { bracket: '26-35', count: 1_280_000, percentage: 34.8 },
    { bracket: '36-45', count: 980_000, percentage: 26.6 },
    { bracket: '46-55', count: 580_000, percentage: 15.8 },
    { bracket: '56-65', count: 340_000, percentage: 9.2 },
    { bracket: '65+', count: 180_000, percentage: 4.9 },
  ]

  // Income distribution
  const incomeDistribution = [
    { bracket: '<2K AED', count: 580_000, percentage: 15.8, avgRent: 1_200 },
    {
      bracket: '2K-5K AED',
      count: 1_420_000,
      percentage: 38.6,
      avgRent: 2_800,
    },
    {
      bracket: '5K-10K AED',
      count: 1_180_000,
      percentage: 32.1,
      avgRent: 5_500,
    },
    { bracket: '10K+ AED', count: 500_000, percentage: 13.6, avgRent: 12_000 },
  ]

  const maxAge = Math.max(...ageDistribution.map(a => a.count))
  const maxIncome = Math.max(...incomeDistribution.map(i => i.count))

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white/[0.01] to-white/[0.005]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
        <h2
          className="text-2xl font-semibold text-white/90"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Visa & Population Intelligence
        </h2>
        <div className="flex items-baseline gap-3">
          <div className="text-right">
            <div className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
              Total Residents
            </div>
            <div className="text-xl tabular-nums text-[#d4a574] font-semibold">
              {(totalPopulation / 1_000_000).toFixed(2)}M
            </div>
          </div>
          <div className="text-emerald-400 text-sm font-medium">
            +{populationGrowth.toFixed(1)}% YoY
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
        {/* Key Metrics Strip */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          <MetricCard
            label="Total Residents"
            value={(totalPopulation / 1_000_000).toFixed(2)}
            suffix="M"
            highlight
          />
          <MetricCard
            label="New Visas 12M"
            value={(newVisas12m / 1000).toFixed(0)}
            suffix="K"
          />
          <MetricCard
            label="Golden Visas 12M"
            value={(goldenVisas12m / 1000).toFixed(0)}
            suffix="K"
            badge="65% Buy Property"
          />
          <MetricCard
            label="Home Ownership Rate"
            value={homeOwnershipRate}
            suffix="%"
          />
          <MetricCard
            label="Projected 2030"
            value={(projected2030 / 1_000_000).toFixed(1)}
            suffix="M"
            badge="41% Growth"
          />
        </div>

        {/* Population Trend Chart */}
        <div className="mb-6 p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-white/90">
              Population Trend (12 Quarters)
            </h3>
            <p className="text-xs text-white/40 mt-1">
              Growth rate: {((((populationTrendData[11] - populationTrendData[0]) / populationTrendData[0]) * 100) / 3).toFixed(1)}% quarterly avg
            </p>
          </div>
          <LineChart
            data={populationTrendData}
            labels={populationTrendLabels}
            color="#d4a574"
            width={560}
            height={140}
          />
        </div>

        {/* Monthly New Residents Chart */}
        <div className="mb-6 p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-white/90">
              Monthly New Residents (Last 12 Months)
            </h3>
            <p className="text-xs text-white/40 mt-1">
              Peak: {Math.max(...monthlyNewResidentsData).toLocaleString()} residents ({monthlyLabels[monthlyNewResidentsData.indexOf(Math.max(...monthlyNewResidentsData))]}),
              Avg: {(monthlyNewResidentsData.reduce((a, b) => a + b) / monthlyNewResidentsData.length).toFixed(0).toLocaleString()}/mo
            </p>
          </div>
          <BarChart
            data={monthlyNewResidentsData}
            labels={monthlyLabels}
            color="#d4a574"
            width={560}
            height={140}
          />
        </div>

        {/* Nationality Leaderboard */}
        <div className="mb-6 p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <h3 className="text-sm font-semibold text-white/90 mb-3">
            Top 10 Nationalities
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left py-2 px-2 text-[8px] text-white/40 uppercase tracking-wider font-semibold">
                    Rank
                  </th>
                  <th className="text-left py-2 px-2 text-[8px] text-white/40 uppercase tracking-wider font-semibold">
                    Nationality
                  </th>
                  <th className="text-right py-2 px-2 text-[8px] text-white/40 uppercase tracking-wider font-semibold">
                    Residents
                  </th>
                  <th className="text-right py-2 px-2 text-[8px] text-white/40 uppercase tracking-wider font-semibold">
                    % Total
                  </th>
                  <th className="text-right py-2 px-2 text-[8px] text-white/40 uppercase tracking-wider font-semibold">
                    YoY Growth
                  </th>
                  <th className="text-right py-2 px-2 text-[8px] text-white/40 uppercase tracking-wider font-semibold">
                    Avg Budget
                  </th>
                  <th className="text-right py-2 px-2 text-[8px] text-white/40 uppercase tracking-wider font-semibold">
                    Own %
                  </th>
                  <th className="text-left py-2 px-2 text-[8px] text-white/40 uppercase tracking-wider font-semibold">
                    Preferred Areas
                  </th>
                </tr>
              </thead>
              <tbody>
                {nationalityData.map((row) => (
                  <tr
                    key={row.rank}
                    className={`border-b border-white/[0.04] transition-colors hover:bg-white/[0.05] ${
                      row.rank <= 3 ? 'bg-white/[0.03]' : ''
                    }`}
                  >
                    <td className="py-2 px-2 tabular-nums text-white/90 font-semibold">
                      {row.rank}
                    </td>
                    <td
                      className={`py-2 px-2 text-white/90 font-medium ${
                        row.rank <= 3 ? 'text-[#d4a574]' : ''
                      }`}
                    >
                      {row.nationality}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-white/70">
                      {row.residents.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-white/70">
                      {row.percentTotal.toFixed(1)}%
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-emerald-400">
                      +{row.yoyGrowth.toFixed(1)}%
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-white/70">
                      {row.avgBudget.toLocaleString()} AED
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-white/70">
                      {row.ownershipPct}%
                    </td>
                    <td className="py-2 px-2 text-left text-white/70">
                      <div className="flex gap-2 flex-wrap">
                        {row.preferredAreas.map((area, idx) => (
                          <AreaLink key={idx} areaId={area.id}>
                            {area.name}
                          </AreaLink>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Visa Type Breakdown */}
        <div className="mb-6 p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <h3 className="text-sm font-semibold text-white/90 mb-4">
            Visa Type Breakdown (12 Months)
          </h3>
          <div className="space-y-4">
            {visaTypeBreakdown.map((visa) => (
              <div key={visa.type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/70">{visa.type}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white/90 tabular-nums">
                      {(visa.issued12m / 1000).toFixed(1)}K issued
                    </span>
                    <span className="text-xs text-emerald-400">
                      {visa.buyerPercentage}% buy property
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(visa.issued12m / maxVisaIssued) * 100}%`,
                      backgroundColor: '#d4a574',
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Golden Visa Trend */}
        <div className="mb-6 p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-white/90">
              Monthly Golden Visa Issuance (12 Months)
            </h3>
            <p className="text-xs text-white/40 mt-1">
              Avg: {(goldenVisaTrendData.reduce((a, b) => a + b) / goldenVisaTrendData.length).toFixed(0).toLocaleString()}/mo,
              Peak: {Math.max(...goldenVisaTrendData).toLocaleString()}
            </p>
          </div>
          <LineChart
            data={goldenVisaTrendData}
            labels={monthlyLabels}
            color="#d4a574"
            width={560}
            height={140}
          />
        </div>

        {/* Demographics Snapshot */}
        <div className="mb-6 grid grid-cols-2 gap-6">
          {/* Age Distribution */}
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <h3 className="text-sm font-semibold text-white/90 mb-4">
              Age Distribution
            </h3>
            <div className="space-y-3">
              {ageDistribution.map((age) => (
                <HorizontalBar
                  key={age.bracket}
                  value={age.count}
                  max={maxAge}
                  label={age.bracket}
                  percentage={age.percentage}
                  color="#d4a574"
                />
              ))}
            </div>
          </div>

          {/* Income Distribution */}
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <h3 className="text-sm font-semibold text-white/90 mb-4">
              Income Distribution
            </h3>
            <div className="space-y-3">
              {incomeDistribution.map((income) => (
                <div key={income.bracket}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white/70">{income.bracket}</span>
                    <span className="text-xs text-white/40">
                      Avg rent: {income.avgRent.toLocaleString()} AED/mo
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(income.count / maxIncome) * 100}%`,
                        backgroundColor: '#d4a574',
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <div className="text-xs text-white/40">
                    {income.count.toLocaleString()} residents ({income.percentage.toFixed(1)}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Population Projections */}
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04] mb-6">
          <h3 className="text-sm font-semibold text-white/90 mb-4">
            Population Projections
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Current (2025)</span>
                <span className="text-lg font-semibold text-white/90 tabular-nums">
                  {(totalPopulation / 1_000_000).toFixed(2)}M
                </span>
              </div>
              <div className="w-full h-3 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: '71%',
                    backgroundColor: '#d4a574',
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Projected (2030)</span>
                <span className="text-lg font-semibold text-emerald-400 tabular-nums">
                  {(projected2030 / 1_000_000).toFixed(1)}M
                </span>
              </div>
              <div className="w-full h-3 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: '100%',
                    backgroundColor: '#d4a574',
                    opacity: 0.7,
                  }}
                />
              </div>
              <div className="mt-2 text-xs text-emerald-400 font-medium">
                + {((((projected2030 - totalPopulation) / totalPopulation) * 100)).toFixed(1)}% growth over 5 years
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
