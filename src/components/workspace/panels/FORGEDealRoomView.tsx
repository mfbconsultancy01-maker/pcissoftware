'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { clients, properties, getClient, getProperty } from '@/lib/mockData'
import { getCIEClient, ARCHETYPES, type CIEClient } from '@/lib/cieData'
import { engineMatches, getEngineMatchesForClient, getClientPurpose, PURPOSE_CONFIGS, type EngineMatch } from '@/lib/engineData'
import { getArea } from '@/lib/marketData'
import { useDealBrief } from '@/hooks/useForgeAI'
import { generateDealMemorandum } from '@/lib/forgePdfGenerator'

const DEAL_SECTIONS = [
  'EXECUTIVE SUMMARY',
  'STRATEGIC RATIONALE',
  'FINANCIAL ANALYSIS',
  'MARKET POSITIONING',
  'RISK ASSESSMENT',
  'LIFESTYLE AND VALUE PROPOSITION',
  'RECOMMENDED NEXT STEPS'
]

const parseSections = (text: string) => {
  const sections: { heading: string; body: string }[] = []
  const pattern = new RegExp(`(${DEAL_SECTIONS.join('|')})`, 'g')
  const parts = text.split(pattern).filter(Boolean)
  for (let i = 0; i < parts.length; i++) {
    if (DEAL_SECTIONS.includes(parts[i].trim())) {
      sections.push({ heading: parts[i].trim(), body: (parts[i + 1] || '').trim() })
      i++
    }
  }
  return sections
}

