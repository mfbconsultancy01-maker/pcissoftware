import { emergingAreaSignals, type EmergingAreaSignal } from '@/lib/signalsData'
import { useWorkspaceNav, AreaLink } from '../useWorkspaceNav'

function Sparkline({
  data,
  color,
  width = 80,
  height = 24,
}: {
  data: number[]
  color: string
  width?: number
  height?: number
}) {
  if (!data.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data
    .map((v: number, i: number) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * (height - 2) - 1
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PhaseLabel({ phase }: { phase: string }): JSX.Element {
  const phaseStyles: Record<string, string> = {
    discovery: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
    'early-growth': 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    acceleration: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    maturing: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
  }

  return (
    <span className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider ${phaseStyles[phase] || phaseStyles.discovery}`}>
      {phase.replace('-', ' ')}
    </span>
  )
}

function PhasePipeline(): JSX.Element {
  const phases = ['discovery', 'early-growth', 'acceleration', 'maturing'] as const
  const phaseCounts = phases.reduce(
    (acc: Record<string, number>, phase: string) => {
      acc[phase] = emergingAreaSignals.filter((a: EmergingAreaSignal) => a.phase === phase).length
      return acc
    },
    {}
  )

  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-6 mb-6">
      <h3 className="text-white/70 text-xs uppercase tracking-wider mb-4">Phase Pipeline</h3>
      <div className="flex items-center justify-between">
        {phases.map((phase: string, idx: number) => (
          <div key={phase} className="flex items-center">
            <div className="text-center">
              <div className="text-[32px] text-[#d4a574] font-semibold">
                {phaseCounts[phase] || 0}
              </div>
              <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">
                {phase.replace('-', ' ')}
              </div>
            </div>
            {idx < phases.length - 1 && (
              <div className="mx-6 text-white/30 text-xl">→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PriceGapBar({
  current,
  comparable,
}: {
  current: number
  comparable: number
}): JSX.Element {
  const gap = ((current - comparable) / comparable) * 100
  const isNegative = gap < 0
  const absGap = Math.abs(gap)

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-white/70">Current vs Comparable</span>
        <span className={isNegative ? 'text-emerald-400' : 'text-orange-400'}>
          {isNegative ? '−' : '+'}
          {absGap.toFixed(1)}%
        </span>
      </div>
      <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
        <div
          className={`h-full ${isNegative ? 'bg-emerald-500/60' : 'bg-orange-500/60'}`}
          style={{ width: `${Math.min(100, (absGap / 200) * 100)}%` }}
        />
      </div>
    </div>
  )
}

function AreaCard({ area }: { area: EmergingAreaSignal }): JSX.Element {
  const nav = useWorkspaceNav()

  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-6 mb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 pb-4 border-b border-white/[0.04]">
        <div>
          <h3 className="text-lg text-white/90 font-semibold">{area.area}</h3>
          <div className="text-[8px] text-white/40 uppercase tracking-wider mt-1">
            Emerging Score
          </div>
        </div>
        <div className="text-right">
          <div className="text-[28px] text-[#d4a574] font-semibold">{area.emergingScore}</div>
          <div className="mt-2">
            <PhaseLabel phase={area.phase} />
          </div>
        </div>
      </div>

      {/* Price and Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div>
          <div className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
            Current Price/sqft
          </div>
          <div className="text-white/90 font-semibold">{area.currentPriceSqft}</div>
        </div>
        <div>
          <div className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
            Comparable Area
          </div>
          <div className="text-white/90 font-semibold">{area.comparableAreaPrice}</div>
        </div>
        <div>
          <div className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
            Price Gap
          </div>
          <div className="text-emerald-400 font-semibold">
            {(
              ((area.currentPriceSqft - area.comparableAreaPrice) /
                area.comparableAreaPrice) *
              100
            ).toFixed(1)}
            %
          </div>
        </div>
        <div>
          <div className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
            Projected 12m
          </div>
          <div className="text-orange-400 font-semibold">{area.projectedAppreciation12m}</div>
        </div>
      </div>

      {/* Price Gap Bar */}
      <div className="mb-6">
        <PriceGapBar
          current={area.currentPriceSqft}
          comparable={area.comparableAreaPrice}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="text-[8px] text-white/40 uppercase tracking-wider mb-2">
            Price Movement (12m)
          </div>
          <div className="flex items-center justify-center h-8">
            <Sparkline data={area.priceHistory} color="#d4a574" width={120} height={24} />
          </div>
        </div>
        <div>
          <div className="text-[8px] text-white/40 uppercase tracking-wider mb-2">
            Volume Movement (12m)
          </div>
          <div className="flex items-center justify-center h-8">
            <Sparkline
              data={area.volumeHistory}
              color="#10b981"
              width={120}
              height={24}
            />
          </div>
        </div>
      </div>

      {/* Drivers and Risks */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="text-[8px] text-white/40 uppercase tracking-wider mb-2">Catalysts</div>
          <ul className="text-[13px] text-white/70 space-y-1">
            {area.catalysts.map((catalyst: string, idx: number) => (
              <li key={idx} className="flex items-start">
                <span className="text-[#d4a574] mr-2">◆</span>
                <span>{catalyst}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[8px] text-white/40 uppercase tracking-wider mb-2">
            Infrastructure
          </div>
          <ul className="text-[13px] text-white/70 space-y-1">
            {area.infrastructure.map((item: string, idx: number) => (
              <li key={idx} className="flex items-start">
                <span className="text-blue-400 mr-2">●</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="text-[8px] text-white/40 uppercase tracking-wider mb-2">
            Demand Drivers
          </div>
          <ul className="text-[13px] text-white/70 space-y-1">
            {area.demandDrivers.map((driver: string, idx: number) => (
              <li key={idx} className="flex items-start">
                <span className="text-emerald-400 mr-2">★</span>
                <span>{driver}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[8px] text-white/40 uppercase tracking-wider mb-2">Risks</div>
          <ul className="text-[13px] text-white/70 space-y-1">
            {area.risks.map((risk: string, idx: number) => (
              <li key={idx} className="flex items-start">
                <span className="text-red-400 mr-2">◆</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Velocity and Comparable */}
      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/[0.04]">
        <div>
          <div className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
            Price Velocity
          </div>
          <div className="text-white/90 font-semibold text-sm">{area.priceVelocity}</div>
          <div className="text-[8px] text-white/50 mt-1">Volume Velocity: {area.volumeVelocity}</div>
        </div>
        <div>
          <div className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
            Compared To
          </div>
          <div
            className="text-[#d4a574] font-semibold text-sm cursor-pointer hover:underline"
            onClick={() => nav.openArea(area.areaId)}
          >
            {area.comparableArea}
          </div>
        </div>
      </div>
    </div>
  )
}

function ComparisonTable(): JSX.Element {
  const sortedAreas = [...emergingAreaSignals].sort(
    (a: EmergingAreaSignal, b: EmergingAreaSignal) => b.emergingScore - a.emergingScore
  )

  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-6 mt-6">
      <h3 className="text-white/70 text-xs uppercase tracking-wider mb-4">
        Comparison Overview
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="text-left text-white/50 py-2 px-2">Area</th>
              <th className="text-left text-white/50 py-2 px-2">Phase</th>
              <th className="text-center text-white/50 py-2 px-2">Score</th>
              <th className="text-right text-white/50 py-2 px-2">Price/sqft</th>
              <th className="text-right text-white/50 py-2 px-2">Gap vs Comp</th>
              <th className="text-right text-white/50 py-2 px-2">Proj 12m</th>
              <th className="text-right text-white/50 py-2 px-2">Vol Velocity</th>
            </tr>
          </thead>
          <tbody>
            {sortedAreas.map((area: EmergingAreaSignal) => (
              <tr key={area.area} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="py-3 px-2 text-white/90">{area.area}</td>
                <td className="py-3 px-2">
                  <span className="text-[8px] uppercase tracking-wider text-white/60">
                    {area.phase.replace('-', ' ')}
                  </span>
                </td>
                <td className="py-3 px-2 text-center text-[#d4a574] font-semibold">
                  {area.emergingScore}
                </td>
                <td className="py-3 px-2 text-right text-white/90">{area.currentPriceSqft}</td>
                <td className="py-3 px-2 text-right text-emerald-400">
                  {(
                    ((area.currentPriceSqft - area.comparableAreaPrice) /
                      area.comparableAreaPrice) *
                    100
                  ).toFixed(1)}
                  %
                </td>
                <td className="py-3 px-2 text-right text-orange-400">{area.projectedAppreciation12m}</td>
                <td className="py-3 px-2 text-right text-white/70">{area.volumeVelocity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function EmergingAreasView(): JSX.Element {
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white/[0.01] to-transparent">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.04]">
        <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl text-white/90 mb-1">
          Emerging Areas
        </h1>
        <p className="text-sm text-white/60">Growth-Phase Market Detection</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6">
        {/* Phase Pipeline */}
        <PhasePipeline />

        {/* Area Cards */}
        <div className="mb-6">
          <h2 className="text-white/70 text-xs uppercase tracking-wider mb-4">
            Deep-Dive Analysis
          </h2>
          {emergingAreaSignals
            .sort((a: EmergingAreaSignal, b: EmergingAreaSignal) => b.emergingScore - a.emergingScore)
            .map((area: EmergingAreaSignal) => (
              <AreaCard key={area.area} area={area} />
            ))}
        </div>

        {/* Comparison Table */}
        <ComparisonTable />
      </div>
    </div>
  )
}
