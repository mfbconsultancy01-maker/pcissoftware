'use client'

import React, { useState, useMemo } from 'react'
import {
  forgeActivityLog,
  type ForgeActivityLog,
  type ForgeActivityActionType,
} from '@/lib/forgeData'
import { clients, properties } from '@/lib/mockData'
import { ClientLink, PropertyLink } from '../useWorkspaceNav'

type OutcomeType = 'positive' | 'neutral' | 'negative' | 'all'

const actionTypeColors: Record<ForgeActivityActionType, string> = {
  'brief-generated': 'bg-pcis-gold/20 text-pcis-gold border-pcis-gold/30',
  'proposal-sent': 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
  'comm-drafted': 'bg-blue-400/20 text-blue-300 border-blue-400/30',
  'touch-completed': 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
  'meeting-held': 'bg-purple-400/20 text-purple-300 border-purple-400/30',
  'viewing-arranged': 'bg-amber-400/20 text-amber-300 border-amber-400/30',
  'offer-prepared': 'bg-pink-400/20 text-pink-300 border-pink-400/30',
}

const actionTypeLabels: Record<ForgeActivityActionType, string> = {
  'brief-generated': 'Brief Generated',
  'proposal-sent': 'Proposal Sent',
  'comm-drafted': 'Comm Drafted',
  'touch-completed': 'Touch Completed',
  'meeting-held': 'Meeting Held',
  'viewing-arranged': 'Viewing Arranged',
  'offer-prepared': 'Offer Prepared',
}

const outcomeSymbols: Record<string, string> = {
  positive: '▲',
  neutral: '—',
  negative: '▼',
}

const outcomeColors: Record<string, string> = {
  positive: 'text-emerald-400',
  neutral: 'text-gray-400',
  negative: 'text-red-400',
}

export default function FORGEActivityLogView(): React.ReactElement {
  const [actionTypeFilter, setActionTypeFilter] = useState<ForgeActivityActionType | 'all'>('all')
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeType>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const filteredLog = useMemo(() => {
    let results = forgeActivityLog

    if (actionTypeFilter !== 'all') {
      results = results.filter((a: ForgeActivityLog) => a.actionType === actionTypeFilter)
    }

    if (outcomeFilter !== 'all') {
      results = results.filter((a: ForgeActivityLog) => a.outcome === outcomeFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      results = results.filter((a: ForgeActivityLog) => {
        const client = clients.find((c: any) => c.id === a.clientId)
        return client?.name.toLowerCase().includes(query)
      })
    }

    return results.sort((a: ForgeActivityLog, b: ForgeActivityLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [actionTypeFilter, outcomeFilter, searchQuery])

  // Group by date
  const groupedLog = useMemo(() => {
    const groups: Record<string, ForgeActivityLog[]> = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      Earlier: [],
    }

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    filteredLog.forEach((entry: ForgeActivityLog) => {
      const entryDate = new Date(entry.timestamp)
      const todayStr = today.toISOString().split('T')[0]
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      const weekAgoStr = weekAgo.toISOString().split('T')[0]
      const entryStr = entry.timestamp

      if (entryStr === todayStr) {
        groups['Today'].push(entry)
      } else if (entryStr === yesterdayStr) {
        groups['Yesterday'].push(entry)
      } else if (entryDate > weekAgo) {
        groups['This Week'].push(entry)
      } else {
        groups['Earlier'].push(entry)
      }
    })

    return groups
  }, [filteredLog])

  const getClient = (clientId: string) => clients.find((c: any) => c.id === clientId)
  const getProperty = (propertyId: string) => properties.find((p: any) => p.id === propertyId)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <div>
          <h2 className="text-lg font-semibold text-pcis-text tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Activity Log
          </h2>
          <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
            Advisor Audit Trail
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 space-y-2">
        {/* Search */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search by client name..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="flex-1 px-2.5 py-1 text-[9px] bg-white/[0.02] border border-white/[0.04] rounded text-white placeholder-white/40 focus:outline-none focus:border-pcis-gold/50"
          />
        </div>

        {/* Action Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">Action Type</span>
          <div className="flex gap-1.5 flex-wrap overflow-x-auto pb-1">
            {(['all', 'brief-generated', 'proposal-sent', 'comm-drafted', 'touch-completed', 'meeting-held', 'viewing-arranged', 'offer-prepared'] as const).map((type: ForgeActivityActionType | 'all') => (
              <button
                key={type}
                onClick={() => setActionTypeFilter(type)}
                className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all flex-shrink-0 ${
                  actionTypeFilter === type
                    ? 'bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/50'
                    : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
                }`}
              >
                {type === 'all' ? 'all' : actionTypeLabels[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Outcome Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">Outcome</span>
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'positive', 'neutral', 'negative'] as const).map((outcome: OutcomeType) => (
              <button
                key={outcome}
                onClick={() => setOutcomeFilter(outcome)}
                className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all ${
                  outcomeFilter === outcome
                    ? 'bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/50'
                    : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
                }`}
              >
                {outcome}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 py-3 pr-2 space-y-3">
        {Object.entries(groupedLog).map(([timeGroup, entries]: [string, ForgeActivityLog[]]) => {
          if (entries.length === 0) return null

          return (
            <div key={timeGroup}>
              <div className="text-[8px] text-pcis-gold uppercase tracking-wider mb-2">
                {timeGroup}
              </div>
              <div className="space-y-2">
                {entries.map((entry: ForgeActivityLog) => {
                  const client = getClient(entry.clientId)
                  const property = entry.propertyId ? getProperty(entry.propertyId) : null

                  return (
                    <div
                      key={entry.id}
                      className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08] transition-all"
                    >
                      <div className="flex items-start gap-3">
                        {/* Timestamp & Outcome */}
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <span className="text-[8px] text-white/50">
                            {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {entry.outcome && (
                            <span className={`text-[9px] ${outcomeColors[entry.outcome]}`}>
                              {outcomeSymbols[entry.outcome]}
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[8px] px-2 py-1 rounded border ${actionTypeColors[entry.actionType]}`}>
                              {actionTypeLabels[entry.actionType]}
                            </span>
                            <p className="text-[9px] font-medium">{entry.title}</p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap mb-1 text-[8px]">
                            <ClientLink clientId={entry.clientId} className="text-[8px]">
                              {client?.name || 'Unknown'}
                            </ClientLink>
                            {property && (
                              <>
                                <span className="text-white/20">•</span>
                                <PropertyLink propertyId={entry.propertyId!} className="text-[8px]">
                                  {property.name}
                                </PropertyLink>
                              </>
                            )}
                          </div>

                          <p className="text-[8px] text-white/60 leading-relaxed">{entry.detail}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {filteredLog.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">No activity found for selected filters</p>
              <p className="text-white/20 text-[9px]">Try adjusting your selection</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
