'use client'

import React, { useState, useMemo } from 'react'
import {
  proposals,
  type Proposal,
  type ProposalSection,
} from '@/lib/forgeData'
import { PURPOSE_CONFIGS, type ClientPurpose } from '@/lib/engineData'
import { clients, properties } from '@/lib/mockData'
import { ClientLink, PropertyLink } from '../useWorkspaceNav'

type ProposalStatus = 'draft' | 'reviewed' | 'sent' | 'viewed' | 'accepted' | 'declined'

const statusColors: Record<ProposalStatus, string> = {
  draft: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
  reviewed: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
  sent: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
  viewed: 'bg-blue-400/20 text-blue-300 border-blue-400/30',
  accepted: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
  declined: 'bg-red-400/20 text-red-300 border-red-400/30',
}

export default function FORGEProposalView(): React.ReactElement {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all')

  const filteredProposals = useMemo(() => {
    let results = proposals
    if (statusFilter !== 'all') {
      results = results.filter((p: Proposal) => p.status === statusFilter)
    }
    return results.sort((a: Proposal, b: Proposal) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [statusFilter])

  const getClient = (clientId: string) => clients.find((c: any) => c.id === clientId)
  const getProperty = (propertyId: string) => properties.find((p: any) => p.id === propertyId)
  const getPurposeConfig = (purpose: ClientPurpose) => PURPOSE_CONFIGS.find((pc) => pc.id === purpose)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <div>
          <h2 className="text-lg font-semibold text-pcis-text tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Proposal Builder
          </h2>
          <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
            Client-Facing Proposals
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">Status</span>
          <div className="flex gap-1.5 flex-wrap overflow-x-auto pb-1">
            {(['all', 'draft', 'reviewed', 'sent', 'viewed', 'accepted', 'declined'] as const).map((status: ProposalStatus | 'all') => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all flex-shrink-0 ${
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
        {filteredProposals.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">No proposals found for selected filters</p>
              <p className="text-white/20 text-[9px]">Try adjusting your selection</p>
            </div>
          </div>
        ) : (
          filteredProposals.map((proposal: Proposal) => {
            const client = getClient(proposal.clientId)
            const purposeConfig = getPurposeConfig(proposal.purpose)
            const isExpanded = expandedId === proposal.id

            return (
              <div
                key={proposal.id}
                className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 space-y-2.5 group hover:border-white/[0.08] transition-all cursor-pointer"
              >
                {/* Collapsed Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : proposal.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-white/90 leading-tight truncate hover:text-pcis-gold">
                        {proposal.title}
                      </p>
                      <p className="text-[8px] text-white/60 mt-0.5">
                        <ClientLink clientId={proposal.clientId} className="no-underline hover:underline">
                          {client?.name || 'Unknown'}
                        </ClientLink>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[8px] uppercase tracking-wider px-2 py-1 rounded border ${statusColors[proposal.status]}`}>
                        {proposal.status}
                      </span>
                      <span className="text-white/30 text-[8px]">{isExpanded ? '▼' : '▶'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[8px] text-white/60">
                      {proposal.propertyIds.length} {proposal.propertyIds.length === 1 ? 'property' : 'properties'}
                    </span>
                    <span className="text-white/30">•</span>
                    <span
                      className="px-2 py-1 text-[8px] font-bold uppercase tracking-wider rounded text-white/90"
                      style={{ backgroundColor: `${purposeConfig?.color || '#D4A574'}30` }}
                    >
                      {proposal.purpose}
                    </span>
                    <span className="text-[8px] text-white/60">{proposal.createdAt}</span>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-white/[0.04] pt-3 space-y-3">
                    {/* Properties List */}
                    <div>
                      <span className="text-[8px] text-pcis-gold uppercase tracking-wider block">Properties</span>
                      <div className="space-y-1 mt-1">
                        {proposal.propertyIds.map((propId: string, idx: number) => {
                          const prop = getProperty(propId)
                          return (
                            <div key={idx} className="flex items-center gap-2 text-[8px]">
                              <span className="text-pcis-gold">◆</span>
                              <PropertyLink propertyId={propId} className="text-white/70 hover:text-white/90">
                                {prop?.name || 'Unknown'}
                              </PropertyLink>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Sections */}
                    <div className="space-y-3">
                      {proposal.sections.map((section: ProposalSection, idx: number) => (
                        <div key={idx}>
                          <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-[9px] font-semibold text-white/90 block">
                            {section.heading}
                          </span>
                          <p className="text-[8px] leading-relaxed text-white/70 mt-1">{section.content}</p>
                        </div>
                      ))}
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
