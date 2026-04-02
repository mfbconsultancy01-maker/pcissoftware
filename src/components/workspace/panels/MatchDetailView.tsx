'use client'

import React, { useState } from 'react'
import {
  getClient, getProperty, getMatchStage, matchStages,
  getClientRecommendations, MATCH_STAGES, matchStageColors,
  type MatchWithStage, type MatchStage,
} from '@/lib/mockData'
import { useWorkspaceNav } from '../useWorkspaceNav'

// ============================================================================
// PCIS Match Detail View — Workspace Panel
// ============================================================================
// Full match analysis: client + property + AI intelligence reasoning.
// Shows pillar scores, stage pipeline, and full AI match rationale.
// ============================================================================

const gradeColors: Record<string, string> = {
  'A+': '#d4a574', A: '#22c55e', 'B+': '#3b82f6', B: '#06b6d4', C: '#f59e0b', D: '#6b7280',
}

const pillarLabels: Record<string, string> = {
  clientFit: 'Client Fit',
  financial: 'Financial',
  value: 'Value',
  timing: 'Timing',
}

export default function MatchDetailView({ entityId }: { entityId: string }) {
  const nav = useWorkspaceNav()
  const [showFullIntel, setShowFullIntel] = useState(false)

  const match = matchStages.find(m => m.id === entityId) || matchStages.find(m => m.id === entityId)
  if (!match) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-pcis-text-muted text-sm">Match not found</span>
      </div>
    )
  }

  const client = getClient(match.clientId)
  const property = getProperty(match.propertyId)
  const recommendations = getClientRecommendations(match.clientId).filter(r => r.matchId === match.id || r.propertyId === match.propertyId)

  // Parse AI intelligence into sections
  const intelSections = (match.aiIntelligence || '').split('||').map(s => {
    const trimmed = s.trim()
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx > 0 && colonIdx < 30) {
      return { heading: trimmed.slice(0, colonIdx).trim(), body: trimmed.slice(colonIdx + 1).trim() }
    }
    return { heading: '', body: trimmed }
  }).filter(s => s.body.length > 0)

  return (
    <div className="space-y-5">
      {/* ---- Grade + Score Header ---- */}
      <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-5">
        <div className="flex items-start gap-5">
          {/* Grade Badge */}
          <div className="w-20 h-20 rounded-xl flex flex-col items-center justify-center border-2"
            style={{ borderColor: (gradeColors[match.grade] || '#888') + '40', background: (gradeColors[match.grade] || '#888') + '08' }}>
            <span className="text-3xl font-bold" style={{ color: gradeColors[match.grade], fontFamily: "'Playfair Display', serif" }}>
              {match.grade}
            </span>
            <span className="text-[9px] text-pcis-text-muted tracking-wider">GRADE</span>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              {/* Client Link */}
              <button
                onClick={() => client && nav.openClient(client.id)}
                className="text-[13px] font-semibold text-pcis-text hover:text-pcis-gold transition-colors"
              >
                {client?.name || 'Unknown Client'}
              </button>
              <span className="text-pcis-text-muted">↔</span>
              {/* Property Link */}
              <button
                onClick={() => property && nav.openProperty(property.id)}
                className="text-[13px] font-semibold text-pcis-text hover:text-pcis-gold transition-colors"
              >
                {property?.name || 'Unknown Property'}
              </button>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-pcis-text-muted">
              {client && <span>{client.type} · {client.category}</span>}
              {property && <span>· {property.area} · {property.type} · {property.bedrooms}BR</span>}
              {property && <span>· {property.currency} {(property.price / 1e6).toFixed(0)}M</span>}
            </div>

            {/* Overall Score */}
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] text-pcis-text-muted tracking-wider">OVERALL SCORE</span>
                <span className="text-sm font-bold" style={{ color: gradeColors[match.grade], fontFamily: "'Playfair Display', serif" }}>
                  {Math.round(match.overallScore * 100)}%
                </span>
              </div>
              <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${match.overallScore * 100}%`,
                  background: `linear-gradient(90deg, ${gradeColors[match.grade]}60, ${gradeColors[match.grade]})`,
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Pillar Scores ---- */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(match.pillars).map(([key, val]) => (
          <div key={key} className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold mb-1" style={{
              color: val >= 0.8 ? '#22c55e' : val >= 0.6 ? '#3b82f6' : '#f59e0b',
              fontFamily: "'Playfair Display', serif",
            }}>
              {Math.round(val * 100)}
            </div>
            <div className="text-[10px] text-pcis-text-muted tracking-wider uppercase">{pillarLabels[key] || key}</div>
            <div className="h-1.5 bg-white/[0.04] rounded-full mt-2 overflow-hidden">
              <div className="h-full rounded-full" style={{
                width: `${val * 100}%`,
                background: val >= 0.8 ? '#22c55e' : val >= 0.6 ? '#3b82f6' : '#f59e0b',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* ---- Stage Pipeline ---- */}
      <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
        <h3 className="text-[10px] font-semibold text-pcis-gold/70 tracking-wider uppercase mb-3">Deal Pipeline</h3>
        <div className="flex items-center gap-1">
          {MATCH_STAGES.map((stage, idx) => {
            const currentIdx = MATCH_STAGES.indexOf(match.stage as MatchStage)
            const isPast = idx <= currentIdx
            const isCurrent = idx === currentIdx
            return (
              <div key={stage} className="flex-1 flex flex-col items-center">
                <div className={`w-full h-2 rounded-full ${
                  isCurrent ? 'bg-pcis-gold' : isPast ? 'bg-pcis-gold/40' : 'bg-white/[0.06]'
                }`} />
                <span className={`text-[8px] mt-1.5 text-center ${
                  isCurrent ? 'text-pcis-gold font-bold' : isPast ? 'text-pcis-text-muted' : 'text-pcis-text-muted/40'
                }`}>
                  {stage}
                </span>
              </div>
            )
          })}
        </div>
        {match.stageChangedAt && (
          <p className="text-[9px] text-pcis-text-muted mt-2">
            Stage updated: {new Date(match.stageChangedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            {match.viewingDate && ` · Viewing: ${new Date(match.viewingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
            {match.offerAmount && ` · Offer: AED ${(match.offerAmount / 1e6).toFixed(0)}M`}
          </p>
        )}
      </div>

      {/* ---- AI Intelligence ---- */}
      {intelSections.length > 0 && (
        <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-semibold text-pcis-gold/70 tracking-wider uppercase">AI Match Intelligence</h3>
            <button
              onClick={() => setShowFullIntel(!showFullIntel)}
              className="text-[9px] text-pcis-gold hover:text-pcis-gold/80 transition-colors"
            >
              {showFullIntel ? 'Collapse' : 'Expand All'}
            </button>
          </div>
          <div className="space-y-3">
            {intelSections.slice(0, showFullIntel ? undefined : 2).map((section, idx) => (
              <div key={idx} className="bg-black/20 rounded-lg p-3">
                {section.heading && (
                  <h4 className="text-[10px] font-bold text-pcis-gold/80 tracking-wider uppercase mb-1.5">
                    {section.heading}
                  </h4>
                )}
                <p className="text-[11px] text-pcis-text-secondary leading-relaxed">{section.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Related Recommendations ---- */}
      {recommendations.length > 0 && (
        <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
          <h3 className="text-[10px] font-semibold text-pcis-gold/70 tracking-wider uppercase mb-3">Related Actions</h3>
          <div className="space-y-2">
            {recommendations.map(rec => {
              const urgColors = { Act: '#ef4444', Monitor: '#f59e0b', Prepare: '#3b82f6' }
              return (
                <div key={rec.id} className="bg-black/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                      style={{ color: urgColors[rec.urgency], background: urgColors[rec.urgency] + '15' }}>
                      {rec.urgency}
                    </span>
                    <span className="text-[11px] font-medium text-pcis-text">{rec.title}</span>
                  </div>
                  <p className="text-[10px] text-pcis-text-secondary">{rec.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
