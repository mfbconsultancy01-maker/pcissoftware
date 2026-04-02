'use client'

import React, { useState, useMemo } from 'react'
import {
  dealBriefs,
  type DealBrief,
} from '@/lib/forgeData'
import { PURPOSE_CONFIGS, type ClientPurpose } from '@/lib/engineData'
import { clients, properties } from '@/lib/mockData'
import { ClientLink, PropertyLink } from '../useWorkspaceNav'

type BriefStatus = 'draft' | 'reviewed' | 'sent'

export default function FORGEDealBriefView(): React.ReactElement {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<BriefStatus | 'all'>('all')

  const filteredBriefs = useMemo(() => {
    let results = dealBriefs
    if (statusFilter !== 'all') {
      results = results.filter((b: DealBrief) => b.status === statusFilter)
    }
    return results.sort((a: DealBrief, b: DealBrief) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
  }, [statusFilter])

  const getClient = (clientId: string) => clients.find((c: any) => c.id === clientId)
  const getProperty = (propertyId: string) => properties.find((p: any) => p.id === propertyId)
  const getPurposeConfig = (purpose: ClientPurpose) => PURPOSE_CONFIGS.find((pc) => pc.id === purpose)

  const statusColors: Record<BriefStatus, string> = {
    draft: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
    reviewed: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
    sent: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <div>
          <h2 className="text-lg font-semibold text-pcis-text tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Deal Brief Generator
          </h2>
          <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
            Meeting Prep Sheets
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">Status</span>
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'draft', 'reviewed', 'sent'] as const).map((status: BriefStatus | 'all') => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all ${
                  statusFilter === status
                    ? 'bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/50'
                    : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 py-3 pr-2 space-y-2">
        {filteredBriefs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">No briefs found for selected filters</p>
              <p className="text-white/20 text-[9px]">Try adjusting your selection</p>
            </div>
          </div>
        ) : (
          filteredBriefs.map((brief: DealBrief) => {
            const client = getClient(brief.clientId)
            const property = getProperty(brief.propertyId)
            const purposeConfig = getPurposeConfig(brief.purpose)
            const isExpanded = expandedId === brief.id

            return (
              <div
                key={brief.id}
                className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 space-y-2.5 group hover:border-white/[0.08] transition-all cursor-pointer"
              >
                {/* Collapsed Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : brief.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-white/90 leading-tight truncate hover:text-pcis-gold">
                        <ClientLink clientId={brief.clientId} className="no-underline hover:underline">
                          {client?.name || 'Unknown'}
                        </ClientLink>
                      </p>
                      <p className="text-[8px] text-white/60 mt-0.5">
                        <PropertyLink propertyId={brief.propertyId} className="text-white/60 hover:text-white/80">
                          {property?.name || 'Unknown'}
                        </PropertyLink>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[8px] uppercase tracking-wider px-2 py-1 rounded border ${statusColors[brief.status]}`}>
                        {brief.status}
                      </span>
                      <span className="text-white/30 text-[8px]">{isExpanded ? '▼' : '▶'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="px-2 py-1 text-[8px] font-bold uppercase tracking-wider rounded text-white/90"
                      style={{ backgroundColor: `${purposeConfig?.color || '#D4A574'}30` }}
                    >
                      {brief.purpose}
                    </span>
                    <span className="text-[8px] text-white/60">{brief.generatedAt}</span>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-white/[0.04] pt-3 space-y-3">
                    {/* Client Summary */}
                    <div>
                      <span className="text-[8px] text-pcis-gold uppercase tracking-wider block">Client Summary</span>
                      <p className="text-[8px] leading-relaxed text-white/70 mt-1">{brief.clientSummary}</p>
                    </div>

                    {/* Property Summary */}
                    <div>
                      <span className="text-[8px] text-pcis-gold uppercase tracking-wider block">Property Summary</span>
                      <p className="text-[8px] leading-relaxed text-white/70 mt-1">{brief.propertySummary}</p>
                    </div>

                    {/* Purpose Alignment */}
                    <div>
                      <span className="text-[8px] text-pcis-gold uppercase tracking-wider block">Purpose Alignment</span>
                      <p className="text-[8px] leading-relaxed text-white/70 mt-1">{brief.purposeAlignment}</p>
                    </div>

                    {/* Financial Analysis */}
                    <div>
                      <span className="text-[8px] text-pcis-gold uppercase tracking-wider block">Financial Analysis</span>
                      <p className="text-[8px] leading-relaxed text-white/70 mt-1">{brief.financialAnalysis}</p>
                    </div>

                    {/* Approach Strategy */}
                    <div>
                      <span className="text-[8px] text-pcis-gold uppercase tracking-wider block">Approach Strategy</span>
                      <p className="text-[8px] leading-relaxed text-white/70 mt-1">{brief.approachStrategy}</p>
                    </div>

                    {/* Risk Factors */}
                    <div>
                      <span className="text-[8px] text-pcis-gold uppercase tracking-wider block">Risk Factors</span>
                      <ul className="space-y-1 mt-1">
                        {brief.riskFactors.map((factor: string, idx: number) => (
                          <li key={idx} className="text-[8px] text-white/70 flex gap-2">
                            <span className="text-red-400 flex-shrink-0">▪</span>
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Talking Points */}
                    <div>
                      <span className="text-[8px] text-pcis-gold uppercase tracking-wider block">Talking Points</span>
                      <ul className="space-y-1 mt-1">
                        {brief.talkingPoints.map((point: string, idx: number) => (
                          <li key={idx} className="text-[8px] text-white/70 flex gap-2">
                            <span className="text-pcis-gold flex-shrink-0">★</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
