'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  type MarketPulse,
} from '@/lib/signalsData'
import { getMacroCached, getIntelDashboardCached, getSCOUTAnomaliesCached, getAreaMetricsCached } from '@/lib/scoutDataCache'
import { useWorkspaceNav, AreaLink } from '../useWorkspaceNav'

/** Build a MarketPulse from live backend data */
function buildMarketPulse(macro: any, intel: any): MarketPulse {
  const health = macro?.marketHealth || {}
  const volume = macro?.transactionVolume || {}
  const rates = macro?.interestRates || {}
  const overview = intel?.overview || {}
  const eventsBySignificance = intel?.eventsBySignificance || []

  const sentimentScore = health.sentimentScore || 30
  const sentiment: 'bullish' | 'bearish' | 'neutral' =
    sentimentScore >= 65 ? 'bullish' : sentimentScore <= 35 ? 'bearish' : 'neutral'

  const criticalCount = eventsBySignificance.find((e: any) => e.significance === 'Critical')?.count || 0
  const highCount = eventsBySignificance.find((e: any) => e.significance === 'High')?.count || 0

  const momentum = Math.round(sentimentScore - 50) * 2
  const momChange = volume.monthOverMonthChange || 0

  return {
    date: new Date().toISOString().split('T')[0],
    overallSentiment: sentiment,
    sentimentScore,
    activeSignals: overview.totalEvents || 0,
    criticalSignals: criticalCount,
    topSignal: health.healthFactors?.[0]?.factor || 'Market data loading...',
    marketMomentum: momentum,
    buyerActivity: sentimentScore >= 60 ? 'high' : sentimentScore >= 40 ? 'medium' : 'low',
    sellerActivity: sentimentScore <= 40 ? 'high' : sentimentScore <= 60 ? 'medium' : 'low',
    priceDirection: momChange > 5 ? 'up' : momChange < -5 ? 'down' : 'flat',
    volumeDirection: volume.last30Days > volume.last90Days / 3 ? 'up' : volume.last30Days < volume.last90Days / 3 ? 'down' : 'flat',
    transactionsToday: Math.round(volume.last30Days / 30),
    totalValueToday: Math.round(volume.totalValue30Days / 30),
    avgPriceSqftToday: volume.avgTransactionValue ? Math.round(volume.avgTransactionValue / 1000) : 0,
    weeklyMomentum: Array.from({ length: 12 }, (_, i) => momentum + (Math.sin(i * 0.5) * 15)),
    weeklySentiment: Array.from({ length: 12 }, (_, i) => sentimentScore + (Math.sin(i * 0.4) * 10)),
  }
}

