'use client'

import React, { useState, useMemo } from 'react'
import { priceAlerts, priceIntelSummary, type PriceAlert } from '@/lib/priceData'
import { useWorkspaceNav, AreaLink } from '../useWorkspaceNav'

type PriceAlertType = PriceAlert['type']

// ============================================================================
// PCIS Price Alerts View — Anomaly Detection & Opportunity Signals
// ============================================================================
// Real-time price anomaly detection dashboard showing price drops, spikes,
// volume divergences, yield anomalies, arbitrage opportunities, and trend
// reversals. Integrated market intelligence with actionable insights for
// brokers and investment advisors. PCIS design system compliant.
// ============================================================================

type SeverityFilter = 'all' | 'high' | 'medium' | 'low'

interface AlertTypeCard {
  type: PriceAlertType
  label: string
  icon: string
  accentColor: string
  bgClass: string
  borderClass: string
  textClass: string
  count: number
}

const ALERT_TYPE_CONFIG: Record<
  PriceAlertType,
  {
    icon: string
    label: string
    accentColor: string
    bgClass: string
    borderClass: string
    textClass: string
  }
> = {
  'price-drop': {
    icon: '▼',
    label: 'Price Drops',
    accentColor: '#ef4444',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/20',
    textClass: 'text-red-400',
  },
  'price-spike': {
    icon: '▲',
    label: 'Price Spikes',
    accentColor: '#f59e0b',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/20',
    textClass: 'text-amber-400',
  },
  'volume-divergence': {
    icon: '⇄',
    label: 'Vol Divergence',
    accentColor: '#8b5cf6',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/20',
    textClass: 'text-purple-400',
  },
  'yield-anomaly': {
    icon: '◎',
    label: 'Yield Anomaly',
    accentColor: '#3b82f6',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/20',
    textClass: 'text-blue-400',
  },
  arbitrage: {
    icon: '⟷',
    label: 'Arbitrage',
    accentColor: '#10b981',
    bgClass: 'bg-green-500/10',
    borderClass: 'border-green-500/20',
    textClass: 'text-green-400',
  },
  'trend-reversal': {
    icon: '↺',
    label: 'Trend Reversal',
    accentColor: '#f97316',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/20',
    textClass: 'text-orange-400',
  },
}

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function SeverityBadge({ severity }: { severity: 'high' | 'medium' | 'low' }): React.ReactElement {
  const styles = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  }

  return (
    <span className={`text-[8px] font-bold uppercase px-2 py-1 rounded border ${styles[severity]}`}>
      {severity}
    </span>
  )
}

function TypeBadge({ type }: { type: PriceAlertType }): React.ReactElement {
  const config = ALERT_TYPE_CONFIG[type]
  return (
    <span
      className={`text-[8px] font-bold uppercase px-2 py-1 rounded border ${config.bgClass} ${config.textClass} ${config.borderClass}`}
    >
      {config.label}
    </span>
  )
}

