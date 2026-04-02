// ============================================================================
// PCIS CIE Engine — Cognitive Intelligence Data Layer
// ============================================================================
// Dedicated data module for Engine 1 (CIE).
// Re-exports and enriches cognitive data from mockData.ts.
// Future: PCISCOM WhatsApp signals feed directly into dimension scoring.
// ============================================================================

import {
  cognitiveProfiles,
  clients,
  engagementMetrics,
  predictions,
  signals,
  lifecycleData,
  nextTouches,
  type Client,
  type CognitiveProfile,
  type CognitiveScore,
  type EngagementMetrics,
  type EngagementStatus,
  type MomentumDirection,
  type Prediction,
  type PredictionPattern,
  type Signal,
  type LifecycleData,
  type NextTouch,
} from './mockData'

// ============================================================================
// RE-EXPORTS (single import point for CIE panels)
// ============================================================================

export type {
  Client,
  CognitiveProfile,
  CognitiveScore,
  EngagementMetrics,
  EngagementStatus,
  MomentumDirection,
  Prediction,
  PredictionPattern,
  Signal,
  LifecycleData,
  NextTouch,
}

// ============================================================================
// ARCHETYPES
// ============================================================================

export type Archetype = 'decisive' | 'analytical' | 'cautious' | 'impulsive' | 'balanced'

export interface ArchetypeConfig {
  id: Archetype
  label: string
  color: string
  description: string
  strengths: string[]
  risks: string[]
}

export const ARCHETYPES: ArchetypeConfig[] = [
  {
    id: 'decisive',
    label: 'Decisive',
    color: '#D4A574',
    description: 'Fast-moving, status-driven buyers who value exclusivity and direct communication.',
    strengths: ['Quick closers', 'High ticket tolerance', 'Referral-active'],
    risks: ['May bypass due diligence', 'Impatient with process'],
  },
  {
    id: 'analytical',
    label: 'Analytical',
    color: '#3B82F6',
    description: 'Data-driven buyers requiring comprehensive analysis before every decision.',
    strengths: ['Thorough due diligence', 'Portfolio-minded', 'Loyal once convinced'],
    risks: ['Analysis paralysis', 'Extended timelines', 'Over-comparison'],
  },
  {
    id: 'cautious',
    label: 'Cautious',
    color: '#8B5CF6',
    description: 'Risk-averse clients needing significant trust-building at every stage.',
    strengths: ['Very loyal once won', 'Careful buyers mean fewer issues', 'Long-term relationships'],
    risks: ['Trust erosion if rushed', 'Flight risk to competitors', 'Slow pipeline velocity'],
  },
  {
    id: 'impulsive',
    label: 'Impulsive',
    color: '#EF4444',
    description: 'Emotionally driven with high velocity. Responds to urgency and exclusivity.',
    strengths: ['Fastest closers', 'High spend', 'Experience-driven upsells'],
    risks: ['Buyer remorse risk', 'Unpredictable', 'Low loyalty'],
  },
  {
    id: 'balanced',
    label: 'Balanced',
    color: '#14B8A6',
    description: 'Moderate across all dimensions. Adapts well to varied advisory approaches.',
    strengths: ['Easy to work with', 'Reasonable expectations', 'Steady pipeline'],
    risks: ['Harder to differentiate urgency', 'May need more nurturing'],
  },
]

// ============================================================================
// DIMENSION METADATA
// ============================================================================

export interface DimensionMeta {
  name: string
  shortCode: string
  description: string
  lowLabel: string
  highLabel: string
  pciscomRelevance: string // How PCISCOM data will feed this dimension
}

