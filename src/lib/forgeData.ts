// ============================================================================
// PCIS FORGE ENGINE — Advisor Action Layer (REAL DATA)
// ============================================================================
// Engine 4: Synthesizes CIE cognitive profiles, ENGINE matches (scored against
// real DLD market data), and SCOUT intelligence to generate actionable deal
// briefs, proposals, communications, and lifecycle actions.
// All market numbers are real — pulled from DLD Q1 2026 transaction data.
// ============================================================================

import {
  clients,
  properties,
  matches,
  signals,
  nextTouches,
  engagementMetrics,
  type Client,
  type Property,
  type Match,
  type Signal,
  type NextTouch,
  type EngagementMetrics,
  type DealStage,
} from './mockData'

import { cieClients, ARCHETYPES, type CIEClient, type Archetype } from './cieData'

import {
  engineMatches,
  clientPurposes,
  PURPOSE_CONFIGS,
  type EngineMatch,
  type ClientPurpose,
  type ClientPurposeAssignment,
} from './engineData'

import { areas as areaProfiles } from './marketData'

// ============================================================================
// ACTION PRIORITY & CATEGORY TYPES
// ============================================================================

export type ActionPriority = 'critical' | 'high' | 'medium' | 'low'
export type ActionCategory = 'deal-brief' | 'proposal' | 'communication' | 'follow-up' | 'review' | 'meeting-prep'
export type ActionStatus = 'pending' | 'in-progress' | 'completed' | 'deferred'

export interface ForgeAction {
  id: string
  clientId: string
  propertyId?: string
  matchId?: string
  category: ActionCategory
  priority: ActionPriority
  title: string
  description: string
  status: ActionStatus
  dueDate: string
  createdAt: string
  completedAt?: string
  source: 'cie' | 'engine' | 'scout' | 'manual'
}

// ============================================================================
// DEAL BRIEF TYPES
// ============================================================================

export interface DealBrief {
  id: string
  clientId: string
  propertyId: string
  matchId: string
  purpose: ClientPurpose
  clientSummary: string
  propertySummary: string
  purposeAlignment: string
  financialAnalysis: string
  approachStrategy: string
  riskFactors: string[]
  talkingPoints: string[]
  generatedAt: string
  status: 'draft' | 'reviewed' | 'sent'
}

// ============================================================================
// PROPOSAL TYPES
// ============================================================================

export interface ProposalSection {
  heading: string
  content: string
  type: 'overview' | 'property' | 'financial' | 'area' | 'comparable' | 'recommendation'
}

export interface Proposal {
  id: string
  clientId: string
  propertyIds: string[]
  matchIds: string[]
  title: string
  purpose: ClientPurpose
  sections: ProposalSection[]
  status: 'draft' | 'reviewed' | 'sent' | 'viewed' | 'accepted' | 'declined'
  createdAt: string
  sentAt?: string
}

// ============================================================================
// COMMUNICATION DRAFT TYPES
// ============================================================================

export type CommChannel = 'email' | 'whatsapp' | 'call' | 'meeting'
export type CommTone = 'formal' | 'consultative' | 'casual' | 'urgent'

export interface CommunicationDraft {
  id: string
  clientId: string
  channel: CommChannel
  tone: CommTone
  subject?: string
  body: string
  talkingPoints: string[]
  bestTimeToReach: string
  cognitiveNotes: string
  status: 'draft' | 'approved' | 'sent'
  createdAt: string
}

// ============================================================================
// LIFECYCLE ACTION TYPES
// ============================================================================

export interface LifecycleAction {
  id: string
  clientId: string
  phase: DealStage
  actionType: 'scheduled-touch' | 'overdue-follow-up' | 're-engagement' | 'milestone' | 'nurture'
  title: string
  description: string
  dueDate: string
  isOverdue: boolean
  daysSinceLastContact: number
  urgency: ActionPriority
}

// ============================================================================
// ACTIVITY LOG ENTRY
// ============================================================================

export type ForgeActivityActionType = 'brief-generated' | 'proposal-sent' | 'comm-drafted' | 'touch-completed' | 'meeting-held' | 'viewing-arranged' | 'offer-prepared'

export interface ForgeActivityLog {
  id: string
  clientId: string
  propertyId?: string
  actionType: ForgeActivityActionType
  title: string
  detail: string
  timestamp: string
  outcome?: 'positive' | 'neutral' | 'negative'
}

// ============================================================================
// FORGE SUMMARY
// ============================================================================

export interface ForgeSummary {
  totalActions: number
  pendingActions: number
  criticalActions: number
  briefsGenerated: number
  proposalsSent: number
  commsDrafted: number
  overdueFollowUps: number
  completionRate: number
  avgResponseTime: number
  actionsByCategory: Record<ActionCategory, number>
  actionsByPriority: Record<ActionPriority, number>
}

// ============================================================================
// HELPERS
// ============================================================================

