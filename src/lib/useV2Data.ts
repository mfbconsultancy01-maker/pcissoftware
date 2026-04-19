// ============================================================================
// PCIS V2 Engine — Live Data Hooks
// ============================================================================
// React hooks that connect the Dashboard V2.1 to the FORGE V2, SCOUT V2,
// ENGINE V2, and CIE V2 backend endpoints via the Next.js proxy.
//
// Data flow:
//   Railway Backend (engine-v2/*) → /api/p1/engine-v2/* proxy → These Hooks → Dashboard
//
// All hooks follow the same DataState<T> pattern as existing hooks.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

type DataSource = 'live' | 'fallback'

interface DataState<T> {
  data: T | null
  loading: boolean
  error: string | null
  source: DataSource
}

// ── Morning Brief ──
export interface V2MorningBrief {
  id: string
  brokerId: string
  briefDate: string
  sections: {
    meetings: V2BriefMeeting[]
    clientAlerts: V2BriefAlert[]
    opportunities: V2BriefOpportunity[]
    followUps: V2BriefFollowUp[]
    pipelineHealth: V2BriefPipeline
  }
  generatedAt: string
  viewedAt: string | null
}

export interface V2BriefMeeting {
  clientId: string
  clientName: string
  scheduledAt: string
  type: string
  prepNotes: string
}

export interface V2BriefAlert {
  clientId: string
  clientName: string
  alertType: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  daysSinceContact?: number
}

export interface V2BriefOpportunity {
  clientId: string
  clientName: string
  type: string
  description: string
  estimatedValue?: number
  score?: number
}

export interface V2BriefFollowUp {
  clientId: string
  clientName: string
  reason: string
  priority: 'high' | 'medium' | 'low'
  dueDate?: string
}

export interface V2BriefPipeline {
  totalActive: number
  newLeads: number
  stageMovements: number
  atRiskDeals: number
  estimatedRevenue: number
}

// ── Proactive Triggers ──
export interface V2ProactiveTrigger {
  id: string
  triggerType: 'meeting_proximity' | 'engagement_drift' | 'portfolio_opportunity' | 'follow_up_needed'
  clientId: string
  clientName?: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  suggestedAction: string
  metadata: Record<string, any>
  status: 'active' | 'surfaced' | 'acted' | 'dismissed' | 'expired'
  createdAt: string
  expiresAt?: string
}

// ── Opportunity Queue ──
export interface V2OpportunityItem {
  id: string
  source: 'trigger' | 'insight'
  sourceId: string
  type: string
  title: string
  description: string
  clientId?: string
  clientName?: string
  score: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  suggestedAction: string
  createdAt: string
  status: string
}

export interface V2QueueStats {
  total: number
  bySeverity: Record<string, number>
  byType: Record<string, number>
  actedToday: number
  avgScore: number
}

// ── Enterprise Dashboard ──
export interface V2DashboardPayload {
  health: V2HealthScore
  leaderboard: V2LeaderboardEntry[]
  roi: V2ROIData
  utilization: V2UtilizationData
}

export interface V2HealthScore {
  overall: number
  components: {
    outputQuality: number
    actionRate: number
    clientCoverage: number
    proactiveRate: number
    improvementTrend: number
  }
  trend: 'improving' | 'stable' | 'declining'
}

export interface V2LeaderboardEntry {
  brokerId: string
  brokerName: string
  actionRate: number
  qualityScore: number
  outputVolume: number
  clientsServiced: number
  rank: number
}

export interface V2ROIData {
  estimatedCommissionValue: number
  timeSavedHours: number
  outputsGenerated: number
  conversionsInfluenced: number
  roiMultiplier: number
  costPerMonth: number
}

export interface V2UtilizationData {
  activeBrokers: number
  totalBrokers: number
  dailyAvgOutputs: number
  weeklyTrend: number[]
  topFeatures: { feature: string; count: number }[]
  peakHour: number
  lowUsageBrokers: string[]
}

