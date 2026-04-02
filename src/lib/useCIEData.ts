// ============================================================================
// PCIS CIE Engine — Live Data Hooks
// ============================================================================
// React hooks that connect CIE frontend panels to the live CIE Agent backend.
// Replaces mock data with real cognitive profiles, signals, and narratives.
//
// Data flow:
//   P1 Backend (CIE Agent) → Next.js Proxy → These Hooks → CIE Panels
//
// Fallback: If backend is unreachable, falls back to mock data from mockData.ts
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { p1Api } from './api'
import {
  clients as mockClients,
  cognitiveProfiles as mockProfiles,
  engagementMetrics as mockEngagement,
  predictions as mockPredictions,
  signals as mockSignals,
  type Client,
  type CognitiveProfile,
  type CognitiveScore,
  type EngagementMetrics,
  type Prediction,
  type Signal,
} from './mockData'
import {
  type CIEClient,
  type Archetype,
  DIMENSION_META,
  buildCIEClients,
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
// useCIEClients — Main hook replacing buildCIEClients() with live data
// ============================================================================

export function useCIEClients(): DataState<CIEClient[]> & { refetch: () => void } {
  const [state, setState] = useState<DataState<CIEClient[]>>({
    data: null,
    loading: true,
    error: null,
    source: 'mock',
  })

  const fetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }))

    try {
      // Try live backend first
      const response = await p1Api.getClients()

      if (response?.success && response.data?.length > 0) {
        // Transform backend clients to CIEClient format
        const cieClients: CIEClient[] = await Promise.all(
          response.data.map(async (backendClient: any) => {
            const profile = backendClient.cognitiveProfile
            const scores: CognitiveScore[] = profile?.scores?.map((s: any) => ({
              dimension: s.dimension?.name || s.dimensionId,
              value: Math.round(Number(s.score) * 100),
              confidence: Number(s.confidence),
              trend: (s.trend || 'stable').toLowerCase() as 'rising' | 'falling' | 'stable',
            })) || []

            const archetype = deriveArchetypeFromScores(scores)
            const sorted = [...scores].sort((a, b) => b.value - a.value)

            const client: Client = {
              id: backendClient.id,
              name: `${backendClient.firstName} ${backendClient.lastName}`,
              initials: `${backendClient.firstName?.[0] || ''}${backendClient.lastName?.[0] || ''}`,
              type: mapTierToType(backendClient.tier),
              category: mapIntentToCategory(backendClient.investmentIntent),
              email: backendClient.email || '',
              phone: backendClient.phone || '',
              location: backendClient.cityOfResidence || 'Dubai',
              onboardedAt: backendClient.createdAt,
              financialProfile: {
                budgetMin: 0,
                budgetMax: 0,
                portfolioValue: 0,
                currency: 'AED',
              },
              dealStage: 'Contacted' as any,
              dealStageChangedAt: backendClient.updatedAt,
            }

            const cognitiveProfile: CognitiveProfile | null = scores.length > 0 ? {
              clientId: backendClient.id,
              scores,
              summary: '',
              keyTraits: [],
              approachStrategy: '',
              riskFactors: [],
              communicationTips: [],
              lastComputed: profile?.computedAt || new Date().toISOString(),
            } : null

            const overallCIEScore = profile
              ? Math.round(Number(profile.confidenceOverall || 0) * 100)
              : 0

            return {
              client,
              profile: cognitiveProfile,
              engagement: null,
              prediction: null,
              lifecycle: null,
              nextTouch: null,
              archetype,
              topDimensions: sorted.slice(0, 3),
              bottomDimensions: sorted.slice(-3).reverse(),
              overallCIEScore,
              signalCount: backendClient._count?.signals || 0,
            } as CIEClient
          })
        )

        setState({
          data: cieClients,
          loading: false,
          error: null,
          source: 'live',
        })
        return
      }
    } catch (err) {
      console.warn('[CIE] Backend unavailable, falling back to mock data:', err)
    }

    // Fallback to mock data
    setState({
      data: buildCIEClients(),
      loading: false,
      error: null,
      source: 'mock',
    })
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
    source: 'mock',
  })

  useEffect(() => {
    if (!clientId) return

    setState({ data: null, loading: true, error: null, source: 'mock' })

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
            source: 'mock',
          })
        }
      })
      .catch((err) => {
        setState({
          data: null,
          loading: false,
          error: err.message,
          source: 'mock',
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
    source: 'mock',
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
      source: 'mock',
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
    source: 'mock',
  })

  useEffect(() => {
    p1Api.getAtRiskClients()
      .then((response) => {
        if (response?.success && response.data) {
          setState({ data: response.data, loading: false, error: null, source: 'live' })
        } else {
          setState({ data: [], loading: false, error: null, source: 'mock' })
        }
      })
      .catch(() => {
        setState({ data: [], loading: false, error: null, source: 'mock' })
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
    source: 'mock',
  })

  const fetch = useCallback(async () => {
    try {
      const response = await p1Api.getCIEAgentStatus()
      if (response?.success && response.data) {
        setState({ data: response.data, loading: false, error: null, source: 'live' })
      }
    } catch {
      setState({ data: null, loading: false, error: 'Agent status unavailable', source: 'mock' })
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
    source: 'mock',
  })

  useEffect(() => {
    if (!clientId) return

    setState({ data: null, loading: true, error: null, source: 'mock' })

    p1Api.getClientTimeline(clientId)
      .then((response) => {
        if (response?.success && response.data) {
          setState({ data: response.data, loading: false, error: null, source: 'live' })
        } else {
          // Fallback to mock signals
          const mockSigs = mockSignals.filter((s) => s.clientId === clientId)
          setState({ data: mockSigs, loading: false, error: null, source: 'mock' })
        }
      })
      .catch(() => {
        const mockSigs = mockSignals.filter((s) => s.clientId === clientId)
        setState({ data: mockSigs, loading: false, error: null, source: 'mock' })
      })
  }, [clientId])

  return state
}

// ============================================================================
// Source Label (for UI badges)
// ============================================================================

export function getCIESourceLabel(source: DataSource): string {
  return source === 'live' ? 'CIE AGENT LIVE' : 'SAMPLE DATA'
}

export function getCIESourceColor(source: DataSource): string {
  return source === 'live' ? '#10B981' : '#F59E0B'
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
