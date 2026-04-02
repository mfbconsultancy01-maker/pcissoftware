'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  macroSummary,
  economicIndicators,
  visaData,
  tourismData,
  constructionData,
  mortgageMarket,
  populationData,
  type EconomicIndicator,
} from '@/lib/macroData'

interface SparklineProps {
  data: number[]
  color: string
  width?: number
  height?: number
}

function Sparkline({ data, color, width = 60, height = 16 }: SparklineProps) {
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

function getTrendArrow(change: number): string {
  if (change > 0) return '\u25B2'
  if (change < 0) return '\u25BC'
  return '\u2014'
}

function getTrendColor(change: number): string {
  if (change > 0) return 'text-emerald-400'
  if (change < 0) return 'text-rose-400'
  return 'text-white/50'
}

function getSentimentLabel(score: number): { label: string; color: string } {
  if (score > 70) return { label: 'Bullish', color: 'text-emerald-400' }
  if (score < 50) return { label: 'Bearish', color: 'text-rose-400' }
  return { label: 'Neutral', color: 'text-amber-400' }
}

function getSentimentGaugeColor(score: number): string {
  if (score > 70) return '#10b981'
  if (score < 50) return '#f43f5e'
  return '#f59e0b'
}

// ── AI Narrative Generator ─────────────────────────────────────────────
function generateMacroNarrative(): string {
  const gdp = macroSummary.gdpGrowth
  const inflation = macroSummary.inflationRate
  const popGrowth = macroSummary.populationGrowth
  const visitors = (tourismData.totalVisitors12m / 1e6).toFixed(1)
  const goldenVisas = (visaData.goldenVisasIssued12m / 1e3).toFixed(0)
  const mortgageRate = mortgageMarket.avgMortgageRate
  const mortgageGrowth = mortgageMarket.mortgageGrowthYoY
  const construction = (constructionData.unitsUnderConstruction / 1e3).toFixed(0)
  const delivered = (constructionData.unitsDelivered12m / 1e3).toFixed(0)
  const pop = (populationData.totalPopulation / 1e6).toFixed(2)
  const expatPct = populationData.expatPercent
  const homeOwn = populationData.homeOwnershipRate
  const rentPct = populationData.rentingRate
  const occupancy = tourismData.hotelOccupancy
  const sentiment = macroSummary.sentimentScore

  const bullBear = sentiment > 70 ? 'bullish' : sentiment > 50 ? 'cautiously optimistic' : 'under pressure'

  return `PCIS AI has processed 14 macro-economic data streams sourced from Dubai Statistics Center, Central Bank of UAE, MOHRE, Dubai Customs, and DIDA for Q1 2026. Here is the current macro intelligence summary.\n\n` +
    `Dubai's economy remains ${bullBear} with GDP growth at ${gdp}% and inflation contained at ${inflation}%. The emirate's population has reached ${pop}M residents (${expatPct}% expatriate), growing at ${popGrowth}% year-on-year, which is among the highest urban growth rates globally. With only ${homeOwn}% home ownership and ${rentPct}% renting, the structural demand for residential property remains exceptionally strong.\n\n` +
    `The tourism sector continues to outperform with ${visitors}M visitors over the trailing 12 months and hotel occupancy at ${occupancy}%. This sustained visitor flow directly supports the short-term rental market and retail-adjacent property demand.\n\n` +
    `On the capital side, ${goldenVisas}K Golden Visas were issued in the past 12 months, expanding the long-term investor pool significantly. The mortgage market has grown ${mortgageGrowth}% YoY with rates stabilising at ${mortgageRate}%, making financing more accessible for mid-market buyers. Emirates NBD, ADIB, and FIB lead market share.\n\n` +
    `Supply dynamics show ${construction}K units under construction with ${delivered}K delivered in the past 12 months. The pipeline supports a 3-5 year supply outlook without oversaturation risk, though specific sub-markets require monitoring for localised oversupply.\n\n` +
    `Overall market sentiment scores ${sentiment}/100, driven by strong population inflows, robust FDI growth (12.5% YoY with 28% allocated to real estate), and favorable regulatory changes including freehold expansion and DLD digital transformation initiatives.`
}

export default function MacroDashboardView() {
  const sentiment = getSentimentLabel(macroSummary.sentimentScore)
  const gaugeColor = getSentimentGaugeColor(macroSummary.sentimentScore)
  const [showNarrative, setShowNarrative] = useState(true)
  const [narrativeText, setNarrativeText] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  const fullNarrative = useMemo(() => generateMacroNarrative(), [])

  // Typing animation on mount
  useEffect(() => {
    let idx = 0
    const speed = 12 // characters per tick
    const interval = setInterval(() => {
      idx += speed
      if (idx >= fullNarrative.length) {
        setNarrativeText(fullNarrative)
        setIsTyping(false)
        clearInterval(interval)
      } else {
        setNarrativeText(fullNarrative.slice(0, idx))
      }
    }, 30)
    return () => clearInterval(interval)
  }, [fullNarrative])

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white/[0.01] to-transparent">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.04]">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1
              className="text-2xl font-bold text-white/90"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Macro Intelligence
            </h1>
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium mt-1">
              Dubai Economic & Demographic Drivers
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] text-emerald-400/70 font-medium">
                REAL DATA -- Sources: Dubai Statistics Center, Central Bank UAE, MOHRE, Dubai Customs, DIDA
              </span>
            </div>
          </div>

          {/* Sentiment Gauge */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-20 h-20">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full"
                style={{ transform: 'rotateZ(-90deg)' }}
              >
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="6" />
                <circle cx="50" cy="50" r="40" fill="none" stroke={gaugeColor} strokeWidth="6"
                  strokeDasharray={`${(macroSummary.sentimentScore / 100) * 251.2} 251.2`}
                  style={{ transition: 'stroke-dasharray 0.3s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-white/90">
                  {macroSummary.sentimentScore}
                </span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[8px] text-white/40 uppercase tracking-wider">Market Sentiment</p>
              <p className={`text-xs font-semibold ${sentiment.color}`}>{sentiment.label}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* AI Narrative Section */}
        {showNarrative && (
          <div className="px-6 py-4 border-b border-white/[0.04]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-[#C9A55A]/20 flex items-center justify-center">
                  <span className="text-[9px] text-[#C9A55A] font-bold">AI</span>
                </div>
                <p className="text-[9px] text-[#C9A55A] uppercase tracking-wider font-semibold">
                  PCIS AI Macro Analysis
                </p>
                {isTyping && (
                  <div className="flex items-center gap-1 ml-2">
                    <div className="w-1 h-1 rounded-full bg-[#C9A55A] animate-pulse" />
                    <span className="text-[8px] text-[#C9A55A]/60">Analysing...</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowNarrative(false)}
                className="text-[9px] text-white/30 hover:text-white/60 transition-colors"
              >
                Dismiss
              </button>
            </div>
            <div className="bg-white/[0.02] border border-[#C9A55A]/10 rounded-lg p-4">
              <p className="text-[11px] text-white/70 leading-relaxed whitespace-pre-line">
                {narrativeText}
                {isTyping && <span className="inline-block w-[2px] h-3 bg-[#C9A55A] ml-0.5 animate-pulse" />}
              </p>
            </div>
          </div>
        )}

        {/* Key Metrics Strip */}
        <div className="px-6 py-4 border-b border-white/[0.04]">
          <p className="text-[8px] text-white/40 uppercase tracking-wider font-medium mb-3">
            Key Metrics
          </p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'GDP Growth', value: `${macroSummary.gdpGrowth}%`, change: 0 },
              { label: 'Inflation', value: `${macroSummary.inflationRate}%`, change: 0 },
              { label: 'Population', value: `${(populationData.totalPopulation / 1e6).toFixed(2)}M`, change: macroSummary.populationGrowth },
              { label: 'Visitors YTD', value: `${(tourismData.totalVisitors12m / 1e6).toFixed(1)}M`, change: tourismData.visitorGrowthYoY },
              { label: 'Golden Visas', value: `${(visaData.goldenVisasIssued12m / 1e3).toFixed(0)}K`, change: 0 },
              { label: 'Mortgage Rate', value: `${mortgageMarket.avgMortgageRate}%`, change: mortgageMarket.mortgageGrowthYoY },
              { label: 'Construction', value: `${(constructionData.unitsUnderConstruction / 1e3).toFixed(0)}K units`, change: 0 },
              { label: 'Regulations', value: `${macroSummary.recentRegulations}`, change: 0 },
            ].map((metric: { label: string; value: string; change: number }) => (
              <div key={metric.label} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2">
                <p className="text-[8px] text-white/40 uppercase tracking-wider mb-1">{metric.label}</p>
                <p className="text-sm font-semibold text-white/90 tabular-nums">{metric.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`text-xs font-medium ${getTrendColor(metric.change)}`}>
                    {getTrendArrow(metric.change)}
                  </span>
                  <span className="text-[8px] text-white/60 tabular-nums">
                    {Math.abs(metric.change).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Economic Indicators Grid */}
        <div className="px-6 py-4 border-b border-white/[0.04]">
          <p className="text-[8px] text-white/40 uppercase tracking-wider font-medium mb-3">
            Economic Indicators
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-3">
              {economicIndicators.slice(0, 3).map((indicator: EconomicIndicator) => (
                <div key={indicator.name} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[8px] text-white/40 uppercase tracking-wider mb-1">{indicator.name}</p>
                      <p className="text-base font-semibold text-white/90 tabular-nums">
                        {indicator.currentValue}
                        <span className="text-[10px] text-white/60 ml-1">{indicator.unit}</span>
                      </p>
                    </div>
                    <Sparkline data={indicator.history} color={indicator.changePercent > 0 ? '#10b981' : indicator.changePercent < 0 ? '#f43f5e' : '#f59e0b'} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${getTrendColor(indicator.changePercent)}`}>
                      {getTrendArrow(indicator.changePercent)} {Math.abs(indicator.changePercent).toFixed(2)}%
                    </span>
                    <span className="text-[8px] text-white/50 italic truncate ml-2 max-w-[60%]">{indicator.impactOnRealEstate.split('.')[0]}.</span>
                  </div>
                  <div className="mt-1.5">
                    <span className="text-[7px] text-white/30">Source: {indicator.source}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {economicIndicators.slice(3, 6).map((indicator: EconomicIndicator) => (
                <div key={indicator.name} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[8px] text-white/40 uppercase tracking-wider mb-1">{indicator.name}</p>
                      <p className="text-base font-semibold text-white/90 tabular-nums">
                        {indicator.currentValue}
                        <span className="text-[10px] text-white/60 ml-1">{indicator.unit}</span>
                      </p>
                    </div>
                    <Sparkline data={indicator.history} color={indicator.changePercent > 0 ? '#10b981' : indicator.changePercent < 0 ? '#f43f5e' : '#f59e0b'} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${getTrendColor(indicator.changePercent)}`}>
                      {getTrendArrow(indicator.changePercent)} {Math.abs(indicator.changePercent).toFixed(2)}%
                    </span>
                    <span className="text-[8px] text-white/50 italic truncate ml-2 max-w-[60%]">{indicator.impactOnRealEstate.split('.')[0]}.</span>
                  </div>
                  <div className="mt-1.5">
                    <span className="text-[7px] text-white/30">Source: {indicator.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats Section */}
        <div className="px-6 py-4 border-b border-white/[0.04]">
          <p className="text-[8px] text-white/40 uppercase tracking-wider font-medium mb-3">
            Quick Stats
          </p>
          <div className="grid grid-cols-3 gap-4">
            {/* Population */}
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
              <p className="text-[8px] text-white/40 uppercase tracking-wider font-medium mb-3">Population</p>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-white/[0.04]">
                    <td className="text-[8px] text-white/60 py-1.5">Total Residents</td>
                    <td className="text-right text-white/90 font-semibold tabular-nums py-1.5">{(populationData.totalPopulation / 1e6).toFixed(2)}M</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="text-[8px] text-white/60 py-1.5">Expat %</td>
                    <td className="text-right text-white/90 font-semibold tabular-nums py-1.5">{populationData.expatPercent}%</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="text-[8px] text-white/60 py-1.5">Growth Rate</td>
                    <td className="text-right text-emerald-400 font-semibold tabular-nums py-1.5">+{populationData.populationGrowthRate}%</td>
                  </tr>
                  <tr>
                    <td className="text-[8px] text-white/60 py-1.5">2030 Projection</td>
                    <td className="text-right text-white/90 font-semibold tabular-nums py-1.5">{(populationData.projectedPopulation2030 / 1e6).toFixed(2)}M</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tourism */}
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
              <p className="text-[8px] text-white/40 uppercase tracking-wider font-medium mb-3">Tourism</p>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-white/[0.04]">
                    <td className="text-[8px] text-white/60 py-1.5">Total Visitors</td>
                    <td className="text-right text-white/90 font-semibold tabular-nums py-1.5">{(tourismData.totalVisitors12m / 1e6).toFixed(1)}M</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="text-[8px] text-white/60 py-1.5">Occupancy</td>
                    <td className="text-right text-white/90 font-semibold tabular-nums py-1.5">{tourismData.hotelOccupancy}%</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="text-[8px] text-white/60 py-1.5">ADR</td>
                    <td className="text-right text-white/90 font-semibold tabular-nums py-1.5">AED {tourismData.avgDailyRate.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="text-[8px] text-white/60 py-1.5">STR Growth</td>
                    <td className="text-right text-emerald-400 font-semibold tabular-nums py-1.5">+{tourismData.shortTermRentalGrowth}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Construction */}
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
              <p className="text-[8px] text-white/40 uppercase tracking-wider font-medium mb-3">Construction</p>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-white/[0.04]">
                    <td className="text-[8px] text-white/60 py-1.5">Under Constr.</td>
                    <td className="text-right text-white/90 font-semibold tabular-nums py-1.5">{(constructionData.unitsUnderConstruction / 1e3).toFixed(0)}K</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="text-[8px] text-white/60 py-1.5">Delivered (12m)</td>
                    <td className="text-right text-white/90 font-semibold tabular-nums py-1.5">{(constructionData.unitsDelivered12m / 1e3).toFixed(0)}K</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="text-[8px] text-white/60 py-1.5">Expected (12m)</td>
                    <td className="text-right text-white/90 font-semibold tabular-nums py-1.5">{(constructionData.unitsExpected12m / 1e3).toFixed(0)}K</td>
                  </tr>
                  <tr>
                    <td className="text-[8px] text-white/60 py-1.5">Cost Index</td>
                    <td className="text-right text-white/90 font-semibold tabular-nums py-1.5">{constructionData.constructionCostIndex}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sentiment Drivers */}
        <div className="px-6 py-4">
          <p className="text-[8px] text-white/40 uppercase tracking-wider font-medium mb-3">
            Sentiment Drivers
          </p>
          <div className="grid grid-cols-2 gap-2">
            {macroSummary.sentimentDrivers.map((driver: string, idx: number) => {
              const isPositive =
                driver.toLowerCase().includes('strong') ||
                driver.toLowerCase().includes('growth') ||
                driver.toLowerCase().includes('rising') ||
                driver.toLowerCase().includes('robust') ||
                driver.toLowerCase().includes('expansion') ||
                driver.toLowerCase().includes('supports') ||
                driver.toLowerCase().includes('boosts') ||
                driver.toLowerCase().includes('accelerates')
              const color = isPositive ? 'text-emerald-400' : 'text-amber-400'

              return (
                <div key={idx} className="flex gap-2 items-start p-2">
                  <span className={`text-lg flex-shrink-0 ${color}`}>&#9670;</span>
                  <p className="text-[8px] text-white/70 leading-snug">{driver}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
