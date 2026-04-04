// =============================================================================
// PCIS FORGE Engine -- Live Data Hooks
// =============================================================================
// React hooks that connect FORGE frontend panels to the live Advisor backend.
// Replaces mock data with real alerts, recommendations, reports, and activity.
//
// Data flow:
//   P1 Backend (Advisor Routes) -> Next.js Proxy -> These Hooks -> FORGE Panels
//
// Fallback: If backend is unreachable, falls back to mock data from forgeData.ts
// =============================================================================

import { useState, useEffect, useCallback } from 'react'
import { p1Api } from './api'
import {
  forgeActions as mockActions,
  dealBriefs as mockBriefs,
  proposals as mockProposals,
  communicationDrafts as mockComms,
  lifecycleActions as mockLifecycle,
  forgeActivityLog as mockActivityLog,
  getForgeSummary as getMockSummary,
  type ForgeAction,
  type DealBrief,
  type Proposal,
  type CommunicationDraft,
  type LifecycleAction,
  type ForgeActivityLog,
  type ForgeSummary,
} from './forgeData'

// =============================================================================
// TYPES
// =============================================================================

type DataSource = 'live' | 'mock'

interface DataState<T> {
  data: T | null
  loading: boolean
  error: string | null
  source: DataSource
}

// Backend response shapes (from advisor routes)
interface BackendAlert {
  id: string
  clientId: string | null
  type: string
  priority: string
  title: string
  body: string
  status: string
  actionUrl: string | null
  relatedEntityType: string | null
  relatedEntityId: string | null
  createdAt: string
  seenAt: string | null
  actedAt: string | null
  client?: { firstName: string; lastName: string; tier: string }
  assignedTo?: { name: string }
}

interface BackendRecommendation {
  id: string
  clientId: string
  classification: string
  category: string
  title: string
  rationale: string
  suggestedAction: string
  urgency: string
  confidenceScore: number
  status: string
  createdAt: string
  validUntil: string | null
  client?: { firstName: string; lastName: string; tier: string }
}

interface BackendReport {
  id: string
  clientId: string
  title: string
  type: string
  status: string
  generatedAt: string
  sentAt: string | null
  client?: { firstName: string; lastName: string }
  sections?: { sectionType: string; title: string }[]
}

interface BackendActivityLog {
  id: string
  userId: string
  action: string
  entityType: string | null
  entityId: string | null
  metadata: Record<string, any>
  durationMs: number | null
  createdAt: string
  user?: { name: string }
}

interface AdvisorDashboard {
  overview: {
    pendingAlerts: number
    urgentRecommendations: number
    highScoringUnpresentedMatches: number
  }
  alerts: {
    urgent: number
    high: number
    medium: number
    low: number
    total: number
    byType: Record<string, number>
    recentAlerts: BackendAlert[]
  }
  recommendations: {
    id: string
    title: string
    classification: string
    category: string
    urgency: string
    client: string
    confidenceScore: number
  }[]
  recentReports: {
    id: string
    title: string
    type: string
    status: string
    client: string
    generatedAt: string
  }[]
  topMatches: {
    id: string
    client: string
    clientTier: string
    property: string
    propertyType: string
    location: string
    price: string
    score: number
    grade: string
  }[]
  activity: {
    period: string
    totalActions: number
    uniqueUsers: number
    topActions: { action: string; count: number }[]
    feedbackSignalsGenerated: number
    adoptionMetrics: {
      matchesPresented: number
      reportsGenerated: number
      recommendationsActedOn: number
      alertsAcknowledged: number
    }
  }
}

// =============================================================================
// HOOK: Advisor Dashboard (unified command centre)
// =============================================================================

