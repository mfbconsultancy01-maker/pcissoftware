'use client'

import React, { useState, useMemo } from 'react'
import {
  ARCHETYPES,
  DIMENSION_META,
  type CIEClient,
  type Archetype,
} from '@/lib/cieData'
import { useCIEClients, getCIESourceLabel, getCIESourceColor } from '@/lib/useCIEData'
import { P1Loading } from '@/components/P1Loading'
import { type EngagementStatus } from '@/lib/mockData'
import { useWorkspaceNav, ClientLink } from '../useWorkspaceNav'

// ============================================================================
// CIE CLIENT GRID — E1 Workspace Panel (CIG)
//
// Spreadsheet-style sortable client grid with CIE intelligence columns.
// Shows all profiled clients with archetype, CIE score, dimensions,
// engagement, predictions, and signals in a dense tabular layout.
// ============================================================================

type SortField = 'name' | 'type' | 'cie-score' | 'archetype' | 'engagement' | 'momentum' | 'prediction' | 'signals' | 'readiness'
type SortDir = 'asc' | 'desc'
type FilterArchetype = Archetype | 'all'
type FilterEngagement = EngagementStatus | 'all'

const getArchetypeColor = (archetype: Archetype): string => {
  const config = ARCHETYPES.find(a => a.id === archetype)
  return config?.color || '#D4A574'
}

const getCIEScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e'
  if (score >= 65) return '#f59e0b'
  if (score >= 50) return '#3b82f6'
  return '#ef4444'
}

const getEngagementColor = (status: string): string => {
  switch (status) {
    case 'thriving': return '#22c55e'
    case 'active': return '#06b6d4'
    case 'cooling': return '#f59e0b'
    case 'cold': return '#ef4444'
    case 'dormant': return '#6b7280'
    default: return '#9ca3af'
  }
}

const engOrder: Record<string, number> = { thriving: 5, active: 4, cooling: 3, cold: 2, dormant: 1 }