function getCIE(clientId: string): CIEClient | undefined {
  return cieClients.find(c => c.client.id === clientId)
}

function getArchetype(cie: CIEClient): typeof ARCHETYPES[0] | undefined {
  return ARCHETYPES.find(a => a.id === cie.archetype)
}

function getEngagement(clientId: string): EngagementMetrics | undefined {
  return engagementMetrics.find(e => e.clientId === clientId)
}

function getTopMatch(clientId: string): EngineMatch | undefined {
  return engineMatches
    .filter(m => m.clientId === clientId)
    .sort((a, b) => b.overallScore - a.overallScore)[0]
}

function getClientMatches(clientId: string): EngineMatch[] {
  return engineMatches
    .filter(m => m.clientId === clientId)
    .sort((a, b) => b.overallScore - a.overallScore)
}

function findArea(nameOrId: string) {
  const upper = nameOrId.toUpperCase()
  return (areaProfiles || []).find((a: any) =>
    a.id === nameOrId ||
    a.name?.toUpperCase() === upper ||
    a.name?.toUpperCase().includes(upper) ||
    upper.includes(a.name?.toUpperCase() || '___')
  )
}

function toneFromArchetype(archetype: string): CommTone {
  const map: Record<string, CommTone> = {
    'decisive': 'formal',
    'analytical': 'consultative',
    'cautious': 'consultative',
    'impulsive': 'casual',
    'balanced': 'consultative',
  }
  return map[archetype] || 'consultative'
}

function priorityFromEngagement(eng: EngagementMetrics | undefined, dealStage: DealStage): ActionPriority {
  if (!eng) return 'medium'
  if (eng.status === 'dormant' || eng.status === 'cold') return 'critical'
  if (eng.status === 'cooling' && eng.daysSinceContact > 10) return 'critical'
  if (dealStage === 'Offer Made' || dealStage === 'Negotiation') return 'high'
  if (eng.momentum === 'heating') return 'high'
  if (eng.status === 'active') return 'medium'
  return 'low'
}

// ============================================================================
// DYNAMIC FORGE ACTION GENERATION
// ============================================================================

function buildForgeActions(): ForgeAction[] {
  const actions: ForgeAction[] = []
  let idx = 0

  for (const client of clients) {
    const cie = getCIE(client.id)
    const eng = getEngagement(client.id)
    const topMatch = getTopMatch(client.id)
    const purpose = clientPurposes.find(p => p.clientId === client.id)
    const priority = priorityFromEngagement(eng, client.dealStage)

    idx++

    // Re-engagement actions for cooling/cold clients
    if (eng && (eng.status === 'cooling' || eng.status === 'cold' || eng.status === 'dormant')) {
      actions.push({
        id: `fa${idx}`,
        clientId: client.id,
        category: eng.status === 'dormant' ? 'communication' : 'follow-up',
        priority: eng.status === 'dormant' ? 'critical' : 'high',
        title: `${eng.status === 'dormant' ? 'Crisis outreach' : 'Re-engagement'}: ${client.name} — ${eng.daysSinceContact} days silent`,
        description: `Client engagement ${eng.status}. ${eng.decayRate}% decay rate. ${eng.daysSinceContact} days since last contact. ${eng.status === 'dormant' ? 'Immediate salvage intervention required.' : 'Proactive re-touch recommended.'}`,
        status: 'pending',
        dueDate: '2026-03-26T10:00:00Z',
        createdAt: '2026-03-25T08:00:00Z',
        source: 'cie',
      })
      idx++
    }

    // Deal brief action for clients with active matches
    if (topMatch && topMatch.overallScore >= 60 && client.dealStage !== 'Closed Won') {
      const area = topMatch.areaId ? findArea(topMatch.areaId) : null
      const areaName = area?.name || topMatch.propertyId
      const prop = properties.find(p => p.id === topMatch.propertyId)
      const displayName = prop?.name || areaName

      actions.push({
        id: `fa${idx}`,
        clientId: client.id,
        propertyId: topMatch.propertyId,
        matchId: topMatch.id,
        category: 'deal-brief',
        priority,
        title: `Prepare deal brief: ${client.name} — ${displayName}`,
        description: `${topMatch.grade} grade match (${topMatch.overallScore}/100). ${purpose?.primaryPurpose || 'Investment'} purpose. ${topMatch.areaData ? `Real yield ${topMatch.areaData.rentalYield.toFixed(1)}%, ${topMatch.areaData.transactionCount} Q1 transactions.` : ''}`,
        status: client.dealStage === 'Offer Made' ? 'in-progress' : 'pending',
        dueDate: '2026-03-26T14:00:00Z',
        createdAt: '2026-03-25T08:00:00Z',
        source: 'engine',
      })
      idx++
    }

    // Proposal action for clients in Discovery/Viewing
    if (['Discovery', 'Viewing'].includes(client.dealStage) && topMatch) {
      actions.push({
        id: `fa${idx}`,
        clientId: client.id,
        matchId: topMatch.id,
        category: 'proposal',
        priority: client.dealStage === 'Viewing' ? 'high' : 'medium',
        title: `Prepare ${purpose?.primaryPurpose || 'investment'} proposal: ${client.name}`,
        description: `Multi-area proposal with ${getClientMatches(client.id).length} scored matches. Top match: ${topMatch.overallScore}/100.`,
        status: 'pending',
        dueDate: '2026-03-27T14:00:00Z',
        createdAt: '2026-03-25T08:00:00Z',
        source: 'engine',
      })
      idx++
    }

    // Milestone actions for advanced stages
    if (client.dealStage === 'Negotiation' || client.dealStage === 'Offer Made') {
      actions.push({
        id: `fa${idx}`,
        clientId: client.id,
        category: 'meeting-prep',
        priority: 'high',
        title: `${client.dealStage} prep: ${client.name}`,
        description: `Client in ${client.dealStage} stage. Prepare counter-offer analysis and negotiation strategy.`,
        status: 'pending',
        dueDate: '2026-03-26T09:00:00Z',
        createdAt: '2026-03-25T08:00:00Z',
        source: 'engine',
      })
      idx++
    }
  }

  return actions
}

