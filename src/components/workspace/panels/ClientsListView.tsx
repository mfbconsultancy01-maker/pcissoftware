'use client'

import React, { useState, useMemo } from 'react'
import {
  clients, getEngagement, getClientMatches, getClientRecommendations,
  getNextTouch, type Client, type EngagementStatus,
} from '@/lib/mockData'
import { useWorkspaceNav } from '../useWorkspaceNav'

// ============================================================================
// PCIS Clients List View — Workspace Panel
// ============================================================================
// Clean client browser designed for workspace. Click any client to open
// their detail in a new panel beside this one.
// ============================================================================

const statusColors: Record<EngagementStatus, { color: string; label: string }> = {
  thriving: { color: '#22c55e', label: 'Thriving' },
  active:   { color: '#06b6d4', label: 'Active' },
  cooling:  { color: '#f59e0b', label: 'Cooling' },
  cold:     { color: '#3b82f6', label: 'Cold' },
  dormant:  { color: '#6b7280', label: 'Dormant' },
}

type SortKey = 'name' | 'engagement' | 'readiness' | 'type' | 'budget'
type FilterKey = 'all' | 'UHNW' | 'HNW' | 'Affluent' | 'needs-attention' | 'hot'

export default function ClientsListView() {
  const nav = useWorkspaceNav()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('engagement')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = [...clients]

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
      )
    }

    // Filter
    if (filter === 'UHNW' || filter === 'HNW' || filter === 'Affluent') {
      result = result.filter(c => c.type === filter)
    } else if (filter === 'needs-attention') {
      result = result.filter(c => {
        const eng = getEngagement(c.id)
        return eng && (eng.status === 'cooling' || eng.status === 'cold' || eng.status === 'dormant')
      })
    } else if (filter === 'hot') {
      result = result.filter(c => {
        const eng = getEngagement(c.id)
        return eng && eng.momentum === 'heating'
      })
    }

    // Sort
    result.sort((a, b) => {
      const engA = getEngagement(a.id)
      const engB = getEngagement(b.id)
      switch (sort) {
        case 'engagement': return (engB?.engagementScore || 0) - (engA?.engagementScore || 0)
        case 'readiness': return (engB?.readinessScore || 0) - (engA?.readinessScore || 0)
        case 'name': return a.name.localeCompare(b.name)
        case 'type': return a.type.localeCompare(b.type)
        case 'budget': return (b.financialProfile.budgetMax) - (a.financialProfile.budgetMax)
        default: return 0
      }
    })

    return result
  }, [search, filter, sort])

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'UHNW', label: 'UHNW' },
    { key: 'HNW', label: 'HNW' },
    { key: 'Affluent', label: 'Affluent' },
    { key: 'needs-attention', label: 'Attention' },
    { key: 'hot', label: 'Hot' },
  ]

  return (
    <div className="space-y-3">
      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-pcis-text-muted">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10.5 10.5L15 15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 bg-white/[0.03] border border-pcis-border/20 rounded-lg pl-8 pr-3 text-[11px] text-pcis-text placeholder-pcis-text-muted/40 outline-none focus:border-pcis-gold/30"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-8 bg-white/[0.03] border border-pcis-border/20 rounded-lg px-2 text-[10px] text-pcis-text-secondary outline-none"
        >
          <option value="engagement">Engagement</option>
          <option value="readiness">Readiness</option>
          <option value="name">Name</option>
          <option value="type">Type</option>
          <option value="budget">Budget</option>
        </select>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[9px] font-medium tracking-wider px-2.5 py-1 rounded-md transition-colors ${
              filter === f.key
                ? 'bg-pcis-gold/15 text-pcis-gold border border-pcis-gold/20'
                : 'bg-white/[0.03] text-pcis-text-muted border border-transparent hover:bg-white/[0.05]'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="text-[9px] text-pcis-text-muted/50 ml-auto">{filtered.length} clients</span>
      </div>

      {/* Client List */}
      <div className="space-y-1">
        {filtered.map((client) => {
          const eng = getEngagement(client.id)
          const status = eng ? statusColors[eng.status] : statusColors.active
          const matchCount = getClientMatches(client.id).length
          const actionCount = getClientRecommendations(client.id).filter(r => r.urgency === 'Act').length
          const nt = getNextTouch(client.id)
          const isSelected = selectedId === client.id

          return (
            <button
              key={client.id}
              onClick={() => {
                setSelectedId(client.id)
                nav.openClient(client.id)
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                isSelected
                  ? 'bg-pcis-gold/[0.08] border border-pcis-gold/20'
                  : 'bg-white/[0.01] border border-transparent hover:bg-white/[0.03] hover:border-pcis-border/20'
              }`}
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: status.color + '10', border: `1px solid ${status.color}25` }}>
                <span className="text-[11px] font-bold" style={{ color: status.color }}>
                  {client.initials}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-pcis-text truncate">{client.name}</span>
                  <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ color: status.color, background: status.color + '12' }}>
                    {status.label.toUpperCase().slice(0, 3)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-pcis-text-muted">{client.type}</span>
                  <span className="text-[9px] text-pcis-text-muted">·</span>
                  <span className="text-[9px] text-pcis-text-muted">{client.location}</span>
                  <span className="text-[9px] text-pcis-text-muted">·</span>
                  <span className="text-[9px] text-pcis-text-muted">
                    {client.financialProfile.currency} {(client.financialProfile.budgetMax / 1e6).toFixed(0)}M
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {eng && (
                  <div className="text-center">
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: status.color }}>
                      {Math.round(eng.engagementScore)}
                    </span>
                    <span className="text-[7px] text-pcis-text-muted/50 block">ENG</span>
                  </div>
                )}
                {matchCount > 0 && (
                  <div className="text-center">
                    <span className="text-[11px] font-bold text-pcis-text tabular-nums">{matchCount}</span>
                    <span className="text-[7px] text-pcis-text-muted/50 block">MCH</span>
                  </div>
                )}
                {actionCount > 0 && (
                  <div className="text-center">
                    <span className="text-[11px] font-bold text-red-400 tabular-nums">{actionCount}</span>
                    <span className="text-[7px] text-pcis-text-muted/50 block">ACT</span>
                  </div>
                )}
              </div>

              {/* Arrow */}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-pcis-text-muted/30 flex-shrink-0">
                <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          )
        })}
      </div>
    </div>
  )
}
