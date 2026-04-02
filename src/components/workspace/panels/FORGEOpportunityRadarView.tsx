'use client'

import { useState, useMemo, useEffect } from 'react'
import { clients, getClient, getProperty } from '@/lib/mockData'
import { getCIEClient, ARCHETYPES } from '@/lib/cieData'
import { engineMatches, getEngineMatchesForClient, getClientPurpose, PURPOSE_CONFIGS } from '@/lib/engineData'
import { getArea, areas } from '@/lib/marketData'
import { useOpportunityScan } from '@/hooks/useForgeAI'
// Inline icon components (no external dependency)
const ChevronUp = ({ size = 12, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="18 15 12 9 6 15" /></svg>
)
const ChevronDown = ({ size = 12, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="6 9 12 15 18 9" /></svg>
)
const MinusIcon = ({ size = 12, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="5" y1="12" x2="19" y2="12" /></svg>
)
const Zap = ({ size = 14, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
)

const OPP_SECTIONS = [
  'HIDDEN GEMS',
  'MARKET TIMING SIGNALS',
  'RE-ENGAGEMENT OPPORTUNITIES',
  'CROSS-MATCH PATTERNS',
  'STRATEGIC RECOMMENDATIONS'
]

const GRADE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  'A+': { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'A+' },
  'A': { bg: 'bg-green-500/20', text: 'text-green-300', label: 'A' },
  'B+': { bg: 'bg-cyan-500/20', text: 'text-cyan-300', label: 'B+' },
  'B': { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'B' },
  'C': { bg: 'bg-amber-500/20', text: 'text-amber-300', label: 'C' },
  'D': { bg: 'bg-red-500/20', text: 'text-red-300', label: 'D' }
}

const OUTLOOK_COLORS: Record<string, { bg: string; text: string }> = {
  'bullish': { bg: 'bg-green-500/20', text: 'text-green-300' },
  'neutral': { bg: 'bg-amber-500/20', text: 'text-amber-300' },
  'bearish': { bg: 'bg-red-500/20', text: 'text-red-300' }
}

interface ClientMatch {
  propertyId: string
  propertyName: string
  area: string
  overallScore: number
  grade: string
  financialFit: number
  lifestyleFit: number
  investmentFit: number
  purposeAlignment: number
  status: string
}

interface AreaData {
  name: string
  demandScore: number
  avgRentalYield: number
  priceChange30d: number
  outlook: string
  transactionCount90d: number
}

export default function FORGEOpportunityRadarView() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const oppScan = useOpportunityScan()

  const selectedClient = selectedClientId ? getClient(selectedClientId) : null
  const selectedCIE = selectedClient ? getCIEClient(selectedClient.id) : null

  // Reset AI scan when switching clients
  useEffect(() => {
    oppScan.reset()
  }, [selectedClientId])

  const clientStats = useMemo(() => {
    return clients.map(client => {
      const matches = getEngineMatchesForClient(client.id)
      const topScore = matches.length > 0 ? Math.max(...matches.map(m => m.overallScore)) : 0

      return {
        clientId: client.id,
        clientName: client.name,
        clientType: client.type,
        totalMatches: matches.length,
        topScore: topScore,
        avgScore: matches.length > 0 ? matches.reduce((sum, m) => sum + m.overallScore, 0) / matches.length : 0,
        momentum: calculateEngagementMomentum(client.id)
      }
    })
  }, [])

  const handleAIScan = async () => {
    if (!selectedClient || !selectedCIE) return

    const matches = getEngineMatchesForClient(selectedClient.id)
    const matchesForPayload = matches.map(match => ({
      propertyId: match.propertyId,
      propertyName: getProperty(match.propertyId)?.name || match.propertyId,
      area: match.areaId || '',
      overallScore: match.overallScore,
      grade: match.grade,
      financialFit: match.pillars.financialFit.score,
      lifestyleFit: match.pillars.lifestyleFit.score,
      investmentFit: match.pillars.investmentFit.score,
      purposeAlignment: match.pillars.purposeAlignment.score,
      status: match.status
    }))

    const uniqueAreas = Array.from(new Set(matches.map(m => m.areaId).filter(Boolean) as string[]))
    const areaDataForPayload = uniqueAreas.map(areaId => {
      const areaInfo = areaId ? getArea(areaId) : undefined
      return {
        name: areaInfo?.name || areaId || 'Unknown',
        demandScore: areaInfo?.demandScore || 0,
        avgRentalYield: areaInfo?.avgRentalYield || 0,
        priceChange30d: areaInfo?.priceChange30d || 0,
        outlook: areaInfo?.outlook || 'neutral',
        transactionCount90d: areaInfo?.transactionCount90d || 0
      }
    })

    const clientPurpose = getClientPurpose(selectedClient.id)
    const purposeConfig = PURPOSE_CONFIGS.find(c => c.id === clientPurpose?.primaryPurpose)
    const archetypeData = ARCHETYPES.find(a => a.id === selectedCIE.archetype)

    await oppScan.generate({
      clientName: selectedClient.name,
      clientType: selectedClient.type,
      clientCategory: selectedClient.category,
      budgetMin: selectedClient.financialProfile.budgetMin,
      budgetMax: selectedClient.financialProfile.budgetMax,
      archetype: selectedCIE.archetype,
      archetypeLabel: archetypeData?.label || selectedCIE.archetype,
      primaryPurpose: clientPurpose?.primaryPurpose || 'Investment',
      purposeConfidence: clientPurpose?.confidence || 0.8,
      engagementScore: selectedCIE.engagement?.engagementScore || 0,
      engagementMomentum: selectedCIE.engagement?.momentum || 'stable',
      dealStage: selectedClient.dealStage,
      daysSinceContact: 0,
      matches: matchesForPayload,
      areaData: areaDataForPayload,
      investmentWeight: purposeConfig?.investmentWeight || 0.5,
      lifestyleWeight: purposeConfig?.lifestyleWeight || 0.5,
      keyFactors: purposeConfig?.keyFactors || []
    })
  }

  return (
    <div className="h-full flex gap-3 p-3 overflow-hidden bg-black/40">
      {/* LEFT SIDEBAR -- Clients List */}
      <div className="w-[35%] flex flex-col gap-2 overflow-hidden">
        <div className="text-[9px] font-semibold text-white/70 uppercase tracking-wider px-2 py-1">
          Clients -- Radar Scan
        </div>

        <div className="flex-1 overflow-y-auto gap-1 flex flex-col scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/10">
          {clientStats.map(stat => (
            <button
              key={stat.clientId}
              onClick={() => setSelectedClientId(stat.clientId)}
              className={`px-2 py-1.5 rounded text-left transition-colors ${
                selectedClientId === stat.clientId
                  ? 'bg-white/[0.08] border border-amber-400/40'
                  : 'bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <div className="text-[10px] font-semibold text-white/90 truncate flex-1">{stat.clientName}</div>
                <div className="text-[9px] font-medium text-amber-300 whitespace-nowrap">{stat.totalMatches}</div>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <div className="text-[8px] text-white/40">Top Score:</div>
                <div className="text-[9px] font-semibold text-white/80">{stat.topScore.toFixed(0)}</div>
              </div>

              <div className="flex items-center gap-1">
                <div className="text-[8px] text-white/40">Momentum:</div>
                <div className="flex items-center gap-0.5">
                  {stat.momentum > 0 ? (
                    <ChevronUp size={12} className="text-green-400" />
                  ) : stat.momentum < 0 ? (
                    <ChevronDown size={12} className="text-red-400" />
                  ) : (
                    <MinusIcon size={12} className="text-amber-400" />
                  )}
                  <span className="text-[8px] text-white/60">{Math.abs(stat.momentum).toFixed(1)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL -- Client Details & AI Output */}
      {selectedClient && selectedCIE ? (
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="text-[11px] font-semibold text-white/90">{selectedClient.name}</h2>
              <span className="text-[8px] text-white/40 font-mono">{selectedClient.type}</span>
            </div>
            <div className="flex gap-4 text-[8px] text-white/60">
              <span>Budget: {formatCurrency(selectedClient.financialProfile.budgetMin)} -- {formatCurrency(selectedClient.financialProfile.budgetMax)}</span>
              <span>Archetype: {ARCHETYPES.find(a => a.id === selectedCIE.archetype)?.label}</span>
              <span>Engagement: {selectedCIE.engagement?.engagementScore || 0}/100</span>
            </div>
          </div>

          {!oppScan.content ? (
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/10">
              {/* Match Distribution */}
              <MatchDistributionCard clientId={selectedClient.id} />

              {/* Area Heatmap */}
              <AreaHeatmapCard clientId={selectedClient.id} />

              {/* Score Distribution */}
              <ScoreDistributionCard clientId={selectedClient.id} />

              {/* Status Breakdown */}
              <StatusBreakdownCard clientId={selectedClient.id} />

              {/* AI Scan Button */}
              <button
                onClick={handleAIScan}
                disabled={oppScan.loading}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-black font-semibold text-[10px] rounded transition-colors flex items-center justify-center gap-2 mt-auto"
              >
                <Zap size={14} />
                {oppScan.loading ? 'Scanning...' : 'AI Opportunity Scan'}
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/10">
              <AIOutputDisplay output={oppScan.content} onReset={() => oppScan.reset()} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-white/40 text-[10px]">
          Select a client to view opportunity radar
        </div>
      )}
    </div>
  )
}

function MatchDistributionCard({ clientId }: { clientId: string }) {
  const matches = getEngineMatchesForClient(clientId)
  const distribution = countByGrade(matches)

  return (
    <div className="px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded">
      <div className="text-[8px] font-semibold text-white/40 uppercase mb-2 tracking-wider">Match Distribution</div>
      <div className="flex gap-1.5 flex-wrap">
        {['A+', 'A', 'B+', 'B', 'C', 'D'].map(grade => {
          const count = distribution[grade] || 0
          const colors = GRADE_COLORS[grade]
          return (
            <div
              key={grade}
              className={`px-2 py-1 rounded text-[9px] font-semibold ${colors.bg} ${colors.text}`}
            >
              {colors.label}: {count}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AreaHeatmapCard({ clientId }: { clientId: string }) {
  const matches = getEngineMatchesForClient(clientId)
  const uniqueAreas = Array.from(new Set(matches.map(m => m.areaId).filter(Boolean) as string[]))
  const areaStats = uniqueAreas.map(areaId => {
    const areaInfo = getArea(areaId)
    return {
      name: areaInfo?.name || areaId,
      demandScore: areaInfo?.demandScore || 0,
      priceChange30d: areaInfo?.priceChange30d || 0,
      outlook: areaInfo?.outlook || 'neutral'
    }
  })

  return (
    <div className="px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded">
      <div className="text-[8px] font-semibold text-white/40 uppercase mb-2 tracking-wider">Area Heatmap</div>
      <div className="space-y-1">
        {areaStats.map(area => {
          const outlookColor = OUTLOOK_COLORS[area.outlook]
          return (
            <div key={area.name} className="flex items-center justify-between gap-2">
              <span className="text-[9px] text-white/70 flex-1">{area.name}</span>
              <div className="flex gap-1.5">
                <div className="text-[8px] text-white/50">Demand: {area.demandScore.toFixed(0)}</div>
                <div className={`text-[8px] font-medium ${area.priceChange30d >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {area.priceChange30d >= 0 ? '+' : ''}{area.priceChange30d.toFixed(1)}%
                </div>
                <div className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${outlookColor.bg} ${outlookColor.text}`}>
                  {area.outlook}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScoreDistributionCard({ clientId }: { clientId: string }) {
  const matches = getEngineMatchesForClient(clientId)
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 8)

  const maxScore = 100

  return (
    <div className="px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded">
      <div className="text-[8px] font-semibold text-white/40 uppercase mb-2 tracking-wider">Score Distribution</div>
      <div className="space-y-1">
        {matches.map(match => {
          const property = getProperty(match.propertyId)
          const barWidth = (match.overallScore / maxScore) * 100
          return (
            <div key={match.propertyId} className="flex items-center gap-2">
              <span className="text-[8px] text-white/60 w-24 truncate">{property?.name}</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="text-[8px] text-white/70 font-semibold w-8 text-right">{match.overallScore.toFixed(0)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusBreakdownCard({ clientId }: { clientId: string }) {
  const matches = getEngineMatchesForClient(clientId)
  const statuses = countByStatus(matches)

  return (
    <div className="px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded">
      <div className="text-[8px] font-semibold text-white/40 uppercase mb-2 tracking-wider">Status Breakdown</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="text-[9px]">
          <span className="text-white/40">Active:</span> <span className="text-white/80 font-semibold">{statuses.active}</span>
        </div>
        <div className="text-[9px]">
          <span className="text-white/40">Presented:</span> <span className="text-white/80 font-semibold">{statuses.presented}</span>
        </div>
        <div className="text-[9px]">
          <span className="text-white/40">Shortlisted:</span> <span className="text-white/80 font-semibold">{statuses.shortlisted}</span>
        </div>
        <div className="text-[9px]">
          <span className="text-white/40">Rejected:</span> <span className="text-white/80 font-semibold">{statuses.rejected}</span>
        </div>
      </div>
    </div>
  )
}

function AIOutputDisplay({ output, onReset }: { output: string; onReset: () => void }) {
  const sections = parseAIOuput(output)

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-3 py-2 sticky top-0 bg-black/60 backdrop-blur">
        <h3 className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">AI Opportunity Analysis</h3>
        <button
          onClick={onReset}
          className="text-[8px] text-white/40 hover:text-white/70 transition-colors"
        >
          Back to Radar
        </button>
      </div>

      <div className="px-3 space-y-3 pb-3">
        {OPP_SECTIONS.map(section => {
          const content = sections[section] || ''
          if (!content) return null

          return (
            <div key={section} className="bg-white/[0.02] border border-white/[0.06] rounded p-3">
              <h4 className="text-[9px] font-semibold text-amber-400 uppercase tracking-wider mb-2">{section}</h4>
              <p className="text-[10px] text-white/60 leading-[1.75] whitespace-pre-wrap">
                {content}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* Helpers */

function parseAIOuput(output: string): Record<string, string> {
  const sections: Record<string, string> = {}

  OPP_SECTIONS.forEach(section => {
    const regex = new RegExp(`${section}:?\\s*([\\s\\S]*?)(?=${OPP_SECTIONS.filter(s => s !== section).join('|')}|$)`, 'i')
    const match = output.match(regex)
    if (match && match[1]) {
      sections[section] = match[1].trim()
    }
  })

  return sections
}

function countByGrade(matches: any[]): Record<string, number> {
  const counts: Record<string, number> = {
    'A+': 0,
    'A': 0,
    'B+': 0,
    'B': 0,
    'C': 0,
    'D': 0
  }
  matches.forEach(m => {
    if (counts[m.grade] !== undefined) counts[m.grade]++
  })
  return counts
}

function countByStatus(matches: any[]): Record<string, number> {
  const counts = {
    active: 0,
    presented: 0,
    shortlisted: 0,
    rejected: 0
  }
  matches.forEach(m => {
    const status = m.status?.toLowerCase() || 'active'
    if (counts[status as keyof typeof counts] !== undefined) {
      counts[status as keyof typeof counts]++
    }
  })
  return counts
}

function calculateEngagementMomentum(clientId: string): number {
  const client = getClient(clientId)
  if (!client) return 0

  const cieClient = getCIEClient(clientId)
  if (!cieClient) return 0

  // Momentum based on engagement score trend
  // In a real system, this would compare current vs. previous period
  // For now, we'll use engagement score and recent contact pattern
  const engScore = cieClient.engagement?.engagementScore || 50
  return engScore
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `£${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `£${(value / 1_000).toFixed(0)}K`
  }
  return `£${value}`
}
