'use client'

import React from 'react'
import {
  getProperty, getMatchesForProperty, getClient, matchStages,
  type MatchWithStage,
} from '@/lib/mockData'
import { useWorkspaceNav } from '../useWorkspaceNav'

// ============================================================================
// PCIS Property Detail View — Workspace Panel
// ============================================================================
// Full property analysis: specs, features, active matches, pricing.
// Context-linked to clients and matches.
// ============================================================================

const gradeColors: Record<string, string> = {
  'A+': '#d4a574', A: '#22c55e', 'B+': '#3b82f6', B: '#06b6d4', C: '#f59e0b', D: '#6b7280',
}

const typeIcons: Record<string, string> = {
  Villa: '🏛', Penthouse: '🏙', Apartment: '🏢', Estate: '🏰', Townhouse: '🏠',
}

export default function PropertyDetailView({ entityId }: { entityId: string }) {
  const nav = useWorkspaceNav()
  const property = getProperty(entityId)

  if (!property) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-pcis-text-muted text-sm">Property not found</span>
      </div>
    )
  }

  const propertyMatches = matchStages.filter(m => m.propertyId === entityId)

  return (
    <div className="space-y-5">
      {/* ---- Property Header ---- */}
      <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-pcis-text" style={{ fontFamily: "'Playfair Display', serif" }}>
              {property.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold tracking-wider text-pcis-gold px-2 py-0.5 rounded bg-pcis-gold/10">
                {property.type.toUpperCase()}
              </span>
              <span className="text-[10px] text-pcis-text-muted">{property.area}</span>
              <span className="text-[10px] text-pcis-text-muted">·</span>
              <span className="text-[10px] text-pcis-text-muted">{property.bedrooms} Bedrooms</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-pcis-gold" style={{ fontFamily: "'Playfair Display', serif" }}>
              {property.currency} {(property.price / 1e6).toFixed(0)}M
            </div>
            <span className="text-[9px] text-pcis-text-muted tracking-wider">ASKING PRICE</span>
          </div>
        </div>

        {/* Specs Row */}
        <div className="flex items-center gap-6 pt-3 border-t border-pcis-border/20">
          <div>
            <span className="text-[9px] text-pcis-text-muted tracking-wider">TYPE</span>
            <p className="text-sm font-medium text-pcis-text mt-0.5">{property.type}</p>
          </div>
          <div className="w-px h-8 bg-pcis-border/20" />
          <div>
            <span className="text-[9px] text-pcis-text-muted tracking-wider">BEDROOMS</span>
            <p className="text-sm font-medium text-pcis-text mt-0.5">{property.bedrooms}</p>
          </div>
          <div className="w-px h-8 bg-pcis-border/20" />
          <div>
            <span className="text-[9px] text-pcis-text-muted tracking-wider">AREA</span>
            <p className="text-sm font-medium text-pcis-text mt-0.5">{property.area}</p>
          </div>
          <div className="w-px h-8 bg-pcis-border/20" />
          <div>
            <span className="text-[9px] text-pcis-text-muted tracking-wider">ACTIVE MATCHES</span>
            <p className="text-sm font-medium text-pcis-gold mt-0.5">{propertyMatches.length}</p>
          </div>
        </div>
      </div>

      {/* ---- Features ---- */}
      {property.features && property.features.length > 0 && (
        <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
          <h3 className="text-[10px] font-semibold text-pcis-gold/70 tracking-wider uppercase mb-3">Features</h3>
          <div className="flex flex-wrap gap-2">
            {property.features.map((feature, idx) => (
              <span key={idx} className="text-[10px] px-3 py-1.5 bg-black/20 text-pcis-text-secondary rounded-lg border border-pcis-border/10">
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ---- Matched Clients ---- */}
      <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
        <h3 className="text-[10px] font-semibold text-pcis-gold/70 tracking-wider uppercase mb-3">
          Matched Clients ({propertyMatches.length})
        </h3>
        {propertyMatches.length === 0 ? (
          <p className="text-[11px] text-pcis-text-muted py-4 text-center">No active matches for this property</p>
        ) : (
          <div className="space-y-2">
            {propertyMatches.map((match: MatchWithStage) => {
              const client = getClient(match.clientId)
              return (
                <button
                  key={match.id}
                  onClick={() => nav.openMatch(match.id)}
                  className="w-full flex items-center gap-4 bg-black/20 rounded-lg p-3 hover:bg-white/[0.04] transition-colors text-left"
                >
                  {/* Grade */}
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center border"
                    style={{ borderColor: (gradeColors[match.grade] || '#888') + '30', background: (gradeColors[match.grade] || '#888') + '08' }}>
                    <span className="text-sm font-bold" style={{ color: gradeColors[match.grade], fontFamily: "'Playfair Display', serif" }}>
                      {match.grade}
                    </span>
                  </div>

                  {/* Client Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-pcis-text hover:text-pcis-gold transition-colors">
                        {client?.name || 'Unknown'}
                      </span>
                      {client && (
                        <span className="text-[9px] text-pcis-text-muted">{client.type} · {client.category}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] text-pcis-text-muted">Score: {Math.round(match.overallScore * 100)}%</span>
                      <span className="text-[9px] text-pcis-text-muted">·</span>
                      <span className="text-[9px] font-medium" style={{ color: '#d4a574' }}>{match.stage}</span>
                    </div>
                  </div>

                  {/* Pillar Mini Bars */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {Object.entries(match.pillars).map(([key, val]) => (
                      <div key={key} className="w-6 flex flex-col items-center">
                        <div className="w-4 h-12 bg-white/[0.04] rounded overflow-hidden flex flex-col justify-end">
                          <div className="w-full rounded-t" style={{
                            height: `${val * 100}%`,
                            background: val >= 0.8 ? '#22c55e' : val >= 0.6 ? '#3b82f6' : '#f59e0b',
                          }} />
                        </div>
                        <span className="text-[7px] text-pcis-text-muted/50 mt-0.5">{key.slice(0, 2).toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