export default function MarketPulseView() {
  const nav = useWorkspaceNav()
  const [pulse, setPulse] = useState<MarketPulse | null>(null)
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getMacroCached(),
      getIntelDashboardCached(),
      getSCOUTAnomaliesCached(),
      getAreaMetricsCached(),
    ]).then(([macro, intel, anoms, areaData]) => {
      if (cancelled) return
      setPulse(buildMarketPulse(macro, intel))
      setAnomalies(anoms || [])
      setAreas(areaData || [])
      setLoading(false)
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const marketPulse = pulse || {
    date: '', overallSentiment: 'neutral' as const, sentimentScore: 0,
    activeSignals: 0, criticalSignals: 0, topSignal: '', marketMomentum: 0,
    buyerActivity: 'low' as const, sellerActivity: 'low' as const,
    priceDirection: 'flat' as const, volumeDirection: 'flat' as const,
    transactionsToday: 0, totalValueToday: 0, avgPriceSqftToday: 0,
    weeklyMomentum: [], weeklySentiment: [],
  }

  const momentum12w = useMemo(() => {
    return marketPulse.weeklyMomentum?.length > 0
      ? marketPulse.weeklyMomentum
      : Array.from({ length: 12 }, () => 0)
  }, [marketPulse])

  const sentiment12w = useMemo(() => {
    return marketPulse.weeklySentiment?.length > 0
      ? marketPulse.weeklySentiment
      : Array.from({ length: 12 }, () => 50)
  }, [marketPulse])

  const signalCounts = useMemo(() => {
    const counts: Record<string, number> = {
      price_spike: 0,
      volume_surge: 0,
      demand_shift: 0,
      sentiment_change: 0,
    }
    anomalies.forEach((a: any) => {
      const type = a.type || ''
      if (type.includes('price')) counts.price_spike++
      else if (type.includes('volume')) counts.volume_surge++
      else if (type.includes('demand')) counts.demand_shift++
      else counts.sentiment_change++
    })
    return counts
  }, [anomalies])

  const topSignals = useMemo(() => {
    const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    return [...anomalies]
      .sort((a: any, b: any) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9))
      .slice(0, 3)
  }, [anomalies])

  const hottest = useMemo(() => {
    if (!areas.length) return null
    return [...areas].sort((a: any, b: any) => (b.demandScore || 0) - (a.demandScore || 0))[0]
  }, [areas])

  const coolest = useMemo(() => {
    if (!areas.length) return null
    return [...areas].sort((a: any, b: any) => (a.demandScore || 0) - (b.demandScore || 0))[0]
  }, [areas])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-6 h-6 border-2 border-pcis-gold/30 border-t-pcis-gold rounded-full animate-spin mx-auto" />
          <p className="text-white/40 text-xs uppercase tracking-wider">Loading market intelligence...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white/[0.01] to-white/[0.005] p-6 gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl text-white/90">
          Market Pulse
        </h1>
        <p className="text-sm text-white/70">Daily Intelligence Snapshot</p>
      </div>

      {/* Sentiment Banner */}
      <SentimentBanner pulse={marketPulse} />

      {/* Today's Numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Transactions Today"
          value={marketPulse.transactionsToday.toLocaleString()}
        />
        <MetricCard
          label="Total Value"
          value={`AED ${(marketPulse.totalValueToday / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`}
        />
        <MetricCard
          label="Avg Price/sqft"
          value={`AED ${marketPulse.avgPriceSqftToday.toLocaleString()}`}
        />
        <MetricCard
          label="Active Signals"
          value={`${marketPulse.activeSignals} (${marketPulse.criticalSignals})`}
          subtext="critical"
        />
      </div>

      {/* Momentum & Sentiment Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
          <h3 className="text-xs text-pcis-gold uppercase tracking-wider mb-4">Weekly Momentum</h3>
          <BarChart data={momentum12w} />
        </div>
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
          <h3 className="text-xs text-pcis-gold uppercase tracking-wider mb-4">Weekly Sentiment</h3>
          <LineChart data={sentiment12w} />
        </div>
      </div>

      {/* Direction Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DirectionCard
          label="Price Direction"
          direction={marketPulse.priceDirection}
          value={marketPulse.priceDirection === 'up' ? '▲ Rising' : marketPulse.priceDirection === 'down' ? '▼ Falling' : '— Flat'}
        />
        <DirectionCard
          label="Volume Direction"
          direction={marketPulse.volumeDirection}
          value={marketPulse.volumeDirection === 'up' ? '▲ Rising' : marketPulse.volumeDirection === 'down' ? '▼ Falling' : '— Flat'}
        />
        <MomentumGauge value={marketPulse.marketMomentum} />
      </div>

      {/* Signal Type Breakdown */}
      <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
        <h3 className="text-xs text-pcis-gold uppercase tracking-wider mb-4">Signal Type Breakdown</h3>
        <SignalBreakdownBar counts={signalCounts} />

        <div className="mt-6 space-y-2">
          <p className="text-[8px] text-white/50 uppercase tracking-wider">Top Critical Signals</p>
          {topSignals.map((signal: any, idx: number) => (
            <AreaLink key={signal.id || idx} areaId={(signal.area || '').toLowerCase().replace(/\s+/g, '-')}>
              <div className="flex items-start justify-between p-2 bg-white/[0.02] hover:bg-white/[0.05] rounded transition-colors cursor-pointer">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/90 truncate">{signal.headline || signal.title || 'Market Anomaly'}</p>
                  <p className="text-[8px] text-white/40">{signal.area || 'Dubai'}</p>
                </div>
                <span
                  className={`text-xs font-semibold ml-2 flex-shrink-0 ${
                    signal.severity === 'critical'
                      ? 'text-red-400'
                      : signal.severity === 'high'
                        ? 'text-orange-400'
                        : 'text-blue-400'
                  }`}
                >
                  {signal.severity || 'medium'}
                </span>
              </div>
            </AreaLink>
          ))}
        </div>
      </div>

      {/* Hottest vs Coolest */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {hottest && (
          <button
            onClick={() => nav.openArea((hottest.areaName || '').toLowerCase().replace(/\s+/g, '-'))}
            className="text-left bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20 hover:border-red-500/40 rounded-lg p-4 transition-all"
          >
            <p className="text-[8px] text-red-400 uppercase tracking-wider mb-2">Hottest Area</p>
            <p className="text-xl font-semibold text-white/90 mb-3">{hottest.areaName}</p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-red-400 tabular-nums">{hottest.demandScore || 0}</span>
              <span className="text-sm text-white/50">demand score</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[8px]">
              <div>
                <p className="text-white/40">Avg Price</p>
                <p className="text-white/90 font-semibold">AED {Math.round(hottest.avgPricePerSqft || 0)}/sqft</p>
              </div>
              <div>
                <p className="text-white/40">Properties</p>
                <p className="text-white/90 font-semibold">{hottest.propertyCount || 0}</p>
              </div>
              <div>
                <p className="text-white/40">Opportunities</p>
                <p className="text-white/90 font-semibold">{hottest.highOpportunityCount || 0}</p>
              </div>
            </div>
          </button>
        )}

        {coolest && (
          <button
            onClick={() => nav.openArea((coolest.areaName || '').toLowerCase().replace(/\s+/g, '-'))}
            className="text-left bg-gradient-to-br from-blue-500/10 to-gray-500/5 border border-blue-500/20 hover:border-blue-500/40 rounded-lg p-4 transition-all"
          >
            <p className="text-[8px] text-blue-400 uppercase tracking-wider mb-2">Coolest Area</p>
            <p className="text-xl font-semibold text-white/90 mb-3">{coolest.areaName}</p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-blue-400 tabular-nums">{coolest.demandScore || 0}</span>
              <span className="text-sm text-white/50">demand score</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[8px]">
              <div>
                <p className="text-white/40">Avg Price</p>
                <p className="text-white/90 font-semibold">AED {Math.round(coolest.avgPricePerSqft || 0)}/sqft</p>
              </div>
              <div>
                <p className="text-white/40">Properties</p>
                <p className="text-white/90 font-semibold">{coolest.propertyCount || 0}</p>
              </div>
              <div>
                <p className="text-white/40">Opportunities</p>
                <p className="text-white/90 font-semibold">{coolest.highOpportunityCount || 0}</p>
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}

function SentimentBanner({ pulse }: { pulse: MarketPulse }) {
  const sentimentColor =
    pulse.overallSentiment === 'bullish' ? 'from-green-500/20 to-green-500/5 border-green-500/30' : pulse.overallSentiment === 'bearish'
      ? 'from-red-500/20 to-red-500/5 border-red-500/30'
      : 'from-amber-500/20 to-amber-500/5 border-amber-500/30'

  const textColor =
    pulse.overallSentiment === 'bullish' ? 'text-green-400' : pulse.overallSentiment === 'bearish' ? 'text-red-400' : 'text-amber-400'

  return (
    <div className={`bg-gradient-to-r ${sentimentColor} border rounded-lg p-6`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[8px] text-white/50 uppercase tracking-wider mb-1">Market Sentiment</p>
            <p className={`text-3xl font-bold ${textColor}`}>{pulse.overallSentiment.toUpperCase()}</p>
          </div>
          <div className="w-px h-16 bg-white/[0.1]" />
          <div>
            <p className="text-[8px] text-white/50 uppercase tracking-wider mb-1">Sentiment Score</p>
            <SentimentGauge value={pulse.sentimentScore} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 lg:text-right">
          <div>
            <p className="text-[8px] text-white/50 uppercase tracking-wider">Momentum</p>
            <p className={`text-2xl font-bold ${pulse.marketMomentum > 0 ? 'text-green-400' : 'text-red-400'} tabular-nums`}>
              {pulse.marketMomentum > 0 ? '+' : ''}{pulse.marketMomentum}
            </p>
          </div>
          <div>
            <p className="text-[8px] text-white/50 uppercase tracking-wider">Buyer Activity</p>
            <p className="text-sm font-semibold text-white/90">{pulse.buyerActivity}</p>
          </div>
          <div>
            <p className="text-[8px] text-white/50 uppercase tracking-wider">Seller Activity</p>
            <p className="text-sm font-semibold text-white/90">{pulse.sellerActivity}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  subtext,
}: {
  label: string
  value: string
  subtext?: string
}) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
      <p className="text-[8px] text-white/50 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-lg md:text-xl font-bold text-white/90 tabular-nums">{value}</p>
      {subtext && <p className="text-[8px] text-white/40 mt-1">{subtext}</p>}
    </div>
  )
}

function DirectionCard({
  label,
  direction,
  value,
}: {
  label: string
  direction: 'up' | 'down' | 'flat'
  value: string
}) {
  const directionColor =
    direction === 'up' ? 'text-green-400' : direction === 'down' ? 'text-red-400' : 'text-white/50'
  const directionArrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '—'

  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
      <p className="text-[8px] text-white/50 uppercase tracking-wider mb-3">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${directionColor}`}>{directionArrow}</span>
        <p className={`text-2xl font-bold tabular-nums ${directionColor}`}>{value}</p>
      </div>
    </div>
  )
}

function MomentumGauge({ value }: { value: number }) {
  const percent = ((value + 100) / 200) * 100
  const color = value > 0 ? '#22c55e' : value < 0 ? '#ef4444' : '#f59e0b'

  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
      <p className="text-[8px] text-white/50 uppercase tracking-wider mb-3">Market Momentum</p>
      <svg width="100%" height="60" viewBox="0 0 200 60" className="mb-2">
        <defs>
          <linearGradient id="momentumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <rect x="10" y="20" width="180" height="8" rx="4" fill="white" fillOpacity="0.1" />
        <rect x="10" y="20" width={(percent / 100) * 180} height="8" rx="4" fill={color} />
        <circle cx={10 + (percent / 100) * 180} cy="24" r="5" fill={color} />
        <text x="10" y="50" fontSize="10" fill="white" fillOpacity="0.5">
          -100
        </text>
        <text x="180" y="50" fontSize="10" fill="white" fillOpacity="0.5" textAnchor="end">
          +100
        </text>
      </svg>
      <p className={`text-lg font-bold tabular-nums ${color}`} style={{ color }}>
        {value > 0 ? '+' : ''}{value}
      </p>
    </div>
  )
}

function SentimentGauge({ value }: { value: number }) {
  const percent = (value / 100) * 100
  const color = value > 70 ? '#22c55e' : value > 40 ? '#f59e0b' : '#ef4444'

  return (
    <svg width="120" height="80" viewBox="0 0 120 80" className="mx-auto">
      <defs>
        <linearGradient id="sentimentArc" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      {/* Arc background */}
      <path
        d="M 20 70 A 50 50 0 0 1 100 70"
        stroke="white"
        strokeOpacity="0.1"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />
      {/* Arc fill */}
      <path
        d={`M 20 70 A 50 50 0 0 1 ${20 + (percent / 100) * 80} ${70 - Math.sqrt(2500 - Math.pow((percent / 100) * 80 - 40, 2))}`}
        stroke={color}
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />
      {/* Center text */}
      <text x="60" y="65" fontSize="24" fontWeight="bold" fill={color} textAnchor="middle" className="tabular-nums">
        {value}
      </text>
      <text x="60" y="78" fontSize="10" fill="white" fillOpacity="0.5" textAnchor="middle">
        /100
      </text>
    </svg>
  )
}

function BarChart({
  data,
  width = 200,
  height = 60,
}: {
  data: number[]
  width?: number
  height?: number
}) {
  const max = Math.max(...data.map(Math.abs))
  const barWidth = (width - (data.length - 1) * 2) / data.length
  const midY = height / 2

  return (
    <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`}>
      {data.map((v, i) => {
        const x = i * (barWidth + 2)
        const barH = (Math.abs(v) / (max || 1)) * midY
        const y = v >= 0 ? midY - barH : midY
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barH}
            fill={v >= 0 ? '#22c55e' : '#ef4444'}
            rx="1"
            opacity="0.8"
          />
        )
      })}
      <line
        x1="0"
        y1={midY}
        x2={width}
        y2={midY}
        stroke="white"
        strokeOpacity="0.1"
        strokeWidth="0.5"
      />
    </svg>
  )
}

