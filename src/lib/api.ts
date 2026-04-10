const API_BASE = 'https://pciscom-production.up.railway.app'
const TENANT_ID = 'tenant-001'

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    console.error(`API error: ${res.status} ${res.statusText} for ${path}`)
    return null
  }
  const data = await res.json()
  return data
}

export const api = {

  // ============================================================
  // READ ENDPOINTS
  // ============================================================

  getStatsToday: async () => {
    const data = await request(`/api/${TENANT_ID}/stats/today`)
    return data?.today || {
      messagesReceived: 0, messagesSent: 0, autoResponses: 0,
      manualResponses: 0, escalatedCount: 0, newContacts: 0,
      hotLeads: 0, vipMessages: 0
    }
  },

  getStatsCounts: async () => {
    const data = await request(`/api/${TENANT_ID}/stats/today`)
    return data?.counts || { needsAttention: 0, totalContacts: 0 }
  },

  getStats: async () => {
    const data = await request(`/api/${TENANT_ID}/stats`)
    return data?.totals || {}
  },

  getStatsDaily: async () => {
    const data = await request(`/api/${TENANT_ID}/stats`)
    return data?.daily || []
  },

  getConversations: async () => {
    const data = await request(`/api/${TENANT_ID}/conversations`)
    return data?.conversations || []
  },

  getEscalatedConversations: async () => {
    const data = await request(`/api/${TENANT_ID}/conversations/needs-attention`)
    return data?.conversations || []
  },

  getConversationMessages: async (id: string) => {
    const data = await request(`/api/${TENANT_ID}/conversations/${id}`)
    const msgs = data?.conversation?.messages || []
    return msgs.reverse()
  },

  getConversation: async (id: string) => {
    const data = await request(`/api/${TENANT_ID}/conversations/${id}`)
    return data?.conversation || null
  },

  getContacts: async () => {
    const data = await request(`/api/${TENANT_ID}/contacts`)
    return data?.contacts || []
  },

  getContact: async (id: string) => {
    const data = await request(`/api/${TENANT_ID}/contacts/${id}`)
    return data?.contact || null
  },

  getNotifications: async () => {
    const data = await request(`/api/${TENANT_ID}/notifications`)
    return data?.notifications || []
  },

  getNotificationCount: async () => {
    const data = await request(`/api/${TENANT_ID}/notifications`)
    return data?.unreadCount || 0
  },

  getOnboardingStatus: async () => {
    const data = await request(`/api/${TENANT_ID}/persona`)
    const settings = data?.settings || []

    const settingsMap: Record<string, string> = {}
    for (const s of settings) {
      settingsMap[s.settingKey] = s.settingValue
    }

    const hasProfile = !!(settingsMap['broker_name'] || settingsMap['broker_prompt_summary'])
    const brokerName = settingsMap['broker_name'] || ''

    let conversationsUploaded = 0
    if (settingsMap['broker_prompt_summary']) {
      conversationsUploaded = settingsMap['conversations_uploaded']
        ? parseInt(settingsMap['conversations_uploaded'])
        : 10
    }

    return {
      hasProfile,
      brokerName,
      conversationsUploaded,
      settings: settingsMap
    }
  },

  getProperties: async () => {
    const data = await request(`/api/${TENANT_ID}/properties`)
    return data?.properties || []
  },

  getBrokerProfile: async () => {
    const data = await request(`/api/${TENANT_ID}/broker-profile`)
    return data?.profile || {}
  },

  getToneSettings: async () => {
    const data = await request(`/api/${TENANT_ID}/tone-settings`)
    return data?.tone || {}
  },

  getPersonaSettings: async () => {
    const data = await request(`/api/${TENANT_ID}/persona`)
    return data?.settings || []
  },

  // ============================================================
  // WRITE ENDPOINTS
  // ============================================================

  addProperty: async (property: any) => {
    const data = await request(`/api/${TENANT_ID}/properties`, {
      method: 'POST',
      body: JSON.stringify(property),
    })
    return data
  },

  deleteProperty: async (propertyId: string) => {
    const data = await request(`/api/${TENANT_ID}/properties/${propertyId}`, {
      method: 'DELETE',
    })
    return data
  },

  updateBrokerProfile: async (profile: any) => {
    const data = await request(`/api/${TENANT_ID}/broker-profile`, {
      method: 'PATCH',
      body: JSON.stringify(profile),
    })
    return data
  },

  updateToneSettings: async (tone: any) => {
    const data = await request(`/api/${TENANT_ID}/tone-settings`, {
      method: 'PATCH',
      body: JSON.stringify(tone),
    })
    return data
  },

  updatePersonaSetting: async (settingKey: string, settingValue: string) => {
    const data = await request(`/api/${TENANT_ID}/persona`, {
      method: 'PATCH',
      body: JSON.stringify({ settingKey, settingValue }),
    })
    return data
  },

  updateContact: async (contactId: string, updates: any) => {
    const data = await request(`/api/${TENANT_ID}/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    return data
  },

  sendMessage: async (conversationId: string, content: string) => {
    const data = await request(`/api/${TENANT_ID}/conversations/${conversationId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    })
    return data
  },

  resolveConversation: async (conversationId: string) => {
    const data = await request(`/api/${TENANT_ID}/conversations/${conversationId}/resolve`, {
      method: 'POST',
    })
    return data
  },

  submitCorrection: async (messageId: string, correctedText: string, feedback?: string) => {
    const data = await request(`/api/${TENANT_ID}/corrections`, {
      method: 'POST',
      body: JSON.stringify({ messageId, correctedText, feedback }),
    })
    return data
  },

  submitFeedback: async (feedback: string) => {
    const data = await request(`/api/${TENANT_ID}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    })
    return data
  },

  // ============================================================
  // REPORTS
  // ============================================================

  getReports: async () => {
    const data = await request(`/api/${TENANT_ID}/reports/daily/list`)
    return data?.reports || []
  },

  generateReport: async () => {
    const data = await request(`/api/${TENANT_ID}/reports/daily`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    return data
  },

  downloadReport: (date: string, type: 'xlsx' | 'pdf') => {
    const url = `${API_BASE}/api/${TENANT_ID}/reports/daily/download/${type}?date=${date}`
    window.open(url, '_blank')
  },
}

export const pciscomAPI = api

// =============================================================================
// PCISP1 API — SCOUT + ENGINE Backend
// =============================================================================
// All calls go through our Next.js proxy (/api/p1/...) which adds Clerk auth
// and injects the service API key server-side. The browser never sees the
// Railway URL or API key.
// =============================================================================

// Proxy strips '/api/' prefix — paths like '/api/opportunities' become '/api/p1/opportunities'
const P1_PROXY_BASE = '/api/p1'

async function p1Request(path: string, options?: RequestInit) {
  // path comes in as '/api/opportunities?...' — strip the '/api/' prefix for the proxy
  const proxyPath = path.startsWith('/api/') ? path.replace('/api/', '') : path.replace(/^\//, '')

  try {
    const res = await fetch(`${P1_PROXY_BASE}/${proxyPath}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    })
    if (!res.ok) {
      console.error(`P1 API error: ${res.status} ${res.statusText} for ${path}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.error(`P1 API fetch error for ${path}:`, err)
    return null
  }
}

export const p1Api = {
  // ── SCOUT: Opportunities ────────────────────────────────────────────────
  getOpportunities: async (params?: { minScore?: number; area?: string; type?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.minScore) query.set('minScore', String(params.minScore))
    if (params?.area) query.set('area', params.area)
    if (params?.type) query.set('type', params.type)
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await p1Request(`/api/opportunities${qs}`)
    return data
  },

  getOpportunityDetail: async (propertyId: string) => {
    const data = await p1Request(`/api/opportunities/${propertyId}`)
    return data
  },

  // ── SCOUT: Areas ────────────────────────────────────────────────────────
  getAreaMetrics: async () => {
    const data = await p1Request('/api/areas/metrics')
    return data
  },

  getAreaTrends: async (area: string) => {
    const data = await p1Request(`/api/areas/trends/${encodeURIComponent(area)}`)
    return data
  },

  // ── SCOUT: Scraping ─────────────────────────────────────────────────────
  getScrapeSources: async () => {
    const data = await p1Request('/api/scraping/sources')
    return data
  },

  getScrapeRuns: async () => {
    const data = await p1Request('/api/scraping/runs')
    return data
  },

  triggerScrape: async (source?: string) => {
    const data = await p1Request('/api/scraping/run-now', {
      method: 'POST',
      body: JSON.stringify({ source }),
    })
    return data
  },

  // ── SCOUT Agent: Market Intelligence AI ─────────────────────────────────
  chatWithSCOUTAgent: async (message: string, history: { role: 'user' | 'assistant'; content: string }[] = []) => {
    const data = await p1Request('/api/scout-agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    })
    return data
  },

  getSCOUTAgentStatus: async () => {
    const data = await p1Request('/api/scout-agent/status')
    return data
  },

  getSCOUTMorningBrief: async () => {
    const data = await p1Request('/api/scout-agent/morning-brief')
    return data
  },

  getSCOUTAnomalies: async () => {
    const data = await p1Request('/api/scout-agent/anomalies')
    return data
  },

  getSCOUTAreaIntel: async (area: string) => {
    const data = await p1Request(`/api/scout-agent/area/${encodeURIComponent(area)}`)
    return data
  },

  getSCOUTMacroContext: async () => {
    const data = await p1Request('/api/scout-agent/macro-context')
    return data
  },

  triggerSCOUTEnrichment: async () => {
    const data = await p1Request('/api/scout-agent/enrich', { method: 'POST' })
    return data
  },

  // ── ENGINE: Matching ────────────────────────────────────────────────────
  getMatches: async (params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await p1Request(`/api/matches${qs}`)
    return data
  },

  getMatchDetail: async (matchId: string) => {
    const data = await p1Request(`/api/matches/${matchId}`)
    return data
  },

  updateMatchStatus: async (matchId: string, status: string) => {
    const data = await p1Request(`/api/matches/${matchId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    return data
  },

  runEngine: async () => {
    const data = await p1Request('/api/engine/run', { method: 'POST' })
    return data
  },

  getEngineStatus: async () => {
    const data = await p1Request('/api/engine/status')
    return data
  },

  matchClient: async (clientId: string) => {
    const data = await p1Request(`/api/engine/match-client/${clientId}`, { method: 'POST' })
    return data
  },

  // ── Intel Dashboard ─────────────────────────────────────────────────────
  getIntelDashboard: async () => {
    const data = await p1Request('/api/intel/dashboard')
    return data
  },

  // ── SCOUT: Macro Snapshot ──────────────────────────────────────────────
  getMacroSnapshot: async () => {
    const data = await p1Request('/api/scout-data/macro')
    return data
  },

  // ── Clients ─────────────────────────────────────────────────────────────
  getClients: async (params?: { status?: string; tier?: string }) => {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.tier) query.set('tier', params.tier)
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await p1Request(`/api/clients${qs}`)
    return data
  },

  // ── Signals ─────────────────────────────────────────────────────────────
  getSignals: async (params?: { clientId?: string; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.clientId) query.set('clientId', params.clientId)
    if (params?.limit) query.set('limit', String(params.limit))
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await p1Request(`/api/signals${qs}`)
    return data
  },

  // ── Engagement (batch) ─────────────────────────────────────────────────
  getEngagementAll: async () => {
    const data = await p1Request('/api/clients/engagement-all')
    return data
  },

  // ── Predictions (batch) ────────────────────────────────────────────────
  getPredictionsAll: async () => {
    const data = await p1Request('/api/clients/predictions-all')
    return data
  },

  // ── Properties ──────────────────────────────────────────────────────────
  getProperties: async (params?: { area?: string; type?: string; page?: number }) => {
    const query = new URLSearchParams()
    if (params?.area) query.set('area', params.area)
    if (params?.type) query.set('type', params.type)
    if (params?.page) query.set('page', String(params.page))
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await p1Request(`/api/properties${qs}`)
    return data
  },

  // ── Properties (paginated fetch for SCOUT) ──────────────────────────────
  getPropertiesForScout: async (params?: {
    area?: string; type?: string; city?: string;
    minPrice?: number; maxPrice?: number; bedrooms?: number;
    page?: number; limit?: number;
  }) => {
    const query = new URLSearchParams()
    if (params?.area) query.set('area', params.area)
    if (params?.type) query.set('type', params.type)
    if (params?.city) query.set('city', params.city)
    if (params?.minPrice) query.set('minPrice', String(params.minPrice))
    if (params?.maxPrice) query.set('maxPrice', String(params.maxPrice))
    if (params?.bedrooms) query.set('bedrooms', String(params.bedrooms))
    query.set('page', String(params?.page || 1))
    query.set('limit', String(params?.limit || 100))
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await p1Request(`/api/properties${qs}`)
    return data
  },

  // ── CIE Agent: Client Intelligence Engine ─────────────────────────────

  // Trigger full CIE agent run (all clients)
  runCIEAgent: async () => {
    const data = await p1Request('/api/cie-agent/run', { method: 'POST' })
    return data
  },

  // Trigger CIE agent for single client
  runCIEAgentForClient: async (clientId: string) => {
    const data = await p1Request(`/api/cie-agent/run/${clientId}`, { method: 'POST' })
    return data
  },

  // Agent status (last run, profile counts, Copper sync status)
  getCIEAgentStatus: async () => {
    const data = await p1Request('/api/cie-agent/status')
    return data
  },

  // Client narrative -- the rich Claude-generated profile briefing
  getClientNarrative: async (clientId: string) => {
    const data = await p1Request(`/api/cie-agent/narrative/${clientId}`)
    return data
  },

  // Morning briefing -- Claude-generated overnight summary
  getMorningBriefing: async () => {
    const data = await p1Request('/api/cie-agent/morning-briefing')
    return data
  },

  // CIE Agent chat -- conversational dialogue with the CIE Agent
  chatWithCIEAgent: async (message: string, history: { role: 'user' | 'assistant'; content: string }[] = [], sessionId?: string) => {
    const data = await p1Request('/api/cie-agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history, sessionId }),
    })
    return data
  },

  // Recent profile changes (archetype shifts, dimension movements)
  getCIEChanges: async (days = 1) => {
    const data = await p1Request(`/api/cie-agent/changes?days=${days}`)
    return data
  },

  // At-risk clients ranked by risk score
  getAtRiskClients: async () => {
    const data = await p1Request('/api/cie-agent/at-risk')
    return data
  },

  // Flags for other engines (filter by: ENGINE, SCOUT, FORGE)
  getCIEFlags: async (params?: { engine?: string; days?: number }) => {
    const query = new URLSearchParams()
    if (params?.engine) query.set('engine', params.engine)
    if (params?.days) query.set('days', String(params.days))
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await p1Request(`/api/cie-agent/flags${qs}`)
    return data
  },

  // ── CIE Cognitive Profiling (Claude-powered holistic analysis) ──────────

  // Profile a single client (on-demand trigger)
  profileClient: async (clientId: string) => {
    const data = await p1Request(`/api/cie-agent/profile/${clientId}`, { method: 'POST' })
    return data
  },

  // Profile multiple clients (batch, max 20)
  profileClientBatch: async (clientIds: string[]) => {
    const data = await p1Request('/api/cie-agent/profile-batch', {
      method: 'POST',
      body: JSON.stringify({ clientIds }),
    })
    return data
  },

  // Profile all INVESTOR-classified clients
  profileAllInvestors: async () => {
    const data = await p1Request('/api/cie-agent/profile-all-investors', { method: 'POST' })
    return data
  },

  // Get stored CIE insights for a client (evidence trails, macro influence, advisor implications)
  getCIEInsights: async (clientId: string) => {
    const data = await p1Request(`/api/cie-agent/profile/${clientId}`)
    return data
  },

  // Copper CRM sync
  syncCopper: async () => {
    const data = await p1Request('/api/cie-agent/copper/sync', { method: 'POST' })
    return data
  },

  syncCopperContacts: async () => {
    const data = await p1Request('/api/cie-agent/copper/sync-contacts', { method: 'POST' })
    return data
  },

  testCopperConnection: async () => {
    const data = await p1Request('/api/cie-agent/copper/test')
    return data
  },

  // Client cognitive profile (raw from database)
  getClientProfile: async (clientId: string) => {
    const data = await p1Request(`/api/clients/${clientId}/profile`)
    return data
  },

  // Client signal timeline
  getClientTimeline: async (clientId: string, limit = 50) => {
    const data = await p1Request(`/api/clients/${clientId}/timeline?limit=${limit}`)
    return data
  },

  // Client detail with full profile
  getClientDetail: async (clientId: string) => {
    const data = await p1Request(`/api/clients/${clientId}`)
    return data
  },

  // ── FORGE: Advisor Output Engine ────────────────────────────────────────

  // Alert dashboard (grouped by priority and type)
  getAlertDashboard: async (userId?: string) => {
    const query = userId ? `?userId=${userId}` : ''
    const data = await p1Request(`/api/advisor/alerts${query}`)
    return data
  },

  // Paginated alert list with filters
  getAlerts: async (params?: { status?: string; priority?: string; type?: string; clientId?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.priority) query.set('priority', params.priority)
    if (params?.type) query.set('type', params.type)
    if (params?.clientId) query.set('clientId', params.clientId)
    if (params?.page) query.set('page', String(params.page))
    if (params?.pageSize) query.set('pageSize', String(params.pageSize))
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await p1Request(`/api/advisor/alerts/list${qs}`)
    return data
  },

  // Acknowledge alert
  acknowledgeAlert: async (alertId: string) => {
    const data = await p1Request(`/api/advisor/alerts/${alertId}/acknowledge`, { method: 'PATCH' })
    return data
  },

  // Dismiss alert
  dismissAlert: async (alertId: string) => {
    const data = await p1Request(`/api/advisor/alerts/${alertId}/dismiss`, { method: 'PATCH' })
    return data
  },

  // Act on alert
  actOnAlert: async (alertId: string) => {
    const data = await p1Request(`/api/advisor/alerts/${alertId}/action`, { method: 'PATCH' })
    return data
  },

  // Generate recommendations for a client (AI-powered)
  generateRecommendations: async (clientId: string, reportId?: string) => {
    const data = await p1Request('/api/advisor/recommendations/generate', {
      method: 'POST',
      body: JSON.stringify({ clientId, reportId }),
    })
    return data
  },

  // List recommendations with filters
  getRecommendations: async (params?: { clientId?: string; classification?: string; category?: string; status?: string; urgency?: string; page?: number }) => {
    const query = new URLSearchParams()
    if (params?.clientId) query.set('clientId', params.clientId)
    if (params?.classification) query.set('classification', params.classification)
    if (params?.category) query.set('category', params.category)
    if (params?.status) query.set('status', params.status)
    if (params?.urgency) query.set('urgency', params.urgency)
    if (params?.page) query.set('page', String(params.page))
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await p1Request(`/api/advisor/recommendations${qs}`)
    return data
  },

  // Single recommendation detail
  getRecommendationDetail: async (recId: string) => {
    const data = await p1Request(`/api/advisor/recommendations/${recId}`)
    return data
  },

  // Present recommendation to client
  presentRecommendation: async (recId: string, presentedVia?: string) => {
    const data = await p1Request(`/api/advisor/recommendations/${recId}/present`, {
      method: 'PATCH',
      body: JSON.stringify({ presentedVia }),
    })
    return data
  },

  // Record recommendation outcome
  recordRecommendationOutcome: async (recId: string, outcome: string, details?: { clientResponse?: string; outcomeValue?: number; outcomeNotes?: string }) => {
    const data = await p1Request(`/api/advisor/recommendations/${recId}/outcome`, {
      method: 'PATCH',
      body: JSON.stringify({ outcome, ...details }),
    })
    return data
  },

  // Generate a full report for a client (AI-powered)
  generateForgeReport: async (params: { clientId: string; type: string; propertyId?: string; period?: string; customSections?: string[] }) => {
    const data = await p1Request('/api/advisor/reports/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    })
    return data
  },

  // List reports with filters
  getForgeReports: async (params?: { clientId?: string; type?: string; status?: string; page?: number }) => {
    const query = new URLSearchParams()
    if (params?.clientId) query.set('clientId', params.clientId)
    if (params?.type) query.set('type', params.type)
    if (params?.status) query.set('status', params.status)
    if (params?.page) query.set('page', String(params.page))
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await p1Request(`/api/advisor/reports${qs}`)
    return data
  },

  // Full report with sections
  getForgeReportDetail: async (reportId: string) => {
    const data = await p1Request(`/api/advisor/reports/${reportId}`)
    return data
  },

  // Report HTML
  getForgeReportHtml: async (reportId: string) => {
    const proxyPath = `advisor/reports/${reportId}/html`
    try {
      const res = await fetch(`${P1_PROXY_BASE}/${proxyPath}`)
      if (!res.ok) return null
      return await res.text()
    } catch { return null }
  },

  // Review a report
  reviewForgeReport: async (reportId: string, reviewedById: string) => {
    const data = await p1Request(`/api/advisor/reports/${reportId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ reviewedById }),
    })
    return data
  },

  // Send a report to client
  sendForgeReport: async (reportId: string, sentVia: string) => {
    const data = await p1Request(`/api/advisor/reports/${reportId}/send`, {
      method: 'PATCH',
      body: JSON.stringify({ sentVia }),
    })
    return data
  },

  // Log an activity (CIE feedback loop)
  logForgeActivity: async (params: { userId: string; action: string; entityType?: string; entityId?: string; metadata?: Record<string, any>; durationMs?: number; sessionId?: string }) => {
    const data = await p1Request('/api/advisor/activity', {
      method: 'POST',
      body: JSON.stringify(params),
    })
    return data
  },

  // Activity feed with filters
  getActivityFeed: async (params?: { userId?: string; entityType?: string; action?: string; days?: number; page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.userId) query.set('userId', params.userId)
    if (params?.entityType) query.set('entityType', params.entityType)
    if (params?.action) query.set('action', params.action)
    if (params?.days) query.set('days', String(params.days))
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await p1Request(`/api/advisor/activity${qs}`)
    return data
  },

  // Activity summary (analytics + adoption metrics)
  getActivitySummary: async (days = 30) => {
    const data = await p1Request(`/api/advisor/activity/summary?days=${days}`)
    return data
  },

  // Entity timeline (full history for any entity)
  getEntityTimeline: async (entityType: string, entityId: string) => {
    const data = await p1Request(`/api/advisor/activity/entity/${entityType}/${entityId}`)
    return data
  },

  // Unified advisor dashboard (command center)
  getAdvisorDashboard: async (params?: { userId?: string; days?: number }) => {
    const query = new URLSearchParams()
    if (params?.userId) query.set('userId', params.userId)
    if (params?.days) query.set('days', String(params.days))
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await p1Request(`/api/advisor/dashboard${qs}`)
    return data
  },

  // ── SCOUT: My Listings (Broker's own inventory) ─────────────────────────
  getMyListings: async (params?: { area?: string; type?: string; sort?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams()
    if (params?.area) query.set('area', params.area)
    if (params?.type) query.set('type', params.type)
    if (params?.sort) query.set('sort', params.sort)
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.offset) query.set('offset', String(params.offset))
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await p1Request(`/api/scout-data/my-listings${qs}`)
    return data
  },

  // ── Health ──────────────────────────────────────────────────────────────
  health: async () => {
    // Health check goes direct — it's unauthenticated on the backend
    try {
      const backendUrl = process.env.NEXT_PUBLIC_P1_API_URL || 'https://pcisp1-production.up.railway.app'
      const res = await fetch(`${backendUrl}/health`)
      if (!res.ok) return null
      return await res.json()
    } catch { return null }
  },
}