// ── Broker Intelligence ──
export interface V2BrokerIntelligence {
  brokerId: string
  workflowPatterns: {
    peakHours: number[]
    dayDistribution: Record<string, number>
    avgSessionMinutes: number
    preferredOutputTypes: string[]
  }
  clientPortfolio: {
    totalClients: number
    neglectedClients: { clientId: string; clientName: string; daysSinceContact: number }[]
    tierDistribution: Record<string, number>
  }
  benchmarks: {
    actionRate: number
    orgAvgActionRate: number
    qualityScore: number
    orgAvgQuality: number
    rank: number
    totalBrokers: number
  }
  suggestions: string[]
  computedAt: string
}

// ── Weekly Report ──
export interface V2WeeklyReport {
  id: string
  weekStart: string
  weekEnd: string
  executiveSummary: string
  sections: {
    forgePerformance: any
    clientIntel: any
    pipeline: any
    proactive: any
    qualityGaps: any
  }
  totalMetrics: Record<string, number>
  generatedAt: string
}

// ── Quality Analytics ──
export interface V2QualityGap {
  dimension: string
  currentScore: number
  bestInClass: number
  gap: number
  recommendation: string
}

export interface V2QualityHistory {
  date: string
  overall: number
  byType: Record<string, number>
}

// ── FORGE Metrics ──
export interface V2ForgeMetrics {
  totalInteractions: number
  avgQualityScore: number
  actionRate: number
  topOutputTypes: { type: string; count: number; avgQuality: number }[]
  recentOutputs: {
    id: string
    outputType: string
    clientId: string
    clientName?: string
    qualityScore: number
    actionTaken: boolean
    createdAt: string
  }[]
}

// ── Conversion Metrics ──
export interface V2ConversionMetrics {
  overallRate: number
  byStage: Record<string, { count: number; converted: number; rate: number }>
  trend: number[]
  topConverters: { clientId: string; clientName: string; score: number }[]
}

// ── Portfolio Health ──
export interface V2PortfolioHealth {
  totalClients: number
  healthScore: number
  saturationLevel: number
  tierDistribution: Record<string, number>
  engagementDistribution: Record<string, number>
  atRiskCount: number
}

// ── Proactive Stats ──
export interface V2ProactiveStats {
  totalActive: number
  bySeverity: Record<string, number>
  byType: Record<string, number>
  resolvedToday: number
  avgResponseTime: number
}

// ============================================================================
// BASE FETCHER
// ============================================================================

const V2_PROXY = '/api/p1/engine-v2'

async function v2Fetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${V2_PROXY}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    })
    if (!res.ok) {
      console.error(`[V2] ${res.status} ${res.statusText} for ${path}`)
      return null
    }
    const json = await res.json()
    return json?.success !== false ? (json?.data ?? json) : null
  } catch (err) {
    console.error(`[V2] Fetch error for ${path}:`, err)
    return null
  }
}

// ============================================================================
// HOOKS
// ============================================================================

// ── Morning Brief ──────────────────────────────────────────────────────────

export function useV2MorningBrief(brokerId?: string): DataState<V2MorningBrief> & { refresh: () => void } {
  const [state, setState] = useState<DataState<V2MorningBrief>>({
    data: null, loading: true, error: null, source: 'live',
  })

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))
    const qs = brokerId ? `?brokerId=${brokerId}` : ''
    const data = await v2Fetch<V2MorningBrief>(`/forge/morning-brief/today${qs}`)
    setState({
      data: data || null,
      loading: false,
      error: data ? null : 'Morning brief not available',
      source: data ? 'live' : 'fallback',
    })
  }, [brokerId])

  useEffect(() => { fetch() }, [fetch])
  return { ...state, refresh: fetch }
}

// ── Proactive Triggers ─────────────────────────────────────────────────────

export function useV2ProactiveTriggers(params?: {
  status?: string; type?: string; severity?: string; limit?: number
}): DataState<V2ProactiveTrigger[]> & { refresh: () => void } {
  const [state, setState] = useState<DataState<V2ProactiveTrigger[]>>({
    data: null, loading: true, error: null, source: 'live',
  })

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.type) qs.set('type', params.type)
    if (params?.severity) qs.set('severity', params.severity)
    if (params?.limit) qs.set('limit', String(params.limit))
    const query = qs.toString() ? `?${qs.toString()}` : ''
    const data = await v2Fetch<V2ProactiveTrigger[]>(`/forge/proactive/triggers${query}`)
    setState({
      data: data || [],
      loading: false,
      error: null,
      source: data ? 'live' : 'fallback',
    })
  }, [params?.status, params?.type, params?.severity, params?.limit])

  useEffect(() => { fetch() }, [fetch])
  return { ...state, refresh: fetch }
}