export const forgeActions: ForgeAction[] = buildForgeActions()

// ============================================================================
// DYNAMIC DEAL BRIEF GENERATION (Real Market Data)
// ============================================================================

function buildDealBriefs(): DealBrief[] {
  const briefs: DealBrief[] = []
  let idx = 0

  for (const client of clients) {
    const cie = getCIE(client.id)
    const eng = getEngagement(client.id)
    const clientMatches = getClientMatches(client.id).slice(0, 2) // Top 2 matches per client
    const purpose = clientPurposes.find(p => p.clientId === client.id)
    const archetype = cie ? getArchetype(cie) : undefined

    for (const match of clientMatches) {
      if (match.overallScore < 50) continue
      idx++

      const area = match.areaId ? findArea(match.areaId) : null
      const prop = properties.find(p => p.id === match.propertyId)
      const ad = match.areaData
      const displayName = prop?.name || area?.name || match.propertyId
      const budgetM = Math.round(client.financialProfile.budgetMax / 1_000_000)

      // Client Summary — from CIE
      const archetypeLabel = archetype?.label || cie?.archetype || 'balanced'
      const engStatus = eng?.status || 'active'
      const momentum = eng?.momentum || 'stable'
      const velocity = eng?.currentVelocity || 0
      const baseline = eng?.baselineVelocity || 0
      const cieScore = cie?.overallCIEScore || 50
      const topDims = (cie?.topDimensions || []).slice(0, 3).map(d => `${d.dimension} ${d.value}/100`).join(', ')

      const clientSummary = `${client.name} is a ${archetypeLabel} archetype (${client.category}, ${client.type}). CIE score ${cieScore}/100. ${topDims ? `Key dimensions: ${topDims}.` : ''} Engagement: ${engStatus}, momentum ${momentum}${velocity > 0 ? ` at ${velocity.toFixed(1)} signals/week (baseline ${baseline.toFixed(1)})` : ''}. Budget AED ${budgetM}M. Deal stage: ${client.dealStage}.`

      // Property/Area Summary — from real data
      let propertySummary: string
      if (ad) {
        propertySummary = `${displayName}: AED ${ad.avgPriceSqft.toLocaleString()}/sqft avg, ${ad.rentalYield.toFixed(1)}% gross yield, ${ad.transactionCount.toLocaleString()} Q1 transactions. Demand score ${ad.demandScore}/100. 30-day price change: ${ad.priceChange30d > 0 ? '+' : ''}${ad.priceChange30d.toFixed(1)}%. Outlook: ${ad.outlook}.`
      } else if (prop) {
        propertySummary = `${prop.name} in ${prop.area}: ${prop.bedrooms}BR ${prop.type} at AED ${(prop.price / 1_000_000).toFixed(1)}M. Features: ${prop.features.join(', ')}.`
      } else {
        propertySummary = `${displayName}: Match score ${match.overallScore}/100.`
      }

      // Purpose Alignment — from ENGINE pillars
      const pa = match.pillars.purposeAlignment
      const purposeLabel = purpose?.primaryPurpose || 'Investment'
      const purposeAlignment = `${purposeLabel} alignment: ${pa.score}/100. ${pa.breakdown}. Financial fit: ${match.pillars.financialFit.score}/100 — ${match.pillars.financialFit.breakdown}. Investment fit: ${match.pillars.investmentFit.score}/100 — ${match.pillars.investmentFit.breakdown}.`

      // Financial Analysis — from real numbers
      let financialAnalysis: string
      if (ad) {
        const avgTxnM = Math.round((ad.avgPriceSqft * 1000) / 1_000_000)
        financialAnalysis = `Area avg AED ${ad.avgPriceSqft.toLocaleString()}/sqft. At client budget of AED ${budgetM}M, ${match.pillars.financialFit.score >= 70 ? 'budget aligns well with market pricing' : 'budget positioning requires calibration'}. Gross yield ${ad.rentalYield.toFixed(1)}% (${ad.rentalYield > 6 ? 'above' : ad.rentalYield > 4.5 ? 'at' : 'below'} Dubai benchmark of 5.5%). ${ad.priceChange30d > 3 ? 'Strong price momentum — time-sensitive entry.' : ad.priceChange30d < -3 ? 'Price correction creates potential value entry.' : 'Stable pricing environment.'} ${ad.transactionCount} Q1 transactions confirm ${ad.transactionCount > 500 ? 'high' : ad.transactionCount > 100 ? 'moderate' : 'emerging'} market liquidity.`
      } else if (prop) {
        financialAnalysis = `Property priced at AED ${(prop.price / 1_000_000).toFixed(1)}M against budget ceiling of AED ${budgetM}M (${Math.round(prop.price / client.financialProfile.budgetMax * 100)}% utilization).`
      } else {
        financialAnalysis = `Financial fit score: ${match.pillars.financialFit.score}/100.`
      }

      // Approach Strategy — from CIE archetype
      const approachMap: Record<string, string> = {
        'decisive': `Lead with exclusivity and action. ${client.name}'s decisive archetype responds to urgency and status. Present formal recommendation with clear next steps. Avoid lengthy analysis — focus on conviction and scarcity.`,
        'analytical': `Lead with data and structured comparison. ${client.name}'s analytical profile requires comprehensive ROI matrices, comparable transaction evidence, and methodical evaluation. Patience required — high detail orientation.`,
        'cautious': `Build trust incrementally. ${client.name}'s cautious profile requires low-pressure approach. Emphasize risk mitigation, established communities, and long-term value preservation. Avoid aggressive timelines.`,
        'impulsive': `Lead with experience and emotion. ${client.name}'s impulsive profile responds to lifestyle narratives, visual experiences, and aspirational framing. Schedule immersive viewings. Move quickly on positive signals.`,
        'balanced': `Consultative approach. ${client.name}'s balanced profile appreciates clear value proposition with both emotional and rational elements. Present structured options with recommendation.`,
      }
      const approachStrategy = approachMap[cie?.archetype || 'balanced'] || approachMap['balanced']

      // Risk Factors — from real market data + CIE
      const riskFactors: string[] = []
      if (eng?.status === 'cooling') riskFactors.push(`Engagement cooling — ${eng.daysSinceContact} days since last contact`)
      if (eng?.momentum === 'cooling') riskFactors.push('Momentum declining — intervention window narrowing')
      if (ad?.priceChange30d && ad.priceChange30d > 8) riskFactors.push('Rapid price appreciation may create entry hesitancy')
      if (ad?.priceChange30d && ad.priceChange30d < -5) riskFactors.push('Price decline may trigger wait-and-see behavior')
      if (ad?.demandScore && ad.demandScore > 90) riskFactors.push('High-demand area — competition for inventory')
      if (match.pillars.financialFit.score < 60) riskFactors.push('Budget stretch required — financing discussion needed')
      if (cie?.archetype === 'analytical') riskFactors.push('Analysis paralysis risk — set decision framework early')
      if (cie?.archetype === 'cautious') riskFactors.push('Extended timeline expected — maintain patience')
      if (riskFactors.length === 0) riskFactors.push('Standard execution risk — maintain engagement momentum')

      // Talking Points — from real data
      const talkingPoints: string[] = []
      if (ad) {
        talkingPoints.push(`${ad.transactionCount.toLocaleString()} DLD transactions Q1 2026 — proven market activity`)
        talkingPoints.push(`${ad.rentalYield.toFixed(1)}% gross rental yield — ${ad.rentalYield > 6 ? 'income-grade returns' : 'stable income potential'}`)
        if (ad.priceChange30d > 0) talkingPoints.push(`+${ad.priceChange30d.toFixed(1)}% 30-day price momentum`)
        talkingPoints.push(`Demand score ${ad.demandScore}/100 — ${ad.demandScore > 80 ? 'exceptional buyer appetite' : 'steady market interest'}`)
        talkingPoints.push(`Market outlook: ${ad.outlook}`)
      }
      if (match.overallScore >= 80) talkingPoints.push(`ENGINE match grade: ${match.grade} (${match.overallScore}/100) — top-tier alignment`)

      briefs.push({
        id: `db${idx}`,
        clientId: client.id,
        propertyId: match.propertyId,
        matchId: match.id,
        purpose: purposeLabel,
        clientSummary,
        propertySummary,
        purposeAlignment,
        financialAnalysis,
        approachStrategy,
        riskFactors,
        talkingPoints,
        generatedAt: '2026-03-25T08:00:00Z',
        status: client.dealStage === 'Offer Made' || client.dealStage === 'Negotiation' ? 'reviewed' : 'draft',
      })
    }
  }

  return briefs
}