export default function CIEGridView(): React.ReactElement {
  const nav = useWorkspaceNav()
  const { data: liveCIEClients, loading, source: dataSource } = useCIEClients()
  const cieClients = liveCIEClients || []
  const [sortField, setSortField] = useState<SortField>('cie-score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterArchetype, setFilterArchetype] = useState<FilterArchetype>('all')
  const [filterEngagement, setFilterEngagement] = useState<FilterEngagement>('all')
  const [search, setSearch] = useState('')

  // Sorted/filtered list — MUST be before loading guard (React hooks order)
  const sorted = useMemo(() => {
    let result = [...cieClients]

    // Filters
    if (filterArchetype !== 'all') {
      result = result.filter(c => c.archetype === filterArchetype)
    }
    if (filterEngagement !== 'all') {
      result = result.filter(c => c.engagement?.status === filterEngagement)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.client.name.toLowerCase().includes(q) ||
        c.client.location.toLowerCase().includes(q) ||
        c.client.type.toLowerCase().includes(q)
      )
    }

    // Sort
    const dir = sortDir === 'asc' ? 1 : -1
    result.sort((a, b) => {
      switch (sortField) {
        case 'name': return dir * a.client.name.localeCompare(b.client.name)
        case 'type': return dir * a.client.type.localeCompare(b.client.type)
        case 'cie-score': return dir * (a.overallCIEScore - b.overallCIEScore)
        case 'archetype': return dir * a.archetype.localeCompare(b.archetype)
        case 'engagement': return dir * ((engOrder[a.engagement?.status || ''] || 0) - (engOrder[b.engagement?.status || ''] || 0))
        case 'momentum': {
          const mOrder: Record<string, number> = { heating: 3, stable: 2, cooling: 1 }
          return dir * ((mOrder[a.engagement?.momentum || ''] || 0) - (mOrder[b.engagement?.momentum || ''] || 0))
        }
        case 'prediction': return dir * ((a.prediction?.confidence || 0) - (b.prediction?.confidence || 0))
        case 'signals': return dir * (a.signalCount - b.signalCount)
        case 'readiness': return dir * ((a.engagement?.readinessScore || 0) - (b.engagement?.readinessScore || 0))
        default: return 0
      }
    })

    return result
  }, [cieClients, sortField, sortDir, filterArchetype, filterEngagement, search])

  // Loading guard — all hooks called above
  if (!liveCIEClients && loading) {
    return <P1Loading message="Loading..." />
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const SortHeader = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`py-2 px-2 font-normal cursor-pointer hover:text-pcis-gold/60 transition-colors select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (
          <span className="text-pcis-gold/60">{sortDir === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-pcis-text tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}>
              Client Intelligence Grid
            </h2>
            <span className="text-[8px] font-mono px-2 py-0.5 rounded-full border"
              style={{
                color: getCIESourceColor(dataSource),
                borderColor: getCIESourceColor(dataSource) + '40',
                backgroundColor: getCIESourceColor(dataSource) + '10',
              }}>
              {getCIESourceLabel(dataSource)}
            </span>
          </div>
          <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
            CIG · Sortable Spreadsheet View · {sorted.length} of {cieClients.length} clients
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="px-2.5 py-1 text-[9px] rounded bg-white/[0.02] border border-white/[0.04] text-white/90 placeholder:text-white/30 hover:bg-white/[0.04] transition-all focus:outline-none focus:border-pcis-gold/50 w-40"
        />

        <div className="w-px h-4 bg-pcis-border/20" />

        {/* Archetype filter */}
        <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">Archetype</span>
        <div className="flex gap-1">
          <button
            onClick={() => setFilterArchetype('all')}
            className={`px-2 py-0.5 text-[8px] font-medium uppercase tracking-wider rounded transition-all ${
              filterArchetype === 'all' ? 'bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/50' : 'bg-white/[0.02] text-white/50 border border-white/[0.04] hover:bg-white/[0.04]'
            }`}
          >All</button>
          {ARCHETYPES.map(a => (
            <button
              key={a.id}
              onClick={() => setFilterArchetype(a.id)}
              className={`px-2 py-0.5 text-[8px] font-medium uppercase tracking-wider rounded transition-all ${
                filterArchetype === a.id ? 'border' : 'bg-white/[0.02] text-white/50 border border-white/[0.04] hover:bg-white/[0.04]'
              }`}
              style={filterArchetype === a.id ? { borderColor: a.color, color: a.color, backgroundColor: `${a.color}15` } : {}}
            >{a.label}</button>
          ))}
        </div>

        <div className="w-px h-4 bg-pcis-border/20" />

        {/* Engagement filter */}
        <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">Status</span>
        <select
          value={filterEngagement}
          onChange={e => setFilterEngagement(e.target.value as FilterEngagement)}
          className="px-2 py-0.5 text-[8px] font-medium uppercase tracking-wider rounded bg-white/[0.02] border border-white/[0.04] text-white/70 hover:bg-white/[0.04] transition-all focus:outline-none focus:border-pcis-gold/50"
        >
          <option value="all">All</option>
          <option value="thriving">Thriving</option>
          <option value="active">Active</option>
          <option value="cooling">Cooling</option>
          <option value="cold">Cold</option>
          <option value="dormant">Dormant</option>
        </select>
      </div>

      {/* Grid Table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-pcis-bg z-10">
            <tr className="text-pcis-text-muted text-[8px] uppercase tracking-wider border-b border-pcis-border/10">
              <SortHeader field="name" label="Client" className="text-left px-3" />
              <SortHeader field="type" label="Type" className="text-left" />
              <SortHeader field="cie-score" label="CIE" className="text-center" />
              <SortHeader field="archetype" label="Archetype" className="text-left" />
              <th className="py-2 px-2 font-normal text-left">Top 3 Dimensions</th>
              <SortHeader field="engagement" label="Status" className="text-center" />
              <SortHeader field="momentum" label="Momentum" className="text-center" />
              <SortHeader field="prediction" label="Prediction" className="text-left" />
              <SortHeader field="readiness" label="Ready" className="text-center" />
              <SortHeader field="signals" label="Signals" className="text-right pr-3" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(cie => {
              const archConfig = ARCHETYPES.find(a => a.id === cie.archetype)
              return (
                <tr key={cie.client.id}
                  className="border-b border-pcis-border/5 hover:bg-pcis-gold/[0.03] cursor-pointer transition-colors"
                  onClick={() => nav.openCIEProfile(cie.client.id)}>

                  {/* Client name */}
                  <td className="py-1.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-[5px] h-[5px] rounded-full flex-shrink-0"
                        style={{ backgroundColor: getEngagementColor(cie.engagement?.status || 'dormant') }} />
                      <ClientLink clientId={cie.client.id} className="text-white/70 font-medium no-underline hover:text-pcis-gold text-[10px]">
                        {cie.client.name}
                      </ClientLink>
                    </div>
                    <div className="text-[8px] text-pcis-text-muted/50 ml-[13px]">{cie.client.location}</div>
                  </td>

                  {/* Type */}
                  <td className="py-1.5 px-2">
                    <span className={`text-[8px] font-mono font-semibold px-1 py-[1px] rounded ${
                      cie.client.type === 'UHNW' ? 'text-pcis-gold bg-pcis-gold/10' : 'text-pcis-text-muted bg-white/[0.03]'
                    }`}>{cie.client.type}</span>
                  </td>

                  {/* CIE Score */}
                  <td className="py-1.5 px-2 text-center">
                    <span className="text-[11px] font-mono font-bold" style={{ color: getCIEScoreColor(cie.overallCIEScore) }}>
                      {cie.overallCIEScore}
                    </span>
                  </td>

                  {/* Archetype */}
                  <td className="py-1.5 px-2">
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${archConfig?.color || '#D4A574'}20`, color: archConfig?.color || '#D4A574' }}>
                      {archConfig?.label || 'Balanced'}
                    </span>
                  </td>

                  {/* Top 3 Dimensions */}
                  <td className="py-1.5 px-2">
                    <div className="flex items-center gap-1.5">
                      {cie.topDimensions.slice(0, 3).map((dim, i) => {
                        const meta = DIMENSION_META.find(d => d.name === dim.dimension)
                        return (
                          <span key={i} className="text-[7px] font-mono px-1 py-[1px] rounded bg-white/[0.04] text-white/60">
                            {meta?.shortCode || '??'} {dim.value}
                          </span>
                        )
                      })}
                    </div>
                  </td>

                  {/* Engagement Status */}
                  <td className="py-1.5 px-2 text-center">
                    {cie.engagement && (
                      <span className="text-[9px] font-medium" style={{ color: getEngagementColor(cie.engagement.status) }}>
                        {cie.engagement.status.charAt(0).toUpperCase() + cie.engagement.status.slice(1)}
                      </span>
                    )}
                  </td>

                  {/* Momentum */}
                  <td className="py-1.5 px-2 text-center">
                    {cie.engagement && (
                      <span className="text-[10px] font-mono" style={{
                        color: cie.engagement.momentum === 'heating' ? '#22c55e' : cie.engagement.momentum === 'cooling' ? '#ef4444' : '#f59e0b'
                      }}>
                        {cie.engagement.momentum === 'heating' ? '▲' : cie.engagement.momentum === 'cooling' ? '▼' : '→'}
                      </span>
                    )}
                  </td>

                  {/* Prediction */}
                  <td className="py-1.5 px-2">
                    {cie.prediction ? (
                      <div className="flex items-center gap-1">
                        <span className="text-white/40 text-[8px] truncate max-w-[80px]">{cie.prediction.pattern}</span>
                        <span className="text-[7px] font-mono px-1 py-[1px] rounded"
                          style={{
                            backgroundColor: cie.prediction.confidence >= 75 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.08)',
                            color: cie.prediction.confidence >= 75 ? '#22c55e' : '#f59e0b'
                          }}>
                          {cie.prediction.confidence}%
                        </span>
                      </div>
                    ) : <span className="text-pcis-text-muted/30 text-[9px]">—</span>}
                  </td>

                  {/* Readiness */}
                  <td className="py-1.5 px-2 text-center">
                    {cie.engagement && (
                      <span className="text-[9px] font-mono" style={{
                        color: cie.engagement.readinessScore >= 0.7 ? '#22c55e' : cie.engagement.readinessScore >= 0.4 ? '#f59e0b' : '#ef4444'
                      }}>
                        {Math.round(cie.engagement.readinessScore * 100)}%
                      </span>
                    )}
                  </td>

                  {/* Signals */}
                  <td className="py-1.5 px-2 pr-3 text-right">
                    <span className="text-[9px] font-mono text-pcis-text-secondary">{cie.signalCount}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="h-40 flex items-center justify-center">
            <div className="text-center">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">No clients match filters</p>
              <p className="text-white/20 text-[9px] mt-1">Try adjusting your selection</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-pcis-border/10 pt-2 flex items-center justify-between text-[8px] text-white/40">
        <span>{sorted.length} clients · Click column headers to sort · Click row to open CIE Profile</span>
        <span className="font-mono">CIG</span>
      </div>
    </div>
  )
}
