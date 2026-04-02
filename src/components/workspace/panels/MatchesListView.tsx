'use client'

import React, { useState, useMemo } from 'react'
import {
  matchStages, getClient, getProperty, MATCH_STAGES,
  type MatchWithStage, type MatchStage,
} from '@/lib/mockData'
import { useWorkspaceNav } from '../useWorkspaceNav'

// ============================================================================
// PCIS Matches List View — Workspace Panel
// ============================================================================

const gradeColors: Record<string, string> = {
  'A+': '#d4a574', A: '#22c55e', 'B+': '#3b82f6', B: '#06b6d4', C: '#f59e0b', D: '#6b7280',
}

type FilterGrade = 'all' | 'A+' | 'A' | 'B+' | 'B' | 'C'

export default function MatchesListView() {
  const nav = useWorkspaceNav()
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<FilterGrade>('all')
  const [stageFilter, setStageFilter] = useState<MatchStage | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = [...matchStages]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(m => {
        const client = getClient(m.clientId)
        const property = getProperty(m.propertyId)
        return (
          client?.name.toLowerCase().includes(q) ||
          property?.name.toLowerCase().includes(q) ||
          property?.area.toLowerCase().includes(q)
        )
      })
    }

    if (gradeFilter !== 'all') result = result.filter(m => m.grade === gradeFilter)
    if (stageFilter !== 'all') result = result.filter(m => m.stage === stageFilter)

    return result.sort((a, b) => b.overallScore - a.overallScore)
  }, [search, gradeFilter, stageFilter])

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-pcis-text-muted">
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M10.5 10.5L15 15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search matches by client or property..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-8 bg-white/[0.03] border border-pcis-border/20 rounded-lg pl-8 pr-3 text-[11px] text-pcis-text placeholder-pcis-text-muted/40 outline-none focus:border-pcis-gold/30"
        />
      </div>

      {/* Grade Filters */}
      <div className="flex items-center gap-1.5">
        {(['all', 'A+', 'A', 'B+', 'B', 'C'] as FilterGrade[]).map(g => (
          <button
            key={g}
            onClick={() => setGradeFilter(g)}
            className={`text-[9px] font-bold tracking-wider px-2 py-1 rounded-md transition-colors ${
              gradeFilter === g
                ? 'text-pcis-text border border-pcis-gold/30'
                : 'text-pcis-text-muted border border-transparent hover:bg-white/[0.03]'
            }`}
            style={gradeFilter === g && g !== 'all' ? { background: (gradeColors[g] || '#888') + '15', color: gradeColors[g] } : {}}
          >
            {g === 'all' ? 'ALL' : g}
          </button>
        ))}
        <span className="text-[9px] text-pcis-text-muted/50 ml-auto">{filtered.length} matches</span>
      </div>

      {/* Match List */}
      <div className="space-y-1.5">
        {filtered.map((match) => {
          const client = getClient(match.clientId)
          const property = getProperty(match.propertyId)
          const isSelected = selectedId === match.id

          return (
            <button
              key={match.id}
              onClick={() => {
                setSelectedId(match.id)
                nav.openMatch(match.id)
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                isSelected
                  ? 'bg-pcis-gold/[0.08] border border-pcis-gold/20'
                  : 'bg-white/[0.01] border border-transparent hover:bg-white/[0.03] hover:border-pcis-border/20'
              }`}
            >
              {/* Grade */}
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: (gradeColors[match.grade] || '#888') + '10', border: `1px solid ${gradeColors[match.grade] || '#888'}25` }}>
                <span className="text-sm font-bold" style={{ color: gradeColors[match.grade], fontFamily: "'Playfair Display', serif" }}>
                  {match.grade}
                </span>
              </div>

              {/* Client → Property */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-pcis-text truncate">
                    {client?.name || 'Unknown'}
                  </span>
                  <span className="text-[9px] text-pcis-gold/40">→</span>
                  <span className="text-[11px] text-pcis-text-secondary truncate">
                    {property?.name || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-medium" style={{ color: '#d4a574' }}>{match.stage}</span>
                  <span className="text-[9px] text-pcis-text-muted">·</span>
                  <span className="text-[9px] text-pcis-text-muted">{property?.area}</span>
                  {property && (
                    <>
                      <span className="text-[9px] text-pcis-text-muted">·</span>
                      <span className="text-[9px] text-pcis-text-muted">{property.currency} {(property.price / 1e6).toFixed(0)}M</span>
                    </>
                  )}
                </div>
              </div>

              {/* Score + Pillar Mini */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-center mr-1">
                  <span className="text-[12px] font-bold tabular-nums" style={{ color: gradeColors[match.grade] }}>
                    {Math.round(match.overallScore * 100)}
                  </span>
                  <span className="text-[7px] text-pcis-text-muted/50 block">SCORE</span>
                </div>
                <div className="flex gap-0.5">
                  {Object.values(match.pillars).map((val, idx) => (
                    <div key={idx} className="w-1.5 h-8 bg-white/[0.04] rounded overflow-hidden flex flex-col justify-end">
                      <div className="w-full rounded-t" style={{
                        height: `${val * 100}%`,
                        background: val >= 0.8 ? '#22c55e' : val >= 0.6 ? '#3b82f6' : '#f59e0b',
                      }} />
                    </div>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