export const dealBriefs: DealBrief[] = buildDealBriefs()

// ============================================================================
// DYNAMIC PROPOSAL GENERATION (Real Market Data)
// ============================================================================

function buildProposals(): Proposal[] {
  const proposals: Proposal[] = []
  let idx = 0

  for (const client of clients) {
    if (client.dealStage === 'Lead In' || client.dealStage === 'Closed Won') continue
    const clientMatches = getClientMatches(client.id).slice(0, 3)
    if (clientMatches.length === 0) continue

    const purpose = clientPurposes.find(p => p.clientId === client.id)
    const purposeLabel = purpose?.primaryPurpose || 'Investment'
    const cie = getCIE(client.id)
    idx++

    const sections: ProposalSection[] = []

    // Overview section
    sections.push({
      heading: 'Executive Summary',
      content: `Prepared for ${client.name} (${client.type}, ${client.category}). ${purposeLabel} strategy across ${clientMatches.length} curated market opportunities scored by PCIS ENGINE against Q1 2026 DLD transaction data. Budget range: AED ${Math.round(client.financialProfile.budgetMin / 1_000_000)}M–${Math.round(client.financialProfile.budgetMax / 1_000_000)}M.`,
      type: 'overview',
    })

    // Area sections from real data
    for (const match of clientMatches) {
      const area = match.areaId ? findArea(match.areaId) : null
      const prop = properties.find(p => p.id === match.propertyId)
      const ad = match.areaData
      const displayName = prop?.name || area?.name || match.propertyId

      if (ad) {
        sections.push({
          heading: `${displayName} — Grade ${match.grade} (${match.overallScore}/100)`,
          content: `AED ${ad.avgPriceSqft.toLocaleString()}/sqft · ${ad.rentalYield.toFixed(1)}% yield · ${ad.transactionCount.toLocaleString()} Q1 transactions · Demand ${ad.demandScore}/100 · ${ad.priceChange30d > 0 ? '+' : ''}${ad.priceChange30d.toFixed(1)}% 30d · Outlook: ${ad.outlook}`,
          type: 'area',
        })

        sections.push({
          heading: `Financial Analysis — ${displayName}`,
          content: `Financial Fit: ${match.pillars.financialFit.score}/100. ${match.pillars.financialFit.breakdown}. Investment Fit: ${match.pillars.investmentFit.score}/100. ${match.pillars.investmentFit.breakdown}. Purpose Alignment: ${match.pillars.purposeAlignment.score}/100.`,
          type: 'financial',
        })
      } else if (prop) {
        sections.push({
          heading: `${prop.name} — Grade ${match.grade}`,
          content: `${prop.bedrooms}BR ${prop.type} in ${prop.area}. AED ${(prop.price / 1_000_000).toFixed(1)}M. ${prop.features.join(', ')}.`,
          type: 'property',
        })
      }
    }

    // Recommendation
    const topMatch = clientMatches[0]
    const topArea = topMatch?.areaId ? findArea(topMatch.areaId) : null
    const topProp = properties.find(p => p.id === topMatch?.propertyId)
    const topName = topProp?.name || topArea?.name || 'Top match'

    sections.push({
      heading: 'Recommendation',
      content: `Primary recommendation: ${topName} (${topMatch?.grade}, ${topMatch?.overallScore}/100). ${topMatch?.areaData ? `${topMatch.areaData.rentalYield.toFixed(1)}% yield with ${topMatch.areaData.outlook} outlook.` : ''} ${purposeLabel} strategy alignment confirmed. Next step: ${client.dealStage === 'Discovery' ? 'Schedule area viewing.' : client.dealStage === 'Viewing' ? 'Prepare offer structure.' : 'Advance to next stage.'}`,
      type: 'recommendation',
    })

    const statuses: Proposal['status'][] = ['draft', 'reviewed', 'sent', 'viewed']
    proposals.push({
      id: `prop${idx}`,
      clientId: client.id,
      propertyIds: clientMatches.map(m => m.propertyId),
      matchIds: clientMatches.map(m => m.id),
      title: `${purposeLabel} Opportunities — ${client.name}`,
      purpose: purposeLabel,
      sections,
      status: statuses[idx % statuses.length],
      createdAt: '2026-03-25T08:00:00Z',
    })
  }

  return proposals
}

