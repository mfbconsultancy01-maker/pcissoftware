'use client'

import { useState, useMemo } from 'react'
import { useCIEClients, useCIESignals } from '@/lib/useCIEData'
import { pciscomSignals, DIMENSION_META, type PCISCOMSignal } from '@/lib/cieData'
import { type Signal } from '@/lib/mockData'
import { P1Loading } from '@/components/P1Loading'
import { ClientLink } from '../useWorkspaceNav'

type SignalType = 'viewing' | 'inquiry' | 'meeting' | 'offer' | 'feedback' | 'referral' | 'financial' | 'lifecycle'

const SIGNAL_COLORS: Record<SignalType, { bg: string; text: string; border: string; pill: string }> = {
  viewing: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-400/40', pill: 'bg-blue-500/10 text-blue-300 border-blue-400/20' },
  inquiry: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-400/40', pill: 'bg-cyan-500/10 text-cyan-300 border-cyan-400/20' },
  meeting: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-400/40', pill: 'bg-purple-500/10 text-purple-300 border-purple-400/20' },
  offer: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-400/40', pill: 'bg-green-500/10 text-green-300 border-green-400/20' },
  feedback: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-400/40', pill: 'bg-amber-500/10 text-amber-300 border-amber-400/20' },
  referral: { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-400/40', pill: 'bg-pink-500/10 text-pink-300 border-pink-400/20' },
  financial: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-400/40', pill: 'bg-orange-500/10 text-orange-300 border-orange-400/20' },
  lifecycle: { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-400/40', pill: 'bg-indigo-500/10 text-indigo-300 border-indigo-400/20' },
}

// ── AI Narrative Generator for Signals ──────────────────────────────────

function generateSignalNarrative(sig: Signal & { client: { id: string; name: string } }): {
  summary: string
  howItHappened: string
  whatItMeans: string
  dimensionExplanation: string
} {
  const clientName = sig.client.name.split(' ')[0]
  const type = sig.type as SignalType
  const impactDims = sig.impact || []
  const positiveDims = impactDims.filter(d => d.delta > 0)
  const negativeDims = impactDims.filter(d => d.delta < 0)

  const typeNarratives: Record<SignalType, { summary: string; how: string }> = {
    viewing: {
      summary: `${clientName} attended a property viewing, which is a strong active-interest signal in the CIE pipeline.`,
      how: `This signal was captured when ${clientName}'s viewing activity was registered in the system. Property viewings are weighted heavily by the CIE engine because they represent physical commitment: the client is investing time and effort, which correlates strongly with purchase intent.`,
    },
    inquiry: {
      summary: `${clientName} made a direct inquiry, indicating active research behaviour and growing interest.`,
      how: `This inquiry was logged when ${clientName} reached out with specific questions. The CIE engine treats inquiries as mid-funnel signals: they show the client is moving beyond passive browsing into active evaluation.`,
    },
    meeting: {
      summary: `A meeting was held with ${clientName}, representing a high-value touchpoint in the advisory relationship.`,
      how: `This signal was generated from a scheduled meeting event. Meetings are among the strongest engagement signals in the CIE model because they require mutual time investment and typically involve substantive discussion about preferences and requirements.`,
    },
    offer: {
      summary: `${clientName} has submitted or received an offer, placing them in the advanced deal stage.`,
      how: `This offer signal was triggered when an active offer was registered in the pipeline. Offers represent the most advanced pre-closure signal and indicate the client has moved past evaluation into commitment.`,
    },
    feedback: {
      summary: `${clientName} provided feedback, giving the AI new data points to refine their cognitive profile.`,
      how: `Feedback signals are captured when the client shares opinions, preferences, or reactions. The CIE engine uses these to recalibrate dimension scores, particularly around Decision Velocity, Detail Orientation, and Emotional Driver.`,
    },
    referral: {
      summary: `A referral event involving ${clientName} was detected, signalling strong relationship health and loyalty.`,
      how: `Referral signals are among the most positive indicators in the CIE model. They suggest the client trusts the advisory relationship enough to stake their own reputation on it, which directly impacts Trust Formation and Loyalty Tendency scores.`,
    },
    financial: {
      summary: `A financial signal was detected for ${clientName}, indicating a change in their financial posture or readiness.`,
      how: `Financial signals are triggered by events like budget updates, mortgage pre-approvals, or portfolio changes. These are critical because they directly affect the client's capacity to act and are weighted heavily in purchase-readiness calculations.`,
    },
    lifecycle: {
      summary: `A lifecycle event was detected for ${clientName}, marking a transition in their client journey.`,
      how: `Lifecycle signals capture major transitions: new client onboarding, deal stage changes, anniversary milestones, or re-engagement after dormancy. The CIE engine uses these to adjust engagement decay curves and prediction models.`,
    },
  }

  const { summary, how } = typeNarratives[type]

  let whatItMeans = ''
  if (positiveDims.length > 0 && negativeDims.length === 0) {
    whatItMeans = `This is a purely positive signal. It strengthens ${clientName}'s profile across ${positiveDims.length} dimension${positiveDims.length > 1 ? 's' : ''}, suggesting growing engagement and alignment with the advisory relationship. The CIE engine will factor this into prediction models and may increase confidence scores on active predictions.`
  } else if (negativeDims.length > 0 && positiveDims.length === 0) {
    whatItMeans = `This signal carries risk indicators. It has negatively impacted ${negativeDims.length} dimension${negativeDims.length > 1 ? 's' : ''} in ${clientName}'s profile, which may indicate growing hesitation, dissatisfaction, or competing priorities. The ENGINE may generate a follow-up action to address this.`
  } else if (positiveDims.length > 0 && negativeDims.length > 0) {
    whatItMeans = `This is a mixed signal with both positive and negative dimension impacts. While some aspects of ${clientName}'s profile are strengthening, others show strain. This typically happens during active decision-making phases where the client is weighing options. Close attention is recommended.`
  } else {
    whatItMeans = `This signal has been logged but has not yet triggered measurable dimension changes. The CIE engine will continue monitoring for follow-up activity that may reveal its full impact on ${clientName}'s cognitive profile.`
  }

  let dimensionExplanation = ''
  if (impactDims.length > 0) {
    const dimDescriptions = impactDims.map(({ dimension, delta }) => {
      const meta = DIMENSION_META.find(d => d.name === dimension)
      const direction = delta > 0 ? 'increased' : 'decreased'
      return `${meta?.name || dimension} ${direction} by ${Math.abs(delta)} points${meta ? ` (${meta.description.toLowerCase()})` : ''}`
    })
    dimensionExplanation = `Dimension impacts: ${dimDescriptions.join('. ')}.`
  }

  return { summary, howItHappened: how, whatItMeans, dimensionExplanation }
}

// ── Signal Detail Overlay ───────────────────────────────────────────────

function SignalDetailOverlay({
  sig,
  onClose,
}: {
  sig: Signal & { client: { id: string; name: string } }
  onClose: () => void
}) {
  const narrative = generateSignalNarrative(sig)
  const type = sig.type as SignalType

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 bg-[#0a0a0a] border border-pcis-border/40 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-pcis-border/20 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#C9A55A' }} />
              <span className="text-[10px] font-semibold text-pcis-gold uppercase tracking-wider">PCIS AI Signal Analysis</span>
            </div>
            <button onClick={onClose} className="text-pcis-text-muted hover:text-white transition-colors text-sm">x</button>
          </div>
          <div className="flex items-center gap-3">
            <ClientLink clientId={sig.client.id} className="text-[13px] font-semibold text-white">
              {sig.client.name}
            </ClientLink>
            <span className={`text-[8px] px-2 py-1 rounded border font-semibold ${SIGNAL_COLORS[type].pill}`}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          </div>
          <p className="text-[9px] text-pcis-text-muted mt-1 font-mono">
            {new Date(sig.timestamp).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' '}at{' '}
            {new Date(sig.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Signal Content */}
        <div className="px-5 py-3 border-b border-pcis-border/10 bg-white/[0.01]">
          <p className="text-[10px] text-pcis-text-primary leading-relaxed">{sig.content}</p>
        </div>

        {/* AI Narrative */}
        <div className="px-5 py-4 space-y-4 max-h-[50vh] overflow-y-auto">
          {/* Summary */}
          <div>
            <h4 className="text-[9px] font-semibold text-pcis-gold uppercase tracking-wider mb-1.5">Summary</h4>
            <p className="text-[10px] text-pcis-text-secondary leading-relaxed">{narrative.summary}</p>
          </div>

          {/* How It Happened */}
          <div>
            <h4 className="text-[9px] font-semibold text-pcis-gold uppercase tracking-wider mb-1.5">How This Was Detected</h4>
            <p className="text-[10px] text-pcis-text-secondary leading-relaxed">{narrative.howItHappened}</p>
          </div>

          {/* Dimension Impacts */}
          {sig.impact && sig.impact.length > 0 && (
            <div>
              <h4 className="text-[9px] font-semibold text-pcis-gold uppercase tracking-wider mb-2">Cognitive Dimension Impacts</h4>
              <div className="space-y-2">
                {sig.impact.map(({ dimension, delta }) => {
                  const dimMeta = DIMENSION_META.find(d => d.name === dimension)
                  const isPositive = delta > 0
                  return (
                    <div key={dimension} className="flex items-center gap-3">
                      <div className={`text-[9px] px-2 py-1 rounded border font-mono min-w-[140px] ${
                        isPositive
                          ? 'bg-green-500/10 text-green-300 border-green-400/20'
                          : 'bg-red-500/10 text-red-300 border-red-400/20'
                      }`}>
                        {dimMeta?.name || dimension} {isPositive ? '+' : ''}{delta}
                      </div>
                      <span className="text-[9px] text-pcis-text-muted">{dimMeta?.description}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* What It Means */}
          <div>
            <h4 className="text-[9px] font-semibold text-pcis-gold uppercase tracking-wider mb-1.5">What This Means</h4>
            <p className="text-[10px] text-pcis-text-secondary leading-relaxed">{narrative.whatItMeans}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-pcis-border/20 bg-white/[0.02]">
          <p className="text-[8px] text-pcis-text-muted italic">
            <span className="text-pcis-gold">◆</span> Analysis generated by CIE Engine based on signal data, client profile, and cognitive dimension model
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────

export default function CIESignalsView() {
  const { data: liveCIEClients, loading } = useCIEClients()
  const { data: liveSignals } = useCIESignals()
  const cieClients = liveCIEClients || []
  const signals: Signal[] = liveSignals || []

  const [selectedTypes, setSelectedTypes] = useState<SignalType[]>([])
  const [pciscomOnly, setPciscomOnly] = useState(false)
  const [expandedSignal, setExpandedSignal] = useState<(Signal & { client: { id: string; name: string } }) | null>(null)

  const allSignals = useMemo(() => {
    const crmSignals = signals
      .flatMap((s) => {
        const cieClient = cieClients.find((c) => c.client.id === s.clientId)
        if (!cieClient) return []
        return [{ ...s, source: 'CRM' as const, client: cieClient.client }]
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return crmSignals
  }, [cieClients])

  const filteredSignals = useMemo(() => {
    let filtered = allSignals

    if (selectedTypes.length > 0) {
      filtered = filtered.filter((s) => selectedTypes.includes(s.type as SignalType))
    }

    if (pciscomOnly) {
      filtered = []
    }

    return filtered
  }, [allSignals, selectedTypes, pciscomOnly])

  const signalTypes: SignalType[] = [
    'viewing',
    'inquiry',
    'meeting',
    'offer',
    'feedback',
    'referral',
    'financial',
    'lifecycle',
  ]

  const dimensionImpacts = useMemo(() => {
    const impacts: Record<string, number> = {}

    filteredSignals.forEach((s) => {
      if (s.impact) {
        s.impact.forEach(({ dimension, delta }) => {
          impacts[dimension] = (impacts[dimension] || 0) + delta
        })
      }
    })

    return Object.entries(impacts)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 5)
  }, [filteredSignals])

  const activeClients = useMemo(() => {
    const clientCounts: Record<string, { name: string; count: number }> = {}

    filteredSignals.forEach((s) => {
      if (!clientCounts[s.client.id]) {
        clientCounts[s.client.id] = { name: s.client.name, count: 0 }
      }
      clientCounts[s.client.id].count += 1
    })

    return Object.entries(clientCounts)
      .map(([id, data]) => [data.name, data.count] as const)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [filteredSignals])

  // Loading guard — all hooks called above
  if (loading && cieClients.length === 0) return <P1Loading message="Loading CIE data..." />

  const sentimentGauge = (value: number) => {
    const normalized = Math.max(-1, Math.min(1, value))
    const percentage = ((normalized + 1) / 2) * 100
    const color = normalized > 0.3 ? 'bg-green-500' : normalized < -0.3 ? 'bg-red-500' : 'bg-amber-500'

    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 bg-pcis-border/20 rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
        </div>
        <span className="text-[8px] font-mono text-pcis-text-secondary">{value.toFixed(1)}</span>
      </div>
    )
  }

  const displaySignals = pciscomOnly ? [] : filteredSignals

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Signal Detail Overlay */}
      {expandedSignal && (
        <SignalDetailOverlay sig={expandedSignal} onClose={() => setExpandedSignal(null)} />
      )}

      <div className="flex h-full gap-4">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-pcis-border/20">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-3.5 rounded-full bg-cyan-400" />
              <span className="text-[11px] font-semibold text-pcis-text-secondary uppercase tracking-wider">Signal Intelligence Feed</span>
            </div>
            <span className="text-[9px] text-pcis-text-muted">
              {pciscomOnly ? pciscomSignals.length : displaySignals.length} signals
            </span>
          </div>

          {/* Filter Bar */}
          <div className="border-b border-pcis-border/20 px-4 py-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {signalTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedTypes((prev) =>
                      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                    )
                  }}
                  className={`text-[9px] px-2.5 py-1 rounded border font-medium transition-all ${
                    selectedTypes.includes(type)
                      ? SIGNAL_COLORS[type].pill
                      : 'bg-pcis-border/10 text-pcis-text-secondary border-pcis-border/20 hover:border-pcis-border/40'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPciscomOnly(!pciscomOnly)}
              className={`text-[9px] px-2.5 py-1 rounded border font-medium transition-all ${
                pciscomOnly
                  ? 'bg-pcis-gold/10 text-pcis-gold border-pcis-gold/20'
                  : 'bg-pcis-border/10 text-pcis-text-secondary border-pcis-border/20 hover:border-pcis-border/40'
              }`}
            >
              PCISCOM
            </button>
          </div>

          {/* PCISCOM Signals Section */}
          {pciscomOnly && (
            <div className="border-b border-pcis-border/20 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-[3px] h-3.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
                <span className="text-[11px] font-semibold text-pcis-text-secondary uppercase tracking-wider">PCISCOM Intent</span>
              </div>
              <div className="space-y-2">
                {pciscomSignals.map((sig: PCISCOMSignal) => (
                  <div
                    key={sig.messageId}
                    className="bg-white/[0.02] border border-pcis-border/30 rounded-xl backdrop-blur-sm overflow-hidden p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] text-pcis-text-primary font-medium">{sig.intent}</p>
                        <p className="text-[8px] text-pcis-text-muted mt-0.5">PCISCOM</p>
                      </div>
                      <span className="text-[8px] px-2 py-1 rounded bg-pcis-gold/10 text-pcis-gold font-mono">
                        {sig.urgency}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[8px] text-pcis-text-secondary">Sentiment</p>
                      {sentimentGauge(sig.sentiment)}
                    </div>

                    {sig.riskFlags && sig.riskFlags.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {sig.riskFlags.map((flag, i) => (
                          <span key={i} className="text-[8px] px-2 py-1 rounded bg-red-500/10 text-red-300 border border-red-400/20">
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signal List */}
          <div className="flex-1 overflow-y-auto">
            {displaySignals.length === 0 ? (
              <div className="flex items-center justify-center h-full text-pcis-text-muted">
                <p className="text-[9px]">No signals matching filters</p>
              </div>
            ) : (
              <div className="divide-y divide-pcis-border/10">
                {displaySignals.map((sig) => (
                  <div
                    key={`${sig.clientId}-${sig.id}`}
                    onClick={() => setExpandedSignal(sig)}
                    className="px-4 py-2.5 hover:bg-pcis-gold/[0.03] transition-colors cursor-pointer group"
                  >
                    {/* Top row: timestamp, client, badges */}
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[8px] font-mono text-pcis-text-muted flex-shrink-0">
                          {new Date(sig.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-[10px] text-pcis-text-primary truncate group-hover:text-pcis-gold transition-colors">{sig.client.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[7px] text-pcis-gold/50 opacity-0 group-hover:opacity-100 transition-opacity">VIEW ANALYSIS</span>
                        <span
                          className={`text-[8px] px-2 py-1 rounded border font-semibold ${
                            SIGNAL_COLORS[sig.type as SignalType].pill
                          }`}
                        >
                          {sig.type.charAt(0).toUpperCase() + sig.type.slice(1)}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-[10px] text-pcis-text-primary mb-1.5 leading-relaxed">{sig.content}</p>

                    {/* Dimension chips - FULL NAMES */}
                    {sig.impact && sig.impact.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {sig.impact.map(({ dimension, delta }) => {
                          const dimMeta = DIMENSION_META.find(d => d.name === dimension)
                          const isPositive = delta > 0
                          return (
                            <span
                              key={dimension}
                              className={`text-[8px] px-2 py-0.5 rounded border ${
                                isPositive
                                  ? 'bg-green-500/10 text-green-300 border-green-400/20'
                                  : 'bg-red-500/10 text-red-300 border-red-400/20'
                              }`}
                            >
                              {dimMeta?.name || dimension} {isPositive ? '+' : ''}{delta}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-52 border-l border-pcis-border/20 overflow-y-auto flex flex-col">
          {/* Dimension Impacts Panel */}
          <div className="flex-1 flex flex-col border-b border-pcis-border/20">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-pcis-border/20">
              <div className="w-[3px] h-3.5 rounded-full" style={{ backgroundColor: '#a78bfa' }} />
              <span className="text-[11px] font-semibold text-pcis-text-secondary uppercase tracking-wider">Dimension Impacts</span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {dimensionImpacts.length === 0 ? (
                <p className="text-[9px] text-pcis-text-muted">No dimension changes</p>
              ) : (
                dimensionImpacts.map(([dim, delta]) => {
                  const dimMeta = DIMENSION_META.find(d => d.name === dim)
                  const isPositive = delta > 0
                  return (
                    <div key={dim} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-pcis-text-secondary">
                          {dimMeta?.name || dim}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-semibold ${
                            isPositive ? 'text-green-300' : 'text-red-300'
                          }`}
                        >
                          {isPositive ? '+' : ''}{delta}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-pcis-border/20 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, Math.abs(delta) * 10)}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Most Active Panel */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-pcis-border/20">
              <div className="w-[3px] h-3.5 rounded-full bg-pcis-gold" />
              <span className="text-[11px] font-semibold text-pcis-text-secondary uppercase tracking-wider">Most Active</span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {activeClients.length === 0 ? (
                <p className="text-[9px] text-pcis-text-muted">No client activity</p>
              ) : (
                activeClients.map(([clientName, count]) => (
                  <div key={clientName} className="flex items-center justify-between gap-2">
                    <span className="text-[9px] text-pcis-text-secondary truncate">{clientName}</span>
                    <span className="text-[8px] font-mono font-semibold text-pcis-gold px-2 py-0.5 rounded bg-pcis-gold/10 border border-pcis-gold/20 flex-shrink-0">
                      {count}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Total Count */}
            <div className="px-4 py-3 border-t border-pcis-border/20">
              <p className="text-[8px] text-pcis-text-muted mb-1">Total signals</p>
              <p className="text-2xl font-bold text-pcis-gold font-mono">{displaySignals.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
