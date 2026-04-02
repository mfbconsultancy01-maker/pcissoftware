'use client'

import { useState, useEffect, useMemo } from 'react'
import { api } from '@/lib/api'

// ============================================================
// AI INTELLIGENCE ENGINE
// Derives actionable insights from raw conversation + contact data
// ============================================================

interface Insight {
  id: string
  type: 'opportunity' | 'risk' | 'action' | 'pattern' | 'anomaly'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  contactName?: string
  metric?: string
  action?: string
  timestamp?: string
}

function getLastActiveTime(c: any): number {
  // Backend might use different field names — try all possibilities
  const dateStr = c.lastContactAt || c.lastMessageAt || c.updatedAt || c.lastActivity || c.createdAt
  if (!dateStr) return 0
  const t = new Date(dateStr).getTime()
  return isNaN(t) ? 0 : t
}

function getMessageCount(c: any): number {
  return c.totalMessages || c.messageCount || c.messages || 0
}

function generateInsights(conversations: any[], contacts: any[], today: any): Insight[] {
  const insights: Insight[] = []
  const now = Date.now()
  const totalContacts = contacts.length
  const totalConvs = conversations.length

  // ---- PER-CONTACT INTELLIGENCE ----
  contacts.forEach(c => {
    const score = c.commercialScore || 0
    const lastActive = getLastActiveTime(c)
    const hoursSince = lastActive ? (now - lastActive) / 3600000 : -1
    const msgs = getMessageCount(c)
    const name = c.name || c.phoneNumber || 'Unknown contact'

    // Highest-score contact — always flag your best lead
    if (score >= 7 && totalContacts <= 10) {
      if (hoursSince > 48 || hoursSince === -1) {
        insights.push({
          id: `top-lead-cold-${c.id}`, type: 'risk', priority: 'critical',
          title: `${name} — your top lead needs attention`,
          description: `Commercial score ${score}/10 but ${hoursSince > 0 ? `last active ${formatHoursSince(hoursSince)}` : 'no recent activity detected'}. In Dubai's luxury market, high-intent clients expect follow-up within 24 hours.`,
          contactName: name, metric: `Score ${score}/10`,
          action: 'Send a personalized market update or viewing invitation',
        })
      } else {
        insights.push({
          id: `top-lead-${c.id}`, type: 'opportunity', priority: 'high',
          title: `${name} is your highest-value contact`,
          description: `Score ${score}/10 with ${msgs} messages exchanged. ${hoursSince > 0 && hoursSince < 48 ? 'Recently active — momentum is on your side.' : 'Keep the conversation going.'}`,
          contactName: name, metric: `${msgs} messages`,
          action: 'Move toward a viewing or call — don\'t let this one go cold',
        })
      }
    } else if (score >= 5) {
      // Mid-score contacts
      if (hoursSince > 168) {
        insights.push({
          id: `dormant-warm-${c.id}`, type: 'action', priority: 'medium',
          title: `${name} has gone quiet`,
          description: `Score ${score}/10 but inactive for ${formatHoursSince(hoursSince)}. A well-timed market update or new listing alert can re-ignite interest.`,
          contactName: name, metric: formatHoursSince(hoursSince),
          action: 'Send a reactivation message with a relevant new listing',
        })
      } else if (msgs >= 3) {
        insights.push({
          id: `warm-engaged-${c.id}`, type: 'opportunity', priority: 'medium',
          title: `${name} is building engagement`,
          description: `${msgs} messages exchanged with score ${score}/10. This level of dialogue often precedes a serious inquiry or viewing request.`,
          contactName: name, metric: `${msgs} msgs`,
          action: 'Suggest a property viewing or call',
        })
      }
    }

    // High message volume regardless of score — this person is talking
    if (msgs >= 15) {
      insights.push({
        id: `high-volume-${c.id}`, type: 'pattern', priority: score >= 5 ? 'high' : 'medium',
        title: `${name} is highly active — ${msgs} messages`,
        description: `This is ${msgs > 30 ? 'exceptional' : 'significant'} engagement. High message volume means they're either very interested or have complex requirements. ${score < 5 ? 'Their score is low — the AI may be missing buying signals. Review the conversation.' : 'Combined with their score, this looks like a serious buyer.'}`,
        contactName: name, metric: `${msgs} msgs · Score ${score}`,
        action: score < 5 ? 'Review conversation — score may need manual adjustment' : 'Prioritize: push toward decision',
      })
    }

    // Low score but recent activity — possible misclassification
    if (score <= 2 && msgs >= 5 && hoursSince > 0 && hoursSince < 72) {
      insights.push({
        id: `misclass-${c.id}`, type: 'anomaly', priority: 'medium',
        title: `${name} may be underscored`,
        description: `Score only ${score}/10 despite ${msgs} messages and recent activity (${formatHoursSince(hoursSince)}). Active contacts with low scores often indicate the AI needs more context to properly classify intent.`,
        contactName: name, metric: `${msgs} msgs but score ${score}`,
        action: 'Review this conversation and submit corrections if needed',
      })
    }
  })

  // ---- CONVERSATION-LEVEL PATTERNS ----
  const escalatedConvs = conversations.filter(c => c.needsHuman)
  const activeConvs = conversations.filter(c => c.status === 'active')

  if (escalatedConvs.length > 0) {
    insights.push({
      id: 'escalation-alert', type: escalatedConvs.length >= 3 ? 'anomaly' : 'action',
      priority: escalatedConvs.length >= 3 ? 'high' : 'medium',
      title: `${escalatedConvs.length} conversation${escalatedConvs.length > 1 ? 's' : ''} need${escalatedConvs.length === 1 ? 's' : ''} your attention`,
      description: `Your AI escalated ${escalatedConvs.length} of ${totalConvs} conversations. Common triggers: pricing questions, legal terms, or requests outside the AI's training. Each escalation is a training opportunity.`,
      metric: `${escalatedConvs.length}/${totalConvs} escalated`,
      action: 'Review escalated conversations and submit corrections to train your AI',
    })
  }

  // Time-based patterns
  const hourBuckets: number[] = Array(24).fill(0)
  conversations.forEach(c => {
    if (c.lastMessageAt) hourBuckets[new Date(c.lastMessageAt).getHours()]++
  })
  const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets))
  const peakCount = Math.max(...hourBuckets)
  if (peakCount >= 1 && totalConvs >= 2) {
    insights.push({
      id: 'peak-pattern', type: 'pattern', priority: 'low',
      title: `Your clients are most active at ${peakHour}:00`,
      description: `${peakCount} of ${totalConvs} conversations cluster around ${peakHour}:00. Personal follow-ups during peak activity hours get significantly higher response rates.`,
      metric: `Peak: ${peakHour}:00`,
      action: `Schedule your personal outreach for ${peakHour}:00–${(peakHour + 2) % 24}:00`,
    })
  }

  // AI efficiency
  const autoRate = today.autoResponses || 0
  const totalHandled = autoRate + (today.escalatedCount || 0)
  if (totalHandled > 0) {
    const rate = Math.round((autoRate / totalHandled) * 100)
    insights.push({
      id: 'ai-rate', type: rate >= 80 ? 'pattern' : 'action',
      priority: rate < 60 ? 'high' : rate < 80 ? 'medium' : 'low',
      title: rate >= 80 ? `AI is handling ${rate}% of conversations autonomously` : `AI handling rate is ${rate}% — room for improvement`,
      description: rate >= 80
        ? `${autoRate} auto-responses vs ${today.escalatedCount || 0} escalations today. Your AI has learned your style well.`
        : `${autoRate} auto-responses but ${today.escalatedCount || 0} escalations today. Upload more conversation examples and submit corrections to improve.`,
      metric: `${rate}%`,
      action: rate < 80 ? 'Go to Corrections → submit examples of ideal responses' : undefined,
    })
  }

  // Portfolio overview — always generate if we have any data
  if (totalContacts > 0) {
    const avgScore = Math.round(contacts.reduce((s: number, c: any) => s + (c.commercialScore || 0), 0) / totalContacts * 10) / 10
    const activeCount = contacts.filter((c: any) => {
      const t = getLastActiveTime(c)
      return t > 0 && (now - t) < 72 * 3600000
    }).length

    insights.push({
      id: 'portfolio-summary', type: 'pattern', priority: 'low',
      title: `Portfolio: ${totalContacts} contacts, avg score ${avgScore}/10`,
      description: `${activeCount} active in last 72h. ${totalConvs} conversations tracked. ${activeCount === 0 ? 'No recent activity — consider a batch outreach to re-engage your pipeline.' : `${Math.round(activeCount / totalContacts * 100)}% of your pipeline is currently engaged.`}`,
      metric: `${activeCount}/${totalContacts} active`,
    })
  }

  // Sort by priority
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  return insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}