export const proposals: Proposal[] = buildProposals()

// ============================================================================
// DYNAMIC COMMUNICATION DRAFTS (Archetype-Driven + Real Data)
// ============================================================================

function buildCommunicationDrafts(): CommunicationDraft[] {
  const drafts: CommunicationDraft[] = []
  let idx = 0

  for (const client of clients) {
    const cie = getCIE(client.id)
    const eng = getEngagement(client.id)
    const topMatch = getTopMatch(client.id)
    const purpose = clientPurposes.find(p => p.clientId === client.id)
    const archetype = cie ? getArchetype(cie) : undefined
    const tone = toneFromArchetype(cie?.archetype || 'balanced')
    const ad = topMatch?.areaData

    idx++

    // Determine channel based on deal stage and archetype
    const channel: CommChannel =
      client.dealStage === 'Offer Made' || client.dealStage === 'Negotiation' ? 'email' :
      cie?.archetype === 'impulsive' ? 'whatsapp' :
      cie?.archetype === 'decisive' ? 'email' :
      eng?.status === 'cooling' || eng?.status === 'cold' ? 'call' :
      'whatsapp'

    // Build body with real data
    let body: string
    const displayName = ad ? (findArea(topMatch?.areaId || '')?.name || topMatch?.propertyId || '') : ''
    const prop = properties.find(p => p.id === topMatch?.propertyId)

    if (eng?.status === 'cooling' || eng?.status === 'cold' || eng?.status === 'dormant') {
      // Re-engagement communication
      body = tone === 'formal'
        ? `Dear ${client.name.split(' ')[0]},\n\nI hope this message finds you well. I wanted to share some recent market developments that may be relevant to your ${purpose?.primaryPurpose?.toLowerCase() || 'property'} strategy.${ad ? `\n\n${displayName} has seen ${ad.transactionCount.toLocaleString()} transactions this quarter at AED ${ad.avgPriceSqft.toLocaleString()}/sqft with ${ad.rentalYield.toFixed(1)}% yield — ${ad.outlook} outlook.` : ''}\n\nI'd welcome the opportunity to reconnect and discuss how these developments align with your objectives.\n\nBest regards`
        : `Hi ${client.name.split(' ')[0]},\n\nQuick market update — thought of you.${ad ? ` ${displayName} is showing ${ad.rentalYield.toFixed(1)}% yields with strong ${ad.outlook} momentum. ${ad.transactionCount} deals closed Q1.` : ''}\n\nWould love to catch up when you have a moment. No pressure — just wanted to keep you in the loop.`
    } else if (client.dealStage === 'Offer Made' || client.dealStage === 'Negotiation') {
      // Deal progression communication
      body = `Dear ${client.name.split(' ')[0]},\n\nFollowing our discussion, I've prepared the updated analysis${prop ? ` for ${prop.name}` : ad ? ` for opportunities in ${displayName}` : ''}.${ad ? `\n\nKey metrics: AED ${ad.avgPriceSqft.toLocaleString()}/sqft market average, ${ad.rentalYield.toFixed(1)}% gross yield, ${ad.priceChange30d > 0 ? '+' : ''}${ad.priceChange30d.toFixed(1)}% 30-day price movement. ${ad.demandScore}/100 demand score confirms ${ad.demandScore > 80 ? 'exceptional' : 'solid'} market positioning.` : ''}\n\nI recommend we discuss next steps at your earliest convenience.\n\nBest regards`
    } else {
      // Standard opportunity communication
      body = tone === 'casual'
        ? `Hey ${client.name.split(' ')[0]}! 👋\n\nSpotted something interesting for your ${purpose?.primaryPurpose?.toLowerCase() || 'property'} search.${ad ? ` ${displayName} — ${ad.rentalYield.toFixed(1)}% yield, ${ad.transactionCount} deals Q1, prices ${ad.priceChange30d > 0 ? 'up' : 'stable'}.` : ''}\n\nWant me to dig deeper?`
        : `Dear ${client.name.split(' ')[0]},\n\nBased on your ${purpose?.primaryPurpose?.toLowerCase() || 'investment'} criteria, our ENGINE has identified ${getClientMatches(client.id).length} opportunities scored against Q1 2026 DLD data.${ad ? `\n\nTop recommendation: ${displayName} — AED ${ad.avgPriceSqft.toLocaleString()}/sqft, ${ad.rentalYield.toFixed(1)}% yield, ${ad.transactionCount.toLocaleString()} Q1 transactions. Demand: ${ad.demandScore}/100.` : ''}\n\nI would be happy to walk you through the full analysis.\n\nBest regards`
    }

    // Cognitive notes from archetype
    const cogNotes = archetype
      ? `${archetype.label} archetype — ${archetype.description}. Strengths: ${archetype.strengths.slice(0, 2).join(', ')}. Watch for: ${archetype.risks.slice(0, 2).join(', ')}.`
      : `Balanced approach. Combine data with lifestyle narrative.`

    // Talking points with real data
    const talkingPoints: string[] = []
    if (ad) {
      talkingPoints.push(`${ad.transactionCount.toLocaleString()} real DLD transactions Q1 — verified market depth`)
      talkingPoints.push(`${ad.rentalYield.toFixed(1)}% gross yield — ${ad.rentalYield > 6 ? 'above benchmark' : 'competitive'}`)
      if (ad.priceChange30d !== 0) talkingPoints.push(`${ad.priceChange30d > 0 ? '+' : ''}${ad.priceChange30d.toFixed(1)}% 30-day price movement`)
    }
    if (topMatch) talkingPoints.push(`ENGINE match: ${topMatch.grade} grade (${topMatch.overallScore}/100)`)

    drafts.push({
      id: `cd${idx}`,
      clientId: client.id,
      channel,
      tone,
      subject: channel === 'email' ? `${purpose?.primaryPurpose || 'Market'} Update — ${client.name.split(' ')[0]}` : undefined,
      body,
      talkingPoints,
      bestTimeToReach: client.location.includes('China') || client.location.includes('Japan') || client.location.includes('Korea')
        ? 'Afternoon 2-4pm local (morning Asia time)'
        : client.location.includes('Dubai') || client.location.includes('Abu Dhabi') || client.location.includes('Saudi')
        ? 'Morning 9-11am local'
        : 'Morning 10-12pm local (afternoon UAE)',
      cognitiveNotes: cogNotes,
      status: 'draft',
      createdAt: '2026-03-25T08:00:00Z',
    })
  }

  return drafts
}

