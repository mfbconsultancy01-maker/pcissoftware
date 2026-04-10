// ============================================================================
// PCIS CIE Engine — Live Data Hooks
// ============================================================================
// React hooks that connect CIE frontend panels to the live CIE Agent backend.
//
// Data flow:
//   P1 Backend (CIE Agent) → Next.js Proxy → These Hooks → CIE Panels
//
// No mock/sample data fallback — shows loading or empty states only.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { p1Api } from './api'
import {
  type Client,
  type CognitiveProfile,
  type CognitiveScore,
  type DealStage,
  type EngagementMetrics,
  type Prediction,
  type MomentumDirection,
  type Signal,
  DEAL_STAGES,
} from './mockData'
import {
  type CIEClient,
  type CIEInsights,
  type Archetype,
  DIMENSION_META,
} from './cieData'

// ============================================================================
// TYPES
// ============================================================================

type DataSource = 'live' | 'mock'

interface DataState<T> {
  data: T | null
  loading: boolean
  error: string | null
  source: DataSource
}

interface ClientNarrative {
  clientId: string
  name: string
  archetype: string
  intentClassification: string
  profileSummary: string
  recentShifts: string[]
  riskFactors: string[]
  opportunities: string[]
  lastActivityDate: string | null
  signalCount: number
  confidence: number
}

interface MorningBriefing {
  narrative: string
  stats: {
    totalClients: number
    profilesUpdated: number
    archetypeChanges: number
    significantShifts: number
    atRiskClients: number
    newFlags: number
  }
  details: {
    changes: any
    atRisk: any[]
  }
}

interface AtRiskClient {
  clientId: string
  name: string
  riskType: string
  riskScore: number
  lastContact: string | null
  recommendation: string
}

interface CIEAgentStatus {
  lastRunAt: string | null
  totalProfiles: number
  totalCRMSignals: number
  totalAlerts: number
  copperIntegration: {
    status: string
    lastSyncAt: string | null
    lastSyncStatus: string | null
  } | null
}

// ============================================================================
// useCIEClients — Main hook for live client data
// ============================================================================