export function useAdvisorDashboard(days = 7) {
  const [state, setState] = useState<DataState<AdvisorDashboard>>({
    data: null,
    loading: true,
    error: null,
    source: 'mock',
  })

  const fetchDashboard = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const result = await p1Api.getAdvisorDashboard({ days })
      if (result?.success && result.data) {
        setState({ data: result.data, loading: false, error: null, source: 'live' })
        return
      }
    } catch (err) {
      console.warn('[FORGE] Dashboard backend unavailable, using mock data:', err)
    }

    // Fallback to mock summary
    const mock = getMockSummary()
    setState({
      data: {
        overview: {
          pendingAlerts: mock.criticalActions,
          urgentRecommendations: mock.criticalActions,
          highScoringUnpresentedMatches: 0,
        },
        alerts: {
          urgent: mock.actionsByPriority.critical || 0,
          high: mock.actionsByPriority.high || 0,
          medium: mock.actionsByPriority.medium || 0,
          low: mock.actionsByPriority.low || 0,
          total: mock.totalActions,
          byType: {},
          recentAlerts: [],
        },
        recommendations: [],
        recentReports: [],
        topMatches: [],
        activity: {
          period: `${days} days`,
          totalActions: mock.totalActions,
          uniqueUsers: 1,
          topActions: [],
          feedbackSignalsGenerated: 0,
          adoptionMetrics: {
            matchesPresented: 0,
            reportsGenerated: mock.briefsGenerated,
            recommendationsActedOn: 0,
            alertsAcknowledged: 0,
          },
        },
      } as AdvisorDashboard,
      loading: false,
      error: null,
      source: 'mock',
    })
  }, [days])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return { ...state, refresh: fetchDashboard }
}

// =============================================================================
// HOOK: Alerts
// =============================================================================

export function useForgeAlerts(params?: { status?: string; priority?: string; type?: string; clientId?: string }) {
  const [state, setState] = useState<DataState<BackendAlert[]>>({
    data: null,
    loading: true,
    error: null,
    source: 'mock',
  })

  const fetchAlerts = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }))

    try {
      const result = await p1Api.getAlerts(params)
      if (result?.success && result.data) {
        setState({ data: result.data, loading: false, error: null, source: 'live' })
        return
      }
    } catch (err) {
      console.warn('[FORGE] Alerts backend unavailable:', err)
    }

    setState({ data: [], loading: false, error: null, source: 'mock' })
  }, [params?.status, params?.priority, params?.type, params?.clientId])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  return { ...state, refresh: fetchAlerts }
}

// =============================================================================
// HOOK: Recommendations
// =============================================================================

export function useForgeRecommendations(params?: { clientId?: string; classification?: string; category?: string }) {
  const [state, setState] = useState<DataState<BackendRecommendation[]>>({
    data: null,
    loading: true,
    error: null,
    source: 'mock',
  })

  const fetchRecs = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }))

    try {
      const result = await p1Api.getRecommendations(params)
      if (result?.success && result.data) {
        setState({ data: result.data, loading: false, error: null, source: 'live' })
        return
      }
    } catch (err) {
      console.warn('[FORGE] Recommendations backend unavailable:', err)
    }

    setState({ data: [], loading: false, error: null, source: 'mock' })
  }, [params?.clientId, params?.classification, params?.category])

  useEffect(() => {
    fetchRecs()
  }, [fetchRecs])

  return { ...state, refresh: fetchRecs }
}

// =============================================================================
// HOOK: Reports
// =============================================================================

export function useForgeReports(params?: { clientId?: string; type?: string; status?: string }) {
  const [state, setState] = useState<DataState<BackendReport[]>>({
    data: null,
    loading: true,
    error: null,
    source: 'mock',
  })

  const fetchReports = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }))

    try {
      const result = await p1Api.getForgeReports(params)
      if (result?.success && result.data) {
        setState({ data: result.data, loading: false, error: null, source: 'live' })
        return
      }
    } catch (err) {
      console.warn('[FORGE] Reports backend unavailable:', err)
    }

    setState({ data: [], loading: false, error: null, source: 'mock' })
  }, [params?.clientId, params?.type, params?.status])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  return { ...state, refresh: fetchReports }
}