// ── Proactive Stats ────────────────────────────────────────────────────────

export function useV2ProactiveStats(): DataState<V2ProactiveStats> & { refresh: () => void } {
  const [state, setState] = useState<DataState<V2ProactiveStats>>({
    data: null, loading: true, error: null, source: 'live',
  })

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))
    const data = await v2Fetch<V2ProactiveStats>('/forge/proactive/stats')
    setState({
      data: data || null,
      loading: false,
      error: data ? null : 'Stats unavailable',
      source: data ? 'live' : 'fallback',
    })
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { ...state, refresh: fetch }
}

// ── Opportunity Queue ──────────────────────────────────────────────────────

export function useV2OpportunityQueue(params?: {
  limit?: number; severity?: string
}): DataState<V2OpportunityItem[]> & { refresh: () => void; act: (id: string, action: string) => Promise<void> } {
  const [state, setState] = useState<DataState<V2OpportunityItem[]>>({
    data: null, loading: true, error: null, source: 'live',
  })

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.severity) qs.set('severity', params.severity)
    const query = qs.toString() ? `?${qs.toString()}` : ''
    const data = await v2Fetch<V2OpportunityItem[]>(`/forge/opportunity-queue${query}`)
    setState({
      data: data || [],
      loading: false,
      error: null,
      source: data ? 'live' : 'fallback',
    })
  }, [params?.limit, params?.severity])

  const act = useCallback(async (id: string, action: string) => {
    await v2Fetch(`/forge/opportunity-queue/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    })
    fetch() // refresh after action
  }, [fetch])

  useEffect(() => { fetch() }, [fetch])
  return { ...state, refresh: fetch, act }
}

// ── Queue Stats ────────────────────────────────────────────────────────────

export function useV2QueueStats(): DataState<V2QueueStats> {
  const [state, setState] = useState<DataState<V2QueueStats>>({
    data: null, loading: true, error: null, source: 'live',
  })

  useEffect(() => {
    v2Fetch<V2QueueStats>('/forge/opportunity-queue/stats').then(data => {
      setState({
        data: data || null,
        loading: false,
        error: data ? null : 'Stats unavailable',
        source: data ? 'live' : 'fallback',
      })
    })
  }, [])

  return state
}

// ── Enterprise Dashboard ───────────────────────────────────────────────────

export function useV2Dashboard(): DataState<V2DashboardPayload> & { refresh: () => void } {
  const [state, setState] = useState<DataState<V2DashboardPayload>>({
    data: null, loading: true, error: null, source: 'live',
  })

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))
    const data = await v2Fetch<V2DashboardPayload>('/forge/dashboard')
    setState({
      data: data || null,
      loading: false,
      error: data ? null : 'Dashboard data unavailable',
      source: data ? 'live' : 'fallback',
    })
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { ...state, refresh: fetch }
}

// ── FORGE Health Score ─────────────────────────────────────────────────────

export function useV2HealthScore(): DataState<V2HealthScore> {
  const [state, setState] = useState<DataState<V2HealthScore>>({
    data: null, loading: true, error: null, source: 'live',
  })

  useEffect(() => {
    v2Fetch<V2HealthScore>('/forge/dashboard/health').then(data => {
      setState({
        data: data || null,
        loading: false,
        error: data ? null : 'Health score unavailable',
        source: data ? 'live' : 'fallback',
      })
    })
  }, [])

  return state
}

// ── Broker Intelligence ────────────────────────────────────────────────────

export function useV2BrokerIntelligence(brokerId?: string): DataState<V2BrokerIntelligence> & { refresh: () => void } {
  const [state, setState] = useState<DataState<V2BrokerIntelligence>>({
    data: null, loading: true, error: null, source: 'live',
  })

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))
    const qs = brokerId ? `?brokerId=${brokerId}` : ''
    const data = await v2Fetch<V2BrokerIntelligence>(`/forge/broker-intelligence${qs}`)
    setState({
      data: data || null,
      loading: false,
      error: data ? null : 'Broker intelligence unavailable',
      source: data ? 'live' : 'fallback',
    })
  }, [brokerId])

  useEffect(() => { fetch() }, [fetch])
  return { ...state, refresh: fetch }
}

// ── Weekly Report ──────────────────────────────────────────────────────────

export function useV2WeeklyReport(): DataState<V2WeeklyReport> & { refresh: () => void } {
  const [state, setState] = useState<DataState<V2WeeklyReport>>({
    data: null, loading: true, error: null, source: 'live',
  })

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))
    const data = await v2Fetch<V2WeeklyReport>('/forge/weekly-report/latest')
    setState({
      data: data || null,
      loading: false,
      error: data ? null : 'Weekly report not available',
      source: data ? 'live' : 'fallback',
    })
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { ...state, refresh: fetch }
}

// ── Quality Gaps ───────────────────────────────────────────────────────────

export function useV2QualityGaps(): DataState<V2QualityGap[]> {
  const [state, setState] = useState<DataState<V2QualityGap[]>>({
    data: null, loading: true, error: null, source: 'live',
  })

  useEffect(() => {
    v2Fetch<V2QualityGap[]>('/forge/quality/gaps').then(data => {
      setState({
        data: data || [],
        loading: false,
        error: null,
        source: data ? 'live' : 'fallback',
      })
    })
  }, [])

  return state
}

// ── Quality History ────────────────────────────────────────────────────────

export function useV2QualityHistory(periodType?: string): DataState<V2QualityHistory[]> {
  const [state, setState] = useState<DataState<V2QualityHistory[]>>({
    data: null, loading: true, error: null, source: 'live',
  })

  useEffect(() => {
    const qs = periodType ? `?periodType=${periodType}` : ''
    v2Fetch<V2QualityHistory[]>(`/forge/quality/history${qs}`).then(data => {
      setState({
        data: data || [],
        loading: false,
        error: null,
        source: data ? 'live' : 'fallback',
      })
    })
  }, [periodType])

  return state
}

// ── FORGE Metrics ──────────────────────────────────────────────────────────

export function useV2ForgeMetrics(): DataState<V2ForgeMetrics> & { refresh: () => void } {
  const [state, setState] = useState<DataState<V2ForgeMetrics>>({
    data: null, loading: true, error: null, source: 'live',
  })

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))
    const data = await v2Fetch<V2ForgeMetrics>('/forge/metrics')
    setState({
      data: data || null,
      loading: false,
      error: data ? null : 'Metrics unavailable',
      source: data ? 'live' : 'fallback',
    })
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { ...state, refresh: fetch }
}

// ── Conversion Metrics ─────────────────────────────────────────────────────

export function useV2ConversionMetrics(): DataState<V2ConversionMetrics> {
  const [state, setState] = useState<DataState<V2ConversionMetrics>>({
    data: null, loading: true, error: null, source: 'live',
  })

  useEffect(() => {
    v2Fetch<V2ConversionMetrics>('/conversion/metrics').then(data => {
      setState({
        data: data || null,
        loading: false,
        error: data ? null : 'Conversion data unavailable',
        source: data ? 'live' : 'fallback',
      })
    })
  }, [])

  return state
}

// ── Portfolio Health ───────────────────────────────────────────────────────

export function useV2PortfolioHealth(): DataState<V2PortfolioHealth> {
  const [state, setState] = useState<DataState<V2PortfolioHealth>>({
    data: null, loading: true, error: null, source: 'live',
  })

  useEffect(() => {
    v2Fetch<V2PortfolioHealth>('/portfolio/health').then(data => {
      setState({
        data: data || null,
        loading: false,
        error: data ? null : 'Portfolio data unavailable',
        source: data ? 'live' : 'fallback',
      })
    })
  }, [])

  return state
}

// ── Leaderboard ────────────────────────────────────────────────────────────

export function useV2Leaderboard(): DataState<V2LeaderboardEntry[]> {
  const [state, setState] = useState<DataState<V2LeaderboardEntry[]>>({
    data: null, loading: true, error: null, source: 'live',
  })

  useEffect(() => {
    v2Fetch<V2LeaderboardEntry[]>('/forge/dashboard/leaderboard').then(data => {
      setState({
        data: data || [],
        loading: false,
        error: null,
        source: data ? 'live' : 'fallback',
      })
    })
  }, [])

  return state
}

// ── ROI Calculator ─────────────────────────────────────────────────────────

export function useV2ROI(): DataState<V2ROIData> {
  const [state, setState] = useState<DataState<V2ROIData>>({
    data: null, loading: true, error: null, source: 'live',
  })

  useEffect(() => {
    v2Fetch<V2ROIData>('/forge/dashboard/roi').then(data => {
      setState({
        data: data || null,
        loading: false,
        error: data ? null : 'ROI data unavailable',
        source: data ? 'live' : 'fallback',
      })
    })
  }, [])

  return state
}

// ── System Utilization ─────────────────────────────────────────────────────

export function useV2Utilization(): DataState<V2UtilizationData> {
  const [state, setState] = useState<DataState<V2UtilizationData>>({
    data: null, loading: true, error: null, source: 'live',
  })

  useEffect(() => {
    v2Fetch<V2UtilizationData>('/forge/dashboard/utilization').then(data => {
      setState({
        data: data || null,
        loading: false,
        error: data ? null : 'Utilization data unavailable',
        source: data ? 'live' : 'fallback',
      })
    })
  }, [])

  return state
}

// ── Style Matrix ───────────────────────────────────────────────────────────

export function useV2StyleMatrix(): DataState<any> {
  const [state, setState] = useState<DataState<any>>({
    data: null, loading: true, error: null, source: 'live',
  })

  useEffect(() => {
    v2Fetch<any>('/forge/style-matrix').then(data => {
      setState({
        data: data || null,
        loading: false,
        error: data ? null : 'Style matrix unavailable',
        source: data ? 'live' : 'fallback',
      })
    })
  }, [])

  return state
}

// ── Calibration Summary ────────────────────────────────────────────────────

export function useV2CalibrationSummary(): DataState<any> {
  const [state, setState] = useState<DataState<any>>({
    data: null, loading: true, error: null, source: 'live',
  })

  useEffect(() => {
    v2Fetch<any>('/forge/calibration/summary').then(data => {
      setState({
        data: data || null,
        loading: false,
        error: data ? null : 'Calibration data unavailable',
        source: data ? 'live' : 'fallback',
      })
    })
  }, [])

  return state
}

// ============================================================================
// ACTION HELPERS
// ============================================================================

export async function v2ActOnTrigger(triggerId: string, status: string): Promise<boolean> {
  const result = await v2Fetch(`/forge/proactive/trigger/${triggerId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
  return result !== null
}

export async function v2MarkBriefViewed(briefId: string): Promise<boolean> {
  const result = await v2Fetch(`/forge/morning-brief/${briefId}/viewed`, {
    method: 'POST',
  })
  return result !== null
}

export async function v2RunProactiveScan(): Promise<boolean> {
  const result = await v2Fetch('/forge/proactive/scan', { method: 'POST' })
  return result !== null
}

export async function v2GenerateMorningBrief(): Promise<boolean> {
  const result = await v2Fetch('/forge/morning-brief/generate', { method: 'POST' })
  return result !== null
}

export async function v2GenerateWeeklyReport(): Promise<boolean> {
  const result = await v2Fetch('/forge/weekly-report/generate', { method: 'POST' })
  return result !== null
}

export async function v2ComputeBrokerIntelligence(): Promise<boolean> {
  const result = await v2Fetch('/forge/broker-intelligence/compute', { method: 'POST' })
  return result !== null
}

export async function v2GenerateQualitySnapshot(periodType: string = 'weekly'): Promise<boolean> {
  const result = await v2Fetch('/forge/quality/snapshot', {
    method: 'POST',
    body: JSON.stringify({ periodType }),
  })
  return result !== null
}

export async function v2SynthesizeClientJourney(clientId: string): Promise<any> {
  return v2Fetch('/forge/synthesis/client-journey', {
    method: 'POST',
    body: JSON.stringify({ clientId }),
  })
}

export async function v2SynthesizePortfolioRisk(): Promise<any> {
  return v2Fetch('/forge/synthesis/portfolio-risk', { method: 'POST' })
}

export async function v2RunFullSynthesis(): Promise<any> {
  return v2Fetch('/forge/synthesis/full', { method: 'POST' })
}