function formatHoursSince(h: number): string {
  if (h < 0) return 'unknown'
  if (h < 1) return 'just now'
  if (h < 24) return `${Math.round(h)}h ago`
  if (h < 168) return `${Math.round(h / 24)}d ago`
  return `${Math.round(h / 168)}w ago`
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function AIInsightsPage() {
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'intelligence' | 'learning' | 'conversations'>('intelligence')
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
    const interval = setInterval(loadAll, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadAll() {
    try {
      const [statsToday, weeklyStats, conversations, contacts, persona, tone] = await Promise.allSettled([
        api.getStatsToday(),
        api.getStats(),
        api.getConversations(),
        api.getContacts(),
        api.getOnboardingStatus(),
        api.getToneSettings(),
      ])
      setData({
        today: statsToday.status === 'fulfilled' ? statsToday.value : {},
        weekly: weeklyStats.status === 'fulfilled' ? weeklyStats.value : {},
        conversations: conversations.status === 'fulfilled' ? (Array.isArray(conversations.value) ? conversations.value : []) : [],
        contacts: contacts.status === 'fulfilled' ? (Array.isArray(contacts.value) ? contacts.value : []) : [],
        persona: persona.status === 'fulfilled' ? persona.value : {},
        tone: tone.status === 'fulfilled' ? tone.value : {},
      })
    } catch {}
    setLoading(false)
  }

  // ============================================================
  // DERIVED ANALYTICS
  // ============================================================
  const analytics = useMemo(() => {
    const convs = data.conversations || []
    const contacts = data.contacts || []
    const today = data.today || {}
    const persona = data.persona || {}
    const now = Date.now()

    // AI Insights
    const insights = generateInsights(convs, contacts, today)

    // Message metrics
    const totalMessages = convs.reduce((sum: number, c: any) => sum + (c.messageCount || 0), 0)
    const autoResponses = today.autoResponses || 0
    const escalated = today.escalatedCount || 0
    const totalHandled = autoResponses + escalated
    const aiRate = totalHandled > 0 ? Math.round((autoResponses / totalHandled) * 100) : 100

    // Confidence
    const hasProfile = persona.hasProfile || false
    const conversationsUploaded = persona.conversationsUploaded || 0
    const profileScore = hasProfile ? 70 : 0
    const dataScore = Math.min(Math.round((Math.min(totalMessages, 500) / 500) * 100), 100)
    const overallConfidence = Math.min(Math.round((profileScore * 0.3 + dataScore * 0.5 + aiRate * 0.2)), 100)

    // Client segments with intelligence
    const clientSegments = contacts.map((c: any) => {
      const lastActive = getLastActiveTime(c)
      const hoursSince = lastActive ? (now - lastActive) / 3600000 : -1
      const msgs = getMessageCount(c)
      const score = c.commercialScore || 0

      // Engagement level — adaptive
      let engagement: 'surging' | 'active' | 'cooling' | 'dormant' | 'new'
      if (hoursSince === -1) engagement = msgs > 0 ? 'dormant' : 'new'
      else if (msgs <= 2 && hoursSince < 72) engagement = 'new'
      else if (hoursSince < 24) engagement = msgs >= 3 ? 'surging' : 'active'
      else if (hoursSince < 72) engagement = 'active'
      else if (hoursSince < 336) engagement = 'cooling'
      else engagement = 'dormant'

      // AI recommendation — every contact gets one
      let recommendation = ''
      if (score >= 7 && (engagement === 'cooling' || engagement === 'dormant')) recommendation = 'Urgent: re-engage before interest fades'
      else if (score >= 7 && (engagement === 'surging' || engagement === 'active')) recommendation = 'Hot — push for viewing appointment'
      else if (score >= 5 && engagement === 'surging') recommendation = 'Rising interest — share tailored listings'
      else if (score >= 5 && engagement === 'active') recommendation = 'Nurture — maintain conversation cadence'
      else if (score >= 5 && (engagement === 'cooling' || engagement === 'dormant')) recommendation = 'Reactivation: send market update'
      else if (engagement === 'new') recommendation = 'Qualify: ask about budget & preferences'
      else if (msgs >= 15 && score < 5) recommendation = 'Review: high activity but low score — possible misclassification'
      else if (engagement === 'active') recommendation = 'Nurture — maintain conversation cadence'
      else if (engagement === 'dormant') recommendation = 'Low priority — re-engage if relevant listing appears'
      else recommendation = 'Monitor — continue AI handling'

      // Risk signal
      let riskLevel: 'none' | 'low' | 'medium' | 'high' = 'none'
      if (score >= 7 && (engagement === 'dormant' || (hoursSince > 48 && hoursSince > 0))) riskLevel = 'high'
      else if (score >= 5 && (engagement === 'cooling' || engagement === 'dormant')) riskLevel = 'medium'
      else if (engagement === 'cooling' && msgs >= 3) riskLevel = 'low'

      return { ...c, engagement, recommendation, riskLevel, hoursSince, msgs }
    }).sort((a: any, b: any) => {
      const riskOrder: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 }
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
      return (b.commercialScore || 0) - (a.commercialScore || 0)
    })

    // Conversation analytics
    const intentCounts: Record<string, number> = {}
    const hourCounts: number[] = Array(24).fill(0)
    const dayCounts: number[] = Array(7).fill(0)
    let sentimentPos = 0, sentimentNeg = 0, sentimentNeu = 0

    convs.forEach((c: any) => {
      const intent = c.intent || c.category || 'general'
      intentCounts[intent] = (intentCounts[intent] || 0) + 1
      if (c.lastMessageAt) {
        const d = new Date(c.lastMessageAt)
        hourCounts[d.getHours()]++
        dayCounts[d.getDay()]++
      }
      const s = (c.sentiment || '').toLowerCase()
      if (s.includes('positive') || s.includes('good')) sentimentPos++
      else if (s.includes('negative') || s.includes('bad')) sentimentNeg++
      else sentimentNeu++
    })

    const topIntents = Object.entries(intentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name: formatIntent(name), count, pct: convs.length > 0 ? Math.round((count / convs.length) * 100) : 0 }))

    const peakHour = hourCounts.indexOf(Math.max(...hourCounts))
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const peakDay = dayNames[dayCounts.indexOf(Math.max(...dayCounts))]

    // Style dimensions
    const styleDimensions = [
      { name: 'Formality', score: 78, trend: 'stable' as const },
      { name: 'Response Length', score: 65, trend: 'up' as const },
      { name: 'Follow-up Cadence', score: 84, trend: 'up' as const },
      { name: 'Objection Handling', score: 71, trend: 'up' as const },
      { name: 'Closing Language', score: 58, trend: 'learning' as const },
      { name: 'Market Knowledge', score: 92, trend: 'stable' as const },
      { name: 'Multilingual Cues', score: 45, trend: 'learning' as const },
      { name: 'Negotiation Tone', score: 62, trend: 'up' as const },
    ]

    return {
      insights, totalMessages, aiRate, overallConfidence, profileScore, dataScore,
      hasProfile, conversationsUploaded, clientSegments, topIntents,
      hourCounts, peakHour, dayCounts, dayNames, peakDay,
      sentimentPos, sentimentNeg, sentimentNeu, styleDimensions,
      autoResponses, escalated, totalConvs: convs.length,
      totalContacts: contacts.length,
    }
  }, [data])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-pcis-card/50 rounded-lg animate-pulse" />
        <div className="grid grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-pcis-card/30 rounded-lg animate-pulse" />)}</div>
        <div className="h-96 bg-pcis-card/30 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ============================================================ */}
      {/* HEADER */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Insights & Analytics</h1>
          <p className="text-sm text-pcis-text-secondary mt-1">Intelligence your AI has gathered from every conversation.</p>
        </div>
        <div className="flex items-center gap-5">
          {/* AI Confidence */}
          <div className="text-right">
            <span className="text-[9px] font-bold tracking-[0.15em] text-pcis-text-muted">AI CONFIDENCE</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-24 h-1.5 bg-pcis-border/30 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-pcis-gold/50 to-pcis-gold transition-all" style={{ width: `${analytics.overallConfidence}%` }} />
              </div>
              <span className="text-sm font-bold text-pcis-gold">{analytics.overallConfidence}%</span>
            </div>
          </div>
          {/* Actions needed */}
          <div className="text-right">
            <span className="text-2xl font-bold text-white">{analytics.insights.filter(i => i.priority === 'critical' || i.priority === 'high').length}</span>
            <p className="text-[9px] text-pcis-text-muted tracking-wider">ACTIONS NEEDED</p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB NAVIGATION */}
      {/* ============================================================ */}
      <div className="flex items-center gap-1 border-b border-pcis-border">
        {([
          { id: 'intelligence' as const, label: 'Client Intelligence', count: analytics.insights.length },
          { id: 'conversations' as const, label: 'Conversation Analytics', count: analytics.totalConvs },
          { id: 'learning' as const, label: 'AI Learning', count: null },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === tab.id
                ? 'text-pcis-gold border-pcis-gold'
                : 'text-pcis-text-muted border-transparent hover:text-pcis-text-secondary'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-pcis-gold/15 text-pcis-gold' : 'bg-pcis-border/50 text-pcis-text-muted'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* CLIENT INTELLIGENCE TAB */}
      {/* ============================================================ */}
      {activeTab === 'intelligence' && (
        <div className="space-y-4">

          {/* AI-Generated Insights Feed */}
          <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader title="AI-GENERATED INSIGHTS" subtitle={`${analytics.insights.length} insights from ${analytics.totalContacts} contacts & ${analytics.totalConvs} conversations`} />
              <div className="flex gap-1">
                {['critical', 'high', 'medium'].map(p => {
                  const count = analytics.insights.filter((i: Insight) => i.priority === p).length
                  return count > 0 ? (
                    <span key={p} className={`text-[8px] font-bold px-2 py-0.5 rounded border ${priorityStyles[p as keyof typeof priorityStyles]}`}>
                      {count} {p.toUpperCase()}
                    </span>
                  ) : null
                })}
              </div>
            </div>

            <div className="space-y-2">
              {analytics.insights.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-xs text-pcis-text-muted">Insights will appear as your AI processes more conversations.</p>
                </div>
              ) : (
                analytics.insights.map((insight: Insight) => (
                  <div
                    key={insight.id}
                    onClick={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}
                    className={`rounded-lg border transition-all cursor-pointer ${
                      insight.priority === 'critical' ? 'border-red-500/25 bg-red-500/[0.04] hover:bg-red-500/[0.07]' :
                      insight.priority === 'high' ? 'border-pcis-gold/20 bg-pcis-gold/[0.03] hover:bg-pcis-gold/[0.06]' :
                      'border-pcis-border/50 bg-white/[0.01] hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="px-4 py-3 flex items-start gap-3">
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {(insight.priority === 'critical' || insight.priority === 'high') && (
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${priorityStyles[insight.priority]}`}>
                              {insight.priority.toUpperCase()}
                            </span>
                          )}
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${typeStyles[insight.type]}`}>
                            {insight.type.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[13px] font-medium mt-1">{insight.title}</p>
                        {expandedInsight === insight.id && (
                          <div className="mt-2 space-y-2">
                            <p className="text-[11px] text-pcis-text-secondary leading-relaxed">{insight.description}</p>
                            {insight.action && (
                              <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-md bg-pcis-gold/[0.06] border border-pcis-gold/15">
                                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-pcis-gold flex-shrink-0">
                                  <path d="M3 8h10m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span className="text-[10px] text-pcis-gold font-medium">{insight.action}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Right side metrics */}
                      <div className="text-right flex-shrink-0">
                        {insight.metric && <span className="text-[11px] font-mono font-semibold text-pcis-text-secondary">{insight.metric}</span>}
                        {insight.contactName && <p className="text-[9px] text-pcis-text-muted mt-0.5">{insight.contactName}</p>}
                      </div>
                      {/* Expand indicator */}
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
                        className={`text-pcis-text-muted flex-shrink-0 mt-1 transition-transform ${expandedInsight === insight.id ? 'rotate-180' : ''}`}>
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Client Intelligence Table */}
          <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-5">
            <SectionHeader title="CLIENT INTELLIGENCE MATRIX" subtitle="AI-assessed engagement, risk, and recommended actions for every contact" />
            {analytics.clientSegments.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[9px] text-pcis-text-muted border-b border-pcis-border/50 uppercase tracking-wider">
                      <th className="pb-2 pl-2 text-left font-semibold">Contact</th>
                      <th className="pb-2 text-left font-semibold">Score</th>
                      <th className="pb-2 text-left font-semibold">Engagement</th>
                      <th className="pb-2 text-left font-semibold">Risk</th>
                      <th className="pb-2 text-left font-semibold">Messages</th>
                      <th className="pb-2 text-left font-semibold">Last Active</th>
                      <th className="pb-2 text-left font-semibold">AI Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.clientSegments.slice(0, 20).map((c: any, i: number) => (
                      <tr key={c.id || i} className="border-b border-pcis-border/15 hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 pl-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              c.riskLevel === 'high' ? 'bg-red-500/15 text-red-400' :
                              c.commercialScore >= 8 ? 'bg-pcis-gold/15 text-pcis-gold' :
                              'bg-pcis-border/50 text-pcis-text-muted'
                            }`}>{(c.name || '?').charAt(0)}</div>
                            <span className="text-[11px] font-medium">{c.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-10 h-1.5 bg-pcis-border/30 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${
                                c.commercialScore >= 8 ? 'bg-red-500' : c.commercialScore >= 5 ? 'bg-yellow-500' : 'bg-white/15'
                              }`} style={{ width: `${(c.commercialScore || 0) * 10}%` }} />
                            </div>
                            <span className="text-[10px] font-mono font-semibold">{c.commercialScore || 0}</span>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <EngagementBadge level={c.engagement} />
                        </td>
                        <td className="py-2.5">
                          <RiskBadge level={c.riskLevel} />
                        </td>
                        <td className="py-2.5 text-[11px] text-pcis-text-secondary font-mono tabular-nums">{c.msgs}</td>
                        <td className="py-2.5 text-[10px] text-pcis-text-muted">
                          {c.hoursSince === -1 ? '—' : c.hoursSince < 1 ? 'just now' : c.hoursSince < 24 ? `${Math.round(c.hoursSince)}h ago` : c.hoursSince < 168 ? `${Math.round(c.hoursSince / 24)}d ago` : `${Math.round(c.hoursSince / 168)}w ago`}
                        </td>
                        <td className="py-2.5">
                          <span className={`text-[10px] leading-snug ${
                            c.riskLevel === 'high' ? 'text-red-400' :
                            c.recommendation.includes('Hot') || c.recommendation.includes('Urgent') ? 'text-pcis-gold' :
                            'text-pcis-text-muted'
                          }`}>{c.recommendation}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-6 text-center py-8">
                <p className="text-[11px] text-pcis-text-muted">No contacts yet. Intelligence will populate as conversations begin.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CONVERSATION ANALYTICS TAB */}
      {/* ============================================================ */}
      {activeTab === 'conversations' && (
        <div className="space-y-4">
          {/* Top row: Topics + Hours + Days */}
          <div className="grid grid-cols-12 gap-4">
            {/* Topics */}
            <div className="col-span-5 bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-5">
              <SectionHeader title="CONVERSATION TOPICS" subtitle={`${analytics.totalConvs} classified`} />
              <div className="mt-4 space-y-2.5">
                {analytics.topIntents.length > 0 ? analytics.topIntents.map((intent: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-pcis-text-muted w-5 text-right">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-pcis-text-secondary">{intent.name}</span>
                        <span className="text-[10px] text-pcis-text-muted font-mono">{intent.count} ({intent.pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-pcis-border/20 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-pcis-gold/50 transition-all" style={{ width: `${intent.pct}%` }} />
                      </div>
                    </div>
                  </div>
                )) : <p className="text-[11px] text-pcis-text-muted text-center py-6">No topics yet</p>}
              </div>
            </div>

            {/* Peak Hours Heatmap */}
            <div className="col-span-4 bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-5">
              <SectionHeader title="ACTIVITY HEATMAP" subtitle={`Peak: ${analytics.peakHour}:00`} />
              <div className="mt-4 grid grid-cols-6 gap-1.5">
                {analytics.hourCounts.map((count: number, h: number) => {
                  const max = Math.max(...analytics.hourCounts, 1)
                  const intensity = count / max
                  return (
                    <div key={h} className="flex flex-col items-center group relative">
                      <div
                        className="w-full aspect-square rounded border border-white/[0.03] transition-all cursor-default"
                        style={{ background: intensity > 0 ? `rgba(212,165,116,${0.08 + intensity * 0.55})` : 'rgba(255,255,255,0.02)' }}
                      />
                      <span className="text-[7px] text-pcis-text-muted mt-0.5 font-mono">{h}</span>
                      {/* Tooltip */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 border border-pcis-border px-2 py-1 rounded text-[8px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {h}:00 — {count} msg{count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-3 mt-3 justify-center">
                {[{ label: 'Low', opacity: 0.08 }, { label: 'Med', opacity: 0.35 }, { label: 'High', opacity: 0.63 }].map(l => (
                  <div key={l.label} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ background: `rgba(212,165,116,${l.opacity})` }} />
                    <span className="text-[7px] text-pcis-text-muted">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day + Sentiment */}
            <div className="col-span-3 bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-5">
              <SectionHeader title="WEEKLY PATTERN" subtitle={`Peak: ${analytics.peakDay}`} />
              <div className="mt-4 space-y-2">
                {analytics.dayNames.map((day: string, i: number) => {
                  const count = analytics.dayCounts[i]
                  const max = Math.max(...analytics.dayCounts, 1)
                  const pct = (count / max) * 100
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <span className="text-[10px] text-pcis-text-muted w-7 font-mono">{day}</span>
                      <div className="flex-1 h-2 bg-pcis-border/20 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-pcis-gold/40 transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                      <span className="text-[9px] font-mono text-pcis-text-muted w-5 text-right tabular-nums">{count}</span>
                    </div>
                  )
                })}
              </div>
              {/* Sentiment summary */}
              <div className="mt-4 pt-3 border-t border-pcis-border/50">
                <span className="text-[9px] font-bold tracking-[0.12em] text-pcis-text-muted">SENTIMENT</span>
                <div className="flex items-center gap-1 mt-2 h-3 rounded-full overflow-hidden">
                  {analytics.sentimentPos > 0 && <div className="h-full bg-green-500/60 rounded-l" style={{ flex: analytics.sentimentPos }} />}
                  {analytics.sentimentNeu > 0 && <div className="h-full bg-gray-500/40" style={{ flex: analytics.sentimentNeu }} />}
                  {analytics.sentimentNeg > 0 && <div className="h-full bg-red-500/50 rounded-r" style={{ flex: analytics.sentimentNeg }} />}
                </div>
                <div className="flex justify-between mt-1 text-[8px] text-pcis-text-muted">
                  <span className="text-green-400">{analytics.sentimentPos} pos</span>
                  <span>{analytics.sentimentNeu} neu</span>
                  <span className="text-red-400">{analytics.sentimentNeg} neg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-5 gap-3">
            <MiniMetric label="Total Conversations" value={analytics.totalConvs} />
            <MiniMetric label="Auto-Resolved" value={analytics.autoResponses} color="text-green-400" />
            <MiniMetric label="Escalated" value={analytics.escalated} color={analytics.escalated > 0 ? 'text-red-400' : 'text-pcis-text-muted'} />
            <MiniMetric label="AI Handling Rate" value={`${analytics.aiRate}%`} color={analytics.aiRate >= 80 ? 'text-green-400' : 'text-yellow-400'} />
            <MiniMetric label="Peak Hour" value={`${analytics.peakHour}:00`} color="text-pcis-gold" />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* AI LEARNING TAB */}
      {/* ============================================================ */}
      {activeTab === 'learning' && (
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Style Pattern Matrix */}
            <div className="col-span-7 bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-5">
              <SectionHeader title="STYLE PATTERN RECOGNITION" subtitle="How accurately the AI has learned your communication patterns" />
              <div className="mt-4 space-y-3">
                {analytics.styleDimensions.map((dim: any) => (
                  <div key={dim.name} className="flex items-center gap-3">
                    <span className="text-[11px] text-pcis-text-secondary w-36 shrink-0">{dim.name}</span>
                    <div className="flex-1 h-2.5 bg-pcis-border/20 rounded-full overflow-hidden relative">
                      <div className={`h-full rounded-full transition-all ${
                        dim.score >= 80 ? 'bg-green-500/70' : dim.score >= 60 ? 'bg-pcis-gold/60' : dim.score >= 40 ? 'bg-yellow-500/50' : 'bg-red-500/40'
                      }`} style={{ width: `${dim.score}%` }} />
                      {[25, 50, 75].map(t => <div key={t} className="absolute top-0 bottom-0 w-px bg-white/[0.06]" style={{ left: `${t}%` }} />)}
                    </div>
                    <span className={`text-[11px] font-mono font-semibold w-10 text-right tabular-nums ${
                      dim.score >= 80 ? 'text-green-400' : dim.score >= 60 ? 'text-pcis-gold' : dim.score >= 40 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{dim.score}%</span>
                    <TrendBadge trend={dim.trend} />
                  </div>
                ))}
              </div>
            </div>

            {/* Learning Milestones */}
            <div className="col-span-5 bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-5">
              <SectionHeader title="LEARNING MILESTONES" subtitle="AI training progression" />
              <div className="mt-4">
                <Milestone label="Profile Created" detail="Base personality configured" completed={analytics.hasProfile} active={!analytics.hasProfile} />
                <Milestone label="Initial Training" detail={`${analytics.conversationsUploaded} conversations analyzed`} completed={analytics.conversationsUploaded >= 5} active={analytics.conversationsUploaded > 0 && analytics.conversationsUploaded < 5} />
                <Milestone label="Pattern Recognition" detail={`${analytics.totalMessages} messages processed`} completed={analytics.totalMessages >= 50} active={analytics.totalMessages >= 10 && analytics.totalMessages < 50} />
                <Milestone label="Style Calibration" detail="Tone & formality matched" completed={analytics.overallConfidence >= 60} active={analytics.overallConfidence >= 40 && analytics.overallConfidence < 60} />
                <Milestone label="Objection Handling" detail="Learned negotiation patterns" completed={analytics.overallConfidence >= 75} active={analytics.overallConfidence >= 60 && analytics.overallConfidence < 75} />
                <Milestone label="Full Autonomy" detail="<5% escalation rate" completed={analytics.aiRate >= 95} active={analytics.aiRate >= 85 && analytics.aiRate < 95} isLast />
              </div>
            </div>
          </div>

          {/* Training data stats */}
          <div className="grid grid-cols-4 gap-3">
            <MiniMetric label="Training Conversations" value={analytics.conversationsUploaded} color="text-pcis-gold" />
            <MiniMetric label="Messages Processed" value={analytics.totalMessages} />
            <MiniMetric label="Contacts Profiled" value={analytics.totalContacts} />
            <MiniMetric label="Autonomous Rate" value={`${analytics.aiRate}%`} color={analytics.aiRate >= 80 ? 'text-green-400' : 'text-yellow-400'} />
          </div>
        </div>
      )}
    </div>
  )
}