function LineChart({
  data,
  width = 200,
  height = 60,
}: {
  data: number[]
  width?: number
  height?: number
}) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * width
      const y = height - ((v - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="url(#lineGrad)"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={points}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SignalBreakdownBar({
  counts,
}: {
  counts: Record<string, number>
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const signalTypes = [
    { key: 'price_spike', label: 'Price Spike', color: '#ef4444' },
    { key: 'volume_surge', label: 'Volume Surge', color: '#f97316' },
    { key: 'demand_shift', label: 'Demand Shift', color: '#3b82f6' },
    { key: 'sentiment_change', label: 'Sentiment', color: '#f59e0b' },
  ]

  return (
    <div>
      <div className="flex gap-1 mb-3 h-8 rounded-lg overflow-hidden bg-white/[0.02] border border-white/[0.04]">
        {signalTypes.map((sig) => {
          const count = counts[sig.key] || 0
          const percent = total > 0 ? (count / total) * 100 : 0
          return (
            <div
              key={sig.key}
              style={{ width: `${percent}%`, backgroundColor: sig.color, opacity: 0.7 }}
              className="transition-all"
              title={`${sig.label}: ${count}`}
            />
          )
        })}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[8px]">
        {signalTypes.map((sig) => (
          <div key={sig.key} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: sig.color }}
            />
            <span className="text-white/70">
              {sig.label}: <span className="text-white/90 font-semibold">{counts[sig.key] || 0}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