export const communicationDrafts: CommunicationDraft[] = buildCommunicationDrafts()

// ============================================================================
// DYNAMIC LIFECYCLE ACTIONS
// ============================================================================

function buildLifecycleActions(): LifecycleAction[] {
  const actions: LifecycleAction[] = []
  let idx = 0

  for (const client of clients) {
    const eng = getEngagement(client.id)
    const days = eng?.daysSinceContact || 0
    const topMatch = getTopMatch(client.id)
    idx++

    // Determine action type based on engagement + deal stage
    let actionType: LifecycleAction['actionType']
    let title: string
    let description: string
    let isOverdue = false
    let urgency: ActionPriority = 'medium'

    if (client.dealStage === 'Closed Won') {
      actionType = 'nurture'
      title = `Post-close relationship nurture: ${client.name}`
      description = 'Closed client. Maintain relationship for referrals and portfolio expansion.'
      urgency = 'low'
    } else if (eng?.status === 'dormant' || days > 30) {
      actionType = 're-engagement'
      title = `Dormant re-engagement: ${client.name} — ${days} days`
      description = `Account dormant. ${days} days since last contact. Quarterly re-engagement attempt with fresh market intelligence.`
      isOverdue = true
      urgency = 'critical'
    } else if (eng?.status === 'cooling' || (days > 10 && client.dealStage !== 'Lead In')) {
      actionType = 'overdue-follow-up'
      title = `Overdue follow-up: ${client.name} — ${days} days`
      description = `Engagement ${eng?.status || 'cooling'}. ${days} days since last contact. ${eng?.decayRate || 0}% decay. Immediate re-touch recommended.`
      isOverdue = days > 14
      urgency = days > 14 ? 'critical' : 'high'
    } else if (client.dealStage === 'Offer Made' || client.dealStage === 'Negotiation') {
      actionType = 'milestone'
      title = `${client.dealStage} progress: ${client.name}`
      description = `Active deal in ${client.dealStage} stage.${topMatch?.areaData ? ` ${topMatch.areaData.outlook} market — ${topMatch.areaData.priceChange30d > 0 ? 'momentum supports urgency' : 'stable conditions for negotiation'}.` : ''}`
      urgency = 'high'
    } else {
      actionType = 'scheduled-touch'
      title = `Scheduled touch: ${client.name}`
      description = `Routine engagement. Deal stage: ${client.dealStage}.${topMatch ? ` Top match: ${topMatch.grade} (${topMatch.overallScore}/100).` : ''}`
      urgency = eng?.momentum === 'heating' ? 'high' : 'medium'
    }

    // Due date based on urgency
    const daysOffset = urgency === 'critical' ? 0 : urgency === 'high' ? 1 : urgency === 'medium' ? 3 : 7
    const dueDate = new Date('2026-03-26')
    dueDate.setDate(dueDate.getDate() + daysOffset)

    actions.push({
      id: `lc${idx}`,
      clientId: client.id,
      phase: client.dealStage,
      actionType,
      title,
      description,
      dueDate: dueDate.toISOString(),
      isOverdue,
      daysSinceLastContact: days,
      urgency,
    })
  }

  return actions
}