function PriceAlertCard({ alert, isInactive }: { alert: PriceAlert; isInactive: boolean }): React.ReactElement {
  const deviationSign = alert.deviationPct >= 0 ? '+' : ''
  const deviationColor = alert.deviationPct > 0 ? 'text-red-400' : 'text-green-400'

  return (
    <div
      className={`border border-white/[0.04] bg-white/[0.02] rounded-lg p-4 hover:bg-white/[0.03] transition-colors ${
        isInactive ? 'opacity-50' : ''
      }`}
    >
      {/* Header: Badges + Date */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={alert.severity} />
          <TypeBadge type={alert.type} />
        </div>
        <span className="text-[8px] text-white/40 font-mono">{formatRelativeDate(alert.detectedDate)}</span>
      </div>

      {/* Title & Description */}
      <h3 className="text-[11px] font-semibold text-white/90 mb-1">{alert.title}</h3>
      <p className="text-[10px] text-white/70 mb-3">{alert.description}</p>

      {/* Metrics Section */}
      <div className="space-y-1.5 mb-3 bg-white/[0.02] rounded p-2.5 border border-white/[0.04]">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-white/40">Area</span>
          <AreaLink areaId={alert.areaId} className="text-white/90 font-medium">
            {alert.area}
          </AreaLink>
        </div>
        {alert.building && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/40">Building</span>
            <span className="text-white/70">{alert.building}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-white/40">Metric</span>
          <span className="text-white/90 font-mono">{alert.metric}</span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-white/40">Current</span>
          <span className="text-white/90 font-mono tabular-nums">
            {typeof alert.currentValue === 'number' && alert.currentValue >= 1000
              ? (alert.currentValue / 1000).toFixed(1) + 'K'
              : alert.currentValue.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-white/40">Expected</span>
          <span className="text-white/90 font-mono tabular-nums">
            {typeof alert.expectedValue === 'number' && alert.expectedValue >= 1000
              ? (alert.expectedValue / 1000).toFixed(1) + 'K'
              : alert.expectedValue.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/[0.04]">
          <span className="text-white/40 font-semibold">Deviation</span>
          <span className={`font-bold font-mono tabular-nums ${deviationColor}`}>
            {deviationSign}
            {Math.abs(alert.deviationPct).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Actionable Insight */}
      <div className="bg-white/[0.02] border border-white/[0.04] rounded p-2.5 flex gap-2">
        <svg className="w-4 h-4 text-pcis-gold flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
        <div>
          <p className="text-[9px] text-white/40 uppercase tracking-wider font-semibold mb-1">Actionable Insight</p>
          <p className="text-[10px] text-white/70 leading-snug">{alert.actionableInsight}</p>
        </div>
      </div>
    </div>
  )
}

export default function PriceAlertsView(): React.ReactElement {
  const [selectedType, setSelectedType] = useState<PriceAlertType | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [activeOnly, setActiveOnly] = useState<boolean>(true)

  // Calculate alert type counts
  const typeCounts = useMemo(() => {
    const counts: Record<PriceAlertType, number> = {
      'price-drop': 0,
      'price-spike': 0,
      'volume-divergence': 0,
      'yield-anomaly': 0,
      arbitrage: 0,
      'trend-reversal': 0,
    }
    priceAlerts.forEach((alert: PriceAlert) => {
      counts[alert.type]++
    })
    return counts
  }, [])

  // Get unique areas
  const areaOptions = useMemo(() => {
    const areas = new Set(priceAlerts.map((alert: PriceAlert) => alert.area))
    return Array.from(areas).sort()
  }, [])

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    let result = priceAlerts

    if (activeOnly) {
      result = result.filter((alert: PriceAlert) => alert.isActive)
    }

    if (selectedType !== 'all') {
      result = result.filter((alert: PriceAlert) => alert.type === selectedType)
    }

    if (severityFilter !== 'all') {
      result = result.filter((alert: PriceAlert) => alert.severity === severityFilter)
    }

    if (areaFilter !== 'all') {
      result = result.filter((alert: PriceAlert) => alert.area === areaFilter)
    }

    return result.sort((a: PriceAlert, b: PriceAlert) => {
      // Sort by: severity (high first), then by deviation magnitude
      const severityOrder = { high: 0, medium: 1, low: 2 }
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
      if (severityDiff !== 0) return severityDiff

      return Math.abs(b.deviationPct) - Math.abs(a.deviationPct)
    })
  }, [selectedType, severityFilter, areaFilter, activeOnly])

  // Top opportunities (by deviation magnitude)
  const topOpportunities = useMemo(() => {
    return filteredAlerts.slice(0, 3)
  }, [filteredAlerts])

  const typeCards: AlertTypeCard[] = [
    { type: 'price-drop', count: typeCounts['price-drop'], ...ALERT_TYPE_CONFIG['price-drop'] },
    { type: 'price-spike', count: typeCounts['price-spike'], ...ALERT_TYPE_CONFIG['price-spike'] },
    { type: 'volume-divergence', count: typeCounts['volume-divergence'], ...ALERT_TYPE_CONFIG['volume-divergence'] },
    { type: 'yield-anomaly', count: typeCounts['yield-anomaly'], ...ALERT_TYPE_CONFIG['yield-anomaly'] },
    { type: 'arbitrage', count: typeCounts['arbitrage'], ...ALERT_TYPE_CONFIG['arbitrage'] },
    { type: 'trend-reversal', count: typeCounts['trend-reversal'], ...ALERT_TYPE_CONFIG['trend-reversal'] },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-white/[0.04]">
        <div>
          <h2
            className="text-lg font-semibold text-white/90 tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Price Alerts
          </h2>
          <p className="text-[10px] text-white/40 tracking-wider uppercase mt-0.5">
            Anomaly detection · Opportunity signals
          </p>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-white/40 uppercase tracking-wider block mb-1">Active Alerts</p>
          <p className="text-[16px] font-bold text-pcis-gold tabular-nums">{priceAlerts.filter((a: PriceAlert) => a.isActive).length}</p>
          <p className="text-[8px] text-white/40 uppercase tracking-wider mt-1 block">High Priority</p>
          <p className="text-[12px] font-bold text-red-400 tabular-nums">{priceIntelSummary.highSeverityAlerts}</p>
        </div>
      </div>

      {/* Alert Type Summary Cards */}
      <div className="flex-shrink-0 py-3 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-min pr-3">
          {typeCards.map((card: AlertTypeCard) => (
            <button
              key={card.type}
              onClick={() => setSelectedType(selectedType === card.type ? 'all' : card.type)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg border transition-colors text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap ${
                selectedType === card.type
                  ? `${card.bgClass} ${card.textClass} ${card.borderClass} bg-opacity-20 border-opacity-100`
                  : `bg-white/[0.02] border-white/[0.04] text-white/70 hover:bg-white/[0.04]`
              }`}
            >
              <span className="mr-1.5">{card.icon}</span>
              <span>
                {card.label} ({card.count})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex-shrink-0 space-y-2.5 pb-3 border-b border-white/[0.04]">
        {/* Severity Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-white/40 uppercase tracking-wider font-semibold w-12">Severity</span>
          <div className="flex items-center gap-1">
            {(['all', 'high', 'medium', 'low'] as const).map((sev: SeverityFilter) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`text-[8px] tracking-wider px-2 py-1 rounded-lg transition-colors font-semibold ${
                  severityFilter === sev
                    ? 'text-pcis-gold bg-pcis-gold/[0.08] border border-pcis-gold/20'
                    : 'text-white/70 border border-transparent hover:bg-white/[0.03]'
                }`}
              >
                {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Area Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-white/40 uppercase tracking-wider font-semibold w-12">Area</span>
          <select
            value={areaFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAreaFilter(e.target.value)}
            className="text-[8px] px-2 py-1 rounded-lg bg-white/[0.05] border border-white/[0.04] text-white/90 hover:bg-white/[0.08] transition-colors font-semibold"
          >
            <option value="all">All Areas</option>
            {areaOptions.map((area: string) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        {/* Active Only Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-white/40 uppercase tracking-wider font-semibold w-12">Status</span>
          <button
            onClick={() => setActiveOnly(!activeOnly)}
            className={`text-[8px] tracking-wider px-2 py-1 rounded-lg transition-colors font-semibold ${
              activeOnly
                ? 'text-pcis-gold bg-pcis-gold/[0.08] border border-pcis-gold/20'
                : 'text-white/70 border border-transparent hover:bg-white/[0.03]'
            }`}
          >
            {activeOnly ? 'Active Only' : 'All Alerts'}
          </button>
        </div>
      </div>

      {/* Main Content: Alert Cards */}
      <div className="flex-1 overflow-y-auto min-h-0 py-3">
        {filteredAlerts.length > 0 ? (
          <div className="space-y-2.5 pr-3">
            {filteredAlerts.map((alert: PriceAlert) => (
              <PriceAlertCard key={alert.id} alert={alert} isInactive={!alert.isActive} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="w-8 h-8 text-white/20 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <p className="text-[10px] text-white/40">No alerts match the selected filters</p>
          </div>
        )}
      </div>

      {/* Opportunity Score Section */}
      {topOpportunities.length > 0 && (
        <div className="flex-shrink-0 border-t border-white/[0.04] pt-3 mt-auto">
          <h3
            className="text-[11px] font-semibold text-white/90 uppercase tracking-wider pb-2 border-b border-white/[0.04] mb-2"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Top Opportunities
          </h3>
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-3">
            {topOpportunities.map((alert: PriceAlert, idx: number) => {
              const config = ALERT_TYPE_CONFIG[alert.type]
              const deviationSign = alert.deviationPct >= 0 ? '+' : ''
              return (
                <div
                  key={`opp-${idx}`}
                  className="flex items-center justify-between text-[9px] px-2.5 py-1.5 bg-white/[0.02] border border-white/[0.04] rounded-lg hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-white/90 mb-0.5">
                      {idx + 1}. {alert.title}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/40">{alert.area}</span>
                      <span className={`font-bold font-mono ${alert.deviationPct > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {deviationSign}
                        {Math.abs(alert.deviationPct).toFixed(1)}%
                      </span>
                      <span
                        className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${config.bgClass} ${config.textClass} ${config.borderClass}`}
                      >
                        {config.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