export function useCIEClients(): DataState<CIEClient[]> & { refetch: () => void } {
  const [state, setState] = useState<DataState<CIEClient[]>>({
    data: null,
    loading: true,
    error: null,
    source: 'live',
  })

  const fetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }))

    try {
      // Fetch clients, engagement, and predictions in parallel
      const [response, engagementRes, predictionsRes] = await Promise.all([
        p1Api.getClients(),
        p1Api.getEngagementAll().catch(() => null),
        p1Api.getPredictionsAll().catch(() => null),
      ])

      const engagementMap: Record<string, any> = engagementRes?.success ? engagementRes.data : {}
      const predictionsMap: Record<string, any> = predictionsRes?.success ? predictionsRes.data : {}

      if (response?.success && response.data?.length > 0) {
        // Transform backend clients to CIEClient format
        const cieResults = await Promise.all(
          response.data.map(async (backendClient: any): Promise<CIEClient | null> => {
            try {
            const profile = backendClient.cognitiveProfile
            const scores: CognitiveScore[] = (profile?.scores || []).map((s: any) => ({
              dimension: s.dimension?.name || s.dimensionId || 'Unknown',
              value: Math.round(Number(s.score || 0) * 100),
              confidence: Number(s.confidence || 0),
              trend: (s.trend || 'stable').toLowerCase() as 'rising' | 'falling' | 'stable',
            }))

            // Extract CIE insights (Claude-generated profiling) if available
            const rawCieInsights = profile?.cieInsights as CIEInsights | null | undefined
            const cieInsights: CIEInsights | null = rawCieInsights && rawCieInsights.dimensions
              ? rawCieInsights
              : null

            // Use CIE archetype if available, otherwise derive from scores
            const archetype: Archetype = cieInsights?.archetype
              ? (cieInsights.archetype as Archetype)
              : deriveArchetypeFromScores(scores)
            const sorted = [...scores].sort((a, b) => b.value - a.value)

            // Map backend status to a valid DealStage for the pipeline view
            const rawStage = backendClient.status || backendClient.dealStage || 'Lead In'
            const dealStage: DealStage = DEAL_STAGES.includes(rawStage as DealStage)
              ? (rawStage as DealStage)
              : mapStatusToDealStage(rawStage)

            const client: Client = {
              id: backendClient.id,
              name: `${backendClient.firstName || ''} ${backendClient.lastName || ''}`.trim() || 'Unknown',
              initials: `${(backendClient.firstName || '?')[0]}${(backendClient.lastName || '?')[0]}`,
              type: mapTierToType(backendClient.tier),
              category: mapIntentToCategory(backendClient.investmentIntent),
              email: backendClient.email || '',
              phone: backendClient.phone || '',
              location: backendClient.cityOfResidence || 'Dubai',
              onboardedAt: backendClient.createdAt || new Date().toISOString(),
              financialProfile: {
                budgetMin: Number(backendClient.budgetMin) || 0,
                budgetMax: Number(backendClient.budgetMax) || 0,
                portfolioValue: Number(backendClient.portfolioValue) || 0,
                currency: 'AED',
              },
              dealStage,
              dealStageChangedAt: backendClient.updatedAt || new Date().toISOString(),
            }

            // Build CognitiveProfile — enrich from CIE insights when available
            const cognitiveProfile: CognitiveProfile | null = scores.length > 0 ? {
              clientId: backendClient.id,
              scores,
              summary: cieInsights?.overallNarrative || '',
              keyTraits: cieInsights?.topRecommendations || [],
              approachStrategy: cieInsights?.archetypeReasoning || '',
              riskFactors: [],
              communicationTips: cieInsights?.topRecommendations || [],
              lastComputed: cieInsights?.profiledAt || profile?.computedAt || new Date().toISOString(),
            } : null

            const overallCIEScore = profile
              ? Math.round(Number(profile.confidenceOverall || 0) * 100)
              : 0

            // ── Map backend engagement metrics to frontend EngagementMetrics ──
            const rawEng = engagementMap[backendClient.id]
            const engagement = rawEng ? mapBackendEngagement(backendClient.id, rawEng) : null

            // ── Map backend prediction to frontend Prediction ──
            const rawPred = predictionsMap[backendClient.id]
            const prediction = rawPred ? mapBackendPrediction(backendClient.id, rawPred) : null

            return {
              client,
              profile: cognitiveProfile,
              engagement,
              prediction,
              lifecycle: null,
              nextTouch: null,
              archetype,
              topDimensions: sorted.slice(0, 3),
              bottomDimensions: sorted.slice(-3).reverse(),
              overallCIEScore,
              signalCount: backendClient._count?.signals || 0,
              cieInsights,
            } as CIEClient
            } catch (clientErr) {
              console.error('[CIE] Failed to transform client:', backendClient?.id, clientErr)
              return null
            }
          })
        )
        const cieClients: CIEClient[] = cieResults.filter((c): c is CIEClient => c !== null)

        setState({
          data: cieClients,
          loading: false,
          error: null,
          source: 'live',
        })
        return
      }

      // Backend returned empty or no data — show empty state, not mock
      setState({
        data: [],
        loading: false,
        error: null,
        source: 'live',
      })
    } catch (err: any) {
      console.warn('[CIE] Backend unavailable:', err)
      setState({
        data: [],
        loading: false,
        error: 'Unable to connect to CIE backend',
        source: 'live',
      })
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { ...state, refetch: fetch }
}

// ============================================================================
// useClientNarrative — Claude-generated client briefing
// ============================================================================

export function useClientNarrative(clientId: string | null): DataState<ClientNarrative> {
  const [state, setState] = useState<DataState<ClientNarrative>>({
    data: null,
    loading: false,
    error: null,
    source: 'live',
  })

  useEffect(() => {
    if (!clientId) return

    setState({ data: null, loading: true, error: null, source: 'live' })

    p1Api.getClientNarrative(clientId)
      .then((response) => {
        if (response?.success && response.data) {
          setState({
            data: response.data,
            loading: false,
            error: null,
            source: 'live',
          })
        } else {
          setState({
            data: null,
            loading: false,
            error: 'No narrative available',
            source: 'live',
          })
        }
      })
      .catch((err) => {
        setState({
          data: null,
          loading: false,
          error: err.message,
          source: 'live',
        })
      })
  }, [clientId])

  return state
}

// ============================================================================
// useMorningBriefing — Claude-generated morning summary
// ============================================================================

export function useMorningBriefing(): DataState<MorningBriefing> & { refresh: () => void } {
  const [state, setState] = useState<DataState<MorningBriefing>>({
    data: null,
    loading: true,
    error: null,
    source: 'live',
  })

  const fetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }))

    try {
      const response = await p1Api.getMorningBriefing()
      if (response?.success && response.data) {
        setState({
          data: response.data,
          loading: false,
          error: null,
          source: 'live',
        })
        return
      }
    } catch (err: any) {
      console.warn('[CIE] Morning briefing unavailable:', err.message)
    }

    setState({
      data: null,
      loading: false,
      error: 'Briefing not available',
      source: 'live',
    })
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { ...state, refresh: fetch }
}

// ============================================================================
// useAtRiskClients — At-risk client list
// ============================================================================

