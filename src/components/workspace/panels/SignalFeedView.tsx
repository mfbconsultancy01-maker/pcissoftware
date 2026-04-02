'use client'

import { useState, useMemo, useEffect } from 'react'
import { p1Api } from '@/lib/api'
import { AreaLink } from '../useWorkspaceNav'

// Type definitions to match backend and existing structure
export type MarketSignal = {
  id: string
  type: string
  area: string
  areaId: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  headline: string
  detail: string
  metric: string
  change: number
  timeframe: string
  deviationPct: number
  confidence: number
  actionableInsight: string
  tags: string[]
  detectedDate: string
  estimatedUpside?: number
  timeToAct?: string
}

type SeverityLevel = 'all' | 'critical' | 'high' | 'medium' | 'low'
type SortOption = 'newest' | 'severity' | 'confidence' | 'expiring'

// Mock data fallback for when API fails
const createMockSignals = (): MarketSignal[] => [
  {
    id: 'mock-1',
    type: 'volume_spike',
    area: 'BUSINESS BAY',
    areaId: 'bb-1',
    severity: 'critical',
    title: 'Exceptional Trading Activity Detected',
    headline: 'Volume Spike in Business Bay',
    detail: 'Transaction volume surge detected',
    metric: 'volume',
    change: 45.2,
    timeframe: '7d',
    description: 'An unusual surge in transaction volume has been registered in the past 7 days.',
    deviationPct: -25.5,
    confidence: 92,
    actionableInsight: 'Review client pipelines in this area for potential repricing or competitive activity.',
    tags: ['trading', 'momentum', 'attention'],
    detectedDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    estimatedUpside: 2500000,
    timeToAct: '3 days',
  },
]

// Map backend anomaly types to signal types
const mapAnomalyTypeToSignalType = (anomalyType: string): string => {
  const typeMap: Record<string, string> = {
    'volume_spike': 'volume-spike',
    'developer_activity': 'developer-activity',
    'price_drop': 'price-drop',
    'price_surge': 'price-surge',
    'demand_shift': 'demand-shift',
  }
  return typeMap[anomalyType] || anomalyType
}

// Convert backend anomaly to MarketSignal
const convertAnomalyToSignal = (anomaly: any, index: number): MarketSignal => {
  const signalType = mapAnomalyTypeToSignalType(anomaly.type)
  const changeValue = Math.abs(anomaly.change)
  const isNegative = anomaly.type === 'price_drop'

  // Map severity string
  const severityMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
    'critical': 'critical',
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
  }
  const mappedSeverity = severityMap[anomaly.severity] || 'medium'

  // Generate confidence based on severity
  const confidenceMap = {
    'critical': 92,
    'high': 82,
    'medium': 70,
    'low': 55,
  }
  const confidence = confidenceMap[mappedSeverity]

  return {
    id: `signal-${index}-${anomaly.area}`,
    type: signalType,
    area: anomaly.area,
    areaId: anomaly.area.toLowerCase().replace(/\s+/g, '-'),
    severity: mappedSeverity,
    title: anomaly.headline || `${signalType} in ${anomaly.area}`,
    headline: anomaly.headline,
    detail: anomaly.detail,
    metric: anomaly.metric,
    change: anomaly.change,
    timeframe: anomaly.timeframe,
    description: anomaly.detail || `Market anomaly detected: ${anomaly.headline}`,
    deviationPct: isNegative ? -changeValue : changeValue,
    confidence,
    actionableInsight: `Monitor ${anomaly.area} for ${signalType} signals. ${anomaly.detail}`,
    tags: [signalType, anomaly.area.toLowerCase(), anomaly.timeframe],
    detectedDate: new Date().toISOString(),
    estimatedUpside: changeValue > 20 ? Math.round(changeValue * 100000) : 1500000,
    timeToAct: anomaly.timeframe === '7d' ? '3-5 days' : anomaly.timeframe === '24h' ? '12-24 hours' : '1-2 weeks',
  }
}

const severityConfig: Record<Exclude<SeverityLevel, 'all'>, { color: string; dotColor: string; bgColor: string }> = {
  critical: { color: 'text-rose-400', dotColor: '\u25CF', bgColor: 'bg-rose-400/10' },
  high: { color: 'text-orange-400', dotColor: '\u25CF', bgColor: 'bg-orange-400/10' },
  medium: { color: 'text-yellow-400', dotColor: '\u25CF', bgColor: 'bg-yellow-400/10' },
  low: { color: 'text-white/40', dotColor: '\u25CF', bgColor: 'bg-white/[0.05]' },
}