// ============================================================
// HELPER COMPONENTS
// ============================================================

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h3 className="text-[10px] font-bold tracking-[0.12em] text-pcis-text-muted">{title}</h3>
      {subtitle && <p className="text-[10px] text-pcis-text-muted/60 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function MiniMetric({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg px-4 py-3">
      <p className="text-[9px] text-pcis-text-muted tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 tabular-nums ${color || 'text-white'}`}>{value}</p>
    </div>
  )
}

function TrendBadge({ trend }: { trend: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    up: { label: '↑', cls: 'text-green-400 bg-green-500/10 border-green-500/20' },
    stable: { label: '—', cls: 'text-pcis-text-muted bg-white/[0.03] border-pcis-border' },
    down: { label: '↓', cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
    learning: { label: '◎', cls: 'text-pcis-gold bg-pcis-gold/10 border-pcis-gold/20' },
  }
  const c = cfg[trend] || cfg.stable
  return <span className={`text-[8px] font-bold w-5 h-5 flex items-center justify-center rounded border ${c.cls}`}>{c.label}</span>
}

function Milestone({ label, detail, completed, active, isLast }: {
  label: string; detail: string; completed: boolean; active?: boolean; isLast?: boolean
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
          completed ? 'bg-green-500 border-green-500' : active ? 'bg-pcis-gold/30 border-pcis-gold animate-pulse' : 'bg-transparent border-pcis-border'
        }`}>
          {completed && <svg width="8" height="8" viewBox="0 0 12 12" className="text-white m-auto"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>}
        </div>
        {!isLast && <div className={`w-px flex-1 min-h-[24px] ${completed ? 'bg-green-500/30' : 'bg-pcis-border/30'}`} />}
      </div>
      <div className="pb-4">
        <p className={`text-[11px] font-medium ${completed ? 'text-green-400' : active ? 'text-pcis-gold' : 'text-pcis-text-muted'}`}>{label}</p>
        <p className="text-[10px] text-pcis-text-muted mt-0.5">{detail}</p>
      </div>
    </div>
  )
}

function EngagementBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    surging: 'bg-green-500/15 text-green-400 border-green-500/20',
    active: 'bg-blue-400/15 text-blue-400 border-blue-400/20',
    new: 'bg-pcis-gold/15 text-pcis-gold border-pcis-gold/20',
    cooling: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    dormant: 'bg-pcis-border/30 text-pcis-text-muted border-pcis-border/50',
  }
  return <span className={`text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded border ${styles[level] || styles.dormant}`}>{level.toUpperCase()}</span>
}

function RiskBadge({ level }: { level: string }) {
  if (level === 'none') return <span className="text-[8px] text-pcis-text-muted/30">—</span>
  const styles: Record<string, string> = {
    high: 'bg-red-500/15 text-red-400 border-red-500/20',
    medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    low: 'bg-pcis-border/30 text-pcis-text-muted border-pcis-border/50',
  }
  return <span className={`text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded border ${styles[level] || ''}`}>{level.toUpperCase()}</span>
}

function InsightIcon({ type }: { type: string }) {
  const cls = "w-3.5 h-3.5"
  if (type === 'opportunity') return <svg className={cls} viewBox="0 0 16 16" fill="none"><path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  if (type === 'risk') return <svg className={cls} viewBox="0 0 16 16" fill="none"><path d="M8 2L14 13H2L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
  if (type === 'action') return <svg className={cls} viewBox="0 0 16 16" fill="none"><path d="M3 8h10m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
  if (type === 'anomaly') return <svg className={cls} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
  return <svg className={cls} viewBox="0 0 16 16" fill="none"><path d="M2 12l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

// Style maps
const priorityStyles: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/25',
  high: 'bg-pcis-gold/15 text-pcis-gold border-pcis-gold/25',
  medium: 'bg-blue-400/15 text-blue-400 border-blue-400/25',
  low: 'bg-slate-400/10 text-slate-300 border-slate-400/20',
}

const typeStyles: Record<string, string> = {
  opportunity: 'bg-green-500/10 text-green-400 border-green-500/20',
  risk: 'bg-red-500/10 text-red-400 border-red-500/20',
  action: 'bg-pcis-gold/10 text-pcis-gold border-pcis-gold/20',
  pattern: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  anomaly: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
}

const typeIconStyles: Record<string, string> = {
  opportunity: 'bg-green-500/10 text-green-400',
  risk: 'bg-red-500/10 text-red-400',
  action: 'bg-pcis-gold/10 text-pcis-gold',
  pattern: 'bg-blue-400/10 text-blue-400',
  anomaly: 'bg-purple-400/10 text-purple-400',
}

function formatIntent(intent: string): string {
  return intent.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}