export function useAtRiskClients(): DataState<AtRiskClient[]> {
  const [state, setState] = useState<DataState<AtRiskClient[]>>({
    data: null,
    loading: true,
    error: null,
    source: 'live',
  })

  useEffect(() => {
    p1Api.getAtRiskClients()
      .then((response) => {
        if (response?.success && response.data) {
          setState({ data: response.data, loading: false, error: null, source: 'live' })
        } else {
          setState({ data: [], loading: false, error: null, source: 'live' })
        }
      })
      .catch(() => {
        setState({ data: [], loading: false, error: null, source: 'live' })
      })
  }, [])

  return state
}

// ============================================================================
// useCIEAgentStatus — Agent health and stats
// ============================================================================

export function useCIEAgentStatus(): DataState<CIEAgentStatus> & { refresh: () => void } {
  const [state, setState] = useState<DataState<CIEAgentStatus>>({
    data: null,
    loading: true,
    error: null,
    source: 'live',
  })

  const fetch = useCallback(async () => {
    try {
      const response = await p1Api.getCIEAgentStatus()
      if (response?.success && response.data) {
        setState({ data: response.data, loading: false, error: null, source: 'live' })
      }
    } catch {
      setState({ data: null, loading: false, error: 'Agent status unavailable', source: 'live' })
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { ...state, refresh: fetch }
}

// ============================================================================
// useClientTimeline — Signal timeline for a client
// ============================================================================

export function useClientTimeline(clientId: string | null): DataState<any[]> {
  const [state, setState] = useState<DataState<any[]>>({
    data: null,
    loading: false,
    error: null,
    source: 'live',
  })

  useEffect(() => {
    if (!clientId) return

    setState({ data: null, loading: true, error: null, source: 'live' })

    p1Api.getClientTimeline(clientId)
      .then((response) => {
        if (response?.success && response.data) {
          setState({ data: response.data, loading: false, error: null, source: 'live' })
        } else {
          setState({ data: [], loading: false, error: null, source: 'live' })
        }
      })
      .catch(() => {
        setState({ data: [], loading: false, error: null, source: 'live' })
      })
  }, [clientId])

  return state
}

// ============================================================================
// useCIESignals — Fetch signal records from the backend
// ============================================================================

export function useCIESignals(): DataState<Signal[]> {
  const [state, setState] = useState<DataState<Signal[]>>({
    data: null,
    loading: true,
    error: null,
    source: 'live',
  })

  useEffect(() => {
    p1Api.getSignals({ limit: 100 })
      .then((response) => {
        if (response?.success && response.data?.length > 0) {
          const mapped: Signal[] = response.data.map((raw: any) => ({
            id: raw.id,
            clientId: raw.clientId || raw.client?.id || '',
            type: mapSignalTypeCode(raw.signalType?.code || raw.signalType?.category || ''),
            content: raw.value?.content || raw.value?.summary || raw.value?.note || raw.signalType?.name || 'Signal recorded',
            timestamp: raw.occurredAt || raw.createdAt || new Date().toISOString(),
            impact: raw.value?.impact || [],
          }))
          setState({ data: mapped, loading: false, error: null, source: 'live' })
        } else {
          setState({ data: [], loading: false, error: null, source: 'live' })
        }
      })
      .catch(() => {
        setState({ data: [], loading: false, error: null, source: 'live' })
      })
  }, [])

  return state
}

function mapSignalTypeCode(code: string): Signal['type'] {
  const c = code.toUpperCase()
  if (c.includes('VIEW') || c.includes('PROPERTY_VIEW')) return 'viewing'
  if (c.includes('INQUIRY') || c.includes('QUESTION')) return 'inquiry'
  if (c.includes('MEETING') || c.includes('CALL')) return 'meeting'
  if (c.includes('OFFER') || c.includes('BID')) return 'offer'
  if (c.includes('FEEDBACK') || c.includes('REVIEW')) return 'feedback'
  if (c.includes('REFERRAL')) return 'referral'
  if (c.includes('FINANCIAL') || c.includes('BUDGET') || c.includes('MORTGAGE')) return 'financial'
  return 'lifecycle'
}

// ============================================================================
// Source Label (for UI badges)
// ============================================================================

export function getCIESourceLabel(source: DataSource): string {
  return source === 'live' ? 'CIE AGENT LIVE' : 'LOADING'
}

export function getCIESourceColor(source: DataSource): string {
  return source === 'live' ? '#10B981' : '#64748b'
}

// ============================================================================
// Helpers
// ============================================================================

function deriveArchetypeFromScores(scores: CognitiveScore[]): Archetype {
  const getScore = (dim: string) =>
    scores.find((s) => s.dimension === dim || s.dimension === DIMENSION_META.find((d) => d.shortCode === dim)?.name)?.value ?? 50

  const dv = getScore('Decision Velocity')
  const rt = getScore('Risk Tolerance')
  const doScore = getScore('Detail Orientation')
  const ed = getScore('Emotional Driver')
  const pn = getScore('Privacy Need')

  if (dv >= 75 && rt >= 60) return 'decisive'
  if (doScore >= 75 && dv <= 45) return 'analytical'
  if (rt <= 35 && pn >= 65) return 'cautious'
  if (ed >= 75 && dv >= 70) return 'impulsive'
  return 'balanced'
}

function mapTierToType(tier: string): 'UHNW' | 'HNW' | 'Affluent' {
  if (tier === 'A') return 'UHNW'
  if (tier === 'B') return 'HNW'
  return 'Affluent'
}

function mapIntentToCategory(intent: string | null): Client['category'] {
  if (intent === 'INVESTMENT') return 'Investor'
  if (intent === 'END_USE') return 'Lifestyle'
  if (intent === 'MIXED') return 'Portfolio Builder'
  return 'Lifestyle'
}

// ============================================================================
// useProfileClient — Trigger CIE cognitive profiling for a client
// ============================================================================

interface ProfileAction {
  profiling: boolean
  result: any | null
  error: string | null
  trigger: (...args: any[]) => Promise<void>
}

export function useProfileClient(): ProfileAction {
  const [profiling, setProfiling] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const trigger = useCallback(async (clientId: string) => {
    setProfiling(true)
    setResult(null)
    setError(null)

    try {
      const response = await p1Api.profileClient(clientId)
      if (response?.success) {
        setResult(response.data)
      } else {
        setError(response?.error || 'Profiling failed')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setProfiling(false)
    }
  }, [])

  return { profiling, result, error, trigger }
}

// ============================================================================
// useProfileAllInvestors — Trigger CIE profiling for all investors
// ============================================================================

export function useProfileAllInvestors(): ProfileAction {
  const [profiling, setProfiling] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const trigger = useCallback(async () => {
    setProfiling(true)
    setResult(null)
    setError(null)

    try {
      const response = await p1Api.profileAllInvestors()
      if (response?.success) {
        setResult(response.data)
      } else {
        setError(response?.error || 'Profiling failed')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setProfiling(false)
    }
  }, [])

  return { profiling, result, error, trigger }
}

// ============================================================================
// Helpers
// ============================================================================

// ============================================================================
// Backend → Frontend Engagement/Prediction Mappers
// ============================================================================

function mapBackendEngagement(clientId: string, raw: any): EngagementMetrics {
  // Map backend engagementStatus to frontend EngagementStatus
  const statusMap: Record<string, EngagementMetrics['status']> = {
    thriving: 'thriving',
    active: 'active',
    cooling: 'cooling',
    cold: 'cold',
    dormant: 'dormant',
    new: 'active', // frontend doesn't have 'new', map to 'active'
  }

  // Map backend trend to frontend MomentumDirection
  const momentumMap: Record<string, MomentumDirection> = {
    accelerating: 'heating',
    stable: 'stable',
    decaying: 'cooling',
    critical: 'cooling',
  }

  const decayRate = Number(raw.decayRate || 0)
  const engagementScore = Math.round((1 - decayRate) * 100)
  const baselineVelocity = Number(raw.baselineVelocity || 0)
  const expectedInterval = baselineVelocity > 0 ? Math.round(30 / baselineVelocity) : 30

  return {
    clientId,
    status: statusMap[raw.engagementStatus] || 'dormant',
    momentum: momentumMap[raw.trend] || 'stable',
    currentVelocity: Number(raw.currentVelocity || 0),
    baselineVelocity,
    decayRate: Math.round(decayRate * 100),
    daysSinceContact: Number(raw.daysSinceLastSignal || 0),
    expectedInterval,
    engagementScore,
    readinessScore: 0, // readiness comes from predictions, not engagement
  }
}

function mapBackendPrediction(clientId: string, raw: any): Prediction | null {
  const patterns = raw.patterns || []
  if (patterns.length === 0) return null

  // Use the highest-probability pattern
  const top = patterns[0]

  const momentumMap: Record<string, MomentumDirection> = {
    heating: 'heating',
    cooling: 'cooling',
    stable: 'stable',
  }

  return {
    clientId,
    pattern: top.pattern,
    confidence: Math.round((top.probability || 0) * 100),
    momentum: momentumMap[raw.momentumDirection] || 'stable',
    description: top.description || top.advisorAction || '',
    detectedAt: raw.computedAt || new Date().toISOString(),
  }
}

function mapStatusToDealStage(status: string): DealStage {
  const s = (status || '').toLowerCase()
  if (s.includes('won') || s.includes('closed') || s.includes('completed')) return 'Closed Won'
  if (s.includes('negotiat')) return 'Negotiation'
  if (s.includes('offer')) return 'Offer Made'
  if (s.includes('view')) return 'Viewing'
  if (s.includes('discover') || s.includes('qualif')) return 'Discovery'
  // Default: all new/prospect/contacted clients go to Lead In
  return 'Lead In'
}