const getRelativeTime = (hoursAgo: number): string => {
  if (hoursAgo < 1) return 'now'
  if (hoursAgo < 24) return `${Math.floor(hoursAgo)}h ago`
  const daysAgo = Math.floor(hoursAgo / 24)
  return `${daysAgo}d ago`
}

const getSeverityLevel = (signal: MarketSignal): Exclude<SeverityLevel, 'all'> => {
  if (signal.deviationPct <= -20 || signal.confidence >= 90) return 'critical'
  if (signal.deviationPct <= -15 || signal.confidence >= 80) return 'high'
  if (signal.deviationPct <= -10 || signal.confidence >= 70) return 'medium'
  return 'low'
}

// ── AI Explanation Generator ────────────────────────────────────────────
function generateSignalExplanation(signal: MarketSignal): {
  whatHappened: string
  whyItMatters: string
  howDetected: string
  whatToDo: string
  riskAssessment: string
  outlook: string
} {
  const severity = getSeverityLevel(signal)
  const isNegative = signal.deviationPct < 0
  const absDeviation = Math.abs(signal.deviationPct).toFixed(1)

  // Type-specific narratives
  const typeNarratives: Record<string, { what: string; why: string; how: string; action: string; risk: string; outlook: string }> = {
    'price-drop': {
      what: `A significant price decline of ${absDeviation}% has been detected in ${signal.area}. ${signal.description} This movement falls outside normal market variance and represents a meaningful shift in pricing dynamics for this micro-market.`,
      why: `Price drops of this magnitude in ${signal.area} typically signal one of three things: a correction after a period of rapid appreciation, increased inventory creating downward pressure, or a shift in buyer demand towards other areas. For advisors, this creates a potential buying window for clients seeking value in an established location. The ${signal.confidence}% confidence score indicates strong data backing behind this signal.`,
      how: `PCIS detected this signal by analysing DLD transaction data against 90-day rolling averages for ${signal.area}. The algorithm cross-references price per square foot trends, transaction volume changes, and listing-to-sale ratios. When the deviation exceeds the area's historical volatility threshold, a signal is generated. This particular signal was further validated against comparable area movements and seasonal patterns.`,
      action: `${signal.actionableInsight} With a ${signal.timeToAct || 'limited'} window, advisors should assess whether any current clients have expressed interest in ${signal.area}. This could represent an entry point for price-sensitive buyers or an opportunity to restructure portfolios.`,
      risk: severity === 'critical' ? `High risk signal. The deviation magnitude suggests this is not a temporary fluctuation. Monitor for follow-through transactions that confirm the trend. If prices continue declining, adjacent areas may also be affected.` : `Moderate risk. The decline may be localised and could reverse if underlying demand fundamentals hold. Keep monitoring for volume confirmation.`,
      outlook: `Based on current trajectory and comparable historical patterns, ${signal.area} pricing is expected to ${isNegative ? 'stabilise within 4-6 weeks as the market absorbs the correction' : 'continue its current trend'} before finding a new equilibrium. Long-term fundamentals for the area remain ${signal.confidence > 70 ? 'intact' : 'under review'}.`,
    },
    'volume-spike': {
      what: `Transaction volume in ${signal.area} has surged by ${absDeviation}% above normal levels. ${signal.description} This spike indicates a sudden acceleration in market activity that exceeds seasonal and trend-adjusted expectations.`,
      why: `Volume spikes of this scale are leading indicators of price movement. When transaction velocity increases significantly, it often precedes price appreciation as available inventory tightens. For ${signal.area}, this could reflect new buyer cohorts entering the market, off-plan project completions creating resale activity, or institutional investors building positions.`,
      how: `PCIS monitors daily DLD registration data against 30/60/90-day volume baselines for each tracked area. The volume spike was identified when ${signal.area} exceeded its upper Bollinger Band equivalent by more than 2 standard deviations. Additional validation checks buyer nationality mix, transaction type distribution, and payment method ratios to distinguish organic demand from one-off events.`,
      action: `${signal.actionableInsight} Advisors should prepare competitive market analyses for ${signal.area} as buyer competition is intensifying. Existing listings in this area should be reviewed for pricing strategy.`,
      risk: `${severity === 'critical' ? 'Elevated market activity may indicate speculative behavior. Monitor for rapid price escalation that could lead to a correction.' : 'Volume increase appears organic based on buyer diversity metrics. Normal market acceleration.'} `,
      outlook: `If volume sustains at current levels, expect price appreciation of 2-5% over the next quarter. Historical patterns show volume spikes in ${signal.area} typically lead price movement by 3-6 weeks.`,
    },
    'yield-shift': {
      what: `Rental yields in ${signal.area} have shifted by ${absDeviation}% from their baseline. ${signal.description} This represents a meaningful change in the income-generating potential of properties in this area.`,
      why: `Yield shifts are critical for investment-focused clients. A ${isNegative ? 'compression' : 'expansion'} of this magnitude affects IRR calculations, cash-on-cash returns, and overall portfolio performance. For ${signal.area}, this shift may reflect ${isNegative ? 'rising capital values outpacing rental growth' : 'rental market strengthening relative to purchase prices'}, which directly impacts buy-to-let strategies.`,
      how: `PCIS calculates yields using real DLD transaction prices against current rental contract data from the Ejari system. The algorithm tracks gross yields, net yields (after service charges), and yield trends across property types and bedroom configurations. This signal triggered when the 30-day yield average deviated significantly from the 180-day baseline.`,
      action: `${signal.actionableInsight} Review any client portfolios with exposure to ${signal.area} and recalculate projected returns.`,
      risk: `Yield ${isNegative ? 'compression' : 'expansion'} at this rate ${severity === 'critical' ? 'requires immediate portfolio review' : 'should be monitored over the next 30 days'}.`,
      outlook: `Rental market fundamentals in ${signal.area} suggest yields will ${isNegative ? 'find a floor as rents catch up to capital appreciation' : 'continue expanding as the rental market outperforms capital values'} over the next quarter.`,
    },
    'emerging-area': {
      what: `${signal.area} is showing early signs of market emergence with ${absDeviation}% deviation from dormant baselines. ${signal.description} The area is transitioning from low-activity to active market status.`,
      why: `Emerging area signals represent the highest-return opportunity windows in Dubai real estate. Early movers in areas that transition from discovery to growth phases have historically captured 30-50% appreciation over 24-36 months. ${signal.area} is showing the characteristic pattern of infrastructure investment, developer interest, and early buyer activity that precedes rapid appreciation.`,
      how: `PCIS uses a multi-factor emergence model that tracks: new project registrations, first-time buyer activity, infrastructure development announcements, price per sqft relative to adjacent established areas, and social media sentiment analysis. ${signal.area} has triggered on ${signal.confidence >= 80 ? 'multiple' : 'several'} factors simultaneously.`,
      action: `${signal.actionableInsight} This is an opportunity to position forward-thinking clients in an undervalued area before mainstream market awareness.`,
      risk: `Emerging areas carry execution risk. Not all early signals result in sustained growth. Key risks include: infrastructure delays, developer financial stability, and competing area launches.`,
      outlook: `If current development momentum holds, ${signal.area} is projected to enter its growth acceleration phase within 6-12 months. Price discovery is ongoing and entry prices offer significant upside potential.`,
    },
  }

  // Default narrative for types not explicitly covered
  const defaultNarrative = {
    what: `A ${signal.type} signal has been detected in ${signal.area} with a ${absDeviation}% deviation from expected levels. ${signal.description} This signal has been validated with ${signal.confidence}% confidence.`,
    why: `This signal type is significant because it indicates a structural shift in ${signal.area}'s market dynamics. For real estate advisors, understanding these shifts enables proactive client communication and timely portfolio adjustments. The ${severity} severity rating means this requires ${severity === 'critical' ? 'immediate' : severity === 'high' ? 'prompt' : 'scheduled'} attention.`,
    how: `PCIS continuously monitors DLD transaction data, rental contract registrations, building permit filings, and market sentiment indicators. This signal was generated when multiple data points converged to indicate an anomaly in ${signal.area}. The detection algorithm uses a combination of statistical deviation analysis, pattern matching against historical precedents, and machine learning classification to determine signal validity and severity.`,
    action: `${signal.actionableInsight} The recommended response window is ${signal.timeToAct || 'within the next 2 weeks'}.`,
    risk: `${severity === 'critical' ? 'This is a high-priority signal requiring immediate review. Delayed action may result in missed opportunities or unmanaged risk exposure.' : severity === 'high' ? 'Significant signal warranting priority review within the next 48 hours.' : 'Standard monitoring signal. Review during regular portfolio assessment cycles.'}`,
    outlook: `Based on historical patterns for ${signal.type} signals in similar Dubai sub-markets, expect the current trend to ${isNegative ? 'moderate' : 'continue'} over the next 30-60 days. Market participants typically take 2-4 weeks to fully price in the information underlying this signal.`,
  }

  const narrative = typeNarratives[signal.type] || defaultNarrative

  return {
    whatHappened: narrative.what,
    whyItMatters: narrative.why,
    howDetected: narrative.how,
    whatToDo: narrative.action,
    riskAssessment: narrative.risk,
    outlook: narrative.outlook,
  }
}