export const lifecycleActions: LifecycleAction[] = buildLifecycleActions()

// ============================================================================
// DYNAMIC ACTIVITY LOG
// ============================================================================

function buildActivityLog(): ForgeActivityLog[] {
  const log: ForgeActivityLog[] = []
  let idx = 0
  const baseDate = new Date('2026-03-25T08:00:00Z')

  // Generate from deal briefs
  for (const brief of dealBriefs.slice(0, 15)) {
    idx++
    const client = clients.find(c => c.id === brief.clientId)
    const prop = properties.find(p => p.id === brief.propertyId)
    const area = brief.propertyId ? findArea(brief.propertyId) : null
    const displayName = prop?.name || area?.name || brief.propertyId

    log.push({
      id: `al${idx}`,
      clientId: brief.clientId,
      propertyId: brief.propertyId,
      actionType: 'brief-generated',
      title: `Deal brief generated: ${client?.name || 'Client'} — ${displayName}`,
      detail: `${brief.purpose} brief. Match score: ${engineMatches.find(m => m.id === brief.matchId)?.overallScore || '—'}/100.`,
      timestamp: new Date(baseDate.getTime() - idx * 3600000).toISOString(),
      outcome: 'positive',
    })
  }

  // Generate from communications
  for (const comm of communicationDrafts.slice(0, 10)) {
    idx++
    const client = clients.find(c => c.id === comm.clientId)
    const eng = getEngagement(comm.clientId)

    log.push({
      id: `al${idx}`,
      clientId: comm.clientId,
      actionType: 'comm-drafted',
      title: `${comm.channel === 'email' ? 'Email' : comm.channel === 'whatsapp' ? 'WhatsApp' : 'Call script'} drafted: ${client?.name || 'Client'}`,
      detail: `${comm.tone} tone. ${eng?.status === 'cooling' || eng?.status === 'cold' ? 'Re-engagement outreach.' : 'Standard opportunity communication.'}`,
      timestamp: new Date(baseDate.getTime() - idx * 3600000).toISOString(),
      outcome: eng?.status === 'cooling' || eng?.status === 'cold' ? 'neutral' : 'positive',
    })
  }

  return log.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export const forgeActivityLog: ForgeActivityLog[] = buildActivityLog()

// ============================================================================
// FORGE SUMMARY CALCULATIONS
// ============================================================================

export function getForgeSummary(): ForgeSummary {
  const totalActions = forgeActions.length
  const pendingActions = forgeActions.filter(a => a.status === 'pending').length
  const criticalActions = forgeActions.filter(a => a.priority === 'critical').length
  const briefsGenerated = dealBriefs.length
  const proposalsSent = proposals.filter(p => p.status === 'sent').length
  const commsDrafted = communicationDrafts.filter(c => c.status === 'draft').length
  const overdueLifecycleActions = lifecycleActions.filter(l => l.isOverdue).length
  const completionRate = totalActions > 0 ? forgeActions.filter(a => a.status === 'completed').length / totalActions : 0
  const avgResponseTime = 18

  const actionsByCategory: Record<ActionCategory, number> = {
    'deal-brief': forgeActions.filter(a => a.category === 'deal-brief').length,
    'proposal': forgeActions.filter(a => a.category === 'proposal').length,
    'communication': forgeActions.filter(a => a.category === 'communication').length,
    'follow-up': forgeActions.filter(a => a.category === 'follow-up').length,
    'review': forgeActions.filter(a => a.category === 'review').length,
    'meeting-prep': forgeActions.filter(a => a.category === 'meeting-prep').length,
  }

  const actionsByPriority: Record<ActionPriority, number> = {
    'critical': forgeActions.filter(a => a.priority === 'critical').length,
    'high': forgeActions.filter(a => a.priority === 'high').length,
    'medium': forgeActions.filter(a => a.priority === 'medium').length,
    'low': forgeActions.filter(a => a.priority === 'low').length,
  }

  return {
    totalActions,
    pendingActions,
    criticalActions,
    briefsGenerated,
    proposalsSent,
    commsDrafted,
    overdueFollowUps: overdueLifecycleActions,
    completionRate,
    avgResponseTime,
    actionsByCategory,
    actionsByPriority,
  }
}

// ============================================================================
// ACCESSOR FUNCTIONS
// ============================================================================

export function getForgeActionsForClient(clientId: string): ForgeAction[] {
  return forgeActions.filter(a => a.clientId === clientId)
}

export function getDealBriefsForClient(clientId: string): DealBrief[] {
  return dealBriefs.filter(b => b.clientId === clientId)
}

export function getProposalsForClient(clientId: string): Proposal[] {
  return proposals.filter(p => p.clientId === clientId)
}

export function getCommDraftsForClient(clientId: string): CommunicationDraft[] {
  return communicationDrafts.filter(c => c.clientId === clientId)
}

export function getLifecycleActionsForClient(clientId: string): LifecycleAction[] {
  return lifecycleActions.filter(l => l.clientId === clientId)
}

export function getActivityLogForClient(clientId: string): ForgeActivityLog[] {
  return forgeActivityLog.filter(a => a.clientId === clientId)
}

export function getPendingActions(): ForgeAction[] {
  return forgeActions.filter(a => a.status === 'pending')
}

export function getCriticalActions(): ForgeAction[] {
  return forgeActions.filter(a => a.priority === 'critical')
}

export function getOverdueLifecycleActions(): LifecycleAction[] {
  return lifecycleActions.filter(l => l.isOverdue)
}
