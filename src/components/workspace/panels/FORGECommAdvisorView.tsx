'use client'

import React, { useState, useMemo } from 'react'
import {
  communicationDrafts,
  type CommunicationDraft,
  type CommChannel,
  type CommTone,
} from '@/lib/forgeData'
import { clients } from '@/lib/mockData'
import { ClientLink } from '../useWorkspaceNav'

type CommStatus = 'draft' | 'approved' | 'sent'

const channelSymbols: Record<CommChannel, string> = {
  email: '▪',
  whatsapp: '●',
  call: '▲',
  meeting: '◆',
}

const channelLabels: Record<CommChannel, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  call: 'Call',
  meeting: 'Meeting',
}

const toneColors: Record<CommTone, string> = {
  formal: 'bg-blue-400/20 text-blue-300 border-blue-400/30',
  consultative: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
  casual: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
  urgent: 'bg-red-400/20 text-red-300 border-red-400/30',
}

const statusColors: Record<CommStatus, string> = {
  draft: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
  approved: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
  sent: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
}

export default function FORGECommAdvisorView(): React.ReactElement {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [channelFilter, setChannelFilter] = useState<CommChannel | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<CommStatus | 'all'>('all')

  const filteredComms = useMemo(() => {
    let results = communicationDrafts
    if (channelFilter !== 'all') {
      results = results.filter((c: CommunicationDraft) => c.channel === channelFilter)
    }
    if (statusFilter !== 'all') {
      results = results.filter((c: CommunicationDraft) => c.status === statusFilter)
    }
    return results.sort((a: CommunicationDraft, b: CommunicationDraft) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [channelFilter, statusFilter])

  const getClient = (clientId: string) => clients.find((c: any) => c.id === clientId)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <div>
          <h2 className="text-lg font-semibold text-pcis-text tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Communication Advisor
          </h2>
          <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
            CIE-Informed Outreach
          </p>
        </div>
      </div>

      {/* Filter Bars */}
      <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 space-y-2">
        {/* Channel Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">Channel</span>
          <div className="flex gap-1.5 flex-wrap overflow-x-auto pb-1">
            {(['all', 'email', 'whatsapp', 'call', 'meeting'] as const).map((channel: CommChannel | 'all') => (
              <button
                key={channel}
                onClick={() => setChannelFilter(channel)}
                className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all flex-shrink-0 ${
                  channelFilter === channel
                    ? 'bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/50'
                    : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
                }`}
              >
                {channel === 'all' ? 'all' : channelLabels[channel]}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">Status</span>
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'draft', 'approved', 'sent'] as const).map((status: CommStatus | 'all') => (
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
        {filteredComms.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">No communications found for selected filters</p>
              <p className="text-white/20 text-[9px]">Try adjusting your selection</p>
            </div>
          </div>
        ) : (
          filteredComms.map((comm: CommunicationDraft) => {
            const client = getClient(comm.clientId)
            const isExpanded = expandedId === comm.id

            return (
              <div
                key={comm.id}
                className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 space-y-2.5 group hover:border-white/[0.08] transition-all cursor-pointer"
              >
                {/* Collapsed Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : comm.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-white/70">{channelSymbols[comm.channel]}</span>
                        <p className="text-[10px] font-semibold text-white/90 leading-tight truncate hover:text-pcis-gold">
                          <ClientLink clientId={comm.clientId} className="no-underline hover:underline">
                            {client?.name || 'Unknown'}
                          </ClientLink>
                        </p>
                      </div>
                      {comm.subject && (
                        <p className="text-[8px] text-white/70">{comm.subject}</p>
                      )}
                    </div>
                    <span className="text-white/30 text-[8px] flex-shrink-0">{isExpanded ? '▼' : '▶'}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 text-[8px] rounded border ${toneColors[comm.tone]}`}>
                      {comm.tone}
                    </span>
                    <span className={`px-2 py-1 text-[8px] rounded border ${statusColors[comm.status]}`}>
                      {comm.status}
                    </span>
                    <span className="text-[8px] text-white/60">{comm.createdAt}</span>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-white/[0.04] pt-3 space-y-3">
                    {/* Body Text */}
                    <div>
                      <span className="text-[8px] text-pcis-gold uppercase tracking-wider block">Message Body</span>
                      <p className="text-[8px] leading-relaxed text-white/70 whitespace-pre-wrap mt-1">{comm.body}</p>
                    </div>

                    {/* Talking Points */}
                    <div>
                      <span className="text-[8px] text-pcis-gold uppercase tracking-wider block">Talking Points</span>
                      <ul className="space-y-1 mt-1">
                        {comm.talkingPoints.map((point: string, idx: number) => (
                          <li key={idx} className="text-[8px] text-white/70 flex gap-2">
                            <span className="text-cyan-400 flex-shrink-0">●</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Best Time to Reach */}
                    <div className="p-2 bg-white/[0.02] rounded border border-white/[0.04]">
                      <span className="text-[8px] text-pcis-gold uppercase tracking-wider block">Best Time to Reach</span>
                      <p className="text-[8px] text-white/70 mt-1">{comm.bestTimeToReach}</p>
                    </div>

                    {/* Cognitive Notes */}
                    <div className="p-2 rounded border border-pcis-gold/30 bg-pcis-gold/5">
                      <span className="text-[8px] text-pcis-gold uppercase tracking-wider block">Cognitive Intelligence Notes</span>
                      <p className="text-[8px] leading-relaxed text-white/80 mt-1">{comm.cognitiveNotes}</p>
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