export const DIMENSION_META: DimensionMeta[] = [
  {
    name: 'Trust Formation',
    shortCode: 'TF',
    description: 'Speed and depth at which client builds trust with advisor',
    lowLabel: 'Slow trust',
    highLabel: 'Quick trust',
    pciscomRelevance: 'Message tone, response consistency, personal disclosures in WhatsApp',
  },
  {
    name: 'Risk Tolerance',
    shortCode: 'RT',
    description: 'Willingness to accept uncertainty in investment decisions',
    lowLabel: 'Risk averse',
    highLabel: 'Risk seeking',
    pciscomRelevance: 'Questions about guarantees, insurance, market stability in messages',
  },
  {
    name: 'Decision Velocity',
    shortCode: 'DV',
    description: 'Speed from first viewing to signed contract',
    lowLabel: 'Deliberate',
    highLabel: 'Rapid',
    pciscomRelevance: 'Response time patterns, urgency language, scheduling speed',
  },
  {
    name: 'Price Sensitivity',
    shortCode: 'PS',
    description: 'Weight given to price relative to other factors',
    lowLabel: 'Price agnostic',
    highLabel: 'Price driven',
    pciscomRelevance: 'Price inquiries, discount requests, budget mentions in chat',
  },
  {
    name: 'Status Orientation',
    shortCode: 'SO',
    description: 'Importance of brand, prestige, and social signalling',
    lowLabel: 'Practical',
    highLabel: 'Status driven',
    pciscomRelevance: 'Brand mentions, name-dropping, lifestyle references in messages',
  },
  {
    name: 'Privacy Need',
    shortCode: 'PN',
    description: 'Desire for discretion and confidentiality',
    lowLabel: 'Open',
    highLabel: 'Very private',
    pciscomRelevance: 'Redacted info, NDA requests, minimal personal sharing in WhatsApp',
  },
  {
    name: 'Detail Orientation',
    shortCode: 'DO',
    description: 'Depth of information required before progressing',
    lowLabel: 'Big picture',
    highLabel: 'Micro detail',
    pciscomRelevance: 'Question specificity, document requests, follow-up depth in chat',
  },
  {
    name: 'Emotional Driver',
    shortCode: 'ED',
    description: 'Extent to which emotions influence buying decisions',
    lowLabel: 'Logic driven',
    highLabel: 'Emotion driven',
    pciscomRelevance: 'Emotive language, excitement signals, attachment language in messages',
  },
  {
    name: 'Negotiation Style',
    shortCode: 'NS',
    description: 'Approach to deal-making and terms discussion',
    lowLabel: 'Cooperative',
    highLabel: 'Aggressive',
    pciscomRelevance: 'Counteroffer patterns, ultimatum language, anchoring behaviour in chat',
  },
  {
    name: 'Loyalty Tendency',
    shortCode: 'LT',
    description: 'Likelihood of staying with current advisor long-term',
    lowLabel: 'Shops around',
    highLabel: 'Very loyal',
    pciscomRelevance: 'Competitor mentions, multi-agent signals, exclusive referral language',
  },
  {
    name: 'Innovation Appetite',
    shortCode: 'IA',
    description: 'Openness to new areas, off-plan, and emerging opportunities',
    lowLabel: 'Conservative',
    highLabel: 'Early adopter',
    pciscomRelevance: 'Interest in new launches, emerging areas, non-traditional assets in chat',
  },
  {
    name: 'Social Proof Need',
    shortCode: 'SP',
    description: 'Reliance on others\' decisions and testimonials',
    lowLabel: 'Independent',
    highLabel: 'Needs validation',
    pciscomRelevance: 'Questions about other buyers, celebrity references, community signals',
  },
]

// ============================================================================
// ENRICHED CLIENT TYPE (combines Client + Cognitive + Engagement)
// ============================================================================

export interface CIEClient {
  client: Client
  profile: CognitiveProfile | null
  engagement: EngagementMetrics | null
  prediction: Prediction | null
  lifecycle: LifecycleData | null
  nextTouch: NextTouch | null
  archetype: Archetype
  topDimensions: CognitiveScore[]
  bottomDimensions: CognitiveScore[]
  overallCIEScore: number // composite 0-100
  signalCount: number
}

function deriveArchetype(profile: CognitiveProfile): Archetype {
  const dimMap = new Map(profile.scores.map(s => [s.dimension, s.value]))
  const dv = dimMap.get('Decision Velocity') ?? 50
  const rt = dimMap.get('Risk Tolerance') ?? 50
  const do_ = dimMap.get('Detail Orientation') ?? 50
  const ed = dimMap.get('Emotional Driver') ?? 50
  const pn = dimMap.get('Privacy Need') ?? 50

  if (dv >= 75 && rt >= 60) return 'decisive'
  if (do_ >= 75 && dv <= 45) return 'analytical'
  if (rt <= 35 && pn >= 65) return 'cautious'
  if (ed >= 75 && dv >= 70) return 'impulsive'
  return 'balanced'
}

function computeCIEScore(profile: CognitiveProfile, engagement: EngagementMetrics | null): number {
  const avgConfidence = profile.scores.reduce((sum, s) => sum + s.confidence, 0) / profile.scores.length
  const engScore = engagement ? engagement.engagementScore : 50
  return Math.round(avgConfidence * 60 + (engScore / 100) * 40)
}

export function buildCIEClients(): CIEClient[] {
  return clients.map(client => {
    const profile = cognitiveProfiles.find(p => p.clientId === client.id) ?? null
    const engagement = engagementMetrics.find(e => e.clientId === client.id) ?? null
    const prediction = predictions.find(p => p.clientId === client.id) ?? null
    const lifecycle = lifecycleData.find(l => l.clientId === client.id) ?? null
    const nextTouch_ = nextTouches.find(n => n.clientId === client.id) ?? null
    const clientSignals = signals.filter(s => s.clientId === client.id)

    const archetype: Archetype = profile ? deriveArchetype(profile) : 'balanced'

    const sorted = profile ? [...profile.scores].sort((a, b) => b.value - a.value) : []
    const topDimensions = sorted.slice(0, 3)
    const bottomDimensions = sorted.slice(-3).reverse()

    const overallCIEScore = profile ? computeCIEScore(profile, engagement) : 0

    return {
      client,
      profile,
      engagement,
      prediction,
      lifecycle,
      nextTouch: nextTouch_,
      archetype,
      topDimensions,
      bottomDimensions,
      overallCIEScore,
      signalCount: clientSignals.length,
    }
  })
}

