'use client'

import { useState } from 'react'
import { clients, getClient, getProperty } from '@/lib/mockData'
import { getCIEClient, ARCHETYPES, DIMENSION_META, type CIEClient } from '@/lib/cieData'
import { engineMatches, getEngineMatchesForClient, getClientPurpose, PURPOSE_CONFIGS, type EngineMatch } from '@/lib/engineData'
import { getArea } from '@/lib/marketData'
import { forgeActions, type ForgeAction } from '@/lib/forgeData'

interface ClientWithCIE {
  id: string
  name: string
  initials: string
  type: 'UHNW' | 'HNW' | 'Affluent'
  category: string
  email: string
  phone: string
  location: string
  onboardedAt: string
  dealStage: string
  financialProfile: {
    budgetMin: number
    budgetMax: number
    currency: string
  }
}

interface CognitiveDimension {
  dimension: string
  value: number
}

const getDealStageBadgeColor = (stage: string): string => {
  const stageColors: Record<string, string> = {
    'Prospect': 'bg-blue-500/20 text-blue-200 border border-blue-400/50',
    'Qualified': 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50',
    'Active': 'bg-amber-500/20 text-amber-200 border border-amber-400/50',
    'Advanced': 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/50',
    'Closed': 'bg-gray-500/20 text-gray-300 border border-gray-400/50',
  }
  return stageColors[stage] || 'bg-white/[0.06] text-white/70 border border-white/[0.12]'
}

const getTypeColor = (type: string): string => {
  const typeColors: Record<string, string> = {
    'UHNW': 'bg-purple-500/20 text-purple-200 border border-purple-400/50',
    'HNW': 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/50',
    'Affluent': 'bg-blue-500/20 text-blue-200 border border-blue-400/50',
  }
  return typeColors[type] || 'bg-white/[0.06] text-white/70 border border-white/[0.12]'
}

const getDimensionColor = (score: number): string => {
  if (score <= 33) return 'bg-red-400'
  if (score <= 66) return 'bg-amber-400'
  return 'bg-emerald-400'
}

const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    'pending': 'bg-amber-500/20 text-amber-200 border border-amber-400/50',
    'in-progress': 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50',
    'completed': 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/50',
    'deferred': 'bg-gray-500/20 text-gray-300 border border-gray-400/50',
  }
  return statusColors[status] || 'bg-white/[0.06] text-white/70 border border-white/[0.12]'
}

const getPriorityDot = (priority: string): string => {
  const priorityColors: Record<string, string> = {
    'critical': 'bg-red-500',
    'high': 'bg-amber-500',
    'medium': 'bg-cyan-500',
    'low': 'bg-gray-500',
  }
  return priorityColors[priority] || 'bg-white/40'
}

