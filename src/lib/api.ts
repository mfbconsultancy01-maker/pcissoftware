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

  // ── Clients ─────────────────────────────────────────────────────────────
  getClients: async (params?: { status?: string; tier?: string }) => {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.tier) query.set('tier', params.tier)
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await p1Request(`/api/clients${qs}`)
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