'use client'

import React, { useState, useMemo } from 'react'
import {
  getClient, getProfile, getEngagement, getClientPredictions,
  getClientRelationships, getClientSignals, getClientMatches,
  getClientRecommendations, getLifecycle, getNextTouch, getProperty,
  getClientActivities, DEAL_STAGES, dealStageColors, matchStages,
  type Client, type EngagementStatus, type DealStage, type MatchWithStage,
} from '@/lib/mockData'
import { useWorkspaceNav, MatchLink, PropertyLink } from '../useWorkspaceNav'

// ============================================================================
// PCIS Client Detail View — Workspace Panel
// ============================================================================
// Rich, spacious client deep-dive designed for workspace panels.
// Opens when you click a client name anywhere in the workspace.
// Not crammed — each section gets room to breathe.
// ============================================================================

const statusColors: Record<EngagementStatus, { color: string; bg: string; label: string }> = {
  thriving: { color: '#22c55e', bg: 'bg-green-500/10', label: 'Thriving' },
  active:   { color: '#06b6d4', bg: 'bg-cyan-500/10', label: 'Active' },
  cooling:  { color: '#f59e0b', bg: 'bg-amber-500/10', label: 'Cooling' },
  cold:     { color: '#3b82f6', bg: 'bg-blue-500/10', label: 'Cold' },
  dormant:  { color: '#6b7280', bg: 'bg-gray-500/10', label: 'Dormant' },
}

const gradeColors: Record<string, string> = {
  'A+': '#d4a574', A: '#22c55e', 'B+': '#3b82f6', B: '#06b6d4', C: '#f59e0b', D: '#6b7280',
}