// =============================================================================
// HOOK: Activity Feed
// =============================================================================

export function useForgeActivity(params?: { action?: string; days?: number; limit?: number }) {
  const [state, setState] = useState<DataState<BackendActivityLog[]>>({
    data: null,
    loading: true,
    error: null,
    source: 'mock',
  })

  const fetchActivity = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }))

    try {
      const result = await p1Api.getActivityFeed(params)
      if (result?.success && result.logs) {
        setState({ data: result.logs, loading: false, error: null, source: 'live' })
        return
      }
    } catch (err) {
      console.warn('[FORGE] Activity backend unavailable:', err)
    }

    // Fallback to mock activity log
    setState({ data: null, loading: false, error: null, source: 'mock' })
  }, [params?.action, params?.days, params?.limit])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  return { ...state, refresh: fetchActivity, mockData: mockActivityLog }
}

// =============================================================================
// HOOK: Activity Summary (analytics)
// =============================================================================

export function useActivitySummary(days = 30) {
  const [state, setState] = useState<DataState<any>>({
    data: null,
    loading: true,
    error: null,
    source: 'mock',
  })

  const fetchSummary = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }))

    try {
      const result = await p1Api.getActivitySummary(days)
      if (result?.success && result.data) {
        setState({ data: result.data, loading: false, error: null, source: 'live' })
        return
      }
    } catch (err) {
      console.warn('[FORGE] Activity summary backend unavailable:', err)
    }

    const mock = getMockSummary()
    setState({ data: mock, loading: false, error: null, source: 'mock' })
  }, [days])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return { ...state, refresh: fetchSummary }
}

// =============================================================================
// ACTION: Log activity (creates CIE feedback loop signal)
// =============================================================================

export async function logForgeActivity(params: {
  userId: string
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, any>
}) {
  try {
    return await p1Api.logForgeActivity(params)
  } catch (err) {
    console.warn('[FORGE] Failed to log activity:', err)
    return null
  }
}

// =============================================================================
// ACTION: Acknowledge / Dismiss / Act on alert
// =============================================================================

export async function acknowledgeAlert(alertId: string) {
  try {
    return await p1Api.acknowledgeAlert(alertId)
  } catch (err) {
    console.warn('[FORGE] Failed to acknowledge alert:', err)
    return null
  }
}

export async function dismissAlert(alertId: string) {
  try {
    return await p1Api.dismissAlert(alertId)
  } catch (err) {
    console.warn('[FORGE] Failed to dismiss alert:', err)
    return null
  }
}

// =============================================================================
// ACTION: Generate recommendations (triggers AI)
// =============================================================================

export async function generateRecommendations(clientId: string, reportId?: string) {
  try {
    return await p1Api.generateRecommendations(clientId, reportId)
  } catch (err) {
    console.warn('[FORGE] Failed to generate recommendations:', err)
    return null
  }
}

// =============================================================================
// ACTION: Generate report (triggers AI)
// =============================================================================

export async function generateForgeReport(params: {
  clientId: string
  type: string
  propertyId?: string
  period?: string
}) {
  try {
    return await p1Api.generateForgeReport(params)
  } catch (err) {
    console.warn('[FORGE] Failed to generate report:', err)
    return null
  }
}

// =============================================================================
// ACTION: Present recommendation / Record outcome
// =============================================================================

export async function presentRecommendation(recId: string, via?: string) {
  try {
    return await p1Api.presentRecommendation(recId, via)
  } catch (err) {
    console.warn('[FORGE] Failed to present recommendation:', err)
    return null
  }
}

export async function recordRecommendationOutcome(
  recId: string,
  outcome: string,
  details?: { clientResponse?: string; outcomeValue?: number; outcomeNotes?: string },
) {
  try {
    return await p1Api.recordRecommendationOutcome(recId, outcome, details)
  } catch (err) {
    console.warn('[FORGE] Failed to record outcome:', err)
    return null
  }
}