const ScoreBar = ({ score, height = 'h-1' }: { score: number; height?: string }) => {
  const percentage = (score / 100) * 100
  return (
    <div className={`w-full ${height} bg-white/[0.06] rounded-sm overflow-hidden`}>
      <div
        className="h-full bg-[#f59e0b] transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

const GradeBadge = ({ grade }: { grade: string }) => {
  const bgColour = {
    A: 'bg-[#10b981]/20 border-[#10b981]/40 text-[#10b981]',
    B: 'bg-[#3b82f6]/20 border-[#3b82f6]/40 text-[#3b82f6]',
    C: 'bg-[#8b5cf6]/20 border-[#8b5cf6]/40 text-[#8b5cf6]',
    D: 'bg-[#f59e0b]/20 border-[#f59e0b]/40 text-[#f59e0b]'
  }[grade] || 'bg-white/[0.05] border-white/[0.1] text-white/70'

  return (
    <div className={`px-2 py-1 rounded border text-[8px] font-bold tracking-wider ${bgColour}`}>
      GRADE {grade}
    </div>
  )
}

const PurposeBadge = ({ purpose }: { purpose: string }) => {
  const config = PURPOSE_CONFIGS.find(c => c.id === purpose)
  if (!config) return null

  return (
    <div className={`px-2 py-1 rounded border text-[8px] font-semibold tracking-wider`} style={{
      backgroundColor: config.color + '20',
      borderColor: config.color + '40',
      color: config.color
    }}>
      {config.label}
    </div>
  )
}

const StarIcon = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1l2.2 4.5L15 6.3l-3.5 3.4.8 4.8L8 12.2 3.7 14.5l.8-4.8L1 6.3l4.8-.8z" />
  </svg>
)

const Spinner = () => (
  <div className="w-3 h-3 border-2 border-[#f59e0b]/30 border-t-[#f59e0b] rounded-full animate-spin" />
)

interface ClientSidebarProps {
  clients: typeof clients
  selectedClientId: string | null
  onSelectClient: (clientId: string) => void
  selectedMatchId: string | null
}

const ClientSidebar: React.FC<ClientSidebarProps> = ({
  clients,
  selectedClientId,
  onSelectClient,
  selectedMatchId
}) => {
  return (
    <div className="w-[35%] h-full bg-white/[0.01] border-r border-white/[0.06] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/[0.06]">
        <div className="text-[9px] font-semibold tracking-wider text-white/40 uppercase">
          Clients
        </div>
      </div>

      {/* Client List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-2">
          {clients.map(client => {
            const matches = getEngineMatchesForClient(client.id)
            const topMatch = matches[0]
            const cieData = getCIEClient(client.id)

            return (
              <div
                key={client.id}
                onClick={() => onSelectClient(client.id)}
                className={`p-2 rounded border cursor-pointer transition-all ${
                  selectedClientId === client.id
                    ? 'bg-[#f59e0b]/15 border-[#f59e0b]/50'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="text-[8px] font-bold text-white/90 uppercase tracking-wider">
                      {client.initials}
                    </div>
                    <div className="text-[7px] text-white/60 mt-0.5">
                      {client.name}
                    </div>
                  </div>
                  <div className="text-[7px] text-white/40">
                    {client.type}
                  </div>
                </div>

                {topMatch && (
                  <div className="mt-1.5 pt-1.5 border-t border-white/[0.06]">
                    <div className="text-[7px] text-white/40 uppercase tracking-wider mb-1">
                      TOP MATCH
                    </div>
                    <div className="text-[8px] text-white/70 font-medium">
                      {getProperty(topMatch.propertyId)?.name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1">
                        <ScoreBar score={topMatch.overallScore} height="h-0.5" />
                      </div>
                      <div className="text-[8px] font-bold text-[#f59e0b]">
                        {Math.round(topMatch.overallScore)}
                      </div>
                    </div>
                  </div>
                )}

                {selectedClientId === client.id && (
                  <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-1.5">
                    {matches.slice(0, 3).map(match => {
                      const prop = getProperty(match.propertyId)
                      return (
                        <div
                          key={match.id}
                          onClick={(e) => e.stopPropagation()}
                          className={`p-1.5 rounded border cursor-pointer transition-all ${
                            selectedMatchId === match.id
                              ? 'bg-white/[0.08] border-[#f59e0b]/50'
                              : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="text-[7px] font-medium text-white/80">
                            {prop?.name}
                          </div>
                          <div className="text-[7px] text-white/50 mt-0.5">
                            {prop?.area}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <ScoreBar score={match.overallScore} height="h-0.5" />
                            <div className="text-[7px] font-bold text-[#f59e0b]">
                              {match.grade}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface RightPanelProps {
  client: any
  match: EngineMatch
  cieData: CIEClient
}

const RightPanel: React.FC<RightPanelProps> = ({ client, match, cieData }) => {
  const property = getProperty(match.propertyId)
  const rawArea = match.areaData || (match.areaId ? getArea(match.areaId) : undefined)
  const area = rawArea as any
  const clientPurpose = getClientPurpose(client.id)
  const purposeConfig = PURPOSE_CONFIGS.find(c => c.id === clientPurpose?.primaryPurpose)
  const archetype = ARCHETYPES.find(a => a.id === cieData.archetype)

  const { content, loading, error, generate, reset } = useDealBrief()
  const [pdfReady, setPdfReady] = useState(false)
  const [generating, setGenerating] = useState(false)

  const buildPayload = useCallback(() => ({
    client: {
      id: client.id,
      name: client.name,
      type: client.type,
      category: client.category,
      budget: {
        min: client.financialProfile.budgetMin,
        max: client.financialProfile.budgetMax
      },
      location: client.location,
      dealStage: client.dealStage
    },
    match: {
      id: match.id,
      overallScore: match.overallScore,
      grade: match.grade,
      purpose: match.purpose,
      confidence: match.confidence,
      status: match.status,
      pillars: match.pillars
    },
    property: {
      name: property?.name,
      area: property?.area,
      type: property?.type,
      price: property?.price,
      bedrooms: property?.bedrooms,
      features: property?.features,
      sqft: (property as any)?.sqft
    },
    areaData: {
      name: (area as any)?.name,
      avgPriceSqft: area?.avgPriceSqft,
      avgRentalYield: (area as any)?.avgRentalYield ?? (area as any)?.rentalYield,
      demandScore: area?.demandScore,
      priceChange30d: area?.priceChange30d,
      transactionCount90d: (area as any)?.transactionCount90d ?? (area as any)?.transactionCount,
      outlook: area?.outlook
    },
    cieData: {
      archetype: cieData.archetype,
      engagementScore: cieData.engagement?.engagementScore,
      momentum: cieData.engagement?.momentum,
      profile: cieData.profile
    },
    purpose: clientPurpose
  }), [client, match, property, area, cieData, clientPurpose])

  const handleGenerateBrief = async () => {
    setGenerating(true)
    setPdfReady(false)
    const payload = buildPayload()
    await generate(payload)
    setGenerating(false)
  }

  const buildPdfData = useCallback(() => ({
    clientName: client.name,
    clientType: client.type,
    propertyName: property?.name || 'Property Analysis',
    propertyArea: property?.area || '',
    matchScore: match.overallScore,
    matchGrade: match.grade,
    content: content || '',
    // Enrichment data for tables and visuals
    propertyPrice: property?.price,
    propertySqft: (property as any)?.sqft,
    propertyBedrooms: property?.bedrooms,
    propertyType: property?.type,
    budgetMin: client.financialProfile?.budgetMin,
    budgetMax: client.financialProfile?.budgetMax,
    pillarScores: {
      financialFit: match.pillars?.financialFit?.score ?? 0,
      lifestyleFit: match.pillars?.lifestyleFit?.score ?? 0,
      investmentFit: match.pillars?.investmentFit?.score ?? 0,
      purposeAlignment: match.pillars?.purposeAlignment?.score ?? 0,
    },
    areaData: {
      demandScore: area?.demandScore,
      rentalYield: (area as any)?.avgRentalYield ?? (area as any)?.rentalYield,
      priceChange30d: area?.priceChange30d,
      transactionCount90d: (area as any)?.transactionCount90d ?? (area as any)?.transactionCount,
      avgPriceSqft: area?.avgPriceSqft,
      outlook: area?.outlook,
    },
    purpose: clientPurpose?.primaryPurpose,
    dealStage: client.dealStage,
    archetype: archetype?.label,
  }), [content, client, property, match, area, clientPurpose, archetype])

  const handleDownloadPdf = useCallback(() => {
    if (!content) return
    generateDealMemorandum(buildPdfData())
  }, [content, buildPdfData])

  // Auto-trigger PDF download when content arrives
  React.useEffect(() => {
    if (content && !loading) {
      setPdfReady(true)
      // Auto-download the PDF once generated
      generateDealMemorandum(buildPdfData())
    }
  }, [content, loading])

  const sections = content ? parseSections(content) : []

  return (
    <div className="w-[65%] h-full bg-white/[0.01] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold text-white/90 uppercase tracking-wider">
            {property?.name}
          </div>
          <div className="text-[8px] text-white/40 mt-1">
            {property?.area}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pdfReady && (
            <button
              onClick={handleDownloadPdf}
              className="px-2.5 py-1 rounded border border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20 transition-all text-[9px] font-semibold tracking-wider uppercase flex items-center gap-1.5"
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2v9M4 8l4 4 4-4M2 14h12" />
              </svg>
              Download PDF
            </button>
          )}
          <button
            onClick={handleGenerateBrief}
            disabled={loading}
            className="px-2.5 py-1 rounded border border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/20 transition-all text-[9px] font-semibold tracking-wider uppercase disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <Spinner />
                Generating Memorandum...
              </>
            ) : pdfReady ? (
              <>
                <StarIcon />
                Regenerate
              </>
            ) : (
              <>
                <StarIcon />
                Generate Deal Memorandum
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Match & Grade Overview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
                  Overall Match Score
                </div>
                <ScoreBar score={match.overallScore} height="h-1.5" />
              </div>
              <GradeBadge grade={match.grade} />
            </div>
            {purposeConfig && <PurposeBadge purpose={match.purpose} />}
          </div>

          {/* Client Profile */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded p-3">
            <div className="text-[8px] font-semibold text-white/40 uppercase tracking-wider mb-2">
              Client Profile
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-white/60">{client.name}</span>
                <span className="text-[8px] font-bold text-[#f59e0b]">{client.type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-white/60">Archetype</span>
                <span className="text-[8px] font-semibold text-white/80">
                  {archetype?.label}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-white/60">Budget Range</span>
                <span className="text-[8px] font-semibold text-white/80">
                  ${(client.financialProfile.budgetMin / 1000000).toFixed(1)}M -- ${(client.financialProfile.budgetMax / 1000000).toFixed(1)}M
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-white/60">Deal Stage</span>
                <span className="text-[8px] font-semibold text-white/80">
                  {client.dealStage}
                </span>
              </div>
            </div>
          </div>

          {/* Property Profile */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded p-3">
            <div className="text-[8px] font-semibold text-white/40 uppercase tracking-wider mb-2">
              Property Profile
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-white/60">Type</span>
                <span className="text-[8px] font-semibold text-white/80">{property?.type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-white/60">Price</span>
                <span className="text-[8px] font-bold text-[#f59e0b]">
                  ${((property?.price || 0) / 1000000).toFixed(1)}M
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-white/60">Bedrooms</span>
                <span className="text-[8px] font-semibold text-white/80">{property?.bedrooms}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-white/60">Area</span>
                <span className="text-[8px] font-semibold text-white/80">{(property as any)?.sqft?.toLocaleString() || '--'} sqft</span>
              </div>
            </div>
          </div>

          {/* Pillar Scores */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded p-3">
            <div className="text-[8px] font-semibold text-white/40 uppercase tracking-wider mb-3">
              Match Pillars
            </div>
            <div className="space-y-2">
              {[
                { label: 'Financial Fit', pillar: match.pillars?.financialFit },
                { label: 'Lifestyle Fit', pillar: match.pillars?.lifestyleFit },
                { label: 'Investment Fit', pillar: match.pillars?.investmentFit },
                { label: 'Purpose Alignment', pillar: match.pillars?.purposeAlignment }
              ].map(({ label, pillar }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[7px] text-white/60">{label}</span>
                    <span className="text-[8px] font-bold text-[#f59e0b]">
                      {Math.round(pillar?.score ?? 0)}%
                    </span>
                  </div>
                  <ScoreBar score={pillar?.score ?? 0} height="h-0.5" />
                </div>
              ))}
            </div>
          </div>

          {/* Market Data */}
          {area && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded p-3">
              <div className="text-[8px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                Market Intelligence
              </div>
              <div className="grid grid-cols-2 gap-2 text-[8px]">
                <div>
                  <div className="text-white/50">Demand Score</div>
                  <div className="text-[9px] font-bold text-[#f59e0b]">
                    {area?.demandScore ?? '--'}/100
                  </div>
                </div>
                <div>
                  <div className="text-white/50">Rental Yield</div>
                  <div className="text-[9px] font-bold text-[#f59e0b]">
                    {area?.avgRentalYield ?? '--'}%
                  </div>
                </div>
                <div>
                  <div className="text-white/50">Price Change (30d)</div>
                  <div className={`text-[9px] font-bold ${(area?.priceChange30d ?? 0) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {(area?.priceChange30d ?? 0) > 0 ? '+' : ''}{area?.priceChange30d ?? '--'}%
                  </div>
                </div>
                <div>
                  <div className="text-white/50">90d Transactions</div>
                  <div className="text-[9px] font-bold text-white/80">
                    {area?.transactionCount90d ?? '--'}
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-white/[0.06]">
                <div className="text-[7px] text-white/60">
                  <span className="font-semibold text-white/70">Outlook:</span> {area.outlook}
                </div>
              </div>
            </div>
          )}

          {/* PDF Generated Success */}
          {pdfReady && content && (
            <div className="bg-[#10b981]/5 border border-[#10b981]/20 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#10b981" strokeWidth="1.5" />
                  <path d="M5 8l2 2 4-4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="text-[9px] font-semibold text-[#10b981] uppercase tracking-wider">
                  Deal Memorandum Generated -- PDF Downloaded
                </div>
              </div>
              <div className="text-[8px] text-white/50 mb-3">
                Your McKinsey-grade Deal Intelligence Memorandum has been saved. Click &quot;Download PDF&quot; to save another copy.
              </div>

              {/* Compact preview of sections */}
              <div className="space-y-2 border-t border-white/[0.06] pt-2">
                <div className="text-[7px] font-semibold text-white/30 uppercase tracking-wider">
                  Document Preview
                </div>
                {sections.map((section, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="text-[7px] font-bold text-[#f59e0b]/60 w-4 shrink-0">
                      {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][idx]}
                    </div>
                    <div>
                      <div className="text-[7px] font-bold text-white/50 uppercase tracking-wider">
                        {section.heading}
                      </div>
                      <div className="text-[8px] text-white/30 line-clamp-2 leading-relaxed">
                        {section.body.replace(/#{1,6}\s*/g, '').replace(/\*{1,3}/g, '').replace(/---+/g, '').slice(0, 150)}...
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded p-3">
              <div className="text-[8px] text-[#ef4444] font-semibold">
                Error generating brief: {error}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const FORGEDealRoomView: React.FC = () => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)

  const selectedClient = useMemo(
    () => selectedClientId ? getClient(selectedClientId) : null,
    [selectedClientId]
  )

  const selectedMatch = useMemo(() => {
    if (!selectedClientId) return null
    const matches = getEngineMatchesForClient(selectedClientId)
    return selectedMatchId
      ? matches.find(m => m.id === selectedMatchId) || matches[0] || null
      : matches[0] || null
  }, [selectedClientId, selectedMatchId])

  const selectedCieData = useMemo(
    () => selectedClientId ? getCIEClient(selectedClientId) : null,
    [selectedClientId]
  )

  return (
    <div className="h-full w-full flex bg-transparent">
      <ClientSidebar
        clients={clients}
        selectedClientId={selectedClientId}
        onSelectClient={(clientId) => {
          setSelectedClientId(clientId)
          setSelectedMatchId(null)
        }}
        selectedMatchId={selectedMatchId}
      />

      {selectedClient && selectedMatch && selectedCieData && (
        <RightPanel
          client={selectedClient}
          match={selectedMatch}
          cieData={selectedCieData}
        />
      )}

      {!selectedClient && (
        <div className="w-[65%] h-full bg-white/[0.01] border-l border-white/[0.06] flex items-center justify-center">
          <div className="text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">
              Select a client to begin
            </div>
            <div className="text-[8px] text-white/20 mt-2">
              FORGE Deal Room
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FORGEDealRoomView