// Prebuilt for fast access
export const cieClients: CIEClient[] = buildCIEClients()

// ============================================================================
// ACCESSORS
// ============================================================================

export function getCIEClient(clientId: string): CIEClient | undefined {
  return cieClients.find(c => c.client.id === clientId)
}

export function getClientSignalsForCIE(clientId: string): Signal[] {
  return signals.filter(s => s.clientId === clientId)
}

export function getClientPredictionsForCIE(clientId: string): Prediction[] {
  return predictions.filter(p => p.clientId === clientId)
}

// ============================================================================
// AGGREGATE STATS
// ============================================================================

export interface CIESummary {
  totalClients: number
  archetypeBreakdown: Record<Archetype, number>
  avgCIEScore: number
  engagementBreakdown: Record<EngagementStatus, number>
  activeSignals: number
  atRiskClients: number // cooling + cold + dormant
  predictionsActive: number
  topArchetype: Archetype
}

export function getCIESummary(): CIESummary {
  const archetypeBreakdown: Record<Archetype, number> = {
    decisive: 0, analytical: 0, cautious: 0, impulsive: 0, balanced: 0,
  }
  const engagementBreakdown: Record<EngagementStatus, number> = {
    thriving: 0, active: 0, cooling: 0, cold: 0, dormant: 0,
  }

  let totalCIE = 0
  let atRisk = 0

  cieClients.forEach(c => {
    archetypeBreakdown[c.archetype]++
    totalCIE += c.overallCIEScore
    if (c.engagement) {
      engagementBreakdown[c.engagement.status]++
      if (['cooling', 'cold', 'dormant'].includes(c.engagement.status)) atRisk++
    }
  })

  const topArchetype = (Object.entries(archetypeBreakdown) as [Archetype, number][])
    .sort((a, b) => b[1] - a[1])[0][0]

  return {
    totalClients: cieClients.length,
    archetypeBreakdown,
    avgCIEScore: Math.round(totalCIE / cieClients.length),
    engagementBreakdown,
    activeSignals: signals.length,
    atRiskClients: atRisk,
    predictionsActive: predictions.length,
    topArchetype,
  }
}

// ============================================================================
// PCISCOM INTEGRATION PLACEHOLDER
// ============================================================================
// Future: These types will be used when PCISCOM WhatsApp data feeds CIE.
// Each WhatsApp message will generate CIE signals that update dimensions.
// ============================================================================

export interface PCISCOMSignal {
  messageId: string
  clientId: string
  timestamp: string
  channel: 'whatsapp'
  intent: string              // From PCISCOM intent analysis
  sentiment: number           // -1 to 1
  urgency: number             // 0 to 1
  dimensionImpacts: {
    dimension: string
    delta: number
    confidence: number
  }[]
  riskFlags: string[]
}

// Placeholder: in production, PCISCOM webhook pushes signals here
export const pciscomSignals: PCISCOMSignal[] = [
  // Will be populated by PCISCOM real-time feed
  {
    messageId: 'wam-001',
    clientId: 'c1',
    timestamp: '2026-03-25T09:15:00Z',
    channel: 'whatsapp',
    intent: 'viewing_request',
    sentiment: 0.8,
    urgency: 0.9,
    dimensionImpacts: [
      { dimension: 'Decision Velocity', delta: 5, confidence: 0.85 },
      { dimension: 'Emotional Driver', delta: 3, confidence: 0.72 },
    ],
    riskFlags: [],
  },
  {
    messageId: 'wam-002',
    clientId: 'c3',
    timestamp: '2026-03-25T10:30:00Z',
    channel: 'whatsapp',
    intent: 'price_inquiry',
    sentiment: 0.2,
    urgency: 0.3,
    dimensionImpacts: [
      { dimension: 'Price Sensitivity', delta: 8, confidence: 0.91 },
      { dimension: 'Risk Tolerance', delta: -4, confidence: 0.65 },
    ],
    riskFlags: ['competitor_mention'],
  },
  {
    messageId: 'wam-003',
    clientId: 'c6',
    timestamp: '2026-03-25T11:00:00Z',
    channel: 'whatsapp',
    intent: 'urgency_signal',
    sentiment: 0.95,
    urgency: 1.0,
    dimensionImpacts: [
      { dimension: 'Decision Velocity', delta: 12, confidence: 0.93 },
      { dimension: 'Status Orientation', delta: 6, confidence: 0.8 },
    ],
    riskFlags: [],
  },
]