export default function ClientDetailView({ entityId }: { entityId: string }) {
  const nav = useWorkspaceNav()
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'signals' | 'actions'>('overview')

  const client = getClient(entityId)
  const profile = getProfile(entityId)
  const engagement = getEngagement(entityId)
  const predictions = getClientPredictions(entityId)
  const relationships = getClientRelationships(entityId)
  const signals = getClientSignals(entityId)
  const clientMatches = matchStages.filter(m => m.clientId === entityId)
  const recommendations = getClientRecommendations(entityId)
  const lifecycle = getLifecycle(entityId)
  const nextTouch = getNextTouch(entityId)
  const activities = getClientActivities(entityId)

  if (!client) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-pcis-text-muted text-sm">Client not found</span>
      </div>
    )
  }

  const status = engagement ? statusColors[engagement.status] : statusColors.active
  const fp = client.financialProfile

  const tabs = [
    { key: 'overview' as const, label: 'Overview', count: null },
    { key: 'matches' as const, label: 'Matches', count: clientMatches.length },
    { key: 'signals' as const, label: 'Signals', count: signals.length },
    { key: 'actions' as const, label: 'Actions', count: recommendations.length },
  ]

  return (
    <div className="space-y-5">
      {/* ---- Header Card ---- */}
      <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-xl flex items-center justify-center border-2"
              style={{ borderColor: status.color + '40', background: status.color + '10' }}>
              <span className="text-lg font-bold" style={{ color: status.color, fontFamily: "'Playfair Display', serif" }}>
                {client.initials}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-pcis-text" style={{ fontFamily: "'Playfair Display', serif" }}>
                {client.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded"
                  style={{ color: status.color, background: status.color + '15' }}>
                  {status.label.toUpperCase()}
                </span>
                <span className="text-[10px] text-pcis-text-muted">{client.type}</span>
                <span className="text-[10px] text-pcis-text-muted">·</span>
                <span className="text-[10px] text-pcis-text-muted">{client.category}</span>
                <span className="text-[10px] text-pcis-text-muted">·</span>
                <span className="text-[10px] text-pcis-text-muted">{client.location}</span>
              </div>
            </div>
          </div>
          {/* Engagement Score */}
          {engagement && (
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: status.color, fontFamily: "'Playfair Display', serif" }}>
                {Math.round(engagement.engagementScore)}
              </div>
              <div className="text-[9px] text-pcis-text-muted tracking-wider">ENGAGEMENT</div>
            </div>
          )}
        </div>

        {/* Financial + Deal Stage Bar */}
        <div className="flex items-center gap-6 pt-3 border-t border-pcis-border/20">
          <div>
            <span className="text-[9px] text-pcis-text-muted tracking-wider">BUDGET</span>
            <p className="text-sm font-semibold text-pcis-text mt-0.5">
              {fp.currency} {(fp.budgetMin / 1e6).toFixed(0)}M – {(fp.budgetMax / 1e6).toFixed(0)}M
            </p>
          </div>
          <div className="w-px h-8 bg-pcis-border/20" />
          <div>
            <span className="text-[9px] text-pcis-text-muted tracking-wider">PORTFOLIO</span>
            <p className="text-sm font-semibold text-pcis-text mt-0.5">
              {fp.currency} {(fp.portfolioValue / 1e6).toFixed(0)}M
            </p>
          </div>
          <div className="w-px h-8 bg-pcis-border/20" />
          <div>
            <span className="text-[9px] text-pcis-text-muted tracking-wider">DEAL STAGE</span>
            <p className="text-sm font-semibold mt-0.5" style={{ color: dealStageColors[client.dealStage] }}>
              {client.dealStage}
            </p>
          </div>
          {engagement && (
            <>
              <div className="w-px h-8 bg-pcis-border/20" />
              <div>
                <span className="text-[9px] text-pcis-text-muted tracking-wider">READINESS</span>
                <p className="text-sm font-semibold text-pcis-text mt-0.5">
                  {Math.round(engagement.readinessScore * 100)}%
                </p>
              </div>
              <div className="w-px h-8 bg-pcis-border/20" />
              <div>
                <span className="text-[9px] text-pcis-text-muted tracking-wider">MOMENTUM</span>
                <p className="text-sm font-semibold mt-0.5" style={{
                  color: engagement.momentum === 'heating' ? '#22c55e' : engagement.momentum === 'cooling' ? '#f59e0b' : '#888',
                }}>
                  {engagement.momentum.charAt(0).toUpperCase() + engagement.momentum.slice(1)}
                </p>
              </div>
            </>
          )}
          {nextTouch && (
            <>
              <div className="w-px h-8 bg-pcis-border/20" />
              <div>
                <span className="text-[9px] text-pcis-text-muted tracking-wider">NEXT TOUCH</span>
                <p className="text-xs font-medium text-pcis-gold mt-0.5">{nextTouch.type}: {nextTouch.reason}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---- Tab Bar ---- */}
      <div className="flex items-center gap-1 border-b border-pcis-border/20 pb-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-[11px] font-medium tracking-wide border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'text-pcis-gold border-pcis-gold'
                : 'text-pcis-text-muted border-transparent hover:text-pcis-text-secondary'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-pcis-gold/15 text-pcis-gold' : 'bg-white/[0.04] text-pcis-text-muted'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---- Tab Content ---- */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Cognitive Profile */}
          {profile && (
            <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
              <h3 className="text-[10px] font-semibold text-pcis-gold/70 tracking-wider uppercase mb-3">Cognitive Profile</h3>
              <p className="text-[12px] text-pcis-text-secondary leading-relaxed mb-3">{profile.summary}</p>
              <div className="grid grid-cols-3 gap-3">
                {profile.scores.map(score => (
                  <div key={score.dimension} className="bg-black/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-pcis-text-muted">{score.dimension}</span>
                      <span className="text-[11px] font-bold" style={{
                        color: score.value >= 70 ? '#22c55e' : score.value >= 40 ? '#f59e0b' : '#888',
                      }}>{score.value}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${score.value}%`,
                        background: score.value >= 70 ? '#22c55e' : score.value >= 40 ? '#f59e0b' : '#666',
                      }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[8px] text-pcis-text-muted/50">
                        {score.trend === 'rising' ? '↑' : score.trend === 'falling' ? '↓' : '→'} {score.trend}
                      </span>
                      <span className="text-[8px] text-pcis-text-muted/50">{Math.round(score.confidence * 100)}% conf.</span>
                    </div>
                  </div>
                ))}
              </div>
              {profile.keyTraits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {profile.keyTraits.map(trait => (
                    <span key={trait} className="text-[9px] px-2 py-1 bg-pcis-gold/[0.06] text-pcis-gold/80 rounded border border-pcis-gold/10">
                      {trait}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Predictions */}
          {predictions.length > 0 && (
            <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
              <h3 className="text-[10px] font-semibold text-pcis-gold/70 tracking-wider uppercase mb-3">
                Active Predictions
              </h3>
              <div className="space-y-2">
                {predictions.map((pred, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-black/20 rounded-lg p-3">
                    <div className="w-10 h-10 rounded-lg bg-pcis-gold/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-pcis-gold">{pred.confidence}%</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-pcis-text">{pred.pattern}</p>
                      <p className="text-[10px] text-pcis-text-muted mt-0.5">{pred.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approach Strategy */}
          {profile?.approachStrategy && (
            <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
              <h3 className="text-[10px] font-semibold text-pcis-gold/70 tracking-wider uppercase mb-2">Approach Strategy</h3>
              <p className="text-[12px] text-pcis-text-secondary leading-relaxed">{profile.approachStrategy}</p>
              {profile.communicationTips && profile.communicationTips.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {profile.communicationTips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[9px] text-pcis-gold mt-0.5">→</span>
                      <span className="text-[11px] text-pcis-text-secondary">{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Relationships */}
          {relationships.length > 0 && (
            <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
              <h3 className="text-[10px] font-semibold text-pcis-gold/70 tracking-wider uppercase mb-3">Network</h3>
              <div className="space-y-2">
                {relationships.map(rel => {
                  const otherId = rel.fromClientId === entityId ? rel.toClientId : rel.fromClientId
                  const otherClient = getClient(otherId)
                  return (
                    <button
                      key={rel.id}
                      onClick={() => nav.openClient(otherId)}
                      className="w-full flex items-center gap-3 bg-black/20 rounded-lg p-3 hover:bg-white/[0.04] transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                        <span className="text-[10px] font-bold text-pcis-text-secondary">{otherClient?.initials || '??'}</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-[11px] font-medium text-pcis-text hover:text-pcis-gold transition-colors">
                          {otherClient?.name || 'Unknown'}
                        </span>
                        <span className="text-[10px] text-pcis-text-muted ml-2">{rel.type} · Influence {Math.round(rel.influenceStrength * 100)}%</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="space-y-3">
          {clientMatches.length === 0 ? (
            <p className="text-sm text-pcis-text-muted py-8 text-center">No active matches</p>
          ) : (
            clientMatches.map((match: MatchWithStage) => {
              const property = getProperty(match.propertyId)
              return (
                <button
                  key={match.id}
                  onClick={() => nav.openMatch(match.id)}
                  className="w-full bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4 hover:border-pcis-gold/20 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold" style={{
                        color: gradeColors[match.grade] || '#888',
                        fontFamily: "'Playfair Display', serif",
                      }}>
                        {match.grade}
                      </span>
                      <div>
                        <p className="text-[12px] font-medium text-pcis-text">
                          {property?.name || 'Unknown Property'}
                        </p>
                        <p className="text-[10px] text-pcis-text-muted">{property?.area} · {property?.type} · {property?.bedrooms}BR</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-pcis-text">{Math.round(match.overallScore * 100)}%</p>
                      <p className="text-[9px] text-pcis-text-muted">overall</p>
                    </div>
                  </div>
                  {/* Pillars */}
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(match.pillars).map(([key, val]) => (
                      <div key={key} className="bg-black/20 rounded-lg p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-pcis-text-muted capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-[10px] font-bold text-pcis-text">{Math.round(val * 100)}</span>
                        </div>
                        <div className="h-1 bg-white/[0.04] rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${val * 100}%`,
                            background: val >= 0.8 ? '#22c55e' : val >= 0.6 ? '#3b82f6' : '#f59e0b',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Stage */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-pcis-border/10">
                    <span className="text-[9px] text-pcis-text-muted tracking-wider">STAGE</span>
                    <span className="text-[10px] font-medium" style={{ color: match.stage ? '#d4a574' : '#888' }}>
                      {match.stage || 'Identified'}
                    </span>
                    {property && (
                      <>
                        <span className="text-pcis-text-muted">·</span>
                        <span className="text-[10px] text-pcis-text-muted">
                          {property.currency} {(property.price / 1e6).toFixed(0)}M
                        </span>
                      </>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}

      {activeTab === 'signals' && (
        <div className="space-y-2">
          {signals.length === 0 ? (
            <p className="text-sm text-pcis-text-muted py-8 text-center">No recent signals</p>
          ) : (
            signals.map(signal => {
              const maxDelta = Math.max(...signal.impact.map(i => Math.abs(i.delta)))
              const severity = maxDelta >= 10 ? 'high' : maxDelta >= 5 ? 'medium' : 'low'
              return (
                <div key={signal.id} className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      severity === 'high' ? 'bg-red-400' : severity === 'medium' ? 'bg-amber-400' : 'bg-blue-400'
                    }`} />
                    <div>
                      <p className="text-[11px] font-medium text-pcis-text">{signal.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-pcis-text-muted">{signal.type}</span>
                        <span className="text-[9px] text-pcis-text-muted">·</span>
                        <span className={`text-[9px] font-medium ${
                          severity === 'high' ? 'text-red-400' : severity === 'medium' ? 'text-amber-400' : 'text-blue-400'
                        }`}>{severity} impact</span>
                        <span className="text-[9px] text-pcis-text-muted">·</span>
                        <span className="text-[9px] text-pcis-text-muted">
                          {signal.impact.map(i => `${i.dimension} ${i.delta > 0 ? '+' : ''}${i.delta}`).join(', ')}
                        </span>
                        <span className="text-[9px] text-pcis-text-muted">·</span>
                        <span className="text-[9px] text-pcis-text-muted">
                          {new Date(signal.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="space-y-2">
          {recommendations.length === 0 ? (
            <p className="text-sm text-pcis-text-muted py-8 text-center">No pending actions</p>
          ) : (
            recommendations.map(rec => {
              const urgColors = { Act: '#ef4444', Monitor: '#f59e0b', Prepare: '#3b82f6' }
              return (
                <div key={rec.id} className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded"
                      style={{ color: urgColors[rec.urgency], background: urgColors[rec.urgency] + '15' }}>
                      {rec.urgency.toUpperCase()}
                    </span>
                    <span className="text-[9px] text-pcis-text-muted">{rec.category}</span>
                    <span className="text-[9px] text-pcis-text-muted">·</span>
                    <span className="text-[9px] text-pcis-text-muted">{rec.timeframe}</span>
                  </div>
                  <h4 className="text-[12px] font-medium text-pcis-text mb-1">{rec.title}</h4>
                  <p className="text-[11px] text-pcis-text-secondary leading-relaxed">{rec.description}</p>
                  {rec.whyNow && (
                    <p className="text-[10px] text-pcis-gold/70 mt-2 italic">Why now: {rec.whyNow}</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