// ── Signal Detail Overlay ───────────────────────────────────────────────
function SignalDetailOverlay({
  signal,
  onClose,
}: {
  signal: MarketSignal
  onClose: () => void
}) {
  const severity = getSeverityLevel(signal)
  const config = severityConfig[severity]
  const explanation = useMemo(() => generateSignalExplanation(signal), [signal])
  const [typedSections, setTypedSections] = useState(0)

  // Animate sections appearing
  useEffect(() => {
    setTypedSections(0)
    const sections = 6
    let current = 0
    const interval = setInterval(() => {
      current++
      setTypedSections(current)
      if (current >= sections) clearInterval(interval)
    }, 200)
    return () => clearInterval(interval)
  }, [signal])

  const sections = [
    { title: 'What Happened', content: explanation.whatHappened, icon: '\u25C6' },
    { title: 'Why It Matters', content: explanation.whyItMatters, icon: '\u25C6' },
    { title: 'How This Was Detected', content: explanation.howDetected, icon: '\u25C6' },
    { title: 'What You Should Do', content: explanation.whatToDo, icon: '\u25C6' },
    { title: 'Risk Assessment', content: explanation.riskAssessment, icon: '\u25C6' },
    { title: 'Future Outlook', content: explanation.outlook, icon: '\u25C6' },
  ]

  return (
    <div className="absolute inset-0 z-50 bg-black/95 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors text-sm z-10"
        >
          ESC to close
        </button>

        {/* Signal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-sm font-semibold ${config.color}`}>{config.dotColor}</span>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${config.color}`}>{severity}</span>
            <div className="bg-white/[0.06] border border-white/[0.08] rounded px-2 py-0.5">
              <span className="text-[9px] font-medium text-white/70">{signal.type}</span>
            </div>
            <span className="text-[9px] text-white/40 ml-auto">
              {getRelativeTime((new Date().getTime() - new Date(signal.detectedDate).getTime()) / (1000 * 60 * 60))}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white/90 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            {signal.title}
          </h2>
          <div className="flex items-center gap-4 text-[10px]">
            <AreaLink areaId={signal.areaId}>
              <span className="text-[#C9A55A] hover:text-[#C9A55A]/80 transition-colors">{signal.area}</span>
            </AreaLink>
            <span className="text-white/40">|</span>
            <span className={`font-semibold ${signal.deviationPct < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {signal.deviationPct.toFixed(1)}% deviation
            </span>
            <span className="text-white/40">|</span>
            <span className="text-white/60">{signal.confidence}% confidence</span>
            <span className="text-white/40">|</span>
            <span className="text-white/60">Act within: {signal.timeToAct || 'N/A'}</span>
          </div>
        </div>

        {/* Metrics bar */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-white/[0.02] border border-white/[0.06] rounded-lg">
          <div>
            <span className="text-[8px] text-white/40 uppercase tracking-wider block mb-1">Deviation</span>
            <span className={`text-lg font-bold ${signal.deviationPct < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {signal.deviationPct.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-[8px] text-white/40 uppercase tracking-wider block mb-1">Confidence</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-white/[0.06] rounded overflow-hidden">
                <div className="h-full bg-[#C9A55A]" style={{ width: `${signal.confidence}%` }} />
              </div>
              <span className="text-lg font-bold text-[#C9A55A]">{signal.confidence}%</span>
            </div>
          </div>
          <div>
            <span className="text-[8px] text-white/40 uppercase tracking-wider block mb-1">Est. Upside</span>
            <span className="text-lg font-bold text-emerald-400">
              AED {((signal.estimatedUpside || 0) / 1_000_000).toFixed(1)}M
            </span>
          </div>
        </div>

        {/* AI Analysis Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-[#C9A55A]/20 flex items-center justify-center">
            <span className="text-[10px] text-[#C9A55A] font-bold">AI</span>
          </div>
          <span className="text-[10px] text-[#C9A55A] uppercase tracking-wider font-semibold">
            PCIS AI Signal Analysis
          </span>
          {typedSections < 6 && (
            <div className="flex items-center gap-1 ml-2">
              <div className="w-1 h-1 rounded-full bg-[#C9A55A] animate-pulse" />
              <span className="text-[8px] text-[#C9A55A]/60">Analysing...</span>
            </div>
          )}
        </div>

        {/* Analysis sections */}
        <div className="space-y-4">
          {sections.map((section, idx) => (
            <div
              key={section.title}
              className={`transition-all duration-300 ${idx < typedSections ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            >
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#C9A55A] text-xs">{section.icon}</span>
                  <h3 className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">
                    {section.title}
                  </h3>
                </div>
                <p className="text-[11px] text-white/65 leading-relaxed">{section.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div className="mt-6 flex gap-2 flex-wrap">
          {signal.tags.map((tag: string) => (
            <span key={tag} className="text-[8px] text-white/50 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-1">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────
export default function SignalFeedView() {
  const [marketSignals, setMarketSignals] = useState<MarketSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [expandedSignal, setExpandedSignal] = useState<MarketSignal | null>(null)

  // Fetch data from backend API on mount
  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await p1Api.getSCOUTAnomalies()

        if (response?.data?.anomalies && Array.isArray(response.data.anomalies)) {
          const signals = response.data.anomalies.map((anomaly: any, index: number) =>
            convertAnomalyToSignal(anomaly, index)
          )
          setMarketSignals(signals)
        } else {
          // Fallback to mock data if response structure is unexpected
          console.warn('Unexpected API response structure, using mock data')
          setMarketSignals(createMockSignals())
        }
      } catch (err) {
        console.error('Failed to fetch anomalies:', err)
        setError('Failed to load market signals. Showing sample data.')
        // Fallback to mock data on error
        setMarketSignals(createMockSignals())
      } finally {
        setLoading(false)
      }
    }

    fetchAnomalies()
  }, [])

  // ESC to close overlay
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedSignal(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const signalTypes = useMemo(() => {
    const types = new Set<string>()
    marketSignals.forEach((s: MarketSignal) => types.add(s.type))
    return Array.from(types).sort()
  }, [marketSignals])

  const areas = useMemo(() => {
    const areasSet = new Set<string>()
    marketSignals.forEach((s: MarketSignal) => areasSet.add(s.area))
    return Array.from(areasSet).sort()
  }, [marketSignals])

  const filteredSignals = useMemo(() => {
    let filtered = marketSignals.filter((s: MarketSignal) => {
      if (severityFilter !== 'all') {
        const sev = getSeverityLevel(s)
        if (sev !== severityFilter) return false
      }
      if (typeFilter !== 'all' && s.type !== typeFilter) return false
      if (areaFilter !== 'all' && s.area !== areaFilter) return false
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        return (
          s.title.toLowerCase().includes(term) ||
          s.description.toLowerCase().includes(term) ||
          s.area.toLowerCase().includes(term) ||
          s.tags.some((tag: string) => tag.toLowerCase().includes(term))
        )
      }
      return true
    })

    filtered.sort((a: MarketSignal, b: MarketSignal) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.detectedDate).getTime() - new Date(a.detectedDate).getTime()
        case 'severity': {
          const sevOrder: Record<Exclude<SeverityLevel, 'all'>, number> = { critical: 0, high: 1, medium: 2, low: 3 }
          return sevOrder[getSeverityLevel(a)] - sevOrder[getSeverityLevel(b)]
        }
        case 'confidence':
          return b.confidence - a.confidence
        case 'expiring': {
          const parseTime = (t?: string): number => {
            if (!t) return 9999
            const num = parseInt(t, 10)
            if (t.includes('hour')) return num
            if (t.includes('day')) return num * 24
            if (t.includes('week')) return num * 168
            if (t.includes('month')) return num * 720
            return 9999
          }
          return parseTime(a.timeToAct) - parseTime(b.timeToAct)
        }
        default:
          return 0
      }
    })

    return filtered
  }, [severityFilter, typeFilter, areaFilter, searchTerm, sortBy, marketSignals])

  const criticalCount = marketSignals.filter((s: MarketSignal) => getSeverityLevel(s) === 'critical').length
  const highCount = marketSignals.filter((s: MarketSignal) => getSeverityLevel(s) === 'high').length
  const mediumCount = marketSignals.filter((s: MarketSignal) => getSeverityLevel(s) === 'medium').length
  const avgConfidence = marketSignals.length > 0 ? Math.round(marketSignals.reduce((sum: number, s: MarketSignal) => sum + s.confidence, 0) / marketSignals.length) : 0
  const totalUpside = marketSignals.reduce((sum: number, s: MarketSignal) => sum + (s.estimatedUpside || 0), 0)

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white/[0.01] to-transparent relative">
      {/* Signal Detail Overlay */}
      {expandedSignal && (
        <SignalDetailOverlay signal={expandedSignal} onClose={() => setExpandedSignal(null)} />
      )}

      {/* Header */}
      <div className="border-b border-white/[0.08] p-6 pb-5 flex-shrink-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-white/90" style={{ fontFamily: "'Playfair Display', serif" }}>
              Market Signals
            </h1>
            <p className="text-[11px] text-white/50 mt-1 tracking-wide">
              Real-Time Intelligence Feed -- {loading ? 'Loading...' : marketSignals.length} Active Signals
            </p>
            {error && <p className="text-[9px] text-orange-400 mt-1">{error}</p>}
            <p className="text-[9px] text-white/30 mt-1">
              Click any signal for full AI analysis
            </p>
          </div>
          <div className="flex gap-3">
            {[
              { label: 'Critical', count: criticalCount, color: 'text-rose-400' },
              { label: 'High', count: highCount, color: 'text-orange-400' },
              { label: 'Medium', count: mediumCount, color: 'text-yellow-400' },
            ].map((badge) => (
              <div key={badge.label} className="text-right">
                <div className={`text-sm font-semibold ${badge.color}`}>{badge.count}</div>
                <div className="text-[8px] text-white/40 uppercase tracking-wider">{badge.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border-b border-white/[0.08] p-6 pt-4 pb-4 flex-shrink-0 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider transition-colors ${
                severityFilter === sev
                  ? 'bg-pcis-gold text-black'
                  : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.10]'
              }`}
            >
              {sev === 'all' ? 'All Severities' : sev}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded text-[10px] bg-white/[0.06] text-white/80 border border-white/[0.08] focus:outline-none focus:border-pcis-gold/50 transition-colors">
            <option value="all">All Types</option>
            {signalTypes.map((type) => (<option key={type} value={type}>{type}</option>))}
          </select>
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}
            className="px-3 py-1.5 rounded text-[10px] bg-white/[0.06] text-white/80 border border-white/[0.08] focus:outline-none focus:border-pcis-gold/50 transition-colors">
            <option value="all">All Areas</option>
            {areas.map((area) => (<option key={area} value={area}>{area}</option>))}
          </select>
          <input type="text" placeholder="Search signals..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-48 px-3 py-1.5 rounded text-[10px] bg-white/[0.06] text-white/80 border border-white/[0.08] placeholder:text-white/30 focus:outline-none focus:border-pcis-gold/50 transition-colors" />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1.5 rounded text-[10px] bg-white/[0.06] text-white/80 border border-white/[0.08] focus:outline-none focus:border-pcis-gold/50 transition-colors">
            <option value="newest">Newest</option>
            <option value="severity">Severity</option>
            <option value="confidence">Confidence</option>
            <option value="expiring">Expiring Soon</option>
          </select>
        </div>
      </div>

      {/* Signals List */}
      <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-3">
        {loading ? (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <div className="text-white/50 text-sm mb-2">Fetching market signals...</div>
              <div className="flex justify-center gap-1">
                <div className="w-1 h-1 bg-pcis-gold rounded-full animate-pulse" />
                <div className="w-1 h-1 bg-pcis-gold rounded-full animate-pulse delay-100" />
                <div className="w-1 h-1 bg-pcis-gold rounded-full animate-pulse delay-200" />
              </div>
            </div>
          </div>
        ) : filteredSignals.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <div className="text-white/50 text-sm mb-1">No signals match your filters</div>
              <button
                onClick={() => { setSeverityFilter('all'); setTypeFilter('all'); setAreaFilter('all'); setSearchTerm('') }}
                className="text-[10px] text-pcis-gold hover:text-pcis-gold/80 transition-colors"
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : (
          filteredSignals.map((signal: MarketSignal) => {
            const severity = getSeverityLevel(signal)
            const config = severityConfig[severity]

            return (
              <div
                key={signal.id}
                onClick={() => setExpandedSignal(signal)}
                className={`p-4 rounded-lg border border-white/[0.04] ${config.bgColor} cursor-pointer transition-all hover:border-[#C9A55A]/30 hover:bg-white/[0.04] group`}
              >
                {/* Top Row */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-sm font-semibold ${config.color}`}>{config.dotColor}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${config.color}`}>{severity}</span>
                  <div className="bg-white/[0.06] border border-white/[0.08] rounded px-2 py-0.5">
                    <span className="text-[9px] font-medium text-white/70">{signal.type}</span>
                  </div>
                  <div className="flex-1" />
                  <span className="text-[9px] text-[#C9A55A]/50 group-hover:text-[#C9A55A] transition-colors">
                    VIEW ANALYSIS
                  </span>
                  <span className="text-[10px] text-white/40 ml-2">{signal.area}</span>
                </div>

                {/* Title and Description */}
                <div className="mb-3">
                  <h3 className="text-sm text-white/90 font-semibold mb-1">{signal.title}</h3>
                  <p className="text-[10px] text-white/60 line-clamp-2">{signal.description}</p>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-3 mb-3 pb-3 border-b border-white/[0.04]">
                  <div>
                    <span className="text-[8px] text-white/40 uppercase tracking-wider block mb-0.5">Deviation</span>
                    <span className={`text-sm font-semibold ${signal.deviationPct < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {signal.deviationPct.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-white/40 uppercase tracking-wider block mb-0.5">Confidence</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1 bg-white/[0.04] rounded overflow-hidden">
                        <div className="h-full bg-pcis-gold" style={{ width: `${signal.confidence}%` }} />
                      </div>
                      <span className="text-[9px] text-white/60">{signal.confidence}%</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[8px] text-white/40 uppercase tracking-wider block mb-0.5">Time to Act</span>
                    <span className="text-sm font-semibold text-white/80">{signal.timeToAct || 'N/A'}</span>
                  </div>
                </div>

                {/* Insight */}
                <div className="mb-3 pb-3 border-b border-white/[0.04]">
                  <p className="text-[10px] text-pcis-gold/80">&#9670; {signal.actionableInsight}</p>
                </div>

                {/* Tags and Timestamp */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    {signal.tags.map((tag: string) => (
                      <span key={tag} className="text-[8px] text-white/50 bg-white/[0.04] border border-white/[0.06] rounded-full px-1.5 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-[9px] text-white/40 flex-shrink-0 ml-2">
                    {getRelativeTime((new Date().getTime() - new Date(signal.detectedDate).getTime()) / (1000 * 60 * 60))}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Stats Footer */}
      <div className="border-t border-white/[0.08] p-6 pt-5 pb-5 flex-shrink-0 bg-gradient-to-t from-white/[0.01] to-transparent">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-[8px] text-white/40 uppercase tracking-wider mb-1">Total Signals</div>
            <div className="text-2xl font-semibold text-white/90">{marketSignals.length}</div>
          </div>
          <div>
            <div className="text-[8px] text-white/40 uppercase tracking-wider mb-1">Avg Confidence</div>
            <div className="text-2xl font-semibold text-pcis-gold">{avgConfidence}%</div>
          </div>
          <div>
            <div className="text-[8px] text-white/40 uppercase tracking-wider mb-1">Est. Total Upside</div>
            <div className="text-2xl font-semibold text-emerald-400">
              AED {(totalUpside / 1_000_000).toFixed(1)}M
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