const formatScore = (score: number | undefined): string => {
  if (score === undefined) return '--'
  return Math.round(score).toString()
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatCurrency = (value: number, currency: string = 'USD'): string => {
  const symbol = currency === 'GBP' ? '£' : '$'
  if (value >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${symbol}${(value / 1000).toFixed(0)}K`
  return `${symbol}${value}`
}

export default function FORGEClientDossierNewView() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id || null)

  const selectedClient = selectedClientId ? getClient(selectedClientId) : null
  const cieData = selectedClient ? getCIEClient(selectedClient.id) : null
  const engineMatchList = selectedClient ? getEngineMatchesForClient(selectedClient.id) : []
  const purpose = selectedClient ? getClientPurpose(selectedClient.id) : null
  const clientActions = selectedClient ? forgeActions.filter(a => a.clientId === selectedClient.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : []

  const archetype = cieData && ARCHETYPES.find(a => a.id === cieData.archetype)

  return (
    <div className="h-full flex bg-white/[0.01] text-white/90">
      {/* LEFT SIDEBAR -- CLIENT LIST */}
      <div className="w-[30%] border-r border-white/[0.06] overflow-y-auto bg-white/[0.01]">
        <div className="p-4 border-b border-white/[0.06]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/70">Clients ({clients.length})</h2>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {clients.map(client => {
            const cieInfo = getCIEClient(client.id)
            if (!cieInfo) return null
            const archInfo = ARCHETYPES.find(a => a.id === cieInfo.archetype)
            const engScore = cieInfo.engagement?.engagementScore || 0
            const isSelected = selectedClientId === client.id

            return (
              <button
                key={client.id}
                onClick={() => setSelectedClientId(client.id)}
                className={`w-full p-3 text-left transition-colors ${
                  isSelected ? 'bg-[#f59e0b]/10 border-l-2 border-[#f59e0b]' : 'border-l-2 border-transparent hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-medium text-white/90">{client.name}</p>
                    <p className="text-xs text-white/50">{client.type}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {archInfo && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${archInfo.color}20`, color: archInfo.color, border: `1px solid ${archInfo.color}40` }}>
                      {archInfo.label}
                    </span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${getDealStageBadgeColor(client.dealStage)}`}>
                    {client.dealStage}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">Engagement</span>
                    <span className="font-mono text-amber-400">{formatScore(engScore)}</span>
                  </div>
                  <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${engScore}%` }}
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* RIGHT PANEL -- CLIENT DOSSIER */}
      {selectedClient && cieData && (
        <div className="flex-1 overflow-y-auto bg-white/[0.01]">
          <div className="p-6 space-y-0">
            {/* A. CLIENT HEADER */}
            <section className="pb-6">
              <div className="flex items-start gap-4 mb-4">
                {/* Initials Circle */}
                <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-amber-400 bg-slate-900/50 flex-shrink-0">
                  <span className="text-lg font-bold text-amber-400">{selectedClient.initials}</span>
                </div>

                {/* Header Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-lg font-semibold text-white/90">{selectedClient.name}</h1>
                    <span className={`text-xs px-2 py-1 rounded ${getTypeColor(selectedClient.type)}`}>
                      {selectedClient.type}
                    </span>
                  </div>
                  <p className="text-sm text-white/70 mb-2">{selectedClient.category}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/60 mb-3">
                    <span>{selectedClient.location}</span>
                    <span className={`px-2 py-1 rounded ${getDealStageBadgeColor(selectedClient.dealStage)}`}>
                      {selectedClient.dealStage}
                    </span>
                    <span>Onboarded {formatDate(selectedClient.onboardedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Engagement Score Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50 font-semibold">OVERALL ENGAGEMENT</span>
                  <span className="font-mono text-amber-400 font-semibold">{formatScore(cieData.engagement?.engagementScore)}</span>
                </div>
                <div className="w-full h-1.5 bg-white/[0.06] rounded overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded transition-all"
                    style={{ width: `${cieData.engagement?.engagementScore || 0}%` }}
                  />
                </div>
                <div className="text-xs text-white/40 mt-1">
                  Momentum: <span className={cieData.engagement?.momentum ? (cieData.engagement.momentum === 'heating' ? 'text-emerald-400' : cieData.engagement.momentum === 'cooling' ? 'text-red-400' : 'text-amber-400') : 'text-white/40'}>
                    {cieData.engagement?.momentum || '--'}
                  </span>
                </div>
              </div>
            </section>

            {/* B. CIE INTELLIGENCE SUMMARY */}
            <section className="border-t border-white/[0.06] pt-6 pb-6">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-amber-400/30">
                <div className="w-1 h-5 bg-amber-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-white/70">CIE Intelligence</h2>
              </div>

              {archetype && (
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-1 rounded font-medium" style={{ backgroundColor: `${archetype.color}20`, color: archetype.color, border: `1px solid ${archetype.color}40` }}>
                      {archetype.label}
                    </span>
                  </div>
                  <p className="text-sm text-white/70">{archetype.description}</p>
                </div>
              )}

              {/* Cognitive Profile -- 12 Dimensions */}
              <div className="mb-4">
                <p className="text-xs text-white/50 font-semibold mb-3">COGNITIVE PROFILE</p>
                <div className="space-y-2">
                  {cieData.profile?.scores?.map((dim: CognitiveDimension) => {
                    const meta = DIMENSION_META.find(m => m.name === dim.dimension)
                    return (
                      <div key={dim.dimension} className="flex items-center gap-3">
                        <div className="w-16 text-xs text-white/50 font-mono">{meta?.shortCode || dim.dimension}</div>
                        <div className="flex-1">
                          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getDimensionColor(dim.value)}`}
                              style={{ width: `${dim.value}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-8 text-right text-xs font-mono text-white/70">{formatScore(dim.value)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Strengths and Development Areas */}
              {(cieData.topDimensions || cieData.bottomDimensions) && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {cieData.topDimensions && cieData.topDimensions.length > 0 && (
                    <div>
                      <p className="text-xs text-emerald-400 font-semibold mb-2">TOP STRENGTHS</p>
                      <ul className="space-y-1 text-xs text-white/70">
                        {cieData.topDimensions.slice(0, 3).map((dim) => (
                          <li key={dim.dimension} className="flex items-start gap-2">
                            <span className="text-emerald-400 mt-1">+ </span>
                            <span>{dim.dimension}: {dim.value}/100</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {cieData.bottomDimensions && cieData.bottomDimensions.length > 0 && (
                    <div>
                      <p className="text-xs text-amber-400 font-semibold mb-2">DEVELOPMENT AREAS</p>
                      <ul className="space-y-1 text-xs text-white/70">
                        {cieData.bottomDimensions.slice(0, 3).map((dim) => (
                          <li key={dim.dimension} className="flex items-start gap-2">
                            <span className="text-amber-400 mt-1">-- </span>
                            <span>{dim.dimension}: {dim.value}/100</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Approach Strategy and Communication Tips */}
              {archetype && (
                <div className="space-y-3">
                  {archetype.description && (
                    <div>
                      <p className="text-xs text-white/50 font-semibold mb-1">ENGAGEMENT APPROACH</p>
                      <p className="text-xs text-white/70 leading-relaxed">{archetype.description}</p>
                    </div>
                  )}

                  {archetype.strengths && archetype.strengths.length > 0 && (
                    <div>
                      <p className="text-xs text-white/50 font-semibold mb-1">COMMUNICATION TIPS</p>
                      <ul className="text-xs text-white/70 space-y-1">
                        {archetype.strengths.slice(0, 3).map((tip: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-400">-- </span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* C. ENGINE MATCH PORTFOLIO */}
            {engineMatchList.length > 0 && (
              <section className="border-t border-white/[0.06] pt-6 pb-6">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-amber-400/30">
                  <div className="w-1 h-5 bg-amber-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-white/70">ENGINE Matches</h2>
                </div>

                <div className="mb-3 text-xs text-white/60">
                  <span className="font-mono text-amber-400">{engineMatchList.length}</span> matched {engineMatchList.length === 1 ? 'property' : 'properties'} -- Average score: <span className="font-mono text-amber-400">{formatScore(engineMatchList.reduce((sum, m) => sum + (m.overallScore || 0), 0) / engineMatchList.length)}</span>
                </div>

                <div className="space-y-2">
                  {engineMatchList.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0)).map((match: EngineMatch) => {
                    const property = getProperty(match.propertyId)
                    return (
                      <div key={match.id} className="p-3 bg-white/[0.02] border border-white/[0.06] rounded text-xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-white/90">{property?.name || 'Unknown Property'}</p>
                            <p className="text-white/50 text-xs">{property?.area || ''} -- {property?.type || ''}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded text-xs ${match.grade === 'A' ? 'bg-emerald-500/20 text-emerald-200' : match.grade === 'B' ? 'bg-amber-500/20 text-amber-200' : 'bg-orange-500/20 text-orange-200'}`}>
                              {match.grade}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-white/50 w-12">Score</span>
                          <div className="flex-1 h-1.5 bg-white/[0.06] rounded overflow-hidden">
                            <div
                              className="h-full bg-amber-400"
                              style={{ width: `${match.overallScore || 0}%` }}
                            />
                          </div>
                          <span className="font-mono text-amber-400 w-8 text-right">{formatScore(match.overallScore)}</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {match.purpose && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-200 text-xs border border-blue-400/50">
                              {match.purpose}
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusColor(match.status)}`}>
                            {match.status}
                          </span>
                        </div>

                        {/* Pillar Scores */}
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: 'Financial', value: match.pillars?.financialFit?.score },
                            { label: 'Lifestyle', value: match.pillars?.lifestyleFit?.score },
                            { label: 'Investment', value: match.pillars?.investmentFit?.score },
                            { label: 'Purpose', value: match.pillars?.purposeAlignment?.score },
                          ].map(pillar => (
                            <div key={pillar.label} className="text-xs">
                              <div className="text-white/50 mb-1">{pillar.label}</div>
                              <div className="w-full h-1 bg-white/[0.06] rounded overflow-hidden">
                                <div
                                  className="h-full bg-cyan-400"
                                  style={{ width: `${pillar.value || 0}%` }}
                                />
                              </div>
                              <div className="text-white/60 text-xs mt-1 font-mono">{formatScore(pillar.value)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* D. PURPOSE CLASSIFICATION */}
            {purpose && (
              <section className="border-t border-white/[0.06] pt-6 pb-6">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-amber-400/30">
                  <div className="w-1 h-5 bg-amber-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-white/70">Purpose Classification</h2>
                </div>

                {purpose.primaryPurpose && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/50 font-semibold">PRIMARY PURPOSE</span>
                      <span className="text-xs font-mono text-amber-400">{formatScore(purpose.confidence)}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-white/90">{purpose.primaryPurpose}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/[0.06] rounded overflow-hidden">
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${purpose.confidence || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {purpose.secondaryPurpose && (
                  <div className="mb-4">
                    <p className="text-xs text-white/50 font-semibold mb-1">SECONDARY PURPOSE</p>
                    <p className="text-sm text-white/90">{purpose.secondaryPurpose}</p>
                  </div>
                )}

                {purpose.signals && purpose.signals.length > 0 && (
                  <div>
                    <p className="text-xs text-white/50 font-semibold mb-2">PURPOSE SIGNALS</p>
                    <ul className="text-xs text-white/70 space-y-1">
                      {purpose.signals.slice(0, 5).map((signal: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-400">-- </span>
                          <span>{signal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* E. MARKET EXPOSURE */}
            {engineMatchList.length > 0 && (
              <section className="border-t border-white/[0.06] pt-6 pb-6">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-amber-400/30">
                  <div className="w-1 h-5 bg-amber-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-white/70">Market Exposure</h2>
                </div>

                <div className="space-y-3">
                  {Array.from(new Set(engineMatchList.map(m => m.areaId).filter(Boolean))).map(areaId => {
                    const area = areaId ? getArea(areaId) : undefined
                    const areaMatches = engineMatchList.filter(m => m.areaId === areaId)
                    return (
                      <div key={areaId} className="p-3 bg-white/[0.02] border border-white/[0.06] rounded">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-white/90">{area?.name || 'Unknown Area'}</p>
                          <span className="text-xs text-white/50">{areaMatches.length} {areaMatches.length === 1 ? 'match' : 'matches'}</span>
                        </div>

                        {area && (
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="text-white/50">Demand</span>
                              <div className="font-mono text-amber-400">{formatScore(area.demandScore)}</div>
                            </div>
                            <div>
                              <span className="text-white/50">Yield</span>
                              <div className="font-mono text-emerald-400">{area?.avgRentalYield ? (area.avgRentalYield * 100).toFixed(1) + '%' : '--'}</div>
                            </div>
                            <div>
                              <span className="text-white/50">Price Change</span>
                              <div className={`font-mono ${(area?.priceChange30d || 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {area?.priceChange30d ? (area.priceChange30d > 0 ? '+' : '') + area.priceChange30d.toFixed(1) + '%' : '--'}
                              </div>
                            </div>
                            <div>
                              <span className="text-white/50">Outlook</span>
                              <div className="text-white/70 capitalize">{area.outlook || '--'}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* F. FORGE ACTION HISTORY */}
            {clientActions.length > 0 && (
              <section className="border-t border-white/[0.06] pt-6 pb-6">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-amber-400/30">
                  <div className="w-1 h-5 bg-amber-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-white/70">FORGE Action History</h2>
                </div>

                <div className="space-y-2">
                  {clientActions.map((action: ForgeAction) => (
                    <div key={action.id} className="p-3 bg-white/[0.02] border border-white/[0.06] rounded text-xs flex items-start gap-3">
                      {/* Priority Dot */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${getPriorityDot(action.priority)}`} />

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <p className="font-medium text-white/90">{action.title}</p>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-xs flex-shrink-0 ${getStatusColor(action.status)}`}>
                            {action.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-white/50">
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.02] border border-white/[0.06]">
                            {action.category}
                          </span>
                          {action.dueDate && (
                            <span>{formatDate(action.dueDate)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {!selectedClient && (
              <div className="flex items-center justify-center h-96 text-white/40">
                <p className="text-sm">Select a client to view their complete dossier</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
